/**
 * LE GUIDE DE L'UTILISATEUR (v58, rubriques complétées en v64/v65).
 *
 * Deux sous-modules :
 *  ① « Le manuel de l'abonné » : le mode d'emploi complet, consultable
 *     hors connexion et imprimable ;
 *  ② « Tutoriels Master Soutien Pédagogique » : des vidéos YouTube
 *     publiées par l'équipe d'administration, regardées DANS
 *     l'application.
 *
 * ── POURQUOI LIRE LES VIDÉOS DANS L'APPLICATION ? ────────────────────
 * L'exigence est que la vidéo soit vue « uniquement sur l'application ».
 * On l'obtient en intégrant le lecteur YouTube en mode confidentialité
 * renforcée (`youtube-nocookie.com`), avec les suggestions de fin
 * limitées à la même chaîne et sans lien de partage. Aucune redirection
 * vers l'application YouTube n'est proposée.
 *
 * ⚠️ HONNÊTETÉ TECHNIQUE : une vidéo YouTube reste hébergée par YouTube.
 * Un spectateur déterminé peut toujours retrouver l'adresse d'origine.
 * Ce module empêche la sortie *depuis l'application*, il ne rend pas la
 * vidéo secrète. Pour un contenu réellement confidentiel, il faudrait
 * des vidéos « non répertoriées » — c'est le réglage recommandé à
 * l'équipe d'administration, et il est rappelé dans l'écran.
 *
 * ── HORS LIGNE ───────────────────────────────────────────────────────
 * Le manuel fonctionne sans connexion. Les tutoriels, eux, sont des
 * vidéos en ligne : l'écran l'annonce clairement au lieu d'afficher un
 * cadre vide quand le réseau manque.
 */

import { normalizeSearch } from './textSearch';

export const TUTORIALS_KEY = 'msp_tutorials';

/** Rubriques de classement, alignées sur les chapitres du manuel. */
export const TUTORIAL_CATEGORIES = [
  'Premiers pas',
  'La classe au quotidien',
  'Les documents de l’élève',
  'Préparation de classe',
  'Registres officiels',
  'Ma vie scolaire',
  'Cantine scolaire',
  'Gestion financière',
  'Ressources et savoirs',
  'Outils du quotidien',
  'Espace parents',
  'Administration',
  'Espace École',
  'Français et Anglais au primaire',
] as const;

export type TutorialCategory = typeof TUTORIAL_CATEGORIES[number];

export interface Tutorial {
  id: string;
  title: string;
  /** Identifiant YouTube à 11 caractères, extrait du lien fourni. */
  videoId: string;
  category: string;
  description?: string;
  /** Durée annoncée, ex. « 4 min ». Purement indicatif. */
  duration?: string;
  /** Publié par l'équipe d'administration : visible des abonnés. */
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Extrait l'identifiant d'une vidéo YouTube.
 *
 * L'équipe d'administration colle un lien tel qu'il apparaît dans son
 * navigateur : toutes les formes usuelles sont acceptées, y compris les
 * liens de partage mobile et les Shorts. Exiger un format unique serait
 * une source d'erreurs inutile.
 *
 * Renvoie `null` si le lien n'est pas reconnu — on refuse alors
 * l'enregistrement plutôt que de créer un tutoriel illisible.
 */
export function extractVideoId(input: string): string | null {
  const v = (input || '').trim();
  if (!v) return null;

  // L'identifiant seul, collé directement.
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;

  const motifs = [
    /[?&]v=([A-Za-z0-9_-]{11})/,          // youtube.com/watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/,      // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/,        // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/,       // /shorts/ID
    /\/live\/([A-Za-z0-9_-]{11})/,         // /live/ID
    /\/v\/([A-Za-z0-9_-]{11})/,            // /v/ID (ancien)
  ];
  for (const m of motifs) {
    const r = m.exec(v);
    if (r) return r[1];
  }
  return null;
}

/**
 * Adresse du lecteur intégré.
 *
 * - `youtube-nocookie.com` : pas de traceur tant que la vidéo n'est pas lue ;
 * - `rel=0`   : les suggestions de fin restent sur la même chaîne ;
 * - `modestbranding=1` : logo YouTube discret ;
 * - `playsinline=1` : la vidéo reste dans l'application sur iPhone, au
 *   lieu de basculer en plein écran système.
 */
export function embedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`
    + '?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
}

/** Vignette de la vidéo, affichée avant lecture. */
export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function loadTutorials(): Tutorial[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TUTORIALS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveTutorials(list: Tutorial[]): void {
  try { localStorage.setItem(TUTORIALS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/**
 * Enregistre un tutoriel.
 * Deux tutoriels ne peuvent pas pointer vers la même vidéo : un doublon
 * remplace l'entrée existante au lieu d'encombrer la liste.
 */
export function saveTutorial(t: Tutorial): Tutorial[] {
  const all = loadTutorials();
  const clean = { ...t, updatedAt: Date.now() };
  const parId = all.findIndex((x) => x.id === clean.id);
  const parVideo = all.findIndex((x) => x.videoId === clean.videoId && x.id !== clean.id);

  if (parId >= 0) all[parId] = clean;
  else if (parVideo >= 0) all[parVideo] = { ...clean, id: all[parVideo].id };
  else all.unshift(clean);

  saveTutorials(all);
  return all;
}

export function deleteTutorial(id: string): Tutorial[] {
  const rest = loadTutorials().filter((t) => t.id !== id);
  saveTutorials(rest);
  return rest;
}

/** Tutoriels visibles par l'abonné : uniquement ceux qui sont publiés. */
export function publishedTutorials(): Tutorial[] {
  return loadTutorials().filter((t) => t.published);
}

/** Regroupe par rubrique, en respectant l'ordre des chapitres du manuel. */
export function groupByCategory(list: Tutorial[]): { category: string; items: Tutorial[] }[] {
  const map = new Map<string, Tutorial[]>();
  for (const t of list) {
    const c = t.category || 'Autres';
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(t);
  }
  const ordre = [...TUTORIAL_CATEGORIES] as string[];
  return [...map.entries()]
    .sort((a, b) => {
      const ia = ordre.indexOf(a[0]);
      const ib = ordre.indexOf(b[0]);
      // Une rubrique hors liste passe à la fin, jamais au milieu.
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    })
    .map(([category, items]) => ({ category, items }));
}

/**
 * Recherche sur le titre, la rubrique et la description.
 * Insensible aux accents (v58) : « eleve » doit trouver « élève ».
 */
export function searchTutorials(list: Tutorial[], query: string): Tutorial[] {
  const q = normalizeSearch(query);
  if (!q) return list;
  return list.filter((t) =>
    normalizeSearch(`${t.title} ${t.category} ${t.description || ''}`).includes(q));
}

/**
 * Compteur d'unicité.
 *
 * ⚠️ `Date.now()` seul ne suffit PAS : deux tutoriels enregistrés dans la
 * même milliseconde — ce qui arrive lors d'un ajout rapide ou d'un import
 * en série — recevraient le même identifiant, et le second écraserait le
 * premier. Le compteur garantit l'unicité même à la milliseconde près.
 */
let compteur = 0;

export function newTutorial(): Tutorial {
  const now = Date.now();
  compteur += 1;
  return {
    id: `tuto-${now}-${compteur}`,
    title: '',
    videoId: '',
    category: TUTORIAL_CATEGORIES[0],
    description: '',
    duration: '',
    published: true,
    createdAt: now,
    updatedAt: now,
  };
}
