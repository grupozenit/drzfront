"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Activity {
  id: string
  description: string
  quantity: string
  unit: string
  location: string
  workers: string
  observations: string
  category?: string
  subActivity?: string
  component?: string
}

interface ActivityFormProps {
  activity: Activity
  index: number
  onUpdate: (id: string, field: keyof Activity, value: string) => void
  onRemove: () => void
  canRemove: boolean
}

// Tipo para las actividades predefinidas
type PredefinedActivityCategory = {
  label: string;
  subActivities?: string[];
  components?: string[];
  unit?: string;
  getUnit?: (subActivity: string) => string;
  isCustom?: boolean;
}

// Definición de actividades predefinidas
const predefinedActivities: Record<string, PredefinedActivityCategory> = {
  hincas: {
    label: "Hincas",
    subActivities: ["Replanteo", "Distribución", "Hincado", "Pre-Drilling"],
    unit: "unidades",
  },
  trackers: {
    label: "Trackers",
    subActivities: ["Pre-Armado", "Distribución", "Montaje", "Alineación", "Torque"],
    components: ["Soportes", "Rodamientos", "Tubos", "Purlins", "Motor", "Amortiguadores", "TCU"],
    unit: "unidades",
  },
  modulos: {
    label: "Módulos",
    subActivities: ["Distribución", "Montaje", "Torque", "Seriado", "Escaneado"],
    unit: "unidades",
  },
  calidad: {
    label: "Calidad",
    subActivities: ["Revire", "Limado", "Galvanizado", "Mecanizado", "Pull Out Test"],
    unit: "unidades",
  },
  obraElectrica: {
    label: "Obra Eléctrica",
    subActivities: ["Replanteo", "Excavación", "Tendido", "Tapado", "Confección Terminales MC4"],
    components: ["Cable BT/AC", "Cable BT/CC", "Cable MT", "Cable FO", "Cable PAT"],
    getUnit: (subActivity: string) => {
      const metrosActivities = ["Replanteo", "Excavación", "Tendido", "Tapado"]
      return metrosActivities.includes(subActivity) ? "metros" : "unidades"
    },
  },
  ensayos: {
    label: "Ensayos",
    subActivities: ["Continuidad", "Polaridad", "Megado", "Medición de VOC"],
    unit: "unidades",
  },
  inversores: {
    label: "Inversores",
    subActivities: ["Replanteo", "Hincado", "Montaje", "Conexión"],
    unit: "unidades",
  },
  cts: {
    label: "CTs",
    subActivities: ["Replanteo", "Excavación", "Armadura", "Encofrado", "Hormigonado", "Montaje"],
    unit: "unidades",
  },
  otras: {
    label: "Otras",
    isCustom: true,
  },
}

type ActivityCategory = keyof typeof predefinedActivities

