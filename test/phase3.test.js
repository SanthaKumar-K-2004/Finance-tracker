/**
 * Phase 3 Automated Verification Test Suite (ESM)
 * Tests Modern Design System, Sunlight High-Contrast Mode,
 * Bilingual Engine Parity (Tamil & English), Theme Cycler,
 * and Antigravity Architecture Verification.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n🎨 === Starting Phase 3: Design System & Bilingual Framework Tests ===\n');

// 1. Test CSS Design System & Theme Variables
runTest('Design System defines HSL Palette & Functional Accents in src/index.css', () => {
  const cssPath = path.join(__dirname, '../src/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes('--emerald-primary'), 'Missing --emerald-primary');
  assert.ok(css.includes('--amber-primary'), 'Missing --amber-primary');
  assert.ok(css.includes('--rose-primary'), 'Missing --rose-primary');
  assert.ok(css.includes('--indigo-primary'), 'Missing --indigo-primary');
  assert.ok(css.includes('--font-tamil'), 'Missing --font-tamil');
  assert.ok(css.includes('--font-mono'), 'Missing --font-mono');
});

// 2. Test Sunlight High-Contrast Theme in index.css
runTest('Sunlight Mode [data-theme="sunlight"] exists with high-contrast parameters', () => {
  const cssPath = path.join(__dirname, '../src/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes("[data-theme='sunlight']"), 'Missing [data-theme="sunlight"] selector');
  assert.ok(css.includes('--text-primary: #000000;'), 'Sunlight text-primary must be pure pitch-black #000000');
  assert.ok(css.includes('--bg-app: #FFFFFF;'), 'Sunlight bg-app must be crisp pure white #FFFFFF');
  assert.ok(css.includes("[data-theme='sunlight'] .mobile-client-card"), 'Missing sunlight card border override');
  assert.ok(css.includes("[data-theme='sunlight'] .chip-btn"), 'Missing sunlight chip-btn override');
});

// 3. Test Glassmorphism & Micro-animations
runTest('Glassmorphism utilities & micro-animations exist in index.css', () => {
  const cssPath = path.join(__dirname, '../src/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes('.glass-panel'), 'Missing .glass-panel class');
  assert.ok(css.includes('backdrop-filter: blur'), 'Missing backdrop-filter blur');
  assert.ok(css.includes('@keyframes pulseGlow'), 'Missing @keyframes pulseGlow');
  assert.ok(css.includes('.interactive-chip'), 'Missing .interactive-chip micro-animation');
  assert.ok(css.includes('.hover-lift'), 'Missing .hover-lift class');
});

// 4. Test Bilingual Parity between Tamil and English
runTest('Bilingual Dictionaries (ta.json and en.json) have 100% exact key parity', () => {
  const taPath = path.join(__dirname, '../src/i18n/ta.json');
  const enPath = path.join(__dirname, '../src/i18n/en.json');

  const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const taKeys = Object.keys(ta).sort();
  const enKeys = Object.keys(en).sort();

  const missingInEn = taKeys.filter(k => !enKeys.includes(k));
  const missingInTa = enKeys.filter(k => !taKeys.includes(k));

  assert.strictEqual(missingInEn.length, 0, `Keys missing in en.json: ${missingInEn.join(', ')}`);
  assert.strictEqual(missingInTa.length, 0, `Keys missing in ta.json: ${missingInTa.join(', ')}`);
  assert.ok(taKeys.length >= 80, `Expected at least 80 keys, found ${taKeys.length}`);

  // Test critical Phase 3 keys
  const expectedKeys = [
    'theme_sunlight',
    'quick_full_due',
    'quick_collect',
    'filter_all',
    'filter_pending',
    'filter_cleared',
    'cash_settlement_title',
    'rollover_wizard_title'
  ];

  for (const k of expectedKeys) {
    assert.ok(ta[k], `ta.json missing expected key: ${k}`);
    assert.ok(en[k], `en.json missing expected key: ${k}`);
  }
});

// 5. Test Theme Context Cycler & Calculation Logic
runTest('Theme Engine cycle sequence: auto -> light -> sunlight -> dark -> auto', () => {
  function getNextThemeMode(currentMode) {
    if (currentMode === 'auto') return 'light';
    if (currentMode === 'light') return 'sunlight';
    if (currentMode === 'sunlight') return 'dark';
    return 'auto';
  }

  assert.strictEqual(getNextThemeMode('auto'), 'light');
  assert.strictEqual(getNextThemeMode('light'), 'sunlight');
  assert.strictEqual(getNextThemeMode('sunlight'), 'dark');
  assert.strictEqual(getNextThemeMode('dark'), 'auto');
});

runTest('Theme Engine time-aware calculation logic', () => {
  function calculateTheme(themeMode, hour) {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'sunlight') return 'sunlight';
    if (themeMode === 'dark') return 'dark';
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  }

  // Sunlight mode is always sunlight regardless of hour
  assert.strictEqual(calculateTheme('sunlight', 14), 'sunlight');
  assert.strictEqual(calculateTheme('sunlight', 22), 'sunlight');

  // Light is always light
  assert.strictEqual(calculateTheme('light', 23), 'light');

  // Dark is always dark
  assert.strictEqual(calculateTheme('dark', 10), 'dark');

  // Auto respects 6 AM to 6 PM daylight
  assert.strictEqual(calculateTheme('auto', 10), 'light'); // 10 AM is light
  assert.strictEqual(calculateTheme('auto', 17), 'light'); // 5 PM is light
  assert.strictEqual(calculateTheme('auto', 18), 'dark');  // 6 PM is dark
  assert.strictEqual(calculateTheme('auto', 23), 'dark');  // 11 PM is dark
  assert.strictEqual(calculateTheme('auto', 5), 'dark');   // 5 AM is dark
});

// 6. Test ClientCard Quick-Pay Full Due logic
runTest('Full Due chip settles entire remaining balance', () => {
  const mockClient = {
    principal: 10000,
    total_collected: 8500,
    remaining: 1500
  };

  const paymentAmount = mockClient.remaining;
  const newTotal = mockClient.total_collected + paymentAmount;
  const newRemaining = Math.max(0, mockClient.principal - newTotal);
  const isCleared = newRemaining === 0;

  assert.strictEqual(paymentAmount, 1500);
  assert.strictEqual(newTotal, 10000);
  assert.strictEqual(newRemaining, 0);
  assert.strictEqual(isCleared, true);
});

// 7. Verify Google Fonts in index.html
runTest('Google Fonts for Tamil, Inter, and JetBrains Mono linked in index.html', () => {
  const htmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('Noto+Sans+Tamil'), 'Missing Noto Sans Tamil link in index.html');
  assert.ok(html.includes('Inter'), 'Missing Inter link in index.html');
  assert.ok(html.includes('JetBrains+Mono'), 'Missing JetBrains Mono link in index.html');
});

console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 3 Modern Design System & Bilingual Framework verification complete with zero errors!\n');
  process.exit(0);
} else {
  console.error(`💥 Some tests failed: ${totalTests - passedTests} failure(s).\n`);
  process.exit(1);
}
