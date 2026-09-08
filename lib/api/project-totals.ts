import { apiClient } from './client';
import type {
  ProjectTotalItem,
  ProjectTotals,
  TotalsImportResult,
} from '@/lib/types';

const ENDPOINT = '/project-totals';

/**
 * Servicio de Totales del proyecto (el alcance de obra).
 *
 * Reemplaza al de línea base: el alcance ya no se carga campo por campo, se
 * sube la plantilla Excel completada.
 */
export const projectTotalsService = {
  /** Descarga la plantilla vacía, generada desde el catálogo del backend. */
  async downloadTemplate(): Promise<void> {
    await apiClient.downloadFile(`${ENDPOINT}/template`, 'Plantilla_Totales.xlsx');
  },

  /** Totales cargados de un proyecto, en el orden del catálogo. */
  async getByProjectId(projectId: string): Promise<ProjectTotals> {
    return apiClient.get<ProjectTotals>(`${ENDPOINT}/${projectId}`);
  },

  /**
   * Sube la plantilla completada. Reemplaza el alcance entero del proyecto.
   *
   * Un archivo con filas inválidas se rechaza completo con 422; el error trae
   * la lista de filas a corregir en `errors`.
   */
  async importTemplate(projectId: string, file: File): Promise<TotalsImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<TotalsImportResult>(`${ENDPOINT}/${projectId}/import`, formData);
  },

  /** Ajusta a mano la cantidad de un ítem. */
  async updateQuantity(
    projectId: string,
    itemId: string,
    totalQuantity: number,
  ): Promise<ProjectTotals> {
    return apiClient.patch<ProjectTotals>(
      `${ENDPOINT}/${projectId}/items/${itemId}`,
      { totalQuantity },
    );
  },

  /** Guarda varias cantidades de una sola vez, como hace la tabla. */
  async updateQuantities(
    projectId: string,
    items: Array<Pick<ProjectTotalItem, 'id'> & { totalQuantity: number }>,
  ): Promise<ProjectTotals> {
    return apiClient.patch<ProjectTotals>(`${ENDPOINT}/${projectId}`, { items });
  },
};
