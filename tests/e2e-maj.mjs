/**
 * E2E — MISE À JOUR DE L'APPLICATION (v60).
 *
 * ── POURQUOI CE TEST EXISTE ──────────────────────────────────────────
 * Le mécanisme de mise à jour est l'infrastructure la plus critique du
 * produit : s'il casse, les utilisateurs restent bloqués sur une ancienne
 * version pour toujours, et aucun correctif ne les atteint jamais.
 *
 * Les contrôles statiques de l'audit vérifient que le CODE est correct.
 * Ce test vérifie que le MÉCANISME fonctionne réellement : il installe
 * l'application, simule un déploiement (comme sur Vercel), et contrôle
 * que le bandeau apparaît, que le bouton bascule bien de version, et
 * surtout que L'ABONNEMENT ET LES DONNÉES SURVIVENT.
 *
 * ── PRÉREQUIS ────────────────────────────────────────────────────────
 * Le dossier `dist/` doit être construit (`npm run build`). Un service
 * worker ne fonctionne pas sur le serveur de développement : on sert donc
 * la version construite sur un vrai serveur HTTP.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'fs';
import { createServer } from 'http';
import { extname, join, normalize } from 'path';

const DIST = new URL('../dist', import.meta.url).pathname;
const TMP = '/tmp/msp-maj-test';
const PORT = 7311;

let pass = 0;
let fail = 0;
const ok = (c, n) => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n)); };

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('❌ dist/ introuvable. Lancez « npm run build » avant ce test.');
  process.exit(1);
}

/* Copie de travail : on modifiera sw.js pour simuler un redéploiement. */
rmSync(TMP, { recursive: true, force: true });
cpSync(DIST, TMP, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  const rel = url === '/' ? '/index.html' : url;
  // `normalize` empêche de sortir du dossier servi (../../).
  const file = join(TMP, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  try {
    const data = readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      // Le navigateur doit revérifier sw.js à chaque fois, comme en production.
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('404');
  }
});
await new Promise((r) => server.listen(PORT, '0.0.0.0', r));
const BASE = `http://localhost:${PORT}`;
const SW = join(TMP, 'sw.js');

/** Remplace la version dans sw.js : exactement ce que fait un redéploiement. */
function publierNouvelleVersion(de, vers) {
  const s = readFileSync(SW, 'utf8');
  if (!s.includes(de)) throw new Error(`version ${de} introuvable dans sw.js`);
  writeFileSync(SW, s.replace(de, vers));
}

const versionActuelle = (readFileSync(SW, 'utf8').match(/master-soutien-v(\d+)/) || [])[1];
const V1 = `master-soutien-v${versionActuelle}`;
const V2 = `master-soutien-v${Number(versionActuelle) + 1}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const p = await ctx.newPage();

try {
  console.log(`\n1. Première installation (${V1})`);
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const etat1 = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return { actif: !!r?.active, attente: !!r?.waiting };
  });
  ok(etat1.actif, 'le service worker s’installe');
  ok(!etat1.attente, 'aucune version en attente');
  ok(await p.getByTestId('bandeau-maj').count() === 0,
    'AUCUN bandeau à la première installation');

  console.log('\n2. L’abonné saisit ses données');
  await p.evaluate(() => {
    localStorage.setItem('msp_activation', JSON.stringify({
      activated: true, code: '285791', name: 'MOISE OUSSOU',
      activatedAt: Date.now(), expiresAt: Date.now() + 3e10, plan: 'pro',
    }));
    localStorage.setItem('msp_school_binding', JSON.stringify({
      schoolName: 'EPP NIMBO', boundCode: '285791', boundAt: Date.now(),
      transferAllowed: false, transferCount: 0, history: [],
    }));
    localStorage.setItem('msp_cahier_journal', JSON.stringify([
      { id: 'j1', date: '2026-09-14', className: 'CM2 A', sessions: [], updatedAt: 1 }]));
    localStorage.setItem('msp_school_fees', JSON.stringify([
      { id: 'f1', studentId: 's1', studentLabel: 'AHOUANSOU Jean', classId: 'c1',
        className: 'CM2 A', feeTypeId: 'scolarite', feeLabel: 'Scolarité',
        amountDue: 15000, discount: 0, schoolYear: '2026-2027',
        payments: [{ id: 'p1', date: '2026-10-01', amount: 5000, receiptNo: '2026-0001' }],
        updatedAt: 1 }]));
  });
  ok(true, 'abonnement Pro, rattachement, journal et reçu enregistrés');

  console.log(`\n3. Publication de la nouvelle version (${V2})`);
  publierNouvelleVersion(V1, V2);
  await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r?.update();
  });
  await p.waitForTimeout(3500);

  ok(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
    'la nouvelle version est téléchargée et ATTEND');
  ok(await p.getByTestId('bandeau-maj').count() > 0, 'le bandeau « Mettre à jour » apparaît');
  ok(/nouvelle version/i.test(await p.getByTestId('bandeau-maj').innerText()),
    'le message est explicite');
  ok(await p.getByTestId('btn-plus-tard').count() > 0, 'l’utilisateur peut reporter');
  ok(!!(await p.evaluate(() => navigator.serviceWorker.controller?.scriptURL)),
    'l’ancienne version reste utilisable tant qu’on ne clique pas');

  console.log('\n4. Clic sur « Mettre à jour »');
  await p.getByTestId('btn-mettre-a-jour').click();
  await p.waitForTimeout(5500);
  const apres = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return {
      attente: !!r?.waiting,
      caches: await caches.keys(),
      plan: JSON.parse(localStorage.getItem('msp_activation') || '{}').plan,
      nom: JSON.parse(localStorage.getItem('msp_activation') || '{}').name,
      ecole: JSON.parse(localStorage.getItem('msp_school_binding') || '{}').schoolName,
      journal: JSON.parse(localStorage.getItem('msp_cahier_journal') || '[]').length,
      recu: JSON.parse(localStorage.getItem('msp_school_fees') || '[]')[0]?.payments?.[0]?.receiptNo,
    };
  });
  ok(!apres.attente, 'la bascule a eu lieu');
  ok(apres.caches.includes(V2), `le cache ${V2} est en place`);
  ok(!apres.caches.includes(V1), `l’ancien cache ${V1} a été purgé`);
  ok(await p.getByTestId('bandeau-maj').count() === 0, 'le bandeau a disparu');

  console.log('\n5. LES DONNÉES ONT-ELLES SURVÉCU ?');
  ok(apres.plan === 'pro', 'L’ABONNEMENT PRO EST CONSERVÉ');
  ok(apres.nom === 'MOISE OUSSOU', 'le titulaire du code est conservé');
  ok(apres.ecole === 'EPP NIMBO', 'le rattachement à l’école est conservé');
  ok(apres.journal === 1, 'le cahier journal est conservé');
  ok(apres.recu === '2026-0001', 'le reçu de paiement est conservé');

  console.log('\n6. L’application fonctionne après la mise à jour');
  const t = await p.locator('body').innerText();
  ok(t.length > 100 && /Master Soutien/i.test(t), 'l’application se charge normalement');
} finally {
  await browser.close();
  server.close();
  rmSync(TMP, { recursive: true, force: true });
}

console.log(`\n════════════════════════════════════\nE2E MISE À JOUR : ${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
