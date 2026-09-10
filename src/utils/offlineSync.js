/**
 * ALR Finance — Offline Resilience & Low-Network Sync Engine
 * Caches ledger grid data locally for 0ms loads and queues field collections when offline.
 */

const QUEUE_KEY = 'alr_offline_payment_queue';
const CACHE_PREFIX = 'alr_cache_grid_';

// 1. Grid Cache Management
export function saveGridCache(monthYear, data) {
  try {
    if (!monthYear || !data) return;
    localStorage.setItem(`${CACHE_PREFIX}${monthYear}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    console.warn('Failed to write local grid cache:', err);
  }
}

export function getGridCache(monthYear) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${monthYear}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch (err) {
    return null;
  }
}

// 2. Offline Queue Management
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function queueOfflinePayment(entry) {
  try {
    const queue = getOfflineQueue();
    // Dedup by cycle_id and day
    const filtered = queue.filter(
      item => !(item.cycle_id === entry.cycle_id && item.day === entry.day)
    );
    filtered.push({
      ...entry,
      queued_at: new Date().toISOString()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    return filtered.length;
  } catch (err) {
    console.error('Failed to queue offline payment:', err);
    return 0;
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// 3. Auto-drain queue when back online
export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: true, count: 0 };

  try {
    const res = await fetch('/api/collections/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: queue.map(item => ({
          cycle_id: item.cycle_id,
          client_id: item.client_id,
          day: item.day,
          day_number: item.day,
          amount: item.amount,
          payment_mode: item.payment_mode || 'cash'
        }))
      })
    });

    const data = await res.json();
    if (data.success) {
      clearOfflineQueue();
      return { success: true, count: queue.length };
    }
    return { success: false, error: data.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
