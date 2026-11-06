/**
 * v42 — Signature des documents et images produits par l'application.
 *
 * RÈGLE MÉTIER (demande de l'utilisateur, v42)
 * --------------------------------------------
 * Tout document ou image obtenu DANS l'application porte la signature
 * « Master Soutien Pédagogique (Votre compagnon mobile) ».
 *
 * DEUX EXCEPTIONS, volontairement distinctes :
 *
 *  1. Les créations personnelles de l'utilisateur issues des sous-modules IA
 *     (générateur de gravures, assistant IA) ne portent PAS cette signature :
 *     l'utilisateur en est l'auteur, il a rédigé lui-même la consigne.
 *     → on appelle alors `signatureFor('creation-ia')`, qui renvoie null.
 *
 *  2. L'utilisateur qui ne souhaite pas de signature imposée peut payer
 *     SIGNATURE_PRICE_FCFA (500 F) auprès du Super Administrateur pour
 *     personnaliser le texte. Le déverrouillage réutilise exactement le
 *     mécanisme v38 (code lié à l'appareil), via coursePayment.
 *
 * Tant que la personnalisation n'est pas payée, la signature par défaut
 * s'applique, même si un texte personnalisé a été saisi : le paiement est
 * la seule porte d'entrée (voir `effectiveSignature`).
 */

import { isUnlocked } from './coursePayment';
import { safeGetItem, safeSetItem } from './safeStorage';

/** Signature imposée par défaut sur toute production de l'application. */
export const DEFAULT_SIGNATURE = 'Master Soutien Pédagogique (Votre compagnon mobile)';

/** Prix unique de la personnalisation de signature, en FCFA. */
export const SIGNATURE_PRICE_FCFA = 500;

/**
 * Identifiant de contenu payant utilisé pour la personnalisation.
 * Volontairement stable : le Super Administrateur calcule le code à partir
 * de cet identifiant et de l'identifiant d'appareil de l'utilisateur.
 */
export const SIGNATURE_UNLOCK_ID = 'signature-personnalisee';

/** Titre lisible, affiché dans l'espace d'administration. */
export const SIGNATURE_UNLOCK_TITLE = 'Personnalisation de la signature';

const KEY = 'msp_signature_settings';

export interface SignatureSettings {
  /** Texte souhaité par l'utilisateur (n'a d'effet qu'une fois payé). */
  customText: string;
  /** L'utilisateur veut-il utiliser son texte plutôt que celui par défaut ? */
  useCustom: boolean;
}

const DEFAULTS: SignatureSettings = { customText: '', useCustom: false };

export function loadSignatureSettings(): SignatureSettings {
  try {
    const raw = safeGetItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SignatureSettings>;
    return {
      customText: typeof parsed.customText === 'string' ? parsed.customText : '',
      useCustom: parsed.useCustom === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSignatureSettings(s: SignatureSettings): void {
  try {
    safeSetItem(KEY, JSON.stringify({
      customText: (s.customText || '').slice(0, 120),
      useCustom: s.useCustom === true,
    }));
  } catch { /* quota : on garde la signature par defaut */ }
}

/** La personnalisation a-t-elle été payée puis déverrouillée ? */
export function isSignatureUnlocked(): boolean {
  return isUnlocked(SIGNATURE_UNLOCK_ID);
}

/**
 * Nature du document à signer.
 *  - 'application'  : tout ce que l'application produit (bulletins, cantine,
 *                     banque d'images, rapports, comptabilité…) → signé.
 *  - 'creation-ia'  : image ou fiche générée par l'utilisateur via un
 *                     sous-module IA → non signé (exception demandée).
 */
export type DocumentOrigin = 'application' | 'creation-ia';

/**
 * Signature à apposer, ou null s'il ne faut rien apposer.
 *
 * Trois cas, dans cet ordre :
 *  1. création IA de l'utilisateur           → null (aucune signature) ;
 *  2. personnalisation payée ET texte fourni → texte de l'utilisateur ;
 *  3. tous les autres cas                    → signature par défaut.
 */
export function signatureFor(origin: DocumentOrigin = 'application'): string | null {
  if (origin === 'creation-ia') return null;

  const s = loadSignatureSettings();
  const custom = (s.customText || '').trim();
  if (s.useCustom && custom && isSignatureUnlocked()) return custom;

  return DEFAULT_SIGNATURE;
}

/**
 * Signature réellement appliquée aujourd'hui, pour l'affichage d'un aperçu
 * dans l'écran de réglages (toujours du point de vue « document de
 * l'application »).
 */
export function effectiveSignature(): string {
  return signatureFor('application') || DEFAULT_SIGNATURE;
}

/**
 * Explication honnête de l'état courant, affichée à l'utilisateur pour qu'il
 * comprenne pourquoi sa signature personnalisée s'applique ou non.
 */
export function signatureStatusMessage(): string {
  const s = loadSignatureSettings();
  const custom = (s.customText || '').trim();
  if (!isSignatureUnlocked()) {
    return `Vos documents portent la signature « ${DEFAULT_SIGNATURE} ». `
      + `La personnalisation coûte ${SIGNATURE_PRICE_FCFA} FCFA, à régler auprès du Super Administrateur.`;
  }
  if (!s.useCustom || !custom) {
    return 'Personnalisation activée. Vous utilisez actuellement la signature par défaut ; '
      + 'saisissez votre texte et cochez l’option pour le remplacer.';
  }
  return `Vos documents portent votre signature personnalisée : « ${custom} ».`;
}
