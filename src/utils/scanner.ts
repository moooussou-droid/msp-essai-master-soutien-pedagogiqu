/**
 * NUMÉRISATION HD DE DOCUMENTS (v47) — traitement d'image hors ligne.
 *
 * Demande : « intègre la numérisation en HD de documents depuis
 * l'application » et « la numérisation de la signature et du cachet ».
 *
 * Tout se fait dans le navigateur, sur un <canvas> : aucune image ne quitte
 * le téléphone et aucun service en ligne n'est appelé (contrainte : 100 %
 * hors ligne).
 *
 * ── POURQUOI CES TRAITEMENTS ? ───────────────────────────────────────
 * Une photo de document prise au téléphone est rarement exploitable telle
 * quelle : éclairage inégal, papier grisâtre, ombre de la main. On propose
 * donc trois rendus :
 *   • COULEUR   : photo redimensionnée, rien d'autre.
 *   • GRIS      : luminance, utile pour alléger le fichier.
 *   • NOIR ET BLANC : binarisation adaptative — le rendu « scanner ».
 *
 * La binarisation ADAPTATIVE est indispensable : un seuil global (ex. 128)
 * noircit tout un côté de la feuille dès qu'une ombre la traverse. On
 * compare donc chaque pixel à la moyenne de son VOISINAGE, ce qui suit
 * les variations d'éclairage. C'est le principe du seuillage de Bradley.
 */

export type ScanMode = 'couleur' | 'gris' | 'nb';

export interface ScanOptions {
  mode: ScanMode;
  /** Côté le plus long de l'image produite, en pixels. */
  maxSize?: number;
  /** Contraste appliqué avant binarisation (1 = neutre). */
  contrast?: number;
  /** Rotation en degrés : 0, 90, 180 ou 270. */
  rotation?: number;
}

/** 300 ppp sur une page A4 ≈ 2480 × 3508 : on vise ce niveau « HD ». */
export const HD_MAX_SIZE = 2480;

/** Charge un fichier image en HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible.'));
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

/**
 * LUMINANCE perceptuelle (norme UIT-R BT.601) :
 *   Y = 0,299 R + 0,587 V + 0,114 B
 * La moyenne arithmétique (R+V+B)/3 rendrait le rouge trop clair et le
 * vert trop sombre : un cachet rouge disparaîtrait presque.
 */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * SEUILLAGE ADAPTATIF (Bradley) sur une image en niveaux de gris.
 *
 * Pour chaque pixel, on calcule la moyenne des pixels d'une fenêtre carrée
 * centrée sur lui, à l'aide d'une IMAGE INTÉGRALE (somme cumulée) : cela
 * rend le coût indépendant de la taille de la fenêtre, sans quoi le
 * traitement d'une photo HD serait interminable sur un téléphone.
 *
 * Le pixel devient noir si sa valeur est inférieure à (moyenne × (1 − t)).
 * t = 0,15 est la valeur recommandée : en dessous, le bruit du papier
 * ressort ; au-dessus, les traits fins de stylo disparaissent.
 */
export function adaptiveThreshold(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  t = 0.15,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  // Image intégrale en Float64 : la somme d'une photo HD dépasse 2^32.
  const integral = new Float64Array((width + 1) * (height + 1));

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[(y + 1) * (width + 1) + (x + 1)] =
        integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  // Fenêtre ≈ 1/8 de la largeur : assez large pour lisser l'éclairage,
  // assez étroite pour suivre une ombre.
  const half = Math.max(2, Math.floor(width / 16));

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(height - 1, y + half);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(width - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)]
        - integral[y1 * (width + 1) + (x2 + 1)]
        - integral[(y2 + 1) * (width + 1) + x1]
        + integral[y1 * (width + 1) + x1];
      const mean = sum / count;
      out[y * width + x] = gray[y * width + x] < mean * (1 - t) ? 0 : 255;
    }
  }
  return out;
}

/** Applique un contraste centré sur le gris moyen (128). */
function applyContrast(v: number, factor: number): number {
  return (v - 128) * factor + 128;
}

