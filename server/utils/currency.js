/**
 * Currency and Number Parsing Utility for Daily Collection Finance System
 * Safely parses numbers from text/inputs, stripping commas, rupee signs, spaces, etc.
 * Handles inputs like: "10,000" -> 10000, "₹ 5,500.50" -> 5500.5, "10000" -> 10000
 */
export function parseCurrencyNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}
