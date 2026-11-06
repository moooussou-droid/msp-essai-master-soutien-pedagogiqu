/**
 * « Cultivons-nous » — culture générale pour les élèves et leurs enseignants.
 * Articles courts et originaux (béninois, africains, monde, sciences, nature,
 * arts, personnages), proverbes, devinettes et quiz culturel. 100 % hors-ligne.
 */

export interface CultureArticle {
  id: string;
  title: string;
  teaser: string;
  body: string;
  rubric: string;
}

export const CULTURE_RUBRICS = [
  { id: 'benin', label: '🇧🇯 Notre Bénin', emoji: '🇧🇯' },
  { id: 'afrique', label: '🌍 L’Afrique', emoji: '🌍' },
  { id: 'monde', label: '🗺️ Le monde', emoji: '🗺️' },
  { id: 'sciences', label: '🔬 Sciences & découvertes', emoji: '🔬' },
  { id: 'nature', label: '🌿 Nature', emoji: '🌿' },
  { id: 'arts', label: '🎨 Arts & culture', emoji: '🎨' },
  { id: 'personnages', label: '👤 Grands personnages', emoji: '👤' },
  { id: 'sagesse', label: '🦉 Sagesse & jeux', emoji: '🦉' },
] as const;

export const CULTURE_ARTICLES: CultureArticle[] = [
  /* ---------------- Notre Bénin ---------------- */
  {
    id: 'ganvie',
    title: 'Ganvié, la cité lacustre',
    teaser: 'Une ville construite sur l’eau, où l’on se déplace en pirogue.',
    body: 'Ganvié, dans le sud du Bénin, est souvent appelée « la Venise de l’Afrique » : ses maisons sont posées sur pilotis au milieu du lac Nokoué. Ses habitants, les Ayizo, s’y sont installés il y a plusieurs siècles pour échapper aux guerriers. On y circule en pirogue, on y pêche et on y vend au marché flottant. C’est l’un des plus grands villages lacustres d’Afrique.',
    rubric: 'benin',
  },
  {
    id: 'abomey',
    title: 'Les palais royaux d’Abomey',
    teaser: 'Des murs de terre qui racontent l’histoire des rois du Danhomè.',
    body: 'Au cœur d’Abomey se dressent les palais des rois du Danhomè, classés au patrimoine mondial de l’UNESCO. Chaque roi y ajoutait son palais, décoré de bas-reliefs en terre qui racontent les batailles et les légendes du royaume. Aujourd’hui, certains palais abritent un musée où l’on découvre trônes, statues et objets royaux. Visiter Abomey, c’est lire l’histoire du Bénin à livre ouvert.',
    rubric: 'benin',
  },
  {
    id: 'penjari',
    title: 'La Pendjari, terre des lions',
    teaser: 'Le grand parc du Nord-Bénin, refuge des éléphants et des lions.',
    body: 'Le parc national de la Pendjari, au nord-ouest du Bénin, protège une savane immense où vivent lions, éléphants, buffles, hippopotames et des centaines d’espèces d’oiseaux. C’est l’une des dernières grandes réserves d’Afrique de l’Ouest. Les gardes et les villages voisins travaillent ensemble pour protéger les animaux. Un safari à la Pendjari fait découvrir la nature sauvage du pays.',
    rubric: 'benin',
  },
  {
    id: 'dantokpa',
    title: 'Dantokpa, le grand marché',
    teaser: 'Le plus grand marché à ciel ouvert du Bénin.',
    body: 'Au bord du lac Nokoué, à Cotonou, le marché Dantokpa est l’un des plus grands marchés d’Afrique de l’Ouest. On y trouve de tout : tissus, légumes, poissons, objets en fer, vêtements, calebasses. Des milliers de commerçants y travaillent chaque jour. Dantokpa montre comment le commerce fait vivre une ville entière, du lever du soleil à la nuit tombée.',
    rubric: 'benin',
  },
  {
    id: 'danxome-femmes',
    title: 'Les Agoojié, guerrières du Danhomè',
    teaser: 'Un corps d’armée de femmes célèbre dans l’histoire d’Afrique.',
    body: 'Au XVIIIe siècle, le royaume du Danhomè (actuel Bénin) créa un corps d’armée composé de femmes, les Agoojié. Elles étaient réputées pour leur discipline, leur courage et leur rapidité. Leur histoire a inspiré des films et des livres dans le monde entier. Elles montrent que, dans l’histoire africaine, les femmes ont aussi défendu et gouverné.',
    rubric: 'benin',
  },

  /* ---------------- L'Afrique ---------------- */
  {
    id: 'sahel',
    title: 'Le Sahel, entre désert et savane',
    teaser: 'Une bande d’Afrique où le sable rencontre les arbres.',
    body: 'Le Sahel est une région de transition entre le désert du Sahara, au nord, et les savanes, au sud. Il traverse plusieurs pays : Sénégal, Mali, Niger, Tchad… Les habitants y vivent de l’élevage, de la culture du mil et du commerce. Quand la pluie vient, les champs verdissent ; quand elle manque, il faut puiser dans les réserves. Le Sahel est une terre de courage et de solidarité.',
    rubric: 'afrique',
  },
  {
    id: 'timbouctou',
    title: 'Tombouctou, la cité des livres',
    teaser: 'Au Moyen Âge, une ville d’Afrique où l’on étudiait et écrivait beaucoup.',
    body: 'Du XIIIe au XVIe siècle, Tombouctou (aujourd’hui au Mali) était une grande ville de commerce et de savoir. On y venait de tout le continent pour étudier les mathématiques, l’astronomie, la médecine et la religion. Des dizaines de milliers de manuscrits écrits en arabe y sont encore conservés par les familles. Tombouctou prouve que l’écriture et la science ont une longue histoire africaine.',
    rubric: 'afrique',
  },
  {
    id: 'baobab',
    title: 'Le baobab, arbre de vie',
    teaser: 'Un arbre africain qui stocke l’eau et nourrit les villages.',
    body: 'Le baobab est l’arbre emblématique des savanes africaines. Son tronc énorme — jusqu’à 10 mètres de diamètre — lui sert de réserve d’eau. Ses fruits, riches en vitamines, donnent une poudre utilisée dans les aliments et les boissons ; ses feuilles se cuisinent en sauce. On l’appelle « l’arbre de vie » car presque tout, chez lui, est utile. Certains baobabs ont plus de 1 000 ans.',
    rubric: 'afrique',
  },
  {
    id: 'grand-lacs',
    title: 'Les Grands Lacs d’Afrique',
    teaser: 'Des lacs géants au cœur du continent.',
    body: 'Au centre-est de l’Afrique se trouvent les Grands Lacs : Victoria, Tanganyika, Malawi, Albert… Le lac Victoria est le plus grand lac d’Afrique et l’un des plus grands du monde ; le lac Tanganyika est l’un des plus profonds. Ces lacs fournissent de l’eau, du poisson et de l’électricité à des millions de personnes. Ils sont aussi célèbres pour leurs espèces de poissons uniques au monde.',
    rubric: 'afrique',
  },
  {
    id: 'fouta',
    title: 'Le Fouta-Djalon, château d’eau de l’Afrique de l’Ouest',
    teaser: 'Des montagnes d’où naissent de grands fleuves.',
    body: 'Le massif du Fouta-Djalon, en Guinée, est une région de montagnes couvertes de forêts et de prairies. C’est là que prennent naissance plusieurs grands fleuves d’Afrique de l’Ouest, dont le Niger et le Sénégal. C’est pourquoi on l’appelle « le château d’eau de l’Afrique de l’Ouest » : l’eau qui y tombe alimente des pays entiers, jusqu’à l’océan.',
    rubric: 'afrique',
  },

  /* ---------------- Le monde ---------------- */
  {
    id: 'kilimanjaro',
    title: 'Le Kilimandjaro, un volcan couvert de neige',
    teaser: 'La plus haute montagne d’Afrique, à la frontière du ciel.',
    body: 'Le Kilimandjaro, en Tanzanie, culmine à près de 5 900 mètres : c’est le plus haut sommet d’Afrique et le plus haut volcan isolé du monde. Malgré la chaleur de l’équateur, son sommet est couvert de neige et de glace. Chaque année, des milliers de marcheurs tentent l’ascension ; beaucoup y parviennent sans matériel d’alpiniste, seulement avec de bonnes chaussures et de la patience.',
    rubric: 'monde',
  },
  {
    id: 'alphabet-monde',
    title: 'Des milliers de langues sur Terre',
    teaser: 'On parle environ 7 000 langues dans le monde — et 2 000 en Afrique.',
    body: 'Les linguistes comptent environ 7 000 langues parlées sur Terre. L’Afrique en compte à elle seule plus de 2 000 : c’est le continent le plus diversifié du monde du point de vue des langues ! Le français, lui, est parlé par plus de 300 millions de personnes sur les cinq continents. Chaque langue disparue est un trésor perdu : c’est pourquoi on apprend aussi les langues maternelles à l’école.',
    rubric: 'monde',
  },
  {
    id: 'pyramides',
    title: 'Les pyramides d’Égypte',
    teaser: 'Des monuments de pierre construits il y a plus de 4 500 ans.',
    body: 'Les pyramides de Gizeh, en Égypte, ont été construites il y a plus de 4 500 ans comme tombeaux des pharaons. La plus grande, la pyramide de Khéops, est faite de plus de 2 millions de blocs de pierre. À l’époque, aucun engin de levage n’existait : les ouvriers utilisaient des rampes, des leviers et des milliers de bras. C’est un exemple extraordinaire de travail d’équipe et de savoir-faire.',
    rubric: 'monde',
  },
  {
    id: 'statue-liberte',
    title: 'La statue de la Liberté',
    teaser: 'Un cadeau de la France aux États-Unis, haute de 93 mètres.',
    body: 'La statue de la Liberté se dresse dans le port de New York, aux États-Unis. Offerte par la France en 1886 pour célébrer l’amitié entre les deux peuples, elle représente une femme qui tient une torche et une tablette. Elle mesure 93 mètres avec son socle et accueillait autrefois les voyageurs arrivant par bateau. C’est l’un des monuments les plus connus du monde.',
    rubric: 'monde',
  },
  {
    id: 'antarctique',
    title: 'L’Antarctique, le continent de glace',
    teaser: 'Le continent le plus froid, le plus sec et le plus venteux.',
    body: 'L’Antarctique, au pôle Sud, est couvert de glace sur presque toute sa surface : plus de 90 % de la glace de la Terre s’y trouve ! Aucune population ne vit en permanence, mais des scientifiques y séjournent pour étudier le climat. C’est aussi le continent le plus sec et le plus venteux du monde. Protéger l’Antarctique, c’est protéger l’équilibre du climat de toute la planète.',
    rubric: 'monde',
  },

  /* ---------------- Sciences & découvertes ---------------- */
  {
    id: 'vaccins',
    title: 'Les vaccins, boucliers du corps',
    teaser: 'Comment une petite piqûre peut protéger toute une vie.',
    body: 'Un vaccin apprend au corps à se défendre : il lui présente une version affaiblie ou inoffensive d’un microbe, et le corps fabrique des défenses (anticorps). Si le vrai microbe se présente plus tard, le corps le reconnaît et le combat vite. Grâce aux vaccins, la variole a disparu du monde et la poliomyélite recule. Les vaccins sauvent des millions de vies chaque année.',
    rubric: 'sciences',
  },
  {
    id: 'energie-solaire',
    title: 'Le Soleil, une centrale électrique géante',
    teaser: 'L’énergie du Soleil peut éclairer nos maisons.',
    body: 'Chaque seconde, le Soleil envoie vers la Terre une énergie énorme. Les panneaux solaires la transforment en électricité : c’est l’énergie solaire. Elle est gratuite, propre et disponible surtout dans les pays chauds comme le Bénin. De plus en plus d’écoles et de maisons utilisent des panneaux solaires pour s’éclairer et faire fonctionner des appareils. Le Soleil est notre « usine » d’énergie la plus fiable.',
    rubric: 'sciences',
  },
  {
    id: 'cycle-eau',
    title: 'Le voyage d’une goutte d’eau',
    teaser: 'De l’océan au nuage, du nuage à la rivière : un voyage sans fin.',
    body: 'Le Soleil chauffe l’eau des océans, des lacs et des rivières : elle s’évapore, monte et forme les nuages. Refroidie en altitude, elle retombe en pluie ou en neige. Une partie s’infiltre dans la terre, une autre rejoint les rivières qui la ramènent vers la mer… et le voyage recommence. C’est le cycle de l’eau. L’eau qui tombe aujourd’hui est la même que celle des dinosaures !',
    rubric: 'sciences',
  },
  {
    id: 'abeilles',
    title: 'Les abeilles, petites ouvrières de la nature',
    teaser: 'Sans les abeilles, beaucoup de fruits et de légumes disparaîtraient.',
    body: 'En butinant de fleur en fleur, les abeilles transportent le pollen et permettent aux plantes de produire fruits et graines : on dit qu’elles pollinisent. Environ un tiers de notre nourriture dépend de ces petites ouvrières ! Elles fabriquent aussi le miel, récolté par les apiculteurs. Malheureusement, les pesticides et la disparition des fleurs menacent les abeilles : les protéger, c’est protéger notre alimentation.',
    rubric: 'sciences',
  },
  {
    id: 'espace',
    title: 'La Lune, notre voisine céleste',
    teaser: 'À 384 000 km de la Terre — et pourtant si proche.',
    body: 'La Lune tourne autour de la Terre à environ 384 000 kilomètres. Elle n’a ni air, ni eau liquide, ni vie : les pas des astronautes qui y sont allés en 1969 sont toujours visibles, car rien ne les efface. La Lune provoque les marées et éclaire nos nuits. Il faut environ 3 jours de voyage pour l’atteindre, mais seulement 1,3 seconde pour que sa lumière nous parvienne.',
    rubric: 'sciences',
  },

  /* ---------------- Nature ---------------- */
  {
    id: 'mangroves',
    title: 'Les mangroves, gardiennes des côtes',
    teaser: 'Des arbres qui poussent dans l’eau salée et protègent les villages.',
    body: 'Les mangroves sont des forêts d’arbres qui poussent dans l’eau salée des lagunes et des estuaires, comme au sud du Bénin. Leurs racines retiennent la terre, abritent poissons et crabes, et filtrent l’eau. Elles forment un bouclier contre les vagues et les tempêtes. Couper les mangroves, c’est exposer les villages aux inondations : leur protection est vitale.',
    rubric: 'nature',
  },
  {
    id: 'acacia',
    title: 'L’acacia, épineux généreux',
    teaser: 'L’arbre des savanes qui nourrit, abrite et fertilise.',
    body: 'Dans les savanes d’Afrique, l’acacia est partout. Ses épines protègent ses feuilles des animaux ; sa gomme (gomme arabique) sert dans les aliments ; ses gousses nourrissent le bétail. Certains acacias abritent des fourmis qui défendent l’arbre contre les herbivores : une véritable équipe ! C’est un arbre indispensable pour les sols secs, qu’il fertilise avec ses racines.',
    rubric: 'nature',
  },
  {
    id: 'poissons-lac',
    title: 'La pêche dans les eaux du Bénin',
    teaser: 'Le lac Nokoué nourrit des milliers de familles.',
    body: 'Au Bénin, des milliers de pêcheurs travaillent sur le lac Nokoué, la lagune de Porto-Novo et les eaux de l’océan Atlantique. On y pêche le poisson-chat, la carpe, les crevettes… Dans certaines zones du lac, des acadjas — grands enclos faits de branchages — servent de nurseries pour les poissons. Une pêche bien réglée garantit du poisson pour les générations futures.',
    rubric: 'nature',
  },
  {
    id: 'termites',
    title: 'Les termitières, gratte-ciels de la savane',
    teaser: 'Des bâtiments de terre, climatisés naturellement.',
    body: 'Les termites construisent des termitières : des buttes de terre parfois hautes de plusieurs mètres. À l’intérieur, des galeries et des couloirs ventilent la fourmilière, comme une climatisation naturelle. Chaque termite a son rôle : soldats, ouvrières, reine. En aérant le sol, les termites l’enrichissent et aident les plantes. Les termitières peuvent vivre des décennies, voire des siècles.',
    rubric: 'nature',
  },
  {
    id: 'saisons',
    title: 'Pourquoi les saisons changent',
    teaser: 'La Terre est inclinée : c’est ce qui fait les saisons.',
    body: 'La Terre tourne autour du Soleil en un an, mais son axe est incliné : une moitié de la planète est plus proche du Soleil à un moment, l’autre moitié plus tard. Voilà pourquoi les saisons s’inversent entre les deux hémisphères : quand c’est l’hiver en Europe, c’est la saison sèche… ou l’été selon les régions ! Au Bénin, on connaît surtout la saison des pluies et la saison sèche, liées aux mêmes inclinaison.',
    rubric: 'nature',
  },

  /* ---------------- Arts & culture ---------------- */
  {
    id: 'tissus',
    title: 'Les tissus d’Afrique racontent des histoires',
    teaser: 'Tisser, teindre, porter : un langage de couleurs et de motifs.',
    body: 'En Afrique de l’Ouest, les tissus sont chargés de sens. Les motifs du pagne racontent proverbes, événements ou messages ; le kente du Ghana, tissé en bandes de soie et de coton, était réservé aux rois ; la teinture indigo du Bénin et du Nigeria demande un savoir-faire ancien. Le bijou du tisserand est sa mémoire : chaque motif garde une histoire qui se transmet de génération en génération.',
    rubric: 'arts',
  },
  {
    id: 'tambour',
    title: 'Le tambour, voix des villages',
    teaser: 'Parlé, chanté, dansé : le tambour accompagne toute la vie.',
    body: 'En Afrique, le tambour n’est pas seulement un instrument : on l’utilisait pour transmettre des messages entre villages — on dit que le tambour « parle ». Le djembé, le gongon ou le tambour d’Abomey rythment fêtes, cérémonies et danses. Fabriquer un tambour, c’est choisir le bois, tendre la peau et l’accorder. Aujourd’hui encore, aucune fête béninoise ne se danse sans tambour.',
    rubric: 'arts',
  },
  {
    id: 'gelede',
    title: 'Le Guélédé, théâtre masqué',
    teaser: 'Un art du Bénin et du Nigeria classé au patrimoine de l’humanité.',
    body: 'Le Guélédé est une cérémonie de masques et de danse pratiquée par les Yoruba du Bénin et du Nigeria, inscrite au patrimoine oral de l’humanité par l’UNESCO. Les danseurs portent des masques sculptés dans le bois, souvent coiffés de personnages : mères, devins, animaux. Les chants accompagnent les pas et transmettent des messages sur la vie en société. C’est un mélange d’art, de musique et de sagesse.',
    rubric: 'arts',
  },
  {
    id: 'vannerie',
    title: 'La vannerie, art de la paille',
    teaser: 'Des paniers, nattes et chapeaux tressés à la main.',
    body: 'Avec des tiges de palmier, de bambou ou d’herbes sèches, les vanniers tissent des paniers, des nattes, des chapeaux, des éventails et même des claies pour les murs. Chaque région a sa technique et ses motifs : le tissage serré des nattes de Ouémé n’est pas celui des paniers du Nord. Cette activité, transmise de mère en fille, ne demande aucun outil coûteux — seulement des mains habiles et de la patience.',
    rubric: 'arts',
  },
  {
    id: 'contes',
    title: 'Les contes, l’école de la nuit',
    teaser: 'Autour du feu, la leçon se raconte.',
    body: 'Dans la tradition béninoise, le conte se raconte le soir, autour du feu, souvent à la saison sèche. Le conteur anime la voix, chante, interroge l’auditoire : « Hou ! Hou ! » et l’assistance répond. Les contes mettent en scène des animaux astucieux — le lièvre, l’araignée — pour faire rire… et pour apprendre : ruse, sagesse, entraide. Les contes sont les premières leçons de morale de l’enfant.',
    rubric: 'arts',
  },

  /* ---------------- Grands personnages ---------------- */
  {
    id: 'behanzin',
    title: 'Béhanzin, roi résistant',
    teaser: 'Le roi du Danhomè qui lutta contre la colonisation.',
    body: 'Béhanzin devint roi du Danhomè (actuel Bénin) en 1889. Quand les troupes coloniales françaises voulurent s’emparer de son royaume, il organisa la résistance : fortifications, armée, négociations. Il fut finalement vaincu et exilé, d’abord en Martinique, puis en Algérie, où il mourut en 1906. Ses restes ont été ramenés à Abomey en 1928. Béhanzin reste un symbole de fierté et de résistance en Afrique.',
    rubric: 'personnages',
  },
  {
    id: 'houegbadja',
    title: 'Houégbadja, fondateur d’Abomey',
    teaser: 'Le roi qui posa les bases du royaume du Danhomè.',
    body: 'Au début du XVIIe siècle, Houégbadja unifia plusieurs clans et fonda la ville d’Abomey, capitale du futur royaume du Danhomè. Il organisa l’administration, donna des lois et installa les grandes familles autour du palais. Les rois qui lui succédèrent agrandirent le royaume jusqu’aux côtes de l’Atlantique. Son nom est encore honoré à Abomey : l’histoire du Bénin commence pour beaucoup avec lui.',
    rubric: 'personnages',
  },
  {
    id: 'mundele',
    title: 'Aoua Keïta, militante et sage-femme',
    teaser: 'Une femme d’Afrique qui a fait avancer les droits des femmes.',
    body: 'Aoua Keïta (1912-1980), sage-femme malienne, fut l’une des premières femmes d’Afrique de l’Ouest à s’engager en politique. Elle soigna les populations dans les régions éloignées, milita pour l’indépendance du Mali et fut élue députée en 1959. Elle fit campagne pour que les femmes votent, étudient et participent à la vie publique. Sa vie montre qu’une personne déterminée peut changer la société.',
    rubric: 'personnages',
  },
  {
    id: 'mandela',
    title: 'Nelson Mandela, la force de la paix',
    teaser: '27 ans de prison, puis président : l’histoire d’un homme inébranlable.',
    body: 'Nelson Mandela (1918-2013) lutta contre l’apartheid, le système de séparation raciale en Afrique du Sud. Il passa 27 ans en prison, où il refusa de renoncer à ses idées. Libéré en 1990, il devint président du pays en 1994 et choisit la réconciliation plutôt que la vengeance. Prix Nobel de la paix, il reste un modèle mondial de courage et de dignité.',
    rubric: 'personnages',
  },
  {
    id: 'mariama',
    title: 'Mariama Bâ, la plume des femmes',
    teaser: 'Un roman qui a fait entendre la voix des femmes d’Afrique.',
    body: 'Mariama Bâ (1929-1981) était une écrivaine sénégalaise et enseignante. Son roman « Une si longue lettre », publié en 1979, raconte la vie d’une femme entre tradition et modernité : mariage, polygamie, éducation des enfants. Le livre a été traduit dans le monde entier et reste une référence sur la condition des femmes en Afrique. Elle prouve que la littérature peut faire réfléchir toute une société.',
    rubric: 'personnages',
  },

  /* ---------------- Sagesse & jeux ---------------- */
  {
    id: 'proverbes',
    title: 'Proverbes de sagesse',
    teaser: 'Les proverbes condensent l’expérience des anciens en quelques mots.',
    body: 'Un proverbe est une petite phrase qui porte une grande leçon. En Afrique, on les cite dans les discussions, les contes et les cérémonies : « Petit à petit, l’oiseau fait son nid » (la patience), « Une seule main ne peut pas attacher un fagot » (l’entraide), « Quand le coq chante, c’est que le jour vient » (l’espoir), « L’eau chaude n’oublie pas qu’elle a été froide » (la modestie). Retenir un proverbe, c’est retenir une leçon de vie.',
    rubric: 'sagesse',
  },
  {
    id: 'devinettes',
    title: 'Devinettes pour réfléchir',
    teaser: 'Des questions qui obligent à observer et à deviner.',
    body: 'Les devinettes font travailler la tête : écoute bien, observe et trouve ! — « Je suis blanc le jour et noir la nuit : qui suis-je ? » (le tableau). — « Plus on me prend, plus je grandis : qui suis-je ? » (le trou). — « J’ai des branches mais pas d’arbre, des feuilles mais pas de livre : qui suis-je ? » (le livre). Ceux qui connaissent la réponse doivent expliquer pourquoi : voilà un beau jeu de classe.',
    rubric: 'sagesse',
  },
  {
    id: 'jeux-afrique',
    title: 'Les jeux de l’enfance africaine',
    teaser: 'L’awalé, les élastiques, les billes : jouer, c’est aussi apprendre.',
    body: 'Partout en Afrique, on joue dans la cour avec ce que l’on a : cailloux, noyaux, élastiques, pneus, bâtons. L’awalé, jeu de calcul et de stratégie, se joue avec des graines dans des trous : il apprend à compter et à prévoir. Les jeux de marelle et d’élastique développent l’adresse ; les tours de ficelle imitent les anciens. Jouer ensemble apprend aussi à gagner, à perdre et à respecter les règles.',
    rubric: 'sagesse',
  },
  {
    id: 'chiffres',
    title: 'L’origine des chiffres',
    teaser: 'Les chiffres que nous utilisons viennent d’Inde, via le monde arabe.',
    body: 'Les chiffres 0, 1, 2, 3… dits « chiffres arabes », ont été inventés en Inde il y a plus de 1 500 ans. Les savants arabes les ont diffusés en Afrique du Nord puis en Europe, avec une invention géniale : le zéro, qui permet d’écrire tous les nombres. Avant cela, on calculait avec des cailloux, des cordes à nœuds ou des bâtons. Les mathématiques sont un voyage à travers les civilisations.',
    rubric: 'sagesse',
  },
];

