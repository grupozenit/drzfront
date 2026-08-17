"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  Company,
  Project,
  TeamMember,
  Machine,
  Equipment,
  DailyReport,
  DashboardSummary,
  Baseline,
} from '@/lib/types';
import {
  companyService,
  projectsService,
  teamService,
  machineryService,
  equipmentService,
  reportsService,
  dashboardService,
  baselinesService,
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
  baselines: Record<string, Baseline>; // projectId -> Baseline
  dashboardSummary: DashboardSummary | null;

  // Estados de carga
  isLoading: boolean;
  isLoadingCompany: boolean;
  isLoadingProjects: boolean;
  isLoadingTeam: boolean;
  isLoadingMachinery: boolean;
  isLoadingEquipment: boolean;

  // Control de onboarding
  isOnboardingComplete: boolean;

  // Proyecto seleccionado para filtros
  selectedProjectId: string | null;
}

interface AppContextValue extends AppState {
  // Acciones de Empresa
  loadCompany: () => Promise<void>;
  updateCompany: (data: Partial<Company>) => Promise<void>;

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

  // Acciones de Línea Base
  loadBaseline: (projectId: string) => Promise<Baseline | null>;
  setBaseline: (projectId: string, baseline: Baseline) => void;

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
    baselines: {},
    dashboardSummary: initialData?.dashboardSummary ?? null,
    isLoading: false,
    isLoadingCompany: false,
    isLoadingProjects: false,
    isLoadingTeam: false,
    isLoadingMachinery: false,
    isLoadingEquipment: false,
    isOnboardingComplete: isOnboardingCompleteInitial,
    selectedProjectId: null,
  });

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

  const updateCompanyState = useCallback(async (data: Partial<Company>) => {
    if (state.company) {
      setState(prev => ({
        ...prev,
        company: prev.company ? { ...prev.company, ...data } : null,
      }));
    }
  }, [state.company]);

  // ============================================
  // PROYECTOS
  // ============================================

  const loadProjects = useCallback(async () => {
    if (!isLoaded || !userId || !orgId) {
      return;
    }
    
    setState(prev => ({ ...prev, isLoadingProjects: true }));
    try {
      const projects = await projectsService.getAll();
      setState(prev => ({
        ...prev, 
        projects, 
        isLoadingProjects: false,
        isOnboardingComplete: projects.length > 0,
      }));
    } catch (error) {
      console.error('Error loading projects:', error);
      setState(prev => ({ ...prev, projects: [], isLoadingProjects: false, isOnboardingComplete: false }));
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
  // LÍNEA BASE
  // ============================================

  const loadBaseline = useCallback(async (projectId: string): Promise<Baseline | null> => {
    // Si ya la tenemos en cache, devolverla
    if (state.baselines[projectId]) {
      return state.baselines[projectId];
    }

    try {
      const baseline = await baselinesService.getByProjectId(projectId);
      if (baseline) {
        setState(prev => ({
          ...prev,
          baselines: {
            ...prev.baselines,
            [projectId]: baseline,
          },
        }));
      }
      return baseline;
    } catch (error) {
      console.error('Error loading baseline:', error);
      return null;
    }
  }, [state.baselines]);

  const setBaseline = useCallback((projectId: string, baseline: Baseline) => {
    setState(prev => ({
      ...prev,
      baselines: {
        ...prev.baselines,
        [projectId]: baseline,
      },
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
      loadCompany(),
      loadProjects(),
      loadTeam(),
      loadMachinery(),
      loadDashboardSummary(),
    ]);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [loadCompany, loadProjects, loadTeam, loadMachinery, loadDashboardSummary]);

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

  // ============================================
  // VALOR DEL CONTEXT
  // ============================================

  const value: AppContextValue = {
    ...state,
    loadCompany,
    updateCompany: updateCompanyState,
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
    loadBaseline,
    setBaseline,
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
  const { projects, isLoadingProjects, loadProjects, addProject, updateProject, removeProject } = useApp();
  return { projects, isLoading: isLoadingProjects, loadProjects, addProject, updateProject, removeProject };
}

export function useCompany() {
  const { company, isLoadingCompany, loadCompany, updateCompany } = useApp();
  return { company, isLoading: isLoadingCompany, loadCompany, updateCompany };
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

export function useSelectedProject() {
  const { projects, selectedProjectId, setSelectedProjectId } = useApp();
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  return { selectedProject, selectedProjectId, setSelectedProjectId, projects };
}

