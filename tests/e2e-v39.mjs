/**
 * E2E v39 — vérifie DANS LE NAVIGATEUR RÉEL :
 *  1. Bibliothèque : le livre est un PDF, payé avant téléchargement.
 *  2. Quiz : la question ne contient jamais la réponse.
 *  3. Concours : « Je participe », fenêtre samedi 18h → dimanche 21h, compteur honnête.
 *  4. Bandes défilantes.
 *  5. Éducation à la vie : 3 sous-modules, 150 contenus.
 *  6. Administration universelle.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;

async function t(label, fn) {
  try { await fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + ' — ' + (e.message || e).split('\n')[0]); fail++; }
}

const SEED = () => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, name: 'KOFFI Jean', code: '111111',
    activatedAt: Date.now(), expiresAt: Date.now() + 31536000000, plan: 'complet',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean' }));
  localStorage.setItem('msp_install_dismissed', 'true');
  const get = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) => (k.startsWith('msp_guide_hidden') ? 'true' : get(k));
};

/** Fige l'horloge du navigateur à une date/heure précise. */
function freezeClock(iso) {
  const fixed = new Date(iso).getTime();
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(fixed); }
    static now() { return fixed; }
  }
  // eslint-disable-next-line no-global-assign
  Date = FakeDate;
}

const browser = await chromium.launch();
console.log('\n=== E2E v39 ===\n');

/* ================= BLOC 1 — Éducation à la vie ================= */
console.log('BLOC 1 — Module Éducation à la vie');
const ctx1 = await browser.newContext();
await ctx1.addInitScript(SEED);
const p1 = await ctx1.newPage();
await p1.goto(`${BASE}/#/`);
await p1.waitForTimeout(2500);

await t('Le module « Éducation à la vie » figure sur l’accueil', async () => {
  const body = await p1.locator('body').innerText();
  if (!body.includes('Éducation à la vie')) throw new Error('module absent de l’accueil');
});

await t('Le module présente ses 3 sous-modules', async () => {
  await p1.goto(`${BASE}/#/education-vie`);
  await p1.waitForTimeout(1500);
  const body = await p1.locator('body').innerText();
  for (const s of ['Éducation environnementale', 'Éducation financière', 'Éducation entrepreneuriale']) {
    if (!body.includes(s)) throw new Error(s + ' absent');
  }
});

for (const [slug, nom] of [['environnementale', 'environnementale'], ['financiere', 'financière'], ['entrepreneuriale', 'entrepreneuriale']]) {
  await t(`Le sous-module ${nom} propose bien 50 cours`, async () => {
    await p1.goto(`${BASE}/#/education-vie/${slug}`);
    await p1.waitForTimeout(1500);
    const body = await p1.locator('body').innerText();
    if (!body.includes('50 cours et articles')) throw new Error('compteur de 50 absent');
    if (!/50 résultat/.test(body)) throw new Error('la liste n’affiche pas 50 résultats');
  });
}

await t('Un cours s’ouvre avec objectif, exemple, activité et point à retenir', async () => {
  await p1.goto(`${BASE}/#/education-vie/financiere`);
  await p1.waitForTimeout(1500);
  await p1.locator('button:has-text("Pourquoi et comment épargner")').first().click();
  await p1.waitForTimeout(800);
  const body = await p1.locator('body').innerText();
  for (const s of ['Objectif', 'La leçon', 'Exemple concret', 'Activité pratique', 'À retenir']) {
    if (!body.includes(s)) throw new Error(s + ' absent de la fiche');
  }
});

await t('La recherche filtre les cours', async () => {
  await p1.goto(`${BASE}/#/education-vie/environnementale`);
  await p1.waitForTimeout(1500);
  await p1.fill('input[placeholder*="Rechercher"]', 'mangrove');
  await p1.waitForTimeout(700);
  const body = await p1.locator('body').innerText();
  if (!body.includes('mangrove') && !body.includes('Mangrove')) throw new Error('recherche sans résultat');
  if (/50 résultat/.test(body)) throw new Error('le filtre n’a pas réduit la liste');
});

