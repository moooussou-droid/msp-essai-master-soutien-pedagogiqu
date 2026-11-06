import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe?: 'M' | 'F';
  dateNaissance?: string; // format AAAA-MM-JJ
  photoUrl?: string;
  /** v67 — traçabilité de la photo d’identité préparée pour EducMaster. */
  educMasterPhotoPreparedAt?: number;
  educMasterPhotoWhiteBackground?: boolean;
  weightKg?: number;
  heightCm?: number;
  createdAt: number;
}

export interface Subject {
  id: string;
  name: string;
  noteObtenueMax: number; // Primaire: Critères minimaux (CM) /18 — Secondaire: Note obtenue /20
  notePerfectionnementMax: number; // Primaire: Note de perfectionnement (CP) /2 — Secondaire: 0 (non utilisé)
  coefficient?: number; // Secondaire uniquement : coefficient de la matière (défaut 1)
  order: number;
  /** Secondaire : groupe du bulletin officiel (bilan littéraire / scientifique / autres). */
  groupe?: SubjectGroupe;
}

/** Groupes du bulletin officiel du secondaire (bilans). */
export type SubjectGroupe = 'litteraire' | 'scientifique' | 'autres';

/**
 * Détermine le groupe d'une matière du secondaire. Si la matière n'a pas de
 * groupe explicite, il est déduit de son nom (Math/SVT/Physique-Chimie →
 * scientifique ; EPS/Sport/Conduite/Arts/Technologie → autres ; sinon littéraire).
 */
export function subjectGroupe(subject: Subject): SubjectGroupe {
  if (subject.groupe) return subject.groupe;
  const n = subject.name.toLowerCase();
  if (/(math|physique|chimie|svt|science|pc\b)/.test(n)) return 'scientifique';
  if (/(eps|sport|musique|conduite|art|techno|dessin|informatique|atelier|travaux|education physique)/.test(n)) return 'autres';
  return 'litteraire';
}

export const GROUPE_LABELS: Record<SubjectGroupe, string> = {
  litteraire: 'Bilan littéraire',
  scientifique: 'Bilan scientifique',
  autres: 'Bilan des autres matières',
};

export interface Note {
  id: string;
  studentId: string;
  subjectId: string;
  noteObtenue: number | null;
  notePerfectionnement: number | null;
  absent: boolean;
  updatedAt: number;
  /**
   * Évaluation à laquelle appartient la note (nouveau modèle officiel du primaire).
   * Absent pour les notes saisies avant l'arrivée de ce modèle (compatibilité).
   */
  evaluation?: EvaluationId;
}

/**
 * Évaluations du nouveau modèle officiel (fichier Excel du primaire à plusieurs
 * feuilles) : une évaluation formative puis trois évaluations sommatives.
 */
export type EvaluationId = 'formative1' | 'sommative1' | 'sommative2' | 'sommative3' | (string & {});

/**
 * « AUTRES ÉVALUATIONS » (v32) : en dehors des 4 évaluations reconnues par
 * EducMaster (formative 1 + sommatives 1/2/3), l'enseignant peut créer ses
 * propres évaluations à son initiative (ex. « Projet de classe », « Devoir
 * maison », « Interrogation orale ») et y rattacher des notes, notamment
 * lors de l'importation d'un fichier Excel.
 */
export interface CustomEvaluation {
  id: string;          // « custom-… » (unique)
  label: string;       // libellé libre saisi par l'enseignant
  date?: string;       // date de l'évaluation (facultative)
  createdAt: number;
}

/** Fabrique une « Autre évaluation » (id unique + libellé + date). */
export function makeCustomEvaluation(label: string, date?: string): CustomEvaluation {
  return {
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    label: label.trim(),
    date: date?.trim() || undefined,
    createdAt: Date.now(),
  };
}

