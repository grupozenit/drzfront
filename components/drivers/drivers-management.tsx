"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ViewToggle } from "@/components/ui/view-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import { AnchoredPopover } from "@/components/ui/anchored-popover"
import { useToast, ToastContainer } from "@/components/ui/toast"
import {
  UserRound,
  IdCard,
  Mail,
  Power,
  MoreVertical,
  X,
  Edit2,
  Loader2,
  Clock,
  Search,
  Truck,
} from "lucide-react"
import { useDrivers, usePermissions } from "@/lib/hooks"
import { useViewMode } from "@/lib/hooks/useViewMode"
import { driverService } from "@/lib/api"
import { LICENSE_TYPES, LICENSE_LABELS, licenseLabel } from "@/lib/constants/activities"
import { cuitError, formatCuit } from "@/lib/utils"
import type { Driver, CreateDriverDTO, DriverEventLogEntry } from "@/lib/types"

// ─── Event labels & colors ────────────────────────────────────────────────────

const EVENT_LABELS: Record<DriverEventLogEntry["eventType"], string> = {
  alta: "Alta",
  edicion: "Edición",
  baja: "Baja",
  reactivacion: "Reactivación",
}

const EVENT_COLORS: Record<DriverEventLogEntry["eventType"], string> = {
  alta: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  edicion: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  baja: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  reactivacion: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
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

/** Agrupa la licencia por su letra (B, C, D, E, G) para el filtro por familia. */
function licenseFamily(tipo: string): string {
  return tipo.charAt(0)
}

const LICENSE_FAMILIES: { value: string; label: string }[] = [
  { value: "B", label: "B — Particular" },
  { value: "C", label: "C — Camiones" },
  { value: "D", label: "D — Pasajeros" },
  { value: "E", label: "E — Maquinaria especial" },
  { value: "G", label: "G — Agrícola" },
]

// ─── History Modal ─────────────────────────────────────────────────────────────

interface DriverHistoryModalProps {
  driver: Driver | null
  onClose: () => void
}

function DriverHistoryModal({ driver, onClose }: DriverHistoryModalProps) {
  const [events, setEvents] = useState<DriverEventLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!driver) return
    setLoading(true)
    driverService
      .getHistory(driver.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [driver])

  if (!driver) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Historial de Eventos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {driver.nombreCompleto} — {driver.cuit}
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

export function DriversManagement() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("activo")
  const [filterLicense, setFilterLicense] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useViewMode("choferes-view")

  const emptyForm: Partial<CreateDriverDTO> = {
    nombre: "",
    apellido: "",
    tipoLicencia: "",
    cuit: "",
    email: "",
  }

  const [newDriver, setNewDriver] = useState<Partial<CreateDriverDTO>>(emptyForm)

  const { toasts, success, error: showError, removeToast } = useToast()
  const { drivers, isLoading, loadDrivers, addDriver, updateDriver, removeDriver } = useDrivers()
  const { can } = usePermissions()
  const canWrite = can("choferes", "create")

  useEffect(() => {
    loadDrivers()
  }, [])

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return drivers.filter((d) => {
      const matchesStatus = filterStatus === "all" || d.estado === filterStatus
      const matchesLicense =
        filterLicense === "all" ||
        d.tipoLicencia === filterLicense ||
        licenseFamily(d.tipoLicencia) === filterLicense
      const matchesSearch =
        !term ||
        [d.nombre, d.apellido, d.nombreCompleto, d.cuit, d.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term))
      return matchesStatus && matchesLicense && matchesSearch
    })
  }, [drivers, filterStatus, filterLicense, searchTerm])

  const nuevoCuitError = cuitError(newDriver.cuit || "")
  const editCuitError = editingDriver ? cuitError(editingDriver.cuit || "") : null

  const stats = useMemo(() => {
    const activos = drivers.filter((d) => d.estado === "activo")
    const bajas = drivers.filter((d) => d.estado === "baja")
    return { activos, bajas }
  }, [drivers])

  const handleAddDriver = async () => {
    if (!newDriver.nombre || !newDriver.apellido || !newDriver.tipoLicencia || !newDriver.cuit) {
      showError("Error", "Completa los campos obligatorios")
      return
    }
    if (nuevoCuitError) {
      showError("CUIT inválido", nuevoCuitError)
      return
    }

    setIsSaving(true)
    try {
      const driver = await driverService.create({
        nombre: newDriver.nombre || "",
        apellido: newDriver.apellido || "",
        tipoLicencia: newDriver.tipoLicencia || "",
        cuit: newDriver.cuit || "",
        email: newDriver.email || null,
      })
      addDriver(driver)
      resetForm()
      success("Chofer registrado", "El chofer se ha registrado correctamente")
    } catch (err: any) {
      showError("Error", err?.message || "No se pudo registrar el chofer")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateDriver = async () => {
    if (!editingDriver) return

    if (!editingDriver.nombre || !editingDriver.apellido || !editingDriver.cuit) {
      showError("Error", "Completa los campos obligatorios")
      return
    }
    if (editCuitError) {
      showError("CUIT inválido", editCuitError)
      return
    }

    setIsSaving(true)
    try {
      const updated = await driverService.update(editingDriver.id, {
        nombre: editingDriver.nombre,
        apellido: editingDriver.apellido,
        tipoLicencia: editingDriver.tipoLicencia,
        cuit: editingDriver.cuit,
        email: editingDriver.email || null,
      })
      updateDriver(editingDriver.id, updated)
      setEditingDriver(null)
      success("Chofer actualizado", "Los cambios se han guardado correctamente")
    } catch (err: any) {
      showError("Error", err?.message || "No se pudo actualizar el chofer")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivateDriver = async () => {
    if (!selectedDriver) return

    setIsSaving(true)
    try {
      const updated = await driverService.deactivate(selectedDriver.id)
      updateDriver(selectedDriver.id, updated)
      setShowDeactivateDialog(false)
      setSelectedDriver(null)
      success("Chofer dado de baja", "El chofer ha sido dado de baja")
    } catch (err) {
      showError("Error", "No se pudo dar de baja el chofer")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReactivateDriver = async (driver: Driver) => {
    setIsSaving(true)
    try {
      const updated = await driverService.reactivate(driver.id)
      updateDriver(driver.id, updated)
      success("Chofer reactivado", "El chofer está activo nuevamente")
    } catch (err) {
      showError("Error", "No se pudo reactivar el chofer")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setNewDriver(emptyForm)
    setShowNewForm(false)
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <DriverHistoryModal driver={historyDriver} onClose={() => setHistoryDriver(null)} />

      <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Choferes</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.activos.length} choferes activos • {stats.bajas.length} dados de baja
            </p>
          </div>
          {canWrite && (
            <Button
              onClick={() => setShowNewForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              + Nuevo Chofer
            </Button>
          )}
        </div>

        {/* New Driver Form */}
        {showNewForm && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Registrar Nuevo Chofer</h3>
                <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-xs md:text-sm font-medium text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Juan"
                    value={newDriver.nombre || ""}
                    onChange={(e) => setNewDriver({ ...newDriver, nombre: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-xs md:text-sm font-medium text-foreground">
                    Apellido *
                  </Label>
                  <Input
                    id="apellido"
                    placeholder="Ej: Pérez"
                    value={newDriver.apellido || ""}
                    onChange={(e) => setNewDriver({ ...newDriver, apellido: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoLicencia" className="text-xs md:text-sm font-medium text-foreground">
                    Tipo de Licencia *
                  </Label>
                  <Select
                    value={newDriver.tipoLicencia}
                    onValueChange={(value) => setNewDriver({ ...newDriver, tipoLicencia: value })}
                  >
                    <SelectTrigger id="tipoLicencia">
                      <SelectValue placeholder="Seleccionar licencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {LICENSE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuit" className="text-xs md:text-sm font-medium text-foreground">
                    CUIT *
                  </Label>
                  <Input
                    id="cuit"
                    inputMode="numeric"
                    placeholder="Ej: 20-30260318-9"
                    value={newDriver.cuit || ""}
                    onChange={(e) => setNewDriver({ ...newDriver, cuit: formatCuit(e.target.value) })}
                    className={`bg-input text-foreground text-sm ${
                      nuevoCuitError ? "border-destructive" : "border-border"
                    }`}
                  />
                  {nuevoCuitError && (
                    <p className="text-xs text-destructive">{nuevoCuitError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs md:text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: juan.perez@empresa.com"
                    value={newDriver.email || ""}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAddDriver}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Chofer"
                  )}
                </Button>
                <Button onClick={resetForm} variant="outline" className="text-sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Driver Form */}
        {editingDriver && (
          <Card className="p-6 md:p-8 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-foreground">Editar Chofer</h3>
                <button onClick={() => setEditingDriver(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Nombre</Label>
                  <Input
                    value={editingDriver.nombre}
                    onChange={(e) => setEditingDriver({ ...editingDriver, nombre: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Apellido</Label>
                  <Input
                    value={editingDriver.apellido}
                    onChange={(e) => setEditingDriver({ ...editingDriver, apellido: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Tipo de Licencia</Label>
                  <Select
                    value={editingDriver.tipoLicencia}
                    onValueChange={(value) => setEditingDriver({ ...editingDriver, tipoLicencia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {LICENSE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">CUIT</Label>
                  <Input
                    inputMode="numeric"
                    value={editingDriver.cuit}
                    onChange={(e) => setEditingDriver({ ...editingDriver, cuit: formatCuit(e.target.value) })}
                    className={`bg-input text-foreground text-sm ${
                      editCuitError ? "border-destructive" : "border-border"
                    }`}
                  />
                  {editCuitError && (
                    <p className="text-xs text-destructive">{editCuitError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium text-foreground">Email</Label>
                  <Input
                    type="email"
                    value={editingDriver.email || ""}
                    onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleUpdateDriver}
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
                <Button onClick={() => setEditingDriver(null)} variant="outline" className="text-sm">
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
                placeholder="Buscar por nombre, apellido, CUIT o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="baja">Dados de baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">Licencia</Label>
              <Select value={filterLicense} onValueChange={setFilterLicense}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {LICENSE_FAMILIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                  {LICENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LICENSE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && drivers.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando choferes...</p>
            </div>
          </div>
        )}

        {/* Table view (desktop) */}
        {!isLoading && viewMode === "list" && (
          <Card className="hidden md:block bg-card border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Apellido y Nombre</th>
                  <th className="text-left font-medium px-4 py-3">Licencia</th>
                  <th className="text-left font-medium px-4 py-3">CUIT</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Vehículos</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-left font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className={`border-b border-border hover:bg-muted/50 ${driver.estado === "baja" ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {driver.apellido}, {driver.nombre}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {driver.tipoLicencia}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground hidden lg:inline">
                        {licenseLabel(driver.tipoLicencia).split("—")[1]?.trim()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{driver.cuit}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{driver.email || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {driver.vehiculosAsignados > 0 ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                          {driver.vehiculosAsignados}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {driver.estado === "baja" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Baja</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === driver.id ? null : driver.id)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenuId === driver.id && (
                          <DriverActionsMenu
                            driver={driver}
                            onClose={() => setOpenMenuId(null)}
                            onEdit={() => setEditingDriver(driver)}
                            onHistory={() => setHistoryDriver(driver)}
                            onDeactivate={() => {
                              setSelectedDriver(driver)
                              setShowDeactivateDialog(true)
                            }}
                            onReactivate={() => handleReactivateDriver(driver)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDrivers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay choferes que coincidan con los filtros seleccionados.</p>
              </div>
            )}
          </Card>
        )}

        {/* Cards view (always on mobile, or when viewMode === cards) */}
        {!isLoading && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === "list" ? "md:hidden" : ""}`}>
            {filteredDrivers.map((driver) => (
              <Card
                key={driver.id}
                className={`p-4 md:p-5 bg-card border-border hover:border-primary/50 transition-colors ${
                  driver.estado === "baja" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${driver.estado === "activo" ? "bg-primary/10" : "bg-muted"}`}>
                      <UserRound className={`w-5 h-5 ${driver.estado === "activo" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{driver.nombreCompleto}</h4>
                      <p className="text-xs text-muted-foreground">
                        Licencia {driver.tipoLicencia}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === driver.id ? null : driver.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {openMenuId === driver.id && (
                      <DriverActionsMenu
                        driver={driver}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => setEditingDriver(driver)}
                        onHistory={() => setHistoryDriver(driver)}
                        onDeactivate={() => {
                          setSelectedDriver(driver)
                          setShowDeactivateDialog(true)
                        }}
                        onReactivate={() => handleReactivateDriver(driver)}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{licenseLabel(driver.tipoLicencia)}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <IdCard className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{driver.cuit}</span>
                  </div>
                  {driver.email && (
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground truncate">{driver.email}</span>
                    </div>
                  )}
                  {driver.vehiculosAsignados > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground">
                        {driver.vehiculosAsignados} vehículo{driver.vehiculosAsignados > 1 ? "s" : ""} asignado{driver.vehiculosAsignados > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  {driver.estado === "baja" ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                      Baja
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Activo
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredDrivers.length === 0 && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <UserRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin choferes</h3>
              <p className="text-sm text-muted-foreground">
                No hay choferes que coincidan con los filtros seleccionados.
              </p>
            </div>
          </Card>
        )}

        {/* Deactivate Dialog */}
        <Dialog
          isOpen={showDeactivateDialog}
          onClose={() => {
            setShowDeactivateDialog(false)
            setSelectedDriver(null)
          }}
          onConfirm={handleDeactivateDriver}
          type="confirm"
          title="Dar de baja chofer"
          message={
            selectedDriver?.vehiculosAsignados
              ? `"${selectedDriver.nombreCompleto}" tiene ${selectedDriver.vehiculosAsignados} vehículo(s) asignado(s). Al darlo de baja seguirán asignados, pero no podrás elegirlo para nuevos vehículos. ¿Continuar?`
              : `¿Estás seguro de dar de baja a "${selectedDriver?.nombreCompleto}"?`
          }
          confirmText="Dar de baja"
          cancelText="Cancelar"
        />
      </div>
    </>
  )
}

// ─── Actions menu (shared between table row and card) ─────────────────────────

interface DriverActionsMenuProps {
  driver: Driver
  onClose: () => void
  onEdit: () => void
  onHistory: () => void
  onDeactivate: () => void
  onReactivate: () => void
}

function DriverActionsMenu({
  driver,
  onClose,
  onEdit,
  onHistory,
  onDeactivate,
  onReactivate,
}: DriverActionsMenuProps) {
  return (
    <AnchoredPopover onClose={onClose} className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-[200px]">
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
      {driver.estado === "activo" ? (
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
      ) : (
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
