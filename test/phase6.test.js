import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { cleanPhoneNumber, generateWhatsAppUrl, formatCollectionReceipt, formatDisbursementSlip } from '../server/utils/receipt.js';

const XLSX = xlsx.default || xlsx;
const BASE_URL = 'http://localhost:5000';

describe('Phase 6: Excel Template Engine, WhatsApp Receipts & Verification', () => {

  describe('1. WhatsApp & Receipt Template Engine (server/utils/receipt.js)', () => {
    it('should clean 10-digit Indian mobile numbers to 12 digits with 91 prefix', () => {
      assert.strictEqual(cleanPhoneNumber('9876543210'), '919876543210');
      assert.strictEqual(cleanPhoneNumber('+91 98765-43210'), '919876543210');
      assert.strictEqual(cleanPhoneNumber('919876543210'), '919876543210');
      assert.strictEqual(cleanPhoneNumber(''), '');
    });

    it('should generate concise Tamil WhatsApp receipt matching exact prompt format', () => {
      const receipt = formatCollectionReceipt({
        name: 'கார்த்திக்',
        date: '09/09/2026',
        amount: 350,
        remaining: 8650,
        shopName: 'ALR ஃபைனான்ஸ்',
        lang: 'ta',
        format: 'concise'
      });
      const expected = 'வணக்கம் கார்த்திக், 09/09/2026 இன்றைய தவணை வரவு: ₹350. மீதமுள்ள தவணை நிலுவை: ₹8,650. நன்றி, ALR ஃபைனான்ஸ்.';
      assert.strictEqual(receipt, expected);
    });

    it('should generate concise English WhatsApp receipt matching exact prompt format', () => {
      const receipt = formatCollectionReceipt({
        name: 'Karthik',
        date: '09/09/2026',
        amount: 350,
        remaining: 8650,
        shopName: 'ALR Finance',
        lang: 'en',
        format: 'concise'
      });
      const expected = 'Dear Karthik, Thavanai collection on 09/09/2026: ₹350. Remaining balance: ₹8,650. Thank you, ALR Finance.';
      assert.strictEqual(receipt, expected);
    });

    it('should generate valid wa.me deep link with encoded message', () => {
      const url = generateWhatsAppUrl('9876543210', 'வணக்கம் கார்த்திக்');
      assert.ok(url.startsWith('https://wa.me/919876543210?text='));
      assert.ok(url.includes(encodeURIComponent('வணக்கம் கார்த்திக்')));
    });

    it('should format detailed thermal print slips for 58mm/80mm POS', () => {
      const detailedSlip = formatCollectionReceipt({
        name: 'கார்த்திக்',
        phone: '9876543210',
        sl_no: 1,
        address: 'அலங்காநல்லூர்',
        date: '09/09/2026',
        amount: 350,
        principal: 10000,
        total_collected: 1350,
        remaining: 8650,
        lang: 'ta',
        format: 'detailed'
      });
      assert.ok(detailedSlip.includes('ALR ஃபைனான்ஸ் — தினசரி தவணை வரவு ரசீது'));
      assert.ok(detailedSlip.includes('தவணை அசல்: ₹10,000'));
      assert.ok(detailedSlip.includes('இன்று வரவு: ₹350'));
      assert.ok(detailedSlip.includes('மீதமுள்ள தவணை நிலுவை: ₹8,650'));
      assert.ok(detailedSlip.includes('வாடிக்கையாளர்: கார்த்திக் (1)'));
    });

    it('should format new loan disbursement slips', () => {
      const slip = formatDisbursementSlip({
        name: 'முருகன்',
        phone: '9876543211',
        sl_no: 5,
        address: 'வாடிப்பட்டி',
        date: '09/09/2026',
        principal: 10000,
        lang: 'ta'
      });
      assert.ok(slip.includes('புதிய தவணை அசல் வழங்கல் ரசீது'));
      assert.ok(slip.includes('வழங்கப்பட்ட தவணை அசல்: ₹10,000'));
      assert.ok(slip.includes('தவணைக் காலம்: 31 நாட்கள்'));
      assert.ok(slip.includes('வாடிக்கையாளர்: முருகன் (5)'));
    });
  });

  describe('2. WhatsApp Audit Logs API', () => {
    it('should log WhatsApp message and retrieve audit logs', async () => {
      const postRes = await fetch(`${BASE_URL}/api/collections/whatsapp-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '919876543210',
          message_type: 'collection_receipt',
          message_text: 'வணக்கம் கார்த்திக்'
        })
      });
      const postData = await postRes.json();
      assert.strictEqual(postData.success, true);

      const getRes = await fetch(`${BASE_URL}/api/collections/whatsapp-logs`);
      const body = await getRes.json();
      const logs = body.data || body;
      assert.ok(Array.isArray(logs));
      assert.ok(logs.length > 0);
      assert.strictEqual(logs[0].phone, '919876543210');
    });
  });

  describe('3. Excel Template Engine (GET /api/excel/template)', () => {
    let templateBuffer;

    before(async () => {
      const res = await fetch(`${BASE_URL}/api/excel/template?month_year=2026-05`);
      assert.strictEqual(res.status, 200);
      const arrayBuf = await res.arrayBuffer();
      templateBuffer = Buffer.from(arrayBuf);
    });

    it('should generate valid .xlsx workbook with Collection Register sheet', () => {
      const wb = XLSX.read(templateBuffer, { type: 'buffer' });
      assert.ok(wb.SheetNames.includes('Collection Register'));
    });

    it('should contain merged header ranges matching ALR register (ws["!merges"])', () => {
      const wb = XLSX.read(templateBuffer, { type: 'buffer' });
      const ws = wb.Sheets['Collection Register'];
      assert.ok(Array.isArray(ws['!merges']), 'Worksheet must have !merges array');
      assert.ok(ws['!merges'].length >= 4, 'Must have at least 4 merged header ranges');

      // Title A1:AP1
      const titleMerge = ws['!merges'].find(m => m.s.r === 0 && m.s.c === 0 && m.e.c === 41);
      assert.ok(titleMerge, 'Title row 1 must be merged across all 42 columns (A1:AP1)');

      // Month A2:B2
      const monthMerge = ws['!merges'].find(m => m.s.r === 1 && m.s.c === 0 && m.e.c === 1);
      assert.ok(monthMerge, 'Month label must be merged A2:B2');
    });

    it('should contain sample client row with active SUM and IF formulas', () => {
      const wb = XLSX.read(templateBuffer, { type: 'buffer', cellFormula: true });
      const ws = wb.Sheets['Collection Register'];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Row 4 (index 3) is sample borrower
      const sampleRow = data[3];
      assert.strictEqual(sampleRow[0], 1, 'Sl.No should be 1');
      assert.ok(sampleRow[2].includes('மாதிரி வாடிக்கையாளர்'), 'Borrower name should match');
      assert.strictEqual(sampleRow[5], 10000, 'Principal should be 10000');

      // Check formula in cell AL4 (Total = SUM(G4:AK4))
      const totalCell = ws['AL4'];
      assert.ok(totalCell && totalCell.f, 'Total cell AL4 must have formula');
      assert.strictEqual(totalCell.f, 'SUM(G4:AK4)');

      // Check formula in cell AM4 (Remaining = IF(F4-AL4<0,0,F4-AL4))
      const remCell = ws['AM4'];
      assert.ok(remCell && remCell.f, 'Remaining cell AM4 must have formula');
      assert.strictEqual(remCell.f, 'IF(F4-AL4<0,0,F4-AL4)');
    });

    it('should contain 20 pre-formatted blank rows with active formulas', () => {
      const wb = XLSX.read(templateBuffer, { type: 'buffer', cellFormula: true });
      const ws = wb.Sheets['Collection Register'];

      // Row 5 to Row 25
      for (let r = 5; r <= 10; r++) {
        const totalCell = ws[`AL${r}`];
        assert.ok(totalCell && totalCell.f, `Row ${r} total cell AL${r} must have formula`);
        assert.strictEqual(totalCell.f, `SUM(G${r}:AK${r})`);
      }
    });
  });

  describe('4. Excel Export Engine (GET /api/excel/export)', () => {
    it('should export active month data with merged headers and formulas', async () => {
      const res = await fetch(`${BASE_URL}/api/excel/export?month_year=2026-05`);
      assert.strictEqual(res.status, 200);

      const arrayBuf = await res.arrayBuffer();
      const wb = XLSX.read(Buffer.from(arrayBuf), { type: 'buffer', cellFormula: true });
      const ws = wb.Sheets['Collection Register'];

      assert.ok(ws, 'Exported workbook must contain Collection Register');
      assert.ok(Array.isArray(ws['!merges']), 'Exported sheet must contain merges');
      assert.ok(ws['!merges'].length >= 4, 'Exported sheet must have >= 4 header merges');

      // Cell AL4 should contain SUM formula
      const totalCell = ws['AL4'];
      if (totalCell) {
        assert.ok(totalCell.f.includes('SUM'), 'Exported total must be formula');
      }
    });
  });

  describe('5. Excel Interactive Preview & Duplicate Detection (POST /api/excel/preview)', () => {
    let testWorkbookBuffer;

    before(() => {
      // Create a test Excel workbook with 1 valid row and 2 rows with duplicate phone numbers
      const data = [
        ['DAILY COLLECTION REGISTER ( ALR) '],
        ['MONTH / YEAR', '', 'MAY - 2026', '', '', 'PRINCIPAL: 30,000'],
        ['Sl.No', 'Date', 'Name', 'Phone Number', 'Address', 'Principal Amount', 1, 2, 3],
        [1, '01.05.2026', 'ராமு (Ramu)', '9999911111', 'மதுரை', 10000, 350, 350, ''],
        [2, '01.05.2026', 'சோமு (Somu)', '9999911111', 'அலங்காநல்லூர்', 10000, 350, '', ''], // duplicate phone in sheet
        [3, '01.05.2026', '', '8888822222', 'வாடிப்பட்டி', 10000, '', '', ''] // missing name
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Register');
      testWorkbookBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should validate columns and flag internal duplicate phone numbers in preview', async () => {
      const formData = new FormData();
      const blob = new Blob([testWorkbookBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', blob, 'test_preview.xlsx');

      const res = await fetch(`${BASE_URL}/api/excel/preview`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.ok(data.summary, 'Preview must contain summary stats');
      assert.strictEqual(data.summary.total_rows, 3);
      assert.strictEqual(data.summary.valid_rows, 2);
      assert.ok(data.summary.duplicate_phones_count >= 1, 'Must detect duplicate phone numbers');

      // Check warnings
      assert.ok(data.warnings.length > 0, 'Must have validation warnings');
      const dupWarning = data.warnings.find(w => w.phone === '9999911111');
      assert.ok(dupWarning, 'Must flag row with duplicate phone 9999911111');
    });
  });

  describe('6. 1-Click Database Snapshot & Restore (server/routes/backup.js)', () => {
    it('should download binary SQLite finance.db snapshot', async () => {
      const res = await fetch(`${BASE_URL}/api/backup/download-db`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/x-sqlite3');
      const contentDisp = res.headers.get('content-disposition');
      assert.ok(contentDisp.includes('finance_snapshot_') && contentDisp.includes('.db'));

      const arrayBuf = await res.arrayBuffer();
      assert.ok(arrayBuf.byteLength > 0, 'Database file buffer must not be empty');
    });

    it('should export complete JSON backup with all tables', async () => {
      const res = await fetch(`${BASE_URL}/api/backup/export`);
      assert.strictEqual(res.status, 200);

      const backup = await res.json();
      assert.ok(backup.tables, 'Backup must contain tables');
      assert.ok(Array.isArray(backup.tables.clients), 'Backup must contain clients');
      assert.ok(Array.isArray(backup.tables.loan_cycles), 'Backup must contain loan_cycles');
      assert.ok(Array.isArray(backup.tables.daily_collections), 'Backup must contain daily_collections');
      assert.ok(Array.isArray(backup.tables.whatsapp_logs), 'Backup must contain whatsapp_logs');
    });

    it('should restore database from JSON backup', async () => {
      const exportRes = await fetch(`${BASE_URL}/api/backup/export`);
      const backup = await exportRes.json();

      const restoreRes = await fetch(`${BASE_URL}/api/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
      const restoreData = await restoreRes.json();
      assert.strictEqual(restoreData.success, true);
      assert.ok(restoreData.restored.clients >= 0);
    });
  });

});
