#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère src/utils/kidsDictionaryPack.ts — dictionnaire des petits écoliers.

Contenu ORIGINAL rédigé pour l'application : chaque entrée comporte une
définition simple (niveau maternelle/primaire) et un exemple concret, souvent
ancré dans le quotidien béninois. Les entrées sont écrites à la main par
familles thématiques (pas de texte généré mécaniquement à partir de gabarits
répétitifs) afin de garder une qualité de lecture correcte.
"""
import io, os, re

# (mot, définition, exemple)
FAMILIES = {}

FAMILIES["Animaux"] = [
 ("Abeille","L'abeille est un petit insecte jaune et noir qui fabrique le miel.","Les abeilles butinent les fleurs du jardin."),
 ("Agouti","L'agouti est un petit rongeur de la brousse, très apprécié au Bénin.","Le chasseur a aperçu un agouti dans les herbes."),
 ("Aigle","L'aigle est un grand oiseau rapace à la vue perçante.","L'aigle plane très haut dans le ciel."),
 ("Âne","L'âne est un animal domestique qui porte de lourdes charges.","L'âne transporte les sacs de mil au marché."),
 ("Antilope","L'antilope est un animal rapide de la savane, aux longues cornes.","L'antilope bondit pour échapper au lion."),
 ("Araignée","L'araignée est un petit animal à huit pattes qui tisse une toile.","Une araignée a tissé sa toile au coin du mur."),
 ("Autruche","L'autruche est le plus grand oiseau du monde ; elle court vite mais ne vole pas.","L'autruche court plus vite qu'un cheval."),
 ("Baleine","La baleine est un très grand animal marin qui respire à la surface.","La baleine souffle un jet d'eau en remontant."),
 ("Bœuf","Le bœuf est un grand animal d'élevage qui tire la charrue.","Le bœuf laboure le champ avant les semis."),
 ("Buffle","Le buffle est un gros animal sauvage aux cornes recourbées.","Un troupeau de buffles traverse la rivière."),
 ("Caméléon","Le caméléon change de couleur pour se cacher.","Le caméléon avance lentement sur la branche."),
 ("Canard","Le canard est un oiseau qui nage et fait « coin-coin ».","Les canards barbotent dans la mare."),
 ("Chat","Le chat est un animal domestique qui chasse les souris.","Le chat dort sur la natte."),
 ("Chauve-souris","La chauve-souris est le seul mammifère qui vole vraiment.","Les chauves-souris sortent à la tombée de la nuit."),
 ("Cheval","Le cheval est un grand animal rapide que l'on peut monter.","Le cavalier galope sur son cheval."),
 ("Chèvre","La chèvre est un animal élevé pour son lait et sa viande.","La chèvre broute dans la cour."),
 ("Chien","Le chien est un animal fidèle qui garde la maison.","Le chien aboie quand un inconnu arrive."),
 ("Cochon","Le cochon est un animal d'élevage à la peau rose ou noire.","Le cochon se roule dans la boue pour se rafraîchir."),
 ("Coq","Le coq est le mâle de la poule ; il chante le matin.","Le coq chante au lever du soleil."),
 ("Crabe","Le crabe est un animal à carapace qui marche de côté.","Le crabe se cache dans le sable de la plage."),
 ("Crapaud","Le crapaud est un animal à peau rugueuse qui vit près de l'eau.","Le crapaud coasse après la pluie."),
 ("Crocodile","Le crocodile est un grand reptile qui vit dans les fleuves.","Le crocodile se chauffe au soleil sur la berge."),
 ("Dauphin","Le dauphin est un animal marin très intelligent.","Le dauphin saute hors de l'eau."),
 ("Écureuil","L'écureuil est un petit rongeur à la queue touffue.","L'écureuil grignote une noix."),
 ("Éléphant","L'éléphant est le plus grand animal terrestre ; il a une trompe.","L'éléphant boit avec sa trompe."),
 ("Escargot","L'escargot porte sa coquille sur le dos et avance très lentement.","L'escargot sort après la pluie."),
 ("Fourmi","La fourmi est un petit insecte très travailleur qui vit en groupe.","Les fourmis transportent une miette de pain."),
 ("Girafe","La girafe est un grand animal au très long cou.","La girafe mange les feuilles des acacias."),
 ("Grenouille","La grenouille saute et vit près des mares.","La grenouille plonge dans l'eau."),
 ("Hérisson","Le hérisson est couvert de piquants pour se protéger.","Le hérisson se met en boule quand il a peur."),
 ("Hibou","Le hibou est un oiseau de nuit aux grands yeux.","Le hibou chasse les souris la nuit."),
 ("Hippopotame","L'hippopotame est un gros animal qui passe la journée dans l'eau.","L'hippopotame sort la nuit pour brouter."),
 ("Hyène","La hyène est un animal de la savane au cri particulier.","La hyène rôde autour du campement."),
 ("Lapin","Le lapin est un petit animal aux longues oreilles.","Le lapin grignote une carotte."),
 ("Léopard","Le léopard est un félin tacheté qui grimpe aux arbres.","Le léopard guette sa proie depuis une branche."),
 ("Lézard","Le lézard est un petit reptile qui court sur les murs.","Un lézard se chauffe au soleil."),
 ("Lion","Le lion est un grand félin de la savane, appelé roi des animaux.","Le lion rugit dans la nuit."),
 ("Mouche","La mouche est un insecte qui vole et se pose sur les aliments.","Il faut couvrir la nourriture contre les mouches."),
 ("Moustique","Le moustique est un insecte qui pique et peut transmettre le paludisme.","On dort sous une moustiquaire pour éviter les moustiques."),
 ("Mouton","Le mouton est un animal élevé pour sa laine et sa viande.","Le berger conduit ses moutons au pâturage."),
 ("Oie","L'oie est un grand oiseau de basse-cour au long cou.","L'oie garde la cour en criant."),
 ("Papillon","Le papillon est un insecte aux ailes colorées.","Le papillon se pose sur une fleur."),
 ("Perroquet","Le perroquet est un oiseau coloré capable d'imiter la voix.","Le perroquet répète les mots qu'il entend."),
 ("Pintade","La pintade est un oiseau de basse-cour au plumage tacheté.","Les pintades picorent dans la cour."),
 ("Poisson","Le poisson vit dans l'eau et respire grâce à ses branchies.","Le pêcheur ramène des poissons du lac."),
 ("Poule","La poule est un oiseau de basse-cour qui pond des œufs.","La poule couve ses œufs."),
 ("Requin","Le requin est un grand poisson aux dents pointues.","Le requin nage au large."),
 ("Serpent","Le serpent est un reptile sans pattes qui rampe.","Il faut s'éloigner d'un serpent."),
 ("Singe","Le singe grimpe aux arbres et mange des fruits.","Le singe saute de branche en branche."),
 ("Souris","La souris est un petit rongeur gris très rapide.","La souris se cache derrière le sac de riz."),
 ("Tortue","La tortue porte une carapace et avance lentement.","La tortue rentre sa tête dans sa carapace."),
 ("Vache","La vache est un grand animal qui donne du lait.","La vache broute l'herbe du pâturage."),
 ("Ver de terre","Le ver de terre creuse des galeries et rend la terre fertile.","Le ver de terre apparaît après la pluie."),
 ("Zèbre","Le zèbre est un animal rayé de noir et de blanc.","Le zèbre court dans la savane."),
]

FAMILIES["Corps humain"] = [
 ("Bouche","La bouche sert à manger, à boire et à parler.","J'ouvre la bouche chez le dentiste."),
 ("Bras","Le bras relie l'épaule à la main.","Je lève le bras pour répondre en classe."),
 ("Cerveau","Le cerveau commande tout le corps et permet de penser.","Le cerveau retient ce que j'apprends."),
 ("Cheveu","Les cheveux poussent sur la tête.","Maman tresse mes cheveux."),
 ("Cœur","Le cœur est un muscle qui envoie le sang dans tout le corps.","Mon cœur bat plus vite quand je cours."),
 ("Cou","Le cou relie la tête au reste du corps.","Je tourne le cou pour regarder derrière moi."),
 ("Coude","Le coude est l'articulation au milieu du bras.","Je m'appuie sur le coude pour écrire."),
 ("Dent","Les dents servent à couper et à mâcher les aliments.","Je brosse mes dents matin et soir."),
 ("Doigt","La main a cinq doigts.","Je compte sur mes doigts."),
 ("Dos","Le dos est la partie arrière du corps.","Je porte mon sac sur le dos."),
 ("Estomac","L'estomac digère les aliments que l'on avale.","L'estomac gargouille quand on a faim."),
 ("Front","Le front est la partie du visage au-dessus des yeux.","La sueur coule sur mon front."),
 ("Genou","Le genou est l'articulation qui plie la jambe.","Je me suis écorché le genou en tombant."),
 ("Jambe","La jambe sert à marcher et à courir.","Je me suis fait mal à la jambe."),
 ("Langue","La langue permet de goûter et de parler.","La langue sent le goût sucré du miel."),
 ("Main","La main sert à saisir et à écrire.","J'écris avec la main droite."),
 ("Muscle","Les muscles permettent de bouger le corps.","Le sport rend les muscles plus forts."),
 ("Nez","Le nez sert à respirer et à sentir les odeurs.","Je sens l'odeur du pain avec mon nez."),
 ("Œil","L'œil permet de voir. On a deux yeux.","Je ferme les yeux pour dormir."),
 ("Oreille","L'oreille sert à entendre les sons.","J'entends la cloche avec mes oreilles."),
 ("Os","Les os forment le squelette et soutiennent le corps.","Le lait rend les os solides."),
 ("Peau","La peau recouvre et protège tout le corps.","La peau me protège du soleil."),
 ("Pied","Le pied porte le corps et sert à marcher.","Je mets mes sandales à mes pieds."),
 ("Poumon","Les poumons servent à respirer l'air.","Les poumons se remplissent d'air quand j'inspire."),
 ("Sang","Le sang circule dans le corps et transporte l'oxygène.","Le sang coule quand on se coupe."),
 ("Squelette","Le squelette est l'ensemble des os du corps.","Le squelette tient le corps debout."),
 ("Ventre","Le ventre contient l'estomac et les intestins.","J'ai mal au ventre quand je mange trop vite."),
 ("Visage","Le visage est l'avant de la tête : yeux, nez, bouche.","Je lave mon visage le matin."),
]

FAMILIES["École"] = [
 ("Ardoise","L'ardoise est une petite plaque sur laquelle on écrit à la craie.","J'écris la réponse sur mon ardoise."),
 ("Bibliothèque","La bibliothèque est un lieu où l'on range et lit des livres.","J'emprunte un conte à la bibliothèque."),
 ("Cahier","Le cahier est un ensemble de feuilles pour écrire les leçons.","Je recopie la leçon dans mon cahier."),
 ("Camarade","Un camarade est un ami de classe.","Je partage mon goûter avec mon camarade."),
 ("Cantine","La cantine est l'endroit où les élèves mangent à l'école.","Nous mangeons du riz à la cantine."),
 ("Classe","La classe est la salle où les élèves apprennent.","La classe est propre ce matin."),
 ("Cour","La cour est l'espace où les élèves jouent pendant la récréation.","Nous jouons au ballon dans la cour."),
 ("Craie","La craie sert à écrire au tableau.","Le maître écrit la date à la craie."),
 ("Devoir","Un devoir est un travail à faire pour l'école.","Je fais mes devoirs après le repas."),
 ("Dictée","La dictée est un exercice où l'on écrit un texte lu à voix haute.","J'ai fait deux fautes à la dictée."),
 ("Directeur","Le directeur dirige l'école.","Le directeur accueille les parents."),
 ("Élève","Un élève est un enfant qui apprend à l'école.","Les élèves lèvent le doigt pour répondre."),
 ("Gomme","La gomme efface les traits de crayon.","J'efface mon erreur avec la gomme."),
 ("Leçon","Une leçon est ce que le maître enseigne.","J'apprends ma leçon de géographie."),
 ("Livre","Un livre contient des textes et des images à lire.","Je lis un livre d'histoires."),
 ("Maître","Le maître est l'enseignant qui fait la classe.","Le maître explique la nouvelle règle."),
 ("Récréation","La récréation est la pause pendant laquelle on joue.","La récréation dure quinze minutes."),
 ("Règle","La règle sert à tracer des traits droits et à mesurer.","Je trace un trait avec ma règle."),
 ("Stylo","Le stylo sert à écrire à l'encre.","Mon stylo bleu n'écrit plus."),
 ("Tableau","Le tableau est la grande surface où le maître écrit.","Je vais au tableau résoudre l'opération."),
 ("Trousse","La trousse range les crayons et les stylos.","Ma trousse contient trois crayons."),
 ("Uniforme","L'uniforme est la tenue portée par tous les élèves.","Je porte mon uniforme kaki à l'école."),
]

FAMILIES["Maison et famille"] = [
 ("Assiette","L'assiette est le plat dans lequel on mange.","Je remplis mon assiette de pâte rouge."),
 ("Balai","Le balai sert à nettoyer le sol.","Je balaie la cour avec le balai."),
 ("Chaise","La chaise est un siège avec un dossier.","Je m'assois sur une chaise."),
 ("Cousin","Un cousin est l'enfant de l'oncle ou de la tante.","Mon cousin vient passer les vacances."),
 ("Cuillère","La cuillère sert à manger les aliments liquides.","Je mange la soupe avec une cuillère."),
 ("Cuisine","La cuisine est la pièce où l'on prépare les repas.","Maman prépare le akassa dans la cuisine."),
 ("Famille","La famille réunit les parents, les enfants et les proches.","Toute la famille se retrouve le dimanche."),
 ("Fenêtre","La fenêtre laisse entrer la lumière et l'air.","J'ouvre la fenêtre pour aérer la chambre."),
 ("Frère","Le frère est le garçon né des mêmes parents.","Mon grand frère m'aide à faire mes devoirs."),
 ("Grand-mère","La grand-mère est la mère du père ou de la mère.","Ma grand-mère raconte de belles histoires."),
 ("Grand-père","Le grand-père est le père du père ou de la mère.","Mon grand-père connaît beaucoup de proverbes."),
 ("Lit","Le lit sert à dormir.","Je fais mon lit chaque matin."),
 ("Maison","La maison est le logement où vit la famille.","Notre maison a une grande cour."),
 ("Marmite","La marmite est un grand récipient pour faire cuire les aliments.","La marmite de riz est sur le feu."),
 ("Mère","La mère est la femme qui a mis l'enfant au monde.","Ma mère part au marché."),
 ("Natte","La natte est un tapis tressé sur lequel on s'assoit ou on dort.","Nous nous asseyons sur la natte le soir."),
 ("Oncle","L'oncle est le frère du père ou de la mère.","Mon oncle habite à Porto-Novo."),
 ("Père","Le père est l'homme qui élève l'enfant avec la mère.","Mon père travaille au champ."),
 ("Porte","La porte permet d'entrer et de sortir.","Je ferme la porte en partant."),
 ("Sœur","La sœur est la fille née des mêmes parents.","Ma petite sœur apprend à marcher."),
 ("Table","La table est un meuble sur lequel on pose les objets.","Les cahiers sont sur la table."),
 ("Tante","La tante est la sœur du père ou de la mère.","Ma tante vend du tissu au marché."),
 ("Toit","Le toit couvre la maison et protège de la pluie.","La pluie tambourine sur le toit en tôle."),
]

FAMILIES["Nature"] = [
 ("Arbre","L'arbre est une grande plante avec un tronc et des branches.","Le manguier est un arbre qui donne de l'ombre."),
 ("Arc-en-ciel","L'arc-en-ciel est un arc coloré qui apparaît après la pluie.","Un arc-en-ciel brille dans le ciel."),
 ("Baobab","Le baobab est un arbre au tronc très large qui vit très longtemps.","Le village se réunit sous le baobab."),
 ("Boue","La boue est de la terre mélangée à l'eau.","La cour est pleine de boue après l'orage."),
 ("Brousse","La brousse est une zone de végétation sauvage.","Les chasseurs partent en brousse au petit matin."),
 ("Champ","Le champ est un terrain où l'on cultive des plantes.","Le champ de maïs est bien vert."),
 ("Ciel","Le ciel est l'espace que l'on voit au-dessus de nous.","Le ciel est bleu ce matin."),
 ("Colline","Une colline est une petite montagne.","Le village est bâti sur une colline."),
 ("Éclair","L'éclair est une lumière très vive pendant l'orage.","Un éclair a illuminé la nuit."),
 ("Feuille","La feuille est la partie verte et plate d'une plante.","Les feuilles tombent pendant l'harmattan."),
 ("Fleur","La fleur est la partie colorée et parfumée d'une plante.","L'abeille butine la fleur."),
 ("Fleuve","Un fleuve est un grand cours d'eau qui se jette dans la mer.","Le fleuve Ouémé traverse le Bénin."),
 ("Forêt","La forêt est un grand espace couvert d'arbres.","Beaucoup d'oiseaux vivent dans la forêt."),
 ("Graine","La graine donne naissance à une nouvelle plante.","Je plante une graine de haricot."),
 ("Harmattan","L'harmattan est un vent sec et poussiéreux de la saison sèche.","L'harmattan rend les lèvres sèches."),
 ("Herbe","L'herbe est une petite plante verte qui couvre le sol.","Les moutons broutent l'herbe."),
 ("Lac","Un lac est une grande étendue d'eau entourée de terre.","Le lac Nokoué est près de Cotonou."),
 ("Lagune","La lagune est une étendue d'eau peu profonde près de la mer.","Les pirogues glissent sur la lagune."),
 ("Lune","La Lune éclaire la nuit et tourne autour de la Terre.","La Lune est pleine ce soir."),
 ("Mer","La mer est une très grande étendue d'eau salée.","Nous marchons au bord de la mer."),
 ("Montagne","Une montagne est un très haut relief de terre et de roche.","La montagne est couverte de brume."),
 ("Nuage","Le nuage est un amas de fines gouttes d'eau dans le ciel.","Des nuages noirs annoncent la pluie."),
 ("Pluie","La pluie est l'eau qui tombe des nuages.","La pluie a rempli les bassines."),
 ("Racine","La racine fixe la plante et puise l'eau dans la terre.","Les racines du manguier sont profondes."),
 ("Rivière","Une rivière est un cours d'eau plus petit qu'un fleuve.","Les enfants se baignent dans la rivière."),
 ("Sable","Le sable est fait de très petits grains de roche.","Je construis un château de sable."),
 ("Saison","Une saison est une période de l'année au climat particulier.","La saison des pluies commence en avril."),
 ("Savane","La savane est une grande plaine d'herbes et d'arbres isolés.","Les antilopes courent dans la savane."),
 ("Soleil","Le Soleil est l'étoile qui nous donne lumière et chaleur.","Le Soleil se lève à l'est."),
 ("Terre","La Terre est la planète sur laquelle nous vivons.","La Terre tourne autour du Soleil."),
 ("Vent","Le vent est de l'air qui se déplace.","Le vent fait bouger les feuilles."),
]

FAMILIES["Aliments"] = [
 ("Akassa","L'akassa est une pâte de maïs fermentée, très courante au Bénin.","Nous mangeons l'akassa avec une sauce tomate."),
 ("Ananas","L'ananas est un fruit sucré à la peau piquante.","L'ananas d'Allada est très sucré."),
 ("Arachide","L'arachide est une graine que l'on grille ou transforme en pâte.","La sauce d'arachide accompagne le riz."),
 ("Banane","La banane est un fruit jaune et sucré.","Je mange une banane après le repas."),
 ("Eau","L'eau est la boisson indispensable à la vie.","Il faut boire de l'eau propre."),
 ("Haricot","Le haricot est une graine riche que l'on cuit longtemps.","Le haricot se mange avec du gari."),
 ("Igname","L'igname est un tubercule que l'on pile pour faire la pâte.","La fête de l'igname est célébrée chaque année."),
 ("Lait","Le lait est une boisson blanche riche en calcium.","Le lait rend les os solides."),
 ("Maïs","Le maïs est une céréale à gros épis jaunes.","La farine de maïs sert à faire la pâte."),
 ("Mangue","La mangue est un fruit jaune-orange très juteux.","Les mangues mûrissent en mars."),
 ("Manioc","Le manioc est un tubercule dont on tire le gari et le tapioca.","Le manioc est râpé pour faire le gari."),
 ("Mil","Le mil est une céréale cultivée dans le nord du pays.","La bouillie de mil est servie au petit-déjeuner."),
 ("Orange","L'orange est un fruit rond et juteux riche en vitamine C.","Je presse une orange pour faire du jus."),
 ("Pain","Le pain est fabriqué avec de la farine, de l'eau et de la levure.","J'achète du pain chaud le matin."),
 ("Piment","Le piment est un petit fruit rouge très fort en bouche.","Le piment relève la sauce."),
 ("Poisson fumé","Le poisson fumé est séché au-dessus du feu pour se conserver.","Le poisson fumé parfume la sauce."),
 ("Riz","Le riz est une céréale que l'on cuit à l'eau.","Le riz au gras est servi les jours de fête."),
 ("Sel","Le sel donne du goût aux aliments.","Il ne faut pas mettre trop de sel."),
 ("Tomate","La tomate est un fruit rouge utilisé dans les sauces.","La sauce tomate accompagne le riz."),
]

FAMILIES["Métiers"] = [
 ("Agriculteur","L'agriculteur cultive la terre pour produire des aliments.","L'agriculteur sème le maïs avant la pluie."),
 ("Boulanger","Le boulanger fabrique le pain.","Le boulanger travaille très tôt le matin."),
 ("Chauffeur","Le chauffeur conduit un véhicule.","Le chauffeur du taxi-brousse klaxonne."),
 ("Coiffeur","Le coiffeur coupe et arrange les cheveux.","Le coiffeur tresse les cheveux de ma sœur."),
 ("Commerçant","Le commerçant achète et revend des marchandises.","La commerçante vend du tissu au marché."),
 ("Couturier","Le couturier confectionne des vêtements.","Le couturier coud mon uniforme."),
 ("Éleveur","L'éleveur s'occupe des animaux de ferme.","L'éleveur conduit ses bœufs au pâturage."),
 ("Infirmier","L'infirmier soigne les malades au dispensaire.","L'infirmière fait un pansement."),
 ("Maçon","Le maçon construit les murs des maisons.","Le maçon monte le mur avec des briques."),
 ("Médecin","Le médecin examine les malades et prescrit des soins.","Le médecin ausculte le patient."),
 ("Menuisier","Le menuisier fabrique des objets en bois.","Le menuisier construit une table."),
 ("Mécanicien","Le mécanicien répare les moteurs.","Le mécanicien répare la moto."),
 ("Pêcheur","Le pêcheur attrape des poissons.","Le pêcheur jette son filet dans la lagune."),
 ("Policier","Le policier fait respecter la loi et protège les habitants.","Le policier règle la circulation."),
 ("Pompier","Le pompier éteint les incendies et porte secours.","Les pompiers arrivent avec leur camion."),
 ("Sage-femme","La sage-femme aide les mamans à accoucher.","La sage-femme accueille le nouveau-né."),
 ("Tailleur","Le tailleur coupe et assemble les tissus.","Le tailleur prend mes mesures."),
 ("Vendeur","Le vendeur propose des marchandises aux clients.","Le vendeur de beignets passe dans la rue."),
 ("Vétérinaire","Le vétérinaire soigne les animaux.","Le vétérinaire vaccine les chèvres."),
]

FAMILIES["Objets"] = [
 ("Aiguille","L'aiguille est une fine tige pointue pour coudre.","J'enfile le fil dans l'aiguille."),
 ("Bassine","La bassine est un grand récipient pour l'eau ou le linge.","Maman lave le linge dans la bassine."),
 ("Bicyclette","La bicyclette est un véhicule à deux roues et à pédales.","Je vais à l'école à bicyclette."),
 ("Bouteille","La bouteille contient un liquide.","La bouteille d'eau est fraîche."),
 ("Casserole","La casserole sert à faire cuire les aliments.","L'eau bout dans la casserole."),
 ("Ciseaux","Les ciseaux servent à couper le papier ou le tissu.","Je découpe la feuille avec des ciseaux."),
 ("Clé","La clé permet d'ouvrir et de fermer une serrure.","J'ai perdu la clé de la maison."),
 ("Horloge","L'horloge indique l'heure.","L'horloge marque huit heures."),
 ("Lampe","La lampe éclaire quand il fait sombre.","La lampe éclaire la chambre."),
 ("Marteau","Le marteau sert à enfoncer les clous.","Le menuisier frappe le clou avec un marteau."),
 ("Moto","La moto est un véhicule rapide à deux roues.","Le zémidjan conduit sa moto en ville."),
 ("Panier","Le panier est un récipient tressé pour transporter des objets.","Le panier est rempli de tomates."),
 ("Parapluie","Le parapluie protège de la pluie.","J'ouvre mon parapluie sous l'averse."),
 ("Pirogue","La pirogue est une barque étroite taillée dans un tronc.","La pirogue glisse sur le lac."),
 ("Radio","La radio diffuse des émissions que l'on écoute.","Papa écoute les informations à la radio."),
 ("Savon","Le savon sert à se laver et à nettoyer.","Je me lave les mains avec du savon."),
 ("Seau","Le seau sert à transporter de l'eau.","Je remplis le seau à la pompe."),
 ("Téléphone","Le téléphone permet de parler à distance.","J'appelle ma tante au téléphone."),
 ("Voiture","La voiture est un véhicule à quatre roues.","La voiture roule sur la route goudronnée."),
]

FAMILIES["Bénin et société"] = [
 ("Bénin","Le Bénin est notre pays, situé en Afrique de l'Ouest.","Le Bénin a pour capitale Porto-Novo."),
 ("Cotonou","Cotonou est la plus grande ville du Bénin.","Le port de Cotonou est très animé."),
 ("Porto-Novo","Porto-Novo est la capitale officielle du Bénin.","L'Assemblée nationale siège à Porto-Novo."),
 ("Drapeau","Le drapeau est l'emblème coloré d'un pays.","Le drapeau béninois est vert, jaune et rouge."),
 ("Hymne","L'hymne est le chant officiel d'un pays.","Nous chantons l'hymne national le lundi."),
 ("Marché","Le marché est le lieu où l'on achète et vend.","Le marché Dantokpa est immense."),
 ("Village","Un village est un petit groupe d'habitations à la campagne."," Mon village compte deux cents habitants."),
 ("Ville","Une ville est une grande agglomération.","La ville est bruyante le matin."),
 ("Route","La route relie les villes et les villages.","La route de Parakou est goudronnée."),
 ("Mairie","La mairie est le bâtiment où travaille le maire.","On déclare les naissances à la mairie."),
 ("Hôpital","L'hôpital soigne les malades et les blessés.","L'ambulance conduit le blessé à l'hôpital."),
 ("Dispensaire","Le dispensaire est un petit centre de soins.","Le dispensaire vaccine les enfants."),
 ("Fête","Une fête est un jour de réjouissance.","La fête de l'igname réunit tout le village."),
 ("Tam-tam","Le tam-tam est un tambour traditionnel.","Le tam-tam appelle les danseurs."),
 ("Pagne","Le pagne est un tissu coloré que l'on porte.","Maman porte un beau pagne."),
 ("Zémidjan","Le zémidjan est un taxi-moto très répandu au Bénin.","Je prends un zémidjan pour aller au marché."),
 ("Politesse","La politesse consiste à respecter les autres par ses paroles et ses gestes.","Dire bonjour est une marque de politesse."),
 ("Solidarité","La solidarité, c'est s'entraider entre voisins et amis.","La solidarité aide le village après l'orage."),
 ("Respect","Le respect, c'est traiter les autres avec considération.","Je salue les aînés par respect."),
 ("Travail","Le travail est l'effort que l'on fait pour produire ou apprendre.","Le travail bien fait apporte la réussite."),
]

FAMILIES["Nombres et mesures"] = [
 ("Addition","L'addition réunit deux nombres pour en trouver le total.","2 + 3 = 5 est une addition."),
 ("Soustraction","La soustraction enlève un nombre à un autre.","7 − 2 = 5 est une soustraction."),
 ("Multiplication","La multiplication additionne plusieurs fois le même nombre.","4 × 3 revient à additionner 3 quatre fois."),
 ("Division","La division partage un nombre en parts égales.","12 ÷ 4 = 3 : douze bonbons pour quatre enfants."),
 ("Chiffre","Un chiffre est un signe qui sert à écrire les nombres.","Le nombre 25 s'écrit avec deux chiffres."),
 ("Nombre","Un nombre indique une quantité.","Il y a 40 élèves dans la classe."),
 ("Dizaine","Une dizaine est un groupe de dix unités.","30 contient trois dizaines."),
 ("Centaine","Une centaine est un groupe de cent unités.","400 contient quatre centaines."),
 ("Moitié","La moitié est l'une des deux parts égales d'un tout.","La moitié de 10 est 5."),
 ("Double","Le double est deux fois la même quantité.","Le double de 6 est 12."),
 ("Mètre","Le mètre sert à mesurer les longueurs.","La table mesure un mètre de long."),
 ("Kilogramme","Le kilogramme sert à mesurer les masses.","Le sac pèse cinq kilogrammes."),
 ("Litre","Le litre sert à mesurer les liquides.","J'achète un litre d'huile."),
 ("Heure","L'heure sert à mesurer le temps.","La classe commence à huit heures."),
 ("Minute","Une minute vaut soixante secondes.","La récréation dure quinze minutes."),
 ("Carré","Le carré a quatre côtés égaux et quatre angles droits.","Le carreau du sol est un carré."),
 ("Rectangle","Le rectangle a quatre angles droits et des côtés opposés égaux.","Le tableau est un rectangle."),
 ("Triangle","Le triangle est une figure à trois côtés.","Le toit forme un triangle."),
 ("Cercle","Le cercle est une figure ronde et parfaitement régulière.","La roue a la forme d'un cercle."),
]

FAMILIES["Santé et hygiène"] = [
 ("Hygiène","L'hygiène regroupe les gestes qui gardent le corps propre et sain.","L'hygiène protège des maladies."),
 ("Microbe","Un microbe est un être vivant minuscule qui peut rendre malade.","Se laver les mains élimine les microbes."),
 ("Maladie","Une maladie empêche le corps de fonctionner normalement.","Il est resté à la maison à cause de la maladie."),
 ("Paludisme","Le paludisme est une maladie transmise par le moustique.","La moustiquaire protège du paludisme."),
 ("Vaccin","Le vaccin protège le corps contre certaines maladies.","Le bébé a reçu son vaccin au dispensaire."),
 ("Pharmacie","La pharmacie vend les médicaments.","J'achète le sirop à la pharmacie."),
 ("Fièvre","La fièvre est une température du corps plus élevée que la normale.","Il a de la fièvre depuis hier."),
 ("Blessure","Une blessure est une coupure ou une plaie sur le corps.","On nettoie la blessure avant le pansement."),
 ("Repos","Le repos permet au corps de récupérer ses forces.","Le malade a besoin de repos."),
 ("Sommeil","Le sommeil est le moment où l'on dort et où le corps se répare.","Un bon sommeil aide à bien apprendre."),
 ("Propreté","La propreté est l'état de ce qui est bien nettoyé.","La propreté de la classe est l'affaire de tous."),
 ("Ordure","Les ordures sont les déchets à jeter.","On jette les ordures dans la poubelle."),
]

FAMILIES["Temps"] = [
 ("Année","L'année compte douze mois.","L'année scolaire commence en septembre."),
 ("Mois","Le mois est une partie de l'année ; il y en a douze.","Le mois de janvier est le premier de l'année."),
 ("Semaine","La semaine compte sept jours.","La semaine de classe va du lundi au vendredi."),
 ("Jour","Le jour dure vingt-quatre heures.","Il y a sept jours dans une semaine."),
 ("Matin","Le matin est le début de la journée.","Je me lève tôt le matin."),
 ("Midi","Midi est le milieu de la journée.","Nous mangeons à midi."),
 ("Après-midi","L'après-midi va de midi au soir.","La classe reprend l'après-midi."),
 ("Soir","Le soir est la fin de la journée.","Je révise mes leçons le soir."),
 ("Nuit","La nuit est la période sombre où l'on dort.","Les étoiles brillent la nuit."),
 ("Hier","Hier est le jour qui précède aujourd'hui.","Hier, il a plu toute la journée."),
 ("Aujourd'hui","Aujourd'hui est le jour présent.","Aujourd'hui, nous avons une dictée."),
 ("Demain","Demain est le jour qui suit aujourd'hui.","Demain, nous irons au champ."),
 ("Vacances","Les vacances sont une période sans école.","Les grandes vacances durent trois mois."),
]


FAMILIES["Verbes d'action"] = [
 ("Aider","Aider, c'est apporter son soutien à quelqu'un.","J'aide ma sœur à porter le seau."),
 ("Apprendre","Apprendre, c'est acquérir de nouvelles connaissances.","J'apprends à lire et à écrire."),
 ("Arroser","Arroser, c'est verser de l'eau sur les plantes.","J'arrose les tomates du jardin."),
 ("Balayer","Balayer, c'est nettoyer le sol avec un balai.","Je balaie la classe avant le cours."),
 ("Boire","Boire, c'est avaler un liquide.","Je bois beaucoup d'eau quand il fait chaud."),
 ("Chanter","Chanter, c'est produire une mélodie avec la voix.","Les élèves chantent l'hymne national."),
 ("Chercher","Chercher, c'est essayer de trouver quelque chose.","Je cherche mon crayon dans la trousse."),
 ("Compter","Compter, c'est dire les nombres dans l'ordre.","Je compte jusqu'à cent."),
 ("Courir","Courir, c'est se déplacer très vite sur ses jambes.","Les enfants courent dans la cour."),
 ("Couper","Couper, c'est séparer en deux avec un objet tranchant.","Je coupe le papier avec des ciseaux."),
 ("Cuisiner","Cuisiner, c'est préparer des aliments.","Maman cuisine la sauce d'arachide."),
 ("Danser","Danser, c'est bouger en rythme avec la musique.","Nous dansons au son du tam-tam."),
 ("Dessiner","Dessiner, c'est représenter avec des traits.","Je dessine une maison."),
 ("Dormir","Dormir, c'est se reposer en fermant les yeux.","Je dors huit heures chaque nuit."),
 ("Écouter","Écouter, c'est prêter attention aux sons.","J'écoute le maître attentivement."),
 ("Écrire","Écrire, c'est tracer des mots avec un stylo.","J'écris la date sur mon cahier."),
 ("Grandir","Grandir, c'est devenir plus grand.","L'enfant grandit vite."),
 ("Jouer","Jouer, c'est s'amuser seul ou avec d'autres.","Nous jouons au football."),
 ("Laver","Laver, c'est nettoyer avec de l'eau.","Je lave mes mains avant de manger."),
 ("Lire","Lire, c'est comprendre un texte écrit.","Je lis une histoire à voix haute."),
 ("Manger","Manger, c'est avaler de la nourriture.","Nous mangeons à midi."),
 ("Marcher","Marcher, c'est avancer à pied.","Je marche jusqu'à l'école."),
 ("Nager","Nager, c'est se déplacer dans l'eau.","Il apprend à nager dans la rivière."),
 ("Parler","Parler, c'est s'exprimer avec des mots.","Je parle fon et français."),
 ("Partager","Partager, c'est donner une partie de ce que l'on a.","Je partage mon goûter avec mon ami."),
 ("Planter","Planter, c'est mettre une graine en terre.","Nous plantons un arbre dans la cour."),
 ("Ranger","Ranger, c'est remettre chaque chose à sa place.","Je range mes cahiers dans le sac."),
 ("Regarder","Regarder, c'est diriger les yeux vers quelque chose.","Je regarde le tableau."),
 ("Respirer","Respirer, c'est faire entrer et sortir l'air des poumons.","Je respire profondément."),
 ("Sauter","Sauter, c'est quitter le sol d'un bond.","Je saute par-dessus la flaque."),
 ("Travailler","Travailler, c'est faire un effort pour produire ou apprendre.","Mon père travaille au champ."),
 ("Vendre","Vendre, c'est donner un objet contre de l'argent.","Elle vend des beignets au marché."),
 ("Voyager","Voyager, c'est se déplacer vers un autre lieu.","Nous voyageons jusqu'à Parakou."),
]

FAMILIES["Qualités et défauts"] = [
 ("Courage","Le courage, c'est affronter la difficulté sans fuir.","Il a eu le courage de dire la vérité."),
 ("Générosité","La générosité, c'est donner volontiers aux autres.","Sa générosité aide beaucoup d'élèves."),
 ("Honnêteté","L'honnêteté, c'est dire la vérité et ne pas voler.","L'honnêteté inspire confiance."),
 ("Patience","La patience, c'est savoir attendre sans s'énerver.","La patience vient à bout de tout."),
 ("Paresse","La paresse, c'est éviter l'effort et le travail.","La paresse empêche de réussir."),
 ("Politesse","La politesse, c'est parler et agir avec respect.","La politesse ouvre toutes les portes."),
 ("Propre","Être propre, c'est ne pas être sale.","Mon uniforme est propre."),
 ("Sage","Être sage, c'est se comporter calmement et correctement.","L'élève sage écoute la leçon."),
 ("Gentil","Être gentil, c'est se montrer aimable avec les autres.","Ma voisine est très gentille."),
 ("Méchant","Être méchant, c'est faire du mal aux autres.","Il ne faut pas être méchant avec les plus petits."),
 ("Curieux","Être curieux, c'est avoir envie d'apprendre et de comprendre.","L'élève curieux pose beaucoup de questions."),
 ("Attentif","Être attentif, c'est bien écouter et se concentrer.","Sois attentif pendant la dictée."),
]

FAMILIES["Sentiments"] = [
 ("Joie","La joie est un sentiment de grand bonheur.","La joie éclaire son visage."),
 ("Tristesse","La tristesse est un sentiment de peine.","La tristesse se lit dans ses yeux."),
 ("Peur","La peur est le sentiment que l'on ressent devant un danger.","Il a eu peur de l'orage."),
 ("Colère","La colère est une forte émotion de mécontentement.","Il faut se calmer quand on est en colère."),
 ("Amour","L'amour est un sentiment d'affection profonde.","L'amour d'une mère est immense."),
 ("Amitié","L'amitié est le lien qui unit deux amis.","Notre amitié dure depuis le CI."),
 ("Espoir","L'espoir, c'est croire que les choses iront mieux.","L'espoir donne la force de continuer."),
 ("Fierté","La fierté est la satisfaction d'avoir bien fait.","Il ressent de la fierté après sa réussite."),
 ("Honte","La honte est le malaise que l'on ressent après une faute.","Il a eu honte d'avoir menti."),
 ("Surprise","La surprise est ce que l'on ressent devant l'inattendu.","Quelle belle surprise !"),
]

FAMILIES["Vêtements"] = [
 ("Chapeau","Le chapeau se porte sur la tête et protège du soleil.","Je mets un chapeau pour aller au champ."),
 ("Chaussure","La chaussure protège le pied.","Je cire mes chaussures le dimanche."),
 ("Chemise","La chemise est un vêtement à boutons porté sur le haut du corps.","Ma chemise d'uniforme est kaki."),
 ("Culotte","La culotte est un pantalon court.","Il porte une culotte pour jouer."),
 ("Foulard","Le foulard est un tissu que l'on noue autour de la tête ou du cou.","Elle noue un foulard sur ses cheveux."),
 ("Jupe","La jupe est un vêtement féminin porté sur le bas du corps.","Sa jupe est bleue."),
 ("Pantalon","Le pantalon couvre les deux jambes.","Mon pantalon est trop court."),
 ("Robe","La robe est un vêtement d'une seule pièce.","Elle porte une robe de fête."),
 ("Sandale","La sandale est une chaussure ouverte.","Je mets mes sandales pour aller au marché."),
 ("Tissu","Le tissu est la matière avec laquelle on fait les vêtements.","Le tissu wax est très coloré."),
]

FAMILIES["Sports et jeux"] = [
 ("Football","Le football se joue à onze contre onze avec un ballon.","Nous jouons au football après la classe."),
 ("Ballon","Le ballon est une balle ronde utilisée dans les jeux.","Le ballon roule dans la cour."),
 ("Course","La course est une épreuve de vitesse.","Il a gagné la course de cent mètres."),
 ("Saut","Le saut consiste à bondir le plus loin ou le plus haut possible.","Le saut en longueur demande de l'élan."),
 ("Équipe","Une équipe est un groupe de joueurs du même camp.","Notre équipe a gagné le match."),
 ("Match","Un match oppose deux équipes.","Le match se joue samedi."),
 ("Arbitre","L'arbitre fait respecter les règles du jeu.","L'arbitre siffle la fin du match."),
 ("Awalé","L'awalé est un jeu traditionnel africain avec des graines.","Les anciens jouent à l'awalé sous l'arbre."),
 ("Corde à sauter","La corde à sauter est un jeu où l'on saute par-dessus une corde.","Les filles jouent à la corde à sauter."),
 ("Lutte","La lutte est un sport de combat sans coups.","La lutte traditionnelle attire beaucoup de monde."),
]

FAMILIES["Musique et arts"] = [
 ("Chanson","Une chanson est un texte mis en musique.","Nous apprenons une chanson en classe."),
 ("Flûte","La flûte est un instrument à vent.","Le berger joue de la flûte."),
 ("Guitare","La guitare est un instrument à cordes.","Il gratte sa guitare le soir."),
 ("Tambour","Le tambour est un instrument que l'on frappe.","Le tambour rythme la danse."),
 ("Danse","La danse est l'art de bouger en rythme.","La danse traditionnelle raconte une histoire."),
 ("Masque","Le masque est un objet porté sur le visage lors des cérémonies.","Le masque Guèlèdè est célèbre au Bénin."),
 ("Peinture","La peinture est l'art de représenter avec des couleurs.","La peinture décore le mur de l'école."),
 ("Couleur","Une couleur est la teinte que l'œil perçoit.","Le vert est ma couleur préférée."),
 ("Conte","Un conte est une histoire racontée, souvent le soir.","Grand-mère raconte un conte avant de dormir."),
 ("Proverbe","Un proverbe est une phrase courte qui transmet une sagesse.","« La patience vient à bout de tout » est un proverbe."),
]

FAMILIES["Transport"] = [
 ("Avion","L'avion vole et transporte des passagers.","L'avion décolle de l'aéroport de Cotonou."),
 ("Bateau","Le bateau navigue sur l'eau.","Le bateau accoste au port."),
 ("Camion","Le camion transporte de lourdes marchandises.","Le camion livre des sacs de ciment."),
 ("Train","Le train roule sur des rails.","Le train relie deux villes."),
 ("Taxi","Le taxi transporte des passagers contre paiement.","Je prends un taxi pour aller à la gare."),
 ("Charrette","La charrette est tirée par un animal et transporte des charges.","La charrette est pleine de bois."),
 ("Route","La route est la voie sur laquelle circulent les véhicules.","La route est glissante après la pluie."),
 ("Pont","Le pont permet de franchir un cours d'eau.","Le pont enjambe la rivière."),
 ("Voyage","Un voyage est un déplacement vers un autre lieu.","Le voyage dure trois heures."),
 ("Carburant","Le carburant fait fonctionner les moteurs.","Le chauffeur achète du carburant."),
]

FAMILIES["Sciences"] = [
 ("Air","L'air est le gaz invisible que nous respirons.","Le ballon est rempli d'air."),
 ("Chaleur","La chaleur est ce que l'on ressent près du feu ou au soleil.","La chaleur est forte à midi."),
 ("Électricité","L'électricité fait fonctionner les lampes et les appareils.","L'électricité éclaire la maison."),
 ("Énergie","L'énergie est ce qui permet de produire un mouvement ou de la chaleur.","Le soleil fournit de l'énergie."),
 ("Feu","Le feu produit de la lumière et de la chaleur en brûlant.","Le feu chauffe la marmite."),
 ("Glace","La glace est de l'eau devenue solide par le froid.","La glace fond au soleil."),
 ("Lumière","La lumière permet de voir les objets.","La lumière du jour entre par la fenêtre."),
 ("Ombre","L'ombre est la zone sombre derrière un objet éclairé.","Je m'assois à l'ombre du manguier."),
 ("Plante","Une plante est un être vivant qui pousse dans la terre.","La plante a besoin d'eau et de lumière."),
 ("Poids","Le poids indique à quel point un objet est lourd.","Le poids du sac est de dix kilos."),
 ("Son","Le son est ce que l'on entend.","Le son de la cloche annonce la récréation."),
 ("Vapeur","La vapeur est de l'eau transformée en gaz par la chaleur.","La vapeur sort de la marmite."),
 ("Aimant","L'aimant attire les objets en fer.","L'aimant attire les clous."),
 ("Machine","Une machine est un appareil qui facilite le travail.","La machine à coudre assemble le tissu."),
 ("Ordinateur","L'ordinateur traite des informations et affiche des images.","L'ordinateur sert à taper des textes."),
]

FAMILIES["Géographie"] = [
 ("Afrique","L'Afrique est le continent où se trouve le Bénin.","Le Bénin est situé en Afrique de l'Ouest."),
 ("Continent","Un continent est une très grande étendue de terre.","L'Afrique est un continent."),
 ("Pays","Un pays est un territoire avec ses habitants et son gouvernement.","Le Bénin est mon pays."),
 ("Capitale","La capitale est la ville principale d'un pays.","Porto-Novo est la capitale du Bénin."),
 ("Frontière","La frontière sépare deux pays.","Le Niger se trouve à notre frontière nord."),
 ("Carte","Une carte représente un territoire dessiné en petit.","Je repère Cotonou sur la carte."),
 ("Nord","Le nord est l'un des quatre points cardinaux.","Parakou se trouve au nord du pays."),
 ("Sud","Le sud est opposé au nord.","Cotonou est au sud du Bénin."),
 ("Est","Le soleil se lève à l'est.","Le Nigeria est à l'est du Bénin."),
 ("Ouest","Le soleil se couche à l'ouest.","Le Togo est à l'ouest du Bénin."),
 ("Océan","L'océan est une immense étendue d'eau salée.","L'océan Atlantique borde le Bénin."),
 ("Île","Une île est une terre entourée d'eau.","Le village lacustre ressemble à une île."),
 ("Climat","Le climat est le temps qu'il fait habituellement dans une région.","Le climat du Bénin est chaud et humide."),
 ("Population","La population est l'ensemble des habitants d'un lieu.","La population de la ville augmente."),
 ("Département","Le département est une grande division administrative du pays.","Le Bénin compte douze départements."),
]

FAMILIES["Grammaire"] = [
 ("Alphabet","L'alphabet est l'ensemble des lettres d'une langue.","L'alphabet français compte vingt-six lettres."),
 ("Voyelle","Les voyelles sont les lettres a, e, i, o, u et y.","Le mot « ami » contient deux voyelles."),
 ("Consonne","Les consonnes sont toutes les lettres qui ne sont pas des voyelles.","Le mot « train » commence par une consonne."),
 ("Syllabe","La syllabe est un groupe de sons prononcé en une fois.","« É-co-le » a trois syllabes."),
 ("Mot","Un mot est un groupe de lettres qui a un sens.","Cette phrase contient six mots."),
 ("Phrase","Une phrase commence par une majuscule et finit par un point.","J'écris une phrase correcte."),
 ("Nom","Le nom désigne une personne, un animal ou une chose.","« Élève » est un nom."),
 ("Verbe","Le verbe indique une action ou un état.","Dans « je cours », le verbe est « courir »."),
 ("Adjectif","L'adjectif donne une qualité au nom.","Dans « grand arbre », « grand » est un adjectif."),
 ("Pluriel","Le pluriel indique qu'il y a plusieurs éléments.","Le pluriel de « livre » est « livres »."),
 ("Singulier","Le singulier indique un seul élément.","« Un cahier » est au singulier."),
 ("Majuscule","La majuscule est une grande lettre en début de phrase ou de nom propre.","Cotonou prend une majuscule."),
 ("Accent","L'accent est un petit signe placé sur une voyelle.","« École » porte un accent aigu."),
 ("Ponctuation","La ponctuation organise la phrase avec des signes.","Le point termine la phrase."),
 ("Dictionnaire","Le dictionnaire donne le sens des mots, classés par ordre alphabétique.","Je cherche le mot dans le dictionnaire."),
]

def norm(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

def main():
    out = io.StringIO()
    out.write("""/**
 * DICTIONNAIRE DES PETITS ÉCOLIERS — corpus étendu (v36).
 *
 * Contenu ORIGINAL rédigé pour Master Soutien Pédagogique : chaque mot est
 * accompagné d'une définition simple (niveau maternelle / primaire) et d'un
 * exemple concret, souvent ancré dans la vie quotidienne au Bénin.
 *
 * Ce fichier est GÉNÉRÉ par tools/genDictionary.py à partir de tables
 * thématiques écrites à la main. Pour ajouter des mots, modifiez le script
 * puis relancez-le.
 */

export interface PackWord {
  word: string;
  definition: string;
  example: string;
  family: string;
}

const w = (word: string, definition: string, example: string, family: string): PackWord =>
  ({ word, definition, example, family });

export const DICTIONARY_PACK: PackWord[] = [
""")
    total = 0
    seen = set()
    for family, items in FAMILIES.items():
        out.write("  // ----- %s -----\n" % family)
        for word, d, ex in items:
            k = word.lower()
            if k in seen:
                continue
            seen.add(k)
            out.write("  w('%s', '%s', '%s', '%s'),\n" % (norm(word), norm(d), norm(ex), norm(family)))
            total += 1
    out.write("];\n\nexport const DICTIONARY_PACK_COUNT = %d;\n" % total)

    path = os.path.join(os.path.dirname(__file__), "..", "src", "utils", "kidsDictionaryPack.ts")
    with open(os.path.abspath(path), "w", encoding="utf-8") as f:
        f.write(out.getvalue())
    print("mots écrits :", total)

if __name__ == "__main__":
    main()
