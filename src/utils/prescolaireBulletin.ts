/**
 * BULLETIN OFFICIEL DE LA MATERNELLE (v67) — grille d’observation TS/S/PS.
 *
 * Le bulletin photographié n’est PAS un bulletin de notes : il ne contient
 * ni note sur 20, ni moyenne, ni rang, ni mention. L’enfant est observé dans
 * dix domaines et reçoit, pour chacun, l’une des trois appréciations :
 *   TS = Très Satisfaisant · S = Satisfaisant · PS = Peu Satisfaisant.
 *
 * Les données sont donc stockées dans un modèle dédié, séparé des notes
 * numériques CM/CP du primaire. Une grille est conservée par enfant et par
 * trimestre ; les anciennes notes éventuelles de la classe ne sont jamais
 * détruites et peuvent seulement servir de suggestion de pré-remplissage.
 */
import { ClassData, Student, classSequence } from './database';
import type { StudentBulletin } from './bulletin';

export const PRESCHOOL_EVALUATIONS_KEY = 'msp_prescolaire_evaluations_v1';

export type PreschoolRating = 'TS' | 'S' | 'PS' | '';
export type PreschoolTrimester = '1er trimestre' | '2e trimestre' | '3e trimestre';

export interface PreschoolDomain {
  id: string;
  label: string;
}

/** Les dix domaines EXACTS du livret photographié, dans le même ordre. */
export const PRESCHOOL_DOMAINS: PreschoolDomain[] = [
  { id: 'frequentations', label: 'Fréquentations' },
  { id: 'proprete', label: 'Propreté corporelle et vestimentaire' },
  { id: 'socialisation', label: 'Socialisation' },
  { id: 'langage', label: 'Langage' },
  { id: 'pre-ecriture', label: 'Pré-écriture' },
  { id: 'education-mouvement', label: 'Éducation du mouvement' },
  { id: 'pre-lecture', label: 'Pré-lecture' },
  { id: 'pre-mathematique', label: 'Pré-mathématique' },
  { id: 'poesie-chant', label: 'Poésie et Chant' },
  { id: 'autres', label: 'Autres' },
];

export const PRESCHOOL_TRIMESTERS: { id: PreschoolTrimester; label: string; short: string }[] = [
  { id: '1er trimestre', label: '1er Trimestre', short: 'Trimestre 1' },
  { id: '2e trimestre', label: '2e Trimestre', short: 'Trimestre 2' },
  { id: '3e trimestre', label: '3e Trimestre', short: 'Trimestre 3' },
];

export interface PreschoolDomainResult {
  rating: PreschoolRating;
  observation: string;
}

export interface PreschoolEvaluationRecord {
  id: string;
  classId: string;
  studentId: string;
  trimester: PreschoolTrimester;
  results: Record<string, PreschoolDomainResult>;
  generalAppreciation: string;
  updatedAt: number;
}

export interface PreschoolCounts {
  TS: number;
  S: number;
  PS: number;
  completed: number;
  total: number;
}

export function isPrescolaireClass(classData: ClassData | null | undefined): boolean {
  return !!classData && (
    classData.educationType === 'prescolaire'
    || /^maternelle\s*[12]$/i.test((classData.level || '').trim())
  );
}

/** Convertit la période libre de la classe en trimestre officiel. */
export function normalizePreschoolTrimester(value?: string): PreschoolTrimester {
  const v = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(^|[^0-9])(2|deux)/.test(v)) return '2e trimestre';
  if (/(^|[^0-9])(3|trois)/.test(v)) return '3e trimestre';
  return '1er trimestre';
}

export function preschoolTrimesterLabel(trimester: PreschoolTrimester): string {
  return PRESCHOOL_TRIMESTERS.find(t => t.id === trimester)?.label || '1er Trimestre';
}

export function classPreschoolTrimester(classData: ClassData): PreschoolTrimester {
  return normalizePreschoolTrimester(classSequence(classData));
}

