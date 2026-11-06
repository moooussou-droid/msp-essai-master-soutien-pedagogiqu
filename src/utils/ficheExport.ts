/**
 * Export des fiches pédagogiques générées :
 * - Impression / PDF (fenêtre d'impression propre)
 * - Téléchargement Word (.docx) — généré localement avec JSZip (aucune lib externe)
 */
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import type { GeneratedLessonPlan } from './aiLessonGenerator';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Génère un Word structuré et lisible, en conservant l’ordre des rubriques du modèle. */
export function buildDocxXml(plan: GeneratedLessonPlan): string {
  const paragraph = (text: string, options: { bold?: boolean; size?: number; color?: string; fill?: string; after?: number; keep?: boolean } = {}) => {
    const { bold = false, size = 21, color = '24332E', fill, after = 100, keep = false } = options;
    const pPr = `<w:pPr><w:spacing w:after="${after}"/>${keep ? '<w:keepNext/>' : ''}${fill ? `<w:shd w:fill="${fill}" w:val="clear"/>` : ''}</w:pPr>`;
    const rPr = `<w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/></w:rPr>`;
    return String(text || '').split(/\r?\n/).map(line => line
      ? `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`
      : '<w:p/>').join('');
  };
  const cell = (text: string, fill: string, bold = false) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:fill="${fill}" w:val="clear"/></w:tcPr>${paragraph(text, { bold, size: 19, color: fill === '006B4F' ? 'FFFFFF' : '24332E', after: 40 })}</w:tc>`;
  const metadataTable = `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="C8D8D0"/><w:left w:val="single" w:sz="4" w:color="C8D8D0"/><w:bottom w:val="single" w:sz="4" w:color="C8D8D0"/><w:right w:val="single" w:sz="4" w:color="C8D8D0"/><w:insideH w:val="single" w:sz="4" w:color="C8D8D0"/><w:insideV w:val="single" w:sz="4" w:color="C8D8D0"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>${cell(`CLASSE : ${plan.classe || 'À confirmer'}`, 'EAF4EF')}${cell(`MATIÈRE : ${plan.matiere || 'À confirmer'}`, 'EAF4EF')}${cell(`DURÉE : ${plan.duree || 'À confirmer'}`, 'EAF4EF')}</w:tr></w:tbl>`;
  const sections = plan.rubriques?.length ? plan.rubriques : [
    { titre: 'Compétence', contenu: plan.competence },
    { titre: 'Objectif', contenu: plan.objectif },
    { titre: 'Matériel', contenu: plan.materiel },
    { titre: 'Déroulement', contenu: plan.deroulement },
    { titre: 'Évaluation', contenu: plan.evaluation },
  ];
  const sectionXml = sections.filter(section => section.titre || section.contenu).map(section =>
    paragraph(section.titre, { bold: true, size: 23, color: '006B4F', fill: 'EAF4EF', after: 120, keep: true })
      + paragraph(section.contenu || 'À compléter.', { size: 21, after: 180 }),
  ).join('');
  const checksXml = plan.pointsAControler?.length
    ? paragraph('POINTS À VÉRIFIER AVANT UTILISATION', { bold: true, size: 22, color: '8A5200', fill: 'FFF3D8', after: 120, keep: true })
      + plan.pointsAControler.map(point => paragraph(`• ${point}`, { size: 19, color: '604000', after: 80 })).join('')
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${paragraph('MASTER SOUTIEN PÉDAGOGIQUE', { bold: true, size: 17, color: '006B4F', after: 70 })}
${paragraph('FICHE DE PRÉPARATION', { bold: true, size: 32, color: '006B4F', after: 80, keep: true })}
${paragraph(plan.titre || 'Leçon à préciser', { bold: true, size: 27, color: '183B31', after: 180, keep: true })}
${metadataTable}
${paragraph('', { after: 80 })}
${sectionXml}
${checksXml}
${paragraph('Document généré avec l’assistance de l’IA — relecture et validation par l’enseignant requises.', { size: 16, color: '65766E', after: 0 })}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="800" w:right="850" w:bottom="800" w:left="850"/></w:sectPr>
</w:body></w:document>`;
}

/** Génère et télécharge un fichier .docx de la fiche. */
export async function downloadFicheDocx(plan: GeneratedLessonPlan, filename?: string): Promise<void> {
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
  zip.file('word/document.xml', buildDocxXml(plan));

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const safe = (plan.titre || 'fiche').replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüç -]/g, '').replace(/\s+/g, '_').slice(0, 60);
  const name = filename || `fiche_${safe}_${plan.classe || ''}.docx`.replace(/\s+/g, '_');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch { /* déjà retiré */ }
    URL.revokeObjectURL(url);
  }, 4000);
}

