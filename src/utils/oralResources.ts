import { normalizeSearch } from './textSearch';
import {
  addResource, deleteResource, generateResourceId, getResourcesByCategory,
  type ResourceItem,
} from './resourcesDB';

export type OralResourceKind = 'poesie' | 'chant' | 'comptine' | 'conte';
export type OralMediaKind = 'audio' | 'video';

export const ORAL_KIND_LABELS: Record<OralResourceKind, string> = {
  poesie: 'Poésie',
  chant: 'Chant',
  comptine: 'Comptine',
  conte: 'Conte',
};

export const ORAL_LEVELS = ['Maternelle', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'Tous niveaux'] as const;
export type OralLevel = typeof ORAL_LEVELS[number];

export interface OralResource {
  id: string;
  title: string;
  kind: OralResourceKind;
  level: string;
  language: string;
  theme: string;
  duration: string;
  objective: string;
  text: string;
  author: string;
  /** Types de médias attendus pour une ressource créée sans texte ou après ajout local. */
  mediaKinds?: OralMediaKind[];
  isBuiltin: boolean;
  createdAt: number;
}

export type NewOralResource = Pick<OralResource,
  'title' | 'kind' | 'level' | 'language' | 'theme' | 'duration' | 'objective' | 'text' | 'author'>
  & { mediaKinds?: OralMediaKind[] };

