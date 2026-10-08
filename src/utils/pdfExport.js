import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format currency numbers in Indian Rupee format without symbol (for PDF clean alignment)
 */
export function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-IN');
}

/**
 * Format currency with Rupee prefix
 */
export function formatRupee(num) {
  const n = Number(num) || 0;
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

// Comprehensive Tamil dictionary for instant clean Latin phonetic output in jsPDF
const TAMIL_DICTIONARY = {
  // Names
  'முருகன்': 'Murugan',
  'செல்வி': 'Selvi',
  'லக்ஷ்மி': 'Lakshmi',
  'லட்சுமி': 'Lakshmi',
  'விஜய்': 'Vijay',
  'ரேவதி': 'Revathi',
  'முத்து': 'Muthu',
  'கார்த்திக்': 'Karthik',
  'ராஜா': 'Raja',
  'குமார்': 'Kumar',
  'பாண்டி': 'Pandi',
  'கண்ணன்': 'Kannan',
  'மாரிமுத்து': 'Marimuthu',
  'வெள்ளையம்மா': 'Vellaiyamma',
  'கரிகாலன்': 'Karikalan',
  'சின்னையா': 'Chinnaiya',
  'மீனா': 'Meena',
  'பிரியா': 'Priya',
  'சுரேஷ்': 'Suresh',
  'ரமேஷ்': 'Ramesh',
  'சரவணன்': 'Saravanan',
  'செந்தில்': 'Senthil',
  'அன்பு': 'Anbu',
  'மணி': 'Mani',
  'கணேசன்': 'Ganesan',
  'சுந்தர்': 'Sundar',
  'சங்கர்': 'Sankar',
  'மகேஷ்': 'Mahesh',
  'கவிதா': 'Kavitha',
  'சாந்தி': 'Santhi',
  'தேவி': 'Devi',
  'ராதா': 'Radha',
  'மல்லிகா': 'Mallika',
  'பழனி': 'Palani',
  'சிவக்குமார்': 'Sivakumar',
  
  // Locations / Towns / Villages
  'அலங்காநல்லூர்': 'Alanganallur',
  'வாடிப்பட்டி': 'Vadipatti',
  'மேலூர்': 'Melur',
  'வில்லாபுரம்': 'Villapuram',
  'திருப்பரங்குன்றம்': 'Thiruparankundram',
  'மதுரை': 'Madurai',
  'உசிலம்பட்டி': 'Usilampatti',
  'சோழவந்தான்': 'Sholavandan',
  'சமயநல்லூர்': 'Samayanallur',
  'செல்லூர்': 'Sellur',
  'திருமங்கலம்': 'Thirumangalam',
  'திண்டுக்கல்': 'Dindigul',
  'தேனி': 'Theni',
  'சிவகங்கை': 'Sivagangai',
  'விருதுநகர்': 'Virudhunagar',
  'அண்ணாநகர்': 'Anna Nagar',
  'கே.கே.நகர்': 'KK Nagar',
  'பெரியார்': 'Periyar',
  'கோரிப்பாளையம்': 'Goripalayam',
  'சிம்மக்கல்': 'Simmakkal',
  'ஆண்டிபட்டி': 'Andipatti',

  // Months
  'அக்டோபர்': 'October',
  'நவம்பர்': 'November',
  'டிசம்பர்': 'December',
  'ஜனவரி': 'January',
  'பிப்ரவரி': 'February',
  'மார்ச்': 'March',
  'ஏப்ரல்': 'April',
  'மே': 'May',
  'ஜூன்': 'June',
  'ஜூலை': 'July',
  'ஆகஸ்ட்': 'August',
  'செப்டம்பர்': 'September'
};

// Transliterate Tamil unicode characters to clean Latin syllables
export function transliterateTamil(text) {
  if (!text) return '';

  const trimmed = text.trim();
  if (TAMIL_DICTIONARY[trimmed]) {
    return TAMIL_DICTIONARY[trimmed];
  }

  // Check word by word
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    const translatedWords = words.map(w => TAMIL_DICTIONARY[w] || null);
    if (translatedWords.every(Boolean)) {
      return translatedWords.join(' ');
    }
  }

  const vowels = {
    '\u0B85': 'A', '\u0B86': 'Aa', '\u0B87': 'I', '\u0B88': 'Ee',
    '\u0B89': 'U', '\u0B8A': 'Oo', '\u0B8E': 'E', '\u0B8F': 'Ae',
    '\u0B90': 'Ai', '\u0B92': 'O', '\u0B93': 'Oo', '\u0B94': 'Au'
  };

  const consonants = {
    '\u0B95': 'k', '\u0B99': 'ng', '\u0B9A': 's', '\u0B9E': 'ny',
    '\u0B9F': 't', '\u0BA3': 'n', '\u0BA4': 'th', '\u0BA8': 'n',
    '\u0BAA': 'p', '\u0BAE': 'm', '\u0BAF': 'y', '\u0BB0': 'r',
    '\u0BB2': 'l', '\u0BB5': 'v', '\u0BB4': 'zh', '\u0BB3': 'l',
    '\u0BB1': 'r', '\u0BA9': 'n', '\u0B9C': 'j', '\u0BA7': 'sh',
    '\u0BB8': 's', '\u0BB9': 'h'
  };

  const diacritics = {
    '\u0BBE': 'aa', '\u0BBF': 'i', '\u0BC0': 'ee', '\u0BC1': 'u',
    '\u0BC2': 'oo', '\u0BC6': 'e', '\u0BC7': 'ae', '\u0BC8': 'ai',
    '\u0BCA': 'o', '\u0BCB': 'o', '\u0BCC': 'au'
  };

  const virama = '\u0BCD';

  let out = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    const next = i + 1 < len ? text[i + 1] : null;

    if (vowels[ch]) {
      out += vowels[ch];
      continue;
    }

    if (consonants[ch]) {
      const base = consonants[ch];
      if (next === virama) {
        out += base;
        i++;
      } else if (next && diacritics[next]) {
        out += base + diacritics[next];
        i++;
      } else {
        out += base + 'a';
      }
      continue;
    }

    if (/[\x20-\x7E]/.test(ch)) {
      out += ch;
    }
  }

  return out.replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
}

