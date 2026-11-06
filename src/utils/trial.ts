/**
 * VERSION D'ESSAI GRATUITE — 20 HEURES (v55).
 *
 * ── OBJECTIF ─────────────────────────────────────────────────────────
 * Permettre à un prospect d'utiliser l'application **sans aucun code**
 * pendant 6 heures, afin qu'il en prenne goût avant de s'abonner.
 * Passé ce délai, l'accès se ferme et l'écran d'abonnement reprend la
 * main.
 *
 * ── POURQUOI 10 HEURES DE TEMPS RÉEL, ET NON 10 HEURES D'USAGE ──────
 * Le décompte part du **premier lancement** et court en continu, même
 * application fermée. C'est le comportement attendu d'une « offre de
 * 6 heures » : mesurer le temps réellement passé dans l'application
 * supposerait de suivre chaque session, ce qui serait à la fois plus
 * lourd et plus facile à contourner.
 *
 * ── CE QUE L'ESSAI OUVRE ─────────────────────────────────────────────
 * Le périmètre du plan **COMPLET** (1500 F/an). Les 4 modules de gestion
 * réservés au plan PRO restent fermés : l'essai doit donner envie, pas
 * tout offrir. Le prospect voit d'ailleurs l'écran de mise à niveau, ce
 * qui fait connaître la formule Pro.
 *
 * ── RÉSISTANCE À LA TRICHE ───────────────────────────────────────────
 * L'application est 100 % locale : aucun serveur ne peut arbitrer. Un
 * utilisateur déterminé pourra toujours vider le stockage de son
 * navigateur pour relancer un essai. Ce module applique donc des
 * garde-fous raisonnables, sans prétendre à l'inviolable :
 *   1. l'empreinte de fin est écrite en DEUX endroits (localStorage et
 *      sessionStorage miroir) ;
 *   2. un essai déjà terminé est mémorisé par un marqueur distinct, qui
 *      survit à la suppression de la seule clé d'essai ;
 *   3. tout recul de l'horloge est détecté : reculer la date du
 *      téléphone ne prolonge pas l'essai, cela le termine.
 */

export const TRIAL_KEY = 'msp_trial';
/** Marqueur indépendant : « un essai a déjà été consommé sur cet appareil ». */
export const TRIAL_USED_KEY = 'msp_trial_used';

/** Durée de l'essai : 6 heures, en millisecondes. */
export const TRIAL_HOURS = 6;
export const TRIAL_DURATION_MS = TRIAL_HOURS * 3_600_000;

export interface TrialState {
  startedAt: number;
  expiresAt: number;
  /** Nom saisi par le prospect (facultatif, pour personnaliser l'accueil). */
  name?: string;
  /** Dernier instant observé : sert à détecter un recul de l'horloge. */
  lastSeenAt?: number;
  /** Essai clos définitivement (expiré ou triche détectée). */
  ended?: boolean;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    const s = JSON.stringify(value);
    localStorage.setItem(key, s);
    // Miroir : rend la falsification un peu moins immédiate.
    try { sessionStorage.setItem(key, s); } catch { /* quota */ }
  } catch { /* quota */ }
}

/** Un essai a-t-il déjà été consommé sur cet appareil ? */
export function trialAlreadyUsed(): boolean {
  try {
    if (localStorage.getItem(TRIAL_USED_KEY) === '1') return true;
  } catch { /* ignore */ }
  return false;
}

function markTrialUsed(): void {
  try { localStorage.setItem(TRIAL_USED_KEY, '1'); } catch { /* quota */ }
}

export function getTrial(): TrialState | null {
  return read<TrialState>(TRIAL_KEY);
}

/**
 * Démarre l'essai s'il n'a jamais été lancé.
 * Renvoie l'état courant ; ne redémarre JAMAIS un essai déjà consommé.
 */
