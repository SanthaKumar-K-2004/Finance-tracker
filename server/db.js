import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isTurso = process.env.DATABASE_MODE === 'turso' && process.env.TURSO_DATABASE_URL;

// Ensure data directory exists for local DB fallback
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const clientConfig = isTurso
  ? {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    }
  : {
      url: `file:${path.resolve(dataDir, 'finance.db')}`
    };

console.log(`🔌 Database Mode: ${isTurso ? 'Turso Cloud SQLite' : 'Local SQLite'}`);
if (isTurso) {
  console.log(`🌐 Turso URL: ${process.env.TURSO_DATABASE_URL}`);
} else {
  console.log(`📁 Local DB: ${clientConfig.url}`);
}

export const db = createClient(clientConfig);

// Helper for running SQL with params
export async function query(sql, args = []) {
  const safeArgs = Array.isArray(args) ? args.map(a => a === undefined ? null : a) : args;
  const result = await db.execute({ sql, args: safeArgs });
  // Map rows to clean JavaScript objects
  const { columns, rows } = result;
  if (!columns || !rows) return [];
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

export async function execute(sql, args = []) {
  const safeArgs = Array.isArray(args) ? args.map(a => a === undefined ? null : a) : args;
  return await db.execute({ sql, args: safeArgs });
}

export async function batch(statements) {
  return await db.batch(statements);
}

// Database Schema DDL
export const SCHEMA_SQL = `
-- 1. Companies (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    phone TEXT,
    address TEXT,
    default_language TEXT DEFAULT 'ta',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients (Borrowers)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    sl_no INTEGER,
    client_code TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'defaulter'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- 3. Loan Cycles (Monthly / Multi-Day Loan Terms)
CREATE TABLE IF NOT EXISTS loan_cycles (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    month_year TEXT NOT NULL,        -- e.g. '2026-05'
    cycle_name TEXT NOT NULL,        -- e.g. 'May 2026'
    principal REAL NOT NULL,         -- அசல் தொகை
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER DEFAULT 31,
    status TEXT DEFAULT 'active',    -- 'active', 'closed', 'rolled_over'
    close_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 4. Daily Collections (Individual Daily Installment Payments)
CREATE TABLE IF NOT EXISTS daily_collections (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,     -- 1 to 31
    collection_date DATE NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_mode TEXT DEFAULT 'cash',-- 'cash', 'gpay', 'upi', 'bank'
    collected_by TEXT DEFAULT 'Agent',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_id, day_number),
    FOREIGN KEY (cycle_id) REFERENCES loan_cycles(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 5. Closed Clients Archive (Permanent Historical Records)
CREATE TABLE IF NOT EXISTS closed_clients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    final_principal REAL NOT NULL,
    total_collected REAL NOT NULL,
    excess_amount REAL DEFAULT 0,
    closed_date DATE NOT NULL,
    closure_reason TEXT DEFAULT 'completed', -- 'completed', 'settled', 'written_off'
    snapshot_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Settings (Shop Profile, Denominations, Theme)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(company_id, key)
);

-- 7. Agent Settlements (Cash Handover Slips)
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    settlement_date DATE NOT NULL,
    agent_name TEXT NOT NULL,
    expected_amount REAL NOT NULL,
    actual_amount REAL NOT NULL,
    denomination_json TEXT,
    status TEXT DEFAULT 'verified',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. WhatsApp Message Audit Logs (Zero-Cost WhatsApp Dispatch History)
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_alr_001',
    client_id TEXT,
    phone TEXT,
    message_type TEXT DEFAULT 'collection_receipt', -- 'collection_receipt', 'loan_slip', 'reminder'
    message_text TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_sl ON clients(company_id, sl_no);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_month ON loan_cycles(company_id, month_year);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_client ON loan_cycles(client_id);
CREATE INDEX IF NOT EXISTS idx_daily_collections_date ON daily_collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_daily_collections_cycle ON daily_collections(cycle_id);
CREATE INDEX IF NOT EXISTS idx_closed_clients_comp ON closed_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_client ON whatsapp_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_logs(phone);
`;

export async function initSchema() {
  console.log('📦 Initializing database schema...');
  if (!isTurso) {
    try {
      await db.execute('PRAGMA journal_mode = WAL;');
      await db.execute('PRAGMA busy_timeout = 5000;');
      await db.execute('PRAGMA synchronous = NORMAL;');
    } catch (e) {
      // Ignored for cloud/unsupported drivers
    }
  }
  const statements = SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(sql => ({ sql, args: [] }));

  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (err) {
      console.error('Schema statement error:', err.message, stmt.sql);
      throw err;
    }
  }
  console.log('✅ All tables verified & initialized successfully.');
}
