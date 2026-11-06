/**
 * FICHES DE PRÉPARATION « MASTER SOUTIEN PÉDAGOGIQUE » (v61).
 *
 * L'équipe d'administration met en ligne des fiches de préparation classées
 * PAR CLASSE et PAR MATIÈRE / DISCIPLINE. Chaque fiche est composée d'une ou
 * plusieurs PAGES (images ou PDF converti en images).
 *
 * Règle métier :
 *  - Dès qu'une fiche est mise en ligne, elle porte le filigrane
 *    « Master Soutien Pédagogique » (téléchargement gratuit).
 *  - L'utilisateur peut PERSONNALISER le filigrane (mettre son nom / son école)
 *    à la place de « Master Soutien Pédagogique ». Cette personnalisation lui
 *    coûte 5 F PAR PAGE de la fiche.
 *  - Le paiement se règle auprès du Super Administrateur, qui délivre un code
 *    de déverrouillage (même mécanisme que les autres contenus payants).
 *
 * Les pages restent stockées dans IndexedDB pour être disponibles hors ligne.
 * Les fiches publiées par l’administration se synchronisent automatiquement
 * depuis le catalogue cloud public; l’archive ZIP reste une solution de secours.
 * La personnalisation du filigrane reste dans le stockage local de l’appareil.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import jsPDF from 'jspdf';

/** Prix de la personnalisation du filigrane : 5 F par page. */
export const PRICE_PER_PAGE = 5;

/** Filigrane par défaut, imposé dès la mise en ligne. */
export const DEFAULT_WATERMARK = 'Master Soutien Pédagogique';

/** Identifiant stable des fiches publiées par le catalogue officiel. */
export const PREP_FICHE_PUBLISHER_ID = 'master-soutien-pedagogique';

/** Une page de fiche : image (dataURL JPEG/PNG) + dimensions en pixels. */
export interface PrepFichePage {
  dataUrl: string;
  w: number;
  h: number;
}

export interface PrepFiche {
  id: string;
  classe: string;
  matiere: string;
  titre: string;
  description?: string;
  pages: PrepFichePage[];
  pageCount: number;
  /** Publication locale : le contenu est inclus dans le prochain paquet de diffusion. */
  published: boolean;
  createdAt: number;
  updatedAt?: number;
  /** Provenance locale d’une fiche reçue du catalogue cloud ou du ZIP de secours. */
  distribution?: {
    publisherId: string;
    importedAt: number;
  };
}

interface PrepFichesDB extends DBSchema {
  fiches: {
    key: string;
    value: PrepFiche;
    indexes: { 'by-classe': string };
  };
}

let dbPromise: Promise<IDBPDatabase<PrepFichesDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PrepFichesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PrepFichesDB>('MasterSoutienPrepFiches', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('fiches')) {
          const store = database.createObjectStore('fiches', { keyPath: 'id' });
          store.createIndex('by-classe', 'classe');
        }
      },
    });
  }
  return dbPromise;
}

