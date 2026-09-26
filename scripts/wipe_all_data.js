import { execute, query } from '../server/db.js';
import { syncCloudToLocal } from '../server/syncLocalDb.js';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wipeAllData() {
  console.log('🧹 [WIPE] Starting clean wipe of all borrower data and records across Turso Cloud & Local DB...');

  // 1. Check current counts
  const beforeClients = await query('SELECT COUNT(*) as c FROM clients');
  const beforeCycles = await query('SELECT COUNT(*) as c FROM loan_cycles');
  const beforeColls = await query('SELECT COUNT(*) as c FROM daily_collections');
  console.log(`📊 Current Counts -> Clients: ${beforeClients[0]?.c}, Cycles: ${beforeCycles[0]?.c}, Collections: ${beforeColls[0]?.c}`);

  // 2. Child-first deletions on Turso Cloud
  console.log('🗑️ Deleting collections...');
  await execute('DELETE FROM daily_collections;');

  console.log('🗑️ Deleting loan cycles...');
  await execute('DELETE FROM loan_cycles;');

  console.log('🗑️ Deleting clients...');
  await execute('DELETE FROM clients;');

  console.log('🗑️ Deleting closed clients archive...');
  await execute('DELETE FROM closed_clients;');

  console.log('🗑️ Deleting settlements...');
  await execute('DELETE FROM settlements;');

  console.log('🗑️ Deleting whatsapp logs...');
  await execute('DELETE FROM whatsapp_logs;');

  // Clean company table to just the main primary company comp_alr_001
  console.log('🏢 Ensuring single clean company profile (comp_alr_001)...');
  await execute("DELETE FROM companies WHERE id != 'comp_alr_001';");
  await execute(`
    INSERT INTO companies (id, name, tagline, phone, address, default_language)
    VALUES ('comp_alr_001', 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)', 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்', '9585194934', 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)', 'ta')
    ON CONFLICT(id) DO UPDATE SET
      name = 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
      tagline = 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்',
      phone = '9585194934',
      address = 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
      default_language = 'ta'
  `);

  // 3. Verify Turso counts
  const afterClients = await query('SELECT COUNT(*) as c FROM clients');
  const afterCycles = await query('SELECT COUNT(*) as c FROM loan_cycles');
  const afterColls = await query('SELECT COUNT(*) as c FROM daily_collections');
  console.log(`✨ Turso Cloud Cleared -> Clients: ${afterClients[0]?.c}, Cycles: ${afterCycles[0]?.c}, Collections: ${afterColls[0]?.c}`);

  // 4. Wipe local SQLite DB (data/finance.db) as well
  const localDbPath = path.resolve(__dirname, '../data/finance.db');
  console.log(`🗄️ Wiping local SQLite at ${localDbPath}...`);
  const localDb = new DatabaseSync(localDbPath);
  localDb.exec('DELETE FROM daily_collections;');
  localDb.exec('DELETE FROM loan_cycles;');
  localDb.exec('DELETE FROM clients;');
  localDb.exec('DELETE FROM closed_clients;');
  localDb.exec('DELETE FROM settlements;');
  localDb.exec('DELETE FROM whatsapp_logs;');
  localDb.exec("DELETE FROM companies WHERE id != 'comp_alr_001';");
  localDb.close();

  // 5. Run full sync to ensure local is in 100% lockstep
  await syncCloudToLocal();

  console.log('🎉 Production clean wipe completed successfully! Database is fresh, empty, and ready for live use.');
}

wipeAllData().catch(err => {
  console.error('❌ Error during wipe:', err);
  process.exit(1);
});
