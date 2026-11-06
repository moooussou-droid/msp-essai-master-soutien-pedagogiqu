import { illustrate } from './svgIllustration';

export interface ProgrammeDiscipline {
  name: string;
  notions: string[];
}

export interface ProgrammeClass {
  level: string;
  label: string;
  note: string;
  disciplines: ProgrammeDiscipline[];
}

const fr = (...items: string[]) => items;

export const PRIMARY_PROGRAMMES: ProgrammeClass[] = [
  {
    level: 'CI',
    label: "Cours d'Initiation (CI)",
    note: 'CI : programme hors Français et Mathématiques, selon le document fourni.',
    disciplines: [
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Je découvre mon corps', 'Les différentes parties du corps et leur rôle', 'Je reproduis un pantin', 'Je découvre mon environnement à l’aide de mes sens', 'Les organes de sens', 'J’entretiens mon corps', 'J’entretiens ma bouche et mes dents', 'Les aliments que je peux manger') },
      { name: 'Éducation Sociale - Morale', notions: fr('Les pratiques de salutation selon les moments de la journée', 'Formuler une demande', 'Dire merci', 'Présenter des excuses', 'Demander une permission') },
      { name: 'Éducation Sociale - Civisme', notions: fr('La marche dans la rue', 'La traversée de la rue', 'Je ne joue pas dans la rue', 'Les feux tricolores', 'Les couleurs du drapeau', 'Le drapeau : attitude à adopter', 'L’Aube Nouvelle', 'Mes droits en famille : vie, nom, santé') },
      { name: 'Histoire-Géographie / Langue maternelle et Culture', notions: fr('Je salue en langue maternelle', 'Formuler une demande en langue maternelle', 'Présenter des excuses en langue maternelle', 'Compter divers objets en langue maternelle', 'Pratiques de remerciement en langue maternelle') },
      { name: 'Éducation Artistique (EA)', notions: fr('Exécution de rythme et danse libre', 'Instrument de musique : identification', 'Ronde chantée et mimée', 'Apprentissage de l’Hymne National', 'Dessin libre', 'Peinture libre', 'Coloriage libre', 'Découpage', 'Collage de papier déchiqueté') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Se situer par rapport à un repère', 'Marcher, courir et sauter', 'Ruade, poussée et rétention', 'Lancer', 'Course en slalom', 'Traversée à gué', 'Brouette', 'Danse traditionnelle') },
    ],
  },
  {
    level: 'CP',
    label: 'Cours Préparatoire (CP)',
    note: 'CP : programme hors Français et Mathématiques, selon le document fourni.',
    disciplines: [
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Les soins à apporter aux aliments', 'Les animaux de mon milieu', 'Les animaux vivent comme nous', 'Les animaux domestiques', 'Les plantes de mon environnement', 'La plante est un être vivant', 'La craie : description et utilité', 'Le crayon à papier', 'La gomme', 'Le papier', 'Fonctionnement des membres', 'Les organes de sens', 'Aliments sains', 'Le foyer, la marmite et la louche', 'Les oiseaux de mon milieu') },
      { name: 'Éducation Sociale - Morale', notions: fr('Formulation de demande', 'Remerciement', 'Demande de permission', 'Formulation d’excuses', 'Salutation du matin', 'Salutation de l’après-midi et du soir') },
      { name: 'Éducation Sociale - Civisme', notions: fr('Droit à la protection', 'Droit à la sécurité', 'Devoir de respect', 'Assistance en famille', 'Travaux domestiques', 'Droit à l’instruction', 'Respect et obéissance aux maîtres', 'Bien travailler', 'Coopérer avec les camarades', 'Les feux tricolores', 'Le drapeau', 'L’Aube Nouvelle') },
      { name: 'Histoire-Géographie / Langue maternelle et Culture', notions: fr('Comptage en langue maternelle', 'Compter des pièces d’argent jusqu’à 200 F', 'Dire des contes en langue maternelle', 'Situer des activités dans le temps', 'Protéger l’environnement', 'Ordonner sur la ligne du temps') },
      { name: 'Éducation Artistique (EA)', notions: fr('Hymne national', 'Écoute musicale', 'Danse', 'Exécution de rythmes', 'Coloriage', 'Peinture à l’éponge', 'Dessin libre', 'Collage', 'Modelage', 'Fabrication de masque', 'Enfilage') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Déplacement sur un parcours', 'Course poursuite', 'Touche-évitée', 'Manier un objet', 'Actions locomotrices', 'Actions non locomotrices', 'Marche au pas cadencé', 'Danse traditionnelle', 'Saut vers l’avant, l’arrière et le haut') },
    ],
  },
  {
    level: 'CE1',
    label: 'Cours Élémentaire 1 (CE1)',
    note: 'CE1 : toutes les matières par discipline.',
    disciplines: [
      { name: 'Français', notions: fr('Communication orale : rapporter un entretien', 'Lecture découverte : J’aime la nature', 'Lecture découverte : Bel oiseau', 'Combinatoire : ien, or, ar, ière', 'Écriture : tracer les lettres', 'Lecture systématique', 'Expression écrite : dictée de mots et phrases', 'La lettre', 'La description', 'Message d’invitation', 'Lecture oralisée', 'Vocabulaire thématique : santé, environnement, technique', 'Grammaire : texte et phrase', 'Le nom et le verbe', 'L’adjectif qualificatif', 'Orthographe : alphabet, homophones a/as/à', 'Conjugaison : infinitif, présent, futur simple') },
      { name: 'Mathématiques', notions: fr('Le nombre 100', 'Nombres de 0 à 100 : addition', 'Nombres de 0 à 100 : soustraction', 'Heures entières', 'Lignes, frontières, régions', 'Nombres de 0 à 1000', 'Longueur : mètre', 'Périmètre', 'Polyèdres', 'Nombres pairs et impairs', 'Polygones', 'Cercle', 'Durée : calendrier', 'Quadrillage', 'Nombres de 0 à 10 000', 'Monnaie', 'Sens de la multiplication') },
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Soins à apporter aux oiseaux d’élevage', 'Entretenir les plantes', 'Parties d’une plante', 'Mon dossier de croissance', 'Le corps en mouvement', 'Rôle des articulations', 'Rôle des muscles', 'Classification des animaux', 'Chaînes alimentaires', 'Végétaux : arbres, arbustes, herbes', 'Cycle de vie des végétaux', 'Air et vent', 'Flotte ou coule') },
      { name: 'Éducation Sociale', notions: fr('Charte de l’école', 'Exactitude', 'Assiduité', 'Entraide', 'Assistance à autrui', 'Droits et devoirs à l’école', 'Sécurité à l’école', 'Marche dans la rue', 'Traversée de la route', 'Quelques droits et devoirs de l’enfant', 'Mon école', 'Le plan de la classe', 'Mon village ou quartier') },
      { name: 'Éducation Artistique (EA)', notions: fr('Exécution de chants connus', 'Aube Nouvelle 1er couplet', 'Découpage', 'Collage', 'Enfilage', 'Modelage', 'Guirlandes', 'Tableaux par collage', 'Cerf-volant', 'Coloriage de frise', 'Peinture par symétrie') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Saut avec modification d’appuis', 'Lancer sur cibles fixes', 'Manipulation d’une corde', 'Saut à la corde', 'Tâche commune à deux ou plusieurs', 'Jeux collectifs d’opposition', 'Course d’endurance', 'Course d’obstacles', 'Multi-bonds', 'Équilibre', 'Roulade avant') },
    ],
  },
  {
    level: 'CE2',
    label: 'Cours Élémentaire 2 (CE2)',
    note: 'CE2 : toutes les matières par discipline.',
    disciplines: [
      { name: 'Français', notions: fr('Droits et devoirs de l’enfant et de la femme', 'Famille et village/quartier', 'Patrimoine socio-culturel', 'Structures administratives', 'Santé', 'Environnement naturel', 'Environnement technique', 'Communication orale', 'Lettre à une ONG', 'Consigne', 'Récit', 'Questionnaire d’enquête', 'Article de journal', 'Types de nom', 'Féminin singulier et pluriel', 'Groupe nominal et groupe verbal', 'Homophones on/ont, son/sont, ce/se') },
      { name: 'Mathématiques', notions: fr('Pyramide : identification et construction', 'Conversion des mesures de longueur', 'Aire : pavage', 'Nombres de 0 à 10 000', 'Addition, soustraction, multiplication, division', 'Polygones', 'Triangle', 'Rectangle et carré', 'Figures symétriques', 'Masse', 'Nombres de 0 à 100 000', 'Durée', 'Capacité', 'Volume', 'Cercle', 'Nombres de 0 à 999 999') },
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Objets qui coulent ou flottent', 'Fabrication du cerf-volant', 'Moulinet à vent', 'Girouette', 'Origine des aliments', 'Valeur nutritive des aliments', 'Tube digestif', 'Dents', 'Respiration chez l’homme', 'Pollution de l’air', 'Locomotion des animaux', 'Vie des plantes', 'Besoins des plantes') },
      { name: 'Éducation Sociale', notions: fr('Charte de l’école', 'Exactitude', 'Assiduité', 'Entraide', 'Dire la vérité', 'Ne pas voler', 'Droits et devoirs de l’enfant', 'Droits de la femme', 'Services publics', 'Nationalité', 'Droit à l’instruction', 'Liberté d’association', 'Royaumes du Bénin', 'Royaume de Nikki', 'Danhomè, Porto-Novo') },
      { name: 'Éducation Artistique (EA)', notions: fr('Pliage', 'Enfilage', 'Modelage au colombin', 'Mobile et tableau', 'Embellissement du cadre de vie', 'Masque', 'Peinture libre', 'Dessin/peinture libre', 'Chants connus') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Franchissement d’obstacles', 'Lancer-attraper', 'Lancer de force', 'Jeux collectifs de coopération', 'Organisation d’un tournoi', 'Endurance 750 à 1050 m', 'Course de vitesse', 'Saut en hauteur', 'Chandelle', 'Roulade avant') },
    ],
  },
  {
    level: 'CM1',
    label: 'Cours Moyen 1 (CM1)',
    note: 'CM1 : toutes les matières par discipline.',
    disciplines: [
      { name: 'Français', notions: fr('Métiers', 'Fête traditionnelle', 'Proverbes', 'Recette de cuisine', 'Organisation de fête scolaire', 'Santé et tabagisme', 'SIDA', 'Insalubrité', 'Déboisement', 'Débat sur les droits et devoirs', 'Passé composé', 'Imparfait', 'Passé simple', 'Plus-que-parfait', 'Homophones ces/ses, ni/n’y', 'Lettre personnelle', 'Compte rendu', 'Affiche', 'Article de journal', 'Lettre administrative') },
      { name: 'Mathématiques', notions: fr('Mesure d’angles', 'Prisme et pyramide', 'Monnaie', 'Prix d’achat, revient, vente, bénéfice, perte', 'Crédit et épargne', 'Fractions', 'Division', 'Polygones réguliers', 'Masse', 'Tableau de données', 'Durée', 'Capacité', 'Longueur', 'Aire du rectangle et du carré', 'Million et milliard', 'Nombres décimaux', 'Volume du cube et pavé droit', 'Changes euro/dollar') },
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Développement d’une plante à fleurs', 'Germination', 'Graine', 'Propriétés de l’eau', 'Cycle de l’eau', 'Thermomètre', 'Dilatation', 'Aimant', 'Appareil digestif', 'Circulation du sang', 'Cœur', 'Alimentation et besoins énergétiques', 'Fleur et fruit', 'Microbes et vaccins', 'Production et transmission du son') },
      { name: 'Éducation Sociale', notions: fr('Vérité', 'Travail bien fait', 'Honnêteté', 'Modestie', 'Tempérance', 'Corruption', 'Tolérance', 'Démocratie', 'Comité de classe', 'Décentralisation', 'Président de la République', 'Assemblée Nationale', 'Cour Constitutionnelle', 'Signaux de la route', 'Drapeau') },
      { name: 'Histoire-Géographie / Culture', notions: fr('Royaume de Kandi', 'Carte administrative', 'Musées, monuments et sites', 'Royaume de Parakou', 'Bénin dans le monde', 'Royaume de Djougou', 'Relief', 'Climat et végétation', 'Empires du Ghana, Mali, Songhaï', 'Ressources minières', 'Traite négrière') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Grimper à la corde', 'Relais 30 m', 'Lutte', 'Football : marquage', 'Triple saut', 'Lancer', 'Handball : passe à 10', 'Course de relais avec témoin') },
    ],
  },
  {
    level: 'CM2',
    label: 'Cours Moyen 2 (CM2)',
    note: 'CM2 : toutes les matières par discipline.',
    disciplines: [
      { name: 'Français', notions: fr('Publicité et esprit critique', 'Métiers', 'Cérémonies traditionnelles', 'SIDA', 'Déboisement', 'Moyens de locomotion', 'Bientôt le CEP', 'Pluriel des noms', 'Phrase nominale et verbale', 'Phrase simple et complexe', 'Pronoms', 'Adverbes en ment', 'Proposition subordonnée relative', 'Participe passé', 'Lettre administrative', 'Article de journal', 'Conte', 'Affiche') },
      { name: 'Mathématiques', notions: fr('Droites parallèles', 'Glissement', 'Symétrie par rapport à un point', 'Aire du triangle', 'Décennie, siècle, millénaire', 'Fractions et décimaux', 'Moyenne arithmétique', 'Aire du carré, rectangle, triangle, disque', 'Volume cylindre droit', 'Pourcentage', 'Proportionnalité', 'Échelle', 'Diagrammes', 'Débit moyen', 'Taux de placement', 'Division des nombres décimaux') },
      { name: 'Éducation Scientifique et Technologique (EST)', notions: fr('Production et transmission du son', 'Bicyclette', 'Machine à coudre à pédale', 'Engrenages', 'Circuit électrique', 'Fabrication d’une lampe de poche', 'Bien manger', 'Malnutrition', 'Premiers hommes', 'Énergie solaire', 'Énergies renouvelables', 'Levier et poulie', 'Machines simples') },
      { name: 'Éducation Sociale - Morale', notions: fr('Protection de l’environnement', 'Hospitalité', 'Éviter les achats inutiles', 'Respect des parents', 'Tempérance', 'Alcoolisme, tabagisme, toxicomanie', 'Sincérité', 'Conscience professionnelle', 'Maîtrise de soi', 'Culture de la paix') },
      { name: 'Éducation Sociale - Civisme', notions: fr('Commune et arrondissement', 'Assemblée Nationale', 'Président de la République', 'Contre-pouvoirs', 'Droits et obligations', 'Carte d’identité', 'Carte d’électeur', 'Impôts', 'Droit à la santé', 'Droit à la sécurité', 'Code de la route', 'Piéton et circulation') },
      { name: 'Histoire-Géographie / Culture', notions: fr('Bénin : géographie physique, humaine et économique', 'Traite négrière', 'Bénin en Afrique et dans le monde', 'Colonisation française', 'Résistances', 'Loi cadre', 'Indépendance', 'Conférence nationale', 'Organisations internationales', 'Transport et communication', 'Ressources minières') },
      { name: 'Éducation Physique et Sportive (EPS)', notions: fr('Attitudes posturales', 'Planche faciale', 'Trépied', 'Endurance', 'Vitesse 60 m', 'Grimper à la corde', 'Saut en extension', 'Roulade avant', 'Course d’élan et lancer', 'Football : passe et tir', 'Lutte', 'Saut en hauteur') },
    ],
  },
];

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

interface LessonKnowledge {
  explanation: string;
  summary: string;
  keywords: string[];
  imageQuery: string;
  videoUrl: string;
}

const KNOWLEDGE_BASE: Record<string, LessonKnowledge> = {
  lesfeuxtricolores: {
    explanation: `Les feux tricolores régulent la circulation : vert pour passer, orange pour s’arrêter si possible, rouge pour stopper.

Fonction et rôle
Le feu tricolore, ou feu de signalisation, est un dispositif lumineux installé aux intersections, passages piétons et zones à risque pour réguler le trafic routier et améliorer la sécurité. Il permet de fluidifier la circulation, d’éviter les embouteillages et de réduire les accidents. Les feux tricolores concernent tous les usagers : automobilistes, cyclistes, motards et piétons.

Signification des couleurs
Feu vert : autorisation de passer. Le conducteur peut continuer sa route, tout en restant prudent et en respectant les autres usagers.
Feu orange : signal d’arrêt imminent. Le conducteur doit s’arrêter si cela peut se faire sans danger. Si l’arrêt brusque est dangereux, il peut continuer avec prudence.
Feu rouge : obligation de s’arrêter. Le passage est interdit jusqu’au changement de couleur.

Cas particuliers
Quand les feux ne fonctionnent pas, il faut respecter les panneaux, les indications d’un agent de circulation ou la priorité à droite. Les feux pour piétons indiquent quand traverser ou attendre. Les flèches directionnelles autorisent parfois une direction précise. Les feux clignotants signalent souvent un danger ou une prudence particulière.

Fonctionnement technique
Les feux tricolores fonctionnent avec un système électrique programmé. Certains feux modernes détectent la circulation et adaptent la durée du vert ou du rouge.`,
    summary: 'Les feux tricolores organisent la circulation et protègent les usagers. Le vert autorise à passer, l’orange demande de s’arrêter si possible et le rouge oblige à stopper.',
    keywords: ['circulation', 'sécurité routière', 'vert', 'orange', 'rouge'],
    imageQuery: 'traffic lights road safety children',
    videoUrl: 'https://www.youtube.com/watch?v=PSsNGIY2zOo',
  },
  ladrapeauattitudeaadopter: {
    explanation: `Le drapeau est un symbole important de la nation. Il représente le pays, son histoire et son unité.

Au Bénin, le drapeau est composé de trois couleurs : le vert, le jaune et le rouge. Ces couleurs rappellent l’espérance, les richesses et le courage du peuple. Lorsque le drapeau est hissé, descendu ou présenté lors d’une cérémonie, chacun doit adopter une attitude de respect.

Respecter le drapeau, c’est se tenir correctement, éviter de jouer ou de bavarder pendant la cérémonie et comprendre que ce symbole représente tous les citoyens du pays.`,
    summary: 'Le drapeau représente la nation. Il doit être respecté pendant les cérémonies car il symbolise le pays, son unité et ses valeurs.',
    keywords: ['drapeau', 'nation', 'respect', 'Bénin'],
    imageQuery: 'Benin flag school ceremony',
    videoUrl: 'https://www.youtube.com/watch?v=KCGamQMZ7Nk',
  },
  lamarchedanslarue: {
    explanation: `La marche dans la rue demande prudence et attention. Le piéton doit éviter de marcher au milieu de la route, regarder devant lui et respecter les règles de circulation.

Quand il existe un trottoir, il faut l’utiliser. S’il n’y a pas de trottoir, il faut marcher au bord de la route, du côté qui permet de voir venir les véhicules. Il ne faut pas courir brusquement sur la chaussée ni jouer dans la rue.

La prudence du piéton protège sa vie et celle des autres usagers.`,
    summary: 'Marcher dans la rue exige prudence : utiliser le trottoir, éviter la chaussée, regarder les véhicules et ne pas jouer sur la route.',
    keywords: ['rue', 'piéton', 'sécurité', 'route'],
    imageQuery: 'children walking safely street',
    videoUrl: 'https://www.youtube.com/watch?v=PSsNGIY2zOo',
  },
  latraverseedelarue: {
    explanation: `La traversée de la rue doit se faire avec beaucoup d’attention. Avant de traverser, il faut s’arrêter, regarder à gauche, à droite, puis encore à gauche, et écouter s’il y a un véhicule qui arrive.

Quand il y a un passage piéton, il faut l’utiliser. Il faut traverser calmement, sans courir et sans jouer. Quand un feu piéton existe, il faut attendre le signal qui autorise la traversée.

Bien traverser la rue permet d’éviter les accidents.`,
    summary: 'Pour traverser la rue, il faut s’arrêter, regarder, écouter, utiliser le passage piéton et traverser calmement.',
    keywords: ['traverser', 'passage piéton', 'sécurité routière'],
    imageQuery: 'children crossing road safety',
    videoUrl: 'https://www.youtube.com/watch?v=PSsNGIY2zOo',
  },
  jedecouvremoncorps: {
    explanation: `Le corps humain est l’ensemble des parties qui permettent de vivre, bouger, sentir, parler, manger et apprendre.

Le corps comprend la tête, le tronc, les bras, les mains, les jambes et les pieds. Chaque partie a un rôle. La tête porte les yeux, les oreilles, le nez et la bouche. Les bras et les mains permettent de saisir, écrire et travailler. Les jambes et les pieds permettent de marcher, courir et sauter.

Connaître son corps aide à en prendre soin et à adopter de bonnes habitudes d’hygiène.`,
    summary: 'Le corps humain comprend plusieurs parties comme la tête, les bras, les mains, les jambes et les pieds. Chaque partie a un rôle et doit être entretenue.',
    keywords: ['corps', 'tête', 'bras', 'jambes', 'hygiène'],
    imageQuery: 'human body children education',
    videoUrl: 'https://www.youtube.com/watch?v=tZ4lCI6Pyoo',
  },
  lesorganesdesens: {
    explanation: `Les organes de sens permettent de connaître ce qui se passe autour de nous.

Les yeux servent à voir les formes, les couleurs et les mouvements. Les oreilles servent à entendre les sons. Le nez sert à sentir les odeurs. La langue sert à reconnaître les goûts. La peau, surtout les mains, permet de sentir le chaud, le froid, le dur, le mou ou le rugueux.

Il faut protéger les organes de sens en évitant les objets dangereux, les bruits trop forts et les saletés.`,
    summary: 'Les organes de sens sont les yeux, les oreilles, le nez, la langue et la peau. Ils permettent de voir, entendre, sentir, goûter et toucher.',
    keywords: ['vue', 'ouïe', 'odorat', 'goût', 'toucher'],
    imageQuery: 'five senses children',
    videoUrl: 'https://www.youtube.com/watch?v=tZ4lCI6Pyoo',
  },
  lalimentation: {
    explanation: `L’alimentation regroupe tout ce que nous mangeons et buvons pour vivre.

Les aliments donnent de l’énergie, aident le corps à grandir et protègent contre certaines maladies. Il existe des aliments d’origine végétale, animale et minérale. Pour rester en bonne santé, il faut manger des aliments propres, variés et équilibrés.

Il faut aussi laver les aliments, boire de l’eau potable et éviter les aliments avariés.`,
    summary: 'Bien s’alimenter signifie manger des aliments propres, variés et utiles au corps pour grandir, avoir de l’énergie et rester en bonne santé.',
    keywords: ['aliments', 'santé', 'énergie', 'hygiène'],
    imageQuery: 'healthy food children africa',
    videoUrl: 'https://www.youtube.com/watch?v=tZ4lCI6Pyoo',
  },
  addition: {
    explanation: `L’addition est une opération qui permet de réunir des quantités pour trouver un total.

On utilise le signe + pour additionner. Le résultat d’une addition s’appelle la somme. Par exemple, si on a 3 mangues et qu’on ajoute 2 mangues, on obtient 5 mangues.

L’addition sert dans la vie courante pour compter des objets, de l’argent, des élèves ou des points.`,
    summary: 'L’addition sert à réunir des quantités. On utilise le signe + et le résultat s’appelle la somme.',
    keywords: ['addition', 'somme', 'total', '+'],
    imageQuery: 'addition math children classroom',
    videoUrl: 'https://www.youtube.com/watch?v=4O8X7xG6dpA',
  },
  soustraction: {
    explanation: `La soustraction est une opération qui permet d’enlever une quantité à une autre.

On utilise le signe -. Le résultat d’une soustraction s’appelle la différence. Par exemple, si on a 8 cahiers et qu’on enlève 3 cahiers, il reste 5 cahiers.

La soustraction sert à calculer ce qui reste, ce qui manque ou l’écart entre deux quantités.`,
    summary: 'La soustraction sert à enlever ou comparer des quantités. On utilise le signe - et le résultat est la différence.',
    keywords: ['soustraction', 'reste', 'différence', '-'],
    imageQuery: 'subtraction math children',
    videoUrl: 'https://www.youtube.com/watch?v=4O8X7xG6dpA',
  },
};

function getKnowledge(notion: string, discipline: string): LessonKnowledge {
  const key = normalize(notion);
  const found = KNOWLEDGE_BASE[key] || Object.entries(KNOWLEDGE_BASE).find(([k]) => key.includes(k) || k.includes(key))?.[1];
  if (found) return found;

  const d = normalize(discipline);
  if (d.includes('math')) {
    return {
      explanation: `${notion} est une notion de mathématiques. Elle aide l’élève à compter, mesurer, comparer, organiser ou résoudre des problèmes. Pour la comprendre, il faut observer les nombres ou les formes, utiliser la bonne méthode et vérifier le résultat obtenu.`,
      summary: `${notion} aide à résoudre des situations mathématiques en utilisant une règle, un calcul ou une méthode adaptée.`,
      keywords: ['mathématiques', 'calcul', 'méthode'],
      imageQuery: 'math classroom children',
      videoUrl: 'https://www.youtube.com/watch?v=4O8X7xG6dpA',
    };
  }
  if (d.includes('franc') || d.includes('lecture')) {
    return {
      explanation: `${notion} est une notion de français. Elle aide l’élève à mieux lire, écrire, parler ou comprendre un texte. L’élève doit retenir le sens de la notion, savoir l’identifier dans une phrase ou un texte, puis l’utiliser correctement.`,
      summary: `${notion} aide à mieux comprendre et utiliser la langue française à l’oral ou à l’écrit.`,
      keywords: ['français', 'lecture', 'écriture'],
      imageQuery: 'reading writing children classroom',
      videoUrl: 'https://www.youtube.com/watch?v=VeSUzYblKio',
    };
  }
  if (d.includes('scientifique') || d.includes('est')) {
    return {
      explanation: `${notion} est une notion scientifique. Elle permet à l’élève d’observer le monde, de comprendre les êtres vivants, les objets, les phénomènes naturels ou techniques. L’élève doit pouvoir décrire ce qu’il observe, expliquer ce qui se passe et adopter de bons comportements.`,
      summary: `${notion} aide à comprendre le monde qui nous entoure grâce à l’observation et à l’explication.`,
      keywords: ['science', 'observation', 'expérience'],
      imageQuery: 'science class children experiment',
      videoUrl: 'https://www.youtube.com/watch?v=tZ4lCI6Pyoo',
    };
  }
  if (d.includes('civisme') || d.includes('sociale')) {
    return {
      explanation: `${notion} est une notion d’éducation sociale et civique. Elle aide l’élève à mieux vivre en famille, à l’école et dans la société. Elle apprend le respect des règles, des personnes, des symboles, des droits et des devoirs.`,
      summary: `${notion} aide à adopter un bon comportement et à vivre avec les autres dans le respect.`,
      keywords: ['civisme', 'respect', 'citoyenneté'],
      imageQuery: 'children civic education africa',
      videoUrl: 'https://www.youtube.com/watch?v=KCGamQMZ7Nk',
    };
  }
  if (d.includes('physique') || d.includes('sport')) {
    return {
      explanation: `${notion} est une notion d’éducation physique et sportive. Elle aide l’élève à développer son corps, son équilibre, sa vitesse, sa force, son endurance ou sa coopération avec les autres. Elle doit être pratiquée avec discipline et sécurité.`,
      summary: `${notion} développe le corps, l’adresse, la discipline et l’esprit d’équipe.`,
      keywords: ['sport', 'corps', 'sécurité'],
      imageQuery: 'physical education children sport',
      videoUrl: 'https://www.youtube.com/watch?v=rdLfnajz3wg',
    };
  }
  return {
    explanation: `${notion} est une notion du programme. Elle doit être comprise à travers une définition claire, des exemples simples et des situations proches de la vie de l’élève.`,
    summary: `${notion} désigne une connaissance ou un savoir-faire que l’élève doit comprendre et utiliser correctement.`,
    keywords: ['apprentissage', 'notion', 'exemple'],
    imageQuery: 'education children classroom africa',
    videoUrl: 'https://www.youtube.com/watch?v=KCGamQMZ7Nk',
  };
}

function lessonImageUrl(query: string) {
  // source.unsplash.com n'existe plus → illustration SVG locale (hors-ligne)
  return illustrate(query, query);
}

function subjectVideo(notion: string, discipline: string) {
  return getKnowledge(notion, discipline).videoUrl;
}

export function getProgrammeCourses() {
  return PRIMARY_PROGRAMMES.flatMap(programme =>
    programme.disciplines.flatMap(discipline =>
      discipline.notions.map((notion, index) => ({
        id: `programme-course-${programme.level}-${discipline.name}-${index}`,
        title: notion,
        author: 'Programme d’études intégré',
        level: programme.level,
        description: `Leçon issue du programme ${programme.label}, discipline : ${discipline.name}.`,
        price: '0',
        type: 'gratuit' as const,
        link: '',
        status: 'approved' as const,
        createdAt: 0,
        lessons: [
          {
            title: `À retenir : ${notion}`,
            content: (() => {
              const k = getKnowledge(notion, discipline.name);
              return `NOTION : ${notion}\nDISCIPLINE : ${discipline.name}\nCLASSE : ${programme.level}\n\nEXPLICATION\n${k.explanation}\n\nRÉSUMÉ SIMPLE POUR L'ÉLÈVE\n${k.summary}\n\nMOTS IMPORTANTS\n${k.keywords.map(word => `- ${word}`).join('\n')}\n\nQUESTIONS POUR VÉRIFIER\n1. Que signifie « ${notion} » ?\n2. À quoi sert cette notion ?\n3. Donne un exemple concret.\n4. Que dois-tu faire pour bien l’appliquer ?`;
            })(),
            imageUrl: lessonImageUrl(getKnowledge(notion, discipline.name).imageQuery),
            videoUrl: subjectVideo(notion, discipline.name),
          },
        ],
      }))
    )
  );
}
