# Phase 6: Excel Template Engine, WhatsApp Receipts & Verification

Implement full fidelity Excel import/export matching the ALR register, zero-cost WhatsApp receipt dispatch, 58mm/80mm Bluetooth thermal POS printing, and 1-click database backup and restore.

## Proposed Changes

### 1. Excel Engine (`server/routes/excel.js`)
- **`GET /api/excel/template`**: Pre-formatted Excel with merged title & summary headers (`ws['!merges']`), 20 blank formula rows, and a sample borrower.
- **`GET /api/excel/export`**: Complete 31-day collection register export for the selected month with active formulas (`=SUM(G4:AK4)`, `=IF(F4-AL4<0,0,F4-AL4)`, `=IF(AL4-F4>0,AL4-F4,0)`), custom column widths, and merged header cells (`A1:AP1`, `A2:B2`, `C2:E2`, `F2:J2`).
- **`POST /api/excel/preview`**:
  - Drag-and-drop Excel file parser.
  - Column validator checking register headers.
  - Internal duplicate phone detector (flags multiple rows in uploaded sheet sharing same phone).
  - Database duplicate phone detector (cross-references active borrower records).
  - Returns validation warnings, statistical summary (rows, principal sum, collection total), and preview data.
- **`POST /api/excel/import`**:
  - Commits valid rows and daily collection amounts to database with upsert logic.

### 2. WhatsApp & Print Receipts (`server/utils/receipt.js` & `src/components/ReceiptModal.jsx`)
- **Zero-Cost `wa.me` Link Generator**:
  - Concise Tamil template: `வணக்கம் [பெயர்], [தேதி] வசூல் தொகை: ₹[தொகை]. மீதமுள்ள நிலுவை: ₹[நிலுவை]. நன்றி, [கடை பெயர்].`
  - Concise English template: `Dear [Name], Collection received on [Date]: ₹[Amount]. Remaining balance: ₹[Balance]. Thank you, [Shop Name].`
  - Disbursement slip templates for new loans.
  - WhatsApp audit logging into `whatsapp_logs` table.
- **Bluetooth Thermal POS Printer CSS (`src/index.css`)**:
  - Support both 58mm and 80mm receipt roll widths.
  - High-contrast black/white mono font formatting for Bluetooth ESC/POS printers.

### 3. Database Backup & Restore (`server/routes/backup.js` & `src/pages/SettingsPage.jsx`)
- **`GET /api/backup/download-db`**: Checkpoint WAL into `finance.db` and stream the binary SQLite database snapshot.
- **`POST /api/backup/restore-db`**: 1-click upload and restore of binary `.db` snapshot.
- JSON backup & restore remains available as an alternative cross-platform format.

### 4. Interactive Frontend (`src/pages/ExcelPage.jsx` & `src/pages/SettingsPage.jsx`)
- Drag-and-drop file dropzone in ExcelPage with instant interactive preview modal/section.
- Duplicate phone warning chips and validation summary pills.
- "Confirm & Commit to Database" button.
- 1-click `.db` download button in SettingsPage.

## Verification Plan

### Automated Tests
- `test/phase6.test.js`:
  - Verify Excel template formulas & merges.
  - Verify Excel export formulas & merges.
  - Verify Excel preview: checks headers, flags duplicate phones in sheet & DB.
  - Verify Excel import: correctly creates clients & daily collections.
  - Verify WhatsApp URL generator & exact Tamil/English templates.
  - Verify Database binary snapshot download (`/api/backup/download-db`).
  - Verify Database JSON backup & restore.
- Run `npm test` (all suites must pass).
- Run `npm run build` to ensure production bundle compiles cleanly.

### Manual / Browser Subagent Verification
- Launch `browser_subagent` to visually test:
  1. Excel Page with drag-and-drop zone and template download.
  2. Receipt Modal with Tamil/English toggles, concise WhatsApp preview, and print view.
  3. Settings Page 1-click database backup.
