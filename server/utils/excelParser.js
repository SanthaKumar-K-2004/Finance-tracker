import { parseCurrencyNumber } from './currency.js';

/**
 * Intelligent Excel Header & Column Mapping Engine
 * Resolves Tamil & English variations of customer, village, area, address, phone, and principal columns.
 */

// Normalized pattern matching helpers
function normalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\n\r\t_]/g, ' ')
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '')
    .trim();
}

export function detectHeaderAndColumns(rows) {
  let bestRowIndex = -1;
  let bestScore = 0;
  let bestMapping = null;

  const maxScanRows = Math.min(rows.length, 10);

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

    row.forEach((cell, cIdx) => {
      if (cell === null || cell === undefined || cell === '') return;
      const raw = String(cell).trim();
      const norm = normalize(raw);

      // Check numeric day columns (1, 2, 3.. 31) or 'Day 1'
      const dayMatch = norm.match(/^(?:day\s*)?([1-9]|[12][0-9]|3[01])$/);
      if (dayMatch) {
        const dNum = parseInt(dayMatch[1], 10);
        if (dNum >= 1 && dNum <= 31) {
          mapping.dayCols.set(dNum, cIdx);
          return;
        }
      }

      // Check Sl.No / Code
      if (mapping.slNoCol === -1) {
        if (/^(sl\s*no|s\s*no|slno|sno|serial|no|code|client\s*code|ref|account\s*ref|வரிசை|எண்)$/i.test(norm)) {
          mapping.slNoCol = cIdx;
          score += 1;
          return;
        }
      }

      // Check Customer / Borrower Name (Must NOT be area or address)
      if (mapping.nameCol === -1) {
        if (
          /^(name|customer\s*name|borrower\s*name|client\s*name|applicant|contact\s*person|borrower\s*full\s*name|பெயர்|வாடிக்கையாளர்|நபர்)$/i.test(norm) ||
          (norm.includes('name') && !norm.includes('area') && !norm.includes('guarantor') && !norm.includes('village')) ||
          norm.includes('பெயர்')
        ) {
          mapping.nameCol = cIdx;
          score += 3; // Name is heavily weighted
          return;
        }
      }

      // Check Phone / Mobile
      if (mapping.phoneCol === -1) {
        if (
          /^(phone|phone\s*number|mobile|mobile\s*number|contact|contact\s*no|contact\s*number|cell|primary\s*contact|primary\s*mobile|தொலைபேசி|அலைபேசி|கைபேசி)$/i.test(norm) ||
          norm.includes('phone') ||
          norm.includes('mobile') ||
          norm.includes('தொலைபேசி') ||
          norm.includes('அலைபேசி')
        ) {
          mapping.phoneCol = cIdx;
          score += 3; // Phone is heavily weighted
          return;
        }
      }

      // Check Village / Town / City / District
      if (mapping.villageCol === -1) {
        if (
          /^(village|town|city|district|district\s*region|taluk|branch|கிராமம்|ஊர்|நகரம்|மாவட்டம்)$/i.test(norm) ||
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

      // Check Area / Location / Ward / Zone
      if (mapping.areaCol === -1) {
        if (
          /^(area|location|zone|ward|area\s*town|பகுதி|வட்டாரம்)$/i.test(norm) ||
          norm.includes('area') ||
          norm.includes('location') ||
          norm.includes('பகுதி') ||
          norm.includes('வட்டாரம்')
        ) {
          mapping.areaCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Street / Full Address / Landmark
      if (mapping.addressCol === -1) {
        if (
          /^(address|street|landmark|address\s*landmark|full\s*address|residential\s*address|முகவரி|தெரு|விலாசம்)$/i.test(norm) ||
          norm.includes('address') ||
          norm.includes('street') ||
          norm.includes('landmark') ||
          norm.includes('முகவரி')
        ) {
          mapping.addressCol = cIdx;
          score += 2;
          return;
        }
      }

      // Check Principal / Loan Amount
      if (mapping.principalCol === -1) {
        if (
          /^(principal|principal\s*amount|loan|loan\s*amount|credit\s*amount|credit\s*limit|credit\s*limit\s*inr|sanctioned\s*amount|sanctioned\s*limit|sanctioned\s*limit\s*inr|அசல்|தொகை|கடன்\s*தொகை)$/i.test(norm) ||
          (norm.includes('principal') && !norm.includes('remaining') && !norm.includes('total')) ||
          (norm.includes('sanction') && !norm.includes('date')) ||
          (norm.includes('loan') && !norm.includes('date') && !norm.includes('no')) ||
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
          /^(date|month\s*year|joining\s*date|start\s*date|registration\s*date|reg\s*date|தேதி|துவக்க\s*தேதி)$/i.test(norm) ||
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

  // If score is high enough (at least 3 points, e.g. name or phone detected)
  if (bestScore >= 3 && bestMapping && bestMapping.nameCol !== -1) {
    bestMapping.isAutoDetected = true;
    return {
      headerRowIndex: bestRowIndex,
      dataStartIndex: bestRowIndex + 1,
      mapping: bestMapping,
      isAutoDetected: true
    };
  }

  // Fallback to classic ALR template layout (Header at row 2, data starts at row 3)
  const fallbackDayCols = new Map();
  for (let d = 1; d <= 31; d++) {
    fallbackDayCols.set(d, 5 + d); // col 6 is Day 1
  }

  const fallbackMapping = {
    slNoCol: 0,
    dateCol: 1,
    nameCol: 2,
    phoneCol: 3,
    areaCol: -1,
    villageCol: -1,
    addressCol: 4,
    principalCol: 5,
    dayCols: fallbackDayCols,
    isAutoDetected: false
  };

  return {
    headerRowIndex: 2,
    dataStartIndex: 3,
    mapping: fallbackMapping,
    isAutoDetected: false
  };
}

/**
 * Cleanly extracts and normalizes row data using the detected column mapping
 */
export function extractClientRowData(row, mapping, rowIndex, totalDays = 31) {
  if (!row || !Array.isArray(row)) return null;

  const slNoRaw = mapping.slNoCol !== -1 ? row[mapping.slNoCol] : '';
  const slNo = slNoRaw ? parseInt(String(slNoRaw).replace(/[^0-9]/g, ''), 10) || rowIndex : rowIndex;

  const date = mapping.dateCol !== -1 && row[mapping.dateCol] !== undefined
    ? String(row[mapping.dateCol]).trim()
    : '';

  const name = mapping.nameCol !== -1 && row[mapping.nameCol] !== undefined
    ? String(row[mapping.nameCol]).trim()
    : '';

  // Phone clean (only digits)
  let phone = '';
  if (mapping.phoneCol !== -1 && row[mapping.phoneCol] !== undefined) {
    const rawPhone = String(row[mapping.phoneCol]).trim();
    const digits = rawPhone.replace(/[^0-9]/g, '');
    // If includes country code 91 (e.g. 919842156789), keep last 10 digits
    if (digits.length > 10 && digits.startsWith('91')) {
      phone = digits.slice(-10);
    } else {
      phone = digits;
    }
  }

  // Intelligent Location / Village / Area / Address Assembly
  const village = mapping.villageCol !== -1 && row[mapping.villageCol] !== undefined
    ? String(row[mapping.villageCol]).trim()
    : '';

  const area = mapping.areaCol !== -1 && row[mapping.areaCol] !== undefined
    ? String(row[mapping.areaCol]).trim()
    : '';

  const streetAddress = mapping.addressCol !== -1 && row[mapping.addressCol] !== undefined
    ? String(row[mapping.addressCol]).trim()
    : '';

  // Combine address parts without duplicate entries
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
  if (mapping.principalCol !== -1 && row[mapping.principalCol] !== undefined) {
    principal = parseCurrencyNumber(row[mapping.principalCol], 0);
  }

  // Daily collections extraction (only if explicit day columns were detected, or legacy ALR layout)
  let collectionSum = 0;
  const dayEntries = [];

  if (mapping.dayCols && mapping.dayCols.size > 0) {
    for (let d = 1; d <= totalDays; d++) {
      const colIdx = mapping.dayCols.get(d);
      if (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== '' && row[colIdx] !== null) {
        const amt = parseCurrencyNumber(row[colIdx], 0);
        if (amt > 0) {
          collectionSum += amt;
          dayEntries.push({ day: d, amount: amt });
        }
      }
    }
  } else if (!mapping.isAutoDetected) {
    // Only in classic ALR template without explicit day headers
    for (let d = 1; d <= totalDays; d++) {
      const colIdx = 5 + d;
      if (colIdx < row.length && row[colIdx] !== undefined && row[colIdx] !== '' && row[colIdx] !== null) {
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
