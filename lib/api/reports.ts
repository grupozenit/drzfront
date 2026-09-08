import { apiClient, getAuthToken } from './client';
import type {
  DailyReport,
  CreateReportDTO,
  UpdateReportDTO,
  ReportFilters,
  PaginatedResponse,
  SendEmailDTO,
} from '@/lib/types';

const ENDPOINT = '/reports';

/**
 * Servicio de Reportes Diarios
 */
export const reportsService = {
  /**
   * Obtiene la lista de reportes con filtros opcionales
   */
  async getAll(filters?: ReportFilters): Promise<DailyReport[]> {
    return apiClient.get<DailyReport[]>(ENDPOINT, filters as Record<string, string>);
  },

  /**
   * Obtiene reportes con paginación y filtros
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: ReportFilters
  ): Promise<PaginatedResponse<DailyReport>> {
    return apiClient.get<PaginatedResponse<DailyReport>>(ENDPOINT, {
      page,
      pageSize,
      ...filters,
    } as Record<string, string | number>);
  },

  /**
   * Obtiene un reporte por ID
   */
  async getById(id: string): Promise<DailyReport> {
    return apiClient.get<DailyReport>(`${ENDPOINT}/${id}`);
  },

  /**
   * Crea un nuevo reporte
   */
  async create(data: CreateReportDTO): Promise<DailyReport> {
    // SIEMPRE multipart, con o sin imágenes: el endpoint recibe el reporte en
    // un campo de formulario `data`, así que un body JSON no lo completa y el
    // backend responde "Se requiere campo 'data'". Las fotos son opcionales.
    const { images, ...reportData } = data;
    const formData = new FormData();
    formData.append('data', JSON.stringify(reportData));

    (images ?? []).forEach((image) => {
      formData.append('images', image);
    });

    return apiClient.post<DailyReport>(ENDPOINT, formData);
  },

  /**
   * Actualiza un reporte existente
   */
  async update(id: string, data: UpdateReportDTO): Promise<DailyReport> {
    // Igual que en el alta: siempre multipart, las fotos son opcionales
    const { images, ...reportData } = data;
    const formData = new FormData();
    formData.append('data', JSON.stringify(reportData));

    (images ?? []).forEach((image) => {
      formData.append('images', image);
    });

    return apiClient.put<DailyReport>(`${ENDPOINT}/${id}`, formData);
  },

  /**
   * Elimina un reporte
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },

  /**
   * Guarda un reporte como borrador
   */
  async saveDraft(data: CreateReportDTO): Promise<DailyReport> {
    return this.create({ ...data, status: 'borrador' });
  },

  /**
   * Actualiza un borrador
   */
  async updateDraft(id: string, data: UpdateReportDTO): Promise<DailyReport> {
    return this.update(id, { ...data, status: 'borrador' });
  },

  /**
   * Envía un reporte (cambia el estado a enviado)
   */
  async send(id: string): Promise<DailyReport> {
    return apiClient.post<DailyReport>(`${ENDPOINT}/${id}/send`);
  },

  /**
   * Obtiene todos los borradores
   */
  async getDrafts(): Promise<DailyReport[]> {
    return this.getAll({ status: 'borrador' });
  },

  /**
   * Genera el PDF de un reporte.
   * - download=false (defecto): abre inline en nueva pestaña del navegador
   * - download=true: fuerza descarga con nombre correcto (funciona en Windows)
   */
  async generatePDF(id: string, download: boolean = false): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const token = await getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const pdfUrl = `${apiUrl}/reports/${id}/pdf${download ? '?download=true' : ''}`;

      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al generar PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (download) {
        // Extraer nombre del header Content-Disposition o usar fallback
        const disposition = response.headers.get('Content-Disposition') || '';
        let filename = `Reporte_${id}.pdf`;
        // Intentar filename* (RFC 5987, UTF-8)
        const rfcMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (rfcMatch) {
          filename = decodeURIComponent(rfcMatch[1]);
        } else {
          // Fallback a filename="..."
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
        // Abrir en nueva pestaña para visualización / exportar a Drive
        const newWindow = window.open(blobUrl, '_blank');
        if (newWindow) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  },

  /**
   * Envía el reporte por correo electrónico
   */
  async sendEmail(data: SendEmailDTO): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `${ENDPOINT}/${data.reportId}/email`,
      { recipients: data.recipients }
    );
  },

  /**
   * Genera el link para compartir por WhatsApp
   */
  generateWhatsAppLink(reportId: string, message?: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const reportUrl = `${baseUrl}/reportes/${reportId}`;
    const defaultMessage = message || `Mira este reporte de obra: ${reportUrl}`;
    const encodedMessage = encodeURIComponent(defaultMessage);
    return `https://wa.me/?text=${encodedMessage}`;
  },

  /**
   * Abre WhatsApp para compartir el reporte
   */
  shareViaWhatsApp(reportId: string, message?: string): void {
    const link = this.generateWhatsAppLink(reportId, message);
    if (typeof window !== 'undefined') {
      window.open(link, '_blank');
    }
  },

  /**
   * Obtiene el último reporte de un proyecto
   */
  async getLatestByProject(projectId: string): Promise<DailyReport | null> {
    try {
      return await apiClient.get<DailyReport>(ENDPOINT + '/latest', { projectId });
    } catch (error: any) {
      if (error?.code === '404') return null;
      throw error;
    }
  },

  /**
   * Obtiene reportes de un proyecto en un rango de fechas
   */
  async getByProjectAndDateRange(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReport[]> {
    return this.getAll({ projectId, startDate, endDate });
  },

  /**
   * Sube imágenes a un reporte existente
   */
  async uploadImages(reportId: string, images: File[]): Promise<DailyReport> {
    return apiClient.uploadFile<DailyReport>(
      `${ENDPOINT}/${reportId}/images`,
      images,
      'images'
    );
  },

  /**
   * Elimina una imagen de un reporte
   */
  async deleteImage(reportId: string, imageUrl: string): Promise<DailyReport> {
    return apiClient.delete<DailyReport>(
      `${ENDPOINT}/${reportId}/images/${encodeURIComponent(imageUrl)}`
    );
  },
};

