// ============================================
// TIPOS BASE
// ============================================

// Espejo de src.core.permissions.Role en el backend.
export type UserRole = 'tecnologia' | 'gerente_general' | 'gerente_proyecto' | 'jefe_obra' | 'compras' | 'sin_rol';
export type MachineStatus = 'activa' | 'baja';
export type MachineOwnership = 'propio' | 'subcontrato';
export type EquipmentOwnership = 'propio' | 'alquilado';
export type ReportStatus = 'enviado' | 'borrador' | 'archivado';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snow' | 'hail';

// ============================================
// EMPRESA
// ============================================

export interface Company {
  id: string;
  name: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDTO {
  name: string;
  logo?: string;
}

// ============================================
// USUARIO / EQUIPO
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  projectIds: string[];
  joinDate: string;
}

export interface InviteTeamMemberDTO {
  email: string;
  role: UserRole;
}

export interface UpdateTeamMemberDTO {
  name?: string;
  role?: UserRole;
}

export interface UpdateRoleDTO {
  role: UserRole;
}

export interface UpdateProjectAssignmentsDTO {
  projectIds: string[];
}

// ============================================
// PERMISOS
// ============================================

// Espejo de src.core.permissions.Resource/Action en el backend.
export type PermissionResource =
  | 'tablero' | 'avances' | 'reportes' | 'reportes_semanales' | 'flota'
  | 'maquinaria' | 'equipos' | 'choferes' | 'proyectos' | 'totales'
  | 'usuarios' | 'configuracion';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export type PermissionScope = 'all' | 'assigned';

export interface MeResponse {
  userId: string;
  userName: string;
  role: UserRole;
  scope: PermissionScope;
  projectIds: string[] | null;
  landing: string;
  permissions: Partial<Record<PermissionResource, PermissionAction[]>>;
  orgHasProjects: boolean;
}

// ============================================
// PROYECTO
// ============================================

