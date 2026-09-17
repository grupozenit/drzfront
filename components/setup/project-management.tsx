"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Loader2, Upload, X, PenLine } from "lucide-react"
import { TotalsSetup } from "./totals-setup"
import { TheoreticalCurveSetup } from "./theoretical-curve-setup"
import { useProjects, usePermissions } from "@/lib/hooks"
import { projectsService } from "@/lib/api"
import { validateImageFile } from "@/lib/utils/sanitize"
import type { Project, CreateProjectDTO } from "@/lib/types"

export function ProjectManagement() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [showTotalsForm, setShowTotalsForm] = useState<{ projectId: string; projectName: string } | null>(null)
  const [showCurveForm, setShowCurveForm] = useState<{ projectId: string; projectName: string } | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null)
  const [signatureImagePreview, setSignatureImagePreview] = useState<string | null>(null)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  
  // Un proyecto se crea solo con su nombre. La asignacion de personas vive en
  // Configuracion -> Equipo (user_project_assignments), que es lo que consume
  // el alcance por proyecto de los roles; y el envio de reportes por correo
  // esta desactivado, asi que no hay destinatarios que declarar.
  const [newProject, setNewProject] = useState<Partial<CreateProjectDTO>>({
    name: "",
  })

  const { toasts, success, error: showError, removeToast } = useToast()
  const { projects, isLoading, loadProjects, addProject, updateProject, removeProject } = useProjects()
  // Orden alfabético por nombre (sin distinguir mayúsculas ni acentos, y con
  // números en orden natural: "Parque 2" antes que "Parque 10").
  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base", numeric: true }),
      ),
    [projects],
  )
  const { can } = usePermissions()
  const canWrite = can("proyectos", "create")
  // Totales y Curva S son las dos piezas del onboarding del proyecto: las
  // carga Tecnología, no quien reporta el avance.
  const canWriteTotals = can("totales", "update")

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleAddProject = async () => {
    if (!newProject.name?.trim()) {
      showError("Error", "El nombre del proyecto es requerido")
      return
    }

    setIsSaving(true)
    try {
      const project = await projectsService.create({
        name: newProject.name,
      })
      addProject(project)
      resetForm()
      success("Proyecto creado exitosamente")
    } catch (err) {
      showError("Error", "No se pudo crear el proyecto")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return

    setIsSaving(true)
    try {
      let updated = await projectsService.update(editingProject.id, {
        name: editingProject.name,
        signatureName: editingProject.signatureName || undefined,
        signaturePosition: editingProject.signaturePosition || undefined,
      })
      
      // Subir imagen de firma si hay una nueva seleccionada
      if (signatureImageFile) {
        setIsUploadingSignature(true)
        updated = await projectsService.uploadSignatureImage(editingProject.id, signatureImageFile)
        setSignatureImageFile(null)
        setSignatureImagePreview(null)
      }
      
      updateProject(editingProject.id, updated)
      setEditingProject(null)
      success("Proyecto actualizado", "Los cambios se han guardado correctamente")
    } catch (err) {
      showError("Error", "No se pudo actualizar el proyecto")
    } finally {
      setIsSaving(false)
      setIsUploadingSignature(false)
    }
  }

  const handleSignatureImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      showError("Archivo inválido", validation.error || "Formato no permitido")
      return
    }
    setSignatureImageFile(file)
    setSignatureImagePreview(URL.createObjectURL(file))
  }

  const handleDeleteSignatureImage = async () => {
    if (!editingProject) return
    try {
      const updated = await projectsService.deleteSignatureImage(editingProject.id)
      setEditingProject({ ...editingProject, signatureImage: undefined })
      updateProject(editingProject.id, updated)
      setSignatureImageFile(null)
      setSignatureImagePreview(null)
      success("Firma eliminada", "La imagen de firma fue removida")
    } catch {
      showError("Error", "No se pudo eliminar la imagen de firma")
    }
  }

  const resetForm = () => {
    setNewProject({
      name: "",
    })
    setShowNewForm(false)
    setSignatureImageFile(null)
    setSignatureImagePreview(null)
  }

  if (showTotalsForm) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <TotalsSetup
          projectId={showTotalsForm.projectId}
          projectName={showTotalsForm.projectName}
          onBack={() => setShowTotalsForm(null)}
        />
      </>
    )
  }

  if (showCurveForm) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <TheoreticalCurveSetup
          projectId={showCurveForm.projectId}
          projectName={showCurveForm.projectName}
          onBack={() => setShowCurveForm(null)}
        />
      </>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="container px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Proyectos</h2>
            <p className="text-muted-foreground mt-1 text-sm">{projects.length} proyectos activos</p>
          </div>
          {canWrite && (
            <Button
              onClick={() => setShowNewForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              + Nuevo Proyecto
            </Button>
          )}
        </div>

        {/* New Project Form */}
        {showNewForm && (
          <Card className="p-6 md:p-8 bg-card border-border mb-8">
            <div className="space-y-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground">Crear Nuevo Proyecto</h3>

              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-xs md:text-sm font-medium text-foreground">
                  Nombre del Proyecto
                </Label>
                <Input
                  id="project-name"
                  placeholder="Ej: Instalación Solar - Fase 2"
                  value={newProject.name || ""}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleAddProject}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Proyecto"
                  )}
                </Button>
                <Button onClick={resetForm} variant="outline" className="text-sm" disabled={isSaving}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Project Form */}
        {editingProject && (
          <Card className="p-6 md:p-8 bg-card border-border mb-8">
            <div className="space-y-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground">Editar Proyecto</h3>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-medium text-foreground">
                  Nombre del Proyecto
                </Label>
                <Input
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>

              {/* Firma de Responsable */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-primary" />
                  <Label className="text-xs md:text-sm font-semibold text-foreground">Firma de Responsable</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Aparecerá al pie de los reportes PDF generados para este proyecto.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Nombre del Responsable</Label>
                    <Input
                      placeholder="Ej: Juan García"
                      value={editingProject.signatureName || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, signatureName: e.target.value })}
                      className="bg-input border-border text-foreground text-sm"
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Cargo</Label>
                    <Input
                      placeholder="Ej: Jefe de Obra"
                      value={editingProject.signaturePosition || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, signaturePosition: e.target.value })}
                      className="bg-input border-border text-foreground text-sm"
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Imagen de Firma</Label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="w-32 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                      {signatureImagePreview ? (
                        <img src={signatureImagePreview} alt="Vista previa de firma" className="w-full h-full object-contain" />
                      ) : editingProject.signatureImage ? (
                        <img
                          src={
                            editingProject.signatureImage.startsWith('http')
                              ? editingProject.signatureImage
                              : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${editingProject.signatureImage}`
                          }
                          alt="Firma actual"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <PenLine className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground"
                      >
                        <Upload className="w-3 h-3" />
                        {editingProject.signatureImage || signatureImagePreview ? "Cambiar imagen" : "Subir imagen"}
                      </button>
                      {(editingProject.signatureImage || signatureImagePreview) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (signatureImagePreview) {
                              setSignatureImageFile(null)
                              setSignatureImagePreview(null)
                            } else {
                              handleDeleteSignatureImage()
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-background hover:bg-destructive/5 transition-colors text-destructive"
                        >
                          <X className="w-3 h-3" />
                          Eliminar
                        </button>
                      )}
                      <input
                        ref={signatureInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                        onChange={handleSignatureImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG, HEIC o WebP. Máximo 5 MB.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleUpdateProject}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isUploadingSignature ? "Subiendo firma..." : "Guardando..."}
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
                <Button onClick={() => { setEditingProject(null); setSignatureImageFile(null); setSignatureImagePreview(null) }} variant="outline" className="text-sm" disabled={isSaving}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && projects.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando proyectos...</p>
            </div>
          </div>
        )}

        {/* Projects List */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
            {sortedProjects.map((project) => (
              <Card key={project.id} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                      {project.hasBaseline && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Totales configurados
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {canWrite && (
                        <button
                          onClick={() => setEditingProject(project)}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          Editar
                        </button>
                      )}
                      {canWriteTotals && (
                        <button
                          onClick={() => setShowTotalsForm({ projectId: project.id, projectName: project.name })}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#d68f2d] text-[#d68f2d] bg-white hover:bg-[#d68f2d] hover:text-[#23190f] transition-colors dark:bg-transparent dark:border-[#d68f2d] dark:text-[#e8a94f] dark:hover:bg-[#d68f2d] dark:hover:text-[#23190f]"
                        >
                          Totales
                        </button>
                      )}
                      {canWriteTotals && (
                        <button
                          onClick={() => setShowCurveForm({ projectId: project.id, projectName: project.name })}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#d68f2d] text-[#d68f2d] bg-white hover:bg-[#d68f2d] hover:text-[#23190f] transition-colors dark:bg-transparent dark:border-[#d68f2d] dark:text-[#e8a94f] dark:hover:bg-[#d68f2d] dark:hover:text-[#23190f]"
                        >
                          Curva S
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin proyectos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer proyecto para comenzar a gestionar reportes
              </p>
              {canWrite && (
                <Button onClick={() => setShowNewForm(true)}>
                  Crear Primer Proyecto
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
