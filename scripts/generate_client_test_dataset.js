import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

// Raw 24 diverse client records
export const CLIENT_DATASET = [
  {
    slNo: 1,
    code1: 'CLI-1001',
    code2: 'ACC-TN-2019-01',
    name1: 'Muthukumar M',
    name2: 'Mr. Muthukumar M (s/o Murugesan)',
    area: 'Madurai (Simmakkal)',
    district: 'Madurai',
    address: '12, West Masi Street, Simmakkal, Madurai - 625001',
    phone1: '9842156789',
    phone2: '+91 98421 56789',
    altPhone: '9842100001',
    joinDateISO: '2019-04-12',
    joinDateAlt: '12/04/2019',
    joinYear: 2019,
    amount: 25000,
    dailyDue: 750,
    balance: 6250,
    guarantor: 'S. Palanisamy',
    kycStatus: 'Verified',
    testNote: 'Clean baseline record (2019)',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 2,
    code1: 'CLI-1002',
    code2: 'ACC-TN-2021-02',
    name1: 'Priya Dharshini S',
    name2: 'Mrs. Priya Dharshini S (w/o Saravanan)',
    area: 'Coimbatore (Gandhipuram)',
    district: 'Coimbatore',
    address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012',
    phone1: '9443218765',
    phone2: '+91 94432 18765',
    altPhone: 'N/A',
    joinDateISO: '2021-08-20',
    joinDateAlt: '20/08/2021',
    joinYear: 2021,
    amount: 50000,
    dailyDue: 1500,
    balance: 18500,
    guarantor: 'R. Saravanan',
    kycStatus: 'Verified',
    testNote: 'Medium amount, female borrower',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 3,
    code1: 'CLI-1003',
    code2: 'ACC-TN-2020-03',
    name1: 'Mohammed Farook A',
    name2: 'Mr. Mohammed Farook A (s/o Abdul)',
    area: 'Tiruppur (Avinashi Road)',
    district: 'Tiruppur',
    address: '88, College Road, Avinashi Road, Tiruppur - 641602',
    phone1: '', // MISSING PHONE
    phone2: '', // MISSING PHONE
    altPhone: 'N/A',
    joinDateISO: '2020-02-15',
    joinDateAlt: '15/02/2020',
    joinYear: 2020,
    amount: 75000,
    dailyDue: 2250,
    balance: 24000,
    guarantor: 'K. Ismail',
    kycStatus: 'Incomplete',
    testNote: 'MISSING PHONE NUMBER test case',
    auditFlag: 'FLAG_MISSING_PHONE'
  },
  {
    slNo: 4,
    code1: 'CLI-1004',
    code2: 'ACC-TN-2018-04',
    name1: 'Arumugam V',
    name2: 'Mr. Arumugam V (s/o Velusamy)',
    area: 'Salem (Five Roads)',
    district: 'Salem',
    address: '23/A, Cherry Road, Five Roads, Salem - 636004',
    phone1: '9789123456',
    phone2: '+91 97891 23456',
    altPhone: '9789000004',
    joinDateISO: '2018-11-05',
    joinDateAlt: '05/11/2018',
    joinYear: 2018,
    amount: 10000,
    dailyDue: 350,
    balance: 1200,
    guarantor: '', // MISSING GUARANTOR
    kycStatus: 'Verified',
    testNote: 'Oldest account (2018), missing guarantor',
    auditFlag: 'FLAG_MISSING_GUARANTOR'
  },
  {
    slNo: 5,
    code1: 'CLI-1005',
    code2: 'ACC-TN-2023-05',
    name1: 'Deepa Lakshmi K',
    name2: 'Mrs. Deepa Lakshmi K (w/o Karthik)',
    area: '', // MISSING AREA
    district: '', // MISSING DISTRICT
    address: '', // MISSING ADDRESS
    phone1: '9894561230',
    phone2: '+91 98945 61230',
    altPhone: 'N/A',
    joinDateISO: '2023-06-18',
    joinDateAlt: '18/06/2023',
    joinYear: 2023,
    amount: 30000,
    dailyDue: 900,
    balance: 14200,
    guarantor: 'T. Karthikeyan',
    kycStatus: 'Pending',
    testNote: 'MISSING LOCATION (Area & Address blank)',
    auditFlag: 'FLAG_MISSING_LOCATION'
  },
  {
    slNo: 6,
    code1: 'CLI-1006',
    code2: 'ACC-TN-2022-06',
    name1: 'Balasubramanian R',
    name2: 'Mr. Balasubramanian R (s/o Ramasamy)',
    area: 'Erode (Brough Road)',
    district: 'Erode',
    address: '71, Meenachisundaram St, Brough Rd, Erode - 638001',
    phone1: '9865123987',
    phone2: '+91 98651 23987',
    altPhone: '9865000006',
    joinDateISO: '2022-01-10',
    joinDateAlt: '10/01/2022',
    joinYear: 2022,
    amount: 120000,
    dailyDue: 3600,
    balance: 42000,
    guarantor: 'B. Murugesan',
    kycStatus: 'Verified',
    testNote: 'High value loan (₹1,20,000), complete data',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 7,
    code1: 'CLI-1007',
    code2: 'ACC-TN-2024-07',
    name1: 'Shanthi T',
    name2: 'Mrs. Shanthi T (w/o Thangaraj)',
    area: 'Dindigul (Palani Road)',
    district: 'Dindigul',
    address: '9, Mengles Road, Palani Road, Dindigul - 624001',
    phone1: '', // MISSING PHONE
    phone2: '', // MISSING PHONE
    altPhone: 'N/A',
    joinDateISO: '2024-03-25',
    joinDateAlt: '25/03/2024',
    joinYear: 2024,
    amount: 15000,
    dailyDue: 450,
    balance: 9000,
    guarantor: '', // MISSING GUARANTOR
    kycStatus: 'Incomplete',
    testNote: 'MISSING PHONE & GUARANTOR (Dual missing)',
    auditFlag: 'FLAG_DUAL_MISSING'
  },
  {
    slNo: 8,
    code1: 'CLI-1008',
    code2: 'ACC-TN-2025-08',
    name1: 'Venkatesh G',
    name2: 'Mr. Venkatesh G (s/o Govindasamy)',
    area: 'Trichy (Thillai Nagar)',
    district: 'Tiruchirappalli',
    address: '11th Cross, Main Road, Thillai Nagar, Trichy - 620018',
    phone1: '9944556677',
    phone2: '+91 99445 56677',
    altPhone: 'N/A',
    joinDateISO: '2025-05-14',
    joinDateAlt: '14/05/2025',
    joinYear: 2025,
    amount: 8500,
    dailyDue: 260,
    balance: 3100,
    guarantor: 'P. Ramesh',
    kycStatus: 'Verified',
    testNote: 'Micro-loan (₹8,500), recent year 2025',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 9,
    code1: 'CLI-1009',
    code2: 'ACC-TN-2021-09',
    name1: 'Kavitha N',
    name2: 'Mrs. Kavitha N (w/o Natarajan)',
    area: 'Pollachi (New Scheme Road)',
    district: 'Pollachi',
    address: '34, New Scheme Road, Pollachi - 642002',
    phone1: '9488112233',
    phone2: '+91 94881 12233',
    altPhone: '9488000009',
    joinDateISO: '2021-12-01',
    joinDateAlt: '01/12/2021',
    joinYear: 2021,
    amount: 45000,
    dailyDue: 1350,
    balance: 11500,
    guarantor: 'N. Mani',
    kycStatus: 'Verified',
    testNote: 'Mid-tier loan, semi-urban agro hub',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 10,
    code1: 'CLI-1010',
    code2: 'ACC-TN-2019-10',
    name1: 'Selvam P',
    name2: 'Mr. Selvam P (s/o Perumal)',
    area: 'Karur (Bus Stand)',
    district: 'Karur',
    address: '5, Kovai Road, Opp Old Bus Stand, Karur - 639001',
    phone1: '9843334455',
    phone2: '+91 98433 34455',
    altPhone: 'N/A',
    joinDateISO: '2019-09-08',
    joinDateAlt: '08/09/2019',
    joinYear: 2019,
    amount: 20000,
    dailyDue: 600,
    balance: 4800,
    guarantor: 'S. Loganathan',
    kycStatus: 'Verified',
    testNote: 'Regular retail account (2019)',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 11,
    code1: 'CLI-1011',
    code2: 'ACC-TN-2023-11',
    name1: 'Anitha C',
    name2: 'Ms. Anitha C (d/o Chandran)',
    area: 'Chennai (T. Nagar)',
    district: 'Chennai',
    address: '102, Usman Road, T. Nagar, Chennai - 600017',
    phone1: '', // MISSING PHONE
    phone2: '', // MISSING PHONE
    altPhone: 'N/A',
    joinDateISO: '2023-11-22',
    joinDateAlt: '22/11/2023',
    joinYear: 2023,
    amount: 200000,
    dailyDue: 6000,
    balance: 85000,
    guarantor: 'C. Rajan',
    kycStatus: 'Pending',
    testNote: 'Highest ticket (₹2,00,000), MISSING PHONE',
    auditFlag: 'FLAG_MISSING_PHONE'
  },
  {
    slNo: 12,
    code1: 'CLI-1012',
    code2: 'ACC-TN-2020-12',
    name1: 'Franklin David J',
    name2: 'Mr. Franklin David J (s/o Joseph)',
    area: 'Tirunelveli (Palayamkottai)',
    district: 'Tirunelveli',
    address: '17, High Ground, Palayamkottai, Tirunelveli - 627002',
    phone1: '9751223344',
    phone2: '+91 97512 23344',
    altPhone: '9751000012',
    joinDateISO: '2020-07-30',
    joinDateAlt: '30/07/2020',
    joinYear: 2020,
    amount: 35000,
    dailyDue: 1050,
    balance: 10200,
    guarantor: 'J. Mary',
    kycStatus: 'Verified',
    testNote: 'South region borrower, complete',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 13,
    code1: 'CLI-1013',
    code2: 'ACC-TN-2024-13',
    name1: 'Thangavel B',
    name2: 'Mr. Thangavel B (s/o Boopathi)',
    area: 'Namakkal (Paramathi Road)',
    district: 'Namakkal',
    address: '56, Paramathi Velur Road, Namakkal - 637001',
    phone1: '9842778899',
    phone2: '+91 98427 78899',
    altPhone: 'N/A',
    joinDateISO: '2024-09-02',
    joinDateAlt: '02/09/2024',
    joinYear: 2024,
    amount: 60000,
    dailyDue: 1800,
    balance: 36000,
    guarantor: '', // MISSING GUARANTOR
    kycStatus: 'Verified',
    testNote: 'Logistics operator, missing guarantor',
    auditFlag: 'FLAG_MISSING_GUARANTOR'
  },
  {
    slNo: 14,
    code1: 'CLI-1014',
    code2: 'ACC-TN-2022-14',
    name1: 'Meenakshi Sundaram S',
    name2: 'Mr. Meenakshi Sundaram S (s/o Sundaram)',
    area: 'Madurai (Goripalayam)',
    district: 'Madurai',
    address: '3, Alagar Kovil Road, Goripalayam, Madurai - 625002',
    phone1: '9994112233',
    phone2: '+91 99941 12233',
    altPhone: '9994000014',
    joinDateISO: '2022-04-17',
    joinDateAlt: '17/04/2022',
    joinYear: 2022,
    amount: 18000,
    dailyDue: 540,
    balance: 5100,
    guarantor: 'S. Sundaram',
    kycStatus: 'Verified',
    testNote: 'Long name string test, normal flow',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 15,
    code1: 'CLI-1015',
    code2: 'ACC-TN-2023-15',
    name1: 'Rajesh Kannan K',
    name2: 'Mr. Rajesh Kannan K (s/o Krishnan)',
    area: '', // MISSING AREA
    district: '', // MISSING DISTRICT
    address: '', // MISSING ADDRESS
    phone1: '', // MISSING PHONE
    phone2: '', // MISSING PHONE
    altPhone: 'N/A',
    joinDateISO: '2023-01-05',
    joinDateAlt: '05/01/2023',
    joinYear: 2023,
    amount: 40000,
    dailyDue: 1200,
    balance: 22000,
    guarantor: '', // MISSING GUARANTOR
    kycStatus: 'Incomplete',
    testNote: 'CRITICAL GAP: Missing Area, Phone & Guarantor',
    auditFlag: 'FLAG_TRIPLE_MISSING'
  },
  {
    slNo: 16,
    code1: 'CLI-1016',
    code2: 'ACC-TN-2025-16',
    name1: 'Revathi M',
    name2: 'Mrs. Revathi M (w/o Manikandan)',
    area: 'Thanjavur (Old Bus Stand)',
    district: 'Thanjavur',
    address: '28, Gandhiji Road, Near Big Temple, Thanjavur - 613001',
    phone1: '9442667788',
    phone2: '+91 94426 67788',
    altPhone: 'N/A',
    joinDateISO: '2025-01-19',
    joinDateAlt: '19/01/2025',
    joinYear: 2025,
    amount: 22000,
    dailyDue: 660,
    balance: 13800,
    guarantor: 'M. Senthil',
    kycStatus: 'Verified',
    testNote: 'Delta handloom weaver, 2025 registration',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 17,
    code1: 'CLI-1017',
    code2: 'ACC-TN-2018-17',
    name1: 'Vijayakumar D',
    name2: 'Mr. Vijayakumar D (s/o Dhanapal)',
    area: 'Coimbatore (Peelamedu)',
    district: 'Coimbatore',
    address: '92, Avinashi Road, Peelamedu, Coimbatore - 641004',
    phone1: '9894001122',
    phone2: '+91 98940 01122',
    altPhone: '9894000017',
    joinDateISO: '2018-05-10',
    joinDateAlt: '10/05/2018',
    joinYear: 2018,
    amount: 85000,
    dailyDue: 2550,
    balance: 12500,
    guarantor: 'D. Dhanapal',
    kycStatus: 'Verified',
    testNote: 'Senior joined borrower (2018 cohort)',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 18,
    code1: 'CLI-1018',
    code2: 'ACC-TN-2026-18',
    name1: 'Yasmin Banu A',
    name2: 'Mrs. Yasmin Banu A (w/o Anwar)',
    area: 'Vellore (Katpadi)',
    district: 'Vellore',
    address: '14, Chittor Road, Katpadi, Vellore - 632007',
    phone1: '9865009988',
    phone2: '+91 98650 09988',
    altPhone: 'N/A',
    joinDateISO: '2026-02-11',
    joinDateAlt: '11/02/2026',
    joinYear: 2026,
    amount: 12000,
    dailyDue: 360,
    balance: 11200,
    guarantor: 'A. Abdul',
    kycStatus: 'Verified',
    testNote: 'Early 2026 onboarded customer',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 19,
    code1: 'CLI-1019',
    code2: 'ACC-TN-2021-19',
    name1: 'Suresh Kumar E',
    name2: 'Mr. Suresh Kumar E (s/o Elangovan)',
    area: 'Sivakasi (Car Street)',
    district: 'Virudhunagar',
    address: '64, South Car Street, Sivakasi - 626123',
    phone1: '9790334455',
    phone2: '+91 97903 34455',
    altPhone: '9790000019',
    joinDateISO: '2021-03-28',
    joinDateAlt: '28/03/2021',
    joinYear: 2021,
    amount: 65000,
    dailyDue: 1950,
    balance: 21000,
    guarantor: 'E. Elango',
    kycStatus: 'Verified',
    testNote: 'Commercial fireworks & printing firm',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 20,
    code1: 'CLI-1020',
    code2: 'ACC-TN-2024-20',
    name1: 'Bhuvaneswari L',
    name2: 'Mrs. Bhuvaneswari L (w/o Logan)',
    area: 'Theni (Periyakulam Road)',
    district: 'Theni',
    address: '81, Periyakulam Road, Theni - 625531',
    phone1: '', // MISSING PHONE
    phone2: '', // MISSING PHONE
    altPhone: 'N/A',
    joinDateISO: '2024-06-15',
    joinDateAlt: '15/06/2024',
    joinYear: 2024,
    amount: 28000,
    dailyDue: 840,
    balance: 17600,
    guarantor: 'L. Lakshmanan',
    kycStatus: 'Pending',
    testNote: 'MISSING PHONE (Cardamom hill region)',
    auditFlag: 'FLAG_MISSING_PHONE'
  },
  {
    slNo: 21,
    code1: 'CLI-1021',
    code2: 'ACC-TN-2020-21',
    name1: 'Syed Ibrahim H',
    name2: 'Mr. Syed Ibrahim H (s/o Hameed)',
    area: 'Nagapattinam (Beach Road)',
    district: 'Nagapattinam',
    address: '7, Beach Road, Nagapattinam - 611001',
    phone1: '9487445566',
    phone2: '+91 94874 45566',
    altPhone: '9487000021',
    joinDateISO: '2020-10-09',
    joinDateAlt: '09/10/2020',
    joinYear: 2020,
    amount: 150000,
    dailyDue: 4500,
    balance: 55000,
    guarantor: 'H. Hameed',
    kycStatus: 'Verified',
    testNote: 'High value fishing vessel enterprise',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 22,
    code1: 'CLI-1022',
    code2: 'ACC-TN-2022-22',
    name1: 'Charles Antony W',
    name2: 'Mr. Charles Antony W (s/o William)',
    area: 'Kanyakumari (Nagercoil)',
    district: 'Kanyakumari',
    address: '39, Cape Road, Nagercoil - 629001',
    phone1: '9842887766',
    phone2: '+91 98428 87766',
    altPhone: 'N/A',
    joinDateISO: '2022-08-31',
    joinDateAlt: '31/08/2022',
    joinYear: 2022,
    amount: 32000,
    dailyDue: 960,
    balance: 14800,
    guarantor: 'W. William',
    kycStatus: 'Verified',
    testNote: 'Deep south retail spices shop',
    auditFlag: 'VALID_COMPLETE'
  },
  {
    slNo: 23,
    code1: 'CLI-1023',
    code2: 'ACC-TN-2019-23',
    name1: 'Gandhimathi O',
    name2: 'Mrs. Gandhimathi O (w/o Oyyappan)',
    area: 'Pudukkottai (Town Hall)',
    district: 'Pudukkottai',
    address: '19, West Main Street, Town Hall, Pudukkottai - 622001',
    phone1: '9788665544',
    phone2: '+91 97886 65544',
    altPhone: 'N/A',
    joinDateISO: '2019-12-14',
    joinDateAlt: '14/12/2019',
    joinYear: 2019,
    amount: 14000,
    dailyDue: 420,
    balance: 3200,
    guarantor: '', // MISSING GUARANTOR
    kycStatus: 'Verified',
    testNote: 'Local dairy unit, missing guarantor',
    auditFlag: 'FLAG_MISSING_GUARANTOR'
  },
  {
    slNo: 24,
    code1: 'CLI-1024',
    code2: 'ACC-TN-2026-24',
    name1: 'Mohamed Rizwan Z',
    name2: 'Mr. Mohamed Rizwan Z (s/o Zakir)',
    area: 'Cuddalore (Port Road)',
    district: 'Cuddalore',
    address: '50, Subbaraya Chetty St, Port Rd, Cuddalore - 607003',
    phone1: '9943221100',
    phone2: '+91 99432 21100',
    altPhone: '9943000024',
    joinDateISO: '2026-08-01',
    joinDateAlt: '01/08/2026',
    joinYear: 2026,
    amount: 95000,
    dailyDue: 2850,
    balance: 89000,
    guarantor: 'Z. Zakir Hussain',
    kycStatus: 'Verified',
    testNote: 'Latest 2026 late joiner, high loan',
    auditFlag: 'VALID_COMPLETE'
  }
];

