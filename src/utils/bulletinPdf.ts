/**
 * BULLETINS — vraie génération PDF (v44).
 *
 * Jusqu'ici, « Imprimer / PDF » n'ouvrait que la boîte d'impression du
 * navigateur : sur Android, l'enseignant devait passer par « Enregistrer au
 * format PDF », étape que beaucoup ne trouvent pas. Ce module fabrique un
 * vrai fichier .pdf, hors ligne, comme le fait déjà la cantine (v41) et la
 * comptabilité (v42).
 *
 * L'IMPRESSION EST CONSERVÉE : les deux boutons coexistent (règle v41).
 *
 * Le document produit porte la signature officielle de l'application
 * (v42), personnalisable contre 500 FCFA.
 *
 * Deux mises en page, parce que les deux bulletins officiels béninois ne
 * portent pas les mêmes colonnes :
 *   - PRIMAIRE   : Matière | CM | CP | Total /20 | Appréciation
 *   - SECONDAIRE : Matière | MEPE | NPS1 | NPS2 | MS | Coef | Total | MSC | Rang
 */
import { makePdf, PdfBuilder, PdfColumn, PdfRow } from './pdfMaker';
import { ClassData, isSecondaire } from './database';
import { StudentBulletin } from './bulletin';
import { getProfile } from './userProfile';
import {
  classPreschoolTrimester, getPreschoolEvaluation, isPrescolaireClass,
  loadPreschoolEvaluations,
} from './prescolaireBulletin';
import {
  exportPreschoolBulletinPdf, exportPreschoolClassBulletinsPdf,
  exportPreschoolSummaryPdf,
} from './prescolaireBulletinExport';

/** Affiche une note, ou un tiret si elle est absente. */
function n2(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toFixed(2).replace('.', ',');
}

/** Affiche un entier, ou un tiret. */
function n0(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return String(Math.round(v));
}

/** Date française du jour. */
function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Appréciation courte par matière, déduite de la note sur 20. */
function subjectAppreciation(total: number | null, absent: boolean): string {
  if (absent) return 'Absent';
  if (total === null) return '—';
  if (total >= 18) return 'Excellent';
  if (total >= 16) return 'Très bien';
  if (total >= 14) return 'Bien';
  if (total >= 12) return 'Assez bien';
  if (total >= 10) return 'Passable';
  if (total >= 8) return 'Insuffisant';
  return 'Faible';
}

/** Intitulé de l'évaluation, pour le sous-titre du document. */
function evaluationLabel(evaluation?: string): string {
  if (!evaluation || evaluation === 'all') return 'Toutes les évaluations';
  const known: Record<string, string> = {
    formative1: 'Évaluation formative 1',
    sommative1: 'Évaluation sommative 1',
    sommative2: 'Évaluation sommative 2',
    sommative3: 'Évaluation sommative 3',
  };
  return known[evaluation] || evaluation;
}

/**
 * Écrit le corps d'UN bulletin dans le document.
 * Séparé de la fonction d'export pour pouvoir enchaîner plusieurs élèves
 * dans un même fichier (export de toute une classe).
 */
