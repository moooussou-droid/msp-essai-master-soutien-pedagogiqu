/**
 * E2E v45 — régressions signalées par l'utilisateur.
 *
 *  1. « La saisie des notes par profil n'est plus disponible » : la saisie
 *     par profil existait mais n'était atteignable que depuis un menu
 *     nommé autrement (« Fiches élèves »), alors que l'écran « Saisir les
 *     notes » annonce « par matière OU PAR PROFIL ».
 *  2. « Le tableau des notes n'est pas téléchargeable en PDF » : l'écran
 *     n'avait aucun export.
 *  3. Détectés au passage : « Statistiques par discipline » et
 *     « Bilan annuel » n'avaient que l'impression, sans vrai PDF (v41).
 */
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const zlib = require('node:zlib');

const BASE = 'http://localhost:5173';
const CID = 'cls-v45';
let pass = 0, fail = 0;
const failures = [];
const ok = (c, l) => {
  if (c) { pass++; console.log('  ✅ ' + l); }
  else { fail++; failures.push(l); console.log('  ❌ ' + l); }
};

/** Texte lisible d'un PDF (flux compressés depuis la v41). */
function pdfText(buf) {
  let out = '', i = 0;
  while (true) {
    const s0 = buf.indexOf('stream', i);
    if (s0 < 0) break;
    let a = s0 + 6;
    if (buf[a] === 0x0d) a++;
    if (buf[a] === 0x0a) a++;
    const e0 = buf.indexOf('endstream', a);
    if (e0 < 0) break;
    try { out += zlib.inflateSync(buf.subarray(a, e0)).toString('latin1'); } catch { /* non compressé */ }
    i = e0 + 9;
  }
  return out;
}

const ACT = {
  activated: true, name: 'KOFFI Jean', code: '111111',
  expiresAt: Date.now() + 31536000000, plan: 'complet',
};

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true });
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

