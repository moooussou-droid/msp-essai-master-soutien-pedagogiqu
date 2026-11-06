/**
 * Module Enrôlement du PERSONNEL (v33).
 * Reproduit fidèlement le modèle Excel officiel (colonnes des captures) :
 * Matricule | Id ANPE (AME) | Nom | Prénoms | Sexe (M/F) | Date de naissance |
 * Lieu de naissance | Nationalité (PAYS) | Numéro de téléphone | Email | IFU |
 * Date de première prise de service.
 * Stockage 100 % local (localStorage), export Excel identique au modèle.
 */
import ExcelJS from 'exceljs';
import { EXCEL_TEXT_FORMAT, formatDateDMY } from './excelDate';

export interface StaffRecord {
  id: string;
  matricule: string;
  idAnpe: string;
  nom: string;
  prenoms: string;
  sexe: '' | 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  telephone: string;
  email: string;
  ifu: string;
  datePriseService: string;
  /** Champs hors modèle, utiles à l'établissement (non exportés dans le modèle officiel). */
  fonction?: string;
  etablissement?: string;
  extraFields?: Record<string, string>;
  createdAt: number;
}

export interface StaffFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'tel' | 'number' | 'email';
}

export const STAFF_KEY = 'msp_staff_records';
export const STAFF_FIELDS_KEY = 'msp_staff_extra_fields';

/** Fonctions du personnel (Bénin) — utilisées comme onglets de l'export. */
export const STAFF_ROLES = [
  'Directeur / Directrice',
  'Enseignant(e)',
  'Enseignant(e) communautaire',
  'Personnel administratif',
  'Personnel d\u2019appui',
  'Autre',
];

/** Colonnes du modèle officiel, dans l'ordre exact des captures. */
export const STAFF_COLUMNS: { key: keyof StaffRecord; label: string; note?: string; width: number; text?: boolean }[] = [
  { key: 'matricule', label: 'Matricule', width: 18 },
  { key: 'idAnpe', label: 'Id ANPE (AME)', width: 18, text: true },
  { key: 'nom', label: 'Nom (Complet sans abréviation)', width: 24 },
  { key: 'prenoms', label: 'Prénoms (Complet sans abréviation)', width: 28 },
  { key: 'sexe', label: 'Sexe (M/F)', width: 12 },
  { key: 'dateNaissance', label: 'Date de naissance', width: 18 },
  { key: 'lieuNaissance', label: 'Lieu de naissance', width: 22 },
  { key: 'nationalite', label: 'Nationalité (PAYS)', width: 20 },
  { key: 'telephone', label: 'Numéro de téléphone', width: 22, text: true },
  { key: 'email', label: 'Email', width: 26 },
  { key: 'ifu', label: 'IFU', width: 20, text: true },
  { key: 'datePriseService', label: 'Date de première prise de service', width: 26 },
];

export function emptyStaffRecord(): StaffRecord {
  return {
    id: '',
    matricule: '',
    idAnpe: '',
    nom: '',
    prenoms: '',
    sexe: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Béninoise',
    telephone: '',
    email: '',
    ifu: '',
    datePriseService: '',
    fonction: 'Enseignant(e)',
    etablissement: '',
    extraFields: {},
    createdAt: Date.now(),
  };
}

export function loadStaffRecords(): StaffRecord[] {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    if (raw) return JSON.parse(raw) as StaffRecord[];
  } catch { /* données locales invalides : on repart d'une liste vide */ }
  return [];
}

export function saveStaffRecords(records: StaffRecord[]) {
  localStorage.setItem(STAFF_KEY, JSON.stringify(records));
}

export function loadStaffExtraFields(): StaffFieldConfig[] {
  try {
    const raw = localStorage.getItem(STAFF_FIELDS_KEY);
    if (raw) return JSON.parse(raw) as StaffFieldConfig[];
  } catch { /* ignore */ }
  return [];
}

export function saveStaffExtraFields(fields: StaffFieldConfig[]) {
  localStorage.setItem(STAFF_FIELDS_KEY, JSON.stringify(fields));
}

