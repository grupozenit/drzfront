"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ChevronDown, Loader2, BarChart3 } from "lucide-react"
import { useProjects } from "@/lib/hooks"
import { useDashboard } from "@/lib/hooks/useDashboard"
import { ACTIVITY_CATEGORIES } from "@/lib/constants/activities"
import type { ProjectWorkProgress } from "@/lib/types"

// Actividades disponibles para filtrar (las mismas del formulario de nuevo
// reporte). Se filtra por ID y se muestra el label: el ID es estable, el label
// puede cambiar y dejaría el filtro sin matchear en silencio.
const allActivities = Object.values(ACTIVITY_CATEGORIES)
  .filter(cat => !cat.isCustom)
  .map(cat => ({ id: cat.id, label: cat.label }))

const activityLabel = (id: string) =>
  allActivities.find(a => a.id === id)?.label ?? id

export function DashboardOverview() {
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedActivity, setSelectedActivity] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [viewMode, setViewMode] = useState<"percentage" | "units">("units")
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [showActivityFilter, setShowActivityFilter] = useState(false)

  // Hooks de datos
  const { projects, isLoading: isLoadingProjects, loadProjects } = useProjects()
  const {
    allWorkProgress,
    workProgress,
    isLoading: isLoadingProgress,
    loadAllWorkProgress,
    loadWorkProgress,
  } = useDashboard()

  // Cargar proyectos al montar
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Cargar datos de progreso cuando cambian los filtros
  useEffect(() => {
    const activityFilter = selectedActivity !== "all" ? selectedActivity : undefined
    
    if (selectedProject === "all") {
      loadAllWorkProgress(startDate || undefined, endDate || undefined, activityFilter)
    } else {
      loadWorkProgress(selectedProject, startDate || undefined, endDate || undefined, activityFilter)
    }
  }, [selectedProject, selectedActivity, startDate, endDate, loadAllWorkProgress, loadWorkProgress])

  // Datos filtrados
  const filteredProjects = useMemo(() => {
    if (selectedProject === "all") {
      return allWorkProgress
    }
    return workProgress ? [workProgress] : []
  }, [selectedProject, allWorkProgress, workProgress])

  const getAverageProgress = (stages: ProjectWorkProgress["stages"]) => {
    const allSubStages = stages.flatMap(s => s.subStages)
    if (allSubStages.length === 0) return 0
    const total = allSubStages.reduce((acc, sub) => acc + sub.progress, 0)
    return Math.round(total / allSubStages.length)
  }

  const isLoading = isLoadingProjects || isLoadingProgress

  return (
    <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="hidden md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">Avances de Obra</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Resumen de avance por proyecto</p>
        </div>
        <Button
          onClick={() => {
            setSelectedProject("all")
            setSelectedActivity("all")
            setStartDate("")
            setEndDate("")
          }}
          variant="outline"
          className="text-xs md:text-sm bg-transparent hover:bg-primary hover:text-primary-foreground"
        >
          Limpiar Filtros
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 md:p-6 bg-card border-border">
        {/* Indicador de filtro de fecha activo */}
        {(startDate || endDate) && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs md:text-sm text-primary font-medium">
              📅 Mostrando datos {startDate && endDate ? `del ${startDate} al ${endDate}` : startDate ? `desde ${startDate}` : `hasta ${endDate}`}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Las cantidades y porcentajes reflejan solo lo reportado en este período
            </p>
          </div>
        )}
        
        {/* All filters in one line - equal distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
          {/* Project Filter Toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setShowProjectFilter(!showProjectFilter)
                setShowActivityFilter(false)
              }}
              className="flex items-center gap-2 text-xs md:text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Proyecto</span>
              {selectedProject !== "all" && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                  {projects.find(p => p.id === selectedProject)?.name}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showProjectFilter ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Activity Filter Toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setShowActivityFilter(!showActivityFilter)
                setShowProjectFilter(false)
              }}
              className="flex items-center gap-2 text-xs md:text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Actividad</span>
              {selectedActivity !== "all" && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                  {selectedActivity}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showActivityFilter ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Date Filter */}
          <div className="w-full">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "percentage" ? "units" : "percentage")}
              className="relative inline-flex h-9 w-full items-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary bg-input border-2 border-border"
            >
              <span
                className={`inline-block h-7 w-[calc(50%-4px)] transform rounded-md bg-primary shadow-lg transition-transform ${
                  viewMode === "units" ? "translate-x-[calc(100%+8px)]" : "translate-x-1"
                }`}
              >
                <span className="flex items-center justify-center h-full text-xs font-bold text-primary-foreground">
                  {viewMode === "percentage" ? "%" : "#"}
                </span>
              </span>
              <span className="absolute inset-0 flex items-center justify-around pointer-events-none px-2">
                <span className={`text-xs font-medium ${viewMode === "percentage" ? "text-transparent" : "text-muted-foreground"}`}>%</span>
                <span className={`text-xs font-medium ${viewMode === "units" ? "text-transparent" : "text-muted-foreground"}`}>#</span>
              </span>
            </button>
          </div>
        </div>

        {/* Project Options - Expandable */}
        {showProjectFilter && (
          <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setSelectedProject("all")}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                selectedProject === "all"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              Todos
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProject(project.id)}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  selectedProject === project.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}

        {/* Activity Options - Expandable */}
        {showActivityFilter && (
          <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setSelectedActivity("all")}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                selectedActivity === "all"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              Todas
            </button>
            {allActivities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity.id)}
                className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                  selectedActivity === activity.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {activity.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && filteredProjects.length === 0 && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando avances...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProjects.length === 0 && (
        <Card className="p-8 bg-card border-border">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos de avance</h3>
            <p className="text-sm text-muted-foreground">
              No hay datos de avance disponibles. Los datos aparecerán cuando se completen las líneas base y se generen reportes diarios.
            </p>
          </div>
        </Card>
      )}

      {/* Projects Progress */}
      {viewMode === "percentage" ? (
        <div className="space-y-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-4 md:p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-foreground">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Progreso general: {project.overallProgress ?? getAverageProgress(project.stages)}%
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {project.stages
                  .map((stage, stageIndex) => (
                    <div key={stageIndex} className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">{stage.name}</h4>
                      <div className="space-y-2">
                        {stage.subStages.map((subStage, subIndex) => (
                          <div key={subIndex} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">{subStage.name}</p>
                              <p className="text-xs font-medium text-foreground">{subStage.progress}%</p>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${subStage.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-4 md:p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-foreground">{project.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Cantidades reportadas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.stages
                  .map((stage, stageIndex) => (
                    <Card key={stageIndex} className="p-4 bg-muted/50 border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-3">{stage.name}</h4>
                      <div className="space-y-2">
                        {stage.subStages.map((subStage, subIndex) => (
                          <div key={subIndex} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{subStage.name}</span>
                            <span className="text-xs font-medium text-foreground">
                              {subStage.completed} / {subStage.total} {subStage.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
