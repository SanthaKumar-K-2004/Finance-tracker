# Financial UI/UX Design Psychology & Financial Trust Guardrails

## 1. Core Visual Philosophy
- **Psychology of Institutional Trust**:
  - Financial interfaces require calm authority, high legibility, and high perceived stability.
  - NEVER use tacky "AI purple/pink" gradients, glowing neon borders, or playful bouncy animations.
  - Primary colors MUST be rooted in financial trust:
    - **Authority Navy (`#0F172A`, `#1E3A8A`)**: Used for brand identity, main navigation, and primary controls.
    - **Emerald Jade (`#059669`, `#10B981`)**: Strictly used for positive income, recovered cash flow, verified badges, and completed thavanai.
    - **Ruby Crimson (`#DC2626`)**: Strictly used for overdue arrears, defaulter risks, and destructive actions.
    - **Warm Amber (`#D97706`)**: Used for pending today installments, warnings, and edit modes.
    - **Prestige Brass / Warm Gold (`#A16207`)**: Used for collection targets and shop badges.

## 2. Typography & Numerical Alignment
- **Tabular Figures**:
  - Always enforce `font-variant-numeric: tabular-nums` or `JetBrains Mono` across all monetary amounts, daily ledger cells, balances, and phone numbers. Digits MUST NOT jitter or oscillate horizontally when numbers change.
- **Enterprise Bilingual Typography**:
  - English/UI: `Plus Jakarta Sans` or `Inter` (crisp geometric sans).
  - Tamil: `Noto Sans Tamil` or `Mukta Malar` with balanced line-height (1.5–1.6) and baseline alignment.

## 3. Field Usability & Mobile Ruggedness
- **Mobile First Touch Targets**:
  - Minimum touch target: 44×44px with 8px+ spacing.
  - Number inputs MUST specify `inputMode="numeric"` to trigger the numeric keypad immediately.
- **Ledger Freeze Columns**:
  - In 31-day horizontal tables, frozen sticky columns (Sl.No, Name/Phone, Principal) MUST be anchored on the left so row context is never lost during horizontal swipe.
- **Persistent Bottom Dock**:
  - Mobile screens (`< 768px`) MUST provide a persistent thumb-navigation dock for the 4 core workflows: Ledger, Dashboard, Borrowers, and Cash Handover.
