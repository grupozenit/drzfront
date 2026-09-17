"use client"

import { useState, type ReactNode } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface DashboardClientLayoutProps {
  children: ReactNode
}

/**
 * Layout del cliente para el dashboard
 * Maneja el estado de la sidebar y la interactividad
 */
export function DashboardClientLayout({ children }: DashboardClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* min-w-0: sin esto un ítem flex no se achica por debajo del ancho de su
          contenido, y una tabla ancha (Maquinaria, Choferes, Equipos) estira
          toda la columna fuera de la pantalla en vez de usar su propio scroll
          horizontal. */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

