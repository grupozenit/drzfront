"use client"

import { useMemo, useState } from "react"
import { Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReportWorkforceEntry, Worker, WorkerFunction, WorkerType, WorkforceEntryDTO } from "@/lib/types"

export const DEFAULT_EMPRESA = "Grupo Zenit"
export const MAX_WORKER_HOURS = 24

/**
 * Una fila del listado del parte. `hours` en null = "la jornada del día":
 * sigue al horario y a las horas suspendidas mientras nadie la toque.
 */
export interface WorkforceRow {
  key: string
  workerId?: string
  fullName: string
  empresa: string
  funcion: string
  tipo: WorkerType
  present: boolean
  hours: string | null
  /** Agregado solo para este parte (no está en la plantilla del proyecto). */
  adHoc: boolean
}

const byTypeThenName = (a: WorkforceRow, b: WorkforceRow) =>
  a.tipo === b.tipo ? a.fullName.localeCompare(b.fullName, "es") : a.tipo === "directo" ? -1 : 1

/** Plantilla del proyecto → filas, todas presentes (lo habitual es que esté todo el plantel). */
export function rowsFromRoster(roster: Worker[]): WorkforceRow[] {
  return roster
    .map((w) => ({
      key: w.id,
      workerId: w.id,
      fullName: w.fullName,
      empresa: w.empresa,
      funcion: w.funcion,
      tipo: w.tipo,
      present: true,
      hours: null,
      adHoc: false,
    }))
    .sort(byTypeThenName)
}

/**
 * Presentes guardados en el parte + el resto de la plantilla (sin tildar), para
 * poder corregir al editar. Lo guardado manda: es la copia de ese día.
 */
export function rowsFromReport(saved: ReportWorkforceEntry[], roster: Worker[]): WorkforceRow[] {
  const rows: WorkforceRow[] = saved.map((entry) => ({
    key: entry.id,
    workerId: entry.workerId ?? undefined,
    fullName: entry.fullName,
    empresa: entry.empresa,
    funcion: entry.funcion,
    tipo: entry.tipo,
    present: true,
    hours: String(entry.hours),
    // Sin workerId: se agregó solo en el parte, o ya no está en la plantilla
    adHoc: !entry.workerId,
  }))
  const savedIds = new Set(saved.flatMap((e) => (e.workerId ? [e.workerId] : [])))
  for (const row of rowsFromRoster(roster)) {
    if (row.workerId && !savedIds.has(row.workerId)) rows.push({ ...row, present: false })
  }
  return rows.sort(byTypeThenName)
}

/** Horas efectivas de una fila (la jornada del día si no se tocaron). */
export function rowHours(row: WorkforceRow, defaultHours: number): number | null {
  if (row.hours === null || row.hours.trim() === "") return defaultHours
  const value = Number(row.hours)
  return Number.isFinite(value) ? value : null
}

/** Primer problema en las horas cargadas, o null. Espejo de la cota del backend (0-24). */
export function findWorkforceError(rows: WorkforceRow[], defaultHours: number): string | null {
  for (const row of rows) {
    if (!row.present) continue
    const hours = rowHours(row, defaultHours)
    if (hours === null || hours < 0 || hours > MAX_WORKER_HOURS) {
      return `${row.fullName}: las horas tienen que ser un número entre 0 y ${MAX_WORKER_HOURS}.`
    }
  }
  return null
}

/**
 * Lo que viaja al backend. Con workerId solo van el id y las horas: nombre,
 * empresa, función y tipo los pone el servidor desde la plantilla.
 */
export function toWorkforceDTO(rows: WorkforceRow[], defaultHours: number): WorkforceEntryDTO[] {
  return rows
    .filter((row) => row.present)
    .map((row) => {
      const hours = rowHours(row, defaultHours) ?? 0
      return row.workerId
        ? { workerId: row.workerId, hours }
        : { fullName: row.fullName, empresa: row.empresa, funcion: row.funcion, tipo: row.tipo, hours }
    })
}

interface WorkforcePanelProps {
  rows: WorkforceRow[]
  onChange: (rows: WorkforceRow[]) => void
  functions: WorkerFunction[]
  defaultHours: number
}

const EMPTY_EXTRA = { fullName: "", empresa: DEFAULT_EMPRESA, funcion: "", tipo: "directo" as WorkerType }

