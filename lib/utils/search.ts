/**
 * Búsqueda de texto de los listados: parcial, sin distinguir mayúsculas ni
 * acentos. "tor" encuentra "Torquímetro" y "camion" encuentra "Camión".
 */
export function normalizeSearch(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join(" ")
}

/**
 * True si `term` aparece en alguno de los campos. Un término vacío coincide
 * con todo. Compara con `includes`, nunca como expresión regular: lo que
 * escribe el usuario no se interpreta.
 */
export function matchesSearch(term: string, fields: ReadonlyArray<string | null | undefined>): boolean {
  const needle = normalizeSearch(term)
  if (!needle) return true
  return fields.some((field) => field && normalizeSearch(field).includes(needle))
}
