/**
 * Moteur pédagogique LOCAL — génération de fiches sans clé API.
 *
 * Produit des fiches structurées selon l'Approche Par Compétences (APC)
 * pratiquée au Bénin : situation-problème, tâche complexe, activités en phases,
 * structuration, évaluation avec critères de réussite et remédiation.
 *
 * Le contenu est adapté à la MATIÈRE (bibliothèque de situations,
 * d'exemples et d'activités) et au NIVEAU (concret/oral au préscolaire et CI-CP,
 * manipulation au CE, abstraction progressive au CM et au secondaire).
 */

import type { LessonPromptInput, GeneratedLessonPlan } from './aiLessonGenerator';

/** Normalise une matière pour la recherche dans la bibliothèque. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

interface MatiereBank {
  /** Matières reconnues (formes normalisées). */
  keys: string[];
  /** Nom d'affichage canonique. */
  label: string;
  /** Situation-problème type (on injecte le thème). */
  situation: string;
  /** Activité de découverte / mise en situation. */
  decouverte: string;
  /** Consigne de la tâche complexe. */
  tache: string;
  /** Exemples / démarche type. */
  demarche: string;
  /** Évaluation type + critères. */
  evaluation: (theme: string) => string;
  /** Matériel habituel. */
  materiel: string;
}

