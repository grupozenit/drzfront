// ============================================
// TIPOS BASE
// ============================================

export type UserRole = 'admin' | 'manager' | 'worker';
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

export interface UpdateCompanyDTO {
  name?: string;
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

// ============================================
// PROYECTO
// ============================================

export interface Project {
  id: string;
  name: string;
  companyId: string;
  team: string[]; // IDs o nombres de usuarios asignados
  recipients: string[]; // Emails para reportes
  hasBaseline: boolean;
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
  team?: string[];
  recipients?: string[];
}

export interface UpdateProjectDTO {
  name?: string;
  team?: string[];
  recipients?: string[];
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
export interface TheoreticalCurveDataPoint {
  weekNumber: number;
  cumulativeProgress: number;
}

export interface TheoreticalCurve {
  id: string;
  projectId: string;
  dataPoints: TheoreticalCurveDataPoint[];
  totalWeeks: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTheoreticalCurveDTO {
  dataPoints: TheoreticalCurveDataPoint[];
  totalWeeks?: number | null;
}

// ============================================
// LÍNEA BASE
// ============================================

export interface TrackerComponent {
  item: string;
  unidad: string;
  cantidad: number;
}

export interface TrackerData {
  modelo: string;
  cantidad: number;
  componentes: TrackerComponent[];
}

export interface Baseline {
  id: string;
  projectId: string;
  trackers: TrackerData;
  modulos: number;
  potenciaModulos: number; // Wp
  potenciaTotal: number; // MWp
  cts: number;
  inversores: number;
  cableBTAC: number; // metros
  cableBTCC: number; // metros
  cableMT: number; // metros
  createdAt: string;
  updatedAt: string;
}

export interface CreateBaselineDTO {
  trackers: TrackerData;
  modulos: number;
  potenciaModulos: number;
  potenciaTotal: number;
  cts: number;
  inversores: number;
  cableBTAC: number;
  cableBTCC: number;
  cableMT: number;
}

export type UpdateBaselineDTO = Partial<CreateBaselineDTO>;

// ============================================
// ACTIVIDADES
// ============================================

export type ActivityCategory = 
  | 'hincas'
  | 'trackers'
  | 'modulos'
  | 'calidad'
  | 'obraElectrica'
  | 'ensayos'
  | 'inversores'
  | 'cts'
  | 'preComisionamiento'
  | 'otras';

export interface ActivityEntry {
  id: string;
  category: ActivityCategory;
  subActivity: string;
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

export interface Machine {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  patente: string;
  capacidad: string;
  propiedad: MachineOwnership;
  observaciones: string;
  proyectoId: string | null;
  proyectoName?: string;
  estado: MachineStatus;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineDTO {
  tipo: string;
  marca: string;
  modelo: string;
  patente: string;
  capacidad?: string;
  propiedad: MachineOwnership;
  observaciones?: string;
  proyectoId?: string | null;
}

export interface UpdateMachineDTO extends Partial<CreateMachineDTO> {}

export interface MachineFilters {
  projectId?: string | 'none';
  status?: MachineStatus | 'all';
}

// ============================================
// EQUIPOS Y HERRAMIENTAS
// ============================================

export interface Equipment {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  capacidad: string;
  propiedad: EquipmentOwnership;
  observaciones: string;
  proyectoId: string | null;
  proyectoName?: string;
  estado: MachineStatus;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentDTO {
  tipo: string;
  marca: string;
  modelo: string;
  capacidad?: string;
  propiedad: EquipmentOwnership;
  observaciones?: string;
  proyectoId?: string | null;
}

export interface UpdateEquipmentDTO extends Partial<CreateEquipmentDTO> {}

export interface EventLogEntry {
  id: string;
  eventType: 'alta' | 'asignacion' | 'desasignacion' | 'baja' | 'reactivacion';
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
  theoretical: TheoreticalCurveDataPoint[] | null;
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

