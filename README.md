# 🏛️ Daily Collection Finance Manager (ALR Microfinance)
### (தினசரி வசூல் மற்றும் கடன் மேலாண்மை மென்பொருள்)

A complete, **zero-recurring-cost**, production-ready web application designed to digitize manual Excel registers and paper-based daily microfinance records (ALR Daily Collection Register) used across Tamil Nadu finance operations.

---

## 🌟 Key Highlights & Zero Recurring Cost

- **Zero Database Bills**: Dual-mode engine powered by **Turso Cloud SQLite** (`@libsql/client`) on AWS Mumbai Edge (<25ms latency) with local SQLite fallback (`data/finance.db`).
- **Zero WhatsApp Costs**: 1-tap `wa.me` deep link URL generator for concise Tamil & English receipts without recurring Meta WhatsApp Business API fees.
- **Zero Print Driver Costs**: Native `@media print` CSS engine optimized for 58mm portable Bluetooth thermal receipt printers and 80mm desktop POS printers.
- **100% Excel Template Fidelity**: Downloads and exports `.xlsx` files that replicate `Daily_Collection_Register__ALR_-6.xlsx`, including merged headers (`ws['!merges']`) and active formulas (`=SUM(G4:AK4)`, `=IF(F4-AL4<0,0,F4-AL4)`).

---

## 📋 Comprehensive Feature Matrix

### 1. 📑 Desktop 31-Day Interactive Ledger Grid
- **Sticky Freeze Panes**:
  - Left frozen: Sl.No, Borrower Name, Phone, Address, Principal Amount.
  - Middle scrollable: Days 1 through 31.
  - Right frozen: Total Collected, Remaining Balance, Excess Amount, Actions.
- **Excel Row 2 Summary Replica**: Displays top grand totals alongside dedicated per-day sum chips (`D1` to `D31`).
- **Excel Keyboard Navigation**: `Arrow` keys, `Enter`, `Tab`, with auto-select on focus for single-keypress entry.
- **0ms Optimistic Updates**: Live calculations for Total Collected, Remaining Balance, and Excess.

### 2. 📱 Mobile Field Cards (Field Collection Rounds)
- **Fast Touch Cards**: Designed for field agents collecting under bright outdoor conditions.
- **Quick-Pay Chips**: 1-tap installment buttons (`+₹100`, `+₹200`, `+₹500`, and `Full Due` / `முழு நிலுவை`).
- **Quick-Dial Action**: Call borrowers directly with 1 tap.
- **Sunlight Mode**: Ultra high-contrast theme (`#000000` text on `#FFFFFF` backgrounds) for direct sunlight readability.

### 3. 💬 WhatsApp & Thermal POS Receipts
- **1-Tap WhatsApp Receipts**:
  - **Tamil**: `வணக்கம் [பெயர்], [தேதி] வசூல் தொகை: ₹[தொகை]. மீதமுள்ள நிலுவை: ₹[நிலுவை]. நன்றி, [கடை பெயர்].`
  - **English**: `Dear [Name], Collection received on [Date]: ₹[Amount]. Remaining balance: ₹[Balance]. Thank you, [Shop Name].`
- **Format Toggle**: Switch between **Concise** (1-tap message) and **Detailed** (itemized slip).
- **Thermal POS Support**: Select between **58mm** and **80mm** roll widths.
- **Audit Logging**: Every dispatch is stored in the `whatsapp_logs` database table.

### 4. 🔄 Month-End Rollover & Client Archival
- **Rollover Wizard**: Preview who is moving to the next cycle and their carried-forward principal.
- **Automatic Principal Adjustment**: Remaining balance automatically becomes next month's principal.
- **Exclusion of Cleared Borrowers**: Fully settled borrowers are excluded from next month's active ledger.
- **Closed Clients Archive**: Preserves closed loan history with complete payment snapshots, recovery, and reopen capabilities.

### 5. 📊 Excel Import & Export Hub
- **Pre-formatted Template**: Download pre-formatted blank `.xlsx` with active `=SUM()` and `=IF()` formulas.
- **Drag & Drop Upload**: Upload offline registers directly.
- **Duplicate Phone Detection**: Flags duplicate mobile numbers within the sheet and cross-references existing database clients.
- **Interactive Preview Table**: Review rows, validation warnings, and summary KPIs before committing.

