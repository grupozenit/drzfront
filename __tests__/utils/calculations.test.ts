import { describe, it, expect } from 'vitest';
import {
  calculateActivityProgress,
  calculateWeightedProgress,
  accumulateActivities,
  calculateWorkedHours,
  formatPercentage,
  formatNumber,
} from '@/lib/utils/calculations';
import { calculateTRIR, calculateLTIR } from '@/lib/constants/weights';

// ─── calculateActivityProgress ────────────────────────────────────────────────

describe('calculateActivityProgress', () => {
  it('retorna 0 cuando el total es 0', () => {
    expect(calculateActivityProgress(0, 0)).toBe(0);
    expect(calculateActivityProgress(50, 0)).toBe(0);
  });

  it('calcula porcentaje correctamente', () => {
    expect(calculateActivityProgress(50, 100)).toBe(50);
    expect(calculateActivityProgress(1, 4)).toBe(25);
    expect(calculateActivityProgress(100, 100)).toBe(100);
  });

  it('no supera 100 cuando completed > total', () => {
    expect(calculateActivityProgress(150, 100)).toBe(100);
  });

  it('redondea al entero más cercano', () => {
    expect(calculateActivityProgress(1, 3)).toBe(33); // 33.33...
    expect(calculateActivityProgress(2, 3)).toBe(67); // 66.66...
  });
});

// ─── calculateWeightedProgress ────────────────────────────────────────────────

describe('calculateWeightedProgress', () => {
  const weights = [
    { actividad: 'A', peso: 60 },
    { actividad: 'B', peso: 40 },
  ];

  it('retorna 0 sin pesos coincidentes', () => {
    const progress = [{ activity: 'X', progress: 100 }];
    expect(calculateWeightedProgress(progress, weights)).toBe(0);
  });

  it('calcula el promedio ponderado correctamente', () => {
    const progress = [
      { activity: 'A', progress: 100 },
      { activity: 'B', progress: 0 },
    ];
    // 100*60 + 0*40 = 6000 / 100 = 60
    expect(calculateWeightedProgress(progress, weights)).toBe(60);
  });

  it('devuelve 100 cuando todo está completo', () => {
    const progress = [
      { activity: 'A', progress: 100 },
      { activity: 'B', progress: 100 },
    ];
    expect(calculateWeightedProgress(progress, weights)).toBe(100);
  });

  it('considera solo las actividades con peso definido', () => {
    const progress = [
      { activity: 'A', progress: 50 },
      // B no presente
    ];
    // Solo A con peso 60 → 50*60 / 60 = 50
    expect(calculateWeightedProgress(progress, weights)).toBe(50);
  });
});

// ─── accumulateActivities ─────────────────────────────────────────────────────

describe('accumulateActivities', () => {
  const makeReport = (activities: { description: string; quantity: number }[]) =>
    ({
      activities: activities.map((a) => ({ ...a })),
    }) as any;

  it('retorna vacío para lista de reportes vacía', () => {
    expect(accumulateActivities([])).toEqual({});
  });

  it('acumula cantidades de la misma descripción entre reportes', () => {
    const reports = [
      makeReport([{ description: 'Hincas - Hincado', quantity: 30 }]),
      makeReport([{ description: 'Hincas - Hincado', quantity: 20 }]),
    ];
    expect(accumulateActivities(reports)['Hincas - Hincado']).toBe(50);
  });

  it('mantiene actividades diferentes separadas', () => {
    const reports = [
      makeReport([
        { description: 'Hincas - Hincado', quantity: 10 },
        { description: 'Trackers - Soportes', quantity: 5 },
      ]),
    ];
    const result = accumulateActivities(reports);
    expect(result['Hincas - Hincado']).toBe(10);
    expect(result['Trackers - Soportes']).toBe(5);
  });
});

// ─── calculateWorkedHours ─────────────────────────────────────────────────────

describe('calculateWorkedHours', () => {
  const makeReport = (entryTime: string, exitTime: string, staff: number, suspended = 0) =>
    ({
      entryTime,
      exitTime,
      directStaff: staff,
      indirectStaff: 0,
      suspendedHours: suspended,
    }) as any;

  it('retorna 0 para lista vacía', () => {
    expect(calculateWorkedHours([])).toBe(0);
  });

  it('calcula horas hombre correctamente (8h × 10 personas = 80)', () => {
    const reports = [makeReport('08:00', '16:00', 10)];
    expect(calculateWorkedHours(reports)).toBe(80);
  });

  it('descuenta horas suspendidas', () => {
    // 8h - 2h suspendidas = 6h × 10 personas = 60
    const reports = [makeReport('08:00', '16:00', 10, 2)];
    expect(calculateWorkedHours(reports)).toBe(60);
  });

  it('acumula múltiples reportes', () => {
    const reports = [
      makeReport('08:00', '16:00', 5), // 40 hh
      makeReport('08:00', '16:00', 5), // 40 hh
    ];
    expect(calculateWorkedHours(reports)).toBe(80);
  });
});

// ─── calculateTRIR / calculateLTIR ───────────────────────────────────────────

describe('calculateTRIR', () => {
  it('retorna 0 cuando no hay horas trabajadas', () => {
    expect(calculateTRIR(0, 0, 0)).toBe(0);
  });

  it('calcula TRIR correctamente', () => {
    // (1 incidente + 0 accidentes) × 200000 / 100000 = 2
    expect(calculateTRIR(1, 0, 100000)).toBe(2);
  });

  it('incluye tanto incidentes como accidentes', () => {
    // (2 + 3) × 200000 / 1000000 = 1
    expect(calculateTRIR(2, 3, 1000000)).toBe(1);
  });
});

describe('calculateLTIR', () => {
  it('retorna 0 cuando no hay horas trabajadas', () => {
    expect(calculateLTIR(0, 0)).toBe(0);
  });

  it('calcula LTIR correctamente', () => {
    // 1 accidente con lesión × 200000 / 200000 = 1
    expect(calculateLTIR(1, 200000)).toBe(1);
  });
});

// ─── formatPercentage / formatNumber ─────────────────────────────────────────

describe('formatPercentage', () => {
  it('formatea porcentaje con símbolo %', () => {
    expect(formatPercentage(75.6)).toBe('76%');
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(100)).toBe('100%');
  });
});

describe('formatNumber', () => {
  it('formatea números con separador de miles en español', () => {
    const formatted = formatNumber(1500);
    expect(formatted).toContain('1');
    expect(formatted).toContain('500');
    // Acepta punto o espacio como separador según el entorno
    expect(formatted.replace(/[.,\s]/g, '')).toBe('1500');
  });
});
