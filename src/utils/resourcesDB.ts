import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type ResourceCategory = 'programmes' | 'videos' | 'annonces' | 'publicites' | 'fiches' | 'calendrier' | 'activites' | 'arts-oraux';

export type ResourceKind = 'file' | 'link';

export interface ResourceItem {
  id: string;
  category: ResourceCategory;
  kind: ResourceKind;
  title: string;
  description?: string;
  // Pour les fichiers
  fileName?: string;
  mimeType?: string;
  size?: number;
  blob?: Blob;
  // Pour les liens (YouTube, sites, etc.)
  url?: string;
  createdAt: number;
}

interface ResourcesDB extends DBSchema {
  resources: {
    key: string;
    value: ResourceItem;
    indexes: { 'by-category': string };
  };
}

let db: IDBPDatabase<ResourcesDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ResourcesDB>> {
  if (db) return db;
  db = await openDB<ResourcesDB>('MasterSoutienResources', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('resources')) {
        const store = database.createObjectStore('resources', { keyPath: 'id' });
        store.createIndex('by-category', 'category');
      }
    },
  });
  return db;
}

export function generateResourceId(): string {
  return `res-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getResourcesByCategory(category: ResourceCategory): Promise<ResourceItem[]> {
  const database = await getDB();
  const items = await database.getAllFromIndex('resources', 'by-category', category);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addResource(item: ResourceItem): Promise<void> {
  const database = await getDB();
  await database.put('resources', item);
}

export async function deleteResource(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('resources', id);
}

export async function getResource(id: string): Promise<ResourceItem | undefined> {
  const database = await getDB();
  return database.get('resources', id);
}

/** Retourne une icône emoji selon le type de fichier. */
export function getFileIcon(mimeType?: string, fileName?: string, kind?: ResourceKind): string {
  if (kind === 'link') return '🔗';
  const type = (mimeType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return '🖼️';
  if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', '3gp'].includes(ext)) return '🎬';
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return '🎵';
  if (type === 'application/pdf' || ext === 'pdf') return '📄';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || type.includes('word')) return '📝';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext) || type.includes('sheet') || type.includes('excel')) return '📊';
  if (['ppt', 'pptx', 'odp'].includes(ext) || type.includes('presentation')) return '📽️';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  if (['txt', 'md'].includes(ext) || type.startsWith('text/')) return '📃';
  return '📎';
}

/** Formate une taille de fichier en Ko/Mo. */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Détecte si une URL est une vidéo YouTube et retourne l'ID. */
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Ouvre / télécharge une ressource fichier. */
export function openResourceFile(item: ResourceItem): void {
  if (!item.blob) return;
  const url = URL.createObjectURL(item.blob);
  const link = document.createElement('a');
  link.href = url;
  // Ouvrir dans un nouvel onglet pour les types visualisables, sinon télécharger
  const viewable = (item.mimeType || '').match(/^(image|video|audio|application\/pdf|text)/);
  if (viewable) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  } else {
    link.download = item.fileName || item.title || 'fichier';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
