/**
 * Moteur d'ENTRETIEN IA LOCAL (v37).
 *
 * Reproduit le comportement conversationnel d'un assistant type ChatGPT /
 * Claude / Gemini / Copilot : l'assistant pose des questions une par une,
 * réagit à chaque réponse, adapte les questions suivantes au contexte
 * (niveau, matière, type de production) puis récapitule avant de produire.
 *
 * 100 % hors-ligne : aucune requête réseau, aucune clé API.
 */

import type { GenerationKind, LessonPromptInput, PedagogicalStandard } from './aiLessonGenerator';

export type InterviewMission = 'fiche' | 'notion';

export interface InterviewQuestion {
  id: string;
  /** Question posée par l'assistant. */
  text: string;
  /** Précision / exemple affiché sous la question. */
  hint?: string;
  /** Réponses rapides proposées (l'utilisateur peut toujours écrire librement). */
  chips: string[];
  /** Question facultative : le bouton « Passer » est proposé. */
  optional: boolean;
  /** Champ libre attendu plutôt qu'un choix. */
  free: boolean;
}

export type InterviewAnswers = Record<string, string>;

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Niveau très jeune : maternelle, CI, CP. */
export function isEarlyLevel(niveau: string): boolean {
  const n = norm(niveau);
  return /maternelle|petite section|moyenne section|grande section|creche|\bci\b|\bcp\b/.test(n);
}

/** Matière à dominante scientifique / expérimentale. */
export function isScienceSubject(matiere: string): boolean {
  const m = norm(matiere);
  return /math|science|est\b|\bes\b|svt|physique|chimie|technolog|informatique|biolog/.test(m);
}

/** Matière à dominante langue / lecture / écriture. */
export function isLanguageSubject(matiere: string): boolean {
  const m = norm(matiere);
  return /franc|lecture|dictee|expression|comprehension|anglais|langue|langage|graphisme|ecriture|recitation|poesie|grammaire|conjug|orthograph|vocabulaire|philo|litter/.test(m);
}

const KIND_CHIPS = ['Une fiche pédagogique', 'Des exercices avec corrigés', 'Un cours à mettre en ligne'];

export function kindFromAnswer(v: string): GenerationKind {
  const n = norm(v);
  if (n.includes('exercice') || n.includes('corrig') || n.includes('devoir')) return 'exercices';
  if (n.includes('ligne') || n.includes('numerique') || n.includes('cours en ligne')) return 'cours_en_ligne';
  return 'fiche';
}

export function standardFromAnswer(v: string): PedagogicalStandard {
  const n = norm(v);
  if (n.includes('ppo') || n.includes('objectif')) return 'PPO';
  if (n.includes('bloom')) return 'BLOOM';
  if (n.includes('different') || n.includes('remediation')) return 'DIFFERENCIATION';
  if (n.includes('inclusi') || n.includes('cua')) return 'UNIVERSAL_DESIGN';
  if (n.includes('tache complexe')) return 'COMPETENCE';
  return 'APC_BENIN';
}

/* ------------------------------------------------------------------ */
/* Banque de questions                                                 */
/* ------------------------------------------------------------------ */

type QuestionBuilder = (a: InterviewAnswers) => InterviewQuestion | null;