/** Ressources intégrées hors connexion : créations MSP, adaptations pédagogiques et comptines traditionnelles francophones. */
export const BUILTIN_ORAL_RESOURCES: OralResource[] = [
  {
    id: 'oral-poesie-baobab', title: 'Le petit baobab', kind: 'poesie', level: 'Maternelle',
    language: 'Français', theme: 'Nature', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Mémoriser un poème court et articuler les sons « b » et « a ».', isBuiltin: true, createdAt: 0,
    text: 'Petit baobab du village,\nTu regardes passer les nuages.\nTes grandes branches font un toit,\nLes oiseaux chantent près de toi.\nQuand la pluie caresse la terre,\nTu bois l’eau et tu restes fier.\nPetit baobab, arbre géant,\nTu gardes nos jeux longtemps.',
  },
  {
    id: 'oral-poesie-voyelles', title: 'La ronde des voyelles', kind: 'poesie', level: 'CP',
    language: 'Français', theme: 'Alphabet', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Reconnaître et prononcer les cinq voyelles dans des mots familiers.', isBuiltin: true, createdAt: 0,
    text: 'A ouvre grand ses bras : « Ah ! »\nE sourit et dit : « Hé ! »\nI se dresse, fin et droit,\nO fait un rond autour de soi.\nU rassemble ses amis ;\nLes cinq voyelles sont réunies.\nA, E, I, O, U,\nElles chantent dans les mots lus !',
  },
  {
    id: 'oral-poesie-ecole', title: 'Mon école au matin', kind: 'poesie', level: 'CE1',
    language: 'Français', theme: 'École', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Lire avec expression et relever les images liées à l’école.', isBuiltin: true, createdAt: 0,
    text: 'Le matin, la cour s’éveille,\nUn balai danse au soleil.\nLes cahiers ouvrent leurs pages,\nLes crayons tracent un voyage.\nUne question, une réponse,\nEt chacun grandit, pense.\nDans l’école où l’on partage,\nChaque jour devient un message.',
  },
  {
    id: 'oral-chant-bonjour', title: 'Bonjour, soleil !', kind: 'chant', level: 'Maternelle',
    language: 'Français', theme: 'Rituel du matin', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Installer un rituel de salutation et suivre une pulsation simple.', isBuiltin: true, createdAt: 0,
    text: 'Refrain :\nBonjour, bonjour, soleil du matin,\nBonjour les amis, tendons-nous la main !\n\nCouplet :\nLa classe s’éveille, les sourires aussi,\nNous sommes prêts pour apprendre aujourd’hui.\n\nRefrain :\nBonjour, bonjour, soleil du matin,\nBonjour les amis, tendons-nous la main !',
  },
  {
    id: 'oral-chant-nombres', title: 'Les nombres en cadence', kind: 'chant', level: 'CP',
    language: 'Français', theme: 'Numération', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Réciter la suite numérique de 1 à 10 en marquant un rythme régulier.', isBuiltin: true, createdAt: 0,
    text: 'Un, deux, trois, frappons dans nos mains,\nQuatre, cinq, six, avançons bien.\nSept et huit, tournons tout doucement,\nNeuf et dix, sourions maintenant !\n\nRefrain :\nJe compte, tu comptes, on compte ensemble,\nUn pas après l’autre, la classe rassemble !',
  },
  {
    id: 'oral-chant-jardin', title: 'Notre école est un jardin', kind: 'chant', level: 'CE1',
    language: 'Français', theme: 'Environnement', duration: '2 min', author: 'Création pédagogique MSP',
    objective: 'Évoquer le soin des plantes et chanter en groupe avec un refrain.', isBuiltin: true, createdAt: 0,
    text: 'Refrain :\nNotre école est un jardin,\nChaque élève y prend soin.\nUne graine, un peu d’eau,\nEt demain poussera beau !\n\nCouplet :\nJe garde la cour propre et claire,\nJe protège les jeunes pousses vertes.\nAvec mes amis, jour après jour,\nNous faisons grandir notre cour.',
  },
  {
    id: 'oral-comptine-pas', title: 'Un, deux, trois petits pas', kind: 'comptine', level: 'Maternelle',
    language: 'Français', theme: 'Motricité', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Associer les nombres jusqu’à cinq à un geste ou un déplacement.', isBuiltin: true, createdAt: 0,
    text: 'Un petit pas,\nDeux petits pas,\nTrois pas tout droit,\nQuatre pas tout bas.\nCinq pas en rond,\nNous nous arrêtons !\nOn respire doucement,\nEt l’on repart en chantant.',
  },
  {
    id: 'oral-comptine-couleurs', title: 'Les couleurs du marché', kind: 'comptine', level: 'CI',
    language: 'Français', theme: 'Couleurs', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Nommer les couleurs et enrichir le vocabulaire du quotidien.', isBuiltin: true, createdAt: 0,
    text: 'Rouge est la tomate,\nJaune est le maïs,\nVertes sont les feuilles,\nOrange est la papaye.\nAu marché du matin,\nJe regarde les couleurs,\nJe dis leur nom tout haut,\nEt je les garde dans mon cœur.',
  },
  {
    id: 'oral-comptine-jours', title: 'Les jours de la semaine', kind: 'comptine', level: 'CP',
    language: 'Français', theme: 'Temps', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Mémoriser l’ordre des jours de la semaine.', isBuiltin: true, createdAt: 0,
    text: 'Lundi ouvre le chemin,\nMardi lui prend la main.\nMercredi tourne la page,\nJeudi poursuit le voyage.\nVendredi dit : « À bientôt ! »\nSamedi joue, dimanche se repose.\nPuis lundi revient, tout nouveau,\nEt la semaine recommence en rose.',
  },
  {
    id: 'oral-conte-graine', title: 'La graine qui attendait la pluie', kind: 'conte', level: 'Maternelle',
    language: 'Français', theme: 'Nature et patience', duration: '3 min', author: 'Création pédagogique MSP',
    objective: 'Écouter une histoire courte et raconter les étapes de la pousse.', isBuiltin: true, createdAt: 0,
    text: 'Dans un petit jardin, une graine dormait sous la terre. Chaque matin, elle demandait : « Quand vais-je grandir ? » Le soleil lui répondait : « Prends ton temps, petite graine. »\n\nUn jour, la pluie tomba doucement. L’eau entra dans la terre et réveilla la graine. Elle poussa une petite racine, puis une tige. Quelques jours plus tard, deux feuilles vertes apparurent.\n\nLa graine sourit : « J’ai grandi parce que la pluie m’a aidée, mais j’ai aussi attendu et travaillé. » Depuis ce jour, les enfants arrosent le jardin avec soin.',
  },
  {
    id: 'oral-conte-lievre-cameleon', title: 'Le lièvre et le caméléon', kind: 'conte', level: 'CE2',
    language: 'Français', theme: 'Patience et coopération', duration: '4 min', author: 'Création pédagogique MSP',
    objective: 'Dégager la leçon d’un récit et remettre ses actions dans l’ordre.', isBuiltin: true, createdAt: 0,
    text: 'Un matin, le lièvre annonça qu’il porterait seul tous les paniers jusqu’au village. « Je suis le plus rapide ! » dit-il. Le caméléon proposa de l’aider, mais le lièvre partit sans l’écouter.\n\nAu premier virage, les paniers glissèrent et roulèrent dans l’herbe. Le lièvre courut après l’un, puis l’autre, sans réussir à tout rattraper. Le caméléon, lui, avançait lentement et ramassait chaque panier avec méthode.\n\nQuand ils arrivèrent enfin, le lièvre reconnut son erreur. Le lendemain, ils partirent ensemble : le lièvre portait les paniers légers et le caméléon vérifiait le chemin. Ils arrivèrent plus tôt et sans rien perdre.\n\nMoralité : la vitesse aide, mais l’entraide et l’attention font réussir le travail.',
  },
  {
    id: 'oral-conte-pont', title: 'Le pont des bonnes paroles', kind: 'conte', level: 'CM1',
    language: 'Français', theme: 'Respect et dialogue', duration: '5 min', author: 'Création pédagogique MSP',
    objective: 'Analyser un conflit simple et proposer une résolution par le dialogue.', isBuiltin: true, createdAt: 0,
    text: 'Deux quartiers étaient séparés par un petit ruisseau. Pendant la saison des pluies, le passage devenait difficile. Kossi voulait construire un pont en bois. Awa préférait attendre que l’eau baisse. Chacun défendait son idée sans écouter l’autre.\n\nUn jour, une vieille planche tomba dans le courant. Les voisins se réunirent. Awa proposa d’abord de choisir un endroit sûr ; Kossi dessina ensuite un plan avec les adultes. Les enfants ramassèrent les branches, les artisans préparèrent les planches, et tout le quartier participa.\n\nLe pont fut solide parce que chacun avait apporté une idée et un effort. Sur la première planche, ils écrivirent : « On avance mieux quand on s’écoute. »\n\nDepuis, les habitants traversent le ruisseau et se rappellent que le dialogue peut relier ce que la colère sépare.',
  },
  {
    id: 'oral-poesie-dantokpa', title: 'Au marché de Dantokpa', kind: 'poesie', level: 'CE1',
    language: 'Français', theme: 'Marché et vocabulaire', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Lire un poème descriptif et nommer les produits du marché.', isBuiltin: true, createdAt: 0,
    text: `Au marché, les paniers voyagent,\nLe maïs jaune brille à l’étal.\nLes tomates rougissent les pages\nDu grand livre du jour matinal.\n\nUne vendeuse compte ses oranges,\nUn enfant porte un petit panier.\nLes voix se croisent, les couleurs changent,\nChacun apprend à bien partager.`,
  },
  {
    id: 'oral-poesie-nokoue', title: 'Au bord du lac Nokoué', kind: 'poesie', level: 'CE2',
    language: 'Français', theme: 'Eau et environnement', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Repérer les images poétiques et formuler un geste de protection de l’eau.', isBuiltin: true, createdAt: 0,
    text: `Le lac se réveille avec le jour,\nUne pirogue glisse sans bruit.\nLes pêcheurs partent avec courage,\nLes oiseaux dessinent dans le ciel gris.\n\nGardons l’eau claire et les rives propres,\nNe jetons rien dans le courant.\nLe lac nourrit les familles,\nProtégeons-le dès maintenant.`,
  },
  {
    id: 'oral-poesie-atacora', title: 'Les collines de l’Atacora', kind: 'poesie', level: 'CM1',
    language: 'Français', theme: 'Paysages du Bénin', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Lire avec intonation et relever le champ lexical du paysage.', isBuiltin: true, createdAt: 0,
    text: `Au nord, les collines touchent le ciel,\nLe vent raconte un long chemin.\nLa pierre garde la chaleur du soleil,\nLe village s’éveille au matin.\n\nLa terre est belle quand on la respecte,\nLes arbres offrent leur ombre aux voyageurs.\nMarchons doucement, observons, apprenons :\nNotre pays grandit dans nos cœurs.`,
  },
  {
    id: 'oral-poesie-pluie-cotonou', title: 'La pluie sur Cotonou', kind: 'poesie', level: 'CP',
    language: 'Français', theme: 'Saison des pluies', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Réciter un poème court en marquant les répétitions et les sons « pl ».', isBuiltin: true, createdAt: 0,
    text: `Ploc, ploc, la pluie arrive,\nElle rafraîchit notre cour.\nPloc, ploc, l’eau vive,\nLes fleurs boivent à leur tour.\n\nQuand le ciel redevient clair,\nUn arc coloré paraît.\nNous rangeons bien nos affaires\nEt reprenons le chemin frais.`,
  },
  {
    id: 'oral-chant-koklo-kouassi', title: 'Le coq a chanté (Koklo Kouassi)', kind: 'chant', level: 'Maternelle',
    language: 'Français', theme: 'Rituel du matin, tradition béninoise', duration: '1 min', author: 'Adaptation française originale MSP; paroles traditionnelles non reproduites',
    objective: 'Chanter un refrain de réveil, suivre la pulsation et découvrir un repère de répertoire béninois.', isBuiltin: true, createdAt: 0,
    text: `Le coq a chanté, le jour se lève,\nLa cour s’éclaire, la classe s’éveille.\nLes enfants saluent leurs amis,\nEt disent bonjour à la vie.\n\nRefrain :\nCocorico, le matin est là !\nCocorico, chantons tous en joie !`,
  },
  {
    id: 'oral-chant-tchou-gbovi', title: 'Dors, petit gbovi (adaptation française)', kind: 'chant', level: 'Maternelle',
    language: 'Français', theme: 'Berceuse, tradition béninoise', duration: '1 min', author: 'Création MSP; adaptation française libre, à valider avec un locuteur fon',
    objective: 'Écouter une berceuse douce et jouer sur les nuances de la voix.', isBuiltin: true, createdAt: 0,
    text: `Dors, petit, la nuit est douce,\nLa lune veille au-dessus de nous.\nMaman fredonne, le vent se tait,\nDemain le soleil te sourira.\n\nDors, petit, ferme les yeux,\nLe jour reviendra lumineux.`,
  },
  {
    id: 'oral-chant-ayo-matin', title: 'Ayo, le jour se lève', kind: 'chant', level: 'CI',
    language: 'Français', theme: 'Accueil et rythme', duration: '1 min', author: 'Création pédagogique MSP; refrain original inspiré du répertoire de jeux chantés africains',
    objective: 'Chanter en groupe avec un appel-réponse et un rythme frappé.', isBuiltin: true, createdAt: 0,
    text: `Appel : Ayo, ayo, qui vient dans la cour ?\nRéponse : Nous venons apprendre et chanter chaque jour !\n\nLe soleil dore le grand palmier,\nLes amis se mettent en cercle.\nUn pas à gauche, un pas à droite,\nNos voix joyeuses se rassemblent.\n\nAppel : Ayo, ayo, qui vient dans la cour ?\nRéponse : Nous venons apprendre et chanter chaque jour !`,
  },
  {
    id: 'oral-chant-ronde-voisins', title: 'La ronde des voisins', kind: 'chant', level: 'CE1',
    language: 'Français', theme: 'Solidarité et vie en communauté', duration: '2 min', author: 'Création pédagogique MSP',
    objective: 'Interpréter un refrain collectif et évoquer l’entraide dans le quartier.', isBuiltin: true, createdAt: 0,
    text: `Refrain :\nVoisin, voisine, ouvrons le chemin,\nUn geste, un sourire, et l’on va plus loin.\n\nAu puits, au champ, dans la cour de l’école,\nChacun peut aider, chacun a son rôle.\nQuand nous partageons le travail du jour,\nLe quartier répond par un chant d’amour.\n\nRefrain :\nVoisin, voisine, ouvrons le chemin,\nUn geste, un sourire, et l’on va plus loin.`,
  },
  {
    id: 'oral-comptine-doigts-dantokpa', title: 'Les doigts au marché', kind: 'comptine', level: 'Maternelle',
    language: 'Français', theme: 'Dénombrement et gestes', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Associer les nombres de un à cinq à des gestes et des produits familiers.', isBuiltin: true, createdAt: 0,
    text: `Un doigt choisit une mangue,\nDeux doigts portent le panier,\nTrois doigts comptent les oranges,\nQuatre doigts vont les ranger.\nCinq doigts saluent la vendeuse :\n« Merci, à bientôt, bonne journée ! »`,
  },
  {
    id: 'oral-comptine-calebasse', title: 'La calebasse compte', kind: 'comptine', level: 'CI',
    language: 'Français', theme: 'Numération et partage', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Réciter la suite numérique et partager une collection équitablement.', isBuiltin: true, createdAt: 0,
    text: `Une calebasse pour compter,\nDeux petites mains pour partager.\nTrois graines dans le panier,\nQuatre amis pour les semer.\nCinq pousses au bord du champ,\nNous les soignons doucement.`,
  },
  {
    id: 'oral-comptine-pluie', title: 'Toc, toc, la pluie', kind: 'comptine', level: 'Maternelle',
    language: 'Français', theme: 'Météo et écoute', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Imiter différents sons de la pluie et distinguer fort/doux.', isBuiltin: true, createdAt: 0,
    text: `Toc, toc, sur le toit,\nLa pluie chante tout bas.\nPlic, plac, dans la cour,\nElle danse à son tour.\nQuand le soleil revient,\nNous marchons sur le chemin.`,
  },
  {
    id: 'oral-comptine-zemidjan', title: 'Le zem de Zinsou', kind: 'comptine', level: 'CP',
    language: 'Français', theme: 'Déplacements et sécurité routière', duration: '1 min', author: 'Création pédagogique MSP',
    objective: 'Mémoriser quelques règles simples de sécurité sur le trajet scolaire.', isBuiltin: true, createdAt: 0,
    text: `Le zem s’arrête au carrefour,\nZinsou regarde avant son tour.\nÀ gauche, à droite, il prend le temps,\nIl traverse avec les grands.\n\nCasque attaché, sac bien fermé,\nSur la route, on reste attentif.\nPour aller à l’école en sécurité,\nChaque geste compte, chaque enfant est actif.`,
  },
  {
    id: 'oral-conte-yevi-tambour', title: 'Yèyi et le tambour partagé', kind: 'conte', level: 'Maternelle',
    language: 'Français', theme: 'Partage et conte animalier', duration: '3 min', author: 'Création pédagogique MSP, récit original inspiré de motifs de tradition orale',
    objective: 'Écouter un conte court et identifier le geste de partage.', isBuiltin: true, createdAt: 0,
    text: `Un jour, Yèyi la tortue trouva un petit tambour près du grand arbre. Elle le posa devant sa maison et joua toute seule.\n\nGolo le singe entendit le son. « Puis-je jouer aussi ? » demanda-t-il. Yèyi répondit : « Non, c’est mon tambour. » Golo repartit tristement.\n\nLe lendemain, Yèyi voulut porter une grande calebasse, mais elle était trop lourde. Golo revint et l’aida. Alors Yèyi lui prêta le tambour. Ils inventèrent un rythme à deux : boum, tchak, boum !\n\nLes enfants du village les rejoignirent. Depuis ce jour, le tambour résonne pour tous. Yèyi comprit qu’un jeu partagé apporte plus de joie qu’un trésor gardé seul.`,
  },
  {
    id: 'oral-conte-golo-mangues', title: 'Golo et les mangues de Nokoué', kind: 'conte', level: 'CE1',
    language: 'Français', theme: 'Honnêteté et conséquences', duration: '4 min', author: 'Création pédagogique MSP, récit original inspiré de motifs de tradition orale',
    objective: 'Reconstituer les actions du récit et discuter de l’honnêteté.', isBuiltin: true, createdAt: 0,
    text: `Golo le singe aperçut un panier de mangues près d’une pirogue. Le panier appartenait à Sika, qui était partie chercher de l’eau. Golo prit une mangue et la mangea vite.\n\nQuand Sika revint, elle compta ses fruits et remarqua qu’il en manquait un. Golo dit : « Je n’ai rien vu. » Mais une petite graine jaune était restée collée à sa joue.\n\nGolo rougit. Il avoua son geste et proposa d’aider Sika à cueillir d’autres mangues. Ensemble, ils remplirent le panier et en partagèrent une.\n\nMoralité : dire la vérité permet de réparer une erreur et de garder la confiance de ses amis.`,
  },
  {
    id: 'oral-conte-kemi-mais', title: 'Kemi et la graine de maïs', kind: 'conte', level: 'CE2',
    language: 'Français', theme: 'Patience, culture et observation', duration: '4 min', author: 'Création pédagogique MSP',
    objective: 'Ordonner les étapes d’une culture et relever les besoins d’une plante.', isBuiltin: true, createdAt: 0,
    text: `Kemi reçut une graine de maïs de sa grand-mère. Elle la planta dans un petit coin de terre et l’arrosa chaque jour.\n\nLe lendemain, elle creusa pour vérifier. La graine n’avait pas encore poussé. « Il faut lui laisser du temps », conseilla sa grand-mère. Kemi observa la terre, protégea la pousse du piétinement et continua de l’arroser sans excès.\n\nQuelques jours plus tard, une tige verte sortit de la terre. Kemi nota les changements dans son cahier : la graine avait besoin d’eau, de lumière et de temps.\n\nÀ la récolte, elle partagea les épis avec ses camarades et leur montra ses observations.`,
  },
  {
    id: 'oral-conte-poissons', title: 'La pirogue et le filet partagé', kind: 'conte', level: 'CM1',
    language: 'Français', theme: 'Coopération et ressources du lac', duration: '5 min', author: 'Création pédagogique MSP, récit original',
    objective: 'Dégager les étapes d’un récit et expliquer l’intérêt de la coopération.', isBuiltin: true, createdAt: 0,
    text: `Trois enfants trouvèrent un petit filet emmêlé près du lac. Chacun voulait le tirer seul. Plus ils tiraient, plus les nœuds se resserraient.\n\nMina proposa de s’arrêter et d’observer. Koffi tint le bord du filet, Awa défit les nœuds un à un, et Mina éclaira le travail avec une lampe. Bientôt, le filet fut libéré.\n\nUn pêcheur les remercia et leur expliqua que le lac nourrit des familles, mais que chacun doit le respecter : on ne jette pas de déchets dans l’eau et on ne prend pas plus que nécessaire.\n\nLes enfants rentrèrent fiers. Ils avaient compris qu’un problème se résout mieux quand on s’organise et qu’on protège ce que l’on partage.`,
  },
  {
    id: 'oral-chant-aube-nouvelle', title: 'L’Aube Nouvelle (hymne national — notice repère)', kind: 'chant', level: 'Tous niveaux',
    language: 'Français', theme: 'Rituel civique et levée des couleurs', duration: '3 min', author: 'Hymne national du Bénin — notice pédagogique MSP; paroles non reproduites',
    objective: 'Préparer l’écoute ou le chant collectif dans un rituel civique scolaire.', isBuiltin: true, createdAt: 0,
    text: 'Repère pour la classe : l’hymne national béninois accompagne les cérémonies scolaires et la levée des couleurs. Pour respecter la version officielle, cette notice ne reproduit ni paroles ni enregistrement. Importez un support dont votre établissement dispose et qu’il est autorisé à utiliser.',
  },
  {
    id: 'oral-chant-frere-jacques', title: 'Frère Jacques', kind: 'chant', level: 'Maternelle',
    language: 'Français', theme: 'Répertoire traditionnel francophone', duration: '1 min', author: 'Chanson traditionnelle francophone',
    objective: 'Chanter en canon simple et reconnaître la répétition d’un motif.', isBuiltin: true, createdAt: 0,
    text: `Frère Jacques, Frère Jacques,\nDormez-vous ? Dormez-vous ?\nSonnez les matines, sonnez les matines,\nDing, ding, dong. Ding, ding, dong.`,
  },
  {
    id: 'oral-chant-choux', title: 'Savez-vous planter les choux ?', kind: 'chant', level: 'Maternelle',
    language: 'Français', theme: 'Gestes et parties du corps', duration: '1 min', author: 'Chanson traditionnelle francophone',
    objective: 'Associer les paroles à des gestes et nommer des parties du corps.', isBuiltin: true, createdAt: 0,
    text: `Savez-vous planter les choux,\nÀ la mode, à la mode ?\nSavez-vous planter les choux,\nÀ la mode de chez nous ?\n\nOn les plante avec les mains,\nÀ la mode, à la mode ;\nOn les plante avec les mains,\nÀ la mode de chez nous.`,
  },
  {
    id: 'oral-comptine-souris-verte', title: 'Une souris verte', kind: 'comptine', level: 'Maternelle',
    language: 'Français', theme: 'Rimes et animaux', duration: '1 min', author: 'Comptine traditionnelle francophone',
    objective: 'Écouter les rimes et mémoriser une comptine courte.', isBuiltin: true, createdAt: 0,
    text: `Une souris verte,\nQui courait dans l’herbe,\nJe l’attrape par la queue,\nJe la montre à ces messieurs.\n\nCes messieurs me disent :\n« Trempez-la dans l’huile,\nTrempez-la dans l’eau,\nÇa fera un escargot tout chaud. »`,
  },
  {
    id: 'oral-comptine-clair-lune', title: 'Au clair de la lune', kind: 'comptine', level: 'CP',
    language: 'Français', theme: 'Rimes et récitation', duration: '1 min', author: 'Comptine traditionnelle francophone',
    objective: 'Réciter avec une bonne articulation et repérer les rimes.', isBuiltin: true, createdAt: 0,
    text: `Au clair de la lune,\nMon ami Pierrot,\nPrête-moi ta plume\nPour écrire un mot.\n\nMa chandelle est morte,\nJe n’ai plus de feu ;\nOuvre-moi ta porte,\nPour l’amour de Dieu.`,
  },
];

