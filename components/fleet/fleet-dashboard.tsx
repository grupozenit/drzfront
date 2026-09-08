"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Truck, Wrench, AlertTriangle, Navigation, Nfc, Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { ExpirationAlerts } from "./expiration-alerts"
import { AssetNotesModal } from "./asset-notes-modal"
import { machineryService, equipmentService } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import type { FleetDashboard as FleetDashboardData, FleetMaintenanceEntry, FleetOpenIncident } from "@/lib/types"

interface FleetDashboardProps {
  data: FleetDashboardData | null
  isLoading: boolean
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export function FleetDashboard({ data, isLoading }: FleetDashboardProps) {
  const [incidentNote, setIncidentNote] = useState<FleetOpenIncident | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localMaintenance, setLocalMaintenance] = useState<Record<string, string>>({})

  const maquinariaPorTipo = useMemo(
    () => (data?.porTipo.maquinaria || []).map((t) => ({ name: t.tipo, cantidad: t.cantidad })),
    [data]
  )
  const equiposPorTipo = useMemo(
    () => (data?.porTipo.equipos || []).map((t) => ({ name: t.tipo, cantidad: t.cantidad })),
    [data]
  )

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tablero de flota...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="p-8 bg-card border-border">
        <div className="text-center">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos disponibles</h3>
          <p className="text-sm text-muted-foreground">No se pudo cargar la información de flota.</p>
        </div>
      </Card>
    )
  }

  const handleQuickService = async (entry: FleetMaintenanceEntry, value: string) => {
    setSavingId(entry.id)
    try {
      if (entry.tipoActivo === "maquinaria") {
        await machineryService.update(entry.id, { ultimoService: value || null })
      } else {
        await equipmentService.update(entry.id, { ultimaMantencion: value || null })
      }
      setLocalMaintenance((prev) => ({ ...prev, [entry.id]: value }))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
      <AssetNotesModal
        assetType={incidentNote?.tipoActivo === "maquinaria" ? "maquinaria" : "equipo"}
        asset={
          incidentNote
            ? { id: incidentNote.activoId, codigoInterno: incidentNote.codigoInterno, tipo: incidentNote.tipo, marca: incidentNote.marca, modelo: incidentNote.modelo }
            : null
        }
        onClose={() => setIncidentNote(null)}
      />

      <div>
        <h2 className="text-lg md:text-xl font-bold text-foreground">Tablero de Flota</h2>
        <p className="text-muted-foreground mt-1 text-sm">Vista consolidada de maquinaria y equipos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Maquinaria</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Total" value={data.summary.maquinaria.total} />
            <StatTile label="Activas" value={data.summary.maquinaria.activas ?? 0} />
            <StatTile label="Disponibles" value={data.summary.maquinaria.disponibles} />
            <StatTile label="Asignadas" value={data.summary.maquinaria.asignadas ?? 0} />
            <StatTile label="Propias" value={data.summary.maquinaria.propias ?? 0} />
            <StatTile label="Subcontrato" value={data.summary.maquinaria.subcontrato ?? 0} />
          </div>
        </Card>
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Equipos</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Total" value={data.summary.equipos.total} />
            <StatTile label="Activos" value={data.summary.equipos.activos ?? 0} />
            <StatTile label="Disponibles" value={data.summary.equipos.disponibles} />
            <StatTile label="Asignados" value={data.summary.equipos.asignados ?? 0} />
            <StatTile label="Propios" value={data.summary.equipos.propios ?? 0} />
            <StatTile label="Alquilados" value={data.summary.equipos.alquilados ?? 0} />
          </div>
        </Card>
      </div>

      {/* RTO alerts */}
      <ExpirationAlerts alerts={data.rtoAlerts} />

      {/* Mantenimiento pendiente */}
      <Card className="p-4 md:p-6 bg-card border-border overflow-x-auto">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Mantenimiento Pendiente</h3>
        {data.mantenimientoPendiente.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin activos pendientes de mantenimiento.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-2 py-2">Código</th>
                <th className="text-left font-medium px-2 py-2">Tipo</th>
                <th className="text-left font-medium px-2 py-2">Marca / Modelo</th>
                <th className="text-left font-medium px-2 py-2">Última fecha</th>
                <th className="text-left font-medium px-2 py-2">Días</th>
              </tr>
            </thead>
            <tbody>
              {data.mantenimientoPendiente.map((entry) => {
                const currentValue = localMaintenance[entry.id] ?? entry.ultimaFecha ?? ""
                return (
                  <tr key={`${entry.tipoActivo}-${entry.id}`} className="border-t border-border">
                    <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">{entry.codigoInterno}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                      {entry.tipoActivo === "maquinaria" ? "Maquinaria" : "Equipo"} · {entry.tipo}
                    </td>
                    <td className="px-2 py-2 text-foreground whitespace-nowrap">{entry.marca} {entry.modelo}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DatePicker value={currentValue} onChange={(v) => handleQuickService(entry, v)} className="w-36" />
                        {savingId === entry.id && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {entry.diasDesde !== null ? `${entry.diasDesde}d` : "Sin registrar"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Distribución por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Maquinaria por Tipo</h3>
          {maquinariaPorTipo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maquinariaPorTipo} margin={{ top: 16, right: 10, left: -10, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#d68f2d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Equipos por Tipo</h3>
          {equiposPorTipo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equiposPorTipo} margin={{ top: 16, right: 10, left: -10, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Distribución por proyecto */}
      <Card className="p-4 md:p-6 bg-card border-border overflow-x-auto">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Distribución por Proyecto</h3>
        {data.porProyecto.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-2 py-2">Proyecto</th>
                <th className="text-left font-medium px-2 py-2">Maquinaria</th>
                <th className="text-left font-medium px-2 py-2">Equipos</th>
              </tr>
            </thead>
            <tbody>
              {data.porProyecto.map((p) => (
                <tr key={p.projectId || "none"} className="border-t border-border">
                  <td className="px-2 py-2 text-foreground whitespace-nowrap">{p.projectName}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{p.maquinaria}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{p.equipos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Choferes y vehículos */}
      <Card className="p-4 md:p-6 bg-card border-border overflow-x-auto">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Choferes y Vehículos</h3>
        {data.vehiculos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin vehículos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-2 py-2">Código</th>
                <th className="text-left font-medium px-2 py-2">Tipo</th>
                <th className="text-left font-medium px-2 py-2">Patente</th>
                <th className="text-left font-medium px-2 py-2">Chofer</th>
                <th className="text-left font-medium px-2 py-2">GPS</th>
                <th className="text-left font-medium px-2 py-2">Telepase</th>
                <th className="text-left font-medium px-2 py-2">Proyecto</th>
                <th className="text-left font-medium px-2 py-2">RTO/VTV</th>
              </tr>
            </thead>
            <tbody>
              {data.vehiculos.map((v) => (
                <tr
                  key={v.id}
                  className={`border-t border-border ${
                    v.rtoEstado === "vencido" || v.rtoEstado === "por_vencer" ? "bg-amber-50 dark:bg-amber-900/10" : ""
                  }`}
                >
                  <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">{v.codigoInterno}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{v.tipo}</td>
                  <td className="px-2 py-2 text-foreground whitespace-nowrap">{v.patente || "—"}</td>
                  <td className="px-2 py-2 text-foreground whitespace-nowrap">{v.choferResponsable || "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{v.tieneGps ? <Navigation className="w-3.5 h-3.5 text-primary" /> : "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{v.tieneTelepase ? <Nfc className="w-3.5 h-3.5 text-primary" /> : "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{v.proyectoName || "Sin asignar"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {v.rtoEstado === "vencido" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Vencido</span>
                    )}
                    {v.rtoEstado === "por_vencer" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        En {v.rtoDiasRestantes}d
                      </span>
                    )}
                    {v.rtoEstado === "vigente" && <span className="text-xs text-muted-foreground">Vigente</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Incidencias abiertas */}
      <Card className="p-4 md:p-6 bg-card border-border overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm md:text-base font-semibold text-foreground">Incidencias Abiertas</h3>
        </div>
        {data.incidenciasAbiertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin incidencias abiertas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-2 py-2">Activo</th>
                <th className="text-left font-medium px-2 py-2">Proyecto</th>
                <th className="text-left font-medium px-2 py-2">Tipo</th>
                <th className="text-left font-medium px-2 py-2">Fecha</th>
                <th className="text-left font-medium px-2 py-2">Días</th>
                <th className="text-left font-medium px-2 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {data.incidenciasAbiertas.map((inc) => (
                <tr
                  key={inc.noteId}
                  onClick={() => setIncidentNote(inc)}
                  className={`border-t border-border cursor-pointer hover:bg-muted/50 ${
                    inc.diasAbierta > 30 ? "bg-red-50 dark:bg-red-900/10" : ""
                  }`}
                >
                  <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">
                    {inc.codigoInterno} — {inc.tipo}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{inc.proyectoName || "Sin asignar"}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{inc.noteTipo}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{formatDateLocal(inc.fecha)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{inc.diasAbierta}d</td>
                  <td className="px-2 py-2 text-muted-foreground max-w-xs truncate">{inc.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
