/**
 * PDF DES RAPPORTS DE CLASSE (v45).
 *
 * ── POURQUOI CE FICHIER ──────────────────────────────────────────────
 * Deux écrans officiels ne proposaient QUE `window.print()` :
 *   - « Statistiques par discipline » (ventilation filles/garçons, seuil,
 *     remédiation) ;
 *   - « Bilan annuel » (moyennes et présences).
 * Or la règle posée en v41 est explicite : la génération PDF doit produire
 * un VRAI fichier PDF, l'impression restant disponible à côté. Sur Android,
 * « Imprimer » oblige à trouver « Enregistrer au format PDF », étape que
 * beaucoup d'enseignants ne trouvent pas — et le fichier n'est alors pas
 * rangé dans les téléchargements.
 *
 * Les documents produits portent la signature de l'application (v42).
 */
import { makePdf, PdfColumn, PdfRow } from './pdfMaker';
import { ClassData } from './database';
import { SubjectStatRow, SUBJECT_THRESHOLD } from './subjectStats';
import { getProfile } from './userProfile';

/** Nombre à deux décimales, virgule française, tiret si absent. */
function n2(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toFixed(2).replace('.', ',');
}

/** Pourcentage à une décimale. */
function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v.toFixed(1).replace('.', ',')} %`;
}

/** Date française du jour. */
function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Nom de fichier sans accent ni caractère spécial. */
function safeName(s: string): string {
  return (s || 'document')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document';
}

/* ------------------------------------------------------------------ */
/* Statistiques par discipline                                         */
/* ------------------------------------------------------------------ */

/**
 * PV des statistiques par discipline.
 *
 * Reprend les colonnes de l'écran : pour chaque matière, le nombre de
 * composants, ceux qui atteignent le seuil et ceux qui sont en dessous,
 * ventilés filles / garçons, puis la moyenne.
 *
 * Orientation PAYSAGE : neuf colonnes chiffrées ne tiennent pas en portrait.
 */
export function exportSubjectStatsPdf(
  classData: ClassData,
  rows: SubjectStatRow[],
): void {
  const profile = getProfile();
  const pdf = makePdf({
    title: 'Statistiques par discipline',
    subtitle: `${classData.name} — seuil de réussite : ${SUBJECT_THRESHOLD}/20`,
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    orientation: 'landscape',
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'L’enseignant(e)',
      stampSignature: true,
      date: today(),
    },
  });

  const columns: PdfColumn[] = [
    { header: 'Discipline', width: 2.6 },
    { header: 'Filles éval.', width: 1, align: 'right' },
    { header: 'Filles ≥ seuil', width: 1.2, align: 'right' },
    { header: 'Garçons éval.', width: 1.1, align: 'right' },
    { header: 'Garçons ≥ seuil', width: 1.3, align: 'right' },
    { header: 'Total éval.', width: 1, align: 'right' },
    { header: 'Total ≥ seuil', width: 1.2, align: 'right' },
    { header: 'Réussite', width: 1.1, align: 'right' },
    { header: 'Moyenne', width: 1, align: 'right' },
  ];

  const body: PdfRow[] = rows.map((r) => [
    r.subject.name,
    String(r.filles.composants),
    String(r.filles.atteint),
    String(r.garcons.composants),
    String(r.garcons.atteint),
    String(r.total.composants),
    String(r.total.atteint),
    // En dessous de 50 % de réussite, la discipline est signalée en rouge.
    { text: pct(r.total.atteintPct), danger: r.total.composants > 0 && r.total.atteintPct < 50 },
    n2(r.total.moyenne),
  ]);

  pdf.table(columns, body);

  /* Disciplines à renforcer : l'information la plus actionnable du document. */
  const evaluees = rows.filter((r) => r.total.composants > 0);
  const critiques = evaluees.filter((r) => r.total.atteintPct < 50);

  pdf.sectionTitle('Synthèse');
  pdf.keyValues([
    ['Disciplines suivies', String(rows.length)],
    ['Disciplines évaluées', String(evaluees.length)],
    ['Réussite moyenne', evaluees.length > 0
      ? pct(evaluees.reduce((t, r) => t + r.total.atteintPct, 0) / evaluees.length)
      : '—'],
  ]);

  if (critiques.length > 0) {
    pdf.alert(
      `Disciplines à renforcer en priorité (moins de 50 % de réussite) : `
      + `${critiques.map((r) => r.subject.name).join(', ')}.`,
    );
  }

  /* Les observations saisies par l'enseignant méritent de figurer au PV. */
  const avecRemediation = rows.filter((r) => (r.difficultes || '').trim() || (r.remediation || '').trim());
  if (avecRemediation.length > 0) {
    pdf.sectionTitle('Difficultés et remédiation');
    pdf.table(
      [
        { header: 'Discipline', width: 2 },
        { header: 'Difficultés constatées', width: 3 },
        { header: 'Remédiation prévue', width: 3 },
      ],
      avecRemediation.map((r) => [r.subject.name, r.difficultes || '—', r.remediation || '—']),
    );
  }

  /* Une ventilation par sexe n'a de sens que si le sexe est renseigné. */
  const sansSexe = rows.reduce((t, r) => Math.max(t, r.sexeNonRenseigne || 0), 0);
  if (sansSexe > 0) {
    pdf.paragraph(
      `Attention : ${sansSexe} élève(s) n'ont pas de sexe renseigné. Ils sont comptés `
      + `dans les totaux, mais pas dans la ventilation filles / garçons.`,
    );
  }

  pdf.save(`statistiques-disciplines-${safeName(classData.name)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Bilan annuel                                                        */
/* ------------------------------------------------------------------ */

/** Une ligne du bilan annuel (reprise de l'écran, sans dépendance React). */
export interface AnnualLine {
  name: string;
  /** Moyenne à chaque évaluation, dans l'ordre des colonnes. */
  perEval: (number | null)[];
  annual: number | null;
  presence: number;
  absences: number;
  rang?: number;
}

/**
 * BILAN ANNUEL EN PDF : moyennes par évaluation, moyenne annuelle,
 * présence et décision de fin d'année.
 *
 * Le taux de présence est calculé en DEMI-JOURNÉES (règle v36) : c'est
 * l'unité d'appel réellement utilisée par les écoles béninoises.
 */
export function exportAnnualReportPdf(
  classData: ClassData,
  evaluationLabels: string[],
  lines: AnnualLine[],
): void {
  const profile = getProfile();
  const pdf = makePdf({
    title: 'Bilan annuel',
    subtitle: `${classData.name} — ${classData.schoolYear || ''} · moyennes et présences`.trim(),
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    orientation: 'landscape',
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'L’enseignant(e)',
      stampSignature: true,
      date: today(),
    },
  });

  const columns: PdfColumn[] = [
    { header: 'Rang', width: 0.7, align: 'right' },
    { header: 'Nom et prénoms', width: 3 },
    ...evaluationLabels.map((l) => ({
      header: l.length > 10 ? l.slice(0, 9) + '.' : l,
      width: 1.1,
      align: 'right' as const,
    })),
    { header: 'Moy. annuelle', width: 1.3, align: 'right' as const },
    { header: 'Présence', width: 1.1, align: 'right' as const },
    { header: 'Abs.', width: 0.8, align: 'right' as const },
    { header: 'Décision', width: 1.4, align: 'center' as const },
  ];

  // Tri par rang, puis par moyenne décroissante pour les non classés.
  const sorted = [...lines].sort((a, b) => {
    if (a.rang && b.rang) return a.rang - b.rang;
    return (b.annual ?? -1) - (a.annual ?? -1);
  });

  const body: PdfRow[] = sorted.map((l) => {
    const cells: PdfRow = [
      l.rang ? String(l.rang) : '—',
      l.name,
    ];
    for (const v of l.perEval) {
      cells.push({ text: n2(v), danger: v !== null && v < 10 });
    }
    cells.push({ text: n2(l.annual), danger: l.annual !== null && l.annual < 10 });
    // Une présence sous 80 % est signalée : c'est un facteur d'échec majeur.
    cells.push({ text: `${Math.round(l.presence)} %`, danger: l.presence < 80 });
    cells.push(String(l.absences));
    // Sans moyenne annuelle, aucune décision ne peut être prononcée.
    if (l.annual === null) {
      cells.push({ text: 'Non évalué' });
    } else {
      const admis = l.annual >= 10;
      cells.push({ text: admis ? 'Admis(e)' : 'Reprise', danger: !admis });
    }
    return cells;
  });

  pdf.table(columns, body);

  /* Statistiques : seuls les élèves ayant une moyenne annuelle sont comptés,
     sinon les non-évalués feraient chuter artificiellement les taux. */
  const evalues = lines.filter((l) => l.annual !== null);
  const admis = evalues.filter((l) => (l.annual || 0) >= 10).length;
  const moyenneClasse = evalues.length > 0
    ? evalues.reduce((t, l) => t + (l.annual || 0), 0) / evalues.length
    : null;
  const presenceMoy = lines.length > 0
    ? lines.reduce((t, l) => t + l.presence, 0) / lines.length
    : 0;

  pdf.sectionTitle('Synthèse de la classe');
  pdf.keyValues([
    ['Effectif', String(lines.length)],
    ['Élèves évalués', String(evalues.length)],
    ['Moyenne de la classe', n2(moyenneClasse)],
    ['Admis (moyenne ≥ 10)', `${admis} sur ${evalues.length}`],
    ['Taux de réussite', evalues.length > 0 ? pct((admis / evalues.length) * 100) : '—'],
    ['Présence moyenne', `${Math.round(presenceMoy)} %`],
  ]);

  if (moyenneClasse !== null && moyenneClasse < 10) {
    pdf.alert(
      `La moyenne de la classe est inférieure à 10 sur 20 (${n2(moyenneClasse)}). `
      + `Un dispositif de remédiation collective est recommandé.`,
    );
  }

  pdf.paragraph(
    'Le taux de présence est calculé en demi-journées. Le mercredi ne compte '
    + 'qu’une seule demi-journée ; il n’y a pas de cours le samedi ni le dimanche.',
  );

  pdf.save(`bilan-annuel-${safeName(classData.name)}.pdf`);
}
