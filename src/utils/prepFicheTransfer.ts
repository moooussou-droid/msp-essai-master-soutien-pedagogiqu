import JSZip from 'jszip';
import {
  getAllPrepFiches, replaceImportedPrepFiches, PREP_FICHE_PUBLISHER_ID,
  type PrepFiche, type PrepFichePage,
} from './prepFiches';

const TRANSFER_FORMAT = 'msp-prep-fiches-transfer';
const TRANSFER_VERSION = 1;
const PUBLISHER_ID = PREP_FICHE_PUBLISHER_ID;
export const PREP_FICHE_TRANSFER_MAX_BYTES = 200 * 1024 * 1024;
const MANIFEST_MAX_CHARS = 12 * 1024 * 1024;
const MAX_TRANSFER_PAGES = 10_000;

interface TransferPage {
  path: string;
  w: number;
  h: number;
  mimeType: string;
  size: number;
}

type TransferFiche = Omit<PrepFiche, 'pages' | 'distribution'> & { pages: TransferPage[] };

interface TransferManifest {
  format: typeof TRANSFER_FORMAT;
  version: typeof TRANSFER_VERSION;
  publisherId: typeof PUBLISHER_ID;
  exportedAt: string;
  fiches: TransferFiche[];
}

export interface PrepFicheTransferPlan {
  added: number;
  updated: number;
  removed: number;
  pages: number;
  totalBytes: number;
}

export interface PrepFicheTransferResult extends PrepFicheTransferPlan {
  cancelled: boolean;
}

export interface PrepFicheExportResult {
  blob: Blob;
  fiches: number;
  pages: number;
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180) || 'fiche';
}

function dataUrlByteLength(encoded: string): number {
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(encoded.length * 3 / 4) - padding);
}

function dataUrlToBytes(dataUrl: string, title: string): { bytes: Uint8Array; mimeType: string } {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(dataUrl);
  if (!match || !match[2]) throw new Error(`La page d’image de « ${title} » est illisible.`);
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mimeType: match[1].toLowerCase() };
  } catch {
    throw new Error(`Impossible de préparer une page de « ${title} » pour le transfert.`);
  }
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/bmp': 'bmp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  };
  return extensions[mimeType] || 'img';
}

function validTransferPage(value: unknown): value is TransferPage {
  const page = value as Partial<TransferPage> | null;
  return Boolean(page
    && typeof page.path === 'string'
    && page.path.startsWith('pages/')
    && !page.path.startsWith('/')
    && !page.path.includes('\\')
    && !page.path.split('/').includes('..')
    && typeof page.mimeType === 'string'
    && /^image\/[A-Za-z0-9.+-]{1,80}$/i.test(page.mimeType)
    && Number.isFinite(page.w) && Number(page.w) > 0 && Number(page.w) <= 50_000
    && Number.isFinite(page.h) && Number(page.h) > 0 && Number(page.h) <= 50_000
    && Number.isSafeInteger(page.size) && Number(page.size) > 0
    && Number(page.size) <= PREP_FICHE_TRANSFER_MAX_BYTES);
}

function validTransferFiche(value: unknown): value is TransferFiche {
  const fiche = value as Partial<TransferFiche> | null;
  return Boolean(fiche
    && typeof fiche.id === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(fiche.id)
    && typeof fiche.classe === 'string' && fiche.classe.trim().length > 0 && fiche.classe.length <= 120
    && typeof fiche.matiere === 'string' && fiche.matiere.trim().length > 0 && fiche.matiere.length <= 160
    && typeof fiche.titre === 'string' && fiche.titre.trim().length > 0 && fiche.titre.length <= 300
    && (fiche.description === undefined || (typeof fiche.description === 'string' && fiche.description.length <= 4000))
    && fiche.published === true
    && Number.isFinite(fiche.createdAt) && Number(fiche.createdAt) >= 0
    && (fiche.updatedAt === undefined || (Number.isFinite(fiche.updatedAt) && Number(fiche.updatedAt) >= 0))
    && Array.isArray(fiche.pages) && fiche.pages.length > 0 && fiche.pages.length <= MAX_TRANSFER_PAGES
    && fiche.pageCount === fiche.pages.length
    && fiche.pages.every(validTransferPage));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Impossible de lire une page de l’archive.'));
    reader.onerror = () => reject(reader.error || new Error('Impossible de lire une page de l’archive.'));
    reader.readAsDataURL(new Blob([toArrayBuffer(bytes)], { type: mimeType }));
  });
}

