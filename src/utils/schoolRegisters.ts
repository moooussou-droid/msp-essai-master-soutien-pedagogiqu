/**
 * REGISTRES RÉGLEMENTAIRES DE L'ÉCOLE (v49) — logique métier pure.
 *
 * ── POURQUOI CES DEUX REGISTRES ? ────────────────────────────────────
 * Ce ne sont pas des ajouts décoratifs : l'application les EXIGE déjà
 * ailleurs sans les fournir.
 *  - `src/utils/schoolChecklists.ts` impose « Cahier journal à jour »
 *    dans la liste de préparation à l'inspection ;
 *  - le modèle « Rapport de préparation à l'inspection » demande le
 *    cahier journal ET le registre matricule.
 * L'enseignant devait donc les tenir sur papier alors que l'application
 * lui réclamait de les avoir. C'est cette contradiction qu'on corrige.
 *
 * 1. CAHIER JOURNAL — obligation quotidienne de tout enseignant béninois :
 *    ce qui a été réellement fait chaque jour, par séance.
 * 2. REGISTRE MATRICULE — registre d'inscription de l'école : identité de
 *    l'élève, date d'admission, provenance, et sortie éventuelle. C'est la
 *    pièce que réclame l'inspection et qui sert à établir un certificat
 *    de scolarité.
 */

/* ================================================================== */
/* 1. CAHIER JOURNAL                                                   */
/* ================================================================== */

export const JOURNAL_KEY = 'msp_cahier_journal';

export interface JournalSession {
  id: string;
  /** Matière ou champ de formation. */
  subject: string;
  /** Titre de la séance / compétence visée. */
  title: string;
  /** Déroulement effectif, observations. */
  content: string;
  /** Durée en minutes. */
  duration: number;
  /** La séance a-t-elle été réalisée comme prévu ? */
  done: boolean;
  /** Report éventuel : motif (absence, intempérie, etc.). */
  observation?: string;
}

export interface JournalDay {
  id: string;
  /** Date ISO aaaa-mm-jj. */
  date: string;
  className: string;
  sessions: JournalSession[];
  updatedAt: number;
}

export function loadJournal(): JournalDay[] {
  try {
    const raw = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveJournalDay(day: JournalDay): JournalDay[] {
  const all = loadJournal();
  const clean = { ...day, updatedAt: Date.now() };
  const i = all.findIndex((d) => d.id === clean.id);
  if (i >= 0) all[i] = clean;
  else all.unshift(clean);
  // Tri antéchronologique : le jour courant d'abord.
  all.sort((a, b) => b.date.localeCompare(a.date));
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}

export function deleteJournalDay(id: string): JournalDay[] {
  const rest = loadJournal().filter((d) => d.id !== id);
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(rest)); } catch { /* ignore */ }
  return rest;
}

export interface JournalStats {
  days: number;
  sessions: number;
  done: number;
  /** Taux de réalisation en %, arrondi au dixième. */
  completionRate: number;
  /** Durée totale effectivement réalisée, en minutes. */
  minutesDone: number;
}

/**
 * TAUX DE RÉALISATION = séances faites ÷ séances prévues × 100.
 * Indicateur demandé par l'inspection : il mesure l'écart entre le
 * programme prévu et le programme réellement exécuté.
 * Aucune séance ⇒ 0 %, jamais NaN.
 */
export function journalStats(days: JournalDay[]): JournalStats {
  const sessions = days.flatMap((d) => d.sessions);
  const done = sessions.filter((s) => s.done);
  return {
    days: days.length,
    sessions: sessions.length,
    done: done.length,
    completionRate: sessions.length > 0
      ? Math.round((done.length / sessions.length) * 1000) / 10
      : 0,
    minutesDone: done.reduce((t, s) => t + (Number(s.duration) || 0), 0),
  };
}

/* ================================================================== */
/* 2. REGISTRE MATRICULE                                               */
/* ================================================================== */

export const MATRICULE_KEY = 'msp_registre_matricule';

export interface MatriculeEntry {
  id: string;
  /** Numéro d'ordre dans le registre. */
  numero: number;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F' | '';
  dateNaissance: string;
  lieuNaissance: string;
  /** Nom du père, de la mère ou du tuteur. */
  parent: string;
  contact: string;
  /** Date d'admission dans l'établissement. */
  dateAdmission: string;
  /** Classe d'admission. */
  classeAdmission: string;
  /** École de provenance (vide = première inscription). */
  provenance?: string;
  /** Date de sortie, si l'élève a quitté l'école. */
  dateSortie?: string;
  motifSortie?: string;
}

export function loadMatricules(): MatriculeEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MATRICULE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveMatricules(list: MatriculeEntry[]): void {
  try { localStorage.setItem(MATRICULE_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/**
 * Prochain numéro d'ordre : maximum existant + 1.
 * On ne se fie pas au nombre d'entrées, car une suppression créerait des
 * doublons de numéro — or le numéro de registre doit rester unique.
 */
export function nextNumero(list: MatriculeEntry[]): number {
  return list.reduce((max, e) => Math.max(max, Number(e.numero) || 0), 0) + 1;
}

export interface MatriculeStats {
  total: number;
  present: number;
  sortis: number;
  garcons: number;
  filles: number;
}

/** Effectif inscrit, présent et sorti. Un élève sorti reste au registre. */
export function matriculeStats(list: MatriculeEntry[]): MatriculeStats {
  const sortis = list.filter((e) => !!e.dateSortie);
  const present = list.filter((e) => !e.dateSortie);
  return {
    total: list.length,
    present: present.length,
    sortis: sortis.length,
    garcons: present.filter((e) => e.sexe === 'M').length,
    filles: present.filter((e) => e.sexe === 'F').length,
  };
}

/** Recherche sur le nom, les prénoms ou le matricule. */
export function searchMatricules(list: MatriculeEntry[], query: string): MatriculeEntry[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((e) =>
    `${e.nom} ${e.prenoms} ${e.matricule}`.toLowerCase().includes(q));
}

/**
 * Âge en années à une date donnée.
 * Calculé par différence de dates complètes : on retire une année si
 * l'anniversaire n'est pas encore passé, sinon un élève né en décembre
 * paraîtrait un an plus âgé en janvier.
 */
export function ageAt(dateNaissance: string, at: Date = new Date()): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return null;
  let age = at.getFullYear() - d.getFullYear();
  const m = at.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
