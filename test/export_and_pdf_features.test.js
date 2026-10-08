import assert from 'assert';
import xlsx from 'xlsx';
import http from 'http';
import app from '../server/app.js';

const XLSX = xlsx.default || xlsx;
let BASE_URL = 'http://localhost:5000';

async function runExportTests() {
  console.log('\n======================================================');
  console.log('📑 RUNNING EXPORT & PDF ADVANCED FEATURES TEST SUITE');
  console.log('🎯 Scope, Multi-Month, All-History, Daily Filters, 6-Sheet Excel');
  console.log('======================================================\n');

  let serverInstance = null;
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
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  try {
    const health = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(400) }).catch(() => null);
    if (!health || !health.ok) {
      const PORT = 5055;
      BASE_URL = `http://localhost:${PORT}`;
      serverInstance = http.createServer(app);
      await new Promise((resolve, reject) => {
        serverInstance.listen(PORT, '127.0.0.1', resolve);
        serverInstance.on('error', reject);
      });
      console.log(`🚀 In-process test server listening on ${BASE_URL}\n`);
    } else {
      console.log(`🚀 Connected to existing server on ${BASE_URL}\n`);
    }

    // 1. Single Month Scope Preview
    await test('1. GET /api/reports/export-preview (Single Month)', async () => {
      const res = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&scope=month`);
      assert.strictEqual(res.status, 200, 'Must return HTTP 200');
      const data = await res.json();
      assert.strictEqual(data.success, true, 'Response success must be true');
      assert(Array.isArray(data.rows), 'data.rows must be an array');
      assert(data.summary != null, 'data.summary must be present');
      assert.strictEqual(data.total_days, 31, 'May 2026 has 31 days');
      assert(data.column_sums != null, 'data.column_sums must be present');
    });

    // 2. Multi-Month Range Scope Preview
    await test('2. GET /api/reports/export-preview (Multi-Month Range)', async () => {
      const res = await fetch(`${BASE_URL}/api/reports/export-preview?scope=range&from_month=2026-01&to_month=2026-05`);
      assert.strictEqual(res.status, 200, 'Must return HTTP 200');
      const data = await res.json();
      assert.strictEqual(data.success, true, 'Response success must be true');
      assert(Array.isArray(data.rows), 'data.rows must be an array');
      assert.strictEqual(data.scope, 'range', 'Scope in response should be range');
      assert.strictEqual(data.from_month, '2026-01', 'from_month should match');
      assert.strictEqual(data.to_month, '2026-05', 'to_month should match');
      assert(data.summary.total_records != null, 'total_records should be computed');
    });

    // 3. Lifetime All History Preview
    await test('3. GET /api/reports/export-preview (Lifetime All History Scope)', async () => {
      const res = await fetch(`${BASE_URL}/api/reports/export-preview?scope=all_history`);
      assert.strictEqual(res.status, 200, 'Must return HTTP 200');
      const data = await res.json();
      assert.strictEqual(data.success, true, 'Response success must be true');
      assert(Array.isArray(data.rows), 'data.rows must be an array');
      assert.strictEqual(data.scope, 'all_history', 'Scope should be all_history');
      assert(data.summary.total_records >= 0, 'Summary total_records should be present');
    });

    // 4. Dedicated All History Preview Route
    await test('4. GET /api/reports/all-history-preview', async () => {
      const res = await fetch(`${BASE_URL}/api/reports/all-history-preview`);
      assert.strictEqual(res.status, 200, 'Must return HTTP 200');
      const data = await res.json();
      assert.strictEqual(data.success, true, 'Response success must be true');
      assert(Array.isArray(data.rows), 'data.rows must be an array');
      assert(data.summary != null, 'Summary must be present');
    });

    // 5. Daily Collection Filtering (Day 1 Paid vs Unpaid)
    await test('5. GET /api/reports/export-preview (Day 1 Filter & Defaulters)', async () => {
      // Day 1 All
      const resAll = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&day_number=1`);
      assert.strictEqual(resAll.status, 200);
      const dataAll = await resAll.json();
      assert.strictEqual(dataAll.day_number, 1);

      // Day 1 Paid
      const resPaid = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&day_number=1&day_status=paid`);
      assert.strictEqual(resPaid.status, 200);
      const dataPaid = await resPaid.json();
      for (const row of dataPaid.rows) {
        assert(Number(row.days?.[1] || 0) > 0, 'Every returned borrower must have paid > 0 on Day 1');
      }

      // Day 1 Unpaid
      const resUnpaid = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&day_number=1&day_status=unpaid`);
      assert.strictEqual(resUnpaid.status, 200);
      const dataUnpaid = await resUnpaid.json();
      for (const row of dataUnpaid.rows) {
        assert(Number(row.days?.[1] || 0) === 0, 'Every returned borrower must have paid 0 on Day 1');
      }
    });

    // 6. Recovery Rate Filtering
    await test('6. GET /api/reports/export-preview (Recovery Rate Filters)', async () => {
      // Cleared (100%)
      const res100 = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&recovery_filter=100`);
      assert.strictEqual(res100.status, 200);
      const data100 = await res100.json();
      for (const row of data100.rows) {
        assert(Number(row.recovery_rate) >= 100, 'Borrower must have recovery >= 100%');
      }

      // High Risk (< 50%)
      const resLt50 = await fetch(`${BASE_URL}/api/reports/export-preview?month_year=2026-05&recovery_filter=lt_50`);
      assert.strictEqual(resLt50.status, 200);
      const dataLt50 = await resLt50.json();
      for (const row of dataLt50.rows) {
        assert(Number(row.recovery_rate) < 50, 'Borrower must have recovery < 50%');
      }
    });

    // 7. Multi-Sheet Production Excel Export (.xlsx)
    await test('7. GET /api/excel/export-filtered (6-Sheet Production Excel Workbook)', async () => {
      const res = await fetch(`${BASE_URL}/api/excel/export-filtered?month_year=2026-05&scope=month`);
      assert.strictEqual(res.status, 200, 'Excel export must return 200');
      assert(res.headers.get('content-type').includes('spreadsheet'), 'Must be xlsx MIME type');

      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });

      // Verify all 6 sheets exist
      const requiredSheets = [
        'Collection Register',
        'Daily Collections (1-31)',
        'Daily Trends & Analytics',
        'Route Performance',
        'Defaulter Action List',
        'Audit & Metadata'
      ];

      for (const sheetName of requiredSheets) {
        assert(workbook.SheetNames.includes(sheetName), `Workbook must contain sheet '${sheetName}'`);
      }

      // Check Collection Register has content
      const registerSheet = workbook.Sheets['Collection Register'];
      assert(registerSheet != null, 'Collection Register sheet must be present');
      const registerData = XLSX.utils.sheet_to_json(registerSheet, { header: 1 });
      assert(registerData.length >= 5, 'Collection Register must have headers, company info and rows');

      // Check Defaulter Action List sheet
      const defaulterSheet = workbook.Sheets['Defaulter Action List'];
      assert(defaulterSheet != null, 'Defaulter Action List sheet must be present');

      // Check Route Performance sheet
      const routeSheet = workbook.Sheets['Route Performance'];
      assert(routeSheet != null, 'Route Performance sheet must be present');
    });

    // 8. Multi-Month Excel Export
    await test('8. GET /api/excel/export-filtered (Multi-Month Range Workbook)', async () => {
      const res = await fetch(`${BASE_URL}/api/excel/export-filtered?scope=range&from_month=2026-01&to_month=2026-05`);
      assert.strictEqual(res.status, 200, 'Multi-month export must return 200');
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
      assert(workbook.SheetNames.includes('Collection Register'), 'Must contain Collection Register sheet');
    });

    // 9. All History Lifetime Excel Export
    await test('9. GET /api/excel/export-all-history', async () => {
      const res = await fetch(`${BASE_URL}/api/excel/export-all-history`);
      assert.strictEqual(res.status, 200, 'All-history export must return 200');
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
      assert(workbook.SheetNames.includes('Lifetime Loan Ledger'), 'Must contain Lifetime Loan Ledger sheet');
      assert(workbook.SheetNames.includes('Portfolio Summary'), 'Must contain Portfolio Summary sheet');
      assert(workbook.SheetNames.includes('Route Portfolio'), 'Must contain Route Portfolio sheet');
    });

  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
  }

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runExportTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
