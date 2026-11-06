/**
 * PHOTO D’IDENTITÉ NUMÉRIQUE (v67) — cadrage et fond blanc 100 % hors ligne.
 *
 * La photo finale est produite en 800 × 1000 px (format portrait 4:5), en
 * JPEG haute qualité. Le fond blanc n’utilise PAS un simple remplacement
 * global de couleur : un tel filtre blanchirait aussi un vêtement clair ou
 * les reflets de la peau. On fait partir la sélection depuis les bords de
 * l’image (zone normalement occupée par le mur/fond), puis elle progresse
 * seulement vers des pixels voisins et chromatiquement proches. Le sujet
 * intérieur n’est donc remplacé que s’il est réellement relié au fond par
 * une zone de couleur quasi identique ; l’aperçu et le réglage de tolérance
 * permettent de corriger ce cas avant l’enregistrement définitif.
 */
import { loadImage } from './scanner';

export const IDENTITY_PHOTO_WIDTH = 800;
export const IDENTITY_PHOTO_HEIGHT = 1000;

export interface IdentityPhotoOptions {
  /** Centre du cadrage dans l’image source, de 0 à 1. */
  centerX?: number;
  centerY?: number;
  /** 1 = cadrage couvrant ; > 1 = zoom. */
  zoom?: number;
  /** Rotation en degrés, multiple de 90 privilégié. */
  rotation?: number;
  whiteBackground?: boolean;
  /** 10 (prudent) à 100 (fond très varié). */
  tolerance?: number;
  quality?: number;
}

export interface IdentityPhotoResult {
  dataUrl: string;
  width: number;
  height: number;
  /** Taille réelle de la zone source utilisée (contrôle de netteté). */
  sourceCropWidth: number;
  sourceCropHeight: number;
  /** Part candidate reconnue comme fond, 0..1; elle n’est pas forcément appliquée. */
  backgroundCoverage: number;
  /** Faux si le détourage a été désactivé par prudence afin de préserver le sujet. */
  backgroundApplied: boolean;
  /** Explication affichée quand le masque est vide ou risque d’effacer le sujet. */
  backgroundWarning?: string;
  qualityLabel: 'Excellente' | 'Bonne' | 'Moyenne' | 'Faible';
}

export type IdentityBackgroundDecision = 'apply' | 'empty' | 'unsafe';

/**
 * Barrière de sécurité du détourage. Un masque qui envahit la zone du visage,
 * le torse ou presque toute l’image est ambigu : on garde alors la photo
 * recadrée telle quelle plutôt que de peindre le sujet en blanc.
 */
export function assessIdentityBackgroundMask(
  coverage: number,
  faceCoverage: number,
  torsoCoverage: number,
): IdentityBackgroundDecision {
  if (![coverage, faceCoverage, torsoCoverage].every(Number.isFinite)) return 'unsafe';
  if (coverage < 0.012) return 'empty';
  if (coverage > 0.82 || faceCoverage > 0.08 || torsoCoverage > 0.24) return 'unsafe';
  return 'apply';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Traitement d’image indisponible sur cet appareil.');
  return [canvas, ctx];
}

