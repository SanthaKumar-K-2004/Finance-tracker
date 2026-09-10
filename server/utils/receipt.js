/**
 * WhatsApp & Receipt Template Utility for ALR Finance
 * Zero-cost wa.me deep link generator and receipt formatters
 */

export const DEFAULT_SHOP_NAME_TA = 'ALR ஃபைனான்ஸ்';
export const DEFAULT_SHOP_NAME_EN = 'ALR Finance';
export const DEFAULT_SHOP_PHONE = '9585194934';
export const DEFAULT_SHOP_ADDRESS_TA = 'அலங்காநல்லூர், மதுரை';
export const DEFAULT_SHOP_ADDRESS_EN = 'Alanganallur, Madurai';

/**
 * Normalize phone number to standard 12-digit Indian format (e.g., 919876543210)
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Generate zero-cost wa.me deep link URL
 */
export function generateWhatsAppUrl(phone, messageText) {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return '';
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Format collection receipt text (concise message or full thermal slip)
 */
export function formatCollectionReceipt({
  name,
  phone = '',
  sl_no = '',
  address = '',
  date = new Date().toLocaleDateString('en-GB'),
  amount = 0,
  principal = 10000,
  total_collected = 0,
  remaining = 0,
  total_days = 31,
  start_date = '',
  shopName,
  lang = 'ta',
  format = 'concise' // 'concise' | 'detailed'
}) {
  const resolvedShopName = shopName || (lang === 'ta' ? DEFAULT_SHOP_NAME_TA : DEFAULT_SHOP_NAME_EN);
  const formattedAmount = Number(amount || 0).toLocaleString('en-IN');
  const formattedRemaining = Number(remaining || 0).toLocaleString('en-IN');
  const formattedPrincipal = Number(principal || 0).toLocaleString('en-IN');
  const formattedTotalCollected = Number(total_collected || 0).toLocaleString('en-IN');
  const tenureDays = Number(total_days || 31);
  const expectedDaily = Math.round(Number(principal || 10000) / tenureDays).toLocaleString('en-IN');

  // 1. Concise 1-tap WhatsApp message
  if (format === 'concise') {
    if (lang === 'ta') {
      return `வணக்கம் ${name}, ${date} வசூல் தொகை: ₹${formattedAmount}. மீதமுள்ள நிலுவை: ₹${formattedRemaining}. நன்றி, ${resolvedShopName}.`;
    }
    return `Dear ${name}, Collection received on ${date}: ₹${formattedAmount}. Remaining balance: ₹${formattedRemaining}. Thank you, ${resolvedShopName}.`;
  }

  // 2. Full Thermal POS Slip Format
  if (lang === 'ta') {
    return `*${resolvedShopName} — தினசரி வசூல் ரசீது*
--------------------------------
வாடிக்கையாளர்: ${name} (#${sl_no || 1})
தொலைபேசி: ${phone || '-'}
முகவரி: ${address || '-'}
${start_date ? `துவக்க தேதி: ${start_date}\n` : ''}தேதி: ${date}

அசல் கடன்: ₹${formattedPrincipal}
இதுவரை வசூல்: ₹${formattedTotalCollected}
இன்று வசூல்: ₹${formattedAmount}
*மீதமுள்ள நிலுவை: ₹${formattedRemaining}*
--------------------------------
${Number(remaining) === 0 ? '🎉 தங்களின் கடன் முழுமையாக நிறைவுற்றது! நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!'}
தொடர்புக்கு: ${DEFAULT_SHOP_PHONE}`;
  }

  return `*${resolvedShopName} — Daily Collection Receipt*
--------------------------------
Client: ${name} (#${sl_no || 1})
Phone: ${phone || '-'}
Address: ${address || '-'}
${start_date ? `Start Date: ${start_date}\n` : ''}Date: ${date}

Principal Loan: ₹${formattedPrincipal}
Total Collected: ₹${formattedTotalCollected}
Collected Today: ₹${formattedAmount}
*Remaining Balance: ₹${formattedRemaining}*
--------------------------------
${Number(remaining) === 0 ? '🎉 Your loan is fully settled! Thank you!' : 'Thank you for your timely payment!'}
Contact: ${DEFAULT_SHOP_PHONE}`;
}

/**
 * Format new loan disbursement slip
 */
export function formatDisbursementSlip({
  name,
  phone = '',
  sl_no = '',
  address = '',
  date = new Date().toLocaleDateString('en-GB'),
  principal = 10000,
  total_days = 31,
  shopName,
  lang = 'ta'
}) {
  const resolvedShopName = shopName || (lang === 'ta' ? DEFAULT_SHOP_NAME_TA : DEFAULT_SHOP_NAME_EN);
  const formattedPrincipal = Number(principal || 10000).toLocaleString('en-IN');
  const tenureDays = Number(total_days || 31);
  const expectedDaily = Math.round(Number(principal || 10000) / tenureDays).toLocaleString('en-IN');

  if (lang === 'ta') {
    return `*${resolvedShopName} — புதிய கடன் அசல் வழங்கல் ரசீது*
--------------------------------
வாடிக்கையாளர்: ${name} (#${sl_no || 1})
தொலைபேசி: ${phone || '-'}
முகவரி: ${address || '-'}
தேதி: ${date}

வழங்கப்பட்ட அசல் கடன்: ₹${formattedPrincipal}
கடன் தவணைக் காலம்: ${tenureDays} நாட்கள்
எதிர்பார்க்கப்படும் தவணை/நாள்: ₹${expectedDaily} / நாள்
--------------------------------
கடன் கணக்கு வெற்றிகரமாக துவங்கப்பட்டது.
தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!
தொடர்புக்கு: ${DEFAULT_SHOP_PHONE}`;
  }

  return `*${resolvedShopName} — New Loan Disbursement Slip*
--------------------------------
Client: ${name} (#${sl_no || 1})
Phone: ${phone || '-'}
Address: ${address || '-'}
Date: ${date}

Principal Disbursed: ₹${formattedPrincipal}
Loan Tenure: ${tenureDays} Days
Expected Daily Due: ₹${expectedDaily} / day
--------------------------------
Loan account activated successfully.
Thank you for choosing us!
Contact: ${DEFAULT_SHOP_PHONE}`;
}
