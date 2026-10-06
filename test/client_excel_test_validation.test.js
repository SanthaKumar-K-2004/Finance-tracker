import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const XLSX = xlsx.default || xlsx;

const rootDir = path.resolve(__dirname, '..');
const masterFile = path.resolve(rootDir, 'Client_Test_Dataset_24_Records.xlsx');
const set1File = path.resolve(rootDir, 'Client_Test_Set1_Corporate.xlsx');
const set2File = path.resolve(rootDir, 'Client_Test_Set2_Field_Ops.xlsx');

test('Client Dataset Excel Test Suite', async (t) => {
  // Ensure test fixtures exist on-demand (no need to track binary files in git)
  if (!fs.existsSync(masterFile) || !fs.existsSync(set1File) || !fs.existsSync(set2File)) {
    const { generateAllExcelFiles } = await import('../scripts/generate_client_test_dataset.js');
    generateAllExcelFiles();
  }

  await t.test('1. Generated files exist on disk and have valid file sizes', () => {
    assert.strictEqual(fs.existsSync(masterFile), true, 'Master workbook should exist');
    assert.strictEqual(fs.existsSync(set1File), true, 'Set 1 workbook should exist');
    assert.strictEqual(fs.existsSync(set2File), true, 'Set 2 workbook should exist');

    const masterStat = fs.statSync(masterFile);
    const set1Stat = fs.statSync(set1File);
    const set2Stat = fs.statSync(set2File);

    assert.ok(masterStat.size > 5000, `Master file size ${masterStat.size} should be > 5KB`);
    assert.ok(set1Stat.size > 3000, `Set 1 file size ${set1Stat.size} should be > 3KB`);
    assert.ok(set2Stat.size > 3000, `Set 2 file size ${set2Stat.size} should be > 3KB`);
    console.log(`   📊 Master Workbook Size: ${(masterStat.size / 1024).toFixed(2)} KB`);
  });

  await t.test('2. Master Workbook has both sheets (Set 1 & Set 2)', () => {
    const wb = XLSX.readFile(masterFile);
    assert.ok(wb.SheetNames.includes('Set_1_Corporate_Master'), 'Sheet 1 must be present');
    assert.ok(wb.SheetNames.includes('Set_2_Field_Operations'), 'Sheet 2 must be present');
    assert.strictEqual(wb.SheetNames.length, 2, 'Should contain exactly 2 sheets');
  });

  await t.test('3. Set 1 (Corporate Register): Validate 24 clients, varied data, and missing fields', () => {
    const wb = XLSX.readFile(masterFile);
    const sheet = wb.Sheets['Set_1_Corporate_Master'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Header is on Row index 3 (Row 4 in Excel)
    const headerRow = rows[3];
    assert.strictEqual(headerRow[0], 'Client Code');
    assert.strictEqual(headerRow[1], 'Customer Name');
    assert.strictEqual(headerRow[2], 'Area / Town');
    assert.strictEqual(headerRow[3], 'Contact Phone');
    assert.strictEqual(headerRow[4], 'Joining Date');
    assert.strictEqual(headerRow[5], 'Joining Year');
    assert.strictEqual(headerRow[6], 'Credit Limit (INR)');

    // Data rows 4..27 (24 clients)
    const dataRows = rows.slice(4, 28);
    assert.strictEqual(dataRows.length, 24, 'Must have exactly 24 client rows');

    const areas = new Set();
    const amounts = new Set();
    const years = new Set();
    let missingPhonesCount = 0;
    let missingAreasCount = 0;
    let missingGuarantorsCount = 0;
    let totalCredit = 0;

    dataRows.forEach((r, idx) => {
      const code = r[0];
      const name = r[1];
      const area = r[2];
      const phone = r[3];
      const joinDate = r[4];
      const joinYear = r[5];
      const credit = Number(r[6]);
      const guarantor = r[8];

      assert.ok(code.startsWith('CLI-'), `Row ${idx + 1} code should start with CLI-`);
      assert.ok(name.length > 0, `Row ${idx + 1} name should not be empty`);

      if (area) areas.add(area);
      else missingAreasCount++;

      amounts.add(credit);
      years.add(joinYear);
      totalCredit += credit;

      if (!phone || String(phone).trim() === '') {
        missingPhonesCount++;
      } else {
        // Validate clean 10-digit number
        assert.ok(/^\d{10}$/.test(String(phone)), `Phone ${phone} should be 10 digits`);
      }

      if (!guarantor || String(guarantor).trim() === '') {
        missingGuarantorsCount++;
      }

      // Check ISO Date format YYYY-MM-DD
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(joinDate), `Date ${joinDate} should match YYYY-MM-DD`);
    });

    console.log(`   📈 Set 1 Distinct Areas: ${areas.size} | Distinct Amounts: ${amounts.size} / 24 | Years: ${Array.from(years).sort().join(', ')}`);
    console.log(`   🔍 Set 1 Missing Phones: ${missingPhonesCount} | Missing Areas: ${missingAreasCount} | Missing Guarantors: ${missingGuarantorsCount}`);

    assert.ok(areas.size >= 18, 'Must have at least 18 distinct areas represented');
    assert.strictEqual(amounts.size, 24, 'All 24 clients must have distinct amounts');
    assert.ok(years.size >= 7, 'Must span at least 7 different joining years');
    assert.strictEqual(missingPhonesCount, 5, 'Must have exactly 5 clients with missing phone numbers');
    assert.strictEqual(missingAreasCount, 2, 'Must have exactly 2 clients with missing areas');
    assert.strictEqual(missingGuarantorsCount, 5, 'Must have exactly 5 clients with missing guarantors');
    assert.strictEqual(totalCredit, 1254500, 'Sum of credit must equal ₹12,54,500');
  });

  await t.test('4. Set 2 (Field Operations Log): Validate alternate structure, DD/MM/YYYY dates, and schemas', () => {
    const wb = XLSX.readFile(masterFile);
    const sheet = wb.Sheets['Set_2_Field_Operations'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Header row 3
    const headerRow = rows[3];
    assert.strictEqual(headerRow[0], 'Sl_No');
    assert.strictEqual(headerRow[1], 'Account_Ref');
    assert.strictEqual(headerRow[2], 'Borrower_Full_Name');
    assert.strictEqual(headerRow[3], 'Primary_Contact');
    assert.strictEqual(headerRow[4], 'Secondary_Contact');
    assert.strictEqual(headerRow[5], 'District_Region');
    assert.strictEqual(headerRow[6], 'Registration_Date');
    assert.strictEqual(headerRow[8], 'Sanctioned_Limit_INR');
    assert.strictEqual(headerRow[9], 'Current_Balance_INR');
    assert.strictEqual(headerRow[11], 'Audit_Classification');

    const dataRows = rows.slice(4, 28);
    assert.strictEqual(dataRows.length, 24, 'Must have exactly 24 rows in Set 2');

    let phoneWithCountryCodeCount = 0;
    let missingPhonesCount = 0;
    let totalSanctioned = 0;
    let totalBalance = 0;

    dataRows.forEach((r, idx) => {
      const sl = r[0];
      const ref = r[1];
      const fullName = r[2];
      const phone = r[3];
      const regDate = r[6];
      const sanction = Number(r[8]);
      const balance = Number(r[9]);
      const flag = r[11];

      assert.strictEqual(sl, idx + 1, 'Sl_No should be sequential 1..24');
      assert.ok(ref.startsWith('ACC-TN-'), 'Account ref should follow ACC-TN- prefix');
      assert.ok(fullName.includes('('), 'Full name in Set 2 includes guardian/spouse in parentheses');
      assert.ok(/^\d{2}\/\d{2}\/\d{4}$/.test(regDate), `Registration Date ${regDate} must be in DD/MM/YYYY format`);

      if (phone && phone.startsWith('+91')) {
        phoneWithCountryCodeCount++;
      } else if (!phone) {
        missingPhonesCount++;
      }

      totalSanctioned += sanction;
      totalBalance += balance;
      assert.ok(balance <= sanction, `Current balance ${balance} must not exceed sanction ${sanction}`);
      assert.ok(flag.length > 0, 'Audit classification flag must be provided');
    });

    console.log(`   📱 Set 2 Phones with +91 format: ${phoneWithCountryCodeCount} | Missing: ${missingPhonesCount}`);
    console.log(`   💰 Set 2 Total Sanctioned: ₹${totalSanctioned.toLocaleString('en-IN')} | Total Balance: ₹${totalBalance.toLocaleString('en-IN')}`);

    assert.strictEqual(missingPhonesCount, 5, 'Set 2 must also reflect 5 missing phones');
    assert.strictEqual(phoneWithCountryCodeCount, 19, 'Set 2 must format active phones with +91 country code');
    assert.strictEqual(totalSanctioned, 1254500, 'Total sanctioned limit must match ₹12,54,500');
  });

  await t.test('5. Verify Standalone Workbooks are independent and load cleanly', () => {
    const wb1 = XLSX.readFile(set1File);
    assert.strictEqual(wb1.SheetNames.length, 1);
    assert.strictEqual(wb1.SheetNames[0], 'Client_Master_Register');

    const wb2 = XLSX.readFile(set2File);
    assert.strictEqual(wb2.SheetNames.length, 1);
    assert.strictEqual(wb2.SheetNames[0], 'Field_Operations_Log');

    const s1Rows = XLSX.utils.sheet_to_json(wb1.Sheets['Client_Master_Register'], { header: 1 });
    const s2Rows = XLSX.utils.sheet_to_json(wb2.Sheets['Field_Operations_Log'], { header: 1 });

    assert.strictEqual(s1Rows.slice(4, 28).length, 24);
    assert.strictEqual(s2Rows.slice(4, 28).length, 24);
    console.log('   ✅ Standalone single-sheet workbooks successfully validated');
  });
});
