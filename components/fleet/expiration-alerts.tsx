"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Loader2 } from "lucide-react"
import { machineryService } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import type { MachineryExpirationAlert, MachineryExpirationKind } from "@/lib/types"

const KIND_LABELS: Record<MachineryExpirationKind, string> = {
  rto: "RTO/VTV",
  certificacion: "Certificación",
}

interface ExpirationAlertsProps {
  alerts?: MachineryExpirationAlert[]
}

export function ExpirationAlerts({ alerts: initialAlerts }: ExpirationAlertsProps) {
  const [alerts, setAlerts] = useState<MachineryExpirationAlert[]>(initialAlerts || [])
  const [loading, setLoading] = useState(!initialAlerts)

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts)
      return
    }
    setLoading(true)
    machineryService
      .getExpirationAlerts(30)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [initialAlerts])

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    )
  }

  if (alerts.length === 0) return null

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <h3 className="text-sm md:text-base font-semibold text-foreground">
          Próximos Vencimientos de Maquinaria
        </h3>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          // Una misma máquina puede traer una fila por vencimiento: la clave
          // estable es (id, tipoVencimiento), no el id solo.
          <div
            key={`${alert.id}-${alert.tipoVencimiento}`}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {alert.codigoInterno ? `${alert.codigoInterno} — ` : ""}
                {alert.tipo} {alert.patente ? `(${alert.patente})` : ""}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {KIND_LABELS[alert.tipoVencimiento]}
                {alert.choferResponsable ? ` · ${alert.choferResponsable}` : ""}
                {` · ${alert.proyectoName || "Sin asignar"}`}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  alert.estado === "vencido"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {alert.estado === "vencido" ? "Vencido" : `En ${alert.diasRestantes} días`}
              </span>
              {alert.vencimiento && (
                <p className="text-[10px] text-muted-foreground mt-1">{formatDateLocal(alert.vencimiento)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
