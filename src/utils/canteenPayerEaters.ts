/**
 * RELEVÉ DES EFFECTIFS PAYEURS-MANGEURS — CANTINE (v66).
 *
 * Deux modes de fonctionnement coexistent dans les écoles :
 *  - « payeur-mangeur » : seuls les enfants présents ayant payé les frais
 *    de cantine prennent le repas ;
 *  - « apport communautaire » : tous les enfants présents prennent le repas.
 *
 * Ce fichier contient uniquement la logique métier et la persistance. Les
 * mangeurs ne sont jamais saisis directement : ils sont déduits du système
 * de l'école et des effectifs relevés par classe.
 */
import {
  CLASS_LEVELS,
  ClassHeadcount,
  ClassLevelKey,
} from './canteenEnrollment';

export type CanteenSystem = 'payeur-mangeur' | 'apport-communautaire';

export interface CanteenSystemInfo {
  key: CanteenSystem;
  label: string;
  shortLabel: string;
  rule: string;
}

export const CANTEEN_SYSTEMS: CanteenSystemInfo[] = [
  {
    key: 'payeur-mangeur',
    label: 'Système payeur-mangeur',
    shortLabel: 'Payeur-mangeur',
    rule: 'Seuls les élèves présents ayant payé les frais de cantine mangent.',
  },
  {
    key: 'apport-communautaire',
    label: 'Système apport communautaire',
    shortLabel: 'Apport communautaire',
    rule: 'Tous les élèves présents mangent.',
  },
];

export function isCanteenSystem(v: unknown): v is CanteenSystem {
  return v === 'payeur-mangeur' || v === 'apport-communautaire';
}

export function canteenSystemInfo(system: CanteenSystem): CanteenSystemInfo {
  return CANTEEN_SYSTEMS.find((s) => s.key === system) || CANTEEN_SYSTEMS[0];
}

export function canteenSystemLabel(system: CanteenSystem): string {
  return canteenSystemInfo(system).label;
}

/** Effectifs relevés pour une classe, un jour de cantine donné. */
export interface MealClassCounts {
  level: ClassLevelKey;
  /** Effectif inscrit, repris du relevé général des effectifs (repère). */
  enrolledBoys: number;
  enrolledGirls: number;
  /** Élèves présents le jour du relevé. */
  presentBoys: number;
  presentGirls: number;
  /**
   * Élèves présents ET à jour du paiement des frais de cantine.
   * Utilisé uniquement en système payeur-mangeur.
   */
  paidPresentBoys: number;
  paidPresentGirls: number;
}

