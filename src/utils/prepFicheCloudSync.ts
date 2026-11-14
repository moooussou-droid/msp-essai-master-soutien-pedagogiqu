import { getAllPrepFiches, markPrepFichesDistributed, replaceCloudPublishedPrepFiches, PREP_FICHE_PUBLISHER_ID, type PrepFiche, type PrepFichePage } from './prepFiches';
import { isCloudConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './cloudConfig';

const STORAGE_BUCKET = 'msp-prep-fiches';
const CATALOG_TABLE = 'msp_prep_fiches_catalog';
const CATALOG_CACHE_KEY = 'msp_prep_fiches_cloud_version_v1';
const MAX_PAGE_BYTES = 45_000_000;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const MAX_PAGES = 10_000;
const MAX_FICHES = 5_000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']);

interface CloudPageDescriptor {
  path: string;
  w: number;
  h: number;
  mimeType: string;
  size: number;
}

interface CloudFicheDescriptor {
  id: string;
  classe: string;
  matiere: string;
  titre: string;
  description?: string;
  pages: CloudPageDescriptor[];
  pageCount: number;
  published: true;
  createdAt: number;
  updatedAt?: number;
}

interface CloudManifest {
  format: 'msp-prep-fiches-cloud';
  schemaVersion: 1;
  publisherId: string;
  snapshotId: string;
  publishedAt: string;
  totalPages: number;
  totalBytes: number;
  fiches: CloudFicheDescriptor[];
}

interface CloudCatalogRow {
  version: string;
  manifest: CloudManifest;
  updated_at?: string;
}

export interface PrepFicheCloudSyncResult {
  updated: boolean;
  fiches: number;
  pages: number;
  version: string | null;
}

export interface PrepFicheCloudPublishResult {
  version: string;
  fiches: number;
  pages: number;
  totalBytes: number;
  cancelled?: boolean;
}

interface UploadPageTask {
  fiche: PrepFiche;
  page: PrepFichePage;
  path: string;
  mimeType: string;
  size: number;
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

function safeId(id: string): string {
  const normalized = id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180);
  if (!normalized) throw new Error('Une fiche ne possède pas d’identifiant transférable.');
  return normalized;
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/bmp': 'bmp', 'image/avif': 'avif',
  };
  return extensions[mimeType] || '';
}

