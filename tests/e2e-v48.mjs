/**
 * E2E v48 — parcours reel ENSEIGNANT -> PARENT.
 *
 * Le point cle : l'enseignant et le parent sont simules par DEUX
 * CONTEXTES DE NAVIGATEUR SEPARES (deux telephones distincts, stockages
 * cloisonnes). Le seul lien entre eux est le fichier chiffre + le code.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const BASE = 'http://localhost:5173';
const CLASS_ID = 'classe-parents-48';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };

async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, code: 'MSP-Catalyste@@007-2026', name: 'MOISE OUSSOU', activatedAt: Date.now(),
      // v53 : la generation des dossiers parents releve du plan Pro.
      expiresAt: Date.now() + 3e10, plan: 'pro',
    }));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'MOISE OUSSOU', schoolName: 'EPP NIMBO',
    }));
    const g = localStorage.getItem;
    localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
  });
  return ctx;
}

async function seed(page) {
  await page.evaluate(async (id) => {
    const { openDB } = await import('/node_modules/.vite/deps/idb.js').catch(() => import('idb'));
    const db = await openDB('NoteFacileBenin', undefined);
    const students = [
      { id: 's1', nom: 'AHOUANSOU', prenoms: 'Jean', matricule: '001', createdAt: 1 },
      { id: 's2', nom: 'KOFFI', prenoms: 'Mariam', matricule: '002', createdAt: 2 },
      { id: 's3', nom: 'DOSSOU', prenoms: 'Paul', matricule: '003', createdAt: 3 },
      { id: 's4', nom: 'GBAGUIDI', prenoms: 'Rita', matricule: '004', createdAt: 4 },
      { id: 's5', nom: 'ZINSOU', prenoms: 'Ali', matricule: '005', createdAt: 5 },
      { id: 's6', nom: 'TOSSOU', prenoms: 'Eve', matricule: '006', createdAt: 6 },
    ];
    const subjects = [
      { id: 'sub1', name: 'Français', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 },
      { id: 'sub2', name: 'Calcul', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 2 },
    ];
    const notes = [];
    students.forEach((s, i) => subjects.forEach((sub) => notes.push({
      studentId: s.id, subjectId: sub.id, evaluation: 'formative1',
      noteObtenue: 8 + i, notePerfectionnement: 1,
    })));
    await db.put('classes', {
      id, name: 'CM2 A', level: 'CM2', students, subjects, notes, createdAt: Date.now(),
    });
    localStorage.setItem('msp_attendance_records', JSON.stringify([
      { id: 'a1', classId: id, date: '2026-09-15', entries: [
        { studentId: 's1', status: 'absent_justifiee', half: 'matin', motif: 'Maladie' },
        { studentId: 's2', status: 'absent_injustifiee', half: 'matin' },
      ] },
      { id: 'a2', classId: id, date: '2026-09-16', entries: [
        { studentId: 's1', status: 'absent_injustifiee', half: 'apresmidi' },
      ] },
    ]));
  }, CLASS_ID);
}

const browser = await chromium.launch();
const dlDir = mkdtempSync(join(tmpdir(), 'msp48-'));

/* ===== TÉLÉPHONE 1 : L'ENSEIGNANT ===== */
console.log('\n— Téléphone de l’ENSEIGNANT');
const ctxT = await newCtx(browser);
const teacher = await ctxT.newPage();
teacher.on('dialog', (d) => d.accept());
await teacher.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
await teacher.waitForTimeout(1500);
await seed(teacher);

await teacher.goto(BASE + '/#/suivi-enfant/codes', { waitUntil: 'networkidle' });
await teacher.waitForTimeout(800);
ok(await teacher.getByTestId('select-classe-parent').count() > 0, 'écran de remise du dossier accessible');

await teacher.getByTestId('select-classe-parent').selectOption(CLASS_ID);
await teacher.waitForTimeout(400);
await teacher.getByTestId('select-eleve-parent').selectOption('s1');
await teacher.getByTestId('champ-message-parent').fill('Jean progresse en calcul, merci de faire réviser les tables.');
await teacher.getByTestId('btn-generer-code').click();
await teacher.waitForTimeout(500);

const code = (await teacher.getByTestId('code-rattachement').innerText()).trim();
ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), `code de rattachement généré (${code})`);
ok(await teacher.getByTestId('journal-rattachements').innerText().then(t => t.includes('AHOUANSOU')),
   'le rattachement est inscrit au journal de l’école');

const [dl] = await Promise.all([
  teacher.waitForEvent('download', { timeout: 20000 }),
  teacher.getByTestId('btn-creer-dossier').click(),
]);
const filePath = join(dlDir, dl.suggestedFilename());
await dl.saveAs(filePath);
ok(dl.suggestedFilename().endsWith('.msp'), `dossier chiffré créé (${dl.suggestedFilename()})`);