export function generateFicheId(): string {
  return `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Identifiant de contenu payant (couplé au système de déverrouillage). */
export function ficheContentId(id: string): string {
  return `fiche:${id}`;
}

/** Prix total de la personnalisation d'une fiche (5 F × nombre de pages). */
export function personalizationPrice(fiche: Pick<PrepFiche, 'pageCount'>): number {
  return Math.max(1, fiche.pageCount) * PRICE_PER_PAGE;
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function savePrepFiche(fiche: PrepFiche): Promise<void> {
  const db = await getDB();
  await db.put('fiches', { ...fiche, pageCount: fiche.pages.length, updatedAt: Date.now() });
}

export async function getAllPrepFiches(): Promise<PrepFiche[]> {
  const db = await getDB();
  const all = await db.getAll('fiches');
  return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getPublishedPrepFiches(): Promise<PrepFiche[]> {
  return (await getAllPrepFiches()).filter((f) => f.published);
}

export async function getPrepFiche(id: string): Promise<PrepFiche | undefined> {
  const db = await getDB();
  return db.get('fiches', id);
}

export async function deletePrepFiche(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('fiches', id);
}

export async function setFichePublished(id: string, published: boolean): Promise<void> {
  const fiche = await getPrepFiche(id);
  if (!fiche) return;
  const updated: PrepFiche = { ...fiche, published };
  if (!published) delete updated.distribution;
  await savePrepFiche(updated);
}

/** Remplace atomiquement le paquet importé de l'éditeur, sans toucher aux fiches locales. */
export async function replaceImportedPrepFiches(publisherId: string, fiches: PrepFiche[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('fiches', 'readwrite');
  const done = tx.done;
  try {
    const current = await tx.store.getAll();
    for (const fiche of current) {
      if (fiche.distribution?.publisherId === publisherId) await tx.store.delete(fiche.id);
    }
    for (const fiche of fiches) await tx.store.put(fiche);
    await done;
  } catch (error) {
    try { tx.abort(); } catch { /* transaction déjà annulée */ }
    try { await done; } catch { /* rejets de transaction traités */ }
    throw error;
  }
}

/** Remplace atomiquement uniquement le catalogue cloud officiel; les brouillons locaux sont protégés. */
export async function replaceCloudPublishedPrepFiches(fiches: PrepFiche[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('fiches', 'readwrite');
  const done = tx.done;
  try {
    const current = await tx.store.getAll();
    const byId = new Map(current.map((fiche) => [fiche.id, fiche]));
    const incomingIds = new Set(fiches.map((fiche) => fiche.id));

    for (const fiche of current) {
      if (fiche.distribution?.publisherId === PREP_FICHE_PUBLISHER_ID) {
        await tx.store.delete(fiche.id);
      } else if (incomingIds.has(fiche.id) && !fiche.published) {
        throw new Error(`La fiche « ${fiche.titre || fiche.id} » entre en conflit avec un brouillon local. Renommez ce brouillon avant la synchronisation.`);
      } else if (incomingIds.has(fiche.id) && fiche.distribution?.publisherId) {
        throw new Error('Le catalogue cloud contient une fiche déjà attribuée à un autre paquet de transfert.');
      }
    }

    for (const fiche of fiches) {
      const existing = byId.get(fiche.id);
      await tx.store.put({
        ...fiche,
        published: true,
        distribution: { publisherId: PREP_FICHE_PUBLISHER_ID, importedAt: Date.now() },
        ...(existing?.distribution?.publisherId === PREP_FICHE_PUBLISHER_ID
          ? { distribution: { publisherId: PREP_FICHE_PUBLISHER_ID, importedAt: existing.distribution.importedAt } }
          : {}),
      });
    }
    await done;
  } catch (error) {
    try { tx.abort(); } catch { /* transaction déjà annulée */ }
    try { await done; } catch { /* rejets de transaction traités */ }
    throw error;
  }
}

/** Marque les fiches publiées localement après confirmation du catalogue serveur. */
export async function markPrepFichesDistributed(ids: string[], importedAt = Date.now()): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('fiches', 'readwrite');
  const done = tx.done;
  try {
    for (const id of ids) {
      const fiche = await tx.store.get(id);
      if (!fiche || !fiche.published) continue;
      await tx.store.put({
        ...fiche,
        distribution: { publisherId: PREP_FICHE_PUBLISHER_ID, importedAt },
      });
    }
    await done;
  } catch (error) {
    try { tx.abort(); } catch { /* transaction déjà annulée */ }
    try { await done; } catch { /* rejets de transaction traités */ }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Regroupement pour l'affichage utilisateur (classe → matière)        */
/* ------------------------------------------------------------------ */

export interface FichesByClasse {
  classe: string;
  matieres: { matiere: string; fiches: PrepFiche[] }[];
  total: number;
}

export function groupByClasse(fiches: PrepFiche[]): FichesByClasse[] {
  const map = new Map<string, Map<string, PrepFiche[]>>();
  for (const f of fiches) {
    const classe = f.classe.trim() || 'Non classé';
    const matiere = f.matiere.trim() || 'Général';
    if (!map.has(classe)) map.set(classe, new Map());
    const inner = map.get(classe)!;
    if (!inner.has(matiere)) inner.set(matiere, []);
    inner.get(matiere)!.push(f);
  }
  const result: FichesByClasse[] = [];
  for (const [classe, inner] of map) {
    const matieres = [...inner.entries()]
      .map(([matiere, list]) => ({ matiere, fiches: list.sort((a, b) => a.titre.localeCompare(b.titre)) }))
      .sort((a, b) => a.matiere.localeCompare(b.matiere));
    result.push({ classe, matieres, total: matieres.reduce((n, m) => n + m.fiches.length, 0) });
  }
  return result.sort((a, b) => a.classe.localeCompare(b.classe, 'fr', { numeric: true }));
}

/* ------------------------------------------------------------------ */
/* Filigrane personnalisé de l'utilisateur                             */
/* ------------------------------------------------------------------ */

const WATERMARK_KEY = 'msp_prep_watermark_text';

export function getUserWatermark(): string {
  try {
    return localStorage.getItem(WATERMARK_KEY) || '';
  } catch {
    return '';
  }
}

export function setUserWatermark(text: string): void {
  try {
    localStorage.setItem(WATERMARK_KEY, text);
  } catch {
    /* quota */
  }
}

/* ------------------------------------------------------------------ */
/* Extraction des pages depuis un fichier (image ou PDF)               */
/* ------------------------------------------------------------------ */

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1000, h: img.naturalHeight || 1400 });
    img.onerror = () => resolve({ w: 1000, h: 1400 });
    img.src = dataUrl;
  });
}

/** Convertit un PDF en une liste d'images (une par page) via pdf.js. */
async function pdfToPages(file: File, onProgress?: (done: number, total: number) => void): Promise<PrepFichePage[]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  if (pdfjsLib.GlobalWorkerOptions && pdfjsLib.version && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
  const pdf = await pdfjsLib.getDocument({
    data: await file.arrayBuffer(),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;

  const pages: PrepFichePage[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), w: canvas.width, h: canvas.height });
    onProgress?.(n, pdf.numPages);
  }
  return pages;
}

/**
 * Transforme les fichiers déposés par l'administrateur en pages de fiche.
 * Accepte les images (1 page par image) et les PDF (1 page par page).
 */
export async function extractPages(
  files: File[],
  onProgress?: (label: string) => void,
): Promise<PrepFichePage[]> {
  const pages: PrepFichePage[] = [];
  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (isPdf) {
      onProgress?.(`Conversion du PDF « ${file.name} »…`);
      const pdfPages = await pdfToPages(file, (d, t) => onProgress?.(`PDF « ${file.name} » : page ${d}/${t}…`));
      pages.push(...pdfPages);
    } else if (isImg) {
      onProgress?.(`Ajout de l'image « ${file.name} »…`);
      const dataUrl = await readFileAsDataURL(file);
      const { w, h } = await imageDimensions(dataUrl);
      pages.push({ dataUrl, w, h });
    } else {
      throw new Error(`Format non supporté : ${file.name}. Utilisez des images (JPG/PNG) ou un PDF.`);
    }
  }
  return pages;
}

