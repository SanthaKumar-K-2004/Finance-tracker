import { Router } from 'express';
import { query, execute } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = Router();

// GET dashboard KPIs & analytics
router.get('/dashboard', async (req, res) => {
  try {
    const month_year = req.query.month_year || '2026-05';
    const cacheKey = `dashboard_${month_year}`;

    const payload = await serverCache.getOrFetch(cacheKey, async () => {
      const companyId = 'comp_alr_001';
      const today = new Date().toISOString().split('T')[0];

      const safeQuery = async (sql, params, fallback = []) => {
        try {
          return await query(sql, params);
        } catch (err) {
          console.warn('Dashboard query notice:', err.message);
          return fallback;
        }
      };

      // Run independent analytical queries concurrently with Promise.all for maximum speed
      const [
        cycleStats,
        collectionStats,
        todayStats,
        paymentModes,
        closedStats,
        defaulters,
        dailyTrends,
        villages,
        clientsSummary
      ] = await Promise.all([
        // 1. Month overview stats
        safeQuery(
          `SELECT COUNT(DISTINCT lc.client_id) as active_clients,
                  COALESCE(SUM(lc.principal), 0) as total_principal
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'`,
          [companyId, month_year]
        ),
        // 2. Total collections for this month
        safeQuery(
          `SELECT COALESCE(SUM(dc.amount), 0) as total_collected,
                  COUNT(dc.id) as total_entries
           FROM daily_collections dc
           JOIN loan_cycles lc ON lc.id = dc.cycle_id
           WHERE lc.company_id = ? AND lc.month_year = ?`,
          [companyId, month_year]
        ),
        // 3. Today's collections
        safeQuery(
          `SELECT COALESCE(SUM(amount), 0) as today_collected,
                  COUNT(id) as today_entries
           FROM daily_collections
           WHERE company_id = ? AND collection_date = ?`,
          [companyId, today]
        ),
        // 4. Payment modes breakdown
        safeQuery(
          `SELECT dc.payment_mode, COALESCE(SUM(dc.amount), 0) as amount
           FROM daily_collections dc
           JOIN loan_cycles lc ON lc.id = dc.cycle_id
           WHERE lc.company_id = ? AND lc.month_year = ?
           GROUP BY dc.payment_mode`,
          [companyId, month_year]
        ),
        // 5. Closed loans count
        safeQuery(
          `SELECT COUNT(id) as total_closed, COALESCE(SUM(total_collected), 0) as closed_collected
           FROM closed_clients WHERE company_id = ?`,
          [companyId]
        ),
        // 6. Defaulter Radar: Clients with high remaining balance
        safeQuery(
          `SELECT c.id, c.sl_no, c.name, c.phone, c.address, lc.principal,
                  COALESCE((SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id), 0) as total_collected
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
           ORDER BY (lc.principal - COALESCE((SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id), 0)) DESC
           LIMIT 10`,
          [companyId, month_year]
        ),
        // 7. Daily Collection Velocity Trend (Days 1 to 31)
        safeQuery(
          `SELECT dc.day_number, COALESCE(SUM(dc.amount), 0) as amount, COUNT(dc.id) as count
           FROM daily_collections dc
           JOIN loan_cycles lc ON lc.id = dc.cycle_id
           WHERE lc.company_id = ? AND lc.month_year = ? AND lc.status != 'archived'
           GROUP BY dc.day_number
           ORDER BY dc.day_number ASC`,
          [companyId, month_year]
        ),
        // 8. Route / Village-wise Performance Breakdown
        safeQuery(
          `SELECT 
             COALESCE(NULLIF(TRIM(c.address), ''), 'General') as village,
             COUNT(DISTINCT c.id) as client_count,
             COALESCE(SUM(lc.principal), 0) as principal,
             COALESCE(SUM(coll.total_coll), 0) as collected
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           LEFT JOIN (
             SELECT cycle_id, SUM(amount) as total_coll
             FROM daily_collections
             GROUP BY cycle_id
           ) coll ON coll.cycle_id = lc.id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
           GROUP BY village
           ORDER BY collected DESC`,
          [companyId, month_year]
        ),
        // 9. Lightweight Clients Summary for 0ms Real-Time Frontend Multi-Filtering
        safeQuery(
          `SELECT c.id, c.sl_no, c.name, c.phone, c.address, lc.principal,
                  COALESCE(coll.total_coll, 0) as total_collected,
                  COALESCE(today_coll.today_amt, 0) as paid_today
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           LEFT JOIN (
             SELECT cycle_id, SUM(amount) as total_coll
             FROM daily_collections
             GROUP BY cycle_id
           ) coll ON coll.cycle_id = lc.id
           LEFT JOIN (
             SELECT cycle_id, SUM(amount) as today_amt
             FROM daily_collections
             WHERE collection_date = ?
             GROUP BY cycle_id
           ) today_coll ON today_coll.cycle_id = lc.id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
           ORDER BY c.sl_no ASC`,
          [today, companyId, month_year]
        )
      ]);

      const activeClients = cycleStats[0]?.active_clients || 0;
      const totalPrincipal = cycleStats[0]?.total_principal || 0;
      const totalCollected = collectionStats[0]?.total_collected || 0;
      const totalRemaining = Math.max(0, totalPrincipal - totalCollected);
      const collectionRate = totalPrincipal > 0 ? Math.round((totalCollected / totalPrincipal) * 100) : 0;

      // Process route/village metrics
      const processedVillages = (villages || []).map(v => {
        const p = Number(v.principal) || 0;
        const c = Number(v.collected) || 0;
        const rem = Math.max(0, p - c);
        const rate = p > 0 ? Math.round((c / p) * 100) : 0;
        return {
          village: v.village,
          client_count: Number(v.client_count) || 0,
          principal: p,
          collected: c,
          remaining: rem,
          collection_rate: rate
        };
      });

      // Process lightweight clients summary for client-side multi-filter
      const processedClients = (clientsSummary || []).map(c => {
        const p = Number(c.principal) || 0;
        const coll = Number(c.total_collected) || 0;
        const rem = Math.max(0, p - coll);
        return {
          id: c.id,
          sl_no: c.sl_no,
          name: c.name,
          phone: c.phone,
          address: c.address,
          principal: p,
          total_collected: coll,
          remaining: rem,
          paid_today: Number(c.paid_today) || 0,
          is_cleared: coll >= p && p > 0
        };
      });

      return {
        success: true,
        data: {
          month_year,
          active_clients: activeClients,
          total_principal: totalPrincipal,
          total_collected: totalCollected,
          total_remaining: totalRemaining,
          collection_rate: collectionRate,
          today_collected: todayStats[0]?.today_collected || 0,
          today_entries: todayStats[0]?.today_entries || 0,
          total_closed_loans: closedStats[0]?.total_closed || 0,
          payment_modes: paymentModes,
          daily_trends: dailyTrends || [],
          villages: processedVillages,
          clients_summary: processedClients,
          defaulters: (defaulters || []).map(d => ({
            ...d,
            remaining: Math.max(0, d.principal - d.total_collected)
          }))
        }
      };
    }, 5 * 60 * 1000, ['reports', `month_${month_year}`]);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET closed clients archive
router.get('/closed', async (req, res) => {
  try {
    const payload = await serverCache.getOrFetch('closed_clients_list', async () => {
      const companyId = 'comp_alr_001';
      const closed = await query(
        `SELECT * FROM closed_clients WHERE company_id = ? ORDER BY closed_date DESC`,
        [companyId]
      );
      return { success: true, data: closed };
    }, 5 * 60 * 1000, ['reports', 'closed']);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET & POST settlements (Evening Cash Handover)
router.get('/settlements', async (req, res) => {
  try {
    const companyId = 'comp_alr_001';
    const settlements = await query(
      `SELECT * FROM settlements WHERE company_id = ? ORDER BY settlement_date DESC LIMIT 30`,
      [companyId]
    );
    res.json({ success: true, data: settlements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settlements', async (req, res) => {
  try {
    const { agent_name = 'Agent', expected_amount, actual_amount, denomination } = req.body;
    const companyId = 'comp_alr_001';
    const id = `settle_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    await execute(
      `INSERT INTO settlements (id, company_id, settlement_date, agent_name, expected_amount, actual_amount, denomination_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'verified')`,
      [
        id,
        companyId,
        today,
        agent_name,
        parseFloat(expected_amount) || 0,
        parseFloat(actual_amount) || 0,
        JSON.stringify(denomination || {})
      ]
    );

    res.json({ success: true, message: 'Cash handover settlement saved!', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
