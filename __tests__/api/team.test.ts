import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { teamService } from '@/lib/api/team';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getAuthToken: vi.fn(),
}));

const mockMember = {
  id: 'user-001',
  name: 'Ana Gómez',
  email: 'ana@test.com',
  role: 'jefe_obra',
  isActive: true,
  projectIds: ['proj-001'],
  joinDate: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('teamService.changeRole', () => {
  it('llama a PUT /team/{id}/role con el nuevo rol', async () => {
    (apiClient.put as Mock).mockResolvedValue({ ...mockMember, role: 'compras' });
    const result = await teamService.changeRole('user-001', 'compras');
    expect(apiClient.put).toHaveBeenCalledWith('/team/user-001/role', { role: 'compras' });
    expect(result.role).toBe('compras');
  });
});

describe('teamService.updateProjectAssignments', () => {
  it('llama a PUT /team/{id}/projects con la lista completa de proyectos', async () => {
    (apiClient.put as Mock).mockResolvedValue({ ...mockMember, projectIds: ['proj-001', 'proj-002'] });
    const result = await teamService.updateProjectAssignments('user-001', ['proj-001', 'proj-002']);
    expect(apiClient.put).toHaveBeenCalledWith('/team/user-001/projects', { projectIds: ['proj-001', 'proj-002'] });
    expect(result.projectIds).toEqual(['proj-001', 'proj-002']);
  });

  it('permite vaciar las asignaciones con un array vacío', async () => {
    (apiClient.put as Mock).mockResolvedValue({ ...mockMember, projectIds: [] });
    await teamService.updateProjectAssignments('user-001', []);
    expect(apiClient.put).toHaveBeenCalledWith('/team/user-001/projects', { projectIds: [] });
  });
});

describe('teamService.getAll', () => {
  it('llama a apiClient.get con el endpoint correcto', async () => {
    (apiClient.get as Mock).mockResolvedValue([mockMember]);
    const result = await teamService.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/team');
    expect(result[0].projectIds).toEqual(['proj-001']);
  });
});
