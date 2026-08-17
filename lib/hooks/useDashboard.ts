"use client";

import { useState, useCallback, useEffect } from 'react';
import type {
  DashboardSummary,
  ProjectProgress,
  ProjectPersonnelHistory,
  ProjectSuspendedHours,
  ProjectMachinery,
  ProjectMachineryHistory,
  ProjectWorkProgress,
  ProjectActivityBreakdown,
  ProjectSCurve,
} from '@/lib/types';
import { dashboardService } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/client';

interface UseDashboardOptions {
  projectId?: string | null;
  autoLoad?: boolean;
  // Datos iniciales del servidor (SSR)
  initialData?: {
    summary?: DashboardSummary | null;
    projectsProgress?: ProjectProgress[];
    personnelHistory?: ProjectPersonnelHistory[];
    suspendedHours?: ProjectSuspendedHours[];
    machinery?: ProjectMachinery[];
  };
}

interface UseDashboardReturn {
  // Datos
  summary: DashboardSummary | null;
  projectProgress: ProjectProgress | null;
  allProjectsProgress: ProjectProgress[];
  personnelHistory: ProjectPersonnelHistory | null;
  allPersonnelHistory: ProjectPersonnelHistory[];
  suspendedHours: ProjectSuspendedHours | null;
  allSuspendedHours: ProjectSuspendedHours[];
  projectMachinery: ProjectMachinery | null;
  allProjectsMachinery: ProjectMachinery[];
  workProgress: ProjectWorkProgress | null;
  allWorkProgress: ProjectWorkProgress[];
  allMachineryHistory: ProjectMachineryHistory[];
  activityBreakdowns: Record<string, ProjectActivityBreakdown>;
  sCurves: Record<string, ProjectSCurve>;

  // Estado
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  loadSummary: () => Promise<void>;
  loadProjectProgress: (projectId: string) => Promise<void>;
  loadAllProjectsProgress: () => Promise<void>;
  loadPersonnelHistory: (projectId: string, startDate?: string, endDate?: string) => Promise<void>;
  loadAllPersonnelHistory: (startDate?: string, endDate?: string) => Promise<void>;
  loadSuspendedHours: (projectId: string, startDate?: string, endDate?: string) => Promise<void>;
  loadAllSuspendedHours: (startDate?: string, endDate?: string) => Promise<void>;
  loadProjectMachinery: (projectId: string) => Promise<void>;
  loadAllProjectsMachinery: () => Promise<void>;
  loadAllMachineryHistory: (startDate?: string, endDate?: string) => Promise<void>;
  loadWorkProgress: (projectId: string, startDate?: string, endDate?: string, activity?: string) => Promise<void>;
  loadAllWorkProgress: (startDate?: string, endDate?: string, activity?: string) => Promise<void>;
  loadFullDashboard: (projectId?: string) => Promise<void>;
  loadActivityBreakdown: (projectId: string) => Promise<void>;
  loadSCurve: (projectId: string) => Promise<void>;
}

