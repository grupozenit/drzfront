/**
 * Validación y formato de CUIT/CUIL argentino.
 * Espeja `validate_and_normalize_cuit` del backend para dar feedback inmediato
 * en el formulario, sin depender del round-trip a la API.
 */

// Prefijos válidos según ARCA/AFIP:
//   20/23/24/25/26/27/29 -> personas físicas
//   30/33/34             -> personas jurídicas
const VALID_PREFIXES = ["20", "23", "24", "25", "26", "27", "29", "30", "33", "34"];

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Deja solo los dígitos. */
export function cuitDigits(cuit: string): string {
  return (cuit || "").replace(/\D/g, "");
}

/** Formatea a XX-XXXXXXXX-X (tolera entradas parciales). */
export function formatCuit(cuit: string): string {
  const d = cuitDigits(cuit).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/**
 * Devuelve `null` si el CUIT es válido, o un mensaje de error en castellano.
 * Un CUIT vacío devuelve `null` (la obligatoriedad se valida aparte).
 */
export function cuitError(cuit: string): string | null {
  const d = cuitDigits(cuit);
  if (!d) return null;

  if (d.length !== 11) {
    return `El CUIT debe tener 11 dígitos (van ${d.length})`;
  }

  if (!VALID_PREFIXES.includes(d.slice(0, 2))) {
    return `Prefijo inválido (${d.slice(0, 2)}). Debe empezar con ${VALID_PREFIXES.join(", ")}`;
  }

  const total = WEIGHTS.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
  let check = 11 - (total % 11);
  if (check === 11) check = 0;
  else if (check === 10) check = 9;

  if (check !== Number(d[10])) {
    return "El dígito verificador no es correcto. Revisá el número";
  }

  return null;
}

export function isValidCuit(cuit: string): boolean {
  return cuitDigits(cuit).length === 11 && cuitError(cuit) === null;
}
