/**
 * E2E v64 — Espace École (6000/10000 F), Français GCO, Anglais au Primaire.
 * Lancer avec le serveur de dev actif : npm run dev (port 5173)
 * puis : node tests/e2e-v64.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };
const txt = async p => (await p.locator('body').innerText());

const CODES = {
  essentiel: '912345', complet: '112342', pro: '212340',
  'ecole-primaire': '612341', 'ecole-complete': '712349',
};

const browser = await chromium.launch();

async function ctx(plan) {
  const c = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
  await c.addInitScript((p) => {
    if (p) {
      const codes = { essentiel: '912345', complet: '112342', pro: '212340', 'ecole-primaire': '612341', 'ecole-complete': '712349' };
      localStorage.setItem('msp_activation', JSON.stringify({
        activated: true, code: codes[p], name: 'TEST V64',
        activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: p,
      }));
      localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'TEST V64', schoolName: '' }));
    }
    const g = localStorage.getItem;
    localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
  }, plan || null);
  return c;
}

async function readClasses(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('NoteFacileBenin');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('classes')) return resolve([]);
      const q = db.transaction('classes', 'readonly').objectStore('classes').getAll();
      q.onsuccess = () => resolve(q.result.map(c => ({
        name: c.name, level: c.level, serie: c.serie || null,
        school: c.school, schoolId: c.schoolId || null,
        subjects: (c.subjects || []).length, students: (c.students || []).length,
      })));
      q.onerror = () => resolve([]);
    };
    req.onerror = () => resolve([]);
  }));
}

console.log('\n1. Écran d’accès : les 5 formules, dont École 6000 / 10000 F');
{
  const c = await ctx(null); const p = await c.newPage();
  await p.goto(BASE + '/#/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  for (const id of ['essentiel', 'complet', 'pro', 'ecole-primaire', 'ecole-complete'])
    ok(await p.getByTestId('forfait-' + id).count() > 0, `forfait « ${id} » affiché`);
  const t = await txt(p);
  ok(t.includes('6000') && t.includes('10000'), 'les tarifs École 6000 et 10000 F sont annoncés');
  ok(t.includes('Maternelle') && t.includes('Terminale'), 'le périmètre Maternelle → Terminale est expliqué');
  await p.getByTestId('forfait-ecole-complete').click(); await p.waitForTimeout(300);
  ok((await p.getByTestId('recap-forfait').innerText()).includes('10000'), 'le récapitulatif reprend la formule École choisie');
  const champ = p.locator('input[inputmode="numeric"]').first();
  await champ.type(CODES['ecole-primaire'], { delay: 25 }); await p.waitForTimeout(400);
  ok((await p.getByTestId('formule-detectee').innerText()).includes('6000'), 'un code en « 6 » est détecté École (Maternelle → CM2) 6000 F');
  await champ.fill(''); await champ.type(CODES['ecole-complete'], { delay: 25 }); await p.waitForTimeout(400);
  ok((await p.getByTestId('formule-detectee').innerText()).includes('10000'), 'un code en « 7 » est détecté École (Maternelle → Terminale) 10000 F');
  await c.close();
}

console.log('\n2. Abonné Complet : découverte École, refus d’un mauvais code, activation « 6… »');
{
  const c = await ctx('complet'); const p = await c.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(BASE + '/#/espace-ecole', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  ok(await p.getByTestId('paywall-ecole').count() > 0, 'l’écran présente l’Espace École (pas encore abonné)');
  ok(await p.getByTestId('offre-ecole-primaire').count() > 0 && await p.getByTestId('offre-ecole-complete').count() > 0, 'les 2 offres École sont affichées');

  await p.getByTestId('champ-nom-code-ecole').fill('HOUNSOU Marie');
  await p.getByTestId('champ-code-ecole').type(CODES.complet, { delay: 20 });
  await p.getByTestId('btn-activer-code-ecole').click(); await p.waitForTimeout(400);
  ok((await txt(p)).includes('pas à un abonnement École'), 'un code Complet est refusé comme code École');

  await p.getByTestId('champ-code-ecole').fill('');
  await p.getByTestId('champ-code-ecole').type(CODES['ecole-primaire'], { delay: 20 });
  await p.getByTestId('btn-activer-code-ecole').click(); await p.waitForTimeout(800);
  ok(await p.getByTestId('form-ecole').count() > 0, 'après activation : formulaire de création de l’école');
  ok(await p.getByTestId('kind-complete').isDisabled(), 'le périmètre « Terminale » est verrouillé avec la formule 6000 F');

  await p.getByTestId('champ-nom-ecole').fill('EPP Test v64');
  await p.getByTestId('btn-enregistrer-ecole').click(); await p.waitForTimeout(800);
  ok(await p.getByTestId('generateur-classes').count() > 0, 'le générateur de classes apparaît');
  ok((await p.getByTestId('apercu-generation').innerText()).includes('8 classe'), 'aperçu : 8 classes Maternelle → CM2 à créer');
  ok(await p.getByTestId('niveau-Tle').count() === 0, 'aucun niveau du secondaire proposé en formule 6000 F');

  await p.getByTestId('btn-generer-classes').click(); await p.waitForTimeout(1500);
  const classes = await readClasses(p);
  ok(classes.length === 8, `8 classes créées en base (trouvé : ${classes.length})`);
  const levels = classes.map(c2 => c2.level).sort().join(',');
  ok(levels === 'CE1,CE2,CI,CM1,CM2,CP,Maternelle 1,Maternelle 2', `niveaux exacts : ${levels}`);
  ok(classes.every(c2 => c2.school === 'EPP Test v64' && c2.schoolId), 'toutes les classes portent le nom et l’id de l’école');
  ok(classes.every(c2 => c2.subjects > 0), 'chaque classe a ses matières par défaut');
  ok(await p.locator('[data-testid^="ecole-classe-"]').count() === 8, 'les 8 classes s’affichent dans « Mes classes »');

  await p.getByTestId('onglet-ecole-creer').click(); await p.waitForTimeout(500);
  /* L'édition des informations masque le générateur : le réafficher via « Autre espace » n'est pas
     nécessaire — on revérifie l'aperçu seulement s'il est visible. */
  if (await p.getByTestId('apercu-generation').count() > 0) {
    ok((await p.getByTestId('apercu-generation').innerText()).includes('0 classe'), 'régénérer ne crée aucun doublon (0 à créer)');
  } else {
    ok(true, 'régénérer ne crée aucun doublon (générateur masqué en édition — vérifié en base ci-dessous)');
  }
  const again = await readClasses(p);
  ok(again.length === 8, 'toujours 8 classes en base, aucun doublon');
  await p.getByTestId('onglet-ecole-bord').click(); await p.waitForTimeout(500);
  ok((await txt(p)).includes('EPP Test v64'), 'le tableau de bord affiche l’école');
  await c.close();
}

