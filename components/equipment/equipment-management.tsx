"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { AnchoredPopover } from "@/components/ui/anchored-popover"
import { ViewToggle } from "@/components/ui/view-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { AssetNotesModal } from "@/components/fleet/asset-notes-modal"
import {
  Wrench,
  MapPin,
  Power,
  ArrowRightLeft,
  MoreVertical,
  X,
  Edit2,
  ChevronDown,
  Loader2,
  Clock,
  AlertTriangle,
  NotebookPen,
  Search,
} from "lucide-react"
import { useProjects, useEquipment, usePermissions } from "@/lib/hooks"
import { useViewMode } from "@/lib/hooks/useViewMode"
import { equipmentService, isApiError } from "@/lib/api"
import { EQUIPMENT_TYPES, POT_EQUIPMENT_SUBTYPES, isPotEquipment } from "@/lib/constants/activities"
import { formatDateLocal } from "@/lib/utils"
import type { Equipment, CreateEquipmentDTO, UpdateEquipmentDTO, EquipmentOwnership, EventLogEntry } from "@/lib/types"

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Marca y modelo son opcionales: se muestra lo que haya, o null si no hay nada. */
function brandModel(item: Pick<Equipment, "marca" | "modelo">): string | null {
  return [item.marca, item.modelo].filter(Boolean).join(" ") || null
}

/** Tipo con el subtipo del kit POT, si lo tiene. */
function typeLabel(item: Pick<Equipment, "tipo" | "subtipo">): string {
  return item.subtipo ? `${item.tipo} · ${item.subtipo}` : item.tipo
}

/**
 * Mensaje del backend si es texto (p. ej. "Ya existe un equipo con este código
 * interno"); un 422 de validación trae una lista y se cae al genérico.
 */
function errorText(err: unknown, fallback: string): string {
  const message = isApiError(err) ? err.message : null
  return typeof message === "string" && message ? message : fallback
}

/** Descripción corta para encabezados y confirmaciones. */
function describe(item: Equipment): string {
  const bm = brandModel(item)
  return bm ? `${typeLabel(item)} — ${bm}` : typeLabel(item)
}

/**
 * Opciones del selector de tipo. Un equipo cargado con un tipo que ya no está
 * en la lista lo conserva como opción; si no, el Select queda en blanco y al
 * guardar se perdería el valor.
 */
function typeOptions(current?: string | null): readonly string[] {
  if (!current || (EQUIPMENT_TYPES as readonly string[]).includes(current)) return EQUIPMENT_TYPES
  return [current, ...EQUIPMENT_TYPES]
}

// ─── Event labels & colors ────────────────────────────────────────────────────

const EVENT_LABELS: Record<EventLogEntry["eventType"], string> = {
  alta: "Alta",
  asignacion: "Asignación",
  desasignacion: "Desasignación",
  baja: "Baja",
  reactivacion: "Reactivación",
  service: "Service",
  rto: "RTO/VTV actualizado",
  mantencion: "Mantención",
  incidencia: "Incidencia registrada",
  resolucion: "Incidencia resuelta",
}