/** Construit un PDF A4 lisible, avec rubriques, métadonnées et pagination. */
export function buildFichePdf(plan: GeneratedLessonPlan): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 17) return;
    doc.addPage();
    y = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 107, 79);
    doc.text('MASTER SOUTIEN PÉDAGOGIQUE — FICHE DE PRÉPARATION', margin, y);
    y += 8;
  };

  doc.setFillColor(0, 107, 79);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('MASTER SOUTIEN PÉDAGOGIQUE', margin + 4, y + 7.5);
  y += 17;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(0, 107, 79);
  const titleLines = doc.splitTextToSize(plan.titre || 'Fiche de préparation', contentWidth);
  titleLines.forEach((line: string) => { ensureSpace(8); doc.text(line, margin, y); y += 7; });
  y += 3;

  const metadata = [
    ['CLASSE', plan.classe || 'À confirmer'], ['MATIÈRE', plan.matiere || 'À confirmer'], ['DURÉE', plan.duree || 'À confirmer'],
  ];
  const metaGap = 2;
  const metaWidth = (contentWidth - metaGap * 2) / 3;
  metadata.forEach(([label, value], index) => {
    const x = margin + index * (metaWidth + metaGap);
    doc.setFillColor(234, 244, 239);
    doc.roundedRect(x, y, metaWidth, 17, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 107, 79);
    doc.text(label, x + 2.5, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(36, 51, 46);
    const lines = doc.splitTextToSize(value, metaWidth - 5);
    doc.text(lines.slice(0, 2), x + 2.5, y + 10);
  });
  y += 23;

  const sections = plan.rubriques?.length ? plan.rubriques : [
    { titre: 'Compétence', contenu: plan.competence },
    { titre: 'Objectif', contenu: plan.objectif },
    { titre: 'Matériel', contenu: plan.materiel },
    { titre: 'Déroulement', contenu: plan.deroulement },
    { titre: 'Évaluation', contenu: plan.evaluation },
  ];
  for (const section of sections) {
    if (!section.titre && !section.contenu) continue;
    const headingLines = doc.splitTextToSize(section.titre || 'Rubrique', contentWidth - 6);
    const headingHeight = Math.max(8, headingLines.length * 4 + 3);
    ensureSpace(headingHeight + 8);
    doc.setFillColor(234, 244, 239);
    doc.roundedRect(margin, y, contentWidth, headingHeight, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 107, 79);
    doc.text(headingLines, margin + 3, y + 5.3);
    y += headingHeight + 3;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(36, 51, 46);
    const paragraphs = String(section.contenu || 'À compléter.').split(/\r?\n/);
    for (const paragraph of paragraphs) {
      const lines = paragraph.trim() ? doc.splitTextToSize(paragraph, contentWidth - 2) : [' '];
      for (const line of lines) {
        ensureSpace(5.2);
        doc.text(line, margin + 1, y);
        y += 4.7;
      }
    }
    y += 3;
  }

  if (plan.pointsAControler?.length) {
    const heading = 'À VÉRIFIER AVANT UTILISATION';
    ensureSpace(16);
    doc.setFillColor(255, 243, 216);
    doc.roundedRect(margin, y, contentWidth, 8, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(138, 82, 0);
    doc.text(heading, margin + 3, y + 5.4);
    y += 11;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(96, 64, 0);
    for (const point of plan.pointsAControler) {
      const lines = doc.splitTextToSize(`• ${point}`, contentWidth - 2);
      for (const line of lines) { ensureSpace(5); doc.text(line, margin + 1, y); y += 4.5; }
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(203, 213, 208);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(101, 118, 110);
    doc.text('Brouillon assisté par IA — relecture et validation de l’enseignant requises.', margin, pageHeight - 7);
    doc.text(`${page}/${pages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
  return doc;
}

/** Télécharge une version PDF générée entièrement sur l’appareil. */
export function downloadFichePdf(plan: GeneratedLessonPlan, filename?: string): void {
  const base = (plan.titre || 'fiche').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 -]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'fiche';
  const safeClass = (plan.classe || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 -]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
  buildFichePdf(plan).save(filename || `fiche_${base}${safeClass ? `_${safeClass}` : ''}.pdf`);
}

/** Ouvre une fenêtre d'impression propre (imprimer ou enregistrer en PDF). */
export function printFiche(plan: GeneratedLessonPlan): void {
  const sections = plan.rubriques?.length ? plan.rubriques : [
    { titre: 'Compétence', contenu: plan.competence },
    { titre: 'Objectif', contenu: plan.objectif },
    { titre: 'Matériel', contenu: plan.materiel },
    { titre: 'Déroulement', contenu: plan.deroulement },
    { titre: 'Évaluation', contenu: plan.evaluation },
  ];
  const h = (t: string, c: string) => `<h2>${esc(t)}</h2><div class="c">${esc(c).replace(/\n/g, '<br/>')}</div>`;
  const sectionHtml = sections.map(section => h(section.titre, section.contenu)).join('');
  const checksHtml = plan.pointsAControler?.length
    ? h('À vérifier avant utilisation', plan.pointsAControler.map(point => `• ${point}`).join('\n')) : '';
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(plan.titre)}</title>
<style>
  @page { margin: 14mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
  .head { text-align: center; border-bottom: 2px solid #006b4f; padding-bottom: 8px; margin-bottom: 14px; }
  .head h1 { font-size: 18px; color: #006b4f; margin: 0 0 4px; }
  .head p { margin: 0; font-size: 12px; color: #333; }
  h2 { font-size: 13px; color: #006b4f; margin: 12px 0 4px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #d7e6df; padding-bottom: 3px; }
  .lesson-title { font-size: 17px; color: #183b31; text-align: center; margin: 10px 0 14px; }
  .c { font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; }
  .foot { margin-top: 20px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #ccc; padding-top: 6px; }
</style></head>
<body>
<div class="head">
  <h1>FICHE PÉDAGOGIQUE</h1>
  <p>${esc(plan.classe)} • ${esc(plan.matiere)} • Durée : ${esc(plan.duree)}</p>
</div>
<h1 class="lesson-title">${esc(plan.titre)}</h1>
${sectionHtml}
${checksHtml}
<div class="foot">Brouillon assisté par IA — relisez et validez le contenu avant de l’utiliser.</div>
<script>window.onload = function(){ window.print(); };</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Autorisez les fenêtres pop-up pour imprimer la fiche.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