const BUILDERS: QuestionBuilder[] = [
  // 1. Type de production
  () => ({
    id: 'kind',
    text: 'Bonjour ! Je suis l’agent pédagogique Master Soutien Pédagogique. Je vais vous poser quelques questions pour préparer une fiche réellement adaptée à votre classe. Pour commencer : que souhaitez-vous préparer aujourd’hui ?',
    hint: 'Choisissez une proposition ou écrivez votre besoin avec vos mots.',
    chips: KIND_CHIPS,
    optional: false,
    free: false,
  }),

  // 2. Niveau
  () => ({
    id: 'niveau',
    text: 'Très bien. Pour quelle classe travaillez-vous ?',
    hint: 'Indiquez le niveau exact : cela change complètement la démarche proposée.',
    chips: ['Maternelle (GS)', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
    optional: false,
    free: false,
  }),

  // 3. Matière
  (a) => ({
    id: 'matiere',
    text: `Quelle matière enseignez-vous en ${a.niveau || 'cette classe'} pour cette séance ?`,
    chips: isEarlyLevel(a.niveau || '')
      ? ['Langage', 'Graphisme / Écriture', 'Mathématiques', 'Éducation Artistique (EA)', 'Éducation Sensorielle', 'Éducation Scientifique (ES)']
      : ['Mathématiques', 'Lecture', 'Dictée', 'Expression écrite', 'Compréhension de l’écrit', 'EST', 'ES', 'Histoire-Géographie', 'Anglais', 'SVT', 'Physique-Chimie', 'EPS'],
    optional: false,
    free: false,
  }),

  // 4. Thème
  (a) => ({
    id: 'theme',
    text: `Parfait. Quel est le thème ou le titre exact de la leçon en ${a.matiere || 'cette matière'} ?`,
    hint: 'Soyez précis : « Addition avec retenue » donnera un bien meilleur résultat que « calcul ».',
    chips: [],
    optional: false,
    free: true,
  }),

  // 5. Durée
  (a) => ({
    id: 'duree',
    text: `Combien de temps dure la séance consacrée à « ${a.theme || 'cette leçon'} » ?`,
    chips: isEarlyLevel(a.niveau || '')
      ? ['20 min', '25 min', '30 min', '45 min']
      : ['30 min', '45 min', '55 min', '1 h', '2 h'],
    optional: false,
    free: false,
  }),

  // 6. Effectif
  () => ({
    id: 'effectif',
    text: 'Combien d’apprenants avez-vous dans la classe ? Cela me permet d’adapter le travail de groupe et la gestion du temps.',
    chips: ['Moins de 30', '30 à 50', '50 à 70', 'Plus de 70'],
    optional: true,
    free: false,
  }),

  // 7. Matériel
  () => ({
    id: 'materiel',
    text: 'De quel matériel disposez-vous réellement pour cette séance ?',
    hint: 'Je n’inscrirai dans la fiche que ce que vous avez sous la main.',
    chips: ['Tableau et craie uniquement', 'Ardoises', 'Manuel de l’apprenant', 'Objets du milieu (cailloux, capsules, bâtonnets)', 'Affiches / images', 'Matériel d’expérience', 'Vidéoprojecteur / tablette'],
    optional: true,
    free: false,
  }),

  // 8. Prérequis
  (a) => ({
    id: 'prerequis',
    text: `Que savent déjà vos apprenants à propos de « ${a.theme || 'ce thème'} » ?`,
    hint: 'Les prérequis me servent à construire le rappel du début de séance.',
    chips: ['Ils découvrent totalement la notion', 'Ils ont vu la notion l’an dernier', 'Ils maîtrisent les bases mais pas les cas difficiles', 'Je ne sais pas encore'],
    optional: true,
    free: false,
  }),

  // 9. Obstacle
  (a) => ({
    id: 'obstacle',
    text: `D’après votre expérience, quelle est la principale difficulté des apprenants sur « ${a.theme || 'cette leçon'} » ?`,
    hint: 'Je bâtirai la remédiation autour de cet obstacle précis.',
    chips: isScienceSubject(a.matiere || '')
      ? ['Ils confondent les notions proches', 'Ils appliquent la technique sans comprendre', 'Ils ne savent pas rédiger la démarche', 'Ils se découragent vite']
      : ['Ils comprennent mal la consigne', 'Ils ont un vocabulaire trop pauvre', 'Ils font beaucoup de fautes', 'Ils participent peu à l’oral'],
    optional: true,
    free: false,
  }),

  // 10. Ancrage local
  () => ({
    id: 'contexte',
    text: 'Souhaitez-vous ancrer la situation de départ dans une réalité locale ? Laquelle ?',
    hint: 'Une situation familière augmente beaucoup la motivation des apprenants.',
    chips: ['Le marché du quartier', 'Le champ / la récolte', 'La cour de récréation', 'La maison et la famille', 'La circulation et la route', 'La santé et l’hygiène', 'Aucune en particulier'],
    optional: true,
    free: false,
  }),

  // 11. Question conditionnelle : petits niveaux
  (a) => (isEarlyLevel(a.niveau || '')
    ? {
        id: 'oral',
        text: 'Vos apprenants sont jeunes : sur quoi doit reposer principalement la séance ?',
        chips: ['Le jeu et la manipulation', 'La chanson et la comptine', 'L’observation d’images', 'Le langage oral guidé'],
        optional: true,
        free: false,
      }
    : null),

  // 12. Question conditionnelle : sciences
  (a) => (!isEarlyLevel(a.niveau || '') && isScienceSubject(a.matiere || '')
    ? {
        id: 'experience',
        text: 'Pouvez-vous réaliser une manipulation ou une expérience en classe ?',
        chips: ['Oui, avec du matériel simple', 'Oui, une démonstration au bureau', 'Non, seulement des schémas', 'Non, uniquement du calcul'],
        optional: true,
        free: false,
      }
    : null),

  // 13. Question conditionnelle : langues
  (a) => (isLanguageSubject(a.matiere || '')
    ? {
        id: 'support_texte',
        text: 'Sur quel support de langue allez-vous travailler ?',
        chips: ['Un texte du manuel', 'Un texte que je rédige moi-même', 'Une image / une affiche', 'Un récit oral ou un conte'],
        optional: true,
        free: false,
      }
    : null),

  // 14. Question conditionnelle : exercices
  (a) => (kindFromAnswer(a.kind || '') === 'exercices'
    ? {
        id: 'volume_exercices',
        text: 'Combien d’exercices souhaitez-vous, et pour quel usage ?',
        chips: ['3 exercices gradués', '5 exercices gradués', 'Un devoir surveillé noté sur 20', 'Des exercices de remédiation uniquement'],
        optional: true,
        free: false,
      }
    : null),

  // 15. Question conditionnelle : cours en ligne
  (a) => (kindFromAnswer(a.kind || '') === 'cours_en_ligne'
    ? {
        id: 'support_numerique',
        text: 'Comment vos apprenants suivront-ils ce cours en ligne ?',
        chips: ['Sur téléphone, hors connexion', 'Sur téléphone avec connexion', 'En salle informatique', 'Document imprimé remis à la maison'],
        optional: true,
        free: false,
      }
    : null),

  // 16. Évaluation
  () => ({
    id: 'evaluation',
    text: 'Comment souhaitez-vous évaluer les apprenants à la fin de la séance ?',
    chips: ['Évaluation formative rapide (ardoises)', 'Exercice écrit noté sur 10', 'Devoir noté sur 20', 'Observation et grille de critères', 'Auto-évaluation par les apprenants'],
    optional: true,
    free: false,
  }),

  // 17. Différenciation
  () => ({
    id: 'differenciation',
    text: 'Avez-vous des apprenants qui nécessitent une attention particulière ?',
    chips: ['Oui, des apprenants en grande difficulté', 'Oui, des apprenants très rapides à occuper', 'Oui, un apprenant en situation de handicap', 'Non, groupe assez homogène'],
    optional: true,
    free: false,
  }),

  // 18. Norme
  () => ({
    id: 'standard',
    text: 'Dernière précision technique : quelle norme pédagogique dois-je respecter ?',
    chips: ['APC Bénin', 'PPO', 'Approche par compétences (tâche complexe)', 'Différenciation', 'Taxonomie de Bloom', 'Inclusion / CUA'],
    optional: true,
    free: false,
  }),

  // 19. Mot de la fin
  () => ({
    id: 'consignes',
    text: 'Souhaitez-vous ajouter une exigence particulière avant que je rédige ?',
    hint: 'Par exemple : « prévoir une trace écrite courte », « intégrer le fon », « séance en plein air ».',
    chips: ['Non, vous avez tout', 'Prévoir une trace écrite courte', 'Prévoir un travail de groupe', 'Prévoir un devoir de maison'],
    optional: true,
    free: true,
  }),
];

/** Renvoie la prochaine question à poser, ou null si l'entretien est terminé. */
export function nextQuestion(answers: InterviewAnswers): InterviewQuestion | null {
  for (const build of BUILDERS) {
    const q = build(answers);
    if (q && answers[q.id] === undefined) return q;
  }
  return null;
}

/** Nombre de questions déjà traitées et total estimé pour la barre de progression. */
export function interviewProgress(answers: InterviewAnswers): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const build of BUILDERS) {
    const q = build(answers);
    if (!q) continue;
    total += 1;
    if (answers[q.id] !== undefined) done += 1;
  }
  return { done, total: Math.max(total, done) };
}

