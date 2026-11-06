/**
 * Encyclopédie — vague 3 de contenus « façon Encarta » (5 articles × 24 thèmes).
 * Contenus originaux rédigés pour l'application (structure des domaines d'Encarta).
 */

import { EncEntry } from './encyclopediaData';

const e = (term: string, simple: string, details: string, examples: string[], keywords: string[] = []): EncEntry =>
  ({ term, simple, details, examples, keywords });

export const ENCYCLOPEDIA_EXTRA_3: Record<string, EncEntry[]> = {
  dictionnaire: [
    e('Homonyme', 'Des homonymes sont des mots qui se prononcent pareil mais n’ont pas le même sens.', 'Ils s’écrivent parfois différemment : « ver », « verre » et « vers » sont des homonymes.', ['ver, verre, vers', 'mais / met / mets'], ['sens']),
    e('Rime', 'La rime répète le même son à la fin des vers.', 'Elle donne du rythme et de la musique à la poésie.', ['« chat » et « mat » riment', 'poésie en rimes'], ['poésie']),
    e('Légende', 'Une légende est un récit merveilleux qui mêle histoire et imagination.', 'Elle explique souvent un lieu ou une tradition. Les légendes se racontent de génération en génération.', ['légende d’un lac', 'histoire merveilleuse'], ['récit']),
    e('Résumé', 'Un résumé reprend l’essentiel d’un texte en peu de mots.', 'Il aide à mémoriser et à vérifier sa compréhension.', ['résumer une leçon', 'fiche de révision'], ['compréhension']),
    e('Exclamation', 'L’exclamation exprime une forte émotion.', 'Elle se termine par un point d’exclamation et se lit avec intensité.', ['« Quelle joie ! »', '« Attention ! »'], ['émotion']),
  ],
  astronomie: [
    e('Univers', 'L’univers est l’ensemble de tout ce qui existe.', 'Il contient des milliards de galaxies, d’étoiles et de planètes. Il continue de s’étendre.', ['tout ce qui existe', 'espace infini'], ['espace']),
    e('Station spatiale', 'Une station spatiale est un laboratoire qui tourne autour de la Terre.', 'Les astronautes y vivent plusieurs mois et y font des expériences en apesanteur.', ['Station spatiale internationale', 'astronautes en orbite'], ['espace']),
    e('Exoplanète', 'Une exoplanète est une planète qui tourne autour d’une autre étoile que le Soleil.', 'Des milliers d’exoplanètes ont été découvertes, et certaines pourraient ressembler à la Terre.', ['planète hors du système solaire', 'découverte d’exoplanètes'], ['planète']),
    e('Astronaute', 'Un astronaute est une personne formée pour voyager dans l’espace.', 'Il porte une combinaison pressurisée et s’entraîne des années avant sa mission.', ['astronaute à bord d’une fusée', 'marche dans l’espace'], ['espace']),
    e('Mission spatiale', 'Une mission spatiale est un voyage organisé dans l’espace.', 'Elle peut transporter des humains, des satellites ou des robots vers la Lune, Mars ou au-delà.', ['mission vers la Lune', 'sonde spatiale'], ['exploration']),
  ],
  arts: [
    e('Orchestre', 'Un orchestre rassemble des musiciens qui jouent ensemble.', 'Il peut être traditionnel (tambours, kora) ou moderne (guitares, cuivres). L’harmonie naît de l’écoute mutuelle.', ['orchestre de l’école', 'groupe de tambours'], ['musique']),
    e('Festival', 'Un festival est une grande fête culturelle qui revient chaque année.', 'Musique, danse, cinéma ou artisanat : les festivals célèbrent la culture d’une région.', ['festival du Vodun', 'festival des arts'], ['fête']),
    e('Masque', 'Un masque est un visage sculpté ou décoré porté lors des cérémonies.', 'Il peut représenter un ancêtre, un esprit ou un personnage. Les masques béninois sont mondialement connus.', ['masque guèlèdè', 'masques traditionnels'], ['culture']),
    e('Galerie', 'Une galerie est un lieu où l’on expose des œuvres d’art.', 'On y admire peintures, sculptures et photos, et on peut rencontrer les artistes.', ['galerie d’art de Cotonou', 'exposition de peintures'], ['exposition']),
    e('Chorale', 'Une chorale est un groupe de personnes qui chantent ensemble.', 'Les voix se mélangent : soprano, alto, ténor. Chanter en chœur apprend l’écoute et le partage.', ['chorale de l’église', 'chant choral de l’école'], ['chant']),
  ],
  citations: [
    e('Leçon', 'Une leçon est un enseignement tiré d’une expérience.', 'Chaque difficulté surmontée apporte sa leçon de vie.', ['tirer une leçon', 'leçon de l’échec'], ['enseignement']),
    e('Bienveillance', 'La bienveillance est la disposition à faire du bien aux autres.', 'Elle se montre par des paroles douces, de l’aide et du respect.', ['être bienveillant en classe', 'écouter sans juger'], ['bonté']),
    e('Humour', 'L’humour fait rire avec des mots ou des situations.', 'Sans blesser personne, il détend et rapproche les gens.', ['une bonne blague', 'rire ensemble'], ['joie']),
    e('Gratitude', 'La gratitude est la reconnaissance pour ce que l’on reçoit.', 'Dire merci et apprécier les efforts des autres rend la vie plus belle.', ['remercier son maître', 'dire merci'], ['reconnaissance']),
    e('Espoir', 'L’espoir est l’attente confiante de quelque chose de bon.', 'Il donne la force de travailler et de ne pas abandonner.', ['garder espoir', 'l’espoir d’une meilleure année'], ['confiance']),
  ],
  comptabilite: [
    e('Caisse', 'La caisse est l’argent disponible en espèces.', 'Elle doit être comptée et notée chaque jour pour éviter les erreurs.', ['caisse de l’APE', 'compter la caisse'], ['argent']),
    e('Reçu', 'Un reçu est une preuve écrite d’un paiement.', 'Il précise la somme, la date et le motif. Conserver les reçus évite les contestations.', ['reçu de cotisation', 'preuve de paiement'], ['preuve']),
    e('Chèque', 'Un chèque est un document qui ordonne de payer une somme.', 'La banque verse la somme au bénéficiaire indiqué sur le chèque.', ['signer un chèque', 'remise de chèque'], ['paiement']),
    e('Échéance', 'L’échéance est la date limite de paiement.', 'Respecter les échéances évite les pénalités et garde la confiance des partenaires.', ['échéance du loyer', 'date de paiement'], ['date']),
    e('Remboursement', 'Le remboursement restitue de l’argent déjà payé.', 'Il peut être partiel ou total, selon les conditions convenues.', ['remboursement d’un prêt', 'rembourser un excès'], ['retour']),
  ],
  cuisine: [
    e('Farine', 'La farine est une poudre obtenue en moulant des grains.', 'Maïs, mil, blé et manioc donnent des farines utilisées pour les bouillies, pâtes et galettes.', ['farine de maïs', 'farine de blé'], ['grains']),
    e('Huile', 'L’huile est une matière grasse liquide.', 'L’huile de palme et l’huile végétale servent à cuisiner. Un excès d’huile est mauvais pour la santé.', ['huile de palme', 'huile de tournesol'], ['graisse']),
    e('Sucre', 'Le sucre donne le goût sucré aux aliments.', 'Il apporte de l’énergie, mais il faut en consommer avec modération pour la santé.', ['sucre dans la bouillie', 'boisson sucrée'], ['goût']),
    e('Fermentation', 'La fermentation transforme les aliments grâce à des micro-organismes.', 'Elle donne le pain, le lait caillé, le soja fermenté et la bière de mil.', ['pâte qui lève', 'lait caillé'], ['transformation']),
    e('Arachide', 'L’arachide est une graine cultivée pour ses bienfaits.', 'Elle donne une sauce savoureuse et riche en protéines. Sa pâte est utilisée dans de nombreux plats.', ['sauce d’arachide', 'acras d’arachide'], ['graine']),
  ],
  droit: [
    e('Pénal', 'Le droit pénal punit les infractions.', 'Il définit les délits (vol, violence, fraude) et les sanctions correspondantes.', ['code pénal', 'sanction d’une infraction'], ['sanction']),
    e('Civil', 'Le droit civil organise les relations entre personnes.', 'Il traite des contrats, de la famille, des biens et des litiges entre citoyens.', ['droit de la famille', 'litige civil'], ['contrat']),
    e('Témoin', 'Un témoin est une personne qui a vu ou entendu un fait.', 'Son témoignage aide la justice à établir la vérité.', ['témoin d’un accident', 'témoignage au tribunal'], ['vérité']),
    e('Preuve', 'Une preuve est un élément qui démontre un fait.', 'Documents, témoignages et objets servent de preuves devant la justice.', ['preuve écrite', 'pièce à conviction'], ['démonstration']),
    e('Verdict', 'Le verdict est la décision finale du tribunal.', 'Il peut déclarer une personne coupable ou non coupable.', ['verdict du procès', 'décision de la cour'], ['décision']),
  ],
  environnement: [
    e('Faune', 'La faune est l’ensemble des animaux d’une région.', 'La faune du Bénin compte lions, éléphants, hippopotames et centaines d’oiseaux.', ['faune de la Pendjari', 'animaux sauvages'], ['animaux']),
    e('Flore', 'La flore est l’ensemble des plantes d’une région.', 'La flore tropicale offre arbres fruitiers, plantes médicinales et bois précieux.', ['flore de la forêt', 'plantes locales'], ['plantes']),
    e('Espèce menacée', 'Une espèce menacée risque de disparaître.', 'La chasse, la pollution et la destruction des habitats réduisent certaines espèces. Les parcs les protègent.', ['éléphant protégé', 'espèces en danger'], ['protection']),
    e('Érosion', 'L’érosion est l’usure du sol par l’eau ou le vent.', 'Les arbres et les cultures en terrasse limitent l’érosion des champs.', ['sols emportés par la pluie', 'planter pour retenir la terre'], ['sol']),
    e('Assainissement', 'L’assainissement protège la santé et l’environnement.', 'Latrines propres, caniveaux entretenus et déchets bien gérés évitent les maladies.', ['assainissement du quartier', 'caniveaux propres'], ['propreté']),
  ],
  finance: [
    e('Bourse', 'La bourse est le marché où s’échangent les actions des entreprises.', 'Un petit nombre d’investisseurs y achètent des parts de sociétés. Son fonctionnement reste complexe.', ['actions en bourse', 'marché financier'], ['marché']),
    e('Héritage', 'L’héritage est ce que l’on reçoit d’un proche décédé.', 'Il peut comprendre de l’argent, une maison ou des biens. Il se partage selon la loi.', ['héritage familial', 'transmission de biens'], ['famille']),
    e('Change', 'Le change convertit une monnaie en une autre.', 'Le taux de change indique combien vaut une devise par rapport à une autre.', ['changer des francs contre des euros', 'taux de change'], ['monnaie']),
    e('Frais', 'Les frais sont les dépenses liées à une activité.', 'Frais de scolarité, frais de transport, frais de matériel : il faut les prévoir dans le budget.', ['frais de scolarité', 'frais de transport'], ['dépense']),
    e('Salaire', 'Le salaire est la somme versée pour un travail.', 'Il est versé régulièrement (mensuellement souvent) et constitue le revenu principal du travailleur.', ['salaire du mois', 'paye de l’enseignant'], ['revenu']),
  ],
  geographie: [
    e('Pays', 'Un pays est un territoire avec son gouvernement et ses frontières.', 'Chaque pays a une capitale, une langue officielle et ses propres lois. Le Bénin est un pays d’Afrique de l’Ouest.', ['le Bénin, un pays', 'les pays d’Afrique'], ['territoire']),
    e('Village', 'Un village est un petit établissement humain à la campagne.', 'Les villages vivent souvent de l’agriculture, du commerce local et de la vie communautaire.', ['village du nord Bénin', 'marché du village'], ['habitat']),
    e('Météo', 'La météo décrit le temps qu’il fait aujourd’hui.', 'Pluie, soleil, vent et température : la météo change chaque jour, contrairement au climat.', ['météo du jour', 'prévisions de pluie'], ['temps']),
    e('Capitale', 'La capitale est la ville principale d’un pays.', 'Elle abrite généralement le gouvernement et les grandes institutions. La capitale du Bénin est Porto-Novo.', ['Porto-Novo, capitale du Bénin', 'capitale économique : Cotonou'], ['ville']),
    e('Climat', 'Le climat est le temps moyen d’une région sur des années.', 'Le Bénin a un climat chaud avec deux saisons des pluies au sud et une au nord.', ['climat tropical', 'saisons de pluie et de sécheresse'], ['temps']),
  ],
  hightech: [
    e('Courriel', 'Un courriel (e-mail) est un message envoyé via internet.', 'On peut y joindre des documents. C’est le courrier moderne, rapide et gratuit.', ['envoyer un courriel', 'adresse e-mail'], ['message']),
    e('Visioconférence', 'La visioconférence permet de se voir et de se parler à distance.', 'Classes virtuelles, réunions et formations utilisent cette technologie quand on ne peut pas se déplacer.', ['réunion en ligne', 'cours à distance'], ['réunion']),
    e('Données personnelles', 'Les données personnelles sont les informations sur une personne.', 'Nom, téléphone, photos : elles doivent être protégées et jamais partagées sans précaution.', ['ne pas publier ses données', 'protéger ses informations'], ['vie privée']),
    e('Impression 3D', 'L’impression 3D fabrique des objets couche par couche.', 'Maquettes, pièces techniques, prothèses : les imprimantes 3D créent des objets sur mesure.', ['objet imprimé en 3D', 'prototype'], ['fabrication']),
    e('Objet connecté', 'Un objet connecté communique avec internet ou un téléphone.', 'Montres, lampes et capteurs connectés facilitent la vie et mesurent l’activité ou la santé.', ['montre connectée', 'capteur de température'], ['internet']),
  ],
  histoire: [
    e('Archéologie', 'L’archéologie étudie le passé à partir des objets retrouvés.', 'Fouilles, poteries et ruines racontent la vie des anciens, sans textes écrits.', ['fouilles archéologiques', 'objets anciens'], ['science']),
    e('Fouille', 'Une fouille est un chantier où l’on déterre les traces du passé.', 'Les archéologues fouillent méthodiquement pour ne rien perdre.', ['chantier de fouilles', 'découverte sous la terre'], ['chantier']),
    e('Musée', 'Un musée conserve et expose des objets du passé.', 'Il aide à comprendre l’histoire et la culture. Le musée d’Abomey garde la mémoire du Danxomè.', ['musée historique d’Abomey', 'visite de musée'], ['patrimoine']),
    e('Révolution industrielle', 'La révolution industrielle a transformé le travail grâce aux machines.', 'Au XIXe siècle, machines, chemins de fer et usines ont changé la vie des hommes.', ['machines à vapeur', 'premières usines'], ['industrie']),
    e('Antiquité', 'L’Antiquité est la période des premières grandes civilisations.', 'Égypte, Grèce et Rome ont laissé écritures, monuments et lois qui inspirent encore le monde.', ['pyramides d’Égypte', 'civilisations antiques'], ['temps']),
  ],
  litterature: [
    e('Vers', 'Un vers est une ligne de poésie.', 'Il a souvent un nombre de syllabes régulier et peut comporter une rime.', ['vers de six pieds', 'alexandrin de 12 syllabes'], ['poésie']),
    e('Rime', 'La rime répète un même son à la fin de deux vers.', 'Elle relie les vers et donne de la musicalité au poème.', ['rime en « -eau »', 'rimes embrassées'], ['poésie']),
    e('Prose', 'La prose est un texte écrit sans vers.', 'Romans, contes et articles sont en prose : c’est la forme naturelle du récit.', ['récit en prose', 'roman'], ['texte']),
    e('Comédie', 'La comédie est une pièce qui fait rire.', 'Elle montre les travers des personnages avec humour et se termine souvent bien.', ['comédie de Molière', 'pièce humoristique'], ['théâtre']),
    e('Tragédie', 'La tragédie est une pièce grave et solennelle.', 'Le héros y affronte un destin difficile, et la fin est souvent malheureuse.', ['tragédie antique', 'destin tragique'], ['théâtre']),
  ],
  loisirs: [
    e('Jeux de société', 'Les jeux de société se jouent autour d’une table.', 'Dames, ludo, dominos : ils apprennent la stratégie, la patience et la convivialité.', ['jouer aux dames', 'soirée de jeux'], ['jeu']),
    e('Devinette', 'Une devinette est une question dont il faut deviner la réponse.', 'Elle fait réfléchir et amuse petits et grands.', ['« je vole sans ailes… »', 'jeu de questions'], ['jeu']),
    e('Magie', 'La magie consiste à réaliser des tours surprenants.', 'Le magicien utilise l’adresse et l’illusion. Les tours s’apprennent et s’entraînent !', ['tour de cartes', 'spectacle de magie'], ['spectacle']),
    e('Karaoké', 'Le karaoké consiste à chanter sur une musique en suivant les paroles.', 'Entre amis ou en famille, c’est un moment joyeux, même sans être chanteur.', ['soirée karaoké', 'chanter sur l’écran'], ['chant']),
    e('Collection', 'Collectionner, c’est réunir des objets par passion.', 'Timbres, cartes, photos ou cailloux : une collection raconte une histoire.', ['collection de timbres', 'collectionner les cartes'], ['passe-temps']),
  ],
  management: [
    e('Tableau de bord', 'Le tableau de bord résume les données importantes d’un coup d’œil.', 'L’école peut y suivre classes, moyennes, présences et projets.', ['tableau de bord de l’école', 'suivi des indicateurs'], ['suivi']),
    e('Mentor', 'Un mentor guide et conseille une personne moins expérimentée.', 'Les enseignants expérimentés mentorent les jeunes collègues pour mieux démarrer.', ['mentor d’un jeune enseignant', 'accompagnement professionnel'], ['conseil']),
    e('Formation continue', 'La formation continue perfectionne les compétences toute la vie.', 'Stages, ateliers et programmes officiels permettent aux enseignants d’évoluer.', ['formation des enseignants', 'atelier pédagogique'], ['formation']),
    e('Coopération', 'La coopération, c’est l’action commune vers un même but.', 'École, parents et commune coopèrent pour la réussite des élèves.', ['coopération école-parents', 'projet commun'], ['partenariat']),
    e('Coordination', 'La coordination organise les différentes équipes.', 'Le directeur coordonne les activités des classes, les dates et les moyens.', ['coordination des activités', 'répartir les rôles'], ['organisation']),
  ],
  medecine: [
    e('Ordonnance', 'L’ordonnance est le document du médecin qui prescrit les médicaments.', 'Elle précise les produits, les doses et la durée du traitement. On ne suit que ce qui est prescrit.', ['ordonnance du médecin', 'suivre le traitement'], ['médicament']),
    e('Blessure', 'Une blessure est une atteinte au corps.', 'Plaie, coupure ou entorse : il faut nettoyer et soigner rapidement pour éviter l’infection.', ['désinfecter une plaie', 'soigner une entorse'], ['soin']),
    e('Cicatrice', 'Une cicatrice est la trace qui reste après la guérison.', 'Elle rappelle la blessure mais montre que le corps a guéri.', ['cicatrice d’une coupure', 'peau réparée'], ['guérison']),
    e('Immunité', 'L’immunité est la défense naturelle du corps contre les maladies.', 'Vaccins, bonne alimentation et sommeil renforcent l’immunité.', ['défenses du corps', 'vaccination'], ['défense']),
    e('Épidémie', 'Une épidémie est la propagation rapide d’une maladie.', 'Les gestes d’hygiène, la vaccination et la surveillance sanitaire freinent les épidémies.', ['épidémie de choléra', 'propagation d’une maladie'], ['maladie']),
  ],
  psychologie: [
    e('Imagination', 'L’imagination crée des images et des idées nouvelles.', 'Elle nourrit les histoires, les inventions et les projets. Chacun peut développer son imagination.', ['inventer une histoire', 'imaginer l’avenir'], ['créativité']),
    e('Volonté', 'La volonté est la force de décider et de tenir ses décisions.', 'Elle permet de finir ce qu’on commence et de résister à la paresse.', ['volonté de réussir', 'tenir un engagement'], ['détermination']),
    e('Patience', 'La patience est la capacité d’attendre sans s’énerver.', 'Apprendre prend du temps : la patience est une alliée de la réussite scolaire.', ['attendre son tour', 'progresser pas à pas'], ['calme']),
    e('Optimisme', 'L’optimisme est la tendance à voir le bon côté des choses.', 'Un élève optimiste croit en ses progrès et rebondit après un échec.', ['voir le verre à moitié plein', 'garder le moral'], ['positif']),
    e('Espoir', 'L’espoir est l’attente confiante d’un avenir meilleur.', 'Il motive l’effort : celui qui espère travaille et progresse.', ['esprit d’espoir', 'projet d’avenir'], ['confiance']),
  ],
  religions: [
    e('Dialogue interreligieux', 'Le dialogue interreligieux fait se rencontrer les croyances différentes.', 'Il favorise la paix et le respect mutuel entre communautés.', ['rencontre entre communautés', 'semaine de la paix'], ['paix']),
    e('Charité', 'La charité est l’aide donnée à ceux qui en ont besoin.', 'Elle se manifeste par des dons, du temps et de la compassion envers les plus démunis.', ['aide aux plus pauvres', 'partage de repas'], ['solidarité']),
    e('Iftar', 'L’iftar est le repas qui rompt le jeûne du ramadan.', 'Chaque soir du ramadan, les familles et voisins partagent ce moment de convivialité.', ['repas du soir du ramadan', 'partage de l’iftar'], ['fête']),
    e('Aumône', 'L’aumône est un don fait aux personnes dans le besoin.', 'Elle est pratiquée dans plusieurs religions comme un devoir de partage.', ['donner aux pauvres', 'partage du ramadan'], ['don']),
    e('Spiritualité', 'La spiritualité est la vie intérieure qui relie à l’essentiel.', 'Croyant ou non, chacun peut cultiver sa spiritualité par la réflexion, la nature ou la méditation.', ['vie spirituelle', 'temps de réflexion'], ['intériorité']),
  ],
  sciences: [
    e('Circuit électrique', 'Un circuit électrique fait circuler le courant dans une boucle.', 'Une pile, des fils et une ampoule : si la boucle est fermée, la lampe s’allume.', ['allumer une ampoule', 'circuit en série'], ['électricité']),
    e('Réaction chimique', 'Une réaction chimique transforme des substances en d’autres.', 'La combustion, la rouille et la cuisson sont des réactions chimiques du quotidien.', ['feu qui brûle', 'rouille du fer'], ['chimie']),
    e('Évaporation', 'L’évaporation transforme un liquide en gaz.', 'L’eau chauffée ou exposée au soleil s’évapore : c’est le principe du séchage.', ['linge qui sèche', 'eau qui disparaît'], ['eau']),
    e('Condensation', 'La condensation transforme un gaz en liquide.', 'La vapeur d’eau qui touche une surface froide forme des gouttes : la buée sur les vitres.', ['buée sur le verre', 'gouttes sur la bouteille froide'], ['eau']),
    e('Méthode scientifique', 'La méthode scientifique observe, teste et conclut.', 'On pose une question, on imagine une réponse, on expérimente, puis on vérifie avant de conclure.', ['expérience de sciences', 'observer puis conclure'], ['expérience']),
  ],
  education: [
    e('Classe', 'Une classe est un groupe d’élèves qui apprend ensemble.', 'Chaque classe a son niveau, son maître et sa salle. C’est aussi le lieu où l’on apprend.', ['classe de CE2', 'la classe et ses élèves'], ['école']),
    e('Effectif', 'L’effectif est le nombre d’élèves d’une classe.', 'Un effectif raisonnable permet au maître de mieux accompagner chacun.', ['effectif de 35 élèves', 'compter les élèves'], ['élèves']),
    e('Tutorat', 'Le tutorat est l’aide d’un élève ou d’un adulte à un autre.', 'Les plus avancés soutiennent les camarades en difficulté : c’est gagnant pour les deux.', ['aide entre élèves', 'tutorat de lecture'], ['entraide']),
    e('Soutien scolaire', 'Le soutien scolaire renforce les apprentissages en dehors de la classe.', 'Séances supplémentaires, exercices adaptés et remédiation aident à combler les lacunes.', ['soutien en mathématiques', 'séance de renforcement'], ['aide']),
    e('Bibliothèque', 'Une bibliothèque est un lieu où l’on emprunte et lit des livres.', 'Elle ouvre le monde : contes, romans et documentaires y attendent les lecteurs.', ['bibliothèque de l’école', 'prêt de livres'], ['livre']),
  ],
  agriculture: [
    e('Bétail', 'Le bétail regroupe les animaux d’élevage.', 'Bœufs, moutons, chèvres : le bétail donne viande, lait et revenus aux éleveurs.', ['troupeau de bœufs', 'marché à bétail'], ['élevage']),
    e('Pâturage', 'Le pâturage est l’herbe où paissent les animaux.', 'Une bonne gestion des pâturages évite de manquer de nourriture pendant la saison sèche.', ['brouter dans les champs', 'herbe de saison'], ['herbe']),
    e('Volaille', 'La volaille regroupe les oiseaux d’élevage.', 'Poules, pintades et canards fournissent œufs et viande. L’élevage familial est très répandu.', ['élevage de pintades', 'poules de la maison'], ['oiseaux']),
    e('Apiculture', 'L’apiculture est l’élevage des abeilles.', 'Les ruches donnent du miel et pollinisent les cultures. Un métier doux mais qui demande de la prudence.', ['ruches à miel', 'récolte du miel'], ['abeilles']),
    e('Aquaculture', 'L’aquaculture élève les poissons.', 'Étangs et cages à poissons fournissent du poisson frais et des revenus aux familles.', ['étang à tilapias', 'élevage de poissons'], ['poissons']),
  ],
  benin: [
    e('Bohicon', 'Bohicon est une ville-carrefour du centre du Bénin.', 'Marché important et nœud routier, elle relie le sud agricole au nord du pays.', ['marché de Bohicon', 'carrefour du centre'], ['ville']),
    e('Ouidah', 'Ouidah est une ville historique de la côte béninoise.', 'Porte du Non-Retour, temple des Pythons et musée : la ville porte la mémoire de la traite négrière et du vodun.', ['porte du Non-Retour', 'temple des Pythons'], ['histoire']),
    e('Abomey-Calavi', 'Abomey-Calavi est la grande commune au nord de Cotonou.', 'Elle accueille l’Université d’Abomey-Calavi et une population en forte croissance.', ['université d’Abomey-Calavi', 'commune en croissance'], ['ville']),
    e('Zémidjan', 'Le zémidjan est la moto-taxi de Cotonou et des villes du Bénin.', 'Son nom vient de « zé mi djan » (« amène-moi vite »). Rapide et pratique, il faut le prendre avec casque.', ['course en zémidjan', 'moto-taxi béninois'], ['transport']),
    e('Langue yoruba', 'Le yoruba est une langue parlée dans le sud-est du Bénin et au Nigeria.', 'C’est l’une des grandes langues d’Afrique de l’Ouest, avec une riche tradition orale.', ['parler yoruba à Porto-Novo', 'langues du Bénin'], ['langue']),
  ],
  afrique: [
    e('Swahili', 'Le swahili est une grande langue d’Afrique de l’Est.', 'Il est parlé par des dizaines de millions de personnes et sert de langue de communication régionale.', ['voyager en swahili', 'langue régionale'], ['langue']),
    e('Diaspora', 'La diaspora désigne les personnes d’un pays vivant à l’étranger.', 'La diaspora africaine soutient ses familles et investit dans son pays d’origine.', ['diaspora béninoise', 'communauté à l’étranger'], ['communauté']),
    e('Panafricanisme', 'Le panafricanisme est le mouvement qui unit les peuples africains.', 'Il défend la solidarité, la dignité et la coopération entre pays d’Afrique.', ['unité africaine', 'pensée panafricaine'], ['unité']),
    e('Tourisme africain', 'Le tourisme africain fait découvrir les richesses du continent.', 'Plages, parcs naturels, musées et festivals attirent des visiteurs du monde entier.', ['safari en Afrique', 'tourisme culturel'], ['voyage']),
    e('Nollywood', 'Nollywood est l’industrie du cinéma du Nigeria.', 'Des centaines de films sortent chaque année et sont regardés dans toute l’Afrique.', ['films nigérians', 'cinéma africain'], ['cinéma']),
  ],
  sport: [
    e('Arbitre', 'L’arbitre fait respecter les règles du jeu.', 'Il est neutre et ses décisions sont définitives : sifflet, cartons et pénalités.', ['arbitre du match', 'décision de l’arbitre'], ['règles']),
    e('Entraîneur', 'L’entraîneur prépare et conseille les sportifs.', 'Il organise les entraînements, corrige la technique et motive l’équipe.', ['entraîneur de l’école', 'préparer les joueurs'], ['coach']),
    e('Gardien de but', 'Le gardien de but protège le but de son équipe.', 'Seul joueur qui peut toucher le ballon avec les mains dans sa surface, il est le dernier rempart.', ['plongeon du gardien', 'arrêt décisif'], ['football']),
    e('Marathon', 'Le marathon est une course à pied de 42,195 km.', 'Il demande des mois d’entraînement. Finir un marathon est une grande victoire personnelle.', ['courir un marathon', '42 km d’effort'], ['course']),
    e('Cyclisme', 'Le cyclisme est le sport de la bicyclette.', 'Courses sur route, au village ou en ville : le vélo allie sport, liberté et économie.', ['course de vélos', 'vélo du quotidien'], ['vélo']),
  ],
};
