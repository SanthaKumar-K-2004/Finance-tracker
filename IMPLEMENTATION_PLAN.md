# 🏛️ Comprehensive Implementation Plan: Daily Collection Finance Manager
## (தினசரி வசூல் மற்றும் கடன் மேலாண்மை மென்பொருள்)

A complete, zero-recurring-cost, multi-tenant web application designed to digitize the manual Excel and paper-based daily microfinance ledger (ALR Daily Collection Register) used across Tamil Nadu finance shops.

---

## 📌 Background & Operational Reality

Small-scale finance operators (Daily collection, Pigmy deposit, Thandal, 100-day microfinance) operate under tough real-world conditions:
- **Field Agents**: Collect daily installments outdoors under bright sunlight on budget Android smartphones. They need a 2-tap collection entry with big 48px touch targets, quick amount chips (`₹100`, `₹200`, `₹500`), and instant WhatsApp receipt dispatch.
- **Shop Owners**: Sit at an office desk in the evening to review daily collections, reconcile cash collected by agents, calculate month-end rollover balances, and archive closed loans.
- **The Golden Reference**: The existing Excel sheet `Daily_Collection_Register__ALR_-6.xlsx` contains a 31-day grid with live formulas (`SUM(Day1:Day31)`, `Remaining = Principal - Total`). Any digital replacement must match or exceed this speed and clarity without introducing recurring API or database bills.

---

## 🛡️ Strategic Architectural Decisions

