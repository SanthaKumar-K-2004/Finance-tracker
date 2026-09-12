import { Router } from 'express';
import { query, execute } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';

const router = Router();

// GET all clients
router.get('/', async (req, res) => {
  try {
    const payload = await serverCache.getOrFetch('clients_list', async () => {
      const clients = await query(
        `SELECT c.*, 
                lc.id as active_cycle_id,
                lc.principal,
                lc.month_year,
                COALESCE((SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id), 0) as total_collected
         FROM clients c
         LEFT JOIN loan_cycles lc ON lc.client_id = c.id AND lc.status = 'active'
         WHERE c.status != 'deleted'
         ORDER BY c.sl_no ASC`
      );
      return { success: true, data: clients };
    }, 5 * 60 * 1000, ['clients']);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single client by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clients = await query(
      `SELECT c.*, 
              lc.id as active_cycle_id,
              lc.principal,
              lc.month_year,
              lc.cycle_name,
              lc.status as cycle_status,
              COALESCE((SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id), 0) as total_collected
       FROM clients c
       LEFT JOIN loan_cycles lc ON lc.client_id = c.id AND lc.status = 'active'
       WHERE c.id = ? AND c.status != 'deleted'`,
      [id]
    );

    if (clients.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const client = clients[0];
    let collections = [];
    if (client.active_cycle_id) {
      collections = await query(
        `SELECT day_number, amount, payment_mode, collection_date, notes
         FROM daily_collections
         WHERE cycle_id = ?
         ORDER BY day_number ASC`,
        [client.active_cycle_id]
      );
    }

    res.json({
      success: true,
      data: {
        ...client,
        remaining: Math.max(0, (client.principal || 0) - (client.total_collected || 0)),
        excess: Math.max(0, (client.total_collected || 0) - (client.principal || 0)),
        collections
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add new client
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, principal, month_year = '2026-05', cycle_name = 'May 2026' } = req.body;
    const companyId = 'comp_alr_001';

    if (!name) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    let clientId;
    let nextSlNo;
    let clientCode;

    // Check duplicate phone if provided
    if (phone && phone.trim()) {
      const existing = await query('SELECT id, name, sl_no, client_code, status FROM clients WHERE phone = ? AND status != \'deleted\'', [phone.trim()]);
      if (existing.length > 0) {
        const existingClient = existing[0];
        // Check if cycle already exists in the same month_year
        const existingCycle = await query(
          'SELECT id FROM loan_cycles WHERE client_id = ? AND month_year = ? AND status != \'archived\'',
          [existingClient.id, month_year]
        );
        if (existingCycle.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Client ${existingClient.name} already has a loan in ${month_year}`
          });
        }

        // Reuse existing client for this new loan cycle
        clientId = existingClient.id;
        nextSlNo = existingClient.sl_no;
        clientCode = existingClient.client_code;

        // Reactivate client if they were marked closed
        await execute(
          `UPDATE clients SET name = ?, address = ?, status = 'active' WHERE id = ?`,
          [name.trim(), address ? address.trim() : '', clientId]
        );
      }
    }

    if (!clientId) {
      // Determine sl_no: use provided sl_no or auto-increment from MAX
      const maxSlResult = await query('SELECT MAX(sl_no) as max_sl FROM clients');
      const autoSlNo = (maxSlResult[0]?.max_sl || 3000) + 1;
      nextSlNo = req.body.sl_no ? parseInt(req.body.sl_no, 10) : autoSlNo;

      clientId = `client_${nextSlNo}_${crypto.randomBytes(3).toString('hex')}`;
      clientCode = `ALR-${nextSlNo}`;

      await execute(
        `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [clientId, companyId, nextSlNo, clientCode, name.trim(), phone ? phone.trim() : '', address ? address.trim() : '']
      );
    }

    // Create loan cycle for this client
    const cycleId = `cycle_${nextSlNo}_${month_year.replace('-', '_')}_${crypto.randomBytes(3).toString('hex')}`;
    const principalAmount = parseFloat(principal) || 10000;

    // Compute actual days in month (e.g. Feb: 28/29, Apr: 30, May: 31)
    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const endDate = `${month_year}-${String(totalDays).padStart(2, '0')}`;

    await execute(
      `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        cycleId,
        companyId,
        clientId,
        month_year,
        cycle_name,
        principalAmount,
        `${month_year}-01`,
        endDate,
        totalDays
      ]
    );

    // Invalidate grid, months list, client list, and report caches
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('clients');

    res.status(201).json({
      success: true,
      data: {
        id: clientId,
        client_id: clientId,
        cycle_id: cycleId,
        sl_no: nextSlNo,
        client_code: clientCode,
        name,
        principal: principalAmount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sl_no, name, phone, address, principal, month_year } = req.body;

    await execute(
      `UPDATE clients SET sl_no = COALESCE(?, sl_no), name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address)
       WHERE id = ?`,
      [sl_no ? parseInt(sl_no, 10) : null, name, phone, address, id]
    );

    if (principal !== undefined) {
      const parsedPrincipal = parseFloat(principal);
      if (month_year) {
        await execute(
          `UPDATE loan_cycles SET principal = ? WHERE client_id = ? AND month_year = ?`,
          [parsedPrincipal, id, month_year]
        );
      } else {
        await execute(
          `UPDATE loan_cycles SET principal = ? WHERE client_id = ? AND status = 'active'`,
          [parsedPrincipal, id]
        );
      }
    }

    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('clients');

    res.json({ success: true, message: 'Client updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE soft delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await execute(`UPDATE clients SET status = 'deleted' WHERE id = ?`, [id]);
    await execute(`UPDATE loan_cycles SET status = 'closed' WHERE client_id = ?`, [id]);
    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('clients');
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
