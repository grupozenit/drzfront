"use client";

import { useState, useCallback, useEffect } from 'react';
import type { DailyReport, ReportFilters, CreateReportDTO, UpdateReportDTO } from '@/lib/types';
import { reportsService } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/client';

interface UseReportsOptions {
  projectId?: string;
  autoLoad?: boolean;
}

interface UseReportsReturn {
  reports: DailyReport[];
  isLoading: boolean;
  error: string | null;
  loadReports: (filters?: ReportFilters) => Promise<void>;
  createReport: (data: CreateReportDTO) => Promise<DailyReport>;
  updateReport: (id: string, data: UpdateReportDTO) => Promise<DailyReport>;
  deleteReport: (id: string) => Promise<void>;
  saveDraft: (data: CreateReportDTO) => Promise<DailyReport>;
  sendReport: (id: string) => Promise<DailyReport>;
  generatePDF: (id: string, download?: boolean) => Promise<void>;
  sendEmail: (id: string, recipients?: string[]) => Promise<void>;
  shareWhatsApp: (id: string, message?: string) => void;
  getReportById: (id: string) => Promise<DailyReport>;
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const { projectId, autoLoad = false } = options;
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (filters?: ReportFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalFilters: ReportFilters = {
        ...filters,
        projectId: projectId || filters?.projectId,
      };
      const data = await reportsService.getAll(finalFilters);
      setReports(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const createReport = useCallback(async (data: CreateReportDTO): Promise<DailyReport> => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await reportsService.create(data);
      setReports(prev => [report, ...prev]);
      return report;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReport = useCallback(async (id: string, data: UpdateReportDTO): Promise<DailyReport> => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await reportsService.update(id, data);
      setReports(prev => prev.map(r => r.id === id ? report : r));
      return report;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteReport = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await reportsService.delete(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (data: CreateReportDTO): Promise<DailyReport> => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await reportsService.saveDraft(data);
      setReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
      return report;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendReport = useCallback(async (id: string): Promise<DailyReport> => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await reportsService.send(id);
      setReports(prev => prev.map(r => r.id === id ? report : r));
      return report;
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generatePDF = useCallback(async (id: string, download: boolean = true): Promise<void> => {
    setError(null);
    try {
      await reportsService.generatePDF(id, download);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const sendEmail = useCallback(async (id: string, recipients?: string[]): Promise<void> => {
    setError(null);
    try {
      await reportsService.sendEmail({ reportId: id, recipients });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const shareWhatsApp = useCallback((id: string, message?: string): void => {
    reportsService.shareViaWhatsApp(id, message);
  }, []);

  const getReportById = useCallback(async (id: string): Promise<DailyReport> => {
    setError(null);
    try {
      return await reportsService.getById(id);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Auto-cargar si está habilitado
  useEffect(() => {
    if (autoLoad) {
      loadReports();
    }
  }, [autoLoad, loadReports]);

  return {
    reports,
    isLoading,
    error,
    loadReports,
    createReport,
    updateReport,
    deleteReport,
    saveDraft,
    sendReport,
    generatePDF,
    sendEmail,
    shareWhatsApp,
    getReportById,
  };
}

