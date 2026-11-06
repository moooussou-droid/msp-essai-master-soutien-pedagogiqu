/**
 * E2E v51 — AUCUN ECRAN MORT.
 *
 * Visite TOUS les modules et sous-modules declares, plus tous les liens
 * de l'accueil, et verifie que chacun affiche du contenu reel.
 * Origine : « Ma boite a outils » et « Mes registres officiels »
 * s'ouvraient entierement vides, faute de route.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };

const modsSrc = readFileSync('src/utils/appModules.ts', 'utf8');
const chemins = [...new Set([...modsSrc.matchAll(/path: '(\/[a-z0-9\/-]+)'/g)].map(m => m[1]))].sort();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
await ctx.addInitScript(() => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, code: 'MSP-Catalyste@@007-2026', name: 'MOISE OUSSOU',
    activatedAt: Date.now(), plan: 'complet',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'MOISE OUSSOU', schoolName: 'EPP NIMBO' }));
  const g = localStorage.getItem;
  localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
});
const page = await ctx.newPage();
const erreursJs = [];
page.on('pageerror', e => erreursJs.push(String(e).slice(0, 100)));

const contenu = async (route) => {
  await page.goto(BASE + '/#' + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  // Le bandeau de licence est present partout : on l'exclut.
  return (await page.locator('body').innerText()).replace(/LICENCE[^\n]*/g, '').trim();
};

console.log('\n1. Les deux modules signalés par l’utilisateur');
ok((await contenu('/outils')).length > 40, '« Ma boîte à outils » affiche son contenu');
ok((await contenu('/registres')).length > 40, '« Mes registres officiels » affiche son contenu');
const outils = await contenu('/outils');
ok(/Chronom|Calculatrice|Numéris/i.test(outils), '« Ma boîte à outils » liste ses sous-modules');
const reg = await contenu('/registres');
ok(/Cahier journal/i.test(reg) && /Registre matricule/i.test(reg),
   '« Mes registres officiels » liste ses sous-modules');

console.log(`\n2. Tous les modules et sous-modules déclarés (${chemins.length})`);
const vides = [];
for (const c of chemins) {
  const t = await contenu(c);
  if (t.length < 40) vides.push(c);
}
ok(vides.length === 0, `aucun écran vide (vides : ${vides.join(', ') || 'aucun'})`);

console.log('\n3. Tous les liens de l’accueil mènent à du contenu');
await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const hrefs = [...new Set(await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))))]
  .map(h => (h || '').replace('#', '')).filter(h => h.startsWith('/'));
const liensMorts = [];
for (const h of hrefs) {
  const t = await contenu(h);
  if (t.length < 40) liensMorts.push(h);
}
ok(hrefs.length > 20, `l’accueil propose ${hrefs.length} liens`);
ok(liensMorts.length === 0, `aucun lien mort (morts : ${liensMorts.join(', ') || 'aucun'})`);

console.log('\n4. Les deux modules sont atteignables depuis l’accueil');
ok(hrefs.includes('/registres'), '« Registres » est présent sur l’accueil');
ok(hrefs.includes('/outils'), '« Mes outils » est présent sur l’accueil');

console.log('\n5. Navigation réelle : accueil → module → sous-module');
await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('a[href="#/registres"]').first().click();
await page.waitForTimeout(800);
ok((await page.locator('body').innerText()).includes('Cahier journal'),
   'le clic sur « Registres » ouvre bien le module');
await page.locator('a[href="#/cahier-journal"]').first().click();
await page.waitForTimeout(900);
ok((await page.locator('body').innerText()).includes('séance')
   || (await page.locator('body').innerText()).includes('Séance'),
   'le clic sur « Cahier journal » ouvre l’écran de saisie');
// Le bouton Retour doit revenir au module, jamais a l'accueil.
await page.locator('header button').first().click();
await page.waitForTimeout(800);
ok((page.url().split('#')[1] || '') === '/registres',
   'le bouton Retour revient au module précédent, pas à l’accueil');

console.log('\n6. Aucune erreur JavaScript sur l’ensemble du parcours');
ok(erreursJs.length === 0, `aucune erreur JS (${erreursJs.length} détectée(s)) ${erreursJs[0] || ''}`);

console.log(`\n════════════════════════════════════\nE2E v51 : ${pass} réussis, ${fail} échoués`);
await browser.close();
process.exit(fail ? 1 : 0);
