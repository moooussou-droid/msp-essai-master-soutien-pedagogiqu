/**
 * « Cultivons-nous » — Cours des administrateurs (v25)
 * -----------------------------------------------------
 * Rubriques de formation à l'attention des utilisateurs :
 *   - Pédagogie Générale
 *   - Législation de l'Administration Scolaire
 *   - Morale Professionnelle
 *   - Épreuves et Corrigés
 *
 * Chaque cours précise le NOM DE L'AUTEUR, peut être GRATUIT ou PAYANT
 * (prix en FCFA), et enregistre son NOMBRE DE VISITEURS — visible par les
 * administrateurs. Stockage local (hors-ligne).
 */

export type AdminRubricId = 'pedagogie' | 'legislation' | 'morale' | 'epreuves';

export interface AdminRubric {
  id: AdminRubricId;
  label: string;
  emoji: string;
  desc: string;
}

/** Les 4 rubriques officielles du sous-module Cultivons-nous. */
export const ADMIN_RUBRICS: AdminRubric[] = [
  { id: 'pedagogie', label: 'Pédagogie Générale', emoji: '🎓', desc: 'Méthodes, didactique, APC, gestion de classe' },
  { id: 'legislation', label: 'Législation de l’Administration Scolaire', emoji: '⚖️', desc: 'Textes officiels, arrêtés, statuts, circulaires' },
  { id: 'morale', label: 'Morale Professionnelle', emoji: '🤝', desc: 'Éthique, déontologie, posture de l’enseignant' },
  { id: 'epreuves', label: 'Épreuves et Corrigés', emoji: '📝', desc: 'CEP, BEPC, BAC : sujets types et corrigés' },
];

export function adminRubricLabel(id: AdminRubricId): string {
  return ADMIN_RUBRICS.find((r) => r.id === id)?.label ?? id;
}

