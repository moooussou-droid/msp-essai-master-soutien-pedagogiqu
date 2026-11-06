/**
 * « Les astuces de l'enseignant » — fiches pédagogiques en 7 points.
 * Pour chaque notion du programme (443 notions, CI → CM2), une fiche :
 *  1. La notion          → intitulé exact
 *  2. Explication        → sens réel, langage accessible
 *  3. Ce que l'élève doit comprendre
 *  4. Ce que l'élève doit retenir
 *  5. Ce que l'élève doit savoir faire
 *  6. Exemple concret
 *  7. Critère de réussite
 * Contenus originaux produits par l'application (aucun texte copié).
 */

export interface TeacherTip {
  notion: string;
  discipline: string;
  level: string;
  explanation: string;
  understands: string;
  retains: string[];
  canDo: string[];
  example: string;
  success: string;
}

export const TIP_SECTIONS = ['La notion', 'Explication de la notion', 'Ce que l’élève doit comprendre', 'Ce que l’élève doit retenir', 'Ce que l’élève doit savoir faire', 'Exemple concret', 'Critère de réussite'] as const;

function norm(v: string) {
  return v.toLowerCase().replace(/œ/g, 'oe').replace(/Œ/g, 'oe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Choisit une variante stable pour une notion donnée (variété au sein d'une famille). */
function vary(notion: string, options: string[]): string {
  return options[hash(norm(notion)) % options.length];
}

type Builder = (notion: string, level: string) => Omit<TeacherTip, 'notion' | 'discipline' | 'level' | 'explanation'> & { explanation: string };

interface Family {
  id: string;
  keys: string[];
  build: Builder;
}

/* ------------------------------------------------------------------ */
/* Gabarits par famille (ordre = priorité, du plus spécifique au plus général) */
/* ------------------------------------------------------------------ */

const FAMILIES: Family[] = [
  {
    id: 'langues-maternelles',
    keys: ['langue maternelle'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la langue maternelle est la première langue parlée à la maison. Elle fait partie de la culture : saluer, demander, remercier, compter ou raconter un conte dans sa langue, c’est garder vivante une richesse transmise par les parents et les grands-parents.`,
      understands: `L’élève doit comprendre que toutes les langues ont de la valeur, que la langue maternelle se pratique à l’oral et aide souvent à mieux apprendre le français, avec les mêmes formules de politesse.`,
      retains: ['Les formules de politesse et les nombres dans la langue maternelle étudiée', 'Les situations où l’on utilise la langue maternelle', 'La valeur culturelle de la langue : contes, proverbes, chants'],
      canDo: ['Saluer, remercier, demander et compter dans la langue maternelle étudiée', 'Raconter un court conte ou une devinette dans la langue', 'Traduire simplement une phrase du français vers la langue maternelle'],
      example: vary(notion, [
        'Un élève fait saluer la classe dans sa langue : « Bonjour » se dit autrement chez lui — la classe répète et compare.',
        'Pendant la semaine culturelle, les élèves comptent en langue maternelle jusqu’à 20 et s’enregistrent.',
        'Une grand-mère raconte un conte en langue maternelle ; les élèves le racontent ensuite en français à toute l’école.',
      ]),
      success: `L’élève emploie correctement les formules et les nombres étudiés dans la langue maternelle et peut en expliquer le sens aux autres.`,
    }),
  },
  {
    id: 'chronologie',
    keys: ['decennie', 'siecle', 'millenaire', 'ligne du temps', 'dans le temps', 'ordonner'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le temps s’organise avec des repères : jour, semaine, mois, année, décennie, siècle, millénaire, ligne du temps. Savoir situer et ordonner des événements, c’est construire la chronologie de sa vie et de l’histoire.`,
      understands: `L’élève doit comprendre que le temps va dans un seul sens (avant → après) et que des mots précis (hier, autrefois, maintenant, demain) ou des durées (10 ans = une décennie, 100 ans = un siècle) permettent de situer les événements.`,
      retains: ['Les unités de temps : décennie (10 ans), siècle (100 ans), millénaire (1 000 ans)', 'La construction d’une ligne du temps avec début, événements, fin', 'Les mots de repère : avant, pendant, après, autrefois, aujourd’hui'],
      canDo: ['Placer des événements dans l’ordre sur une ligne du temps', 'Convertir des durées simples (1 siècle = 100 ans = 10 décennies)', 'Raconter sa journée ou l’histoire étudiée dans l’ordre chronologique'],
      example: vary(notion, [
        'La classe fabrique sa ligne du temps : naissance, premières dents, entrée au CP, aujourd’hui — chacun place ses repères.',
        'Avec le calendrier de la classe, les élèves situent les fêtes et les vacances et comptent les jours qui restent.',
        'En histoire, la classe range sur une frise : royaumes anciens, colonisation, indépendance — du plus ancien au plus récent.',
      ]),
      success: `L’élève ordonne correctement des événements et utilise les mots du temps et les durées sans se tromper.`,
    }),
  },
  {
    id: 'politesse',
    keys: ['salutation', 'merci', 'excuse', 'permission', 'demande', 'remerciement', 'saluer'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » est une règle de bonne conduite : elle apprend à l’enfant comment parler et se comporter avec les autres pour être bien accepté en famille, à l’école et dans le quartier. C’est un code de politesse simple que chaque enfant peut appliquer chaque jour.`,
      understands: `L’élève doit comprendre qu’une formule de politesse n’est pas un simple mot : c’est une marque de respect envers l’autre, et que l’on s’en sert selon le moment (matin, midi, soir) ou selon la situation (demander, remercier, s’excuser).`,
      retains: ['Les formules exactes : bonjour, merci, s’il te plaît, pardon, excusez-moi, au revoir', 'Le moment où l’on emploie chaque formule (salutation du matin, remerciement…)', 'Une demande et un remerciement s’accompagnent d’un ton aimable et d’un sourire'],
      canDo: ['Saluer correctement un adulte ou un camarade selon le moment de la journée', 'Formuler une demande complète : « S’il te plaît, peux-tu… ? »', 'Remercier et présenter des excuses sans qu’on le lui rappelle'],
      example: vary(notion, [
        'En arrivant à l’école le matin, Awa dit : « Bonjour madame, comment allez-vous ? » avant d’entrer en classe.',
        'Kofi a bousculé son camarade : il dit « Pardon, ce n’était pas exprès » et l’aide à ramasser ses affaires.',
        'Avant de sortir jouer, Sena demande : « Maman, s’il te plaît, puis-je aller jouer dehors ? »',
        'Après le repas, le maître remercie la cantinière ; les élèves répètent « Merci beaucoup madame ».',
      ]),
      success: `L’élève emploie spontanément, sans qu’on le lui souffle, la formule adaptée (salutation, merci, pardon, demande polie) dans trois situations de la journée, avec le bon ton.`,
    }),
  },
  {
    id: 'drapeau-hymne',
    keys: ['drapeau', 'aube nouvelle', 'hymne'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » fait partie des symboles de la nation. Le drapeau et l’hymne national représentent le pays tout entier : ils rappellent son histoire, son unité et la fierté d’être citoyen. On leur doit une attitude de respect : se lever, se mettre au garde-à-vous et chanter avec dignité.`,
      understands: `L’élève doit comprendre qu’un symbole n’est pas un simple objet ou une simple chanson : il représente tous les citoyens. Le respect qu’on lui accorde montre l’attachement à son pays et aux valeurs qu’il porte.`,
      retains: ['Les couleurs et la signification du drapeau (vert, jaune, rouge)', 'Les paroles correctes de l’hymne « L’Aube Nouvelle » dans l’ordre', 'L’attitude à adopter face au drapeau et pendant l’hymne : debout, immobile, mains le long du corps'],
      canDo: ['Reconnaître et décrire le drapeau, dire ce que chaque couleur évoque', 'Chanter ou réciter l’hymne national sans se tromper dans l’ordre des couplets', 'Adopter spontanément l’attitude de respect lors d’une cérémonie de lever des couleurs'],
      example: vary(notion, [
        'Chaque lundi matin, toute l’école se range dans la cour : le drapeau est hissé et les élèves chantent « L’Aube Nouvelle » au garde-à-vous.',
        'Pendant la cérémonie de la fête nationale, les élèves restent immobiles et silencieux pendant l’hymne, même si un oiseau passe au-dessus de la cour.',
        'Un élève voit un drapeau déchiré sur le mur : il le signale au maître, car un symbole de la nation doit être entretenu avec soin.',
      ]),
      success: `L’élève identifie le drapeau, récite l’hymne dans l’ordre et adopte lui-même l’attitude de respect (debout, immobile, silencieux) pendant toute cérémonie.`,
    }),
  },
  {
    id: 'royaumes',
    keys: ['royaume', 'danhome', 'abomey', 'nikki', 'kandi', 'parakou', 'djougou'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » renvoie à l’histoire des anciens royaumes du Bénin (Danhomè, Nikki, Kandi, Parakou, Djougou…). Avant la colonisation, le territoire était organisé en royaumes dirigés par des rois, avec une cour, des dignitaires, une armée et des traditions. Leur histoire explique beaucoup de la culture et des peuplements actuels.`,
      understands: `L’élève doit comprendre que le Bénin n’est pas né avec la colonisation : des États organisés existaient depuis des siècles, avec leurs chefs, leurs lois, leurs villes (Abomey, Nikki…) et leur patrimoine, dont une partie est aujourd’hui classée dans le monde.`,
      retains: ['Le nom des principaux royaumes du territoire et leur localisation', 'Le rôle du roi et des dignitaires (chefs de guerre, ministres, prêtres)', 'Des éléments du patrimoine liés aux royaumes : palais d’Abomey, fêtes, traditions'],
      canDo: ['Situer sur la carte les principaux royaumes du Bénin', 'Raconter en 3 phrases l’origine et l’organisation d’un royaume étudié', 'Citer 2 éléments du patrimoine royal encore visibles aujourd’hui'],
      example: vary(notion, [
        'Au CE2, la classe étudie le royaume de Danhomè : le maître montre les palais d’Abomey et fait dessiner la grande porte royale.',
        'Lors de la fête de la Gani, les élèves de Nikki voient les dignitaires et les cavaliers : leur maître explique que cette fête vient du royaume de Nikki.',
        'À Porto-Novo, la classe visite le musée : les objets exposés racontent l’époque des rois et la vie des peuples d’autrefois.',
      ]),
      success: `L’élève cite correctement au moins un royaume, le situe sur la carte et explique en une phrase pourquoi son histoire compte encore aujourd’hui.`,
    }),
  },
  {
    id: 'histoire-nationale',
    keys: ['empire', 'premiers hommes', 'coloni', 'resistance', 'independance', 'loi cadre', 'conference', 'traite'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » est une page de l’histoire de l’Afrique et du Bénin. Elle raconte comment les sociétés se sont organisées au fil du temps, comment la traite et la colonisation ont bouleversé le continent, et comment les peuples ont lutté pour retrouver leur liberté jusqu’à l’indépendance.`,
      understands: `L’élève doit comprendre que l’histoire se construit avec des dates, des acteurs et des causes : chaque événement étudié a des causes et des conséquences, et le passé explique beaucoup de ce que vit le pays aujourd’hui.`,
      retains: ['Les grandes périodes : empires anciens, traite, colonisation, indépendance', 'Les dates et acteurs essentiels du chapitre étudié', 'Les conséquences des grands événements (départ des populations, transformation des sociétés, indépendances)'],
      canDo: ['Placer les événements étudiés sur une frise chronologique', 'Expliquer en une phrase la cause et une conséquence de l’événement', 'Distinguer les périodes (avant / pendant / après) sans les mélanger'],
      example: vary(notion, [
        'La classe fabrique une frise : la traite négrière y est placée entre les royaumes et la colonisation, et les élèves expliquent pourquoi.',
        'Le maître raconte la résistance de Béhanzin : les élèves cherchent ensuite les raisons du conflit avec les troupes coloniales françaises.',
        'Le 1er août, la classe fête l’indépendance : chaque élève présente un événement qui y a conduit, du Dahomey au Bénin.',
      ]),
      success: `L’élève replace l’événement sur la frise au bon endroit, cite une cause et une conséquence, et utilise le bon vocabulaire (traite, colonisation, indépendance).`,
    }),
  },
  {
    id: 'geo-benin',
    keys: ['carte administrative', 'benin', 'relief', 'climat', 'vegetation', 'ressource', 'transport', 'monument', 'site', 'musee', 'geographie'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » concerne la description du Bénin : sa position, son relief, son climat, sa végétation, ses ressources ou ses lieux remarquables. Connaître son pays, c’est savoir le situer, décrire ses paysages et comprendre comment vivent ses habitants.`,
      understands: `L’élève doit comprendre que la géographie du pays explique la vie des populations : le climat et le sol déterminent les cultures, la végétation, les activités et les déplacements.`,
      retains: ['La position du Bénin (côte, pays voisins, départements)', 'Les grands traits du relief, du climat et de la végétation', 'Les principales ressources et les grands sites (monuments, musées, parcs)'],
      canDo: ['Situer le Bénin et ses régions sur une carte muette', 'Décrire en 2 phrases le climat ou le relief d’une région', 'Relier une ressource ou un site à sa localisation'],
      example: vary(notion, [
        'La classe étudie le relief : les élèves placent sur la carte la chaîne de l’Atacora et les plateaux du Sud, puis comparent avec la plaine côtière.',
        'Au marché de la ville, les élèves observent les produits qui viennent de chaque région : ignames du Nord, huile de palme du Sud, coton de l’intérieur.',
        'Le maître montre des photos du parc de la Pendjari : les élèves associent la savane, la faune et le climat du Nord-Bénin.',
      ]),
      success: `L’élève situe correctement les éléments étudiés sur la carte et explique en une phrase un lien entre le milieu naturel et la vie des habitants.`,
    }),
  },
  {
    id: 'corps-mouvement',
    keys: ['mouvement', 'articulation', 'muscle', 'membre', 'os'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le corps humain bouge grâce aux os, aux articulations et aux muscles. Les muscles tirent sur les os au niveau des articulations (coude, genou, épaule) et les membres se plient, se tendent et se déplacent.`,
      understands: `L’élève doit comprendre que le mouvement est un travail d’équipe : un muscle se contracte, il tire sur l’os, et l’articulation sert de point d’appui ; sans l’un de ces éléments, le mouvement est impossible.`,
      retains: ['Les rôles des os (soutien et protection), des muscles (moteurs) et des articulations (liaison)', 'Le nom de quelques articulations : coude, genou, poignet, épaule, cheville', 'Le lien « muscle → os → articulation → mouvement »'],
      canDo: ['Montrer sur son propre corps les principales articulations', 'Expliquer avec ses mots comment un bras se plie', 'Relier chaque partie du corps en mouvement à son rôle'],
      example: vary(notion, [
        'En pliant et dépliant le bras, l’élève sent le muscle qui gonfle et l’articulation du coude qui travaille.',
        'Les élèves marchent, courent, puis font le pantin en bougeant bras et jambes : ils repèrent les articulations sollicitées.',
        'Le maître fait comparer : un pantin sans articulation ne peut pas s’asseoir — comme un corps qui n’aurait pas de coude.',
      ]),
      success: `L’élève explique correctement le rôle de l’os, du muscle et de l’articulation dans un mouvement, en s’appuyant sur son propre corps.`,
    }),
  },
  {
    id: 'corps-decouverte',
    keys: ['corps', 'pantin'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » fait découvrir au jeune élève son propre corps : ses parties, leurs noms et leurs rôles. Comprendre son corps, c’est apprendre à le nommer, à le respecter et à en prendre soin.`,
      understands: `L’élève doit comprendre que chaque partie du corps a un rôle précis (les yeux voient, les oreilles entendent, les jambes marchent) et que la connaissance de son corps aide à rester en bonne santé et en sécurité.`,
      retains: ['Le nom des principales parties du corps (tête, tronc, membres)', 'Le rôle de quelques parties essentielles : yeux, oreilles, mains, jambes', 'L’importance d’entretenir son corps : hygiène, sommeil, alimentation'],
      canDo: ['Nommer et montrer les parties du corps sur soi ou sur un schéma', 'Associer chaque partie à son rôle', 'Citer une habitude d’hygiène liée au corps'],
      example: vary(notion, [
        'En éducation physique, l’élève touche sa tête, ses bras, ses jambes et les nomme pendant que le maître les écrit au tableau.',
        'La classe fabrique un pantin articulé : en bougeant les bras et les jambes du pantin, les élèves retrouvent leurs propres articulations.',
        'Avant le repas, les élèves se lavent les mains : le maître rappelle que les mains servent à manger, écrire, jouer, donc à garder propres.',
      ]),
      success: `L’élève nomme au moins 8 parties du corps et associe chacune à son rôle, sans aide, à partir d’un schéma.`,
    }),
  },
  {
    id: 'organes-sens',
    keys: ['organes de sens', 'mes sens'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les organes des sens (yeux, oreilles, nez, langue, peau) sont les portes par lesquelles l’enfant découvre le monde. Grâce à eux, il voit, entend, sent, goûte et touche : ce sont ses outils d’observation.`,
      understands: `L’élève doit comprendre que chaque sens correspond à un organe et à une fonction, et que les sens se complètent pour donner une bonne information sur le monde.`,
      retains: ['Les 5 sens : vue (yeux), ouïe (oreilles), odorat (nez), goût (langue), toucher (peau)', 'L’organe associé à chaque sens', 'L’importance de protéger ses organes des sens'],
      canDo: ['Associer chaque sens à son organe et à une observation réelle', 'Reconnaître un objet, un aliment ou un bruit en n’utilisant qu’un seul sens', 'Citer une règle de protection des yeux et des oreilles'],
      example: vary(notion, [
        'Les yeux bandés, les élèves goûtent un morceau d’ananas et le reconnaissent : c’est le goût qui travaille.',
        'Le maître fait écouter les bruits de la cour fermés les yeux : les élèves disent ce qu’ils ont entendu grâce à l’ouïe.',
        'Au toucher, un élève identifie la craie, la gomme et le livre sans les voir : il décrit ce qu’il sent avec sa peau.',
      ]),
      success: `L’élève associe correctement les 5 organes aux 5 sens et réussit les jeux d’identification à sens unique.`,
    }),
  },
  {
    id: 'hygiene-corps',
    keys: ['entretien', 'bouche', 'hygiene', 'proprete'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » apprend à l’élève à prendre soin de son corps au quotidien : se laver, se brosser les dents, soigner ses vêtements et ses affaires. L’hygiène protège des maladies et permet d’être bien accepté par les autres.`,
      understands: `L’élève doit comprendre que la propreté se pratique tous les jours, pas seulement avant la visite : les microbes se transmettent facilement, et se laver les mains, se brosser les dents et changer de tenue protègent la santé de tous.`,
      retains: ['Les gestes d’hygiène quotidiens : mains, visage, dents, corps', 'Le moment idéal de chaque geste (avant les repas, après les toilettes, au réveil…)', 'Pourquoi l’hygiène protège des maladies et des mauvaises odeurs'],
      canDo: ['Décrire et réaliser les étapes du lavage des mains et du brossage des dents', 'Reconnaître sur une image les bonnes pratiques d’hygiène', 'Expliquer pourquoi le partage d’objets personnels (brosse, serviette, verre) est dangereux'],
      example: vary(notion, [
        'Chaque matin, la classe vérifie la propreté des mains : un élève montre la démonstration complète du lavage avec du savon.',
        'Après la récréation, les élèves se lavent les mains avant de manger ; la maîtresse explique que les microbes ne se voient pas.',
        'Le soir, Adja se brosse les dents pendant qu’elle chante la chanson de la classe : c’est sa routine avant de dormir.',
      ]),
      success: `L’élève réalise seul, dans l’ordre, les gestes d’hygiène essentiels et peut expliquer pourquoi chaque geste protège sa santé.`,
    }),
  },
  {
    id: 'alimentation',
    keys: ['aliment', 'manger', 'nutrition', 'nutritif', 'malnutrition', 'energetique', 'besoin'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les aliments sont le carburant du corps. Ils apportent l’énergie pour jouer, apprendre et grandir, et les matériaux pour construire muscles et os. Une bonne alimentation, c’est varier les aliments et respecter les règles d’hygiène.`,
      understands: `L’élève doit comprendre que « bien manger » ne veut pas dire « manger beaucoup » : il faut manger varié (céréales, légumes, fruits, protéines), propre et à des heures régulières, car chaque famille d’aliments a un rôle.`,
      retains: ['Les grandes familles d’aliments et leur rôle (énergétiques, bâtisseurs, protecteurs)', 'L’origine des aliments (animale ou végétale) et les étapes de leur préparation', 'Les règles d’hygiène : se laver les mains, laver les aliments, conserver proprement'],
      canDo: ['Classer des aliments selon leur famille ou leur origine', 'Composer un repas équilibré avec les aliments disponibles', 'Citer 3 règles d’hygiène alimentaire et les appliquer'],
      example: vary(notion, [
        'La classe prépare le menu du jour : pâte (énergie), sauce d’arachide (protéines), papaye (vitamines) — un repas complet et équilibré.',
        'Au marché, les élèves identifient l’origine des aliments : igname de la terre, poisson de la mer, viande des animaux d’élevage.',
        'Pour la fête de l’école, chaque élève apporte un aliment sain : le maître construit avec eux le « repas du champion » du lendemain.',
      ]),
      success: `L’élève classe correctement les aliments présentés, compose un repas équilibré et explique deux règles d’hygiène alimentaire.`,
    }),
  },
  {
    id: 'animaux',
    keys: ['animal', 'animaux', 'oiseau', 'oiseaux', 'chaîne'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les animaux sont des êtres vivants : ils naissent, se nourrissent, grandissent, se déplacent et se reproduisent. Ils vivent dans des milieux variés, et certains sont élevés par l’homme (animaux domestiques).`,
      understands: `L’élève doit comprendre que les animaux ont des besoins (manger, boire, respirer, un abri) et que leur corps est adapté à leur milieu et à leur mode de vie (voler, courir, nager).`,
      retains: ['Les caractéristiques du vivant chez l’animal (naître, grandir, se nourrir, se reproduire, mourir)', 'La différence entre animaux domestiques et animaux sauvages', 'La notion de chaîne alimentaire : qui mange qui'],
      canDo: ['Classer des animaux selon un critère simple (domestique/sauvage, mode de déplacement, alimentation)', 'Décrire le mode de vie d’un animal de l’environnement proche', 'Construire une chaîne alimentaire simple à partir d’exemples locaux'],
      example: vary(notion, [
        'Dans la cour, les élèves observent les poules du voisin : elles picorent, boivent, se reposent ; la classe conclut qu’elles sont vivantes.',
        'Le maître raconte la chaîne alimentaire du champ : le mil est mangé par le moineau, le moineau par le rapace, le rapace par… qui ?',
        'La classe liste les animaux du village et décide lesquels sont domestiques (poule, chèvre, chien) et lesquels sont sauvages (lièvre, serpent).',
      ]),
      success: `L’élève explique en 3 phrases pourquoi un animal est vivant, le classe correctement et construit une chaîne alimentaire juste.`,
    }),
  },
  {
    id: 'plantes',
    keys: ['plante', 'vegetal', 'germination', 'graine', 'fleur', 'arbre', 'arbuste', 'herbe', 'croissance'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les plantes sont des êtres vivants : elles naissent d’une graine, grandissent, se nourrissent, se reproduisent. Elles ont besoin d’eau, de lumière, d’air et de bonne terre pour se développer.`,
      understands: `L’élève doit comprendre que la plante a un cycle de vie (graine → germination → plante → fleur → fruit → nouvelle graine) et que ses besoins doivent être satisfaits pour qu’elle grandisse, comme l’enfant a besoin de nourriture.`,
      retains: ['Les besoins des plantes : eau, lumière, air, terre, chaleur', 'Les parties de la plante et leur rôle : racines, tige, feuilles, fleurs, fruits', 'Les étapes du cycle de vie d’une plante et les soins à lui apporter'],
      canDo: ['Semer une graine et suivre sa croissance en observant et en notant', 'Associer chaque partie de la plante à son rôle', 'Expliquer ce qui arrive à une plante privée d’eau ou de lumière'],
      example: vary(notion, [
        'La classe sème des graines de haricot dans des pots : un pot est arrosé, l’autre non ; au bout d’une semaine, l’observation est concluante.',
        'Devant la classe, les élèves dessinent le haricot germé et notent : racines vers le bas, tige vers le haut, feuilles qui apparaissent.',
        'Le maître apporte des feuilles, une tige, une racine : les élèves reconstituent le plant et expliquent le travail de chaque partie.',
      ]),
      success: `L’élève décrit le cycle complet d’une plante avec les bons mots, explique deux besoins et prédit ce qui arrive en cas de manque d’eau.`,
    }),
  },
  {
    id: 'environnement',
    keys: ['environnement', 'pollution', 'deboisement', 'insalubrite', 'naturel', 'proteger'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : l’environnement, c’est tout ce qui entoure l’homme : l’air, l’eau, le sol, les plantes, les animaux. Le protéger, c’est éviter de le salir, de le gaspiller ou de le détruire, car la santé et la vie en dépendent.`,
      understands: `L’élève doit comprendre que chaque geste compte : jeter un déchet par terre, brûler les ordures, couper les arbres ou gaspiller l’eau finit par nuire à toute la communauté ; protéger l’environnement protège la santé de tous.`,
      retains: ['Les principales menaces : déchets, pollution de l’air, déboisement, insalubrité', 'Les gestes protecteurs : trier, balayer, arroser les plants, éviter le feu, planter des arbres', 'Le lien entre environnement propre et santé'],
      canDo: ['Citer et appliquer 3 gestes de protection de l’environnement', 'Expliquer les conséquences du déboisement et de l’insalubrité', 'Participer à une action de salubrité ou de plantation et en rendre compte'],
      example: vary(notion, [
        'Après la récréation, les élèves ramassent les papiers dans la cour et les mettent dans un sac : la cour reste propre toute la journée.',
        'En classe, la maîtresse explique : si l’on coupe tous les arbres, la pluie emporte la terre et le champ devient pauvre.',
        'La classe organise une journée « école propre » : chacun balaie sa portion et on compare l’école avant et après.',
      ]),
      success: `L’élève applique spontanément les gestes de propreté et de protection, et explique avec ses mots un lien entre un geste et la santé.`,
    }),
  },
  {
    id: 'digestion-respiration',
    keys: ['digestif', 'digestion', 'respiration', 'respirer', 'sang', 'coeur', 'circulation', 'poumon', 'dents'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le corps humain fonctionne comme une machine : les aliments sont transformés en énergie (appareil digestif), le sang transporte nourriture et oxygène partout (cœur et circulation), et l’air entre et sort des poumons (respiration).`,
      understands: `L’élève doit comprendre que ces organes forment des chaînes : la digestion prépare les aliments, la respiration apporte l’oxygène, et le cœur fait circuler le sang pour tout distribuer aux organes.`,
      retains: ['Le trajet des aliments : bouche → œsophage → estomac → intestins', 'Le trajet de l’air : nez/bouche → trachée → poumons', 'Le rôle du cœur : pomper le sang et le faire circuler dans tout le corps'],
      canDo: ['Décrire dans l’ordre le trajet d’un aliment ou de l’air', 'Situer sur un schéma les organes étudiés (cœur, poumons, estomac…)', 'Citer 2 bons comportements pour protéger ces organes (manger calmement, faire du sport)'],
      example: vary(notion, [
        'Les élèves suivent un morceau de pain : il entre par la bouche, descend dans l’estomac, puis continue son voyage dans les intestins.',
        'Après la course, Bello sent son cœur battre fort : il comprend que le cœur accélère pour apporter plus d’oxygène à ses muscles.',
        'La classe observe la respiration : mains sur la poitrine, les élèves sentent le souffle qui entre et sort, et localisent les poumons.',
      ]),
      success: `L’élève reconstitue dans l’ordre le trajet des aliments et de l’air, et localise correctement les organes sur un schéma.`,
    }),
  },
  {
    id: 'eau-air',
    keys: ['de l eau', 'air', 'vent', 'flotte', 'flottent', 'coule', 'couler', 'girouette'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : l’eau et l’air sont partout autour de nous. L’eau existe sous trois états (solide, liquide, gaz), elle fait un cycle naturel ; l’air est invisible mais réel, il bouge (le vent) et peut faire tourner un moulinet ou une girouette.`,
      understands: `L’élève doit comprendre que l’eau et l’air sont des matières : on peut les observer, tester leurs effets (flotter, couler, pousser, tourner) et décrire ce que l’on observe.`,
      retains: ['Les trois états de l’eau : solide (glace), liquide, gaz (vapeur) — et les changements (fondre, évaporer, condenser)', 'Les grandes étapes du cycle de l’eau : évaporation → nuages → pluie → rivières', 'Pourquoi certains objets flottent et d’autres coulent ; les effets du vent'],
      canDo: ['Décrire le cycle de l’eau avec les bons mots', 'Prédire puis vérifier si un objet flotte ou coule', 'Expliquer ce qui fait tourner une girouette ou un moulinet'],
      example: vary(notion, [
        'La classe met une bassine d’eau dehors en plein soleil : deux jours plus tard, il n’y a plus d’eau — elle s’est évaporée.',
        'Les élèves testent le caillou, la bouteille vide, la feuille et la cuillère : certains flottent, d’autres coulent — et ils justifient avant de vérifier.',
        'Devant la classe, le moulinet en papier tourne quand on souffle ou quand le vent souffle : l’air invisible fait bouger les choses.',
      ]),
      success: `L’élève explique le cycle de l’eau, prédit correctement qui flotte ou coule, et associe le vent à ses effets observés.`,
    }),
  },
  {
    id: 'physique-technique',
    keys: ['thermometre', 'dilatation', 'aimant', 'son', 'circuit', 'lampe de poche', 'energie solaire', 'renouvelable', 'levier', 'poulie', 'engrenage', 'machines simples', 'solide'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la physique explique des phénomènes que l’élève observe chaque jour : la chaleur qui dilate un corps, le son qui se transmet, l’aimant qui attire, le courant qui allume une lampe, la poulie qui soulève. Ces notions montrent que la science sert à expliquer et à fabriquer des outils utiles.`,
      understands: `L’élève doit comprendre qu’un phénomène a une cause et que les machines (levier, poulie, engrenages…) ne font pas de miracle : elles multiplient ou transforment une force, comme le veut la règle de la physique.`,
      retains: ['La cause et l’effet de chaque phénomène étudié (chaleur → dilatation ; aimant → attraction ; courant → lumière…)', 'Le rôle de chaque machine simple (levier, poulie, engrenage) et un exemple d’usage', 'Les règles de sécurité avec l’électricité et le feu'],
      canDo: ['Réaliser une expérience simple et décrire ce qui se passe', 'Associer chaque machine simple à son usage (puits, vélo, cric…)', 'Expliquer le fonctionnement d’un objet du quotidien (lampe de poche, bicyclette)'],
      example: vary(notion, [
        'La classe monte une lampe de poche avec une pile, une ampoule et des fils : quand le circuit est fermé, la lampe s’allume.',
        'Avec une poulie au-dessus du puits de l’école, les élèves constatent qu’il faut moins de force pour remonter le seau.',
        'Le maître chauffe une bouteille d’air : le bouchon saute, comme le couvercle d’une casserole trop pleine.',
        'Un élève frappe sur le pupitre : le son voyage jusqu’aux oreilles de la classe — on ne le voit pas, mais il se transmet par l’air.',
        'Deux élèves tiennent un aimant et des trombones : sans contact, l’aimant attire les trombones ; la classe cherche pourquoi.',
      ]),
      success: `L’élève réalise l’expérience dans les règles, explique la cause de l’effet observé et cite la sécurité associée.`,
    }),
  },
  {
    id: 'objets-usuels',
    keys: ['craie', 'crayon', 'gomme', 'papier', 'foyer', 'marmite', 'louche', 'bicyclette', 'machine a coudre', 'cerf-volant'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : il s’agit de découvrir des objets de la vie courante : leur forme, la matière dont ils sont faits, leur utilité et la manière de bien s’en servir. Tout objet fabriqué répond à un besoin.`,
      understands: `L’élève doit comprendre qu’un objet se décrit (matière, forme, parties), se range dans sa fonction d’usage et se respecte : un objet bien entretenu dure plus longtemps.`,
      retains: ['La description de l’objet : matière, forme, parties, usage', 'L’usage correct et le soin à lui apporter', 'Le vocabulaire exact : manche, poignée, réservoir, pédale, mèche…'],
      canDo: ['Décrire un objet en 3 phrases (c’est fait de…, ça sert à…, on l’utilise comme…)', 'Expliquer comment l’entretenir', 'Choisir le bon objet pour la bonne tâche'],
      example: vary(notion, [
        'En classe, les élèves observent la craie : blanche, fragile, elle laisse une trace sur le tableau noir — c’est son usage.',
        'Au réfectoire, la louche sert à verser la sauce sans se brûler : les élèves décrivent son long manche et son récipient.',
        'La classe démonte et remonte le concept de bicyclette sur un schéma : pédales, roues, guidon — chaque partie a son rôle.',
      ]),
      success: `L’élève décrit l’objet avec 3 informations exactes (matière, forme, usage) et l’utilise correctement et avec soin.`,
    }),
  },
  {
    id: 'sante-maladies',
    keys: ['microbe', 'vaccin', 'sida', 'tabagisme', 'alcool', 'toxicomanie', 'maladie'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : certaines maladies sont causées par des microbes invisibles ; les vaccins protègent contre plusieurs d’entre elles ; d’autres maladies et fléaux (tabagisme, alcool, SIDA) viennent de comportements à risques qu’il faut connaître pour les éviter.`,
      understands: `L’élève doit comprendre que la santé se protège : se faire vacciner, se laver, éviter le tabac et l’alcool, refuser ce qui est dangereux — et que la prévention est plus facile que la guérison.`,
      retains: ['La différence entre microbe, maladie et vaccin', 'Les moyens de transmission simples et les moyens de protection', 'Les dangers du tabac, de l’alcool et des drogues pour le corps'],
      canDo: ['Expliquer à quoi sert un vaccin', 'Citer 3 gestes qui protègent des microbes', 'Dire non à une proposition dangereuse (tabac, alcool) et expliquer pourquoi'],
      example: vary(notion, [
        'À la sortie du centre de santé, les élèves ont reçu leur carnet de vaccination : le maître explique que le vaccin protège des maladies graves.',
        'Une affiche de classe réaliste montre : se laver les mains, dormir, manger sainement — les élèves complètent avec leurs idées.',
        'Dans un débat, les élèves expliquent pourquoi la cigarette nuit aux poumons et pourquoi il faut refuser d’en essayer.',
      ]),
      success: `L’élève explique clairement le rôle du vaccin et cite les bons gestes de prévention ; il formule un refus motivé face à un comportement à risque.`,
    }),
  },
  {
    id: 'securite-routiere',
    keys: ['rue', 'feux', 'signal', 'route', 'pieton', 'circulation'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la rue et la route sont des lieux dangereux. Il faut apprendre les bons réflexes : marcher sur le bon côté, s’arrêter avant de traverser, regarder à gauche et à droite, comprendre les feux et les signaux, ne jamais jouer sur la chaussée.`,
      understands: `L’élève doit comprendre que le danger vient des véhicules qui arrivent vite et ne peuvent pas s’arrêter immédiatement : la prudence est une règle de vie, pas une punition.`,
      retains: ['Les règles de base : marcher sur le côté, traverser au passage piéton après avoir regardé', 'Le sens des feux tricolores : vert = passer, orange = s’arrêter si possible, rouge = stopper', 'Les signaux et panneaux essentiels (stop, passage piétons, école)'],
      canDo: ['Traverser seul en appliquant la règle : stop, regarder, écouter, traverser', 'Expliquer le sens des couleurs du feu tricolore', 'Refuser de jouer dans la rue et expliquer pourquoi'],
      example: vary(notion, [
        'Devant l’école, la classe s’arrête au bord de la route : on regarde à gauche, à droite, puis on traverse au passage piéton.',
        'Un élève montre le feu tricolore : « rouge, on s’arrête ; orange, on prépare l’arrêt ; vert, on passe » — la classe répète en chœur.',
        'Le maître pose la question : pourquoi ne joue-t-on pas près de la route ? Les élèves répondent et complètent avec leurs propres exemples.',
      ]),
      success: `L’élève applique seul la règle de traversée complète et explique correctement les trois couleurs du feu tricolore.`,
    }),
  },
  {
    id: 'droits-devoirs',
    keys: ['droit', 'devoir', 'obligation', 'protection', 'securite', 'instruction'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : un droit, c’est ce que l’enfant ou le citoyen peut légitimement attendre (être protégé, soigné, instruit) ; un devoir, c’est ce qu’il doit faire en retour (respecter, travailler, aider). Droits et devoirs vont toujours par paire.`,
      understands: `L’élève doit comprendre que les droits ne tombent pas du ciel : ils s’accompagnent de devoirs, et que le respect des règles garantit la protection pour tous, en famille comme à l’école.`,
      retains: ['La différence entre un droit et un devoir avec un exemple pour chacun', 'Quelques droits de l’enfant : vie, nom, santé, protection, instruction', 'Les devoirs qui correspondent : respect, travail, obéissance, assistance'],
      canDo: ['Citer 3 droits et 3 devoirs de l’enfant', 'Classer une liste de situations en droits ou en devoirs', 'Expliquer pourquoi un droit exige un devoir'],
      example: vary(notion, [
        'L’école a un droit à la protection ; en retour, l’élève a le devoir de respecter le matériel et les règles de la classe.',
        'À la maison, Sena a droit à la nourriture et aux soins ; son devoir est d’aider aux travaux domestiques qui lui conviennent.',
        'La classe discute : « les enfants ont droit à l’instruction » — que doivent-ils faire pour mériter ce droit ?',
      ]),
      success: `L’élève distingue sans hésiter un droit d’un devoir et relie chaque droit de l’enfant à un devoir correspondant.`,
    }),
  },
  {
    id: 'valeurs-morales',
    keys: ['verite', 'honnetete', 'modestie', 'temperance', 'tolerance', 'sincerite', 'hospitalite', 'entraide', 'assistance', 'exactitude', 'assiduite', 'cooper', 'travail bien fait', 'conscience', 'maitrise', 'paix', 'respect', 'obeissance', 'voler', 'corruption', 'inutile', 'domestique', 'travailler'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » est une valeur morale : une qualité de caractère qui fait qu’on est une personne fiable, aimable et utile aux autres. Elle s’apprend et se pratique tous les jours à l’école, en famille et dans le quartier.`,
      understands: `L’élève doit comprendre que les valeurs ne sont pas des mots à réciter : elles se voient dans les actes (dire la vérité, tenir sa promesse, aider un camarade) et dans les conséquences positives qu’elles produisent chez les autres.`,
      retains: ['Le sens exact de la valeur étudiée et son contraire', '2 situations de la vie scolaire où cette valeur s’applique', 'La différence entre le bien et le mal dans les situations concrètes'],
      canDo: ['Illustrer la valeur par un exemple vécu ou imaginé', 'Choisir la bonne attitude dans une situation donnée et la justifier', 'Reconnaître les actes contraires à la valeur (mensonge, tricherie, vol, paresse)'],
      example: vary(notion, [
        'Fanta a cassé un cahier de la bibliothèque : elle le dit au maître et propose de le remplacer — c’est la vérité et le courage.',
        'Pendant le travail de groupe, Kofi explique à son camarade : « on va ensemble, personne ne reste en arrière » — c’est l’entraide.',
        'Un élève a gagné le jeu : il ne se moque pas des perdants et les encourage — c’est la modestie et le respect.',
      ]),
      success: `L’élève définit la valeur avec ses mots, la reconnaît dans une situation et exhibe le comportement attendu dans la vie de classe.`,
    }),
  },
  {
    id: 'institutions',
    keys: ['commune', 'arrondissement', 'assemblee', 'president', 'constitutionnelle', 'contre-pouvoir', 'decentralisation', 'democratie', 'comite', 'service public', 'services publics', 'nationalite', 'carte d identite', 'carte d electeur', 'impot', 'internationale', 'association', 'administration', 'structure'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la vie en société est organisée par des institutions : la commune, les ministères, l’Assemblée nationale, la présidence, les cours de justice… Elles votent les lois, rendent les services publics et protègent les citoyens.`,
      understands: `L’élève doit comprendre que les institutions ne sont pas des lieux abstraits : ce sont des personnes et des règles qui organisent la vie commune — et que le citoyen participe (élections, impôts, respect des lois, vie associative).`,
      retains: ['Le nom et le rôle de chaque institution étudiée', 'La différence entre pouvoir exécutif (gouvernement), législatif (lois) et judiciaire (justice)', 'Le rôle du citoyen : voter, payer ses impôts, respecter les lois'],
      canDo: ['Associer chaque institution à son rôle', 'Citer 2 services publics et leur utilité', 'Expliquer pourquoi les impôts et les élections sont nécessaires'],
      example: vary(notion, [
        'La classe organise une élection : candidats, votes, dépouillement ; les élèves vivent la démocratie et comprennent le rôle des règles.',
        'Le maître montre la carte du pays : la commune, l’arrondissement et leurs responsables — qui fait quoi pour le quartier ?',
        'Une sortie au marché amène la question : qui entretient la route, l’école, la santé ? Réponse : les services publics financés par les impôts.',
      ]),
      success: `L’élève associe correctement chaque institution à son rôle et explique en 2 phrases la participation du citoyen.`,
    }),
  },
  {
    id: 'vie-scolaire',
    keys: ['charte', 'ecole', 'classe', 'village', 'quartier', 'cep', 'famille'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : l’école, la classe, la famille et le quartier sont les premiers cadres de vie de l’élève. Les connaître (lieux, personnes, règles, plan de la classe ou du village) aide à s’organiser, à s’y sentir en sécurité et à bien y vivre.`,
      understands: `L’élève doit comprendre que chaque cadre de vie a une organisation (espaces, personnes, règles) qui permet à tous de vivre et de travailler ensemble dans de bonnes conditions.`,
      retains: ['Les lieux et les personnes clés de l’école/de la famille/du quartier', 'Les principales règles de vie et leur raison d’être', 'Les éléments d’un plan simple et comment s’en servir'],
      canDo: ['Se repérer dans un plan simple de la classe ou de l’école', 'Expliquer une règle de vie et pourquoi elle existe', 'Décrire son cadre de vie en 3 phrases organisées'],
      example: vary(notion, [
        'La classe dessine son plan : porte, tableau, rangées, bibliothèque — ensuite, les élèves se déplacent en suivant les indications.',
        'Le lundi, la charte de l’école est relue : ponctualité, propreté, respect — chaque élève explique une règle avec ses mots.',
        'Un nouvel élève arrive : c’est la classe qui lui fait visiter et lui explique les règles du quartier de l’école.',
      ]),
      success: `L’élève se repère sur le plan, cite 3 règles et explique l’organisation de son cadre de vie avec les bons mots.`,
    }),
  },
  {
    id: 'culture-societe',
    keys: ['metier', 'fete', 'ceremonie', 'patrimoine', 'recette', 'locomotion', 'debat', 'publicite', 'tradition'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la culture et la société se découvrent à travers les métiers, les fêtes, les traditions, les recettes, les récits. Ces sujets aident l’élève à connaître son milieu, à le respecter et à s’exprimer sur ce qu’il vit.`,
      understands: `L’élève doit comprendre que les traditions et les métiers évoluent, qu’ils racontent la vie des gens, et qu’un débat ou une affiche permet de donner son point de vue avec des arguments.`,
      retains: ['Le vocabulaire lié au thème (métiers, fêtes, patrimoine, publicité…)', 'Les caractéristiques du thème et un exemple local', 'Les règles du débat : écouter, donner son avis, respecter les autres'],
      canDo: ['Décrire le thème étudié à partir de 3 informations exactes', 'Prendre la parole pour exprimer un avis argumenté', 'Rédiger une courte production liée au thème (affiche, recette, invitation)'],
      example: vary(notion, [
        'La classe invite un menuisier du quartier : il présente son métier, ses outils ; les élèves posent leurs questions.',
        'Lors d’une fête traditionnelle, les élèves observent les tenues, la musique et la danse, puis en parlent en classe.',
        'Deux groupes débattent : « les publicités disent-elles toujours la vérité ? » — chacun avance un argument.',
      ]),
      success: `L’élève présente le thème avec des informations exactes et s’exprime clairement avec au moins un argument.`,
    }),
  },
  {
    id: 'musique',
    keys: ['rythme', 'instrument', 'ronde', 'ecoute musicale', 'chant', 'musique'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la musique, c’est l’art des sons et du rythme. On peut écouter, chanter, taper des rythmes, jouer un instrument ou danser en ronde. Elle exprime des émotions et rassemble les gens.`,
      understands: `L’élève doit comprendre que la musique se fait avec la voix, le corps ou un instrument, qu’elle suit un rythme régulier et qu’on peut la reproduire à l’écoute.`,
      retains: ['Les familles d’instruments et leur nom', 'La différence entre chant, rythme et écoute musicale', 'Les paroles et l’air des chants appris (dont l’hymne national)'],
      canDo: ['Reproduire un rythme simple en frappant dans les mains', 'Chanter en chœur en suivant la mélodie', 'Reconnaître un instrument et le nommer à l’écoute'],
      example: vary(notion, [
        'Le maître frappe un rythme : les élèves le répètent en chœur, puis chacun cherche son propre rythme.',
        'La classe écoute un tambour : les élèves ferment les yeux et devinent les instruments qu’ils entendent.',
        'Avant la fête de l’école, tous répètent la ronde chantée : les paroles, les gestes et le pas s’enchaînent.',
      ]),
      success: `L’élève reproduit le rythme demandé, chante la chanson en chœur et reconnaît les instruments étudiés.`,
    }),
  },
  {
    id: 'danse',
    keys: ['danse'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la danse est l’art de bouger le corps en suivant la musique. Elle développe l’équilibre, la coordination et la mémoire des mouvements ; la danse traditionnelle fait partie de la culture de chaque peuple.`,
      understands: `L’élève doit comprendre que danser, c’est respecter la musique et les autres danseurs : on écoute le rythme, on enchaîne des pas précis, on reste ensemble et discipliné.`,
      retains: ['Les pas simples appris et leur ordre', 'L’importance du rythme et de l’écoute de la musique', 'Le respect de l’espace et des autres danseurs'],
      canDo: ['Exécuter la danse étudiée en suivant le rythme', 'Distinguer les parties de la danse (début, mouvements, fin)', 'Danser en groupe sans se bousculer'],
      example: vary(notion, [
        'Pendant la fête de l’école, la classe présente une danse traditionnelle apprise pendant deux semaines.',
        'Le maître frappe le rythme : les élèves avancent, tournent, tapent des mains, puis reviennent au début de la ronde.',
        'Les élèves observent une danse traditionnelle et repèrent les mouvements répétés — la classe les imite ensuite.',
      ]),
      success: `L’élève exécute la danse dans l’ordre, en rythme, et reste en groupe sans perturber les autres.`,
    }),
  },
  {
    id: 'arts-plastiques',
    keys: ['dessin', 'peinture', 'coloriage', 'decoupage', 'collage', 'guirlande', 'enfilage', 'pliage', 'modelage', 'masque', 'mobile', 'embellir', 'cadre de vie'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les arts plastiques utilisent la main et les matériaux pour créer : dessiner, peindre, colorier, découper, coller, plier, modeler, enfiler. Ils développent la créativité, la précision des gestes et le sens de la beauté.`,
      understands: `L’élève doit comprendre qu’une réalisation artistique se prépare (observer, choisir), se réalise avec soin et peut être présentée aux autres ; il n’y a pas de « beau » unique : chaque création raconte quelque chose.`,
      retains: ['Le vocabulaire : contour, couleur, forme, collage, symétrie, modèle', 'Les étapes de la réalisation : préparer, réaliser, vérifier, embellir', 'Les règles de propreté et de sécurité avec les outils (ciseaux, colle)'],
      canDo: ['Réaliser le travail demandé en suivant les étapes', 'Utiliser correctement les outils (ciseaux, colle, crayons)', 'Décrire sa création et dire ce qu’elle représente'],
      example: vary(notion, [
        'La classe prépare des guirlandes pour la fête : pliage, découpage, collage — chaque élève fabrique une partie du décor.',
        'Après avoir observé un masque traditionnel, les élèves créent leur propre masque avec des couleurs et des motifs.',
        'Pour décorer le cadran de la porte, les élèves peignent par symétrie : une moitié, puis son reflet exact.',
      ]),
      success: `L’élève réalise sa production en suivant les étapes, utilise bien les outils et présente son travail avec des mots simples.`,
    }),
  },
  {
    id: 'lecture-orale',
    keys: ['communication', 'entretien', 'lecture', 'conte', 'oral'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : lire et parler, c’est échanger avec les autres. La lecture (découverte, systématique, oralisée) apprend à comprendre un texte ; la communication orale apprend à raconter, rapporter, dialoguer — toujours avec un message clair et une voix audible.`,
      understands: `L’élève doit comprendre que lire ne se limite pas à déchiffrer : il faut comprendre ce qu’on lit. Et qu’à l’oral, on s’exprime pour être compris : on parle fort, lentement, dans l’ordre.`,
      retains: ['Les mots nouveaux et leur sens dans le texte', 'L’ordre logique du récit : début, suite, fin — et les personnages', 'Les règles de l’oral : voix, regard, ordre des idées, écoute des autres'],
      canDo: ['Lire un texte court à voix haute sans erreur, avec le ton', 'Répondre à des questions sur le texte lu (qui ? quoi ? où ? quand ?)', 'Rapporter un entretien ou raconter un événement dans l’ordre'],
      example: vary(notion, [
        'La classe lit « J’aime la nature » : chacun lit une phrase, puis répond : qui parle ? que fait-il ? pourquoi ?',
        'Un élève rapporte l’entretien qu’il a eu avec le directeur : il commence par le début et termine par la fin de la conversation.',
        'Lecture oralisée : chacun dit son passage avec le ton, pendant que les autres écoutent sans interrompre.',
      ]),
      success: `L’élève lit le texte avec exactitude et compréhension, et raconte une situation dans l’ordre avec une voix claire.`,
    }),
  },
  {
    id: 'phonologie',
    keys: ['combinatoire', 'syllabe'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les mots sont faits de sons que l’on combine (syllabes, groupes de lettres comme « ien », « or », « ar », « ière »). La combinatoire apprend à associer les lettres aux sons pour lire de nouveaux mots.`,
      understands: `L’élève doit comprendre que lire, c’est transformer des lettres en sons puis assembler ces sons pour former des mots qu’on reconnaît.`,
      retains: ['Le son étudié et les lettres qui le produisent', 'Des exemples de mots contenant le son (avec les graphies différentes)', 'La technique : lettres → sons → syllabes → mots'],
      canDo: ['Reconnaître le son étudié à l’oral et à l’écrit', 'Lire des syllabes et des mots nouveaux contenant le son', 'Écrire des mots simples avec ce son sous la dictée'],
      example: vary(notion, [
        'La classe joue au « train des sons » : chaque wagon porte une syllabe (« ien », « or ») et les élèves construisent des mots.',
        'Le maître montre « chien » et « bien » : les élèves repèrent le son « ien » et trouvent d’autres mots.',
        'Dans le texte du jour, les élèves entourent toutes les syllabes étudiées puis relisent le texte entier.',
      ]),
      success: `L’élève isole le son étudié, lit sans aide des mots nouveaux qui le contiennent et l’écrit correctement.`,
    }),
  },
  {
    id: 'ecriture',
    keys: ['ecriture', 'tracer', 'dictee', 'expression ecrite'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : écrire, c’est tracer des lettres puis assembler des mots et des phrases pour exprimer une idée. La dictée et l’expression écrite vérifient que l’élève écrit proprement, sans erreurs et de façon compréhensible.`,
      understands: `L’élève doit comprendre qu’on écrit pour être lu : la forme (lettres bien tracées, mots séparés, majuscules, ponctuation) sert le sens (personne ne doit avoir de mal à lire ce qu’on a écrit).`,
      retains: ['Le tracé correct des lettres (sens, hauteur, attaches)', 'Les règles : majuscule au début, point à la fin, mots séparés', 'La relecture : vérifier les mots et la ponctuation avant de rendre'],
      canDo: ['Écrire lisiblement des mots et des phrases sans modèle', 'Écrire sous la dictée des mots et phrases simples', 'Écrire 2-3 phrases sur un sujet connu avec majuscule et point'],
      example: vary(notion, [
        'Chaque matin, cinq minutes d’écriture : les élèves tracent dans l’air, puis sur l’ardoise, la lettre du jour.',
        'La dictée du jeudi : trois mots du vocabulaire, une phrase complète — les élèves se relisent avant de rendre.',
        'La classe écrit des messages d’invitation pour la fête : chacun vérifie la majuscule, les points et les mots espacés.',
      ]),
      success: `Les mots sont lisibles et bien espacés, la dictée ne contient pas d’erreur sur les mots travaillés, et les phrases respectent majuscule et point.`,
    }),
  },
  {
    id: 'lettres',
    keys: ['lettre', 'invitation'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la lettre est un écrit que l’on adresse à quelqu’un (personnelle, administrative ou message d’invitation). Elle est organisée : date, destinataire, message, formule de politesse, signature.`,
      understands: `L’élève doit comprendre qu’une lettre s’adapte à son destinataire : on écrit à sa famille autrement qu’à une administration, et la politesse fait partie de la lettre.`,
      retains: ['Les parties de la lettre : lieu et date, destinataire, corps, formules de politesse, signature', 'Les formules de politesse selon le destinataire', 'L’objet de la lettre et l’idée principale'],
      canDo: ['Identifier les parties d’une lettre modèle', 'Rédiger une lettre simple (invitation, remerciement) avec les formules adaptées', 'Présenter proprement la lettre (marges, alinéas, signature)'],
      example: vary(notion, [
        'La classe écrit une lettre d’invitation au directeur pour la fête de fin d’année : date, formule, signature.',
        'Les élèves écrivent à une ONG pour présenter leur école : ils expliquent ce dont elle a besoin et remercient.',
        'Lettre personnelle : chacun écrit à un ami pour raconter sa semaine — la classe compare les formules de politesse.',
      ]),
      success: `La lettre produite contient toutes ses parties dans l’ordre, une idée claire et une formule de politesse adaptée.`,
    }),
  },
  {
    id: 'types-textes',
    keys: ['description', 'recit', 'consigne', 'compte rendu', 'affiche', 'article', 'enquete', 'recette', 'proverbe', 'publicite', 'journal'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : chaque type de texte a sa fonction : la description montre, le récit raconte, la consigne commande, l’affiche informe, l’article de journal relate un fait, la recette explique comment faire, le proverbe donne une leçon de sagesse.`,
      understands: `L’élève doit comprendre que l’on reconnaît un texte à sa forme et à son but : dire ce que l’on voit, raconter ce qui est arrivé, expliquer comment faire — et qu’il faut s’appuyer sur sa structure pour le rédiger.`,
      retains: ['La fonction de chaque type de texte et un exemple', 'La structure type (début, développement, fin ; ingrédients et étapes…)', 'Les mots-outils de chaque texte (d’abord, puis, enfin…)'],
      canDo: ['Reconnaître le type d’un texte et justifier sa réponse', 'Répondre à une consigne en respectant toutes ses parties', 'Produire un texte court du type étudié avec une structure correcte'],
      example: vary(notion, [
        'Les élèves lisent une affiche de santé : ils repèrent le message, le dessin et le slogan — trois éléments de l’affiche.',
        'La classe prépare la recette du gâteau : les élèves ordonnent les ingrédients et les étapes avant de rédiger.',
        'Un article relate la fête de l’école : les élèves recherchent qui, quoi, où, quand, pourquoi — les réponses données au journal.',
      ]),
      success: `L’élève identifie le type de texte et sa fonction, et produit un écrit structuré qui respecte le modèle étudié.`,
    }),
  },
  {
    id: 'vocabulaire',
    keys: ['vocabulaire'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le vocabulaire, c’est l’ensemble des mots que l’on connaît et utilise. Le vocabulaire thématique regroupe les mots d’un même domaine (santé, environnement, technique…) pour mieux en parler et mieux écrire.`,
      understands: `L’élève doit comprendre que connaître un mot, c’est pouvoir le prononcer, l’écrire, dire ce qu’il signifie et l’employer dans une phrase — et que les mots d’un même thème s’aident entre eux.`,
      retains: ['Les mots du thème étudié et leur sens', 'La famille de mots et les mots proches (synonymes) et contraires', 'L’emploi correct de chaque mot dans une phrase'],
      canDo: ['Classer des mots selon le thème', 'Expliquer le sens d’un mot du thème avec ses propres mots', 'Utiliser 3 mots nouveaux dans des phrases correctes'],
      example: vary(notion, [
        'La classe construit l’affiche « La santé » : les élèves proposent des mots, les classent et les illustrent.',
        'Après la visite du jardin, les élèves listent les mots de l’environnement : plante, eau, soleil, arrosoir…',
        'Jeu du dictionnaire vivant : chacun définit un mot du thème, les autres devinent le mot.',
      ]),
      success: `L’élève emploie correctement au moins 5 mots du thème dans des phrases et en explique le sens sans aide.`,
    }),
  },
  {
    id: 'grammaire',
    keys: ['grammaire', 'phrase', 'nom', 'verbe', 'adjectif', 'pluriel', 'feminin', 'pronom', 'adverbe', 'subordonnee', 'groupe', 'types de nom'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la grammaire décrit le fonctionnement de la langue : la phrase, le nom, le verbe, l’adjectif, les pronoms, les groupes de mots. Elle aide à construire des phrases correctes et à les comprendre.`,
      understands: `L’élève doit comprendre que la phrase a une structure : quelque chose ou quelqu’un (sujet/groupe nominal) + ce qu’il fait ou ce qu’on en dit (verbe/groupe verbal) ; et que chaque mot a un rôle dans cette construction.`,
      retains: ['La définition et les exemples de chaque classe de mots', 'Les marques du pluriel et du féminin', 'La structure de la phrase simple : sujet + verbe + complément'],
      canDo: ['Identifier la classe d’un mot dans une phrase (nom, verbe, adjectif…)', 'Transformer une phrase (singulier → pluriel, féminin → masculin)', 'Construire une phrase correcte en respectant l’accord sujet-verbe'],
      example: vary(notion, [
        'La classe chasse au trésor dans le texte : entourer les noms en rouge, les verbes en vert, les adjectifs en bleu.',
        'Le maître dit « un élève travaille » et demande de mettre au pluriel : « des élèves travaillent » — la classe observe les changements.',
        'Les élèves construisent des phrases avec des étiquettes : elles doivent s’accorder et se mettre dans le bon ordre.',
      ]),
      success: `L’élève identifie les classes de mots étudiées dans une phrase et applique les accords sans se tromper.`,
    }),
  },
  {
    id: 'conjugaison',
    keys: ['conjugaison', 'infinitif', 'present', 'futur', 'passe', 'participe', 'imparfait', 'plus que parfait'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le verbe change de forme selon le temps (présent, futur, passé composé, imparfait…) et selon la personne (je, tu, il…). C’est ce qu’on appelle conjuguer.`,
      understands: `L’élève doit comprendre que le temps du verbe situe l’action dans le temps : ce qui se passe maintenant (présent), ce qui se passera (futur), ce qui est déjà arrivé (passé) — et que la terminaison change avec la personne.`,
      retains: ['L’infinitif du verbe, c’est son nom : parler, finir, prendre…', 'Les terminaisons des temps étudiés (présent, futur, imparfait, passé composé)', 'L’accord du participe passé avec être et l’auxiliaire (avoir/être)'],
      canDo: ['Reconnaître le temps d’une forme verbale', 'Conjuguer les verbes étudiés aux personnes et temps demandés', 'Choisir le bon temps dans une phrase (hier → passé, demain → futur)'],
      example: vary(notion, [
        'La classe joue au jeu du temps : « hier je… (mangé) », « aujourd’hui je… (mange) », « demain je… (mangerai) ».',
        'Le maître raconte au passé composé : les élèves repèrent les verbes et l’auxiliaire, puis transforment une phrase au présent.',
        'Les élèves conjuguent « chanter » au présent sur un air connu : je chante, tu chantes, il chante…',
      ]),
      success: `L’élève conjugue correctement les verbes étudiés et choisit le bon temps selon la situation.`,
    }),
  },
  {
    id: 'orthographe',
    keys: ['orthographe', 'homophone', 'alphabet'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : l’orthographe, c’est l’écriture correcte des mots (alphabet, sons, lettres muettes, accords). Certains mots se prononcent pareil mais s’écrivent différemment : ce sont les homophones (a/à, et/est, on/ont, ces/ses, son/sont…).`,
      understands: `L’élève doit comprendre que l’orthographe aide à se faire comprendre à l’écrit et que l’on choisit le bon homophone en le remplaçant par un autre mot (on/ont → « avoir » : ils ont / ils avaient).`,
      retains: ['Les homophones étudiés et la règle pour choisir', 'Les mots invariables et les mots du vocabulaire à mémoriser', 'La méthode : remplacer, vérifier, se relire'],
      canDo: ['Choisir le bon homophone dans une phrase', 'Écrire les mots étudiés sans faute', 'Se relire et corriger ses propres erreurs d’orthographe'],
      example: vary(notion, [
        'Astuce de classe : pour « on/ont », on remplace par « avaient » — « ils ont des livres » → « ils avaient des livres » : c’est ont.',
        'La dictée du jour contient des homophones : les élèves surlignent chaque homophone et justifient leur choix avant la correction.',
        'Le maître écrit « a/à » au tableau : « il va à l’école, il a un sac » — les élèves inventent leurs phrases.',
      ]),
      success: `L’élève choisit sans erreur les homophones étudiés dans des phrases et écrit sans faute les mots de la semaine.`,
    }),
  },
  {
    id: 'numerations',
    keys: ['nombre', 'numer', 'million', 'milliard'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la numération, c’est le système pour écrire et lire les nombres : unités, dizaines, centaines, milliers, millions… Elle permet de compter, comparer, ranger et comprendre la valeur de chaque chiffre selon sa position.`,
      understands: `L’élève doit comprendre que la position d’un chiffre change sa valeur (dans 321, le 3 vaut 300) et que les nombres s’écrivent et se lisent de gauche à droite par classes.`,
      retains: ['Le tableau de numération : unités, dizaines, centaines, milliers', 'La lecture et l’écriture en chiffres et en lettres', 'La comparaison et le rangement (croissant/décroissant)'],
      canDo: ['Décomposer un nombre (3 205 = 3 000 + 200 + 5)', 'Lire et écrire les nombres étudiés, en chiffres et en lettres', 'Comparer et ranger des nombres de la classe étudiée'],
      example: vary(notion, [
        'La classe fabrique le tableau de numération avec des boîtes : on range 1 000 + 100 + 10 + 1 pour écrire 1 111.',
        'Avec des billets et des pièces factices, les élèves composent 5 000 F, puis le lisent et l’écrivent en lettres.',
        'Jeu du plus grand nombre : chacun tire des étiquettes et compose le plus grand nombre possible, puis compare.',
      ]),
      success: `L’élève lit, écrit, décompose et compare correctement les nombres de sa classe de numération.`,
    }),
  },
  {
    id: 'operations',
    keys: ['addition', 'soustraction', 'multiplication', 'division', 'calcul'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les opérations servent à résoudre des problèmes de la vie : ajouter (addition), enlever ou comparer (soustraction), répéter une même quantité (multiplication), partager (division). Chaque opération a son sens et son vocabulaire.`,
      understands: `L’élève doit comprendre que chaque opération répond à une question précise (combien en tout ? combien reste-t-il ? combien de fois ? combien chacun ?) et qu’il faut choisir la bonne opération avant de calculer.`,
      retains: ['Le sens de chaque opération et son vocabulaire (somme, différence, produit, quotient)', 'Les tables et les techniques de calcul posé', 'Les mots qui aident au choix : en tout, reste, chaque, partager…'],
      canDo: ['Choisir la bonne opération dans un problème simple', 'Poser et calculer correctement l’opération', 'Vérifier le résultat par une autre méthode (addition inverse, ordre de grandeur)'],
      example: vary(notion, [
        'Le marché : maman achète 3 mangues à 200 F et 1 ananas à 500 F — combien va-t-elle payer ? Addition, puis multiplication selon ce qu’on cherche.',
        'La classe de 24 élèves se partage en 4 groupes : combien d’élèves par groupe ? Division.',
        'Un problème posé par un élève : « j’avais 50 billes, j’en ai perdu 12, combien m’en reste-t-il ? » — soustraction.',
      ]),
      success: `L’élève choisit l’opération juste, la pose correctement et obtient un résultat qu’il sait vérifier.`,
    }),
  },
  {
    id: 'fractions-decimaux',
    keys: ['fraction', 'decimal', 'pourcentage'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : une fraction exprime une partie d’un tout (1/2 de la classe, 3/4 du gâteau) ; les nombres décimaux (3,25) précisent des mesures ; le pourcentage (50 %) exprime une proportion sur 100.`,
      understands: `L’élève doit comprendre qu’une fraction se lit « sur » un tout partagé en parts égales, et que les décimaux et pourcentages sont d’autres écritures des mêmes quantités (0,5 = 1/2 = 50 %).`,
      retains: ['Le vocabulaire : numérateur, dénominateur ; partie entière, partie décimale', 'Les écritures équivalentes : fraction, décimal, pourcentage', 'Les comparaisons simples (1/2 < 3/4 ; 0,5 < 0,75)'],
      canDo: ['Représenter une fraction sur une bande ou un disque', 'Lire, écrire et comparer des décimaux simples', 'Calculer une fraction simple d’une quantité ou un pourcentage simple'],
      example: vary(notion, [
        'La classe partage une tarte en 4 parts égales : chaque part est 1/4, deux parts font 2/4 = 1/2.',
        'Au marché, 1 kg de riz à 500 F : 0,5 kg coûte 250 F — les élèves relient le décimal à la monnaie.',
        'L’école a 100 élèves et 50 % sont des filles : combien de filles ? La moitié — 50 filles.',
      ]),
      success: `L’élève représente, lit et compare correctement les fractions et décimaux étudiés et résout le problème posé.`,
    }),
  },
  {
    id: 'mesures',
    keys: ['longueur', 'metre', 'masse', 'capacite', 'volume', 'duree', 'heure', 'calendrier', 'conversion', 'debit', 'angle'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : mesurer, c’est comparer une grandeur à une unité : la longueur en mètres, la masse en kilogrammes, la capacité en litres, la durée en heures… Chaque mesure a ses unités et ses instruments.`,
      understands: `L’élève doit comprendre qu’on ne mesure pas avec les mains mais avec une unité fixe, que les unités se convertissent (1 m = 100 cm), et que l’instrument doit être bien utilisé pour un résultat juste.`,
      retains: ['Les unités de chaque grandeur et leurs relations (1 m = 100 cm ; 1 kg = 1 000 g ; 1 h = 60 min…)', 'L’instrument adapté : règle, balance, verre gradué, horloge', 'Le tableau de conversion et la technique de conversion'],
      canDo: ['Choisir la bonne unité selon l’objet (m, cm, km…)', 'Utiliser l’instrument et lire la mesure', 'Convertir des mesures simples et résoudre un problème de mesure'],
      example: vary(notion, [
        'La classe mesure la porte : c’est 2 m, soit 200 cm — le tableau de conversion est utilisé pour vérifier.',
        'Au marché, on pèse les ignames : 3 kg = 3 000 g — les élèves lisent la balance et convertissent.',
        'Leçon d’horloge : la récréation dure 15 minutes ; les élèves montrent l’heure de début et de fin sur l’horloge de classe.',
      ]),
      success: `L’élève choisit la bonne unité, lit correctement l’instrument et convertit sans erreur les mesures simples.`,
    }),
  },
  {
    id: 'monnaie-finances',
    keys: ['monnaie', 'piece', 'prix', 'benefice', 'perte', 'credit', 'epargne', 'change', 'taux', 'achat'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la monnaie sert à acheter et à vendre. On distingue le prix d’achat, le prix de vente, le bénéfice et la perte ; économiser (épargne) et emprunter (crédit) sont des pratiques de la vie financière.`,
      understands: `L’élève doit comprendre que l’argent se compte, se gagne et se dépense ; qu’un commerçant gagne quand le prix de vente dépasse le prix d’achat, et perd dans le cas contraire — et que l’épargne permet de prévoir.`,
      retains: ['Les opérations simples : prix d’achat + bénéfice = prix de vente', 'La différence entre besoin et envie, l’utilité de l’épargne', 'Le vocabulaire : dépense, recette, bénéfice, perte, crédit, change'],
      canDo: ['Rendre la monnaie dans une situation d’achat', 'Calculer un bénéfice ou une perte simple', 'Comparer deux prix et choisir la meilleure offre'],
      example: vary(notion, [
        'La classe organise une petite vente : achat 100 F, vente 150 F → bénéfice de 50 F par article, calculé au tableau.',
        'Un élève achète pour 750 F et donne 1 000 F : combien doit-on lui rendre ? La classe s’entraîne à rendre la monnaie.',
        'Chacun imagine son projet d’épargne : mettre 25 F par semaine pour acheter un cahier à la fin du mois.',
      ]),
      success: `L’élève calcule correctement un bénéfice ou une perte simple et rend la monnaie juste dans les situations étudiées.`,
    }),
  },
  {
    id: 'geometrie',
    keys: ['ligne', 'polyedre', 'polygone', 'cercle', 'triangle', 'rectangle', 'carre', 'symetri', 'pyramide', 'prisme', 'quadrillage', 'parallele', 'glissement', 'figure', 'droite'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la géométrie étudie les formes et les figures : lignes, polygones (triangle, rectangle, carré), cercle, solides (pyramide, prisme, polyèdres) et leurs propriétés (côtés, angles, symétrie, parallélisme).`,
      understands: `L’élève doit comprendre qu’une figure se reconnaît et se décrit par ses propriétés (nombre de côtés, longueurs, angles droits…) et que ces propriétés permettent de la tracer et de la classer.`,
      retains: ['Les propriétés des figures étudiées (côtés, sommets, angles, symétrie)', 'Le vocabulaire exact : côté, sommet, arête, face, rayon, diamètre', 'L’usage correct des instruments (règle, équerre, compas)'],
      canDo: ['Reconnaître, nommer et classer les figures', 'Tracer une figure avec les instruments', 'Utiliser les propriétés pour identifier (ex. un rectangle a 4 angles droits)'],
      example: vary(notion, [
        'La classe chasse aux figures dans la cour : la porte est un rectangle, le ballon est une sphère, le toit est un triangle.',
        'Avec l’équerre, les élèves vérifient les angles droits du tableau et du cahier : les angles droits sont partout.',
        'Le quadrillage sert de repère : les élèves copient une figure case par case et découvrent la symétrie.',
      ]),
      success: `L’élève nomme les figures, énonce leurs propriétés et les trace correctement avec les instruments.`,
    }),
  },
  {
    id: 'aires-volumes',
    keys: ['perimetre', 'aire', 'pavage', 'surface'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le périmètre est la longueur du contour d’une figure ; l’aire est la mesure de sa surface ; le volume mesure l’espace occupé par un solide. On les calcule avec des formules adaptées à la figure.`,
      understands: `L’élève doit comprendre la différence entre longueur (périmètre, en m) et surface (aire, en m²), et que les aires se comparent par pavage ou se calculent avec les formules (rectangle : L × l ; triangle : base × hauteur ÷ 2).`,
      retains: ['Les formules : rectangle L × l ; carré c × c ; triangle (b × h) ÷ 2 ; cube et pavé : L × l × h', 'Les unités : m, m², m³ et leurs liens', 'Le vocabulaire : contour, surface, unité d’aire, face, arête'],
      canDo: ['Mesurer un périmètre et calculer l’aire d’une figure donnée', 'Choisir la bonne formule', 'Résoudre un problème concret de surface ou de volume'],
      example: vary(notion, [
        'La classe veut entourer le jardin de l’école : on mesure les côtés, on additionne → le périmètre ; puis on calcule l’aire pour semer.',
        'Avec des carreaux de papier, les élèves pavent un rectangle de 3 × 4 : 12 carreaux, soit une aire de 12 unités.',
        'La caisse de riz : L 80 cm × l 40 cm × h 60 cm — les élèves calculent le volume utilisable.',
      ]),
      success: `L’élève distingue périmètre, aire et volume, applique la bonne formule et donne l’unité correcte.`,
    }),
  },
  {
    id: 'statistiques',
    keys: ['tableau', 'diagramme', 'moyenne', 'proportionnalite', 'echelle'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les statistiques servent à organiser et à lire des informations : tableaux, diagrammes, moyennes, pourcentages. La proportionnalité et l’échelle permettent de passer d’une quantité connue à une autre.`,
      understands: `L’élève doit comprendre qu’un tableau ou un diagramme se lit : lignes, colonnes, axes, échelle — et qu’une moyenne s’obtient en partageant équitablement le total.`,
      retains: ['La lecture d’un tableau à double entrée et d’un diagramme', 'La moyenne : somme ÷ nombre de valeurs', 'La règle de trois pour les situations de proportionnalité'],
      canDo: ['Lire et compléter un tableau ou un diagramme', 'Calculer une moyenne simple', 'Résoudre un problème de proportionnalité par retour à l’unité'],
      example: vary(notion, [
        'La classe compte les absents de la semaine : le tableau et le diagramme en barres montrent le jour le plus chargé.',
        '20 élèves, 2 équipes : chaque équipe… non — retour à l’unité : 6 cahiers coûtent 600 F, donc 1 cahier coûte 100 F.',
        'Scores de dictée : 12, 14, 16 — moyenne = (12+14+16) ÷ 3 = 14, la classe calcule et vérifie.',
      ]),
      success: `L’élève lit correctement le tableau ou le diagramme, calcule la moyenne et résout la situation de proportionnalité.`,
    }),
  },
  {
    id: 'eps-mobilite',
    keys: ['repere', 'deplacement', 'marcher', 'courir', 'locomotrice', 'brouette', 'gue', 'manier', 'ruade', 'poussee', 'retention', 'touche', 'parcours', 'franchissement', 'cadence'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : c’est un exercice d’éducation physique qui développe les capacités de base du corps : se déplacer, se situer dans l’espace, garder l’équilibre, maîtriser ses gestes et s’organiser par rapport aux autres et au matériel.`,
      understands: `L’élève doit comprendre que ces exercices demandent attention et maîtrise : regarder devant soi, contrôler son corps, respecter les consignes et l’espace des autres.`,
      retains: ['Les consignes de l’exercice et la position du corps', 'Les règles de sécurité (matériel, espace, camarades)', 'Le vocabulaire : repère, trajectoire, appui, équilibre'],
      canDo: ['Réaliser l’exercice en respectant la consigne', 'Se déplacer en sécurité dans l’espace du gymnase ou de la cour', 'Se repérer par rapport au matériel et aux autres'],
      example: vary(notion, [
        'Sur le parcours de la cour, les élèves se déplacent en passant sous les obstacles, sans les toucher.',
        'Le jeu de la brouette : un élève marche sur les mains pendant que son camarade tient ses jambes — il faut confiance et coordination.',
        'La traversée à gué : passer d’un repère à l’autre sans poser le pied au sol — équilibre et précision.',
      ]),
      success: `L’élève exécute l’exercice sans faute de consigne, avec contrôle et sécurité, et sait se situer dans l’espace.`,
    }),
  },
  {
    id: 'eps-course',
    keys: ['course', 'endurance', 'vitesse', 'relais', 'sprint', 'obstacle'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la course développe l’endurance et la vitesse : courir longtemps sans s’arrêter, ou courir vite sur une courte distance. Elle apprend à gérer son souffle et son effort.`,
      understands: `L’élève doit comprendre la différence entre vitesse (courir vite, peu de temps) et endurance (courir longtemps, à son rythme), et l’importance de bien repartir et de s’arrêter progressivement.`,
      retains: ['Les règles de la course : départ, couloir, arrivée', 'La gestion du souffle : inspirer par le nez, expirer par la bouche', 'Les règles de sécurité et de fair-play (ne pas gêner, ne pas dépasser au départ)'],
      canDo: ['Courir la distance demandée sans s’arrêter', 'Partir au signal et terminer sa course', 'Respecter les autres coureurs et le terrain'],
      example: vary(notion, [
        'Le circuit d’endurance est délimité par des cônes : les élèves doivent tenir 5 minutes en courant à leur allure.',
        'La course de vitesse 60 m : au signal, les élèves sprintent dans leur couloir jusqu’à la ligne d’arrivée.',
        'La course de relais : le témoin passe de main en main ; l’équipe gagne si le passage se fait sans faute.',
      ]),
      success: `L’élève tient la distance ou la vitesse demandée, respecte le départ, le parcours et l’arrivée, sans tricher.`,
    }),
  },
  {
    id: 'eps-corde',
    keys: ['corde', 'grimper'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : la corde (saut à la corde, grimper à la corde) développe la coordination, la force des bras et le rythme : sauter par-dessus la corde qui tourne, ou grimper en se hissant bras et jambes.`,
      understands: `L’élève doit comprendre que la corde demande du rythme (sauter au bon moment) ou de la prise (tenir, tirer, serrer) et que la sécurité impose de vérifier le matériel et l’espace.`,
      retains: ['La technique de saut : pieds joints, petits sauts réguliers, bras le long du corps', 'La technique de grimpe : mains serrées, jambes qui poussent', 'Les règles de sécurité : corde vérifiée, espace dégagé, pieds au sol au début'],
      canDo: ['Sauter à la corde plusieurs fois sans s’arrêter', 'Grimper à la corde en alternant mains et jambes', 'S’entraîner avec les autres sans gêner'],
      example: vary(notion, [
        'La corde est tendue dans la cour : les élèves sautent par-dessus en chassant les deux pieds.',
        'Elle tourne maintenant : un élève entre, saute 10 fois et sort ; chaque élève compte sa série.',
        'Pour grimper, les élèves serrent la corde entre les genoux et montent petit à petit, mains au-dessus des mains.',
      ]),
      success: `L’élève enchaîne au moins 10 sauts à la corde ou grimpe une partie de la corde avec la bonne technique.`,
    }),
  },
  {
    id: 'eps-saut',
    keys: ['saut', 'triple', 'multi-bonds', 'hauteur', 'extension'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : le saut développe la détente et la coordination : sauter loin (longueur), haut (hauteur), ou enchaîner des bonds (triple saut, multi-bonds) avec une bonne impulsion et une réception maîtrisée.`,
      understands: `L’élève doit comprendre qu’un bon saut suit une technique : élan, impulsion, envol, réception — et que la réception (genoux fléchis) protège les jambes.`,
      retains: ['Les phases du saut : élan, impulsion, envol, réception', 'La règle de mesure (zone d’appel, ligne de départ)', 'Les consignes de sécurité à la réception'],
      canDo: ['Enchaîner élan-impulsion-réception correctement', 'Prendre son appel au bon endroit', 'Mesurer et comparer ses performances'],
      example: vary(notion, [
        'Le saut en hauteur : les élèves sautent par-dessus l’élastique posé bas, puis la barre monte doucement.',
        'Au triple saut, les élèves enchaînent cloche-pied, cloche-pied, puis réception des deux pieds.',
        'Le saut en extension au-dessus du cerceau : pousser fort sur les jambes et tomber sur les deux pieds, genoux fléchis.',
      ]),
      success: `L’élève respecte les phases du saut, prend son appel au bon endroit et réceptionne en sécurité.`,
    }),
  },
  {
    id: 'eps-lancer',
    keys: ['lancer'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : lancer, c’est projeter un objet (ballon, balle, poids, anneau) le plus loin ou le plus précisément possible. Cela développe la force des bras, la coordination et la précision.`,
      understands: `L’élève doit comprendre qu’un bon lancer combine position du corps, élan, geste du bras et lâcher de l’objet au bon moment, et que la sécurité impose de lancer uniquement au signal.`,
      retains: ['Les consignes de sécurité (espace dégagé, signal, matériel)', 'Les phases : position, élan, lancer, lâcher', 'La différence entre lancer loin (force) et lancer précis (cible)'],
      canDo: ['Lancer au signal, dans la zone autorisée', 'Viser une cible fixe ou lancer le plus loin possible', 'Récupérer le matériel sans courir devant les lanceurs'],
      example: vary(notion, [
        'Lancer sur cibles : chaque élève vise les cônes posés à distance et compte ses points.',
        'Le lancer de force : les élèves lancent la balle de mousse au-dessus de la ligne et comparent leurs distances.',
        'Lancer-attraper à deux : lancer précis et réception des deux mains, sans faire tomber la balle.',
      ]),
      success: `L’élève lance au signal en sécurité, respecte la zone, et atteint la cible ou la distance attendue.`,
    }),
  },
  {
    id: 'eps-equilibre',
    keys: ['equilibre', 'roulade', 'chandelle', 'posturale', 'planche', 'trepied'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : ce sont des exercices de gymnastique qui développent l’équilibre et le contrôle du corps : tenir en équilibre (planche, trépied, chandelle), rouler (roulade avant), maîtriser son corps au sol et en appui.`,
      understands: `L’élève doit comprendre que l’équilibre se tient par le centre du corps : regard, appuis, gainage — et que chaque figure a une position sûre qu’il faut respecter.`,
      retains: ['La position correcte de chaque figure (tête, dos, bras, appuis)', 'L’ordre des étapes et l’aide éventuelle du maître', 'Les règles de sécurité : tapis, espace, aide'],
      canDo: ['Tendre une attitude simple (planche faciale, trépied) quelques secondes', 'Réaliser la roulade avant en gardant la tête rentrée', 'Se placer et se relever sans danger'],
      example: vary(notion, [
        'Sur le tapis, la roulade avant se prépare : tête rentrée, dos rond, puis on roule et on se relève sans les mains.',
        'La planche faciale : les élèves tiennent la position 10 secondes en alignant tête, dos et jambes.',
        'Le trépied (appui sur la tête et les mains) se fait d’abord avec l’aide du maître, puis seul.',
      ]),
      success: `L’élève réalise la figure avec la bonne position, sans aide (ou avec l’aide prévue), et en sécurité.`,
    }),
  },
  {
    id: 'eps-jeux',
    keys: ['jeux', 'football', 'handball', 'lutte', 'marquage', 'passe', 'tournoi', 'tache commune', 'opposition', 'cooperation', 'equipe', 'tir'],
    build: (notion, _level) => ({
      explanation: `« ${notion} » : les jeux collectifs (football, handball, jeux d’opposition ou de coopération, lutte, relais, tournois) apprennent à jouer avec les autres : passer, marquer, défendre, coopérer ou s’opposer selon les règles.`,
      understands: `L’élève doit comprendre qu’une équipe gagne ensemble : la règle est la même pour tous, on joue sans violence, on passe la balle et on respecte l’arbitre et les adversaires.`,
      retains: ['Les règles essentielles du jeu pratiqué', 'Les rôles : attaquant, défenseur, gardien, arbitre', 'Les valeurs : fair-play, esprit d’équipe, respect de l’adversaire'],
      canDo: ['Respecter la règle et l’espace de jeu', 'Passer, recevoir, tirer ou marquer selon le jeu', 'Accepter la décision de l’arbitre et jouer sans violence'],
      example: vary(notion, [
        'Le match de handball : chacun doit passer la balle au moins une fois avant de tirer — la classe applique la règle.',
        'Le jeu du « passe à 10 » : l’équipe marque un point quand elle réussit 10 passes sans que l’adversaire touche la balle.',
        'L’organisation du tournoi : les équipes s’inscrivent, l’arbitre compte les points, et les perdants félicitent les gagnants.',
      ]),
      success: `L’élève applique la règle, joue avec les autres sans violence, et participe à la vie de l’équipe (passe, défense, encouragement).`,
    }),
  },
];