function colorDistance(data: Uint8ClampedArray, a: number, b: number): number {
  const dr = data[a] - data[b];
  const dg = data[a + 1] - data[b + 1];
  const db = data[a + 2] - data[b + 2];
  // Distance perceptuelle pondérée : l’œil est plus sensible au vert.
  return Math.sqrt(0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

function distanceToColor(
  data: Uint8ClampedArray,
  offset: number,
  color: [number, number, number],
): number {
  const dr = data[offset] - color[0];
  const dg = data[offset + 1] - color[1];
  const db = data[offset + 2] - color[2];
  return Math.sqrt(0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

function maskCoverageInRect(
  mask: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const left = clamp(Math.floor(x0 * width), 0, width - 1);
  const top = clamp(Math.floor(y0 * height), 0, height - 1);
  const right = clamp(Math.ceil(x1 * width), left + 1, width);
  const bottom = clamp(Math.ceil(y1 * height), top + 1, height);
  let marked = 0;
  let total = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (mask[y * width + x]) marked++;
      total++;
    }
  }
  return total ? marked / total : 0;
}

/**
 * Construit un masque du fond à basse résolution par remplissage connecté
 * (« flood fill ») depuis le haut et les côtés. Le bas n’est amorcé que dans
 * les coins afin d’éviter de prendre le torse/vêtement de l’élève pour le fond.
 */
function buildBackgroundMask(
  source: HTMLCanvasElement,
  toleranceInput: number,
): { maskCanvas: HTMLCanvasElement; coverage: number; faceCoverage: number; torsoCoverage: number } {
  const maskW = 400;
  const maskH = 500;
  const [, sctx] = makeCanvas(maskW, maskH);
  sctx.drawImage(source, 0, 0, maskW, maskH);
  const image = sctx.getImageData(0, 0, maskW, maskH);
  const data = image.data;
  const total = maskW * maskH;

  // Couleurs de référence : moyenne de petits échantillons dans les coins
  // et au milieu des bords haut/gauche/droit. Plusieurs références acceptent
  // un mur éclairé de façon inégale.
  const samples: [number, number, number][] = [];
  const sampleAt = (cx: number, cy: number) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.max(0, cy - 3); y <= Math.min(maskH - 1, cy + 3); y++) {
      for (let x = Math.max(0, cx - 3); x <= Math.min(maskW - 1, cx + 3); x++) {
        const o = (y * maskW + x) * 4;
        r += data[o]; g += data[o + 1]; b += data[o + 2]; n++;
      }
    }
    if (n) samples.push([r / n, g / n, b / n]);
  };
  sampleAt(4, 4); sampleAt(maskW - 5, 4); sampleAt(maskW >> 1, 4);
  sampleAt(4, maskH >> 1); sampleAt(maskW - 5, maskH >> 1);
  sampleAt(4, maskH - 5); sampleAt(maskW - 5, maskH - 5);

  // Seuils conservateurs : une tolérance élevée peut faire « fuir » le
  // remplissage dans la peau ou un vêtement clair. Le contrôle de sécurité
  // plus bas vérifiera aussi explicitement la zone du visage et du torse.
  const tolerance = 24 + clamp(toleranceInput, 0, 100) * 0.42; // 24..66
  const localLimit = 5 + clamp(toleranceInput, 0, 100) * 0.07; // 5..12
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  let covered = 0;

  const nearestReferenceDistance = (idx: number): number => {
    const o = idx * 4;
    let best = Number.POSITIVE_INFINITY;
    for (const color of samples) best = Math.min(best, distanceToColor(data, o, color));
    return best;
  };

  const push = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    mask[idx] = 1;
    covered++;
    queue[tail++] = idx;
  };

  // Amorces : bord supérieur + bords latéraux + petits coins inférieurs.
  for (let x = 0; x < maskW; x++) {
    const idx = x;
    if (nearestReferenceDistance(idx) <= tolerance) push(idx);
  }
  for (let y = 0; y < maskH; y++) {
    for (const x of [0, maskW - 1]) {
      const idx = y * maskW + x;
      if (nearestReferenceDistance(idx) <= tolerance) push(idx);
    }
  }
  const corner = Math.round(maskW * 0.12);
  for (let x = 0; x < corner; x++) {
    for (const idx of [(maskH - 1) * maskW + x, (maskH - 1) * maskW + (maskW - 1 - x)]) {
      if (nearestReferenceDistance(idx) <= tolerance) push(idx);
    }
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % maskW;
    const y = Math.floor(idx / maskW);
    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x + 1 < maskW ? idx + 1 : -1,
      y > 0 ? idx - maskW : -1,
      y + 1 < maskH ? idx + maskW : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const io = idx * 4;
      const no = n * 4;
      const local = colorDistance(data, io, no);
      const global = nearestReferenceDistance(n);
      // La progression locale suit un dégradé du mur, mais le saut de
      // couleur au contour du sujet agit comme une barrière. On ne marque
      // pas un pixel refusé comme visité : il pourra être réexaminé depuis
      // un autre voisin réellement situé dans le fond, sans pour autant
      // traverser une zone uniforme du visage ou des vêtements.
      const followsBackground = global <= tolerance && local <= localLimit * 1.7;
      const followsGradient = local <= localLimit && global <= tolerance * 1.12;
      if (followsBackground || followsGradient) {
        visited[n] = 1;
        mask[n] = 1;
        covered++;
        queue[tail++] = n;
      }
    }
  }

  // La caméra guide l’élève au centre. Ces zones servent uniquement à
  // détecter un masque qui a commencé à recouvrir le sujet : si c’est le cas,
  // le remplacement entier sera annulé (on ne garde pas un détourage partiel).
  const faceCoverage = maskCoverageInRect(mask, maskW, maskH, 0.40, 0.16, 0.60, 0.60);
  const torsoCoverage = maskCoverageInRect(mask, maskW, maskH, 0.30, 0.58, 0.70, 0.97);

  const [maskCanvas, mctx] = makeCanvas(maskW, maskH);
  const out = mctx.createImageData(maskW, maskH);
  for (let i = 0; i < total; i++) {
    const v = mask[i] ? 255 : 0;
    const o = i * 4;
    out.data[o] = v;
    out.data[o + 1] = v;
    out.data[o + 2] = v;
    out.data[o + 3] = 255;
  }
  mctx.putImageData(out, 0, 0);
  return {
    maskCanvas,
    coverage: total ? covered / total : 0,
    faceCoverage,
    torsoCoverage,
  };
}

