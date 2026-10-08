import { spawn, spawnSync } from 'child_process';
import http from 'http';
import app from '../server/app.js';

const testSuites = [
  ['test/phase0.test.js'],
  ['test/phase1.test.js'],
  ['test/phase2.test.js'],
  ['test/phase3.test.js'],
  ['test/phase4.test.js'],
  ['test/phase5.test.js'],
  ['test/core_features_integration.test.js'],
  ['test/features_treasure.test.js'],
  ['test/phase6_excel_architecture.test.js'],
  ['test/phase6.test.js'],
  ['--test', 'test/dynamic_month_days.test.js'],
  ['--test', 'test/performance_and_fixes.test.js'],
  ['--test', 'test/click_edit_and_scale.test.js'],
  ['--test', 'test/error_boundary_and_rollover_speed.test.js'],
  ['--test', 'test/receipt_tenure_and_quick_add.test.js'],
  ['--test', 'test/security_and_performance.test.js'],
  ['--test', 'test/customer_crud_and_filters.test.js'],
  ['--test', 'test/company_profile_crud.test.js'],
  ['--test', 'test/production_readiness_audit.test.js'],
  ['--test', 'test/header_and_logo_upload.test.js'],
  ['--test', 'test/dashboard_realtime_analytics.test.js'],
  ['--test', 'test/receipt_thavanai_and_current_pay.test.js'],
  ['--test', 'test/concurrency_search_and_bigquery.test.js'],
  ['--test', 'test/current_month_and_data_cleanup.test.js'],
  ['--test', 'test/clear_all_data_and_duplicate_prevention.test.js'],
  ['--test', 'test/advanced_export_and_sl_range.test.js'],
  ['--test', 'test/enterprise_readiness_audit.test.js'],
  ['--test', 'test/client_excel_test_validation.test.js'],
  ['--test', 'test/duplicate_and_area_village_preview.test.js'],
  ['--test', 'test/universal_excel_import_engine.test.js'],
  ['--test', 'test/demo_excel_import_20_clients.test.js'],
  ['test/export_and_pdf_features.test.js']
];

async function isServerRunning() {
  try {
    const res = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(600) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🧪 ALR Finance Suite: Automated Verification Engine');
  console.log('==================================================');

  let serverProcess = null;
  const running = await isServerRunning();

  if (!running) {
    console.log('🚀 Spawning background test server on port 5000...');
    serverProcess = spawn('node', ['server/index.js'], {
      stdio: 'ignore',
      env: { ...process.env, PORT: '5000', NODE_ENV: 'test' }
    });
    for (let attempts = 0; attempts < 40; attempts++) {
      await new Promise(r => setTimeout(r, 250));
      if (await isServerRunning()) break;
    }
    console.log('✅ Background test server active on http://localhost:5000');
  } else {
    console.log('🔗 Attaching to active server on http://localhost:5000');
  }

  let failedSuites = 0;

  try {
    for (let i = 0; i < testSuites.length; i++) {
      const args = testSuites[i];
      const suiteName = args[args.length - 1];
      console.log(`\n▶ [${i + 1}/${testSuites.length}] Running: ${suiteName}...`);
      
      const res = spawnSync('node', args, {
        stdio: 'inherit',
        env: { ...process.env, PORT: '5000', NODE_ENV: 'test' }
      });

      if (res.status !== 0) {
        console.error(`❌ Suite failed with exit code ${res.status}: ${suiteName}`);
        failedSuites++;
        break;
      }
    }
  } finally {
    if (serverProcess) {
      console.log('\n🛑 Shutting down background test server...');
      serverProcess.kill('SIGTERM');
      console.log('✅ Background test server shut down cleanly.');
    }
  }

  console.log('\n==================================================');
  if (failedSuites === 0) {
    console.log(`🎉 ALL ${testSuites.length} TEST SUITES PASSED FLAWLESSLY!`);
    console.log('==================================================');
    process.exit(0);
  } else {
    console.error(`💥 ${failedSuites} test suite(s) encountered errors.`);
    console.log('==================================================');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
