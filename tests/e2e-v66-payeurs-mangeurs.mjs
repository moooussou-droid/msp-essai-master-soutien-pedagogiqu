/**
 * E2E v66 — Cantine : relevé des effectifs payeurs-mangeurs.
 *
 * Règles vérifiées :
 *  - payeur-mangeur : mangeurs = présents ayant payé ;
 *  - apport communautaire : mangeurs = tous les présents ;
 *  - le relevé alimente le simulateur et le cahier des menus.
 *
 * Lancer avec le serveur de dev actif : npm run dev (port 5173)
 * puis : node tests/e2e-v66-payeurs-mangeurs.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const failures = [];
const ok = (condition, label) => {
  if (condition) { pass++; console.log('  ✅ ' + label); }
  else { fail++; failures.push(label); console.log('  ❌ ' + label); }
};
const bodyText = async (page) => page.locator('body').innerText();
const today = new Date().toISOString().slice(0, 10);

const browser = await chromium.launch();

async function newPage({ hideGuides = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
  await ctx.addInitScript((hide) => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, code: '112342', name: 'HOUNSOU Marie',
      activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: 'complet',
    }));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'HOUNSOU Marie', schoolName: 'EPP Cotonou Centre',
    }));
    localStorage.setItem('msp_install_dismissed', 'true');
    if (hide) {
      const get = localStorage.getItem.bind(localStorage);
      localStorage.getItem = (k) => (
        typeof k === 'string' && k.startsWith('msp_guide_hidden_') ? 'true' : get(k)
      );
    }
  }, hideGuides);
  const page = await ctx.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  return { ctx, page };
}

const readSurveys = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('msp_canteen_payer_eaters') || '[]'));

console.log('\n1. Payeur-mangeur : relevé, totaux, PDF et simulateur');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.evaluate((date) => {
    localStorage.setItem('msp_canteen_enrollment', JSON.stringify([{
      id: 'general-v66', date, schoolName: 'EPP Cotonou Centre', schoolYear: '2026-2027',
      counts: [
        { level: 'ci', boys: 30, girls: 30 },
        { level: 'cm2', boys: 20, girls: 20 },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    }]));
  }, today);

  await page.goto(BASE + '/#/cantine/payeurs-mangeurs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  ok(await page.getByTestId('grille-payeurs-mangeurs').count() > 0, 'la grille payeurs-mangeurs s’affiche');
  ok((await page.getByTestId('ligne-payeurs-ci').innerText()).includes('Inscrits : 30 G / 30 F'),
    'les inscrits du relevé général sont repris comme repère');

  await page.getByTestId('systeme-payeur-mangeur').click();
  await page.getByTestId('presents-garcons-ci').fill('25');
  await page.getByTestId('presents-filles-ci').fill('20');
  await page.getByTestId('payeurs-garcons-ci').fill('18');
  await page.getByTestId('payeurs-filles-ci').fill('15');
  await page.getByTestId('presents-garcons-cm2').fill('10');
  await page.getByTestId('presents-filles-cm2').fill('12');
  await page.getByTestId('payeurs-garcons-cm2').fill('7');
  await page.getByTestId('payeurs-filles-cm2').fill('9');
  await page.waitForTimeout(300);

  ok(await page.getByTestId('mangeurs-ci').innerText() === '33', 'CI : 33 payeurs présents = 33 mangeurs');
  ok(await page.getByTestId('total-presents-payeurs').innerText() === '67', 'total présents = 67');
  ok(await page.getByTestId('total-payeurs-presents').innerText() === '49', 'total payeurs présents = 49');
  ok(await page.getByTestId('total-mangeurs').innerText() === '49', 'total mangeurs = 49, pas 67');
  ok(await page.getByTestId('total-presents-non-mangeurs').innerText() === '18', 'présents non mangeurs = 18');
  ok((await page.getByTestId('taux-presence').innerText()).includes('67'), 'taux de présence = 67 %');

  await page.getByTestId('btn-enregistrer-payeurs').click();
  await page.waitForTimeout(500);
  ok(await page.getByTestId('message-payeurs-mangeurs').count() > 0, 'le relevé payeurs-mangeurs s’enregistre');
  let surveys = await readSurveys(page);
  ok(surveys.length === 1 && surveys[0].system === 'payeur-mangeur', 'le système payeur-mangeur est enregistré');

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.getByTestId('btn-pdf-payeurs').click();
  const download = await downloadPromise;
  ok(!!download && /\.pdf$/.test(download.suggestedFilename()), `PDF payeurs-mangeurs généré (${download?.suggestedFilename()})`);

  await page.getByTestId('btn-mangeurs-simulateur').click();
  await page.waitForTimeout(1200);
  ok(page.url().includes('/cantine/simulateur'), 'navigation vers le simulateur');
  ok(await page.getByTestId('champ-effectif').inputValue() === '49', 'le simulateur reçoit 49 mangeurs');
  ok((await page.getByTestId('effectif-propose').innerText()).includes('payeurs-mangeurs'),
    'le simulateur identifie la source payeurs-mangeurs');

  await page.getByTestId('champ-debut').fill(today);
  await page.getByTestId('champ-jours').selectOption('1');
  await page.waitForTimeout(250);
  await page.getByTestId('champ-mais').selectOption('0');
  await page.getByTestId('champ-legumineuse').selectOption('haricot');
  await page.getByTestId('btn-creer-semaine').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Saisir les prélèvements du jour/ }).click();
  await page.waitForTimeout(500);
  await page.getByTestId('reprendre-mangeurs-jour-1').click();
  await page.waitForTimeout(500);
  ok(await page.getByTestId('effectif-jour-1').inputValue() === '49',
    'prélèvement du jour : les 49 mangeurs du relevé sont repris');
  surveys = await readSurveys(page);
  ok(surveys.length === 1, 'le passage au simulateur ne duplique pas le relevé');
  await ctx.close();
}

console.log('\n2. Contrôle d’incohérence puis apport communautaire');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/cantine/payeurs-mangeurs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);

  await page.getByTestId('systeme-payeur-mangeur').click();
  await page.getByTestId('presents-garcons-ci').fill('5');
  await page.getByTestId('payeurs-garcons-ci').fill('9');
  await page.waitForTimeout(300);
  ok(await page.getByTestId('alertes-payeurs-mangeurs').count() > 0,
    'payeurs supérieurs aux présents : alerte affichée');
  ok(await page.getByTestId('mangeurs-ci').innerText() === '5',
    'le calcul plafonne les mangeurs aux 5 présents');

  await page.getByTestId('systeme-apport-communautaire').click();
  await page.waitForTimeout(250);
  ok(await page.getByTestId('payeurs-garcons-ci').count() === 0,
    'apport communautaire : les champs payeurs disparaissent');
  await page.getByTestId('presents-garcons-ci').fill('12');
  await page.getByTestId('presents-filles-ci').fill('13');
  await page.getByTestId('presents-garcons-cm1').fill('5');
  await page.getByTestId('presents-filles-cm1').fill('5');
  await page.waitForTimeout(300);
  ok(await page.getByTestId('total-presents-payeurs').innerText() === '35', 'apport communautaire : 35 présents');
  ok(await page.getByTestId('total-mangeurs').innerText() === '35', 'apport communautaire : les 35 présents mangent');
  ok(await page.getByTestId('total-presents-non-mangeurs').innerText() === '0', 'apport communautaire : aucun présent non mangeur');
  await page.getByTestId('btn-enregistrer-payeurs').click();
  await page.waitForTimeout(450);
  const surveys = await readSurveys(page);
  ok(surveys[0]?.system === 'apport-communautaire', 'le système apport communautaire est enregistré');
  await ctx.close();
}

console.log('\n3. Cahier des menus : reprise G/F des mangeurs');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    localStorage.setItem('msp_canteen_payer_eaters', JSON.stringify([{
      id: 'releve-menu-v66', date: '2026-10-12', schoolName: 'EPP Cotonou Centre', schoolYear: '2026-2027',
      system: 'payeur-mangeur',
      counts: [
        { level: 'ci', enrolledBoys: 30, enrolledGirls: 30, presentBoys: 25, presentGirls: 20, paidPresentBoys: 18, paidPresentGirls: 15 },
        { level: 'cm2', enrolledBoys: 20, enrolledGirls: 20, presentBoys: 10, presentGirls: 12, paidPresentBoys: 7, paidPresentGirls: 9 },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    }]));
    localStorage.setItem('msp_canteen_menus', JSON.stringify([{
      id: 'menu-v66', establishmentId: '', establishmentName: 'EPP Cotonou Centre',
      roundingMethodVersion: 'v65-intervalles-sortie',
      startDate: '2026-10-12', endDate: '2026-10-16',
      days: [{
        dayLabel: 'Lundi', date: '12/10/2026', menu: 'Maïs + haricot', boys: 0, girls: 0,
        lines: [
          { food: 'Maïs', ration: 0.15, quantity: 0, balance: 100 },
          { food: 'Riz', ration: 0.15, quantity: 0, balance: 100 },
          { food: 'Pois vert', ration: 0.03, quantity: 0, balance: 100 },
          { food: 'Huile', ration: 0.01, quantity: 0, balance: 100 },
          { food: 'Sel', ration: 0.003, quantity: 0, balance: 100 },
        ],
      }],
      preparedBy: 'HOUNSOU Marie', role: 'Maître cantine', signedDate: '2026-10-12',
      createdAt: Date.now(), updatedAt: Date.now(),
    }]));
  });

  await page.goto(BASE + '/#/cantine/menus', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /Semaine du 12\/10\/2026/ }).click();
  await page.waitForTimeout(600);
  await page.getByTestId('reprendre-mangeurs-menu-0').click();
  await page.waitForTimeout(600);
  ok(await page.getByTestId('menu-g-0').inputValue() === '25', 'menu : 25 garçons mangeurs repris');
  ok(await page.getByTestId('menu-f-0').inputValue() === '24', 'menu : 24 filles mangeuses reprises');
  ok(await page.getByTestId('menu-t-0').innerText() === '49', 'menu : total de 49 mangeurs');
  ok((await page.getByTestId('qte-0-0').innerText()).includes('7,25'),
    'menu : quantité calculée sur 49 mangeurs (maïs 7,25 kg après arrondi)');
  await ctx.close();
}

console.log('\n4. Guide intégré et aide contextuelle');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/guide/manuel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByTestId('recherche-manuel').fill('payeurs-mangeurs');
  await page.waitForTimeout(500);
  const text = (await bodyText(page)).replace(/\s+/g, ' ');
  ok(text.includes('Relevé des effectifs payeurs-mangeurs'), 'manuel : fiche payeurs-mangeurs trouvée');
  ok(text.includes('Apport communautaire') && text.includes('tous les enfants présents mangent'),
    'manuel : les deux systèmes sont expliqués');
  await ctx.close();
}
{
  const { ctx, page } = await newPage({ hideGuides: false });
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.goto(BASE + '/#/cantine/payeurs-mangeurs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  const text = (await bodyText(page)).replace(/\s+/g, ' ');
  ok(text.includes('Relevé payeurs-mangeurs'), 'guide contextuel : écran payeurs-mangeurs couvert');
  const understood = page.getByRole('button', { name: 'J’ai compris' });
  if (await understood.count()) await understood.first().click();
  await ctx.close();
}

await browser.close();
console.log(`\n=== E2E v66 payeurs-mangeurs : ${pass} réussites, ${fail} échecs ===`);
if (fail) {
  console.log('Échecs :');
  failures.forEach((f) => console.log('  - ' + f));
}
process.exit(fail > 0 ? 1 : 0);
