/**
 * E2E v38 — paiement des contenus, « À venir », horloge, mode nuit,
 * outils enseignants, retour du générateur, quiz interrogatif.
 * Exige Vite sur http://localhost:5173
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ✅ ${n}`); };
const ko = (n, e) => { fail++; console.log(`  ❌ ${n}${e ? ' — ' + e : ''}`); };
async function t(n, fn) { try { await fn(); ok(n); } catch (e) { ko(n, e.message.split('\n')[0]); } }

const seed = () => {
  localStorage.setItem('msp_activation', JSON.stringify({
    activated: true, name: 'KOFFI Jean', code: '111111',
    activatedAt: Date.now(), expiresAt: Date.now() + 31536000000, plan: 'complet',
  }));
  localStorage.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean', schoolName: 'EPP Test' }));
  localStorage.setItem('msp_install_dismissed', 'true');
  const g = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (k) => (typeof k === 'string' && k.indexOf('msp_guide_hidden_') === 0 ? 'true' : g(k));
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript(seed);

console.log('\n=== E2E v38 ===\n');

/* ---------------- BLOC 0 : abonnement 999 FCFA (contexte vierge) ---------------- */
console.log('BLOC 0 — Abonnement 999 FCFA');
const ctx0 = await browser.newContext();
const p0 = await ctx0.newPage();
await p0.goto(`${BASE}/`);
await p0.waitForTimeout(2500);
await t('L’écran d’abonnement annonce l’enrôlement du personnel', async () => {
  const body = await p0.locator('body').innerText();
  if (!body.includes('999')) throw new Error('formule 999 absente');
  if (!body.includes('Enrôlement du personnel')) throw new Error('personnel non annoncé');
});
await ctx0.close();

/* ---------------- BLOC 1 : fonctionnalités « À venir » ---------------- */
console.log('BLOC 1 — Fonctions IA marquées « À venir »');
const p1 = await ctx.newPage();
await p1.goto(`${BASE}/#/preparation-classe`);
await p1.waitForTimeout(1500);

await t('Le module Préparation de classe s’ouvre', async () => {
  await p1.waitForSelector('h1:has-text("Préparation de classe")', { timeout: 8000 });
});
await t('L’assistant porte son nouveau nom', async () => {
  await p1.waitForSelector('text=Agent IA Master Soutien Pédagogique', { timeout: 6000 });
});
await t('Deux fonctionnalités portent la mention « À VENIR »', async () => {
  const n = await p1.locator('text=À VENIR').count();
  if (n !== 2) throw new Error(`${n} mentions trouvées`);
});
await t('Les tuiles « À venir » ne sont pas des liens cliquables', async () => {
  const links = await p1.locator('a[href*="assistant-ia"], a[href*="generateur-fiches-ia"]').count();
  if (links !== 0) throw new Error(`${links} lien(s) encore actif(s)`);
});
await t('L’accès direct à l’assistant affiche l’écran « À venir »', async () => {
  await p1.goto(`${BASE}/#/assistant-ia`);
  await p1.waitForSelector('text=Fonctionnalité en cours de développement', { timeout: 6000 });
});
await t('L’accès direct au générateur affiche l’écran « À venir »', async () => {
  await p1.goto(`${BASE}/#/generateur-fiches-ia`);
  await p1.waitForSelector('text=Fonctionnalité en cours de développement', { timeout: 6000 });
});
await t('L’écran « À venir » propose un retour et l’accueil', async () => {
  await p1.waitForSelector('button:has-text("Retour")', { timeout: 5000 });
  await p1.waitForSelector('button:has-text("Accueil")', { timeout: 5000 });
});

