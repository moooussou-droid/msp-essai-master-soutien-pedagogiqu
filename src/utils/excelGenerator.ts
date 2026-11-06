import ExcelJS from 'exceljs';
import { ClassData, Subject, Note, EvaluationId, sortStudents, EVALUATIONS, findBestNote, findNoteInEvaluation } from './database';

const OFFICIAL_SUBJECT_ORDER = [
  'Dictée',
  'Math',
  'Mathématiques',
  'Expresion écrite',
  'Expression écrite',
  'Compréhension de l\'écrit',
  'EST',
  'ES',
  'EA (Oral)',
  'EA (Déssin/Couture)',
  'EA (Dessin/Couture)',
  'EPS',
  'Communication écrite',
  'Lecture',
  'PCT',
  'Allemand ou Espagnol',
  'Histoire-Géographie',
  'Anglais',
  'SVT',
  'Philosophie',
  'LV1',
  'LV2',
  'Economie',
  'Conduite',
  'Français',
];

function normalizeSubjectName(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function sortSubjectsForEducMaster(subjects: Subject[]) {
  return [...subjects].sort((a, b) => {
    const ai = OFFICIAL_SUBJECT_ORDER.findIndex(name => normalizeSubjectName(name) === normalizeSubjectName(a.name));
    const bi = OFFICIAL_SUBJECT_ORDER.findIndex(name => normalizeSubjectName(name) === normalizeSubjectName(b.name));
    const ar = ai === -1 ? 999 + a.order : ai;
    const br = bi === -1 ? 999 + b.order : bi;
    return ar - br;
  });
}

/** Note d'un élève dans une évaluation donnée (null si absente). */
function noteFor(notes: Note[], studentId: string, subjectId: string, evaluation?: EvaluationId): Note | undefined {
  if (evaluation) {
    // Feuille d'évaluation précise : règle de compatibilité centralisée
    // (les notes historiques sans évaluation → « Evaluation sommative 1 »).
    return findNoteInEvaluation(notes, studentId, subjectId, evaluation);
  }
  // Feuille unique (préscolaire/secondaire) : note de référence.
  return findBestNote(notes, studentId, subjectId);
}

/** En-tête bleu du modèle officiel (identique au modèle vierge téléchargeable). */
const OFFICIAL_HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
};

