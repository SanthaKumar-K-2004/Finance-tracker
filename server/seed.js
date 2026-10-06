import { db, query, execute, initSchema } from './db.js';
import xlsx from 'xlsx';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

async function seed() {
  await initSchema();

  console.log('🌱 Checking if company exists...');
  const existingCompanies = await query('SELECT * FROM companies LIMIT 1');
  let companyId;

  if (existingCompanies.length === 0) {
    companyId = 'comp_alr_001';
    await execute(
      `INSERT INTO companies (id, name, tagline, phone, address, default_language)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        'ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)',
        'Daily Collection & Microfinance',
        '9585194934',
        'அலங்காநல்லூர், மதுரை (Alanganallur, Madurai)',
        'ta'
      ]
    );
    console.log('🏢 Created company: ALR Finance');

    // Default settings
    await execute(
      `INSERT OR REPLACE INTO settings (id, company_id, key, value) VALUES (?, ?, ?, ?)`,
      ['set_1', companyId, 'default_cycle_days', '31']
    );
    await execute(
      `INSERT OR REPLACE INTO settings (id, company_id, key, value) VALUES (?, ?, ?, ?)`,
      ['set_2', companyId, 'currency_symbol', '₹']
    );
    await execute(
      `INSERT OR REPLACE INTO settings (id, company_id, key, value) VALUES (?, ?, ?, ?)`,
      ['set_3', companyId, 'theme', 'auto']
    );
  } else {
    companyId = existingCompanies[0].id;
    console.log(`🏢 Using existing company: ${existingCompanies[0].name} (${companyId})`);
  }

  // Load Excel workbook if available; otherwise use default ALR borrower record
  const excelPath = path.resolve(__dirname, '../Daily_Collection_Register__ALR_-6.xlsx');
  let rows = [];

  if (fs.existsSync(excelPath)) {
    console.log(`📖 Loading Excel template from ${excelPath}...`);
    const wb = XLSX.readFile(excelPath);
    const sheetName = wb.SheetNames[0]; // 'Collection Register'
    console.log(`📑 Reading sheet: "${sheetName}"...`);
    const sheet = wb.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } else {
    console.log(`ℹ️ Excel template not found at ${excelPath}. Seeding default ALR borrower...`);
    rows = [
      [], [], [],
      [3032, '02.05.2026', 'வெள்ளையம்மா w /o கரிகாலன்', '9585194934', 'அலங்காநல்லூர்', 10000, 100, 100, 100, 100, 100]
    ];
  }

  // Rows 1-3 are title, summary, and headers. Data starts from Row 4 (index 3)
  let importedCount = 0;
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[2]) continue; // Must have a client name

    const slNo = row[0] ? parseInt(row[0], 10) : i;
    const dateStr = String(row[1] || '01.05.2026').trim();
    const name = String(row[2] || '').trim();
    const phone = row[3] ? String(row[3]).trim() : '';
    const address = row[4] ? String(row[4]).trim() : '';
    const principal = row[5] ? parseFloat(row[5]) : 10000;

    if (!name) continue;

    const clientId = `client_${slNo}_${crypto.randomBytes(3).toString('hex')}`;
    const cycleId = `cycle_${slNo}_2026_05`;

    // Check if client already exists by sl_no
    const existing = await query('SELECT id FROM clients WHERE company_id = ? AND sl_no = ?', [
      companyId,
      slNo
    ]);

    let actualClientId = clientId;
    if (existing.length === 0) {
      await execute(
        `INSERT INTO clients (id, company_id, sl_no, client_code, name, phone, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [clientId, companyId, slNo, `ALR-${slNo}`, name, phone, address]
      );
      console.log(`  👤 Added client [${slNo}] ${name}`);
    } else {
      actualClientId = existing[0].id;
      await execute(
        `UPDATE clients SET name = ?, phone = ?, address = ?, status = 'active' WHERE id = ?`,
        [name, phone, address, actualClientId]
      );
      console.log(`  👤 Restored client [${slNo}] ${name} to active`);
    }

    // Insert loan cycle for May 2026 (Historical Baseline & Audit)
    const existingCycle = await query(
      'SELECT id FROM loan_cycles WHERE company_id = ? AND client_id = ? AND month_year = ?',
      [companyId, actualClientId, '2026-05']
    );

    let actualCycleId = cycleId;
    if (existingCycle.length === 0) {
      await execute(
        `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 31, 'active')`,
        [
          cycleId,
          companyId,
          actualClientId,
          '2026-05',
          'May 2026 (வைகாசி)',
          principal,
          '2026-05-01',
          '2026-05-31'
        ]
      );
    } else {
      actualCycleId = existingCycle[0].id;
    }

    // Also insert/ensure loan cycle for current calendar month
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonthNum = String(now.getMonth() + 1).padStart(2, '0');
    const curMonthYear = `${curYear}-${curMonthNum}`;
    const curDays = new Date(curYear, now.getMonth() + 1, 0).getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const curCycleName = `${monthNames[now.getMonth()]} ${curYear}`;

    if (curMonthYear !== '2026-05') {
      const curCycleId = `cycle_${slNo}_${curMonthYear.replace('-', '_')}`;
      const existingCurCycle = await query(
        'SELECT id FROM loan_cycles WHERE company_id = ? AND client_id = ? AND month_year = ?',
        [companyId, actualClientId, curMonthYear]
      );
      if (existingCurCycle.length === 0) {
        await execute(
          `INSERT INTO loan_cycles (id, company_id, client_id, month_year, cycle_name, principal, start_date, end_date, total_days, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            curCycleId,
            companyId,
            actualClientId,
            curMonthYear,
            curCycleName,
            principal,
            `${curMonthYear}-01`,
            `${curMonthYear}-${String(curDays).padStart(2, '0')}`,
            curDays
          ]
        );
        console.log(`  📅 Created current month cycle (${curMonthYear}) for [${slNo}] ${name}`);
      }
    }

    // Days 1 through 31 are columns index 6 to 36
    for (let d = 1; d <= 31; d++) {
      const colIndex = 5 + d; // Day 1 is col index 6
      const val = row[colIndex];
      if (val !== undefined && val !== null && val !== '') {
        const amount = parseFloat(val);
        if (amount > 0) {
          const datePadded = String(d).padStart(2, '0');
          const colDate = `2026-05-${datePadded}`;
          const collId = `coll_${actualCycleId}_d${d}`;

          await execute(
            `INSERT INTO daily_collections (id, company_id, cycle_id, client_id, day_number, collection_date, amount, payment_mode, collected_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'Agent')
             ON CONFLICT(cycle_id, day_number) DO UPDATE SET amount = excluded.amount`,
            [collId, companyId, actualCycleId, actualClientId, d, colDate, amount]
          );
        }
      }
    }

    importedCount++;
  }

  console.log(`\n🎉 Seed completed! Imported ${importedCount} client records into Turso Database.`);
}

export { seed, seed as seedData };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().catch(err => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  });
}

