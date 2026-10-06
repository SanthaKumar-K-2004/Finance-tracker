import { parseCurrencyNumber } from './currency.js';

/**
 * Universal Intelligent Excel & CSV Header & Column Mapping Engine
 * Designed for arbitrary spreadsheet styles, column orders, and multilingual Tamil/English ledgers.
 * Combines Pass-1 Semantic Header Recognition with Pass-2 Data Content Profiling.
 */

// Normalized pattern matching helper
export function normalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\n\r\t_]/g, ' ')
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '')
    .trim();
}

/**
 * Pass 2 Data Content Profiler
 * Inspects actual data cell contents across rows to infer data type when headers are missing, abbreviated, or unconventional.
 */
export function profileColumnData(rows, dataStartIndex, colIndex, sampleSize = 20) {
  const stats = {
    totalChecked: 0,
    phoneMatches: 0,
    numericCurrencyMatches: 0,
    dateMatches: 0,
    serialMatches: 0,
    textMatches: 0,
    samples: []
  };

  const endRow = Math.min(rows.length, dataStartIndex + sampleSize);

  for (let r = dataStartIndex; r < endRow; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    const val = row[colIndex];
    if (val === undefined || val === null || val === '') continue;

    stats.totalChecked++;
    const strVal = String(val).trim();
    if (stats.samples.length < 3) {
      stats.samples.push(strVal);
    }

    // Check Phone number: 10 digits, or prefixed with +91/91/0
    const digitsOnly = strVal.replace(/[^0-9]/g, '');
    if ((digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) ||
        (digitsOnly.length === 12 && digitsOnly.startsWith('91') && /^[6-9]/.test(digitsOnly.slice(2))) ||
        (digitsOnly.length === 11 && digitsOnly.startsWith('0') && /^[6-9]/.test(digitsOnly.slice(1)))) {
      stats.phoneMatches++;
    }

    // Check Principal / Currency amount: typically numbers >= 500, commonly rounded to 100s or 500s
    const num = parseCurrencyNumber(strVal, -1);
    if (num >= 500 && num <= 10000000) {
      stats.numericCurrencyMatches++;
    }

    // Check Serial No: integer <= 10000 or prefixed codes CLI-, ACC-, ALR-
    if (/^(cli|acc|alr|mem)[-_]?[0-9]+/i.test(strVal) || (/^\d+$/.test(strVal) && parseInt(strVal, 10) < 5000)) {
      stats.serialMatches++;
    }

    // Check Date format: YYYY-MM-DD or DD/MM/YYYY or DD.MM.YYYY
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(strVal) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(strVal)) {
      stats.dateMatches++;
    }

    // Check human text (not pure numbers)
    if (/[a-zA-Z\u0B80-\u0BFF]{2,}/.test(strVal) && !/^\d+$/.test(strVal)) {
      stats.textMatches++;
    }
  }

  const n = Math.max(1, stats.totalChecked);
  return {
    ...stats,
    phoneRatio: stats.phoneMatches / n,
    currencyRatio: stats.numericCurrencyMatches / n,
    dateRatio: stats.dateMatches / n,
    serialRatio: stats.serialMatches / n,
    textRatio: stats.textMatches / n
  };
}

/**
 * Deep Discovery: Detects the most probable header row and auto-assigns columns.
 */
