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
import { Truck, MapPin, Power, ArrowRightLeft, MoreVertical, X, Edit2, ChevronDown, Loader2, Clock } from "lucide-react"
import { useProjects, useMachinery } from "@/lib/hooks"
import { machineryService } from "@/lib/api"
import { MACHINE_TYPES } from "@/lib/constants/activities"
import type { Machine, CreateMachineDTO, UpdateMachineDTO, MachineOwnership, EventLogEntry } from "@/lib/types"

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

interface MachineHistoryModalProps {
  machine: Machine | null
  onClose: () => void
}

function MachineHistoryModal({ machine, onClose }: MachineHistoryModalProps) {
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!machine) return
    setLoading(true)
    machineryService
      .getHistory(machine.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [machine])

  if (!machine) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Historial de Eventos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {machine.tipo} — {machine.marca} {machine.modelo} ({machine.patente})
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
                    <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
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

export function MachineryManagement() {
  // Estado local para formularios
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [historyMachine, setHistoryMachine] = useState<Machine | null>(null)
  const [moveToProject, setMoveToProject] = useState<string>("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("activa")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newMachine, setNewMachine] = useState<Partial<CreateMachineDTO>>({
    tipo: "",
    marca: "",
    modelo: "",
    patente: "",
    capacidad: "",
    propiedad: "propio",
    observaciones: "",
    proyectoId: null,
  })

  // Toast
  const { toasts, success, error: showError, removeToast } = useToast()

  // Hooks de datos
  const { projects, loadProjects } = useProjects()
  const { machinery, isLoading, loadMachinery, addMachine, updateMachine, removeMachine } = useMachinery()

  // Cargar datos iniciales
  useEffect(() => {
    loadProjects()
    loadMachinery()
  }, [])

  // Filtrar maquinaria
  const filteredMachines = useMemo(() => {
    return machinery.filter((m) => {
      const matchesProject = 
        filterProject === "all" || 
        m.proyectoId === filterProject || 
        (filterProject === "none" && !m.proyectoId)
      const matchesStatus = filterStatus === "all" || m.estado === filterStatus
      return matchesProject && matchesStatus
    })
  }, [machinery, filterProject, filterStatus])

  // Estadísticas
  const stats = useMemo(() => {
    const activeMachines = machinery.filter((m) => m.estado === "activa")
    const assignedMachines = activeMachines.filter((m) => m.proyectoId)
    const unassignedMachines = activeMachines.filter((m) => !m.proyectoId)
    return { activeMachines, assignedMachines, unassignedMachines }
  }, [machinery])

  // Handlers
  const handleAddMachine = async () => {
    if (!newMachine.tipo || !newMachine.marca || !newMachine.modelo || !newMachine.patente) {
      showError("Error", "Completa los campos obligatorios")
      return
    }

    setIsSaving(true)
    try {
      const machine = await machineryService.create({
        tipo: newMachine.tipo || "",
        marca: newMachine.marca || "",
        modelo: newMachine.modelo || "",
        patente: newMachine.patente || "",
        capacidad: newMachine.capacidad || "",
        propiedad: newMachine.propiedad || "propio",
        observaciones: newMachine.observaciones || "",
        proyectoId: newMachine.proyectoId || null,
      })
      addMachine(machine)
      resetForm()
      success("Maquinaria registrada", "La maquinaria se ha registrado correctamente")
    } catch (err) {
      showError("Error", "No se pudo registrar la maquinaria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateMachine = async () => {
    if (!editingMachine) return

    setIsSaving(true)
    try {
      const updated = await machineryService.update(editingMachine.id, {
        tipo: editingMachine.tipo,
        marca: editingMachine.marca,
        modelo: editingMachine.modelo,
        patente: editingMachine.patente,
        capacidad: editingMachine.capacidad,
        propiedad: editingMachine.propiedad,
        observaciones: editingMachine.observaciones,
      })
      updateMachine(editingMachine.id, updated)
      setEditingMachine(null)
      success("Maquinaria actualizada", "Los cambios se han guardado correctamente")
    } catch (err) {
      showError("Error", "No se pudo actualizar la maquinaria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveMachine = async () => {
    if (!selectedMachine || !moveToProject) return

    setIsSaving(true)
    try {
      const projectId = moveToProject === "none" ? null : moveToProject
      const updated = await machineryService.assignToProject(selectedMachine.id, projectId)
      updateMachine(selectedMachine.id, updated)
      setShowMoveDialog(false)
      setSelectedMachine(null)
      setMoveToProject("")
      success("Maquinaria movida", "La maquinaria se ha asignado correctamente")
    } catch (err) {
      showError("Error", "No se pudo mover la maquinaria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivateMachine = async () => {
    if (!selectedMachine) return

    setIsSaving(true)
    try {
      const updated = await machineryService.deactivate(selectedMachine.id)
      updateMachine(selectedMachine.id, updated)
      setShowDeactivateDialog(false)
      setSelectedMachine(null)
      success("Maquinaria dada de baja", "La maquinaria ha sido dada de baja")
    } catch (err) {
      showError("Error", "No se pudo dar de baja la maquinaria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReactivateMachine = async (machine: Machine) => {
    setIsSaving(true)
    try {
      const updated = await machineryService.reactivate(machine.id)
      updateMachine(machine.id, updated)
      success("Maquinaria reactivada", "La maquinaria está activa nuevamente")
    } catch (err) {
      showError("Error", "No se pudo reactivar la maquinaria")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setNewMachine({
      tipo: "",
      marca: "",
      modelo: "",
      patente: "",
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

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <MachineHistoryModal machine={historyMachine} onClose={() => setHistoryMachine(null)} />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Maquinaria</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.activeMachines.length} máquinas activas • {stats.assignedMachines.length} asignadas • {stats.unassignedMachines.length} disponibles
            </p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            + Nueva Maquinaria
          </Button>
        </div>

        {/* New Machine Form */}
        {showNewForm && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Registrar Nueva Maquinaria</h3>
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
                    value={newMachine.tipo}
                    onValueChange={(value) => setNewMachine({ ...newMachine, tipo: value })}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MACHINE_TYPES.map((type) => (
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
                    placeholder="Ej: Caterpillar"
                    value={newMachine.marca || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, marca: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-xs md:text-sm font-medium text-foreground">
                    Modelo *
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Ej: 320D"
                    value={newMachine.modelo || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, modelo: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patente" className="text-xs md:text-sm font-medium text-foreground">
                    Patente *
                  </Label>
                  <Input
                    id="patente"
                    placeholder="Ej: ABC-123"
                    value={newMachine.patente || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, patente: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacidad" className="text-xs md:text-sm font-medium text-foreground">
                    Capacidad
                  </Label>
                  <Input
                    id="capacidad"
                    placeholder="Ej: 20 ton, 5 m³"
                    value={newMachine.capacidad || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, capacidad: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propiedad" className="text-xs md:text-sm font-medium text-foreground">
                    Propiedad
                  </Label>
                  <Select
                    value={newMachine.propiedad}
                    onValueChange={(value: MachineOwnership) =>
                      setNewMachine({ ...newMachine, propiedad: value })
                    }
                  >
                    <SelectTrigger id="propiedad">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Propio</SelectItem>
                      <SelectItem value="subcontrato">Subcontrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="observaciones" className="text-xs md:text-sm font-medium text-foreground">
                    Observaciones
                  </Label>
                  <Textarea
                    id="observaciones"
                    placeholder="Notas adicionales sobre la maquinaria..."
                    value={newMachine.observaciones || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, observaciones: e.target.value })}
                    className="bg-input border-border text-foreground text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proyecto" className="text-xs md:text-sm font-medium text-foreground">
                    Asignar a Proyecto (opcional)
                  </Label>
                  <Select
                    value={newMachine.proyectoId || "none"}
                    onValueChange={(value) =>
                      setNewMachine({ ...newMachine, proyectoId: value === "none" ? null : value })
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
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAddMachine}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Maquinaria"
                  )}
                </Button>
                <Button onClick={resetForm} variant="outline" className="text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Machine Form */}
        {editingMachine && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Editar Maquinaria</h3>
                <button onClick={() => setEditingMachine(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Tipo</Label>
                  <Select
                    value={editingMachine.tipo}
                    onValueChange={(value) => setEditingMachine({ ...editingMachine, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MACHINE_TYPES.map((type) => (
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
                    value={editingMachine.marca}
                    onChange={(e) => setEditingMachine({ ...editingMachine, marca: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Modelo</Label>
                  <Input
                    value={editingMachine.modelo}
                    onChange={(e) => setEditingMachine({ ...editingMachine, modelo: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Patente</Label>
                  <Input
                    value={editingMachine.patente}
                    onChange={(e) => setEditingMachine({ ...editingMachine, patente: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Capacidad</Label>
                  <Input
                    value={editingMachine.capacidad}
                    onChange={(e) => setEditingMachine({ ...editingMachine, capacidad: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Propio / Subcontrato</Label>
                  <Select
                    value={editingMachine.propiedad}
                    onValueChange={(value: MachineOwnership) =>
                      setEditingMachine({ ...editingMachine, propiedad: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Propio</SelectItem>
                      <SelectItem value="subcontrato">Subcontrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Observaciones</Label>
                  <Textarea
                    value={editingMachine.observaciones}
                    onChange={(e) => setEditingMachine({ ...editingMachine, observaciones: e.target.value })}
                    className="bg-input border-border text-foreground text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleUpdateMachine}
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
                <Button onClick={() => setEditingMachine(null)} variant="outline" className="text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 md:p-6 bg-card border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
            {/* Project Filter Toggle */}
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

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 md:w-40">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="baja">Dadas de baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Options - Expandable */}
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

        {/* Loading State */}
        {isLoading && machinery.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando maquinaria...</p>
            </div>
          </div>
        )}

        {/* Machinery List */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((machine) => (
              <Card
                key={machine.id}
                className={`p-4 md:p-5 bg-card border-border hover:border-primary/50 transition-colors ${
                  machine.estado === "baja" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${machine.estado === "activa" ? "bg-primary/10" : "bg-muted"}`}>
                      <Truck className={`w-5 h-5 ${machine.estado === "activa" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {machine.tipo} - {machine.marca}
                      </h4>
                      <p className="text-xs text-muted-foreground">{machine.modelo}</p>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === machine.id ? null : machine.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {openMenuId === machine.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg p-1 z-50 min-w-[220px]">
                          <button
                            onClick={() => {
                              setEditingMachine(machine)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setHistoryMachine(machine)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            Ver historial
                          </button>
                          {machine.estado === "activa" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedMachine(machine)
                                  setMoveToProject(machine.proyectoId || "none")
                                  setShowMoveDialog(true)
                                  setOpenMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                {machine.proyectoId ? "Mover a otro proyecto" : "Asignar a proyecto"}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMachine(machine)
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
                          {machine.estado === "baja" && (
                            <button
                              onClick={() => {
                                handleReactivateMachine(machine)
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
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Patente:</span>
                    <span className="font-medium text-foreground">{machine.patente}</span>
                  </div>
                  {machine.capacidad && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span className="font-medium text-foreground">{machine.capacidad}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        machine.propiedad === "propio"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {machine.propiedad === "propio" ? "Propio" : "Subcontrato"}
                    </span>
                    {machine.estado === "baja" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                        Baja
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={machine.proyectoId ? "text-foreground" : "text-muted-foreground italic"}>
                      {getProjectName(machine.proyectoId)}
                    </span>
                  </div>
                </div>

                {machine.observaciones && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{machine.observaciones}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredMachines.length === 0 && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin maquinaria</h3>
              <p className="text-sm text-muted-foreground">
                No hay maquinaria que coincida con los filtros seleccionados.
              </p>
            </div>
          </Card>
        )}

        {/* Move Dialog */}
        <Dialog
          isOpen={showMoveDialog}
          onClose={() => {
            setShowMoveDialog(false)
            setSelectedMachine(null)
            setMoveToProject("")
          }}
          onConfirm={handleMoveMachine}
          title={selectedMachine?.proyectoId ? "Mover Maquinaria" : "Asignar a Proyecto"}
          confirmText={selectedMachine?.proyectoId ? "Mover" : "Asignar"}
          cancelText="Cancelar"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedMachine?.proyectoId
                ? `Selecciona el proyecto al que deseas mover "${selectedMachine?.tipo} - ${selectedMachine?.marca}".`
                : `Selecciona el proyecto al que deseas asignar "${selectedMachine?.tipo} - ${selectedMachine?.marca}".`}
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
            setSelectedMachine(null)
          }}
          onConfirm={handleDeactivateMachine}
          title="Dar de Baja Maquinaria"
          message={`¿Estás seguro de que deseas dar de baja "${selectedMachine?.tipo} - ${selectedMachine?.marca}"? La máquina será desasignada de su proyecto actual.`}
          confirmText="Dar de Baja"
          cancelText="Cancelar"
        />
      </div>
    </>
  )
}
