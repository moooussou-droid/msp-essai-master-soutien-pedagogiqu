/**
 * Chiffrement de bout en bout (end-to-end) pour Master Soutien Pédagogique.
 *
 * Principe de confidentialité :
 * - Les données sont chiffrées SUR LE TÉLÉPHONE avec un mot de passe secret
 *   que vous seul connaissez, AVANT d'être envoyées sur internet.
 * - Le serveur ne reçoit qu'un "blob" illisible (chiffré).
 * - Sans votre mot de passe secret, PERSONNE ne peut lire vos données :
 *   ni le serveur, ni l'administrateur de l'application, ni un pirate.
 *
 * Technologie : Web Crypto API (standard du navigateur), AES-GCM 256 bits,
 * dérivation de clé PBKDF2 (200 000 itérations, SHA-256).
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Convertit un ArrayBuffer en base64. */
function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convertit une base64 en Uint8Array. */
function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Dérive une clé AES-GCM à partir d'un mot de passe et d'un sel. */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 200000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre une chaîne de texte avec un mot de passe.
 * Retourne une chaîne base64 contenant : sel + IV + données chiffrées.
 */
export async function encryptData(plainText: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(plainText)
  );

  // Concatène sel(16) + iv(12) + ciphertext
  const cipherBytes = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(salt.length + iv.length + cipherBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(cipherBytes, salt.length + iv.length);

  return bufToBase64(combined.buffer);
}

/**
 * Déchiffre une chaîne base64 (sel + IV + données) avec le mot de passe.
 * Lève une erreur si le mot de passe est incorrect.
 */
export async function decryptData(encryptedB64: string, passphrase: string): Promise<string> {
  const combined = base64ToBuf(encryptedB64);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const cipher = combined.slice(28);

  const key = await deriveKey(passphrase, salt);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    cipher as unknown as BufferSource
  );

  return dec.decode(plainBuf);
}

/**
 * Empreinte non réversible d'un texte (SHA-256, base64).
 * Sert à vérifier un mot de passe sans jamais le stocker en clair.
 */
export async function hashText(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bufToBase64(buf);
}
