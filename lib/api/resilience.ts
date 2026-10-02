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
  lastErrorMessage?: string;
}

export const CIRCUIT_OPEN_CODE = 'CIRCUIT_OPEN';

/** Status HTTP de un error del cliente, o null si el request no llegó a tener respuesta. */
export function httpStatusOf(error: any): number | null {
  const status = error?.code ? parseInt(error.code, 10) : NaN;
  return Number.isNaN(status) ? null : status;
}

/**
 * ¿El servicio falló, o respondió que no?
 *
 * Solo la red caída y los 5xx abren el circuito. Un 4xx es el servidor
 * funcionando y rechazando el pedido: contarlo como falla hacía que cinco
 * intentos de enviar un parte inválido bloquearan al usuario, y que en vez
 * del motivo del rechazo viera "Circuit breaker is OPEN".
 */
export function isServiceFailure(error: any): boolean {
  if (error?.code === CIRCUIT_OPEN_CODE) return false;
  const status = httpStatusOf(error);
  return status === null || status >= 500;
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
        const seconds = Math.ceil((this.resetTimeout - timeSinceLastFailure) / 1000);
        const cause = state.lastErrorMessage ? ` Último error: ${state.lastErrorMessage}` : '';
        throw {
          message: `El servidor no está respondiendo. Volvé a intentar en ${seconds} s.${cause}`,
          code: CIRCUIT_OPEN_CODE,
        };
      }
      
      // Cambiar a HALF_OPEN para intentar una llamada
      this.setState(key, { state: 'HALF_OPEN' });
    }

    try {
      const result = await fn();
      this.markHealthy(key);
      return result;
    } catch (error: any) {
      // El servidor respondió (aunque sea un rechazo): está sano
      if (!isServiceFailure(error)) {
        this.markHealthy(key);
        throw error;
      }

      const current = this.getState(key);
      const newFailureCount = current.failureCount + 1;
      // Un intento de prueba que falla vuelve a abrir el circuito
      const reopen = current.state === 'HALF_OPEN' || newFailureCount >= this.failureThreshold;

      this.setState(key, {
        failureCount: newFailureCount,
        lastFailureTime: Date.now(),
        state: reopen ? 'OPEN' : 'CLOSED',
        lastErrorMessage: typeof error?.message === 'string' ? error.message.slice(0, 200) : undefined,
      });

      throw error;
    }
  }

  private markHealthy(key: string) {
    this.setState(key, {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      lastErrorMessage: undefined,
    });
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
      // Con el circuito abierto no tiene sentido reintentar: ya se sabe la respuesta
      const status = httpStatusOf(error);
      const isRetryable =
        error?.code !== CIRCUIT_OPEN_CODE &&
        (status === null || opts.retryableErrors.includes(status)); // null: error de red

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
  if (!error || error.code === CIRCUIT_OPEN_CODE) return false;

  const code = httpStatusOf(error);
  if (code === null) return true; // Network errors son retryables

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
