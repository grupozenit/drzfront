"use client"

import type React from "react"
import { X } from "lucide-react"
import { Button } from "./button"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message?: string
  children?: React.ReactNode
  confirmText?: string
  cancelText?: string
  type?: "confirm" | "alert"
}

export function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "confirm",
}: DialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 bg-card border border-border rounded-lg shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {message && (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}
        {children}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button type="button" onClick={onClose} variant="outline" className="text-sm bg-transparent">
            {cancelText}
          </Button>
          {type === "confirm" && onConfirm && (
            <Button type="button" onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

