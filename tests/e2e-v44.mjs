/**
 * E2E v44 — vrais fichiers PDF pour les bulletins et la bibliothèque.
 *
 * Jusqu'à la v43, « Imprimer / PDF » n'ouvrait que la boîte d'impression du
 * navigateur. On vérifie ici que l'application fabrique désormais de VRAIS
 * fichiers .pdf, que leur contenu est juste, et que l'impression reste
 * disponible à côté (règle v41).
 */
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const zlib = require('node:zlib');

const BASE = 'http://localhost:5173';
const CLASS_ID = 'cls-v44';
let pass = 0, fail = 0;
const failures = [];

function ok(cond, label) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; failures.push(label); console.log('  ❌ ' + label); }
}

/** Texte lisible d'un PDF : les flux sont compressés depuis la v41. */
function pdfText(buf) {
  let out = '';
  let i = 0;
  while (true) {
    const s0 = buf.indexOf('stream', i);
    if (s0 < 0) break;
    let a = s0 + 6;
    if (buf[a] === 0x0d) a++;
    if (buf[a] === 0x0a) a++;
    const e0 = buf.indexOf('endstream', a);
    if (e0 < 0) break;
    try { out += zlib.inflateSync(buf.subarray(a, e0)).toString('latin1'); }
    catch { /* flux non compressé */ }
    i = e0 + 9;
  }
  return out;
}

/** Nombre de pages déclarées dans le PDF. */
function pdfPages(buf) {
  const m = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}

const ACTIVATION = {
  activated: true, name: 'KOFFI Jean', code: '111111',
  expiresAt: Date.now() + 31536000000, plan: 'complet',
};

async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript((act) => {
    localStorage.setItem('msp_activation', JSON.stringify(act));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'KOFFI Jean', schoolName: 'EPP Cotonou Centre',
    }));
    localStorage.setItem('msp_install_dismissed', 'true');
    // Les guides plein écran interceptent les clics : on les masque.
    const g = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) =>
      (typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : g(k));
  }, ACTIVATION);
  return ctx;
}

/**
 * Classe de primaire avec des notes réelles.
 * AHOUANSOU : 16+2 = 18/20 · KOFFI : 8+1 = 9/20 (sous la moyenne)
 */
async function seedClass(page) {
  await page.evaluate(async (id) => {
    const { openDB } = await import('/node_modules/idb/build/index.js');
    const db = await openDB('NoteFacileBenin', undefined);
    const cls = {
      id, name: 'CE1 A', school: 'EPP Cotonou Centre', level: 'CE1',
      educationType: 'primaire', schoolYear: '2025 - 2026', sequence: '1er Trim.',
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
    };
    await db.put('classes', cls);
  }, CLASS_ID);
}

