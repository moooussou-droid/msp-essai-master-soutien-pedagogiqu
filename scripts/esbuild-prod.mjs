#!/usr/bin/env node
/**
 * BUILD DE PRODUCTION — variante à faible mémoire (esbuild).
 *
 * Le build Vite/rollup par défaut (`npm run build`) échoue sur les machines à
 * faible RAM (< 2 Go) : la phase « rendering chunks » de rollup, combinée à
 * l'inlining d'un fichier unique et aux grosses dépendances (pdfjs, exceljs,
 * mammoth, jspdf), dépasse la mémoire disponible et le processus est tué.
 *
 * Ce script produit le MÊME résultat déployable (dossier dist/ + deploy/) avec
 * esbuild, dont l'empreinte mémoire est bien plus faible. Tailwind v4 est
 * compilé séparément via @tailwindcss/node + @tailwindcss/oxide.
 *
 * Sortie : dist/ (index.html + assets/ + fichiers PWA) puis copie vers deploy/.
 */
import { build } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import {
  readFileSync, writeFileSync, mkdirSync, rmSync, existsSync,
  readdirSync, copyFileSync, statSync,
} from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const CWD = process.cwd();
const DIST = join(CWD, 'dist');
const ASSETS = join(DIST, 'assets');
const DEPLOY = join(CWD, 'deploy');

function hash8(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, ent.name);
    const d = join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

console.log('\n[esbuild] Build de production (mode faible mémoire)…');

/* 0 — nettoyage */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(ASSETS, { recursive: true });

