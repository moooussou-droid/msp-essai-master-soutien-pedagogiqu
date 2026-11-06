/**
 * Encyclopédie — vague 2 de contenus « façon Encarta » (5 articles × 24 thèmes).
 * Contenus originaux rédigés pour l'application (structure des domaines d'Encarta).
 */

import { EncEntry } from './encyclopediaData';

const e = (term: string, simple: string, details: string, examples: string[], keywords: string[] = []): EncEntry =>
  ({ term, simple, details, examples, keywords });

export const ENCYCLOPEDIA_EXTRA_2: Record<string, EncEntry[]> = {
  dictionnaire: [
    e('Alphabet', 'L’alphabet est la liste des lettres utilisées pour écrire.', 'L’alphabet français compte 26 lettres, classées de A à Z. Il distingue les voyelles (a, e, i, o, u) et les consonnes.', ['A, B, C… jusqu’à Z', 'l’alphabet scolaire'], ['lettres']),
    e('Voyelle', 'Une voyelle est une lettre qui se prononce seule, sans autre lettre.', 'Les voyelles sont a, e, i, o, u et parfois y. Toutes les syllabes contiennent une voyelle.', ['a, e, i, o, u', 'dans « école » : é, o, e'], ['lecture']),
    e('Consonne', 'Une consonne est une lettre qui se prononce avec une voyelle.', 'Les 20 autres lettres de l’alphabet sont des consonnes : b, c, d, f, g…', ['b + a = ba', 'dans « classe » : c, l, s'], ['lecture']),
    e('Pluriel', 'Le pluriel désigne plusieurs personnes ou plusieurs choses.', 'On ajoute souvent un « s » à la fin du nom au pluriel. Les déterminants changent aussi : un → des.', ['un livre → des livres', 'un élève → des élèves'], ['grammaire']),
    e('Pronom', 'Un pronom remplace un nom dans la phrase.', '« Il », « elle », « nous », « ils » évitent de répéter le nom. Ils indiquent la personne grammaticale.', ['Ali court. Il court vite.', 'nous, vous, ils'], ['grammaire']),
  ],
  astronomie: [
    e('Orbite', 'L’orbite est le trajet d’un astre autour d’un autre.', 'La Terre suit son orbite autour du Soleil en un an. Les satellites suivent une orbite autour de la Terre.', ['orbite de la Terre', 'orbite d’un satellite'], ['trajectoire']),
    e('Satellite', 'Un satellite est un objet qui tourne autour d’une planète.', 'La Lune est le satellite naturel de la Terre. Les satellites artificiels servent aux téléphones, à la météo et à la télévision.', ['la Lune, satellite de la Terre', 'satellite météo'], ['espace']),
    e('Météore', 'Un météore est un corps qui brûle en entrant dans l’atmosphère.', 'On l’appelle aussi « étoile filante ». S’il atteint le sol, il devient une météorite.', ['étoile filante', 'météorite'], ['ciel']),
    e('Constellation', 'Une constellation est un groupe d’étoiles qui dessine une figure.', 'Les constellations (Grande Ourse, Orion) aident à se repérer dans le ciel depuis l’Antiquité.', ['la Grande Ourse', 'la constellation d’Orion'], ['étoiles']),
    e('Aurore', 'Une aurore est une lumière colorée qui apparaît dans le ciel polaire.', 'Les aurores boréales (nord) et australes (sud) sont provoquées par le vent solaire dans l’atmosphère.', ['aurore boréale', 'lumière verte et rose'], ['ciel']),
  ],
  arts: [
    e('Calligraphie', 'La calligraphie est l’art de bien former les lettres.', 'Elle demande patience et précision. Les plus belles écritures deviennent de véritables décorations.', ['écrire joliment', 'cahier de calligraphie'], ['écriture']),
    e('Poterie', 'La poterie fabrique des objets en terre cuite.', 'On façonne la terre, puis on la cuit au feu. Au Bénin, les poteries traditionnelles servent à l’eau et à la cuisine.', ['cruche en terre', 'atelier de poterie'], ['terre']),
    e('Vannerie', 'La vannerie tisse des objets avec des fibres végétales.', 'Roseaux, paille et bambou deviennent paniers, nattes et chapeaux. Un savoir-faire transmis depuis des siècles.', ['panier tressé', 'natte en paille'], ['artisanat']),
    e('Tissage', 'Le tissage fabrique les étoffes en croisant des fils.', 'Les pagnes tissés, comme le kente, racontent des symboles et des histoires. Chaque région a ses motifs.', ['pagne tissé', 'métier à tisser'], ['tissu']),
    e('Broderie', 'La broderie décore un tissu avec du fil et une aiguille.', 'Elle orne les vêtements de fête et les tenues traditionnelles avec des motifs colorés.', ['broderie d’un boubou', 'motifs brodés'], ['couture']),
  ],
  citations: [
    e('Sentence', 'Une sentence est une parole grave qui énonce une règle.', 'Elle se transmet comme un jugement sûr, souvent sage et solennel.', ['« L’union fait la force. »'], ['sagesse']),
    e('Aphorisme', 'Un aphorisme est une pensée courte et frappante.', 'Il résume une idée profonde en une phrase, facile à retenir.', ['« Savoir, c’est pouvoir. »'], ['pensée']),
    e('Slogan', 'Un slogan est une phrase courte qui marque les esprits.', 'Les campagnes de santé ou d’éducation utilisent des slogans pour faire passer un message.', ['« L’eau propre, c’est la santé. »'], ['message']),
    e('Éloge', 'Un éloge est un discours qui fait l’éloge de quelqu’un, c’est-à-dire qu’il le loue.', 'On prononce un éloge lors d’un anniversaire, d’une remise de prix ou d’un hommage.', ['éloge d’un maître', 'discours d’honneur'], ['honneur']),
    e('Pensée', 'Une pensée est une idée exprimée en peu de mots.', 'Les cahiers de pensées rassemblent des phrases inspirantes sur la vie, le travail et l’amitié.', ['noter une pensée', 'pensée du jour'], ['idée']),
  ],
  comptabilite: [
    e('Inventaire', 'L’inventaire est la liste de tout ce que possède une école.', 'On compte les tables, livres et matériels pour connaître les besoins et éviter les pertes.', ['inventaire du matériel', 'liste des manuels'], ['liste']),
    e('Prévision', 'Une prévision est une estimation des recettes et dépenses à venir.', 'Elle aide à préparer le budget de l’année et à anticiper les besoins.', ['prévisions de l’APE', 'budget prévisionnel'], ['budget']),
    e('Cotisation', 'Une cotisation est une somme versée par chaque membre d’un groupe.', 'Les cotisations de l’APE financent des projets communs de l’école.', ['cotisation des parents', 'cotisation de la tontine'], ['participation']),
    e('Subvention', 'Une subvention est une aide financière donnée par l’État ou un partenaire.', 'Elle soutient des projets utiles : construction de salles, fournitures, cantine.', ['subvention de la commune', 'aide au développement'], ['aide']),
    e('Donation', 'Une donation est un don fait à une personne ou une organisation.', 'Les donations d’anciens élèves ou de partenaires aident l’école sans devoir être remboursées.', ['don de manuels', 'donation à la bibliothèque'], ['don']),
  ],
  cuisine: [
    e('Boisson', 'Une boisson est un liquide que l’on boit.', 'L’eau est la meilleure boisson. Jus de fruits et boissons locales (bissap, sodabi) complètent les repas.', ['boire de l’eau', 'jus de bissap'], ['eau']),
    e('Fruit', 'Un fruit est la partie sucrée de certaines plantes.', 'Mangue, orange, papaye, ananas : les fruits apportent vitamines et énergie.', ['manger une mangue', 'jus d’ananas'], ['vitamines']),
    e('Légume', 'Un légume est une plante que l’on mange, souvent cuite.', 'Tomates, oignons, feuilles d’épinard : les légumes donnent santé et goût aux sauces.', ['sauce de légumes', 'salade de crudités'], ['santé']),
    e('Dessert', 'Le dessert est le plat sucré qui termine le repas.', 'Fruits frais, bouillie sucrée ou gâteaux : le dessert récompense et fait plaisir.', ['fruit en dessert', 'beignet sucré'], ['sucre']),
    e('Petit-déjeuner', 'Le petit-déjeuner est le premier repas du matin.', 'Il donne l’énergie pour bien apprendre : bouillie, pain, fruit ou œuf sont parfaits.', ['bouillie de maïs', 'pain et fruit le matin'], ['repas']),
  ],
  droit: [
    e('Vote', 'Voter, c’est choisir un candidat ou une décision.', 'Le vote peut être à main levée ou à bulletin secret. Il est la base de la démocratie.', ['vote du conseil de classe', 'bulletin de vote'], ['élection']),
    e('Élection', 'Une élection sert à choisir des représentants.', 'Les citoyens élisent leurs dirigeants à date fixe. Les règles sont écrites dans la loi.', ['élection des délégués', 'élection présidentielle'], ['démocratie']),
    e('Amendement', 'Un amendement est une modification apportée à un texte de loi.', 'Les députés proposent des amendements pour améliorer une loi avant son adoption.', ['amendement à une loi', 'texte modifié'], ['parlement']),
    e('Réglementation', 'La réglementation est l’ensemble des règles d’un domaine.', 'Elle protège les personnes et organise les activités (école, transports, commerce).', ['règlements scolaires', 'règle de circulation'], ['règles']),
    e('Législation', 'La législation est l’ensemble des lois d’un pays.', 'Elle évolue avec la société et doit être respectée par tous.', ['code de l’éducation', 'loi sur la scolarité'], ['loi']),
  ],
  environnement: [
    e('Énergie solaire', 'L’énergie solaire vient des rayons du soleil.', 'Les panneaux solaires transforment la lumière en électricité : une énergie propre et gratuite.', ['panneau solaire à l’école', 'lampe solaire'], ['énergie']),
    e('Énergie éolienne', 'L’énergie éolienne vient du vent.', 'Les éoliennes transforment le vent en électricité, sans fumée ni déchet.', ['éolienne', 'moulin à vent'], ['énergie']),
    e('Forêt', 'Une forêt est un vaste espace couvert d’arbres.', 'Les forêts abritent des animaux, retiennent l’eau et purifient l’air.', ['forêt de Lama', 'arbre et animaux'], ['nature']),
    e('Zone humide', 'Une zone humide est une terre gorgée d’eau, comme une mare ou une lagune.', 'Elle abrite poissons, oiseaux et plantes, et protège des inondations.', ['lagune de Cotonou', 'mare aux oiseaux'], ['eau']),
    e('Pesticide', 'Un pesticide est un produit utilisé contre les insectes nuisibles.', 'Mal utilisé, il peut polluer l’eau et nuire à la santé. Il faut respecter les doses.', ['pulvérisation', 'produit pour les cultures'], ['pollution']),
  ],
  finance: [
    e('Revenu', 'Le revenu est l’argent que l’on gagne.', 'Salaire, vente au marché ou petit commerce : le revenu permet de vivre et d’épargner.', ['revenu du mois', 'revenus du commerce'], ['argent']),
    e('Dépôt', 'Un dépôt est de l’argent confié à la banque.', 'Le dépôt est sécurisé et peut rapporter des intérêts. On peut le retirer en partie à tout moment.', ['dépôt à la banque', 'compte d’épargne'], ['banque']),
    e('Transaction', 'Une transaction est une opération d’achat ou de vente.', 'Chaque transaction doit laisser une trace : reçu, ticket ou écriture dans le cahier.', ['payer au marché', 'transférez de l’argent'], ['paiement']),
    e('Portefeuille', 'Le portefeuille désigne l’ensemble des avoirs d’une personne.', 'Il peut contenir de l’argent, des comptes, des biens et des placements.', ['gérer son portefeuille', 'biens de la famille'], ['patrimoine']),
    e('Cagnotte', 'Une cagnotte est un argent mis en commun.', 'La classe ou la famille cotise pour un projet commun : sortie, fête, achat collectif.', ['cagnotte de la classe', 'cagnotte de fête'], ['épargne']),
  ],
  geographie: [
    e('Savane', 'La savane est un paysage de hautes herbes avec quelques arbres.', 'Elle couvre une grande partie de l’Afrique tropicale et abrite de nombreux animaux.', ['savane du nord Bénin', 'herbes hautes'], ['paysage']),
    e('Plage', 'Une plage est le bord de sable ou de galets entre la terre et la mer.', 'Les plages de Cotonou accueillent pêcheurs, promeneurs et activité touristique.', ['plage de Cotonou', 'plage de Grand-Popo'], ['mer']),
    e('Colline', 'Une colline est une petite élévation de terrain.', 'Les collines de l’Atacora offrent de beaux paysages au nord-ouest du Bénin.', ['collines de Boukoumbé', 'promenade en colline'], ['relief']),
    e('Plateau', 'Un plateau est une vaste étendue plate et élevée.', 'On y cultive facilement car le terrain est régulier.', ['plateau d’Allada', 'terrain plat en hauteur'], ['relief']),
    e('Lagune', 'Une lagune est une étendue d’eau salée séparée de la mer.', 'Les lagunes de la côte béninoise sont riches en poissons et en oiseaux.', ['lagune de Cotonou', 'pêche en lagune'], ['eau']),
  ],
  hightech: [
    e('Tablette', 'Une tablette est un écran tactile qui se transporte partout.', 'Elle permet de lire, regarder des vidéos et utiliser des applications pédagogiques.', ['tablette de la classe', 'jeux éducatifs'], ['appareil']),
    e('Imprimante', 'L’imprimante imprime les documents du numérique sur papier.', 'Elle permet de sortir les bulletins, fiches et affiches de l’école.', ['imprimer un bulletin', 'imprimante de l’école'], ['papier']),
    e('Bluetooth', 'Le Bluetooth relie deux appareils sans fil sur une courte distance.', 'Il transmet le son à un casque ou une photo entre deux téléphones.', ['casque Bluetooth', 'partager une photo'], ['sans fil']),
    e('Wi-Fi', 'Le Wi-Fi connecte les appareils à internet sans câble.', 'Dans une école connectée, plusieurs téléphones peuvent partager la même connexion.', ['réseau Wi-Fi de l’école', 'connexion sans fil'], ['internet']),
    e('GPS', 'Le GPS indique la position exacte sur la Terre grâce aux satellites.', 'Il aide à se repérer, à trouver une adresse et à suivre un itinéraire.', ['navigation GPS', 'trouver une école'], ['localisation']),
  ],
  histoire: [
    e('Moyen Âge', 'Le Moyen Âge est la période de l’histoire entre l’Antiquité et les Temps modernes.', 'En Europe, il s’étend environ du Ve au XVe siècle. Châteaux, chevaliers et royaumes marquent cette époque.', ['châteaux forts', 'royaumes médiévaux'], ['époque']),
    e('Renaissance', 'La Renaissance est une période de renouveau des arts et des sciences.', 'Elle débute en Italie au XVe siècle et redécouvre les textes antiques et les grandes inventions.', ['peintures de la Renaissance', 'imprimerie'], ['culture']),
    e('Première Guerre mondiale', 'La Première Guerre mondiale (1914-1918) est un conflit mondial majeur.', 'Elle opposa de nombreux pays et fit des millions de victimes. De nombreux soldats africains y participèrent.', ['1914-1918', 'soldats de l’Afrique'], ['guerre']),
    e('Seconde Guerre mondiale', 'La Seconde Guerre mondiale (1939-1945) est le plus grand conflit de l’histoire.', 'Elle impliqua le monde entier et se termina par la victoire des Alliés. L’ONU fut créée après la guerre.', ['1939-1945', 'création de l’ONU'], ['guerre']),
    e('Décolonisation', 'La décolonisation est l’accès des colonies à l’indépendance.', 'Après 1945, les peuples africains ont conquis leur liberté pays par pays. Le Bénin est indépendant depuis le 1er août 1960.', ['indépendance du Bénin', '1960, année de l’Afrique'], ['indépendance']),
  ],
  litterature: [
    e('Nouvelle', 'Une nouvelle est un récit court, souvent terminé en une lecture.', 'Elle concentre l’action et la surprise dans peu de pages.', ['nouvelle policière', 'récit court'], ['récit']),
    e('Biographie', 'Une biographie raconte la vie d’une personne.', 'Elle décrit sa naissance, son parcours et ses œuvres. On dit « ses mémoires » quand la personne raconte sa propre vie.', ['biographie d’un roi', 'vie d’un écrivain'], ['vie']),
    e('Chronique', 'Une chronique raconte des événements dans l’ordre du temps.', 'Elle peut parler de la vie quotidienne, du sport ou de l’histoire.', ['chronique du village', 'chronique sportive'], ['actualité']),
    e('Drame', 'Un drame est une pièce de théâtre sérieuse et émouvante.', 'Il mêle conflits, sentiments et questions profondes, souvent avec une fin triste.', ['drame familial', 'pièce de théâtre'], ['théâtre']),
    e('Chapitre', 'Un chapitre est une grande partie d’un livre.', 'Les chapitres sont numérotés et annoncent une nouvelle étape du récit.', ['chapitre 3 du roman', 'sommaire du livre'], ['livre']),
  ],
  loisirs: [
    e('Jardinage', 'Le jardinage consiste à cultiver plantes et légumes.', 'Il détend, fait bouger et donne de bons produits. Un jardin d’école est une belle activité.', ['jardin de l’école', 'planter des tomates'], ['nature']),
    e('Bricolage', 'Le bricolage fabrique ou répare des objets soi-même.', 'Il développe la patience et la créativité en transformant le bois, le carton ou le métal.', ['construire une étagère', 'réparer un banc'], ['création']),
    e('Pique-nique', 'Un pique-nique est un repas pris dehors, souvent en famille.', 'On l’organise sous un arbre ou au bord de l’eau, avec des plats simples à partager.', ['pique-nique de la classe', 'sortie du dimanche'], ['sortie']),
    e('Balade', 'Une balade est une promenade tranquille.', 'Elle permet de découvrir le quartier, la campagne ou la plage tout en se détendant.', ['balade au bord de la mer', 'promenade du soir'], ['promenade']),
    e('Casse-tête', 'Un casse-tête est un jeu de réflexion difficile à résoudre.', 'Puzzles, énigmes et jeux de logique font travailler le cerveau en s’amusant.', ['puzzle difficile', 'énigme à résoudre'], ['réflexion']),
  ],
  management: [
    e('Réunion', 'Une réunion rassemble des personnes pour discuter et décider.', 'Un ordre du jour clair et un compte rendu rendent les réunions efficaces.', ['réunion des enseignants', 'réunion APE'], ['échange']),
    e('Compte rendu', 'Le compte rendu résume ce qui a été dit et décidé.', 'Il permet à tous de suivre les décisions, même en cas d’absence.', ['compte rendu du conseil', 'notes de réunion'], ['trace']),
    e('Suivi', 'Le suivi consiste à vérifier régulièrement l’avancement.', 'On suit les notes, la présence et les projets pour agir à temps.', ['suivi des élèves', 'suivi du projet'], ['contrôle']),
    e('Indicateur', 'Un indicateur est une mesure qui montre l’état d’une situation.', 'La moyenne de classe, le taux de présence ou le taux de réussite sont des indicateurs.', ['indicateur de réussite', 'tableau de suivi'], ['mesure']),
    e('Rétroplanning', 'Un rétroplanning planifie à l’envers à partir de la date butoir.', 'On part de l’examen ou de la fête, puis on remonte le temps pour organiser les étapes.', ['préparer la rentrée', 'planifier l’examen'], ['planning']),
  ],
  medecine: [
    e('Médecin', 'Le médecin examine les malades et prescrit les soins.', 'Il pose un diagnostic après examen et conseille les bons médicaments.', ['médecin de famille', 'visite médicale'], ['soin']),
    e('Infirmier', 'L’infirmier ou l’infirmière donne les soins et surveille les malades.', 'Il fait les pansements, les injections et veille au bien-être des patients.', ['infirmerie de l’école', 'soins au centre de santé'], ['soin']),
    e('Consultation', 'Une consultation est un examen fait par un soignant.', 'On y explique ses symptômes et on reçoit un conseil ou une ordonnance.', ['consultation au dispensaire', 'rendez-vous médical'], ['examen']),
    e('Test de dépistage', 'Un test de dépistage cherche une maladie même sans symptômes.', 'Il permet de soigner tôt. Pour le paludisme, un test rapide donne le résultat en quelques minutes.', ['test rapide du paludisme', 'dépistage précoce'], ['test']),
    e('Moustiquaire', 'La moustiquaire est un filet qui protège des moustiques.', 'Imprégnée d’insecticide, elle protège la nuit contre le paludisme.', ['moustiquaire imprégnée', 'dormir sous la moustiquaire'], ['protection']),
  ],
  psychologie: [
    e('Gestion du stress', 'La gestion du stress aide à rester calme face aux difficultés.', 'Respirer lentement, bien se préparer et dormir suffisamment réduisent le stress des examens.', ['avant un contrôle', 'techniques de respiration'], ['calme']),
    e('Coopération', 'La coopération est le fait de travailler ensemble.', 'Partager les tâches, s’entraider et s’écouter rend le groupe plus fort.', ['travail de groupe', 'entraide en classe'], ['équipe']),
    e('Autonomie', 'L’autonomie est la capacité à agir par soi-même.', 'Un élève autonome organise son travail et vérifie ses révisions sans être poussé.', ['faire ses devoirs seul', 'se débrouiller tout seul'], ['indépendance']),
    e('Persévérance', 'La persévérance est la volonté de continuer malgré les difficultés.', 'C’est en essayant encore et encore qu’on progresse et qu’on réussit.', ['recommencer un exercice', 'ne pas abandonner'], ['effort']),
    e('Curiosité', 'La curiosité est l’envie de découvrir et de comprendre.', 'Poser des questions et chercher des réponses est le début du savoir.', ['demander pourquoi', 'explorer un sujet'], ['découverte']),
  ],
  religions: [
    e('Vodun', 'Le vodun est une religion et un patrimoine culturel majeur du Bénin.', 'Il mêle croyances, rites, fêtes et valeurs transmises par les communautés. Le 10 janvier est la fête nationale du vodun.', ['fête du Vodun', 'héritage de Ouidah'], ['tradition']),
    e('Déité', 'Une déité est un être divin ou sacré dans une religion.', 'Chaque tradition a ses déités, associées à la nature, à la famille ou à la destinée.', ['déité de l’eau', 'esprits protecteurs'], ['divinité']),
    e('Lieu sacré', 'Un lieu sacré est un espace réservé aux pratiques religieuses.', 'Temples, églises, mosquées, forêts sacrées : ces lieux se respectent.', ['forêt sacrée', 'temple traditionnel'], ['culte']),
    e('Procession', 'Une procession est une marche religieuse dans la rue.', 'Elle rassemble fidèles, chants et prières lors des grandes fêtes.', ['procession de fête', 'marche avec les fidèles'], ['fête']),
    e('Méditation', 'La méditation est un moment de calme et de réflexion.', 'Elle aide à se concentrer et à rester paisible, dans plusieurs religions.', ['méditer le matin', 'temps de calme'], ['paix']),
  ],
  sciences: [
    e('Chaleur', 'La chaleur est une énergie qui rend les objets chauds.', 'Le feu, le soleil et l’électricité produisent de la chaleur. Elle fait fondre, cuire et évaporer.', ['chaleur du soleil', 'faire bouillir l’eau'], ['énergie']),
    e('Vitesse', 'La vitesse mesure la distance parcourue en un temps donné.', 'Un véhicule rapide parcourt plus de kilomètres par heure. On la calcule en km/h ou m/s.', ['60 km/h', 'course de vitesse'], ['mouvement']),
    e('Volume', 'Le volume est la place occupée par un objet.', 'Il se mesure en litres ou en mètres cubes. Un grand seau a un plus grand volume qu’une tasse.', ['un litre d’eau', 'volume d’un cartable'], ['mesure']),
    e('Densité', 'La densité compare la « lourdeur » d’un matériau.', 'Un objet dense coule (fer), un objet léger flotte (bois). La densité de l’eau sert de référence.', ['le fer coule, le bois flotte', 'densité de l’eau'], ['matière']),
    e('États de la matière', 'La matière existe sous trois états : solide, liquide et gazeux.', 'L’eau peut être glace, eau liquide ou vapeur. La température fait changer d’état.', ['glace, eau, vapeur', 'chauffer l’eau'], ['matière']),
  ],
  education: [
    e('Rentrée scolaire', 'La rentrée scolaire est le début de l’année de classe.', 'On y retrouve les camarades, les maîtres et les nouveaux manuels. C’est un nouveau départ.', ['rentrée de septembre', 'préparer la rentrée'], ['école']),
    e('Emploi du temps', 'L’emploi du temps organise les activités de la semaine.', 'Il indique les matières, les heures et les récréations. Il aide à s’organiser.', ['emploi du temps de la classe', 'heures de cours'], ['planning']),
    e('Devoir', 'Un devoir est un travail donné à faire à la maison.', 'Il permet de réviser la leçon et de s’entraîner. Un bon rythme de devoirs aide à réussir.', ['devoir de calcul', 'faire ses devoirs le soir'], ['travail']),
    e('Interrogation', 'Une interrogation est un petit contrôle surprise ou annoncé.', 'Elle vérifie rapidement les connaissances de la leçon.', ['interrogation de dictée', 'question de cours'], ['contrôle']),
    e('Délégué de classe', 'Le délégué de classe représente les élèves.', 'Il porte leurs questions et idées auprès du maître et du conseil de classe.', ['élire les délégués', 'représenter la classe'], ['élève']),
  ],
  agriculture: [
    e('Labour', 'Le labour retourne la terre avant de semer.', 'Il aère le sol et enlève les mauvaises herbes pour préparer la plantation.', ['labour au champ', 'préparer la terre'], ['travail']),
    e('Sarclage', 'Le sarclage enlève les mauvaises herbes autour des cultures.', 'Il protège les plantes qui ont besoin de place, d’eau et de nourriture.', ['sarcler le champ de maïs', 'désherbage manuel'], ['entretien']),
    e('Semis', 'Le semis est l’action de mettre les graines en terre.', 'Il faut semer à la bonne saison et à la bonne profondeur pour une belle récolte.', ['semer les haricots', 'semis de maïs'], ['graine']),
    e('Grenier', 'Un grenier est un local où l’on conserve les récoltes.', 'Il garde le maïs, le mil ou le riz à l’abri des insectes et de l’humidité.', ['grenier à maïs', 'conserver la récolte'], ['stockage']),
    e('Pépinière', 'Une pépinière fait pousser les jeunes plants.', 'On y prépare arbres et légumes avant de les repiquer dans les champs.', ['pépinière de palmiers', 'jeunes plants'], ['plante']),
  ],
  benin: [
    e('Fleuve Ouémé', 'L’Ouémé est le plus long fleuve du Bénin.', 'Il traverse le pays du nord au sud et se jette dans le lac Nokoué. Ses crues rythment la vie des populations.', ['crues de l’Ouémé', 'pêche sur l’Ouémé'], ['fleuve']),
    e('Parakou', 'Parakou est la grande ville du centre-nord du Bénin.', 'Carrefour du commerce et du coton, elle est reliée à Cotonou par le chemin de fer.', ['gare de Parakou', 'ville du coton'], ['ville']),
    e('Natitingou', 'Natitingou est la ville principale des montagnes de l’Atacora.', 'Proche de la Pendjari et des villages tammari, elle est le point de départ des safaris.', ['routes de la Pendjari', 'portes du nord'], ['ville']),
    e('Lac Nokoué', 'Le lac Nokoué est le grand lac du sud du Bénin.', 'Il accueille les pêcheurs et les villages lacustres comme Ganvié. Ses poissons nourrissent Cotonou.', ['pêche au lac Nokoué', 'village de Ganvié'], ['lac']),
    e('Atacora', 'L’Atacora est la chaîne de montagnes du nord-ouest du Bénin.', 'Ses collines abritent les sommets du pays et des populations aux traditions anciennes.', ['mont Sokbaro', 'collines tammari'], ['relief']),
  ],
  afrique: [
    e('Afrique de l’Ouest', 'L’Afrique de l’Ouest est la région de l’Afrique où se trouve le Bénin.', 'Elle compte 16 pays très liés par l’histoire, les langues et le commerce.', ['Bénin, Togo, Ghana', 'région ouest-africaine'], ['région']),
    e('Sahel', 'Le Sahel est la bande semi-désertique au sud du Sahara.', 'Il est sec une partie de l’année et marque la transition entre désert et savane.', ['saison sèche au Sahel', 'pays du Sahel'], ['climat']),
    e('Le Caire', 'Le Caire est la capitale de l’Égypte et la plus grande ville d’Afrique.', 'Sa vieille ville abrite des monuments millénaires et un célèbre musée.', ['musée du Caire', 'ville sur le Nil'], ['ville']),
    e('Lagos', 'Lagos est la grande ville économique du Nigeria, voisin du Bénin.', 'Métropole du commerce et du cinéma africain, elle est un pôle d’échanges régional.', ['marché de Lagos', 'Nollywood'], ['ville']),
    e('Urbanisation', 'L’urbanisation est la croissance des villes.', 'De plus en plus d’Africains vivent en ville : il faut planifier écoles, eau et transports.', ['villes qui grandissent', 'quartiers nouveaux'], ['ville']),
  ],
  sport: [
    e('Handball', 'Le handball est un sport collectif joué avec les mains.', 'On marque en lançant le ballon dans le but adverse. Il développe agilité et esprit d’équipe.', ['match de handball', 'porter le ballon'], ['sport']),
    e('Tennis', 'Le tennis oppose deux joueurs autour d’un filet.', 'On renvoie la balle avec une raquette. Le service commence chaque point.', ['échanger des balles', 'tournoi de tennis'], ['sport']),
    e('Relais', 'Le relais est une course par équipes.', 'Chaque coureur passe le témoin au suivant. La coordination fait la victoire.', ['relais 4 × 100 m', 'passage du témoin'], ['course']),
    e('Saut en hauteur', 'Le saut en hauteur consiste à franchir une barre le plus haut possible.', 'Il demande élan, détente et technique.', ['franchir la barre', 'concours de saut'], ['saut']),
    e('Gymnastique', 'La gymnastique enchaîne des exercices de souplesse et de force.', 'Sol, barres, poutre ou agrès : elle développe équilibre et précision.', ['roulade avant', 'exercices au sol'], ['sport']),
  ],
};
