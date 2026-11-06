/**
 * Captures d'écran v64 (aperçus pour le rapport) — serveur dev requis (5173).
 * node tests/captures-v64.mjs
 */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();

async function ctx(plan) {
  const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await c.addInitScript((p) => {
    if (p) {
      const codes = { complet: '112342', 'ecole-complete': '712349' };
      localStorage.setItem('msp_activation', JSON.stringify({
        activated: true, code: codes[p], name: 'HOUNSOU Marie',
        activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: p,
      }));
      localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'HOUNSOU Marie', schoolName: '' }));
    }
    const g = localStorage.getItem;
    localStorage.getItem = function (k) { return /msp_guide_hidden_/.test(k) ? 'true' : g.call(this, k); };
  }, plan || null);
  return c;
}

/* 1. Offres sur l'écran d'accès */
{
  const c = await ctx(null); const p = await c.newPage();
  await p.goto(BASE + '/#/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.getByTestId('forfaits-accueil').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: 'apercu-v64-forfaits-ecole.png' });
  await c.close();
}

/* 2. Espace école complet : création + génération + tableau de bord */
{
  const c = await ctx('ecole-complete'); const p = await c.newPage();
  await p.goto(BASE + '/#/espace-ecole', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.getByTestId('btn-creer-mon-ecole').click(); await p.waitForTimeout(400);
  await p.getByTestId('champ-nom-ecole').fill('Complexe Scolaire Les Lauriers');
  await p.getByTestId('kind-complete').click();
  await p.getByTestId('btn-enregistrer-ecole').click(); await p.waitForTimeout(600);
  await p.getByTestId('serie-A2').click(); await p.getByTestId('serie-D').click(); await p.waitForTimeout(300);
  await p.screenshot({ path: 'apercu-v64-generateur.png' });
  await p.getByTestId('btn-generer-classes').click(); await p.waitForTimeout(1800);
  await p.getByTestId('onglet-ecole-bord').click(); await p.waitForTimeout(600);
  await p.screenshot({ path: 'apercu-v64-espace-ecole.png' });
  await c.close();
}

/* 3. Leçon de conjugaison + unité d'anglais */
{
  const c = await ctx('complet'); const p = await c.newPage();
  await p.goto(BASE + '/#/francais-gco', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  await p.getByTestId('fr-lecon-c-passe-compose').click(); await p.waitForTimeout(500);
  await p.screenshot({ path: 'apercu-v64-francais.png' });
  await p.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(300);
  await p.goto(BASE + '/#/anglais-primaire', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  await p.getByTestId('en-unite-market-food').click(); await p.waitForTimeout(500);
  await p.screenshot({ path: 'apercu-v64-anglais.png' });
  await c.close();
}

await browser.close();
console.log('Captures v64 enregistrées.');