// -------------------------------------------------------------
// BUILD SET 1: CORPORATE MASTER REGISTER
// -------------------------------------------------------------
export function buildSet1Worksheet() {
  const rows = [];

  // Row 1: Merged Title Banner
  rows.push(['CLIENT MASTER DIRECTORY — GENERAL TEST DATASET (SET 1: CORPORATE REGISTER)']);

  // Row 2: Sub-banner
  rows.push(['24 Mixed Clients | Variable Areas & Amounts | Joined 2018-2026 | Intentional Gaps (Phone, Area, Guarantor) for System Ingestion Testing']);

  // Row 3: Blank separator
  rows.push([]);

  // Row 4: Headers
  rows.push([
    'Client Code',
    'Customer Name',
    'Area / Town',
    'Contact Phone',
    'Joining Date',
    'Joining Year',
    'Credit Limit (INR)',
    'Daily Installment (INR)',
    'Guarantor Name',
    'KYC Status',
    'Test Scenario / Audit Notes'
  ]);

  // Rows 5..28: 24 Data rows
  CLIENT_DATASET.forEach(c => {
    rows.push([
      c.code1,
      c.name1,
      c.area || '',
      c.phone1 || '',
      c.joinDateISO,
      c.joinYear,
      c.amount,
      c.dailyDue,
      c.guarantor || '',
      c.kycStatus,
      c.testNote
    ]);
  });

  // Row 29: Blank
  rows.push([]);

  // Row 30: Summary Row with native Excel formulas
  rows.push([
    'TOTAL / SUMMARY',
    '24 Records Loaded',
    '',
    '',
    '',
    'Total Sanctioned:',
    { t: 'n', f: 'SUM(G5:G28)', v: 1254500 },
    { t: 'n', f: 'SUM(H5:H28)', v: 37980 },
    '',
    '',
    'Formula Summary Row for Automated Audit Verification'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }  // Subtitle
  ];

  // Column Widths
  ws['!cols'] = [
    { wch: 14 }, // Client Code
    { wch: 25 }, // Customer Name
    { wch: 28 }, // Area / Town
    { wch: 16 }, // Contact Phone
    { wch: 14 }, // Joining Date
    { wch: 14 }, // Joining Year
    { wch: 18 }, // Credit Limit
    { wch: 22 }, // Daily Installment
    { wch: 20 }, // Guarantor Name
    { wch: 14 }, // KYC Status
    { wch: 45 }  // Test Scenario
  ];

  return ws;
}