export interface Project {
  id: string;
  name: string;
  companyId: string;
  hasBaseline: boolean;
  /** Tiene al menos un parte diario enviado. Tablero y Avances ocultan los que no. */
  hasReports: boolean;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'paused';
  startDate?: string | null; // Fecha de inicio del proyecto (YYYY-MM-DD)
  signatureName?: string;
  signaturePosition?: string;
  signatureImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDTO {
  name: string;
}

export interface UpdateProjectDTO {
  name?: string;
  startDate?: string | null;
  signatureName?: string;
  signaturePosition?: string;
}

// ============================================
// REPORTES SEMANALES
// ============================================

export type WeeklyReportStatus = 'generado' | 'generando' | 'error';

export interface WeeklyReport {
  id: string;
  projectId: string;
  projectName: string;
  companyId: string;
  // Correlativo del informe dentro del proyecto (1, 2, 3...), sin huecos.
  // Distinto de weekNumber, que es la semana de proyecto y sí los tiene.
  reportNumber: number | null;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  overallProgress: number;
  weeklyProgress: number;
  trackerProgress: number;
  modulosProgress: number;
  pdfUrl: string | null;
  pdfFilename: string | null;
  status: WeeklyReportStatus;
  errorMessage?: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface WeeklyReportListResponse {
  reports: WeeklyReport[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WeeklyReportFilters {
  projectId?: string;
  year?: number;
}

// Curva Teórica
//
// Lo que se carga es el plan POR ACTIVIDAD: cuánto debería llevar avanzada cada
// una al final de cada semana. La curva S del proyecto NO se carga: el backend
// la deriva ponderando esas series con el peso de cada actividad en el alcance
// (el mismo peso con el que se mide el avance real) y la devuelve en
// `dataPoints`, de solo lectura.
export interface TheoreticalCurveDataPoint {
  weekNumber: number;
  cumulativeProgress: number;
}

/** El plan de una actividad, con su nombre y su peso ya resueltos. */
export interface TheoreticalActivityCurve {
  category: ActivityCategory;
  name: string;
  /** Cuánto pesa la actividad en este proyecto (%). Lo calcula el backend. */
  weight: number;
  points: TheoreticalCurveDataPoint[];
}

/** Actividad del alcance que quedó sin plan teórico. */
export interface UncoveredActivity {
  category: ActivityCategory;
  name: string;
  weight: number;
}

export interface TheoreticalCurve {
  id: string;
  projectId: string;
  activities: TheoreticalActivityCurve[];
  /** Curva del proyecto, derivada. No se puede escribir. */
  dataPoints: TheoreticalCurveDataPoint[];
  totalWeeks: number | null;
  /** % del peso del proyecto que tiene plan cargado. */
  coverage: number;
  uncoveredActivities: UncoveredActivity[];
  /** Sin Totales cargados no hay con qué ponderar y `dataPoints` viene vacío. */
  hasTotals: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurveImportResult {
  projectId: string;
  /** Actividades con plan cargado. */
  activities: number;
  /** Última semana planificada. */
  totalWeeks: number;
  rowsRead: number;
  cellsRead: number;
}

export interface CreateTheoreticalCurveDTO {
  activities: Array<{
    category: ActivityCategory;
    points: TheoreticalCurveDataPoint[];
  }>;
}

// ============================================
// TOTALES DEL PROYECTO (el alcance de obra)
// ============================================
// Reemplazan a la vieja línea base. Se cargan subiendo la plantilla Excel:
// una fila por ítem del catálogo, con su cantidad contractual y si aplica.

export interface ProjectTotalItem {
  id: string;
  category: ActivityCategory;
  categoryLabel: string;
  subActivity: string;
  /** Tipo de cable o componente, según la categoría. "" si no lleva. */
  component: string;
  /** Nombre completo: "Obra Eléctrica - Tendido de Cable MT". */
  label: string;
  unit: string;
  totalQuantity: number;
  applies: boolean;
}

export interface ProjectTotals {
  projectId: string;
  hasTotals: boolean;
  updatedAt: string | null;
  items: ProjectTotalItem[];
}

export interface TotalsImportResult {
  projectId: string;
  rowsRead: number;
  importedItems: number;
  notApplicable: number;
  missingItems: number;
}

/** Una fila del Excel que el backend no pudo leer. */
export interface TotalsImportError {
  row: number;
  column: string;
  code: string;
  message: string;
  value?: string;
}

// ============================================
// ACTIVIDADES
// ============================================

// Los IDs y su orden salen de ACTIVITY_CATEGORIES (lib/constants/activities.ts),
// que es el espejo de src/core/activity_catalog.py en el backend.
export type ActivityCategory =
  | 'movilizacion'
  | 'cercoPerimetral'
  | 'desconsolidacion'
  | 'preparacionTerreno'
  | 'caminos'
  | 'hincado'
  | 'trackers'
  | 'modulos'
  | 'obraElectrica'
  | 'inversores'
  | 'ensayos'
  | 'cts'
  | 'cctv'
  | 'estructurasMenores'
  | 'cmm'
  | 'lamt'
  | 'comisionado'
  | 'otras';

export interface ActivityEntry {
  id: string;
  category: ActivityCategory;
  subActivity: string;
  /** Solo Obra Eléctrica: tipo de cable. Antes eran los componentes de tracker. */
  component?: string;
  description: string;
  quantity: number;
  unit: string;
  location: string;
  workers: number;
  observations: string;
}

// ============================================
// REPORTE DIARIO
// ============================================

export interface DailyReport {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  isHoliday: boolean;
  entryTime: string;
  exitTime: string;
  indirectStaff: number;
  directStaff: number;
  machineryCount?: number;
  weather: WeatherType;
  hasSuspendedHours: boolean;
  suspendedHours?: number;
  suspendedReason?: string;
  hasAccident: boolean;
  accidentWithInjury?: boolean;
  accidentDescription?: string;
  activities: ActivityEntry[];
  tomorrowTasks: string[];
  images: string[]; // URLs de imágenes
  status: ReportStatus;
  /** Correlativo por proyecto (1, 2, 3...). Null mientras sea borrador. */
  reportNumber: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateReportDTO {
  projectId: string;
  date: string;
  isHoliday: boolean;
  entryTime: string;
  exitTime: string;
  indirectStaff: number;
  directStaff: number;
  machineryCount?: number;
  weather: WeatherType;
  hasSuspendedHours: boolean;
  suspendedHours?: number;
  suspendedReason?: string;
  hasAccident: boolean;
  accidentWithInjury?: boolean;
  accidentDescription?: string;
  activities: Omit<ActivityEntry, 'id'>[];
  tomorrowTasks: string[];
  images?: File[];
  status: ReportStatus;
}

export interface UpdateReportDTO extends Partial<CreateReportDTO> {}

export interface ReportFilters {
  projectId?: string;
  activityCategory?: ActivityCategory;
  startDate?: string;
  endDate?: string;
  status?: ReportStatus;
}

// ============================================
// MAQUINARIA
// ============================================

export type RtoEstado = 'vigente' | 'por_vencer' | 'vencido';

export interface Machine {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  codigoInterno: string;
  patente?: string | null;
  numeroChasis?: string | null;
  anio?: number | null;
  capacidad: string;
  propiedad: MachineOwnership;
  observaciones: string;
  proyectoId: string | null;
  proyectoName?: string;
  estado: MachineStatus;
  companyId: string;
  createdAt: string;
  updatedAt: string;

  choferId?: string | null;
  /** Nombre completo del chofer asignado. Derivado en el backend: solo lectura. */
  choferResponsable?: string | null;
  vencimientoRto?: string | null;
  tieneGps: boolean;
  tieneTelepase: boolean;
  ultimoService?: string | null;

  rtoEstado?: RtoEstado | null;
  rtoDiasRestantes?: number | null;
  incidenciasAbiertas: number;
  requiereCertificacion: boolean;
  tieneCertificacion: boolean;
  vencimientoCertificacion?: string | null;
  certificacionEstado?: RtoEstado | null;
  certificacionDiasRestantes?: number | null;
}

export interface CreateMachineDTO {
  tipo: string;
  marca: string;
  modelo: string;
  codigoInterno: string;
  patente?: string | null;
  numeroChasis?: string | null;
  anio?: number | null;
  capacidad?: string;
  propiedad: MachineOwnership;
  observaciones?: string;
  proyectoId?: string | null;
  choferId?: string | null;
  vencimientoRto?: string | null;
  tieneGps?: boolean;
  tieneTelepase?: boolean;
  tieneCertificacion?: boolean;
  vencimientoCertificacion?: string | null;
  ultimoService?: string | null;
}

export interface UpdateMachineDTO extends Partial<CreateMachineDTO> {}

export interface MachineFilters {
  projectId?: string | 'none';
  status?: MachineStatus | 'all';
}

export type NoteTipo = 'incidente' | 'observacion' | 'reparacion' | 'seguimiento';
export type NoteEstado = 'abierta' | 'resuelta';

export interface AssetNote {
  id: string;
  parentId: string | null;
  tipo: NoteTipo;
  descripcion: string;
  fecha: string;
  estado: NoteEstado;
  resueltaAt: string | null;
  userId: string;
  userName: string;
  createdAt: string;
  replies: AssetNote[];
}

export interface CreateNoteDTO {
  tipo: NoteTipo;
  descripcion: string;
  fecha: string;
  parentId?: string | null;
}

export interface UpdateNoteDTO extends Partial<Omit<CreateNoteDTO, 'parentId'>> {
  estado?: NoteEstado;
}

export type MachineryExpirationKind = 'rto' | 'certificacion';

export interface MachineryExpirationAlert {
  id: string;
  codigoInterno?: string | null;
  tipo: string;
  marca: string;
  modelo: string;
  patente?: string | null;
  choferId?: string | null;
  choferResponsable?: string | null;
  tipoVencimiento: MachineryExpirationKind;
  vencimiento: string;
  /** Solo poblado en las filas de RTO. Para mostrar la fecha usá `vencimiento`. */
  vencimientoRto?: string | null;
  estado: RtoEstado;
  diasRestantes: number;
  proyectoName?: string | null;
}

// ============================================
// CHOFERES Y OPERADORES
// ============================================

export type DriverStatus = 'activo' | 'baja';

export interface Driver {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  /** Clases de licencia, en orden canónico (un chofer puede tener varias). */
  tiposLicencia: string[];
  /** Texto para mostrar: "C1, E2". Derivado en el backend. */
  tipoLicencia: string;
  cuit: string;
  email?: string | null;
  estado: DriverStatus;
  vehiculosAsignados: number;
  proyectoId?: string | null;
  proyectoName?: string | null;
  /** Asignado a un proyecto fuera del alcance del usuario: id y nombre vienen ocultos. */
  proyectoOculto?: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  vencimientoLicencia?: string | null;
  licenciaEstado?: RtoEstado | null;
  licenciaDiasRestantes?: number | null;
  requiereCertificacion: boolean;
  tieneCertificacion: boolean;
  vencimientoCertificacion?: string | null;
  certificacionEstado?: RtoEstado | null;
  certificacionDiasRestantes?: number | null;
}

export interface CreateDriverDTO {
  nombre: string;
  apellido: string;
  tiposLicencia: string[];
  cuit: string;
  email?: string | null;
  vencimientoLicencia?: string | null;
  tieneCertificacion?: boolean;
  vencimientoCertificacion?: string | null;
  /** Proyecto asignado; null = sin asignar. */
  proyectoId?: string | null;
}

export interface UpdateDriverDTO extends Partial<CreateDriverDTO> {}

export interface DriverFilters {
  status?: DriverStatus | 'all';
  licenseType?: string | 'all';
  projectId?: string | 'none' | 'all';
}

export type DriverExpirationKind = 'licencia' | 'certificacion';

export interface DriverExpirationAlert {
  id: string;
  nombreCompleto: string;
  tipoLicencia: string;
  cuit: string;
  tipoVencimiento: DriverExpirationKind;
  vencimiento: string;
  estado: RtoEstado;
  diasRestantes: number;
}

export interface DriverEventLogEntry {
  id: string;
  driverId: string;
  eventType: 'alta' | 'edicion' | 'baja' | 'reactivacion';
  userId: string;
  userName: string;
  companyId: string;
  createdAt: string;
}

// ============================================
// EQUIPOS Y HERRAMIENTAS
// ============================================

export interface Equipment {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  codigoInterno: string;
  capacidad: string;
  propiedad: EquipmentOwnership;
  observaciones: string;
  proyectoId: string | null;
  proyectoName?: string;
  estado: MachineStatus;
  companyId: string;
  createdAt: string;
  updatedAt: string;

  ultimaMantencion?: string | null;
  fechaCompra?: string | null;
  fechaUltimaCalibracion?: string | null;
  incidenciasAbiertas: number;
}

export interface CreateEquipmentDTO {
  tipo: string;
  marca: string;
  modelo: string;
  codigoInterno: string;
  capacidad?: string;
  propiedad: EquipmentOwnership;
  observaciones?: string;
  proyectoId?: string | null;
  ultimaMantencion?: string | null;
  fechaCompra?: string | null;
  fechaUltimaCalibracion?: string | null;
}

export interface UpdateEquipmentDTO extends Partial<CreateEquipmentDTO> {}

export interface EventLogEntry {
  id: string;
  eventType: 'alta' | 'asignacion' | 'desasignacion' | 'baja' | 'reactivacion' | 'service' | 'rto' | 'mantencion' | 'incidencia' | 'resolucion';
  userId: string;
  userName: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
}

// ============================================
// DASHBOARD / ESTADÍSTICAS
// ============================================

export interface DashboardSummary {
  totalDirectStaff: number;
  totalIndirectStaff: number;
  projectsInProgress: number;
  activeMachinery: number;
}

export interface PersonnelHistoryEntry {
  date: string;
  directos: number;
  indirectos: number;
}

export interface ProjectPersonnelHistory {
  projectId: string;
  projectName: string;
  history: PersonnelHistoryEntry[];
}

export interface SuspendedHoursEntry {
  date: string;
  hours: number;
}

export interface ProjectSuspendedHours {
  projectId: string;
  projectName: string;
  history: SuspendedHoursEntry[];
}

export interface ActivityProgress {
  /** Cuánto pesa la categoría en el avance general de este proyecto. */
  weight?: number;
  name: string;
  progress: number; // 0-100
  completed: number; // Cantidad completada
  total: number; // Cantidad total de línea base
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  overallProgress: number;
  activities: ActivityProgress[];
}

export interface ManHoursEntry {
  month: string; // YYYY-MM
  monthLabel: string; // "Ago 2026"
  manHours: number;
  reportedDays: number;
}

export interface ProjectManHours {
  projectId: string;
  projectName: string;
  totalManHours: number;
  history: ManHoursEntry[];
}

export interface ProjectMachinery {
  projectId: string;
  projectName: string;
  machines: Machine[];
}

export interface MachineryHistoryEntry {
  date: string;
  count: number;
}

export interface ProjectMachineryHistory {
  projectId: string;
  projectName: string;
  history: MachineryHistoryEntry[];
}

// ============================================
// TABLERO DE FLOTA (Maquinaria y Equipos)
// ============================================

export interface FleetCategorySummary {
  total: number;
  activas?: number;
  activos?: number;
  asignadas?: number;
  asignados?: number;
  disponibles: number;
  baja: number;
  propias?: number;
  propios?: number;
  subcontrato?: number;
  alquilados?: number;
}

export interface FleetSummary {
  maquinaria: FleetCategorySummary;
  equipos: FleetCategorySummary;
}

export interface FleetMaintenanceEntry {
  tipoActivo: 'maquinaria' | 'equipo';
  id: string;
  codigoInterno?: string | null;
  tipo: string;
  marca: string;
  modelo: string;
  ultimaFecha: string | null;
  diasDesde: number | null;
}

export interface FleetProjectDistribution {
  projectId: string | null;
  projectName: string;
  maquinaria: number;
  equipos: number;
}

export interface FleetTypeCount {
  tipo: string;
  cantidad: number;
}

export interface FleetTypeDistribution {
  maquinaria: FleetTypeCount[];
  equipos: FleetTypeCount[];
}

export interface FleetVehicle {
  id: string;
  codigoInterno?: string | null;
  tipo: string;
  patente?: string | null;
  choferResponsable?: string | null;
  vencimientoRto?: string | null;
  rtoEstado?: RtoEstado | null;
  rtoDiasRestantes?: number | null;
  tieneGps: boolean;
  tieneTelepase: boolean;
  proyectoName?: string | null;
}

export interface FleetOpenIncident {
  tipoActivo: 'maquinaria' | 'equipo';
  activoId: string;
  codigoInterno?: string | null;
  tipo: string;
  marca: string;
  modelo: string;
  proyectoName?: string | null;
  noteId: string;
  noteTipo: NoteTipo;
  fecha: string;
  diasAbierta: number;
  descripcion: string;
}

export interface FleetDashboard {
  summary: FleetSummary;
  rtoAlerts: MachineryExpirationAlert[];
  mantenimientoPendiente: FleetMaintenanceEntry[];
  porProyecto: FleetProjectDistribution[];
  porTipo: FleetTypeDistribution;
  vehiculos: FleetVehicle[];
  incidenciasAbiertas: FleetOpenIncident[];
}

// ============================================
// DASHBOARD - ACTIVIDAD Y CURVA S
// ============================================

export interface ActivityBreakdownWeek {
  weekStart: string;
  weekLabel: string;
  activities: Record<string, number>;
}

export interface ProjectActivityBreakdown {
  projectId: string;
  projectName: string;
  breakdown: ActivityBreakdownWeek[];
}

export interface SCurvePoint {
  weekNumber: number;
  weekStart: string;
  cumulativeProgress: number;
}

export interface ProjectSCurve {
  projectId: string;
  projectName: string;
  real: SCurvePoint[];
  /** Derivada del plan por actividad. Null si no hay plan o no hay Totales. */
  theoretical: TheoreticalCurveDataPoint[] | null;
  /** % del peso del proyecto con plan cargado: por debajo de 100 la teórica
   *  no llega a 100 y el desvío se lee mejor de lo que es. */
  theoreticalCoverage: number;
}

// ============================================
// AVANCES DE OBRA
// ============================================

export interface SubStageProgress {
  name: string;
  progress: number;
  completed: number;
  total: number;
  unit: string;
}

export interface StageProgress {
  name: string;
  /** Cuánto avanzó la categoría, 0-100, ponderando sus sub-actividades. */
  progress: number;
  /** Cuánto pesa la categoría en el avance general de este proyecto. */
  weight: number;
  subStages: SubStageProgress[];
}

export interface ProjectWorkProgress {
  id: string;
  name: string;
  stages: StageProgress[];
  overallProgress: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ============================================
// ONBOARDING
// ============================================

export interface OnboardingData {
  company: {
    name: string;
    logo?: string;
  };
  project: {
    name: string;
  };
  team: Array<{
    name: string;
    email: string;
    role: UserRole;
  }>;
}

// ============================================
// EMAILS Y NOTIFICACIONES
// ============================================

export interface SendEmailDTO {
  reportId: string;
  recipients?: string[]; // Si no se pasa, usa los del proyecto
}

export interface ShareWhatsAppData {
  reportId: string;
  message?: string;
  includeLink: boolean;
}

