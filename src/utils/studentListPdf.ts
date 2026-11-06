import type { ClassData, Student } from './database';

export const STUDENT_PDF_MAX_BYTES = 30 * 1024 * 1024;
export const STUDENT_PDF_MAX_PAGES = 60;

export interface PdfRosterToken {
  text: string;
  x: number;
  y: number;
  width?: number;
  confidence?: number;
}

export interface StudentListDraft {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: '' | 'F' | 'M';
  rawLine: string;
}

export interface StudentPdfExtraction {
  students: StudentListDraft[];
  pages: number;
  textPages: number;
  ocrPages: number;
  source: 'texte PDF' | 'OCR local' | 'mixte';
  warnings: string[];
}

interface HeaderColumn {
  field: 'matricule' | 'nom' | 'prenoms' | 'sexe' | 'fullName';
  x: number;
}

function fold(value: string): string {
  return (value || '').toLocaleLowerCase('fr-FR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function cleanText(value: string): string {
  return (value || '').replace(/[|¦]/g, ' ').replace(/\s+/g, ' ').trim();
}

function fieldForHeader(value: string): HeaderColumn['field'] | null {
  const normalized = fold(value);
  if (!normalized) return null;
  if (/(prenom|first name)/.test(normalized)) {
    return /\bnom\b/.test(normalized) && /\bprenom/.test(normalized) ? 'fullName' : 'prenoms';
  }
  if (/(matricule|matric|identifiant)/.test(normalized)) return 'matricule';
  if (/\b(sexe|genre)\b/.test(normalized)) return 'sexe';
  if (/\b(nom|noms|surname|lastname)\b/.test(normalized)) return 'nom';
  return null;
}

function isHeaderRow(tokens: PdfRosterToken[]): HeaderColumn[] | null {
  const found = tokens
    .map(token => ({ field: fieldForHeader(token.text), x: token.x }))
    .filter((item): item is HeaderColumn => Boolean(item.field));
  const fields = new Set(found.map(item => item.field));
  const hasSplitNames = fields.has('nom') && fields.has('prenoms');
  const hasCombinedName = fields.has('fullName');
  if (!hasSplitNames && !hasCombinedName) return null;
  // Un tableau sans véritable entête d'élève (par ex. un titre) ne sert pas de repère.
  return found;
}

function groupTokens(tokens: PdfRosterToken[], tolerance = 8): PdfRosterToken[][] {
  const sorted = tokens
    .filter(token => cleanText(token.text))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: { y: number; tokens: PdfRosterToken[] }[] = [];
  for (const token of sorted) {
    let row = rows.find(candidate => Math.abs(candidate.y - token.y) <= tolerance);
    if (!row) {
      row = { y: token.y, tokens: [] };
      rows.push(row);
    }
    row.tokens.push(token);
    row.y = row.tokens.reduce((sum, item) => sum + item.y, 0) / row.tokens.length;
  }
  return rows
    .sort((a, b) => a.y - b.y)
    .map(row => row.tokens.sort((a, b) => a.x - b.x));
}

function splitFullName(value: string): { nom: string; prenoms: string } {
  const words = cleanText(value).split(' ').filter(Boolean);
  if (words.length < 2) return { nom: words[0] || '', prenoms: '' };
  return { nom: words[0], prenoms: words.slice(1).join(' ') };
}

function parseMappedRow(tokens: PdfRosterToken[], headers: HeaderColumn[]): Omit<StudentListDraft, 'id' | 'rawLine'> | null {
  const ordered = [...headers].sort((a, b) => a.x - b.x);
  if (!ordered.length) return null;
  const boundaries = ordered.map((item, index) => ({
    ...item,
    left: index === 0 ? -Infinity : (ordered[index - 1].x + item.x) / 2,
    right: index === ordered.length - 1 ? Infinity : (item.x + ordered[index + 1].x) / 2,
  }));
  const cells = new Map<HeaderColumn['field'], string[]>();
  for (const token of tokens) {
    const column = boundaries.reduce((best, candidate) =>
      Math.abs(candidate.x - token.x) < Math.abs(best.x - token.x) ? candidate : best,
    boundaries[0]);
    const value = cleanText(token.text);
    if (!value) continue;
    cells.set(column.field, [...(cells.get(column.field) || []), value]);
  }
  const join = (field: HeaderColumn['field']) => cleanText((cells.get(field) || []).join(' '));
  let nom = join('nom');
  let prenoms = join('prenoms');
  const fullName = join('fullName');
  if ((!nom || !prenoms) && fullName) {
    const split = splitFullName(fullName);
    nom ||= split.nom;
    prenoms ||= split.prenoms;
  }
  nom = nom.replace(/^(nom|noms)\s*:?\s*/i, '').trim();
  prenoms = prenoms.replace(/^(pr[eé]noms?)\s*:?\s*/i, '').trim();
  const matricule = join('matricule').replace(/^(matricule|matric)\s*:?\s*/i, '').trim();
  const sexeText = fold(join('sexe'));
  const sexe: StudentListDraft['sexe'] = /^(f|feminin|fille)$/.test(sexeText) ? 'F'
    : /^(m|masculin|garcon)$/.test(sexeText) ? 'M' : '';
  if (!nom && !prenoms) return null;
  if (fold(`${nom} ${prenoms}`).length < 2) return null;
  return { matricule, nom, prenoms, sexe };
}

function parseFreeLine(tokens: PdfRosterToken[]): Omit<StudentListDraft, 'id' | 'rawLine'> | null {
  let raw = cleanText(tokens.sort((a, b) => a.x - b.x).map(token => token.text).join(' '));
  const normalized = fold(raw);
  if (!raw || /^(page|total|effectif|liste des eleves|liste eleves|nom prenom|noms prenoms)\b/.test(normalized)) return null;
  if (/\b(matricule|nom|prenoms?|sexe|genre)\b/.test(normalized) && normalized.split(' ').length <= 9) return null;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  let matricule = '';
  // Retire un numéro de matricule seulement s'il est long ou si le tableau le présente explicitement.
  if (/^\d{5,}$/.test(parts[0])) matricule = parts.shift() || '';
  // Les numéros de rang 1, 01, 1. sont ignorés, jamais pris pour un matricule.
  if (/^\d{1,3}[.)-]?$/.test(parts[0] || '')) parts.shift();
  const tail = fold(parts[parts.length - 1] || '');
  let sexe: StudentListDraft['sexe'] = '';
  if (/^(f|feminin|fille)$/.test(tail)) { sexe = 'F'; parts.pop(); }
  else if (/^(m|masculin|garcon)$/.test(tail)) { sexe = 'M'; parts.pop(); }
  if (parts.length === 0) return null;
  // Une liste dépourvue d'entêtes est interprétée « premier token = nom »;
  // chaque ligne reste éditable dans l'aperçu avant la création du classeur.
  const nom = parts.shift() || '';
  const prenoms = parts.join(' ');
  if (!nom || fold(`${nom} ${prenoms}`).length < 2) return null;
  return { matricule, nom, prenoms, sexe };
}

