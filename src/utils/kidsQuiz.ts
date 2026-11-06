/**
 * Quiz « Devine le mot » pour les petits écoliers.
 * Génération déterministe (graine) → testable, aucun réseau requis.
 */

export interface QuizWord {
  word: string;
  definition: string;
  example: string;
}

export interface QuizQuestion {
  /**
   * Phrase INTERROGATIVE posée à l'élève (v38).
   * Le quiz ne présente plus une définition sèche mais une vraie question.
   */
  question: string;
  definition: string;
  example: string;
  correct: string;
  options: string[];
}

export interface QuizResult {
  score: number;
  total: number;
}

const BEST_KEY = 'msp_kids_quiz_best';

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Formule une VRAIE PHRASE INTERROGATIVE à partir de la définition (v38).
 *
 * Avant : le quiz affichait la définition brute, ce qui n'était pas une question.
 * Désormais l'élève lit toujours une phrase se terminant par un point d'interrogation.
 * La tournure varie de façon déterministe pour éviter la monotonie.
 */
export function phraseQuestion(definition: string, seedIndex: number): string {
  const d = (definition || '').trim().replace(/\s+/g, ' ').replace(/[.。]+$/, '');
  if (!d) return 'Quel mot correspond à cette définition ?';
  // Minuscule initiale pour insérer la définition dans la phrase.
  const low = d.charAt(0).toLowerCase() + d.slice(1);
  const formes = [
    `Quel mot signifie « ${low} » ?`,
    `Quel est le mot qui veut dire « ${low} » ?`,
    `Comment appelle-t-on ce qui se définit par « ${low} » ?`,
    `Quel mot correspond à cette définition : « ${low} » ?`,
    `Lequel de ces mots veut dire « ${low} » ?`,
    `Quel mot choisis-tu pour « ${low} » ?`,
  ];
  return formes[Math.abs(seedIndex) % formes.length];
}


/* ================================================================== */
/* MASQUAGE DE LA RÉPONSE (v39)                                       */
/* ================================================================== */
/**
 * CORRECTION v39 — la question ne doit JAMAIS contenir la réponse.
 *
 * Beaucoup de définitions commencent par le mot lui-même
 * (« Une ADDITION sert à mettre ensemble plusieurs nombres ») et les exemples
 * le répètent souvent (« Le VACCIN protège l'enfant »). L'élève pouvait donc
 * lire la réponse dans l'énoncé : le quiz ne mesurait plus rien.
 *
 * `maskAnswer` retire le mot attendu de tout texte affiché avant la réponse,
 * en tenant compte :
 *   - des accents et de la casse (Énergie / energie) ;
 *   - de l'élision (l'hygiène, d'addition) ;
 *   - du pluriel et du féminin simples (microbes, citoyenne) ;
 *   - des mots composés (« carte » dans « cartes postales »).
 * Le mot est remplacé par « … » pour que la phrase reste lisible.
 */
