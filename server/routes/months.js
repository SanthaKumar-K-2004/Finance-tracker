import { Router } from 'express';
import { query, execute } from '../db.js';
import { serverCache } from '../utils/cache.js';

const router = Router();

// GET all active and historical month cycles
router.get('/', async (req, res) => {
  try {
    const payload = await serverCache.getOrFetch('months_list', async () => {
      const companyId = 'comp_alr_001';
      const months = await query(
        `SELECT DISTINCT month_year, cycle_name,
                COUNT(DISTINCT client_id) as total_clients,
                SUM(principal) as total_principal,
                MIN(start_date) as start_date,
                MAX(end_date) as end_date
         FROM loan_cycles
         WHERE company_id = ?
         GROUP BY month_year, cycle_name
         ORDER BY month_year ASC`,
        [companyId]
      );

      // Fallback if no months exist
      if (months.length === 0) {
        return {
          success: true,
          data: [{ month_year: '2026-05', cycle_name: 'May 2026 (வைகாசி)', total_clients: 0, total_principal: 0 }]
        };
      }

      // Attach actual total_days for each month
      const monthsWithDays = months.map(m => {
        const [y, mon] = (m.month_year || '').split('-').map(Number);
        const days = (y && mon) ? new Date(y, mon, 0).getDate() : 31;
        return { ...m, total_days: days };
      });

      return { success: true, data: monthsWithDays };
    }, 5 * 60 * 1000, ['months']);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single month cycle summary
router.get('/:month_year', async (req, res) => {
  try {
    const { month_year } = req.params;
    const companyId = 'comp_alr_001';
    const month = await query(
      `SELECT month_year, cycle_name,
              COUNT(DISTINCT client_id) as total_clients,
              COALESCE(SUM(principal), 0) as total_principal,
              MIN(start_date) as start_date,
              MAX(end_date) as end_date
       FROM loan_cycles
       WHERE company_id = ? AND month_year = ?
       GROUP BY month_year, cycle_name`,
      [companyId, month_year]
    );

    if (month.length === 0) {
      return res.status(404).json({ success: false, error: `Month cycle ${month_year} not found` });
    }

    const [y, mon] = month_year.split('-').map(Number);
    const days = (y && mon) ? new Date(y, mon, 0).getDate() : 31;

    res.json({ success: true, data: { ...month[0], total_days: days } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create custom month cycle
router.post('/create', async (req, res) => {
  try {
    const { month_year, cycle_name } = req.body;
    if (!month_year || !cycle_name) {
      return res.status(400).json({ success: false, error: 'month_year and cycle_name required' });
    }
    serverCache.invalidateTag('months');
    res.json({ success: true, message: `Month ${cycle_name} created` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
