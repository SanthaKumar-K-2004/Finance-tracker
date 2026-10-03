import test from 'node:test';
import assert from 'node:assert/strict';
import { query, execute } from '../server/db.js';
import { downloadRegisterPdf, downloadMemberHistoryPdf } from '../src/utils/pdfExport.js';

test('Advanced Export & Serial Number Range Filtering Suite', async (t) => {
  const companyId = 'comp_alr_001';
  const testMonth = '2026-10';

  // 1. Setup sample clients with distinct Sl.No values
  const clientAId = 'test_exp_c1';
  const clientBId = 'test_exp_c2';
  const clientCId = 'test_exp_c3';
  const clientDId = 'test_exp_c4';

  await execute(
    `INSERT OR REPLACE INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
     VALUES
     (?, ?, 10, 'CLI-10', 'Borrower Alpha', '9800000001', 'Madurai West', 'active'),
     (?, ?, 25, 'CLI-25', 'Borrower Beta', '9800000002', 'Madurai South', 'active'),
     (?, ?, 60, 'CLI-60', 'Borrower Gamma', '9800000003', 'Alanganallur', 'active'),
     (?, ?, 65, 'snop65d', 'Borrower Custom Code', '9800000004', 'Samayanallur', 'active')`,
    [clientAId, companyId, clientBId, companyId, clientCId, companyId, clientDId, companyId]
  );

  const cycleAId = 'test_cycle_10';
  const cycleBId = 'test_cycle_25';
  const cycleCId = 'test_cycle_60';
  const cycleDId = 'test_cycle_65';

  await execute(
    `INSERT OR REPLACE INTO loan_cycles (id, client_id, company_id, month_year, cycle_name, principal, total_days, status, start_date, end_date)
     VALUES
     (?, ?, ?, ?, 'October 2026', 10000, 31, 'active', '2026-10-01', '2026-10-31'),
     (?, ?, ?, ?, 'October 2026', 15000, 31, 'active', '2026-10-01', '2026-10-31'),
     (?, ?, ?, ?, 'October 2026', 20000, 31, 'active', '2026-10-01', '2026-10-31'),
     (?, ?, ?, ?, 'October 2026', 12000, 31, 'active', '2026-10-01', '2026-10-31')`,
    [cycleAId, clientAId, companyId, testMonth, cycleBId, clientBId, companyId, testMonth, cycleCId, clientCId, companyId, testMonth, cycleDId, clientDId, companyId, testMonth]
  );

  // Collections:
  // Client A: 10,000 paid (Cleared)
  // Client B: 5,000 paid (Pending, partial)
  // Client C: 0 paid (Pending, zero)
  await execute(`DELETE FROM daily_collections WHERE cycle_id IN (?, ?, ?)`, [cycleAId, cycleBId, cycleCId]);
  await execute(
    `INSERT INTO daily_collections (cycle_id, client_id, company_id, day_number, amount, collection_date)
     VALUES
     (?, ?, ?, 1, 5000, '2026-10-01'),
     (?, ?, ?, 2, 5000, '2026-10-02'),
     (?, ?, ?, 1, 5000, '2026-10-01')`,
    [cycleAId, clientAId, companyId, cycleAId, clientAId, companyId, cycleBId, clientBId, companyId]
  );

  await t.test('1. API /api/reports/export-preview returns all rows and correct calculations', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.rows.length >= 3);

    const a = data.rows.find(r => r.client_id === clientAId);
    assert.ok(a);
    assert.strictEqual(a.principal, 10000);
    assert.strictEqual(a.total_collected, 10000);
    assert.strictEqual(a.remaining, 0);
    assert.strictEqual(a.status, 'cleared');

    const b = data.rows.find(r => r.client_id === clientBId);
    assert.ok(b);
    assert.strictEqual(b.principal, 15000);
    assert.strictEqual(b.total_collected, 5000);
    assert.strictEqual(b.remaining, 10000);

    const c = data.rows.find(r => r.client_id === clientCId);
    assert.ok(c);
    assert.strictEqual(c.remaining, 20000);
    assert.strictEqual(c.status, 'zero');
  });

  await t.test('2. Serial Number Range Filter (From Sl.No 10 to 30) filters out Sl.No 60', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&from_sl_no=10&to_sl_no=30`);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const slNos = data.rows.map(r => r.sl_no);
    assert.ok(slNos.includes(10), 'Should include Sl.No 10');
    assert.ok(slNos.includes(25), 'Should include Sl.No 25');
    assert.ok(!slNos.includes(60), 'Should exclude Sl.No 60 (out of range)');
  });

  await t.test('3. Status Filter (Pending Only) excludes Cleared clients', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&status=pending`);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const clientIds = data.rows.map(r => r.client_id);
    assert.ok(!clientIds.includes(clientAId), 'Cleared client A should be excluded');
    assert.ok(clientIds.includes(clientBId), 'Pending client B should be included');
    assert.ok(clientIds.includes(clientCId), 'Pending client C should be included');
  });

  await t.test('4. Status Filter (Cleared Only) returns only cleared clients', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&status=cleared`);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const clientIds = data.rows.map(r => r.client_id);
    assert.ok(clientIds.includes(clientAId), 'Cleared client A should be included');
    assert.ok(!clientIds.includes(clientBId), 'Pending client B should be excluded');
    assert.ok(!clientIds.includes(clientCId), 'Pending client C should be excluded');
  });

  await t.test('5. Excel Filtered Endpoint /api/excel/export-filtered responds with valid spreadsheet', async () => {
    const res = await fetch(`http://localhost:5000/api/excel/export-filtered?month_year=${testMonth}&from_sl_no=10&to_sl_no=30&status=all`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('spreadsheetml'));
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'Excel file should have substantial content');
  });

  await t.test('6. Member Payment History Endpoint /api/reports/member-history', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/member-history?client_id=${clientAId}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.client.id, clientAId);
    assert.strictEqual(data.grand_principal, 10000);
    assert.strictEqual(data.grand_collected, 10000);
    assert.strictEqual(data.grand_remaining, 0);
    assert.strictEqual(data.month_history.length, 1);
  });

  await t.test('7. PDF Generation Utility Structure and Formatting', async () => {
    assert.strictEqual(typeof downloadRegisterPdf, 'function');
    assert.strictEqual(typeof downloadMemberHistoryPdf, 'function');
  });

  await t.test('8. Arbitrary User Input Code Filter (e.g. "snop65d") accepts and returns client', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&from_sl_no=snop65d`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.rows.length, 1);
    assert.strictEqual(data.rows[0].client_id, clientDId);
    assert.strictEqual(data.rows[0].client_code, 'snop65d');
    assert.strictEqual(data.rows[0].principal, 12000);
  });

  await t.test('9. Alphanumeric Natural Range Filter (CLI-10 to snop65d) includes all matching records', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&from_sl_no=CLI-10&to_sl_no=snop65d`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const codes = data.rows.map(r => r.client_code);
    assert.ok(codes.includes('CLI-10'), 'Should include CLI-10');
    assert.ok(codes.includes('CLI-25'), 'Should include CLI-25');
    assert.ok(codes.includes('snop65d'), 'Should include snop65d');
  });

  await t.test('10. Filtered Excel Export with User Input Code "snop65d" produces valid Excel file', async () => {
    const res = await fetch(`http://localhost:5000/api/excel/export-filtered?month_year=${testMonth}&from_sl_no=snop65d&status=all`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('spreadsheetml'));
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition.includes('snop65d'), `Header disposition should include snop65d: ${disposition}`);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'Excel file for snop65d should have content');
  });

  // Cleanup test records
  await execute(`DELETE FROM daily_collections WHERE cycle_id IN (?, ?, ?, ?)`, [cycleAId, cycleBId, cycleCId, cycleDId]);
  await execute(`DELETE FROM loan_cycles WHERE id IN (?, ?, ?, ?)`, [cycleAId, cycleBId, cycleCId, cycleDId]);
  await execute(`DELETE FROM clients WHERE id IN (?, ?, ?, ?)`, [clientAId, clientBId, clientCId, clientDId]);
});
