/**
 * E2E v41 — vraie génération PDF, changement de légumineuse, images éducatives.
 *
 * Ce que seul un vrai navigateur peut prouver :
 *  - qu'un fichier .pdf est RÉELLEMENT téléchargé (et non une fenêtre d'impression) ;
 *  - que le PDF produit est un document valide (signature %PDF) ;
 *  - que le changement de légumineuse recalcule correctement les reliquats ;
 *  - que les images se dessinent et que le verrou de paiement tient.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
}

async function newPage(browser, dl) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(seed, ACTIVATION);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}

/** Crée la semaine de base dans le simulateur. */
async function createWeek(page, { eff = '100', mais = '3', mode = null } = {}) {
  await page.locator('[data-testid="carte-nouvelle"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="champ-effectif"]').fill(eff);
  await page.locator('[data-testid="champ-mais"]').selectOption(mais);
  /*
   * v42 — le choix de la legumineuse jour par jour n'est propose que si
   * l'utilisateur a explicitement demande un changement en cours de semaine
   * (le cas normal etant une legumineuse unique). Ce bloc teste precisement
   * le changement : on active donc le mode correspondant.
   */
  if (mode === 'changement') {
    await page.locator('[data-testid="mode-legume-changement"]').check();
    await page.waitForTimeout(200);
  }
  await page.locator('[data-testid="btn-creer-semaine"]').click();
  await page.waitForTimeout(700);
}

