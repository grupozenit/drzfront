"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="space-y-6 max-w-sm w-full">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/icons/icon-192x192-any.png"
            alt="Grupo Zenit"
            width={80}
            height={80}
            priority
          />
        </div>

        {/* Ícono offline */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Mensaje */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Sin conexión</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No hay conexión a internet. Para usar la app offline necesitás haberla
            abierto al menos una vez con conexión en este dispositivo.
          </p>
        </div>

        {/* Instrucción para reportes offline */}
        <div className="bg-muted rounded-none p-4 text-left space-y-1">
          <p className="text-xs font-medium text-foreground">¿Ya iniciaste sesión antes?</p>
          <p className="text-xs text-muted-foreground">
            Cerrá esta pantalla, volvé a abrir la app y podrás cargar reportes.
            Se sincronizarán cuando recuperes conexión.
          </p>
        </div>

        {/* Reintentar */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}
