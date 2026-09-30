/**
 * High-Performance Idempotency Middleware
 * 
 * Ensures that identical payment submissions or creation requests
 * (e.g. from mobile devices retrying over poor 4G network)
 * do not result in duplicate transactions or double ledger deductions.
 */

class IdempotencyCache {
  constructor(ttlMs = 10 * 60 * 1000) { // 10 minutes cache
    this.cache = new Map();
    this.ttlMs = ttlMs;

    // Prune expired entries every 2 minutes
    this.pruneTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 2 * 60 * 1000);

    if (this.pruneTimer.unref) {
      this.pruneTimer.unref();
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item;
  }

  set(key, status, responseBody) {
    this.cache.set(key, {
      status,
      responseBody,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  hasInFlight(key) {
    const item = this.cache.get(key);
    return item && item.status === 'in_flight';
  }

  markInFlight(key) {
    this.cache.set(key, {
      status: 'in_flight',
      expiresAt: Date.now() + 30000 // 30s lock for in-flight requests
    });
  }
}

export const idempotencyStore = new IdempotencyCache();

/**
 * Express middleware to enforce idempotency on state-changing endpoints.
 * Triggered when request header 'X-Idempotency-Key' or 'Idempotency-Key' is provided.
 */
export function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
  if (!idempotencyKey || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);

  if (cached) {
    if (cached.status === 'in_flight') {
      return res.status(409).json({
        success: false,
        error: 'A request with this idempotency key is currently processing. Please wait.'
      });
    }

    // Return the previously computed response
    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
    return res.status(cached.status).json(cached.responseBody);
  }

  // Mark in-flight
  idempotencyStore.markInFlight(idempotencyKey);

  // Intercept res.json to capture response
  const originalJson = res.json;
  res.json = function (body) {
    idempotencyStore.set(idempotencyKey, res.statusCode, body);
    return originalJson.call(this, body);
  };

  next();
}
