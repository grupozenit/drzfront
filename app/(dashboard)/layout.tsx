"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { DashboardClientLayout } from "@/components/layout/dashboard-client-layout"
import { OfflineIndicator } from "@/components/offline/OfflineIndicator"
import { useApp, usePermissions } from "@/lib/contexts/AppContext"
import { checkRouteAccess } from "@/lib/permissions/route-access"
import { Loader2, ShieldAlert } from "lucide-react"

/**
 * Layout del dashboard - Protegido y verificado con organización y proyecto
 * Redirige a / si falta organización o proyecto, o a /sign-in si no está autenticado.
 * Cuando el dispositivo está offline y Clerk no responde, renderiza la app
 * directamente usando la sesión cacheada (necesario para modo offline PWA).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, userId, orgId } = useAuth()
  const { isOnboardingComplete, isLoading } = useApp()
  const { permissions, isLoading: isLoadingPermissions, role, can, landing } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !navigator.onLine : false
  )
  // Cuando offline y Clerk no carga en 2s, bypassear la verificación de auth
  const [clerkTimedOut, setClerkTimedOut] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOffline && !isLoaded) {
      const timer = setTimeout(() => setClerkTimedOut(true), 2000)
      return () => clearTimeout(timer)
    }
    // Si se reconecta o Clerk cargó, cancelar el bypass
    if (isLoaded || !isOffline) {
      setClerkTimedOut(false)
    }
  }, [isOffline, isLoaded])

  useEffect(() => {
    // Sólo ejecutar redirecciones cuando hay conexión y Clerk está listo
    if (!isLoaded || isLoading || isOffline) return

    if (!userId) {
      router.push("/sign-in")
      return
    }

    if (!orgId || !isOnboardingComplete) {
      router.push("/")
    }
  }, [isLoaded, userId, orgId, isOnboardingComplete, isLoading, router, isOffline])

  // Redirección por permisos: una vez que sabemos el rol, si la ruta actual
  // no le corresponde lo mandamos a su landing (ej. Compras pidiendo /reporte
  // por URL directa). "sin_rol" no redirige: se queda en la pantalla de abajo.
  useEffect(() => {
    if (!isLoaded || isLoading || isOffline || isLoadingPermissions || !permissions) return
    if (role === "sin_rol") return
    if (!checkRouteAccess(pathname ?? "", can)) {
      router.push(landing)
    }
  }, [isLoaded, isLoading, isOffline, isLoadingPermissions, permissions, role, pathname, can, landing, router])

  // En modo offline con timeout, mostrar la app directamente con la sesión cacheada
  const offlineBypass = isOffline && clerkTimedOut

  if (!offlineBypass && (!isLoaded || isLoading || !userId || !orgId || !isOnboardingComplete || isLoadingPermissions || !permissions)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {isOffline ? "Sin conexión. Cargando sesión…" : "Verificando acceso…"}
          </p>
        </div>
      </div>
    )
  }

  if (!offlineBypass && role === "sin_rol") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Cuenta pendiente de asignación</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta todavía no tiene un rol asignado. Pedile a un administrador de Tecnología
            que te asigne uno desde Configuración → Equipo para poder acceder al sistema.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardClientLayout>
        {children}
      </DashboardClientLayout>
      <OfflineIndicator />
    </>
  )
}