/** Classe de primaire avec deux matières et des notes réelles. */
async function seed(page) {
  await page.evaluate(async (id) => {
    const { openDB } = await import('/node_modules/idb/build/index.js');
    const db = await openDB('NoteFacileBenin', undefined);
    await db.put('classes', {
      id, name: 'CE1 A', school: 'EPP Cotonou Centre', level: 'CE1',
      educationType: 'primaire', schoolYear: '2025 - 2026', sequence: '1er Trim.',
      evaluationType: 'Évaluation formative 1',
      students: [
        { id: 's1', nom: 'AHOUANSOU', prenoms: 'Jean', sexe: 'M', matricule: '001', createdAt: 1 },
        { id: 's2', nom: 'KOFFI', prenoms: 'Mariam', sexe: 'F', matricule: '002', createdAt: 1 },
      ],
      subjects: [
        { id: 'sub1', name: 'Dictée', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 },
        { id: 'sub2', name: 'Calcul', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 2 },
      ],
      notes: [
        { id: 'n1', studentId: 's1', subjectId: 'sub1', noteObtenue: 16, notePerfectionnement: 2, absent: false, updatedAt: 1, evaluation: 'formative1' },
        { id: 'n2', studentId: 's1', subjectId: 'sub2', noteObtenue: 16, notePerfectionnement: 2, absent: false, updatedAt: 1, evaluation: 'formative1' },
        { id: 'n3', studentId: 's2', subjectId: 'sub1', noteObtenue: 8, notePerfectionnement: 1, absent: false, updatedAt: 1, evaluation: 'formative1' },
        { id: 'n4', studentId: 's2', subjectId: 'sub2', noteObtenue: 8, notePerfectionnement: 1, absent: false, updatedAt: 1, evaluation: 'formative1' },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    });
  }, CID);
}

const run = async () => {
  const browser = await chromium.launch();
  const dir = mkdtempSync(join(tmpdir(), 'msp45-'));

  /* ═══ 1. Saisie des notes PAR PROFIL ═══ */
  console.log('\n— 1. La saisie par profil est de retour à l’endroit annoncé');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seed(page);

    await page.goto(`${BASE}/#/class/${CID}/entry`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    ok(await page.locator('[data-testid="mode-saisie-matiere"]').count() === 1,
       'L’écran de saisie propose le mode « Par matière »');
    ok(await page.locator('[data-testid="mode-saisie-profil"]').count() === 1,
       'L’écran de saisie propose le mode « Par profil »');

    await page.locator('[data-testid="mode-saisie-profil"]').click();
    await page.waitForTimeout(1800);
    ok(page.url().includes('/profiles'), `Le mode « Par profil » ouvre les fiches élèves (${page.url().split('#')[1]})`);

    const body = await page.textContent('body');
    ok(body.includes('AHOUANSOU'), 'La liste des élèves s’affiche');

    // La saisie elle-même doit fonctionner.
    await page.locator('button:has-text("AHOUANSOU")').first().click();
    await page.waitForTimeout(1500);
    const inputs = await page.locator('input[type="number"], input[inputmode="decimal"], input[inputmode="numeric"]').count();
    ok(inputs >= 2, `La fiche de l’élève ouvre les champs de notes (${inputs} champs)`);
    const detail = await page.textContent('body');
    ok(detail.includes('Dictée') && detail.includes('Calcul'),
       'Toutes les matières de l’élève sont saisissables sur une seule fiche');
    ok(detail.includes('Enregistrer'), 'Le bouton d’enregistrement est présent');

    await ctx.close();
  }

  /* ═══ 2. Tableau des notes en PDF ═══ */
  console.log('\n— 2. Le tableau des notes se télécharge en PDF');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seed(page);

    await page.goto(`${BASE}/#/class/${CID}/table`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    ok(await page.locator('[data-testid="btn-pdf-tableau"]').count() === 1,
       'Le tableau des notes propose un téléchargement PDF');
    ok(await page.locator('[data-testid="btn-imprimer-tableau"]').count() === 1,
       'L’impression est proposée à côté du PDF (règle v41)');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-pdf-tableau"]').click(),
    ]);
    const f = join(dir, dl.suggestedFilename());
    await dl.saveAs(f);
    const buf = readFileSync(f);
    const txt = pdfText(buf);

    ok(buf.slice(0, 4).toString() === '%PDF', 'Le fichier produit est un vrai PDF');
    ok(dl.suggestedFilename().endsWith('.pdf'), `Extension .pdf (${dl.suggestedFilename()})`);
    ok(txt.includes('AHOUANSOU') && txt.includes('KOFFI'), 'Les deux élèves figurent dans le PV');
    ok(txt.includes('Dict') && txt.includes('Calcul'), 'Les colonnes de matières sont présentes');
    ok(txt.includes('18,00'), 'La note de 18,00 est reprise');
    ok(txt.includes('9,00'), 'La note de 9,00 est reprise');
    ok(txt.includes('Master Soutien'), 'Le PV porte la signature de l’application');
    // Seuil primaire : Jean valide 2 matières sur 2, Mariam 0.
    ok(txt.includes('Seuil') || txt.includes('Atteint'), 'La colonne du seuil est présente');

    await ctx.close();
  }

  /* ═══ 3. Statistiques par discipline en PDF ═══ */
  console.log('\n— 3. Statistiques par discipline : vrai PDF ajouté');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seed(page);

    await page.goto(`${BASE}/#/class/${CID}/statistiques-disciplines`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    ok(await page.locator('[data-testid="btn-pdf-disciplines"]').count() === 1,
       'Un bouton PDF est proposé');
    ok(await page.locator('[data-testid="btn-imprimer-disciplines"]').count() === 1,
       'L’impression est conservée');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-pdf-disciplines"]').click(),
    ]);
    const f = join(dir, dl.suggestedFilename());
    await dl.saveAs(f);
    const txt = pdfText(readFileSync(f));
    ok(readFileSync(f).slice(0, 4).toString() === '%PDF', 'Un vrai PDF est produit');
    ok(txt.includes('Dict') && txt.includes('Calcul'), 'Chaque discipline a sa ligne');
    ok(/Statistiques par discipline/.test(txt), 'Le document est titré');

    await ctx.close();
  }

  /* ═══ 4. Bilan annuel en PDF ═══ */
  console.log('\n— 4. Bilan annuel : vrai PDF ajouté');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seed(page);

    await page.goto(`${BASE}/#/class/${CID}/bilan-annuel`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    ok(await page.locator('[data-testid="btn-pdf-bilan"]').count() === 1,
       'Un bouton PDF est proposé');
    ok(await page.locator('[data-testid="btn-imprimer-bilan"]').count() === 1,
       'L’impression est conservée');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-pdf-bilan"]').click(),
    ]);
    const f = join(dir, dl.suggestedFilename());
    await dl.saveAs(f);
    const txt = pdfText(readFileSync(f));
    ok(readFileSync(f).slice(0, 4).toString() === '%PDF', 'Un vrai PDF est produit');
    ok(txt.includes('AHOUANSOU'), 'Les élèves figurent au bilan');
    ok(txt.includes('Bilan annuel'), 'Le document est titré « Bilan annuel »');
    ok(/demi-journ/i.test(txt), 'La règle des demi-journées est rappelée');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v45 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