await ctx1.close();

/* ================= BLOC 2 — Quiz sans fuite de réponse ================= */
console.log('\nBLOC 2 — Le quiz ne donne plus la réponse dans la question');
const ctx2 = await browser.newContext();
await ctx2.addInitScript(SEED);
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/#/dictionnaire`);
await p2.waitForTimeout(2500);

await t('Le quiz démarre', async () => {
  await p2.locator('button:has-text("Niveau 1")').first().click({ timeout: 8000 }).catch(async () => {
    await p2.locator('button:has-text("Commencer")').first().click();
  });
  await p2.waitForTimeout(1200);
});

await t('La question posée ne contient pas le mot à trouver', async () => {
  const enonce = await p2.locator('p.text-lg').first().innerText();
  const options = await p2.locator('button').allInnerTexts();
  const flat = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Aucun des mots proposés en réponse ne doit apparaître dans l'énoncé.
  const fuites = options
    .map((o) => o.trim())
    .filter((o) => o && o.length > 3 && o.split(' ').length === 1)
    .filter((o) => flat(enonce).includes(flat(o).replace(/(s|e|es)$/, '')));
  if (fuites.length) throw new Error('la réponse apparaît dans l’énoncé : ' + fuites.join(', '));
});

await t('La question est bien une phrase interrogative', async () => {
  const enonce = await p2.locator('p.text-lg').first().innerText();
  if (!enonce.trim().endsWith('?')) throw new Error('pas de point d’interrogation : ' + enonce);
});

await ctx2.close();

/* ================= BLOC 3 — Concours : fenêtre FERMÉE ================= */
console.log('\nBLOC 3 — Concours hebdomadaire (hors fenêtre d’inscription)');
const ctxF = await browser.newContext();
await ctxF.addInitScript(SEED);
await ctxF.addInitScript(freezeClock, '2026-09-16T12:00:00');   // mercredi
const pF = await ctxF.newPage();
await pF.goto(`${BASE}/#/dictionnaire`, { waitUntil: 'domcontentloaded' });
await pF.waitForSelector('[data-testid="contest-panel"]', { timeout: 20000 }).catch(() => {});
await pF.waitForTimeout(1200);

await t('Le panneau du concours est affiché', async () => {
  await pF.waitForSelector('[data-testid="contest-panel"]', { timeout: 20000 });
});

await t('En semaine, les inscriptions sont annoncées fermées', async () => {
  const txt = await pF.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('Inscriptions fermées')) throw new Error('la fermeture n’est pas annoncée');
});

await t('Le bouton « Je participe » est désactivé hors fenêtre', async () => {
  const btn = pF.locator('[data-testid="btn-participer"]');
  if (!(await btn.isDisabled())) throw new Error('le bouton est actif hors fenêtre');
});

await t('La fenêtre samedi 18h → dimanche 21h est rappelée', async () => {
  const txt = await pF.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('samedi 18h00') || !txt.includes('dimanche 21h00')) throw new Error('fenêtre non rappelée');
});

await ctxF.close();

/* ================= BLOC 4 — Concours : fenêtre OUVERTE ================= */
console.log('\nBLOC 4 — Concours hebdomadaire (pendant la fenêtre)');
const ctxO = await browser.newContext();
await ctxO.addInitScript(SEED);
await ctxO.addInitScript(freezeClock, '2026-09-19T19:30:00');   // samedi 19h30
const pO = await ctxO.newPage();
await pO.goto(`${BASE}/#/dictionnaire`, { waitUntil: 'domcontentloaded' });
await pO.waitForSelector('[data-testid="contest-panel"]', { timeout: 20000 }).catch(() => {});
await pO.waitForTimeout(1200);

await t('Samedi après 18h, les inscriptions sont ouvertes', async () => {
  const txt = await pO.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('Inscriptions OUVERTES')) throw new Error('ouverture non annoncée');
});

