/**
 * CONCOURS HEBDOMADAIRE DU QUIZ (v39).
 *
 * Le quiz devient un CONCOURS : l'élève doit d'abord cliquer « Je participe »
 * pendant une fenêtre d'inscription précise, puis concourt la semaine suivante.
 *
 * FENÊTRE D'INSCRIPTION (exigence de l'utilisateur) :
 *   du SAMEDI 18h00 au DIMANCHE 21h00.
 * L'inscription enregistrée vaut pour la SEMAINE SUIVANTE (lundi → dimanche).
 *
 * ── AVERTISSEMENT IMPORTANT SUR LE NOMBRE DE PARTICIPANTS ──
 * L'application fonctionne 100 % hors ligne : un téléphone ne peut PAS savoir
 * tout seul combien d'élèves se sont inscrits ailleurs. Nous n'inventons donc
 * aucun chiffre. Deux nombres cohabitent, toujours distingués à l'écran :
 *
 *   1. `localCount()`   — les inscrits CONNUS de cet appareil (l'élève lui-même
 *                         + les inscriptions importées par l'enseignant).
 *   2. `officialCount()`— le TOTAL OFFICIEL publié par le Super Administrateur,
 *                         qui centralise les inscriptions reçues puis le diffuse.
 *
 * Tant que l'administrateur n'a rien publié, l'écran affiche franchement
 * « en attente de publication » plutôt qu'un nombre trompeur.
 */

export const CONTEST_KEY = 'msp_quiz_contest';
export const CONTEST_OFFICIAL_KEY = 'msp_quiz_contest_official';

export interface ContestEntry {
  /** Semaine de concours visée, ex. « 2026-S39 ». */
  week: string;
  name: string;
  /** Identifiant de l'appareil, pour éviter les doublons à l'import. */
  deviceId: string;
  classe?: string;
  at: number;
}

export interface OfficialCount {
  week: string;
  count: number;
  /** Date de publication par le Super Administrateur. */
  publishedAt: number;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Calendrier des semaines                                             */
/* ------------------------------------------------------------------ */

/** Identifiant ISO de la semaine d'une date, ex. « 2026-S39 ». */
export function weekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Jeudi de la semaine courante → détermine l'année ISO.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const no = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(no).padStart(2, '0')}`;
}

/** Semaine qui suit celle de `date` : c'est la semaine du concours. */
export function nextWeekId(date = new Date()): string {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + 7);
  return weekId(d);
}

/* ------------------------------------------------------------------ */
/* Fenêtre d'inscription : samedi 18h00 → dimanche 21h00               */
/* ------------------------------------------------------------------ */

export const WINDOW_OPEN_DAY = 6;      // samedi
export const WINDOW_OPEN_HOUR = 18;    // 18h00
export const WINDOW_CLOSE_DAY = 0;     // dimanche
export const WINDOW_CLOSE_HOUR = 21;   // 21h00

/** Les inscriptions sont-elles ouvertes à cet instant ? */
export function isRegistrationOpen(date = new Date()): boolean {
  const day = date.getDay();
  const h = date.getHours();
  if (day === WINDOW_OPEN_DAY) return h >= WINDOW_OPEN_HOUR;   // samedi dès 18h
  if (day === WINDOW_CLOSE_DAY) return h < WINDOW_CLOSE_HOUR;  // dimanche avant 21h
  return false;
}

