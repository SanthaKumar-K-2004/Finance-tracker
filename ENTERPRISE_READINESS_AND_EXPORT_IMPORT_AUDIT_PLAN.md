# Implementation Plan: Enterprise-Grade Production Readiness & Export/Import Overhaul

## Goal Description
Conduct an exhaustive, deep architectural audit of the ALR Daily Collection Register system, resolving all discovered disconnects, misleading conditions, and UI/UX issues. Transform the Export & Import experience into an ultra-clean, premium, enterprise-grade tool with:
1. **Dropdown UI/UX & Functional Fixes**: Stable `<select>` DOM lifecycle (eliminating premature closure/jumping), complete synchronized sorting (including Principal Amount), 40px+ touch targets, and full WCAG 2.1 AA accessibility bindings.
2. **Export Data PDF Precision**: Flawless tabular column and header alignment, guaranteed uniform row heights in 31-day detailed landscape mode (eliminating unsightly line breaks in day numbers), and bulletproof Unicode/Tamil character handling with zero corrupted glyphs.
3. **Import Section UI/UX Overhaul**: Replacing visual clutter with a modern 2-stage guided workflow (Template & Dropzone $\rightarrow$ Focused Ingestion Review Deck), automated phone collision detection, paginated preview table, and explicit accidental data loss safeguards.
4. **System Hardening & Quality Control**: Zero memory leaks via proper Blob URL revocation and AbortController cleanup, transactional batch imports, and automated multi-angle regression testing.

---

## User Review Required

> [!IMPORTANT]
> **No Overly Artificial "AI Clutter"**: In accordance with user requirements, the UI will remain strictly clean, functional, professional, and ergonomic. We avoid gratuitous animations, floating widgets, or decorative gradients, prioritizing clear data visibility, fast rendering, and predictable interactions.

> [!NOTE]
> **PDF Font Architecture**: Standard jsPDF vector documents use built-in Helvetica, which only supports standard WinAnsi Latin characters. Raw Tamil Unicode code points (`\u0B80-\u0BFF`) and the Rupee symbol `₹` (`\u20B9`) corrupt standard PDF rendering. We maintain an expanded phonetic transliteration engine that converts Tamil names and addresses into clean Latin syllables and formats currency as `Rs. X,XX,XXX`, ensuring crisp, sharp vector PDFs. For full native Tamil typography, the "Print / Save as PDF" option utilizes browser-native print rendering with Google Noto Sans Tamil fonts.

---

## Architecture Audit & Discovered Disconnects

```mermaid
flowchart TD
    subgraph Frontend [ExcelPage.jsx & Components]
        UI_Filter[Filter Controls: Status, Sl Range, Village, Search, Sort]
        UI_Preview[Live Export Preview Table]
        UI_Import[2-Stage Import & Verification Deck]
        PDF_Engine[pdfExport.js Landscape Vector Engine]
    end

    subgraph Backend [Node.js Express & Turso Cloud]
        API_Preview[/api/reports/export-preview]
        API_Excel[/api/excel/export-filtered]
        API_Import[/api/excel/import & /verify]
        Turso_DB[(Turso Cloud AWS Mumbai)]
    end

    UI_Filter -->|Debounced GET with AbortController| API_Preview
    API_Preview -->|Query Cycles & Daily Collections| Turso_DB
    API_Preview -->|Calculated Rows & Summary| UI_Preview
    UI_Preview -->|Download PDF| PDF_Engine
    UI_Preview -->|Download Excel| API_Excel
    UI_Import -->|Upload & Verify XLSX| API_Import
    API_Import -->|Transactional Batch Upsert| Turso_DB
```

### Discovered Issues & Disconnects

