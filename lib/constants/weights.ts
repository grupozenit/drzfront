// ============================================
// PONDERACIONES PARA CÁLCULO DE AVANCE
// ============================================

/**
 * Ponderación para calcular el avance total del proyecto
 * en el tablero de control
 */
export interface ActivityWeight {
  actividad: string;
  peso: number;
}

export const PROJECT_TOTAL_PROGRESS_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Hincado', peso: 15 },
  { actividad: 'Trackers', peso: 20 },
  { actividad: 'Módulos', peso: 10 },
  { actividad: 'Cable BT/AC', peso: 25 },
  { actividad: 'Cable BT/CC', peso: 20 },
  { actividad: 'Cable MT', peso: 5 },
  { actividad: 'Inversores', peso: 5 },
];

/**
 * Ponderación para el gráfico de "Avance por Actividad"
 * en el tablero de control
 */

// Montaje de Trackers - ponderación de componentes
export const TRACKER_MONTAJE_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Soportes', peso: 20 },
  { actividad: 'Rodamientos', peso: 20 },
  { actividad: 'Tubos', peso: 25 },
  { actividad: 'Purlins', peso: 23 },
  { actividad: 'Motor', peso: 3 },
  { actividad: 'Amortiguadores', peso: 6 },
  { actividad: 'TCU', peso: 3 },
];

// Montaje de Módulos - ponderación de sub-actividades
export const MODULOS_MONTAJE_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Montaje', peso: 32 },
  { actividad: 'Torque', peso: 32 },
  { actividad: 'Seriado', peso: 18 },
  { actividad: 'Escaneado', peso: 18 },
];

// Cable BT/AC - ponderación de sub-actividades
export const CABLE_BTAC_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Excavación', peso: 33.33 },
  { actividad: 'Tendido', peso: 33.34 },
  { actividad: 'Tapado', peso: 33.33 },
];

// Cable BT/CC - ponderación de sub-actividades
export const CABLE_BTCC_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Excavación', peso: 33.33 },
  { actividad: 'Tendido', peso: 33.34 },
  { actividad: 'Tapado', peso: 33.33 },
];

// Cable MT - ponderación de sub-actividades
export const CABLE_MT_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Excavación', peso: 33.33 },
  { actividad: 'Tendido', peso: 33.34 },
  { actividad: 'Tapado', peso: 33.33 },
];

// Inversores - ponderación de sub-actividades
export const INVERSORES_WEIGHTS: ActivityWeight[] = [
  { actividad: 'Hincado', peso: 30 },
  { actividad: 'Montaje', peso: 20 },
  { actividad: 'Conexión', peso: 50 },
];

/**
 * Objeto con todas las ponderaciones por actividad
 * para facilitar el acceso
 */
export const ACTIVITY_PROGRESS_WEIGHTS: Record<string, ActivityWeight[]> = {
  'Montaje de Trackers': TRACKER_MONTAJE_WEIGHTS,
  'Montaje de Módulos': MODULOS_MONTAJE_WEIGHTS,
  'Cable BT/AC': CABLE_BTAC_WEIGHTS,
  'Cable BT/CC': CABLE_BTCC_WEIGHTS,
  'Cable MT': CABLE_MT_WEIGHTS,
  'Inversores': INVERSORES_WEIGHTS,
};

/**
 * Actividades que se muestran en el gráfico de "Avance por Actividad"
 * del Tablero de Control
 */
export const DASHBOARD_ACTIVITY_CHART_ITEMS = [
  'Hincado',
  'Trackers',
  'Módulos',
  'Cable BT/AC',
  'Cable BT/CC',
  'Cable MT',
  'Inversores',
] as const;

export type DashboardActivityChartItem = (typeof DASHBOARD_ACTIVITY_CHART_ITEMS)[number];

// ============================================
// CONSTANTES PARA CÁLCULOS DE SEGURIDAD
// ============================================

/**
 * Factor multiplicador para cálculos TRIR y LTIR
 * Estándar de la industria: 200,000 horas
 */
export const SAFETY_FACTOR = 200000;

/**
 * Calcula el TRIR (Total Recordable Incident Rate)
 * TRIR = (Total de incidentes registrables × 200,000) / Horas hombre trabajadas
 */
export function calculateTRIR(totalIncidents: number, totalAccidents: number, workedHours: number): number {
  if (workedHours === 0) return 0;
  return ((totalIncidents + totalAccidents) * SAFETY_FACTOR) / workedHours;
}

/**
 * Calcula el LTIR (Lost Time Injury Rate)
 * LTIR = (Accidentes con tiempo perdido × 200,000) / Horas hombre trabajadas
 */
export function calculateLTIR(lostTimeAccidents: number, workedHours: number): number {
  if (workedHours === 0) return 0;
  return (lostTimeAccidents * SAFETY_FACTOR) / workedHours;
}