export interface PayerEaterSurvey {
  id: string;
  /** Date du jour de cantine (ISO, aaaa-mm-jj). */
  date: string;
  schoolName: string;
  schoolYear: string;
  system: CanteenSystem;
  counts: MealClassCounts[];
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MealRowDerived extends MealClassCounts {
  enrolledTotal: number;
  presentTotal: number;
  paidPresentTotal: number;
  eaterBoys: number;
  eaterGirls: number;
  eaterTotal: number;
  /** Présents qui ne mangent pas (toujours 0 en apport communautaire). */
  presentNonEaters: number;
  /** Inscrits absents, lorsque l'effectif inscrit est connu. */
  absent: number;
}

export interface PayerEaterTotals {
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledTotal: number;
  presentBoys: number;
  presentGirls: number;
  presentTotal: number;
  paidPresentBoys: number;
  paidPresentGirls: number;
  paidPresentTotal: number;
  eaterBoys: number;
  eaterGirls: number;
  eaterTotal: number;
  presentNonEaters: number;
  absent: number;
  /** Présents / inscrits, en %. */
  attendancePct: number;
  /** Mangeurs / présents, en %. */
  eaterShareOfPresentPct: number;
  /** Filles parmi les mangeurs, en %. */
  girlsAmongEatersPct: number;
  byCycle: {
    cycle: string;
    enrolled: number;
    present: number;
    paidPresent: number;
    eaters: number;
  }[];
}

export interface MealSurveyWarning {
  level: ClassLevelKey;
  code: 'paid-exceeds-present' | 'present-exceeds-enrolled';
  message: string;
}

export const PAYER_EATERS_KEY = 'msp_canteen_payer_eaters';
export const CANTEEN_SYSTEM_KEY = 'msp_canteen_system';

function safeCount(v: unknown): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function emptyMealCounts(): MealClassCounts[] {
  return CLASS_LEVELS.map((l) => ({
    level: l.key,
    enrolledBoys: 0,
    enrolledGirls: 0,
    presentBoys: 0,
    presentGirls: 0,
    paidPresentBoys: 0,
    paidPresentGirls: 0,
  }));
}

/**
 * Complète/normalise la grille des huit classes.
 *
 * Un nombre de payeurs présents supérieur au nombre de présents est
 * matériellement impossible : il est ramené au nombre de présents lors de
 * la normalisation. L'écran signale aussi l'incohérence avant l'enregistrement.
 */
export function normalizeMealCounts(
  counts: MealClassCounts[] | undefined,
): MealClassCounts[] {
  const byLevel = new Map((counts || []).map((c) => [c.level, c]));
  return CLASS_LEVELS.map((l) => {
    const found = byLevel.get(l.key);
    const presentBoys = safeCount(found?.presentBoys);
    const presentGirls = safeCount(found?.presentGirls);
    return {
      level: l.key,
      enrolledBoys: safeCount(found?.enrolledBoys),
      enrolledGirls: safeCount(found?.enrolledGirls),
      presentBoys,
      presentGirls,
      paidPresentBoys: Math.min(presentBoys, safeCount(found?.paidPresentBoys)),
      paidPresentGirls: Math.min(presentGirls, safeCount(found?.paidPresentGirls)),
    };
  });
}

/** Reprend les inscrits du relevé général dans un relevé payeurs-mangeurs. */
export function applyEnrolledCounts(
  counts: MealClassCounts[] | undefined,
  enrolled: ClassHeadcount[] | undefined,
): MealClassCounts[] {
  const enrolledByLevel = new Map((enrolled || []).map((c) => [c.level, c]));
  return normalizeMealCounts(counts).map((row) => {
    const source = enrolledByLevel.get(row.level);
    return {
      ...row,
      enrolledBoys: safeCount(source?.boys),
      enrolledGirls: safeCount(source?.girls),
    };
  });
}

/** Calcule les mangeurs d'une classe selon le système de fonctionnement. */
export function deriveMealRow(
  row: MealClassCounts,
  system: CanteenSystem,
): MealRowDerived {
  const clean = normalizeMealCounts([row]).find((c) => c.level === row.level)
    || normalizeMealCounts([])[0];
  const eaterBoys = system === 'apport-communautaire'
    ? clean.presentBoys
    : clean.paidPresentBoys;
  const eaterGirls = system === 'apport-communautaire'
    ? clean.presentGirls
    : clean.paidPresentGirls;
  const enrolledTotal = clean.enrolledBoys + clean.enrolledGirls;
  const presentTotal = clean.presentBoys + clean.presentGirls;
  const eaterTotal = eaterBoys + eaterGirls;

  return {
    ...clean,
    enrolledTotal,
    presentTotal,
    paidPresentTotal: clean.paidPresentBoys + clean.paidPresentGirls,
    eaterBoys,
    eaterGirls,
    eaterTotal,
    presentNonEaters: Math.max(0, presentTotal - eaterTotal),
    absent: Math.max(0, enrolledTotal - presentTotal),
  };
}

export function deriveMealRows(
  counts: MealClassCounts[] | undefined,
  system: CanteenSystem,
): MealRowDerived[] {
  return normalizeMealCounts(counts).map((row) => deriveMealRow(row, system));
}

export function computePayerEaterTotals(
  counts: MealClassCounts[] | undefined,
  system: CanteenSystem,
): PayerEaterTotals {
  const rows = deriveMealRows(counts, system);
  const sum = (pick: (r: MealRowDerived) => number) => rows.reduce((t, r) => t + pick(r), 0);

  const enrolledBoys = sum((r) => r.enrolledBoys);
  const enrolledGirls = sum((r) => r.enrolledGirls);
  const presentBoys = sum((r) => r.presentBoys);
  const presentGirls = sum((r) => r.presentGirls);
  const paidPresentBoys = sum((r) => r.paidPresentBoys);
  const paidPresentGirls = sum((r) => r.paidPresentGirls);
  const eaterBoys = sum((r) => r.eaterBoys);
  const eaterGirls = sum((r) => r.eaterGirls);
  const enrolledTotal = enrolledBoys + enrolledGirls;
  const presentTotal = presentBoys + presentGirls;
  const eaterTotal = eaterBoys + eaterGirls;

  const byCycle = ['Maternelle', 'Primaire'].map((cycle) => {
    const levels = CLASS_LEVELS.filter((l) => l.cycle === cycle).map((l) => l.key);
    const selected = rows.filter((r) => levels.includes(r.level));
    return {
      cycle,
      enrolled: selected.reduce((t, r) => t + r.enrolledTotal, 0),
      present: selected.reduce((t, r) => t + r.presentTotal, 0),
      paidPresent: selected.reduce((t, r) => t + r.paidPresentTotal, 0),
      eaters: selected.reduce((t, r) => t + r.eaterTotal, 0),
    };
  });

  return {
    enrolledBoys,
    enrolledGirls,
    enrolledTotal,
    presentBoys,
    presentGirls,
    presentTotal,
    paidPresentBoys,
    paidPresentGirls,
    paidPresentTotal: paidPresentBoys + paidPresentGirls,
    eaterBoys,
    eaterGirls,
    eaterTotal,
    presentNonEaters: Math.max(0, presentTotal - eaterTotal),
    absent: Math.max(0, enrolledTotal - presentTotal),
    attendancePct: pct(presentTotal, enrolledTotal),
    eaterShareOfPresentPct: pct(eaterTotal, presentTotal),
    girlsAmongEatersPct: pct(eaterGirls, eaterTotal),
    byCycle,
  };
}

/** Contrôles de cohérence destinés à aider la saisie, sans masquer l'erreur. */
export function validatePayerEaterSurvey(
  survey: Pick<PayerEaterSurvey, 'counts' | 'system'>,
): MealSurveyWarning[] {
  const warnings: MealSurveyWarning[] = [];
  const rawByLevel = new Map((survey.counts || []).map((c) => [c.level, c]));

  for (const levelInfo of CLASS_LEVELS) {
    const raw = rawByLevel.get(levelInfo.key);
    if (!raw) continue;
    const presentBoys = safeCount(raw.presentBoys);
    const presentGirls = safeCount(raw.presentGirls);
    const enrolledBoys = safeCount(raw.enrolledBoys);
    const enrolledGirls = safeCount(raw.enrolledGirls);

    if (
      survey.system === 'payeur-mangeur'
      && (safeCount(raw.paidPresentBoys) > presentBoys
        || safeCount(raw.paidPresentGirls) > presentGirls)
    ) {
      warnings.push({
        level: levelInfo.key,
        code: 'paid-exceeds-present',
        message: `${levelInfo.label} : les payeurs présents dépassent les présents.`,
      });
    }

    if (
      (enrolledBoys > 0 && presentBoys > enrolledBoys)
      || (enrolledGirls > 0 && presentGirls > enrolledGirls)
    ) {
      warnings.push({
        level: levelInfo.key,
        code: 'present-exceeds-enrolled',
        message: `${levelInfo.label} : les présents dépassent les inscrits repris du relevé général.`,
      });
    }
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
/* Système de fonctionnement mémorisé pour l'école                     */
/* ------------------------------------------------------------------ */

export function loadCanteenSystem(): CanteenSystem {
  try {
    const raw = localStorage.getItem(CANTEEN_SYSTEM_KEY);
    return isCanteenSystem(raw) ? raw : 'payeur-mangeur';
  } catch {
    return 'payeur-mangeur';
  }
}

export function saveCanteenSystem(system: CanteenSystem): void {
  try {
    localStorage.setItem(CANTEEN_SYSTEM_KEY, system);
  } catch {
    // Le choix reste dans le relevé courant même si le stockage est plein.
  }
}

/* ------------------------------------------------------------------ */
/* Persistance des relevés                                             */
/* ------------------------------------------------------------------ */

let idCounter = 0;
function newMealSurveyId(): string {
  idCounter += 1;
  return `payeurs-mangeurs-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeSurvey(survey: PayerEaterSurvey): PayerEaterSurvey {
  return {
    ...survey,
    system: isCanteenSystem(survey.system) ? survey.system : loadCanteenSystem(),
    counts: normalizeMealCounts(survey.counts),
  };
}

export function loadPayerEaterSurveys(): PayerEaterSurvey[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PAYER_EATERS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((s: PayerEaterSurvey) => normalizeSurvey(s));
  } catch {
    return [];
  }
}

/**
 * Enregistre un relevé journalier.
 *
 * Même règle que le relevé général (v58) : changer la date crée un nouveau
 * constat et ne remplace jamais celui d'une autre date. Pour une même date,
 * la nouvelle saisie corrige le relevé existant au lieu d'en créer un doublon.
 */
export function savePayerEaterSurvey(survey: PayerEaterSurvey): PayerEaterSurvey {
  const all = loadPayerEaterSurveys();
  const existing = all.find((s) => s.id === survey.id);
  const dateChanged = !!existing && existing.date !== survey.date;

  const clean: PayerEaterSurvey = {
    ...normalizeSurvey(survey),
    id: dateChanged ? newMealSurveyId() : survey.id,
    createdAt: dateChanged ? Date.now() : (survey.createdAt || Date.now()),
    updatedAt: Date.now(),
  };

  const sameDate = all.findIndex((s) => s.date === clean.date && s.id !== clean.id);
  if (sameDate >= 0) {
    clean.id = all[sameDate].id;
    clean.createdAt = all[sameDate].createdAt;
    all[sameDate] = clean;
  } else {
    const i = all.findIndex((s) => s.id === clean.id);
    if (i >= 0) all[i] = clean;
    else all.unshift(clean);
  }

  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  localStorage.setItem(PAYER_EATERS_KEY, JSON.stringify(all));
  saveCanteenSystem(clean.system);
  return clean;
}

export function payerEaterSurveyForDate(date: string): PayerEaterSurvey | null {
  return loadPayerEaterSurveys().find((s) => s.date === date) || null;
}

export function latestPayerEaterSurvey(): PayerEaterSurvey | null {
  const all = loadPayerEaterSurveys();
  if (!all.length) return null;
  return [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function deletePayerEaterSurvey(id: string): void {
  localStorage.setItem(
    PAYER_EATERS_KEY,
    JSON.stringify(loadPayerEaterSurveys().filter((s) => s.id !== id)),
  );
}

export function newPayerEaterSurvey(
  schoolName: string,
  schoolYear: string,
  system: CanteenSystem = loadCanteenSystem(),
  enrolledCounts?: ClassHeadcount[],
): PayerEaterSurvey {
  const now = Date.now();
  return {
    id: newMealSurveyId(),
    date: new Date().toISOString().slice(0, 10),
    schoolName,
    schoolYear,
    system,
    counts: enrolledCounts
      ? applyEnrolledCounts(emptyMealCounts(), enrolledCounts)
      : emptyMealCounts(),
    createdAt: now,
    updatedAt: now,
  };
}
