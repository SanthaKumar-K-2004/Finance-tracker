# 🌿 Lark Theme Dashboard UI/UX Transformation

The **Daily Collection Register (ALR) Executive Dashboard** has been completely transformed according to the Ant Design **Lark Theme** (`larkTheme.ts`) token specification.

---

## 🎨 Lark Theme Design System Token Mapping

The Lark Design System tokens have been mapped into responsive Vanilla CSS custom variables in `src/index.css`, ensuring zero external bundle overhead and ultra-fast rendering:

| Lark Token / Config | Value | Purpose / Usage in Dashboard |
| :--- | :--- | :--- |
| `colorPrimary` | `#00B96B` | Signature vibrant Lark emerald for primary stats, progress bar fills, active states, and CTAs |
| `borderRadius` | `4px` | Enterprise crisp geometry across stat cards, segment tabs, action buttons, and modal dialogs |
| `bodyBg` | `#f7fbf8` | Soft mint-tinted backdrop canvas providing high contrast and visual calm |
| `headerBg` / `surface` | `#ffffff` | Pure white elevated surfaces with subtle border strokes (`#e2ebe5`) |
| `headerColor` / `title` | `#1f2329` | High-contrast charcoal slate typography for headers, labels, and primary values |
| `triggerBg` | `#eff7f2` | Mint-tinted pill badges, action triggers, and icon backing circles |
| `triggerColor` | `#1f2329` | High-legibility dark slate foreground for action triggers and badges |
| `progress.defaultColor` | `#00B96B` | High-visibility recovery progress bar fill |
| `progress.remainingColor` | `rgba(0, 185, 107, 0.12)` | Lark translucent emerald progress track |
| `progress.circleTextColor` | `#1f2329` | Monospace bold recovery rate percentage text |

---

## 🚀 Key Dashboard Enhancements & Features

### 1. Executive Header Banner
- **Lark Organization Avatar**: Crisp `#00B96B` icon badge with application identity.
- **Active Cycle Selector**: Instant dropdown switching between loan cycles (May 2026, April 2026, February 2026, etc.).
- **Live Today's Counter Pill**: Shows `🟢 இன்று வசூல்: ₹[Amount] • N ரசீதுகள்` with live pulsing emerald status indicator.
- **1-Tap Refresh Button**: Quick synchronization with sub-15ms cached backend response.

### 2. Segmented Navigation Switcher
Interactive Lark segmented control for switching views:
- **`Overview (கண்ணோட்டம்)`**: Full executive overview, charts, and priority defaulter radar.
- **`Recovery Analysis (வசூல் முன்னேற்றம்)`**: Deep-dive daily collection velocity and target recovery trajectory.
- **`Defaulter Radar (நிலுவை ரேடார்)`**: Instant view of high-priority borrowers with pending balances.
- **`Payment Mix (பணப்பரிமாற்ற முறைகள்)`**: Visual breakdown of Cash, GPay, UPI, and Bank Transfer splits.

### 3. 5-Metric Executive KPI Cards
All cards feature crisp `4px` borders, subtle hover elevation, and color-coded accents:
1. **Total Principal (மொத்த அசல் தொகை)**: In neutral slate (`#1f2329`).
2. **Total Collected (மொத்த வசூல்)**: In Lark signature emerald (`#00B96B`).
3. **Total Remaining (மீதமுள்ள நிலuவை)**: In high-visibility alarm coral (`#F54A45`).
4. **Today's Collections (இன்றைய வசூல்)**: In Lark mint-tinted highlight card (`#00B96B`).
5. **Closed Loans (முடிவடைந்த கடன்கள்)**: In amber (`#FF8800`) with quick link to the Closed Clients Archive.

### 4. Lark Progress & Velocity Box
- **Exact Token Track**: `rgba(0, 185, 107, 0.12)` track with `#00B96B` fill.
- **Required Daily Collection Velocity**: Displays the exact daily collection needed (`₹[Amount]/நாள்`) to achieve 100% recovery before the active month ends.
- **Status Badges**: Instant status pill (`முழு வசூல் முடிந்தது` or `நிலுவையில் உள்ளது`).

### 5. Lark Defaulter Radar with 1-Tap Action
- Lists top borrowers with unpaid balances.
- Displays borrower avatar initials, area, and remaining balance in monospace red.
- **1-Tap WhatsApp Reminder**: Directly opens the zero-cost WhatsApp receipt dialog prefilled with Tamil/English reminder text.
- **1-Tap Phone Call**: Direct `tel:` link for immediate mobile contact.

---

## 🧪 Verification & Quality Assurance

- **13 Test Suites / 109 Tests**: **100% Passed** with zero errors (`npm test`).
- **Production Bundle**: Built cleanly with Vite in **6.35s** with zero syntax or style errors (`npm run build`).
- **Dev Server**: Active on port `5000` (Express API) and `5173` (Vite UI).
