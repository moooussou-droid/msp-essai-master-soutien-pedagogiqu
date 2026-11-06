export interface CourseLesson {
  title: string;
  content: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface CourseOffer {
  id: string;
  title: string;
  author: string;
  level: string;
  description: string;
  price: string;
  type: 'gratuit' | 'payant';
  link: string;
  lessons: CourseLesson[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  /** Horodatage de la dernière modification (v34). */
  updatedAt?: number;
  /**
   * Fichier PDF joint (v38), téléchargeable UNIQUEMENT après déverrouillage
   * pour un cours payant. Donnée en base64 (data:) ou lien externe.
   */
  pdfUrl?: string;
}

export const COURSE_KEY = 'msp_marketplace_courses';

export function loadCourses(): CourseOffer[] {
  try {
    return JSON.parse(localStorage.getItem(COURSE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCourses(courses: CourseOffer[]) {
  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
}

/**
 * MODIFICATION DES COURS DU PROGRAMME INTÉGRÉ (corrigé v34).
 *
 * Les cours du programme d'études sont générés par le code (getProgrammeCourses)
 * et ne peuvent pas être réécrits sur place. Avant la v34, enregistrer une
 * modification créait une COPIE avec un nouvel identifiant : l'ancienne version
 * restait affichée et « les anciennes données revenaient ».
 *
 * Désormais, la modification est stockée comme une SURCHARGE (override) portant
 * l'identifiant d'origine, et `mergeCourses` fait primer cette surcharge sur le
 * cours intégré. Chaque modification est donc immédiatement effective et durable.
 */
export const COURSE_OVERRIDE_KEY = 'msp_course_overrides';

export function loadCourseOverrides(): Record<string, CourseOffer> {
  try {
    const raw = localStorage.getItem(COURSE_OVERRIDE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCourseOverride(course: CourseOffer) {
  const all = loadCourseOverrides();
  all[course.id] = { ...course, updatedAt: Date.now() } as CourseOffer;
  localStorage.setItem(COURSE_OVERRIDE_KEY, JSON.stringify(all));
}

export function removeCourseOverride(id: string) {
  const all = loadCourseOverrides();
  delete all[id];
  localStorage.setItem(COURSE_OVERRIDE_KEY, JSON.stringify(all));
}

/** Cours intégrés dont la version modifiée doit remplacer l'originale. */
export function applyCourseOverrides(builtIn: CourseOffer[]): CourseOffer[] {
  const overrides = loadCourseOverrides();
  return builtIn.map(course => overrides[course.id] ? { ...course, ...overrides[course.id] } : course);
}

/**
 * Liste finale affichée : cours du programme (avec modifications appliquées)
 * + cours personnalisés, les doublons d'identifiant étant résolus au profit
 * de la version la plus récemment enregistrée.
 */
export function mergeCourses(builtIn: CourseOffer[], custom: CourseOffer[]): CourseOffer[] {
  const merged = applyCourseOverrides(builtIn);
  const byId = new Map(merged.map(c => [c.id, c] as const));
  for (const c of custom) byId.set(c.id, c);
  return [...byId.values()];
}

export function getVideoEmbed(url: string) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1&playsinline=1`;

  // Facebook : plugin vidéo intégré
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=720`;
  }

  // TikTok : oEmbed / embed direct simple. Certains liens peuvent être bloqués par TikTok.
  const tikTokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tikTokMatch) return `https://www.tiktok.com/embed/v2/${tikTokMatch[1]}`;

  return '';
}

export const getYouTubeEmbed = getVideoEmbed;
