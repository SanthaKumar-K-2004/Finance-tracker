# 🧠 Learning Proposal: Microfinance UI/UX Design Psychology & Financial Trust Guardrails

## 1. Classification
- **Type**: Workspace Customization Rule & Skill Extension
- **Target Location**: `.agents/skills/daily-finance-auditor/` and `.agents/rules/financial-ui-trust.md`

## 2. Rationale
When building digital microfinance and daily ledger software for field operations and enterprise shop management:
1. **Financial Trust & Cognitive Authority**:
   - Money and debt tracking requires absolute clarity, calm authority, and high perceived legitimacy.
   - Saturated neon colors, purple/pink "AI hype" gradients, or playful bouncy animations destroy user trust and cause visual exhaustion in high-stress financial bookkeeping.
   - Authority Navy (`#0F172A`, `#1E3A8A`) combined with Emerald Jade (`#059669`) for positive income, Ruby Crimson (`#DC2626`) for overdue debt, and Warm Brass (`#A16207`) for recovery targets matches institutional banking psychology.
2. **Tabular Numerals & Optical Alignment**:
   - Currency digits must never jitter or oscillate horizontally when values change.
   - Every numerical field must enforce `font-variant-numeric: tabular-nums` or utilize a monospace/tabular font (`JetBrains Mono`).
3. **Field Ergonomics & Mobile Ruggedness**:
   - Agents collecting cash outdoors or on vehicles need high-contrast views, single-hand thumb navigation, instant numeric keypad popups (`inputMode="numeric"`), and minimum 44×44px touch targets.
   - 31-day horizontal tables must always anchor borrower Sl.No and Name as sticky frozen columns so context is never lost during horizontal swipe.

## 3. Reusable Rules to Persist

```markdown
### Financial UI/UX Trust & Ergonomics Rules:
1. **Never use AI-cliché purple/pink gradient borders or glowing neon buttons** in financial ledgers.
2. **Always enforce `font-variant-numeric: tabular-nums`** across all monetary tables, balance badges, and progress counters.
3. **Strict Bilingual Pairing**: Always pair English geometric sans (`Plus Jakarta Sans` / `Inter`) with clean Tamil typography (`Noto Sans Tamil` / `Mukta Malar`) with identical vertical alignment and balanced leading (1.5 - 1.6).
4. **Frozen Columns on Dense Ledgers**: Any horizontal ledger with >7 date columns must pin borrower identity columns on the left.
5. **Mobile Thumb Dock**: Provide a persistent bottom navigation bar on screens `< 768px` for primary workflows (Ledger, Dashboard, Borrowers, Cash Handover).
```
