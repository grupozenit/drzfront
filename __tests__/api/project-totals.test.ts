import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { projectTotalsService } from '@/lib/api/project-totals';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

const mockTotals = {
  projectId: 'proj-001',
  hasTotals: true,
  updatedAt: '2026-03-01T12:00:00',
  items: [
    {
      id: 'item-1', category: 'hincado', categoryLabel: 'Hincado',
      subActivity: 'Hincado', component: '', label: 'Hincado - Hincado',
      unit: 'ud', totalQuantity: 1000, applies: true,
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('projectTotalsService', () => {
  it('descarga la plantilla con nombre de archivo', async () => {
    await projectTotalsService.downloadTemplate();
    expect(apiClient.downloadFile).toHaveBeenCalledWith(
      '/project-totals/template', 'Plantilla_Totales.xlsx',
    );
  });

  it('obtiene los totales de un proyecto', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockTotals);
    const result = await projectTotalsService.getByProjectId('proj-001');
    expect(apiClient.get).toHaveBeenCalledWith('/project-totals/proj-001');
    expect(result.items[0].label).toBe('Hincado - Hincado');
  });

  it('sube la plantilla como multipart en el campo file', async () => {
    (apiClient.post as Mock).mockResolvedValue({ importedItems: 10 });
    const file = new File(['x'], 'totales.xlsx');

    await projectTotalsService.importTemplate('proj-001', file);

    const [endpoint, body] = (apiClient.post as Mock).mock.calls[0];
    expect(endpoint).toBe('/project-totals/proj-001/import');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });

  it('actualiza una sola cantidad', async () => {
    (apiClient.patch as Mock).mockResolvedValue(mockTotals);
    await projectTotalsService.updateQuantity('proj-001', 'item-1', 500);
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/project-totals/proj-001/items/item-1', { totalQuantity: 500 },
    );
  });

  it('actualiza varias cantidades de una vez', async () => {
    (apiClient.patch as Mock).mockResolvedValue(mockTotals);
    const items = [{ id: 'item-1', totalQuantity: 500 }];
    await projectTotalsService.updateQuantities('proj-001', items);
    expect(apiClient.patch).toHaveBeenCalledWith('/project-totals/proj-001', { items });
  });

  it('propaga el error de importación con las filas a corregir', async () => {
    const failure = Object.assign(new Error('inválido'), {
      data: { errors: [{ row: 5, column: 'CANTIDAD TOTAL', message: 'falta' }] },
    });
    (apiClient.post as Mock).mockRejectedValue(failure);

    await expect(
      projectTotalsService.importTemplate('proj-001', new File(['x'], 'a.xlsx')),
    ).rejects.toMatchObject({ data: { errors: [{ row: 5 }] } });
  });
});
