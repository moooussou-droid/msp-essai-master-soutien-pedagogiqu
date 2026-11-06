import ExcelJS from 'exceljs';
import { generateEducMasterExcel } from './excelGenerator';
import { ClassData, sortStudents } from './database';

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B4F' } },
};

function safeName(value: string): string {
  return (value || 'ecole').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'ecole';
}

/**
 * Génère le classeur adapté au modèle de matières de la classe choisie.
 * Primaire/secondaire reprennent le générateur des feuilles de notes existant.
 * Au préscolaire, la grille utilise les domaines configurés et l’échelle TS/S/PS.
 */
export async function generateStudentListExcel(classData: ClassData): Promise<{ blob: Blob; filename: string }> {
  if (classData.educationType !== 'prescolaire') return generateEducMasterExcel(classData);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master Soutien Pédagogique';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Grille TS S PS', { views: [{ state: 'frozen', ySplit: 5, xSplit: 2 }] });
  const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);
  const firstDomainColumn = 6;
  const totalColumns = firstDomainColumn - 1 + subjects.length * 3;

  worksheet.mergeCells(1, 1, 1, totalColumns);
  worksheet.getCell(1, 1).value = `LISTE DES ÉLÈVES — GRILLE D’ÉVALUATION TS / S / PS`;
  worksheet.getCell(1, 1).font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF006B4F' } };
  worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 26;
  worksheet.mergeCells(2, 1, 2, totalColumns);
  worksheet.getCell(2, 1).value = `${classData.school || ''} — ${classData.name || classData.level} — ${classData.schoolYear || ''}`;
  worksheet.getCell(2, 1).font = { bold: true, size: 10, name: 'Arial' };
  worksheet.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.addRow([]);

  for (const [column, label] of [[1, 'N°'], [2, 'Matricule'], [3, 'Nom'], [4, 'Prénoms'], [5, 'Sexe']] as const) {
    worksheet.mergeCells(4, column, 5, column);
    worksheet.getCell(4, column).value = label;
  }
  subjects.forEach((subject, index) => {
    const start = firstDomainColumn + index * 3;
    worksheet.mergeCells(4, start, 4, start + 2);
    worksheet.getCell(4, start).value = subject.name;
    ['TS', 'S', 'PS'].forEach((rating, offset) => {
      worksheet.getCell(5, start + offset).value = rating;
    });
  });
  for (let row = 4; row <= 5; row++) {
    for (let column = 1; column <= totalColumns; column++) worksheet.getCell(row, column).style = HEADER_STYLE;
  }
  worksheet.getRow(4).height = 34;
  worksheet.getRow(5).height = 22;

  sortStudents(classData.students).forEach((student, index) => {
    const rowNumber = index + 6;
    worksheet.getCell(rowNumber, 1).value = index + 1;
    worksheet.getCell(rowNumber, 2).value = student.matricule || '';
    worksheet.getCell(rowNumber, 2).numFmt = '@';
    worksheet.getCell(rowNumber, 3).value = (student.nom || '').toUpperCase();
    worksheet.getCell(rowNumber, 4).value = student.prenoms || '';
    worksheet.getCell(rowNumber, 5).value = student.sexe || '';
    for (let column = 1; column <= totalColumns; column++) {
      const cell = worksheet.getCell(rowNumber, column);
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { horizontal: column <= 5 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    }
  });

  [6, 16, 20, 24, 10].forEach((width, index) => { worksheet.getColumn(index + 1).width = width; });
  for (let column = firstDomainColumn; column <= totalColumns; column++) worksheet.getColumn(column).width = 8;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `liste-eleves-maternelle-${safeName(classData.school)}-${safeName(classData.name)}-${new Date().getFullYear()}.xlsx`;
  return { blob, filename };
}
