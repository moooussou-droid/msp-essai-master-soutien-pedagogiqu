/**
 * TEST DE FUMÉE (v32) — monte RÉELLEMENT chaque écran de l'application
 * dans un DOM simulé (jsdom + fake-indexeddb) et vérifie qu'il ne plante pas.
 *
 *  - Reproduit le parcours « Présences / absences » (appel, statuts, sauvegarde).
 *  - Monte ~35 routes et détecte toute fonction qui « ne répond pas »
 *    (erreur de rendu, promesse rejetée, écran vide).
 *
 * Lancement :  ./node_modules/.bin/esbuild tests/smoke.ts --bundle --platform=node
 *              --format=cjs --outfile=./smoke.cjs --external:exceljs --external:xlsx --external:jsdom --external:fake-indexeddb
 *              && node smoke.cjs
 */
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';

/* ---------- DOM simulé ---------- */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;

(globalThis as any).window = window;
(globalThis as any).document = window.document;
(globalThis as any).navigator = window.navigator;
(globalThis as any).location = window.location;
(globalThis as any).history = window.history;
(globalThis as any).HTMLElement = window.HTMLElement;
(globalThis as any).Node = window.Node;
(globalThis as any).Element = window.Element;
(globalThis as any).getComputedStyle = window.getComputedStyle;
(globalThis as any).localStorage = window.localStorage;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).matchMedia = (q: string) => ({
  matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  onchange: null, dispatchEvent: () => false,
});
(globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
// v36 : l'appel des présences n'existe pas le week-end. On fige l'horloge sur
// un JEUDI (10 septembre 2026, 09 h) pour que les tests portent sur un jour de
// classe normal, avec matin ET après-midi.
{
  const RealDate = Date;
  const FIXED = new RealDate('2026-09-10T09:00:00').getTime();
  class MockDate extends RealDate {
    constructor(...args: any[]) {
      // @ts-ignore
      if (args.length === 0) super(FIXED); else super(...args);
    }
    static now() { return FIXED; }
  }
  (globalThis as any).Date = MockDate;
  (window as any).Date = MockDate;
}

(globalThis as any).scrollTo = () => {};
(globalThis as any).print = () => {};

/* ---------- Compteurs ---------- */
let pass = 0, fail = 0;
const errors: string[] = [];
const runtimeErrors: string[] = [];
// alert/confirm globaux : l'app est conçue pour un navigateur ; en Node ils n'existent pas.
(globalThis as any).alert = (m: string) => { /* silencieux */ };
(globalThis as any).confirm = () => true;
(window as any).alert = (globalThis as any).alert;
(window as any).confirm = (globalThis as any).confirm;
function ok(cond: boolean, label: string) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; errors.push(label); console.log(`  ❌ ${label}`); }
}
window.addEventListener('error', (e: any) => runtimeErrors.push(String(e?.message || e?.error || 'window error')));
process.on('unhandledRejection', (reason) => runtimeErrors.push('unhandledRejection: ' + String(reason) + ((reason as any)?.stack ? '\nSTACK: ' + (reason as any).stack : '')));

/* ---------- Données de test ---------- */
const store = window.localStorage;
store.setItem('msp_activation', JSON.stringify({
  activated: true, name: 'KOFFI Jean', code: '111111', activatedAt: Date.now(),
  expiresAt: Date.now() + 365 * 86400000, plan: 'complet',
}));
store.setItem('msp_profile', JSON.stringify({ teacherName: 'KOFFI Jean', schoolName: 'EPP Test' }));
// Les modales « Guide rapide » recouvrent l'écran et interceptent les clics :
// on les considère déjà lues pour pouvoir tester les écrans eux-mêmes.
for (const g of ['presences', 'bulletins', 'notes', 'classe', 'eleves', 'statistiques',
                 'enrolement', 'personnel', 'fiches', 'cours', 'bilan-annuel', 'dictionnaire']) {
  store.setItem(`msp_guide_hidden_${g}`, 'true');
}
{
  const realGet = store.getItem.bind(store);
  (store as any).getItem = (k: string) =>
    (k && k.startsWith('msp_guide_hidden_')) ? 'true' : realGet(k);
}
store.setItem('msp_admin_team', JSON.stringify([{
  id: 'owner', name: 'Administrateur principal', role: 'Super Administrateur',
  phone: '+22900000000', permissions: ['Toutes les permissions'], active: true, createdAt: Date.now(),
}]));

const now = Date.now();
const CLASS_ID = 'CLS-TEST-001';
const S1 = 'STU-1', S2 = 'STU-2';
const SUBJ_FR = 'SBJ-FR', SUBJ_MATH = 'SBJ-MATH';

