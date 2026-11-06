/**
 * ABONNEMENTS — Master Soutien Pédagogique (v31, étendu en v64)
 *
 * Cinq formules annuelles :
 *  - « Essentiel » (999 FCFA/an) : l'enrôlement des élèves, l'ENRÔLEMENT DU
 *    PERSONNEL (ajouté en v36) et l'importation des notes (Excel officiel).
 *  - « Complet » (1500 FCFA/an) : toutes les fonctions pédagogiques.
 *  - « Pro » (2500 FCFA/an, v53) : Complet + les 4 MODULES DE GESTION
 *    (registres officiels, vie scolaire, boîte à outils, suivi de l'enfant).
 *  - « École — Maternelle au CM2 » (6000 FCFA/an, v64) : Pro + ESPACE ÉCOLE
 *    de l'établissement — toutes les classes du préscolaire et du primaire
 *    (Maternelle 1/2, CI, CP, CE1, CE2, CM1, CM2) dans un espace propre,
 *    avec tableau de bord consolidé de l'école.
 *  - « École — Maternelle en Terminale » (10000 FCFA/an, v64) : Pro +
 *    ESPACE ÉCOLE complet, de la Maternelle à la Terminale
 *    (collège et lycée, séries A1/A2/B/C/D inclus).
 *
 * Le plan est porté PAR LE CODE : codes Essentiel en 9, Complet en 1,
 * Pro en 2, École Primaire en 6, École Complète en 7 (toujours 6 chiffres
 * + Luhn, validés hors-ligne). L'application lit la formule directement
 * dans le code, sans serveur.
 *
 * ⚠️ AUCUN DROIT N'EST RETIRÉ AUX CODES DÉJÀ REMIS : un code « Complet »
 * conserve exactement le périmètre qu'il avait avant la v53. Les 4 modules
 * réservés sont des AJOUTS récents (v48 à v52), jamais des fonctions
 * retirées à quelqu'un qui en disposait. Même règle en v64 : l'Espace
 * École est un ajout ; les formules École incluent TOUT le Pro.
 */

export type SubscriptionPlan =
  | 'essentiel' | 'complet' | 'pro'
  | 'ecole-primaire' | 'ecole-complete';

export interface PlanInfo {
  id: SubscriptionPlan;
  /** Nom lisible affiché tel quel à l'écran (jamais l'identifiant technique). */
  name: string;
  /** Prix annuel en FCFA. */
  price: number;
  label: string;
  short: string;
  includes: string[];
  /** v64 : formule d'établissement (Espace École). */
  school?: boolean;
}

export const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  essentiel: {
    id: 'essentiel',
    name: 'Essentiel',
    price: 999,
    label: 'Essentiel — 999 FCFA / an',
    short: '999 FCFA / an',
    includes: [
      "Enrôlement intelligent des élèves (fiches d'enrôlement + liste Excel)",
      "Enrôlement du personnel (matricule, Id ANPE, IFU — export Excel officiel)",
      "Importation des notes (fichier Excel officiel, élèves + notes)",
    ],
  },
  complet: {
    id: 'complet',
    name: 'Complet',
    price: 1500,
    label: 'Complet — 1500 FCFA / an',
    short: '1500 FCFA / an',
    includes: [
      'Tout le plan Essentiel',
      'Saisie des notes, bulletins & classement',
      'Présences, statistiques, tableaux & exports',
      'Fiches APC, calendrier, encyclopédie & ressources',
      'Grammaire/Conjugaison/Orthographe et Anglais au Primaire',
      'Cantine, comptabilité, images et boîte à outils enseignant',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2500,
    label: 'Pro — 2500 FCFA / an',
    short: '2500 FCFA / an',
    includes: [
      'Tout le plan Complet',
      'Mes registres officiels (cahier journal, registre matricule)',
      'Ma vie scolaire (appel officiel, paiements, livret, conseil de classe…)',
      'Ma boîte à outils (chronomètre, calculatrice, numérisation)',
      'Suivi de votre enfant (espace parents)',
    ],
  },
  /* v64 — ABONNEMENTS ANNUELS D'ÉTABLISSEMENT (« Espace École »).
   * L'école dispose de SON espace, avec TOUTES ses classes : création
   * guidée de l'école, génération des classes du périmètre, titulaire par
   * classe, effectifs F/G et progression consolidés. Tout le Pro inclus. */
  'ecole-primaire': {
    id: 'ecole-primaire',
    name: 'École — Maternelle au CM2',
    price: 6000,
    label: 'École (Maternelle → CM2) — 6000 FCFA / an',
    short: '6000 FCFA / an',
    school: true,
    includes: [
      'Tout le plan Pro, pour l’établissement',
      'Espace propre à l’école, avec toutes ses classes',
      'Classes Maternelle 1/2 et CI → CM2 générées en un clic',
      'Tableau de bord école : effectifs F/G, notes et progression',
    ],
  },
  'ecole-complete': {
    id: 'ecole-complete',
    name: 'École — Maternelle en Terminale',
    price: 10000,
    label: 'École (Maternelle → Terminale) — 10000 FCFA / an',
    short: '10000 FCFA / an',
    school: true,
    includes: [
      'Tout le plan Pro, pour l’établissement',
      'Espace propre à l’école, avec toutes ses classes',
      'De la Maternelle à la Terminale (6ᵉ → Tle, séries A1/A2/B/C/D)',
      'Tableau de bord école par cycle : préscolaire, primaire, collège, lycée',
    ],
  },
};

