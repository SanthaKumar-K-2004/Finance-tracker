# 📋 Daily Collection Manager — Final Implementation Plan
## All Decisions Locked & Ready to Build

> **All requirements gathered through deep-dive interview.**  
> **Zero AI API costs. Zero external database costs. Runs locally with one command.**

---

## ✅ Decision Summary (All Confirmed)

| # | Decision | Your Choice |
|---|----------|-------------|
| 1 | **UI Style** | **Both views** — Excel 31-day grid for desktop + Card view for mobile |
| 2 | **Client Closing** | Manual: Row turns GREEN → Owner clicks Close → Client archived → Full history preserved in "Closed Clients" section |
| 3 | **Month Rollover** | "Next Month" button → Preview showing who moves, who's closed → Confirm → Auto-generate new month with remaining as new principal |
| 4 | **Daily Totals Display** | Per-day column totals at top (Day 1: ₹2,500...) + Grand total row (Principal, Collected, Remaining, Excess) — exact Excel Row 2 replica |
| 5 | **Excel Import/Export** | Download pre-formatted .xlsx template with formulas → Fill offline → Upload back → Auto-parse & import |
| 6 | **Authentication** | No login for now — single-user mode, add auth later |
| 7 | **Receipts** | WhatsApp receipt (wa.me deep link, zero cost) + Printable receipt (especially for new client onboarding) |
| 8 | **Default Language** | Tamil (தமிழ்) default with English toggle |
| 9 | **Color Theme** | Auto-switch: Light mode (6AM-6PM) + Dark mode (6PM-6AM) + Manual toggle always available |
| 10 | **Tech Stack** | React + Vite frontend, Node.js/Express backend, built-in `node:sqlite` database |

---

## ✅ All Features Confirmed

### Core Features (Exact Excel Replacement)
- [x] **Client CRUD** — Add, Edit, Delete clients (Sl.No, Name, Phone, Address, Principal Amount)
- [x] **31-Day Collection Grid** — Interactive spreadsheet-style grid with day 1-31 columns
- [x] **Live Calculations** — Total = SUM(Day1:Day31), Remaining = Principal - Total, Excess = Total - Principal
- [x] **Per-Day Column Totals** — Day 1 total across all clients, Day 2 total... shown at top
- [x] **Grand Summary Row** — Total Principal, Total Collected, Total Remaining, Total Excess (like Excel Row 2)
- [x] **Month Selector** — Switch between months (May 2026, June 2026, July 2026...)

### Closing & Rollover
- [x] **Close/Clear Client** — Green highlight → Close button → Archived with full history
- [x] **Closed Clients Archive** — Separate section to view all closed client history anytime
- [x] **Next Month Rollover** — Preview → Confirm → New month auto-generated
- [x] **Remaining → New Principal** — Remaining balance automatically becomes next month's principal
- [x] **Closed clients excluded** — Cleared clients do NOT appear in next month

### Receipts & Communication
- [x] **WhatsApp Receipt** — 1-tap wa.me deep link with Tamil/English receipt message (zero cost)
- [x] **Printable Receipt** — Browser print-ready receipt for new clients and daily collections
- [x] **Tamil Receipt Template** — வசூல் ரசீது with client name, amount, remaining, date
- [x] **English Receipt Template** — Collection Receipt with all details

### Hidden Treasure Features
- [x] **Dark Mode / Night Mode** — Auto-switch (Light 6AM-6PM, Dark 6PM-6AM) + manual toggle
- [x] **Search & Filter** — By name, phone, area, status (paid/pending/closed)
- [x] **Bulk Entry Mode** — Enter same amount for multiple clients at once
- [x] **Dashboard Charts** — Visual bar/pie charts for collection progress, defaulters
- [x] **Backup & Restore** — 1-click database backup download, restore from file
- [x] **Duplicate Detection** — Warn if same phone/name already exists
- [x] **Payment Mode Tracking** — Cash, GPay, UPI, Bank Transfer per entry
- [x] **Auto Daily Amount** — Principal ÷ 31 = expected daily (₹10,000 ÷ 31 = ₹323/day)

