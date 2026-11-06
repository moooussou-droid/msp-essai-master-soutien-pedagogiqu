/**
 * Export des présences :
 * - Excel (.xlsx) : registre d'appel mensuel (élèves × jours) + synthèse par élève
 * - Word (.docx) : Procès-Verbal mensuel officiel (prêt pour la circonscription)
 *
 * Format des données : identique à AttendanceScreen (localStorage msp_attendance_records)
 */
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ClassData } from './database';
import { sortStudents } from './database';
import { getProfile } from './userProfile';

import { HalfDay, halfDaysFor, weekdayName } from './attendanceSchedule';

export type AttendanceStatus =
  | 'present' | 'absent_injustifiee' | 'absent_justifiee'
  | 'ferie' | 'demi_journee_seance'
  /** @deprecated conservé pour relire les registres antérieurs à la v36 */
  | 'retard';

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  motif?: string;
  /** Demi-journée concernée (v36). Absent = registre ancien → matin. */
  half?: HalfDay;
}

export interface AttendanceDay {
  id: string;
  classId: string;
  date: string; // AAAA-MM-JJ
  entries: AttendanceEntry[];
}

const STATUS_SHORT: Record<AttendanceStatus, string> = {
  present: 'P',
  absent_injustifiee: 'AI',
  absent_justifiee: 'AJ',
  ferie: 'F',
  demi_journee_seance: 'DS',
  retard: 'R',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent_injustifiee: 'Absence sans justification',
  absent_justifiee: 'Absence avec justification',
  ferie: 'Journée fériée',
  demi_journee_seance: 'Demi-journée de séance',
  retard: 'Retard',
};

/** Demi-journée d'une entrée (registres antérieurs à la v36 = matin). */
export function entryHalf(e: AttendanceEntry): HalfDay {
  return e.half || 'matin';
}

/** Colonnes du registre : une par demi-journée réellement travaillée. */
export function dayColumns(day: AttendanceDay): { half: HalfDay; label: string }[] {
  return halfDaysFor(day.date).map(h => ({ half: h, label: h === 'matin' ? 'M' : 'S' }));
}

/** Entrée d'un élève pour une demi-journée précise. */
export function findEntry(day: AttendanceDay, studentId: string, half: HalfDay): AttendanceEntry | undefined {
  return day.entries.find(e => e.studentId === studentId && entryHalf(e) === half);
}

export { weekdayName };

