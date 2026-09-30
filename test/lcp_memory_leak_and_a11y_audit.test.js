import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('1. LCP & Core Web Vitals Audit', () => {
  test('index.html contains optimized theme-color and non-blocking font links', () => {
    const htmlPath = path.join(rootDir, 'index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(content.includes('theme-color" content="#0F766E"'), 'Theme color should match primary brand color #0F766E');
    assert.ok(content.includes('rel="preconnect" href="https://fonts.googleapis.com"'), 'Google Fonts preconnect should exist');
    assert.ok(content.includes('rel="preconnect" href="https://fonts.gstatic.com" crossorigin'), 'Gstatic preconnect with crossorigin should exist');
    assert.ok(content.includes('display=swap'), 'Font stylesheet link should include display=swap to avoid FOUT');
    assert.ok(!content.includes("media='print' onload="), 'Avoid deferred print onload tricks that delay font stylesheet application');
  });

  test('Layout.jsx logo image has explicit dimensions and priority loading attributes', () => {
    const layoutPath = path.join(rootDir, 'src', 'components', 'Layout.jsx');
    const content = fs.readFileSync(layoutPath, 'utf8');

    assert.ok(content.includes('width="44"'), 'Brand logo img must have explicit width="44" to prevent CLS');
    assert.ok(content.includes('height="44"'), 'Brand logo img must have explicit height="44" to prevent CLS');
    assert.ok(content.includes('loading="eager"'), 'Brand logo img should have loading="eager"');
    assert.ok(content.includes('fetchpriority="high"'), 'Brand logo img should have fetchpriority="high" for fast LCP');
  });
});

describe('2. Memory Leak Debugging & Cleanup Audit', () => {
  test('all intervals and timeouts in key frontend components have cleanup routines', () => {
    // Network status
    const networkPath = path.join(rootDir, 'src', 'hooks', 'useNetworkStatus.js');
    const networkContent = fs.readFileSync(networkPath, 'utf8');
    assert.ok(networkContent.includes('clearInterval(interval)'), 'useNetworkStatus must clear its heartbeat interval');
    assert.ok(networkContent.includes('window.removeEventListener(\'online\''), 'useNetworkStatus must remove online listener');
    assert.ok(networkContent.includes('window.removeEventListener(\'offline\''), 'useNetworkStatus must remove offline listener');

    // Dashboard
    const dashboardPath = path.join(rootDir, 'src', 'pages', 'Dashboard.jsx');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    assert.ok(dashboardContent.includes('clearInterval(timer)'), 'Dashboard must clear auto-refresh interval');
    assert.ok(dashboardContent.includes('document.visibilityState !== \'visible\''), 'Dashboard timer should throttle when tab is hidden');

    // ThemeContext
    const themePath = path.join(rootDir, 'src', 'context', 'ThemeContext.jsx');
    const themeContent = fs.readFileSync(themePath, 'utf8');
    assert.ok(themeContent.includes('clearInterval(interval)'), 'ThemeContext must clear auto-theme interval');

    // CollectionPage
    const collectionPath = path.join(rootDir, 'src', 'pages', 'CollectionPage.jsx');
    const collectionContent = fs.readFileSync(collectionPath, 'utf8');
    assert.ok(collectionContent.includes('clearInterval(undoTimerRef.current)'), 'CollectionPage must clear undo timer on unmount');

    // ReceiptModal safe timeouts
    const receiptPath = path.join(rootDir, 'src', 'components', 'ReceiptModal.jsx');
    const receiptContent = fs.readFileSync(receiptPath, 'utf8');
    assert.ok(receiptContent.includes('timersRef.current.forEach(t => clearTimeout(t))'), 'ReceiptModal must clear pending timeouts on unmount');

    // CashDenominationModal timeout cleanup
    const cashPath = path.join(rootDir, 'src', 'components', 'CashDenominationModal.jsx');
    const cashContent = fs.readFileSync(cashPath, 'utf8');
    assert.ok(cashContent.includes('if (closeTimerRef.current) clearTimeout(closeTimerRef.current)'), 'CashDenominationModal must clear auto-close timeout on unmount');
  });

  test('backend server caches and stores have automatic expiration and unref timers', () => {
    // serverCache
    const cachePath = path.join(rootDir, 'server', 'utils', 'cache.js');
    const cacheContent = fs.readFileSync(cachePath, 'utf8');
    assert.ok(cacheContent.includes('this.sweepInterval.unref()'), 'Cache sweep interval must be unref\'d');
    assert.ok(cacheContent.includes('sweepExpired()'), 'Cache must have sweepExpired function');

    // rateLimiter
    const secPath = path.join(rootDir, 'server', 'middleware', 'security.js');
    const secContent = fs.readFileSync(secPath, 'utf8');
    assert.ok(secContent.includes('pruneTimer.unref()'), 'Rate limiter prune timer must be unref\'d');

    // idempotencyStore
    const idempPath = path.join(rootDir, 'server', 'middleware', 'idempotency.js');
    const idempContent = fs.readFileSync(idempPath, 'utf8');
    assert.ok(idempContent.includes('this.pruneTimer.unref()'), 'Idempotency prune timer must be unref\'d');
  });
});

describe('3. Accessibility (a11y) & Keyboard Trapping Audit', () => {
  test('all 8 modal dialogs implement role="dialog" or aria-modal="true"', () => {
    const modals = [
      { file: 'src/components/ReceiptModal.jsx', name: 'ReceiptModal' },
      { file: 'src/components/SpotlightSearchModal.jsx', name: 'SpotlightSearchModal' },
      { file: 'src/components/CashDenominationModal.jsx', name: 'CashDenominationModal' },
      { file: 'src/components/ClientFormModal.jsx', name: 'ClientFormModal' },
      { file: 'src/components/CollectionModal.jsx', name: 'CollectionModal' },
      { file: 'src/components/BulkEntryModal.jsx', name: 'BulkEntryModal' },
      { file: 'src/components/RolloverWizard.jsx', name: 'RolloverWizard' },
      { file: 'src/components/Layout.jsx', name: 'MobileMoreSheet' }
    ];

    for (const m of modals) {
      const p = path.join(rootDir, m.file);
      const c = fs.readFileSync(p, 'utf8');
      assert.ok(c.includes('role="dialog"'), `${m.name} must declare role="dialog"`);
      assert.ok(c.includes('aria-modal="true"'), `${m.name} must declare aria-modal="true"`);
    }
  });

  test('all modal dialogs support closing via Escape key', () => {
    const modalsWithEsc = [
      'src/components/ReceiptModal.jsx',
      'src/components/SpotlightSearchModal.jsx',
      'src/components/CashDenominationModal.jsx',
      'src/components/ClientFormModal.jsx',
      'src/components/CollectionModal.jsx',
      'src/components/BulkEntryModal.jsx',
      'src/components/RolloverWizard.jsx',
      'src/components/Layout.jsx'
    ];

    for (const relPath of modalsWithEsc) {
      const p = path.join(rootDir, relPath);
      const c = fs.readFileSync(p, 'utf8');
      assert.ok(c.includes("'Escape'"), `${relPath} must handle 'Escape' key to close`);
    }
  });

  test('form inputs in SettingsPage and modals have associated labels or aria-label', () => {
    const settingsPath = path.join(rootDir, 'src', 'pages', 'SettingsPage.jsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    assert.ok(settingsContent.includes('htmlFor="settings-pref-lang"'), 'Language selector must have htmlFor association');
    assert.ok(settingsContent.includes('id="settings-pref-lang"'), 'Language selector must have matching id');
    assert.ok(settingsContent.includes('htmlFor="settings-pref-theme"'), 'Theme selector must have htmlFor association');
    assert.ok(settingsContent.includes('id="settings-pref-theme"'), 'Theme selector must have matching id');

    const bulkPath = path.join(rootDir, 'src', 'components', 'BulkEntryModal.jsx');
    const bulkContent = fs.readFileSync(bulkPath, 'utf8');
    assert.ok(bulkContent.includes('htmlFor="bulk-day-select"'), 'Bulk day selector must have htmlFor association');
    assert.ok(bulkContent.includes('htmlFor="bulk-amount-input"'), 'Bulk amount input must have htmlFor association');
  });

  test('interactive touch targets meet mobile size guidelines', () => {
    const cssPath = path.join(rootDir, 'src', 'index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.btn-icon'), '.btn-icon class exists in CSS');
    assert.ok(cssContent.includes('min-height: 48px;'), 'Mobile nav items must have min-height: 48px');
    assert.ok(cssContent.includes('touch-action: manipulation;'), '.btn-icon must have touch-action: manipulation');
  });
});
