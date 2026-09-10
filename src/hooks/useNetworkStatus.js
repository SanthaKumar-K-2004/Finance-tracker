import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, syncOfflineQueue } from '../utils/offlineSync';

export function useNetworkStatus(onSynced) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getOfflineQueue().length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.success && result.count > 0) {
        refreshPendingCount();
        if (onSynced) onSynced(result.count);
      }
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [isSyncing, onSynced, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check & periodic heartbeat
    const interval = setInterval(() => {
      refreshPendingCount();
      if (navigator.onLine && getOfflineQueue().length > 0) {
        triggerSync();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    refreshPendingCount,
    triggerSync
  };
}
