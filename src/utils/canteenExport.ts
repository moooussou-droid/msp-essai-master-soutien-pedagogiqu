/**
 * EXPORTS DU GESTIONNAIRE DE CANTINE (v40).
 *
 * Réutilise ExcelJS, déjà présent dans l'application (aucune dépendance
 * nouvelle). Le « PDF » est produit par la fenêtre d'impression du
 * navigateur (« Enregistrer au format PDF »), seule méthode 100 % hors
 * ligne disponible sur un téléphone Android.
 */
import ExcelJS from 'exceljs';
import { makePdf, PdfColumn, PdfRow } from './pdfMaker';
import {
  WeeklyWithdrawal, LEGUME_LABELS, CEREAL_LABELS, DEFAULT_FOOD_CONFIG,
  formatQty, balanceLabel, plannedLegume, legumeSwitchLabel,
} from './canteenCalc';
import { MenuWeek, menuWeekTotals, menuWeekHeadcount, menuDayTotal, StockLedger } from './canteenStore';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const ROUNDING_NOTE_FR = 'Méthode d’arrondi utilisée pour la sortie des denrées (v65) : '
  + 'huile, céréales et légumineuses — partie décimale [0 ; 0,375] → 0,25, '
  + ']0,375 ; 0,625] → 0,50, ]0,625 ; 0,875] → 0,75, ]0,875 ; 1] → 1 ; '
  + 'sel — [0 ; 0,15] → 0,10, ]0,15 ; 0,25] → 0,20, …, ]0,95 ; 1] → 1. '
  + 'Une quantité entière exacte reste inchangée.';

const ROUNDING_NOTE_ASCII = 'Methode d arrondi de sortie des denrees (v65) : '
  + 'huile, cereales et legumineuses - partie decimale [0 ; 0,375] -> 0,25, '
  + ']0,375 ; 0,625] -> 0,50, ]0,625 ; 0,875] -> 0,75, ]0,875 ; 1] -> 1 ; '
  + 'sel - [0 ; 0,15] -> 0,10, ]0,15 ; 0,25] -> 0,20, ..., ]0,95 ; 1] -> 1. '
  + 'Une quantite entiere exacte reste inchangee.';