export function startTrial(name?: string, now: number = Date.now()): TrialState | null {
  const existing = getTrial();
  if (existing) {
    /*
     * ⚠️ Ne PAS renvoyer un essai deja termine comme s'il etait valide :
     * l'appelant croirait l'acces ouvert. Un essai clos, ou dont la duree
     * est ecoulee, renvoie `null` — seul un essai encore valable est rendu.
     */
    const fini = existing.ended === true || now >= existing.expiresAt;
    return fini ? null : existing;
  }
  if (trialAlreadyUsed()) return null;

  const state: TrialState = {
    startedAt: now,
    expiresAt: now + TRIAL_DURATION_MS,
    name: (name || '').trim() || undefined,
    lastSeenAt: now,
  };
  write(TRIAL_KEY, state);
  markTrialUsed();
  return state;
}

export interface TrialStatus {
  /** Un essai existe-t-il sur cet appareil ? */
  exists: boolean;
  /** L'essai est-il en cours (donc l'accès est ouvert) ? */
  active: boolean;
  /** L'essai est-il terminé ? */
  expired: boolean;
  /** Millisecondes restantes (0 si terminé). */
  remainingMs: number;
  /** Heures entières restantes. */
  hours: number;
  /** Minutes restantes, après les heures. */
  minutes: number;
  /** Part consommée, de 0 à 100. */
  percentUsed: number;
  name?: string;
}

const EMPTY: TrialStatus = {
  exists: false, active: false, expired: false,
  remainingMs: 0, hours: 0, minutes: 0, percentUsed: 0,
};

/**
 * État de l'essai à l'instant présent.
 *
 * ⚠️ DÉTECTION DU RECUL DE L'HORLOGE : si la date du système est
 * antérieure au dernier instant observé, on considère l'essai comme
 * terminé. Sans cette règle, il suffirait de reculer la date du
 * téléphone pour prolonger indéfiniment la période gratuite.
 */
export function trialStatus(now: number = Date.now()): TrialStatus {
  const t = getTrial();
  if (!t) return EMPTY;

  // Recul de l'horloge : on tolère 5 minutes (synchronisation réseau).
  const TOLERANCE = 5 * 60_000;
  const wentBackwards = typeof t.lastSeenAt === 'number' && now < t.lastSeenAt - TOLERANCE;

  if (wentBackwards && !t.ended) {
    write(TRIAL_KEY, { ...t, ended: true });
    markTrialUsed();
    return { ...EMPTY, exists: true, expired: true, name: t.name };
  }

  // Mémorise l'instant le plus avancé observé.
  if (!t.ended && (typeof t.lastSeenAt !== 'number' || now > t.lastSeenAt)) {
    write(TRIAL_KEY, { ...t, lastSeenAt: now });
  }

  const remaining = Math.max(0, t.expiresAt - now);
  const expired = !!t.ended || remaining <= 0;

  if (expired && !t.ended) {
    write(TRIAL_KEY, { ...t, ended: true });
    markTrialUsed();
  }

  const used = Math.min(100, Math.max(0,
    Math.round(((TRIAL_DURATION_MS - remaining) / TRIAL_DURATION_MS) * 100)));

  return {
    exists: true,
    active: !expired,
    expired,
    remainingMs: expired ? 0 : remaining,
    hours: Math.floor(remaining / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    percentUsed: expired ? 100 : used,
    name: t.name,
  };
}

/** Vrai si l'essai ouvre l'accès à l'application en ce moment. */
export function trialGrantsAccess(now: number = Date.now()): boolean {
  return trialStatus(now).active;
}

/**
 * Libellé court du temps restant : « 19 h 42 » ou « 45 min ».
 * Les heures disparaissent sous 1 h pour créer un sentiment d'urgence
 * utile, sans jamais afficher un décompte trompeur.
 */
export function formatRemaining(status: TrialStatus): string {
  if (!status.active) return 'Essai terminé';
  if (status.hours > 0) return `${status.hours} h ${String(status.minutes).padStart(2, '0')}`;
  return `${status.minutes} min`;
}

/**
 * Efface l'essai. Réservé à l'administration (démonstration, appareil de
 * test). Le marqueur « déjà utilisé » est levé lui aussi : c'est un geste
 * volontaire d'un Super Administrateur, pas une action du prospect.
 */
export function resetTrial(): void {
  try {
    localStorage.removeItem(TRIAL_KEY);
    localStorage.removeItem(TRIAL_USED_KEY);
    sessionStorage.removeItem(TRIAL_KEY);
  } catch { /* ignore */ }
}
