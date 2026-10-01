import { describe, expect, it } from 'vitest';
import { netShiftHours } from '@/lib/utils/report-hours';

describe('netShiftHours', () => {
  it('descuenta la hora de almuerzo', () => {
    expect(netShiftHours('08:00', '17:00')).toBe(8);
    expect(netShiftHours('07:30', '18:00')).toBe(9.5);
  });

  it('un turno que cruza la medianoche suma 24 h', () => {
    expect(netShiftHours('22:00', '06:00')).toBe(7);
  });

  it('no devuelve negativos ni se rompe con horas inválidas', () => {
    expect(netShiftHours('08:00', '08:30')).toBe(0);
    expect(netShiftHours('', '17:00')).toBe(0);
    expect(netShiftHours('8', '17:00')).toBe(0);
  });
});