/** Parse des lignes PDF/OCR en élèves, en utilisant les colonnes quand l'entête est détecté. */
export function parsePdfRosterTokens(tokens: PdfRosterToken[]): StudentListDraft[] {
  const rows = groupTokens(tokens);
  let headers: HeaderColumn[] | null = null;
  const found: StudentListDraft[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const candidateHeaders = isHeaderRow(row);
    if (candidateHeaders) {
      headers = candidateHeaders;
      continue;
    }
    const rawLine = cleanText(row.sort((a, b) => a.x - b.x).map(token => token.text).join(' '));
    const parsed = headers ? parseMappedRow(row, headers) : parseFreeLine([...row]);
    if (!parsed) continue;
    const key = fold(`${parsed.matricule}|${parsed.nom}|${parsed.prenoms}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    found.push({ id: `pdf-student-${found.length + 1}`, ...parsed, rawLine });
  }
  return found;
}

function tokensFromPdfText(items: any[]): PdfRosterToken[] {
  const tokens: PdfRosterToken[] = [];
  for (const item of items || []) {
    if (typeof item?.str !== 'string' || !item.str.trim() || !Array.isArray(item.transform)) continue;
    tokens.push({ text: item.str, x: Number(item.transform[4]) || 0, y: -(Number(item.transform[5]) || 0), width: Number(item.width) || 0 });
  }
  return tokens;
}

export function tokensFromTsv(tsv: string): PdfRosterToken[] {
  const lines = tsv.split(/\r?\n/);
  const tokens: PdfRosterToken[] = [];
  for (const line of lines.slice(1)) {
    const fields = line.split('\t');
    if (fields.length < 12 || fields[0] !== '5') continue;
    const text = cleanText(fields.slice(11).join('\t'));
    if (!text) continue;
    const confidence = Number(fields[10]);
    if (Number.isFinite(confidence) && confidence >= 0 && confidence < 10) continue;
    tokens.push({
      text,
      x: Number(fields[6]) || 0,
      y: Number(fields[7]) || 0,
      width: Number(fields[8]) || 0,
      confidence: Number.isFinite(confidence) ? confidence : undefined,
    });
  }
  return tokens;
}

function hasUsefulText(tokens: PdfRosterToken[]): boolean {
  const words = tokens.filter(token => /[\p{L}]{2,}/u.test(token.text));
  const letters = words.reduce((sum, token) => sum + token.text.replace(/[^\p{L}]/gu, '').length, 0);
  return words.length >= 4 && letters >= 18;
}

export async function extractStudentListFromPdf(
  file: File,
  onProgress?: (message: string) => void,
): Promise<StudentPdfExtraction> {
  if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
    throw new Error('Sélectionnez un fichier PDF.');
  }
  if (file.size <= 0 || file.size > STUDENT_PDF_MAX_BYTES) {
    throw new Error('Le PDF doit peser entre 1 octet et 30 Mo.');
  }

  onProgress?.('Ouverture du PDF sur cet appareil…');
  const pdfjs: any = await import('pdfjs-dist');
  if (pdfjs.GlobalWorkerOptions) {
    const appBaseUrl = new URL('./', window.location.href).href;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', appBaseUrl).href;
  }
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  if (pdf.numPages > STUDENT_PDF_MAX_PAGES) {
    await pdf.destroy();
    throw new Error(`Le PDF contient ${pdf.numPages} pages. La limite locale est de ${STUDENT_PDF_MAX_PAGES} pages par import.`);
  }

  const allTokens: PdfRosterToken[] = [];
  let textPages = 0;
  let ocrPages = 0;
  let worker: any = null;
  const warnings: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress?.(`Lecture de la page ${pageNumber}/${pdf.numPages}…`);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageTokens = tokensFromPdfText(content.items || []);
      if (hasUsefulText(pageTokens)) {
        allTokens.push(...pageTokens);
        textPages++;
        continue;
      }

      if (!worker) {
        onProgress?.('Préparation de la reconnaissance OCR française locale…');
        const { createWorker, OEM } = await import('tesseract.js');
        const base = new URL('./', window.location.href).href;
        worker = await createWorker('fra', OEM.LSTM_ONLY, {
          workerPath: new URL('ocr/worker.min.js', base).href,
          corePath: new URL('ocr/tesseract-core-lstm.wasm.js', base).href,
          langPath: new URL('ocr', base).href,
          gzip: true,
          workerBlobURL: false,
          cacheMethod: 'readOnly',
          logger: (message: { status?: string; progress?: number }) => {
            if (message.status === 'recognizing text' && Number.isFinite(message.progress)) {
              onProgress?.(`OCR local — page ${pageNumber}/${pdf.numPages} (${Math.round((message.progress || 0) * 100)} %)…`);
            } else if (message.status === 'loading language traineddata') {
              onProgress?.('Chargement du modèle OCR français local…');
            }
          },
        });
      }
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { willReadFrequently: false });
      if (!context) throw new Error('Le rendu du PDF est indisponible sur cet appareil.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas, {}, { text: true, tsv: true });
      const ocrTokens = tokensFromTsv(result.data?.tsv || '');
      if (ocrTokens.length) allTokens.push(...ocrTokens);
      else if (result.data?.text) {
        const lines = String(result.data.text).split(/\r?\n/).filter(Boolean);
        lines.forEach((text, index) => allTokens.push({ text, x: 0, y: index * 20 }));
      }
      ocrPages++;
      page.cleanup?.();
      canvas.width = 1;
      canvas.height = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/fetch|network|load failed/i.test(message)) {
      throw new Error('Le moteur OCR local n’a pas pu charger ses fichiers installés. Revenez en ligne une fois pour mettre à jour l’application, puis réessayez.');
    }
    throw error;
  } finally {
    try { await worker?.terminate(); } catch { /* fermeture best-effort */ }
    try { await pdf.destroy(); } catch { /* fermeture best-effort */ }
  }

  const students = parsePdfRosterTokens(allTokens);
  if (students.length === 0) warnings.push('Aucun nom n’a été reconnu automatiquement. Vous pouvez ajouter les élèves manuellement dans l’aperçu ou fournir un PDF plus net.');
  if (students.some(student => !student.matricule)) warnings.push('Certains matricules sont absents du PDF ou n’ont pas été reconnus; ils resteront vides tant que vous ne les complétez pas.');
  if (ocrPages > 0) warnings.push('L’OCR est une lecture automatique : vérifiez soigneusement l’orthographe des noms et des matricules avant de télécharger le classeur.');
  return {
    students,
    pages: pdf.numPages,
    textPages,
    ocrPages,
    source: ocrPages === 0 ? 'texte PDF' : textPages === 0 ? 'OCR local' : 'mixte',
    warnings,
  };
}

export function draftsToStudents(drafts: StudentListDraft[]): Student[] {
  const now = Date.now();
  return drafts.map((draft, index) => ({
    id: draft.id || `pdf-student-${index + 1}-${now}`,
    matricule: draft.matricule.trim(),
    nom: draft.nom.trim(),
    prenoms: draft.prenoms.trim(),
    sexe: draft.sexe || undefined,
    createdAt: now + index,
  }));
}

/** Construit un ClassData temporaire pour réutiliser l'export officiel des matières/évaluations. */
export function makePdfExportClass(
  base: Pick<ClassData, 'id' | 'name' | 'school' | 'level' | 'educationType' | 'serie' | 'schoolYear' | 'sequence' | 'subjects'>,
  students: Student[],
): ClassData {
  return {
    ...base,
    students,
    notes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
