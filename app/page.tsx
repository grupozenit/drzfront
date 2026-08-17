"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { FirstProjectModal } from "@/components/modals/first-project-modal"
import { useApp } from "@/lib/contexts/AppContext"
import { Loader2, Building2 } from "lucide-react"

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const { isLoaded: isClerkLoaded, userId, orgId } = useAuth()
  const { isLoaded: isOrgLoaded, membership } = useOrganization()
  const { isOnboardingComplete, addProject, isLoading, projects } = useApp()
  const router = useRouter()

  // Verificar si el usuario es admin de la organización
  const isAdmin = membership?.role === "org:admin"

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

    // Si está autenticado y tiene al menos un proyecto, ir al dashboard
    if (orgId && isOnboardingComplete) {
      router.push("/tablero")
    }
  }, [isMounted, isClerkLoaded, isOrgLoaded, userId, orgId, isOnboardingComplete, router])

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

  // Si tiene proyectos, no mostrar nada (se está redirigiendo)
  if (isOnboardingComplete) {
    return null
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
        router.push("/tablero")
      }}
    />
  )
}
