import { apiClient } from './client';
import type { MeResponse } from '@/lib/types';

const ENDPOINT = '/me';

/**
 * Servicio de identidad y permisos del usuario actual.
 *
 * Es la única fuente de verdad de la matriz de permisos en el cliente:
 * el frontend nunca reimplementa qué puede hacer cada rol, siempre
 * consulta este endpoint (vía AppContext/usePermissions).
 */
export const meService = {
  async get(): Promise<MeResponse> {
    return apiClient.get<MeResponse>(ENDPOINT);
  },
};
