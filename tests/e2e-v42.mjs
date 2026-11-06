/**
 * E2E v42 — mode de légumineuse, signature payante, gestionnaire comptable.
 *
 * On vérifie en vrai navigateur :
 *  - que l'option « aucun changement » est bien celle par défaut ;
 *  - que le mode « changement » débloque le choix jour par jour ;
 *  - que la signature s'applique, et qu'elle est absente des créations IA ;
 *  - que la comptabilité calcule juste et exporte de vrais PDF/Excel.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdtempSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
  localStorage.setItem('msp_profile', JSON.stringify({
    teacherName: 'KOFFI Jean', schoolName: 'EPP Cotonou Centre',
  }));
  localStorage.setItem('msp_install_dismissed', 'true');
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(seed, ACTIVATION);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  return { ctx, page };
}

async function createWeek(page, { eff = '100', mais = '3', mode = null } = {}) {
  await page.locator('[data-testid="carte-nouvelle"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="champ-effectif"]').fill(eff);
  await page.locator('[data-testid="champ-mais"]').selectOption(mais);
  if (mode === 'changement') {
    await page.locator('[data-testid="mode-legume-changement"]').check();
    await page.waitForTimeout(200);
  }
  await page.locator('[data-testid="btn-creer-semaine"]').click();
  await page.waitForTimeout(700);
}

/** Calcule le code de déverrouillage comme le ferait le Super Administrateur. */
async function realCode(page, contentId) {
  return page.evaluate((id) => {
    const dev = localStorage.getItem('msp_device_id');
    function hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
    const raw = `${id}::${dev}::msp-unlock-v1`;
    const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    return `${a}-${b}`;
  }, contentId);
}

