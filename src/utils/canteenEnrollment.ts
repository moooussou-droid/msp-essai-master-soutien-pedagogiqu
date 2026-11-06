/**
 * RELEVÉ DES EFFECTIFS PAR CLASSE — CANTINE (v47).
 *
 * ── DEMANDE ──────────────────────────────────────────────────────────
 * « Dans la section Cantine, crée le formulaire qui permet de relever
 *   l'effectif des élèves en Garçons et Filles dans les classes :
 *   Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1, CM2. »
 *
 * ── RÔLE DE CE FICHIER ───────────────────────────────────────────────
 * Logique métier pure : aucune dépendance à React ni au DOM, conformément
 * à la règle posée en v40 (« les formules ne doivent pas vivre dans les
 * composants visuels »). Tout est donc testable isolément.
 *
 * ── ARTICULATION AVEC LE SIMULATEUR (arbitrage utilisateur) ──────────
 * Le relevé est AUTONOME : il possède son historique et ses exports, et
 * n'écrase jamais l'effectif du simulateur. Un report explicite est
 * proposé à l'écran (« Utiliser cet effectif dans le simulateur »), afin
 * que l'enseignant reste maître du chiffre qui sert aux prélèvements.
 */

/** Les huit classes du préscolaire et du primaire béninois, dans l'ordre officiel. */
export type ClassLevelKey =
  | 'maternelle1' | 'maternelle2'
  | 'ci' | 'cp' | 'ce1' | 'ce2' | 'cm1' | 'cm2';

export interface ClassLevel {
  key: ClassLevelKey;
  label: string;
  /** Regroupement officiel : la maternelle relève du préscolaire. */
  cycle: 'Maternelle' | 'Primaire';
}

/**
 * Ordre imposé par la demande. Il correspond à la progression réelle de
 * l'élève, de la maternelle au CM2 : c'est aussi l'ordre des registres.
 */
export const CLASS_LEVELS: ClassLevel[] = [
  { key: 'maternelle1', label: 'Maternelle 1', cycle: 'Maternelle' },
  { key: 'maternelle2', label: 'Maternelle 2', cycle: 'Maternelle' },
  { key: 'ci',  label: 'CI',  cycle: 'Primaire' },
  { key: 'cp',  label: 'CP',  cycle: 'Primaire' },
  { key: 'ce1', label: 'CE1', cycle: 'Primaire' },
  { key: 'ce2', label: 'CE2', cycle: 'Primaire' },
  { key: 'cm1', label: 'CM1', cycle: 'Primaire' },
  { key: 'cm2', label: 'CM2', cycle: 'Primaire' },
];

/** Effectif d'une classe : garçons et filles saisis séparément. */
export interface ClassHeadcount {
  level: ClassLevelKey;
  boys: number;
  girls: number;
}

export interface EnrollmentSurvey {
  id: string;
  /** Date du relevé (ISO, aaaa-mm-jj). */
  date: string;
  schoolName: string;
  schoolYear: string;
  counts: ClassHeadcount[];
  /** Observation libre (ex. « effectif après la rentrée tardive »). */
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EnrollmentTotals {
  boys: number;
  girls: number;
  total: number;
  /** Part des filles, en pourcentage — indicateur suivi par les DDEMP. */
  girlsPct: number;
  byCycle: { cycle: string; boys: number; girls: number; total: number }[];
}

export const ENROLLMENT_KEY = 'msp_canteen_enrollment';

/** Entier positif : une saisie vide, négative ou décimale devient 0. */
function safeCount(v: unknown): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Grille vierge : les huit classes sont TOUJOURS présentes, même à zéro. */
export function emptyCounts(): ClassHeadcount[] {
  return CLASS_LEVELS.map((l) => ({ level: l.key, boys: 0, girls: 0 }));
}

/**
 * Complète une grille partielle.
 * Une école sans maternelle laisse ces lignes à zéro : on conserve malgré
 * tout les huit classes pour que les totaux et les exports gardent la
 * même structure d'un relevé à l'autre.
 */
export function normalizeCounts(counts: ClassHeadcount[] | undefined): ClassHeadcount[] {
  const byKey = new Map((counts || []).map((c) => [c.level, c]));
  return CLASS_LEVELS.map((l) => {
    const found = byKey.get(l.key);
    return {
      level: l.key,
      boys: safeCount(found?.boys),
      girls: safeCount(found?.girls),
    };
  });
}

/** Effectif total d'une classe. */
export function lineTotal(c: ClassHeadcount): number {
  return safeCount(c.boys) + safeCount(c.girls);
}

/**
 * TOTAUX DU RELEVÉ.
 *
 * Le pourcentage de filles est arrondi au dixième : c'est l'indicateur de
 * parité demandé dans les rapports à la circonscription. Sur un effectif
 * nul il vaut 0, jamais NaN (une division par zéro afficherait « NaN % »
 * à l'écran et dans les exports).
 */
export function computeTotals(counts: ClassHeadcount[]): EnrollmentTotals {
  const rows = normalizeCounts(counts);
  const boys = rows.reduce((t, c) => t + c.boys, 0);
  const girls = rows.reduce((t, c) => t + c.girls, 0);
  const total = boys + girls;

  const cycles = ['Maternelle', 'Primaire'];
  const byCycle = cycles.map((cycle) => {
    const keys = CLASS_LEVELS.filter((l) => l.cycle === cycle).map((l) => l.key);
    const sel = rows.filter((c) => keys.includes(c.level));
    const b = sel.reduce((t, c) => t + c.boys, 0);
    const g = sel.reduce((t, c) => t + c.girls, 0);
    return { cycle, boys: b, girls: g, total: b + g };
  });

  return {
    boys,
    girls,
    total,
    girlsPct: total > 0 ? Math.round((girls / total) * 1000) / 10 : 0,
    byCycle,
  };
}

/** Libellé d'une classe à partir de sa clé. */
export function levelLabel(key: ClassLevelKey): string {
  return CLASS_LEVELS.find((l) => l.key === key)?.label || String(key);
}

/* ------------------------------------------------------------------ */
/* Persistance (hors ligne, par établissement)                         */
/* ------------------------------------------------------------------ */

export function loadSurveys(): EnrollmentSurvey[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ENROLLMENT_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((s: EnrollmentSurvey) => ({ ...s, counts: normalizeCounts(s.counts) }));
  } catch {
    return [];
  }
}

