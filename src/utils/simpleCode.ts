/**
 * Codes d'accès SIMPLES — 6 chiffres, validés 100 % hors-ligne.
 *
 * - Un code simple = 6 chiffres avec chiffre de contrôle de LUHN :
 *   l'application le vérifie elle-même, sans serveur ni connexion.
 * - Format d'affichage : « 783 420 » (espace après le 3e chiffre).
 * - TARIFICATION : le code porte la formule d'abonnement —
 *     * codes commençant par « 9 » → Essentiel (999 FCFA/an)
 *     * codes commençant par « 1 » → Complet (1500 FCFA/an)
 *     * codes commençant par « 2 » → Pro (2500 FCFA/an, v53)
 *     * codes commençant par « 6 » → École Primaire (6000 FCFA/an, v64)
 *     * codes commençant par « 7 » → École Complète (10000 FCFA/an, v64)
 *   Les codes antérieurs à la tarification restent acceptés (Complet).
 *   Les formules ÉCOLE (v64) sont des SUPER-ENSEMBLES du Pro : un code
 *   ancien commençant par « 6 » ou « 7 » gagne des droits, il n'en perd
 *   jamais — la règle « aucun droit retiré » est respectée.
 * - Le code GÉNÉRAL de l'application (mot de passe administrateur) n'est pas
 *   modifié ; les codes personnels des administrateurs suivent la même règle
 *   de 6 chiffres mais ne portent pas d'abonnement.
 */

/** Formule d'abonnement portée par un code. */
export type SubscriptionPlan =
  | 'essentiel' | 'complet' | 'pro'
  /** v64 — abonnement annuel d'ÉTABLISSEMENT : espace propre à l'école. */
  | 'ecole-primaire' | 'ecole-complete';

/**
 * Le plan est encodé dans le PREMIER chiffre du code :
 *  - « 9 » → Essentiel (999 FCFA/an : enrôlement + importation des notes)
 *  - « 1 » → Complet (1500 FCFA/an : les fonctions pédagogiques)
 *  - « 2 » → Pro (2500 FCFA/an, v53 : Complet + les 4 modules de gestion)
 *  - « 6 » → École Primaire (6000 FCFA/an, v64 : espace école
 *    Maternelle → CM2, toutes les fonctions Pro incluses)
 *  - « 7 » → École Complète (10000 FCFA/an, v64 : espace école
 *    Maternelle → Terminale, toutes les fonctions Pro incluses)
 *
 * ⚠️ COMPATIBILITÉ : un code déjà remis à un enseignant ne doit JAMAIS
 * perdre ses droits (règle constante du projet). Les codes « 1 » gardent
 * donc exactement le périmètre qu'ils avaient ; seuls les NOUVEAUX codes
 * « 2 » ouvrent les modules de gestion. Les formules École étant des
 * super-ensembles du Pro, un ancien code en « 6 »/« 7 » (traité Complet
 * jusqu'ici) ne peut lui aussi que gagner des droits.
 */
export function planOfCode(code: string): SubscriptionPlan {
  const c = cleanSimpleCode(code);
  if (c.length === 6 && c.startsWith('9')) return 'essentiel';
  if (c.length === 6 && c.startsWith('2')) return 'pro';
  if (c.length === 6 && c.startsWith('6')) return 'ecole-primaire';
  if (c.length === 6 && c.startsWith('7')) return 'ecole-complete';
  return 'complet';
}

/** Premier chiffre qui porte la formule (pour l'affichage administrateur). */
export function codePrefixOfPlan(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'essentiel': return '9';
    case 'pro': return '2';
    case 'ecole-primaire': return '6';
    case 'ecole-complete': return '7';
    default: return '1';
  }
}

/** Durée de validité d'un code d'accès : 1 an (365 jours). */
export const CODE_VALIDITY_DAYS = 365;
const MS_DAY = 86400000;

/** Enlève tout ce qui n'est pas un chiffre (espaces, tirets, lettres…). */
export function cleanSimpleCode(code: string): string {
  return (code || '').replace(/[^0-9]/g, '');
}

/** Chiffre de contrôle de Luhn pour 5 chiffres (renvoie 1 chiffre). */
function luhnCheckDigit(digits: string): number {
  let sum = 0;
  let dbl = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Un code simple valide = exactement 6 chiffres + chiffre de contrôle Luhn.
 * Validation 100 % hors-ligne : aucun serveur nécessaire.
 */
export function isValidSimpleCode(code: string): boolean {
  const c = cleanSimpleCode(code);
  if (c.length !== 6) return false;
  return luhnCheckDigit(c.slice(0, 5)) === c.charCodeAt(5) - 48;
}

/** Génère un code simple valide (6 chiffres, ex. « 783 423 ») pour un plan donné. */
export function generateSimpleCode(plan: SubscriptionPlan = 'complet'): string {
  const prefix = codePrefixOfPlan(plan);
  let base = prefix;
  for (let i = 1; i < 5; i++) base += String(Math.floor(Math.random() * 10));
  return base + String(luhnCheckDigit(base));
}

/** Génère une liste de n codes simples valides et distincts pour un plan donné. */
export function generateSimpleCodes(n: number, plan: SubscriptionPlan = 'complet'): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (codes.length < n && guard < n * 30) {
    guard++;
    const c = generateSimpleCode(plan);
    if (!seen.has(c)) { seen.add(c); codes.push(c); }
  }
  return codes;
}

/**
 * Un code d'accès client est accepté s'il respecte la règle des 6 chiffres (Luhn).
 * Le plan (999/1500) est ensuite lu par planOfCode ; les codes antérieurs à la
 * tarification restent acceptés et sont traités en Complet.
 */
export function isAccessCode(code: string): boolean {
  return isValidSimpleCode(code);
}

/** Libellé lisible d'un code (« 783420 » → « 783 420 »). */
export function formatSimpleCode(code: string): string {
  const c = cleanSimpleCode(code);
  return c.replace(/(\d{3})(\d{3})/, '$1 $2');
}

/* ------------------------------------------------------------------ */
/* Chrono d'expiration — les codes d'accès sont valables 1 AN.         */
/* ------------------------------------------------------------------ */

/** Date d'expiration (timestamp ms) = début + 1 an. */
export function expiresAtFrom(start: number): number {
  return start + CODE_VALIDITY_DAYS * MS_DAY;
}

/** Jours restants avant expiration (négatif si expiré). */
export function daysRemaining(expiresAt: number): number {
  return Math.ceil((expiresAt - Date.now()) / MS_DAY);
}

/** Formate un timestamp en « JJ/MM/AAAA ». */
export function formatDateFr(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
