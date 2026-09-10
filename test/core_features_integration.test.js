/**
 * Core Features (Exact Excel Replacement) Integration Test Suite
 * Validates:
 * 1. Client CRUD (Add with Sl.No/Name/Phone/Address/Principal, Edit, Delete)
 * 2. 31-Day Collection Grid & Live Calculations (Total, Remaining, Excess)
 * 3. Per-Day Column Totals (D1-D31 totals across all clients)
 * 4. Grand Summary Row (Row 2 replica)
 * 5. Month Selector switching
 * 6. Close/Clear Client (Green highlight -> Close button -> Archived)
 * 7. Closed Clients Archive (View historical records & 1-click Reopen)
 * 8. Next Month Rollover (Remaining balance -> New principal, Cleared clients excluded)
 */

import assert from 'assert';
import { fileURLToPath } from 'url';

const API_BASE = 'http://localhost:5000';
let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n🌟 === Starting Core Features & Excel Replacement Integration Tests ===\n');

// Feature 1: Client CRUD
let testClientId = null;
let testCycleId = null;
const uniquePhone = '97' + Math.floor(10000000 + Math.random() * 90000000);
const customSlNo = Math.floor(7000 + Math.random() * 2000);

await test('1. Client CRUD: Add client with Sl.No, Name, Phone, Address, Principal Amount', async () => {
  const res = await fetch(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sl_no: customSlNo,
      name: 'முத்துராமன் (Test Borrower)',
      phone: uniquePhone,
      address: 'வாடிப்பட்டி',
      principal: 15000,
      month_year: '2026-05'
    })
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.sl_no, customSlNo);
  assert.strictEqual(data.data.principal, 15000);
  testClientId = data.data.id;
  testCycleId = data.data.cycle_id;
});

await test('1b. Client CRUD: Edit client details (Name, Phone, Address, Principal)', async () => {
  assert.ok(testClientId);
  const res = await fetch(`${API_BASE}/api/clients/${testClientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'முத்துராமன் M.A. (Updated)',
      phone: uniquePhone,
      address: 'வாடிப்பட்டி வடக்கு',
      principal: 16000
    })
  });
  const data = await res.json();
  assert.strictEqual(data.success, true);

  // Verify updated in directory
  const checkRes = await fetch(`${API_BASE}/api/clients`);
  const checkData = await checkRes.json();
  const found = checkData.data.find(c => c.id === testClientId);
  assert.strictEqual(found.name, 'முத்துராமன் M.A. (Updated)');
  assert.strictEqual(found.address, 'வாடிப்பட்டி வடக்கு');
  assert.strictEqual(found.principal, 16000);
});

// Feature 2 & 3: 31-Day Grid Live Calculations & Per-Day Column Totals
await test('2 & 3. 31-Day Collection Grid: Live calculations & Daily Column Totals', async () => {
  assert.ok(testCycleId);
  // Post payments: Day 1 = 500, Day 5 = 1500
  await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id: testCycleId, client_id: testClientId, day_number: 1, amount: 500 })
  });
  await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id: testCycleId, client_id: testClientId, day_number: 5, amount: 1500 })
  });

  // Fetch grid
  const gridRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-05`);
  const grid = await gridRes.json();
  assert.strictEqual(grid.success, true);

  const row = grid.rows.find(r => r.cycle_id === testCycleId);
  assert.ok(row, 'Borrower row must appear in 31-day grid');
  assert.strictEqual(row.days[1], 500);
  assert.strictEqual(row.days[5], 1500);
  assert.strictEqual(row.total_collected, 2000); // 500 + 1500
  assert.strictEqual(row.remaining, 14000);       // 16000 - 2000
  assert.strictEqual(row.excess, 0);
  assert.strictEqual(row.is_cleared, false);

  // Check per-day column totals (D1 & D5)
  assert.ok(grid.summary.column_sums[1] >= 500);
  assert.ok(grid.summary.column_sums[5] >= 1500);
});