export function WorkforcePanel({ rows, onChange, functions, defaultHours }: WorkforcePanelProps) {
  const [search, setSearch] = useState("")
  const [extra, setExtra] = useState<typeof EMPTY_EXTRA | null>(null)
  const [extraError, setExtraError] = useState<string | null>(null)

  const present = rows.filter((r) => r.present)
  const presentDirect = present.filter((r) => r.tipo === "directo").length
  const totalHours = present.reduce((sum, row) => sum + (rowHours(row, defaultHours) ?? 0), 0)

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es")
    if (!term) return rows
    return rows.filter((r) =>
      [r.fullName, r.empresa, r.funcion].some((v) => v.toLocaleLowerCase("es").includes(term)),
    )
  }, [rows, search])

  const update = (key: string, patch: Partial<WorkforceRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const setAll = (value: boolean) => {
    const keys = new Set(visible.map((r) => r.key))
    onChange(rows.map((row) => (keys.has(row.key) ? { ...row, present: value } : row)))
  }

  const addExtra = () => {
    if (!extra) return
    if (!extra.fullName.trim()) return setExtraError("Completá el apellido y nombre")
    if (!extra.funcion) return setExtraError("Elegí una función")
    onChange(
      [
        ...rows,
        {
          key: `extra-${Math.random().toString(36).slice(2, 10)}`,
          fullName: extra.fullName.trim(),
          empresa: extra.empresa.trim() || DEFAULT_EMPRESA,
          funcion: extra.funcion,
          tipo: extra.tipo,
          present: true,
          hours: null,
          adHoc: true,
        },
      ].sort(byTypeThenName),
    )
    setExtra(null)
    setExtraError(null)
  }

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-xs md:text-sm text-muted-foreground md:mr-auto">
          <span className="font-semibold text-foreground">{present.length}</span> presentes de {rows.length} ·{" "}
          {presentDirect} directos · {present.length - presentDirect} indirectos ·{" "}
          <span className="font-semibold text-foreground">{totalHours.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</span>{" "}
          horas hombre
        </p>
        <div className="relative w-full md:w-56">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar trabajador"
            className="pl-8 bg-input border-border text-sm h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setAll(true)}>
            Todos presentes
          </Button>
          <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setAll(false)}>
            Ninguno
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[28rem] overflow-y-auto border border-border rounded-md">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-muted z-10">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 px-2 w-10">
                <span className="sr-only">Presente</span>
              </th>
              <th className="py-2 pr-2 w-10">N.º</th>
              <th className="py-2 pr-2">Apellido y nombre</th>
              <th className="py-2 pr-2">Empresa</th>
              <th className="py-2 pr-2">Función</th>
              <th className="py-2 pr-2 w-24">Tipo</th>
              <th className="py-2 pr-2 w-20">Hs</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr
                key={row.key}
                className={`border-t border-border ${row.present ? "" : "opacity-50"}`}
              >
                <td className="py-1.5 px-2">
                  <input
                    type="checkbox"
                    checked={row.present}
                    onChange={(e) => update(row.key, { present: e.target.checked })}
                    aria-label={`${row.fullName} presente`}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-input"
                  />
                </td>
                <td className="py-1.5 pr-2 text-muted-foreground tabular-nums">{index + 1}</td>
                <td className="py-1.5 pr-2 text-foreground">
                  {row.fullName}
                  {row.adHoc && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground" title="No figura en la plantilla del proyecto">
                      (solo este parte)
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2">{row.empresa}</td>
                <td className="py-1.5 pr-2">{row.funcion}</td>
                <td className="py-1.5 pr-2 text-xs">{row.tipo === "directo" ? "Directo" : "Indirecto"}</td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min={0}
                    max={MAX_WORKER_HOURS}
                    step={0.5}
                    inputMode="decimal"
                    disabled={!row.present}
                    value={row.hours ?? String(defaultHours)}
                    onChange={(e) => update(row.key, { hours: e.target.value })}
                    aria-label={`Horas de ${row.fullName}`}
                    className="h-8 w-16 text-sm bg-input border-border no-arrows"
                  />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {extra ? (
        <div className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">
            Persona que no figura en la plantilla del proyecto. Queda registrada solo en este parte.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              value={extra.fullName}
              maxLength={200}
              onChange={(e) => setExtra({ ...extra, fullName: e.target.value })}
              placeholder="Apellido y nombre"
              aria-label="Apellido y nombre"
              className="h-9 text-sm bg-input border-border"
            />
            <Input
              value={extra.empresa}
              maxLength={150}
              onChange={(e) => setExtra({ ...extra, empresa: e.target.value })}
              placeholder={DEFAULT_EMPRESA}
              aria-label="Empresa"
              className="h-9 text-sm bg-input border-border"
            />
            <Select value={extra.funcion} onValueChange={(funcion) => setExtra({ ...extra, funcion })}>
              <SelectTrigger className="h-9 text-sm" aria-label="Función">
                <SelectValue placeholder="Función" />
              </SelectTrigger>
              <SelectContent>
                {functions.map((f) => (
                  <SelectItem key={f.id} value={f.name}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={extra.tipo} onValueChange={(tipo: WorkerType) => setExtra({ ...extra, tipo })}>
              <SelectTrigger className="h-9 text-sm" aria-label="Tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="directo">Directo</SelectItem>
                <SelectItem value="indirecto">Indirecto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {extraError && <p className="text-xs text-destructive">{extraError}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={addExtra} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
              Agregar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setExtra(null)
                setExtraError(null)
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        functions.length > 0 && (
          <button
            type="button"
            onClick={() => setExtra(EMPTY_EXTRA)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar una persona que no está en el listado
          </button>
        )
      )}
    </div>
  )
}
