import test from 'node:test';
import assert from 'node:assert/strict';
import { query, execute } from '../server/db.js';
import { cleanPdfText, downloadRegisterPdf } from '../src/utils/pdfExport.js';

test('Enterprise Readiness & Export/Import Deep Verification Suite', async (t) => {
  const companyId = 'comp_alr_001';
  const testMonth = '2026-10';

  // Seed 3 temporary borrowers with distinct principal amounts
  const idLow = 'borrower_audit_low_' + Date.now();
  const idMid = 'borrower_audit_mid_' + Date.now();
  const idHigh = 'borrower_audit_high_' + Date.now();

  const cycleLow = 'cycle_audit_low_' + Date.now();
  const cycleMid = 'cycle_audit_mid_' + Date.now();
  const cycleHigh = 'cycle_audit_high_' + Date.now();

  await execute(
    `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, created_at)
     VALUES (?, ?, 801, 'AUD-801', 'Audit Low', '9840180101', 'Madurai', '2026-10-01')`,
    [idLow, companyId]
  );
  await execute(
    `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status, created_at)
     VALUES (?, ?, ?, ?, 'Oct 2026', 10000, '2026-10-01', '2026-10-31', 31, 'active', '2026-10-01')`,
    [cycleLow, companyId, idLow, testMonth]
  );

  await execute(
    `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, created_at)
     VALUES (?, ?, 802, 'AUD-802', 'Audit Mid', '9840180202', 'Madurai', '2026-10-01')`,
    [idMid, companyId]
  );
  await execute(
    `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status, created_at)
     VALUES (?, ?, ?, ?, 'Oct 2026', 25000, '2026-10-01', '2026-10-31', 31, 'active', '2026-10-01')`,
    [cycleMid, companyId, idMid, testMonth]
  );

  await execute(
    `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, created_at)
     VALUES (?, ?, 803, 'AUD-803', 'Audit High', '9840180303', 'Madurai', '2026-10-01')`,
    [idHigh, companyId]
  );
  await execute(
    `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status, created_at)
     VALUES (?, ?, ?, ?, 'Oct 2026', 50000, '2026-10-01', '2026-10-31', 31, 'active', '2026-10-01')`,
    [cycleHigh, companyId, idHigh, testMonth]
  );

  await t.test('1. API /api/reports/export-preview correctly sorts by principal descending', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&search=Audit&sort_by=principal&sort_order=desc`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.rows.length, 3);
    assert.strictEqual(data.rows[0].principal, 50000);
    assert.strictEqual(data.rows[1].principal, 25000);
    assert.strictEqual(data.rows[2].principal, 10000);
  });

  await t.test('2. API /api/reports/export-preview correctly sorts by principal ascending', async () => {
    const res = await fetch(`http://localhost:5000/api/reports/export-preview?month_year=${testMonth}&search=Audit&sort_by=principal&sort_order=asc`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.rows.length, 3);
    assert.strictEqual(data.rows[0].principal, 10000);
    assert.strictEqual(data.rows[1].principal, 25000);
    assert.strictEqual(data.rows[2].principal, 50000);
  });

  await t.test('3. API /api/excel/export-filtered successfully exports with principal sort', async () => {
    const res = await fetch(`http://localhost:5000/api/excel/export-filtered?month_year=${testMonth}&search=Audit&sort_by=principal&sort_order=desc`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
  });

  await t.test('4. cleanPdfText normalizes Rupee symbol (₹) and Unicode dashes (—, –)', () => {
    assert.strictEqual(cleanPdfText('₹ 25,000 — Advance'), 'Rs. 25,000 - Advance');
    assert.strictEqual(cleanPdfText('₹500 – Installment'), 'Rs. 500 - Installment');
    assert.strictEqual(cleanPdfText('₹ 1,00,000 (ஒரு லட்சம்)'), 'Rs. 1,00,000');
  });

  await t.test('5. cleanPdfText phonetically transliterates Tamil text with zero glyph corruption', () => {
    const output = cleanPdfText('சிவா (Shiva)');
    assert.strictEqual(output, 'Shiva');
    const pureTamil = cleanPdfText('முத்துவேல்');
    assert.ok(pureTamil.length > 0);
    assert.ok(!/[\u0B80-\u0BFF]/.test(pureTamil), 'Must not contain raw Tamil code points');
  });

  await t.test('6. PDF export detailed 31-day table accepts 4-digit numbers without wrapping error', () => {
    const mockRows = [
      {
        sl_no: 801,
        client_code: 'AUD-801',
        name: 'Audit High',
        principal: 50000,
        total_collected: 35000,
        remaining: 15000,
        excess: 0,
        collection_rate: 70,
        status: 'partial',
        days: { 1: 1500, 2: 2000, 15: 3500, 31: 5000 }
      }
    ];

    assert.doesNotThrow(() => {
      downloadRegisterPdf({
        rows: mockRows,
        summary: { total_clients: 1, total_principal: 50000, total_collected: 35000, total_remaining: 15000 },
        filters: { status: 'all' },
        monthYear: '2026-10',
        showDays: true,
        totalDays: 31
      });
    });
  });

  // Cleanup audit test records
  await execute(`DELETE FROM loan_cycles WHERE id IN (?, ?, ?)`, [cycleLow, cycleMid, cycleHigh]);
  await execute(`DELETE FROM clients WHERE id IN (?, ?, ?)`, [idLow, idMid, idHigh]);
});