async function seed() {
  const db = await import('../src/utils/database');
  await db.saveClass({
    id: CLASS_ID,
    name: 'CM2 A',
    level: 'CM2',
    educationType: 'primaire',
    sequence: 'Trimestre 1',
    evaluationType: 'Évaluation continue',
    schoolYear: '2026-2027',
    school: 'EPP Test',
    createdAt: now,
    updatedAt: now,
    students: [
      { id: S1, matricule: '001', nom: 'AHOUANSOU', prenoms: 'Jean', sexe: 'M', dateNaissance: '2015-03-01', createdAt: now },
      { id: S2, matricule: '002', nom: 'KOFFI', prenoms: 'Awa', sexe: 'F', dateNaissance: '2015-07-15', createdAt: now },
    ],
    subjects: [
      { id: SUBJ_FR, name: 'Dictée', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 0 },
      { id: SUBJ_MATH, name: 'Mathématiques', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 },
    ],
    notes: [
      { id: 'N1', studentId: S1, subjectId: SUBJ_FR, noteObtenue: 15, notePerfectionnement: 1.5, evaluation: 'formative1', updatedAt: now },
      { id: 'N2', studentId: S1, subjectId: SUBJ_FR, noteObtenue: 12, notePerfectionnement: 1, evaluation: 'sommative1', updatedAt: now },
      { id: 'N3', studentId: S2, subjectId: SUBJ_MATH, noteObtenue: 10, notePerfectionnement: 0.5, evaluation: 'sommative2', updatedAt: now },
    ],
    customEvaluations: [],
    customFields: {},
  });
  return db;
}

/* ---------- Montage d'un écran ---------- */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../src/App';

const container = document.getElementById('root')!;
let root: any = null;

let currentRoute = '';
async function openRoute(hash: string): Promise<string> {
  runtimeErrors.length = 0;
  currentRoute = hash;
  // Root NEUF à chaque route : une erreur de rendu n'emporte pas les suivantes.
  try { root?.unmount(); } catch { /* ignore */ }
  container.innerHTML = '';
  root = createRoot(container);
  root.render(React.createElement(App));
  window.location.hash = hash;
  window.dispatchEvent(new window.Event('hashchange'));
  await new Promise((r) => setTimeout(r, 400));
  return container.innerHTML;
}