/* ---------------- BLOC 2 : retour intelligent ---------------- */
console.log('\nBLOC 2 — Le bouton Retour revient à la page précédente');
const p2 = await ctx.newPage();
await p2.goto(`${BASE}/#/`);
await p2.waitForTimeout(1500);
await t('Depuis l’accueil → Préparation de classe → Retour ramène à l’accueil', async () => {
  await p2.goto(`${BASE}/#/preparation-classe`);
  await p2.waitForTimeout(900);
  await p2.goto(`${BASE}/#/generateur-fiches-ia`);
  await p2.waitForTimeout(900);
  await p2.click('header button:has-text("Retour")');
  await p2.waitForTimeout(1200);
  const url = p2.url();
  if (!url.includes('preparation-classe')) throw new Error(`revenu sur ${url}`);
});
await t('Le retour ne renvoie PAS de force à l’écran d’accueil', async () => {
  const url = p2.url();
  if (url.endsWith('/#/') || url.endsWith('/#')) throw new Error('renvoyé à l’accueil');
});

/* ---------------- BLOC 3 : paiement d'un cours ---------------- */
console.log('\nBLOC 3 — Paiement d’un cours auprès du Super Administrateur');
const p3 = await ctx.newPage();
await p3.addInitScript(() => {
  localStorage.setItem('msp_marketplace_courses', JSON.stringify([{
    id: 'cours-test-payant', title: 'Grammaire CM2', author: 'MSP', level: 'CM2',
    description: 'Cours complet', price: '2000', type: 'payant', link: '',
    status: 'approved', createdAt: Date.now(),
    pdfUrl: 'data:application/pdf;base64,JVBERi0=',
    lessons: [
      { title: 'Leçon 1 (extrait)', content: 'Contenu libre' },
      { title: 'Leçon 2', content: 'Contenu payant' },
      { title: 'Leçon 3', content: 'Contenu payant' },
    ],
  }]));
  localStorage.setItem('msp_payment_contact', JSON.stringify({
    name: 'Super Administrateur', phone: '+229 97 12 34 56', whatsapp: '+229 97 12 34 56',
    email: '', instructions: 'Mobile Money accepté.',
  }));
});
await p3.goto(`${BASE}/#/plateforme-cours`);
await p3.waitForTimeout(1800);

await t('Le cours payant affiche son prix', async () => {
  await p3.waitForSelector('text=2000 FCFA', { timeout: 8000 });
});
await t('Le bouton propose « Voir l’extrait » et non l’accès direct', async () => {
  await p3.waitForSelector('button:has-text("Voir l’extrait")', { timeout: 6000 });
});
await t('La première leçon reste lisible gratuitement', async () => {
  await p3.click('button:has-text("Voir l’extrait")');
  await p3.waitForTimeout(1200);
  await p3.waitForSelector('text=Contenu libre', { timeout: 6000 });
});
await t('Les leçons suivantes sont verrouillées', async () => {
  await p3.click('button:has-text("2. Leçon 2")');
  await p3.waitForTimeout(900);
  await p3.waitForSelector('text=Contenu payant verrouillé', { timeout: 6000 });
});
await t('L’application indique de payer auprès de l’administrateur', async () => {
  const body = await p3.locator('body').innerText();
  if (!body.includes('2000 FCFA') || !body.includes('Super Administrateur')) {
    throw new Error('message de paiement incomplet');
  }
});
await t('Les coordonnées de l’administrateur sont affichées', async () => {
  await p3.waitForSelector('text=+229 97 12 34 56', { timeout: 5000 });
});
await t('Un identifiant utilisateur est fourni à communiquer', async () => {
  await p3.waitForSelector('text=/MSP-[A-Z0-9]{5}-[A-Z0-9]{5}/', { timeout: 5000 });
});
await t('Un lien WhatsApp pré-rempli est proposé', async () => {
  const href = await p3.locator('a[href*="wa.me"]').first().getAttribute('href');
  if (!href || !href.includes('wa.me')) throw new Error('lien absent');
});
await t('Le contenu complet reste inaccessible sans code', async () => {
  const body = await p3.locator('body').innerText();
  if (body.includes('Télécharger le PDF')) throw new Error('PDF accessible sans paiement !');
});
await t('Un code erroné est refusé', async () => {
  await p3.fill('input[placeholder="XXXX-XXXX"]', 'FAUX-CODE');
  await p3.click('button:has-text("Valider")');
  await p3.waitForSelector('text=incorrect', { timeout: 5000 });
});

