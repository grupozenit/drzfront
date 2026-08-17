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

      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

