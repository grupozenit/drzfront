'use client';

import { useCallback, useState } from 'react';
import { projectTotalsService } from '@/lib/api/project-totals';
import type { ProjectTotalManualItem, ProjectTotals, TotalsImportResult } from '@/lib/types';

interface UseProjectTotalsReturn {
  /** El catálogo completo cruzado con lo cargado (ver getFullCatalog). */
  totals: ProjectTotals | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadTotals: (projectId: string) => Promise<void>;
  importTemplate: (projectId: string, file: File) => Promise<TotalsImportResult>;
  saveItems: (projectId: string, items: ProjectTotalManualItem[]) => Promise<void>;
  downloadTemplate: () => Promise<void>;
}

export function useProjectTotals(): UseProjectTotalsReturn {
  const [totals, setTotals] = useState<ProjectTotals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTotals = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setTotals(await projectTotalsService.getFullCatalog(projectId));
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar los totales');
      setTotals(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importTemplate = useCallback(async (projectId: string, file: File) => {
    setIsSaving(true);
    try {
      const result = await projectTotalsService.importTemplate(projectId, file);
      setTotals(await projectTotalsService.getFullCatalog(projectId));
      return result;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const saveItems = useCallback(async (projectId: string, items: ProjectTotalManualItem[]) => {
    setIsSaving(true);
    try {
      setTotals(await projectTotalsService.saveItems(projectId, items));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    await projectTotalsService.downloadTemplate();
  }, []);

  return {
    totals, isLoading, isSaving, error,
    loadTotals, importTemplate, saveItems, downloadTemplate,
  };
}