// Le Super Administrateur calcule le code puis l'utilisateur le saisit
await t('Le bon code déverrouille le cours et libère le PDF', async () => {
  const code = await p3.evaluate(() => {
    const deviceId = localStorage.getItem('msp_device_id');
    const hash = (str) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    };
    const raw = `cours-test-payant::${deviceId}::msp-unlock-v1`;
    const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
    return `${a}-${b}`;
  });
  await p3.fill('input[placeholder="XXXX-XXXX"]', code);
  await p3.click('button:has-text("Valider")');
  await p3.waitForTimeout(1200);
  await p3.waitForSelector('text=Contenu payant', { timeout: 6000 });
  await p3.waitForSelector('text=Télécharger le PDF', { timeout: 6000 });
});
await t('L’accès reste acquis après rechargement', async () => {
  await p3.reload();
  await p3.waitForTimeout(1800);
  const unlocked = await p3.evaluate(() => !!JSON.parse(localStorage.getItem('msp_content_unlocks') || '{}')['cours-test-payant']);
  if (!unlocked) throw new Error('accès perdu');
});

/* ---------------- BLOC 4 : bibliothèque de livres ---------------- */
console.log('\nBLOC 4 — Les livres suivent la même procédure');
const p4 = await ctx.newPage();
await p4.addInitScript(() => {
  localStorage.setItem('msp_library_books', JSON.stringify([{
    id: 'livre-test', title: 'Annales BEPC', author: 'MSP', level: '3ème',
    category: 'Annales et sujets', description: 'Sujets corrigés',
    excerpt: 'Extrait du livre', content: 'Intégralité du livre',
    type: 'payant', price: '3000', pdfUrl: 'data:application/pdf;base64,JVBERi0=',
    createdAt: Date.now(),
  }]));
});
await p4.goto(`${BASE}/#/bibliotheque`);
await p4.waitForTimeout(1800);

await t('La bibliothèque est accessible', async () => {
  await p4.waitForSelector('h1:has-text("Bibliothèque")', { timeout: 8000 });
});
await t('Le livre payant affiche son prix', async () => {
  await p4.waitForSelector('text=3000 FCFA', { timeout: 6000 });
});
await t('Seul l’extrait est lisible', async () => {
  await p4.click('button:has-text("Voir l’extrait")');
  await p4.waitForTimeout(1200);
  const body = await p4.locator('body').innerText();
  if (!body.includes('Extrait du livre')) throw new Error('extrait absent');
  if (body.includes('Intégralité du livre')) throw new Error('contenu complet visible sans paiement !');
});
await t('Le paiement auprès de l’administrateur est demandé', async () => {
  await p4.waitForSelector('text=Contenu payant verrouillé', { timeout: 6000 });
});

/* ---------------- BLOC 5 : horloge et alarmes ---------------- */
console.log('\nBLOC 5 — Horloge et alarmes');
const p5 = await ctx.newPage();
await p5.goto(`${BASE}/#/`);
await p5.waitForTimeout(1800);
await t('L’horloge s’affiche sur l’accueil', async () => {
  await p5.waitForSelector('text=/^\\d{2}:\\d{2}$/', { timeout: 8000 });
});
await t('L’écran Horloge et alarmes s’ouvre', async () => {
  await p5.goto(`${BASE}/#/horloge`);
  await p5.waitForSelector('h1:has-text("Horloge et alarmes")', { timeout: 8000 });
});
await t('Une alarme peut être créée depuis l’interface', async () => {
  await p5.fill('input[placeholder*="Intitulé"]', 'Récréation');
  await p5.click('button:has-text("Ajouter l’alarme")');
  await p5.waitForTimeout(900);
  await p5.waitForSelector('text=Récréation', { timeout: 5000 });
});
await t('L’alarme est persistée', async () => {
  const n = await p5.evaluate(() => JSON.parse(localStorage.getItem('msp_alarms') || '[]').length);
  if (n < 1) throw new Error('alarme non enregistrée');
});
await t('Le minuteur de séance est disponible', async () => {
  await p5.waitForSelector('text=Minuteur de séance', { timeout: 5000 });
  await p5.click('button:has-text("Démarrer")');
  await p5.waitForTimeout(1500);
  await p5.waitForSelector('button:has-text("Pause")', { timeout: 5000 });
});

