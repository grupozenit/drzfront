"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  ArrowLeft, Loader2, CheckCircle, Plus, Minus, AlertTriangle, Download, Upload,
} from "lucide-react"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { theoreticalCurvesService, projectsService } from "@/lib/api"
import { ACTIVITY_CATEGORIES } from "@/lib/constants/activities"
import { validateSpreadsheetFile } from "@/lib/utils/sanitize"
import type { ActivityCategory, UncoveredActivity } from "@/lib/types"

interface TheoreticalCurveSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

/**
 * Las actividades planificables, en orden de catálogo.
 *
 * Se saltea la libre ("Otras"): no tiene alcance contractual, así que tampoco
 * tiene peso con el que ponderar ni plan teórico. El backend la rechaza.
 */
const PLANNABLE = Object.values(ACTIVITY_CATEGORIES).filter(cat => !cat.isCustom)

/** El plan en edición: actividad -> semana -> avance acumulado. */
type Plan = Partial<Record<ActivityCategory, Record<number, number>>>

const DEFAULT_WEEKS = 26
const MAX_WEEKS = 520

export function TheoreticalCurveSetup({ projectId, projectName, onBack }: TheoreticalCurveSetupProps) {
  const [plan, setPlan] = useState<Plan>({})
  const [weekCount, setWeekCount] = useState(0)
  const [weights, setWeights] = useState<Partial<Record<ActivityCategory, number>>>({})
  const [coverage, setCoverage] = useState<number | null>(null)
  const [uncovered, setUncovered] = useState<UncoveredActivity[]>([])
  const [hasTotals, setHasTotals] = useState(true)
  const [curveId, setCurveId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>("")
  const [initialWeekCount, setInitialWeekCount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [isImporting, setIsImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<
    Array<{ row: number; column: string; message: string; value?: string }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toasts, success, error: showError, removeToast } = useToast()

  /** Vuelca la respuesta del backend al estado de edición. */
  const applyCurve = (curve: Awaited<ReturnType<typeof theoreticalCurvesService.get>>) => {
    if (!curve) return
    const next: Plan = {}
    let lastWeek = 0
    for (const activity of curve.activities) {
      const points: Record<number, number> = {}
      for (const point of activity.points) {
        points[point.weekNumber] = point.cumulativeProgress
        lastWeek = Math.max(lastWeek, point.weekNumber)
      }
      next[activity.category] = points
    }
    setCurveId(curve.id)
    setPlan(next)
    setWeekCount(Math.max(lastWeek, curve.totalWeeks ?? 0))
    setWeights(
      Object.fromEntries(
        curve.activities.map(a => [a.category, a.weight]),
      ) as Partial<Record<ActivityCategory, number>>,
    )
    setCoverage(curve.coverage)
    setUncovered(curve.uncoveredActivities)
    setHasTotals(curve.hasTotals)
  }

  /**
   * Importación desde Excel. Es el otro camino al mismo dato: lo que se
   * importa queda en la grilla de abajo y se puede seguir editando a mano.
   */
  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const validation = validateSpreadsheetFile(file)
    if (!validation.valid) {
      showError("Archivo inválido", validation.error ?? "Revisá el archivo")
      return
    }

    setIsImporting(true)
    setImportErrors([])
    try {
      const result = await theoreticalCurvesService.importTemplate(projectId, file)
      applyCurve(await theoreticalCurvesService.get(projectId))
      success(
        "Plan importado",
        `${result.activities} actividad(es) cargadas, hasta la semana ${result.totalWeeks}.`,
      )
    } catch (err: any) {
      // El backend rechaza el archivo entero y devuelve qué celdas corregir
      const rows = err?.data?.errors ?? []
      setImportErrors(rows)
      showError(
        "No se pudo importar",
        rows.length
          ? `El archivo tiene ${rows.length} celda(s) con problemas. No se importó nada.`
          : err?.message ?? "Revisá el archivo e intentá de nuevo",
      )
    } finally {
      setIsImporting(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [curve, project] = await Promise.all([
          theoreticalCurvesService.get(projectId),
          projectsService.getById(projectId),
        ])
        applyCurve(curve)
        if (project.startDate) setStartDate(project.startDate)
      } catch {
        // Sin curva todavía, o error del proyecto: se arranca en blanco
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  const weeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i + 1),
    [weekCount],
  )

  /** Actividades que tienen al menos un valor cargado. */
  const plannedCategories = useMemo(
    () => PLANNABLE.filter(cat => Object.keys(plan[cat.id] ?? {}).length > 0),
    [plan],
  )

  /**
   * Los mismos controles que aplica el backend, para avisar antes de guardar:
   * cada actividad tiene que crecer semana a semana y terminar en 100.
   */
  const problems = useMemo(() => {
    const found: string[] = []
    for (const cat of plannedCategories) {
      const points = plan[cat.id] ?? {}
      const loaded = Object.keys(points).map(Number).sort((a, b) => a - b)
      for (let i = 1; i < loaded.length; i++) {
        if (points[loaded[i]] < points[loaded[i - 1]]) {
          found.push(
            `${cat.label}: la semana ${loaded[i]} (${points[loaded[i]]}%) es menor que la ${loaded[i - 1]} (${points[loaded[i - 1]]}%)`,
          )
          break
        }
      }
      const last = loaded[loaded.length - 1]
      if (points[last] !== 100) {
        found.push(
          `${cat.label}: la última semana cargada (${last}) tiene que llegar a 100%`,
        )
      }
    }
    return found
  }, [plannedCategories, plan])

  const setCell = (category: ActivityCategory, week: number, raw: string) => {
    setPlan(previous => {
      const points = { ...(previous[category] ?? {}) }
      if (raw === "") {
        delete points[week]
      } else {
        points[week] = Math.min(100, Math.max(0, parseFloat(raw) || 0))
      }
      const next = { ...previous }
      if (Object.keys(points).length === 0) delete next[category]
      else next[category] = points
      return next
    })
  }

  const generateWeeks = () => {
    const count = parseInt(initialWeekCount)
    if (!count || count < 1) return
    setWeekCount(Math.min(MAX_WEEKS, count))
    setInitialWeekCount("")
  }

  const addWeek = () => setWeekCount(w => Math.min(MAX_WEEKS, w + 1))

  const removeWeek = () => {
    // Se borran también los valores de esa semana: dejarlos guardados pero
    // invisibles haría que el guardado mandara algo que nadie ve.
    setPlan(previous => {
      const next: Plan = {}
      for (const [category, points] of Object.entries(previous)) {
        const kept = Object.fromEntries(
          Object.entries(points ?? {}).filter(([week]) => Number(week) < weekCount),
        )
        if (Object.keys(kept).length > 0) next[category as ActivityCategory] = kept
      }
      return next
    })
    setWeekCount(w => Math.max(0, w - 1))
  }

  const handleSave = async () => {
    if (plannedCategories.length === 0) {
      showError("Error", "Cargá el avance teórico de al menos una actividad")
      return
    }
    if (problems.length > 0) {
      showError("Revisá el plan", problems[0])
      return
    }

    const activities = plannedCategories.map(cat => ({
      category: cat.id,
      points: Object.entries(plan[cat.id] ?? {})
        .map(([week, value]) => ({ weekNumber: Number(week), cumulativeProgress: value }))
        .sort((a, b) => a.weekNumber - b.weekNumber),
    }))

    setIsSaving(true)
    setSaveSuccess(false)
    try {
      if (startDate) {
        await projectsService.update(projectId, { startDate })
      }
      const saved = curveId
        ? await theoreticalCurvesService.update(projectId, { activities })
        : await theoreticalCurvesService.create(projectId, { activities })
      applyCurve(saved)

      setSaveSuccess(true)
      success("Guardado", "El plan teórico fue guardado correctamente")
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      showError("Error", "No se pudo guardar el plan teórico")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCurve = async () => {
    if (!curveId) {
      setPlan({})
      return
    }
    setIsSaving(true)
    try {
      await theoreticalCurvesService.delete(projectId)
      setCurveId(null)
      setPlan({})
      setCoverage(null)
      setUncovered([])
      success("Eliminado", "El plan teórico fue eliminado correctamente")
    } catch {
      showError("Error", "No se pudo eliminar el plan teórico")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground" title="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">Curva S Teórica — {projectName}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Definí el avance acumulado esperado de cada actividad, semana a semana.
              La curva del proyecto se calcula ponderando esas actividades por su peso en el alcance.
            </p>
          </div>
          {saveSuccess && (
            <div className="ml-auto flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
              <CheckCircle className="w-4 h-4" />
              Guardado
            </div>
          )}
        </div>

        {/* Avisos de cobertura. La curva teórica sale de ponderar con el
            alcance: sin Totales no hay curva, y con Totales incompletos la
            curva no llega a 100. Las dos cosas hay que decirlas. */}
        {!hasTotals && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-xs p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Este proyecto todavía no tiene Totales cargados. El plan se guarda igual,
              pero la curva S teórica del proyecto recién se puede calcular cuando haya
              alcance con el cual ponderar cada actividad.
            </span>
          </div>
        )}
        {hasTotals && coverage !== null && coverage < 99.9 && uncovered.length > 0 && (
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-xs p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Solo el {coverage.toFixed(0)}% del peso del proyecto tiene plan cargado, así que
              la curva teórica no llega a 100%. Sin plan:{" "}
              {uncovered.map(a => `${a.name} (${a.weight.toFixed(1)}%)`).join(", ")}.
            </span>
          </div>
        )}

        {/* Fecha de inicio */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-medium text-foreground">
              Fecha de Inicio del Proyecto
            </Label>
            <p className="text-xs text-muted-foreground">
              Se usa para calcular el número de semana en los reportes semanales.
            </p>
            <div className="max-w-xs">
              <DateRangePicker
                startDate={startDate}
                endDate={startDate}
                onDateChange={(start) => setStartDate(start)}
              />
            </div>
          </div>
        </Card>

        {/* Carga desde Excel. Convive con la carga manual de abajo: las dos
            son válidas y guardan exactamente el mismo dato. */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <Label className="text-xs md:text-sm font-medium text-foreground">
                Cargar desde Excel
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                La plantilla trae una fila por actividad y una columna por semana.
                Reemplaza el plan entero; después podés seguir ajustándolo a mano acá abajo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void theoreticalCurvesService.downloadTemplate()}
                className="text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar plantilla
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFilePicked}
                className="hidden"
              />
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-medium text-foreground">
                  Celdas a corregir ({importErrors.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1.5 pr-4">Fila</th>
                      <th className="py-1.5 pr-4">Columna</th>
                      <th className="py-1.5 pr-4">Valor</th>
                      <th className="py-1.5">Problema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importErrors.map((rowError, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="py-1.5 pr-4 font-medium">{rowError.row}</td>
                        <td className="py-1.5 pr-4">{rowError.column}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{rowError.value || "—"}</td>
                        <td className="py-1.5">{rowError.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* Grilla actividad x semana */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <Label className="text-xs md:text-sm font-medium text-foreground">
                Avance teórico por actividad
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cargá el avance acumulado (%) de cada actividad al final de cada semana.
                Dejá vacías las actividades que el proyecto no hace. Una vez que una
                actividad llega a 100 no hace falta repetirlo en las semanas siguientes.
              </p>
            </div>

            {weekCount > 0 ? (
              <>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="text-sm border-collapse">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="sticky left-0 z-10 bg-muted text-left px-3 py-2.5 text-xs font-medium text-muted-foreground min-w-[190px] border-r border-border">
                          Actividad
                        </th>
                        {weeks.map(week => (
                          <th
                            key={week}
                            className="px-2 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap"
                          >
                            Sem {week}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PLANNABLE.map(cat => {
                        const points = plan[cat.id] ?? {}
                        const weight = weights[cat.id]
                        return (
                          <tr key={cat.id} className="border-t border-border">
                            <td className="sticky left-0 z-10 bg-card px-3 py-1.5 border-r border-border">
                              <span className="text-xs font-medium text-foreground">{cat.label}</span>
                              {weight !== undefined && weight > 0 && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  peso {weight.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            {weeks.map(week => (
                              <td key={week} className="px-1 py-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  value={points[week] ?? ""}
                                  onChange={(e) => setCell(cat.id, week, e.target.value)}
                                  className="bg-input border-border text-foreground text-xs h-7 w-16 text-center no-arrows"
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {problems.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {problems.map((problem, index) => (
                        <p key={index}>{problem}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" onClick={addWeek} variant="outline" size="sm" disabled={isSaving}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Agregar semana
                  </Button>
                  <Button type="button" onClick={removeWeek} variant="outline" size="sm" disabled={isSaving || weekCount === 0}>
                    <Minus className="w-4 h-4 mr-1.5" />
                    Quitar última semana
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {plannedCategories.length} de {PLANNABLE.length} actividades con plan
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg bg-muted/10 gap-4">
                <p className="text-xs text-muted-foreground">
                  Sin plan teórico configurado. Ingresá cuántas semanas dura el proyecto para empezar.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={MAX_WEEKS}
                    placeholder={`Cantidad de semanas (ej. ${DEFAULT_WEEKS})`}
                    value={initialWeekCount}
                    onChange={(e) => setInitialWeekCount(e.target.value)}
                    className="bg-input border-border text-foreground text-sm h-9 w-60 no-arrows"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={generateWeeks}
                    disabled={!initialWeekCount || parseInt(initialWeekCount) < 1}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  >
                    Generar semanas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || plannedCategories.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              "Guardar"
            )}
          </Button>
          {curveId && (
            <Button
              variant="outline"
              onClick={handleDeleteCurve}
              disabled={isSaving}
              className="text-destructive border-destructive/30 hover:bg-destructive/5 text-sm"
            >
              Eliminar plan
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