/* ---------------- Quiz culturel ---------------- */

export interface CultureQuizQuestion {
  question: string;
  options: string[];
  correct: number; // index de la bonne réponse
  info: string; // petite explication après la réponse
}

export const CULTURE_QUIZ: CultureQuizQuestion[] = [
  { question: 'Où se trouve le village lacustre de Ganvié ?', options: ['Au nord du Bénin', 'Sur le lac Nokoué', 'En pleine forêt', 'Sur la côte du Ghana'], correct: 1, info: 'Ganvié est posé sur pilotis au milieu du lac Nokoué, dans le sud du Bénin.' },
  { question: 'Quel animal emblématique vit dans la Pendjari ?', options: ['Le lion', 'Le dromadaire', 'Le panda', 'Le kangourou'], correct: 0, info: 'La Pendjari, au nord-ouest du Bénin, protège lions, éléphants et buffles.' },
  { question: 'Qui étaient les Agoojié ?', options: ['Des marchandes', 'Des guerrières du royaume du Danhomè', 'Des tisserandes', 'Des reines d’Égypte'], correct: 1, info: 'Les Agoojié étaient un corps d’armée de femmes du Danhomè, connu pour son courage.' },
  { question: 'Que stocke le tronc du baobab ?', options: ['Du sable', 'De l’eau', 'Du miel', 'Du sel'], correct: 1, info: 'Le tronc du baobab sert de réserve d’eau pour supporter la saison sèche.' },
  { question: 'Combien y a-t-il environ de langues en Afrique ?', options: ['Environ 100', 'Environ 500', 'Plus de 2 000', 'Moins de 50'], correct: 2, info: 'L’Afrique compte plus de 2 000 langues : c’est le continent le plus diversifié.' },
  { question: 'Qu’est-ce qui provoque les saisons ?', options: ['La rotation de la Lune', 'L’inclinaison de l’axe de la Terre', 'La distance au Soleil seulement', 'Les nuages'], correct: 1, info: 'La Terre est inclinée sur son axe : c’est cette inclinaison qui crée les saisons.' },
  { question: 'Quel instrument servait à envoyer des messages entre villages ?', options: ['La flûte', 'Le tambour', 'La guitare', 'Le xylophone'], correct: 1, info: 'Le tambour « parlant » transmettait des messages d’un village à l’autre.' },
  { question: 'Qui fut le roi résistant du Danhomè ?', options: ['Béhanzin', 'Napoléon', 'Mansa Moussa', 'Roi Kofi'], correct: 0, info: 'Béhanzin organisa la résistance contre la colonisation à la fin du XIXe siècle.' },
  { question: 'Combien de temps Mandela a-t-il passé en prison ?', options: ['3 ans', '10 ans', '27 ans', '40 ans'], correct: 2, info: 'Mandela a passé 27 ans en prison avant de devenir président de l’Afrique du Sud.' },
  { question: 'Quel monument de 93 m se trouve dans le port de New York ?', options: ['La tour Eiffel', 'La statue de la Liberté', 'Les pyramides', 'L’arc de triomphe'], correct: 1, info: 'La statue de la Liberté, offerte par la France, domine le port de New York.' },
  { question: 'Qu’apprend un vaccin au corps ?', options: ['À courir plus vite', 'À se défendre contre un microbe', 'À dormir', 'À produire du sang'], correct: 1, info: 'Le vaccin entraîne le corps à reconnaître et combattre un microbe donné.' },
  { question: 'Grâce à quel insecte les plantes fabriquent-elles leurs fruits ?', options: ['La mouche', 'L’abeille (pollinisation)', 'Le moustique', 'Le termite'], correct: 1, info: 'En transportant le pollen, les abeilles permettent aux plantes de produire fruits et graines.' },
  { question: 'La cérémonie Guélédé est inscrite au patrimoine de…', options: ['L’UNESCO', 'La FIFA', 'L’ONU seulement', 'Aucun organisme'], correct: 0, info: 'Le Guélédé, théâtre de masques yoruba, est classé au patrimoine culturel immatériel.' },
  { question: 'Quelle est la plus haute montagne d’Afrique ?', options: ['L’Atlas', 'Le Kilimandjaro', 'Le mont Sokbaro', 'Les Alpes'], correct: 1, info: 'Le Kilimandjaro (Tanzanie) culmine à près de 5 900 mètres.' },
  { question: 'D’où viennent les chiffres que nous utilisons ?', options: ['De l’Inde (via le monde arabe)', 'De la Grèce', 'De l’Australie', 'De la Lune'], correct: 0, info: 'Nos chiffres ont été inventés en Inde et diffusés par les savants arabes.' },
];