const MATIERE_BANKS: MatiereBank[] = [
  {
    keys: ['dictee', 'dictée'],
    label: 'Dictée',
    situation: 'Un texte court contenant les mots de la leçon est lu deux fois ; les apprenants doivent l\'écrire correctement.',
    decouverte: 'Lecture expressive du texte par l\'enseignant, repérage oral des mots difficiles et des règles d\'orthographe vues en classe.',
    tache: 'Écrire sous la dictée le texte « {theme} » en respectant l\'orthographe, la ponctuation et la présentation.',
    demarche: 'Lecture 1 : écoute silencieuse. Lecture 2 : écriture phrase par phrase. Relire et vérifier chaque mot. Contrôle croisé entre voisins.',
    evaluation: (t) => `Dictée notée sur 10 :\n- Orthographe des mots du thème « ${t} » (6 points)\n- Ponctuation et majuscules (2 points)\n- Présentation et propreté (2 points)\n\nRemédiation : dicter à nouveau les mots les plus erronés, copie différée, dictée de phrases personnelles.`,
    materiel: 'Tableau, ardoises ou cahiers, texte de la dictée, fiche des mots à apprendre.',
  },
  {
    keys: ['math', 'mathematiques', 'mathematique', 'maths'],
    label: 'Mathématiques',
    situation: 'Une situation de la vie courante (marché, récolte, partage, mesure) où la notion « {theme} » doit être mobilisée pour résoudre un problème réel.',
    decouverte: 'Manipulation et observation : l\'enseignant présente le matériel et fait émerger la question mathématique à résoudre.',
    tache: 'Par groupe, rechercher une stratégie pour résoudre la situation-problème liée à « {theme} », puis la justifier devant la classe.',
    demarche: '1. Compréhension de l\'énoncé (surligner les données). 2. Recherche individuelle puis en binômes. 3. Mise en commun des stratégies. 4. Formalisation de la technique/règle. 5. Exercices d\'application gradués.',
    evaluation: (t) => `Évaluation sur 10 :\n- Résolution exacte du problème « ${t} » (5 points)\n- Démarche et justification des étapes (3 points)\n- Présentation (2 points)\n\nRemédiation : refaire un exemple guidé pas à pas, puis un exercice analogue simplifié.`,
    materiel: 'Matériel de manipulation (jetons, bâtonnets, réglettes, monnaie fictive), ardoises, manuel, tableau.',
  },
  {
    keys: ['lecture'],
    label: 'Lecture',
    situation: 'Un texte court et illustré est présenté ; les apprenants doivent en dégager le sens, les personnages et l\'idée principale.',
    decouverte: 'Anticipation à partir du titre et de l\'image (quête de sens), puis découverte du texte par la lecture magistrale.',
    tache: 'Lire le texte « {theme} » à voix haute avec fluidité, puis répondre aux questions de compréhension.',
    demarche: 'Lecture modèle → lecture individuelle silencieuse → lecture à voix haute par quelques apprenants → questions de compréhension orale puis écrite → récapitulation.',
    evaluation: (t) => `Évaluation sur 10 :\n- Lecture fluide du texte « ${t} » (4 points)\n- Réponses correctes aux questions de compréhension (4 points)\n- Respect de la ponctuation et de l\'intonation (2 points)\n\nRemédiation : lecture accompagnée en petit groupe, relecture des passages difficiles, exercices de fluence.`,
    materiel: 'Texte illustré, manuel de lecture, tableau, fiches de questions.',
  },
  {
    keys: ['expressionecrite', 'expression écrite'],
    label: 'Expression écrite',
    situation: 'À partir d\'une image ou d\'une situation vécue, les apprenants doivent produire un écrit structuré et respectant les normes.',
    decouverte: 'Observation de l\'image support / rappel du vécu, échange oral pour enrichir le vocabulaire et les idées.',
    tache: 'Rédiger un texte court (4 à 6 phrases) sur « {theme} » en respectant la structure : introduction, développement, conclusion.',
    demarche: '1. Oral : chacun dit ce qu\'il voit/sait. 2. Plan collectif au tableau. 3. Production individuelle. 4. Lecture de quelques productions. 5. Amélioration collective (orthographe, ponctuation, richesse).',
    evaluation: (t) => `Production notée sur 10 :\n- Respect du thème « ${t} » et de la structure (4 points)\n- Orthographe et ponctuation (3 points)\n- Présentation et lisibilité (2 points)\n- Enrichissement du vocabulaire (1 point)\n\nRemédiation : atelier de réécriture guidée, dictée de phrases modèles.`,
    materiel: 'Images support, cahiers, tableau, dictionnaire.',
  },
  {
    keys: ['comprehensiondelecrite', 'compréhension de l\'écrit', 'comprehension'],
    label: 'Compréhension de l\'écrit',
    situation: 'Un texte lu individuellement doit être compris : les apprenants répondent à des questions de niveaux différents (explicites et implicites).',
    decouverte: 'Lecture silencieuse du texte, puis repérage des personnages, lieux et événements clés.',
    tache: 'Répondre par écrit aux questions de compréhension du texte « {theme} » en justifiant ses réponses par des indices du texte.',
    demarche: 'Lecture silencieuse → questions orales de vérification → travail individuel écrit → correction collective avec justification (recherche de la phrase indice) → bilan.',
    evaluation: (t) => `Évaluation sur 10 :\n- Questions explicites sur « ${t} » (4 points)\n- Questions implicites / inférence (3 points)\n- Justification par des indices du texte (2 points)\n- Présentation (1 point)\n\nRemédiation : relecture guidée des passages, questions plus simples, entraînement à l\'inférence.`,
    materiel: 'Texte imprimé ou manuel, fiches de questions, tableau.',
  },
  {
    keys: ['est'],
    label: 'Étude des Sciences et Technologies (EST)',
    situation: 'Un phénomène observé dans le milieu (plante, objet, animal, phénomène naturel) pose question ; il faut l\'observer et l\'expliquer scientifiquement.',
    decouverte: 'Observation directe ou par image/expérience simple ; formulation des hypothèses des apprenants.',
    tache: 'Réaliser (ou observer) l\'expérience « {theme} », noter les observations et conclure avec rigueur.',
    demarche: 'Questionnement → hypothèses → expérience/observation → recueil des observations → confrontation → conclusion et schéma légendé.',
    evaluation: (t) => `Évaluation sur 10 :\n- Exactitude des observations de « ${t} » (4 points)\n- Conclusion scientifique correcte (3 points)\n- Schéma ou trace écrite (2 points)\n- Participation et rigueur (1 point)\n\nRemédiation : refaire l\'expérience en petit groupe, schéma à compléter, questions orales de rappel.`,
    materiel: 'Matériel d\'expérience, objets ou spécimens, images, tableau, cahiers de sciences.',
  },
  {
    keys: ['es', 'educationscientifique'],
    label: 'Éducation Scientifique (ES)',
    situation: 'Une situation de la vie courante liée à la santé, à l\'environnement ou au corps humain mobilise la notion « {theme} ».',
    decouverte: 'Discussion à partir d\'une image ou d\'une situation vécue ; recueil des représentations initiales.',
    tache: 'Classer/observer/répondre sur « {theme} » puis élaborer une règle ou une conduite adaptée.',
    demarche: 'Recueil des représentations → apport d\'informations (document, expérience simple) → structuration → application à des situations de la vie courante → trace écrite.',
    evaluation: (t) => `Évaluation sur 10 :\n- Connaissances sur « ${t} » (5 points)\n- Application à une situation concrète (3 points)\n- Règle d\'hygiène/conduite énoncée (2 points)\n\nRemédiation : ateliers de manipulation, affiches, questions orales.`,
    materiel: 'Images, affiches, matériel d\'hygiène, tableau, cahiers.',
  },
  {
    keys: ['ea', 'educationartistique', 'eaoral'],
    label: 'Éducation Artistique (EA)',
    situation: 'Les apprenants observent une œuvre, un chant ou une technique ; ils doivent produire et exprimer une interprétation personnelle.',
    decouverte: 'Observation/écoute de l\'œuvre support ; échange sur les impressions et les techniques utilisées.',
    tache: 'Réaliser une production (dessin, chant, rythme, modelage) sur « {theme} » en utilisant la technique étudiée.',
    demarche: 'Observation du modèle → démonstration par l\'enseignant → production individuelle → exposition et commentaire des réalisations → valorisation.',
    evaluation: (t) => `Production appréciée sur 10 :\n- Respect du thème « ${t} » (3 points)\n- Usage de la technique étudiée (3 points)\n- Créativité et originalité (2 points)\n- Soin et présentation (2 points)\n\nRemédiation : gestes guidés pour les plus hésitants, modèles simplifiés, valorisation de chaque production.`,
    materiel: 'Feuilles, crayons, craies, matériel de modelage, instruments de percussion, reproductions.',
  },
  {
    keys: ['eps', 'educationphysique'],
    label: 'EPS',
    situation: 'Une situation de jeu ou d\'atelier moteur pose le défi « {theme} » : il faut réaliser l\'activité en respectant les règles et en coopérant.',
    decouverte: 'Échauffement ludique, présentation de l\'atelier et de ses règles de sécurité.',
    tache: 'Réaliser le parcours/jeu « {theme} » en respectant les consignes, la sécurité et l\'esprit d\'équipe.',
    demarche: 'Échauffement → démonstration par l\'enseignant → essais individuels → ateliers/jeu → retour au calme → bilan des réussites et difficultés.',
    evaluation: (t) => `Évaluation sur 10 :\n- Réalisation motrice de « ${t} » (5 points)\n- Respect des règles et de la sécurité (3 points)\n- Participation et coopération (2 points)\n\nRemédiation : ateliers adaptés, parcours simplifiés, aide d\'un pair.`,
    materiel: 'Matériel sportif disponible (ballons, plots, cordes, cerceaux), espace sécurisé, tenue adaptée.',
  },
  {
    keys: ['francais'],
    label: 'Français',
    situation: 'Une situation de communication (rédaction, étude de texte, grammaire) sur « {theme} » doit être menée à bien.',
    decouverte: 'Situation d\'observation de la langue : lecture d\'un texte support et repérage du fait de langue étudié.',
    tache: 'Mobiliser la notion « {theme} » pour produire/répondre correctement, puis appliquer la règle dans des exercices.',
    demarche: 'Observation → formulation de la règle avec les apprenants → exercices d\'application (oral puis écrit) → production courte → billet de sortie.',
    evaluation: (t) => `Évaluation sur 10 :\n- Maîtrise de « ${t} » (5 points)\n- Application dans des phrases (3 points)\n- Rédaction/production correcte (2 points)\n\nRemédiation : exercices guidés supplémentaires, fiches de règle illustrées, dictées courtes.`,
    materiel: 'Textes supports, manuel, tableau, ardoises, cahiers.',
  },
  {
    keys: ['pct'],
    label: 'PCT (Physique-Chimie-Technologie)',
    situation: 'Un phénomène physique/chimique ou un objet technique de l\'environnement doit être observé et expliqué par « {theme} ».',
    decouverte: 'Observation d\'une expérience ou d\'un objet ; questionnement sur le fonctionnement ou le phénomène.',
    tache: 'Mener l\'expérience ou l\'étude « {theme} », consigner les observations et formuler une explication.',
    demarche: 'Hypothèses → expérimentation → observations et mesures → interprétation → conclusion → application/technologie.',
    evaluation: (t) => `Évaluation sur 10 :\n- Observations de « ${t} » (4 points)\n- Explication scientifique (4 points)\n- Soin et rigueur (2 points)\n\nRemédiation : schémas à compléter, expériences refaites, tutorat entre pairs.`,
    materiel: 'Matériel de laboratoire ou objets du quotidien, schémas, tableau.',
  },
  {
    keys: ['svt'],
    label: 'SVT',
    situation: 'Un phénomène biologique ou géologique du milieu (plante, animal, sol, climat) pose la question « {theme} ».',
    decouverte: 'Observation du vivant/de l\'environnement proche ; recueil des représentations.',
    tache: 'Observer, décrire et relier « {theme} » à ses fonctions ou à son rôle dans l\'environnement.',
    demarche: 'Observation → description → comparaison → explication → schéma légendé → lien avec la vie courante (santé, environnement).',
    evaluation: (t) => `Évaluation sur 10 :\n- Description exacte de « ${t} » (4 points)\n- Explication et liens (4 points)\n- Schéma légendé (2 points)\n\nRemédiation : sorties d\'observation guidées, schémas à compléter.`,
    materiel: 'Spécimens ou images, loupes, schémas, cahiers.',
  },
  {
    keys: ['histoiregeographie', 'histoire-geographie', 'histgeo'],
    label: 'Histoire-Géographie',
    situation: 'Un document (carte, image, récit) sur « {theme} » doit être observé et exploité pour comprendre le passé ou le territoire.',
    decouverte: 'Observation du document ; questions-guides pour en extraire les informations.',
    tache: 'Exploiter le(s) document(s) « {theme} » : repérer les informations, les classer et rédiger une réponse structurée.',
    demarche: 'Observation → questions de repérage → travail individuel/en groupe → mise en commun et synthèse → croquis ou frise chronologique.',
    evaluation: (t) => `Évaluation sur 10 :\n- Lecture du document « ${t} » (4 points)\n- Réponses structurées (4 points)\n- Croquis/frise (2 points)\n\nRemédiation : ateliers de lecture de documents, questions plus guidées.`,
    materiel: 'Cartes, images, textes, frise, tableau.',
  },
  {
    keys: ['anglais'],
    label: 'Anglais',
    situation: 'Une situation de communication simple (se présenter, acheter, décrire) mobilise le lexique et la structure « {theme} ».',
    decouverte: 'Écoute d\'un dialogue ou comptine ; répétition et jeux de rôle.',
    tache: 'Utiliser « {theme} » dans un mini-dialogue en binôme, avec prononciation correcte.',
    demarche: 'Écoute et répétition → mémorisation du lexique → jeux de rôle → production écrite courte → chanson/jeu récapitulatif.',
    evaluation: (t) => `Évaluation sur 10 :\n- Lexique de « ${t} » (4 points)\n- Structure grammaticale (3 points)\n- Prononciation et fluidité (3 points)\n\nRemédiation : réécoute du dialogue, flashcards, répétition guidée.`,
    materiel: 'Flashcards, dialogues audio (si disponibles), images, tableau.',
  },
  {
    keys: ['philosophie'],
    label: 'Philosophie',
    situation: 'Une question problématisée (à partir d\'un texte ou d\'une situation) engage la réflexion autour de « {theme} ».',
    decouverte: 'Lecture d\'un texte court ou d\'une citation ; reformulation de la question par les apprenants.',
    tache: 'Traiter la question « {theme} » en construisant une argumentation : thèse, arguments, exemples.',
    demarche: 'Questionnement → analyse des concepts → travail sur le texte → confrontation des points de vue → rédaction structurée → synthèse.',
    evaluation: (t) => `Évaluation sur 10 :\n- Problématisation de « ${t} » (3 points)\n- Argumentation et exemples (4 points)\n- Expression et clarté (3 points)\n\nRemédiation : entraînement à la méthode, plans guidés, commentaire de courts textes.`,
    materiel: 'Textes, citations, tableau, brouillons.',
  },
  {
    keys: ['lv1', 'lv2', 'allemand', 'espagnol', 'allemandouespagnol'],
    label: 'Langue vivante (LV)',
    situation: 'Une situation de communication quotidienne doit être réalisée à l\'oral ou à l\'écrit avec « {theme} ».',
    decouverte: 'Découverte du lexique par images, jeux et répétition ; écoute de modèles.',
    tache: 'Produire un énoncé (oral ou écrit) mobilisant « {theme} » dans un contexte proche du vécu.',
    demarche: 'Lexique → modèle → imitation → production guidée → production libre → bilan.',
    evaluation: (t) => `Évaluation sur 10 :\n- Lexique de « ${t} » (4 points)\n- Correction grammaticale (3 points)\n- Communication et aisance (3 points)\n\nRemédiation : flashcards, dialogues modèles, jeux de rôle répétés.`,
    materiel: 'Flashcards, enregistrements, images, tableau.',
  },
  {
    keys: ['conduite'],
    label: 'Conduite',
    situation: 'Une situation de la vie quotidienne (transport, sécurité routière, code de la route) met en jeu « {theme} ».',
    decouverte: 'Analyse d\'images de situations routières ; échange sur les dangers et les comportements adaptés.',
    tache: 'Reconnaître et appliquer les règles « {theme} » à des situations concrètes (signalisation, comportement).',
    demarche: 'Observation de situations → identification des règles → mises en situation/simulation → synthèse (panneaux, comportements) → évaluation orale.',
    evaluation: (t) => `Évaluation sur 10 :\n- Connaissance des règles « ${t} » (5 points)\n- Reconnaissance de situations à risque (3 points)\n- Comportement adapté (2 points)\n\nRemédiation : jeux de rôles, images à classer, mémorisation des panneaux.`,
    materiel: 'Panneaux, images, maquettes ou simulations, tableau.',
  },
  {
    keys: ['economie'],
    label: 'Économie',
    situation: 'Une situation économique simple (budget, marché, épargne, production) mobilise la notion « {theme} ».',
    decouverte: 'Situation-problème chiffrée issue du vécu (achats, prix, marché) ; recueil des pratiques.',
    tache: 'Analyser la situation « {theme} » : identifier les données, calculer et proposer une solution argumentée.',
    demarche: 'Lecture de la situation → repérage des données → calculs/analyse → discussion → synthèse avec le vocabulaire économique → application.',
    evaluation: (t) => `Évaluation sur 10 :\n- Analyse de « ${t} » (4 points)\n- Calculs et interprétation (4 points)\n- Vocabulaire économique (2 points)\n\nRemédiation : exercices chiffrés gradués, situations simplifiées.`,
    materiel: 'Documents économiques, calculatrices (si autorisées), tableau.',
  },
];

