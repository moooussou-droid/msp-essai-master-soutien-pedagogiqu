/**
 * ESPACE PARENTS — RATTACHEMENT ET DOSSIER DE L'ENFANT (v48, étape ①).
 *
 * ── SCÉNARIO RETENU ──────────────────────────────────────────────────
 * Scénario MIXTE, « sans aucune prise de risque liée aux données
 * personnelles des élèves ».
 *
 * Ces deux exigences, combinées, imposent une conséquence stricte pour
 * l'étape ① : **AUCUNE DONNÉE D'ÉLÈVE NE QUITTE L'APPAREIL ET AUCUN
 * SERVEUR N'EST APPELÉ.** Le risque le plus sûr à éliminer est celui
 * qu'on ne prend pas : tant que la formalité préalable auprès de l'APDP
 * (loi n° 2017-20, Livre V) n'est pas accomplie, publier des données de
 * mineurs sur un serveur serait illégal. L'étape ① est donc entièrement
 * hors ligne ; la synchronisation viendra à l'étape ②, une fois le
 * dossier APDP instruit.
 *
 * ── COMMENT LE PARENT REÇOIT LE DOSSIER ──────────────────────────────
 * L'enseignant génère, depuis sa classe, un FICHIER DE DOSSIER chiffré
 * destiné à UN SEUL élève, protégé par un CODE DE RATTACHEMENT à remettre
 * en main propre au parent. Le parent ouvre ce fichier dans l'application
 * et saisit le code : le dossier se déchiffre sur SON téléphone.
 *
 * Transport possible sans internet : clé USB, Bluetooth, carte mémoire,
 * ou messagerie au choix de l'école. Même si le fichier est intercepté,
 * il est illisible sans le code.
 *
 * ── GARANTIES DE MINIMISATION ────────────────────────────────────────
 * Le dossier ne contient QUE l'enfant concerné. Il est construit par
 * `buildChildDossier`, qui filtre explicitement :
 *   - aucun nom, aucune note, aucune absence d'un autre élève ;
 *   - aucun rang ni classement entre élèves ;
 *   - aucune donnée sensible (santé, religion, origine) ;
 *   - la moyenne de la classe est une STATISTIQUE AGRÉGÉE, jamais une
 *     liste nominative : elle ne permet d'identifier personne.
 * Ces règles sont vérifiées par des tests automatiques.
 *
 * ── EXPIRATION ET RÉVOCATION ─────────────────────────────────────────
 * Le code de rattachement est à usage unique et expire. L'école tient un
 * journal des codes émis et peut révoquer un rattachement.
 */

import { encryptData, decryptData, hashText } from './crypto';
import type { ClassData, Student } from './database';
import { computeBulletins } from './bulletin';

/* ================================================================== */
/* 1. Codes de rattachement                                            */
/* ================================================================== */

export const PARENT_CODES_KEY = 'msp_parent_link_codes';
export const PARENT_DOSSIERS_KEY = 'msp_parent_dossiers';

/** Durée de validité par défaut d'un code de rattachement : 30 jours. */
export const CODE_VALIDITY_DAYS = 30;

export interface ParentLinkCode {
  /** Code remis au parent (jamais publié, remise en main propre). */
  code: string;
  studentId: string;
  /** Nom de l'élève, conservé côté ÉCOLE uniquement, pour le journal. */
  studentLabel: string;
  classId: string;
  className: string;
  createdAt: number;
  expiresAt: number;
  /** Date de première utilisation (code à usage unique). */
  usedAt?: number;
  /** Révocation par la direction (conflit familial, décision de justice). */
  revokedAt?: number;
  revokedBy?: string;
}

/**
 * Alphabet sans caractères ambigus : ni O/0, ni I/1/L.
 * Un code est dicté ou recopié à la main par un parent ; une confusion
 * de caractère se traduirait par un échec incompréhensible.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Génère un code aléatoire de 12 caractères, en 3 groupes de 4.
 *
 * Entropie : 31^12 ≈ 7,9 × 10^17 combinaisons. Le tirage utilise
 * `crypto.getRandomValues` (générateur cryptographique) et NON
 * `Math.random`, qui est prévisible et ne doit jamais protéger l'accès
 * au dossier d'un enfant.
 */
