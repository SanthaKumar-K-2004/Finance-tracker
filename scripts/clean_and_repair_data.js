/**
 * ALR Finance — Clean Database Script
 * Safely cleans all client, cycle, collection, and test company data in both Turso Cloud and Local SQLite.
 * Preserves the canonical company 'comp_alr_001' and default settings.
 */

import { query, execute, initSchema } from '../server/db.js';
import { serverCache } from '../server/utils/cache.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanData() {
  console.log('🧹 Starting Database Clean & Purge Operation...');

  await initSchema();

  // 1. Create a safety backup of existing state
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      companies: await query('SELECT * FROM companies'),
      clients: await query('SELECT * FROM clients'),
      loan_cycles: await query('SELECT * FROM loan_cycles'),
      daily_collections: await query('SELECT * FROM daily_collections'),
      closed_clients: await query('SELECT * FROM closed_clients'),
      settings: await query('SELECT * FROM settings')
    };
    const backupPath = path.resolve(__dirname, `../data/finance_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`💾 Safety backup created at: ${backupPath}`);
  } catch (backupErr) {
    console.warn('⚠️ Backup notice:', backupErr.message);
  }

  // 2. Delete all collections, cycles, closed clients, settlements, whatsapp logs
  console.log('🗑️ Purging collections, loan cycles, and client data...');
  await execute('DELETE FROM daily_collections');
  await execute('DELETE FROM loan_cycles');
  await execute('DELETE FROM closed_clients');
  await execute('DELETE FROM clients');
  try { await execute('DELETE FROM settlements'); } catch (_) {}
  try { await execute('DELETE FROM whatsapp_logs'); } catch (_) {}
  try { await execute("DELETE FROM staff_agents WHERE company_id != 'comp_alr_001'"); } catch (_) {}
  try { await execute("DELETE FROM lines WHERE company_id != 'comp_alr_001'"); } catch (_) {}

  // 3. Delete all test companies created by tests
  console.log('🏢 Purging test companies...');
  await execute("DELETE FROM companies WHERE id != 'comp_alr_001'");

  // 4. Ensure primary company 'comp_alr_001' exists with clean default state
  const existingCompany = await query("SELECT id FROM companies WHERE id = 'comp_alr_001'");
  if (existingCompany.length === 0) {
    await execute(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'comp_alr_001',
        'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
        'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்',
        '9585194934',
        'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
        'ta'
      ]
    );
    console.log('🏢 Primary company comp_alr_001 created');
  } else {
    console.log('🏢 Primary company comp_alr_001 verified and preserved');
  }

  // 5. Default Settings
  const settingsList = [
    ['set_1', 'comp_alr_001', 'default_cycle_days', '31'],
    ['set_2', 'comp_alr_001', 'currency_symbol', '₹'],
    ['set_3', 'comp_alr_001', 'theme', 'auto']
  ];
  for (const s of settingsList) {
    await execute(
      'INSERT OR REPLACE INTO settings (id, company_id, key, value) VALUES (?, ?, ?, ?)',
      s
    );
  }

  // 6. Clear all server-side cache
  serverCache.clear();
  console.log('⚡ Server cache cleared.');

  // 7. Verify clean slate
  const [clientCount, cycleCount, collCount, compCount] = await Promise.all([
    query('SELECT COUNT(*) as count FROM clients'),
    query('SELECT COUNT(*) as count FROM loan_cycles'),
    query('SELECT COUNT(*) as count FROM daily_collections'),
    query('SELECT COUNT(*) as count FROM companies')
  ]);

  console.log('\n📊 Database Status After Cleaning:');
  console.log(`   Companies: ${compCount[0].count} (comp_alr_001 only)`);
  console.log(`   Clients:   ${clientCount[0].count}`);
  console.log(`   Cycles:    ${cycleCount[0].count}`);
  console.log(`   Collections: ${collCount[0].count}`);
  console.log('\n✨ Database is now completely clean and ready for current month operations!');
}

cleanData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Clean operation failed:', err);
    process.exit(1);
  });