const MATIERE_GENERIQUE: MatiereBank = {
  keys: [],
  label: 'Matière',
  situation: 'Une situation de la vie courante liée au thème « {theme} » est proposée aux apprenants pour donner du sens à la leçon.',
  decouverte: 'Mise en situation et questionnement : l\'enseignant fait émerger ce que les apprenants savent déjà sur le thème.',
  tache: 'Réaliser la tâche « {theme} » en mobilisant les connaissances et méthodes de la leçon.',
  demarche: '1. Mise en situation. 2. Recherche individuelle ou en groupe. 3. Mise en commun et confrontation. 4. Structuration des savoirs. 5. Exercices d\'application. 6. Synthèse et évaluation.',
  evaluation: (t) => `Évaluation formative sur le thème « ${t} » :\n- Question orale de vérification des acquis.\n- Exercice individuel court d\'application.\n- Correction immédiate et remédiation ciblée.\n\nCritères : exactitude, méthode, clarté et présentation.`,
  materiel: 'Tableau, ardoises, cahiers, manuel, supports disponibles en classe.',
};

function getMatiereBank(matiere: string): MatiereBank {
  const n = norm(matiere);
  for (const bank of MATIERE_BANKS) {
    if (bank.keys.some((k) => norm(k) === n || n.includes(norm(k)) || norm(k).includes(n))) return bank;
  }
  return MATIERE_GENERIQUE;
}

