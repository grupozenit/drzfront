'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, getRejectedReports } from '@/lib/offline/sync';
import type { OfflinePendingReport } from '@/lib/offline/db';

interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  // Rechazados por el servidor: no cuentan como pendientes porque no se
  // reintentan solos, pero el usuario tiene que verlos para no perderlos
  rejectedReports: OfflinePendingReport[];
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedReports, setRejectedReports] = useState<OfflinePendingReport[]>([]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [count, rejected] = await Promise.all([getPendingCount(), getRejectedReports()]);
      setPendingCount(count);
      setRejectedReports(rejected);
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

  return { isOnline, pendingCount, rejectedReports, refreshPendingCount };
}
