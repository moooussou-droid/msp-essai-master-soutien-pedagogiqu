/**
 * PAIEMENT ET DÉVERROUILLAGE DES CONTENUS PAYANTS (v38).
 *
 * Règle métier demandée :
 *  1. Tout contenu payant (cours OU livre) n'affiche qu'un extrait.
 *  2. Quand l'utilisateur demande le contenu complet, l'application lui indique
 *     le montant à payer AUPRÈS DU SUPER ADMINISTRATEUR et lui fournit les
 *     coordonnées de contact.
 *  3. L'utilisateur contacte l'administrateur et paie.
 *  4. Le Super Administrateur déverrouille alors CE contenu pour CET utilisateur,
 *     au moyen d'un code de déverrouillage.
 *  5. L'utilisateur obtient l'accès complet et peut télécharger le PDF joint.
 *
 * Aucune transaction en ligne : le paiement est direct (mobile money, espèces).
 * Tout est stocké localement ; les clés sont protégées contre les mises à jour.
 */

/** v41 : les images de la banque éducative sont aussi des contenus payants. */
/** v61 : la personnalisation du filigrane des fiches de préparation est payante (5 F / page). */
/** v61 : le téléchargement PDF d'un bulletin est payant (15 F par bulletin). */
/** v62 : une formation MOOC peut être payante (ou partiellement payante). */
export type PaidContentKind = 'cours' | 'livre' | 'image' | 'signature' | 'fiche' | 'bulletin' | 'formation';

/** Coordonnées du Super Administrateur, paramétrables depuis la gouvernance. */
export interface PaymentContact {
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Téléphone / mobile money. */
  phone: string;
  /** Numéro WhatsApp (peut être identique au téléphone). */
  whatsapp: string;
  /** Adresse e-mail (facultative). */
  email: string;
  /** Consignes libres affichées à l'utilisateur (opérateur, horaires...). */
  instructions: string;
}

export const PAYMENT_CONTACT_KEY = 'msp_payment_contact';
export const UNLOCKS_KEY = 'msp_content_unlocks';
export const PAYMENT_REQUESTS_KEY = 'msp_payment_requests';

const DEFAULT_CONTACT: PaymentContact = {
  name: 'Super Administrateur — Master Soutien Pédagogique',
  phone: '+229 00 00 00 00',
  whatsapp: '+229 00 00 00 00',
  email: '',
  instructions:
    'Contactez le Super Administrateur par appel ou WhatsApp pour régler le montant '
    + '(Mobile Money ou espèces). Communiquez-lui votre identifiant affiché ci-dessous. '
    + 'Il vous transmettra ensuite un code de déverrouillage à saisir dans l’application.',
};

export function getPaymentContact(): PaymentContact {
  try {
    const raw = localStorage.getItem(PAYMENT_CONTACT_KEY);
    if (!raw) return { ...DEFAULT_CONTACT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONTACT, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_CONTACT };
  }
}

export function savePaymentContact(contact: Partial<PaymentContact>): PaymentContact {
  const merged = { ...getPaymentContact(), ...contact };
  try { localStorage.setItem(PAYMENT_CONTACT_KEY, JSON.stringify(merged)); } catch { /* quota */ }
  return merged;
}

/** Le contact a-t-il été réellement renseigné par le Super Administrateur ? */
export function isContactConfigured(contact = getPaymentContact()): boolean {
  const digits = (contact.phone || '').replace(/\D/g, '');
  return digits.length >= 8 && !/^2290{8,}$/.test(digits);
}

/* ------------------------------------------------------------------ */
/* Identifiant de l'appareil / de l'utilisateur                        */
/* ------------------------------------------------------------------ */

const DEVICE_KEY = 'msp_device_id';

