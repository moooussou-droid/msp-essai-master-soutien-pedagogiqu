/**
 * MON GESTIONNAIRE COMPTABLE MSP — exports (v42).
 *
 * Produit, hors ligne :
 *  - de VRAIS fichiers PDF (via pdfMaker/jsPDF) ;
 *  - de VRAIS classeurs Excel .xlsx (via exceljs) ;
 *  - l'impression navigateur, conservée comme l'exige la règle v41.
 *
 * Tous ces documents sont des productions de l'application : ils portent
 * donc la signature officielle (v42), personnalisable contre 500 FCFA.
 */
import { makePdf } from './pdfMaker';
import { signatureFor } from './documentSignature';
import {
  OhadaBalance, InventoryItem, BudgetTracking, BudgetTotals,
  DailySummary, RevenueEntry, ExpenseEntry,
  REVENUE_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  formatFcfa, inventoryTotal, OHADA_DISCLAIMER,
} from './accountingCalc';

/** Date française lisible. */
function fr(d: string): string {
  if (!d) return '';
  const [y, m, j] = d.split('-');
  return `${j}/${m}/${y}`;
}

function revLabel(e: RevenueEntry): string {
  return REVENUE_CATEGORIES[e.category]?.label || String(e.category);
}
function expLabel(e: ExpenseEntry): string {
  return EXPENSE_CATEGORIES[e.category]?.label || String(e.category);
}
function payLabel(k: string): string {
  return (PAYMENT_METHODS as Record<string, { label: string }>)[k]?.label || k;
}

/* ==================================================================== */
/* 1. Journal de caisse d'une journée — PDF                              */
/* ==================================================================== */

export function exportDayPdf(
  school: string,
  date: string,
  summary: DailySummary,
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
): void {
  const pdf = makePdf({
    title: 'Journal de caisse',
    subtitle: `Journée du ${fr(date)}`,
    establishment: school,
  });

  pdf.keyValues([
    ['Total des recettes', formatFcfa(summary.totalRevenue)],
    ['Total des dépenses', formatFcfa(summary.totalExpense)],
    ['Solde du jour', formatFcfa(summary.balance)],
  ]);

  if (summary.balance < 0) {
    pdf.alert(
      'Solde négatif : les dépenses de la journée dépassent les recettes encaissées.',
    );
  }

  pdf.sectionTitle('Recettes de la journée');
  if (revenues.length === 0) {
    pdf.paragraph('Aucune recette enregistrée ce jour.');
  } else {
    pdf.table(
      [
      { header: 'Origine', width: 2 }, { header: 'Volet', width: 2.2 },
      { header: 'Objet', width: 3.4 }, { header: 'Règlement', width: 1.6 },
      { header: 'Montant', width: 1.8, align: 'right' },
    ],
      revenues.map((e) => [
        e.source === 'classe' ? (e.className || 'Classe') : 'Autre volet',
        revLabel(e),
        e.object,
        payLabel(e.method),
        { text: formatFcfa(e.amount) },
      ]),
    );
  }

  pdf.sectionTitle('Dépenses de la journée');
  if (expenses.length === 0) {
    pdf.paragraph('Aucune dépense enregistrée ce jour.');
  } else {
    pdf.table(
      [
      { header: 'Poste', width: 2.2 }, { header: 'Objet', width: 3.2 },
      { header: 'Bénéficiaire', width: 2 }, { header: 'Pièce', width: 1.4 },
      { header: 'Montant', width: 1.8, align: 'right' },
    ],
      expenses.map((e) => [
        expLabel(e),
        e.object,
        e.payee || '—',
        e.receipt || '—',
        { text: formatFcfa(e.amount) },
      ]),
    );
  }

  pdf.save(`journal-caisse-${date}.pdf`);
}

/* ==================================================================== */
/* 2. Bilan OHADA — PDF                                                  */
/* ==================================================================== */