| # | Component | Discovered Issue / Bug | Impact | Proposed Resolution |
|---|---|---|---|---|
| 1 | `reports.js` & `excel.js` | `sortBy === 'principal'` was not handled in sorting switch statements | Sorting by Principal Amount silently defaulted to `sl_no` in both preview and Excel export | Add `if (sortBy === 'principal') return dir * (a.principal - b.principal);` in both routes |
| 2 | `ExcelPage.jsx` | `availableVillages` dynamically depended on `previewData.rows`, causing options to re-render while user is clicking | Native dropdowns closed or lost focus when preview fetch completed ("automatically click and go") | Decouple village options into a stable `monthVillages` state queried once on month change |
| 3 | `ExcelPage.jsx` | Missing `id` and `htmlFor` pairings on `<select>` and `<input>` elements | Orphaned inputs violating WCAG 2.1 AA accessibility guidelines | Add explicit `id` and `htmlFor` bindings across all filter fields and modal inputs |
| 4 | `pdfExport.js` | 31-day detailed landscape PDF table defaulted to `overflow: 'linebreak'`, wrapping 4-digit numbers (`1000` $\rightarrow$ `10` / `00`) | Distorted, uneven row heights and misaligned table columns across 31 days | Set `overflow: 'ellipsize'`, `fontSize: 5.8pt`, `cellPadding: 0.1mm`, and `minCellHeight: 4.8mm` |
| 5 | `pdfExport.js` | Totals row column 2 (Phone) displayed `${rows.length} Active` | Confusing text placed under telephone numbers | Display `'-'` in Phone column and summarize client count cleanly in column 1 |
| 6 | `pdfExport.js` | Unicode Rupee symbol `₹` (`\u20B9`) or unmapped Tamil diacritics caused glyph corruption in Helvetica | Garbled characters or question marks on PDF printouts | Expand `cleanPdfText` to replace `₹` with `Rs. `, normalize Unicode dashes, and extend transliteration dictionary |
| 7 | `ExcelPage.jsx` (Import Tab) | Upload dropzone remained visible taking vertical space even after file verification, pushing preview table down | Cluttered layout requiring excessive scrolling; lack of pagination | Implement clean 2-stage state: Stage 1 (Upload/Template) $\rightarrow$ Stage 2 (Review Deck with 10/25/50 row pagination) |
| 8 | `excel.js` | Ingestion batch of 50 statements executed without explicit transaction wrapper | Partial batch write failure could cause inconsistent database state | Wrap collection statements in an explicit transaction block and return detailed audit breakdown |
| 9 | `SettingsPage.jsx` & `ExcelPage.jsx` | Object URLs created via `URL.createObjectURL` were not systematically revoked | Browser memory leaks when exporting large datasets repeatedly | Add `URL.revokeObjectURL(url)` in `setTimeout` or `finally` blocks |

---

## Proposed Changes

### 1. Server Routing & Sorting Synchronization
#### [MODIFY] `server/routes/reports.js`
- In `/api/reports/export-preview`:
  - Add explicit sorting by `principal`:
    ```javascript
    if (sortBy === 'principal') return dir * (a.principal - b.principal);
    ```
  - Query all distinct route areas/villages for the month independent of active filters to provide a rock-solid options array.

#### [MODIFY] `server/routes/excel.js`
- In `/api/excel/export-filtered`:
  - Add explicit sorting by `principal`:
    ```javascript
    if (sortBy === 'principal') return dir * (a.principal - b.principal);
    ```
- In `/api/excel/import`:
  - Add transaction safety and comprehensive error reporting.

---

### 2. PDF Export Alignment & Formatting Overhaul
#### [MODIFY] `src/utils/pdfExport.js`
- **Expanded `cleanPdfText` Engine**:
  - Replace `\u20B9` with `'Rs. '`.
  - Replace Unicode em/en dashes (`\u2013`, `\u2014`) with `'-'`.
  - Expand `TAMIL_DICTIONARY` with common names and route areas.
  - Strip any remaining unprintable characters while preserving clean Latin syllables.
- **Header & Column Right-Alignment Synchronization**:
  - Ensure all numeric header cells (`Principal`, `Collected`, `Remaining`, `Excess`) have `{ content: '...', styles: { halign: 'right' } }` matching `colStyles`.
  - Center-align Status and Sl columns.
  - Set `valign: 'middle'` for uniform vertical centering across all cells.
- **31-Day Detailed Grid Formatting**:
  - Set `cellWidth: 36` for borrower name with clean truncation (`overflow: 'ellipsize'`).
  - Set `cellPadding: { top: 1.0, right: 0.1, bottom: 1.0, left: 0.1 }` and `fontSize: 5.8` for days 1–31.
  - Enforce `minCellHeight: 4.8` to guarantee strictly identical row heights throughout the entire document.
  - Use concise status badges (`OK` / `DUE`) in detailed mode to avoid column overflow.
- **Totals Row Cleanup**:
  - Clean up column 2 (Phone) to `'-'` and format Grand Totals text cleanly.

---

### 3. Dropdown UI/UX, Stability & Accessibility
#### [MODIFY] `src/pages/ExcelPage.jsx`
- **DOM Stability**:
  - Separate `monthVillages` fetching so it updates only when `selectedMonth` changes.
  - Prevent `<option>` recreation while the dropdown is open or focused.
