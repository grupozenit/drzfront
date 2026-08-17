"use client"

import { usePathname } from "next/navigation"

interface HeaderProps {
  onMenuClick: () => void
}

const viewTitles: Record<string, string> = {
  "/tablero": "Tablero de Control",
  "/avances": "Avances de Obra",
  "/reporte": "Reportes Diarios",
  "/equipos": "Equipos y Herramientas",
  "/reporte-semanal": "Reportes Semanales",
  "/maquinaria": "Maquinaria",
  "/configuracion": "Configuración",
  "/configuracion/proyectos": "Configuración - Proyectos",
  "/configuracion/equipo": "Configuración - Equipo",
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()

  const getTitle = () => {
    return viewTitles[pathname || "/tablero"] || "Grupo Zenit - Gestión de Proyectos"
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 md:hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors text-foreground"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-bold text-foreground">{getTitle()}</h1>
      </div>
    </header>
  )
}
