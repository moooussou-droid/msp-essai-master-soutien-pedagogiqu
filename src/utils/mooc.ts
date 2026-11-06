/**
 * PLATEFORME MOOC — FORMATION CONTINUE DES ENSEIGNANTS (v62).
 *
 * Une plateforme de cours en ligne ouverte, inspirée des meilleures (Coursera,
 * edX, Udemy) mais 100 % hors-ligne : les créateurs de formation publient des
 * cours structurés (modules → leçons vidéo / texte / quiz), les enseignants
 * s'inscrivent, suivent leur progression, passent les quiz et obtiennent un
 * CERTIFICAT vérifiable. Une communauté (forum + avis) complète l'expérience.
 *
 * Tout est stocké localement (localStorage) pour fonctionner sans connexion ;
 * seules les vidéos YouTube intégrées nécessitent Internet à la lecture.
 */
import { safeJsonParse, safeJsonSet } from './safeStorage';
import { isUnlocked } from './coursePayment';

/* ------------------------------------------------------------------ */
/* Modèle de données                                                   */
/* ------------------------------------------------------------------ */

export type LessonType = 'video' | 'text' | 'quiz';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /** Index (0-based) de la bonne réponse dans `options`. */
  correctIndex: number;
  explanation?: string;
}

export interface MoocLesson {
  id: string;
  title: string;
  type: LessonType;
  /** Durée estimée en minutes (indicative). */
  durationMin: number;
  /**
   * Leçon offerte en APERÇU GRATUIT, même si le cours est payant / partiel.
   * En mode « partial », le créateur coche les leçons librement accessibles.
   */
  free?: boolean;
  /** Leçon vidéo : lien YouTube. */
  youtubeUrl?: string;
  /** Leçon texte : contenu (texte simple, sauts de ligne conservés). */
  content?: string;
  /** Leçon quiz : questions à choix multiple. */
  quiz?: QuizQuestion[];
}

export interface MoocModule {
  id: string;
  title: string;
  lessons: MoocLesson[];
}

export const MOOC_CATEGORIES = [
  'Pédagogie & didactique',
  'Gestion de classe',
  'Numérique éducatif',
  'Évaluation & APC',
  'Administration scolaire',
  'Développement personnel',
  'Langues',
  'Sciences',
  'Autre',
] as const;

export const MOOC_LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'] as const;

/**
 * Modèle de tarification choisi par le créateur :
 *  - 'free'    : tout le cours est gratuit ;
 *  - 'paid'    : cours payant (déblocage unique) ; les leçons cochées « aperçu »
 *                restent visibles gratuitement ;
 *  - 'partial' : partiellement payant — certaines leçons sont gratuites (aperçu),
 *                les autres nécessitent le déblocage du cours.
 */
export type PricingModel = 'free' | 'paid' | 'partial';

