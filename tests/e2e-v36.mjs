/**
 * E2E v36 — vérifications en conditions réelles :
 *   1. Modules et sous-modules (navigation réelle)
 *   2. Présences par demi-journées (matin / après-midi, mercredi, week-end)
 *   3. Les codes d'accès survivent à une MISE À JOUR de l'application
 *   4. Quiz : 100 niveaux, 10 questions, champion de la semaine
 *   5. Bulletin par évaluation + Bilan annuel
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const b = await chromium.launch();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✅ ' + m)) : (fail++, console.log('  ❌ ' + m)); };

const CLASS_ID = 'CLS-V36';

async function newCtx(extra = () => {}) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 950 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, name: 'KOFFI Jean', code: '111111',
      activatedAt: Date.now(), expiresAt: Date.now() + 31536000000, plan: 'complet',
    }));
    localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean', schoolName: 'EPP Test' }));
    localStorage.setItem('msp_install_dismissed', 'true');
    const g = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) => (typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : g(k));
  });
  await ctx.addInitScript(extra);
  return ctx;
}

async function seedClass(page) {
  await page.evaluate(async (id) => {
    const { openDB } = await import('/node_modules/idb/build/index.js');
    const db = await openDB('NoteFacileBenin', undefined);
    const cls = {
      id, name: 'CE1 A', school: 'EPP Test', level: 'CE1', educationType: 'primaire',
      schoolYear: '2025 - 2026', sequence: '1er Trim.',
      students: [
        { id: 's1', nom: 'AHOUANSOU', prenoms: 'Jean', sexe: 'M', matricule: '001' },
        { id: 's2', nom: 'KOFFI', prenoms: 'Mariam', sexe: 'F', matricule: '002' },
      ],
      subjects: [{ id: 'sub1', name: 'Dictée', order: 1 }],
      notes: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    await db.put('classes', cls);
  }, CLASS_ID);
}

/* ═══════ 1) MODULES ═══════ */
console.log('\n═══ E2E v36 — 1. Modules et sous-modules ═══');
{
  const ctx = await newCtx();
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/'); await p.waitForTimeout(1500);
  const home = await p.textContent('body');
  for (const m of ['Enrôlement', "Orientation de l'élève", 'Préparation de classe', 'Espace partenariat']) {
    ok(home.includes(m), `Accueil : le module « ${m} » est présenté`);
  }
  ok(!home.includes('Enrôlement intelligent<'), 'Accueil : la longue liste plate a disparu');

  await p.goto(BASE + '/#/enrolement'); await p.waitForTimeout(1200);
  let body = await p.textContent('body');
  ok(body.includes('Enrôlement intelligent des élèves'), 'Module Enrôlement : « Enrôlement intelligent des élèves »');
  ok(body.includes('Enrôlement du personnel'), 'Module Enrôlement : « Enrôlement du personnel »');
  ok(body.includes('2 sous-modules'), 'Module Enrôlement : 2 sous-modules annoncés');

  await p.goto(BASE + '/#/preparation-classe'); await p.waitForTimeout(1200);
  body = await p.textContent('body');
  ok(body.includes("Programme d'études") && body.includes('Planification annuelle')
     && body.includes('Fiches pédagogiques / Préparation') && body.includes('Générateur de fiches APC avec IA'),
     'Module Préparation de classe : les 4 sous-modules sont présents');

  await p.goto(BASE + '/#/orientation'); await p.waitForTimeout(1200);
  body = await p.textContent('body');
  ok(body.includes('Orientation scolaire') && body.includes('Orientation post-BAC'),
     "Module Orientation de l'élève : les 2 sous-modules sont présents");

  await p.goto(BASE + '/#/espace-partenariat'); await p.waitForTimeout(1200);
  body = await p.textContent('body');
  ok(body.includes('Annonces / Recrutement') && body.includes('Publicités'),
     'Module Espace partenariat : les 2 sous-modules sont présents');

  // Navigation réelle vers un sous-module
  await p.locator('a', { hasText: 'Publicités' }).first().click();
  await p.waitForTimeout(1200);
  ok(p.url().includes('/publicites'), 'Un sous-module s\'ouvre réellement depuis son module');
  await ctx.close();
}

