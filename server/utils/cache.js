/**
 * In-Memory High-Speed Response Cache with Tag-Based Invalidation
 * Provides < 1ms response times for concurrent users under heavy server traffic.
 */

export class FastCache {
  constructor(defaultTtlMs = 5 * 60 * 1000, maxEntries = 400) {
    this.store = new Map();
    this.staleStore = new Map();
    this.inFlight = new Map();
    this.revalidating = new Set();
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;

    // Periodic sweep for expired keys every 60 seconds (unref'd to not hold event loop)
    this.sweepInterval = setInterval(() => this.sweepExpired(), 60 * 1000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  sweepExpired() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      // Keep stale items for up to 2x TTL as SWR fallback before hard deletion
      if (now > item.expiresAt + item.ttlMs) {
        this.store.delete(key);
      }
    }
    // Limit staleStore size to prevent memory leaks
    if (this.staleStore.size > this.maxEntries * 2) {
      const keysToDelete = Array.from(this.staleStore.keys()).slice(0, this.maxEntries);
      for (const k of keysToDelete) this.staleStore.delete(k);
    }
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      // Stale - still usable as fallback, but get() returns null for strict callers
      return null;
    }
    // Re-insert to maintain LRU order
    this.store.delete(key);
    this.store.set(key, item);
    return item.data;
  }

  getStale(key) {
    if (this.staleStore.has(key)) {
      return this.staleStore.get(key);
    }
    const item = this.store.get(key);
    return item ? item.data : null;
  }

  set(key, data, ttlMs = this.defaultTtlMs, tags = []) {
    if (this.store.size >= this.maxEntries) {
      this.sweepExpired();
    }

    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      this.store.delete(oldestKey);
    }

    this.store.delete(key);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      ttlMs,
      tags: new Set(tags)
    });
    this.staleStore.set(key, data);
  }

  /**
   * Ultra-Fast Stale-While-Revalidate (SWR) with In-Flight Deduplication
   * - Serves cached data in < 1ms
   * - Deduplicates concurrent queries so only 1 network request hits Turso
   * - Falls back to stale data if network times out
   */
  async getOrFetch(key, fetcher, ttlMs = this.defaultTtlMs, tags = []) {
    const item = this.store.get(key);
    const now = Date.now();

    // 1. Fresh Cache Hit -> 0ms instant response
    if (item && now <= item.expiresAt) {
      return item.data;
    }

    // 2. Stale Cache Hit (TTL Expired) -> Return stale data instantly (< 1ms), revalidate in background!
    if (item && item.data) {
      if (!this.revalidating.has(key)) {
        this.revalidating.add(key);
        fetcher()
          .then(freshData => {
            if (freshData) this.set(key, freshData, ttlMs, tags);
          })
          .catch(err => {
            console.warn(`[SWR] Background refresh for ${key} notice:`, err.message);
          })
          .finally(() => {
            this.revalidating.delete(key);
          });
      }
      return item.data;
    }

    // 3. Cache Miss or Invalidation -> Deduplicate so concurrent requests only run 1 database query
    if (this.inFlight.has(key)) {
      return await this.inFlight.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData) {
          this.set(key, freshData, ttlMs, tags);
        }
        return freshData;
      } catch (err) {
        // If query failed or timed out but we have any older snapshot, return it instead of 500!
        const fallback = this.staleStore.get(key) || (item && item.data);
        if (fallback) {
          console.warn(`[SWR] Fetch failed, serving last-known-good snapshot for ${key}`);
          return fallback;
        }
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return await fetchPromise;
  }

  delete(key) {
    this.store.delete(key);
    this.staleStore.delete(key);
  }

  invalidateTag(tag) {
    for (const [key, item] of this.store.entries()) {
      if (item.tags.has(tag) || key.startsWith(tag)) {
        if (item.data) {
          this.staleStore.set(key, item.data);
        }
        // Remove from active store to force immediate fresh fetch on next read
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
    this.staleStore.clear();
  }
}

export const serverCache = new FastCache(5 * 60 * 1000, 400); // 5-minute default TTL, max 400 items