export interface MoocCourse {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  language: string;
  /** Emoji de couverture (léger, hors-ligne, pas d'image lourde). */
  emoji: string;
  /** Teinte d'accent (clé Tailwind : emerald, blue, amber…). */
  color: string;
  instructorName: string;
  instructorBio: string;
  /** Tarification (par défaut gratuite). */
  pricing: PricingModel;
  /** Prix en FCFA pour un cours 'paid' ou 'partial'. */
  price: number;
  /** Objectifs pédagogiques (ce que l'apprenant saura faire). */
  objectives: string[];
  modules: MoocModule[];
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CourseProgress {
  enrolledAt: number;
  completedLessonIds: string[];
  /** Score de quiz par leçon : { [lessonId]: { correct, total } }. */
  quizScores: Record<string, { correct: number; total: number }>;
  completedAt?: number;
  /** Code de certificat émis à la complétion (vérifiable). */
  certificateCode?: string;
  /** Nom et prénoms du participant, transcrits sur le certificat. */
  learnerName?: string;
}

export interface CourseReview {
  id: string;
  courseId: string;
  rating: number; // 1..5
  comment: string;
  author: string;
  createdAt: number;
}

export interface ForumPost {
  id: string;
  courseId: string; // '' = forum général
  author: string;
  message: string;
  createdAt: number;
  /** Nombre de « J'aime » (compteur local). */
  likes: number;
  /** Réponses (fil de discussion). */
  replies: { id: string; author: string; message: string; createdAt: number }[];
}

/* ------------------------------------------------------------------ */
/* Clés de stockage                                                    */
/* ------------------------------------------------------------------ */

const COURSES_KEY = 'msp_mooc_courses';
const PROGRESS_KEY = 'msp_mooc_progress';
const REVIEWS_KEY = 'msp_mooc_reviews';
const FORUM_KEY = 'msp_mooc_forum';
const SEED_FLAG = 'msp_mooc_seeded_v1';

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

export function moocId(prefix = 'm'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Cours                                                               */
/* ------------------------------------------------------------------ */

export function loadCourses(): MoocCourse[] {
  ensureSeeded();
  const list = safeJsonParse<MoocCourse[]>(COURSES_KEY, []);
  if (!Array.isArray(list)) return [];
  // Compatibilité : les cours créés avant la tarification n'ont pas ces champs.
  return list.map((c) => ({
    ...c,
    pricing: c.pricing ?? 'free',
    price: typeof c.price === 'number' ? c.price : 0,
  }));
}

export function saveCourses(courses: MoocCourse[]): void {
  safeJsonSet(COURSES_KEY, courses);
}

export function getCourse(id: string): MoocCourse | undefined {
  return loadCourses().find((c) => c.id === id);
}

export function upsertCourse(course: MoocCourse): void {
  const all = loadCourses();
  const i = all.findIndex((c) => c.id === course.id);
  course.updatedAt = Date.now();
  if (i >= 0) all[i] = course;
  else all.unshift(course);
  saveCourses(all);
}

export function deleteCourse(id: string): void {
  saveCourses(loadCourses().filter((c) => c.id !== id));
}

export function emptyCourse(): MoocCourse {
  return {
    id: moocId('c'),
    title: '',
    subtitle: '',
    description: '',
    category: MOOC_CATEGORIES[0],
    level: MOOC_LEVELS[0],
    language: 'Français',
    emoji: '🎓',
    color: 'emerald',
    instructorName: '',
    instructorBio: '',
    pricing: 'free',
    price: 0,
    objectives: [],
    modules: [],
    published: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Accès payant (gratuit / payant / partiellement payant)              */
/* ------------------------------------------------------------------ */

/** Identifiant de contenu payant pour le système de déverrouillage. */
export function courseContentId(courseId: string): string {
  return `formation:${courseId}`;
}

/** Le cours entier a-t-il été débloqué (paiement validé) ? */
export function isCourseUnlocked(course: MoocCourse): boolean {
  if (course.pricing === 'free') return true;
  return isUnlocked(courseContentId(course.id));
}

/** Une leçon donnée est-elle accessible (gratuite, aperçu, ou cours débloqué) ? */
export function isLessonAccessible(course: MoocCourse, lesson: MoocLesson): boolean {
  if (course.pricing === 'free') return true;
  if (lesson.free) return true;
  return isCourseUnlocked(course);
}

/** Le cours comporte-t-il au moins une leçon verrouillée ? */
export function hasLockedContent(course: MoocCourse): boolean {
  if (course.pricing === 'free' || isCourseUnlocked(course)) return false;
  return course.modules.some((m) => m.lessons.some((l) => !l.free));
}

/** Nombre total de leçons d'un cours. */
export function totalLessons(course: MoocCourse): number {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0);
}

/** Durée totale estimée (minutes). */
export function totalDuration(course: MoocCourse): number {
  return course.modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.durationMin || 0), 0),
    0,
  );
}

