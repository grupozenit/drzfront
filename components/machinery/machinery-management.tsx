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
  Truck,
  MapPin,
  Power,
  ArrowRightLeft,
  MoreVertical,
  X,
  Edit2,
  ChevronDown,
  Loader2,
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  Navigation,
  Nfc,
  NotebookPen,
  Search,
} from "lucide-react"
import Link from "next/link"
import { useProjects, useMachinery, useDrivers, usePermissions } from "@/lib/hooks"
import { useViewMode } from "@/lib/hooks/useViewMode"
import { machineryService } from "@/lib/api"
import { MACHINE_TYPES, isVehicleType } from "@/lib/constants/activities"
import { formatDateLocal } from "@/lib/utils"
import type { Machine, CreateMachineDTO, UpdateMachineDTO, MachineOwnership, EventLogEntry } from "@/lib/types"

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

function RtoBadge({ machine }: { machine: Machine }) {
  if (!machine.rtoEstado || machine.rtoEstado === "vigente") return null
  if (machine.rtoEstado === "vencido") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive whitespace-nowrap">
        RTO vencido
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
      RTO en {machine.rtoDiasRestantes}d
    </span>
  )
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
              {machine.tipo} — {machine.marca} {machine.modelo} ({machine.patente || machine.numeroChasis})
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

