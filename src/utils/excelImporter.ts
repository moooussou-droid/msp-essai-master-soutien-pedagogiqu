import ExcelJS from 'exceljs';
import { Student, Subject, EvaluationId, ClassData, generateId, EVALUATIONS } from './database';

/**
 * Génère un modèle Excel vierge à réimporter.
 * - Primaire (défaut) : copie EXACTE du nouveau modèle officiel — une feuille par
 *   évaluation (« Evaluation formative 1 », « Evaluation sommative 1/2/3 ») avec
 *   l'en-tête sur 2 lignes (Matricule, Nom, Prénoms puis « Note obtenue » /
 *   « Note perf. ») et les matières de la classe.
 * - Autres niveaux : format simple Matricule / Nom / Prénoms.
 */
export async function generateStudentTemplate(classData?: ClassData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  const isPrimaryLike = !classData || (classData.educationType ?? 'primaire') === 'primaire';

  if (isPrimaryLike && classData && classData.subjects.length > 0) {
    const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);
    const evaluations = EVALUATIONS;

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

    const headerStyle: Partial<ExcelJS.Style> = {
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

    for (const ev of evaluations) {
      const sheet = workbook.addWorksheet(ev.sheetName);
      const baseCols = 3;
      const totalColumns = baseCols + subjects.length * 2;

      // Ligne 1 : Matricule / Nom / Prénoms (fusionnés sur 2 lignes) + matières (fusion jumelles)
      sheet.mergeCells('A1:A2');
      sheet.mergeCells('B1:B2');
      sheet.mergeCells('C1:C2');
      sheet.getCell('A1').value = 'Matricule';
      sheet.getCell('B1').value = 'Nom';
      sheet.getCell('C1').value = 'Prénoms';

      let col = 4;
      for (const subject of subjects) {
        const l1 = columnLetter(col);
        const l2 = columnLetter(col + 1);
        sheet.mergeCells(`${l1}1:${l2}1`);
        sheet.getCell(`${l1}1`).value = subject.name;
        // Ligne 2 : sous-colonnes du modèle officiel
        sheet.getCell(`${l1}2`).value = 'Note obtenue';
        sheet.getCell(`${l2}2`).value = 'Note perf.';
        col += 2;
      }

      for (let r = 1; r <= 2; r++) {
        for (let c = 1; c <= totalColumns; c++) {
          sheet.getCell(r, c).style = headerStyle;
        }
      }

      sheet.getColumn(1).width = 15;
      sheet.getColumn(1).numFmt = '@';
      sheet.getColumn(2).width = 20;
      sheet.getColumn(3).width = 24;
      for (let c = 4; c <= totalColumns; c++) {
        sheet.getColumn(c).width = 14;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  // Format simple (préscolaire / secondaire / classes sans matières)
  const worksheet = workbook.addWorksheet('Élèves');

  worksheet.getCell('A1').value = 'Matricule';
  worksheet.getCell('B1').value = 'Nom';
  worksheet.getCell('C1').value = 'Prénoms';

  // Style de l'en-tête
  ['A1', 'B1', 'C1'].forEach(ref => {
    const cell = worksheet.getCell(ref);
    cell.font = { bold: true, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' },
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Exemples
  const examples = [
    ['117042400', 'AMADOU', 'Tamou'],
    ['218042401', 'ASSOUMA', 'Assana'],
    ['117042308', 'AWALI', 'Moutiou'],
  ];
  examples.forEach((row, i) => {
    const rowNum = i + 2;
    const mat = worksheet.getCell(`A${rowNum}`);
    mat.value = row[0];
    mat.numFmt = '@';
    worksheet.getCell(`B${rowNum}`).value = row[1];
    worksheet.getCell(`C${rowNum}`).value = row[2];
  });

  worksheet.getColumn(1).width = 18;
  worksheet.getColumn(1).numFmt = '@';
  worksheet.getColumn(2).width = 22;
  worksheet.getColumn(3).width = 25;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Note lue dans le fichier, associée à un élève (par son id généré) et à un nom de matière. */
export interface ParsedNote {
  studentId: string; // id généré de l'élève importé
  subjectName: string; // nom brut de la matière dans le fichier
  subjectId?: string; // id de la matière de la classe correspondante (si trouvée)
  noteObtenue: number | null;
  notePerfectionnement: number | null;
  absent: boolean;
  evaluation?: EvaluationId; // évaluation déduite du nom de la feuille (si reconnue)
  sheetName: string; // feuille d'origine (diagnostic)
}

export interface ImportResult {
  students: Student[];
  errors: string[];
  totalRows: number;
  importedRows: number;
  // Notes détectées dans le fichier (si présentes)
  parsedNotes: ParsedNote[];
  detectedSubjects: string[]; // noms de matières détectés dans le fichier
  notesCount: number; // nombre de valeurs de notes détectées
  detectedEvaluations: string[]; // libellés des feuilles d'évaluation reconnues
}

/**
 * Normalise une chaîne pour comparaison (minuscules, sans accents, sans espaces)
 */
function normalize(str: string): string {
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/[^a-z0-9]/g, ''); // enlève espaces et ponctuation
}

/**
 * Déduit l'évaluation à partir du nom de la feuille du nouveau modèle officiel
 * (« Evaluation formative 1 », « Evaluation sommative 1|2|3 »). Tolère les
 * variantes : accents absents, « Eval », « Sommatif », espaces, etc.
 */
export function detectEvaluationFromSheetName(sheetName: string): EvaluationId | undefined {
  const n = normalize(sheetName);
  if (!n) return undefined;
  const compact = n.replace(/\s+/g, '');
  // Formative : le modèle officiel ne comporte qu'UNE évaluation formative.
  if (compact.includes('formative')) return 'formative1';
  // Sommative : repère le numéro 1, 2 ou 3 (avec ou sans espace/tiret).
  if (compact.includes('sommative') || compact.includes('sommatif')) {
    const m = compact.match(/(?:sommative|sommatif)[\s._-]*([123])/);
    if (m) return `sommative${m[1]}` as EvaluationId;
    return 'sommative1';
  }
  return undefined;
}

/**
 * Convertit une valeur de cellule ExcelJS en chaîne de texte propre.
 * Gère les nombres, chaînes, cellules riches, formules, etc.
 */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  
  // Nombre
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Chaîne simple
  if (typeof value === 'string') {
    return value.trim();
  }
  
  // Objet (texte riche, formule, hyperlink, date...)
  if (typeof value === 'object') {
    const obj = value as any;
    // Texte riche
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((rt: any) => rt.text).join('').trim();
    }
    // Formule avec résultat
    if (obj.result !== undefined && obj.result !== null) {
      return obj.result.toString().trim();
    }
    // Hyperlink
    if (obj.text !== undefined) {
      return obj.text.toString().trim();
    }
    // Date
    if (value instanceof Date) {
      return value.toString();
    }
  }
  
  return value.toString().trim();
}

/** Libellé court d'une feuille pour les messages d'erreur. */
function sheetLabel(index: number, name: string): string {
  return name ? `Feuille « ${name} »` : `Feuille ${index + 1}`;
}

/**
 * Importe une liste d'élèves (et leurs notes si présentes) depuis un fichier Excel.
 * Lit TOUTES les feuilles du fichier : le nouveau modèle officiel du primaire
 * contient une feuille par évaluation (« Evaluation formative 1 »,
 * « Evaluation sommative 1/2/3 »). Chaque feuille est associée à son évaluation
 * et les élèves sont dédupliqués entre les feuilles (même matricule).
 */
export async function importStudentsFromExcel(
  file: File,
  subjects: Subject[] = []
): Promise<ImportResult> {
  const result: ImportResult = {
    students: [],
    errors: [],
    totalRows: 0,
    importedRows: 0,
    parsedNotes: [],
    detectedSubjects: [],
    notesCount: 0,
    detectedEvaluations: [],
  };

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheets = workbook.worksheets;
  if (!worksheets || worksheets.length === 0) {
    result.errors.push('Aucune feuille de calcul trouvée dans le fichier.');
    return result;
  }

  // Clé de déduplication des élèves ENTRE les feuilles (matricule prioritaire,
  // sinon nom|prénoms normalisés). Toutes les feuilles du modèle officiel
  // listent les mêmes élèves : ils ne doivent être créés qu'une fois.
  const studentIdByKey = new Map<string, string>();
  // Lignes déjà signalées pour éviter les messages répétés sur chaque feuille.
  const reportedMatriculeDuplicates = new Set<string>();

  // Détection des en-têtes « Note obtenue » / « Note perf. » (ou « perfectionnement »)
  const isObtHeader = (text: string) =>
    text.includes('noteobtenue') ||
    text.includes('criteresminimaux') ||
    text === 'cm' ||
    text === 'note';

  const isPerfHeader = (text: string) =>
    text.includes('perfectionnement') ||
    text.includes('noteperfect') ||
    text.startsWith('noteperf') ||
    text === 'cp';

  for (let wsIndex = 0; wsIndex < worksheets.length; wsIndex++) {
    const worksheet = worksheets[wsIndex];
    const label = sheetLabel(wsIndex, worksheet.name);
    const evaluation = detectEvaluationFromSheetName(worksheet.name);
    if (evaluation && !result.detectedEvaluations.includes(worksheet.name)) {
      result.detectedEvaluations.push(worksheet.name);
    }

    // Étape 1 : trouver la ligne d'en-tête et les indices de colonnes
    let matriculeCol = -1;
    let nomCol = -1;
    let prenomsCol = -1;
    let headerRowNumber = -1;

    // On scanne les 5 premières lignes pour trouver les en-têtes
    const maxHeaderScan = Math.min(5, worksheet.rowCount);
    for (let rowNum = 1; rowNum <= maxHeaderScan; rowNum++) {
      const row = worksheet.getRow(rowNum);
      let foundInThisRow = 0;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = normalize(cellToString(cell.value));
        if (!text) return;

        if ((text === 'matricule' || text.includes('matricule')) && matriculeCol === -1) {
          matriculeCol = colNumber;
          foundInThisRow++;
        } else if ((text === 'nom' || text === 'noms') && nomCol === -1) {
          nomCol = colNumber;
          foundInThisRow++;
        } else if ((text === 'prenoms' || text === 'prenom') && prenomsCol === -1) {
          prenomsCol = colNumber;
          foundInThisRow++;
        }
      });

      if (foundInThisRow > 0 && headerRowNumber === -1) {
        headerRowNumber = rowNum;
      }
    }

    // Feuille sans en-tête ni données (ex. feuille de garde) : ignorée sans bruit
    const hasAnyContent = worksheet.rowCount > 2 && worksheet.getRow(3).cellCount > 0;
    if (matriculeCol === -1 && nomCol === -1 && prenomsCol === -1) {
      if (!hasAnyContent) {
        continue;
      }
      // Sans en-tête détecté, on suppose le format standard : A=Matricule, B=Nom, C=Prénoms
      matriculeCol = 1;
      nomCol = 2;
      prenomsCol = 3;
      headerRowNumber = 1;
      result.errors.push(
        `${label} : en-têtes non détectés, lecture par défaut des colonnes A (Matricule), B (Nom), C (Prénoms).`
      );
    } else {
      // Compléter les colonnes manquantes avec des positions par défaut logiques
      if (matriculeCol === -1) matriculeCol = 1;
      if (nomCol === -1) nomCol = 2;
      if (prenomsCol === -1) prenomsCol = 3;
    }

    // Étape 2 : déterminer la première ligne de données.
    // Dans le format officiel, la ligne 2 contient « Note obtenue / Note perf. ».
    // Les vraies données commencent donc après. On saute les lignes d'en-tête connues.
    let firstDataRow = headerRowNumber + 1;

    // Vérifier si la ligne suivante est une seconde ligne d'en-tête
    const nextRow = worksheet.getRow(firstDataRow);
    let looksLikeSubHeader = false;
    nextRow.eachCell({ includeEmpty: false }, (cell) => {
      const text = normalize(cellToString(cell.value));
      if (isObtHeader(text) || isPerfHeader(text)) {
        looksLikeSubHeader = true;
      }
    });
    if (looksLikeSubHeader) {
      firstDataRow++;
    }

    // Étape 2bis : détecter les colonnes de matières (pour importer les notes)
    interface SubjectColumn {
      name: string;
      matchedSubject?: Subject;
      obtenueCol: number;
      perfCol: number | null;
    }
    const subjectColumns: SubjectColumn[] = [];

    const headerRow = worksheet.getRow(headerRowNumber);
    const subHeaderRow = looksLikeSubHeader ? worksheet.getRow(headerRowNumber + 1) : null;

    // Récupère les positions des noms de matières dans la ligne d'en-tête (après Prénoms).
    // Important : dans certains fichiers exportés, ExcelJS peut répéter le nom d'une
    // matière dans les cellules fusionnées (ex. D1 et E1 = "Dictée"). On collapse donc
    // les doublons consécutifs pour garder un seul groupe de colonnes par matière.
    const subjectHeaders: { name: string; col: number }[] = [];
    let previousHeaderNorm = '';
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber <= prenomsCol) return;
      const raw = cellToString(cell.value).trim();
      if (!raw) return;
      const n = normalize(raw);
      // Exclure les en-têtes génériques (sous-colonnes)
      if (isObtHeader(n) || isPerfHeader(n) ||
          n === 'coefficient' || n === 'coef' || n === 'totalobtenu' || n === 'totalpossible' ||
          n === 'note' || n === 'total') {
        return;
      }
      if (n === previousHeaderNorm) return;
      previousHeaderNorm = n;
      subjectHeaders.push({ name: raw, col: colNumber });
    });

    // Fonction de correspondance d'une matière du fichier avec une matière de la classe
    function matchSubject(fileName: string): Subject | undefined {
      const target = normalize(fileName);
      // Correspondance exacte d'abord
      let found = subjects.find(s => normalize(s.name) === target);
      if (found) return found;
      // Correspondance partielle (l'un contient l'autre)
      found = subjects.find(s => {
        const sn = normalize(s.name);
        return sn.length > 2 && (sn.includes(target) || target.includes(sn));
      });
      return found;
    }

    // Pour chaque matière détectée, déterminer les colonnes obtenue / perfectionnement
    for (let i = 0; i < subjectHeaders.length; i++) {
      const { name, col } = subjectHeaders[i];
      const nextCol = i + 1 < subjectHeaders.length ? subjectHeaders[i + 1].col : worksheet.columnCount + 1;
      const span = nextCol - col; // nombre de colonnes pour cette matière

      let obtenueCol = col;
      let perfCol: number | null = span >= 2 ? col + 1 : null;

      // Si une sous-ligne d'en-tête existe, l'utiliser pour repérer les colonnes précisément
      if (subHeaderRow) {
        for (let c = col; c < nextCol; c++) {
          const sub = normalize(cellToString(subHeaderRow.getCell(c).value));
          if (isObtHeader(sub)) obtenueCol = c;
          else if (isPerfHeader(sub)) perfCol = c;
        }
      }

      subjectColumns.push({
        name,
        matchedSubject: matchSubject(name),
        obtenueCol,
        perfCol,
      });
    }

    // Ajoute les matières détectées à la liste globale (sans doublons)
    for (const sc of subjectColumns) {
      if (!result.detectedSubjects.includes(sc.name)) {
        result.detectedSubjects.push(sc.name);
      }
    }

    // Lit une valeur de note : nombre, ou "ABS"/"absent" -> absent
    function readNoteValue(rowObj: ExcelJS.Row, colNumber: number): { value: number | null; absent: boolean } {
      const raw = cellToString(rowObj.getCell(colNumber).value).trim();
      if (!raw) return { value: null, absent: false };
      const n = normalize(raw);
      if (n === 'abs' || n === 'absent') return { value: null, absent: true };
      const num = parseFloat(raw.replace(',', '.'));
      if (isNaN(num)) return { value: null, absent: false };
      return { value: num, absent: false };
    }

    // Étape 3 : lire les données élèves de la feuille
    for (let rowNum = firstDataRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const matricule = cellToString(row.getCell(matriculeCol).value)
        .replace(/^'+/, '') // enlève l'apostrophe de forçage texte
        .trim();
      const nom = cellToString(row.getCell(nomCol).value).trim();
      const prenoms = cellToString(row.getCell(prenomsCol).value).trim();

      // Ignorer les lignes complètement vides
      if (!matricule && !nom && !prenoms) {
        continue;
      }

      result.totalRows++;

      // Validation : au moins un nom requis
      if (!nom && !prenoms) {
        result.errors.push(`${label}, ligne ${rowNum} : nom et prénoms manquants.`);
        continue;
      }

      // Déduplication : un même élève présent dans plusieurs feuilles
      // (modèle officiel) doit être réutilisé, pas re-créé.
      const studentKey = matricule
        ? `M:${matricule}`
        : `N:${normalize(nom)}|${normalize(prenoms)}`;

      let studentId = studentIdByKey.get(studentKey);
      if (!studentId) {
        studentId = generateId();
        studentIdByKey.set(studentKey, studentId);
        result.students.push({
          id: studentId,
          matricule: matricule || `SANS-MAT-${result.students.length + 1}`,
          nom: nom.toUpperCase(),
          prenoms: prenoms,
          createdAt: Date.now() + result.students.length, // ordre stable
        });
        result.importedRows++;
      } else if (matricule && result.students.length > 0 && !reportedMatriculeDuplicates.has(studentKey)) {
        // Élève déjà vu dans une autre feuille : normal, on ne signale qu'une fois.
        reportedMatriculeDuplicates.add(studentKey);
      }

      // Lire les notes de cet élève pour chaque matière détectée
      for (const sc of subjectColumns) {
        const obt = readNoteValue(row, sc.obtenueCol);
        const perf = sc.perfCol !== null ? readNoteValue(row, sc.perfCol) : { value: null, absent: false };

        const absent = obt.absent || perf.absent;
        const hasValue = obt.value !== null || perf.value !== null || absent;
        if (!hasValue) continue; // aucune note pour cette matière

        result.parsedNotes.push({
          studentId,
          subjectName: sc.name,
          subjectId: sc.matchedSubject?.id,
          noteObtenue: obt.value,
          notePerfectionnement: perf.value,
          absent,
          evaluation,
          sheetName: worksheet.name,
        });
        result.notesCount++;
      }
    }
  }

  if (result.students.length === 0 && result.totalRows === 0) {
    result.errors.push('Aucun élève trouvé dans le fichier. Vérifiez le format.');
  }

  return result;
}
