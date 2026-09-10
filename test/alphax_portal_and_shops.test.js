import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = 'http://localhost:5000';

test('1. Shop Management & Branch Gateway Endpoints', async () => {
  // Test GET /api/shops
  const res = await fetch(`${API_BASE}/api/shops`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data), 'data must be an array of shops');
  assert.ok(json.data.length >= 3, 'Must contain at least 3 default branches');

  // Verify primary ALR branch
  const primary = json.data.find((s) => s.code === 'SHOP-ALR-01');
  assert.ok(primary, 'Must contain SHOP-ALR-01');
  assert.ok(primary.name.includes('ALR Finance'), 'Primary shop name must match');

  // Test POST /api/shops/login
  const loginRes = await fetch(`${API_BASE}/api/shops/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: 'SHOP-ALR-01', pin: '1234' })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginJson = await loginRes.json();
  assert.strictEqual(loginJson.success, true);
  assert.strictEqual(loginJson.data.code, 'SHOP-ALR-01');

  // Test Invalid PIN rejection
  const badLogin = await fetch(`${API_BASE}/api/shops/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: 'SHOP-ALR-01', pin: '9999' })
  });
  assert.strictEqual(badLogin.status, 401);

  // Test POST /api/shops/register
  const regRes = await fetch(`${API_BASE}/api/shops/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Branch Kovilpatti',
      address: 'Kovilpatti, Tamil Nadu',
      phone: '9876543210',
      routes: 'Bazaar, North Street'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regJson = await regRes.json();
  assert.strictEqual(regJson.success, true);
  assert.ok(regJson.data.code.startsWith('SHOP-BR-'));
});

test('2. AlphaX Landing Page & Layout Code Structure Verification', () => {
  const landingPath = path.resolve(__dirname, '../src/pages/AlphaXLandingPage.jsx');
  assert.ok(fs.existsSync(landingPath), 'AlphaXLandingPage.jsx must exist');
  const landingCode = fs.readFileSync(landingPath, 'utf8');

  // Header and Apple VisionOS elements
  assert.ok(landingCode.includes('Apple visionOS Floating Capsule Header'), 'Must include visionOS capsule header');
  assert.ok(landingCode.includes('BUILDING'), 'Must include BUILDING headline');
  assert.ok(landingCode.includes('AI SOLUTIONS'), 'Must include AI SOLUTIONS headline');
  assert.ok(landingCode.includes('AmbientVideoBackground'), 'Must include video/canvas motion background');
  assert.ok(landingCode.includes('ShopLoginModal'), 'Must integrate ShopLoginModal');
  assert.ok(landingCode.includes('SANTHAKUMAR K'), 'Must highlight Founder Santhakumar K');
  assert.ok(landingCode.includes('hardware'), 'Must have hardware POS section');

  // Verify App.jsx wraps with ShopProvider and routes
  const appPath = path.resolve(__dirname, '../src/App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  assert.ok(appCode.includes('ShopProvider'), 'App.jsx must import and use ShopProvider');
  assert.ok(appCode.includes('AlphaXLandingPage'), 'App.jsx must route to AlphaXLandingPage');

  // Verify Layout.jsx integrates shop switcher
  const layoutPath = path.resolve(__dirname, '../src/components/Layout.jsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(layoutCode.includes('useShop'), 'Layout.jsx must use useShop');
  assert.ok(layoutCode.includes('ShopLoginModal'), 'Layout.jsx must render ShopLoginModal');
  assert.ok(layoutCode.includes('AlphaX Portal'), 'Layout.jsx must have AlphaX Portal nav item');
});