function stripAccents(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function maskAnswer(text: string, answer: string, placeholder = '…'): string {
  const raw = (text || '').trim();
  const word = (answer || '').trim();
  if (!raw || !word) return raw;

  // Racine du mot : on tolère les terminaisons de pluriel/féminin.
  const base = stripAccents(word).toLowerCase().replace(/(aux|es|s|e)$/,'');
  if (base.length < 3) return raw;

  // On travaille sur une version sans accents pour repérer, mais on découpe
  // le texte D'ORIGINE afin de préserver accents et ponctuation.
  const flat = stripAccents(raw).toLowerCase();
  const re = new RegExp(`(^|[^a-z0-9])((?:[ldnmtsj]'|qu')?)${base}[a-z]{0,4}`, 'g');

  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    const start = m.index + m[1].length;
    const end = m.index + m[0].length;
    out += raw.slice(last, start) + m[2] + placeholder;
    last = end;
  }
  out += raw.slice(last);

  return out.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/** Vrai si le texte laisse encore deviner la réponse (utilisé par les tests). */
export function revealsAnswer(text: string, answer: string): boolean {
  const base = stripAccents((answer || '').trim()).toLowerCase().replace(/(aux|es|s|e)$/,'');
  if (base.length < 3) return false;
  return new RegExp(`(^|[^a-z0-9])(?:[ldnmtsj]'|qu')?${base}`, 'g').test(stripAccents(text || '').toLowerCase());
}

/** Génère `count` questions (définition → 4 choix de mots). */
export function generateQuiz(pool: QuizWord[], count = 5, seed = 'quiz'): QuizQuestion[] {
  const rng = mulberry32(hashSeed(seed));
  const items = [...pool];
  // Mélange Fisher-Yates déterministe
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const selected = items.slice(0, Math.max(0, Math.min(count, items.length)));
  return selected.map((item, idx) => {
    const wrongs = items.filter(i => i.word !== item.word).slice(0, 3).map(i => i.word);
    const options = [item.word, ...wrongs];
    // Mélange des 4 options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    // v39 — la définition ET l'exemple sont expurgés du mot à trouver.
    const safeDef = maskAnswer(item.definition, item.word);
    return {
      question: phraseQuestion(safeDef, hashSeed(seed) + idx),
      definition: safeDef,
      example: maskAnswer(item.example, item.word),
      correct: item.word,
      options,
    };
  });
}

/* ------- Meilleur score (stockage local) ------- */

export function loadBestScore(key = BEST_KEY): number {
  try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
}

export function saveBestScore(score: number, key = BEST_KEY): void {
  try {
    const best = loadBestScore(key);
    if (score > best) localStorage.setItem(key, String(score));
  } catch { /* quota */ }
}

/** Message d'encouragement selon le score. */
export function quizMessage(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return 'Bravo, champion ! 🏆';
  if (pct >= 0.6) return 'Très bien, continue ! 👏';
  if (pct >= 0.4) return 'C’est bien, encore un effort ! 💪';
  return 'Recommence, tu vas y arriver ! 🌱';
}

/* ================================================================== */
/* QUIZ EN 100 NIVEAUX (v36)                                          */
/* ================================================================== */
/**
 * Le quiz est structuré en 100 NIVEAUX de 10 QUESTIONS chacun
 * (1 000 questions au total), de difficulté croissante.
 *
 * Progression : un niveau est RÉUSSI à partir de 7 bonnes réponses sur 10 ;
 * le niveau suivant se débloque alors. Le meilleur score de chaque niveau est
 * conservé, et les scores de la semaine alimentent le classement hebdomadaire
 * (voir `weeklyLeaderboard`).
 */

export const LEVELS_COUNT = 100;
export const QUESTIONS_PER_LEVEL = 10;
/** Bonnes réponses minimum pour valider un niveau. */
export const PASS_THRESHOLD = 7;

const PROGRESS_KEY = 'msp_kids_quiz_progress';
const WEEKLY_KEY = 'msp_kids_quiz_weekly';

export interface LevelProgress {
  /** Meilleur score obtenu (sur 10) pour chaque niveau atteint. */
  best: Record<number, number>;
  /** Plus haut niveau débloqué (1 = seul le niveau 1 est ouvert). */
  unlocked: number;
}

export interface WeeklyScore {
  name: string;
  points: number;
  level: number;
  at: number;
  /** Identifiant de semaine (lundi → dimanche), ex. « 2026-S38 ». */
  week: string;
}

/** Difficulté d'un niveau : 3 choix au début, jusqu'à 6 à la fin. */
export function optionsForLevel(level: number): number {
  if (level <= 20) return 3;
  if (level <= 50) return 4;
  if (level <= 80) return 5;
  return 6;
}

/** Intitulé du palier auquel appartient le niveau. */
export function levelTier(level: number): string {
  if (level <= 20) return 'Découverte';
  if (level <= 40) return 'Apprenti';
  if (level <= 60) return 'Explorateur';
  if (level <= 80) return 'Expert';
  return 'Champion';
}

/**
 * Questions d'un niveau donné : 10 questions tirées de façon déterministe
 * (le niveau N propose toujours les mêmes mots, avec un nombre de choix
 * croissant selon la difficulté).
 */
export function generateLevel(pool: QuizWord[], level: number): QuizQuestion[] {
  const lvl = Math.max(1, Math.min(LEVELS_COUNT, Math.round(level)));
  const rng = mulberry32(hashSeed(`niveau-${lvl}`));
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  if (items.length === 0) return [];
  const nOptions = optionsForLevel(lvl);
  // Fenêtre de mots propre au niveau : les niveaux avancés puisent plus loin.
  const start = ((lvl - 1) * QUESTIONS_PER_LEVEL) % items.length;
  const selected: QuizWord[] = [];
  for (let k = 0; k < QUESTIONS_PER_LEVEL; k++) {
    selected.push(items[(start + k) % items.length]);
  }
  return selected.map((item, idx) => {
    const wrongs = items
      .filter(i => i.word !== item.word)
      .slice(0, Math.max(1, nOptions - 1))
      .map(i => i.word);
    const options = [item.word, ...wrongs];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    // v39 — idem pour les 100 niveaux : aucune fuite de la réponse.
    const safeDef = maskAnswer(item.definition, item.word);
    return {
      question: phraseQuestion(safeDef, lvl * 31 + idx),
      definition: safeDef,
      example: maskAnswer(item.example, item.word),
      correct: item.word,
      options,
    };
  });
}

/* ------- Progression ------- */

export function loadProgress(): LevelProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        best: p && typeof p.best === 'object' ? p.best : {},
        unlocked: Math.max(1, Math.min(LEVELS_COUNT, Number(p?.unlocked) || 1)),
      };
    }
  } catch { /* données illisibles */ }
  return { best: {}, unlocked: 1 };
}

