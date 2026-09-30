/**
 * ALR Finance — Server-Side Date & Calendar Utilities
 * Robust sanitizer for month_year parameters (prevents 'undefined', 'null', or malformed queries).
 */

export function sanitizeMonthYear(val) {
  if (val && typeof val === 'string' && val !== 'undefined' && val !== 'null') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getDaysInMonth(monthYear) {
  const safe = sanitizeMonthYear(monthYear);
  const [y, m] = safe.split('-').map(Number);
  return (y && m) ? new Date(y, m, 0).getDate() : 31;
}

