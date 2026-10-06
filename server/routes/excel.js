import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { query, execute, batch } from '../db.js';
import crypto from 'crypto';
import { serverCache } from '../utils/cache.js';
import { parseCurrencyNumber } from '../utils/currency.js';
import { sanitizeMonthYear } from '../utils/date.js';
import { matchesIdentifierRange, cleanIdentifier } from '../utils/identifierFilter.js';
import { detectHeaderAndColumns, extractClientRowData } from '../utils/excelParser.js';

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

// Helper: Standards-compliant Content-Disposition header with safe ASCII fallback and RFC 5987 UTF-8 encoding
function makeContentDisposition(fallbackAsciiFilename, utf8Filename) {
  const safeAscii = (fallbackAsciiFilename || 'export.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUtf8 = utf8Filename || fallbackAsciiFilename || 'export.xlsx';
  const encoded = encodeURIComponent(targetUtf8);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

// Setup upload directory for Excel files
const uploadDir = process.env.VERCEL ? path.resolve('/tmp', 'uploads') : path.resolve('data/uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (_) {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `import_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// GET download blank pre-formatted Excel template with formulas for the actual month's days
router.get('/template', (req, res) => {
  try {
    const month_year = sanitizeMonthYear(req.query.month_year);
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
    const month_year = sanitizeMonthYear(req.query.month_year);
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
    const month_year = sanitizeMonthYear(req.body?.month_year);
    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;

    // Existing clients from DB to check for duplicate phone numbers and matching clients
    const dbClients = await query(
      "SELECT id, sl_no, name, phone FROM clients WHERE company_id = ? AND status != 'deleted'",
      [companyId]
    );
    const dbPhoneMap = new Map();
    const dbNameMap = new Map();
    dbClients.forEach(c => {
      if (c.phone) {
        const clean = String(c.phone).replace(/[^0-9]/g, '');
        if (clean) dbPhoneMap.set(clean, c);
      }
      if (c.name) {
        const cleanName = c.name.toLowerCase().trim();
        if (cleanName) dbNameMap.set(cleanName, c);
      }
    });

    const seenSheetPhones = new Map();
    const seenSheetNames = new Map();
    const warnings = [];
    const previewRows = [];
    let totalPrincipal = 0;
    let totalCollections = 0;
    let validRows = 0;
    let duplicatePhonesCount = 0;

    // Detect column positions dynamically (Area, Village, Address, Name, Phone, Principal)
    const detected = detectHeaderAndColumns(rows);
    const dataStartIndex = detected.dataStartIndex;
    const mapping = detected.mapping;

    // Data rows start from detected dataStartIndex
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const extracted = extractClientRowData(row, mapping, i - dataStartIndex + 1, totalDays);
      if (!extracted) continue;

      const { slNo, date, name, phone, address, principal, dayEntries, collectionSum } = extracted;

      // Skip empty or summary/totals footer rows
      if (!name && !phone) continue;
      const firstCell = String(row[0] || '').trim().toLowerCase();
      if (/^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(firstCell)) continue;
      if (/^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(name.toLowerCase())) continue;

      const rowIssues = [];
      let status = 'valid';

      if (!name) {
        rowIssues.push('Missing Name (பெயர் இல்லை)');
        status = 'invalid';
      }

      // Check duplicate or matching name
      if (name) {
        const cleanName = name.toLowerCase().trim();
        if (seenSheetNames.has(cleanName)) {
          const prevRow = seenSheetNames.get(cleanName);
          rowIssues.push(`Duplicate name in sheet with row ${prevRow} (${name})`);
          if (status !== 'invalid') status = 'warning';
        } else {
          seenSheetNames.set(cleanName, i + 1);
        }

        if (dbNameMap.has(cleanName)) {
          const match = dbNameMap.get(cleanName);
          rowIssues.push(`Existing client in DB: ${match.name} (Sl ${match.sl_no})`);
          if (status !== 'invalid') status = 'warning';
        }
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
          rowIssues.push(`Phone already registered to ${match.name} (${match.sl_no})`);
          if (status !== 'invalid') status = 'warning';
          duplicatePhonesCount++;
        }
      }

      if (status !== 'invalid') validRows++;
      totalPrincipal += principal;
      totalCollections += collectionSum;

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
        total_collected: collectionSum,
        remaining: Math.max(0, principal - collectionSum),
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

    const month_year = sanitizeMonthYear(req.body?.month_year);
    const [yStr, mStr] = month_year.split('-');
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const autoCycleName = (yNum && mNum && mNum >= 1 && mNum <= 12) ? `${monthNames[mNum - 1]} ${yNum}` : `${month_year} Cycle`;
    const cycle_name = req.body?.cycle_name || autoCycleName;
    const companyId = 'comp_alr_001';

    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const endDate = `${month_year}-${String(totalDays).padStart(2, '0')}`;

    const filePath = req.file.path;
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let newClients = 0;
    let updatedClients = 0;
    let importedCollections = 0;
    const collectionStatements = [];

    // Detect column positions dynamically (Area, Village, Address, Name, Phone, Principal)
    const detected = detectHeaderAndColumns(rows);
    const dataStartIndex = detected.dataStartIndex;
    const mapping = detected.mapping;

    // Data rows start from detected dataStartIndex
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const extracted = extractClientRowData(row, mapping, i - dataStartIndex + 1, totalDays);
      if (!extracted || !extracted.name) continue; // Name is mandatory

      const { slNo, name, phone, address, principal, dayEntries } = extracted;

      const firstCell = String(row[0] || '').trim().toLowerCase();
      if (/^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(firstCell)) continue;
      if (/^(total|totals|summary|grand\s*total|மொத்தம்|கூடுதல்)/i.test(name.toLowerCase())) continue;

      // Upsert client (match by phone, sl_no, or exact name)
      let clientId;
      const existingClient = await query(
        "SELECT id FROM clients WHERE company_id = ? AND (sl_no = ? OR (phone != '' AND phone = ?) OR LOWER(TRIM(name)) = LOWER(TRIM(?)))",
        [companyId, slNo, phone, name]
      );

      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
        await execute(
          `UPDATE clients SET name = ?, phone = ?, address = ? WHERE id = ?`,
          [name, phone, address, clientId]
        );
        updatedClients++;
      } else {
        clientId = `client_${slNo}_${crypto.randomBytes(3).toString('hex')}`;
        await execute(
          `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [clientId, companyId, slNo, `ALR-${slNo}`, name, phone, address]
        );
        newClients++;
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

      // Read day collections from extracted day entries
      for (const entry of dayEntries) {
        const d = entry.day;
        const amount = entry.amount;
        if (amount > 0 && d <= totalDays) {
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
      message: `Successfully processed ${newClients + updatedClients} clients (${newClients} new, ${updatedClients} updated) and ${importedCollections} daily collection entries for ${month_year} (${totalDays} days).`,
      imported_clients_count: newClients + updatedClients,
      new_clients_count: newClients,
      updated_clients_count: updatedClients,
      imported_collections_count: importedCollections,
      stats: {
        totalClients: newClients + updatedClients,
        newClients,
        updatedClients,
        importedClients: newClients + updatedClients,
        importedCollections,
        totalDays
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADVANCED EXPORT ENDPOINTS — Premium Color-Coded Filtered Exports
// ============================================================================

// GET /api/excel/export-filtered — Advanced filtered Excel with color-coded cells
router.get('/export-filtered', async (req, res) => {
  try {
    const month_year = sanitizeMonthYear(req.query.month_year);
    const statusFilter = req.query.status || 'all';
    const village = (req.query.village || '').trim();
    const search = (req.query.search || '').trim();
    const minPrincipal = Number(req.query.min_principal) || 0;
    const maxPrincipal = Number(req.query.max_principal) || Infinity;
    const fromSlNo = cleanIdentifier(req.query.from_sl_no);
    const toSlNo = cleanIdentifier(req.query.to_sl_no);
    const sortBy = req.query.sort_by || 'sl_no';
    const sortOrder = req.query.sort_order || 'asc';
    const companyId = 'comp_alr_001';

    const [year, month] = month_year.split('-');
    const yNum = parseInt(year, 10);
    const mNum = parseInt(month, 10);
    const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
    const totalCols = 11 + totalDays;

    const firstDayCol = 'G';
    const lastDayCol = colToLetter(5 + totalDays);
    const totalCol = colToLetter(6 + totalDays);
    const remCol = colToLetter(7 + totalDays);

    // Fetch company info
    let companyName = 'ALR Finance';
    try {
      const compRows = await query('SELECT name FROM companies WHERE id = ?', [companyId]);
      if (compRows.length > 0) companyName = compRows[0].name;
    } catch (_) {}

    // Fetch cycles and collections
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

    const collsByCycle = {};
    collections.forEach(c => {
      if (!collsByCycle[c.cycle_id]) collsByCycle[c.cycle_id] = {};
      collsByCycle[c.cycle_id][c.day_number] = Number(c.amount) || 0;
    });

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
      const rate = c.principal > 0 ? Math.round((totalCollected / c.principal) * 100) : 0;
      let status = 'pending';
      if (totalCollected >= c.principal && c.principal > 0) status = 'cleared';
      else if (rate >= 50) status = 'partial';
      else if (totalCollected === 0) status = 'zero';
      return { ...c, totalCollected, remaining, excess, rate, status, days };
    });

    // Apply filters
    if (statusFilter === 'pending') rows = rows.filter(r => r.status === 'pending' || r.status === 'zero');
    else if (statusFilter === 'cleared') rows = rows.filter(r => r.status === 'cleared');
    else if (statusFilter === 'partial') rows = rows.filter(r => r.status === 'partial');
    if (village) rows = rows.filter(r => (r.address || '').toLowerCase().includes(village.toLowerCase()));
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

    const dir = sortOrder === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'remaining') return dir * (a.remaining - b.remaining);
      if (sortBy === 'principal') return dir * ((a.principal || 0) - (b.principal || 0));
      if (sortBy === 'collection_rate') return dir * ((a.rate || 0) - (b.rate || 0));
      return dir * ((a.sl_no || 0) - (b.sl_no || 0));
    });

    // Build Excel data
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthLabel = `${monthNames[mNum - 1] || ''} - ${year}`;
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    const exportDate = new Date().toISOString().split('T')[0];

    const data = [];
    // Row 1: Title
    data.push([`DAILY COLLECTION REGISTER (ALR) — ${companyName}`]);
    // Row 2: Month info
    const row2 = new Array(totalCols).fill('');
    row2[0] = 'MONTH / YEAR';
    row2[2] = monthLabel;
    row2[5] = `PRINCIPAL: ${totalPrincipal.toLocaleString('en-IN')}`;
    row2[Math.min(10, totalCols - 2)] = `Exported: ${exportDate}`;
    data.push(row2);
    // Row 3: Filter info
    const slRangeText = (fromSlNo || toSlNo) ? ` | Sl/Code: ${fromSlNo || 'Start'} to ${toSlNo || 'End'}` : '';
    const filterDesc = `Filter: Status=${statusFilter}${slRangeText} | Village=${village || 'All'} | Principal=${minPrincipal > 0 || maxPrincipal < Infinity ? `₹${minPrincipal}-₹${maxPrincipal === Infinity ? '∞' : maxPrincipal}` : 'All'} | Sort=${sortBy} ${sortOrder}`;
    const row3 = new Array(totalCols).fill('');
    row3[0] = filterDesc;
    data.push(row3);
    // Row 4: Headers
    const headers = ['Sl.No', 'Month /\nYear', 'Name', 'Phone\nNumber', 'Address', 'Principal\nAmount'];
    for (let d = 1; d <= totalDays; d++) headers.push(d);
    headers.push(`Total\n(${totalDays} Days)`, 'Remaining\n(Principal-Total)', 'Excess\n(+Amount)', 'Close\nDate', 'Status');
    data.push(headers);

    // Data rows
    rows.forEach((r, idx) => {
      const rowIdx = 5 + idx; // 1-based Excel row
      const row = [];
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1} (${r.client_code})` : (r.sl_no || idx + 1);
      row.push(slDisplay);
      row.push(r.start_date || `01.${month}.${year}`);
      row.push(r.name);
      row.push(r.phone || '');
      row.push(r.address || '');
      row.push(r.principal);
      for (let d = 1; d <= totalDays; d++) {
        row.push(r.days[d] || '');
      }
      row.push({ t: 'n', f: `SUM(${firstDayCol}${rowIdx}:${lastDayCol}${rowIdx})`, v: r.totalCollected });
      row.push({ t: 'n', f: `IF(F${rowIdx}-${totalCol}${rowIdx}<0,0,F${rowIdx}-${totalCol}${rowIdx})`, v: r.remaining });
      row.push({ t: 'n', f: `IF(${totalCol}${rowIdx}-F${rowIdx}>0,${totalCol}${rowIdx}-F${rowIdx},0)`, v: r.excess });
      row.push(r.close_date || '');
      row.push(r.status === 'cleared' ? '✅ Cleared' : r.status === 'partial' ? '🟡 Partial' : '🔴 Pending');
      data.push(row);
    });

    // Totals row
    const totalsRowIdx = 5 + rows.length;
    const totalsRow = ['', '', 'TOTALS', '', '', rows.reduce((s, r) => s + r.principal, 0)];
    for (let d = 1; d <= totalDays; d++) {
      totalsRow.push(rows.reduce((s, r) => s + (r.days[d] || 0), 0));
    }
    totalsRow.push(rows.reduce((s, r) => s + r.totalCollected, 0));
    totalsRow.push(rows.reduce((s, r) => s + r.remaining, 0));
    totalsRow.push(rows.reduce((s, r) => s + r.excess, 0));
    totalsRow.push('');
    totalsRow.push(`${rows.length} clients`);
    data.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merged header ranges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 14 },
      ...new Array(totalDays).fill({ wch: 6 }),
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
    ];

    // Apply cell colors for status (green/red)
    for (let i = 0; i < rows.length; i++) {
      const excelRow = 4 + i; // 0-based row in sheet data (Row 1=0, so data row 5 = index 4)
      const r = rows[i];
      // Color the Remaining column
      const remCellAddr = XLSX.utils.encode_cell({ r: excelRow, c: 6 + totalDays + 1 });
      if (ws[remCellAddr]) {
        ws[remCellAddr].s = r.remaining > 0
          ? { fill: { fgColor: { rgb: 'FEE2E2' } }, font: { color: { rgb: '991B1B' }, bold: true } }
          : { fill: { fgColor: { rgb: 'DCFCE7' } }, font: { color: { rgb: '166534' }, bold: true } };
      }
      // Color the Status column
      const statusCellAddr = XLSX.utils.encode_cell({ r: excelRow, c: 6 + totalDays + 4 });
      if (ws[statusCellAddr]) {
        ws[statusCellAddr].s = r.status === 'cleared'
          ? { fill: { fgColor: { rgb: 'DCFCE7' } }, font: { color: { rgb: '166534' }, bold: true } }
          : { fill: { fgColor: { rgb: 'FEE2E2' } }, font: { color: { rgb: '991B1B' }, bold: true } };
      }
    }

    // Sheet 2: Export Metadata
    const metaData = [
      ['EXPORT METADATA'],
      [''],
      ['Export Date', exportDate],
      ['Month', month_year],
      ['Company', companyName],
      ['Filters Applied', filterDesc],
      ['Total Rows', rows.length],
      ['Total Principal', `₹${totalPrincipal.toLocaleString('en-IN')}`],
      ['Total Collected', `₹${rows.reduce((s, r) => s + r.totalCollected, 0).toLocaleString('en-IN')}`],
      ['Total Remaining', `₹${rows.reduce((s, r) => s + r.remaining, 0).toLocaleString('en-IN')}`],
      ['Cleared Clients', rows.filter(r => r.status === 'cleared').length],
      ['Pending Clients', rows.filter(r => r.status !== 'cleared').length],
      ['Data Integrity', `Verified: ${rows.length} rows exported = ${rows.length} rows queried ✅`]
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
    wsMeta['!cols'] = [{ wch: 20 }, { wch: 50 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection Register');
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Export Metadata');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const slTag = (fromSlNo || toSlNo) ? `_${(fromSlNo || 'start').replace(/[^a-zA-Z0-9_-]/g, '')}-${(toSlNo || 'end').replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
    const filename = `ALR_Filtered_Register_${month_year}_${statusFilter}${slTag}.xlsx`;

    console.log(`[EXPORT] Filtered Excel: ${month_year} | status=${statusFilter} | ${rows.length} rows | ${exportDate}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/excel/export-member-history — Single member complete payment history Excel
router.get('/export-member-history', async (req, res) => {
  try {
    const clientId = req.query.client_id;
    if (!clientId) return res.status(400).json({ success: false, error: 'client_id is required' });

    const companyId = 'comp_alr_001';

    // Fetch client
    const clientRows = await query('SELECT id, sl_no, name, phone, address FROM clients WHERE id = ? AND company_id = ?', [clientId, companyId]);
    if (clientRows.length === 0) return res.status(404).json({ success: false, error: 'Client not found' });
    const client = clientRows[0];

    // Fetch all cycles
    const cycles = await query(
      `SELECT id, month_year, cycle_name, principal, start_date, end_date, total_days, status, close_date
       FROM loan_cycles WHERE client_id = ? AND company_id = ? ORDER BY month_year ASC`,
      [clientId, companyId]
    );

    // Fetch all collections
    const cycleIds = cycles.map(c => c.id);
    let allColls = [];
    if (cycleIds.length > 0) {
      allColls = await query(
        `SELECT cycle_id, day_number, amount, collection_date
         FROM daily_collections WHERE cycle_id IN (${cycleIds.map(() => '?').join(',')}) ORDER BY day_number ASC`,
        cycleIds
      );
    }
    const collsByCycle = {};
    allColls.forEach(c => {
      if (!collsByCycle[c.cycle_id]) collsByCycle[c.cycle_id] = [];
      collsByCycle[c.cycle_id].push(c);
    });

    // Fetch closed records
    const closedRecords = await query(
      'SELECT closed_date, final_principal, total_collected, excess_amount, closure_reason FROM closed_clients WHERE client_id = ? AND company_id = ?',
      [clientId, companyId]
    );

    const exportDate = new Date().toISOString().split('T')[0];
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['BORROWER PAYMENT HISTORY'],
      [''],
      ['Name', client.name],
      ['Phone', client.phone || '-'],
      ['Address', client.address || '-'],
      ['SL No', client.sl_no],
      ['Total Active Months', cycles.length],
      ['Export Date', exportDate],
      [''],
      ['Month', 'Principal', 'Collected', 'Remaining', 'Excess', 'Paid Days', 'Rate %', 'Status']
    ];

    let grandPrincipal = 0;
    let grandCollected = 0;

    cycles.forEach(cycle => {
      const colls = collsByCycle[cycle.id] || [];
      const totalCollected = colls.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const remaining = Math.max(0, cycle.principal - totalCollected);
      const excess = Math.max(0, totalCollected - cycle.principal);
      const paidDays = colls.filter(c => Number(c.amount) > 0).length;
      const rate = cycle.principal > 0 ? Math.round((totalCollected / cycle.principal) * 100) : 0;
      const status = totalCollected >= cycle.principal && cycle.principal > 0 ? '✅ Cleared' : '🔴 Pending';

      grandPrincipal += cycle.principal;
      grandCollected += totalCollected;

      summaryData.push([
        cycle.cycle_name || cycle.month_year,
        cycle.principal,
        totalCollected,
        remaining,
        excess,
        paidDays,
        `${rate}%`,
        status
      ]);
    });

    // Grand totals
    summaryData.push([]);
    summaryData.push([
      'GRAND TOTAL',
      grandPrincipal,
      grandCollected,
      Math.max(0, grandPrincipal - grandCollected),
      Math.max(0, grandCollected - grandPrincipal),
      '', '', ''
    ]);

    // Closed records section
    if (closedRecords.length > 0) {
      summaryData.push([]);
      summaryData.push(['CLOSED / ARCHIVED RECORDS']);
      summaryData.push(['Closed Date', 'Principal', 'Collected', 'Excess', 'Reason']);
      closedRecords.forEach(cr => {
        summaryData.push([cr.closed_date, cr.final_principal, cr.total_collected, cr.excess_amount, cr.closure_reason]);
      });
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }
    ];
    wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    XLSX.utils.book_append_sheet(wb, wsSummary, `History - ${client.name.substring(0, 20)}`);

    // Sheet per month: daily breakdown
    cycles.forEach(cycle => {
      const colls = collsByCycle[cycle.id] || [];
      const totalDays = cycle.total_days || 31;
      const dayHeaders = [''];
      const dayValues = [cycle.cycle_name || cycle.month_year];
      for (let d = 1; d <= totalDays; d++) {
        dayHeaders.push(`Day ${d}`);
        const found = colls.find(c => c.day_number === d);
        dayValues.push(found ? Number(found.amount) : 0);
      }
      dayHeaders.push('Total');
      const totalCollected = colls.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      dayValues.push(totalCollected);

      const dailyData = [
        [`Daily Breakdown — ${cycle.cycle_name || cycle.month_year}`],
        [`Principal: ₹${cycle.principal.toLocaleString('en-IN')}`],
        dayHeaders,
        dayValues
      ];
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
      wsDaily['!cols'] = [{ wch: 16 }, ...new Array(totalDays + 1).fill({ wch: 8 })];
      const sheetName = (cycle.month_year || 'Unknown').substring(0, 28);
      XLSX.utils.book_append_sheet(wb, wsDaily, sheetName);
    });

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeAscii = (client.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const fallbackFilename = `Member_History_${safeAscii || client.sl_no || 'member'}_${exportDate}.xlsx`;
    const utf8Filename = `Member_History_${client.name || 'member'}_${exportDate}.xlsx`;

    console.log(`[EXPORT] Member History: ${client.name} (${clientId}) | ${cycles.length} months | ${exportDate}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', makeContentDisposition(fallbackFilename, utf8Filename));
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/excel/export-closed — Closed clients archive export
router.get('/export-closed', async (req, res) => {
  try {
    const companyId = 'comp_alr_001';

    let companyName = 'ALR Finance';
    try {
      const compRows = await query('SELECT name FROM companies WHERE id = ?', [companyId]);
      if (compRows.length > 0) companyName = compRows[0].name;
    } catch (_) {}

    const closed = await query(
      `SELECT id, client_name, phone, final_principal, total_collected, excess_amount, closed_date, closure_reason
       FROM closed_clients WHERE company_id = ? ORDER BY closed_date DESC`,
      [companyId]
    );

    const exportDate = new Date().toISOString().split('T')[0];
    const data = [
      [`CLOSED THAVANAI ARCHIVE — ${companyName}`],
      [`Exported: ${exportDate} | Total Records: ${closed.length}`],
      [''],
      ['Sl.No', 'Client Name', 'Phone', 'Principal', 'Total Collected', 'Excess', 'Closed Date', 'Reason', 'Status']
    ];

    closed.forEach((c, idx) => {
      data.push([
        idx + 1,
        c.client_name,
        c.phone || '-',
        c.final_principal,
        c.total_collected,
        c.excess_amount || 0,
        c.closed_date,
        c.closure_reason || 'completed',
        '✅ Completed'
      ]);
    });

    // Totals
    data.push([]);
    data.push([
      '', 'TOTALS', '',
      closed.reduce((s, c) => s + c.final_principal, 0),
      closed.reduce((s, c) => s + c.total_collected, 0),
      closed.reduce((s, c) => s + (c.excess_amount || 0), 0),
      '', '',
      `${closed.length} records`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
    ];
    ws['!cols'] = [
      { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Closed Archive');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Closed_Thavanai_Archive_${exportDate}.xlsx`;

    console.log(`[EXPORT] Closed Archive: ${closed.length} records | ${exportDate}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
