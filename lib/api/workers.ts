import { apiClient } from './client';
import type {
  CreateWorkerDTO,
  UpdateWorkerDTO,
  Worker,
  WorkerFunction,
  WorkerState,
  WorkersImportResult,
} from '@/lib/types';

const ENDPOINT = '/workers';

/**
 * Servicio de Trabajadores (plantilla de personal por proyecto).
 *
 * El backend acota todo a la empresa y al alcance del usuario: un Jefe de Obra
 * o Gerente de Proyecto solo recibe la gente de sus proyectos asignados, y un
 * proyecto ajeno responde 404. La importación y la plantilla son solo de
 * Tecnología.
 */
export const workersService = {
  /** Plantilla de personal. Sin projectId, la de todos los proyectos accesibles. */
  async getAll(params?: { projectId?: string; status?: WorkerState | 'todos' }): Promise<Worker[]> {
    return apiClient.get<Worker[]>(ENDPOINT, params);
  },

  /** Lista de funciones de la empresa (la que se define en la plantilla). */
  async getFunctions(): Promise<WorkerFunction[]> {
    return apiClient.get<WorkerFunction[]>(`${ENDPOINT}/functions`);
  },

  async create(data: CreateWorkerDTO): Promise<Worker> {
    return apiClient.post<Worker>(ENDPOINT, data);
  },

  async update(id: string, data: UpdateWorkerDTO): Promise<Worker> {
    return apiClient.put<Worker>(`${ENDPOINT}/${id}`, data);
  },

  /** Baja lógica: se reactiva con update(id, { estado: 'activo' }). */
  async remove(id: string): Promise<Worker> {
    return apiClient.delete<Worker>(`${ENDPOINT}/${id}`);
  },

  /** Plantilla con la lista de funciones de la empresa precargada. */
  async downloadTemplate(projectId?: string): Promise<void> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    await apiClient.downloadFile(`${ENDPOINT}/template${query}`, 'Plantilla_Trabajadores.xlsx');
  },

  /**
   * Sube la plantilla completada. REEMPLAZA la plantilla entera del proyecto.
   * Un archivo con filas inválidas se rechaza completo con 422 y `errors`.
   */
  async importTemplate(projectId: string, file: File): Promise<WorkersImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<WorkersImportResult>(
      `${ENDPOINT}/projects/${encodeURIComponent(projectId)}/import`,
      formData,
    );
  },
};
