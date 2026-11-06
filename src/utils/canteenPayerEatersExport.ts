/**
 * EXPORTS DU RELEVÉ PAYEURS-MANGEURS (v66) — PDF, Excel et impression.
 */
import ExcelJS from 'exceljs';
import { makePdf } from './pdfMaker';
import { CLASS_LEVELS } from './canteenEnrollment';
import {
  PayerEaterSurvey,
  PayerEaterTotals,
  canteenSystemInfo,
  deriveMealRows,
} from './canteenPayerEaters';
import { getProfile } from './userProfile';
import { signatureFor } from './documentSignature';

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function pct(v: number): string {
  return `${String(v).replace('.', ',')} %`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rowsOf(survey: PayerEaterSurvey) {
  const derived = deriveMealRows(survey.counts, survey.system);
  return CLASS_LEVELS.map((lvl) => {
    const row = derived.find((r) => r.level === lvl.key)!;
    return { label: lvl.label, cycle: lvl.cycle, ...row };
  });
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

export function exportPayerEatersPdf(
  survey: PayerEaterSurvey,
  totals: PayerEaterTotals,
): void {
  const profile = getProfile();
  const system = canteenSystemInfo(survey.system);
  const payer = survey.system === 'payeur-mangeur';
  const columns = [
    { header: 'Classe', width: 1.7 },
    { header: 'Inscrits T', width: 0.75, align: 'right' as const },
    { header: 'Prés. G', width: 0.65, align: 'right' as const },
    { header: 'Prés. F', width: 0.65, align: 'right' as const },
    { header: 'Prés. T', width: 0.65, align: 'right' as const },
    { header: 'Pay. G', width: 0.65, align: 'right' as const },
    { header: 'Pay. F', width: 0.65, align: 'right' as const },
    { header: 'Pay. T', width: 0.65, align: 'right' as const },
    { header: 'Mang. G', width: 0.7, align: 'right' as const },
    { header: 'Mang. F', width: 0.7, align: 'right' as const },
    { header: 'Mang. T', width: 0.75, align: 'right' as const },
  ];
  const rows = rowsOf(survey).map((r) => [
    r.label,
    String(r.enrolledTotal),
    String(r.presentBoys),
    String(r.presentGirls),
    String(r.presentTotal),
    payer ? String(r.paidPresentBoys) : '—',
    payer ? String(r.paidPresentGirls) : '—',
    payer ? String(r.paidPresentTotal) : '—',
    String(r.eaterBoys),
    String(r.eaterGirls),
    { text: String(r.eaterTotal), bold: true },
  ]);

  const pdf = makePdf({
    title: 'Relevé des effectifs payeurs-mangeurs',
    subtitle: `${system.label} — ${frDate(survey.date)}${survey.schoolYear ? ` — ${survey.schoolYear}` : ''}`,
    establishment: survey.schoolName || profile.schoolName || 'Mon établissement',
    orientation: 'landscape',
    intro: `Règle appliquée : ${system.rule} Les quantités de vivres doivent être calculées sur l’effectif des mangeurs, non sur les seuls inscrits.`,
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'Maître cantine',
      date: frDate(survey.date),
    },
  });

  pdf.table(columns, [
    ...rows,
    [
      { text: 'TOTAL GÉNÉRAL', bold: true },
      { text: String(totals.enrolledTotal), bold: true },
      { text: String(totals.presentBoys), bold: true },
      { text: String(totals.presentGirls), bold: true },
      { text: String(totals.presentTotal), bold: true },
      { text: payer ? String(totals.paidPresentBoys) : '—', bold: true },
      { text: payer ? String(totals.paidPresentGirls) : '—', bold: true },
      { text: payer ? String(totals.paidPresentTotal) : '—', bold: true },
      { text: String(totals.eaterBoys), bold: true },
      { text: String(totals.eaterGirls), bold: true },
      { text: String(totals.eaterTotal), bold: true },
    ],
  ]);

  pdf.sectionTitle('Synthèse du jour');
  pdf.keyValues([
    ['Système de fonctionnement', system.label],
    ['Élèves présents', `${totals.presentTotal} (${totals.presentBoys} G / ${totals.presentGirls} F)`],
    ...(payer
      ? [['Payeurs présents', `${totals.paidPresentTotal} (${totals.paidPresentBoys} G / ${totals.paidPresentGirls} F)`] as [string, string]]
      : []),
    ['Élèves mangeurs', `${totals.eaterTotal} (${totals.eaterBoys} G / ${totals.eaterGirls} F)`],
    ['Présents ne mangeant pas', String(totals.presentNonEaters)],
    ['Taux de présence', totals.enrolledTotal ? pct(totals.attendancePct) : 'Inscrits non repris'],
    ['Part des filles parmi les mangeurs', pct(totals.girlsAmongEatersPct)],
    ...totals.byCycle.map((c) => [
      `${c.cycle} — mangeurs`,
      `${c.eaters} sur ${c.present} présents`,
    ] as [string, string]),
  ]);

  if (survey.note) {
    pdf.sectionTitle('Observation');
    pdf.paragraph(survey.note);
  }

  pdf.save(`releve-payeurs-mangeurs-${survey.date || 'cantine'}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

export async function exportPayerEatersExcel(
  survey: PayerEaterSurvey,
  totals: PayerEaterTotals,
): Promise<void> {
  const payer = survey.system === 'payeur-mangeur';
  const system = canteenSystemInfo(survey.system);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payeurs-mangeurs');

  ws.addRow(['RELEVÉ DES EFFECTIFS PAYEURS-MANGEURS']).font = { bold: true, size: 14 };
  ws.addRow([survey.schoolName || '']);
  ws.addRow([`Date : ${frDate(survey.date)}`, survey.schoolYear || '']);
  ws.addRow([`Système : ${system.label}`]);
  ws.addRow([system.rule]);
  ws.addRow([]);

  ws.addRow([
    'CLASSE', 'INSCRITS G', 'INSCRITS F', 'INSCRITS T',
    'PRÉSENTS G', 'PRÉSENTS F', 'PRÉSENTS T',
    'PAYEURS PRÉSENTS G', 'PAYEURS PRÉSENTS F', 'PAYEURS PRÉSENTS T',
    'MANGEURS G', 'MANGEURS F', 'MANGEURS T', 'PRÉSENTS NON MANGEURS',
  ]).font = { bold: true };

  for (const r of rowsOf(survey)) {
    ws.addRow([
      r.label, r.enrolledBoys, r.enrolledGirls, r.enrolledTotal,
      r.presentBoys, r.presentGirls, r.presentTotal,
      payer ? r.paidPresentBoys : '—', payer ? r.paidPresentGirls : '—', payer ? r.paidPresentTotal : '—',
      r.eaterBoys, r.eaterGirls, r.eaterTotal, r.presentNonEaters,
    ]);
  }

  const totalRow = ws.addRow([
    'TOTAL GÉNÉRAL', totals.enrolledBoys, totals.enrolledGirls, totals.enrolledTotal,
    totals.presentBoys, totals.presentGirls, totals.presentTotal,
    payer ? totals.paidPresentBoys : '—', payer ? totals.paidPresentGirls : '—', payer ? totals.paidPresentTotal : '—',
    totals.eaterBoys, totals.eaterGirls, totals.eaterTotal, totals.presentNonEaters,
  ]);
  totalRow.font = { bold: true };

  ws.addRow([]);
  ws.addRow(['Taux de présence', totals.enrolledTotal ? pct(totals.attendancePct) : 'Inscrits non repris']);
  ws.addRow(['Mangeurs parmi les présents', pct(totals.eaterShareOfPresentPct)]);
  ws.addRow(['Part des filles parmi les mangeurs', pct(totals.girlsAmongEatersPct)]);
  for (const c of totals.byCycle) {
    ws.addRow([`${c.cycle} — mangeurs`, c.eaters, 'Présents', c.present]);
  }
  if (survey.note) {
    ws.addRow([]);
    ws.addRow(['Observation', survey.note]);
  }
  ws.addRow([]);
  ws.addRow([signatureFor('application') || '']);
  ws.columns.forEach((c, i) => { c.width = i === 0 ? 24 : 17; });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `releve-payeurs-mangeurs-${survey.date || 'cantine'}.xlsx`,
  );
}

/* ------------------------------------------------------------------ */
/* Impression                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

export function printPayerEaters(
  survey: PayerEaterSurvey,
  totals: PayerEaterTotals,
): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const payer = survey.system === 'payeur-mangeur';
  const system = canteenSystemInfo(survey.system);
  const rows = rowsOf(survey).map((r) => `
    <tr>
      <td>${escapeHtml(r.label)}</td><td class="n">${r.enrolledTotal}</td>
      <td class="n">${r.presentBoys}</td><td class="n">${r.presentGirls}</td><td class="n">${r.presentTotal}</td>
      <td class="n">${payer ? r.paidPresentBoys : '—'}</td><td class="n">${payer ? r.paidPresentGirls : '—'}</td><td class="n">${payer ? r.paidPresentTotal : '—'}</td>
      <td class="n">${r.eaterBoys}</td><td class="n">${r.eaterGirls}</td><td class="n b">${r.eaterTotal}</td>
    </tr>`).join('');

  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Relevé payeurs-mangeurs</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body{font-family:Arial,sans-serif;padding:20px;color:#111}
  h1{font-size:18px;margin:0 0 4px;color:#9a3412}
  .sub{font-size:12px;color:#555;margin-bottom:8px}
  .rule{background:#fff7ed;border:1px solid #fed7aa;padding:8px 10px;font-size:12px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #999;padding:6px 7px;font-size:12px}
  th{background:#9a3412;color:#fff}
  td.n{text-align:right} td.b,tr.tot td{font-weight:bold} tr.tot td{background:#f3f4f6}
  .synth{font-size:12px;margin-top:12px;line-height:1.7}
  .sig{margin-top:26px;font-size:11px;color:#555;text-align:center}
</style></head><body>
<h1>Relevé des effectifs payeurs-mangeurs</h1>
<div class="sub">${escapeHtml(survey.schoolName || '')} — ${frDate(survey.date)} ${escapeHtml(survey.schoolYear || '')}</div>
<div class="rule"><strong>${escapeHtml(system.label)}.</strong> ${escapeHtml(system.rule)}</div>
<table>
  <thead><tr>
    <th>Classe</th><th>Inscrits T</th><th>Prés. G</th><th>Prés. F</th><th>Prés. T</th>
    <th>Pay. G</th><th>Pay. F</th><th>Pay. T</th><th>Mang. G</th><th>Mang. F</th><th>Mang. T</th>
  </tr></thead>
  <tbody>${rows}
    <tr class="tot"><td>TOTAL GÉNÉRAL</td><td class="n">${totals.enrolledTotal}</td>
      <td class="n">${totals.presentBoys}</td><td class="n">${totals.presentGirls}</td><td class="n">${totals.presentTotal}</td>
      <td class="n">${payer ? totals.paidPresentBoys : '—'}</td><td class="n">${payer ? totals.paidPresentGirls : '—'}</td><td class="n">${payer ? totals.paidPresentTotal : '—'}</td>
      <td class="n">${totals.eaterBoys}</td><td class="n">${totals.eaterGirls}</td><td class="n">${totals.eaterTotal}</td></tr>
  </tbody>
</table>
<div class="synth">
  Présents : <strong>${totals.presentTotal}</strong> · Mangeurs : <strong>${totals.eaterTotal}</strong>
  (${totals.eaterBoys} G / ${totals.eaterGirls} F) · Présents ne mangeant pas : <strong>${totals.presentNonEaters}</strong><br/>
  Taux de présence : <strong>${totals.enrolledTotal ? pct(totals.attendancePct) : 'inscrits non repris'}</strong> · 
  Part des filles parmi les mangeurs : <strong>${pct(totals.girlsAmongEatersPct)}</strong>
</div>
${survey.note ? `<p style="font-size:12px">Observation : ${escapeHtml(survey.note)}</p>` : ''}
<div class="sig">${escapeHtml(signatureFor('application') || '')}</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
  win.document.close();
}
