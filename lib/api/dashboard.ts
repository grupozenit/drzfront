import { apiClient } from './client';
import type {
  DashboardSummary,
  ProjectPersonnelHistory,
  ProjectSuspendedHours,
  ProjectProgress,
  ProjectMachinery,
  ProjectMachineryHistory,
  ProjectWorkProgress,
  ProjectActivityBreakdown,
  ProjectSCurve,
} from '@/lib/types';

const ENDPOINT = '/dashboard';

/**
 * Servicio de Dashboard / Estadísticas
 */
export const dashboardService = {
  // ============================================
  // RESUMEN GENERAL
  // ============================================

  /**
   * Obtiene el resumen general del dashboard
   * (Personal total, proyectos en ejecución, maquinaria activa)
   */
  async getSummary(): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>(`${ENDPOINT}/summary`);
  },

  // ============================================
  // DATOS POR PROYECTO
  // ============================================

  /**
   * Obtiene el avance de un proyecto específico
   */
  async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    return apiClient.get<ProjectProgress>(`${ENDPOINT}/projects/${projectId}/progress`);
  },

  /**
   * Obtiene el avance de todos los proyectos
   */
  async getAllProjectsProgress(): Promise<ProjectProgress[]> {
    return apiClient.get<ProjectProgress[]>(`${ENDPOINT}/projects/progress`);
  },

  /**
   * Obtiene el historial de personal de un proyecto
   */
  async getPersonnelHistory(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectPersonnelHistory> {
    return apiClient.get<ProjectPersonnelHistory>(
      `${ENDPOINT}/projects/${projectId}/personnel`,
      { startDate, endDate }
    );
  },

  /**
   * Obtiene el historial de personal de todos los proyectos
   */
  async getAllPersonnelHistory(
    startDate?: string,
    endDate?: string
  ): Promise<ProjectPersonnelHistory[]> {
    return apiClient.get<ProjectPersonnelHistory[]>(
      `${ENDPOINT}/personnel`,
      { startDate, endDate }
    );
  },

  /**
   * Obtiene las horas suspendidas de un proyecto
   */
  async getSuspendedHours(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectSuspendedHours> {
    return apiClient.get<ProjectSuspendedHours>(
      `${ENDPOINT}/projects/${projectId}/suspended-hours`,
      { startDate, endDate }
    );
  },

  /**
   * Obtiene las horas suspendidas de todos los proyectos
   */
  async getAllSuspendedHours(
    startDate?: string,
    endDate?: string
  ): Promise<ProjectSuspendedHours[]> {
    return apiClient.get<ProjectSuspendedHours[]>(
      `${ENDPOINT}/suspended-hours`,
      { startDate, endDate }
    );
  },

  /**
   * Obtiene la maquinaria asignada a un proyecto
   */
  async getProjectMachinery(projectId: string): Promise<ProjectMachinery> {
    return apiClient.get<ProjectMachinery>(`${ENDPOINT}/projects/${projectId}/machinery`);
  },

  /**
   * Obtiene la maquinaria de todos los proyectos
   */
  async getAllProjectsMachinery(): Promise<ProjectMachinery[]> {
    return apiClient.get<ProjectMachinery[]>(`${ENDPOINT}/machinery`);
  },

  /**
   * Obtiene el historial de maquinaria en sitio de un proyecto
   */
  async getMachineryHistory(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectMachineryHistory> {
    return apiClient.get<ProjectMachineryHistory>(
      `${ENDPOINT}/projects/${projectId}/machinery-history`,
      { startDate, endDate }
    );
  },

  /**
   * Obtiene el historial de maquinaria de todos los proyectos
   */
  async getAllMachineryHistory(
    startDate?: string,
    endDate?: string
  ): Promise<ProjectMachineryHistory[]> {
    return apiClient.get<ProjectMachineryHistory[]>(
      `${ENDPOINT}/machinery-history`,
      { startDate, endDate }
    );
  },

  // ============================================
  // AVANCES DE OBRA
  // ============================================

  /**
   * Obtiene el progreso detallado de obra de un proyecto
   * (Para la página de Avances de Obra)
   */
  async getWorkProgress(
    projectId: string,
    startDate?: string,
    endDate?: string,
    activityFilter?: string
  ): Promise<ProjectWorkProgress> {
    return apiClient.get<ProjectWorkProgress>(
      `${ENDPOINT}/projects/${projectId}/work-progress`,
      { startDate, endDate, activity: activityFilter }
    );
  },

  /**
   * Obtiene el progreso de obra de todos los proyectos
   */
  async getAllWorkProgress(
    startDate?: string,
    endDate?: string,
    activityFilter?: string
  ): Promise<ProjectWorkProgress[]> {
    return apiClient.get<ProjectWorkProgress[]>(
      `${ENDPOINT}/work-progress`,
      { startDate, endDate, activity: activityFilter }
    );
  },

  // ============================================
  // HISTOGRAMA DE ACTIVIDADES Y CURVA S
  // ============================================

  async getProjectActivityBreakdown(projectId: string): Promise<ProjectActivityBreakdown> {
    return apiClient.get<ProjectActivityBreakdown>(`${ENDPOINT}/projects/${projectId}/activity-breakdown`);
  },

  async getProjectSCurve(projectId: string): Promise<ProjectSCurve> {
    return apiClient.get<ProjectSCurve>(`${ENDPOINT}/projects/${projectId}/s-curve`);
  },

  // ============================================
  // DATOS CONSOLIDADOS
  // ============================================

  /**
   * Obtiene todos los datos del dashboard para un proyecto
   * (Una sola llamada para optimizar)
   */
  async getProjectDashboard(projectId: string): Promise<{
    progress: ProjectProgress;
    personnel: ProjectPersonnelHistory;
    suspendedHours: ProjectSuspendedHours;
    machinery: ProjectMachinery;
  }> {
    return apiClient.get(`${ENDPOINT}/projects/${projectId}/full`);
  },

  /**
   * Obtiene todos los datos del dashboard general
   */
  async getFullDashboard(): Promise<{
    summary: DashboardSummary;
    projects: ProjectProgress[];
    personnel: ProjectPersonnelHistory[];
    suspendedHours: ProjectSuspendedHours[];
    machinery: ProjectMachinery[];
  }> {
    return apiClient.get(`${ENDPOINT}/full`);
  },
};

