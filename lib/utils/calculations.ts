import type { 
  Baseline, 
  DailyReport, 
  ActivityEntry,
  ProjectProgress,
  ActivityProgress,
} from '@/lib/types';
import {
  PROJECT_TOTAL_PROGRESS_WEIGHTS,
  TRACKER_MONTAJE_WEIGHTS,
  MODULOS_MONTAJE_WEIGHTS,
  CABLE_BTAC_WEIGHTS,
  CABLE_BTCC_WEIGHTS,
  CABLE_MT_WEIGHTS,
  INVERSORES_WEIGHTS,
  calculateTRIR,
  calculateLTIR,
} from '@/lib/constants/weights';
import { baselinesService } from '@/lib/api/baselines';

// ============================================
// CÁLCULOS DE AVANCE
// ============================================

/**
 * Calcula el avance de una actividad específica como porcentaje
 */
export function calculateActivityProgress(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

/**
 * Calcula el avance ponderado de múltiples sub-actividades
 */
export function calculateWeightedProgress(
  progressValues: { activity: string; progress: number }[],
  weights: { actividad: string; peso: number }[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  weights.forEach(({ actividad, peso }) => {
    const progressItem = progressValues.find(p => p.activity === actividad);
    if (progressItem) {
      weightedSum += progressItem.progress * peso;
      totalWeight += peso;
    }
  });

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Calcula el avance del montaje de trackers ponderado por componentes
 */
export function calculateTrackersProgress(
  componentProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(componentProgress, TRACKER_MONTAJE_WEIGHTS);
}

/**
 * Calcula el avance del montaje de módulos ponderado
 */
export function calculateModulosProgress(
  subActivityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(subActivityProgress, MODULOS_MONTAJE_WEIGHTS);
}

/**
 * Calcula el avance de Cable BT/AC ponderado
 */
export function calculateCableBTACProgress(
  subActivityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(subActivityProgress, CABLE_BTAC_WEIGHTS);
}

/**
 * Calcula el avance de Cable BT/CC ponderado
 */
export function calculateCableBTCCProgress(
  subActivityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(subActivityProgress, CABLE_BTCC_WEIGHTS);
}

/**
 * Calcula el avance de Cable MT ponderado
 */
export function calculateCableMTProgress(
  subActivityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(subActivityProgress, CABLE_MT_WEIGHTS);
}

/**
 * Calcula el avance de Inversores ponderado
 */
export function calculateInversoresProgress(
  subActivityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(subActivityProgress, INVERSORES_WEIGHTS);
}

/**
 * Calcula el avance total del proyecto ponderado
 */
export function calculateTotalProjectProgress(
  activityProgress: { activity: string; progress: number }[]
): number {
  return calculateWeightedProgress(activityProgress, PROJECT_TOTAL_PROGRESS_WEIGHTS);
}

// ============================================
// ACUMULADOS DE REPORTES
// ============================================

/**
 * Acumula las cantidades de actividades de múltiples reportes
 */
export function accumulateActivities(
  reports: DailyReport[]
): Record<string, number> {
  const accumulated: Record<string, number> = {};

  reports.forEach(report => {
    report.activities.forEach(activity => {
      const key = activity.description;
      accumulated[key] = (accumulated[key] || 0) + activity.quantity;
    });
  });

  return accumulated;
}

/**
 * Acumula el personal de múltiples reportes
 */
export function accumulatePersonnel(
  reports: DailyReport[]
): { directStaff: number; indirectStaff: number } {
  // Retornar el último reporte (el más reciente)
  if (reports.length === 0) {
    return { directStaff: 0, indirectStaff: 0 };
  }

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    directStaff: sortedReports[0].directStaff,
    indirectStaff: sortedReports[0].indirectStaff,
  };
}

/**
 * Acumula las horas suspendidas
 */
export function accumulateSuspendedHours(reports: DailyReport[]): number {
  return reports.reduce((sum, report) => {
    return sum + (report.suspendedHours || 0);
  }, 0);
}

/**
 * Acumula incidentes y accidentes
 */
export function accumulateIncidents(
  reports: DailyReport[]
): { incidentes: number; accidentes: number; accidentesConLesion: number } {
  return reports.reduce(
    (acc, report) => {
      if (report.hasAccident) {
        if (report.accidentWithInjury) {
          acc.accidentesConLesion += 1;
        }
        acc.accidentes += 1;
      }
      return acc;
    },
    { incidentes: 0, accidentes: 0, accidentesConLesion: 0 }
  );
}

/**
 * Calcula las horas hombre trabajadas
 */
export function calculateWorkedHours(reports: DailyReport[]): number {
  return reports.reduce((sum, report) => {
    const totalStaff = report.directStaff + report.indirectStaff;
    
    // Calcular horas del día (de entryTime a exitTime)
    const entry = parseTime(report.entryTime);
    const exit = parseTime(report.exitTime);
    const hoursInDay = (exit - entry) / 60; // convertir minutos a horas
    
    // Restar horas suspendidas
    const effectiveHours = hoursInDay - (report.suspendedHours || 0);
    
    return sum + (totalStaff * effectiveHours);
  }, 0);
}

// ============================================
// CÁLCULO COMPLETO DE PROGRESO DE PROYECTO
// ============================================

/**
 * Calcula el progreso completo de un proyecto basándose en los reportes
 * y la línea base
 */
export function calculateProjectProgress(
  projectId: string,
  projectName: string,
  reports: DailyReport[],
  baseline: Baseline
): ProjectProgress {
  const accumulated = accumulateActivities(reports);
  
  // Calcular progreso de cada actividad principal
  const activities: ActivityProgress[] = [];

  // Hincado
  const hincadoTotal = baselinesService.getVariableTotal(baseline, 'Hincas');
  const hincadoCompleted = accumulated['Hincas - Hincado'] || 0;
  activities.push({
    name: 'Hincado',
    progress: calculateActivityProgress(hincadoCompleted, hincadoTotal),
    completed: hincadoCompleted,
    total: hincadoTotal,
  });

  // Trackers (montaje ponderado por componentes)
  const trackerComponents = TRACKER_MONTAJE_WEIGHTS.map(w => {
    const total = baselinesService.getVariableTotal(baseline, w.actividad);
    const completed = accumulated[`Trackers - Montaje de ${w.actividad}`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, total),
    };
  });
  const trackersProgress = calculateTrackersProgress(trackerComponents);
  activities.push({
    name: 'Trackers',
    progress: trackersProgress,
    completed: 0,
    total: baseline.trackers.cantidad,
  });

  // Módulos (ponderado por sub-actividades)
  const modulosTotal = baseline.modulos;
  const modulosSubActivities = MODULOS_MONTAJE_WEIGHTS.map(w => {
    const completed = accumulated[`Módulos - ${w.actividad}`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, modulosTotal),
    };
  });
  const modulosProgress = calculateModulosProgress(modulosSubActivities);
  activities.push({
    name: 'Módulos',
    progress: modulosProgress,
    completed: 0,
    total: modulosTotal,
  });

  // Cable BT/AC
  const cableBTACTotal = baseline.cableBTAC;
  const cableBTACSubActivities = CABLE_BTAC_WEIGHTS.map(w => {
    const completed = accumulated[`Obra Eléctrica - ${w.actividad} de Cable BT/AC`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, cableBTACTotal),
    };
  });
  const cableBTACProgress = calculateCableBTACProgress(cableBTACSubActivities);
  activities.push({
    name: 'Cable BT/AC',
    progress: cableBTACProgress,
    completed: 0,
    total: cableBTACTotal,
  });

  // Cable BT/CC
  const cableBTCCTotal = baseline.cableBTCC;
  const cableBTCCSubActivities = CABLE_BTCC_WEIGHTS.map(w => {
    const completed = accumulated[`Obra Eléctrica - ${w.actividad} de Cable BT/CC`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, cableBTCCTotal),
    };
  });
  const cableBTCCProgress = calculateCableBTCCProgress(cableBTCCSubActivities);
  activities.push({
    name: 'Cable BT/CC',
    progress: cableBTCCProgress,
    completed: 0,
    total: cableBTCCTotal,
  });

  // Cable MT
  const cableMTTotal = baseline.cableMT;
  const cableMTSubActivities = CABLE_MT_WEIGHTS.map(w => {
    const completed = accumulated[`Obra Eléctrica - ${w.actividad} de Cable MT`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, cableMTTotal),
    };
  });
  const cableMTProgress = calculateCableMTProgress(cableMTSubActivities);
  activities.push({
    name: 'Cable MT',
    progress: cableMTProgress,
    completed: 0,
    total: cableMTTotal,
  });

  // Inversores
  const inversoresTotal = baseline.inversores;
  const inversoresSubActivities = INVERSORES_WEIGHTS.map(w => {
    const total = w.actividad === 'Hincado' 
      ? baseline.inversores * 2 
      : baseline.inversores;
    const completed = accumulated[`Inversores - ${w.actividad}`] || 0;
    return {
      activity: w.actividad,
      progress: calculateActivityProgress(completed, total),
    };
  });
  const inversoresProgress = calculateInversoresProgress(inversoresSubActivities);
  activities.push({
    name: 'Inversores',
    progress: inversoresProgress,
    completed: 0,
    total: inversoresTotal,
  });

  // Calcular progreso total ponderado
  const overallProgress = calculateTotalProjectProgress(
    activities.map(a => ({ activity: a.name, progress: a.progress }))
  );

  return {
    projectId,
    projectName,
    overallProgress,
    activities,
  };
}

// ============================================
// INDICADORES DE SEGURIDAD
// ============================================

/**
 * Calcula indicadores de seguridad TRIR y LTIR
 */
export function calculateSafetyIndicators(
  reports: DailyReport[]
): { trir: number; ltir: number; totalIncidents: number; totalAccidents: number; workedHours: number } {
  const incidents = accumulateIncidents(reports);
  const workedHours = calculateWorkedHours(reports);

  const trir = calculateTRIR(
    incidents.incidentes,
    incidents.accidentes,
    workedHours
  );

  const ltir = calculateLTIR(
    incidents.accidentesConLesion,
    workedHours
  );

  return {
    trir: Number(trir.toFixed(2)),
    ltir: Number(ltir.toFixed(2)),
    totalIncidents: incidents.incidentes,
    totalAccidents: incidents.accidentes,
    workedHours,
  };
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Parsea una hora en formato HH:MM a minutos desde medianoche
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formatea un número como porcentaje
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Formatea un número grande con separadores de miles
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

/**
 * Formatea una fecha
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  }
  
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

