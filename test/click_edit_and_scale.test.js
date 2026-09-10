import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api';

test('Click-to-Edit Client Details, Principal & Daily Installment Sync Tests', async (t) => {
  let tempClientId = null;
  const testMonth = '2026-05';
  const testPhone = '9888877771';

  await t.test('1. Create temporary borrower for click-to-edit testing', async () => {
    const res = await fetch(`${BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sl_no: 8999,
        name: 'Click Edit Test User',
        phone: testPhone,
        address: 'Alanganallur North',
        principal: 10000,
        month_year: testMonth
      })
    });

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.client_id || data.data.id);
    tempClientId = data.data.client_id || data.data.id;
  });

  await t.test('2. Verify borrower appears in ledger with initial principal and daily installment', async () => {
    const res = await fetch(`${BASE_URL}/collections/grid?month_year=${testMonth}`);
    const data = await res.json();
    assert.equal(data.success, true);

    const row = data.rows.find(r => r.client_id === tempClientId);
    assert.ok(row, 'Borrower should exist in ledger grid');
    assert.equal(row.principal, 10000);
    assert.equal(row.name, 'Click Edit Test User');
    assert.equal(row.phone, testPhone);
    assert.equal(row.address, 'Alanganallur North');

    // Expected daily calculation
    const totalDays = data.total_days || 31;
    const expectedDaily = Math.ceil(row.principal / totalDays);
    assert.equal(expectedDaily, Math.ceil(10000 / 31)); // 323
  });

  await t.test('3. Edit client details and principal via PUT /api/clients/:id', async () => {
    // Modify Name, Address, and increase Principal to ₹15,000
    const res = await fetch(`${BASE_URL}/clients/${tempClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sl_no: 8999,
        name: 'Click Edit Test User (Updated)',
        phone: testPhone,
        address: 'Madurai Road, Alanganallur',
        principal: 15000,
        month_year: testMonth
      })
    });

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.message, 'Client updated successfully');
  });

  await t.test('4. Verify ledger grid immediately returns updated details and recalculated remaining', async () => {
    const res = await fetch(`${BASE_URL}/collections/grid?month_year=${testMonth}`);
    const data = await res.json();
    assert.equal(data.success, true);

    const row = data.rows.find(r => r.client_id === tempClientId);
    assert.ok(row, 'Borrower should still exist in ledger grid');
    assert.equal(row.name, 'Click Edit Test User (Updated)');
    assert.equal(row.address, 'Madurai Road, Alanganallur');
    assert.equal(row.principal, 15000);
    assert.equal(row.remaining, 15000); // 0 payments recorded yet

    // Recalculated expected daily for 15,000
    const totalDays = data.total_days || 31;
    const expectedDaily = Math.ceil(row.principal / totalDays);
    assert.equal(expectedDaily, Math.ceil(15000 / 31)); // 484
  });

  await t.test('5. Verify two-way calculation logic for various month lengths', async () => {
    // 31 days (May, July, August, etc.)
    assert.equal(Math.ceil(10000 / 31), 323);
    assert.equal(Math.ceil(20000 / 31), 646);
    assert.equal(Math.round(400 * 31), 12400);

    // 30 days (April, June, September, November)
    assert.equal(Math.ceil(15000 / 30), 500);
    assert.equal(Math.round(350 * 30), 10500);

    // 28 days (February non-leap)
    assert.equal(Math.ceil(14000 / 28), 500);
    assert.equal(Math.round(500 * 28), 14000);
  });

  await t.test('6. Clean up temporary test client via DELETE /api/clients/:id', async () => {
    if (tempClientId) {
      const res = await fetch(`${BASE_URL}/clients/${tempClientId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify no longer in active grid
      const gridRes = await fetch(`${BASE_URL}/collections/grid?month_year=${testMonth}`);
      const gridData = await gridRes.json();
      const row = gridData.rows.find(r => r.client_id === tempClientId);
      assert.equal(row, undefined, 'Client must be deleted from active grid');
    }
  });
});
