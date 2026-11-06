#!/usr/bin/env node
/**
 * Compile le Web Worker d’inférence locale et copie son runtime ONNX WASM dans dist/assets.
 * Les poids du modèle ne sont pas empaquetés : ils sont téléchargés une fois à la demande,
 * puis conservés dans le Cache API du navigateur.
 */
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ROOT = process.cwd();
const ASSETS = join(ROOT, 'dist', 'assets');
const ORT_DIST = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
mkdirSync(ASSETS, { recursive: true });

const wasmFactory = 'ort-wasm-simd-threaded.asyncify.mjs';
const wasmSourceName = 'ort-wasm-simd-threaded.asyncify.wasm';
const wasmCompressedName = `${wasmSourceName}.gz`;
const wasmFactorySource = join(ORT_DIST, wasmFactory);
const wasmSource = join(ORT_DIST, wasmSourceName);
if (!existsSync(wasmFactorySource) || !existsSync(wasmSource)) {
  throw new Error(`Runtime ONNX local introuvable dans ${ORT_DIST}`);
}
copyFileSync(wasmFactorySource, join(ASSETS, wasmFactory));

// GitHub refuse le téléversement navigateur d'un fichier >25 Mo.
// Gzip garde le runtime ONNX complet (y compris Asyncify/WebGPU) dans un fichier léger.
const wasmBytes = readFileSync(wasmSource);
const compressedWasm = gzipSync(wasmBytes, { level: 9 });
if (compressedWasm.length >= 25_000_000) {
  throw new Error(`Le runtime gzip dépasse la limite web de 25 Mo (${compressedWasm.length} octets).`);
}
writeFileSync(join(ASSETS, wasmCompressedName), compressedWasm);

await build({
  entryPoints: [join(ROOT, 'src', 'workers', 'localLLMWorker.ts')],
  outfile: join(ASSETS, 'localLLMWorker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.DEV': 'false',
  },
  external: ['onnxruntime-node', 'sharp'],
  logLevel: 'info',
});

const workerKb = Math.round(statSync(join(ASSETS, 'localLLMWorker.js')).size / 1024);
const wasmCompressedMb = (statSync(join(ASSETS, wasmCompressedName)).size / 1024 / 1024).toFixed(2);
const wasmOriginalMb = (wasmBytes.length / 1024 / 1024).toFixed(1);
console.log(`[local-llm] Web Worker compilé (${workerKb} Ko); runtime WASM ${wasmOriginalMb} Mo, gzip ${wasmCompressedMb} Mo (<25 Mo par fichier).`);