export function saveProgress(p: LevelProgress): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

/** Enregistre le résultat d'un niveau et débloque le suivant si réussi. */
export function recordLevelResult(level: number, score: number): LevelProgress {
  const p = loadProgress();
  const prev = p.best[level] ?? 0;
  if (score > prev) p.best[level] = score;
  if (score >= PASS_THRESHOLD && level >= p.unlocked && level < LEVELS_COUNT) {
    p.unlocked = level + 1;
  }
  saveProgress(p);
  return p;
}

/** Vrai si le niveau est jouable (débloqué). */
export function isLevelUnlocked(level: number, p = loadProgress()): boolean {
  return level <= p.unlocked;
}

/** Total de points cumulés sur tous les niveaux. */
export function totalPoints(p = loadProgress()): number {
  return Object.values(p.best).reduce((a, b) => a + (Number(b) || 0), 0);
}

/* ------- Classement hebdomadaire (lundi → dimanche) ------- */

/**
 * Identifiant de la semaine ISO contenant `date` (lundi = premier jour,
 * dimanche = dernier). Format : « AAAA-Sxx ».
 */
export function weekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Jeudi de la semaine courante → détermine l'année ISO.
  const day = d.getUTCDay() || 7; // dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`;
}

/** Bornes (lundi 00 h 00 → dimanche 23 h 59) de la semaine contenant `date`. */
export function weekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay() || 7;           // lundi = 1 … dimanche = 7
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function loadWeeklyScores(): WeeklyScore[] {
  try {
    const arr = JSON.parse(localStorage.getItem(WEEKLY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Enregistre le score d'un joueur pour la semaine en cours.
 * Un même nom ne conserve que son MEILLEUR total de la semaine.
 */
export function recordWeeklyScore(name: string, points: number, level: number): WeeklyScore[] {
  const clean = (name || '').trim() || 'Élève';
  const week = weekId();
  const all = loadWeeklyScores().filter(s => s.week === week || Date.now() - s.at < 60 * 86400000);
  const mine = all.find(s => s.week === week && s.name.toLowerCase() === clean.toLowerCase());
  if (mine) {
    if (points > mine.points) { mine.points = points; mine.level = level; mine.at = Date.now(); }
  } else {
    all.push({ name: clean, points, level, at: Date.now(), week });
  }
  try { localStorage.setItem(WEEKLY_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}

/** Classement de la semaine demandée (par défaut la semaine en cours). */
export function weeklyLeaderboard(week = weekId()): WeeklyScore[] {
  return loadWeeklyScores()
    .filter(s => s.week === week)
    .sort((a, b) => b.points - a.points || a.at - b.at);
}

/**
 * MEILLEUR JOUEUR DE LA SEMAINE — publié dans l'application à la fin de la
 * semaine (entre le lundi et le dimanche). Retourne null si personne n'a joué.
 */
export function weeklyChampion(week = weekId()): WeeklyScore | null {
  return weeklyLeaderboard(week)[0] || null;
}

/** Semaine précédente (pour publier le champion une fois la semaine close). */
export function previousWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return weekId(d);
}

/** Vrai si la semaine est terminée (on est passé à la semaine suivante). */
export function isWeekClosed(week: string): boolean {
  return week !== weekId();
}
