/**
 * E2E (vrai navigateur Chromium headless) — validations de bout en bout v32 :
 *   1. Présences : ouverture, appel complet, statuts, PV, persistance.
 *   2. Tableau des notes : affichage réel.
 *   3. « Autres évaluations » : création UI, saisie de note, persistance après rechargement, bulletins.
 *
 * Prérequis : serveur Vite sur localhost:5173 (npm run dev).
 * Lancement : node tests/e2e.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const CLASS_ID = 'CLS-TEST-E2E-001';
const S1 = 'STU-E2E-1';
const S2 = 'STU-E2E-2';

let pass = 0, fail = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; failures.push(label); console.log(`  ❌ ${label}`); }
}

const browser = await chromium.launch();
const page = await browser.newPage();
const runtimeErrors = [];
page.on('pageerror', (e) => runtimeErrors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') runtimeErrors.push('console: ' + m.text()); });

await page.addInitScript(({ CLASS_ID, S1, S2 }) => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, name: 'KOFFI Jean', code: '111111', activatedAt: Date.now(),
    expiresAt: Date.now() + 365 * 86400000, plan: 'complet',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean', schoolName: 'EPP Test' }));
  // Neutralise les « Guides rapides » modaux qui intercepteraient les clics.
  const origGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) =>
    typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : origGetItem(k);
  const req = indexedDB.open('NoteFacileBenin', 1);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains('classes')) {
      req.result.createObjectStore('classes', { keyPath: 'id' });
    }
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('classes', 'readwrite');
    const store = tx.objectStore('classes');
    const get = store.get(CLASS_ID);
    get.onsuccess = () => {
      if (get.result) return;
      const now = Date.now();
      store.put({
        id: CLASS_ID, name: 'CM2 A', level: 'CM2', educationType: 'primaire',
        sequence: 'Trimestre 1', evaluationType: 'Évaluation continue',
        schoolYear: '2026-2027', school: 'EPP Test', createdAt: now, updatedAt: now,
        students: [
          { id: S1, matricule: '001', nom: 'AHOUANSOU', prenoms: 'Jean', sexe: 'M', dateNaissance: '2015-03-01', createdAt: now },
          { id: S2, matricule: '002', nom: 'KOFFI', prenoms: 'Awa', sexe: 'F', dateNaissance: '2015-07-15', createdAt: now },
        ],
        subjects: [
          { id: 'SBJ-FR', name: 'Dictée', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 0 },
          { id: 'SBJ-MATH', name: 'Mathématiques', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 },
        ],
        notes: [
          { id: 'N1', studentId: S1, subjectId: 'SBJ-FR', noteObtenue: 15, notePerfectionnement: 1.5, evaluation: 'formative1', updatedAt: now },
        ],
        customEvaluations: [], customFields: {},
      });
    };
  };
}, { CLASS_ID, S1, S2 });

async function gotoHash(hash, waitText, timeout = 15000) {
  await page.goto(BASE + '/' + hash, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`text=${waitText}`, { timeout });
}

/* ═══════ 1) PRÉSENCES ═══════ */
console.log('\n═══ E2E 1. Présences / absences — parcours réel ═══');
await gotoHash('#/class/' + CLASS_ID + '/presences', 'Registre de Présence');
ok(true, 'L\'écran Présences s\'ouvre sans erreur');
ok(await page.locator('text=AHOUANSOU').count() > 0 && await page.locator('text=KOFFI').count() > 0, 'Les 2 élèves sont listés');

// v36 : pas de classe le week-end. On se place sur un JEUDI de classe.
await page.locator('input[type="date"]').fill('2026-09-10');
await page.waitForTimeout(600);
ok(await page.locator('button', { hasText: 'Matin' }).count() > 0
   && await page.locator('button', { hasText: 'Après-midi' }).count() > 0,
   'Présences : les demi-journées matin et après-midi sont proposées');