await t('Avant inscription, le compteur ne prétend pas connaître les autres', async () => {
  const txt = await pO.locator('[data-testid="contest-count"]').innerText();
  if (!txt.includes('officiel')) throw new Error('le compteur ne mentionne pas le total officiel');
});

await t('Le clic sur « Je participe » enregistre la participation', async () => {
  await pO.fill('input[placeholder="Ton nom et prénom"]', 'AGBO Marie');
  await pO.click('[data-testid="btn-participer"]');
  await pO.waitForTimeout(800);
  const txt = await pO.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('Tu es inscrit')) throw new Error('inscription non confirmée');
});

await t('Le compteur affiche alors 1 inscription connue', async () => {
  const txt = await pO.locator('[data-testid="contest-count"]').innerText();
  if (!/1 inscription/.test(txt)) throw new Error('compteur incorrect : ' + txt);
});

await t('L’inscription vaut pour la semaine SUIVANTE', async () => {
  const txt = await pO.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('2026-S39')) throw new Error('semaine du concours incorrecte');
});

await t('La participation survit au rechargement', async () => {
  await pO.reload();
  await pO.waitForTimeout(2200);
  const txt = await pO.locator('[data-testid="contest-panel"]').innerText();
  if (!txt.includes('Tu es inscrit')) throw new Error('inscription perdue');
});

await ctxO.close();

/* ================= BLOC 5 — Bandes défilantes ================= */
console.log('\nBLOC 5 — Messages défilants');
const ctx5 = await browser.newContext();
await ctx5.addInitScript(SEED);
await ctx5.addInitScript(() => {
  localStorage.setItem('msp_announcements', JSON.stringify([{
    id: 'a1', text: 'Les compositions du 1er trimestre débutent le 12 janvier.',
    level: 'urgent', startAt: 0, endAt: 0, enabled: true, createdAt: Date.now(),
  }]));
});
const p5 = await ctx5.newPage();
await p5.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await p5.waitForTimeout(3000);

await t('La bande défilante s’affiche', async () => {
  await p5.waitForSelector('[data-msp-ticker]', { timeout: 8000 });
});

await t('Le message important est visible', async () => {
  const txt = await p5.locator('[data-msp-ticker]').innerText();
  if (!txt.includes('compositions du 1er trimestre')) throw new Error('message absent');
});

await t('Le bandeau est réellement animé', async () => {
  const anim = await p5.locator('.msp-ticker-track').first().evaluate(
    (el) => getComputedStyle(el).animationName,
  );
  if (!anim || anim === 'none') throw new Error('aucune animation de défilement');
});

await t('La bande peut être masquée par l’utilisateur', async () => {
  await p5.click('[data-msp-ticker] button[aria-label="Masquer les annonces"]');
  await p5.waitForTimeout(500);
  if (await p5.locator('[data-msp-ticker]').count()) throw new Error('la bande reste affichée');
});

await t('Un message désactivé ne défile pas', async () => {
  // On désactive le message PUIS on notifie, sans recharger : le script
  // d'amorçage du contexte réécrirait sinon l'annonce active.
  await p5.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('msp_announcements'));
    l[0].enabled = false;
    localStorage.setItem('msp_announcements', JSON.stringify(l));
    window.dispatchEvent(new Event('msp-announcements-changed'));
  });
  await p5.waitForTimeout(800);
  if (await p5.locator('[data-msp-ticker]').count()) throw new Error('un message désactivé défile');
});

await ctx5.close();

/* ================= BLOC 6 — Bibliothèque PDF payante ================= */
console.log('\nBLOC 6 — Bibliothèque : PDF payé avant téléchargement');
const ctx6 = await browser.newContext();
await ctx6.addInitScript(SEED);
await ctx6.addInitScript(() => {
  localStorage.setItem('msp_payment_contact', JSON.stringify({
    name: 'Super Admin', phone: '0197000000', whatsapp: '22997000000',
    email: '', instructions: 'Paiement Mobile Money',
  }));
  localStorage.setItem('msp_library_books', JSON.stringify([{
    id: 'livre-test', title: 'Annales BEPC Mathématiques', author: 'MSP',
    level: '3e', category: 'Annales et sujets',
    description: 'Sujets corrigés', excerpt: 'Ceci est l’extrait gratuit du recueil.',
    content: 'CONTENU INTEGRAL RESERVE', type: 'payant', price: '1500',
    pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQK', createdAt: Date.now(),
  }]));
});
const p6 = await ctx6.newPage();
await p6.goto(`${BASE}/#/bibliotheque`);
await p6.waitForTimeout(2500);

