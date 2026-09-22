import { describe, expect, it } from 'vitest';
import { matchesSearch, normalizeSearch } from '@/lib/utils/search';

describe('matchesSearch', () => {
  it('encuentra palabras incompletas', () => {
    expect(matchesSearch('tor', ['Torquímetro'])).toBe(true);
    expect(matchesSearch('tala', ['Taladro Percutor'])).toBe(true);
    expect(matchesSearch('tor', ['Generador'])).toBe(false);
  });

  it('no distingue acentos ni mayúsculas, en ninguno de los dos lados', () => {
    expect(matchesSearch('torqui', ['Torquímetro'])).toBe(true);
    expect(matchesSearch('TORQUÍ', ['torquimetro'])).toBe(true);
    expect(matchesSearch('camion', ['Camión Pluma'])).toBe(true);
  });

  it('ignora campos vacíos y colapsa espacios', () => {
    expect(matchesSearch('base  magnetica', [null, undefined, '', 'Base Magnética'])).toBe(true);
    expect(matchesSearch('xyz', [null, 'Generador'])).toBe(false);
  });

  it('un término vacío coincide con todo', () => {
    expect(matchesSearch('   ', ['Generador'])).toBe(true);
  });

  it('trata el texto del usuario como texto literal, no como regex', () => {
    expect(matchesSearch('.*', ['Generador'])).toBe(false);
    expect(matchesSearch('(', ['Equipo POT (Pull Out Test)'])).toBe(true);
  });

  it('normalizeSearch', () => {
    expect(normalizeSearch('  Dinamómetro   de Tracción ')).toBe('dinamometro de traccion');
  });
});
