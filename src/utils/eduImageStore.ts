/**
 * STOCKAGE DES IMAGES ÉDUCATIVES (v41).
 *
 * Les images générées par l'enseignant sont conservées localement pour
 * qu'il les retrouve après avoir fermé l'application. Elles sont légères
 * (SVG, quelques kilo-octets) : la limite du navigateur n'est pas atteinte
 * avant plusieurs centaines d'images. On plafonne tout de même la liste
 * pour ne jamais saturer le stockage d'un téléphone modeste.
 */
import { GeneratedImage } from './eduImageEngine';

export const GENERATED_KEY = 'msp_generated_images';

/** Au-delà, les plus anciennes sont écartées. */
export const MAX_GENERATED = 40;

export function loadGenerated(): GeneratedImage[] {
  try {
    const raw = localStorage.getItem(GENERATED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export function saveGenerated(img: GeneratedImage): void {
  try {
    const all = [img, ...loadGenerated().filter((i) => i.id !== img.id)].slice(0, MAX_GENERATED);
    localStorage.setItem(GENERATED_KEY, JSON.stringify(all));
  } catch {
    /* quota dépassé : l'image reste affichée à l'écran, simplement non conservée */
  }
}

export function deleteGenerated(id: string): void {
  try {
    localStorage.setItem(GENERATED_KEY, JSON.stringify(loadGenerated().filter((i) => i.id !== id)));
  } catch { /* ignore */ }
}

export function clearGenerated(): void {
  try { localStorage.removeItem(GENERATED_KEY); } catch { /* ignore */ }
}