/** Tirage déterministe de questions du quiz culturel (graine = jour, par exemple). */
export function pickCultureQuiz(count = 5, seed = 'culture'): CultureQuizQuestion[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = [...CULTURE_QUIZ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (h + i * 2654435761) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

/* ---------------- Proverbes & devinettes du jour ---------------- */

export interface Proverb { text: string; meaning: string; }
export interface Riddle { question: string; answer: string; }

export const PROVERBS: Proverb[] = [
  { text: 'Petit à petit, l’oiseau fait son nid.', meaning: 'La patience et les petits efforts mènent aux grandes réussites.' },
  { text: 'Une seule main ne peut pas attacher un fagot.', meaning: 'Seul, on est limité ; ensemble, on réussit.' },
  { text: 'Quand le coq chante, c’est que le jour vient.', meaning: 'Après la nuit, l’espoir et la lumière reviennent toujours.' },
  { text: 'L’eau chaude n’oublie pas qu’elle a été froide.', meaning: 'Celui qui réussit ne doit pas oublier d’où il vient.' },
  { text: 'C’est au pied du mur qu’on voit le maçon.', meaning: 'C’est dans l’action qu’on reconnaît le savoir-faire.' },
  { text: 'Le chien aboie, la caravane passe.', meaning: 'Les critiques ne doivent pas arrêter ceux qui avancent.' },
  { text: 'Qui veut aller loin ménage sa monture.', meaning: 'On ménage ses forces et ses biens pour durer.' },
  { text: 'L’arbre qui tombe fait plus de bruit que la forêt qui pousse.', meaning: 'Les grandes réussites silencieuses comptent plus que le bruit.' },
  { text: 'Il n’y a pas de honte à apprendre : il n’y a de honte qu’à ignorer.', meaning: 'Poser des questions est une force, pas une faiblesse.' },
  { text: 'La rivière ne remonte pas à sa source.', meaning: 'Le temps passe : il faut saisir les occasions.' },
  { text: 'Deux amis qui se disputent valent mieux qu’un trésor caché.', meaning: 'Les relations humaines priment sur les richesses.' },
  { text: 'La nuit est le meilleur moment pour compter les étoiles : il suffit de lever les yeux.', meaning: 'Les choses précieuses sont parfois à portée de main.' },
  { text: 'On ne lance pas de pierre quand on vit dans une maison de verre.', meaning: 'On ne critique pas les autres quand on a les mêmes défauts.' },
  { text: 'Si tu veux aller vite, marche seul ; si tu veux aller loin, marchons ensemble.', meaning: 'La coopération permet d’atteindre les grands objectifs.' },
  { text: 'L’ignorance est une nuit, mais l’école est une lampe.', meaning: 'L’éducation éclaire la vie et ouvre l’avenir.' },
  { text: 'Un puits sec n’a pas honte de creuser plus profond.', meaning: 'La difficulté n’est pas une honte : c’est un appel à progresser.' },
];

export const RIDDLES: Riddle[] = [
  { question: 'Je suis blanc le jour et noir la nuit. Qui suis-je ?', answer: 'Le tableau (noir) : la nuit, il est noir, et le jour, il est blanc de craie.' },
  { question: 'Plus on me prend, plus je grandis. Qui suis-je ?', answer: 'Le trou : plus on enlève de terre, plus il devient grand.' },
  { question: 'J’ai des feuilles mais je ne suis pas un arbre. Qui suis-je ?', answer: 'Le livre : ses pages sont ses feuilles.' },
  { question: 'Je cours sans jambes et je parle sans bouche. Qui suis-je ?', answer: 'Le vent : il court et siffle sans voix.' },
  { question: 'Mon nez est long, mes oreilles sont grandes, je transporte mes enfants sur mon dos. Qui suis-je ?', answer: 'L’éléphant.' },
  { question: 'On m’ouvre quand on mange, on me ferme quand on dort. Qui suis-je ?', answer: 'La bouche.' },
  { question: 'Le jour, je te suis ; la nuit, je te précède. Qui suis-je ?', answer: 'L’ombre : le matin elle est devant, le soir derrière.' },
  { question: 'Je tombe et je ne me fais pas mal ; je pleure et je n’ai pas d’yeux. Qui suis-je ?', answer: 'La pluie.' },
  { question: 'Tout le monde me demande, personne ne me remercie. Qui suis-je ?', answer: 'Le conseil : on le demande, on le reçoit, mais on oublie souvent de dire merci !' },
  { question: 'Que peut-on attraper sans jamais le garder ?', answer: 'Le temps.' },
];
