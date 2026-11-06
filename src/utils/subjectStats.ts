/**
 * Statistiques par discipline / matière évaluée (v33), ventilées Filles / Garçons.
 * Pour chaque matière : inscrits, ayant composé, n'ayant pas atteint le seuil (+ %),
 * ayant atteint le seuil (+ %), et difficultés observées / remédiations proposées.
 * Le seuil est celui du système béninois : 10/20 (primaire comme secondaire).
 */
import { ClassData, Student, Subject } from './database';
import { computeBulletins } from './bulletin';

export const SUBJECT_THRESHOLD = 10;

export interface GenderCell {
  inscrits: number;
  composants: number;
  sousSeuil: number;
  sousSeuilPct: number;
  atteint: number;
  atteintPct: number;
  moyenne: number | null;
}

export interface SubjectStatRow {
  subject: Subject;
  filles: GenderCell;
  garcons: GenderCell;
  total: GenderCell;
  /** Élèves sans sexe renseigné : signalés pour fiabiliser la ventilation. */
  sexeNonRenseigne: number;
  difficultes: string;
  remediation: string;
}

function emptyCell(inscrits = 0): GenderCell {
  return { inscrits, composants: 0, sousSeuil: 0, atteint: 0, sousSeuilPct: 0, atteintPct: 0, moyenne: null };
}

function finalize(cell: GenderCell, sum: number, n: number): GenderCell {
  const base = cell.composants || 0;
  cell.sousSeuilPct = base ? Math.round((cell.sousSeuil / base) * 1000) / 10 : 0;
  cell.atteintPct = base ? Math.round((cell.atteint / base) * 1000) / 10 : 0;
  cell.moyenne = n ? Math.round((sum / n) * 100) / 100 : null;
  return cell;
}

/** Difficultés observées, déduites du taux de réussite et du niveau moyen. */
export function diagnoseSubject(row: Omit<SubjectStatRow, 'difficultes' | 'remediation'>): { difficultes: string; remediation: string } {
  const t = row.total;
  if (!t.composants) {
    return {
      difficultes: 'Aucune note saisie : matière non encore évaluée.',
      remediation: 'Saisir les notes de la matière pour permettre le diagnostic.',
    };
  }
  const pct = t.atteintPct;
  const moy = t.moyenne ?? 0;
  const ecartGenre = Math.abs((row.filles.atteintPct || 0) - (row.garcons.atteintPct || 0));
  const parts: string[] = [];
  const remedes: string[] = [];

  if (pct < 40) {
    parts.push('Difficultés massives : plus de 6 apprenants sur 10 sous le seuil.');
    remedes.push('Reprendre les savoirs essentiels de la matière en séances de remédiation collective ; refaire les situations d’apprentissage clés.');
  } else if (pct < 60) {
    parts.push('Difficultés importantes : près de la moitié de la classe sous le seuil.');
    remedes.push('Organiser des groupes de besoin, deux séances hebdomadaires ciblées sur les compétences non installées.');
  } else if (pct < 80) {
    parts.push('Difficultés modérées, concentrées sur un sous-groupe d’apprenants.');
    remedes.push('Tutorat par les pairs et exercices différenciés pour les apprenants sous le seuil.');
  } else {
    parts.push('Résultats satisfaisants : compétences globalement installées.');
    remedes.push('Consolider par des activités d’approfondissement et maintenir le rythme d’évaluation.');
  }

  if (moy && moy < 8) {
    parts.push(`Moyenne de la matière faible (${moy.toFixed(2)}/20).`);
    remedes.push('Revoir la progression et le dosage des exigences ; vérifier la compréhension des consignes.');
  }
  if (ecartGenre >= 20) {
    const enRetard = (row.filles.atteintPct || 0) < (row.garcons.atteintPct || 0) ? 'les filles' : 'les garçons';
    parts.push(`Écart de réussite marqué selon le genre (${ecartGenre.toFixed(1)} points) au détriment ${enRetard === 'les filles' ? 'des filles' : 'des garçons'}.`);
    remedes.push(`Accompagnement ciblé pour ${enRetard} : encouragement, participation orale équilibrée, suivi individualisé.`);
  }
  const absents = t.inscrits - t.composants;
  if (absents > 0) {
    parts.push(`${absents} apprenant(s) n’ont pas composé.`);
    remedes.push('Organiser une évaluation de rattrapage et sensibiliser les parents à l’assiduité.');
  }

  return { difficultes: parts.join(' '), remediation: remedes.join(' ') };
}

/** Calcule le tableau complet des statistiques par discipline. */
export function computeSubjectStats(classData: ClassData): SubjectStatRow[] {
  const bulletins = computeBulletins(classData);
  const students: Student[] = classData.students;
  const isF = (s?: Student) => s?.sexe === 'F';
  const isM = (s?: Student) => s?.sexe === 'M';

  const inscritsF = students.filter(isF).length;
  const inscritsM = students.filter(isM).length;
  const sansSexe = students.filter(s => s.sexe !== 'F' && s.sexe !== 'M').length;

  const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);

  return subjects.map(subject => {
    const filles = emptyCell(inscritsF);
    const garcons = emptyCell(inscritsM);
    const total = emptyCell(students.length);
    let sumF = 0, nF = 0, sumM = 0, nM = 0, sumT = 0, nT = 0;

    for (const b of bulletins) {
      const res = b.results.find(r => r.subject.id === subject.id);
      if (!res) continue;
      const compose = res.total !== null && !res.absent;
      if (!compose) continue;
      const note = res.total ?? 0;
      const atteint = note >= SUBJECT_THRESHOLD;

      total.composants++; sumT += note; nT++;
      if (atteint) total.atteint++; else total.sousSeuil++;

      if (isF(b.student)) {
        filles.composants++; sumF += note; nF++;
        if (atteint) filles.atteint++; else filles.sousSeuil++;
      } else if (isM(b.student)) {
        garcons.composants++; sumM += note; nM++;
        if (atteint) garcons.atteint++; else garcons.sousSeuil++;
      }
    }

    const row = {
      subject,
      filles: finalize(filles, sumF, nF),
      garcons: finalize(garcons, sumM, nM),
      total: finalize(total, sumT, nT),
      sexeNonRenseigne: sansSexe,
    };
    return { ...row, ...diagnoseSubject(row) };
  });
}

/** Synthèse générale (toutes disciplines confondues) pour l'en-tête du tableau. */
export function summarizeSubjectStats(rows: SubjectStatRow[]) {
  const evaluees = rows.filter(r => r.total.composants > 0);
  const moyenneReussite = evaluees.length
    ? Math.round((evaluees.reduce((a, r) => a + r.total.atteintPct, 0) / evaluees.length) * 10) / 10
    : 0;
  const critiques = evaluees.filter(r => r.total.atteintPct < 50).map(r => r.subject.name);
  return { disciplines: rows.length, evaluees: evaluees.length, moyenneReussite, critiques };
}