/**
 * Liste ordonnée des évaluations (affichage UI et export Excel).
 * `label` : libellé affiché dans l'application (avec accents).
 * `sheetName` : nom de feuille EXACT du modèle officiel (sans accents),
 * utilisé pour l'export et le modèle vierge afin d'être fidèle au fichier
 * fourni par la direction (l'import accepte les deux formes).
 */
export const EVALUATIONS: { id: EvaluationId; label: string; sheetName: string }[] = [
  { id: 'formative1', label: 'Évaluation formative 1', sheetName: 'Evaluation formative 1' },
  { id: 'sommative1', label: 'Évaluation sommative 1', sheetName: 'Evaluation sommative 1' },
  { id: 'sommative2', label: 'Évaluation sommative 2', sheetName: 'Evaluation sommative 2' },
  { id: 'sommative3', label: 'Évaluation sommative 3', sheetName: 'Evaluation sommative 3' },
];

/** Libellé lisible d'une évaluation (avec repli sûr). */
export function evaluationLabel(evaluation?: EvaluationId, customEvaluations?: CustomEvaluation[]): string {
  if (!evaluation) return 'Toutes les évaluations';
  const official = EVALUATIONS.find(e => e.id === evaluation);
  if (official) return official.label;
  const custom = (customEvaluations || []).find(c => c.id === evaluation);
  return custom ? custom.label : evaluation;
}

/**
 * Évaluations proposées pour une classe :
 * - Maternelle / Primaire : chaque évaluation (formative 1, sommative 1/2/3)
 *   a SON bulletin de notes.
 * - Secondaire : le bulletin officiel combine les interrogations écrites
 *   (MEPE) et deux devoirs surveillés (NPS1, NPS2).
 */
export function evaluationsForClass(
  classData: ClassData
): { id: EvaluationId; label: string }[] {
  const base = isSecondaire(classData)
    ? [
        { id: 'formative1' as EvaluationId, label: 'Interrogations écrites (MEPE)' },
        { id: 'sommative1' as EvaluationId, label: 'Devoir surveillé 1 (NPS1)' },
        { id: 'sommative2' as EvaluationId, label: 'Devoir surveillé 2 (NPS2)' },
      ]
    : EVALUATIONS.map(e => ({ id: e.id as EvaluationId, label: e.label }));
  // « Autres évaluations » : à la suite des évaluations officielles.
  const customs = (classData.customEvaluations || []).map(c => ({ id: c.id as EvaluationId, label: c.label }));
  return [...base, ...customs];
}

/** Vrai si l'évaluation est une « Autre évaluation » (non reconnue EducMaster). */
export function isCustomEvaluation(evaluation?: EvaluationId): boolean {
  return !!evaluation && evaluation.startsWith('custom-');
}

/**
 * Priorité de choix d'une note quand plusieurs évaluations existent :
 * la plus récente sommative disponible prime, puis la formative, puis les
 * notes historiques (sans évaluation, compatibilité).
 */
const EVALUATION_PRIORITY: Record<EvaluationId, number> = {
  sommative3: 0,
  sommative2: 1,
  sommative1: 2,
  formative1: 3,
};

/**
 * Retrouve la note « de référence » d'un élève pour une matière : s'il existe
 * plusieurs évaluations, choisit la plus prioritaire (dernière sommative
 * disponible). Remplace les `notes.find(studentId && subjectId)` dispersés,
 * qui ignoraient le nouveau modèle multi-évaluations.
 */
export function findBestNote(
  notes: Note[],
  studentId: string,
  subjectId: string
): Note | undefined {
  const matches = notes.filter(
    n => n.studentId === studentId && n.subjectId === subjectId
  );
  if (matches.length <= 1) return matches[0];
  return [...matches].sort((a, b) => {
    // « Autres évaluations » (custom-…) : priorité 10 → prises en compte si
    // aucune note des 4 évaluations EducMaster n'existe, jamais à leur place.
    const pa = a.evaluation !== undefined ? (EVALUATION_PRIORITY[a.evaluation] ?? 10) : 99;
    const pb = b.evaluation !== undefined ? (EVALUATION_PRIORITY[b.evaluation] ?? 10) : 99;
    return pa - pb;
  })[0];
}

