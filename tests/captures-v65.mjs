/**
 * Captures v65 — arrondi de sortie des denrées et guide mis à jour.
 * Serveur de dev requis (5173) : node tests/captures-v65.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();

async function newPage({ hideGuides = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
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
  await page.waitForTimeout(1000);
  await page.getByTestId('guide-arrondi-cantine').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'apercu-v65-arrondi-cantine.png' });

  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.goto(BASE + '/#/cantine/stocks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('[data-testid="denree-maïs"]').click();
  await page.waitForTimeout(500);
  await page.getByTestId('stock-entree').fill('49.8');
  await page.getByTestId('stock-sortie').fill('8.46');
  await page.waitForTimeout(300);
  await page.getByTestId('stock-sortie-arrondie').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'apercu-v65-stock-arrondi.png' });

  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.goto(BASE + '/#/guide/manuel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByTestId('recherche-manuel').fill('arrondi de sortie');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'apercu-v65-guide-cantine.png' });
  await ctx.close();
}

{
  const { ctx, page } = await newPage({ hideGuides: false });
  await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: 'apercu-v65-guide-contextuel-cantine.png' });
  await ctx.close();
}

await browser.close();
console.log('Captures v65 enregistrées.');