function writeBulletin(
  pdf: PdfBuilder,
  classData: ClassData,
  b: StudentBulletin,
  evaluation?: string,
): void {
  const secondaire = isSecondaire(classData);

  pdf.sectionTitle(`${b.student.nom} ${b.student.prenoms}`.trim());

  pdf.keyValues([
    ['Matricule', b.student.matricule || '—'],
    ['Classe', `${classData.name} (${classData.level})`],
    ['Année scolaire', classData.schoolYear || '—'],
    ['Évaluation', evaluationLabel(evaluation)],
    ['Effectif de la classe', String(b.effectif)],
  ]);

  if (secondaire) {
    /*
     * Bulletin du secondaire : colonnes officielles.
     * MEPE = interrogations écrites, NPS1/NPS2 = devoirs surveillés,
     * MS = moyenne semestrielle de la matière, MSC = moyenne de la classe.
     */
    const cols: PdfColumn[] = [
      { header: 'Matière', width: 3.4 },
      { header: 'MEPE', width: 1, align: 'right' },
      { header: 'NPS1', width: 1, align: 'right' },
      { header: 'NPS2', width: 1, align: 'right' },
      { header: 'MS', width: 1, align: 'right' },
      { header: 'Coef', width: 0.8, align: 'right' },
      { header: 'Total', width: 1.1, align: 'right' },
      { header: 'MSC', width: 1, align: 'right' },
      { header: 'Rang', width: 0.9, align: 'right' },
    ];
    const rows: PdfRow[] = b.results.map((r) => [
      r.subject.name,
      n2(r.mepe),
      n2(r.nps1),
      n2(r.nps2),
      { text: n2(r.ms), bold: true, danger: r.ms !== null && r.ms < 10 },
      n0(r.coefficient),
      n2(r.totalObtenu),
      n2(r.msc),
      r.subjectRang > 0 ? String(r.subjectRang) : '—',
    ]);
    rows.push([
      { text: 'TOTAUX', bold: true }, '', '', '', '',
      { text: n0(b.totalCoef), bold: true },
      { text: n2(b.totalPoints), bold: true },
      '', '',
    ]);
    pdf.table(cols, rows);
  } else {
    /*
     * Bulletin du primaire : CM (critères minimaux) + CP
     * (perfectionnement), ramenés sur 20.
     */
    const cols: PdfColumn[] = [
      { header: 'Matière', width: 3.6 },
      { header: 'CM', width: 1.1, align: 'right' },
      { header: 'CP', width: 1.1, align: 'right' },
      { header: 'Total /20', width: 1.4, align: 'right' },
      { header: 'Appréciation', width: 2.4 },
    ];
    const rows: PdfRow[] = b.results.map((r) => [
      r.subject.name,
      r.absent ? 'Abs.' : n2(r.cm),
      r.absent ? 'Abs.' : n2(r.cp),
      { text: n2(r.total), bold: true, danger: r.total !== null && r.total < 10 },
      subjectAppreciation(r.total, r.absent),
    ]);
    pdf.table(cols, rows);
  }

  /* --- Bilan par groupe de matières, s'il existe --- */
  const withGroups = (b as StudentBulletin & { groupBilans?: { label: string; moyenne: number | null; count: number }[] });
  if (Array.isArray(withGroups.groupBilans) && withGroups.groupBilans.length > 0) {
    pdf.sectionTitle('Bilan par groupe de matières');
    pdf.table(
      [
        { header: 'Groupe', width: 4 },
        { header: 'Matières', width: 1.4, align: 'right' },
        { header: 'Moyenne /20', width: 1.8, align: 'right' },
      ],
      withGroups.groupBilans.map((g) => [g.label, String(g.count), n2(g.moyenne)]),
    );
  }

  /* --- Synthèse --- */
  pdf.sectionTitle('Résultat général');
  pdf.keyValues([
    ['Moyenne générale', `${n2(b.moyenne)} / 20`],
    ['Rang', b.rang > 0 ? `${b.rang}${b.rang === 1 ? 'er' : 'e'} sur ${b.effectif}` : '—'],
    ['Mention', b.mention || '—'],
  ]);

  // Une moyenne sous 10 est signalee : l'information ne doit pas se perdre
  // au milieu du tableau.
  if (b.moyenne !== null && b.moyenne < 10) {
    pdf.alert(
      `Moyenne inférieure à 10/20 : un accompagnement est recommandé pour ${b.student.prenoms}.`,
    );
  }

  if (b.appreciation) {
    pdf.paragraph(`Appréciation : ${b.appreciation}`);
  }
}

/** Nom de fichier sûr, sans accent ni caractère spécial. */
function safeName(s: string): string {
  return (s || 'bulletin')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'bulletin';
}

/**
 * Exporte le bulletin d'UN élève en vrai fichier PDF.
 */
export function exportBulletinPdf(
  classData: ClassData,
  bulletin: StudentBulletin,
  evaluation?: string,
): void {
  // v67 — le PDF de maternelle reproduit le livret TS/S/PS en deux pages.
  if (isPrescolaireClass(classData)) {
    const trimester = classPreschoolTrimester(classData);
    exportPreschoolBulletinPdf(
      classData,
      bulletin.student,
      getPreschoolEvaluation(classData.id, bulletin.student.id, trimester),
    );
    return;
  }
  const profile = getProfile();
  const sec = isSecondaire(classData);
  const pdf = makePdf({
    title: 'Bulletin scolaire',
    subtitle: `${classData.name} — ${classData.schoolYear || ''}`.trim(),
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    signature: {
      // Secondaire : le Directeur signe seul (pas de co-signature enseignant).
      preparedBy: sec ? undefined : (profile.teacherName || undefined),
      role: sec ? 'Le Directeur' : 'L’enseignant(e)',
      stampSignature: true,
      directorOnly: sec,
      date: today(),
    },
  });

  writeBulletin(pdf, classData, bulletin, evaluation);

  const nom = safeName(`${bulletin.student.nom}-${bulletin.student.prenoms}`);
  pdf.save(`bulletin-${nom}.pdf`);
}

/**
 * Exporte les bulletins de TOUTE la classe dans un seul fichier PDF,
 * un élève par page.
 *
 * C'est le besoin réel de l'enseignant en fin d'évaluation : un document
 * unique à imprimer d'un coup, plutôt que trente fichiers séparés.
 */
