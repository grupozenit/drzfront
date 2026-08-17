"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog } from "@/components/ui/dialog"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Loader2, AlertCircle, Upload, X, PenLine } from "lucide-react"
import { BaselineSetup } from "./baseline-setup"
import { TheoreticalCurveSetup } from "./theoretical-curve-setup"
import { useProjects } from "@/lib/hooks"
import { projectsService, organizationService, type OrganizationMember } from "@/lib/api"
import { validateImageFile } from "@/lib/utils/sanitize"
import type { Project, CreateProjectDTO } from "@/lib/types"

export function ProjectManagement() {
  const [showNewForm, setShowNewForm] = useState(false)
  const [showBaselineForm, setShowBaselineForm] = useState<{ projectId: string; projectName: string } | null>(null)
  const [showCurveForm, setShowCurveForm] = useState<{ projectId: string; projectName: string } | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([])
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [showEditMemberDropdown, setShowEditMemberDropdown] = useState(false)
  const [showPricingConfirmation, setShowPricingConfirmation] = useState(false)
  const [signatureImageFile, setSignatureImageFile] = useState<File | null>(null)
  const [signatureImagePreview, setSignatureImagePreview] = useState<string | null>(null)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  
  const [newProject, setNewProject] = useState<Partial<CreateProjectDTO>>({
    name: "",
    team: [],
    recipients: [],
  })
  const [newTeamMember, setNewTeamMember] = useState("")
  const [editTeamMember, setEditTeamMember] = useState("")
  const [newRecipient, setNewRecipient] = useState("")

  const { toasts, success, error: showError, removeToast } = useToast()
  const { projects, isLoading, loadProjects, addProject, updateProject, removeProject } = useProjects()

  // Cargar proyectos y miembros de la organización al montar
  useEffect(() => {
    loadProjects()
    loadOrgMembers()
  }, [loadProjects])

  const loadOrgMembers = async () => {
    try {
      const members = await organizationService.getMembers()
      setOrgMembers(members)
    } catch (err) {
      console.error("Error loading organization members:", err)
    }
  }

  const handleRequestCreateProject = () => {
    if (!newProject.name?.trim()) {
      showError("Error", "El nombre del proyecto es requerido")
      return
    }
    // Mostrar modal de confirmación con información de precios
    setShowPricingConfirmation(true)
  }

  const handleAddProject = async () => {
    if (!newProject.name?.trim()) {
      showError("Error", "El nombre del proyecto es requerido")
      return
    }

    setIsSaving(true)
    try {
      const project = await projectsService.create({
        name: newProject.name,
        team: newProject.team || [],
        recipients: newProject.recipients || [],
      })
      addProject(project)
      resetForm()
      success(
        "Proyecto creado exitosamente", 
        "Se añadirá a tu facturación el proporcional hasta tu próximo ciclo. Si esto fue un error, contacta a soporte: tbianco@usenuva.com"
      )
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
        team: editingProject.team,
        recipients: editingProject.recipients,
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

  const handleAddTeamMember = (memberName?: string) => {
    const nameToAdd = memberName || newTeamMember.trim()
    if (nameToAdd && !(newProject.team || []).includes(nameToAdd)) {
      setNewProject({
        ...newProject,
        team: [...(newProject.team || []), nameToAdd],
      })
      setNewTeamMember("")
      setShowMemberDropdown(false)
    }
  }

  // Filtrar miembros disponibles (no asignados aún)
  const availableMembers = orgMembers.filter(
    (member) => !(newProject.team || []).includes(member.name)
  )

  const handleRemoveTeamMember = (index: number) => {
    setNewProject({
      ...newProject,
      team: (newProject.team || []).filter((_, i) => i !== index),
    })
  }

  const handleAddRecipient = () => {
    if (newRecipient.trim()) {
      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newRecipient)) {
        showError("Error", "Ingresa un correo electrónico válido")
        return
      }
      setNewProject({
        ...newProject,
        recipients: [...(newProject.recipients || []), newRecipient],
      })
      setNewRecipient("")
    }
  }

  const handleRemoveRecipient = (index: number) => {
    setNewProject({
      ...newProject,
      recipients: (newProject.recipients || []).filter((_, i) => i !== index),
    })
  }

  // Para edición
  const handleEditAddTeamMember = (member: string) => {
    if (editingProject && member.trim()) {
      setEditingProject({
        ...editingProject,
        team: [...editingProject.team, member],
      })
    }
  }

  const handleEditRemoveTeamMember = (index: number) => {
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        team: editingProject.team.filter((_, i) => i !== index),
      })
    }
  }

  const handleEditAddRecipient = (email: string) => {
    if (editingProject && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        showError("Error", "Ingresa un correo electrónico válido")
        return
      }
      setEditingProject({
        ...editingProject,
        recipients: [...editingProject.recipients, email],
      })
    }
  }

  const handleEditRemoveRecipient = (index: number) => {
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        recipients: editingProject.recipients.filter((_, i) => i !== index),
      })
    }
  }

  const resetForm = () => {
    setNewProject({
      name: "",
      team: [],
      recipients: [],
    })
    setNewTeamMember("")
    setNewRecipient("")
    setShowNewForm(false)
    setSignatureImageFile(null)
    setSignatureImagePreview(null)
  }

  if (showBaselineForm) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <BaselineSetup
          projectId={showBaselineForm.projectId}
          projectName={showBaselineForm.projectName}
          onBack={() => setShowBaselineForm(null)}
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
      
      {/* Modal de Confirmación de Costos */}
      <Dialog
        isOpen={showPricingConfirmation}
        onClose={() => setShowPricingConfirmation(false)}
        onConfirm={handleAddProject}
        title="⚠️ Confirmar Creación de Proyecto"
        confirmText="Sí, crear proyecto"
        cancelText="Cancelar"
        type="confirm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">
                Crear un proyecto tiene un costo asociado
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Precio:</strong> $210.000 CLP + IVA por mes, durante los meses que el proyecto esté activo.
              </p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">💳 Facturación:</strong> El primer cargo se ajustará proporcionalmente según los días restantes hasta tu próxima facturación.
            </p>
          </div>
          
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              Al confirmar, aceptas que se añadirá el cargo prorrateado a tu próxima facturación.
            </p>
          </div>
        </div>
      </Dialog>
      
      <div className="container px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Proyectos</h2>
            <p className="text-muted-foreground mt-1 text-sm">{projects.length} proyectos activos</p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
          >
            + Nuevo Proyecto
          </Button>
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

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-medium text-foreground">Usuarios Asignados</Label>
                <p className="text-xs text-muted-foreground">Selecciona usuarios de tu organización</p>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Buscar usuario..."
                        value={newTeamMember}
                        onChange={(e) => {
                          setNewTeamMember(e.target.value)
                          setShowMemberDropdown(true)
                        }}
                        onFocus={() => setShowMemberDropdown(true)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTeamMember())}
                        className="bg-input border-border text-foreground text-sm"
                      />
                      {showMemberDropdown && availableMembers.length > 0 && newTeamMember.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {availableMembers
                            .filter((member) =>
                              member.name.toLowerCase().includes(newTeamMember.toLowerCase()) ||
                              member.email.toLowerCase().includes(newTeamMember.toLowerCase())
                            )
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handleAddTeamMember(member.name)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-foreground">{member.name}</div>
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleAddTeamMember()}
                      variant="outline"
                      className="text-sm whitespace-nowrap"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
                {newProject.team && newProject.team.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newProject.team.map((member, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs flex items-center gap-2"
                      >
                        {member}
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(i)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-medium text-foreground">
                  Destinatarios de Reportes (Correos)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRecipient())}
                    className="bg-input border-border text-foreground text-sm"
                  />
                  <Button
                    type="button"
                    onClick={handleAddRecipient}
                    variant="outline"
                    className="text-sm whitespace-nowrap"
                  >
                    Agregar
                  </Button>
                </div>
                {newProject.recipients && newProject.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newProject.recipients.map((email, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-2"
                      >
                        {email}
                        <button type="button" onClick={() => handleRemoveRecipient(i)} className="hover:text-destructive">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleRequestCreateProject}
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

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-medium text-foreground">Usuarios Asignados</Label>
                <p className="text-xs text-muted-foreground">Selecciona usuarios de tu organización</p>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Buscar usuario..."
                        value={editTeamMember}
                        onChange={(e) => {
                          setEditTeamMember(e.target.value)
                          setShowEditMemberDropdown(true)
                        }}
                        onFocus={() => setShowEditMemberDropdown(true)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleEditAddTeamMember(editTeamMember)
                          }
                        }}
                        className="bg-input border-border text-foreground text-sm"
                      />
                      {showEditMemberDropdown && availableMembers.length > 0 && editTeamMember.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {availableMembers
                            .filter((member) =>
                              !editingProject.team.includes(member.name) &&
                              (member.name.toLowerCase().includes(editTeamMember.toLowerCase()) ||
                              member.email.toLowerCase().includes(editTeamMember.toLowerCase()))
                            )
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  handleEditAddTeamMember(member.name)
                                  setEditTeamMember("")
                                  setShowEditMemberDropdown(false)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-foreground">{member.name}</div>
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        handleEditAddTeamMember(editTeamMember)
                        setEditTeamMember("")
                      }}
                      variant="outline"
                      className="text-sm whitespace-nowrap"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
                {editingProject.team.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingProject.team.map((member, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs flex items-center gap-2"
                      >
                        {member}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveTeamMember(i)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm font-medium text-foreground">
                  Destinatarios de Reportes (Correos)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="edit-recipient"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        handleEditAddRecipient(input.value)
                        input.value = ""
                      }
                    }}
                    className="bg-input border-border text-foreground text-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("edit-recipient") as HTMLInputElement
                      handleEditAddRecipient(input.value)
                      input.value = ""
                    }}
                    variant="outline"
                    className="text-sm whitespace-nowrap"
                  >
                    Agregar
                  </Button>
                </div>
                {editingProject.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingProject.recipients.map((email, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-2"
                      >
                        {email}
                        <button type="button" onClick={() => handleEditRemoveRecipient(i)} className="hover:text-destructive">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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

              <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">¿Creaste este proyecto por error?</strong> Para revertir esta acción, contacta a soporte en{" "}
                  <a
                    href="mailto:tbianco@usenuva.com"
                    className="text-primary hover:underline font-medium"
                  >
                    tbianco@usenuva.com
                  </a>
                </p>
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
            {projects.map((project) => (
              <Card key={project.id} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                      {project.hasBaseline && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Línea base configurada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setShowBaselineForm({ projectId: project.id, projectName: project.name })}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#0049CA] text-[#0049CA] bg-white hover:bg-[#0049CA] hover:text-white transition-colors dark:bg-transparent dark:border-[#0049CA] dark:text-[#4D8AFF] dark:hover:bg-[#0049CA] dark:hover:text-white"
                      >
                        Linea Base
                      </button>
                      <button
                        onClick={() => setShowCurveForm({ projectId: project.id, projectName: project.name })}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#0049CA] text-[#0049CA] bg-white hover:bg-[#0049CA] hover:text-white transition-colors dark:bg-transparent dark:border-[#0049CA] dark:text-[#4D8AFF] dark:hover:bg-[#0049CA] dark:hover:text-white"
                      >
                        Curva S
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Usuarios Asignados ({project.team.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {project.team.length > 0 ? (
                        project.team.map((member, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                            {member}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin usuarios asignados</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Destinatarios de Reportes ({project.recipients.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.recipients.length > 0 ? (
                        project.recipients.map((email, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {email}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin destinatarios configurados</span>
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
              <Button onClick={() => setShowNewForm(true)}>
                Crear Primer Proyecto
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
