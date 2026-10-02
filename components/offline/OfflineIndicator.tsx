"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOfflineStatus } from "@/lib/hooks/useOfflineStatus"
import {
  discardRejectedReport,
  retryRejectedReport,
  syncPendingReports,
} from "@/lib/offline/sync"

/** "2026-10-02" → "02/10/2026", sin pasar por Date (evita el corrimiento de zona horaria). */
function formatReportDate(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "")
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "sin fecha"
}

/**
 * Indicador de estado offline/online con sincronización automática.
 * Al reconectarse, espera 3 segundos para que Clerk renueve el token antes de sincronizar.
 *
 * También muestra los partes guardados sin conexión que el servidor rechazó:
 * no se reintentan solos, así que el usuario tiene que enterarse del motivo y
 * decidir si los reintenta o los descarta.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, rejectedReports, refreshPendingCount } = useOfflineStatus()
  const wasOfflineRef = useRef(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const runSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      await syncPendingReports()
    } catch {
      // El usuario puede reintentar desde el indicador
    } finally {
      await refreshPendingCount()
      setIsSyncing(false)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      return
    }

    // Acaba de reconectarse y tiene reportes pendientes
    if (wasOfflineRef.current && pendingCount > 0) {
      wasOfflineRef.current = false
      const timer = setTimeout(runSync, 3000) // Delay para que Clerk renueve el token
      return () => clearTimeout(timer)
    }

    wasOfflineRef.current = false
  }, [isOnline, pendingCount, runSync])

  const handleRetryRejected = async (id: string) => {
    await retryRejectedReport(id)
    await refreshPendingCount()
    if (isOnline) await runSync()
  }

  const handleDiscardRejected = async (id: string, date: string) => {
    const confirmed = window.confirm(
      `¿Descartar el parte del ${date}? Se borra de este dispositivo y no se puede recuperar.`,
    )
    if (!confirmed) return
    await discardRejectedReport(id)
    await refreshPendingCount()
  }

  const hasRejected = rejectedReports.length > 0
  if (isOnline && pendingCount === 0 && !isSyncing && !hasRejected) return null

  const plural = pendingCount !== 1 ? "s" : ""

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 flex flex-col gap-2">
      {hasRejected && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-lg shadow-lg text-sm border bg-destructive/10 border-destructive/30 text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {rejectedReports.length === 1
                ? "Un parte guardado sin conexión fue rechazado"
                : `${rejectedReports.length} partes guardados sin conexión fueron rechazados`}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {rejectedReports.map((report) => {
              const date = formatReportDate(report.data.date)
              return (
                <li key={report.id} className="flex flex-col gap-1">
                  <span className="text-foreground">
                    Parte del {date}: {report.errorMessage ?? "Error desconocido"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isOnline || isSyncing}
                      onClick={() => handleRetryRejected(report.id)}
                    >
                      Reintentar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSyncing}
                      onClick={() => handleDiscardRejected(report.id, date)}
                    >
                      Descartar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
            !isOnline
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                Sin conexión
                {pendingCount > 0 ? ` · ${pendingCount} reporte${plural} pendiente${plural}` : ""}
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              <span>Sincronizando {pendingCount} reporte{plural}…</span>
            </>
          ) : (
            <>
              {/* Quedaron en cola tras una falla transitoria (servidor caído, red) */}
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="flex-1">
                {pendingCount} reporte{plural} sin sincronizar
              </span>
              <Button size="sm" variant="outline" onClick={runSync}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
