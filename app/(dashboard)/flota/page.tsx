import { FleetDashboardWrapper } from "@/components/fleet/fleet-dashboard-wrapper"
import { getServerFleetDashboard } from "@/lib/api/server"

/**
 * Página del Tablero de Flota - Server Component
 * Carga datos iniciales del servidor para mejor rendimiento
 */
export default async function FlotaPage() {
  const fleet = await getServerFleetDashboard().catch(() => null)

  return <FleetDashboardWrapper initialData={fleet} />
}