/* ------------------------------------------------------------------ */
/* Fiches rédigées pour les notions phares (qualité maximale)          */
/* ------------------------------------------------------------------ */

const HAND_WRITTEN: Record<string, Omit<TeacherTip, 'notion' | 'discipline' | 'level'>> = {
  lesfeuxtricolores: {
    explanation: `Les feux tricolores régulent la circulation des rues : vert = je passe, orange = je m’arrête si possible, rouge = je stoppe. Ils sont installés aux carrefours, passages piétons et intersections dangereuses pour que chacun sache quand avancer et quand attendre, et pour éviter les accidents.`,
    understands: `L’élève doit comprendre que le feu tricolore n’est pas un jeu de couleurs : c’est un langage de sécurité qui s’adresse à tous (piétons, vélos, voitures) et qui protège la vie. Rouge n’est jamais une suggestion : c’est un ordre d’arrêt.`,
    retains: ['Vert : je passe en restant prudent', 'Orange : je m’arrête si je peux le faire sans danger', 'Rouge : je stoppe net et j’attends', 'Même vert, je regarde avant de traverser : les véhicules peuvent tourner'],
    canDo: ['Expliquer la signification des trois couleurs', 'Traverser au vert en regardant à gauche et à droite', 'Décrire un feu tricolore sur un dessin et le colorier correctement'],
    example: `Devant l’école de la place, un feu tricolore rythme la traversée : les élèves attendent le rouge en groupe au bord du trottoir, puis traversent au vert, main dans la main, en regardant des deux côtés.`,
    success: `L’élève répond juste aux trois questions « que fait-on au vert ? à l’orange ? au rouge ? » et applique la règle sans se précipiter lors d’une simulation de traversée.`,
  },
  lettre: {
    explanation: `La lettre est un écrit que l’on adresse à quelqu’un qui n’est pas devant nous : famille, ami, directeur, administration, ONG. Elle est organisée en parties : le lieu et la date, le destinataire, le message, la formule de politesse et la signature.`,
    understands: `L’élève doit comprendre qu’une lettre parle à un destinataire précis : on choisit ses formules selon la personne (cher ami / Monsieur le Directeur) et le ton change avec les liens qui nous unissent.`,
    retains: ['L’ordre des parties : date, destinataire, corps, formule, signature', 'Les formules de politesse courantes et leur usage', 'La destination : message clair, une idée par phrase'],
    canDo: ['Identifier chaque partie d’une lettre modèle', 'Écrire une invitation ou un remerciement complet', 'Vérifier les formules de politesse avant d’envoyer'],
    example: `La classe écrit une lettre d’invitation au directeur pour la fête de l’école : « Cotonou, le 12 juin / Monsieur le Directeur / Nous vous invitons à la fête de fin d’année… / Veuillez agréer, Monsieur, nos salutations respectueuses / Les élèves de CM1 ».`,
    success: `La lettre produite contient les 5 parties dans l’ordre ; le message est clair et la formule de politesse adaptée au destinataire.`,
  },
  dents: {
    explanation: `Les dents servent à couper et à mâcher les aliments : elles préparent la digestion et protègent le tube digestif. L’adulte a 32 dents, l’enfant 20 dents de lait qui tombent et sont remplacées. Une dent est faite d’une couronne visible et d’une racine fixée dans la gencive.`,
    understands: `L’élève doit comprendre que les dents sont des organes vivants et fragiles : les sucres et les aliments qui restent entre les dents abritent des microbes et créent des caries. Se brosser les dents, c’est les protéger, ainsi que toute la digestion.`,
    retains: ['Les types de dents et leur rôle (incisives, canines, molaires)', 'La structure : couronne, racine, émail', 'Les bons gestes : brossage matin et soir, moins de sucreries, visite du dentiste'],
    canDo: ['Montrer sur un schéma les différentes dents et les nommer', 'Expliquer le rôle de chaque type de dent', 'Décrire et réaliser un brossage complet (3 minutes, toutes les faces)'],
    example: `La classe compare ses sourires : incisives pour couper, canines pointues pour déchirer, molaires pour écraser. Après le déjeuner, chacun se brosse pendant qu’on compte le temps : une chanson de 3 minutes.`,
    success: `L’élève nomme les types de dents et leur rôle, et réalise seul un brossage complet en expliquant pourquoi il le fait.`,
  },
  sante: {
    explanation: `La santé, c’est être en bon état physique, mental et social : pouvoir jouer, apprendre, travailler et vivre avec les autres. On protège sa santé par l’hygiène, une bonne alimentation, le sommeil, le sport, les vaccins et en évitant ce qui est dangereux (tabac, alcool).`,
    understands: `L’élève doit comprendre que la santé ne se résume pas à « ne pas être malade » : elle se construit chaque jour par nos habitudes, et chaque personne a un rôle dans la santé de la communauté.`,
    retains: ['Les piliers d’une bonne santé : hygiène, alimentation, sommeil, activité physique, vaccins', 'Les dangers : tabac, alcool, drogues, insalubrité', 'Le lien entre santé, environnement et vie en société'],
    canDo: ['Citer 3 habitudes qui protègent la santé', 'Expliquer pourquoi le tabac et l’alcool sont dangereux', 'Adopter et proposer des comportements sains à l’école et à la maison'],
    example: `La classe organise « la semaine de la santé » : lavage des mains, repas équilibré, sport quotidien, visite du centre de santé et affiches contre le tabac — chaque élève note ce qu’il a changé dans ses habitudes.`,
    success: `L’élève liste les bons gestes pour sa santé et en explique au moins un avec ses propres mots lors d’un exposé ou d’un débat en classe.`,
  },
  environnementnaturel: {
    explanation: `L’environnement naturel, c’est tout ce qui existe sans être fabriqué par l’homme : l’air, l’eau, le sol, les plantes, les animaux, les paysages. Le thème « environnement naturel » invite à observer, décrire et protéger ce milieu qui nous nourrit et nous abrite.`,
    understands: `L’élève doit comprendre que les éléments de la nature sont liés entre eux (pluie → plante → animal → homme) et que protéger l’environnement naturel, c’est protéger la vie, donc sa propre santé.`,
    retains: ['Les éléments de l’environnement naturel et un exemple de chacun', 'Quelques interactions simples entre ces éléments', 'Les gestes qui protègent la nature'],
    canDo: ['Décrire un paysage ou un milieu naturel observé', 'Expliquer une conséquence de la pollution ou du déboisement', 'Écrire un court texte sur la protection de la nature'],
    example: `Après une sortie au bord du fleuve, les élèves décrivent ce qu’ils ont vu (eau, arbres, oiseaux, poissons) et rédigent « le contrat de la classe pour la nature » : ne pas jeter, économiser l’eau, planter.`,
    success: `L’élève décrit le milieu observé avec le vocabulaire juste et produit un texte simple sur la protection de la nature.`,
  },
  environnementtechnique: {
    explanation: `L’environnement technique, c’est ce que l’homme a fabriqué autour de lui : maisons, routes, ponts, puits, écoles, moulins, machines, téléphone. Le thème « environnement technique » apprend à observer les objets et les constructions, leur utilité et leur fonctionnement.`,
    understands: `L’élève doit comprendre que chaque objet technique répond à un besoin, qu’il a été conçu par quelqu’un, et qu’il faut savoir l’utiliser et l’entretenir sans danger.`,
    retains: ['Des exemples d’éléments de l’environnement technique et leur usage', 'Le lien entre besoin, objet et fonctionnement', 'Les règles de prudence avec les objets techniques (électricité, feu, outils)'],
    canDo: ['Décrire un objet technique du quartier (puits, moulin, pont…)', 'Expliquer à quel besoin il répond', 'Citer une règle de sécurité pour deux objets techniques'],
    example: `La classe visite le puits du quartier : la poulie, la corde et le seau — les élèves décrivent chaque partie, son rôle, et expliquent comment l’eau arrive dans les seaux.`,
    success: `L’élève décrit correctement un objet technique, dit à quoi il sert et donne la règle de sécurité qui s’y rapporte.`,
  },
  soustraction: {
    explanation: `La soustraction sert à calculer ce qui reste, ce qui manque ou l’écart entre deux quantités. On utilise le signe « − » : le premier nombre est le plus grand, on enlève le second, et on obtient la différence.`,
    understands: `L’élève doit comprendre que soustraire répond à trois questions de la vie : « combien reste-t-il ? combien manque-t-il ? combien y a-t-il de plus (ou de moins) ? » et que le résultat est toujours ce qui reste après l’enlèvement.`,
    retains: ['Le vocabulaire : 7 − 3 = 4 (7 est le plus grand nombre, 3 ce qu’on enlève, 4 la différence)', 'La technique de pose : unités sous unités, dizaines sous dizaines', 'La vérification : addition inverse (4 + 3 = 7)'],
    canDo: ['Choisir la soustraction quand il faut enlever ou comparer', 'Poser et calculer une soustraction sans erreur', 'Vérifier le résultat par l’addition inverse'],
    example: `Maman a 1 000 F et achète du savon à 650 F : combien lui reste-t-il ? 1 000 − 650 = 350 F. La classe vérifie par addition : 350 + 650 = 1 000.`,
    success: `L’élève reconnaît la situation de soustraction, pose le calcul correctement et vérifie son résultat par l’opération inverse.`,
  },
};

