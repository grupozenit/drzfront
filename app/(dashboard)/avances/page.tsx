import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

/**
 * Página de Avances de Obra - Server Component
 */
export default async function AvancesPage() {
  // Los datos ya están cargados en el AppContext desde el layout raíz
  // El componente los usará del contexto
  return <DashboardOverview />
}