const CUSTOM_ORAL_KEY = 'msp_oral_resources_custom_v1';
export const ORAL_MEDIA_CATEGORY = 'arts-oraux' as const;
export const ORAL_MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export function getOralResources(): OralResource[] {
  return [...BUILTIN_ORAL_RESOURCES, ...loadCustomOralResources()];
}

export function loadCustomOralResources(): OralResource[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_ORAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OralResource =>
      item && typeof item.id === 'string' && typeof item.title === 'string'
      && typeof item.text === 'string'
      && (item.text.trim().length > 0 || (Array.isArray(item.mediaKinds) && item.mediaKinds.some((kind: string) => ['audio', 'video'].includes(kind))))
      && ['poesie', 'chant', 'comptine', 'conte'].includes(item.kind)
      && item.isBuiltin === false,
    );
  } catch {
    return [];
  }
}

/** Fusionne des ressources importées par leur identifiant sans effacer les autres appareils. */
export function mergeCustomOralResources(incoming: OralResource[]): { added: number; updated: number } {
  if (typeof localStorage === 'undefined') throw new Error('Le stockage local n’est pas disponible sur cet appareil.');
  const current = loadCustomOralResources();
  const map = new Map(current.map(resource => [resource.id, resource]));
  const builtinIds = new Set(BUILTIN_ORAL_RESOURCES.map(resource => resource.id));
  let added = 0;
  let updated = 0;
  for (const resource of incoming) {
    if (!resource || typeof resource.id !== 'string' || builtinIds.has(resource.id) || resource.isBuiltin) continue;
    const wasPresent = map.has(resource.id);
    const mediaKinds = [...new Set((resource.mediaKinds || []).filter(kind => kind === 'audio' || kind === 'video'))];
    map.set(resource.id, { ...resource, isBuiltin: false, mediaKinds, createdAt: Number(resource.createdAt) || Date.now() });
    if (wasPresent) updated++;
    else added++;
  }
  localStorage.setItem(CUSTOM_ORAL_KEY, JSON.stringify([...map.values()]));
  return { added, updated };
}