const EVENT_COLORS: Record<EventLogEntry["eventType"], string> = {
  alta: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  asignacion: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  desasignacion: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  baja: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reactivacion: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  service: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  rto: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  mantencion: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  incidencia: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  resolucion: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── History Modal ─────────────────────────────────────────────────────────────

interface HistoryModalProps {
  item: Equipment | null
  onClose: () => void
}

function HistoryModal({ item, onClose }: HistoryModalProps) {
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!item) return
    setLoading(true)
    equipmentService
      .getHistory(item.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [item])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Historial de Eventos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {describe(item)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin eventos registrados.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${EVENT_COLORS[event.eventType]}`}
                  >
                    {EVENT_LABELS[event.eventType]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{event.userName}</p>
                    {event.projectName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.eventType === "desasignacion" ? "← " : "→ "}
                        {event.projectName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="w-full text-sm">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick date edit ────────────────────────────────────────────────────────────

interface QuickDateEditProps {
  label: string
  value: string | null | undefined
  onSave: (value: string) => Promise<void>
  readOnly?: boolean
}

function QuickDateEdit({ label, value, onSave, readOnly = false }: QuickDateEditProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  if (readOnly) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-foreground">{value ? formatDateLocal(value) : "Sin registrar"}</span>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">{label}:</span>
        <DatePicker
          value={value || ""}
          onChange={async (v) => {
            setSaving(true)
            try {
              await onSave(v)
            } finally {
              setSaving(false)
              setEditing(false)
            }
          }}
          className="w-40"
        />
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <button onClick={() => setEditing(false)} className="p-0.5 hover:bg-muted rounded">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs group">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value ? formatDateLocal(value) : "Sin registrar"}</span>
    </button>
  )
}

export function EquipmentManagement() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null)
  const [historyItem, setHistoryItem] = useState<Equipment | null>(null)
  const [notesItem, setNotesItem] = useState<Equipment | null>(null)
  const [moveToProject, setMoveToProject] = useState<string>("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("activa")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useViewMode("equipos-view")

  const emptyForm: Partial<CreateEquipmentDTO> = {
    tipo: "",
    subtipo: "",
    marca: "",
    modelo: "",
    codigoInterno: "",
    capacidad: "",
    propiedad: "propio",
    observaciones: "",
    proyectoId: null,
    ultimaMantencion: "",
    fechaCompra: "",
    fechaUltimaCalibracion: "",
  }

  const [newItem, setNewItem] = useState<Partial<CreateEquipmentDTO>>(emptyForm)

  const { toasts, success, error: showError, removeToast } = useToast()

  const { projects, loadProjects } = useProjects()
  const { equipment, isLoading, loadEquipment, addEquipment, updateEquipment, removeEquipment } = useEquipment()
  const { can } = usePermissions()
  const canWrite = can("equipos", "create")

  useEffect(() => {
    loadProjects()
    loadEquipment()
  }, [])

  const esPotNuevo = isPotEquipment(newItem.tipo)
  const esPotEditando = editingItem ? isPotEquipment(editingItem.tipo) : false

  // Tipos del filtro: la lista vigente más los que todavía tengan equipos
  // cargados con un tipo anterior, para poder encontrarlos y corregirlos.
  const filterTypes = useMemo(() => {
    const legacy = Array.from(new Set(equipment.map((e) => e.tipo)))
      .filter((t) => t && !(EQUIPMENT_TYPES as readonly string[]).includes(t))
      .sort((a, b) => a.localeCompare(b, "es"))
    return [...EQUIPMENT_TYPES, ...legacy]
  }, [equipment])

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return equipment.filter((e) => {
      const matchesProject =
        filterProject === "all" ||
        e.proyectoId === filterProject ||
        (filterProject === "none" && !e.proyectoId)
      const matchesStatus = filterStatus === "all" || e.estado === filterStatus
      const matchesTipo = filterTipo === "all" || e.tipo === filterTipo
      const matchesSearch =
        !term ||
        [e.codigoInterno, e.marca, e.modelo, e.subtipo]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term))
      return matchesProject && matchesStatus && matchesTipo && matchesSearch
    })
  }, [equipment, filterProject, filterStatus, filterTipo, searchTerm])

  const stats = useMemo(() => {
    const activeItems = equipment.filter((e) => e.estado === "activa")
    const assignedItems = activeItems.filter((e) => e.proyectoId)
    const unassignedItems = activeItems.filter((e) => !e.proyectoId)
    return { activeItems, assignedItems, unassignedItems }
  }, [equipment])

  const handleAddItem = async () => {
    if (!newItem.tipo) {
      showError("Error", "Seleccioná el tipo de equipo")
      return
    }

    setIsSaving(true)
    try {
      const item = await equipmentService.create({
        tipo: newItem.tipo || "",
        subtipo: esPotNuevo ? newItem.subtipo || null : null,
        marca: newItem.marca?.trim() || null,
        modelo: newItem.modelo?.trim() || null,
        codigoInterno: newItem.codigoInterno?.trim() || null,
        capacidad: newItem.capacidad || "",
        propiedad: newItem.propiedad || "propio",
        observaciones: newItem.observaciones || "",
        proyectoId: newItem.proyectoId || null,
        ultimaMantencion: newItem.ultimaMantencion || null,
        fechaCompra: esPotNuevo ? newItem.fechaCompra || null : null,
        fechaUltimaCalibracion: esPotNuevo ? newItem.fechaUltimaCalibracion || null : null,
      })
      addEquipment(item)
      resetForm()
      success("Equipo registrado", "El equipo se ha registrado correctamente")
    } catch (err) {
      showError("Error", errorText(err, "No se pudo registrar el equipo"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    setIsSaving(true)
    try {
      const updated = await equipmentService.update(editingItem.id, {
        tipo: editingItem.tipo,
        subtipo: esPotEditando ? editingItem.subtipo || null : null,
        marca: editingItem.marca?.trim() || null,
        modelo: editingItem.modelo?.trim() || null,
        codigoInterno: editingItem.codigoInterno?.trim() || null,
        capacidad: editingItem.capacidad,
        propiedad: editingItem.propiedad,
        observaciones: editingItem.observaciones,
        ultimaMantencion: editingItem.ultimaMantencion,
        fechaCompra: esPotEditando ? editingItem.fechaCompra : null,
        fechaUltimaCalibracion: esPotEditando ? editingItem.fechaUltimaCalibracion : null,
      })
      updateEquipment(editingItem.id, updated)
      setEditingItem(null)
      success("Equipo actualizado", "Los cambios se han guardado correctamente")
    } catch (err) {
      showError("Error", errorText(err, "No se pudo actualizar el equipo"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickUpdateMantencion = async (item: Equipment, value: string) => {
    try {
      const updated = await equipmentService.update(item.id, { ultimaMantencion: value || null })
      updateEquipment(item.id, updated)
      success("Actualizado", "Fecha de última mantención guardada")
    } catch {
      showError("Error", "No se pudo guardar la fecha")
    }
  }

  const handleMoveItem = async () => {
    if (!selectedItem || !moveToProject) return

    setIsSaving(true)
    try {
      const projectId = moveToProject === "none" ? null : moveToProject
      const updated = await equipmentService.assignToProject(selectedItem.id, projectId)
      updateEquipment(selectedItem.id, updated)
      setShowMoveDialog(false)
      setSelectedItem(null)
      setMoveToProject("")
      success("Equipo movido", "El equipo se ha asignado correctamente")
    } catch (err) {
      showError("Error", "No se pudo mover el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivateItem = async () => {
    if (!selectedItem) return

    setIsSaving(true)
    try {
      const updated = await equipmentService.deactivate(selectedItem.id)
      updateEquipment(selectedItem.id, updated)
      setShowDeactivateDialog(false)
      setSelectedItem(null)
      success("Equipo dado de baja", "El equipo ha sido dado de baja")
    } catch (err) {
      showError("Error", "No se pudo dar de baja el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReactivateItem = async (item: Equipment) => {
    setIsSaving(true)
    try {
      const updated = await equipmentService.reactivate(item.id)
      updateEquipment(item.id, updated)
      success("Equipo reactivado", "El equipo está activo nuevamente")
    } catch (err) {
      showError("Error", "No se pudo reactivar el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setNewItem(emptyForm)
    setShowNewForm(false)
  }

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sin asignar"
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : "Proyecto no encontrado"
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
      <AssetNotesModal
        assetType="equipo"
        asset={notesItem}
        onClose={() => setNotesItem(null)}
        onChanged={(count) => {
          if (notesItem) updateEquipment(notesItem.id, { ...notesItem, incidenciasAbiertas: count })
        }}
        canWrite={canWrite}
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Equipos y Herramientas</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.activeItems.length} equipos activos • {stats.assignedItems.length} asignados • {stats.unassignedItems.length} disponibles
            </p>
          </div>
          {canWrite && (
            <Button
              onClick={() => setShowNewForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              + Nuevo Equipo
            </Button>
          )}
        </div>

        {/* New Item Form */}
        {showNewForm && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Registrar Nuevo Equipo</h3>
                <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-xs md:text-sm font-medium text-foreground">
                    Tipo *
                  </Label>
                  <Select
                    value={newItem.tipo}
                    onValueChange={(value) => setNewItem({ ...newItem, tipo: value })}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {esPotNuevo && (
                  <div className="space-y-2">
                    <Label htmlFor="subtipo" className="text-xs md:text-sm font-medium text-foreground">
                      Subtipo
                    </Label>
                    <Select
                      value={newItem.subtipo || "none"}
                      onValueChange={(value) => setNewItem({ ...newItem, subtipo: value === "none" ? "" : value })}
                    >
                      <SelectTrigger id="subtipo">
                        <SelectValue placeholder="Seleccionar subtipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {POT_EQUIPMENT_SUBTYPES.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="codigoInterno" className="text-xs md:text-sm font-medium text-foreground">
                    Código Interno
                  </Label>
                  <Input
                    id="codigoInterno"
                    placeholder="Ej: GZ-EQ-014"
                    value={newItem.codigoInterno || ""}
                    onChange={(e) => setNewItem({ ...newItem, codigoInterno: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-xs md:text-sm font-medium text-foreground">
                    Marca
                  </Label>
                  <Input
                    id="marca"
                    placeholder="Ej: Fluke"
                    value={newItem.marca || ""}
                    onChange={(e) => setNewItem({ ...newItem, marca: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-xs md:text-sm font-medium text-foreground">
                    Modelo
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Ej: 179"
                    value={newItem.modelo || ""}
                    onChange={(e) => setNewItem({ ...newItem, modelo: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacidad" className="text-xs md:text-sm font-medium text-foreground">
                    Capacidad
                  </Label>
                  <Input
                    id="capacidad"
                    placeholder="Ej: 7 kVA, 600V"
                    value={newItem.capacidad || ""}
                    onChange={(e) => setNewItem({ ...newItem, capacidad: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propiedad" className="text-xs md:text-sm font-medium text-foreground">
                    Propiedad
                  </Label>
                  <Select
                    value={newItem.propiedad}
                    onValueChange={(value: EquipmentOwnership) => setNewItem({ ...newItem, propiedad: value })}
                  >
                    <SelectTrigger id="propiedad">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Propio</SelectItem>
                      <SelectItem value="alquilado">Alquilado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Última Mantención</Label>
                  <DatePicker
                    value={newItem.ultimaMantencion || ""}
                    onChange={(v) => setNewItem({ ...newItem, ultimaMantencion: v })}
                  />
                </div>

                {esPotNuevo && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-medium text-foreground">Fecha de Compra</Label>
                      <DatePicker
                        value={newItem.fechaCompra || ""}
                        onChange={(v) => setNewItem({ ...newItem, fechaCompra: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-medium text-foreground">Última Calibración</Label>
                      <DatePicker
                        value={newItem.fechaUltimaCalibracion || ""}
                        onChange={(v) => setNewItem({ ...newItem, fechaUltimaCalibracion: v })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="observaciones" className="text-xs md:text-sm font-medium text-foreground">
                    Observaciones
                  </Label>
                  <Textarea
                    id="observaciones"
                    placeholder="Notas adicionales sobre el equipo..."
                    value={newItem.observaciones || ""}
                    onChange={(e) => setNewItem({ ...newItem, observaciones: e.target.value })}
                    className="bg-input border-border text-foreground text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proyecto" className="text-xs md:text-sm font-medium text-foreground">
                    Asignar a Proyecto (opcional)
                  </Label>
                  <Select
                    value={newItem.proyectoId || "none"}
                    onValueChange={(value) => setNewItem({ ...newItem, proyectoId: value === "none" ? null : value })}
                  >
                    <SelectTrigger id="proyecto">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAddItem}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Equipo"
                  )}
                </Button>
                <Button onClick={resetForm} variant="outline" className="text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Item Form */}
        {editingItem && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Editar Equipo</h3>
                <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Tipo</Label>
                  <Select
                    value={editingItem.tipo}
                    onValueChange={(value) => setEditingItem({ ...editingItem, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions(editingItem.tipo).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {esPotEditando && (
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-medium text-foreground">Subtipo</Label>
                    <Select
                      value={editingItem.subtipo || "none"}
                      onValueChange={(value) => setEditingItem({ ...editingItem, subtipo: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar subtipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {POT_EQUIPMENT_SUBTYPES.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Código Interno</Label>
                  <Input
                    value={editingItem.codigoInterno || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, codigoInterno: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Marca</Label>
                  <Input
                    value={editingItem.marca || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, marca: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Modelo</Label>
                  <Input
                    value={editingItem.modelo || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, modelo: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Capacidad</Label>
                  <Input
                    value={editingItem.capacidad}
                    onChange={(e) => setEditingItem({ ...editingItem, capacidad: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Propio / Alquilado</Label>
                  <Select
                    value={editingItem.propiedad}
                    onValueChange={(value: EquipmentOwnership) => setEditingItem({ ...editingItem, propiedad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Propio</SelectItem>
                      <SelectItem value="alquilado">Alquilado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Última Mantención</Label>
                  <DatePicker
                    value={editingItem.ultimaMantencion || ""}
                    onChange={(v) => setEditingItem({ ...editingItem, ultimaMantencion: v })}
                  />
                </div>

                {esPotEditando && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-medium text-foreground">Fecha de Compra</Label>
                      <DatePicker
                        value={editingItem.fechaCompra || ""}
                        onChange={(v) => setEditingItem({ ...editingItem, fechaCompra: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-medium text-foreground">Última Calibración</Label>
                      <DatePicker
                        value={editingItem.fechaUltimaCalibracion || ""}
                        onChange={(v) => setEditingItem({ ...editingItem, fechaUltimaCalibracion: v })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Observaciones</Label>
                  <Textarea
                    value={editingItem.observaciones}
                    onChange={(e) => setEditingItem({ ...editingItem, observaciones: e.target.value })}
                    className="bg-input border-border text-foreground text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleUpdateItem}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
                <Button onClick={() => setEditingItem(null)} variant="outline" className="text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowProjectFilter(!showProjectFilter)}
                className="flex items-center gap-2 text-xs md:text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span>Proyecto</span>
                {filterProject !== "all" && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary truncate max-w-[120px]">
                    {filterProject === "none" ? "Sin asignar" : projects.find(p => p.id === filterProject)?.name}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showProjectFilter ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 md:w-40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="activa">Activos</SelectItem>
                  <SelectItem value="baja">Dados de baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 col-span-2 md:col-span-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showProjectFilter && (
            <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setFilterProject("all")}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  filterProject === "all"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterProject("none")}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  filterProject === "none"
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Sin asignar
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
        </Card>

        {isLoading && equipment.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando equipos...</p>
            </div>
          </div>
        )}

        {/* Table view */}
        {!isLoading && viewMode === "list" && (
          <Card className="hidden md:block bg-card border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Código</th>
                  <th className="text-left font-medium px-4 py-3">Tipo</th>
                  <th className="text-left font-medium px-4 py-3">Marca / Modelo</th>
                  <th className="text-left font-medium px-4 py-3">Capacidad</th>
                  <th className="text-left font-medium px-4 py-3">Proyecto</th>
                  <th className="text-left font-medium px-4 py-3">Última Mantención</th>
                  <th className="text-left font-medium px-4 py-3">Incidencias</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-left font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border hover:bg-muted/50 ${item.estado === "baja" ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{item.codigoInterno || "—"}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {item.tipo}
                      {item.subtipo && <div className="text-[11px] text-muted-foreground">{item.subtipo}</div>}
                      {isPotEquipment(item.tipo) && (item.fechaCompra || item.fechaUltimaCalibracion) && (
                        <div className="text-[10px] text-muted-foreground">
                          {item.fechaCompra && <>Compra: {formatDateLocal(item.fechaCompra)} </>}
                          {item.fechaUltimaCalibracion && <>· Calib.: {formatDateLocal(item.fechaUltimaCalibracion)}</>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{brandModel(item) || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.capacidad || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{getProjectName(item.proyectoId)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuickDateEdit
                        label=""
                        value={item.ultimaMantencion}
                        onSave={(v) => handleQuickUpdateMantencion(item, v)}
                        readOnly={!canWrite}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.incidenciasAbiertas > 0 ? (
                        <button
                          onClick={() => setNotesItem(item)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {item.incidenciasAbiertas}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.estado === "baja" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Baja</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenuId === item.id && (
                          <ItemActionsMenu
                            item={item}
                            onClose={() => setOpenMenuId(null)}
                            onEdit={() => setEditingItem(item)}
                            onHistory={() => setHistoryItem(item)}
                            onNotes={() => setNotesItem(item)}
                            onMove={() => {
                              setSelectedItem(item)
                              setMoveToProject(item.proyectoId || "none")
                              setShowMoveDialog(true)
                            }}
                            onDeactivate={() => {
                              setSelectedItem(item)
                              setShowDeactivateDialog(true)
                            }}
                            onReactivate={() => handleReactivateItem(item)}
                            canWrite={canWrite}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay equipos que coincidan con los filtros seleccionados.</p>
              </div>
            )}
          </Card>
        )}

        {/* Cards view */}
        {!isLoading && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === "list" ? "md:hidden" : ""}`}>
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`p-4 md:p-5 bg-card border-border hover:border-primary/50 transition-colors ${
                  item.estado === "baja" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.estado === "activa" ? "bg-primary/10" : "bg-muted"}`}>
                      <Wrench className={`w-5 h-5 ${item.estado === "activa" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{typeLabel(item)}</h4>
                      <p className="text-xs text-muted-foreground">{brandModel(item) || "Sin marca / modelo"}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {openMenuId === item.id && (
                      <ItemActionsMenu
                        item={item}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => setEditingItem(item)}
                        onHistory={() => setHistoryItem(item)}
                        onNotes={() => setNotesItem(item)}
                        onMove={() => {
                          setSelectedItem(item)
                          setMoveToProject(item.proyectoId || "none")
                          setShowMoveDialog(true)
                        }}
                        onDeactivate={() => {
                          setSelectedItem(item)
                          setShowDeactivateDialog(true)
                        }}
                        onReactivate={() => handleReactivateItem(item)}
                        canWrite={canWrite}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-medium text-foreground">{item.codigoInterno || "—"}</span>
                  </div>
                  {item.capacidad && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span className="font-medium text-foreground">{item.capacidad}</span>
                    </div>
                  )}
                  <QuickDateEdit
                    label="Última mantención"
                    value={item.ultimaMantencion}
                    onSave={(v) => handleQuickUpdateMantencion(item, v)}
                    readOnly={!canWrite}
                  />
                  {isPotEquipment(item.tipo) && (item.fechaCompra || item.fechaUltimaCalibracion) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {item.fechaCompra && <p>Fecha de compra: {formatDateLocal(item.fechaCompra)}</p>}
                      {item.fechaUltimaCalibracion && <p>Última calibración: {formatDateLocal(item.fechaUltimaCalibracion)}</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.propiedad === "propio"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {item.propiedad === "propio" ? "Propio" : "Alquilado"}
                    </span>
                    {item.estado === "baja" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        Baja
                      </span>
                    )}
                    {item.incidenciasAbiertas > 0 && (
                      <button
                        onClick={() => setNotesItem(item)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {item.incidenciasAbiertas} abierta{item.incidenciasAbiertas > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={item.proyectoId ? "text-foreground" : "text-muted-foreground italic"}>
                      {getProjectName(item.proyectoId)}
                    </span>
                  </div>
                </div>

                {item.observaciones && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.observaciones}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin equipos</h3>
              <p className="text-sm text-muted-foreground">
                No hay equipos que coincidan con los filtros seleccionados.
              </p>
            </div>
          </Card>
        )}

        {/* Move Dialog */}
        <Dialog
          isOpen={showMoveDialog}
          onClose={() => {
            setShowMoveDialog(false)
            setSelectedItem(null)
            setMoveToProject("")
          }}
          onConfirm={handleMoveItem}
          title={selectedItem?.proyectoId ? "Mover Equipo" : "Asignar a Proyecto"}
          confirmText={selectedItem?.proyectoId ? "Mover" : "Asignar"}
          cancelText="Cancelar"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Proyecto</Label>
            <Select value={moveToProject} onValueChange={setMoveToProject}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Dialog>

        {/* Deactivate Dialog */}
        <Dialog
          isOpen={showDeactivateDialog}
          onClose={() => {
            setShowDeactivateDialog(false)
            setSelectedItem(null)
          }}
          onConfirm={handleDeactivateItem}
          type="confirm"
          title="Dar de baja equipo"
          message={`¿Estás seguro de dar de baja "${selectedItem ? describe(selectedItem) : ""}"?`}
          confirmText="Dar de baja"
          cancelText="Cancelar"
        />
      </div>
    </>
  )
}

// ─── Actions menu ───────────────────────────────────────────────────────────────

interface ItemActionsMenuProps {
  item: Equipment
  onClose: () => void
  onEdit: () => void
  onHistory: () => void
  onNotes: () => void
  onMove: () => void
  onDeactivate: () => void
  onReactivate: () => void
  canWrite: boolean
}

function ItemActionsMenu({
  item,
  onClose,
  onEdit,
  onHistory,
  onNotes,
  onMove,
  onDeactivate,
  onReactivate,
  canWrite,
}: ItemActionsMenuProps) {
  return (
    <AnchoredPopover onClose={onClose} className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-[220px]">
      {canWrite && (
        <button
          onClick={() => {
            onEdit()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
      )}
      <button
        onClick={() => {
          onHistory()
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
      >
        <Clock className="w-4 h-4" />
        Ver historial
      </button>
      <button
        onClick={() => {
          onNotes()
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
      >
        <NotebookPen className="w-4 h-4" />
        Bitácora
      </button>
      {canWrite && item.estado === "activa" && (
        <>
          <button
            onClick={() => {
              onMove()
              onClose()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {item.proyectoId ? "Mover a otro proyecto" : "Asignar a proyecto"}
          </button>
          <button
            onClick={() => {
              onDeactivate()
              onClose()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md transition-colors"
          >
            <Power className="w-4 h-4" />
            Dar de baja
          </button>
        </>
      )}
      {canWrite && item.estado === "baja" && (
        <button
          onClick={() => {
            onReactivate()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-muted rounded-md transition-colors"
        >
          <Power className="w-4 h-4" />
          Reactivar
        </button>
      )}
    </AnchoredPopover>
  )
}