export function exportBalancePdf(school: string, b: OhadaBalance): void {
  const pdf = makePdf({
    title: 'Bilan de fin d’exercice',
    subtitle: `Exercice ${b.year.label} — présentation SYSCOHADA révisé`,
    establishment: school,
    intro: `Période du ${fr(b.year.startDate)} au ${fr(b.year.endDate)}.`,
  });

  pdf.sectionTitle('Compte de résultat — Produits (classe 7)');
  pdf.table(
    [
      { header: 'Compte', width: 1.3 }, { header: 'Libellé', width: 5.2 },
      { header: 'Montant', width: 2, align: 'right' },
    ],
    [
      ...b.products.map((p) => [p.account, p.label, { text: formatFcfa(p.amount) }]),
      ['', { text: 'TOTAL DES PRODUITS', bold: true }, { text: formatFcfa(b.totalProducts), bold: true }],
    ],
  );

  pdf.sectionTitle('Compte de résultat — Charges (classe 6)');
  pdf.table(
    [
      { header: 'Compte', width: 1.3 }, { header: 'Libellé', width: 5.2 },
      { header: 'Montant', width: 2, align: 'right' },
    ],
    [
      ...b.charges.map((c) => [c.account, c.label, { text: formatFcfa(c.amount) }]),
      ['', { text: 'TOTAL DES CHARGES', bold: true }, { text: formatFcfa(b.totalCharges), bold: true }],
    ],
  );

  pdf.keyValues([
    ['Résultat net de l’exercice', formatFcfa(b.netResult)],
  ]);
  if (b.netResult < 0) {
    pdf.alert('L’exercice se solde par une PERTE : les charges dépassent les produits.');
  }

  pdf.sectionTitle('Bilan — Actif');
  pdf.table(
    [
      { header: 'Compte', width: 1.3 }, { header: 'Libellé', width: 5.2 },
      { header: 'Montant', width: 2, align: 'right' },
    ],
    [
      ...b.assets.map((a) => [a.account, `Immobilisation : ${a.label}`, { text: formatFcfa(a.amount) }]),
      ['5', 'Trésorerie disponible', { text: formatFcfa(b.totalTreasury) }],
      ['', { text: 'TOTAL ACTIF', bold: true }, { text: formatFcfa(b.totalActif), bold: true }],
    ],
  );

  pdf.sectionTitle('Bilan — Passif');
  pdf.table(
    [
      { header: 'Compte', width: 1.3 }, { header: 'Libellé', width: 5.2 },
      { header: 'Montant', width: 2, align: 'right' },
    ],
    [
      ['11', 'Report à nouveau (trésorerie initiale)', { text: formatFcfa(b.openingBalance) }],
      ['13', 'Résultat net de l’exercice', { text: formatFcfa(b.netResult) }],
      ['', { text: 'TOTAL PASSIF', bold: true }, { text: formatFcfa(b.totalPassif), bold: true }],
    ],
  );

  if (!b.balanced) {
    pdf.alert(
      `Actif et passif ne s’équilibrent pas (écart de ${formatFcfa(b.totalActif - b.totalPassif)}). `
      + 'Vérifiez la trésorerie initiale et les écritures saisies.',
    );
  }

  pdf.paragraph(OHADA_DISCLAIMER);
  pdf.save(`bilan-ohada-${b.year.label}.pdf`);
}

/* ==================================================================== */
/* 3. Inventaire OHADA — PDF                                             */
/* ==================================================================== */

export function exportInventoryPdf(school: string, yearLabel: string, items: InventoryItem[]): void {
  const pdf = makePdf({
    title: 'Inventaire de fin d’exercice',
    subtitle: `Exercice ${yearLabel} — présentation SYSCOHADA révisé`,
    establishment: school,
    intro: 'Biens durables acquis au cours de l’exercice, à pointer physiquement dans l’établissement.',
  });

  if (items.length === 0) {
    pdf.paragraph('Aucun bien durable n’a été acquis au cours de cet exercice.');
  } else {
    for (const it of items) {
      pdf.sectionTitle(`${it.account} — ${it.label}`);
      pdf.table(
        [
      { header: 'Date', width: 1.5 }, { header: 'Objet', width: 5 },
      { header: 'Pièce', width: 1.7 }, { header: 'Valeur', width: 1.8, align: 'right' },
    ],
        [
          ...it.objects.map((o) => [
            fr(o.date), o.object, o.receipt || '—',
            { text: formatFcfa(o.amount) },
          ]),
          ['', { text: 'Sous-total', bold: true }, '', { text: formatFcfa(it.total), bold: true }],
        ],
      );
    }
    pdf.keyValues([['TOTAL DE L’INVENTAIRE', formatFcfa(inventoryTotal(items))]]);
  }

  pdf.paragraph(OHADA_DISCLAIMER);
  pdf.save(`inventaire-ohada-${yearLabel}.pdf`);
}