export function createOralResource(input: NewOralResource): OralResource {
  if (!input.title.trim()) throw new Error('Le titre est obligatoire.');
  const mediaKinds = [...new Set((input.mediaKinds || []).filter(kind => kind === 'audio' || kind === 'video'))];
  if (!input.text.trim() && mediaKinds.length === 0) throw new Error('Ajoutez un texte, un audio ou une vidéo.');
  const resource: OralResource = {
    ...input,
    id: generateResourceId(),
    isBuiltin: false,
    createdAt: Date.now(),
    title: input.title.trim(),
    text: input.text.trim(),
    mediaKinds,
    language: input.language.trim() || 'Français',
    theme: input.theme.trim() || 'Autre',
    author: input.author.trim() || 'Ressource de l’enseignant',
  };
  const custom = loadCustomOralResources();
  if (typeof localStorage === 'undefined') throw new Error('Le stockage local n’est pas disponible sur cet appareil.');
  localStorage.setItem(CUSTOM_ORAL_KEY, JSON.stringify([...custom, resource]));
  return resource;
}

export async function deleteOralResource(id: string): Promise<void> {
  const resource = loadCustomOralResources().find(item => item.id === id);
  if (!resource) return;
  const remaining = loadCustomOralResources().filter(item => item.id !== id);
  localStorage.setItem(CUSTOM_ORAL_KEY, JSON.stringify(remaining));
  await Promise.all([deleteOralMedia(id, 'audio'), deleteOralMedia(id, 'video')]);
}

