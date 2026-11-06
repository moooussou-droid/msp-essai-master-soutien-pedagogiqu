# -*- coding: utf-8 -*-
"""Génère src/utils/lifeEducationData.ts : 150 fiches d'Éducation à la vie
(50 environnementales, 50 financières, 50 entrepreneuriales) adaptées au
contexte béninois et ouest-africain, pour écoliers et élèves."""
import json, io

def F(titre, niveau, objectif, contenu, exemple, activite, retenir, mots):
    return dict(title=titre, level=niveau, objective=objectif, content=contenu,
                example=exemple, activity=activite, keyPoint=retenir, keywords=mots)

ENV = [
 F("Pourquoi l'eau est précieuse","Primaire","Comprendre que l'eau potable est une ressource limitée.",
   "L'eau couvre une grande partie de la Terre, mais l'eau que l'on peut boire est très rare. Elle vient des forages, des puits protégés et des réseaux traités. Une eau sale transmet des maladies comme le choléra et la diarrhée. Économiser l'eau, c'est fermer le robinet pendant qu'on se savonne, réparer les fuites et couvrir les récipients de stockage.",
   "À Cotonou, une famille qui laisse couler le robinet pendant le brossage des dents gaspille plusieurs litres chaque matin.",
   "Pendant une semaine, chaque élève note le nombre de seaux d'eau utilisés à la maison, puis la classe compare et propose des économies.",
   "L'eau potable est rare : chaque goutte économisée compte.", ["eau","ressource","santé"]),
 F("Le cycle de l'eau","Primaire","Décrire les étapes du cycle de l'eau.",
   "Le soleil chauffe l'eau des océans, des fleuves et des lacs : elle s'évapore et monte sous forme de vapeur. En altitude, la vapeur se refroidit et forme les nuages : c'est la condensation. Les gouttes deviennent lourdes et tombent en pluie. L'eau ruisselle, alimente les rivières, s'infiltre dans le sol et rejoint la nappe souterraine, puis le cycle recommence.",
   "Le fleuve Niger et le lac Nokoué reçoivent chaque saison des pluies l'eau évaporée puis retombée.",
   "Réaliser l'expérience du sachet : un peu d'eau dans un sac transparent fermé, posé au soleil ; observer les gouttelettes.",
   "L'eau circule sans fin : évaporation, condensation, précipitation, infiltration.", ["eau","climat","cycle"]),
 F("Trier les déchets à l'école","Primaire","Savoir séparer les déchets selon leur nature.",
   "Tous les déchets ne se ressemblent pas. Les déchets organiques (épluchures, restes de repas) se décomposent et donnent du compost. Le plastique, le verre et le métal ne se décomposent pas avant très longtemps : il faut les collecter pour les recycler. Les piles et les médicaments sont dangereux et exigent une collecte spéciale.",
   "Une bouteille en plastique jetée dans la cour peut rester plus de 400 ans dans la nature.",
   "Installer trois bacs de couleurs différentes dans la classe et tenir un tableau hebdomadaire des quantités triées.",
   "Trier, c'est transformer un déchet en ressource.", ["déchets","tri","recyclage"]),
 F("Le danger des sachets plastiques","Primaire","Mesurer l'impact des sachets plastiques.",
   "Les sachets plastiques bouchent les caniveaux et provoquent des inondations pendant la saison des pluies. Les animaux les avalent et meurent. Brûlés, ils dégagent des fumées toxiques. Des solutions existent : le panier tressé, le sac en tissu réutilisable, les feuilles végétales pour emballer.",
   "Après une forte pluie à Cotonou, les caniveaux bouchés par les sachets débordent et l'eau entre dans les maisons.",
   "Fabriquer un sac en tissu à partir de chutes de pagne et l'utiliser pour le marché pendant un mois.",
   "Un sachet utilisé cinq minutes pollue pendant des siècles.", ["plastique","pollution","inondation"]),
 F("Planter et entretenir un arbre","Primaire","Réussir la plantation d'un arbre.",
   "Un arbre donne de l'ombre, purifie l'air, retient le sol et nourrit par ses fruits. Pour planter : choisir une espèce adaptée, creuser un trou large, mélanger la terre avec du compost, placer le plant sans enterrer le collet, arroser abondamment, puis protéger le jeune plant des animaux avec une petite barrière.",
   "Les manguiers et les neems plantés dans les cours d'école offrent de l'ombre pour la récréation.",
   "Chaque élève parraine un plant, l'arrose et mesure sa croissance chaque mois dans un carnet.",
   "Planter est facile ; entretenir pendant deux ans fait la vraie différence.", ["arbre","reboisement","sol"]),
 F("La déforestation et ses conséquences","Secondaire","Analyser les causes et effets de la déforestation.",
   "La forêt recule à cause de l'agriculture sur brûlis, de la coupe pour le bois de chauffe et le charbon, et de l'urbanisation. Les conséquences sont l'érosion des sols, la baisse des pluies, la disparition d'espèces et l'appauvrissement des paysans. Les réponses sont le reboisement, les foyers améliorés qui consomment moins de bois, et l'agroforesterie.",
   "Le couvert forestier du Bénin a fortement diminué en quelques décennies sous la pression du bois-énergie.",
   "Enquêter auprès de cinq ménages sur leur mode de cuisson et calculer la consommation de charbon par semaine.",
   "Sans forêt, le sol part avec la pluie et les récoltes baissent.", ["forêt","érosion","agroforesterie"]),
 F("Le réchauffement climatique expliqué simplement","Secondaire","Expliquer l'effet de serre et ses effets.",
   "Certains gaz, comme le dioxyde de carbone et le méthane, retiennent la chaleur du soleil près de la Terre : c'est l'effet de serre, naturel et nécessaire. Mais en brûlant du pétrole, du charbon et du bois, l'homme en produit trop : la température monte. Résultats : saisons déréglées, pluies violentes, sécheresses, montée du niveau de la mer.",
   "L'érosion côtière menace des quartiers entiers entre Cotonou et Grand-Popo.",
   "Relever la température de midi pendant un mois et comparer avec les moyennes anciennes trouvées auprès des anciens du village.",
   "Moins brûler de combustibles, c'est ralentir le réchauffement.", ["climat","effet de serre","CO2"]),
 F("L'érosion côtière au Bénin","Secondaire","Comprendre le recul du littoral.",
   "Les vagues transportent le sable le long de la côte. Les constructions, les ports et l'extraction du sable perturbent ce transport : la mer reprend alors le terrain. Des maisons et des routes disparaissent. Les protections sont les épis rocheux, le rechargement en sable et la végétalisation des dunes avec des cocotiers et des filaos.",
   "Plusieurs villages de pêcheurs de la côte béninoise ont dû être déplacés à cause de l'avancée de la mer.",
   "Observer une photo ancienne du littoral et la comparer à une photo actuelle, puis décrire les changements.",
   "Prélever du sable sur la plage accélère la disparition du rivage.", ["côte","érosion","mer"]),
 F("Protéger la biodiversité","Secondaire","Identifier les menaces sur les espèces.",
   "La biodiversité, c'est la variété des êtres vivants. Elle est menacée par la destruction des habitats, le braconnage, la pollution et les espèces envahissantes. Or chaque espèce a un rôle : les abeilles pollinisent, les vautours nettoient, les mangroves abritent les poissons. Les aires protégées comme la Pendjari conservent ce patrimoine.",
   "Le parc national de la Pendjari abrite éléphants, lions et buffles, et fait vivre le tourisme local.",
   "Recenser les oiseaux visibles dans la cour pendant une semaine et construire un tableau des espèces.",
   "Protéger une espèce, c'est protéger tout un équilibre.", ["biodiversité","faune","parc"]),
 F("Les mangroves, boucliers naturels","Secondaire","Expliquer le rôle des mangroves.",
   "La mangrove est une forêt de palétuviers qui pousse dans l'eau saumâtre. Ses racines freinent les vagues, retiennent la vase et servent de nurserie aux poissons et aux crabes. Elle stocke beaucoup de carbone. Elle est détruite par la coupe pour le bois et par le sel. La replanter restaure la pêche.",
   "Autour du lac Nokoué et de la lagune de Ouidah, la mangrove protège les villages lacustres.",
   "Visiter ou décrire une zone de mangrove et lister les animaux qui y vivent.",
   "Une mangrove vivante, c'est plus de poissons et moins d'inondations.", ["mangrove","littoral","pêche"]),
 F("Composter les déchets de cuisine","Primaire","Fabriquer du compost.",
   "Le compost est un engrais naturel obtenu en laissant pourrir les matières organiques. On alterne les matières vertes (épluchures, herbe) et brunes (feuilles mortes, paille), on arrose légèrement et on retourne le tas chaque semaine. Après deux à trois mois, on obtient une terre noire qui nourrit les plantes sans rien acheter.",
   "Un jardin scolaire fertilisé au compost produit des légumes sans engrais chimique.",
   "Créer un bac à compost dans un coin de la cour et y verser les épluchures de la cantine.",
   "Le déchet de cuisine d'aujourd'hui est l'engrais de demain.", ["compost","sol","engrais"]),
 F("L'énergie solaire à la maison","Secondaire","Décrire le fonctionnement du solaire.",
   "Un panneau photovoltaïque transforme la lumière du soleil en électricité. Un régulateur protège la batterie qui stocke l'énergie pour la nuit. Un onduleur permet d'alimenter les appareils courants. Le solaire convient bien à l'Afrique de l'Ouest grâce au fort ensoleillement, et évite les coupures.",
   "Des lampadaires solaires éclairent désormais plusieurs carrefours de villes béninoises.",
   "Calculer combien de lampes de 10 watts un petit panneau de 100 watts peut alimenter pendant 4 heures.",
   "Le soleil est gratuit : seule l'installation se paie.", ["énergie","solaire","électricité"]),
 F("Économiser l'électricité","Primaire","Adopter des gestes d'économie.",
   "L'électricité coûte cher et sa production pollue souvent. On économise en éteignant les lampes des pièces vides, en débranchant les chargeurs, en utilisant des ampoules LED, en profitant de la lumière du jour et en dégivrant régulièrement le réfrigérateur.",
   "Remplacer une ampoule à incandescence par une LED divise la consommation par cinq environ.",
   "Nommer chaque semaine un responsable de l'extinction des lampes de la classe.",
   "L'énergie la moins chère est celle qu'on ne consomme pas.", ["électricité","économie","LED"]),
 F("La pollution de l'air en ville","Secondaire","Identifier sources et effets.",
   "L'air des villes est pollué par les gaz d'échappement des motos et voitures, la fumée des ordures brûlées et la poussière. Cela provoque toux, asthme et maladies du cœur. Les remèdes sont l'entretien des moteurs, les carburants propres, les arbres d'alignement et l'interdiction de brûler les ordures.",
   "Aux heures de pointe, la fumée des taxis-motos rend l'air irrespirable sur les grands carrefours.",
   "Observer pendant dix minutes un carrefour et compter les véhicules qui dégagent une fumée noire.",
   "Un moteur bien entretenu pollue beaucoup moins.", ["air","pollution","santé"]),
 F("L'eau et les maladies","Primaire","Relier eau sale et maladies.",
   "Boire ou se laver avec une eau souillée transmet le choléra, la typhoïde, la diarrhée et les vers intestinaux. Pour se protéger : puiser dans un point d'eau protégé, transporter dans un récipient propre et couvert, filtrer, faire bouillir ou traiter l'eau, et se laver les mains au savon aux moments clés.",
   "Une épidémie de choléra suit souvent les inondations, quand les latrines débordent dans les puits.",
   "Organiser une démonstration de lavage des mains en sept étapes devant toute l'école.",
   "Eau propre et mains propres évitent la plupart des diarrhées.", ["eau","hygiène","maladie"]),
 F("Le sol, une richesse fragile","Secondaire","Comprendre la dégradation des sols.",
   "Le sol fertile se forme très lentement. Il se dégrade par l'érosion due à la pluie sur un sol nu, la culture continue sans repos, le surpâturage et les feux de brousse. On le protège par les cordons pierreux, les haies vives, la jachère, la rotation des cultures et l'apport de matière organique.",
   "Sur les terres de barre du sud Bénin, les ravines emportent la terre arable après chaque grosse pluie.",
   "Comparer deux bouteilles d'eau de ruissellement recueillies sur sol nu et sur sol couvert d'herbe.",
   "Un sol couvert est un sol protégé.", ["sol","érosion","agriculture"]),
 F("Les feux de brousse","Secondaire","Évaluer les dégâts des feux.",
   "Le feu de brousse est parfois utilisé pour défricher ou chasser. Mais il détruit la matière organique, tue les micro-organismes, chasse la faune, met le sol à nu et libère du carbone. Les feux précoces contrôlés, les pare-feux et la sensibilisation limitent les dégâts.",
   "Chaque saison sèche, des hectares de savane brûlent dans le nord du Bénin.",
   "Débattre en classe : « Le feu de brousse est-il utile au paysan ? » avec deux équipes.",
   "Un sol brûlé perd sa fertilité et sa vie.", ["feu","savane","sol"]),
 F("Le recyclage du papier","Primaire","Comprendre la seconde vie du papier.",
   "Le papier vient du bois. Le recycler, c'est économiser des arbres, de l'eau et de l'énergie. À l'école, on utilise les deux faces des feuilles, on réserve les brouillons, on récupère les cahiers non finis en fin d'année et on fabrique du papier recyclé artisanal.",
   "Avec les cahiers à moitié utilisés d'une classe, on reconstitue des cahiers de brouillon pour l'année suivante.",
   "Fabriquer une feuille de papier recyclé à partir de vieux papiers trempés et broyés.",
   "Écrire des deux côtés, c'est déjà sauver des arbres.", ["papier","recyclage","forêt"]),
 F("L'assainissement et les latrines","Primaire","Comprendre l'importance des latrines.",
   "La défécation à l'air libre pollue l'eau et propage les maladies. Une latrine bien construite, avec une dalle lavable, un couvercle et un dispositif de lavage des mains, coupe la chaîne de transmission. Elle doit être éloignée d'au moins trente mètres d'un puits.",
   "Des villages déclarés « fin de défécation à l'air libre » voient chuter les cas de diarrhée chez les enfants.",
   "Dessiner le plan d'une latrine familiale correcte et en présenter les éléments essentiels.",
   "Une latrine propre protège tout le quartier.", ["assainissement","latrine","santé"]),
 F("Les énergies renouvelables","Secondaire","Distinguer les sources d'énergie.",
   "Les énergies fossiles (pétrole, charbon, gaz) s'épuisent et polluent. Les renouvelables se renouvellent naturellement : soleil, vent, eau des barrages, biomasse et géothermie. Elles produisent peu de gaz à effet de serre, mais demandent un investissement de départ et dépendent parfois de la météo.",
   "Le barrage de Nangbéto produit de l'électricité à partir de la force de l'eau du Mono.",
   "Classer en deux colonnes huit sources d'énergie selon qu'elles sont renouvelables ou non.",
   "Renouvelable ne veut pas dire illimité : il faut aussi économiser.", ["énergie","renouvelable","barrage"]),
]

