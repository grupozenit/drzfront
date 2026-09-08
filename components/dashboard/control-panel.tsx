"use client"

import { useState, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  LineChart,
  Line,
} from "recharts"
import { Truck, Users, BarChart3, Clock, FolderKanban, Loader2, TrendingUp, HardHat } from "lucide-react"
import { useProjects, useMachinery } from "@/lib/hooks"
import { useDashboard } from "@/lib/hooks/useDashboard"
import { ACTIVITY_CATEGORIES } from "@/lib/constants/activities"
import type {
  ProjectProgress,
  ProjectPersonnelHistory,
  ProjectSuspendedHours,
  ProjectMachinery,
  ProjectMachineryHistory,
  ProjectManHours,
  ProjectActivityBreakdown,
  ProjectSCurve,
} from "@/lib/types"

export function ControlPanel() {
  const [selectedProject, setSelectedProject] = useState<string>("all")
  
  // Hooks de datos
  const { projects, isLoading: isLoadingProjects, loadProjects } = useProjects()
  const { machinery, isLoading: isLoadingMachinery, loadMachinery } = useMachinery()
  const {
    summary,
    allProjectsProgress,
    allPersonnelHistory,
    allSuspendedHours,
    allProjectsMachinery,
    allMachineryHistory,
    allManHours,
    activityBreakdowns,
    sCurves,
    isLoading: isLoadingDashboard,
    loadSummary,
    loadAllProjectsProgress,
    loadAllPersonnelHistory,
    loadAllSuspendedHours,
    loadAllProjectsMachinery,
    loadAllMachineryHistory,
    loadAllManHours,
    loadActivityBreakdown,
    loadSCurve,
  } = useDashboard()

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadProjects(),
        loadMachinery(),
        loadSummary(),
        loadAllProjectsProgress(),
        loadAllPersonnelHistory(),
        loadAllSuspendedHours(),
        loadAllProjectsMachinery(),
        loadAllMachineryHistory(),
        loadAllManHours(),
      ])
    }
    loadData()
  }, [])

  // Cargar histograma de actividades y curva S para cada proyecto
  useEffect(() => {
    if (allProjectsProgress.length > 0) {
      allProjectsProgress.forEach((p) => {
        if (!activityBreakdowns[p.projectId]) loadActivityBreakdown(p.projectId)
        if (!sCurves[p.projectId]) loadSCurve(p.projectId)
      })
    }
  }, [allProjectsProgress])

  // Calcular totales
  const totals = useMemo(() => {
    // Personal del último reporte de cada proyecto
    let totalDirectos = 0
    let totalIndirectos = 0
    
    allPersonnelHistory.forEach((p) => {
      if (p.history.length > 0) {
        const lastEntry = p.history[p.history.length - 1]
        totalDirectos += lastEntry.directos
        totalIndirectos += lastEntry.indirectos
      }
    })

    // Proyectos en ejecución (los que no han llegado al 100%)
    const projectsInProgress = allProjectsProgress.filter(p => p.overallProgress < 100).length

    // Maquinaria activa
    const totalMachines = machinery.filter(m => m.estado === 'activa').length

    return {
      totalDirectos: summary?.totalDirectStaff ?? totalDirectos,
      totalIndirectos: summary?.totalIndirectStaff ?? totalIndirectos,
      projectsInProgress: summary?.projectsInProgress ?? projectsInProgress,
      totalMachines: summary?.activeMachinery ?? totalMachines,
    }
  }, [summary, allPersonnelHistory, allProjectsProgress, machinery])

  // Filtrar datos por proyecto seleccionado
  const filteredPersonnelData = useMemo(() => {
    if (selectedProject === "all") {
      return allPersonnelHistory
    }
    return allPersonnelHistory.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allPersonnelHistory])

  const filteredProgressData = useMemo(() => {
    if (selectedProject === "all") {
      return allProjectsProgress
    }
    return allProjectsProgress.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allProjectsProgress])

  const filteredSuspendedHours = useMemo(() => {
    if (selectedProject === "all") {
      return allSuspendedHours
    }
    return allSuspendedHours.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allSuspendedHours])

  const filteredMachinery = useMemo(() => {
    if (selectedProject === "all") {
      return allProjectsMachinery
    }
    return allProjectsMachinery.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allProjectsMachinery])

  const filteredMachineryHistory = useMemo(() => {
    if (selectedProject === "all") {
      return allMachineryHistory
    }
    return allMachineryHistory.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allMachineryHistory])

  const filteredManHours = useMemo(() => {
    if (selectedProject === "all") {
      return allManHours
    }
    return allManHours.filter((p) => p.projectId === selectedProject)
  }, [selectedProject, allManHours])

  const isLoading = isLoadingProjects || isLoadingMachinery || isLoadingDashboard

  if (isLoading && allProjectsProgress.length === 0) {
    return (
      <div className="container px-4 md:px-6 py-6 md:py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tablero de control...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container px-4 md:px-6 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="hidden md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">Tablero de Control</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Resumen de personal y maquinaria por proyecto
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 md:p-5 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personal Directo (Total)</p>
              <p className="text-2xl font-bold text-foreground">{totals.totalDirectos}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-secondary/10">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personal Indirecto (Total)</p>
              <p className="text-2xl font-bold text-foreground">{totals.totalIndirectos}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <FolderKanban className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proyectos en Ejecución</p>
              <p className="text-2xl font-bold text-foreground">{totals.projectsInProgress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maquinaria en Obra</p>
              <p className="text-2xl font-bold text-foreground">{totals.totalMachines}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <div className="space-y-2">
          <Label className="text-xs md:text-sm font-medium text-foreground">Proyecto</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedProject("all")}
              className={`px-3 py-2 text-xs md:text-sm rounded-lg border-2 transition-all ${
                selectedProject === "all"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              Todos los proyectos
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
        </div>
      </Card>

      {/* Projects - All data grouped by project */}
      <div className="space-y-6">
        {filteredPersonnelData.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos disponibles</h3>
              <p className="text-sm text-muted-foreground">
                No hay datos de reportes para mostrar. Los datos aparecerán cuando se generen reportes diarios.
              </p>
            </div>
          </Card>
        ) : (
          filteredPersonnelData.map((project) => {
            const projectMachinery = filteredMachinery.find((p) => p.projectId === project.projectId)
            const projectMachineryHist = filteredMachineryHistory.find((p) => p.projectId === project.projectId)
            const projectProgress = filteredProgressData.find((p) => p.projectId === project.projectId)
            const projectSuspendedHours = filteredSuspendedHours.find((p) => p.projectId === project.projectId)
            const projectManHours = filteredManHours.find((p) => p.projectId === project.projectId)

            return (
              <ProjectCard
                key={project.projectId}
                personnelData={project}
                progressData={projectProgress}
                machineryData={projectMachinery}
                machineryHistory={projectMachineryHist}
                suspendedHoursData={projectSuspendedHours}
                manHoursData={projectManHours}
                activityBreakdown={activityBreakdowns[project.projectId]}
                sCurveData={sCurves[project.projectId]}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE DE TARJETA DE PROYECTO
// ============================================

// Colores consistentes por categoría de actividad. Son categóricos: cada uno
// identifica una categoría, no son los acentos de marca.
const CATEGORY_COLORS: Record<string, string> = {
  movilizacion: "#8D6E63",
  cercoPerimetral: "#7CB342",
  desconsolidacion: "#5E35B1",
  preparacionTerreno: "#795548",
  caminos: "#6D4C41",
  hincado: "#FF6B35",
  trackers: "#2196F3",
  modulos: "#4CAF50",
  obraElectrica: "#FF9800",
  inversores: "#607D8B",
  ensayos: "#00897B",
  cts: "#E91E63",
  estructurasMenores: "#9C27B0",
  cmm: "#3949AB",
  lamt: "#00BCD4",
  comisionado: "#F4511E",
  otras: "#9E9E9E",
}

// Etiquetas de la leyenda de los gráficos. Salen del catálogo en vez de estar
// escritas otra vez acá: cuando estaban duplicadas se abreviaban distinto
// ("Cerco Perim.") y se desincronizaban del nombre real de la categoría.
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(ACTIVITY_CATEGORIES).map((cat) => [cat.id, cat.label]),
)

// Formatea horas hombre con separador de miles y sin decimales innecesarios
function formatManHours(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)
}

interface ProjectCardProps {
  personnelData: ProjectPersonnelHistory
  progressData?: ProjectProgress
  machineryData?: ProjectMachinery
  machineryHistory?: ProjectMachineryHistory
  suspendedHoursData?: ProjectSuspendedHours
  manHoursData?: ProjectManHours
  activityBreakdown?: ProjectActivityBreakdown
  sCurveData?: ProjectSCurve
}

function ProjectCard({
  personnelData,
  progressData,
  machineryData,
  machineryHistory,
  suspendedHoursData,
  manHoursData,
  activityBreakdown,
  sCurveData,
}: ProjectCardProps) {
  // Calcular avance general ponderado
  const overallProgress = progressData?.overallProgress ?? 0

  // Preparar datos para el gráfico de actividades
  const activityChartData = progressData?.activities.map(a => ({
    name: a.name,
    progress: a.progress,
  })) ?? []

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      {/* Project Header */}
      <div className="mb-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground">{personnelData.projectName}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Avance, personal y maquinaria asignada
        </p>
      </div>

      {/* Overall Progress Card */}
      {progressData && (
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avance General del Proyecto</p>
                <p className="text-2xl font-bold text-primary">
                  {overallProgress}%
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <span>Basado en {progressData.activities.length} actividades</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Horas Hombre Trabajadas (acumulado mensual) */}
      {manHoursData && manHoursData.history.length > 0 && (() => {
        const currentMonthKey = (() => {
          const now = new Date()
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        })()
        const currentMonth = manHoursData.history.find((m) => m.month === currentMonthKey)
        const chartData = manHoursData.history.map((m) => ({
          name: m.monthLabel,
          horas: m.manHours,
        }))

        return (
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HardHat className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas Hombre Trabajadas</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatManHours(manHoursData.totalManHours)} <span className="text-sm font-medium">hs</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground">
                <span>Acumulado histórico del proyecto</span>
                {currentMonth && (
                  <span>
                    Mes actual ({currentMonth.monthLabel}): {formatManHours(currentMonth.manHours)} hs
                  </span>
                )}
              </div>
            </div>

            {/* Acumulado por mes */}
            <div className="mt-4 h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 10, left: -10, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${formatManHours(value)} hs`, "Horas hombre"]}
                  />
                  <Bar dataKey="horas" name="Horas hombre" fill="#F59E0B" radius={[0, 0, 0, 0]}>
                    <LabelList
                      dataKey="horas"
                      position="top"
                      fill="#B45309"
                      fontSize={9}
                      fontWeight={600}
                      formatter={(value: number) => (value > 0 ? formatManHours(value) : "")}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Histograma de Actividades Semanal (full width) */}
      {activityBreakdown && activityBreakdown.breakdown.length > 0 && (() => {
        // Collect all categories across all weeks
        const allCategories = new Set<string>()
        activityBreakdown.breakdown.forEach(w => {
          Object.keys(w.activities).forEach(cat => allCategories.add(cat))
        })
        const categories = Array.from(allCategories)
        // Transform data for recharts stacked bar
        const chartData = activityBreakdown.breakdown.map(w => ({
          name: w.weekLabel,
          ...w.activities,
        }))

        return (
          <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Histograma de Actividades por Semana</h4>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} formatter={(value) => <span className="text-foreground">{CATEGORY_LABELS[value] || value}</span>} />
                  {categories.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      name={cat}
                      stackId="activities"
                      fill={CATEGORY_COLORS[cat] || "#9E9E9E"}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Curva S (full width) */}
      {sCurveData && sCurveData.real.length > 0 && (() => {
        // Merge real + theoretical into a single dataset
        const maxWeek = Math.max(
          ...sCurveData.real.map(p => p.weekNumber),
          ...(sCurveData.theoretical?.map(p => p.weekNumber) || [0]),
        )
        const chartData = []
        for (let w = 1; w <= maxWeek; w++) {
          const realPt = sCurveData.real.find(p => p.weekNumber === w)
          const theoPt = sCurveData.theoretical?.find(p => p.weekNumber === w)
          chartData.push({
            week: `Sem ${w}`,
            real: realPt?.cumulativeProgress ?? null,
            theoretical: theoPt?.cumulativeProgress ?? null,
          })
        }

        return (
          <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Curva S de Avance</h4>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => `${v}%`}
                    className="text-muted-foreground"
                    stroke="currentColor"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} formatter={(value) => <span className="text-foreground">{value === "real" ? "Avance Real" : "Avance Teórico"}</span>} />
                  <Line
                    type="monotone"
                    dataKey="real"
                    name="real"
                    stroke="#d68f2d"
                    strokeWidth={2.5}
                    dot={{ fill: "#d68f2d", strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  {sCurveData.theoretical && (
                    <Line
                      type="monotone"
                      dataKey="theoretical"
                      name="theoretical"
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ fill: "#EF4444", strokeWidth: 1, r: 2 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Grid de 4 cuadrantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuadrante 1: Avance por Actividad */}
        {activityChartData.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Avance por Actividad</h4>
            </div>
            {/* Alto proporcional: el alcance ahora puede traer hasta 16
                categorías, y con alto fijo las barras se aplastan. */}
            <div style={{ height: Math.max(192, activityChartData.length * 26 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activityChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 70, bottom: 5 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 9 }}
                    tickFormatter={(value) => `${value}%`}
                    stroke="currentColor"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Avance"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="progress" fill="#d68f2d" radius={[0, 0, 0, 0]}>
                    <LabelList
                      dataKey="progress"
                      position="right"
                      formatter={(value: number) => `${value}%`}
                      fill="#d68f2d"
                      fontSize={9}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cuadrante 2: Histograma de Personal */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Histograma de Personal</h4>
          </div>
          <div className="h-48 md:h-56">
            {personnelData.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personnelData.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} formatter={(value) => <span className="text-foreground">{value}</span>} />
                  <Bar dataKey="directos" name="Directo" stackId="personnel" fill="#d68f2d" radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="directos" position="center" fill="#23190f" fontSize={8} fontWeight={600} />
                  </Bar>
                  <Bar dataKey="indirectos" name="Indirecto" stackId="personnel" fill="#a1948b" radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="indirectos" position="center" fill="#23190f" fontSize={8} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full rounded-lg bg-muted/30 border border-dashed border-border">
                <p className="text-xs text-muted-foreground">Sin datos de personal</p>
              </div>
            )}
          </div>
        </div>

        {/* Cuadrante 3: Histograma de Maquinaria */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-medium text-foreground">Histograma de Maquinaria</h4>
          </div>
          <div className="h-48 md:h-56">
            {machineryHistory && machineryHistory.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineryHistory.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value, "Equipos"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" name="Maquinaria" fill="#059669" radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="count" position="center" fill="#FFFFFF" fontSize={8} fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full rounded-lg bg-muted/30 border border-dashed border-border">
                <div className="text-center">
                  <Truck className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sin datos de maquinaria</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cuadrante 4: Maquinaria (lista) */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Maquinarias en el Proyecto</h4>
            </div>
            <span className="text-xs text-muted-foreground">
              {machineryData?.machines.length || 0} {(machineryData?.machines.length || 0) === 1 ? "máquina" : "máquinas"}
            </span>
          </div>
          {machineryData && machineryData.machines.length > 0 ? (
            <div className="space-y-2 max-h-48 md:max-h-56 overflow-y-auto pr-1">
              {machineryData.machines.map((machine) => (
                <div key={machine.id} className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border">
                  <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                    <Truck className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{machine.tipo} - {machine.marca}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{machine.modelo} • {machine.patente ?? machine.numeroChasis ?? machine.codigoInterno}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 md:h-56 rounded-lg bg-muted/30 border border-dashed border-border">
              <div className="text-center">
                <Truck className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sin maquinaria</p>
              </div>
            </div>
          )}
        </div>

        {/* Cuadrante 4: Horas Suspendidas */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Horas Suspendidas por Día</h4>
          </div>
          {suspendedHoursData && suspendedHoursData.history.length > 0 ? (
            <div className="h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={suspendedHoursData.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} hs`, "Suspendidas"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 md:h-56 rounded-lg bg-muted/30 border border-dashed border-border">
              <p className="text-xs text-muted-foreground">Sin datos</p>
            </div>
          )}
        </div>
      </div>

    </Card>
  )
}