const run = async () => {
  const browser = await chromium.launch();
  const dlDir = mkdtempSync(join(tmpdir(), 'msp42-'));

  /* ====== Bloc 1 : mode « aucun changement » (cas par défaut) ====== */
  console.log('\n— Bloc 1 : légumineuse unique, option par défaut');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="carte-nouvelle"]').click();
    await page.waitForTimeout(500);

    ok(await page.locator('[data-testid="mode-legume-unique"]').isChecked(),
       'L’option « aucun changement » est cochée par défaut');
    ok(!(await page.locator('[data-testid="mode-legume-changement"]').isChecked()),
       'L’option « changement » n’est pas active par défaut');

    await page.locator('[data-testid="champ-effectif"]').fill('100');
    await page.locator('[data-testid="champ-mais"]').selectOption('3');
    await page.locator('[data-testid="btn-creer-semaine"]').click();
    await page.waitForTimeout(700);

    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(600);

    ok(await page.locator('[data-testid="legumineuse-jour-1"]').count() === 0,
       'En mode normal, aucun menu de légumineuse par jour n’est affiché');
    ok(await page.locator('[data-testid="legumineuse-fixe-1"]').count() === 1,
       'La légumineuse de la semaine est rappelée sur chaque journée');
    const fixe = await page.locator('[data-testid="legumineuse-fixe-1"]').textContent();
    ok(fixe.includes('Haricot'), `La légumineuse annoncée est la bonne (${fixe.trim().slice(0, 60)})`);

    // Les quantités doivent toutes porter sur la même légumineuse
    for (const d of [1, 2, 3]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('100');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('maize');
      await page.waitForTimeout(250);
    }
    const q1 = await page.locator('[data-testid="quantites-jour-1"]').textContent();
    const q3 = await page.locator('[data-testid="quantites-jour-3"]').textContent();
    ok(q1.includes('Haricot') && q3.includes('Haricot'),
       'Tous les jours servent la même légumineuse');

    await ctx.close();
  }

  /* ====== Bloc 2 : mode « changement » ====== */
  console.log('\n— Bloc 2 : changement de légumineuse (option explicite)');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/cantine/simulateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await createWeek(page, { mode: 'changement' });

    await page.locator('button:has-text("Saisir les prélèvements du jour")').first().click();
    await page.waitForTimeout(600);

    ok(await page.locator('[data-testid="legumineuse-jour-1"]').count() === 1,
       'Le mode « changement » affiche bien le choix jour par jour');

    for (const d of [1, 2, 3]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('100');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('maize');
      await page.locator(`[data-testid="legumineuse-jour-${d}"]`).selectOption('haricot');
      await page.waitForTimeout(250);
    }
    for (const d of [4, 5]) {
      await page.locator(`[data-testid="effectif-jour-${d}"]`).fill('100');
      await page.locator(`[data-testid="cereale-jour-${d}"]`).selectOption('rice');
      await page.locator(`[data-testid="legumineuse-jour-${d}"]`).selectOption('pois_jaune');
      await page.waitForTimeout(250);
    }

    const q4 = await page.locator('[data-testid="quantites-jour-4"]').textContent();
    ok(q4.includes('Pois jaune'), 'Le jeudi sert bien le pois jaune');

    await page.locator('button:has-text("Voir le point de la semaine")').first().click();
    await page.waitForTimeout(700);
    ok(await page.locator('[data-testid="note-changement-legumineuse"]').count() === 1,
       'Le changement est signalé dans le point hebdomadaire');
    const rh = await page.locator('[data-testid="reliquat-legume-haricot"]').textContent();
    const rp = await page.locator('[data-testid="reliquat-legume-pois_jaune"]').textContent();
    ok(rh.trim() === '0' && rp.trim() === '0',
       `Chaque légumineuse a son reliquat juste (haricot ${rh.trim()}, pois jaune ${rp.trim()})`);

    // Le mode est conservé après rechargement
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="carte-jour"]').click();
    await page.waitForTimeout(700);
    ok(await page.locator('[data-testid="legumineuse-jour-4"]').count() === 1,
       'Le mode « changement » est conservé après rechargement');

    await ctx.close();
  }

  /* ====== Bloc 3 : signature des documents ====== */
  console.log('\n— Bloc 3 : signature « Master Soutien Pédagogique »');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/mes-images/signature', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const ap = await page.locator('[data-testid="apercu-signature"]').textContent();
    ok(ap.includes('Master Soutien Pédagogique (Votre compagnon mobile)'),
       `La signature par défaut est la bonne (${ap.trim()})`);

    const exc = await page.locator('[data-testid="exception-ia"]').textContent();
    ok(/IA/.test(exc), 'L’exception des créations IA est expliquée à l’utilisateur');

    ok(await page.locator('[data-testid="bloc-paiement-signature"]').count() === 1,
       'La personnalisation est verrouillée tant qu’elle n’est pas payée');
    ok(await page.locator('[data-testid="champ-signature"]').count() === 0,
       'Aucun champ de personnalisation n’est accessible avant paiement');

    const body = await page.textContent('body');
    ok(body.includes('500 FCFA'), 'Le prix de 500 FCFA est affiché');

    await page.locator('[data-testid="btn-demander-signature"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="identifiant-signature"]').count() === 1,
       'L’identifiant de l’appareil est affiché pour le paiement');

    // Code erroné refusé
    await page.locator('[data-testid="champ-code-signature"]').fill('ZZZZ-ZZZZ');
    await page.locator('[data-testid="btn-valider-signature"]').click();
    await page.waitForTimeout(600);
    ok(await page.locator('[data-testid="champ-signature"]').count() === 0,
       'Un code erroné ne déverrouille pas la personnalisation');

    // Bon code
    const code = await realCode(page, 'signature-personnalisee');
    await page.locator('[data-testid="champ-code-signature"]').fill(code);
    await page.locator('[data-testid="btn-valider-signature"]').click();
    await page.waitForTimeout(900);
    ok(await page.locator('[data-testid="champ-signature"]').count() === 1,
       'Le bon code ouvre la personnalisation');

    await page.locator('[data-testid="champ-signature"]').fill('EPP Cotonou Centre — Direction');
    await page.locator('[data-testid="case-utiliser-signature"]').check();
    await page.waitForTimeout(600);
    const ap2 = await page.locator('[data-testid="apercu-signature"]').textContent();
    ok(ap2.includes('EPP Cotonou Centre'),
       `La signature personnalisée s’applique (${ap2.trim()})`);

    // Décocher rétablit la signature par défaut
    await page.locator('[data-testid="case-utiliser-signature"]').uncheck();
    await page.waitForTimeout(600);
    const ap3 = await page.locator('[data-testid="apercu-signature"]').textContent();
    ok(ap3.includes('Master Soutien Pédagogique'),
       'Décocher rétablit la signature par défaut');

    await ctx.close();
  }

  /* ====== Bloc 4 : la signature figure dans les vrais documents ====== */
  console.log('\n— Bloc 4 : signature réellement présente dans les fichiers');
  {
    const { ctx, page } = await newPage(browser);

    // 4a. Une image de la banque (document de l'application) : SIGNÉE
    await page.goto(BASE + '/#/mes-images/banque', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    await page.locator('[data-testid="vignette-bnk-04-cycle-eau"]').click();
    await page.waitForTimeout(700);
    // L'identifiant d'appareil n'est cree qu'au premier affichage du bloc de
    // paiement : on calcule donc le code APRES avoir ouvert ce bloc.
    await page.locator('[data-testid="btn-demander-acces"]').click();
    await page.waitForTimeout(600);
    const codeImg = await realCode(page, 'bnk-04-cycle-eau');
    await page.locator('[data-testid="champ-code"]').fill(codeImg);
    await page.locator('[data-testid="btn-valider-code"]').click();
    await page.waitForTimeout(900);

    const svgText = await page.locator('[data-testid="image-complete"]').getAttribute('src');
    const decoded = decodeURIComponent(svgText.replace(/^data:image\/svg\+xml[^,]*,/, ''));
    ok(decoded.includes('Master Soutien'),
       'L’image de la banque porte la signature de l’application');

    // 4b. Une création IA de l'utilisateur : NON SIGNÉE
    await page.goto(BASE + '/#/mes-images/generateur', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="champ-consigne"]').fill('une école avec le maître');
    await page.locator('[data-testid="btn-generer"]').click();
    await page.waitForTimeout(900);
    const genSrc = await page.locator('[data-testid="apercu-image"]').getAttribute('src');
    const genDec = decodeURIComponent(genSrc.replace(/^data:image\/svg\+xml[^,]*,/, ''));
    ok(!genDec.includes('Master Soutien'),
       'La création personnelle de l’utilisateur ne porte AUCUNE signature');

    await ctx.close();
  }

  /* ====== Bloc 5 : gestionnaire comptable ====== */
  console.log('\n— Bloc 5 : Mon gestionnaire comptable MSP');
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + '/#/comptabilite', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    let body = await page.textContent('body');
    ok(body.includes('Mon gestionnaire comptable MSP') || body.includes('comptable'),
       'Le module comptable s’ouvre');
    ok(body.includes('Le budget de mon école'), 'Le sous-module budget est listé');

    await page.goto(BASE + '/#/comptabilite/journal', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const today = await page.locator('[data-testid="champ-date-compta"]').inputValue();
    ok(/^\d{4}-\d{2}-\d{2}$/.test(today), `La journée du jour est proposée (${today})`);

    // --- Recette par classe ---
    await page.locator('[data-testid="onglet-recettes"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="btn-ajouter-recette"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="source-classe"]').click();
    await page.locator('[data-testid="champ-classe"]').fill('CM2');
    await page.locator('[data-testid="champ-volet-recette"]').selectOption('scolarite');
    await page.locator('[data-testid="champ-objet-recette"]').fill('Scolarité 1re tranche CM2');
    await page.locator('[data-testid="champ-montant-recette"]').fill('150000');
    await page.locator('[data-testid="btn-valider-recette"]').click();
    await page.waitForTimeout(700);
    ok((await page.locator('[data-testid="liste-recettes"]').textContent()).includes('CM2'),
       'La recette par classe est enregistrée');

    // --- Recette autre volet ---
    await page.locator('[data-testid="btn-ajouter-recette"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="source-autre"]').click();
    await page.locator('[data-testid="champ-volet-recette"]').selectOption('cantine');
    await page.locator('[data-testid="champ-objet-recette"]').fill('Tickets cantine du jour');
    await page.locator('[data-testid="champ-montant-recette"]').fill('12000');
    await page.locator('[data-testid="btn-valider-recette"]').click();
    await page.waitForTimeout(700);

    // --- Refus d'une saisie invalide ---
    await page.locator('[data-testid="btn-ajouter-recette"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="champ-objet-recette"]').fill('Essai sans montant');
    await page.locator('[data-testid="btn-valider-recette"]').click();
    await page.waitForTimeout(500);
    ok(await page.locator('[data-testid="erreurs-compta"]').count() === 1,
       'Une recette sans montant est refusée avec un message');
    await page.locator('[data-testid="form-recette"] button[aria-label="Fermer"]').click();
    await page.waitForTimeout(400);

    // --- Dépenses : une charge et un investissement ---
    await page.locator('[data-testid="onglet-depenses"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="btn-ajouter-depense"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="champ-poste-depense"]').selectOption('salaires');
    await page.locator('[data-testid="champ-objet-depense"]').fill('Salaire du mois');
    await page.locator('[data-testid="champ-montant-depense"]').fill('100000');
    await page.locator('[data-testid="btn-valider-depense"]').click();
    await page.waitForTimeout(700);

    await page.locator('[data-testid="btn-ajouter-depense"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="champ-poste-depense"]').selectOption('mobilier');
    await page.waitForTimeout(300);
    ok(await page.locator('[data-testid="note-investissement"]').count() === 1,
       'L’application explique qu’un bien durable ira à l’inventaire');
    await page.locator('[data-testid="champ-objet-depense"]').fill('20 tables-bancs');
    await page.locator('[data-testid="champ-montant-depense"]').fill('140000');
    await page.locator('[data-testid="btn-valider-depense"]').click();
    await page.waitForTimeout(700);

    // --- Totaux de la journée ---
    await page.locator('[data-testid="onglet-jour"]').click();
    await page.waitForTimeout(600);
    const tr = await page.locator('[data-testid="total-recettes"]').textContent();
    const td = await page.locator('[data-testid="total-depenses"]').textContent();
    const sd = await page.locator('[data-testid="solde-jour"]').textContent();
    const digits = (t) => t.replace(/[^\d-]/g, '');
    ok(digits(tr) === '162000', `Total des recettes = 162 000 (obtenu ${tr.trim()})`);
    ok(digits(td) === '240000', `Total des dépenses = 240 000 (obtenu ${td.trim()})`);
    ok(digits(sd) === '-78000', `Solde négatif affiché sans être masqué (${sd.trim()})`);
    ok(await page.locator('[data-testid="alerte-solde"]').count() === 1,
       'Le solde négatif déclenche une alerte visible');

    const parClasse = await page.locator('[data-testid="recettes-par-classe"]').textContent();
    ok(parClasse.includes('CM2'), 'Les recettes sont ventilées par classe');
    const autres = await page.locator('[data-testid="recettes-autres-volets"]').textContent();
    ok(autres.includes('Cantine'), 'Les autres volets sont ventilés à part');

    // --- Vrai PDF du journal ---
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('[data-testid="btn-pdf-jour"]').click(),
    ]);
    const p1 = join(dlDir, dl.suggestedFilename());
    await dl.saveAs(p1);
    const buf1 = readFileSync(p1);
    ok(buf1.slice(0, 4).toString() === '%PDF', 'Le journal de caisse est un vrai PDF');
    /*
     * Les flux du PDF sont compresses (v41) : le texte n'apparait pas en
     * clair dans le fichier. On decompresse donc les flux Deflate avant de
     * chercher la signature, sinon l'assertion serait fausse par construction.
     */
    const signInPdf = (() => {
      const zlib = require('node:zlib');
      const raw = buf1;
      let found = false;
      let i = 0;
      while (true) {
        const s0 = raw.indexOf('stream', i);
        if (s0 < 0) break;
        let a = s0 + 6;
        if (raw[a] === 0x0d) a++;
        if (raw[a] === 0x0a) a++;
        const e0 = raw.indexOf('endstream', a);
        if (e0 < 0) break;
        try {
          const out = zlib.inflateSync(raw.subarray(a, e0)).toString('latin1');
          if (out.includes('Master Soutien')) { found = true; break; }
        } catch { /* flux non compresse ou binaire : on passe */ }
        i = e0 + 9;
      }
      return found;
    })();
    ok(signInPdf, 'Le PDF comptable porte la signature de l’application');
    ok(await page.locator('[data-testid="btn-imprimer-jour"]').count() === 1,
       'L’option d’impression est conservée');

    await ctx.close();
  }

  /* ====== Bloc 6 : budget, bilan et inventaire OHADA ====== */
  console.log('\n— Bloc 6 : Le budget de mon école (OHADA)');
  {
    const { ctx, page } = await newPage(browser);

    // On rejoue une saisie complète dans ce contexte isolé
    await page.goto(BASE + '/#/comptabilite/journal', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="onglet-recettes"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="btn-ajouter-recette"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="source-classe"]').click();
    await page.locator('[data-testid="champ-classe"]').fill('CM2');
    await page.locator('[data-testid="champ-objet-recette"]').fill('Scolarité');
    await page.locator('[data-testid="champ-montant-recette"]').fill('500000');
    await page.locator('[data-testid="btn-valider-recette"]').click();
    await page.waitForTimeout(700);

    await page.locator('[data-testid="onglet-depenses"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="btn-ajouter-depense"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="champ-poste-depense"]').selectOption('salaires');
    await page.locator('[data-testid="champ-objet-depense"]').fill('Salaires');
    await page.locator('[data-testid="champ-montant-depense"]').fill('300000');
    await page.locator('[data-testid="btn-valider-depense"]').click();
    await page.waitForTimeout(700);

    await page.locator('[data-testid="btn-ajouter-depense"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="champ-poste-depense"]').selectOption('mobilier');
    await page.locator('[data-testid="champ-objet-depense"]').fill('20 tables-bancs');
    await page.locator('[data-testid="champ-montant-depense"]').fill('140000');
    await page.locator('[data-testid="btn-valider-depense"]').click();
    await page.waitForTimeout(700);

    // --- Budget ---
    await page.goto(BASE + '/#/comptabilite/budget', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    ok(await page.locator('[data-testid="exercice-courant"]').count() === 1,
       'L’exercice budgétaire est proposé automatiquement');

    await page.locator('[data-testid="btn-ajouter-prevision"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="prevision-recette"]').click();
    await page.locator('[data-testid="champ-poste-prevision"]').selectOption('scolarite');
    await page.locator('[data-testid="champ-montant-prevision"]').fill('600000');
    await page.locator('[data-testid="btn-valider-prevision"]').click();
    await page.waitForTimeout(700);

    await page.locator('[data-testid="btn-ajouter-prevision"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="prevision-depense"]').click();
    await page.locator('[data-testid="champ-poste-prevision"]').selectOption('salaires');
    await page.locator('[data-testid="champ-montant-prevision"]').fill('250000');
    await page.locator('[data-testid="btn-valider-prevision"]').click();
    await page.waitForTimeout(700);

    const digits = (t) => t.replace(/[^\d-]/g, '');
    const rr = await page.locator('[data-testid="recettes-realisees"]').textContent();
    ok(digits(rr) === '500000', `Recettes réalisées = 500 000 (obtenu ${rr.trim()})`);

    // Salaires : prévu 250 000, réalisé 300 000 → dépassement signalé
    ok(await page.locator('[data-testid="alerte-depassement-budget"]').count() === 1,
       'Un dépassement de dépense est signalé');
    const ligne = await page.locator('[data-testid="prevision-salaires"]').textContent();
    ok(ligne.includes('dépassement'), 'La ligne en dépassement est explicitement marquée');

    // --- Bilan OHADA ---
    await page.locator('[data-testid="onglet-bilan"]').click();
    await page.waitForTimeout(700);
    const tp = await page.locator('[data-testid="total-produits"]').textContent();
    const tc = await page.locator('[data-testid="total-charges"]').textContent();
    const rn = await page.locator('[data-testid="resultat-net"]').textContent();
    ok(digits(tp) === '500000', `Produits = 500 000 (obtenu ${tp.trim()})`);
    ok(digits(tc) === '300000',
       `Charges = 300 000 : les tables-bancs ne sont PAS une charge (obtenu ${tc.trim()})`);
    ok(digits(rn) === '200000', `Résultat net = 200 000 (obtenu ${rn.trim()})`);

    const ta = await page.locator('[data-testid="total-actif"]').textContent();
    const tpa = await page.locator('[data-testid="total-passif"]').textContent();
    ok(digits(ta) === digits(tpa),
       `Actif et passif s’équilibrent (${ta.trim()} = ${tpa.trim()})`);
    const eq = await page.locator('[data-testid="equilibre-bilan"]').textContent();
    ok(eq.includes('équilibrés'), 'L’équilibre du bilan est confirmé à l’écran');

    const bodyBilan = await page.textContent('body');
    ok(bodyBilan.includes('SYSCOHADA'),
       'Le document précise honnêtement son référentiel et ses limites');

    // Vrai PDF du bilan
    const [dlB] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-pdf-bilan"]').click(),
    ]);
    const pB = join(dlB.suggestedFilename().startsWith('/') ? '' : dlDir, dlB.suggestedFilename());
    await dlB.saveAs(pB);
    const bufB = readFileSync(pB);
    ok(bufB.slice(0, 4).toString() === '%PDF', 'Le bilan OHADA est un vrai PDF');
    ok(dlB.suggestedFilename().includes('bilan'), 'Le fichier est nommé clairement');

    // Vrai classeur Excel
    const [dlX] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('[data-testid="btn-excel-bilan"]').click(),
    ]);
    const pX = join(dlDir, dlX.suggestedFilename());
    await dlX.saveAs(pX);
    const bufX = readFileSync(pX);
    ok(existsSync(pX) && dlX.suggestedFilename().endsWith('.xlsx'),
       `Le classeur Excel est téléchargé (${dlX.suggestedFilename()})`);
    // Un .xlsx est une archive ZIP : signature PK
    ok(bufX[0] === 0x50 && bufX[1] === 0x4b,
       'Le fichier Excel est un vrai classeur .xlsx (signature ZIP)');
    ok(bufX.length > 5000, `Le classeur a un contenu réel (${bufX.length} octets)`);

    // --- Inventaire ---
    await page.locator('[data-testid="onglet-inventaire"]').click();
    await page.waitForTimeout(700);
    const inv = await page.locator('[data-testid="liste-inventaire"]').textContent();
    ok(inv.includes('20 tables-bancs'),
       'L’inventaire liste l’objet lui-même, et pas seulement un montant');
    const ti = await page.locator('[data-testid="total-inventaire"]').textContent();
    ok(digits(ti) === '140000', `Total de l’inventaire = 140 000 (obtenu ${ti.trim()})`);

    const [dlI] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }),
      page.locator('[data-testid="btn-pdf-inventaire"]').click(),
    ]);
    const pI = join(dlDir, dlI.suggestedFilename());
    await dlI.saveAs(pI);
    ok(readFileSync(pI).slice(0, 4).toString() === '%PDF',
       'L’inventaire OHADA est un vrai PDF');

    // Persistance
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="onglet-inventaire"]').click();
    await page.waitForTimeout(700);
    ok((await page.locator('[data-testid="liste-inventaire"]').textContent()).includes('tables-bancs'),
       'Les écritures sont conservées après rechargement');

    await ctx.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTATS v42 : ${pass} réussis, ${fail} échoués`);
  if (fail) { console.log('\nÉchecs :'); failures.forEach((f) => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
