import { MachineryManagement } from "@/components/machinery/machinery-management"

/**
 * Página de Gestión de Maquinaria - Server Component
 */
export default async function MaquinariaPage() {
  // Los datos ya están cargados en el AppContext desde el layout raíz
  // El componente los usará del contexto
  return <MachineryManagement />
}

