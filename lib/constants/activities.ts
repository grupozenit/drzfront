import type { ActivityCategory } from "@/lib/types";

// ============================================
// CATEGORÍAS DE ACTIVIDADES
// ============================================
// Única fuente de verdad del frontend: qué categorías existen, qué
// sub-actividades tiene cada una y en qué unidad se mide cada sub-actividad.
// El backend tiene la copia espejo en `src/core/activity_catalog.py` y valida
// contra ella, así que las dos tienen que decir exactamente lo mismo.
//
// Reglas:
// - La sub-actividad es obligatoria, salvo en las categorías que no tienen
//   ninguna (`movilizacion`) y en la libre (`otras`).
// - `otras` es la única de descripción y unidad libres.
// - Algunas categorías abren un tercer selector, que viaja en el campo
//   `component`: Obra Eléctrica pide el tipo de cable y Estructuras Menores el
//   componente. Cada una trae sus opciones y su etiqueta.

/** Opciones del tercer selector de Obra Eléctrica. */
export const CABLE_TYPES = [
    "Cable BT/AC",
    "Cable BT/CC",
    "Cable MT",
    "Cable FO",
    "Cable PAT",
] as const;

/** Opciones del tercer selector de Estructuras Menores. */
export const STRUCTURE_COMPONENTS = [
    "NCU",
    "EMET",
    "Pararrayos",
    "Fundación Hinca",
] as const;

export type CableType = (typeof CABLE_TYPES)[number];
export type StructureComponent = (typeof STRUCTURE_COMPONENTS)[number];

export interface SubActivityConfig {
    label: string;
    /** Unidad en la que se reporta la cantidad de esta sub-actividad. */
    unit: string;
}

export interface ActivityCategoryConfig {
    id: ActivityCategory;
    label: string;
    subActivities?: SubActivityConfig[];
    /** Unidad fija, para las categorías sin sub-actividades. */
    unit?: string;
    /** Opciones del tercer selector, que viaja en el campo `component`. */
    components?: readonly string[];
    /** Cómo se llama ese selector en el formulario. */
    componentsLabel?: string;
    /** Solo "Otras": el usuario escribe descripción y unidad. */
    isCustom?: boolean;
}

export const ACTIVITY_CATEGORIES: Record<
    ActivityCategory,
    ActivityCategoryConfig
