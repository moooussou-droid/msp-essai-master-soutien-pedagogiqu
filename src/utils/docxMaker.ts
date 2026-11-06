/**
 * GÉNÉRATEUR DE VRAIS FICHIERS WORD (.docx) — v49.
 *
 * ── POURQUOI ÉCRIRE CE MODULE PLUTÔT QU'AJOUTER UNE BIBLIOTHÈQUE ? ────
 * Un fichier .docx n'est pas un format binaire mystérieux : c'est une
 * archive ZIP contenant des fichiers XML (norme OOXML, ECMA-376).
 * L'application embarque déjà `jszip`. On produit donc de VRAIS documents
 * Word sans ajouter la moindre dépendance, et surtout **sans internet** :
 * la contrainte « 100 % hors ligne » de l'application est préservée.
 *
 * ── CE QUE LE FICHIER PRODUIT CONTIENT ───────────────────────────────
 * Structure minimale mais complète, telle que Word, LibreOffice et Google
 * Docs l'ouvrent sans avertissement :
 *   [Content_Types].xml   déclare les types de pièces
 *   _rels/.rels           relation vers le document principal
 *   word/document.xml     le contenu lui-même
 *   word/styles.xml       styles (titres, corps de texte)
 *
 * ── UNITÉS OOXML (source fréquente d'erreurs) ────────────────────────
 *   - taille de police : en DEMI-POINTS  → 12 pt s'écrit 24
 *   - marges, largeurs : en TWIPS        → 1 pouce = 1440 twips
 *   - page A4 portrait : 11906 × 16838 twips
 * Ces conversions sont centralisées ici pour éviter les erreurs de
 * facteur 2 ou de facteur 20 dispersées dans le code.
 */
import JSZip from 'jszip';

/** Demi-points : unité de taille de police en OOXML. */
const halfPoints = (pt: number) => String(Math.round(pt * 2));

/** Twips : 1 pouce = 1440 twips, 1 cm ≈ 567 twips. */
export const TWIPS_PER_CM = 567;

export type Align = 'left' | 'center' | 'right' | 'justify';

export interface DocxRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Taille en points (défaut 11). */
  size?: number;
  /** Couleur hexadécimale sans dièse, ex. « C00000 ». */
  color?: string;
}

export interface DocxParagraph {
  type: 'paragraph';
  runs: DocxRun[];
  align?: Align;
  /** Niveau de titre 1 à 3 ; absent = texte courant. */
  heading?: 1 | 2 | 3;
  /** Puce ou numéro : rendu typographique simple, robuste à l'ouverture. */
  bullet?: boolean;
  spacingAfter?: number;
}

export interface DocxTable {
  type: 'table';
  rows: string[][];
  /** La première ligne est-elle un en-tête (fond gris, gras) ? */
  headerRow?: boolean;
}

export type DocxBlock = DocxParagraph | DocxTable;

/**
 * Échappement XML.
 * Indispensable : un simple « & » ou « < » dans un nom d'élève rendrait
 * le document.xml invalide et Word refuserait d'ouvrir le fichier.
 */
