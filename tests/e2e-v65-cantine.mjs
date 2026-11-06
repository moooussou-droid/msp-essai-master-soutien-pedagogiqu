/**
 * E2E v65 — Cantine : méthode d'arrondi de sortie des denrées par
 * intervalles + guide de l'utilisateur complété (v64/v65).
 *
 * Règle vérifiée :
 *  - huile, céréales, légumineuses : partie décimale au quart,
 *    seuils 0,375 / 0,625 / 0,875 ;
 *  - sel : partie décimale au dixième,
 *    seuils 0,15 / 0,25 / … / 0,95 ;
 *  - 0 reste 0 et un entier exact reste entier.
 *
 * Lancer avec le serveur de dev actif : npm run dev (port 5173)
 * puis : node tests/e2e-v65-cantine.mjs
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

const readWeeks = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('msp_canteen_weeks') || '[]'));
const readMenus = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('msp_canteen_menus') || '[]'));

console.log('\n1. Anciennes semaines : brouillon recalculé à l’ouverture, clôturée préservée');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const makeWeek = (id, status, createdAt) => ({
      id,
      establishmentId: '',
      establishmentName: 'EPP Cotonou Centre',
      weekStartDate: '2026-10-12',
      weekEndDate: '2026-10-16',
      weeklyStaffCount: 310,
      workingDays: 5,
      maizeServiceCount: 0,
      legume: 'haricot',
      legumeMode: 'unique',
      weeklyPlan: { maize: 0, rice: 999, beans: 999, yellowPeas: 0, greenPeas: 0, oil: 15, salt: 999 },
      dailyWithdrawals: [{
        dayNumber: 1, date: '2026-10-12', staffCount: 279, cereal: 'rice', legume: 'haricot',
        maizeQuantity: 999, riceQuantity: 999, legumeQuantity: 999, oilQuantity: 999, saltQuantity: 999,
      }],
      weeklySummary: {},
      status,
      createdAt,
      updatedAt: createdAt,
    });
    localStorage.setItem('msp_canteen_weeks', JSON.stringify([
      makeWeek('ancien-brouillon-v65', 'brouillon', Date.now()),
      makeWeek('ancienne-cloturee-v65', 'cloturee', Date.now() - 1000),
    ]));
  });

  await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const weeks = await readWeeks(page);
  const draft = weeks.find((w) => w.id === 'ancien-brouillon-v65');
  const closed = weeks.find((w) => w.id === 'ancienne-cloturee-v65');

  ok(draft?.roundingMethodVersion === 'v65-intervalles-sortie', 'le brouillon est marqué avec la méthode v65');
  ok(draft?.weeklyPlan?.oil === 16.25, `le brouillon est recalculé : huile prévue 16,25 L (lu : ${draft?.weeklyPlan?.oil})`);
  ok(draft?.dailyWithdrawals?.[0]?.riceQuantity === 41.75, 'le jour du brouillon est recalculé (riz 41,75 kg)');
  ok(!closed?.roundingMethodVersion && closed?.weeklyPlan?.oil === 15, 'la semaine clôturée reste un document historique inchangé');
  await ctx.close();
}

console.log('\n2. Simulateur : prévision et prélèvements avec les intervalles v65');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await page.getByTestId('carte-nouvelle').click();
  await page.getByTestId('champ-effectif').fill('310');
  await page.getByTestId('champ-jours').selectOption('5');
  await page.getByTestId('champ-mais').selectOption('0');
  await page.getByTestId('champ-legumineuse').selectOption('haricot');
  await page.getByTestId('btn-creer-semaine').click();
  await page.waitForTimeout(1100);

  const prevu = async (food) => (await page.getByTestId(`prevu-${food}`).innerText()).trim();
  ok((await prevu('rice')).includes('232,5'), 'prévision riz : 232,50 kg');
  ok((await prevu('legume')).includes('46,25'), 'prévision légumineuse : 46,25 kg');
  ok((await prevu('oil')).includes('16,25'), 'prévision huile v65 : 3,10 L/service → 3,25 L, soit 16,25 L');
  ok((await prevu('salt')).includes('4,5'), 'prévision sel : 4,50 kg');
  ok(await page.getByTestId('guide-arrondi-cantine').count() > 0, 'le graphique des intervalles est affiché dans la prévision');
  const forecastText = await bodyText(page);
  ok(forecastText.includes('[0 ; 0,375]') && forecastText.includes(']0,95 ; 1]'), 'les bornes 0,375 (quart) et 0,95 (sel) sont visibles');

  await page.getByRole('button', { name: /Saisir les prélèvements du jour/ }).click();
  await page.waitForTimeout(500);

  // 1 élève : chaque fraction positive retient au moins le premier pas.
  await page.getByTestId('effectif-jour-1').fill('1');
  await page.getByTestId('cereale-jour-1').selectOption('rice');
  await page.waitForTimeout(500);
  let weeks = await readWeeks(page);
  let day1 = weeks[0].dailyWithdrawals[0];
  ok(day1.riceQuantity === 0.25 && day1.legumeQuantity === 0.25 && day1.oilQuantity === 0.25,
    '1 élève : riz, légumineuse et huile sortent au minimum à 0,25');
  ok(day1.saltQuantity === 0.1, '1 élève : le sel sort au minimum à 0,10 kg');

  // 100 élèves : quantités entières exactes, aucune fraction artificielle.
  await page.getByTestId('effectif-jour-1').fill('100');
  await page.waitForTimeout(500);
  weeks = await readWeeks(page);
  day1 = weeks[0].dailyWithdrawals[0];
  ok(day1.riceQuantity === 15 && day1.legumeQuantity === 3 && day1.oilQuantity === 1 && day1.saltQuantity === 0.3,
    '100 élèves : 15 kg / 3 kg / 1 L / 0,30 kg, entiers exacts inchangés');

  // Borne du sel : 50 × 0,003 = 0,15 -> intervalle [0 ; 0,15] -> 0,10.
  await page.getByTestId('effectif-jour-2').fill('50');
  await page.getByTestId('cereale-jour-2').selectOption('rice');
  await page.waitForTimeout(500);
  weeks = await readWeeks(page);
  const day2 = weeks[0].dailyWithdrawals[1];
  ok(day2.saltQuantity === 0.1, 'borne sel : 0,15 kg calculé → 0,10 kg à sortir');

  // Juste après la borne : 51 × 0,003 = 0,153 -> 0,20.
  await page.getByTestId('effectif-jour-3').fill('51');
  await page.getByTestId('cereale-jour-3').selectOption('rice');
  await page.waitForTimeout(500);
  weeks = await readWeeks(page);
  const day3 = weeks[0].dailyWithdrawals[2];
  ok(day3.saltQuantity === 0.2, 'sel : 0,153 kg calculé → 0,20 kg à sortir');
  ok((await bodyText(page)).includes('Arrondi de sortie v65'), 'la note d’arrondi v65 accompagne la saisie journalière');
  await ctx.close();
}

console.log('\n3. Cahier des menus : ancien cahier recalculé à l’ouverture');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const oldMenu = {
      id: 'ancien-menu-v65',
      establishmentId: '',
      establishmentName: 'EPP Cotonou Centre',
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      days: [{
        dayLabel: 'Lundi', date: '12/10/2026', menu: 'Maïs + Pois vert + Huile',
        boys: 141, girls: 141,
        lines: [
          { food: 'Maïs', ration: 0.15, quantity: 42.5, balance: 57.5 },
          { food: 'Riz', ration: 0.15, quantity: 42.5, balance: 57.5 },
          { food: 'Pois vert', ration: 0.03, quantity: 8.5, balance: 91.5 },
          { food: 'Huile', ration: 0.01, quantity: 3, balance: 97 },
          { food: 'Sel', ration: 0.003, quantity: 0.9, balance: 99.1 },
        ],
      }],
      preparedBy: 'HOUNSOU Marie', role: 'Maître cantine', signedDate: '2026-10-12',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    localStorage.setItem('msp_canteen_menus', JSON.stringify([oldMenu]));
  });

  await page.goto(BASE + '/#/cantine/menus', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /Semaine du 12\/10\/2026/ }).click();
  await page.waitForTimeout(800);

  const qty = async (line) => (await page.getByTestId(`qte-0-${line}`).innerText()).trim();
  ok((await qty(0)).includes('42,25'), 'menus : maïs 42,30 kg calculé → 42,25 kg à sortir');
  ok((await qty(2)).includes('8,50'), 'menus : pois vert 8,46 kg → 8,50 kg');
  ok((await qty(3)).includes('2,75'), 'menus : huile 2,82 L → 2,75 L');
  ok((await qty(4)).includes('0,80'), 'menus : sel 0,846 kg → 0,80 kg');
  ok(await page.getByTestId('guide-arrondi-cantine').count() > 0, 'menus : le graphique des intervalles est affiché');
  const menus = await readMenus(page);
  ok(menus[0]?.roundingMethodVersion === 'v65-intervalles-sortie', 'menus : le cahier recalculé est enregistré en v65');
  await ctx.close();
}

console.log('\n4. Cahier de stock : sortie arrondie, dotation exacte');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/cantine/stocks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);

  await page.locator('[data-testid="denree-maïs"]').click();
  await page.waitForTimeout(500);
  await page.getByTestId('stock-entree').fill('49.8');
  await page.getByTestId('stock-sortie').fill('8.46');
  await page.waitForTimeout(300);
  const preview = await page.getByTestId('stock-sortie-arrondie').innerText();
  ok(preview.includes('8,50') && preview.includes(']0,375 ; 0,625]'),
    'stock maïs : aperçu 8,46 → 8,50 avec son intervalle');

  await page.getByTestId('btn-ajouter-ligne').click();
  await page.waitForTimeout(700);
  ok((await page.getByTestId('stock-actuel').innerText()).includes('41,30'),
    'stock maïs : dotation 49,80 exacte − sortie 8,50 = 41,30 kg');
  const exitInput = page.locator('input[data-testid^="edit-sortie-"]').first();
  ok((await exitInput.inputValue()) === '8.5', 'stock maïs : la sortie enregistrée est 8,5');

  await exitInput.fill('8.37');
  await exitInput.press('Tab');
  await page.waitForTimeout(500);
  ok((await exitInput.inputValue()) === '8.25', 'stock maïs : correction 8,37 -> 8,25 au départ du champ');
  ok((await page.getByTestId('stock-actuel').innerText()).includes('41,55'),
    'stock maïs : le restant suit la sortie corrigée (41,55 kg)');

  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.goto(BASE + '/#/cantine/stocks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('[data-testid="denree-sel-iodé"]').click();
  await page.waitForTimeout(500);
  await page.getByTestId('stock-entree').fill('2');
  await page.getByTestId('stock-sortie').fill('0.84');
  await page.waitForTimeout(300);
  const saltPreview = await page.getByTestId('stock-sortie-arrondie').innerText();
  ok(saltPreview.includes('0,80') && saltPreview.includes(']0,75 ; 0,85]'),
    'stock sel iodé : aperçu 0,84 → 0,80 avec son intervalle');
  await page.getByTestId('btn-ajouter-ligne').click();
  await page.waitForTimeout(700);
  ok((await page.getByTestId('stock-actuel').innerText()).includes('1,20'),
    'stock sel iodé : 2 kg − 0,80 kg = 1,20 kg');
  await ctx.close();
}

console.log('\n5. Guide intégré : manuel, recherche et aides contextuelles v64/v65');
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/#/guide/manuel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  let text = await bodyText(page);
  ok(text.includes('Nouveautés intégrées à ce guide'), 'manuel : encadré des nouveautés v64/v65');
  ok(text.includes('15. Espace École et Langues'), 'manuel : chapitre Espace École et Langues présent');
  ok(text.includes('nouvel arrondi officiel de sortie des denrées'), 'manuel : chapitre Cantine mis à jour');

  await page.getByTestId('recherche-manuel').fill('arrondi de sortie');
  await page.waitForTimeout(500);
  text = await bodyText(page);
  ok(text.includes('Arrondi de sortie des denrées (méthode v65)'), 'manuel : recherche « arrondi de sortie »');
  ok(text.includes('0,375 donne 0,25') && text.includes('0,15 donne 0,10'), 'manuel : les bornes sont expliquées');

  await page.getByTestId('recherche-manuel').fill('10000');
  await page.waitForTimeout(500);
  text = await bodyText(page);
  ok(text.includes('Activer l’abonnement École'), 'manuel : la formule École 10000 F est documentée');

  await page.getByTestId('recherche-manuel').fill('passe compose');
  await page.waitForTimeout(500);
  text = await bodyText(page);
  ok(text.includes('Grammaire, Conjugaison et Orthographe francophones'), 'manuel : le référentiel de français est documenté');
  await ctx.close();
}
{
  const { ctx, page } = await newPage({ hideGuides: false });
  const expectGuide = async (route, fragment, label) => {
    await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    await page.goto(BASE + '/#' + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // innerText peut insérer un retour à la ligne dans un titre étroit.
    const visibleText = (await bodyText(page)).replace(/\s+/g, ' ');
    ok(visibleText.includes(fragment), label);
    const understood = page.getByRole('button', { name: 'J’ai compris' });
    if (await understood.count()) await understood.first().click();
    await page.waitForTimeout(250);
  };

  await expectGuide('/espace-ecole', 'Espace École — toutes les classes', 'guide contextuel : Espace École');
  await expectGuide('/francais-gco', 'Grammaire, Conjugaison et Orthographe francophones', 'guide contextuel : Français GCO');
  await expectGuide('/anglais-primaire', 'Les notions basiques d’anglais pour le Primaire', 'guide contextuel : Anglais au Primaire');
  await expectGuide('/cantine/simulateur', 'nouvel arrondi de sortie', 'guide contextuel : simulateur cantine v65');
  await expectGuide('/cantine/stocks', 'sorties arrondies, dotations exactes', 'guide contextuel : stock cantine v65');
  await ctx.close();
}

await browser.close();
console.log(`\n=== E2E v65 cantine : ${pass} réussites, ${fail} échecs ===`);
if (fail) {
  console.log('Échecs :');
  failures.forEach((f) => console.log('  - ' + f));
}
process.exit(fail > 0 ? 1 : 0);
