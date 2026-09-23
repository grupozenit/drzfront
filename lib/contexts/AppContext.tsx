"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  Company,
  Project,
  TeamMember,
  Machine,
  Equipment,
  Driver,
  DailyReport,
  DashboardSummary,
  MeResponse,
  PermissionResource,
  PermissionAction,
} from '@/lib/types';
import {
  companyService,
  projectsService,
  teamService,
  machineryService,
  equipmentService,
  driverService,
  reportsService,
  dashboardService,
  meService,
} from '@/lib/api';

// ============================================
// TIPOS DEL CONTEXT
// ============================================

interface AppState {
  // Datos
  company: Company | null;
  projects: Project[];
  team: TeamMember[];
  machinery: Machine[];
  equipment: Equipment[];
  drivers: Driver[];
  dashboardSummary: DashboardSummary | null;
  permissions: MeResponse | null;

  // Estados de carga
  isLoading: boolean;
  isLoadingCompany: boolean;
  isLoadingProjects: boolean;
  // Por qué falló la última carga de proyectos (null = no falló). Sin esto un
  // 403 se veía igual que "no tenés proyectos": un selector vacío.
  projectsError: string | null;
  isLoadingTeam: boolean;
  isLoadingMachinery: boolean;
  isLoadingEquipment: boolean;
  isLoadingDrivers: boolean;
  isLoadingPermissions: boolean;

  // Control de onboarding
  isOnboardingComplete: boolean;

  // Proyecto seleccionado para filtros
  selectedProjectId: string | null;
}

interface AppContextValue extends AppState {
  // Acciones de Permisos
  loadPermissions: () => Promise<void>;

  // Acciones de Empresa
  loadCompany: () => Promise<void>;

  // Acciones de Proyectos
  loadProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;

  // Acciones de Equipo
  loadTeam: () => Promise<void>;
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, data: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;

  // Acciones de Maquinaria
  loadMachinery: () => Promise<void>;
  addMachine: (machine: Machine) => void;
  updateMachine: (id: string, data: Partial<Machine>) => void;
  removeMachine: (id: string) => void;

  // Acciones de Equipos
  loadEquipment: () => Promise<void>;
  addEquipment: (item: Equipment) => void;
  updateEquipment: (id: string, data: Partial<Equipment>) => void;
  removeEquipment: (id: string) => void;

  // Acciones de Choferes
  loadDrivers: () => Promise<void>;
  addDriver: (driver: Driver) => void;
  updateDriver: (id: string, data: Partial<Driver>) => void;
  removeDriver: (id: string) => void;

  // Acciones de Línea Base

  // Acciones de Dashboard
  loadDashboardSummary: () => Promise<void>;

  // Control de selección
  setSelectedProjectId: (id: string | null) => void;

  // Control de onboarding
  completeOnboarding: () => void;

