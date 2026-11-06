/**
 * EMPLOI DU TEMPS DES PRÉSENCES (v36).
 *
 * Règles demandées :
 *  - Du LUNDI au VENDREDI, la journée de classe est divisée en DEUX
 *    demi-journées : le MATIN et l'APRÈS-MIDI. L'appel se fait pour chacune.
 *  - Le MERCREDI ne comporte qu'UNE seule demi-journée (le matin).
 *  - Pas de classe le SAMEDI ni le DIMANCHE.
 *
 * Statuts disponibles pour chaque demi-journée :
 *  - Présent
 *  - Absence avec justification
 *  - Absence sans justification
 *  - Journée fériée          (aucune classe : la demi-journée n'est pas comptée)
 *  - Demi-journée de séance  (séance exceptionnelle tenue sur cette demi-journée)
 */

export type HalfDay = 'matin' | 'apresmidi';

export type AttendanceStatus =
  | 'present'
  | 'absent_justifiee'
  | 'absent_injustifiee'
  | 'ferie'
  | 'demi_journee_seance';

export const HALF_LABELS: Record<HalfDay, string> = {
  matin: 'Matin',
  apresmidi: 'Après-midi',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent_justifiee: 'Absence avec justification',
  absent_injustifiee: 'Absence sans justification',
  ferie: 'Journée fériée',
  demi_journee_seance: 'Demi-journée de séance',
};

/** Libellés courts pour les tableaux et les exports. */
export const STATUS_SHORT: Record<AttendanceStatus, string> = {
  present: 'P',
  absent_justifiee: 'AJ',
  absent_injustifiee: 'AI',
  ferie: 'F',
  demi_journee_seance: 'DS',
};

export const STATUS_ORDER: AttendanceStatus[] = [
  'present',
  'absent_justifiee',
  'absent_injustifiee',
  'ferie',
  'demi_journee_seance',
];

/**
 * Statuts qui ne comptent PAS dans le calcul du taux de présence :
 * un jour férié ne peut pas être reproché à l'élève.
 */
export const NON_COMPTABILISES: AttendanceStatus[] = ['ferie'];

/** Statuts considérés comme une présence effective de l'élève. */
export const PRESENCE_STATUSES: AttendanceStatus[] = ['present', 'demi_journee_seance'];

/** Jour de la semaine (0 = dimanche … 6 = samedi) pour une date ISO `AAAA-MM-JJ`. */
export function weekdayOf(dateISO: string): number {
  const [y, m, d] = (dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return new Date().getDay();
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Vrai si la date tombe un samedi ou un dimanche (pas de classe). */
export function isWeekend(dateISO: string): boolean {
  const wd = weekdayOf(dateISO);
  return wd === 0 || wd === 6;
}

/** Vrai si la date est un jour de classe (lundi → vendredi). */
export function isSchoolDay(dateISO: string): boolean {
  return !isWeekend(dateISO);
}

/**
 * Demi-journées de classe pour une date donnée :
 *  - samedi / dimanche → []            (pas de classe)
 *  - mercredi          → ['matin']     (une seule demi-journée)
 *  - autres jours      → ['matin', 'apresmidi']
 */
export function halfDaysFor(dateISO: string): HalfDay[] {
  if (isWeekend(dateISO)) return [];
  if (weekdayOf(dateISO) === 3) return ['matin']; // mercredi
  return ['matin', 'apresmidi'];
}

/** Nom français du jour (pour l'affichage et les exports). */
export function weekdayName(dateISO: string): string {
  return ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][weekdayOf(dateISO)];
}

/** Message expliquant pourquoi l'appel est indisponible, ou null si possible. */
export function unavailableReason(dateISO: string): string | null {
  if (isWeekend(dateISO)) {
    return `${weekdayName(dateISO)} : pas de classe (week-end). Choisissez un jour du lundi au vendredi.`;
  }
  return null;
}

/** Vrai si le mercredi n'a qu'une demi-journée (utilisé pour l'information affichée). */
export function isSingleHalfDay(dateISO: string): boolean {
  return halfDaysFor(dateISO).length === 1;
}

/** Clé d'une entrée : un élève a UNE entrée par demi-journée. */
export function entryKey(studentId: string, half: HalfDay): string {
  return `${studentId}::${half}`;
}

/**
 * Nombre de demi-journées de classe dans un mois `AAAA-MM`
 * (lundi→vendredi, mercredi compté une seule fois).
 */
export function halfDaysInMonth(month: string): number {
  const [y, m] = (month || '').split('-').map(Number);
  if (!y || !m) return 0;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let total = 0;
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    total += halfDaysFor(iso).length;
  }
  return total;
}
