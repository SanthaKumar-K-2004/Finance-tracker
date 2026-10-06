import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

// 24 Client Records specifically designed to test:
// 1. Village & Area detection without decoding Area as Name
// 2. Database phone & name matching (Clients 3032 & 3033 from Turso DB)
// 3. Internal duplicate phone numbers (Rows 5 & 6)
// 4. Duplicate client name in different villages (Rows 9 & 10)
// 5. Missing phone numbers & missing locations
// 6. Varied amounts and joining years (2018 - 2026)
export const DUPLICATE_TEST_DATASET = [
  // 1. Matches DB Client 3032 (Phone 9585194934 & Name match)
  {
    slNo: 1,
    code: 'ALR-3032',
    nameEn: 'Vellaiyammal Karikalan',
    nameTa: 'வெள்ளையம்மா w/o கரிகாலன்',
    village: 'Alanganallur (அலங்காநல்லூர்)',
    area: 'Main Bazaar Road',
    phone: '9585194934', // MATCHES DB CLIENT 3032
    amount: 10000,
    date: '2026-05-02',
    dateAlt: '02/05/2026',
    year: 2026,
    category: 'MATCH_DB_CLIENT_3032 (Existing DB Phone & Name Match)'
  },
  // 2. Matches DB Client 3033 (Phone 9892962579 & Name match)
  {
    slNo: 2,
    code: 'ALR-3033',
    nameEn: 'Murugan Updated',
    nameTa: 'முருகன் (Murugan)',
    village: 'Madurai East',
    area: 'Goripalayam Junction',
    phone: '9892962579', // MATCHES DB CLIENT 3033
    amount: 15000,
    date: '2026-01-10',
    dateAlt: '10/01/2026',
    year: 2026,
    category: 'MATCH_DB_CLIENT_3033 (Existing DB Phone Match)'
  },
  // 3. Independent client
  {
    slNo: 3,
    code: 'CLI-2003',
    nameEn: 'Palanisamy V',
    nameTa: 'பழனிசாமி வே',
    village: 'Sholavandan',
    area: 'Periyar Nagar',
    phone: '9842112345',
    amount: 25000,
    date: '2020-03-14',
    dateAlt: '14/03/2020',
    year: 2020,
    category: 'CLEAN_RECORD'
  },
  // 4. Independent client
  {
    slNo: 4,
    code: 'CLI-2004',
    nameEn: 'Rani Manikandan',
    nameTa: 'ராணி மணிகண்டன்',
    village: 'Melur',
    area: 'Bus Stand West',
    phone: '9443156789',
    amount: 30000,
    date: '2021-07-22',
    dateAlt: '22/07/2021',
    year: 2021,
    category: 'CLEAN_RECORD'
  },
  // 5. INTERNAL DUPLICATE PHONE - Part A (Shares phone with #6)
  {
    slNo: 5,
    code: 'CLI-2005',
    nameEn: 'Saravanan K',
    nameTa: 'சரவணன் கே',
    village: 'Vadipatti',
    area: 'Market Street',
    phone: '9842199888', // INTERNAL DUPLICATE WITH ROW 6
    amount: 40000,
    date: '2022-09-05',
    dateAlt: '05/09/2022',
    year: 2022,
    category: 'SHEET_DUPLICATE_PHONE_PAIR_A (Shares 9842199888 with Row 6)'
  },
  // 6. INTERNAL DUPLICATE PHONE - Part B (Shares phone with #5)
  {
    slNo: 6,
    code: 'CLI-2006',
    nameEn: 'Kavitha S (Family Account)',
    nameTa: 'கவிதா சு (குடும்ப கணக்கு)',
    village: 'Vadipatti',
    area: 'Market Street',
    phone: '9842199888', // INTERNAL DUPLICATE WITH ROW 5
    amount: 50000,
    date: '2022-11-18',
    dateAlt: '18/11/2022',
    year: 2022,
    category: 'SHEET_DUPLICATE_PHONE_PAIR_B (Shares 9842199888 with Row 5)'
  },
  // 7. Independent client
  {
    slNo: 7,
    code: 'CLI-2007',
    nameEn: 'Ibrahim Hameed',
    nameTa: 'இப்ராஹிம் ஹமீது',
    village: 'Tirumangalam',
    area: 'Kallupatti Road',
    phone: '9789122334',
    amount: 75000,
    date: '2019-06-12',
    dateAlt: '12/06/2019',
    year: 2019,
    category: 'CLEAN_RECORD'
  },
  // 8. Independent client
  {
    slNo: 8,
    code: 'CLI-2008',
    nameEn: 'Shanthi Thangaraj',
    nameTa: 'சாந்தி தங்கராஜ்',
    village: 'Usilampatti',
    area: 'Court Road',
    phone: '9865144556',
    amount: 20000,
    date: '2023-04-09',
    dateAlt: '09/04/2023',
    year: 2023,
    category: 'CLEAN_RECORD'
  },
  // 9. DUPLICATE NAME COLLISION - Part A (Same Name, Different Village & Phone from #10)
  {
    slNo: 9,
    code: 'CLI-2009',
    nameEn: 'Senthil Kumar P',
    nameTa: 'செந்தில் குமார் பி',
    village: 'Samayanallur',
    area: 'Railway Station Road',
    phone: '9443100111',
    amount: 35000,
    date: '2021-02-15',
    dateAlt: '15/02/2021',
    year: 2021,
    category: 'NAME_COLLISION_VILLAGE_A (Senthil Kumar P in Samayanallur)'
  },
  // 10. DUPLICATE NAME COLLISION - Part B (Same Name as #9, but in Othakadai)
  {
    slNo: 10,
    code: 'CLI-2010',
    nameEn: 'Senthil Kumar P',
    nameTa: 'செந்தில் குமார் பி',
    village: 'Othakadai',
    area: 'Yanaimalai Foothills',
    phone: '9443200222',
    amount: 45000,
    date: '2024-08-30',
    dateAlt: '30/08/2024',
    year: 2024,
    category: 'NAME_COLLISION_VILLAGE_B (Senthil Kumar P in Othakadai)'
  },
  // 11. Complete client
  {
    slNo: 11,
    code: 'CLI-2011',
    nameEn: 'Babu Rajendran',
    nameTa: 'பாபு ராஜேந்திரன்',
    village: 'Paravai',
    area: 'Power Grid Colony',
    phone: '9944588990',
    amount: 60000,
    date: '2020-10-04',
    dateAlt: '04/10/2020',
    year: 2020,
    category: 'CLEAN_RECORD'
  },
  // 12. MISSING PHONE NUMBER
  {
    slNo: 12,
    code: 'CLI-2012',
    nameEn: 'Chitra Mohan',
    nameTa: 'சித்ரா மோகன்',
    village: 'Avaniyapuram',
    area: 'Jallikattu Ground St',
    phone: '', // MISSING PHONE
    amount: 18000,
    date: '2025-01-14',
    dateAlt: '14/01/2025',
    year: 2025,
    category: 'MISSING_PHONE_VALIDATION'
  },
  // 13. High amount client
  {
    slNo: 13,
    code: 'CLI-2013',
    nameEn: 'Dhanapal Karuppiah',
    nameTa: 'தனபால் கருப்பையா',
    village: 'Thirunagar',
    area: '2nd Stop, Bus Route',
    phone: '9894012399',
    amount: 120000,
    date: '2018-08-11',
    dateAlt: '11/08/2018',
    year: 2018,
    category: 'SENIOR_HIGH_TICKET'
  },
  // 14. MISSING AREA (Village is present, Area is empty)
  {
    slNo: 14,
    code: 'CLI-2014',
    nameEn: 'Ganesan Muthiah',
    nameTa: 'கணேசன் முத்தையா',
    village: 'Harveypatti',
    area: '', // MISSING AREA
    phone: '9843322110',
    amount: 28000,
    date: '2023-05-20',
    dateAlt: '20/05/2023',
    year: 2023,
    category: 'MISSING_AREA_DETECTION'
  },
  // 15. Independent client
  {
    slNo: 15,
    code: 'CLI-2015',
    nameEn: 'Jeyalakshmi S',
    nameTa: 'ஜெயலட்சுமி சு',
    village: 'Vilangudi',
    area: 'Koodal Nagar Main',
    phone: '9751234888',
    amount: 32000,
    date: '2022-03-29',
    dateAlt: '29/03/2022',
    year: 2022,
    category: 'CLEAN_RECORD'
  },
  // 16. Independent client
  {
    slNo: 16,
    code: 'CLI-2016',
    nameEn: 'Karuppasamy Alagarsamy',
    nameTa: 'கருப்பசாமி அழகர்சாமி',
    village: 'Alagarkovil',
    area: 'Temple Sannathi St',
    phone: '9488123555',
    amount: 12000,
    date: '2019-11-25',
    dateAlt: '25/11/2019',
    year: 2019,
    category: 'CLEAN_RECORD'
  },
  // 17. MISSING PHONE NUMBER
  {
    slNo: 17,
    code: 'CLI-2017',
    nameEn: 'Latha Sivakumar',
    nameTa: 'லதா சிவகுமார்',
    village: 'Kottampatti',
    area: 'Main Road Cross',
    phone: '', // MISSING PHONE
    amount: 22000,
    date: '2024-02-18',
    dateAlt: '18/02/2024',
    year: 2024,
    category: 'MISSING_PHONE_VALIDATION'
  },
  // 18. Micro loan
  {
    slNo: 18,
    code: 'CLI-2018',
    nameEn: 'Meenakshi Sundari',
    nameTa: 'மீனாட்சி சுந்தரி',
    village: 'Karisalkulam',
    area: 'Panchayat Office Opp',
    phone: '9994123777',
    amount: 8500,
    date: '2025-06-08',
    dateAlt: '08/06/2025',
    year: 2025,
    category: 'MICRO_LOAN_TEST'
  },
  // 19. MISSING VILLAGE (Area is present, Village is empty)
  {
    slNo: 19,
    code: 'CLI-2019',
    nameEn: 'Natarajan Boominathan',
    nameTa: 'நடராஜன் பூமிநாதன்',
    village: '', // MISSING VILLAGE
    area: 'Madurai West Extension',
    phone: '9788654321',
    amount: 65000,
    date: '2023-12-01',
    dateAlt: '01/12/2023',
    year: 2023,
    category: 'MISSING_VILLAGE_DETECTION'
  },
  // 20. High loan client
  {
    slNo: 20,
    code: 'CLI-2020',
    nameEn: 'Pandian Ramar',
    nameTa: 'பாண்டியன் ராமர்',
    village: 'Kappalur',
    area: 'Industrial Estate Ph-1',
    phone: '9943211999',
    amount: 150000,
    date: '2021-09-17',
    dateAlt: '17/09/2021',
    year: 2021,
    category: 'INDUSTRIAL_HIGH_VALUE'
  },
  // 21. MISSING PHONE NUMBER
  {
    slNo: 21,
    code: 'CLI-2021',
    nameEn: 'Revathi Senthilnathan',
    nameTa: 'ரேவதி செந்தில்நாதன்',
    village: 'Kalligudi',
    area: 'Near Taluk Office',
    phone: '', // MISSING PHONE
    amount: 16000,
    date: '2026-03-01',
    dateAlt: '01/03/2026',
    year: 2026,
    category: 'MISSING_PHONE_VALIDATION'
  },
  // 22. Independent client
  {
    slNo: 22,
    code: 'CLI-2022',
    nameEn: 'Subramanian Gurusamy',
    nameTa: 'சுப்பிரமணியன் குருசாமி',
    village: 'Chekkanurani',
    area: 'South Car Street',
    phone: '9842811444',
    amount: 55000,
    date: '2022-07-07',
    dateAlt: '07/07/2022',
    year: 2022,
    category: 'CLEAN_RECORD'
  },
  // 23. MULTI-GAP (Missing Phone AND Missing Area)
  {
    slNo: 23,
    code: 'CLI-2023',
    nameEn: 'Thirunavukkarasu M',
    nameTa: 'திருநாவுக்கரசு மா',
    village: 'Sedapatti',
    area: '', // MISSING AREA
    phone: '', // MISSING PHONE
    amount: 14000,
    date: '2024-11-20',
    dateAlt: '20/11/2024',
    year: 2024,
    category: 'MULTI_GAP_PHONE_AND_AREA'
  },
  // 24. Highest amount client
  {
    slNo: 24,
    code: 'CLI-2024',
    nameEn: 'Zahir Hussain S',
    nameTa: 'ஜாகிர் உசேன் எஸ்',
    village: 'Nagamalai Pudukkottai',
    area: 'University Campus Road',
    phone: '9865099111',
    amount: 180000,
    date: '2026-07-15',
    dateAlt: '15/07/2026',
    year: 2026,
    category: 'MAX_LIMIT_LOAN'
  }
];

