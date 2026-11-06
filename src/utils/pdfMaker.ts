/**
 * GÉNÉRATEUR PDF RÉEL (v41).
 *
 * Jusqu'à la v40, « exporter en PDF » ouvrait la fenêtre d'impression du
 * navigateur : l'utilisateur devait choisir « Enregistrer au format PDF ».
 * Ici, le fichier .pdf est réellement fabriqué par l'application, hors
 * ligne, et téléchargé directement.
 *
 * L'impression reste disponible partout : les deux options coexistent.
 *
 * Choix technique : jsPDF sans plugin de tableau (jspdf-autotable exige une
 * version plus ancienne de jsPDF). Les tableaux sont donc dessinés ici, ce
 * qui permet en prime de gérer proprement les sauts de page, la répétition
 * des en-têtes et la mise en évidence des valeurs négatives.
 *
 * Les accents français sont pris en charge : la police Helvetica intégrée à
 * jsPDF est encodée en WinAnsi, qui couvre é, è, à, ç, ô, û…
 */
import jsPDF from 'jspdf';

export interface PdfColumn {
  header: string;
  /** Largeur relative (une part). */
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface PdfCell {
  text: string;
  /** Affiche la valeur en rouge gras (dépassement, stock négatif…). */
  danger?: boolean;
  bold?: boolean;
}

export type PdfRow = (string | PdfCell)[];

export interface PdfDocOptions {
  title: string;
  subtitle?: string;
  /** Mention affichée en haut à droite (nom de l'établissement). */
  establishment?: string;
  orientation?: 'portrait' | 'landscape';
  /** Bloc de signature en fin de document. */
  signature?: {
    preparedBy?: string;
    role?: string;
    date?: string;
    /**
     * v61 — appose la SIGNATURE et le CACHET numérisés par l'utilisateur
     * (écran « Numériser → Signature et cachet »). Réservé aux documents
     * officiels : bulletins, documents de l'administration scolaire et PV.
     */
    stampSignature?: boolean;
    /**
     * v61 — bulletin du SECONDAIRE : l'enseignant(e) ne co-signe pas avec le
     * Directeur. On n'appose alors que le cachet (Directeur), pas la
     * signature de l'enseignant.
     */
    directorOnly?: boolean;
  };
  /** Texte libre ajouté avant les tableaux. */
  intro?: string;
  /**
   * v42 — origine du document, qui decide de la signature du pied de page.
   * 'application' (defaut) : signature imposee, personnalisable contre 500 F.
   * 'creation-ia' : production personnelle de l'utilisateur, non signee.
   */
  origin?: DocumentOrigin;
}

import { signatureFor, type DocumentOrigin } from './documentSignature';
import { getSignatureImage, getStampImage } from './scanner';

/**
 * jsPDF n'embarque que des polices Latin-1 : les accents mal encodes
 * ressortent en caracteres parasites dans le pied de page. On translittere
 * donc la signature, qui doit rester lisible en toutes circonstances.
 */
function stripAccents(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const MARGIN = 12;
const LINE = 5.2;

function toCell(c: string | PdfCell): PdfCell {
  return typeof c === 'string' ? { text: c } : c;
}

/**
 * Construit un document PDF. Retourne l'objet jsPDF pour permettre au
 * besoin un traitement supplémentaire avant l'enregistrement.
 */
export class PdfBuilder {
  private doc: jsPDF;
  private y: number;
  private pageW: number;
  private pageH: number;
  private opts: PdfDocOptions;

  constructor(opts: PdfDocOptions) {
    this.opts = opts;
    this.doc = new jsPDF({
      orientation: opts.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
      // Compression des flux : un PDF contenant une gravure passe de ~6 Mo a
      // quelques centaines de Ko, ce qui le rend partageable depuis un
      // telephone Android avec une connexion faible.
      compress: true,
    });
    this.pageW = this.doc.internal.pageSize.getWidth();
    this.pageH = this.doc.internal.pageSize.getHeight();
    this.y = MARGIN;
    this.header();
  }

  /** En-tête : titre, sous-titre et établissement. */
  private header(): void {
    const d = this.doc;
    d.setFont('helvetica', 'bold');
    d.setFontSize(14);
    d.setTextColor(20, 20, 20);
    d.text(this.opts.title, this.pageW / 2, this.y + 4, { align: 'center' });
    this.y += 9;

    if (this.opts.subtitle) {
      d.setFont('helvetica', 'normal');
      d.setFontSize(10);
      d.setTextColor(80, 80, 80);
      d.text(this.opts.subtitle, this.pageW / 2, this.y, { align: 'center' });
      this.y += 6;
    }
    if (this.opts.establishment) {
      d.setFontSize(9);
      d.setTextColor(110, 110, 110);
      d.text(this.opts.establishment, this.pageW / 2, this.y, { align: 'center' });
      this.y += 5;
    }

    d.setDrawColor(200);
    d.line(MARGIN, this.y, this.pageW - MARGIN, this.y);
    this.y += 6;
    d.setTextColor(20, 20, 20);

    if (this.opts.intro) {
      this.paragraph(this.opts.intro);
    }
  }

  /** Saut de page si la place manque. */
  private ensure(space: number): void {
    if (this.y + space > this.pageH - MARGIN - 8) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  /**
   * Force le passage a une nouvelle page (v44).
   *
   * Sert aux documents ou chaque element doit commencer en haut de page :
   * un bulletin par eleve, par exemple. Sans effet si la page courante est
   * deja vierge, pour eviter une page blanche inutile.
   */
  pageBreak(): void {
    if (this.y <= MARGIN + 0.01) return;
    this.doc.addPage();
    this.y = MARGIN;
  }

  sectionTitle(text: string): void {
    this.ensure(14);
    const d = this.doc;
    d.setFont('helvetica', 'bold');
    d.setFontSize(11);
    d.setTextColor(20, 20, 20);
    d.text(text, MARGIN, this.y + 4);
    this.y += 8;
  }

  paragraph(text: string, size = 9): void {
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(size);
    d.setTextColor(60, 60, 60);
    const lines = d.splitTextToSize(text, this.pageW - 2 * MARGIN) as string[];
    for (const l of lines) {
      this.ensure(LINE);
      d.text(l, MARGIN, this.y + 3.5);
      this.y += LINE;
    }
    this.y += 2;
    d.setTextColor(20, 20, 20);
  }

  /** Paire libellé / valeur, utile pour les récapitulatifs. */
  keyValues(pairs: [string, string][]): void {
    const d = this.doc;
    d.setFontSize(9);
    for (const [k, v] of pairs) {
      this.ensure(LINE);
      d.setFont('helvetica', 'normal');
      d.setTextColor(90, 90, 90);
      d.text(k, MARGIN, this.y + 3.5);
      d.setFont('helvetica', 'bold');
      d.setTextColor(20, 20, 20);
      d.text(v, this.pageW - MARGIN, this.y + 3.5, { align: 'right' });
      this.y += LINE;
    }
    this.y += 2;
  }

  /**
   * Dessine un tableau avec en-tête grisé, bordures et répétition de
   * l'en-tête sur chaque nouvelle page.
   */
  table(columns: PdfColumn[], rows: PdfRow[]): void {
    const d = this.doc;
    const avail = this.pageW - 2 * MARGIN;
    const totalUnits = columns.reduce((t, c) => t + c.width, 0);
    const widths = columns.map((c) => (c.width / totalUnits) * avail);
    const rowH = 7;

    const drawHead = () => {
      this.ensure(rowH * 2);
      d.setFillColor(235, 235, 235);
      d.setDrawColor(150);
      d.rect(MARGIN, this.y, avail, rowH, 'FD');
      d.setFont('helvetica', 'bold');
      d.setFontSize(8);
      d.setTextColor(30, 30, 30);
      let x = MARGIN;
      columns.forEach((c, i) => {
        const w = widths[i];
        const tx = c.align === 'right' ? x + w - 2 : c.align === 'center' ? x + w / 2 : x + 2;
        d.text(String(c.header), tx, this.y + 4.8, {
          align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left',
          maxWidth: w - 3,
        });
        if (i > 0) d.line(x, this.y, x, this.y + rowH);
        x += w;
      });
      this.y += rowH;
    };

    drawHead();

    d.setFont('helvetica', 'normal');
    d.setFontSize(8);

    for (const row of rows) {
      if (this.y + rowH > this.pageH - MARGIN - 8) {
        d.addPage();
        this.y = MARGIN;
        drawHead();
        d.setFont('helvetica', 'normal');
        d.setFontSize(8);
      }
      d.setDrawColor(190);
      d.rect(MARGIN, this.y, avail, rowH, 'S');
      let x = MARGIN;
      row.forEach((raw, i) => {
        const cell = toCell(raw);
        const c = columns[i] || { width: 1, align: 'left' as const };
        const w = widths[i] || 20;
        if (cell.danger) { d.setTextColor(176, 0, 32); d.setFont('helvetica', 'bold'); }
        else if (cell.bold) { d.setTextColor(20, 20, 20); d.setFont('helvetica', 'bold'); }
        else { d.setTextColor(40, 40, 40); d.setFont('helvetica', 'normal'); }
        const tx = c.align === 'right' ? x + w - 2 : c.align === 'center' ? x + w / 2 : x + 2;
        d.text(String(cell.text ?? ''), tx, this.y + 4.8, {
          align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left',
          maxWidth: w - 3,
        });
        if (i > 0) d.line(x, this.y, x, this.y + rowH);
        x += w;
      });
      this.y += rowH;
    }
    d.setTextColor(20, 20, 20);
    d.setFont('helvetica', 'normal');
    this.y += 4;
  }

  /** Encadré d'alerte (dépassement, rupture de stock…). */
  alert(text: string): void {
    const d = this.doc;
    const avail = this.pageW - 2 * MARGIN;
    const lines = d.splitTextToSize(text, avail - 6) as string[];
    const h = lines.length * LINE + 4;
    this.ensure(h + 2);
    d.setFillColor(253, 232, 232);
    d.setDrawColor(200, 80, 80);
    d.rect(MARGIN, this.y, avail, h, 'FD');
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    d.setTextColor(150, 20, 20);
    lines.forEach((l, i) => d.text(l, MARGIN + 3, this.y + 5 + i * LINE));
    this.y += h + 4;
    d.setTextColor(20, 20, 20);
    d.setFont('helvetica', 'normal');
  }

  /** Ajoute une image (data URL) mise à l'échelle dans la largeur utile. */
  image(dataUrl: string, maxHeight = 120): void {
    const d = this.doc;
    const avail = this.pageW - 2 * MARGIN;
    let w = avail;
    let h = maxHeight;
    try {
      const props = d.getImageProperties(dataUrl);
      const ratio = props.height / props.width;
      h = w * ratio;
      if (h > maxHeight) { h = maxHeight; w = h / ratio; }
    } catch { /* dimensions par défaut */ }
    this.ensure(h + 4);
    const x = MARGIN + (avail - w) / 2;
    const fmt = dataUrl.includes('image/png') ? 'PNG' : dataUrl.includes('image/svg') ? 'PNG' : 'JPEG';
    // 'FAST' = compression Deflate du flux image : indispensable pour que les
    // planches educatives restent sous quelques centaines de Ko.
    d.addImage(dataUrl, fmt, x, this.y, w, h, undefined, 'FAST');
    this.y += h + 5;
  }

  /** Place une image (data URL) à une position donnée, ajustée dans une boîte. */
  private imageAt(dataUrl: string, x: number, y: number, maxW: number, maxH: number): void {
    const d = this.doc;
    let w = maxW;
    let h = maxH;
    try {
      const props = d.getImageProperties(dataUrl);
      const ratio = props.height / props.width;
      h = w * ratio;
      if (h > maxH) { h = maxH; w = h / ratio; }
    } catch { /* dimensions par défaut */ }
    const fmt = dataUrl.includes('image/png') ? 'PNG' : dataUrl.includes('image/svg') ? 'PNG' : 'JPEG';
    try {
      d.addImage(dataUrl, fmt, x, y, w, h, undefined, 'FAST');
    } catch { /* image illisible : on n'interrompt pas la génération */ }
  }

  /** Bloc de signature officiel. */
  private signatureBlock(): void {
    const s = this.opts.signature;
    if (!s) return;
    this.ensure(30);
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    d.setTextColor(40, 40, 40);
    this.y += 4;
    d.text(`Etabli par : ${s.preparedBy || '.........................................'}`, MARGIN, this.y + 4);
    this.y += 6;
    if (s.role) { d.text(`Fonction : ${s.role}`, MARGIN, this.y + 4); this.y += 6; }
    if (s.date) { d.text(`Date : ${s.date}`, MARGIN, this.y + 4); this.y += 6; }

    // v61 — signature et cachet numérisés, uniquement sur les documents officiels.
    // Le secondaire (directorOnly) n'appose PAS la signature de l'enseignant.
    const sig = (s.stampSignature && !s.directorOnly) ? getSignatureImage() : '';
    const stamp = s.stampSignature ? getStampImage() : '';

    if (sig || stamp) {
      const boxH = 22;
      const rightX = this.pageW - MARGIN - 45;
      this.ensure(boxH + 12);
      d.setFont('helvetica', 'normal');
      d.setFontSize(9);
      d.setTextColor(40, 40, 40);
      if (sig) d.text('Signature :', MARGIN, this.y + 4);
      d.text(s.directorOnly ? 'Le Directeur (cachet et signature) :' : 'Cachet :', rightX, this.y + 4);
      const top = this.y + 6;
      if (sig) this.imageAt(sig, MARGIN, top, 55, boxH);
      if (stamp) this.imageAt(stamp, rightX, top, 45, boxH);
      this.y = top + boxH + 4;
    } else {
      d.text('Signature :', MARGIN, this.y + 4);
      this.y += 10;
    }
  }

  /** Pied de page numéroté, appliqué à toutes les pages. */
  private footers(): void {
    const d = this.doc;
    const total = d.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      d.setPage(i);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.5);
      d.setTextColor(140, 140, 140);
      /*
       * v42 — signature officielle. `signatureFor` applique la regle metier :
       * signature par defaut, signature personnalisee si elle a ete payee,
       * ou aucune signature pour une creation issue d'un sous-module IA.
       */
      const sign = signatureFor(this.opts.origin || 'application');
      if (sign) d.text(stripAccents(sign), MARGIN, this.pageH - 6);
      d.text(`Page ${i} / ${total}`, this.pageW - MARGIN, this.pageH - 6, { align: 'right' });
    }
  }

  /** Finalise et déclenche le téléchargement du vrai fichier .pdf. */
  save(filename: string): void {
    this.signatureBlock();
    this.footers();
    this.doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }

  /** Variante : retourne le PDF en Blob (partage, tests). */
  blob(): Blob {
    this.signatureBlock();
    this.footers();
    return this.doc.output('blob');
  }

  raw(): jsPDF {
    return this.doc;
  }
}

/** Fabrique rapide pour les cas simples. */
export function makePdf(opts: PdfDocOptions): PdfBuilder {
  return new PdfBuilder(opts);
}
