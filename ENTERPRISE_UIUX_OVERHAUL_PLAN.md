# 🏛️ ALR Finance — Enterprise UI/UX Overhaul & Psychology-of-Trust Plan (UI/UX Pro Max)

## [Goal Description]
Transform **ALR Finance (தினசரி வசூல் மேலாண்மை)** from an operational web utility into an enterprise-grade, psychologically reassuring financial management suite. Grounded in design intelligence fetched from `ui-ux-pro-max` (Minimalism & Swiss Style, Authority Navy & Emerald Trust Palette, Plus Jakarta Sans & Noto Sans Tamil typography, Tabular Figures, and Mobile Thumb Ergonomics), this plan systematically elevates every module and screen while strictly avoiding tacky "AI purple/neon" gradients or distracting animations.

---

## User Review Required

> [!IMPORTANT]
> **No Over-AI / Flashy Neon Visuals:** In accordance with financial psychology guidelines from `ui-ux-pro-max`, the visual theme deliberately uses deep authority navy (`#0F172A`, `#1E3A8A`), authentic emerald jade (`#059669`, `#10B981`) for recovered cash flow, ruby crimson (`#DC2626`) for overdue risk, and warm brass/gold (`#A16207`) for performance targets. Flashy animations or saturated purple gradients are strictly banned.

> [!NOTE]
> **Mobile Field Usability:** Microfinance agents frequently work outdoors, on two-wheelers, in bright sunlight, or using one hand on a mobile phone. We are implementing:
> 1. A persistent bottom thumb-navigation dock on mobile (`< 768px`).
> 2. Sticky client Sl.No + Name columns so horizontal scrolling of 31 days never loses row identity.
> 3. Strict minimum 44×44px tap targets and `inputMode="numeric"` to trigger the numeric keypad immediately.

---

## Open Questions

> [!NOTE]
> **Q1: Default Landing View on Mobile:**
> Should mobile devices default to the **Card View** (optimized for single-client quick entry) or the **Responsive Ledger Matrix** (dense 31-day table with horizontal scroll)?
> *Recommendation:* Default to Card View on mobile screens (`< 768px`) with an instant 1-tap toggle to Table View in the header, while desktops default to the high-density Table View.

---

## Proposed Changes

Grouped by component layer:

### 1. Typography & Global Design System Tokens

#### [MODIFY] [`index.html`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/index.html)
- Add **Plus Jakarta Sans** (`wght@400;500;600;700;800`) to the Google Fonts link alongside `Noto Sans Tamil`, `Mukta Malar`, `Inter`, and `JetBrains Mono`.
- Set high-contrast mobile meta settings.

#### [MODIFY] [`src/index.css`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/index.css)
- Implement `ui-ux-pro-max` design tokens:
  ```css
  :root {
    --font-heading: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
    --font-body: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
    --font-tamil: 'Noto Sans Tamil', 'Mukta Malar', sans-serif;
    --font-num: 'JetBrains Mono', monospace;

    /* Authority & Trust Palette */
    --color-primary: #0F172A;
    --color-primary-hover: #1E293B;
    --color-secondary: #1E3A8A;
    --color-accent: #A16207;
    --color-accent-hover: #854D0E;
    
    /* Semantic Status */
    --color-emerald-bg: #ECFDF5;
    --color-emerald-border: #A7F3D0;
    --color-emerald-text: #065F46;
    --color-emerald-solid: #059669;

    --color-ruby-bg: #FEF2F2;
    --color-ruby-border: #FECACA;
    --color-ruby-text: #991B1B;
    --color-ruby-solid: #DC2626;

    --color-amber-bg: #FFFBEB;
    --color-amber-border: #FDE68A;
    --color-amber-text: #92400E;
    --color-amber-solid: #D97706;

    /* Tabular figures across all numbers to prevent layout jitter */
    font-variant-numeric: tabular-nums;
  }
  ```
- Add multi-layered ambient elevations (`--shadow-card`, `--shadow-popover`, `--shadow-subtle`).
- Add glassmorphism header backdrop (`backdrop-filter: blur(12px)` with subtle border-bottom).

---

### 2. Navigation & Application Shell

#### [MODIFY] [`src/components/Layout.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/Layout.jsx)
- **Desktop Header:**
  - Modern company branding with verified badge.
  - Quick month-stepper & `MonthYearPicker` popover.
  - A11y Font Scaler ($A-$, $100\%$, $A+$).
  - Online/Offline live badge with pending sync queue count.
  - Quick Cash Handover launcher with real-time tally badge.