const run = async () => {
  const browser = await chromium.launch();
  const dlDir = mkdtempSync(join(tmpdir(), 'msp-dl-'));

  /* ============ Bloc 1 : VRAI fichier PDF ============ */
  console.log('\n— Bloc 1 : génération d’un vrai fichier PDF');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await createWeek(page);

    // Saisir deux journées pour que le PDF ait du contenu
    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="effectif-jour-1"]').fill('100');
    await page.locator('[data-testid="cereale-jour-1"]').selectOption('maize');
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Retour"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="carte-rapports"]').click();
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('[data-testid="btn-export-pdf"]').click(),
    ]);
    const name = download.suggestedFilename();
    ok(name.endsWith('.pdf'), `Le fichier téléchargé est un .pdf (${name})`);

    const path = join(dlDir, name);
    await download.saveAs(path);
    ok(existsSync(path), 'Le fichier PDF est bien écrit sur le disque');

    const buf = readFileSync(path);
    ok(buf.slice(0, 4).toString() === '%PDF', 'Le fichier commence par la signature %PDF (document valide)');
    ok(buf.length > 3000, `Le PDF a un contenu réel (${buf.length} octets)`);
    const txt = buf.toString('latin1');
    ok(/\/Type\s*\/Page/.test(txt), 'Le PDF contient au moins une page structurée');

    // L'impression reste proposée séparément
    ok(await page.locator('[data-testid="btn-imprimer"]').count() === 1, 'Le bouton Imprimer est toujours présent');
    await ctx.close();
  }

  /* ============ Bloc 2 : changement de légumineuse ============ */
  console.log('\n— Bloc 2 : changement de légumineuse en cours de semaine');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await createWeek(page, { mode: 'changement' });

    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(500);

    ok(await page.locator('[data-testid="legumineuse-jour-1"]').count() === 1,
       'Chaque journée propose sa propre légumineuse (mode changement)');

    // J1-J3 au haricot, J4-J5 au pois jaune (stock de haricot épuisé)
    for (const d of [1, 2, 3]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('100');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('maize');
      await page.locator(`[data-testid="legumineuse-jour-${d}"]`).selectOption('haricot');
      await page.waitForTimeout(260);
    }
    for (const d of [4, 5]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('100');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('rice');
      await page.locator(`[data-testid="legumineuse-jour-${d}"]`).selectOption('pois_jaune');
      await page.waitForTimeout(260);
    }

    ok(await page.locator('[data-testid="changement-jour-4"]').count() === 1,
       'Le remplacement de la légumineuse est signalé sur la journée');

    const q4 = await page.locator('[data-testid="quantites-jour-4"]').textContent();
    ok(q4.includes('Pois jaune'), `Le jeudi sort bien du pois jaune (${q4.replace(/\s+/g, ' ').trim().slice(0, 80)})`);
    const q1 = await page.locator('[data-testid="quantites-jour-1"]').textContent();
    ok(q1.includes('Haricot'), 'Le lundi sort toujours du haricot');

    await page.locator('button:has-text("Voir le point de la semaine")').first().click();
    await page.waitForTimeout(700);

    ok(await page.locator('[data-testid="note-changement-legumineuse"]').count() === 1,
       'Le point hebdomadaire signale le changement de légumineuse');
    const note = await page.locator('[data-testid="note-changement-legumineuse"]').textContent();
    ok(note.includes('Haricot') && note.includes('Pois jaune'), 'Les deux légumineuses sont nommées');

    const body = await page.textContent('body');
    ok(body.includes('Haricot') && body.includes('Pois jaune'),
       'La synthèse affiche une ligne pour chaque légumineuse');

    // Les reliquats doivent être justes (aucun faux dépassement)
    const relHaricot = await page.locator('[data-testid="reliquat-legume-haricot"]').textContent();
    const relPois = await page.locator('[data-testid="reliquat-legume-pois_jaune"]').textContent();
    ok(relHaricot.trim() === '0', `Haricot : reliquat nul, pas de faux dépassement (obtenu ${relHaricot.trim()})`);
    ok(relPois.trim() === '0', `Pois jaune : reliquat nul (obtenu ${relPois.trim()})`);
    ok(await page.locator('[data-testid="alerte-depassement"]').count() === 0,
       'Aucune alerte de dépassement injustifiée');

    // Persistance
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="carte-jour"]').click();
    await page.waitForTimeout(700);
    const persisted = await page.locator('[data-testid="legumineuse-jour-4"]').inputValue();
    ok(persisted === 'pois_jaune', `La légumineuse du jeudi est conservée après rechargement (${persisted})`);

    await ctx.close();
  }

  /* ============ Bloc 3 : module Mes images ============ */
  console.log('\n— Bloc 3 : module Mes images éducatives');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/mes-images', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const body = await page.textContent('body');
    ok(/images/i.test(body), 'Le module Mes images éducatives s’ouvre');
    ok(body.includes('IA MSP de génération'), 'Le sous-module de génération est listé');
    ok(body.includes('Banque d’images éducatives'), 'La banque d’images est listée');
    await ctx.close();
  }

  /* ============ Bloc 4 : génération d’images ============ */
  console.log('\n— Bloc 4 : IA de génération de gravures');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/mes-images/generateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.locator('[data-testid="champ-consigne"]').fill('une école avec le maître et les élèves');
    await page.locator('[data-testid="champ-style"]').selectOption('gravure');
    await page.locator('[data-testid="btn-generer"]').click();
    await page.waitForTimeout(900);

    ok(await page.locator('[data-testid="resultat-image"]').count() === 1, 'Une image est produite');
    const src = await page.locator('[data-testid="apercu-image"]').getAttribute('src');
    ok(src && src.startsWith('data:image/svg+xml'), 'L’image est une vraie image affichable');
    const interp = await page.locator('[data-testid="interpretation"]').textContent();
    ok(/ecole|école/i.test(interp), `Le moteur explique avoir compris « école » (${interp.slice(0, 70)})`);

    // Vérifier que l'image dessinée n'est pas vide
    const dims = await page.locator('[data-testid="apercu-image"]').evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
    ok(dims.w > 100 && dims.h > 100, `L’image a de vraies dimensions (${dims.w}x${dims.h})`);

    // Téléchargement PDF réel de l'image
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('[data-testid="btn-pdf-image"]').click(),
    ]);
    const p2 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p2);
    const buf2 = readFileSync(p2);
    ok(buf2.slice(0, 4).toString() === '%PDF', 'L’image générée s’exporte en vrai PDF');
    ok(buf2.length > 8000, `Le PDF contient bien l’image (${buf2.length} octets)`);

    // Consigne non comprise : le moteur doit le dire
    await page.locator('[data-testid="champ-consigne"]').fill('qqqqq zzzz');
    await page.locator('[data-testid="btn-generer"]').click();
    await page.waitForTimeout(700);
    const interp2 = await page.locator('[data-testid="interpretation"]').textContent();
    ok(/Aucun mot/i.test(interp2), 'Le moteur avertit honnêtement quand il n’a pas compris');

    // Persistance de l'historique
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    ok(await page.locator('[data-testid="historique-images"]').count() === 1,
       'Les images créées sont conservées après rechargement');

    await ctx.close();
  }

  /* ============ Bloc 5 : banque d’images et paiement ============ */
  console.log('\n— Bloc 5 : banque d’images (100 FCFA)');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/mes-images/banque', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);

    const cards = await page.locator('[data-testid^="vignette-"]').count();
    ok(cards === 12, `La banque contient 12 images (obtenu ${cards})`);

    const body = await page.textContent('body');
    ok(body.includes('100 FCFA'), 'Le prix de 100 FCFA est affiché');

    // Filtre par catégorie
    await page.locator('[data-testid="filtre-Bénin"]').click();
    await page.waitForTimeout(500);
    const benin = await page.locator('[data-testid^="vignette-"]').count();
    ok(benin > 0 && benin < 12, `Le filtre Bénin réduit la liste (${benin} images)`);

    await page.locator('[data-testid="filtre-Toutes"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="recherche-banque"]').fill('eau');
    await page.waitForTimeout(500);
    ok(await page.locator('[data-testid^="vignette-"]').count() >= 1, 'La recherche « eau » trouve une image');
    await page.locator('[data-testid="recherche-banque"]').fill('');
    await page.waitForTimeout(400);

    // Ouvrir une image : elle doit être verrouillée
    await page.locator('[data-testid="vignette-bnk-04-cycle-eau"]').click();
    await page.waitForTimeout(800);
    ok(await page.locator('[data-testid="image-apercu"]').count() === 1, 'L’image non payée est affichée en aperçu filigrané');
    ok(await page.locator('[data-testid="image-complete"]').count() === 0, 'L’image complète n’est pas accessible sans paiement');
    ok(await page.locator('[data-testid="bloc-paiement"]').count() === 1, 'Le bloc de paiement est affiché');
    ok(await page.locator('[data-testid="btn-dl-pdf"]').count() === 0, 'Aucun bouton de téléchargement avant paiement');

    // Demander l'accès
    await page.locator('[data-testid="btn-demander-acces"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="coordonnees-paiement"]').count() === 1, 'Les modalités de paiement s’affichent');
    const devId = await page.locator('[data-testid="identifiant-appareil"]').textContent();
    ok(/MSP-/.test(devId), `L’identifiant de l’appareil est affiché (${devId.trim()})`);

    // Code erroné refusé
    await page.locator('[data-testid="champ-code"]').fill('AAAA-BBBB');
    await page.locator('[data-testid="btn-valider-code"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="image-complete"]').count() === 0, 'Un code erroné ne déverrouille pas l’image');

    // Code correct calculé comme le ferait le Super Administrateur
    const realCode = await page.evaluate(() => {
      const id = localStorage.getItem('msp_device_id');
      function hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
      }
      const raw = `bnk-04-cycle-eau::${id}::msp-unlock-v1`;
      const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
      const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
      return `${a}-${b}`;
    });
    await page.locator('[data-testid="champ-code"]').fill(realCode);
    await page.locator('[data-testid="btn-valider-code"]').click();
    await page.waitForTimeout(900);

    ok(await page.locator('[data-testid="image-complete"]').count() === 1, 'Le bon code déverrouille l’image complète');
    ok(await page.locator('[data-testid="btn-dl-pdf"]').count() === 1, 'Le téléchargement PDF devient disponible');
    ok(await page.locator('[data-testid="btn-dl-jpeg"]').count() === 1, 'Le téléchargement JPEG est proposé');

    // Téléchargement PDF réel
    const [dl3] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-dl-pdf"]').click(),
    ]);
    const p3 = join(dlDir, dl3.suggestedFilename());
    await dl3.saveAs(p3);
    const buf3 = readFileSync(p3);
    ok(buf3.slice(0, 4).toString() === '%PDF', 'L’image de la banque s’exporte en vrai PDF');

    // Téléchargement JPEG réel
    const [dl4] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-dl-jpeg"]').click(),
    ]);
    const p4 = join(dlDir, dl4.suggestedFilename());
    await dl4.saveAs(p4);
    const buf4 = readFileSync(p4);
    ok(buf4[0] === 0xff && buf4[1] === 0xd8, 'Le fichier JPEG a une signature valide');
    ok(dl4.suggestedFilename().endsWith('.jpg'), 'Le fichier porte bien l’extension .jpg');

    // Le déverrouillage survit au rechargement
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="vignette-bnk-04-cycle-eau"]').click();
    await page.waitForTimeout(800);
    ok(await page.locator('[data-testid="image-complete"]').count() === 1,
       'L’image payée reste débloquée après rechargement');

    // Les autres images restent verrouillées
    await page.locator('button[aria-label="Retour"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="vignette-bnk-02-marche-dantokpa"]').click();
    await page.waitForTimeout(700);
    ok(await page.locator('[data-testid="image-apercu"]').count() === 1,
       'Payer une image ne déverrouille pas les autres');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v41 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
