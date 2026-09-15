import { auth } from '@clerk/nextjs/server';
import type {
  Company,
  Project,
  TeamMember,
  Machine,
  DashboardSummary,
  ProjectProgress,
  ProjectPersonnelHistory,
  ProjectSuspendedHours,
  ProjectMachinery,
  FleetDashboard,
} from '@/lib/types';

// ============================================
// CONFIGURACIÓN
// ============================================

/**
 * URL base del backend FastAPI
 * 
 * Para Render + Vercel:
 * - Usar NEXT_PUBLIC_API_URL con la URL pública de Render
 * - Ejemplo: https://tu-backend.onrender.com/api/v1
 * 
 * Si en el futuro ambos servicios están en la misma red (Docker, AWS VPC, etc.):
 * - Puedes usar API_URL para URL interna más rápida (ej: http://api:8000/api/v1)
 * - NEXT_PUBLIC_API_URL para el cliente (URL pública)
 */
const API_BASE_URL = process.env.API_URL 
  || process.env.NEXT_PUBLIC_API_URL 
  || 'http://localhost:8000/api/v1';

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Obtiene el token de autenticación de Clerk en el servidor
 */
async function getServerAuthToken(): Promise<string | null> {
  try {
    const { getToken } = await auth();
    return await getToken();
  } catch (error) {
    console.error('Error getting server auth token:', error);
    return null;
  }
}

/**
 * Cliente HTTP para Server Components
 */
async function serverFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const token = await getServerAuthToken();
  
  if (!token) {
    console.warn('No auth token available for server request');
    return null;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      // Deshabilitar cache para datos dinámicos
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Server fetch error: ${response.status} ${response.statusText}`);
      return null;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    console.error('Server fetch error:', error);
    return null;
  }
}

// ============================================
// FUNCIONES DE SERVIDOR PARA CARGAR DATOS
// ============================================

/**
 * Obtiene información de la empresa
 */
export async function getServerCompany(): Promise<Company | null> {
  return serverFetch<Company>('/company');
}

/**
 * Obtiene todos los proyectos
 */
export async function getServerProjects(): Promise<Project[]> {
  const projects = await serverFetch<Project[]>('/projects');
  return projects || [];
}

/**
 * Obtiene todos los miembros del equipo
 */
export async function getServerTeam(): Promise<TeamMember[]> {
  const team = await serverFetch<TeamMember[]>('/team');
  return team || [];
}

/**
 * Obtiene toda la maquinaria
 */
export async function getServerMachinery(): Promise<Machine[]> {
  const machinery = await serverFetch<Machine[]>('/machinery');
  return machinery || [];
}

/**
 * Obtiene el resumen del dashboard
 */
export async function getServerDashboardSummary(): Promise<DashboardSummary | null> {
  return serverFetch<DashboardSummary>('/dashboard/summary');
}

/**
 * Obtiene el avance de todos los proyectos
 */
export async function getServerAllProjectsProgress(): Promise<ProjectProgress[]> {
  const progress = await serverFetch<ProjectProgress[]>('/dashboard/projects/progress');
  return progress || [];
}

/**
 * Obtiene el historial de personal de todos los proyectos
 */
export async function getServerAllPersonnelHistory(
  startDate?: string,
  endDate?: string
): Promise<ProjectPersonnelHistory[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const history = await serverFetch<ProjectPersonnelHistory[]>(`/dashboard/personnel${queryString}`);
  return history || [];
}

/**
 * Obtiene las horas suspendidas de todos los proyectos
 */
export async function getServerAllSuspendedHours(
  startDate?: string,
  endDate?: string
): Promise<ProjectSuspendedHours[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const hours = await serverFetch<ProjectSuspendedHours[]>(`/dashboard/suspended-hours${queryString}`);
  return hours || [];
}

/**
 * Obtiene la maquinaria de todos los proyectos
 */
export async function getServerAllProjectsMachinery(): Promise<ProjectMachinery[]> {
  const machinery = await serverFetch<ProjectMachinery[]>('/dashboard/machinery');
  return machinery || [];
}

/**
 * Obtiene el payload consolidado del tablero de flota (maquinaria y equipos)
 */
export async function getServerFleetDashboard(): Promise<FleetDashboard | null> {
  return serverFetch<FleetDashboard>('/dashboard/fleet');
}

/**
 * Obtiene todos los datos del dashboard de una vez (optimizado)
 */
export async function getServerFullDashboard(): Promise<{
  summary: DashboardSummary | null;
  projects: Project[];
  projectsProgress: ProjectProgress[];
  personnelHistory: ProjectPersonnelHistory[];
  suspendedHours: ProjectSuspendedHours[];
  machinery: ProjectMachinery[];
}> {
  // Cargar todos los datos en paralelo
  const [
    summary,
    projects,
    projectsProgress,
    personnelHistory,
    suspendedHours,
    machinery,
  ] = await Promise.all([
    getServerDashboardSummary(),
    getServerProjects(),
    getServerAllProjectsProgress(),
    getServerAllPersonnelHistory(),
    getServerAllSuspendedHours(),
    getServerAllProjectsMachinery(),
  ]);

  return {
    summary,
    projects,
    projectsProgress,
    personnelHistory,
    suspendedHours,
    machinery,
  };
}