/** Adapte la difficulté et la formulation selon le niveau. */
function niveauAdaptation(niveau: string): { intro: string; niveauMot: string; concret: string } {
  const n = norm(niveau);
  if (n.includes('maternelle')) {
    return {
      intro: 'Activités courtes, orales et ludiques, avec manipulation systématique.',
      niveauMot: 'découvrir et exprimer',
      concret: 'Jeux, comptines, images et objets concrets.',
    };
  }
  if (n === 'ci' || n === 'cp') {
    return {
      intro: 'Approche essentiellement orale et concrète, avec des activités courtes et guidées.',
      niveauMot: 'découvrir et reproduire',
      concret: 'Manipulation d\'objets, images, ardoises, jeux.',
    };
  }
  if (n === 'ce1' || n === 'ce2') {
    return {
      intro: 'Approche semi-concrète : manipulations, puis passage progressif à l\'écrit.',
      niveauMot: 'comprendre et appliquer',
      concret: 'Matériel de manipulation, écrits courts, travail en binômes.',
    };
  }
  if (n === 'cm1' || n === 'cm2') {
    return {
      intro: 'Approche plus structurée : recherche autonome, justification et production écrite.',
      niveauMot: 'analyser et maîtriser',
      concret: 'Recherche guidée, exercices écrits, exposés courts.',
    };
  }
  return {
    intro: 'Approche réflexive : analyse, argumentation et rédaction structurée, avec autonomie progressive.',
    niveauMot: 'analyser, argumenter et maîtriser',
    concret: 'Documents, exercices écrits, démarche méthodique.',
  };
}

