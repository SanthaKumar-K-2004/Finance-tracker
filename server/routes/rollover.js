import { Router } from 'express';
import { query, execute, batch } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = Router();

// GET preview of month-end rollover (Ultra-fast cached aggregation)
router.get('/preview', async (req, res) => {
  try {
    const from_month = req.query.from_month || '2026-05';
    const to_month = req.query.to_month || '2026-06';
    const companyId = 'comp_alr_001';

    const cacheKey = `rollover_preview_${companyId}_${from_month}_${to_month}`;
    const cached = serverCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Single fast query using LEFT JOIN and GROUP BY (Zero correlated subquery overhead)
    const cycles = await query(
      `SELECT lc.id as cycle_id,
              lc.client_id,
              lc.principal,
              lc.status as cycle_status,
              c.sl_no,
              c.client_code,
              c.name,
              c.phone,
              c.address,
              COALESCE(SUM(dc.amount), 0) as total_collected
       FROM loan_cycles lc
       JOIN clients c ON c.id = lc.client_id
       LEFT JOIN daily_collections dc ON dc.cycle_id = lc.id
       WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
       GROUP BY lc.id, lc.client_id, lc.principal, lc.status, c.sl_no, c.client_code, c.name, c.phone, c.address
       ORDER BY c.sl_no ASC`,
      [companyId, from_month]
    );

    const completedClients = [];
    const pendingClients = [];

    let totalOldPrincipal = 0;
    let totalCollected = 0;
    let totalNewPrincipal = 0;

    cycles.forEach(c => {
      const remaining = Math.max(0, c.principal - c.total_collected);
      const excess = Math.max(0, c.total_collected - c.principal);

      totalOldPrincipal += c.principal;
      totalCollected += c.total_collected;

      if (remaining === 0 || c.cycle_status === 'closed') {
        completedClients.push({
          client_id: c.client_id,
          cycle_id: c.cycle_id,
          sl_no: c.sl_no,
          name: c.name,
          phone: c.phone,
          address: c.address,
          principal: c.principal,
          total_collected: c.total_collected,
          excess,
          action: 'close'
        });
      } else {
        totalNewPrincipal += remaining;
        pendingClients.push({
          client_id: c.client_id,
          cycle_id: c.cycle_id,
          sl_no: c.sl_no,
          name: c.name,
          phone: c.phone,
          address: c.address,
          current_principal: c.principal,
          total_collected: c.total_collected,
          remaining_balance: remaining,
          new_principal: remaining,
          action: 'rollover'
        });
      }
    });

    const payload = {
      success: true,
      from_month,
      to_month,
      summary: {
        total_clients: cycles.length,
        completed_count: completedClients.length,
        pending_count: pendingClients.length,
        total_old_principal: totalOldPrincipal,
        total_collected: totalCollected,
        total_new_principal: totalNewPrincipal
      },
      completed_clients: completedClients,
      pending_clients: pendingClients
    };

    serverCache.set(cacheKey, payload, 30 * 1000, ['rollover', 'grid', 'months', `month_${from_month}`]);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST execute month-end rollover (Ultra-fast Atomic Batched Execution)
router.post('/execute', async (req, res) => {
  try {
    const { from_month, to_month, to_cycle_name, close_completed = true } = req.body;
    const companyId = 'comp_alr_001';

    if (!from_month || !to_month) {
      return res.status(400).json({ success: false, error: 'from_month and to_month required' });
    }

    // 1. Fetch current cycles with collections in 1 aggregated query
    const cycles = await query(
      `SELECT lc.id as cycle_id,
              lc.client_id,
              lc.principal,
              lc.status as cycle_status,
              c.name,
              c.phone,
              c.sl_no,
              COALESCE(SUM(dc.amount), 0) as total_collected
       FROM loan_cycles lc
       JOIN clients c ON c.id = lc.client_id
       LEFT JOIN daily_collections dc ON dc.cycle_id = lc.id
       WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
       GROUP BY lc.id, lc.client_id, lc.principal, lc.status, c.name, c.phone, c.sl_no`,
      [companyId, from_month]
    );

    // 2. Fetch all existing target cycles in 1 single lookup query (eliminates N+1 selects!)
    const existingNextCycles = await query(
      `SELECT id, client_id FROM loan_cycles WHERE company_id = ? AND month_year = ?`,
      [companyId, to_month]
    );
    const existingNextMap = new Map();
    existingNextCycles.forEach(row => {
      existingNextMap.set(row.client_id, row.id);
    });

    let rolledOverCount = 0;
    let closedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    // Compute actual days in target month (e.g. Feb: 28, Apr: 30, May: 31)
    const [toY, toM] = to_month.split('-').map(Number);
    const toDaysInMonth = (toY && toM) ? new Date(toY, toM, 0).getDate() : 31;
    const toEndDate = `${to_month}-${String(toDaysInMonth).padStart(2, '0')}`;

    // 3. Assemble all SQL operations into batch array
    const statements = [];

    for (const c of cycles) {
      const remaining = Math.max(0, c.principal - c.total_collected);
      const excess = Math.max(0, c.total_collected - c.principal);

      if (remaining === 0 || c.cycle_status === 'closed') {
        if (close_completed && c.cycle_status !== 'closed') {
          // Archive to closed_clients
          const archiveId = `closed_${c.client_id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const snapshot = JSON.stringify({
            client_id: c.client_id,
            final_principal: c.principal,
            total_collected: c.total_collected,
            closed_at: today
          });

          statements.push({
            sql: `INSERT INTO closed_clients (id, company_id, client_id, cycle_id, client_name, phone, final_principal, total_collected, excess_amount, closed_date, snapshot_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [archiveId, companyId, c.client_id, c.cycle_id, c.name, c.phone, c.principal, c.total_collected, excess, today, snapshot]
          });

          statements.push({
            sql: `UPDATE loan_cycles SET status = 'closed', close_date = ? WHERE id = ?`,
            args: [today, c.cycle_id]
          });

          statements.push({
            sql: `UPDATE clients SET status = 'closed' WHERE id = ?`,
            args: [c.client_id]
          });

          closedCount++;
        }
      } else {
        // Carry forward remaining balance as new principal!
        const existingNextId = existingNextMap.get(c.client_id);

        if (!existingNextId) {
          const nextCycleId = `cycle_${c.sl_no || c.client_id}_${to_month.replace('-', '_')}`;
          statements.push({
            sql: `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            args: [
              nextCycleId,
              companyId,
              c.client_id,
              to_month,
              to_cycle_name || `${to_month} Cycle`,
              remaining,
              `${to_month}-01`,
              toEndDate,
              toDaysInMonth
            ]
          });
        } else {
          // Update existing with rolled over principal
          statements.push({
            sql: `UPDATE loan_cycles SET principal = ?, total_days = ?, end_date = ?, status = 'active' WHERE id = ?`,
            args: [remaining, toDaysInMonth, toEndDate, existingNextId]
          });
        }

        // Mark old cycle as rolled_over
        statements.push({
          sql: `UPDATE loan_cycles SET status = 'rolled_over' WHERE id = ?`,
          args: [c.cycle_id]
        });

        rolledOverCount++;
      }
    }

    // 4. Execute statements in fast batch chunks of 50
    for (let i = 0; i < statements.length; i += 50) {
      const chunk = statements.slice(i, i + 50);
      if (chunk.length > 0) {
        await batch(chunk);
      }
    }

    // Invalidate caches
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('rollover');

    res.json({
      success: true,
      message: `Rollover to ${to_month} complete! Rolled over ${rolledOverCount} clients, archived ${closedCount} completed loans.`,
      stats: { rolledOverCount, closedCount }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
