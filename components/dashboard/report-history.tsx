"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DailyReportForm } from "@/components/forms/daily-report-form"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ChevronDown, Loader2, FileText, Eye, Download, Share2, Mail, MessageCircle, Edit, Trash2 } from "lucide-react"
import { ReportPreviewModal } from "@/components/dashboard/report-preview-modal"
import { useReports } from "@/lib/hooks/useReports"
import { useProjects, usePermissions } from "@/lib/hooks"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Dialog } from "@/components/ui/dialog"
import { ACTIVITY_CATEGORIES, REPORT_STATUS_LABELS } from "@/lib/constants/activities"
import type { DailyReport, ReportFilters } from "@/lib/types"
import { formatDateLocal } from "@/lib/utils"

// Categorías de actividades para filtros
const activityCategories = Object.values(ACTIVITY_CATEGORIES)
  .filter(cat => !cat.isCustom)
  .map(cat => ({ id: cat.id, label: cat.label }))

export function ReportHistory() {
  const [showNewReportForm, setShowNewReportForm] = useState(false)
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [showActivityFilter, setShowActivityFilter] = useState(false)
  const [filterProject, setFilterProject] = useState("todos")
  const [filterActivity, setFilterActivity] = useState("todas")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  
  // Estados para diálogos
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [selectedReportForEmail, setSelectedReportForEmail] = useState<DailyReport | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedReportForDelete, setSelectedReportForDelete] = useState<DailyReport | null>(null)
  const [reportToEdit, setReportToEdit] = useState<DailyReport | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<DailyReport | null>(null)
  
  // Toast
  const { toasts, success, error: showError, removeToast } = useToast()

  // Hooks de datos
  const { projects, loadProjects } = useProjects()
  const {
    reports,
    isLoading,
    error,
    loadReports,
    generatePDF,
    sendEmail,
    shareWhatsApp,
    deleteReport,
  } = useReports()
  const { can } = usePermissions()
  const canCreate = can("reportes", "create")
  const canUpdate = can("reportes", "update")
  const canDelete = can("reportes", "delete")

  // Cargar datos iniciales
  useEffect(() => {
    loadProjects()
    loadReports()
  }, [])

  // Recargar reportes cuando cambian los filtros
  useEffect(() => {
    const filters: ReportFilters = {}
    
    if (filterProject !== "todos") {
      filters.projectId = filterProject
    }
    if (filterActivity !== "todas") {
      filters.activityCategory = filterActivity as ReportFilters["activityCategory"]
    }
    if (filterStartDate) {
      filters.startDate = filterStartDate
    }
    if (filterEndDate) {
      filters.endDate = filterEndDate
    }

    loadReports(filters)
  }, [filterProject, filterActivity, filterStartDate, filterEndDate])

  // Filtrar reportes localmente también (por si el backend no soporta todos los filtros)
  const filteredReports = reports.filter((report) => {
    const matchesProject = filterProject === "todos" || report.projectId === filterProject
    // Comparar fechas directamente como strings (YYYY-MM-DD)
    const matchesStartDate = !filterStartDate || report.date >= filterStartDate
    const matchesEndDate = !filterEndDate || report.date <= filterEndDate
    return matchesProject && matchesStartDate && matchesEndDate
  })

  const statusColors: Record<string, string> = {
    enviado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    borrador: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    archivado: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  }

  // Handlers para acciones
  const handleViewPDF = (report: DailyReport) => {
    setSelectedReportForPreview(report)
    setShowPreviewModal(true)
  }

  const handleDownloadPDF = async (report: DailyReport) => {
    try {
      await generatePDF(report.id, true)
    } catch (err) {
      showError("Error", "No se pudo descargar el PDF del reporte")
    }
  }

  const handleDownloadFromPreview = async () => {
    if (!selectedReportForPreview) return
    try {
      await generatePDF(selectedReportForPreview.id, true)
    } catch (err) {
      showError("Error", "No se pudo descargar el PDF del reporte")
    }
  }

  const handleShareWhatsApp = (report: DailyReport) => {
    const projectName = report.projectName
    const date = formatDateLocal(report.date, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    
    // Obtener número de reporte (simulado basado en ID o fecha)
    // En producción, esto vendría del backend
    const reportNumber = Math.abs(report.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000) + 1
    
    // Construir mensaje completo con toda la información
    let message = `*REPORTE DIARIO DE OBRA N°${reportNumber.toString().padStart(3, '0')}*\n\n`
    message += `*Proyecto:* ${projectName}\n`
    message += `*Fecha:* ${date}\n\n`
    
    // Información general
    message += `*HORARIO*\n`
    message += `• Entrada: ${report.entryTime}\n`
    message += `• Salida: ${report.exitTime}\n\n`
    
    // Personal
    message += `*PERSONAL EN SITIO*\n`
    message += `• Personal Directo: ${report.directStaff}\n`
    message += `• Personal Indirecto: ${report.indirectStaff}\n`
    message += `• Total: ${report.directStaff + report.indirectStaff}\n\n`
    
    // Clima
    const weatherEmojis: Record<string, string> = {
      sunny: "Soleado",
      cloudy: "Nublado",
      rainy: "Lluvia",
      stormy: "Tormenta",
      snow: "Nieve",
      hail: "Granizo",
    }
    message += `*CLIMA:* ${weatherEmojis[report.weather] || report.weather}\n\n`
    
    // Día feriado
    if (report.isHoliday) {
      message += `*Día Feriado*\n\n`
    }
    
    // Horas suspendidas
    if (report.hasSuspendedHours) {
      message += `*HORAS SUSPENDIDAS*\n`
      message += `• Horas: ${report.suspendedHours || 0} horas\n`
      if (report.suspendedReason) {
        message += `• Motivo: ${report.suspendedReason}\n`
      }
      message += `\n`
    }
    
    // Accidentes
    if (report.hasAccident) {
      message += `*ACCIDENTE*\n`
      message += `• Estado: ${report.accidentWithInjury ? "Con lesión" : "Sin lesión"}\n`
      if (report.accidentDescription) {
        message += `• Descripción: ${report.accidentDescription}\n`
      }
      message += `\n`
    }
    
    // Actividades
    if (report.activities && report.activities.length > 0) {
      message += `*ACTIVIDADES REALIZADAS* (${report.activities.length})\n`
      report.activities.forEach((activity, index) => {
        message += `\n${index + 1}. *${activity.description}*\n`
        if (activity.category) {
          message += `   • Categoría: ${activity.category}\n`
        }
        if (activity.subActivity) {
          message += `   • Sub-actividad: ${activity.subActivity}\n`
        }
        message += `   • Cantidad: ${activity.quantity} ${activity.unit || ""}\n`
        if (activity.location) {
          message += `   • Ubicación: ${activity.location}\n`
        }
        message += `   • Trabajadores: ${activity.workers || 0}\n`
        if (activity.observations) {
          message += `   • Observaciones: ${activity.observations}\n`
        }
      })
      message += `\n`
    }
    
    // Tareas para mañana
    if (report.tomorrowTasks && report.tomorrowTasks.length > 0) {
      message += `*TAREAS PARA MAÑANA*\n`
      report.tomorrowTasks.forEach((task, index) => {
        message += `${index + 1}. ${task}\n`
      })
      message += `\n`
    }
    
    message += `_Reporte generado automáticamente por Grupo Zenit_`
    
    shareWhatsApp(report.id, message)
  }

  const handleSendEmail = async (report: DailyReport) => {
    setSelectedReportForEmail(report)
    setShowEmailDialog(true)
  }

  const confirmSendEmail = async () => {
    if (!selectedReportForEmail) return
    
    try {
      await sendEmail(selectedReportForEmail.id)
      success("Email enviado", "El reporte se ha enviado a los destinatarios del proyecto")
      setShowEmailDialog(false)
      setSelectedReportForEmail(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "No se pudo enviar el email"
      if (errorMessage.includes("destinatarios")) {
        showError("Error", "No hay destinatarios configurados en el proyecto. Configúralos en Configuración → Proyectos")
      } else {
        showError("Error", errorMessage)
      }
    }
  }

  const handleEditReport = (report: DailyReport) => {
    setReportToEdit(report)
    setShowNewReportForm(true)
  }

  const handleDeleteReport = (report: DailyReport) => {
    setSelectedReportForDelete(report)
    setShowDeleteDialog(true)
  }

  const confirmDeleteReport = async () => {
    if (!selectedReportForDelete) return
    
    try {
      await deleteReport(selectedReportForDelete.id)
      success("Reporte eliminado", "El reporte se ha eliminado correctamente")
      setShowDeleteDialog(false)
      setSelectedReportForDelete(null)
      loadReports() // Recargar reportes
    } catch (err) {
      showError("Error", "No se pudo eliminar el reporte")
    }
  }

  if (showNewReportForm) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <DailyReportForm 
          existingReport={reportToEdit}
          onBack={() => {
            setShowNewReportForm(false)
            setReportToEdit(null)
            loadReports() // Recargar reportes al volver
          }} 
        />
      </>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Diálogo de confirmación de email */}
      <Dialog
        isOpen={showEmailDialog}
        onClose={() => {
          setShowEmailDialog(false)
          setSelectedReportForEmail(null)
        }}
        onConfirm={confirmSendEmail}
        title="Enviar Reporte por Correo"
        message={
          selectedReportForEmail 
            ? `¿Deseas enviar el reporte del ${formatDateLocal(selectedReportForEmail.date)} del proyecto "${selectedReportForEmail.projectName}" a los destinatarios configurados?\n\nEl reporte se enviará con el PDF adjunto a los correos configurados en Configuración → Proyectos.`
            : ""
        }
        confirmText="Enviar"
        cancelText="Cancelar"
      />

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setSelectedReportForDelete(null)
        }}
        onConfirm={confirmDeleteReport}
        title="Eliminar Reporte"
        message={`¿Estás seguro de que deseas eliminar el reporte del ${selectedReportForDelete ? formatDateLocal(selectedReportForDelete.date) : ""}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Modal de vista previa del reporte */}
      <ReportPreviewModal
        report={selectedReportForPreview}
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setSelectedReportForPreview(null)
        }}
        onDownload={handleDownloadFromPreview}
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Reportes Diarios</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {filteredReports.length} reportes encontrados
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setShowNewReportForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              + Nuevo Reporte Diario
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="p-3 md:p-4 bg-card border-border">
          {/* Filters - Proyecto y Actividad en misma línea en móvil */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 w-full">
            {/* Project Filter Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setShowProjectFilter(!showProjectFilter)
                  setShowActivityFilter(false)
                }}
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

            {/* Activity Filter Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setShowActivityFilter(!showActivityFilter)
                  setShowProjectFilter(false)
                }}
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span>Actividad</span>
                {filterActivity !== "todas" && (
                  <span className="hidden md:inline px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                    {activityCategories.find(c => c.id === filterActivity)?.label}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showActivityFilter ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Date Filter - ocupar toda la línea en móvil */}
            <div className="col-span-2 md:col-span-1 w-full">
              <DateRangePicker
                startDate={filterStartDate}
                endDate={filterEndDate}
                onDateChange={(start, end) => {
                  setFilterStartDate(start)
                  setFilterEndDate(end)
                }}
              />
            </div>

            {/* Clear Filters Button - ocupar toda la línea en móvil */}
            <div className="col-span-2 md:col-span-1 w-full">
              <Button
                onClick={() => {
                  setFilterProject("todos")
                  setFilterActivity("todas")
                  setFilterStartDate("")
                  setFilterEndDate("")
                }}
                variant="outline"
                className="w-full text-xs md:text-sm py-2 bg-transparent hover:bg-primary hover:text-primary-foreground"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Project Options - Expandable */}
          {showProjectFilter && (
            <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setFilterProject("todos")}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  filterProject === "todos"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Todos
              </button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setFilterProject(project.id)}
                  className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                    filterProject === project.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}

          {/* Activity Options - Expandable */}
          {showActivityFilter && (
            <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setFilterActivity("todas")}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  filterActivity === "todas"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Todas
              </button>
              {activityCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setFilterActivity(category.id)}
                  className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                    filterActivity === category.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Loading State */}
        {isLoading && filteredReports.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando reportes...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && filteredReports.length === 0 && !error && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin reportes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No hay reportes que coincidan con los filtros seleccionados.
              </p>
              {canCreate && (
                <Button onClick={() => setShowNewReportForm(true)}>
                  Crear Primer Reporte
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Reports Table - Desktop */}
        {filteredReports.length > 0 && (
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Proyecto</th>
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Personal</th>
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Actividades</th>
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Estado</th>
                      <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-xs md:text-sm text-foreground">
                          {formatDateLocal(report.date, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-xs md:text-sm font-medium text-foreground">{report.projectName}</td>
                        <td className="px-4 py-3 text-xs md:text-sm text-muted-foreground">
                          {report.indirectStaff} • {report.directStaff}
                        </td>
                        <td className="px-4 py-3 text-xs md:text-sm text-foreground">{report.activities.length}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[report.status]}`}
                          >
                            {REPORT_STATUS_LABELS[report.status] || report.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {report.status === "enviado" && (
                              <>
                                <button
                                  onClick={() => handleViewPDF(report)}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-primary"
                                  title="Ver PDF en navegador"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadPDF(report)}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-primary"
                                  title="Descargar PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShareWhatsApp(report)}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-green-600 dark:text-green-400"
                                  title="Compartir por WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSendEmail(report)}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  title="Enviar por correo"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {canUpdate && (
                              <button
                                onClick={() => handleEditReport(report)}
                                className="p-1.5 rounded hover:bg-muted transition-colors text-blue-600 dark:text-blue-400"
                                title="Editar reporte"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteReport(report)}
                                className="p-1.5 rounded hover:bg-muted transition-colors text-red-600 dark:text-red-400"
                                title="Eliminar reporte"
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
              </div>
            </Card>
          </div>
        )}

        {/* Reports Cards - Mobile */}
        {filteredReports.length > 0 && (
          <div className="md:hidden space-y-2">
            {filteredReports.map((report) => (
              <Card key={report.id} className="p-3 bg-card border-border">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {formatDateLocal(report.date, {
                        month: "short",
                        day: "numeric",
                      })}
                      {" - "}
                      {report.projectName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Personal: {report.indirectStaff} ind. • {report.directStaff} dir.
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[report.status]}`}
                  >
                    {REPORT_STATUS_LABELS[report.status] || report.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {report.status === "enviado" && (
                    <>
                      <button
                        onClick={() => handleViewPDF(report)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-primary"
                        title="Ver PDF en navegador"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(report)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-primary"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(report)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-green-600 dark:text-green-400"
                        title="Compartir por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendEmail(report)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Enviar por correo"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {canUpdate && (
                    <button
                      onClick={() => handleEditReport(report)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-blue-600 dark:text-blue-400"
                      title="Editar reporte"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteReport(report)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-red-600 dark:text-red-400"
                      title="Eliminar reporte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
