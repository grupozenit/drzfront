import type { ApiResponse, ApiError } from '@/lib/types';
import { resilientFetch } from './resilience';

// ============================================
// CONFIGURACIÓN
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================
// TIPOS INTERNOS
// ============================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

interface RequestOptions extends RequestConfig {
  skipAuth?: boolean;
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Construye la URL con query params
 */
function buildUrl(endpoint: string, params?: RequestConfig['params']): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Función externa para obtener el token (será configurada desde el contexto de Clerk)
 */
let externalTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Configura la función para obtener el token de Clerk
 * Esta función debe ser llamada una vez al inicializar la app
 */
export function setTokenGetter(getter: () => Promise<string | null>): void {
  externalTokenGetter = getter;
}

/**
 * Obtiene el token de autenticación de Clerk
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  // Usar el token getter de Clerk si está configurado
  if (externalTokenGetter) {
    return await externalTokenGetter();
  }
  
  // Fallback a localStorage (legacy)
  return localStorage.getItem('auth_token');
}

// ============================================
// CLIENTE HTTP PRINCIPAL
// ============================================

class ApiClient {
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  /**
   * Método principal para hacer requests con resilience (Circuit Breaker + Retry Logic)
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      skipAuth = false,
    } = options;

    // Función que ejecuta el fetch real
    const executeFetch = async (): Promise<T> => {
    // Construir headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Agregar token de auth si existe y no se salta
    if (!skipAuth) {
      const token = await getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Construir URL
    const url = buildUrl(endpoint, params);

    // Configuración del request
    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Agregar body si existe
    if (body !== undefined) {
      if (body instanceof FormData) {
        // Para FormData, no setear Content-Type (el browser lo hace automáticamente)
        delete requestHeaders['Content-Type'];
        config.body = body;
      } else {
        config.body = JSON.stringify(body);
      }
    }

      const response = await fetch(url, config);

      // Manejar errores HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          message: errorData.message || errorData.detail || `Error ${response.status}: ${response.statusText}`,
          code: String(response.status),
          details: errorData.errors || errorData.details,
        };
        throw error;
      }

      // Parsear respuesta
      // Si es 204 No Content, retornar objeto vacío
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    };

    try {
      // Ejecutar con Circuit Breaker y Retry Logic
      return await resilientFetch(executeFetch, {
        circuitBreakerKey: `${method}:${endpoint}`,
        maxRetries: method === 'GET' ? 3 : 1, // Más reintentos para GET
        initialDelay: 1000,
        skipRetry: method === 'POST' || method === 'PUT' || method === 'PATCH', // No reintentar operaciones que modifican datos
      });
    } catch (error) {
      // Si ya es un ApiError, re-lanzarlo
      if ((error as ApiError).message) {
        throw error;
      }

      // Error de red u otro
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error de conexión',
        code: 'NETWORK_ERROR',
      };
      throw apiError;
    }
  }

  // ============================================
  // MÉTODOS HTTP CONVENIENTES
  // ============================================

  async get<T>(endpoint: string, params?: RequestConfig['params'], headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params, headers });
  }

  async post<T>(endpoint: string, body?: unknown, config?: { params?: RequestConfig['params'], headers?: Record<string, string> }): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, params: config?.params, headers: config?.headers });
  }

  async put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  // ============================================
  // MÉTODOS ESPECIALES
  // ============================================

  /**
   * Sube un archivo o múltiples archivos
   */
  async uploadFile<T>(
    endpoint: string,
    files: File | File[],
    fieldName: string = 'file',
    additionalData?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData();

    if (Array.isArray(files)) {
      files.forEach((file, index) => {
        formData.append(`${fieldName}[${index}]`, file);
      });
    } else {
      formData.append(fieldName, files);
    }

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Descarga un archivo (como blob)
   */
  async downloadFile(endpoint: string, filename?: string): Promise<Blob> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(endpoint, {}), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error al descargar archivo: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Si se proporciona filename, descargar automáticamente
    if (filename) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return blob;
  }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();

// ============================================
// HELPER PARA MANEJO DE ERRORES
// ============================================

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ha ocurrido un error inesperado';
}

