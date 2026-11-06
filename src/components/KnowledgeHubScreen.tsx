import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { BookOpen, ChevronLeft, ImageIcon, Plus, Printer, Search, Square, Trash2, Volume2, X } from 'lucide-react';
import { hasAdminRole } from '../utils/adminSession';
import { getVideoEmbed } from '../utils/courseMarketplace';
import { illustrate } from '../utils/svgIllustration';
import { normalizeSearch } from '../utils/textSearch';
import { pickDailyToday } from '../utils/dailyContent';
import { useTextToSpeech, warmVoices, isSpeechSupported, speakText } from '../utils/speech';
import { printFlashcards } from '../utils/flashcards';
import { ENCYCLOPEDIA_EXTRA, ENCARTA_DOMAINS } from '../utils/encyclopediaData';
import { ENCYCLOPEDIA_EXTRA_2 } from '../utils/encyclopediaData2';
import { ENCYCLOPEDIA_EXTRA_3 } from '../utils/encyclopediaData3';
import { ENCYCLOPEDIA_PACK } from '../utils/encyclopediaPack';
import { generateQuiz, quizMessage, loadBestScore, saveBestScore } from '../utils/kidsQuiz';

interface EncyclopediaEntry {
  term: string;
  simple: string;
  details: string;
  examples: string[];
  keywords: string[];
  imageUrl?: string;
  videoUrl?: string;
}

interface CustomEntry extends EncyclopediaEntry { themeId: string }

const CUSTOM_KEY = 'msp_encyclopedia_custom_entries';

function loadCustomEntries(): CustomEntry[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
}
function saveCustomEntries(entries: CustomEntry[]) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(entries)); }

interface EncyclopediaTheme {
  id: string;
  title: string;
  description: string;
  color: string;
  entries: EncyclopediaEntry[];
}

const makeEntry = (term: string, simple: string, details: string, examples: string[], keywords: string[] = []): EncyclopediaEntry => ({ term, simple, details, examples, keywords });

const imageUrl = (theme: string, entry: EncyclopediaEntry) =>
  entry.imageUrl || illustrate(`${theme} ${entry.term}`, entry.term);

/** Vidéos pertinentes par thématique (remplace la vidéo générique hors sujet). */
const THEME_VIDEOS: Record<string, string> = {
  dictionnaire: 'VeSUzYblKio',
  litterature: 'VeSUzYblKio',
  education: 'VeSUzYblKio',
  astronomie: 'tZ4lCI6Pyoo',
  sciences: 'tZ4lCI6Pyoo',
  medecine: 'tZ4lCI6Pyoo',
  environnement: 'tZ4lCI6Pyoo',
  agriculture: 'tZ4lCI6Pyoo',
  comptabilite: '4O8X7xG6dpA',
  finance: '4O8X7xG6dpA',
  sport: 'rdLfnajz3wg',
  loisirs: 'rdLfnajz3wg',
};

/** Résout la vidéo : lien admin > mot-clé > thématique > vidéo de découverte (étiquetée). */
function resolveVideo(themeId: string, term: string, videoUrl?: string): { embed: string; generic: boolean } {
  if (videoUrl && getVideoEmbed(videoUrl)) return { embed: getVideoEmbed(videoUrl), generic: false };
  const t = term.toLowerCase();
  if (t.includes('math') || t.includes('addition') || t.includes('nombre')) return { embed: `https://www.youtube-nocookie.com/embed/4O8X7xG6dpA?rel=0&modestbranding=1&playsinline=1`, generic: true };
  if (t.includes('lecture') || t.includes('phrase') || t.includes('mot')) return { embed: `https://www.youtube-nocookie.com/embed/VeSUzYblKio?rel=0&modestbranding=1&playsinline=1`, generic: true };
  if (t.includes('science') || t.includes('plante') || t.includes('eau')) return { embed: `https://www.youtube-nocookie.com/embed/tZ4lCI6Pyoo?rel=0&modestbranding=1&playsinline=1`, generic: true };
  const themeId_v = THEME_VIDEOS[themeId];
  if (themeId_v) return { embed: `https://www.youtube-nocookie.com/embed/${themeId_v}?rel=0&modestbranding=1&playsinline=1`, generic: true };
  return { embed: '', generic: true };
}

