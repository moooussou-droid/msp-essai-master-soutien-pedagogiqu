#!/usr/bin/env node
/**
 * Assistant de publication — Master Soutien Pédagogique
 * ---------------------------------------------
 * Une seule commande :  npm run deploy:check
 *   1. Construit automatiquement l'application si nécessaire (npm run build:lowmem).
 *   2. Vérifie les fichiers présents dans dist/ ET deploy/, et que index.html
 *      charge bien le bundle construit (`./assets/main-…`), jamais `/src/main.tsx`.
 *   3. Distingue les publications statiques hors ligne des fonctions Vercel requises par l’IA en ligne.
 *
 * Aucune bibliothèque requise (Node.js ≥ 18).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const DIST = join(process.cwd(), 'dist');
const DEPLOY = join(process.cwd(), 'deploy');
const ok = (b) => (b ? '✅' : '❌');
const hr = '─'.repeat(62);

console.log('\n' + '═'.repeat(62));
console.log('  ASSISTANT DE PUBLICATION — MASTER SOUTIEN PÉDAGOGIQUE');
console.log('═'.repeat(62));

/* 1 — construction ------------------------------------------------ */
if (!existsSync(join(DIST, 'index.html')) || !existsSync(join(DEPLOY, 'index.html'))) {
  console.log('\n[1/3] dist/ ou deploy/ introuvable → construction automatique…');
  try {
    execSync('npm run build:lowmem', { stdio: 'inherit' });
  } catch {
    console.error('❌ Le build a échoué. Vérifiez que les dépendances sont installées : npm install');
    process.exit(1);
  }
} else {
  console.log('\n[1/3] Application déjà construite (relancez « npm run build:lowmem » pour une mise à jour).');
}

/* 2 — vérifications ---------------------------------------------- */
console.log('\n[2/3] Vérification des fichiers de publication :');
const required = ['index.html', '404.html', 'sw.js', 'vercel.json', '_redirects', 'manifest.json'];
let allOk = true;
for (const [label, dir] of [['dist', DIST], ['deploy', DEPLOY]]) {
  for (const f of required) {
    const present = existsSync(join(dir, f));
    if (!present) allOk = false;
    console.log(`  ${ok(present)} ${label}/${f}${present ? '' : '  ← manquant !'}`);
  }

  const indexPath = join(dir, 'index.html');
  const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  const builtScript = /src="\.\/assets\/main-[^"]+\.js"/.test(indexHtml);
  const sourceScript = indexHtml.includes('src="/src/main.tsx"');
  if (!builtScript || sourceScript) allOk = false;
  console.log(`  ${ok(builtScript && !sourceScript)} ${label}/index.html charge le bundle construit (pas /src/main.tsx)`);
}
const compressedWasmRel = 'assets/ort-wasm-simd-threaded.asyncify.wasm.gz';
const uncompressedWasmRel = 'assets/ort-wasm-simd-threaded.asyncify.wasm';
const localRuntimeRequired = [
  'assets/localLLMWorker.js',
  'assets/ort-wasm-simd-threaded.asyncify.mjs',
  compressedWasmRel,
];
for (const [label, dir] of [['dist', DIST], ['deploy', DEPLOY]]) {
  for (const file of localRuntimeRequired) {
    const present = existsSync(join(dir, file));
    if (!present) allOk = false;
    console.log(`  ${ok(present)} ${label}/${file}${present ? '' : '  ← moteur local manquant !'}`);
  }

  const compressedPath = join(dir, compressedWasmRel);
  let wasmGzipValid = false;
  if (existsSync(compressedPath)) {
    try {
      const wasm = gunzipSync(readFileSync(compressedPath));
      wasmGzipValid = wasm.length > 8 && wasm[0] === 0 && wasm[1] === 97 && wasm[2] === 115 && wasm[3] === 109;
    } catch { /* gzip cassé */ }
  }
  console.log(`  ${ok(wasmGzipValid)} ${label} runtime gzip décompressible et signature WASM valide`);
  if (!wasmGzipValid) allOk = false;

  const wasmUnderWebLimit = existsSync(compressedPath) && statSync(compressedPath).size < 25_000_000;
  console.log(`  ${ok(wasmUnderWebLimit)} ${label} runtime compressé sous la limite web de 25 Mo`);
  if (!wasmUnderWebLimit) allOk = false;

  const noOversizedWasm = !existsSync(join(dir, uncompressedWasmRel));
  console.log(`  ${ok(noOversizedWasm)} ${label} sans ancien WASM non compressé (>25 Mo)`);
  if (!noOversizedWasm) allOk = false;

  const workerPath = join(dir, 'assets/localLLMWorker.js');
  const workerUsesCompressedWasm = existsSync(workerPath)
    && readFileSync(workerPath, 'utf8').includes('ort-wasm-simd-threaded.asyncify.wasm.gz');
  console.log(`  ${ok(workerUsesCompressedWasm)} ${label} Web Worker demande le WASM gzip`);
  if (!workerUsesCompressedWasm) allOk = false;
}

