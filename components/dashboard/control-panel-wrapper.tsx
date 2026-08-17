"use client"

import { ControlPanel } from "./control-panel"
import type {
  DashboardSummary,
  ProjectProgress,
  ProjectPersonnelHistory,
  ProjectSuspendedHours,
  ProjectMachinery,
} from "@/lib/types"

interface ControlPanelWrapperProps {
  initialDashboardData?: {
    summary: DashboardSummary | null;
    projectsProgress: ProjectProgress[];
    personnelHistory: ProjectPersonnelHistory[];
    suspendedHours: ProjectSuspendedHours[];
    machinery: ProjectMachinery[];
  }
}

/**
 * Wrapper del ControlPanel que puede recibir datos del servidor
 * Mantiene compatibilidad con la carga del cliente si no hay datos iniciales
 */
export function ControlPanelWrapper({ initialDashboardData }: ControlPanelWrapperProps) {
  // Por ahora, simplemente renderizamos el ControlPanel
  // Los datos iniciales están disponibles a través del AppContext
  // que fue inicializado con datos del servidor en el layout
  return <ControlPanel />
}

