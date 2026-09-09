import { apiClient } from './client';
import type {
  TheoreticalCurve,
  CreateTheoreticalCurveDTO,
  CurveImportResult,
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

  /** Descarga la plantilla vacía para completar la curva en Excel. */
  async downloadTemplate(): Promise<void> {
    await apiClient.downloadFile(`${ENDPOINT}/template`, 'Plantilla_Curva_S.xlsx');
  },

  /**
   * Importa la curva desde la plantilla completada. Reemplaza la curva entera.
   *
   * Es el otro camino al mismo dato: lo que se importa se puede seguir
   * editando a mano, y viceversa. Un archivo con filas inválidas se rechaza
   * completo con 422 y `errors` dice qué corregir.
   */
  async importTemplate(projectId: string, file: File): Promise<CurveImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<CurveImportResult>(`${ENDPOINT}/${projectId}/import`, formData);
  },
};
