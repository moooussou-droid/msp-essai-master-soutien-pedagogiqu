/**
 * ESPACE ÉCOLE — Master Soutien Pédagogique (v64).
 *
 * Chaque établissement dispose de SON espace, avec TOUTES ses classes.
 *
 * Deux abonnements annuels d'établissement (codes en « 6 » et « 7 »,
 * voir simpleCode.ts / subscription.ts) :
 *  - École — Maternelle au CM2 ........ 6000 FCFA/an
 *      périmètre : Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1, CM2
 *  - École — Maternelle en Terminale .. 10000 FCFA/an
 *      périmètre : tout le précédent + 6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ, 2nde, 1ʳᵉ, Terminale
 *      (second cycle déclinable par série : A1, A2, B, C, D)
 *
 * L'application reste 100 % locale et hors-ligne : l'« espace » d'une
 * école est un SchoolWorkspace conservé dans le navigateur, et les
 * classes de l'école sont les ClassData habituelles portant son
 * `schoolId`. Aucune classe existante n'est déplacée ou renommée sans
 * demande explicite (« Rattacher à cette école »).
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage';
import {
  ClassData, EducationType, SecondaryLevel, SecondarySerie,
  generateId, getDefaultSubjectsForLevel, getDefaultSubjectsForPrescolaire,
  getDefaultSubjectsForSecondary,
} from './database';
import type { SubscriptionPlan } from './simpleCode';
import { normalizeSchoolName } from './schoolBinding';

const WORKSPACES_KEY = 'msp_school_workspaces_v1';
const ACTIVE_KEY = 'msp_active_school_id';

/** Périmètre scolaire d'un établissement. */
export type SchoolKind = 'primaire' | 'complete';