> = {
    movilizacion: {
        id: "movilizacion",
        label: "Movilización",
        unit: "%",
    },
    cercoPerimetral: {
        id: "cercoPerimetral",
        label: "Cerco Perimetral",
        subActivities: [
            { label: "Colocación de Postes", unit: "ud" },
            { label: "Tendido de Malla", unit: "m" },
        ],
    },
    desconsolidacion: {
        id: "desconsolidacion",
        label: "Desconsolidación",
        subActivities: [
            { label: "Hincas", unit: "camión" },
            { label: "Trackers", unit: "camión" },
            { label: "Módulos", unit: "camión" },
            { label: "Inversores", unit: "camión" },
            { label: "Bobinas", unit: "camión" },
            { label: "CTs", unit: "camión" },
            { label: "Otros", unit: "camión" },
        ],
    },
    preparacionTerreno: {
        id: "preparacionTerreno",
        label: "Preparación de Terreno",
        subActivities: [
            { label: "Desbroce", unit: "ha" },
            { label: "Nivelación de Terreno", unit: "ha" },
        ],
    },
    caminos: {
        id: "caminos",
        label: "Caminos",
        subActivities: [
            { label: "Apertura de Traza", unit: "m" },
            { label: "Subbase", unit: "m" },
            { label: "Base", unit: "m" },
            { label: "Drenajes", unit: "m" },
        ],
    },
    hincado: {
        id: "hincado",
        label: "Hincado",
        subActivities: [
            { label: "Ponchado", unit: "ud" },
            { label: "Distribución", unit: "ud" },
            { label: "Hincado", unit: "ud" },
            { label: "Calidad de Hincado", unit: "ud" },
            { label: "POT", unit: "ud" },
            { label: "Mecanizados", unit: "ud" },
            { label: "Pre-Drilling", unit: "ud" },
            { label: "Micropilote", unit: "ud" },
        ],
    },
    trackers: {
        id: "trackers",
        label: "Trackers",
        subActivities: [
            { label: "Distribución de Tubos", unit: "trk" },
            { label: "Montaje", unit: "trk" },
            { label: "Torque de Estructura", unit: "trk" },
            { label: "Machinado", unit: "trk" },
        ],
    },
    modulos: {
        id: "modulos",
        label: "Módulos",
        subActivities: [
            { label: "Distribución", unit: "trk" },
            { label: "Montaje", unit: "trk" },
            { label: "Torque de Módulos", unit: "trk" },
            { label: "Seriado", unit: "trk" },
        ],
    },
    obraElectrica: {
        id: "obraElectrica",
        label: "Obra Eléctrica",
        subActivities: [
            { label: "Excavación", unit: "m" },
            { label: "Tendido", unit: "m" },
            { label: "Tapado", unit: "m" },
            { label: "Terminales", unit: "ud" },
        ],
        components: CABLE_TYPES,
        componentsLabel: "Tipo de Cable",
    },
    inversores: {
        id: "inversores",
        label: "Inversores",
        subActivities: [
            { label: "Hincado", unit: "ud" },
            { label: "Montaje", unit: "ud" },
            { label: "Conexionado", unit: "ud" },
        ],
    },
    ensayos: {
        id: "ensayos",
        label: "Ensayos",
        subActivities: [
            { label: "Resistencia del Aislamiento", unit: "inv" },
            { label: "VOC String", unit: "inv" },
            { label: "VOC TCU", unit: "inv" },
            { label: "VLF", unit: "fase" },
            { label: "PAT", unit: "inv" },
        ],
    },
    cts: {
        id: "cts",
        label: "CTs",
        subActivities: [
            { label: "Excavación", unit: "ud" },
            { label: "Armadura", unit: "ud" },
            { label: "Encofrado", unit: "ud" },
            { label: "Hormigonado/Montaje Premoldeados", unit: "ud" },
            { label: "Montaje", unit: "ud" },
            { label: "Conexionado BT/CA", unit: "ud" },
            { label: "Conexionado MT", unit: "ud" },
        ],
    },
    estructurasMenores: {
        id: "estructurasMenores",
        label: "Estructuras Menores",
        components: STRUCTURE_COMPONENTS,
        componentsLabel: "Componentes",
        subActivities: [
            { label: "Excavación", unit: "ud" },
            { label: "Armadura", unit: "ud" },
            { label: "Encofrado", unit: "ud" },
            { label: "Hormigonado", unit: "ud" },
            { label: "Montaje", unit: "ud" },
            { label: "Conexionado", unit: "ud" },
        ],
    },
    cmm: {
        id: "cmm",
        label: "CMM",
        subActivities: [
            { label: "Excavación", unit: "ud" },
            { label: "Armadura", unit: "ud" },
            { label: "Encofrado", unit: "ud" },
            { label: "Hormigonado", unit: "ud" },
            { label: "Montaje/Construcción de Edificio", unit: "ud" },
            { label: "Montaje de Equipos/Tableros", unit: "ud" },
            { label: "Conexionado", unit: "ud" },
        ],
    },
    lamt: {
        id: "lamt",
        label: "LAMT",
        subActivities: [
            { label: "Fundaciones", unit: "ud" },
            { label: "Montaje de Postes", unit: "ud" },
            { label: "Tendido de Cable MT/CA", unit: "m" },
        ],
    },
    comisionado: {
        id: "comisionado",
        label: "Comisionado",
        subActivities: [
            { label: "Precomisionado Trackers", unit: "ud" },
            { label: "Precomisionado Inversores", unit: "ud" },
            { label: "Precomisionado Centros de Transformación", unit: "ud" },
            { label: "Precomisionado Sistema de 33 kV", unit: "gl" },
            { label: "Comisionado CMM", unit: "gl" },
        ],
    },
    otras: {
        id: "otras",
        label: "Otras",
        isCustom: true,
    },
};

/** Sub-actividades válidas de una categoría (vacío si no tiene). */
export function subActivityLabels(category: ActivityCategory): string[] {
    return ACTIVITY_CATEGORIES[category]?.subActivities?.map((s) => s.label) ?? [];
}

/**
 * Unidad que corresponde a una categoría/sub-actividad.
 * Devuelve "" para "Otras", donde la unidad la escribe el usuario.
 */
export function unitFor(
    category: ActivityCategory,
    subActivity?: string,
): string {
    const cat = ACTIVITY_CATEGORIES[category];
    if (!cat || cat.isCustom) return "";
    const sub = cat.subActivities?.find((s) => s.label === subActivity);
    return sub?.unit ?? cat.unit ?? "";
}

/** Opciones del tercer selector de una categoría (vacío si no tiene). */
export function componentOptions(category: ActivityCategory): readonly string[] {
    return ACTIVITY_CATEGORIES[category]?.components ?? [];
}

