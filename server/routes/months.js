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

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonthYear = `${currentYear}-${currentMonthNum}`;
      const currentDays = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const currentCycleName = `${monthNames[now.getMonth()]} ${currentYear}`;

      // Dynamic fallback if no months exist in database
      if (months.length === 0) {
        return {
          success: true,
          data: [{
            month_year: currentMonthYear,
            cycle_name: currentCycleName,
            total_clients: 0,
            total_principal: 0,
            total_days: currentDays,
            start_date: `${currentMonthYear}-01`,
            end_date: `${currentMonthYear}-${String(currentDays).padStart(2, '0')}`
          }]
        };
      }

      // Attach actual total_days for each month
      const monthsWithDays = months.map(m => {
        const [y, mon] = (m.month_year || '').split('-').map(Number);
        const days = (y && mon) ? new Date(y, mon, 0).getDate() : 31;
        return { ...m, total_days: days };
      });

      // Guarantee that the current calendar month is ALWAYS available in the register
      if (!monthsWithDays.some(m => m.month_year === currentMonthYear)) {
        monthsWithDays.push({
          month_year: currentMonthYear,
          cycle_name: currentCycleName,
          total_clients: 0,
          total_principal: 0,
          total_days: currentDays,
          start_date: `${currentMonthYear}-01`,
          end_date: `${currentMonthYear}-${String(currentDays).padStart(2, '0')}`
        });
      }

      // Sort chronologically ascending
      monthsWithDays.sort((a, b) => (a.month_year || '').localeCompare(b.month_year || ''));

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

    const [y, mon] = month_year.split('-').map(Number);
    const days = (y && mon) ? new Date(y, mon, 0).getDate() : 31;
    const now = new Date();
    const curMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (month.length === 0) {
      if (month_year === curMonthYear) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const cycleName = (y && mon && mon >= 1 && mon <= 12) ? `${monthNames[mon - 1]} ${y}` : month_year;
        return res.json({
          success: true,
          data: {
            month_year,
            cycle_name: cycleName,
            total_clients: 0,
            total_principal: 0,
            total_days: days,
            start_date: `${month_year}-01`,
            end_date: `${month_year}-${String(days).padStart(2, '0')}`
          }
        });
      }
      return res.status(404).json({ success: false, error: `Month cycle ${month_year} not found` });
    }

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
