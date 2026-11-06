/**
 * COFFRE DES CODES D'ACCÈS (v36).
 *
 * Exigence : « Je ne veux plus que l'application efface les codes des
 * utilisateurs ni ceux de l'équipe après une nouvelle mise à jour. Les codes
 * doivent rester valables après chaque mise à jour, SAUF s'ils expirent, ou
 * sont retirés / supprimés par le Super Administrateur. »
 *
 * Ce module garantit trois choses :
 *
 *  1. PROTECTION — les clés qui portent l'activation de l'utilisateur, l'équipe
 *     d'administration et les codes générés sont déclarées PROTÉGÉES. Aucune
 *     routine de nettoyage, de purge de cache ou de réinitialisation technique
 *     ne doit les supprimer : `clearAllExcept()` et `purgeTechnical()` les
 *     préservent systématiquement.
 *
 *  2. DOUBLE SAUVEGARDE — à chaque démarrage, les codes sont recopiés dans une
 *     seconde zone de stockage (`msp_vault_mirror`) ET restaurés depuis
 *     celle-ci si la zone principale a été vidée. Une mise à jour de
 *     l'application (nouveau Service Worker, nouveau cache) ne peut donc plus
 *     faire disparaître un code.
 *
 *  3. RETRAIT VOLONTAIRE UNIQUEMENT — seules trois causes peuvent invalider un
 *     code : son EXPIRATION, son RETRAIT (suspension) ou sa SUPPRESSION par le
 *     Super Administrateur. Ces opérations passent par `revokeCode()` /
 *     `deleteCode()`, qui tracent l'auteur et la date.
 */
import { safeGetItem, safeSetItem } from './safeStorage';

/** Clés qui ne doivent JAMAIS être effacées par une mise à jour. */
export const PROTECTED_KEYS: string[] = [
  'msp_activation',                 // activation de l'utilisateur (son code)
  'msp_profile',                    // profil de l'enseignant
  'msp_admin_team',                 // membres de l'équipe d'administration
  'msp_generated_admin_passwords',  // codes administrateurs générés
  'msp_generated_codes',            // codes clients générés
  'msp_admin_code_log',             // journal des codes délivrés
  'msp_vault_mirror',               // copie de sécurité du coffre
  'msp_vault_revocations',          // codes retirés par le Super Administrateur
  /*
   * v55 : marqueur de l'essai gratuit. Protégé pour que le bouton
   * « Réinitialiser les données locales » ne rende pas un second essai de
   * 10 h, ce qui viderait l'offre de tout sens. Seul un Super
   * Administrateur peut le lever (écran d'administration).
   */
  'msp_trial_used',
];

const MIRROR_KEY = 'msp_vault_mirror';
const REVOKED_KEY = 'msp_vault_revocations';

/** Clés sauvegardées dans la copie de sécurité (tout sauf le miroir lui-même). */
const MIRRORED_KEYS = PROTECTED_KEYS.filter(k => k !== MIRROR_KEY);

export interface Revocation {
  code: string;
  /** 'retire' = suspendu, 'supprime' = effacé définitivement. */
  reason: 'retire' | 'supprime' | 'expire';
  by: string;
  at: number;
}

/** Vrai si la clé est protégée contre l'effacement automatique. */
export function isProtectedKey(key: string): boolean {
  return PROTECTED_KEYS.includes(key);
}

/* ------------------------------------------------------------------ */
/* 1. Copie de sécurité et restauration après mise à jour             */
/* ------------------------------------------------------------------ */

/** Recopie les codes et l'équipe dans la zone de sauvegarde. */
export function backupCredentials(): void {
  const snapshot: Record<string, string> = {};
  for (const key of MIRRORED_KEYS) {
    const value = safeGetItem(key);
    if (value !== null) snapshot[key] = value;
  }
  if (Object.keys(snapshot).length > 0) {
    safeSetItem(MIRROR_KEY, JSON.stringify({ savedAt: Date.now(), data: snapshot }));
  }
}

/**
 * Restaure depuis la copie de sécurité toute clé protégée absente.
 * Ne remplace JAMAIS une valeur existante : les données courantes priment.
 * Retourne la liste des clés effectivement restaurées.
 */
