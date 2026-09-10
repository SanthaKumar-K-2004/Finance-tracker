# 🏛️ ALR Finance — Enterprise UI/UX Overhaul & Functional Expansion Plan

## Executive Overview
This implementation plan addresses the comprehensive overhaul requested:
1. **Loan Completion State Engine**:
   - Visual completion states: When a loan is cleared (`remaining <= 0`), the row/card displays a distinctive, elegant emerald highlight (`#F0FDF4` in light mode, emerald border glow in dark mode) with a completion badge.
   - Day input cells are **locked** (`readOnly` with subtle padlock styling) to prevent accidental edits.
   - **"Unlock to Edit" / "பூட்டை திறக்க"** mode: A dedicated toggle button lets the owner unlock the row to edit past entries or correct values when needed.
   - **"Close Loan / கடனை முடிக்க"** remains easily accessible to archive the loan to `closed_clients`.

2. **Dedicated Month/Year Navigation & Dynamic Month Days**:
   - A dedicated, high-end Month & Year picker popover/dropdown allowing selection of any year (2024 to 2030+) and any month (Jan to Dec with Tamil & English titles).
   - Dynamic calendar day calculation: automatically handles varying calendar days (e.g. Feb 28/29, Apr/Jun/Sep/Nov 30, Jan/Mar/May/Jul/Aug/Oct/Dec 31) across the entire system.
   - Quick prev/next month step buttons and "Today / Current Month" shortcut.

3. **Enterprise UI/UX Redesign**:
   - **Client Card View**: Completely rebuild the 4-metric summary boxes into a balanced 2x2 responsive grid to eliminate text clipping, awkward word wraps, and awkward alignments.
   - **Modern Interactive Elements**: Replace generic borders and buttons with cohesive fintech design tokens: refined radius, subtle drop shadows, soft badge backgrounds, and crisp Lucide SVG icons.
   - **Enterprise Dashboard**: Redesign KPI stat cards with trend badges, modern rounded bar charts and clean pie charts with customized Recharts tooltips, and a high-end Defaulter Radar table with call/WhatsApp quick actions.

4. **Tamil Typography & Localization**:
   - Integrate **Mukta Malar** with **Noto Sans Tamil** via Google Fonts for enhanced Tamil readability, refined line-height (1.6), and balanced numerals.

5. **Performance & Concurrency Stability**:
   - Ensure local/cloud SQLite configuration has appropriate busy timeouts (`busy_timeout = 5000`) and SWR caching for 0ms optimistic UI rendering and sub-15ms server queries.

---

## Technical Details

### 1. Loan Completion Feature
- In `src/components/LedgerGrid.jsx`:
  - Introduce `unlockedRows` state (`{ [cycleId]: boolean }`).
  - If `row.is_cleared` and `!unlockedRows[row.cycle_id]`:
    - Day input cells get `readOnly={true}`, `.cell-locked` CSS class, and `title="Loan cleared. Click unlock to edit"`.
    - An `Unlock` (`<Unlock size={14} />`) button in the actions column toggles editing on.
    - When unlocked, a soft amber highlight indicates active edit mode with a `<Lock size={14} />` button to re-lock.
- In `src/components/ClientCard.jsx`:
  - Similar `isUnlocked` state per card for cleared loans.
  - When locked, quick pay chips are replaced with a clean completion banner with an "Unlock to Edit Payments" button.

### 2. Month/Year Navigation Component (`src/components/MonthYearPicker.jsx`)
- Create `src/components/MonthYearPicker.jsx` with:
  - Year selector steppers (`< 2026 >`).
  - 12-month interactive grid showing month number, English name, and Tamil month name (சித்திரை, வைகாசி, ஆனி, ஆடி, ஆவணி, புரட்டாசி, ஐப்பசி, கார்த்திகை, மார்கழி, தை, மாசி, பங்குனி).
  - Badge indicating days count (e.g. 28 days for Feb, 30 days for Apr, 31 days for May).
  - Popover dropdown triggered from the top navigation bar.

### 3. Typography & Styling (`index.html` & `src/index.css`)
- Add `Mukta Malar` to Google Fonts link in `index.html`.
- Set `--font-tamil: 'Mukta Malar', 'Noto Sans Tamil', 'Inter', sans-serif;`.
- Redesign `.mobile-client-card`, `.client-amounts-row` to a 2x2 grid, `.chip-btn`, `.btn-primary`, and `.stat-card`.

---

## Verification Plan
1. Automated test suite execution: `npm test`.
2. Production bundle build: `npm run build`.
3. Manual testing on `http://localhost:5173`.