/* ------------------------------------------------------------------ */
/* Gabarits par discipline (repli si aucune famille ne matche)          */
/* ------------------------------------------------------------------ */

const DISCIPLINE_FALLBACK: Builder = (notion, _level) => ({
  explanation: `« ${notion} » est une notion du programme : elle désigne un savoir ou un savoir-faire que l’élève doit découvrir, comprendre et pratiquer. L’enseignant la présente en partant de ce que l’élève connaît déjà, avec des mots simples et des situations de la vie courante.`,
  understands: `L’élève doit comprendre la définition exacte de la notion, son utilité et le lien avec ce qu’il vit à l’école, à la maison et dans son quartier.`,
  retains: ['La définition exacte de la notion', 'Un ou deux exemples concrets', 'Les mots importants à retenir pour en parler correctement'],
  canDo: ['Expliquer la notion avec ses propres mots', 'Donner un exemple de la vie de tous les jours', 'Répondre aux questions du maître sur la notion'],
  example: `L’enseignant présente la notion avec un objet, une image ou une situation vécue de la classe ; les élèves donnent ensuite leurs propres exemples avant la rédaction de l’essentiel.`,
  success: `L’élève redéfinit la notion sans aide, cite un exemple correct et l’utilise dans une phrase ou une situation simple.`,
});