export interface CultivonsCourse {
  id: string;
  rubric: AdminRubricId;
  title: string;
  /** Nom de l'auteur du cours (obligatoire, affiché aux utilisateurs). */
  author: string;
  /** Contenu du cours (leçon rédigée). */
  content: string;
  /** true = gratuit, false = payant (voir price). */
  free: boolean;
  /** Prix en FCFA si payant. */
  price: number;
  /** Nombre de visiteurs du cours (incrémenté à chaque ouverture). */
  views: number;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'msp_cultivons_courses_v1';

/** Cours de démonstration fournis avec le module (un par rubrique). */
const SEED_COURSES: CultivonsCourse[] = [
  {
    id: 'cours-pedagogie-1',
    rubric: 'pedagogie',
    title: 'La pédagogie de la réussite en classe',
    author: 'Dr HOUNSOU Paul, Inspecteur de l’Enseignement Primaire',
    content:
      'La pédagogie de la réussite part d’un principe simple : chaque élève peut progresser si l’enseignant adapte son enseignement à son rythme.\n\n' +
      '1. CONNAÎTRE SES ÉLÈVES : relever les acquis et les difficultés de chacun dès le début de l’année ;\n' +
      '2. OBJECTIFS CLAIRS : annoncer ce que l’élève doit savoir et savoir faire à la fin de la leçon ;\n' +
      '3. ACTIVITÉS VARIÉES : travail individuel, par groupes, jeux pédagogiques, exercices différenciés ;\n' +
      '4. ÉVALUATION FORMATIVE : corriger avec l’élève, valoriser les progrès, remédier sans humilier ;\n' +
      '5. ENCOURAGEMENT : la confiance en soi est le premier moteur des apprentissages.\n\n' +
      'En classe, on retiendra la règle d’or : « chaque erreur est une information sur ce qu’il reste à enseigner ».',
    free: true,
    price: 0,
    views: 0,
    createdAt: 1750000000000,
    updatedAt: 1750000000000,
  },
  {
    id: 'cours-legislation-1',
    rubric: 'legislation',
    title: 'Textes essentiels de l’administration scolaire au Bénin',
    author: 'M. AGOSSOU Marcel, Administrateur scolaire',
    content:
      'L’administration scolaire béninoise repose sur quelques textes fondamentaux que tout enseignant doit connaître :\n\n' +
      '• LA LOI 2003-17 portant orientation de l’éducation nationale, qui fixe les finalités du système éducatif ;\n' +
      '• LE DÉCRET portant statut du personnel enseignant : droits, obligations et carrière ;\n' +
      '• LES ARRÊTÉS sur l’organisation de l’année scolaire : calendrier, évaluations, examens ;\n' +
      '• LES CIRCULAIRES ministérielles : directives annuelles sur les programmes et les examens.\n\n' +
      'En cas de doute sur une procédure, l’enseignant consulte d’abord la circulaire en vigueur, puis sa direction départementale, et enfin le ministère.',
    free: false,
    price: 1500,
    views: 0,
    createdAt: 1750000000000,
    updatedAt: 1750000000000,
  },
  {
    id: 'cours-morale-1',
    rubric: 'morale',
    title: 'Éthique et déontologie du métier d’enseignant',
    author: 'Mme DOSSOU Marie, Formatrice des enseignants',
    content:
      'La morale professionnelle de l’enseignant se résume en quelques engagements :\n\n' +
      '1. PONCTUALITÉ : être présent à l’école et dans sa classe à l’heure ;\n' +
      '2. IMPARTIALITÉ : traiter tous les élèves avec la même attention, sans favoritisme ;\n' +
      '3. INTÉGRITÉ : refuser toute forme de corruption (notes, attestations, avantages) ;\n' +
      '4. DISCRÉTION : respecter la vie privée des élèves et de leurs familles ;\n' +
      '5. EXEMPLARITÉ : être un modèle de langage, de tenue et de comportement.\n\n' +
      'L’enseignant est un éducateur : son rôle dépasse l’instruction, il forme des citoyens responsables.',
    free: true,
    price: 0,
    views: 0,
    createdAt: 1750000000000,
    updatedAt: 1750000000000,
  },
  {
    id: 'cours-epreuves-1',
    rubric: 'epreuves',
    title: 'Épreuves du CEP : sujets types et corrigés',
    author: 'M. KOSSOU Jean, Instituteur principal, membre de jury de CEP',
    content:
      'Ce cours présente la structure des épreuves du Certificat d’Études Primaires et des corrigés commentés.\n\n' +
      '1. FRANÇAIS : dictée (10 points), questions de compréhension (5 points), expression écrite (5 points) ;\n' +
      '2. MATHÉMATIQUES : problèmes et exercices notés sur 20 ;\n' +
      '3. CULTURE GÉNÉRALE : questions sur le Bénin, l’Afrique, la santé et l’environnement.\n\n' +
      'Méthode de correction : vérifier chaque étape du raisonnement, accorder les points par étapes, puis\n' +
      'harmoniser en jury. Les sujets types et les grilles de correction sont joints au cours.',
    free: false,
    price: 2000,
    views: 0,
    createdAt: 1750000000000,
    updatedAt: 1750000000000,
  },
];

function safeParse(raw: string | null): CultivonsCourse[] | null {
  try {
    const data = JSON.parse(raw || 'null');
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Chargement des cours (avec fusion des cours de démonstration si jamais vides). */
export function loadCultivonsCourses(): CultivonsCourse[] {
  try {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.length > 0) return stored;
    saveCultivonsCourses(SEED_COURSES);
    return [...SEED_COURSES];
  } catch {
    return [...SEED_COURSES];
  }
}

export function saveCultivonsCourses(courses: CultivonsCourse[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch {
    /* stockage plein : on ignore */
  }
}

/** Incrémente le compteur de visiteurs d'un cours (retourne la nouvelle valeur). */
export function incrementCourseView(id: string): number {
  const courses = loadCultivonsCourses();
  const updated = courses.map((c) =>
    c.id === id ? { ...c, views: (c.views ?? 0) + 1, updatedAt: Date.now() } : c
  );
  saveCultivonsCourses(updated);
  const found = updated.find((c) => c.id === id);
  return found?.views ?? 0;
}

/** Statistiques pour les administrateurs : visites par cours + totaux. */
export function getCultivonsStats(courses: CultivonsCourse[]) {
  const totalViews = courses.reduce((s, c) => s + (c.views ?? 0), 0);
  const byRubric = courses.reduce<Record<string, number>>((acc, c) => {
    acc[c.rubric] = (acc[c.rubric] ?? 0) + (c.views ?? 0);
    return acc;
  }, {});
  return { totalViews, byRubric, count: courses.length };
}
