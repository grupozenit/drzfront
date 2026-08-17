import { describe, it, expect, vi } from 'vitest';
import {
  calculateTrackersProgress,
  calculateModulosProgress,
  calculateCableBTACProgress,
  calculateCableBTCCProgress,
  calculateCableMTProgress,
  calculateInversoresProgress,
  calculateTotalProjectProgress,
  accumulatePersonnel,
  accumulateSuspendedHours,
  accumulateIncidents,
  calculateSafetyIndicators,
  formatDate,
} from '@/lib/utils/calculations';
import { PROJECT_TOTAL_PROGRESS_WEIGHTS } from '@/lib/constants/weights';

// Mock baselines API para evitar importaciones con side-effects
vi.mock('@/lib/api/baselines', () => ({
  baselinesService: {
    getVariableTotal: vi.fn().mockReturnValue(0),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    date: '2024-03-15',
    entryTime: '08:00',
    exitTime: '16:00',
    directStaff: 5,
    indirectStaff: 0,
    suspendedHours: 0,
    hasAccident: false,
    accidentWithInjury: false,
    activities: [],
    ...overrides,
  } as any;
}

// ─── calculateTrackersProgress ────────────────────────────────────────────────

describe('calculateTrackersProgress', () => {
  it('retorna 0 cuando no hay actividades coincidentes', () => {
    const progress = [{ activity: 'NoExiste', progress: 100 }];
    expect(calculateTrackersProgress(progress)).toBe(0);
  });

  it('retorna resultado ponderado cuando hay actividades coincidentes', () => {
    // Solo Soportes (peso=20) al 100% → totalWeight=20, weighted=2000 → 100
    const progress = [{ activity: 'Soportes', progress: 100 }];
    expect(calculateTrackersProgress(progress)).toBe(100);
  });
});

// ─── calculateModulosProgress ─────────────────────────────────────────────────

describe('calculateModulosProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateModulosProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna resultado ponderado con actividades coincidentes', () => {
    // Solo Montaje (peso=32) al 100% → totalWeight=32, result=100
    const progress = [{ activity: 'Montaje', progress: 100 }];
    expect(calculateModulosProgress(progress)).toBe(100);
  });
});

// ─── calculateCableBTACProgress ───────────────────────────────────────────────

describe('calculateCableBTACProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateCableBTACProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna resultado ponderado con actividades coincidentes', () => {
    // Solo Excavación (peso=33.33) al 100% → result=100
    const progress = [{ activity: 'Excavación', progress: 100 }];
    expect(calculateCableBTACProgress(progress)).toBe(100);
  });
});

// ─── calculateCableBTCCProgress ───────────────────────────────────────────────

describe('calculateCableBTCCProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateCableBTCCProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna resultado ponderado con actividades coincidentes', () => {
    const progress = [{ activity: 'Tendido', progress: 100 }];
    expect(calculateCableBTCCProgress(progress)).toBe(100);
  });
});

// ─── calculateCableMTProgress ─────────────────────────────────────────────────

describe('calculateCableMTProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateCableMTProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna resultado ponderado con actividades coincidentes', () => {
    const progress = [{ activity: 'Tapado', progress: 100 }];
    expect(calculateCableMTProgress(progress)).toBe(100);
  });
});

// ─── calculateInversoresProgress ─────────────────────────────────────────────

describe('calculateInversoresProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateInversoresProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna resultado ponderado con actividades coincidentes', () => {
    // Solo Conexión (peso=50) al 100% → totalWeight=50, result=100
    const progress = [{ activity: 'Conexión', progress: 100 }];
    expect(calculateInversoresProgress(progress)).toBe(100);
  });
});

// ─── calculateTotalProjectProgress ───────────────────────────────────────────

describe('calculateTotalProjectProgress', () => {
  it('retorna 0 sin actividades coincidentes', () => {
    expect(calculateTotalProjectProgress([{ activity: 'NoExiste', progress: 100 }])).toBe(0);
  });

  it('retorna 100 cuando todas las actividades están completas', () => {
    const progress = PROJECT_TOTAL_PROGRESS_WEIGHTS.map(w => ({
      activity: w.actividad,
      progress: 100,
    }));
    expect(calculateTotalProjectProgress(progress)).toBe(100);
  });
});

// ─── accumulatePersonnel ──────────────────────────────────────────────────────