export function escapeXml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Un « run » : fragment de texte homogène en mise en forme. */
function runXml(r: DocxRun): string {
  const props: string[] = [];
  if (r.bold) props.push('<w:b/>');
  if (r.italic) props.push('<w:i/>');
  if (r.underline) props.push('<w:u w:val="single"/>');
  if (r.size) props.push(`<w:sz w:val="${halfPoints(r.size)}"/>`);
  if (r.color) props.push(`<w:color w:val="${r.color}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';

  // xml:space="preserve" conserve les espaces de début et de fin, sans
  // quoi Word les supprime et l'alignement du texte saute.
  const parts = (r.text || '').split('\n');
  const body = parts
    .map((line, i) => (i > 0 ? '<w:br/>' : '') + `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
    .join('');
  return `<w:r>${rPr}${body}</w:r>`;
}

function paragraphXml(p: DocxParagraph): string {
  const props: string[] = [];
  if (p.heading) props.push(`<w:pStyle w:val="Heading${p.heading}"/>`);
  if (p.align) {
    const val = p.align === 'justify' ? 'both' : p.align;
    props.push(`<w:jc w:val="${val}"/>`);
  }
  if (p.spacingAfter !== undefined) {
    props.push(`<w:spacing w:after="${Math.round(p.spacingAfter)}"/>`);
  }
  if (p.bullet) props.push('<w:ind w:left="360" w:hanging="360"/>');
  const pPr = props.length ? `<w:pPr>${props.join('')}</w:pPr>` : '';

  const runs = p.bullet
    ? [{ text: '• ' } as DocxRun, ...p.runs]
    : p.runs;

  const content = runs.length ? runs.map(runXml).join('') : '<w:r><w:t/></w:r>';
  return `<w:p>${pPr}${content}</w:p>`;
}

function tableXml(t: DocxTable): string {
  const cols = Math.max(1, ...t.rows.map((r) => r.length));
  // Largeur utile A4 marges comprises ≈ 9070 twips, répartie également.
  const colWidth = Math.floor(9070 / cols);

  const grid = `<w:tblGrid>${Array.from({ length: cols },
    () => `<w:gridCol w:w="${colWidth}"/>`).join('')}</w:tblGrid>`;

  const borders = `<w:tblBorders>${
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="808080"/>`)
      .join('')
  }</w:tblBorders>`;

  const rows = t.rows.map((row, ri) => {
    const isHeader = t.headerRow && ri === 0;
    const cells = Array.from({ length: cols }, (_, ci) => {
      const shading = isHeader
        ? '<w:shd w:val="clear" w:color="auto" w:fill="E8E8E8"/>'
        : '';
      const cellPara = paragraphXml({
        type: 'paragraph',
        runs: [{ text: row[ci] ?? '', bold: !!isHeader, size: 10 }],
        spacingAfter: 0,
      });
      return `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/>${shading}</w:tcPr>${cellPara}</w:tc>`;
    }).join('');
    // Répéter la ligne d'en-tête si le tableau dépasse sur la page suivante.
    const trPr = isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    return `<w:tr>${trPr}${cells}</w:tr>`;
  }).join('');

  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr>${grid}${rows}</w:tbl>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/>
</w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="046A38"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="046A38"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`;

export interface DocxOptions {
  /** Orientation de la page (défaut : portrait). */
  landscape?: boolean;
}

/** Assemble le corps du document (utile aux tests, sans passer par le ZIP). */
export function buildDocumentXml(blocks: DocxBlock[], options: DocxOptions = {}): string {
  const body = blocks
    .map((b) => (b.type === 'table' ? tableXml(b) : paragraphXml(b)))
    .join('');

  // A4 : 11906 × 16838 twips. En paysage, on échange largeur et hauteur.
  const w = options.landscape ? 16838 : 11906;
  const h = options.landscape ? 11906 : 16838;
  const orient = options.landscape ? ' w:orient="landscape"' : '';

  const sectPr = `<w:sectPr>`
    + `<w:pgSz w:w="${w}" w:h="${h}"${orient}/>`
    + `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" `
    + `w:header="709" w:footer="709" w:gutter="0"/>`
    + `</w:sectPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}${sectPr}</w:body></w:document>`;
}

/** Construit le fichier .docx complet. */
export async function makeDocxBlob(
  blocks: DocxBlock[],
  options: DocxOptions = {},
): Promise<Blob> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels')!.file('.rels', RELS);
  const word = zip.folder('word')!;
  word.file('document.xml', buildDocumentXml(blocks, options));
  word.file('styles.xml', STYLES);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}

