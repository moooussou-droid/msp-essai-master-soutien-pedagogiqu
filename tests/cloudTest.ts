/**
 * Test de bout en bout du cloud — utilise le VRAI code de l'application :
 * crypto.ts (AES-256-GCM + PBKDF2), cloudConfig.ts, licenseServer.ts
 *
 * 1. Chiffre des données de test avec un mot de passe
 * 2. Envoie sur Supabase (table backups) — même requête que pushToCloud
 * 3. Relit et déchiffre — même requête que pullFromCloud
 * 4. Vérifie l'upsert (réécriture du même sync_code)
 * 5. Teste verifyLicenseOnline (code bidon → 'notfound')
 */
import { encryptData, decryptData, hashText } from '../src/utils/crypto';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isCloudConfigured } from '../src/utils/cloudConfig';
import { verifyLicenseOnline } from '../src/utils/licenseServer';

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

const TEST_SYNC_CODE = 'AUDIT-TEST-2026';
const SECRET = 'TestSecret@2026';
const PAYLOAD = JSON.stringify({
  version: 2,
  exportDate: new Date().toISOString(),
  classes: [{ id: 'test-1', name: 'CE1 A', school: 'EPP Test', students: [{ nom: 'AHOUANSOU', prenoms: 'Jean' }] }],
  extraLocalData: {},
});

async function main() {
  let pass = 0, fail = 0;
  const ok = (cond: boolean, label: string, detail = '') => {
    if (cond) { pass++; console.log(`  ✅ ${label}`); }
    else { fail++; console.log(`  ❌ ${label} ${detail}`); }
  };

  console.log('═══ CONFIGURATION ═══');
  ok(isCloudConfigured(), `Cloud configuré (URL: ${SUPABASE_URL})`);
  ok(SUPABASE_URL.includes('fgkxjgwlihmxhvsexotq'), 'URL du projet correcte');

  console.log('\n═══ 1. Chiffrement local ═══');
  const encrypted = await encryptData(PAYLOAD, SECRET);
  ok(typeof encrypted === 'string' && encrypted.length > 100, `Données chiffrées (${encrypted.length} chars base64)`);
  ok(!encrypted.includes('CE1 A') && !encrypted.includes('AHOUANSOU'), 'Le serveur ne verra jamais les données en clair');

  console.log('\n═══ 2. Envoi sur Supabase (backups) ═══');
  const res1 = await fetch(`${SUPABASE_URL}/rest/v1/backups`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ sync_code: TEST_SYNC_CODE, data: encrypted, updated_at: new Date().toISOString() }]),
  });
  ok(res1.ok, `POST /backups → HTTP ${res1.status}`);
  if (!res1.ok) console.log('    ' + await res1.text());

  console.log('\n═══ 3. Relecture et déchiffrement ═══');
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/backups?sync_code=eq.${TEST_SYNC_CODE}&select=data,updated_at`, { headers: headers() });
  ok(res2.ok, `GET /backups → HTTP ${res2.status}`);
  const rows: any[] = await res2.json();
  ok(rows.length === 1, `1 ligne trouvée (code ${TEST_SYNC_CODE})`);
  const decrypted = await decryptData(rows[0].data, SECRET);
  ok(decrypted === PAYLOAD, 'Déchiffrement OK — contenu identique à l\'original');

  console.log('\n═══ 4. Test de ré-écriture (upsert) ═══');
  const PAYLOAD2 = PAYLOAD.replace('EPP Test', 'EPP Test V2');
  const enc2 = await encryptData(PAYLOAD2, SECRET);
  const res3 = await fetch(`${SUPABASE_URL}/rest/v1/backups`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ sync_code: TEST_SYNC_CODE, data: enc2, updated_at: new Date().toISOString() }]),
  });
  ok(res3.ok, `Upsert → HTTP ${res3.status}`);
  const res4 = await fetch(`${SUPABASE_URL}/rest/v1/backups?sync_code=eq.${TEST_SYNC_CODE}&select=data`, { headers: headers() });
  const rows2: any[] = await res4.json();
  ok(rows2.length === 1, `Toujours 1 seule ligne (pas de doublon)`);
  const dec2 = await decryptData(rows2[0].data, SECRET);
  ok(dec2 === PAYLOAD2, 'Écrasement de la sauvegarde OK (dernière version)');

  console.log('\n═══ 5. Mot de passe incorrect → refus ═══');
  let refus = false;
  try { await decryptData(rows2[0].data, 'MAUVAIS-MDP'); } catch { refus = true; }
  ok(refus, 'Mauvais mot de passe → erreur (aucune fuite de données)');

  console.log('\n═══ 6. Table licenses (validation des codes) ═══');
  const status = await verifyLicenseOnline('Enseignant Test', 'AAAA-BBBB-CCCC-DDDD');
  ok(status === 'notfound', `Code bidon → 'notfound' (obtenu: ${status})`);

  console.log('\n════════════════════════════════════');
  console.log(`RÉSULTAT CLOUD : ${pass} réussis, ${fail} échoués`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error('Erreur:', e); process.exit(1); });
