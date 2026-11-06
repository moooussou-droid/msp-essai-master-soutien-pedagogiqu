import { ClassData, Student, Subject, Note, sortStudents, isSecondaire, findBestNote, findNoteInEvaluation, EvaluationId, SubjectGroupe, subjectGroupe, GROUPE_LABELS } from './database';

export interface SubjectResult {
  subject: Subject;
  cm: number | null; // Primaire: Critères minimaux — Secondaire: note obtenue /20
  cp: number | null; // Primaire: Note de perfectionnement — Secondaire: null
  total: number | null; // Note /20 (primaire: CM+CP ; secondaire: moyenne semestrielle MS)
  coefficient: number; // Secondaire
  totalObtenu: number | null; // Secondaire: note × coef
  totalPossible: number; // Secondaire: 20 × coef
  absent: boolean;
  // --- Secondaire : bulletin officiel (colonnes MEPE / NPS1 / NPS2 / MS / MSC) ---
  mepe: number | null; // Interrogations écrites (note /20)
  nps1: number | null; // Devoir surveillé 1 (note /20)
  nps2: number | null; // Devoir surveillé 2 (note /20)
  ms: number | null; // Moyenne semestrielle de la matière (moyenne des notes saisies)
  msAbsent: boolean; // Absent à la dernière évaluation
  msc: number | null; // Moyenne de la classe dans la matière
  minClasse: number | null; // Moyenne de classe la plus faible
  maxClasse: number | null; // Moyenne de classe la plus forte
  subjectRang: number; // Rang de l'élève dans la matière
  groupe: SubjectGroupe;
}

export interface GroupBilan {
  groupe: SubjectGroupe;
  label: string;
  moyenne: number | null;
  count: number;
}

export interface StudentBulletin {
  student: Student;
  results: SubjectResult[];
  moyenne: number | null; // moyenne générale /20
  totalPoints: number; // Secondaire: somme des totaux obtenus
  totalPossible: number; // Secondaire: somme des totaux possibles
  totalCoef: number;
  rang: number;
  mention: string;
  appreciation: string;
  effectif: number;
}

/** Note totale d'une matière pour un élève (CM + CP), ramenée sur 20. */
export function subjectTotal(note: Note | undefined, subject: Subject): number | null {
  if (!note || note.absent) return null;
  if (note.noteObtenue === null && note.notePerfectionnement === null) return null;
  const cm = note.noteObtenue ?? 0;
  const cp = note.notePerfectionnement ?? 0;
  const raw = cm + cp;
  const max = subject.noteObtenueMax + subject.notePerfectionnementMax;
  if (max === 0) return null;
  // Ramener sur 20 si le total des maxima diffère de 20
  return max === 20 ? raw : (raw / max) * 20;
}

/** Mention selon la moyenne /20 (barème béninois usuel). */
export function getMention(moyenne: number | null): string {
  if (moyenne === null) return '—';
  if (moyenne >= 18) return 'Excellent';
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  if (moyenne >= 8) return 'Insuffisant';
  return 'Faible';
}

/** Appréciation textuelle automatique. */
export function getAppreciation(moyenne: number | null): string {
  if (moyenne === null) return 'Aucune note enregistrée.';
  if (moyenne >= 18) return 'Résultats exceptionnels. Félicitations, continue ainsi !';
  if (moyenne >= 16) return 'Très bon travail. Élève sérieux et appliqué.';
  if (moyenne >= 14) return 'Bon travail. Poursuis tes efforts.';
  if (moyenne >= 12) return 'Travail satisfaisant. Peut mieux faire.';
  if (moyenne >= 10) return 'Résultats moyens. Des efforts sont nécessaires.';
  if (moyenne >= 8) return 'Résultats insuffisants. Doit travailler davantage.';
  return 'Résultats faibles. Un accompagnement soutenu est recommandé.';
}

