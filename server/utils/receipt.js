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
 * Calculate the next day's date in DD/MM/YYYY format
 */
export function getNextDayDate(dStr) {
  if (!dStr) return '';
  let d, m, y;
  if (dStr.includes('/')) {
    [d, m, y] = dStr.split('/').map(Number);
  } else if (dStr.includes('-')) {
    [y, m, d] = dStr.split('-').map(Number);
  } else {
    const dt = new Date(dStr);
    if (isNaN(dt.getTime())) return '';
    dt.setDate(dt.getDate() + 1);
    const nd = String(dt.getDate()).padStart(2, '0');
    const nm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${nd}/${nm}/${dt.getFullYear()}`;
  }
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const nd = String(dt.getDate()).padStart(2, '0');
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const ny = dt.getFullYear();
  return `${nd}/${nm}/${ny}`;
}

/**
 * Calculate the previous day's date in DD/MM/YYYY format
 */
export function getPrevDayDate(dStr) {
  if (!dStr) return '';
  let d, m, y;
  if (dStr.includes('/')) {
    [d, m, y] = dStr.split('/').map(Number);
  } else if (dStr.includes('-')) {
    [y, m, d] = dStr.split('-').map(Number);
  } else {
    const dt = new Date(dStr);
    if (isNaN(dt.getTime())) return '';
    dt.setDate(dt.getDate() - 1);
    const nd = String(dt.getDate()).padStart(2, '0');
    const nm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${nd}/${nm}/${dt.getFullYear()}`;
  }
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const nd = String(dt.getDate()).padStart(2, '0');
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const ny = dt.getFullYear();
  return `${nd}/${nm}/${ny}`;
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
  next_date = '',
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
  const resolvedNextDate = next_date || getNextDayDate(date);

  // 1. Concise 1-tap WhatsApp message
  if (format === 'concise') {
    const isZeroPay = Number(amount || 0) === 0;
    if (lang === 'ta') {
      return isZeroPay
        ? `வணக்கம் ${name}, ${date} நிலுவைத் தவணைத் தொகை: ₹${formattedRemaining}. ${resolvedShopName}.`
        : `வணக்கம் ${name}, ${date} இன்றைய தவணை வரவு: ₹${formattedAmount}. மீதமுள்ள தவணை நிலுவை: ₹${formattedRemaining}. நன்றி, ${resolvedShopName}.`;
    }
    return isZeroPay
      ? `Dear ${name}, Balance due on ${date}: ₹${formattedRemaining}. Kindly pay your daily thavanai. Thank you, ${resolvedShopName}.`
      : `Dear ${name}, Thavanai collection on ${date}: ₹${formattedAmount}. Remaining balance: ₹${formattedRemaining}. Thank you, ${resolvedShopName}.`;
  }

  // 2. Full Thermal POS Slip Format
  if (lang === 'ta') {
    return `*${resolvedShopName} — தினசரி தவணை வரவு ரசீது*
--------------------------------
வ.எண்: ${sl_no || 1}
வாடிக்கையாளர்: ${name}
தொலைபேசி: ${phone || '-'}
முகவரி: ${address || '-'}
${start_date ? `துவக்க தேதி: ${start_date}\n` : ''}தேதி: ${date}
அடுத்த தவணை: ${resolvedNextDate}

தவணை அசல்: ₹${formattedPrincipal}
இதுவரை வரவு: ₹${formattedTotalCollected}
இன்று வரவு: ₹${formattedAmount}
*மீதமுள்ள தவணை நிலுவை: ₹${formattedRemaining}*
--------------------------------
${Number(remaining) === 0 ? '🎉 தங்களின் தவணை கணக்கு முழுமையாக நிறைவுற்றது! நன்றி!' : 'தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!'}
தொடர்புக்கு: ${DEFAULT_SHOP_PHONE}`;
  }

  return `*${resolvedShopName} — Daily Thavanai Receipt*
--------------------------------
S.No: ${sl_no || 1}
Client: ${name}
Phone: ${phone || '-'}
Address: ${address || '-'}
${start_date ? `Start Date: ${start_date}\n` : ''}Date: ${date}
Next Due Date: ${resolvedNextDate}

Thavanai Principal: ₹${formattedPrincipal}
Total Collected: ₹${formattedTotalCollected}
Collected Today: ₹${formattedAmount}
*Remaining Balance: ₹${formattedRemaining}*
--------------------------------
${Number(remaining) === 0 ? '🎉 Your thavanai account is fully settled! Thank you!' : 'Thank you for your timely payment!'}
Contact: ${DEFAULT_SHOP_PHONE}`;
}

/**
 * Format new thavanai disbursement slip
 */
export function formatDisbursementSlip({
  name,
  phone = '',
  sl_no = '',
  address = '',
  date = new Date().toLocaleDateString('en-GB'),
  start_date = '',
  next_date = '',
  principal = 10000,
  shopName,
  lang = 'ta'
}) {
  const resolvedShopName = shopName || (lang === 'ta' ? DEFAULT_SHOP_NAME_TA : DEFAULT_SHOP_NAME_EN);
  const formattedPrincipal = Number(principal || 10000).toLocaleString('en-IN');
  const resolvedStartDate = start_date || date;
  const resolvedNextDate = next_date || getNextDayDate(date);

  if (lang === 'ta') {
    return `*${resolvedShopName} — புதிய தவணை அசல் வழங்கல் ரசீது*
--------------------------------
வ.எண்: ${sl_no || 1}
வாடிக்கையாளர்: ${name}
தொலைபேசி: ${phone || '-'}
முகவரி: ${address || '-'}
துவக்க தேதி: ${resolvedStartDate}
${resolvedStartDate !== date ? `வழங்கப்பட்ட தேதி: ${date}\n` : ''}அடுத்த தவணை: ${resolvedNextDate}

வழங்கப்பட்ட தவணை அசல்: ₹${formattedPrincipal}
--------------------------------
தவணை கணக்கு வெற்றிகரமாக துவங்கப்பட்டது.
தங்களின் தொடர் ஒத்துழைப்புக்கு நன்றி!
தொடர்புக்கு: ${DEFAULT_SHOP_PHONE}`;
  }

  return `*${resolvedShopName} — New Thavanai Disbursement Slip*
--------------------------------
S.No: ${sl_no || 1}
Client: ${name}
Phone: ${phone || '-'}
Address: ${address || '-'}
Start Date: ${resolvedStartDate}
${resolvedStartDate !== date ? `Disbursed Date: ${date}\n` : ''}Next Due Date: ${resolvedNextDate}

Thavanai Principal: ₹${formattedPrincipal}
--------------------------------
Thavanai account activated successfully.
Thank you for choosing us!
Contact: ${DEFAULT_SHOP_PHONE}`;
}
