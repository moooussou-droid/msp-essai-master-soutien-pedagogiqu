import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = readFileSync(new URL('../src/utils/aiGenerationPolicy.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'node20' });
const policyUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { isFicheGenerationRequest } = await import(policyUrl);

test('blocks explicit requests to generate a fiche or lesson plan', () => {
  for (const prompt of [
    'Prépare une fiche de mathématiques sur les fractions',
    'Génère une séance de lecture sur les contes',
    'Rédige un plan de leçon sur la nutrition',
    'Please create a lesson plan about fractions',
    'Je veux une fiche de préparation',
  ]) {
    assert.equal(isFicheGenerationRequest(prompt), true, prompt);
  }
});

test('keeps ordinary questions, explanations, exercises, and edits available', () => {
  for (const prompt of [
    'Explique-moi cette fiche existante',
    'Explique la notion de fraction',
    'Crée trois exercices de fractions',
    'Améliore le titre de cette fiche',
  ]) {
    assert.equal(isFicheGenerationRequest(prompt), false, prompt);
  }
});
