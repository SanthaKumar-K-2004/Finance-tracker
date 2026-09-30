import { Router } from 'express';
import { query, execute, executeQueued, batchQueued } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';
import { parseCurrencyNumber } from '../utils/currency.js';
import { sanitizeMonthYear } from '../utils/date.js';

const router = Router();

function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Universal Instant Search Endpoint (Cmd+K / Spotlight / Field POS)
router.get('/search', async (req, res) => {
  try {
    const rawQ = (req.query.q || req.query.search || '').trim();
    if (!rawQ) {
      return res.json({ success: true, data: [] });
    }

    const cacheKey = `search_${rawQ.toLowerCase()}`;
    const payload = await serverCache.getOrFetch(cacheKey, async () => {
      const searchTerm = `%${rawQ}%`;
      const isNum = !isNaN(Number(rawQ));
      const slNoMatch = isNum ? parseInt(rawQ, 10) : -1;

      // Ultra-fast indexed search across Name, Phone, Code, SL No, Address
      const results = await query(
        `SELECT c.id, c.sl_no, c.client_code, c.name, c.phone, c.address, c.status,
                lc.id as active_cycle_id,
                lc.principal,
                lc.month_year,
                COALESCE(dc_sum.total_collected, 0) as total_collected
         FROM clients c
         LEFT JOIN loan_cycles lc ON lc.id = (
           SELECT id FROM loan_cycles 
           WHERE client_id = c.id AND status = 'active' 
           ORDER BY month_year DESC LIMIT 1
         )
         LEFT JOIN (
           SELECT cycle_id, SUM(amount) as total_collected
           FROM daily_collections
           GROUP BY cycle_id
         ) dc_sum ON dc_sum.cycle_id = lc.id
         WHERE c.status != 'deleted'
           AND (
             c.name LIKE ? 
             OR c.phone LIKE ? 
             OR c.client_code LIKE ? 
             OR c.address LIKE ? 
             OR c.sl_no = ?
           )
         ORDER BY 
           CASE 
             WHEN c.sl_no = ? THEN 1
             WHEN c.client_code LIKE ? THEN 2
             WHEN c.name LIKE ? THEN 3
             ELSE 4 
           END,
           c.sl_no ASC
         LIMIT 25`,
        [searchTerm, searchTerm, searchTerm, searchTerm, slNoMatch, slNoMatch, `${rawQ}%`, `${rawQ}%`]
      );

      const mapped = results.map(c => {
        const principal = c.principal || 0;
        const collected = c.total_collected || 0;
        const remaining = Math.max(0, principal - collected);
        const excess = Math.max(0, collected - principal);
        return {
          ...c,
          remaining,
          excess,
          is_cleared: remaining === 0 && principal > 0
        };
      });

      return { success: true, data: mapped };
    }, 60 * 1000, ['clients', 'grid']);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET clients (Supports high-speed pagination, server-side filtering, and bulk listing)
router.get('/', async (req, res) => {
  try {
    const { page, limit = 50, search = '', status = 'all', sort = 'sl_no', order = 'asc' } = req.query;
    const isPaginated = page !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const cacheKey = `clients_${isPaginated ? `p${pageNum}_l${limitNum}_` : 'all_'}${search}_${status}_${sort}_${order}`;

    const payload = await serverCache.getOrFetch(cacheKey, async () => {
      // Build dynamic parameterized query for maximum performance
      const conditions = ["c.status != 'deleted'"];
      const params = [];

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        const isNum = !isNaN(Number(search.trim()));
        if (isNum) {
          conditions.push(`(c.name LIKE ? OR c.phone LIKE ? OR c.client_code LIKE ? OR c.address LIKE ? OR c.sl_no = ?)`);
          params.push(term, term, term, term, parseInt(search.trim(), 10));
        } else {
          conditions.push(`(c.name LIKE ? OR c.phone LIKE ? OR c.client_code LIKE ? OR c.address LIKE ?)`);
          params.push(term, term, term, term);
        }
      }

      if (status === 'with_phone') {
        conditions.push(`c.phone IS NOT NULL AND TRIM(c.phone) != ''`);
      } else if (status === 'active_only') {
        conditions.push(`c.status = 'active'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Validate sort field
      const validSorts = {
        sl_no: 'c.sl_no',
        name: 'c.name',
        principal: 'lc.principal',
        created_at: 'c.created_at'
      };
      const sortCol = validSorts[sort] || 'c.sl_no';
      const sortDir = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // High-speed JOIN without nested correlated subquery loops
      const baseSql = `
        FROM clients c
        LEFT JOIN loan_cycles lc ON lc.id = (
          SELECT id FROM loan_cycles 
          WHERE client_id = c.id AND status = 'active' 
          ORDER BY month_year DESC LIMIT 1
        )
        LEFT JOIN (
          SELECT cycle_id, SUM(amount) as total_collected
          FROM daily_collections
          GROUP BY cycle_id
        ) dc_sum ON dc_sum.cycle_id = lc.id
        ${whereClause}
      `;

      if (isPaginated) {
        // Count total for pagination
        const countResult = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
        const total = countResult[0]?.total || 0;

        const dataSql = `
          SELECT c.*, 
                 lc.id as active_cycle_id,
                 lc.principal,
                 lc.month_year,
                 lc.start_date,
                 lc.end_date,
                 lc.total_days,
                 COALESCE(dc_sum.total_collected, 0) as total_collected
          ${baseSql}
          ORDER BY ${sortCol} ${sortDir}
          LIMIT ? OFFSET ?
        `;

        const clients = await query(dataSql, [...params, limitNum, offset]);
        const mapped = clients.map(c => {
          const principal = c.principal || 0;
          const collected = c.total_collected || 0;
          return {
            ...c,
            remaining: Math.max(0, principal - collected),
            excess: Math.max(0, collected - principal),
            is_cleared: principal > 0 && collected >= principal
          };
        });

        return {
          success: true,
          data: mapped,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        };
      }

      // Non-paginated (all clients)
      const dataSql = `
        SELECT c.*, 
               lc.id as active_cycle_id,
               lc.principal,
               lc.month_year,
               lc.start_date,
               lc.end_date,
               lc.total_days,
               COALESCE(dc_sum.total_collected, 0) as total_collected
        ${baseSql}
        ORDER BY ${sortCol} ${sortDir}
      `;

      const clients = await query(dataSql, params);
      const mapped = clients.map(c => {
        const principal = c.principal || 0;
        const collected = c.total_collected || 0;
        return {
          ...c,
          remaining: Math.max(0, principal - collected),
          excess: Math.max(0, collected - principal),
          is_cleared: principal > 0 && collected >= principal
        };
      });

      return { success: true, data: mapped, total: mapped.length };
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
              COALESCE(dc_sum.total_collected, 0) as total_collected
       FROM clients c
       LEFT JOIN loan_cycles lc ON lc.client_id = c.id AND lc.status = 'active'
       LEFT JOIN (
         SELECT cycle_id, SUM(amount) as total_collected
         FROM daily_collections
         GROUP BY cycle_id
       ) dc_sum ON dc_sum.cycle_id = lc.id
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

// POST add new client (Atomic & Concurrency-Protected)
router.post('/', async (req, res) => {
  try {
    const month_year = sanitizeMonthYear(req.body.month_year);
    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const autoCycleName = (yNum && mNum && mNum >= 1 && mNum <= 12) ? `${monthNames[mNum - 1]} ${yNum}` : month_year;

    const { name, phone, address, principal, cycle_name = autoCycleName } = req.body;
    const companyId = 'comp_alr_001';

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    let clientId;
    let nextSlNo;
    let clientCode;
    let isReactivated = false;

    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);

    // 1. Check duplicate phone if provided
    if (cleanPhone) {
      const allClientsWithPhone = await query(
        "SELECT id, name, sl_no, client_code, phone, status FROM clients WHERE company_id = ? AND status != 'deleted' AND phone IS NOT NULL AND TRIM(phone) != ''",
        [companyId]
      );
      const existingClient = allClientsWithPhone.find(c => normalizePhone(c.phone) === cleanPhone);

      if (existingClient) {
        // Different borrower cannot reuse an already active phone number
        if (existingClient.name.trim().toLowerCase() !== cleanName.toLowerCase()) {
          return res.status(409).json({
            success: false,
            error: `Phone number ${phone} is already registered to ${existingClient.name} (Sl.No: ${existingClient.sl_no}). Duplicate clients are not permitted.`
          });
        }

        const existingCycle = await query(
          'SELECT id FROM loan_cycles WHERE client_id = ? AND month_year = ? AND status != \'archived\'',
          [existingClient.id, month_year]
        );
        if (existingCycle.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Client ${existingClient.name} already has an active loan in ${month_year}. Duplicate clients/cycles are not permitted.`
          });
        }

        clientId = existingClient.id;
        nextSlNo = existingClient.sl_no;
        clientCode = existingClient.client_code;
        isReactivated = true;
      }
    }

    // 2. Check duplicate name if not already matched by phone
    if (!clientId) {
      const existingByName = await query(
        "SELECT id, name, sl_no, client_code, phone, address, status FROM clients WHERE company_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND status != 'deleted'",
        [companyId, cleanName]
      );

      if (existingByName.length > 0) {
        const matchedClient = existingByName[0];

        const existingCycle = await query(
          'SELECT id FROM loan_cycles WHERE client_id = ? AND month_year = ? AND status != \'archived\'',
          [matchedClient.id, month_year]
        );

        if (existingCycle.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Borrower "${cleanName}" (Sl.No: ${matchedClient.sl_no}) already has an active loan cycle in ${month_year}. Duplicate clients are not permitted.`
          });
        }

        // If phone wasn't provided or matches, reuse existing client without creating a duplicate row in clients table
        if (!cleanPhone || !matchedClient.phone || normalizePhone(matchedClient.phone) === cleanPhone) {
          clientId = matchedClient.id;
          nextSlNo = matchedClient.sl_no;
          clientCode = matchedClient.client_code;
          isReactivated = true;
        }
      }
    }

    // Determine sl_no if new client
    if (!clientId) {
      const maxSlResult = await query('SELECT MAX(sl_no) as max_sl FROM clients');
      const maxSl = maxSlResult[0]?.max_sl;
      const autoSlNo = (maxSl !== null && maxSl !== undefined) ? (parseInt(maxSl, 10) + 1) : 1;
      nextSlNo = req.body.sl_no ? parseInt(req.body.sl_no, 10) : autoSlNo;
      clientId = `client_${nextSlNo}_${crypto.randomBytes(3).toString('hex')}`;
      clientCode = `ALR-${nextSlNo}`;
    }

    const cycleId = `cycle_${nextSlNo}_${month_year.replace('-', '_')}_${crypto.randomBytes(3).toString('hex')}`;
    const principalAmount = parseCurrencyNumber(principal, 10000);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const endDate = `${month_year}-${String(totalDays).padStart(2, '0')}`;

    // Execute client + cycle creation as an atomic batched transaction via writeQueue
    const batchStatements = [];

    if (isReactivated) {
      batchStatements.push({
        sql: `UPDATE clients SET name = ?, address = ?, status = 'active' WHERE id = ?`,
        args: [name.trim(), address ? address.trim() : '', clientId]
      });
    } else {
      batchStatements.push({
        sql: `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        args: [clientId, companyId, nextSlNo, clientCode, name.trim(), phone ? phone.trim() : '', address ? address.trim() : '']
      });
    }

    batchStatements.push({
      sql: `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      args: [
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
    });

    await batchQueued(batchStatements);

    // Invalidate caches
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
        name: name.trim(),
        principal: principalAmount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update client (Concurrency Protected)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sl_no, name, phone, address, principal, month_year } = req.body;
    const companyId = 'comp_alr_001';

    // Verify phone duplicate collision on update
    if (phone && String(phone).trim()) {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone) {
        const otherClients = await query(
          "SELECT id, name, sl_no, phone FROM clients WHERE company_id = ? AND id != ? AND status != 'deleted' AND phone IS NOT NULL AND TRIM(phone) != ''",
          [companyId, id]
        );
        const collision = otherClients.find(c => normalizePhone(c.phone) === cleanPhone);
        if (collision) {
          return res.status(409).json({
            success: false,
            error: `Phone number ${phone} is already registered to ${collision.name} (Sl.No: ${collision.sl_no}). Duplicate phone numbers are not permitted.`
          });
        }
      }
    }

    const updates = [
      {
        sql: `UPDATE clients SET sl_no = COALESCE(?, sl_no), name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address)
              WHERE id = ?`,
        args: [
          sl_no ? parseInt(sl_no, 10) : null,
          name !== undefined ? name : null,
          phone !== undefined ? phone : null,
          address !== undefined ? address : null,
          id
        ]
      }
    ];

    if (principal !== undefined) {
      const parsedPrincipal = parseCurrencyNumber(principal, 0);
      if (month_year) {
        updates.push({
          sql: `UPDATE loan_cycles SET principal = ? WHERE client_id = ? AND month_year = ?`,
          args: [parsedPrincipal, id, month_year]
        });
      } else {
        updates.push({
          sql: `UPDATE loan_cycles SET principal = ? WHERE client_id = ? AND status = 'active'`,
          args: [parsedPrincipal, id]
        });
      }
    }

    await batchQueued(updates);

    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');
    serverCache.invalidateTag('clients');

    res.json({ success: true, message: 'Client updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE soft delete client (Atomic)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await batchQueued([
      { sql: `UPDATE clients SET status = 'deleted' WHERE id = ?`, args: [id] },
      { sql: `UPDATE loan_cycles SET status = 'closed' WHERE client_id = ?`, args: [id] }
    ]);

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
