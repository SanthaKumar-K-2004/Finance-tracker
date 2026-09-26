import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

const outDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Standard 30-day ALR Register (September 2026)
function generateStandardALR() {
  const wsData = [
    ['ALR FINANCE — DAILY COLLECTION REGISTER (தினசரி வசூல் பட்டியல்)'],
    ['MONTH / YEAR: 2026-09 | September 2026 (புரட்டாசி) | ROUTE: MADURAI MAIN MARKET'],
    [
      'Sl.No', 'Code', 'Name', 'Phone', 'Address', 'Principal\nAmount',
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      'Total\nCollected', 'Remaining\nBalance', 'Excess'
    ],
    // Row 1: Senthil Kumar (₹10,000 with comma)
    [
      1, 'ALR-1', 'Senthil Kumar (செந்தில் குமார்)', '9842101111', 'Madurai West', '10,000',
      350, 350, 350, 350, 350, 350, 350, 350, 350, 350,
      350, 350, 350, 350, 350, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      '=SUM(G4:AJ4)', '=MAX(0, F4-AK4)', '=MAX(0, AK4-F4)'
    ],
    // Row 2: Meenakshi Sundaram (₹15,000)
    [
      2, 'ALR-2', 'Meenakshi Sundaram (மீனாட்சி)', '9842102222', 'Alanganallur', '15,000',
      500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      '=SUM(G5:AJ5)', '=MAX(0, F5-AK5)', '=MAX(0, AK5-F5)'
    ],
    // Row 3: Murugesan (₹10,000)
    [
      3, 'ALR-3', 'Murugesan P (முருகேசன்)', '9842103333', 'Vadipatti', 10000,
      350, 350, 350, 350, 350, 350, 350, 350, 350, 350,
      350, 350, 350, 350, 350, 350, 350, 350, 350, 350,
      350, 350, 350, 350, 350, 350, 350, 350, 0, 0,
      '=SUM(G6:AJ6)', '=MAX(0, F6-AK6)', '=MAX(0, AK6-F6)'
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'September 2026');
  const filePath = path.resolve(outDir, 'Test_ALR_Register_Madurai_Market.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Created Standard Register: ${filePath}`);
}

// 2. Multi-Format Flexible Sheet (Alternative simple columns format)
function generateAlternativeFormat() {
  const wsData = [
    ['DAILY COLLECTION REGISTER'],
    ['MONTH / YEAR: 2026-09'],
    ['Sl.No', 'Code', 'Name', 'Phone', 'Address', 'Principal Amount', 1, 2, 3, 4, 5, 'Total Collected'],
    [1, 'ALR-101', 'Kavitha Devi (கவிதா)', '9842104444', 'Melur', '12,000', 400, 400, 400, 400, 400, 2000],
    [2, 'ALR-102', 'Ramasamy K (ராமசாமி)', '9842105555', 'Sholavandan', '8,000', 300, 300, 300, 300, 300, 1500]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Simple Register');
  const filePath = path.resolve(outDir, 'Test_ALR_Alternative_Format.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Created Alternative Format Register: ${filePath}`);
}

generateStandardALR();
generateAlternativeFormat();
