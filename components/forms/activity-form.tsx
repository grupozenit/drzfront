"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  ACTIVITY_CATEGORIES,
  acceptsComponent,
  componentLabel,
  unitFor,
} from "@/lib/constants/activities"
import type { ActivityCategory } from "@/lib/types"

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

export function ActivityForm({ activity, index, onUpdate, onRemove, canRemove }: ActivityFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null)
  const [selectedSubActivity, setSelectedSubActivity] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // Inicializar estados locales con los valores de la actividad si existen (modo edición)
  useEffect(() => {
    if (activity.category && activity.category in ACTIVITY_CATEGORIES) {
      setSelectedCategory(activity.category as ActivityCategory)
    }
    if (activity.subActivity) {
      setSelectedSubActivity(activity.subActivity)
    }
    if (activity.component) {
      setSelectedComponent(activity.component)
    }
  }, [activity.id]) // Solo ejecutar cuando cambia el ID de la actividad

  // La descripción se arma sola a partir de lo elegido; para "Otras" la escribe
  // el usuario. El tipo de cable, cuando aplica, se anexa al final.
  const buildDescription = (
    category: ActivityCategory,
    subActivity: string | null,
    component: string | null,
  ): string => {
    const label = ACTIVITY_CATEGORIES[category].label
    const base = subActivity ? `${label} - ${subActivity}` : label
    return component ? `${base} de ${component}` : base
  }

  const handleCategorySelect = (category: ActivityCategory) => {
    setSelectedCategory(category)
    setSelectedSubActivity(null)
    setSelectedComponent(null)

    onUpdate(activity.id, "category", category)
    onUpdate(activity.id, "subActivity", "")
    onUpdate(activity.id, "component", "")

    if (category === "otras") {
      // Descripción y unidad libres: se limpian para que las cargue el usuario
      onUpdate(activity.id, "description", "")
      onUpdate(activity.id, "unit", "")
      return
    }

    // Las categorías sin sub-actividades (Movilización) ya quedan completas
    if (!ACTIVITY_CATEGORIES[category].subActivities?.length) {
      onUpdate(activity.id, "description", buildDescription(category, null, null))
      onUpdate(activity.id, "unit", unitFor(category))
    } else {
      onUpdate(activity.id, "description", "")
      onUpdate(activity.id, "unit", "")
    }
  }

  const handleSubActivitySelect = (subActivity: string) => {
    if (!selectedCategory) return
    setSelectedSubActivity(subActivity)

    onUpdate(activity.id, "subActivity", subActivity)
    onUpdate(activity.id, "description", buildDescription(selectedCategory, subActivity, selectedComponent))
    onUpdate(activity.id, "unit", unitFor(selectedCategory, subActivity))
  }

  const handleComponentSelect = (component: string) => {
    if (!selectedCategory) return
    // Volver a tocar la misma opción la deselecciona: el campo es opcional
    const next = selectedComponent === component ? null : component
    setSelectedComponent(next)

    onUpdate(activity.id, "component", next ?? "")
    onUpdate(activity.id, "description", buildDescription(selectedCategory, selectedSubActivity, next))
    onUpdate(activity.id, "unit", unitFor(selectedCategory, selectedSubActivity ?? undefined))
  }

  const isCustomActivity = selectedCategory === "otras"
  const currentCategory = selectedCategory ? ACTIVITY_CATEGORIES[selectedCategory] : null
  const hasSubActivities = Boolean(currentCategory?.subActivities?.length)
  const hasComponents = Boolean(selectedCategory && acceptsComponent(selectedCategory))

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
              {(Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[]).map((key) => (
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
                  {ACTIVITY_CATEGORIES[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-actividades. Movilización no tiene, y "Otras" es libre. */}
          {hasSubActivities && !isCustomActivity && (
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-medium text-foreground">
                Sub-actividad <span className="text-destructive">*</span> (Requerido)
              </Label>
              <div className="flex flex-wrap gap-2">
                {currentCategory?.subActivities?.map((sub) => (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() => handleSubActivitySelect(sub.label)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedSubActivity === sub.label
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-muted/50 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {sub.label}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">({sub.unit})</span>
                  </button>
                ))}
              </div>
              {!selectedSubActivity && (
                <p className="text-xs text-destructive">
                  ⚠️ Debes hacer clic en una de las sub-actividades para continuar
                </p>
              )}
            </div>
          )}

          {/* Tercer selector: tipo de cable en Obra Eléctrica, componente en
              Estructuras Menores. En las demás no aparece, y siempre es opcional. */}
          {hasComponents && selectedCategory && (
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-medium text-foreground">
                {componentLabel(selectedCategory)}{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {currentCategory?.components?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleComponentSelect(option)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      selectedComponent === option
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-muted/50 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {option}
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
                  maxLength={1000}
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
                  maxLength={50}
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
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={activity.quantity}
                onChange={(e) => onUpdate(activity.id, "quantity", e.target.value)}
                placeholder="Ej: 45"
                className="bg-input border-border text-foreground text-sm no-arrows"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`loc-${activity.id}`} className="text-xs md:text-sm font-medium text-foreground">
                Ubicación
              </Label>
              <Input
                id={`loc-${activity.id}`}
                type="text"
                maxLength={255}
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
              min="0"
              max="10000"
              step="1"
              inputMode="numeric"
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
              maxLength={1000}
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