/** Crée un ZIP hors ligne contenant les fiches publiées et leurs pages image. */
export async function exportPublishedPrepFichesArchive(): Promise<PrepFicheExportResult> {
  const published = (await getAllPrepFiches()).filter(fiche => fiche.published);
  if (published.length === 0) throw new Error('Aucune fiche publiée à exporter.');

  const zip = new JSZip();
  const fiches: TransferFiche[] = [];
  let totalBytes = 0;
  let totalPages = 0;

  for (const fiche of published) {
    if (!Array.isArray(fiche.pages) || fiche.pages.length === 0 || fiche.pages.length > MAX_TRANSFER_PAGES) {
      throw new Error(`La fiche « ${fiche.titre || 'sans titre'} » ne contient pas de pages transférables.`);
    }
    const pages: TransferPage[] = [];
    for (let index = 0; index < fiche.pages.length; index++) {
      const page = fiche.pages[index] as PrepFichePage;
      if (typeof page?.dataUrl !== 'string') {
        throw new Error(`Une page de la fiche « ${fiche.titre} » est manquante.`);
      }
      const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(page.dataUrl);
      if (!match || !match[2]) throw new Error(`Une page de la fiche « ${fiche.titre} » est illisible.`);
      const estimatedBytes = dataUrlByteLength(match[2]);
      totalBytes += estimatedBytes;
      if (estimatedBytes <= 0 || totalBytes > PREP_FICHE_TRANSFER_MAX_BYTES) {
        throw new Error('Le paquet dépasse la limite de transfert de 200 Mo. Exportez moins de fiches à la fois.');
      }
      const { bytes, mimeType } = dataUrlToBytes(page.dataUrl, fiche.titre);
      const path = `pages/${safeId(fiche.id)}/page-${String(index + 1).padStart(4, '0')}.${extensionForMime(mimeType)}`;
      zip.file(path, bytes, { binary: true });
      pages.push({ path, w: page.w, h: page.h, mimeType, size: bytes.byteLength });
      totalPages++;
    }
    fiches.push({
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

  const manifest: TransferManifest = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    publisherId: PUBLISHER_ID,
    exportedAt: new Date().toISOString(),
    fiches,
  };
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('LISEZ-MOI.txt',
    'Paquet ZIP de secours pour les fiches publiées par Master Soutien Pédagogique.\n'
    + 'La synchronisation cloud automatique est prioritaire lorsque l’application peut accéder à Internet.\n'
    + 'Pour un transfert hors ligne, ouvrez « Fiches de préparation Master Soutien Pédagogique » puis « Importer le paquet reçu ».\n'
    + 'Ce paquet contient uniquement les fiches publiées et leurs pages; aucune donnée d’élève ni aucun code d’accès n’est inclus.\n'
    + 'Après une mise à jour ou un retrait de fiche, créez et distribuez un nouveau paquet de secours.');

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  if (blob.size > PREP_FICHE_TRANSFER_MAX_BYTES) {
    throw new Error('Le paquet final dépasse la limite de 200 Mo. Exportez moins de fiches à la fois.');
  }
  return { blob, fiches: published.length, pages: totalPages };
}

/** Importe une archive MSP hors ligne et remplace la précédente collection importée de l’éditeur. */
export async function importPrepFichesArchive(
  file: File,
  confirmPlan?: (plan: PrepFicheTransferPlan) => boolean,
): Promise<PrepFicheTransferResult> {
  if (file.size <= 0 || file.size > PREP_FICHE_TRANSFER_MAX_BYTES) {
    throw new Error('Le paquet doit peser au maximum 200 Mo.');
  }

  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true }); }
  catch { throw new Error('Archive ZIP illisible ou endommagée.'); }
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry || manifestEntry.dir) throw new Error('Ce ZIP ne contient pas de manifeste de fiches MSP.');
  const manifestText = await manifestEntry.async('text');
  if (manifestText.length > MANIFEST_MAX_CHARS) throw new Error('Le manifeste du paquet est trop volumineux.');

  let manifest: TransferManifest;
  try { manifest = JSON.parse(manifestText) as TransferManifest; }
  catch { throw new Error('Le manifeste du paquet est illisible.'); }
  if (manifest.format !== TRANSFER_FORMAT || manifest.version !== TRANSFER_VERSION
    || manifest.publisherId !== PUBLISHER_ID || !Array.isArray(manifest.fiches)) {
    throw new Error('Format de transfert de fiches MSP non reconnu ou version incompatible.');
  }
  if (manifest.fiches.length === 0) throw new Error('Le paquet ne contient aucune fiche publiée.');

  const incomingIds = new Set<string>();
  const pagePaths = new Set<string>();
  let plannedBytes = 0;
  let plannedPages = 0;
  for (const fiche of manifest.fiches) {
    if (!validTransferFiche(fiche) || incomingIds.has(fiche.id)) {
      throw new Error('Le paquet contient une fiche invalide ou un identifiant en double.');
    }
    incomingIds.add(fiche.id);
    for (const page of fiche.pages) {
      if (pagePaths.has(page.path)) throw new Error('Le paquet référence deux fois la même page.');
      pagePaths.add(page.path);
      plannedBytes += page.size;
      plannedPages++;
      if (plannedBytes > PREP_FICHE_TRANSFER_MAX_BYTES || plannedPages > MAX_TRANSFER_PAGES) {
        throw new Error('Le paquet dépasse la limite de 200 Mo ou contient trop de pages.');
      }
    }
  }

  const existing = await getAllPrepFiches();
  const currentBundle = existing.filter(fiche => fiche.distribution?.publisherId === PUBLISHER_ID);
  const currentBundleIds = new Set(currentBundle.map(fiche => fiche.id));
  const locallyOwnedIds = new Set(existing
    .filter(fiche => fiche.distribution?.publisherId !== PUBLISHER_ID)
    .map(fiche => fiche.id));
  if ([...incomingIds].some(id => locallyOwnedIds.has(id))) {
    throw new Error('Une fiche du paquet a le même identifiant qu’une fiche locale; import arrêté sans modification.');
  }

  const added = manifest.fiches.filter(fiche => !currentBundleIds.has(fiche.id)).length;
  const updated = manifest.fiches.length - added;
  const removed = currentBundle.filter(fiche => !incomingIds.has(fiche.id)).length;
  const importedAt = Date.now();
  const fiches: PrepFiche[] = [];
  let actualBytes = 0;

  for (const fiche of manifest.fiches) {
    const pages: PrepFichePage[] = [];
    for (const descriptor of fiche.pages) {
      const entry = zip.file(descriptor.path);
      if (!entry || entry.dir) throw new Error(`Une page manque dans le paquet de « ${fiche.titre} ».`);
      const headerSize = Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize);
      if (Number.isFinite(headerSize) && headerSize > 0 && headerSize !== descriptor.size) {
        throw new Error(`La taille de la page de « ${fiche.titre} » ne correspond pas au manifeste.`);
      }
      const bytes = await entry.async('uint8array');
      if (bytes.byteLength !== descriptor.size) {
        throw new Error(`La taille de la page de « ${fiche.titre} » ne correspond pas au manifeste.`);
      }
      actualBytes += bytes.byteLength;
      if (actualBytes > PREP_FICHE_TRANSFER_MAX_BYTES) throw new Error('Le paquet dépasse la limite de 200 Mo.');
      pages.push({
        dataUrl: await bytesToDataUrl(bytes, descriptor.mimeType),
        w: descriptor.w,
        h: descriptor.h,
      });
    }
    fiches.push({
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
      distribution: { publisherId: PUBLISHER_ID, importedAt },
    });
  }

  const plan = { added, updated, removed, pages: plannedPages, totalBytes: actualBytes };
  if (confirmPlan && !confirmPlan(plan)) return { ...plan, cancelled: true };

  await replaceImportedPrepFiches(PUBLISHER_ID, fiches);
  return { ...plan, cancelled: false };
}

export function formatPrepFicheTransferSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