export function detectHeaderAndColumns(rows) {
  let bestRowIndex = -1;
  let bestScore = 0;
  let bestMapping = null;

  const maxScanRows = Math.min(rows.length, 25);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const mapping = {
      nameCol: -1,
      phoneCol: -1,
      areaCol: -1,
      villageCol: -1,
      addressCol: -1,
      principalCol: -1,
      slNoCol: -1,
      dateCol: -1,
      dayCols: new Map() // dayNumber (1..31) -> colIndex
    };

    let score = 0;
    let stringCount = 0;

    row.forEach((cell, cIdx) => {
      if (cell === null || cell === undefined || cell === '') return;
      const raw = String(cell).trim();
      const norm = normalize(raw);
      if (typeof cell === 'string') stringCount++;

      // Check numeric day columns (1, 2, 3.. 31) or 'Day 1'
      const dayMatch = norm.match(/^(?:day\s*|d)?([1-9]|[12][0-9]|3[01])$/);
      if (dayMatch) {
        const dNum = parseInt(dayMatch[1], 10);
        if (dNum >= 1 && dNum <= 31) {
          mapping.dayCols.set(dNum, cIdx);
          return;
        }
      }

      // Check Sl.No / Code
      if (mapping.slNoCol === -1) {
        if (/^(sl\s*no|s\s*no|slno|sno|serial|serial\s*no|no|code|client\s*code|ref|account\s*ref|வரிசை|வரிசை\s*எண்|எண்)$/i.test(norm)) {
          mapping.slNoCol = cIdx;
          score += 1;
          return;
        }
      }

      // Check Customer / Borrower Name (Must NOT be area or address)
      if (mapping.nameCol === -1) {
        if (
          /^(name|customer\s*name|borrower\s*name|client\s*name|applicant|party|party\s*name|contact\s*person|borrower\s*full\s*name|account\s*holder|member\s*name|பெயர்|வாடிக்கையாளர்|வாடிக்கையாளர்\s*பெயர்|நபர்|மனுதாரர்|உறுப்பினர்|ஆள்|கடன்\s*வாங்கியவர்)$/i.test(norm) ||
          (norm.includes('name') && !norm.includes('area') && !norm.includes('guarantor') && !norm.includes('village') && !norm.includes('shop') && !norm.includes('company')) ||
          norm.includes('பெயர்')
        ) {
          mapping.nameCol = cIdx;
          score += 3;
          return;
        }
      }

      // Check Phone / Mobile
      if (mapping.phoneCol === -1) {
        if (
          /^(phone|phone\s*number|phone\s*no|mobile|mobile\s*number|mobile\s*no|contact|contact\s*no|contact\s*number|cell|cell\s*no|primary\s*contact|primary\s*mobile|தொலைபேசி|அலைபேசி|கைபேசி|போன்)$/i.test(norm) ||
          norm.includes('phone') ||
          norm.includes('mobile') ||
          norm.includes('தொலைபேசி') ||
          norm.includes('அலைபேசி') ||
          norm.includes('கைபேசி')
        ) {
          mapping.phoneCol = cIdx;
          score += 3;
          return;
        }
      }

      // Check Village / Town / City / District
      if (mapping.villageCol === -1) {
        if (
          /^(village|town|city|district|district\s*region|taluk|branch|gramam|oor|ur|கிராமம்|ஊர்|நகரம்|மாவட்டம்|தாலுகா)$/i.test(norm) ||
          norm.includes('village') ||
          norm.includes('town') ||
          norm.includes('district') ||
          norm.includes('கிராமம்') ||
          norm.includes('ஊர்')
        ) {
          mapping.villageCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Area / Location / Ward / Zone / Street
      if (mapping.areaCol === -1) {
        if (
          /^(area|location|zone|ward|ward\s*no|area\s*town|route|sector|street|colony|nagar|பகுதி|வட்டாரம்|ஏரியா|வார்டு|தெரு|நகர்|காலனி)$/i.test(norm) ||
          norm.includes('area') ||
          norm.includes('location') ||
          norm.includes('ward') ||
          norm.includes('route') ||
          norm.includes('பகுதி') ||
          norm.includes('வட்டாரம்') ||
          norm.includes('ஏரியா')
        ) {
          mapping.areaCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Street / Full Address / Landmark
      if (mapping.addressCol === -1) {
        if (
          /^(address|landmark|address\s*landmark|full\s*address|residential\s*address|முகவரி|விலாசம்|இருப்பிடம்)$/i.test(norm) ||
          norm.includes('address') ||
          norm.includes('landmark') ||
          norm.includes('முகவரி') ||
          norm.includes('விலாசம்')
        ) {
          mapping.addressCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Principal / Loan Amount
      if (mapping.principalCol === -1) {
        if (
          /^(principal|principal\s*amount|principal\s*inr|loan|loan\s*amount|credit\s*amount|credit\s*limit|credit\s*limit\s*inr|sanctioned\s*amount|sanctioned\s*limit|sanctioned\s*limit\s*inr|advance|disbursed|அசல்|தொகை|கடன்\s*தொகை|அசல்\s*தொகை|வழங்கிய\s*தொகை)$/i.test(norm) ||
          (norm.includes('principal') && !norm.includes('remaining') && !norm.includes('total')) ||
          (norm.includes('sanction') && !norm.includes('date')) ||
          (norm.includes('loan') && !norm.includes('date') && !norm.includes('no') && !norm.includes('type')) ||
          norm.includes('அசல்')
        ) {
          mapping.principalCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Date / Registration / Joining Date
      if (mapping.dateCol === -1) {
        if (
          /^(date|month\s*year|joining\s*date|start\s*date|registration\s*date|reg\s*date|loan\s*date|தேதி|துவக்க\s*தேதி|பதிவு\s*தேதி)$/i.test(norm) ||
          norm.includes('date') ||
          norm.includes('தேதி')
        ) {
          mapping.dateCol = cIdx;
          score += 1;
          return;
        }
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
      bestMapping = mapping;
    }
  }

  // Determine starting data index
  const dataStartIndex = bestRowIndex >= 0 ? bestRowIndex + 1 : 0;
  const numCols = rows[Math.max(0, bestRowIndex)]?.length || (rows[0] ? rows[0].length : 0);

  // Pass 2: Content Profiler Fallback if core fields were not discovered by headers
  if (bestMapping && dataStartIndex < rows.length) {
    for (let c = 0; c < numCols; c++) {
      const profile = profileColumnData(rows, dataStartIndex, c, 15);

      // Phone Profiling fallback
      if (bestMapping.phoneCol === -1 && profile.phoneRatio >= 0.5) {
        bestMapping.phoneCol = c;
      }
      // Principal Profiling fallback
      if (bestMapping.principalCol === -1 && profile.currencyRatio >= 0.5 && c !== bestMapping.phoneCol) {
        bestMapping.principalCol = c;
      }
      // Name Profiling fallback (column with human text, not matched to other fields)
      if (bestMapping.nameCol === -1 && profile.textRatio >= 0.5 &&
          c !== bestMapping.phoneCol && c !== bestMapping.principalCol) {
        bestMapping.nameCol = c;
      }
      // Serial No Profiling fallback
      if (bestMapping.slNoCol === -1 && profile.serialRatio >= 0.6 &&
          c !== bestMapping.phoneCol && c !== bestMapping.principalCol && c !== bestMapping.nameCol) {
        bestMapping.slNoCol = c;
      }
    }
  }

  // If score is high enough or name/phone were inferred
  if (bestMapping && (bestScore >= 3 || (bestMapping.nameCol !== -1 && bestMapping.phoneCol !== -1))) {
    bestMapping.isAutoDetected = true;
    return {
      headerRowIndex: bestRowIndex,
      dataStartIndex,
      mapping: bestMapping,
      isAutoDetected: true
    };
  }

  // If completely unstructured, discover columns purely from content profiler on row 0 data
  const fallbackMapping = {
    nameCol: -1,
    phoneCol: -1,
    areaCol: -1,
    villageCol: -1,
    addressCol: -1,
    principalCol: -1,
    slNoCol: -1,
    dateCol: -1,
    dayCols: new Map(),
    isAutoDetected: false
  };

  for (let c = 0; c < numCols; c++) {
    const prof = profileColumnData(rows, 0, c, 20);
    if (fallbackMapping.phoneCol === -1 && prof.phoneRatio >= 0.4) fallbackMapping.phoneCol = c;
    else if (fallbackMapping.principalCol === -1 && prof.currencyRatio >= 0.4) fallbackMapping.principalCol = c;
    else if (fallbackMapping.nameCol === -1 && prof.textRatio >= 0.4) fallbackMapping.nameCol = c;
    else if (fallbackMapping.slNoCol === -1 && prof.serialRatio >= 0.5) fallbackMapping.slNoCol = c;
  }

  return {
    headerRowIndex: bestRowIndex >= 0 ? bestRowIndex : 0,
    dataStartIndex: bestRowIndex >= 0 ? bestRowIndex + 1 : 0,
    mapping: fallbackMapping,
    isAutoDetected: false
  };
}

/**
 * Column Metadata Inspector
 * Produces column list with detected headers and real sample cell values for the frontend mapping deck.
 */
export function inspectAvailableColumns(rows, headerRowIndex = 0, sampleRowsCount = 3) {
  if (!rows || rows.length === 0) return [];
  const headerRow = rows[headerRowIndex] || [];
  const numCols = Math.max(headerRow.length, rows[headerRowIndex + 1]?.length || 0);
  const columns = [];

  for (let colIdx = 0; colIdx < numCols; colIdx++) {
    const rawHeader = headerRow[colIdx];
    const headerTitle = (rawHeader !== undefined && rawHeader !== null && String(rawHeader).trim() !== '')
      ? String(rawHeader).trim()
      : `Column ${colIdx + 1}`;

    const samples = [];
    for (let r = headerRowIndex + 1; r < Math.min(rows.length, headerRowIndex + 1 + sampleRowsCount); r++) {
      const val = rows[r]?.[colIdx];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        samples.push(String(val).trim());
      }
    }

    columns.push({
      index: colIdx,
      header: headerTitle,
      samples: samples.slice(0, 3)
    });
  }

  return columns;
}

/**
 * Universal Data Extractor
 * Accepts either system auto-detected mapping or user-customized mapping from the UI.
 */
export function extractClientRowData(row, mapping, rowIndex, totalDays = 31) {
  if (!row || !Array.isArray(row)) return null;

  // Resolve column indexes safely from mapping (handles Map, Object, or integer representations)
  const getCol = (key) => {
    if (!mapping) return -1;
    const val = mapping[key];
    if (val === undefined || val === null || val === '') return -1;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? -1 : parsed;
  };

  const slNoCol = getCol('slNoCol');
  const dateCol = getCol('dateCol');
  const nameCol = getCol('nameCol');
  const phoneCol = getCol('phoneCol');
  const villageCol = getCol('villageCol');
  const areaCol = getCol('areaCol');
  const addressCol = getCol('addressCol');
  const principalCol = getCol('principalCol');

  const slNoRaw = slNoCol !== -1 ? row[slNoCol] : '';
  const slNo = slNoRaw ? parseInt(String(slNoRaw).replace(/[^0-9]/g, ''), 10) || rowIndex : rowIndex;

  const date = dateCol !== -1 && row[dateCol] !== undefined
    ? String(row[dateCol]).trim()
    : '';

  const name = nameCol !== -1 && row[nameCol] !== undefined
    ? String(row[nameCol]).trim()
    : '';

  // Phone cleaner: extracts 10-digit mobile number, handles +91/91/0 prefixes
  let phone = '';
  if (phoneCol !== -1 && row[phoneCol] !== undefined) {
    const rawPhone = String(row[phoneCol]).trim();
    const digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.length > 10 && digits.startsWith('91')) {
      phone = digits.slice(-10);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      phone = digits.slice(1);
    } else {
      phone = digits;
    }
  }

  // Location / Village / Area / Address Assembly
  const village = villageCol !== -1 && row[villageCol] !== undefined
    ? String(row[villageCol]).trim()
    : '';

  const area = areaCol !== -1 && row[areaCol] !== undefined
    ? String(row[areaCol]).trim()
    : '';

  const streetAddress = addressCol !== -1 && row[addressCol] !== undefined
    ? String(row[addressCol]).trim()
    : '';

  // Combine address components gracefully without duplicating repeated words
  const addressParts = [];
  if (streetAddress) addressParts.push(streetAddress);
  if (area && !streetAddress.toLowerCase().includes(area.toLowerCase())) {
    addressParts.push(area);
  }
  if (village && !streetAddress.toLowerCase().includes(village.toLowerCase()) && !area.toLowerCase().includes(village.toLowerCase())) {
    addressParts.push(village);
  }

  const combinedAddress = addressParts.join(', ').trim();

  // Principal extraction
  let principal = 0;
  if (principalCol !== -1 && row[principalCol] !== undefined) {
    principal = parseCurrencyNumber(row[principalCol], 0);
  }

  // Daily collections extraction (if explicit day columns are mapped)
  let collectionSum = 0;
  const dayEntries = [];

  const dayColsMap = mapping.dayCols;
  if (dayColsMap) {
    for (let d = 1; d <= totalDays; d++) {
      let colIdx = -1;
      if (dayColsMap instanceof Map) {
        colIdx = dayColsMap.get(d) ?? -1;
      } else if (typeof dayColsMap === 'object') {
        colIdx = dayColsMap[d] ?? dayColsMap[String(d)] ?? -1;
      }

      if (colIdx >= 0 && colIdx < row.length && row[colIdx] !== undefined && row[colIdx] !== '' && row[colIdx] !== null) {
        const amt = parseCurrencyNumber(row[colIdx], 0);
        if (amt > 0) {
          collectionSum += amt;
          dayEntries.push({ day: d, amount: amt });
        }
      }
    }
  }

  return {
    slNo,
    date,
    name,
    phone,
    village,
    area,
    address: combinedAddress,
    principal,
    dayEntries,
    collectionSum
  };
}