function estimatedDataUrlBytes(dataUrl: string): { mimeType: string; base64: string; size: number } {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(dataUrl);
  if (!match || !match[2]) throw new Error('Une page de fiche est illisible; réimportez cette page en JPG ou PNG.');
  const mimeType = normalizeMimeType(match[1]);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Le format ${match[1]} ne peut pas être publié dans le catalogue cloud. Convertissez la page en JPG, PNG ou WebP.`);
  }
  const encoded = match[2];
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const size = Math.max(0, Math.floor(encoded.length * 3 / 4) - padding);
  if (size < 1 || size > MAX_PAGE_BYTES) {
    throw new Error('Chaque page doit peser moins de 45 Mo pour être synchronisée. Réduisez les images trop volumineuses.');
  }
  return { mimeType, base64: encoded, size };
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const encoded = estimatedDataUrlBytes(dataUrl).base64;
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function validateCloudManifest(value: unknown): CloudManifest {
  const manifest = value as Partial<CloudManifest> | null;
  if (!manifest || manifest.format !== 'msp-prep-fiches-cloud' || manifest.schemaVersion !== 1
    || manifest.publisherId !== PREP_FICHE_PUBLISHER_ID
    || typeof manifest.snapshotId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(manifest.snapshotId)
    || typeof manifest.publishedAt !== 'string' || !Number.isFinite(Date.parse(manifest.publishedAt))
    || !Array.isArray(manifest.fiches) || manifest.fiches.length > MAX_FICHES) {
    throw new Error('Le catalogue public des fiches n’est pas valide.');
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  let pageCount = 0;
  let totalBytes = 0;
  for (const fiche of manifest.fiches) {
    if (!fiche || typeof fiche.id !== 'string' || !/^[A-Za-z0-9_-]{1,180}$/.test(fiche.id)
      || ids.has(fiche.id) || typeof fiche.classe !== 'string' || !fiche.classe.trim() || fiche.classe.length > 120
      || typeof fiche.matiere !== 'string' || !fiche.matiere.trim() || fiche.matiere.length > 160
      || typeof fiche.titre !== 'string' || !fiche.titre.trim() || fiche.titre.length > 300
      || (fiche.description !== undefined && (typeof fiche.description !== 'string' || fiche.description.length > 4000))
      || fiche.published !== true || !Number.isFinite(fiche.createdAt) || fiche.createdAt < 0
      || (fiche.updatedAt !== undefined && (!Number.isFinite(fiche.updatedAt) || fiche.updatedAt < 0))
      || !Array.isArray(fiche.pages) || fiche.pages.length < 1 || fiche.pages.length > MAX_PAGES
      || fiche.pageCount !== fiche.pages.length) {
      throw new Error('Une fiche du catalogue public est incomplète ou invalide.');
    }
    ids.add(fiche.id);
    const expectedFicheId = safeId(fiche.id);
    for (const page of fiche.pages) {
      const pathParts = typeof page?.path === 'string' ? page.path.split('/') : [];
      if (!page || pathParts.length !== 3 || pathParts[0] !== manifest.snapshotId || pathParts[1] !== expectedFicheId
        || !/^page-\d{4,6}\.(?:jpg|png|webp|gif|bmp|avif)$/i.test(pathParts[2] || '')
        || paths.has(page.path) || !ALLOWED_MIME_TYPES.has(page.mimeType)
        || !Number.isSafeInteger(page.size) || page.size < 1 || page.size > MAX_PAGE_BYTES
        || !Number.isFinite(page.w) || page.w <= 0 || page.w > 50_000
        || !Number.isFinite(page.h) || page.h <= 0 || page.h > 50_000
        || extensionForMime(page.mimeType) !== page.path.split('.').pop()?.toLowerCase()) {
        throw new Error('Une page du catalogue public est invalide.');
      }
      paths.add(page.path);
      pageCount++;
      totalBytes += page.size;
      if (pageCount > MAX_PAGES || totalBytes > MAX_TOTAL_BYTES) {
        throw new Error('Le catalogue public dépasse les limites de pages ou de taille autorisées.');
      }
    }
  }
  if (manifest.totalPages !== pageCount || manifest.totalBytes !== totalBytes) {
    throw new Error('Les totaux du catalogue public ne correspondent pas à ses pages.');
  }
  return manifest as CloudManifest;
}

async function readPublicCatalog(): Promise<CloudCatalogRow | null> {
  if (!isCloudConfigured()) return null;
  const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
  const query = new URLSearchParams({ select: 'version,manifest,updated_at', catalog_id: 'eq.current', limit: '1' });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/rest/v1/${CATALOG_TABLE}?${query.toString()}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch {
    throw new Error('Le catalogue cloud des fiches est inaccessible. Vérifiez votre connexion Internet.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(response.status === 404
      ? 'Le catalogue cloud n’est pas encore configuré; exécutez la migration Supabase des fiches.'
      : 'Impossible de lire le catalogue cloud des fiches. Vérifiez la migration Supabase et les règles de lecture publique.');
  }
  let rows: unknown;
  try { rows = await response.json(); }
  catch { throw new Error('Le catalogue cloud des fiches a renvoyé une réponse illisible.'); }
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0] as Partial<CloudCatalogRow> | null;
  const manifest = validateCloudManifest(row?.manifest);
  if (typeof row?.version !== 'string' || row.version !== manifest.snapshotId) {
    throw new Error('La version du catalogue cloud ne correspond pas à son manifeste.');
  }
  return { version: row.version, manifest, updated_at: row.updated_at };
}

function publicObjectUrl(path: string): string {
  const encodedPath = path.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/${encodedPath}`;
}

