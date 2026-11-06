/**
 * Encyclopédie — contenu étendu « façon Encarta ».
 *
 * L'encyclopédie couvre les 9 domaines d'Encarta (encyclopédie de référence
 * publiée par Microsoft) : Géographie, Histoire, Sciences & Mathématiques,
 * Technologie, Sciences sociales, Droit, Arts & Littérature,
 * Philosophie & Religion, Sport & Loisirs.
 *
 * Les articles ci-dessous sont des contenus ORIGINAUX rédigés pour cette
 * application (structurés sur ces mêmes domaines) : ils ne reproduisent pas
 * les textes d'Encarta, protégés par le droit d'auteur.
 */

export interface EncEntry {
  term: string;
  simple: string;
  details: string;
  examples: string[];
  keywords: string[];
}

/** Correspondance thématique ⇄ domaine Encarta. */
export const ENCARTA_DOMAINS: Record<string, string> = {
  geographie: 'Géographie',
  histoire: 'Histoire',
  sciences: 'Sciences & Mathématiques',
  hightech: 'Technologie',
  psychologie: 'Sciences sociales',
  droit: 'Droit',
  litterature: 'Arts & Littérature',
  arts: 'Arts & Littérature',
  religions: 'Philosophie & Religion',
  sport: 'Sport & Loisirs',
  loisirs: 'Sport & Loisirs',
};

const e = (term: string, simple: string, details: string, examples: string[], keywords: string[] = []): EncEntry =>
  ({ term, simple, details, examples, keywords });

