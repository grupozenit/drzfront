"use client";

import { useState, useCallback } from 'react';
import type { Baseline, CreateBaselineDTO, UpdateBaselineDTO } from '@/lib/types';
import { baselinesService } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/client';

interface UseBaselineReturn {
  baseline: Baseline | null;
  isLoading: boolean;
  error: string | null;
  loadBaseline: (projectId: string) => Promise<Baseline | null>;
  saveBaseline: (projectId: string, data: CreateBaselineDTO) => Promise<Baseline>;
  updateBaseline: (projectId: string, data: UpdateBaselineDTO) => Promise<Baseline>;
  hasBaseline: boolean;
  getVariableTotal: (variable: string) => number;
}

export function useBaseline(): UseBaselineReturn {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBaseline = useCallback(async (projectId: string): Promise<Baseline | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await baselinesService.getByProjectId(projectId);
      setBaseline(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveBaseline = useCallback(async (projectId: string, data: CreateBaselineDTO): Promise<Baseline> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await baselinesService.upsert(projectId, data);
      setBaseline(result);
      return result;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBaseline = useCallback(async (projectId: string, data: UpdateBaselineDTO): Promise<Baseline> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await baselinesService.update(projectId, data);
      setBaseline(result);
      return result;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVariableTotal = useCallback((variable: string): number => {
    if (!baseline) return 0;
    return baselinesService.getVariableTotal(baseline, variable);
  }, [baseline]);

  return {
    baseline,
    isLoading,
    error,
    loadBaseline,
    saveBaseline,
    updateBaseline,
    hasBaseline: baseline !== null,
    getVariableTotal,
  };
}