export function exportClassBulletinsPdf(
  classData: ClassData,
  bulletins: StudentBulletin[],
  evaluation?: string,
): void {
  if (isPrescolaireClass(classData)) {
    exportPreschoolClassBulletinsPdf(
      classData,
      loadPreschoolEvaluations(),
      classPreschoolTrimester(classData),
    );
    return;
  }
  const profile = getProfile();
  const sec = isSecondaire(classData);
  const pdf = makePdf({
    title: 'Bulletins scolaires',
    subtitle: `${classData.name} — ${evaluationLabel(evaluation)}`,
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    intro: `${bulletins.length} élève(s) — année scolaire ${classData.schoolYear || '—'}.`,
    signature: {
      // Secondaire : le Directeur signe seul (pas de co-signature enseignant).
      preparedBy: sec ? undefined : (profile.teacherName || undefined),
      role: sec ? 'Le Directeur' : 'L’enseignant(e)',
      stampSignature: true,
      directorOnly: sec,
      date: today(),
    },
  });

  bulletins.forEach((b, i) => {
    // Un eleve par page : le premier continue sur la page d'en-tete.
    if (i > 0) pdf.pageBreak();
    writeBulletin(pdf, classData, b, evaluation);
  });

  pdf.save(`bulletins-${safeName(classData.name)}.pdf`);
}

/**
 * Récapitulatif de la classe : une ligne par élève, classée par rang.
 * Document de travail du directeur et du conseil de classe.
 */
