# Enterprise Operations Overhaul: Undo System, Card Day Selector, Bluetooth Thermal Print, Audio/Haptic Chime & Target Progress Ring

## Goal Description
Address critical field operations issues where agents inadvertently clear loans or enter incorrect collections without a way to undo, fix the "Today Paid" synchronization and active day selection in Card View, and implement the three requested high-value features:
1. **Direct Bluetooth Thermal Printer Web-Print** (Web Bluetooth ESC/POS integration for handheld 58mm/80mm POS printers without system print dialog).
2. **Collection Cash-Register Chime & Haptic Feedback** (100% offline Web Audio API synthesis + `navigator.vibrate` for mobile).
3. **Weekly / Daily Target Radial Progress Ring** (Interactive live SVG progress ring in the top header showing today's collection vs expected target).
4. **2-Tier Undo & Safety Architecture** (Floating 8s Undo Action Toast + In-Card Revert Button + Full Due Settlement Confirmation Guard).

---

## User Review Required

> [!IMPORTANT]
> **Field Safety & Settlement Confirmation**:
> When an agent clicks "முழு நிலுவை / Full Due", a modal confirmation will now guard against accidental one-tap clearance of active loans (e.g. ₹10,000 cleared by mistake while riding or tapping quickly). An instant **8-second Floating Undo Banner** will also appear after every collection action to allow single-click reversal.

> [!NOTE]
> **Web Bluetooth Compatibility**:
> Web Bluetooth (`navigator.bluetooth`) is natively supported on Google Chrome, Microsoft Edge, and Chrome on Android (common field agent devices). On browsers where Web Bluetooth is disabled or unsupported (e.g. iOS Safari without BLE web polyfill), the system will automatically fall back to the standard thermal print dialog.

---

## Root-Cause Analysis: "Today Paid" in Card View & Accidental Clearance

1. **Active Day Mismatch**:
   - `CollectionPage.jsx` hardcoded `todayDay={new Date().getDate()}`.
   - When viewing historical or future months (e.g. `2026-05`), if the current system date is the 10th of September, it inspected day 10 of May. In historical months or days where no payment was logged on day 10, it displayed `₹0`.
   - Card View lacked any day selector or date label, leaving field agents unaware of which day they were collecting for or viewing.
2. **Accidental Full Due & Incremental Add Bug**:
   - In `ClientCard.jsx`, if the user left the input empty and hit Enter/Collect, it secretly fell back to `expectedDaily` (which the user had explicitly requested to remove).
   - In `handleQuickPay`, `onQuickPay` called `handleCellChange(..., current + addAmount)`. If `current` was ₹500, entering ₹500 added to ₹1,000 instead of setting or allowing clear replacement.
   - Clicking "முழு நிலுவை / Full Due" instantly marked the borrower as cleared (`is_cleared = true`), locking the card behind a completion ribbon with **zero undo capability**.

---

## Proposed Changes

### 1. Audio, Haptics & Bluetooth Utilities

#### [NEW] `src/utils/audioFeedback.js`
- Synthesizes a crisp, authentic dual-tone cash register chime (`987.77 Hz` B5 -> `1318.51 Hz` E6 + high sparkle overtone) using native browser Web Audio API (`AudioContext`).
- Generates subtle error/revert tones for undo actions.
- Triggers mobile haptic vibration (`navigator.vibrate([30, 40, 60])`) on Android/mobile devices.
- Runs 100% offline with zero external audio assets or network downloads.

#### [NEW] `src/utils/bluetoothPrinter.js`
- Connects to handheld 58mm/80mm Bluetooth POS printers (NGX, Rugtek, Everycom, TVS) via `navigator.bluetooth.requestDevice`.
- Formats raw ESC/POS command buffers:
  - `ESC @` (Hardware reset)
  - `ESC a 1` (Center align)
  - `ESC E 1` (Bold header `ALR FINANCE`)
  - `ESC a 0` (Left align structured borrower lines)
  - Clean 32-column key-value alignment
  - `GS V 66 0` (Feed paper & cut)
- Handles chunked Bluetooth GATT characteristic writes (512-byte MTU).
- Provides status callbacks (`connecting`, `printing`, `success`, `unsupported`, `error`).

---

### 2. Core Card View & Undo Safety Architecture

#### [MODIFY] `src/components/ClientCard.jsx`
- **In-Card Revert / Undo Button**: Next to `இன்றைய வசூல் / Today Paid: ₹X`, if amount > 0, show an undo/revert button (`↩ செயல்தவிர்`) allowing the agent to immediately reset or correct today's payment.
- **Input Field Safety**:
  - Disable "Collect" button if input is empty; never silently charge `expectedDaily`.
  - Explicit placeholder: `தொகை உள்ளிடுக (e.g. 300)`.
- **Full Due Guard**:
  - Clicking "முழு நிலுவை" triggers safety confirmation before marking as settled.
- **Accurate Today Amount Display**:
  - Displays the active day label (`தேதி ${todayDay} வசூல்`).

#### [MODIFY] `src/pages/CollectionPage.jsx`
- **Active Day Controller in Card View**:
  - Add a dedicated day stepper and picker in Card View: `[◀ Day 10 (10/05/2026) ▶]` defaulting to today (or valid day within the month).
  - Agents can change the collection day to record for yesterday or any date.
- **Floating 8-Second Undo Action Toast**:
  - Displays a bottom floating toast on collection:
    `✓ ₹{amount} {client.name} கணக்கில் பதிவு செய்யப்பட்டது` `[ ↩ செயல்தவிர் / UNDO (8s) ]`.
  - Reverts payment to its previous value with 0ms latency and syncs to cloud.
- **Settlement Confirmation Modal**:
  - Displays: `"முழு நிலுவை ₹{remaining} வசூலிக்கப்பட்டு கடன் நிறைவு செய்யப்படவுள்ளது. தொடரவா?"`
  - Prevents fatal accidental clearances.

---

### 3. Top Header Radial Target Progress Ring

#### [MODIFY] `src/components/Layout.jsx`
- Add an interactive circular SVG Radial Progress Ring in the top controls:
  - Shows percentage of today's collection vs expected daily target (`total_principal / total_days`).
  - Smooth animated circumference stroke.
  - Hover/click interactive popover showing:
    - **இன்றைய வசூல் (Today Collected)**: ₹XX,XXX
    - **தினசரி இலக்கு (Daily Target)**: ₹YY,YYY
    - **இலக்கு எட்ட மீதம் (Shortfall)**: ₹ZZ,ZZZ
    - **செலுத்தியோர் (Paid Today)**: X / Y borrowers.

---

### 4. Direct Bluetooth Print Integration

#### [MODIFY] `src/components/ReceiptModal.jsx`
- Add `🖨️ புளூடூத் அச்சு (Bluetooth POS Print)` button alongside standard Print and WhatsApp.
- One-click direct printing to paired handheld POS printer without invoking browser print dialog.
- Automatic fallback to browser print if Web Bluetooth is unavailable.

---

### 5. Styling & Visual Refinement

#### [MODIFY] `src/index.css`
- Styles for Floating Undo Toast with animated countdown progress bar.
- Styles for Radial Target Progress Ring and dropdown popover.
- Styles for In-Card Revert icon and Day Stepper.

---

## Verification Plan

### Automated Integration Tests
- Create `test/undo_safety_and_card_sync.test.js`:
  - Verify payment entry and subsequent 0ms reversal/undo restores exact previous ledger balance.
  - Verify rejection of empty amount submission.
  - Verify daily collection target calculation formula (`ceil(total_principal / total_days)`).
  - Verify Bluetooth ESC/POS buffer generation format.
- Run `npm test` across all 16 test suites.
- Run `npx vite build` to ensure 0 bundling errors.

### Manual Verification
- Test Card View collection and instant 8-second floating Undo banner.
- Test In-Card Revert button when a day has a payment.
- Test Full Due confirmation guard dialog.
- Test Cash-Register chime & haptic trigger on collection.
- Test Radial Progress Ring hover popover and percentage accuracy.
- Test Bluetooth print button in Receipt Modal.
