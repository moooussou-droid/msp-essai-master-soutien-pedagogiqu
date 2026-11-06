/**
 * E2E v40 — Mon gestionnaire de cantine scolaire.
 * Vérifie dans un vrai navigateur ce que l'audit statique ne peut pas voir :
 * saisie réelle, recalcul, persistance après rechargement, clôture.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const failures = [];

function ok(cond, label) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; failures.push(label); console.log('  ❌ ' + label); }
}

const ACTIVATION = {
  activated: true, name: 'KOFFI Jean', code: '111111',
  expiresAt: Date.now() + 31536000000, plan: 'complet',
};

function seed(act) {
  localStorage.setItem('msp_activation', JSON.stringify(act));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean', schoolName: 'EPP Cotonou Centre' }));
  localStorage.setItem('msp_install_dismissed', 'true');
  const g = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) => (typeof k === 'string' && k.startsWith('msp_guide_hidden_') ? 'true' : g(k));
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript(seed, ACTIVATION);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}

const run = async () => {
  const browser = await chromium.launch();

  /* ---------------- Bloc 1 : navigation vers le module ---------------- */
  console.log('\n— Bloc 1 : accès au module');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const body = await page.textContent('body');
    ok(/cantine/i.test(body), 'Le module cantine s’ouvre');
    ok(body.includes('Super MSP Simulateur cantine'), 'Le sous-module simulateur est listé');
    ok(body.includes('Cahier MSP des menus hebdomadaires'), 'Le cahier des menus est listé');
    ok(body.includes('Cahier MSP de gestion des stocks'), 'Le cahier des stocks est listé');
    await ctx.close();
  }

  /* ---------------- Bloc 2 : simulateur, cycle complet ---------------- */
  console.log('\n— Bloc 2 : simulateur, création et calcul');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    ok(await page.locator('[data-testid="carte-nouvelle"]').count() === 1, 'Le tableau de bord affiche ses cartes');
    for (const c of ['jour', 'prevision', 'point', 'historique', 'rapports']) {
      ok(await page.locator(`[data-testid="carte-${c}"]`).count() === 1, `La carte « ${c} » est affichée`);
    }

    await page.locator('[data-testid="carte-nouvelle"]').click();
    await page.waitForTimeout(500);

    // Validation : créer sans effectif doit échouer
    await page.locator('[data-testid="btn-creer-semaine"]').click();
    await page.waitForTimeout(300);
    ok(await page.locator('[data-testid="erreurs-formulaire"]').count() === 1, 'Un effectif manquant est refusé');

    await page.locator('[data-testid="champ-effectif"]').fill('100');
    await page.locator('[data-testid="champ-jours"]').selectOption('5');
    await page.locator('[data-testid="champ-mais"]').selectOption('3');
    await page.locator('[data-testid="champ-legumineuse"]').selectOption('haricot');
    await page.locator('[data-testid="btn-creer-semaine"]').click();
    await page.waitForTimeout(800);

    ok(await page.locator('[data-testid="table-prevision"]').count() === 1, 'La prévision s’affiche après création');
    const maize = await page.locator('[data-testid="prevu-maize"]').textContent();
    ok(maize.includes('45'), `Maïs prévu = 45 kg (obtenu « ${maize.trim()} »)`);
    const rice = await page.locator('[data-testid="prevu-rice"]').textContent();
    ok(rice.includes('30'), `Riz prévu = 30 kg (obtenu « ${rice.trim()} »)`);
    const legume = await page.locator('[data-testid="prevu-legume"]').textContent();
    ok(legume.includes('15'), `Haricot prévu = 15 kg (obtenu « ${legume.trim()} »)`);

    await ctx.close();
  }

  /* ---------------- Bloc 3 : saisie journalière et recalcul ---------------- */
  console.log('\n— Bloc 3 : prélèvement du jour');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Création de la semaine
    await page.locator('[data-testid="carte-nouvelle"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="champ-effectif"]').fill('100');
    await page.locator('[data-testid="champ-mais"]').selectOption('3');
    await page.locator('[data-testid="btn-creer-semaine"]').click();
    await page.waitForTimeout(700);

    // Aller au prélèvement du jour
    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(600);

    await page.locator('[data-testid="effectif-jour-1"]').fill('90');
    await page.locator('[data-testid="cereale-jour-1"]').selectOption('maize');
    await page.waitForTimeout(500);

    const q1 = await page.locator('[data-testid="quantites-jour-1"]').textContent();
    ok(q1.includes('13,5'), `90 élèves au maïs → 13,5 kg (obtenu « ${q1.replace(/\s+/g, ' ').trim()} »)`);
    ok(q1.includes('2,75'), 'La légumineuse du jour est calculée (2,75 kg)');
    ok(!q1.includes('Riz'), 'Le riz n’est pas sorti un jour de maïs');

    // Jour sans cuisson
    await page.locator('[data-testid="effectif-jour-2"]').fill('100');
    await page.locator('[data-testid="cereale-jour-2"]').selectOption('aucune');
    await page.waitForTimeout(400);
    ok(await page.locator('[data-testid="quantites-jour-2"]').count() === 0, 'Un jour sans cuisson n’affiche aucune sortie');

    // Persistance après rechargement
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="carte-jour"]').click();
    await page.waitForTimeout(700);
    const persisted = await page.locator('[data-testid="effectif-jour-1"]').inputValue();
    ok(persisted === '90', `L’effectif du jour est conservé après rechargement (obtenu « ${persisted} »)`);

    await ctx.close();
  }

  /* ---------------- Bloc 4 : point hebdomadaire et dépassement ---------------- */
  console.log('\n— Bloc 4 : reliquats et alerte de dépassement');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.locator('[data-testid="carte-nouvelle"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="champ-effectif"]').fill('100');
    await page.locator('[data-testid="champ-mais"]').selectOption('3');
    await page.locator('[data-testid="btn-creer-semaine"]').click();
    await page.waitForTimeout(700);
    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(600);

    // Effectifs journaliers SUPÉRIEURS à la prévision → dépassement
    for (const d of [1, 2, 3]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('150');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('maize');
      await page.waitForTimeout(250);
    }
    await page.locator('button:has-text("Voir le point de la semaine")').first().click();
    await page.waitForTimeout(700);

    ok(await page.locator('[data-testid="alerte-depassement"]').count() >= 1, 'L’alerte de dépassement est affichée');
    const reliquat = await page.locator('[data-testid="reliquat-maize"]').textContent();
    ok(reliquat.trim().startsWith('-'), `Le reliquat de maïs est négatif (obtenu « ${reliquat.trim()} »)`);
    const bodyPoint = await page.textContent('body');
    ok(/Dépassement de/.test(bodyPoint), 'Le dépassement est explicitement chiffré');
    const plats = await page.locator('[data-testid="total-plats"]').textContent();
    ok(plats.trim() === '450', `Total de plats = 450 (obtenu « ${plats.trim()} »)`);

    // Clôture puis verrouillage
    await page.locator('[data-testid="btn-cloturer"]').click();
    await page.waitForTimeout(700);
    ok(await page.locator('[data-testid="btn-rouvrir"]').count() === 1, 'La semaine clôturée propose la réouverture');

    await page.locator('button[aria-label="Retour"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="carte-jour"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="effectif-jour-1"]').isDisabled(), 'La saisie est verrouillée après clôture');

    await ctx.close();
  }

  /* ---------------- Bloc 5 : historique ---------------- */
  console.log('\n— Bloc 5 : historique');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    for (const eff of ['100', '120']) {
      await page.locator('[data-testid="carte-nouvelle"]').click();
      await page.waitForTimeout(400);
      await page.locator('[data-testid="champ-effectif"]').fill(eff);
      await page.locator('[data-testid="champ-mais"]').selectOption('2');
      await page.locator('[data-testid="btn-creer-semaine"]').click();
      await page.waitForTimeout(700);
      await page.locator('button[aria-label="Retour"]').first().click();
      await page.waitForTimeout(400);
    }

    await page.locator('[data-testid="carte-historique"]').click();
    await page.waitForTimeout(600);
    const cards = await page.locator('[data-testid="liste-historique"] > div').count();
    ok(cards === 2, `Les deux semaines sont conservées dans l’historique (obtenu ${cards})`);
    await ctx.close();
  }

  /* ---------------- Bloc 6 : cahier des menus ---------------- */
  console.log('\n— Bloc 6 : cahier des menus hebdomadaires');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/menus', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.locator('[data-testid="btn-nouveau-cahier"]').click();
    await page.waitForTimeout(700);

    ok(await page.locator('[data-testid="menu-jour-0"]').count() === 1, 'Le cahier ouvre les 5 jours de la semaine');
    ok(await page.locator('[data-testid="menu-jour-4"]').count() === 1, 'Le vendredi est présent');

    await page.locator('[data-testid="menu-texte-0"]').fill('Maïs + Pois vert + Huile (Gbêmou Watchê)');
    await page.locator('[data-testid="menu-g-0"]').fill('147');
    await page.locator('[data-testid="menu-f-0"]').fill('135');
    await page.waitForTimeout(600);

    const total = await page.locator('[data-testid="menu-t-0"]').textContent();
    ok(total.trim() === '282', `Le total G+F est calculé : 282 (obtenu « ${total.trim()} »)`);

    // Ligne 0 = Maïs, ration 0,15 → 0,15 × 282 = 42,30 ; v65 : 0,30 ∈ [0 ; 0,375] → 42,25
    const qte = await page.locator('[data-testid="qte-0-0"]').textContent();
    ok(qte.includes('42,25'), `Maïs à sortir = 42,25 kg (obtenu « ${qte.trim()} »)`);
    // Ligne 2 = Pois vert, 0,03 × 282 = 8,46 arrondi à 8,50
    const qtePois = await page.locator('[data-testid="qte-0-2"]').textContent();
    ok(qtePois.includes('8,5'), `Pois vert à sortir = 8,50 kg (obtenu « ${qtePois.trim()} »)`);

    await page.locator('[data-testid="cahier-etabli-par"]').fill('OUSSOU Moïse');
    await page.locator('[data-testid="btn-enregistrer-cahier"]').click();
    await page.waitForTimeout(600);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const bodyList = await page.textContent('body');
    ok(/Semaine du/.test(bodyList), 'Le cahier enregistré réapparaît après rechargement');

    await ctx.close();
  }

  /* ---------------- Bloc 7 : cahier de stock ---------------- */
  console.log('\n— Bloc 7 : cahier de gestion des stocks');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/stocks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const bodyList = await page.textContent('body');
    for (const f of ['Maïs', 'Riz', 'Pois vert', 'Pois jaune', 'Haricot', 'Huile', 'Sel iodé']) {
      ok(bodyList.includes(f), `La denrée « ${f} » a sa propre section`);
    }

    await page.locator('[data-testid="denree-sel-iodé"]').click();
    await page.waitForTimeout(600);

    // Reproduction des deux premières lignes du cahier photographié
    await page.locator('[data-testid="stock-date"]').fill('2026-04-09');
    await page.locator('[data-testid="stock-entree"]').fill('50');
    await page.locator('[data-testid="stock-obs"]').fill('Dotation T3');
    await page.locator('[data-testid="btn-ajouter-ligne"]').click();
    await page.waitForTimeout(600);

    let stock = await page.locator('[data-testid="stock-actuel"]').textContent();
    ok(stock.includes('50'), `Après une entrée de 50, le stock est de 50 (obtenu « ${stock.trim()} »)`);

    await page.locator('[data-testid="stock-date"]').fill('2026-04-16');
    await page.locator('[data-testid="stock-sortie"]').fill('1.8');
    await page.locator('[data-testid="btn-ajouter-ligne"]').click();
    await page.waitForTimeout(600);

    stock = await page.locator('[data-testid="stock-actuel"]').textContent();
    ok(stock.includes('48,2'), `Report automatique : 50 − 1,8 = 48,2 (obtenu « ${stock.trim()} »)`);

    const table = await page.locator('[data-testid="table-stock"]').textContent();
    ok(table.includes('48,2'), 'Le registre affiche le stock restant calculé');

    // Sortie supérieure au stock → alerte
    await page.locator('[data-testid="stock-date"]').fill('2026-04-17');
    await page.locator('[data-testid="stock-sortie"]').fill('100');
    await page.locator('[data-testid="btn-ajouter-ligne"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="stock-alerte"]').count() === 1, 'Un stock négatif déclenche une alerte');

    // Persistance
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const after = await page.textContent('body');
    ok(/Sel iodé/.test(after), 'Le cahier de stock est conservé après rechargement');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v40 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
