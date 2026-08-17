"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, Settings, LogOut, ClipboardCheck, Wrench, CalendarCheck } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useClerk } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ReportIcon } from "@/components/icons/report-icon"
import { ProgressIcon } from "@/components/icons/progress-icon"
import { DashboardControlIcon } from "@/components/icons/dashboard-control-icon"
import { MachineryIcon } from "@/components/icons/machinery-icon"
import { ThemeToggle } from "./theme-toggle"
import { UserIcon } from "@/components/icons/user-icon"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// Componente auxiliar para mostrar información del usuario
function UserInfo() {
  const { user } = useUser()
  
  if (!user) return null
  
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-sm font-medium text-sidebar-foreground truncate">
        {user.fullName || user.primaryEmailAddress?.emailAddress}
      </span>
      <span className="text-xs text-muted-foreground truncate">
        {user.primaryEmailAddress?.emailAddress}
      </span>
    </div>
  )
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  
  const navItems = [
    { href: "/tablero", label: "Tablero de Control", icon: DashboardControlIcon },
    { href: "/avances", label: "Avances de Obra", icon: ProgressIcon },
    { href: "/reporte", label: "Reportes Diarios", icon: ReportIcon },
    { href: "/reporte-semanal", label: "Reportes Semanales", icon: CalendarCheck },
    { href: "/maquinaria", label: "Maquinaria", icon: MachineryIcon },
    { href: "/equipos", label: "Equipos", icon: Wrench },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ] as const

  const isActive = (href: string) => {
    if (href === "/configuracion") {
      return pathname?.startsWith("/configuracion")
    }
    if (href === "/reporte-semanal") {
      return pathname?.startsWith("/reporte-semanal")
    }
    return pathname === href
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onToggle} />}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-[100dvh] md:h-screen bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300 ${
          isOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"
        }`}
        style={{ height: 'var(--viewport-height, 100vh)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-3 md:p-4 border-b border-sidebar-border flex-shrink-0">
            <div className={`flex items-center ${isOpen ? "justify-start" : "justify-center"}`}>
              {isOpen ? (
                <div className="relative w-full h-[36px] md:h-[40px]">
                  <Image
                    src="/logo/nuva-logo-horizontal.png"
                    alt="Nuva Logo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              ) : (
                <div className="relative w-[36px] h-[36px] md:w-[40px] md:h-[40px]">
                  <Image
                    src="/logo/nuva-logo-square.png"
                    alt="Nuva Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Items - Con scroll en móvil */}
          <nav className={`flex-1 p-2 space-y-1 flex flex-col overflow-y-auto ${!isOpen && "md:items-center"}`}>
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 md:py-2.5 transition-colors text-left font-medium text-sm rounded-lg ${
                    isOpen ? "w-full justify-start" : "justify-center md:w-auto"
                  } ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-primary/10"
                  }`}
                  title={!isOpen ? item.label : ""}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Footer - User, Theme Toggle and Collapse Button */}
          <div className={`p-2 border-t border-sidebar-border flex flex-col gap-1.5 md:gap-2 flex-shrink-0 ${!isOpen ? "items-center" : ""}`}>
            {/* User Authentication Section */}
            <SignedIn>
              <div className={`flex items-center gap-2 ${isOpen ? "w-full px-2" : "justify-center"}`}>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 md:w-9 md:h-9",
                      userButtonPopoverCard: "bg-card border-border",
                      userButtonPopoverActionButton: "hover:bg-accent",
                      userButtonPopoverActionButtonText: "text-foreground",
                      userButtonPopoverFooter: "hidden",
                    },
                  }}
                  userProfileMode="modal"
                  afterSignOutUrl="/"
                />
                {isOpen && (
                  <div className="flex-1 min-w-0">
                    <UserInfo />
                  </div>
                )}
              </div>
            </SignedIn>

            <SignedOut>
              <div className={`${isOpen ? "w-full" : ""}`}>
                <SignInButton mode="modal">
              <button
                    className={`flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary/10 transition-colors text-sm font-medium ${
                      isOpen ? "w-full justify-start" : "justify-center"
                }`}
                    title={!isOpen ? "Iniciar sesión" : ""}
              >
                <UserIcon className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="truncate">Iniciar sesión</span>}
              </button>
                </SignInButton>
            </div>
            </SignedOut>

            {/* Theme Toggle */}
            <ThemeToggle isOpen={isOpen} />

            {/* Collapse Button (desktop only) */}
            <button
              onClick={onToggle}
              className={`hidden md:flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary/10 transition-colors text-sm ${
                isOpen ? "w-full justify-start" : "justify-center md:w-auto"
              }`}
            >
              <ChevronLeft className={`w-5 h-5 flex-shrink-0 transition-transform ${!isOpen ? "rotate-180" : ""}`} />
              {isOpen && <span className="truncate text-sidebar-foreground font-medium">Contraer</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