function hasWasmGzipHeaders(configPath) {
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const rule = config.headers?.find((entry) => entry.source === '/assets/ort-wasm-simd-threaded.asyncify.wasm.gz');
    const headers = Object.fromEntries((rule?.headers || []).map(({ key, value }) => [key.toLowerCase(), value]));
    return headers['content-encoding'] === 'gzip' && headers['content-type'] === 'application/wasm';
  } catch { return false; }
}
for (const configPath of [join(process.cwd(), 'vercel.json'), join(DIST, 'vercel.json'), join(DEPLOY, 'vercel.json')]) {
  const hasHeaders = hasWasmGzipHeaders(configPath);
  if (!hasHeaders) allOk = false;
  console.log(`  ${ok(hasHeaders)} ${configPath.replace(process.cwd() + '/', '')} sert le WASM gzip avec les en-têtes de décompression`);
}
const serviceWorker = existsSync(join(DIST, 'sw.js')) ? readFileSync(join(DIST, 'sw.js'), 'utf8') : '';
const preservesModelCache = serviceWorker.includes("name.startsWith('msp-local-llm-cache-')");
console.log(`  ${ok(preservesModelCache)} le Service Worker préserve le cache du LLM local lors des mises à jour`);
if (!preservesModelCache) allOk = false;
const apiRequired = [
  'api/ai/chat.js',
  'api/ai/prep-fiches.js',
  'api/ai/providers.js',
  'api/ai/session.js',
  'server/aiGateway.js',
  'supabase/migrations/20261104_ai_gateway.sql',
  'supabase/migrations/20261106_prep_fiches_catalog.sql',
];
const apiPresent = apiRequired.every((file) => existsSync(join(process.cwd(), file)));
console.log(`  ${ok(apiPresent)} sources des fonctions IA et migration Supabase présentes`);
if (!apiPresent) allOk = false;
let aiFunctionConfigOk = false;
try {
  const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
  aiFunctionConfigOk = config.functions?.['api/ai/chat.js']?.maxDuration >= 90
    && config.functions?.['api/ai/prep-fiches.js']?.maxDuration > 0
    && config.functions?.['api/ai/session.js']?.maxDuration > 0
    && config.functions?.['api/ai/providers.js']?.maxDuration > 0;
} catch { /* vercel.json absent ou invalide */ }
console.log(`  ${ok(aiFunctionConfigOk)} vercel.json configure les quatre fonctions /api/ai/* et un délai suffisant pour le fournisseur`);
if (!aiFunctionConfigOk) allOk = false;
const forbiddenBrowserStrings = [
  'api.openai.com', 'api.anthropic.com', 'api.mistral.ai', 'api.perplexity.ai',
  'api.deepseek.com', 'generativelanguage.googleapis.com', 'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 'MISTRAL_API_KEY', 'PERPLEXITY_API_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
for (const [label, dir] of [['dist', DIST], ['deploy', DEPLOY]]) {
  const assetsDir = join(dir, 'assets');
  const jsFiles = existsSync(assetsDir) ? readdirSync(assetsDir).filter((file) => file.endsWith('.js')) : [];
  const bundle = jsFiles.map((file) => readFileSync(join(assetsDir, file), 'utf8')).join('\\n');
  const browserSecretsSafe = jsFiles.length > 0 && !forbiddenBrowserStrings.some((marker) => bundle.includes(marker));
  console.log(`  ${ok(browserSecretsSafe)} ${label} navigateur sans endpoint direct ni variable de clé fournisseur`);
  if (!browserSecretsSafe) allOk = false;
}

if (!allOk) {
  console.error('❌ Publication non prête → exécutez : npm run build:lowmem, puis relancez cette commande.');
  process.exit(1);
}
const size = Math.round(statSync(join(DEPLOY, 'index.html')).size / 1024);
console.log(`  (deploy/index.html : ${size} Ko + ses fichiers assets/ — déposez le CONTENU de deploy/)`);

/* 3 — marche à suivre -------------------------------------------- */
console.log('\n[3/3] Choisir le mode de publication :\n');
console.log(hr);
console.log('  OPTION A — FOURNISSEURS IA DISTANTS sur Vercel (passerelle sécurisée)');
console.log(hr);
console.log('  1. Importez le dépôt SOURCE complet sur vercel.com/new (GitHub privé recommandé).');
console.log('  2. Laissez le build npm run build:lowmem et le dossier dist configurés dans vercel.json.');
console.log('  3. Configurez Supabase, le secret de session et les clés/modèles fournisseur dans Vercel.');
console.log('  4. Appliquez la migration SQL, émettez un code IA dédié, puis redéployez.');
console.log('     Voir AI_GATEWAY_SETUP.md. Les fonctions /api/ai/* ne sont publiées qu’avec le projet source.');
console.log(hr);
console.log('  OPTION B — PUBLICATION STATIQUE (Netlify, Vercel Drop ou dossier deploy/)');
console.log(hr);
console.log('  1. Construisez avec npm run build:lowmem, puis publiez le contenu de deploy/.');
console.log('  2. Le runtime ONNX complet est stocké en .wasm.gz (<25 Mo/fichier) et servi avec Content-Encoding:gzip.');
console.log('  3. Le moteur à canevas, le LLM Qwen3 sur appareil et les exports hors ligne restent disponibles.');
console.log('  4. Le modèle Qwen3 (moins de 1 Go selon le backend) se télécharge à la demande, puis fonctionne hors ligne si le cache est conservé.');
console.log('  5. Les fiches publiées peuvent être téléchargées depuis le catalogue Supabase public, mais une publication statique ne peut pas les publier.');
console.log('  ⚠️  Une publication statique ne fournit PAS les fonctions serveur /api/ai/* : les fournisseurs distants et la publication admin resteront désactivés.');
console.log(hr);
console.log('  OPTION C — Vercel CLI depuis le dossier source');
console.log(hr);
console.log('  Installez la CLI puis lancez « vercel » et « vercel --prod » depuis la racine du projet source.');
console.log('  Vérifiez d’abord les secrets, la migration et les codes IA; aucune clé ne doit aller dans le navigateur.\n');
console.log('POUR METTRE À JOUR le site statique : npm run build:lowmem puis republiez deploy/.');
console.log('Pour l’IA en ligne, poussez les changements source ou redéployez depuis la racine avec Vercel.');
console.log('═'.repeat(62) + '\n');
