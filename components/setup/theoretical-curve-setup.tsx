"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ArrowLeft, Loader2, CheckCircle, X, Plus, AlertTriangle } from "lucide-react"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { theoreticalCurvesService, projectsService } from "@/lib/api"
import type { TheoreticalCurveDataPoint } from "@/lib/types"

interface TheoreticalCurveSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

export function TheoreticalCurveSetup({ projectId, projectName, onBack }: TheoreticalCurveSetupProps) {
  const [curvePoints, setCurvePoints] = useState<TheoreticalCurveDataPoint[]>([])
  const [curveId, setCurveId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>("")
  const [initialWeekCount, setInitialWeekCount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { toasts, success, error: showError, removeToast } = useToast()

  // Cargar curva existente y startDate del proyecto
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [curve, project] = await Promise.all([
          theoreticalCurvesService.get(projectId),
          projectsService.getById(projectId),
        ])
        if (curve) {
          setCurveId(curve.id)
          setCurvePoints(curve.dataPoints)
        }
        if (project.startDate) {
          setStartDate(project.startDate)
        }
      } catch {
        // Curve not found or project error — start fresh
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  // Detectar valores no-monotónicos crecientes
  const monotoneWarning = useMemo(() => {
    for (let i = 1; i < curvePoints.length; i++) {
      if (curvePoints[i].cumulativeProgress < curvePoints[i - 1].cumulativeProgress) {
        return `Semana ${curvePoints[i].weekNumber}: el avance (${curvePoints[i].cumulativeProgress}%) es menor que el de la semana anterior (${curvePoints[i - 1].cumulativeProgress}%)`
      }
    }
    return null
  }, [curvePoints])

  const generateWeeks = () => {
    const count = parseInt(initialWeekCount)
    if (!count || count < 1) return
    const weeks: TheoreticalCurveDataPoint[] = Array.from({ length: count }, (_, i) => ({
      weekNumber: i + 1,
      cumulativeProgress: 0,
    }))
    setCurvePoints(weeks)
    setInitialWeekCount("")
  }

  const addRow = () => {
    const lastWeek = curvePoints.length > 0 ? curvePoints[curvePoints.length - 1].weekNumber : 0
    setCurvePoints([...curvePoints, { weekNumber: lastWeek + 1, cumulativeProgress: 0 }])
  }

  const removeRow = (index: number) => {
    const filtered = curvePoints.filter((_, i) => i !== index)
    // Re-numerar secuencialmente
    const renumbered = filtered.map((point, i) => ({ ...point, weekNumber: i + 1 }))
    setCurvePoints(renumbered)
  }

  const updateRow = (index: number, field: keyof TheoreticalCurveDataPoint, value: number) => {
    const clamped = field === "cumulativeProgress" ? Math.min(100, Math.max(0, value)) : value
    const updated = [...curvePoints]
    updated[index] = { ...updated[index], [field]: clamped }
    setCurvePoints(updated)
  }

  const handleSave = async () => {
    if (curvePoints.length === 0) {
      showError("Error", "Agregá al menos una semana a la curva teórica")
      return
    }

    // Validar que ningún valor > 100
    if (curvePoints.some(p => p.cumulativeProgress > 100)) {
      showError("Error", "Ningún valor de avance puede superar el 100%")
      return
    }

    // Validar monotónica creciente
    if (monotoneWarning) {
      showError("Error de secuencia", monotoneWarning)
      return
    }

    // Validar que la última semana sea 100%
    if (curvePoints[curvePoints.length - 1].cumulativeProgress !== 100) {
      showError("Error", `La última semana (Semana ${curvePoints[curvePoints.length - 1].weekNumber}) debe tener un avance acumulado de 100%`)
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // Guardar startDate del proyecto si se modificó
      if (startDate) {
        await projectsService.update(projectId, { startDate })
      }

      // Guardar curva
      if (curveId) {
        await theoreticalCurvesService.update(projectId, { dataPoints: curvePoints })
      } else {
        const created = await theoreticalCurvesService.create(projectId, { dataPoints: curvePoints })
        setCurveId(created.id)
      }

      setSaveSuccess(true)
      success("Guardado", "La curva teórica fue guardada correctamente")
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      showError("Error", "No se pudo guardar la curva teórica")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCurve = async () => {
    if (!curveId) {
      setCurvePoints([])
      return
    }
    setIsSaving(true)
    try {
      await theoreticalCurvesService.delete(projectId)
      setCurveId(null)
      setCurvePoints([])
      success("Eliminada", "La curva teórica fue eliminada correctamente")
    } catch {
      showError("Error", "No se pudo eliminar la curva teórica")
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
            <p className="text-muted-foreground mt-1 text-sm">Definí el avance acumulado esperado por semana para comparar con el avance real</p>
          </div>
          {saveSuccess && (
            <div className="ml-auto flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
              <CheckCircle className="w-4 h-4" />
              Guardado
            </div>
          )}
        </div>

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

        {/* Tabla de curva teórica */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <Label className="text-xs md:text-sm font-medium text-foreground">
                Curva Teórica de Avance
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Definí el avance acumulado esperado por semana. Se usa en los reportes semanales para comparar con el avance real.
              </p>
            </div>

            {curvePoints.length > 0 ? (
              <>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Semana N°</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Avance Acumulado (%)</th>
                        <th className="px-4 py-2.5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {curvePoints.map((point, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2">
                            <span className="text-sm text-foreground font-medium">Semana {point.weekNumber}</span>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={point.cumulativeProgress || ""}
                              onChange={(e) => updateRow(i, "cumulativeProgress", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                              className="bg-input border-border text-foreground text-sm h-8 w-28 no-arrows"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {monotoneWarning && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Los valores deberían ser monotónicos crecientes. {monotoneWarning}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg bg-muted/10 gap-4">
                <p className="text-xs text-muted-foreground">Sin curva teórica configurada. Ingresá la cantidad de semanas para empezar.</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="Cantidad de semanas"
                    value={initialWeekCount}
                    onChange={(e) => setInitialWeekCount(e.target.value)}
                    className="bg-input border-border text-foreground text-sm h-9 w-48 no-arrows"
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

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                onClick={addRow}
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Agregar semana
              </Button>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || curvePoints.length === 0}
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
              Eliminar curva
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
