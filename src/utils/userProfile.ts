/**
 * Gestion de l'espace utilisateur : activation (code d'accès) et profil.
 * Tout est stocké localement (localStorage) sur l'appareil de l'utilisateur.
 */

import { planOfCode, SubscriptionPlan } from './simpleCode';

export interface UserActivation {
  activated: boolean;
  name: string;
  code: string;
  activatedAt: number;
  /** Date d'expiration de l'abonnement : activation + 1 an (chrono). */
  expiresAt?: number;
  /** Formule d'abonnement lue dans le code : 999 FCFA/an ou 1500 FCFA/an. */
  plan?: SubscriptionPlan;
}

export interface UserProfile {
  teacherName: string;
  schoolName: string;
  schoolLogo?: string; // image en base64 (data URL)
  phone?: string;
  circonscription?: string; // utilisée sur bulletins, courriers, PV
  commune?: string;
}

const ACTIVATION_KEY = 'msp_activation';
const PROFILE_KEY = 'msp_profile';

/* ------- Activation ------- */

export function getActivation(): UserActivation | null {
  try {
    const raw = localStorage.getItem(ACTIVATION_KEY);
    if (raw) {
      const a = JSON.parse(raw) as UserActivation;
      return migrateActivation(a);
    }
  } catch { /* ignore */ }
  return null;
}

/** Plans reconnus par cette version (v64 inclus). */
const KNOWN_PLANS: SubscriptionPlan[] = [
  'essentiel', 'complet', 'pro', 'ecole-primaire', 'ecole-complete',
];

/** Reprise (migration) : donne expiration (+1 an) et plan (Complet) aux
 *  activations créées avant le chrono et avant la tarification. */
function migrateActivation(a: UserActivation): UserActivation {
  let changed = false;
  if (typeof a.expiresAt !== 'number') {
    const base = (a.activatedAt && a.activatedAt > 0) ? a.activatedAt : Date.now();
    a.expiresAt = base + 365 * 86400000;
    changed = true;
  }
  // v53 : « pro » rejoint les plans reconnus. v64 : les plans École aussi.
  // Une activation sans plan (anterieure a la tarification) conserve
  // l'acces Complet ; un plan connu n'est JAMAIS rabaissé.
  if (!a.plan || !KNOWN_PLANS.includes(a.plan)) {
    a.plan = 'complet'; // avant la tarification : accès complet conservé
    changed = true;
  }
  if (changed) {
    try { localStorage.setItem(ACTIVATION_KEY, JSON.stringify(a)); } catch { /* ignore */ }
  }
  return a;
}

/** Chrono + formule de l'abonnement en cours. */
export function getActivationChrono() {
  const a = getActivation();
  if (!a || a.activated !== true) {
    return { active: false, expiresAt: null, daysLeft: 0, expired: false, plan: 'complet' as SubscriptionPlan, name: '' };
  }
  const daysLeft = Math.ceil(((a.expiresAt ?? 0) - Date.now()) / 86400000);
  return {
    active: true,
    expiresAt: a.expiresAt ?? null,
    daysLeft,
    expired: daysLeft < 0,
    /*
     * ⚠️ Ne PAS rabattre les plans inconnus sur « complet » sans traiter
     * « pro » (v53) ni les plans École (v64) : un etablissement ayant paye
     * 6000/10000 F se verrait refuser son propre Espace École.
     * La migration garantit deja un plan connu ; on le restitue tel quel.
     */
    plan: (a.plan && KNOWN_PLANS.includes(a.plan) ? a.plan : 'complet') as SubscriptionPlan,
    name: a.name,
  };
}

/**
 * L'utilisateur a-t-il au moins l'abonnement COMPLET ?
 * « pro » et les formules École incluent « complet » : sans ce test, un
 * abonne aurait perdu des fonctions pedagogiques auxquelles il a droit.
 */
export function hasFullAccess(): boolean {
  return getActivationChrono().plan !== 'essentiel';
}

/** L'utilisateur dispose-t-il du périmètre PRO (Pro ou formule École) ? */
export function hasProAccess(): boolean {
  const p = getActivationChrono().plan;
  return p === 'pro' || p === 'ecole-primaire' || p === 'ecole-complete';
}

/** v64 : formule d'établissement active (« ecole-primaire » / « ecole-complete »), ou null. */
export function schoolPlan(): Extract<SubscriptionPlan, 'ecole-primaire' | 'ecole-complete'> | null {
  const p = getActivationChrono().plan;
  return p === 'ecole-primaire' || p === 'ecole-complete' ? p : null;
}

export function isActivated(): boolean {
  return getActivation()?.activated === true;
}

export function saveActivation(name: string, code: string): void {
  const activatedAt = Date.now();
  const data: UserActivation = {
    activated: true,
    name: name.trim(),
    code: code.trim(),
    activatedAt,
    // Chrono : le code d'accès est valable 1 AN à partir de l'activation.
    expiresAt: activatedAt + 365 * 86400000,
    // Tarification : le plan est lu dans le code
    // (9 = 999, 1 = 1500, 2 = 2500, 6 = École 6000, 7 = École 10000 FCFA/an).
    plan: planOfCode(code),
  };
  localStorage.setItem(ACTIVATION_KEY, JSON.stringify(data));
}

export function clearActivation(): void {
  localStorage.removeItem(ACTIVATION_KEY);
}

/* ------- Profil (dont logo école) ------- */

export function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { teacherName: '', schoolName: '' };
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getSchoolLogo(): string | undefined {
  return getProfile().schoolLogo;
}

/**
 * Lit un fichier image et le redimensionne en data URL (max 400px, JPEG/PNG).
 * Garde une taille raisonnable pour le stockage local et les bulletins.
 */
export function readAndResizeImage(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas non disponible'));
        ctx.drawImage(img, 0, 0, width, height);
        // PNG pour préserver la transparence des logos
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image invalide'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.readAsDataURL(file);
  });
}
