'use client';

import { useCallback, useRef } from 'react';
import { useReports } from './useReports';
import { useOfflineStatus } from './useOfflineStatus';
import {
  offlineDb,
  generateOfflineId,
  filesToOfflineImages,
} from '@/lib/offline/db';
import { syncPendingReports } from '@/lib/offline/sync';
import type { CreateReportDTO, DailyReport } from '@/lib/types';

interface UseOfflineReportsReturn extends ReturnType<typeof useReports> {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  saveOffline: (data: CreateReportDTO) => Promise<{ offlineId: string }>;
}

export function useOfflineReports(options?: { projectId?: string; autoLoad?: boolean }): UseOfflineReportsReturn {
  const reportsHook = useReports(options);
  const { isOnline, pendingCount, refreshPendingCount } = useOfflineStatus();
  const isSyncingRef = useRef(false);
  const isSyncingState = useRef(false);

  // Guarda un reporte en la cola offline (sin conexión)
  const saveOffline = useCallback(async (data: CreateReportDTO): Promise<{ offlineId: string }> => {
    const id = generateOfflineId();
    const images = data.images ? await filesToOfflineImages(data.images) : [];
    const { images: _images, ...dataWithoutImages } = data;

    await offlineDb.pendingReports.add({
      id,
      data: dataWithoutImages,
      images,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
    });

    await refreshPendingCount();
    return { offlineId: id };
  }, [refreshPendingCount]);

  // Sincronizar reportes pendientes
  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !isOnline) return;
    isSyncingRef.current = true;
    isSyncingState.current = true;

    try {
      await syncPendingReports();
      await refreshPendingCount();
      // Recargar la lista de reportes para mostrar los recién sincronizados
      await reportsHook.loadReports();
    } finally {
      isSyncingRef.current = false;
      isSyncingState.current = false;
    }
  }, [isOnline, refreshPendingCount, reportsHook]);

  // El sync automático al reconectar lo maneja OfflineIndicator con el delay
  // adecuado para que Clerk tenga tiempo de renovar el token. No disparar aquí.

  // createReport offline-aware: si no hay conexión, encola localmente
  const createReport = useCallback(async (data: CreateReportDTO): Promise<DailyReport> => {
    if (!isOnline) {
      await saveOffline(data);
      // Retornamos un objeto local que sirve como confirmación visual
      return {
        id: generateOfflineId(),
        projectId: data.projectId,
        projectName: '',
        date: data.date,
        isHoliday: data.isHoliday,
        entryTime: data.entryTime,
        exitTime: data.exitTime,
        indirectStaff: data.indirectStaff,
        directStaff: data.directStaff,
        machineryCount: data.machineryCount,
        weather: data.weather,
        hasSuspendedHours: data.hasSuspendedHours,
        suspendedHours: data.suspendedHours,
        suspendedReason: data.suspendedReason,
        hasAccident: data.hasAccident,
        accidentWithInjury: data.accidentWithInjury,
        accidentDescription: data.accidentDescription,
        activities: data.activities.map((a, i) => ({ ...a, id: `local-${i}` })),
        tomorrowTasks: data.tomorrowTasks,
        images: [],
        status: data.status,
        // El correlativo lo asigna el backend: un reporte offline todavía no tiene
        reportNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '',
      } as DailyReport;
    }
    return reportsHook.createReport(data);
  }, [isOnline, saveOffline, reportsHook]);

  // saveDraft offline-aware
  const saveDraft = useCallback(async (data: CreateReportDTO): Promise<DailyReport> => {
    return createReport({ ...data, status: 'borrador' });
  }, [createReport]);

  return {
    ...reportsHook,
    createReport,
    saveDraft,
    isOnline,
    pendingCount,
    isSyncing: isSyncingState.current,
    triggerSync,
    saveOffline,
  };
}
