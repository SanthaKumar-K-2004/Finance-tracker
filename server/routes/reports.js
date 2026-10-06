import { Router } from 'express';
import { query, execute } from '../db.js';
import { serverCache } from '../utils/cache.js';
import { parseCurrencyNumber } from '../utils/currency.js';
import { sanitizeMonthYear } from '../utils/date.js';
import { matchesIdentifierRange, cleanIdentifier } from '../utils/identifierFilter.js';

const router = Router();

// GET dashboard KPIs & analytics
router.get('/dashboard', async (req, res) => {
  try {
    const month_year = sanitizeMonthYear(req.query.month_year);
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
        // 6. Defaulter Radar: Clients with high remaining balance (Optimized JOIN)
        safeQuery(
          `SELECT c.id, c.sl_no, c.name, c.phone, c.address, lc.principal, lc.start_date, lc.month_year,
                  COALESCE(coll.total_collected, 0) as total_collected,
                  COALESCE(today_coll.paid_today, 0) as paid_today
           FROM loan_cycles lc
           JOIN clients c ON c.id = lc.client_id
           LEFT JOIN (
             SELECT cycle_id, SUM(amount) as total_collected
             FROM daily_collections
             GROUP BY cycle_id
           ) coll ON coll.cycle_id = lc.id
           LEFT JOIN (
             SELECT cycle_id, SUM(amount) as paid_today
             FROM daily_collections
             WHERE collection_date = ?
             GROUP BY cycle_id
           ) today_coll ON today_coll.cycle_id = lc.id
           WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
           ORDER BY (lc.principal - COALESCE(coll.total_collected, 0)) DESC
           LIMIT 10`,
          [today, companyId, month_year]
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
          `SELECT c.id, c.sl_no, c.name, c.phone, c.address, lc.principal, lc.start_date, lc.month_year, lc.total_days,
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
          start_date: c.start_date || `${month_year}-01`,
          month_year: c.month_year || month_year,
          total_days: c.total_days || 31,
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
            paid_today: Number(d.paid_today) || 0,
            remaining: Math.max(0, d.principal - d.total_collected),
            start_date: d.start_date || `${month_year}-01`,
            month_year: d.month_year || month_year
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
        parseCurrencyNumber(expected_amount, 0),
        parseCurrencyNumber(actual_amount, 0),
        JSON.stringify(denomination || {})
      ]
    );

    res.json({ success: true, message: 'Cash handover settlement saved!', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET full member payment history across all months (supports /member-history and /member-history/:clientId)
const handleMemberHistory = async (req, res) => {
  try {
    const companyId = 'comp_alr_001';
    const clientId = req.params.clientId || req.query.client_id;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'client_id is required' });
    }

    // 1. Fetch client info
    const clientRows = await query(
      `SELECT id, sl_no, client_code, name, phone, address, status, created_at
       FROM clients WHERE id = ? AND company_id = ?`,
      [clientId, companyId]
    );
    if (clientRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    const client = clientRows[0];

    // 2. Fetch all loan cycles for this client (all months)
    const cycles = await query(
      `SELECT id, month_year, cycle_name, principal, start_date, end_date, total_days, status, close_date
       FROM loan_cycles
       WHERE client_id = ? AND company_id = ?
       ORDER BY month_year ASC`,
      [clientId, companyId]
    );

    // 3. Fetch all daily collections for all cycles
    const cycleIds = cycles.map(c => c.id);
    let allCollections = [];
    if (cycleIds.length > 0) {
      allCollections = await query(
        `SELECT cycle_id, day_number, amount, collection_date, payment_mode
         FROM daily_collections
         WHERE cycle_id IN (${cycleIds.map(() => '?').join(',')})
         ORDER BY day_number ASC`,
        cycleIds
      );
    }

    // 4. Group collections by cycle
    const collsByCycle = {};
    allCollections.forEach(c => {
      if (!collsByCycle[c.cycle_id]) collsByCycle[c.cycle_id] = [];
      collsByCycle[c.cycle_id].push(c);
    });

    // 5. Fetch closed records for this client
    const closedRecords = await query(
      `SELECT id, closed_date, final_principal, total_collected, excess_amount, closure_reason
       FROM closed_clients
       WHERE client_id = ? AND company_id = ?
       ORDER BY closed_date ASC`,
      [clientId, companyId]
    );

    // 6. Build month-by-month history
    let grandPrincipal = 0;
    let grandCollected = 0;
    const monthHistory = cycles.map(cycle => {
      const collections = collsByCycle[cycle.id] || [];
      const totalCollected = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const remaining = Math.max(0, cycle.principal - totalCollected);
      const excess = Math.max(0, totalCollected - cycle.principal);
      const totalDays = cycle.total_days || 31;
      const paidDays = collections.filter(c => Number(c.amount) > 0).length;
      const collectionRate = cycle.principal > 0 ? Math.round((totalCollected / cycle.principal) * 100) : 0;

      let status = 'pending';
      if (totalCollected >= cycle.principal && cycle.principal > 0) status = 'cleared';
      else if (collectionRate >= 50) status = 'partial';
      else if (totalCollected === 0) status = 'zero';

      grandPrincipal += cycle.principal;
      grandCollected += totalCollected;

      // Build daily breakdown object {1: amount, 2: amount, ...}
      const dailyBreakdown = {};
      collections.forEach(c => {
        dailyBreakdown[c.day_number] = Number(c.amount) || 0;
      });

      return {
        cycle_id: cycle.id,
        month_year: cycle.month_year,
        cycle_name: cycle.cycle_name,
        principal: cycle.principal,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        total_days: totalDays,
        cycle_status: cycle.status,
        close_date: cycle.close_date,
        total_collected: totalCollected,
        remaining,
        excess,
        paid_days: paidDays,
        collection_rate: collectionRate,
        status,
        daily_breakdown: dailyBreakdown,
        collections_detail: collections
      };
    });

    res.json({
      success: true,
      client,
      total_months: monthHistory.length,
      grand_principal: grandPrincipal,
      grand_collected: grandCollected,
      grand_remaining: Math.max(0, grandPrincipal - grandCollected),
      grand_excess: Math.max(0, grandCollected - grandPrincipal),
      closed_records: closedRecords,
      month_history: monthHistory
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
router.get('/member-history/:clientId', handleMemberHistory);
router.get('/member-history', handleMemberHistory);

// GET export preview data (filtered, for Export Center frontend)
router.get('/export-preview', async (req, res) => {
  try {
    const month_year = sanitizeMonthYear(req.query.month_year);
    const statusFilter = req.query.status || 'all'; // all|pending|cleared
    const village = (req.query.village || '').trim();
    const search = (req.query.search || '').trim();
    const fromSlNo = cleanIdentifier(req.query.from_sl_no);
    const toSlNo = cleanIdentifier(req.query.to_sl_no);
    const minPrincipal = Number(req.query.min_principal) || 0;
    const maxPrincipal = Number(req.query.max_principal) || Infinity;
    const sortBy = req.query.sort_by || 'sl_no'; // sl_no|name|remaining|collection_rate
    const sortOrder = req.query.sort_order || 'asc';
    const companyId = 'comp_alr_001';

    // Fetch cycles, collections in parallel
    const [cycles, collections] = await Promise.all([
      query(
        `SELECT lc.id as cycle_id, lc.principal, lc.start_date, lc.close_date, lc.total_days,
                c.id as client_id, c.sl_no, c.client_code, c.name, c.phone, c.address
         FROM loan_cycles lc
         JOIN clients c ON c.id = lc.client_id
         WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
         ORDER BY c.sl_no ASC`,
        [companyId, month_year]
      ),
      query(
        `SELECT dc.cycle_id, dc.day_number, dc.amount
         FROM daily_collections dc
         JOIN loan_cycles lc ON lc.id = dc.cycle_id
         WHERE lc.company_id = ? AND lc.month_year = ?`,
        [companyId, month_year]
      )
    ]);

    // Group collections
    const collsByCycle = {};
    collections.forEach(c => {
      if (!collsByCycle[c.cycle_id]) collsByCycle[c.cycle_id] = {};
      collsByCycle[c.cycle_id][c.day_number] = Number(c.amount) || 0;
    });

    const [yearNum, monthNum] = month_year.split('-').map(Number);
    const totalDays = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 31;

    // Build rows with computed fields
    let rows = cycles.map(c => {
      const dayMap = collsByCycle[c.cycle_id] || {};
      let totalCollected = 0;
      const days = {};
      for (let d = 1; d <= totalDays; d++) {
        const amt = dayMap[d] || 0;
        days[d] = amt;
        totalCollected += amt;
      }
      const remaining = Math.max(0, c.principal - totalCollected);
      const excess = Math.max(0, totalCollected - c.principal);
      const collectionRate = c.principal > 0 ? Math.round((totalCollected / c.principal) * 100) : 0;
      const paidDays = Object.values(dayMap).filter(v => v > 0).length;

      let status = 'pending';
      if (totalCollected >= c.principal && c.principal > 0) status = 'cleared';
      else if (collectionRate >= 50) status = 'partial';
      else if (totalCollected === 0) status = 'zero';

      return {
        cycle_id: c.cycle_id,
        client_id: c.client_id,
        sl_no: c.sl_no,
        client_code: c.client_code || null,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        principal: c.principal,
        start_date: c.start_date,
        close_date: c.close_date,
        total_days: c.total_days || totalDays,
        total_collected: totalCollected,
        remaining,
        excess,
        collection_rate: collectionRate,
        paid_days: paidDays,
        status,
        days
      };
    });

    // Auto-adopt all distinct villages/areas across all clients in this month
    const villageCounts = {};
    rows.forEach(r => {
      const v = (r.address || '').trim();
      if (v) {
        villageCounts[v] = (villageCounts[v] || 0) + 1;
      }
    });
    const allVillages = Object.keys(villageCounts)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ name, count: villageCounts[name] }));

    // Apply filters
    if (statusFilter === 'pending') rows = rows.filter(r => r.status === 'pending' || r.status === 'zero');
    else if (statusFilter === 'cleared') rows = rows.filter(r => r.status === 'cleared');
    else if (statusFilter === 'partial') rows = rows.filter(r => r.status === 'partial');

    if (village) {
      rows = rows.filter(r => (r.address || '').toLowerCase().includes(village.toLowerCase()));
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        (r.name && r.name.toLowerCase().includes(s)) ||
        (r.phone && r.phone.includes(s)) ||
        String(r.sl_no) === s ||
        (r.client_code && r.client_code.toLowerCase().includes(s)) ||
        (r.client_id && r.client_id.toLowerCase().includes(s))
      );
    }
    if (minPrincipal > 0) rows = rows.filter(r => r.principal >= minPrincipal);
    if (maxPrincipal < Infinity) rows = rows.filter(r => r.principal <= maxPrincipal);
    if (fromSlNo || toSlNo) {
      rows = rows.filter(r => matchesIdentifierRange(r, fromSlNo, toSlNo));
    }

    // Sort
    const dir = sortOrder === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'remaining') return dir * (a.remaining - b.remaining);
      if (sortBy === 'principal') return dir * ((a.principal || 0) - (b.principal || 0));
      if (sortBy === 'collection_rate') return dir * (a.collection_rate - b.collection_rate);
      return dir * ((a.sl_no || 0) - (b.sl_no || 0));
    });

    // Summary
    const summary = {
      total_clients: rows.length,
      total_principal: rows.reduce((s, r) => s + r.principal, 0),
      total_collected: rows.reduce((s, r) => s + r.total_collected, 0),
      total_remaining: rows.reduce((s, r) => s + r.remaining, 0),
      total_excess: rows.reduce((s, r) => s + r.excess, 0),
      cleared_count: rows.filter(r => r.status === 'cleared').length,
      pending_count: rows.filter(r => r.status === 'pending' || r.status === 'zero').length,
      partial_count: rows.filter(r => r.status === 'partial').length
    };

    // Column sums for day totals
    const columnSums = {};
    for (let d = 1; d <= totalDays; d++) {
      columnSums[d] = rows.reduce((s, r) => s + (r.days[d] || 0), 0);
    }

    res.json({
      success: true,
      month_year,
      total_days: totalDays,
      filters: { status: statusFilter, village, search, minPrincipal, maxPrincipal, from_sl_no: fromSlNo, to_sl_no: toSlNo, sortBy, sortOrder },
      summary,
      column_sums: columnSums,
      villages: allVillages,
      rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