/**
 * Traite une image et renvoie une data URL JPEG/PNG haute définition.
 * La rotation est appliquée avant le traitement des pixels.
 */
export async function processScan(source: string, options: ScanOptions): Promise<string> {
  const { mode, maxSize = HD_MAX_SIZE, contrast = 1.15, rotation = 0 } = options;
  const img = await loadImage(source);

  // Redimensionnement : on n'AGRANDIT jamais (ratio plafonné à 1), un
  // agrandissement n'ajoute aucun détail et gonfle le fichier.
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Traitement d’image indisponible sur cet appareil.');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  if (mode === 'couleur') return canvas.toDataURL('image/jpeg', 0.92);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = applyContrast(luminance(px[i], px[i + 1], px[i + 2]), contrast);
  }

  const final = mode === 'nb'
    ? adaptiveThreshold(gray, canvas.width, canvas.height)
    : gray;

  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    px[i] = px[i + 1] = px[i + 2] = final[j];
    px[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);

  // Le noir et blanc est enregistré en PNG : le JPEG créerait un halo
  // autour de chaque lettre (artefacts de compression sur aplats).
  return mode === 'nb' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * DÉTOURAGE D'UNE SIGNATURE OU D'UN CACHET.
 *
 * Une signature photographiée sur une feuille arrive avec un fond blanc
 * opaque : apposée sur un document, elle masquerait le texte. On rend donc
 * le fond TRANSPARENT.
 *
 * Méthode : tout pixel plus clair que le seuil devient transparent ; les
 * pixels sombres (le trait) sont conservés. Pour un cachet, la couleur est
 * préservée si `keepColor` est vrai — un cachet est souvent bleu ou rouge,
 * et le noircir le rendrait douteux sur un document officiel.
 */
export async function extractSignature(
  source: string,
  opts: { threshold?: number; keepColor?: boolean; maxSize?: number } = {},
): Promise<string> {
  const { threshold = 180, keepColor = false, maxSize = 1200 } = opts;
  const img = await loadImage(source);

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Traitement d’image indisponible sur cet appareil.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;

  // Bornes du contenu, pour rogner les marges blanches inutiles.
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

  for (let i = 0; i < px.length; i += 4) {
    const y = luminance(px[i], px[i + 1], px[i + 2]);
    if (y > threshold) {
      px[i + 3] = 0; // fond → transparent
    } else {
      const pixIndex = i / 4;
      const x = pixIndex % canvas.width;
      const row = Math.floor(pixIndex / canvas.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (row < minY) minY = row;
      if (row > maxY) maxY = row;
      if (!keepColor) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; }
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);

  // Aucun pixel sombre : image vide (photo surexposée). On la renvoie
  // telle quelle plutôt que de produire un canvas de taille nulle.
  if (maxX < 0 || maxY < 0) return canvas.toDataURL('image/png');

  const pad = 8;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
  const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext('2d');
  if (!octx) return canvas.toDataURL('image/png');
  octx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL('image/png'); // PNG obligatoire : conserve l'alpha
}

/* ------------------------------------------------------------------ */
/* Stockage de la signature et du cachet                               */
/* ------------------------------------------------------------------ */

export const SIGNATURE_KEY = 'msp_signature_image';
export const STAMP_KEY = 'msp_stamp_image';

export function saveSignatureImage(dataUrl: string): void {
  try { localStorage.setItem(SIGNATURE_KEY, dataUrl); } catch { /* quota */ }
}
export function getSignatureImage(): string {
  try { return localStorage.getItem(SIGNATURE_KEY) || ''; } catch { return ''; }
}
export function saveStampImage(dataUrl: string): void {
  try { localStorage.setItem(STAMP_KEY, dataUrl); } catch { /* quota */ }
}
export function getStampImage(): string {
  try { return localStorage.getItem(STAMP_KEY) || ''; } catch { return ''; }
}
export function clearSignatureImage(): void {
  try { localStorage.removeItem(SIGNATURE_KEY); } catch { /* ignore */ }
}
export function clearStampImage(): void {
  try { localStorage.removeItem(STAMP_KEY); } catch { /* ignore */ }
}
