"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Download, Loader2, Upload, AlertTriangle, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { useProjectTotals } from "@/lib/hooks/useProjectTotals"
import { usePermissions } from "@/lib/hooks"
import { validateSpreadsheetFile } from "@/lib/utils/sanitize"
import type { ProjectTotalItem, TotalsImportError } from "@/lib/types"

interface TotalsSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

/**
 * Totales del proyecto (el alcance de obra).
 *
 * Reemplaza al formulario manual de línea base: el alcance se carga subiendo la
 * plantilla Excel completada, y después solo se ajustan cantidades a mano.
 */
export function TotalsSetup({ projectId, projectName, onBack }: TotalsSetupProps) {
  const { totals, isLoading, isSaving, loadTotals, importTemplate, saveQuantities, downloadTemplate } =
    useProjectTotals()
  const { can } = usePermissions()
  const { toasts, success, error: showError, removeToast } = useToast()

  const canWrite = can("totales", "update")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cantidades editadas que todavía no se guardaron
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [importErrors, setImportErrors] = useState<TotalsImportError[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  useEffect(() => {
    loadTotals(projectId)
  }, [projectId, loadTotals])

  // Solo se muestran los ítems que aplican: los demás no son parte del alcance
  const applicableItems = useMemo(
    () => (totals?.items ?? []).filter((item) => item.applies),
    [totals],
  )

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ProjectTotalItem[]>()
    for (const item of applicableItems) {
      const current = groups.get(item.categoryLabel) ?? []
      current.push(item)
      groups.set(item.categoryLabel, current)
    }
    return Array.from(groups.entries())
  }, [applicableItems])

  const hasChanges = Object.keys(drafts).length > 0

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const validation = validateSpreadsheetFile(file)
    if (!validation.valid) {
      showError("Archivo inválido", validation.error ?? "Revisá el archivo")
      return
    }

    // Volver a subir reemplaza todo el alcance, incluidas las ediciones manuales
    if (totals?.hasTotals) {
      setPendingFile(file)
      return
    }
    void runImport(file)
  }

  const runImport = async (file: File) => {
    setImportErrors([])
    try {
      const result = await importTemplate(projectId, file)
      setDrafts({})
      success(
        "Totales importados",
        `${result.importedItems} actividades del alcance, ${result.notApplicable} marcadas como no aplican.`,
      )
    } catch (err: any) {
      // El backend rechaza el archivo entero y devuelve qué filas corregir
      const rows: TotalsImportError[] = err?.data?.errors ?? []
      setImportErrors(rows)
      showError(
        "No se pudo importar",
        rows.length
          ? `El archivo tiene ${rows.length} fila(s) con problemas. No se importó nada.`
          : err?.message ?? "Revisá el archivo e intentá de nuevo",
      )
    }
  }

  const handleSave = async () => {
    const items = Object.entries(drafts)
      .map(([id, value]) => ({ id, totalQuantity: Number(value) }))
      .filter((item) => Number.isFinite(item.totalQuantity) && item.totalQuantity >= 0)

    if (items.length !== Object.keys(drafts).length) {
      showError("Cantidad inválida", "Revisá que todas las cantidades sean números mayores o iguales a 0")
      return
    }

    try {
      await saveQuantities(projectId, items)
      setDrafts({})
      success("Cantidades guardadas", "Los totales se actualizaron correctamente")
    } catch (err: any) {
      showError("Error", err?.message ?? "No se pudieron guardar las cantidades")
    }
  }

  if (isLoading) {
    return (
      <div className="container px-4 md:px-6 py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando totales...</p>
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <Dialog
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={() => {
          const file = pendingFile
          setPendingFile(null)
          if (file) void runImport(file)
        }}
        title="Reemplazar los totales"
        message="Subir una plantilla nueva reemplaza todo el alcance del proyecto y descarta las cantidades que hayas ajustado a mano. ¿Continuar?"
        confirmText="Reemplazar"
        cancelText="Cancelar"
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Totales - {projectName}
                </h2>
                {totals?.hasTotals && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {totals?.hasTotals
                  ? `${applicableItems.length} actividades en el alcance del proyecto.`
                  : "Descargá la plantilla, completala y subila para definir el alcance."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void downloadTemplate()} className="text-sm">
              <Download className="w-4 h-4 mr-2" />
              Descargar plantilla
            </Button>
            {canWrite && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {totals?.hasTotals ? "Subir nueva plantilla" : "Subir plantilla"}
              </Button>
            )}
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
          <Card className="p-4 md:p-6 border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">
                Filas a corregir ({importErrors.length})
              </h3>
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
          </Card>
        )}

        {!totals?.hasTotals ? (
          <Card className="p-8 bg-card border-border text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">
              Todavía no hay totales cargados
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Descargá la plantilla, marcá qué actividades aplican a este proyecto con su cantidad
              contractual, y subila. Esos totales son la referencia contra la que se calculan los
              avances de obra.
            </p>
          </Card>
        ) : (
          <>
            {groupedItems.map(([categoryLabel, items]) => (
              <Card key={categoryLabel} className="p-4 md:p-6 bg-card border-border">
                <h3 className="text-base font-semibold text-foreground mb-4">{categoryLabel}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-4">Actividad</th>
                        <th className="py-2 pr-4 w-24">Unidad</th>
                        <th className="py-2 w-40">Cantidad total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="py-2 pr-4">
                            {item.subActivity || item.categoryLabel}
                            {item.component && (
                              <span className="text-muted-foreground"> — {item.component}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{item.unit}</td>
                          <td className="py-2">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              disabled={!canWrite}
                              value={drafts[item.id] ?? String(item.totalQuantity)}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              className="bg-input border-border text-foreground text-sm h-9 no-arrows"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}

            {canWrite && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDrafts({})}
                  disabled={!hasChanges || isSaving}
                  className="text-sm"
                >
                  Descartar cambios
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  disabled={!hasChanges || isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar cantidades
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