async function fetchPageAsDataUrl(page: CloudPageDescriptor): Promise<string> {
  let response: Response;
  try {
    response = await fetch(publicObjectUrl(page.path), { cache: 'force-cache', credentials: 'omit' });
  } catch {
    throw new Error('Une page du catalogue cloud est inaccessible. Vérifiez votre connexion puis réessayez.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Impossible de télécharger une page cloud (${response.status}).`);
  }
  const blob = await response.blob();
  if (blob.size !== page.size || blob.size > MAX_PAGE_BYTES) {
    throw new Error('Une page téléchargée ne correspond pas à la taille annoncée; aucune fiche locale n’a été remplacée.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Impossible de mettre en cache une page cloud sur cet appareil.'));
    reader.onerror = () => reject(reader.error || new Error('Impossible de mettre en cache une page cloud.'));
    reader.readAsDataURL(new Blob([blob], { type: page.mimeType }));
  });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let hasError = false;
  let firstError: unknown;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!hasError) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        hasError = true;
        firstError = error;
        return;
      }
    }
  });
  await Promise.all(workers);
  if (hasError) throw firstError;
  return results;
}

function localCatalogVersion(): string {
  try { return localStorage.getItem(CATALOG_CACHE_KEY) || ''; }
  catch { return ''; }
}

function setLocalCatalogVersion(version: string): void {
  try { localStorage.setItem(CATALOG_CACHE_KEY, version); }
  catch { /* le catalogue reste en cache dans IndexedDB même si localStorage est plein */ }
}

export function invalidatePrepFicheCloudCache(): void {
  try { localStorage.removeItem(CATALOG_CACHE_KEY); }
  catch { /* le prochain contrôle compare aussi les identifiants en IndexedDB */ }
}

function localCacheMatches(fiches: PrepFiche[], manifest: CloudManifest): boolean {
  const local = fiches.filter((fiche) => fiche.distribution?.publisherId === PREP_FICHE_PUBLISHER_ID);
  const expectedIds = manifest.fiches.map((fiche) => fiche.id).sort();
  const localIds = local.map((fiche) => fiche.id).sort();
  if (expectedIds.length !== localIds.length || expectedIds.some((id, index) => id !== localIds[index])) return false;
  const localById = new Map(local.map((fiche) => [fiche.id, fiche]));
  return manifest.fiches.every((fiche) => {
    const cached = localById.get(fiche.id);
    return Boolean(cached?.published && cached.pages.length === fiche.pageCount
      && cached.pages.every((page) => typeof page.dataUrl === 'string' && page.dataUrl.startsWith('data:image/')));
  });
}

/** Télécharge uniquement la nouvelle version, puis remplace atomiquement le paquet officiel en IndexedDB. */
async function performPublishedPrepFichesCloudSync(): Promise<PrepFicheCloudSyncResult> {
  const row = await readPublicCatalog();
  if (!row) return { updated: false, fiches: 0, pages: 0, version: null };

  const existing = await getAllPrepFiches();
  if (localCatalogVersion() === row.version && localCacheMatches(existing, row.manifest)) {
    return { updated: false, fiches: row.manifest.fiches.length, pages: row.manifest.totalPages, version: row.version };
  }

  const fetchedFiches = await mapWithConcurrency(row.manifest.fiches, 1, async (descriptor) => {
    const pages = await mapWithConcurrency(descriptor.pages, 2, async (page) => ({
      dataUrl: await fetchPageAsDataUrl(page),
      w: page.w,
      h: page.h,
    }));
    return {
      id: descriptor.id,
      classe: descriptor.classe,
      matiere: descriptor.matiere,
      titre: descriptor.titre,
      description: descriptor.description,
      pages,
      pageCount: pages.length,
      published: true,
      createdAt: descriptor.createdAt,
      updatedAt: descriptor.updatedAt,
    } satisfies PrepFiche;
  });

  await replaceCloudPublishedPrepFiches(fetchedFiches);
  setLocalCatalogVersion(row.version);
  return { updated: true, fiches: fetchedFiches.length, pages: row.manifest.totalPages, version: row.version };
}

