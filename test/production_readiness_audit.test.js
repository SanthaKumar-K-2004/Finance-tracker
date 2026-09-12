import { test, describe } from 'node:test';
import assert from 'node:assert';

const API_BASE = 'http://localhost:5000';

describe('🚀 Production-Readiness Master Audit: Connections, Endpoints & Security', () => {

  test('1. Core API Health & Cloud Database Connectivity', async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    assert.strictEqual(res.status, 200, 'Health check must return 200 OK');
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'Daily Collection Finance API');

    // Check Backup & Database Status
    const statusRes = await fetch(`${API_BASE}/api/backup/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.stats.total_clients > 0, 'Database must have clients loaded');
    assert.ok(statusData.stats.total_cycles > 0, 'Database must have loan cycles loaded');
  });

  test('2. Company / Shop Profile Read & Write', async () => {
    const res = await fetch(`${API_BASE}/api/company`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.name, 'Company must have name');
    assert.ok(data.data.phone, 'Company must have phone');
    assert.ok(data.data.address, 'Company must have address');

    // Test update
    const updateRes = await fetch(`${API_BASE}/api/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.data.name,
        tagline: data.data.tagline || 'Daily Collection & Microfinance',
        phone: data.data.phone,
        address: data.data.address
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.success, true);
  });

  test('3. Clients Directory & Loan Cycle Management', async () => {
    // 1. Fetch clients list
    const res = await fetch(`${API_BASE}/api/clients`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));

    // 2. Create a temporary test client
    const testSlNo = 9988;
    const createRes = await fetch(`${API_BASE}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sl_no: testSlNo,
        name: 'உற்பத்தி சோதனை பயனாளி (Prod Audit Client)',
        phone: '9888877777',
        address: 'அலங்காநல்லூர் மேற்கு',
        principal: 10000,
        month_year: '2026-05'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    const clientId = createData.data.id;

    // 3. Update client details
    const updateRes = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'உற்பத்தி சோதனை பயனாளி Updated',
        phone: '9888877777',
        address: 'அலங்காநல்லூர் கிழக்கு',
        principal: 12000,
        month_year: '2026-05'
      })
    });
    assert.strictEqual(updateRes.status, 200);

    // 4. Delete client
    const deleteRes = await fetch(`${API_BASE}/api/clients/${clientId}`, { method: 'DELETE' });
    assert.strictEqual(deleteRes.status, 200);
  });

  test('4. 31-Day Ledger Grid, Daily Collections & Math Verification', async () => {
    // 1. Fetch grid for active month
    const gridRes = await fetch(`${API_BASE}/api/collections/grid?month_year=2026-05`);
    assert.strictEqual(gridRes.status, 200);
    const gridData = await gridRes.json();
    assert.strictEqual(gridData.success, true);
    assert.strictEqual(gridData.month_year, '2026-05');
    assert.strictEqual(gridData.total_days, 31);
    assert.ok(gridData.rows.length > 0, 'Grid must contain borrower rows');

    const firstRow = gridData.rows[0];
    assert.ok(firstRow.client_id, 'Row must have client_id');
    assert.ok(firstRow.name, 'Row must have name');
    assert.ok(firstRow.principal > 0, 'Row must have principal');
    assert.ok(firstRow.remaining !== undefined, 'Row must calculate remaining');

    // 2. Test recording a payment
    const entryRes = await fetch(`${API_BASE}/api/collections/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: firstRow.cycle_id,
        client_id: firstRow.client_id,
        day_number: 15,
        amount: 250,
        payment_mode: 'cash'
      })
    });
    assert.strictEqual(entryRes.status, 200);
    const entryData = await entryRes.json();
    assert.strictEqual(entryData.success, true);

    // 3. Clear the test payment
    const delRes = await fetch(`${API_BASE}/api/collections/entry`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: firstRow.cycle_id,
        day_number: 15
      })
    });
    assert.strictEqual(delRes.status, 200);
  });

  test('5. Reports, KPIs & Settlements Handover', async () => {
    // Dashboard KPIs
    const dashRes = await fetch(`${API_BASE}/api/reports/dashboard?month_year=2026-05`);
    assert.strictEqual(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.strictEqual(dashData.success, true);
    assert.ok(dashData.data.active_clients !== undefined);
    assert.ok(dashData.data.total_principal !== undefined);
    assert.ok(dashData.data.total_collected !== undefined);

    // Settlements Handover
    const settleRes = await fetch(`${API_BASE}/api/reports/settlements`);
    assert.strictEqual(settleRes.status, 200);
    const settleData = await settleRes.json();
    assert.strictEqual(settleData.success, true);
    assert.ok(Array.isArray(settleData.data));
  });

  test('6. Month Cycles Navigation & Dynamic Calendar Length', async () => {
    const monthsRes = await fetch(`${API_BASE}/api/months`);
    assert.strictEqual(monthsRes.status, 200);
    const monthsData = await monthsRes.json();
    assert.strictEqual(monthsData.success, true);
    assert.ok(monthsData.data.length > 0);

    // Verify May 2026 has 31 days
    const mayRes = await fetch(`${API_BASE}/api/months/2026-05`);
    assert.strictEqual(mayRes.status, 200);
    const mayData = await mayRes.json();
    assert.strictEqual(mayData.success, true);
    assert.strictEqual(mayData.data.total_days, 31);
  });

  test('7. Excel Template & Export Generation', async () => {
    // Template
    const tplRes = await fetch(`${API_BASE}/api/excel/template?month_year=2026-05`);
    assert.strictEqual(tplRes.status, 200);
    const tplBuffer = await tplRes.arrayBuffer();
    assert.ok(tplBuffer.byteLength > 1000, 'Excel template must return non-empty workbook');

    // Export
    const expRes = await fetch(`${API_BASE}/api/excel/export?month_year=2026-05`);
    assert.strictEqual(expRes.status, 200);
    const expBuffer = await expRes.arrayBuffer();
    assert.ok(expBuffer.byteLength > 1000, 'Excel export must return non-empty workbook');
  });

  test('8. WhatsApp Messaging Audit Log', async () => {
    const logRes = await fetch(`${API_BASE}/api/collections/whatsapp-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9585194934',
        message_type: 'production_audit_receipt',
        message_text: 'வணக்கம், உற்பத்தி சோதனை ரசீது சரிபார்ப்பு.'
      })
    });
    assert.strictEqual(logRes.status, 200);
    const logData = await logRes.json();
    assert.strictEqual(logData.success, true);

    const getLogs = await fetch(`${API_BASE}/api/collections/whatsapp-logs`);
    assert.strictEqual(getLogs.status, 200);
    const logsData = await getLogs.json();
    assert.strictEqual(logsData.success, true);
    assert.ok(logsData.data.length > 0);
  });

  test('9. Security Headers & Rate Limiter Verification', async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(res.headers.get('ratelimit-limit') !== null, 'Rate limit headers should be present');
  });

});
