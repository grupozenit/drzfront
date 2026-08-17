import type { ActivityCategory } from "@/lib/types";

// ============================================
// CATEGORÍAS DE ACTIVIDADES
// ============================================

export interface ActivityCategoryConfig {
    id: ActivityCategory;
    label: string;
    subActivities?: string[];
    components?: string[];
    unit?: string;
    getUnit?: (subActivity: string) => string;
    isCustom?: boolean;
}

export const ACTIVITY_CATEGORIES: Record<
    ActivityCategory,
    ActivityCategoryConfig
> = {
    hincas: {
        id: "hincas",
        label: "Hincas",
        subActivities: ["Replanteo", "Distribución", "Hincado", "Pre-Drilling"],
        unit: "unidades",
    },
    trackers: {
        id: "trackers",
        label: "Trackers",
        subActivities: [
            "Pre-Armado",
            "Distribución",
            "Montaje",
            "Alineación",
            "Torque",
        ],
        components: [
            "Soportes",
            "Rodamientos",
            "Tubos",
            "Purlins",
            "Motor",
            "Amortiguadores",
            "TCU",
        ],
        unit: "unidades",
    },
    modulos: {
        id: "modulos",
        label: "Módulos",
        subActivities: [
            "Distribución",
            "Montaje",
            "Torque",
            "Seriado",
            "Escaneado",
        ],
        unit: "unidades",
    },
    calidad: {
        id: "calidad",
        label: "Calidad",
        subActivities: [
            "Revire",
            "Limado",
            "Galvanizado",
            "Mecanizado",
            "Pull Out Test",
        ],
        unit: "unidades",
    },
    obraElectrica: {
        id: "obraElectrica",
        label: "Obra Eléctrica",
        subActivities: [
            "Replanteo",
            "Excavación",
            "Tendido",
            "Tapado",
            "Confección Terminales MC4",
        ],
        components: [
            "Cable BT/AC",
            "Cable BT/CC",
            "Cable MT",
            "Cable FO",
            "Cable PAT",
        ],
        getUnit: (subActivity: string) => {
            const metrosActivities = [
                "Replanteo",
                "Excavación",
                "Tendido",
                "Tapado",
            ];
            return metrosActivities.includes(subActivity)
                ? "metros"
                : "unidades";
        },
    },
    ensayos: {
        id: "ensayos",
        label: "Ensayos",
        subActivities: [
            "Continuidad",
            "Polaridad",
            "Megado",
            "Medición de VOC",
        ],
        unit: "unidades",
    },
    inversores: {
        id: "inversores",
        label: "Inversores",
        subActivities: ["Replanteo", "Hincado", "Montaje", "Conexión"],
        unit: "unidades",
    },
    cts: {
        id: "cts",
        label: "CTs",
        subActivities: [
            "Replanteo",
            "Excavación",
            "Armadura",
            "Encofrado",
            "Hormigonado",
            "Montaje",
        ],
        unit: "unidades",
    },
    preComisionamiento: {
        id: "preComisionamiento",
        label: "Pre-Comisionamiento",
        subActivities: ["Inversores", "CTs", "Trackers"],
        unit: "unidades",
    },
    otras: {
        id: "otras",
        label: "Otras",
        isCustom: true,
    },
};

// Lista de categorías para filtros y selectores
export const ACTIVITY_CATEGORY_LIST = Object.values(ACTIVITY_CATEGORIES);

// Categorías para el selector de reportes (sin "otras")
export const REPORT_FILTER_CATEGORIES = ACTIVITY_CATEGORY_LIST.filter(
    (cat) => cat.id !== "otras",
);

// ============================================
// MAPEO DE ACTIVIDADES A VARIABLES DE LÍNEA BASE
// Esto determina de qué campo de la línea base se obtiene el total
// ============================================

export interface BaselineActivityMapping {
    categoria: string;
    actividades: Array<{
        actividad: string;
        variable: string;
        subcategorias?: Array<{
            actividad: string;
            variable: string;
        }>;
    }>;
}

