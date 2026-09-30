/**
 * Lock-Free Concurrency Write Queue for SQLite & Turso Cloud
 * 
 * Prevents SQLITE_BUSY and database lock contention when dozens of field agents
 * or cashier terminals record payments, add clients, or run rollover transactions simultaneously.
 */

class WriteQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.stats = {
      totalQueued: 0,
      totalExecuted: 0,
      maxQueueDepth: 0,
      lockConflictsResolved: 0
    };
  }

  /**
   * Enqueue a write task (function returning a promise).
   * Resolves or rejects the caller's promise when the write completes.
   * @param {Function} task - Async function performing the DB write
   * @param {number} priority - Higher priority runs first (default 0)
   * @returns {Promise<any>}
   */
  enqueue(task, priority = 0) {
    return new Promise((resolve, reject) => {
      this.stats.totalQueued++;
      this.queue.push({ task, priority, resolve, reject, enqueuedAt: Date.now() });

      if (this.queue.length > this.stats.maxQueueDepth) {
        this.stats.maxQueueDepth = this.queue.length;
      }

      // Sort by priority descending if multiple items queued
      if (this.queue.length > 1 && priority > 0) {
        this.queue.sort((a, b) => b.priority - a.priority);
      }

      this.processNext();
    });
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      this.stats.totalExecuted++;
      resolve(result);
    } catch (err) {
      // If error is transient lock, allow 1 quick internal retry
      const isLock = err.message && (err.message.includes('busy') || err.message.includes('locked'));
      if (isLock) {
        this.stats.lockConflictsResolved++;
        try {
          await new Promise(r => setTimeout(r, 50));
          const retryResult = await task();
          this.stats.totalExecuted++;
          resolve(retryResult);
        } catch (retryErr) {
          reject(retryErr);
        }
      } else {
        reject(err);
      }
    } finally {
      this.isProcessing = false;
      // Immediately schedule next microtask
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      currentQueueLength: this.queue.length,
      isProcessing: this.isProcessing
    };
  }
}

export const writeQueue = new WriteQueue();
