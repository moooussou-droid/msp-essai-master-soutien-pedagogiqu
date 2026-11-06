/**
 * MESSAGES DÉFILANTS (v39) — « bandes filantes ».
 *
 * Permet de faire passer des messages importants dans un bandeau qui défile
 * en haut de l'application (examens, réunions, dates de rentrée, alertes).
 * Les messages sont créés par le Super Administrateur depuis l'espace
 * d'administration et s'affichent chez tous les utilisateurs de l'appareil.
 *
 * Chaque message possède une priorité (couleur), une période de validité
 * facultative et peut être désactivé sans être supprimé.
 */

export type AnnouncementLevel = 'info' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  text: string;
  level: AnnouncementLevel;
  /** Timestamps ; 0 = pas de limite. */
  startAt: number;
  endAt: number;
  enabled: boolean;
  createdAt: number;
}

export const ANNOUNCEMENTS_KEY = 'msp_announcements';

export const LEVEL_LABELS: Record<AnnouncementLevel, string> = {
  info: 'Information',
  important: 'Important',
  urgent: 'Urgent',
};

/** Couleurs du bandeau selon la priorité. */
export const LEVEL_STYLES: Record<AnnouncementLevel, string> = {
  info: 'bg-emerald-600 text-white',
  important: 'bg-amber-500 text-white',
  urgent: 'bg-red-600 text-white',
};

export function loadAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveAnnouncements(list: Announcement[]): void {
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

export function addAnnouncement(
  text: string,
  level: AnnouncementLevel = 'info',
  startAt = 0,
  endAt = 0,
): Announcement {
  const a: Announcement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: (text || '').trim(),
    level,
    startAt,
    endAt,
    enabled: true,
    createdAt: Date.now(),
  };
  saveAnnouncements([a, ...loadAnnouncements()]);
  return a;
}

export function updateAnnouncement(id: string, patch: Partial<Announcement>): void {
  saveAnnouncements(loadAnnouncements().map((a) => (a.id === id ? { ...a, ...patch, id: a.id } : a)));
}

export function removeAnnouncement(id: string): void {
  saveAnnouncements(loadAnnouncements().filter((a) => a.id !== id));
}

export function toggleAnnouncement(id: string): void {
  saveAnnouncements(loadAnnouncements().map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
}

/** Un message est-il diffusable à cet instant ? */
export function isActive(a: Announcement, now = Date.now()): boolean {
  if (!a.enabled || !a.text.trim()) return false;
  if (a.startAt && now < a.startAt) return false;
  if (a.endAt && now > a.endAt) return false;
  return true;
}

/** Messages à faire défiler, les plus urgents en tête. */
export function activeAnnouncements(now = Date.now(), list = loadAnnouncements()): Announcement[] {
  const poids: Record<AnnouncementLevel, number> = { urgent: 0, important: 1, info: 2 };
  return list.filter((a) => isActive(a, now)).sort((a, b) => poids[a.level] - poids[b.level] || b.createdAt - a.createdAt);
}

/** Durée de défilement proportionnelle à la longueur (lisibilité). */
export function scrollDuration(text: string): number {
  return Math.max(12, Math.min(60, Math.round((text || '').length / 4)));
}