/**
 * Calcule les bulletins de tous les élèves avec rang.
 *
 * Maternelle / Primaire : `options.evaluation` permet le bulletin d'UNE
 * évaluation précise (formative 1, sommative 1/2/3) — chaque évaluation a son
 * bulletin de notes ; sans option, la note de référence (évaluation sommative
 * la plus récente disponible) est utilisée.
 *
 * Secondaire : bulletin officiel — colonnes MEPE (interrogations écrites),
 * NPS1 / NPS2 (devoirs surveillés), MS (moyenne semestrielle de la matière =
 * moyenne des notes saisies), MSC (moyenne de la classe dans la matière),
 * rang et moyennes de classe (plus faible / plus forte) par matière.
 */
export function computeBulletins(
  classData: ClassData,
  options?: { evaluation?: EvaluationId }
): StudentBulletin[] {
  const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);
  const secondaire = isSecondaire(classData);
  const evalFilter = options?.evaluation;

  // Étape 1 : calcul des moyennes de chaque élève
  const partial = classData.students.map((student) => {
    const results: SubjectResult[] = subjects.map((subject) => {
      const coefficient = subject.coefficient ?? 1;

      if (secondaire) {
        // Bulletin officiel du secondaire : MEPE + NPS1 + NPS2 → MS
        const noteMepe = findNoteInEvaluation(classData.notes, student.id, subject.id, 'formative1');
        const noteNps1 = findNoteInEvaluation(classData.notes, student.id, subject.id, 'sommative1');
        const noteNps2 = findNoteInEvaluation(classData.notes, student.id, subject.id, 'sommative2');
        const mepe = subjectTotal(noteMepe, subject);
        const nps1 = subjectTotal(noteNps1, subject);
        const nps2 = subjectTotal(noteNps2, subject);
        const vals = [mepe, nps1, nps2].filter((v): v is number => v !== null);
        const ms = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        const msAbsent = noteNps2?.absent ?? noteNps1?.absent ?? noteMepe?.absent ?? false;
        return {
          subject,
          cm: ms,
          cp: null,
          total: ms,
          coefficient,
          totalObtenu: ms !== null ? ms * coefficient : null,
          totalPossible: 20 * coefficient,
          absent: msAbsent,
          mepe, nps1, nps2, ms,
          msAbsent,
          msc: null, minClasse: null, maxClasse: null,
          subjectRang: 0,
          groupe: subjectGroupe(subject),
        };
      }

      // Maternelle / Primaire : bulletin d'une évaluation précise, sinon
      // note de référence (évaluation la plus prioritaire disponible).
      const note = evalFilter
        ? findNoteInEvaluation(classData.notes, student.id, subject.id, evalFilter)
        : findBestNote(classData.notes, student.id, subject.id);
      const total = subjectTotal(note, subject); // note /20
      return {
        subject,
        cm: note?.absent ? null : note?.noteObtenue ?? null,
        cp: note?.absent ? null : note?.notePerfectionnement ?? null,
        total,
        coefficient,
        totalObtenu: total !== null ? total * coefficient : null,
        totalPossible: 20 * coefficient,
        absent: note?.absent ?? false,
        mepe: null, nps1: null, nps2: null, ms: null,
        msAbsent: note?.absent ?? false,
        msc: null, minClasse: null, maxClasse: null,
        subjectRang: 0,
        groupe: subjectGroupe(subject),
      };
    });

    const notedResults = results.filter((r) => r.total !== null);

    let moyenne: number | null;
    let totalPoints: number;
    let totalPossible: number;
    let totalCoef: number;

    if (secondaire) {
      // Moyenne pondérée par les coefficients
      totalPoints = notedResults.reduce((sum, r) => sum + (r.totalObtenu ?? 0), 0);
      totalPossible = notedResults.reduce((sum, r) => sum + r.totalPossible, 0);
      totalCoef = notedResults.reduce((sum, r) => sum + r.coefficient, 0);
      moyenne = totalCoef > 0 ? totalPoints / totalCoef : null;
    } else {
      // Primaire : moyenne arithmétique simple
      totalPoints = notedResults.reduce((sum, r) => sum + (r.total ?? 0), 0);
      totalPossible = notedResults.length * 20;
      totalCoef = notedResults.length;
      moyenne = totalCoef > 0 ? totalPoints / totalCoef : null;
    }

    return { student, results, moyenne, totalPoints, totalPossible, totalCoef };
  });

  // Étape 1bis (secondaire) : statistiques de classe par matière
  // (MSC = moyenne de classe, plus faible / plus forte, rang dans la matière)
  if (secondaire) {
    for (const subject of subjects) {
      const entries: { ms: number }[] = [];
      for (const p of partial) {
        const r = p.results.find((x) => x.subject.id === subject.id);
        if (r && r.ms !== null) entries.push({ ms: r.ms });
      }
      if (entries.length === 0) continue;
      const msc = entries.reduce((s, e) => s + e.ms, 0) / entries.length;
      const minClasse = Math.min(...entries.map((e) => e.ms));
      const maxClasse = Math.max(...entries.map((e) => e.ms));
      const ranked = [...entries].map((e) => e.ms).sort((a, b) => b - a);
      for (const p of partial) {
        const r = p.results.find((x) => x.subject.id === subject.id);
        if (!r || r.ms === null) continue;
        r.msc = msc;
        r.minClasse = minClasse;
        r.maxClasse = maxClasse;
        r.subjectRang = ranked.indexOf(r.ms) + 1;
      }
    }
  }

  // Étape 2 : classement (rang) sur la moyenne, décroissant
  const ranked = [...partial]
    .filter((p) => p.moyenne !== null)
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0));

  const rangMap = new Map<string, number>();
  ranked.forEach((p, index) => {
    // Gestion des ex-aequo
    if (index > 0 && ranked[index - 1].moyenne === p.moyenne) {
      rangMap.set(p.student.id, rangMap.get(ranked[index - 1].student.id)!);
    } else {
      rangMap.set(p.student.id, index + 1);
    }
  });

  const effectif = classData.students.length;

  // Étape 3 : bulletins triés par ordre alphabétique (comme le modèle)
  const sorted = sortStudents(classData.students);
  return sorted.map((student) => {
    const p = partial.find((x) => x.student.id === student.id)!;
    return {
      ...p,
      rang: rangMap.get(student.id) ?? 0,
      mention: getMention(p.moyenne),
      appreciation: getAppreciation(p.moyenne),
      effectif,
    };
  });
}