FIN = [
 F("À quoi sert l'argent","Primaire","Comprendre les fonctions de l'argent.",
   "Avant l'argent, on échangeait des biens : c'était le troc, difficile quand les besoins ne correspondaient pas. L'argent sert à trois choses : payer (moyen d'échange), comparer les prix (unité de compte) et garder de la valeur pour plus tard (réserve). Le franc CFA est la monnaie du Bénin et de sept autres pays de l'UEMOA.",
   "Avec 500 F, on peut acheter du pain ; le vendeur utilisera ce billet pour acheter de la farine.",
   "Organiser un marché fictif en classe avec de fausses pièces et des marchandises apportées.",
   "L'argent est un outil d'échange, pas un but en soi.", ["argent","monnaie","échange"]),
 F("Reconnaître les billets et les pièces","Primaire","Manipuler la monnaie courante.",
   "Les pièces de l'UEMOA vont de 1 F à 500 F ; les billets sont de 500, 1 000, 2 000, 5 000 et 10 000 F. Chaque billet a une couleur, un personnage et des signes de sécurité : filigrane, fil argenté, encre qui change de couleur. Savoir les reconnaître évite d'accepter un faux billet.",
   "Un commerçant vérifie le filigrane d'un billet de 10 000 F en le regardant à la lumière.",
   "Exercices de rendu de monnaie : payer 2 300 F avec un billet de 5 000 F.",
   "Compter et vérifier sa monnaie avant de quitter le vendeur.", ["monnaie","billets","calcul"]),
 F("Besoins et envies","Primaire","Distinguer le nécessaire du superflu.",
   "Un besoin est indispensable pour vivre : manger, boire, se soigner, se loger, s'instruire. Une envie fait plaisir mais n'est pas vitale : bonbons, jeux, vêtements à la mode. Quand l'argent est limité, on paie d'abord les besoins. Savoir attendre pour une envie s'appelle la patience financière.",
   "Un élève qui reçoit 200 F par jour choisit entre acheter des beignets ou économiser pour un cahier.",
   "Classer quinze images en deux colonnes : besoin ou envie, puis justifier les cas discutés.",
   "Les besoins d'abord, les envies ensuite s'il reste de l'argent.", ["besoin","choix","priorité"]),
 F("Pourquoi et comment épargner","Primaire","Prendre l'habitude d'épargner.",
   "Épargner, c'est mettre de côté une partie de ce qu'on reçoit au lieu de tout dépenser. L'épargne sert aux imprévus (maladie), aux projets (vélo, matériel) et aux grandes dépenses (rentrée scolaire). La règle simple : mettre de côté dès qu'on reçoit l'argent, avant de dépenser.",
   "Un élève qui met 100 F de côté chaque jour d'école dispose d'environ 2 000 F au bout d'un mois.",
   "Fabriquer une tirelire et tenir un carnet des sommes déposées pendant un trimestre.",
   "On épargne d'abord, on dépense ensuite.", ["épargne","tirelire","projet"]),
 F("Tenir un budget simple","Secondaire","Construire un budget personnel.",
   "Un budget compare les entrées d'argent (revenus) et les sorties (dépenses) sur une période. On note les revenus, on liste les dépenses fixes puis variables, et on calcule le solde. Si le solde est négatif, il faut réduire des dépenses ou augmenter les revenus. Un budget prévoit aussi une ligne d'épargne.",
   "Revenus 20 000 F ; transport 4 000, nourriture 9 000, fournitures 3 000 : il reste 4 000 F à épargner.",
   "Établir son budget mensuel personnel sur un tableau à trois colonnes et le tenir un mois.",
   "Un budget écrit vaut mieux qu'un calcul de tête.", ["budget","revenus","dépenses"]),
 F("Les tontines","Secondaire","Comprendre le fonctionnement des tontines.",
   "La tontine est une épargne collective traditionnelle : des membres versent régulièrement une même somme et, à tour de rôle, l'un d'eux reçoit la totalité. Elle permet de réunir vite un capital sans banque. Elle repose sur la confiance : le risque est la défaillance d'un membre ou du responsable.",
   "Dix vendeuses versent 1 000 F par semaine ; chaque semaine l'une d'elles reçoit 10 000 F.",
   "Simuler une tontine de classe sur huit semaines avec un registre des versements.",
   "La tontine fonctionne tant que la confiance et le registre sont tenus.", ["tontine","épargne","confiance"]),
 F("Le compte bancaire et le mobile money","Secondaire","Choisir un moyen de garder son argent.",
   "Un compte bancaire ou un compte de microfinance sécurise l'épargne et permet des virements. Le mobile money permet d'envoyer et recevoir de l'argent avec un simple téléphone, de payer des factures et des frais scolaires. Il faut connaître les frais de retrait et ne jamais communiquer son code secret.",
   "Un parent envoie les frais de scolarité par mobile money depuis un village vers la ville.",
   "Comparer les frais de retrait de trois services pour un montant de 10 000 F.",
   "Ne jamais donner son code secret, même à un agent.", ["banque","mobile money","sécurité"]),
 F("Emprunter et rembourser","Secondaire","Comprendre le crédit et l'intérêt.",
   "Emprunter, c'est recevoir une somme qu'on devra rendre, généralement avec un intérêt qui rémunère le prêteur. Le taux d'intérêt exprime ce coût en pourcentage. Un crédit utile finance une activité qui rapportera plus que son coût ; un crédit de consommation mal maîtrisé conduit au surendettement.",
   "Emprunter 50 000 F à 10 % pendant un an revient à rembourser 55 000 F.",
   "Calculer le coût total de trois emprunts à taux différents et discuter lequel est acceptable.",
   "On n'emprunte que ce qu'on est sûr de pouvoir rembourser.", ["crédit","intérêt","dette"]),
 F("Le calcul du pourcentage dans la vie","Secondaire","Appliquer les pourcentages aux prix.",
   "Le pourcentage exprime une part sur cent. Pour une remise de 20 % sur 15 000 F : 15 000 × 20 / 100 = 3 000 F de remise, donc 12 000 F à payer. Pour une hausse de 5 %, on multiplie par 1,05. Savoir calculer évite de se faire tromper.",
   "Un article affiché à 8 000 F avec 25 % de réduction coûte finalement 6 000 F.",
   "Résoudre dix situations de remises et de hausses relevées dans les boutiques du quartier.",
   "Vérifier soi-même le calcul avant de payer.", ["pourcentage","remise","calcul"]),
 F("Comparer les prix avant d'acheter","Primaire","Développer le réflexe de comparaison.",
   "Le même produit peut coûter des prix différents selon le vendeur, le quartier ou la quantité. Acheter en grande quantité réduit souvent le prix unitaire. Il faut comparer à qualité égale et vérifier la quantité réelle, car un emballage plus grand ne contient pas toujours plus.",
   "Un savon vendu 300 F à l'unité revient à 250 F pièce si on achète le carton de douze.",
   "Relever le prix d'un même cahier chez trois vendeurs et calculer l'économie possible.",
   "Comparer trois prix avant d'acheter fait économiser toute l'année.", ["prix","comparaison","achat"]),
 F("Se méfier des arnaques","Secondaire","Reconnaître les escroqueries courantes.",
   "Les escrocs promettent des gains rapides : faux placements doublant l'argent, faux gagnants de loterie, fausses offres d'emploi payantes, appels demandant un code reçu par SMS. La règle est simple : une promesse de gain énorme sans travail cache toujours une arnaque. On ne paie jamais pour recevoir un gain.",
   "Un message annonce que vous avez gagné un téléphone, à condition d'envoyer d'abord 5 000 F de frais.",
   "Analyser cinq messages frauduleux et repérer dans chacun l'indice qui trahit l'escroquerie.",
   "Si c'est trop beau pour être vrai, c'est faux.", ["arnaque","fraude","prudence"]),
 F("L'argent de poche","Primaire","Gérer une petite somme régulière.",
   "L'argent de poche sert à apprendre à gérer. On le partage en trois parts : une pour les dépenses du jour, une pour l'épargne, une pour aider ou offrir. Noter ses dépenses permet de voir où part l'argent et de corriger les gaspillages.",
   "Sur 300 F reçus : 150 F pour le repas, 100 F épargnés, 50 F pour un camarade en difficulté.",
   "Tenir pendant deux semaines un carnet quotidien des recettes et dépenses, puis en tirer un bilan.",
   "Ce qui est noté est maîtrisé.", ["argent de poche","gestion","carnet"]),
 F("Le coût réel de la scolarité","Secondaire","Évaluer une dépense annuelle.",
   "La scolarité ne se limite pas aux frais d'inscription : il y a les fournitures, les tenues, le transport, la cantine, les photocopies et les examens. Anticiper ces coûts et les étaler sur l'année évite les difficultés de la rentrée. Une épargne mensuelle dédiée résout ce problème.",
   "Une rentrée qui coûte 60 000 F se prépare en épargnant 5 000 F par mois pendant douze mois.",
   "Établir la liste chiffrée complète de ses dépenses scolaires de l'année.",
   "Une dépense prévue à l'avance n'est plus une difficulté.", ["scolarité","budget","anticipation"]),
 F("Épargner en groupe à l'école","Primaire","Organiser une caisse de classe.",
   "Une caisse de classe collecte de petites sommes pour financer un projet commun : sortie, matériel, fête. Elle exige trois choses : un trésorier, un registre signé et un contrôle régulier devant tous. La transparence évite les soupçons et les conflits.",
   "Une classe de 40 élèves réunit 20 000 F en un mois avec 25 F par élève et par jour.",
   "Élire un trésorier et un contrôleur, puis tenir le registre pendant un trimestre.",
   "Pas de caisse sans registre ni contrôle.", ["caisse","transparence","groupe"]),
 F("Le gaspillage alimentaire","Primaire","Réduire les pertes de nourriture.",
   "Jeter de la nourriture, c'est jeter l'argent, l'eau et le travail qui ont servi à la produire. On réduit le gaspillage en servant des portions adaptées, en conservant correctement les restes, en achetant selon une liste et en utilisant d'abord les produits les plus anciens.",
   "Une famille qui planifie ses repas de la semaine réduit nettement ses achats inutiles.",
   "Peser pendant trois jours les restes jetés à la maison et proposer des solutions chiffrées.",
   "Moins gaspiller, c'est augmenter son budget sans gagner plus.", ["gaspillage","alimentation","économie"]),
 F("Lire une facture et un reçu","Secondaire","Contrôler un document de paiement.",
   "Un reçu prouve le paiement : il indique la date, le vendeur, la désignation, la quantité, le prix unitaire, le total et la signature. Une facture peut ajouter la TVA et les conditions de règlement. Il faut toujours vérifier le total et conserver le document en cas de contestation.",
   "Un reçu de 3 articles à 1 500 F doit afficher un total de 4 500 F : vérifier la multiplication.",
   "Corriger cinq reçus contenant volontairement des erreurs de calcul.",
   "Exiger et garder son reçu, c'est protéger son argent.", ["facture","reçu","vérification"]),
 F("L'inflation expliquée aux élèves","Secondaire","Comprendre la hausse des prix.",
   "L'inflation est la hausse générale et durable des prix. Avec la même somme, on achète moins qu'avant : le pouvoir d'achat baisse. Elle vient d'une demande trop forte, d'une production insuffisante ou de la hausse des coûts importés. L'épargne gardée à la maison perd de la valeur avec le temps.",
   "Un sac de riz passé de 20 000 F à 24 000 F en un an représente une hausse de 20 %.",
   "Relever le prix de cinq produits de base sur trois mois et calculer l'évolution.",
   "L'argent qui dort perd de la valeur quand les prix montent.", ["inflation","prix","pouvoir d'achat"]),
 F("Assurance et prévoyance","Secondaire","Comprendre le principe de l'assurance.",
   "L'assurance consiste à verser une petite somme régulière pour être protégé contre un gros risque : accident, maladie, incendie, décès. Beaucoup de personnes cotisent, peu subissent le sinistre : les cotisations de tous indemnisent ceux qui sont touchés. C'est la solidarité organisée.",
   "L'assurance maladie évite qu'une hospitalisation imprévue ruine toute une famille.",
   "Lister les principaux risques d'une famille et dire lesquels peuvent être assurés.",
   "Mieux vaut une petite cotisation qu'une grosse ruine.", ["assurance","risque","prévoyance"]),
 F("Le travail et le salaire","Secondaire","Relier travail, compétence et revenu.",
   "Le salaire rémunère un travail. Il dépend de la qualification, de l'expérience, de la pénibilité et du secteur. Le salaire brut subit des retenues sociales pour donner le net. Se former augmente durablement son revenu, et plusieurs sources de revenu sécurisent un foyer.",
   "Un maçon qualifié en carrelage gagne davantage qu'un manœuvre sans spécialité.",
   "Interroger trois travailleurs du quartier sur leur formation et l'évolution de leur revenu.",
   "La compétence est le meilleur placement.", ["travail","salaire","formation"]),
 F("Donner et partager","Primaire","Comprendre la solidarité financière.",
   "Partager une partie de ce qu'on a renforce la communauté : aider un camarade sans fournitures, contribuer à une cotisation de quartier, soutenir un malade. Le don ne doit pas mettre en danger ses propres besoins : on donne ce qu'on peut, régulièrement plutôt que beaucoup une seule fois.",
   "Une classe qui cotise 50 F par élève achète des fournitures pour un camarade démuni.",
   "Organiser une action de solidarité chiffrée et en présenter le bilan à l'école.",
   "Donner un peu, souvent, et sans se ruiner.", ["solidarité","don","communauté"]),
]

