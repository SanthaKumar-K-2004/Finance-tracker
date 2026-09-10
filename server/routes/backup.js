import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { query, execute, batch } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = Router();

const uploadDir = path.resolve('data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `db_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// GET database backup snapshot
router.get('/export', async (req, res) => {
  try {
    const companyId = 'comp_alr_001';

    const [companies, clients, loan_cycles, daily_collections, closed_clients, settings, settlements, whatsapp_logs] = await Promise.all([
      query('SELECT * FROM companies'),
      query("SELECT * FROM clients WHERE status != 'deleted'"),
      query('SELECT * FROM loan_cycles'),
      query('SELECT * FROM daily_collections'),
      query('SELECT * FROM closed_clients'),
      query('SELECT * FROM settings'),
      query('SELECT * FROM settlements'),
      query('SELECT * FROM whatsapp_logs')
    ]);

    const backupData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      database_mode: process.env.DATABASE_MODE || 'turso',
      metadata: {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        company_id: companyId,
        database_mode: process.env.DATABASE_MODE || 'turso'
      },
      tables: {
        companies,
        clients,
        loan_cycles,
        daily_collections,
        closed_clients,
        settings,
        settlements,
        whatsapp_logs
      }
    };

    const filename = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backupData);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore database from backup JSON file
router.post('/restore', async (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.tables) {
      return res.status(400).json({ success: false, error: 'Invalid backup format: tables missing' });
    }

    const { companies = [], clients = [], loan_cycles = [], daily_collections = [], closed_clients = [], settings = [], settlements = [], whatsapp_logs = [] } = backup.tables;

    const allStatements = [];

    // 1. Companies
    for (const c of companies) {
      allStatements.push({
        sql: `INSERT INTO companies (id, name, tagline, phone, address, default_language)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address`,
        args: [c.id, c.name, c.tagline, c.phone, c.address, c.default_language || 'ta']
      });
    }

    // 2. Settings
    for (const s of settings) {
      allStatements.push({
        sql: `INSERT INTO settings (id, company_id, key, value)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value`,
        args: [s.id || `set_${s.key}`, s.company_id || 'comp_alr_001', s.key, s.value]
      });
    }

    // 3. Clients
    for (const cl of clients) {
      allStatements.push({
        sql: `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address, status = excluded.status`,
        args: [cl.id, cl.company_id || 'comp_alr_001', cl.sl_no, cl.client_code, cl.name, cl.phone, cl.address, cl.status || 'active']
      });
    }

    // 4. Loan Cycles
    for (const lc of loan_cycles) {
      allStatements.push({
        sql: `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET principal = excluded.principal, status = excluded.status`,
        args: [lc.id, lc.company_id || 'comp_alr_001', lc.client_id, lc.month_year, lc.cycle_name, lc.principal, lc.start_date, lc.end_date, lc.total_days || 31, lc.status || 'active']
      });
    }

    // 5. Daily Collections
    for (const dc of daily_collections) {
      allStatements.push({
        sql: `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount, payment_mode = excluded.payment_mode`,
        args: [dc.id, dc.company_id || 'comp_alr_001', dc.cycle_id, dc.client_id, dc.day_number, dc.collection_date, dc.amount, dc.payment_mode || 'cash', dc.collected_by || 'Agent', dc.notes || '']
      });
    }

    // 6. Closed Clients
    for (const cc of closed_clients) {
      allStatements.push({
        sql: `INSERT INTO closed_clients (id, company_id, client_id, cycle_id, client_name, phone, final_principal, total_collected, excess_amount, closed_date, closure_reason, snapshot_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET closure_reason = excluded.closure_reason`,
        args: [cc.id, cc.company_id || 'comp_alr_001', cc.client_id, cc.cycle_id, cc.client_name, cc.phone, cc.final_principal, cc.total_collected, cc.excess_amount || 0, cc.closed_date, cc.closure_reason || 'completed', cc.snapshot_json]
      });
    }

    // 7. Settlements
    for (const st of settlements) {
      allStatements.push({
        sql: `INSERT INTO settlements (id, company_id, settlement_date, agent_name, expected_amount, actual_amount, denomination_json, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET actual_amount = excluded.actual_amount, status = excluded.status`,
        args: [st.id, st.company_id, st.settlement_date, st.agent_name, st.expected_amount, st.actual_amount, st.denomination_json, st.status || 'verified']
      });
    }

    // 8. WhatsApp Logs
    for (const wl of whatsapp_logs) {
      allStatements.push({
        sql: `INSERT INTO whatsapp_logs (id, company_id, client_id, phone, message_type, message_text, sent_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO NOTHING`,
        args: [wl.id, wl.company_id || 'comp_alr_001', wl.client_id, wl.phone, wl.message_type || 'collection_receipt', wl.message_text, wl.sent_at || new Date().toISOString()]
      });
    }

    // Execute in transaction chunks of 50 statements for 50x-100x performance
    for (let i = 0; i < allStatements.length; i += 50) {
      const chunk = allStatements.slice(i, i + 50);
      if (chunk.length > 0) {
        await batch(chunk);
      }
    }

    // Flush in-memory cache to guarantee fresh state
    serverCache.clear();

    res.json({
      success: true,
      message: 'Database backup restored successfully',
      restored: {
        companies: companies.length,
        clients: clients.length,
        loan_cycles: loan_cycles.length,
        daily_collections: daily_collections.length,
        closed_clients: closed_clients.length,
        settings: settings.length,
        settlements: settlements.length,
        whatsapp_logs: whatsapp_logs.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET database health & backup status
router.get('/status', async (req, res) => {
  try {
    const clients = await query("SELECT COUNT(id) as count FROM clients WHERE status != 'deleted'");
    const collections = await query('SELECT COUNT(id) as count FROM daily_collections');
    const cycles = await query('SELECT COUNT(id) as count FROM loan_cycles');

    res.json({
      success: true,
      status: 'online',
      mode: process.env.DATABASE_MODE || 'turso',
      database_url: process.env.TURSO_DATABASE_URL ? 'Connected to AWS Mumbai' : 'Local SQLite',
      stats: {
        total_clients: clients[0]?.count || 0,
        total_collections: collections[0]?.count || 0,
        total_cycles: cycles[0]?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET binary SQLite database snapshot (1-click finance.db download)
router.get('/download-db', async (req, res) => {
  try {
    const dbPath = path.resolve('data/finance.db');

    // Flush WAL into finance.db before downloading if local sqlite is used
    try {
      await execute('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (_) {
      // ignore if Turso remote
    }

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, error: 'Database file not found on server' });
    }

    const filename = `finance_snapshot_${new Date().toISOString().split('T')[0]}.db`;
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(dbPath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST restore binary finance.db file (1-click restore from .db file)
router.post('/restore-db', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No database file uploaded' });
    }

    const uploadedPath = req.file.path;
    const targetDbPath = path.resolve('data/finance.db');

    // Copy uploaded file to finance.db
    fs.copyFileSync(uploadedPath, targetDbPath);

    // Clean up uploaded file
    try { fs.unlinkSync(uploadedPath); } catch (_) {}

    res.json({
      success: true,
      message: 'Binary SQLite database file restored successfully. Server will use the restored finance.db snapshot.'
    });
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