/**
 * Bilans du bulletin officiel du secondaire : littéraire, scientifique,
 * autres matières (moyenne arithmétique des MS du groupe).
 */
export function computeGroupBilans(b: StudentBulletin): GroupBilan[] {
  const groups: SubjectGroupe[] = ['litteraire', 'scientifique', 'autres'];
  return groups.map((g) => {
    const rs = b.results.filter((r) => r.groupe === g && r.ms !== null);
    return {
      groupe: g,
      label: GROUPE_LABELS[g],
      moyenne: rs.length > 0 ? rs.reduce((s, r) => s + (r.ms ?? 0), 0) / rs.length : null,
      count: rs.length,
    };
  });
}

/** Mention du conseil des professeurs (case à cocher du bulletin officiel). */
export function getMentionConseil(moyenne: number | null): string {
  if (moyenne === null) return '—';
  if (moyenne >= 16) return 'Félicitations';
  if (moyenne >= 14) return 'Encouragements';
  if (moyenne >= 12) return 'Tableau d\'honneur';
  if (moyenne >= 10) return 'Avertissement / Travail';
  return 'Blâme / Travail';
}

/** Statistiques globales de la classe. */
export function computeClassStats(bulletins: StudentBulletin[]) {
  const withMoyenne = bulletins.filter((b) => b.moyenne !== null);
  const count = withMoyenne.length;
  const moyenneClasse =
    count > 0 ? withMoyenne.reduce((s, b) => s + (b.moyenne ?? 0), 0) / count : null;
  const admis = withMoyenne.filter((b) => (b.moyenne ?? 0) >= 10).length;
  const tauxReussite = count > 0 ? (admis / count) * 100 : 0;
  const plusForte = count > 0 ? Math.max(...withMoyenne.map((b) => b.moyenne ?? 0)) : null;
  const plusFaible = count > 0 ? Math.min(...withMoyenne.map((b) => b.moyenne ?? 0)) : null;

  return { moyenneClasse, admis, count, tauxReussite, plusForte, plusFaible };
}
