# Implementation Plan: Complete Removal of 'கடன்', Clean S.No Formatting, Calendar Date-Sheet Synchronization, and Mock ₹323 Elimination

Eliminate every mention of "கடன்" (kadan) across the entire application, remove "#" prepended to serial numbers, connect sheet dates and calendar navigation accurately to the active month/day, and eliminate any mock fallback to ₹323 or daily installment division.

## User Review Required

> [!IMPORTANT]
> - **Terminology Policy**: The Tamil word `கடன்` (kadan) will be completely purged from all user-facing UI, receipts, badges, navigation, and backend utilities, replaced by `தவணை` (thavanai).
> - **Serial Number Standard**: Serial numbers will no longer use the `#` prefix (e.g. `1` instead of `#1`, `தவணை எண்: 1` instead of `தவணை எண்: #1`).
> - **Zero Mock Data**: When a borrower has not made a payment on the selected day, `Today Paid` will strictly display `₹0` (never falling back to ₹323 or principal / 31 division math).
> - **Date & Calendar Binding**: Receipt dates and card day displays will be directly bound to the active register's month (`activeMonth`, e.g. `2026-05`) and the selected day (e.g. Day 13 of May 2026 = `13/05/2026`), rather than falling back to the current real-world browser date (`13/09/2026`).

---

## Proposed Changes

### 1. Zero-Tolerance Purge of "கடன்" (kadan) -> "தவணை" (thavanai)
Replace all occurrences of `கடன்` across 11 files with appropriate Tamil microfinance terms (`தவணை`, `தவணைகள்`, `தவணை அசல்`, `தவணை நிறைவு`):

#### [MODIFY] [ta.json](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/i18n/ta.json)
- `app_tagline`: `"தினசரி தவணை வசூல் மேலாண்மை"`
- `nav_closed`: `"நிறைவுற்ற தவணைகள்"`
- `rollover_step1_title`: `"நிறைவுற்ற தவணைகள் (காப்பகப்படுத்தப்படும்)"`
- `rollover_step2_title`: `"அடுத்த மாதத்திற்கு தொடரும் தவணைகள்"`

#### [MODIFY] [ClosedClientsPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClosedClientsPage.jsx)
- "நிறைவுற்ற கடன்கள் காப்பகம்" -> "நிறைவுற்ற தவணைகள் காப்பகம்"
- "நிறைவுற்ற கடன்கள் ஏதுமில்லை" -> "நிறைவுற்ற தவணைகள் ஏதுமில்லை"

#### [MODIFY] [ClientsPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClientsPage.jsx)
- "நேரடி வசூல் கடன் இல்லை" -> "நேரடி தவணை இல்லை"
- "அசல் தவணை சீட்டு (Thavanai Slip)" & "New Thavanai Slip" button titles

#### [MODIFY] [Dashboard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/Dashboard.jsx)
- "கடன் அசல் வரம்பு:" -> "தவணை அசல் வரம்பு:"
- "முடிந்த கடன்கள் (Cleared)" -> "முடிந்த தவணைகள் (Cleared)"
- "இந்த மாத மொத்த அசல் கடன்" -> "இந்த மாத மொத்த தவணை அசல்"
- "கடன்கள் நிறைவு பெற்றுள்ளன" -> "தவணைகள் நிறைவு பெற்றுள்ளன"

#### [MODIFY] [RolloverWizard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/RolloverWizard.jsx)
- "நிறைவுற்ற கடன்கள்" -> "நிறைவுற்ற தவணைகள்"
- "தொடரும் நிலுவைக் கடன்கள்" -> "தொடரும் நிலுவைத் தவணைகள்"

#### [MODIFY] [ExcelPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ExcelPage.jsx)
- "மொத்த அசல் கடன்" -> "மொத்த தவணை அசல்"

#### [MODIFY] [ClientFormModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ClientFormModal.jsx)
- "அசல் கடன் தொகை" -> "தவணை அசல் தொகை"

#### [MODIFY] [ClientCard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ClientCard.jsx)
- "கடன் முழுவதும் வசூலிக்கப்பட்டது" -> "தவணை முழுவதும் வசூலிக்கப்பட்டது"
- "அசல் கடன்:" -> "தவணை அசல்:"
- "கடன் நிறைவு தொகை:" -> "தவணை நிறைவு தொகை:"

#### [MODIFY] [LedgerGrid.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/LedgerGrid.jsx)
- "கடன் நிறைவடைந்தது" -> "தவணை நிறைவடைந்தது"

#### [MODIFY] [Layout.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/Layout.jsx)
- "நிறைவுற்ற கடன்கள்" -> "நிறைவுற்ற தவணைகள்"

#### [MODIFY] [receipt.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/utils/receipt.js)
- "அசல் கடன்:" -> "தவணை அசல்:"
- "தங்களின் கடன் முழுமையாக நிறைவுற்றது!" -> "தங்களின் தவணை கணக்கு முழுமையாக நிறைவுற்றது!"
- "புதிய கடன் அசல் வழங்கல் ரசீது" -> "புதிய தவணை அசல் வழங்கல் ரசீது"
- "வழங்கப்பட்ட அசல் கடன்:" -> "வழங்கப்பட்ட தவணை அசல்:"
- "கடன் தவணைக் காலம்:" -> "தவணைக் காலம்:"
- English: "Principal Loan:" -> "Thavanai Principal:", "New Loan Disbursement Slip" -> "New Thavanai Disbursement Slip", "Loan Tenure:" -> "Thavanai Tenure:"

---

