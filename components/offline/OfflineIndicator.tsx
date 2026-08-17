"use client"

import { useEffect, useRef, useState } from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { useOfflineStatus } from "@/lib/hooks/useOfflineStatus"
import { syncPendingReports } from "@/lib/offline/sync"

/**
 * Indicador de estado offline/online con sincronización automática.
 * Al reconectarse, espera 3 segundos para que Clerk renueve el token antes de sincronizar.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, refreshPendingCount } = useOfflineStatus()
  const wasOfflineRef = useRef(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      return
    }

    // Acaba de reconectarse y tiene reportes pendientes
    if (wasOfflineRef.current && pendingCount > 0) {
      wasOfflineRef.current = false
      const timer = setTimeout(async () => {
        setIsSyncing(true)
        try {
          await syncPendingReports()
          await refreshPendingCount()
        } catch {
          // El usuario puede recargar para reintentar
        } finally {
          setIsSyncing(false)
        }
      }, 3000) // Delay para que Clerk renueve el token
      return () => clearTimeout(timer)
    }

    wasOfflineRef.current = false
  }, [isOnline, pendingCount, refreshPendingCount])

  // No mostrar nada si está online y sin pendientes ni sincronizando
  if (isOnline && pendingCount === 0 && !isSyncing) return null

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
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
            {pendingCount > 0
              ? ` · ${pendingCount} reporte${pendingCount !== 1 ? "s" : ""} pendiente${pendingCount !== 1 ? "s" : ""}`
              : ""}
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
          <span>
            Sincronizando {pendingCount} reporte{pendingCount !== 1 ? "s" : ""}…
          </span>
        </>
      )}
    </div>
  )
}