/** Construit la fiche pédagogique en 7 points d’une notion du programme. */
export function buildTeacherTip(notion: string, discipline: string, level: string): TeacherTip {
  const key = norm(notion);
  const written = HAND_WRITTEN[key];
  const specific = !!written && !!written.explanation;
  const builder = specific
    ? (() => ({
        explanation: written.explanation,
        understands: written.understands,
        retains: written.retains,
        canDo: written.canDo,
        example: written.example,
        success: written.success,
      }))
    : (FAMILIES.find(f => f.keys.some(k => key.includes(norm(k))))?.build || DISCIPLINE_FALLBACK);
  const tip = builder(notion, level);
  return { notion, discipline, level, ...tip };
}

/** Toutes les fiches d’une liste de notions (pour l’impression). */
export function buildTipsFor(entries: { notion: string; discipline: string; level: string }[]): TeacherTip[] {
  return entries.map(e => buildTeacherTip(e.notion, e.discipline, e.level));
}

/** Identifie la famille (ou « fiche » pour les cas rédigés) utilisée pour une notion — contrôle qualité. */
export function tipFamilyId(notion: string): string {
  const key = norm(notion);
  if (HAND_WRITTEN[key] && HAND_WRITTEN[key].explanation) return 'fiche';
  return FAMILIES.find(f => f.keys.some(k => key.includes(norm(k))))?.id || 'fallback';
}
