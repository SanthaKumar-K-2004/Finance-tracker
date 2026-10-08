import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

const rootDir = path.resolve(__dirname, '..');

// Helper to convert 0-indexed column number to Excel column letters
function colToLetter(col) {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode((c % 26) + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

// 20 High-fidelity, realistic microfinance borrower records
export const DEMO_20_CLIENTS = [
  {
    slNo: 1,
    date: '01.10.2026',
    name: 'P. Shanmugam',
    tamilName: 'பி. சண்முகம்',
    phone: '9842156781',
    village: 'Madurai',
    area: 'Simmakkal',
    address: '12, West Masi Street, Simmakkal, Madurai - 625001',
    principal: 10000,
    dailyDue: 350,
    // Days 1 to 28: 350 each (=9800), Day 29: 200 (=10000 full cleared)
    collections: { ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [i + 1, 350])), 29: 200 },
    closeDate: '29.10.2026',
    note: 'Completed full repayment on Day 29'
  },
  {
    slNo: 2,
    date: '01.10.2026',
    name: 'R. Deepa Lakshmi',
    tamilName: 'ஆர். தீபா லட்சுமி',
    phone: '9443218762',
    village: 'Coimbatore',
    area: 'Gandhipuram',
    address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012',
    principal: 20000,
    dailyDue: 700,
    // Days 1 to 24: 700 each (=16800, balance 3200)
    collections: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 700])),
    closeDate: '',
    note: 'Regular ongoing payer (84% recovered)'
  },
  {
    slNo: 3,
    date: '15.09.2026',
    name: 'K. Muthukumar',
    tamilName: 'கே. முத்துக்குமார்',
    phone: '9789123453',
    village: 'Tiruppur',
    area: 'Avinashi Road',
    address: '88, College Road, Avinashi Road, Tiruppur - 641602',
    principal: 15000,
    dailyDue: 500,
    // Partial payer with occasional skips: 20 days x 500 = 10000
    collections: [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27].reduce((acc, d) => ({ ...acc, [d]: 500 }), {}),
    closeDate: '',
    note: 'Active partial payer (Sunday skips)'
  },
  {
    slNo: 4,
    date: '01.10.2026',
    name: 'M. Arumugam',
    tamilName: 'எம். ஆறுமுகம்',
    phone: '9894561234',
    village: 'Salem',
    area: 'Five Roads',
    address: '23/A, Cherry Road, Five Roads, Salem - 636004',
    principal: 25000,
    dailyDue: 850,
    // Days 1 to 26: 850 each (=22100, balance 2900)
    collections: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [i + 1, 850])),
    closeDate: '',
    note: 'High recovery business loan (88% paid)'
  },
  {
    slNo: 5,
    date: '01.10.2026',
    name: 'S. Priya Dharshini',
    tamilName: 'எஸ். பிரியா தர்ஷினி',
    phone: '9629451235',
    village: 'Madurai',
    area: 'Goripalayam',
    address: '14, Alagar Kovil Main Road, Goripalayam, Madurai - 625002',
    principal: 30000,
    dailyDue: 1000,
    // Days 1 to 25: 1000 each (=25000, balance 5000)
    collections: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, 1000])),
    closeDate: '',
    note: 'Consistent grocery shop daily collection'
  },
  {
    slNo: 6,
    date: '01.09.2026',
    name: 'A. Mohammed Farook',
    tamilName: 'ஏ. முகமது பாரூக்',
    phone: '9500784326',
    village: 'Madurai',
    area: 'Alanganallur',
    address: '7/2, Market Street, Alanganallur, Madurai - 625501',
    principal: 50000,
    dailyDue: 1700,
    // Days 1 to 20: 1700 each (=34000, balance 16000)
    collections: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 1700])),
    closeDate: '',
    note: 'Wholesale trader account'
  },
  {
    slNo: 7,
    date: '01.10.2026',
    name: 'S. Murugan',
    tamilName: 'எஸ். முருகன்',
    phone: '9944112237',
    village: 'Madurai',
    area: 'Melur',
    address: '102, Trichy Main Road, Melur, Madurai - 625106',
    principal: 10000,
    dailyDue: 350,
    // Days 1 to 30: 350 each (=10500, +500 excess advance!)
    collections: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 350])),
    closeDate: '29.10.2026',
    note: 'Completed with +₹500 advance excess'
  },
  {
    slNo: 8,
    date: '01.08.2026',
    name: 'V. Senthil Nathan',
    tamilName: 'வி. செந்தில் நாதன்',
    phone: '9488334458',
    village: 'Dindigul',
    area: 'Palani Road',
    address: '56, GTN Salai, Palani Road, Dindigul - 624001',
    principal: 40000,
    dailyDue: 1350,
    // Days 1 to 25: 1350 each (=33750, balance 6250)
    collections: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, 1350])),
    closeDate: '',
    note: 'Transport operator account (84% collected)'
  },
  {
    slNo: 9,
    date: '01.10.2026',
    name: 'G. Meenakshi',
    tamilName: 'ஜி. மீனாட்சி',
    phone: '9750667789',
    village: 'Trichy',
    area: 'Thillai Nagar',
    address: '18, 5th Cross East, Thillai Nagar, Trichy - 620018',
    principal: 15000,
    dailyDue: 500,
    // Days 1 to 22: 500 each (=11000, balance 4000)
    collections: Object.fromEntries(Array.from({ length: 22 }, (_, i) => [i + 1, 500])),
    closeDate: '',
    note: 'Active handloom weaver collection'
  },
  {
    slNo: 10,
    date: '01.10.2026',
    name: 'T. Saravanan',
    tamilName: 'டி. சரவணன்',
    phone: '9865223390',
    village: 'Madurai',
    area: 'Sellur',
    address: '31, 50 Feet Road, Sellur, Madurai - 625002',
    principal: 20000,
    dailyDue: 700,
    // Days 1 to 16: 700 each (=11200, balance 8800)
    collections: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, 700])),
    closeDate: '',
    note: 'Auto consultant account'
  },
  {
    slNo: 11,
    date: '01.10.2026',
    name: 'B. Anitha',
    tamilName: 'பி. அனிதா',
    phone: '9442110091',
    village: 'Madurai',
    area: 'Anna Nagar',
    address: '19, Kuruvikaran Salai, Anna Nagar, Madurai - 625020',
    principal: 5000,
    dailyDue: 200,
    // Days 1 to 25: 200 each (=5000 full cleared)
    collections: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, 200])),
    closeDate: '25.10.2026',
    note: 'Micro-retail loan fully cleared on Day 25'
  },
  {
    slNo: 12,
    date: '01.10.2026',
    name: 'N. Manikandan',
    tamilName: 'என். மணிகண்டன்',
    phone: '9790445592',
    village: 'Madurai',
    area: 'K.K. Nagar',
    address: '42, East 3rd Street, K.K. Nagar, Madurai - 625020',
    principal: 10000,
    dailyDue: 350,
    // Days 1 to 20: 350 each (=7000, balance 3000)
    collections: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 350])),
    closeDate: '',
    note: 'Stationery shop owner (70% collected)'
  },
  {
    slNo: 13,
    date: '15.09.2026',
    name: 'R. Kavitha',
    tamilName: 'ஆர். கவிதா',
    phone: '9843667793',
    village: 'Madurai',
    area: 'Villapuram',
    address: '8, Housing Board Colony, Villapuram, Madurai - 625012',
    principal: 25000,
    dailyDue: 850,
    // Days 1 to 21: 850 each (=17850, balance 7150)
    collections: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, 850])),
    closeDate: '',
    note: 'Tailoring unit loan'
  },
  {
    slNo: 14,
    date: '15.10.2026',
    name: 'K. Karthikeyan',
    tamilName: 'கே. கார்த்திகேயன்',
    phone: '9952889994',
    village: 'Madurai',
    area: 'Teppakulam',
    address: '63, South Bank Road, Teppakulam, Madurai - 625009',
    principal: 35000,
    dailyDue: 1200,
    // Disbursed mid-month on 15th: Days 16 to 31 = 16 days x 1200 = 19200
    collections: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 16, 1200])),
    closeDate: '',
    note: 'Mid-month sanctioned loan (Disbursed 15th Oct)'
  },
  {
    slNo: 15,
    date: '01.10.2026',
    name: 'M. Selvaraj',
    tamilName: 'எம். செல்வராஜ்',
    phone: '9677334495',
    village: 'Madurai',
    area: 'Sholavandan',
    address: '25, Railway Feeder Road, Sholavandan, Madurai - 625214',
    principal: 15000,
    dailyDue: 500,
    // Days 1 to 30: 500 each (=15000 full cleared)
    collections: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, 500])),
    closeDate: '30.10.2026',
    note: 'Agricultural vendor loan 100% cleared'
  },
  {
    slNo: 16,
    date: '01.07.2026',
    name: 'S. Bhuvaneshwari',
    tamilName: 'எஸ். புவனேஸ்வரி',
    phone: '9840123496',
    village: 'Coimbatore',
    area: 'Singanallur',
    address: '74, Kamarajar Road, Singanallur, Coimbatore - 641005',
    principal: 60000,
    dailyDue: 2000,
    // Days 1 to 24: 2000 each (=48000, balance 12000)
    collections: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 2000])),
    closeDate: '',
    note: 'Textile shop collection (80% collected)'
  },
  {
    slNo: 17,
    date: '01.10.2026',
    name: 'P. Ramesh',
    tamilName: 'பி. ரமேஷ்',
    phone: '9710567897',
    village: 'Salem',
    area: 'Suramangalam',
    address: '11, Junction Main Road, Suramangalam, Salem - 636005',
    principal: 20000,
    dailyDue: 700,
    // Days 1 to 22: 700 each (=15400, balance 4600)
    collections: Object.fromEntries(Array.from({ length: 22 }, (_, i) => [i + 1, 700])),
    closeDate: '',
    note: 'Electrical spares shop collection'
  },
  {
    slNo: 18,
    date: '01.10.2026',
    name: 'D. Vijayalakshmi',
    tamilName: 'டி. விஜயலட்சுமி',
    phone: '9940234598',
    village: 'Madurai',
    area: 'Thideer Nagar',
    address: '9, Periyar Bus Stand Road, Thideer Nagar, Madurai - 625001',
    principal: 10000,
    dailyDue: 350,
    // Days 1 to 26: 350 each (=9100, balance 900)
    collections: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [i + 1, 350])),
    closeDate: '',
    note: 'Fruit stall daily recovery (91% collected)'
  },
  {
    slNo: 19,
    date: '10.10.2026',
    name: 'R. Suresh',
    tamilName: 'ஆர். சுரேஷ்',
    phone: '9884678999',
    village: 'Madurai',
    area: 'Thiruppalai',
    address: '52, Natham Main Road, Thiruppalai, Madurai - 625014',
    principal: 30000,
    dailyDue: 1000,
    // Disbursed on 10th: Days 11 to 31 = 21 days x 1000 = 21000
    collections: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 11, 1000])),
    closeDate: '',
    note: 'Mid-month loan (Disbursed 10th Oct, 70% paid)'
  },
  {
    slNo: 20,
    date: '01.05.2026',
    name: 'K. Pandian',
    tamilName: 'கே. பாண்டியன்',
    phone: '9787123400',
    village: 'Coimbatore',
    area: 'Cross Cut Road',
    address: '39, 7th Cross, Cross Cut Road, Coimbatore - 641012',
    principal: 100000,
    dailyDue: 3500,
    // Days 1 to 22: 3500 each (=77000, balance 23000)
    collections: Object.fromEntries(Array.from({ length: 22 }, (_, i) => [i + 1, 3500])),
    closeDate: '',
    note: 'Wholesale merchant high-value account (77% recovered)'
  }
];

