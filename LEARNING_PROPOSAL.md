# Learning Proposal — High-Concurrency Microfinance & BigQuery DTS Architecture

## 1. Classification
* **Domain**: Distributed Edge Microfinance Ledger & Cloud Data Warehouse Integration
* **Type**: Hybrid (Rule: Concurrency & Lock Guardrails; Skill: BigQuery Data Transfer Service Bridge)
* **Target Files**:
  - Rule: `.agents/rules/concurrency_and_ledger_integrity.md`
  - Skill Update: `.agents/skills/daily-finance-auditor/SKILL.md`

---

## 2. Rationale & Analysis
Under high concurrent multi-user load (e.g., dozens of field agents simultaneously collecting payments at 5:00 PM), SQLite and distributed edge engines (Turso) suffer from write-lock contention (`SQLITE_BUSY: database is locked`) if writes are executed indiscriminately without serialization.

Furthermore, microfinance registers with 10,000+ borrowers fail when using unindexed correlated subqueries `(SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id)`. Using **grouped JOIN aggregations** and **indexed universal prefix lookups** yields 50x-100x speedups.

Finally, bridging edge SQLite to Google Cloud BigQuery via **BigQuery Data Transfer Service (DTS)** with DAY partitioning and declarative `deployment.yaml` enables enterprise audit compliance and infinite multi-branch horizontal scaling.

---

## 3. Proposed Additions & Rules

### Rule: SQLite / Edge Database Concurrency Guardrails
1. **Never perform unbounded concurrent writes**: All writes in Express routes must pass through a lightweight priority-based write serialization queue (`writeQueue.enqueue(...)`) or batch atomic executions (`batchQueued`).
2. **Idempotency by Default**: State-changing collection entries and client disbursements must accept `X-Idempotency-Key` to avoid double-charging during mobile network reconnects.
3. **No Correlated Subqueries in Loops**: Replace nested subqueries with single-pass `LEFT JOIN (SELECT cycle_id, SUM(amount) FROM daily_collections GROUP BY cycle_id)` for sub-millisecond responses on large borrower tables.
4. **Mandatory Indexing Strategy**:
   - `clients`: `(company_id, sl_no)`, `(phone)`, `(name)`, `(client_code)`
   - `daily_collections`: `(cycle_id, day_number)`, `(company_id, collection_date)`
   - `loan_cycles`: `(company_id, month_year)`, `(client_id, status)`

### Skill Extension: BigQuery DTS Declarative Pipeline
When exporting edge ledger archives for cloud data warehousing:
1. Partition tables by `collection_date` using `DAY` partitioning.
2. Cluster by `(cycle_id, client_id)` or `(company_id, month_year)`.
3. Provide declarative `deployment.yaml` with source `google_cloud_storage` and destination `daily_finance_dw`.
