/**
 * PRÉFÉRENCES DE L'APPLICATION (v38) — mode nuit, horloge, alarmes.
 *
 * Le mode nuit protège les yeux de l'enseignant qui prépare ses cours le soir :
 * il applique la classe `dark` de Tailwind et une teinte chaude optionnelle
 * (filtre lumière bleue).
 */

export type ThemeMode = 'clair' | 'nuit' | 'auto';

export interface AppPreferences {
  theme: ThemeMode;
  /** Filtre lumière bleue (teinte chaude), 0 = désactivé, 1 à 3 = intensité. */
  warmth: number;
  /** Affichage de l'horloge dans l'application. */
  showClock: boolean;
  /** Heure de bascule automatique en mode nuit (mode 'auto'). */
  nightFrom: string;
  nightTo: string;
}

export const PREFS_KEY = 'msp_app_preferences';

const DEFAULTS: AppPreferences = {
  theme: 'clair',
  warmth: 0,
  showClock: true,
  nightFrom: '19:00',
  nightTo: '06:30',
};

export function getPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      theme: ['clair', 'nuit', 'auto'].includes(p?.theme) ? p.theme : DEFAULTS.theme,
      warmth: Math.max(0, Math.min(3, Number(p?.warmth) || 0)),
      showClock: p?.showClock !== false,
      nightFrom: typeof p?.nightFrom === 'string' ? p.nightFrom : DEFAULTS.nightFrom,
      nightTo: typeof p?.nightTo === 'string' ? p.nightTo : DEFAULTS.nightTo,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const merged = { ...getPreferences(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(merged)); } catch { /* quota */ }
  applyTheme(merged);
  return merged;
}

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

/** Le mode nuit doit-il être actif maintenant ? */
export function isNightActive(prefs = getPreferences(), now = new Date()): boolean {
  if (prefs.theme === 'nuit') return true;
  if (prefs.theme === 'clair') return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = toMinutes(prefs.nightFrom);
  const to = toMinutes(prefs.nightTo);
  // Plage qui franchit minuit (ex. 19:00 → 06:30)
  return from > to ? cur >= from || cur < to : cur >= from && cur < to;
}

/** Applique le thème au document (classe `dark` + filtre chaud). */
export function applyTheme(prefs = getPreferences(), now = new Date()): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const night = isNightActive(prefs, now);
  root.classList.toggle('dark', night);
  root.setAttribute('data-msp-warmth', String(prefs.warmth || 0));
}

/* ------------------------------------------------------------------ */
/* Alarmes                                                             */
/* ------------------------------------------------------------------ */

export interface Alarm {
  id: string;
  label: string;
  /** Heure au format HH:MM. */
  time: string;
  /** Jours actifs : 0 = dimanche … 6 = samedi. */
  days: number[];
  enabled: boolean;
  /** Dernière sonnerie (horodatage), pour ne pas sonner deux fois. */
  lastRang?: number;
}

export const ALARMS_KEY = 'msp_alarms';

export function loadAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms: Alarm[]): void {
  try { localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); } catch { /* quota */ }
}

export function addAlarm(label: string, time: string, days: number[]): Alarm {
  const alarm: Alarm = {
    id: `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: label || 'Alarme',
    time,
    days: days.length ? days : [1, 2, 3, 4, 5],
    enabled: true,
  };
  saveAlarms([...loadAlarms(), alarm]);
  return alarm;
}

export function removeAlarm(id: string): void {
  saveAlarms(loadAlarms().filter((a) => a.id !== id));
}

export function toggleAlarm(id: string): void {
  saveAlarms(loadAlarms().map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
}

/** Alarmes devant sonner à l'instant présent (à la minute près). */
export function dueAlarms(now = new Date(), alarms = loadAlarms()): Alarm[] {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const cur = `${hh}:${mm}`;
  const day = now.getDay();
  const minuteStamp = Math.floor(now.getTime() / 60000);
  return alarms.filter(
    (a) => a.enabled
      && a.time === cur
      && a.days.includes(day)
      && Math.floor((a.lastRang || 0) / 60000) !== minuteStamp,
  );
}

export function markAlarmRang(id: string, now = new Date()): void {
  saveAlarms(loadAlarms().map((a) => (a.id === id ? { ...a, lastRang: now.getTime() } : a)));
}

export const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Description lisible des jours d'une alarme. */
export function describeDays(days: number[]): string {
  const s = [...days].sort((a, b) => a - b);
  if (s.length === 7) return 'Tous les jours';
  if (s.join(',') === '1,2,3,4,5') return 'Du lundi au vendredi';
  if (s.join(',') === '0,6') return 'Week-end';
  return s.map((d) => DAY_LABELS[d]).join(', ') || 'Jamais';
}

/** Émet une sonnerie courte sans fichier audio (Web Audio API). */
export function playAlarmSound(): void {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.32);
    });
    window.setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1500);
  } catch { /* audio indisponible */ }
}

/* ------------------------------------------------------------------ */
/* Horloge                                                             */
/* ------------------------------------------------------------------ */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatClock(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatClockSeconds(now = new Date()): string {
  return `${formatClock(now)}:${String(now.getSeconds()).padStart(2, '0')}`;
}

export function formatLongDate(now = new Date()): string {
  return `${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]} ${now.getFullYear()}`;
}
