/**
 * Système de codes d'accès personnels, validables HORS-LIGNE.
 *
 * Principe :
 * - Le code d'un utilisateur est une signature cryptographique (HMAC-SHA256)
 *   calculée à partir de son NOM et de la clé secrète (LICENSE_SECRET).
 * - L'application recalcule la même signature à partir du nom saisi et compare.
 * - Un code ne fonctionne donc qu'avec le nom exact pour lequel il a été généré :
 *   il est personnel et infalsifiable sans la clé secrète.
 */

import { LICENSE_SECRET } from './adminConfig';

const enc = new TextEncoder();

/** Normalise un nom pour que la validation soit tolérante (casse, espaces, accents). */
export function normalizeName(name: string): string {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Calcule HMAC-SHA256(secret, message) en hexadécimal. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toHex(sig);
}

/**
 * Génère le code d'accès personnel pour un nom donné.
 * Format lisible : XXXX-XXXX-XXXX-XXXX (16 caractères hexadécimaux en majuscules).
 */
export async function generateAccessCode(name: string): Promise<string> {
  const normalized = normalizeName(name);
  const hex = await hmacHex(LICENSE_SECRET, normalized);
  const code = hex.substring(0, 16).toUpperCase();
  return code.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

/** Nettoie un code saisi (enlève tirets/espaces, met en majuscules). */
export function cleanCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** Vérifie qu'un code correspond bien au nom fourni. */
export async function verifyAccessCode(name: string, code: string): Promise<boolean> {
  if (!name.trim() || !code.trim()) return false;
  const expected = cleanCode(await generateAccessCode(name));
  const provided = cleanCode(code);
  if (expected.length !== provided.length) return false;
  // Comparaison caractère par caractère
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== provided[i]) diff++;
  }
  return diff === 0;
}