export function ActivityForm({ activity, index, onUpdate, onRemove, canRemove }: ActivityFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null)
  const [selectedSubActivity, setSelectedSubActivity] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Inicializar estados locales con los valores de la actividad si existen (modo edición)
  useEffect(() => {
    if (activity.category && activity.category in predefinedActivities) {
      setSelectedCategory(activity.category as ActivityCategory)
    }
    if (activity.subActivity) {
      setSelectedSubActivity(activity.subActivity)
    }
    if (activity.component) {
      setSelectedComponent(activity.component)
    }
  }, [activity.id]) // Solo ejecutar cuando cambia el ID de la actividad

  const handleCategorySelect = (category: ActivityCategory) => {
    setSelectedCategory(category)
    setSelectedSubActivity(null)
    setSelectedComponent(null)

    // Actualizar el campo category en el estado del padre
    onUpdate(activity.id, "category", category)

    if (category === "otras") {
      onUpdate(activity.id, "description", "")
      onUpdate(activity.id, "unit", "")
      onUpdate(activity.id, "subActivity", "")
      onUpdate(activity.id, "component", "")
    }
  }

  const handleSubActivitySelect = (subActivity: string) => {
    setSelectedSubActivity(subActivity)
    
    // Actualizar el campo subActivity en el estado del padre
    onUpdate(activity.id, "subActivity", subActivity)
    
    const categoryData = predefinedActivities[selectedCategory!]
    let description = ""
    let unit = "unidades"

    if (selectedCategory === "obraElectrica") {
      const obraData = categoryData as PredefinedActivityCategory & { getUnit: (subActivity: string) => string }
      unit = obraData.getUnit(subActivity)
      if (selectedComponent) {
        description = `${categoryData.label} - ${subActivity} de ${selectedComponent}`
      } else {
        description = `${categoryData.label} - ${subActivity}`
      }
    } else if ("components" in categoryData && categoryData.components) {
      if (selectedComponent) {
        description = `${categoryData.label} - ${subActivity} de ${selectedComponent}`
      } else {
        description = `${categoryData.label} - ${subActivity}`
      }
      unit = categoryData.unit || "unidades"
    } else {
      description = `${categoryData.label} - ${subActivity}`
      unit = categoryData.unit || "unidades"
    }

    onUpdate(activity.id, "description", description)
    onUpdate(activity.id, "unit", unit)
  }

  const handleComponentSelect = (component: string) => {
    setSelectedComponent(component)
    
    // Actualizar el campo component en el estado del padre
    onUpdate(activity.id, "component", component)
    
    const categoryData = predefinedActivities[selectedCategory!]
    let description = ""
    let unit = "unidades"

    if (selectedSubActivity) {
      description = `${categoryData.label} - ${selectedSubActivity} de ${component}`
      if (selectedCategory === "obraElectrica") {
        const obraData = categoryData as PredefinedActivityCategory & { getUnit: (subActivity: string) => string }
        unit = obraData.getUnit(selectedSubActivity)
      } else {
        unit = categoryData.unit || "unidades"
      }
    } else {
      description = `${categoryData.label} - ${component}`
      unit = categoryData.unit || "unidades"
    }

    onUpdate(activity.id, "description", description)
    onUpdate(activity.id, "unit", unit)
  }

  const isCustomActivity = selectedCategory === "otras"
  const currentCategory = selectedCategory ? predefinedActivities[selectedCategory] : null
  const hasComponents = currentCategory && "components" in currentCategory && currentCategory.components

  return (
    <Card className="p-4 md:p-6 bg-card border-border relative">
      <div className="flex items-start justify-between mb-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Actividad {index}
          {activity.description && !isExpanded && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              - {activity.description.length > 40 ? activity.description.substring(0, 40) + "..." : activity.description}
            </span>
          )}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80 font-bold text-lg leading-none"
            title="Eliminar actividad"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4 md:space-y-5">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-xs md:text-sm font-medium text-foreground">Tipo de Actividad</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(predefinedActivities) as ActivityCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCategorySelect(key)}
                  className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                    selectedCategory === key
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  {predefinedActivities[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-activities */}
          {selectedCategory && selectedCategory !== "otras" && currentCategory && "subActivities" in currentCategory && (
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-medium text-foreground">
                Sub-actividad <span className="text-destructive">*</span> (Requerido)
              </Label>
              <div className="flex flex-wrap gap-2">
                {currentCategory.subActivities?.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSubActivitySelect(sub)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedSubActivity === sub
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-muted/50 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
              {selectedCategory && !selectedSubActivity && (
                <p className="text-xs text-destructive">
                  ⚠️ Debes hacer clic en una de las sub-actividades para continuar
                </p>
              )}
            </div>
          )}

          {/* Components (for Trackers and Obra Eléctrica) */}
          {hasComponents && (
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-medium text-foreground">Componente</Label>
              <div className="flex flex-wrap gap-2">
                {currentCategory.components?.map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => handleComponentSelect(comp)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedComponent === comp
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-muted/50 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Description (only for "Otras") */}
          {isCustomActivity && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`desc-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
                  Descripción de la Actividad
                </Label>
                <Textarea
                  id={`desc-${activity.id}`}
                  value={activity.description}
                  onChange={(e) => onUpdate(activity.id, "description", e.target.value)}
                  placeholder="Ej: Excavación de zanjas, Instalación de tuberías..."
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground min-h-20 md:min-h-24 resize-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`unit-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
                  Unidad
                </Label>
                <Input
                  id={`unit-${activity.id}`}
                  type="text"
                  value={activity.unit}
                  onChange={(e) => onUpdate(activity.id, "unit", e.target.value)}
                  placeholder="Ej: m³, m², unidades..."
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>
            </>
          )}

          {/* Selected Activity Summary */}
          {selectedCategory && selectedCategory !== "otras" && activity.description && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Actividad seleccionada:</p>
              <p className="text-sm font-medium text-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">Unidad: {activity.unit}</p>
            </div>
          )}

          {/* Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor={`qty-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
                Cantidad
              </Label>
              <Input
                id={`qty-${activity.id}`}
                type="text"
                value={activity.quantity}
                onChange={(e) => onUpdate(activity.id, "quantity", e.target.value)}
                placeholder="Ej: 45"
                className="bg-input border-border text-foreground text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`loc-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
                Ubicación
              </Label>
              <Input
                id={`loc-${activity.id}`}
                type="text"
                value={activity.location}
                onChange={(e) => onUpdate(activity.id, "location", e.target.value)}
                placeholder="Ej: Sector A, Piso 3..."
                className="bg-input border-border text-foreground text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`workers-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
              Cantidad de Trabajadores
            </Label>
            <Input
              id={`workers-${activity.id}`}
              type="number"
              value={activity.workers}
              onChange={(e) => onUpdate(activity.id, "workers", e.target.value)}
              placeholder="Ej: 8"
              className="bg-input border-border text-foreground text-sm no-arrows w-full md:w-1/2"
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor={`obs-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
              Observaciones
            </Label>
            <Textarea
              id={`obs-${activity.id}`}
              value={activity.observations}
              onChange={(e) => onUpdate(activity.id, "observations", e.target.value)}
              placeholder="Notas adicionales, incidencias, comentarios..."
              className="bg-input border-border text-foreground placeholder:text-muted-foreground min-h-16 md:min-h-20 resize-none text-sm"
            />
          </div>
        </div>
      )}
    </Card>
  )
}
