/**
 * CERTIFICAT DE RÉUSSITE MOOC — génération PDF (v62).
 *
 * Produit un vrai certificat imprimable (A4 paysage) avec un cadre décoratif,
 * le nom de l'apprenant, l'intitulé de la formation, la date et un code
 * vérifiable. Utilise jsPDF directement (mise en page centrée, différente des
 * documents administratifs gérés par pdfMaker).
 */
import jsPDF from 'jspdf';
import { getProfile, getSchoolLogo } from './userProfile';
import { getSignatureImage, getStampImage } from './scanner';

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  instructorName: string;
  code: string;
  /** Date (timestamp) de complétion. */
  date: number;
  hours?: number;
}

function frDate(ts: number): string {
  try { return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return new Date(ts).toLocaleDateString('fr-FR'); }
}

export function exportCertificatePdf(data: CertificateData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const profile = getProfile();

  // Fond
  doc.setFillColor(252, 251, 247);
  doc.rect(0, 0, W, H, 'F');

  // Double cadre décoratif (vert Bénin + or)
  doc.setDrawColor(4, 106, 56);
  doc.setLineWidth(2.2);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, W - 24, H - 24);

  // Filet drapeau en haut
  const stripW = (W - 24) / 3;
  doc.setFillColor(0, 137, 62); doc.rect(12, 12, stripW, 3, 'F');
  doc.setFillColor(252, 209, 22); doc.rect(12 + stripW, 12, stripW, 3, 'F');
  doc.setFillColor(230, 26, 39); doc.rect(12 + 2 * stripW, 12, stripW, 3, 'F');

  // Logo établissement (optionnel)
  const logo = getSchoolLogo();
  if (logo) {
    try { doc.addImage(logo, 'PNG', W / 2 - 12, 20, 24, 24); } catch { /* logo illisible */ }
  }

  let y = logo ? 52 : 34;

  doc.setTextColor(4, 106, 56);
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.text('CERTIFICAT DE RÉUSSITE', W / 2, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text('Master Soutien Pédagogique — Plateforme de formation (MOOC)', W / 2, y, { align: 'center' });

  y += 16;
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Ce certificat atteste que', W / 2, y, { align: 'center' });

  y += 14;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(20, 20, 20);
  doc.text(data.learnerName || 'Enseignant(e)', W / 2, y, { align: 'center' });
  // Soulignement du nom
  const nameW = Math.min(W - 60, doc.getTextWidth(data.learnerName || 'Enseignant(e)') + 20);
  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - nameW / 2, y + 3, W / 2 + nameW / 2, y + 3);

  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('a suivi avec succès la formation', W / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(4, 106, 56);
  const title = `« ${data.courseTitle} »`;
  const lines = doc.splitTextToSize(title, W - 70);
  doc.text(lines, W / 2, y, { align: 'center' });
  y += lines.length * 8;

  // Pied : date + code + signatures
  const footY = H - 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Délivré le ${frDate(data.date)}`, 26, footY);
  doc.text(`Formateur : ${data.instructorName || 'Master Soutien Pédagogique'}`, 26, footY + 6);

  // Code vérifiable (encadré)
  doc.setDrawColor(201, 162, 39);
  doc.setFillColor(255, 255, 255);
  const codeText = data.code;
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  const cw = doc.getTextWidth(codeText) + 10;
  doc.roundedRect(W / 2 - cw / 2, footY - 6, cw, 10, 1.5, 1.5, 'FD');
  doc.setTextColor(150, 110, 20);
  doc.text(codeText, W / 2, footY + 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Code de vérification', W / 2, footY + 8, { align: 'center' });

  // Signature + cachet numérisés (si disponibles)
  const sig = getSignatureImage();
  const stamp = getStampImage();
  const rightX = W - 70;
  if (sig) { try { doc.addImage(sig, 'PNG', rightX, footY - 12, 40, 14); } catch { /* ignore */ } }
  if (stamp) { try { doc.addImage(stamp, 'PNG', rightX + 24, footY - 14, 22, 22); } catch { /* ignore */ } }
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(rightX, footY + 4, rightX + 44, footY + 4);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(profile.schoolName || 'Le responsable', rightX + 22, footY + 9, { align: 'center' });

  const safe = (data.learnerName || 'certificat').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  doc.save(`certificat-${safe}.pdf`);
}
