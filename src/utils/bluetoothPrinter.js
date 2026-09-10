// Direct Bluetooth Thermal POS Printer Integration (Web Bluetooth ESC/POS)
// Compatible with 58mm & 80mm Mobile Thermal Printers (NGX, Rugtek, TVS, Everycom, PeriPage, etc.)

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

// Well-known Bluetooth GATT services for POS Printers & Serial Transceivers
const POS_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common 58mm Thermal Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip ISSC Transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // POS Bluetooth UART
  '0000ffe0-0000-1000-8000-00805f9b34fb'  // HM-10 / CC2541 Serial
];

/**
 * Converts formatted receipt text into raw ESC/POS byte buffers
 * with proper line spacing, bold headers, and paper feeding.
 */
export function generateEscPosBuffer(receiptText, options = {}) {
  const encoder = new TextEncoder();
  const chunks = [];

  // 1. Hardware Reset & Initialize Printer (ESC @)
  chunks.push(new Uint8Array([0x1B, 0x40]));

  // 2. Set Character Code Table to standard ASCII / UTF-8
  chunks.push(new Uint8Array([0x1B, 0x74, 0x00]));

  // 3. Process lines with bold detection & alignment
  const lines = receiptText.split('\n');
  lines.forEach(line => {
    let text = line.trimEnd();

    // Check for center alignment markers or top banner
    if (text.startsWith('***') || text.includes('— தினசரி') || text.includes('— Daily')) {
      chunks.push(new Uint8Array([0x1B, 0x61, 0x01])); // Center
      chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold ON
      // Double height for title
      chunks.push(new Uint8Array([0x1D, 0x21, 0x01]));
      chunks.push(encoder.encode(text.replace(/\*/g, '') + '\n'));
      chunks.push(new Uint8Array([0x1D, 0x21, 0x00])); // Normal height
      chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold OFF
      chunks.push(new Uint8Array([0x1B, 0x61, 0x00])); // Left
    } else if (text.startsWith('*') && text.endsWith('*')) {
      // Bold line (e.g. *Remaining Balance: ₹X*)
      chunks.push(new Uint8Array([0x1B, 0x45, 0x01])); // Bold ON
      chunks.push(encoder.encode(text.replace(/\*/g, '') + '\n'));
      chunks.push(new Uint8Array([0x1B, 0x45, 0x00])); // Bold OFF
    } else {
      // Standard text line
      chunks.push(encoder.encode(text.replace(/\*/g, '') + '\n'));
    }
  });

  // 4. Feed Paper & Cut (LF x 4 + GS V 66 0)
  chunks.push(new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]));
  chunks.push(new Uint8Array([0x1D, 0x56, 0x42, 0x10]));

  // Combine into single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Connects directly to a Bluetooth Thermal Printer via Web Bluetooth
 * and transmits the raw ESC/POS byte sequence.
 */
export async function printViaBluetooth(receiptText, onProgress) {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome on Android or PC.');
  }

  if (onProgress) onProgress({ status: 'connecting', message: 'புளூடூத் அச்சுப்பொறியைத் தேடுகிறது... (Searching for printer)' });

  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: POS_SERVICES
    });
  } catch (err) {
    if (err.name === 'NotFoundError') {
      throw new Error('புளூடூத் இணைப்பு ரத்து செய்யப்பட்டது (Device selection cancelled)');
    }
    throw err;
  }

  if (!device.gatt) {
    throw new Error('தேர்ந்தெடுக்கப்பட்ட சாதனத்தில் GATT வசதி இல்லை (GATT server not available)');
  }

  if (onProgress) onProgress({ status: 'pairing', message: `இணைக்கப்படுகிறது: ${device.name || 'POS Printer'}...` });

  const server = await device.gatt.connect();

  // Find a writable GATT characteristic across known POS printer services
  let writeCharacteristic = null;

  for (const serviceUuid of POS_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeCharacteristic = char;
          break;
        }
      }
      if (writeCharacteristic) break;
    } catch (e) {
      // Service not offered on this specific device model, continue searching
    }
  }

  // Fallback: search all available primary services if known list misses
  if (!writeCharacteristic) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeCharacteristic = char;
            break;
          }
        }
        if (writeCharacteristic) break;
      }
    } catch (e) {}
  }

  if (!writeCharacteristic) {
    if (device.gatt.connected) device.gatt.disconnect();
    throw new Error('அச்சுப்பொறிக்கான எழுதும் வழிமுறை (GATT write characteristic) கிடைக்கவில்லை.');
  }

  if (onProgress) onProgress({ status: 'printing', message: 'ரசீது அச்சிடப்படுகிறது... (Printing receipt)' });

  const buffer = generateEscPosBuffer(receiptText);

  // Send in 512-byte MTU chunks to avoid Bluetooth packet drops
  const CHUNK_SIZE = 512;
  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, i + CHUNK_SIZE);
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    // Small micro-delay between chunks for slow thermal micro-controllers
    await new Promise(r => setTimeout(r, 25));
  }

  // Give printer 500ms to empty buffer before disconnect
  await new Promise(r => setTimeout(r, 500));
  if (device.gatt.connected) {
    device.gatt.disconnect();
  }

  if (onProgress) onProgress({ status: 'success', message: 'புளூடூத் அச்சு வெற்றிகரமாக நிறைவுற்றது! (Printed successfully)' });
  return { success: true, deviceName: device.name || 'Thermal POS Printer' };
}
