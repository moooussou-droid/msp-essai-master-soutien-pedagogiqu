/**
 * Dictionnaire des petits écoliers — contenu supplémentaire « façon Encarta Junior ».
 *
 * Encarta Junior était la version pour enfants (8-12 ans) de l'encyclopédie
 * Encarta : articles courts, images, monde des animaux, espace, corps humain,
 * pays du monde, histoire simple. Les entrées ci-dessous sont des contenus
 * ORIGINAUX écrits dans ce même esprit (définition facile + exemple),
 * ajoutés aux mots déjà présents dans le dictionnaire.
 */

export interface JuniorWord {
  word: string;
  definition: string;
  example: string;
  family: string;
}

const w = (word: string, definition: string, example: string, family: string): JuniorWord =>
  ({ word, definition, example, family });

export const JUNIOR_WORDS: JuniorWord[] = [
  // ----- Animaux -----
  w('Lion', 'Le lion est un grand félin de la savane. Il vit en groupe et on l’appelle le roi des animaux.', 'Le lion rugit la nuit.', 'Animaux'),
  w('Éléphant', 'L’éléphant est le plus grand animal terrestre. Il a une trompe pour saisir les objets et de grandes oreilles.', 'L’éléphant boit avec sa trompe.', 'Animaux'),
  w('Girafe', 'La girafe est un très grand animal au long cou. Elle mange les feuilles des arbres hauts.', 'La girafe broute les feuilles des acacias.', 'Animaux'),
  w('Singe', 'Le singe est un animal qui grimpe aux arbres et mange des fruits.', 'Le singe saute de branche en branche.', 'Animaux'),
  w('Serpent', 'Le serpent est un animal sans pattes qui rampe. Certains sont dangereux, d’autres non.', 'Il faut s’éloigner des serpents.', 'Animaux'),
  w('Hippopotame', 'L’hippopotame est un gros animal qui passe la journée dans l’eau des rivières.', "L'hippopotame sort la nuit pour brouter.", 'Animaux'),
  w('Chèvre', 'La chèvre est un animal élevé à la maison. Elle donne du lait et aide aux travaux.', 'La chèvre broute dans la cour.', 'Animaux'),
  w('Poule', 'La poule est un oiseau de la basse-cour qui pond des œufs.', 'La poule couve ses œufs.', 'Animaux'),

  // ----- Nature -----
  w('Saison des pluies', 'La saison des pluies est la période où il pleut beaucoup. Les champs reverdissent.', 'Au Bénin, la grande saison des pluies va de mai à octobre.', 'Nature'),
  w('Rivière', 'Une rivière est un cours d’eau plus petit qu’un fleuve.', 'Les enfants pêchent dans la rivière.', 'Nature'),
  w('Arbre', 'L’arbre est une grande plante avec un tronc en bois. Il donne de l’ombre, des fruits et de l’air pur.', 'Le manguier est un arbre fruitier.', 'Nature'),
  w('Fleur', 'La fleur est la partie colorée de la plante. Elle donne souvent des graines.', 'Les abeilles visitent les fleurs.', 'Nature'),
  w('Pluie', 'La pluie est l’eau qui tombe du ciel.', 'La pluie arrose les champs.', 'Nature'),
  w('Vent', 'Le vent est l’air qui bouge. Il peut être doux ou très fort.', 'Le vent fait voler les feuilles.', 'Nature'),
  w('Sable', 'Le sable est fait de tout petits grains de roche.', 'Les enfants jouent dans le sable.', 'Nature'),
  w('Soleil', 'Le soleil est l’étoile qui nous éclaire et nous réchauffe.', 'Le soleil se lève à l’est.', 'Nature'),

  // ----- Le corps -----
  w('Cœur', 'Le cœur est le muscle qui pompe le sang dans le corps.', 'Le cœur bat vite après la course.', 'Le corps'),
  w('Cerveau', 'Le cerveau est l’organe qui permet de penser, apprendre et se souvenir.', 'Le cerveau commande le corps.', 'Le corps'),
  w('Poumons', 'Les poumons servent à respirer. Ils prennent l’air et rejettent le gaz carbonique.', 'On respire avec les poumons.', 'Le corps'),
  w('Sang', 'Le sang est le liquide rouge qui circule dans le corps et apporte la nourriture et l’oxygène.', 'Une petite coupure laisse couler du sang.', 'Le corps'),
  w('Os', 'Les os forment le squelette qui soutient le corps.', 'Le squelette a plus de 200 os.', 'Le corps'),
  w('Peau', 'La peau est l’enveloppe qui protège tout le corps.', 'La peau nous protège des microbes.', 'Le corps'),

  // ----- L'espace -----
  w('Lune', 'La lune est le satellite naturel de la Terre. Elle brille la nuit avec la lumière du soleil.', 'Il y a une pleine lune ce soir.', 'L’espace'),
  w('Étoile', 'Une étoile est un astre qui produit sa propre lumière.', 'Les étoiles scintillent dans le ciel.', 'L’espace'),
  w('Planète', 'Une planète est un grand astre qui tourne autour du soleil.', 'La Terre est notre planète.', 'L’espace'),
  w('Fusée', 'Une fusée est un véhicule qui emporte des voyageurs dans l’espace.', 'La fusée décolle vers les étoiles.', 'L’espace'),
  w('Astronaute', 'Un astronaute est une personne qui voyage dans l’espace.', 'L’astronaute flotte dans sa combinaison.', 'L’espace'),
  w('Comète', 'Une comète est un astre de glace et de poussière qui laisse une longue queue dans le ciel.', 'La comète brille comme une étoile filante.', 'L’espace'),

  // ----- Le monde -----
  w('Afrique', 'L’Afrique est le continent où se trouve le Bénin.', 'L’Afrique est riche en cultures et en paysages.', 'Le monde'),
  w('Bénin', 'Le Bénin est notre pays, en Afrique de l’Ouest. Sa capitale est Porto-Novo.', 'Le drapeau du Bénin est vert, jaune et rouge.', 'Le monde'),
  w('Togo', 'Le Togo est le pays voisin du Bénin à l’ouest.', 'Le Togo partage une frontière avec le Bénin.', 'Le monde'),
  w('Nigeria', 'Le Nigeria est le grand pays voisin du Bénin à l’est.', 'Le Nigeria est très peuplé.', 'Le monde'),
  w('France', 'La France est un pays d’Europe. Le français est sa langue officielle.', 'La France est loin de l’Afrique, de l’autre côté de la mer.', 'Le monde'),
  w('Océan', 'Un océan est une très grande étendue d’eau salée.', 'Le Bénin est bordé par l’océan Atlantique.', 'Le monde'),
  w('Montagne', 'Une montagne est un relief très élevé.', 'La chaine de l’Atacora est au nord du Bénin.', 'Le monde'),
  w('Désert', 'Un désert est une région où il pleut très peu.', 'Le Sahara est un immense désert.', 'Le monde'),

  // ----- Histoire des enfants -----
  w('Royaume', 'Un royaume est un pays dirigé par un roi ou une reine.', 'Le royaume du Danxomè était très puissant.', 'Histoire des enfants'),
  w('Roi', 'Un roi est le chef d’un royaume.', 'Les rois d’Abomey régnaient sur le Danxomè.', 'Histoire des enfants'),
  w('Amazones', 'Les amazones étaient des guerrières célèbres du royaume du Danxomè.', 'Les amazones protégeaient le royaume.', 'Histoire des enfants'),
  w('Ancêtre', 'Un ancêtre est un membre de la famille qui a vécu autrefois.', 'On honore la mémoire des ancêtres.', 'Histoire des enfants'),
  w('Griot', 'Le griot est un conteur qui raconte l’histoire des familles et des royaumes.', 'Le griot raconte avec sa kora.', 'Histoire des enfants'),
  w('Masque', 'Un masque est un objet porté au visage pendant les cérémonies traditionnelles.', 'Les masques racontent des histoires anciennes.', 'Histoire des enfants'),

  // ----- Métiers -----
  w('Forgeron', 'Le forgeron fabrique des outils en chauffant et battant le fer.', 'Le forgeron fabrique des houes.', 'Métiers'),
  w('Pêcheur', 'Le pêcheur attrape des poissons dans la mer ou la rivière.', 'Le pêcheur part en pirogue au petit matin.', 'Métiers'),
  w('Cultivateur', 'Le cultivateur travaille la terre et fait pousser des cultures.', 'Le cultivateur plante du maïs.', 'Métiers'),
  w('Couturière', 'La couturière coud et répare les vêtements.', 'La couturière coud un uniforme.', 'Métiers'),
  w('Menuisier', 'Le menuisier fabrique des meubles et des objets en bois.', 'Le menuisier construit un banc.', 'Métiers'),
  w('Vendeuse', 'La vendeuse vend des produits au marché.', 'La vendeuse pèse les tomates.', 'Métiers'),

  // ----- Sciences amusantes -----
  w('Aimant', 'Un aimant est un objet qui attire le fer.', 'L’aimant attire les trombones.', 'Sciences amusantes'),
  w('Électricité', 'L’électricité est une énergie invisible qui allume les lampes et fait marcher les appareils.', 'Le soleil peut produire de l’électricité.', 'Sciences amusantes'),
  w('Air', 'L’air est un mélange de gaz invisible que nous respirons.', 'Le vent, c’est de l’air qui bouge.', 'Sciences amusantes'),
  w('Eau', 'L’eau est un liquide indispensable à la vie. Elle peut être liquide, solide ou vapeur.', 'On boit de l’eau propre.', 'Sciences amusantes'),
  w('Son', 'Le son est une vibration que nos oreilles entendent.', 'Le tambour produit un son.', 'Sciences amusantes'),
  w('Lumière', 'La lumière nous permet de voir ce qui nous entoure.', 'Le soleil donne la lumière du jour.', 'Sciences amusantes'),
];