export const BASELINE_ACTIVITY_MAPPING: BaselineActivityMapping[] = [
    {
        categoria: "Hincas",
        actividades: [
            { actividad: "Replanteo", variable: "Hincas" },
            { actividad: "Distribución", variable: "Hincas" },
            { actividad: "Hincado", variable: "Hincas" },
        ],
    },
    {
        categoria: "Trackers",
        actividades: [
            {
                actividad: "Distribución",
                variable: "Trackers",
                subcategorias: [
                    { actividad: "Soportes", variable: "Soportes" },
                    { actividad: "Rodamientos", variable: "Rodamientos" },
                    { actividad: "Tubos", variable: "Tubos" },
                    { actividad: "Purlins", variable: "Purlins" },
                    { actividad: "Motor", variable: "Motor" },
                    { actividad: "Amortiguadores", variable: "Amortiguador" },
                    { actividad: "TCU", variable: "TCU" },
                ],
            },
            {
                actividad: "Montaje",
                variable: "Trackers",
                subcategorias: [
                    { actividad: "Soportes", variable: "Soportes" },
                    { actividad: "Rodamientos", variable: "Rodamientos" },
                    { actividad: "Tubos", variable: "Tubos" },
                    { actividad: "Purlins", variable: "Purlins" },
                    { actividad: "Motor", variable: "Motor" },
                    { actividad: "Amortiguador", variable: "Amortiguador" },
                    { actividad: "TCU", variable: "TCU" },
                ],
            },
        ],
    },
    {
        categoria: "Módulos",
        actividades: [
            { actividad: "Montaje", variable: "Módulos" },
            { actividad: "Torque", variable: "Módulos" },
            { actividad: "Seriado", variable: "Módulos" },
            { actividad: "Escaneado", variable: "Módulos" },
        ],
    },
    {
        categoria: "Montaje Eléctrico",
        actividades: [
            { actividad: "Replanteo De Zanja BT/AC", variable: "Cable BT/AC" },
            { actividad: "Replanteo De Zanja BT/CC", variable: "Cable BT/CC" },
            { actividad: "Replanteo De Zanja MT", variable: "Cable MT" },
            { actividad: "Excavación De Zanja BT/AC", variable: "Cable BT/AC" },
            { actividad: "Excavación De Zanja BT/CC", variable: "Cable BT/CC" },
            { actividad: "Excavación De Zanja MT", variable: "Cable MT" },
            { actividad: "Tendido De Cable BT/AC", variable: "Cable BT/AC" },
            { actividad: "Tendido De Cable BT/CC", variable: "Cable BT/CC" },
            { actividad: "Tendido De Cable MT", variable: "Cable MT" },
            { actividad: "Tendido De Cable Solar", variable: "Trackers" },
            { actividad: "Tapado De Zanja BT/AC", variable: "Cable BT/AC" },
            { actividad: "Tapado De Zanja BT/CC", variable: "Cable BT/CC" },
            { actividad: "Tapado De Zanja MT", variable: "Cable MT" },
            { actividad: "Instalación TCU", variable: "TCU" },
        ],
    },
    {
        categoria: "Inversores",
        actividades: [
            { actividad: "Replanteo", variable: "2*Inversores" },
            { actividad: "Hincado", variable: "2*Inversores" },
            { actividad: "Montaje", variable: "Inversores" },
            { actividad: "Conexión", variable: "Inversores" },
        ],
    },
    {
        categoria: "CTs",
        actividades: [
            { actividad: "Replanteo", variable: "CTs" },
            { actividad: "Excavación", variable: "CTs" },
            { actividad: "Armadura", variable: "CTs" },
            { actividad: "Encofrado", variable: "CTs" },
            { actividad: "Hormigonado", variable: "CTs" },
            { actividad: "Montaje", variable: "CTs" },
        ],
    },
    {
        categoria: "Pre-Comisionamiento",
        actividades: [
            { actividad: "Inversores", variable: "Inversores" },
            { actividad: "CTs", variable: "CTs" },
            { actividad: "Trackers", variable: "Trackers" },
        ],
    },
];

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
    "Minicargador",
    "Rodillo Compactador",
    "Generador",
    "Compresor",
    "Otro",
] as const;

export type MachineType = (typeof MACHINE_TYPES)[number];

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
    "Otro",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

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
