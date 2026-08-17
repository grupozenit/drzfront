"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 3000
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
  }

  const colors = {
    success: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
    error: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
    info: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20",
    warning: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20",
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${colors[toast.type]} backdrop-blur-sm animate-in slide-in-from-top-2 duration-300`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.message && <p className="text-xs text-muted-foreground mt-1">{toast.message}</p>}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <div key={toast.id} className="mb-2">
            <ToastItem toast={toast} onClose={onClose} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook para usar toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { id, type, title, message, duration }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return {
    toasts,
    addToast,
    removeToast,
    success: (title: string, message?: string, duration?: number) => addToast("success", title, message, duration),
    error: (title: string, message?: string, duration?: number) => addToast("error", title, message, duration),
    info: (title: string, message?: string, duration?: number) => addToast("info", title, message, duration),
    warning: (title: string, message?: string, duration?: number) => addToast("warning", title, message, duration),
  }
}

