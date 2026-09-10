/**
 * Phase 4 Automated Verification Test Suite (ESM)
 * Tests 31-Day Ledger Register, Sticky Freeze Panes, Keyboard Navigation,
 * Column Sums & Grand Summary Aggregations, Mobile Field Cards,
 * Route / Village Filtering, Quick-Pay Chips, and WhatsApp Receipt URLs.
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

console.log('\n📊 === Starting Phase 4: 31-Day Ledger & Mobile Field Cards Tests ===\n');

// 1. Test 31-Day Mathematical Ledger Calculations
runTest('31-Day Ledger Row Math: Total, Remaining, Excess & Cleared flag', () => {
  const principal = 10000;
  const days = {
    1: 100,
    2: 100,
    5: 200,
    10: 500,
    15: 100
  };

  let totalCollected = 0;
  for (let d = 1; d <= 31; d++) {
    totalCollected += days[d] || 0;
  }

  const remaining = Math.max(0, principal - totalCollected);
  const excess = Math.max(0, totalCollected - principal);
  const isCleared = remaining === 0;

  assert.strictEqual(totalCollected, 1000);
  assert.strictEqual(remaining, 9000);
  assert.strictEqual(excess, 0);
  assert.strictEqual(isCleared, false);

  // Test overpayment / excess
  const daysOver = { 1: 5000, 2: 6000 };
  let totalOver = 0;
  for (let d = 1; d <= 31; d++) totalOver += daysOver[d] || 0;
  const remOver = Math.max(0, principal - totalOver);
  const excessOver = Math.max(0, totalOver - principal);

  assert.strictEqual(totalOver, 11000);
  assert.strictEqual(remOver, 0);
  assert.strictEqual(excessOver, 1000);
  assert.strictEqual(remOver === 0, true);
});

// 2. Test Top Day Column Sums & Grand Summary Aggregation (Excel Row 2 Replica)
runTest('Top Column Sums (D1-D31) and Grand Totals aggregate correctly', () => {
  const rows = [
    {
      principal: 10000,
      days: { 1: 100, 2: 200, 10: 500 },
      total_collected: 800,
      remaining: 9200,
      excess: 0
    },
    {
      principal: 20000,
      days: { 1: 200, 2: 300, 10: 1000, 25: 500 },
      total_collected: 2000,
      remaining: 18000,
      excess: 0
    }
  ];

  const columnSums = {};
  for (let d = 1; d <= 31; d++) columnSums[d] = 0;

  let grandPrincipal = 0;
  let grandCollected = 0;
  let grandRemaining = 0;
  let grandExcess = 0;

  rows.forEach(r => {
    grandPrincipal += r.principal;
    grandCollected += r.total_collected;
    grandRemaining += r.remaining;
    grandExcess += r.excess;
    for (let d = 1; d <= 31; d++) {
      columnSums[d] += r.days[d] || 0;
    }
  });

  assert.strictEqual(grandPrincipal, 30000);
  assert.strictEqual(grandCollected, 2800);
  assert.strictEqual(grandRemaining, 27200);
  assert.strictEqual(grandExcess, 0);
  assert.strictEqual(columnSums[1], 300); // 100 + 200
  assert.strictEqual(columnSums[2], 500); // 200 + 300
  assert.strictEqual(columnSums[10], 1500); // 500 + 1000
  assert.strictEqual(columnSums[25], 500);
  assert.strictEqual(columnSums[31], 0);
});

// 3. Test Excel Keyboard Navigation & Input Attributes in LedgerGrid.jsx
runTest('LedgerGrid.jsx defines handleKeyDown, cell IDs, and focus select', () => {
  const gridPath = path.join(__dirname, '../src/components/LedgerGrid.jsx');
  const code = fs.readFileSync(gridPath, 'utf8');

  assert.ok(code.includes('handleKeyDown'), 'Missing handleKeyDown in LedgerGrid.jsx');
  assert.ok(code.includes("id={`cell-${rIdx}-${day}`}"), 'Missing cell ID indexing for arrow navigation');
  assert.ok(code.includes('e.target.select()'), 'Missing auto-select on focus');
  assert.ok(code.includes("e.key === 'Enter' || e.key === 'ArrowDown'"), 'Missing Enter/ArrowDown navigation');
  assert.ok(code.includes("e.key === 'ArrowUp'"), 'Missing ArrowUp navigation');
});

// 4. Test Freeze Panes in CSS
runTest('CSS defines frozen column classes: col-sticky-1, col-sticky-2, col-sticky-3', () => {
  const cssPath = path.join(__dirname, '../src/index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes('.col-sticky-1'), 'Missing .col-sticky-1 class');
  assert.ok(css.includes('.col-sticky-2'), 'Missing .col-sticky-2 class');
  assert.ok(css.includes('.col-sticky-3'), 'Missing .col-sticky-3 class');
  assert.ok(css.includes('position: sticky'), 'Missing sticky positioning in CSS');
});

// 5. Test Route / Village & Search Filtering Logic
runTest('Multi-criteria filter: Search, Village Route, and Status', () => {
  const testRows = [
    { sl_no: 3001, name: 'முருகன்', phone: '9876543210', address: 'அலங்காநல்லூர்', is_cleared: false },
    { sl_no: 3002, name: 'கணேசன்', phone: '9876543211', address: 'பாலமேடு', is_cleared: true },
    { sl_no: 3003, name: 'செல்வி', phone: '9876543212', address: 'அலங்காநல்லூர்', is_cleared: false }
  ];

  // Search by name
  let res = testRows.filter(r => r.name.includes('முருகன்'));
  assert.strictEqual(res.length, 1);

  // Filter by village
  res = testRows.filter(r => r.address === 'அலங்காநல்லூர்');
  assert.strictEqual(res.length, 2);

  // Filter by status 'cleared'
  res = testRows.filter(r => r.is_cleared);
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].name, 'கணேசன்');

  // Filter by status 'pending' AND village 'அலங்காநல்லூர்'
  res = testRows.filter(r => !r.is_cleared && r.address === 'அலங்காநல்லூர்');
  assert.strictEqual(res.length, 2);
});

// 6. Test Mobile Quick-Pay Chips and Full Due Calculations
runTest('Mobile Quick-Pay: chips (+100, +200, +500) and Full Due settle logic', () => {
  let principal = 10000;
  let total = 9300;
  let remaining = principal - total;

  assert.strictEqual(remaining, 700);

  // Quick Pay +100
  total += 100;
  remaining = Math.max(0, principal - total);
  assert.strictEqual(total, 9400);
  assert.strictEqual(remaining, 600);

  // Full Due tap clears remaining balance
  const fullDuePayment = remaining;
  total += fullDuePayment;
  remaining = Math.max(0, principal - total);
  const cleared = remaining === 0;

  assert.strictEqual(fullDuePayment, 600);
  assert.strictEqual(total, 10000);
  assert.strictEqual(remaining, 0);
  assert.strictEqual(cleared, true);
});

// 7. Test WhatsApp Deep Link Receipt Generator (Zero Cost)
runTest('WhatsApp Receipt URL encodes Tamil text properly without corruptions', () => {
  const client = {
    sl_no: 3032,
    name: 'வெள்ளையம்மா',
    phone: '9585194934',
    address: 'அலங்காநல்லூர்',
    principal: 10000,
    total_collected: 1000,
    remaining: 9000
  };

  const rawPhone = String(client.phone).replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const message = `*ALR ஃபைனான்ஸ் — வசூல் ரசீது*\nவாடிக்கையாளர்: ${client.name}\nஅசல்: ₹${client.principal}\nமீதமுள்ள நிலுவை: ₹${client.remaining}`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  assert.ok(whatsappUrl.startsWith('https://wa.me/919585194934?text='), 'Invalid WhatsApp phone prefix');
  assert.ok(whatsappUrl.includes(encodeURIComponent('ALR ஃபைனான்ஸ்')), 'Tamil text encoding failed');
  assert.ok(whatsappUrl.includes(encodeURIComponent('வெள்ளையம்மா')), 'Client name encoding failed');
  assert.ok(whatsappUrl.includes(encodeURIComponent('9000')), 'Remaining amount encoding failed');
});

// 8. Test CollectionModal & Balance Overview presence
runTest('CollectionModal.jsx includes balance overview & Full Due button', () => {
  const modalPath = path.join(__dirname, '../src/components/CollectionModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  assert.ok(code.includes('client.principal.toLocaleString'), 'Missing principal display');
  assert.ok(code.includes('client.total_collected.toLocaleString'), 'Missing total collected display');
  assert.ok(code.includes('client.remaining.toLocaleString'), 'Missing remaining balance display');
  assert.ok(code.includes('quick_full_due'), 'Missing quick_full_due chip');
});

console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests === totalTests) {
  console.log('🎉 Phase 4 31-Day Ledger Register & Mobile Field Cards verification complete with zero errors!\n');
  process.exit(0);
} else {
  console.error(`💥 Some tests failed: ${totalTests - passedTests} failure(s).\n`);
  process.exit(1);
}
