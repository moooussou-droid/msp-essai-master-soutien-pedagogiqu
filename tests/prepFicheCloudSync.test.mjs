import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import 'fake-indexeddb/auto';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { handlePrepFicheSync, handleSession } from '../server/aiGateway.js';

function responseMock() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = String(value); },
    json() { return JSON.parse(this.body); },
  };
}

function saveEnv(names) {
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  return () => {
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  };
}

function request(cookie, body) {
  return {
    method: 'POST',
    headers: { origin: 'https://msp.example', host: 'msp.example', cookie },
    body,
  };
}

async function openSession(role, access) {
  access.role = role;
  const code = randomBytes(32).toString('base64url');
  access.token_hash = createHash('sha256').update(code).digest('hex');
  const response = responseMock();
  await handleSession({
    method: 'POST',
    headers: { origin: 'https://msp.example', host: 'msp.example' },
    body: { code },
  }, response);
  assert.equal(response.statusCode, 200);
  return response.headers['Set-Cookie'].split(';')[0];
}

test('la route de publication refuse les requêtes cross-origin et les sessions absentes', async () => {
  const crossOrigin = responseMock();
  await handlePrepFicheSync({
    method: 'POST',
    headers: { origin: 'https://evil.example', host: 'msp.example' },
    body: { action: 'sign-upload' },
  }, crossOrigin);
  assert.equal(crossOrigin.statusCode, 403);
  assert.equal(crossOrigin.json().error, 'ORIGIN_NOT_ALLOWED');

  const unauthenticated = responseMock();
  await handlePrepFicheSync({
    method: 'POST',
    headers: { origin: 'https://msp.example', host: 'msp.example' },
    body: { action: 'sign-upload' },
  }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.json().error, 'AI_LOGIN_REQUIRED');
});

