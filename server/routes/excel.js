import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { query, execute, batch } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';

const router = Router();
const XLSX = xlsx.default || xlsx;

// Helper: Convert 0-indexed column number to Excel column letters (0->'A', 6->'G', 33->'AH', 36->'AK', etc.)
function colToLetter(col) {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode((c % 26) + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

// Setup upload directory for Excel files
const uploadDir = path.resolve('data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `import_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// GET download blank pre-formatted Excel template with formulas for the actual month's days
router.get('/template', (req, res) => {
  try {
    const month_year = req.query.month_year || '2026-05';
    const [year, month] = month_year.split('-');
    const yNum = parseInt(year, 10);
    const mNum = parseInt(month, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthLabel = `${monthNames[mNum - 1] || 'MAY'} - ${year}`;

    const data = [];

    // Row 1: Register Title
    data.push(['DAILY COLLECTION REGISTER ( ALR) ']);

    // Row 2: Month / Year summary
    const totalCols = 11 + totalDays;
    const row2 = new Array(totalCols).fill('');
    row2[0] = 'MONTH / YEAR';
    row2[2] = monthLabel;
    row2[5] = 'PRINCIPAL: 10,000';
    data.push(row2);

    // Row 3: Headers
    const headers = [
      'Sl.No',
      'Month /\nYear',
      'Name',
      'Phone\nNumber',
      'Address',
      'Principal\nAmount'
    ];
    for (let d = 1; d <= totalDays; d++) {
      headers.push(d);
    }
    headers.push(
      `Total\n(${totalDays} Days)`,
      'Remaining\n(Principal-Total)',
      'Excess\n(+Amount)',
      'Close\nDate',
      'Remaining\n(COPY -> Paste\nVALUES next month)'
    );
    data.push(headers);

    // Dynamic formula column letters based on totalDays
    const firstDayCol = 'G'; // col 6
    const lastDayCol = colToLetter(5 + totalDays);
    const totalCol = colToLetter(6 + totalDays);
    const remCol = colToLetter(7 + totalDays);

    // Row 4: Sample Client Row with Formulas
    const sampleRow = [
      1,
      `01.${month}.${year}`,
      'மாதிரி வாடிக்கையாளர் (Sample Borrower)',
      '9876543210',
      'அலங்காநல்லூர் (Alanganallur)',
      10000
    ];
    // Fill sample collections: 350 for first 3 days, rest blank
    for (let d = 1; d <= totalDays; d++) {
      sampleRow.push(d <= 3 ? 350 : '');
    }
    sampleRow.push({ t: 'n', f: `SUM(${firstDayCol}4:${lastDayCol}4)`, v: 1050 });
    sampleRow.push({ t: 'n', f: `IF(F4-${totalCol}4<0,0,F4-${totalCol}4)`, v: 8950 });
    sampleRow.push({ t: 'n', f: `IF(${totalCol}4-F4>0,${totalCol}4-F4,0)`, v: 0 });
    sampleRow.push('');
    sampleRow.push({ t: 'n', f: `${remCol}4`, v: 8950 });
    data.push(sampleRow);

    // Rows 5-25: 20 Pre-formatted blank rows with active formulas
    for (let i = 5; i <= 25; i++) {
      const blankRow = [i - 3, `01.${month}.${year}`, '', '', '', 10000];
      for (let d = 1; d <= totalDays; d++) blankRow.push('');
      blankRow.push({ t: 'n', f: `SUM(${firstDayCol}${i}:${lastDayCol}${i})`, v: 0 });
      blankRow.push({ t: 'n', f: `IF(F${i}-${totalCol}${i}<0,0,F${i}-${totalCol}${i})`, v: 10000 });
      blankRow.push({ t: 'n', f: `IF(${totalCol}${i}-F${i}>0,${totalCol}${i}-F${i},0)`, v: 0 });
      blankRow.push('');
      blankRow.push({ t: 'n', f: `${remCol}${i}`, v: 10000 });
      data.push(blankRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merged header ranges matching ALR register
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Month label
      { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } }, // Month value
      { s: { r: 1, c: 5 }, e: { r: 1, c: Math.min(9, totalCols - 1) } }  // Principal summary
    ];

    // Set Column Widths matching ALR template
    ws['!cols'] = [
      { wch: 8 },  // Sl.No
      { wch: 14 }, // Date
      { wch: 28 }, // Name
      { wch: 16 }, // Phone
      { wch: 24 }, // Address
      { wch: 14 }, // Principal
      ...new Array(totalDays).fill({ wch: 6 }), // Days 1..totalDays
      { wch: 12 }, // Total
      { wch: 14 }, // Remaining
      { wch: 12 }, // Excess
      { wch: 12 }, // Close Date
      { wch: 14 }  // Remaining copy
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection Register');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ALR_Collection_Register_Template_${month_year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET export ALR-formatted Excel sheet for the actual month's days
router.get('/export', async (req, res) => {
  try {
    const month_year = req.query.month_year || '2026-05';
    const companyId = 'comp_alr_001';

    const [year, month] = month_year.split('-');
    const yNum = parseInt(year, 10);
    const mNum = parseInt(month, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const totalCols = 11 + totalDays;

    const firstDayCol = 'G'; // col 6
    const lastDayCol = colToLetter(5 + totalDays);
    const totalCol = colToLetter(6 + totalDays);
    const remCol = colToLetter(7 + totalDays);

    // 1. Fetch cycles and client data
    const cycles = await query(
      `SELECT lc.id as cycle_id,
              lc.principal,
              lc.start_date,
              lc.close_date,
              c.id as client_id,
              c.sl_no,
              c.name,
              c.phone,
              c.address
       FROM loan_cycles lc
       JOIN clients c ON c.id = lc.client_id
       WHERE lc.company_id = ? AND lc.month_year = ? AND c.status != 'deleted' AND lc.status != 'archived'
       ORDER BY c.sl_no ASC`,
      [companyId, month_year]
    );

    // 2. Fetch collections for this month
    const collections = await query(
      `SELECT cycle_id, day_number, amount
       FROM daily_collections
       WHERE company_id = ? AND cycle_id IN (${cycles.map(() => '?').join(',') || "''"})`,
      [companyId, ...cycles.map(c => c.cycle_id)]
    );

    const collectionsByCycle = {};
    collections.forEach(col => {
      if (!collectionsByCycle[col.cycle_id]) collectionsByCycle[col.cycle_id] = {};
      collectionsByCycle[col.cycle_id][col.day_number] = col.amount;
    });

    // 3. Build Sheet Array matching ALR structure
    const data = [];

    // Row 1: Title
    data.push(['DAILY COLLECTION REGISTER ( ALR) ']);

    // Row 2: Month / Year summary
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthLabel = `${monthNames[mNum - 1] || 'MAY'} - ${year}`;
    const totalPrincipal = cycles.reduce((sum, c) => sum + (c.principal || 0), 0);

    const row2 = new Array(totalCols).fill('');
    row2[0] = 'MONTH / YEAR';
    row2[2] = monthLabel;
    row2[5] = `PRINCIPAL: ${totalPrincipal.toLocaleString('en-IN')}`;
    data.push(row2);

    // Row 3: Headers
    const headers = [
      'Sl.No',
      'Month /\nYear',
      'Name',
      'Phone\nNumber',
      'Address',
      'Principal\nAmount'
    ];
    for (let d = 1; d <= totalDays; d++) {
      headers.push(d);
    }
    headers.push(
      `Total\n(${totalDays} Days)`,
      'Remaining\n(Principal-Total)',
      'Excess\n(+Amount)',
      'Close\nDate',
      'Remaining\n(COPY -> Paste\nVALUES next month)'
    );
    data.push(headers);

    // Row 4+: Client rows
    cycles.forEach((c, idx) => {
      const rowIdx = 4 + idx; // 1-based index in Excel
      const clientCols = collectionsByCycle[c.cycle_id] || {};
      const row = [];

      row.push(c.sl_no || idx + 1);
      row.push(c.start_date || `01.${month}.${year}`);
      row.push(c.name);
      row.push(c.phone || '');
      row.push(c.address || '');
      row.push(c.principal);

      let totalCollected = 0;
      for (let d = 1; d <= totalDays; d++) {
        const amt = clientCols[d] || '';
        row.push(amt);
        if (typeof amt === 'number') totalCollected += amt;
      }

      const remaining = Math.max(0, c.principal - totalCollected);
      const excess = Math.max(0, totalCollected - c.principal);

      // Formulas for Excel dynamically referencing exact column letters
      row.push({ t: 'n', f: `SUM(${firstDayCol}${rowIdx}:${lastDayCol}${rowIdx})`, v: totalCollected });
      row.push({ t: 'n', f: `IF(F${rowIdx}-${totalCol}${rowIdx}<0,0,F${rowIdx}-${totalCol}${rowIdx})`, v: remaining });
      row.push({ t: 'n', f: `IF(${totalCol}${rowIdx}-F${rowIdx}>0,${totalCol}${rowIdx}-F${rowIdx},0)`, v: excess });
      row.push(c.close_date || '');
      row.push({ t: 'n', f: `${remCol}${rowIdx}`, v: remaining });

      data.push(row);
    });

    // 4. Create Workbook and Worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merged header ranges matching ALR register
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Month label
      { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } }, // Month value
      { s: { r: 1, c: 5 }, e: { r: 1, c: Math.min(9, totalCols - 1) } }  // Principal summary
    ];

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Sl.No
      { wch: 14 }, // Date
      { wch: 28 }, // Name
      { wch: 16 }, // Phone
      { wch: 24 }, // Address
      { wch: 14 }, // Principal
      ...new Array(totalDays).fill({ wch: 6 }), // Days 1..totalDays
      { wch: 12 }, // Total
      { wch: 14 }, // Remaining
      { wch: 12 }, // Excess
      { wch: 12 }, // Close Date
      { wch: 14 }  // Remaining copy
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection Register');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ALR_Collection_Register_${month_year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST validate & interactive preview of uploaded Excel file
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file uploaded' });
    }

    const companyId = 'comp_alr_001';
    const filePath = req.file.path;
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rows || rows.length < 3) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      return res.status(400).json({
        success: false,
        error: 'Invalid file: Sheet has insufficient rows for ALR register.'
      });
    }

    // Determine target month and days from request or sheet
    const month_year = req.body?.month_year || '2026-05';
    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

    // Existing clients from DB to check for duplicate phone numbers
    const dbClients = await query(
      "SELECT id, sl_no, name, phone FROM clients WHERE company_id = ? AND status != 'deleted'",
      [companyId]
    );
    const dbPhoneMap = new Map();
    dbClients.forEach(c => {
      if (c.phone) {
        const clean = String(c.phone).replace(/[^0-9]/g, '');
        if (clean) dbPhoneMap.set(clean, c);
      }
    });

    const seenSheetPhones = new Map();
    const warnings = [];
    const previewRows = [];
    let totalPrincipal = 0;
    let totalCollections = 0;
    let validRows = 0;
    let duplicatePhonesCount = 0;

    // Data starts at row index 3 (Row 4 in Excel)
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const slNo = row[0] ? parseInt(row[0], 10) : i - 2;
      const date = row[1] ? String(row[1]).trim() : '';
      const name = row[2] ? String(row[2]).trim() : '';
      const phone = row[3] ? String(row[3]).trim().replace(/[^0-9]/g, '') : '';
      const address = row[4] ? String(row[4]).trim() : '';
      const principal = row[5] ? parseFloat(row[5]) || 0 : 0;

      // Skip completely empty rows
      if (!name && !phone && principal === 0) continue;

      const rowIssues = [];
      let status = 'valid';

      if (!name) {
        rowIssues.push('Missing Name (பெயர் இல்லை)');
        status = 'invalid';
      }

      // Check phone duplicates
      if (phone) {
        if (seenSheetPhones.has(phone)) {
          const prevRow = seenSheetPhones.get(phone);
          rowIssues.push(`Duplicate phone in sheet with row ${prevRow} (${phone})`);
          status = 'warning';
          duplicatePhonesCount++;
        } else {
          seenSheetPhones.set(phone, i + 1);
        }

        if (dbPhoneMap.has(phone)) {
          const match = dbPhoneMap.get(phone);
          rowIssues.push(`Phone already registered to ${match.name} (#${match.sl_no})`);
          if (status !== 'invalid') status = 'warning';
          duplicatePhonesCount++;
        }
      }

      // Sum collections for actual days of this month (1..totalDays)
      let rowCollectionSum = 0;
      const dayEntries = [];
      for (let d = 1; d <= totalDays; d++) {
        const val = row[5 + d];
        if (val !== undefined && val !== '' && val !== null) {
          const amt = parseFloat(val);
          if (!isNaN(amt) && amt > 0) {
            rowCollectionSum += amt;
            dayEntries.push({ day: d, amount: amt });
          }
        }
      }

      if (status !== 'invalid') validRows++;
      totalPrincipal += principal;
      totalCollections += rowCollectionSum;

      if (rowIssues.length > 0) {
        warnings.push({
          row_index: i + 1,
          name: name || 'Unnamed',
          phone,
          issues: rowIssues
        });
      }

      previewRows.push({
        row_index: i + 1,
        sl_no: slNo,
        date,
        name,
        phone,
        address,
        principal,
        collected_days_count: dayEntries.length,
        total_collected: rowCollectionSum,
        remaining: Math.max(0, principal - rowCollectionSum),
        status,
        issues: rowIssues
      });
    }

    // Clean up temporary uploaded file
    try { fs.unlinkSync(filePath); } catch (_) {}

    res.json({
      success: true,
      filename: req.file.originalname,
      total_days: totalDays,
      summary: {
        total_rows: previewRows.length,
        valid_rows: validRows,
        duplicate_phones_count: duplicatePhonesCount,
        total_principal: totalPrincipal,
        total_collections: totalCollections,
        warnings_count: warnings.length
      },
      warnings,
      preview_rows: previewRows
    });
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST import Excel register for the actual month's days
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file uploaded' });
    }

    const month_year = req.body.month_year || '2026-05';
    const cycle_name = req.body.cycle_name || `${month_year} Cycle`;
    const companyId = 'comp_alr_001';

    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const endDate = `${month_year}-${String(totalDays).padStart(2, '0')}`;

    const filePath = req.file.path;
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let importedClients = 0;
    let importedCollections = 0;
    const collectionStatements = [];

    // Data rows start from row index 3 (Row 4 in Excel)
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[2]) continue; // Name is mandatory

      const slNo = row[0] ? parseInt(row[0], 10) : i;
      const name = String(row[2]).trim();
      const phone = row[3] ? String(row[3]).trim() : '';
      const address = row[4] ? String(row[4]).trim() : '';
      const principal = row[5] ? parseFloat(row[5]) : 10000;

      if (!name) continue;

      // Upsert client
      let clientId;
      const existingClient = await query(
        'SELECT id FROM clients WHERE company_id = ? AND (sl_no = ? OR (phone != \'\' AND phone = ?))',
        [companyId, slNo, phone]
      );

      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
        await execute(
          `UPDATE clients SET name = ?, phone = ?, address = ? WHERE id = ?`,
          [name, phone, address, clientId]
        );
      } else {
        clientId = `client_${slNo}_${crypto.randomBytes(3).toString('hex')}`;
        await execute(
          `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [clientId, companyId, slNo, `ALR-${slNo}`, name, phone, address]
        );
        importedClients++;
      }

      // Upsert loan cycle with exact total_days and endDate
      let cycleId;
      const existingCycle = await query(
        'SELECT id FROM loan_cycles WHERE company_id = ? AND client_id = ? AND month_year = ?',
        [companyId, clientId, month_year]
      );

      if (existingCycle.length > 0) {
        cycleId = existingCycle[0].id;
        await execute(
          'UPDATE loan_cycles SET principal = ?, total_days = ?, end_date = ? WHERE id = ?',
          [principal, totalDays, endDate, cycleId]
        );
      } else {
        cycleId = `cycle_${slNo}_${month_year.replace('-', '_')}`;
        await execute(
          `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [cycleId, companyId, clientId, month_year, cycle_name, principal, `${month_year}-01`, endDate, totalDays]
        );
      }

      // Read day columns strictly up to totalDays
      for (let d = 1; d <= totalDays; d++) {
        const val = row[5 + d];
        if (val !== undefined && val !== null && val !== '') {
          const amount = parseFloat(val);
          if (amount > 0) {
            const dayPadded = String(d).padStart(2, '0');
            const colDate = `${month_year}-${dayPadded}`;
            const collId = `coll_${cycleId}_d${d}`;

            collectionStatements.push({
              sql: `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'ExcelImport')
                    ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount`,
              args: [collId, companyId, cycleId, clientId, d, colDate, amount]
            });
            importedCollections++;
          }
        }
      }
    }

    // Execute collection statements in batches of 50 for rapid import
    for (let i = 0; i < collectionStatements.length; i += 50) {
      const chunk = collectionStatements.slice(i, i + 50);
      if (chunk.length > 0) {
        await batch(chunk);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}

    serverCache.invalidateTag('grid');
    serverCache.invalidateTag('months');
    serverCache.invalidateTag('reports');

    res.json({
      success: true,
      message: `Successfully imported ${importedClients} clients and ${importedCollections} daily collection entries for ${month_year} (${totalDays} days).`,
      stats: { importedClients, importedCollections, totalDays }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
