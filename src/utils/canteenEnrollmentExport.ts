/**
 * EXPORTS DU RELEVÉ D'EFFECTIFS (v47) — PDF, Excel et impression.
 *
 * Le PDF est un VRAI fichier (règle v41) et l'impression reste disponible
 * à côté. Les documents portent la signature de l'application (v42).
 */
import ExcelJS from 'exceljs';
import { makePdf } from './pdfMaker';
import { CLASS_LEVELS, EnrollmentSurvey, EnrollmentTotals } from './canteenEnrollment';
import { getProfile } from './userProfile';
import { signatureFor } from './documentSignature';

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

/** Lignes du tableau, communes aux trois exports. */
function rowsOf(survey: EnrollmentSurvey) {
  return CLASS_LEVELS.map((lvl) => {
    const c = survey.counts.find((x) => x.level === lvl.key) || { boys: 0, girls: 0 };
    return {
      label: lvl.label,
      cycle: lvl.cycle,
      boys: c.boys,
      girls: c.girls,
      total: c.boys + c.girls,
    };
  });
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

export function exportEnrollmentPdf(survey: EnrollmentSurvey, totals: EnrollmentTotals): void {
  const profile = getProfile();
  const pdf = makePdf({
    title: 'Effectifs des élèves par classe',
    subtitle: `Relevé du ${frDate(survey.date)}${survey.schoolYear ? ` — ${survey.schoolYear}` : ''}`,
    establishment: survey.schoolName || profile.schoolName || 'Mon établissement',
    signature: {
      preparedBy: profile.teacherName || undefined,
      role: 'Le Directeur / La Directrice',
      date: frDate(survey.date),
    },
  });

  pdf.table(
    [
      { header: 'Classe', width: 2.4 },
      { header: 'Garçons', width: 1.2, align: 'right' },
      { header: 'Filles', width: 1.2, align: 'right' },
      { header: 'Total', width: 1.2, align: 'right' },
    ],
    [
      ...rowsOf(survey).map((r) => [
        r.label,
        String(r.boys),
        String(r.girls),
        { text: String(r.total), bold: true },
      ]),
      // Ligne de totaux, en gras : c'est le chiffre repris par la cantine.
      [
        { text: 'TOTAL GÉNÉRAL', bold: true },
        { text: String(totals.boys), bold: true },
        { text: String(totals.girls), bold: true },
        { text: String(totals.total), bold: true },
      ],
    ],
  );

  pdf.sectionTitle('Répartition');
  pdf.keyValues([
    ...totals.byCycle.map((c) => [
      c.cycle,
      `${c.total} élèves (${c.boys} garçons / ${c.girls} filles)`,
    ] as [string, string]),
    ['Part des filles', `${totals.girlsPct} %`],
    ['Effectif total', `${totals.total} élèves`],
  ]);

  if (survey.note) {
    pdf.sectionTitle('Observation');
    pdf.paragraph(survey.note);
  }

  pdf.paragraph(
    'Cet effectif sert de base au calcul des rations de la cantine scolaire. '
    + 'Il doit être actualisé à chaque variation notable (inscriptions tardives, départs).',
  );

  pdf.save(`effectifs-classes-${survey.date || 'releve'}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */

export async function exportEnrollmentExcel(
  survey: EnrollmentSurvey,
  totals: EnrollmentTotals,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Effectifs');

  ws.addRow(['EFFECTIFS DES ÉLÈVES PAR CLASSE']).font = { bold: true, size: 14 };
  ws.addRow([survey.schoolName || '']);
  ws.addRow([`Relevé du ${frDate(survey.date)}`, survey.schoolYear || '']);
  ws.addRow([]);

  ws.addRow(['CLASSE', 'GARÇONS', 'FILLES', 'TOTAL']).font = { bold: true };
  for (const r of rowsOf(survey)) {
    ws.addRow([r.label, r.boys, r.girls, r.total]);
  }
  const totalRow = ws.addRow(['TOTAL GÉNÉRAL', totals.boys, totals.girls, totals.total]);
  totalRow.font = { bold: true };

  ws.addRow([]);
  ws.addRow(['Part des filles', `${totals.girlsPct} %`]);
  for (const c of totals.byCycle) {
    ws.addRow([c.cycle, c.boys, c.girls, c.total]);
  }
  if (survey.note) {
    ws.addRow([]);
    ws.addRow(['Observation', survey.note]);
  }
  ws.addRow([]);
  ws.addRow([signatureFor('application') || '']);

  ws.columns.forEach((c) => { c.width = 22; });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `effectifs-classes-${survey.date || 'releve'}.xlsx`,
  );
}

/* ------------------------------------------------------------------ */
/* Impression                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

export function printEnrollment(survey: EnrollmentSurvey, totals: EnrollmentTotals): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const rows = rowsOf(survey)
    .map((r) => `<tr><td>${escapeHtml(r.label)}</td><td class="n">${r.boys}</td><td class="n">${r.girls}</td><td class="n b">${r.total}</td></tr>`)
    .join('');

  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Effectifs par classe</title>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#111}
  h1{font-size:18px;margin:0 0 4px;color:#046a38}
  .sub{font-size:12px;color:#555;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #999;padding:7px 9px;font-size:13px}
  th{background:#046a38;color:#fff;text-align:left}
  td.n{text-align:right}
  td.b,tr.tot td{font-weight:bold}
  tr.tot td{background:#f3f4f6}
  .sig{margin-top:26px;font-size:11px;color:#555;text-align:center}
</style></head><body>
<h1>Effectifs des élèves par classe</h1>
<div class="sub">${escapeHtml(survey.schoolName || '')} — relevé du ${frDate(survey.date)} ${escapeHtml(survey.schoolYear || '')}</div>
<table>
  <thead><tr><th>Classe</th><th>Garçons</th><th>Filles</th><th>Total</th></tr></thead>
  <tbody>${rows}
    <tr class="tot"><td>TOTAL GÉNÉRAL</td><td class="n">${totals.boys}</td><td class="n">${totals.girls}</td><td class="n">${totals.total}</td></tr>
  </tbody>
</table>
<p style="font-size:12px;margin-top:12px">Part des filles : <strong>${totals.girlsPct} %</strong></p>
${survey.note ? `<p style="font-size:12px">Observation : ${escapeHtml(survey.note)}</p>` : ''}
<div class="sig">${escapeHtml(signatureFor('application') || '')}</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
  win.document.close();
}