function frDate(iso: string): string {
  if (!iso) return '';
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ouvre une fenêtre d'impression contenant `html`. */
function printHtml(title: string, html: string): void {
  const w = window.open('', '_blank');
  if (!w) {   // fenêtre bloquée : on imprime la page courante
    window.print();
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#111}
      h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 6px}
      p.sub{font-size:12px;color:#555;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
      th,td{border:1px solid #666;padding:5px 6px;text-align:left}
      th{background:#eee}
      td.n{text-align:right} .neg{color:#b00020;font-weight:bold}
      .sign{margin-top:24px;font-size:12px;line-height:2}
    </style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/* ================================================================== */
/* 1. Simulateur : export PDF (impression) et Excel                    */
/* ================================================================== */

export function weekSummaryText(week: WeeklyWithdrawal): string {
  const s = week.weeklySummary;
  const legume = LEGUME_LABELS[week.legume];
  const lines = [
    `CANTINE — ${week.establishmentName}`,
    `Semaine du ${frDate(week.weekStartDate)} au ${frDate(week.weekEndDate)}`,
    `Effectif : ${week.weeklyStaffCount} élèves · ${week.workingDays} jour(s) · ${legume}`,
    `Plats servis : ${s.totalMeals}`,
    '',
    `Maïs : prévu ${formatQty(s.maizePlanned)} kg · sorti ${formatQty(s.maizeActual)} kg · ${balanceLabel(s.maizeBalance, 'kg')}`,
    `Riz : prévu ${formatQty(s.ricePlanned)} kg · sorti ${formatQty(s.riceActual)} kg · ${balanceLabel(s.riceBalance, 'kg')}`,
    `${legume} : prévu ${formatQty(s.legumePlanned)} kg · sorti ${formatQty(s.legumeActual)} kg · ${balanceLabel(s.legumeBalance, 'kg')}`,
    `Huile : prévu ${formatQty(s.oilPlanned)} L · sorti ${formatQty(s.oilActual)} L · ${balanceLabel(s.oilBalance, 'L')}`,
    `Sel : prévu ${formatQty(s.saltPlanned)} kg · sorti ${formatQty(s.saltActual)} kg · ${balanceLabel(s.saltBalance, 'kg')}`,
    '',
    ROUNDING_NOTE_FR,
  ];
  return lines.join('\n');
}

/**
 * IMPRESSION de la fiche de prélèvement (conservée en v41).
 * Ouvre la fenêtre d'impression du navigateur.
 */
export async function printWeek(week: WeeklyWithdrawal): Promise<void> {
  const s = week.weeklySummary;
  const legume = LEGUME_LABELS[week.legume];
  const cfg = DEFAULT_FOOD_CONFIG;

  const rows = [
    ['Maïs', s.maizePlanned, s.maizeActual, s.maizeBalance, cfg.maize.unit],
    ['Riz', s.ricePlanned, s.riceActual, s.riceBalance, cfg.rice.unit],
    [legume, s.legumePlanned, s.legumeActual, s.legumeBalance, cfg.legume.unit],
    ['Huile', s.oilPlanned, s.oilActual, s.oilBalance, cfg.oil.unit],
    ['Sel', s.saltPlanned, s.saltActual, s.saltBalance, cfg.salt.unit],
  ] as [string, number, number, number, string][];

  const daysHtml = week.dailyWithdrawals.map((d) => `
    <tr>
      <td>${DAY_NAMES[d.dayNumber - 1] || 'Jour ' + d.dayNumber}</td>
      <td>${frDate(d.date)}</td>
      <td class="n">${d.cereal === 'aucune' ? '—' : d.staffCount}</td>
      <td>${CEREAL_LABELS[d.cereal]}</td>
      <td class="n">${formatQty(d.maizeQuantity)}</td>
      <td class="n">${formatQty(d.riceQuantity)}</td>
      <td class="n">${formatQty(d.legumeQuantity)}</td>
      <td class="n">${formatQty(d.oilQuantity)}</td>
      <td class="n">${formatQty(d.saltQuantity)}</td>
    </tr>`).join('');

  const summaryHtml = rows.map(([label, p, a, b, unit]) => `
    <tr>
      <td>${label}</td>
      <td class="n">${formatQty(p)} ${unit}</td>
      <td class="n">${formatQty(a)} ${unit}</td>
      <td class="n ${b < 0 ? 'neg' : ''}">${b < 0 ? 'Dépassement de ' + formatQty(Math.abs(b)) : formatQty(b)} ${unit}</td>
    </tr>`).join('');

  printHtml('Prélèvement cantine', `
    <h1>Fiche de prélèvement — cantine scolaire</h1>
    <p class="sub">${week.establishmentName} · Semaine du ${frDate(week.weekStartDate)} au ${frDate(week.weekEndDate)}
      · ${week.weeklyStaffCount} élèves inscrits · Légumineuse : ${legume}</p>

    <h2>Prélèvements journaliers</h2>
    <table><thead><tr>
      <th>Jour</th><th>Date</th><th>Élèves</th><th>Céréale</th>
      <th>Maïs</th><th>Riz</th><th>${legume}</th><th>Huile</th><th>Sel</th>
    </tr></thead><tbody>${daysHtml}</tbody></table>

    <h2>Point de la semaine — ${s.totalMeals} plats servis</h2>
    <table><thead><tr><th>Denrée</th><th>Prévu</th><th>Sorti</th><th>Reliquat</th></tr></thead>
    <tbody>${summaryHtml}</tbody></table>

    <p class="sub">${ROUNDING_NOTE_FR}</p>

    <div class="sign">
      Établi par : ...................................................<br/>
      Fonction : Maître cantine<br/>
      Date : ${frDate(new Date().toISOString().slice(0, 10))}<br/>
      Signature :
    </div>`);
}

/**
 * VRAI FICHIER PDF (v41).
 *
 * Le document est fabriqué par l'application elle-même, hors ligne, puis
 * téléchargé en .pdf. L'impression reste disponible séparément.
 */
export async function exportWeekPdf(week: WeeklyWithdrawal): Promise<void> {
  const s = week.weeklySummary;
  const cfg = DEFAULT_FOOD_CONFIG;

  const pdf = makePdf({
    title: 'Fiche de prelevement - Cantine scolaire',
    subtitle: `Semaine du ${frDate(week.weekStartDate)} au ${frDate(week.weekEndDate)}`,
    establishment: week.establishmentName,
    signature: {
      preparedBy: '',
      role: 'Maitre cantine',
      date: frDate(new Date().toISOString().slice(0, 10)),
    },
  });

  pdf.keyValues([
    ['Eleves inscrits', String(week.weeklyStaffCount)],
    ['Jours de cantine', String(week.workingDays)],
    ['Jours de mais', String(week.maizeServiceCount)],
    ['Legumineuse prevue', LEGUME_LABELS[week.legume]],
    ['Plats servis', String(s.totalMeals)],
    ['Statut', week.status === 'cloturee' ? 'Cloturee' : 'En cours'],
    ['Methode d arrondi', 'Intervalles de sortie v65'],
  ]);

  const switchNote = legumeSwitchLabel(week.dailyWithdrawals);
  if (switchNote) pdf.paragraph(switchNote.replace(/é/g, 'e').replace(/è/g, 'e'));
  pdf.paragraph(ROUNDING_NOTE_ASCII);

  /* --- Prélèvements journaliers --- */
  pdf.sectionTitle('Prelevements journaliers');
  const dayCols: PdfColumn[] = [
    { header: 'Jour', width: 1.3 },
    { header: 'Date', width: 1.2 },
    { header: 'Eleves', width: 0.9, align: 'right' },
    { header: 'Cereale', width: 1.3 },
    { header: 'Legumineuse', width: 1.4 },
    { header: 'Mais', width: 1, align: 'right' },
    { header: 'Riz', width: 1, align: 'right' },
    { header: 'Legum.', width: 1, align: 'right' },
    { header: 'Huile', width: 1, align: 'right' },
    { header: 'Sel', width: 1, align: 'right' },
  ];
  const dayRows: PdfRow[] = week.dailyWithdrawals.map((d) => [
    DAY_NAMES[d.dayNumber - 1] || `Jour ${d.dayNumber}`,
    frDate(d.date),
    d.cereal === 'aucune' ? '-' : String(d.staffCount),
    CEREAL_LABELS[d.cereal],
    d.cereal === 'aucune' ? '-' : LEGUME_LABELS[d.legume || week.legume],
    formatQty(d.maizeQuantity),
    formatQty(d.riceQuantity),
    formatQty(d.legumeQuantity),
    formatQty(d.oilQuantity),
    formatQty(d.saltQuantity),
  ]);
  pdf.table(dayCols, dayRows);

  /* --- Point de la semaine --- */
  pdf.sectionTitle(`Point de la semaine - ${s.totalMeals} plats servis`);
  const sumCols: PdfColumn[] = [
    { header: 'Denree', width: 1.6 },
    { header: 'Prevu', width: 1, align: 'right' },
    { header: 'Sorti', width: 1, align: 'right' },
    { header: 'Reliquat', width: 1.2, align: 'right' },
    { header: 'Observation', width: 2 },
  ];

  const legumeLines = (s.legumeLines && s.legumeLines.length > 0)
    ? s.legumeLines.map((l) => ({ label: l.label, p: l.planned, a: l.actual, b: l.balance, unit: cfg.legume.unit }))
    : [{ label: LEGUME_LABELS[week.legume], p: s.legumePlanned, a: s.legumeActual, b: s.legumeBalance, unit: cfg.legume.unit }];

  const allLines = [
    { label: 'Mais', p: s.maizePlanned, a: s.maizeActual, b: s.maizeBalance, unit: cfg.maize.unit },
    { label: 'Riz', p: s.ricePlanned, a: s.riceActual, b: s.riceBalance, unit: cfg.rice.unit },
    ...legumeLines,
    { label: 'Huile', p: s.oilPlanned, a: s.oilActual, b: s.oilBalance, unit: cfg.oil.unit },
    { label: 'Sel', p: s.saltPlanned, a: s.saltActual, b: s.saltBalance, unit: cfg.salt.unit },
  ];

  const sumRows: PdfRow[] = allLines.map((l) => [
    l.label,
    `${formatQty(l.p)} ${l.unit}`,
    `${formatQty(l.a)} ${l.unit}`,
    { text: `${formatQty(l.b)} ${l.unit}`, danger: l.b < 0 },
    { text: balanceLabel(l.b, l.unit).replace(/é/g, 'e').replace(/è/g, 'e'), danger: l.b < 0 },
  ]);
  pdf.table(sumCols, sumRows);

  const overruns = allLines.filter((l) => l.b < 0);
  if (overruns.length > 0) {
    pdf.alert(
      'Depassement : '
      + overruns.map((l) => `${l.label} (${formatQty(Math.abs(l.b))} ${l.unit} de plus que prevu)`).join(', ')
      + '.',
    );
  }

  pdf.save(`cantine-semaine-${week.weekStartDate}.pdf`);
}

export async function exportWeekExcel(week: WeeklyWithdrawal): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Master Soutien Pédagogique';
  const legume = LEGUME_LABELS[week.legume];

  /* Feuille 1 — prévision */
  const s1 = wb.addWorksheet('Prévision');
  s1.addRow(['FICHE DE PRÉLÈVEMENT — CANTINE SCOLAIRE']).font = { bold: true, size: 14 };
  s1.addRow([week.establishmentName]);
  s1.addRow([`Semaine du ${frDate(week.weekStartDate)} au ${frDate(week.weekEndDate)}`]);
  s1.addRow([`Effectif : ${week.weeklyStaffCount} élèves`, `Jours : ${week.workingDays}`,
             `Jours de maïs : ${week.maizeServiceCount}`, `Légumineuse : ${legume}`]);
  s1.addRow([ROUNDING_NOTE_FR]);
  s1.addRow([]);
  const h1 = s1.addRow(['Denrée', 'Quantité prévue', 'Unité']);
  h1.font = { bold: true };
  const p = week.weeklyPlan;
  s1.addRow(['Maïs', p.maize, 'kg']);
  s1.addRow(['Riz', p.rice, 'kg']);
  s1.addRow([legume, plannedLegume(p), 'kg']);
  s1.addRow(['Huile', p.oil, 'L']);
  s1.addRow(['Sel', p.salt, 'kg']);
  s1.columns.forEach((c) => { c.width = 22; });

  /* Feuille 2 — journalier */
  const s2 = wb.addWorksheet('Journalier');
  const h2 = s2.addRow(['Jour', 'Date', 'Élèves', 'Céréale', 'Maïs (kg)', 'Riz (kg)', `${legume} (kg)`, 'Huile (L)', 'Sel (kg)']);
  h2.font = { bold: true };
  week.dailyWithdrawals.forEach((d) => {
    s2.addRow([
      DAY_NAMES[d.dayNumber - 1] || `Jour ${d.dayNumber}`,
      frDate(d.date), d.cereal === 'aucune' ? 0 : d.staffCount, CEREAL_LABELS[d.cereal],
      d.maizeQuantity, d.riceQuantity, d.legumeQuantity, d.oilQuantity, d.saltQuantity,
    ]);
  });
  s2.columns.forEach((c) => { c.width = 16; });

  /* Feuille 3 — synthèse */
  const s3 = wb.addWorksheet('Synthèse');
  s3.addRow(['Nombre total de plats servis', week.weeklySummary.totalMeals]).font = { bold: true };
  s3.addRow([]);
  const h3 = s3.addRow(['Denrée', 'Prévu', 'Sorti', 'Reliquat', 'Observation']);
  h3.font = { bold: true };
  const sm = week.weeklySummary;
  const lines: [string, number, number, number, string][] = [
    ['Maïs', sm.maizePlanned, sm.maizeActual, sm.maizeBalance, 'kg'],
    ['Riz', sm.ricePlanned, sm.riceActual, sm.riceBalance, 'kg'],
    [legume, sm.legumePlanned, sm.legumeActual, sm.legumeBalance, 'kg'],
    ['Huile', sm.oilPlanned, sm.oilActual, sm.oilBalance, 'L'],
    ['Sel', sm.saltPlanned, sm.saltActual, sm.saltBalance, 'kg'],
  ];
  lines.forEach(([label, pl, ac, ba, unit]) => {
    const row = s3.addRow([label, pl, ac, ba, balanceLabel(ba, unit)]);
    if (ba < 0) row.getCell(4).font = { bold: true, color: { argb: 'FFB00020' } };
  });
  s3.columns.forEach((c) => { c.width = 24; });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `cantine-semaine-${week.weekStartDate}.xlsx`,
  );
}

/** Partage natif Android, avec repli sur le presse-papiers. */
export async function shareWeek(week: WeeklyWithdrawal): Promise<boolean> {
  const text = weekSummaryText(week);
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      await (navigator as any).share({ title: 'Point cantine', text });
      return true;
    }
  } catch { /* l'utilisateur a annulé : on retombe sur la copie */ }
  try {
    await navigator.clipboard.writeText(text);
  } catch { /* ignore */ }
  return false;
}

/* ================================================================== */
/* 2. Cahier des menus                                                 */
/* ================================================================== */

export function printMenuWeek(week: MenuWeek): void {
  const head = menuWeekHeadcount(week);
  const totals = menuWeekTotals(week);

  const body = week.days.map((d) => {
    const n = Math.max(1, d.lines.length);
    return d.lines.map((l, i) => `
      <tr>
        ${i === 0 ? `<td rowspan="${n}"><strong>${d.dayLabel}</strong><br/>${d.date}</td>
                     <td rowspan="${n}">${d.menu}</td>` : ''}
        <td>${l.food}</td><td class="n">${formatQty(l.ration)}</td>
        ${i === 0 ? `<td rowspan="${n}" class="n">${d.boys}</td>
                     <td rowspan="${n}" class="n">${d.girls}</td>
                     <td rowspan="${n}" class="n"><strong>${menuDayTotal(d)}</strong></td>` : ''}
        <td>${l.food}</td><td class="n">${formatQty(l.quantity)}</td>
        <td>${l.food}</td><td class="n ${l.balance < 0 ? 'neg' : ''}">${formatQty(l.balance)}</td>
      </tr>`).join('');
  }).join('');

  const totalRows = totals.map((t) => `
    <tr><td colspan="7"></td><td>${t.food}</td><td class="n">${formatQty(t.quantity)}</td>
    <td>${t.food}</td><td class="n">${formatQty(t.balance)}</td></tr>`).join('');

  printHtml('Cahier des menus hebdomadaires', `
    <h1 style="text-align:center">Cahier des menus hebdomadaires</h1>
    <p class="sub" style="text-align:center">${week.establishmentName} —
      Semaine du ${frDate(week.startDate)} au ${frDate(week.endDate)}</p>
    <table>
      <thead>
        <tr>
          <th rowspan="2">Jours de cantine</th><th rowspan="2">Menu</th>
          <th colspan="2">Ration par élève</th>
          <th colspan="3">Nombre d'élèves inscrits à la cantine</th>
          <th colspan="2">Quantités de vivres à sortir pour la préparation</th>
          <th colspan="2">Solde</th>
        </tr>
        <tr>
          <th>Vivres</th><th>Qté en Kg</th><th>G</th><th>F</th><th>T</th>
          <th>Vivres</th><th>Qté en Kg</th><th>Vivres</th><th>Qté en Kg</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr><td colspan="4"><strong>TOTAUX</strong></td>
          <td class="n"><strong>${head.boys}</strong></td>
          <td class="n"><strong>${head.girls}</strong></td>
          <td class="n"><strong>${head.total}</strong></td>
          <td colspan="4"></td></tr>
        ${totalRows}
      </tbody>
    </table>
    <p class="sub">${ROUNDING_NOTE_FR}</p>
    <div class="sign">
      Établi par : M./Mme ${week.preparedBy || '.........................................'}<br/>
      Fonction : ${week.role}<br/>
      Date : ${frDate(week.signedDate)}<br/>
      Signature :
    </div>`);
}

export async function exportMenuWeekExcel(week: MenuWeek): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Menus');
  ws.addRow(['CAHIER DES MENUS HEBDOMADAIRES']).font = { bold: true, size: 14 };
  ws.addRow([week.establishmentName]);
  ws.addRow([`Semaine du ${frDate(week.startDate)} au ${frDate(week.endDate)}`]);
  ws.addRow([ROUNDING_NOTE_FR]);
  ws.addRow([]);
  ws.addRow(['Jour', 'Date', 'Menu', 'Vivres', 'Ration/élève (Kg)', 'G', 'F', 'T',
             'Qté à sortir (Kg)', 'Solde (Kg)']).font = { bold: true };
  week.days.forEach((d) => {
    d.lines.forEach((l, i) => {
      ws.addRow([
        i === 0 ? d.dayLabel : '', i === 0 ? d.date : '', i === 0 ? d.menu : '',
        l.food, l.ration, i === 0 ? d.boys : '', i === 0 ? d.girls : '',
        i === 0 ? menuDayTotal(d) : '', l.quantity, l.balance,
      ]);
    });
  });
  ws.addRow([]);
  const head = menuWeekHeadcount(week);
  ws.addRow(['TOTAUX', '', '', '', '', head.boys, head.girls, head.total]).font = { bold: true };
  menuWeekTotals(week).forEach((t) => ws.addRow(['', '', '', t.food, '', '', '', '', t.quantity, t.balance]));
  ws.addRow([]);
  ws.addRow([`Établi par : ${week.preparedBy}`]);
  ws.addRow([`Fonction : ${week.role}`]);
  ws.addRow([`Date : ${frDate(week.signedDate)}`]);
  ws.columns.forEach((c) => { c.width = 18; });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `cahier-menus-${week.startDate}.xlsx`,
  );
}