test('seul le rôle principal peut obtenir des dépôts signés et publier le manifeste', async () => {
  const envNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MSP_AI_SESSION_SECRET', 'NODE_ENV'];
  const restoreEnv = saveEnv(envNames);
  const originalFetch = globalThis.fetch;
  try {
    process.env.SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret-test';
    process.env.MSP_AI_SESSION_SECRET = 'prep-fiche-session-secret-at-least-32-bytes';
    process.env.NODE_ENV = 'test';

    const access = {
      id: '8f49d32b-0e40-4e2e-9d83-99b3ce36c01a',
      token_hash: '',
      display_name: 'Administrateur test',
      role: 'team',
      is_active: true,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      daily_limit: 25,
    };
    const storageCalls = [];
    const catalogCalls = [];
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      if (url.includes('/rest/v1/msp_ai_access_tokens?') && init.method === 'PATCH') return new Response(null, { status: 204 });
      if (url.includes('/rest/v1/msp_ai_access_tokens?')) return Response.json([access]);
      if (url.includes('/storage/v1/object/upload/sign/')) {
        storageCalls.push({ url, init });
        return Response.json({ token: 'temporary-signed-upload-token', url: '/object/upload/sign/msp-prep-fiches/test?token=temporary-signed-upload-token' });
      }
      if (url.includes('/rest/v1/msp_prep_fiches_catalog?select=manifest')) {
        catalogCalls.push({ url, init });
        return Response.json([]);
      }
      if (url.includes('/rest/v1/msp_prep_fiches_catalog?on_conflict=catalog_id')) {
        catalogCalls.push({ url, init });
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected mocked request: ${url}`);
    };

    const teamCookie = await openSession('team', access);
    const signBody = {
      action: 'sign-upload',
      snapshotId: 'snapshot_12345678',
      path: 'snapshot_12345678/prep-123/page-0001.jpg',
      mimeType: 'image/jpeg',
      size: 1000,
    };
    const forbidden = responseMock();
    await handlePrepFicheSync(request(teamCookie, signBody), forbidden);
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.json().error, 'AI_PRINCIPAL_REQUIRED');
    assert.equal(storageCalls.length, 0, 'aucun lien signé émis pour un rôle team');

    const principalCookie = await openSession('principal', access);
    const signed = responseMock();
    await handlePrepFicheSync(request(principalCookie, signBody), signed);
    assert.equal(signed.statusCode, 200);
    assert.match(signed.json().uploadUrl, /^https:\/\/supabase\.test\/storage\/v1\/object\/upload\/sign\//);
    assert.equal(signed.json().token, 'temporary-signed-upload-token');
    assert.equal(signed.body.includes('service-role-secret-test'), false);
    assert.equal(storageCalls.length, 1);
    assert.equal(storageCalls[0].init.headers.Authorization, 'Bearer service-role-secret-test');

    const snapshotId = 'snapshot_87654321';
    const manifest = {
      format: 'msp-prep-fiches-cloud',
      schemaVersion: 1,
      publisherId: 'master-soutien-pedagogique',
      snapshotId,
      publishedAt: new Date().toISOString(),
      totalPages: 1,
      totalBytes: 1234,
      fiches: [{
        id: 'prep-456', classe: 'CE1', matiere: 'Mathématiques', titre: 'Addition',
        pages: [{ path: `${snapshotId}/prep-456/page-0001.jpg`, w: 800, h: 1000, mimeType: 'image/jpeg', size: 1234 }],
        pageCount: 1, published: true, createdAt: Date.now(),
      }],
    };
    const published = responseMock();
    await handlePrepFicheSync(request(principalCookie, { action: 'publish', manifest }), published);
    assert.equal(published.statusCode, 200);
    assert.equal(published.json().published, true);
    assert.equal(published.json().version, snapshotId);
    assert.equal(catalogCalls.length, 2, 'lit l’ancien manifeste puis met à jour le catalogue');
    assert.equal(JSON.parse(catalogCalls[1].init.body)[0].catalog_id, 'current');

    const invalid = responseMock();
    await handlePrepFicheSync(request(principalCookie, {
      action: 'publish', manifest: { ...manifest, fiches: [{ ...manifest.fiches[0], published: false }] },
    }), invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error, 'PREP_FICHES_MANIFEST_INVALID');
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('le remplacement cloud est atomique et ne touche ni aux fiches locales ni aux brouillons', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-prep-fiche-idb-'));
  try {
    const outputPath = join(tempDir, 'prepFiches.cjs');
    const built = await build({
      entryPoints: ['src/utils/prepFiches.ts'],
      bundle: false,
      platform: 'node',
      format: 'cjs',
      outfile: outputPath,
      target: 'node20',
      write: false,
    });
    writeFileSync(outputPath, built.outputFiles[0].contents);
    const requireFromBundle = createRequire(outputPath);
    const prepFiches = requireFromBundle(outputPath);
    const base = {
      classe: 'CE1', matiere: 'Mathématiques', titre: 'Test',
      pages: [{ dataUrl: 'data:image/jpeg;base64,AA==', w: 1, h: 1 }],
      pageCount: 1, published: true, createdAt: 1,
    };

    await prepFiches.savePrepFiche({ ...base, id: 'local-draft', published: false });
    await prepFiches.savePrepFiche({ ...base, id: 'local-published' });
    await prepFiches.savePrepFiche({
      ...base, id: 'old-cloud', distribution: { publisherId: prepFiches.PREP_FICHE_PUBLISHER_ID, importedAt: 2 },
    });
    await prepFiches.savePrepFiche({
      ...base, id: 'other-source', distribution: { publisherId: 'another-source', importedAt: 3 },
    });

    const cloudFiche = { ...base, id: 'official-new', titre: 'Fiche officielle' };
    await prepFiches.replaceCloudPublishedPrepFiches([cloudFiche]);
    let all = await prepFiches.getAllPrepFiches();
    const byId = new Map(all.map((fiche) => [fiche.id, fiche]));
    assert.ok(byId.has('local-draft'));
    assert.ok(byId.has('local-published'));
    assert.ok(byId.has('other-source'));
    assert.equal(byId.has('old-cloud'), false);
    assert.equal(byId.get('official-new').distribution.publisherId, prepFiches.PREP_FICHE_PUBLISHER_ID);
    assert.equal(all.filter((fiche) => fiche.id === 'official-new').length, 1);

    await assert.rejects(
      prepFiches.replaceCloudPublishedPrepFiches([{ ...cloudFiche, id: 'local-draft' }]),
      /brouillon local/,
    );
    all = await prepFiches.getAllPrepFiches();
    assert.ok(all.some((fiche) => fiche.id === 'official-new'), 'le catalogue précédent est intact après annulation');
    assert.equal(all.find((fiche) => fiche.id === 'local-draft').published, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('le client récupère automatiquement une nouvelle version, la garde en cache puis évite les téléchargements répétés', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-prep-fiche-cloud-client-'));
  const dom = new JSDOM('', { url: 'https://msp.example' });
  const globalNames = ['window', 'document', 'localStorage', 'FileReader', 'fetch'];
  const originals = Object.fromEntries(globalNames.map((name) => [name, globalThis[name]]));
  try {
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.localStorage = dom.window.localStorage;
    globalThis.FileReader = class {
      result = null;
      error = null;
      onload = null;
      onerror = null;
      readAsDataURL(blob) {
        blob.arrayBuffer().then((buffer) => {
          this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
          this.onload?.();
        }).catch((error) => { this.error = error; this.onerror?.(); });
      }
    };

    writeFileSync(join(tempDir, 'package.json'), '{"type":"commonjs"}');
    await build({
      entryPoints: ['src/utils/prepFicheCloudSync.ts', 'src/utils/prepFiches.ts', 'src/utils/cloudConfig.ts'],
      outbase: 'src/utils',
      outdir: tempDir,
      bundle: false,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
    });
    const requireFromBundle = createRequire(join(tempDir, 'prepFicheCloudSync.js'));
    const cloudSync = requireFromBundle('./prepFicheCloudSync.js');
    const prepFiches = requireFromBundle('./prepFiches.js');

    const bytesV1 = Buffer.from([1, 2, 3, 4]);
    const bytesV2 = Buffer.from([5, 6, 7, 8]);
    let activeBytes = bytesV1;
    let storageDownloads = 0;
    let catalogRow = null;
    const makeManifest = (snapshotId, title) => ({
      format: 'msp-prep-fiches-cloud',
      schemaVersion: 1,
      publisherId: 'master-soutien-pedagogique',
      snapshotId,
      publishedAt: new Date().toISOString(),
      totalPages: 1,
      totalBytes: 4,
      fiches: [{
        id: 'remote-1', classe: 'CE1', matiere: 'Mathématiques', titre: title,
        pages: [{ path: `${snapshotId}/remote-1/page-0001.jpg`, w: 1, h: 1, mimeType: 'image/jpeg', size: 4 }],
        pageCount: 1, published: true, createdAt: 1,
      }],
    });
    catalogRow = { version: 'snapshot_12345678', manifest: makeManifest('snapshot_12345678', 'Version 1') };
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/msp_prep_fiches_catalog?')) return Response.json([catalogRow]);
      if (url.includes('/storage/v1/object/public/')) {
        storageDownloads++;
        return new Response(activeBytes, { headers: { 'Content-Type': 'image/jpeg' } });
      }
      throw new Error(`Unexpected client-sync request: ${url}`);
    };

    const first = await cloudSync.syncPublishedPrepFichesFromCloud();
    assert.equal(first.updated, true);
    assert.equal(first.fiches, 1);
    assert.equal(storageDownloads, 1);
    let cached = await prepFiches.getPublishedPrepFiches();
    assert.equal(cached.find((fiche) => fiche.id === 'remote-1').titre, 'Version 1');

    const unchanged = await cloudSync.syncPublishedPrepFichesFromCloud();
    assert.equal(unchanged.updated, false);
    assert.equal(storageDownloads, 1, 'une version déjà présente dans IndexedDB ne redéclenche pas le téléchargement des pages');

    activeBytes = bytesV2;
    catalogRow = { version: 'snapshot_87654321', manifest: makeManifest('snapshot_87654321', 'Version 2') };
    const update = await cloudSync.syncPublishedPrepFichesFromCloud();
    assert.equal(update.updated, true);
    assert.equal(storageDownloads, 2);
    cached = await prepFiches.getPublishedPrepFiches();
    assert.equal(cached.filter((fiche) => fiche.id === 'remote-1').length, 1);
    assert.equal(cached.find((fiche) => fiche.id === 'remote-1').titre, 'Version 2');
    assert.match(cached.find((fiche) => fiche.id === 'remote-1').pages[0].dataUrl, /BQYHCA==$/);
  } finally {
    for (const name of globalNames) {
      if (originals[name] === undefined) delete globalThis[name];
      else globalThis[name] = originals[name];
    }
    dom.window.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
