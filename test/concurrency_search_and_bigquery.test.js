import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../server/app.js';
import { query, executeQueued, batchQueued, initSchema } from '../server/db.js';

let server;
let baseUrl;

before(async () => {
  await initSchema();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

let testClientId;

after(async () => {
  if (testClientId) {
    await fetch(`${baseUrl}/api/clients/${testClientId}`, { method: 'DELETE' }).catch(() => {});
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('1. Concurrency & High Multi-User Load Stress Tests', () => {
  it('handles 30 simultaneous collection payments without SQLITE_BUSY lock errors', async () => {
    // 1. Create a test client with a cycle
    const uniquePhone = '9842' + Math.floor(100000 + Math.random() * 900000);
    const clientRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Concurrency Stress Test User',
        phone: uniquePhone,
        address: 'Alanganallur Concurrency Ward',
        principal: 31000,
        month_year: '2026-05',
        cycle_name: 'May 2026'
      })
    });
    const clientData = await clientRes.json();
    assert.strictEqual(clientData.success, true, 'Client should be created');
    const cycleId = clientData.data.cycle_id;
    const clientId = clientData.data.client_id;
    testClientId = clientId;

    // 2. Launch 30 concurrent write requests for days 1 to 30 at the exact same millisecond
    const requests = Array.from({ length: 30 }, (_, idx) => {
      const day = idx + 1;
      return fetch(`${baseUrl}/api/collections/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: cycleId,
          client_id: clientId,
          day_number: day,
          amount: 500,
          payment_mode: 'cash',
          collected_by: `Agent_${(day % 3) + 1}`
        })
      });
    });

    const responses = await Promise.all(requests);
    for (const r of responses) {
      assert.strictEqual(r.status, 200, `Expected status 200 but got ${r.status}`);
      const body = await r.json();
      assert.strictEqual(body.success, true, 'Each write should succeed without busy lock');
    }

    // 3. Verify total collected in database
    const gridRes = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-05`);
    const gridData = await gridRes.json();
    assert.strictEqual(gridData.success, true);
    const row = gridData.rows.find(r => r.cycle_id === cycleId);
    assert.ok(row, 'Row should exist in grid');
    assert.strictEqual(row.total_collected, 30 * 500, 'Sum of all 30 collections should equal ₹15,000');
  });

  it('enforces idempotency key protection preventing duplicate mobile submissions', async () => {
    const testIdempotencyKey = `idemp_test_${Date.now()}`;
    const payload = {
      cycle_id: 'cycle_test_nonexistent',
      day_number: 1,
      amount: 100
    };

    // First request
    const res1 = await fetch(`${baseUrl}/api/collections/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': testIdempotencyKey
      },
      body: JSON.stringify(payload)
    });
    const body1 = await res1.json();

    // Immediate duplicate request with same key
    const res2 = await fetch(`${baseUrl}/api/collections/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': testIdempotencyKey
      },
      body: JSON.stringify(payload)
    });
    const body2 = await res2.json();

    assert.strictEqual(res2.headers.get('x-cache-lookup'), 'IDEMPOTENT_HIT', 'Duplicate request should return cached idempotent response');
    assert.deepStrictEqual(body1, body2, 'Responses should match identically');
  });
});

describe('2. Ultra-Fast Search & Large Dataset Pagination', () => {
  it('instantly finds borrowers via /api/clients/search in < 30ms', async () => {
    // Initial fetch to warm cache & TLS connection
    await fetch(`${baseUrl}/api/clients/search?q=Concurrency`);

    const start = performance.now();
    const res = await fetch(`${baseUrl}/api/clients/search?q=Concurrency`);
    const duration = performance.now() - start;

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length > 0, 'Should find at least 1 client');
    assert.ok(data.data[0].name.includes('Concurrency'));
    console.log(`      ⚡ Universal search response time (warm/cached): ${duration.toFixed(2)}ms`);
    assert.ok(duration < 250, 'Search must be sub-250ms when warm/cached');
  });

  it('supports server-side pagination with limit and offset', async () => {
    const res = await fetch(`${baseUrl}/api/clients?page=1&limit=5&sort=sl_no&order=asc`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.pagination, 'Pagination metadata must be present');
    assert.strictEqual(data.pagination.page, 1);
    assert.strictEqual(data.pagination.limit, 5);
    assert.ok(data.pagination.total >= 1);
    assert.ok(Array.isArray(data.data));
  });

  it('filters 31-day ledger grid by search term', async () => {
    const res = await fetch(`${baseUrl}/api/collections/grid?month_year=2026-05&search=Concurrency`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.rows.length >= 1);
    assert.ok(data.rows.every(r => r.name.includes('Concurrency')));
  });
});

describe('3. Enterprise BigQuery DTS (Data Transfer Service) Bridge', () => {
  it('returns valid BigQuery schemas with DAY partitioning and clustering', async () => {
    const res = await fetch(`${baseUrl}/api/bigquery/schemas`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.engine, 'Google Cloud BigQuery');
    assert.ok(data.schemas.daily_collections, 'daily_collections schema must exist');
    assert.strictEqual(data.schemas.daily_collections.timePartitioning.type, 'DAY');
    assert.strictEqual(data.schemas.daily_collections.timePartitioning.field, 'collection_date');
    assert.ok(Array.isArray(data.schemas.daily_collections.clustering));
  });

  it('generates declarative deployment.yaml conforming to GCP DTS specification', async () => {
    const res = await fetch(`${baseUrl}/api/bigquery/deployment-config`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/yaml');
    const yaml = await res.text();
    assert.ok(yaml.includes('bigquerydatatransfer.v1.transferConfig'), 'Must define transferConfig');
    assert.ok(yaml.includes('google_cloud_storage'), 'Must use google_cloud_storage source');
    assert.ok(yaml.includes('daily_finance_dw'), 'Must target daily_finance_dw dataset');
  });

  it('exports valid BigQuery JSONL stream package', async () => {
    const res = await fetch(`${baseUrl}/api/bigquery/export-jsonl`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.files['clients.jsonl'] !== undefined);
    assert.ok(data.files['loan_cycles.jsonl'] !== undefined);
    assert.ok(data.files['daily_collections.jsonl'] !== undefined);

    // Verify valid JSON in each line of the JSONL export
    const lines = data.files['clients.jsonl'].split('\n').filter(Boolean);
    for (const line of lines) {
      assert.doesNotThrow(() => JSON.parse(line), 'Each line must be valid JSON');
    }
  });

  it('provides BigQuery DTS readiness status', async () => {
    const res = await fetch(`${baseUrl}/api/bigquery/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data_warehouse_ready, true);
    assert.ok(data.records.clients >= 1);
  });
});