const DATA_STYLE: Partial<ExcelJS.Style> = {
  font: { size: 10, name: 'Arial' },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

function columnLetter(index: number): string {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Remplit une feuille du classeur (en-tête 2 lignes + élèves + notes). */
function fillSheet(
  worksheet: ExcelJS.Worksheet,
  subjects: Subject[],
  students: ReturnType<typeof sortStudents>,
  notes: Note[],
  evaluation: EvaluationId | undefined
) {
  const baseColumns = 3;
  const totalColumns = baseColumns + subjects.length * 2;

  worksheet.mergeCells('A1:A2');
  worksheet.mergeCells('B1:B2');
  worksheet.mergeCells('C1:C2');

  worksheet.getCell('A1').value = 'Matricule';
  worksheet.getCell('B1').value = 'Nom';
  worksheet.getCell('C1').value = 'Prénoms';

  let currentCol = 4; // Start at column D (4th column)

  for (const subject of subjects) {
    const colLetter1 = columnLetter(currentCol);
    const colLetter2 = columnLetter(currentCol + 1);

    // Merge cells for subject name
    worksheet.mergeCells(`${colLetter1}1:${colLetter2}1`);
    worksheet.getCell(`${colLetter1}1`).value = subject.name;

    // Sub-headers du modèle officiel
    worksheet.getCell(`${colLetter1}2`).value = 'Note obtenue';
    worksheet.getCell(`${colLetter2}2`).value = 'Note perf.';

    currentCol += 2;
  }

  for (let row = 1; row <= 2; row++) {
    for (let col = 1; col <= totalColumns; col++) {
      worksheet.getCell(row, col).style = OFFICIAL_HEADER_STYLE;
    }
  }

  students.forEach((student, index) => {
    const rowNum = index + 3; // Start at row 3 (after 2 header rows)

    // Matricule en TEXTE pour préserver les zéros initiaux (comme le modèle EducMaster)
    const matriculeCell = worksheet.getCell(`A${rowNum}`);
    matriculeCell.value = student.matricule;
    matriculeCell.numFmt = '@';

    worksheet.getCell(`B${rowNum}`).value = student.nom.toUpperCase();
    worksheet.getCell(`C${rowNum}`).value = student.prenoms;

    // Notes de CETTE évaluation (ou note de référence pour la feuille unique)
    let colIndex = 4;
    for (const subject of subjects) {
      const note = noteFor(notes, student.id, subject.id, evaluation);

      const noteObtenueCell = worksheet.getCell(rowNum, colIndex);
      const notePerfCell = worksheet.getCell(rowNum, colIndex + 1);

      if (note?.absent) {
        noteObtenueCell.value = 'ABS';
        notePerfCell.value = 'ABS';
      } else if (note) {
        noteObtenueCell.value = note.noteObtenue ?? '';
        notePerfCell.value = note.notePerfectionnement ?? '';
      }

      colIndex += 2;
    }
  });

  const totalRows = students.length + 2;
  for (let row = 3; row <= totalRows; row++) {
    for (let col = 1; col <= totalColumns; col++) {
      const cell = worksheet.getCell(row, col);
      if (!cell.value || cell.value === '') cell.style = DATA_STYLE;
      else cell.style = DATA_STYLE;
    }
  }

  worksheet.getColumn(1).width = 15; // Matricule
  worksheet.getColumn(1).numFmt = '@'; // colonne Matricule en texte
  worksheet.getColumn(2).width = 20; // Nom
  worksheet.getColumn(3).width = 25; // Prénoms

  for (let i = 4; i <= totalColumns; i++) {
    worksheet.getColumn(i).width = 14;
  }
}

export async function generateEducMasterExcel(classData: ClassData): Promise<{ blob: Blob; filename: string }> {
  const workbook = new ExcelJS.Workbook();

  // Export toujours dans l'ordre officiel exigé par EducMaster, même si l'enseignant
  // a réorganisé les matières pour faciliter sa saisie dans l'application.
  const subjects: Subject[] = sortSubjectsForEducMaster(classData.subjects);
  const sortedStudents = sortStudents(classData.students);

  const isPrimary = (classData.educationType ?? 'primaire') === 'primaire';

  if (isPrimary) {
    // MODÈLE OFFICIEL DU PRIMAIRE : une feuille par évaluation
    // (Evaluation formative 1, Evaluation sommative 1/2/3 — noms exacts sans
    // accents), en-tête bleu sur 2 lignes, lignes d'en-tête figées.
    for (const ev of EVALUATIONS) {
      const worksheet = workbook.addWorksheet(ev.sheetName, { views: [{ state: 'frozen', ySplit: 2 }] });
      fillSheet(worksheet, subjects, sortedStudents, classData.notes, ev.id);
    }
  } else {
    // Préscolaire / secondaire : feuille unique (la note de référence est utilisée).
    const worksheet = workbook.addWorksheet('Notes');
    fillSheet(worksheet, subjects, sortedStudents, classData.notes, undefined);
  }

  // Generate filename — horodatage en HEURE LOCALE (le Bénin est UTC+1 :
  // toISOString() aurait pu afficher la veille après minuit).
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const year = now.getFullYear();
  const schoolSafe = classData.school.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const classSafe = classData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  const filename = `${timestamp}_model-importation-note_${year}-epp-${schoolSafe}-${classSafe}.xlsx`;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, filename };
}

/**
 * Télécharge (ou partage) le fichier Excel de façon fiable sur mobile ET ordinateur.
 * - Sur mobile : privilégie l'API de partage native (enregistrer dans Fichiers,
 *   envoyer via WhatsApp/Drive/email...).
 * - Partout : repli sur un téléchargement classique robuste (URL libérée avec délai).
 * Retourne une info sur la méthode utilisée.
 */
export async function downloadExcel(
  blob: Blob,
  filename: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  // 1) Essayer l'API de partage native (idéale sur téléphone)
  try {
    const file = new File([blob], filename, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
    };

    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: 'Notes EducMaster',
          text: 'Fichier de notes à importer sur educmaster.bj',
        });
        return 'shared';
      } catch (shareErr) {
        // L'utilisateur a annulé le partage : on ne bascule PAS en téléchargement
        if ((shareErr as Error)?.name === 'AbortError') {
          return 'cancelled';
        }
        // Autre erreur de partage : on continue vers le téléchargement classique
      }
    }
  } catch {
    // File API indisponible : on continue vers le téléchargement classique
  }

  // 2) Téléchargement classique robuste
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Libérer l'URL APRÈS un délai pour laisser le temps au téléchargement de démarrer
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 4000);

  return 'downloaded';
}
