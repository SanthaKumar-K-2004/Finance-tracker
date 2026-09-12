import assert from 'assert';
import { query, execute, initSchema } from '../server/db.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000';

async function runPhase1Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 1 COMPREHENSIVE TEST SUITE');
  console.log('🏛️ Project Setup, Backend Architecture & DB Connections');
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

  // 1. Express Server & Core Middleware Verification
  await test('1. Express Server Health & Core Middleware (CORS, JSON limits)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200, 'Health endpoint must return 200');
    
    // Check CORS
    const corsHeader = res.headers.get('access-control-allow-origin');
    assert(corsHeader === '*' || corsHeader !== null, 'CORS header must be present');

    const json = await res.json();
    assert.strictEqual(json.status, 'ok', 'Status must be ok');
    assert.strictEqual(json.service, 'Daily Collection Finance API');
    assert(json.database_mode, 'Database mode must be defined');
  });

  // 2. Database Schema & Engine Integrity (server/db.js)
  await test('2. Database Engine & Schema (All 7 Core Tables + Indexes)', async () => {
    await initSchema();
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    
    const requiredTables = [
      'companies',
      'clients',
      'loan_cycles',
      'daily_collections',
      'closed_clients',
      'settings',
      'settlements'
    ];

    for (const req of requiredTables) {
      assert(tableNames.includes(req), `Table "${req}" must exist in database`);
    }

    // Check indexes
    const indexes = await query("SELECT name FROM sqlite_master WHERE type='index'");
    const indexNames = indexes.map(i => i.name);
    assert(indexNames.some(n => n.includes('idx_clients_company_sl')), 'idx_clients_company_sl index must exist');
    assert(indexNames.some(n => n.includes('idx_loan_cycles_month')), 'idx_loan_cycles_month index must exist');
    assert(indexNames.some(n => n.includes('idx_daily_collections_cycle')), 'idx_daily_collections_cycle index must exist');
  });

  // 3. Data Seeder Integrity (server/seed.js vs ALR Excel)
  await test('3. Data Seeder Integrity (Company Profile, Settings & Client 3032)', async () => {
    // Verify Company
    const companies = await query('SELECT * FROM companies WHERE id = ?', ['comp_alr_001']);
    assert.strictEqual(companies.length, 1, 'Default company comp_alr_001 must exist');
    assert(companies[0].name && companies[0].name.length > 0, 'Company name must exist');

    // Verify Settings
    const settings = await query('SELECT * FROM settings WHERE company_id = ?', ['comp_alr_001']);
    assert(settings.length >= 3, 'Default settings must be configured');
    const currencySetting = settings.find(s => s.key === 'currency_symbol');
    assert.strictEqual(currencySetting?.value, '₹', 'Currency symbol must be ₹');

    // Verify Seeded Client
    const client3032 = await query('SELECT * FROM clients WHERE sl_no = 3032');
    assert.strictEqual(client3032.length, 1, 'Client 3032 must exist from seed');
    assert.strictEqual(client3032[0].phone, '9585194934', 'Phone number must match ALR register');
    assert(client3032[0].name.includes('வெள்ளையம்மா'), 'Tamil name must be preserved');
  });

  // 4. /api/clients REST API Full Lifecycle (CRUD, Validation, Auto-Sl.No)
  let testClientId = null;
  let testCycleId = null;

  await test('4. /api/clients REST API (Validation, Create, Read, Update, Delete)', async () => {
    // 4a. Get all clients
    const getRes = await fetch(`${BASE_URL}/api/clients`);
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert(getJson.success, 'Clients fetch must be successful');
    assert(Array.isArray(getJson.data), 'Data must be an array');
    assert(getJson.data.length > 0, 'Must contain active clients');

    // 4b. Validation: Missing Name should fail with 400
    const failRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9999999999', principal: 10000 })
    });
    assert.strictEqual(failRes.status, 400, 'Missing name must return 400');

    // 4c. Create client with auto Sl.No
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const postRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'முருகன் (Murugan Test)',
        phone: testPhone,
        address: 'Madurai East',
        principal: 15000,
        month_year: '2026-05',
        cycle_name: 'May 2026'
      })
    });
    assert.strictEqual(postRes.status, 201, 'Create client must return 201');
    const postJson = await postRes.json();
    assert(postJson.success, 'Creation must succeed');
    assert(postJson.data.id, 'Created client must have an ID');
    assert(postJson.data.cycle_id, 'Created client must have an auto-provisioned loan cycle');
    assert.strictEqual(postJson.data.principal, 15000, 'Principal must match');
    testClientId = postJson.data.id;
    testCycleId = postJson.data.cycle_id;

    // 4d. Duplicate Phone Validation (409 Conflict)
    const dupRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Murugan',
        phone: testPhone,
        principal: 10000
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate phone must return 409 Conflict');

    // 4e. Get Single Client by ID
    const singleRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`);
    assert.strictEqual(singleRes.status, 200, 'Single client lookup must return 200');
    const singleJson = await singleRes.json();
    assert.strictEqual(singleJson.data.id, testClientId);
    assert.strictEqual(singleJson.data.name, 'முருகன் (Murugan Test)');
    assert.strictEqual(singleJson.data.principal, 15000);

    // 4f. Update Client (PUT)
    const putRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'முருகன் Updated (Murugan Updated)',
        principal: 18000
      })
    });
    assert.strictEqual(putRes.status, 200, 'Update client must return 200');

    // Verify update
    const updatedRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`);
    const updatedJson = await updatedRes.json();
    assert.strictEqual(updatedJson.data.name, 'முருகன் Updated (Murugan Updated)');
    assert.strictEqual(updatedJson.data.principal, 18000);

    // 4g. Soft Delete Client (DELETE)
    const delRes = await fetch(`${BASE_URL}/api/clients/${testClientId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(delRes.status, 200, 'Delete must return 200');

    // Verify soft deleted (should not appear in active clients list)
    const afterDelRes = await fetch(`${BASE_URL}/api/clients`);
    const afterDelJson = await afterDelRes.json();
    assert(!afterDelJson.data.some(c => c.id === testClientId), 'Deleted client must not be in active list');
  });

  // 5. /api/months REST API (Cycle Navigation & Summary)
  await test('5. /api/months REST API (Cycle Navigation, Aggregate Stats & Lookups)', async () => {
    // 5a. GET all months
    const res = await fetch(`${BASE_URL}/api/months`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.success);
    assert(Array.isArray(json.data));
    const may2026 = json.data.find(m => m.month_year === '2026-05');
    assert(may2026, 'May 2026 cycle must exist in month listing');
    assert(may2026.total_clients > 0, 'May 2026 must have active clients');
    assert(may2026.total_principal > 0, 'May 2026 must have total principal');

    // 5b. GET single month cycle
    const singleMonthRes = await fetch(`${BASE_URL}/api/months/2026-05`);
    assert.strictEqual(singleMonthRes.status, 200);
    const singleMonthJson = await singleMonthRes.json();
    assert.strictEqual(singleMonthJson.data.month_year, '2026-05');
    assert(singleMonthJson.data.total_clients > 0);

    // 5c. GET non-existent month cycle (404)
    const notFoundRes = await fetch(`${BASE_URL}/api/months/1999-01`);
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent month must return 404');
  });

  // 6. /api/collections REST API (31-Day Ledger Grid, Upsert, Batch & Delete)
  await test('6. /api/collections REST API (31-Day Grid, Atomic Upsert, Batch & Math Integrity)', async () => {
    // 6a. GET 31-day grid for May 2026
    const gridRes = await fetch(`${BASE_URL}/api/collections/grid?month_year=2026-05`);
    assert.strictEqual(gridRes.status, 200);
    const gridJson = await gridRes.json();
    assert(gridJson.success);
    assert(Array.isArray(gridJson.rows), 'Grid must have rows');
    assert(gridJson.summary, 'Grid must have grand summary');

    // Validate 31-Day Math Invariants for each row
    for (const row of gridJson.rows) {
      assert(row.client_id, 'Row must have client_id');
      assert(row.cycle_id, 'Row must have cycle_id');
      
      let sumDays = 0;
      for (let d = 1; d <= 31; d++) {
        sumDays += (row.days[d] || 0);
      }
      assert.strictEqual(row.total_collected, sumDays, `Row ${row.sl_no} total collected must equal SUM(Day1:Day31)`);
      
      const expectedRemaining = row.cycle_status === 'closed' ? 0 : Math.max(0, row.principal - row.total_collected);
      assert.strictEqual(row.remaining, expectedRemaining, `Row ${row.sl_no} remaining must equal max(0, principal - collected)`);
      
      const expectedExcess = Math.max(0, row.total_collected - row.principal);
      assert.strictEqual(row.excess, expectedExcess, `Row ${row.sl_no} excess must equal max(0, collected - principal)`);
    }

    // Validate Column Sums match Row sums
    let totalFromColumnSums = 0;
    for (let d = 1; d <= 31; d++) {
      totalFromColumnSums += (gridJson.summary.column_sums[d] || 0);
    }
    assert.strictEqual(
      Math.round(gridJson.summary.total_collected),
      Math.round(totalFromColumnSums),
      'Grand total collected must exactly match the sum of all 31 daily column totals'
    );

    // 6b. Single Daily Entry Upsert (using isolated cycle to protect seed data)
    const testCycle = `cycle_test_phase1_${Date.now()}`;
    const testClient = `client_test_phase1_${Date.now()}`;
    await execute(
      `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
       VALUES (?, 'comp_alr_001', 9999, 'ALR-9999', 'Test Collector Client', '9999999990', 'Test Loc', 'active')`,
      [testClient]
    );
    await execute(
      `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
       VALUES (?, 'comp_alr_001', ?, '2026-05', 'May 2026', 10000, '2026-05-01', '2026-05-31', 31, 'active')`,
      [testCycle, testClient]
    );

    // Insert Day 15 as 350
    const entryRes = await fetch(`${BASE_URL}/api/collections/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: testCycle,
        client_id: testClient,
        day_number: 15,
        amount: 350,
        payment_mode: 'gpay',
        collected_by: 'Agent Tester',
        notes: 'Phase 1 test entry'
      })
    });
    assert.strictEqual(entryRes.status, 200);
    const entryJson = await entryRes.json();
    assert(entryJson.success);
    assert.strictEqual(entryJson.data.amount, 350);

    // Update Day 15 to 400 (Atomic Upsert idempotency test)
    const updateEntryRes = await fetch(`${BASE_URL}/api/collections/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: testCycle,
        client_id: testClient,
        day_number: 15,
        amount: 400,
        payment_mode: 'cash'
      })
    });
    assert.strictEqual(updateEntryRes.status, 200);

    // Verify directly in database that only 1 record exists for day 15
    const checkDb = await query(
      'SELECT * FROM daily_collections WHERE cycle_id = ? AND day_number = 15',
      [testCycle]
    );
    assert.strictEqual(checkDb.length, 1, 'Must have strictly 1 record for Day 15 (no duplicates)');
    assert.strictEqual(checkDb[0].amount, 400, 'Amount must be updated to 400');
    assert.strictEqual(checkDb[0].payment_mode, 'cash', 'Payment mode must be updated to cash');

    // 6c. Batch Collection Entry
    const batchRes = await fetch(`${BASE_URL}/api/collections/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_number: 16,
        payment_mode: 'cash',
        collected_by: 'Agent Batch',
        entries: [
          { cycle_id: testCycle, client_id: testClient, amount: 250 }
        ]
      })
    });
    assert.strictEqual(batchRes.status, 200);
    const batchJson = await batchRes.json();
    assert(batchJson.success);

    // 6d. Delete single daily entry
    const delEntryRes = await fetch(`${BASE_URL}/api/collections/entry`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: testCycle,
        day_number: 16
      })
    });
    assert.strictEqual(delEntryRes.status, 200);
    const checkDeleted = await query(
      'SELECT * FROM daily_collections WHERE cycle_id = ? AND day_number = 16',
      [testCycle]
    );
    assert.strictEqual(checkDeleted.length, 0, 'Entry for day 16 must be deleted');

    // Clean up temporary test client, cycle, and collection
    await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [testCycle]);
    await execute('DELETE FROM loan_cycles WHERE id = ?', [testCycle]);
    await execute('DELETE FROM clients WHERE id = ?', [testClient]);
  });

  // 7. /api/reports REST API (Dashboard KPIs & Defaulter Radar & Settlements)
  await test('7. /api/reports REST API (Dashboard KPIs, Defaulters Radar & Evening Settlements)', async () => {
    // 7a. GET Dashboard KPIs
    const repRes = await fetch(`${BASE_URL}/api/reports/dashboard?month_year=2026-05`);
    assert.strictEqual(repRes.status, 200);
    const repJson = await repRes.json();
    assert(repJson.success);
    assert(repJson.data.active_clients > 0, 'Active clients must be > 0');
    assert(repJson.data.total_principal > 0, 'Total principal must be > 0');
    assert(repJson.data.total_collected > 0, 'Total collected must be > 0');
    assert(typeof repJson.data.collection_rate === 'number', 'Collection rate must be a percentage');
    assert(Array.isArray(repJson.data.defaulters), 'Defaulters radar must be an array');
    assert(Array.isArray(repJson.data.payment_modes), 'Payment modes must be an array');

    // 7b. Evening Cash Settlement Slip
    const settleRes = await fetch(`${BASE_URL}/api/reports/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: 'Santhakumar (Agent)',
        expected_amount: 5500,
        actual_amount: 5500,
        denomination: { '500': 10, '200': 2, '100': 1 }
      })
    });
    assert.strictEqual(settleRes.status, 200);
    const settleJson = await settleRes.json();
    assert(settleJson.success);

    // Verify settlement saved in list
    const listSettleRes = await fetch(`${BASE_URL}/api/reports/settlements`);
    const listSettleJson = await listSettleRes.json();
    assert(Array.isArray(listSettleJson.data));
    assert(listSettleJson.data.some(s => s.agent_name === 'Santhakumar (Agent)'));
  });

  // 8. Architectural Connections: Antigravity Native MCP Stdio Verification
  await test('8. Architecture Verification: Antigravity MCP Server (list_tables, read_query, get_ledger_audit)', async () => {
    await new Promise((resolve, reject) => {
      const proc = spawn('node', [path.resolve(__dirname, '../server/mcpServer.js')], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      let buffer = '';
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('MCP server communication timed out after 10s'));
      }, 10000);

      proc.stdout.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === 1) {
              // Initialized -> Request tools list
              const listReq = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n';
              proc.stdin.write(listReq);
            } else if (msg.id === 2) {
              // Tools discovered -> Call get_ledger_audit
              const tools = msg.result?.tools?.map(t => t.name) || [];
              assert(tools.includes('read_query'), 'MCP must provide read_query');
              assert(tools.includes('list_tables'), 'MCP must provide list_tables');
              assert(tools.includes('get_ledger_audit'), 'MCP must provide get_ledger_audit');

              const auditReq = JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                  name: 'get_ledger_audit',
                  arguments: { month_year: '2026-05' }
                }
              }) + '\n';
              proc.stdin.write(auditReq);
            } else if (msg.id === 3) {
              // Audit result received
              const contentText = msg.result?.content?.[0]?.text;
              assert(contentText, 'Audit tool must return content');
              const auditData = JSON.parse(contentText);
              assert(auditData.audit_passed === true || auditData.audit_status === 'PASSED', `Ledger audit must pass: ${auditData.audit_status}`);
              assert(auditData.discrepancies_count === 0 || auditData.audit_passed === true, 'There must be zero mathematical discrepancies');
              
              clearTimeout(timer);
              proc.kill();
              resolve();
            }
          } catch (e) {
            clearTimeout(timer);
            proc.kill();
            reject(e);
          }
        }
      });

      // Send initialize request
      const initReq = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'AntigravityPhase1Test', version: '1.0' }
        }
      }) + '\n';
      proc.stdin.write(initReq);
    });
  });

  console.log('\n======================================================');
  console.log(`🏁 PHASE 1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