### 2. Elimination of `#` Prefix Before Serial Numbers
#### [MODIFY] [ReceiptModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ReceiptModal.jsx)
- `(#${client.sl_no || 1})` -> `(${client.sl_no || 1})`
- `📋 தவணை கணக்கு எண்: #${client.sl_no || 1}` -> `📋 தவணை எண்: ${client.sl_no || 1}`
- `📋 Thavanai A/C No: #${client.sl_no || 1}` -> `📋 Thavanai No: ${client.sl_no || 1}`
- Header badge: `தவணை எண்: ${client.sl_no || 1}` (no `#`)
- Receipt Type button English labels: `Thavanai Collection` and `New Thavanai Slip` (no "Loan")

#### [MODIFY] [ClientCard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ClientCard.jsx)
- `#{client.sl_no}` -> `{client.sl_no}`
- `#{client.sl_no} {client.name}` -> `{client.sl_no} {client.name}`

#### [MODIFY] [LedgerGrid.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/LedgerGrid.jsx)
- `#{row.sl_no}` -> `{row.sl_no}`

#### [MODIFY] [ClientsPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClientsPage.jsx)
- `#{c.sl_no}` -> `{c.sl_no}`

#### [MODIFY] [CollectionPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/CollectionPage.jsx)
- `#{clientToReset.sl_no}` -> `{clientToReset.sl_no}`
- `#{clientToDelete.sl_no}` -> `{clientToDelete.sl_no}`

#### [MODIFY] [Dashboard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/Dashboard.jsx)
- `#{client.sl_no}` -> `{client.sl_no}`

#### [MODIFY] [CollectionModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/CollectionModal.jsx) & [BulkEntryModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/BulkEntryModal.jsx)
- Remove `#` prefix before serial numbers

---

### 3. Date, Time Sheet, and Calendar Synchronization
#### [MODIFY] [collections.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/collections.js)
- Include `lc.start_date, lc.end_date, lc.total_days` in the cycle query.
- Pass `start_date`, `end_date`, `month_year`, and `total_days` on each client row.

#### [MODIFY] [reports.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/reports.js)
- Include `start_date`, `month_year`, and `paid_today` in defaulters and summary clients.

#### [MODIFY] [CollectionPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/CollectionPage.jsx)
- When switching `activeMonth`, automatically sync `cardDay`:
  - If `activeMonth` is the current calendar month, set `cardDay` to `new Date().getDate()`.
  - If `activeMonth` is a past/future month, set `cardDay` to `1`.
- Display formatted calendar date alongside the day number in Card View header: e.g. `நாள் 13 / 31 (13/05/2026)`.
- Pass `month_year: activeMonth`, `start_date: client.start_date || `${activeMonth}-01``, and `selected_day: client.selected_day || cardDay` to `ReceiptModal`.

#### [MODIFY] [MonthYearPicker.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/MonthYearPicker.jsx)
- Standardize Tamil month labels to standard Tamil Gregorian names: `ஜனவரி, பிப்ரவரி, மார்ச், ஏப்ரல், மே, ஜூன், ஜூலை, ஆகஸ்ட், செப்டம்பர், அக்டோபர், நவம்பர், டிசம்பர்`.
- For `2026-05`, display `மே 2026 (May)` so users immediately recognize their collection month.

#### [MODIFY] [ReceiptModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ReceiptModal.jsx)
- Derive `receiptDate` from `client.month_year` and `client.selected_day` (e.g. Day 13 in `2026-05` = `13/05/2026`).
- Derive `startDate` from `client.start_date` or `${client.month_year}-01` (e.g. `01/05/2026`).
- Connect 1-tap WhatsApp and Thermal Slip dates to `receiptDate`.

---

### 4. Zero-Mock Amount Logic: Accurate Today Paid
#### [MODIFY] [ReceiptModal.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ReceiptModal.jsx)
- Strict initialization: If no payment was recorded for `client.selected_day`, `paymentAmount` initializes to `0` (never falling back to ₹323 or `Math.round(principal/31)`).
- If `currentPay === 0`:
  - Concise WhatsApp message formats as a clear payment reminder:
    - Tamil: `வணக்கம் ${client.name}, ${receiptDate} நிலுவைத் தவணைத் தொகை: ₹${liveRemaining}. தங்களின் தவணைத் தொகையை செலுத்துமாறு கேட்டுக்கொள்கிறோம். நன்றி, ${shopName}.`
    - English: `Dear ${client.name}, Balance due on ${receiptDate}: ₹${liveRemaining}. Kindly pay your daily thavanai. Thank you, ${shopName}.`
  - If `currentPay > 0`:
    - Tamil: `வணக்கம் ${client.name}, ${receiptDate} இன்றைய தவணை வரவு: ₹${currentPay}. மீதமுள்ள தவணை நிலுவை: ₹${liveRemaining}. நன்றி, ${shopName}.`
    - English: `Dear ${client.name}, Thavanai collection on ${receiptDate}: ₹${currentPay}. Remaining balance: ₹${liveRemaining}. Thank you, ${shopName}.`

---

## Verification Plan

### Automated Tests
- Run existing and updated tests:
  ```bash
  npm test
  ```
- Add dedicated test suite `test/kadan_ban_and_clean_sno.test.js`:
  - Verifies zero occurrences of `கடன்` in customer-facing templates.
  - Verifies serial numbers formatted without `#`.
  - Verifies `receiptDate` and `startDate` correctly computed from `month_year` and `selected_day`.
  - Verifies unpaid customer defaults to `0`, producing proper reminder text without mock `323`.

### Manual Verification
- Launch headless browser inspection to verify `ReceiptModal` for muthukumar:
  - Verify no `#` before `1`
  - Verify Start Date displays `01/05/2026`
  - Verify Today Paid displays `₹0` (not ₹323)
  - Verify Remaining Balance displays `₹9,900`
  - Verify button text shows `Thavanai Collection` and `New Thavanai Slip`
  - Verify Tamil text contains no `கடன்`
- Verify git push to GitHub `main`.