export function exportClassSummaryPdf(
  classData: ClassData,
  bulletins: StudentBulletin[],
  evaluation?: string,
): void {
  if (isPrescolaireClass(classData)) {
    exportPreschoolSummaryPdf(
      classData,
      loadPreschoolEvaluations(),
      classPreschoolTrimester(classData),
    );
    return;
  }
  const profile = getProfile();
  const pdf = makePdf({
    title: 'Récapitulatif des résultats',
    subtitle: `${classData.name} — ${evaluationLabel(evaluation)}`,
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    orientation: 'landscape',
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'L’enseignant(e)',
      stampSignature: true,
      date: today(),
    },
  });

  const sorted = [...bulletins].sort((a, b) => {
    if (a.rang > 0 && b.rang > 0) return a.rang - b.rang;
    return (b.moyenne ?? -1) - (a.moyenne ?? -1);
  });

  pdf.table(
    [
      { header: 'Rang', width: 0.8, align: 'right' },
      { header: 'Nom et prénoms', width: 4 },
      { header: 'Moyenne /20', width: 1.5, align: 'right' },
      { header: 'Mention', width: 2 },
    ],
    sorted.map((b) => [
      b.rang > 0 ? String(b.rang) : '—',
      `${b.student.nom} ${b.student.prenoms}`.trim(),
      { text: n2(b.moyenne), bold: true, danger: b.moyenne !== null && b.moyenne < 10 },
      b.mention || '—',
    ]),
  );

  /*
   * Statistiques de classe. On ne compte QUE les eleves ayant une moyenne :
   * inclure les eleves sans note ferait baisser artificiellement la moyenne
   * generale et le taux de reussite.
   */
  const notes = sorted.map((b) => b.moyenne).filter((m): m is number => m !== null);
  if (notes.length > 0) {
    const moyenneClasse = notes.reduce((t, v) => t + v, 0) / notes.length;
    const admis = notes.filter((m) => m >= 10).length;
    pdf.sectionTitle('Statistiques de la classe');
    pdf.keyValues([
      ['Élèves évalués', `${notes.length} sur ${bulletins.length}`],
      ['Moyenne de la classe', `${n2(moyenneClasse)} / 20`],
      ['Plus forte moyenne', `${n2(Math.max(...notes))} / 20`],
      ['Plus faible moyenne', `${n2(Math.min(...notes))} / 20`],
      ['Moyennes ≥ 10', `${admis} élève(s) — ${Math.round((admis / notes.length) * 100)} %`],
    ]);
  } else {
    pdf.paragraph('Aucune moyenne disponible : aucune note n’a encore été saisie.');
  }

  pdf.save(`recapitulatif-${safeName(classData.name)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* TABLEAU DES NOTES (PV de classe) — v45                              */
/* ------------------------------------------------------------------ */

/**
 * PV DE CLASSE EN PDF.
 *
 * L'écran « Tableau des notes » affichait une vue d'ensemble très utile
 * (une ligne par élève, une colonne par matière, moyenne et seuil) mais
 * ne proposait AUCUN export : ni PDF, ni impression. L'enseignant ne
 * pouvait donc pas emporter ce PV en conseil de classe.
 *
 * Ce document reprend exactement les colonnes de l'écran :
 *   - PRIMAIRE   : une colonne par matière (total /20), matières validées
 *                  (seuil officiel : au moins 6 matières ≥ 10)
 *   - SECONDAIRE : une colonne par matière (moyenne /20), moyenne générale
 *
 * Orientation PAYSAGE : au-delà de quatre matières, le portrait serrerait
 * trop les colonnes pour rester lisible.
 */
export function exportNotesTablePdf(
  classData: ClassData,
  bulletins: StudentBulletin[],
  evaluation?: string,
): void {
  // Pas de PV de notes au préscolaire : on produit la synthèse d’observations.
  if (isPrescolaireClass(classData)) {
    exportPreschoolSummaryPdf(
      classData,
      loadPreschoolEvaluations(),
      classPreschoolTrimester(classData),
    );
    return;
  }
  const profile = getProfile();
  const primaire = !isSecondaire(classData);
  const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);

  const pdf = makePdf({
    title: 'Tableau des notes (PV de classe)',
    subtitle: `${classData.name} — ${evaluationLabel(evaluation)}`,
    establishment: classData.school || profile.schoolName || 'Mon établissement',
    orientation: 'landscape',
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'L’enseignant(e)',
      stampSignature: true,
      date: today(),
    },
  });

  /*
   * Le seuil de réussite n'a pas la même définition aux deux niveaux ; on
   * reprend celle de l'écran pour que le PDF et l'affichage concordent.
   */
  const seuilAtteint = (b: StudentBulletin): boolean =>
    primaire
      ? b.results.filter((r) => (r.total ?? 0) >= 10).length >= 6
      : (b.moyenne ?? 0) >= 10;

  const columns: PdfColumn[] = [
    { header: 'Nom et prénoms', width: 3 },
    ...subjects.map((s) => ({
      header: s.name.length > 12 ? s.name.slice(0, 11) + '.' : s.name,
      width: 1.1,
      align: 'right' as const,
    })),
    { header: primaire ? 'Validées' : 'Moyenne', width: 1.2, align: 'right' as const },
    { header: 'Seuil', width: 1.2, align: 'center' as const },
  ];

  const rows: PdfRow[] = bulletins.map((b) => {
    const cells: PdfRow = [`${b.student.nom} ${b.student.prenoms}`.trim()];

    for (const s of subjects) {
      const r = b.results.find((x) => x.subject.id === s.id);
      if (!r || r.absent) {
        cells.push({ text: r?.absent ? 'Abs.' : '—' });
      } else {
        const note = r.total;
        cells.push({ text: n2(note), danger: note !== null && note < 10 });
      }
    }

    if (primaire) {
      const validated = b.results.filter((r) => (r.total ?? 0) >= 10).length;
      cells.push({ text: `${validated}/${subjects.length}` });
    } else {
      cells.push({ text: n2(b.moyenne), danger: (b.moyenne ?? 0) < 10 });
    }

    const ok = seuilAtteint(b);
    cells.push({ text: ok ? 'Atteint' : 'Non atteint', danger: !ok });
    return cells;
  });

  pdf.table(columns, rows);

  /* Statistiques de classe — mêmes conventions que le récapitulatif v44 :
     seuls les élèves effectivement notés entrent dans les moyennes. */
  const notes = bulletins.map((b) => b.moyenne).filter((m): m is number => m !== null && Number.isFinite(m));
  const nbSeuil = bulletins.filter(seuilAtteint).length;
  const effectif = bulletins.length;

  pdf.sectionTitle('Statistiques de la classe');
  pdf.keyValues([
    ['Effectif', String(effectif)],
    ['Seuil atteint', `${nbSeuil} élève(s) sur ${effectif}`],
    ['Taux de réussite', effectif > 0 ? `${Math.round((nbSeuil / effectif) * 100)} %` : '—'],
    ['Moyenne de la classe', notes.length > 0
      ? n2(notes.reduce((t, v) => t + v, 0) / notes.length)
      : '—'],
  ]);

  if (primaire) {
    pdf.paragraph(
      'Seuil officiel du primaire : un élève atteint le seuil lorsqu’au moins '
      + '6 matières sont validées (note supérieure ou égale à 10 sur 20).',
    );
  }

  /*
   * v50 : le nom du fichier porte l'evaluation. Sans cela, telecharger le
   * PV de la sommative 1 puis celui de la sommative 2 produisait deux
   * fichiers de MEME nom, le second ecrasant le premier sur le telephone.
   */
  const suffixeEval = evaluation ? `-${safeName(evaluation)}` : '';
  pdf.save(`tableau-notes-${safeName(classData.name)}${suffixeEval}.pdf`);
}