ENT = [
 F("Qu'est-ce qu'un entrepreneur","Primaire","Définir l'entrepreneur.",
   "Un entrepreneur est une personne qui repère un besoin et organise des moyens pour y répondre en vendant un produit ou un service. Il prend un risque : il investit du temps et de l'argent sans être certain de gagner. Ses qualités sont l'initiative, la persévérance, l'honnêteté et le sens du client.",
   "La vendeuse d'akassa qui livre désormais dans les bureaux a repéré un besoin et adapté son service.",
   "Interroger un commerçant du quartier sur ses débuts et présenter son parcours à la classe.",
   "Entreprendre, c'est résoudre le problème de quelqu'un d'autre.", ["entrepreneur","initiative","risque"]),
 F("Trouver une idée d'activité","Secondaire","Générer des idées à partir des besoins.",
   "Une bonne idée part d'un problème réel et fréquent. On observe son quartier : qu'est-ce qui manque, coûte cher, fait perdre du temps ou fonctionne mal ? On note toutes les idées sans juger, puis on les trie selon l'utilité, les moyens nécessaires et ses propres compétences.",
   "Dans un quartier sans point de recharge de téléphone, installer une station solaire répond à un vrai besoin.",
   "Lister vingt problèmes observés en une semaine, puis en retenir trois transformables en activité.",
   "L'idée vient du problème, pas de l'imagination seule.", ["idée","besoin","observation"]),
 F("Étudier son marché","Secondaire","Vérifier qu'il y a des clients.",
   "Avant de se lancer, il faut savoir qui achètera, à quel prix, et qui vend déjà la même chose. On interroge au moins trente personnes, on observe les concurrents, on note leurs prix et leurs faiblesses. Si personne n'est prêt à payer, l'idée doit être modifiée ou abandonnée.",
   "Avant d'ouvrir un kiosque de jus, on demande à cinquante passants ce qu'ils boivent et à quel prix.",
   "Construire un questionnaire de huit questions et l'administrer à trente personnes du quartier.",
   "Une idée non testée auprès des clients reste un rêve.", ["marché","client","enquête"]),
 F("Calculer un prix de vente","Secondaire","Fixer un prix qui laisse un bénéfice.",
   "Le prix de vente doit couvrir le coût de revient et laisser une marge. Coût de revient = matières + main-d'œuvre + transport + emballage + part des charges fixes. On ajoute ensuite la marge souhaitée, puis on vérifie que le prix reste acceptable pour le client et compétitif.",
   "Un beignet coûte 25 F à produire ; vendu 50 F, il laisse 25 F de marge brute.",
   "Calculer le coût de revient complet d'un produit fabriqué en classe et fixer son prix.",
   "Vendre sans connaître son coût de revient, c'est travailler à perte.", ["prix","coût","marge"]),
 F("Le bénéfice et la perte","Primaire","Distinguer recette, dépense et bénéfice.",
   "La recette est tout l'argent encaissé. Les dépenses sont les sommes sorties pour produire et vendre. Le bénéfice est la différence quand la recette est supérieure ; sinon c'est une perte. Il ne faut jamais confondre la recette du jour avec le bénéfice : une grosse recette peut cacher une perte.",
   "Recette 12 000 F, dépenses 9 500 F : le bénéfice est de 2 500 F.",
   "Tenir le compte d'une vente organisée en classe et calculer le bénéfice réel.",
   "Bénéfice = recettes moins toutes les dépenses.", ["bénéfice","recette","gestion"]),
 F("Le plan d'affaires simplifié","Secondaire","Rédiger un projet sur une page.",
   "Un plan d'affaires simple répond à sept questions : quel produit ou service, pour quels clients, à quel prix, avec quels moyens, quels concurrents, quel investissement de départ, et quel bénéfice attendu. Il tient sur une page et sert à convaincre un partenaire ou un financeur.",
   "Un projet de couture chiffre la machine à 120 000 F, le tissu mensuel à 30 000 F et 15 clients par mois.",
   "Rédiger le plan d'affaires d'une activité choisie et le présenter en cinq minutes devant la classe.",
   "Un projet écrit et chiffré se défend ; un projet vague se perd.", ["plan","projet","financement"]),
 F("Tenir ses comptes au quotidien","Secondaire","Enregistrer les opérations.",
   "Un cahier de caisse comporte la date, la nature de l'opération, l'entrée, la sortie et le solde. On l'écrit chaque jour, sans attendre. On sépare strictement l'argent de l'activité et l'argent personnel. Ce cahier permet de savoir si l'on gagne réellement et de repérer les fuites.",
   "Un vendeur qui pioche dans la caisse pour ses dépenses personnelles croit gagner alors qu'il s'appauvrit.",
   "Tenir un cahier de caisse pendant deux semaines pour une activité réelle ou simulée.",
   "La caisse de l'activité n'est pas la poche du patron.", ["comptabilité","caisse","rigueur"]),
 F("Le service au client","Primaire","Adopter un bon comportement commercial.",
   "Un client satisfait revient et parle de vous. Les règles : saluer, écouter, être propre, servir vite, dire la vérité sur le produit, rendre la monnaie exacte et remercier. Un client mécontent doit être écouté calmement et trouver une solution : réparation, échange ou geste commercial.",
   "Une vendeuse qui appelle ses clients par leur nom fidélise davantage qu'une autre moins chère.",
   "Jouer des scènes de vente : client pressé, client mécontent, client indécis.",
   "Le sourire et l'honnêteté sont gratuits et rapportent beaucoup.", ["client","service","fidélité"]),
 F("La qualité du produit","Secondaire","Comprendre les exigences de qualité.",
   "La qualité, c'est répondre exactement à l'attente du client, de façon constante. Elle concerne la matière première, l'hygiène de fabrication, l'emballage, la présentation et la régularité. Un produit irrégulier fait fuir : le client veut retrouver le même goût et la même quantité à chaque achat.",
   "Un jus de bissap toujours préparé avec le même dosage fidélise, contrairement à un goût qui change.",
   "Établir la fiche de fabrication d'un produit avec les quantités précises à respecter.",
   "La régularité vaut mieux que la perfection occasionnelle.", ["qualité","hygiène","régularité"]),
 F("Faire connaître son activité","Secondaire","Utiliser des moyens de promotion accessibles.",
   "On se fait connaître par le bouche-à-oreille, une enseigne lisible, des cartes de visite simples, les groupes WhatsApp, une page sur les réseaux sociaux, la participation aux foires et les échantillons. Le message doit être clair : ce qu'on vend, où, à quel prix et comment joindre.",
   "Une couturière qui publie ses modèles dans les groupes du quartier reçoit des commandes sans boutique.",
   "Concevoir une affiche et un message de promotion de cinq lignes pour une activité choisie.",
   "Un bon produit inconnu ne se vend pas.", ["promotion","publicité","réseaux"]),
 F("L'esprit d'équipe dans une activité","Primaire","Travailler à plusieurs efficacement.",
   "Dans une activité de groupe, chacun doit avoir un rôle précis : production, vente, caisse, approvisionnement. On se met d'accord à l'avance sur le partage des tâches et des bénéfices. Les décisions importantes se prennent ensemble et les comptes sont montrés à tous.",
   "Quatre élèves vendant des jus se répartissent achat, préparation, vente et caisse.",
   "Créer une mini-entreprise de classe avec des rôles écrits et un règlement signé.",
   "Des rôles clairs évitent les disputes.", ["équipe","organisation","rôles"]),
 F("Gérer son temps","Secondaire","Organiser son travail.",
   "Le temps est la ressource la plus rare. On liste ses tâches, on les classe par urgence et importance, on planifie les plus difficiles aux heures de meilleure énergie et on évite de tout faire à la dernière minute. Concilier études et petite activité exige un emploi du temps écrit.",
   "Un élève qui vend le soir réserve deux heures fixes aux devoirs avant d'ouvrir son étal.",
   "Construire son emploi du temps hebdomadaire réel et repérer les heures perdues.",
   "Ce qui n'est pas planifié n'est pas fait.", ["temps","organisation","priorité"]),
 F("Les échecs et la persévérance","Primaire","Apprendre de ses erreurs.",
   "Presque tous les entrepreneurs connaissent des échecs : produit invendu, client perdu, matériel cassé. L'échec n'est pas la fin : il indique ce qui doit changer. On analyse la cause, on corrige, on recommence. Abandonner à la première difficulté empêche toute réussite.",
   "Un premier lot de gâteaux brûlés apprend à surveiller le feu et à noter le temps de cuisson.",
   "Raconter par écrit un échec personnel et les trois leçons qu'on en a tirées.",
   "Tomber est normal ; rester à terre est un choix.", ["persévérance","échec","apprentissage"]),
 F("L'artisanat local comme métier","Secondaire","Valoriser les métiers manuels.",
   "Les métiers manuels nourrissent leur homme : couture, menuiserie, mécanique, coiffure, maçonnerie, soudure, transformation agroalimentaire. Ils s'apprennent par l'apprentissage auprès d'un maître, puis se modernisent par la formation, l'outillage et la qualité de finition.",
   "Un menuisier formé au métré et au devis remporte des marchés que d'autres perdent.",
   "Visiter un atelier du quartier et décrire les étapes de fabrication d'un objet.",
   "Un métier bien appris est un capital à vie.", ["artisanat","métier","apprentissage"]),
 F("Transformer les produits agricoles","Secondaire","Créer de la valeur ajoutée.",
   "Vendre un produit brut rapporte peu ; le transformer augmente sa valeur. Le manioc devient gari ou tapioca, l'ananas devient jus ou séché, l'arachide devient pâte ou huile, le soja devient fromage. La transformation exige hygiène, emballage et conservation.",
   "Un régime d'ananas vendu brut rapporte peu, alors que transformé en jus embouteillé il rapporte plusieurs fois plus.",
   "Choisir un produit local et décrire toute la chaîne de transformation avec les coûts.",
   "La valeur se crée à la transformation, pas à la récolte.", ["transformation","agroalimentaire","valeur"]),
 F("Le numérique au service de l'activité","Secondaire","Utiliser le téléphone comme outil.",
   "Un simple téléphone permet de prendre les commandes, photographier ses produits, tenir ses comptes, encaisser par mobile money, se faire connaître et comparer les prix des fournisseurs. Il faut protéger ses données, garder les preuves de paiement et se méfier des arnaques en ligne.",
   "Une revendeuse prend ses commandes par WhatsApp et livre en fin de journée, sans local.",
   "Créer un catalogue de cinq produits avec photo, description et prix sur le téléphone.",
   "Le téléphone bien utilisé remplace une boutique.", ["numérique","téléphone","vente"]),
 F("Les formalités d'une petite entreprise","Secondaire","Connaître les démarches de base.",
   "Une activité peut être déclarée pour accéder aux marchés, aux crédits et aux appuis publics. Les démarches courantes sont l'obtention d'un identifiant fiscal, l'enregistrement de l'entreprise et, selon l'activité, une autorisation sanitaire. Être en règle protège et ouvre des portes.",
   "Un fournisseur déclaré peut signer un contrat avec une école ou une administration.",
   "Se renseigner sur les pièces exigées pour enregistrer une petite entreprise et en dresser la liste.",
   "Être en règle coûte moins cher que d'être en infraction.", ["formalités","entreprise","fiscalité"]),
 F("Négocier avec un fournisseur","Secondaire","Obtenir de meilleures conditions.",
   "Bien acheter, c'est déjà gagner. On compare plusieurs fournisseurs, on demande le prix pour différentes quantités, on négocie le délai de paiement et la livraison, et on vérifie la qualité à la réception. Une relation durable avec un fournisseur fiable vaut mieux qu'un gain ponctuel.",
   "Acheter le tissu en gros à trois fournisseurs consultés fait baisser le coût de 15 %.",
   "Simuler une négociation d'achat en binôme avec des objectifs de prix fixés à l'avance.",
   "Comparer trois fournisseurs avant chaque achat important.", ["négociation","achat","fournisseur"]),
 F("Réinvestir ses bénéfices","Secondaire","Faire grandir son activité.",
   "Le bénéfice ne doit pas être entièrement consommé. Une partie doit retourner dans l'activité : acheter plus de matière, un meilleur outil, améliorer l'emballage ou former quelqu'un. C'est le réinvestissement qui transforme une petite activité en véritable entreprise.",
   "Une vendeuse qui réinvestit la moitié de son bénéfice double son stock en quelques mois.",
   "Établir un plan de réinvestissement chiffré sur six mois pour une activité simulée.",
   "Consommer tout son bénéfice, c'est condamner son activité à rester petite.", ["réinvestissement","croissance","stratégie"]),
 F("Éthique et honnêteté en affaires","Primaire","Adopter une conduite honnête.",
   "L'honnêteté est le premier capital : donner la quantité annoncée, ne pas mentir sur la qualité, respecter ses engagements de livraison, payer ses fournisseurs et ses employés. La tricherie rapporte une fois et détruit une réputation pour toujours.",
   "Un vendeur qui utilise une balance juste garde ses clients même quand un concurrent est moins cher.",
   "Débattre de trois situations où la tentation de tricher existe et proposer la conduite juste.",
   "La réputation met des années à se bâtir et un instant à se perdre.", ["éthique","honnêteté","réputation"]),
]

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lifeExtra import ENV_EXTRA, FIN_EXTRA, ENT_EXTRA
ENV += ENV_EXTRA
FIN += FIN_EXTRA
ENT += ENT_EXTRA

