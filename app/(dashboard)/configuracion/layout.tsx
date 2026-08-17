"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const tabs = [
    { id: "proyectos", label: "Proyectos", href: "/configuracion/proyectos" },
    { id: "equipo", label: "Equipo", href: "/configuracion/equipo" },
  ]

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

