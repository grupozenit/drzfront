'use client';

import { offlineDb, offlineImagesToFiles } from './db';
import { reportsService } from '@/lib/api';

/**
 * Retorna la cantidad de reportes pendientes de sincronizar.
 */
export async function getPendingCount(): Promise<number> {
  try {
    return await offlineDb.pendingReports
      .where('status')
      .anyOf('pending', 'failed')
      .count();
  } catch {
    return 0;
  }
}

/**
 * Sincroniza todos los reportes pendientes con el API.
 * Los reportes fallidos previos también se reintentarán.
 */
export async function syncPendingReports(): Promise<void> {
  const pending = await offlineDb.pendingReports
    .where('status')
    .anyOf('pending', 'failed')
    .toArray();

  for (const report of pending) {
    try {
      await offlineDb.pendingReports.update(report.id, {
        status: 'syncing',
        attempts: report.attempts + 1,
      });

      const images = offlineImagesToFiles(report.images);
      await reportsService.create({ ...report.data, images: images.length > 0 ? images : undefined });

      await offlineDb.pendingReports.delete(report.id);
    } catch (error) {
      await offlineDb.pendingReports.update(report.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
