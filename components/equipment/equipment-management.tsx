"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import { useToast, ToastContainer } from "@/components/ui/toast"
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
} from "lucide-react"
import { useProjects, useEquipment } from "@/lib/hooks"
import { equipmentService } from "@/lib/api"
import { EQUIPMENT_TYPES } from "@/lib/constants/activities"
import type { Equipment, CreateEquipmentDTO, UpdateEquipmentDTO, EquipmentOwnership, EventLogEntry } from "@/lib/types"

// ─── Event labels & colors ────────────────────────────────────────────────────

const EVENT_LABELS: Record<EventLogEntry["eventType"], string> = {
  alta: "Alta",
  asignacion: "Asignación",
  desasignacion: "Desasignación",
  baja: "Baja",
  reactivacion: "Reactivación",
}

const EVENT_COLORS: Record<EventLogEntry["eventType"], string> = {
  alta: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  asignacion: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  desasignacion: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  baja: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reactivacion: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
}

function formatDate(iso: string) {
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
  equipment: Equipment | null
  onClose: () => void
}

function HistoryModal({ equipment, onClose }: HistoryModalProps) {
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!equipment) return
    setLoading(true)
    equipmentService
      .getHistory(equipment.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [equipment])

  if (!equipment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Historial de Eventos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {equipment.tipo} — {equipment.marca} {equipment.modelo}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
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
                    <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="w-full text-sm">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function EquipmentManagement() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null)
  const [historyItem, setHistoryItem] = useState<Equipment | null>(null)
  const [moveToProject, setMoveToProject] = useState<string>("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("activa")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newItem, setNewItem] = useState<Partial<CreateEquipmentDTO>>({
    tipo: "",
    marca: "",
    modelo: "",
    capacidad: "",
    propiedad: "propio",
    observaciones: "",
    proyectoId: null,
  })

  const { toasts, success, error: showError, removeToast } = useToast()
  const { projects, loadProjects } = useProjects()
  const { equipment, isLoading, loadEquipment, addEquipment, updateEquipment, removeEquipment } = useEquipment()

  useEffect(() => {
    loadProjects()
    loadEquipment()
  }, [])

  const filteredItems = useMemo(() => {
    return equipment.filter((e) => {
      const matchesProject =
        filterProject === "all" ||
        e.proyectoId === filterProject ||
        (filterProject === "none" && !e.proyectoId)
      const matchesStatus = filterStatus === "all" || e.estado === filterStatus
      return matchesProject && matchesStatus
    })
  }, [equipment, filterProject, filterStatus])

  const stats = useMemo(() => {
    const active = equipment.filter((e) => e.estado === "activa")
    const assigned = active.filter((e) => e.proyectoId)
    const unassigned = active.filter((e) => !e.proyectoId)
    return { active, assigned, unassigned }
  }, [equipment])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newItem.tipo || !newItem.marca || !newItem.modelo) {
      showError("Error", "Completa los campos obligatorios (tipo, marca y modelo)")
      return
    }

    setIsSaving(true)
    try {
      const item = await equipmentService.create({
        tipo: newItem.tipo || "",
        marca: newItem.marca || "",
        modelo: newItem.modelo || "",
        capacidad: newItem.capacidad || "",
        propiedad: newItem.propiedad || "propio",
        observaciones: newItem.observaciones || "",
        proyectoId: newItem.proyectoId || null,
      })
      addEquipment(item)
      resetForm()
      success("Equipo registrado", "El equipo se ha registrado correctamente")
    } catch {
      showError("Error", "No se pudo registrar el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingItem) return

    setIsSaving(true)
    try {
      const updated = await equipmentService.update(editingItem.id, {
        tipo: editingItem.tipo,
        marca: editingItem.marca,
        modelo: editingItem.modelo,
        capacidad: editingItem.capacidad,
        propiedad: editingItem.propiedad,
        observaciones: editingItem.observaciones,
      })
      updateEquipment(editingItem.id, updated)
      setEditingItem(null)
      success("Equipo actualizado", "Los cambios se han guardado correctamente")
    } catch {
      showError("Error", "No se pudo actualizar el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleMove = async () => {
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
    } catch {
      showError("Error", "No se pudo mover el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedItem) return

    setIsSaving(true)
    try {
      const updated = await equipmentService.deactivate(selectedItem.id)
      updateEquipment(selectedItem.id, updated)
      setShowDeactivateDialog(false)
      setSelectedItem(null)
      success("Equipo dado de baja", "El equipo ha sido dado de baja")
    } catch {
      showError("Error", "No se pudo dar de baja el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReactivate = async (item: Equipment) => {
    setIsSaving(true)
    try {
      const updated = await equipmentService.reactivate(item.id)
      updateEquipment(item.id, updated)
      success("Equipo reactivado", "El equipo está activo nuevamente")
    } catch {
      showError("Error", "No se pudo reactivar el equipo")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setNewItem({
      tipo: "",
      marca: "",
      modelo: "",
      capacidad: "",
      propiedad: "propio",
      observaciones: "",
      proyectoId: null,
    })
    setShowNewForm(false)
  }

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sin asignar"
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : "Proyecto no encontrado"
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <HistoryModal equipment={historyItem} onClose={() => setHistoryItem(null)} />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Equipos y Herramientas</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.active.length} equipos activos • {stats.assigned.length} asignados • {stats.unassigned.length} disponibles
            </p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            + Nuevo Equipo
          </Button>
        </div>

        {/* New Equipment Form */}
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
                {/* Fila 1: tipo, marca, modelo */}
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

                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-xs md:text-sm font-medium text-foreground">
                    Marca *
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
                    Modelo *
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Ej: 179"
                    value={newItem.modelo || ""}
                    onChange={(e) => setNewItem({ ...newItem, modelo: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                {/* Fila 2: capacidad, propiedad, proyecto */}
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
                    onValueChange={(value: EquipmentOwnership) =>
                      setNewItem({ ...newItem, propiedad: value })
                    }
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
                  <Label htmlFor="proyecto" className="text-xs md:text-sm font-medium text-foreground">
                    Asignar a Proyecto (opcional)
                  </Label>
                  <Select
                    value={newItem.proyectoId || "none"}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, proyectoId: value === "none" ? null : value })
                    }
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

                {/* Fila 3: observaciones (full width) */}
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
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAdd}
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

        {/* Edit Form */}
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
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Marca</Label>
                  <Input
                    value={editingItem.marca}
                    onChange={(e) => setEditingItem({ ...editingItem, marca: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Modelo</Label>
                  <Input
                    value={editingItem.modelo}
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
                    onValueChange={(value: EquipmentOwnership) =>
                      setEditingItem({ ...editingItem, propiedad: value })
                    }
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
                  onClick={handleUpdate}
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
                    {filterProject === "none" ? "Sin asignar" : projects.find((p) => p.id === filterProject)?.name}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showProjectFilter ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 md:w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activa">Activos</SelectItem>
                  <SelectItem value="baja">Dados de baja</SelectItem>
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

        {/* Loading */}
        {isLoading && equipment.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando equipos...</p>
            </div>
          </div>
        )}

        {/* Equipment Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <Wrench
                        className={`w-5 h-5 ${item.estado === "activa" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {item.tipo} — {item.marca}
                      </h4>
                      <p className="text-xs text-muted-foreground">{item.modelo}</p>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {openMenuId === item.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg p-1 z-50 min-w-[220px]">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setHistoryItem(item)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            Ver historial
                          </button>
                          {item.estado === "activa" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedItem(item)
                                  setMoveToProject(item.proyectoId || "none")
                                  setShowMoveDialog(true)
                                  setOpenMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                {item.proyectoId ? "Mover a otro proyecto" : "Asignar a proyecto"}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedItem(item)
                                  setShowDeactivateDialog(true)
                                  setOpenMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              >
                                <Power className="w-4 h-4" />
                                Dar de baja
                              </button>
                            </>
                          )}
                          {item.estado === "baja" && (
                            <button
                              onClick={() => {
                                handleReactivate(item)
                                setOpenMenuId(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
                            >
                              <Power className="w-4 h-4" />
                              Reactivar
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {item.capacidad && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span className="font-medium text-foreground">{item.capacidad}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.propiedad === "propio"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {item.propiedad === "propio" ? "Propio" : "Alquilado"}
                    </span>
                    {item.estado === "baja" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        Baja
                      </span>
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
          onConfirm={handleMove}
          title={selectedItem?.proyectoId ? "Mover Equipo" : "Asignar a Proyecto"}
          confirmText={selectedItem?.proyectoId ? "Mover" : "Asignar"}
          cancelText="Cancelar"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedItem?.proyectoId
                ? `Selecciona el proyecto al que deseas mover "${selectedItem?.tipo} — ${selectedItem?.marca}".`
                : `Selecciona el proyecto al que deseas asignar "${selectedItem?.tipo} — ${selectedItem?.marca}".`}
            </p>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-medium text-foreground">Proyecto destino</Label>
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
          </div>
        </Dialog>

        {/* Deactivate Dialog */}
        <Dialog
          isOpen={showDeactivateDialog}
          onClose={() => {
            setShowDeactivateDialog(false)
            setSelectedItem(null)
          }}
          onConfirm={handleDeactivate}
          title="Dar de Baja Equipo"
          message={`¿Estás seguro de que deseas dar de baja "${selectedItem?.tipo} — ${selectedItem?.marca}"? El equipo será desasignado de su proyecto actual.`}
          confirmText="Dar de Baja"
          cancelText="Cancelar"
        />
      </div>
    </>
  )
}