let cloudCatalogSyncPromise: Promise<PrepFicheCloudSyncResult> | null = null;

export async function syncPublishedPrepFichesFromCloud(): Promise<PrepFicheCloudSyncResult> {
  if (cloudCatalogSyncPromise) return cloudCatalogSyncPromise;
  const current = performPublishedPrepFichesCloudSync();
  cloudCatalogSyncPromise = current;
  try {
    return await current;
  } finally {
    if (cloudCatalogSyncPromise === current) cloudCatalogSyncPromise = null;
  }
}

async function callPublisherApi<T>(body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/ai/prep-fiches', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Publication cloud inaccessible. Utilisez le déploiement Vercel avec les fonctions serveur, pas le ZIP statique.');
  }
  let result: any = {};
  try { result = await response.json(); }
  catch { /* réponse non JSON */ }
  if (!response.ok) {
    const message = response.status === 404 || response.status === 405
      ? 'La publication exige le déploiement Vercel avec la fonction API; un ZIP statique ne peut pas publier.'
      : result?.message || `La publication cloud a répondu ${response.status}.`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).code = result?.error || 'PREP_FICHE_SYNC_ERROR';
    throw error;
  }
  return result as T;
}

const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024;
const RESUMABLE_CHUNK_BYTES = 6 * 1024 * 1024;

function resumableStorageEndpoint(): string {
  const projectUrl = new URL(SUPABASE_URL);
  if (projectUrl.hostname.endsWith('.supabase.co')) {
    const projectRef = projectUrl.hostname.slice(0, -'.supabase.co'.length);
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/upload/resumable`;
}

function base64Metadata(value: string): string {
  return btoa(value);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function resumableUpload(uploadToken: string, path: string, mimeType: string, blob: Blob): Promise<void> {
  const endpoint = resumableStorageEndpoint();
  const metadata = [
    `bucketName ${base64Metadata(STORAGE_BUCKET)}`,
    `objectName ${base64Metadata(path)}`,
    `contentType ${base64Metadata(mimeType)}`,
    `cacheControl ${base64Metadata('3600')}`,
  ].join(',');
  let createResponse: Response;
  try {
    createResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(blob.size),
        'Upload-Metadata': metadata,
        'x-signature': uploadToken,
      },
    });
  } catch {
    throw new Error('Impossible d’ouvrir l’envoi reprenable vers Supabase. Vérifiez la connexion puis réessayez.');
  }
  if (!createResponse.ok) {
    await createResponse.body?.cancel().catch(() => {});
    throw new Error(`Supabase a refusé l’envoi reprenable (${createResponse.status}).`);
  }
  const location = createResponse.headers.get('Location') || createResponse.headers.get('location');
  if (!location) throw new Error('Supabase n’a pas renvoyé l’adresse de reprise de l’envoi.');
  const uploadUrl = new URL(location, endpoint).toString();
  let offset = 0;
  let attempts = 0;

  while (offset < blob.size) {
    const end = Math.min(offset + RESUMABLE_CHUNK_BYTES, blob.size);
    let response: Response | null = null;
    try {
      response = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
          'x-signature': uploadToken,
        },
        body: blob.slice(offset, end),
      });
    } catch { /* re-check server offset below */ }

    if (response?.ok) {
      const newOffset = Number(response.headers.get('Upload-Offset') || end);
      await response.body?.cancel().catch(() => {});
      if (!Number.isSafeInteger(newOffset) || newOffset <= offset || newOffset > blob.size) {
        throw new Error('La reprise de l’envoi a renvoyé un décalage invalide.');
      }
      offset = newOffset;
      attempts = 0;
      continue;
    }

    if (response && response.status !== 409 && response.status !== 429 && response.status < 500) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Supabase a refusé un bloc d’envoi reprenable (${response.status}).`);
    }
    await response?.body?.cancel().catch(() => {});
    let remoteOffset: number | null = null;
    try {
      const head = await fetch(uploadUrl, {
        method: 'HEAD',
        headers: { 'Tus-Resumable': '1.0.0', 'x-signature': uploadToken },
      });
      if (head.ok) {
        const value = Number(head.headers.get('Upload-Offset'));
        if (Number.isSafeInteger(value) && value >= 0 && value <= blob.size) remoteOffset = value;
      }
      await head.body?.cancel().catch(() => {});
    } catch { /* retenter le même segment après une courte pause */ }

    if (remoteOffset !== null && remoteOffset > offset) {
      offset = remoteOffset;
      attempts = 0;
      continue;
    }
    attempts++;
    if (attempts > 5) {
      throw new Error('L’envoi reprenable a été interrompu après plusieurs tentatives; relancez la synchronisation.');
    }
    await delay(Math.min(1000 * (2 ** (attempts - 1)), 8000));
  }
}