const THEMES: EncyclopediaTheme[] = [
  {
    id: 'dictionnaire', title: 'Dictionnaire MSP', color: 'emerald', description: 'Mots importants expliqués clairement en français.',
    entries: [
      makeEntry('Mot', 'Un mot est un ensemble de lettres qui a un sens.', 'Les mots servent à parler, lire, écrire et comprendre. Dans une phrase, chaque mot joue un rôle : nom, verbe, adjectif, déterminant ou autre.', ['maison', 'école', 'apprendre'], ['vocabulaire']),
      makeEntry('Définition', 'Une définition explique le sens d’un mot.', 'Elle permet de comprendre un mot nouveau. Une bonne définition est claire, courte et accompagnée d’un exemple.', ['Le dictionnaire donne une définition.'], ['sens']),
      makeEntry('Synonyme', 'Un synonyme est un mot qui a presque le même sens.', 'Les synonymes évitent les répétitions et enrichissent l’expression.', ['joli = beau', 'rapide = vite'], ['vocabulaire']),
      makeEntry('Antonyme', 'Un antonyme est un mot de sens contraire.', 'Il aide à comparer deux idées opposées.', ['grand / petit', 'chaud / froid'], ['contraire']),
      makeEntry('Phrase', 'Une phrase est un groupe de mots qui a un sens.', 'Elle commence par une majuscule et se termine par un point, un point d’interrogation ou un point d’exclamation.', ['Le maître explique la leçon.'], ['grammaire']),
    ],
  },
  {
    id: 'astronomie', title: 'Astronomie', color: 'blue', description: 'Ciel, étoiles, planètes et espace.',
    entries: [
      makeEntry('Soleil', 'Le Soleil est l’étoile qui éclaire la Terre.', 'Il donne lumière et chaleur. Sans lui, la vie serait impossible sur Terre.', ['Le Soleil se lève à l’est.', 'Les plantes utilisent la lumière du Soleil.'], ['étoile']),
      makeEntry('Lune', 'La Lune est le satellite naturel de la Terre.', 'Elle tourne autour de la Terre et change d’apparence selon les phases lunaires.', ['pleine lune', 'croissant de lune'], ['satellite']),
      makeEntry('Planète', 'Une planète est un grand astre qui tourne autour d’une étoile.', 'La Terre est une planète du système solaire. Les planètes ne produisent pas leur propre lumière.', ['Mercure', 'Vénus', 'Terre', 'Mars'], ['système solaire']),
      makeEntry('Étoile', 'Une étoile est un astre qui produit de la lumière.', 'Les étoiles paraissent petites car elles sont très éloignées.', ['Le Soleil est une étoile.'], ['ciel']),
      makeEntry('Système solaire', 'Le système solaire regroupe le Soleil et les astres qui tournent autour de lui.', 'Il comprend des planètes, satellites, astéroïdes et comètes.', ['Terre autour du Soleil'], ['astronomie']),
    ],
  },
  {
    id: 'arts', title: 'Arts', color: 'rose', description: 'Dessin, musique, théâtre, danse et création.',
    entries: [
      makeEntry('Dessin', 'Le dessin représente des objets, personnes ou idées avec des traits.', 'Il développe l’observation, la précision et l’imagination.', ['dessiner une maison', 'croquis d’un animal'], ['créativité']),
      makeEntry('Musique', 'La musique est l’art des sons organisés.', 'Elle peut être chantée, jouée avec des instruments ou produite avec le corps.', ['chant', 'tambour', 'flûte'], ['sons']),
      makeEntry('Théâtre', 'Le théâtre est une représentation jouée par des acteurs.', 'Il aide à mieux parler, mémoriser et exprimer des émotions.', ['scène', 'dialogue'], ['expression']),
      makeEntry('Danse', 'La danse exprime des idées ou émotions par les mouvements du corps.', 'Elle peut être traditionnelle, moderne ou sportive.', ['danse traditionnelle béninoise'], ['mouvement']),
      makeEntry('Couleur', 'Une couleur permet de distinguer et embellir les objets.', 'Les couleurs primaires sont souvent le rouge, le bleu et le jaune.', ['vert', 'rouge', 'jaune'], ['peinture']),
    ],
  },
  {
    id: 'citations', title: 'Citations', color: 'amber', description: 'Paroles célèbres, proverbes et sagesse.',
    entries: [
      makeEntry('Proverbe', 'Un proverbe est une phrase courte qui donne une leçon de vie.', 'Il vient souvent de l’expérience d’un peuple et transmet une sagesse.', ['Petit à petit, l’oiseau fait son nid.'], ['sagesse']),
      makeEntry('Citation', 'Une citation reprend les mots d’une personne.', 'Elle sert à illustrer une idée ou appuyer une réflexion.', ['Une citation d’un écrivain.'], ['pensée']),
      makeEntry('Sagesse', 'La sagesse aide à bien réfléchir avant d’agir.', 'Elle associe prudence, expérience et respect des autres.', ['écouter les anciens'], ['valeur']),
      makeEntry('Morale', 'La morale indique ce qui est bien ou mal dans une histoire.', 'Elle aide à comprendre la leçon d’un récit.', ['La morale d’un conte.'], ['conte']),
      makeEntry('Valeur', 'Une valeur est une qualité importante pour bien vivre ensemble.', 'Le respect, la vérité, le travail et la solidarité sont des valeurs.', ['respect', 'honnêteté'], ['citoyenneté']),
    ],
  },
  {
    id: 'comptabilite', title: 'Comptabilité', color: 'slate', description: 'Argent, dépenses, recettes et gestion simple.',
    entries: [
      makeEntry('Recette', 'Une recette est de l’argent qui entre.', 'Dans une boutique ou une école, on note les recettes pour savoir ce qui a été reçu.', ['vente de cahiers', 'cotisation'], ['argent']),
      makeEntry('Dépense', 'Une dépense est de l’argent qui sort.', 'Il faut noter les dépenses pour suivre le budget.', ['achat de craies', 'transport'], ['budget']),
      makeEntry('Budget', 'Un budget prévoit les recettes et les dépenses.', 'Il aide à bien organiser l’argent disponible.', ['budget d’une classe'], ['gestion']),
      makeEntry('Facture', 'Une facture est un document qui montre ce qu’on doit payer.', 'Elle précise souvent le prix, la quantité et le vendeur.', ['facture d’achat'], ['document']),
      makeEntry('Bilan', 'Un bilan résume une situation financière.', 'Il permet de savoir si les recettes couvrent les dépenses.', ['bilan APE'], ['comptes']),
    ],
  },
  {
    id: 'cuisine', title: 'Cuisine', color: 'orange', description: 'Aliments, recettes, nutrition et hygiène alimentaire.',
    entries: [
      makeEntry('Aliment', 'Un aliment est ce qu’on mange pour vivre.', 'Les aliments donnent de l’énergie et aident le corps à grandir.', ['riz', 'maïs', 'haricot'], ['nutrition']),
      makeEntry('Recette', 'Une recette explique comment préparer un plat.', 'Elle donne les ingrédients, les quantités et les étapes.', ['recette de pâte', 'recette de sauce'], ['cuisine']),
      makeEntry('Hygiène alimentaire', 'C’est l’ensemble des règles pour manger sainement.', 'Il faut laver les mains, couvrir les aliments et boire de l’eau propre.', ['laver les fruits'], ['santé']),
      makeEntry('Nutrition', 'La nutrition étudie comment les aliments nourrissent le corps.', 'Une alimentation équilibrée contient plusieurs groupes d’aliments.', ['protéines', 'vitamines'], ['santé']),
      makeEntry('Cuisson', 'La cuisson chauffe les aliments pour les rendre mangeables ou plus sûrs.', 'Elle peut se faire au feu, au four ou à la vapeur.', ['cuire le riz'], ['chaleur']),
    ],
  },
  {
    id: 'droit', title: 'Droit', color: 'indigo', description: 'Règles, justice, droits et devoirs.',
    entries: [
      makeEntry('Droit', 'Un droit est ce qu’une personne peut faire ou recevoir légalement.', 'Les droits protègent les personnes et organisent la société.', ['droit à l’éducation'], ['justice']),
      makeEntry('Devoir', 'Un devoir est ce qu’une personne doit faire.', 'Les devoirs accompagnent les droits.', ['respecter la loi'], ['citoyenneté']),
      makeEntry('Loi', 'Une loi est une règle officielle d’un pays.', 'Elle est faite pour organiser la vie en société.', ['loi scolaire'], ['État']),
      makeEntry('Justice', 'La justice aide à régler les conflits selon la loi.', 'Elle cherche à protéger les droits et punir les fautes.', ['tribunal'], ['droit']),
      makeEntry('Contrat', 'Un contrat est un accord entre des personnes.', 'Il précise ce que chacun accepte de faire.', ['contrat de vente'], ['accord']),
    ],
  },
  {
    id: 'environnement', title: 'Environnement', color: 'green', description: 'Nature, climat, pollution et protection du cadre de vie.',
    entries: [
      makeEntry('Pollution', 'La pollution rend l’air, l’eau ou le sol mauvais pour la vie.', 'Elle peut venir des déchets, fumées ou produits chimiques.', ['fumée', 'plastiques'], ['nature']),
      makeEntry('Recyclage', 'Le recyclage transforme des déchets pour les réutiliser.', 'Il réduit le gaspillage et protège l’environnement.', ['papier recyclé'], ['déchets']),
      makeEntry('Climat', 'Le climat décrit le temps habituel d’un lieu.', 'Il influence l’agriculture, l’eau et la santé.', ['saison sèche', 'saison des pluies'], ['météo']),
      makeEntry('Biodiversité', 'La biodiversité est la variété des êtres vivants.', 'Elle comprend les animaux, plantes et micro-organismes.', ['forêt', 'lac'], ['vivant']),
      makeEntry('Déforestation', 'La déforestation est la destruction des forêts.', 'Elle peut réduire la pluie, appauvrir les sols et menacer les animaux.', ['couper les arbres'], ['forêt']),
    ],
  },
  {
    id: 'finance', title: 'Finance', color: 'cyan', description: 'Épargne, crédit, banque et gestion de l’argent.',
    entries: [
      makeEntry('Épargne', 'L’épargne est l’argent qu’on garde pour plus tard.', 'Elle aide à préparer un projet ou faire face à une difficulté.', ['épargner chaque semaine'], ['argent']),
      makeEntry('Crédit', 'Un crédit est de l’argent emprunté à rembourser.', 'Il faut bien comprendre les conditions avant d’emprunter.', ['prêt bancaire'], ['banque']),
      makeEntry('Banque', 'Une banque garde l’argent et propose des services financiers.', 'Elle peut offrir un compte, un crédit ou un moyen de paiement.', ['compte bancaire'], ['finance']),
      makeEntry('Intérêt', 'L’intérêt est une somme ajoutée à l’argent prêté ou épargné.', 'Il peut être gagné ou payé.', ['intérêt d’un prêt'], ['calcul']),
      makeEntry('Investissement', 'Un investissement consiste à utiliser de l’argent pour créer de la valeur.', 'Il peut concerner une activité, un commerce ou une formation.', ['acheter du matériel'], ['projet']),
    ],
  },
  {
    id: 'geographie', title: 'Géographie', color: 'sky', description: 'Paysages, cartes, reliefs, villes, populations.',
    entries: [
      makeEntry('Carte', 'Une carte représente un espace.', 'Elle aide à localiser des lieux, routes, fleuves et frontières.', ['carte du Bénin'], ['repère']),
      makeEntry('Relief', 'Le relief désigne les formes de la surface de la Terre.', 'Il peut être plat, montagneux ou vallonné.', ['colline', 'plateau'], ['paysage']),
      makeEntry('Fleuve', 'Un fleuve est un grand cours d’eau qui se jette dans la mer.', 'Il peut servir au transport, à la pêche et à l’agriculture.', ['fleuve Niger'], ['eau']),
      makeEntry('Ville', 'Une ville est un grand espace habité avec de nombreux services.', 'Elle regroupe marchés, écoles, routes, hôpitaux et administrations.', ['Cotonou', 'Parakou'], ['population']),
      makeEntry('Frontière', 'Une frontière sépare deux territoires.', 'Elle peut être naturelle ou tracée par les hommes.', ['frontière entre pays'], ['territoire']),
    ],
  },
  {
    id: 'hightech', title: 'Hightech', color: 'violet', description: 'Informatique, téléphones, IA, internet et innovation.',
    entries: [
      makeEntry('Ordinateur', 'Un ordinateur traite des informations.', 'Il sert à écrire, calculer, apprendre, communiquer et créer.', ['ordinateur portable'], ['informatique']),
      makeEntry('Intelligence artificielle', 'L’IA est une technologie qui imite certaines capacités humaines.', 'Elle peut aider à écrire, analyser, traduire ou résoudre des problèmes.', ['assistant IA'], ['innovation']),
      makeEntry('Application', 'Une application est un logiciel utilisé sur téléphone ou ordinateur.', 'Elle permet de faire une tâche précise.', ['application scolaire'], ['logiciel']),
      makeEntry('Donnée', 'Une donnée est une information enregistrée.', 'Elle peut être un nom, une note, une image ou un nombre.', ['données élèves'], ['sécurité']),
      makeEntry('Cybersécurité', 'La cybersécurité protège les appareils et données numériques.', 'Elle aide à éviter les vols, virus et arnaques.', ['mot de passe fort'], ['internet']),
    ],
  },
  {
    id: 'histoire', title: 'Histoire', color: 'amber', description: 'Passé, civilisations, événements et mémoire.',
    entries: [
      makeEntry('Date', 'Une date situe un événement dans le temps.', 'Elle aide à organiser l’histoire.', ['1er août 1960'], ['chronologie']),
      makeEntry('Indépendance', 'L’indépendance est le moment où un pays se gouverne lui-même.', 'Le Bénin est devenu indépendant le 1er août 1960.', ['indépendance du Bénin'], ['nation']),
      makeEntry('Royaume', 'Un royaume est un territoire dirigé par un roi ou une reine.', 'L’histoire du Bénin compte plusieurs royaumes importants.', ['royaume du Danxomè'], ['patrimoine']),
      makeEntry('Source historique', 'Une source historique donne des informations sur le passé.', 'Elle peut être écrite, orale, matérielle ou visuelle.', ['document ancien'], ['preuve']),
      makeEntry('Patrimoine', 'Le patrimoine est l’héritage culturel ou naturel reçu des générations passées.', 'Il peut être protégé et transmis.', ['musée', 'monument'], ['culture']),
    ],
  },
  {
    id: 'litterature', title: 'Littérature', color: 'red', description: 'Textes, romans, contes, poésie et expression.',
    entries: [
      makeEntry('Conte', 'Un conte est une histoire souvent imaginaire.', 'Il transmet une morale et peut mettre en scène des animaux ou personnages merveilleux.', ['conte africain'], ['récit']),
      makeEntry('Poésie', 'La poésie utilise les mots pour créer beauté, rythme et émotion.', 'Elle peut être récitée, chantée ou écrite.', ['poème', 'vers'], ['art']),
      makeEntry('Roman', 'Un roman est un long récit écrit en prose.', 'Il présente des personnages, actions et lieux.', ['roman d’aventure'], ['lecture']),
      makeEntry('Auteur', 'Un auteur est une personne qui écrit une œuvre.', 'Il peut écrire des contes, romans, poèmes ou pièces.', ['écrivain'], ['texte']),
      makeEntry('Personnage', 'Un personnage agit dans une histoire.', 'Il peut être principal ou secondaire.', ['héros', 'ami'], ['récit']),
    ],
  },
  {
    id: 'loisirs', title: 'Loisirs', color: 'lime', description: 'Jeux, détente, activités culturelles et sportives.',
    entries: [
      makeEntry('Jeu', 'Un jeu est une activité de détente avec des règles.', 'Il peut apprendre la coopération, la stratégie ou la mémoire.', ['jeu de cartes', 'jeu de société'], ['détente']),
      makeEntry('Lecture loisir', 'Lire pour le plaisir permet de découvrir des histoires.', 'Cela enrichit le vocabulaire et l’imagination.', ['lire un conte'], ['lecture']),
      makeEntry('Sport loisir', 'Le sport loisir se pratique pour le plaisir et la santé.', 'Il renforce le corps et l’esprit d’équipe.', ['football', 'course'], ['santé']),
      makeEntry('Excursion', 'Une excursion est une sortie pour découvrir un lieu.', 'Elle peut être éducative et amusante.', ['visite d’un musée'], ['découverte']),
      makeEntry('Créativité', 'La créativité permet d’inventer ou transformer des idées.', 'Elle se développe par le dessin, la musique, le bricolage ou l’écriture.', ['fabriquer un objet'], ['art']),
    ],
  },
  {
    id: 'management', title: 'Management', color: 'slate', description: 'Organisation, leadership, équipe et projet.',
    entries: [
      makeEntry('Leadership', 'Le leadership est la capacité à guider un groupe.', 'Un bon leader écoute, encourage et organise.', ['chef de groupe'], ['équipe']),
      makeEntry('Projet', 'Un projet est une action organisée pour atteindre un objectif.', 'Il a souvent des étapes, ressources et délais.', ['projet scolaire'], ['organisation']),
      makeEntry('Planification', 'La planification consiste à organiser les tâches dans le temps.', 'Elle aide à éviter l’improvisation.', ['calendrier d’activités'], ['gestion']),
      makeEntry('Équipe', 'Une équipe est un groupe de personnes qui travaillent ensemble.', 'La coopération permet de réussir plus facilement.', ['équipe pédagogique'], ['collaboration']),
      makeEntry('Décision', 'Une décision est un choix fait après réflexion.', 'Elle doit tenir compte des informations disponibles.', ['choisir une priorité'], ['pilotage']),
    ],
  },
  {
    id: 'medecine', title: 'Médecine', color: 'rose', description: 'Santé, maladies, soins, prévention et corps humain.',
    entries: [
      makeEntry('Fièvre', 'La fièvre est une température du corps plus élevée que la normale.', 'Elle peut indiquer une infection ou une maladie. Il faut surveiller et consulter si elle persiste.', ['température élevée'], ['santé']),
      makeEntry('Vaccin', 'Un vaccin aide le corps à se défendre contre une maladie.', 'Il prépare l’organisme à reconnaître un microbe.', ['vaccination infantile'], ['prévention']),
      makeEntry('Paludisme', 'Le paludisme est une maladie transmise par certains moustiques.', 'La moustiquaire imprégnée et l’assainissement aident à prévenir.', ['moustique anophèle'], ['Afrique']),
      makeEntry('Nutrition', 'La nutrition concerne les aliments nécessaires au corps.', 'Une bonne alimentation donne énergie, croissance et santé.', ['protéines', 'vitamines'], ['alimentation']),
      makeEntry('Premiers secours', 'Les premiers secours sont les gestes faits avant l’arrivée d’un spécialiste.', 'Ils peuvent protéger une personne blessée ou malade.', ['alerter', 'protéger'], ['urgence']),
    ],
  },
  {
    id: 'psychologie', title: 'Psychologie', color: 'purple', description: 'Pensées, émotions, comportement et apprentissage.',
    entries: [
      makeEntry('Attention', 'L’attention permet de se concentrer sur une tâche.', 'Elle est essentielle pour écouter, comprendre et mémoriser.', ['écouter la consigne'], ['apprentissage']),
      makeEntry('Mémoire', 'La mémoire permet de garder et retrouver des informations.', 'Elle se renforce par la répétition, le sommeil et l’entraînement.', ['apprendre une poésie'], ['cerveau']),
      makeEntry('Émotion', 'Une émotion est ce que l’on ressent dans une situation.', 'La joie, la peur, la colère et la tristesse sont des émotions.', ['être heureux'], ['sentiment']),
      makeEntry('Motivation', 'La motivation donne envie de faire un effort.', 'Elle augmente quand l’objectif est clair et accessible.', ['réussir un exercice'], ['effort']),
      makeEntry('Estime de soi', 'L’estime de soi est la valeur qu’on se donne.', 'Elle grandit quand on se sent capable et encouragé.', ['croire en soi'], ['confiance']),
    ],
  },
  {
    id: 'religions', title: 'Religions', color: 'yellow', description: 'Croyances, rites, valeurs et diversité spirituelle.',
    entries: [
      makeEntry('Religion', 'Une religion est un ensemble de croyances et de pratiques.', 'Elle peut organiser la relation au sacré, aux valeurs et à la communauté.', ['christianisme', 'islam', 'religions traditionnelles'], ['croyance']),
      makeEntry('Rite', 'Un rite est un geste ou une cérémonie répétée selon une tradition.', 'Il peut marquer une fête, une prière ou un passage important.', ['cérémonie'], ['tradition']),
      makeEntry('Tolérance', 'La tolérance consiste à respecter les croyances des autres.', 'Elle permet de vivre ensemble malgré les différences.', ['respect religieux'], ['paix']),
      makeEntry('Prière', 'La prière est une parole ou pensée adressée au divin.', 'Elle existe dans plusieurs religions.', ['prière collective'], ['spiritualité']),
      makeEntry('Fête religieuse', 'Une fête religieuse commémore un événement ou une valeur sacrée.', 'Elle rassemble souvent les familles et communautés.', ['Noël', 'Aïd'], ['culture']),
    ],
  },
  {
    id: 'sciences', title: 'Sciences', color: 'teal', description: 'Observation, expérience, matière, vie et méthodes scientifiques.',
    entries: [
      makeEntry('Expérience', 'Une expérience sert à vérifier une idée.', 'On observe, on teste et on conclut.', ['tester la flottabilité'], ['méthode']),
      makeEntry('Observation', 'Observer, c’est regarder attentivement pour comprendre.', 'Les scientifiques observent avant d’expliquer.', ['observer une plante'], ['science']),
      makeEntry('Matière', 'La matière compose les objets autour de nous.', 'Elle peut être solide, liquide ou gazeuse.', ['eau', 'air', 'bois'], ['physique']),
      makeEntry('Écosystème', 'Un écosystème regroupe des êtres vivants et leur milieu.', 'Chaque élément dépend souvent des autres.', ['mare', 'forêt'], ['SVT']),
      makeEntry('Force', 'Une force peut mettre un objet en mouvement ou le déformer.', 'Pousser ou tirer sont des actions de force.', ['pousser une table'], ['physique']),
    ],
  },
  {
    id: 'education', title: 'Éducation', color: 'emerald', description: 'École, apprentissage, pédagogie et réussite.',
    entries: [
      makeEntry('Apprentissage', 'L’apprentissage est le fait d’acquérir une connaissance ou une compétence.', 'Il se construit par l’écoute, l’activité, l’erreur et la correction.', ['apprendre à lire'], ['école']),
      makeEntry('Pédagogie', 'La pédagogie est l’art d’aider à apprendre.', 'Elle utilise des méthodes adaptées aux élèves.', ['travail de groupe'], ['enseignement']),
      makeEntry('Évaluation', 'L’évaluation vérifie ce que l’élève a compris.', 'Elle aide l’enseignant à accompagner et corriger.', ['devoir', 'interrogation'], ['notes']),
      makeEntry('Remédiation', 'La remédiation aide un élève à surmonter une difficulté.', 'Elle reprend les bases et propose des exercices adaptés.', ['soutien en lecture'], ['accompagnement']),
      makeEntry('Compétence', 'Une compétence est la capacité à utiliser ce qu’on sait dans une situation.', 'Elle combine connaissances, savoir-faire et attitudes.', ['résoudre un problème'], ['APC']),
    ],
  },
  {
    id: 'agriculture', title: 'Agriculture', color: 'green', description: 'Cultures, élevage, sols, eau et alimentation.',
    entries: [
      makeEntry('Culture vivrière', 'Une culture vivrière sert principalement à nourrir la population.', 'Elle comprend le maïs, le manioc, le riz, l’igname ou le haricot.', ['champ de maïs'], ['alimentation']),
      makeEntry('Élevage', 'L’élevage consiste à s’occuper des animaux domestiques.', 'Il donne viande, lait, œufs, fumier et revenus.', ['poules', 'chèvres'], ['animaux']),
      makeEntry('Irrigation', 'L’irrigation apporte de l’eau aux plantes.', 'Elle aide à cultiver même quand la pluie manque.', ['arrosage'], ['eau']),
      makeEntry('Semence', 'Une semence est une graine utilisée pour produire une plante.', 'Une bonne semence améliore la récolte.', ['graine de maïs'], ['plante']),
      makeEntry('Compost', 'Le compost est un engrais naturel fait avec des déchets organiques.', 'Il enrichit le sol et protège l’environnement.', ['feuilles mortes'], ['sol']),
    ],
  },
  {
    id: 'benin', title: 'Bénin', color: 'emerald', description: 'Histoire, géographie, culture et institutions du Bénin.',
    entries: [
      makeEntry('Porto-Novo', 'Porto-Novo est la capitale du Bénin.', 'Elle abrite des institutions et possède un riche patrimoine historique.', ['Assemblée nationale'], ['capitale']),
      makeEntry('Cotonou', 'Cotonou est la plus grande ville économique du Bénin.', 'On y trouve le port, des marchés, des administrations et de nombreuses entreprises.', ['Port de Cotonou'], ['ville']),
      makeEntry('Drapeau du Bénin', 'Le drapeau du Bénin est vert, jaune et rouge.', 'Ces couleurs symbolisent l’espoir, la richesse et le courage.', ['vert jaune rouge'], ['nation']),
      makeEntry('Vodun', 'Le Vodun est une religion et un patrimoine culturel important au Bénin.', 'Il fait partie de l’identité historique et culturelle du pays.', ['fête du Vodun'], ['culture']),
      makeEntry('Commune', 'Une commune est une collectivité locale.', 'Elle gère certains services de proximité pour la population.', ['mairie'], ['administration']),
    ],
  },
  {
    id: 'afrique', title: 'Afrique', color: 'orange', description: 'Continent africain, peuples, ressources, cultures et défis.',
    entries: [
      makeEntry('Continent', 'Un continent est une très grande terre entourée ou séparée par des océans.', 'L’Afrique est un continent riche en cultures, ressources et paysages.', ['Afrique de l’Ouest'], ['géographie']),
      makeEntry('Union africaine', 'L’Union africaine rassemble des pays africains.', 'Elle vise la coopération, la paix et le développement du continent.', ['UA'], ['politique']),
      makeEntry('Savane', 'La savane est un paysage de hautes herbes avec quelques arbres.', 'On y trouve beaucoup d’animaux dans certaines régions.', ['éléphants', 'antilopes'], ['nature']),
      makeEntry('Langues africaines', 'Les langues africaines portent l’histoire et la culture des peuples.', 'Elles sont importantes pour l’identité et l’apprentissage.', ['fon', 'yoruba', 'swahili'], ['culture']),
      makeEntry('Développement', 'Le développement améliore les conditions de vie.', 'Il concerne l’éducation, la santé, l’économie, l’environnement et la paix.', ['école', 'route'], ['société']),
    ],
  },
  {
    id: 'sport', title: 'Sport', color: 'blue', description: 'Activités physiques, santé, règles et esprit d’équipe.',
    entries: [
      makeEntry('Football', 'Le football est un sport collectif joué avec un ballon.', 'Il développe endurance, coopération et stratégie.', ['match inter-écoles'], ['EPS']),
      makeEntry('Athlétisme', 'L’athlétisme regroupe courir, sauter et lancer.', 'Il développe les qualités physiques de base.', ['course 60 m'], ['sport']),
      makeEntry('Échauffement', 'L’échauffement prépare le corps à l’effort.', 'Il réduit les risques de blessure.', ['petite course'], ['santé']),
      makeEntry('Fair-play', 'Le fair-play consiste à respecter l’adversaire et les règles.', 'Il est essentiel dans le sport et la vie sociale.', ['serrer la main'], ['valeur']),
      makeEntry('Endurance', 'L’endurance est la capacité à faire un effort longtemps.', 'Elle s’améliore par l’entraînement régulier.', ['course longue'], ['corps']),
    ],
  },
];

