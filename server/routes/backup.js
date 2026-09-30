import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { query, execute, batch } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = Router();

const uploadDir = process.env.VERCEL ? path.resolve('/tmp', 'uploads') : path.resolve('data/uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (_) {}
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
    if (!backup || typeof backup !== 'object' || !backup.tables || typeof backup.tables !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid backup format: tables missing or malformed' });
    }

    const {
      companies = [],
      clients = [],
      loan_cycles = [],
      daily_collections = [],
      closed_clients = [],
      settings = [],
      settlements = [],
      whatsapp_logs = []
    } = backup.tables;

    if (!Array.isArray(companies) || !Array.isArray(clients) || !Array.isArray(loan_cycles) ||
        !Array.isArray(daily_collections) || !Array.isArray(closed_clients) || !Array.isArray(settings) ||
        !Array.isArray(settlements) || !Array.isArray(whatsapp_logs)) {
      return res.status(400).json({ success: false, error: 'Invalid backup format: table collections must be arrays' });
    }

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

// Master Security PIN required for permanent database clearance & server cache purge
const MASTER_SECURITY_PIN = '940494';

// POST clear all data & purge server cache (Double Verified with Master Security PIN 940494)
router.post('/clear-all-data', async (req, res) => {
  try {
    const { pin, confirmation } = req.body;

    // 1. Double verify confirmation token
    if (confirmation !== 'CONFIRM_CLEAR_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Double confirmation token required. Pass { confirmation: "CONFIRM_CLEAR_ALL_DATA" }'
      });
    }

    // 2. Master Security PIN verification (Must match 940494)
    if (!pin || String(pin).trim() !== MASTER_SECURITY_PIN) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Security PIN. Clearance denied (தவறான பாதுகாப்பு பின்). Master PIN is required.'
      });
    }

    // 3. Automated safety backup before destructive purge
    const companyId = 'comp_alr_001';
    try {
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
          reason: 'Automated safety snapshot prior to master data clearance',
          company_id: companyId
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

      const backupDir = process.env.VERCEL ? path.resolve('/tmp', 'data') : path.resolve('data');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const safetyBackupPath = path.resolve(backupDir, `finance_backup_${Date.now()}.json`);
      fs.writeFileSync(safetyBackupPath, JSON.stringify(backupData, null, 2));
    } catch (bErr) {
      console.warn('Safety backup warning prior to wipe:', bErr.message);
    }

    // 4. Child-first foreign-key deletions
    await execute('DELETE FROM daily_collections;');
    await execute('DELETE FROM loan_cycles;');
    await execute('DELETE FROM clients;');
    await execute('DELETE FROM closed_clients;');
    await execute('DELETE FROM settlements;');
    await execute('DELETE FROM whatsapp_logs;');

    // Clean test companies/lines/staff, preserving primary company comp_alr_001
    try {
      await execute("DELETE FROM staff_agents WHERE company_id != 'comp_alr_001';");
      await execute("DELETE FROM lines WHERE company_id != 'comp_alr_001';");
      await execute("DELETE FROM companies WHERE id != 'comp_alr_001';");
    } catch (_) {}

    // Ensure canonical primary company comp_alr_001 exists
    await execute(`
      INSERT OR IGNORE INTO companies (id, name, tagline, phone, address, default_language)
      VALUES ('comp_alr_001', 'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)', 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ் • அலங்காநல்லூர்', '9585194934', 'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)', 'ta')
    `);

    // 5. Server-side Clear Cache All: Invalidate all in-memory fast caches
    serverCache.clear();

    // 6. Synchronize local SQLite replica if in Turso Cloud mode
    try {
      if (process.env.DATABASE_MODE === 'turso' && process.env.TURSO_DATABASE_URL) {
        const { syncCloudToLocal } = await import('../syncLocalDb.js');
        await syncCloudToLocal();
      }
    } catch (syncErr) {
      console.warn('Local DB sync warning after data clearance:', syncErr.message);
    }

    res.json({
      success: true,
      message: 'All client records, loan cycles, collections, and server-side caches cleared successfully. Canonical company comp_alr_001 preserved.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST clean database slate (Legacy route protected with PIN 940494 or confirmation)
router.post('/clean-slate', async (req, res) => {
  try {
    const { confirmation, pin } = req.body;
    if (confirmation !== 'CONFIRM_CLEAN_SLATE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Pass { confirmation: "CONFIRM_CLEAN_SLATE" }'
      });
    }

    if (pin && String(pin).trim() !== MASTER_SECURITY_PIN) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Security PIN. Clearance denied.'
      });
    }

    // Execute child-first foreign-key deletions
    await execute('DELETE FROM daily_collections;');
    await execute('DELETE FROM loan_cycles;');
    await execute('DELETE FROM clients;');
    await execute('DELETE FROM closed_clients;');
    await execute('DELETE FROM settlements;');
    await execute('DELETE FROM whatsapp_logs;');

    // Invalidate all server caches
    serverCache.clear();

    res.json({
      success: true,
      message: 'All borrower records, loan cycles, collections, and archives successfully wiped. Database is now 100% fresh and production-ready.'
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
