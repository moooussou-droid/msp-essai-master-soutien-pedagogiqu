/**
 * Sceau d'authenticité des bulletins (vérification).
 *
 * Le lien de vérification contient un JSON en base64. Un code d'intégrité
 * (hash déterministe) est ajouté pour détecter toute modification du
 * contenu : le certificat affiche alors « Intégrité vérifiée » ou
 * « Données altérées ». L'ancien format (base64 simple) reste lisible
 * mais est signalé comme « non signé ».
 */

const SALT = 'msp-bulletin-seal-v1';

export type BulletVerifyStatus = 'valid' | 'tampered' | 'unsigned' | 'invalid';

export interface BulletVerifyResult {
  status: BulletVerifyStatus;
  data: Record<string, string> | null;
}

/** Hash déterministe (FNV-1a 32 bits ×2) — synchrone et sans dépendance. */
export function sealHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Enveloppe les données avec un code d'intégrité puis retourne la payload. */
export function buildVerifiedPayload(data: Record<string, unknown>): string {
  const inner = btoa(encodeURIComponent(JSON.stringify(data)));
  const sig = sealHash(inner + SALT);
  return btoa(encodeURIComponent(JSON.stringify({ sig, data: inner })));
}

/** Décode et vérifie la payload. Ne lève jamais d'exception. */
export function verifyBulletinPayload(raw: string): BulletVerifyResult {
  try {
    const envelope = JSON.parse(decodeURIComponent(atob(raw)));
    if (!envelope || typeof envelope !== 'object') return { status: 'invalid', data: null };
    const { sig, data } = envelope as { sig?: unknown; data?: unknown };
    if (typeof data !== 'string' || !data) {
      // Ancien format (base64 simple, sans enveloppe) : lisible mais non signé
      if (typeof envelope === 'object' && ('code' in envelope || 'matricule' in envelope)) {
        return { status: 'unsigned', data: envelope as Record<string, string> };
      }
      return { status: 'invalid', data: null };
    }
    if (typeof sig !== 'string') {
      // Ancien format (enveloppe sans signature) : lisible mais non signé
      return { status: 'unsigned', data: JSON.parse(decodeURIComponent(atob(data))) };
    }
    const expected = sealHash(data + SALT);
    const parsed = JSON.parse(decodeURIComponent(atob(data))) as Record<string, string>;
    return { status: sig === expected ? 'valid' : 'tampered', data: parsed };
  } catch {
    return { status: 'invalid', data: null };
  }
}
