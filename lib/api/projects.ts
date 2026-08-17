import { apiClient } from './client';
import { getAuthToken } from './client';
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  ApiResponse,
  PaginatedResponse,
} from '@/lib/types';

const ENDPOINT = '/projects';

/**
 * Servicio de Proyectos
 */
export const projectsService = {
  /**
   * Obtiene la lista de todos los proyectos
   */
  async getAll(): Promise<Project[]> {
    return apiClient.get<Project[]>(ENDPOINT);
  },

  /**
   * Obtiene la lista de proyectos con paginación
   */
  async getPaginated(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Project>> {
    return apiClient.get<PaginatedResponse<Project>>(ENDPOINT, { page, pageSize });
  },

  /**
   * Obtiene un proyecto por ID
   */
  async getById(id: string): Promise<Project> {
    return apiClient.get<Project>(`${ENDPOINT}/${id}`);
  },

  /**
   * Crea un nuevo proyecto
   */
  async create(data: CreateProjectDTO): Promise<Project> {
    return apiClient.post<Project>(ENDPOINT, data);
  },

  /**
   * Actualiza un proyecto existente
   */
  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    return apiClient.put<Project>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Elimina un proyecto
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Agrega usuarios al equipo del proyecto
   */
  async addTeamMembers(projectId: string, members: string[]): Promise<Project> {
    return apiClient.post<Project>(`${ENDPOINT}/${projectId}/team`, { members });
  },

  /**
   * Elimina un usuario del equipo del proyecto
   */
  async removeTeamMember(projectId: string, member: string): Promise<Project> {
    return apiClient.delete<Project>(`${ENDPOINT}/${projectId}/team/${encodeURIComponent(member)}`);
  },

  /**
   * Agrega destinatarios de email al proyecto
   */
  async addRecipients(projectId: string, emails: string[]): Promise<Project> {
    return apiClient.post<Project>(`${ENDPOINT}/${projectId}/recipients`, { emails });
  },

  /**
   * Elimina un destinatario de email del proyecto
   */
  async removeRecipient(projectId: string, email: string): Promise<Project> {
    return apiClient.delete<Project>(`${ENDPOINT}/${projectId}/recipients/${encodeURIComponent(email)}`);
  },

  /**
   * Obtiene solo los proyectos activos (en ejecución)
   */
  async getActive(): Promise<Project[]> {
    return apiClient.get<Project[]>(ENDPOINT, { status: 'active' });
  },

  /**
   * Obtiene el conteo de proyectos en ejecución
   */
  async getActiveCount(): Promise<number> {
    const projects = await this.getActive();
    return projects.length;
  },

  /**
   * Sube la imagen de firma del responsable del proyecto.
   * Aplica la misma validación de imagen que el logo de empresa.
   */
  async uploadSignatureImage(projectId: string, file: File): Promise<Project> {
    const token = await getAuthToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const formData = new FormData();
    formData.append('signature', file);
    const response = await fetch(`${apiUrl}${ENDPOINT}/${projectId}/signature-image`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al subir imagen de firma');
    }
    return response.json();
  },

  /**
   * Elimina la imagen de firma del responsable del proyecto.
   */
  async deleteSignatureImage(projectId: string): Promise<Project> {
    return apiClient.delete<Project>(`${ENDPOINT}/${projectId}/signature-image`);
  },
};