### Excel Import/Export
- [x] **Download Template** — Pre-formatted .xlsx with headers, formulas, formatting
- [x] **Upload & Import** — Parse uploaded Excel, import clients + daily entries
- [x] **Export Current Data** — Download current month as .xlsx matching original format

### Bilingual (Tamil & English)
- [x] **Tamil Default** — All labels, buttons, headers in Tamil
- [x] **English Toggle** — 1-click switch to English
- [x] **Receipt Language** — Receipts generated in selected language

---

## 🏗️ Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                       │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │   Desktop View      │    │   Mobile View           │  │
│  │   (Excel Grid)      │    │   (Card List)           │  │
│  │   31-day columns    │    │   Tap-to-collect        │  │
│  │   Live totals       │    │   Quick chips           │  │
│  │   Color-coded cells │    │   WhatsApp share        │  │
│  └────────┬────────────┘    └────────┬────────────────┘  │
│           │         React + Vite      │                   │
│           └────────────┬──────────────┘                   │
│                        │ REST API calls                   │
└────────────────────────┼─────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────┐
│              Node.js + Express Server                     │
│                        │                                  │
│  ┌─────────────────────┴─────────────────────────┐       │
│  │              REST API Routes                    │       │
│  │  /api/clients     → CRUD operations            │       │
│  │  /api/months      → Month management           │       │
│  │  /api/collections → Daily entry recording      │       │
│  │  /api/rollover    → Month-end rollover engine  │       │
│  │  /api/reports     → Dashboard & chart data     │       │
│  │  /api/backup      → Backup/restore database    │       │
│  │  /api/excel       → Import/export Excel files  │       │
│  └─────────────────────┬─────────────────────────┘       │
│                        │                                  │
│  ┌─────────────────────┴─────────────────────────┐       │
│  │      node:sqlite / Turso (Edge Cloud SQLite)   │       │
│  │  • companies, clients, loan_cycles              │       │
│  │  • daily_collections, closed_clients            │       │
│  │  • whatsapp_logs, settings, settlements         │       │
│  │  • ACID compliant, zero external dependency     │       │
│  └────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

---

## 📂 Project File Structure

```
FINACE PROJECT/
├── package.json
├── vite.config.js
├── index.html                    # Entry point
├── server/
│   ├── index.js                  # Express server + API routes
│   ├── db.js                     # SQLite database setup & migrations
│   ├── routes/
│   │   ├── clients.js            # Client CRUD endpoints
│   │   ├── collections.js        # Daily collection entry endpoints
│   │   ├── months.js             # Month management & rollover
│   │   ├── reports.js            # Dashboard & chart data
│   │   ├── backup.js             # Backup/restore endpoints
│   │   └── excel.js              # Excel import/export endpoints
│   └── utils/
│       ├── receipt.js            # WhatsApp & print receipt generators
│       └── rollover.js           # Month-end rollover calculation engine
├── src/
│   ├── main.jsx                  # React entry
│   ├── App.jsx                   # Main app with routing
│   ├── index.css                 # Design system (dark/light themes, Tamil fonts)
│   ├── i18n/
│   │   ├── ta.json               # Tamil translations
│   │   └── en.json               # English translations
│   ├── components/
│   │   ├── Layout.jsx            # App shell with header, nav, theme toggle
│   │   ├── LedgerGrid.jsx        # 31-day Excel-style grid (desktop)
│   │   ├── ClientCard.jsx        # Client card component (mobile)
│   │   ├── CollectionModal.jsx   # Quick payment entry bottom sheet
│   │   ├── ClientForm.jsx        # Add/Edit client form
│   │   ├── RolloverWizard.jsx    # Month-end rollover preview & confirm
│   │   ├── ReceiptPreview.jsx    # WhatsApp & print receipt display
│   │   ├── SearchFilter.jsx      # Search & filter bar
│   │   ├── BulkEntry.jsx         # Bulk amount entry for multiple clients
│   │   ├── Charts.jsx            # Dashboard pie/bar charts
│   │   └── ThemeToggle.jsx       # Dark/Light/Auto theme switcher
│   └── pages/
│       ├── Dashboard.jsx         # KPI summary + charts
│       ├── Collection.jsx        # Main collection view (grid or cards)
│       ├── Clients.jsx           # Client management CRUD
│       ├── ClosedClients.jsx     # Archived closed client history
│       ├── Reports.jsx           # Reports & export
│       ├── Settings.jsx          # Language, theme, backup/restore
│       └── ExcelImport.jsx       # Excel upload/download page
└── data/
    └── finance.db                # SQLite database file (auto-created)
```

