import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export type ImportedCalendarType = 'ferie' | 'examen' | 'conseil' | 'rentree' | 'conge' | 'pedagogique';

export interface ImportedCalendarEvent {
  title: string;
  date: string;
  type: ImportedCalendarType;
  note?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object') {
    const obj = value as any;
    if (obj.result !== undefined && obj.result !== null) return String(obj.result).trim();
    if (obj.text !== undefined) return String(obj.text).trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((r: any) => r.text).join('').trim();
  }
  return String(value).trim();
}

function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  // yyyy-mm-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const fr = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (fr) {
    const d = Number(fr[1]);
    const m = Number(fr[2]);
    let y = Number(fr[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Excel serial date
  const serial = Number(raw);
  if (!Number.isNaN(serial) && serial > 20000 && serial < 60000) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function parseType(value: string): ImportedCalendarType {
  const n = normalize(value);
  if (n.includes('ferie') || n.includes('fete')) return 'ferie';
  if (n.includes('exam') || n.includes('evalu') || n.includes('composition')) return 'examen';
  if (n.includes('conseil')) return 'conseil';
  if (n.includes('rentree')) return 'rentree';
  if (n.includes('conge') || n.includes('vacance')) return 'conge';
  return 'pedagogique';
}

function extractDateCandidates(text: string): { raw: string; index: number }[] {
  const patterns = [
    /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g,
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  ];
  const out: { raw: string; index: number }[] = [];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) out.push({ raw: match[0], index: match.index });
  }
  return out.sort((a, b) => a.index - b.index);
}

export function extractCalendarEventsFromText(text: string): ImportedCalendarEvent[] {
  const lines = text
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n|(?<=\d{4})\s{2,}/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const events: ImportedCalendarEvent[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dates = extractDateCandidates(line);
    if (dates.length === 0) continue;
    for (const candidate of dates) {
      const date = parseDate(candidate.raw);
      if (!date) continue;
      let title = line.replace(candidate.raw, '').replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '').trim();
      if (!title && lines[i + 1]) title = lines[i + 1].trim();
      if (!title) title = 'Événement académique';
      events.push({ date, title, type: parseType(line), note: line });
    }
  }

  const unique = new Map<string, ImportedCalendarEvent>();
  for (const event of events) unique.set(`${event.date}|${normalize(event.title)}`, event);
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function extractTextFromCalendarDocument(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return file.text();
  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value || '';
    } catch {
      return '';
    }
  }
  if (ext === 'pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const libAny = pdfjsLib as any;
      if (libAny.GlobalWorkerOptions && !libAny.GlobalWorkerOptions.workerSrc && libAny.version) {
        libAny.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${libAny.version}/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({
        data: await file.arrayBuffer(),
        disableWorker: true,
        isEvalSupported: false,
      } as any).promise;
      const pages: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        pages.push(content.items.map((item: any) => item.str || '').join(' '));
      }
      return pages.join('\n');
    } catch {
      return '';
    }
  }
  if (ext === 'doc') {
    return `Fichier DOC ancien : ${file.name}. Extraction automatique limitée. Convertissez en DOCX/PDF pour identifier les dates dans le contenu.`;
  }
  return '';
}

export async function importCalendarFromDocument(file: File): Promise<ImportedCalendarEvent[]> {
  const text = await extractTextFromCalendarDocument(file);
  return extractCalendarEventsFromText(text);
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ';' || char === ',') && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function rowsToEvents(rows: string[][]): ImportedCalendarEvent[] {
  if (rows.length === 0) return [];
  const first = rows[0].map(normalize);
  const hasHeader = first.some(h => ['date', 'titre', 'title', 'type', 'note', 'description', 'evenement', 'event'].includes(h));
  const header = hasHeader ? first : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const dateIndex = hasHeader ? Math.max(header.findIndex(h => h.includes('date')), 0) : 0;
  const titleIndex = hasHeader
    ? Math.max(header.findIndex(h => h.includes('titre') || h.includes('title') || h.includes('evenement') || h.includes('event')), 1)
    : 1;
  const typeIndex = hasHeader ? header.findIndex(h => h.includes('type') || h.includes('categorie')) : 2;
  const noteIndex = hasHeader ? header.findIndex(h => h.includes('note') || h.includes('description') || h.includes('observation')) : 3;

  return dataRows
    .map(row => {
      const date = parseDate(row[dateIndex] || '');
      const title = (row[titleIndex] || '').trim();
      if (!date || !title) return null;
      return {
        date,
        title,
        type: parseType(typeIndex >= 0 ? row[typeIndex] || '' : ''),
        note: noteIndex >= 0 ? row[noteIndex] || undefined : undefined,
      } as ImportedCalendarEvent;
    })
    .filter(Boolean) as ImportedCalendarEvent[];
}

export async function importCalendarFromCsv(file: File): Promise<ImportedCalendarEvent[]> {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(splitCsvLine);
  return rowsToEvents(rows);
}

export async function importCalendarFromExcel(file: File): Promise<ImportedCalendarEvent[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xls') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
    return rowsToEvents(rows.map(row => row.map(cell => String(cell || '').trim())));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: string[] = [];
    for (let c = 1; c <= Math.max(4, sheet.columnCount); c++) values.push(cellToString(row.getCell(c).value));
    if (values.some(Boolean)) rows.push(values);
  }
  return rowsToEvents(rows);
}

export function isStructuredCalendarFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'csv' || ext === 'xls' || ext === 'xlsx';
}