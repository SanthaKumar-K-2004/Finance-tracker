import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import app from '../server/app.js';
import { getCurrentMonthYear } from '../server/utils/date.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
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

describe('1. Master Security PIN (940494) & Double-Verified Data Clearance Suite', () => {
  it('rejects /api/backup/clear-all-data with missing or incorrect PIN (403 Forbidden)', async () => {
    // Missing PIN
    const res1 = await fetch(`${baseUrl}/api/backup/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'CONFIRM_CLEAR_ALL_DATA' })
    });
    assert.strictEqual(res1.status, 403, 'Should reject request with missing PIN');
    const data1 = await res1.json();
    assert.strictEqual(data1.success, false);
    assert.ok(data1.error.includes('PIN'));

    // Wrong PIN
    const res2 = await fetch(`${baseUrl}/api/backup/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '123456', confirmation: 'CONFIRM_CLEAR_ALL_DATA' })
    });
    assert.strictEqual(res2.status, 403, 'Should reject request with wrong PIN');
    const data2 = await res2.json();
    assert.strictEqual(data2.success, false);
  });

  it('rejects /api/backup/clear-all-data with missing confirmation token (400 Bad Request)', async () => {
    const res = await fetch(`${baseUrl}/api/backup/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '940494' })
    });
    assert.strictEqual(res.status, 400, 'Should reject without confirmation token');
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it('accepts correct master PIN 940494 with confirmation token and purges data & cache', async () => {
    const res = await fetch(`${baseUrl}/api/backup/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '940494', confirmation: 'CONFIRM_CLEAR_ALL_DATA' })
    });
    assert.strictEqual(res.status, 200, 'Should authorize and execute clearance');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('cleared'));

    // Check DB status is 0
    const statusRes = await fetch(`${baseUrl}/api/backup/status`);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.success, true);
    assert.strictEqual(statusData.stats.total_clients, 0);
    assert.strictEqual(statusData.stats.total_collections, 0);
    assert.strictEqual(statusData.stats.total_cycles, 0);

    // Verify company comp_alr_001 is preserved
    const compRes = await fetch(`${baseUrl}/api/company`);
    const compData = await compRes.json();
    assert.strictEqual(compData.success, true);
    assert.strictEqual(compData.data.id, 'comp_alr_001');
  });
});

describe('2. Strict Duplicate Client Prevention Suite', () => {
  const currentMonth = getCurrentMonthYear();
  const testPhone = '9840' + Math.floor(100000 + Math.random() * 900000);
  let createdClientId;

  it('successfully creates an initial client', async () => {
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Primary Test Borrower',
        phone: testPhone,
        address: 'Main Street Alanganallur',
        principal: 10000,
        month_year: currentMonth
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    createdClientId = data.data.client_id;
  });

  it('blocks duplicate client creation with identical phone number for another borrower (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Different Borrower Name',
        phone: testPhone,
        address: 'Another Ward',
        principal: 10000,
        month_year: currentMonth
      })
    });
    assert.strictEqual(res.status, 409, 'Should reject duplicate phone registration');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes(testPhone));
    assert.ok(data.error.includes('Primary Test Borrower'));
  });

  it('blocks duplicate client creation with phone formatted with spaces/dashes (e.g. +91 / dashes) (409 Conflict)', async () => {
    const formattedPhone = `+91 ${testPhone.slice(0, 5)}-${testPhone.slice(5)}`;
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Borrower With Formatted Phone',
        phone: formattedPhone,
        address: 'Formatted Ward',
        principal: 10000,
        month_year: currentMonth
      })
    });
    assert.strictEqual(res.status, 409, 'Normalized phone check should catch formatted duplicate');
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it('blocks duplicate client creation with same borrower name in the active month (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'primary test borrower', // case-insensitive check
        phone: '', // even without phone!
        address: 'Main Street Alanganallur',
        principal: 10000,
        month_year: currentMonth
      })
    });
    assert.strictEqual(res.status, 409, 'Should prevent duplicate client by name in the same active cycle');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Primary Test Borrower') || data.error.includes('primary test borrower'));
  });

  it('blocks PUT /api/clients/:id update that collides with another client phone number (409 Conflict)', async () => {
    const secondPhone = '9841' + Math.floor(100000 + Math.random() * 900000);
    // Create second client
    const res2 = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Distinct Borrower',
        phone: secondPhone,
        address: 'Ward 2',
        principal: 10000,
        month_year: currentMonth
      })
    });
    assert.strictEqual(res2.status, 201);
    const data2 = await res2.json();
    const secondClientId = data2.data.client_id;

    // Try to update second client to have the FIRST client's phone
    const updateRes = await fetch(`${baseUrl}/api/clients/${secondClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone
      })
    });
    assert.strictEqual(updateRes.status, 409, 'Should block phone collision on client edit');
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.success, false);
    assert.ok(updateData.error.includes('already registered'));

    // Clean up created clients via master PIN clearance
    await fetch(`${baseUrl}/api/backup/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '940494', confirmation: 'CONFIRM_CLEAR_ALL_DATA' })
    });
  });
});