def ident(prefix, i):
    return f"{prefix}-{i+1:02d}"

def esc(s):
    return json.dumps(s, ensure_ascii=False)

def emit(name, prefix, fiches):
    out = [f"export const {name}: LifeLesson[] = ["]
    for i, f in enumerate(fiches):
        out.append("  {")
        out.append(f"    id: {esc(ident(prefix,i))},")
        for k in ["title","level","objective","content","example","activity","keyPoint"]:
            out.append(f"    {k}: {esc(f[k])},")
        out.append(f"    keywords: {json.dumps(f['keywords'], ensure_ascii=False)},")
        out.append("  },")
    out.append("];")
    return "\n".join(out)

header = '''/**
 * ÉDUCATION À LA VIE (v39) — contenus pour écoliers et élèves.
 *
 * Trois domaines : éducation environnementale, financière et entrepreneuriale.
 * Les fiches sont ORIGINALES, rédigées pour le contexte béninois et
 * ouest-africain (aucun contenu recopié d'un site tiers), et structurées
 * de façon identique pour être directement exploitables en classe :
 * objectif, contenu, exemple local, activité pratique, point à retenir.
 *
 * Fichier GÉNÉRÉ par tools/genLifeEducation.py — ne pas éditer à la main.
 */

export interface LifeLesson {
  id: string;
  title: string;
  /** Public visé : Primaire ou Secondaire. */
  level: string;
  objective: string;
  content: string;
  example: string;
  activity: string;
  keyPoint: string;
  keywords: string[];
}

export interface LifeDomain {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  tone: string;
  lessons: LifeLesson[];
}

'''