> [!IMPORTANT]
> **Zero Recurring Cost Stack**:
> 1. **Database**: Built-in Node.js 26 `node:sqlite` + Turso Cloud SQLite (`@libsql/client`) with Mumbai AWS Edge hosting (<25ms latency).
> 2. **WhatsApp Receipts**: Zero-cost `wa.me` deep links (triggers WhatsApp on agent's phone with pre-filled Tamil/English receipt). WhatsApp Business Cloud API can be connected later as an optional add-on.
> 3. **Excel Compatibility**: 100% template alignment with `Daily_Collection_Register__ALR_-6.xlsx`.

> [!TIP]
> **🚀 Ultra-Speed & Multi-User Architecture**:
> - **Zero-Latency Optimistic UI**: Instant 0ms table/card updates before server round-trips.
> - **Concurrent Multi-Agent Protection**: Database-level `UNIQUE(cycle_id, day_number)` and atomic `UPSERT` ensures zero data collisions when multiple field agents collect at the exact same second.
> - **Dual-Mode SQLite / Turso Engine**: Instant local file reads with background cloud replication.
> - **Virtualized Rendering**: Handles 1,000+ borrowers with smooth 60fps scrolling without DOM choking.

> [!NOTE]
> **💎 Built-in "Hidden Treasure" Features**:
> 1. **Live Cash Denomination Calculator**: ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 counter for fast evening cash handover between Owner & Agent.
> 2. **Agent Daily Settlement Voucher**: 1-tap reconcile and lock cash collected by each agent.
> 3. **Live Collection Activity Ticker**: Real-time notification of recent collections made in the field.
> 4. **Defaulter Risk Radar (3-Day Inactive Alert)**: Flags borrowers who missed 3+ consecutive collection days for urgent priority recovery.
> 5. **Quick-Dial Action**: 1-tap call borrower directly from mobile card during collection rounds.

---

## 🏛️ System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                         │
│                                                                        │
│   ┌──────────────────────────────────┐  ┌───────────────────────────┐  │
│   │     Desktop View (Owner)         │  │    Mobile View (Agent)    │  │
│   │  • 31-Day Sticky Ledger Grid     │  │  • Fast Touch Cards       │  │
│   │  • Freeze Panes (Name/Principal) │  │  • Quick Amount Chips     │  │
│   │  • Day Column Totals             │  │  • 1-Tap WhatsApp Receipt │  │
│   │  • Grand Summary Row (Row 2)     │  │  • Sunlight High Contrast │  │
│   └─────────────────┬────────────────┘  └─────────────┬─────────────┘  │
│                     │                                 │                │
│                     └───────────────┬─────────────────┘                │
│                                     │                                  │
│             State Management & Bilingual Engine (Tamil / English)      │
│             Design System (Emerald & Slate, Auto Light/Dark Mode)      │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ REST API Calls (JSON & Multipart)
┌─────────────────────────────────────┼──────────────────────────────────┐
│                      BACKEND (Node.js + Express)                       │
│                                     │                                  │
│   ┌─────────────────────────────────┴───────────────────────────────┐  │
│   │                       REST API Routers                          │  │
│   │   /api/clients      → Client profile CRUD                       │  │
│   │   /api/months       → Cycle selector & active month state       │  │
│   │   /api/collections  → Daily installment entries & batch updates │  │
│   │   /api/rollover     → Automated month-end rollover engine       │  │
│   │   /api/reports      → Dashboard KPIs, defaulters & charts       │  │
│   │   /api/excel        → Import & Export (.xlsx matching ALR)      │  │
│   │   /api/backup       → Database snapshot download & restore      │  │
│   └─────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│   ┌─────────────────────────────────┴───────────────────────────────┐  │
│   │             Database Engine: Node.js 26 `node:sqlite`           │  │
│   │             File: /data/finance.db (WAL Mode Enabled)           │  │
│   │   • companies        • clients              • loan_cycles       │  │
│   │   • daily_collections • closed_clients       • settings         │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Specification

```sql
-- 1. Companies (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    phone TEXT,
    address TEXT,
    default_language TEXT DEFAULT 'ta',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients (Borrowers)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    sl_no INTEGER,
    client_code TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'defaulter'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- 3. Loan Cycles (Monthly / Multi-Day Loan Terms)
CREATE TABLE IF NOT EXISTS loan_cycles (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    month_year TEXT NOT NULL,        -- e.g. '2026-05'
    cycle_name TEXT NOT NULL,        -- e.g. 'May 2026'
    principal REAL NOT NULL,         -- அசல் தொகை
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER DEFAULT 31,
    status TEXT DEFAULT 'active',    -- 'active', 'closed', 'rolled_over'
    close_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 4. Daily Collections (Individual Daily Installment Payments)
CREATE TABLE IF NOT EXISTS daily_collections (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,     -- 1 to 31
    collection_date DATE NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_mode TEXT DEFAULT 'cash',-- 'cash', 'gpay', 'upi', 'bank'
    collected_by TEXT DEFAULT 'Agent',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_id, day_number),
    FOREIGN KEY (cycle_id) REFERENCES loan_cycles(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 5. Closed Clients Archive (Permanent Historical Records)
CREATE TABLE IF NOT EXISTS closed_clients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    final_principal REAL NOT NULL,
    total_collected REAL NOT NULL,
    excess_amount REAL DEFAULT 0,
    closed_date DATE NOT NULL,
    closure_reason TEXT DEFAULT 'completed', -- 'completed', 'settled', 'written_off'
    snapshot_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Settings (Shop Profile, Late Fee Rules, Theme Preferences)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(company_id, key)
);
```

---

## 🗂️ Proposed File & Folder Structure

```
FINACE PROJECT/
├── package.json                          # Unified scripts (concurrently run server + vite)
├── vite.config.js                        # Vite config with proxy to Express (:5000)
├── index.html                            # Frontend entry point with Google Fonts
├── .agents/
│   ├── mcp_config.json                   # Antigravity SQLite MCP config
│   ├── rules/
│   │   └── senior-architect-persona.md   # Persona rules
│   └── skills/
│       └── daily-finance-auditor/
│           └── SKILL.md                  # Microfinance audit & math rules
├── server/
│   ├── index.js                          # Express app entry & middleware
│   ├── db.js                             # node:sqlite connection & schema init
│   ├── seed.js                           # Real ALR data seeder
│   ├── routes/
│   │   ├── clients.js                    # CRUD & duplicate check
│   │   ├── collections.js                # Daily collection entry & batch updates
│   │   ├── months.js                     # Month cycle navigation
│   │   ├── rollover.js                   # Month-end rollover calculation engine
│   │   ├── reports.js                    # Dashboard KPIs & analytics
│   │   ├── excel.js                      # Import/export ALR Excel files
│   │   └── backup.js                     # 1-click database backup & restore
│   └── utils/
│       ├── receipt.js                    # WhatsApp wa.me & print receipt generator
│       └── rolloverEngine.js             # Mathematical rollover logic
├── src/
│   ├── main.jsx                          # React application root
│   ├── App.jsx                           # Router & navigation layout
│   ├── index.css                         # CSS design system (tokens, glassmorphism, responsive)
│   ├── context/
│   │   ├── LanguageContext.jsx           # Tamil / English language state
│   │   └── ThemeContext.jsx              # Auto (6AM-6PM) & manual dark/light mode
│   ├── i18n/
│   │   ├── ta.json                       # Tamil vocabulary (அசல், வசூல், நிலுவை)
│   │   └── en.json                       # English vocabulary
│   ├── components/
│   │   ├── Layout.jsx                    # Header, navigation & active month status
│   │   ├── LedgerGrid.jsx                # Desktop 31-day spreadsheet with freeze panes
│   │   ├── ClientCard.jsx                # Mobile agent card with quick-action buttons
│   │   ├── CollectionModal.jsx           # Fast touch collection entry sheet
│   │   ├── RolloverWizard.jsx            # Month-end rollover preview & confirmation
│   │   ├── ClientFormModal.jsx           # Add/Edit client with validation
│   │   ├── ReceiptModal.jsx              # WhatsApp share & thermal print layout
│   │   ├── SearchFilter.jsx              # Quick search by name, phone, area
│   │   └── SummaryHeader.jsx             # Row 2 replica (Principal, Collected, Remaining)
│   └── pages/
│       ├── Dashboard.jsx                 # KPI overview, today's collection, charts
│       ├── CollectionPage.jsx            # Main collection interface (Grid / Card toggle)
│       ├── ClientsPage.jsx               # Borrower directory & loan history
│       ├── ClosedClientsPage.jsx         # Permanent archive of cleared loans
│       ├── ReportsPage.jsx               # Defaulter list, payment mode breakdown
│       ├── ExcelPage.jsx                 # Download template & upload register
│       └── SettingsPage.jsx              # Shop branding, backup download & theme
└── data/
    └── finance.db                        # SQLite database file (auto-created)
```

---

## 🚀 Step-by-Step Implementation Phases

### 🔹 Phase 1: Project Setup & Backend Architecture
1. **Initialize `package.json`**:
   - Install backend: `express`, `cors`, `multer`, `xlsx`.
   - Install frontend: `react`, `react-dom`, `react-router-dom`, `lucide-react`, `recharts`.
   - Install dev tools: `vite`, `@vitejs/plugin-react`, `concurrently`.
2. **Database Engine (`server/db.js`)**:
   - Initialize SQLite via Node.js 26 native `node:sqlite`.
   - Configure WAL mode for high-concurrency read/write operations.
   - Run DDL scripts to create all 6 core tables with indexes.
3. **Data Seeder (`server/seed.js`)**:
   - Extract records from `Daily_Collection_Register__ALR_-6.xlsx`.
   - Seed company profile, clients, May 2026 cycle, and initial daily collection numbers.
4. **Core REST API Routes**:
   - `/api/clients`, `/api/months`, `/api/collections`, `/api/reports`.

---

### 🔹 Phase 2: Antigravity MCP & Custom Skills Integration
1. **MCP Configuration (`.agents/mcp_config.json`)**:
   - Attach `mcp-server-sqlite` to `/data/finance.db` using `uvx`.
   - Enables live query execution and schema audits by AI.
2. **Finance Auditor Skill (`.agents/skills/daily-finance-auditor/SKILL.md`)**:
   - Document business formulas, 100-day cycles, and ALR template mapping.

---

### 🔹 Phase 3: Modern Design System & Bilingual Framework
1. **Design System (`src/index.css`)**:
   - Curated HSL color palette: Emerald Green (`#059669`), Deep Navy Slate (`#0F172A`), Warm Amber (`#F59E0B`), Crisp Pure White (`#FFFFFF`).
   - High-contrast sunlight readability mode for mobile outdoor collection.
   - Glassmorphism cards with smooth hover micro-animations.
   - Google Fonts typography: `Noto Sans Tamil` + `Inter` + `JetBrains Mono` for currency.
2. **Bilingual Engine (`src/context/LanguageContext.jsx`)**:
   - Full dictionary for Tamil (`ta.json`) and English (`en.json`).
   - Instant header toggle button with local storage persistence.
3. **Theme Engine (`src/context/ThemeContext.jsx`)**:
   - Automatic time-aware switching (Light 6AM-6PM, Dark 6PM-6AM).
   - Instant manual toggle (Light / Dark / Auto).

---

### 🔹 Phase 4: The 31-Day Ledger Register & Mobile Field Cards
1. **Desktop 31-Day Spreadsheet (`src/components/LedgerGrid.jsx`)**:
   - Left frozen columns: Sl.No, Client Name, Phone, Principal Amount.
   - Middle scrollable columns: Days 1 through 31.
   - Inline cell editing: Click to edit, Enter/Tab to navigate, auto-save on blur.
   - Right frozen columns: Total Collected, Remaining Balance, Excess, Actions.
   - Top daily totals: Sum of all client collections for Day 1, Day 2... Day 31.
   - Grand Summary Row: Total Principal, Total Collected, Total Remaining, Total Excess.
2. **Mobile Agent Collection View (`src/components/ClientCard.jsx`)**:
   - Fast card list with search and route filtering.
   - Quick-pay chips (`₹100`, `₹200`, `₹500`, `Custom`).
   - Quick-collection bottom sheet modal (`CollectionModal.jsx`).
   - 1-tap WhatsApp receipt generator.

---

### 🔹 Phase 5: Month-End Rollover Engine & Client Archival
1. **Automated Rollover Engine (`server/routes/rollover.js`)**:
   - Mathematical audit:
     $$\text{Remaining} = \max(0, \text{Principal} - \text{Total Collected})$$
   - Identifies fully paid loans (`Remaining == 0`) and flags row with emerald highlight.
   - Closes completed clients into `closed_clients` with a full JSON snapshot of history.
   - Copies unpaid balances as new starting principal for the next month:
     $$\text{Next Month Principal} = \text{Remaining Balance}$$
2. **Rollover Wizard (`src/components/RolloverWizard.jsx`)**:
   - 3-step interactive modal:
     - Step 1: Review completed clients to archive.
     - Step 2: Preview next month's active borrowers and new principals.
     - Step 3: 1-click confirmation to generate next month's register.
3. **Closed Clients Archive (`src/pages/ClosedClientsPage.jsx`)**:
   - Dedicated searchable audit page showing all historical completed loans.

---

### 🔹 Phase 6: Excel Template Engine, WhatsApp Receipts & Verification
1. **Excel Engine (`server/routes/excel.js`)**:
   - **Download/Export**: Generates `.xlsx` file replicating `Daily_Collection_Register__ALR_-6.xlsx` with merged headers, bold styling, and formulas (`=SUM(G4:AK4)`, `=IF(...)`).
   - **Upload/Import**: Drag-and-drop user `.xlsx`, validates columns, flags duplicate phone numbers, displays interactive preview, and commits to database.
2. **WhatsApp & Print Receipts (`server/utils/receipt.js`)**:
   - Zero-cost `wa.me` URL generator:
     - Tamil: `வணக்கம் [பெயர்], [தேதி] வசூல் தொகை: ₹[தொகை]. மீதமுள்ள நிலுவை: ₹[நிலுவை]. நன்றி, [கடை பெயர்].`
     - English: `Dear [Name], Collection received on [Date]: ₹[Amount]. Remaining balance: ₹[Balance]. Thank you, [Shop Name].`
   - Print CSS stylesheet for 58mm / 80mm Bluetooth thermal POS receipt printers.
3. **Database Backup & Restore (`server/routes/backup.js`)**:
   - 1-click download of `finance.db` snapshot.
   - 1-click restore from a backup file.
4. **End-to-End Verification**:
   - Automated API and database verification scripts.
   - Browser subagent inspection of desktop grid, mobile cards, receipt dialogs, and Excel import/export.

---

## 🧪 Comprehensive Verification Plan

### 1. Automated Backend & Database Tests
```bash
# 1. Test database schema & WAL mode
node server/seed.js
node -e "const db = require('./server/db'); console.log('Tables created:', db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all());"

# 2. Verify REST endpoints
curl -s http://localhost:5000/api/months
curl -s http://localhost:5000/api/clients
curl -s http://localhost:5000/api/reports/summary?month=2026-05

# 3. Test Excel export generation
curl -s -o test_export.xlsx http://localhost:5000/api/excel/export?month=2026-05
node -e "const xlsx = require('xlsx'); const wb = xlsx.readFile('test_export.xlsx'); console.log('Sheets:', wb.SheetNames);"
```

### 2. Manual & Visual Browser Verification
1. **Desktop Grid Verification**: Open `http://localhost:5173/`, verify sticky header and left name column freezing while scrolling horizontally through 31 days. Enter a payment in Day 10; verify Total and Remaining update instantly.
2. **Mobile Field Test**: Resize viewport to 390px mobile view; verify touch cards render with large buttons and quick amount chips.
3. **WhatsApp Deep Link Test**: Click WhatsApp icon on a payment; verify the generated `https://wa.me/...` URL encodes Tamil text properly without syntax corruptions.
4. **Month-End Rollover Test**: Run the rollover wizard from May 2026 to June 2026; verify completed client 3032 is moved to Closed Clients archive, and pending borrowers are carried forward with correct new principal.
5. **Excel Round-Trip Test**: Export May 2026 as `.xlsx`, verify formatting in Excel viewer, then upload the template back via the Excel page and verify preview accuracy.