// On teste aussi le MERCREDI : une seule demi-journée.
await page.locator('input[type="date"]').fill('2026-09-09');
await page.waitForTimeout(600);
ok(await page.locator("text=Le mercredi ne comporte qu'une seule demi-journée").count() > 0,
   'Présences : le mercredi ne compte qu\'une demi-journée');

// Et le SAMEDI : appel indisponible.
await page.locator('input[type="date"]').fill('2026-09-12');
await page.waitForTimeout(600);
ok((await page.textContent('body')).includes('pas de classe'),
   'Présences : samedi et dimanche, pas de classe');

await page.locator('input[type="date"]').fill('2026-09-10');
await page.waitForTimeout(600);

// « Tout le monde présent » → le bug v31 n'enregistrait qu'UN élève
const studentCard = (nom) => page.locator('div.rounded-xl.shadow.p-3', { hasText: nom });
await page.locator('button', { hasText: 'Tout le monde présent' }).click();
await page.waitForTimeout(700);
const presentNow = await studentCard('AHOUANSOU').getByText('Présent', { exact: true }).count()
  + await studentCard('KOFFI').getByText('Présent', { exact: true }).count();
ok(presentNow >= 2, `« Tout le monde présent » marque les 2 élèves (${presentNow} statuts « Présent »)`);

// v36 : nouveaux statuts. « Journée fériée » pour AHOUANSOU.
await studentCard('AHOUANSOU').locator('button', { hasText: 'Journée fériée' }).first().click();
await page.waitForTimeout(500);
ok((await studentCard('AHOUANSOU').textContent()).includes('Journée fériée'),
   'Nouveau statut « Journée fériée » disponible et appliqué');

// « Demi-journée de séance » pour AHOUANSOU.
await studentCard('AHOUANSOU').locator('button', { hasText: 'Demi-journée de séance' }).first().click();
await page.waitForTimeout(500);
ok((await studentCard('AHOUANSOU').textContent()).includes('Demi-journée de séance'),
   'Nouveau statut « Demi-journée de séance » disponible et appliqué');

// Motif d'absence : KOFFI → Absence sans justification + motif
await studentCard('KOFFI').locator('button', { hasText: 'Absence sans justification' }).first().click();
await page.waitForTimeout(400);
const motif = studentCard('KOFFI').locator('input[placeholder*="Motif"]');
if (await motif.count() > 0) { await motif.fill('Rendez-vous médical'); await page.waitForTimeout(300); }
ok((await studentCard('KOFFI').textContent()).includes('Absence sans justification'),
   'KOFFI passe en « Absence sans justification » avec champ motif');

// Rechargement → persistance réelle
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Registre de Présence');
await page.waitForTimeout(600);
await page.locator('input[type="date"]').fill('2026-09-10');
await page.waitForTimeout(700);
const persisted = ((await studentCard('AHOUANSOU').textContent()).includes('Demi-journée de séance') ? 1 : 0)
  + ((await studentCard('KOFFI').textContent()).includes('Absence sans justification') ? 1 : 0);
ok(persisted >= 2, 'L\'appel est conservé après rechargement (persistance IndexedDB réelle)');

// PV mensuel (rapport toujours visible sous l'appel)
await page.locator('text=PV mensuel').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
ok(await page.locator('h2', { hasText: 'PV mensuel' }).count() > 0, 'PV mensuel : le rapport est affiché');
ok(await page.locator('text=AHOUANSOU').count() > 0, 'PV : les élèves apparaissent dans le rapport');

/* ═══════ 2) TABLEAU DES NOTES ═══════ */
console.log('\n═══ E2E 2. Tableau des notes (écran vide en v31) ═══');
await gotoHash('#/class/' + CLASS_ID + '/table', 'Vue tableau');
ok(await page.locator('text=AHOUANSOU').count() > 0 && await page.locator('text=Dictée').count() > 0, 'Tableau : élèves et matières affichés');
ok(await page.locator('table').count() > 0, 'Tableau : le tableau des notes est rendu');

