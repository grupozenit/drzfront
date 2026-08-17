import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { weeklyReportsService } from '@/lib/api/weekly-reports';
import { apiClient, getAuthToken } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockReport = {
  id: 'wr-001',
  projectId: 'proj-001',
  projectName: 'Proyecto Solar Test',
  companyId: 'company-001',
  weekNumber: 5,
  year: 2026,
  startDate: '2026-01-26',
  endDate: '2026-02-01',
  overallProgress: 42.5,
  weeklyProgress: 3.2,
  trackerProgress: 38.0,
  modulosProgress: 45.0,
  pdfUrl: null,
  pdfFilename: null,
  status: 'generado',
  errorMessage: null,
  generatedAt: '2026-02-01T21:00:00Z',
  createdAt: '2026-02-01T21:00:00Z',
};

const mockListResponse = {
  reports: [mockReport],
  total: 1,
  page: 1,
  pageSize: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('weeklyReportsService.getAll', () => {
  it('llama a apiClient.get sin filtros', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockListResponse);
    const result = await weeklyReportsService.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/weekly-reports', expect.objectContaining({
      page: 1,
      pageSize: 20,
    }));
    expect(result.total).toBe(1);
    expect(result.reports).toHaveLength(1);
  });

  it('pasa filtros de proyecto y año al endpoint', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockListResponse);
    await weeklyReportsService.getAll({ projectId: 'proj-001', year: 2026 }, 2, 10);
    expect(apiClient.get).toHaveBeenCalledWith('/weekly-reports', expect.objectContaining({
      projectId: 'proj-001',
      year: 2026,
      page: 2,
      pageSize: 10,
    }));
  });

  it('retorna lista vacía si no hay reportes', async () => {
    (apiClient.get as Mock).mockResolvedValue({ reports: [], total: 0, page: 1, pageSize: 20 });
    const result = await weeklyReportsService.getAll();
    expect(result.total).toBe(0);
    expect(result.reports).toEqual([]);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('weeklyReportsService.getById', () => {
  it('llama a apiClient.get con el ID correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockReport);
    const result = await weeklyReportsService.getById('wr-001');
    expect(apiClient.get).toHaveBeenCalledWith('/weekly-reports/wr-001');
    expect(result.id).toBe('wr-001');
    expect(result.weekNumber).toBe(5);
  });

  it('propaga el error si el reporte no existe', async () => {
    (apiClient.get as Mock).mockRejectedValue(new Error('NOT_FOUND'));
    await expect(weeklyReportsService.getById('nonexistent')).rejects.toThrow('NOT_FOUND');
  });
});

// ─── generateReport ───────────────────────────────────────────────────────────

describe('weeklyReportsService.generateReport', () => {
  it('llama a apiClient.post con query params incrustados en la URL', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockReport);
    const result = await weeklyReportsService.generateReport(
      'proj-001',
      '2026-01-26',
      '2026-02-01',
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/weekly-reports/generate?projectId=proj-001&startDate=2026-01-26&endDate=2026-02-01',
    );
    expect(result.weekNumber).toBe(5);
  });

  it('propaga error si el proyecto no existe', async () => {
    (apiClient.post as Mock).mockRejectedValue(new Error('NOT_FOUND'));
    await expect(
      weeklyReportsService.generateReport('bad-proj', '2026-01-26', '2026-02-01'),
    ).rejects.toThrow('NOT_FOUND');
  });
});

// ─── deleteReport ─────────────────────────────────────────────────────────────

describe('weeklyReportsService.deleteReport', () => {
  it('llama a apiClient.delete con el ID correcto', async () => {
    (apiClient.delete as Mock).mockResolvedValue(undefined);
    await weeklyReportsService.deleteReport('wr-001');
    expect(apiClient.delete).toHaveBeenCalledWith('/weekly-reports/wr-001');
  });

  it('propaga error si el reporte no existe', async () => {
    (apiClient.delete as Mock).mockRejectedValue(new Error('NOT_FOUND'));
    await expect(weeklyReportsService.deleteReport('nonexistent')).rejects.toThrow('NOT_FOUND');
  });
});

// ─── downloadPDF ─────────────────────────────────────────────────────────────

describe('weeklyReportsService.downloadPDF', () => {
  it('no hace nada si no estamos en el browser', async () => {
    // window es undefined en entorno vitest/node → la función retorna silenciosamente
    await expect(weeklyReportsService.downloadPDF('wr-001')).resolves.toBeUndefined();
    // getAuthToken no debe haber sido llamado
    expect(getAuthToken).not.toHaveBeenCalled();
  });
});
