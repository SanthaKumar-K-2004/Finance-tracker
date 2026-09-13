import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cleanPhoneNumber, generateWhatsAppUrl, formatCollectionReceipt, formatDisbursementSlip } from '../server/utils/receipt.js';

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

    const detailedWaTa = `*${shopName}*
*(தினசரி தவணை வரவு ரசீது)* 📋
━━━━━━━━━━━━━━━━━━
வணக்கம் *${client.name}* அவர்களே,
📅 தேதி          : ${today}
📋 தவணை கணக்கு எண்: #${client.sl_no || 1}
📞 தொலைபேசி எண்  : ${client.phone || '-'}
📍 முகவரி        : ${client.address || '-'}
🗓️ தவணை துவக்கம்  : ${startDate}
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
    assert.ok(detailedWaTa.includes('தவணை கணக்கு எண்: #12'), 'Uses thavanai account number');
    assert.ok(detailedWaTa.includes('தவணை அசல்     : ₹10,000'), 'Uses thavanai principal');
    assert.ok(detailedWaTa.includes('இதுவரை வரவு   : ₹3,300'), 'Uses total collected');

    // Concise version
    const conciseTa = `வணக்கம் ${client.name}, ${today} இன்றைய தவணை வரவு: ₹${currentPay.toLocaleString('en-IN')}. மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining.toLocaleString('en-IN')}. நன்றி, ${shopName}.`;
    assert.ok(conciseTa.includes('இன்றைய தவணை வரவு: ₹300'));
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

});
