"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Loader2, FolderPlus } from "lucide-react"
import { projectsService } from "@/lib/api"
import type { Project } from "@/lib/types"

interface FirstProjectModalProps {
  onProjectCreated: (project: Project) => void
}

export function FirstProjectModal({ onProjectCreated }: FirstProjectModalProps) {
  const [projectName, setProjectName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toasts, success, error: showError, removeToast } = useToast()

  const handleCreate = async () => {
    if (!projectName.trim()) {
      showError("Error", "El nombre del proyecto es requerido")
      return
    }

    setIsCreating(true)
    try {
      const project = await projectsService.create({
        name: projectName.trim(),
      })
      
      success("Proyecto creado", "Tu primer proyecto está listo")
      onProjectCreated(project)
    } catch (err: any) {
      console.error("Error creating project:", err)
      
      // Extraer mensaje de error detallado
      let errorMessage = "No se pudo crear el proyecto. Intenta nuevamente."
      
      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      showError("Error", errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && projectName.trim() && !isCreating) {
      handleCreate()
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border w-full max-w-md">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Crear Primer Proyecto</h2>
                <p className="text-xs text-muted-foreground">Necesitas al menos un proyecto para comenzar</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium">
                Nombre del proyecto
              </Label>
              <Input
                id="project-name"
                placeholder="Ej: Instalación Solar Fase 1"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-input border-border text-foreground"
                autoFocus
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!projectName.trim() || isCreating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Proyecto"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