/**
 * Identifiant court et stable, communiqué à l'administrateur pour qu'il
 * génère un code de déverrouillage valable uniquement sur cet appareil.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = 'MSP-' + Math.random().toString(36).slice(2, 7).toUpperCase()
      + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'MSP-LOCAL';
  }
}

/* ------------------------------------------------------------------ */
/* Code de déverrouillage                                              */
/* ------------------------------------------------------------------ */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Code déterministe à 8 caractères, propre au couple (contenu, appareil).
 * Le Super Administrateur le calcule depuis son tableau de bord, l'utilisateur
 * le saisit : aucune connexion n'est nécessaire de part et d'autre.
 */
export function unlockCodeFor(contentId: string, deviceId: string): string {
  const raw = `${contentId}::${deviceId}::msp-unlock-v1`;
  const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
  const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
  return `${a}-${b}`;
}

/* ------------------------------------------------------------------ */
/* Déverrouillages accordés                                            */
/* ------------------------------------------------------------------ */

export interface UnlockRecord {
  contentId: string;
  kind: PaidContentKind;
  title: string;
  unlockedAt: number;
  /** 'code' = saisi par l'utilisateur, 'admin' = accordé directement. */
  via: 'code' | 'admin';
}

export function loadUnlocks(): Record<string, UnlockRecord> {
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistUnlocks(all: Record<string, UnlockRecord>) {
  try { localStorage.setItem(UNLOCKS_KEY, JSON.stringify(all)); } catch { /* quota */ }
}

/** Le contenu est-il accessible intégralement ? */
export function isUnlocked(contentId: string): boolean {
  return !!loadUnlocks()[contentId];
}

/** Déverrouillage direct par le Super Administrateur. */
export function grantUnlock(contentId: string, kind: PaidContentKind, title: string, via: UnlockRecord['via'] = 'admin'): void {
  const all = loadUnlocks();
  all[contentId] = { contentId, kind, title, unlockedAt: Date.now(), via };
  persistUnlocks(all);
}

/** Retrait de l'accès par le Super Administrateur. */
export function revokeUnlock(contentId: string): void {
  const all = loadUnlocks();
  delete all[contentId];
  persistUnlocks(all);
}

/**
 * Tentative de déverrouillage par code saisi par l'utilisateur.
 * Renvoie true si le code est valide (et enregistre l'accès).
 */
export function redeemUnlockCode(contentId: string, kind: PaidContentKind, title: string, code: string): boolean {
  const expected = unlockCodeFor(contentId, getDeviceId());
  const given = (code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!given || given !== expected) return false;
  grantUnlock(contentId, kind, title, 'code');
  return true;
}

/* ------------------------------------------------------------------ */
/* Demandes de paiement (journal pour l'administrateur)                */
/* ------------------------------------------------------------------ */

export interface PaymentRequest {
  contentId: string;
  kind: PaidContentKind;
  title: string;
  price: string;
  deviceId: string;
  requestedAt: number;
  status: 'en_attente' | 'paye';
}

export function loadPaymentRequests(): PaymentRequest[] {
  try {
    const raw = localStorage.getItem(PAYMENT_REQUESTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Enregistre (ou rafraîchit) la demande d'accès d'un utilisateur. */
export function recordPaymentRequest(contentId: string, kind: PaidContentKind, title: string, price: string): PaymentRequest {
  const all = loadPaymentRequests().filter((r) => r.contentId !== contentId);
  const req: PaymentRequest = {
    contentId, kind, title, price,
    deviceId: getDeviceId(),
    requestedAt: Date.now(),
    status: 'en_attente',
  };
  const next = [req, ...all].slice(0, 200);
  try { localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return req;
}

export function markRequestPaid(contentId: string): void {
  const all = loadPaymentRequests().map((r) => (r.contentId === contentId ? { ...r, status: 'paye' as const } : r));
  try { localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(all)); } catch { /* quota */ }
}

/* ------------------------------------------------------------------ */
/* Aperçu gratuit                                                      */
/* ------------------------------------------------------------------ */

/** Nombre de leçons consultables gratuitement dans un contenu payant. */
export const FREE_PREVIEW_LESSONS = 1;

/**
 * Le contenu payant est-il verrouillé pour l'utilisateur ?
 * Un contenu gratuit ne l'est jamais.
 */
export function isContentLocked(type: 'gratuit' | 'payant', contentId: string): boolean {
  return type === 'payant' && !isUnlocked(contentId);
}

/** Message affiché lorsque l'utilisateur demande le contenu complet. */
export function paymentMessage(title: string, price: string, kind: PaidContentKind): string {
  // v42 : la personnalisation de signature n'est pas un contenu a consulter,
  // le message doit donc etre formule differemment.
  if (kind === 'signature') {
    return `Pour personnaliser la signature de vos images et documents, vous devez régler `
      + `${price} FCFA auprès du Super Administrateur. Après paiement, il vous transmettra `
      + `un code qui vous permettra de remplacer « Master Soutien Pédagogique `
      + `(Votre compagnon mobile) » par la signature de votre choix.`;
  }
  if (kind === 'fiche') {
    return `Pour personnaliser le filigrane de la fiche de préparation « ${title} » `
      + `(5 F par page), vous devez régler ${price} FCFA auprès du Super Administrateur. `
      + `Après paiement, il vous transmettra un code de déverrouillage qui vous permettra de `
      + `remplacer le filigrane « Master Soutien Pédagogique » par le vôtre, puis de télécharger la fiche.`;
  }
  if (kind === 'bulletin') {
    return `Le téléchargement en PDF « ${title} » coûte ${price} FCFA (15 F par bulletin), `
      + `à régler auprès du Super Administrateur. Après paiement, il vous transmettra un code de `
      + `déverrouillage qui ouvrira le téléchargement du PDF.`;
  }
  if (kind === 'formation') {
    return `Pour accéder à l’intégralité de la formation « ${title} », vous devez régler `
      + `${price} FCFA auprès du Super Administrateur. Après paiement, il vous transmettra un code `
      + `de déverrouillage qui ouvrira toutes les leçons et le certificat.`;
  }
  const quoi = kind === 'livre' ? 'ce livre' : kind === 'image' ? 'cette image' : 'ce cours';
  return `Pour accéder à l’intégralité de ${quoi} « ${title} », vous devez régler `
    + `${price} FCFA auprès du Super Administrateur. Après paiement, il vous transmettra `
    + `un code de déverrouillage qui ouvrira l’accès complet et le téléchargement du PDF.`;
}

/** Lien WhatsApp pré-rempli avec la demande de l'utilisateur. */
export function whatsappLink(contact: PaymentContact, title: string, price: string, kind: PaidContentKind): string {
  const num = (contact.whatsapp || contact.phone || '').replace(/[^\d]/g, '');
  if (kind === 'signature') {
    const t = `Bonjour, je souhaite payer ${price} FCFA pour personnaliser la signature `
      + `de mes documents sur Master Soutien Pédagogique. Mon identifiant est ${getDeviceId()}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(t)}`;
  }
  if (kind === 'fiche') {
    const t = `Bonjour, je souhaite payer ${price} FCFA pour personnaliser le filigrane de la `
      + `fiche de préparation « ${title} » (5 F / page) sur Master Soutien Pédagogique. `
      + `Mon identifiant est ${getDeviceId()}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(t)}`;
  }
  if (kind === 'bulletin') {
    const t = `Bonjour, je souhaite payer ${price} FCFA pour télécharger en PDF « ${title} » `
      + `(15 F par bulletin) sur Master Soutien Pédagogique. Mon identifiant est ${getDeviceId()}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(t)}`;
  }
  if (kind === 'formation') {
    const t = `Bonjour, je souhaite payer ${price} FCFA pour accéder à la formation `
      + `« ${title} » sur Master Soutien Pédagogique. Mon identifiant est ${getDeviceId()}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(t)}`;
  }
  const quoi = kind === 'livre' ? 'au livre' : kind === 'image' ? "à l'image" : 'au cours';
  const texte = `Bonjour, je souhaite payer ${price} FCFA pour accéder ${quoi} `
    + `« ${title} » sur Master Soutien Pédagogique. Mon identifiant est ${getDeviceId()}.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texte)}`;
}