/** Liste ordonnée de toutes les leçons (pour la navigation « suivante »). */
export function flatLessons(course: MoocCourse): { module: MoocModule; lesson: MoocLesson }[] {
  const out: { module: MoocModule; lesson: MoocLesson }[] = [];
  for (const m of course.modules) for (const l of m.lessons) out.push({ module: m, lesson: l });
  return out;
}

/* ------------------------------------------------------------------ */
/* Progression / inscription                                           */
/* ------------------------------------------------------------------ */

type ProgressMap = Record<string, CourseProgress>;

function loadProgressMap(): ProgressMap {
  return safeJsonParse<ProgressMap>(PROGRESS_KEY, {});
}
function saveProgressMap(m: ProgressMap): void {
  safeJsonSet(PROGRESS_KEY, m);
}

export function getProgress(courseId: string): CourseProgress | undefined {
  return loadProgressMap()[courseId];
}

export function isEnrolled(courseId: string): boolean {
  return !!getProgress(courseId);
}

export function enroll(courseId: string): CourseProgress {
  const m = loadProgressMap();
  if (!m[courseId]) {
    m[courseId] = { enrolledAt: Date.now(), completedLessonIds: [], quizScores: {} };
    saveProgressMap(m);
  }
  return m[courseId];
}

export function unenroll(courseId: string): void {
  const m = loadProgressMap();
  delete m[courseId];
  saveProgressMap(m);
}

/** Enregistre le nom et prénoms du participant (pour le certificat). */
export function setLearnerName(courseId: string, name: string): CourseProgress | undefined {
  const m = loadProgressMap();
  if (!m[courseId]) return undefined;
  m[courseId].learnerName = name;
  saveProgressMap(m);
  return m[courseId];
}

/** Marque (ou démarque) une leçon comme terminée et met à jour la complétion. */
export function setLessonDone(course: MoocCourse, lessonId: string, done: boolean): CourseProgress {
  const m = loadProgressMap();
  const p = m[course.id] ?? (m[course.id] = { enrolledAt: Date.now(), completedLessonIds: [], quizScores: {} });
  const set = new Set(p.completedLessonIds);
  if (done) set.add(lessonId);
  else set.delete(lessonId);
  p.completedLessonIds = [...set];
  refreshCompletion(course, p);
  saveProgressMap(m);
  return p;
}

/** Enregistre le score d'un quiz pour une leçon. */
export function recordQuizScore(course: MoocCourse, lessonId: string, correct: number, total: number): CourseProgress {
  const m = loadProgressMap();
  const p = m[course.id] ?? (m[course.id] = { enrolledAt: Date.now(), completedLessonIds: [], quizScores: {} });
  p.quizScores[lessonId] = { correct, total };
  // Un quiz réussi (≥ 50 %) valide automatiquement la leçon.
  if (total > 0 && correct / total >= 0.5) {
    const set = new Set(p.completedLessonIds);
    set.add(lessonId);
    p.completedLessonIds = [...set];
  }
  refreshCompletion(course, p);
  saveProgressMap(m);
  return p;
}

function refreshCompletion(course: MoocCourse, p: CourseProgress): void {
  const total = totalLessons(course);
  const done = p.completedLessonIds.filter((id) =>
    course.modules.some((m) => m.lessons.some((l) => l.id === id)),
  ).length;
  if (total > 0 && done >= total) {
    if (!p.completedAt) p.completedAt = Date.now();
    if (!p.certificateCode) p.certificateCode = makeCertificateCode(course.id);
  } else {
    p.completedAt = undefined;
    p.certificateCode = undefined;
  }
}

/** Pourcentage de progression (0..100). */
export function progressPercent(course: MoocCourse, p?: CourseProgress): number {
  const total = totalLessons(course);
  if (!p || total === 0) return 0;
  const done = p.completedLessonIds.filter((id) =>
    course.modules.some((m) => m.lessons.some((l) => l.id === id)),
  ).length;
  return Math.round((done / total) * 100);
}

