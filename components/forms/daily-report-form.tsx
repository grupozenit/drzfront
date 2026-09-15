"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Cloud, CloudRain, CloudLightning, CloudSnow, CloudHail, Sun, ImagePlus, X, Loader2, ClipboardCopy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ActivityForm } from "./activity-form"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Dialog } from "@/components/ui/dialog"
import { ArrowLeft } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { validateImageFile, sanitizeTextInput } from "@/lib/utils/sanitize"
import { useProjects } from "@/lib/hooks"
import { useOfflineReports } from "@/lib/hooks/useOfflineReports"
import { reportsService } from "@/lib/api"
import type { CreateReportDTO, WeatherType, ActivityEntry, ActivityCategory, DailyReport } from "@/lib/types"
import { WEATHER_LABELS, ACTIVITY_CATEGORIES } from "@/lib/constants/activities"

interface Activity {
  id: string
  description: string
  quantity: string
  unit: string
  location: string
  workers: string
  observations: string
  category?: string
  subActivity?: string
  component?: string
}

interface ActivityInput extends Activity {
  // Para asegurar que TypeScript permita actualizar todos los campos
  [key: string]: string | undefined
}

interface DailyReportFormProps {
  onBack?: () => void
  existingReport?: DailyReport | null
}

export function DailyReportForm({ onBack, existingReport }: DailyReportFormProps = {}) {
  const isEditMode = !!existingReport
  
  const [activities, setActivities] = useState<Activity[]>(
    existingReport && existingReport.activities && existingReport.activities.length > 0
      ? existingReport.activities.map((a) => ({
          id: a.id || Math.random().toString(36).substr(2, 9),
          description: a.description || "",
          quantity: a.quantity?.toString() || "",
          unit: a.unit || "",
          location: a.location || "",
          workers: a.workers?.toString() || "",
          observations: a.observations || "",
          category: a.category || "otras",
          subActivity: a.subActivity || "",
          component: a.component || "",
        }))
      : [
          {
            id: "1",
            description: "",
            quantity: "",
            unit: "",
            location: "",
            workers: "",
            observations: "",
            category: undefined,
            subActivity: undefined,
            component: undefined,
          },
        ]
  )
  const [selectedProject, setSelectedProject] = useState(existingReport?.projectId || "")
  const [reportDate, setReportDate] = useState(
    existingReport?.date || new Date().toISOString().split("T")[0]
  )
  const [indirectStaff, setIndirectStaff] = useState(existingReport?.indirectStaff?.toString() || "")
  const [directStaff, setDirectStaff] = useState(existingReport?.directStaff?.toString() || "")
  const [weather, setWeather] = useState<WeatherType>(existingReport?.weather || "sunny")
  const [isHoliday, setIsHoliday] = useState<"no" | "yes">(existingReport?.isHoliday ? "yes" : "no")
  const [entryTime, setEntryTime] = useState(existingReport?.entryTime || "07:00")
  const [exitTime, setExitTime] = useState(existingReport?.exitTime || "17:00")
  const [hasSuspendedHours, setHasSuspendedHours] = useState(existingReport?.hasSuspendedHours || false)
  const [suspendedHours, setSuspendedHours] = useState(existingReport?.suspendedHours?.toString() || "")
  const [suspendedReason, setSuspendedReason] = useState(existingReport?.suspendedReason || "")
  const [attachedImages, setAttachedImages] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    existingReport?.images || []
  )
  const [tomorrowTasks, setTomorrowTasks] = useState<string[]>(existingReport?.tomorrowTasks || [])
  const [newTask, setNewTask] = useState("")
  const [hasAccident, setHasAccident] = useState(existingReport?.hasAccident || false)
  const [accidentWithInjury, setAccidentWithInjury] = useState<"no" | "yes">(
    existingReport?.accidentWithInjury ? "yes" : "no"
  )
  const [accidentDescription, setAccidentDescription] = useState(existingReport?.accidentDescription || "")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingLastReport, setIsLoadingLastReport] = useState(false)
  
  const { toasts, success, error: showError, removeToast } = useToast()

  // Hooks de datos
  const { projects, isLoading: isLoadingProjects, loadProjects } = useProjects()
  const { createReport, updateReport, saveDraft, isOnline } = useOfflineReports()

  // Cargar proyectos al montar
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Seleccionar primer proyecto por defecto
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const totalImages = attachedImages.length + existingImageUrls.length + newFiles.length
      
      if (totalImages > 3) {
        showError("Límite excedido", "Solo puedes adjuntar hasta 3 imágenes por reporte")
        return
      }
      
      // Validar cada archivo
      for (const file of newFiles) {
        const validation = validateImageFile(file)
        if (!validation.valid) {
          showError("Archivo inválido", validation.error || "Archivo no válido")
          return
        }
      }
      
      setAttachedImages([...attachedImages, ...newFiles])
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages(attachedImages.filter((_, i) => i !== index))
  }

  const addTomorrowTask = () => {
    if (newTask.trim()) {
      setTomorrowTasks([...tomorrowTasks, newTask.trim()])
      setNewTask("")
    }
  }

  const removeTomorrowTask = (index: number) => {
    setTomorrowTasks(tomorrowTasks.filter((_, i) => i !== index))
  }

  const addSuggestedTask = (task: string) => {
    if (!tomorrowTasks.includes(task)) {
      setTomorrowTasks([...tomorrowTasks, task])
    }
  }

  const handleAutocompleteFromLastReport = async () => {
    if (!selectedProject) return

    setIsLoadingLastReport(true)
    try {
      const lastReport = await reportsService.getLatestByProject(selectedProject)

      if (!lastReport || lastReport.activities.length === 0) {
        showError("Sin datos previos", "No se encontró ningún reporte anterior con actividades para este proyecto")
        return
      }

      const mappedActivities = lastReport.activities.map((a) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: a.description || "",
        quantity: a.quantity?.toString() || "",
        unit: a.unit || "",
        location: a.location || "",
        workers: a.workers?.toString() || "",
        observations: a.observations || "",
        category: a.category || "otras",
        subActivity: a.subActivity || "",
        component: a.component || "",
      }))

      setActivities(mappedActivities)
      success(
        "Actividades copiadas",
        `Se copiaron ${mappedActivities.length} actividad${mappedActivities.length === 1 ? "" : "es"} del reporte del ${new Date(lastReport.date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`
      )
    } catch (err: any) {
      showError("Error", "No se pudo obtener el último reporte del proyecto")
    } finally {
      setIsLoadingLastReport(false)
    }
  }

  const weatherLabels = WEATHER_LABELS as Record<WeatherType, string>
  const weatherOptions = Object.keys(weatherLabels) as WeatherType[]

  const getWeatherIcon = (type: WeatherType) => {
    const iconProps = { className: "w-6 h-6 md:w-5 md:h-5" }
    const icons: Record<WeatherType, React.ReactNode> = {
      sunny: <Sun {...iconProps} />,
      cloudy: <Cloud {...iconProps} />,
      rainy: <CloudRain {...iconProps} />,
      stormy: <CloudLightning {...iconProps} />,
      snow: <CloudSnow {...iconProps} />,
      hail: <CloudHail {...iconProps} />,
    }
    return icons[type]
  }

  const addActivity = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    setActivities([
      ...activities,
      {
        id: newId,
        description: "",
        quantity: "",
        unit: "",
        location: "",
        workers: "",
        observations: "",
        category: undefined,
        subActivity: undefined,
        component: undefined,
      },
    ])
  }

  const updateActivity = (id: string, field: keyof Activity, value: string) => {
    setActivities(prevActivities => {
      const updated = prevActivities.map((a) => {
        if (a.id === id) {
          const updatedActivity = { ...a, [field]: value }
          return updatedActivity
        }
        return a
      })
      return updated
    })
  }

  const removeActivity = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter((a) => a.id !== id))
    }
  }

  // Number() y no parseFloat(): parseFloat("45abc") devuelve 45 y parseFloat("abc")
  // devuelve NaN, que el `|| 0` de antes convertía en 0 en silencio. Así, un
  // error de tipeo viajaba al backend como una cantidad cero y nadie se enteraba.
  const toNumber = (value: string): number | null => {
    const trimmed = (value ?? "").trim()
    if (trimmed === "") return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  /** Primer campo numérico mal cargado, o null si están todos bien. */
  const findNumericError = (): { title: string; message: string } | null => {
    const checks: Array<{ label: string; raw: string; max: number; integer?: boolean }> = [
      { label: "Personal indirecto", raw: indirectStaff, max: 100000, integer: true },
      { label: "Personal directo", raw: directStaff, max: 100000, integer: true },
    ]
    if (hasSuspendedHours) {
      checks.push({ label: "Horas suspendidas", raw: suspendedHours, max: 24 })
    }

    for (const check of checks) {
      // Un campo vacío se sigue tomando como 0, como venía siendo: acá lo que
      // se busca es el texto que NO es un número, no volver obligatorio nada.
      if (!check.raw?.trim()) continue
      const value = toNumber(check.raw)
      if (value === null) {
        return { title: "Dato inválido", message: `${check.label}: ingresá un número.` }
      }
      if (value < 0) {
        return { title: "Dato inválido", message: `${check.label}: no puede ser negativo.` }
      }
      if (value > check.max) {
        return { title: "Dato inválido", message: `${check.label}: no puede superar ${check.max}.` }
      }
      if (check.integer && !Number.isInteger(value)) {
        return { title: "Dato inválido", message: `${check.label}: tiene que ser un número entero.` }
      }
    }

    const completed = activities.filter(a => a.description.trim() !== "")
    for (const [index, activity] of completed.entries()) {
      const quantity = activity.quantity?.trim() ? toNumber(activity.quantity) : 0
      if (quantity === null) {
        return {
          title: "Cantidad inválida",
          message: `Actividad ${index + 1}: "${activity.quantity}" no es un número.`,
        }
      }
      if (quantity < 0) {
        return {
          title: "Cantidad inválida",
          message: `Actividad ${index + 1}: la cantidad no puede ser negativa.`,
        }
      }
      if (quantity > 1000000000) {
        return {
          title: "Cantidad inválida",
          message: `Actividad ${index + 1}: la cantidad es demasiado grande.`,
        }
      }

      const workers = activity.workers?.trim() ? toNumber(activity.workers) : 0
      if (workers === null || workers < 0 || !Number.isInteger(workers) || workers > 10000) {
        return {
          title: "Dato inválido",
          message: `Actividad ${index + 1}: los trabajadores tienen que ser un número entero entre 0 y 10.000.`,
        }
      }
    }

    return null
  }

  // Preparar datos del reporte
  const prepareReportData = (status: 'enviado' | 'borrador'): CreateReportDTO => {
    const selectedProjectData = projects.find(p => p.id === selectedProject)
    
    return {
      projectId: selectedProject,
      date: reportDate,
      isHoliday: isHoliday === "yes",
      entryTime,
      exitTime,
      indirectStaff: toNumber(indirectStaff) ?? 0,
      directStaff: toNumber(directStaff) ?? 0,
      weather,
      hasSuspendedHours,
      suspendedHours: hasSuspendedHours ? toNumber(suspendedHours) ?? 0 : undefined,
      suspendedReason: hasSuspendedHours ? suspendedReason : undefined,
      hasAccident,
      accidentWithInjury: hasAccident ? accidentWithInjury === "yes" : undefined,
      accidentDescription: hasAccident ? accidentDescription : undefined,
      activities: activities
        .filter(a => a.description.trim() !== "")
        .map(a => ({
          category: (a.category || 'otras') as ActivityEntry['category'],
          subActivity: a.subActivity || '',
          component: a.component,
          description: a.description,
          quantity: toNumber(a.quantity) ?? 0,
          unit: a.unit,
          location: a.location,
          workers: toNumber(a.workers) ?? 0,
          observations: a.observations,
        })),
      tomorrowTasks,
      images: attachedImages.length > 0 ? attachedImages : undefined,
      status,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProject) {
      showError("Error", "Debes seleccionar un proyecto")
      return
    }
    
    if (!directStaff || toNumber(directStaff) === 0) {
      showError("Campo requerido", "Debes ingresar la cantidad de personal directo")
      return
    }

    if (!indirectStaff || toNumber(indirectStaff) === 0) {
      showError("Campo requerido", "Debes ingresar la cantidad de personal indirecto")
      return
    }

    const numericError = findNumericError()
    if (numericError) {
      showError(numericError.title, numericError.message)
      return
    }
    
    // Validar que hay al menos una actividad con descripción
    const activitiesWithDescription = activities.filter(a => a.description && a.description.trim() !== "")
    
    if (activitiesWithDescription.length === 0) {
      // Mensaje más específico según el estado
      const firstActivity = activities[0]
      let errorMessage = "Debes completar al menos una actividad para crear el reporte."
      
      if (firstActivity.category && !firstActivity.subActivity) {
        const categoryLabel = ACTIVITY_CATEGORIES[firstActivity.category as ActivityCategory]?.label ?? firstActivity.category
        errorMessage = `Has seleccionado la categoría "${categoryLabel}" pero falta seleccionar una SUB-ACTIVIDAD. Por favor haz clic en una de las opciones que aparecen debajo.`
      } else if (!firstActivity.category) {
        errorMessage = "Debes hacer clic en una CATEGORÍA (Hincado, Trackers, Módulos, etc.) y luego en una SUB-ACTIVIDAD para completar la actividad."
      }
      
      showError("Actividad Incompleta", errorMessage)
      return
    }

    setIsSaving(true)
    
    try {
      const reportData = prepareReportData('enviado')
      
      if (isEditMode && existingReport) {
        await updateReport(existingReport.id, reportData)
        success("¡Reporte actualizado!", "El reporte se ha actualizado correctamente")
      } else {
        await createReport(reportData)
        if (!isOnline) {
          success("Reporte guardado localmente", "Sin conexión. Se sincronizará automáticamente cuando vuelvas a conectarte.")
        } else {
          success("¡Reporte enviado!", "El reporte se ha enviado correctamente")
        }
      }
      
      if (onBack) {
        setTimeout(() => onBack(), 1500)
      }
    } catch (err: any) {
      const errorMessage = err?.message || "No se pudo enviar el reporte"
      showError("Error", errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedProject) {
      showError("Error", "Debes seleccionar un proyecto")
      return
    }

    // También en el borrador: sin esto, un número mal cargado se guarda como 0
    const numericError = findNumericError()
    if (numericError) {
      showError(numericError.title, numericError.message)
      return
    }

    setIsSaving(true)
    
    try {
      const reportData = prepareReportData('borrador')
      
      if (isEditMode && existingReport) {
        await updateReport(existingReport.id, reportData)
        success("Borrador actualizado", "El borrador se ha actualizado correctamente")
      } else {
        await saveDraft(reportData)
        if (!isOnline) {
          success("Borrador guardado localmente", "Sin conexión. Se sincronizará automáticamente cuando vuelvas a conectarte.")
        } else {
          success("Borrador guardado", "El reporte se ha guardado como borrador")
        }
      }
      
      if (onBack) {
        setTimeout(() => onBack(), 1500)
      }
    } catch (err: any) {
      const errorMessage = err?.message || "No se pudo guardar el borrador"
      showError("Error", errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setShowCancelDialog(true)
  }

  const confirmCancel = () => {
    setActivities([
      {
        id: "1",
        description: "",
        quantity: "",
        unit: "",
        location: "",
        workers: "",
        observations: "",
      },
    ])
    setIndirectStaff("")
    setDirectStaff("")
    setWeather("sunny")
    setIsHoliday("no")
    setEntryTime("07:00")
    setExitTime("17:00")
    setHasSuspendedHours(false)
    setSuspendedHours("")
    setSuspendedReason("")
    setAttachedImages([])
    setTomorrowTasks([])
    setNewTask("")
    setSelectedProject(projects[0]?.id || "")
    setReportDate(new Date().toISOString().split("T")[0])
    setHasAccident(false)
    setAccidentWithInjury("no")
    setAccidentDescription("")
    setShowCancelDialog(false)
    
    if (onBack) {
      onBack()
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Dialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancel}
        title="Cancelar reporte"
        message="¿Estás seguro de que deseas cancelar este reporte? Se perderán todos los cambios no guardados."
        confirmText="Sí, cancelar"
        cancelText="No, continuar editando"
      />
    <div className="container px-4 md:px-6 py-6 md:py-8">
      <div className="mb-6 flex items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="hidden md:block">
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          {isEditMode ? "Editar Reporte Diario" : "Nuevo Reporte Diario"}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {isEditMode 
            ? "Modifica los campos que necesites actualizar"
            : "Completa todos los campos requeridos para generar tu reporte"
          }
        </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project and Date Section */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-xs md:text-sm font-medium text-foreground">
                Selecciona Proyecto
              </Label>
              {isLoadingProjects ? (
                <div className="flex items-center gap-2 h-10">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Cargando proyectos...</span>
                </div>
              ) : (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project" className="w-full">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">Selecciona el proyecto al que pertenece este reporte</p>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="report-date" className="text-xs md:text-sm font-medium text-foreground">
                Fecha del Reporte
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DateRangePicker
                    startDate={reportDate}
                    endDate={reportDate}
                    onDateChange={(start) => setReportDate(start)}
                  />
                </div>
                <Select value={isHoliday} onValueChange={(value: "no" | "yes") => setIsHoliday(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Día normal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Día normal</SelectItem>
                    <SelectItem value="yes">Feriado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">Selecciona la fecha de este reporte</p>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="entry-time" className="text-xs md:text-sm font-medium text-foreground">
                Horario de Ingreso
              </Label>
              <input
                id="entry-time"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit-time" className="text-xs md:text-sm font-medium text-foreground">
                Horario de Salida
              </Label>
              <input
                id="exit-time"
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </Card>

        {/* Staff Section */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Personal en Sitio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="indirect-staff" className="text-xs md:text-sm font-medium text-foreground">
                Personal Indirecto
              </Label>
              <Input
                id="indirect-staff"
                type="number"
                min={0}
                max={100000}
                step={1}
                inputMode="numeric"
                value={indirectStaff}
                onChange={(e) => setIndirectStaff(e.target.value)}
                className="bg-input border-border text-foreground text-sm no-arrows"
                placeholder="Ingresa cantidad"
              />
              <p className="text-xs text-muted-foreground">Personal administrativo y de supervisión</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="direct-staff" className="text-xs md:text-sm font-medium text-foreground">
                Personal Directo
              </Label>
              <Input
                id="direct-staff"
                type="number"
                min={0}
                max={100000}
                step={1}
                inputMode="numeric"
                value={directStaff}
                onChange={(e) => setDirectStaff(e.target.value)}
                className="bg-input border-border text-foreground text-sm no-arrows"
                placeholder="Ingresa cantidad"
              />
              <p className="text-xs text-muted-foreground">Trabajadores en campo</p>
            </div>
          </div>

          {/* Accident Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAccident}
                  onChange={(e) => {
                    setHasAccident(e.target.checked)
                    if (!e.target.checked) {
                      setAccidentWithInjury("no")
                      setAccidentDescription("")
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 bg-input"
                />
                <span className="text-sm font-medium text-foreground">¿Ocurrió algún accidente?</span>
              </label>
            </div>
            {hasAccident && (
              <div className="mt-4 space-y-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">¿Hubo lesión?</Label>
                  <Select value={accidentWithInjury} onValueChange={(value: "no" | "yes") => setAccidentWithInjury(value)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Sin lesión</SelectItem>
                      <SelectItem value="yes">Con lesión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Descripción del accidente</Label>
                  <Textarea
                    maxLength={1000}
                    value={accidentDescription}
                    onChange={(e) => setAccidentDescription(e.target.value)}
                    placeholder="Describa lo ocurrido, circunstancias, personas involucradas..."
                    className="bg-input border-border text-foreground text-sm min-h-[80px]"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Reporta cualquier incidente o accidente ocurrido durante la jornada
            </p>
          </div>
        </Card>

        {/* Weather Section */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Clima Hoy</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {weatherOptions.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setWeather(key)}
                className={`flex flex-col items-center justify-center p-2 border-2 transition-all h-20 md:h-16 ${
                  weather === key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50"
                }`}
                title={weatherLabels[key]}
              >
                <span className="text-foreground flex items-center justify-center">{getWeatherIcon(key)}</span>
                <span className="text-[10px] md:text-[9px] text-foreground mt-1 text-center leading-tight">
                  {weatherLabels[key]}
                </span>
              </button>
            ))}
          </div>

          {/* Suspended Hours */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSuspendedHours}
                  onChange={(e) => {
                    setHasSuspendedHours(e.target.checked)
                    if (!e.target.checked) {
                      setSuspendedHours("")
                      setSuspendedReason("")
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 bg-input"
                />
                <span className="text-sm font-medium text-foreground">Horas Suspendidas</span>
              </label>
              {hasSuspendedHours && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={suspendedHours}
                    onChange={(e) => setSuspendedHours(e.target.value)}
                    placeholder="Cantidad"
                    className="w-24 bg-input border-border text-foreground text-sm no-arrows"
                    min="0"
                    max="24"
                    step="0.5"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              )}
            </div>
            {hasSuspendedHours && (
              <div className="mt-3">
                <Label className="text-xs md:text-sm font-medium text-foreground">Motivo de la suspensión</Label>
                <Textarea
                  maxLength={500}
                  value={suspendedReason}
                  onChange={(e) => setSuspendedReason(e.target.value)}
                  placeholder="Ej: Lluvia intensa, corte de energía, falta de materiales..."
                  className="mt-1 bg-input border-border text-foreground text-sm min-h-[60px]"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Marca esta opción si hubo horas de trabajo suspendidas por clima u otras razones
            </p>
          </div>
        </Card>

        {/* Image Attachment Section */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Fotografías del Día</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {/* Imágenes existentes (URLs) */}
              {existingImageUrls.map((url, index) => {
                // Construir URL completa si es relativa
                const imageUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
                return (
                  <div key={`existing-${index}`} className="relative group">
                    <div className="w-24 h-24 rounded-lg bg-muted border border-border overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Imagen existente ${index + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Error loading existing image:', url);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setExistingImageUrls(existingImageUrls.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {/* Nuevas imágenes (archivos) */}
              {attachedImages.map((image, index) => (
                <div key={`new-${index}`} className="relative group">
                  <div className="w-24 h-24 rounded-lg bg-muted border border-border overflow-hidden">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Imagen nueva ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('Error loading image:', image);
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Botón para agregar imágenes - solo si no se alcanzó el límite */}
              {(attachedImages.length + existingImageUrls.length) < 3 && (
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Agregar</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Adjunta hasta 3 fotografías del avance de obra del día ({attachedImages.length + existingImageUrls.length}/3)
            </p>
          </div>
        </Card>

        {/* Activities Section */}
        <div>
          <div className="bg-card border border-border p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base md:text-lg font-bold text-foreground">¿Qué se hizo hoy?</h2>
              {!isEditMode && selectedProject && (
                <button
                  type="button"
                  onClick={handleAutocompleteFromLastReport}
                  disabled={isLoadingLastReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title="Autocompletar actividades con la información del último reporte de este proyecto"
                >
                  {isLoadingLastReport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ClipboardCopy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Copiar del último reporte</span>
                  <span className="sm:hidden">Último reporte</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {activities.map((activity, index) => (
              <ActivityForm
                key={activity.id}
                activity={activity}
                index={index + 1}
                onUpdate={updateActivity}
                onRemove={() => removeActivity(activity.id)}
                canRemove={activities.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addActivity}
            className="w-full mt-4 md:mt-6 py-2 md:py-3 px-3 md:px-4 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-primary font-medium text-sm"
          >
            + Agregar Actividad
          </button>
        </div>

        {/* Tomorrow Tasks Section */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">Tareas para Mañana</h3>
          
          {/* Suggested tasks based on today's activities */}
          {activities.some(a => a.description) && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Sugerencias basadas en el reporte de hoy:</p>
              <div className="flex flex-wrap gap-2">
                {activities
                  .filter(a => a.description)
                  .map((activity, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addSuggestedTask(activity.description)}
                      disabled={tomorrowTasks.includes(activity.description)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        tomorrowTasks.includes(activity.description)
                          ? "border-primary/50 bg-primary/10 text-primary cursor-not-allowed"
                          : "border-border bg-muted/50 text-foreground hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      + {activity.description.length > 30 ? activity.description.substring(0, 30) + "..." : activity.description}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Added tasks */}
          {tomorrowTasks.length > 0 && (
            <div className="mb-4 space-y-2">
              {tomorrowTasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                  <span className="flex-1 text-sm text-foreground">{task}</span>
                  <button
                    type="button"
                    onClick={() => removeTomorrowTask(index)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new task */}
          <div className="flex gap-2">
            <Input
              maxLength={500}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTomorrowTask())}
              placeholder="Agregar tarea para mañana..."
              className="flex-1 bg-input border-border text-foreground text-sm"
            />
            <Button
              type="button"
              onClick={addTomorrowTask}
              variant="outline"
              className="text-sm"
            >
              Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Planifica las tareas que se realizarán el próximo día de trabajo
          </p>
        </Card>

        {/* Submit Section */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-end pt-4">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="w-full md:w-auto bg-transparent text-sm"
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveDraft}
            variant="outline"
            className="w-full md:w-auto bg-transparent text-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar como Borrador"
            )}
          </Button>
          <Button
            type="submit"
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 md:py-3 px-4 md:px-8 text-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Reporte →"
            )}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}
