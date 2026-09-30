---
description: High-concurrency guardrails, write-lock prevention, and ledger integrity rules for SQLite and Turso microfinance databases.
---

# 🛡️ High-Concurrency & Ledger Integrity Guardrails

## 1. Zero-Lock Concurrent Writes (No SQLITE_BUSY)
- **Never execute unbounded parallel writes**: In multi-user field environments where dozens of collectors submit collections simultaneously, direct parallel writes cause database lock contention (`SQLITE_BUSY: database is locked`).
- **Use the Write Serialization Queue**: All state-changing write operations (`INSERT`, `UPDATE`, `DELETE`) on SQLite / Turso databases must be routed through `writeQueue.enqueue(...)` or batched using `executeQueued()` and `batchQueued()`.
- **Atomic Transactions for Multi-Step Workflows**: Compound operations such as:
  - Client Creation + Cycle Creation
  - 1-Click Client Closure + Ledger Archiving
  - Month-End Rollover
  - Resetting Client Collections
  must be executed in an atomic batch (`batchQueued`) so partial database state corruption is impossible.

## 2. Idempotency by Default for Mobile & Field POS
- All state-changing financial payment endpoints (`/api/collections/entry`, `/api/clients`) must support `X-Idempotency-Key` or `Idempotency-Key`.
- When field agents collect payments over unstable mobile networks (4G/3G in rural Tamil Nadu villages), network reconnect retries must return the original cached response with `X-Cache-Lookup: IDEMPOTENT_HIT` without double-crediting or creating duplicate payments.

## 3. Query Optimization for Large Borrower Datasets (10,000+ Records)
- **Eliminate Correlated Subqueries in Loops**: Never write queries with correlated scalar subqueries per row (e.g. `(SELECT SUM(amount) FROM daily_collections WHERE cycle_id = lc.id)` inside a client loop).
- **Use Grouped JOIN Aggregation**: Group collections in a single subquery join:
  ```sql
  LEFT JOIN (
    SELECT cycle_id, SUM(amount) as total_collected
    FROM daily_collections
    GROUP BY cycle_id
  ) dc_sum ON dc_sum.cycle_id = lc.id
  ```
- **Universal Indexed Search**: Universal search across Name, Phone, Address, Serial Number, and Client Code must use parameterized prefix patterns (`%term%`) backed by dedicated indexes:
  - `idx_clients_phone` on `clients(phone)`
  - `idx_clients_name` on `clients(name)`
  - `idx_clients_code` on `clients(client_code)`
  - `idx_daily_collections_cycle_day` on `daily_collections(cycle_id, day_number)`
  - `idx_daily_collections_comp_date` on `daily_collections(company_id, collection_date)`
