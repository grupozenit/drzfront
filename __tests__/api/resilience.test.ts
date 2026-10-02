import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CIRCUIT_OPEN_CODE,
  circuitBreaker,
  isServiceFailure,
  resilientFetch,
  retryWithBackoff,
} from '@/lib/api/resilience';

const KEY = 'POST:/reports';
const rejected = (code: string, message = 'rechazado') => () => Promise.reject({ code, message });

async function failTimes(n: number, fn: () => Promise<unknown>) {
  for (let i = 0; i < n; i++) {
    await circuitBreaker.execute(KEY, fn).catch(() => undefined);
  }
}

beforeEach(() => {
  circuitBreaker.resetAll();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isServiceFailure', () => {
  it('cuenta la red caída y los 5xx', () => {
    expect(isServiceFailure({ code: 'NETWORK_ERROR' })).toBe(true);
    expect(isServiceFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isServiceFailure({ code: '500' })).toBe(true);
    expect(isServiceFailure({ code: '503' })).toBe(true);
  });

  it('no cuenta los 4xx: el servidor respondió', () => {
    for (const code of ['400', '401', '403', '404', '422', '429']) {
      expect(isServiceFailure({ code })).toBe(false);
    }
  });

  it('no cuenta su propio error de circuito abierto', () => {
    expect(isServiceFailure({ code: CIRCUIT_OPEN_CODE })).toBe(false);
  });
});

describe('circuitBreaker', () => {
  it('un parte rechazado con 422 nunca abre el circuito y el usuario ve el motivo', async () => {
    const invalid = rejected('422', 'La categoría "Hincado" requiere sub-actividad');
    await failTimes(10, invalid);

    await expect(circuitBreaker.execute(KEY, invalid)).rejects.toMatchObject({
      code: '422',
      message: 'La categoría "Hincado" requiere sub-actividad',
    });
    expect(circuitBreaker.getStatus(KEY).state).toBe('CLOSED');
  });

  it('cinco 500 seguidos abren el circuito, con un mensaje entendible', async () => {
    await failTimes(5, rejected('500', 'Error interno del servidor'));

    const fn = vi.fn();
    const error: any = await circuitBreaker.execute(KEY, fn).catch((e: any) => e);
    expect(fn).not.toHaveBeenCalled();
    expect(error.code).toBe(CIRCUIT_OPEN_CODE);
    expect(error.message).toContain('El servidor no está respondiendo');
    expect(error.message).toContain('Error interno del servidor');
  });

  it('un 4xx entre fallas reinicia la cuenta: el servidor está vivo', async () => {
    await failTimes(4, rejected('500'));
    await failTimes(1, rejected('422'));
    await failTimes(4, rejected('500'));
    expect(circuitBreaker.getStatus(KEY).state).toBe('CLOSED');
  });

  it('pasado el timeout deja pasar un intento y cierra si sale bien', async () => {
    vi.useFakeTimers();
    await failTimes(5, rejected('500'));
    vi.advanceTimersByTime(60_001);

    await expect(circuitBreaker.execute(KEY, () => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(circuitBreaker.getStatus(KEY).state).toBe('CLOSED');
  });

  it('si el intento de prueba falla, vuelve a abrir', async () => {
    vi.useFakeTimers();
    await failTimes(5, rejected('500'));
    vi.advanceTimersByTime(60_001);

    await failTimes(1, rejected('500'));
    expect(circuitBreaker.getStatus(KEY).state).toBe('OPEN');
  });

  it('el intento de prueba con un 4xx cierra el circuito', async () => {
    vi.useFakeTimers();
    await failTimes(5, rejected('500'));
    vi.advanceTimersByTime(60_001);

    await failTimes(1, rejected('422'));
    expect(circuitBreaker.getStatus(KEY).state).toBe('CLOSED');
  });
});

describe('retryWithBackoff', () => {
  it('no reintenta con el circuito abierto', async () => {
    const fn = vi.fn().mockRejectedValue({ code: CIRCUIT_OPEN_CODE, message: 'abierto' });
    await expect(retryWithBackoff(fn, { initialDelay: 0 })).rejects.toMatchObject({
      code: CIRCUIT_OPEN_CODE,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('no reintenta un 422', async () => {
    const fn = vi.fn().mockRejectedValue({ code: '422', message: 'inválido' });
    await expect(retryWithBackoff(fn, { initialDelay: 0 })).rejects.toMatchObject({ code: '422' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta un error de red', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'sin red' })
      .mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, { initialDelay: 0 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('resilientFetch', () => {
  it('un GET con 422 se intenta una sola vez y no toca el circuito', async () => {
    const fn = vi.fn().mockRejectedValue({ code: '422', message: 'inválido' });
    await expect(
      resilientFetch(fn, { circuitBreakerKey: 'GET:/x', initialDelay: 0 }),
    ).rejects.toMatchObject({ code: '422' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getStatus('GET:/x').failureCount).toBe(0);
  });
});
