/**
 * Circuit Breaker y Retry Logic para mejorar la resiliencia de la aplicación
 */

// ============================================
// CIRCUIT BREAKER
// ============================================

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class CircuitBreaker {
  private failures: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold: number;
  private readonly resetTimeout: number; // milliseconds

  constructor(failureThreshold: number = 5, resetTimeout: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  private getState(key: string): CircuitBreakerState {
    if (!this.failures.has(key)) {
      this.failures.set(key, {
        failureCount: 0,
        lastFailureTime: null,
        state: 'CLOSED',
      });
    }
    return this.failures.get(key)!;
  }

  private setState(key: string, state: Partial<CircuitBreakerState>) {
    const current = this.getState(key);
    this.failures.set(key, { ...current, ...state });
  }

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const state = this.getState(key);

    // Si el circuito está abierto, verificar si es tiempo de intentar de nuevo
    if (state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (state.lastFailureTime || 0);
      
      if (timeSinceLastFailure < this.resetTimeout) {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
      
      // Cambiar a HALF_OPEN para intentar una llamada
      this.setState(key, { state: 'HALF_OPEN' });
    }

    try {
      const result = await fn();
      
      // Éxito: resetear el contador
      if (state.state === 'HALF_OPEN') {
        this.setState(key, { 
          failureCount: 0, 
          lastFailureTime: null,
          state: 'CLOSED' 
        });
      } else if (state.failureCount > 0) {
        this.setState(key, { failureCount: 0, lastFailureTime: null });
      }
      
      return result;
    } catch (error) {
      const newFailureCount = state.failureCount + 1;
      
      this.setState(key, {
        failureCount: newFailureCount,
        lastFailureTime: Date.now(),
        state: newFailureCount >= this.failureThreshold ? 'OPEN' : 'CLOSED',
      });
      
      throw error;
    }
  }

  getStatus(key: string): CircuitBreakerState {
    return this.getState(key);
  }

  reset(key: string) {
    this.failures.delete(key);
  }

  resetAll() {
    this.failures.clear();
  }
}

// Instancia global del circuit breaker
export const circuitBreaker = new CircuitBreaker(5, 60000); // 5 fallos, 60 segundos de timeout

// ============================================
// RETRY LOGIC
// ============================================

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: number[]; // HTTP status codes que se pueden reintentar
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2,
  retryableErrors: [408, 429, 500, 502, 503, 504], // Errores HTTP retryables
};

/**
 * Implementa retry logic con exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Si es el último intento, lanzar el error
      if (attempt === opts.maxRetries) {
        break;
      }

      // Verificar si el error es retryable
      const isRetryable = 
        !error.code || // Network errors
        (error.code && opts.retryableErrors.includes(parseInt(error.code)));

      if (!isRetryable) {
        throw error; // No reintentar errores no retryables (ej: 401, 403, 404)
      }

      // Esperar antes del siguiente intento (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Incrementar delay exponencialmente
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

// ============================================
// WRAPPER COMBINADO: Circuit Breaker + Retry
// ============================================

interface ResilientFetchOptions extends RetryOptions {
  circuitBreakerKey?: string;
  skipCircuitBreaker?: boolean;
  skipRetry?: boolean;
}

/**
 * Ejecuta una función con Circuit Breaker y Retry Logic
 */
export async function resilientFetch<T>(
  fn: () => Promise<T>,
  options: ResilientFetchOptions = {}
): Promise<T> {
  const {
    circuitBreakerKey = 'default',
    skipCircuitBreaker = false,
    skipRetry = false,
    ...retryOptions
  } = options;

  // Función wrapper para el retry
  const retryFn = async () => {
    if (skipCircuitBreaker) {
      return await fn();
    }
    return await circuitBreaker.execute(circuitBreakerKey, fn);
  };

  // Aplicar retry logic si no está deshabilitado
  if (skipRetry) {
    return await retryFn();
  }

  return await retryWithBackoff(retryFn, retryOptions);
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Verifica si un error es retryable basado en el código de estado
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const code = error.code ? parseInt(error.code) : null;
  if (!code) return true; // Network errors son retryables
  
  return DEFAULT_RETRY_OPTIONS.retryableErrors.includes(code);
}

/**
 * Obtiene el estado del circuit breaker para un endpoint
 */
export function getCircuitBreakerStatus(key: string = 'default'): CircuitBreakerState {
  return circuitBreaker.getStatus(key);
}

/**
 * Resetea el circuit breaker para un endpoint específico
 */
export function resetCircuitBreaker(key?: string) {
  if (key) {
    circuitBreaker.reset(key);
  } else {
    circuitBreaker.resetAll();
  }
}
