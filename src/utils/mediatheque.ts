/**
 * MÉDIATHÈQUE — FILMS ÉDUCATIFS (v61).
 *
 * Le module « Biblio - Médiathèque » réunit désormais :
 *   - les livres (voir library.ts) ;
 *   - des FILMS ÉDUCATIFS ajoutés à partir de liens YouTube.
 *
 * Les films sont ajoutés par l'équipe d'administration et consultables
 * gratuitement par les enseignants. On ne stocke que le lien : la lecture se
 * fait via le lecteur YouTube intégré (nécessite une connexion).
 */

export interface EduFilm {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  /** Lien YouTube collé par l'administrateur. */
  youtubeUrl: string;
  createdAt: number;
}

export const FILMS_KEY = 'msp_mediatheque_films';

export const FILM_CATEGORIES = [
  'Documentaire',
  'Sciences',
  'Histoire - Géographie',
  'Langue & Littérature',
  'Civisme & Vie',
  'Mathématiques',
  'Arts & Culture',
  'Autre',
];

export function loadFilms(): EduFilm[] {
  try {
    const raw = localStorage.getItem(FILMS_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveFilms(films: EduFilm[]): void {
  try { localStorage.setItem(FILMS_KEY, JSON.stringify(films)); } catch { /* quota */ }
}

export function addFilm(film: Omit<EduFilm, 'id' | 'createdAt'>): EduFilm {
  const f: EduFilm = {
    ...film,
    id: `film-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  saveFilms([f, ...loadFilms()]);
  return f;
}

export function removeFilm(id: string): void {
  saveFilms(loadFilms().filter((f) => f.id !== id));
}

export function filterFilms(query: string, category: string, films = loadFilms()): EduFilm[] {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return films.filter((f) => {
    if (category && category !== 'Toutes' && f.category !== category) return false;
    if (!q) return true;
    const hay = `${f.title} ${f.description} ${f.level} ${f.category}`
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return hay.includes(q);
  });
}

/** Extrait l'identifiant d'une vidéo YouTube depuis (presque) toutes les formes de lien. */
export function youTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (m) return m[1];
  // lien du type ...watch?...&v=ID
  const alt = url.match(/[?&]v=([\w-]{11})/);
  return alt ? alt[1] : null;
}

export function isValidYouTube(url: string): boolean {
  return youTubeId(url) !== null;
}

export function youTubeEmbed(url: string): string {
  const id = youTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : '';
}

export function youTubeThumb(url: string): string {
  const id = youTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}
