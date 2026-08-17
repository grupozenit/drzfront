import { describe, it, expect } from 'vitest';
import { validatePDFFile } from '@/lib/utils/sanitize';

// ─── validatePDFFile ──────────────────────────────────────────────────────────

describe('validatePDFFile', () => {
  const makeFile = (sizeBytes: number, type: string) =>
    ({ size: sizeBytes, type, name: 'document.pdf' }) as File;

  it('acepta PDF válido menor a 10 MB', () => {
    const result = validatePDFFile(makeFile(5 * 1024 * 1024, 'application/pdf'));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rechaza PDF que supera 10 MB', () => {
    const result = validatePDFFile(makeFile(11 * 1024 * 1024, 'application/pdf'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 MB');
  });

  it('rechaza tipo MIME incorrecto (imagen)', () => {
    const result = validatePDFFile(makeFile(1 * 1024 * 1024, 'image/jpeg'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PDF');
  });
});
