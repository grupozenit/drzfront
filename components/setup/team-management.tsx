"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Loader2, UserPlus, Users, Shield } from "lucide-react"
import { organizationService, type OrganizationMember } from "@/lib/api"

export function TeamManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"org:member" | "org:admin">("org:member")
  const [showRoleOptions, setShowRoleOptions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { toasts, success, error: showError, removeToast } = useToast()
  const { organization, membership } = useOrganization()
  
  // Verificar si el usuario actual es admin
  const isAdmin = membership?.role === "org:admin"

  // Cargar miembros de la organización desde Clerk
  const loadMembers = async () => {
    setIsLoading(true)
    try {
      const data = await organizationService.getMembers()
      setMembers(data)
    } catch (err) {
      showError("Error", "No se pudieron cargar los miembros")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showError("Error", "El correo electrónico es requerido")
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      showError("Error", "Ingresa un correo electrónico válido")
      return
    }

    // Verificar si el email ya existe
    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      showError("Error", "Este correo ya está registrado en la organización")
      return
    }

    if (!organization) {
      showError("Error", "No se pudo obtener la organización")
      return
    }

    setIsSaving(true)
    try {
      // Usar el SDK de Clerk directamente para enviar la invitación
      await organization.inviteMember({
        emailAddress: inviteEmail,
        role: inviteRole,
      })
      
      setInviteEmail("")
      setInviteRole("org:member")
      setShowInviteForm(false)
      success("Invitación enviada", "Se ha enviado la invitación por correo electrónico")
      
      // Recargar miembros después de un breve delay
      setTimeout(() => {
        loadMembers()
      }, 1000)
    } catch (err: any) {
      console.error("Error inviting user:", err)
      const errorMessage = err?.errors?.[0]?.message || err?.message || "No se pudo enviar la invitación"
      showError("Error", errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    "org:admin": "Administrador",
    member: "Miembro",
    "org:member": "Miembro",
    basic_member: "Miembro",
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "org:admin": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    member: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "org:member": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    basic_member: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="container px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="hidden md:block">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Gestión de Equipo</h2>
            <p className="text-muted-foreground mt-1 text-sm">{members.length} miembros de la organización</p>
          </div>
          {isAdmin ? (
            <Button
              onClick={() => setShowInviteForm(true)}
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar Miembro
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              Solo administradores pueden invitar miembros
            </div>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <Card className="p-6 bg-card border-border mb-8">
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-foreground">Invitar Miembro del Equipo</h3>
              <p className="text-xs text-muted-foreground">
                Se enviará un correo de invitación al nuevo miembro para que se una al equipo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="invite-email" className="text-xs md:text-sm font-medium text-foreground">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="miembro.equipo@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role" className="text-xs md:text-sm font-medium text-foreground">
                    Rol
                  </Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRoleOptions(!showRoleOptions)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm hover:border-primary/50 transition-colors"
                    >
                      <span>{ROLE_LABELS[inviteRole]}</span>
                      <svg className={`w-4 h-4 transition-transform ${showRoleOptions ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {showRoleOptions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                        {(["org:member", "org:admin"] as ("org:member" | "org:admin")[]).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setInviteRole(role)
                              setShowRoleOptions(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              inviteRole === role
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  onClick={handleInvite} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Invitación"
                  )}
                </Button>
                <Button 
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail("")
                    setInviteRole("org:member")
                  }} 
                  variant="outline" 
                  className="text-sm"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && members.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando equipo...</p>
            </div>
          </div>
        )}

        {/* Team List - Desktop */}
        {!isLoading && members.length > 0 && (
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nombre</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Correo Electrónico</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{member.name}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{member.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${roleColors[member.role] || roleColors["basic_member"]}`}
                          >
                            {ROLE_LABELS[member.role] || "Miembro"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Team Cards - Mobile */}
        {!isLoading && members.length > 0 && (
          <div className="md:hidden space-y-4">
            {members.map((member) => (
              <Card key={member.id} className="p-4 bg-card border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[member.role] || roleColors["basic_member"]}`}>
                    {ROLE_LABELS[member.role] || "Miembro"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && members.length === 0 && (
          <Card className="p-8 bg-card border-border">
            <div className="text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin miembros</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Invita a los miembros de tu equipo para comenzar a colaborar
              </p>
              <Button onClick={() => setShowInviteForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invitar Primer Miembro
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