/**
 * Retrouve la note d'un élève pour une matière dans UNE évaluation précise.
 * Règle de compatibilité identique à l'export Excel : les notes historiques
 * (sans évaluation) sont rattachées à « Evaluation sommative 1 », leur
 * évaluation par défaut.
 */
export function findNoteInEvaluation(
  notes: Note[],
  studentId: string,
  subjectId: string,
  evaluation: EvaluationId
): Note | undefined {
  const exact = notes.find(
    n => n.studentId === studentId && n.subjectId === subjectId && n.evaluation === evaluation
  );
  if (exact) return exact;
  if (evaluation === 'sommative1') {
    return notes.find(
      n => n.studentId === studentId && n.subjectId === subjectId && n.evaluation === undefined
    );
  }
  return undefined;
}

export type EducationType = 'prescolaire' | 'primaire' | 'secondaire';

export type PrescolaireLevel = 'Maternelle 1' | 'Maternelle 2';
export type PrimaryLevel = 'CI' | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2';
export type SecondaryLevel = '6ème' | '5ème' | '4ème' | '3ème' | '2nde' | '1ère' | 'Tle';
export type SecondarySerie = 'A1' | 'A2' | 'B' | 'C' | 'D';

export interface ClassData {
  id: string;
  name: string;
  school: string;
  /**
   * v64 — ESPACE ÉCOLE : identifiant de l'établissement (SchoolWorkspace)
   * auquel la classe appartient. Optionnel et additif : les classes créées
   * avant la v64 n'en ont pas, elles restent utilisables et peuvent être
   * « rattachées » à l'espace de leur école depuis l'écran Espace École
   * (le champ `school`, lui, continue d'être imprimé sur les bulletins).
   */
  schoolId?: string;
  /** v64 — enseignant(e) titulaire de la classe, saisi dans l'Espace École. */
  teacherName?: string;
  circonscription?: string;
  level: string; // Primaire: CI..CM2 — Secondaire: 6ème..Tle
  educationType?: EducationType; // défaut 'primaire' (compatibilité anciennes classes)
  serie?: SecondarySerie; // Secondaire second cycle uniquement
  schoolYear: string;
  sequence: string;
/**
 * Type d'évaluation de la classe — champ LIBRE saisi par l'utilisateur dans
 * « Nouvelle classe » (ex. « Devoir surveillé », « Interrogation écrite »).
 * Optionnel : les classes créées avant cette version n'en ont pas.
 */
evaluationType?: string;
  /** « Autres évaluations » créées par l'enseignant (v32). */
  customEvaluations?: CustomEvaluation[];
  students: Student[];
  subjects: Subject[];
  notes: Note[];
  createdAt: number;
  updatedAt: number;
}

interface NoteFacileDB extends DBSchema {
  classes: {
    key: string;
    value: ClassData;
  };
}

let db: IDBPDatabase<NoteFacileDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NoteFacileDB>> {
  if (db) return db;
  
  db = await openDB<NoteFacileDB>('NoteFacileBenin', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' });
      }
    },
  });
  
  return db;
}

export async function getAllClasses(): Promise<ClassData[]> {
  const database = await getDB();
  return database.getAll('classes');
}

export async function getClass(id: string): Promise<ClassData | undefined> {
  const database = await getDB();
  return database.get('classes', id);
}

export async function saveClass(classData: ClassData): Promise<void> {
  const database = await getDB();
  classData.updatedAt = Date.now();
  await database.put('classes', classData);
}

export async function deleteClass(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('classes', id);
}

export async function exportAllData(): Promise<string> {
  const database = await getDB();
  const classes = await database.getAll('classes');
  return JSON.stringify({
    version: 2,
    exportDate: new Date().toISOString(),
    classes,
    extraLocalData: exportExtraLocalData(),
  }, null, 2);
}

