# Daily Collection & Recovery Manager — Master Project Plan
*(Working title — replace with final brand name for Alpha X Solutions)*

---

## 1. Executive Summary

A multi-tenant, web-based SaaS platform that digitizes the daily-collection / pigmy-finance ledger workflow currently run on Excel by small finance shops. Built for tier-2/tier-3 town finance companies (daily-deposit collectors, local NBFCs, Nidhi companies, chit operators). Sold by Alpha X Solutions to multiple finance shops under one platform, each shop's data fully isolated.

**Core promise to a shop owner:** everything the Excel sheet already does, done automatically, collected in real time by agents on the ground, with WhatsApp receipts and zero manual month-end rollover risk — at a price a small-town shop can actually justify.

**Non-negotiables locked in during planning:**
- Multi-tenant from day one (build once, sell to many shops)
- Web-based / browser-first — no native app requirement, works on a basic PC or phone browser
- No dependency on paid AI-API keys — running costs stay flat and predictable
- WhatsApp-based receipts and due reminders
- Owner-configurable late fee on rollover
- Tamil + English from day one
- Three roles: Owner, Agent, Alpha X Super-Admin

---

## 2. Recommendations (the two open decisions)

### Pricing model
**Hybrid: one-time setup fee + low flat monthly fee.**
- Setup fee: covers onboarding, migrating their existing Excel data, training the owner/agents
- Monthly fee: flat, small, covers WhatsApp Business API messaging + hosting + support
- Why not pure one-time: no recurring revenue, no funded reason to keep supporting/improving the product
- Why not enterprise subscription: too heavy a psychological jump for an owner paying ₹0 for Excel today
- Optional future upsell: per-extra-agent fee once a shop scales past a few agents

### Cycle length
**Make it configurable per client from day one** (31 / 60 / 90-day options), even though the current sheet is fixed at 31. It's cheap to build now as a setting; expensive to retrofit later once rollover logic, reports, and late-fee rules are all built assuming 31 days.

---

## 3. System Structure — Core Entities

```
Company (Tenant)
 ├─ id, name, branding (logo, shop name for receipts), language pref, subscription status
 ├─ Owner (1 per company, can add more)
 ├─ Agents (many)
 ├─ Clients (many)
 │    ├─ personal info: name, phone, address, photo/ID
 │    ├─ cycle_length (31 / 60 / 90 days, configurable)
 │    └─ LoanCycles (many, one per month/cycle)
 │         ├─ principal_amount
 │         ├─ start_date, end_date
 │         ├─ DailyCollectionEntries (one per collection day)
 │         │    ├─ date, amount_collected, agent_id, timestamp
 │         ├─ total_collected (calculated)
 │         ├─ remaining (calculated = principal - total, floor 0)
 │         ├─ excess (calculated = total - principal if over)
 │         ├─ late_fee_applied (if pending at cycle close & rule enabled)
 │         └─ next_cycle_principal (= remaining + late_fee, auto-carried)
 ├─ LateFeeRule (per company, or per client-type)
 │    ├─ enabled (on/off)
 │    ├─ type: flat amount OR percentage of pending
 │    ├─ grace_period_days
 ├─ WhatsAppLog (receipts & reminders sent, per client, per event)
 └─ Subscription (plan, billing status — managed by Super-Admin)

Super-Admin (Alpha X)
 └─ sees all Companies, subscription status, usage, support access
```

---

## 4. Features by Role

### Owner
- Add/edit clients (name, phone, address, photo, cycle length, principal)
- Add/edit agents, assign clients/routes to agents
- Configure late-fee rule (on/off, flat/%, grace period)
- Configure branding for WhatsApp receipts (shop name, logo)
- View live dashboard: today's collection, total outstanding, pending clients, top defaulters
- View reports: daily / monthly collection, agent-wise performance, defaulter list, exportable to Excel/PDF
- Approve/close a cycle and trigger rollover (or auto-close on cycle end date)
- Switch interface language (Tamil/English)

### Agent
- See today's due list (auto-generated: which clients are due today)
- Mark a client as paid, enter amount (defaults to expected daily amount, editable)
- Trigger WhatsApp receipt automatically on marking paid
- See own daily collection total (simple, motivating summary)
- Nothing else — deliberately minimal, so it's usable by non-tech-savvy field staff

