import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatCollectionReceipt, formatDisbursementSlip } from '../server/utils/receipt.js';

describe('Receipt Data Structure & Minimal Clean Presentation Verification', () => {

  it('1. Detailed Tamil collection receipt has clean bold structure and does NOT include Loan Tenure or Expected Daily Due', () => {
    const slip = formatCollectionReceipt({
      name: 'செல்வி',
      phone: '9876543210',
      sl_no: 12,
      address: 'மெயின் ரோடு, அலங்காநல்லூர்',
      date: '10/09/2026',
      amount: 300,
      principal: 9300,
      total_collected: 3000,
      remaining: 6300,
      total_days: 31,
      start_date: '01/09/2026',
      lang: 'ta',
      format: 'detailed'
    });

    assert.ok(slip.includes('ALR ஃபைனான்ஸ் — தினசரி வசூல் ரசீது'), 'Must have Tamil shop title');
    assert.ok(slip.includes('வாடிக்கையாளர்: செல்வி (#12)'), 'Must contain client name and serial number');
    assert.ok(slip.includes('தொலைபேசி: 9876543210'), 'Must contain phone');
    assert.ok(slip.includes('முகவரி: மெயின் ரோடு, அலங்காநல்லூர்'), 'Must contain address');
    assert.ok(slip.includes('துவக்க தேதி: 01/09/2026'), 'Must contain loan start date');
    assert.ok(slip.includes('அசல் கடன்: ₹9,300'), 'Must mention principal');
    assert.ok(slip.includes('இதுவரை வசூல்: ₹3,000'), 'Must mention total collected so far');
    assert.ok(slip.includes('இன்று வசூல்: ₹300'), 'Must mention today collection');
    assert.ok(slip.includes('மீதமுள்ள நிலுவை: ₹6,300'), 'Must mention current remaining balance');

    // Verify loan tenure and daily due are NOT in collection receipt
    assert.strictEqual(slip.includes('கடன் தவணைக் காலம்'), false, 'Must NOT contain Loan Tenure in collection receipt');
    assert.strictEqual(slip.includes('எதிர்பார்க்கப்படும் தவணை'), false, 'Must NOT contain Expected Daily Due in collection receipt');
  });

  it('2. Detailed English collection receipt does NOT include Loan Tenure or Expected Daily Due', () => {
    const slip = formatCollectionReceipt({
      name: 'Selvi',
      phone: '9876543210',
      sl_no: 12,
      address: 'Main Road, Alanganallur',
      date: '10/09/2026',
      amount: 300,
      principal: 9300,
      total_collected: 3000,
      remaining: 6300,
      total_days: 31,
      start_date: '01/09/2026',
      lang: 'en',
      format: 'detailed'
    });

    assert.ok(slip.includes('ALR Finance — Daily Collection Receipt'), 'Must have English shop title');
    assert.ok(slip.includes('Client: Selvi (#12)'), 'Must contain client name and serial number');
    assert.ok(slip.includes('Start Date: 01/09/2026'), 'Must contain start date');
    assert.ok(slip.includes('Principal Loan: ₹9,300'), 'Must contain principal loan');
    assert.ok(slip.includes('Total Collected: ₹3,000'), 'Must contain total collected so far');
    assert.ok(slip.includes('Collected Today: ₹300'), 'Must contain today collected amount');
    assert.ok(slip.includes('Remaining Balance: ₹6,300'), 'Must contain remaining balance');

    // Verify loan tenure and daily due are NOT in collection receipt
    assert.strictEqual(slip.includes('Loan Tenure'), false, 'Must NOT mention Loan Tenure in collection receipt');
    assert.strictEqual(slip.includes('Expected Daily Due'), false, 'Must NOT mention Expected Daily Due in collection receipt');
  });

  it('3. Concise WhatsApp message maintains exact single-tap format required for instant messaging', () => {
    const conciseTa = formatCollectionReceipt({
      name: 'கார்த்திக்',
      date: '10/09/2026',
      amount: 300,
      remaining: 8700,
      lang: 'ta',
      format: 'concise'
    });
    assert.strictEqual(
      conciseTa,
      'வணக்கம் கார்த்திக், 10/09/2026 வசூல் தொகை: ₹300. மீதமுள்ள நிலுவை: ₹8,700. நன்றி, ALR ஃபைனான்ஸ்.'
    );

    const conciseEn = formatCollectionReceipt({
      name: 'Karthik',
      date: '10/09/2026',
      amount: 300,
      remaining: 8700,
      lang: 'en',
      format: 'concise'
    });
    assert.strictEqual(
      conciseEn,
      'Dear Karthik, Collection received on 10/09/2026: ₹300. Remaining balance: ₹8,700. Thank you, ALR Finance.'
    );
  });

});
