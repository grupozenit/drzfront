/**
 * Configuración de variables de entorno
 * 
 * Para usar, crea un archivo .env.local en la raíz del proyecto con:
 * 
 * NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
 * 
 * En producción, usa la URL del servidor de API
 */

export const config = {
  // URL base de la API
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  
  // Ambiente actual
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