export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { projectId, autoLoad = false, initialData } = options;

  // Estados de datos - usar datos iniciales si están disponibles
  const [summary, setSummary] = useState<DashboardSummary | null>(initialData?.summary ?? null);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress | null>(null);
  const [allProjectsProgress, setAllProjectsProgress] = useState<ProjectProgress[]>(initialData?.projectsProgress ?? []);
  const [personnelHistory, setPersonnelHistory] = useState<ProjectPersonnelHistory | null>(null);
  const [allPersonnelHistory, setAllPersonnelHistory] = useState<ProjectPersonnelHistory[]>(initialData?.personnelHistory ?? []);
  const [suspendedHours, setSuspendedHours] = useState<ProjectSuspendedHours | null>(null);
  const [allSuspendedHours, setAllSuspendedHours] = useState<ProjectSuspendedHours[]>(initialData?.suspendedHours ?? []);
  const [projectMachinery, setProjectMachinery] = useState<ProjectMachinery | null>(null);
  const [allProjectsMachinery, setAllProjectsMachinery] = useState<ProjectMachinery[]>(initialData?.machinery ?? []);
  const [workProgress, setWorkProgress] = useState<ProjectWorkProgress | null>(null);
  const [allWorkProgress, setAllWorkProgress] = useState<ProjectWorkProgress[]>([]);
  const [allMachineryHistory, setAllMachineryHistory] = useState<ProjectMachineryHistory[]>([]);
  const [activityBreakdowns, setActivityBreakdowns] = useState<Record<string, ProjectActivityBreakdown>>({});
  const [sCurves, setSCurves] = useState<Record<string, ProjectSCurve>>({});

  // Estados de control
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CARGADORES
  // ============================================

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProjectProgress = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getProjectProgress(projectId);
      setProjectProgress(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllProjectsProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllProjectsProgress();
      setAllProjectsProgress(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPersonnelHistory = useCallback(async (projectId: string, startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getPersonnelHistory(projectId, startDate, endDate);
      setPersonnelHistory(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllPersonnelHistory = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllPersonnelHistory(startDate, endDate);
      setAllPersonnelHistory(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSuspendedHours = useCallback(async (projectId: string, startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getSuspendedHours(projectId, startDate, endDate);
      setSuspendedHours(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllSuspendedHours = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllSuspendedHours(startDate, endDate);
      setAllSuspendedHours(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProjectMachinery = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getProjectMachinery(projectId);
      setProjectMachinery(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllProjectsMachinery = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllProjectsMachinery();
      setAllProjectsMachinery(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllMachineryHistory = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllMachineryHistory(startDate, endDate);
      setAllMachineryHistory(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWorkProgress = useCallback(async (projectId: string, startDate?: string, endDate?: string, activity?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getWorkProgress(projectId, startDate, endDate, activity);
      setWorkProgress(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllWorkProgress = useCallback(async (startDate?: string, endDate?: string, activity?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAllWorkProgress(startDate, endDate, activity);
      setAllWorkProgress(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActivityBreakdown = useCallback(async (projectId: string) => {
    try {
      const data = await dashboardService.getProjectActivityBreakdown(projectId);
      setActivityBreakdowns(prev => ({ ...prev, [projectId]: data }));
    } catch (err) {
      // Non-critical — silently ignore
    }
  }, []);

  const loadSCurve = useCallback(async (projectId: string) => {
    try {
      const data = await dashboardService.getProjectSCurve(projectId);
      setSCurves(prev => ({ ...prev, [projectId]: data }));
    } catch (err) {
      // Non-critical — silently ignore
    }
  }, []);

  // Cargar todo el dashboard
  const loadFullDashboard = useCallback(async (selectedProjectId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedProjectId) {
        const data = await dashboardService.getProjectDashboard(selectedProjectId);
        setProjectProgress(data.progress);
        setPersonnelHistory(data.personnel);
        setSuspendedHours(data.suspendedHours);
        setProjectMachinery(data.machinery);
      } else {
        const data = await dashboardService.getFullDashboard();
        setSummary(data.summary);
        setAllProjectsProgress(data.projects);
        setAllPersonnelHistory(data.personnel);
        setAllSuspendedHours(data.suspendedHours);
        setAllProjectsMachinery(data.machinery);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-cargar si está habilitado y no hay datos iniciales
  useEffect(() => {
    if (autoLoad && !initialData) {
      if (projectId) {
        loadFullDashboard(projectId);
      } else {
        loadFullDashboard();
      }
    }
  }, [autoLoad, projectId, initialData, loadFullDashboard]);

  return {
    summary,
    projectProgress,
    allProjectsProgress,
    personnelHistory,
    allPersonnelHistory,
    suspendedHours,
    allSuspendedHours,
    projectMachinery,
    allProjectsMachinery,
    workProgress,
    allWorkProgress,
    allMachineryHistory,
    activityBreakdowns,
    sCurves,
    isLoading,
    error,
    loadSummary,
    loadProjectProgress,
    loadAllProjectsProgress,
    loadPersonnelHistory,
    loadAllPersonnelHistory,
    loadSuspendedHours,
    loadAllSuspendedHours,
    loadProjectMachinery,
    loadAllProjectsMachinery,
    loadAllMachineryHistory,
    loadWorkProgress,
    loadAllWorkProgress,
    loadFullDashboard,
    loadActivityBreakdown,
    loadSCurve,
  };
}