/**
 * v53 — LES 4 MODULES RÉSERVÉS AU PLAN PRO (2500 FCFA/an).
 *
 * Ce sont les modules de GESTION D'ÉTABLISSEMENT, ajoutés entre la v48 et
 * la v52. Chaque entrée couvre le module ET ses sous-modules.
 *
 * ⚠️ EXCEPTION IMPORTANTE : « /suivi-enfant » (l'espace parent) reste
 * PUBLIC. Un parent n'est pas un abonné : il n'a aucun code et ne doit
 * rien payer pour consulter le dossier de son enfant. Seul l'écran
 * enseignant « /suivi-enfant/codes », qui génère les codes de
 * rattachement, relève de l'abonnement Pro.
 */
export const PRO_MODULES: { path: string; label: string }[] = [
  { path: '/registres', label: 'Mes registres officiels' },
  { path: '/cahier-journal', label: 'Cahier journal' },
  { path: '/registre-matricule', label: 'Registre matricule' },
  { path: '/vie-scolaire', label: 'Ma vie scolaire' },
  { path: '/registre-appel', label: 'Registre d’appel officiel' },
  { path: '/paiements', label: 'Paiements des élèves' },
  { path: '/livret-scolaire', label: 'Livret scolaire' },
  { path: '/manuels-materiel', label: 'Manuels et matériel' },
  { path: '/emploi-du-temps', label: 'Emploi du temps' },
  { path: '/remediation', label: 'Élèves en difficulté' },
  { path: '/sauvegarde', label: 'Sauvegarde et restauration' },
  { path: '/conseil-classe', label: 'Conseil de classe' },
  { path: '/outils', label: 'Ma boîte à outils' },
  { path: '/chronometre', label: 'Chronomètre de performances' },
  { path: '/calculatrice', label: 'Calculatrice et outils de calcul' },
  { path: '/numeriser', label: 'Numériser un document' },
  { path: '/suivi-enfant/codes', label: 'Dossier pour les parents' },
];

/**
 * Une route relève-t-elle du plan Pro ?
 *
 * On compare sur les SEGMENTS d'URL et non par simple préfixe de chaîne :
 * sans cela, « /outils-enseignant » (un écran ancien, inclus dans Complet)
 * serait capturé par la règle « /outils » et se retrouverait verrouillé à
 * tort. C'est exactement le genre de régression qui retirerait un droit
 * acquis à un utilisateur.
 */
export function isProPath(path: string): boolean {
  const p = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  // L'espace parent reste public : un parent n'a pas d'abonnement.
  if (p === '/suivi-enfant') return false;
  return PRO_MODULES.some(({ path: m }) => p === m || p.startsWith(`${m}/`));
}

/* ------------------------------------------------------------------ */
/* v64 — FORMULES ÉCOLE (Espace École multi-classes)                   */
/* ------------------------------------------------------------------ */

