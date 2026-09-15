/**
 * Utilidades de sanitización para el frontend.
 * Previene XSS y otros ataques de inyección.
 */

/**
 * Sanitiza texto de entrada removiendo caracteres potencialmente peligrosos.
 */
export function sanitizeTextInput(text: string, maxLength?: number): string {
  if (!text) return text;
  
  // Remover caracteres de control (excepto \n, \r, \t)
  let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalizar espacios múltiples
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limitar longitud si se especifica
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }
  
  return sanitized;
}

/**
 * Sanitiza HTML removiendo tags peligrosos.
 * Usa DOMParser para análisis seguro del HTML.
 */
export function sanitizeHTML(html: string): string {
  if (!html) return html;
  
  // Crear un elemento temporal para parsear el HTML
  const temp = document.createElement('div');
  temp.textContent = html; // textContent auto-escapa, no interpreta HTML
  
  return temp.innerHTML;
}

/**
 * Valida formato de email.
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Sanitiza email.
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida y sanitiza una lista de emails.
 */
export function sanitizeEmailList(emails: string[]): string[] {
  return emails
    .map(email => sanitizeEmail(email))
    .filter(email => validateEmail(email));
}

/**
 * Sanitiza input numérico.
 */
export function sanitizeNumber(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

/**
 * Limita tamaño de archivo antes de subir.
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Valida tipo MIME de archivo.
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Valida archivo de imagen (frontend).
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 5;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
  
  if (!validateFileSize(file, MAX_SIZE_MB)) {
    return { valid: false, error: `La imagen no debe superar ${MAX_SIZE_MB} MB` };
  }
  
  if (!validateFileType(file, ALLOWED_TYPES)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Use JPG, PNG o HEIC' };
  }
  
  return { valid: true };
}

/**
 * Valida archivo PDF (frontend).
 */
/**
 * Valida la plantilla de Totales antes de subirla.
 *
 * Es un filtro de usabilidad para dar un error rápido, NO un control de
 * seguridad: el backend revalida extensión, MIME, magic bytes y estructura del
 * ZIP, que es donde está la defensa real.
 */
export function validateSpreadsheetFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 2;
  const ALLOWED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!validateFileSize(file, MAX_SIZE_MB)) {
    return { valid: false, error: `El archivo no debe superar ${MAX_SIZE_MB} MB` };
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { valid: false, error: 'Subí la plantilla en formato .xlsx' };
  }

  if (!validateFileType(file, ALLOWED_TYPES)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Subí un .xlsx' };
  }

  return { valid: true };
}

export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 10;
  const ALLOWED_TYPES = ['application/pdf'];
  
  if (!validateFileSize(file, MAX_SIZE_MB)) {
    return { valid: false, error: `El PDF no debe superar ${MAX_SIZE_MB} MB` };
  }
  
  if (!validateFileType(file, ALLOWED_TYPES)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Use PDF' };
  }
  
  return { valid: true };
}