interface WhiteBackgroundResult {
  coverage: number;
  applied: boolean;
  warning?: string;
}

function applyWhiteBackground(canvas: HTMLCanvasElement, tolerance: number): WhiteBackgroundResult {
  const { maskCanvas, coverage, faceCoverage, torsoCoverage } = buildBackgroundMask(canvas, tolerance);
  const decision = assessIdentityBackgroundMask(coverage, faceCoverage, torsoCoverage);
  if (decision !== 'apply') {
    return {
      coverage,
      applied: false,
      warning: decision === 'empty'
        ? 'Aucun fond assez distinct n’a été détecté. La photo originale est conservée.'
        : 'Le détourage risque de recouvrir le visage ou les vêtements. La photo originale est conservée : diminuez la tolérance ou reprenez la photo devant un fond uni et contrasté.',
    };
  }
  const width = canvas.width;
  const height = canvas.height;
  const [, mbctx] = makeCanvas(width, height);
  mbctx.imageSmoothingEnabled = true;
  mbctx.imageSmoothingQuality = 'high';
  mbctx.drawImage(maskCanvas, 0, 0, width, height);
  const maskData = mbctx.getImageData(0, 0, width, height).data;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Traitement d’image indisponible sur cet appareil.');
  const image = ctx.getImageData(0, 0, width, height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = maskData[i] / 255;
    if (a <= 0.001) continue;
    px[i] = px[i] * (1 - a) + 255 * a;
    px[i + 1] = px[i + 1] * (1 - a) + 255 * a;
    px[i + 2] = px[i + 2] * (1 - a) + 255 * a;
    px[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { coverage, applied: true };
}

/**
 * Recadre n’importe quelle photo au format d’identité 4:5 et applique,
 * si demandé, le fond blanc connecté aux bords.
 */
export async function processIdentityPhoto(
  source: string,
  options: IdentityPhotoOptions = {},
): Promise<IdentityPhotoResult> {
  const img = await loadImage(source);
  const rotation = ((options.rotation || 0) % 360 + 360) % 360;
  const swap = rotation === 90 || rotation === 270;
  const srcW = swap ? img.height : img.width;
  const srcH = swap ? img.width : img.height;
  if (!srcW || !srcH) throw new Error('Image illisible.');

  const ratio = IDENTITY_PHOTO_WIDTH / IDENTITY_PHOTO_HEIGHT;
  let cropW = srcW;
  let cropH = cropW / ratio;
  if (cropH > srcH) {
    cropH = srcH;
    cropW = cropH * ratio;
  }
  const zoom = clamp(options.zoom ?? 1, 1, 3);
  cropW /= zoom;
  cropH /= zoom;

  const centerX = clamp(options.centerX ?? 0.5, 0, 1) * srcW;
  const centerY = clamp(options.centerY ?? 0.42, 0, 1) * srcH;
  const sx = clamp(centerX - cropW / 2, 0, srcW - cropW);
  const sy = clamp(centerY - cropH / 2, 0, srcH - cropH);

  const [canvas, ctx] = makeCanvas(IDENTITY_PHOTO_WIDTH, IDENTITY_PHOTO_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (rotation === 0) {
    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
  } else {
    // Tourner d’abord l’image entière dans un canevas temporaire, puis cadrer.
    const [rotated, rctx] = makeCanvas(srcW, srcH);
    rctx.translate(srcW / 2, srcH / 2);
    rctx.rotate((rotation * Math.PI) / 180);
    rctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
    ctx.drawImage(rotated, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
  }

  const backgroundResult = options.whiteBackground
    ? applyWhiteBackground(canvas, options.tolerance ?? 40)
    : { coverage: 0, applied: false };

  const qualityLabel: IdentityPhotoResult['qualityLabel'] =
    cropW >= 900 && cropH >= 1125 ? 'Excellente'
      : cropW >= 600 && cropH >= 750 ? 'Bonne'
        : cropW >= 380 && cropH >= 475 ? 'Moyenne' : 'Faible';

  return {
    dataUrl: canvas.toDataURL('image/jpeg', clamp(options.quality ?? 0.94, 0.5, 1)),
    width: IDENTITY_PHOTO_WIDTH,
    height: IDENTITY_PHOTO_HEIGHT,
    sourceCropWidth: Math.round(cropW),
    sourceCropHeight: Math.round(cropH),
    backgroundCoverage: backgroundResult.coverage,
    backgroundApplied: backgroundResult.applied,
    backgroundWarning: backgroundResult.warning,
    qualityLabel,
  };
}

/** Capture l’image courante d’un flux vidéo, à sa résolution native. */
export function captureVideoFrame(video: HTMLVideoElement): string {
  if (!video.videoWidth || !video.videoHeight) throw new Error('La caméra n’est pas encore prête.');
  const [canvas, ctx] = makeCanvas(video.videoWidth, video.videoHeight);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.96);
}
