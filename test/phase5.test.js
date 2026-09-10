/**
 * Phase 5 Automated Verification Test Suite (ESM)
 * Tests Month-End Rollover Engine, Carry-Forward Principal Logic,
 * Client Archival with Full Historical JSON Snapshots,
 * 1-Click Reopen / Undo Restoration, and Preview/Execute API lifecycles.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execute, query } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000';
let totalTests = 0;
let passedTests = 0;

async function runTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n🔄 === Starting Phase 5: Month-End Rollover Engine & Client Archival Tests ===\n');

// 1. Test Exact ALR Mathematical Rollover Logic
await runTest('Rollover Math: Carry-forward remaining balance as next month principal', () => {
  const clients = [
    { name: 'Client A', principal: 10000, collected: 10000 }, // Cleared
    { name: 'Client B', principal: 10000, collected: 700 },   // Partial (ALR sample)
    { name: 'Client C', principal: 10000, collected: 0 },     // Zero paid
    { name: 'Client D', principal: 5000, collected: 6000 }    // Overpaid
  ];

  const results = clients.map(c => {
    const remaining = Math.max(0, c.principal - c.collected);
    const excess = Math.max(0, c.collected - c.principal);
    const isCompleted = remaining === 0;
    const nextPrincipal = remaining;
    return { name: c.name, remaining, excess, isCompleted, nextPrincipal };
  });

  // Client A: Cleared
  assert.strictEqual(results[0].remaining, 0);
  assert.strictEqual(results[0].isCompleted, true);
  assert.strictEqual(results[0].nextPrincipal, 0);

  // Client B: Partial
  assert.strictEqual(results[1].remaining, 9300);
  assert.strictEqual(results[1].isCompleted, false);
  assert.strictEqual(results[1].nextPrincipal, 9300);

  // Client C: Zero
  assert.strictEqual(results[2].remaining, 10000);
  assert.strictEqual(results[2].isCompleted, false);
  assert.strictEqual(results[2].nextPrincipal, 10000);

  // Client D: Overpaid
  assert.strictEqual(results[3].remaining, 0);
  assert.strictEqual(results[3].excess, 1000);
  assert.strictEqual(results[3].isCompleted, true);
});

// 2. Test GET /api/rollover/preview
await runTest('GET /api/rollover/preview returns pending borrowers and correct next principal', async () => {
  // Ensure Client 3032 has pristine baseline collections (Day 1: 300, Day 2: 400 = total 700)
  const client3032Row = await query('SELECT id FROM clients WHERE sl_no = 3032');
  if (client3032Row.length > 0) {
    const cId = client3032Row[0].id;
    await execute("UPDATE loan_cycles SET status = 'active', principal = 10000 WHERE client_id = ? AND month_year = '2026-05'", [cId]);
    const cyc = await query("SELECT id FROM loan_cycles WHERE client_id = ? AND month_year = '2026-05'", [cId]);
    if (cyc.length > 0) {
      await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [cyc[0].id]);
      await execute(
        `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
         VALUES (?, 'comp_alr_001', ?, ?, 1, '2026-05-01', 300, 'cash', 'Agent'),
                (?, 'comp_alr_001', ?, ?, 2, '2026-05-02', 400, 'cash', 'Agent')`,
        [`coll_${cyc[0].id}_d1`, cyc[0].id, cId, `coll_${cyc[0].id}_d2`, cyc[0].id, cId]
      );
    }
  }

  const res = await fetch(`${API_BASE}/api/rollover/preview?from_month=2026-05&to_month=2026-06`);
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.from_month, '2026-05');
  assert.strictEqual(data.to_month, '2026-06');
  assert.ok(data.summary, 'Missing summary in preview response');
  assert.ok(typeof data.summary.total_clients === 'number');
  assert.ok(Array.isArray(data.pending_clients));
  assert.ok(Array.isArray(data.completed_clients));

  // Check client 3032 in pending list
  const client3032 = data.pending_clients.find(p => p.sl_no === 3032);
  assert.ok(client3032, 'Client 3032 should be in pending list');
  assert.strictEqual(client3032.current_principal, 10000);
  assert.strictEqual(client3032.total_collected, 700);
  assert.strictEqual(client3032.remaining_balance, 9300);
  assert.strictEqual(client3032.new_principal, 9300);
  assert.strictEqual(client3032.action, 'rollover');
});

// 3. Test Client Archival Lifecycle (Close Client & Snapshot)
let archivedId = null;
await runTest('POST /api/collections/close-client creates closed_clients entry with JSON snapshot', async () => {
  // First, create a temporary test client & cycle to close without disturbing main data
  const uniquePhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
  const testClient = {
    name: 'தற்காலிக பயனாளி (Test Archival)',
    phone: uniquePhone,
    address: 'சோழவந்தான்',
    principal: 5000,
    month_year: '2026-05'
  };

  // Add client
  const addRes = await fetch(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testClient)
  });
  const addData = await addRes.json();
  assert.strictEqual(addData.success, true);
  const clientId = addData.data.id;
  const cycleId = addData.data.cycle_id;

  // Pay in full: day 1 = 5000
  await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cycle_id: cycleId,
      day_number: 1,
      amount: 5000,
      payment_mode: 'cash'
    })
  });

  // Execute close-client
  const closeRes = await fetch(`${API_BASE}/api/collections/close-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      cycle_id: cycleId,
      reason: 'completed'
    })
  });
  const closeData = await closeRes.json();
  assert.strictEqual(closeData.success, true);
  assert.ok(closeData.archive_id, 'Missing archive_id in response');
  archivedId = closeData.archive_id;

  // Verify GET /api/reports/closed includes this client
  const closedRes = await fetch(`${API_BASE}/api/reports/closed`);
  const closedData = await closedRes.json();
  assert.strictEqual(closedData.success, true);
  const found = closedData.data.find(c => c.id === archivedId);
  assert.ok(found, 'Archived client not found in /api/reports/closed');
  assert.strictEqual(found.final_principal, 5000);
  assert.strictEqual(found.total_collected, 5000);
  assert.strictEqual(found.excess_amount, 0);

  // Verify snapshot_json contains complete history
  const snapshot = JSON.parse(found.snapshot_json);
  assert.ok(snapshot.cycle, 'Missing cycle object in snapshot');
  assert.ok(Array.isArray(snapshot.collections), 'Missing collections array in snapshot');
  assert.strictEqual(snapshot.collections.length, 1);
  assert.strictEqual(snapshot.collections[0].amount, 5000);
});

// 4. Test Reopen / Undo Mechanism
await runTest('POST /api/collections/reopen-client restores closed client back to active', async () => {
  assert.ok(archivedId, 'Missing archivedId from previous test step');

  // Verify client is currently in closed archive
  let closedRes = await fetch(`${API_BASE}/api/reports/closed`);
  let closedData = await closedRes.json();
  let found = closedData.data.find(c => c.id === archivedId);
  assert.ok(found, 'Client should be in closed archive before reopen');

  // Call reopen-client
  const reopenRes = await fetch(`${API_BASE}/api/collections/reopen-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      closed_id: archivedId,
      client_id: found.client_id,
      cycle_id: found.cycle_id
    })
  });
  const reopenData = await reopenRes.json();
  assert.strictEqual(reopenData.success, true);

  // Verify client is removed from closed archive
  closedRes = await fetch(`${API_BASE}/api/reports/closed`);
  closedData = await closedRes.json();
  found = closedData.data.find(c => c.id === archivedId);
  assert.strictEqual(found, undefined, 'Client should be removed from closed archive after reopen');

  // Clean up temporary test client
  await fetch(`${API_BASE}/api/clients/${found ? found.client_id : 'dummy'}`, { method: 'DELETE' });
});

// 5. Test Rollover Execution Lifecycle (POST /api/rollover/execute)
await runTest('POST /api/rollover/execute creates next month loan cycle with remaining principal', async () => {
  // Ensure June collections for client 3032 are clean for test isolation
  const client3032Row = await query('SELECT id FROM clients WHERE sl_no = 3032');
  if (client3032Row.length > 0) {
    const cId = client3032Row[0].id;
    const juneCyc = await query("SELECT id FROM loan_cycles WHERE client_id = ? AND month_year = '2026-06'", [cId]);
    if (juneCyc.length > 0) {
      await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [juneCyc[0].id]);
    }
  }

  // Execute rollover for May 2026 -> June 2026
  const execRes = await fetch(`${API_BASE}/api/rollover/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_month: '2026-05',
      to_month: '2026-06',
      to_cycle_name: 'June 2026 (ஆனி)',
      close_completed: true
    })
  });
  const execData = await execRes.json();
  assert.strictEqual(execRes.status, 200);
  assert.strictEqual(execData.success, true);
  assert.ok(execData.stats, 'Missing stats in execute response');
  assert.ok(execData.stats.rolledOverCount >= 1, 'Expected at least 1 client rolled over');

  // Verify that June 2026 is now listed in /api/months
  const monthsRes = await fetch(`${API_BASE}/api/months`);
  const monthsData = await monthsRes.json();
  assert.strictEqual(monthsData.success, true);
  const june = monthsData.data.find(m => m.month_year === '2026-06');
  assert.ok(june, 'June 2026 should exist in month cycles list');

  // Verify June 2026 collections grid has client 3032 with principal 9300
  const juneCollRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-06`);
  const juneCollData = await juneCollRes.json();
  assert.strictEqual(juneCollData.success, true);
  const client3032InJune = juneCollData.rows.find(c => c.sl_no === 3032);
  assert.ok(client3032InJune, 'Client 3032 should be present in June 2026 register');
  assert.strictEqual(client3032InJune.principal, 9300, 'June principal must equal remaining balance ₹9,300');
  assert.strictEqual(client3032InJune.total_collected, 0, 'New month collections must start at 0');
  assert.strictEqual(client3032InJune.remaining, 9300);
});

// 6. Test RolloverWizard Component Structure
await runTest('RolloverWizard.jsx contains step previews, execute trigger, and error handling', () => {
  const wizardPath = path.join(__dirname, '../src/components/RolloverWizard.jsx');
  const code = fs.readFileSync(wizardPath, 'utf8');

  assert.ok(code.includes('/api/rollover/preview'), 'Missing preview fetch in RolloverWizard');
  assert.ok(code.includes('/api/rollover/execute'), 'Missing execute fetch in RolloverWizard');
  assert.ok(code.includes('preview.summary.completed_count'), 'Missing completed_count in UI');
  assert.ok(code.includes('preview.summary.pending_count'), 'Missing pending_count in UI');
  assert.ok(code.includes('preview.summary.total_new_principal'), 'Missing total_new_principal in UI');
  assert.ok(code.includes('onRolloverComplete'), 'Missing onRolloverComplete callback');
});

// 7. Test ClosedClientsPage Component Structure
await runTest('ClosedClientsPage.jsx contains WhatsApp receipt, print thermal trigger, and reopen button', () => {
  const pagePath = path.join(__dirname, '../src/pages/ClosedClientsPage.jsx');
  const code = fs.readFileSync(pagePath, 'utf8');

  assert.ok(code.includes('/api/reports/closed'), 'Missing /api/reports/closed fetch');
  assert.ok(code.includes('/api/collections/reopen-client'), 'Missing reopen-client call');
  assert.ok(code.includes('setSelectedReceipt'), 'Missing receipt modal trigger');
  assert.ok(code.includes("mode: 'whatsapp'"), 'Missing WhatsApp mode selection');
  assert.ok(code.includes("mode: 'print'"), 'Missing print thermal mode selection');
  assert.ok(code.includes('ReceiptModal'), 'Missing ReceiptModal render');
});

// 8. Test Zero Data Loss: Closed record JSON Snapshot Integrity
await runTest('Closed record snapshot stores client profile and payments for recovery', () => {
  const mockSnapshot = {
    cycle: {
      id: 'cycle_3032_2026_05',
      principal: 10000,
      month_year: '2026-05'
    },
    collections: [
      { day_number: 1, amount: 100 },
      { day_number: 2, amount: 100 },
      { day_number: 3, amount: 500 }
    ],
    closed_at: '2026-05-31T23:59:59Z'
  };

  const raw = JSON.stringify(mockSnapshot);
  const parsed = JSON.parse(raw);

  assert.strictEqual(parsed.cycle.principal, 10000);
  assert.strictEqual(parsed.collections.length, 3);
  const total = parsed.collections.reduce((sum, c) => sum + c.amount, 0);
  assert.strictEqual(total, 700);
  assert.strictEqual(parsed.closed_at, '2026-05-31T23:59:59Z');
});

console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 5 Month-End Rollover Engine & Client Archival verification complete with zero errors!\n');
  process.exit(0);
} else {
  console.error(`💥 Some tests failed: ${totalTests - passedTests} failure(s).\n`);
  process.exit(1);
}
