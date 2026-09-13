import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:5000/api';

// Sample 1x1 transparent PNG base64 data URI for logo testing
const SAMPLE_LOGO_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Header & Shop Logo Upload Integration Tests', () => {
  test('1. GET /api/company returns company profile with logo_url field', async () => {
    const res = await fetch(`${API_BASE}/company`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data);
    assert.ok(typeof json.data.name === 'string');
    assert.ok('logo_url' in json.data);
  });

  test('2. POST /api/company/logo with base64 data URL updates company logo', async () => {
    const res = await fetch(`${API_BASE}/company/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_data: SAMPLE_LOGO_DATA_URL })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.logo_url);
    assert.strictEqual(json.data.logo_url, SAMPLE_LOGO_DATA_URL);
  });

  test('3. GET /api/company verifies persisted logo_url in Turso Cloud SQLite', async () => {
    const res = await fetch(`${API_BASE}/company`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.logo_url, SAMPLE_LOGO_DATA_URL);
  });

  test('4. DELETE /api/company/logo resets logo_url to null', async () => {
    const res = await fetch(`${API_BASE}/company/logo`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.logo_url, null);
  });

  test('5. GET /api/company confirms logo_url is null and default badge is restored', async () => {
    const res = await fetch(`${API_BASE}/company`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.logo_url, null);
  });

  test('6. POST /api/company/logo rejects empty payload with 400', async () => {
    const res = await fetch(`${API_BASE}/company/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
  });
});