await t('Le livre payant affiche son prix', async () => {
  const body = await p6.locator('body').innerText();
  if (!body.includes('1500 FCFA')) throw new Error('prix absent');
});

await t('Seul l’extrait est lisible avant paiement', async () => {
  await p6.locator('button:has-text("Voir l’extrait")').first().click();
  await p6.waitForTimeout(1500);
  const body = await p6.locator('body').innerText();
  if (!body.includes('extrait gratuit')) throw new Error('extrait absent');
  if (body.includes('CONTENU INTEGRAL RESERVE')) throw new Error('le contenu payant est visible sans paiement');
});

await t('Le PDF n’est PAS téléchargeable avant paiement', async () => {
  if (await p6.locator('a:has-text("Télécharger le PDF")').count()) {
    throw new Error('le PDF est téléchargeable sans paiement');
  }
});

await t('L’application demande de payer auprès du Super Administrateur', async () => {
  const body = await p6.locator('body').innerText();
  if (!/Super Administrateur/i.test(body)) throw new Error('le paiement auprès de l’administrateur n’est pas indiqué');
  if (!body.includes('0197000000') && !body.includes('22997000000')) throw new Error('coordonnées absentes');
});

await t('Après déverrouillage, le contenu et le PDF sont accessibles', async () => {
  // Déverrouillage par l'administrateur pour cet appareil précis.
  await p6.evaluate(() => {
    const unlocks = JSON.parse(localStorage.getItem('msp_content_unlocks') || '{}');
    unlocks['livre-test'] = {
      contentId: 'livre-test', kind: 'livre', title: 'Annales BEPC',
      unlockedAt: Date.now(), via: 'admin',
    };
    localStorage.setItem('msp_content_unlocks', JSON.stringify(unlocks));
  });
  await p6.reload();
  await p6.waitForTimeout(2200);
  await p6.locator('button:has-text("Lire")').first().click();
  await p6.waitForTimeout(1500);
  const body = await p6.locator('body').innerText();
  if (!body.includes('CONTENU INTEGRAL RESERVE')) throw new Error('contenu toujours verrouillé');
  if (!(await p6.locator('a:has-text("Télécharger le PDF")').count())) throw new Error('PDF non téléchargeable');
});

await t('Le lien de téléchargement pointe bien vers un PDF', async () => {
  const href = await p6.locator('a:has-text("Télécharger le PDF")').first().getAttribute('href');
  if (!href || !href.startsWith('data:application/pdf')) throw new Error('le lien n’est pas un PDF');
});

await ctx6.close();

/* ================= BLOC 7 — Administration universelle ================= */
console.log('\nBLOC 7 — Le Super Admin modifie n’importe quelle information');
const ctx7 = await browser.newContext();
await ctx7.addInitScript(SEED);
await ctx7.addInitScript(() => {
  localStorage.setItem('msp_admin_dashboard_session', 'owner');
});
const p7 = await ctx7.newPage();
await p7.goto(`${BASE}/#/admin-dashboard`);
await p7.waitForTimeout(2500);

await t('L’onglet « Données & annonces » est disponible', async () => {
  const body = await p7.locator('body').innerText();
  if (!body.includes('Données & annonces')) throw new Error('onglet absent');
});

await t('Le Super Admin peut diffuser un message défilant', async () => {
  await p7.click('text=Données & annonces');
  await p7.waitForTimeout(900);
  await p7.fill('[data-testid="annonce-texte"]', 'Réunion des enseignants vendredi à 16h.');
  await p7.click('[data-testid="annonce-ajouter"]');
  await p7.waitForTimeout(900);
  const body = await p7.locator('body').innerText();
  if (!body.includes('Réunion des enseignants')) throw new Error('message non enregistré');
});

