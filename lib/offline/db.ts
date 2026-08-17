import Dexie, { type Table } from 'dexie';
import type { CreateReportDTO } from '@/lib/types';

// Imágenes almacenadas como Blob (File no es serializable en IndexedDB)
export interface OfflineImage {
  name: string;
  blob: Blob;
  type: string;
}

export interface OfflinePendingReport {
  id: string;           // UUID local temporal (prefijo "offline-")
  data: Omit<CreateReportDTO, 'images'>;
  images: OfflineImage[];
  status: 'pending' | 'syncing' | 'failed';
  createdAt: number;    // timestamp ms
  attempts: number;
  errorMessage?: string;
}

class OfflineDatabase extends Dexie {
  pendingReports!: Table<OfflinePendingReport, string>;

  constructor() {
    super('ZenitOfflineDB');
    this.version(1).stores({
      pendingReports: 'id, status, createdAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Genera un ID temporal único para reportes offline
export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convierte File[] a OfflineImage[] para almacenar en IndexedDB
export async function filesToOfflineImages(files: File[]): Promise<OfflineImage[]> {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      blob: file,
      type: file.type,
    }))
  );
}

// Convierte OfflineImage[] de vuelta a File[] para subir al API
export function offlineImagesToFiles(images: OfflineImage[]): File[] {
  return images.map(
    (img) => new File([img.blob], img.name, { type: img.type })
  );
}
