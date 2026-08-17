import { apiClient } from './client';
import type {
  TheoreticalCurve,
  CreateTheoreticalCurveDTO,
} from '@/lib/types';

const ENDPOINT = '/theoretical-curves';

/**
 * Servicio de Curva Teórica de Avance
 */
export const theoreticalCurvesService = {
  /**
   * Obtiene la curva teórica de un proyecto. Retorna null si no existe.
   */
  async get(projectId: string): Promise<TheoreticalCurve | null> {
    try {
      return await apiClient.get<TheoreticalCurve>(`${ENDPOINT}/${projectId}`);
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'NOT_FOUND') return null;
      throw error;
    }
  },

  /**
   * Crea o reemplaza la curva teórica de un proyecto.
   */
  async create(projectId: string, data: CreateTheoreticalCurveDTO): Promise<TheoreticalCurve> {
    return apiClient.post<TheoreticalCurve>(`${ENDPOINT}/${projectId}`, data);
  },

  /**
   * Actualiza la curva teórica de un proyecto.
   */
  async update(projectId: string, data: Partial<CreateTheoreticalCurveDTO>): Promise<TheoreticalCurve> {
    return apiClient.put<TheoreticalCurve>(`${ENDPOINT}/${projectId}`, data);
  },

  /**
   * Elimina la curva teórica de un proyecto.
   */
  async delete(projectId: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${projectId}`);
  },
};
