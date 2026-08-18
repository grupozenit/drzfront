"use client"

import { X, Download, Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudHail, Clock, Users, AlertTriangle, CheckCircle2, ListChecks, Image as ImageIcon, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WEATHER_LABELS, ACTIVITY_CATEGORIES, REPORT_STATUS_LABELS } from "@/lib/constants/activities"
import { formatDateLocal } from "@/lib/utils"
import type { DailyReport, WeatherType, ActivityCategory } from "@/lib/types"

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "")

interface ReportPreviewModalProps {
  report: DailyReport | null
  isOpen: boolean
  onClose: () => void
  onDownload: () => void
}

const WEATHER_ICONS: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4" />,
  cloudy: <Cloud className="w-4 h-4" />,
  rainy: <CloudRain className="w-4 h-4" />,
  stormy: <CloudLightning className="w-4 h-4" />,
  snow: <Snowflake className="w-4 h-4" />,
  hail: <CloudHail className="w-4 h-4" />,
}

const STATUS_COLORS: Record<string, string> = {
  enviado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  borrador: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  archivado: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-primary">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function getCategoryLabel(category: ActivityCategory): string {
  const cat = Object.values(ACTIVITY_CATEGORIES).find(c => c.id === category)
  return cat?.label ?? category
}

export function ReportPreviewModal({ report, isOpen, onClose, onDownload }: ReportPreviewModalProps) {
  if (!isOpen || !report) return null

  const formattedDate = formatDateLocal(report.date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const totalStaff = (report.directStaff ?? 0) + (report.indirectStaff ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl my-6 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-primary/5 rounded-t-xl">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status] ?? STATUS_COLORS.archivado}`}>
                {REPORT_STATUS_LABELS[report.status] ?? report.status}
              </span>
              {report.isHoliday && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Feriado
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-foreground leading-tight">{report.projectName}</h2>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Horario + Clima */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SectionTitle icon={<Clock className="w-4 h-4" />} title="Horario" />
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Entrada" value={report.entryTime} />
                <InfoItem label="Salida" value={report.exitTime} />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SectionTitle icon={WEATHER_ICONS[report.weather] ?? <Cloud className="w-4 h-4" />} title="Clima" />
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                {WEATHER_ICONS[report.weather]}
                {WEATHER_LABELS[report.weather] ?? report.weather}
              </p>
            </div>
          </div>

          {/* Personal */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <SectionTitle icon={<Users className="w-4 h-4" />} title="Personal en Sitio" />
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="Directo" value={report.directStaff ?? 0} />
              <InfoItem label="Indirecto" value={report.indirectStaff ?? 0} />
              <InfoItem label="Total" value={<span className="text-primary font-bold">{totalStaff}</span>} />
            </div>
          </div>

          {/* Horas Suspendidas */}
          {report.hasSuspendedHours && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30">
              <SectionTitle icon={<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />} title="Horas Suspendidas" />
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Horas" value={`${report.suspendedHours ?? 0} hs`} />
                <InfoItem label="Motivo" value={report.suspendedReason ?? "—"} />
              </div>
            </div>
          )}

          {/* Accidentes */}
          {report.hasAccident && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
              <SectionTitle icon={<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />} title="Accidente" />
              <div className="space-y-2">
                <InfoItem
                  label="Con lesionados"
                  value={report.accidentWithInjury ? "Sí" : "No"}
                />
                {report.accidentDescription && (
                  <InfoItem label="Descripción" value={report.accidentDescription} />
                )}
              </div>
            </div>
          )}

          {/* Actividades */}
          {report.activities && report.activities.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SectionTitle icon={<Briefcase className="w-4 h-4" />} title={`Actividades (${report.activities.length})`} />
              <div className="space-y-3">
                {report.activities.map((act, idx) => (
                  <div key={act.id ?? idx} className="p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {getCategoryLabel(act.category)}
                        </span>
                        {act.subActivity && (
                          <span className="ml-2 text-xs text-muted-foreground">{act.subActivity}</span>
                        )}
                      </div>
                      {act.quantity != null && (
                        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                          {act.quantity} {act.unit}
                        </span>
                      )}
                    </div>
                    {act.description && (
                      <p className="text-xs text-foreground mb-1">{act.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {act.location && <span>📍 {act.location}</span>}
                      {act.workers != null && act.workers > 0 && <span>👷 {act.workers} trabajadores</span>}
                      {act.observations && <span>📝 {act.observations}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tareas para mañana */}
          {report.tomorrowTasks && report.tomorrowTasks.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SectionTitle icon={<ListChecks className="w-4 h-4" />} title="Tareas para Mañana" />
              <ul className="space-y-1.5">
                {report.tomorrowTasks.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fotos */}
          {report.images && report.images.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SectionTitle icon={<ImageIcon className="w-4 h-4" />} title={`Fotos (${report.images.length})`} />
              <div className="grid grid-cols-3 gap-2">
                {report.images.map((url, idx) => {
                  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`
                  return (
                    <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity">
                      <img src={fullUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <div className="flex items-center gap-2">
            <Button onClick={onClose} variant="outline" className="text-sm bg-transparent">
              Cerrar
            </Button>
            <Button onClick={onDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm gap-2">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
