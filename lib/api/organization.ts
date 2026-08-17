import { apiClient } from './client';

const ENDPOINT = '/organization';

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: number;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
}

export interface InviteUserDTO {
  email: string;
  role?: 'basic_member' | 'admin';
}

/**
 * Servicio de Organización (Clerk)
 */
export const organizationService = {
  /**
   * Obtiene los miembros de la organización
   */
  async getMembers(): Promise<OrganizationMember[]> {
    return apiClient.get<OrganizationMember[]>(`${ENDPOINT}/members`);
  },

  /**
   * Invita a un usuario a la organización
   */
  async inviteUser(data: InviteUserDTO): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${ENDPOINT}/invite`, data);
  },

  /**
   * Obtiene información de la organización
   */
  async getInfo(): Promise<OrganizationInfo> {
    return apiClient.get<OrganizationInfo>(`${ENDPOINT}/info`);
  },
};

