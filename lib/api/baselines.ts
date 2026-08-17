import { apiClient } from './client';
import type {
  Baseline,
  CreateBaselineDTO,
  UpdateBaselineDTO,
} from '@/lib/types';

const ENDPOINT = '/baselines';

/**
 * Servicio de Línea Base
 */
export const baselinesService = {
  /**
   * Obtiene la línea base de un proyecto
   */
  async getByProjectId(projectId: string): Promise<Baseline | null> {
    try {
      return await apiClient.get<Baseline>(`${ENDPOINT}/${projectId}`);
    } catch (error) {
      // Si no existe línea base, retornar null en lugar de error
      if ((error as { code?: string }).code === '404') {
        return null;
      }
      throw error;
    }
  },

  /**
   * Crea o actualiza la línea base de un proyecto
   */
  async upsert(projectId: string, data: CreateBaselineDTO): Promise<Baseline> {
    return apiClient.post<Baseline>(`${ENDPOINT}/${projectId}`, data);
  },

  /**
   * Actualiza parcialmente la línea base de un proyecto
   */
  async update(projectId: string, data: UpdateBaselineDTO): Promise<Baseline> {
    return apiClient.patch<Baseline>(`${ENDPOINT}/${projectId}`, data);
  },

  /**
   * Verifica si un proyecto tiene línea base configurada
   */
  async hasBaseline(projectId: string): Promise<boolean> {
    const baseline = await this.getByProjectId(projectId);
    return baseline !== null;
  },

  /**
   * Obtiene el total de una variable de la línea base
   * Útil para calcular porcentajes de avance
   */
  getVariableTotal(baseline: Baseline, variable: string): number {
    switch (variable) {
      case 'Hincas':
        // Total de hincas viene de los componentes del tracker
        const hincasComponent = baseline.trackers.componentes.find(c => c.item === 'Hincas');
        return hincasComponent ? hincasComponent.cantidad : 0;
      
      case 'Trackers':
        return baseline.trackers.cantidad;
      
      case 'Soportes':
      case 'Rodamientos':
      case 'Tubos':
      case 'Purlins':
      case 'Motor':
      case 'Amortiguador':
      case 'TCU':
        const component = baseline.trackers.componentes.find(c => c.item === variable);
        return component ? component.cantidad : 0;
      
      case 'Módulos':
        return baseline.modulos;
      
      case 'Cable BT/AC':
        return baseline.cableBTAC;
      
      case 'Cable BT/CC':
        return baseline.cableBTCC;
      
      case 'Cable MT':
        return baseline.cableMT;
      
      case 'Inversores':
        return baseline.inversores;
      
      case '2*Inversores':
        return baseline.inversores * 2;
      
      case 'CTs':
        return baseline.cts;
      
      default:
        console.warn(`Variable de línea base no reconocida: ${variable}`);
        return 0;
    }
  },
};

