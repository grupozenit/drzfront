import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// IndexedDB no existe en node: la tabla se simula con un Map
const store = new Map<string, any>();

vi.mock('@/lib/offline/db', () => ({
  offlineDb: {
    pendingReports: {
      where: () => ({
        anyOf: (...statuses: string[]) => ({
          sortBy: async () =>
            [...store.values()]
              .filter((r) => statuses.includes(r.status))
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((r) => ({ ...r })),
        }),
        equals: (status: string) => ({
          sortBy: async () => [...store.values()].filter((r) => r.status === status),
        }),
      }),
      update: async (id: string, changes: object) => {
        if (store.has(id)) store.set(id, { ...store.get(id), ...changes });
      },
      delete: async (id: string) => {
        store.delete(id);
      },
    },
  },
  offlineImagesToFiles: () => [],
}));

vi.mock('@/lib/api', () => ({
  reportsService: { create: vi.fn() },
}));

import { reportsService } from '@/lib/api';
import {
  discardRejectedReport,
  getRejectedReports,
  retryRejectedReport,
  syncPendingReports,
} from '@/lib/offline/sync';

function queue(id: string, createdAt: number, status = 'pending') {
  store.set(id, { id, data: { date: '2026-10-02' }, images: [], status, createdAt, attempts: 0 });
}

const create = reportsService.create as Mock;

beforeEach(() => {
  store.clear();
  create.mockReset();
});

describe('syncPendingReports', () => {
  it('sube y borra de la cola los que el servidor acepta', async () => {
    queue('a', 1);
    queue('b', 2, 'failed');
    create.mockResolvedValue({});

    await syncPendingReports();

    expect(create).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(0);
  });

  it('un 422 queda como rechazado, con el motivo, y no se reintenta solo', async () => {
    queue('a', 1);
    create.mockRejectedValue({ code: '422', message: 'La categoría "Hincado" requiere sub-actividad' });

    await syncPendingReports();
    await syncPendingReports();

    expect(create).toHaveBeenCalledTimes(1);
    expect(store.get('a')).toMatchObject({
      status: 'rejected',
      errorMessage: 'La categoría "Hincado" requiere sub-actividad',
    });
  });

  it('un rechazo no frena al resto de la cola', async () => {
    queue('a', 1);
    queue('b', 2);
    create.mockRejectedValueOnce({ code: '422', message: 'inválido' }).mockResolvedValueOnce({});

    await syncPendingReports();

    expect(store.get('a').status).toBe('rejected');
    expect(store.has('b')).toBe(false);
  });

  it('con el servidor caído corta y deja el resto en cola', async () => {
    queue('a', 1);
    queue('b', 2);
    create.mockRejectedValue({ code: '500', message: 'Error interno' });

    await syncPendingReports();

    expect(create).toHaveBeenCalledTimes(1);
    expect(store.get('a').status).toBe('failed');
    expect(store.get('b').status).toBe('pending');
  });

  it.each(['401', '408', '429'])('un %s es transitorio: queda para reintentar', async (code) => {
    queue('a', 1);
    create.mockRejectedValue({ code, message: 'x' });

    await syncPendingReports();

    expect(store.get('a').status).toBe('failed');
  });

  it('guarda el mensaje aunque el error no sea un Error (los ApiError son objetos)', async () => {
    queue('a', 1);
    create.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'No se pudo conectar' });

    await syncPendingReports();

    expect(store.get('a').errorMessage).toBe('No se pudo conectar');
  });

  it('dos sincronizaciones a la vez no suben el mismo parte dos veces', async () => {
    queue('a', 1);
    let resolve!: () => void;
    create.mockReturnValue(new Promise<void>((r) => (resolve = r)));

    const first = syncPendingReports();
    const second = syncPendingReports();
    await new Promise((r) => setTimeout(r, 0));
    resolve();
    await Promise.all([first, second]);

    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('partes rechazados', () => {
  it('se listan, se pueden volver a encolar y descartar', async () => {
    queue('a', 1, 'rejected');
    queue('b', 2, 'rejected');

    expect((await getRejectedReports()).map((r) => r.id)).toEqual(['a', 'b']);

    await retryRejectedReport('a');
    expect(store.get('a').status).toBe('pending');

    await discardRejectedReport('b');
    expect(store.has('b')).toBe(false);
  });
});