export function filterOralResources(
  resources: OralResource[], query = '', kind: OralResourceKind | 'tout' = 'tout', level = 'Tous niveaux',
): OralResource[] {
  const q = normalizeSearch(query);
  return resources.filter(resource => {
    if (kind !== 'tout' && resource.kind !== kind) return false;
    if (level !== 'Tous niveaux' && resource.level !== 'Tous niveaux' && resource.level !== level) return false;
    const searchable = normalizeSearch([
      resource.title, resource.text, resource.kind, resource.level, resource.language,
      resource.theme, resource.objective, resource.author, resource.mediaKinds?.join(' '),
    ].join(' '));
    return !q || searchable.includes(q);
  });
}

function oralMediaId(resourceId: string, kind: OralMediaKind): string {
  return `oral-media-${resourceId}-${kind}`;
}

function inferredMimeType(file: File, kind: OralMediaKind): string {
  if (kind === 'audio' && file.type.toLowerCase().startsWith('audio/')) return file.type;
  if (kind === 'video' && file.type.toLowerCase().startsWith('video/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', opus: 'audio/opus', flac: 'audio/flac',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v', ogv: 'video/ogg', '3gp': 'video/3gpp',
  };
  return types[ext] || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4');
}

function allowedMediaFile(file: File, kind: OralMediaKind): boolean {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const audioExt = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'flac'];
  const videoExt = ['mp4', 'webm', 'mov', 'm4v', 'ogv', '3gp'];
  return kind === 'audio'
    ? mime.startsWith('audio/') || audioExt.includes(ext)
    : mime.startsWith('video/') || videoExt.includes(ext);
}