/* ================================================================== */
/* 3. Cahier de stock                                                  */
/* ================================================================== */

export function printLedger(ledger: StockLedger, establishmentName: string): void {
  const rows = ledger.rows.map((r) => `
    <tr>
      <td>${frDate(r.date)}</td>
      <td class="n">${formatQty(r.initialStock)}</td>
      <td class="n">${formatQty(r.entry)}</td>
      <td class="n">${formatQty(r.available)}</td>
      <td class="n">${formatQty(r.exit)}</td>
      <td class="n ${r.remaining < 0 ? 'neg' : ''}">${formatQty(r.remaining)}</td>
      <td>${r.ref || ''}</td>
      <td>${r.observations || ''}</td>
    </tr>`).join('');

  printHtml(`Stock — ${ledger.food}`, `
    <h1 style="text-align:center">Cahier de gestion des stocks — ${ledger.food.toUpperCase()}</h1>
    <p class="sub" style="text-align:center">${establishmentName}</p>
    <table><thead><tr>
      <th>DATE</th><th>STOCK INITIAL ancien stock (${ledger.unit})</th>
      <th>ENTRÉE DOTATION ANAN (${ledger.unit})</th><th>STOCK DISPONIBLE (${ledger.unit})</th>
      <th>SORTIE (${ledger.unit})</th><th>STOCK RESTANT (${ledger.unit})</th>
      <th>Ref</th><th>OBSERVATIONS</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p class="sub">${ROUNDING_NOTE_FR} Seule la colonne SORTIE est arrondie ; les entrées dotation ne le sont pas.</p>`);
}

