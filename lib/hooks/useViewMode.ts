"use client"

import { useState, useEffect, useCallback } from "react"

export type ViewMode = "list" | "cards"

/**
 * Recuerda la preferencia de vista (lista/tarjetas) del usuario en localStorage.
 * Arranca en "list" por defecto; lee el valor persistido en un efecto para
 * evitar mismatches de hidratación con el render del servidor.
 */
export function useViewMode(storageKey: string): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>("list")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === "list" || stored === "cards") {
        setViewModeState(stored)
      }
    } catch {
      // localStorage no disponible (SSR, navegación privada, etc.)
    }
  }, [storageKey])

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode)
      try {
        localStorage.setItem(storageKey, mode)
      } catch {
        // ignorar si localStorage no está disponible
      }
    },
    [storageKey]
  )

  return [viewMode, setViewMode]
}
