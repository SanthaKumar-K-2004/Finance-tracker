import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../server/app.js';
import { execute, query } from '../server/db.js';
import { serverCache } from '../server/utils/cache.js';

let server;
let baseUrl;

before(async () => {
  serverCache.clear();
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Production Clean Slate & Currency Number Precision Suite', () => {

  test('1. Clean slate verification: DB starts with 0 clients and 0 collections', async () => {
    serverCache.clear();
    const clientsRes = await fetch(`${baseUrl}/api/clients`);
    const clientsBody = await clientsRes.json();
    assert.equal(clientsRes.status, 200);
    assert.equal(clientsBody.success, true);
    assert.equal(clientsBody.data.length, 0);

    const statusRes = await fetch(`${baseUrl}/api/backup/status`);
    const statusBody = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusBody.stats.total_clients, 0);
    assert.equal(statusBody.stats.total_collections, 0);
    assert.equal(statusBody.stats.total_cycles, 0);
  });

  test('2. Dynamic Months API on empty database returns valid month object with total_days', async () => {
    const res = await fetch(`${baseUrl}/api/months`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.length > 0);

    const firstMonth = body.data[0];
    assert.ok(firstMonth.month_year, 'month_year must be defined');
    assert.ok(firstMonth.total_days >= 28 && firstMonth.total_days <= 31, 'total_days must be between 28 and 31');
    assert.equal(firstMonth.total_clients, 0);
    assert.equal(firstMonth.total_principal, 0);
  });

  test('3. Grid API on empty database returns empty rows and valid summary without 500 error', async () => {
    const res = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-05`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.rows.length, 0);
    assert.equal(body.summary.client_count, 0);
    assert.equal(body.summary.total_principal, 0);
    assert.equal(body.summary.total_collected, 0);
    assert.equal(body.total_days, 31);
  });

  test('4. Dashboard API on empty database returns clean KPIs without null pointer crashes', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard?month_year=2026-05`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.active_clients, 0);
    assert.equal(body.data.total_principal, 0);
    assert.equal(body.data.total_collected, 0);
    assert.equal(body.data.collection_rate, 0);
  });

  let createdClientId;
  let createdCycleId;

  test('5. Customer #1 autoSlNo starts at 1 (ALR-1) and handles comma currency "10,000"', async () => {
    const addRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Fresh Production Borrower',
        phone: '9988776655',
        address: 'Madurai Market',
        principal: '10,000', // comma formatted
        month_year: '2026-05'
      })
    });

    const addBody = await addRes.json();
    assert.equal(addRes.status, 201);
    assert.equal(addBody.success, true);
    assert.equal(addBody.data.sl_no, 1, 'First borrower sl_no must start at 1');
    assert.equal(addBody.data.client_code, 'ALR-1');
    assert.equal(addBody.data.principal, 10000, 'Principal "10,000" must parse to 10000');

    createdClientId = addBody.data.client_id;
    createdCycleId = addBody.data.cycle_id;
  });

  test('6. Collection entry handles comma formatted amount "1,500"', async () => {
    const collRes = await fetch(`${baseUrl}/api/collections/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: createdCycleId,
        client_id: createdClientId,
        day_number: 1,
        amount: '1,500', // comma formatted
        payment_mode: 'cash'
      })
    });

    const collBody = await collRes.json();
    assert.equal(collRes.status, 200);
    assert.equal(collBody.success, true);
    assert.equal(collBody.data.amount, 1500, 'Amount "1,500" must parse to 1500 (not 1)');
  });

  test('7. Grid reflects Customer #1 with correct collection & remaining balance', async () => {
    serverCache.clear();
    const gridRes = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-05`);
    const gridBody = await gridRes.json();
    assert.equal(gridRes.status, 200);
    assert.equal(gridBody.rows.length, 1);
    const row = gridBody.rows[0];
    assert.equal(row.sl_no, 1);
    assert.equal(row.principal, 10000);
    assert.equal(row.total_collected, 1500);
    assert.equal(row.remaining, 8500);
  });

  test('8. Clean up test customer to leave production database 100% spotless', async () => {
    await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [createdCycleId]);
    await execute('DELETE FROM loan_cycles WHERE id = ?', [createdCycleId]);
    await execute('DELETE FROM clients WHERE id = ?', [createdClientId]);
    serverCache.clear();

    const verifyRes = await fetch(`${baseUrl}/api/clients`);
    const verifyBody = await verifyRes.json();
    assert.equal(verifyBody.data.length, 0, 'Database must be left with 0 clients');
  });
});