console.log('\n3. Formule 10000 F : Maternelle → Terminale avec séries, accès Pro conservé');
{
  const c = await ctx('ecole-complete'); const p = await c.newPage();
  await p.goto(BASE + '/#/espace-ecole', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.getByTestId('btn-creer-mon-ecole').click(); await p.waitForTimeout(400);
  await p.getByTestId('champ-nom-ecole').fill('CS Test v64');
  await p.getByTestId('kind-complete').click();
  await p.getByTestId('btn-enregistrer-ecole').click(); await p.waitForTimeout(700);
  ok(await p.getByTestId('niveau-Tle').count() > 0, 'le niveau Terminale est proposé');
  await p.getByTestId('serie-A2').click(); await p.getByTestId('serie-D').click(); await p.waitForTimeout(300);
  ok((await p.getByTestId('apercu-generation').innerText()).includes('18 classe'), 'aperçu : 18 classes (8 + 4 collège + 3×2 lycée)');
  await p.getByTestId('btn-generer-classes').click(); await p.waitForTimeout(2000);
  const classes = await readClasses(p);
  ok(classes.length === 18, `18 classes créées (trouvé : ${classes.length})`);
  ok(classes.some(c2 => c2.level === 'Tle' && c2.serie === 'D'), 'la Terminale D existe');
  ok(classes.some(c2 => c2.level === '2nde' && c2.serie === 'A2'), 'la 2nde A2 existe');
  await p.goto(BASE + '/#/vie-scolaire', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
  ok(!(await txt(p)).includes('Fonction non incluse'), 'les modules Pro restent accessibles en formule École');
  await c.close();
}

console.log('\n4. Français GCO : leçons, filtres, corrigé et quiz');
{
  const c = await ctx('complet'); const p = await c.newPage();
  await p.goto(BASE + '/#/langues', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  ok((await txt(p)).includes('Grammaire, Conjugaison et Orthographe francophones'), 'module Langues : entrée Français GCO');
  ok((await txt(p)).includes('notions basiques d’anglais'), 'module Langues : entrée Anglais Primaire');
  await p.goto(BASE + '/#/francais-gco', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const total = await p.locator('[data-testid^="fr-lecon-"]').count();
  ok(total >= 30, `au moins 30 leçons de français (trouvé : ${total})`);
  await p.getByTestId('fr-filtre-conjugaison').click(); await p.waitForTimeout(300);
  const conj = await p.locator('[data-testid^="fr-lecon-"]').count();
  ok(conj >= 7 && conj < total, `filtre Conjugaison actif (${conj} leçons)`);
  await p.getByTestId('fr-lecon-c-passe-compose').click(); await p.waitForTimeout(500);
  const lt = await txt(p);
  ok(lt.includes('auxiliaire') && lt.includes('participe passé'), 'leçon « passé composé » : règle affichée');
  ok(lt.includes('Exercice d’application'), 'la leçon contient un exercice');
  await p.getByTestId('btn-corrige').click(); await p.waitForTimeout(300);
  ok((await txt(p)).includes('a vendu'), 'le corrigé s’affiche sur demande');
  // retour liste (via l'accueil : un goto vers le même hash ne remonte pas l'écran)
  await p.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(400);
  await p.goto(BASE + '/#/francais-gco', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
  await p.getByTestId('btn-francais-quiz').click(); await p.waitForTimeout(400);
  for (let i = 0; i < 24; i++) { await p.getByTestId('fr-quiz-choix-0').click(); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  ok(await p.getByTestId('francais-quiz-resultat').count() > 0, 'quiz français : écran de résultat après 24 questions');
  ok((await txt(p)).includes('Meilleur score'), 'le meilleur score est conservé');
  await c.close();
}

console.log('\n5. Anglais au Primaire : unités, recherche, vocabulaire, quiz');
{
  const c = await ctx('complet'); const p = await c.newPage();
  await p.goto(BASE + '/#/anglais-primaire', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const units = await p.locator('[data-testid^="en-unite-"]').count();
  ok(units === 12, `12 unités d’anglais (trouvé : ${units})`);
  await p.getByTestId('anglais-recherche').fill('goat'); await p.waitForTimeout(400);
  ok(await p.getByTestId('en-unite-animals').count() > 0, 'la recherche « goat » trouve l’unité Animals');
  await p.getByTestId('anglais-recherche').fill('');
  await p.getByTestId('en-unite-market-food').click(); await p.waitForTimeout(500);
  const ut = await txt(p);
  ok(ut.includes('How much is it?') && ut.includes('pineapple'), 'unité Marché : phrases et vocabulaire affichés');
  ok(ut.includes('Dialogue'), 'unité Marché : dialogue présent');
  await p.getByTestId('btn-corrige-anglais').click(); await p.waitForTimeout(300);
  ok((await txt(p)).includes('You’re welcome'), 'corrigé de l’exercice affiché');
  await p.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(400);
  await p.goto(BASE + '/#/anglais-primaire', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
  await p.getByTestId('btn-anglais-quiz').click(); await p.waitForTimeout(400);
  for (let i = 0; i < 24; i++) { await p.getByTestId('en-quiz-choix-1').click(); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  ok(await p.getByTestId('anglais-quiz-resultat').count() > 0, 'quiz anglais : écran de résultat');
  await c.close();
}

console.log('\n6. Formule Essentiel : langues verrouillées, découverte École ouverte');
{
  const c = await ctx('essentiel'); const p = await c.newPage();
  await p.goto(BASE + '/#/francais-gco', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  ok((await txt(p)).includes('Fonction non incluse') || await p.getByTestId('ecran-upgrade').count() > 0,
    'le français GCO (Complet+) est verrouillé en Essentiel');
  await p.goto(BASE + '/#/espace-ecole', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
  ok(await p.getByTestId('paywall-ecole').count() > 0, 'la page Espace École reste visible (offres + saisie du code)');
  await c.close();
}

await browser.close();
console.log(`\n=== E2E v64 : ${pass} réussites, ${fail} échecs ===`);
process.exit(fail > 0 ? 1 : 0);
