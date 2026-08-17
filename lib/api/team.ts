import { apiClient } from './client';
import type {
  TeamMember,
  InviteTeamMemberDTO,
  UpdateTeamMemberDTO,
  PaginatedResponse,
} from '@/lib/types';

const ENDPOINT = '/team';

/**
 * Servicio de Gestión de Equipo
 */
export const teamService = {
  /**
   * Obtiene la lista de todos los miembros del equipo
   */
  async getAll(): Promise<TeamMember[]> {
    return apiClient.get<TeamMember[]>(ENDPOINT);
  },

  /**
   * Obtiene miembros con paginación
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<TeamMember>> {
    return apiClient.get<PaginatedResponse<TeamMember>>(ENDPOINT, { page, pageSize });
  },

  /**
   * Obtiene un miembro por ID
   */
  async getById(id: string): Promise<TeamMember> {
    return apiClient.get<TeamMember>(`${ENDPOINT}/${id}`);
  },

  /**
   * Invita a un nuevo miembro al equipo
   * El backend enviará un email de invitación
   */
  async invite(data: InviteTeamMemberDTO): Promise<TeamMember> {
    return apiClient.post<TeamMember>(`${ENDPOINT}/invite`, data);
  },

  /**
   * Actualiza los datos de un miembro
   */
  async update(id: string, data: UpdateTeamMemberDTO): Promise<TeamMember> {
    return apiClient.put<TeamMember>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Elimina un miembro del equipo
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Reenvía la invitación a un miembro pendiente
   */
  async resendInvitation(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `${ENDPOINT}/${id}/resend-invitation`
    );
  },

  /**
   * Cambia el rol de un miembro
   */
  async changeRole(id: string, role: TeamMember['role']): Promise<TeamMember> {
    return this.update(id, { role });
  },

  /**
   * Obtiene miembros por rol
   */
  async getByRole(role: TeamMember['role']): Promise<TeamMember[]> {
    const members = await this.getAll();
    return members.filter(m => m.role === role);
  },

  /**
   * Obtiene el conteo total de miembros
   */
  async getCount(): Promise<number> {
    const members = await this.getAll();
    return members.length;
  },
};

