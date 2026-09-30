import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import app from '../server/app.js';
import { query } from '../server/db.js';
import { sanitizeMonthYear, getDaysInMonth } from '../server/utils/date.js';

describe('Current Month Architecture & Clean Data Audit Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. sanitizeMonthYear defaults dynamically to current calendar month (YYYY-MM)', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    assert.strictEqual(sanitizeMonthYear(undefined), expected);
    assert.strictEqual(sanitizeMonthYear(''), expected);
    assert.strictEqual(sanitizeMonthYear(null), expected);
    assert.strictEqual(sanitizeMonthYear('invalid'), expected);
    assert.strictEqual(sanitizeMonthYear('2026-05'), '2026-05');
  });

  it('2. getDaysInMonth returns accurate days for current calendar month', () => {
    const now = new Date();
    const expectedDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    assert.strictEqual(getDaysInMonth(), expectedDays);
    assert.strictEqual(getDaysInMonth('2026-09'), 30);
    assert.strictEqual(getDaysInMonth('2026-05'), 31);
    assert.strictEqual(getDaysInMonth('2026-02'), 28);
  });

  it('3. /api/months endpoint always includes the current calendar month', async () => {
    const res = await fetch(`${baseUrl}/api/months`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));

    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const found = json.data.find(m => m.month_year === currentMonthYear);
    assert.ok(found, `Current month ${currentMonthYear} must be in months list`);
    assert.ok(found.total_days >= 28 && found.total_days <= 31);
  });

  it('4. POST /api/clients without month_year automatically defaults to current month', async () => {
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Month Verification Borrower',
        phone: '9840112233',
        address: 'Alanganallur Main Road',
        principal: 15000
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.cycle_id.includes(currentMonthYear.replace('-', '_')));

    // Verify grid for current month contains this borrower
    const gridRes = await fetch(`${baseUrl}/api/collections/grid?month_year=${currentMonthYear}&search=9840112233`);
    assert.strictEqual(gridRes.status, 200);
    const gridJson = await gridRes.json();
    assert.strictEqual(gridJson.rows.length, 1);
    assert.strictEqual(gridJson.rows[0].month_year, currentMonthYear);
    assert.strictEqual(gridJson.rows[0].name, 'Auto Month Verification Borrower');

    // Clean up test client
    await fetch(`${baseUrl}/api/clients/${json.data.client_id}`, { method: 'DELETE' });
  });

  it('5. Database has 0 test companies and preserves comp_alr_001 integrity', async () => {
    const companies = await query('SELECT id, name FROM companies');
    assert.strictEqual(companies.length, 1, 'Only comp_alr_001 should exist');
    assert.strictEqual(companies[0].id, 'comp_alr_001');

    // Check no test companies starting with comp_139, comp_927, etc.
    const testCompanies = await query("SELECT id FROM companies WHERE id != 'comp_alr_001'");
    assert.strictEqual(testCompanies.length, 0, 'No test companies must exist');
  });

  it('6. Ledger Grid accurately calculates 30 days for September and 31 days for May', async () => {
    const sepRes = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-09`);
    const sepGrid = await sepRes.json();
    assert.strictEqual(sepGrid.total_days, 30);

    const mayRes = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-05`);
    const mayGrid = await mayRes.json();
    assert.strictEqual(mayGrid.total_days, 31);
  });
});
