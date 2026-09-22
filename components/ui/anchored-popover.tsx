"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface AnchoredPopoverProps {
  /** Se dispara al hacer click fuera o al presionar Escape. */
  onClose: () => void
  children: ReactNode
  /** Borde del anclaje con el que se alinea el panel. */
  align?: "left" | "right"
  /** Clases del panel (fondo, borde, ancho mínimo, padding). */
  className?: string
}

const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 4

/**
 * Panel flotante anclado al elemento que lo contiene, renderizado en un portal
 * sobre `document.body`.
 *
 * Los contenedores de las vistas de tabla usan `overflow-x-auto`, lo que recorta
 * cualquier panel posicionado en absolute dentro de la tabla. Al portalear el
 * panel y posicionarlo en `fixed` a partir del rect del anclaje, el menú se ve
 * completo aunque la fila esté al borde del contenedor o del viewport.
 */
export function AnchoredPopover({ onClose, children, align = "right", className = "" }: AnchoredPopoverProps) {
  const markerRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  // El disparador puede estar montado pero oculto: las vistas de tabla y de
  // tarjetas conviven en el DOM y una de las dos va con `md:hidden`/`hidden`.
  // Como el panel vive en un portal, no hereda ese `display: none` y aparecía
  // un segundo menú en la esquina superior izquierda (el rect de un elemento
  // oculto es 0×0).
  const [anchorHidden, setAnchorHidden] = useState(false)

  // El portal solo puede montarse en el cliente (no hay `document` en SSR).
  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!mounted) return

    const updatePosition = () => {
      // El marcador está oculto: su padre es el contenedor del disparador.
      const anchor = markerRef.current?.parentElement
      const panel = panelRef.current
      if (!anchor || !panel) return

      // Sin cajas de layout = el anclaje (o un ancestro) está en display: none.
      if (anchor.getClientRects().length === 0) {
        setAnchorHidden(true)
        setPosition(null)
        return
      }
      setAnchorHidden(false)

      const rect = anchor.getBoundingClientRect()
      const { offsetWidth: panelWidth, offsetHeight: panelHeight } = panel

      // Abre hacia abajo salvo que no entre; en ese caso se voltea hacia arriba.
      let top = rect.bottom + ANCHOR_GAP
      if (top + panelHeight > window.innerHeight - VIEWPORT_MARGIN) {
        const flipped = rect.top - panelHeight - ANCHOR_GAP
        top = flipped >= VIEWPORT_MARGIN ? flipped : Math.max(VIEWPORT_MARGIN, window.innerHeight - panelHeight - VIEWPORT_MARGIN)
      }

      const left = align === "right" ? rect.right - panelWidth : rect.left
      const maxLeft = window.innerWidth - panelWidth - VIEWPORT_MARGIN

      setPosition({ top, left: Math.min(Math.max(VIEWPORT_MARGIN, left), Math.max(VIEWPORT_MARGIN, maxLeft)) })
    }

    updatePosition()

    // `true` captura el scroll de cualquier contenedor, no solo el de la ventana.
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [mounted, align])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <>
      <span ref={markerRef} className="hidden" aria-hidden="true" />
      {mounted &&
        createPortal(
          <>
            {!anchorHidden && <div className="fixed inset-0 z-[90]" onClick={onClose} />}
            <div
              ref={panelRef}
              style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
              // Invisible en el primer render: se mide el panel para saber si hay
              // que voltearlo antes de mostrarlo, y así evitar el salto visual.
              // Con el anclaje oculto queda invisible e inerte (sin clics ni foco),
              // pero montado, para poder medirlo si el anclaje vuelve a mostrarse
              // (p. ej. al cruzar el breakpoint md con el menú abierto).
              aria-hidden={anchorHidden || undefined}
              inert={anchorHidden || undefined}
              className={`fixed z-[100] ${position && !anchorHidden ? "" : "invisible pointer-events-none"} ${className}`}
            >
              {children}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