export async function importAllData(jsonData: string): Promise<void> {
  const database = await getDB();
  const data = JSON.parse(jsonData);
  
  if (!data.classes || !Array.isArray(data.classes)) {
    throw new Error('Format de fichier invalide');
  }
  
  for (const classData of data.classes) {
    await database.put('classes', classData);
  }

  if (data.extraLocalData && typeof data.extraLocalData === 'object') {
    importExtraLocalData(data.extraLocalData);
  }
}

export async function clearAllData(): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('classes', 'readwrite');
  await tx.objectStore('classes').clear();
  await tx.done;
  clearExtraLocalData();
}

const EXTRA_BACKUP_KEYS = [
  'msp_pedagogical_tools',
  'msp_fiches_pedagogiques',
  'msp_fiches_planning',
  'msp_fiches_emploi_temps',
  'msp_attendance_records',
  'msp_correspondence_notes',
  'msp_school_calendar_events',
  'msp_activity_events',
  'msp_admin_documents',
  'msp_admin_tasks',
  'msp_teacher_toolkit_inventory',
  'msp_enrollment_records',
  // v68 : textes personnalisés de poésie, chants, comptines et contes.
  'msp_oral_resources_custom_v1',
  'msp_marketplace_courses',
  'msp_profile',
  // v49-v52 : registres et vie scolaire.
  'msp_cahier_journal',
  'msp_registre_matricule',
  'msp_school_fees',
  'msp_livret_scolaire',
  'msp_manuels_materiel',
  'msp_emploi_du_temps',
  'msp_remediation',
  'msp_conseil_classe',
  'msp_backup_log',
  // v55 : etat de l'essai gratuit (le marqueur, lui, reste sur l'appareil).
  'msp_trial',
  // v58 : catalogue des tutoriels publies.
  'msp_tutorials',
  // v64 : espaces école (multi-classes) et meilleurs scores des quiz
  // Français GCO / Anglais au Primaire.
  'msp_school_workspaces_v1',
  'msp_active_school_id',
  'msp_french_gco_best',
  'msp_english_primary_best',
  // v67 : grilles officielles d’observation de la maternelle (TS/S/PS).
  'msp_prescolaire_evaluations_v1',
];

function exportExtraLocalData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const key of EXTRA_BACKUP_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
}

function importExtraLocalData(data: Record<string, string>): void {
  for (const key of EXTRA_BACKUP_KEYS) {
    if (typeof data[key] === 'string') localStorage.setItem(key, data[key]);
  }
}

function clearExtraLocalData(): void {
  for (const key of EXTRA_BACKUP_KEYS) localStorage.removeItem(key);
}

/**
 * Période de la classe, toujours exploitable.
 *
 * ⚠️ `sequence` est déclaré obligatoire dans le type, mais RIEN ne le
 * garantit à l'exécution : une classe créée par une version antérieure,
 * restaurée depuis une sauvegarde ancienne ou importée peut ne pas en
 * avoir. Les appels directs à `classData.sequence.replace(...)` faisaient
 * alors échouer l'export Excel et Word des bulletins, avec le message
 * « Cannot read properties of undefined ».
 */
