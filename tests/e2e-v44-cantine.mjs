/**
 * E2E v44 — Simulateur de prélèvement / cantine.
 *
 * Objectif : vérifier DANS L'INTERFACE RÉELLE le jeu historique du
 * simulateur, recalculé depuis la v65 avec les intervalles de sortie.
 *
 * Jeu de référence (§41) :
 *   effectif hebdomadaire 310 · 5 jours · 0 sortie de maïs · haricot
 *   effectifs journaliers 279 · 291 · 295 · 290 · 291, riz tous les jours
 *   => 1446 plats, riz 232,50 prévu / 217 sorti, reliquat 15,50
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const failures = [];
const ok = (c, l) => {
  if (c) { pass++; console.log('  ✅ ' + l); }
  else { fail++; failures.push(l); console.log('  ❌ ' + l); }
};

const ACT = {
  activated: true, name: 'KOFFI Jean', code: '111111',
  expiresAt: Date.now() + 31536000000, plan: 'complet',
};

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript((act) => {
    localStorage.setItem('msp_activation', JSON.stringify(act));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'KOFFI Jean', schoolName: 'EPP Cotonou Centre',
    }));
    localStorage.setItem('msp_install_dismissed', 'true');
    const g = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) =>
      (typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : g(k));
  }, ACT);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}

const run = async () => {
  const browser = await chromium.launch();

  console.log('\n— Le simulateur reproduit le fichier de référence');
  const { ctx, page } = await newPage(browser);
  await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Le module s'ouvre sur un menu (ecran 1 du cahier des charges).
  await page.locator('button:has-text("Nouvelle semaine")').first().click();
  await page.waitForTimeout(1200);

  // ── Paramètres hebdomadaires ──────────────────────────────────────
  await page.locator('[data-testid="champ-effectif"]').fill('310');
  await page.locator('[data-testid="champ-jours"]').selectOption('5');
  await page.locator('[data-testid="champ-mais"]').selectOption('0');
  await page.locator('[data-testid="champ-legumineuse"]').selectOption('haricot');
  await page.locator('[data-testid="btn-creer-semaine"]').click();
  await page.waitForTimeout(1800);

  const goto = async (label) => {
    // Retour au menu si besoin, puis ouverture de l'ecran demande.
    if (await page.locator(`button:has-text("${label}")`).count() === 0) {
      await page.locator('button:has-text("Retour"), [aria-label="Retour"]').first().click();
      await page.waitForTimeout(900);
    }
    await page.locator(`button:has-text("${label}")`).first().click();
    await page.waitForTimeout(1200);
  };
  await goto('Prévision hebdomadaire');

  // ── Prévision hebdomadaire ────────────────────────────────────────
  const prevu = async (f) => (await page.locator(`[data-testid="prevu-${f}"]`).innerText()).trim();
  ok((await prevu('rice')).includes('232,5'), `Prévision riz = 232,50 kg (lu : ${await prevu('rice')})`);
  ok((await prevu('legume')).includes('46,25'), `Prévision haricot = 46,25 kg (lu : ${await prevu('legume')})`);
  ok((await prevu('oil')).includes('16,25'), `Prévision huile v65 = 16,25 L (lu : ${await prevu('oil')})`);
  ok((await prevu('salt')).includes('4,5'), `Prévision sel = 4,50 kg (lu : ${await prevu('salt')})`);

  // ── Cinq prélèvements journaliers ─────────────────────────────────
  await goto('Prélèvement du jour');
  const eff = [279, 291, 295, 290, 291];
  for (let i = 0; i < 5; i++) {
    const n = i + 1;
    await page.locator(`[data-testid="effectif-jour-${n}"]`).fill(String(eff[i]));
    await page.locator(`[data-testid="cereale-jour-${n}"]`).selectOption('rice');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);

  ok(await page.locator('[data-testid="jour-5"]').count() === 1,
     'Les cinq blocs journaliers sont présents');

  const j1 = await page.locator('[data-testid="quantites-jour-1"]').innerText();
  ok(j1.includes('41,75'), `JOUR 1 : 279 élèves → riz 41,75 kg (lu : ${j1.replace(/\s+/g, ' ').slice(0, 80)})`);
  const j3 = await page.locator('[data-testid="quantites-jour-3"]').innerText();
  ok(j3.includes('44,25'), 'JOUR 3 : 295 élèves → riz 44,25 kg');

  // L'effectif journalier ne doit jamais être remplacé par l'effectif hebdo.
  ok(!j1.includes('46,5'), 'L’effectif hebdomadaire (310) ne contamine pas le jour 1');

  // ── Point hebdo ───────────────────────────────────────────────────
  await goto('Point hebdomadaire');
  const plats = (await page.locator('[data-testid="total-plats"]').innerText()).trim();
  ok(plats === '1446', `Nombre de plats servis = 1446 (lu : ${plats})`);

  const relRiz = await page.locator('[data-testid="reliquat-rice"]').innerText();
  ok(relRiz.includes('15,5'), `Reliquat riz = 15,50 kg (lu : ${relRiz.trim()})`);
  const relLeg = await page.locator('[data-testid="reliquat-legume-haricot"]').innerText();
  ok(relLeg.includes('3'), `Reliquat légumineuse = 3 kg (lu : ${relLeg.trim()})`);

  // ── Recalcul automatique (§40) ────────────────────────────────────
  await goto('Prélèvement du jour');
  await page.locator('[data-testid="effectif-jour-2"]').fill('300');
  await page.waitForTimeout(1200);
  await goto('Point hebdomadaire');
  const plats2 = (await page.locator('[data-testid="total-plats"]').innerText()).trim();
  ok(plats2 === '1455', `Modifier le jour 2 recalcule les plats (1455, lu : ${plats2})`);
  await goto('Prélèvement du jour');
  const j2 = await page.locator('[data-testid="quantites-jour-2"]').innerText();
  ok(j2.includes('45'), 'Modifier le jour 2 recalcule sa quantité de riz (300 → 45 kg)');
  await page.locator('[data-testid="effectif-jour-2"]').fill('291');
  await page.waitForTimeout(1000);

  // ── v44 : une journée sans légumineuse ────────────────────────────
  const avant = await page.locator('[data-testid="quantites-jour-1"]').innerText();
  ok(avant.includes('8,25'), 'JOUR 1 : légumineuse 8,25 kg avant décochage');
  await page.locator('[data-testid="sans-legumineuse-jour-1"]').check();
  await page.waitForTimeout(1200);
  const apres = await page.locator('[data-testid="quantites-jour-1"]').innerText();
  ok(!apres.includes('8,25'), 'JOUR 1 : la légumineuse disparaît quand on coche « Pas de légumineuse »');
  ok(apres.includes('41,75'), 'JOUR 1 : le riz reste servi malgré l’absence de légumineuse');
  await goto('Point hebdomadaire');
  const relLeg2 = await page.locator('[data-testid="reliquat-legume-haricot"]').innerText();
  ok(relLeg2.includes('11,25'), `Le reliquat légumineuse remonte à 11,25 kg (lu : ${relLeg2.trim()})`);
  // On rétablit pour la suite.
  await goto('Prélèvement du jour');
  await page.locator('[data-testid="sans-legumineuse-jour-1"]').uncheck();
  await page.waitForTimeout(1000);

  // ── Enregistrement et historique (§39) ────────────────────────────
  await goto('Point hebdomadaire');
  await page.locator('[data-testid="btn-enregistrer"]').click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await goto('Point hebdomadaire');
  const plats3 = (await page.locator('[data-testid="total-plats"]').innerText()).trim();
  ok(plats3 === '1446', `Après rechargement, la semaine est conservée (${plats3})`);

  // ── Exports PDF et Excel (§43) ────────────────────────────────────
  const zlib = (await import('node:zlib')).default;
  const { readFileSync, mkdtempSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const dir = mkdtempSync(join(tmpdir(), 'msp44c-'));

  await goto('Rapports');
  const [dlPdf] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.locator('[data-testid="btn-export-pdf"]').click(),
  ]);
  const pPdf = join(dir, dlPdf.suggestedFilename());
  await dlPdf.saveAs(pPdf);
  const bufPdf = readFileSync(pPdf);
  ok(bufPdf.slice(0, 4).toString() === '%PDF', 'Export : un vrai fichier PDF est produit');
  let txt = '';
  let i = 0;
  while (true) {
    const a0 = bufPdf.indexOf('stream', i);
    if (a0 < 0) break;
    let a = a0 + 6;
    if (bufPdf[a] === 0x0d) a++;
    if (bufPdf[a] === 0x0a) a++;
    const e0 = bufPdf.indexOf('endstream', a);
    if (e0 < 0) break;
    try { txt += zlib.inflateSync(bufPdf.subarray(a, e0)).toString('latin1'); } catch {}
    i = e0 + 9;
  }
  ok(txt.includes('1446'), 'Export PDF : le nombre de plats est repris');
  ok(txt.includes('232,50') || txt.includes('232.5'), 'Export PDF : la prévision de riz est reprise');
  ok(txt.includes('15,50') || txt.includes('15.5'), 'Export PDF : le reliquat de riz est repris');

  const [dlXls] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.locator('[data-testid="btn-export-excel"]').click(),
  ]);
  const pXls = join(dir, dlXls.suggestedFilename());
  await dlXls.saveAs(pXls);
  ok(dlXls.suggestedFilename().endsWith('.xlsx'), 'Export : un classeur Excel est produit');
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(pXls);
  let found = false;
  wb.eachSheet((ws) => ws.eachRow((row) => {
    const line = row.values.join(' ');
    if (line.includes('232.5') || line.includes('232,5')) found = true;
  }));
  ok(found, 'Export Excel : la prévision de riz (232,50) figure dans le classeur');
  ok(wb.worksheets.length >= 3, `Export Excel : plusieurs feuilles (${wb.worksheets.length})`);

  await ctx.close();
  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v44 cantine : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
