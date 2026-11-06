/**
 * EXPORTS DU BULLETIN OFFICIEL DE MATERNELLE (v67).
 *
 * PDF : reproduction fidèle du livret photographié — page 1, grille
 * trimestrielle TS/S/PS ; page 2, appréciation générale et visas.
 * Word : même document, modifiable. Excel : récapitulatif d’observation
 * (aucune moyenne, aucun rang, conformément à la consigne du livret).
 */
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ClassData, Student } from './database';
import {
  PRESCHOOL_DOMAINS,
  PreschoolEvaluationRecord,
  PreschoolRating,
  getPreschoolEvaluation,
  preschoolCounts,
  preschoolTrimesterLabel,
} from './prescolaireBulletin';
import { getProfile } from './userProfile';
import { getSignatureImage, getStampImage } from './scanner';

function safeName(value: string): string {
  return (value || 'maternelle')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'maternelle';
}

function recordsFor(
  classData: ClassData,
  students: Student[],
  records: PreschoolEvaluationRecord[],
  trimester: PreschoolEvaluationRecord['trimester'],
): Map<string, PreschoolEvaluationRecord> {
  return new Map(students.map(s => [s.id, getPreschoolEvaluation(classData.id, s.id, trimester, records)]));
}

function sortedStudents(classData: ClassData): Student[] {
  return [...classData.students].sort((a, b) =>
    `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr', { sensitivity: 'base' }));
}

function trimesterNumeral(trimester: PreschoolEvaluationRecord['trimester']): string {
  if (trimester === '2e trimestre') return '2e';
  if (trimester === '3e trimestre') return '3e';
  return '1er';
}

/* ------------------------------------------------------------------ */
/* PDF fidèle au livret                                                */
/* ------------------------------------------------------------------ */

function drawCheck(doc: jsPDF, cx: number, cy: number): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.55);
  doc.line(cx - 2.6, cy + 0.4, cx - 0.7, cy + 2.5);
  doc.line(cx - 0.7, cy + 2.5, cx + 3.1, cy - 2.7);
  doc.setLineWidth(0.25);
}

function drawDottedLine(doc: jsPDF, x1: number, x2: number, y: number): void {
  doc.setDrawColor(75, 75, 75);
  doc.setLineWidth(0.18);
  // @ts-expect-error jsPDF expose setLineDash dans l’API moderne.
  if (typeof doc.setLineDash === 'function') doc.setLineDash([0.45, 1.15], 0);
  doc.line(x1, y, x2, y);
  // @ts-expect-error idem.
  if (typeof doc.setLineDash === 'function') doc.setLineDash([], 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
}

function addImageFit(doc: jsPDF, dataUrl: string, x: number, y: number, maxW: number, maxH: number): void {
  if (!dataUrl) return;
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.height / props.width;
    let w = maxW;
    let h = w * ratio;
    if (h > maxH) { h = maxH; w = h / ratio; }
    const fmt = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, fmt, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h, undefined, 'FAST');
  } catch { /* une image de visa illisible ne bloque pas le bulletin */ }
}

function drawPreschoolPages(
  doc: jsPDF,
  classData: ClassData,
  student: Student,
  record: PreschoolEvaluationRecord,
  firstPage: boolean,
): void {
  const profile = getProfile();
  const school = classData.school || profile.schoolName || 'École maternelle';
  const circonscription = classData.circonscription || profile.circonscription || '';
  if (!firstPage) doc.addPage();

  /* ----- Page 1 : GRILLE D’ÉVALUATION TRIMESTRIELLE ----- */
  // Identification volontairement discrète : elle rattache la grille à
  // l’enfant sans ajouter ni moyenne ni rang au document officiel.
  doc.setTextColor(35, 35, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(school.toUpperCase(), 12, 10, { maxWidth: 105 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  if (circonscription) doc.text(circonscription, 12, 14, { maxWidth: 105 });
  doc.text(`Année scolaire : ${classData.schoolYear || '—'}`, 198, 10, { align: 'right' });
  doc.text(`Classe : ${classData.name || classData.level || '—'}`, 198, 14, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);
  doc.text(`Nom et Prénoms de l’enfant : ${(student.nom || '').toUpperCase()} ${student.prenoms || ''}`.trim(), 12, 20, { maxWidth: 138 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Matricule : ${student.matricule || '—'}`, 198, 20, { align: 'right' });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(12, 23, 198, 23);

  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'bold');
  doc.setFontSize(16.5);
  doc.text('GRILLE D’ÉVALUATION TRIMESTRIELLE', 105, 34, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.text(`................ ${trimesterNumeral(record.trimester)} Trimestre ................`, 105, 43, { align: 'center' });

  const x0 = 12;
  const tableW = 186;
  const cols = [11, 73, 15, 15, 15, 57]; // N°, domaine, TS, S, PS, observation
  const colX = cols.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [x0]);
  let y = 52;
  const headerMid = y + 10;
  const headerBottom = y + 19;

  doc.setLineWidth(0.32);
  doc.rect(x0, y, tableW, headerBottom - y, 'S');
  // Séparations du double en-tête.
  doc.line(colX[1], y, colX[1], headerBottom);
  doc.line(colX[2], y, colX[2], headerBottom);
  doc.line(colX[3], headerMid, colX[3], headerBottom);
  doc.line(colX[4], headerMid, colX[4], headerBottom);
  doc.line(colX[5], y, colX[5], headerBottom);
  doc.line(colX[2], headerMid, colX[5], headerMid);

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('N°', colX[0] + cols[0] / 2, y + 11.5, { align: 'center' });
  doc.text('Domaine d’Évaluation', colX[1] + cols[1] / 2, y + 11.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Echelle des', colX[2] + 22.5, y + 4.4, { align: 'center' });
  doc.text('valeurs', colX[2] + 22.5, y + 8.5, { align: 'center' });
  doc.text('Observation', colX[5] + cols[5] / 2, y + 11.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text('TS', colX[2] + cols[2] / 2, headerBottom - 3.1, { align: 'center' });
  doc.text('S', colX[3] + cols[3] / 2, headerBottom - 3.1, { align: 'center' });
  doc.text('PS', colX[4] + cols[4] / 2, headerBottom - 3.1, { align: 'center' });
  y = headerBottom;

  PRESCHOOL_DOMAINS.forEach((domain, index) => {
    const result = record.results[domain.id] || { rating: '', observation: '' };
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const domainLines = doc.splitTextToSize(domain.label, cols[1] - 5) as string[];
    doc.setFontSize(8.6);
    const obsLines = result.observation
      ? doc.splitTextToSize(result.observation, cols[5] - 5) as string[]
      : [];
    const rowH = Math.max(13.5, Math.max(domainLines.length * 4.4, obsLines.length * 4.0) + 5);
    doc.rect(x0, y, tableW, rowH, 'S');
    for (let i = 1; i < cols.length; i++) doc.line(colX[i], y, colX[i], y + rowH);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(String(index + 1), colX[0] + cols[0] / 2, y + rowH / 2 + 1.4, { align: 'center' });
    const domainY = y + (rowH - domainLines.length * 4.4) / 2 + 3.4;
    domainLines.forEach((line, li) => doc.text(line, colX[1] + 2.5, domainY + li * 4.4));
    doc.setFontSize(8.6);
    const obsY = y + (rowH - Math.max(1, obsLines.length) * 4.0) / 2 + 3.2;
    obsLines.forEach((line, li) => doc.text(line, colX[5] + 2.5, obsY + li * 4.0));

    const ratingIndex = result.rating === 'TS' ? 2 : result.rating === 'S' ? 3 : result.rating === 'PS' ? 4 : -1;
    if (ratingIndex >= 0) drawCheck(doc, colX[ratingIndex] + cols[ratingIndex] / 2, y + rowH / 2);
    y += rowH;
  });

  // Erratum
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  const nb = 'NB : L’évaluation est faite sur la base de l’observation permanente de l’enfant. Il est évalué par rapport à lui-même et non par rapport à ses camarades.';
  const nbLines = doc.splitTextToSize(nb, 184) as string[];
  nbLines.forEach((line, i) => doc.text(line, 12, Math.min(271, y + 11 + i * 5)));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Master Soutien Pédagogique — ${student.matricule || ''}`, 12, 290);
  doc.setTextColor(0, 0, 0);

  /* ----- Page 2 : appréciation générale et visas ----- */
  doc.addPage();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(110, 110, 110);
  doc.text(`${(student.nom || '').toUpperCase()} ${student.prenoms || ''} — ${classData.name || ''} — ${preschoolTrimesterLabel(record.trimester)}`, 12, 9, { maxWidth: 186 });
  doc.setTextColor(0, 0, 0);

  doc.setFont('times', 'bold');
  doc.setFontSize(13.5);
  const title = 'APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)';
  doc.text(title, 12, 24);
  const tw = doc.getTextWidth(title);
  doc.setLineWidth(0.35);
  doc.line(12, 26, 12 + tw, 26);

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  const appreciationLines = record.generalAppreciation
    ? doc.splitTextToSize(record.generalAppreciation, 184) as string[]
    : [];
  const lineCount = Math.max(5, appreciationLines.length + 1);
  let lineY = 38;
  for (let i = 0; i < lineCount; i++) {
    drawDottedLine(doc, 12, 198, lineY);
    if (appreciationLines[i]) doc.text(appreciationLines[i], 12, lineY - 1.6);
    lineY += 11;
  }

  const boxesY = Math.max(101, lineY + 7);
  const boxW = 93;
  const boxH = 54;
  doc.setLineWidth(0.4);
  doc.rect(12, boxesY, boxW, boxH, 'S');
  doc.rect(105, boxesY, boxW, boxH, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('VISA DE L’ENSEIGNANT(E)', 15, boxesY + 8);
  doc.text('VISA DU DIRECTEUR(TRICE)', 108, boxesY + 8);
  doc.line(15, boxesY + 9.5, 15 + doc.getTextWidth('VISA DE L’ENSEIGNANT(E)'), boxesY + 9.5);
  doc.line(108, boxesY + 9.5, 108 + doc.getTextWidth('VISA DU DIRECTEUR(TRICE)'), boxesY + 9.5);
  addImageFit(doc, getSignatureImage(), 22, boxesY + 14, 72, 34);
  addImageFit(doc, getStampImage(), 126, boxesY + 13, 58, 36);

  const parentsTitleY = boxesY + boxH + 19;
  doc.setFontSize(12);
  const parentsTitle = 'VISA DES PARENTS OU TUTEURS DE L’ENFANT';
  doc.text(parentsTitle, 105, parentsTitleY, { align: 'center' });
  const pw = doc.getTextWidth(parentsTitle);
  doc.line(105 - pw / 2, parentsTitleY + 2, 105 + pw / 2, parentsTitleY + 2);
  drawDottedLine(doc, 12, 198, parentsTitleY + 16);
  drawDottedLine(doc, 12, 198, parentsTitleY + 27);
  drawDottedLine(doc, 12, 198, parentsTitleY + 38);

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text('Signature et nom', 178, parentsTitleY + 62, { align: 'right' });

  const legendsY = Math.max(246, parentsTitleY + 55);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('LEGENDES', 12, legendsY);
  doc.line(12, legendsY + 1.8, 12 + doc.getTextWidth('LEGENDES'), legendsY + 1.8);
  doc.setFontSize(10.5);
  doc.text('TS : Très Satisfaisant', 12, legendsY + 11);
  doc.text('S : Satisfaisant', 12, legendsY + 19);
  doc.text('PS : Peu Satisfaisant', 12, legendsY + 27);
  doc.line(12, legendsY + 12.4, 12 + doc.getTextWidth('TS'), legendsY + 12.4);
  doc.line(12, legendsY + 20.4, 12 + doc.getTextWidth('S'), legendsY + 20.4);
  doc.line(12, legendsY + 28.4, 12 + doc.getTextWidth('PS'), legendsY + 28.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Master Soutien Pédagogique', 12, 290);
  doc.setTextColor(0, 0, 0);
}

export function exportPreschoolBulletinPdf(
  classData: ClassData,
  student: Student,
  record: PreschoolEvaluationRecord,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  drawPreschoolPages(doc, classData, student, record, true);
  doc.save(`bulletin-maternelle-${safeName(`${student.nom}-${student.prenoms}`)}-${safeName(record.trimester)}.pdf`);
}

export function exportPreschoolClassBulletinsPdf(
  classData: ClassData,
  records: PreschoolEvaluationRecord[],
  trimester: PreschoolEvaluationRecord['trimester'],
): void {
  const students = sortedStudents(classData);
  const map = recordsFor(classData, students, records, trimester);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  students.forEach((student, i) => drawPreschoolPages(doc, classData, student, map.get(student.id)!, i === 0));
  doc.save(`bulletins-maternelle-${safeName(classData.name)}-${safeName(trimester)}.pdf`);
}

/** Synthèse d’observations (document de travail, sans classement). */
export function exportPreschoolSummaryPdf(
  classData: ClassData,
  records: PreschoolEvaluationRecord[],
  trimester: PreschoolEvaluationRecord['trimester'],
): void {
  const students = sortedStudents(classData);
  const map = recordsFor(classData, students, records, trimester);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Synthèse des observations de la maternelle', 148.5, 14, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${classData.school || ''} — ${classData.name} — ${preschoolTrimesterLabel(trimester)} — ${classData.schoolYear || ''}`, 148.5, 21, { align: 'center' });

  const x0 = 10;
  let y = 29;
  const studentW = 58;
  const domainW = 15;
  const countW = 13;
  const header = () => {
    doc.setFillColor(238, 238, 238);
    doc.setDrawColor(130, 130, 130);
    doc.rect(x0, y, 277, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Nom et Prénoms', x0 + 2, y + 7.5);
    PRESCHOOL_DOMAINS.forEach((_, i) => doc.text(`D${i + 1}`, x0 + studentW + i * domainW + domainW / 2, y + 7.5, { align: 'center' }));
    const cx = x0 + studentW + 10 * domainW;
    doc.text('TS', cx + countW / 2, y + 7.5, { align: 'center' });
    doc.text('S', cx + countW + countW / 2, y + 7.5, { align: 'center' });
    doc.text('PS', cx + 2 * countW + countW / 2, y + 7.5, { align: 'center' });
    doc.text('Rempli', cx + 3 * countW + 15, y + 7.5, { align: 'center' });
    y += 12;
  };
  header();
  students.forEach(student => {
    if (y > 188) { doc.addPage(); y = 14; header(); }
    const record = map.get(student.id)!;
    const c = preschoolCounts(record);
    doc.setDrawColor(180, 180, 180);
    doc.rect(x0, y, 277, 8, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(`${student.nom} ${student.prenoms}`, x0 + 2, y + 5.4, { maxWidth: studentW - 3 });
    PRESCHOOL_DOMAINS.forEach((d, i) => {
      doc.text(record.results[d.id]?.rating || '—', x0 + studentW + i * domainW + domainW / 2, y + 5.4, { align: 'center' });
    });
    const cx = x0 + studentW + 10 * domainW;
    doc.text(String(c.TS), cx + countW / 2, y + 5.4, { align: 'center' });
    doc.text(String(c.S), cx + countW + countW / 2, y + 5.4, { align: 'center' });
    doc.text(String(c.PS), cx + 2 * countW + countW / 2, y + 5.4, { align: 'center' });
    doc.text(`${c.completed}/${c.total}`, cx + 3 * countW + 15, y + 5.4, { align: 'center' });
    y += 8;
  });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const legend = PRESCHOOL_DOMAINS.map((d, i) => `D${i + 1} = ${d.label}`).join('  ·  ');
  (doc.splitTextToSize(legend, 277) as string[]).forEach(line => { doc.text(line, x0, y); y += 4.5; });
  doc.text('Aucun classement : chaque enfant est évalué par rapport à lui-même et non par rapport à ses camarades.', x0, y + 2);
  doc.save(`synthese-maternelle-${safeName(classData.name)}-${safeName(trimester)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Word (.docx)                                                       */
/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function p(text: string, size = 18, bold = false, center = false, underline = false): string {
  return `<w:p><w:pPr>${center ? '<w:jc w:val="center"/>' : ''}<w:spacing w:after="70"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}${underline ? '<w:u w:val="single"/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function cellXml(
  text: string,
  opt: { width?: number; bold?: boolean; center?: boolean; size?: number; gridSpan?: number; vMerge?: string } = {},
): string {
  const span = opt.gridSpan ? `<w:gridSpan w:val="${opt.gridSpan}"/>` : '';
  const merge = opt.vMerge ? `<w:vMerge w:val="${opt.vMerge}"/>` : '';
  return `<w:tc><w:tcPr><w:tcW w:w="${opt.width || 1000}" w:type="dxa"/>${span}${merge}<w:tcMar><w:top w:w="50" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr>${opt.center ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r><w:rPr>${opt.bold ? '<w:b/>' : ''}<w:sz w:val="${opt.size || 18}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
}

function tableOpen(): string {
  return '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="5"/><w:left w:val="single" w:sz="5"/><w:bottom w:val="single" w:sz="5"/><w:right w:val="single" w:sz="5"/><w:insideH w:val="single" w:sz="5"/><w:insideV w:val="single" w:sz="5"/></w:tblBorders><w:tblW w:w="0" w:type="auto"/></w:tblPr>';
}

function preschoolBulletinWordXml(classData: ClassData, student: Student, record: PreschoolEvaluationRecord): string {
  const rows = PRESCHOOL_DOMAINS.map((domain, i) => {
    const r = record.results[domain.id] || { rating: '', observation: '' };
    const mark = (value: PreschoolRating) => (r.rating === value ? '✓' : '');
    return `<w:tr>${cellXml(String(i + 1), { width: 480, center: true, size: 18 })}${cellXml(domain.label, { width: 3300, size: 18 })}${cellXml(mark('TS'), { width: 620, center: true, bold: true, size: 20 })}${cellXml(mark('S'), { width: 620, center: true, bold: true, size: 20 })}${cellXml(mark('PS'), { width: 620, center: true, bold: true, size: 20 })}${cellXml(r.observation, { width: 2500, size: 16 })}</w:tr>`;
  }).join('');

  const dotted = '........................................................................................................................';
  const appreciation = record.generalAppreciation
    ? `${p(record.generalAppreciation, 18)}${p(dotted, 15)}${p(dotted, 15)}`
    : `${p(dotted, 15)}${p(dotted, 15)}${p(dotted, 15)}${p(dotted, 15)}${p(dotted, 15)}`;

  return `
${p(`${classData.school || 'École maternelle'} — ${classData.name} — Année scolaire ${classData.schoolYear || ''}`, 15, true)}
${p(`Nom et Prénoms de l’enfant : ${(student.nom || '').toUpperCase()} ${student.prenoms || ''}   ·   Matricule : ${student.matricule || '—'}`, 16, true)}
${p('GRILLE D’ÉVALUATION TRIMESTRIELLE', 27, true, true)}
${p(`................ ${trimesterNumeral(record.trimester)} Trimestre ................`, 20, true, true)}
${tableOpen()}
<w:tr>${cellXml('N°', { width: 480, bold: true, center: true, size: 18, vMerge: 'restart' })}${cellXml('Domaine d’Évaluation', { width: 3300, bold: true, center: true, size: 18, vMerge: 'restart' })}${cellXml('Echelle des valeurs', { width: 1860, bold: true, center: true, size: 17, gridSpan: 3 })}${cellXml('Observation', { width: 2500, bold: true, center: true, size: 18, vMerge: 'restart' })}</w:tr>
<w:tr>${cellXml('', { width: 480, vMerge: 'continue' })}${cellXml('', { width: 3300, vMerge: 'continue' })}${cellXml('TS', { width: 620, bold: true, center: true })}${cellXml('S', { width: 620, bold: true, center: true })}${cellXml('PS', { width: 620, bold: true, center: true })}${cellXml('', { width: 2500, vMerge: 'continue' })}</w:tr>
${rows}
</w:tbl>
${p('NB : L’évaluation est faite sur la base de l’observation permanente de l’enfant. Il est évalué par rapport à lui-même et non par rapport à ses camarades.', 17, true)}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
${p('APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)', 21, true, false, true)}
${appreciation}
${tableOpen()}<w:tr>${cellXml('VISA DE L’ENSEIGNANT(E)\n\n\n\n', { width: 4500, bold: true, size: 17 })}${cellXml('VISA DU DIRECTEUR(TRICE)\n\n\n\n', { width: 4500, bold: true, size: 17 })}</w:tr></w:tbl>
${p('VISA DES PARENTS OU TUTEURS DE L’ENFANT', 20, true, true, true)}
${p(dotted, 15)}${p(dotted, 15)}${p(dotted, 15)}
${p('Signature et nom', 17)}
${p('LEGENDES', 18, true, false, true)}
${p('TS : Très Satisfaisant', 17)}
${p('S : Satisfaisant', 17)}
${p('PS : Peu Satisfaisant', 17)}`;
}

export async function exportPreschoolBulletinsDocx(
  classData: ClassData,
  records: PreschoolEvaluationRecord[],
  trimester: PreschoolEvaluationRecord['trimester'],
): Promise<void> {
  const students = sortedStudents(classData);
  const map = recordsFor(classData, students, records, trimester);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const body = students
    .map((s, i) => `${i > 0 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''}${preschoolBulletinWordXml(classData, s, map.get(s.id)!)}`)
    .join('');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="650" w:right="650" w:bottom="650" w:left="650"/></w:sectPr></w:body></w:document>`);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletins-maternelle-${safeName(classData.name)}-${safeName(trimester)}.docx`;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => { try { document.body.removeChild(a); } catch { /* ignore */ } URL.revokeObjectURL(url); }, 4000);
}

/* ------------------------------------------------------------------ */
/* Excel d’observation                                                */
/* ------------------------------------------------------------------ */

export async function exportPreschoolBulletinsExcel(
  classData: ClassData,
  records: PreschoolEvaluationRecord[],
  trimester: PreschoolEvaluationRecord['trimester'],
): Promise<void> {
  const students = sortedStudents(classData);
  const map = recordsFor(classData, students, records, trimester);
  const workbook = new ExcelJS.Workbook();

  const styleHeader = (row: ExcelJS.Row) => row.eachCell(cell => {
    cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B4F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  const ws = workbook.addWorksheet('Grille TS S PS');
  const title = ws.addRow([`GRILLE D’ÉVALUATION TRIMESTRIELLE — ${preschoolTrimesterLabel(trimester).toUpperCase()}`]);
  title.getCell(1).font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FF006B4F' } };
  ws.addRow([`${classData.school || ''} — ${classData.name} — ${classData.schoolYear || ''}`]);
  ws.addRow([]);
  const header = ws.addRow([
    'N°', 'Matricule', 'Nom', 'Prénoms', 'Sexe',
    ...PRESCHOOL_DOMAINS.map(d => d.label),
    'TS', 'S', 'PS', 'Domaines remplis', 'Appréciation générale de l’enseignant(e)',
  ]);
  styleHeader(header);
  students.forEach((student, i) => {
    const record = map.get(student.id)!;
    const c = preschoolCounts(record);
    const row = ws.addRow([
      i + 1, student.matricule || '', (student.nom || '').toUpperCase(), student.prenoms || '', student.sexe || '',
      ...PRESCHOOL_DOMAINS.map(d => record.results[d.id]?.rating || ''),
      c.TS, c.S, c.PS, `${c.completed}/${c.total}`, record.generalAppreciation || '',
    ]);
    row.eachCell(cell => {
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.getCell(2).numFmt = '@';
  });
  ws.columns.forEach((col, idx) => { col.width = idx === 0 ? 6 : idx === 1 ? 17 : idx === 2 ? 18 : idx === 3 ? 25 : idx >= 19 ? 55 : 15; });

  const wsObs = workbook.addWorksheet('Observations');
  const obsHeader = wsObs.addRow(['N°', 'Matricule', 'Nom et Prénoms', ...PRESCHOOL_DOMAINS.map(d => d.label)]);
  styleHeader(obsHeader);
  students.forEach((student, i) => {
    const record = map.get(student.id)!;
    const row = wsObs.addRow([
      i + 1, student.matricule || '', `${student.nom} ${student.prenoms}`,
      ...PRESCHOOL_DOMAINS.map(d => record.results[d.id]?.observation || ''),
    ]);
    row.eachCell(cell => {
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.getCell(2).numFmt = '@';
  });
  wsObs.columns.forEach((col, idx) => { col.width = idx === 0 ? 6 : idx === 1 ? 17 : idx === 2 ? 30 : 24; });

  const wsSynth = workbook.addWorksheet('Synthèse par domaine');
  const synthHeader = wsSynth.addRow(['N°', 'Domaine d’Évaluation', 'TS', 'S', 'PS', 'Non renseigné', 'Effectif']);
  styleHeader(synthHeader);
  PRESCHOOL_DOMAINS.forEach((domain, i) => {
    const counts = { TS: 0, S: 0, PS: 0, '': 0 } as Record<PreschoolRating, number>;
    students.forEach(s => { counts[map.get(s.id)!.results[domain.id]?.rating || '']++; });
    wsSynth.addRow([i + 1, domain.label, counts.TS, counts.S, counts.PS, counts[''], students.length]);
  });
  wsSynth.addRow([]);
  wsSynth.addRow(['NB', 'L’enfant est évalué par rapport à lui-même et non par rapport à ses camarades : cette synthèse ne produit aucun rang.']);
  wsSynth.columns = [{ width: 7 }, { width: 48 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 14 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grille-maternelle-${safeName(classData.name)}-${safeName(trimester)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => { try { document.body.removeChild(a); } catch { /* ignore */ } URL.revokeObjectURL(url); }, 4000);
}
