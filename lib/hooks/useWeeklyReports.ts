"use client";

import { useState, useCallback, useEffect } from 'react';
import type { WeeklyReport, WeeklyReportFilters, WeeklyReportListResponse } from '@/lib/types';
import { weeklyReportsService } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/client';

interface UseWeeklyReportsOptions {
  projectId?: string;
  autoLoad?: boolean;
}

interface UseWeeklyReportsReturn {
  reports: WeeklyReport[];
  total: number;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  loadReports: (filters?: WeeklyReportFilters) => Promise<void>;
  generateReport: (projectId: string, startDate: string, endDate: string, force?: boolean) => Promise<WeeklyReport>;
  downloadPDF: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export function useWeeklyReports(options: UseWeeklyReportsOptions = {}): UseWeeklyReportsReturn {
  const { projectId, autoLoad = false } = options;

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (filters?: WeeklyReportFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalFilters: WeeklyReportFilters = {
        ...filters,
        ...(projectId ? { projectId } : {}),
      };
      const data: WeeklyReportListResponse = await weeklyReportsService.getAll(finalFilters);
      setReports(data.reports);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const generateReport = useCallback(async (
    pId: string,
    startDate: string,
    endDate: string,
    force: boolean = false
  ): Promise<WeeklyReport> => {
    setIsGenerating(true);
    setError(null);
    try {
      const report = await weeklyReportsService.generateReport(pId, startDate, endDate, force);
      setReports(prev => {
        const exists = prev.find(r => r.id === report.id);
        if (force && exists) return prev.map(r => r.id === report.id ? report : r);
        if (exists) return prev;
        return [report, ...prev];
      });
      if (!force) setTotal(prev => prev + 1);
      return report;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const downloadPDF = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await weeklyReportsService.downloadPDF(id, true);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const deleteReport = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await weeklyReportsService.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadReports();
    }
  }, [autoLoad, loadReports]);

  return {
    reports,
    total,
    isLoading,
    isGenerating,
    error,
    loadReports,
    generateReport,
    downloadPDF,
    deleteReport,
  };
}