/**
 * Clean & sanitize text for jsPDF standard Helvetica font.
 * Intelligently extracts Latin names from bilingual strings and converts Tamil cleanly.
 */
export function cleanPdfText(text) {
  if (!text) return '-';
  let str = String(text).trim();

  // Normalize Unicode dashes and Rupee symbol
  str = str.replace(/[\u2013\u2014]/g, '-').replace(/\u20B9\s*/g, 'Rs. ');

  // If format "Tamil (English)", extract English
  const parenMatch = str.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    const outside = str.replace(/\([^)]+\)/, '').trim();
    if (/[a-zA-Z]/.test(inside) && !/[\u0B80-\u0BFF]/.test(inside)) {
      return inside;
    }
    if (/[a-zA-Z]/.test(outside) && !/[\u0B80-\u0BFF]/.test(outside)) {
      return outside;
    }
  }

  // If string contains slash or dash format like "தமிழ் / English"
  if (str.includes('/') || str.includes('-')) {
    const parts = str.split(/[/|-]/);
    for (const p of parts) {
      const cleanP = p.trim();
      if (/[a-zA-Z]/.test(cleanP) && !/[\u0B80-\u0BFF]/.test(cleanP)) {
        return cleanP;
      }
    }
  }

  // If mixed Tamil and English, strip Tamil
  if (/[a-zA-Z]/.test(str)) {
    let cleaned = str.replace(/[\u0B80-\u0BFF]/g, '').trim();
    cleaned = cleaned.replace(/\(\s*\)/g, '').replace(/,\s*,/g, ',').replace(/^[, -/]+|[, -/]+$/g, '').trim();
    if (cleaned.length > 1) return cleaned;
  }

  // If pure Tamil, transliterate phonetically to English
  if (/[\u0B80-\u0BFF]/.test(str)) {
    const transliterated = transliterateTamil(str);
    if (transliterated) return transliterated;
  }

  // Final fallback: strip non-ASCII
  const asciiOnly = str.replace(/[^\x20-\x7E]/g, '').trim();
  return asciiOnly || '-';
}

/**
 * Format Month-Year label nicely
 */
function getFormattedMonthLabel(monthYear) {
  if (!monthYear) return 'CURRENT MONTH';
  const [year, month] = monthYear.split('-');
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return mIndex >= 0 && mIndex < 12 ? `${monthNames[mIndex]} ${year}` : monthYear;
}

/**
 * Draw Microfinance Executive Header & KPI Cards
 */
function drawExecutiveHeader(doc, {
  companyName = 'ALR Finance',
  title = 'DAILY COLLECTION REGISTER (ALR)',
  subtitle = '',
  dateStr = '',
  totalRecords = 0,
  pageWidth,
  filterSummary = '',
  kpis = []
}) {
  // 1. Top Brand Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Accent Line
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 22, pageWidth, 1.2, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 10);

  // Subtitle / Register Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(title + (subtitle ? ` • ${subtitle}` : ''), 14, 17);

  // Right Side Info
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${dateStr}`, pageWidth - 14, 10, { align: 'right' });
  doc.text(`Total Records: ${totalRecords} Borrowers`, pageWidth - 14, 17, { align: 'right' });

  // 2. Filter Scope Badge Ribbon
  let currentY = 26;
  if (filterSummary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(filterSummary, 18, currentY + 5.2);
    currentY += 11;
  } else {
    currentY += 2;
  }

  // 3. KPI Summary Cards (Auto-distributed across page)
  if (kpis.length > 0) {
    const cardGap = 4;
    const totalGap = (kpis.length - 1) * cardGap;
    const cardWidth = (pageWidth - 28 - totalGap) / kpis.length;
    const cardHeight = 13.5;

    kpis.forEach((kpi, idx) => {
      const cx = 14 + idx * (cardWidth + cardGap);
      doc.setFillColor(...kpi.bg);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cx, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, cx + 3.5, currentY + 4.2);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.setTextColor(...kpi.color);
      doc.text(kpi.value, cx + 3.5, currentY + 10.5);
    });

    currentY += cardHeight + 4;
  }

  return currentY;
}

/**
 * Draw Microfinance Verification Sign-Off Footer Box
 */
function drawAuditSignOff(doc, { pageWidth, pageHeight, grandPrincipal = 0, grandCollected = 0, grandRemaining = 0 }) {
  const boxY = pageHeight - 25;
  const boxWidth = pageWidth - 28;
  const boxHeight = 18;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  const colW = boxWidth / 4;

  // Col 1: Audit Check
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('AUDIT RECONCILIATION', 18, boxY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Disbursed: Rs. ${formatNumber(grandPrincipal)}`, 18, boxY + 9);
  doc.text(`Recovered: Rs. ${formatNumber(grandCollected)} | Due: Rs. ${formatNumber(grandRemaining)}`, 18, boxY + 13.5);

  // Col 2: Field Agent Sign
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('COLLECTION AGENT SIGNATURE', 14 + colW + 4, boxY + 4.5);
  doc.setDrawColor(148, 163, 184);
  doc.line(14 + colW + 4, boxY + 13.5, 14 + colW * 2 - 8, boxY + 13.5);

  // Col 3: Field Supervisor Sign
  doc.text('FIELD SUPERVISOR VERIFICATION', 14 + colW * 2 + 4, boxY + 4.5);
  doc.line(14 + colW * 2 + 4, boxY + 13.5, 14 + colW * 3 - 8, boxY + 13.5);

  // Col 4: Manager Approval
  doc.text('BRANCH MANAGER SEAL & SIGN', 14 + colW * 3 + 4, boxY + 4.5);
  doc.line(14 + colW * 3 + 4, boxY + 13.5, 14 + boxWidth - 6, boxY + 13.5);
}