const run = async () => {
  const browser = await chromium.launch();
  const dlDir = mkdtempSync(join(tmpdir(), 'msp44-'));

  /* ====== Bloc 1 : PDF d'un bulletin individuel ====== */
  console.log('\n— Bloc 1 : le bulletin d’un élève devient un vrai PDF');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seedClass(page);

    await page.goto(`${BASE}/#/class/${CLASS_ID}/bulletins`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Ouvrir le bulletin du premier élève
    await page.locator('text=AHOUANSOU').last().click();
    await page.waitForTimeout(1200);

    ok(await page.locator('[data-testid="btn-imprimer-bulletin"]').count() === 1,
       'L’option d’impression est conservée');
    ok(await page.locator('[data-testid="btn-pdf-bulletin"]').count() === 1,
       'Un bouton de téléchargement PDF est proposé');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-pdf-bulletin"]').click(),
    ]);
    const p1 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p1);
    const buf = readFileSync(p1);

    ok(buf.slice(0, 4).toString() === '%PDF', 'Le fichier est un vrai PDF');
    ok(dl.suggestedFilename().endsWith('.pdf'),
       `Le fichier porte l’extension .pdf (${dl.suggestedFilename()})`);
    ok(buf.length > 2000, `Le PDF a un contenu réel (${buf.length} octets)`);

    const txt = pdfText(buf);
    ok(txt.includes('AHOUANSOU'), 'Le PDF nomme bien l’élève');
    ok(txt.includes('Dict') && txt.includes('Calcul'), 'Les matières figurent dans le PDF');
    ok(txt.includes('18,00'), 'La moyenne calculée (18,00) figure dans le PDF');
    ok(txt.includes('Bulletin scolaire'), 'Le document est titré « Bulletin scolaire »');
    ok(txt.includes('Master Soutien'), 'Le bulletin porte la signature de l’application');
    ok(txt.includes('001'), 'Le matricule de l’élève est repris');

    await ctx.close();
  }

  /* ====== Bloc 2 : alerte sur une moyenne insuffisante ====== */
  console.log('\n— Bloc 2 : une moyenne sous 10 est signalée');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seedClass(page);

    await page.goto(`${BASE}/#/class/${CLASS_ID}/bulletins`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // v47 : le bandeau de licence affiche le nom du titulaire du code
    // (« KOFFI Jean » dans ce jeu d'essai) et precede la liste dans le DOM.
    // On restreint la recherche au contenu, hors bandeau, pour viser l'eleve.
    await page.locator('main, [role="main"], body')
      .locator('text=KOFFI')
      .filter({ hasNot: page.locator('[data-testid="bandeau-licence"]') })
      .last().click();
    await page.waitForTimeout(1200);

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-pdf-bulletin"]').click(),
    ]);
    const p2 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p2);
    const txt = pdfText(readFileSync(p2));

    ok(txt.includes('9,00'), 'La moyenne de 9,00 est correctement calculée');
    ok(/accompagnement/i.test(txt),
       'Le PDF signale qu’un accompagnement est recommandé');
    ok(txt.includes('Mariam'), 'Le message nomme l’élève concernée');

    await ctx.close();
  }

  /* ====== Bloc 3 : PDF de toute la classe ====== */
  console.log('\n— Bloc 3 : tous les bulletins dans un seul fichier');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seedClass(page);

    await page.goto(`${BASE}/#/class/${CLASS_ID}/bulletins`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    ok(await page.locator('[data-testid="btn-pdf-bulletins"]').count() === 1,
       'L’export PDF de toute la classe est proposé');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-pdf-bulletins"]').click(),
    ]);
    const p3 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p3);
    const buf = readFileSync(p3);
    const txt = pdfText(buf);

    ok(buf.slice(0, 4).toString() === '%PDF', 'Le fichier de classe est un vrai PDF');
    ok(txt.includes('AHOUANSOU') && txt.includes('KOFFI'),
       'Les deux élèves figurent dans le même fichier');
    ok(pdfPages(buf) >= 2, `Chaque élève a sa page (${pdfPages(buf)} pages)`);

    await ctx.close();
  }

  /* ====== Bloc 4 : récapitulatif de la classe ====== */
  console.log('\n— Bloc 4 : récapitulatif et statistiques');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await seedClass(page);

    await page.goto(`${BASE}/#/class/${CLASS_ID}/bulletins`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-pdf-recap"]').click(),
    ]);
    const p4 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p4);
    const txt = pdfText(readFileSync(p4));

    ok(txt.includes('capitulatif') || txt.includes('RECAPITULATIF') || txt.includes('Recapitulatif'),
       'Le document est un récapitulatif');
    ok(txt.includes('AHOUANSOU') && txt.includes('KOFFI'),
       'Tous les élèves sont listés');
    // Moyenne de classe : (18 + 9) / 2 = 13,50
    ok(txt.includes('13,50'), 'La moyenne de la classe (13,50) est exacte');
    ok(txt.includes('18,00'), 'La plus forte moyenne est indiquée');
    ok(txt.includes('9,00'), 'La plus faible moyenne est indiquée');
    ok(/50 %/.test(txt), 'Le taux de moyennes ≥ 10 (50 %) est calculé');

    await ctx.close();
  }

  /* ====== Bloc 5 : bibliothèque — PDF d'un livre payé ====== */
  console.log('\n— Bloc 5 : bibliothèque, PDF après paiement');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());

    // Un livre payant, saisi en texte (sans fichier PDF joint)
    await page.addInitScript(() => {
      localStorage.setItem('msp_library_books', JSON.stringify([{
        id: 'liv-1', title: 'Contes du Benin', author: 'AGBO Paul',
        level: 'CM2', category: 'Lecture',
        description: 'Recueil de contes traditionnels.',
        excerpt: 'Il etait une fois, au bord du lac Nokoue...',
        content: 'Il etait une fois, au bord du lac Nokoue, un pecheur nomme Kossi.\n\n'
          + 'Chaque matin, il partait avant le lever du soleil.\n\n'
          + 'Un jour, il ramena dans ses filets une pierre brillante.',
        type: 'payant', price: '500', createdAt: 1,
      }]));
    });

    await page.goto(BASE + '/#/bibliotheque', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    await page.locator('button:has-text("extrait"), button:has-text("Lire")').first().click();
    await page.waitForTimeout(1200);

    ok(await page.locator('[data-testid="btn-pdf-livre"]').count() === 0,
       'Aucun téléchargement PDF avant paiement');

    // Déverrouillage accordé par le Super Administrateur (mécanisme v38).
    await page.evaluate(() => {
      localStorage.setItem('msp_content_unlocks', JSON.stringify({
        'liv-1': {
          contentId: 'liv-1', kind: 'livre', title: 'Contes du Benin',
          unlockedAt: Date.now(), via: 'admin',
        },
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.locator('button:has-text("extrait"), button:has-text("Lire")').first().click();
    await page.waitForTimeout(1200);

    ok(await page.locator('[data-testid="btn-pdf-livre"]').count() === 1,
       'Le téléchargement PDF apparaît après déverrouillage');
    ok(await page.locator('[data-testid="btn-imprimer-livre"]').count() === 1,
       'L’impression est proposée à côté du PDF');

    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-pdf-livre"]').click(),
    ]);
    const p5 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p5);
    const buf = readFileSync(p5);
    const txt = pdfText(buf);

    ok(buf.slice(0, 4).toString() === '%PDF', 'Le livre est exporté en vrai PDF');
    ok(txt.includes('Contes du Benin'), 'Le titre du livre figure dans le PDF');
    ok(txt.includes('Kossi'), 'Le contenu intégral est présent');
    ok(txt.includes('Master Soutien'), 'Le livre porte la signature de l’application');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v44 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
