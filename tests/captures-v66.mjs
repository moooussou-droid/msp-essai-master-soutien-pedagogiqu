/**
 * Captures v66 — relevé des effectifs payeurs-mangeurs.
 * Serveur de dev requis (5173) : node tests/captures-v66.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, code: '112342', name: 'HOUNSOU Marie',
      activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: 'complet',
    }));
    localStorage.setItem('msp_profile', JSON.stringify({
      teacherName: 'HOUNSOU Marie', schoolName: 'EPP Cotonou Centre',
    }));
    localStorage.setItem('msp_install_dismissed', 'true');
    const get = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) => (
      typeof k === 'string' && k.startsWith('msp_guide_hidden_') ? 'true' : get(k)
    );
  });
  const page = await ctx.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  return { ctx, page };
}

{
  const { ctx, page } = await newPage();
  const today = new Date().toISOString().slice(0, 10);
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.evaluate((date) => {
    localStorage.setItem('msp_canteen_enrollment', JSON.stringify([{
      id: 'capture-general-v66', date, schoolName: 'EPP Cotonou Centre', schoolYear: '2026-2027',
      counts: [
        { level: 'ci', boys: 30, girls: 30 },
        { level: 'cm2', boys: 20, girls: 20 },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    }]));
  }, today);

  await page.goto(BASE + '/#/cantine', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByText('Relevé des effectifs payeurs-mangeurs').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'apercu-v66-section-cantine.png' });

  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.goto(BASE + '/#/cantine/payeurs-mangeurs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  await page.getByTestId('systeme-payeur-mangeur').click();
  await page.getByTestId('presents-garcons-ci').fill('25');
  await page.getByTestId('presents-filles-ci').fill('20');
  await page.getByTestId('payeurs-garcons-ci').fill('18');
  await page.getByTestId('payeurs-filles-ci').fill('15');
  await page.getByTestId('presents-garcons-cm2').fill('10');
  await page.getByTestId('presents-filles-cm2').fill('12');
  await page.getByTestId('payeurs-garcons-cm2').fill('7');
  await page.getByTestId('payeurs-filles-cm2').fill('9');
  await page.getByTestId('btn-enregistrer-payeurs').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'apercu-v66-payeur-mangeur.png' });

  await page.getByTestId('totaux-payeurs-mangeurs').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'apercu-v66-totaux-mangeurs.png' });

  await page.getByTestId('systeme-apport-communautaire').scrollIntoViewIfNeeded();
  await page.getByTestId('systeme-apport-communautaire').click();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'apercu-v66-apport-communautaire.png' });

  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.goto(BASE + '/#/guide/manuel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByTestId('recherche-manuel').fill('payeurs-mangeurs');
  await page.waitForTimeout(550);
  await page.screenshot({ path: 'apercu-v66-guide-payeurs.png' });
  await ctx.close();
}

await browser.close();
console.log('Captures v66 enregistrées.');