/* ==================================================================== */
/* 4. Budget prévisionnel — PDF                                          */
/* ==================================================================== */

export function exportBudgetPdf(
  school: string,
  yearLabel: string,
  tracking: BudgetTracking[],
  totals: BudgetTotals,
): void {
  const pdf = makePdf({
    title: 'Budget de mon école',
    subtitle: `Prévisions et réalisations — exercice ${yearLabel}`,
    establishment: school,
    orientation: 'landscape',
  });

  const rows = (kind: 'recette' | 'depense') => tracking
    .filter((t) => t.line.kind === kind)
    .map((t) => [
      t.line.label,
      { text: formatFcfa(t.line.planned) },
      { text: formatFcfa(t.actual) },
      { text: formatFcfa(t.variance), danger: t.overrun },
      { text: `${t.rate} %` },
    ]);

  pdf.sectionTitle('Recettes');
  const budgetCols = [
    { header: 'Poste', width: 3.4 },
    { header: 'Prévu', width: 1.6 },
    { header: 'Réalisé', width: 1.6 },
    { header: 'Écart', width: 1.6 },
    { header: 'Taux', width: 1  },
  ];
  pdf.table(budgetCols, rows('recette'));

  pdf.sectionTitle('Dépenses');
  pdf.table(budgetCols, rows('depense'));

  pdf.keyValues([
    ['Recettes prévues', formatFcfa(totals.plannedRevenue)],
    ['Recettes réalisées', formatFcfa(totals.actualRevenue)],
    ['Dépenses prévues', formatFcfa(totals.plannedExpense)],
    ['Dépenses réalisées', formatFcfa(totals.actualExpense)],
    ['Résultat prévisionnel', formatFcfa(totals.plannedResult)],
    ['Résultat réalisé', formatFcfa(totals.actualResult)],
  ]);

  if (totals.overrunCount > 0) {
    pdf.alert(
      `${totals.overrunCount} poste(s) de dépense dépassent la prévision budgétaire.`,
    );
  }

  pdf.save(`budget-${yearLabel}.pdf`);
}

/* ==================================================================== */
/* 5. Bilan + inventaire — classeur Excel (.xlsx)                        */
/* ==================================================================== */

/**
 * Produit un vrai classeur Excel à trois feuilles : Bilan, Inventaire et
 * Budget. exceljs est déjà utilisé ailleurs dans l'application ; on
 * l'importe dynamiquement pour ne pas alourdir le démarrage.
 */