describe('accumulatePersonnel', () => {
  it('retorna ceros para lista vacía', () => {
    expect(accumulatePersonnel([])).toEqual({ directStaff: 0, indirectStaff: 0 });
  });

  it('retorna el personal del único reporte', () => {
    const reports = [makeReport({ directStaff: 12, indirectStaff: 3 })];
    expect(accumulatePersonnel(reports)).toEqual({ directStaff: 12, indirectStaff: 3 });
  });

  it('retorna el personal del reporte más reciente', () => {
    const reports = [
      makeReport({ date: '2024-03-13', directStaff: 5, indirectStaff: 1 }),
      makeReport({ date: '2024-03-15', directStaff: 20, indirectStaff: 4 }), // más reciente
      makeReport({ date: '2024-03-14', directStaff: 10, indirectStaff: 2 }),
    ];
    expect(accumulatePersonnel(reports)).toEqual({ directStaff: 20, indirectStaff: 4 });
  });
});

// ─── accumulateSuspendedHours ─────────────────────────────────────────────────

describe('accumulateSuspendedHours', () => {
  it('retorna 0 para lista vacía', () => {
    expect(accumulateSuspendedHours([])).toBe(0);
  });

  it('retorna las horas del único reporte', () => {
    const reports = [makeReport({ suspendedHours: 3 })];
    expect(accumulateSuspendedHours(reports)).toBe(3);
  });

  it('acumula horas suspendidas de múltiples reportes', () => {
    const reports = [
      makeReport({ suspendedHours: 2 }),
      makeReport({ suspendedHours: 1.5 }),
      makeReport({ suspendedHours: 0 }),
    ];
    expect(accumulateSuspendedHours(reports)).toBe(3.5);
  });
});

// ─── accumulateIncidents ──────────────────────────────────────────────────────

describe('accumulateIncidents', () => {
  it('retorna ceros cuando no hay accidentes', () => {
    const reports = [makeReport({ hasAccident: false })];
    expect(accumulateIncidents(reports)).toEqual({
      incidentes: 0,
      accidentes: 0,
      accidentesConLesion: 0,
    });
  });

  it('cuenta accidente sin lesión correctamente', () => {
    const reports = [makeReport({ hasAccident: true, accidentWithInjury: false })];
    const result = accumulateIncidents(reports);
    expect(result.accidentes).toBe(1);
    expect(result.accidentesConLesion).toBe(0);
  });

  it('cuenta accidente con lesión correctamente', () => {
    const reports = [makeReport({ hasAccident: true, accidentWithInjury: true })];
    const result = accumulateIncidents(reports);
    expect(result.accidentes).toBe(1);
    expect(result.accidentesConLesion).toBe(1);
  });

  it('acumula múltiples accidentes de múltiples reportes', () => {
    const reports = [
      makeReport({ hasAccident: true, accidentWithInjury: false }),
      makeReport({ hasAccident: true, accidentWithInjury: true }),
      makeReport({ hasAccident: false }),
    ];
    const result = accumulateIncidents(reports);
    expect(result.accidentes).toBe(2);
    expect(result.accidentesConLesion).toBe(1);
  });
});

// ─── calculateSafetyIndicators ────────────────────────────────────────────────

describe('calculateSafetyIndicators', () => {
  it('retorna ceros para lista vacía (horas=0 → trir=ltir=0)', () => {
    const result = calculateSafetyIndicators([]);
    expect(result.trir).toBe(0);
    expect(result.ltir).toBe(0);
    expect(result.workedHours).toBe(0);
  });

  it('calcula TRIR correctamente con un accidente', () => {
    // 5 directStaff × 8h = 40 hh; 1 accidente sin lesión
    // TRIR = (0 + 1) × 200000 / 40 = 5000
    const reports = [
      makeReport({
        directStaff: 5,
        indirectStaff: 0,
        hasAccident: true,
        accidentWithInjury: false,
      }),
    ];
    const result = calculateSafetyIndicators(reports);
    expect(result.trir).toBe(5000);
    expect(result.ltir).toBe(0);
    expect(result.totalAccidents).toBe(1);
  });

  it('calcula LTIR correctamente con accidente con lesión', () => {
    // 10 staff × 8h = 80 hh; 1 accidente con lesión
    // TRIR = (0 + 1) × 200000 / 80 = 2500
    // LTIR = 1 × 200000 / 80 = 2500
    const reports = [
      makeReport({
        directStaff: 10,
        indirectStaff: 0,
        hasAccident: true,
        accidentWithInjury: true,
      }),
    ];
    const result = calculateSafetyIndicators(reports);
    expect(result.trir).toBe(2500);
    expect(result.ltir).toBe(2500);
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formato short con string retorna string no vacío con el día', () => {
    const result = formatDate('2024-03-15T12:00:00', 'short');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('15');
  });

  it('formato long con string incluye el año', () => {
    const result = formatDate('2024-03-15T12:00:00', 'long');
    expect(result).toContain('2024');
  });

  it('acepta objeto Date', () => {
    const date = new Date('2024-06-20T12:00:00');
    const result = formatDate(date, 'short');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formato long incluye año en fecha de fin de año', () => {
    const result = formatDate('2024-12-31T12:00:00', 'long');
    expect(result).toContain('2024');
  });
});