/**
 * 1. PRIMARY REGISTER PDF EXPORT (Production-Grade Vector PDF)
 *
 * Supports 4 modes:
 *  - 'summary': High-contrast, clean 10-column executive borrower register (no squished days)
 *  - 'split_1_15': Split-cycle view: Days 1 to 15 with comfortable 9.5mm columns
 *  - 'split_16_31': Split-cycle view: Days 16 to 31 with comfortable 9mm columns
 *  - 'all_days': Full month auto-scaled days with alternating shading and clean typography
 */
export function downloadRegisterPdf({
  rows = [],
  summary = {},
  filters = {},
  monthYear = '',
  scope = 'month',
  viewMode = 'summary', // 'summary' | 'split_1_15' | 'split_16_31' | 'all_days'
  companyName = 'ALR Finance',
  showDays = false,
  totalDays = 31
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const exportTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const monthLabel = getFormattedMonthLabel(monthYear);

  // Determine effective mode
  let effectiveMode = viewMode;
  if (showDays && viewMode === 'summary') {
    effectiveMode = 'all_days';
  }

  // Filter Summary String
  const statusLabel = `Status: ${(filters.status || 'All').toUpperCase()}`;
  const rangeLabel = (filters.from_sl_no || filters.to_sl_no)
    ? `Range: ${filters.from_sl_no || '1'} to ${filters.to_sl_no || 'End'}`
    : 'Range: All';
  const areaLabel = `Area: ${cleanPdfText(filters.village) || 'All Locations'}`;
  const principalLabel = (filters.minPrincipal > 0 || (filters.maxPrincipal && filters.maxPrincipal < Infinity))
    ? `Principal: Rs. ${filters.minPrincipal || 0} - ${filters.maxPrincipal || 'Max'}`
    : 'Principal: All';

  const filterSummary = `Applied Filters:  [ ${statusLabel} ]    [ ${rangeLabel} ]    [ ${areaLabel} ]    [ ${principalLabel} ]`;

  // Financial KPIs
  const grandPrincipal = summary.total_principal || rows.reduce((s, r) => s + (r.principal || 0), 0);
  const grandCollected = summary.total_collected || rows.reduce((s, r) => s + (r.total_collected || 0), 0);
  const grandRemaining = summary.total_remaining || rows.reduce((s, r) => s + (r.remaining || 0), 0);
  const clearedCount = summary.cleared_count || rows.filter(r => r.status === 'cleared').length;
  const pendingCount = summary.pending_count || rows.filter(r => r.status !== 'cleared').length;

  const kpis = [
    { label: 'TOTAL CLIENTS', value: `${rows.length}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'TOTAL PRINCIPAL', value: `Rs. ${formatNumber(grandPrincipal)}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'TOTAL COLLECTED', value: `Rs. ${formatNumber(grandCollected)}`, color: [22, 101, 52], bg: [220, 252, 231] },
    { label: 'TOTAL REMAINING', value: `Rs. ${formatNumber(grandRemaining)}`, color: [153, 27, 27], bg: [254, 226, 226] },
    { label: 'CLEARED / PENDING', value: `${clearedCount} / ${pendingCount}`, color: [67, 56, 202], bg: [238, 242, 255] }
  ];

  let registerTitle = 'DAILY COLLECTION REGISTER (ALR)';
  if (effectiveMode === 'split_1_15') registerTitle += ' • PART 1 (DAYS 1 TO 15)';
  else if (effectiveMode === 'split_16_31') registerTitle += ` • PART 2 (DAYS 16 TO ${totalDays})`;

  // Draw Header and get table start Y
  const startY = drawExecutiveHeader(doc, {
    companyName,
    title: registerTitle,
    subtitle: `MONTH: ${monthLabel}`,
    dateStr: `${exportDate} ${exportTime}`,
    totalRecords: rows.length,
    pageWidth,
    filterSummary,
    kpis
  });

  // Build Head and Column Styles depending on Effective Mode
  let headCols = [];
  let colStyles = {};
  let bodyRows = [];

  if (effectiveMode === 'summary') {
    // ------------------------------------------------------------------------
    // MODE 1: EXECUTIVE SUMMARY REGISTER (10 Columns, Generous Spacing, Clean)
    // ------------------------------------------------------------------------
    headCols = [[
      { content: 'Sl', styles: { halign: 'center' } },
      { content: 'Borrower Name', styles: { halign: 'left' } },
      { content: 'Phone', styles: { halign: 'center' } },
      { content: 'Route / Village Area', styles: { halign: 'left' } },
      { content: 'Principal', styles: { halign: 'right' } },
      { content: 'Collected', styles: { halign: 'right' } },
      { content: 'Remaining', styles: { halign: 'right' } },
      { content: 'Excess', styles: { halign: 'right' } },
      { content: 'Recovery %', styles: { halign: 'center' } },
      { content: 'Status', styles: { halign: 'center' } }
    ]];

    colStyles = {
      0: { halign: 'center', cellWidth: 14 },
      1: { halign: 'left', cellWidth: 48, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 46 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25, fontStyle: 'bold', textColor: [22, 101, 52] },
      6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 22 }
    };

    bodyRows = rows.map((r, idx) => {
      const isCleared = r.status === 'cleared' || (r.remaining === 0 && r.principal > 0);
      const st = isCleared ? 'CLEARED' : (r.status === 'partial' ? 'PARTIAL' : 'PENDING');
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : String(r.sl_no || idx + 1);
      return [
        slDisplay,
        cleanPdfText(r.name),
        r.phone || '-',
        cleanPdfText(r.address),
        formatNumber(r.principal),
        formatNumber(r.total_collected),
        formatNumber(r.remaining),
        r.excess > 0 ? formatNumber(r.excess) : '-',
        `${r.collection_rate || 0}%`,
        st
      ];
    });

    // Grand Totals Row
    const overallRate = grandPrincipal > 0 ? Math.round((grandCollected / grandPrincipal) * 100) : 0;
    bodyRows.push([
      '#',
      `TOTALS (${rows.length} BORROWERS)`,
      '-',
      'ALL AREAS',
      formatNumber(grandPrincipal),
      formatNumber(grandCollected),
      formatNumber(grandRemaining),
      formatNumber(rows.reduce((s, r) => s + (r.excess || 0), 0)),
      `${overallRate}%`,
      grandRemaining === 0 ? 'ALL CLEARED' : 'PENDING'
    ]);

  } else if (effectiveMode === 'split_1_15') {
    // ------------------------------------------------------------------------
    // MODE 2: SPLIT DAYS 1 TO 15 (Comfortable 9.5mm columns, Zero Squishing)
    // ------------------------------------------------------------------------
    const headerRow = [
      { content: 'Sl', styles: { halign: 'center', fontSize: 7 } },
      { content: 'Borrower Name', styles: { halign: 'left', fontSize: 7.5 } },
      { content: 'Principal', styles: { halign: 'right', fontSize: 7 } }
    ];
    for (let d = 1; d <= 15; d++) {
      headerRow.push({ content: `D${d}`, styles: { halign: 'center', fontSize: 7 } });
    }
    headerRow.push(
      { content: 'Paid 1-15', styles: { halign: 'right', fontSize: 7 } },
      { content: 'Balance Due', styles: { halign: 'right', fontSize: 7 } },
      { content: 'Status', styles: { halign: 'center', fontSize: 7 } }
    );
    headCols = [headerRow];

    colStyles = {
      0: { halign: 'center', cellWidth: 10, fontSize: 7 },
      1: { halign: 'left', cellWidth: 40, fontStyle: 'bold', fontSize: 7.5 },
      2: { halign: 'right', cellWidth: 18, fontSize: 7 }
    };
    for (let d = 1; d <= 15; d++) {
      colStyles[2 + d] = { halign: 'center', cellWidth: 9.5, fontSize: 7 };
    }
    colStyles[18] = { halign: 'right', cellWidth: 20, fontStyle: 'bold', textColor: [22, 101, 52], fontSize: 7 };
    colStyles[19] = { halign: 'right', cellWidth: 20, fontStyle: 'bold', fontSize: 7 };
    colStyles[20] = { halign: 'center', cellWidth: 18, fontSize: 7 };

    bodyRows = rows.map((r, idx) => {
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : String(r.sl_no || idx + 1);
      let sum15 = 0;
      const row = [slDisplay, cleanPdfText(r.name), formatNumber(r.principal)];
      for (let d = 1; d <= 15; d++) {
        const val = (r.days && r.days[d]) || 0;
        sum15 += val;
        row.push(val > 0 ? String(val) : '-');
      }
      const remAfter15 = Math.max(0, r.principal - sum15);
      row.push(formatNumber(sum15));
      row.push(formatNumber(remAfter15));
      row.push(remAfter15 === 0 ? 'CLEARED' : 'PENDING');
      return row;
    });

    // Totals Row
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    const totalsRow = ['#', `TOTALS (${rows.length})`, formatNumber(totalPrincipal)];
    let grandSum15 = 0;
    for (let d = 1; d <= 15; d++) {
      const daySum = rows.reduce((s, r) => s + ((r.days && r.days[d]) || 0), 0);
      grandSum15 += daySum;
      totalsRow.push(daySum > 0 ? String(daySum) : '-');
    }
    totalsRow.push(formatNumber(grandSum15));
    totalsRow.push(formatNumber(Math.max(0, totalPrincipal - grandSum15)));
    totalsRow.push('PART 1');
    bodyRows.push(totalsRow);

  } else if (effectiveMode === 'split_16_31') {
    // ------------------------------------------------------------------------
    // MODE 3: SPLIT DAYS 16 TO 31 (Comfortable 9mm columns)
    // ------------------------------------------------------------------------
    const endDay = totalDays || 31;
    const countDays = endDay - 15;
    const headerRow = [
      { content: 'Sl', styles: { halign: 'center', fontSize: 7 } },
      { content: 'Borrower Name', styles: { halign: 'left', fontSize: 7.5 } },
      { content: 'Op. Bal', styles: { halign: 'right', fontSize: 7 } }
    ];
    for (let d = 16; d <= endDay; d++) {
      headerRow.push({ content: `D${d}`, styles: { halign: 'center', fontSize: 7 } });
    }
    headerRow.push(
      { content: 'Total Paid', styles: { halign: 'right', fontSize: 7 } },
      { content: 'Remaining', styles: { halign: 'right', fontSize: 7 } },
      { content: 'Status', styles: { halign: 'center', fontSize: 7 } }
    );
    headCols = [headerRow];

    const dayColWidth = Math.min(9.5, (pageWidth - 28 - 10 - 40 - 18 - 20 - 20 - 18) / countDays);
    colStyles = {
      0: { halign: 'center', cellWidth: 10, fontSize: 7 },
      1: { halign: 'left', cellWidth: 40, fontStyle: 'bold', fontSize: 7.5 },
      2: { halign: 'right', cellWidth: 18, fontSize: 7 }
    };
    for (let d = 16; d <= endDay; d++) {
      colStyles[2 + (d - 15)] = { halign: 'center', cellWidth: dayColWidth, fontSize: 7 };
    }
    colStyles[3 + countDays] = { halign: 'right', cellWidth: 20, fontStyle: 'bold', textColor: [22, 101, 52], fontSize: 7 };
    colStyles[4 + countDays] = { halign: 'right', cellWidth: 20, fontStyle: 'bold', fontSize: 7 };
    colStyles[5 + countDays] = { halign: 'center', cellWidth: 18, fontSize: 7 };

    bodyRows = rows.map((r, idx) => {
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : String(r.sl_no || idx + 1);
      let sum1_15 = 0;
      for (let d = 1; d <= 15; d++) sum1_15 += (r.days && r.days[d]) || 0;
      const opBal = Math.max(0, r.principal - sum1_15);

      const row = [slDisplay, cleanPdfText(r.name), formatNumber(opBal)];
      for (let d = 16; d <= endDay; d++) {
        const val = (r.days && r.days[d]) || 0;
        row.push(val > 0 ? String(val) : '-');
      }
      row.push(formatNumber(r.total_collected));
      row.push(formatNumber(r.remaining));
      row.push(r.remaining === 0 ? 'CLEARED' : 'PENDING');
      return row;
    });

    // Totals Row
    const totalsRow = ['#', `TOTALS (${rows.length})`, formatNumber(rows.reduce((s, r) => {
      let sum1_15 = 0;
      for (let d = 1; d <= 15; d++) sum1_15 += (r.days && r.days[d]) || 0;
      return s + Math.max(0, r.principal - sum1_15);
    }, 0))];

    for (let d = 16; d <= endDay; d++) {
      const daySum = rows.reduce((s, r) => s + ((r.days && r.days[d]) || 0), 0);
      totalsRow.push(daySum > 0 ? String(daySum) : '-');
    }
    totalsRow.push(formatNumber(grandCollected));
    totalsRow.push(formatNumber(grandRemaining));
    totalsRow.push('FINAL');
    bodyRows.push(totalsRow);

  } else {
    // ------------------------------------------------------------------------
    // MODE 4: CONDENSED ALL DAYS (1 TO 31) WITH OPTIMIZED CELL PADDING
    // ------------------------------------------------------------------------
    const headerRow = [
      { content: 'Sl', styles: { halign: 'center', fontSize: 6.5 } },
      { content: 'Borrower Name', styles: { halign: 'left', fontSize: 6.8 } },
      { content: 'Principal', styles: { halign: 'right', fontSize: 6.5 } }
    ];
    for (let d = 1; d <= totalDays; d++) {
      headerRow.push({ content: String(d), styles: { halign: 'center', fontSize: 5.8 } });
    }
    headerRow.push(
      { content: 'Total', styles: { halign: 'right', fontSize: 6.5 } },
      { content: 'Balance', styles: { halign: 'right', fontSize: 6.5 } },
      { content: 'Status', styles: { halign: 'center', fontSize: 6.5 } }
    );
    headCols = [headerRow];

    const fixedW = 8 + 32 + 14 + 14 + 14 + 14; // 96mm
    const usableW = pageWidth - 28;
    const dayW = Math.max(3.8, (usableW - fixedW) / totalDays);

    colStyles = {
      0: { halign: 'center', cellWidth: 8, fontSize: 6 },
      1: { halign: 'left', cellWidth: 32, fontStyle: 'bold', fontSize: 6.5 },
      2: { halign: 'right', cellWidth: 14, fontSize: 6 }
    };
    for (let d = 1; d <= totalDays; d++) {
      colStyles[2 + d] = {
        halign: 'center',
        cellWidth: dayW,
        cellPadding: { top: 0.8, right: 0.2, bottom: 0.8, left: 0.2 },
        fontSize: 5.5
      };
    }
    colStyles[3 + totalDays] = { halign: 'right', cellWidth: 14, fontStyle: 'bold', textColor: [22, 101, 52], fontSize: 6 };
    colStyles[4 + totalDays] = { halign: 'right', cellWidth: 14, fontStyle: 'bold', fontSize: 6 };
    colStyles[5 + totalDays] = { halign: 'center', cellWidth: 14, fontSize: 6 };

    bodyRows = rows.map((r, idx) => {
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : String(r.sl_no || idx + 1);
      const row = [slDisplay, cleanPdfText(r.name), formatNumber(r.principal)];
      for (let d = 1; d <= totalDays; d++) {
        const val = (r.days && r.days[d]) || 0;
        row.push(val > 0 ? String(val) : '');
      }
      row.push(formatNumber(r.total_collected));
      row.push(formatNumber(r.remaining));
      row.push(r.remaining === 0 ? 'CLEARED' : 'PENDING');
      return row;
    });

    const totalsRow = ['#', `TOTALS (${rows.length})`, formatNumber(grandPrincipal)];
    for (let d = 1; d <= totalDays; d++) {
      const daySum = rows.reduce((s, r) => s + ((r.days && r.days[d]) || 0), 0);
      totalsRow.push(daySum > 0 ? String(daySum) : '');
    }
    totalsRow.push(formatNumber(grandCollected));
    totalsRow.push(formatNumber(grandRemaining));
    totalsRow.push('ALL');
    bodyRows.push(totalsRow);
  }

  // Generate Table using autoTable
  const totalRowCount = bodyRows.length;
  const isAllDays = effectiveMode === 'all_days';

  autoTable(doc, {
    startY: startY,
    margin: { left: 14, right: 14, bottom: 28 }, // Room for audit footer
    head: headCols,
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isAllDays ? 6.5 : 7.8,
      cellPadding: isAllDays ? 1.4 : 2
    },
    styles: {
      fontSize: isAllDays ? 6.2 : 7.5,
      cellPadding: isAllDays ? 1.2 : 1.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      overflow: isAllDays ? 'ellipsize' : 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: colStyles,
    didParseCell: function (data) {
      if (data.section === 'body') {
        const isTotalsRow = data.row.index === totalRowCount - 1;
        if (isTotalsRow) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
          data.cell.styles.lineWidth = 0.35;
          data.cell.styles.lineColor = [100, 116, 139];
          return;
        }

        // Highlight Remaining column
        const rawContent = String(data.cell.raw || '');
        if (effectiveMode === 'summary') {
          if (data.column.index === 6) { // Remaining
            const val = parseFloat(rawContent.replace(/,/g, '')) || 0;
            if (val > 0) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index === 9) { // Status
            if (rawContent.includes('CLEAR')) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = 'bold';
            } else if (rawContent.includes('PARTIAL')) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [146, 64, 14];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    },
    didDrawPage: function (data) {
      // Bottom left notice
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential • Daily Collection Microfinance Ledger • ALR Finance System', 14, pageHeight - 5);
    }
  });

  // Draw Audit Sign-off Block on the last page
  const totalPages = doc.internal.getNumberOfPages();
  doc.setPage(totalPages);
  drawAuditSignOff(doc, {
    pageWidth,
    pageHeight,
    grandPrincipal,
    grandCollected,
    grandRemaining
  });

  // Number all pages cleanly
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
  }

  // Construct filename
  const modeTag = effectiveMode !== 'summary' ? `_${effectiveMode}` : '';
  const statusTag = filters.status && filters.status !== 'all' ? `_${filters.status}` : '';
  const filename = `ALR_Register_${monthYear || 'active'}${modeTag}${statusTag}.pdf`;

  doc.save(filename);
}

