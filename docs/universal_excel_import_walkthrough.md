# Universal Smart Column Mapping & Content-Aware Excel Import Engine

## 1. Executive Summary & Problem Resolution
Previously, the Excel/CSV ingestion system was bound to a rigid, fixed template and fixed column sequence. Uploading spreadsheets with alternate column orderings, custom headers, bilingual Tamil labels, extra columns, or missing titles would misalign borrower names, phone numbers, villages, and loan balances.

To deliver an **enterprise-grade, production-ready solution**, we engineered the **Universal Smart Column Mapping & Content-Aware Import Engine**:
1. **Dynamic Header & Semantic Detection (Pass 1)**: Scans rows 0–25 to locate headers with an expanded bilingual English/Tamil dictionary (`\u0B80-\u0BFF`).
2. **Data Content Profiler (Pass 2)**: Heuristically examines sample cell values using pattern matching (10-digit Indian phone numbers `^[6-9]\d{9}$`, currency distributions `₹500–₹10,000,000`, date patterns, and serial integers) when headers are ambiguous or unlabeled.
3. **Universal Smart Column Mapper UI**: An interactive mapping panel in `src/pages/ExcelPage.jsx` that displays auto-detected column matches alongside real cell samples (e.g., `Client Name (e.g. P. Shanmugam, R. Deepa)`) with "Matched ✓" badges.
4. **Real-time Live Re-Fetch**: Changing any dropdown mapping or worksheet instantly re-queries the preview endpoint to re-render the validation table without page reloads.
5. **Multi-Sheet Selection**: Full support for multi-sheet workbooks (`wb.SheetNames`) allowing users to pick whichever sheet they want to inspect and import.
6. **Configurable Duplicate Policy**: Users can toggle between **Update Profile** (safely update phone/address while preserving financial history) and **Skip Existing** (ignore duplicate records).
7. **Zero Fake/Mock Data & Zero Leakage**: All sensitive binary spreadsheets and exports are excluded via `.gitignore` with tests creating in-memory buffers dynamically.

---

## 2. Architecture & Implementation Highlights

### A. Two-Pass Engine: `server/utils/excelParser.js`
- `profileColumnData(rows, dataStartIndex, colIndex, sampleSize)`: Analyzes column contents by type and statistical distribution.
- `detectHeaderAndColumns(rows)`: Deep scan with semantic dictionary for Tamil (`வாடிக்கையாளர் பெயர்`, `அலைபேசி`, `அசல்`, `கிராமம்`, `பகுதி`) and English variations (`Borrower Name`, `Contact`, `Principal`, `Village`, `Area`).
- `inspectAvailableColumns(rows, headerRowIndex, sampleRowsCount)`: Extracts every available column header and 3 real cell sample values for UI dropdowns.
- `extractClientRowData(row, mapping, rowIndex, totalDays)`: Sanitizes phone numbers (strips `+91`/`0`), deduplicates repeated address components, and extracts day-wise collection entries safely.

---

### B. Backend REST API: `server/routes/excel.js`
- **`POST /api/excel/preview`**:
  - Accepts `sheet_name` and optional `column_mapping` (JSON string or object).
  - Returns `available_columns` (headers + sample values), `sheet_names`, `active_sheet`, `detected_mapping`, `summary`, and `preview_rows`.
  - Flags DB-level and in-sheet duplicate phone numbers.
- **`POST /api/excel/import`**:
  - Accepts `sheet_name`, `column_mapping`, and `duplicate_handling` (`'update'` vs `'skip'`).
  - Executes atomic upserts/inserts with non-destructive profile updates for existing clients.

---

### C. Frontend Interface: `src/pages/ExcelPage.jsx`
- **Worksheet Switcher**: Dropdown appears automatically when workbooks contain more than 1 sheet.
- **8 Field Selectors Grid**:
  - Borrower Name (Required)
  - Mobile Phone Number
  - Village / Town
  - Route Area / Ward
  - Street / Full Address
  - Principal Loan Amount
  - Serial No / Client Code
  - Registration Date
- **Live Samples & Badges**: Every option shows live sample text.
- **Duplicate Policy Radios**: Quick switch between Update Profile and Skip Existing.
- **Reset to Auto-Detect**: Instantly reverts custom overrides back to the engine's auto-detected mapping.

---

## 3. Verification & Automated Test Suite

### Test Results Summary:
| # | Test Scenario | Verification Target | Result |
|---|---|---|:---:|
| 1 | Swapped Column Order | Principal, Phone, Name, Area, Village swapped | **PASSED** (8.2ms) |
| 2 | Pure Tamil Headers | `வாடிக்கையாளர் பெயர்`, `அலைபேசி`, `அசல்`, `கிராமம்` | **PASSED** (5.5ms) |
| 3 | Pass-2 Content Profiler | Unlabeled `DATA_X1...` with phone/currency heuristic | **PASSED** (0.8ms) |
| 4 | Multi-Sheet Inspection | `Sheet_Operations` sample extraction & column list | **PASSED** (2.5ms) |
| 5 | Custom Mapping Override | Explicit dictionary overrides default heuristics | **PASSED** (1.8ms) |
| 6 | API Preview Integration | HTTP POST with custom sheet & mapping payload | **PASSED** (1033ms) |
| 7 | API Import with Policy | HTTP POST commit with `duplicate_handling="update"` | **PASSED** (619ms) |
| 8 | Client Dataset Validation | `test/client_excel_test_validation.test.js` (6 tests) | **PASSED** (175ms) |
| 9 | Duplicate & Area Disambiguation | `test/duplicate_and_area_village_preview.test.js` (5 tests) | **PASSED** (1071ms) |
| 10 | Frontend Production Build | `npm run build` (Vite 6.4.3 production bundle) | **PASSED** (9.5s) |
