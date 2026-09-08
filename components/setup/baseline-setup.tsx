"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { useBaseline } from "@/lib/hooks/useBaseline"
import { usePermissions } from "@/lib/hooks"
import type { CreateBaselineDTO, TrackerComponent, TrackerData } from "@/lib/types"

interface BaselineSetupProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

const DEFAULT_COMPONENTS: TrackerComponent[] = [
  { item: "Hincas", unidad: "unidades", cantidad: 0 },
  { item: "Soportes", unidad: "unidades", cantidad: 0 },
  { item: "Rodamientos", unidad: "unidades", cantidad: 0 },
  { item: "Tubos", unidad: "unidades", cantidad: 0 },
  { item: "Purlins", unidad: "unidades", cantidad: 0 },
  { item: "Motor", unidad: "unidades", cantidad: 0 },
  { item: "Amortiguador", unidad: "unidades", cantidad: 0 },
  { item: "TCU", unidad: "unidades", cantidad: 0 },
]

export function BaselineSetup({ projectId, projectName, onBack }: BaselineSetupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [data, setData] = useState<CreateBaselineDTO>({
    trackers: {
      modelo: "",
      cantidad: 0,
      componentes: [...DEFAULT_COMPONENTS],
    },
    modulos: 0,
    potenciaModulos: 0,
    potenciaTotal: 0,
    cts: 0,
    inversores: 0,
    cableBTAC: 0,
    cableBTCC: 0,
    cableMT: 0,
  })

  const { toasts, success, error: showError, removeToast } = useToast()
  const { baseline, isLoading, loadBaseline, saveBaseline, hasBaseline } = useBaseline()
  const { can } = usePermissions()
  const canWrite = can("avances", hasBaseline ? "update" : "create")

  // Cargar línea base al montar
  useEffect(() => {
    loadBaseline(projectId)
  }, [projectId, loadBaseline])

  // Sincronizar datos cuando se carga la línea base
  useEffect(() => {
    if (baseline) {
      setData({
        trackers: baseline.trackers,
        modulos: baseline.modulos,
        potenciaModulos: baseline.potenciaModulos,
        potenciaTotal: baseline.potenciaTotal,
        cts: baseline.cts,
        inversores: baseline.inversores,
        cableBTAC: baseline.cableBTAC,
        cableBTCC: baseline.cableBTCC,
        cableMT: baseline.cableMT,
      })
    }
  }, [baseline])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveBaseline(projectId, data)
      success("Totales guardados", "Los datos se han guardado correctamente")
      setIsEditing(false)
      if (onBack) {
        setTimeout(() => onBack(), 1500)
      }
    } catch (err) {
      showError("Error", "No se pudieron guardar los totales")
    } finally {
      setIsSaving(false)
    }
  }

  const handleComponentChange = (index: number, value: string) => {
    const newComponents = [...data.trackers.componentes]
    newComponents[index] = {
      ...newComponents[index],
      cantidad: parseInt(value) || 0,
    }
    setData({
      ...data,
      trackers: { ...data.trackers, componentes: newComponents },
    })
  }

  const handleTrackerChange = (field: keyof TrackerData, value: string | number) => {
    setData({
      ...data,
      trackers: { ...data.trackers, [field]: field === 'modelo' ? value : (parseInt(value as string) || 0) },
    })
  }

  const handleNumberChange = (field: keyof Omit<CreateBaselineDTO, 'trackers'>, value: string) => {
    setData({
      ...data,
      [field]: parseFloat(value) || 0,
    })
  }

  if (isLoading) {
    return (
      <div className="container px-4 md:px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando totales...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">Totales - {projectName}</h2>
                {hasBaseline && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {hasBaseline 
                  ? "Totales configurados. Puedes editarlos si es necesario."
                  : "Define los componentes y cantidades del proyecto para calcular avances."
                }
              </p>
            </div>
          </div>
          {!isEditing && canWrite && (
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              {hasBaseline ? "Editar Totales" : "Configurar Totales"}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Trackers Section */}
          <Card className="p-6 md:p-8 bg-card border-border">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-6">Trackers</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tracker-modelo" className="text-xs md:text-sm font-medium text-foreground">
                    Modelo
                  </Label>
                  <Input
                    id="tracker-modelo"
                    value={data.trackers.modelo}
                    onChange={(e) => handleTrackerChange('modelo', e.target.value)}
                    disabled={!isEditing}
                    className="bg-input border-border text-foreground text-sm disabled:opacity-70"
                    placeholder="Ej: Tracker XYZ-2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracker-cantidad" className="text-xs md:text-sm font-medium text-foreground">
                    Cantidad (unidades)
                  </Label>
                  <Input
                    id="tracker-cantidad"
                    type="number"
                    value={data.trackers.cantidad || ""}
                    onChange={(e) => handleTrackerChange('cantidad', e.target.value)}
                    disabled={!isEditing}
                    className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-base md:text-lg font-semibold text-foreground mb-4">Componentes por Tracker</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.trackers.componentes.map((comp, index) => (
                    <div key={index} className="space-y-2">
                      <Label className="text-xs md:text-sm font-medium text-foreground">
                        {comp.item} ({comp.unidad})
                      </Label>
                      <Input
                        type="number"
                        value={comp.cantidad || ""}
                        onChange={(e) => handleComponentChange(index, e.target.value)}
                        disabled={!isEditing}
                        className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Módulos y Potencia */}
          <Card className="p-6 md:p-8 bg-card border-border">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-6">Módulos y Potencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modulos" className="text-xs md:text-sm font-medium text-foreground">
                  Módulos (unidades)
                </Label>
                <Input
                  id="modulos"
                  type="number"
                  value={data.modulos || ""}
                  onChange={(e) => handleNumberChange('modulos', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potencia-modulos" className="text-xs md:text-sm font-medium text-foreground">
                  Potencia de Módulos (Wp)
                </Label>
                <Input
                  id="potencia-modulos"
                  type="number"
                  value={data.potenciaModulos || ""}
                  onChange={(e) => handleNumberChange('potenciaModulos', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="potencia-total" className="text-xs md:text-sm font-medium text-foreground">
                  Potencia Total del Proyecto (MWp)
                </Label>
                <Input
                  id="potencia-total"
                  type="number"
                  step="0.1"
                  value={data.potenciaTotal || ""}
                  onChange={(e) => handleNumberChange('potenciaTotal', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Equipamiento Eléctrico */}
          <Card className="p-6 md:p-8 bg-card border-border">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-6">Equipamiento Eléctrico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cts" className="text-xs md:text-sm font-medium text-foreground">
                  CTs - Centros de Transformación (unidades)
                </Label>
                <Input
                  id="cts"
                  type="number"
                  value={data.cts || ""}
                  onChange={(e) => handleNumberChange('cts', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inversores" className="text-xs md:text-sm font-medium text-foreground">
                  Inversores (unidades)
                </Label>
                <Input
                  id="inversores"
                  type="number"
                  value={data.inversores || ""}
                  onChange={(e) => handleNumberChange('inversores', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Cableado */}
          <Card className="p-6 md:p-8 bg-card border-border">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-6">Cableado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cable-btac" className="text-xs md:text-sm font-medium text-foreground">
                  Cable BT/AC (metros)
                </Label>
                <Input
                  id="cable-btac"
                  type="number"
                  value={data.cableBTAC || ""}
                  onChange={(e) => handleNumberChange('cableBTAC', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cable-btcc" className="text-xs md:text-sm font-medium text-foreground">
                  Cable BT/CC (metros)
                </Label>
                <Input
                  id="cable-btcc"
                  type="number"
                  value={data.cableBTCC || ""}
                  onChange={(e) => handleNumberChange('cableBTCC', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cable-mt" className="text-xs md:text-sm font-medium text-foreground">
                  Cable MT (metros)
                </Label>
                <Input
                  id="cable-mt"
                  type="number"
                  value={data.cableMT || ""}
                  onChange={(e) => handleNumberChange('cableMT', e.target.value)}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground text-sm disabled:opacity-70 no-arrows"
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          {isEditing && (
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={handleSave} 
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
              <Button 
                onClick={() => {
                  setIsEditing(false)
                  // Restaurar datos originales
                  if (baseline) {
                    setData({
                      trackers: baseline.trackers,
                      modulos: baseline.modulos,
                      potenciaModulos: baseline.potenciaModulos,
                      potenciaTotal: baseline.potenciaTotal,
                      cts: baseline.cts,
                      inversores: baseline.inversores,
                      cableBTAC: baseline.cableBTAC,
                      cableBTCC: baseline.cableBTCC,
                      cableMT: baseline.cableMT,
                    })
                  }
                }} 
                variant="outline" 
                className="text-sm"
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