/**
 * Enregistre un relevé.
 *
 * ⚠️ CORRECTIF v58 — PERTE DES RELEVÉS ANTÉRIEURS.
 * L'écran rechargeait le dernier relevé existant ; l'utilisateur changeait
 * simplement la date et les effectifs, puis enregistrait. Comme l'ancien
 * `id` était conservé, la ligne était REMPLACÉE : le relevé de la semaine
 * précédente disparaissait sans avertissement.
 *
 * Désormais, la DATE fait partie de l'identité d'un relevé :
 *   - même id ET même date  → mise à jour (correction d'une saisie) ;
 *   - même id MAIS date différente → nouveau relevé, l'ancien est conservé.
 *
 * Un relevé d'effectifs est un constat daté : changer la date, c'est
 * constater autre chose, pas corriger le constat précédent.
 */
export function saveSurvey(survey: EnrollmentSurvey): EnrollmentSurvey {
  const all = loadSurveys();

  const existant = all.find((s) => s.id === survey.id);
  const dateChangee = !!existant && existant.date !== survey.date;

  const clean: EnrollmentSurvey = {
    ...survey,
    // Une date différente ⇒ nouvelle identité, l'ancien relevé survit.
    id: dateChangee ? nouvelIdReleve() : survey.id,
    counts: normalizeCounts(survey.counts),
    createdAt: dateChangee ? Date.now() : (survey.createdAt || Date.now()),
    updatedAt: Date.now(),
  };

  /*
   * Deux relevés ne peuvent pas porter la même date : si l'utilisateur
   * revient sur une date déjà saisie, il la CORRIGE, il n'en crée pas un
   * doublon qui fausserait les totaux.
   */
  const memeDate = all.findIndex((s) => s.date === clean.date && s.id !== clean.id);
  if (memeDate >= 0) {
    clean.id = all[memeDate].id;
    clean.createdAt = all[memeDate].createdAt;
    all[memeDate] = clean;
  } else {
    const i = all.findIndex((s) => s.id === clean.id);
    if (i >= 0) all[i] = clean;
    else all.unshift(clean);
  }

  // Du plus récent au plus ancien : l'historique se lit naturellement.
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(all));
  return clean;
}

/** Relevé déjà enregistré pour cette date, s'il existe. */
export function surveyForDate(date: string): EnrollmentSurvey | null {
  return loadSurveys().find((s) => s.date === date) || null;
}

export function deleteSurvey(id: string): void {
  localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(loadSurveys().filter((s) => s.id !== id)));
}

/** Relevé le plus récent : sert de proposition de report au simulateur. */
export function latestSurvey(): EnrollmentSurvey | null {
  const all = loadSurveys();
  if (all.length === 0) return null;
  return [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/**
 * Identifiant de relevé, unique même à la milliseconde.
 * `Date.now()` seul permettrait à deux relevés créés dans la même
 * milliseconde de partager un identifiant — et donc de s'écraser.
 */
let compteurReleve = 0;
function nouvelIdReleve(): string {
  compteurReleve += 1;
  return `eff-${Date.now()}-${compteurReleve}`;
}

export function newSurvey(schoolName: string, schoolYear: string): EnrollmentSurvey {
  const now = Date.now();
  return {
    id: nouvelIdReleve(),
    date: new Date().toISOString().slice(0, 10),
    schoolName,
    schoolYear,
    counts: emptyCounts(),
    createdAt: now,
    updatedAt: now,
  };
}
