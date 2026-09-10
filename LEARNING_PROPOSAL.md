# Learning Proposal: Field Operations Safety & Financial Entry Guardrails

## Rationale
During field microfinance operations, agents using mobile Card View on handheld devices or while traveling face unique usability and safety risks:
1. Accidental taps on "Full Due / Settle" can inadvertently clear a multi-thousand rupee loan balance with no recovery mechanism.
2. Silently falling back to calculated amounts when an input is submitted blank leads to unintended balance adjustments.
3. Viewing historical/future months with a hardcoded `todayDay = new Date().getDate()` causes incorrect day indexing.

## Proposed Guidelines & Architectural Guardrails

### 1. Financial Settlement Confirmation & Reversal
- Any action that settles a client balance to zero ("முழு நிலுவை / Full Due") or modifies multiple days MUST provide:
  - An inline confirmation guard prompt before state mutation.
  - A transient (8-second) Undo floating action toast allowing instantaneous 1-click reversal to the exact prior ledger balance.
  - An in-card revert button on any day with logged collection (`amount > 0`).

### 2. Input Validation Over Silent Defaults
- An empty collection input MUST NOT secretly inject an implied daily quota (`expectedDaily`). If blank, the action button is disabled or triggers a validation hint, ensuring explicit user intent.

### 3. Progressive Hardware Integration (Bluetooth & Web Audio)
- For direct hardware features (Web Bluetooth ESC/POS printing, Web Audio synthesizer):
  - Progressive enhancement: check `navigator.bluetooth` capability before invoking hardware APIs.
  - Seamless fallback: if unsupported or cancelled, route cleanly to the standard system browser print dialog (`window.print()`).
  - Self-contained audio: use browser `AudioContext` oscillators for zero-dependency offline operation.