export function validateOralMediaFile(file: File, kind: OralMediaKind): string | null {
  if (file.size <= 0) return 'Le fichier est vide.';
  if (file.size > ORAL_MEDIA_MAX_BYTES) return 'Le fichier dépasse la limite de 50 Mo.';
  if (!allowedMediaFile(file, kind)) return kind === 'audio'
    ? 'Choisissez un fichier audio (MP3, WAV, OGG, M4A, AAC, OPUS ou FLAC).'
    : 'Choisissez une vidéo (MP4, WebM, MOV, M4V, OGV ou 3GP).';
  return null;
}

/** Les médias sont stockés localement dans IndexedDB pour rester lisibles hors connexion. */
export async function saveOralMedia(resourceId: string, kind: OralMediaKind, file: File): Promise<void> {
  const validationError = validateOralMediaFile(file, kind);
  if (validationError) throw new Error(validationError);

  const item: ResourceItem = {
    id: oralMediaId(resourceId, kind),
    category: ORAL_MEDIA_CATEGORY,
    kind: 'file',
    title: `${kind === 'audio' ? 'Audio' : 'Vidéo'} — ${resourceId}`,
    description: resourceId,
    fileName: file.name,
    mimeType: inferredMimeType(file, kind),
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };
  await addResource(item);
  setOralMediaKind(resourceId, kind, true);
}

