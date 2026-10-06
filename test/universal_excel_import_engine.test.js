import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import http from 'http';
import { fileURLToPath } from 'url';
import {
  detectHeaderAndColumns,
  profileColumnData,
  extractClientRowData,
  inspectAvailableColumns,
  normalize
} from '../server/utils/excelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

test('Universal Excel Import Engine Test Suite', async (t) => {

  await t.test('1. Arbitrary / Swapped Column Order Detection', () => {
    // Columns completely swapped: Principal first, Phone second, Name third, Area fourth, Village fifth
    const rows = [
      ['Title Header - Unrelated Metainfo', '', '', '', ''],
      ['Cycle: October 2026', '', '', '', ''],
      ['Principal Loan', 'Mobile Phone', 'Borrower Name', 'Collection Area', 'Village / Town'],
      [25000, '9842100111', 'Santhosh Kumar', 'West Main Street', 'Vadipatti'],
      [50000, '9842100222', 'R. Meenakshi Sundaram', 'Market Road', 'Usilampatti'],
      [15000, '+91-9842100333', 'K. Murugesan', 'Bazaar Street', 'Alanganallur']
    ];

    const detected = detectHeaderAndColumns(rows);
    assert.strictEqual(detected.isAutoDetected, true, 'Header must be auto-detected');
    assert.strictEqual(detected.headerRowIndex, 2, 'Header must be identified on row index 2');

    const m = detected.mapping;
    assert.strictEqual(m.principalCol, 0, 'Principal must be Col 0');
    assert.strictEqual(m.phoneCol, 1, 'Phone must be Col 1');
    assert.strictEqual(m.nameCol, 2, 'Name must be Col 2');
    assert.strictEqual(m.areaCol, 3, 'Area must be Col 3');
    assert.strictEqual(m.villageCol, 4, 'Village must be Col 4');

    // Extract first client row
    const client = extractClientRowData(rows[3], m, 1);
    assert.strictEqual(client.name, 'Santhosh Kumar');
    assert.strictEqual(client.phone, '9842100111');
    assert.strictEqual(client.principal, 25000);
    assert.ok(client.address.includes('West Main Street'));
    assert.ok(client.address.includes('Vadipatti'));

    // Extract third client with +91 phone formatting
    const client3 = extractClientRowData(rows[5], m, 3);
    assert.strictEqual(client3.name, 'K. Murugesan');
    assert.strictEqual(client3.phone, '9842100333', 'Must sanitize +91 format to standard 10-digit');
    assert.strictEqual(client3.principal, 15000);
  });

  await t.test('2. Pure Tamil Column Headers Detection', () => {
    const rows = [
      ['தினசரி வசூல் பதிவேடு - 2026', '', '', '', '', ''],
      ['வரிசை எண்', 'வாடிக்கையாளர் பெயர்', 'அலைபேசி எண்', 'கிராமம்', 'பகுதி / ஏரியா', 'அசல் கடன்'],
      [1, 'க. முருகேசன்', '9842199001', 'அலங்காநல்லூர்', 'மேலத் தெரு', 20000],
      [2, 'பா. விஜயலட்சுமி', '9842199002', 'வாடிப்பட்டி', 'சந்தை ரோடு', 35000],
      [3, 'செ. சுப்பிரமணியன்', '9842199003', 'உசிலம்பட்டி', 'கோவில் தெரு', 10000]
    ];

    const detected = detectHeaderAndColumns(rows);
    assert.strictEqual(detected.isAutoDetected, true);
    assert.strictEqual(detected.headerRowIndex, 1);

    const m = detected.mapping;
    assert.strictEqual(m.slNoCol, 0, 'வரிசை எண் must map to slNoCol');
    assert.strictEqual(m.nameCol, 1, 'வாடிக்கையாளர் பெயர் must map to nameCol');
    assert.strictEqual(m.phoneCol, 2, 'அலைபேசி எண் must map to phoneCol');
    assert.strictEqual(m.villageCol, 3, 'கிராமம் must map to villageCol');
    assert.strictEqual(m.areaCol, 4, 'பகுதி must map to areaCol');
    assert.strictEqual(m.principalCol, 5, 'அசல் கடன் must map to principalCol');

    const client = extractClientRowData(rows[2], m, 1);
    assert.strictEqual(client.name, 'க. முருகேசன்');
    assert.strictEqual(client.phone, '9842199001');
    assert.strictEqual(client.principal, 20000);
    assert.ok(client.address.includes('அலங்காநல்லூர்'));
    assert.ok(client.address.includes('மேலத் தெரு'));
  });

  await t.test('3. Pass-2 Data Content Profiler (Unlabeled / Generic Headers)', () => {
    // Obscure headers with no semantic keywords
    const rows = [
      ['DATA_X1', 'DATA_X2', 'DATA_X3', 'DATA_X4'],
      ['101', 'S. Vijayakumar', '9842155667', 30000],
      ['102', 'A. Meena Devi', '9842155668', 45000],
      ['103', 'M. Ramanathan', '9842155669', 20000],
      ['104', 'K. Selvi', '9842155670', 15000]
    ];

    const detected = detectHeaderAndColumns(rows);
    const m = detected.mapping;

    // Content profiler should detect:
    // Col 0: Integers 101-104 -> slNoCol
    // Col 1: Names (strings, no numbers) -> nameCol
    // Col 2: 10-digit Indian phones -> phoneCol
    // Col 3: Numbers 15000-45000 -> principalCol
    assert.strictEqual(m.slNoCol, 0, 'Profiler must detect Col 0 as Serial/Code');
    assert.strictEqual(m.nameCol, 1, 'Profiler must detect Col 1 as Name');
    assert.strictEqual(m.phoneCol, 2, 'Profiler must detect Col 2 as Phone');
    assert.strictEqual(m.principalCol, 3, 'Profiler must detect Col 3 as Principal');
  });

  await t.test('4. Multi-Sheet Workbook & Available Column Inspection', () => {
    const wb = XLSX.utils.book_new();

    const sheet1Rows = [
      ['Header A', 'Header B'],
      ['Val 1', 'Val 2']
    ];
    const sheet2Rows = [
      ['Client Name', 'Contact Number', 'Branch Area', 'Given Amount'],
      ['P. Shanmugam', '9842177881', 'Town Branch', 50000],
      ['R. Deepa', '9842177882', 'Rural Branch', 25000]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);

    XLSX.utils.book_append_sheet(wb, ws1, 'Sheet_Summary');
    XLSX.utils.book_append_sheet(wb, ws2, 'Sheet_Operations');

    // Inspect Sheet_Operations rows
    const targetRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet_Operations'], { header: 1, defval: '' });
    const cols = inspectAvailableColumns(targetRows, 0, 3);
    assert.strictEqual(cols.length, 4);
    assert.strictEqual(cols[0].header, 'Client Name');
    assert.strictEqual(cols[1].header, 'Contact Number');
    assert.strictEqual(cols[2].header, 'Branch Area');
    assert.strictEqual(cols[3].header, 'Given Amount');

    // Samples validation
    assert.ok(cols[0].samples.includes('P. Shanmugam'));
    assert.ok(cols[1].samples.includes('9842177881'));
  });

  await t.test('5. Custom Column Mapping Override', () => {
    const rows = [
      ['Custom 0', 'Custom 1', 'Custom 2', 'Custom 3', 'Custom 4'],
      [15000, '9842199881', 'S. Vignesh', 'North Street', 'Sholavandan'],
      [20000, '9842199882', 'M. Kavitha', 'South Street', 'Samayanallur']
    ];

    // Explicit override mapping:
    // principalCol = 0, phoneCol = 1, nameCol = 2, areaCol = 3, villageCol = 4
    const customMapping = {
      principalCol: 0,
      phoneCol: 1,
      nameCol: 2,
      areaCol: 3,
      villageCol: 4,
      slNoCol: -1
    };

    const row1 = extractClientRowData(rows[1], customMapping, 1);
    assert.strictEqual(row1.name, 'S. Vignesh');
    assert.strictEqual(row1.phone, '9842199881');
    assert.strictEqual(row1.principal, 15000);
    assert.ok(row1.address.includes('North Street'));
    assert.ok(row1.address.includes('Sholavandan'));

    const row2 = extractClientRowData(rows[2], customMapping, 2);
    assert.strictEqual(row2.name, 'M. Kavitha');
    assert.strictEqual(row2.phone, '9842199882');
    assert.strictEqual(row2.principal, 20000);
    assert.ok(row2.address.includes('South Street'));
    assert.ok(row2.address.includes('Samayanallur'));
  });

  await t.test('6. End-to-End API Preview with Custom Mapping & Multi-Sheet Support', async () => {
    const { default: app } = await import('../server/app.js');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([['Dummy', 'Data'], ['1', '2']]);
      const ws2 = XLSX.utils.aoa_to_sheet([
        ['Account Code', 'Customer Full Name', 'Contact Number', 'Sanctioned Loan'],
        ['ACC-01', 'K. Anbarasan', '9842144551', 40000],
        ['ACC-02', 'V. Malathi', '9842144552', 20000]
      ]);

      XLSX.utils.book_append_sheet(wb, ws1, 'Cover_Sheet');
      XLSX.utils.book_append_sheet(wb, ws2, 'Borrowers_Sheet');

      const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const boundary = '----WebKitFormBoundaryUniversalTest' + Date.now();
      const crlf = '\r\n';
      const bodyParts = [];

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="month_year"${crlf}${crlf}` +
        `2026-10${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="sheet_name"${crlf}${crlf}` +
        `Borrowers_Sheet${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="column_mapping"${crlf}${crlf}` +
        `${JSON.stringify({ slNoCol: 0, nameCol: 1, phoneCol: 2, principalCol: 3 })}${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="universal_test.xlsx"${crlf}` +
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`
      ));
      bodyParts.push(fileBuffer);
      bodyParts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

      const res = await fetch(`http://127.0.0.1:${port}/api/excel/preview`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: Buffer.concat(bodyParts)
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.active_sheet, 'Borrowers_Sheet');
      assert.strictEqual(data.sheet_names.length, 2);
      assert.strictEqual(data.preview_rows.length, 2);
      assert.strictEqual(data.preview_rows[0].name, 'K. Anbarasan');
      assert.strictEqual(data.preview_rows[0].phone, '9842144551');
      assert.strictEqual(data.preview_rows[0].principal, 40000);
      assert.strictEqual(data.preview_rows[1].name, 'V. Malathi');
      assert.strictEqual(data.preview_rows[1].phone, '9842144552');
      assert.strictEqual(data.preview_rows[1].principal, 20000);
      console.log('   ✅ API Preview verified with custom sheet selection and explicit mapping');
    } finally {
      server.close();
    }
  });

  await t.test('7. End-to-End API Import with Duplicate Handling Policy', async () => {
    const { default: app } = await import('../server/app.js');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Sl.No', 'Borrower Name', 'Mobile', 'Loan Amount'],
        [9001, 'Test Import User One', '9842188801', 30000],
        [9002, 'Test Import User Two', '9842188802', 25000]
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const boundary = '----WebKitFormBoundaryImportTest' + Date.now();
      const crlf = '\r\n';
      const bodyParts = [];

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="month_year"${crlf}${crlf}` +
        `2026-10${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="duplicate_handling"${crlf}${crlf}` +
        `update${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="import_test.xlsx"${crlf}` +
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`
      ));
      bodyParts.push(fileBuffer);
      bodyParts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

      const res = await fetch(`http://127.0.0.1:${port}/api/excel/import`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: Buffer.concat(bodyParts)
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.imported_clients_count >= 2);
      console.log(`   ✅ API Import committed ${data.imported_clients_count} clients with duplicate_handling=update`);
    } finally {
      server.close();
    }
  });

});