await t('Le message diffusé apparaît immédiatement dans la bande', async () => {
  await p7.waitForSelector('[data-msp-ticker]', { timeout: 6000 });
  const txt = await p7.locator('[data-msp-ticker]').innerText();
  if (!txt.includes('Réunion des enseignants')) throw new Error('message absent de la bande');
});

await t('Le Super Admin publie le total officiel des participants', async () => {
  await p7.click('text=Concours du quiz');
  await p7.waitForTimeout(800);
  await p7.fill('[data-testid="officiel-nombre"]', '42');
  await p7.click('[data-testid="officiel-publier"]');
  await p7.waitForTimeout(800);
  const body = await p7.locator('body').innerText();
  if (!body.includes('42')) throw new Error('total non publié');
});

await t('Toutes les informations enregistrées sont listées et modifiables', async () => {
  await p7.click('text=Toutes les données');
  await p7.waitForTimeout(900);
  const body = await p7.locator('body').innerText();
  if (!body.includes('Profil de l’enseignant')) throw new Error('les données ne sont pas listées');
});

await t('Une information peut être modifiée puis enregistrée', async () => {
  await p7.click('text=Profil de l’enseignant');
  await p7.waitForTimeout(700);
  await p7.fill('[data-testid="editeur-valeur"]', '{\n  "teacherName": "DOSSOU Paul"\n}');
  await p7.click('[data-testid="editeur-enregistrer"]');
  await p7.waitForTimeout(800);
  const nom = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_profile')).teacherName);
  if (nom !== 'DOSSOU Paul') throw new Error('modification non appliquée : ' + nom);
});

await t('Un format invalide est refusé sans détruire la donnée', async () => {
  await p7.fill('[data-testid="editeur-valeur"]', '{ ceci nest pas du json');
  await p7.click('[data-testid="editeur-enregistrer"]');
  await p7.waitForTimeout(700);
  const body = await p7.locator('body').innerText();
  if (!body.includes('format est invalide')) throw new Error('aucune alerte de format');
  const nom = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_profile')).teacherName);
  if (nom !== 'DOSSOU Paul') throw new Error('la donnée a été corrompue');
});

await t('Une sauvegarde de la valeur précédente est conservée', async () => {
  const sauv = await p7.evaluate(() =>
    localStorage.getItem('msp_backup_before_edit::msp_profile'));
  if (!sauv || !sauv.includes('KOFFI Jean')) throw new Error('aucune sauvegarde de l’ancienne valeur');
});

await t('La valeur précédente est restaurable en un clic', async () => {
  await p7.locator('button:has-text("Restaurer la valeur précédente")').first().click();
  await p7.waitForTimeout(1200);
  const nom = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_profile')).teacherName);
  if (nom !== 'KOFFI Jean') throw new Error('restauration échouée : ' + nom);
});

await ctx7.close();

/* ================= BLOC 8 — Non-régression des accès ================= */
console.log('\nBLOC 8 — L’édition des données reste réservée au Super Administrateur');
const ctx8 = await browser.newContext();
await ctx8.addInitScript(SEED);
await ctx8.addInitScript(() => {
  // Session d'un membre NON Super Administrateur.
  localStorage.setItem('msp_admin_team', JSON.stringify([{
    id: 'm1', name: 'Support Paul', role: 'Support', active: true, createdAt: Date.now(),
  }]));
  localStorage.setItem('msp_admin_dashboard_session', 'member:m1');
});
const p8 = await ctx8.newPage();
await p8.goto(`${BASE}/#/admin-dashboard`);
await p8.waitForTimeout(2500);

await t('Un membre non Super Admin ne voit pas l’onglet des données', async () => {
  const body = await p8.locator('body').innerText();
  if (body.includes('Données & annonces')) throw new Error('onglet visible pour un rôle non autorisé');
});

console.log(`\n=== RÉSULTAT v39 : ${pass} réussis / ${fail} échoués ===\n`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