/**
 * Builds the official 42-column ALR Daily Collection Register Sheet
 */
export function buildAlrRegisterSheet(monthYear = '2026-10') {
  const [year, month] = monthYear.split('-');
  const yNum = parseInt(year, 10);
  const mNum = parseInt(month, 10);
  const totalDays = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 31;
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthLabel = `${monthNames[mNum - 1] || 'OCTOBER'} - ${year}`;

  const totalCols = 11 + totalDays; // 42 columns
  const firstDayCol = 'G'; // col 6
  const lastDayCol = colToLetter(5 + totalDays); // col 36 (AK)
  const totalCol = colToLetter(6 + totalDays);    // col 37 (AL)
  const remCol = colToLetter(7 + totalDays);      // col 38 (AM)

  const data = [];

  // Row 1: Register Title
  data.push(['DAILY COLLECTION REGISTER ( ALR )']);

  // Calculate sum of principals
  const totalPrincipalSum = DEMO_20_CLIENTS.reduce((sum, c) => sum + c.principal, 0);

  // Row 2: Metadata
  const row2 = new Array(totalCols).fill('');
  row2[0] = 'MONTH / YEAR';
  row2[2] = monthLabel;
  row2[5] = `TOTAL PRINCIPAL: ₹${totalPrincipalSum.toLocaleString('en-IN')}`;
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

  // Rows 4 to 23: The 20 Client records
  DEMO_20_CLIENTS.forEach((c, idx) => {
    const rowIdx = 4 + idx; // 1-based index in Excel
    const row = [];

    row.push(c.slNo);
    row.push(c.date);
    row.push(c.name);
    row.push(c.phone);
    row.push(c.address);
    row.push(c.principal);

    let clientTotal = 0;
    for (let d = 1; d <= totalDays; d++) {
      const amt = c.collections[d];
      if (amt !== undefined && amt !== null && amt > 0) {
        row.push(amt);
        clientTotal += amt;
      } else {
        row.push('');
      }
    }

    const remaining = Math.max(0, c.principal - clientTotal);
    const excess = Math.max(0, clientTotal - c.principal);

    // Live Excel Formulas with pre-evaluated values
    row.push({ t: 'n', f: `SUM(${firstDayCol}${rowIdx}:${lastDayCol}${rowIdx})`, v: clientTotal });
    row.push({ t: 'n', f: `IF(F${rowIdx}-${totalCol}${rowIdx}<0,0,F${rowIdx}-${totalCol}${rowIdx})`, v: remaining });
    row.push({ t: 'n', f: `IF(${totalCol}${rowIdx}-F${rowIdx}>0,${totalCol}${rowIdx}-F${rowIdx},0)`, v: excess });
    row.push(c.closeDate || '');
    row.push({ t: 'n', f: `${remCol}${rowIdx}`, v: remaining });

    data.push(row);
  });

  // Row 24: Grand Total Row
  const summaryRowIdx = 4 + DEMO_20_CLIENTS.length; // 24
  const totalRow = ['Total', '', '', '', ''];
  totalRow.push({ t: 'n', f: `SUM(F4:F${summaryRowIdx - 1})`, v: totalPrincipalSum });

  // Day-wise sum formulas
  for (let d = 1; d <= totalDays; d++) {
    const colL = colToLetter(5 + d);
    let daySum = 0;
    DEMO_20_CLIENTS.forEach(c => {
      const a = c.collections[d];
      if (a) daySum += a;
    });
    totalRow.push({ t: 'n', f: `SUM(${colL}4:${colL}${summaryRowIdx - 1})`, v: daySum });
  }

  const grandCollected = DEMO_20_CLIENTS.reduce((acc, c) => {
    return acc + Object.values(c.collections).reduce((s, v) => s + (v || 0), 0);
  }, 0);
  const grandRemaining = DEMO_20_CLIENTS.reduce((acc, c) => {
    const colTot = Object.values(c.collections).reduce((s, v) => s + (v || 0), 0);
    return acc + Math.max(0, c.principal - colTot);
  }, 0);
  const grandExcess = DEMO_20_CLIENTS.reduce((acc, c) => {
    const colTot = Object.values(c.collections).reduce((s, v) => s + (v || 0), 0);
    return acc + Math.max(0, colTot - c.principal);
  }, 0);

  totalRow.push({ t: 'n', f: `SUM(${totalCol}4:${totalCol}${summaryRowIdx - 1})`, v: grandCollected });
  totalRow.push({ t: 'n', f: `SUM(${remCol}4:${remCol}${summaryRowIdx - 1})`, v: grandRemaining });
  totalRow.push({ t: 'n', f: `SUM(${colToLetter(8 + totalDays)}4:${colToLetter(8 + totalDays)}${summaryRowIdx - 1})`, v: grandExcess });
  totalRow.push('');
  totalRow.push({ t: 'n', f: `${remCol}${summaryRowIdx}`, v: grandRemaining });

  data.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Merged Header ranges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 10 } }
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 8 },  // Sl.No
    { wch: 14 }, // Date
    { wch: 24 }, // Name
    { wch: 15 }, // Phone
    { wch: 35 }, // Address
    { wch: 14 }, // Principal
    ...new Array(totalDays).fill({ wch: 7 }), // Days 1..31
    { wch: 13 }, // Total
    { wch: 15 }, // Remaining
    { wch: 12 }, // Excess
    { wch: 13 }, // Close Date
    { wch: 15 }  // Remaining Next Month
  ];

  return ws;
}