async function uploadPage(signed: { uploadUrl: string; token: string }, task: UploadPageTask, blob: Blob): Promise<void> {
  if (blob.size > RESUMABLE_UPLOAD_THRESHOLD) {
    await resumableUpload(signed.token, task.path, task.mimeType, blob);
    return;
  }
  let response: Response;
  try {
    response = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': task.mimeType },
      body: blob,
    });
  } catch {
    throw new Error('Envoi d’une page vers Supabase interrompu. Vérifiez la connexion et relancez la publication.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Supabase a refusé une page (${response.status}). Vérifiez la limite du bucket et réessayez.`);
  }
  await response.body?.cancel().catch(() => {});
}

function createSnapshotId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function buildUploadTasks(fiches: PrepFiche[], snapshotId: string): { tasks: UploadPageTask[]; descriptors: CloudFicheDescriptor[]; totalBytes: number; totalPages: number } {
  if (fiches.length > MAX_FICHES) throw new Error('Le catalogue dépasse la limite de 5 000 fiches.');
  const tasks: UploadPageTask[] = [];
  const descriptors: CloudFicheDescriptor[] = [];
  let totalBytes = 0;

  for (const fiche of fiches) {
    if (!Array.isArray(fiche.pages) || fiche.pages.length < 1 || fiche.pages.length > MAX_PAGES) {
      throw new Error(`La fiche « ${fiche.titre || 'sans titre'} » ne contient pas de pages transférables.`);
    }
    const safeFicheId = safeId(fiche.id);
    const pages: CloudPageDescriptor[] = [];
    fiche.pages.forEach((page, index) => {
      if (typeof page?.dataUrl !== 'string') throw new Error(`Une page de « ${fiche.titre} » est manquante.`);
      const info = estimatedDataUrlBytes(page.dataUrl);
      totalBytes += info.size;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error('Le catalogue dépasse la limite de 500 MiB. Publiez moins de fiches ou réduisez la taille de certaines pages.');
      const extension = extensionForMime(info.mimeType);
      const path = `${snapshotId}/${safeFicheId}/page-${String(index + 1).padStart(4, '0')}.${extension}`;
      pages.push({ path, w: page.w, h: page.h, mimeType: info.mimeType, size: info.size });
      tasks.push({ fiche, page, path, mimeType: info.mimeType, size: info.size });
    });
    descriptors.push({
      id: fiche.id,
      classe: fiche.classe,
      matiere: fiche.matiere,
      titre: fiche.titre,
      description: fiche.description,
      pages,
      pageCount: pages.length,
      published: true,
      createdAt: fiche.createdAt,
      updatedAt: fiche.updatedAt,
    });
  }
  if (tasks.length > MAX_PAGES) throw new Error('Le catalogue dépasse la limite de 10 000 pages.');
  return { tasks, descriptors, totalBytes, totalPages: tasks.length };
}

