"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle, Download, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { workersService } from "@/lib/api"
import { validateSpreadsheetFile } from "@/lib/utils/sanitize"
import type { Worker, WorkersImportError } from "@/lib/types"

interface WorkersSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

/**
 * Carga de la plantilla de trabajadores de un proyecto (Configuración →
 * Proyectos). Solo Tecnología llega acá: el botón se muestra con
 * `trabajadores:create` + `proyectos:update`, y el backend exige lo mismo.
 *
 * Subir la plantilla REEMPLAZA el listado entero (incluidas las ediciones y
 * bajas manuales), así que se confirma cuando ya hay gente cargada. Los partes
 * ya enviados no cambian: guardan su propia copia de los presentes.
 */
export function WorkersSetup({ projectId, projectName, onBack }: WorkersSetupProps) {
  const { toasts, success, error: showError, removeToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [workers, setWorkers] = useState<Worker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [importErrors, setImportErrors] = useState<WorkersImportError[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setWorkers(await workersService.getAll({ projectId, status: "todos" }))
    } catch {
      setWorkers([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const active = workers.filter((w) => w.estado === "activo")
  const direct = active.filter((w) => w.tipo === "directo").length

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    // Filtro de usabilidad: el control real (extensión, MIME, magic bytes, ZIP) es del backend
    const validation = validateSpreadsheetFile(file)
    if (!validation.valid) {
      showError("Archivo inválido", validation.error ?? "Revisá el archivo")
      return
    }
    if (workers.length > 0) {
      setPendingFile(file)
      return
    }
    void runImport(file)
  }

  const runImport = async (file: File) => {
    setImportErrors([])
    setIsUploading(true)
    try {
      const result = await workersService.importTemplate(projectId, file)
      success(
        "Plantilla importada",
        `${result.imported} trabajadores (${result.direct} directos, ${result.indirect} indirectos).` +
          (result.newFunctions ? ` ${result.newFunctions} funciones nuevas.` : ""),
      )
      await load()
    } catch (err: any) {
      const rows: WorkersImportError[] = err?.data?.errors ?? []
      setImportErrors(rows)
      showError(
        "No se pudo importar",
        rows.length
          ? `El archivo tiene ${rows.length} fila(s) con problemas. No se importó nada.`
          : err?.message ?? "Revisá el archivo e intentá de nuevo",
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async () => {
    try {
      await workersService.downloadTemplate(projectId)
    } catch {
      showError("Error", "No se pudo descargar la plantilla")
    }
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
        title="Reemplazar el listado de trabajadores"
        message={`La plantilla nueva reemplaza a las ${workers.length} personas cargadas, incluidas las altas, ediciones y bajas hechas a mano. Los partes diarios ya cargados no cambian. ¿Continuar?`}
        confirmText="Reemplazar"
        cancelText="Cancelar"
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Volver">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">Trabajadores - {projectName}</h2>
                {active.length > 0 && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {isLoading
                  ? "Cargando..."
                  : active.length > 0
                    ? `${active.length} trabajadores activos: ${direct} directos y ${active.length - direct} indirectos.`
                    : "Descargá la plantilla, completala con el plantel del proyecto y subila."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleDownload()} className="text-sm">
              <Download className="w-4 h-4 mr-2" />
              Descargar plantilla
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {workers.length > 0 ? "Subir nueva plantilla" : "Subir plantilla"}
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
          <Card className="p-4 md:p-6 border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Filas a corregir ({importErrors.length})</h3>
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

        <Card className="p-6 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Cómo funciona</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
            <li>
              La hoja <strong className="text-foreground">FUNCIONES</strong> define la lista de funciones (cargos) de la
              empresa. La primera vez se completa ahí; después la plantilla ya la trae cargada y se pueden sumar nuevas.
            </li>
            <li>
              En la hoja <strong className="text-foreground">Trabajadores</strong> va una persona por fila: apellido y
              nombre, empresa (Grupo Zenit o el subcontrato), función y tipo (Directo / Indirecto).
            </li>
            <li>
              Cada vez que se sube, la plantilla <strong className="text-foreground">reemplaza el listado entero</strong>:
              cargá siempre el plantel completo, con las incorporaciones y sin las bajas.
            </li>
          </ol>
          {active.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              El listado se consulta y se edita persona por persona en{" "}
              <Link href="/trabajadores" className="text-primary hover:underline">
                Trabajadores
              </Link>
              .
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