/** Réaction naturelle de l'assistant après une réponse (effet conversationnel). */
export function acknowledge(questionId: string, value: string, answers: InterviewAnswers): string {
  const skipped = value === '';
  if (skipped) return 'Pas de souci, je m’appuierai sur les pratiques courantes pour ce point.';
  const n = norm(value);
  switch (questionId) {
    case 'kind':
      return `Entendu : ${norm(value).includes('exercice') ? 'des exercices avec corrigés' : norm(value).includes('ligne') ? 'un cours à mettre en ligne' : 'une fiche pédagogique complète'}.`;
    case 'niveau':
      return isEarlyLevel(value)
        ? `${value}, donc une séance courte, très concrète, fondée sur le jeu et la manipulation. Je note.`
        : `${value}, très bien.`;
    case 'matiere':
      return isScienceSubject(value)
        ? 'Une matière scientifique : je prévoirai une démarche d’investigation (hypothèse, vérification, conclusion).'
        : isLanguageSubject(value)
          ? 'Une matière de langue : je soignerai le travail sur le sens, le vocabulaire et la production.'
          : 'Parfait, je note.';
    case 'theme':
      return `« ${value} » : bon thème, je vais le décliner en activités précises.`;
    case 'duree':
      return `${value}, je répartirai les phases pour tenir exactement dans ce temps.`;
    case 'effectif':
      return n.includes('70') || n.includes('50')
        ? 'Effectif chargé : je privilégierai le travail par groupes et l’usage des ardoises pour contrôler tout le monde rapidement.'
        : 'Bien noté, cet effectif permet un suivi individualisé.';
    case 'materiel':
      return n.includes('tableau et craie')
        ? 'Je bâtirai donc une séance qui ne suppose aucun matériel coûteux.'
        : 'Très bien, j’intégrerai ce matériel dans la fiche.';
    case 'obstacle':
      return 'Merci, c’est une information précieuse : la remédiation ciblera exactement cette difficulté.';
    case 'contexte':
      return n.includes('aucune')
        ? 'D’accord, je resterai sur une situation scolaire neutre.'
        : `Excellent, la situation de départ partira de ${value.toLowerCase()}.`;
    case 'differenciation':
      return n.startsWith('non')
        ? 'Bien, je prévoirai tout de même une activité de soutien et une activité d’approfondissement.'
        : 'Compris, je prévoirai des adaptations explicites dans le déroulement.';
    case 'consignes':
      return n.startsWith('non') ? 'Parfait. Je rédige votre document.' : 'C’est noté, j’en tiens compte.';
    default:
      return answers.theme ? 'Très bien, je continue.' : 'Noté.';
  }
}

