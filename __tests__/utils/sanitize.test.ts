import { describe, it, expect } from 'vitest';
import {
  sanitizeTextInput,
  validateEmail,
  sanitizeEmail,
  sanitizeEmailList,
  sanitizeNumber,
  validateFileSize,
  validateFileType,
  validateImageFile,
  validateSpreadsheetFile,
} from '@/lib/utils/sanitize';

// ─── sanitizeTextInput ────────────────────────────────────────────────────────

describe('sanitizeTextInput', () => {
  it('elimina caracteres de control peligrosos', () => {
    const input = 'texto\x00con\x01nulos\x1F';
    expect(sanitizeTextInput(input)).toBe('textoconnulos');
  });

  it('preserva saltos de línea y tabulaciones', () => {
    const input = 'línea1\nlínea2\ttab';
    expect(sanitizeTextInput(input)).toContain('línea1');
  });

  it('normaliza espacios múltiples y hace trim', () => {
    expect(sanitizeTextInput('  hola   mundo  ')).toBe('hola mundo');
  });

  it('respeta maxLength', () => {
    expect(sanitizeTextInput('abcdefgh', 5)).toBe('abcde');
  });

  it('retorna el mismo texto si es vacío o falsy', () => {
    expect(sanitizeTextInput('')).toBe('');
  });
});

// ─── validateEmail ────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('valida emails correctos', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@sub.domain.org')).toBe(true);
  });

  it('rechaza emails incorrectos', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('no-arroba')).toBe(false);
    expect(validateEmail('@dominio.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user@dominio')).toBe(false); // sin TLD
  });
});

// ─── sanitizeEmail ────────────────────────────────────────────────────────────

describe('sanitizeEmail', () => {
  it('convierte a minúsculas y elimina espacios', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });
});

// ─── sanitizeEmailList ────────────────────────────────────────────────────────

describe('sanitizeEmailList', () => {
  it('filtra emails inválidos y sanitiza los válidos', () => {
    const result = sanitizeEmailList([
      'VALID@EXAMPLE.COM',
      'invalid-email',
      'another@test.org',
    ]);
    expect(result).toEqual(['valid@example.com', 'another@test.org']);
  });

  it('retorna array vacío si todos son inválidos', () => {
    expect(sanitizeEmailList(['no-email', 'tampoco'])).toEqual([]);
  });
});

// ─── sanitizeNumber ───────────────────────────────────────────────────────────

describe('sanitizeNumber', () => {
  it('parsea strings numéricos', () => {
    expect(sanitizeNumber('42')).toBe(42);
    expect(sanitizeNumber('3.14')).toBe(3.14);
  });

  it('retorna 0 para valores no numéricos', () => {
    expect(sanitizeNumber('abc')).toBe(0);
    expect(sanitizeNumber('')).toBe(0);
  });

  it('acepta números directamente', () => {
    expect(sanitizeNumber(99)).toBe(99);
  });
});

// ─── validateFileSize ─────────────────────────────────────────────────────────

describe('validateFileSize', () => {
  const makeFile = (sizeBytes: number) =>
    ({ size: sizeBytes, type: 'image/jpeg', name: 'test.jpg' }) as File;

  it('acepta archivo dentro del límite', () => {
    expect(validateFileSize(makeFile(1 * 1024 * 1024), 5)).toBe(true); // 1 MB < 5 MB
  });

  it('rechaza archivo que supera el límite', () => {
    expect(validateFileSize(makeFile(6 * 1024 * 1024), 5)).toBe(false); // 6 MB > 5 MB
  });

  it('acepta archivo exactamente en el límite', () => {
    expect(validateFileSize(makeFile(5 * 1024 * 1024), 5)).toBe(true);
  });
});

// ─── validateFileType ─────────────────────────────────────────────────────────

describe('validateFileType', () => {
  const makeFile = (type: string) =>
    ({ size: 100, type, name: 'test' }) as File;

  it('acepta tipo permitido', () => {
    expect(validateFileType(makeFile('image/jpeg'), ['image/jpeg', 'image/png'])).toBe(true);
  });

  it('rechaza tipo no permitido', () => {
    expect(validateFileType(makeFile('application/pdf'), ['image/jpeg', 'image/png'])).toBe(false);
  });
});

// ─── validateImageFile ────────────────────────────────────────────────────────

describe('validateImageFile', () => {
  const makeImageFile = (sizeBytes: number, type: string) =>
    ({ size: sizeBytes, type, name: 'test.jpg' }) as File;

  it('acepta imagen válida (JPEG, < 5 MB)', () => {
    const result = validateImageFile(makeImageFile(2 * 1024 * 1024, 'image/jpeg'));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rechaza imagen demasiado grande', () => {
    const result = validateImageFile(makeImageFile(6 * 1024 * 1024, 'image/jpeg'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5 MB');
  });

  it('rechaza tipo de archivo no permitido', () => {
    const result = validateImageFile(makeImageFile(1 * 1024 * 1024, 'image/gif'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JPG');
  });

  it('acepta HEIC y WebP', () => {
    expect(validateImageFile(makeImageFile(1 * 1024 * 1024, 'image/heic')).valid).toBe(true);
    expect(validateImageFile(makeImageFile(1 * 1024 * 1024, 'image/webp')).valid).toBe(true);
  });
});


// ─── validateSpreadsheetFile ─────────────────────────────────────────────────
// Es un filtro de usabilidad, no un control: el backend revalida extensión,
// MIME, magic bytes y estructura del ZIP.

function xlsx(name: string, sizeMB = 0.01) {
  const file = new File(['x'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(file, 'size', { value: sizeMB * 1024 * 1024 });
  return file;
}

describe('validateSpreadsheetFile', () => {
  it('acepta un .xlsx chico', () => {
    expect(validateSpreadsheetFile(xlsx('Plantilla_Totales.xlsx')).valid).toBe(true);
  });

  it('rechaza otra extensión aunque el MIME sea el correcto', () => {
    expect(validateSpreadsheetFile(xlsx('totales.xls')).valid).toBe(false);
  });

  it('rechaza un archivo que supera los 2 MB', () => {
    const result = validateSpreadsheetFile(xlsx('totales.xlsx', 5));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2 MB');
  });

  it('rechaza un MIME que no es el de xlsx', () => {
    const file = new File(['x'], 'totales.xlsx', { type: 'application/pdf' });
    expect(validateSpreadsheetFile(file).valid).toBe(false);
  });
});