// -------------------------------------------------------------
// BUILD SET 2: FIELD OPERATIONS & AUDIT LEDGER (DIFFERENT STRUCTURE & ALIGNMENTS)
// -------------------------------------------------------------
export function buildSet2Worksheet() {
  const rows = [];

  // Row 1: Merged Title Banner
  rows.push(['FIELD OPERATIONS & CUSTOMER CREDIT LOG (SET 2: OPERATIONAL STRUCTURE)']);

  // Row 2: Subtitle
  rows.push(['Alternate Schema & Column Ordering | Mixed Phone Prefixes (+91) | DD/MM/YYYY Dates | Balance Tracking | System Validation Matrix']);

  // Row 3: Blank separator
  rows.push([]);

  // Row 4: Column Headers (Different order & different names!)
  rows.push([
    'Sl_No',
    'Account_Ref',
    'Borrower_Full_Name',
    'Primary_Contact',
    'Secondary_Contact',
    'District_Region',
    'Registration_Date',
    'Tenure_Year',
    'Sanctioned_Limit_INR',
    'Current_Balance_INR',
    'Address_Landmark',
    'Audit_Classification'
  ]);

  // Rows 5..28: 24 Data rows
  CLIENT_DATASET.forEach(c => {
    rows.push([
      c.slNo,
      c.code2,
      c.name2,
      c.phone2 || '',
      c.altPhone,
      c.district || '',
      c.joinDateAlt,
      c.joinYear,
      c.amount,
      c.balance,
      c.address || '',
      c.auditFlag
    ]);
  });

  // Row 29: Blank
  rows.push([]);

  // Row 30: Summary Row
  rows.push([
    '',
    'AUDIT TOTALS',
    'Active Borrowers: 24',
    '',
    '',
    '',
    '',
    '',
    { t: 'n', f: 'SUM(I5:I28)', v: 1254500 },
    { t: 'n', f: 'SUM(J5:J28)', v: 530950 },
    '',
    'Audited Set 2'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
  ];

  // Column Widths
  ws['!cols'] = [
    { wch: 8 },  // Sl_No
    { wch: 18 }, // Account_Ref
    { wch: 38 }, // Borrower_Full_Name
    { wch: 18 }, // Primary_Contact
    { wch: 18 }, // Secondary_Contact
    { wch: 18 }, // District_Region
    { wch: 18 }, // Registration_Date
    { wch: 14 }, // Tenure_Year
    { wch: 22 }, // Sanctioned_Limit_INR
    { wch: 22 }, // Current_Balance_INR
    { wch: 55 }, // Address_Landmark
    { wch: 25 }  // Audit_Classification
  ];

  return ws;
}

// -------------------------------------------------------------
// MAIN WORKBOOK GENERATION
// -------------------------------------------------------------
export function generateAllExcelFiles() {
  const rootDir = path.resolve(__dirname, '..');

  // 1. Combined Master Workbook (Contains both Set 1 & Set 2 sheets)
  const masterWb = XLSX.utils.book_new();
  const ws1 = buildSet1Worksheet();
  const ws2 = buildSet2Worksheet();
  XLSX.utils.book_append_sheet(masterWb, ws1, 'Set_1_Corporate_Master');
  XLSX.utils.book_append_sheet(masterWb, ws2, 'Set_2_Field_Operations');

  const masterPath = path.resolve(rootDir, 'Client_Test_Dataset_24_Records.xlsx');
  XLSX.writeFile(masterWb, masterPath);
  console.log(`✅ [1/3] Created Master Workbook (Both Sets): ${masterPath}`);

  // 2. Standalone Set 1 Workbook
  const wbSet1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbSet1, buildSet1Worksheet(), 'Client_Master_Register');
  const set1Path = path.resolve(rootDir, 'Client_Test_Set1_Corporate.xlsx');
  XLSX.writeFile(wbSet1, set1Path);
  console.log(`✅ [2/3] Created Standalone Set 1: ${set1Path}`);

  // 3. Standalone Set 2 Workbook
  const wbSet2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbSet2, buildSet2Worksheet(), 'Field_Operations_Log');
  const set2Path = path.resolve(rootDir, 'Client_Test_Set2_Field_Ops.xlsx');
  XLSX.writeFile(wbSet2, set2Path);
  console.log(`✅ [3/3] Created Standalone Set 2: ${set2Path}`);

  return { masterPath, set1Path, set2Path };
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllExcelFiles();
}
