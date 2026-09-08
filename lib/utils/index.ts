// Utilidad original de shadcn
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) sin problemas de timezone
 * @param dateString - Fecha en formato ISO (YYYY-MM-DD)
 * @param options - Opciones de formato de Intl.DateTimeFormat
 * @returns Fecha formateada
 */
export function formatDateLocal(
  dateString: string,
  options: Intl.DateTimeFormatOptions = { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  }
): string {
  // Parsear la fecha string directamente sin usar new Date()
  // para evitar problemas de timezone
  const [year, month, day] = dateString.split("-").map(Number)
  
  // Crear fecha en timezone local (no UTC)
  const date = new Date(year, month - 1, day)
  
  return date.toLocaleDateString("es-ES", options)
}

// Re-exportar utilidades
export * from './cuit';

