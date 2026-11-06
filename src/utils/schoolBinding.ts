/**
 * RATTACHEMENT DE L'UTILISATEUR À SON ÉCOLE (v43).
 *
 * RÈGLE MÉTIER DEMANDÉE
 * ---------------------
 * Chaque utilisateur n'emploie l'application que pour l'école avec laquelle
 * il s'est enregistré la PREMIÈRE fois. Le nom de l'école est verrouillé dès
 * le premier enregistrement.
 *
 * EXCEPTION PRÉVUE
 * ----------------
 * Un enseignant peut être muté. S'il n'est plus en service dans cette école
 * et veut travailler avec une nouvelle, l'administration dispose de
 * paramètres de modification : le Super Administrateur délivre une
 * AUTORISATION DE TRANSFERT, qui ouvre une seule fois le changement d'école.
 *
 * MÉCANISME DE L'AUTORISATION
 * ---------------------------
 * Le code de transfert est calculé à partir de l'identifiant d'appareil, comme
 * les déverrouillages payants de la v38. L'administrateur peut ainsi le
 * produire à distance, par téléphone ou WhatsApp, sans connexion internet côté
 * enseignant. Le code est à usage unique : une fois le transfert réalisé, il
 * est consommé, et un nouveau code sera nécessaire pour un transfert suivant.
 *
 * CE QUI N'EST PAS FAIT, VOLONTAIREMENT
 * -------------------------------------
 * Les données pédagogiques déjà saisies ne sont PAS effacées lors d'un
 * transfert : elles restent consultables. Effacer le travail d'une année
 * scolaire sans demande explicite serait destructeur. L'historique des
 * rattachements conserve la trace de chaque école et de chaque transfert.
 */

import { safeGetItem, safeSetItem } from './safeStorage';
import { getDeviceId } from './coursePayment';

const BINDING_KEY = 'msp_school_binding';

/** Une période de rattachement à un établissement. */
export interface SchoolPeriod {
  /** Nom de l'école, tel qu'enregistré. */
  schoolName: string;
  /** Début du rattachement. */
  since: number;
  /** Fin du rattachement (absent = école actuelle). */
  until?: number;
  /** Motif de sortie, renseigné lors d'un transfert. */
  reason?: string;
}

export interface SchoolBinding {
  /** École de référence : celle du premier enregistrement, ou la plus récente. */
  schoolName: string;
  /**
   * v47 — CODE D'ACCÈS TITULAIRE DU RATTACHEMENT.
   *
   * La règle « un code d'accès = un utilisateur = une seule école » exige
   * que le verrou soit porté par le CODE, et non par l'appareil. Sans cela :
   *  - un second code utilisé sur le même téléphone héritait du verrou d'un
   *    collègue (blocage injustifié) ;
   *  - le même code réinstallé ailleurs repartait libre (verrou contourné).
   * Les rattachements créés avant la v47 n'ont pas ce champ : ils sont
   * adoptés par le premier code qui se présente (aucune perte de données).
   */
  boundCode?: string;
  /** Date du tout premier enregistrement. */
  boundAt: number;
  /** Autorisation de transfert accordée et non encore utilisée. */
  transferAllowed: boolean;
  /** Qui a accordé l'autorisation (pour la traçabilité). */
  transferGrantedBy?: string;
  transferGrantedAt?: number;
  /** Nombre de transferts déjà réalisés. */
  transferCount: number;
  /** Historique complet des rattachements. */
  history: SchoolPeriod[];
}

/** Comparaison tolérante : casse, accents et espaces multiples ignorés. */
export function normalizeSchoolName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deux écritures désignent-elles la même école ?
 *
 * On compare de façon tolérante : « EPP Cotonou Centre », « epp cotonou
 * centre » et « EPP  COTONOU  CENTRE » sont la même école. Bloquer un
 * enseignant pour une majuscule ou un accent serait un faux positif
 * inacceptable.
 */
export function isSameSchool(a: string, b: string): boolean {
  return normalizeSchoolName(a) === normalizeSchoolName(b);
}

