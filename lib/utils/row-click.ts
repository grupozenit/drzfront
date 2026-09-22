import type { KeyboardEvent, MouseEvent } from "react"

// Controles propios de la fila/tarjeta que ya tienen su acción (menú de tres
// puntos, badge de incidencias, fecha editable en línea, etc.).
const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='menuitem'], [contenteditable='true']"

/**
 * Decide si un clic sobre una fila o tarjeta es un clic "en la fila" y no en
 * uno de sus controles.
 *
 * - React propaga los eventos a través de los portales: un clic en un ítem del
 *   menú de acciones, en el fondo que lo cierra o en un calendario llega al
 *   `onClick` de la fila aunque en el DOM no esté dentro de ella. Esos se
 *   descartan comprobando que el target sea descendiente real de la fila.
 * - Un clic sobre un botón o input interno ya tiene su propia acción.
 * - Si el usuario está seleccionando texto (p. ej. para copiar un código), no
 *   se abre nada.
 */
export function isRowClick(event: MouseEvent<HTMLElement>): boolean {
  if (event.defaultPrevented || event.button !== 0) return false

  const row = event.currentTarget
  const target = event.target
  if (!(target instanceof Element) || !row.contains(target)) return false

  const interactive = target.closest(INTERACTIVE_SELECTOR)
  if (interactive && interactive !== row && row.contains(interactive)) return false

  const selection = typeof window !== "undefined" ? window.getSelection() : null
  if (selection && selection.toString().trim()) return false

  return true
}

/**
 * Props para que toda una fila o tarjeta abra una acción (por ejemplo, Editar)
 * con el mouse o con Enter/Espacio. Con `enabled` en false no agrega nada: la
 * fila queda como antes, sin foco ni cursor de clic.
 */
export function rowActionProps(onActivate: () => void, enabled: boolean) {
  if (!enabled) return {}
  return {
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (isRowClick(event)) onActivate()
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      // Solo con el foco en la fila misma: Enter sobre un botón interno es de ese botón.
      if (event.target !== event.currentTarget) return
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onActivate()
      }
    },
  }
}
