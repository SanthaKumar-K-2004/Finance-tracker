/**
 * ALR Finance — Frontend Date & Month Utilities
 * Provides standardized calendar math, session storage management, and automatic current month detection.
 */

export const TAMIL_MONTHS = {
  1: 'ஜனவரி',
  2: 'பிப்ரவரி',
  3: 'மார்ச்',
  4: 'ஏப்ரல்',
  5: 'மே',
  6: 'ஜூன்',
  7: 'ஜூலை',
  8: 'ஆகஸ்ட்',
  9: 'செப்டம்பர்',
  10: 'அக்டோபர்',
  11: 'நவம்பர்',
  12: 'டிசம்பர்'
};

export const SHORT_ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns the current calendar month as 'YYYY-MM'
 */
export function getCurrentMonthYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns total days in the given 'YYYY-MM' (e.g. Feb: 28/29, Apr: 30, May: 31)
 */
export function getDaysInMonth(monthYear) {
  if (!monthYear || typeof monthYear !== 'string') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  const [y, m] = monthYear.split('-').map(Number);
  if (!y || !m) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  return new Date(y, m, 0).getDate();
}

/**
 * Checks if a given 'YYYY-MM' is the current calendar month
 */
export function isCurrentCalendarMonth(monthYear) {
  return monthYear === getCurrentMonthYear();
}

/**
 * Formatted title for header and picker (Tamil + English)
 */
export function formatMonthYearLabel(monthYear, lang = 'ta') {
  if (!monthYear) return '';
  const [y, m] = monthYear.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return monthYear;

  const engShort = SHORT_ENGLISH_MONTHS[m - 1] || '';
  const tamilName = TAMIL_MONTHS[m] || '';

  if (lang === 'ta') {
    return `${tamilName} ${y} (${engShort})`;
  }
  return `${engShort} ${y} (${tamilName})`;
}

/**
 * Session storage getter:
 * When user opens the browser/tab anew, sessionStorage is empty, so it always defaults to Current Month!
 * When navigating between pages within the same session, their chosen month is preserved.
 */
export function getSessionActiveMonth() {
  if (typeof window === 'undefined') return getCurrentMonthYear();
  try {
    const sessionMonth = sessionStorage.getItem('alr_active_month');
    if (sessionMonth && /^\d{4}-\d{2}$/.test(sessionMonth)) {
      return sessionMonth;
    }
  } catch (_) {}
  return getCurrentMonthYear();
}

/**
 * Session storage setter
 */
export function setSessionActiveMonth(monthYear) {
  if (typeof window === 'undefined') return;
  try {
    if (monthYear && /^\d{4}-\d{2}$/.test(monthYear)) {
      sessionStorage.setItem('alr_active_month', monthYear);
    }
  } catch (_) {}
}