- **Accessibility & Touch Targets**:
  - Add `id="filter-loan-status"`, `id="filter-village-area"`, `id="filter-sort-by"`, `id="filter-sort-order"`, `id="filter-from-sl"`, `id="filter-to-sl"`, `id="filter-search-query"`.
  - Bind all labels with `htmlFor` attributes.
  - Add descriptive `aria-label` tags on icon-only buttons (Reset Filters, Clear Village, Download).
  - Enforce minimum 40px touch targets for mobile/tablet ease of use.

#### [MODIFY] `src/index.css`
- Ensure `.form-select` and `select.input` have:
  - High-contrast SVG chevron arrow (`#475569` in light mode, `#94A3B8` in dark mode).
  - Smooth focus glow: `box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2)`.
  - Clean `padding-right: 36px` to ensure text never overlaps the chevron.

---

### 4. Import Section UI/UX Overhaul (Ultra-Clean, Clutter-Free)
#### [MODIFY] `src/pages/ExcelPage.jsx` (Tab 4)
- **2-Stage Clean Workflow**:
  - **Stage 1 (Initial State)**:
    - Side-by-side minimalist cards:
      - *Template Card*: Pre-formatted `.xlsx` download with formula chips (`31 Days Columns`, `Live =SUM & =IF`, `Zero Errors`) and download button.
      - *Dropzone Card*: Clean drag-and-drop container with file format chips (`.xlsx`, `.xls`, `.csv`) and browse button.
  - **Stage 2 (File Verified State)**:
    - Smoothly swap the dropzone for an **Ingestion Review Deck**:
      - Compact Header Pill: File name, file size, active month, and record counts.
      - 4 Executive Stat Cards: Total Rows, Valid Rows, Phone Warnings, Total Principal.
      - Accidental Data Loss Safeguard Banner: Explicitly stating that existing records will be updated without deleting prior collections.
      - Paginated Preview Table (10 / 25 / 50 rows per page) with search filter, borrower status chips, and expandable warnings.
      - Action Bar: "Cancel / Upload Another" (secondary) and "Confirm & Save into Database" (emerald primary).

---

### 5. Memory Leak Debugging & Cleanup
#### [MODIFY] `src/pages/SettingsPage.jsx` & `src/pages/ExcelPage.jsx`
- Ensure all created object URLs (`URL.createObjectURL(blob)`) are revoked using `URL.revokeObjectURL(url)` immediately after click or within a `setTimeout(..., 1000)` safety callback.
- Ensure all `setTimeout` timers have cleanup returns in `useEffect`.

---

## Verification Plan

### Automated Tests
1. **Regression & Fixes Suite**:
   ```bash
   node --test test/advanced_export_and_sl_range.test.js
   ```
2. **New Comprehensive Verification Test Suite** (`test/enterprise_readiness_audit.test.js`):
   - Test 1: Principal Amount sorting in `/api/reports/export-preview` (both `asc` and `desc`).
   - Test 2: Principal Amount sorting in `/api/excel/export-filtered`.
   - Test 3: PDF clean text transliteration covering special Unicode symbols, currency symbols, and Tamil names.
   - Test 4: PDF generation in detailed 31-day mode with 4-digit collections (`1000`, `2500`) without line break or cell wrapping.
   - Test 5: Import verification endpoint safety and duplicate phone warning detection.
   - Test 6: Memory safety and Blob URL lifecycle verification.
3. **Full Project Test Suite**:
   ```bash
   npm test
   ```
4. **Production Build Validation**:
   ```bash
   npm run build
   ```

### Manual Verification
1. **Dropdown Behavior**: Open `http://localhost:5173/excel`, click through Loan Status, Village Area, and Sort dropdowns. Confirm dropdowns stay open until an option is picked, options do not jump or flicker, and sorting by Principal works seamlessly.
2. **PDF Vector Quality**: Click "Export Color PDF" in both Summary Mode and Detailed 31-Day Mode. Open the generated PDFs and verify:
   - Currency numbers are right-aligned under header titles.
   - 31-day grid has uniform row heights with zero broken/wrapped numbers.
   - All Tamil names and route areas display clean, legible English transliterations.
3. **Import Section Flow**: Click Tab 4 "Import Register & Blank Template". Verify the clean 2-stage layout, drop an Excel file, verify the KPI cards and paginated preview table, and check that no messy AI fluff or clutter exists.
