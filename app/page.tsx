"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { FirstProjectModal } from "@/components/modals/first-project-modal"
import { useApp, usePermissions } from "@/lib/contexts/AppContext"
import { Loader2, Building2 } from "lucide-react"

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const { isLoaded: isClerkLoaded, userId, orgId } = useAuth()
  const { isLoaded: isOrgLoaded, membership } = useOrganization()
  const { addProject, isLoading, projects } = useApp()
  const { landing, permissions: userPermissions } = usePermissions()
  const router = useRouter()

  // Verificar si el usuario es admin de la organización
  const isAdmin = membership?.role === "org:admin"

  // "¿La empresa ya tiene al menos un proyecto?" es un hecho de la empresa,
  // no de lo que este usuario puede ver: `projects` viene acotado por el
  // alcance del rol (p. ej. sin_rol o un rol "assigned" sin asignaciones ve
  // 0 proyectos aunque la empresa ya tenga varios). Por eso se usa el campo
  // sin scopear de /me en vez de `projects.length > 0`.
  const isOnboardingComplete = userPermissions ? userPermissions.orgHasProjects : projects.length > 0

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Esperar a que todo esté cargado
    if (!isMounted || !isClerkLoaded || !isOrgLoaded) return

    // Si no está autenticado, redirigir a sign-in
    if (!userId) {
      router.push("/sign-in")
      return
    }

    // Si está autenticado y tiene al menos un proyecto, ir a la landing de su
    // rol. Esperamos a que los permisos carguen para no rebotar con el
    // default ("/tablero") antes de saber si el usuario es "sin_rol".
    if (orgId && isOnboardingComplete && userPermissions && landing !== "/") {
      router.push(landing)
    }
  }, [isMounted, isClerkLoaded, isOrgLoaded, userId, orgId, isOnboardingComplete, userPermissions, landing, router])

  // Log para debug
  useEffect(() => {
    if (isMounted && isClerkLoaded && isOrgLoaded) {
      console.log('Home Debug:', {
        userId,
        orgId,
        isAdmin,
        projectsCount: projects.length,
        isOnboardingComplete,
        isLoading
      })
    }
  }, [isMounted, isClerkLoaded, isOrgLoaded, userId, orgId, isAdmin, projects, isOnboardingComplete, isLoading])

  // Mostrar loading mientras se verifica el estado
  if (!isMounted || !isClerkLoaded || !isOrgLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (se está redirigiendo)
  if (!userId) {
    return null
  }

  // Si no tiene organización, mostrar mensaje
  if (!orgId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sin Organización</h1>
          <p className="text-muted-foreground">
            No estás asociado a ninguna organización. Por favor, contacta al administrador para que te invite a la organización de tu empresa.
          </p>
        </div>
      </div>
    )
  }

  // Si tiene proyectos y la landing no es "/" (o sea, no es sin_rol), se está
  // redirigiendo a su landing: no mostrar nada.
  if (isOnboardingComplete && (!userPermissions || landing !== "/")) {
    return null
  }

  // Tiene proyectos pero su rol es "sin_rol": no hay a dónde redirigirlo.
  if (isOnboardingComplete && userPermissions && landing === "/") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cuenta pendiente de asignación</h1>
          <p className="text-muted-foreground">
            Tu cuenta todavía no tiene un rol asignado. Pedile a un administrador de Tecnología
            que te asigne uno desde Configuración → Equipo.
          </p>
        </div>
      </div>
    )
  }

  // Si no hay proyectos pero el usuario NO es admin, mostrar mensaje
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Configuración Pendiente</h1>
          <p className="text-muted-foreground">
            El administrador de tu organización aún no ha creado ningún proyecto. 
            Por favor, espera a que complete la configuración inicial.
          </p>
        </div>
      </div>
    )
  }

  // Solo mostrar modal para crear primer proyecto si es admin
  return (
    <FirstProjectModal
      onProjectCreated={(project) => {
        addProject(project)
        router.push(landing !== "/" ? landing : "/tablero")
      }}
    />
  )
}