/** Cómo se llama el tercer selector de una categoría. */
export function componentLabel(category: ActivityCategory): string {
    return ACTIVITY_CATEGORIES[category]?.componentsLabel ?? "Componente";
}

/** True si la categoría abre el tercer selector. */
export function acceptsComponent(category: ActivityCategory): boolean {
    return componentOptions(category).length > 0;
}

// Lista de categorías para filtros y selectores
export const ACTIVITY_CATEGORY_LIST = Object.values(ACTIVITY_CATEGORIES);

// Categorías para el selector de reportes (sin "otras")
export const REPORT_FILTER_CATEGORIES = ACTIVITY_CATEGORY_LIST.filter(
    (cat) => cat.id !== "otras",
);

// ============================================
// TIPOS DE MAQUINARIA
// ============================================

export const MACHINE_TYPES = [
    "Manipulador Telescópico",
    "Grúa",
    "Excavadora",
    "Retroexcavadora",
    "Camión",
    "Camioneta",
    "Combi",
    "Minicargador",
    "Rodillo Compactador",
    "Generador",
    "Compresor",
    "Otro",
] as const;

export type MachineType = (typeof MACHINE_TYPES)[number];

// Tipos de maquinaria que son vehículos (piden patente, chofer y RTO/VTV)
export const VEHICLE_MACHINE_TYPES = ["Camión", "Camioneta", "Combi"] as const;

const VEHICLE_KEYWORDS = ["camion", "camión", "camioneta", "combi", "pickup", "utilitario"];

export function isVehicleType(tipo?: string | null): boolean {
    if (!tipo) return false;
    const tipoLower = tipo.toLowerCase();
    return VEHICLE_KEYWORDS.some((k) => tipoLower.includes(k));
}

// ============================================
// TIPOS DE EQUIPOS Y HERRAMIENTAS
// ============================================

export const EQUIPMENT_TYPES = [
    "Generador",
    "Tablero Eléctrico",
    "Estación Total",
    "GPS",
    "Drone",
    "Multímetro",
    "Compresor",
    "Soldadora",
    "Bomba",
    "Taladro",
    "Amoladora",
    "Sierra Circular",
    "Pistola de Calor",
    "Equipo POT (Pull Out Test)",
    "Otro",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const POT_EQUIPMENT_TYPE = "Equipo POT (Pull Out Test)";

const POT_KEYWORDS = ["pot", "pull out test"];

export function isPotEquipment(tipo?: string | null): boolean {
    if (!tipo) return false;
    const tipoLower = tipo.toLowerCase();
    return POT_KEYWORDS.some((k) => tipoLower.includes(k));
}

// ============================================
// ETIQUETAS DE CLIMA
// ============================================

export const WEATHER_LABELS: Record<string, string> = {
    sunny: "Soleado",
    cloudy: "Nublado",
    rainy: "Lluvia",
    stormy: "Tormenta",
    snow: "Nieve",
    hail: "Granizo",
};

// ============================================
// ETIQUETAS DE ROLES
// ============================================

export const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    manager: "Gestor",
    worker: "Trabajador",
};

// ============================================
// ETIQUETAS DE ESTADO DE REPORTE
// ============================================

export const REPORT_STATUS_LABELS: Record<string, string> = {
    enviado: "Enviado",
    borrador: "Borrador",
    archivado: "Archivado",
};

// ============================================
// TIPOS DE LICENCIA DE CONDUCIR (choferes y operadores)
// ============================================

export const LICENSE_TYPES = [
    "B1", "B2",
    "C1", "C2", "C3",
    "D1", "D2", "D3",
    "E1", "E2",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

export const LICENSE_LABELS: Record<string, string> = {
    B1: "B1 — Automóviles y camionetas",
    B2: "B2 — Automóviles con acoplado",
    C1: "C1 — Camiones sin acoplado",
    C2: "C2 — Camiones con acoplado",
    C3: "C3 — Camiones articulados",
    D1: "D1 — Transporte de pasajeros hasta 8",
    D2: "D2 — Transporte de pasajeros más de 8",
    D3: "D3 — Servicios de emergencia",
    E1: "E1 — Maquinaria especial no agrícola",
    E2: "E2 — Maquinaria especial con acoplado",
};

/** Etiqueta legible de un tipo de licencia (o el propio código si no está mapeado). */
export function licenseLabel(tipo?: string | null): string {
    if (!tipo) return "—";
    return LICENSE_LABELS[tipo] || tipo;
}