/* ------------------------------------------------------------------ */
/* Certificats vérifiables                                             */
/* ------------------------------------------------------------------ */

/** Code de certificat court et déterministe (vérifiable visuellement). */
export function makeCertificateCode(courseId: string): string {
  const year = new Date().getFullYear();
  let h = 0;
  const base = `${courseId}:${Date.now()}`;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const code = h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `MSP-MOOC-${year}-${code}`;
}

/* ------------------------------------------------------------------ */
/* Avis & notes                                                        */
/* ------------------------------------------------------------------ */

export function loadReviews(): CourseReview[] {
  const list = safeJsonParse<CourseReview[]>(REVIEWS_KEY, []);
  return Array.isArray(list) ? list : [];
}
export function reviewsForCourse(courseId: string): CourseReview[] {
  return loadReviews().filter((r) => r.courseId === courseId).sort((a, b) => b.createdAt - a.createdAt);
}
export function addReview(r: Omit<CourseReview, 'id' | 'createdAt'>): CourseReview {
  const review: CourseReview = { ...r, id: moocId('r'), createdAt: Date.now() };
  safeJsonSet(REVIEWS_KEY, [review, ...loadReviews()]);
  return review;
}
/** Modération : supprime un avis. */
export function deleteReview(id: string): void {
  safeJsonSet(REVIEWS_KEY, loadReviews().filter((r) => r.id !== id));
}

export function averageRating(courseId: string): { avg: number; count: number } {
  const list = reviewsForCourse(courseId);
  if (list.length === 0) return { avg: 0, count: 0 };
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  return { avg: Math.round(avg * 10) / 10, count: list.length };
}

/* ------------------------------------------------------------------ */
/* Forum d'entraide                                                    */
/* ------------------------------------------------------------------ */

export function loadForum(): ForumPost[] {
  const list = safeJsonParse<ForumPost[]>(FORUM_KEY, []);
  return Array.isArray(list) ? list : [];
}
function saveForum(list: ForumPost[]): void {
  safeJsonSet(FORUM_KEY, list);
}
export function forumForCourse(courseId: string): ForumPost[] {
  return loadForum().filter((p) => p.courseId === courseId).sort((a, b) => b.createdAt - a.createdAt);
}
export function addForumPost(courseId: string, author: string, message: string): ForumPost {
  const post: ForumPost = {
    id: moocId('f'), courseId, author, message, createdAt: Date.now(), likes: 0, replies: [],
  };
  saveForum([post, ...loadForum()]);
  return post;
}
export function likeForumPost(id: string): void {
  const list = loadForum();
  const p = list.find((x) => x.id === id);
  if (p) { p.likes += 1; saveForum(list); }
}
export function replyForumPost(id: string, author: string, message: string): void {
  const list = loadForum();
  const p = list.find((x) => x.id === id);
  if (p) {
    p.replies.push({ id: moocId('fr'), author, message, createdAt: Date.now() });
    saveForum(list);
  }
}

/** Modération : supprime un fil du forum. */
export function deleteForumPost(id: string): void {
  saveForum(loadForum().filter((p) => p.id !== id));
}

/** Modération : (dé)publie un cours. */
export function setCoursePublished(courseId: string, published: boolean): void {
  const all = loadCourses();
  const c = all.find((x) => x.id === courseId);
  if (c) { c.published = published; c.updatedAt = Date.now(); saveCourses(all); }
}

/* ------------------------------------------------------------------ */
/* Contenu initial (cours de démonstration de qualité)                 */
/* ------------------------------------------------------------------ */

function ensureSeeded(): void {
  if (safeJsonParse<boolean>(SEED_FLAG, false)) return;
  const existing = safeJsonParse<MoocCourse[]>(COURSES_KEY, []);
  if (Array.isArray(existing) && existing.length > 0) {
    safeJsonSet(SEED_FLAG, true);
    return;
  }
  safeJsonSet(COURSES_KEY, SEED_COURSES);
  safeJsonSet(SEED_FLAG, true);
}

