# Implementation Plan: Header Overhaul, Logo Upload Feature & Advanced Real-Time Analytics Dashboard

## Executive Summary
This implementation introduces a modern, high-aesthetic **Header Section Overhaul** with **Shop Logo Upload** (backed by cloud-synced storage), plus an enterprise-grade **Real-Time Analytics Dashboard** featuring an interactive **Multi-Filter System** (village/route, loan size, collection status, live search), **Route-wise Breakdown Tables**, **31-Day Collection Velocity Trends**, and **1-Tap WhatsApp Defaulter Reminders**.

---

## User Review Required

> [!IMPORTANT]
> - **Logo Storage Architecture**: Logos will be accepted via drag-and-drop or file upload (PNG, JPG, SVG, WebP), compressed client-side to an optimal resolution, and saved both in local `/data/uploads/` and persisted in Turso Cloud SQLite (`companies.logo_url`). This ensures the logo stays synced across all mobile and desktop devices without requiring paid third-party S3 buckets.
> - **Real-Time Dashboard Architecture**: The dashboard will combine server-aggregated analytical metrics with client-side reactive filtering. This delivers instantaneous, 0-millisecond response times when toggling filters (Village, Status, Loan Range, Search) without triggering server round-trip delays, while maintaining a live auto-refresh sync indicator.

---

## Proposed Changes

### 1. Database Schema & Migration
#### [MODIFY] [`server/db.js`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/db.js)
- Add `logo_url TEXT` column to `companies` table definition in `SCHEMA_SQL`.
- Add auto-migration in `initSchema()`: executes `ALTER TABLE companies ADD COLUMN logo_url TEXT` safely with `try/catch` to handle existing tables gracefully.

---

### 2. Backend Company & Logo Upload API
#### [MODIFY] [`server/routes/company.js`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/company.js)
- Update `GET /api/company`: Return `logo_url` in company profile response.
- Update `PUT /api/company`: Accept `logo_url` and update `companies` table record; invalidate `'company'` and `'reports'` cache tags.
- Add `POST /api/company/logo`: Accept file upload (via `multer` disk storage in `data/uploads/` or base64 data URI), update `companies.logo_url`, and return the updated profile.
- Add `DELETE /api/company/logo`: Reset logo to `NULL` to restore default initials badge.

#### [MODIFY] [`server/index.js`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/index.js)
- Serve `/uploads` statically via `express.static(path.join(__dirname, '../data/uploads'))` so uploaded logo files are accessible publicly.

---

### 3. Backend Reports & Dashboard Analytics API
#### [MODIFY] [`server/routes/reports.js`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/reports.js)
- Enhance `GET /api/reports/dashboard`:
  - **Daily Collection Trend**: Aggregate collections day-by-day across all 31 days (`daily_trends`: `[{ day_number, amount, count }]`).
  - **Route / Village Performance**: Group metrics by borrower address/village (`villages`: `[{ village, client_count, total_principal, total_collected, total_remaining, collection_rate }]`).
  - **Clients Analytics Summary**: Provide lightweight array of active cycle clients with collection totals and status for instant zero-latency client-side filtering on the dashboard.
  - **Collection Velocity**: Calculate average daily collection rate and projected month-end clearance.

---

### 4. Frontend Company Context & Logo State
#### [MODIFY] [`src/context/CompanyContext.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/context/CompanyContext.jsx)
- Support `logo_url` in initial state and `localStorage` cache for 0ms initial render with zero layout shift.
- Expose `uploadLogo(fileOrDataUrl)` and `removeLogo()` helper functions.

---

### 5. Header Section Design Overhaul
#### [MODIFY] [`src/components/Layout.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/Layout.jsx) & [`src/index.css`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/index.css)
- **Glassmorphism Header**: Polished backdrop blur (`backdrop-filter: blur(14px)`), refined border styling, and responsive layout.
- **Dynamic Brand Logo**:
  - If `company.logo_url` exists, render high-res image with smooth rounded borders, subtle glow, and crisp scaling.
  - If no logo, render the dynamic gradient initials badge.
  - Quick hover action / camera icon to open logo upload or navigate to Settings.
