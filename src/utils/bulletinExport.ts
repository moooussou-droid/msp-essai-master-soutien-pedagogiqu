/**
 * Export GROUPÉ des bulletins — toute la classe en un seul fichier :
 * - Excel (.xlsx) : tableau récapitulatif (notes, moyennes, rangs, mentions) + synthèse
 * - Word (.docx) : un bulletin officiel par élève, avec saut de page entre chaque
 *
 * Depuis la v23 :
 * - Maternelle / Primaire : un bulletin PAR évaluation (formative 1,
 *   sommative 1/2/3) — passé via `options.evaluation`.
 * - Secondaire : bulletin officiel (MEPE, NPS1, NPS2, MS, MSC, rang,
 *   moyennes de classe, bilans littéraire / scientifique / autres).
 */
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ClassData, isSecondaire, EvaluationId, evaluationLabel, classSequence } from './database';
import { StudentBulletin, computeGroupBilans, getMentionConseil } from './bulletin';
import {
  classPreschoolTrimester, isPrescolaireClass, loadPreschoolEvaluations,
} from './prescolaireBulletin';
import {
  exportPreschoolBulletinsDocx, exportPreschoolBulletinsExcel,
} from './prescolaireBulletinExport';

export interface BulletinExportOptions {
  evaluation?: EvaluationId;
}

