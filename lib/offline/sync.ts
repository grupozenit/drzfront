'use client';

import { offlineDb, offlineImagesToFiles, type OfflinePendingReport } from './db';
import { reportsService } from '@/lib/api';
import { CIRCUIT_OPEN_CODE, httpStatusOf, isServiceFailure } from '@/lib/api/resilience';

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
 * Reportes que el servidor rechazó y no se van a reintentar solos.
 */
export async function getRejectedReports(): Promise<OfflinePendingReport[]> {
  try {
    return await offlineDb.pendingReports.where('status').equals('rejected').sortBy('createdAt');
  } catch {
    return [];
  }
}

/** Vuelve a poner en cola un reporte rechazado (p. ej. tras un arreglo en el servidor). */
export async function retryRejectedReport(id: string): Promise<void> {
  await offlineDb.pendingReports.update(id, { status: 'pending' });
}

/** Borra definitivamente un reporte rechazado. Lo decide el usuario, nunca el sync. */
export async function discardRejectedReport(id: string): Promise<void> {
  await offlineDb.pendingReports.delete(id);
}

/**
 * ¿El servidor rechazó el reporte por su contenido?
 *
 * 401 (token todavía no renovado al reconectar), 408 y 429 son transitorios;
 * el resto de los 4xx va a dar lo mismo cada vez. Reintentarlos para siempre
 * no arregla nada y antes, además, abría el circuit breaker de POST /reports
 * y bloqueaba los partes nuevos del usuario.
 */
function isPermanentRejection(error: unknown): boolean {
  const status = httpStatusOf(error);
  return status !== null && status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

function messageOf(error: unknown): string {
  const message = (error as { message?: unknown })?.message;
  return typeof message === 'string' && message ? message.slice(0, 500) : 'Error desconocido';
}

// OfflineIndicator y useOfflineReports pueden disparar el sync a la vez: sin
// este candado el mismo reporte se subía dos veces.
let syncInProgress = false;

/**
 * Sincroniza todos los reportes pendientes con el API.
 * Los fallidos por causas transitorias se reintentan; los rechazados no.
 */
export async function syncPendingReports(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const pending = await offlineDb.pendingReports
      .where('status')
      .anyOf('pending', 'failed')
      .sortBy('createdAt');

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
          status: isPermanentRejection(error) ? 'rejected' : 'failed',
          errorMessage: messageOf(error),
        });

        // Servidor caído, sin red o circuito abierto: seguir solo suma fallas.
        // Los que quedan siguen en cola para el próximo intento.
        const circuitOpen = (error as { code?: unknown })?.code === CIRCUIT_OPEN_CODE;
        if (circuitOpen || isServiceFailure(error)) break;
      }
    }
  } finally {
    syncInProgress = false;
  }
}