body = "\n\n".join([
    emit("ENVIRONMENT_LESSONS","env",ENV),
    emit("FINANCE_LESSONS","fin",FIN),
    emit("ENTREPRENEUR_LESSONS","ent",ENT),
])

footer = '''

export const LIFE_DOMAINS: LifeDomain[] = [
  {
    slug: 'environnementale',
    title: 'Éducation environnementale',
    tagline: 'Comprendre et protéger son milieu de vie',
    description:
      "Eau, déchets, sols, forêts, climat, énergies : des fiches concrètes pour que l'élève comprenne son environnement et agisse à son niveau.",
    icon: 'Leaf',
    tone: 'emerald',
    lessons: ENVIRONMENT_LESSONS,
  },
  {
    slug: 'financiere',
    title: 'Éducation financière',
    tagline: "Gérer son argent avec méthode",
    description:
      "Besoins et envies, épargne, budget, tontines, crédit, arnaques : les bases pour gérer son argent sans se tromper.",
    icon: 'Coins',
    tone: 'amber',
    lessons: FINANCE_LESSONS,
  },
  {
    slug: 'entrepreneuriale',
    title: 'Éducation entrepreneuriale',
    tagline: "Oser créer son activité",
    description:
      "De l'idée au plan d'affaires : trouver un besoin, calculer un prix, servir le client, tenir ses comptes et faire grandir son activité.",
    icon: 'Rocket',
    tone: 'purple',
    lessons: ENTREPRENEUR_LESSONS,
  },
];

export function findDomain(slug: string): LifeDomain | undefined {
  return LIFE_DOMAINS.find((d) => d.slug === slug);
}

export function findLesson(slug: string, id: string): LifeLesson | undefined {
  return findDomain(slug)?.lessons.find((l) => l.id === id);
}

/** Recherche plein texte dans un domaine (sans accents, insensible à la casse). */
export function searchLessons(slug: string, query: string): LifeLesson[] {
  const d = findDomain(slug);
  if (!d) return [];
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
  if (!q) return d.lessons;
  return d.lessons.filter((l) => {
    const hay = `${l.title} ${l.objective} ${l.content} ${l.example} ${l.keywords.join(' ')}`
      .toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    return hay.includes(q);
  });
}

export function totalLifeLessons(): number {
  return LIFE_DOMAINS.reduce((n, d) => n + d.lessons.length, 0);
}
'''

with io.open('src/utils/lifeEducationData.ts','w',encoding='utf-8') as fh:
    fh.write(header + body + footer)

print("ENV", len(ENV), "FIN", len(FIN), "ENT", len(ENT))
