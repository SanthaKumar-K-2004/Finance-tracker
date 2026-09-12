import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FastCache } from '../server/utils/cache.js';
import { securityHeaders, corsOriginCheck, createRateLimiter } from '../server/middleware/security.js';

describe('🔒 Security & Memory Leak Hardening Tests', () => {
  test('1. Security headers middleware applies strict protective headers', () => {
    const headers = {};
    const req = {};
    const res = {
      setHeader(name, val) {
        headers[name.toLowerCase()] = val;
      },
      removeHeader(name) {
        delete headers[name.toLowerCase()];
      }
    };
    let nextCalled = false;
    securityHeaders(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(headers['x-frame-options'], 'SAMEORIGIN');
    assert.strictEqual(headers['x-xss-protection'], '1; mode=block');
    assert.strictEqual(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(headers['permissions-policy'].includes('camera=()'));
  });

  test('2. CORS validator permits local development and rejects untrusted origins', () => {
    // Localhost
    corsOriginCheck('http://localhost:5173', (err, allowed) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allowed, true);
    });

    // 127.0.0.1
    corsOriginCheck('http://127.0.0.1:5000', (err, allowed) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allowed, true);
    });

    // Local LAN (e.g. handheld POS terminal)
    corsOriginCheck('http://192.168.1.105:5173', (err, allowed) => {
      assert.strictEqual(err, null);
      assert.strictEqual(allowed, true);
    });

    // Untrusted Origin
    corsOriginCheck('http://malicious-hacker-site.com', (err, allowed) => {
      assert.ok(err instanceof Error);
      assert.strictEqual(allowed, false);
    });
  });

  test('3. FastCache enforces strict upper bound and evicts LRU entries', () => {
    const cache = new FastCache(60 * 1000, 3); // Max 3 entries

    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');
    assert.strictEqual(cache.store.size, 3);

    // Reading key1 makes it recently used
    assert.strictEqual(cache.get('key1'), 'val1');

    // Inserting 4th item should evict key2 (since key1 was refreshed)
    cache.set('key4', 'val4');
    assert.strictEqual(cache.store.size, 3);
    assert.strictEqual(cache.get('key2'), null); // Evicted!
    assert.strictEqual(cache.get('key1'), 'val1'); // Kept!
    assert.strictEqual(cache.get('key3'), 'val3');
    assert.strictEqual(cache.get('key4'), 'val4');

    clearInterval(cache.sweepInterval);
  });

  test('4. FastCache tag invalidation deletes tagged entries', () => {
    const cache = new FastCache(60 * 1000, 10);
    cache.set('grid_2026-05', { data: 1 }, 60000, ['grid']);
    cache.set('dashboard_2026-05', { data: 2 }, 60000, ['reports']);
    cache.set('months_list', { data: 3 }, 60000, ['months']);

    assert.ok(cache.get('grid_2026-05'));
    cache.invalidateTag('grid');
    assert.strictEqual(cache.get('grid_2026-05'), null);
    assert.ok(cache.get('dashboard_2026-05'));

    clearInterval(cache.sweepInterval);
  });

  test('5. Rate Limiter blocks requests exceeding threshold with HTTP 429', () => {
    const limiter = createRateLimiter({ windowMs: 10000, max: 2, message: 'Too many requests' });
    const req = { ip: '10.0.0.1' };
    let statusSet = 200;
    let jsonPayload = null;
    const res = {
      setHeader() {},
      status(code) {
        statusSet = code;
        return this;
      },
      json(payload) {
        jsonPayload = payload;
      }
    };

    // 1st call
    let next1 = false;
    limiter(req, res, () => { next1 = true; });
    assert.strictEqual(next1, true);

    // 2nd call
    let next2 = false;
    limiter(req, res, () => { next2 = true; });
    assert.strictEqual(next2, true);

    // 3rd call (exceeds max 2)
    let next3 = false;
    limiter(req, res, () => { next3 = true; });
    assert.strictEqual(next3, false);
    assert.strictEqual(statusSet, 429);
    assert.strictEqual(jsonPayload?.error, 'Too many requests');
  });
});
