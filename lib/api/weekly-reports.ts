import { apiClient, getAuthToken } from './client';
import type {
  WeeklyReport,
  WeeklyReportListResponse,
  WeeklyReportFilters,
} from '@/lib/types';

const ENDPOINT = '/weekly-reports';

/**
 * Servicio de Reportes Semanales
 */
export const weeklyReportsService = {
  /**
   * Lista reportes semanales de la empresa con filtros opcionales.
   */
  async getAll(
    filters?: WeeklyReportFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<WeeklyReportListResponse> {
    return apiClient.get<WeeklyReportListResponse>(ENDPOINT, {
      ...(filters as Record<string, string | number | undefined>),
      page,
      pageSize,
    } as Record<string, string | number>);
  },

  /**
   * Obtiene metadata de un reporte semanal.
   */
  async getById(id: string): Promise<WeeklyReport> {
    return apiClient.get<WeeklyReport>(`${ENDPOINT}/${id}`);
  },

  /**
   * Genera un reporte semanal manualmente para el proyecto y rango de fechas.
   * startDate y endDate en formato YYYY-MM-DD.
   */
  async generateReport(
    projectId: string,
    startDate: string,
    endDate: string,
    force: boolean = false
  ): Promise<WeeklyReport> {
    const forceParam = force ? '&force=true' : '';
    return apiClient.post<WeeklyReport>(
      `${ENDPOINT}/generate?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}${forceParam}`
    );
  },

  /**
   * Elimina un reporte semanal y su PDF.
   */
  async deleteReport(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Exporta un reporte semanal como Excel (.xlsx).
   * sections: lista de secciones a incluir (ej: ["resumen","curva_s","personal"]).
   * Si no se pasa, incluye todas.
   */
  async exportExcel(id: string, sections?: string[]): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const params = sections && sections.length > 0 ? `?sections=${sections.join(',')}` : '';
      const url = `${apiUrl}${ENDPOINT}/export/${id}${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al exportar Excel: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const disposition = response.headers.get('Content-Disposition') || '';
      let filename = `Reporte_Semanal_${id}.xlsx`;
      const rfcMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (rfcMatch) {
        filename = decodeURIComponent(rfcMatch[1]);
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error al exportar Excel semanal:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Error de conexión al exportar Excel. Verificá que el servidor esté disponible.');
      }
      throw error;
    }
  },

  /**
   * Descarga o visualiza el PDF de un reporte semanal.
   * download=false: abre inline en nueva pestaña.
   * download=true: fuerza descarga con nombre correcto.
   */
  async downloadPDF(id: string, download: boolean = true): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const pdfUrl = `${apiUrl}${ENDPOINT}/${id}/pdf${download ? '?download=true' : ''}`;

      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (download) {
        const disposition = response.headers.get('Content-Disposition') || '';
        let filename = `Reporte_Semanal_${id}.pdf`;
        const rfcMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (rfcMatch) {
          filename = decodeURIComponent(rfcMatch[1]);
        } else {
          const plainMatch = disposition.match(/filename="([^"]+)"/i);
          if (plainMatch) filename = plainMatch[1];
        }

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const newWindow = window.open(blobUrl, '_blank');
        if (newWindow) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
      }
    } catch (error) {
      console.error('Error al descargar PDF semanal:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Error de conexión al descargar PDF. Verificá que el servidor esté disponible.');
      }
      throw error;
    }
  },
};
