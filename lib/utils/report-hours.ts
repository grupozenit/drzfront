// Horas de almuerzo que no computan como trabajadas. Espejo de
// LUNCH_BREAK_HOURS en el backend (src/services/calculations.py).
export const LUNCH_BREAK_HOURS = 1

/**
 * Horas de la jornada netas de almuerzo, a partir de "HH:MM". Es lo que el
 * backend fija como horas suspendidas cuando se suspende la jornada completa
 * (net_shift_hours); acá solo se usa para mostrarlo en el formulario. Un turno
 * que cruza la medianoche suma 24 h a la salida.
 */
export function netShiftHours(entryTime: string, exitTime: string): number {
  const toHours = (value: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "")
    if (!match) return null
    return Number(match[1]) + Number(match[2]) / 60
  }
  const entry = toHours(entryTime)
  const exit = toHours(exitTime)
  if (entry === null || exit === null) return 0
  let duration = exit - entry
  if (duration < 0) duration += 24
  return Math.max(0, Math.round((duration - LUNCH_BREAK_HOURS) * 100) / 100)
}
