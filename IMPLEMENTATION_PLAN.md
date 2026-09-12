# Customer Operations, Advanced Multi-Filter, Tamil Typography & Connection Stability Plan

This plan addresses all five requirements requested for the Tamil Nadu Daily Collection Register (ALR) application:
1. **Customer Delete & Reset Features**: 1-click customer deletion (with choices to remove from month ledger or permanently delete) and customer payment reset (resetting all daily collections back to ₹0 for the active month).
2. **Tamil Font Size Increase**: Substantial typography scaling for Tamil (`lang="ta"`), giving 15-20% larger font sizes, improved line heights, and crisp readability under harsh daylight.
3. **Address Displayed Above Customer Name**: Elevating the route/village address to appear prominently **above** the customer name in both the desktop 31-day spreadsheet (`LedgerGrid`) and mobile cards (`ClientCard`).
4. **Advanced Multi-Filter System**: Adding a multi-dimensional filter bar supporting status filters (All, Pending, Cleared, Paid Today, Pending Today, Zero Collection, Excess), Village/Route filter, Principal Range filter, and Sort By options, with an instant 1-Click "Reset All Filters" button and active filter chips.
5. **Rock-Solid Connection Stability ("No issue come")**: Timeout protection on database queries, SWR stale-fallback on cache invalidation, graceful offline/local cache fallback in frontend, and live connection health status so the app never freezes or crashes with 500 errors.

---

## User Review Required

> [!IMPORTANT]
> **Financial Data Safety Rule (`accidental-data-loss-prevention`)**:
> - **Reset Customer Feature**: Resetting a customer's collection entries sets their 1–31 day payments back to ₹0 and restores the remaining balance to the full principal. We implement a clear confirmation modal detailing the exact amount being reset.
> - **Delete Customer Feature**: When deleting from the daily register, the user is offered two options:
>   1. *Remove from this month's register only* (leaves client record intact in borrower directory).
>   2. *Delete borrower permanently* (soft-delete client from all cycles).

---

## Proposed Changes

### 1. Backend: Reset & Delete Endpoints + DB Connection Stability

#### [MODIFY] [server/db.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/db.js)
- Wrap database executions in an active 7-second timeout race with automatic retries.
- Prevent queries from hanging indefinitely (which caused the 10,500ms 500 errors).

#### [MODIFY] [server/utils/cache.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/utils/cache.js)
- Upgrade `invalidateTag`: Instead of hard-deleting the cache entries on mutations, soft-expire them (`expiresAt = 0`).
- This allows SWR to immediately serve the last-known-good snapshot if the subsequent database query experiences transient cloud network latency, eliminating 500 errors.

#### [MODIFY] [server/routes/collections.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/collections.js)
- Add `POST /api/collections/reset-client`:
  - Body: `{ cycle_id, client_id }`
  - Deletes all `daily_collections` for that `cycle_id`.
  - Reverts `loan_cycles.status` to `'active'` and clears `close_date`.
  - Invalidates cache tags `grid` and `reports`.
- Add `POST /api/collections/remove-from-month`:
  - Body: `{ cycle_id }`
  - Archives or removes the loan cycle for the active month without deleting the client.
- Add try/catch graceful fallback to SWR stale cache if query encounters unexpected database downtime.

#### [MODIFY] [server/routes/clients.js](file:///home/santhakumar/Desktop/FINACE%20PROJECT/server/routes/clients.js)
- Verify `DELETE /api/clients/:id` properly marks client status as `'deleted'` and active cycles as `'closed'`, returning updated stats.

---

### 2. Styling: Tamil Typography Scaling & Address Layout

#### [MODIFY] [src/index.css](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/index.css)
- Add dedicated `html[lang='ta']` typography rules:
  - Base font-size scaled from 15.5px to 17px.
  - `--font-sans` prioritizes `'Mukta Malar', 'Noto Sans Tamil'`.
  - Line-height increased to `1.6` for Tamil vowel marks and pulli dots.
  - Header titles, table headers, cell labels, and badges scaled up by 15-20%.
- Add styling for `.address-pill-above`:
  - Modern subtle badge with `MapPin` icon positioned directly above the customer name.
  - Distinct styling so collection agents can instantly scan by street/village route.
- Add styling for `.advanced-filter-panel`, filter tags, and reset buttons.

---

### 3. Components: Customer Address, Delete, Reset & Advanced Filters

#### [MODIFY] [src/components/LedgerGrid.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/LedgerGrid.jsx)
- Move address **above** the customer name in `col-sticky-2`:
  - Render `<div className="grid-client-address-above"><MapPin size={11} /><span>{row.address}</span></div>` above `<div className="grid-client-title-row">...</div>`.
- Add **Reset Customer** button (`RotateCcw` icon) in the actions column with confirmation modal.
- Ensure **Delete** button triggers a clean, safe confirmation modal.
- Enlarge Tamil text in borrower name and table headers.

#### [MODIFY] [src/components/ClientCard.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/components/ClientCard.jsx)
- Move address **above** customer name in the card header:
  - Prominent address pill with `MapPin` above the client name and Sl.No.
- Add **Reset Payments** action button in card actions:
  - Modal confirmation displaying total payments being cleared.
- Add **Delete** button with dual-mode confirmation (Remove from month vs. Delete borrower).
- Increase Tamil typography in card labels, metric titles, and quick-add buttons.

#### [MODIFY] [src/pages/CollectionPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/CollectionPage.jsx)
- Implement **Advanced Multi-Filter System**:
  - Filter by Status: All (அனைத்து), Pending Due (நிலுவை), Cleared (அடைத்தவை), Paid Today (இன்று வசூல்), Pending Today (இன்று பாக்கி), Zero Collection (0 வசூல் - never paid), Excess (முன்பணம்).
  - Filter by Village / Route.
  - Filter by Principal Range: All, ₹5,000, ₹10,000, ₹15,000, ₹20,000+.
  - Sort By: Sl.No (Asc/Desc), Name (A-Z), Due Balance (High to Low), Total Collected (High to Low).
  - Active filter chips with 1-click removal.
  - **1-Click "Reset All Filters"** button.
- Implement `handleResetClient` function connected to `POST /api/collections/reset-client`.
- Implement `handleDeleteClient` with safety dialog (Remove from month vs. Full delete).
- Enhance fetch error handling: if network or backend fails, immediately use cached local storage data and show an amber offline notice without interrupting workflow.

#### [MODIFY] [src/pages/ClientsPage.jsx](file:///home/santhakumar/Desktop/FINACE%20PROJECT/src/pages/ClientsPage.jsx)
- Display address prominently above/with client name.
- Increase Tamil font sizes.
- Add Reset and Delete actions with clear confirmation.

---

## Verification Plan

### Automated Tests
- Create integration test `test/customer_crud_and_filters.test.js`:
  1. Test `POST /api/clients` (create borrower).
  2. Test `POST /api/collections/entry` (record day collections).
  3. Test `POST /api/collections/reset-client` (verify collections reset to 0, remaining equals principal).
  4. Test `DELETE /api/clients/:id` (verify soft delete).
  5. Test DB timeout resilience.
- Run `npm test` across all 38+ unit and integration tests.

### Manual / Browser Verification
- Open application in browser (via Brave browser integration).
- Verify Tamil font sizes are visibly larger, legible, and clear.
- Verify address appears prominently ABOVE the customer name in both Grid view and Mobile Card view.
- Test Advanced Multi-Filter: filter by Status, Route, Amount, and Sorting, and verify the "Reset All Filters" button clears all criteria.
- Test Customer Delete and Customer Reset actions, confirming that ledger calculations and cloud sync update instantly.