export async function getOralMedia(resourceId: string, kind: OralMediaKind): Promise<ResourceItem | undefined> {
  const resources = await getResourcesByCategory(ORAL_MEDIA_CATEGORY);
  return resources.find(item => item.id === oralMediaId(resourceId, kind));
}

export async function deleteOralMedia(resourceId: string, kind: OralMediaKind): Promise<void> {
  await deleteResource(oralMediaId(resourceId, kind));
  setOralMediaKind(resourceId, kind, false);
}

/** Met à jour la liste des médias associés à une ressource personnelle. */
export function setOralMediaKind(resourceId: string, kind: OralMediaKind, attached: boolean): void {
  const custom = loadCustomOralResources();
  const resource = custom.find(item => item.id === resourceId);
  if (!resource) return; // Les ressources intégrées ne sont pas écrites dans les données personnelles.
  const mediaKinds = new Set(resource.mediaKinds || []);
  if (attached) mediaKinds.add(kind);
  else mediaKinds.delete(kind);
  const updated = { ...resource, mediaKinds: [...mediaKinds] };
  const next = updated.text.trim() || updated.mediaKinds?.length
    ? custom.map(item => item.id === resourceId ? updated : item)
    : custom.filter(item => item.id !== resourceId);
  localStorage.setItem(CUSTOM_ORAL_KEY, JSON.stringify(next));
}