### 6. 💼 Evening Cash Reconciliation & Settlements
- **Live Cash Denomination Calculator**: Interactive counter for ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes.
- **Agent Settlement Vouchers**: Reconcile expected vs. actual collections and lock evening cash handovers.

### 7. 🛡️ Database Backup & Restore
- **1-Click SQLite Snapshot (`finance.db`)**: Flushes SQLite WAL logs and downloads the binary database.
- **1-Click Binary Restore**: Upload a `.db` file to restore the database.
- **Full JSON Backup & Restore**: Cross-platform backup across all 8 tables.

### 8. 🎨 Bilingual Engine & 4-Way Themes
- **Bilingual**: 100% key parity between Tamil (தமிழ்) and English.
- **4-Way Theme Engine**: Auto (Light 6AM–6PM, Dark 6PM–6AM), Manual Light, Dark, and Sunlight mode.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+ (Node.js 26 recommended)
- npm 10+

### Installation & Setup
```bash
# Clone or navigate to the project directory
cd "FINACE PROJECT"

# Install dependencies
npm install

# Start development servers (Express API on :5000 + Vite on :5173)
npm run dev
```

The application will be accessible at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🧪 Testing & Verification

Run the entire automated test suite (83 tests across 10 suites):
```bash
npm test
```

Run production build:
```bash
npm run build
```

---

## 🏛️ Project Architecture

```
FINACE PROJECT/
├── server/
│   ├── index.js                  # Express application entrypoint
│   ├── db.js                     # Turso Cloud SQLite & local SQLite client
│   ├── seed.js                   # ALR ledger database seeder
│   ├── syncLocalDb.js            # Turso Cloud to local SQLite sync engine
│   ├── mcpServer.js              # Native Antigravity MCP server
│   ├── routes/
│   │   ├── clients.js            # Client CRUD & validation
│   │   ├── collections.js        # 31-day grid entries & WhatsApp logs
│   │   ├── months.js             # Month cycle navigation
│   │   ├── rollover.js           # Month-end rollover engine
│   │   ├── reports.js            # KPIs, settlements & charts
│   │   ├── excel.js              # Excel template, export & preview import
│   │   └── backup.js             # 1-click database backup & restore
│   └── utils/
│       └── receipt.js            # wa.me URL generator & receipt formatters
├── src/
│   ├── App.jsx                   # Main layout, view routing & navigation
│   ├── index.css                 # Design system tokens, glassmorphism & POS print styles
│   ├── components/
│   │   ├── LedgerGrid.jsx        # 31-day sticky desktop spreadsheet
│   │   ├── ClientCard.jsx        # Mobile field touch cards with quick-pay
│   │   ├── CollectionModal.jsx   # Quick collection entry modal
│   │   ├── ReceiptModal.jsx      # WhatsApp & 58mm/80mm thermal receipt dialog
│   │   ├── CashCounterModal.jsx  # Evening cash denomination calculator
│   │   └── RolloverWizard.jsx    # Month-end rollover wizard
│   ├── pages/
│   │   ├── DashboardPage.jsx     # Financial KPIs, recovery rate & defaulters
│   │   ├── ExcelPage.jsx         # Drag & drop Excel hub with interactive preview
│   │   ├── ClosedClientsPage.jsx # Closed accounts archive
│   │   └── SettingsPage.jsx      # 1-click finance.db backup & preferences
│   └── context/
│       ├── LanguageContext.jsx   # Bilingual engine (Tamil / English)
│       └── ThemeContext.jsx      # 4-way theme engine with time-of-day detection
└── test/
    ├── phase0.test.js
    ├── phase1.test.js
    ├── phase2.test.js
    ├── phase3.test.js
    ├── phase4.test.js
    ├── phase5.test.js
    ├── phase6.test.js            # Phase 6 Excel engine & WhatsApp tests
    └── core_features_integration.test.js
```
# Finance-tracker