/** Déclenche le téléchargement du document Word. */
export async function downloadDocx(
  blocks: DocxBlock[],
  filename: string,
  options: DocxOptions = {},
): Promise<void> {
  const blob = await makeDocxBlob(blocks, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================================================================== */
/* Conversion HTML (éditeur visuel) → blocs Word                       */
/* ================================================================== */

/**
 * Convertit le HTML produit par l'éditeur en blocs Word.
 *
 * On n'accepte volontairement qu'un sous-ensemble de HTML : gras,
 * italique, souligné, titres, alignement, listes et tableaux. Tout le
 * reste est réduit à du texte. C'est un choix de robustesse : un HTML
 * arbitraire (collé depuis une page web) produirait un .docx illisible.
 */
export function htmlToBlocks(html: string): DocxBlock[] {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const blocks: DocxBlock[] = [];

  const runsOf = (node: Node, inherited: Partial<DocxRun> = {}): DocxRun[] => {
    const out: DocxRun[] = [];
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const text = child.textContent || '';
        if (text) out.push({ ...inherited, text });
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const next: Partial<DocxRun> = { ...inherited };
      if (tag === 'b' || tag === 'strong') next.bold = true;
      if (tag === 'i' || tag === 'em') next.italic = true;
      if (tag === 'u') next.underline = true;
      if (tag === 'br') { out.push({ ...inherited, text: '\n' }); return; }
      out.push(...runsOf(el, next));
    });
    return out;
  };

  const alignOf = (el: HTMLElement): Align | undefined => {
    const a = (el.style.textAlign || el.getAttribute('align') || '').toLowerCase();
    if (a === 'center' || a === 'right' || a === 'justify' || a === 'left') return a as Align;
    return undefined;
  };

  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();

    if (tag === 'table') {
      const rows: string[][] = [];
      el.querySelectorAll('tr').forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll('th,td').forEach((td) => cells.push(td.textContent || ''));
        if (cells.length) rows.push(cells);
      });
      if (rows.length) {
        const hasHeader = !!el.querySelector('th');
        blocks.push({ type: 'table', rows, headerRow: hasHeader });
      }
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      el.querySelectorAll(':scope > li').forEach((li) => {
        blocks.push({ type: 'paragraph', runs: runsOf(li), bullet: true });
      });
      return;
    }

    if (/^h[1-3]$/.test(tag)) {
      blocks.push({
        type: 'paragraph',
        runs: runsOf(el),
        heading: Number(tag[1]) as 1 | 2 | 3,
        align: alignOf(el as HTMLElement),
      });
      return;
    }

    if (tag === 'div' || tag === 'p') {
      // Un conteneur qui n'enveloppe que des blocs est traversé, pas rendu.
      const onlyBlocks = el.children.length > 0
        && Array.from(el.children).every((c) =>
          ['table', 'ul', 'ol', 'div', 'p', 'h1', 'h2', 'h3'].includes(c.tagName.toLowerCase()));
      if (onlyBlocks) { Array.from(el.children).forEach(walk); return; }

      const runs = runsOf(el);
      // Un paragraphe vide reste un saut de ligne voulu par l'utilisateur.
      blocks.push({ type: 'paragraph', runs, align: alignOf(el as HTMLElement) });
      return;
    }

    const runs = runsOf(el);
    if (runs.length) blocks.push({ type: 'paragraph', runs });
  };

  Array.from(root.childNodes).forEach((n) => {
    if (n.nodeType === 1) walk(n as Element);
    else if (n.nodeType === 3 && (n.textContent || '').trim()) {
      blocks.push({ type: 'paragraph', runs: [{ text: n.textContent || '' }] });
    }
  });

  return blocks;
}

/**
 * Convertit du texte brut (anciens modèles) en HTML éditable.
 * Les tabulations d'alignement des formulaires officiels deviennent des
 * espaces insécables, afin que la mise en page reste lisible à l'écran.
 */
export function plainTextToHtml(text: string): string {
  return (text || '')
    .split('\n')
    .map((line) => {
      const safe = escapeXml(line).replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
      const isTitle = /^[A-ZÀ-Ý0-9\s'’ŒÆ:().,°-]{10,}$/.test(line.trim()) && line.trim().length > 10;
      if (!line.trim()) return '<div><br></div>';
      return isTitle
        ? `<div style="text-align:center"><b>${safe}</b></div>`
        : `<div>${safe}</div>`;
    })
    .join('');
}
