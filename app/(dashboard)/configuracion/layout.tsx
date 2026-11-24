"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { usePermissions } from "@/lib/hooks"

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { can } = usePermissions()

  // Cada pestaña solo para quien puede abrirla (mismo criterio que
  // checkRouteAccess): Equipo es solo de Tecnología (`usuarios`); Proyectos,
  // de Tecnología, Gerente de Proyecto y Jefe de Obra (`proyectos`).
  const tabs = [
    { id: "proyectos", label: "Proyectos", href: "/configuracion/proyectos", visible: can("proyectos", "read") },
    { id: "equipo", label: "Equipo", href: "/configuracion/equipo", visible: can("usuarios", "read") },
  ].filter((tab) => tab.visible)

  return (
    <div className="min-h-screen">
      {/* Setup Navigation */}
      <nav className="border-b border-border bg-background sticky top-0 z-20">
        <div className="container px-4 md:px-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  pathname === tab.href
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {children}
    </div>
  )
}