/* ═══════ 2) PRÉSENCES PAR DEMI-JOURNÉES ═══════ */
console.log('\n═══ E2E v36 — 2. Présences : matin et après-midi ═══');
{
  const ctx = await newCtx();
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/'); await p.waitForTimeout(1200);
  await seedClass(p);
  await p.goto(BASE + '/#/class/' + CLASS_ID + '/presences');
  await p.waitForSelector('text=Registre de Présence'); await p.waitForTimeout(800);

  // Jeudi : deux demi-journées
  await p.locator('input[type="date"]').fill('2026-09-10'); await p.waitForTimeout(700);
  let body = await p.textContent('body');
  ok(body.includes('Matin') && body.includes('Après-midi'), 'Jeudi : matin ET après-midi proposés');
  for (const s of ['Présent', 'Absence avec justification', 'Absence sans justification',
                   'Journée fériée', 'Demi-journée de séance']) {
    ok(body.includes(s), `Option de présence disponible : « ${s} »`);
  }

  // Appel du MATIN
  const card = (n) => p.locator('div.rounded-xl.shadow.p-3', { hasText: n });
  await card('KOFFI').locator('button', { hasText: 'Absence sans justification' }).first().click();
  await p.waitForTimeout(500);
  ok((await card('KOFFI').textContent()).includes('Matin'), 'Le statut est rattaché à la demi-journée « Matin »');

  // Bascule sur l'APRÈS-MIDI : le même élève doit repartir de « Présent »
  await p.locator('button', { hasText: 'Après-midi' }).first().click();
  await p.waitForTimeout(700);
  ok((await card('KOFFI').textContent()).includes('Après-midi'), 'Bascule vers l\'après-midi effective');
  ok((await card('KOFFI').textContent()).includes('Après-midi — Présent'),
     'Matin et après-midi sont bien deux appels DISTINCTS');

  // Mercredi : une seule demi-journée
  await p.locator('input[type="date"]').fill('2026-09-09'); await p.waitForTimeout(700);
  body = await p.textContent('body');
  ok(body.includes("Le mercredi ne comporte qu'une seule demi-journée"),
     'MERCREDI : une seule demi-journée de classe');
  const amDisabled = await p.locator('button:has-text("Après-midi")').first().isDisabled();
  ok(amDisabled, 'Mercredi : l\'après-midi est désactivé');

  // Samedi et dimanche : pas de classe
  await p.locator('input[type="date"]').fill('2026-09-12'); await p.waitForTimeout(700);
  ok((await p.textContent('body')).includes('pas de classe'), 'SAMEDI : pas de classe');
  await p.locator('input[type="date"]').fill('2026-09-13'); await p.waitForTimeout(700);
  ok((await p.textContent('body')).includes('pas de classe'), 'DIMANCHE : pas de classe');

  // Persistance après rechargement
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('text=Registre de Présence'); await p.waitForTimeout(800);
  await p.locator('input[type="date"]').fill('2026-09-10'); await p.waitForTimeout(700);
  ok((await card('KOFFI').textContent()).includes('Absence sans justification'),
     'L\'appel du matin est conservé après rechargement');
  await ctx.close();
}