/* ═══════ 3) AUTRES ÉVALUATIONS ═══════ */
console.log('\n═══ E2E 3. « Autres évaluations » — création + saisie + persistance ═══');
await gotoHash('#/class/' + CLASS_ID + '/entry', 'Saisie des notes');
ok(await page.locator('button', { hasText: 'Autres évaluations' }).count() > 0, 'Bouton « ➕ Autres évaluations » affiché à côté des 4 évaluations');
await page.locator('button', { hasText: 'Autres évaluations' }).click();
await page.waitForSelector('text=Créer une « Autre évaluation »');
await page.locator('input[placeholder*="Projet de classe"]').fill('Projet de classe');
await page.locator('button', { hasText: /Cr[ée]er l.[eé]valuation/ }).first().click();
await page.waitForTimeout(600);
ok(await page.locator('button', { hasText: 'Projet de classe' }).count() > 0, 'La nouvelle évaluation apparaît comme chip « ✨ Projet de classe » à côté des 4');

// Saisir une note dans cette évaluation : cliquer la matière « Dictée »
await page.locator('button', { hasText: 'Dictée' }).first().click();
await page.waitForTimeout(700);
// Mode saisie rapide (F2) : le clavier tactile suffit ; on tape la note au clavier
await page.keyboard.press('F2');
await page.waitForTimeout(300);
await page.keyboard.type('14.5');
await page.waitForTimeout(250);
ok(await page.locator('text=14.5').count() > 0, 'Saisie : la note « 14.5 » s\'affiche (clavier tactile/saisie rapide)');
await page.keyboard.press('Tab');      // → champ perfectionnement
await page.keyboard.type('1');
await page.keyboard.press('Enter');    // sauvegarde + élève suivant
await page.waitForTimeout(800);

// Vérification de la persistance RÉELLE dans IndexedDB
const saved = await page.evaluate(({ CLASS_ID }) => new Promise((resolve) => {
  const req = indexedDB.open('NoteFacileBenin', 1);
  req.onsuccess = () => {
    const tx = req.result.transaction('classes', 'readonly');
    const get = tx.objectStore('classes').get(CLASS_ID);
    get.onsuccess = () => {
      const cls = get.result || {};
      const notes = (cls.notes || []).filter(n => n.studentId === 'STU-E2E-1' && Number(n.noteObtenue) === 14.5);
      resolve({ noteCount: notes.length, noteEval: notes[0]?.evaluation, customCount: (cls.customEvaluations || []).length });
    };
  };
}), { CLASS_ID });
ok(saved.noteCount >= 1, `La note 14.5 est enregistrée dans la classe (IndexedDB) — évaluation « ${saved.noteEval} »`);
ok(saved.customCount >= 1, `L'évaluation personnalisée est bien enregistrée (${saved.customCount})`);
ok(saved.noteEval && String(saved.noteEval).indexOf('custom-') === 0, 'La note est rattachée à l\'« Autre évaluation » (et non aux 4 officielles)');

// Rechargement : l'évaluation persiste
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Saisie des notes');
await page.waitForTimeout(400);
const chipAfterReload = await page.locator('button', { hasText: 'Projet de classe' }).count();
ok(chipAfterReload > 0, 'Après rechargement, l\'évaluation « Projet de classe » existe toujours (persistance)');

// Bulletins : l'évaluation personnalisée proposée
await gotoHash('#/class/' + CLASS_ID + '/bulletins', 'Bulletins');
await page.waitForTimeout(400);
ok(await page.locator('text=Projet de classe').count() > 0, 'Bulletins : « Projet de classe » proposé dans les évaluations');

