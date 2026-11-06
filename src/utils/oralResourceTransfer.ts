import JSZip from 'jszip';
import {
  BUILTIN_ORAL_RESOURCES, ORAL_MEDIA_MAX_BYTES, getOralMedia, loadCustomOralResources,
  mergeCustomOralResources, saveOralMedia,
  type OralMediaKind, type OralResource,
} from './oralResources';
import { validateOralMediaFile } from './oralResources';

const TRANSFER_FORMAT = 'msp-oral-resources-transfer';
const TRANSFER_VERSION = 1;
export const ORAL_TRANSFER_MAX_BYTES = 200 * 1024 * 1024;
const MANIFEST_MAX_CHARS = 12 * 1024 * 1024;

interface TransferMedia {
  resourceId: string;
  kind: OralMediaKind;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface TransferManifest {
  format: typeof TRANSFER_FORMAT;
  version: typeof TRANSFER_VERSION;
  exportedAt: string;
  resources: OralResource[];
  media: TransferMedia[];
}

export interface OralTransferPlan {
  added: number;
  updated: number;
  media: number;
  totalBytes: number;
}

export interface OralTransferResult extends OralTransferPlan {
  cancelled: boolean;
}

function safeFileName(name: string): string {
  const leaf = (name || 'media').split(/[\\/]/).pop() || 'media';
  return leaf.replace(/[\u0000-\u001f<>:"|?*]/g, '_').slice(0, 180) || 'media';
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function safeResourceSegment(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'resource';
}

function validResource(value: unknown): value is OralResource {
  const item = value as Partial<OralResource> | null;
  return Boolean(item && typeof item.id === 'string' && /^res-[A-Za-z0-9_-]{1,150}$/.test(item.id)
    && !BUILTIN_ORAL_RESOURCES.some(builtin => builtin.id === item.id)
    && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 300
    && ['poesie', 'chant', 'comptine', 'conte'].includes(item.kind || '')
    && typeof item.level === 'string' && typeof item.language === 'string'
    && typeof item.theme === 'string' && typeof item.duration === 'string'
    && typeof item.objective === 'string' && typeof item.text === 'string'
    && typeof item.author === 'string' && item.isBuiltin === false);
}

function validMediaDescriptor(value: unknown): value is TransferMedia {
  const item = value as Partial<TransferMedia> | null;
  return Boolean(item && typeof item.resourceId === 'string'
    && /^res-[A-Za-z0-9_-]{1,150}$/.test(item.resourceId)
    && (item.kind === 'audio' || item.kind === 'video')
    && typeof item.path === 'string' && item.path.startsWith('media/')
    && !item.path.startsWith('/') && !item.path.split('/').includes('..')
    && typeof item.fileName === 'string' && item.fileName.length <= 240
    && typeof item.mimeType === 'string' && item.mimeType.length <= 120
    && Number.isFinite(item.size) && Number(item.size) > 0 && Number(item.size) <= ORAL_MEDIA_MAX_BYTES);
}

/** Crée une archive de transfert avec les textes personnalisés et leurs fichiers audio/vidéo. */
export async function exportOralResourcesArchive(): Promise<Blob> {
  const zip = new JSZip();
  const resources = loadCustomOralResources().map(resource => ({ ...resource, isBuiltin: false }));
  const media: TransferMedia[] = [];
  for (const resource of resources) {
    for (const kind of ['audio', 'video'] as const) {
      const item = await getOralMedia(resource.id, kind);
      if (!item?.blob) continue;
      if (item.blob.size <= 0 || item.blob.size > ORAL_MEDIA_MAX_BYTES) {
        throw new Error(`Le média « ${item.fileName || resource.title} » dépasse la limite de transfert.`);
      }
      const fileName = safeFileName(item.fileName || `${kind}.${kind === 'audio' ? 'mp3' : 'mp4'}`);
      const extMatch = fileName.match(/\.[a-z0-9]{1,8}$/i);
      const ext = extMatch?.[0]?.toLowerCase() || (kind === 'audio' ? '.mp3' : '.mp4');
      const path = `media/${safeResourceSegment(resource.id)}/${kind}${ext}`;
      const zipPayload = typeof window !== 'undefined'
        ? item.blob
        : new Uint8Array(await item.blob.arrayBuffer());
      zip.file(path, zipPayload as any, { binary: true });
      media.push({
        resourceId: resource.id,
        kind,
        path,
        fileName,
        mimeType: item.mimeType || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4'),
        size: item.blob.size,
      });
    }
  }
  const manifest: TransferManifest = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    resources,
    media,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('LISEZ-MOI.txt', 'Transfert manuel Master Soutien Pédagogique : dans l’application de destination, ouvrez « Poésies, chants, comptines et contes » puis « Importer et fusionner ». Les codes d’abonnement, les codes équipe et les données des élèves ne sont pas inclus.');
  if (typeof window === 'undefined') {
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    return new Blob([toArrayBuffer(bytes)]);
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

/** Lit, valide et fusionne l'archive. Les ressources existantes sont conservées; les identifiants identiques sont actualisés. */
export async function importOralResourcesArchive(
  file: File,
  confirmPlan?: (plan: OralTransferPlan) => boolean,
): Promise<OralTransferResult> {
  if (file.size <= 0 || file.size > ORAL_TRANSFER_MAX_BYTES) {
    throw new Error('Le fichier de transfert doit peser au maximum 200 Mo.');
  }
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true }); }
  catch { throw new Error('Archive ZIP illisible ou endommagée.'); }
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('Ce ZIP ne contient pas de manifeste MSP de ressources orales.');
  const manifestText = await manifestEntry.async('text');
  if (manifestText.length > MANIFEST_MAX_CHARS) throw new Error('Le manifeste du ZIP est trop volumineux.');
  let manifest: TransferManifest;
  try { manifest = JSON.parse(manifestText) as TransferManifest; }
  catch { throw new Error('Le manifeste de transfert est illisible.'); }
  if (manifest.format !== TRANSFER_FORMAT || manifest.version !== TRANSFER_VERSION
    || !Array.isArray(manifest.resources) || !Array.isArray(manifest.media)) {
    throw new Error('Format de transfert MSP non reconnu ou version incompatible.');
  }

  const builtinIds = new Set(BUILTIN_ORAL_RESOURCES.map(resource => resource.id));
  const incomingIds = new Set<string>();
  for (const resource of manifest.resources) {
    if (!validResource(resource) || builtinIds.has(resource.id) || incomingIds.has(resource.id)) {
      throw new Error('Le ZIP contient une ressource invalide ou un identifiant en double.');
    }
    incomingIds.add(resource.id);
  }
  const mediaKeys = new Set<string>();
  for (const descriptor of manifest.media) {
    const key = `${descriptor?.resourceId}:${descriptor?.kind}`;
    if (!validMediaDescriptor(descriptor) || !incomingIds.has(descriptor.resourceId) || mediaKeys.has(key)) {
      throw new Error('Le ZIP contient un fichier média non associé à une ressource valide.');
    }
    mediaKeys.add(key);
  }

  const existingIds = new Set(loadCustomOralResources().map(resource => resource.id));
  const added = manifest.resources.filter(resource => !existingIds.has(resource.id)).length;
  const updated = manifest.resources.length - added;
  let totalBytes = 0;
  const mediaFiles: { descriptor: TransferMedia; file: File }[] = [];
  for (const descriptor of manifest.media) {
    const entry = zip.file(descriptor.path);
    if (!entry || entry.dir) throw new Error(`Le fichier média « ${descriptor.fileName} » manque dans l’archive.`);
    const bytes = await entry.async('uint8array');
    const actualSize = bytes.byteLength;
    totalBytes += actualSize;
    if (actualSize !== descriptor.size || actualSize > ORAL_MEDIA_MAX_BYTES || totalBytes > ORAL_TRANSFER_MAX_BYTES) {
      throw new Error(`La taille du média « ${descriptor.fileName} » est invalide ou dépasse la limite.`);
    }
    const fileName = safeFileName(descriptor.fileName);
    const mediaFile = new File([toArrayBuffer(bytes)], fileName, { type: descriptor.mimeType });
    const validation = validateOralMediaFile(mediaFile, descriptor.kind);
    if (validation) throw new Error(`« ${fileName} » : ${validation}`);
    mediaFiles.push({ descriptor, file: mediaFile });
  }

  const actualKinds = new Map<string, OralMediaKind[]>();
  for (const { descriptor } of mediaFiles) {
    actualKinds.set(descriptor.resourceId, [...(actualKinds.get(descriptor.resourceId) || []), descriptor.kind]);
  }
  const resources = manifest.resources.map(resource => ({
    ...resource,
    isBuiltin: false,
    mediaKinds: actualKinds.get(resource.id) || [],
  }));
  if (resources.some(resource => !resource.text.trim() && !(resource.mediaKinds || []).length)) {
    throw new Error('Une ressource sans texte ne contient aucun média dans le ZIP.');
  }

  const plan = { added, updated, media: mediaFiles.length, totalBytes };
  if (confirmPlan && !confirmPlan(plan)) return { ...plan, cancelled: true };

  const merged = mergeCustomOralResources(resources);
  for (const { descriptor, file: mediaFile } of mediaFiles) {
    await saveOralMedia(descriptor.resourceId, descriptor.kind, mediaFile);
  }
  return { ...merged, media: mediaFiles.length, totalBytes, cancelled: false };
}

export function formatOralTransferSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
