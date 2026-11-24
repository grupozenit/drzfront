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
import type { ProjectTotalItem, ProjectTotalManualItem, TotalsImportError } from "@/lib/types"

interface TotalsSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

/** Lo que el usuario cambió en una fila y todavía no guardó. */
interface ItemDraft {
  applies: boolean
  quantity: string
}

/**
 * Identidad de un ítem: la terna del catálogo, nunca un string unido con
 * guiones (hay sub-actividades como "Pre-Drilling" que lo harían ambiguo).
 */
const itemKey = (item: Pick<ProjectTotalItem, "category" | "subActivity" | "component">) =>
  JSON.stringify([item.category, item.subActivity, item.component])

/**
 * Totales del proyecto (el alcance de obra).
 *
 * Muestra el catálogo completo, incluidas las actividades que todavía no son
 * parte del alcance, y se carga de dos formas equivalentes: subiendo la
 * plantilla Excel (reemplaza todo) o a mano, pasando cada actividad a SÍ con su
 * cantidad. Lo manual existe porque ingeniería confirma algunas cantidades
 * después del onboarding: esas quedan en NO hasta tener el número.
 */
export function TotalsSetup({ projectId, projectName, onBack }: TotalsSetupProps) {
  const { totals, isLoading, isSaving, loadTotals, importTemplate, saveItems, downloadTemplate } =
    useProjectTotals()
  const { can } = usePermissions()
  const { toasts, success, error: showError, removeToast } = useToast()

  const canWrite = can("totales", "update")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filas editadas que todavía no se guardaron, por itemKey()
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})
  const [onlyApplicable, setOnlyApplicable] = useState(false)
  const [importErrors, setImportErrors] = useState<TotalsImportError[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  useEffect(() => {
    loadTotals(projectId)
  }, [projectId, loadTotals])

  const allItems = useMemo(() => totals?.items ?? [], [totals])

  /** Estado visible de una fila: lo editado si hay, si no lo guardado. */
  const rowState = (item: ProjectTotalItem): ItemDraft =>
    drafts[itemKey(item)] ?? {
      applies: item.applies,
      quantity: item.applies ? String(item.totalQuantity) : "",
    }

  const applicableCount = allItems.filter((item) => rowState(item).applies).length

  const visibleItems = useMemo(
    () => (onlyApplicable ? allItems.filter((item) => (drafts[itemKey(item)] ?? item).applies) : allItems),
    [allItems, drafts, onlyApplicable],
  )

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ProjectTotalItem[]>()
    for (const item of visibleItems) {
      const current = groups.get(item.categoryLabel) ?? []
      current.push(item)
      groups.set(item.categoryLabel, current)
    }
    return Array.from(groups.entries())
  }, [visibleItems])

  const setRow = (item: ProjectTotalItem, patch: Partial<ItemDraft>) => {
    const key = itemKey(item)
    setDrafts((prev) => {
      const next = { ...(prev[key] ?? rowState(item)), ...patch }
      // Si quedó igual a lo guardado deja de ser un cambio pendiente
      const unchanged =
        next.applies === item.applies &&
        (!next.applies || Number(next.quantity) === item.totalQuantity)
      const { [key]: _omit, ...rest } = prev
      return unchanged ? rest : { ...rest, [key]: next }
    })
  }

  /** Una fila en SÍ sin una cantidad mayor a 0 no se puede guardar. */
  const isInvalid = (draft: ItemDraft) => {
    if (!draft.applies) return false
    const quantity = Number(draft.quantity)
    return draft.quantity.trim() === "" || !Number.isFinite(quantity) || quantity <= 0
  }

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
    const changed = allItems.filter((item) => drafts[itemKey(item)])
    if (changed.some((item) => isInvalid(drafts[itemKey(item)]))) {
      showError(
        "Falta la cantidad",
        "Las actividades en SÍ necesitan una cantidad total mayor a 0. Si todavía no está confirmada, dejala en NO.",
      )
      return
    }

    const items: ProjectTotalManualItem[] = changed.map((item) => {
      const draft = drafts[itemKey(item)]
      return {
        category: item.category,
        subActivity: item.subActivity,
        component: item.component,
        applies: draft.applies,
        totalQuantity: draft.applies ? Number(draft.quantity) : 0,
      }
    })

    try {
      await saveItems(projectId, items)
      setDrafts({})
      success("Totales guardados", "El alcance del proyecto se actualizó correctamente")
    } catch (err: any) {
      showError("Error", err?.message ?? "No se pudieron guardar los totales")
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
                {`${applicableCount} de ${allItems.length} actividades en el alcance del proyecto. `}
                Cargalas a mano pasándolas a SÍ con su cantidad, o subí la plantilla completa.
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

        <label className="flex items-center gap-2 text-sm text-muted-foreground w-fit cursor-pointer">
          <input
            type="checkbox"
            checked={onlyApplicable}
            onChange={(e) => setOnlyApplicable(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Ver solo las actividades que aplican
        </label>

        {groupedItems.map(([categoryLabel, items]) => (
          <Card key={categoryLabel} className="p-4 md:p-6 bg-card border-border">
            <h3 className="text-base font-semibold text-foreground mb-4">{categoryLabel}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Actividad</th>
                    <th className="py-2 pr-4 w-20">Unidad</th>
                    <th className="py-2 pr-4 w-32">Aplica</th>
                    <th className="py-2 w-40">Cantidad total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const key = itemKey(item)
                    const row = rowState(item)
                    const invalid = drafts[key] !== undefined && isInvalid(row)
                    return (
                      <tr
                        key={key}
                        className={`border-t border-border ${row.applies ? "" : "text-muted-foreground"}`}
                      >
                        <td className="py-2 pr-4">
                          {item.subActivity || item.categoryLabel}
                          {item.component && (
                            <span className="text-muted-foreground"> — {item.component}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{item.unit}</td>
                        <td className="py-2 pr-4">
                          <div
                            role="radiogroup"
                            aria-label={`Aplica: ${item.label}`}
                            className="inline-flex rounded-md border border-border overflow-hidden"
                          >
                            {[true, false].map((value) => (
                              <button
                                key={String(value)}
                                type="button"
                                role="radio"
                                aria-checked={row.applies === value}
                                disabled={!canWrite || isSaving}
                                onClick={() => setRow(item, { applies: value })}
                                className={`px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                                  row.applies === value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-transparent text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {value ? "SÍ" : "NO"}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            placeholder={row.applies ? "Cantidad" : "—"}
                            disabled={!canWrite || !row.applies || isSaving}
                            value={row.applies ? row.quantity : ""}
                            onChange={(e) => setRow(item, { quantity: e.target.value })}
                            aria-invalid={invalid}
                            className={`bg-input text-foreground text-sm h-9 no-arrows ${
                              invalid ? "border-destructive" : "border-border"
                            }`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {groupedItems.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no hay actividades en SÍ. Destildá el filtro para ver el catálogo completo.
            </p>
          </Card>
        )}

        {canWrite && (
          <div className="sticky bottom-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-background/95 backdrop-blur flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            {hasChanges && (
              <p className="text-xs text-muted-foreground sm:mr-auto">
                {Object.keys(drafts).length} cambio(s) sin guardar
              </p>
            )}
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
              Guardar totales
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
