#!/usr/bin/env node
/**
 * Vérifie qu'un site déployé sur Netlify / Vercel fonctionne correctement.
 * Usage :  npm run deploy:verify https://mon-site.netlify.app
 *
 * Remarque : l'application utilise une navigation par ancre (#/…), donc les
 * pages internes ne passent pas par le serveur ; les vérifications portent
 * sur la racine et les fichiers de publication (index.html, sw.js,
 * manifest.json, 404.html).
 * (fetch natif : Node.js ≥ 18)
 */

const url = (process.argv[2] || '').trim().replace(/\/+$/, '');
if (!url || !/^https?:\/\//.test(url)) {
  console.log('Usage :  npm run deploy:verify https://votre-lien');
  process.exit(1);
}

const hr = '─'.repeat(60);
console.log('\n' + '═'.repeat(60));
console.log('  VÉRIFICATION DU SITE DÉPLOYÉ');
console.log('═'.repeat(60));
console.log(`  Cible : ${url}\n`);

const results = [];
async function check(label, path, predicate, hint) {
  try {
    const res = await fetch(url + path, { redirect: 'follow' });
    const body = await res.text();
    const ok = res.status === 200 && predicate(body);
    results.push({ label, ok });
    console.log(`  ${ok ? '✅' : '❌'} ${label} (HTTP ${res.status})`);
    if (!ok && hint) console.log(`       → ${hint}`);
  } catch (e) {
    results.push({ label, ok: false });
    console.log(`  ❌ ${label} — erreur réseau : ${e.message}`);
    console.log(`       → Vérifiez l\'adresse (le site est-il bien publié ?).`);
  }
}

const hasApp = (body) => body.includes('Master Soutien Pédagogique') || body.includes('<div id="root">');
// Ne regarder que les VRAIS attributs src : le texte du garde-fou mentionne
// aussi /src/main.tsx, mais il ne s'agit pas d'un script chargé.
const scriptSrcs = (body) => [...body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
const isDevSource = (body) => scriptSrcs(body).some((src) => src.includes('/src/main'));
const isBuiltApp = (body) => scriptSrcs(body).some((src) => src.includes('/assets/') && src.endsWith('.js'));

await check('Page d\'accueil', '/', hasApp, 'Le site ne répond pas comme prévu.');
await check('Application construite (bundle assets/)', '/', (b) => isBuiltApp(b) && !isDevSource(b),
  'La page charge /src/main.tsx : c’est le dossier SOURCE. Déposez le contenu de deploy/.');
await check('Service worker (hors-ligne)', '/sw.js', (b) => b.startsWith('// Service Worker') || b.includes('serviceWorker'), 'Pas de sw.js → la version hors-ligne et les mises à jour sont indisponibles.');
await check('Manifest PWA', '/manifest.json', (b) => b.includes('manifest') || b.includes('name'), 'Pas de manifest → installation sur téléphone indisponible.');
await check('Fallback 404 (Vercel)', '/404.html', hasApp, 'Pas de 404.html → Vercel peut renvoyer « 404: NOT_FOUND » sans le vercel.json.');

console.log('\n' + hr);
const bad = results.filter((r) => !r.ok);
if (bad.length === 0) {
  console.log('  ✅ SITE EN PARFAIT ÉTAT — partagez ce lien !');
} else {
  console.log(`  ⚠️  ${bad.length} problème(s) détecté(s). Diagnostic :`);
  if (!results[0].ok || !results[1].ok) {
    console.log('  • La page publiée n’est pas l’application construite : vous avez très');
    console.log('    probablement déposé le dossier SOURCE ou le .zip au lieu de deploy/.');
    console.log('    → Déposez le CONTENU de deploy/ (les fichiers DEDANS le dossier).');
  }
  if (!results[2].ok) {
    console.log('  • sw.js absent : vous avez déposé le dossier source (pas construit).');
    console.log('    → Relancez « npm run deploy:check » puis déposez deploy/.');
  }
  console.log('  • Détails complets : GUIDE-PUBLICATION-LIEN.md → section Dépannage.');
}
console.log('═'.repeat(60) + '\n');
process.exit(bad.length === 0 ? 0 : 1);
