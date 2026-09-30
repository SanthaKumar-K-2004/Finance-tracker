import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { writeQueue } from './utils/writeQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isTurso = process.env.DATABASE_MODE === 'turso' && process.env.TURSO_DATABASE_URL;

// Ensure data directory exists for local DB and embedded replica
const dataDir = process.env.VERCEL ? path.resolve('/tmp', 'data') : path.resolve(__dirname, '../data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (_) {}


const replicaDbPath = path.resolve(dataDir, 'finance_replica.db');

const localDbFile = path.resolve(dataDir, 'finance.db');
const localConfig = {
  url: `file:${localDbFile}`
};

// On Vercel / serverless, Turso Cloud should use https:// for optimal fetch performance without WS overhead
const primaryUrl = isTurso
  ? (process.env.VERCEL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : process.env.TURSO_DATABASE_URL)
  : localConfig.url;

console.log(`🔌 Database Mode: ${isTurso ? 'Turso Cloud (Managed distributed DB with SWR In-Memory Engine)' : 'Local SQLite'}`);
if (isTurso) {
  console.log(`🌐 Turso Primary: ${primaryUrl}`);
} else {
  console.log(`📁 Local DB: ${localConfig.url}`);
}

const clientConfig = isTurso
  ? {
      url: primaryUrl,
      authToken: process.env.TURSO_AUTH_TOKEN
    }
  : localConfig;

const primaryClient = createClient(clientConfig);

// Fallback client is ONLY enabled for local offline environments where the local DB file actually exists
const hasLocalDb = !process.env.VERCEL && fs.existsSync(localDbFile);
const fallbackClient = (isTurso && hasLocalDb) ? createClient(localConfig) : null;

export const db = {
  async execute(stmt) {
    try {
      return await primaryClient.execute(stmt);
    } catch (err) {
      const isDnsOrNetwork = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('getaddrinfo') ||
        err.message.includes('EAI_AGAIN') ||
        err.code === 'EAI_AGAIN' ||
        err.message.includes('ENOTFOUND')
      );
      if (isTurso && isDnsOrNetwork && fallbackClient) {
        console.warn('⚠️ Turso Cloud connection failed (getaddrinfo/offline). Routing this query to Local SQLite (data/finance.db)...');
        return fallbackClient.execute(stmt);
      }
      throw err;
    }
  },
  async batch(stmts) {
    try {
      return await primaryClient.batch(stmts);
    } catch (err) {
      const isDnsOrNetwork = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('getaddrinfo') ||
        err.message.includes('EAI_AGAIN') ||
        err.code === 'EAI_AGAIN' ||
        err.message.includes('ENOTFOUND')
      );
      if (isTurso && isDnsOrNetwork && fallbackClient) {
        console.warn('⚠️ Turso Cloud batch failed (getaddrinfo/offline). Routing this batch to Local SQLite (data/finance.db)...');
        return fallbackClient.batch(stmts);
      }
      throw err;
    }
  }
};

const DB_TIMEOUT_MS = 6500;

function withTimeout(promise, ms = DB_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper for running SQL with params with automatic retry and object mapping
export async function query(sql, args = []) {
  const safeArgs = Array.isArray(args) ? args.map(a => a === undefined ? null : a) : args;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await withTimeout(db.execute({ sql, args: safeArgs }));
      const { columns, rows } = result;
      if (!columns || !rows) return [];
      return rows.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    } catch (err) {
      lastErr = err;
      const isTransient = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('getaddrinfo') ||
        err.message.includes('EAI_AGAIN') ||
        err.code === 'EAI_AGAIN' ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('timed out') ||
        err.message.includes('timeout') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('500') ||
        err.message.includes('503') ||
        err.message.includes('busy')
      );
      if (isTransient && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 150));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function execute(sql, args = []) {
  const safeArgs = Array.isArray(args) ? args.map(a => a === undefined ? null : a) : args;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await withTimeout(db.execute({ sql, args: safeArgs }));
    } catch (err) {
      lastErr = err;
      const isTransient = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('getaddrinfo') ||
        err.message.includes('EAI_AGAIN') ||
        err.code === 'EAI_AGAIN' ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('timed out') ||
        err.message.includes('timeout') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('500') ||
        err.message.includes('503') ||
        err.message.includes('busy')
      );
      if (isTransient && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 150));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function batch(statements) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await withTimeout(db.batch(statements), 10000);
    } catch (err) {
      lastErr = err;
      const isTransient = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('getaddrinfo') ||
        err.message.includes('EAI_AGAIN') ||
        err.code === 'EAI_AGAIN' ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('timed out') ||
        err.message.includes('timeout') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('500') ||
        err.message.includes('503') ||
        err.message.includes('busy')
      );
      if (isTransient && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 200));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Concurrency-Protected Write Execution
 * Queues write operations during high multi-user traffic spikes to eliminate SQLITE_BUSY lock contention
 */
export async function executeQueued(sql, args = [], priority = 0) {
  return writeQueue.enqueue(() => execute(sql, args), priority);
}

export async function batchQueued(statements, priority = 0) {
  return writeQueue.enqueue(() => batch(statements), priority);
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
    logo_url TEXT,
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

-- Performance & Query Optimization Indexes (High-Concurrency & Search-Engine Optimized)
CREATE INDEX IF NOT EXISTS idx_clients_company_sl ON clients(company_id, sl_no);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_comp_status ON clients(company_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_month ON loan_cycles(company_id, month_year);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_client ON loan_cycles(client_id);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_client_status ON loan_cycles(client_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_comp_status ON loan_cycles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_collections_date ON daily_collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_daily_collections_cycle ON daily_collections(cycle_id);
CREATE INDEX IF NOT EXISTS idx_daily_collections_cycle_day ON daily_collections(cycle_id, day_number);
CREATE INDEX IF NOT EXISTS idx_daily_collections_comp_date ON daily_collections(company_id, collection_date);
CREATE INDEX IF NOT EXISTS idx_closed_clients_comp ON closed_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_client ON whatsapp_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_logs(phone);
`;

export async function initSchema() {
  console.log('📦 Initializing database schema...');
  if (!isTurso) {
    try {
      await db.execute('PRAGMA journal_mode = WAL;');
      await db.execute('PRAGMA busy_timeout = 10000;');
      await db.execute('PRAGMA synchronous = NORMAL;');
      await db.execute('PRAGMA cache_size = -64000;');
      await db.execute('PRAGMA temp_store = MEMORY;');
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

  // Safe migration for logo_url column
  try {
    await db.execute('ALTER TABLE companies ADD COLUMN logo_url TEXT');
  } catch (e) {
    // Column already exists or newly created
  }

  console.log('✅ All tables verified & initialized successfully.');
}