export function classSequence(classData: { sequence?: string } | null | undefined): string {
  const s = (classData?.sequence || '').trim();
  return s || '1er Trimestre';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Trie les élèves par ordre alphabétique du NOM, puis des Prénoms.
 * Respecte l'ordre alphabétique français (accents gérés) et ignore la casse,
 * afin d'être identique à l'ordre du fichier modèle EducMaster.
 */
/** Indique si une classe relève de l'enseignement secondaire. */
export function isSecondaire(classData: ClassData): boolean {
  return classData.educationType === 'secondaire';
}

/** v67 — classe de maternelle, y compris ancienne classe sans type explicite. */
export function isPrescolaire(classData: ClassData | null | undefined): boolean {
  return !!classData && (
    classData.educationType === 'prescolaire'
    || /^maternelle\s*[12]$/i.test((classData.level || '').trim())
  );
}

export function sortStudents(students: Student[]): Student[] {
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  return [...students].sort((a, b) => {
    const byNom = collator.compare(a.nom || '', b.nom || '');
    if (byNom !== 0) return byNom;
    return collator.compare(a.prenoms || '', b.prenoms || '');
  });
}

export function getDefaultSubjectsForLevel(_level: string): Subject[] {
  // Noms conformes EXACTEMENT au modèle officiel EducMaster (Notes - CE1)
  const baseSubjects: Omit<Subject, 'id' | 'order'>[] = [
    { name: 'Dictée', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'Math', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'Expresion écrite', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'Compréhension de l\'écrit', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'EST', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'ES', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'EA (Oral)', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'EA (Déssin/Couture)', noteObtenueMax: 18, notePerfectionnementMax: 2 },
    { name: 'EPS', noteObtenueMax: 18, notePerfectionnementMax: 2 },
  ];
  
  return baseSubjects.map((subject, index) => ({
    ...subject,
    id: generateId(),
    order: index,
  }));
}

/**
 * Matières par défaut pour l'enseignement SECONDAIRE.
 * Système : Note obtenue /20, Coefficient (modifiable), Total obtenu, Total possible.
 * Le coefficient par défaut est 1 (l'enseignant le modifie selon la matière/série).
 */
export function getDefaultSubjectsForSecondary(
  level: SecondaryLevel,
  serie?: SecondarySerie
): Subject[] {
  let names: string[];

  const isSecondCycle = level === '2nde' || level === '1ère' || level === 'Tle';

  if (!isSecondCycle) {
    // Premier cycle : 6ème, 5ème, 4ème, 3ème
    names = [
      'Communication écrite',
      'Lecture',
      'Mathématiques',
      'PCT',
      'Allemand ou Espagnol',
      'Histoire-Géographie',
      'Anglais',
      'SVT',
      'EPS',
      'Conduite',
    ];
  } else if (serie === 'C' || serie === 'D') {
    // Séries scientifiques C et D
    names = [
      'Français',
      'Mathématiques',
      'PCT',
      'Histoire-Géographie',
      'Anglais',
      'Philosophie',
      'SVT',
      'EPS',
      'Conduite',
    ];
  } else {
    // Séries littéraires A1, A2 et B
    names = [
      'Français',
      'Mathématiques',
      'LV1',
      'Histoire-Géographie',
      'LV2',
      'SVT',
      'Philosophie',
      'EPS',
      'Conduite',
    ];
    // La série B ajoute l'Économie
    if (serie === 'B') {
      names.splice(names.indexOf('Philosophie'), 0, 'Economie');
    }
  }

  return names.map((name, index) => ({
    id: generateId(),
    name,
    noteObtenueMax: 20, // Note obtenue sur 20
    notePerfectionnementMax: 0, // non utilisé au secondaire
    coefficient: 1, // modifiable par l'enseignant
    order: index,
  }));
}

/**
 * Domaines d’observation par défaut pour le PRÉSCOLAIRE
 * (Maternelle 1 et Maternelle 2).
 *
 * v67 : ce sont EXACTEMENT les dix domaines du bulletin officiel
 * photographié. Le bulletin officiel est rempli en TS/S/PS dans le modèle
 * `prescolaireBulletin.ts` ; ces entrées Subject ne servent qu’aux anciens
 * écrans de suivi et ne doivent jamais produire un classement d’enfants.
 */
export function getDefaultSubjectsForPrescolaire(_level: string): Subject[] {
  const domaines: string[] = [
    'Fréquentations',
    'Propreté corporelle et vestimentaire',
    'Socialisation',
    'Langage',
    'Pré-écriture',
    'Éducation du mouvement',
    'Pré-lecture',
    'Pré-mathématique',
    'Poésie et Chant',
    'Autres',
  ];

  return domaines.map((name, index) => ({
    id: generateId(),
    name,
    noteObtenueMax: 10, // note simple sur 10
    notePerfectionnementMax: 0, // non utilisé au préscolaire
    order: index,
  }));
}
