'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '@/lib/offline/sync';

interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB puede no estar disponible en SSR
    }
  }, []);

  useEffect(() => {
    // Inicializar con el estado real del navegador
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Polling liviano para refrescar el contador de pendientes
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  return { isOnline, pendingCount, refreshPendingCount };
}
