import { apiClient } from './client';
import type {
  Driver,
  CreateDriverDTO,
  UpdateDriverDTO,
  DriverFilters,
  DriverEventLogEntry,
  DriverExpirationAlert,
} from '@/lib/types';

const ENDPOINT = '/drivers';

/**
 * Servicio de Choferes y Operadores de Maquinaria
 */
export const driverService = {
  /**
   * Obtiene la lista de choferes con filtros opcionales
   */
  async getAll(filters?: DriverFilters): Promise<Driver[]> {
    const params: Record<string, string | undefined> = {};

    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters?.licenseType && filters.licenseType !== 'all') {
      params.licenseType = filters.licenseType;
    }

    return apiClient.get<Driver[]>(ENDPOINT, params);
  },

  /**
   * Obtiene un chofer por ID
   */
  async getById(id: string): Promise<Driver> {
    return apiClient.get<Driver>(`${ENDPOINT}/${id}`);
  },

  /**
   * Crea un nuevo chofer
   */
  async create(data: CreateDriverDTO): Promise<Driver> {
    return apiClient.post<Driver>(ENDPOINT, data);
  },

  /**
   * Actualiza un chofer existente
   */
  async update(id: string, data: UpdateDriverDTO): Promise<Driver> {
    return apiClient.put<Driver>(`${ENDPOINT}/${id}`, data);
  },

  /**
   * Elimina un chofer
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Da de baja un chofer
   */
  async deactivate(id: string): Promise<Driver> {
    return apiClient.post<Driver>(`${ENDPOINT}/${id}/deactivate`);
  },

  /**
   * Reactiva un chofer dado de baja
   */
  async reactivate(id: string): Promise<Driver> {
    return apiClient.post<Driver>(`${ENDPOINT}/${id}/reactivate`);
  },

  /**
   * Obtiene el historial de eventos de un chofer
   */
  async getHistory(id: string): Promise<DriverEventLogEntry[]> {
    return apiClient.get<DriverEventLogEntry[]>(`${ENDPOINT}/${id}/history`);
  },

  /**
   * Choferes/operadores con licencia o certificación vencida o próxima a vencer
   */
  async getExpirationAlerts(days: number = 30): Promise<DriverExpirationAlert[]> {
    return apiClient.get<DriverExpirationAlert[]>(`${ENDPOINT}/alerts/expirations`, { days });
  },

  /**
   * Obtiene solo los choferes activos
   */
  async getActive(): Promise<Driver[]> {
    return this.getAll({ status: 'activo' });
  },
};