/** Début (samedi 18h) de la fenêtre courante ou à venir. */
export function windowOpensAt(date = new Date()): Date {
  const d = new Date(date.getTime());
  d.setHours(WINDOW_OPEN_HOUR, 0, 0, 0);
  // Recule/avance jusqu'au prochain samedi (ou celui du jour même si 18h non atteint).
  const delta = (WINDOW_OPEN_DAY - d.getDay() + 7) % 7;
  if (delta === 0 && date.getHours() >= WINDOW_OPEN_HOUR) {
    // La fenêtre du jour est déjà ouverte.
    return d;
  }
  if (delta === 0 && date.getDay() === 0) {
    // Dimanche : la fenêtre a commencé la veille.
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (date.getDay() === WINDOW_CLOSE_DAY && isRegistrationOpen(date)) {
    d.setDate(d.getDate() - 1);
    return d;
  }
  d.setDate(d.getDate() + delta);
  return d;
}

/** Fin (dimanche 21h) de la fenêtre courante ou à venir. */
export function windowClosesAt(date = new Date()): Date {
  const open = windowOpensAt(date);
  const d = new Date(open.getTime());
  d.setDate(d.getDate() + 1);           // dimanche
  d.setHours(WINDOW_CLOSE_HOUR, 0, 0, 0);
  return d;
}

/** Message clair sur l'état des inscriptions. */
export function registrationStatusMessage(date = new Date()): string {
  if (isRegistrationOpen(date)) {
    const close = windowClosesAt(date);
    const reste = Math.max(0, Math.round((close.getTime() - date.getTime()) / 3600000));
    return `Inscriptions OUVERTES — il reste environ ${reste} h pour cliquer « Je participe ».`;
  }
  const open = windowOpensAt(date);
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return `Inscriptions fermées. Prochaine ouverture ${jours[open.getDay()]} à 18h00 (jusqu'au dimanche 21h00).`;
}

/* ------------------------------------------------------------------ */
/* Inscriptions                                                        */
/* ------------------------------------------------------------------ */

export function loadEntries(): ContestEntry[] {
  try {
    const raw = localStorage.getItem(CONTEST_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveEntries(list: ContestEntry[]): void {
  try { localStorage.setItem(CONTEST_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/** Cet appareil est-il déjà inscrit pour la semaine visée ? */
export function isRegistered(deviceId: string, week: string, list = loadEntries()): boolean {
  return list.some((e) => e.deviceId === deviceId && e.week === week);
}

export interface RegisterResult {
  ok: boolean;
  message: string;
  entry?: ContestEntry;
}

/**
 * « Je participe » : inscrit l'élève au concours de la SEMAINE SUIVANTE.
 * Refuse hors de la fenêtre samedi 18h → dimanche 21h.
 */
export function register(
  name: string,
  deviceId: string,
  classe = '',
  date = new Date(),
): RegisterResult {
  const nom = (name || '').trim();
  if (!nom) return { ok: false, message: 'Indique ton nom pour participer.' };
  if (!isRegistrationOpen(date)) {
    return { ok: false, message: registrationStatusMessage(date) };
  }
  const week = nextWeekId(date);
  const list = loadEntries();
  if (isRegistered(deviceId, week, list)) {
    return { ok: false, message: `Tu es déjà inscrit pour la semaine ${week}.` };
  }
  const entry: ContestEntry = { week, name: nom, deviceId, classe, at: date.getTime() };
  saveEntries([entry, ...list]);
  return { ok: true, message: `Inscription enregistrée pour la semaine ${week}. Bonne chance !`, entry };
}

/** Nombre d'inscrits CONNUS de cet appareil pour une semaine. */
export function localCount(week: string, list = loadEntries()): number {
  const vus = new Set(list.filter((e) => e.week === week).map((e) => e.deviceId));
  return vus.size;
}

/** Inscrits de la semaine (pour l'affichage et l'export vers l'administrateur). */
export function entriesForWeek(week: string, list = loadEntries()): ContestEntry[] {
  return list.filter((e) => e.week === week).sort((a, b) => a.at - b.at);
}

/**
 * Fusionne des inscriptions reçues (fichier transmis par l'enseignant ou
 * l'administrateur) sans créer de doublon.
 */
export function mergeEntries(incoming: ContestEntry[]): number {
  const list = loadEntries();
  const cle = (e: ContestEntry) => `${e.week}::${e.deviceId}`;
  const vus = new Set(list.map(cle));
  let ajoutes = 0;
  for (const e of incoming) {
    if (!e || !e.week || !e.deviceId || vus.has(cle(e))) continue;
    vus.add(cle(e));
    list.push(e);
    ajoutes++;
  }
  if (ajoutes) saveEntries(list);
  return ajoutes;
}

/* ------------------------------------------------------------------ */
/* Total officiel publié par le Super Administrateur                   */
/* ------------------------------------------------------------------ */

export function loadOfficial(): OfficialCount[] {
  try {
    const raw = localStorage.getItem(CONTEST_OFFICIAL_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** Publie (Super Admin) le nombre officiel de participants d'une semaine. */
export function publishOfficialCount(week: string, count: number, note = ''): OfficialCount {
  const rec: OfficialCount = { week, count: Math.max(0, Math.round(count)), publishedAt: Date.now(), note };
  const rest = loadOfficial().filter((o) => o.week !== week);
  try { localStorage.setItem(CONTEST_OFFICIAL_KEY, JSON.stringify([rec, ...rest])); } catch { /* quota */ }
  return rec;
}

/** Total officiel d'une semaine, ou `null` si rien n'a encore été publié. */
export function officialCount(week: string): OfficialCount | null {
  return loadOfficial().find((o) => o.week === week) || null;
}

/**
 * Texte affiché à l'élève. Ne ment jamais : si l'administrateur n'a pas encore
 * publié le total, on annonce le nombre connu localement en le qualifiant.
 */
export function participantsLabel(week: string): string {
  const off = officialCount(week);
  if (off) {
    return `${off.count} participant${off.count > 1 ? 's' : ''} inscrit${off.count > 1 ? 's' : ''} (total officiel publié par l'administrateur).`;
  }
  const n = localCount(week);
  if (n === 0) return 'Aucune inscription connue sur cet appareil. Le total officiel sera publié par l’administrateur.';
  return `${n} inscription${n > 1 ? 's' : ''} connue${n > 1 ? 's' : ''} sur cet appareil. Le total officiel sera publié par l’administrateur.`;
}