/** Récapitulatif lisible affiché avant la génération. */
export function interviewRecap(answers: InterviewAnswers): { label: string; value: string }[] {
  const LABELS: Record<string, string> = {
    kind: 'Production',
    niveau: 'Classe',
    matiere: 'Matière',
    theme: 'Thème',
    duree: 'Durée',
    effectif: 'Effectif',
    materiel: 'Matériel',
    prerequis: 'Prérequis',
    obstacle: 'Difficulté visée',
    contexte: 'Ancrage local',
    oral: 'Appui principal',
    experience: 'Manipulation',
    support_texte: 'Support de langue',
    volume_exercices: 'Volume d’exercices',
    support_numerique: 'Diffusion',
    evaluation: 'Évaluation',
    differenciation: 'Différenciation',
    standard: 'Norme',
    consignes: 'Exigence particulière',
  };
  return Object.keys(LABELS)
    .filter((k) => answers[k])
    .map((k) => ({ label: LABELS[k], value: answers[k] }));
}

/** Transforme les réponses de l'entretien en entrée pour le moteur de génération. */
export function answersToPromptInput(answers: InterviewAnswers): LessonPromptInput {
  const consignes = interviewRecap(answers)
    .filter((r) => !['Production', 'Classe', 'Matière', 'Thème', 'Durée', 'Norme'].includes(r.label))
    .map((r) => `${r.label} : ${r.value}`)
    .join(' | ');
  return {
    niveau: answers.niveau || '',
    matiere: answers.matiere || '',
    theme: answers.theme || '',
    duree: answers.duree || '45 min',
    objectif: answers.theme ? `À la fin de la séance, l’apprenant doit être capable de mobiliser correctement la notion « ${answers.theme} ».` : '',
    consignes,
    generationKind: kindFromAnswer(answers.kind || ''),
    standard: standardFromAnswer(answers.standard || ''),
  };
}