/* 1 — copie des fichiers publics (PWA, icônes, manifest, sw, redirects…) */
if (existsSync(join(CWD, 'public'))) {
  for (const ent of readdirSync(join(CWD, 'public'), { withFileTypes: true })) {
    const s = join(CWD, 'public', ent.name);
    const d = join(DIST, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
  console.log('  ✅ public/ copié dans dist/');
}

/* 2 — compilation Tailwind v4 (CSS) */
console.log('  • Compilation de la feuille de styles Tailwind…');
const cssEntry = join(CWD, 'src', 'index.css');
const rawCss = readFileSync(cssEntry, 'utf8');
const compiler = await compile(rawCss, {
  base: join(CWD, 'src'),
  onDependency: () => {},
});
const scanner = new Scanner({
  sources: [{ base: CWD, pattern: 'src/**/*.{ts,tsx,js,jsx,html}', negated: false }],
});
const candidates = scanner.scan();
let cssOut = compiler.build(candidates);
// minification CSS légère (sans dépendance) : commentaires + espaces superflus.
cssOut = cssOut
  .replace(/\/\*[^]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
const cssHash = hash8(cssOut);
const cssName = `index-${cssHash}.css`;
writeFileSync(join(ASSETS, cssName), cssOut);
console.log(`  ✅ assets/${cssName} (${(cssOut.length / 1024).toFixed(0)} Ko)`);

/* 3 — bundle JavaScript (esbuild) */
console.log('  • Bundle JavaScript (esbuild)…');

const SINGLE_FILE = !!process.env.SINGLE_FILE;

if (SINGLE_FILE) {
  /* ------- Variante FICHIER UNIQUE -------
   * Un seul bundle JS (splitting désactivé → les import() dynamiques sont
   * inlinés), puis JS + CSS injectés dans un unique index.html. Équivalent de
   * vite-plugin-singlefile, mais sans le pic mémoire de Rollup. */
  const res = await build({
    entryPoints: [join(CWD, 'src', 'main.tsx')],
    bundle: true,
    format: 'esm',
    splitting: false,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    platform: 'browser',
    write: false,
    outfile: join(ASSETS, 'bundle.js'),
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false' },
    loader: { '.css': 'empty' },
    logLevel: 'info',
  });
  const jsFile = res.outputFiles.find((f) => f.path.endsWith('.js'));
  if (!jsFile) { console.error('  ❌ Bundle JS introuvable.'); process.exit(1); }
  // SÉCURITÉ : une séquence </script> (ou <!--) présente dans une chaîne du
  // bundle fermerait prématurément la balise <script> et casserait la page.
  // On neutralise ces séquences (elles restent équivalentes en JavaScript).
  const jsCode = jsFile.text
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
  const styleCss = cssOut.replace(/<\/style>/gi, '<\\/style>');
  console.log(`  ✅ bundle JS unique (${(jsCode.length / 1024 / 1024).toFixed(2)} Mo)`);

  // Génération de l'index.html : styles inline + script module inline.
  // IMPORTANT : on passe une FONCTION de remplacement. Avec une chaîne, les
  // motifs $&, $', $1… présents dans le bundle (ex. React contient "$&/")
  // seraient interprétés par String.replace et corrompraient le JavaScript.
  let htmlSF = readFileSync(join(CWD, 'index.html'), 'utf8');
  htmlSF = htmlSF.replace('</head>', () => `    <style>${styleCss}</style>\n  </head>`);
  htmlSF = htmlSF.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    () => `<script type="module">${jsCode}</script>`,
  );
  writeFileSync(join(DIST, 'index.html'), htmlSF);
  // On retire le dossier assets/ (vide) créé au début : tout est inline.
  rmSync(ASSETS, { recursive: true, force: true });
  rmSync(join(DIST, cssName), { force: true });
  console.log('  ✅ dist/index.html (fichier unique : JS + CSS inline)');
} else {
  const result = await build({
    entryPoints: [join(CWD, 'src', 'main.tsx')],
    bundle: true,
    format: 'esm',
    splitting: true,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    platform: 'browser',
    outdir: ASSETS,
    entryNames: '[name]-[hash]',
    chunkNames: 'chunk-[hash]',
    assetNames: 'asset-[hash]',
    metafile: true,
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false' },
    // main.tsx importe './index.css' : Tailwind est compilé à part (étape 2),
    // on neutralise donc l'import CSS dans le bundle JS.
    loader: { '.css': 'empty', '.png': 'file', '.svg': 'file', '.jpg': 'file', '.woff2': 'file', '.woff': 'file' },
    logLevel: 'info',
  });

  /* Retrouve le nom haché du point d'entrée JS généré. */
  const outFiles = Object.keys(result.metafile.outputs);
  const mainJs = outFiles
    .map((f) => f.replace(/\\/g, '/'))
    .find((f) => /assets\/main-[^/]+\.js$/.test(f));
  if (!mainJs) {
    console.error('  ❌ Point d\'entrée JS introuvable dans la sortie esbuild.');
    process.exit(1);
  }
  const mainJsRel = './' + mainJs.substring(mainJs.indexOf('assets/'));
  console.log(`  ✅ ${mainJsRel}`);

  /* 4 — génération de dist/index.html à partir du gabarit */
  let html = readFileSync(join(CWD, 'index.html'), 'utf8');
  html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    () => `<script type="module" src="${mainJsRel}"></script>`,
  );
  // Injecte la feuille de styles compilée juste avant </head>.
  html = html.replace(
    '</head>',
    () => `    <link rel="stylesheet" href="./assets/${cssName}" />\n  </head>`,
  );
  writeFileSync(join(DIST, 'index.html'), html);
  console.log('  ✅ dist/index.html');
}

/* 4 bis — moteur LLM local embarqué dans un Web Worker séparé */
console.log('  • Compilation du Web Worker IA local et du runtime WASM…');
execFileSync(process.execPath, [join(CWD, 'scripts', 'build-local-llm-worker.mjs')], { stdio: 'inherit', env: process.env });

/* 5 — 404.html (fallback hébergeurs statiques) */
copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));

/* 6 — deploy/ prêt à publier */
rmSync(DEPLOY, { recursive: true, force: true });
copyDir(DIST, DEPLOY);
console.log('  ✅ deploy/ (copie prête à publier)');

/* 7 — récapitulatif de taille */
function dirSize(dir) {
  let total = 0;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) total += dirSize(p);
    else total += statSync(p).size;
  }
  return total;
}
console.log(`\n[esbuild] Terminé ✔  dist = ${(dirSize(DIST) / 1024 / 1024).toFixed(2)} Mo`);