const raw = readFileSync(filePath, 'utf8');
const up = raw.toUpperCase();
ok(up.includes('MSP-DOSSIER-ENFANT'), 'le fichier est une enveloppe MSP');
ok(!up.includes('AHOUANSOU'), 'le fichier ne contient AUCUN nom en clair');
ok(!up.includes(code.replace(/-/g, '')), 'le fichier ne contient pas le code en clair');
for (const autre of ['KOFFI', 'MARIAM', 'DOSSOU', 'GBAGUIDI', 'ZINSOU', 'TOSSOU']) {
  ok(!up.includes(autre), `le fichier ne contient aucune trace de ${autre}`);
}
await ctxT.close();

/* ===== TÉLÉPHONE 2 : LE PARENT ===== */
console.log('\n— Téléphone du PARENT (stockage séparé)');
const ctxP = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
await ctxP.addInitScript(() => {
  const g = localStorage.getItem;
  localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
});
const parent = await ctxP.newPage();
parent.on('dialog', (d) => d.accept());
await parent.goto(BASE + '/#/suivi-enfant', { waitUntil: 'networkidle' });
await parent.waitForTimeout(800);

ok(await parent.getByTestId('ecran-consentement').count() > 0,
   'le consentement est demandé AVANT tout accès');
ok(await parent.getByTestId('btn-choisir-fichier').count() === 0,
   'aucun dossier n’est ouvrable sans consentement');
await parent.getByTestId('btn-donner-consentement').click();
await parent.waitForTimeout(500);
ok(await parent.getByTestId('btn-choisir-fichier').count() > 0, 'espace parent accessible après accord');

// Mauvais code d'abord
await parent.getByTestId('input-dossier').setInputFiles(filePath);
await parent.waitForTimeout(400);
await parent.getByTestId('champ-code-parent').fill('ZZZZ-9999-YYYY');
await parent.getByTestId('btn-ouvrir-dossier').click();
await parent.waitForTimeout(900);
ok(await parent.getByTestId('erreur-parent').count() > 0, 'un mauvais code est refusé');
ok(await parent.getByTestId('bloc-notes').count() === 0, 'aucune donnée affichée avec un mauvais code');

// Bon code, saisi en minuscules et avec des espaces
await parent.getByTestId('input-dossier').setInputFiles(filePath);
await parent.waitForTimeout(400);
await parent.getByTestId('champ-code-parent').fill(code.toLowerCase().replace(/-/g, ' '));
await parent.getByTestId('btn-ouvrir-dossier').click();
await parent.waitForTimeout(1200);

ok(await parent.getByTestId('bloc-notes').count() > 0, 'le bon code ouvre le dossier (même mal saisi)');
const page = await parent.locator('body').innerText();
ok(page.includes('AHOUANSOU') || page.includes('Jean'), 'le dossier affiche bien l’enfant');
for (const autre of ['KOFFI', 'Mariam', 'DOSSOU', 'GBAGUIDI', 'ZINSOU', 'TOSSOU']) {
  ok(!page.includes(autre), `l’écran parent n’affiche jamais ${autre}`);
}
ok(!/rang|classement/i.test(page), 'aucun rang ni classement affiché');

ok(await parent.getByTestId('total-absences').innerText() === '2', '2 demi-journées manquées');
const lecture = await parent.getByTestId('lecture-claire-0').innerText();
ok(lecture.length > 20, `explication en langage clair présente ("${lecture.slice(0, 60)}…")`);
ok(await parent.getByTestId('bloc-message').count() > 0, 'le mot de l’enseignant est transmis');
ok(await parent.getByTestId('date-dossier').innerText().then(t => /établi le/.test(t)),
   'la date du dossier est affichée (pas de faux « temps réel »)');

// PDF parent
const [dlp] = await Promise.all([
  parent.waitForEvent('download', { timeout: 20000 }),
  parent.getByTestId('btn-pdf-parent').click(),
]);
const pp = join(dlDir, dlp.suggestedFilename());
await dlp.saveAs(pp);
ok(readFileSync(pp).slice(0, 4).toString() === '%PDF', 'le parent peut enregistrer un vrai PDF');

// Persistance hors ligne
await parent.reload({ waitUntil: 'networkidle' });
await parent.waitForTimeout(900);
ok(await parent.getByTestId('bloc-notes').count() > 0, 'le dossier reste consultable après rechargement');

// Droit à l'effacement
await parent.getByTestId('btn-retirer-consentement').click();
await parent.waitForTimeout(900);
ok(await parent.getByTestId('ecran-consentement').count() > 0, 'le retrait du consentement ramène à l’écran d’accord');
const after = await parent.evaluate(() => localStorage.getItem('msp_parent_dossiers'));
ok(!after || after === '[]', 'tous les dossiers sont effacés du téléphone');

console.log(`\n════════════════════════════════════\nE2E v48 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail ? 1 : 0);