/* ---------------- BLOC 6 : mode nuit ---------------- */
console.log('\nBLOC 6 — Mode nuit et confort visuel');
const p6 = await ctx.newPage();
await p6.goto(`${BASE}/#/reglages`);
await p6.waitForTimeout(1800);
await t('L’écran de réglages s’ouvre', async () => {
  await p6.waitForSelector('h1:has-text("Réglages et confort visuel")', { timeout: 8000 });
});
await t('Le mode nuit s’active et assombrit l’application', async () => {
  await p6.click('button:has-text("Mode nuit")');
  await p6.waitForTimeout(900);
  const dark = await p6.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!dark) throw new Error('classe dark absente');
});
await t('Le fond devient réellement sombre', async () => {
  const bg = await p6.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const m = bg.match(/\d+/g);
  if (!m || Number(m[0]) > 80) throw new Error(`fond encore clair (${bg})`);
});
await t('Le filtre lumière bleue s’applique', async () => {
  await p6.click('button:has-text("Fort")');
  await p6.waitForTimeout(700);
  const w = await p6.evaluate(() => document.documentElement.getAttribute('data-msp-warmth'));
  if (w !== '3') throw new Error(`intensité ${w}`);
});
await t('Le réglage survit au rechargement', async () => {
  await p6.reload();
  await p6.waitForTimeout(1800);
  const dark = await p6.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!dark) throw new Error('mode nuit perdu');
});
await t('Le mode clair peut être rétabli', async () => {
  await p6.click('button:has-text("Clair")');
  await p6.waitForTimeout(900);
  const dark = await p6.evaluate(() => document.documentElement.classList.contains('dark'));
  if (dark) throw new Error('toujours sombre');
});

/* ---------------- BLOC 7 : outils du quotidien ---------------- */
console.log('\nBLOC 7 — Outils du quotidien de l’enseignant');
const p7 = await ctx.newPage();
await p7.goto(`${BASE}/#/outils-enseignant`);
await p7.waitForTimeout(1800);
await t('L’écran des outils s’ouvre', async () => {
  await p7.waitForSelector('h1:has-text("Outils du quotidien")', { timeout: 8000 });
});
await t('Un cours peut être ajouté à l’emploi du temps', async () => {
  await p7.fill('input[placeholder="Matière"]', 'Mathématiques');
  await p7.fill('input[placeholder="Classe"]', 'CM2');
  await p7.click('button:has-text("Ajouter au lundi")');
  await p7.waitForTimeout(900);
  const n = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_timetable') || '[]').length);
  if (n < 1) throw new Error('créneau non enregistré');
});
await t('Le cahier de textes enregistre une séance', async () => {
  await p7.click('button:has-text("Cahier de textes")');
  await p7.waitForTimeout(700);
  await p7.fill('textarea[placeholder="Contenu traité en classe"]', 'Addition avec retenue');
  await p7.fill('textarea[placeholder="Devoirs donnés à la maison"]', 'Exercices 1 à 5');
  await p7.click('button:has-text("Enregistrer la séance")');
  await p7.waitForTimeout(900);
  const n = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_logbook') || '[]').length);
  if (n < 1) throw new Error('séance non enregistrée');
});
await t('Un mémo peut être créé', async () => {
  await p7.click('button:has-text("Mémos")');
  await p7.waitForTimeout(700);
  await p7.fill('input[placeholder*="Corriger les copies"]', 'Préparer la composition');
  await p7.click('button:has-text("Ajouter")');
  await p7.waitForTimeout(900);
  await p7.waitForSelector('text=Préparer la composition', { timeout: 5000 });
});
await t('Un sujet d’évaluation peut être archivé', async () => {
  await p7.click('button:has-text("Sujets")');
  await p7.waitForTimeout(700);
  await p7.fill('input[placeholder="Titre du sujet"]', 'Composition 1er trimestre');
  await p7.fill('textarea[placeholder="Énoncé du sujet"]', 'Résoudre les opérations');
  await p7.click('button:has-text("Enregistrer le sujet")');
  await p7.waitForTimeout(900);
  const n = await p7.evaluate(() => JSON.parse(localStorage.getItem('msp_exam_bank') || '[]').length);
  if (n < 1) throw new Error('sujet non enregistré');
});
await t('Un message aux parents est généré automatiquement', async () => {
  await p7.click('button:has-text("Parents")');
  await p7.waitForTimeout(700);
  await p7.fill('input[placeholder="Nom de l’élève"]', 'AGBO Marie');
  await p7.waitForTimeout(600);
  const body = await p7.locator('body').innerText();
  if (!body.includes('AGBO Marie')) throw new Error('message non personnalisé');
});