// ─── Quick date edit (Último Service) ──────────────────────────────────────────

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
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-xs group"
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value ? formatDateLocal(value) : "Sin registrar"}</span>
      <CalendarIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
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
  const [notesMachine, setNotesMachine] = useState<Machine | null>(null)
  const [moveToProject, setMoveToProject] = useState<string>("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("activa")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useViewMode("maquinaria-view")

  const emptyForm: Partial<CreateMachineDTO> = {
    tipo: "",
    marca: "",
    modelo: "",
    codigoInterno: "",
    patente: "",
    numeroChasis: "",
    capacidad: "",
    propiedad: "propio",
    observaciones: "",
    proyectoId: null,
    choferId: null,
    vencimientoRto: "",
    tieneGps: false,
    tieneTelepase: false,
    ultimoService: "",
  }

  const [newMachine, setNewMachine] = useState<Partial<CreateMachineDTO>>(emptyForm)

  // Toast
  const { toasts, success, error: showError, removeToast } = useToast()

  // Hooks de datos
  const { projects, loadProjects } = useProjects()
  const { machinery, isLoading, loadMachinery, addMachine, updateMachine, removeMachine } = useMachinery()
  const { drivers, loadDrivers } = useDrivers()
  const { can } = usePermissions()
  const canWrite = can("maquinaria", "create")

  // Cargar datos iniciales
  useEffect(() => {
    loadProjects()
    loadMachinery()
    loadDrivers()
  }, [])

  const esVehiculoNuevo = isVehicleType(newMachine.tipo)
  const esVehiculoEditando = editingMachine ? isVehicleType(editingMachine.tipo) : false

  // Filtrar maquinaria
  const filteredMachines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return machinery.filter((m) => {
      const matchesProject =
        filterProject === "all" ||
        m.proyectoId === filterProject ||
        (filterProject === "none" && !m.proyectoId)
      const matchesStatus = filterStatus === "all" || m.estado === filterStatus
      const matchesTipo = filterTipo === "all" || m.tipo === filterTipo
      const matchesSearch =
        !term ||
        [m.codigoInterno, m.patente, m.numeroChasis, m.marca, m.modelo, m.choferResponsable]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term))
      return matchesProject && matchesStatus && matchesTipo && matchesSearch
    })
  }, [machinery, filterProject, filterStatus, filterTipo, searchTerm])

  // Estadísticas
  const stats = useMemo(() => {
    const activeMachines = machinery.filter((m) => m.estado === "activa")
    const assignedMachines = activeMachines.filter((m) => m.proyectoId)
    const unassignedMachines = activeMachines.filter((m) => !m.proyectoId)
    return { activeMachines, assignedMachines, unassignedMachines }
  }, [machinery])

  // Handlers
  const handleAddMachine = async () => {
    if (!newMachine.tipo || !newMachine.marca || !newMachine.modelo || !newMachine.codigoInterno) {
      showError("Error", "Completa los campos obligatorios")
      return
    }
    if (esVehiculoNuevo) {
      if (!newMachine.patente || !newMachine.choferId) {
        showError("Error", "Patente y chofer responsable son obligatorios para este tipo de vehículo")
        return
      }
    } else if (!newMachine.numeroChasis) {
      showError("Error", "El número de chasis es obligatorio para este tipo de maquinaria")
      return
    }

    setIsSaving(true)
    try {
      const machine = await machineryService.create({
        tipo: newMachine.tipo || "",
        marca: newMachine.marca || "",
        modelo: newMachine.modelo || "",
        codigoInterno: newMachine.codigoInterno || "",
        patente: esVehiculoNuevo ? newMachine.patente || null : null,
        numeroChasis: esVehiculoNuevo ? null : newMachine.numeroChasis || null,
        capacidad: newMachine.capacidad || "",
        propiedad: newMachine.propiedad || "propio",
        observaciones: newMachine.observaciones || "",
        proyectoId: newMachine.proyectoId || null,
        choferId: esVehiculoNuevo ? newMachine.choferId || null : null,
        vencimientoRto: esVehiculoNuevo ? newMachine.vencimientoRto || null : null,
        tieneGps: esVehiculoNuevo ? !!newMachine.tieneGps : false,
        tieneTelepase: esVehiculoNuevo ? !!newMachine.tieneTelepase : false,
        ultimoService: newMachine.ultimoService || null,
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

    if (esVehiculoEditando) {
      if (!editingMachine.patente || !editingMachine.choferId) {
        showError("Error", "Patente y chofer responsable son obligatorios para este tipo de vehículo")
        return
      }
    } else if (!editingMachine.numeroChasis) {
      showError("Error", "El número de chasis es obligatorio para este tipo de maquinaria")
      return
    }

    setIsSaving(true)
    try {
      const updated = await machineryService.update(editingMachine.id, {
        tipo: editingMachine.tipo,
        marca: editingMachine.marca,
        modelo: editingMachine.modelo,
        codigoInterno: editingMachine.codigoInterno,
        patente: esVehiculoEditando ? editingMachine.patente : null,
        numeroChasis: esVehiculoEditando ? null : editingMachine.numeroChasis,
        capacidad: editingMachine.capacidad,
        propiedad: editingMachine.propiedad,
        observaciones: editingMachine.observaciones,
        choferId: esVehiculoEditando ? editingMachine.choferId : null,
        vencimientoRto: esVehiculoEditando ? editingMachine.vencimientoRto : null,
        tieneGps: esVehiculoEditando ? editingMachine.tieneGps : false,
        tieneTelepase: esVehiculoEditando ? editingMachine.tieneTelepase : false,
        ultimoService: editingMachine.ultimoService,
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

  const handleQuickUpdateService = async (machine: Machine, value: string) => {
    try {
      const updated = await machineryService.update(machine.id, { ultimoService: value || null })
      updateMachine(machine.id, updated)
      success("Actualizado", "Fecha de último service guardada")
    } catch {
      showError("Error", "No se pudo guardar la fecha")
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
    setNewMachine(emptyForm)
    setShowNewForm(false)
  }

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sin asignar"
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : "Proyecto no encontrado"
  }

  const activeDrivers = useMemo(() => drivers.filter((d) => d.estado === "activo"), [drivers])

  /**
   * Choferes seleccionables: los activos, más el que ya está asignado aunque
   * haya sido dado de baja (para no perder el valor al editar la máquina).
   */
  const choferOptionsFor = (currentId?: string | null) => {
    if (!currentId || activeDrivers.some((d) => d.id === currentId)) return activeDrivers
    const current = drivers.find((d) => d.id === currentId)
    return current ? [current, ...activeDrivers] : activeDrivers
  }

  // ─── Bloque de identificador condicional (compartido entre alta y edición) ──

  const renderIdentifierFields = (
    esVehiculo: boolean,
    values: { patente?: string | null; numeroChasis?: string | null; choferId?: string | null; vencimientoRto?: string | null; tieneGps?: boolean; tieneTelepase?: boolean },
    onChange: (field: string, value: any) => void
  ) => {
    const choferOptions = choferOptionsFor(values.choferId)
    return (
    <>
      {esVehiculo ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-medium text-foreground">Patente *</Label>
            <Input
              placeholder="Ej: AB123CD"
              value={values.patente || ""}
              onChange={(e) => onChange("patente", e.target.value)}
              className="bg-input border-border text-foreground text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-medium text-foreground">Chofer Responsable *</Label>
            {choferOptions.length === 0 ? (
              <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2">
                No hay choferes activos.{" "}
                <Link href="/choferes" className="text-primary hover:underline">
                  Cargá uno primero
                </Link>
                .
              </div>
            ) : (
              <Select
                value={values.choferId || ""}
                onValueChange={(value) => onChange("choferId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent>
                  {choferOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombreCompleto} — {d.tipoLicencia}
                      {d.estado === "baja" ? " (baja)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-medium text-foreground">Venc. RTO/VTV</Label>
            <DatePicker value={values.vencimientoRto || ""} onChange={(v) => onChange("vencimientoRto", v)} />
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label className="text-xs md:text-sm font-medium text-foreground">Equipamiento del vehículo</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange("tieneGps", !values.tieneGps)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  values.tieneGps
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                GPS
              </button>
              <button
                type="button"
                onClick={() => onChange("tieneTelepase", !values.tieneTelepase)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  values.tieneTelepase
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                <Nfc className="w-3.5 h-3.5" />
                Telepase
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs md:text-sm font-medium text-foreground">Número de Chasis *</Label>
          <Input
            placeholder="Ej: 9BWZZZ377VT004251"
            value={values.numeroChasis || ""}
            onChange={(e) => onChange("numeroChasis", e.target.value)}
            className="bg-input border-border text-foreground text-sm"
          />
        </div>
      )}
    </>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <MachineHistoryModal machine={historyMachine} onClose={() => setHistoryMachine(null)} />
      <AssetNotesModal
        assetType="maquinaria"
        asset={notesMachine}
        onClose={() => setNotesMachine(null)}
        onChanged={(count) => {
          if (notesMachine) updateMachine(notesMachine.id, { ...notesMachine, incidenciasAbiertas: count })
        }}
        canWrite={canWrite}
      />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Maquinaria</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.activeMachines.length} máquinas activas • {stats.assignedMachines.length} asignadas • {stats.unassignedMachines.length} disponibles
            </p>
          </div>
          {canWrite && (
            <Button
              onClick={() => setShowNewForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              + Nueva Maquinaria
            </Button>
          )}
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
                    onValueChange={(value) =>
                      setNewMachine({
                        ...newMachine,
                        tipo: value,
                        // Limpiar campos de la familia que deja de aplicar
                        ...(isVehicleType(value)
                          ? { numeroChasis: "" }
                          : { patente: "", choferId: null, vencimientoRto: "", tieneGps: false, tieneTelepase: false }),
                      })
                    }
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
                  <Label htmlFor="codigoInterno" className="text-xs md:text-sm font-medium text-foreground">
                    Código Interno *
                  </Label>
                  <Input
                    id="codigoInterno"
                    placeholder="Ej: GZ-CAM-014"
                    value={newMachine.codigoInterno || ""}
                    onChange={(e) => setNewMachine({ ...newMachine, codigoInterno: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                {renderIdentifierFields(esVehiculoNuevo, newMachine, (field, value) =>
                  setNewMachine({ ...newMachine, [field]: value })
                )}

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

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Último Service</Label>
                  <DatePicker
                    value={newMachine.ultimoService || ""}
                    onChange={(v) => setNewMachine({ ...newMachine, ultimoService: v })}
                  />
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
                    onValueChange={(value) =>
                      setEditingMachine({
                        ...editingMachine,
                        tipo: value,
                        ...(isVehicleType(value)
                          ? { numeroChasis: null }
                          : { patente: null, choferId: null, vencimientoRto: null, tieneGps: false, tieneTelepase: false }),
                      })
                    }
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
                  <Label className="text-xs md:text-sm font-medium text-foreground">Código Interno</Label>
                  <Input
                    value={editingMachine.codigoInterno}
                    onChange={(e) => setEditingMachine({ ...editingMachine, codigoInterno: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                {renderIdentifierFields(esVehiculoEditando, editingMachine, (field, value) =>
                  setEditingMachine({ ...editingMachine, [field]: value })
                )}

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

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Último Service</Label>
                  <DatePicker
                    value={editingMachine.ultimoService || ""}
                    onChange={(v) => setEditingMachine({ ...editingMachine, ultimoService: v })}
                  />
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
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, patente, chasis, marca, modelo o chofer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

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

            {/* Tipo Filter */}
            <div className="flex items-center gap-2 col-span-2 md:col-span-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {MACHINE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
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

        {/* Machinery List - Table view (desktop, viewMode === list) */}
        {!isLoading && viewMode === "list" && (
          <Card className="hidden md:block bg-card border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Código</th>
                  <th className="text-left font-medium px-4 py-3">Tipo</th>
                  <th className="text-left font-medium px-4 py-3">Marca / Modelo</th>
                  <th className="text-left font-medium px-4 py-3">Patente / Chasis</th>
                  <th className="text-left font-medium px-4 py-3">Chofer</th>
                  <th className="text-left font-medium px-4 py-3">Proyecto</th>
                  <th className="text-left font-medium px-4 py-3">Último Service</th>
                  <th className="text-left font-medium px-4 py-3">RTO/VTV</th>
                  <th className="text-left font-medium px-4 py-3">Incidencias</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-left font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <tr
                    key={machine.id}
                    className={`border-b border-border hover:bg-muted/50 ${machine.estado === "baja" ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{machine.codigoInterno}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{machine.tipo}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{machine.marca} {machine.modelo}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {machine.patente || machine.numeroChasis || "—"}
                      {isVehicleType(machine.tipo) && (
                        <span className="ml-2 inline-flex gap-1 align-middle">
                          {machine.tieneGps && <span title="GPS"><Navigation className="w-3 h-3 text-primary" /></span>}
                          {machine.tieneTelepase && <span title="Telepase"><Nfc className="w-3 h-3 text-primary" /></span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{machine.choferResponsable || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{getProjectName(machine.proyectoId)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuickDateEdit
                        label=""
                        value={machine.ultimoService}
                        onSave={(v) => handleQuickUpdateService(machine, v)}
                        readOnly={!canWrite}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><RtoBadge machine={machine} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {machine.incidenciasAbiertas > 0 ? (
                        <button
                          onClick={() => setNotesMachine(machine)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {machine.incidenciasAbiertas}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {machine.estado === "baja" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Baja</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Activa</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === machine.id ? null : machine.id)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenuId === machine.id && (
                          <MachineActionsMenu
                            machine={machine}
                            onClose={() => setOpenMenuId(null)}
                            onEdit={() => setEditingMachine(machine)}
                            onHistory={() => setHistoryMachine(machine)}
                            onNotes={() => setNotesMachine(machine)}
                            onMove={() => {
                              setSelectedMachine(machine)
                              setMoveToProject(machine.proyectoId || "none")
                              setShowMoveDialog(true)
                            }}
                            onDeactivate={() => {
                              setSelectedMachine(machine)
                              setShowDeactivateDialog(true)
                            }}
                            onReactivate={() => handleReactivateMachine(machine)}
                            canWrite={canWrite}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMachines.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay maquinaria que coincida con los filtros seleccionados.</p>
              </div>
            )}
          </Card>
        )}

        {/* Machinery List - Cards view (always on mobile, or when viewMode === cards) */}
        {!isLoading && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === "list" ? "md:hidden" : ""}`}>
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
                      <MachineActionsMenu
                        machine={machine}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => setEditingMachine(machine)}
                        onHistory={() => setHistoryMachine(machine)}
                        onNotes={() => setNotesMachine(machine)}
                        onMove={() => {
                          setSelectedMachine(machine)
                          setMoveToProject(machine.proyectoId || "none")
                          setShowMoveDialog(true)
                        }}
                        onDeactivate={() => {
                          setSelectedMachine(machine)
                          setShowDeactivateDialog(true)
                        }}
                        onReactivate={() => handleReactivateMachine(machine)}
                        canWrite={canWrite}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-medium text-foreground">{machine.codigoInterno}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{isVehicleType(machine.tipo) ? "Patente:" : "N° Chasis:"}</span>
                    <span className="font-medium text-foreground">{machine.patente || machine.numeroChasis || "—"}</span>
                  </div>
                  {isVehicleType(machine.tipo) && machine.choferResponsable && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Chofer:</span>
                      <span className="font-medium text-foreground">{machine.choferResponsable}</span>
                    </div>
                  )}
                  {isVehicleType(machine.tipo) && (machine.tieneGps || machine.tieneTelepase) && (
                    <div className="flex items-center gap-2">
                      {machine.tieneGps && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground">
                          <Navigation className="w-3 h-3" /> GPS
                        </span>
                      )}
                      {machine.tieneTelepase && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground">
                          <Nfc className="w-3 h-3" /> Telepase
                        </span>
                      )}
                    </div>
                  )}
                  {machine.capacidad && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span className="font-medium text-foreground">{machine.capacidad}</span>
                    </div>
                  )}
                  <QuickDateEdit
                    label="Último service"
                    value={machine.ultimoService}
                    onSave={(v) => handleQuickUpdateService(machine, v)}
                    readOnly={!canWrite}
                  />
                  <div className="flex items-center gap-2 text-xs flex-wrap">
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
                    <RtoBadge machine={machine} />
                    {machine.incidenciasAbiertas > 0 && (
                      <button
                        onClick={() => setNotesMachine(machine)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {machine.incidenciasAbiertas} abierta{machine.incidenciasAbiertas > 1 ? "s" : ""}
                      </button>
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
            setSelectedMachine(null)
          }}
          onConfirm={handleDeactivateMachine}
          type="confirm"
          title="Dar de baja maquinaria"
          message={`¿Estás seguro de dar de baja "${selectedMachine?.tipo} - ${selectedMachine?.marca} ${selectedMachine?.modelo}"?`}
          confirmText="Dar de baja"
          cancelText="Cancelar"
        />
      </div>
    </>
  )
}

// ─── Actions menu (shared between table row and card) ─────────────────────────

interface MachineActionsMenuProps {
  machine: Machine
  onClose: () => void
  onEdit: () => void
  onHistory: () => void
  onNotes: () => void
  onMove: () => void
  onDeactivate: () => void
  onReactivate: () => void
  canWrite: boolean
}

function MachineActionsMenu({
  machine,
  onClose,
  onEdit,
  onHistory,
  onNotes,
  onMove,
  onDeactivate,
  onReactivate,
  canWrite,
}: MachineActionsMenuProps) {
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
      {canWrite && machine.estado === "activa" && (
        <>
          <button
            onClick={() => {
              onMove()
              onClose()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {machine.proyectoId ? "Mover a otro proyecto" : "Asignar a proyecto"}
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
      {canWrite && machine.estado === "baja" && (
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
