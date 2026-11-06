/**
 * BIBLIOTHÈQUE — vraie génération PDF (v44).
 *
 * Les livres publiés avec un fichier PDF joint se téléchargent directement.
 * Mais certains ouvrages ont été saisis en texte, sans fichier : l'utilisateur
 * qui avait payé se retrouvait alors sans rien à télécharger.
 *
 * Ce module fabrique le PDF à partir du contenu, hors ligne, et conserve
 * l'impression à côté (règle v41). Le document porte la signature officielle
 * de l'application (v42).
 */
import { makePdf } from './pdfMaker';
import { signatureFor } from './documentSignature';
import { BookItem } from './library';
import { getProfile } from './userProfile';

/** Nom de fichier sûr, sans accent ni caractère spécial. */
function safeName(s: string): string {
  return (s || 'livre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'livre';
}

/**
 * Découpe le contenu en paragraphes.
 * Les sauts de ligne multiples marquent une séparation ; on évite ainsi un
 * pavé de texte illisible.
 */
function paragraphs(text: string): string[] {
  return (text || '')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Fabrique et télécharge le PDF d'un livre.
 * À n'appeler qu'une fois l'accès déverrouillé : le contenu intégral ne doit
 * jamais sortir sans paiement (règle v38/v39).
 */
export function exportBookPdf(book: BookItem): void {
  const profile = getProfile();
  const pdf = makePdf({
    title: book.title || 'Livre',
    subtitle: [book.author, book.level, book.category].filter(Boolean).join(' — '),
    establishment: profile.schoolName || 'Bibliothèque Master Soutien Pédagogique',
  });

  if (book.description) {
    pdf.sectionTitle('Présentation');
    pdf.paragraph(book.description);
  }

  const corps = book.content || book.excerpt || '';
  const blocs = paragraphs(corps);

  pdf.sectionTitle('Contenu');
  if (blocs.length === 0) {
    pdf.paragraph('Ce livre ne contient pas encore de texte.');
  } else {
    for (const b of blocs) pdf.paragraph(b, 10);
  }

  pdf.save(`${safeName(book.title)}.pdf`);
}

/**
 * Ouvre la fenêtre d'impression du navigateur pour un livre.
 * L'impression et l'export PDF coexistent partout (règle v41).
 */
export function printBook(book: BookItem): void {
  const w = window.open('', '_blank');
  if (!w) return;
  const sign = signatureFor('application') || '';
  const corps = paragraphs(book.content || book.excerpt || '')
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');

  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${escapeHtml(book.title)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;margin:18mm 16mm;color:#111;line-height:1.55}
  h1{font-size:19pt;margin:0 0 2mm}
  .meta{font-size:10pt;color:#555;margin-bottom:8mm}
  p{font-size:11pt;text-align:justify;margin:0 0 3mm}
  .sign{margin-top:12mm;font-size:8.5pt;color:#666;border-top:1px solid #ccc;padding-top:2mm}
  @media print{ @page{ size:A4; margin:16mm } }
</style></head><body>
<h1>${escapeHtml(book.title)}</h1>
<div class="meta">${escapeHtml([book.author, book.level, book.category].filter(Boolean).join(' — '))}</div>
${corps}
<div class="sign">${escapeHtml(sign)}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
