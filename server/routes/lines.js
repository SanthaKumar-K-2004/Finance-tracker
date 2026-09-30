import { Router } from 'express';
import { query, executeQueued } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';

const router = Router();

// Helper to resolve active company ID
function getCompanyId(req) {
  return req.headers['x-company-id'] || req.query.company_id || req.body.company_id || 'comp_alr_001';
}

// 1. GET /api/lines - List all active lines for company
router.get('/', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await query(
      `SELECT id, company_id, line_number, name, code, agent_name, agent_phone, collection_time, is_active, created_at,
              (SELECT COUNT(*) FROM clients WHERE line_id = lines.id AND status != 'deleted') as client_count
       FROM lines 
       WHERE company_id = ? AND is_active = 1
       ORDER BY line_number ASC`,
      [companyId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[LINES] Error fetching lines:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/lines - Create a new line/route
router.post('/', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, code, agent_name, agent_phone, collection_time = 'morning', line_number } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Line name is required' });
    }

    // Determine line number if not specified
    let finalLineNumber = parseInt(line_number, 10);
    if (isNaN(finalLineNumber) || finalLineNumber <= 0) {
      const maxRows = await query('SELECT MAX(line_number) as max_num FROM lines WHERE company_id = ?', [companyId]);
      finalLineNumber = (maxRows[0]?.max_num || 0) + 1;
    }

    const id = `line_${companyId}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanCode = code ? code.trim() : `L${finalLineNumber}`;

    await executeQueued(
      `INSERT INTO lines (id, company_id, line_number, name, code, agent_name, agent_phone, collection_time, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, companyId, finalLineNumber, name.trim(), cleanCode, agent_name || 'Agent', agent_phone || null, collection_time]
    );

    serverCache.clearTag('lines');

    const created = await query('SELECT * FROM lines WHERE id = ?', [id]);
    res.json({ success: true, data: created[0] });
  } catch (err) {
    console.error('[LINES] Error creating line:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PUT /api/lines/:id - Update line details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    const { name, code, agent_name, agent_phone, collection_time, line_number, is_active } = req.body;

    const existing = await query('SELECT id FROM lines WHERE id = ? AND company_id = ?', [id, companyId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Line not found' });
    }

    await executeQueued(
      `UPDATE lines 
       SET name = COALESCE(?, name),
           code = COALESCE(?, code),
           agent_name = COALESCE(?, agent_name),
           agent_phone = COALESCE(?, agent_phone),
           collection_time = COALESCE(?, collection_time),
           line_number = COALESCE(?, line_number),
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND company_id = ?`,
      [name, code, agent_name, agent_phone, collection_time, line_number, is_active, id, companyId]
    );

    serverCache.clearTag('lines');
    const updated = await query('SELECT * FROM lines WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('[LINES] Error updating line:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE /api/lines/:id - Soft-delete or deactivate line
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    // Unassign clients belonging to this line first
    await executeQueued('UPDATE clients SET line_id = NULL WHERE line_id = ? AND company_id = ?', [id, companyId]);
    await executeQueued('UPDATE lines SET is_active = 0 WHERE id = ? AND company_id = ?', [id, companyId]);

    serverCache.clearTag('lines');
    res.json({ success: true, message: 'Line deactivated successfully' });
  } catch (err) {
    console.error('[LINES] Error deleting line:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/lines/stats - Real-time collection metrics per line
router.get('/stats', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const monthYear = req.query.month_year || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const day = parseInt(req.query.day || new Date().getDate(), 10);

    const lines = await query(
      'SELECT id, line_number, name, code, agent_name FROM lines WHERE company_id = ? AND is_active = 1 ORDER BY line_number ASC',
      [companyId]
    );

    const stats = await Promise.all(
      lines.map(async (l) => {
        // Fetch borrowers for line
        const clients = await query(
          `SELECT c.id, lc.id as cycle_id, lc.principal
           FROM clients c
           JOIN loan_cycles lc ON lc.client_id = c.id AND lc.month_year = ? AND lc.status != 'archived'
           WHERE c.company_id = ? AND c.line_id = ? AND c.status != 'deleted'`,
          [monthYear, companyId, l.id]
        );

        const cycleIds = clients.map(c => c.cycle_id);
        let collectedToday = 0;
        let cashToday = 0;
        let gpayToday = 0;
        let paidCount = 0;

        if (cycleIds.length > 0) {
          const placeholders = cycleIds.map(() => '?').join(',');
          const dayCols = await query(
            `SELECT amount, payment_mode FROM daily_collections 
             WHERE cycle_id IN (${placeholders}) AND day_number = ?`,
            [...cycleIds, day]
          );

          dayCols.forEach(col => {
            const amt = col.amount || 0;
            if (amt > 0) {
              collectedToday += amt;
              paidCount++;
              if (col.payment_mode === 'gpay' || col.payment_mode === 'upi' || col.payment_mode === 'phonepe') {
                gpayToday += amt;
              } else {
                cashToday += amt;
              }
            }
          });
        }

        const totalClients = clients.length;
        const pendingCount = Math.max(0, totalClients - paidCount);

        return {
          line_id: l.id,
          line_number: l.line_number,
          line_name: l.name,
          line_code: l.code,
          agent_name: l.agent_name,
          total_borrowers: totalClients,
          paid_today_count: paidCount,
          pending_today_count: pendingCount,
          collected_today: collectedToday,
          cash_today: cashToday,
          gpay_today: gpayToday
        };
      })
    );

    res.json({ success: true, data: stats, month_year: monthYear, day });
  } catch (err) {
    console.error('[LINES] Error calculating stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
