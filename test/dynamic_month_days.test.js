import test from 'node:test';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';

const XLSX = xlsx.default || xlsx;
const BASE_URL = 'http://localhost:5000';

test('Dynamic Month Days & Exact Calendar Length Verification', async (t) => {

  await t.test('1. Grid API returns exact days for February (28 days)', async () => {
    const res = await fetch(`${BASE_URL}/api/collections/grid?month_year=2026-02`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total_days, 28, 'February 2026 must have exactly 28 days');
    assert.equal(Object.keys(json.summary.column_sums).length, 28);
    assert.ok(json.summary.column_sums['28'] !== undefined);
    assert.equal(json.summary.column_sums['29'], undefined, 'Day 29 must not exist in Feb 2026');
  });

  await t.test('2. Grid API returns exact days for 30-day months (April 2026)', async () => {
    const res = await fetch(`${BASE_URL}/api/collections/grid?month_year=2026-04`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total_days, 30, 'April 2026 must have exactly 30 days');
    assert.equal(Object.keys(json.summary.column_sums).length, 30);
    assert.ok(json.summary.column_sums['30'] !== undefined);
    assert.equal(json.summary.column_sums['31'], undefined, 'Day 31 must not exist in April 2026');
  });

  await t.test('3. Grid API returns exact days for 31-day months (May 2026)', async () => {
    const res = await fetch(`${BASE_URL}/api/collections/grid?month_year=2026-05`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total_days, 31, 'May 2026 must have exactly 31 days');
    assert.equal(Object.keys(json.summary.column_sums).length, 31);
    assert.ok(json.summary.column_sums['31'] !== undefined);
  });

  await t.test('4. Excel Template for February 2026 dynamically formats columns and formulas for 28 days', async () => {
    const res = await fetch(`${BASE_URL}/api/excel/template?month_year=2026-02`);
    assert.equal(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets['Collection Register'];
    assert.ok(sheet, 'Workbook must contain Collection Register sheet');

    // Row 3 (0-indexed 2) headers
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rows[2];
    assert.equal(headers[0], 'Sl.No');
    assert.equal(headers[5], 'Principal\nAmount');
    assert.equal(headers[6], 1, 'Day 1 is at index 6 (Col G)');
    assert.equal(headers[33], 28, 'Day 28 is at index 33 (Col AH)');
    assert.equal(headers[34], 'Total\n(28 Days)', 'Total header must specify 28 Days');
    assert.equal(headers[35], 'Remaining\n(Principal-Total)');

    // Row 4 sample formulas: Total col is AI (index 34), Sum is G4:AH4
    const totalCell = sheet['AI4'];
    assert.ok(totalCell, 'Cell AI4 must exist for Feb 28 total');
    assert.equal(totalCell.f, 'SUM(G4:AH4)', 'Feb formula must sum G4:AH4');

    const remCell = sheet['AJ4'];
    assert.ok(remCell, 'Cell AJ4 must exist for Feb 28 remaining');
    assert.equal(remCell.f, 'IF(F4-AI4<0,0,F4-AI4)');
  });

  await t.test('5. Excel Template for April 2026 dynamically formats columns and formulas for 30 days', async () => {
    const res = await fetch(`${BASE_URL}/api/excel/template?month_year=2026-04`);
    assert.equal(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets['Collection Register'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rows[2];
    assert.equal(headers[35], 30, 'Day 30 is at index 35 (Col AJ)');
    assert.equal(headers[36], 'Total\n(30 Days)', 'Total header must specify 30 Days');

    // Row 4 formulas: Total col is AK (index 36), Sum is G4:AJ4
    const totalCell = sheet['AK4'];
    assert.ok(totalCell);
    assert.equal(totalCell.f, 'SUM(G4:AJ4)', 'April formula must sum G4:AJ4');

    const remCell = sheet['AL4'];
    assert.ok(remCell);
    assert.equal(remCell.f, 'IF(F4-AK4<0,0,F4-AK4)');
  });

  await t.test('6. Excel Template for May 2026 formats columns and formulas for 31 days', async () => {
    const res = await fetch(`${BASE_URL}/api/excel/template?month_year=2026-05`);
    assert.equal(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheet = wb.Sheets['Collection Register'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rows[2];
    assert.equal(headers[36], 31, 'Day 31 is at index 36 (Col AK)');
    assert.equal(headers[37], 'Total\n(31 Days)');

    const totalCell = sheet['AL4'];
    assert.equal(totalCell.f, 'SUM(G4:AK4)');
  });

  await t.test('7. Client creation in February calculates total_days: 28 and end_date: 2026-02-28', async () => {
    const res = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'பிப்ரவரி வாடிக்கையாளர் (Feb Client)',
        phone: '9842100099',
        address: 'மதுரை (Madurai)',
        principal: 10000,
        month_year: '2026-02',
        cycle_name: 'February 2026'
      })
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);

    // Verify grid for Feb 2026 includes this client
    const gridRes = await fetch(`${BASE_URL}/api/collections/grid?month_year=2026-02`);
    const gridJson = await gridRes.json();
    const clientRow = gridJson.rows.find(r => r.name.includes('Feb Client'));
    assert.ok(clientRow, 'Feb client row must appear in Feb grid');
    assert.equal(Object.keys(clientRow.days).length, 28, 'Days object must have exactly 28 days');

    // Clean up
    await fetch(`${BASE_URL}/api/clients/${json.data.id}`, { method: 'DELETE' });
  });
});