export function loadAttendanceRecords(): AttendanceDay[] {
  try {
    return JSON.parse(localStorage.getItem('msp_attendance_records') || '[]');
  } catch {
    return [];
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateFr(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/**
 * Statistiques de présence d'un élève, comptées PAR DEMI-JOURNÉE (v36).
 * Les demi-journées fériées sont exclues du total : elles ne peuvent pas
 * pénaliser l'élève.
 */
export function computeStudentAttendance(records: AttendanceDay[], studentId: string) {
  let present = 0, retard = 0, absInjust = 0, absJust = 0, ferie = 0, seance = 0, total = 0;
  for (const r of records) {
    for (const half of halfDaysFor(r.date)) {
      const e = findEntry(r, studentId, half);
      const status: AttendanceStatus = e ? e.status : 'present';
      if (status === 'ferie') { ferie++; continue; } // non comptabilisé
      total++;
      if (status === 'present') present++;
      else if (status === 'demi_journee_seance') { seance++; present++; }
      else if (status === 'retard') retard++;
      else if (status === 'absent_justifiee') absJust++;
      else absInjust++;
    }
  }
  const taux = total > 0 ? Math.round(((present + retard) / total) * 100) : 0;
  return { present, retard, absInjust, absJust, ferie, seance, total, taux };
}

/** Moyenne de présence de la classe. */
export function computeClassAttendance(records: AttendanceDay[], studentIds: string[]) {
  if (records.length === 0 || studentIds.length === 0) return { taux: 0, jours: 0 };
  const sum = studentIds.reduce((acc, sid) => acc + computeStudentAttendance(records, sid).taux, 0);
  return { taux: Math.round(sum / studentIds.length), jours: records.length };
}

/** Regroupe les jours par mois (AAAA-MM) et retourne les mois disponibles. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function availableMonths(records: AttendanceDay[], classId: string): string[] {
  const set = new Set<string>();
  records.filter((r) => r.classId === classId).forEach((r) => set.add(monthKey(r.date)));
  return [...set].sort().reverse();
}

/** Filtre les jours d'un mois pour une classe. */
export function recordsForMonth(records: AttendanceDay[], classId: string, month: string): AttendanceDay[] {
  return records
    .filter((r) => r.classId === classId && monthKey(r.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/* Excel : registre + synthèse                                        */
/* ------------------------------------------------------------------ */

export async function exportAttendanceExcel(
  classData: ClassData,
  days: AttendanceDay[],
  month: string,
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Registre');
  const students = sortStudents(classData.students);

  // En-tête : N° | Matricule | Nom & Prénoms | days.length colonnes (JJ/MM) | Taux
  // v36 : une colonne PAR DEMI-JOURNÉE (M = matin, S = après-midi).
  // Le mercredi n'a qu'une seule demi-journée ; samedi/dimanche sont exclus.
  const cols = days.flatMap((d) => dayColumns(d).map((c) => ({ day: d, ...c })));
  const header = [
    'N°', 'Matricule', 'Nom & Prénoms',
    ...cols.map((c) => `${dateFr(c.day.date)} ${c.label}`),
    'Taux %',
  ];
  const hRow = ws.addRow(header);
  hRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B4F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  students.forEach((student, idx) => {
    const row = ws.addRow([
      idx + 1,
      student.matricule || '',
      `${(student.nom || '').toUpperCase()} ${student.prenoms || ''}`,
      ...cols.map((c) => {
        const e = findEntry(c.day, student.id, c.half);
        const status = e ? e.status : 'present';
        return STATUS_SHORT[status] || 'P';
      }),
      computeStudentAttendance(days, student.id).taux,
    ]);
    row.eachCell((cell, col) => {
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { horizontal: col <= 2 ? 'center' : col === 3 ? 'left' : 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.getCell(2).numFmt = '@'; // matricule texte
  });

  // Légende
  ws.addRow([]);
  const legend = ws.addRow(['Légende : P = Présent • AJ = Absence avec justification • AI = Absence sans justification • F = Journée fériée • DS = Demi-journée de séance  —  Colonnes : M = matin, S = après-midi (le mercredi ne compte qu\'une demi-journée ; pas de classe samedi et dimanche)']);
  legend.eachCell((cell) => { cell.font = { italic: true, size: 9, name: 'Arial' }; });

  // Feuille synthèse
  const ws2 = workbook.addWorksheet('Synthèse');
  const syn = [
    ['SYNTHÈSE DES PRÉSENCES', ''],
    ['École', classData.school || '—'],
    ['Classe', classData.name],
    ['Période', `${dateFr(days[0]?.date || '')} → ${dateFr(days[days.length - 1]?.date || '')}`],
    ['Jours de classe suivis', days.length],
    ['Effectif', students.length],
    ['', ''],
    ['Élève', 'Présent', 'Retard', 'Abs. injustifiée', 'Abs. justifiée', 'Taux %'],
  ];
  const sRow = ws2.addRow(syn[7]);
  sRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B4F' } };
    cell.alignment = { horizontal: 'center' };
  });
  students.forEach((student) => {
    const st = computeStudentAttendance(days, student.id);
    const row = ws2.addRow([
      `${(student.nom || '').toUpperCase()} ${student.prenoms || ''}`,
      st.present, st.retard, st.absInjust, st.absJust, st.taux,
    ]);
    row.eachCell((cell, col) => {
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center' };
      if (col > 1) {
        cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' } };
      }
    });
  });
  const classAvg = computeClassAttendance(days, students.map((s) => s.id));
  const avgRow = ws2.addRow(['MOYENNE DE CLASSE', '', '', '', '', `${classAvg.taux} %`]);
  avgRow.eachCell((cell) => { cell.font = { bold: true, size: 10, name: 'Arial' }; });

  ws2.columns = [
    { width: 32 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 10 },
  ];
  ws.columns.forEach((col, i) => {
    col.width = i === 3 ? 32 : i === 1 ? 12 : i < 4 ? 14 : 9;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safe = classData.school.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cls = classData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const name = filename || `registre_presences_${safe}_${cls}_${month}.xlsx`.replace(/_+/g, '_');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try { document.body.removeChild(link); } catch { /* déjà retiré */ }
    URL.revokeObjectURL(url);
  }, 4000);
}

/* ------------------------------------------------------------------ */
/* Word : PV mensuel officiel                                         */
/* ------------------------------------------------------------------ */

export async function exportAttendanceDocx(
  classData: ClassData,
  days: AttendanceDay[],
  month: string,
  filename?: string
): Promise<void> {
  const students = sortStudents(classData.students);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const para = (t: string, bold = false, size = 18, center = false) =>
    `<w:p><w:pPr><w:spacing w:after="60"/>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;

  const cell = (t: string, bold = false, center = false) =>
    `<w:tc><w:p><w:pPr>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p></w:tc>`;

  // Tableau des présences par DEMI-JOURNÉE (v36) : M = matin, S = après-midi.
  const wcols = days.flatMap((d) => dayColumns(d).map((c) => ({ day: d, ...c })));
  let rows = '';
  for (const student of students) {
    const st = computeStudentAttendance(days, student.id);
    const dayCells = wcols
      .map((c) => {
        const e = findEntry(c.day, student.id, c.half);
        const status = e ? e.status : 'present';
        return cell(STATUS_SHORT[status], false, true);
      })
      .join('');
    rows += `<w:tr>${cell(`${(student.nom || '').toUpperCase()} ${student.prenoms || ''}`, false)}${dayCells}${cell(`${st.taux} %`, false, true)}</w:tr>`;
  }
  const dayHeaders = wcols.map((c) => cell(`${dateFr(c.day.date)} ${c.label}`, true, true)).join('');
  const table = `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tr>${cell('Élève', true)}${dayHeaders}${cell('Taux', true, true)}</w:tr>${rows}</w:tbl>`;

  // Détail absences
  const absLines = students
    .map((s) => {
      const st = computeStudentAttendance(days, s.id);
      if (st.absInjust === 0 && st.absJust === 0) return '';
      const motifs = days
        .flatMap((d) => halfDaysFor(d.date).map((h) => ({ d, h, e: findEntry(d, s.id, h) })))
        .filter(({ e }) => e && (e.status === 'absent_injustifiee' || e.status === 'absent_justifiee'))
        .map(({ d, h, e }) =>
          `${dateFr(d.date)} ${h === 'matin' ? 'matin' : 'après-midi'} (${STATUS_LABEL[e!.status]}${e!.motif ? ' — ' + e!.motif : ''})`)
        .join(' ; ');
      return para(`• ${(s.nom || '').toUpperCase()} ${s.prenoms || ''} : ${st.absInjust + st.absJust} absence(s) — ${motifs}`, false, 16);
    })
    .filter(Boolean)
    .join('');

  const classAvg = computeClassAttendance(days, students.map((s) => s.id));
  const profile = getProfile();
  const circonscription = classData.circonscription || profile.circonscription || '';

  const body = `
${para('RÉPUBLIQUE DU BÉNIN', true, 20, true)}
${para(classData.school || profile.schoolName || 'École', true, 20, true)}
${circonscription ? para(circonscription, false, 16, true) : ''}
${para('PROCÈS-VERBAL DES PRÉSENCES', true, 24, true)}
${para(`${classData.name} • ${classData.schoolYear} • Période : ${dateFr(days[0]?.date || '')} au ${dateFr(days[days.length - 1]?.date || '')}`, false, 18, true)}
${para(`Jours de classe : ${days.length} — Effectif : ${students.length} — Taux moyen de présence : ${classAvg.taux} %`, false, 18, true)}
${para('1. REGISTRE DES PRÉSENCES', true, 18)}
${table}
${para('2. DÉTAIL DES ABSENCES', true, 18)}
${absLines || para('Aucune absence enregistrée sur la période.', false, 16)}
${para('3. Fait le ' + dateFr(days[days.length - 1]?.date || new Date().toISOString().split('T')[0]), false, 16)}
${para('Signature de l\'enseignant(e)                           Signature du Directeur / de la Directrice', false, 16)}
`;

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body>
</w:document>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const safe = classData.school.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cls = classData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const name = filename || `pv_presences_${safe}_${cls}_${month}.docx`.replace(/_+/g, '_');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try { document.body.removeChild(link); } catch { /* déjà retiré */ }
    URL.revokeObjectURL(url);
  }, 4000);
}
