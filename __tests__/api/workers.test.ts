import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { workersService } from '@/lib/api/workers';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe('workersService', () => {
  it('lista la plantilla de un proyecto con su estado', async () => {
    (apiClient.get as Mock).mockResolvedValue([]);
    await workersService.getAll({ projectId: 'p1', status: 'todos' });
    expect(apiClient.get).toHaveBeenCalledWith('/workers', { projectId: 'p1', status: 'todos' });
  });

  it('pide la lista de funciones de la empresa', async () => {
    (apiClient.get as Mock).mockResolvedValue([]);
    await workersService.getFunctions();
    expect(apiClient.get).toHaveBeenCalledWith('/workers/functions');
  });

  it('da de baja con DELETE y reactiva con PUT', async () => {
    await workersService.remove('w1');
    expect(apiClient.delete).toHaveBeenCalledWith('/workers/w1');
    await workersService.update('w1', { estado: 'activo' });
    expect(apiClient.put).toHaveBeenCalledWith('/workers/w1', { estado: 'activo' });
  });

  it('descarga la plantilla con el proyecto como sugerencia de empresas', async () => {
    await workersService.downloadTemplate('p 1');
    expect(apiClient.downloadFile).toHaveBeenCalledWith(
      '/workers/template?projectId=p%201', 'Plantilla_Trabajadores.xlsx',
    );
  });

  it('sube la plantilla como multipart en el campo file', async () => {
    (apiClient.post as Mock).mockResolvedValue({ imported: 3 });
    const file = new File(['x'], 'trabajadores.xlsx');
    await workersService.importTemplate('p1', file);
    const [endpoint, body] = (apiClient.post as Mock).mock.calls[0];
    expect(endpoint).toBe('/workers/projects/p1/import');
    expect((body as FormData).get('file')).toBe(file);
  });
});
