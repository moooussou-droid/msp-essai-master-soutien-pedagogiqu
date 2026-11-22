import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

test('la personnalisation des fiches coûte 3 F par page, y compris dans la demande de paiement', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-prep-fiche-pricing-'));
  try {
    writeFileSync(join(tempDir, 'package.json'), '{"type":"commonjs"}');
    await build({
      entryPoints: ['src/utils/prepFiches.ts', 'src/utils/coursePayment.ts'],
      outbase: 'src/utils',
      outdir: tempDir,
      bundle: false,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
    });

    const requireFromBundle = createRequire(join(tempDir, 'prepFiches.js'));
    const fiches = requireFromBundle('./prepFiches.js');
    const payments = requireFromBundle('./coursePayment.js');

    assert.equal(fiches.PRICE_PER_PAGE, 3);
    assert.equal(fiches.personalizationPrice({ pageCount: 1 }), 3);
    assert.equal(fiches.personalizationPrice({ pageCount: 4 }), 12);

    const message = payments.paymentMessage('Addition', '12', 'fiche');
    assert.match(message, /3 F par page/);
    assert.match(message, /12 FCFA/);
    assert.doesNotMatch(message, /5 F par page/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