/**
 * 2. FIELD AGENT DAILY COLLECTION SHEET PDF EXPORT
 * 
 * Specially formatted A4 run sheet for collection agents on the field for a single day.
 * Includes handwriting checkboxes, daily target, and borrower signature lines.
 */
export function downloadFieldCollectionSheetPdf({
  rows = [],
  dayNumber = new Date().getDate(),
  collectionDate = new Date().toISOString().split('T')[0],
  companyName = 'ALR Finance',
  villageFilter = ''
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateFormatted = new Date(collectionDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 22, pageWidth, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`FIELD AGENT DAILY COLLECTION RUN SHEET • DAY ${dayNumber} (${dateFormatted})`, 14, 17);

  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Target Route: ${cleanPdfText(villageFilter) || 'All Routes'}`, pageWidth - 14, 10, { align: 'right' });
  doc.text(`Total Borrowers: ${rows.length}`, pageWidth - 14, 17, { align: 'right' });

  // Columns for Field Collection
  const headCols = [[
    { content: 'Sl', styles: { halign: 'center' } },
    { content: 'Borrower Name', styles: { halign: 'left' } },
    { content: 'Phone', styles: { halign: 'center' } },
    { content: 'Village / Address', styles: { halign: 'left' } },
    { content: 'Loan Principal', styles: { halign: 'right' } },
    { content: 'Balance Due', styles: { halign: 'right' } },
    { content: 'Daily Dues', styles: { halign: 'right' } },
    { content: 'Today Paid (Rs)', styles: { halign: 'center' } },
    { content: 'Mode (Cash/UPI)', styles: { halign: 'center' } },
    { content: 'Borrower Sign', styles: { halign: 'center' } }
  ]];

  const colStyles = {
    0: { halign: 'center', cellWidth: 12 },
    1: { halign: 'left', cellWidth: 46, fontStyle: 'bold' },
    2: { halign: 'center', cellWidth: 26 },
    3: { halign: 'left', cellWidth: 44 },
    4: { halign: 'right', cellWidth: 22 },
    5: { halign: 'right', cellWidth: 24, fontStyle: 'bold', textColor: [153, 27, 27] },
    6: { halign: 'right', cellWidth: 20 },
    7: { halign: 'center', cellWidth: 28 }, // Blank box for agent handwriting
    8: { halign: 'center', cellWidth: 22 },
    9: { halign: 'center', cellWidth: 25 }
  };

  const bodyRows = rows.map((r, idx) => {
    const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : String(r.sl_no || idx + 1);
    const expectedDaily = r.principal > 0 ? Math.round(r.principal / (r.total_days || 31)) : 0;
    const todayPaid = (r.days && r.days[dayNumber]) > 0 ? formatNumber(r.days[dayNumber]) : '[   ]';
    return [
      slDisplay,
      cleanPdfText(r.name),
      r.phone || '-',
      cleanPdfText(r.address),
      formatNumber(r.principal),
      formatNumber(r.remaining),
      formatNumber(expectedDaily),
      todayPaid,
      '[ Cash / UPI ]',
      '_______________'
    ];
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: 14, right: 14, bottom: 25 },
    head: headCols,
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.2
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: colStyles
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Field Run Sheet • Day ${dayNumber} • Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    doc.text('Verified by Agent: ____________________   Supervisor: ____________________', 14, pageHeight - 6);
  }

  doc.save(`ALR_Field_Sheet_Day${dayNumber}_${collectionDate}.pdf`);
}

/**
 * 3. ALL-HISTORY & MULTI-MONTH MASTER PORTFOLIO AUDIT PDF
 * 
 * Master lifetime PDF statement across all months or date range.
 */
export function downloadAllHistoryPdf({
  borrowers = [],
  companyName = 'ALR Finance',
  dateRangeLabel = 'ALL HISTORY (LIFETIME)',
  summary = {}
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const grandPrincipal = summary.total_principal || borrowers.reduce((s, b) => s + (b.total_principal || 0), 0);
  const grandCollected = summary.total_collected || borrowers.reduce((s, b) => s + (b.total_collected || 0), 0);
  const grandRemaining = Math.max(0, grandPrincipal - grandCollected);
  const overallRate = grandPrincipal > 0 ? Math.round((grandCollected / grandPrincipal) * 100) : 0;

  const kpis = [
    { label: 'TOTAL BORROWERS', value: `${borrowers.length}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'LIFETIME DISBURSED', value: `Rs. ${formatNumber(grandPrincipal)}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'LIFETIME COLLECTED', value: `Rs. ${formatNumber(grandCollected)}`, color: [22, 101, 52], bg: [220, 252, 231] },
    { label: 'TOTAL OUTSTANDING', value: `Rs. ${formatNumber(grandRemaining)}`, color: [153, 27, 27], bg: [254, 226, 226] },
    { label: 'PORTFOLIO RECOVERY', value: `${overallRate}%`, color: [67, 56, 202], bg: [238, 242, 255] }
  ];

  const startY = drawExecutiveHeader(doc, {
    companyName,
    title: 'LIFETIME PORTFOLIO MASTER AUDIT REPORT',
    subtitle: `SCOPE: ${dateRangeLabel}`,
    dateStr: exportDate,
    totalRecords: borrowers.length,
    pageWidth,
    kpis
  });

  const headCols = [[
    { content: 'Sl', styles: { halign: 'center' } },
    { content: 'Borrower Name', styles: { halign: 'left' } },
    { content: 'Phone', styles: { halign: 'center' } },
    { content: 'Village / Address', styles: { halign: 'left' } },
    { content: 'Loan Cycles', styles: { halign: 'center' } },
    { content: 'Total Disbursed', styles: { halign: 'right' } },
    { content: 'Total Recovered', styles: { halign: 'right' } },
    { content: 'Balance Due', styles: { halign: 'right' } },
    { content: 'Recovery %', styles: { halign: 'center' } },
    { content: 'Risk Status', styles: { halign: 'center' } }
  ]];

  const colStyles = {
    0: { halign: 'center', cellWidth: 12 },
    1: { halign: 'left', cellWidth: 48, fontStyle: 'bold' },
    2: { halign: 'center', cellWidth: 26 },
    3: { halign: 'left', cellWidth: 46 },
    4: { halign: 'center', cellWidth: 20 },
    5: { halign: 'right', cellWidth: 26 },
    6: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [22, 101, 52] },
    7: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    8: { halign: 'center', cellWidth: 18 },
    9: { halign: 'center', cellWidth: 21 }
  };

  const bodyRows = borrowers.map((b, idx) => {
    const slDisplay = b.client_code ? `${b.sl_no || idx + 1}\n(${b.client_code})` : String(b.sl_no || idx + 1);
    const rem = Math.max(0, (b.total_principal || 0) - (b.total_collected || 0));
    const rate = b.total_principal > 0 ? Math.round(((b.total_collected || 0) / b.total_principal) * 100) : 0;
    const risk = rem === 0 ? 'CLEARED' : (rate >= 70 ? 'LOW RISK' : 'ATTENTION');

    return [
      slDisplay,
      cleanPdfText(b.name),
      b.phone || '-',
      cleanPdfText(b.address),
      `${b.cycle_count || 1} loans`,
      formatNumber(b.total_principal),
      formatNumber(b.total_collected),
      formatNumber(rem),
      `${rate}%`,
      risk
    ];
  });

  // Totals Row
  bodyRows.push([
    '#',
    `PORTFOLIO TOTALS (${borrowers.length})`,
    '-',
    'ALL LOCATIONS',
    `${borrowers.reduce((s, b) => s + (b.cycle_count || 1), 0)} loans`,
    formatNumber(grandPrincipal),
    formatNumber(grandCollected),
    formatNumber(grandRemaining),
    `${overallRate}%`,
    grandRemaining === 0 ? 'ALL CLEARED' : 'ACTIVE'
  ]);

  autoTable(doc, {
    startY,
    margin: { left: 14, right: 14, bottom: 25 },
    head: headCols,
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.2
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: colStyles
  });

  const totalPages = doc.internal.getNumberOfPages();
  doc.setPage(totalPages);
  drawAuditSignOff(doc, {
    pageWidth,
    pageHeight,
    grandPrincipal,
    grandCollected,
    grandRemaining
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Lifetime Portfolio Statement • Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
  }

  doc.save(`ALR_Lifetime_Portfolio_Audit_${exportDate.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 4. SINGLE MEMBER COMPLETE MULTI-MONTH LEDGER STATEMENT (Passbook)
 */
export function downloadMemberHistoryPdf({
  client = {},
  monthHistory = [],
  closedRecords = [],
  companyName = 'ALR Finance'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Top Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 26, pageWidth, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('BORROWER PAYMENT HISTORY & LEDGER PASSBOOK STATEMENT', 14, 19);

  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Exported: ${exportDate}`, pageWidth - 14, 15, { align: 'right' });

  // Member Information Card
  const infoY = 32;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, infoY, pageWidth - 28, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('MEMBER PROFILE', 18, infoY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Name: ${cleanPdfText(client.name)}`, 18, infoY + 11.5);
  doc.text(`Serial No: #${client.sl_no || '-'}  |  Code: ${client.client_code || '-'}`, 18, infoY + 17);

  doc.text(`Phone: ${client.phone || '-'}`, pageWidth / 2, infoY + 11.5);
  doc.text(`Address: ${cleanPdfText(client.address)}`, pageWidth / 2, infoY + 17);

  // Grand Totals Computation
  const grandPrincipal = monthHistory.reduce((s, m) => s + (m.principal || 0), 0);
  const grandCollected = monthHistory.reduce((s, m) => s + (m.total_collected || 0), 0);
  const grandRemaining = Math.max(0, grandPrincipal - grandCollected);
  const overallRate = grandPrincipal > 0 ? Math.round((grandCollected / grandPrincipal) * 100) : 0;

  // KPI Row
  const kpiY = infoY + 26;
  const kpiWidth = (pageWidth - 28 - 12) / 4;
  const kpis = [
    { label: 'TOTAL PRINCIPAL', val: `Rs. ${formatNumber(grandPrincipal)}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'TOTAL COLLECTED', val: `Rs. ${formatNumber(grandCollected)}`, color: [22, 101, 52], bg: [220, 252, 231] },
    { label: 'TOTAL REMAINING', val: `Rs. ${formatNumber(grandRemaining)}`, color: [153, 27, 27], bg: [254, 226, 226] },
    { label: 'OVERALL RECOVERY', val: `${overallRate}%`, color: [67, 56, 202], bg: [238, 242, 255] }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = 14 + idx * (kpiWidth + 4);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, kpiY, kpiWidth, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 3, kpiY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, cx + 3, kpiY + 10);
  });

  // Table
  const tableStartY = kpiY + 17;
  const tableHead = [[
    { content: 'Cycle / Month', styles: { halign: 'left' } },
    { content: 'Principal', styles: { halign: 'right' } },
    { content: 'Collected', styles: { halign: 'right' } },
    { content: 'Remaining', styles: { halign: 'right' } },
    { content: 'Excess', styles: { halign: 'right' } },
    { content: 'Paid Days', styles: { halign: 'center' } },
    { content: 'Rate %', styles: { halign: 'center' } },
    { content: 'Status', styles: { halign: 'center' } }
  ]];

  const tableBody = monthHistory.map(m => [
    cleanPdfText(m.cycle_name || m.month_year),
    formatNumber(m.principal),
    formatNumber(m.total_collected),
    formatNumber(m.remaining),
    m.excess > 0 ? formatNumber(m.excess) : '-',
    `${m.paid_days || 0} days`,
    `${m.collection_rate || 0}%`,
    m.remaining === 0 ? 'CLEARED' : 'PENDING'
  ]);

  // Grand Totals Row
  tableBody.push([
    'GRAND TOTAL',
    formatNumber(grandPrincipal),
    formatNumber(grandCollected),
    formatNumber(grandRemaining),
    formatNumber(monthHistory.reduce((s, m) => s + (m.excess || 0), 0)),
    `${monthHistory.reduce((s, m) => s + (m.paid_days || 0), 0)} days`,
    `${overallRate}%`,
    grandRemaining === 0 ? 'ALL CLEARED' : 'PENDING'
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14, bottom: 20 },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2
    },
    styles: { fontSize: 7.8, cellPadding: 1.8, lineColor: [203, 213, 225] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'right', cellWidth: 23 },
      2: { halign: 'right', cellWidth: 23, fontStyle: 'bold', textColor: [22, 101, 52] },
      3: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 24 }
    }
  });

  const safeName = (client.name || 'member').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  doc.save(`Member_Ledger_${safeName}_${client.sl_no || ''}.pdf`);
}
