import { apiClient } from './client';
import type {
  Machine,
  CreateMachineDTO,
  UpdateMachineDTO,
  MachineFilters,
  PaginatedResponse,
  EventLogEntry,
} from '@/lib/types';

const ENDPOINT = '/machinery';

/**
 * Servicio de Maquinaria
 */
export const machineryService = {
  /**
   * Obtiene la lista de toda la maquinaria con filtros opcionales
   */
  async getAll(filters?: MachineFilters): Promise<Machine[]> {
    const params: Record<string, string | undefined> = {};
    
    if (filters?.projectId) {
      params.projectId = filters.projectId;
    }
    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }

    return apiClient.get<Machine[]>(ENDPOINT, params);
  },

  /**
   * Obtiene maquinaria con paginación y filtros
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: MachineFilters
  ): Promise<PaginatedResponse<Machine>> {
    return apiClient.get<PaginatedResponse<Machine>>(ENDPOINT, {
      page,
      pageSize,
      ...filters,
    } as Record<string, string | number>);
  },

  /**
   * Obtiene una máquina por ID
   */
  async getById(id: string): Promise<Machine> {
    return apiClient.get<Machine>(`${ENDPOINT}/${id}`);
  },

  /**
   * Crea una nueva máquina
   */
  async create(data: CreateMachineDTO): Promise<Machine> {
    return apiClient.post<Machine>(ENDPOINT, data);
  },

  /**
   * Actualiza una máquina existente
   */
  async update(id: string, data: UpdateMachineDTO): Promise<Machine> {
    return apiClient.put<Machine>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Elimina una máquina
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Asigna una máquina a un proyecto
   */
  async assignToProject(machineId: string, projectId: string | null): Promise<Machine> {
    return apiClient.post<Machine>(`${ENDPOINT}/${machineId}/assign`, { projectId });
  },

  /**
   * Da de baja una máquina
   */
  async deactivate(id: string): Promise<Machine> {
    return apiClient.post<Machine>(`${ENDPOINT}/${id}/deactivate`);
  },

  /**
   * Reactiva una máquina dada de baja
   */
  async reactivate(id: string): Promise<Machine> {
    return apiClient.post<Machine>(`${ENDPOINT}/${id}/reactivate`);
  },

  /**
   * Obtiene el historial de eventos de una máquina
   */
  async getHistory(machineId: string): Promise<EventLogEntry[]> {
    return apiClient.get<EventLogEntry[]>(`${ENDPOINT}/${machineId}/history`);
  },

  /**
   * Obtiene maquinaria asignada a un proyecto específico
   */
  async getByProject(projectId: string): Promise<Machine[]> {
    return this.getAll({ projectId, status: 'activa' });
  },

  /**
   * Obtiene maquinaria sin asignar
   */
  async getUnassigned(): Promise<Machine[]> {
    return this.getAll({ projectId: 'none', status: 'activa' });
  },

  /**
   * Obtiene solo maquinaria activa
   */
  async getActive(): Promise<Machine[]> {
    return this.getAll({ status: 'activa' });
  },

  /**
   * Obtiene el conteo de maquinaria activa
   */
  async getActiveCount(): Promise<number> {
    const machines = await this.getActive();
    return machines.length;
  },

  /**
   * Obtiene estadísticas de maquinaria
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    assigned: number;
    unassigned: number;
    inactive: number;
  }> {
    const all = await this.getAll();
    const active = all.filter(m => m.estado === 'activa');
    const assigned = active.filter(m => m.proyectoId !== null);
    const unassigned = active.filter(m => m.proyectoId === null);
    const inactive = all.filter(m => m.estado === 'baja');

    return {
      total: all.length,
      active: active.length,
      assigned: assigned.length,
      unassigned: unassigned.length,
      inactive: inactive.length,
    };
  },
};