export function restoreCredentials(): string[] {
  const raw = safeGetItem(MIRROR_KEY);
  if (!raw) return [];
  let data: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw);
    data = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : {};
  } catch {
    return [];
  }
  const restored: string[] = [];
  for (const key of MIRRORED_KEYS) {
    const current = safeGetItem(key);
    const isEmpty = current === null || current === '' || current === '[]' || current === '{}';
    if (isEmpty && typeof data[key] === 'string' && data[key] !== '') {
      safeSetItem(key, data[key]);
      restored.push(key);
    }
  }
  return restored;
}

/**
 * À appeler au démarrage de l'application : restaure ce qui manque, puis
 * remet la copie de sécurité à jour. Les codes survivent ainsi à toutes les
 * mises à jour de l'application.
 */
export function ensureCredentialsSurviveUpdate(): string[] {
  const restored = restoreCredentials();
  backupCredentials();
  return restored;
}

/* ------------------------------------------------------------------ */
/* 2. Nettoyages qui respectent les codes                             */
/* ------------------------------------------------------------------ */

/**
 * Purge technique (bouton « Purger le cache » du Gestionnaire Technique) :
 * supprime les données temporaires MAIS conserve tous les codes d'accès,
 * l'activation de l'utilisateur et l'équipe d'administration.
 */
export function purgeTechnical(): string[] {
  const removed: string[] = [];
  let keys: string[] = [];
  try {
    keys = Object.keys(localStorage);
  } catch {
    return removed;
  }
  for (const key of keys) {
    if (isProtectedKey(key)) continue;          // ← codes préservés
    if (!key.startsWith('msp_cache_') && !key.startsWith('msp_tmp_')) continue;
    try { localStorage.removeItem(key); removed.push(key); } catch { /* ignore */ }
  }
  return removed;
}

/**
 * Réinitialisation demandée explicitement par l'utilisateur.
 * `keepCredentials` (défaut : true) conserve les codes d'accès afin qu'un
 * simple nettoyage ne force pas un nouvel achat de code.
 */
export function clearAllExcept(keepCredentials = true): void {
  let keys: string[] = [];
  try { keys = Object.keys(localStorage); } catch { return; }
  const saved: Record<string, string> = {};
  if (keepCredentials) {
    for (const key of PROTECTED_KEYS) {
      const v = safeGetItem(key);
      if (v !== null) saved[key] = v;
    }
  }
  for (const key of keys) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
  for (const [k, v] of Object.entries(saved)) safeSetItem(k, v);
}

/* ------------------------------------------------------------------ */
/* 3. Retrait / suppression par le Super Administrateur               */
/* ------------------------------------------------------------------ */

export function loadRevocations(): Revocation[] {
  try {
    const arr = JSON.parse(safeGetItem(REVOKED_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRevocations(list: Revocation[]): void {
  safeSetItem(REVOKED_KEY, JSON.stringify(list));
  backupCredentials();
}

/** Retire (suspend) un code : seul le Super Administrateur doit appeler ceci. */
export function revokeCode(code: string, by: string, reason: Revocation['reason'] = 'retire'): void {
  const list = loadRevocations().filter(r => r.code !== code);
  list.push({ code, reason, by, at: Date.now() });
  saveRevocations(list);
}

/** Supprime définitivement un code (Super Administrateur uniquement). */
export function deleteCode(code: string, by: string): void {
  revokeCode(code, by, 'supprime');
}

/** Réactive un code précédemment retiré. */
export function restoreCode(code: string): void {
  saveRevocations(loadRevocations().filter(r => r.code !== code));
}

/** Vrai si le code a été retiré ou supprimé par le Super Administrateur. */
export function isRevoked(code: string): boolean {
  return loadRevocations().some(r => r.code === code);
}

/**
 * Validité d'un code après une mise à jour.
 * Un code reste VALABLE sauf s'il est expiré, retiré ou supprimé.
 */
export function codeStatus(code: string, expiresAt?: number): {
  valid: boolean;
  reason: 'valide' | 'expire' | 'retire' | 'supprime';
} {
  const rev = loadRevocations().find(r => r.code === code);
  if (rev) return { valid: false, reason: rev.reason === 'supprime' ? 'supprime' : 'retire' };
  if (typeof expiresAt === 'number' && expiresAt > 0 && Date.now() > expiresAt) {
    return { valid: false, reason: 'expire' };
  }
  return { valid: true, reason: 'valide' };
}