/** Répartit la durée totale en phases APC. */
function buildPhases(dureeMin: number, bank: MatiereBank, theme: string, adaptation: { concret: string }): string {
  const phases: { name: string; t: number; ens: string; app: string }[] = [
    { name: 'Situation-problème', t: 0.15, ens: `Présente la situation : ${bank.situation.replace('{theme}', theme)}`, app: `Observent, écoutent et s'expriment sur la situation.` },
    { name: 'Activité de découverte', t: 0.15, ens: `${bank.decouverte} ${adaptation.concret}`, app: `Manipulent, observent, proposent des hypothèses.` },
    { name: 'Recherche / tâche complexe', t: 0.2, ens: `Donne la consigne : ${bank.tache.replace('{theme}', theme)}. Circule et guide.`, app: `Recherchent en individuel ou en groupes, discutent entre pairs.` },
    { name: 'Mise en commun', t: 0.15, ens: `Organise la présentation des productions et la confrontation des idées.`, app: `Présentent, comparent, justifient leurs stratégies.` },
    { name: 'Structuration', t: 0.2, ens: `Formalise la règle, la méthode ou le schéma. Écrit la trace avec la classe.`, app: `Participent à la synthèse et recopient la trace écrite.` },
    { name: 'Application / évaluation', t: 0.15, ens: `Propose des exercices gradués et observe les difficultés.`, app: `S'exercent et s'auto-évaluent.` },
  ];
  return phases
    .map((p) => {
      const mins = Math.max(2, Math.round((p.t * dureeMin) / 5) * 5);
      return `• ${p.name} (${mins} min)\n   — Enseignant : ${p.ens}\n   — Apprenants : ${p.app}`;
    })
    .join('\n\n');
}