export function loadBinding(): SchoolBinding | null {
  try {
    const raw = safeGetItem(BINDING_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as SchoolBinding;
    if (!b || typeof b.schoolName !== 'string' || !b.schoolName) return null;
    return {
      schoolName: b.schoolName,
      boundCode: typeof b.boundCode === 'string' ? b.boundCode : undefined,
      boundAt: typeof b.boundAt === 'number' ? b.boundAt : Date.now(),
      transferAllowed: b.transferAllowed === true,
      transferGrantedBy: b.transferGrantedBy,
      transferGrantedAt: b.transferGrantedAt,
      transferCount: typeof b.transferCount === 'number' ? b.transferCount : 0,
      history: Array.isArray(b.history) ? b.history : [],
    };
  } catch {
    return null;
  }
}

function persist(b: SchoolBinding): void {
  try { safeSetItem(BINDING_KEY, JSON.stringify(b)); } catch { /* quota */ }
}

/** L'utilisateur est-il déjà rattaché à une école ? */
export function isBound(): boolean {
  return loadBinding() !== null;
}

/** École de rattachement, ou chaîne vide si aucun rattachement. */
export function boundSchool(): string {
  return loadBinding()?.schoolName || '';
}

/**
 * Premier enregistrement : verrouille l'école.
 * Sans effet si un rattachement existe déjà (on ne contourne pas le verrou
 * en rappelant cette fonction).
 */
export function bindSchool(schoolName: string): SchoolBinding | null {
  const name = (schoolName || '').trim();
  if (!name) return null;
  const existing = loadBinding();
  if (existing) {
    // v47 : un rattachement anterieur a la v47 n'a pas de code titulaire.
    // Le code courant l'adopte, sans quoi l'utilisateur historique serait
    // bloque par son propre enregistrement.
    if (!existing.boundCode && currentCode()) {
      const adopted = { ...existing, boundCode: currentCode() };
      persist(adopted);
      return adopted;
    }
    return existing;
  }
  const b: SchoolBinding = {
    schoolName: name,
    boundCode: currentCode() || undefined,
    boundAt: Date.now(),
    transferAllowed: false,
    transferCount: 0,
    history: [{ schoolName: name, since: Date.now() }],
  };
  persist(b);
  return b;
}

/**
 * Code d'acces actuellement actif, normalise.
 * Lu directement dans le stockage pour eviter une dependance circulaire
 * entre schoolBinding et userProfile.
 */
export function currentCode(): string {
  try {
    const raw = safeGetItem('msp_activation');
    if (!raw) return '';
    const a = JSON.parse(raw) as { code?: string; activated?: boolean };
    if (!a || a.activated !== true) return '';
    return (a.code || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

/**
 * v47 — Le code connecte est-il bien le titulaire du rattachement ?
 * Un rattachement sans titulaire (anterieur a la v47) est considere comme
 * appartenant au code courant : on ne casse aucun compte existant.
 */
export function isBindingOwner(): boolean {
  const b = loadBinding();
  if (!b || !b.boundCode) return true;
  const code = currentCode();
  if (!code) return true;
  return b.boundCode === code;
}

/** Résultat d'un contrôle de changement d'école. */
export interface SchoolCheck {
  /** Le changement est-il permis ? */
  allowed: boolean;
  /** S'agit-il d'un changement d'école (par rapport au rattachement) ? */
  isChange: boolean;
  /** Message destiné à l'utilisateur. */
  message: string;
}

/**
 * Peut-on enregistrer le profil avec ce nom d'école ?
 *
 * Trois cas :
 *  1. aucun rattachement          → autorisé, le rattachement sera créé ;
 *  2. même école                  → autorisé, ce n'est pas un changement ;
 *  3. école différente            → autorisé UNIQUEMENT si l'administration
 *                                    a accordé une autorisation de transfert.
 */
export function checkSchoolChange(newName: string): SchoolCheck {
  const name = (newName || '').trim();
  const b = loadBinding();

  if (!name) {
    return { allowed: false, isChange: false, message: 'Le nom de l’école est obligatoire.' };
  }
  if (!b) {
    return {
      allowed: true,
      isChange: false,
      message: 'Cette école sera enregistrée comme votre établissement de rattachement.',
    };
  }
  if (isSameSchool(b.schoolName, name)) {
    return { allowed: true, isChange: false, message: '' };
  }
  /*
   * v47 — VERROU RENFORCE : « un code = un utilisateur = une seule ecole ».
   * Si le rattachement appartient a un AUTRE code d'acces, le refus est
   * absolu : meme une autorisation de transfert ne s'applique pas, car
   * elle a ete accordee au titulaire, pas au code qui l'utilise ici.
   * Le titulaire doit se reconnecter, ou l'administration doit intervenir.
   */
  if (!isBindingOwner()) {
    return {
      allowed: false,
      isChange: true,
      message:
        `Ce téléphone est déjà rattaché à « ${b.schoolName} » par un autre code d’accès. `
        + 'Un code d’accès ne peut enregistrer qu’une seule école. Connectez-vous avec '
        + 'le code titulaire, ou demandez au Super Administrateur de libérer l’appareil.',
    };
  }
  if (b.transferAllowed) {
    return {
      allowed: true,
      isChange: true,
      message: `Transfert autorisé par l’administration : vous pouvez passer de « ${b.schoolName} » à « ${name} ».`,
    };
  }
  return {
    allowed: false,
    isChange: true,
    message:
      `Votre compte est rattaché à « ${b.schoolName} ». Si vous n’êtes plus en `
      + 'service dans cet établissement, demandez une autorisation de transfert '
      + 'au Super Administrateur.',
  };
}

/**
 * Applique le changement d'école. Consomme l'autorisation de transfert.
 * Retourne false si le changement n'était pas permis : la porte reste fermée.
 */
export function applySchoolChange(newName: string, reason?: string): boolean {
  const name = (newName || '').trim();
  const check = checkSchoolChange(name);
  if (!check.allowed) return false;

  const b = loadBinding();
  if (!b) { bindSchool(name); return true; }
  if (!check.isChange) return true;

  const now = Date.now();
  const history = [...b.history];
  const last = history[history.length - 1];
  if (last && !last.until) {
    last.until = now;
    last.reason = reason || 'Changement d’établissement autorisé';
  }
  history.push({ schoolName: name, since: now });

  persist({
    schoolName: name,
    // v47 : le titulaire du rattachement suit le transfert ; sans ce report
    // le verrou « un code = une ecole » serait perdu a chaque changement.
    boundCode: b.boundCode || currentCode() || undefined,
    boundAt: b.boundAt,
    // L'autorisation est a USAGE UNIQUE : elle est consommee ici.
    transferAllowed: false,
    transferGrantedBy: undefined,
    transferGrantedAt: undefined,
    transferCount: b.transferCount + 1,
    history,
  });
  return true;
}

/* ------------------------------------------------------------------ */
/* Autorisation de transfert                                           */
/* ------------------------------------------------------------------ */

/** Identifiant de contenu utilisé pour calculer le code de transfert. */
export const TRANSFER_UNLOCK_ID = 'transfert-etablissement';

/**
 * Code d'autorisation lié à l'appareil, au format XXXX-XXXX.
 *
 * Même fonction de hachage que les déverrouillages payants (v38) : le Super
 * Administrateur connaît l'identifiant de l'appareil, il peut donc produire
 * le code sans que l'application ait besoin d'internet.
 */
export function transferCodeFor(deviceId: string): string {
  const raw = `${TRANSFER_UNLOCK_ID}::${deviceId}::msp-transfer-v1`;
  const hash = (str: string) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const a = hash(raw).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
  const b = hash(raw.split('').reverse().join('')).toString(36).toUpperCase().padStart(6, '0').slice(0, 4);
  return `${a}-${b}`;
}

/** Code attendu sur CET appareil. */
export function expectedTransferCode(): string {
  return transferCodeFor(getDeviceId());
}

/**
 * L'utilisateur saisit le code communiqué par l'administration.
 * En cas de succès, l'autorisation est ouverte (mais pas encore consommée :
 * elle le sera au moment où la nouvelle école sera réellement enregistrée).
 */
export function redeemTransferCode(code: string, grantedBy = 'Super Administrateur'): boolean {
  const given = (code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!given || given !== expectedTransferCode()) return false;
  grantTransfer(grantedBy);
  return true;
}

/**
 * Autorisation accordée directement depuis l'espace d'administration,
 * lorsque l'administrateur a l'appareil sous la main.
 */
export function grantTransfer(grantedBy = 'Super Administrateur'): void {
  const b = loadBinding();
  if (!b) return;
  persist({ ...b, transferAllowed: true, transferGrantedBy: grantedBy, transferGrantedAt: Date.now() });
}

/** Retrait de l'autorisation par l'administration. */
export function revokeTransfer(): void {
  const b = loadBinding();
  if (!b) return;
  persist({ ...b, transferAllowed: false, transferGrantedBy: undefined, transferGrantedAt: undefined });
}

/**
 * Réécriture directe de l'école par le Super Administrateur.
 *
 * La v39 exige que le Super Administrateur puisse modifier n'importe quelle
 * information. Cette fonction contourne donc volontairement le verrou, tout
 * en conservant la trace du changement dans l'historique.
 */
export function adminSetSchool(newName: string, by = 'Super Administrateur'): boolean {
  const name = (newName || '').trim();
  if (!name) return false;
  const b = loadBinding();
  if (!b) { bindSchool(name); return true; }
  if (isSameSchool(b.schoolName, name)) return true;

  const now = Date.now();
  const history = [...b.history];
  const last = history[history.length - 1];
  if (last && !last.until) {
    last.until = now;
    last.reason = `Modifié par ${by}`;
  }
  history.push({ schoolName: name, since: now, reason: `Enregistré par ${by}` });

  persist({
    ...b,
    schoolName: name,
    transferAllowed: false,
    transferGrantedBy: undefined,
    transferGrantedAt: undefined,
    transferCount: b.transferCount + 1,
    history,
  });
  return true;
}

/** Remise à zéro complète (cas d'un appareil confié à un autre enseignant). */
export function resetBinding(): void {
  try { safeSetItem(BINDING_KEY, ''); } catch { /* ignore */ }
  try { localStorage.removeItem(BINDING_KEY); } catch { /* ignore */ }
}

/** Phrase d'état affichée à l'utilisateur. */
export function bindingStatusMessage(): string {
  const b = loadBinding();
  if (!b) return 'Aucun établissement de rattachement enregistré pour le moment.';
  if (b.transferAllowed) {
    return `Rattaché à « ${b.schoolName} ». Un transfert vers un nouvel établissement est autorisé.`;
  }
  return `Votre compte est rattaché à « ${b.schoolName} ».`;
}