- **Mobile Bottom Navigation Dock:**
  - Pinned thumb dock at the bottom of the screen (`z-index: 100`) containing:
    1. **Ledger (வசூல்)** - Table/Card collection view
    2. **Dashboard (டாஷ்போர்டு)** - KPIs & Analytics
    3. **Borrowers (வாடிக்கையாளர்கள்)** - Directory & Add Client
    4. **Cash Handover (பணம் ஒப்படைப்பு)** - Denominations & Agent Slips
    5. **More (மேலும்)** - Closed Loans, Excel, Settings, Theme & Language

---

### 3. Core Daily Collection Ledger

#### [MODIFY] [`src/components/LedgerGrid.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/LedgerGrid.jsx)
- **Sticky Column Anchoring:**
  - Column 1: Sl.No (`ALR-1`) pinned at `left: 0`.
  - Column 2: Client Name & Phone pinned at `left: 56px` with subtle shadow divider.
  - Column 3: Principal & Daily Target (`left: 260px`).
- **Dynamic "Today" Highlight:**
  - When viewing the current month, column corresponding to today's date gets an amber-gold subtle column highlight (`.col-today`) so operators immediately target the correct cell.
- **Cell Micro-Interactions:**
  - Paid cell: soft emerald background, crisp green amount (`₹350`), checkmark icon on hover.
  - Zero/unpaid cell: neutral dash with soft hover effect.
  - 1-tap opens the accessible collection modal or enables quick inline input.

#### [MODIFY] [`src/components/ClientCard.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ClientCard.jsx)
- Balanced 2×2 metric grid (Principal, Collected, Remaining, Expected Daily).
- Visual progress bar showing loan repayment % (0% to 100%).
- Quick-pay action buttons (₹100, ₹200, ₹350, ₹500, Custom).
- Direct WhatsApp receipt launcher with 1 tap.

---

### 4. Executive Dashboard & Defaulter Radar

#### [MODIFY] [`src/pages/Dashboard.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/Dashboard.jsx)
- **Top 4 Financial KPI Hero Cards:**
  - Total Disbursed Principal (மொத்த அசல்)
  - Total Cash Collected (மொத்த வசூல்)
  - Today's Collection Status (இன்றைய வசூல்)
  - Recovery Percentage & Active Count (மீட்பு விகிதம்)
- **Target Progress Ring:** Enhanced SVG ring with smooth graduation and target benchmark markers.
- **Revenue Trend & Collection Breakdown:** Clean Recharts with custom rounded bar geometry (`radius: [4, 4, 0, 0]`) and custom tooltip styling.
- **Defaulter Radar (கவனம் தேவை):** Prominent priority table highlighting borrowers who haven't paid for 3+ consecutive days, with 1-click WhatsApp payment reminder dispatch.

---

### 5. Client Directory, Archive, Excel & Settings

#### [MODIFY] [`src/pages/ClientsPage.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClientsPage.jsx)
- Filter pills: All, Active, Cleared, Pending Today.
- Quick search with instant debounce.
- Clean client detail modal with full loan cycle history.

#### [MODIFY] [`src/pages/ClosedClientsPage.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClosedClientsPage.jsx)
- Settlement archive with digital settlement certificate preview.

#### [MODIFY] [`src/pages/ExcelPage.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ExcelPage.jsx)
- High-trust drag & drop upload zone with file-type validation.
- One-click sample Tamil Nadu ALR spreadsheet download.
- Pre-import preview table showing row count and total principal before committing to database.

#### [MODIFY] [`src/pages/SettingsPage.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/SettingsPage.jsx)
- Shop Profile Editor: Shop Name, Tamil Tagline, Address, Phone, Shop Logo upload & preview.
- Backup & Restore: Cloud Turso sync status, Local SQLite download, and manual snapshot trigger.

---

## Verification Plan

### Automated Tests
1. Run complete unit and integration regression suite:
   ```bash
   node --test test/production_clean_slate_and_currency.test.js
   node --test test/customer_crud_and_filters.test.js
   node --test test/company_profile_crud.test.js
   node --test test/header_and_logo_upload.test.js
   ```
2. Build verification:
   ```bash
   npm run build
   ```

### Manual & Browser Verification
1. **Live Browser Subagent Walkthrough:**
   - Test desktop widescreen layout ($1920 \times 999$).
   - Test mobile viewport ($375 \times 812$) with simulated touch interactions.
   - Verify sticky table column scroll behavior.
   - Verify bilingual Tamil/English typography rendering.
   - Verify dark mode contrast ($\ge 4.5:1$ WCAG AA).
2. Record browser test session artifact to verify UI fluidity and zero-jitter tabular figures.
