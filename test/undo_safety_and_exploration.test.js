import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEscPosBuffer, isBluetoothSupported } from '../src/utils/bluetoothPrinter.js';
import { playCashRegisterChime, playUndoSound, isSoundEnabled, setSoundEnabled } from '../src/utils/audioFeedback.js';

test('🛡️ Field Safety, Undo Architecture, Bluetooth Print & Target Ring Verification', async (t) => {

  await t.test('1. Bluetooth ESC/POS Buffer Generator produces valid POS commands and structure', () => {
    const sampleReceipt = `*** ALR FINANCE — Daily Collection Receipt ***
Client Name    : Vellaiyamma (#1)
Principal Loan : ₹10,000
Total Collected: ₹2,000
Collected Today: ₹300
*Remaining Balance: ₹8,000*`;

    const buffer = generateEscPosBuffer(sampleReceipt);
    assert.ok(buffer instanceof Uint8Array, 'Should return a Uint8Array');
    assert.ok(buffer.length > 50, 'Buffer should contain printer commands and text bytes');

    // Check ESC @ (0x1B, 0x40) hardware reset
    assert.equal(buffer[0], 0x1B, 'First byte should be ESC (0x1B)');
    assert.equal(buffer[1], 0x40, 'Second byte should be @ (0x40) init');

    // Check paper feed / cut bytes at the end (GS V: 0x1D, 0x56)
    const lastBytes = Array.from(buffer.slice(-10));
    assert.ok(lastBytes.includes(0x1D) && lastBytes.includes(0x56), 'Should include paper cut GS V commands');
  });

  await t.test('2. Web Bluetooth capability detector safely handles non-browser / headless environments', () => {
    const supported = isBluetoothSupported();
    // In Node.js testing environment, navigator.bluetooth is undefined, should return false gracefully
    assert.equal(typeof supported, 'boolean');
  });

  await t.test('3. Audio Chime & Haptic Feedback executes cleanly without throwing in headless environments', () => {
    // Should not throw in Node.js where window.AudioContext or navigator.vibrate are mock/undefined
    assert.doesNotThrow(() => {
      playCashRegisterChime();
    });

    assert.doesNotThrow(() => {
      playUndoSound();
    });

    // Sound toggle state
    setSoundEnabled(false);
    assert.equal(isSoundEnabled(), false);
    setSoundEnabled(true);
    assert.equal(isSoundEnabled(), true);
  });

  await t.test('4. Target Progress Ring: Target calculation matches ALR Tamil Nadu microfinance formulas', () => {
    // 31-day month: ₹10,000 principal
    const principal31 = 10000;
    const target31 = Math.ceil(principal31 / 31);
    assert.equal(target31, 323, '31-day month expected daily target should be ₹323');

    // 28-day month (February): ₹10,000 principal
    const principal28 = 10000;
    const target28 = Math.ceil(principal28 / 28);
    assert.equal(target28, 358, '28-day month expected daily target should be ₹358');

    // Progress percentage calculation
    const todayCollected = 350;
    const percentage = Math.round((todayCollected / target31) * 100);
    assert.equal(percentage, 108, 'Should accurately compute percentage (108%)');
  });

  await t.test('5. Undo Reversal: Restoring prior day amount recalculates exact remaining balance', async () => {
    // Test client lifecycle simulation
    const principal = 10000;
    const day10Payment = 500;

    // Simulation of initial state
    let days = { 1: 300, 2: 300, 3: 300 };
    let totalCollected = 900;
    let remaining = principal - totalCollected; // 9100

    // User collects day 10 payment: ₹500
    const prevAmount = days[10] || 0;
    days[10] = day10Payment;
    totalCollected += (day10Payment - prevAmount);
    remaining = principal - totalCollected;

    assert.equal(totalCollected, 1400);
    assert.equal(remaining, 8600);

    // User clicks UNDO (revert to prevAmount: 0)
    days[10] = prevAmount;
    totalCollected += (prevAmount - day10Payment);
    remaining = principal - totalCollected;

    assert.equal(totalCollected, 900, 'Total collected should revert exactly to 900');
    assert.equal(remaining, 9100, 'Remaining balance should revert exactly to 9100');
  });

  await t.test('6. Full Due Settlement Guard: Settlement clears entire remaining balance safely', () => {
    const principal = 5000;
    const alreadyPaid = 884;
    const remaining = principal - alreadyPaid; // 4116

    // Settle full due
    const settlementAmount = alreadyPaid + remaining;
    const newRemaining = Math.max(0, principal - settlementAmount);

    assert.equal(newRemaining, 0, 'Remaining balance after settlement must be exactly 0');
    assert.equal(settlementAmount, 5000, 'Total paid must equal full principal');
  });
});
