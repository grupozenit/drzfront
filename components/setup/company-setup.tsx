"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast, ToastContainer } from "@/components/ui/toast"
import { Loader2 } from "lucide-react"
import { useCompany } from "@/lib/hooks"
import { companyService } from "@/lib/api"
import type { Company } from "@/lib/types"

export function CompanySetup() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localCompany, setLocalCompany] = useState<Partial<Company>>({
    name: "",
    logo: "",
  })
  
  const { toasts, success, error: showError, removeToast } = useToast()
  const { company, isLoading, loadCompany, updateCompany } = useCompany()

  // Cargar datos de empresa
  useEffect(() => {
    loadCompany()
  }, [loadCompany])

  // Sincronizar estado local con datos cargados
  useEffect(() => {
    if (company) {
      setLocalCompany({
        name: company.name,
        logo: company.logo,
      })
    }
  }, [company])

  const handleChange = (field: keyof Company, value: string) => {
    setLocalCompany((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!localCompany.name?.trim()) {
      showError("Error", "El nombre de la empresa es requerido")
      return
    }

    setIsSaving(true)
    try {
      const updated = await companyService.update({
        name: localCompany.name,
      })
      updateCompany(updated)
      success("Empresa actualizada", "Los cambios se han guardado correctamente")
      setIsEditing(false)
    } catch (err) {
      showError("Error", "No se pudieron guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    try {
      const updated = await companyService.uploadLogo(file)
      updateCompany(updated)
      setLocalCompany(prev => ({ ...prev, logo: updated.logo }))
      success("Logo actualizado", "El logo se ha subido correctamente")
    } catch (err) {
      showError("Error", "No se pudo subir el logo")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (company) {
      setLocalCompany({
        name: company.name,
        logo: company.logo,
      })
    }
    setIsEditing(false)
  }

  if (isLoading && !company) {
    return (
      <div className="container px-4 md:px-6 py-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando información de empresa...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8 hidden md:block">
          <h2 className="text-lg md:text-xl font-bold text-foreground">Configuración de Empresa</h2>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona la información de tu empresa</p>
        </div>

        <Card className="p-6 md:p-8 bg-card border-border">
          <div className="space-y-6">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                Logo de Empresa <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-muted flex items-center justify-center text-2xl border border-border overflow-hidden rounded-lg">
                  {localCompany.logo ? (
                    <img 
                      src={localCompany.logo.startsWith('http') ? localCompany.logo : `http://localhost:8000${localCompany.logo}`} 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    "🏢"
                  )}
                </div>
                {isEditing && (
                  <label className="cursor-pointer">
                    <Button 
                      variant="outline" 
                      className="text-xs md:text-sm bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
                      disabled={isSaving}
                      asChild
                    >
                      <span>
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          "Subir Logo"
                        )}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isSaving}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Este logo se mostrará en los reportes diarios</p>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-xs md:text-sm font-medium text-foreground">
                Nombre de la Empresa
              </Label>
              <Input
                id="company-name"
                type="text"
                value={localCompany.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={!isEditing}
                className="bg-input border-border text-foreground disabled:opacity-70 text-sm"
                placeholder="Ingresa el nombre de tu empresa"
              />
              <p className="text-xs text-muted-foreground">Puedes modificar esta información más adelante</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm"
                >
                  Editar Información
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    className="text-xs md:text-sm"
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
