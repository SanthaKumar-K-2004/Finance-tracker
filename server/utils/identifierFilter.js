const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Clean user identifier input (stripping leading '#' or extra whitespace).
 * @param {string|number} val
 * @returns {string}
 */
export function cleanIdentifier(val) {
  if (val == null) return '';
  return String(val).trim().replace(/^#/, '').trim();
}

/**
 * Matches a row against arbitrary user input range/code.
 * Supports:
 *  1. Pure numeric ranges (e.g. 1 to 100, 50 to 50, from 10 onwards)
 *  2. Alphanumeric single codes (e.g. "snop65d", "CLI-01", "A1")
 *  3. Alphanumeric ranges (e.g. "snop01" to "snop65d", "A1" to "A50")
 *  4. Prefix and exact matching across client_code, sl_no, and client_id
 *
 * @param {Object} row Row with sl_no, client_code, client_id, name
 * @param {string|number} fromInput From value from user
 * @param {string|number} toInput To value from user
 * @returns {boolean}
 */
export function matchesIdentifierRange(row, fromInput, toInput) {
  const fromStr = cleanIdentifier(fromInput);
  const toStr = cleanIdentifier(toInput);

  // If neither boundary is specified, match everything
  if (!fromStr && !toStr) return true;

  // Gather candidate identifiers for this row
  const candidates = [];
  if (row.client_code != null && String(row.client_code).trim() !== '') {
    candidates.push(cleanIdentifier(row.client_code));
  }
  if (row.sl_no != null && String(row.sl_no).trim() !== '') {
    candidates.push(cleanIdentifier(row.sl_no));
  }
  if (row.client_id != null && String(row.client_id).trim() !== '') {
    candidates.push(cleanIdentifier(row.client_id));
  }

  // If row has no identifiers at all, only match if name matches exact string
  if (candidates.length === 0) {
    if (fromStr && row.name && row.name.toLowerCase().includes(fromStr.toLowerCase())) {
      return true;
    }
    return false;
  }

  const isFromNumeric = /^\d+$/.test(fromStr);
  const isToNumeric = /^\d+$/.test(toStr);

  // Scenario 1: Numeric Range (Both are digits, or one is digit and other is empty)
  if ((fromStr && isFromNumeric && !toStr) ||
      (!fromStr && toStr && isToNumeric) ||
      (fromStr && isFromNumeric && toStr && isToNumeric)) {
    const min = fromStr ? parseInt(fromStr, 10) : -Infinity;
    const max = toStr ? parseInt(toStr, 10) : Infinity;

    // Direct check on numeric sl_no
    const sl = Number(row.sl_no);
    if (!isNaN(sl) && sl >= min && sl <= max) {
      return true;
    }

    // Check if any candidate parses as number in range
    for (const cand of candidates) {
      if (/^\d+$/.test(cand)) {
        const n = parseInt(cand, 10);
        if (n >= min && n <= max) return true;
      }
    }

    // If single number exact match (from === to), allow direct string match
    if (fromStr && toStr && fromStr === toStr) {
      for (const cand of candidates) {
        if (cand.toLowerCase() === fromStr.toLowerCase()) return true;
      }
    }

    return false;
  }

  // Scenario 2: Alphanumeric Single Code (User entered e.g. "snop65d" in From, with To blank or identical)
  if (fromStr && (!toStr || fromStr.toLowerCase() === toStr.toLowerCase())) {
    const target = fromStr.toLowerCase();
    for (const cand of candidates) {
      const cLower = cand.toLowerCase();
      if (cLower === target || cLower.startsWith(target) || cLower.includes(target)) {
        return true;
      }
    }
    if (row.name && row.name.toLowerCase().includes(target)) {
      return true;
    }
    return false;
  }

  // Scenario 3: Alphanumeric Upper Bound Only (From is empty, To is e.g. "snop65d")
  if (!fromStr && toStr) {
    const target = toStr.toLowerCase();
    for (const cand of candidates) {
      if (cand.toLowerCase() === target || collator.compare(cand, toStr) <= 0) {
        return true;
      }
    }
    return false;
  }

  // Scenario 4: Alphanumeric Range (e.g. "snop01" to "snop65d", or "A1" to "A50")
  for (const cand of candidates) {
    const cmpFrom = collator.compare(cand, fromStr);
    const cmpTo = collator.compare(cand, toStr);

    if (cmpFrom >= 0 && cmpTo <= 0) {
      return true;
    }

    // Also match if candidate begins with either boundary prefix
    const cLower = cand.toLowerCase();
    if (cLower.startsWith(fromStr.toLowerCase()) || cLower.startsWith(toStr.toLowerCase())) {
      return true;
    }
  }

  return false;
}
