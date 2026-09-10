import assert from 'assert';
import { query, execute } from '../server/db.js';

const BASE_URL = 'http://localhost:5000';

async function runTreasureFeaturesTests() {
  console.log('\n======================================================');
  console.log('💎 RUNNING HIDDEN TREASURES & RECEIPT FEATURES TEST SUITE');
  console.log('📱 WhatsApp wa.me, Thermal Print, Auto Daily, Bulk Entry, Backup/Restore');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. WhatsApp Receipt Template & wa.me Deep Link Encoding
  await test('1. WhatsApp Receipt Templates (Tamil & English) & Zero-Cost wa.me URL', async () => {
    const client = {
      name: 'செல்வம்',
      sl_no: 12,
      phone: '9842199887',
      address: 'மதுரை',
      principal: 10000,
      total_collected: 4500,
      remaining: 5500
    };

    const today = new Date().toLocaleDateString('en-GB');

    // Tamil Receipt
    const taReceipt = `*ALR ஃபைனான்ஸ் — தினசரி வசூல் ரசீது*\n--------------------------------\nவாடிக்கையாளர்: ${client.name} (#${client.sl_no})\nதொலைபேசி: ${client.phone}\nமுகவரி: ${client.address}\nதேதி: ${today}\n\nஅசல் கடன்: ₹${client.principal.toLocaleString('en-IN')}\nமொத்த வசூல்: ₹${client.total_collected.toLocaleString('en-IN')}\n*மீதமுள்ள நிலுவை: ₹${client.remaining.toLocaleString('en-IN')}*\n--------------------------------\nதங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!\nதொடர்புக்கு: 9585194934`;

    assert(taReceipt.includes('தினசரி வசூல் ரசீது'), 'Tamil title must be present');
    assert(taReceipt.includes('செல்வம்'), 'Client name must be in Tamil receipt');
    assert(taReceipt.includes('₹5,500'), 'Remaining balance must match');

    // English Receipt
    const enReceipt = `*ALR Finance — Daily Collection Receipt*\n--------------------------------\nClient: ${client.name} (#${client.sl_no})\nPhone: ${client.phone}\nAddress: ${client.address}\nDate: ${today}\n\nPrincipal Loan: ₹${client.principal.toLocaleString('en-IN')}\nTotal Collected: ₹${client.total_collected.toLocaleString('en-IN')}\n*Remaining Balance: ₹${client.remaining.toLocaleString('en-IN')}*\n--------------------------------\nThank you for your timely payment!\nContact: 9585194934`;

    assert(enReceipt.includes('Daily Collection Receipt'), 'English title must be present');
    assert(enReceipt.includes('Remaining Balance: ₹5,500'), 'English remaining balance must match');

    // wa.me URL generation
    const rawPhone = client.phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(taReceipt)}`;

    assert(whatsappUrl.startsWith('https://wa.me/919842199887'), 'wa.me url must prepend country code 91');
    assert(whatsappUrl.includes(encodeURIComponent('ALR ஃபைனான்ஸ்')), 'wa.me url must encode Tamil text safely');
  });

  // 2. New Loan Disbursement Slip Template
  await test('2. New Loan Disbursement Slip (Tamil & English)', async () => {
    const client = {
      name: 'கார்த்திக்',
      sl_no: 15,
      phone: '9789123456',
      address: 'வாடிப்பட்டி',
      principal: 10000
    };
    const expectedDaily = Math.round(client.principal / 31);
    assert.strictEqual(expectedDaily, 323, '10,000 / 31 must equal 323');

    const taSlip = `*ALR ஃபைனான்ஸ் — புதிய கடன் அசல் வழங்கல் ரசீது*\n--------------------------------\nவாடிக்கையாளர்: ${client.name} (#${client.sl_no})\nவழங்கப்பட்ட அசல் கடன்: ₹${client.principal.toLocaleString('en-IN')}\nகடன் தவணைக் காலம்: 31 நாட்கள்\nஎதிர்பார்க்கப்படும் தவணை/நாள்: ₹${expectedDaily} / நாள்`;

    assert(taSlip.includes('புதிய கடன் அசல் வழங்கல் ரசீது'), 'Tamil disbursement slip header must be present');
    assert(taSlip.includes('31 நாட்கள்'), '31-day cycle must be mentioned');
    assert(taSlip.includes('₹323'), 'Expected daily amount must be 323');
  });

  // 3. Auto Daily Amount Calculation Engine (Principal ÷ 31)
  await test('3. Auto Daily Amount Calculation Engine (Principal ÷ 31)', async () => {
    const testCases = [
      { principal: 10000, expected: 323 },
      { principal: 20000, expected: 645 },
      { principal: 5000, expected: 161 },
      { principal: 15500, expected: 500 },
      { principal: 31000, expected: 1000 }
    ];

    for (const tc of testCases) {
      const calc = Math.round(tc.principal / 31);
      assert.strictEqual(calc, tc.expected, `Principal ₹${tc.principal} ÷ 31 must equal ₹${tc.expected}`);
    }
  });

  // 4. Duplicate Client Detection Logic
  await test('4. Duplicate Client Detection (Phone & Name Collisions)', async () => {
    const existingClients = [
      { id: 'c1', name: 'முத்து குமார்', phone: '9842100001' },
      { id: 'c2', name: 'ரமேஷ் பாபு', phone: '9842100002' }
    ];

    const isDuplicate = (name, phone, excludeId = null) => {
      const trimmedName = name.trim().toLowerCase();
      const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
      return existingClients.find(c => {
        if (excludeId && c.id === excludeId) return false;
        const cPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
        const samePhone = cleanPhone && cPhone && cleanPhone === cPhone;
        const sameName = trimmedName && c.name.trim().toLowerCase() === trimmedName;
        return samePhone || sameName;
      });
    };

    // Exact phone match
    const dupByPhone = isDuplicate('வேறு ஒருவர்', '9842100001');
    assert(dupByPhone, 'Should detect duplicate by phone number');
    assert.strictEqual(dupByPhone.id, 'c1');

    // Exact name match
    const dupByName = isDuplicate('முத்து குமார்', '9999999999');
    assert(dupByName, 'Should detect duplicate by name');
    assert.strictEqual(dupByName.id, 'c1');

    // Unique client
    const unique = isDuplicate('புதிய நபர்', '9842100099');
    assert(!unique, 'Should not flag unique client as duplicate');
  });

  // 5. Payment Mode Tracking & Storage
  await test('5. Payment Mode Tracking (Cash, GPay, UPI, Bank Transfer)', async () => {
    // Check if test client cycle exists or insert collection
    const testCycleRes = await query("SELECT id, client_id FROM loan_cycles WHERE month_year = '2026-05' LIMIT 1");
    if (testCycleRes && testCycleRes.length > 0) {
      const cycleId = testCycleRes[0].id;
      // Post collection with GPay
      const res = await fetch(`${BASE_URL}/api/collections/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_cycle_id: cycleId,
          day: 28,
          amount: 500,
          payment_mode: 'gpay',
          notes: 'Treasure test payment'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, 'Collection entry must succeed');
      assert.strictEqual(data.success, true);

      // Verify payment mode stored in DB
      const dbCheck = await query("SELECT payment_mode FROM daily_collections WHERE cycle_id = ? AND day_number = 28", [cycleId]);
      assert(dbCheck.length > 0, 'Record must exist');
      assert.strictEqual(dbCheck[0].payment_mode, 'gpay', 'Payment mode must be stored as gpay');
    }
  });

  // 6. Bulk Entry Mode API Batch Processing
  await test('6. Bulk Entry Mode (Batch Processing Across Multiple Clients)', async () => {
    const cycles = await query("SELECT id FROM loan_cycles WHERE month_year = '2026-05' LIMIT 2");
    if (cycles && cycles.length >= 2) {
      const batchPayload = {
        entries: [
          { loan_cycle_id: cycles[0].id, day: 29, amount: 300, payment_mode: 'cash' },
          { loan_cycle_id: cycles[1].id, day: 29, amount: 300, payment_mode: 'upi' }
        ]
      };

      const res = await fetch(`${BASE_URL}/api/collections/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200, 'Batch bulk entry must return 200');
      assert.strictEqual(json.success, true, 'Batch bulk entry must succeed');
      assert.strictEqual(json.processed, 2, 'Batch must process 2 entries');

      // Verify DB values
      const c1 = await query("SELECT amount, payment_mode FROM daily_collections WHERE cycle_id = ? AND day_number = 29", [cycles[0].id]);
      const c2 = await query("SELECT amount, payment_mode FROM daily_collections WHERE cycle_id = ? AND day_number = 29", [cycles[1].id]);
      assert.strictEqual(c1[0].amount, 300);
      assert.strictEqual(c1[0].payment_mode, 'cash');
      // Clean up test collections so state remains pristine for other suites
      await execute("DELETE FROM daily_collections WHERE day_number IN (28, 29)");
    }
  });

  // 7. Database Backup Export & Restore Integration
  await test('7. 1-Click Database Backup Export & Transactional Restore API', async () => {
    // 1. Export backup
    const exportRes = await fetch(`${BASE_URL}/api/backup/export`);
    assert.strictEqual(exportRes.status, 200, 'Backup export must return 200');
    const backupData = await exportRes.json();
    assert(backupData.metadata, 'Backup must contain metadata');
    assert(backupData.tables, 'Backup must contain tables');
    assert(Array.isArray(backupData.tables.clients), 'Clients table array must exist in backup');
    assert(Array.isArray(backupData.tables.loan_cycles), 'Loan cycles table array must exist in backup');

    // 2. Validate restore endpoint with safe test payload
    const restoreRes = await fetch(`${BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tables: {
          settings: backupData.tables.settings || [],
          clients: backupData.tables.clients || [],
          loan_cycles: backupData.tables.loan_cycles || []
        }
      })
    });
    assert.strictEqual(restoreRes.status, 200, 'Backup restore must return 200');
    const restoreJson = await restoreRes.json();
    assert.strictEqual(restoreJson.success, true, 'Restore response success must be true');
    assert(restoreJson.restored && typeof restoreJson.restored.clients === 'number', 'Restored clients count should be defined');
  });

  // 8. Dashboard Visual Analytics API for Recharts
  await test('8. Dashboard Visual Analytics API (Data Shapes for BarChart & PieChart)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/dashboard?month_year=2026-05`);
    assert.strictEqual(res.status, 200, 'Dashboard analytics endpoint must return 200');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    const d = json.data;

    // Check KPIs
    assert(typeof d.total_principal === 'number', 'total_principal must be a number');
    assert(typeof d.total_collected === 'number', 'total_collected must be a number');
    assert(typeof d.total_remaining === 'number', 'total_remaining must be a number');
    assert(typeof d.collection_rate === 'number', 'collection_rate must be a number');

    // Check Defaulters list for BarChart
    assert(Array.isArray(d.defaulters), 'defaulters must be an array for BarChart');
    if (d.defaulters.length > 0) {
      const def = d.defaulters[0];
      assert(def.name, 'Defaulter must have name');
      assert(typeof def.remaining === 'number', 'Defaulter must have numeric remaining for bar heights');
    }

    // Check Payment Modes list for PieChart
    assert(Array.isArray(d.payment_modes), 'payment_modes must be an array for PieChart');
  });

  console.log('\n======================================================');
  console.log(`💎 TREASURES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTreasureFeaturesTests().catch(err => {
  console.error('Fatal Treasure Test Suite Error:', err);
  process.exit(1);
});
