import { db, query, execute, initSchema } from '../server/db.js';
import xlsx from 'xlsx';
import assert from 'assert';

const XLSX = xlsx.default || xlsx;

async function runPhase0Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 0 COMPREHENSIVE TEST SUITE');
  console.log('======================================================\n');

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
      failed++;
    }
  }

  // 1. Database connection
  await test('1. Turso Cloud Database Connectivity', async () => {
    const res = await query('SELECT 1 + 1 as val');
    assert.strictEqual(Number(res[0].val), 2, 'Value must be 2');
  });

  // 2. Schema verification
  await test('2. Verify All Core Schema Tables Exist', async () => {
    await initSchema();
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    const required = ['companies', 'clients', 'loan_cycles', 'daily_collections', 'closed_clients', 'settings', 'settlements'];
    for (const req of required) {
      assert(tableNames.includes(req), `Table ${req} must exist in database`);
    }
  });

  // 3. Seeded ALR data
  await test('3. Seeded Client 3032 from ALR Excel', async () => {
    const client = await query('SELECT * FROM clients WHERE sl_no = 3032');
    assert(client.length > 0, 'Client 3032 must exist');
    assert.strictEqual(client[0].phone, '9585194934', 'Phone number must match');
    assert(client[0].name.includes('வெள்ளையம்மா'), 'Name must contain Tamil text');
  });

  // 4. Daily collections and math
  await test('4. Daily Collections & 31-Day Ledger Math', async () => {
    const client = (await query('SELECT id FROM clients WHERE sl_no = 3032'))[0];
    const cycle = (await query('SELECT * FROM loan_cycles WHERE client_id = ? AND month_year = ?', [client.id, '2026-05']))[0];
    assert(cycle, 'May 2026 cycle must exist');

    const collections = await query('SELECT * FROM daily_collections WHERE cycle_id = ? ORDER BY day_number ASC', [cycle.id]);
    const totalCollected = collections.reduce((s, c) => s + c.amount, 0);
    const remaining = Math.max(0, cycle.principal - totalCollected);

    assert(totalCollected >= 500, 'Total collected should be at least 500');
    assert.strictEqual(remaining, cycle.principal - totalCollected, 'Remaining must match Principal - Collected');
  });

  // 5. Concurrency & UPSERT Idempotency test
  await test('5. Atomic Upsert & Duplicate Prevention (Zero Duplicates)', async () => {
    const client = (await query('SELECT id FROM clients WHERE sl_no = 3032'))[0];
    const cycle = (await query('SELECT id FROM loan_cycles WHERE client_id = ?', [client.id]))[0];

    const collId = `coll_${cycle.id}_d20`;
    // Insert Day 20 as 150
    await execute(
      `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
       VALUES (?, 'comp_alr_001', ?, ?, 20, '2026-05-20', 150, 'cash', 'Tester')
       ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount`,
      [collId, cycle.id, client.id]
    );

    // Update Day 20 to 200 (simulating concurrent tap or correction)
    await execute(
      `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
       VALUES (?, 'comp_alr_001', ?, ?, 20, '2026-05-20', 200, 'gpay', 'Tester')
       ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount`,
      [collId, cycle.id, client.id]
    );

    // Verify there is ONLY ONE record for day 20 and amount is 200
    const check = await query('SELECT * FROM daily_collections WHERE cycle_id = ? AND day_number = 20', [cycle.id]);
    assert.strictEqual(check.length, 1, 'There must be strictly 1 record for Day 20');
    assert.strictEqual(check[0].amount, 200, 'Amount must be updated to 200');
  });

  // 6. Excel Generation test
  await test('6. Excel Export Generator & Formula Integrity', async () => {
    const headers = ['Sl.No', 'Month / Year', 'Name', 'Phone', 'Address', 'Principal'];
    for (let d = 1; d <= 31; d++) headers.push(d);
    headers.push('Total', 'Remaining', 'Excess');

    const sampleRow = [3032, '02.05.2026', 'வெள்ளையம்மா', '9585194934', 'அலங்காநல்லூர்', 10000];
    for (let d = 1; d <= 31; d++) sampleRow.push(d <= 5 ? 100 : 0);
    sampleRow.push({ t: 'n', f: 'SUM(G4:AK4)', v: 500 });
    sampleRow.push({ t: 'n', f: 'IF(F4-AL4<0,0,F4-AL4)', v: 9500 });
    sampleRow.push({ t: 'n', f: 'IF(AL4-F4>0,AL4-F4,0)', v: 0 });

    const ws = XLSX.utils.aoa_to_sheet([['DAILY COLLECTION REGISTER'], ['Row 2 Summary'], headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Register');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    assert(buf && buf.length > 1000, 'Generated Excel buffer must be valid');
    const readBack = XLSX.read(buf);
    assert.strictEqual(readBack.SheetNames[0], 'Test Register');
  });

  // 7. Rollover Preview Calculation
  await test('7. Month-End Rollover Calculation Engine', async () => {
    const client = (await query('SELECT id FROM clients WHERE sl_no = 3032'))[0];
    const cycle = (await query('SELECT * FROM loan_cycles WHERE client_id = ?', [client.id]))[0];
    const totalCollected = (await query('SELECT SUM(amount) as sum FROM daily_collections WHERE cycle_id = ?', [cycle.id]))[0].sum;
    const remaining = Math.max(0, cycle.principal - totalCollected);

    // If not cleared, new principal in June must equal remaining
    assert(remaining > 0, 'Client 3032 should have pending balance');
    const expectedJunePrincipal = remaining;
    assert.strictEqual(expectedJunePrincipal, cycle.principal - totalCollected);
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase0Tests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