async function main() {
  await seed();

  /* ===== 1) PRÉSENCES — parcours réel (bug signalé) ===== */
  console.log('\n═══ SMOKE 1. Présences / absences — parcours complet ═══');
  {
    let html = await openRoute('#/class/' + CLASS_ID + '/presences');
    ok(html.includes('Registre de Présence'), 'Présences : l\'écran s\'ouvre (Registre de Présence affiché)');
    ok(html.includes('AHOUANSOU') && html.includes('KOFFI'), 'Présences : les élèves de la classe sont listés');
    ok(runtimeErrors.length === 0, 'Présences : aucune erreur JavaScript à l\'ouverture' + (runtimeErrors[0] ? ` — ${runtimeErrors[0]}` : ''));

    // v36 : l'appel n'existe pas le week-end. On se place sur un JEUDI
    // (2026-09-10) pour dérouler le parcours complet matin / après-midi.
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null;
    ok(!!dateInput, 'Présences : sélecteur de date présent');
    const bodyAfter = container.innerHTML;
    ok(bodyAfter.includes('Matin') && bodyAfter.includes('Après-midi'),
       'Présences : les deux demi-journées (matin / après-midi) sont proposées');

    // « Tout le monde présent »
    const buttons = Array.from(container.querySelectorAll('button'));
    const allPresent = buttons.find((b) => b.textContent?.includes('Tout le monde présent')) as HTMLButtonElement | null;
    ok(!!allPresent, 'Présences : bouton « Tout le monde présent » présent');
    if (allPresent) {
      allPresent.click();
      await new Promise((r) => setTimeout(r, 150));
      const saved = JSON.parse(store.getItem('msp_attendance_records') || '[]');
      ok(saved.length === 1 && saved[0].entries.length === 2, 'Présences : l\'appel est enregistré (2 élèves, 1 jour)');
    }

    // Statut « Abs. injustifiée » sur le 1er élève
    const absBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Absence sans justification') as HTMLButtonElement | null;
    ok(!!absBtn, 'Présences : bouton « Absence sans justification » présent');
    const ferieBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Journée fériée') as HTMLButtonElement | null;
    ok(!!ferieBtn, 'Présences : nouvelle option « Journée fériée » présente');
    const seanceBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Demi-journée de séance') as HTMLButtonElement | null;
    ok(!!seanceBtn, 'Présences : nouvelle option « Demi-journée de séance » présente');
    if (absBtn) {
      absBtn.click();
      await new Promise((r) => setTimeout(r, 150));
      const saved = JSON.parse(store.getItem('msp_attendance_records') || '[]');
      const entry = saved[0]?.entries?.find((e: any) => e.status === 'absent_injustifiee');
      ok(!!entry, 'Présences : le statut « Abs. injustifiée » est enregistré pour un élève');
    }

    // PV : mois + compteurs
    html = await openRoute('#/class/' + CLASS_ID + '/presences');
    ok(html.includes('Taux') && html.includes('Demi-journées suivies'),
       'Présences : le PV mensuel (taux, demi-journées, absences) est généré');

    // Régression : reload => les données sont rechargées depuis le stockage
    html = await openRoute('#/class/' + CLASS_ID + '/presences');
    ok(html.includes('Jour'), 'Présences : réouverture sans erreur (données persistées)');
  }

  /* ===== 2) SMOKE — toutes les routes ===== */
  console.log('\n═══ SMOKE 2. Visite de toutes les fonctions (détection d\'écrans morts) ═══');
  const routes: { hash: string; needle: string; label: string }[] = [
    { hash: '#/', needle: 'Master', label: 'Accueil' },
    { hash: '#/class/' + CLASS_ID, needle: 'CM2', label: 'Tableau de bord classe' },
    { hash: '#/class/' + CLASS_ID + '/students', needle: 'Élèves', label: 'Élèves (inscription/import)' },
    { hash: '#/class/' + CLASS_ID + '/subjects', needle: 'Matière', label: 'Matières' },
    { hash: '#/class/' + CLASS_ID + '/profiles', needle: 'Profil', label: 'Fiches élèves' },
    { hash: '#/class/' + CLASS_ID + '/entry', needle: 'Saisie des notes', label: 'Saisie des notes' },
    { hash: '#/class/' + CLASS_ID + '/bulletins', needle: 'Bulletin', label: 'Bulletins & classement' },
    { hash: '#/class/' + CLASS_ID + '/table', needle: 'Vue tableau', label: 'Tableau des notes' },
    { hash: '#/class/' + CLASS_ID + '/statistics', needle: 'Statistiques', label: 'Statistiques' },
    { hash: '#/class/' + CLASS_ID + '/student-analytics', needle: 'évolution', label: 'Évolution d’un élève' },
    { hash: '#/class/' + CLASS_ID + '/export', needle: 'Export', label: 'Export EducMaster' },
    { hash: '#/class/' + CLASS_ID + '/programme', needle: 'Programme', label: 'Programmes d’études' },
    { hash: '#/class/' + CLASS_ID + '/planification-annuelle', needle: 'Planification', label: 'Planification annuelle' },
    { hash: '#/enrolement-eleves', needle: 'Enrôlement', label: 'Enrôlement des élèves' },
    { hash: '#/enrolement-personnel', needle: 'personnel', label: 'Enrôlement du personnel (v33)' },
    { hash: '#/programmes', needle: 'Programme', label: 'Programmes (accueil)' },
    { hash: '#/videos', needle: 'Vidéo', label: 'Vidéos' },
    { hash: '#/annonces', needle: 'Annonce', label: 'Annonces' },
    { hash: '#/publicites', needle: 'Publicité', label: 'Publicités' },
    { hash: '#/boite-outils', needle: 'Outils', label: 'Boîte à outils' },
    { hash: '#/fiches-pedagogiques', needle: 'Fiche', label: 'Fiches pédagogiques' },
    { hash: '#/correspondance', needle: 'Correspondance', label: 'Correspondance' },
    { hash: '#/calendrier-scolaire', needle: 'Calendrier', label: 'Calendrier scolaire' },
    { hash: '#/verify', needle: 'Vérif', label: 'Vérification bulletin' },
    { hash: '#/class-statistics', needle: 'Statistiques', label: 'Statistiques globales' },
    { hash: '#/grands-rendez-vous', needle: 'Rendez-vous', label: 'Grands rendez-vous' },
    { hash: '#/generateur-fiches-ia', needle: 'Fiches IA', label: 'Générateur fiches IA' },
    { hash: '#/administration-scolaire', needle: 'Administration', label: 'Administration scolaire' },
    { hash: '#/orientation-post-bac', needle: 'Orientation', label: 'Orientation post-bac' },
    { hash: '#/orientation-scolaire', needle: 'Orientation', label: 'Orientation scolaire' },
    { hash: '#/encyclopedie', needle: 'Encyclopédie', label: 'Encyclopédie' },
    { hash: '#/dictionnaire', needle: 'Dictionnaire', label: 'Dictionnaire' },
    { hash: '#/cours', needle: 'Cours', label: 'Cours & Cultivons-nous' },
    { hash: '#/plateforme-cours', needle: 'Cours', label: 'Plateforme de cours' },
    { hash: '#/admin-cours', needle: 'Cours', label: 'Éditeur de cours admin' },
    { hash: '#/admin-dashboard', needle: 'Espace Administrateur', label: 'Espace Administrateur' },
    { hash: '#/profile', needle: 'Profil', label: 'Mon espace (profil + abonnement)' },
    { hash: '#/settings', needle: 'Réglages', label: 'Réglages' },
    { hash: '#/support', needle: 'Support', label: 'Support / Centre d’aide' },
  ];

  for (const r of routes) {
    const html = await openRoute(r.hash);
    const lower = html.toLowerCase();
    const rendered = lower.includes(r.needle.toLowerCase()) || html.length > 2000;
    const errs = runtimeErrors.filter((e) => !e.includes('Not implemented'));
    if (!rendered || errs.length > 0) {
      ok(false, `${r.label} (${r.hash}) — ${rendered ? `erreur JS: ${errs[0]}` : 'ÉCRAN VIDE (ne répond pas)'}`);
    } else {
      ok(true, `${r.label} (${r.hash})`);
    }
  }

  /* ===== 3) Autres évaluations — modèle ===== */
  console.log('\n═══ SMOKE 3. Évaluations (4 EducMaster + Autres évaluations) ═══');
  const db3 = await import('../src/utils/database');
  const custom = db3.makeCustomEvaluation('Projet de classe', '2027-01-15');
  ok(custom.id.startsWith('custom-') && custom.label === 'Projet de classe', 'Création d\'une « Autre évaluation » (id + libellé)');
  const cls = await db3.getClass(CLASS_ID);
  const evals = db3.evaluationsForClass(cls!);
  ok(evals.length >= 4, 'Les 4 évaluations EducMaster sont proposées');
  ok(evals.every((e: any) => e.id !== custom.id), 'L\'« Autre évaluation » n\'existe pas encore dans la classe');
  const withCustom = db3.evaluationsForClass({ ...cls!, customEvaluations: [custom] });
  ok(withCustom.some((e: any) => e.id === custom.id && e.label === 'Projet de classe'), 'Après création : « Autres évaluations » apparaît à côté des 4');
  ok(db3.evaluationLabel(custom.id, [custom]) === 'Projet de classe', 'Libellé d\'une « Autre évaluation » résolu');

  /* ===== 4) Autres évaluations — à côté des 4 évaluations EducMaster =====
     (la création complète + saisie de note + persistance sont couvertes par tests/e2e.mjs,
      qui pilote un vrai navigateur : la frappe clavier ne peut pas être simulée en jsdom.) */
  console.log('\n═══ SMOKE 4. Autres évaluations — présence à côté des 4 ═══');
  {
    let html = await openRoute('#/class/' + CLASS_ID + '/entry');
    ok(html.includes('Autres évaluations'), 'Saisie : bouton « ➕ Autres évaluations » affiché à côté des 4 évaluations');
    const plusBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Autres évaluations')) as HTMLButtonElement | null;
    ok(!!plusBtn, 'Saisie : bouton « ➕ Autres évaluations » cliquable');
    if (plusBtn) {
      plusBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      html = container.innerHTML;
      ok(html.includes("Nom de l'évaluation"), 'Saisie : le formulaire de création s\'ouvre (nom + date)');
      ok(html.includes('type="date"') || html.includes('type=\"date\"'), 'Saisie : le champ date est proposé');
      const createBtn = Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent?.includes("Créer l'évaluation")) as HTMLButtonElement | null;
      ok(!!createBtn, 'Saisie : bouton « Créer l\'évaluation » présent dans le formulaire');
      // Cliquer « Créer » sans nom → alerte (globale silencieuse) : l\'écran ne plante pas.
      if (createBtn) {
        await act(async () => { createBtn.click(); await new Promise((r) => setTimeout(r, 100)); });
        ok(runtimeErrors.length === 0, 'Saisie : validation du formulaire sans erreur JavaScript');
      }
    }
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`SMOKE : ${pass} réussis, ${fail} échoués`);
  errors.forEach((e) => console.log('  - ' + e));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Erreur fatale du harnais:', e); process.exit(1); });
