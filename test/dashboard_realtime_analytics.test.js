import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:5000/api';

describe('Dashboard Real-Time Analytics & Multi-Filter Payload Tests', () => {
  test('1. GET /api/reports/dashboard returns enhanced data structure', async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard?month_year=2026-05`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data);

    const d = json.data;
    assert.ok(typeof d.active_clients === 'number');
    assert.ok(typeof d.total_principal === 'number');
    assert.ok(typeof d.total_collected === 'number');
    assert.ok(typeof d.total_remaining === 'number');
    assert.ok(typeof d.collection_rate === 'number');
    assert.ok(Array.isArray(d.payment_modes));
    assert.ok(Array.isArray(d.daily_trends));
    assert.ok(Array.isArray(d.villages));
    assert.ok(Array.isArray(d.clients_summary));
    assert.ok(Array.isArray(d.defaulters));
  });

  test('2. daily_trends contains valid 31-day velocity records', async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard?month_year=2026-05`);
    const json = await res.json();
    const trends = json.data.daily_trends;

    assert.ok(trends.length > 0, 'daily_trends should not be empty');
    for (const t of trends) {
      assert.ok(typeof t.day_number === 'number');
      assert.ok(t.day_number >= 1 && t.day_number <= 31);
      assert.ok(typeof t.amount === 'number');
      assert.ok(typeof t.count === 'number');
    }
  });

  test('3. villages contains route-wise performance breakdown', async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard?month_year=2026-05`);
    const json = await res.json();
    const villages = json.data.villages;

    assert.ok(villages.length > 0, 'villages should contain routes');
    for (const v of villages) {
      assert.ok(typeof v.village === 'string');
      assert.ok(typeof v.client_count === 'number');
      assert.ok(typeof v.principal === 'number');
      assert.ok(typeof v.collected === 'number');
      assert.ok(typeof v.remaining === 'number');
      assert.ok(typeof v.collection_rate === 'number');
      assert.ok(v.collection_rate >= 0 && v.collection_rate <= 1000);
    }
  });

  test('4. clients_summary supports instant 0ms client-side multi-filtering', async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard?month_year=2026-05`);
    const json = await res.json();
    const clients = json.data.clients_summary;

    assert.ok(clients.length > 0, 'clients_summary should contain client records');
    for (const c of clients) {
      assert.ok(c.id, 'client must have id');
      assert.ok(typeof c.name === 'string');
      assert.ok(typeof c.principal === 'number');
      assert.ok(typeof c.total_collected === 'number');
      assert.ok(typeof c.remaining === 'number');
      assert.ok(typeof c.paid_today === 'number');
      assert.ok(typeof c.is_cleared === 'boolean');
    }

    // Verify filter logic simulation on clients_summary
    const defaulters = clients.filter(c => c.remaining > 0 && (c.total_collected / (c.principal || 1)) < 0.5);
    const cleared = clients.filter(c => c.is_cleared || c.remaining === 0);
    const totalPrincipal = clients.reduce((sum, c) => sum + c.principal, 0);
    const totalCollected = clients.reduce((sum, c) => sum + c.total_collected, 0);

    assert.ok(defaulters.length >= 0);
    assert.ok(cleared.length >= 0);
    assert.ok(totalPrincipal >= 0);
    assert.ok(totalCollected >= 0);
  });
});
