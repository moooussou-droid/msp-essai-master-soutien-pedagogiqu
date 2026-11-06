/**
 * Validation des codes d'accès CÔTÉ SERVEUR (sécurité maximale).
 *
 * En complément de la vérification cryptographique locale (license.ts), ce module :
 * - Enregistre chaque code généré sur le serveur (Supabase, table `licenses`).
 * - Vérifie en ligne qu'un code est bien enregistré ET non révoqué.
 * - Permet à l'administrateur de RÉVOQUER un code à distance (non-paiement, partage abusif).
 *
 * Si le cloud n'est pas configuré, le système retombe automatiquement sur la
 * validation locale hors-ligne (license.ts) : l'application reste fonctionnelle.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isCloudConfigured } from './cloudConfig';
import { normalizeName, cleanCode } from './license';

export interface LicenseRow {
  code: string;
  name: string;
  status: 'active' | 'revoked';
  created_at?: string;
}

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Indique si la validation serveur est disponible. */
export function isServerLicensingEnabled(): boolean {
  return isCloudConfigured();
}

/**
 * Enregistre (ou met à jour) un code d'accès sur le serveur.
 * Appelé par l'administrateur au moment de générer un code.
 */
export async function registerLicense(name: string, code: string): Promise<void> {
  if (!isCloudConfigured()) throw new Error('CLOUD_NON_CONFIGURE');

  const body = [{
    code: cleanCode(code),
    name: normalizeName(name),
    status: 'active',
    created_at: new Date().toISOString(),
  }];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur d'enregistrement (${res.status}) : ${txt}`);
  }
}

/**
 * Vérifie en ligne qu'un code existe, correspond au nom et est actif.
 * Retourne 'valid' | 'revoked' | 'notfound' | 'mismatch'.
 */
export async function verifyLicenseOnline(
  name: string,
  code: string
): Promise<'valid' | 'revoked' | 'notfound' | 'mismatch'> {
  if (!isCloudConfigured()) throw new Error('CLOUD_NON_CONFIGURE');

  const c = cleanCode(code);
  const url = `${SUPABASE_URL}/rest/v1/licenses?code=eq.${encodeURIComponent(c)}&select=code,name,status`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur de vérification (${res.status}) : ${txt}`);
  }

  const rows: LicenseRow[] = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return 'notfound';

  const row = rows[0];
  if (row.status === 'revoked') return 'revoked';
  if (row.name !== normalizeName(name)) return 'mismatch';
  return 'valid';
}

/** Récupère la liste de tous les codes (pour l'administrateur). */
export async function listLicenses(): Promise<LicenseRow[]> {
  if (!isCloudConfigured()) throw new Error('CLOUD_NON_CONFIGURE');

  const url = `${SUPABASE_URL}/rest/v1/licenses?select=code,name,status,created_at&order=created_at.desc`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur de liste (${res.status}) : ${txt}`);
  }
  return res.json();
}

/** Change le statut d'un code (active / revoked). */
export async function setLicenseStatus(code: string, status: 'active' | 'revoked'): Promise<void> {
  if (!isCloudConfigured()) throw new Error('CLOUD_NON_CONFIGURE');

  const url = `${SUPABASE_URL}/rest/v1/licenses?code=eq.${encodeURIComponent(cleanCode(code))}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Erreur de mise à jour (${res.status}) : ${txt}`);
  }
}
