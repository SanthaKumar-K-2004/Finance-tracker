import { Router } from 'express';
import { query, execute, batch } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';

const router = Router();

// GET 31-Day Ledger Grid
router.get(['/', '/grid'], async (req, res) => {
  try {
    const month_year = req.query.month_year || '2026-05';
    const cacheKey = `grid_${month_year}`;

    const payload = await serverCache.getOrFetch(cacheKey, async () => {
      const companyId = 'comp_alr_001';

      // 1 & 2. Fetch active cycles and collections for this month in parallel
      const [cycles, collections] = await Promise.all([
        query(
          `SELECT lc.id as cycle_id,
                  lc.month_year,
                  lc.cycle_name,
                  lc.principal,
                  lc.status as cycle_status,
                  lc.start_date,
                  lc.end_date,
                  lc.total_days,
                  c.id as client_id,
                  c.sl_no,
                  c.client_code,
                  c.name,
                  c.phone,
                  c.address
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
           ORDER BY c.sl_no ASC`,
          [companyId, month_year]
        ),
        query(
          `SELECT dc.cycle_id,
                  dc.client_id,
                  dc.day_number,
                  dc.amount,
                  dc.payment_mode,
                  dc.collected_by,
                  dc.collection_date
           FROM daily_collections dc
           JOIN loan_cycles lc ON lc.id = dc.cycle_id
           WHERE lc.company_id = ? AND lc.month_year = ?`,
          [companyId, month_year]
        )
      ]);

      // Calculate actual days in this specific month (e.g. Feb: 28/29, Apr: 30, May: 31)
      const [yearNum, monthNum] = month_year.split('-').map(Number);
      const totalDays = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 31;

      // Group collections by cycle_id
      const collectionsByCycle = {};
      const columnSums = {};
      for (let d = 1; d <= totalDays; d++) {
        columnSums[d] = 0;
      }

      collections.forEach(col => {
        if (!collectionsByCycle[col.cycle_id]) {
          collectionsByCycle[col.cycle_id] = {};
        }
        collectionsByCycle[col.cycle_id][col.day_number] = col.amount;
      });

      let grandPrincipal = 0;
      let grandCollected = 0;
      let grandRemaining = 0;
      let grandExcess = 0;

      // Assemble grid rows with live calculations for actual days in month
      const rows = cycles.map(c => {
        const days = {};
        let rowTotal = 0;

        for (let d = 1; d <= totalDays; d++) {
          const amt = collectionsByCycle[c.cycle_id]?.[d] || 0;
          days[d] = amt;
          rowTotal += amt;
          columnSums[d] += amt;
        }

        const principal = c.principal || 0;
        const remaining = c.cycle_status === 'closed' ? 0 : Math.max(0, principal - rowTotal);
        const excess = Math.max(0, rowTotal - principal);
        const isCleared = remaining === 0 || c.cycle_status === 'closed';

        grandPrincipal += principal;
        grandCollected += rowTotal;
        grandRemaining += remaining;
        grandExcess += excess;

        return {
          cycle_id: c.cycle_id,
          client_id: c.client_id,
          sl_no: c.sl_no,
          client_code: c.client_code,
          name: c.name,
          phone: c.phone,
          address: c.address,
          principal,
          days,
          total_collected: rowTotal,
          remaining,
          excess,
          is_cleared: isCleared,
          cycle_status: c.cycle_status,
          start_date: c.start_date || `${month_year}-01`,
          end_date: c.end_date || `${month_year}-${totalDays}`,
          month_year: c.month_year || month_year,
          total_days: c.total_days || totalDays
        };
      });

      return {
        success: true,
        month_year,
        total_days: totalDays,
        rows,
        summary: {
          total_principal: grandPrincipal,
          total_collected: grandCollected,
          total_remaining: grandRemaining,
          total_excess: grandExcess,
          client_count: rows.length,
          column_sums: columnSums
        }
      };
    }, 5 * 60 * 1000, ['grid', `month_${month_year}`]);

    res.json(payload);
  } catch (err) {
    console.error('[GRID] Error serving grid data:', err.message);
    const month_year = req.query.month_year || '2026-05';
    const stale = serverCache.getStale(`grid_${month_year}`);
    if (stale) {
      console.warn(`[GRID] Serving stale snapshot for ${month_year} to preserve 100% uptime`);
      return res.json({ ...stale, is_stale_fallback: true });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record or update single daily payment (Upsert)
router.post(['/', '/entry'], async (req, res) => {
  try {
    const cycle_id = req.body.cycle_id || req.body.loan_cycle_id;
    const rawDay = req.body.day_number !== undefined ? req.body.day_number : req.body.day;
    const { client_id, amount, payment_mode = 'cash', collected_by = 'Agent', notes = '' } = req.body;

    if (!cycle_id || rawDay === undefined || rawDay === null) {
      return res.status(400).json({ success: false, error: 'cycle_id and day/day_number are required' });
    }

    const companyId = 'comp_alr_001';
    const day = parseInt(rawDay, 10);
    const amt = parseFloat(amount);

    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ success: false, error: 'Amount cannot be negative' });
    }

    // Fetch cycle to construct date and validate calendar bounds
    const cycleResult = await query('SELECT month_year, client_id FROM loan_cycles WHERE id = ?', [cycle_id]);
    if (!cycleResult || cycleResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Loan cycle not found' });
    }

    const monthYear = cycleResult[0]?.month_year || '2026-05';
    const resolvedClientId = client_id || cycleResult[0]?.client_id || null;

    // Validate month day boundaries (e.g. Feb 28 days, Apr 30 days)
    const [yStr, mStr] = monthYear.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const maxDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

    if (isNaN(day) || day < 1 || day > maxDays) {
      return res.status(400).json({
        success: false,
        error: `Invalid day number ${day}. Month ${monthYear} has ${maxDays} days.`
      });
    }

    const dayPadded = String(day).padStart(2, '0');
    const collectionDate = `${monthYear}-${dayPadded}`;
    const id = `coll_${cycle_id}_d${day}`;

    await execute(
      `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cycle_id, day_number) 
       DO UPDATE SET amount = excluded.amount, 
                     payment_mode = excluded.payment_mode,
                     collected_by = excluded.collected_by,
                     notes = excluded.notes,
                     created_at = CURRENT_TIMESTAMP`,
      [id, companyId, cycle_id, resolvedClientId, day, collectionDate, amt, payment_mode, collected_by, notes]
    );

    // Invalidate memory cache for grid and analytics
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');

    res.json({
      success: true,
      data: {
        id,
        cycle_id,
        day_number: day,
        amount: amt,
        payment_mode,
        collection_date: collectionDate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk entry (e.g. apply same payment to multiple clients for a specific day) - Optimized with single-roundtrip batch
router.post('/batch', async (req, res) => {
  try {
    const { entries, payment_mode: defaultPaymentMode = 'cash', collected_by = 'Agent' } = req.body;
    const batchDay = req.body.day_number !== undefined ? req.body.day_number : (req.body.day !== undefined ? req.body.day : (entries?.[0]?.day_number || entries?.[0]?.day));

    if (!Array.isArray(entries) || batchDay === undefined || batchDay === null) {
      return res.status(400).json({ success: false, error: 'entries array and day/day_number are required' });
    }

    const companyId = 'comp_alr_001';
    const validCycleIds = [...new Set(entries.map(e => e.cycle_id || e.loan_cycle_id).filter(Boolean))];

    if (validCycleIds.length === 0) {
      return res.json({ success: true, processed: 0 });
    }

    // Bulk fetch cycle info in 1 query
    const placeholders = validCycleIds.map(() => '?').join(',');
    const cycleRows = await query(`SELECT id, month_year, client_id FROM loan_cycles WHERE id IN (${placeholders})`, validCycleIds);
    const cycleMap = {};
    cycleRows.forEach(c => { cycleMap[c.id] = c; });

    const statements = [];
    let processed = 0;

    for (const item of entries) {
      const cycle_id = item.cycle_id || item.loan_cycle_id;
      if (!cycle_id || !cycleMap[cycle_id]) continue;

      const cycle = cycleMap[cycle_id];
      const monthYear = cycle.month_year || '2026-05';
      const [yStr, mStr] = monthYear.split('-');
      const yNum = parseInt(yStr, 10);
      const mNum = parseInt(mStr, 10);
      const maxDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

      const day = parseInt(item.day_number || item.day || batchDay, 10);
      if (isNaN(day) || day < 1 || day > maxDays) continue;

      const amt = parseFloat(item.amount);
      if (isNaN(amt) || amt < 0) continue;

      const pMode = item.payment_mode || defaultPaymentMode;
      const id = `coll_${cycle_id}_d${day}`;
      const resolvedClientId = item.client_id || cycle.client_id || null;
      const colDate = `${monthYear}-${String(day).padStart(2, '0')}`;

      statements.push({
        sql: `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(cycle_id, day_number) 
              DO UPDATE SET amount = excluded.amount, 
                            payment_mode = excluded.payment_mode`,
        args: [id, companyId, cycle_id, resolvedClientId, day, colDate, amt, pMode, collected_by]
      });
      processed++;
    }

    if (statements.length > 0) {
      await batch(statements);
      serverCache.invalidateTag('grid');
      serverCache.invalidateTag('reports');
    }

    res.json({
      success: true,
      processed,
      day_number: parseInt(batchDay, 10)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single daily entry (reset / clear payment)
router.delete(['/', '/entry'], async (req, res) => {
  try {
    const { cycle_id, day_number } = req.body;
    if (!cycle_id || !day_number) {
      return res.status(400).json({ success: false, error: 'cycle_id and day_number are required' });
    }
    const day = parseInt(day_number, 10);
    await execute('DELETE FROM daily_collections WHERE cycle_id = ? AND day_number = ?', [cycle_id, day]);
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');
    res.json({ success: true, message: `Entry for day ${day} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST 1-click Close Completed Client
router.post('/close-client', async (req, res) => {
  try {
    const { cycle_id, client_id, reason = 'completed' } = req.body;

    const companyId = 'comp_alr_001';

    // Get client and cycle details
    const cycle = await query(
      `SELECT lc.*, c.name, c.phone, c.sl_no
       FROM loan_cycles lc
       JOIN clients c ON c.id = lc.client_id
       WHERE lc.id = ?`,
      [cycle_id]
    );

    if (cycle.length === 0) {
      return res.status(404).json({ success: false, error: 'Loan cycle not found' });
    }

    const c = cycle[0];
    const collections = await query('SELECT * FROM daily_collections WHERE cycle_id = ?', [cycle_id]);
    const totalCollected = collections.reduce((sum, col) => sum + (col.amount || 0), 0);
    const excess = Math.max(0, totalCollected - c.principal);
    const today = new Date().toISOString().split('T')[0];

    const archiveId = `closed_${c.client_id}_${Date.now()}`;
    const snapshot = JSON.stringify({
      cycle: c,
      collections,
      closed_at: new Date().toISOString()
    });

    // Archive to closed_clients
    await execute(
      `INSERT INTO closed_clients (id, company_id, client_id, cycle_id, client_name, phone, final_principal, total_collected, excess_amount, closed_date, closure_reason, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [archiveId, companyId, client_id, cycle_id, c.name, c.phone, c.principal, totalCollected, excess, today, reason, snapshot]
    );

    // Update cycle and client status
    await execute(`UPDATE loan_cycles SET status = 'closed', close_date = ? WHERE id = ?`, [today, cycle_id]);
    await execute(`UPDATE clients SET status = 'closed' WHERE id = ?`, [client_id]);

    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');

    res.json({
      success: true,
      message: `Client ${c.name} successfully closed and archived!`,
      archive_id: archiveId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Reopen Closed Client (Undo accidental closure)
router.post('/reopen-client', async (req, res) => {
  try {
    const { closed_id, client_id, cycle_id } = req.body;
    if (!closed_id) {
      return res.status(400).json({ success: false, error: 'closed_id is required' });
    }

    await execute('DELETE FROM closed_clients WHERE id = ?', [closed_id]);
    if (cycle_id) {
      await execute("UPDATE loan_cycles SET status = 'active', close_date = NULL WHERE id = ?", [cycle_id]);
    }
    if (client_id) {
      await execute("UPDATE clients SET status = 'active' WHERE id = ?", [client_id]);
    }

    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');

    res.json({
      success: true,
      message: 'Loan successfully reopened and restored to active register!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Reset Client Collections (Clear all month payments to 0)
router.post('/reset-client', async (req, res) => {
  try {
    const { cycle_id, client_id } = req.body;
    if (!cycle_id) {
      return res.status(400).json({ success: false, error: 'cycle_id is required' });
    }

    // 1. Delete all daily collections recorded for this cycle
    await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [cycle_id]);

    // 2. If the cycle was marked closed, restore it back to active
    await execute("UPDATE loan_cycles SET status = 'active', close_date = NULL WHERE id = ?", [cycle_id]);

    // 3. Remove from closed_clients archive if it was archived
    await execute('DELETE FROM closed_clients WHERE cycle_id = ?', [cycle_id]);

    // 4. Ensure client is active
    if (client_id) {
      await execute("UPDATE clients SET status = 'active' WHERE id = ?", [client_id]);
    }

    // 5. Invalidate caches
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('clients');

    res.json({
      success: true,
      message: 'Client collections successfully reset to ₹0'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Remove Client from Active Month Register (without deleting permanent borrower)
router.post('/remove-from-month', async (req, res) => {
  try {
    const { cycle_id } = req.body;
    if (!cycle_id) {
      return res.status(400).json({ success: false, error: 'cycle_id is required' });
    }

    // Delete collections for this cycle and archive the cycle
    await execute('DELETE FROM daily_collections WHERE cycle_id = ?', [cycle_id]);
    await execute("UPDATE loan_cycles SET status = 'archived' WHERE id = ?", [cycle_id]);

    // Invalidate caches
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('months');

    res.json({
      success: true,
      message: 'Borrower cycle removed from this month register'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record WhatsApp audit log
router.post('/whatsapp-log', async (req, res) => {
  try {
    const { client_id, phone, message_type = 'collection_receipt', message_text = '' } = req.body;
    const companyId = 'comp_alr_001';
    const id = `walog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await execute(
      `INSERT INTO whatsapp_logs (id, company_id, client_id, phone, message_type, message_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, companyId, client_id || null, phone || '', message_type, message_text]
    );

    res.json({
      success: true,
      id,
      message: 'WhatsApp log recorded successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET query WhatsApp audit logs
router.get('/whatsapp-logs', async (req, res) => {
  try {
    const companyId = 'comp_alr_001';
    const logs = await query(
      `SELECT wl.*, c.name as client_name
       FROM whatsapp_logs wl
       LEFT JOIN clients c ON c.id = wl.client_id
       WHERE wl.company_id = ?
       ORDER BY wl.sent_at DESC
       LIMIT 100`,
      [companyId]
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