export function generateLinkCode(): string {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

/** Normalise une saisie parent : majuscules, sans espaces ni tirets. */
export function normalizeCode(input: string): string {
  return (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function loadLinkCodes(): ParentLinkCode[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PARENT_CODES_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persistCodes(codes: ParentLinkCode[]): void {
  try { localStorage.setItem(PARENT_CODES_KEY, JSON.stringify(codes)); } catch { /* quota */ }
}

/** Émet un code pour un élève et l'inscrit au journal de l'école. */
export function issueLinkCode(
  student: Student,
  classId: string,
  className: string,
  validityDays = CODE_VALIDITY_DAYS,
): ParentLinkCode {
  const now = Date.now();
  const entry: ParentLinkCode = {
    code: generateLinkCode(),
    studentId: student.id,
    studentLabel: `${student.nom} ${student.prenoms}`.trim(),
    classId,
    className,
    createdAt: now,
    expiresAt: now + validityDays * 24 * 60 * 60 * 1000,
  };
  persistCodes([entry, ...loadLinkCodes()]);
  return entry;
}

export type CodeState = 'valide' | 'expire' | 'revoque' | 'inconnu';

/** État d'un code, du point de vue de l'école. */
export function codeState(code: ParentLinkCode | undefined, now = Date.now()): CodeState {
  if (!code) return 'inconnu';
  if (code.revokedAt) return 'revoque';
  if (now > code.expiresAt) return 'expire';
  return 'valide';
}

/** Révocation : coupe immédiatement l'accès pour les futurs dossiers. */
export function revokeLinkCode(code: string, by = 'La direction'): boolean {
  const all = loadLinkCodes();
  const i = all.findIndex((c) => normalizeCode(c.code) === normalizeCode(code));
  if (i < 0) return false;
  all[i] = { ...all[i], revokedAt: Date.now(), revokedBy: by };
  persistCodes(all);
  return true;
}

/** Marque un code comme utilisé (traçabilité des rattachements). */
export function markCodeUsed(code: string): void {
  const all = loadLinkCodes();
  const i = all.findIndex((c) => normalizeCode(c.code) === normalizeCode(code));
  if (i >= 0 && !all[i].usedAt) {
    all[i] = { ...all[i], usedAt: Date.now() };
    persistCodes(all);
  }
}

/* ================================================================== */
/* 2. Dossier de l'enfant                                              */
/* ================================================================== */

export interface DossierSubjectResult {
  subject: string;
  note: number | null;
  max: number;
}

export interface DossierEvaluation {
  label: string;
  subjects: DossierSubjectResult[];
  average: number | null;
  /** Moyenne de la classe : statistique agrégée, non nominative. */
  classAverage: number | null;
}

export interface DossierAbsence {
  date: string;
  half: 'matin' | 'apresmidi';
  justified: boolean;
  motif?: string;
}

export interface ChildDossier {
  /** Version du format, pour rester compatible avec les envois anciens. */
  format: 1;
  child: {
    nom: string;
    prenoms: string;
    matricule: string;
    /** Le sexe n'est PAS transmis : inutile au suivi par le parent. */
  };
  className: string;
  schoolName: string;
  teacherName: string;
  generatedAt: number;
  evaluations: DossierEvaluation[];
  absences: DossierAbsence[];
  /** Total de demi-journées manquées, calculé, jamais saisi. */
  missedHalfDays: number;
  message?: string;
}

interface AttendanceLike {
  classId: string;
  date: string;
  entries: {
    studentId: string;
    status: string;
    motif?: string;
    half?: 'matin' | 'apresmidi';
  }[];
}

/**
 * CONSTRUIT LE DOSSIER D'UN SEUL ENFANT.
 *
 * C'est le point de contrôle de la minimisation : tout ce qui n'est pas
 * explicitement recopié ici n'atteindra jamais le parent. On part donc
 * de l'élève ciblé et on ne parcourt JAMAIS la liste des autres élèves
 * pour en extraire des données nominatives.
 *
 * La moyenne de la classe est calculée comme un agrégat : elle répond au
 * besoin « mon enfant est-il au-dessus de la moyenne ? » sans révéler la
 * note de quiconque. Elle n'est fournie que si la classe compte au moins
 * 5 élèves notés — en dessous, un agrégat peut permettre de deviner une
 * note individuelle (ex. à 2 élèves, la moyenne trahit l'autre note).
 */
export const MIN_CLASS_SIZE_FOR_AVERAGE = 5;

export function buildChildDossier(
  classData: ClassData,
  studentId: string,
  options: {
    schoolName: string;
    teacherName: string;
    attendance?: AttendanceLike[];
    message?: string;
    evaluations?: { id: string; label: string }[];
  },
): ChildDossier | null {
  const student = classData.students.find((s) => s.id === studentId);
  if (!student) return null;

  const evalList = options.evaluations && options.evaluations.length > 0
    ? options.evaluations
    : [{ id: 'formative1', label: 'Évaluation en cours' }];

  const evaluations: DossierEvaluation[] = evalList.map((ev) => {
    const bulletins = computeBulletins(classData, { evaluation: ev.id as never });
    const mine = bulletins.find((b) => b.student.id === studentId);

    // Moyenne de classe : agrégat sur les moyennes existantes.
    const others = bulletins
      .map((b) => b.moyenne)
      .filter((m): m is number => typeof m === 'number' && Number.isFinite(m));
    const classAverage = others.length >= MIN_CLASS_SIZE_FOR_AVERAGE
      ? Math.round((others.reduce((t, m) => t + m, 0) / others.length) * 100) / 100
      : null;

    return {
      label: ev.label,
      subjects: (mine?.results || []).map((r) => ({
        subject: r.subject.name,
        note: typeof r.total === 'number' && Number.isFinite(r.total) ? r.total : null,
        max: 20,
      })),
      average: typeof mine?.moyenne === 'number' && Number.isFinite(mine.moyenne)
        ? Math.round(mine.moyenne * 100) / 100
        : null,
      classAverage,
    };
  });

  // Absences : uniquement celles de CET enfant.
  const absences: DossierAbsence[] = [];
  for (const day of options.attendance || []) {
    if (day.classId !== classData.id) continue;
    for (const e of day.entries) {
      if (e.studentId !== studentId) continue;
      if (e.status === 'absent_justifiee' || e.status === 'absent_injustifiee') {
        absences.push({
          date: day.date,
          half: e.half || 'matin',
          justified: e.status === 'absent_justifiee',
          motif: e.motif,
        });
      }
    }
  }
  absences.sort((a, b) => b.date.localeCompare(a.date));

  return {
    format: 1,
    child: {
      nom: student.nom,
      prenoms: student.prenoms,
      matricule: student.matricule,
    },
    className: classData.name,
    schoolName: options.schoolName,
    teacherName: options.teacherName,
    generatedAt: Date.now(),
    evaluations,
    absences,
    missedHalfDays: absences.length,
    message: options.message,
  };
}

/* ================================================================== */
/* 3. Chiffrement du dossier                                           */
/* ================================================================== */

/** Enveloppe transportée : rien d'exploitable en clair. */
export interface DossierEnvelope {
  kind: 'msp-dossier-enfant';
  format: 1;
  /**
   * Empreinte du code, pour dire « ce n'est pas le bon code » sans
   * révéler le code lui-même ni tenter un déchiffrement inutile.
   */
  codeHash: string;
  /** Dossier chiffré en AES-GCM 256 bits (voir crypto.ts). */
  payload: string;
  createdAt: number;
}

/**
 * Chiffre le dossier avec le code de rattachement.
 * Le code joue le rôle de mot de passe : il n'est écrit nulle part dans
 * le fichier, seule son empreinte l'est.
 */
export async function sealDossier(
  dossier: ChildDossier,
  code: string,
): Promise<DossierEnvelope> {
  const normalized = normalizeCode(code);
  return {
    kind: 'msp-dossier-enfant',
    format: 1,
    codeHash: await hashText(normalized),
    payload: await encryptData(JSON.stringify(dossier), normalized),
    createdAt: Date.now(),
  };
}

export type OpenResult =
  | { ok: true; dossier: ChildDossier }
  | { ok: false; error: string };

/** Ouvre un dossier reçu. Aucun détail technique n'est exposé au parent. */
export async function openDossier(
  envelope: DossierEnvelope,
  code: string,
): Promise<OpenResult> {
  if (!envelope || envelope.kind !== 'msp-dossier-enfant') {
    return { ok: false, error: 'Ce fichier n’est pas un dossier Master Soutien Pédagogique.' };
  }
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, error: 'Saisissez le code de rattachement.' };

  // Contrôle rapide : évite d'attendre un déchiffrement voué à l'échec.
  if (envelope.codeHash && (await hashText(normalized)) !== envelope.codeHash) {
    return { ok: false, error: 'Code incorrect. Vérifiez le code remis par l’école.' };
  }
  try {
    const json = await decryptData(envelope.payload, normalized);
    const dossier = JSON.parse(json) as ChildDossier;
    if (!dossier || !dossier.child) {
      return { ok: false, error: 'Dossier illisible ou endommagé.' };
    }
    return { ok: true, dossier };
  } catch {
    return { ok: false, error: 'Code incorrect ou fichier endommagé.' };
  }
}

/* ================================================================== */
/* 4. Dossiers conservés par le parent                                 */
/* ================================================================== */

export interface StoredDossier {
  id: string;
  dossier: ChildDossier;
  receivedAt: number;
}

export function loadDossiers(): StoredDossier[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PARENT_DOSSIERS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * Enregistre un dossier reçu. Un nouvel envoi pour le MÊME enfant
 * REMPLACE le précédent : le parent doit voir la situation actuelle, pas
 * une pile d'historiques contradictoires.
 */
export function saveDossier(dossier: ChildDossier): StoredDossier {
  const all = loadDossiers();
  const key = `${dossier.child.matricule}|${dossier.child.nom}|${dossier.child.prenoms}`.toUpperCase();
  const entry: StoredDossier = { id: key, dossier, receivedAt: Date.now() };
  const i = all.findIndex((d) => d.id === key);
  if (i >= 0) all[i] = entry;
  else all.push(entry);
  try { localStorage.setItem(PARENT_DOSSIERS_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return entry;
}

/** Suppression par le parent : droit garanti par le Code du numérique. */
export function deleteDossier(id: string): void {
  const rest = loadDossiers().filter((d) => d.id !== id);
  try { localStorage.setItem(PARENT_DOSSIERS_KEY, JSON.stringify(rest)); } catch { /* ignore */ }
}

/** Efface TOUT l'espace parent (retrait du consentement). */
export function clearParentSpace(): void {
  try {
    localStorage.removeItem(PARENT_DOSSIERS_KEY);
    localStorage.removeItem(PARENT_CONSENT_KEY);
  } catch { /* ignore */ }
}

/* ================================================================== */
/* 5. Consentement                                                     */
/* ================================================================== */

export const PARENT_CONSENT_KEY = 'msp_parent_consent';

export interface ParentConsent {
  given: boolean;
  at: number;
  /** Version du texte accepté : un texte modifié exige un nouvel accord. */
  textVersion: number;
}

export const CONSENT_TEXT_VERSION = 1;

export function getConsent(): ParentConsent | null {
  try {
    const raw = localStorage.getItem(PARENT_CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ParentConsent;
    return c && c.given === true ? c : null;
  } catch {
    return null;
  }
}

/** Le consentement est valide s'il porte sur la version courante du texte. */
export function hasValidConsent(): boolean {
  const c = getConsent();
  return !!c && c.textVersion === CONSENT_TEXT_VERSION;
}

export function giveConsent(): ParentConsent {
  const c: ParentConsent = { given: true, at: Date.now(), textVersion: CONSENT_TEXT_VERSION };
  try { localStorage.setItem(PARENT_CONSENT_KEY, JSON.stringify(c)); } catch { /* quota */ }
  return c;
}

/** Retrait du consentement : efface aussi les dossiers (sans frais, immédiat). */
export function withdrawConsent(): void {
  clearParentSpace();
}

/* ================================================================== */
/* 6. Lecture en clair des résultats                                   */
/* ================================================================== */

/**
 * Traduit une moyenne en phrase compréhensible (US-2.2).
 *
 * Beaucoup de parents n'ont pas été scolarisés longtemps : un « 11,5/20 »
 * ne leur dit pas si l'enfant va bien. On compare à 10 (seuil de passage)
 * et, si elle est disponible, à la moyenne de la classe.
 */
export function readAverage(average: number | null, classAverage: number | null): string {
  if (average === null) return 'Pas encore de note pour cette évaluation.';
  const value = average.toFixed(2).replace('.', ',');
  const parts: string[] = [];

  if (average >= 14) parts.push(`Très bon résultat (${value}/20).`);
  else if (average >= 12) parts.push(`Bon résultat (${value}/20).`);
  else if (average >= 10) parts.push(`Résultat satisfaisant (${value}/20).`);
  else if (average >= 8) parts.push(`Résultat fragile (${value}/20) : un accompagnement aiderait.`);
  else parts.push(`Résultat insuffisant (${value}/20) : votre enfant a besoin d’aide.`);

  if (classAverage !== null) {
    const diff = average - classAverage;
    const cls = classAverage.toFixed(2).replace('.', ',');
    if (Math.abs(diff) < 0.5) parts.push(`Il se situe dans la moyenne de sa classe (${cls}/20).`);
    else if (diff > 0) parts.push(`Il est au-dessus de la moyenne de sa classe (${cls}/20).`);
    else parts.push(`Il est en dessous de la moyenne de sa classe (${cls}/20).`);
  }
  return parts.join(' ');
}

/** Progression entre les deux dernières évaluations notées. */
export function readProgress(evaluations: DossierEvaluation[]): string {
  const noted = evaluations.filter((e) => e.average !== null);
  if (noted.length < 2) return '';
  const last = noted[noted.length - 1].average!;
  const prev = noted[noted.length - 2].average!;
  const diff = Math.round((last - prev) * 100) / 100;
  if (Math.abs(diff) < 0.25) return 'Ses résultats sont stables.';
  const v = Math.abs(diff).toFixed(2).replace('.', ',');
  return diff > 0 ? `En progrès de ${v} point(s).` : `En baisse de ${v} point(s).`;
}