const SEED_COURSES: MoocCourse[] = [
  {
    id: 'seed-apc',
    title: "Enseigner avec l'Approche Par Compétences (APC)",
    subtitle: 'Concevoir, animer et évaluer une séance APC au Bénin',
    description:
      "Une formation complète et pratique sur l'Approche Par Compétences telle qu'attendue par le "
      + "MEMP et le MESTFP. Vous apprendrez à formuler des situations d'apprentissage, à conduire une "
      + "séance active et à évaluer par compétences, exemples béninois à l'appui.",
    category: 'Évaluation & APC',
    level: 'Intermédiaire',
    language: 'Français',
    emoji: '🧭',
    color: 'emerald',
    instructorName: 'Master Soutien Pédagogique',
    instructorBio: "Équipe pédagogique MSP — conseillers et inspecteurs de l'enseignement.",
    pricing: 'partial',
    price: 500,
    objectives: [
      "Comprendre les fondements de l'APC",
      "Rédiger une situation d'apprentissage pertinente",
      'Conduire une séance centrée sur l\'élève',
      'Évaluer et remédier par compétences',
    ],
    modules: [
      {
        id: 'apc-m1',
        title: "Module 1 — Les fondements de l'APC",
        lessons: [
          { id: 'apc-l1', title: "Qu'est-ce que l'APC ?", type: 'text', durationMin: 8, free: true,
            content: "L'Approche Par Compétences place l'élève en situation de mobiliser des savoirs, "
              + "savoir-faire et savoir-être pour résoudre un problème réel.\n\nContrairement à une "
              + "pédagogie centrée sur la transmission de contenus, l'APC vise une COMPÉTENCE : un "
              + "pouvoir d'agir efficace face à une famille de situations.\n\nAu Bénin, les programmes "
              + "sont organisés en champs de formation et en compétences disciplinaires et "
              + "transversales." },
          { id: 'apc-l2', title: 'Vidéo : une séance APC filmée', type: 'video', durationMin: 12, free: true,
            youtubeUrl: 'https://www.youtube.com/watch?v=2Xc9gXyf2G4' },
          { id: 'apc-l3', title: 'Quiz — les bases', type: 'quiz', durationMin: 5,
            quiz: [
              { id: 'apc-q1', question: "Que vise en priorité l'APC ?",
                options: ['La mémorisation de leçons', 'Le développement de compétences', 'La rapidité de correction', 'Le silence en classe'],
                correctIndex: 1, explanation: "L'APC développe un pouvoir d'agir : la compétence." },
              { id: 'apc-q2', question: "Une compétence se démontre surtout…",
                options: ['En récitant', 'En situation de résolution de problème', 'En copiant le tableau', 'En restant assis'],
                correctIndex: 1 },
            ] },
        ],
      },
      {
        id: 'apc-m2',
        title: 'Module 2 — Concevoir et évaluer',
        lessons: [
          { id: 'apc-l4', title: "Rédiger une situation d'apprentissage", type: 'text', durationMin: 10,
            content: "Une bonne situation d'apprentissage comporte un contexte, une tâche et une "
              + "consigne claire. Elle doit être signifiante pour l'élève et permettre la mobilisation "
              + "de plusieurs ressources.\n\nExemple : « Ton petit frère gaspille l'eau à la maison. "
              + "Rédige une affiche pour l'inviter à économiser l'eau. »" },
          { id: 'apc-l5', title: 'Évaluer par compétences', type: 'text', durationMin: 9,
            content: "L'évaluation par compétences s'appuie sur des critères et des indicateurs "
              + "observables. On distingue l'évaluation formative (pour apprendre) de l'évaluation "
              + "certificative (pour attester)." },
          { id: 'apc-l6', title: 'Quiz final', type: 'quiz', durationMin: 6,
            quiz: [
              { id: 'apc-q3', question: "Que contient une situation d'apprentissage ?",
                options: ['Uniquement une consigne', 'Un contexte, une tâche et une consigne', 'Une simple question de cours', 'Une note sur 20'],
                correctIndex: 1 },
              { id: 'apc-q4', question: "L'évaluation formative sert surtout à…",
                options: ['Classer les élèves', 'Aider l\'élève à progresser', 'Remplir le bulletin', 'Sanctionner'],
                correctIndex: 1 },
            ] },
        ],
      },
    ],
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-gestion',
    title: 'Gérer une classe nombreuse avec sérénité',
    subtitle: 'Techniques concrètes de gestion de classe et de discipline positive',
    description:
      "Des stratégies éprouvées pour instaurer un climat de classe propice aux apprentissages, "
      + "même avec de grands effectifs : règles, routines, gestion des conflits et motivation.",
    category: 'Gestion de classe',
    level: 'Débutant',
    language: 'Français',
    emoji: '🧑‍🏫',
    color: 'blue',
    instructorName: 'Master Soutien Pédagogique',
    instructorBio: "Équipe pédagogique MSP.",
    pricing: 'free',
    price: 0,
    objectives: [
      'Installer des règles et des routines efficaces',
      'Prévenir et gérer les comportements difficiles',
      'Maintenir la motivation des élèves',
    ],
    modules: [
      {
        id: 'gc-m1',
        title: 'Module 1 — Poser le cadre',
        lessons: [
          { id: 'gc-l1', title: 'Règles et routines', type: 'text', durationMin: 7,
            content: "Trois à cinq règles positives, affichées et co-construites avec les élèves, "
              + "valent mieux qu'une longue liste d'interdits. Les routines (entrée en classe, "
              + "distribution du matériel) font gagner un temps précieux." },
          { id: 'gc-l2', title: 'La discipline positive', type: 'text', durationMin: 8,
            content: "Valoriser les comportements attendus, encourager, et réagir avec calme et "
              + "constance. La sanction, quand elle est nécessaire, doit être juste, comprise et "
              + "réparatrice." },
          { id: 'gc-l3', title: 'Quiz', type: 'quiz', durationMin: 4,
            quiz: [
              { id: 'gc-q1', question: 'Combien de règles positives sont recommandées ?',
                options: ['Plus de 20', 'Aucune', '3 à 5 règles claires', 'Une seule interdiction'],
                correctIndex: 2 },
            ] },
        ],
      },
    ],
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-num',
    title: 'Le numérique au service de vos cours',
    subtitle: 'Créer des supports, évaluer et communiquer avec des outils simples',
    description:
      "Découvrez comment des outils numériques accessibles (dont Master Soutien Pédagogique) "
      + "peuvent alléger votre charge : bulletins, fiches, quiz, communication avec les parents.",
    category: 'Numérique éducatif',
    level: 'Débutant',
    language: 'Français',
    emoji: '💻',
    color: 'purple',
    instructorName: 'Master Soutien Pédagogique',
    instructorBio: "Équipe pédagogique MSP.",
    pricing: 'paid',
    price: 1000,
    objectives: [
      'Produire des documents pédagogiques rapidement',
      'Créer des évaluations et quiz',
      'Communiquer efficacement avec les familles',
    ],
    modules: [
      {
        id: 'num-m1',
        title: 'Module 1 — Prendre en main les outils',
        lessons: [
          { id: 'num-l1', title: 'Panorama des outils utiles', type: 'text', durationMin: 6, free: true,
            content: "Un traitement de texte, un tableur, un lecteur PDF et une application métier "
              + "comme MSP couvrent l'essentiel des besoins d'un enseignant." },
          { id: 'num-l2', title: 'Vidéo : gagner du temps sur les bulletins', type: 'video', durationMin: 10,
            youtubeUrl: 'https://www.youtube.com/watch?v=2Xc9gXyf2G4' },
        ],
      },
    ],
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
