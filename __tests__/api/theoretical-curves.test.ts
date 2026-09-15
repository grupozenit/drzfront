import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { theoreticalCurvesService } from '@/lib/api/theoretical-curves';
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

// Lo que se carga es el plan POR ACTIVIDAD; `dataPoints` es la curva del
// proyecto ya ponderada por el backend y viaja de solo lectura.
const mockCurve = {
  id: 'curve-001',
  projectId: 'proj-001',
  activities: [
    {
      category: 'hincado',
      name: 'Hincado',
      weight: 6.3,
      points: [
        { weekNumber: 1, cumulativeProgress: 50 },
        { weekNumber: 2, cumulativeProgress: 100 },
      ],
    },
  ],
  dataPoints: [
    { weekNumber: 1, cumulativeProgress: 31.5 },
    { weekNumber: 2, cumulativeProgress: 63 },
  ],
  totalWeeks: 2,
  coverage: 63,
  uncoveredActivities: [{ category: 'trackers', name: 'Trackers', weight: 37 }],
  hasTotals: true,
  createdAt: '2026-09-01T12:00:00',
  updatedAt: '2026-09-01T12:00:00',
};

const PLAN = {
  activities: [
    {
      category: 'hincado' as const,
      points: [
        { weekNumber: 1, cumulativeProgress: 50 },
        { weekNumber: 2, cumulativeProgress: 100 },
      ],
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('theoreticalCurvesService', () => {
  it('obtiene el plan de un proyecto', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockCurve);
    const curve = await theoreticalCurvesService.get('proj-001');
    expect(apiClient.get).toHaveBeenCalledWith('/theoretical-curves/proj-001');
    expect(curve?.activities[0].category).toBe('hincado');
  });

  it('trae la curva del proyecto ya derivada y su cobertura', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockCurve);
    const curve = await theoreticalCurvesService.get('proj-001');
    expect(curve?.dataPoints).toHaveLength(2);
    expect(curve?.coverage).toBe(63);
    expect(curve?.uncoveredActivities[0].name).toBe('Trackers');
  });

  it('devuelve null cuando el proyecto no tiene plan', async () => {
    (apiClient.get as Mock).mockRejectedValue({ status: 404 });
    expect(await theoreticalCurvesService.get('proj-001')).toBeNull();
  });

  it('crea el plan mandando solo las actividades', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockCurve);
    await theoreticalCurvesService.create('proj-001', PLAN);
    expect(apiClient.post).toHaveBeenCalledWith('/theoretical-curves/proj-001', PLAN);
  });

  it('actualiza reemplazando el plan entero', async () => {
    (apiClient.put as Mock).mockResolvedValue(mockCurve);
    await theoreticalCurvesService.update('proj-001', PLAN);
    expect(apiClient.put).toHaveBeenCalledWith('/theoretical-curves/proj-001', PLAN);
  });

  it('descarga la plantilla con nombre de archivo', async () => {
    await theoreticalCurvesService.downloadTemplate();
    expect(apiClient.downloadFile).toHaveBeenCalledWith(
      '/theoretical-curves/template', 'Plantilla_Curva_S.xlsx',
    );
  });

  it('importa la plantilla como multipart', async () => {
    (apiClient.post as Mock).mockResolvedValue({
      projectId: 'proj-001', activities: 1, totalWeeks: 2, rowsRead: 17, cellsRead: 2,
    });
    const file = new File(['x'], 'curva.xlsx');
    const result = await theoreticalCurvesService.importTemplate('proj-001', file);

    const [url, body] = (apiClient.post as Mock).mock.calls[0];
    expect(url).toBe('/theoretical-curves/proj-001/import');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
    expect(result.activities).toBe(1);
  });

  it('elimina el plan', async () => {
    await theoreticalCurvesService.delete('proj-001');
    expect(apiClient.delete).toHaveBeenCalledWith('/theoretical-curves/proj-001');
  });
});