/** Publie uniquement les fiches locales marquées published; brouillons et autres données ne sont jamais envoyés. */
export async function publishPublishedPrepFichesToCloud(
  onProgress?: (message: string) => void,
  confirmCloudRemoval?: (removedFicheCount: number, cloudFicheCount: number) => boolean,
): Promise<PrepFicheCloudPublishResult> {
  if (!isCloudConfigured()) throw new Error('Le catalogue Supabase des fiches n’est pas configuré dans cette version de l’application.');
  const currentCatalog = await readPublicCatalog(); // pré-vérifie la migration et la lecture publique avant tout envoi de pages.
  const published = (await getAllPrepFiches()).filter((fiche) => fiche.published);
  const localIds = new Set(published.map((fiche) => fiche.id));
  const cloudFicheCount = currentCatalog?.manifest.fiches.length || 0;
  const removedFicheCount = currentCatalog?.manifest.fiches.filter((fiche) => !localIds.has(fiche.id)).length || 0;
  if (removedFicheCount > 0 && !confirmCloudRemoval?.(removedFicheCount, cloudFicheCount)) {
    return {
      version: currentCatalog!.version,
      fiches: cloudFicheCount,
      pages: currentCatalog!.manifest.totalPages,
      totalBytes: currentCatalog!.manifest.totalBytes,
      cancelled: true,
    };
  }
  const snapshotId = createSnapshotId();
  const { tasks, descriptors, totalBytes, totalPages } = buildUploadTasks(published, snapshotId);
  const manifest: CloudManifest = {
    format: 'msp-prep-fiches-cloud',
    schemaVersion: 1,
    publisherId: PREP_FICHE_PUBLISHER_ID,
    snapshotId,
    publishedAt: new Date().toISOString(),
    totalPages,
    totalBytes,
    fiches: descriptors,
  };
  validateCloudManifest(manifest);
  if (new TextEncoder().encode(JSON.stringify(manifest)).byteLength > 3_500_000) {
    throw new Error('Le catalogue contient trop de descriptions ou de métadonnées. Réduisez le texte des fiches ou publiez-les en plusieurs lots.');
  }
  const uploadedPaths: string[] = [];
  let catalogueCommitted = false;

  try {
    let completed = 0;
    await mapWithConcurrency(tasks, 1, async (task) => {
      const blob = dataUrlToBlob(task.page.dataUrl, task.mimeType);
      if (blob.size !== task.size) throw new Error('Une page n’a pas la taille annoncée; la publication a été interrompue.');
      const signed = await callPublisherApi<{ uploadUrl: string; token: string }>({
        action: 'sign-upload',
        snapshotId,
        path: task.path,
        mimeType: task.mimeType,
        size: task.size,
      });
      await uploadPage(signed, task, blob);
      uploadedPaths.push(task.path);
      completed++;
      onProgress?.(`Envoi des pages : ${completed}/${tasks.length}…`);
    });

    onProgress?.('Publication du catalogue…');
    const result = await callPublisherApi<PrepFicheCloudPublishResult>({ action: 'publish', manifest });
    catalogueCommitted = true;
    try { await markPrepFichesDistributed(published.map((fiche) => fiche.id), Date.now()); }
    catch { /* la publication cloud est déjà validée; ce marqueur local est facultatif */ }
    setLocalCatalogVersion(result.version);
    onProgress?.('Catalogue synchronisé.');
    return result;
  } catch (error) {
    if (!catalogueCommitted && uploadedPaths.length > 0) {
      try {
        await callPublisherApi({ action: 'discard', snapshotId, paths: uploadedPaths });
      } catch { /* nettoyage de secours; la prochaine publication ne sera pas bloquée */ }
    }
    throw error;
  }
}

export const PREP_FICHE_CLOUD_LIMITS = Object.freeze({
  pageBytes: MAX_PAGE_BYTES,
  totalBytes: MAX_TOTAL_BYTES,
  pages: MAX_PAGES,
  fiches: MAX_FICHES,
});