/* ------------------------------------------------------------------ */
/* Word (.docx)                                                       */
/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Formate une date AAAA-MM-JJ en JJ/MM/AAAA. */
function dateFr(iso?: string): string {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function cellW(text: string, bold = false, size = 18, center = false, width = 1000): string {
  const t = esc(String(text));
  const b = bold ? '<w:b/>' : '';
  const c = center ? '<w:jc w:val="center"/>' : '';
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcMar><w:top w:w="20" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="left"/>${c}</w:pPr><w:r><w:rPr>${b}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p></w:tc>`;
}

function cell(text: string, bold = false, size = 18, center = false): string {
  return cellW(text, bold, size, center, 1000);
}

function heading(text: string, size = 20, center = false): string {
  const c = center ? '<w:jc w:val="center"/>' : '';
  return `<w:p><w:pPr>${c}<w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function line(text: string, size = 18, center = false): string {
  const c = center ? '<w:jc w:val="center"/>' : '';
  return `<w:p><w:pPr>${c}<w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function pageBreak(): string {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function tableOpen(borders = true): string {
  const b = borders
    ? '<w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders>'
    : '';
  return `<w:tbl><w:tblPr>${b}<w:tblW w:w="0" w:type="auto"/></w:tblPr>`;
}

const fmt = (v: number | null): string => (v === null ? '' : v.toFixed(2));

/** Bulletin Word — format officiel du secondaire (v23). */
function bulletinXmlSecondaire(classData: ClassData, b: StudentBulletin): string {
  const bilans = computeGroupBilans(b);
  const appr = getAppreciationCourte(b.moyenne);
  const mentionConseil = getMentionConseil(b.moyenne);
  const mentions = ['Félicitations', 'Encouragements', 'Tableau d\'honneur', 'Avertissement / Travail', 'Blâme / Travail'];

  let rows = '';
  for (const r of b.results) {
    const abs = r.msAbsent;
    const v = (x: number | null) => (abs ? 'ABS' : fmt(x));
    rows += `<w:tr>`
      + cellW(r.subject.name, false, 16, false, 1700)
      + cellW(String(r.coefficient), false, 16, true, 420)
      + cellW(v(r.mepe), false, 16, true, 620)
      + cellW(v(r.nps1), false, 16, true, 620)
      + cellW(v(r.nps2), false, 16, true, 620)
      + cellW(fmt(r.ms), true, 16, true, 600)
      + cellW(fmt(r.msc), false, 16, true, 620)
      + cellW(r.ms !== null && r.subjectRang > 0 ? `${r.subjectRang}ᵉ` : '—', false, 16, true, 400)
      + cellW(fmt(r.minClasse), false, 16, true, 520)
      + cellW(fmt(r.maxClasse), false, 16, true, 520)
      + cellW(abs ? 'ABS' : getAppreciationCourte(r.ms), false, 14, false, 1600)
      + `</w:tr>`;
  }

  // Bilans (littéraire / scientifique / autres)
  for (const g of bilans) {
    rows += `<w:tr><w:tc><w:tcPr><w:tcW w:w="1700" w:type="dxa"/><w:shd w:val="clear" w:fill="EFEFEF"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(g.label)}</w:t></w:r></w:p></w:tc>`
      + cellW(String(g.count > 0 ? g.count : ''), false, 16, true, 420)
      + cellW('', false, 16, true, 620) + cellW('', false, 16, true, 620) + cellW('', false, 16, true, 620)
      + cellW(fmt(g.moyenne), true, 16, true, 600)
      + cellW('', false, 16, true, 620)
      + cellW('', false, 16, true, 400)
      + cellW('', false, 16, true, 520)
      + cellW('', false, 16, true, 520)
      + cellW('', false, 14)
      + `</w:tr>`;
  }

  // Ligne Total
  rows += `<w:tr><w:tc><w:tcPr><w:tcW w:w="1700" w:type="dxa"/><w:shd w:val="clear" w:fill="EFEFEF"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">Total</w:t></w:r></w:p></w:tc>`
    + cellW(String(b.totalCoef || ''), true, 17, true, 420)
    + cellW('', false, 17, true, 620) + cellW('', false, 17, true, 620) + cellW('', false, 17, true, 620)
    + cellW(fmt(b.moyenne), true, 17, true, 600)
    + cellW('', false, 17, true, 620)
    + cellW(b.rang > 0 ? `${b.rang}ᵉ` : '—', true, 17, true, 400)
    + cellW('', false, 17, true, 520) + cellW('', false, 17, true, 520)
    + cellW(`Moyenne semestrielle : ${fmt(b.moyenne)} / 20`, true, 15, false, 1600)
    + `</w:tr>`;

  // Mentions du conseil des professeurs (case cochée ☒)
  const mentionLines = mentions
    .map((m) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="4700" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:t xml:space="preserve">${(mentionConseil === m ? '☒' : '☐')}  ${esc(m)}</w:t></w:r></w:p></w:tc></w:tr>`)
    .join('');

  const dateFait = new Date().toLocaleDateString('fr-FR');

  return `
${line('RÉPUBLIQUE DU BÉNIN', 18, true)}
${line("Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle", 13, true)}
${heading(classData.school || 'École', 24, true)}
${classData.circonscription ? line(classData.circonscription, 16, true) : ''}
${heading(`BULLETIN DE NOTES DU ${classSequence(classData).toUpperCase()}`, 22, true)}
${line(`Année scolaire : ${classData.schoolYear}`, 18, true)}
${line('', 10)}
${tableOpen(false)}
<w:tr>${cellW('Matricule :', true, 16, false, 2000)}${cellW(b.student.matricule || '—', false, 16, false, 2600)}${cellW('Sexe :', true, 16, false, 800)}${cellW(b.student.sexe === 'M' ? 'M' : b.student.sexe === 'F' ? 'F' : '—', false, 16, false, 700)}</w:tr>
<w:tr>${cellW('Nom & Prénoms :', true, 16, false, 2000)}${cellW(`${b.student.nom.toUpperCase()} ${b.student.prenoms}`, false, 16, false, 2600)}${cellW('Statut :', true, 16, false, 800)}${cellW('N', false, 16, false, 700)}</w:tr>
<w:tr>${cellW('Classe :', true, 16, false, 2000)}${cellW(classData.serie ? `${classData.level} ${classData.serie}` : classData.level, false, 16, false, 2600)}${cellW('Effectif :', true, 16, false, 800)}${cellW(String(b.effectif), false, 16, false, 700)}</w:tr>
</w:tbl>
${line('', 10)}
${tableOpen()}
<w:tr>${cellW('Matières', true, 15, true, 1700)}${cellW('Coef.', true, 15, true, 420)}${cellW('MEPE', true, 15, true, 620)}${cellW('NPS1', true, 15, true, 620)}${cellW('NPS2', true, 15, true, 620)}${cellW('MS', true, 15, true, 600)}${cellW('MSC', true, 15, true, 620)}${cellW('Rang', true, 15, true, 400)}${cellW('Plus faible', true, 14, true, 520)}${cellW('Plus forte', true, 14, true, 520)}${cellW('Appréciation et Signature du Professeur', true, 14, true, 1600)}</w:tr>
${rows}
</w:tbl>
${line('', 10)}
${tableOpen(false)}
<w:tr>${cellW('Mentions du Conseil des Professeurs', true, 15, false, 4700)}${cellW('Appréciation du Chef d\'Établissement', true, 15, false, 3300)}</w:tr>
${mentionLines}
<w:tr><w:tc><w:tcPr><w:tcW w:w="4700" w:type="dxa"/></w:tcPr><w:p><w:r><w:sz w:val="15"/></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3300" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t xml:space="preserve">${esc(appr)}</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl>
${line('', 10)}
${heading('SIGNATURES', 16)}
${line(`Fait à ${classData.circonscription ? 'Porto-Novo' : '______________'}, le ${dateFait}`, 15)}
${line('', 10)}
${line('Le Directeur / Le Chef d\'Établissement                    L\'Enseignant(e)                    Les Parents', 15)}
${line('', 10)}
${line(`Copie originale  |  Bulletin n° ${b.student.id.slice(-4).toUpperCase()}  |  ${classData.sequence} ${classData.schoolYear}`, 12)}`;
}

/** Appréciation pédagogique courte (par matière / globale). */
function getAppreciationCourte(moyenne: number | null): string {
  if (moyenne === null) return 'Non noté';
  if (moyenne >= 18) return 'Excellent travail';
  if (moyenne >= 16) return 'Très bien';
  if (moyenne >= 14) return 'Travail assez bon';
  if (moyenne >= 12) return 'Bien';
  if (moyenne >= 10) return 'Passable';
  if (moyenne >= 8) return 'Insuffisant';
  return 'Doit travailler';
}

/** Bulletin Word — Maternelle / Primaire (un bulletin par évaluation). */
function bulletinXmlPrimaire(classData: ClassData, b: StudentBulletin, evaluation?: EvaluationId): string {
  const row = (label: string, value: string) =>
    `<w:tr><w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(label)}</w:t></w:r></w:p></w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr><w:p><w:r><w:sz w:val="18"/><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p></w:tc></w:tr>`;

  let notesRows = '';
  for (const r of b.results) {
    const val = r.absent ? 'ABS' : r.total !== null ? r.total.toFixed(2) : '—';
    notesRows += `<w:tr>${cell(r.subject.name, false, 18)}${cell(val, false, 18, true)}</w:tr>`;
  }

  const titre = evaluation
    ? `BULLETIN DE NOTES — ${evaluationLabel(evaluation, classData.customEvaluations).toUpperCase()}`
    : 'BULLETIN DE NOTES';

  return `
${heading('RÉPUBLIQUE DU BÉNIN', 18, true)}
${heading('Ministère des Enseignements Maternel et Primaire', 13, true)}
${heading(classData.school || 'École', 22, true)}
${heading(titre, 22, true)}
${line(`Classe : ${classData.name} • ${classData.schoolYear} • ${classData.sequence}`, 17, true)}
${line(`Effectif : ${b.effectif} élèves`, 15, true)}
${line('', 8)}
${tableOpen(false)}
${row('Nom & Prénoms', `${b.student.nom.toUpperCase()} ${b.student.prenoms}`)}
${row('Matricule', b.student.matricule || '—')}
${row('Sexe', b.student.sexe === 'M' ? 'Masculin (M)' : b.student.sexe === 'F' ? 'Féminin (F)' : '—')}
${row('Date de naissance', dateFr(b.student.dateNaissance))}
${row('Niveau', classData.serie ? `${classData.level} ${classData.serie}` : classData.level)}
</w:tbl>
${line('', 8)}
${heading('RÉSULTATS PAR MATIÈRE', 18)}
${tableOpen()}
<w:tr>${cell('Matière', true, 17, true)}${cell('Note /20', true, 17, true)}</w:tr>${notesRows}</w:tbl>
${heading(`MOYENNE GÉNÉRALE : ${b.moyenne !== null ? b.moyenne.toFixed(2) : '—'} / 20`, 22, true)}
${line(`Rang : ${b.rang > 0 ? b.rang + 'ᵉ sur ' + b.effectif : '—'}   •   Mention : ${b.mention}`, 16, true)}
${line(`Appréciation : ${b.appreciation}`, 16, true)}
${classData.evaluationType ? line(`Type d'évaluation : ${classData.evaluationType} (${classData.sequence})`, 16, true) : ''}
${line('', 8)}
${heading('SIGNATURES', 17)}
${line('Le Directeur / La Directrice                    L\'Enseignant(e)                    Les Parents', 15)}`;
}

function bulletinXml(classData: ClassData, b: StudentBulletin, evaluation?: EvaluationId): string {
  return isSecondaire(classData)
    ? bulletinXmlSecondaire(classData, b)
    : bulletinXmlPrimaire(classData, b, evaluation);
}

export async function exportBulletinsDocx(
  classData: ClassData,
  bulletins: StudentBulletin[],
  options?: BulletinExportOptions,
  filename?: string
): Promise<void> {
  // v67 — garde-fou : aucun ancien chemin ne doit produire un bulletin
  // numérique classé pour la maternelle.
  if (isPrescolaireClass(classData)) {
    await exportPreschoolBulletinsDocx(
      classData,
      loadPreschoolEvaluations(),
      classPreschoolTrimester(classData),
    );
    return;
  }
  const evaluation = options?.evaluation;
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

  const body = bulletins
    .map((b, i) => (i > 0 ? pageBreak() : '') + bulletinXml(classData, b, evaluation))
    .join('');

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr>
</w:body>
</w:document>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const safe = classData.school.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cls = classData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const evalSlug = evaluation ? `_${evaluation}` : '';
  const name = filename || `bulletins_${safe}_${cls}_${classSequence(classData).replace(/\s+/g, '')}${evalSlug}.docx`.replace(/_+/g, '_');

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
/* Excel (.xlsx)                                                      */
/* ------------------------------------------------------------------ */

export async function exportBulletinsExcel(
  classData: ClassData,
  bulletins: StudentBulletin[],
  options?: BulletinExportOptions,
  filename?: string
): Promise<void> {
  // v67 — l’Excel de maternelle est une grille TS/S/PS, jamais un tableau
  // de moyennes et de rangs.
  if (isPrescolaireClass(classData)) {
    await exportPreschoolBulletinsExcel(
      classData,
      loadPreschoolEvaluations(),
      classPreschoolTrimester(classData),
    );
    return;
  }
  const evaluation = options?.evaluation;
  const secondaire = isSecondaire(classData);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Bulletins');

  const subjects = [...classData.subjects].sort((a, b) => a.order - b.order);

  // En-têtes : secondaire = 4 colonnes par matière (MEPE, NPS1, NPS2, MS)
  const subjectHeaders = secondaire
    ? subjects.flatMap((s) => [`${s.name} MEPE`, `${s.name} NPS1`, `${s.name} NPS2`, `${s.name} MS`])
    : subjects.map((s) => s.name + ' /20');
  const headers = ['N°', 'Matricule', 'Nom', 'Prénoms', 'Sexe', 'Naissance', ...subjectHeaders, 'Moyenne /20', 'Rang', 'Mention', 'Décision'];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B4F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  bulletins.forEach((b, index) => {
    const perSubject = subjects.flatMap((s) => {
      const r = b.results.find((x) => x.subject.id === s.id);
      if (!r) return secondaire ? ['', '', '', ''] : [''];
      if (secondaire) {
        return [fmt(r.mepe), fmt(r.nps1), fmt(r.nps2), fmt(r.ms)];
      }
      if (r.absent) return ['ABS'];
      return [r.total !== null ? Number(r.total.toFixed(2)) : ''];
    });
    const row = ws.addRow([
      index + 1,
      b.student.matricule || '',
      (b.student.nom || '').toUpperCase(),
      b.student.prenoms || '',
      b.student.sexe === 'M' ? 'M' : b.student.sexe === 'F' ? 'F' : '',
      dateFr(b.student.dateNaissance),
      ...perSubject,
      b.moyenne !== null ? Number(b.moyenne.toFixed(2)) : null,
      b.rang > 0 ? b.rang : null,
      b.mention || '',
      b.moyenne !== null && b.moyenne >= 10 ? 'Admis(e)' : b.moyenne !== null ? 'Ajourné(e)' : '',
    ]);
    row.eachCell((cell) => {
      cell.font = { size: 10, name: 'Arial' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    const matCell = row.getCell(2);
    matCell.numFmt = '@';
  });

  ws.columns.forEach((col, i) => { col.width = i === 3 ? 28 : i === 2 ? 12 : 13; });

  // Feuille Synthèse
  const ws2 = workbook.addWorksheet('Synthèse');
  const stats = computeStats(bulletins);
  const rows2: [string, string | number][] = [
    ['SYNTHÈSE DE CLASSE', ''],
    ['École', classData.school || '—'],
    ['Classe', classData.name],
    ['Année scolaire', classData.schoolYear],
    ['Période', evaluation ? evaluationLabel(evaluation, classData.customEvaluations) : (classData.sequence || '—')],
    ['Type d\'évaluation', classData.evaluationType || '—'],
    ['Effectif total', stats.effectif],
    ['Élèves notés', stats.noted],
    ['Moyenne de classe /20', stats.moyenneClasse !== null ? Number(stats.moyenneClasse.toFixed(2)) : '—'],
    ['Taux de réussite (%)', stats.tauxReussite !== null ? Number(stats.tauxReussite.toFixed(1)) : '—'],
    ['Admis (moyenne ≥ 10)', stats.admis],
    ['Ajournés', stats.ajournes],
    ['Moyenne la plus forte', stats.plusForte !== null ? Number(stats.plusForte.toFixed(2)) : '—'],
    ['Moyenne la plus faible', stats.plusFaible !== null ? Number(stats.plusFaible.toFixed(2)) : '—'],
    ['', ''],
    ['Mentions', ''],
    ['Excellent (≥ 18)', stats.mentions.Excellent],
    ['Très Bien (16-17.99)', stats.mentions['Très Bien']],
    ['Bien (14-15.99)', stats.mentions.Bien],
    ['Assez Bien (12-13.99)', stats.mentions['Assez Bien']],
    ['Passable (10-11.99)', stats.mentions.Passable],
    ['Insuffisant (8-9.99)', stats.mentions.Insuffisant],
    ['Faible (< 8)', stats.mentions.Faible],
  ];
  rows2.forEach(([label, value]) => {
    const row = ws2.addRow([label, value]);
    row.eachCell((cell, col) => {
      cell.font = { size: 11, name: 'Arial', bold: col === 1 && ['SYNTHÈSE DE CLASSE', 'Mentions'].includes(label) };
      if (!['SYNTHÈSE DE CLASSE', 'Mentions'].includes(label)) {
        cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' } };
      }
    });
  });
  ws2.columns = [{ width: 40 }, { width: 16 }];
  ws2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF006B4F' } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safe = classData.school.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cls = classData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const evalSlug = evaluation ? `_${evaluation}` : '';
  const name = filename || `bulletins_recap_${safe}_${cls}_${classSequence(classData).replace(/\s+/g, '')}${evalSlug}.xlsx`.replace(/_+/g, '_');

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

function computeStats(bulletins: StudentBulletin[]) {
  const withMoy = bulletins.filter((b) => b.moyenne !== null);
  const effectif = bulletins.length;
  const noted = withMoy.length;
  const moyenneClasse = noted > 0 ? withMoy.reduce((s, b) => s + (b.moyenne ?? 0), 0) / noted : null;
  const admis = withMoy.filter((b) => (b.moyenne ?? 0) >= 10).length;
  const ajournes = noted - admis;
  const tauxReussite = noted > 0 ? (admis / noted) * 100 : null;
  const plusForte = noted > 0 ? Math.max(...withMoy.map((b) => b.moyenne ?? 0)) : null;
  const plusFaible = noted > 0 ? Math.min(...withMoy.map((b) => b.moyenne ?? 0)) : null;
  const mentions: Record<string, number> = {
    Excellent: 0, 'Très Bien': 0, Bien: 0, 'Assez Bien': 0, Passable: 0, Insuffisant: 0, Faible: 0,
  };
  withMoy.forEach((b) => { if (b.mention && mentions[b.mention] !== undefined) mentions[b.mention]++; });
  return { effectif, noted, moyenneClasse, admis, ajournes, tauxReussite, plusForte, plusFaible, mentions };
}
