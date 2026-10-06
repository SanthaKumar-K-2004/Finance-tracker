# Learning Proposal: Enterprise UI/UX Ergonomics & Clean Export/Import Standards

## Classification: **Rule** (Universal behavioral guardrail & UI/UX standard)

## Rationale
Recent user interactions emphasize that the application must be enterprise-grade, robust, and completely free of artificial "AI clutter" or unnecessary visual mess. Specifically:
- **No Overly Artificial "AI Clutter"**: Avoid gratuitous gradients, floating decorative widgets, or bloated explanatory paragraphs. The interface must look clean, authoritative, uncluttered, and professional, aligned with real user psychology and daily operations.
- **Dropdown DOM Stability**: Native `<select>` elements and form filters must maintain stable option lifecycles. They must never re-render or shift options while the user is actively clicking or focused on them (preventing premature closure or jitter).
- **Tabular PDF Alignment & Uniformity**: Vector PDF tables must enforce strict vertical and horizontal alignment. In dense landscape registers (such as 31-day daily breakdowns), row heights must remain strictly uniform (using `minCellHeight`, compact paddings, and `overflow: 'ellipsize'`) to prevent multi-line number wraps from distorting the grid.
- **2-Stage Ingestion Pattern**: File import workflows must transition cleanly from a dropzone into an isolated, paginated Ingestion Review Deck with clear counts of new vs updated records and explicit accidental data loss safeguards.

---

## Proposed Rule Text

```markdown
# Enterprise UI/UX & Data Integrity Invariants

## 1. Clean, Clutter-Free Aesthetics (No Artificial AI Fluff)
- Prioritize clean, modern, and ergonomic business design: Slate 900, Emerald 600, Indigo 600, and neutral borders.
- Never add unnecessary decorative AI widgets, floating badges, or bloated helper paragraphs.
- Keep microcopy concise, authoritative, and bilingual (Tamil & English).

## 2. Dropdown & Form Field Stability
- Form filters and dropdown menus must never recompute or replace their `<option>` elements on every keystroke or while in focus.
- Every form input and select must have an explicit `id` and corresponding `<label htmlFor="...">` for 100% WCAG 2.1 AA accessibility compliance.
- Maintain touch targets of at least 40px for comfortable touch/mobile interaction.

## 3. PDF Vector Tabular Precision
- Numeric table headers must have explicit `{ styles: { halign: 'right' } }` matching numeric column cells.
- In multi-column dense registers (e.g. Days 1–31), enforce `minCellHeight`, small font size (5.5–6pt), and single-line numbers (`overflow: 'ellipsize'`) to ensure all rows have strictly identical height.
- Direct vector PDF generation must sanitize and transliterate non-ASCII/Unicode characters (e.g. ₹ to Rs., Tamil to clean Latin syllables) to guarantee zero glyph corruption in standard Helvetica.

## 4. 2-Stage Safe Import Pattern
- When a file is uploaded, hide the initial dropzone and transition cleanly to an Ingestion Review Deck.
- Always display explicit counts: Total Rows, Valid Rows, Duplicate Phone Warnings, New Clients, and Updated Clients.
- Ensure non-destructive updates with clear user confirmation before committing to the database.
```

---

## Target File
- **Rule File**: `/home/santhakumar/Desktop/FINACE PROJECT/.agents/rules/enterprise-uiux-and-export-standards.md`

## Impact
This rule ensures all future features and UI updates adhere to clean, production-grade enterprise standards without visual clutter or regressions in data integrity.
