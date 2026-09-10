import assert from 'assert';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { query, execute } from '../server/db.js';

const XLSX = xlsx.default || xlsx;
const BASE_URL = 'http://localhost:5000';

async function runPhase6Tests() {
  console.log('\n======================================================');
  console.log('🏗️ RUNNING EXCEL IMPORT/EXPORT & FULL ARCHITECTURE TESTS');
  console.log('📊 Template, Export, Import, whatsapp_logs & 8-Table Schema');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Verify all 8 Core Architecture Tables in Database
  await test('1. Verify 8 Core Architecture Database Tables (including whatsapp_logs)', async () => {
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);

    const required = [
      'companies',
      'clients',
      'loan_cycles',
      'daily_collections',
      'closed_clients',
      'whatsapp_logs',
      'settings',
      'settlements'
    ];

    for (const req of required) {
      assert(tableNames.includes(req), `Database table '${req}' must exist in schema`);
    }
  });

  // 2. Excel Template Download (GET /api/excel/template)
  await test('2. Excel Template Download (Pre-formatted .xlsx with formulas & headers)', async () => {
    const res = await fetch(`${BASE_URL}/api/excel/template?month_year=2026-05`);
    assert.strictEqual(res.status, 200, 'Excel template endpoint must return 200');
    assert(
      res.headers.get('content-type').includes('spreadsheet') ||
      res.headers.get('content-disposition').includes('Template.xlsx'),
      'Content-type or disposition must indicate xlsx template'
    );

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Verify Title
    assert(data[0][0].includes('DAILY COLLECTION REGISTER'), 'Row 1 must have Register Title');
    // Verify Headers on Row 3
    const headers = data[2];
    assert.strictEqual(headers[0], 'Sl.No');
    assert.strictEqual(headers[2], 'Name');
    assert.strictEqual(headers[5], 'Principal\nAmount');
    // Verify Day Columns 1-31
    assert.strictEqual(headers[6], 1);
    assert.strictEqual(headers[36], 31);
    // Verify Summary Columns
    assert(headers[37].includes('Total'));
    assert(headers[38].includes('Remaining'));
    assert(headers[39].includes('Excess'));

    // Verify sample row on Row 4
    const sample = data[3];
    assert.strictEqual(sample[0], 1);
    assert(sample[2].includes('Sample Borrower') || sample[2].includes('மாதிரி'));
    assert.strictEqual(sample[5], 10000);
  });

  // 3. Excel Export Current Month Data (GET /api/excel/export)
  await test('3. Excel Export Current Month Data (Matching ALR original format)', async () => {
    const res = await fetch(`${BASE_URL}/api/excel/export?month_year=2026-05`);
    assert.strictEqual(res.status, 200, 'Excel export must return 200');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    assert(data.length >= 4, 'Export must contain header rows and client data');
    assert(data[0][0].includes('DAILY COLLECTION REGISTER'));
    assert(data[1][0].includes('MONTH / YEAR'));
  });

  // 4. Excel Upload & Import (POST /api/excel/import)
  await test('4. Excel Upload & Import (Parse workbook, upsert client and entries)', async () => {
    // Generate a temporary workbook for import testing
    const testData = [
      ['DAILY COLLECTION REGISTER ( ALR) '],
      ['MONTH / YEAR', '', 'MAY - 2026', '', '', 'PRINCIPAL: 10,000'],
      ['Sl.No', 'Date', 'Name', 'Phone', 'Address', 'Principal', 1, 2, 3],
      [9999, '01.05.2026', 'எக்செல் மாதிரி பயனாளி (Excel Import Test)', '9842999999', 'பாலமேடு', 10000, 320, 320, 320]
    ];
    const ws = XLSX.utils.aoa_to_sheet(testData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection Register');
    const tempFilePath = path.resolve('data/test_import.xlsx');
    XLSX.writeFile(wb, tempFilePath);

    // Read and build FormData
    const fileBytes = fs.readFileSync(tempFilePath);
    const blob = new Blob([fileBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formData = new FormData();
    formData.append('file', blob, 'test_import.xlsx');
    formData.append('month_year', '2026-05');

    const res = await fetch(`${BASE_URL}/api/excel/import`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Excel import must return 200');
    assert.strictEqual(json.success, true);
    assert(json.stats.importedCollections >= 3, 'Must import at least 3 daily collections');

    // Clean up temporary files & imported test records
    try { fs.unlinkSync(tempFilePath); } catch (_) {}
    await execute("DELETE FROM daily_collections WHERE client_id IN (SELECT id FROM clients WHERE phone = '9842999999')");
    await execute("DELETE FROM loan_cycles WHERE client_id IN (SELECT id FROM clients WHERE phone = '9842999999')");
    await execute("DELETE FROM clients WHERE phone = '9842999999'");
  });

  // 5. WhatsApp Audit Log Endpoints
  await test('5. WhatsApp Message Audit Logging (POST & GET /api/collections/whatsapp-logs)', async () => {
    const logRes = await fetch(`${BASE_URL}/api/collections/whatsapp-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'client_audit_test',
        phone: '919842100000',
        message_type: 'collection_receipt',
        message_text: '*ALR ஃபைனான்ஸ் — தினசரி வசூல் ரசீது*\nஅசல்: ₹10,000'
      })
    });
    assert.strictEqual(logRes.status, 200, 'Logging must return 200');
    const logJson = await logRes.json();
    assert.strictEqual(logJson.success, true);
    assert(logJson.id, 'Must return generated log id');

    // Query logs
    const listRes = await fetch(`${BASE_URL}/api/collections/whatsapp-logs`);
    assert.strictEqual(listRes.status, 200, 'Listing logs must return 200');
    const listJson = await listRes.json();
    assert.strictEqual(listJson.success, true);
    assert(Array.isArray(listJson.data), 'Logs data must be an array');
    const found = listJson.data.find(l => l.id === logJson.id);
    assert(found, 'Created log must be found in list');
    assert.strictEqual(found.phone, '919842100000');

    // Clean up test log
    await execute("DELETE FROM whatsapp_logs WHERE id = ?", [logJson.id]);
  });

  // 6. Database Backup & Restore with whatsapp_logs
  await test('6. Database Backup Export & Restore includes whatsapp_logs', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/export`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.tables.whatsapp_logs !== undefined, 'Backup export tables must include whatsapp_logs');
  });

  console.log('\n======================================================');
  console.log(`🏗️ ARCHITECTURE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch(err => {
  console.error('Fatal Architecture Test Error:', err);
  process.exit(1);
});