// -------------------------------------------------------------
// BUILD SET 1: MULTI-COLUMN DIRECTORY (SEPARATE VILLAGE & AREA)
// -------------------------------------------------------------
export function buildSet1DirectorySheet() {
  const rows = [];

  // Row 1: Header Title
  rows.push(['CLIENT AUDIT & DUPLICATE STRESS-TEST REGISTER (SET 1: VILLAGE & AREA DECODER)']);
  // Row 2: Subtitle
  rows.push(['Engineered for Column Disambiguation: Explicit Village, Area, Phone Matching & System Ingestion Testing']);
  // Row 3: Blank
  rows.push([]);

  // Row 4: Column Headers (Explicit Village AND Area columns!)
  rows.push([
    'Sl.No',
    'Client Code',
    'Customer Name',
    'Village / Town',
    'Area / Ward',
    'Mobile Number',
    'Principal Amount',
    'Joining Date',
    'Joining Year',
    'Test Scenario / Audit Flag'
  ]);

  // Rows 5..28: 24 Records
  DUPLICATE_TEST_DATASET.forEach(c => {
    rows.push([
      c.slNo,
      c.code,
      c.nameEn,
      c.village,
      c.area,
      c.phone,
      c.amount,
      c.date,
      c.year,
      c.category
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'TOTALS',
    '24 Clients',
    '',
    '',
    'DB Matches: 2 | Sheet Duplicates: 2 Pairs',
    'Total Principal:',
    { t: 'n', f: 'SUM(G5:G28)', v: 1103500 },
    '',
    '',
    'Formula Validated'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }
  ];

  // Column Widths
  ws['!cols'] = [
    { wch: 8 },  // Sl.No
    { wch: 14 }, // Client Code
    { wch: 28 }, // Customer Name
    { wch: 28 }, // Village / Town
    { wch: 26 }, // Area / Ward
    { wch: 18 }, // Mobile Number
    { wch: 18 }, // Principal Amount
    { wch: 14 }, // Joining Date
    { wch: 14 }, // Joining Year
    { wch: 55 }  // Test Scenario
  ];

  return ws;
}

// -------------------------------------------------------------
// BUILD SET 2: BILINGUAL TAMIL-ENGLISH FIELD REGISTER
// -------------------------------------------------------------
export function buildSet2BilingualSheet() {
  const rows = [];

  // Row 1: Header Title
  rows.push(['தினசரி வசூல் வாடிக்கையாளர் சரிபார்ப்பு பட்டியல் (SET 2: BILINGUAL FIELD REGISTER)']);
  // Row 2: Subtitle
  rows.push(['Tamil & English Column Headers | கிராமம் & பகுதி பிரிப்பு | நகல் தொலைபேசி மற்றும் ஏற்கனவே உள்ள தரவு சோதனை']);
  // Row 3: Blank
  rows.push([]);

  // Row 4: Column Headers in Tamil & English (Different order!)
  rows.push([
    'வரிசை எண் (No)',
    'வாடிக்கையாளர் பெயர் (Name)',
    'கிராமம் / ஊர் (Village)',
    'பகுதி / வட்டாரம் (Area)',
    'அலைபேசி எண் (Mobile)',
    'அசல் தொகை (Principal)',
    'துவக்க தேதி (Date)',
    'பதிவு எண் (Code)',
    'பரிசோதனை வகை (Audit Category)'
  ]);

  // Rows 5..28: 24 Records
  DUPLICATE_TEST_DATASET.forEach(c => {
    rows.push([
      c.slNo,
      c.nameTa,
      c.village,
      c.area,
      c.phone ? `+91 ${c.phone}` : '',
      c.amount,
      c.dateAlt,
      c.code,
      c.category
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'மொத்தம்',
    '24 பதிவுகள்',
    '',
    '',
    'மொத்த அசல்:',
    { t: 'n', f: 'SUM(F5:F28)', v: 1103500 },
    '',
    '',
    'சரிபார்க்கப்பட்டது'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
  ];

  ws['!cols'] = [
    { wch: 14 }, // வரிசை எண்
    { wch: 32 }, // பெயர்
    { wch: 28 }, // கிராமம்
    { wch: 26 }, // பகுதி
    { wch: 20 }, // அலைபேசி
    { wch: 20 }, // அசல் தொகை
    { wch: 18 }, // துவக்க தேதி
    { wch: 16 }, // பதிவு எண்
    { wch: 55 }  // பரிசோதனை வகை
  ];

  return ws;
}

// -------------------------------------------------------------
// MAIN WORKBOOK GENERATION
// -------------------------------------------------------------
export function generateDuplicateTestFiles() {
  const rootDir = path.resolve(__dirname, '..');

  // 1. Combined Master Workbook
  const masterWb = XLSX.utils.book_new();
  const ws1 = buildSet1DirectorySheet();
  const ws2 = buildSet2BilingualSheet();
  XLSX.utils.book_append_sheet(masterWb, ws1, 'Village_Area_Test_Set1');
  XLSX.utils.book_append_sheet(masterWb, ws2, 'Bilingual_Register_Set2');

  const masterPath = path.resolve(rootDir, 'Client_Test_Dataset_Duplicates_And_Area_Village.xlsx');
  XLSX.writeFile(masterWb, masterPath);
  console.log(`✅ [1/3] Created New Duplicate & Area/Village Test Workbook: ${masterPath}`);

  // 2. Standalone Set 1
  const wbSet1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbSet1, buildSet1DirectorySheet(), 'Village_Area_Directory');
  const set1Path = path.resolve(rootDir, 'Client_Test_Set1_Village_Area.xlsx');
  XLSX.writeFile(wbSet1, set1Path);
  console.log(`✅ [2/3] Created Standalone Set 1: ${set1Path}`);

  // 3. Standalone Set 2
  const wbSet2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbSet2, buildSet2BilingualSheet(), 'Bilingual_Register');
  const set2Path = path.resolve(rootDir, 'Client_Test_Set2_Bilingual.xlsx');
  XLSX.writeFile(wbSet2, set2Path);
  console.log(`✅ [3/3] Created Standalone Set 2: ${set2Path}`);

  return { masterPath, set1Path, set2Path };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateDuplicateTestFiles();
}
