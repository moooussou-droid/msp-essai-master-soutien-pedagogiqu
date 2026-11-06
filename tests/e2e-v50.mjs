/**
 * E2E v50 — Le PV et la fiche eleve existent pour CHAQUE evaluation.
 *
 * Le scenario reproduit le geste reel de l'enseignant : saisir la
 * sommative 1, puis la sommative 2, et verifier que la premiere note
 * est toujours la. Avant la v50, elle etait detruite.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const CLASS_ID = 'classe-eval-50';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
await ctx.addInitScript(() => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, code: 'MSP-Catalyste@@007-2026', name: 'MOISE OUSSOU', activatedAt: Date.now(),
  }));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'MOISE OUSSOU', schoolName: 'EPP NIMBO' }));
  const g = localStorage.getItem;
  localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
});
const page = await ctx.newPage();
page.on('dialog', d => d.accept());

await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await page.evaluate(async (id) => {
  const { openDB } = await import('/node_modules/.vite/deps/idb.js').catch(() => import('idb'));
  const db = await openDB('NoteFacileBenin', undefined);
  await db.put('classes', {
    id, name: 'CM2 A', level: 'CM2', educationType: 'primaire', school: 'EPP NIMBO',
    students: [
      { id: 's1', nom: 'AHOUANSOU', prenoms: 'Jean', matricule: '001', createdAt: 1 },
      { id: 's2', nom: 'KOFFI', prenoms: 'Mariam', matricule: '002', createdAt: 2 },
    ],
    subjects: [
      { id: 'sub1', name: 'Français', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1, coefficient: 1 },
      { id: 'sub2', name: 'Calcul', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 2, coefficient: 1 },
    ],
    notes: [], createdAt: Date.now(),
  });
}, CLASS_ID);

console.log('\n1. Fiche élève : un sélecteur d’évaluation');
await page.goto(`${BASE}/#/class/${CLASS_ID}/profiles`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
ok(await page.getByTestId('selecteur-evaluation-fiches').count() > 0, 'le sélecteur d’évaluation est présent');
for (const ev of ['formative1', 'sommative1', 'sommative2', 'sommative3'])
  ok(await page.getByTestId(`eval-fiche-${ev}`).count() > 0, `évaluation « ${ev} » proposée`);

console.log('\n2. Saisie de la SOMMATIVE 1');
await page.getByTestId('eval-sommative1').click().catch(() => {});
await page.getByTestId('eval-fiche-sommative1').click();
await page.waitForTimeout(400);
await page.locator('text=AHOUANSOU').first().click();
await page.waitForTimeout(700);
const inputs1 = page.locator('input[type="number"]');
await inputs1.nth(0).fill('16');
await page.locator('button:has-text("Enregistrer")').first().click();
await page.waitForTimeout(900);
ok(true, 'note 16/18 saisie en sommative 1');

console.log('\n3. Saisie de la SOMMATIVE 2 (le test décisif)');
await page.goBack().catch(() => {});
await page.waitForTimeout(600);
if (await page.getByTestId('selecteur-evaluation-fiches').count() === 0) {
  await page.goto(`${BASE}/#/class/${CLASS_ID}/profiles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (await page.getByTestId('selecteur-evaluation-fiches').count() === 0) {
    await page.locator('header button').first().click();
    await page.waitForTimeout(700);
  }
}
await page.getByTestId('eval-fiche-sommative2').click();
await page.waitForTimeout(400);
await page.locator('text=AHOUANSOU').first().click();
await page.waitForTimeout(700);
const champSomm2 = page.locator('input[type="number"]').nth(0);
ok((await champSomm2.inputValue()) === '', 'la fiche de la sommative 2 s’ouvre VIDE (pas la note de la sommative 1)');
await champSomm2.fill('4');
await page.locator('button:has-text("Enregistrer")').first().click();
await page.waitForTimeout(900);

console.log('\n4. La note de la sommative 1 a-t-elle survécu ?');
const enBase = await page.evaluate(async (id) => {
  const { openDB } = await import('/node_modules/.vite/deps/idb.js').catch(() => import('idb'));
  const db = await openDB('NoteFacileBenin', undefined);
  const c = await db.get('classes', id);
  return c.notes.filter(n => n.studentId === 's1' && n.subjectId === 'sub1')
    .map(n => ({ ev: n.evaluation, note: n.noteObtenue }));
}, CLASS_ID);
console.log('     notes en base :', JSON.stringify(enBase));
ok(enBase.length === 2, `les DEUX notes coexistent en base (${enBase.length} trouvée(s))`);
ok(enBase.some(n => n.ev === 'sommative1' && n.note === 16), 'la note de la sommative 1 (16) est intacte');
ok(enBase.some(n => n.ev === 'sommative2' && n.note === 4), 'la note de la sommative 2 (4) est enregistrée');

console.log('\n5. Retour sur la sommative 1 : la note s’affiche');
await page.goto(`${BASE}/#/class/${CLASS_ID}/profiles`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
// Si la fiche d'un eleve est encore ouverte, revenir a la liste.
if (await page.getByTestId('selecteur-evaluation-fiches').count() === 0) {
  await page.locator('header button').first().click();
  await page.waitForTimeout(700);
}
await page.getByTestId('eval-fiche-sommative1').click();
await page.waitForTimeout(400);
await page.locator('text=AHOUANSOU').first().click();
await page.waitForTimeout(700);
ok((await page.locator('input[type="number"]').nth(0).inputValue()) === '16',
   'la fiche de la sommative 1 réaffiche bien 16');

console.log('\n6. PV de classe : un tableau par évaluation');
await page.goto(`${BASE}/#/class/${CLASS_ID}/table`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
ok(await page.getByTestId('selecteur-evaluation-pv').count() > 0, 'le PV a un sélecteur d’évaluation');
await page.getByTestId('eval-pv-sommative1').click();
await page.waitForTimeout(600);
const pv1 = await page.locator('table').innerText();
ok((await page.getByTestId('pv-classe-evaluation').innerText()).includes('sommative 1'),
   'le PV indique l’évaluation affichée');
await page.getByTestId('eval-pv-sommative2').click();
await page.waitForTimeout(600);
const pv2 = await page.locator('table').innerText();
ok(pv1 !== pv2, 'changer d’évaluation change réellement le contenu du PV');
ok(pv1.includes('16') || pv1.includes('16,00'), 'le PV de la sommative 1 montre la note 16');
ok(pv2.includes('4') && !pv2.includes('16,00'), 'le PV de la sommative 2 montre la note 4');

console.log('\n7. Le PDF du PV reste disponible, par évaluation');
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 25000 }),
  page.getByTestId('btn-pdf-tableau').click(),
]);
ok(dl.suggestedFilename().endsWith('.pdf'), `PDF du PV téléchargé (${dl.suggestedFilename()})`);
// Deux PV differents ne doivent pas porter le meme nom de fichier.
ok(/sommative/i.test(dl.suggestedFilename()),
   `le nom du fichier PDF porte l’évaluation (${dl.suggestedFilename()})`);
ok(await page.getByTestId('btn-imprimer-tableau').count() > 0, 'l’impression reste disponible');

console.log(`\n════════════════════════════════════\nE2E v50 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail ? 1 : 0);
