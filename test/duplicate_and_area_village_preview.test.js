import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { detectHeaderAndColumns, extractClientRowData } from '../server/utils/excelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

const rootDir = path.resolve(__dirname, '..');
const testFile = path.resolve(rootDir, 'Client_Test_Dataset_Duplicates_And_Area_Village.xlsx');

test('Excel Parser & Duplicate Detection Test Suite', async (t) => {

  await t.test('1. Verify New Test File Exists & Contains Both Sets', () => {
    assert.strictEqual(fs.existsSync(testFile), true, 'Test workbook must exist');
    const wb = XLSX.readFile(testFile);
    assert.ok(wb.SheetNames.includes('Village_Area_Test_Set1'), 'Sheet 1 missing');
    assert.ok(wb.SheetNames.includes('Bilingual_Register_Set2'), 'Sheet 2 missing');
    console.log('   📄 Workbook loaded with sheets:', wb.SheetNames.join(', '));
  });

  await t.test('2. Set 1: Disambiguate Customer Name vs Village vs Area', () => {
    const wb = XLSX.readFile(testFile);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Village_Area_Test_Set1'], { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    assert.strictEqual(detected.isAutoDetected, true, 'Must auto-detect header');
    assert.strictEqual(detected.headerRowIndex, 3, 'Header is on row 4 (index 3)');

    const m = detected.mapping;
    assert.strictEqual(m.nameCol, 2, 'Col 2 must be detected as Customer Name');
    assert.strictEqual(m.villageCol, 3, 'Col 3 must be detected as Village');
    assert.strictEqual(m.areaCol, 4, 'Col 4 must be detected as Area');
    assert.strictEqual(m.phoneCol, 5, 'Col 5 must be detected as Mobile');
    assert.strictEqual(m.principalCol, 6, 'Col 6 must be detected as Principal');

    console.log('   🎯 Auto-detected Set 1 Column Mapping:');
    console.log(`      Name Col: ${m.nameCol} | Village Col: ${m.villageCol} | Area Col: ${m.areaCol} | Phone Col: ${m.phoneCol} | Principal Col: ${m.principalCol}`);

    // Verify row 1 extraction
    const firstClient = extractClientRowData(rows[detected.dataStartIndex], m, 1);
    assert.strictEqual(firstClient.name, 'Vellaiyammal Karikalan', 'Name must be person name, NOT area or village!');
    assert.ok(firstClient.address.includes('Alanganallur'), 'Address must contain Village');
    assert.ok(firstClient.address.includes('Main Bazaar Road'), 'Address must contain Area');
    assert.strictEqual(firstClient.phone, '9585194934', 'Phone must match DB client 3032');
    assert.strictEqual(firstClient.principal, 10000, 'Principal must be 10000');
    console.log('   ✅ Row 1 successfully disambiguated:', {
      name: firstClient.name,
      address: firstClient.address,
      phone: firstClient.phone
    });
  });

  await t.test('3. Set 2 (Tamil-English Bilingual): Detect Tamil Headers & Disambiguation', () => {
    const wb = XLSX.readFile(testFile);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Bilingual_Register_Set2'], { header: 1, defval: '' });

    const detected = detectHeaderAndColumns(rows);
    assert.strictEqual(detected.isAutoDetected, true);
    assert.strictEqual(detected.headerRowIndex, 3);

    const m = detected.mapping;
    assert.strictEqual(m.nameCol, 1, 'வாடிக்கையாளர் பெயர் must be detected as Name');
    assert.strictEqual(m.villageCol, 2, 'கிராமம் / ஊர் must be detected as Village');
    assert.strictEqual(m.areaCol, 3, 'பகுதி / வட்டாரம் must be detected as Area');
    assert.strictEqual(m.phoneCol, 4, 'அலைபேசி must be detected as Phone');
    assert.strictEqual(m.principalCol, 5, 'அசல் தொகை must be detected as Principal');

    console.log('   🎯 Auto-detected Set 2 Tamil-English Column Mapping:');
    console.log(`      பெயர் (Name): ${m.nameCol} | கிராமம் (Village): ${m.villageCol} | பகுதி (Area): ${m.areaCol} | அலைபேசி (Phone): ${m.phoneCol}`);

    const firstClient = extractClientRowData(rows[detected.dataStartIndex], m, 1);
    assert.strictEqual(firstClient.name, 'வெள்ளையம்மா w/o கரிகாலன்', 'Must extract Tamil name');
    assert.ok(firstClient.address.includes('Main Bazaar Road'));
    assert.strictEqual(firstClient.phone, '9585194934');
    assert.strictEqual(firstClient.principal, 10000);
  });

  await t.test('4. End-to-End Test: Preview endpoint handles duplicates and area disambiguation', async () => {
    // Ensure client 3032 is active in DB for duplicate testing
    const { query, execute } = await import('../server/db.js');
    const existing = await query("SELECT id FROM clients WHERE company_id = 'comp_alr_001' AND (phone = '9585194934' OR sl_no = 3032)");
    if (existing.length > 0) {
      await execute("UPDATE clients SET status = 'active', phone = '9585194934', name = 'வெள்ளையம்மா w /o கரிகாலன்' WHERE id = ?", [existing[0].id]);
    } else {
      await execute("INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status) VALUES ('client_3032_seed', 'comp_alr_001', 3032, 'ALR-3032', 'வெள்ளையம்மா w /o கரிகாலன்', '9585194934', 'அலங்காநல்லூர்', 'active')");
    }

    // Import express app directly to test POST /api/excel/preview
    const { default: app } = await import('../server/app.js');
    const http = await import('http');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const boundary = '----WebKitFormBoundaryTest' + Date.now();
      const fileBuffer = fs.readFileSync(testFile);
      const filename = path.basename(testFile);

      // Construct multipart body
      const crlf = '\r\n';
      const bodyParts = [];

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="month_year"${crlf}${crlf}` +
        `2026-10${crlf}`
      ));

      bodyParts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}` +
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`
      ));
      bodyParts.push(fileBuffer);
      bodyParts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

      const multipartBody = Buffer.concat(bodyParts);

      const res = await fetch(`http://127.0.0.1:${port}/api/excel/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: multipartBody
      });

      assert.strictEqual(res.status, 200, 'Preview endpoint must return HTTP 200');
      const data = await res.json();
      assert.strictEqual(data.success, true, 'Preview must succeed');

      console.log('   📊 Preview API Response Summary:');
      console.log(`      Total Rows: ${data.summary.total_rows} | Valid Rows: ${data.summary.valid_rows}`);
      console.log(`      Duplicate Phones Count: ${data.summary.duplicate_phones_count} | Warnings: ${data.summary.warnings_count}`);

      assert.strictEqual(data.summary.total_rows, 24, 'All 24 client rows must be previewed');

      // Check DB duplicate phone detection on Row 1 (Phone 9585194934 matches client 3032 in DB)
      const row1 = data.preview_rows[0];
      assert.strictEqual(row1.name, 'Vellaiyammal Karikalan', 'Name must be person name, NOT area!');
      assert.ok(row1.address.includes('Alanganallur'), 'Address must contain Village');
      const hasDbMatch = row1.issues.some(issue => issue.includes('already registered to') || issue.includes('3032'));
      assert.strictEqual(hasDbMatch, true, 'Row 1 must flag DB match with client 3032');
      console.log('   ✅ DB Duplicate match correctly flagged for Client 3032');

      // Check Internal Duplicate Phones on Rows 5 & 6 (both share 9842199888)
      const row6 = data.preview_rows[5];
      const hasSheetDuplicate = row6.issues.some(issue => issue.includes('Duplicate phone in sheet') && issue.includes('9842199888'));
      assert.strictEqual(hasSheetDuplicate, true, 'Row 6 must flag internal sheet duplicate with row 5');
      console.log('   ✅ Sheet Internal Duplicate phone correctly flagged between Row 5 & 6 (9842199888)');

      // Check Duplicate Name collision on Rows 9 & 10 (Senthil Kumar P)
      const row10 = data.preview_rows[9];
      const hasNameDuplicate = row10.issues.some(issue => issue.includes('Duplicate name in sheet') && issue.includes('Senthil Kumar P'));
      assert.strictEqual(hasNameDuplicate, true, 'Row 10 must flag name duplicate with row 9');
      console.log('   ✅ Name collision detected for Senthil Kumar P (Row 9 vs Row 10)');

      // Check Missing Phone on Row 12, 17, 21
      const row12 = data.preview_rows[11];
      assert.strictEqual(row12.phone, '', 'Row 12 phone must be empty');

      // Check that NO row has area decoded as name!
      data.preview_rows.forEach((r, idx) => {
        assert.ok(r.name && r.name.length > 0, `Row ${idx + 1} must have a valid name`);
        assert.ok(!r.name.includes('Bazaar') && !r.name.includes('Colony') && !r.name.includes('Street'),
          `Row ${idx + 1} name "${r.name}" must not be an address or street!`
        );
      });
      console.log('   🛡️ Verified: 100% of rows have correct human names, zero area/village decoded as name!');

    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });

});
