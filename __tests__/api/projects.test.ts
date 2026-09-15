import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { projectsService } from '@/lib/api/projects';
import { apiClient } from '@/lib/api/client';

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

const mockProject = {
  id: 'proj-001',
  name: 'Proyecto Solar Test',
  companyId: 'company-001',
  status: 'active',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('projectsService.getAll', () => {
  it('llama a apiClient.get con el endpoint correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue([mockProject]);
    await projectsService.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/projects');
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('projectsService.getById', () => {
  it('llama a apiClient.get con el ID correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue(mockProject);
    await projectsService.getById('proj-001');
    expect(apiClient.get).toHaveBeenCalledWith('/projects/proj-001');
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('projectsService.create', () => {
  it('llama a apiClient.post con los datos del proyecto', async () => {
    (apiClient.post as Mock).mockResolvedValue(mockProject);
    const data = { name: 'Nuevo Proyecto' };
    await projectsService.create(data as any);
    expect(apiClient.post).toHaveBeenCalledWith('/projects', data);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('projectsService.update', () => {
  it('llama a apiClient.put con el ID y los datos', async () => {
    (apiClient.put as Mock).mockResolvedValue(mockProject);
    const data = { name: 'Proyecto Actualizado' };
    await projectsService.update('proj-001', data as any);
    expect(apiClient.put).toHaveBeenCalledWith('/projects/proj-001', data);
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe('projectsService.delete', () => {
  it('llama a apiClient.delete con el ID correcto', async () => {
    (apiClient.delete as Mock).mockResolvedValue(undefined);
    await projectsService.delete('proj-001');
    expect(apiClient.delete).toHaveBeenCalledWith('/projects/proj-001');
  });
});

// ─── getActive ────────────────────────────────────────────────────────────────

describe('projectsService.getActive', () => {
  it('llama a apiClient.get con status active', async () => {
    (apiClient.get as Mock).mockResolvedValue([mockProject]);
    await projectsService.getActive();
    expect(apiClient.get).toHaveBeenCalledWith('/projects', { status: 'active' });
  });
});