- **Brand Identity**: Clean verified status pill, shop name, and branch/tagline.
- **Controls & Status**:
  - Live Realtime Cloud Indicator with latency badge.
  - Cash Denomination Counter quick access button.
  - UI Font Size stepper (`A- / 100% / A+`).
  - Theme mode cycle button.
  - Language toggle button (`தமிழ் / English`).

---

### 6. Settings Page: Logo Upload & Management
#### [MODIFY] [`src/pages/SettingsPage.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/SettingsPage.jsx)
- Add interactive **Shop Logo Upload Card**:
  - Live logo preview with circular and rectangular presentation.
  - Drag-and-drop zone and "Choose Image" button (supports PNG, JPG, WebP, SVG).
  - "Remove Logo" button to reset to default brand badge.
  - Client-side image optimization (auto-downscale if > 1MB).
  - Instant synchronization with Top Header and WhatsApp receipt branding.

---

### 7. Dashboard Overhaul: Features, Functions & Multi-Filter System
#### [MODIFY] [`src/pages/Dashboard.jsx`](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/Dashboard.jsx)
- **Real-Time Filter Bar**:
  - **Live Search**: Instant search by client name, Sl.No, or phone.
  - **Village / Route Filter**: Filter entire dashboard by specific village (Alanganallur, Vadipatti, Melur, etc.).
  - **Loan Principal Range Filter**: `All`, `Under ₹5,000`, `₹5,000 - ₹10,000`, `₹10,000 - ₹15,000`, `Above ₹15,000`.
  - **Collection Status Filter**: `All`, `Defaulters (At Risk)`, `Cleared Loans`, `Paid Today`, `Pending Today`, `Zero Collection`.
  - **1-Click Reset Filters** chip with filter counter badge.
  - **Live Auto-Refresh Toggle**: Real-time sync indicator with refresh button.
- **Enhanced KPI Metric Cards**:
  - Total Principal, Total Collected (with Collection Efficiency %), Total Remaining Due, Active Borrowers.
  - Today's Collection Inflow & Entries.
  - Daily Average Collection Velocity (₹/day).
- **Interactive Visual Analytics**:
  - **31-Day Collection Velocity Bar / Line Chart**: Shows daily cash inflow progression across the entire month.
  - **Collection Target Progress Ring**: Radial visual of collected vs remaining with target % indicator.
  - **Payment Mode Donut Chart**: Cash vs UPI/GPay distribution with breakdown percentages.
  - **Route / Village-Wise Performance Table**: Compare villages by clearance percentage, total collected, and remaining balances.
- **Defaulters & High-Risk Radar**:
  - Actionable borrower cards with remaining amount, last payment date, and route.
  - **1-Tap WhatsApp Reminder**: Pre-formatted friendly reminder message ready to send via `wa.me`.
  - Direct Phone Call trigger.

---

## Verification Plan

### Automated Tests
- Create `test/header_and_logo_upload.test.js`:
  - Verify `logo_url` column exists in `companies` table.
  - Verify `PUT /api/company` accepts and persists `logo_url`.
  - Verify `POST /api/company/logo` handles upload and updates company profile.
  - Verify `GET /api/company` returns `logo_url`.
  - Verify `DELETE /api/company/logo` clears logo.
- Create `test/dashboard_realtime_analytics.test.js`:
  - Verify `GET /api/reports/dashboard` returns `daily_trends`, `villages`, and `clients_summary`.
  - Verify route-wise metrics calculate correctly (sum of principal, collected, remaining per village).
  - Verify 31-day daily collection aggregates match database rows.
- Run complete test suite (`npm test`): Ensure all test suites pass with 100% success rate.

### Browser Visual Verification
- Use Brave Browser (`/usr/bin/brave`) via Playwright script:
  - Verify Top Header rendering with custom logo and glassmorphic navigation.
  - Verify Settings page logo upload interface (file picker, preview, remove).
  - Verify Dashboard with active Multi-Filter system (Village filter, Status filter, Principal Range filter, Live Search).
  - Verify 31-Day velocity chart, route-wise breakdown table, and WhatsApp reminder buttons.
  - Capture verification screenshots: `brave_header_logo_verified.png` and `brave_dashboard_filters_verified.png`.
