import { query, SCHEMA_SQL } from './db.js';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function syncCloudToLocal() {
  const localDbPath = path.resolve(__dirname, '../data/finance.db');
  console.log(`\n🔄 Syncing Turso Cloud Database to Local SQLite: ${localDbPath}...`);

  // 1. Initialize local SQLite with schema
  const localDb = new DatabaseSync(localDbPath);
  localDb.exec('PRAGMA foreign_keys = ON;');
  localDb.exec('PRAGMA journal_mode = WAL;');

  // Run schema
  localDb.exec(SCHEMA_SQL);

  // 2. Fetch all tables from Turso
  const [companies, clients, cycles, collections, closed, settings, settlements] = await Promise.all([
    query('SELECT * FROM companies'),
    query('SELECT * FROM clients'),
    query('SELECT * FROM loan_cycles'),
    query('SELECT * FROM daily_collections'),
    query('SELECT * FROM closed_clients'),
    query('SELECT * FROM settings'),
    query('SELECT * FROM settlements')
  ]);

  console.log(`📥 Fetched from Turso: ${clients.length} clients, ${cycles.length} cycles, ${collections.length} collections.`);

  // 3. Upsert into local database
  // Companies
  for (const c of companies) {
    const stmt = localDb.prepare(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone`
    );
    stmt.run(c.id, c.name, c.tagline, c.phone, c.address, c.default_language);
  }

  // Clients
  for (const c of clients) {
    const stmt = localDb.prepare(
      `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address`
    );
    stmt.run(c.id, c.company_id, c.sl_no, c.client_code, c.name, c.phone, c.address, c.status);
  }

  // Cycles
  for (const c of cycles) {
    const stmt = localDb.prepare(
      `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status, close_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET principal = excluded.principal, status = excluded.status`
    );
    stmt.run(c.id, c.company_id, c.client_id, c.month_year, c.cycle_name, c.principal, c.start_date, c.end_date, c.total_days, c.status, c.close_date);
  }

  // Daily Collections
  for (const col of collections) {
    const stmt = localDb.prepare(
      `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount, payment_mode = excluded.payment_mode`
    );
    stmt.run(col.id, col.company_id, col.cycle_id, col.client_id, col.day_number, col.collection_date, col.amount, col.payment_mode, col.collected_by, col.notes);
  }

  // Closed
  for (const cl of closed) {
    const stmt = localDb.prepare(
      `INSERT INTO closed_clients (id, company_id, client_id, cycle_id, client_name, phone, final_principal, total_collected, excess_amount, closed_date, closure_reason, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    );
    stmt.run(cl.id, cl.company_id, cl.client_id, cl.cycle_id, cl.client_name, cl.phone, cl.final_principal, cl.total_collected, cl.excess_amount, cl.closed_date, cl.closure_reason, cl.snapshot_json);
  }

  // Settings
  for (const s of settings) {
    const stmt = localDb.prepare(
      `INSERT INTO settings (id, company_id, key, value)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value`
    );
    stmt.run(s.id, s.company_id, s.key, s.value);
  }

  // Settlements
  for (const st of settlements) {
    const stmt = localDb.prepare(
      `INSERT INTO settlements (id, company_id, settlement_date, agent_name, expected_amount, actual_amount, denomination_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    );
    stmt.run(st.id, st.company_id, st.settlement_date, st.agent_name, st.expected_amount, st.actual_amount, st.denomination_json, st.status);
  }

  localDb.close();
  const stats = fs.statSync(localDbPath);
  console.log(`✅ Local SQLite database synchronized successfully! File size: ${(stats.size / 1024).toFixed(1)} KB`);
  return stats.size;
}

// Allow CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncCloudToLocal().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
}