function emptyResults(): Record<string, PreschoolDomainResult> {
  return Object.fromEntries(PRESCHOOL_DOMAINS.map(d => [d.id, { rating: '' as PreschoolRating, observation: '' }]));
}

export function createEmptyPreschoolEvaluation(
  classId: string,
  studentId: string,
  trimester: PreschoolTrimester,
): PreschoolEvaluationRecord {
  return {
    id: `${classId}:${studentId}:${trimester}`,
    classId,
    studentId,
    trimester,
    results: emptyResults(),
    generalAppreciation: '',
    updatedAt: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRecord(raw: unknown): PreschoolEvaluationRecord | null {
  if (!isRecord(raw) || typeof raw.classId !== 'string' || typeof raw.studentId !== 'string') return null;
  const trimester = normalizePreschoolTrimester(typeof raw.trimester === 'string' ? raw.trimester : undefined);
  const base = createEmptyPreschoolEvaluation(raw.classId, raw.studentId, trimester);
  const source = isRecord(raw.results) ? raw.results : {};
  for (const domain of PRESCHOOL_DOMAINS) {
    const item = source[domain.id];
    if (!isRecord(item)) continue;
    const rating = item.rating === 'TS' || item.rating === 'S' || item.rating === 'PS' ? item.rating : '';
    base.results[domain.id] = {
      rating,
      observation: typeof item.observation === 'string' ? item.observation : '',
    };
  }
  base.generalAppreciation = typeof raw.generalAppreciation === 'string' ? raw.generalAppreciation : '';
  base.updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  base.id = typeof raw.id === 'string' && raw.id ? raw.id : base.id;
  return base;
}

export function loadPreschoolEvaluations(): PreschoolEvaluationRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESCHOOL_EVALUATIONS_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord).filter((r): r is PreschoolEvaluationRecord => r !== null);
  } catch {
    return [];
  }
}

export function savePreschoolEvaluations(records: PreschoolEvaluationRecord[]): void {
  try {
    localStorage.setItem(PRESCHOOL_EVALUATIONS_KEY, JSON.stringify(records));
  } catch {
    /* Quota navigateur : l’écran signale l’échec via son état de sauvegarde. */
  }
}

export function getPreschoolEvaluation(
  classId: string,
  studentId: string,
  trimester: PreschoolTrimester,
  records: PreschoolEvaluationRecord[] = loadPreschoolEvaluations(),
): PreschoolEvaluationRecord {
  return records.find(r => r.classId === classId && r.studentId === studentId && r.trimester === trimester)
    || createEmptyPreschoolEvaluation(classId, studentId, trimester);
}

export function savePreschoolEvaluation(record: PreschoolEvaluationRecord): PreschoolEvaluationRecord {
  const saved: PreschoolEvaluationRecord = {
    ...record,
    id: record.id || `${record.classId}:${record.studentId}:${record.trimester}`,
    updatedAt: Date.now(),
  };
  const records = loadPreschoolEvaluations().filter(r => !(
    r.classId === saved.classId && r.studentId === saved.studentId && r.trimester === saved.trimester
  ));
  records.push(saved);
  savePreschoolEvaluations(records);
  return saved;
}

export function preschoolCounts(record: PreschoolEvaluationRecord): PreschoolCounts {
  const counts: PreschoolCounts = { TS: 0, S: 0, PS: 0, completed: 0, total: PRESCHOOL_DOMAINS.length };
  for (const domain of PRESCHOOL_DOMAINS) {
    const rating = record.results[domain.id]?.rating || '';
    if (rating) {
      counts.completed += 1;
      counts[rating] += 1;
    }
  }
  return counts;
}

export function preschoolRatingLabel(rating: PreschoolRating): string {
  if (rating === 'TS') return 'Très Satisfaisant';
  if (rating === 'S') return 'Satisfaisant';
  if (rating === 'PS') return 'Peu Satisfaisant';
  return 'Non renseigné';
}

