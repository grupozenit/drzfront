"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download, Trash2, Loader2, CalendarCheck, RefreshCw,
  ChevronDown, AlertCircle, FileSpreadsheet, Plus,
} from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWeeklyReports } from "@/lib/hooks"
import { useProjects, usePermissions } from "@/lib/hooks"
import { weeklyReportsService } from "@/lib/api/weekly-reports"
import type { WeeklyReport, WeeklyReportFilters } from "@/lib/types"

// ─── Secciones de Excel ──────────────────────────────────────────────────────

// Tienen que coincidir con ALL_SECTIONS de src/services/weekly_excel_generator.py:
// el backend ignora una sección desconocida, así que un nombre viejo no rompe
// la descarga, simplemente no trae esa hoja.
const EXCEL_SECTIONS = [
  { key: "resumen", label: "Resumen General" },
  { key: "curva_s", label: "Curva S" },
  { key: "actividades", label: "Avance por Actividad" },
  { key: "items", label: "Detalle por Ítem" },
  { key: "personal", label: "Personal" },
  { key: "horas", label: "Horas Trabajadas" },
  { key: "maquinaria", label: "Maquinaria" },
  { key: "equipos", label: "Equipos" },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}

function formatISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function getWeekRange(date: Date): { startDate: string; endDate: string } {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { startDate: formatISODate(monday), endDate: formatISODate(sunday) }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function WeeklyReportHistory() {
  const [filterProject, setFilterProject] = useState("todos")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<WeeklyReport | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [exportReport, setExportReport] = useState<WeeklyReport | null>(null)
  const [exportSections, setExportSections] = useState<string[]>(EXCEL_SECTIONS.map(s => s.key))
  const [isExporting, setIsExporting] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genProjectId, setGenProjectId] = useState("")
  const [genStartDate, setGenStartDate] = useState("")
  const [genEndDate, setGenEndDate] = useState("")

  const { toasts, success, error: showError, removeToast } = useToast()

  const { projects, loadProjects } = useProjects()
  const {
    reports,
    total,
    isLoading,
    isGenerating,
    error,
    loadReports,
    generateReport,
    downloadPDF,
    deleteReport,
  } = useWeeklyReports()
  const { can } = usePermissions()
  const canCreate = can("reportes_semanales", "create")
  const canUpdate = can("reportes_semanales", "update")
  const canDelete = can("reportes_semanales", "delete")

  useEffect(() => {
    loadProjects()
    loadReports()
  }, [])

  // Recargar al cambiar filtros
  useEffect(() => {
    const filters: WeeklyReportFilters = {}
    if (filterProject !== "todos") filters.projectId = filterProject
    loadReports(filters)
  }, [filterProject])

  const handleGenerate = async () => {
    if (!genProjectId || !genStartDate || !genEndDate) return
    try {
      await generateReport(genProjectId, genStartDate, genEndDate)
      success("Reporte generado", "El reporte semanal fue generado correctamente")
      setShowGenerate(false)
      setGenProjectId("")
      setGenStartDate("")
      setGenEndDate("")
      const filters: WeeklyReportFilters = {}
      if (filterProject !== "todos") filters.projectId = filterProject
      loadReports(filters)
    } catch (e: any) {
      showError("Error", e.message || "Error al generar el reporte")
    }
  }

  const handleRegenerate = async (report: WeeklyReport) => {
    try {
      const { startDate, endDate } = getWeekRange(new Date(report.startDate + "T12:00:00"))
      await generateReport(report.projectId, startDate, endDate, true)
      success("Reporte regenerado", "El reporte semanal fue regenerado correctamente")
    } catch (e: any) {
      showError("Error", e.message || "Error al regenerar el reporte")
    }
  }

  const handleDownload = async (report: WeeklyReport) => {
    setDownloadingId(report.id)
    try {
      await downloadPDF(report.id)
    } catch (e: any) {
      showError("Error", e.message || "Error al descargar el PDF")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async () => {
    if (!reportToDelete) return
    try {
      await deleteReport(reportToDelete.id)
      success("Reporte eliminado", "El reporte se ha eliminado correctamente")
    } catch (e: any) {
      showError("Error", e.message || "Error al eliminar el reporte")
    } finally {
      setReportToDelete(null)
    }
  }

  const handleExportExcel = async () => {
    if (!exportReport || exportSections.length === 0) return
    setIsExporting(true)
    try {
      await weeklyReportsService.exportExcel(exportReport.id, exportSections)
      success("Excel exportado", "El archivo se descargó correctamente")
    } catch (e: any) {
      showError("Error", e.message || "Error al exportar Excel")
    } finally {
      setIsExporting(false)
      setExportReport(null)
    }
  }

  const toggleExportSection = (key: string) => {
    setExportSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <Dialog
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Reporte Semanal"
        message={`¿Estás seguro de que deseas eliminar el reporte de la Semana ${reportToDelete?.weekNumber} del proyecto "${reportToDelete?.projectName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Modal de generación manual */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGenerate(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground mb-1">Generar Reporte Semanal</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Seleccioná el proyecto y el rango de fechas de la semana a reportar.
            </p>
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5">Proyecto</label>
                <Select value={genProjectId} onValueChange={setGenProjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccioná un proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5">Fecha inicio</label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={e => setGenStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-foreground block mb-1.5">Fecha fin</label>
                  <input
                    type="date"
                    value={genEndDate}
                    onChange={e => setGenEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowGenerate(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!genProjectId || !genStartDate || !genEndDate || isGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Generando...</>
                  : <><Plus className="w-4 h-4 mr-1.5" /> Generar</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exportación Excel */}
      {exportReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExportReport(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground mb-1">Exportar a Excel</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {exportReport.reportNumber != null ? `Informe N° ${String(exportReport.reportNumber).padStart(3, "0")} · ` : ""}
              Sem {exportReport.weekNumber} / {exportReport.year} — {exportReport.projectName}
            </p>
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-foreground">Seleccioná las secciones a incluir:</p>
              <div className="grid grid-cols-2 gap-2">
                {EXCEL_SECTIONS.map(section => (
                  <label key={section.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.includes(section.key)}
                      onChange={() => toggleExportSection(section.key)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-foreground">{section.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setExportSections(EXCEL_SECTIONS.map(s => s.key))}
                  className="text-[10px] text-primary hover:underline"
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  onClick={() => setExportSections([])}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  Deseleccionar todo
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setExportReport(null)} disabled={isExporting}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || exportSections.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isExporting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exportando...</>
                ) : (
                  <><FileSpreadsheet className="w-4 h-4 mr-1.5" /> Exportar</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Reportes Semanales</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {total} reporte{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          {canCreate && (
            <Button
              size="sm"
              onClick={() => setShowGenerate(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground self-start md:self-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Generar Reporte
            </Button>
          )}
        </div>

        {/* Filtros — estilo análogo a Reportes Diarios */}
        <Card className="p-3 md:p-4 bg-card border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 w-full">
            {/* Project Filter Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowProjectFilter(!showProjectFilter)}
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span>Proyecto</span>
                {filterProject !== "todos" && (
                  <span className="hidden md:inline px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary truncate max-w-[120px]">
                    {projects.find(p => p.id === filterProject)?.name || filterProject}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showProjectFilter ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Limpiar filtros */}
            {filterProject !== "todos" && (
              <div className="col-span-1 flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterProject("todos")}
                  className="text-xs md:text-sm bg-transparent hover:bg-primary hover:text-primary-foreground"
                >
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>

          {/* Opciones expandibles del filtro de proyecto */}
          {showProjectFilter && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setFilterProject("todos"); setShowProjectFilter(false) }}
                  className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                    filterProject === "todos"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  Todos los proyectos
                </button>
                {(projects || []).map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setFilterProject(p.id); setShowProjectFilter(false) }}
                    className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                      filterProject === p.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Contenido */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando reportes...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin reportes semanales</h3>
              <p className="text-sm text-muted-foreground">
                Se generan automáticamente cada domingo a las 21:00 hs (Argentina).
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="hidden md:block">
              <Card className="bg-card border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">N° Informe</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Semana</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Período</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Proyecto</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Avance Total</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Δ Semanal</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            {report.reportNumber != null
                              ? `N° ${String(report.reportNumber).padStart(3, "0")}`
                              : "s/n"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          Sem {report.weekNumber} / {report.year}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {report.startDate} → {report.endDate}
                        </td>
                        <td className="py-3 px-4 text-foreground max-w-[200px] truncate">
                          {report.projectName}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-primary">{report.overallProgress.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={report.weeklyProgress >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {report.weeklyProgress >= 0 ? "+" : ""}{report.weeklyProgress.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(report)}
                              disabled={!report.pdfUrl || downloadingId === report.id}
                              title="Descargar PDF"
                              className="p-1.5 rounded hover:bg-primary/10 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              {downloadingId === report.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />
                              }
                            </button>
                            <button
                              onClick={() => { setExportSections(EXCEL_SECTIONS.map(s => s.key)); setExportReport(report) }}
                              title="Exportar Excel"
                              className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            {canUpdate && (
                              <button
                                onClick={() => handleRegenerate(report)}
                                title="Regenerar"
                                disabled={isGenerating}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setReportToDelete(report)}
                                title="Eliminar"
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden space-y-3">
              {reports.map(report => (
                <Card key={report.id} className="p-4 bg-card border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                          {report.reportNumber != null
                            ? `N° ${String(report.reportNumber).padStart(3, "0")}`
                            : "s/n"}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          Semana {report.weekNumber} / {report.year}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{report.projectName}</p>
                      <p className="text-xs text-muted-foreground">{report.startDate} → {report.endDate}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-lg font-bold text-primary">{report.overallProgress.toFixed(1)}%</span>
                      <span className={`text-xs font-medium ${report.weeklyProgress >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {report.weeklyProgress >= 0 ? "+" : ""}{report.weeklyProgress.toFixed(1)}% sem.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={!report.pdfUrl || downloadingId === report.id}
                      onClick={() => handleDownload(report)}
                    >
                      {downloadingId === report.id
                        ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        : <Download className="w-4 h-4 mr-1.5" />
                      }
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600"
                      onClick={() => { setExportSections(EXCEL_SECTIONS.map(s => s.key)); setExportReport(report) }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </Button>
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isGenerating}
                        onClick={() => handleRegenerate(report)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => setReportToDelete(report)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
