import { apiClient } from './client';
import type {
  Company,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from '@/lib/types';

const ENDPOINT = '/company';

/**
 * Servicio de Empresa
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
   * Crea una nueva empresa (usado en onboarding)
   */
  async create(data: CreateCompanyDTO): Promise<Company> {
    return apiClient.post<Company>(ENDPOINT, data);
  },

  /**
   * Actualiza los datos de la empresa
   */
  async update(data: UpdateCompanyDTO): Promise<Company> {
    return apiClient.put<Company>(ENDPOINT, data);
  },

  /**
   * Sube el logo de la empresa
   */
  async uploadLogo(file: File): Promise<Company> {
    return apiClient.uploadFile<Company>(`${ENDPOINT}/logo`, file, 'logo');
  },

  /**
   * Elimina el logo de la empresa
   */
  async deleteLogo(): Promise<Company> {
    return apiClient.delete<Company>(`${ENDPOINT}/logo`);
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