/* ---------------- BLOC 8 : quiz interrogatif ---------------- */
console.log('\nBLOC 8 — Le quiz pose de vraies questions');
/*
 * Les sept pages precedentes restaient ouvertes jusqu'a la fin : au bout
 * de plusieurs minutes, le navigateur saturait et se fermait, faisant
 * echouer les deux derniers controles avec « Target page closed ». Il ne
 * s'agissait PAS d'un defaut de l'application (la logique du quiz est
 * verifiee par ailleurs), mais d'une fragilite du harnais de test.
 * On libere donc les pages devenues inutiles.
 */
for (const ancienne of [p1, p2, p3, p4, p5, p6, p7]) {
  await ancienne.close().catch(() => {});
}
const p8 = await ctx.newPage();
await p8.goto(`${BASE}/#/dictionnaire`);
await p8.waitForTimeout(2500);
await t('Les questions du quiz se terminent par un point d’interrogation', async () => {
  const res = await p8.evaluate(async () => {
    const mod = await import('/src/utils/kidsQuiz.ts');
    const pool = [
      { word: 'Cartable', definition: 'sac de l’élève', example: '' },
      { word: 'Craie', definition: 'bâton pour écrire au tableau', example: '' },
      { word: 'Ardoise', definition: 'petite plaque pour écrire', example: '' },
      { word: 'Règle', definition: 'objet pour tracer des traits', example: '' },
      { word: 'Cahier', definition: 'feuilles pour les leçons', example: '' },
    ];
    const qs = mod.generateQuiz(pool, 5, 'e2e');
    return qs.map((q) => q.question);
  });
  if (res.length !== 5) throw new Error('génération incorrecte');
  const bad = res.filter((q) => !q.trim().endsWith('?'));
  if (bad.length) throw new Error(`non interrogatives : ${bad.join(' | ')}`);
});
await t('Les questions commencent par un mot interrogatif', async () => {
  const res = await p8.evaluate(async () => {
    const mod = await import('/src/utils/kidsQuiz.ts');
    return mod.generateLevel([
      { word: 'Chien', definition: 'animal qui aboie', example: '' },
      { word: 'Chat', definition: 'animal qui miaule', example: '' },
      { word: 'Poule', definition: 'oiseau de basse-cour', example: '' },
    ], 3).map((q) => q.question);
  });
  const bad = res.filter((q) => !/^(Quel|Quelle|Comment|Lequel)/.test(q));
  if (bad.length) throw new Error(bad[0]);
});

await browser.close();
console.log(`\n=== RÉSULTAT v38 : ${pass} réussis / ${fail} échoués ===\n`);
process.exit(fail === 0 ? 0 : 1);