export default function KnowledgeHubScreen() {
  const goBack = useSmartBack();
  const [query, setQuery] = useState('');
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [selected, setSelected] = useState<{ theme: EncyclopediaTheme; entry: EncyclopediaEntry } | null>(null);
  const [quizTheme, setQuizTheme] = useState<EncyclopediaTheme | null>(null);
  const adminUnlocked = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const [customEntries, setCustomEntries] = useState<CustomEntry[]>(loadCustomEntries());
  const [customTerm, setCustomTerm] = useState('');
  const [customSimple, setCustomSimple] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [customVideo, setCustomVideo] = useState('');
  const activeTheme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const daily = useMemo(() => pickDailyToday(activeTheme.entries), [activeTheme]);
  // Tous les articles de toute l'encyclopédie (pour l'article du jour global + compteur)
  const globalEntries = useMemo(() => {
    const flat: { theme: EncyclopediaTheme; entry: EncyclopediaEntry }[] = [];
    for (const theme of THEMES) {
      const themeEntries: EncyclopediaEntry[] = [...theme.entries];
      for (const extra of [...(ENCYCLOPEDIA_EXTRA[theme.id] || []), ...(ENCYCLOPEDIA_EXTRA_2[theme.id] || []), ...(ENCYCLOPEDIA_EXTRA_3[theme.id] || []), ...(ENCYCLOPEDIA_PACK[theme.id] || [])]) {
        if (!themeEntries.some(b => b.term.toLowerCase() === extra.term.toLowerCase())) themeEntries.push(extra);
      }
      for (const entry of themeEntries) flat.push({ theme, entry });
    }
    return flat;
  }, []);
  const dailyArticle = useMemo(() => pickDailyToday(globalEntries), [globalEntries]);
  const entries = useMemo(() => {
    const base = [...activeTheme.entries];
    // Contenu étendu « façon Encarta » (3 vagues) : ajouté sans doublon par terme
    for (const extra of [...(ENCYCLOPEDIA_EXTRA[activeTheme.id] || []), ...(ENCYCLOPEDIA_EXTRA_2[activeTheme.id] || []), ...(ENCYCLOPEDIA_EXTRA_3[activeTheme.id] || []), ...(ENCYCLOPEDIA_PACK[activeTheme.id] || [])]) {
      if (!base.some(b => b.term.toLowerCase() === extra.term.toLowerCase())) base.push(extra);
    }
    const custom = customEntries.filter(e => e.themeId === activeTheme.id);
    for (const c of custom) {
      const idx = base.findIndex(b => b.term.toLowerCase() === c.term.toLowerCase());
      if (idx >= 0) base[idx] = c;
      else base.push(c);
    }
    const nq = normalizeSearch(query);
    if (!nq) return base;
    return base.filter(entry => normalizeSearch(`${entry.term} ${entry.simple} ${entry.details} ${entry.keywords.join(' ')} ${entry.examples.join(' ')}`).includes(nq));
  }, [activeTheme, query, customEntries]);

  const customHere = customEntries.filter(e => e.themeId === activeTheme.id);

  useEffect(() => { warmVoices(); }, []);

  function speakDaily(entry: EncyclopediaEntry) {
    speakText(`${entry.term}. ${entry.simple} ${entry.details}`);
  }

  function saveCustom() {
    if (!customTerm.trim()) return alert('Ajoutez le mot ou la notion.');
    const entry: CustomEntry = { themeId: activeTheme.id, term: customTerm.trim(), simple: customSimple, details: customDetails, examples: [], keywords: [], imageUrl: customImage, videoUrl: customVideo };
    const next = [...customEntries.filter(e => !(e.themeId === activeTheme.id && e.term.toLowerCase() === entry.term.toLowerCase())), entry];
    setCustomEntries(next); saveCustomEntries(next);
    setCustomTerm(''); setCustomSimple(''); setCustomDetails(''); setCustomImage(''); setCustomVideo('');
  }

  function deleteCustom(term: string) {
    if (!confirm(`Supprimer la notion « ${term} » ?`)) return;
    const next = customEntries.filter(e => !(e.themeId === activeTheme.id && e.term.toLowerCase() === term.toLowerCase()));
    setCustomEntries(next); saveCustomEntries(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Encyclopédie MSP</h1><p className="text-emerald-100 text-sm">9 domaines et 24 thématiques, avec images et vidéos</p></div>
        </div>
      </header>
      <main className="p-4 pb-24 max-w-6xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="font-black text-gray-900">L’encyclopédie francophone de Master Soutien Pédagogique</h2>
          <p className="text-gray-500 text-sm mt-1">Plus de <strong className="text-gray-700">{globalEntries.length}</strong> articles rédigés dans les 9 domaines et {THEMES.length} thématiques, pour enrichir les cours et la culture générale.</p>
          <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un mot, une notion, un exemple..." className="w-full pl-10 pr-4 py-3 border rounded-lg" /></div>
        </section>
        {dailyArticle && (
          <section className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase text-emerald-100">Article du jour — {dailyArticle.theme.title}</p>
                <p className="text-xl font-black truncate">{dailyArticle.entry.term}</p>
                <p className="text-sm text-emerald-50 line-clamp-2">{dailyArticle.entry.simple}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {isSpeechSupported() && (
                  <button onClick={() => speakText(`${dailyArticle.entry.term}. ${dailyArticle.entry.simple} ${dailyArticle.entry.details}`)} className="bg-white/20 p-2.5 rounded-full" title="Écouter l’article">
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setSelected({ theme: dailyArticle.theme, entry: dailyArticle.entry })} className="bg-white text-emerald-700 px-3 py-2 rounded-lg text-sm font-bold">
                  Lire l’article
                </button>
              </div>
            </div>
          </section>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">{THEMES.map(theme => <button key={theme.id} onClick={() => { setThemeId(theme.id); setSelected(null); }} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm ${themeId === theme.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>{theme.title}</button>)}</div>
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-gray-900">{activeTheme.title} <span className="text-sm font-normal text-gray-400 ml-1">({entries.length} notion{entries.length > 1 ? 's' : ''})</span></h2>
              <p className="text-gray-500 text-sm">{activeTheme.description}</p>
              {ENCARTA_DOMAINS[activeTheme.id] && (
                <p className="inline-flex items-center gap-1 mt-1.5 bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded">
                  📚 Domaine : {ENCARTA_DOMAINS[activeTheme.id]}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setQuizTheme(activeTheme)}
                className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                title="Quiz sur cette thématique (5 questions)"
              >
                🎓 <span className="hidden sm:inline">Quiz</span>
              </button>
              <button
                onClick={() => printFlashcards(entries.map(e => ({ title: e.term, subtitle: activeTheme.title, body: `${e.simple}${e.examples[0] ? ' Ex. : ' + e.examples[0] : ''}` })), { title: `Notions — ${activeTheme.title}`, subtitle: 'Cartes à découper pour la classe. Faites définir chaque notion par les élèves.' })}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                title="Imprimer les cartes de cette thématique"
              >
                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimer</span>
              </button>
            </div>
          </div>
          {daily && (
            <div className="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <span className="text-2xl">📌</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-700 uppercase">Notion du jour</p>
                <p className="font-black text-gray-900">{daily.term}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{daily.simple}</p>
              </div>
              {isSpeechSupported() && (
                <button onClick={() => speakDaily(daily)} className="bg-amber-400 text-amber-950 p-2.5 rounded-full shrink-0" title="Écouter la notion">
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </section>
        {adminUnlocked && <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-900">Gestion du contenu</h2>
          {adminUnlocked && <div className="mt-3 grid gap-2"><input value={customTerm} onChange={e => setCustomTerm(e.target.value)} placeholder="Mot ou notion" className="p-3 border rounded-lg" /><input value={customSimple} onChange={e => setCustomSimple(e.target.value)} placeholder="Définition simple" className="p-3 border rounded-lg" /><textarea value={customDetails} onChange={e => setCustomDetails(e.target.value)} placeholder="Explication détaillée" rows={3} className="p-3 border rounded-lg" /><input value={customImage} onChange={e => setCustomImage(e.target.value)} placeholder="Lien image" className="p-3 border rounded-lg" /><input value={customVideo} onChange={e => setCustomVideo(e.target.value)} placeholder="Lien vidéo YouTube/Facebook/TikTok" className="p-3 border rounded-lg" /><button onClick={saveCustom} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold"><Plus className="w-4 h-4 inline mr-1" /> Ajouter / modifier</button>
            {customHere.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t pt-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Notions personnalisées de cette thématique ({customHere.length})</p>
                {customHere.map(c => (
                  <div key={c.term} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                    <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{c.term}</p>
                    <button onClick={() => deleteCustom(c.term)} className="text-red-500 p-1.5" title="Supprimer cette notion"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </section>}
        {query && <p className="text-sm text-gray-500 mb-2">🔎 {entries.length} résultat{entries.length > 1 ? 's' : ''} pour « {query} »</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{entries.map(entry => <button key={entry.term} onClick={() => setSelected({ theme: activeTheme, entry })} className="bg-white rounded-2xl shadow text-left overflow-hidden"><img src={imageUrl(activeTheme.title, entry)} alt={entry.term} className="w-full h-32 object-cover bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /><div className="p-4"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-600" /><h3 className="font-black text-gray-900">{entry.term}</h3></div><p className="text-gray-600 text-sm mt-2 line-clamp-3">{entry.simple}</p><span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold mt-3"><ImageIcon className="w-4 h-4" /> Image {entry.videoUrl || resolveVideo(activeTheme.id, entry.term, entry.videoUrl).embed ? '+ vidéo' : ''}</span></div></button>)}</div>
      </main>
      {selected && <EntryModal theme={selected.theme} entry={selected.entry} onClose={() => setSelected(null)} />}
      {quizTheme && <ThemeQuizModal theme={quizTheme} entries={entries} onClose={() => setQuizTheme(null)} />}
    </div>
  );
}

function EntryModal({ theme, entry, onClose }: { theme: EncyclopediaTheme; entry: EncyclopediaEntry; onClose: () => void }) {
  const { speaking, speak, stop } = useTextToSpeech();
  const { embed, generic } = resolveVideo(theme.id, entry.term, entry.videoUrl);
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const readText = `${entry.term}. ${entry.simple} ${entry.details}${entry.examples.length ? ' Exemples : ' + entry.examples.join(', ') : ''}`;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <img src={imageUrl(theme.title, entry)} alt={entry.term} className="w-full h-56 object-cover bg-gray-100" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/90 p-2 rounded-lg"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-5">
          <p className="text-emerald-700 font-bold text-sm">{theme.title}</p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-gray-900">{entry.term}</h2>
            {isSpeechSupported() && (
              <button
                onClick={() => (speaking ? stop() : speak(readText))}
                className={`p-2.5 rounded-full ${speaking ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}
                title={speaking ? 'Arrêter la lecture' : 'Écouter la notion'}
              >
                {speaking ? <Square className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            )}
          </div>
          <p className="text-lg font-semibold text-gray-700 mt-3">{entry.simple}</p>
          <p className="text-gray-600 mt-3 leading-relaxed">{entry.details}</p>
          <h3 className="font-bold text-gray-900 mt-4 mb-2">Exemples</h3>
          <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">{entry.examples.map(ex => <li key={ex}>{ex}</li>)}</ul>
          {embed && online ? (
            <div className="mt-5">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <iframe src={embed} title={entry.term} className="w-full h-full" allowFullScreen />
              </div>
              {generic && <p className="text-[11px] text-gray-400 mt-1.5">🎬 Vidéo d’illustration en ligne — nécessite une connexion internet. Vous pouvez ajouter une vidéo précise via l’administration.</p>}
            </div>
          ) : embed ? (
            <div className="mt-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center text-gray-500 text-sm">
              📡 Vidéo disponible en ligne mais vous êtes actuellement hors connexion.
            </div>
          ) : (
            <div className="mt-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center text-gray-500 text-sm">
              🎬 Aucune vidéo associée pour le moment — l’administrateur peut en ajouter une (lien YouTube/Facebook/TikTok).
            </div>
          )}
          <button onClick={onClose} className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">J’ai compris</button>
        </div>
      </div>
    </div>
  );
}

/** Quiz d'une thématique : 5 questions « définition → terme », 100 % hors-ligne. */
function ThemeQuizModal({ theme, entries, onClose }: { theme: EncyclopediaTheme; entries: EncyclopediaEntry[]; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pool = useMemo(() => entries.map(e => ({ word: e.term, definition: e.simple, example: e.examples[0] || '' })), [entries]);
  const questions = useMemo(() => generateQuiz(pool, 5, `${theme.id}-${attempt}`), [pool, theme.id, attempt]);
  const question = questions[index];
  const bestKey = `msp_ency_quiz_${theme.id}`;
  const [best, setBest] = useState(() => loadBestScore(bestKey));

  function pick(opt: string) {
    if (!question || picked) return;
    setPicked(opt);
    if (opt === question.correct) {
      const s = score + 1;
      setScore(s);
      setBest(Math.max(best, s));
      saveBestScore(s, bestKey);
    }
  }

  function next() {
    if (index + 1 >= questions.length) setDone(true);
    else { setIndex(index + 1); setPicked(null); }
  }

  function replay() {
    setAttempt(a => a + 1);
    setIndex(0); setScore(0); setPicked(null); setDone(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900">🎓 Quiz — {theme.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        {!done && question ? (
          <>
            <p className="text-xs font-bold text-emerald-700 uppercase mb-2">Question {index + 1} / {questions.length}</p>
            <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-4">
              {isSpeechSupported() && (
                <button onClick={() => speakText(`${question.definition}${question.example ? ' Exemple : ' + question.example : ''}`)} className="bg-amber-100 text-amber-800 p-2.5 rounded-full shrink-0" title="Écouter">
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
              <div>
                <p className="font-semibold text-gray-800 text-lg">{question.definition}</p>
                {question.example && <p className="text-sm text-gray-500 mt-1">Exemple : {question.example}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {question.options.map(opt => {
                const isCorrect = opt === question.correct;
                const revealed = picked !== null;
                const good = revealed && isCorrect;
                const bad = revealed && picked === opt && !isCorrect;
                return (
                  <button
                    key={opt}
                    onClick={() => pick(opt)}
                    disabled={revealed}
                    className={`p-3 rounded-xl border-2 font-bold text-left transition-colors ${good ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : bad ? 'bg-red-50 border-red-400 text-red-700' : revealed ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400'}`}
                  >
                    {opt} {good && '✅'} {bad && '❌'}
                  </button>
                );
              })}
            </div>
            {picked && (
              <button onClick={next} className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">
                {index + 1 >= questions.length ? 'Voir mon résultat' : 'Question suivante'}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-5xl font-black text-emerald-700">{score} / {questions.length}</p>
            <p className="font-bold text-gray-800 mt-2 text-lg">{quizMessage(score, questions.length)}</p>
            <p className="text-gray-500 text-sm mt-1">Meilleur score sur cette thématique : {best}/5</p>
            <div className="flex gap-2 mt-4">
              <button onClick={replay} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Rejouer</button>
              <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