  // Refrescar todos los datos
  refreshAll: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AppProviderProps {
  children: ReactNode;
  // Datos iniciales opcionales del servidor (SSR)
  initialData?: {
    company?: Company | null;
    projects?: Project[];
    team?: TeamMember[];
    machinery?: Machine[];
    dashboardSummary?: DashboardSummary | null;
  };
}

export function AppProvider({ children, initialData }: AppProviderProps) {
  // Hook de autenticación de Clerk
  const { isLoaded, userId, orgId } = useAuth();
  
  // Determinar si el onboarding está completo: solo verificar que haya al menos un proyecto
  const hasProjects = Boolean(initialData?.projects && initialData.projects.length > 0);
  const isOnboardingCompleteInitial = hasProjects;
  
  // Estado - usar datos iniciales si están disponibles
  const [state, setState] = useState<AppState>({
    company: initialData?.company ?? null,
    projects: initialData?.projects ?? [],
    team: initialData?.team ?? [],
    machinery: initialData?.machinery ?? [],
    equipment: [],
    drivers: [],
    dashboardSummary: initialData?.dashboardSummary ?? null,
    permissions: null,
    isLoading: false,
    isLoadingCompany: false,
    isLoadingProjects: false,
    projectsError: null,
    isLoadingTeam: false,
    isLoadingMachinery: false,
    isLoadingEquipment: false,
    isLoadingDrivers: false,
    isLoadingPermissions: false,
    isOnboardingComplete: isOnboardingCompleteInitial,
    selectedProjectId: null,
  });

  // ============================================
  // PERMISOS
  // ============================================

  const loadPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingPermissions: true }));
    try {
      const permissions = await meService.get();
      setState(prev => ({ ...prev, permissions, isLoadingPermissions: false }));
    } catch (error) {
      console.error('Error loading permissions:', error);
      setState(prev => ({ ...prev, permissions: null, isLoadingPermissions: false }));
    }
  }, []);

  // ============================================
  // EMPRESA
  // ============================================

  const loadCompany = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingCompany: true }));
    try {
      const company = await companyService.get();
      setState(prev => ({
        ...prev, 
        company, 
        isLoadingCompany: false,
      }));
    } catch (error) {
      console.error('Error loading company:', error);
      setState(prev => ({ ...prev, company: null, isLoadingCompany: false }));
    }
  }, []);

  // ============================================
  // PROYECTOS
  // ============================================

  const loadProjects = useCallback(async () => {
    if (!isLoaded || !userId || !orgId) {
      return;
    }
    
    setState(prev => ({ ...prev, isLoadingProjects: true, projectsError: null }));
    try {
      const projects = await projectsService.getAll();
      setState(prev => ({
        ...prev, 
        projects, 
        isLoadingProjects: false,
        projectsError: null,
        isOnboardingComplete: projects.length > 0,
      }));
    } catch (error) {
      console.error('Error loading projects:', error);
      const code = (error as { code?: string } | null)?.code;
      const projectsError = code === '403'
        ? 'Tu usuario no tiene permiso para ver proyectos. Pedile a un administrador que revise tu rol.'
        : 'No se pudieron cargar los proyectos. Revisá tu conexión y reintentá.';
      setState(prev => ({ ...prev, projects: [], isLoadingProjects: false, projectsError, isOnboardingComplete: false }));
    }
  }, [isLoaded, userId, orgId]);

  const addProject = useCallback((project: Project) => {
    setState(prev => {
      const newProjects = [...prev.projects, project];
      return {
        ...prev,
        projects: newProjects,
        isOnboardingComplete: newProjects.length > 0,
      };
    });
  }, []);

  const updateProjectState = useCallback((id: string, data: Partial<Project>) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => 
        p.id === id ? { ...p, ...data } : p
      ),
    }));
  }, []);

  const removeProject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  }, []);

  // ============================================
  // EQUIPO
  // ============================================

  const loadTeam = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingTeam: true }));
    try {
      const team = await teamService.getAll();
      setState(prev => ({ ...prev, team, isLoadingTeam: false }));
    } catch (error) {
      console.error('Error loading team:', error);
      setState(prev => ({ ...prev, isLoadingTeam: false }));
    }
  }, []);

  const addTeamMember = useCallback((member: TeamMember) => {
    setState(prev => ({
      ...prev,
      team: [...prev.team, member],
    }));
  }, []);

  const updateTeamMemberState = useCallback((id: string, data: Partial<TeamMember>) => {
    setState(prev => ({
      ...prev,
      team: prev.team.map(m => 
        m.id === id ? { ...m, ...data } : m
      ),
    }));
  }, []);

  const removeTeamMember = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      team: prev.team.filter(m => m.id !== id),
    }));
  }, []);

  // ============================================
  // MAQUINARIA
  // ============================================

  const loadMachinery = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingMachinery: true }));
    try {
      const machinery = await machineryService.getAll();
      setState(prev => ({ ...prev, machinery, isLoadingMachinery: false }));
    } catch (error) {
      console.error('Error loading machinery:', error);
      setState(prev => ({ ...prev, isLoadingMachinery: false }));
    }
  }, []);

  const addMachine = useCallback((machine: Machine) => {
    setState(prev => ({
      ...prev,
      machinery: [...prev.machinery, machine],
    }));
  }, []);

  const updateMachineState = useCallback((id: string, data: Partial<Machine>) => {
    setState(prev => ({
      ...prev,
      machinery: prev.machinery.map(m => 
        m.id === id ? { ...m, ...data } : m
      ),
    }));
  }, []);

  const removeMachine = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      machinery: prev.machinery.filter(m => m.id !== id),
    }));
  }, []);

  // ============================================
  // EQUIPOS
  // ============================================

  const loadEquipment = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingEquipment: true }));
    try {
      const equipment = await equipmentService.getAll();
      setState(prev => ({ ...prev, equipment, isLoadingEquipment: false }));
    } catch (error) {
      console.error('Error loading equipment:', error);
      setState(prev => ({ ...prev, isLoadingEquipment: false }));
    }
  }, []);

  const addEquipment = useCallback((item: Equipment) => {
    setState(prev => ({
      ...prev,
      equipment: [...prev.equipment, item],
    }));
  }, []);

  const updateEquipmentState = useCallback((id: string, data: Partial<Equipment>) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.map(e =>
        e.id === id ? { ...e, ...data } : e
      ),
    }));
  }, []);

  const removeEquipment = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e.id !== id),
    }));
  }, []);

  // ============================================
  // CHOFERES
  // ============================================

  const loadDrivers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingDrivers: true }));
    try {
      const drivers = await driverService.getAll({ status: 'all' });
      setState(prev => ({ ...prev, drivers, isLoadingDrivers: false }));
    } catch (error) {
      console.error('Error loading drivers:', error);
      setState(prev => ({ ...prev, isLoadingDrivers: false }));
    }
  }, []);

  const addDriver = useCallback((driver: Driver) => {
    setState(prev => ({
      ...prev,
      drivers: [...prev.drivers, driver],
    }));
  }, []);

  const updateDriverState = useCallback((id: string, data: Partial<Driver>) => {
    setState(prev => ({
      ...prev,
      drivers: prev.drivers.map(d =>
        d.id === id ? { ...d, ...data } : d
      ),
    }));
  }, []);

  const removeDriver = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      drivers: prev.drivers.filter(d => d.id !== id),
    }));
  }, []);

  // ============================================
  // DASHBOARD
  // ============================================

  const loadDashboardSummary = useCallback(async () => {
    try {
      const summary = await dashboardService.getSummary();
      setState(prev => ({ ...prev, dashboardSummary: summary }));
    } catch (error) {
      console.error('Error loading dashboard summary:', error);
    }
  }, []);

  // ============================================
  // CONTROL DE SELECCIÓN
  // ============================================

  const setSelectedProjectId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedProjectId: id }));
  }, []);

  // ============================================
  // ONBOARDING
  // ============================================

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnboardingComplete: prev.projects.length > 0,
    }));
  }, []);

  // ============================================
  // REFRESCAR TODO
  // ============================================

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await Promise.all([
      loadPermissions(),
      loadCompany(),
      loadProjects(),
      loadTeam(),
      loadMachinery(),
      loadDashboardSummary(),
    ]);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [loadPermissions, loadCompany, loadProjects, loadTeam, loadMachinery, loadDashboardSummary]);

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================

  useEffect(() => {
    // Solo cargar datos si Clerk está listo y el usuario está autenticado
    if (!isLoaded || !userId || !orgId) {
      return;
    }

    // Si no tenemos datos iniciales del servidor o no hay proyectos, cargarlos
    if (!initialData || (!initialData.company && !initialData.projects) || state.projects.length === 0) {
      console.log('AppProvider: Loading data, no initial data or no projects');
      refreshAll();
    }
  }, [isLoaded, userId, orgId, initialData, refreshAll, state.projects.length]);

  // Los permisos no tienen precarga SSR (a diferencia de company/projects),
  // así que el efecto de arriba los puede saltear por completo cuando el
  // servidor sí trajo datos iniciales. Este efecto es incondicional a eso.
  useEffect(() => {
    if (!isLoaded || !userId || !orgId) {
      return;
    }
    loadPermissions();
  }, [isLoaded, userId, orgId, loadPermissions]);

  // ============================================
  // VALOR DEL CONTEXT
  // ============================================

  const value: AppContextValue = {
    ...state,
    loadPermissions,
    loadCompany,
    loadProjects,
    addProject,
    updateProject: updateProjectState,
    removeProject,
    loadTeam,
    addTeamMember,
    updateTeamMember: updateTeamMemberState,
    removeTeamMember,
    loadMachinery,
    addMachine,
    updateMachine: updateMachineState,
    removeMachine,
    loadEquipment,
    addEquipment,
    updateEquipment: updateEquipmentState,
    removeEquipment,
    loadDrivers,
    addDriver,
    updateDriver: updateDriverState,
    removeDriver,
    loadDashboardSummary,
    setSelectedProjectId,
    completeOnboarding,
    refreshAll,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ============================================
// HOOKS ESPECÍFICOS (para conveniencia)
// ============================================

export function useProjects() {
  const { projects, isLoadingProjects, projectsError, loadProjects, addProject, updateProject, removeProject } = useApp();
  return { projects, isLoading: isLoadingProjects, error: projectsError, loadProjects, addProject, updateProject, removeProject };
}

export function useCompany() {
  const { company, isLoadingCompany, loadCompany } = useApp();
  return { company, isLoading: isLoadingCompany, loadCompany };
}

export function useTeam() {
  const { team, isLoadingTeam, loadTeam, addTeamMember, updateTeamMember, removeTeamMember } = useApp();
  return { team, isLoading: isLoadingTeam, loadTeam, addTeamMember, updateTeamMember, removeTeamMember };
}

export function useMachinery() {
  const { machinery, isLoadingMachinery, loadMachinery, addMachine, updateMachine, removeMachine } = useApp();
  return { machinery, isLoading: isLoadingMachinery, loadMachinery, addMachine, updateMachine, removeMachine };
}

export function useEquipment() {
  const { equipment, isLoadingEquipment, loadEquipment, addEquipment, updateEquipment, removeEquipment } = useApp();
  return { equipment, isLoading: isLoadingEquipment, loadEquipment, addEquipment, updateEquipment, removeEquipment };
}

export function useDrivers() {
  const { drivers, isLoadingDrivers, loadDrivers, addDriver, updateDriver, removeDriver } = useApp();
  return { drivers, isLoading: isLoadingDrivers, loadDrivers, addDriver, updateDriver, removeDriver };
}

export function useSelectedProject() {
  const { projects, selectedProjectId, setSelectedProjectId } = useApp();
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  return { selectedProject, selectedProjectId, setSelectedProjectId, projects };
}

/**
 * Única fuente de verdad de la matriz de permisos en el cliente: consume
 * `GET /me` (vía AppContext) en vez de reimplementar la matriz.
 *
 * Mientras `permissions` no cargó todavía (login recién hecho, primer
 * render) `can()` devuelve `false` para todo — evita destellos de UI con
 * permisos de más antes de que llegue la respuesta real del backend.
 */
export function usePermissions() {
  const { permissions, isLoadingPermissions, loadPermissions } = useApp();

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction): boolean => {
      if (!permissions) return false;
      return permissions.permissions[resource]?.includes(action) ?? false;
    },
    [permissions]
  );

  const canAccessProject = useCallback(
    (projectId: string | null): boolean => {
      if (!permissions) return false;
      if (permissions.scope === 'all') return true;
      return (permissions.projectIds ?? []).includes(projectId ?? '');
    },
    [permissions]
  );

  return {
    permissions,
    isLoading: isLoadingPermissions,
    loadPermissions,
    role: permissions?.role ?? null,
    scope: permissions?.scope ?? null,
    projectIds: permissions?.projectIds ?? null,
    landing: permissions?.landing ?? '/tablero',
    can,
    canAccessProject,
  };
}