const OBSERVATION_SUGGESTIONS: Record<Exclude<PreschoolRating, ''>, string[]> = {
  TS: ['Très bon progrès', 'Excellent', 'Très bien'],
  S: ['Bon travail', 'En progrès', 'Satisfaisant'],
  PS: ['À accompagner', 'Doit fournir plus d’efforts', 'En cours d’acquisition'],
};

export function preschoolObservationSuggestions(rating: PreschoolRating): string[] {
  return rating ? OBSERVATION_SUGGESTIONS[rating] : [];
}

/** Phrase d’appréciation générale proposée, toujours modifiable par l’enseignant(e). */
export function suggestedGeneralAppreciation(student: Student, record: PreschoolEvaluationRecord): string {
  const c = preschoolCounts(record);
  const first = (student.prenoms || '').trim().split(/\s+/)[0] || 'L’enfant';
  if (c.completed === 0) return '';
  if (c.TS >= 7 && c.PS === 0) {
    return `${first} a réalisé un excellent trimestre. Il/elle participe activement aux activités et progresse très bien dans l’ensemble des domaines observés.`;
  }
  if (c.TS + c.S >= 7 && c.PS <= 2) {
    return `${first} a réalisé un bon trimestre et progresse régulièrement. Il/elle doit poursuivre ses efforts, particulièrement dans les domaines encore fragiles.`;
  }
  if (c.PS >= 5) {
    return `${first} a encore besoin d’un accompagnement régulier à l’école comme à la maison. Les progrès sont à encourager dans plusieurs domaines observés.`;
  }
  return `${first} progresse à son rythme. Il/elle doit être encouragé(e) et accompagné(e) afin de consolider les acquis du trimestre.`;
}

function normalizedName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const LEGACY_DOMAIN_HINTS: Record<string, string[]> = {
  frequentations: ['presen', 'frequent', 'assid'],
  proprete: ['propret', 'hygien', 'vestiment'],
  socialisation: ['social', 'vie sociale', 'autonomie', 'comport'],
  langage: ['langage', 'communication', 'oral', 'expression'],
  'pre-ecriture': ['ecriture', 'graph', 'motricite fine'],
  'education-mouvement': ['mouvement', 'motricite', 'eps', 'sport'],
  'pre-lecture': ['lecture', 'eveil', 'decouverte'],
  'pre-mathematique': ['math', 'nombre', 'logique'],
  'poesie-chant': ['poes', 'chant', 'musique', 'artist', 'dessin'],
  autres: ['jeu', 'autre'],
};

/**
 * Pré-remplit une copie de la grille depuis d’anciennes notes numériques,
 * lorsqu’un nom de matière correspond à un domaine. Les seuils sont
 * pédagogiquement explicites : ≥ 75 % → TS ; ≥ 50 % → S ; sinon PS.
 * L’ancienne note n’est jamais écrite sur le bulletin officiel.
 */
export function suggestPreschoolRatingsFromBulletin(
  record: PreschoolEvaluationRecord,
  bulletin: StudentBulletin,
): PreschoolEvaluationRecord {
  const next: PreschoolEvaluationRecord = {
    ...record,
    results: Object.fromEntries(Object.entries(record.results).map(([k, v]) => [k, { ...v }])),
  };

  for (const domain of PRESCHOOL_DOMAINS) {
    const hints = LEGACY_DOMAIN_HINTS[domain.id] || [];
    const match = bulletin.results.find(r => {
      const name = normalizedName(r.subject.name);
      return hints.some(h => name.includes(h));
    });
    if (!match || match.total === null) continue;
    // Le moteur numérique ramène ses totaux sur 20 ; on convertit en pourcentage.
    const percent = Math.max(0, Math.min(100, (match.total / 20) * 100));
    const rating: Exclude<PreschoolRating, ''> = percent >= 75 ? 'TS' : percent >= 50 ? 'S' : 'PS';
    next.results[domain.id] = {
      rating,
      observation: next.results[domain.id]?.observation || OBSERVATION_SUGGESTIONS[rating][0],
    };
  }
  if (!next.generalAppreciation) next.generalAppreciation = suggestedGeneralAppreciation(bulletin.student, next);
  return next;
}