export async function exportOhadaExcel(
  school: string,
  b: OhadaBalance,
  items: InventoryItem[],
  tracking: BudgetTracking[],
  totals: BudgetTotals,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = signatureFor('application') || 'Master Soutien Pedagogique';
  wb.created = new Date();

  const money = '#,##0 "FCFA"';

  /*
   * Ligne de titre fusionnee sur la largeur du tableau.
   * `lastCol` est la derniere colonne a fusionner ('C', 'F'...). On fusionne
   * UNE SEULE ligne (A5:F5), et non la colonne entiere ('A:F'), sans quoi
   * exceljs leve « Cannot merge already merged cells » des la deuxieme ligne.
   */
  const titleRow = (ws: import('exceljs').Worksheet, text: string, lastCol: string) => {
    const r = ws.addRow([text]);
    r.font = { bold: true, size: 13 };
    ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  };

  /* ---------------- Feuille 1 : Bilan ---------------- */
  const ws1 = wb.addWorksheet('Bilan OHADA');
  ws1.columns = [
    { header: 'Compte', key: 'a', width: 12 },
    { header: 'Libellé', key: 'b', width: 42 },
    { header: 'Montant', key: 'c', width: 18 },
  ];
  ws1.spliceRows(1, 1);
  titleRow(ws1, `${school} — Bilan de l’exercice ${b.year.label}`, 'C');
  titleRow(ws1, 'Présentation SYSCOHADA révisé', 'C');
  ws1.addRow([]);

  const header = (ws: import('exceljs').Worksheet, cells: string[]) => {
    const r = ws.addRow(cells);
    r.font = { bold: true };
    r.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
      c.border = { bottom: { style: 'thin' } };
    });
    return r;
  };

  header(ws1, ['Compte', 'PRODUITS (classe 7)', 'Montant']);
  for (const p of b.products) {
    const r = ws1.addRow([p.account, p.label, p.amount]);
    r.getCell(3).numFmt = money;
  }
  let r1 = ws1.addRow(['', 'TOTAL DES PRODUITS', b.totalProducts]);
  r1.font = { bold: true }; r1.getCell(3).numFmt = money;
  ws1.addRow([]);

  header(ws1, ['Compte', 'CHARGES (classe 6)', 'Montant']);
  for (const c of b.charges) {
    const r = ws1.addRow([c.account, c.label, c.amount]);
    r.getCell(3).numFmt = money;
  }
  r1 = ws1.addRow(['', 'TOTAL DES CHARGES', b.totalCharges]);
  r1.font = { bold: true }; r1.getCell(3).numFmt = money;
  ws1.addRow([]);

  r1 = ws1.addRow(['', 'RÉSULTAT NET DE L’EXERCICE', b.netResult]);
  r1.font = { bold: true, color: { argb: b.netResult < 0 ? 'FFB00020' : 'FF1B5E20' } };
  r1.getCell(3).numFmt = money;
  ws1.addRow([]);

  header(ws1, ['Compte', 'ACTIF', 'Montant']);
  for (const a of b.assets) {
    const r = ws1.addRow([a.account, `Immobilisation : ${a.label}`, a.amount]);
    r.getCell(3).numFmt = money;
  }
  let r2 = ws1.addRow(['5', 'Trésorerie disponible', b.totalTreasury]);
  r2.getCell(3).numFmt = money;
  r2 = ws1.addRow(['', 'TOTAL ACTIF', b.totalActif]);
  r2.font = { bold: true }; r2.getCell(3).numFmt = money;
  ws1.addRow([]);

  header(ws1, ['Compte', 'PASSIF', 'Montant']);
  r2 = ws1.addRow(['11', 'Report à nouveau', b.openingBalance]);
  r2.getCell(3).numFmt = money;
  r2 = ws1.addRow(['13', 'Résultat net de l’exercice', b.netResult]);
  r2.getCell(3).numFmt = money;
  r2 = ws1.addRow(['', 'TOTAL PASSIF', b.totalPassif]);
  r2.font = { bold: true }; r2.getCell(3).numFmt = money;

  ws1.addRow([]);
  const eq = ws1.addRow(['', b.balanced
    ? 'Actif et passif sont équilibrés.'
    : `DÉSÉQUILIBRE de ${formatFcfa(b.totalActif - b.totalPassif)} — vérifiez vos écritures.`]);
  eq.font = { bold: true, color: { argb: b.balanced ? 'FF1B5E20' : 'FFB00020' } };
  ws1.addRow([]);
  ws1.addRow(['', OHADA_DISCLAIMER]);
  ws1.addRow(['', signatureFor('application') || '']);

  /* ---------------- Feuille 2 : Inventaire ---------------- */
  const ws2 = wb.addWorksheet('Inventaire');
  ws2.columns = [
    { header: 'Compte', key: 'a', width: 12 },
    { header: 'Catégorie', key: 'b', width: 28 },
    { header: 'Date', key: 'c', width: 14 },
    { header: 'Objet', key: 'd', width: 40 },
    { header: 'Pièce', key: 'e', width: 16 },
    { header: 'Valeur', key: 'f', width: 16 },
  ];
  ws2.spliceRows(1, 1);
  titleRow(ws2, `${school} — Inventaire de l’exercice ${b.year.label}`, 'F');
  ws2.addRow([]);
  header(ws2, ['Compte', 'Catégorie', 'Date', 'Objet', 'Pièce', 'Valeur']);
  for (const it of items) {
    for (const o of it.objects) {
      const r = ws2.addRow([it.account, it.label, fr(o.date), o.object, o.receipt || '', o.amount]);
      r.getCell(6).numFmt = money;
    }
    const st = ws2.addRow(['', `Sous-total ${it.label}`, '', '', '', it.total]);
    st.font = { bold: true }; st.getCell(6).numFmt = money;
  }
  const tot = ws2.addRow(['', 'TOTAL DE L’INVENTAIRE', '', '', '', inventoryTotal(items)]);
  tot.font = { bold: true }; tot.getCell(6).numFmt = money;
  ws2.addRow([]);
  ws2.addRow(['', OHADA_DISCLAIMER]);
  ws2.addRow(['', signatureFor('application') || '']);

  /* ---------------- Feuille 3 : Budget ---------------- */
  const ws3 = wb.addWorksheet('Budget');
  ws3.columns = [
    { header: 'Nature', key: 'a', width: 12 },
    { header: 'Poste', key: 'b', width: 36 },
    { header: 'Prévu', key: 'c', width: 16 },
    { header: 'Réalisé', key: 'd', width: 16 },
    { header: 'Écart', key: 'e', width: 16 },
    { header: 'Taux', key: 'f', width: 10 },
  ];
  ws3.spliceRows(1, 1);
  titleRow(ws3, `${school} — Budget de l’exercice ${b.year.label}`, 'F');
  ws3.addRow([]);
  header(ws3, ['Nature', 'Poste', 'Prévu', 'Réalisé', 'Écart', 'Taux']);
  for (const t of tracking) {
    const r = ws3.addRow([
      t.line.kind === 'recette' ? 'Recette' : 'Dépense',
      t.line.label, t.line.planned, t.actual, t.variance, `${t.rate} %`,
    ]);
    [3, 4, 5].forEach((i) => { r.getCell(i).numFmt = money; });
    if (t.overrun) r.getCell(5).font = { bold: true, color: { argb: 'FFB00020' } };
  }
  ws3.addRow([]);
  const tr = ws3.addRow(['', 'Résultat prévisionnel', totals.plannedResult, totals.actualResult, roundSafe(totals.actualResult - totals.plannedResult), '']);
  tr.font = { bold: true };
  [3, 4, 5].forEach((i) => { tr.getCell(i).numFmt = money; });
  ws3.addRow([]);
  ws3.addRow(['', signatureFor('application') || '']);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comptabilite-ohada-${b.year.label}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function roundSafe(n: number): number {
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/* ==================================================================== */
/* 6. Impression (conservée — règle v41)                                 */
/* ==================================================================== */

/**
 * Ouvre la fenêtre d'impression du navigateur. L'export PDF et l'impression
 * coexistent partout : c'est une exigence explicite de la v41.
 */
export function printAccountingDocument(title: string, bodyHtml: string, school: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  const sign = signatureFor('application') || '';
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${title}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:18mm 14mm;color:#111}
  h1{font-size:18pt;margin:0 0 2mm}
  h2{font-size:12pt;margin:6mm 0 2mm;border-bottom:1px solid #999;padding-bottom:1mm}
  .etab{font-size:10pt;color:#555;margin-bottom:6mm}
  table{width:100%;border-collapse:collapse;margin-bottom:4mm}
  th,td{border:1px solid #999;padding:2mm 2.5mm;font-size:9.5pt;text-align:left}
  th{background:#e8eef7}
  td.num{text-align:right}
  .neg{color:#b00020;font-weight:bold}
  .sign{margin-top:10mm;font-size:8.5pt;color:#666;border-top:1px solid #ccc;padding-top:2mm}
  @media print{ @page{ size:A4; margin:12mm } }
</style></head><body>
<h1>${title}</h1><div class="etab">${school}</div>
${bodyHtml}
<div class="sign">${sign}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
