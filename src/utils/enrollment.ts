import ExcelJS from 'exceljs';
import { EXCEL_TEXT_FORMAT, formatDateDMY } from './excelDate';

export interface EnrollmentRecord {
  id: string;
  classLevel: string;
  nom: string;
  prenoms: string;
  sexe: string;
  dateNaissance: string;
  lieuNaissance: string;
  telephoneParents: string;
  nationalite: string;
  npi: string;
  extraFields?: Record<string, string>;
  createdAt: number;
}

export interface EnrollmentFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'tel' | 'number';
  required?: boolean;
}

export const ENROLLMENT_KEY = 'msp_enrollment_records';
export const ENROLLMENT_FIELDS_KEY = 'msp_enrollment_extra_fields';

export const ENROLLMENT_LEVELS = ['Maternelle 1', 'Maternelle 2', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];

export function loadEnrollmentRecords(): EnrollmentRecord[] {
  try {
    const raw = localStorage.getItem(ENROLLMENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid local data
  }
  return [];
}

export function saveEnrollmentRecords(records: EnrollmentRecord[]) {
  localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(records));
}

export function loadEnrollmentExtraFields(): EnrollmentFieldConfig[] {
  try {
    const raw = localStorage.getItem(ENROLLMENT_FIELDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid field config
  }
  return [];
}

export function saveEnrollmentExtraFields(fields: EnrollmentFieldConfig[]) {
  localStorage.setItem(ENROLLMENT_FIELDS_KEY, JSON.stringify(fields));
}

export async function generateEnrollmentExcel(records: EnrollmentRecord[], extraFields: EnrollmentFieldConfig[] = loadEnrollmentExtraFields()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master Soutien Pédagogique';
  workbook.created = new Date();

  const baseHeaders = [
    'Nom',
    'Prénoms',
    'Sexe',
    'Date de naissance',
    'Lieu de naissance',
    'Téléphone de parents',
    'Nationalité',
    'Npi',
  ];
  const headers = [...baseHeaders, ...extraFields.map(f => f.label)];

  for (const level of ENROLLMENT_LEVELS) {
    const sheet = workbook.addWorksheet(level);
    sheet.addRow(headers);
    const levelRecords = records.filter(r => r.classLevel === level);
    for (const record of levelRecords) {
      sheet.addRow([
        record.nom.toUpperCase(),
        record.prenoms,
        record.sexe || '',
        formatDateDMY(record.dateNaissance),
        record.lieuNaissance,
        record.telephoneParents,
        record.nationalite,
        record.npi,
        ...extraFields.map(field => {
          const value = record.extraFields?.[field.id] || '';
          return field.type === 'date' ? formatDateDMY(value) : value;
        }),
      ]);
    }

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    [...[18, 24, 12, 18, 28, 22, 18, 22], ...extraFields.map(() => 22)].forEach((width, i) => {
      sheet.getColumn(i + 1).width = width;
    });
    sheet.getColumn(4).numFmt = EXCEL_TEXT_FORMAT;
    extraFields.forEach((field, index) => {
      if (field.type === 'date') sheet.getColumn(baseHeaders.length + index + 1).numFmt = EXCEL_TEXT_FORMAT;
    });
    sheet.getColumn(6).numFmt = '@';
    sheet.getColumn(8).numFmt = '@';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return blob;
}