/* ═══════ 3) LES CODES SURVIVENT À UNE MISE À JOUR ═══════ */
console.log('\n═══ E2E v36 — 3. Les codes d\'accès survivent à la mise à jour ═══');
{
  const ctx = await newCtx(() => {
    localStorage.setItem('msp_admin_team', JSON.stringify([
      { id: 'owner', name: 'Admin principal', role: 'Super Administrateur', phone: '', email: '', permissions: [], active: true, createdAt: 1 },
      { id: 'm1', name: 'AGBO Technique', role: 'Gestionnaire Technique', phone: '', email: '', permissions: [], active: true, createdAt: 1, accessCode: '424242' },
    ]));
    localStorage.setItem('msp_generated_admin_passwords', JSON.stringify([
      { id: 'c1', owner: 'KOFFI Jean', type: 'user', value: '918273', createdAt: 1, expiresAt: Date.now() + 31536000000, plan: 'essentiel' },
    ]));
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/'); await p.waitForTimeout(1500);

  const mirrored = await p.evaluate(() => !!localStorage.getItem('msp_vault_mirror'));
  ok(mirrored, 'Une copie de sécurité des codes est créée au démarrage');

  // SIMULATION D'UNE MISE À JOUR : la zone principale est vidée
  // (comme le ferait un nettoyage de cache lors d'un déploiement).
  await p.evaluate(() => {
    localStorage.removeItem('msp_admin_team');
    localStorage.removeItem('msp_generated_admin_passwords');
    localStorage.removeItem('msp_activation');
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);

  const after = await p.evaluate(() => ({
    team: localStorage.getItem('msp_admin_team'),
    codes: localStorage.getItem('msp_generated_admin_passwords'),
    act: localStorage.getItem('msp_activation'),
  }));
  ok(!!after.team && after.team.includes('AGBO Technique'),
     "L'équipe d'administration est RESTAURÉE après la mise à jour");
  ok(!!after.codes && after.codes.includes('918273'),
     'Les codes générés sont RESTAURÉS après la mise à jour');
  ok(!!after.act && after.act.includes('111111'),
     "Le code de l'utilisateur est CONSERVÉ après la mise à jour");

  // Un code retiré par le Super Administrateur reste refusé.
  const revoked = await p.evaluate(async () => {
    const m = await import('/src/utils/credentialsVault.ts');
    m.revokeCode('918273', 'Super Administrateur');
    return m.codeStatus('918273').valid;
  });
  ok(revoked === false, 'Un code RETIRÉ par le Super Administrateur reste refusé');

  const stillValid = await p.evaluate(async () => {
    const m = await import('/src/utils/credentialsVault.ts');
    return m.codeStatus('111111').valid;
  });
  ok(stillValid === true, 'Les autres codes restent parfaitement valables');
  await ctx.close();
}

/* ═══════ 4) QUIZ 100 NIVEAUX ═══════ */
console.log('\n═══ E2E v36 — 4. Quiz : 100 niveaux, 10 questions ═══');
{
  const ctx = await newCtx();
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/dictionnaire'); await p.waitForTimeout(2000);
  const body = await p.textContent('body');
  ok(body.includes('100 niveaux'), 'Le quiz annonce ses 100 niveaux');
  ok(body.includes('10 questions par niveau'), 'Le quiz annonce 10 questions par niveau');

  await p.locator('button', { hasText: 'Tous les niveaux' }).first().click();
  await p.waitForTimeout(600);
  const locked = await p.locator('button:has-text("🔒")').count();
  ok(locked > 90, `Les niveaux non atteints sont verrouillés (${locked} verrouillés)`);

  await p.locator('button', { hasText: /^Jouer le niveau/ }).first().click();
  await p.waitForTimeout(900);
  const play = await p.textContent('body');
  ok(/Question 1 \/ 10/.test(play), 'Un niveau comporte bien 10 questions');
  ok(play.includes('Niveau 1'), 'Le niveau en cours est affiché');

  // Répondre aux 10 questions
  for (let i = 0; i < 10; i++) {
    const opts = p.locator('div.grid button');
    await opts.first().click();
    await p.waitForTimeout(250);
    const next = p.locator('button', { hasText: /Question suivante|Voir mon résultat/ });
    if (await next.count() > 0) { await next.first().click(); await p.waitForTimeout(250); }
  }
  await p.waitForTimeout(800);
  const done = await p.textContent('body');
  ok(/\/ 10/.test(done), 'Le score du niveau est affiché sur 10');

  const weekly = await p.evaluate(() => localStorage.getItem('msp_kids_quiz_weekly'));
  ok(!!weekly && weekly.includes('KOFFI Jean'),
     'Le score alimente le classement de la semaine (nom du joueur enregistré)');
  const wk = await p.evaluate(async () => {
    const m = await import('/src/utils/kidsQuiz.ts');
    const lundi = m.weekId(new Date('2026-09-07T10:00:00'));
    const dimanche = m.weekId(new Date('2026-09-13T10:00:00'));
    return lundi === dimanche;
  });
  ok(wk, 'La semaine de classement va bien du lundi au dimanche');
  await ctx.close();
}

/* ═══════ 5) BULLETINS PAR ÉVALUATION + BILAN ANNUEL ═══════ */
console.log('\n═══ E2E v36 — 5. Un bulletin par évaluation + Bilan annuel ═══');
{
  const ctx = await newCtx();
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/'); await p.waitForTimeout(1200);
  await seedClass(p);

  await p.goto(BASE + '/#/class/' + CLASS_ID + '/bulletins');
  await p.waitForTimeout(1800);
  const body = await p.textContent('body');
  ok(!body.includes('Toutes (synthèse)'), 'Bulletins : le mode « synthèse » a disparu');
  ok(body.includes('chaque évaluation a son propre bulletin'),
     'Maternelle/Primaire : chaque évaluation a SON bulletin');
  ok(body.includes('Bilan annuel'), 'Un lien renvoie vers le Bilan annuel');

  await p.goto(BASE + '/#/class/' + CLASS_ID + '/bilan-annuel');
  await p.waitForTimeout(1500);
  const annual = await p.textContent('body');
  ok(annual.includes('Bilan annuel'), 'Le module Bilan annuel s\'ouvre');
  ok(annual.includes('Moyennes et présences'), 'Bilan annuel : moyennes ET présences');
  ok(annual.includes('Présence moyenne'), 'Bilan annuel : synthèse des présences');
  ok(annual.includes('AHOUANSOU') && annual.includes('KOFFI'), 'Bilan annuel : les élèves sont listés');
  await ctx.close();
}

console.log('\n════════════════════════════════════');
console.log(`E2E v36 : ${pass} réussis, ${fail} échoués`);
await b.close();
process.exit(fail > 0 ? 1 : 0);
