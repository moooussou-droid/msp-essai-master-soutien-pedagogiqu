/**
 * Export Word (.docx) du courrier aux parents — en-tête officiel
 * (République du Bénin, logo de l'école, école, classe, date) + coupon réponse.
 * Le logo vient du profil enseignant (data URL) — aucun serveur impliqué.
 */
import JSZip from 'jszip';

export interface CorrespondenceDoc {
  templateLabel: string;
  parentName: string;
  studentName: string;
  className: string;
  date: string; // AAAA-MM-JJ
  school: string;
  circonscription?: string;
  commune?: string;
  teacherName?: string;
  schoolYear?: string;
  logoDataUrl?: string; // data:image/png;base64,... ou data:image/jpeg;...
  body: string; // corps du message
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateFr(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

const MIME_BY_TYPE: Record<string, string> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/svg+xml': 'image/svg+xml',
};

export async function exportCorrespondanceDocx(doc: CorrespondenceDoc, filename?: string): Promise<void> {
  const zip = new JSZip();

  // --- Image logo (si fournie en data URL) ---
  let hasImage = false;
  let imgExt = 'png';
  let imgMime = 'image/png';
  let imgBytes: Uint8Array | null = null;
  if (doc.logoDataUrl && doc.logoDataUrl.startsWith('data:')) {
    try {
      const match = doc.logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = MIME_BY_TYPE[match[1].toLowerCase()] || 'image/png';
        imgMime = mime;
        imgExt = mime.includes('jpeg') ? 'jpeg' : mime.includes('gif') ? 'gif' : mime.includes('svg') ? 'svg' : 'png';
        const b64 = match[2].replace(/\s/g, '');
        imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        hasImage = imgBytes.length > 0;
      }
    } catch { /* logo illisible : on continue en texte */ }
  }

  // --- Content types ---
  let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`;
  if (hasImage) {
    contentTypes += `<Default Extension="${imgExt}" ContentType="${imgMime}"/>`;
  }
  contentTypes += `</Types>`;
  zip.file('[Content_Types].xml', contentTypes);

  // --- Rel racine ---
  let rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`;
  if (hasImage) {
    rootRels += `<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.${imgExt}"/>`;
  }
  rootRels += `</Relationships>`;
  zip.file('_rels/.rels', rootRels);

  if (hasImage && imgBytes) {
    zip.file(`word/media/image1.${imgExt}`, imgBytes);
  }

  // --- Word document ---
  const para = (text: string, opts: { bold?: boolean; size?: number; center?: boolean; italic?: boolean; after?: number } = {}) => {
    const { bold = false, size = 22, center = false, italic = false, after = 100 } = opts;
    const rPr = `${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}<w:sz w:val="${size}"/>`;
    return `<w:p><w:pPr><w:spacing w:after="${after}"/>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  };
  const empty = () => `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>`;

  let imageBlock = '';
  if (hasImage) {
    imageBlock = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="720000" cy="720000"/><wp:docPr id="1" name="Logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="720000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  const body = `
${para('RÉPUBLIQUE DU BÉNIN', { bold: true, size: 20, center: true, after: 0 })}
${para('Ministère des Enseignements Maternel et Primaire', { size: 16, center: true, after: 0 })}
${para(doc.circonscription || 'Circonscription Pédagogique', { size: 16, center: true, after: 0 })}
${para(doc.commune ? 'Commune : ' + doc.commune : '', { size: 16, center: true, after: 0 })}
${imageBlock}
${para(doc.school || 'École', { bold: true, size: 28, center: true, after: 40 })}
${empty()}
${para(`${doc.className ? 'Classe : ' + doc.className : ''}    Année scolaire : ${doc.schoolYear || '20__ - 20__'}`, { size: 18 })}
${para(`Cotonou/Abomey/..., le ${dateFr(doc.date)}`, { size: 18, after: 160 })}
${empty()}
${para(`À l'attention de ${doc.parentName || 'Madame/Monsieur le parent'}`, { size: 22 })}
${para(`Parent de l'élève ${doc.studentName || '________________'}`, { size: 22, after: 160 })}
${empty()}
${para(`OBJET : ${doc.templateLabel}`, { bold: true, size: 22, after: 200 })}
${empty()}
${esc(doc.body)
  .split('\n')
  .map((l) => para(l.trim(), { size: 22, after: 100 }))
  .join('')}
${empty()}
${para('Le Maître / La Maîtresse', { size: 22, after: 400 })}
${empty()}
${empty()}
${para('------------------------------------------------------------', { size: 18, after: 60 })}
${para('COUPON RÉPONSE (à détacher et à retourner rempli)', { bold: true, size: 20, after: 100 })}
${para(`Je soussigné(e), parent de l'élève ${doc.studentName || '________________'}, accuse réception du présent avis.`, { size: 20, after: 300 })}
${para('Signature du parent : ______________________', { size: 20 })}
`;

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body>
</w:document>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const safeSchool = (doc.school || 'ecole').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const name = filename || `avis_parents_${safeSchool}_${doc.date}.docx`;

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