export const ENCYCLOPEDIA_EXTRA: Record<string, EncEntry[]> = {
  dictionnaire: [
    e('Lettre', 'Une lettre est un signe de l’alphabet.', 'L’alphabet français compte 26 lettres, avec des voyelles (a, e, i, o, u) et des consonnes. Les lettres forment les syllabes, puis les mots.', ['a », « b », « z »', 'écrire son prénom'], ['alphabet']),
    e('Syllabe', 'Une syllabe est un groupe de sons prononcé en une seule fois.', 'Découper un mot en syllabes aide à bien lire et à bien écrire. « ca-hier » a deux syllabes.', ['é- co- le (3 syllabes)', 'ma- is'], ['lecture']),
    e('Majuscule', 'Une majuscule est une lettre plus grande en début de phrase.', 'On commence les phrases et les noms propres (noms de personnes, de villes, de pays) par une majuscule.', ['Cotonou commence par un C majuscule.', 'Le Bénin est un pays.'], ['grammaire']),
    e('Ponctuation', 'La ponctuation rythme les phrases avec des signes.', 'Le point termine la phrase, la virgule marque une pause, le point d’interrogation pose une question et le point d’exclamation exprime une émotion.', ['Où vas-tu ?', 'Quel beau dessin !'], ['écriture']),
    e('Conjugaison', 'La conjugaison adapte le verbe à la personne et au temps.', 'Le verbe change selon qui agit (je, tu, il…) et le moment (hier, aujourd’hui, demain).', ['je mange, tu manges, il mange', 'hier, j’ai joué'], ['verbe']),
    e('Orthographe', 'L’orthographe est la manière correcte d’écrire les mots.', 'Bien écrire aide à être compris. La lecture régulière améliore beaucoup l’orthographe.', ['écrire « école » et non « écol »', 'relire ses textes'], ['écriture']),
  ],
  astronomie: [
    e('Galaxie', 'Une galaxie est un grand ensemble d’étoiles.', 'Notre galaxie s’appelle la Voie lactée : elle contient des milliards d’étoiles, dont le Soleil.', ['la Voie lactée', 'des milliards d’étoiles'], ['espace']),
    e('Comète', 'Une comète est un astre de glace et de poussière qui laisse une traînée lumineuse.', 'Quand elle s’approche du Soleil, sa queue de gaz brille dans le ciel. Certaines comètes reviennent régulièrement.', ['la comète de Halley', 'queue lumineuse'], ['espace']),
    e('Astéroïde', 'Un astéroïde est un gros caillou qui tourne autour du Soleil.', 'La plupart des astéroïdes se trouvent entre Mars et Jupiter. Ils sont plus petits qu’une planète.', ['la ceinture d’astéroïdes', 'petite planète rocheuse'], ['espace']),
    e('Gravité', 'La gravité est la force qui attire les objets vers la Terre.', 'C’est elle qui fait tomber une pomme et qui garde la Lune autour de la Terre. Sans gravité, tout flotterait.', ['une pomme qui tombe', 'la Lune autour de la Terre'], ['physique']),
    e('Éclipse', 'Une éclipse cache momentanément le Soleil ou la Lune.', 'À la Lune passe devant le Soleil, on observe une éclipse de Soleil ; quand la Terre passe entre les deux, c’est une éclipse de Lune. Ne jamais regarder le Soleil directement !', ['éclipse de Lune', 'éclipse de Soleil'], ['ciel']),
    e('Télescope', 'Un télescope permet d’observer les astres de loin.', 'Il grossit l’image des planètes, des étoiles et des galaxies. Les grands télescopes sont placés en montagne ou dans l’espace.', ['télescope spatial Hubble', 'observer les planètes'], ['astronomie']),
  ],
  arts: [
    e('Peinture', 'La peinture est l’art de représenter avec des couleurs.', 'On peint sur du papier, de la toile ou des murs avec de la peinture. Au Bénin, les fresques et décorations murales sont très riches.', ['peindre un paysage', 'fresques murales'], ['couleurs']),
    e('Sculpture', 'La sculpture crée des formes en volume.', 'Le sculpteur taille le bois, la pierre ou l’argile. Les statues et masques traditionnels béninois sont célèbres dans le monde.', ['statue en bois', 'masque traditionnel'], ['volume']),
    e('Architecture', 'L’architecture est l’art de construire les bâtiments.', 'L’architecte dessine des maisons, des écoles, des églises et des palais qui soient beaux, solides et utiles.', ['plan d’une école', 'palais royaux d’Abomey'], ['construction']),
    e('Photographie', 'La photographie capture des images avec un appareil.', 'Une photo garde un souvenir d’un moment, d’une personne ou d’un lieu. Un téléphone moderne permet d’en prendre partout.', ['photo de classe', 'photo de famille'], ['image']),
    e('Cinéma', 'Le cinéma raconte des histoires avec des images animées.', 'Un film combine jeu d’acteurs, son et images. Le cinéma africain, dont le cinéma béninois, raconte la vie et l’histoire du continent.', ['film documentaire', 'cinéma africain'], ['film']),
    e('Artisanat', 'L’artisanat fabrique des objets à la main.', 'Vannerie, poterie, tissage, forge : les artisans transforment des matières naturelles en objets utiles ou décoratifs.', ['paniers tressés', 'poteries en terre cuite'], ['métier']),
  ],
  citations: [
    e('Adage', 'Un adage est une formule ancienne qui exprime une vérité.', 'Il se transmet de génération en génération et sert de conseil de vie.', ['« Il n’y a pas de raccourci sans risque. »'], ['proverbe']),
    e('Maxime', 'Une maxime est une pensée courte qui donne une règle de conduite.', 'Elle est souvent écrite par un auteur et cherche à instruire.', ['« La patience est la clé du succès. »'], ['pensée']),
    e('Devise', 'Une devise est une courte phrase qui exprime une valeur.', 'Les pays, les écoles et les familles peuvent avoir une devise. « Fraternité, Justice, Travail » est celle du Bénin.', ['devise du Bénin', 'devise d’une école'], ['valeur']),
    e('Dicton', 'Un dicton est une phrase populaire liée à la vie quotidienne.', 'Il concerne souvent le temps, les cultures ou les saisons.', ['« Après la pluie, le beau temps. »'], ['sagesse']),
    e('Allégorie', 'Une allégorie illustre une idée abstraite par une image.', 'Un personnage ou une scène représente une idée comme la justice, la paix ou la liberté.', ['la justice représentée par une balance'], ['figure']),
    e('Fable', 'Une fable est une courte histoire qui donne une leçon.', 'Ses personnages sont souvent des animaux qui parlent. Les fables aident à comprendre la morale.', ['fables de La Fontaine', 'le lièvre et la tortue'], ['morale']),
  ],
  comptabilite: [
    e('Solde', 'Le solde est la différence entre les recettes et les dépenses.', 'Un solde positif signifie de l’argent restant ; un solde négatif montre un déficit.', ['solde de la caisse de l’APE', 'solde du mois'], ['calcul']),
    e('Trésorerie', 'La trésorerie est l’argent disponible tout de suite.', 'Une bonne trésorerie permet de payer les dépenses sans attendre. L’école doit toujours suivre sa trésorerie.', ['payer les fournitures', 'argent en caisse'], ['argent']),
    e('Bénéfice', 'Le bénéfice est ce qui reste après avoir payé les dépenses.', 'Il apparaît quand les recettes sont plus grandes que les dépenses.', ['bénéfice d’une kermesse', 'recettes - dépenses'], ['gains']),
    e('Perte', 'Une perte apparaît quand les dépenses dépassent les recettes.', 'Il faut alors réduire les dépenses ou augmenter les recettes.', ['perte sur une activité'], ['déficit']),
    e('Journal de caisse', 'Le journal de caisse note toutes les entrées et sorties d’argent.', 'Chaque opération est datée et détaillée. Il permet de vérifier l’argent à tout moment.', ['noter la vente de cahiers', 'noter l’achat de craies'], ['registre']),
    e('Amortissement', 'L’amortissement étale le coût d’un objet sur plusieurs années.', 'Un tableau ou un ordinateur s’use : son coût est compté petit à petit, année après année.', ['amortir un ordinateur', 'usure du matériel'], ['comptes']),
  ],
  cuisine: [
    e('Céréales', 'Les céréales sont des plantes cultivées pour leurs grains.', 'Maïs, riz, mil, sorgho et blé donnent l’énergie nécessaire au corps. Elles sont la base des repas.', ['maïs, riz, mil', 'bouillie de mil'], ['énergie']),
    e('Protéines', 'Les protéines construisent et réparent le corps.', 'On les trouve dans le poisson, la viande, les œufs, le lait, les haricots et le soja.', ['sauce de poisson', 'haricots et œufs'], ['nutrition']),
    e('Vitamines', 'Les vitamines protègent la santé.', 'Les fruits et légumes frais (mangue, orange, tomate, feuilles vertes) en sont riches.', ['manger de la mangue', 'légumes verts'], ['santé']),
    e('Épices', 'Les épices donnent du goût aux plats.', 'Piment, gingembre, ail, poivre, clous de girofle : chaque région a ses épices préférées.', ['piment dans la sauce', 'gingembre, ail'], ['goût']),
    e('Conservation des aliments', 'La conservation garde les aliments bons plus longtemps.', 'Sécher, saler, fumer ou garder au frais évite que les aliments se gâtent. Le poisson séché est un exemple.', ['poisson fumé', 'sécher le maïs'], ['hygiène']),
    e('Repas équilibré', 'Un repas équilibré associe différents aliments.', 'Il contient un aliment d’énergie (céréale), un aliment bâtisseur (protéine) et des légumes ou fruits.', ['riz + poisson + feuilles', 'pâte + sauce + salade'], ['nutrition']),
  ],
  droit: [
    e('Constitution', 'La constitution est la loi fondamentale d’un pays.', 'Elle définit le fonctionnement de l’État et les droits des citoyens. Aucune loi ne peut la contredire.', ['constitution du Bénin', 'loi fondamentale'], ['État']),
    e('Décret', 'Un décret est une décision écrite du gouvernement.', 'Il précise l’application des lois, par exemple pour l’organisation d’une rentrée scolaire.', ['décret sur les examens'], ['gouvernement']),
    e('Tribunal', 'Le tribunal est le lieu où la justice est rendue.', 'Un juge y examine les conflits et les infractions, puis prend une décision appelée jugement.', ['tribunal de Cotonou', 'décision de justice'], ['justice']),
    e('Juge', 'Le juge est la personne qui rend la justice.', 'Il écoute les parties, examine les preuves et applique la loi de façon indépendante.', ['juge de paix', 'audience au tribunal'], ['justice']),
    e('Avocat', 'Un avocat défend une personne devant la justice.', 'Il connaît les lois et explique les droits de son client.', ['avocat de la défense', 'conseil juridique'], ['défense']),
    e('Plainte', 'Une plainte signale une infraction à la justice.', 'La victime ou un témoin dépose une plainte pour faire ouvrir une enquête.', ['porter plainte', 'dépôt de plainte'], ['justice']),
  ],
  environnement: [
    e('Déchets', 'Les déchets sont les objets dont on se débarrasse.', 'Trier, réutiliser et composter réduit la saleté et protège la santé. Les sachets plastiques sont très polluants.', ['trier le plastique', 'compost de feuilles'], ['propreté']),
    e('Eau potable', 'L’eau potable est une eau propre et sûre à boire.', 'Elle peut être bouillie, filtrée ou traitée. Boire de l’eau propre évite de nombreuses maladies.', ['eau bouillie', 'forage protégé'], ['santé']),
    e('Sécheresse', 'La sécheresse est une longue période sans pluie.', 'Les cultures et les animaux souffrent, et l’eau vient à manquer. Les puits et citernes aident à stocker l’eau.', ['saison sèche prolongée', 'stocker l’eau de pluie'], ['climat']),
    e('Inondation', 'Une inondation recouvre les terres avec de l’eau.', 'Les fortes pluies ou les fleuves en crue peuvent inonder les villes. Ne pas jeter de déchets dans les caniveaux aide à les éviter.', ['crues du fleuve Ouémé', 'caniveaux bouchés'], ['eau']),
    e('Reboisement', 'Le reboisement consiste à planter des arbres.', 'Les arbres retiennent le sol, donnent de l’ombre et de l’air pur. Planter un arbre est un geste pour l’avenir.', ['planter des arbres à l’école', 'journée de reboisement'], ['forêt']),
    e('Développement durable', 'Le développement durable répond aux besoins d’aujourd’hui sans abuser de demain.', 'Il associe économie, société et environnement : consommer moins, partager mieux, préserver la nature.', ['énergie solaire', 'réduire le plastique'], ['avenir']),
  ],
  finance: [
    e('Tontine', 'La tontine est une épargne collective entre voisins.', 'Chaque membre verse une somme à tour de rôle et reçoit un jour tout le fonds. Elle finance de petits projets sans banque.', ['tontine de quartier', 'fonds collecté'], ['épargne']),
    e('Microfinance', 'La microfinance prête de petites sommes à ceux qui n’ont pas de banque.', 'Ces crédits aident les petits commerçants et producteurs à développer leur activité.', ['crédit d’une commerçante', 'institution de microfinance'], ['crédit']),
    e('Inflation', 'L’inflation est la hausse générale des prix.', 'Quand l’inflation monte, le même argent achète moins de choses. Il faut en tenir compte dans les budgets.', ['prix qui augmentent'], ['prix']),
    e("Taux d'intérêt", "Le taux d'intérêt est le prix de l'argent emprunté.", 'Un taux élevé fait rembourser davantage. Avant d’emprunter, il faut comparer les taux.', ["intérêt d'un prêt", 'comparer les offres'], ['crédit']),
    e('Assurance', 'L’assurance protège contre un risque financier.', 'En échange d’une cotisation, elle indemnise en cas d’accident, de maladie ou de perte.', ['assurance maladie', 'assurance d’un véhicule'], ['protection']),
    e('Devise', 'Une devise est la monnaie d’un pays ou d’une région.', 'Le franc CFA (XOF) est la monnaie de plusieurs pays d’Afrique de l’Ouest, dont le Bénin.', ['franc CFA', 'euro, dollar'], ['monnaie']),
  ],
  geographie: [
    e('Océan', 'Un océan est une immense étendue d’eau salée.', 'Les océans couvrent environ 70 % de la Terre. Le Bénin est bordé par l’océan Atlantique.', ['océan Atlantique', 'plages de Cotonou'], ['eau']),
    e('Montagne', 'Une montagne est un relief élevé.', 'Les montagnes dépassent plusieurs centaines de mètres. Au Bénin, la chaîne de l’Atacora se trouve au nord-ouest.', ['monts Atacora', 'escalade'], ['relief']),
    e('Désert', 'Un désert est une région très sèche avec peu de pluie.', 'Le Sahara, au nord de l’Afrique, est le plus grand désert chaud du monde.', ['le Sahara', 'désert de dunes'], ['aridité']),
    e('Île', 'Une île est une terre entourée d’eau.', 'Elle peut se trouver en mer, dans un fleuve ou un lac.', ['île lacustre', 'île de la côte'], ['terre']),
    e('Delta', 'Un delta est l’embouchure où un fleuve se divise avant la mer.', 'Les deltas sont riches en eau, en poissons et en terres fertiles.', ['delta du Niger', 'embouchure d’un fleuve'], ['fleuve']),
    e('Latitude', 'La latitude indique la position nord-sud sur la Terre.', 'Elle se mesure en degrés depuis l’équateur (0°). Les rayons du soleil varient selon la latitude.', ['l’équateur à 0°', 'position d’une ville'], ['carte']),
  ],
  hightech: [
    e('Smartphone', 'Le smartphone est un téléphone intelligent.', 'Il permet d’appeler, d’écrire, de photographier, d’apprendre et d’accéder à internet. Il remplace de nombreux appareils.', ['apprendre avec un téléphone', 'photo et messages'], ['téléphone']),
    e('Réseau social', 'Un réseau social permet de partager des messages et images.', 'Il relie les personnes dans le monde entier, mais il faut l’utiliser avec prudence et respect.', ['partager une photo', 'groupe de classe'], ['internet']),
    e('Mot de passe', 'Le mot de passe protège un compte ou un appareil.', 'Un bon mot de passe est long, personnel et jamais partagé. Il empêche les autres d’utiliser vos comptes.', ['mot de passe fort', 'ne jamais le dire'], ['sécurité']),
    e('Virus informatique', 'Un virus informatique est un programme nuisible.', 'Il peut ralentir ou casser un appareil et voler des informations. Mettre à jour ses logiciels et éviter les liens douteux protège.', ['antivirus', 'lien suspect'], ['sécurité']),
    e('Robotique', 'La robotique conçoit des machines automatiques.', 'Les robots aident à fabriquer, à explorer ou à apprendre. La robotique éducative est enseignée dans de nombreuses écoles.', ['robot aspirateur', 'club de robotique'], ['robot']),
    e('Cloud informatique', 'Le cloud stocke les données sur des serveurs distants.', 'Les fichiers sont accessibles depuis plusieurs appareils et restent sauvegardés même si l’appareil tombe en panne.', ['sauvegarde cloud', 'documents en ligne'], ['stockage']),
  ],
  histoire: [
    e('Préhistoire', 'La préhistoire est la période avant l’écriture.', 'Les humains vivaient de la chasse, de la pêche et de la cueillette. Les outils en pierre et les peintures rupestres datent de cette époque.', ['outils en pierre', 'peintures rupestres'], ['temps']),
    e('Colonisation', 'La colonisation est la domination d’un peuple par un autre pays.', 'À la fin du XIXᵉ siècle, les puissances européennes se sont partagé l’Afrique. Les pays africains ont retrouvé leur indépendance au XXᵉ siècle.', ['conférence de Berlin (1884-1885)', 'indépendances africaines'], ['histoire']),
    e('Traite négrière', 'La traite négrière est le commerce forcé des personnes africaines.', 'Elle a déporté des millions d’Africains vers les Amériques entre le XVᵉ et le XIXᵉ siècle. Ouidah, au Bénin, fut un port de la « côte des Esclaves ».', ['porte du Non-Retour à Ouidah', 'commerce triangulaire'], ['mémoire']),
    e('Royaume du Danxomè', 'Le royaume du Danxomè était un puissant royaume du sud du Bénin.', 'Sa capitale était Abomey. Il connut un rayonnement politique, militaire et culturel du XVIIᵉ au XIXᵉ siècle.', ['palais royaux d’Abomey', 'armée du Danxomè'], ['royaume']),
    e('Abomey', 'Abomey est l’ancienne capitale du royaume du Danxomè.', 'Ses palais royaux, classés au patrimoine mondial de l’UNESCO, gardent la mémoire des rois Guézo, Glélé et Béhanzin.', ['palais d’Abomey', 'musée historique d’Abomey'], ['patrimoine']),
    e('République', 'Une république est un État où le peuple choisit ses dirigeants.', 'Les dirigeants sont élus pour un mandat ; la république s’oppose à la monarchie absolue. Le Bénin est une république depuis 1960.', ['république du Bénin', 'élections'], ['État']),
  ],
  litterature: [
    e('Épopée', 'Une épopée raconte les exploits d’un héros.', 'Elle mêle histoire et merveilleux. Les épopées africaines célèbrent de grands rois et de grands combats.', ['épopée de Soundiata', 'exploits héroïques'], ['récit']),
    e('Strophe', 'Une strophe est un groupe de vers dans un poème.', 'Les strophes sont séparées par un blanc et souvent rythmées par des rimes.', ['strophe de quatre vers', 'calligramme'], ['poésie']),
    e('Narrateur', 'Le narrateur est celui qui raconte l’histoire.', 'Il peut être un personnage de l’histoire ou un témoin extérieur. Il ne faut pas le confondre avec l’auteur.', ['« je » dans un récit', 'voix du conteur'], ['récit']),
    e('Dialogue', 'Le dialogue est une conversation entre personnages.', 'Il fait avancer l’histoire et révèle le caractère des personnages. On le repère aux tirets ou aux guillemets.', ['« Bonjour ! dit Ali. »', 'scène de théâtre'], ['théâtre']),
    e('Métaphore', 'Une métaphore compare sans utiliser « comme ».', 'Elle fait image et enrichit le texte : « la mer est un miroir » est une métaphore.', ['« la mer est un miroir »', '« cet enfant est un lion »'], ['image']),
    e('Fabliau', 'Un fabliau est un petit récit comique du Moyen Âge.', 'Il raconte des situations drôles de la vie quotidienne et se termine souvent par une ruse ou une leçon.', ['récit drôle', 'conte du Moyen Âge'], ['récit']),
  ],
  loisirs: [
    e('Randonnée', 'La randonnée est une marche en pleine nature.', 'Elle permet de découvrir la colline, la forêt ou la savane tout en faisant du sport.', ['marcher au village', 'excursion en forêt'], ['nature']),
    e('Pêche', 'La pêche est la capture de poissons.', 'Elle se pratique en mer, en rivière ou en lac et nourrit de nombreuses familles.', ['pêche au lac Nokoué', 'pêche artisanale'], ['eau']),
    e('Danse', 'La danse exprime des émotions par le mouvement.', 'Chaque région possède ses danses et ses rythmes ; danser avec les amis est un moment de joie.', ['danse traditionnelle', 'danse de fête'], ['culture']),
    e('Chant', 'Le chant est la musique de la voix.', 'Chanter ensemble apprend l’écoute et le partage. Une chorale réunit plusieurs voix.', ['chorale de l’école', 'chants de fête'], ['musique']),
    e('Voyage', 'Voyager, c’est découvrir d’autres lieux et d’autres cultures.', 'Un voyage permet d’apprendre, de s’émerveiller et de rencontrer de nouvelles personnes.', ['voyage scolaire', 'découvrir une autre région'], ['découverte']),
    e('Coloriage', 'Le coloriage consiste à mettre des couleurs dans un dessin.', 'Il développe la précision, la créativité et le calme. Tout le monde peut colorier !', ['colorier un drapeau', 'dessin à colorier'], ['créativité']),
  ],
  management: [
    e('Objectif', 'Un objectif est un but précis à atteindre.', 'Un bon objectif est clair, réaliste et daté. Les objectifs de la classe sont affichés et suivis.', ['objectif de lecture', 'objectif de réussite'], ['but']),
    e('Priorité', 'La priorité est ce qui doit être fait en premier.', 'Classer les tâches par priorité évite le stress et fait gagner du temps.', ['priorité aux examens', 'liste de priorités'], ['organisation']),
    e('Délégation', 'Déléguer, c’est confier une tâche à quelqu’un.', 'Un bon responsable ne fait pas tout seul : il répartit les tâches selon les forces de chacun.', ['déléguer un rôle au conseil de classe', 'équipe de nettoyage'], ['équipe']),
    e('Communication', 'La communication transmet des informations.', 'Une bonne communication passe par des consignes claires et une écoute attentive. Mal communiquer crée des malentendus.', ['communiquer avec les parents', 'affichage des consignes'], ['échange']),
    e('Stratégie', 'Une stratégie est un plan pour atteindre un but.', 'Elle prévoit les étapes, les moyens et les solutions de secours. Chaque année scolaire peut suivre une stratégie.', ['stratégie de réussite', 'plan d’action'], ['plan']),
    e('Amélioration continue', 'L’amélioration continue cherche à faire mieux sans cesse.', 'On évalue les résultats, on corrige ce qui ne va pas et on renouvelle les bonnes pratiques.', ['bilan du trimestre', 'ajuster les méthodes'], ['progrès']),
  ],
  medecine: [
    e('Anémie', 'L’anémie est un manque de globules rouges ou de fer.', 'Elle cause fatigue et pâleur. Une alimentation riche (légumes verts, viande, haricots) aide à la prévenir.', ['fatigue et pâleur', 'aliments riches en fer'], ['sang']),
    e('Déshydratation', 'La déshydratation est un manque d’eau dans le corps.', 'Les diarrhées et fortes chaleurs en sont les causes fréquentes. Boire souvent de l’eau propre protège.', ['boire de l’eau propre', 'sérum oral contre la diarrhée'], ['eau']),
    e('Diagnostic', 'Le diagnostic est l’identification de la maladie.', 'Le médecin observe les symptômes, interroge le malade et demande des examens pour poser le diagnostic.', ['consultation médicale', 'examens de santé'], ['médecine']),
    e('Pharmacie', 'La pharmacie est le lieu où l’on achète les médicaments.', 'Seul un pharmacien ou une personne compétente doit conseiller les médicaments ; ne jamais s’auto-médiquer à l’aveugle.', ['pharmacie du quartier', 'ordonnance du médecin'], ['médicaments']),
    e('Symptôme', 'Un symptôme est un signe de maladie.', 'Fièvre, toux, douleur : les symptômes aident le soignant à comprendre ce qui se passe.', ['fièvre et toux', 'douleur au ventre'], ['santé']),
    e('Repos', 'Le repos permet au corps de récupérer.', 'Dormir bien et se reposer après l’effort renforce l’immunité et la concentration à l’école.', ['dormir 8 à 10 heures', 'pause après le sport'], ['sommeil']),
  ],
  psychologie: [
    e('Concentration', 'La concentration fixe l’attention sur une tâche.', 'Une salle calme, un objectif clair et des pauses courtes améliorent la concentration en classe.', ['écouter la consigne', 'travailler sans bruit'], ['attention']),
    e('Anxiété', 'L’anxiété est une inquiétude forte et persistante.', 'Avant un examen ou un exposé, elle est normale. Respirer, se préparer et en parler aide à la maîtriser.', ['trac avant un exposé', 'parler de ses peurs'], ['émotion']),
    e('Empathie', 'L’empathie est la capacité à comprendre les sentiments des autres.', 'Elle permet d’aider, de consoler et de vivre ensemble. Elle se cultive en écoutant et en se mettant à la place de l’autre.', ['consoler un camarade', 'se mettre à la place de l’autre'], ['respect']),
    e('Confiance en soi', 'La confiance en soi est la certitude de ses capacités.', 'Elle grandit avec les réussites, les encouragements et l’entraînement. Chacun peut progresser !', ['croire en ses capacités', 'réussir après l’entraînement'], ['estime']),
    e('Habitude', 'Une habitude est un comportement répété.', 'Les bonnes habitudes (réviser, se laver les mains, lire) deviennent naturelles avec le temps.', ['réviser chaque soir', 'lavage des mains'], ['routine']),
    e('Sommeil', 'Le sommeil repose le corps et le cerveau.', 'Il aide à mémoriser et à grandir. Un enfant a besoin de 8 à 10 heures de sommeil par nuit, loin des écrans.', ['dormir tôt', 'récupérer la nuit'], ['repos']),
  ],
  religions: [
    e('Bible', 'La Bible est le livre sacré des chrétiens.', 'Elle raconte l’histoire du peuple de Dieu et les enseignements de Jésus-Christ, et se lit partout dans le monde.', ['Ancien et Nouveau Testament', 'lecture à l’église'], ['livre sacré']),
    e('Coran', 'Le Coran est le livre sacré des musulmans.', 'Il contient les paroles révélées au prophète Muhammad et guide la vie spirituelle et morale des musulmans.', ['sourates', 'lecture à la mosquée'], ['livre sacré']),
    e('Église', 'L’église est le lieu de culte des chrétiens.', 'On s’y rassemble pour prier, chanter et écouter des enseignements. Elle joue souvent un rôle social et éducatif.', ['messe du dimanche', 'chorale paroissiale'], ['culte']),
    e('Mosquée', 'La mosquée est le lieu de culte des musulmans.', 'On y prie, notamment le vendredi. La mosquée est aussi un lieu d’enseignement et de solidarité.', ['prière du vendredi', 'école coranique'], ['culte']),
    e('Pèlerinage', 'Le pèlerinage est un voyage vers un lieu sacré.', 'Il se pratique dans plusieurs religions et marque un moment fort de foi et de recueillement.', ['pèlerinage à la Mecque', 'pèlerinage sur un site sacré'], ['voyage']),
    e('Ancêtres', 'Les ancêtres sont les membres défunts de la famille.', 'Dans les traditions béninoises, on les honore et on leur rend grâce : ils transmettent l’histoire et les valeurs de la famille.', ['honorer les ancêtres', 'transmission des valeurs'], ['tradition']),
  ],
  sciences: [
    e('Atome', 'L’atome est la plus petite unité de la matière.', 'Tout ce qui nous entoure est fait d’atomes. Ils sont si petits qu’on ne les voit pas à l’œil nu.', ['atome d’hydrogène', 'constituant de l’eau'], ['matière']),
    e('Molécule', 'Une molécule est un ensemble d’atomes liés.', 'La molécule d’eau (H₂O) est formée de deux atomes d’hydrogène et d’un atome d’oxygène.', ['molécule d’eau', 'molécule d’air'], ['chimie']),
    e('Électricité', 'L’électricité est une énergie qui fait fonctionner les appareils.', 'Elle circule dans les fils et peut être produite par des centrales ou par le soleil. Ne jamais toucher aux fils dénudés !', ['ampoule allumée', 'panneau solaire'], ['énergie']),
    e('Aimant', 'Un aimant attire le fer.', 'Il a deux pôles (nord et sud) : deux pôles qui se ressemblent se repoussent. La boussole utilise un aimant.', ['aimant attire un clou', 'boussole'], ['magnétisme']),
    e('Photosynthèse', 'La photosynthèse est la fabrication de nourriture par les plantes.', 'Avec le soleil, l’eau et le gaz carbonique, la plante produit de l’oxygène et de l’énergie.', ['une plante au soleil', 'production d’oxygène'], ['plante']),
    e('Microscope', 'Le microscope grossit les objets minuscules.', 'Il permet d’observer les cellules, les microbes et les insectes invisibles à l’œil nu.', ['observer une goutte d’eau', 'laboratoire de sciences'], ['observation']),
  ],
  education: [
    e('Programme scolaire', 'Le programme scolaire liste ce qui doit être enseigné.', 'Il organise les matières et les objectifs par niveau. Le programme officiel guide les enseignants.', ['programme de CI', 'progressions annuelles'], ['enseignement']),
    e('Manuel scolaire', 'Le manuel scolaire est le livre de la classe.', 'Il contient les leçons et les exercices. Les manuels permettent à l’élève de réviser à la maison.', ['manuel de calcul', 'manuel de lecture'], ['livre']),
    e('Conseil de classe', 'Le conseil de classe réunit les enseignants sur les résultats.', 'Il examine les moyennes, les difficultés et les décisions (passage en classe supérieure, accompagnement).', ['conseil du premier trimestre', 'décision de passage'], ['évaluation']),
    e('Examen', 'Un examen vérifie les connaissances acquises.', 'Il se prépare toute l’année. Le certificat d’études primaires (CEP) est l’examen de fin du primaire au Bénin.', ['CEP au Bénin', 'examen de fin d’année'], ['évaluation']),
    e('Baccalauréat', 'Le baccalauréat est l’examen de fin des études secondaires.', 'Il donne accès aux études supérieures. Il existe des séries littéraires, scientifiques, économiques et techniques.', ['BAC C', 'BAC A'], ['diplôme']),
    e('Université', 'L’université est le lieu des études supérieures.', 'On y prépare des licences, masters et doctorats. Le Bénin compte plusieurs universités publiques et privées.', ['université d’Abomey-Calavi', 'études supérieures'], ['études']),
  ],
  agriculture: [
    e('Sol', 'Le sol est la couche de terre où poussent les plantes.', 'Un sol riche en humus donne de bons rendements. Les engrais et le compost l’enrichissent.', ['terre du champ', 'compost'], ['terre']),
    e('Engrais', 'L’engrais nourrit le sol et les plantes.', 'Les engrais naturels (fumier, compost) et minéraux augmentent la récolte s’ils sont bien dosés.', ['fumier de ferme', 'engrais NPK'], ['fertilité']),
    e('Récolte', 'La récolte est le ramassage des cultures mûres.', 'Maïs, igname, coton ou arachide : la récolte doit se faire au bon moment et se conserver correctement.', ['récolte du maïs', 'récolte de l’igname'], ['champ']),
    e('Maraîchage', 'Le maraîchage cultive des légumes près des villes.', 'Laitues, tomates, oignons, piments : le maraîchage nourrit les marchés urbains et procure des revenus.', ['champ de tomates', 'irrigation au goutte-à-goutte'], ['légumes']),
    e('Igname', 'L’igname est un gros tubercule très nourrissant.', 'Cultivée surtout au centre et au nord du Bénin, elle se conserve plusieurs mois et accompagne de nombreux plats.', ['igname pilée', 'fête de l’igname'], ['tubercule']),
    e('Coton', 'Le coton est une plante fibreuse cultivée pour ses graines.', 'Le Bénin est l’un des premiers producteurs de coton d’Afrique de l’Ouest : c’est une culture de rente appelée « or blanc ».', ['récolte du coton', 'usine d’égrenage'], ['culture de rente']),
  ],
  benin: [
    e('Abomey', 'Abomey est l’ancienne capitale du royaume du Danxomè.', 'Ses palais royaux et le musée historique racontent l’histoire des rois du Danxomè. Le site est classé au patrimoine mondial de l’UNESCO.', ['palais royaux d’Abomey', 'musée historique'], ['patrimoine']),
    e('Ganvié', 'Ganvié est un village construit sur l’eau, sur le lac Nokoué.', 'Ses habitations sur pilotis lui valent le surnom de « Venise de l’Afrique ». Les habitants vivent de la pêche et de l’écotourisme.', ['village lacustre', 'maisons sur pilotis'], ['lac']),
    e('Parc de la Pendjari', 'La Pendjari est un grand parc national au nord-ouest du Bénin.', 'On y trouve éléphants, lions, buffles et antilopes. Le parc est classé réserve de biosphère et attire des touristes du monde entier.', ['safari dans la Pendjari', 'réserve de biosphère'], ['nature']),
    e('Mont Sokbaro', 'Le mont Sokbaro est le point culminant du Bénin.', 'Il s’élève à environ 658 mètres, dans le nord-ouest du pays, près du village de Boukoumbé.', ['sommet du Bénin', 'chaîne de l’Atacora'], ['relief']),
    e('Marché Dantokpa', 'Dantokpa est le grand marché de Cotonou.', 'C’est l’un des plus grands marchés d’Afrique de l’Ouest : vêtements, vivres, mécanique et artisanat s’y côtoient.', ['achat de vivres', 'commerce de Cotonou'], ['commerce']),
    e('Langue fon', 'Le fon est une langue parlée au sud du Bénin.', 'Il fait partie des langues gbe et est parlé par des millions de personnes. De nombreuses langues coexistent au Bénin, comme le yoruba et le dendi.', ['« kudo » = merci', 'langues du Bénin'], ['langue']),
  ],
  afrique: [
    e('Sahara', 'Le Sahara est le plus grand désert chaud du monde.', 'Il couvre une grande partie de l’Afrique du Nord et s’étend sur plusieurs pays. Dunes, oasis et caravanes le parcourent.', ['dunes du Sahara', 'oasis'], ['désert']),
    e('Nil', 'Le Nil est l’un des plus longs fleuves du monde.', 'Il traverse l’Afrique du nord et joue un rôle vital pour l’agriculture égyptienne et soudanaise.', ['crues du Nil', 'fleuve d’Égypte'], ['fleuve']),
    e('Kilimandjaro', 'Le Kilimandjaro est la plus haute montagne d’Afrique.', 'Il culmine à 5 895 mètres en Tanzanie. Son sommet est couvert de neige et de glace toute l’année.', ['sommet enneigé', 'Tanzanie'], ['montagne']),
    e('CEDEAO', 'La CEDEAO regroupe les États de l’Afrique de l’Ouest.', 'Créée en 1975, elle favorise la paix, le commerce et la libre circulation entre pays membres, dont le Bénin.', ['communauté ouest-africaine', 'liberté de circulation'], ['coopération']),
    e('Griot', 'Le griot est le conteur et musicien de la tradition ouest-africaine.', 'Il garde la mémoire des familles et des royaumes, et anime les fêtes par ses récits, chants et instruments.', ['griot et kora', 'récits des anciens'], ['tradition']),
    e('Lacs africains', 'L’Afrique compte de grands lacs très poissonneux.', 'Le lac Victoria, le lac Tchad et le lac Nokoué au Bénin nourrissent des millions de personnes et abritent une faune riche.', ['lac Tchad', 'lac Nokoué'], ['eau']),
  ],
  sport: [
    e('Basketball', 'Le basketball est un sport collectif avec un ballon et un panier.', 'Il développe l’adresse, le saut et l’esprit d’équipe. Marquer panier rapporte 2 ou 3 points.', ['panier à 3 points', 'match inter-écoles'], ['sport']),
    e('Volleyball', 'Le volleyball oppose deux équipes autour d’un filet.', 'Le ballon doit passer au-dessus du filet sans toucher le sol. Il demande coopération et réflexes.', ['service au volleyball', 'tournoi de quartier'], ['sport']),
    e('Natation', 'La natation est le sport de l’eau.', 'Elle muscle tout le corps et peut sauver des vies. Il faut toujours nager en zone surveillée.', ['apprendre à nager', 'cours à la piscine'], ['eau']),
    e('Judo', 'Le judo est un art martial japonais.', 'Il apprend le contrôle, l’équilibre et le respect de l’adversaire. Les ceintures marquent les niveaux.', ['ceinture blanche', 'projet de judo'], ['art martial']),
    e('Jeux olympiques', 'Les Jeux olympiques réunissent les sportifs du monde entier.', 'Ils ont lieu tous les quatre ans (été et hiver). Les premières olympiades modernes datent de 1896, à Athènes.', ['JO d’été', 'médailles olympiques'], ['compétition']),
    e("Esprit d'équipe", "L'esprit d'équipe est la coopération pour réussir ensemble.", 'Chaque joueur compte : encourager, passer le ballon et féliciter les autres rend l’équipe plus forte.', ['encourager un coéquipier', 'travail collectif'], ['fair-play']),
  ],
};
