import { apiClient } from './client';
import type {
  Equipment,
  CreateEquipmentDTO,
  UpdateEquipmentDTO,
  EventLogEntry,
  AssetNote,
  CreateNoteDTO,
  UpdateNoteDTO,
} from '@/lib/types';

const ENDPOINT = '/equipment';

export const equipmentService = {
  async getAll(filters?: { projectId?: string; status?: string }): Promise<Equipment[]> {
    const params: Record<string, string | undefined> = {};
    if (filters?.projectId) params.projectId = filters.projectId;
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    return apiClient.get<Equipment[]>(ENDPOINT, params);
  },

  async getById(id: string): Promise<Equipment> {
    return apiClient.get<Equipment>(`${ENDPOINT}/${id}`);
  },

  async create(data: CreateEquipmentDTO): Promise<Equipment> {
    return apiClient.post<Equipment>(ENDPOINT, data);
  },

  async update(id: string, data: UpdateEquipmentDTO): Promise<Equipment> {
    return apiClient.put<Equipment>(`${ENDPOINT}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  async assignToProject(equipmentId: string, projectId: string | null): Promise<Equipment> {
    return apiClient.post<Equipment>(`${ENDPOINT}/${equipmentId}/assign`, { projectId });
  },

  async deactivate(id: string): Promise<Equipment> {
    return apiClient.post<Equipment>(`${ENDPOINT}/${id}/deactivate`);
  },

  async reactivate(id: string): Promise<Equipment> {
    return apiClient.post<Equipment>(`${ENDPOINT}/${id}/reactivate`);
  },

  async getHistory(id: string): Promise<EventLogEntry[]> {
    return apiClient.get<EventLogEntry[]>(`${ENDPOINT}/${id}/history`);
  },

  async getActive(): Promise<Equipment[]> {
    return this.getAll({ status: 'activa' });
  },

  /**
   * Obtiene la bitácora de un equipo
   */
  async getNotes(equipmentId: string, estado?: 'abierta' | 'resuelta' | 'all'): Promise<AssetNote[]> {
    return apiClient.get<AssetNote[]>(`${ENDPOINT}/${equipmentId}/notes`, estado ? { estado } : undefined);
  },

  /**
   * Crea una entrada de bitácora (incidencia raíz o seguimiento)
   */
  async createNote(equipmentId: string, data: CreateNoteDTO): Promise<AssetNote> {
    return apiClient.post<AssetNote>(`${ENDPOINT}/${equipmentId}/notes`, data);
  },

  /**
   * Actualiza una entrada de bitácora
   */
  async updateNote(equipmentId: string, noteId: string, data: UpdateNoteDTO): Promise<AssetNote> {
    return apiClient.put<AssetNote>(`${ENDPOINT}/${equipmentId}/notes/${noteId}`, data);
  },

  /**
   * Elimina una entrada de bitácora
   */
  async deleteNote(equipmentId: string, noteId: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${equipmentId}/notes/${noteId}`);
  },
};
