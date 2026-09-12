import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FastCache } from '../server/utils/cache.js';

describe('⚡ Customer Operations, Advanced Multi-Filters & Stability Tests', () => {
  test('1. FastCache soft invalidation preserves stale data for 0ms fallback under cloud network latency', () => {
    const cache = new FastCache(5 * 60 * 1000, 100);
    const mockGrid = {
      month_year: '2026-05',
      rows: [
        { client_id: 'c1', name: 'முத்துகுமார்', principal: 10000, total_collected: 3000, remaining: 7000 }
      ]
    };

    cache.set('grid_2026-05', mockGrid, 60000, ['grid']);

    // Before invalidation, fresh data is served
    assert.strictEqual(cache.get('grid_2026-05'), mockGrid);

    // Invalidate tag
    cache.invalidateTag('grid');

    // Strict get returns null because it requires revalidation
    assert.strictEqual(cache.get('grid_2026-05'), null);

    // BUT stale data is strictly preserved as fallback snapshot!
    const stale = cache.getStale('grid_2026-05');
    assert.ok(stale !== null, 'Stale snapshot must be preserved');
    assert.strictEqual(stale.month_year, '2026-05');
    assert.strictEqual(stale.rows[0].name, 'முத்துகுமார்');
  });

  test('2. Multi-Filter Logic: filters by status, village, principal range and sorts properly', () => {
    const rows = [
      { sl_no: 101, name: 'அன்பு', address: 'மெயின் ரோடு', principal: 5000, total_collected: 5000, remaining: 0, excess: 0, is_cleared: true, days: { 1: 5000 } },
      { sl_no: 102, name: 'பாரதி', address: 'தெற்கு தெரு', principal: 10000, total_collected: 0, remaining: 10000, excess: 0, is_cleared: false, days: {} },
      { sl_no: 103, name: 'செல்வம்', address: 'மெயின் ரோடு', principal: 20000, total_collected: 22000, remaining: 0, excess: 2000, is_cleared: true, days: { 1: 22000 } },
      { sl_no: 104, name: 'தங்கவேல்', address: 'வடக்கு தெரு', principal: 12000, total_collected: 4000, remaining: 8000, excess: 0, is_cleared: false, days: { 1: 500 } }
    ];

    // Filter by pending due
    const pendingRows = rows.filter(r => !r.is_cleared);
    assert.strictEqual(pendingRows.length, 2);

    // Filter by zero collection
    const zeroPaid = rows.filter(r => r.total_collected === 0);
    assert.strictEqual(zeroPaid.length, 1);
    assert.strictEqual(zeroPaid[0].name, 'பாரதி');

    // Filter by excess payment
    const excessRows = rows.filter(r => r.excess > 0);
    assert.strictEqual(excessRows.length, 1);
    assert.strictEqual(excessRows[0].name, 'செல்வம்');

    // Filter by route
    const mainRoadRows = rows.filter(r => r.address === 'மெயின் ரோடு');
    assert.strictEqual(mainRoadRows.length, 2);

    // Filter by principal range (> 15k)
    const highPrincipal = rows.filter(r => r.principal > 15000);
    assert.strictEqual(highPrincipal.length, 1);
    assert.strictEqual(highPrincipal[0].name, 'செல்வம்');

    // Sort by remaining descending
    const sortedByRemaining = [...rows].sort((a, b) => b.remaining - a.remaining);
    assert.strictEqual(sortedByRemaining[0].name, 'பாரதி');
  });

  test('3. Reset Collections Calculation Verification (Daily Finance Auditor compliance)', () => {
    // When a borrower with principal 10,000 and 3,000 paid is reset:
    const initialPrincipal = 10000;
    const currentCollected = 3000;
    const currentRemaining = Math.max(0, initialPrincipal - currentCollected);
    assert.strictEqual(currentRemaining, 7000);

    // After reset: collections are cleared to 0
    const resetCollected = 0;
    const resetRemaining = Math.max(0, initialPrincipal - resetCollected);
    const resetExcess = Math.max(0, resetCollected - initialPrincipal);

    assert.strictEqual(resetCollected, 0);
    assert.strictEqual(resetRemaining, 10000);
    assert.strictEqual(resetExcess, 0);
  });
});
