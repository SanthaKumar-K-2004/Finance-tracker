/**
 * In-Memory High-Speed Response Cache with Tag-Based Invalidation
 * Provides < 1ms response times for concurrent users under heavy server traffic.
 */

class FastCache {
  constructor(defaultTtlMs = 60 * 1000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, ttlMs = this.defaultTtlMs, tags = []) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      tags: new Set(tags)
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  // Invalidate all keys matching tags or prefixes (e.g. 'grid', 'months', 'dashboard')
  invalidateTag(tag) {
    for (const [key, item] of this.store.entries()) {
      if (item.tags.has(tag) || key.startsWith(tag)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

export const serverCache = new FastCache(2 * 60 * 1000); // 2-minute default TTL