/* ═══════ 4) IMPORT EXCEL → « Autre évaluation » (feuille non reconnue) ═══════ */
console.log('\n═══ E2E 4. Import Excel : feuille non reconnue rattachée à une « Autre évaluation » ═══');
{
  // Génère un fichier .xlsx avec une feuille « Devoir maison » (non reconnue par EducMaster)
  // au format du modèle officiel (Matricule/Nom/Prénoms + matières Obt/Perf).
  const ExcelJS = (await import('exceljs')).default;
  const os = (await import('os')).default;
  const pathMod = (await import('path')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Devoir maison');
  ws.mergeCells('A1:A2'); ws.mergeCells('B1:B2'); ws.mergeCells('C1:C2'); ws.mergeCells('D1:E1');
  ws.getCell('A1').value = 'Matricule';
  ws.getCell('B1').value = 'Nom';
  ws.getCell('C1').value = 'Prénoms';
  ws.getCell('D1').value = 'Dictée';
  ws.getCell('D2').value = 'Note obtenue';
  ws.getCell('E2').value = 'Note perf.';
  ws.getCell('A3').value = '001';
  ws.getCell('B3').value = 'AHOUANSOU';
  ws.getCell('C3').value = 'Jean';
  ws.getCell('D3').value = 13;
  ws.getCell('E3').value = 1.2;
  ws.getCell('A4').value = '002';
  ws.getCell('B4').value = 'KOFFI';
  ws.getCell('C4').value = 'Awa';
  ws.getCell('D4').value = 11;
  ws.getCell('E4').value = 0.8;
  const fixture = pathMod.join(os.tmpdir(), 'devoir-maison-v32.xlsx');
  await wb.xlsx.writeFile(fixture);

  await gotoHash('#/class/' + CLASS_ID + '/students', 'Importer les élèves depuis Excel');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button', { hasText: 'Importer les élèves depuis Excel' }).click(),
  ]);
  await chooser.setFiles(fixture);
  await page.waitForSelector('text=Aperçu de l\'import', { timeout: 15000 });
  await page.waitForTimeout(800);

  ok(await page.locator('text=Autres évaluations (feuilles non reconnues)').count() > 0,
    'Aperçu : le bloc « ➕ Autres évaluations (feuilles non reconnues) » apparaît');
  const customSel = page.locator('select').first();
  ok((await customSel.locator('option').allTextContents()).some((t) => t.includes('Projet de classe')),
    'Aperçu : l\'évaluation « Projet de classe » est proposée dans le sélecteur');
  await customSel.selectOption({ label: '✨ Projet de classe' });
  await page.waitForTimeout(300);
  ok(await page.locator('text=seront rattachées à « Projet de classe »').count() > 0,
    'Aperçu : le rattachement à « Projet de classe » est affiché');

  await page.locator('button', { hasText: /^Importer$/ }).click();
  await page.waitForTimeout(1200);

  const imported = await page.evaluate(({ CLASS_ID }) => new Promise((resolve) => {
    const req = indexedDB.open('NoteFacileBenin', 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('classes', 'readonly');
      const get = tx.objectStore('classes').get(CLASS_ID);
      get.onsuccess = () => {
        const cls = get.result || {};
        const notes = (cls.notes || []).filter(n => {
          const ev = String(n.evaluation || '');
          return ev.indexOf('custom-') === 0 && Number(n.noteObtenue) === 13;
        });
        resolve({ count: notes.length, evalId: notes[0]?.evaluation, customs: (cls.customEvaluations || []).map(c => c.id) });
      };
    };
  }), { CLASS_ID });
  ok(imported.count >= 1, `La note 13 de la feuille « Devoir maison » est importée et rattachée (${imported.count} note(s))`);
  ok(imported.evalId && imported.customs.includes(imported.evalId),
    'La note importée porte bien l\'id de l\'« Autre évaluation » (même évaluation que « Projet de classe »)');
}

/* ═══════ erreurs JS ═══════ */
const jsErrors = runtimeErrors.filter(e => !/favicon/i.test(e));
ok(jsErrors.length === 0, 'Aucune erreur JavaScript (console/page) pendant tout le parcours' + (jsErrors[0] ? ` — ${jsErrors[0]}` : ''));

console.log('\n════════════════════════════════════');
console.log(`E2E : ${pass} réussis, ${fail} échoués`);
if (jsErrors.length) console.log('Erreurs JS:\n  ' + jsErrors.join('\n  '));
if (failures.length) console.log('Échecs:\n  - ' + failures.join('\n  - '));
await browser.close();
process.exit(fail > 0 || jsErrors.length > 0 ? 1 : 0);
