/**
 * Statistiques de pilotage d'établissement (vue directeur/administrateur).
 * Fonctions pures, testables, hors-ligne.
 */

export interface ClassSummaryInput {
  name: string;
  level: string;
  effectif: number;
  moyenne: number | null;
  taux: number; // taux de réussite en %
  completion: number; // % de notes saisies
}

export interface SchoolSummary {
  count: number;
  totalStudents: number;
  moyenneEcole: number | null;
  tauxGlobal: number;
  completionMoyenne: number;
  alerts: ClassSummaryInput[];
}

export function classNeedsFollowUp(item: ClassSummaryInput): boolean {
  // Une classe sans élève n'est pas une alerte (completion 0 % serait trompeur)
  if (item.effectif <= 0) return false;
  return item.completion < 100 || item.taux < 50;
}

export function buildSchoolSummary(classes: ClassSummaryInput[]): SchoolSummary {
  const count = classes.length;
  const totalStudents = classes.reduce((a, c) => a + c.effectif, 0);
  const withMoyenne = classes.filter(c => c.moyenne !== null);
  const moyenneEcole = withMoyenne.length
    ? withMoyenne.reduce((a, c) => a + (c.moyenne ?? 0), 0) / withMoyenne.length
    : null;
  const tauxGlobal = count ? classes.reduce((a, c) => a + c.taux, 0) / count : 0;
  const completionMoyenne = count ? classes.reduce((a, c) => a + c.completion, 0) / count : 0;
  const alerts = classes.filter(classNeedsFollowUp);
  return { count, totalStudents, moyenneEcole, tauxGlobal, completionMoyenne, alerts };
}

/** Date locale (fuseau de l'appareil) au format YYYY-MM-DD — jamais UTC. */
export function localDateKey(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------- Élèves à accompagner (moyenne < 10) ----------

import { ClassData } from './database';
import { computeBulletins, getMention } from './bulletin';

export interface StudentSupportItem {
  studentId: string;
  name: string; // NOM Prénoms
  moyenne: number | null;
  mention: string;
  weakCount: number; // nombre de matières < 10/20
}

/**
 * Élèves d'une classe dont la moyenne générale est inférieure à 10/20,
 * triés du plus faible au plus fort. Sert au conseil des maîtres, au plan
 * de remédiation et au rapport de pilotage. Les élèves sans moyenne
 * (aucune note) sont ignorés.
 */
export function buildStudentsToSupport(classData: ClassData): StudentSupportItem[] {
  const bulletins = computeBulletins(classData);
  return bulletins
    .filter(b => b.moyenne !== null && b.moyenne < 10)
    .map(b => ({
      studentId: b.student.id,
      name: `${b.student.nom.toUpperCase()} ${b.student.prenoms}`,
      moyenne: b.moyenne,
      mention: getMention(b.moyenne),
      weakCount: b.results.filter(r => r.total !== null && r.total < 10).length,
    }))
    .sort((a, b) => (a.moyenne ?? 0) - (b.moyenne ?? 0));
}