### Alpha X Super-Admin
- View list of all shop accounts (Companies) on the platform
- View each shop's subscription/billing status
- Suspend/activate a shop account
- View basic usage stats (active agents, active clients, last login) for support purposes
- Push platform-wide updates/announcements
- Access a shop's account for support (with proper access controls/audit logging)

---

## 5. How the Core Functions Work

**Daily collection entry**
Agent opens due list (filtered to today, auto-generated from each client's active cycle) → taps client → enters/confirms amount → system timestamps entry → WhatsApp receipt sent automatically to client's registered number.

**Auto rollover with late fee**
On cycle end date: system checks `remaining` for each client.
- If `remaining = 0` → cycle closes clean, new cycle opens with fresh principal (owner sets, or same as before).
- If `remaining > 0` (pending) → system checks LateFeeRule:
  - If disabled → next cycle's principal = remaining (as-is)
  - If enabled → next cycle's principal = remaining + late fee (flat or % as configured), unless payment came in within the grace period
- All of this happens automatically at cycle boundary — no manual copy-paste, which was the exact failure mode in the old Excel sheet.

**WhatsApp receipts & reminders**
- Receipt: triggered instantly when agent marks a payment
- Reminder: triggered X days before cycle-close date if a client still has a meaningful balance pending (configurable threshold)
- Runs on WhatsApp Business API — fixed per-message cost, not AI-token billing, keeping running costs predictable

**Reporting**
- Daily collection report: sum of all DailyCollectionEntries for a date, by agent and by shop
- Defaulter report: clients whose remaining > 0 past their cycle-close date
- Agent performance: collection rate = (amount collected / amount expected) over a period

---

## 6. Suggested Screens (Web App)

**Owner**
1. Dashboard (today's collection, outstanding, pending, defaulters)
2. Clients (list, add/edit, cycle settings)
3. Agents (list, add/edit, assign routes)
4. Reports (daily / monthly / agent-wise / defaulter, export)
5. Settings (late fee rule, branding, language)

**Agent**
1. Today's due list
2. Mark payment (single tap → confirm amount → done)
3. My collection summary (today/this month)

**Super-Admin**
1. Shop accounts list
2. Shop detail (subscription, usage, support access)
3. Platform announcements

---

## 7. Technical Architecture (recommendation, no build yet)

- **Frontend:** responsive web app (works on desktop browser and mobile browser — no native app store dependency for v1)
- **Backend:** standard REST/API backend with multi-tenant data isolation (each Company's data scoped by tenant ID on every query)
- **Database:** relational DB (client/cycle/collection data is inherently relational — clients → cycles → daily entries)
- **WhatsApp integration:** WhatsApp Business API (official, paid-per-message, not AI-token based)
- **Hosting:** cloud hosting sized for tier-2/3 usage patterns — doesn't need to be expensive/enterprise-grade for early shops
- **Offline consideration:** since this is browser-based (not native), true offline collection entry is a real limitation for agents in low-signal areas — worth flagging as a v2 problem to solve (e.g., basic offline caching) rather than a v1 blocker, since owners said web-first matters more than offline right now

---

## 8. Roadmap

**MVP (v1)**
- Single company onboarding (your first client) but built multi-tenant underneath
- Client management, daily entry, auto rollover (no late fee yet), WhatsApp receipts
- Owner dashboard + basic reports
- Tamil + English UI

**v2**
- Owner-configurable late fee engine
- Agent performance reports, defaulter reports
- Configurable cycle lengths (30/60/90)
- Super-Admin panel for managing multiple shops

**v3**
- Multiple shops fully onboarded, billing/subscription automation
- Offline-capable data entry for agents
- Branding customization per shop for receipts
- Optional: group/SHG lending support if demand appears

---

## 9. Business Model Summary

- **Product:** multi-tenant SaaS, sold to small-town/tier-2/3 finance shops
- **Pricing:** one-time setup fee + low flat monthly fee (covers WhatsApp + hosting + support)
- **Differentiators vs Vasool Book / Jainam / Lendstack:** WhatsApp-native workflow (Alpha X's existing strength), Tamil-first UX, web-based (no app install friction), predictable cost (no AI-token billing surprises)
- **Go-to-market:** first client as proof of concept → case study → sell into similar tier-2/3 finance shops in the same region

---

## 10. Master Ultra Prompt

*Copy-paste this into an AI build tool (e.g. Claude Code) when ready to start building. It encodes every decision above so nothing gets lost between planning and execution.*

```
You are building a multi-tenant SaaS web application called "Daily Collection & Recovery Manager" for small finance shops (daily-deposit collectors, local NBFCs, Nidhi companies, chit fund operators) in tier-2/tier-3 Indian towns, replacing an Excel-based "Daily Collection Register" workflow.

CORE ENTITIES:
- Company (tenant): id, name, branding (logo, shop name), language preference (Tamil/English), subscription status
- Owner: belongs to a Company, full admin rights within it
- Agent: belongs to a Company, restricted to daily collection entry
- Client: belongs to a Company, has name, phone, address, photo, cycle_length (31/60/90 days, configurable)
- LoanCycle: belongs to a Client, has principal_amount, start_date, end_date, computed total_collected, remaining, excess
- DailyCollectionEntry: belongs to a LoanCycle, has date, amount_collected, agent_id, timestamp
- LateFeeRule: belongs to a Company, has enabled (bool), type (flat/percentage), value, grace_period_days
- WhatsAppLog: records receipts and reminders sent, linked to Client and event type
- Subscription: belongs to a Company, plan type, billing status, managed by Super-Admin

ROLES & PERMISSIONS:
1. Owner — manage clients, agents, late-fee rules, branding, language; view dashboard and all reports; approve/close cycles
2. Agent — view today's due list only (auto-generated from active cycles); mark a client as paid with an amount; view own collection summary. No access to other data.
3. Super-Admin (Alpha X) — view all Company accounts, manage subscription/billing status, suspend/activate accounts, view usage stats, push announcements. Full platform-level access with audit logging.

CORE BUSINESS LOGIC:
1. Daily collection: Agent sees auto-generated due list (clients with an active cycle, due today) → marks paid → enters/confirms amount → system timestamps → triggers WhatsApp receipt via WhatsApp Business API immediately.
2. Cycle rollover (runs automatically at each client's cycle end_date):
   - total_collected = SUM of all DailyCollectionEntries in the cycle
   - remaining = MAX(principal_amount - total_collected, 0)
   - excess = MAX(total_collected - principal_amount, 0)
   - IF remaining == 0: new cycle opens with a fresh principal (owner-defined)
   - IF remaining > 0 (pending):
       - IF LateFeeRule.enabled AND payment not received within grace_period_days after cycle end:
           - apply late fee (flat amount or percentage of remaining, per rule config)
           - next cycle principal = remaining + late_fee
       - ELSE:
           - next cycle principal = remaining (as-is, no penalty)
3. WhatsApp reminders: sent X days before a cycle's end_date if remaining balance exceeds a configurable threshold.
4. Reports: daily collection totals (by shop, by agent), defaulter list (clients with remaining > 0 past end_date), agent performance (collected / expected ratio over a period).

TECHNICAL CONSTRAINTS:
- Web application, responsive, browser-first (desktop and mobile browser) — NOT a native mobile app for v1
- Multi-tenant architecture: every data table scoped by company/tenant ID; strict data isolation between Companies
- NO dependency on paid AI-API services (no per-call/per-token AI billing anywhere in the core product) — keep running costs flat and predictable
- WhatsApp integration via WhatsApp Business API (fixed per-message pricing)
- Relational database (clients → cycles → daily entries is inherently relational)
- Bilingual UI: Tamil and English, switchable per Company/user, from v1
- Design for a non-technical user base: minimal-click flows, especially for the Agent role (due list → mark paid → done, 3 taps max)

BUILD PRIORITY (MVP first):
1. Company/tenant setup + Owner account creation
2. Client management (add/edit, cycle length setting)
3. Agent management (add/edit, assign clients)
4. Daily collection entry flow for Agent role
5. Auto rollover logic (without late fee first)
6. WhatsApp receipt trigger on payment
7. Owner dashboard (today's collection, outstanding, pending, defaulters)
8. Basic reports (daily/monthly, exportable)
9. THEN add: late-fee engine, Super-Admin panel, configurable cycle lengths, branding customization

Build the MVP first, following this priority order, before adding v2/v3 features listed above.
```

---

*End of master plan. This document reflects all decisions made during the planning discussion — pricing model, cycle-length flexibility, multi-tenant architecture, roles, WhatsApp-first receipts, no AI-API cost dependency, and bilingual UI.*