---

## 🔧 Build Phases

### Phase 1: Foundation (Server + Database + Design System)
1. Create `package.json` and install dependencies
2. Setup Express server with `node:sqlite` database
3. Create full database schema (clients, months, daily_collections, closed_clients)
4. Setup Vite + React with CSS design system (dark/light themes, Tamil fonts)
5. Seed database with real ALR Excel data (Client 3032, May 2026)

### Phase 2: Core Collection Register (The Excel Killer)
1. Build 31-day interactive ledger grid (desktop view)
2. Build client card list (mobile view)
3. Implement live calculation engine (Total, Remaining, Excess)
4. Per-day column totals + Grand summary row
5. Client CRUD (Add, Edit, Delete with duplicate detection)
6. Search & filter functionality

### Phase 3: Closing, Rollover & History
1. Green highlight + Close button for completed clients
2. Closed Clients archive page with full history
3. "Next Month" rollover wizard (preview → confirm → generate)
4. Remaining → new principal auto-calculation

### Phase 4: Receipts, Excel, & Hidden Treasures
1. WhatsApp receipt generator (Tamil + English)
2. Printable receipt layout
3. Excel template download with formulas
4. Excel upload & import parser
5. Bulk entry mode
6. Payment mode tracking (Cash, GPay, UPI, Bank)
7. Dashboard charts (collection progress, defaulters)
8. Backup & restore (1-click database download/upload)
9. Auto daily amount calculator

### Phase 5: Polish & Bilingual
1. Tamil translations for all UI labels
2. Language toggle (Tamil ↔ English)
3. Auto theme switching (Light 6AM-6PM, Dark 6PM-6AM)
4. Responsive polish for all screen sizes
5. Final testing with real ALR data

---

## 🎨 Design System

### Color Palette
```
Light Mode (6AM-6PM):
  --bg-primary:    #F8FAFC     (Cool white)
  --bg-card:       #FFFFFF     (Pure white cards)
  --text-primary:  #0F172A     (Deep navy text)
  --accent:        #059669     (Emerald green - collection)
  --danger:        #DC2626     (Red - pending/missed)
  --warning:       #D97706     (Amber - partial)
  --success:       #16A34A     (Green - paid/closed)

Dark Mode (6PM-6AM):
  --bg-primary:    #0F172A     (Deep navy)
  --bg-card:       #1E293B     (Slate card)
  --text-primary:  #F1F5F9     (Light text)
  --accent:        #F59E0B     (Gold amber accent)
  --danger:        #EF4444     (Bright red)
  --warning:       #FBBF24     (Yellow)
  --success:       #34D399     (Emerald)
```

### Typography
```
Tamil: 'Noto Sans Tamil', sans-serif  (Google Fonts, free)
English: 'Inter', sans-serif          (Google Fonts, free)
Numbers: 'JetBrains Mono', monospace  (For financial figures)
```

---

> [!IMPORTANT]
> **Zero recurring costs**: No AI API keys, no cloud database, no SMS gateway.
> WhatsApp uses free `wa.me` deep links. Database is local SQLite file.
> Total running cost = hosting only (or ₹0 if running locally).