/**
 * Builds a second worksheet with Customer Profile & Summary View
 * Ideal for testing the Universal Smart Column Mapper dropdowns and multi-sheet picker!
 */
export function buildProfileSummarySheet() {
  const data = [];

  // Title Block
  data.push(['BORROWER PROFILES & LOAN RECOVERY SUMMARY']);
  data.push(['Generated for Video Demonstration & System Verification - 20 Active Borrowers']);
  data.push([]);

  // Column Headers (Bilingual friendly)
  data.push([
    'Serial No',
    'Customer Name',
    'Contact Phone',
    'Village / Town',
    'Route Area',
    'Street / Full Address',
    'Sanctioned Principal (INR)',
    'Registration Date',
    'Total Collected (INR)',
    'Remaining Balance (INR)',
    'Loan Status',
    'Auditor Notes'
  ]);

  DEMO_20_CLIENTS.forEach(c => {
    const totalColl = Object.values(c.collections).reduce((s, v) => s + (v || 0), 0);
    const balance = Math.max(0, c.principal - totalColl);
    const status = c.closeDate ? 'COMPLETED (CLOSED)' : balance === 0 ? 'CLEARED' : 'ACTIVE REPAYMENT';

    data.push([
      c.slNo,
      c.name,
      c.phone,
      c.village,
      c.area,
      c.address,
      c.principal,
      c.date,
      totalColl,
      balance,
      status,
      c.note
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
  ];

  ws['!cols'] = [
    { wch: 10 }, // Serial No
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Contact Phone
    { wch: 16 }, // Village
    { wch: 18 }, // Route Area
    { wch: 38 }, // Full Address
    { wch: 20 }, // Principal
    { wch: 16 }, // Reg Date
    { wch: 18 }, // Total Collected
    { wch: 18 }, // Remaining
    { wch: 22 }, // Loan Status
    { wch: 36 }  // Auditor Notes
  ];

  return ws;
}

/**
 * Builds CSV content for testing CSV upload
 */
export function buildDemoCsvContent() {
  const ws = buildAlrRegisterSheet('2026-10');
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Master generator function that writes all demo test files
 */
export function generateAllDemoFiles() {
  console.log('🚀 Generating 20-Record Testing & Video Demo Excel Files...');

  // 1. Primary Multi-Sheet Master Workbook (ALR Daily Register + Profile Summary)
  const masterWb = XLSX.utils.book_new();
  const alrWs = buildAlrRegisterSheet('2026-10');
  const profileWs = buildProfileSummarySheet();

  XLSX.utils.book_append_sheet(masterWb, alrWs, 'Daily_Collection_Register');
  XLSX.utils.book_append_sheet(masterWb, profileWs, 'Borrower_Profiles_Summary');

  const masterPath = path.resolve(rootDir, 'ALR_20_Clients_Import_Demo.xlsx');
  XLSX.writeFile(masterWb, masterPath);
  console.log(`✅ [1/3] Created Primary Master Workbook (Multi-Sheet): ${masterPath}`);

  // 2. Standalone Single-Sheet ALR Register Workbook (Clean 1-Sheet Drag & Drop)
  const singleWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(singleWb, buildAlrRegisterSheet('2026-10'), 'Collection_Register');
  const singlePath = path.resolve(rootDir, 'ALR_20_Clients_Single_Sheet.xlsx');
  XLSX.writeFile(singleWb, singlePath);
  console.log(`✅ [2/3] Created Standalone Single-Sheet Workbook: ${singlePath}`);

  // 3. Standalone CSV file
  const csvContent = buildDemoCsvContent();
  const csvPath = path.resolve(rootDir, 'ALR_20_Clients_Import_Demo.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✅ [3/3] Created Standalone CSV File: ${csvPath}`);

  return { masterPath, singlePath, csvPath };
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllDemoFiles();
}
