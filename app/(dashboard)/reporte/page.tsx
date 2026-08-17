import { ReportHistory } from "@/components/dashboard/report-history"

/**
 * Página de Historial de Reportes - Server Component
 */
export default async function ReportePage() {
  // Los datos ya están cargados en el AppContext desde el layout raíz
  // El componente los usará del contexto
  return <ReportHistory />
}