/** Contrôles de cohérence avant export (obligatoires du modèle). */
export function validateStaffRecord(r: StaffRecord): string[] {
  const errors: string[] = [];
  if (!r.nom.trim()) errors.push('Le Nom est obligatoire (complet, sans abréviation).');
  if (!r.prenoms.trim()) errors.push('Les Prénoms sont obligatoires (complets, sans abréviation).');
  if (r.sexe !== 'M' && r.sexe !== 'F') errors.push('Le Sexe doit être M ou F.');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errors.push('Email invalide.');
  if (r.ifu && !/^\d{8,13}$/.test(r.ifu.replace(/\s/g, ''))) errors.push('IFU : 8 à 13 chiffres attendus.');
  if (r.telephone && r.telephone.replace(/\D/g, '').length < 8) errors.push('Numéro de téléphone trop court.');
  return errors;
}

export function staffValue(r: StaffRecord, key: keyof StaffRecord): string {
  const v = r[key];
  if (typeof v === 'string') return key === 'nom' ? v.toUpperCase() : v;
  return v === undefined || v === null ? '' : String(v);
}

/**
 * Export Excel conforme au modèle : ligne d'en-tête stylée (Nom/Prénoms surlignés
 * en jaune, mentions en rouge), un onglet par fonction + un onglet « TOUT LE PERSONNEL ».
 */
export async function generateStaffExcel(
  records: StaffRecord[],
  extraFields: StaffFieldConfig[] = loadStaffExtraFields(),
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master Soutien Pédagogique';
  workbook.created = new Date();

  const buildSheet = (name: string, rows: StaffRecord[]) => {
    const sheet = workbook.addWorksheet(name.slice(0, 31).replace(/[\\/*?:[\]]/g, '-'));
    const header = sheet.addRow([...STAFF_COLUMNS.map(c => c.label), ...extraFields.map(f => f.label)]);
    header.height = 32;
    header.font = { bold: true, size: 11 };
    header.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    header.eachCell((cell, col) => {
      const isNameCol = col === 3 || col === 4; // Nom, Prénoms = surlignés jaune dans le modèle
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isNameCol ? 'FFFFFF00' : 'FFFFFFFF' },
      };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    for (const r of rows) {
      sheet.addRow([
        ...STAFF_COLUMNS.map(c => {
          const value = staffValue(r, c.key);
          return c.key === 'dateNaissance' || c.key === 'datePriseService'
            ? formatDateDMY(value)
            : value;
        }),
        ...extraFields.map(field => {
          const value = r.extraFields?.[field.id] || '';
          return field.type === 'date' ? formatDateDMY(value) : value;
        }),
      ]);
    }

    [...STAFF_COLUMNS.map(c => c.width), ...extraFields.map(() => 22)].forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });
    // Dates enregistrées en texte JJ/MM/AAAA pour les importateurs EducMaster.
    STAFF_COLUMNS.forEach((column, index) => {
      if (column.key === 'dateNaissance' || column.key === 'datePriseService') {
        sheet.getColumn(index + 1).numFmt = EXCEL_TEXT_FORMAT;
      }
    });
    extraFields.forEach((field, index) => {
      if (field.type === 'date') sheet.getColumn(STAFF_COLUMNS.length + index + 1).numFmt = EXCEL_TEXT_FORMAT;
    });
    // Colonnes à conserver en TEXTE (zéros initiaux : téléphone, IFU, Id ANPE)
    STAFF_COLUMNS.forEach((c, i) => { if (c.text) sheet.getColumn(i + 1).numFmt = '@'; });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: STAFF_COLUMNS.length + extraFields.length },
    };
    return sheet;
  };

  buildSheet('TOUT LE PERSONNEL', records);
  for (const role of STAFF_ROLES) {
    const rows = records.filter(r => (r.fonction || 'Autre') === role);
    if (rows.length) buildSheet(role, rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Statistiques rapides du personnel (effectifs par sexe et par fonction). */
export function staffStats(records: StaffRecord[]) {
  const total = records.length;
  const hommes = records.filter(r => r.sexe === 'M').length;
  const femmes = records.filter(r => r.sexe === 'F').length;
  const byRole = STAFF_ROLES.map(role => ({
    role,
    count: records.filter(r => (r.fonction || 'Autre') === role).length,
  })).filter(x => x.count > 0);
  const incomplets = records.filter(r => validateStaffRecord(r).length > 0).length;
  return { total, hommes, femmes, byRole, incomplets };
}
