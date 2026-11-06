#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère src/utils/encyclopediaPack.ts — articles d'encyclopédie supplémentaires.

Contenu ORIGINAL rédigé pour Master Soutien Pédagogique, organisé selon les
domaines déjà utilisés par l'application. Chaque article comporte une
explication simple, un développement, des exemples et des mots-clés.
"""
import io, os

# domaine -> [(terme, simple, details, [exemples], [mots-clés])]
DOMAINS = {}

DOMAINS["geographie"] = [
 ("Bénin","Le Bénin est un pays d'Afrique de l'Ouest ouvert sur l'océan Atlantique.","Le Bénin s'étend du littoral atlantique au sud jusqu'au fleuve Niger au nord. Sa capitale officielle est Porto-Novo, tandis que Cotonou concentre l'activité économique. Le pays compte douze départements et partage ses frontières avec le Togo, le Burkina Faso, le Niger et le Nigeria.",["Porto-Novo, capitale officielle","Cotonou, capitale économique"],["pays","Afrique de l'Ouest"]),
 ("Cotonou","Cotonou est la plus grande ville et le poumon économique du Bénin.","Située sur le cordon littoral entre le lac Nokoué et l'océan, Cotonou abrite le port autonome, l'aéroport international et le marché Dantokpa, l'un des plus grands d'Afrique de l'Ouest. La ville concentre administrations, commerces et industries.",["port autonome de Cotonou","marché Dantokpa"],["ville","économie"]),
 ("Porto-Novo","Porto-Novo est la capitale officielle du Bénin.","Ancienne capitale du royaume de Hogbonou, la ville conserve une architecture afro-brésilienne remarquable. Elle accueille l'Assemblée nationale et plusieurs musées. Son nom portugais rappelle les échanges anciens avec l'Europe.",["Assemblée nationale","architecture afro-brésilienne"],["capitale","histoire"]),
 ("Fleuve Niger","Le Niger est le troisième plus long fleuve d'Afrique.","Long d'environ 4 200 km, il traverse la Guinée, le Mali, le Niger et le Nigeria, et forme la frontière nord-est du Bénin. Ses crues saisonnières permettent l'agriculture et la pêche dans les régions riveraines.",["frontière nord du Bénin","crues saisonnières"],["fleuve","hydrographie"]),
 ("Fleuve Ouémé","L'Ouémé est le plus long fleuve entièrement béninois.","Il parcourt près de 510 km du massif de l'Atacora jusqu'au lac Nokoué. Sa vallée très fertile permet les cultures de décrue, et ses crues rythment la vie des villages riverains.",["vallée de l'Ouémé","cultures de décrue"],["fleuve","agriculture"]),
 ("Lac Nokoué","Le lac Nokoué est la plus grande étendue lacustre du Bénin.","D'une superficie d'environ 150 km², il abrite des villages lacustres construits sur pilotis, dont Ganvié. La pêche y est pratiquée avec des acadjas, parcs à poissons faits de branchages.",["Ganvié, village lacustre","pêche aux acadjas"],["lac","pêche"]),
 ("Ganvié","Ganvié est un village lacustre bâti sur pilotis sur le lac Nokoué.","Fondé au XVIIIᵉ siècle par le peuple Tofinu qui fuyait les razzias, le village se déplace uniquement en pirogue. On l'appelle parfois la « Venise de l'Afrique ». Il vit principalement de la pêche et du tourisme.",["habitations sur pilotis","déplacements en pirogue"],["village","tourisme"]),
 ("Chaîne de l'Atacora","L'Atacora est le principal massif montagneux du Bénin.","Situé au nord-ouest, ce massif culmine autour de 650 mètres au mont Sokbaro. Il donne naissance à plusieurs cours d'eau et abrite le pays Somba, connu pour ses habitations fortifiées appelées tata somba.",["mont Sokbaro","tata somba"],["relief","montagne"]),
 ("Parc de la Pendjari","La Pendjari est un parc national réputé pour sa faune sauvage.","Situé au nord-ouest du Bénin, ce parc classé réserve de biosphère abrite éléphants, lions, buffles, hippopotames et de nombreux oiseaux. Il constitue l'un des derniers refuges de la faune ouest-africaine.",["éléphants et lions","réserve de biosphère"],["parc","faune"]),
 ("Climat tropical","Le climat tropical alterne saisons sèches et saisons des pluies.","Au sud du Bénin, on distingue deux saisons des pluies et deux saisons sèches ; au nord, une seule grande saison des pluies de mai à octobre. Les températures restent élevées toute l'année, entre 25 et 35 °C.",["saison des pluies","harmattan de décembre à février"],["climat","saisons"]),
 ("Harmattan","L'harmattan est un vent sec venu du Sahara.","Il souffle entre décembre et février, apportant poussière et fraîcheur nocturne. Il assèche l'air, fait craquer la peau et réduit parfois la visibilité. Les agriculteurs y voient le signe de la saison sèche.",["ciel voilé de poussière","air très sec"],["vent","saison sèche"]),
 ("Érosion","L'érosion est l'usure des sols par l'eau et le vent.","La pluie emporte la terre des pentes dénudées, creusant des ravines et appauvrissant les champs. La plantation d'arbres, les cordons pierreux et les cultures en courbes de niveau ralentissent ce phénomène.",["ravines après l'orage","cordons pierreux"],["sol","environnement"]),
 ("Désertification","La désertification est la transformation de terres fertiles en zones arides.","Elle résulte de la sécheresse, de la coupe excessive des arbres et du surpâturage. Le reboisement, les foyers améliorés et la gestion des pâturages permettent de la freiner au Sahel.",["avancée du désert","reboisement"],["environnement","Sahel"]),
 ("Carte géographique","Une carte représente à échelle réduite une portion de territoire.","Elle utilise une légende, une échelle et une orientation. Les cartes physiques montrent le relief, les cartes politiques les frontières, et les cartes thématiques une information précise comme la pluviométrie.",["échelle 1/100 000","rose des vents"],["carte","échelle"]),
 ("Points cardinaux","Les points cardinaux sont le nord, le sud, l'est et l'ouest.","Ils servent à s'orienter. Le soleil se lève à l'est et se couche à l'ouest ; la boussole indique le nord magnétique. Entre eux se placent les points intermédiaires : nord-est, sud-est, sud-ouest, nord-ouest.",["boussole","lever du soleil à l'est"],["orientation","repère"]),
 ("Océan Atlantique","L'Atlantique est le deuxième plus grand océan du monde.","Il borde le Bénin sur environ 125 km de côtes sablonneuses. Le courant marin y provoque une forte érosion côtière, que des épis rocheux tentent de limiter à Cotonou.",["côte de 125 km","érosion côtière"],["océan","littoral"]),
 ("Population du Bénin","La population béninoise est jeune et en forte croissance.","Elle dépasse aujourd'hui 13 millions d'habitants, avec une majorité de moins de 25 ans. Cette jeunesse représente un défi pour l'école et l'emploi, mais aussi un atout pour le développement.",["population jeune","forte croissance"],["démographie","société"]),
 ("Agriculture béninoise","L'agriculture occupe la majorité de la population active du Bénin.","Le coton reste la principale culture d'exportation, tandis que maïs, igname, manioc, riz et niébé assurent l'alimentation. L'ananas et la noix de cajou se développent fortement à l'exportation.",["coton, or blanc","ananas d'Allada"],["agriculture","économie"]),
]

DOMAINS["histoire"] = [
 ("Royaume du Danxomè","Le Danxomè fut un puissant royaume établi sur le plateau d'Abomey.","Fondé au XVIIᵉ siècle, il s'organisa autour d'une monarchie forte, d'une armée renommée comprenant un corps féminin, les Amazones, et d'une administration structurée. Il domina la région jusqu'à la conquête française en 1894.",["palais royaux d'Abomey","Amazones du Danxomè"],["royaume","Abomey"]),
 ("Béhanzin","Béhanzin fut le dernier roi indépendant du Danxomè.","Monté sur le trône en 1889, il résista à la pénétration française avant d'être vaincu et déporté en Martinique puis en Algérie en 1894. Il demeure une figure majeure de la résistance à la colonisation.",["résistance de 1892-1894","déportation en Martinique"],["roi","résistance"]),
 ("Palais royaux d'Abomey","Les palais d'Abomey témoignent de la puissance du Danxomè.","Chaque roi y fit construire son palais, orné de bas-reliefs en terre racontant les hauts faits du règne. L'ensemble est inscrit au patrimoine mondial de l'UNESCO depuis 1985.",["bas-reliefs en terre","patrimoine mondial UNESCO"],["patrimoine","architecture"]),
 ("Traite négrière","La traite négrière fut la déportation forcée de millions d'Africains.","Du XVIᵉ au XIXᵉ siècle, des captifs furent embarqués vers les Amériques depuis des ports comme Ouidah. La Route des esclaves et la Porte du Non-Retour rappellent aujourd'hui cette tragédie.",["port de Ouidah","Porte du Non-Retour"],["esclavage","mémoire"]),
 ("Ouidah","Ouidah fut un grand port négrier et reste un haut lieu spirituel.","La ville conserve le fort portugais, la Route des esclaves longue de quatre kilomètres et la Forêt sacrée de Kpassè. Elle accueille chaque 10 janvier la fête nationale des religions endogènes.",["Route des esclaves","fête du Vodoun"],["histoire","patrimoine"]),
 ("Colonisation française","Le Dahomey devint colonie française à la fin du XIXᵉ siècle.","Après la défaite de Béhanzin en 1894, le territoire fut intégré à l'Afrique-Occidentale française. L'administration coloniale imposa l'impôt, le travail forcé et une école destinée à former des auxiliaires.",["Afrique-Occidentale française","travail forcé"],["colonisation","Dahomey"]),
 ("Indépendance du Bénin","Le Dahomey accède à l'indépendance le 1ᵉʳ août 1960.","Hubert Maga devient le premier président. Le pays connaît ensuite une période d'instabilité politique, puis prend le nom de République populaire du Bénin en 1975 avant de revenir au multipartisme en 1990.",["1ᵉʳ août 1960","Hubert Maga"],["indépendance","République"]),
 ("Conférence nationale de 1990","La Conférence nationale a ouvert la voie à la démocratie béninoise.","Réunie en février 1990, elle mit fin au régime marxiste-léniniste et instaura le multipartisme. Ce modèle de transition pacifique a inspiré plusieurs pays africains.",["février 1990","transition pacifique"],["démocratie","politique"]),
 ("Empire du Mali","L'empire du Mali domina l'Afrique de l'Ouest du XIIIᵉ au XVᵉ siècle.","Fondé par Soundiata Keïta, il prospéra grâce au commerce de l'or et du sel. Son souverain Mansa Moussa rendit célèbre sa richesse lors de son pèlerinage à La Mecque en 1324.",["Soundiata Keïta","Mansa Moussa"],["empire","Afrique"]),
 ("Empire songhaï","Le Songhaï fut le plus vaste empire d'Afrique de l'Ouest.","Avec Gao pour capitale, il atteignit son apogée sous Askia Mohamed au XVIᵉ siècle. Tombouctou et Djenné y furent de grands centres de savoir avant la conquête marocaine de 1591.",["Gao","Tombouctou"],["empire","savoir"]),
 ("Préhistoire","La préhistoire est la très longue période précédant l'écriture.","Elle se divise en paléolithique, où l'homme chasse et taille la pierre, et néolithique, marqué par l'agriculture, l'élevage et la poterie. L'invention de l'écriture marque le passage à l'histoire.",["outils taillés","naissance de l'agriculture"],["préhistoire","paléolithique"]),
 ("Égypte ancienne","L'Égypte antique fut une brillante civilisation du Nil.","Pendant plus de trois millénaires, elle développa l'écriture hiéroglyphique, une architecture monumentale et des connaissances avancées en médecine et en astronomie. Les pyramides de Gizeh en sont le symbole.",["pyramides de Gizeh","hiéroglyphes"],["civilisation","Nil"]),
 ("Seconde Guerre mondiale","La Seconde Guerre mondiale opposa de 1939 à 1945 les Alliés à l'Axe.","Ce conflit mondial fit des dizaines de millions de victimes. Des soldats africains, dont des tirailleurs venus du Dahomey, y participèrent. Il aboutit à la création de l'ONU en 1945.",["1939-1945","création de l'ONU"],["guerre","XXᵉ siècle"]),
 ("Décolonisation","La décolonisation est l'accession des colonies à l'indépendance.","Elle s'accélère après 1945. L'année 1960, dite « année de l'Afrique », voit dix-sept pays africains devenir indépendants, dont le Dahomey, le Niger, le Sénégal et la Côte d'Ivoire.",["année de l'Afrique 1960","dix-sept indépendances"],["indépendance","Afrique"]),
]

DOMAINS["sciences"] = [
 ("Photosynthèse","La photosynthèse permet aux plantes de fabriquer leur nourriture.","Grâce à la chlorophylle de ses feuilles, la plante utilise la lumière du soleil pour transformer l'eau et le dioxyde de carbone en sucres, en rejetant de l'oxygène. C'est la base de presque toutes les chaînes alimentaires.",["feuilles vertes au soleil","production d'oxygène"],["plante","biologie"]),
 ("Cycle de l'eau","Le cycle de l'eau décrit le trajet permanent de l'eau sur Terre.","L'eau s'évapore des océans, forme des nuages par condensation, retombe en pluie, ruisselle vers les rivières puis retourne à la mer. Ce cycle se répète sans fin grâce à l'énergie solaire.",["évaporation","condensation et pluie"],["eau","climat"]),
 ("États de la matière","La matière existe sous trois états : solide, liquide et gazeux.","L'eau illustre ces trois états : glace, eau liquide et vapeur. Le passage de l'un à l'autre dépend de la température : fusion, solidification, évaporation et condensation.",["glace, eau, vapeur","fusion et évaporation"],["matière","physique"]),
 ("Digestion","La digestion transforme les aliments en nutriments assimilables.","Les aliments sont broyés dans la bouche, attaqués par les sucs de l'estomac, puis absorbés par l'intestin grêle. Les déchets sont évacués par le gros intestin.",["mastication","absorption intestinale"],["corps","biologie"]),
 ("Respiration","La respiration apporte l'oxygène nécessaire à l'organisme.","L'air inspiré gagne les poumons, où l'oxygène passe dans le sang tandis que le dioxyde de carbone en est évacué. Le sang distribue ensuite l'oxygène à toutes les cellules.",["inspiration et expiration","échanges dans les alvéoles"],["poumons","corps"]),
 ("Circulation sanguine","Le sang circule en boucle grâce au cœur.","Le cœur, muscle creux à quatre cavités, propulse le sang dans les artères jusqu'aux organes ; les veines le ramènent. Ce circuit transporte oxygène, nutriments et déchets.",["artères et veines","battements du cœur"],["cœur","sang"]),
 ("Chaîne alimentaire","La chaîne alimentaire relie les êtres vivants par ce qu'ils mangent.","Elle part des plantes, productrices, passe par les herbivores puis les carnivores, et se termine par les décomposeurs qui recyclent la matière. Rompre un maillon déséquilibre tout le milieu.",["herbe → antilope → lion","rôle des décomposeurs"],["écologie","nature"]),
 ("Écosystème","Un écosystème réunit un milieu et les êtres vivants qui y vivent.","Forêt, lagune, savane ou mare forment des écosystèmes où chaque espèce joue un rôle. L'équilibre dépend du climat, du sol et des relations entre espèces.",["mangrove","savane arborée"],["environnement","biodiversité"]),
 ("Énergie solaire","L'énergie solaire provient du rayonnement du Soleil.","Les panneaux photovoltaïques la convertissent en électricité, utile dans les zones non raccordées au réseau. Elle est renouvelable, propre et particulièrement abondante en Afrique de l'Ouest.",["panneaux solaires","lampes solaires"],["énergie","renouvelable"]),
 ("Électricité","L'électricité est un déplacement de charges dans un conducteur.","Elle circule dans un circuit fermé comprenant un générateur, des fils et un récepteur. On mesure la tension en volts et l'intensité en ampères. La prudence est indispensable face aux fils dénudés.",["circuit fermé","volts et ampères"],["physique","énergie"]),
 ("Aimant","Un aimant attire les objets contenant du fer.","Il possède un pôle nord et un pôle sud : les pôles identiques se repoussent, les pôles opposés s'attirent. La boussole exploite le champ magnétique terrestre pour indiquer le nord.",["boussole","pôles nord et sud"],["magnétisme","physique"]),
 ("Gravité","La gravité attire les corps vers le centre de la Terre.","Elle explique la chute des objets et maintient la Lune en orbite. Son intensité dépend de la masse des corps et de la distance qui les sépare. Isaac Newton en formula la loi en 1687.",["chute d'une pierre","orbite de la Lune"],["physique","Newton"]),
 ("Système solaire","Le système solaire réunit le Soleil et les corps qui gravitent autour.","Il compte huit planètes : Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune, ainsi que des satellites, astéroïdes et comètes. La Terre est la troisième planète.",["huit planètes","la Terre, 3ᵉ planète"],["astronomie","espace"]),
 ("Volcan","Un volcan est une ouverture par laquelle remonte le magma.","Lors d'une éruption, laves, cendres et gaz sont projetés. En refroidissant, la lave forme des roches volcaniques. Les sols volcaniques sont souvent très fertiles.",["éruption","roche volcanique"],["géologie","Terre"]),
 ("Séisme","Un séisme est une secousse du sol provoquée par la rupture de roches.","Il naît en profondeur, au foyer, et se propage en ondes jusqu'à la surface. Son intensité se mesure sur l'échelle de Richter. Les constructions parasismiques limitent les dégâts.",["échelle de Richter","ondes sismiques"],["Terre","géologie"]),
 ("Fraction","Une fraction exprime une ou plusieurs parts égales d'un tout.","Elle s'écrit avec un numérateur et un dénominateur : dans 3/4, le tout est partagé en quatre parts et l'on en prend trois. Les fractions permettent de mesurer et de partager précisément.",["3/4 d'un gâteau","1/2 = une moitié"],["mathématiques","nombre"]),
 ("Périmètre","Le périmètre est la longueur du contour d'une figure.","Pour un rectangle, il vaut deux fois la somme de la longueur et de la largeur ; pour un carré, quatre fois le côté. Il se mesure en unités de longueur comme le mètre.",["P = 2 × (L + l)","clôture d'un champ"],["mathématiques","mesure"]),
 ("Aire","L'aire mesure la surface occupée par une figure.","Celle d'un rectangle est le produit de la longueur par la largeur, celle d'un carré le côté au carré. Elle s'exprime en unités carrées : cm², m² ou hectares pour les terrains.",["A = L × l","surface d'un champ en hectares"],["mathématiques","surface"]),
 ("Nombre premier","Un nombre premier n'est divisible que par 1 et par lui-même.","Les premiers sont 2, 3, 5, 7, 11, 13… Le nombre 2 est le seul premier pair. Tout entier se décompose de façon unique en produit de facteurs premiers.",["2, 3, 5, 7, 11","décomposition en facteurs"],["mathématiques","arithmétique"]),
 ("Paludisme","Le paludisme est une maladie parasitaire transmise par un moustique.","Le parasite Plasmodium est inoculé par la piqûre de l'anophèle femelle. Il provoque fièvre, frissons et fatigue intense. La moustiquaire imprégnée et l'assainissement des eaux stagnantes sont les meilleures préventions.",["anophèle femelle","moustiquaire imprégnée"],["santé","prévention"]),
 ("Vaccination","La vaccination prépare le corps à se défendre contre une maladie.","Le vaccin présente à l'organisme une forme inoffensive du microbe ; le système immunitaire fabrique alors des défenses durables. Elle a permis d'éradiquer la variole et de faire reculer la poliomyélite.",["carnet de vaccination","éradication de la variole"],["santé","immunité"]),
 ("Microbe","Les microbes sont des êtres vivants invisibles à l'œil nu.","Bactéries, virus et champignons microscopiques : certains sont utiles, comme ceux de la fermentation, d'autres provoquent des maladies. Le lavage des mains au savon reste la meilleure barrière.",["bactéries et virus","lavage des mains"],["hygiène","santé"]),
 ("Nutrition","Une bonne nutrition apporte au corps tout ce dont il a besoin.","Un repas équilibré associe des aliments énergétiques (igname, riz), bâtisseurs (poisson, haricot, œuf) et protecteurs (fruits et légumes). La carence en protéines freine la croissance de l'enfant.",["repas équilibré","aliments bâtisseurs"],["santé","alimentation"]),
]

DOMAINS["hightech"] = [
 ("Ordinateur","L'ordinateur est une machine qui traite automatiquement l'information.","Il se compose d'un matériel (processeur, mémoire, disque, écran) et de logiciels. Il reçoit des données en entrée, les traite puis restitue un résultat.",["unité centrale","clavier et écran"],["informatique","matériel"]),
 ("Internet","Internet est le réseau mondial qui relie les ordinateurs entre eux.","Il permet d'échanger des messages, de consulter des sites et de partager des fichiers. Au Bénin, l'accès se fait surtout par la téléphonie mobile.",["sites web","messagerie"],["réseau","communication"]),
 ("Logiciel","Un logiciel est un ensemble d'instructions qui fait fonctionner un appareil.","On distingue le système d'exploitation, qui gère la machine, et les applications, qui répondent à un besoin précis : traitement de texte, tableur ou application scolaire.",["système d'exploitation","application mobile"],["informatique","programme"]),
 ("Mémoire informatique","La mémoire conserve les données d'un appareil.","La mémoire vive travaille temporairement et s'efface à l'extinction ; la mémoire de stockage, disque ou carte, conserve durablement les fichiers. Les capacités se mesurent en octets, kilo-octets, méga-octets et giga-octets.",["mémoire vive","carte mémoire"],["informatique","stockage"]),
 ("Application mobile","Une application mobile est un logiciel installé sur un téléphone.","Elle peut fonctionner hors connexion si ses données sont enregistrées localement. C'est le cas de Master Soutien Pédagogique, utilisable sans réseau.",["application scolaire","fonctionnement hors-ligne"],["mobile","logiciel"]),
 ("Énergie renouvelable","Les énergies renouvelables se reconstituent naturellement.","Le soleil, le vent, l'eau et la biomasse produisent une énergie propre, contrairement aux énergies fossiles. Le solaire est particulièrement adapté au climat béninois.",["solaire","éolien"],["énergie","environnement"]),
 ("Robot","Un robot est une machine programmée pour accomplir des tâches.","Il exécute des instructions grâce à des capteurs et des moteurs. Les robots industriels assemblent des pièces, d'autres explorent des lieux dangereux ou assistent les chirurgiens.",["robot industriel","robot explorateur"],["technologie","automatisation"]),
 ("Intelligence artificielle","L'intelligence artificielle permet à une machine d'imiter certaines capacités humaines.","Elle apprend à partir de nombreux exemples pour reconnaître des images, traduire des textes ou proposer des réponses. Elle reste un outil : elle ne remplace ni le jugement ni la responsabilité de l'enseignant.",["reconnaissance d'images","traduction automatique"],["informatique","IA"]),
 ("Téléphone mobile","Le téléphone mobile communique grâce aux ondes radio.","Il se connecte aux antennes-relais du réseau. Les smartphones ajoutent appareil photo, internet et applications. Au Bénin, le mobile money y a fortement développé les paiements.",["antenne-relais","mobile money"],["communication","réseau"]),
 ("Sauvegarde","La sauvegarde est une copie de sécurité des données.","Elle protège contre la panne, la perte ou le vol d'un appareil. La bonne pratique consiste à conserver plusieurs copies, sur des supports différents.",["copie sur clé USB","sauvegarde régulière"],["données","sécurité"]),
]

DOMAINS["psychologie"] = [
 ("Mémoire","La mémoire permet d'enregistrer, de conserver et de rappeler des informations.","On distingue la mémoire à court terme, limitée, et la mémoire à long terme. La répétition espacée et le sommeil consolident durablement les apprentissages.",["réviser plusieurs fois","dormir après avoir appris"],["apprentissage","cerveau"]),
 ("Attention","L'attention est la capacité à se concentrer sur une tâche.","Elle diminue avec la fatigue et le bruit. Alterner des séquences courtes et des pauses, et supprimer les distractions, améliore nettement le travail scolaire.",["éviter le bruit","pauses régulières"],["concentration","école"]),
 ("Motivation","La motivation est ce qui pousse à agir et à persévérer.","Elle est intrinsèque lorsqu'elle vient du plaisir d'apprendre, extrinsèque lorsqu'elle dépend d'une récompense. Des objectifs clairs et des encouragements la renforcent durablement.",["plaisir d'apprendre","objectifs atteignables"],["apprentissage","élève"]),
 ("Estime de soi","L'estime de soi est la valeur qu'une personne s'accorde.","Elle se construit par les réussites et le regard bienveillant des adultes. Un enfant qui se sent capable ose se tromper, donc progresse plus vite.",["encourager l'effort","valoriser les progrès"],["éducation","confiance"]),
 ("Stress","Le stress est la réaction du corps face à une situation exigeante.","Modéré, il stimule ; excessif, il perturbe le sommeil et la concentration. La respiration lente, l'organisation du travail et le sport en réduisent les effets.",["trac avant l'examen","respiration lente"],["santé","émotion"]),
 ("Socialisation","La socialisation est l'apprentissage des règles de la vie en groupe.","Elle se fait dans la famille, à l'école et dans le quartier. L'enfant y acquiert le langage, la politesse, le respect des autres et le sens des responsabilités.",["vie de classe","jeux collectifs"],["société","éducation"]),
 ("Développement de l'enfant","Le développement de l'enfant suit des étapes régulières.","Motricité, langage, raisonnement et vie affective progressent ensemble, à un rythme propre à chacun. Connaître ces étapes aide l'enseignant à adapter ses exigences.",["marche vers un an","langage à deux ans"],["enfance","pédagogie"]),
 ("Intelligence","L'intelligence est la capacité à comprendre et à résoudre des problèmes.","Elle prend des formes variées : logique, langagière, corporelle, artistique ou relationnelle. Un élève en difficulté dans une matière peut exceller dans une autre.",["intelligences multiples","résolution de problèmes"],["psychologie","école"]),
]

DOMAINS["droit"] = [
 ("Constitution","La Constitution est la loi fondamentale d'un État.","Elle organise les pouvoirs et garantit les droits des citoyens. La Constitution béninoise du 11 décembre 1990 institue un régime présidentiel et une Cour constitutionnelle.",["Constitution de 1990","Cour constitutionnelle"],["loi","État"]),
 ("Droits de l'enfant","Les droits de l'enfant protègent les moins de dix-huit ans.","La Convention internationale de 1989 garantit le droit à un nom, à la santé, à l'éducation, à la protection contre les violences et le travail dangereux, ainsi qu'au jeu.",["droit à l'éducation","protection contre les violences"],["enfance","protection"]),
 ("État civil","L'état civil enregistre les événements majeurs de la vie.","Naissances, mariages et décès y sont déclarés. L'acte de naissance est indispensable pour être inscrit à l'école et passer les examens ; sa déclaration doit être rapide.",["acte de naissance","déclaration à la mairie"],["administration","citoyen"]),
 ("Citoyenneté","La citoyenneté associe des droits et des devoirs.","Le citoyen vote, s'exprime et bénéficie de la protection de la loi ; en retour, il respecte les règles, paie ses impôts et participe à la vie collective.",["droit de vote","respect de la loi"],["civisme","société"]),
 ("Justice","La justice tranche les litiges en appliquant la loi.","Les tribunaux jugent les affaires civiles et pénales. Toute personne est présumée innocente jusqu'à preuve du contraire et a droit à être défendue.",["présomption d'innocence","droit à la défense"],["tribunal","loi"]),
 ("Séparation des pouvoirs","La séparation des pouvoirs évite la concentration de l'autorité.","Le pouvoir exécutif applique les lois, le législatif les vote et le judiciaire les fait respecter. Cet équilibre protège les libertés des citoyens.",["exécutif, législatif, judiciaire","équilibre des pouvoirs"],["démocratie","État"]),
 ("Élection","Une élection permet de choisir ses représentants par le vote.","Le suffrage universel donne une voix à chaque citoyen majeur. Le vote est secret, ce qui garantit la liberté de choix.",["suffrage universel","vote secret"],["démocratie","citoyen"]),
]

DOMAINS["litterature"] = [
 ("Conte","Le conte est un récit court transmis le plus souvent oralement.","Il met en scène des personnages simples et se termine par une leçon de vie. En Afrique, le conte se dit le soir et fait appel à la participation de l'auditoire.",["conte de l'araignée","morale finale"],["récit","oralité"]),
 ("Proverbe","Le proverbe est une formule brève porteuse de sagesse populaire.","Il condense une expérience collective en une image frappante et sert d'argument dans la discussion. La parole proverbiale est très valorisée en Afrique de l'Ouest.",["« La patience vient à bout de tout »","sagesse populaire"],["oralité","sagesse"]),
 ("Poésie","La poésie est un art du langage fondé sur les sons et les images.","Elle joue sur le rythme, les rimes et les figures de style pour émouvoir. Le poème peut être régulier, en vers comptés, ou libre.",["rimes","vers libres"],["littérature","art"]),
 ("Roman","Le roman est un long récit de fiction en prose.","Il développe des personnages et une intrigue sur la durée. Le roman africain francophone, avec des auteurs comme Olympe Bhêly-Quenum, explore l'histoire et les sociétés du continent.",["intrigue longue","personnages développés"],["littérature","fiction"]),
 ("Théâtre","Le théâtre est un texte destiné à être joué devant un public.","Il s'écrit en dialogues accompagnés de didascalies. Comédie et tragédie en sont les deux grands genres traditionnels.",["dialogues","didascalies"],["littérature","scène"]),
 ("Fable","La fable est un court récit, souvent animalier, porteur d'une morale.","Les animaux y représentent des comportements humains. Jean de La Fontaine en a fixé la forme classique en français.",["Le Corbeau et le Renard","morale explicite"],["littérature","morale"]),
 ("Griot","Le griot est le dépositaire de la mémoire et de la parole.","Musicien, généalogiste et conteur, il conserve l'histoire des familles et des royaumes et l'transmet oralement lors des cérémonies.",["récits généalogiques","musique et parole"],["tradition","oralité"]),
 ("Résumé","Le résumé restitue l'essentiel d'un texte en le raccourcissant.","Il conserve les idées principales et l'ordre du texte, en supprimant exemples et répétitions, sans ajouter d'opinion personnelle.",["idées principales","texte raccourci"],["méthode","école"]),
]

DOMAINS["religions"] = [
 ("Vodoun","Le Vodoun est une religion traditionnelle très présente au Bénin.","Il reconnaît un créateur suprême et de nombreuses divinités liées aux forces de la nature et aux ancêtres. La fête nationale des religions endogènes est célébrée le 10 janvier.",["fête du 10 janvier","divinités de la nature"],["religion","tradition"]),
 ("Christianisme","Le christianisme est fondé sur l'enseignement de Jésus-Christ.","Il repose sur la Bible et se partage principalement entre catholicisme, protestantisme et orthodoxie. Il est largement pratiqué dans le sud du Bénin.",["Bible","Noël et Pâques"],["religion","monde"]),
 ("Islam","L'islam est fondé sur le Coran et l'enseignement du prophète Mahomet.","Ses cinq piliers sont la profession de foi, la prière, l'aumône, le jeûne du ramadan et le pèlerinage. Il est très présent dans le nord du Bénin.",["cinq piliers","ramadan"],["religion","monde"]),
 ("Tolérance religieuse","La tolérance religieuse permet à chacun de croire librement.","Elle suppose le respect mutuel des convictions. Le Bénin est souvent cité en exemple pour la coexistence pacifique de ses religions.",["liberté de culte","respect mutuel"],["société","paix"]),
 ("Philosophie","La philosophie est la recherche raisonnée de la vérité et du sens.","Elle interroge la justice, la liberté, la connaissance et le bonheur par l'argumentation. Les sagesses africaines, transmises par proverbes et récits, en constituent une forme propre.",["questionner","argumenter"],["pensée","savoir"]),
 ("Morale","La morale distingue ce qui est bien de ce qui est mal.","Elle guide la conduite à travers des valeurs comme l'honnêteté, le respect et la solidarité, transmises par la famille, l'école et la société.",["honnêteté","respect d'autrui"],["valeurs","éducation"]),
]

DOMAINS["sport"] = [
 ("Football","Le football oppose deux équipes de onze joueurs.","Le but est de faire entrer le ballon dans les cages adverses sans utiliser les mains, sauf pour le gardien. Une rencontre dure quatre-vingt-dix minutes en deux périodes.",["onze joueurs","90 minutes"],["sport","équipe"]),
 ("Athlétisme","L'athlétisme regroupe les épreuves de course, de saut et de lancer.","Il constitue la base de l'éducation physique : sprint, demi-fond, saut en longueur, saut en hauteur et lancer du poids développent toutes les qualités physiques.",["sprint 100 m","saut en longueur"],["sport","EPS"]),
 ("Jeux olympiques","Les Jeux olympiques réunissent les athlètes du monde entier tous les quatre ans.","Nés dans la Grèce antique et rénovés en 1896, ils promeuvent le dépassement de soi et la paix entre les nations.",["tous les quatre ans","anneaux olympiques"],["sport","monde"]),
 ("Échauffement","L'échauffement prépare le corps à l'effort.","Il élève progressivement la température des muscles et la fréquence cardiaque, ce qui améliore la performance et réduit nettement le risque de blessure.",["course lente","étirements doux"],["EPS","santé"]),
 ("Fair-play","Le fair-play est le respect des règles et de l'adversaire.","Il consiste à accepter la défaite, à ne pas tricher et à saluer ses adversaires. C'est une valeur éducative majeure du sport scolaire.",["saluer l'adversaire","accepter la défaite"],["valeurs","sport"]),
 ("Lutte traditionnelle","La lutte traditionnelle est un sport de combat très populaire en Afrique.","Deux adversaires cherchent à faire tomber l'autre au sol, sans coups portés. Les compétitions accompagnent souvent les fêtes de village.",["fêtes de village","combat au sol"],["tradition","sport"]),
]

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def main():
    out = io.StringIO()
    out.write("""/**
 * ENCYCLOPÉDIE — articles supplémentaires (v36).
 *
 * Contenu ORIGINAL rédigé pour Master Soutien Pédagogique, organisé selon les
 * domaines déjà utilisés par l'application (géographie, histoire, sciences,
 * technologie, sciences sociales, droit, arts & littérature,
 * philosophie & religion, sport). Les articles privilégient l'exactitude et
 * les repères utiles aux élèves et aux enseignants du Bénin.
 *
 * Fichier GÉNÉRÉ par tools/genEncyclopedia.py.
 */
import { EncEntry } from './encyclopediaData';

const e = (term: string, simple: string, details: string, examples: string[], keywords: string[] = []): EncEntry =>
  ({ term, simple, details, examples, keywords });

export const ENCYCLOPEDIA_PACK: Record<string, EncEntry[]> = {
""")
    total = 0
    for domain, entries in DOMAINS.items():
        out.write("  %s: [\n" % domain)
        for term, simple, details, examples, kw in entries:
            ex = ", ".join("'%s'" % esc(x) for x in examples)
            kws = ", ".join("'%s'" % esc(x) for x in kw)
            out.write("    e('%s', '%s', '%s', [%s], [%s]),\n" % (
                esc(term), esc(simple), esc(details), ex, kws))
            total += 1
        out.write("  ],\n")
    out.write("};\n\nexport const ENCYCLOPEDIA_PACK_COUNT = %d;\n" % total)

    path = os.path.join(os.path.dirname(__file__), "..", "src", "utils", "encyclopediaPack.ts")
    with open(os.path.abspath(path), "w", encoding="utf-8") as f:
        f.write(out.getvalue())
    print("articles écrits :", total)

if __name__ == "__main__":
    main()
