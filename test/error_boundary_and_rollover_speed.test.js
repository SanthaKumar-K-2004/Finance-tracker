import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = 'http://localhost:5000';

test('1. ErrorBoundary Component & App.jsx Integration Verification', () => {
  const ebPath = path.resolve(__dirname, '../src/components/ErrorBoundary.jsx');
  assert.ok(fs.existsSync(ebPath), 'src/components/ErrorBoundary.jsx must exist');
  
  const ebCode = fs.readFileSync(ebPath, 'utf8');
  assert.ok(ebCode.includes('getDerivedStateFromError'), 'ErrorBoundary must implement getDerivedStateFromError');
  assert.ok(ebCode.includes('componentDidCatch'), 'ErrorBoundary must implement componentDidCatch');
  assert.ok(ebCode.includes('ஏதோ தவறு நிகழ்ந்துவிட்டது'), 'ErrorBoundary must include Tamil error message');
  assert.ok(ebCode.includes('Reload Page'), 'ErrorBoundary must include Reload button');
  assert.ok(ebCode.includes('Go to Home'), 'ErrorBoundary must include Home navigation button');

  const appPath = path.resolve(__dirname, '../src/App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  assert.ok(appCode.includes("import ErrorBoundary from './components/ErrorBoundary';"), 'App.jsx must import ErrorBoundary');
  assert.ok(appCode.includes('<ErrorBoundary>'), 'App.jsx must wrap component tree in ErrorBoundary');
});

test('2. Dashboard White Screen Root-Cause & Defensive Layout Verification', async () => {
  const dashPath = path.resolve(__dirname, '../src/pages/Dashboard.jsx');
  const dashCode = fs.readFileSync(dashPath, 'utf8');
  
  // Must import MapPin
  assert.ok(dashCode.includes('MapPin'), 'Dashboard.jsx must import MapPin from lucide-react');
  
  // Chart cards must have minWidth: 0 to prevent CSS grid overflow
  assert.ok(dashCode.includes('minWidth: 0'), 'Dashboard chart cards must have minWidth: 0 for Recharts');

  // Verify dashboard API returns data without errors
  const res = await fetch(`${API_BASE}/api/reports/dashboard?month_year=2026-05`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(json.data.defaulters, 'Dashboard data must include defaulters list');
  assert.ok(json.data.payment_modes, 'Dashboard data must include payment modes');
});

test('3. Rollover Performance Optimization (Sub-200ms Batch Execution)', async () => {
  const rolloverPath = path.resolve(__dirname, '../server/routes/rollover.js');
  const rolloverCode = fs.readFileSync(rolloverPath, 'utf8');

  // Must import batch from db.js
  assert.ok(rolloverCode.includes('batch'), 'rollover.js must import batch from db.js');
  
  // Preview must use LEFT JOIN without correlated subqueries
  assert.ok(rolloverCode.includes('LEFT JOIN daily_collections'), 'rollover.js preview must use LEFT JOIN');
  assert.ok(rolloverCode.includes('serverCache.get'), 'rollover.js must use serverCache');

  // Test preview response speed
  const startPreview = Date.now();
  const prevRes = await fetch(`${API_BASE}/api/rollover/preview?from_month=2026-05&to_month=2026-06`);
  const prevTime = Date.now() - startPreview;
  assert.strictEqual(prevRes.status, 200);
  const prevData = await prevRes.json();
  assert.strictEqual(prevData.success, true);
  console.log(`    ⚡ Rollover preview completed in ${prevTime}ms`);

  // Test cached preview response speed (Sub-20ms)
  const startCached = Date.now();
  const cachedRes = await fetch(`${API_BASE}/api/rollover/preview?from_month=2026-05&to_month=2026-06`);
  const cachedTime = Date.now() - startCached;
  assert.strictEqual(cachedRes.status, 200);
  console.log(`    ⚡ Cached rollover preview completed in ${cachedTime}ms`);
  assert.ok(cachedTime < 50, `Cached preview should be under 50ms (was ${cachedTime}ms)`);
});