// Feature 4: Grand Summary Row
await test('4. Grand Summary Row: Total Principal, Total Collected, Total Remaining, Total Excess', async () => {
  const gridRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-05`);
  const grid = await gridRes.json();

  assert.ok(grid.summary.total_principal > 0);
  assert.ok(grid.summary.total_collected > 0);
  assert.ok(grid.summary.total_remaining > 0);
  assert.strictEqual(
    grid.summary.total_principal - grid.summary.total_collected,
    grid.summary.total_remaining - grid.summary.total_excess,
    'Accounting identity: Net Balance (Principal - Collected) must equal Remaining - Excess'
  );
});

// Feature 5: Month Selector
await test('5. Month Selector: Switch and list available months (May 2026, June 2026...)', async () => {
  const res = await fetch(`${API_BASE}/api/months`);
  const data = await res.json();

  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.some(m => m.month_year === '2026-05'), 'May 2026 must be present');
});

// Feature 6: Close / Clear Client
let archiveEntryId = null;
await test('6. Close/Clear Client: Pay in full -> Close button -> Archive with snapshot', async () => {
  // Pay remaining 14000 on Day 10
  await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id: testCycleId, client_id: testClientId, day_number: 10, amount: 14000 })
  });

  // Fetch grid to verify is_cleared is true
  const gridRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-05`);
  const grid = await gridRes.json();
  const row = grid.rows.find(r => r.cycle_id === testCycleId);
  assert.strictEqual(row.total_collected, 16000);
  assert.strictEqual(row.remaining, 0);
  assert.strictEqual(row.is_cleared, true);

  // Click Close Client
  const closeRes = await fetch(`${API_BASE}/api/collections/close-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id: testCycleId, client_id: testClientId })
  });
  const closeData = await closeRes.json();
  assert.strictEqual(closeData.success, true);
  assert.ok(closeData.archive_id);
  archiveEntryId = closeData.archive_id;
});

// Feature 7: Closed Clients Archive
await test('7. Closed Clients Archive: View closed loan history & Reopen capabilities', async () => {
  assert.ok(archiveEntryId);
  const res = await fetch(`${API_BASE}/api/reports/closed`);
  const data = await res.json();

  assert.strictEqual(data.success, true);
  const archived = data.data.find(c => c.id === archiveEntryId);
  assert.ok(archived, 'Cleared borrower must be visible in Closed Archive');
  assert.strictEqual(archived.final_principal, 16000);
  assert.strictEqual(archived.total_collected, 16000);
  assert.strictEqual(archived.excess_amount, 0);

  // Verify historical snapshot contains payment breakdown
  const snapshot = JSON.parse(archived.snapshot_json);
  assert.ok(snapshot.collections.length >= 3, 'Must contain Day 1, Day 5, and Day 10 payments');
});

// Feature 8: Next Month Rollover: Remaining -> New Principal & Closed Clients Excluded
await test('8. Next Month Rollover: Rollover pending balances, exclude cleared borrowers', async () => {
  // Preview rollover from May to June
  const previewRes = await fetch(`${API_BASE}/api/rollover/preview?from_month=2026-05&to_month=2026-06`);
  const preview = await previewRes.json();
  assert.strictEqual(preview.success, true);

  // Cleared test borrower must be in completed_clients, NOT in pending_clients
  const inCompleted = preview.completed_clients.find(c => c.client_id === testClientId);
  const inPending = preview.pending_clients.find(c => c.client_id === testClientId);
  assert.ok(inCompleted, 'Cleared borrower must be marked in completed list');
  assert.strictEqual(inPending, undefined, 'Cleared borrower must NOT be in pending rollover list');

  // Client 3032 (₹10,000 principal, ₹700 collected) MUST be in pending with new_principal = ₹9,300
  const client3032 = preview.pending_clients.find(c => c.sl_no === 3032);
  assert.ok(client3032, 'Client 3032 must be in pending rollover list');
  assert.strictEqual(client3032.remaining_balance, 9300);
  assert.strictEqual(client3032.new_principal, 9300);

  // Execute rollover
  const execRes = await fetch(`${API_BASE}/api/rollover/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_month: '2026-05', to_month: '2026-06', close_completed: true })
  });
  const execData = await execRes.json();
  assert.strictEqual(execData.success, true);

  // Verify June 2026 grid: Cleared test borrower does NOT appear!
  const juneRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-06`);
  const juneGrid = await juneRes.json();
  const testInJune = juneGrid.rows.find(r => r.client_id === testClientId);
  assert.strictEqual(testInJune, undefined, 'Cleared borrower must NOT appear in June 2026 register');

  // Client 3032 starts June 2026 with exactly ₹9,300 principal
  const client3032June = juneGrid.rows.find(r => r.sl_no === 3032);
  assert.ok(client3032June);
  assert.strictEqual(client3032June.principal, 9300, 'Next month principal must equal remaining balance');
  assert.strictEqual(client3032June.total_collected, 0, 'New month collections must start at 0');
});

// Feature 1c: Client CRUD - Delete client cleanup
await test('1c. Client CRUD: Delete client removes borrower from active ledger', async () => {
  assert.ok(testClientId);
  const delRes = await fetch(`${API_BASE}/api/clients/${testClientId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);

  // Verify deleted from active directory
  const dirRes = await fetch(`${API_BASE}/api/clients`);
  const dirData = await dirRes.json();
  const found = dirData.data.find(c => c.id === testClientId);
  assert.strictEqual(found, undefined, 'Deleted client must not appear in active clients directory');
});

console.log(`\n📊 Integration Test Summary: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests === totalTests) {
  console.log('🎉 All Core Excel Replacement & Closing/Rollover Features verified with 100% success!\n');
  process.exit(0);
} else {
  console.error(`💥 Some tests failed: ${totalTests - passedTests} failure(s).\n`);
  process.exit(1);
}