/**
 * Génère une fiche pédagogique complète, structurée selon l'APC,
 * adaptée à la matière et au niveau, SANS clé API.
 */
export function generateLocalLesson(input: LessonPromptInput): GeneratedLessonPlan {
  const kind = input.generationKind || 'fiche';
  const niveau = input.niveau || 'Classe à préciser';
  const matiere = input.matiere || 'Matière à préciser';
  const theme = input.theme || 'Leçon à préciser';
  const dureeRaw = input.duree || '45 min';
  const dureeMin = Math.max(10, parseInt(dureeRaw) || 45);
  const objectif = input.objectif || `Amener les apprenants du niveau ${niveau} à maîtriser la notion : ${theme}.`;

  const bank = getMatiereBank(matiere);
  const adapt = niveauAdaptation(niveau);

  // Durée des phases basée sur la durée saisie
  const phases = buildPhases(dureeMin, bank, theme, adapt);

  const support = input.modelText || input.image
    ? `${bank.materiel} (compléter à partir de la fiche de référence)`
    : bank.materiel;

  const standard = input.standard || 'APC_BENIN';
  const standardLabel = standard === 'FICHE_REFERENCE'
    ? 'Trame indicative — aucune conformité officielle présumée'
    : standard;
  const pointsAControler = (input.modelText || input.image) && standard === 'FICHE_REFERENCE'
    ? ['Le moteur local produit un brouillon générique et ne reproduit pas sémantiquement les rubriques de la fiche jointe. Pour une génération fidèle à son contenu, choisissez un fournisseur en ligne et autorisez explicitement cet envoi.']
    : undefined;

  if (kind === 'exercices') {
    return {
      titre: `Exercices adaptés : ${theme}`,
      classe: niveau,
      matiere,
      domaine: theme,
      duree: dureeRaw,
      competence: `Réinvestir les acquis de la leçon : ${theme}.`,
      objectif,
      materiel: support,
      deroulement: `Séance d'entraînement (${dureeRaw}) — ${adapt.intro}\n\n${phases}\n\nConsigne : ${bank.tache.replace('{theme}', theme)}`,
      evaluation: `Exercices et corrigés :\n\nEXERCICE 1 (niveau facile — 5 points)\nRéponds à 5 questions simples sur ${theme}.\nCorrigé : chaque réponse doit reprendre la règle ou la notion étudiée (${bank.demarche}).\n\nEXERCICE 2 (niveau moyen — 8 points)\nRésous 3 situations d'application liées à ${theme}.\nCorrigé : la démarche doit suivre les étapes apprises en classe.\n\nEXERCICE 3 (niveau difficile — 7 points)\nRésous la situation-problème : ${bank.situation.replace('{theme}', theme)}\nCorrigé : justification complète, démarche explicite.\n\nBarème : 20 points.\n\nRemédiation : reprendre les erreurs fréquentes, refaire un exemple guidé, puis proposer un exercice analogue.`,
      pointsAControler,
    };
  }

  if (kind === 'cours_en_ligne') {
    return {
      titre: `Cours en ligne : ${theme}`,
      classe: niveau,
      matiere,
      domaine: theme,
      duree: dureeRaw,
      competence: `Comprendre et appliquer la notion : ${theme}.`,
      objectif,
      materiel: `${support}\nSupport numérique : texte, image, courte vidéo ou activité interactive.`,
      deroulement: `MODULE 1 — Situation de départ\n${bank.situation.replace('{theme}', theme)}\n\nMODULE 2 — Découverte\n${bank.decouverte}\n\nMODULE 3 — Notion (tâche)\n${bank.tache.replace('{theme}', theme)}\n\nMODULE 4 — Exemples guidés\n${bank.demarche}\n\nMODULE 5 — Activité d'application\nExercices gradués avec correction automatique ou différée.\n\nMODULE 6 — Quiz et devoir\nQuiz de 5 questions sur ${theme} + devoir de réinvestissement.`,
      evaluation: `Quiz (5 questions courtes) : ${theme}.\nDevoir : produire une réponse ou résoudre une situation liée à ${theme}.\nCritères : exactitude, méthode, clarté, présentation.`,
      pointsAControler,
    };
  }

  return {
    titre: `Fiche pédagogique : ${theme}`,
    classe: niveau,
    matiere,
    domaine: theme,
    duree: dureeRaw,
    competence: `Développer chez l'apprenant la capacité à ${adapt.niveauMot} la notion : ${theme} (${bank.label} — ${niveau}).`,
    objectif,
    materiel: support,
    deroulement: `DÉROULEMENT DE LA SÉANCE (${dureeRaw}) — ${standardLabel}\n${adapt.intro}\n\n${phases}`,
    evaluation: `Évaluation formative :\n\n${bank.evaluation(theme)}`,
    pointsAControler,
  };
}