export interface SchoolWorkspace {
  id: string;
  /** Nom de l'établissement (imprimé sur les bulletins via ClassData.school). */
  name: string;
  /** Maternelle → CM2 (`primaire`) ou Maternelle → Terminale (`complete`). */
  kind: SchoolKind;
  /** Formule qui a permis la création (trace, pour l'affichage). */
  plan: Extract<SubscriptionPlan, 'ecole-primaire' | 'ecole-complete'>;
  directorName?: string;
  phone?: string;
  commune?: string;
  circonscription?: string;
  /** Année scolaire de référence, ex. « 2026-2027 ». */
  schoolYear: string;
  /** Devise / slogan de l'école (facultatif). */
  motto?: string;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Niveaux et périmètres                                               */
/* ------------------------------------------------------------------ */

export interface LevelTemplate {
  level: string;
  educationType: EducationType;
  /** Cycle d'affichage dans le tableau de bord école. */
  cycle: 'Préscolaire' | 'Primaire' | 'Collège' | 'Lycée';
}

/** Les 8 classes de la Maternelle au CM2 (formule 6000 FCFA). */
export const PRIMARY_LEVELS: LevelTemplate[] = [
  { level: 'Maternelle 1', educationType: 'prescolaire', cycle: 'Préscolaire' },
  { level: 'Maternelle 2', educationType: 'prescolaire', cycle: 'Préscolaire' },
  { level: 'CI', educationType: 'primaire', cycle: 'Primaire' },
  { level: 'CP', educationType: 'primaire', cycle: 'Primaire' },
  { level: 'CE1', educationType: 'primaire', cycle: 'Primaire' },
  { level: 'CE2', educationType: 'primaire', cycle: 'Primaire' },
  { level: 'CM1', educationType: 'primaire', cycle: 'Primaire' },
  { level: 'CM2', educationType: 'primaire', cycle: 'Primaire' },
];

/** Les 7 classes du secondaire, ajoutées par la formule 10000 FCFA. */
export const SECONDARY_LEVELS_TPL: LevelTemplate[] = [
  { level: '6ème', educationType: 'secondaire', cycle: 'Collège' },
  { level: '5ème', educationType: 'secondaire', cycle: 'Collège' },
  { level: '4ème', educationType: 'secondaire', cycle: 'Collège' },
  { level: '3ème', educationType: 'secondaire', cycle: 'Collège' },
  { level: '2nde', educationType: 'secondaire', cycle: 'Lycée' },
  { level: '1ère', educationType: 'secondaire', cycle: 'Lycée' },
  { level: 'Tle', educationType: 'secondaire', cycle: 'Lycée' },
];

/** Niveaux du second cycle, déclinables par série. */
export const SECOND_CYCLE_LEVELS = ['2nde', '1ère', 'Tle'];
export const SERIES: SecondarySerie[] = ['A1', 'A2', 'B', 'C', 'D'];
/** Suffixes de groupe quand un niveau compte plusieurs classes parallèles. */
export const GROUP_SUFFIXES = ['A', 'B', 'C', 'D'];

/** Niveaux autorisés par un périmètre d'école. */
export function levelsForKind(kind: SchoolKind): LevelTemplate[] {
  return kind === 'complete' ? [...PRIMARY_LEVELS, ...SECONDARY_LEVELS_TPL] : [...PRIMARY_LEVELS];
}

/** Périmètre maximal ouvert par une formule École. */
export function kindForPlan(
  plan: Extract<SubscriptionPlan, 'ecole-primaire' | 'ecole-complete'>,
): SchoolKind {
  return plan === 'ecole-complete' ? 'complete' : 'primaire';
}

/** Un périmètre couvre-t-il ce type d'enseignement / ce niveau ? */
export function kindAllowsLevel(kind: SchoolKind, educationType?: EducationType): boolean {
  if (kind === 'complete') return true;
  return educationType !== 'secondaire';
}

/* ------------------------------------------------------------------ */
/* Persistance des espaces                                             */
/* ------------------------------------------------------------------ */

export function loadWorkspaces(): SchoolWorkspace[] {
  try {
    const raw = safeGetItem(WORKSPACES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SchoolWorkspace[];
    if (!Array.isArray(arr)) return [];
    return arr.filter(w => w && typeof w.id === 'string' && typeof w.name === 'string' && w.name.trim());
  } catch {
    return [];
  }
}

function persist(list: SchoolWorkspace[]): void {
  safeSetItem(WORKSPACES_KEY, JSON.stringify(list));
}

export function getActiveSchoolId(): string {
  return safeGetItem(ACTIVE_KEY) || '';
}

export function setActiveSchoolId(id: string): void {
  if (id) safeSetItem(ACTIVE_KEY, id);
  else safeRemoveItem(ACTIVE_KEY);
}

/** Espace actif : celui choisi, sinon le premier, sinon aucun. */
export function activeWorkspace(list = loadWorkspaces()): SchoolWorkspace | null {
  if (list.length === 0) return null;
  return list.find(w => w.id === getActiveSchoolId()) || list[0];
}

/** Crée un espace école et le rend actif. */
export function createWorkspace(input: Omit<SchoolWorkspace, 'id' | 'createdAt' | 'updatedAt'>): SchoolWorkspace {
  const now = Date.now();
  const ws: SchoolWorkspace = { ...input, name: input.name.trim(), id: `ecole-${generateId()}`, createdAt: now, updatedAt: now };
  persist([ws, ...loadWorkspaces()]);
  setActiveSchoolId(ws.id);
  return ws;
}

/** Met à jour un espace (nom, direction, contacts, année…). */
export function updateWorkspace(id: string, patch: Partial<SchoolWorkspace>): SchoolWorkspace | null {
  const list = loadWorkspaces();
  let updated: SchoolWorkspace | null = null;
  const next = list.map(w => {
    if (w.id !== id) return w;
    updated = { ...w, ...patch, name: (patch.name ?? w.name).trim(), updatedAt: Date.now() };
    return updated;
  });
  persist(next);
  return updated;
}

/**
 * Supprime l'ESPACE (pas les classes) : les classes rattachées restent
 * dans l'application, elles perdent simplement leur regroupement.
 * C'est le composant qui détache leur `schoolId` s'il le souhaite.
 */
export function deleteWorkspace(id: string): void {
  persist(loadWorkspaces().filter(w => w.id !== id));
  if (getActiveSchoolId() === id) setActiveSchoolId('');
}

/* ------------------------------------------------------------------ */
/* Classes d'une école                                                 */
/* ------------------------------------------------------------------ */

/** Classes rattachées à cet espace. */
export function classesOfSchool(classes: ClassData[], schoolId: string): ClassData[] {
  return classes.filter(c => c.schoolId === schoolId);
}

/**
 * Classes « orphelines » proposées au rattachement : créées avant la v64
 * (pas de schoolId) et dont le nom d'école correspond à l'espace.
 * La comparaison est tolérante (accents/casse), comme le verrou d'école.
 */
export function adoptableClasses(classes: ClassData[], ws: SchoolWorkspace): ClassData[] {
  return classes.filter(c =>
    !c.schoolId && normalizeSchoolName(c.school || '') === normalizeSchoolName(ws.name),
  );
}

/** Autres classes sans espace (nom différent) : rattachement manuel possible. */
export function looseClasses(classes: ClassData[], ws: SchoolWorkspace): ClassData[] {
  const mine = new Set(adoptableClasses(classes, ws).map(c => c.id));
  return classes.filter(c => !c.schoolId && !mine.has(c.id));
}

export interface GenerateOptions {
  /** Niveaux à générer (sous-ensemble du périmètre). */
  levels: string[];
  /** Nombre de groupes parallèles par niveau (1 à 4 : A, B, C, D). */
  groups: number;
  /** Séries du second cycle (2nde/1ʳᵉ/Tle) ; vide = une classe « sans série ». */
  series: SecondarySerie[];
  /** Année scolaire des classes créées. */
  schoolYear: string;
  /** Période initiale : trimestre (primaire) / semestre (secondaire) gérée par niveau. */
  trimester: string;
  semester: string;
}

/**
 * Clé d'unicité d'une classe dans une école pour une année donnée.
 * L'année est normalisée sans espaces : l'application historique écrit
 * tantôt « 2026-2027 » (schoolYearLabel), tantôt « 2026 - 2027 »
 * (formulaire de classe) — sans normalisation, le générateur créerait
 * un doublon de la classe saisie à la main.
 */
export function classSlotKey(c: Pick<ClassData, 'level' | 'serie' | 'name' | 'schoolYear' | 'schoolId'>): string {
  const year = (c.schoolYear || '').replace(/\s+/g, '');
  return [c.schoolId || '', year, c.level || '', c.serie || '', (c.name || '').trim().toLowerCase()].join('|');
}

/**
 * Construit les classes MANQUANTES du périmètre choisi, sans jamais
 * créer de doublon : une classe déjà présente (même niveau, même série,
 * même nom, même année, même école) est conservée telle quelle.
 * Renvoie les nouvelles classes à enregistrer (saveClass par l'écran).
 */
export function buildMissingClasses(
  ws: SchoolWorkspace,
  existing: ClassData[],
  options: GenerateOptions,
): ClassData[] {
  const templates = levelsForKind(ws.kind).filter(t => options.levels.includes(t.level));
  const present = new Set<string>();
  for (const cl of existing) {
    present.add(classSlotKey(cl));
    /*
     * Une classe créée à la main avant la v64 n'a pas encore de schoolId :
     * si son école est celle de l'espace, on l'enregistre aussi sous la
     * clé de l'espace, sinon le générateur la doublerait au lieu de la
     * reconnaître (l'utilisateur pourra ensuite la « rattacher »).
     */
    if (!cl.schoolId && normalizeSchoolName(cl.school || '') === normalizeSchoolName(ws.name)) {
      present.add(classSlotKey({ ...cl, schoolId: ws.id }));
    }
  }
  const groups = Math.min(4, Math.max(1, options.groups || 1));
  const created: ClassData[] = [];
  const now = Date.now();

  for (const tpl of templates) {
    const isSecondCycle = SECOND_CYCLE_LEVELS.includes(tpl.level);
    const seriesList: (SecondarySerie | undefined)[] = isSecondCycle && options.series.length > 0
      ? options.series
      : [undefined];

    for (const serie of seriesList) {
      for (let g = 0; g < groups; g++) {
        const suffix = groups > 1 ? ` ${GROUP_SUFFIXES[g]}` : '';
        const name = `${tpl.level}${serie ? ` ${serie}` : ''}${suffix}`.trim();
        const candidate: ClassData = {
          id: generateId(),
          name,
          school: ws.name,
          schoolId: ws.id,
          circonscription: ws.circonscription || undefined,
          level: tpl.level,
          educationType: tpl.educationType,
          serie,
          schoolYear: options.schoolYear,
          sequence: tpl.educationType === 'secondaire' ? options.semester : options.trimester,
          students: [],
          subjects: tpl.educationType === 'prescolaire'
            ? getDefaultSubjectsForPrescolaire(tpl.level)
            : tpl.educationType === 'secondaire'
              ? getDefaultSubjectsForSecondary(tpl.level as SecondaryLevel, serie)
              : getDefaultSubjectsForLevel(tpl.level),
          notes: [],
          createdAt: now,
          updatedAt: now,
        };
        const key = classSlotKey(candidate);
        if (present.has(key)) continue;
        present.add(key);
        created.push(candidate);
      }
    }
  }
  return created;
}

/* ------------------------------------------------------------------ */
/* Statistiques consolidées de l'école                                 */
/* ------------------------------------------------------------------ */

export interface CycleStats {
  cycle: LevelTemplate['cycle'];
  classes: number;
  students: number;
  filles: number;
  garcons: number;
}

export interface SchoolStats {
  classes: number;
  students: number;
  filles: number;
  garcons: number;
  subjects: number;
  /** Notes saisies / attendues (élèves × matières), comme l'accueil. */
  notesDone: number;
  notesExpected: number;
  notesPct: number;
  emptyClasses: number;
  byCycle: CycleStats[];
}

export function cycleOfClass(c: ClassData): LevelTemplate['cycle'] {
  if (c.educationType === 'prescolaire') return 'Préscolaire';
  if (c.educationType === 'secondaire') {
    return SECOND_CYCLE_LEVELS.includes(c.level) ? 'Lycée' : 'Collège';
  }
  return 'Primaire';
}

export function computeSchoolStats(classes: ClassData[]): SchoolStats {
  const byCycleMap = new Map<LevelTemplate['cycle'], CycleStats>();
  const order: LevelTemplate['cycle'][] = ['Préscolaire', 'Primaire', 'Collège', 'Lycée'];
  for (const cycle of order) byCycleMap.set(cycle, { cycle, classes: 0, students: 0, filles: 0, garcons: 0 });

  let students = 0; let filles = 0; let garcons = 0; let subjects = 0;
  let notesDone = 0; let notesExpected = 0; let emptyClasses = 0;

  for (const c of classes) {
    const f = c.students.filter(s => s.sexe === 'F').length;
    const g = c.students.filter(s => s.sexe === 'M').length;
    students += c.students.length; filles += f; garcons += g;
    subjects += c.subjects.length;
    notesDone += c.notes.filter(n => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent).length;
    notesExpected += c.students.length * c.subjects.length;
    if (c.students.length === 0) emptyClasses++;
    const row = byCycleMap.get(cycleOfClass(c))!;
    row.classes += 1; row.students += c.students.length; row.filles += f; row.garcons += g;
  }

  return {
    classes: classes.length,
    students, filles, garcons, subjects,
    notesDone, notesExpected,
    notesPct: notesExpected > 0 ? Math.round((notesDone / notesExpected) * 100) : 0,
    emptyClasses,
    byCycle: order.map(c => byCycleMap.get(c)!).filter(r => r.classes > 0),
  };
}

/** Résumé texte de l'école, prêt à partager (WhatsApp / copie). */
export function schoolSummaryText(ws: SchoolWorkspace, stats: SchoolStats): string {
  const cycles = stats.byCycle
    .map(r => `• ${r.cycle} : ${r.classes} classe(s), ${r.students} élève(s) (${r.filles} F / ${r.garcons} G)`)
    .join('\n');
  return [
    `🏫 ${ws.name}`,
    `Année scolaire : ${ws.schoolYear}`,
    ws.commune ? `Commune : ${ws.commune}` : '',
    ws.circonscription ? `Circonscription : ${ws.circonscription}` : '',
    '',
    `📚 ${stats.classes} classe(s) — 👧👦 ${stats.students} élève(s) (${stats.filles} filles / ${stats.garcons} garçons)`,
    `📝 Saisie des notes : ${stats.notesPct} %`,
    cycles,
    '',
    '— Master Soutien Pédagogique (Espace École)',
  ].filter(Boolean).join('\n');
}
