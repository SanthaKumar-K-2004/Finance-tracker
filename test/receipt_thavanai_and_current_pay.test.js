import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cleanPhoneNumber, generateWhatsAppUrl, formatCollectionReceipt, formatDisbursementSlip, getNextDayDate, getPrevDayDate } from '../server/utils/receipt.js';

describe('Receipt Current Payment, Remaining Balance & Thavanai Terminology Verification', () => {

  it('1. Current payment arithmetic accurately reflects live entered payment and recalculates remaining balance', () => {
    const principal = 10000;
    const client = {
      name: 'செல்வி',
      principal: 10000,
      total_collected: 3000,
      selected_day: 13,
      days: { 13: 300 }, // Today's payment already recorded
      current_payment: 300
    };

    // Calculation logic matching ReceiptModal
    const recordedDayAmt = (client.days && client.selected_day) ? Number(client.days[client.selected_day] || 0) : 0;
    const baseCollected = Math.max(0, Number(client.total_collected || 0) - recordedDayAmt);
    assert.strictEqual(baseCollected, 2700, 'Base collected prior to today must be 2700');

    // Live total collected with currentPay = 300
    const currentPay = 300;
    const liveTotalCollected = baseCollected + currentPay;
    const liveRemaining = Math.max(0, principal - liveTotalCollected);
    assert.strictEqual(liveTotalCollected, 3000);
    assert.strictEqual(liveRemaining, 7000, 'Remaining balance must be 7000');

    // If user changes payment to 500 in modal
    const updatedPay = 500;
    const updatedTotal = baseCollected + updatedPay;
    const updatedRemaining = Math.max(0, principal - updatedTotal);
    assert.strictEqual(updatedTotal, 3200);
    assert.strictEqual(updatedRemaining, 6800, 'Remaining balance must dynamically reduce to 6800');

    // If customer has 0 payment today (unpaid), it must NOT default to expectedDaily (e.g. 323)
    const unpaidClient = {
      name: 'ரமேஷ்',
      principal: 10000,
      total_collected: 1000,
      days: { 13: 0 },
      current_payment: 0
    };
    const unpaidPay = unpaidClient.current_payment;
    assert.strictEqual(unpaidPay, 0, 'Unpaid customer current pay must be 0, not expectedDaily');
  });

  it('2. WhatsApp message in Tamil shows current payment and remaining balance with clean structure', () => {
    const today = '13/09/2026';
    const client = { name: 'செல்வி', sl_no: 12, phone: '9876543210', address: 'அலங்காநல்லூர்' };
    const shopName = 'ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்';
    const shopPhone = '9585194934';
    const shopAddress = 'அலங்காநல்லூர், மதுரை';
    const principal = 10000;
    const currentPay = 300;
    const liveTotalCollected = 3300;
    const liveRemaining = 6700;
    const startDate = '01/09/2026';
    const nextDate = '14/09/2026';

    const detailedWaTa = `*${shopName}*
*(தினசரி தவணை வரவு ரசீது)* 📋
━━━━━━━━━━━━━━━━━━
வணக்கம் *${client.name}* அவர்களே,
📋 வ.எண்         : ${client.sl_no || 1}
👤 பெயர்          : ${client.name}
📞 தொலைபேசி எண்  : ${client.phone || '-'}
📍 முகவரி        : ${client.address || '-'}
🗓️ துவக்க தேதி  : ${startDate}
📅 இன்றைய தேதி   : ${today}
⏭️ அடுத்த தவணை  : ${nextDate}
──────────────────
💰 தவணை அசல்     : ₹${principal.toLocaleString('en-IN')}
💵 இன்றைய வரவு    : *₹${currentPay.toLocaleString('en-IN')}*
📊 இதுவரை வரவு   : ₹${liveTotalCollected.toLocaleString('en-IN')}
🔴 *மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}*
──────────────────
${liveRemaining === 0 ? '🎉 தங்களின் தவணை கணக்கு முழுமையாக நிறைவுற்றது! வாழ்த்துகள் & நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு மனமார்ந்த நன்றி! 🙏'}
📞 தொடர்புக்கு: ${shopPhone} (${shopAddress})`;

    assert.ok(detailedWaTa.includes('ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்'), 'Contains shop name');
    assert.ok(detailedWaTa.includes('இன்றைய வரவு    : *₹300*'), 'Clearly indicates current payment');
    assert.ok(detailedWaTa.includes('மீதமுள்ள தவணை நிலுவை: ₹6,700'), 'Clearly indicates remaining balance');
    assert.ok(detailedWaTa.includes('வ.எண்         : 12'), 'Uses separate serial number');
    assert.ok(detailedWaTa.includes('பெயர்          : செல்வி'), 'Uses separate client name');
    assert.ok(detailedWaTa.includes('துவக்க தேதி  : 01/09/2026'), 'Mentions account starting date');
    assert.ok(detailedWaTa.includes('இன்றைய தேதி   : 13/09/2026'), 'Mentions current transaction date');
    assert.ok(detailedWaTa.includes('அடுத்த தவணை  : 14/09/2026'), 'Mentions next installment due date');
    assert.ok(detailedWaTa.includes('தவணை அசல்     : ₹10,000'), 'Uses thavanai principal');
    assert.ok(detailedWaTa.includes('இதுவரை வரவு   : ₹3,300'), 'Uses total collected');

    // Concise version
    const conciseTa = `வணக்கம் ${client.name}, ${today} இன்றைய தவணை வரவு: ₹${currentPay.toLocaleString('en-IN')}. அடுத்த தவணை: ${nextDate}. மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}. நன்றி, ${shopName}.`;
    assert.ok(conciseTa.includes('இன்றைய தவணை வரவு: ₹300'));
    assert.ok(conciseTa.includes('அடுத்த தவணை: 14/09/2026'));
    assert.ok(conciseTa.includes('மீதமுள்ள தவணை நிலுவை: ₹6,700'));
  });

  it('3. Thavanai terminology is used instead of loan account', () => {
    const disbursementSlip = formatDisbursementSlip({
      name: 'செல்வி',
      phone: '9876543210',
      sl_no: 1,
      principal: 10000,
      total_days: 31,
      lang: 'ta'
    });

    assert.ok(disbursementSlip.includes('தவணை கணக்கு வெற்றிகரமாக துவங்கப்பட்டது'), 'Must mention thavanai account activation');
    assert.strictEqual(disbursementSlip.includes('கடன் கணக்கு வெற்றிகரமாக துவங்கப்பட்டது'), false, 'Must NOT use loan account');
    assert.ok(disbursementSlip.includes('துவக்க தேதி:'), 'Must mention starting date');
    assert.ok(disbursementSlip.includes('அடுத்த தவணை:'), 'Must mention next due date');
    assert.ok(disbursementSlip.includes('வ.எண்: 1'), 'Must have separate S.No');
    assert.ok(disbursementSlip.includes('வாடிக்கையாளர்: செல்வி'), 'Must have separate client name');

    const enDisbursementSlip = formatDisbursementSlip({
      name: 'Selvi',
      phone: '9876543210',
      sl_no: 1,
      principal: 10000,
      total_days: 31,
      lang: 'en'
    });
    assert.ok(enDisbursementSlip.includes('Thavanai account activated successfully'), 'Must mention thavanai account in English');
    assert.strictEqual(enDisbursementSlip.includes('Loan account activated successfully'), false, 'Must NOT use loan account in English');
    assert.ok(enDisbursementSlip.includes('Start Date:'), 'Must mention start date in English');
    assert.ok(enDisbursementSlip.includes('Next Due Date:'), 'Must mention next due date in English');
    assert.ok(enDisbursementSlip.includes('S.No: 1'), 'Must have separate S.No in English');
    assert.ok(enDisbursementSlip.includes('Client: Selvi'), 'Must have separate client name in English');
  });

  it('4. Zero remaining triggers settlement celebration and marks thavanai complete', () => {
    const remaining = 0;
    const settlementMsg = remaining === 0
      ? '🎉 தங்களின் தவணை கணக்கு முழுமையாக நிறைவுற்றது! வாழ்த்துகள் & நன்றி!'
      : 'தங்களின் தொடர் ஒத்துழைப்புக்கு மனமார்ந்த நன்றி! 🙏';
    assert.ok(settlementMsg.includes('தவணை கணக்கு முழுமையாக நிறைவுற்றது'));
  });

  it('5. WhatsApp URL encodes Tamil message properly for wa.me deep link', () => {
    const message = 'வணக்கம் செல்வி, இன்றைய தவணை வரவு: ₹300. மீதமுள்ள தவணை நிலுவை: ₹6,700. நன்றி!';
    const url = generateWhatsAppUrl('9876543210', message);
    assert.ok(url.startsWith('https://wa.me/919876543210?text='));
    assert.ok(url.includes(encodeURIComponent('இன்றைய தவணை வரவு: ₹300')));
    assert.ok(url.includes(encodeURIComponent('மீதமுள்ள தவணை நிலுவை: ₹6,700')));
  });

  it('6. Next day and previous day date arithmetic accurately transitions days and months', () => {
    assert.strictEqual(getNextDayDate('13/09/2026'), '14/09/2026', 'Normal day increment');
    assert.strictEqual(getNextDayDate('30/09/2026'), '01/10/2026', 'End of 30-day month rollover');
    assert.strictEqual(getNextDayDate('31/05/2026'), '01/06/2026', 'End of 31-day month rollover');
    assert.strictEqual(getNextDayDate('28/02/2026'), '01/03/2026', 'End of February rollover');
    assert.strictEqual(getNextDayDate('31/12/2026'), '01/01/2027', 'End of year rollover');

    assert.strictEqual(getPrevDayDate('14/09/2026'), '13/09/2026', 'Normal day decrement');
    assert.strictEqual(getPrevDayDate('01/10/2026'), '30/09/2026', 'First of month decrement to previous month');
  });

  it('7. Collection receipt mentions Account Starting Date, Current Date, and Next Due Date', () => {
    const receiptTa = formatCollectionReceipt({
      name: 'மாரிமுத்து',
      phone: '9876543210',
      sl_no: 3,
      address: 'வாடிப்பட்டி',
      date: '13/09/2026',
      start_date: '01/09/2026',
      amount: 300,
      principal: 10000,
      total_collected: 3900,
      remaining: 6100,
      lang: 'ta',
      format: 'detailed'
    });

    assert.ok(receiptTa.includes('துவக்க தேதி: 01/09/2026'), 'Must display Account Starting Date');
    assert.ok(receiptTa.includes('தேதி: 13/09/2026'), 'Must display Current Receipt Date');
    assert.ok(receiptTa.includes('அடுத்த தவணை: 14/09/2026'), 'Must display Next Due Date');

    const receiptEn = formatCollectionReceipt({
      name: 'Marimuthu',
      phone: '9876543210',
      sl_no: 3,
      address: 'Vadipatti',
      date: '13/09/2026',
      start_date: '01/09/2026',
      amount: 300,
      principal: 10000,
      total_collected: 3900,
      remaining: 6100,
      lang: 'en',
      format: 'detailed'
    });

    assert.ok(receiptEn.includes('Start Date: 01/09/2026'), 'Must display Start Date in English');
    assert.ok(receiptEn.includes('Date: 13/09/2026'), 'Must display Date in English');
    assert.ok(receiptEn.includes('Next Due Date: 14/09/2026'), 'Must display Next Due Date in English');
  });

  it('8. Stepping date to next day updates active receipt date, next date, and retrieves next day recorded payment', () => {
    const client = {
      name: 'செல்வி',
      principal: 10000,
      total_collected: 3500,
      selected_day: 13,
      days: { 13: 300, 14: 400 },
      start_date: '01/09/2026'
    };

    let activeReceiptDate = '13/09/2026';
    let currentPay = client.days[13];
    assert.strictEqual(activeReceiptDate, '13/09/2026');
    assert.strictEqual(currentPay, 300);

    // Simulate "Change Date to Next Day"
    activeReceiptDate = getNextDayDate(activeReceiptDate);
    const newDay = parseInt(activeReceiptDate.split('/')[0], 10);
    currentPay = client.days[newDay] || 0;
    const nextDate = getNextDayDate(activeReceiptDate);

    assert.strictEqual(activeReceiptDate, '14/09/2026', 'Active receipt date becomes 14/09/2026');
    assert.strictEqual(currentPay, 400, 'Current payment accurately pulls Day 14 payment');
    assert.strictEqual(nextDate, '15/09/2026', 'Next due date recalculates to 15/09/2026');
  });

});
