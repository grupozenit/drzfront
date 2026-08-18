import { apiClient } from './client';
import type { Company, CreateCompanyDTO } from '@/lib/types';

const ENDPOINT = '/company';

/**
 * Servicio de Empresa (solo lectura).
 *
 * La app está personalizada para una única empresa (Grupo Zenit): el nombre y
 * el logo no se configuran desde la UI, por eso no se exponen operaciones de
 * actualización ni de subida de logo.
 */
export const companyService = {
  /**
   * Obtiene los datos de la empresa actual
   * Retorna null si no existe (usuario nuevo sin onboarding)
   */
  async get(): Promise<Company | null> {
    return apiClient.get<Company | null>(ENDPOINT);
  },

  /**
   * Crea la empresa de la organización (usado en onboarding)
   */
  async create(data: CreateCompanyDTO): Promise<Company> {
    return apiClient.post<Company>(ENDPOINT, data);
  },

  /**
   * Verifica si la empresa tiene la configuración completa
   */
  async isConfigured(): Promise<boolean> {
    try {
      const company = await this.get();
      return Boolean(company && company.name);
    } catch {
      return false;
    }
  },
};