/* ------------------------------------------------------------------ */
/* Génération du PDF filigrané                                         */
/* ------------------------------------------------------------------ */

function drawWatermark(doc: jsPDF, pw: number, ph: number, text: string) {
  const label = (text || DEFAULT_WATERMARK).trim() || DEFAULT_WATERMARK;
  const anyDoc = doc as any;
  if (typeof anyDoc.saveGraphicsState === 'function') anyDoc.saveGraphicsState();
  try {
    if (typeof anyDoc.GState === 'function' && typeof anyDoc.setGState === 'function') {
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.16 }));
    }
  } catch {
    /* opacité non supportée : filigrane simplement plus visible */
  }
  doc.setTextColor(5, 150, 105); // emerald
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const stepX = 78;
  const stepY = 46;
  for (let y = 8; y < ph + stepY; y += stepY) {
    for (let x = -14; x < pw + stepX; x += stepX) {
      doc.text(label, x, y, { angle: 30 } as any);
    }
  }
  if (typeof anyDoc.restoreGraphicsState === 'function') anyDoc.restoreGraphicsState();
}

/**
 * Fabrique le PDF de la fiche, chaque page portant le filigrane demandé.
 * Filigrane par défaut = « Master Soutien Pédagogique ».
 */
export function buildFichePdf(fiche: PrepFiche, watermark: string = DEFAULT_WATERMARK): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 7;
  const maxW = pw - margin * 2;
  const maxH = ph - margin * 2;

  fiche.pages.forEach((p, i) => {
    if (i > 0) doc.addPage();
    const ratio = Math.min(maxW / p.w, maxH / p.h);
    const w = p.w * ratio;
    const h = p.h * ratio;
    const x = (pw - w) / 2;
    const y = (ph - h) / 2;
    const fmt = p.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(p.dataUrl, fmt, x, y, w, h, undefined, 'FAST');
    drawWatermark(doc, pw, ph, watermark);
  });

  return doc;
}

function safeFileName(fiche: PrepFiche): string {
  const base = `${fiche.classe}-${fiche.matiere}-${fiche.titre}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `fiche-${base || fiche.id}.pdf`;
}

/** Télécharge la fiche avec le filigrane fourni (par défaut : Master Soutien Pédagogique). */
export function downloadFichePdf(fiche: PrepFiche, watermark: string = DEFAULT_WATERMARK): void {
  const doc = buildFichePdf(fiche, watermark);
  doc.save(safeFileName(fiche));
}
