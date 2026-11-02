"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { HardHat, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, X, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToastContainer, useToast } from "@/components/ui/toast"
import { workersService } from "@/lib/api"
import { usePermissions, useProjects } from "@/lib/hooks"
import type { Worker, WorkerFunction, WorkerType } from "@/lib/types"

export const DEFAULT_EMPRESA = "Grupo Zenit"

const TYPE_LABELS: Record<WorkerType, string> = { directo: "Directo", indirecto: "Indirecto" }

// Recharts no lee tokens CSS: mismos hex que --chart-1 / --chart-2
const COLOR_DIRECT = "#d68f2d"
const COLOR_INDIRECT = "#a1948b"

interface Draft {
  fullName: string
  empresa: string
  funcion: string
  tipo: WorkerType
}

const EMPTY_DRAFT: Draft = { fullName: "", empresa: DEFAULT_EMPRESA, funcion: "", tipo: "directo" }

/** Agrupa por un campo y separa directos/indirectos, ordenado de mayor a menor. */
function groupBy(workers: Worker[], key: "empresa" | "funcion") {
  const groups = new Map<string, { name: string; directo: number; indirecto: number; total: number }>()
  for (const worker of workers) {
    const name = worker[key] || "—"
    const group = groups.get(name) ?? { name, directo: 0, indirecto: 0, total: 0 }
    group[worker.tipo] += 1
    group.total += 1
    groups.set(name, group)
  }
  return Array.from(groups.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"))
}

function SummaryChart({ title, data }: { title: string; data: ReturnType<typeof groupBy> }) {
  // Una barra por grupo, con alto suficiente para leer cada etiqueta
  const height = Math.max(140, data.length * 30 + 40)
  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      <h3 className="text-sm md:text-base font-semibold text-foreground mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 10 }}
                stroke="currentColor"
                className="text-muted-foreground"
                tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 19)}…` : value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="directo" name="Directos" stackId="t" fill={COLOR_DIRECT} />
              <Bar dataKey="indirecto" name="Indirectos" stackId="t" fill={COLOR_INDIRECT} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function StatTile({ label, value, swatch }: { label: string; value: number; swatch?: string }) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {swatch && <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: swatch }} />}
        {label}
      </div>
      <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
    </Card>
  )
}

/** Celdas editables de un trabajador (alta y edición comparten las mismas). */
function WorkerRowEditor({
  draft,
  onChange,
  functions,
  empresas,
}: {
  draft: Draft
  onChange: (draft: Draft) => void
  functions: WorkerFunction[]
  empresas: string[]
}) {
  return (
    <>
      <td className="py-2 pr-3">
        <Input
          value={draft.fullName}
          maxLength={200}
          onChange={(e) => onChange({ ...draft, fullName: e.target.value })}
          placeholder="Apellido y nombre"
          aria-label="Apellido y nombre"
          className="bg-input border-border text-sm h-9"
        />
      </td>
      <td className="py-2 pr-3">
        <Input
          value={draft.empresa}
          maxLength={150}
          list="workers-empresas"
          onChange={(e) => onChange({ ...draft, empresa: e.target.value })}
          placeholder={DEFAULT_EMPRESA}
          aria-label="Empresa"
          className="bg-input border-border text-sm h-9"
        />
        <datalist id="workers-empresas">
          {empresas.map((empresa) => (
            <option key={empresa} value={empresa} />
          ))}
        </datalist>
      </td>
      <td className="py-2 pr-3">
        <Select value={draft.funcion} onValueChange={(funcion) => onChange({ ...draft, funcion })}>
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
      </td>
      <td className="py-2 pr-3">
        <Select value={draft.tipo} onValueChange={(tipo: WorkerType) => onChange({ ...draft, tipo })}>
          <SelectTrigger className="h-9 text-sm" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="directo">Directo</SelectItem>
            <SelectItem value="indirecto">Indirecto</SelectItem>
          </SelectContent>
        </Select>
      </td>
    </>
  )
}

export function WorkersManagement() {
  const { projects, isLoading: isLoadingProjects, loadProjects } = useProjects()
  const { can } = usePermissions()
  const { toasts, success, error: showError, removeToast } = useToast()

  const canCreate = can("trabajadores", "create")
  const canUpdate = can("trabajadores", "update")
  const canDelete = can("trabajadores", "delete")

  // El backend ya devuelve solo los proyectos del alcance del usuario
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base", numeric: true })),
    [projects],
  )
  const [projectId, setProjectId] = useState("")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [functions, setFunctions] = useState<WorkerFunction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"todos" | WorkerType>("todos")
  const [showInactive, setShowInactive] = useState(false)

  const [newDraft, setNewDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<Worker | null>(null)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!projectId && sortedProjects.length > 0) setProjectId(sortedProjects[0].id)
  }, [sortedProjects, projectId])

  const loadWorkers = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    try {
      const [list, fns] = await Promise.all([
        workersService.getAll({ projectId, status: "todos" }),
        workersService.getFunctions(),
      ])
      setWorkers(list)
      setFunctions(fns)
    } catch (err: any) {
      showError("Error", err?.message ?? "No se pudo cargar el listado de trabajadores")
    } finally {
      setIsLoading(false)
    }
    // showError cambia en cada render; recargar solo al cambiar de proyecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    setEditingId(null)
    setNewDraft(null)
    void loadWorkers()
  }, [loadWorkers])

  const active = useMemo(() => workers.filter((w) => w.estado === "activo"), [workers])
  const inactiveCount = workers.length - active.length
  const byEmpresa = useMemo(() => groupBy(active, "empresa"), [active])
  const byFuncion = useMemo(() => groupBy(active, "funcion"), [active])
  const empresas = useMemo(
    () => Array.from(new Set([DEFAULT_EMPRESA, ...workers.map((w) => w.empresa)])).sort((a, b) => a.localeCompare(b, "es")),
    [workers],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es")
    return workers
      .filter((w) => (showInactive ? w.estado === "baja" : w.estado === "activo"))
      .filter((w) => typeFilter === "todos" || w.tipo === typeFilter)
      .filter(
        (w) =>
          !term ||
          [w.fullName, w.empresa, w.funcion].some((value) => value.toLocaleLowerCase("es").includes(term)),
      )
  }, [workers, search, typeFilter, showInactive])

  const validate = (draft: Draft): string | null => {
    if (!draft.fullName.trim()) return "Completá el apellido y nombre"
    if (!draft.funcion) return "Elegí una función"
    return null
  }

  const replaceWorker = (updated: Worker) =>
    setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))

  const handleCreate = async () => {
    if (!newDraft) return
    const problem = validate(newDraft)
    if (problem) return showError("Dato incompleto", problem)
    setIsSaving(true)
    try {
      const created = await workersService.create({
        projectId,
        fullName: newDraft.fullName.trim(),
        empresa: newDraft.empresa.trim() || DEFAULT_EMPRESA,
        funcion: newDraft.funcion,
        tipo: newDraft.tipo,
      })
      setWorkers((prev) => [...prev, created])
      setNewDraft(null)
      success("Trabajador agregado", created.fullName)
    } catch (err: any) {
      showError("No se pudo agregar", err?.message ?? "Revisá los datos")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    const problem = validate(editDraft)
    if (problem) return showError("Dato incompleto", problem)
    setIsSaving(true)
    try {
      const updated = await workersService.update(editingId, {
        fullName: editDraft.fullName.trim(),
        empresa: editDraft.empresa.trim() || DEFAULT_EMPRESA,
        funcion: editDraft.funcion,
        tipo: editDraft.tipo,
      })
      replaceWorker(updated)
      setEditingId(null)
      success("Cambios guardados", updated.fullName)
    } catch (err: any) {
      showError("No se pudo guardar", err?.message ?? "Revisá los datos")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (worker: Worker) => {
    try {
      replaceWorker(await workersService.remove(worker.id))
      success("Trabajador dado de baja", worker.fullName)
    } catch (err: any) {
      showError("No se pudo dar de baja", err?.message ?? "Intentá de nuevo")
    }
  }

  const handleReactivate = async (worker: Worker) => {
    try {
      replaceWorker(await workersService.update(worker.id, { estado: "activo" }))
      success("Trabajador reactivado", worker.fullName)
    } catch (err: any) {
      showError("No se pudo reactivar", err?.message ?? "Intentá de nuevo")
    }
  }

  const startEdit = (worker: Worker) => {
    setEditingId(worker.id)
    setEditDraft({ fullName: worker.fullName, empresa: worker.empresa, funcion: worker.funcion, tipo: worker.tipo })
  }

  const directCount = active.filter((w) => w.tipo === "directo").length

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Dialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete)
        }}
        title="Dar de baja"
        message={`${pendingDelete?.fullName ?? ""} deja de figurar en el listado y en los partes nuevos. Los partes ya cargados no cambian. Se puede reactivar desde "Ver bajas".`}
        confirmText="Dar de baja"
        cancelText="Cancelar"
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">Trabajadores</h2>
            <p className="text-muted-foreground mt-1 text-sm">Plantilla de personal directo e indirecto por proyecto.</p>
          </div>
          <div className="w-full md:w-72">
            {isLoadingProjects && projects.length === 0 ? (
              <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando proyectos...
              </div>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-label="Proyecto">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {sortedProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {!isLoadingProjects && projects.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center text-sm text-muted-foreground">
            No tenés proyectos asignados. Pedile a Tecnología que te asigne una obra en Configuración → Equipo.
          </Card>
        ) : isLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando trabajadores...</p>
          </div>
        ) : workers.length === 0 && !newDraft ? (
          <Card className="p-8 bg-card border-border text-center">
            <HardHat className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">Este proyecto no tiene trabajadores cargados</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Tecnología carga la plantilla de personal desde Configuración → Proyectos → Trabajadores.
            </p>
            {canCreate && functions.length > 0 && (
              <Button onClick={() => setNewDraft(EMPTY_DRAFT)} variant="outline" className="mt-4 text-sm">
                <Plus className="w-4 h-4 mr-2" /> Agregar a mano
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <StatTile label="Total" value={active.length} />
              <StatTile label="Directos" value={directCount} swatch={COLOR_DIRECT} />
              <StatTile label="Indirectos" value={active.length - directCount} swatch={COLOR_INDIRECT} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SummaryChart title="Por empresa" data={byEmpresa} />
              <SummaryChart title="Por función" data={byFuncion} />
            </div>

            {/* Listado */}
            <Card className="p-4 md:p-6 bg-card border-border">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <h3 className="text-sm md:text-base font-semibold text-foreground lg:mr-auto">
                  {showInactive ? `Bajas (${visible.length})` : `Listado (${visible.length})`}
                </h3>
                <div className="relative w-full lg:w-64">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar nombre, empresa o función"
                    aria-label="Buscar"
                    className="pl-8 bg-input border-border text-sm h-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v: "todos" | WorkerType) => setTypeFilter(v)}>
                  <SelectTrigger className="h-9 text-sm w-full lg:w-40" aria-label="Tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="directo">Directos</SelectItem>
                    <SelectItem value="indirecto">Indirectos</SelectItem>
                  </SelectContent>
                </Select>
                {(inactiveCount > 0 || showInactive) && (
                  <Button variant="outline" onClick={() => setShowInactive((v) => !v)} className="h-9 text-sm">
                    {showInactive ? "Ver activos" : `Ver bajas (${inactiveCount})`}
                  </Button>
                )}
                {canCreate && !showInactive && (
                  <Button
                    onClick={() => setNewDraft(EMPTY_DRAFT)}
                    disabled={!!newDraft || functions.length === 0}
                    title={functions.length === 0 ? "Primero hay que importar la plantilla con la lista de funciones" : undefined}
                    className="h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 w-12">N.º</th>
                      <th className="py-2 pr-3">Apellido y nombre</th>
                      <th className="py-2 pr-3">Empresa</th>
                      <th className="py-2 pr-3">Función</th>
                      <th className="py-2 pr-3 w-32">Tipo</th>
                      {(canUpdate || canDelete) && <th className="py-2 w-28 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {newDraft && (
                      <tr className="border-b border-border bg-primary/5">
                        <td className="py-2 pr-3 text-muted-foreground">—</td>
                        <WorkerRowEditor draft={newDraft} onChange={setNewDraft} functions={functions} empresas={empresas} />
                        <td className="py-2 text-right whitespace-nowrap">
                          <RowActions saving={isSaving} onSave={handleCreate} onCancel={() => setNewDraft(null)} />
                        </td>
                      </tr>
                    )}
                    {visible.map((worker, index) =>
                      editingId === worker.id ? (
                        <tr key={worker.id} className="border-b border-border bg-primary/5">
                          <td className="py-2 pr-3 text-muted-foreground">{index + 1}</td>
                          <WorkerRowEditor draft={editDraft} onChange={setEditDraft} functions={functions} empresas={empresas} />
                          <td className="py-2 text-right whitespace-nowrap">
                            <RowActions saving={isSaving} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
                          </td>
                        </tr>
                      ) : (
                        <tr key={worker.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-3 text-muted-foreground tabular-nums">{index + 1}</td>
                          <td className="py-2 pr-3 font-medium text-foreground">{worker.fullName}</td>
                          <td className="py-2 pr-3">{worker.empresa}</td>
                          <td className="py-2 pr-3">{worker.funcion}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] rounded-full ${
                                worker.tipo === "directo"
                                  ? "bg-primary/15 text-foreground"
                                  : "bg-secondary/25 text-foreground"
                              }`}
                            >
                              {TYPE_LABELS[worker.tipo]}
                            </span>
                          </td>
                          {(canUpdate || canDelete) && (
                            <td className="py-2 text-right whitespace-nowrap">
                              {worker.estado === "baja" ? (
                                canUpdate && (
                                  <button
                                    onClick={() => void handleReactivate(worker)}
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Reactivar
                                  </button>
                                )
                              ) : (
                                <div className="inline-flex gap-1">
                                  {canUpdate && (
                                    <button
                                      onClick={() => startEdit(worker)}
                                      disabled={editingId !== null}
                                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
                                      title="Editar"
                                      aria-label={`Editar ${worker.fullName}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => setPendingDelete(worker)}
                                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                      title="Dar de baja"
                                      aria-label={`Dar de baja a ${worker.fullName}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                    {visible.length === 0 && !newDraft && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                          Sin resultados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function RowActions({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="inline-flex gap-1">
      <button
        onClick={onSave}
        disabled={saving}
        className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        title="Guardar"
        aria-label="Guardar"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button onClick={onCancel} disabled={saving} className="p-1.5 rounded hover:bg-muted" title="Cancelar" aria-label="Cancelar">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
