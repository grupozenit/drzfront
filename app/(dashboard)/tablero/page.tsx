import { ControlPanelWrapper } from "@/components/dashboard/control-panel-wrapper"
import {
  getServerDashboardSummary,
  getServerAllProjectsProgress,
  getServerAllPersonnelHistory,
  getServerAllSuspendedHours,
  getServerAllProjectsMachinery,
} from "@/lib/api/server"

/**
 * Página del Tablero de Control - Server Component
 * Carga datos iniciales del servidor para mejor rendimiento
 */
export default async function TableroPage() {
  // Cargar datos del dashboard en paralelo desde el servidor
  const [
    summary,
    projectsProgress,
    personnelHistory,
    suspendedHours,
    machinery,
  ] = await Promise.all([
    getServerDashboardSummary().catch(() => null),
    getServerAllProjectsProgress().catch(() => []),
    getServerAllPersonnelHistory().catch(() => []),
    getServerAllSuspendedHours().catch(() => []),
    getServerAllProjectsMachinery().catch(() => []),
  ])

  return (
    <ControlPanelWrapper
      initialDashboardData={{
        summary,
        projectsProgress,
        personnelHistory,
        suspendedHours,
        machinery,
      }}
    />
  )
}
