#!/usr/bin/env node
/**
 * Post-build — Master Soutien Pédagogique
 * Exécuté automatiquement après `vite build` ou le build faible mémoire :
 *   1. crée dist/404.html (copie de index.html) : sur Vercel, les routes
 *      inconnues renvoient 404.html → l'application s'affiche TOUJOURS,
 *      même si les rewrites du vercel.json ne sont pas appliqués (glisser-déposer).
 *   2. copie dist/ → deploy/ : un dossier 100 % prêt à déposer
 *      sur Netlify / Vercel, sans aucune commande npm.
 *   3. vérifie que tous les fichiers de publication sont présents.
 */
import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const DEPLOY = join(process.cwd(), 'deploy');

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, ent.name);
    const d = join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

console.log('\n[postbuild] Préparation des fichiers de publication…');

/* 1 — 404.html (fallback Vercel / tout hébergeur statique) */
if (existsSync(join(DIST, 'index.html'))) {
  copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
  console.log('  ✅ dist/404.html créé (routes inconnues → application, même sans vercel.json)');
} else {
  console.error('  ❌ dist/index.html introuvable — le build a-t-il réussi ?');
  process.exit(1);
}

/* 2 — deploy/ prêt à l'emploi (zéro commande) */
if (existsSync(DEPLOY)) rmSync(DEPLOY, { recursive: true, force: true });
copyDir(DIST, DEPLOY);
writeFileSync(
  join(DEPLOY, 'COMMENT-DEPLOYER.txt'),
  [
    '══════════════════════════════════════════════════════════════',
    '  MASTER SOUTIEN PÉDAGOGIQUE — DOSSIER DE PUBLICATION PRÊT',
    '══════════════════════════════════════════════════════════════',
    '',
    'Ce dossier contient l\'application COMPLÈTE, déjà construite.',
    'AUCUNE commande n\'est nécessaire pour la mettre en ligne.',
    '',
    'IA LOCALE SUR L\'APPAREIL :',
    '  - Publiez en HTTPS, choisissez Qwen3 local dans le panneau IA,',
    '    puis téléchargez le modèle (moins de 1 Go selon le backend).',
    '  - Après mise en cache, les prompts restent sur l\'appareil; le',
    '    modèle fonctionne hors ligne tant que le navigateur garde son cache.',
    '  - Le modèle 0,6B est moins puissant que les meilleurs modèles cloud.',
    '',
    'GUIDE UTILISATEUR :',
    '  - Le raccourci du Guide est placé en tête de l\'accueil; le manuel fonctionne hors ligne.',
    '',
    'PRÉPARATION DE FICHES PAR IA :',
    '  - Les parcours dédiés sont temporairement indisponibles pendant leur développement,',
    '    y compris par accès direct ou ancien favori.',
    '  - Le chat IA local reste disponible pour les autres usages, mais bloque la rédaction',
    '    de fiches complètes. Les fiches manuelles restent accessibles.',
    '',
    'FICHES PUBLIÉES PAR L\'ADMINISTRATION — SYNCHRONISATION :',
    '  - Les appareils vérifient automatiquement le catalogue à l\'ouverture,',
    '    au retour en ligne et périodiquement; les pages reçues restent hors ligne.',
    '  - La publication admin exige le projet source Vercel, les migrations',
    '    Supabase et une session IA de rôle principal.',
    '  - Le site statique peut télécharger les fiches publiques, mais pas les publier.',
    '    Le ZIP manuel reste un transfert de secours pour les appareils hors ligne.',
    '',
    'LIMITATION : ce dossier statique n\'inclut pas /api/ai/*; les',
    'fournisseurs distants et la publication admin exigent le projet source Vercel + secrets.',

    '',
    'NETLIFY (2 minutes, gratuit, sans compte) :',
    '  1. Ouvrez https://app.netlify.com/drop',
    '  2. Ouvrez CE dossier et glissez-DÉPOSEZ SON CONTENU',
    '     (ce qui se trouve DANS ce dossier) dans la zone.',
    '  3. C\'est en ligne ! ⚠️ Notez l\'adresse affichée : c\'est votre lien',
    '     à partager. Pour le personnaliser, créez un compte gratuit puis',
    '     allez dans « Domain settings » (ex. master-soutien.netlify.app).',
    '',
    'TÉLÉVERSEMENT WEB DANS UN DÉPÔT GITHUB (limite affichée : 25 Mo/fichier) :',
    '  - L\'écran « Drag files here to add them to your repository » est celui de GitHub.',
    '    Il ne faut pas ajouter le ZIP comme fichier du site : GitHub ne le décompresse pas.',
    '  - Le runtime est livré sous forme .wasm.gz (<25 Mo); vercel.json le sert',
    '    avec Content-Encoding:gzip. Le navigateur le décompresse automatiquement.',
    '  - Extrayez MSP-v78-deploiement-vercel.zip sur l\'ordinateur, puis ajoutez',
    '    le CONTENU extrait à la racine du dépôt (index.html, assets/, vercel.json…).',
    '  - N\'ajoutez pas l\'ancien .wasm non compressé : il dépasse la limite web.',
    '',
    'VERCEL DROP (déploiement direct, sans dépôt GitHub) :',
    '  1. Ouvrez https://vercel.com/drop.',
    '  2. Déposez MSP-v78-deploiement-vercel.zip directement.',
    '  3. Vercel décompresse l\'archive; le runtime complet reste disponible.',
    '',
    'POUR METTRE À JOUR (le lien ne change pas) :',
    '  - Netlify : sur votre site, onglet « Deploys » → glissez à nouveau',
    '    le contenu du dossier deploy/ reconstruit.',
    '  - Vercel/GitHub : remplacez les fichiers par le nouveau contenu deploy/',
    '    puis validez le commit; Vercel redéploie le dépôt.',
    '',
    'Gardez la structure complète : index.html, vercel.json et tous les assets/.',
    'Le WASM gzip conserve le runtime complet et la prise en charge locale IA.',
    '',
    'Vérifier que votre lien est sain :  npm run deploy:verify <votre-lien>',
    '══════════════════════════════════════════════════════════════',
  ].join('\n')
);
console.log('  ✅ deploy/ créé (copie de dist/ + COMMENT-DEPLOYER.txt)');

/* 3 — vérification */
const required = ['index.html', '404.html', 'sw.js', 'vercel.json', '_redirects', 'manifest.json'];
let allOk = true;
for (const f of required) {
  const ok = existsSync(join(DIST, f));
  if (!ok) allOk = false;
  console.log(`  ${ok ? '✅' : '❌'} dist/${f}`);
}
if (!allOk) {
  console.error('  ❌ Fichiers manquants !');
  process.exit(1);
}
const kb = Math.round(statSync(join(DIST, 'index.html')).size / 1024);
console.log(`\n  ✅ Publication prête : dist/ (${kb} Ko, application complète) et deploy/`);
console.log('  → GitHub web : extrayez le ZIP et ajoutez le contenu de deploy/; Vercel Drop : déposez le ZIP.\n');
