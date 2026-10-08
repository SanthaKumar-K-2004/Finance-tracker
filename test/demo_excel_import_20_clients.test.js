import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { detectHeaderAndColumns, extractClientRowData, inspectAvailableColumns } from '../server/utils/excelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

const rootDir = path.resolve(__dirname, '..');
const demoExcelPath = path.resolve(rootDir, 'ALR_20_Clients_Import_Demo.xlsx');
const singleSheetPath = path.resolve(rootDir, 'ALR_20_Clients_Single_Sheet.xlsx');
const csvPath = path.resolve(rootDir, 'ALR_20_Clients_Import_Demo.csv');

test('20-Record Testing & Video Demo Excel Suite', async (t) => {

  await t.test('1. Generated files exist on disk and have valid sizes', () => {
    assert.ok(fs.existsSync(demoExcelPath), 'ALR_20_Clients_Import_Demo.xlsx must exist');
    assert.ok(fs.existsSync(singleSheetPath), 'ALR_20_Clients_Single_Sheet.xlsx must exist');
    assert.ok(fs.existsSync(csvPath), 'ALR_20_Clients_Import_Demo.csv must exist');

    const statMaster = fs.statSync(demoExcelPath);
    const statSingle = fs.statSync(singleSheetPath);
    const statCsv = fs.statSync(csvPath);

    assert.ok(statMaster.size > 5000, `Master workbook size ${statMaster.size} should be > 5KB`);
    assert.ok(statSingle.size > 4000, `Single sheet size ${statSingle.size} should be > 4KB`);
    assert.ok(statCsv.size > 2000, `CSV size ${statCsv.size} should be > 2KB`);

    console.log(`   📊 Master Excel Size: ${(statMaster.size / 1024).toFixed(2)} KB`);
    console.log(`   📊 Single-Sheet Excel Size: ${(statSingle.size / 1024).toFixed(2)} KB`);
    console.log(`   📊 CSV Size: ${(statCsv.size / 1024).toFixed(2)} KB`);
  });

  await t.test('2. Multi-Sheet Master has both worksheets for video demo', () => {
    const wb = XLSX.readFile(demoExcelPath);
    assert.strictEqual(wb.SheetNames.length, 2, 'Must have exactly 2 sheets');
    assert.ok(wb.SheetNames.includes('Daily_Collection_Register'), 'Sheet 1 must be Daily_Collection_Register');
    assert.ok(wb.SheetNames.includes('Borrower_Profiles_Summary'), 'Sheet 2 must be Borrower_Profiles_Summary');
  });

  await t.test('3. Daily_Collection_Register: Auto-detects all ALR columns and day columns (1..31)', () => {
    const wb = XLSX.readFile(demoExcelPath);
    const sheet = wb.Sheets['Daily_Collection_Register'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    assert.ok(detected.isAutoDetected, 'Header detection must succeed with high confidence');
    assert.strictEqual(detected.headerRowIndex, 2, 'Header must be at row index 2 (Excel row 3)');
    assert.strictEqual(detected.dataStartIndex, 3, 'Data must start at row index 3 (Excel row 4)');

    const m = detected.mapping;
    assert.strictEqual(m.slNoCol, 0, 'Sl.No col should be index 0');
    assert.strictEqual(m.dateCol, 1, 'Date col should be index 1');
    assert.strictEqual(m.nameCol, 2, 'Name col should be index 2');
    assert.strictEqual(m.phoneCol, 3, 'Phone col should be index 3');
    assert.strictEqual(m.addressCol, 4, 'Address col should be index 4');
    assert.strictEqual(m.principalCol, 5, 'Principal col should be index 5');

    // Verify all 31 days mapped
    assert.strictEqual(m.dayCols.size, 31, 'Must map all 31 day columns');
    for (let d = 1; d <= 31; d++) {
      assert.strictEqual(m.dayCols.get(d), 5 + d, `Day ${d} must map to column ${5 + d}`);
    }
  });

  await t.test('4. Daily_Collection_Register: Extracts exactly 20 valid clients and skips footer summary', () => {
    const wb = XLSX.readFile(demoExcelPath);
    const sheet = wb.Sheets['Daily_Collection_Register'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    const m = detected.mapping;
    const extractedClients = [];
    let skippedSummaryCount = 0;

    for (let i = detected.dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const firstCell = String(row[0] || '').trim().toLowerCase();
      const rawName = String(row[m.nameCol] || '').trim().toLowerCase();
      if (/^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(firstCell) ||
          /^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(rawName)) {
        skippedSummaryCount++;
        continue;
      }

      const client = extractClientRowData(row, m, i - detected.dataStartIndex + 1, 31);
      if (client && client.name) {
        extractedClients.push(client);
      }
    }

    assert.strictEqual(extractedClients.length, 20, 'Must extract exactly 20 clients');
    assert.strictEqual(skippedSummaryCount, 1, 'Must properly identify and skip 1 grand total summary row');

    // Verify all clients have valid names, 10-digit phones, and locations
    const phones = new Set();
    const names = new Set();
    let totalPrincipal = 0;
    let totalCollected = 0;
    let totalDaysEntries = 0;

    extractedClients.forEach((c, idx) => {
      assert.ok(c.name.length > 2, `Client ${idx + 1} name must be valid (${c.name})`);
      assert.strictEqual(c.phone.length, 10, `Client ${c.name} phone must be 10 digits (${c.phone})`);
      assert.ok(/^[6-9]\d{9}$/.test(c.phone), `Client ${c.name} phone must start with 6-9 (${c.phone})`);
      assert.ok(!phones.has(c.phone), `Client ${c.name} phone must be unique in sheet`);
      phones.add(c.phone);
      names.add(c.name);

      assert.ok(c.address.length > 5, `Client ${c.name} address must be present`);
      assert.ok(c.principal >= 5000 && c.principal <= 100000, `Client ${c.name} principal must be between 5k and 100k`);
      totalPrincipal += c.principal;
      totalCollected += c.collectionSum;
      totalDaysEntries += c.dayEntries.length;
    });

    assert.strictEqual(totalPrincipal, 545000, 'Total principal across 20 clients must equal ₹5,45,000');
    assert.strictEqual(totalCollected, 418900, 'Total collections across 20 clients must equal ₹4,18,900');
    assert.ok(totalDaysEntries > 400, `Must have rich paying history (>400 collection entries, got ${totalDaysEntries})`);

    console.log(`   👥 Total Clients Extracted: ${extractedClients.length}`);
    console.log(`   💰 Total Principal: ₹${totalPrincipal.toLocaleString('en-IN')}`);
    console.log(`   📥 Total Collections: ₹${totalCollected.toLocaleString('en-IN')}`);
    console.log(`   🗓️ Total Collection Day Entries: ${totalDaysEntries}`);
  });

  await t.test('5. Available columns inspection returns real sample values for UI dropdowns', () => {
    const wb = XLSX.readFile(demoExcelPath);
    const sheet = wb.Sheets['Daily_Collection_Register'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    const available = inspectAvailableColumns(rows, detected.headerRowIndex, 3);

    assert.ok(available.length >= 40, 'Must inspect at least 40 columns');
    const nameCol = available.find(c => c.index === 2);
    const phoneCol = available.find(c => c.index === 3);

    assert.ok(nameCol, 'Name column metadata must be found');
    assert.ok(phoneCol, 'Phone column metadata must be found');
    assert.ok(nameCol.samples.includes('P. Shanmugam'), 'Name sample must include P. Shanmugam');
    assert.ok(phoneCol.samples.includes('9842156781'), 'Phone sample must include 9842156781');
  });

  await t.test('6. Sheet 2 (Borrower_Profiles_Summary): Clean profile layout inspection', () => {
    const wb = XLSX.readFile(demoExcelPath);
    const sheet = wb.Sheets['Borrower_Profiles_Summary'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    assert.ok(detected.headerRowIndex >= 0, 'Must detect header in Sheet 2');
    const available = inspectAvailableColumns(rows, detected.headerRowIndex, 3);
    assert.ok(available.length >= 10, 'Must have at least 10 profile columns');
  });

  await t.test('7. Single-Sheet Workbook behaves identically to Master Sheet 1', () => {
    const wb = XLSX.readFile(singleSheetPath);
    assert.strictEqual(wb.SheetNames.length, 1, 'Must have 1 sheet');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    assert.ok(detected.isAutoDetected, 'Must auto-detect single sheet');
    assert.strictEqual(detected.headerRowIndex, 2);
  });

  await t.test('8. Full API /api/excel/preview Integration with ALR_20_Clients_Import_Demo.xlsx', async () => {
    const { default: http } = await import('http');
    const { default: app } = await import('../server/app.js');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const fileBuffer = fs.readFileSync(demoExcelPath);
      const boundary = '----WebKitFormBoundaryDemoPreview' + Date.now();
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
        `Daily_Collection_Register${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="ALR_20_Clients_Import_Demo.xlsx"${crlf}` +
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
      assert.strictEqual(data.active_sheet, 'Daily_Collection_Register');
      assert.strictEqual(data.sheet_names.length, 2);
      assert.strictEqual(data.summary.total_rows, 20, 'Must have 20 preview rows');
      assert.strictEqual(data.summary.valid_rows, 20, 'All 20 rows must be valid');
      assert.ok(typeof data.summary.duplicate_phones_count === 'number', 'Duplicate phones count must be numeric');
      assert.strictEqual(data.summary.total_principal, 545000);
      assert.strictEqual(data.summary.total_collections, 418900);
      assert.strictEqual(data.preview_rows.length, 20);

      // Verify first row and last row
      assert.strictEqual(data.preview_rows[0].name, 'P. Shanmugam');
      assert.strictEqual(data.preview_rows[0].phone, '9842156781');
      assert.strictEqual(data.preview_rows[0].principal, 10000);
      assert.ok(['valid', 'warning'].includes(data.preview_rows[0].status), 'Status must be valid or warning, not invalid');

      assert.strictEqual(data.preview_rows[19].name, 'K. Pandian');
      assert.strictEqual(data.preview_rows[19].phone, '9787123400');
      assert.strictEqual(data.preview_rows[19].principal, 100000);
      assert.ok(['valid', 'warning'].includes(data.preview_rows[19].status), 'Status must be valid or warning, not invalid');

      console.log('   🎉 Live HTTP POST /api/excel/preview passed with 20/20 valid records!');
    } finally {
      server.close();
    }
  });

  await t.test('9. Full API /api/excel/import Commit with ALR_20_Clients_Import_Demo.xlsx', async () => {
    const { default: http } = await import('http');
    const { default: app } = await import('../server/app.js');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const fileBuffer = fs.readFileSync(demoExcelPath);
      const boundary = '----WebKitFormBoundaryDemoCommit' + Date.now();
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
        `Daily_Collection_Register${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="duplicate_handling"${crlf}${crlf}` +
        `update${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="ALR_20_Clients_Import_Demo.xlsx"${crlf}` +
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
      assert.strictEqual(data.imported_clients_count, 20, 'Must import/update exactly 20 clients');
      assert.strictEqual(data.imported_collections_count, 464, 'Must import exactly 464 daily collection entries');
      console.log(`   🚀 Live HTTP POST /api/excel/import committed 20 clients and ${data.imported_collections_count} daily collections!`);
    } finally {
      server.close();
    }
  });
});
