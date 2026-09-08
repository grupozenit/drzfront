import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { reportsService } from '@/lib/api/reports';
import { apiClient, getAuthToken } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockReport = {
  id: 'report-001',
  projectId: 'proj-001',
  date: '2024-03-15',
  status: 'enviado',
  activities: [],
};

const baseReportData: any = {
  projectId: 'proj-001',
  date: '2024-03-15',
  entryTime: '08:00',
  exitTime: '17:00',
  directStaff: 10,
  indirectStaff: 2,
  weather: 'sunny',
  isHoliday: false,
  hasSuspendedHours: false,
  hasAccident: false,
  tomorrowTasks: [],
  activities: [],
  status: 'enviado',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('reportsService.getAll', () => {
  it('llama a apiClient.get con el endpoint correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue([mockReport]);
    const filters = { projectId: 'proj-001' };
    await reportsService.getAll(filters);
    expect(apiClient.get).toHaveBeenCalledWith('/reports', filters);
  });
});

// ─── getPaginated ─────────────────────────────────────────────────────────────

describe('reportsService.getPaginated', () => {
  it('llama con params page y pageSize', async () => {
    (apiClient.get as Mock).mockResolvedValue({ items: [], total: 0 });
    await reportsService.getPaginated(2, 20);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/reports',
      expect.objectContaining({ page: 2, pageSize: 20 }),
    );
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('reportsService.getById', () => {
  it('llama a apiClient.get con el ID correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockReport);
    await reportsService.getById('report-001');
    expect(apiClient.get).toHaveBeenCalledWith('/reports/report-001');
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('reportsService.create', () => {
  it('sin imágenes → igual manda FormData con el campo data', async () => {
    // El endpoint recibe el reporte en un campo de formulario. Mandar el
    // objeto como JSON hacía que el backend contestara "Se requiere campo
    // 'data'" y no se pudiera enviar un reporte sin fotos.
    (apiClient.post as Mock).mockResolvedValue(mockReport);
    await reportsService.create(baseReportData);

    const [endpoint, body] = (apiClient.post as Mock).mock.calls[0];
    expect(endpoint).toBe('/reports');
    expect(body).toBeInstanceOf(FormData);
    expect(JSON.parse((body as FormData).get('data') as string)).toEqual(baseReportData);
    expect((body as FormData).getAll('images')).toEqual([]);
  });

  it('con imágenes → las adjunta en el campo images', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockReport);
    const mockFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    await reportsService.create({ ...baseReportData, images: [mockFile] });

    const body = (apiClient.post as Mock).mock.calls[0][1] as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll('images')).toEqual([mockFile]);
    // Las imágenes no viajan además dentro del JSON
    expect(JSON.parse(body.get('data') as string).images).toBeUndefined();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('reportsService.update', () => {
  it('llama a apiClient.put con FormData', async () => {
    (apiClient.put as Mock).mockResolvedValue(mockReport);
    await reportsService.update('report-001', baseReportData);
    expect(apiClient.put).toHaveBeenCalledWith('/reports/report-001', expect.any(FormData));
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe('reportsService.delete', () => {
  it('llama a apiClient.delete con el ID correcto', async () => {
    (apiClient.delete as Mock).mockResolvedValue(undefined);
    await reportsService.delete('report-001');
    expect(apiClient.delete).toHaveBeenCalledWith('/reports/report-001');
  });
});

// ─── saveDraft ────────────────────────────────────────────────────────────────

describe('reportsService.saveDraft', () => {
  it('llama a create con status borrador', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockReport);
    await reportsService.saveDraft(baseReportData);

    const body = (apiClient.post as Mock).mock.calls[0][1] as FormData;
    expect(JSON.parse(body.get('data') as string).status).toBe('borrador');
  });
});

// ─── send ─────────────────────────────────────────────────────────────────────

describe('reportsService.send', () => {
  it('llama a apiClient.post en el endpoint de send', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockReport);
    await reportsService.send('report-001');
    expect(apiClient.post).toHaveBeenCalledWith('/reports/report-001/send');
  });
});

// ─── sendEmail ────────────────────────────────────────────────────────────────

describe('reportsService.sendEmail', () => {
  it('llama a apiClient.post con recipients', async () => {
    (apiClient.post as Mock).mockResolvedValue({ success: true, message: 'ok' });
    await reportsService.sendEmail({
      reportId: 'report-001',
      recipients: ['user@example.com'],
    });
    expect(apiClient.post).toHaveBeenCalledWith('/reports/report-001/email', {
      recipients: ['user@example.com'],
    });
  });
});

// ─── generateWhatsAppLink ─────────────────────────────────────────────────────

describe('reportsService.generateWhatsAppLink', () => {
  it('genera URL con wa.me correctamente', () => {
    const link = reportsService.generateWhatsAppLink('report-001');
    expect(link).toContain('https://wa.me/');
    expect(link).toContain('report-001');
    expect(link).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});

// ─── getLatestByProject ───────────────────────────────────────────────────────

describe('reportsService.getLatestByProject', () => {
  it('retorna null cuando el error es 404', async () => {
    (apiClient.get as Mock).mockRejectedValue({ code: '404', message: 'Not found' });
    const result = await reportsService.getLatestByProject('proj-001');
    expect(result).toBeNull();
  });
});

// ─── deleteImage ──────────────────────────────────────────────────────────────

describe('reportsService.deleteImage', () => {
  it('llama a apiClient.delete con la URL codificada', async () => {
    (apiClient.delete as Mock).mockResolvedValue(mockReport);
    const imageUrl = 'http://example.com/images/photo.jpg';
    await reportsService.deleteImage('report-001', imageUrl);
    expect(apiClient.delete).toHaveBeenCalledWith(
      `/reports/report-001/images/${encodeURIComponent(imageUrl)}`,
    );
  });
});