/** La formule est-elle une formule d'établissement ? */
export function isSchoolPlan(plan: SubscriptionPlan): boolean {
  return plan === 'ecole-primaire' || plan === 'ecole-complete';
}

/**
 * La formule donne-t-elle accès aux modules PRO ?
 * Oui pour le Pro lui-même ET pour les deux formules École, qui en sont
 * des super-ensembles (6000 / 10000 FCFA > 2500 FCFA).
 */
export function hasProPerimetre(plan: SubscriptionPlan): boolean {
  return plan === 'pro' || isSchoolPlan(plan);
}

/**
 * Route de DÉCOUVERTE de l'Espace École : ouverte à tous les abonnés
 * (et à l'essai), car l'écran affiche lui-même les offres 6000 / 10000 F
 * et le champ d'activation du code École. Bloquer la route en amont
 * empêcherait justement de saisir ce code.
 */
export function isSchoolDiscoveryPath(path: string): boolean {
  const p = (path || '/').split('?')[0];
  return p === '/mon-ecole' || p === '/espace-ecole' || p.startsWith('/espace-ecole/');
}

/** Liste des fonctions offertes par le plan Essentiel (pour l'affichage). */
export const ESSENTIEL_FEATURES = [
  { path: '/enrolement-eleves', label: "Enrôlement intelligent des élèves" },
  { path: '/enrolement-personnel', label: "Enrôlement du personnel" },
  { path: '/class', label: 'Importation des notes (Excel officiel)' },
];

/**
 * Vaut true si la route demandée fait partie du plan Essentiel.
 * - « Enrôlement des élèves » : écran d'enrôlement + écran Élèves d'une
 *   classe (où se fait aussi l'import Excel des élèves ET des notes).
 * - Création / édition d'une classe : indispensable pour utiliser ces
 *   deux fonctions.
 */
export function isAllowedForEssentiel(path: string): boolean {
  const p = (path || '/').split('?')[0];
  // Accès de base (toujours ouverts) : accueil, mon espace (abonnement).
  if (p === '/' || p === '/profile') return true;
  // Fonction 1 : ENRÔLEMENT DES ÉLÈVES.
  if (p.startsWith('/enrolement-eleves')) return true;
  // Fonction 1 bis (v36) : ENRÔLEMENT DU PERSONNEL, inclus dans la formule 999 FCFA.
  if (p.startsWith('/enrolement-personnel')) return true;
  // Page du module Enrôlement (regroupe les deux sous-modules ci-dessus).
  if (p === '/enrolement') return true;
  if (p === '/class/new') return true;
  // Fonction 2 : IMPORTATION DES NOTES — écran Élèves d'une classe
  // (ajout d'élèves + fichier Excel officiel : élèves ET notes).
  // v67 : les photos d’identité font partie de l’enrôlement officiel et
  // sont donc aussi ouvertes à la formule Essentiel, classe par classe.
  if (p.startsWith('/class/') && (p.endsWith('/students') || p.endsWith('/edit') || p.endsWith('/photos-educmaster'))) return true;
  // Tableau de bord d'une classe : hub indispensable (fonctions non incluses
  // y restent affichées avec un cadenas, et bloquées à l'ouverture).
  if (p === '/class' || /^\/class\/[^/]+$/.test(p)) return true;
  return false;
}

/**
 * Une fonction est-elle accessible avec ce plan ?
 *  - Pro et École (v64) : tout ;
 *  - Complet : tout SAUF les 4 modules de gestion (v53) ;
 *  - Essentiel : uniquement l'enrôlement et l'importation des notes
 *    (+ la page de découverte de l'Espace École, qui se verrouille elle-même).
 */
export function canAccessPath(plan: SubscriptionPlan, path: string): boolean {
  if (hasProPerimetre(plan)) return true;
  if (isSchoolDiscoveryPath(path)) return true;
  if (plan === 'complet') return !isProPath(path);
  return isAllowedForEssentiel(path);
}

/** Libellé court des fonctions incluses dans le plan Essentiel. */
export function essentielSummary(): string {
  return 'Enrôlement des élèves • Importation des notes';
}