export async function exportLedgerExcel(ledger: StockLedger, establishmentName: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(ledger.food.slice(0, 28));
  ws.addRow([`CAHIER DE GESTION DES STOCKS — ${ledger.food.toUpperCase()}`]).font = { bold: true, size: 14 };
  ws.addRow([establishmentName]);
  ws.addRow([`${ROUNDING_NOTE_FR} Seule la colonne SORTIE est arrondie ; les entrées dotation ne le sont pas.`]);
  ws.addRow([]);
  ws.addRow(['DATE', `STOCK INITIAL (${ledger.unit})`, `ENTRÉE DOTATION ANAN (${ledger.unit})`,
             `STOCK DISPONIBLE (${ledger.unit})`, `SORTIE (${ledger.unit})`,
             `STOCK RESTANT (${ledger.unit})`, 'Ref', 'OBSERVATIONS']).font = { bold: true };
  ledger.rows.forEach((r) => {
    ws.addRow([frDate(r.date), r.initialStock, r.entry, r.available, r.exit, r.remaining, r.ref, r.observations]);
  });
  ws.columns.forEach((c) => { c.width = 20; });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `stock-${ledger.food.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
  );
}

/* ================================================================== */
/* 4. VRAIS FICHIERS PDF des deux cahiers (v41)                        */
/* ================================================================== */

/** Cahier des menus : fichier .pdf réel (l'impression reste disponible). */
export async function exportMenuWeekPdf(week: MenuWeek): Promise<void> {
  const head = menuWeekHeadcount(week);
  const totals = menuWeekTotals(week);

  const pdf = makePdf({
    title: 'Cahier des menus hebdomadaires',
    subtitle: `Semaine du ${frDate(week.startDate)} au ${frDate(week.endDate)}`,
    establishment: week.establishmentName,
    orientation: 'landscape',
    signature: {
      preparedBy: week.preparedBy,
      role: week.role,
      date: frDate(week.signedDate),
    },
  });

  const cols: PdfColumn[] = [
    { header: 'Jour', width: 1.1 },
    { header: 'Menu', width: 2.2 },
    { header: 'Vivres', width: 1.1 },
    { header: 'Ration/eleve (Kg)', width: 1.1, align: 'right' },
    { header: 'G', width: 0.6, align: 'right' },
    { header: 'F', width: 0.6, align: 'right' },
    { header: 'T', width: 0.6, align: 'right' },
    { header: 'Qte a sortir (Kg)', width: 1.2, align: 'right' },
    { header: 'Solde (Kg)', width: 1, align: 'right' },
  ];

  const rows: PdfRow[] = [];
  for (const d of week.days) {
    d.lines.forEach((l, i) => {
      rows.push([
        i === 0 ? `${d.dayLabel} ${d.date}` : '',
        i === 0 ? d.menu : '',
        l.food,
        formatQty(l.ration),
        i === 0 ? String(d.boys) : '',
        i === 0 ? String(d.girls) : '',
        i === 0 ? { text: String(menuDayTotal(d)), bold: true } : '',
        formatQty(l.quantity),
        { text: formatQty(l.balance), danger: l.balance < 0 },
      ]);
    });
  }

  // Ligne de totaux, comme au bas du cahier officiel.
  rows.push([
    { text: 'TOTAUX', bold: true }, '', '', '',
    { text: String(head.boys), bold: true },
    { text: String(head.girls), bold: true },
    { text: String(head.total), bold: true },
    '', '',
  ]);
  for (const t of totals) {
    rows.push(['', '', t.food, '', '', '', '', formatQty(t.quantity), formatQty(t.balance)]);
  }

  pdf.paragraph(ROUNDING_NOTE_ASCII);
  pdf.table(cols, rows);
  pdf.save(`cahier-menus-${week.startDate}.pdf`);
}

/** Cahier de stock d'une denrée : fichier .pdf réel. */
export async function exportLedgerPdf(ledger: StockLedger, establishmentName: string): Promise<void> {
  const pdf = makePdf({
    title: `Cahier de gestion des stocks - ${ledger.food.toUpperCase()}`,
    establishment: establishmentName,
    orientation: 'landscape',
  });

  const cols: PdfColumn[] = [
    { header: 'DATE', width: 1.1 },
    { header: `STOCK INITIAL (${ledger.unit})`, width: 1.3, align: 'right' },
    { header: `ENTREE DOTATION (${ledger.unit})`, width: 1.3, align: 'right' },
    { header: `STOCK DISPONIBLE (${ledger.unit})`, width: 1.3, align: 'right' },
    { header: `SORTIE (${ledger.unit})`, width: 1, align: 'right' },
    { header: `STOCK RESTANT (${ledger.unit})`, width: 1.3, align: 'right' },
    { header: 'Ref', width: 0.9 },
    { header: 'OBSERVATIONS', width: 2 },
  ];

  const rows: PdfRow[] = ledger.rows.map((r) => [
    frDate(r.date),
    formatQty(r.initialStock),
    formatQty(r.entry),
    formatQty(r.available),
    formatQty(r.exit),
    { text: formatQty(r.remaining), danger: r.remaining < 0 },
    r.ref || '',
    r.observations || '',
  ]);

  pdf.paragraph(`${ROUNDING_NOTE_ASCII} Seule la colonne SORTIE est arrondie ; les entrees dotation ne le sont pas.`);
  pdf.table(cols, rows);

  const last = ledger.rows[ledger.rows.length - 1];
  if (last) {
    pdf.keyValues([['Stock restant actuel', `${formatQty(last.remaining)} ${ledger.unit}`]]);
    if (last.remaining < 0) {
      pdf.alert(`Stock negatif : une sortie depasse le stock disponible (${formatQty(last.remaining)} ${ledger.unit}).`);
    } else if (last.remaining === 0) {
      pdf.alert('Stock epuise.');
    }
  }

  pdf.save(`stock-${ledger.food.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
