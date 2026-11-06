/**
 * LE MANUEL DE L'ABONNÉ (v58, complété en v64 et v65) — contenu intégré.
 *
 * Reprend le manuel d'utilisation, pour qu'il soit consultable DANS
 * l'application et hors connexion.
 *
 * Le contenu vit ici, séparé de l'écran : la présentation peut changer
 * sans toucher au texte, et le texte peut être corrigé sans risquer de
 * casser l'affichage.
 */

import { normalizeSearch } from './textSearch';

export interface ManualStep {
  titre: string;
  /** Chemin de navigation réel, depuis l'accueil. */
  chemin: string;
  role: string;
  etapes: string[];
  /** Documents produits : PDF, Word, Excel, impression. */
  sorties?: string;
  astuce?: string;
  attention?: string;
}

export interface ManualChapter {
  id: string;
  titre: string;
  /** Résumé affiché sous le titre, avant ouverture. */
  resume: string;
  fiches: ManualStep[];
}

export const MANUAL_INTRO = [
  {
    titre: 'Trois principes à connaître',
    texte:
      '① Tout fonctionne sans internet. L’application est conçue pour la classe, '
      + 'y compris là où le réseau est absent.\n\n'
      + '② Vos données restent sur votre appareil. C’est un avantage pour la '
      + 'confidentialité, mais si vous perdez le téléphone sans sauvegarde, vous '
      + 'perdez l’année. Sauvegardez chaque semaine.\n\n'
      + '③ L’impression accompagne toujours le PDF. Chaque document peut être '
      + 'enregistré, exporté et imprimé.',
  },
  {
    titre: 'Nouveautés intégrées à ce guide',
    texte:
      '• Espace École (chapitre 15) : abonnement d’établissement de 6000 F/an (Maternelle → CM2) '
      + 'ou 10000 F/an (Maternelle → Terminale), espace propre à l’école et génération de toutes ses classes.\n\n'
      + '• Français et Anglais au Primaire (chapitre 15) : « Grammaire, Conjugaison et Orthographe '
      + 'francophones » et « Les notions basiques d’anglais pour le Primaire », avec exercices corrigés et quiz.\n\n'
      + '• Cantine (chapitre 6) : nouvelle méthode d’arrondi de sortie des denrées par intervalles — '
      + 'au quart pour l’huile, les céréales et les légumineuses, au dixième pour le sel.\n\n'
      + '• Maternelle (chapitre 3) : bulletin officiel en deux pages, grille trimestrielle '
      + 'des 10 domaines en TS/S/PS, observations, appréciation générale et visas — sans classement.\n\n'
      + '• Photos EducMaster (chapitre 3) : caméra intégrée, cadrage d’identité 800×1000, '
      + 'fond blanc et ZIP nommé matricule_NOM_Prenom_Prenom pour chaque école et chaque classe.\n\n'
      + '• Arts oraux (chapitre 16) : poésies, chants, comptines et contes classés par type et niveau, textes originaux, lecture vocale et médias audio/vidéo locaux.'
  },
  {
    titre: 'Le bouton Retour',
    texte:
      'En haut à gauche de chaque écran, le bouton Retour vous ramène à la page '
      + 'précédente — jamais brutalement à l’accueil. Explorez sans crainte.',
  },
];

export const MANUAL: ManualChapter[] = [
  {
    id: 'ch1',
    titre: '1. Premiers pas',
    resume: 'Activer, se présenter, créer sa première classe.',
    fiches: [
      {
        titre: 'Choisir et activer une formule',
        chemin: 'Écran d’accès → cartes des formules',
        role: 'Activer l’application pour un enseignant ou pour tout un établissement.',
        etapes: [
          'Formules personnelles : Essentiel 999 F/an, Complet 1500 F/an et Pro 2500 F/an.',
          'Formules École : 6000 F/an de la Maternelle au CM2, ou 10000 F/an de la Maternelle en Terminale ; elles incluent tout le Pro et l’Espace École.',
          'Choisissez la carte de la formule payée, saisissez le nom de l’abonné et le code reçu : l’application reconnaît automatiquement la formule du code.',
          'Direction d’école : après activation, ouvrez Accueil → Mon école pour créer l’espace de l’établissement et générer ses classes (voir le chapitre 15).',
        ],
        attention: 'Un code personnel n’est pas un code École. Pour l’espace tenu par la direction, demandez spécialement une formule École de 6000 ou 10000 F.',
      },
      {
        titre: 'Mon profil',
        chemin: 'Accueil → icône Profil',
        role: 'Renseigner votre identité et celle de l’école : ces informations figurent sur tous vos documents.',
        etapes: [
          'Saisissez votre nom, celui de l’école, la circonscription et la commune.',
          'Ajoutez le logo de l’école si vous le souhaitez.',
          'Enregistrez : bulletins, PV, reçus et courriers reprendront ces mentions.',
        ],
        astuce: 'Remplissez ce profil avant votre premier document, pour ne pas avoir à tout réimprimer.',
      },
      {
        titre: 'Créer une classe',
        chemin: 'Accueil → « + Classe »',
        role: 'Créer l’espace de travail d’une classe : c’est le point de départ de tout le reste.',
        etapes: [
          'Touchez « + Classe ».',
          'Renseignez le nom, le type d’enseignement, le niveau, l’école et la circonscription.',
          'Validez : le tableau de bord de la classe s’ouvre.',
        ],
        attention: 'Le type d’enseignement détermine le calcul des bulletins. Le modifier ensuite change tous vos calculs.',
      },
    ],
  },
  {
    id: 'ch2',
    titre: '2. La classe au quotidien',
    resume: 'Élèves, matières, saisie des notes et présences.',
    fiches: [
      {
        titre: 'Élèves',
        chemin: 'Classe → Gestion → Élèves',
        role: 'Inscrire, modifier et trier les élèves.',
        etapes: [
          'Ajoutez les élèves un par un : nom, prénoms, matricule, sexe.',
          'Ou importez la liste officielle depuis un fichier Excel.',
          'Utilisez la recherche et le tri pour naviguer dans la liste.',
        ],
        sorties: 'Excel · PDF · Impression',
        attention: 'Le matricule garde ses zéros initiaux (001 reste 001). Un matricule erroné fait rejeter la ligne par EducMaster.',
      },
      {
        titre: 'Matières',
        chemin: 'Classe → Gestion → Matières',
        role: 'Définir les matières, leurs barèmes et leurs coefficients.',
        etapes: [
          'Vérifiez la liste proposée selon le niveau.',
          'Réglez la note obtenue maximale (CM) et la note de perfectionnement (CP).',
          'Dans le secondaire, renseignez les coefficients.',
        ],
        astuce: 'Réglez les barèmes AVANT de saisir : les modifier ensuite oblige à revoir toutes les notes.',
      },
      {
        titre: 'Saisir les notes',
        chemin: 'Classe → Suivi pédagogique → Saisir les notes',
        role: 'Enregistrer les notes, évaluation par évaluation.',
        etapes: [
          'Choisissez l’évaluation en haut de l’écran.',
          'Choisissez le mode : « Par matière » ou « Par profil ».',
          'Saisissez la note obtenue (CM) et la note de perfectionnement (CP).',
          'Si l’élève n’a pas composé, cochez « Absent ».',
        ],
        attention: 'Absent n’est pas zéro. Un zéro est une note qui pèse sur la moyenne ; une absence est traitée autrement.',
        astuce: 'Chaque évaluation garde ses propres notes : la sommative 2 n’efface pas la sommative 1.',
      },
      {
        titre: 'Présences',
        chemin: 'Classe → Suivi pédagogique → Présences des élèves',
        role: 'Faire l’appel du matin et de l’après-midi.',
        etapes: [
          'Choisissez la date puis la demi-journée.',
          'Indiquez : présent, absence justifiée, absence injustifiée ou férié.',
          'Précisez le motif pour une absence justifiée.',
        ],
        sorties: 'PDF · Excel · Impression',
        astuce: 'Le mercredi ne compte qu’une demi-journée, et il n’y a ni samedi ni dimanche.',
      },
    ],
  },
  {
    id: 'ch3',
    titre: '3. Les documents de l’élève',
    resume: 'Bulletins (dont la grille officielle de Maternelle), tableau PV, statistiques, photos et fichier EducMaster.',
    fiches: [
      {
        titre: 'Bulletins & classement (primaire et secondaire)',
        chemin: 'Classe → Suivi pédagogique → Bulletins & classement',
        role: 'Produire les bulletins de notes du primaire et du secondaire avec moyenne, rang et mention. La maternelle utilise la fiche suivante.',
        etapes: [
          'Choisissez l’évaluation : chaque évaluation a son propre bulletin.',
          'Vérifiez la moyenne de classe et le taux de réussite.',
          'Exportez : Excel récapitulatif, Word, PDF des bulletins ou PDF récapitulatif.',
        ],
        sorties: 'Excel · Word · PDF · Impression',
      },
      {
        titre: 'Bulletin officiel de la Maternelle — grille TS/S/PS',
        chemin: 'Classe de Maternelle → Grille TS / S / PS ou Bulletin Maternelle officiel',
        role: 'Reproduire le livret officiel en deux pages : page 1, la GRILLE D’ÉVALUATION TRIMESTRIELLE ; page 2, l’appréciation générale et les visas.',
        etapes: [
          'Choisissez 1er, 2e ou 3e Trimestre, puis touchez le nom de l’enfant.',
          'Pour les 10 domaines exacts — Fréquentations ; Propreté corporelle et vestimentaire ; Socialisation ; Langage ; Pré-écriture ; Éducation du mouvement ; Pré-lecture ; Pré-mathématique ; Poésie et Chant ; Autres — touchez TS, S ou PS.',
          'Écrivez une observation courte dans la colonne Observation de chaque domaine. Les propositions peuvent être touchées puis modifiées.',
          'Complétez l’APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E), manuellement ou avec « Proposer un texte ».',
          'Ouvrez « Bulletin officiel (2 pages) » : vérifiez les coches, la note NB, les visas de l’enseignant(e), du Directeur et des parents/tuteurs, puis les légendes TS/S/PS.',
          'Imprimez ou exportez. Le PDF et le Word contiennent les deux pages ; Excel produit la grille, les observations et une synthèse par domaine.',
        ],
        sorties: 'PDF officiel (2 pages/enfant) · Word officiel · Excel TS/S/PS · Impression · WhatsApp',
        attention: 'Aucune moyenne, aucun rang et aucune mention ne doivent être ajoutés : le livret précise que l’enfant est évalué par rapport à lui-même et non par rapport à ses camarades.',
        astuce: 'La saisie s’enregistre automatiquement. Si d’anciennes notes numériques existent, « Pré-remplir » propose TS à partir de 75 %, S à partir de 50 %, sinon PS ; relisez toujours avant impression.',
      },
      {
        titre: 'Tableau des notes (PV)',
        chemin: 'Classe → Suivi pédagogique → Tableau des notes',
        role: 'Voir toute la classe d’un seul coup d’œil.',
        etapes: [
          'Choisissez l’évaluation.',
          'Consultez notes, moyennes, matières validées et seuil atteint.',
          'Téléchargez le PDF ou imprimez.',
        ],
        sorties: 'PDF · Impression',
        astuce: 'L’écran le plus rapide pour repérer une note manquante avant un export.',
      },
      {
        titre: 'Export EducMaster',
        chemin: 'Classe → Gestion → Export EducMaster',
        role: 'Produire le fichier Excel officiel à importer sur educmaster.bj.',
        etapes: [
          'Vérifiez la barre « Progression de la saisie » : elle doit être verte.',
          'Touchez « Télécharger le fichier Excel ».',
          'Importez le fichier sur educmaster.bj.',
        ],
        sorties: 'Excel (format EducMaster)',
        attention: 'N’ouvrez pas le fichier dans Excel avant l’import : les matricules perdraient leurs zéros initiaux.',
        astuce: 'Barre orange = notes manquantes. N’exportez pas dans ce cas.',
      },
      {
        titre: 'Photos d’identité EducMaster — caméra intégrée et fond blanc',
        chemin: 'Accueil → Enrôlement → Photos d’identité EducMaster · ou Classe → Gestion → Photos EducMaster',
        role: 'Prendre, cadrer et nommer les photos numériques de chaque élève exactement comme EducMaster l’exige : matricule_NOM_Prenom_Prenom.',
        etapes: [
          'Choisissez l’école et la classe dans le sélecteur : le même studio fonctionne pour toutes les classes, de la Maternelle à la Terminale.',
          'Sélectionnez l’élève et vérifiez son matricule EducMaster, son nom et ses Prénoms. Le nom final s’affiche en bleu (exemple officiel : 104120183578_ASSOGBA_Jean_Paul.jpg).',
          'Touchez « Prendre avec la caméra intégrée ». Placez l’enfant de face, tête et épaules dans l’ovale, devant un mur ou un drap uni et bien éclairé, puis capturez.',
          'Ajustez zoom, cadrage horizontal/vertical et rotation. Le format final est toujours 800 × 1000 pixels (portrait 4×5, JPEG haute qualité).',
          'Laissez « Fond blanc automatique » activé : le détourage part des bords, mais la photo n’est blanchie que si le masque reste hors du visage et du torse. Si la détection semble toucher l’élève, le remplacement est annulé et la photo originale reste intacte. Diminuez la tolérance si le fond se propage trop; augmentez-la seulement si le fond uni reste coloré.',
          'Enregistrez la photo, passez à l’élève suivant à compléter, puis exportez le ZIP EducMaster de la classe.',
          'Pour importer des photos déjà nommées, touchez « Importer des photos nommées » : l’application rattache chaque image grâce au matricule placé avant le premier caractère souligné.',
          'Dans EducMaster, connectez-vous, sélectionnez les élèves, puis Actions → Importer les photos. Décompressez le ZIP, choisissez les fichiers du dossier PHOTOS_EDUCMASTER et touchez Enregistrer.',
        ],
        sorties: 'JPG individuel 800×1000 · ZIP de classe · bordereau CSV · consignes LISEZ-MOI',
        attention: 'EducMaster ne fournit pas à l’application hors-ligne un envoi direct dans votre session : la dernière sélection des fichiers et le bouton Enregistrer restent dans EducMaster. Ne renommez jamais le matricule et ne remplacez pas les caractères soulignés.',
        astuce: 'La liste signale immédiatement les photos manquantes, matricules absents ou en double. Travaillez avec les filtres « Sans photo » et « Sans matricule » jusqu’à obtenir 100 % d’élèves prêts.',
      },
    ],
  },
  {
    id: 'ch4',
    titre: '4. Mes registres officiels',
    resume: 'Cahier journal et registre matricule — ce que réclame l’inspection.',
    fiches: [
      {
        titre: 'Cahier journal',
        chemin: 'Accueil → Registres → Cahier journal',
        role: 'Consigner chaque jour les séances réellement faites.',
        etapes: [
          'Choisissez la date et la classe.',
          'Pour chaque séance : matière, titre, durée, déroulement.',
          'Marquez « Faite » ou « À faire », avec le motif du report.',
        ],
        sorties: 'Word · PDF · Impression',
        astuce: 'Le taux de réalisation est calculé : c’est l’indicateur que regarde l’inspecteur.',
      },
      {
        titre: 'Registre matricule',
        chemin: 'Accueil → Registres → Registre matricule',
        role: 'Tenir le registre officiel des inscriptions.',
        etapes: [
          'Touchez « Inscrire un élève ».',
          'Renseignez identité, admission, provenance et contact.',
          'Au départ d’un élève : date et motif de sortie.',
        ],
        sorties: 'Word · PDF · Impression',
        attention: 'Un élève sorti n’est jamais effacé : il reste au registre avec sa date de sortie.',
      },
    ],
  },
  {
    id: 'ch5',
    titre: '5. Ma vie scolaire',
    resume: 'Appel officiel, paiements, livret, matériel, emploi du temps, conseil.',
    fiches: [
      {
        titre: 'Registre d’appel officiel',
        chemin: 'Accueil → Vie scolaire → Registre d’appel officiel',
        role: 'Produire le taux de fréquentation réglementaire.',
        etapes: [
          'Choisissez la classe et le mois.',
          'Consultez le taux, sa ventilation garçons / filles et le détail par élève.',
          'Exportez en Word ou PDF, ou imprimez.',
        ],
        sorties: 'Word · PDF · Impression',
        astuce: 'Calcul en demi-journées ; les jours fériés sont exclus du total.',
      },
      {
        titre: 'Paiements des élèves',
        chemin: 'Accueil → Vie scolaire → Paiements des élèves',
        role: 'Suivre qui a payé, combien, et ce qui reste dû.',
        etapes: [
          'Choisissez la classe et le type de frais à appeler.',
          'Indiquez le montant appelé : une ligne est créée par élève.',
          'Touchez « Encaisser » : le reçu numéroté est généré en PDF.',
        ],
        sorties: 'Reçu PDF · Situation PDF · Impression',
        attention: 'Un trop-perçu n’est jamais masqué : il s’affiche en négatif et doit être régularisé.',
      },
      {
        titre: 'Livret scolaire',
        chemin: 'Accueil → Vie scolaire → Livret scolaire',
        role: 'Retracer le parcours d’un élève d’une année sur l’autre, du CI au CM2.',
        etapes: [
          'Touchez « Créer les livrets depuis mes classes ».',
          'Ouvrez le livret d’un élève.',
          'Ajoutez une année : depuis une classe existante, ou manuellement.',
          'Consultez la moyenne générale et la tendance calculées.',
        ],
        sorties: 'Word · PDF · Impression',
        astuce: 'Document précieux pour l’orientation et les dossiers de transfert.',
      },
      {
        titre: 'Manuels et matériel',
        chemin: 'Accueil → Vie scolaire → Manuels et matériel',
        role: 'Savoir qui détient quel manuel, et ce qui est prêté, perdu ou à racheter.',
        etapes: [
          'Ajoutez un article : nom, catégorie, quantité et valeur unitaire.',
          'Touchez « Prêter » et choisissez l’élève.',
          'Au retour, marquez « Rendu », « Perdu » ou « Abîmé ».',
        ],
        sorties: 'Word (paysage) · PDF · Impression',
        attention: 'Si le disponible devient négatif, l’application le signale : plus d’exemplaires ont été prêtés que l’école n’en possède. L’anomalie n’est jamais masquée.',
      },
      {
        titre: 'Emploi du temps',
        chemin: 'Accueil → Vie scolaire → Emploi du temps',
        role: 'Construire la grille hebdomadaire de la classe, affichable et imprimable.',
        etapes: [
          'Choisissez la classe.',
          'Pour chaque jour, ajoutez un créneau : début, fin et matière.',
          'Vérifiez le volume horaire calculé par matière.',
          'Enregistrez, puis exportez ou imprimez pour l’afficher en classe.',
        ],
        sorties: 'Word (paysage) · PDF · Impression',
        astuce: 'L’application détecte les chevauchements : deux matières au même créneau déclenchent une alerte rouge.',
      },
      {
        titre: 'Élèves en difficulté (remédiation)',
        chemin: 'Accueil → Vie scolaire → Élèves en difficulté',
        role: 'Garder la trace des actions engagées et de leurs résultats.',
        etapes: [
          'Choisissez la classe : les élèves sous 10/20 sans dossier sont proposés automatiquement.',
          'Touchez un élève proposé pour ouvrir son dossier.',
          'Renseignez la matière et la difficulté constatée.',
          'Ajoutez les actions menées, avec leur date et le résultat observé.',
          'Mettez à jour la note actuelle et le statut du dossier.',
        ],
        sorties: 'Word (paysage) · PDF · Impression',
        astuce: 'Le taux de résolution et le gain moyen en points sont calculés : exactement ce que demande l’inspection.',
      },
      {
        titre: 'Sauvegarde et restauration',
        chemin: 'Accueil → Vie scolaire → Sauvegarde',
        role: 'Protéger toute votre année dans un fichier unique.',
        etapes: [
          'Touchez « Télécharger la sauvegarde ».',
          'Conservez le fichier sur un second appareil ou une clé USB.',
          'Pour restaurer : « Choisir un fichier de sauvegarde ».',
        ],
        sorties: 'Fichier de sauvegarde (.json)',
        attention: 'La restauration REMPLACE les données de l’appareil. Sauvegardez avant, en cas de doute.',
        astuce: 'C’est le module le plus important : il protège tous les autres.',
      },
      {
        titre: 'Conseil de classe',
        chemin: 'Accueil → Vie scolaire → Conseil de classe',
        role: 'Conduire la délibération et produire le procès-verbal.',
        etapes: [
          'Choisissez la classe, touchez « Préparer la délibération ».',
          'Moyennes, mentions et décisions sont pré-remplies.',
          'Modifiez les décisions au besoin, puis exportez le PV.',
        ],
        sorties: 'Word · PDF · Impression',
        attention: 'L’application PROPOSE, le conseil DÉCIDE. Les décisions restent modifiables.',
      },
    ],
  },
  {
    id: 'ch6',
    titre: '6. La cantine scolaire',
    resume: 'Effectifs, simulateur, menus, stocks et nouvel arrondi officiel de sortie des denrées.',
    fiches: [
      {
        titre: 'Relevé des effectifs par classe',
        chemin: 'Accueil → Cantine → Relevé des effectifs',
        role: 'Compter les élèves inscrits, de la maternelle au CM2.',
        etapes: [
          'Vérifiez la date du relevé en haut de l’écran.',
          'Renseignez les garçons et les filles de chaque classe.',
          'Enregistrez : les totaux et la parité sont calculés.',
        ],
        sorties: 'PDF · Excel · Impression',
        astuce: 'Changer la date crée un NOUVEAU relevé : les relevés précédents sont conservés et consultables dans l’historique.',
      },
      {
        titre: 'Relevé des effectifs payeurs-mangeurs',
        chemin: 'Accueil → Cantine → Relevé des effectifs payeurs-mangeurs',
        role: 'Déterminer chaque jour les élèves réellement à nourrir selon le système de fonctionnement de l’école.',
        etapes: [
          'Choisissez le système de votre école : « Payeur-mangeur » si seuls les enfants ayant payé les frais de cantine mangent, ou « Apport communautaire » si tous les enfants présents mangent.',
          'Reprenez au besoin les effectifs inscrits depuis le « Relevé des effectifs par classe » : ils servent de repère et permettent le taux de présence.',
          'Après l’appel, renseignez pour chaque classe les garçons et les filles présents.',
          'En système payeur-mangeur, renseignez également, parmi les présents, les garçons et les filles ayant payé : l’application les compte comme mangeurs et affiche les présents non mangeurs.',
          'En système apport communautaire, n’indiquez que les présents : l’application les compte tous comme mangeurs.',
          'Enregistrez le relevé du jour, puis utilisez le total des mangeurs pour les vivres. Le bouton « Vers simulateur » le transmet à la nouvelle semaine ; dans « Prélèvement du jour » et dans le cahier des menus, reprenez le relevé de la même date.',
        ],
        sorties: 'PDF · Excel · Impression · Historique journalier',
        attention: 'En payeur-mangeur, les payeurs saisis doivent être des élèves PRÉSENTS le jour du relevé : un payeur absent ne prend pas le repas du jour et ne doit donc pas augmenter la quantité à préparer.',
        astuce: 'Changer la date ouvre le relevé déjà enregistré à cette date ou un nouveau relevé vierge : les jours précédents restent dans l’historique.',
      },
      {
        titre: 'Super MSP Simulateur cantine',
        chemin: 'Accueil → Cantine → Super MSP Simulateur cantine',
        role: 'Calculer les quantités de vivres à sortir chaque semaine.',
        etapes: [
          'Renseignez les effectifs et la période.',
          'Choisissez la légumineuse, ou « Aucune ».',
          'Dans le prélèvement du jour, saisissez l’effectif de mangeurs ou touchez « Reprendre les mangeurs du relevé payeurs-mangeurs » à la même date.',
          'Pour chaque service, l’application calcule ration × mangeurs, puis applique la méthode d’arrondi de sortie v65 (voir la fiche suivante).',
          'Les quantités hebdomadaires et les reliquats sont ensuite calculés automatiquement.',
        ],
        sorties: 'PDF · Excel · Impression',
        attention: 'Vous ne saisissez jamais une quantité calculée. Un reliquat négatif est signalé, jamais masqué. Les anciennes semaines encore en brouillon sont recalculées à l’ouverture ; une semaine clôturée reste un document historique.',
      },
      {
        titre: 'Arrondi de sortie des denrées (méthode v65)',
        chemin: 'Cantine → Simulateur (Prévision) · Cahier des menus · Cahier des stocks',
        role: 'Transformer le besoin calculé (ration × effectif) en quantité réellement à sortir, selon les intervalles officiels.',
        etapes: [
          'Principe : gardez la partie entière de la quantité, puis classez uniquement sa partie décimale. Exemple : pour 42,30 kg, on classe 0,30.',
          'Huile, céréales et légumineuses : [0 ; 0,375] → 0,25 · ]0,375 ; 0,625] → 0,50 · ]0,625 ; 0,875] → 0,75 · ]0,875 ; 1] → 1 (unité entière suivante).',
          'Sel : [0 ; 0,15] → 0,10 · ]0,15 ; 0,25] → 0,20 · ]0,25 ; 0,35] → 0,30 · ]0,35 ; 0,45] → 0,40 · ]0,45 ; 0,55] → 0,50 · ]0,55 ; 0,65] → 0,60 · ]0,65 ; 0,75] → 0,70 · ]0,75 ; 0,85] → 0,80 · ]0,85 ; 0,95] → 0,90 · ]0,95 ; 1] → 1.',
          'Une borne appartient à l’intervalle qui se termine sur elle : 0,375 donne 0,25 (pas 0,50) et 0,15 donne 0,10 (pas 0,20).',
          'Exemples : maïs 42,30 kg → 42,25 kg ; huile 3,10 L → 3,25 L ; sel 0,84 kg → 0,80 kg ; sel 0,96 kg → 1 kg.',
          'Cas particuliers : aucune cuisson ou aucun besoin = 0 ; une quantité entière exacte reste entière (15,00 kg reste 15 kg).',
          'La règle est appliquée par service dans le simulateur, dans la colonne « À sortir » du cahier des menus et dans la colonne « Sortie » du cahier de stock.',
        ],
        sorties: 'Quantités reprises dans les PDF, Excel, impressions et partages de cantine',
        attention: 'Dans le cahier de stock, seule la SORTIE est arrondie. Une entrée dotation reçue (par exemple 49,80 kg) doit rester exactement 49,80 kg.',
        astuce: 'Le graphique des deux règles est affiché dans « Prévision hebdomadaire », dans le cahier des menus et dans chaque registre de stock.',
      },
      {
        titre: 'Cahiers MSP des menus et des stocks',
        chemin: 'Accueil → Cantine → Cahiers MSP',
        role: 'Tenir le cahier officiel des menus et suivre chaque denrée.',
        etapes: [
          'Cahier des menus : renseignez le menu et les rations, puis reprenez les garçons/filles mangeurs depuis le relevé payeurs-mangeurs de chaque date (ou saisissez-les).',
          'La colonne « À sortir » est calculée automatiquement avec les intervalles v65 ; un ancien cahier est recalculé à son ouverture.',
          'Cahier des stocks : une section par denrée ; saisissez les dotations exactement comme reçues.',
          'Pour une sortie manuelle de stock, l’aperçu montre la quantité qui sera enregistrée après arrondi par intervalles.',
        ],
        sorties: 'PDF · Excel · Impression',
        astuce: 'Dans le stock, vérifiez l’encadré bleu « Sortie qui sera enregistrée » avant d’ajouter la ligne : il indique l’intervalle utilisé.',
        attention: 'Ne modifiez pas une ancienne ligne de stock seulement pour la « re-arrondir » si la quantité déjà sortie était la quantité réelle : le registre doit rester fidèle aux mouvements passés.',
      },
    ],
  },
  {
    id: 'ch7',
    titre: '7. La gestion financière',
    resume: 'Recettes, dépenses, budget et bilan OHADA.',
    fiches: [
      {
        titre: 'Recettes et dépenses du jour',
        chemin: 'Accueil → Comptabilité → Recettes et dépenses du jour',
        role: 'Tenir le journal quotidien des mouvements d’argent de l’école.',
        etapes: [
          'Enregistrez les recettes du jour, par classe et par volet.',
          'Enregistrez les dépenses du jour, avec leur objet.',
          'Consultez le solde de la journée.',
        ],
        sorties: 'PDF · Excel · Impression',
      },
      {
        titre: 'Le budget de mon école',
        chemin: 'Accueil → Comptabilité → Le budget de mon école',
        role: 'Établir le budget, le bilan et l’inventaire de l’établissement.',
        etapes: [
          'Renseignez les postes de recettes et de dépenses prévus.',
          'Comparez le réalisé au prévu.',
          'Produisez le bilan et l’inventaire au format OHADA.',
        ],
        sorties: 'PDF · Excel · Impression',
      },
    ],
  },
  {
    id: 'ch8',
    titre: '8. Préparation de classe',
    resume: 'Planification, fiches pédagogiques et programmes.',
    fiches: [
      {
        titre: 'Planification annuelle',
        chemin: 'Accueil → Préparation de classe → Planification annuelle',
        role: 'Répartir les apprentissages sur l’année scolaire.',
        etapes: [
          'Choisissez la classe.',
          'Renseignez les apprentissages prévus par période.',
          'Enregistrez, puis exportez pour l’inspection.',
        ],
        sorties: 'PDF · Impression',
      },
      {
        titre: 'Fiches pédagogiques',
        chemin: 'Accueil → Préparation de classe → Fiches pédagogiques',
        role: 'Rédiger et conserver vos fiches de préparation de séance.',
        etapes: [
          'Créez une fiche : matière, compétence visée, déroulement, matériel.',
          'Enregistrez : la fiche reste modifiable.',
          'Exportez en PDF ou imprimez pour le classeur de préparation.',
        ],
        sorties: 'PDF · Impression',
        attention: 'La préparation de fiches par IA est temporairement indisponible pendant son développement. Les outils manuels restent accessibles. L’IA locale du chat conversationnel est conservée pour les questions et explications, mais ne rédige pas de fiche complète.',
      },
      {
        titre: 'Fiches officielles de préparation — synchronisation cloud',
        chemin: 'Accueil → Fiches pédagogiques → Fiches de préparation Master Soutien Pédagogique',
        role: 'Consulter les fiches publiées par l’administration et les garder disponibles hors connexion.',
        etapes: [
          'Ouvrez le module avec Internet pour télécharger le catalogue publié.',
          'Les nouveautés sont vérifiées à l’ouverture, au retour en ligne et périodiquement pendant que le module reste ouvert.',
          'Après téléchargement, les fiches sont enregistrées sur l’appareil et restent consultables hors connexion.',
          'Si l’appareil ne peut pas se connecter, importez le ZIP de secours fourni par l’administration.',
        ],
        attention: 'Cette synchronisation concerne uniquement les fiches pédagogiques publiées par l’administration. Elle ne synchronise pas les listes d’élèves, les notes, les brouillons ni les autres ressources.',
      },
      {
        titre: 'Programme d’études',
        chemin: 'Classe → Documents & outils → Programme d’études',
        role: 'Consulter les documents officiels du programme.',
        etapes: [
          'Choisissez le niveau et la matière.',
          'Appuyez-vous dessus pour vos préparations.',
        ],
        sorties: 'PDF · Impression',
      },
    ],
  },
  {
    id: 'ch9',
    titre: '9. Ressources et savoirs',
    resume: 'Encyclopédie, dictionnaire, cours et images éducatives.',
    fiches: [
      {
        titre: 'Encyclopédie MSP et Dictionnaire MSP',
        chemin: 'Accueil → Savoirs & cours',
        role: 'Consulter les contenus de référence utilisables en classe.',
        etapes: [
          'Encyclopédie : 9 domaines et 24 thématiques, avec images et vidéos.',
          'Dictionnaire : les mots expliqués simplement aux jeunes élèves.',
          'Recherchez un mot ou parcourez les thèmes.',
        ],
        sorties: 'Consultation · Impression',
      },
      {
        titre: 'Bibliothèque et Cours',
        chemin: 'Accueil → Savoirs & cours',
        role: 'Accéder aux ouvrages PDF et aux cours de l’application.',
        etapes: [
          'Bibliothèque : parcourez le catalogue des ouvrages.',
          'Cours : choisissez le niveau et la matière.',
          'Toute modification apportée à une leçon est conservée.',
        ],
        sorties: 'PDF · Impression',
        astuce: 'Les contenus payants se débloquent après paiement au Super Administrateur.',
      },
      {
        titre: 'Éducation à la vie',
        chemin: 'Accueil → Éducation à la vie',
        role: 'Trois séries de 50 cours prêts à utiliser en classe.',
        etapes: [
          'Environnement : eau, déchets, sols, forêts, climat.',
          'Argent : épargne, budget, tontines, crédit, arnaques.',
          'Entreprise : trouver une idée, calculer un prix, tenir ses comptes.',
        ],
        sorties: 'PDF · Impression',
      },
      {
        titre: 'Mes images éducatives',
        chemin: 'Accueil → Mes images éducatives',
        role: 'Obtenir des illustrations et signer vos documents.',
        etapes: [
          'Générateur local : créez une gravure sans internet.',
          'Banque d’images : 12 images de contexte béninois, 100 F l’unité.',
          'Signature : personnalisez la mention apposée sur vos productions (500 F).',
        ],
        sorties: 'Images · PDF',
        astuce: 'Par défaut, vos documents portent la signature « Master Soutien Pédagogique (Votre compagnon mobile) ».',
      },
    ],
  },
  {
    id: 'ch10',
    titre: '10. Outils du quotidien',
    resume: 'Chronomètre, calculatrice, numériseur et organisation.',
    fiches: [
      {
        titre: 'Chronomètre de performances',
        chemin: 'Accueil → Mes outils → Chronomètre',
        role: 'Chronométrer les performances sportives des élèves.',
        etapes: [
          'Touchez « Démarrer ».',
          'À chaque arrivée, touchez « Top arrivée ».',
          'Enregistrez la session, puis exportez ou imprimez.',
        ],
        sorties: 'PDF · Impression',
      },
      {
        titre: 'Numériser un document',
        chemin: 'Accueil → Mes outils → Numériser un document',
        role: 'Transformer une feuille en document numérique de qualité.',
        etapes: [
          'Prenez une photo, ou importez un fichier existant.',
          'Traitement haute définition en noir et blanc.',
          'Ajoutez d’autres pages, puis enregistrez en PDF ou imprimez.',
        ],
        sorties: 'PDF · Impression',
      },
      {
        titre: 'Calculatrice, horloge et boîte à outils',
        chemin: 'Accueil → Mes outils / Mon quotidien',
        role: 'Les aides pratiques du quotidien de l’enseignant.',
        etapes: [
          'Calculatrice : opérations, moyennes et barèmes.',
          'Horloge : alarme pour marquer la fin d’une séance.',
          'Boîte à outils : groupes de travail et appréciations.',
        ],
        sorties: 'PDF · Impression',
      },
    ],
  },
  {
    id: 'ch11',
    titre: '11. Vie de l’établissement',
    resume: 'Administration, courriers, calendrier et enrôlement.',
    fiches: [
      {
        titre: 'Administration scolaire',
        chemin: 'Accueil → Administration scolaire',
        role: 'Piloter l’établissement et rédiger les documents officiels.',
        etapes: [
          'Onglet Pilotage : effectifs, moyenne de l’école, taux de réussite.',
          'Onglet Documents : rédigez dans le traitement de texte intégré (gras, titres, tableaux).',
          'Exportez en Word, en PDF, ou imprimez.',
          'Onglets Checklists et Priorités : préparez l’inspection et suivez vos tâches.',
        ],
        sorties: 'Word · PDF · Impression',
        astuce: 'Le Word exporté reste modifiable, contrairement au PDF qui est figé. Vous pouvez aussi importer un document Word existant.',
      },
      {
        titre: 'Calendrier, correspondance et grands rendez-vous',
        chemin: 'Accueil → Mon quotidien / Correspondance',
        role: 'Suivre les dates importantes et rédiger les courriers de l’école.',
        etapes: [
          'Calendrier scolaire : enregistrez les événements de l’année.',
          'Correspondance : l’en-tête reprend automatiquement votre profil.',
          'Grands rendez-vous : préparez les grands événements.',
        ],
        sorties: 'PDF · Impression',
      },
      {
        titre: 'Enrôlement des élèves et du personnel',
        chemin: 'Accueil → Enrôlement',
        role: 'Constituer les fiches d’enrôlement officielles.',
        etapes: [
          'Enrôlement des élèves : fiches et liste Excel.',
          'Liste Excel depuis PDF : ouvrez « Créer une liste Excel depuis un PDF », choisissez une classe existante ou un niveau, puis chargez le PDF de la liste.',
          'Les PDF à texte sélectionnable sont lus directement; les scans et photos de pages utilisent l’OCR français embarqué. Le traitement reste sur l’appareil.',
          'Vérifiez et corrigez chaque nom/matricule dans l’aperçu. Les matières/domaines viennent de la classe choisie ou des modèles déjà présents dans l’application.',
          'Téléchargez le classeur : le primaire reprend les quatre feuilles d’évaluation officielles reconnues par l’application; préscolaire et secondaire reprennent leurs matières configurées.',
          'Enrôlement du personnel : matricule, Id ANPE, IFU.',
          'Photos d’identité EducMaster : choisissez une classe, photographiez chaque élève, mettez le fond en blanc et exportez le ZIP au nom matricule_NOM_Prenom_Prenom.',
          'Exportez au format officiel attendu par l’administration.',
        ],
        sorties: 'Excel · PDF · Impression · ZIP photos EducMaster',
        astuce: 'L’enrôlement et les photos d’identité EducMaster sont inclus dès la formule Essentiel (999 FCFA/an).',
      },
    ],
  },
  {
    id: 'ch12',
    titre: '12. L’espace des parents',
    resume: 'Remettre à chaque parent le dossier chiffré de son enfant.',
    fiches: [
      {
        titre: 'Dossier pour les parents (enseignant)',
        chemin: 'Accueil → Suivi de votre enfant → Dossier pour les parents',
        role: 'Remettre un dossier chiffré contenant les résultats d’UN seul enfant.',
        etapes: [
          'Choisissez la classe puis l’élève.',
          'Ajoutez si vous le souhaitez un mot pour le parent.',
          'Touchez « Générer le code » : il s’affiche UNE SEULE FOIS, notez-le.',
          'Touchez « Créer le dossier » : le fichier chiffré est téléchargé.',
          'Remettez le fichier au parent, et le code SÉPARÉMENT en main propre.',
        ],
        sorties: 'Fichier chiffré (.msp)',
        attention: 'Le code et le fichier ne doivent jamais voyager ensemble. Sans le code, le fichier est illisible. Le code est valable 30 jours et peut être révoqué.',
      },
      {
        titre: 'Mon espace parent',
        chemin: 'Écran d’accueil → Suivi de votre enfant',
        role: 'Permettre au parent de consulter les résultats de son enfant.',
        etapes: [
          'Le parent donne son accord : rien n’est enregistré avant.',
          'Il choisit le fichier reçu et saisit le code de l’enseignant.',
          'Il consulte notes, progression, absences et mot de l’enseignant.',
          'Il peut retirer son accord : toutes les données sont alors effacées.',
        ],
        sorties: 'PDF · Impression',
        astuce: 'L’espace parent est GRATUIT : un parent n’est pas un abonné et n’a besoin d’aucun code d’abonnement.',
      },
    ],
  },
  {
    id: 'ch13',
    titre: '13. Le guide de l’utilisateur',
    resume: 'Ce manuel, et les tutoriels vidéo de l’équipe.',
    fiches: [
      {
        titre: 'Le manuel de l’abonné',
        chemin: 'Accueil → Guide → Le manuel de l’abonné',
        role: 'Consulter, dans l’application, le mode d’emploi de chaque fonction.',
        etapes: [
          'Dépliez un chapitre pour voir ses fiches.',
          'Utilisez la recherche pour trouver une fonction précise : essayez « école », « arrondi », « passé composé » ou « anglais ».',
          'Les nouvelles fonctions sont intégrées au chapitre concerné, et les nouveautés v64 sont regroupées au chapitre 15.',
          'Consultez le manuel directement dans l’application : pour réserver son contenu aux abonnés, il n’est ni téléchargeable ni imprimable depuis cet écran.',
        ],
        sorties: 'Consultation dans l’application',
        astuce: 'Le manuel fonctionne SANS CONNEXION : consultez-le en classe, même sans réseau.',
      },
      {
        titre: 'Tutoriels Master Soutien Pédagogique',
        chemin: 'Accueil → Guide → Tutoriels',
        role: 'Regarder les vidéos d’utilisation publiées par l’équipe.',
        etapes: [
          'Les vidéos sont classées par rubrique, selon les chapitres de ce manuel.',
          'Touchez une vidéo : elle se lit directement dans l’application.',
          'Utilisez la recherche pour trouver un tutoriel précis.',
        ],
        sorties: 'Lecture vidéo dans l’application',
        attention: 'Les tutoriels sont des vidéos en ligne : une connexion internet est nécessaire. Le manuel, lui, fonctionne hors connexion.',
        astuce: 'Si aucun tutoriel n’apparaît, l’équipe n’en a pas encore publié. Consultez le manuel en attendant.',
      },
      {
        titre: 'Publier un tutoriel (administration)',
        chemin: 'Espace d’administration → Guide → Tutoriels',
        role: 'Réservé à l’équipe : mettre des vidéos à disposition des abonnés.',
        etapes: [
          'Touchez « Ajouter un tutoriel ».',
          'Collez le lien YouTube : tous les formats sont acceptés.',
          'Renseignez titre, rubrique et durée, puis cochez « Publié ». Les rubriques « Espace École » et « Français et Anglais au primaire » accueillent les tutoriels des nouvelles fonctions ; la cantine v65 se classe dans « Cantine scolaire ».',
        ],
        sorties: '—',
        attention: 'Réglez vos vidéos en « Non répertoriée » sur YouTube : elles seront introuvables par une recherche publique. L’application empêche d’en sortir, mais ne peut pas rendre une vidéo secrète.',
      },
    ],
  },
  {
    id: 'ch14',
    titre: '14. Administration (Super Administrateur)',
    resume: 'Codes d’accès, équipe et contenus de l’application.',
    fiches: [
      {
        titre: 'Espace d’administration',
        chemin: 'Écran d’accès → bouton Administration',
        role: 'Gérer les codes, l’équipe et les contenus de l’application.',
        etapes: [
          'Générer des codes : choisissez l’une des 5 formules (999, 1500, 2500, 6000 ou 10000 F), saisissez le nom, générez. Les codes École commencent par « 6 » (Maternelle → CM2) ou « 7 » (Maternelle → Terminale).',
          'Nommer les membres de l’équipe et définir leur responsabilité.',
          'Modifier toute information, y compris les Conditions d’utilisation.',
          'Paramétrer les coordonnées de paiement et publier les tutoriels.',
        ],
        sorties: 'Codes · Excel · PDF',
        attention: 'Seuls les Super Administrateurs génèrent des codes. Les codes délivrés ne sont JAMAIS effacés par une mise à jour.',
      },
    ],
  },
  {
    id: 'ch15',
    titre: '15. Espace École et Langues (v64)',
    resume: 'L’abonnement annuel d’établissement (6000 / 10000 F), le référentiel de français et l’anglais au Primaire.',
    fiches: [
      {
        titre: 'Activer l’abonnement École (6000 ou 10000 FCFA/an)',
        chemin: 'Accueil → Mon école → Abonnement École',
        role: 'Donner à l’établissement son propre espace, avec toutes ses classes.',
        etapes: [
          '6000 FCFA/an : écoles de la Maternelle au CM2 (codes commençant par « 6 »).',
          '10000 FCFA/an : écoles de la Maternelle en Terminale (codes commençant par « 7 », séries A1/A2/B/C/D).',
          'Demandez la formule par WhatsApp depuis l’écran, payez, puis saisissez le code École à 6 chiffres reçu (nom du directeur/de la directrice + code).',
          'L’activation vaut 1 an, hors-ligne, et ne supprime ni classe, ni élève, ni note déjà saisis.',
        ],
        sorties: '—',
        astuce: 'Les enseignants gardent leur code personnel (999/1500/2500 F) : le code École équipe l’espace tenu par la direction.',
      },
      {
        titre: 'Créer l’espace de son école et générer toutes ses classes',
        chemin: 'Mon école → Espace de mon école → onglet « École & génération »',
        role: 'Créer l’établissement, ses classes, leurs matières officielles et leurs titulaires.',
        etapes: [
          'Renseignez le nom de l’école, le périmètre (selon la formule), la commune, la circonscription et l’année scolaire.',
          'Cochez les niveaux ouverts, le nombre de groupes parallèles (A/B…) et, au lycée, les séries ouvertes.',
          'Touchez « Créer les classes » : les classes déjà présentes ne sont jamais doublées.',
          'Rattachez les classes créées avant l’espace depuis l’onglet « Mes classes », puis renseignez le titulaire de chacune.',
          'Ouvrez chaque classe depuis « Mes classes » pour inscrire les élèves et travailler comme dans une classe ordinaire.',
          'Le tableau de bord consolide effectifs filles/garçons et progression des notes, par cycle ; « Partager le résumé » produit un point d’école prêt pour WhatsApp.',
        ],
        sorties: 'Résumé de l’école copiable/partageable (WhatsApp)',
      },
      {
        titre: 'Grammaire, Conjugaison et Orthographe francophones',
        chemin: 'Accueil → Français et Anglais → Grammaire, Conjugaison et Orthographe francophones',
        role: '32 leçons complètes (CE → 6ᵉ) : règle, astuce, exemples, pièges, exercice corrigé, quiz.',
        etapes: [
          'Filtrez par domaine ou cherchez un mot (« passé composé », « ou/où », « pluriel »).',
          'Ouvrez une leçon : écoutez-la (🔊), faites l’exercice, puis affichez le corrigé.',
          '« Copier pour le cahier » colle toute la leçon dans vos fiches ou un document à imprimer.',
          'Terminez par le quiz de 24 questions : le meilleur score reste sur l’appareil.',
        ],
        sorties: 'Texte de leçon copié (à coller dans Word, WhatsApp…)',
      },
      {
        titre: 'Les notions basiques d’anglais pour le Primaire',
        chemin: 'Accueil → Français et Anglais → Les notions basiques d’anglais pour le Primaire',
        role: '12 unités bilingues CI → CM2 : vocabulaire audio, phrases clés, dialogues, activités de classe.',
        etapes: [
          'Choisissez une unité (salutations, alphabet, nombres, couleurs, classe, corps, famille, animaux, marché, météo, journée, politesse).',
          'Touchez 🔊 pour entendre la prononciation anglaise ; la prononciation « à la française » est écrite entre crochets.',
          'Faites jouer le dialogue et l’activité de classe proposée, puis l’exercice corrigé.',
          'Le « English Quiz » (24 questions) vérifie les acquis de toutes les unités.',
        ],
        astuce: 'Commencez chaque matinée par le rituel météo de l’unité « Days, months, weather » : 2 minutes d’anglais oral par jour.',
      },
    ],
  },
  {
    id: 'ch16',
    titre: '16. Poésies, chants, comptines et contes (v70)',
    resume: 'Une médiathèque hors connexion pour préparer les activités orales, avec un répertoire élargi contextualisé au Bénin.',
    fiches: [
      {
        titre: 'Bibliothèque de poésie et de tradition orale',
        chemin: 'Accueil → Poésies, chants, comptines et contes → Bibliothèque de poésie et de tradition orale',
        role: 'Trouver, lire, écouter et enrichir des ressources orales adaptées à la classe.',
        etapes: [
          'Filtrez les 33 ressources intégrées par type (poésie, chant, comptine, conte), niveau, thème ou mot du texte.',
          'Le principal et tous les membres d’équipe peuvent ajouter une ressource texte, audio, vidéo ou combinée; l’auteur/contributeur est prérempli à partir de la session locale.',
          'Ouvrez une ressource pour afficher le texte et son objectif pédagogique; les ressources média seules peuvent être créées sans paroles.',
          'La voix de synthèse lit un texte en français si une voix locale hors ligne est installée sur l’appareil ; elle ne chante pas.',
          'Les audios et vidéos sont conservés dans IndexedDB sur cet appareil et restent lisibles hors connexion. La limite est de 50 Mo par fichier.',
          'Pour copier les textes et leurs fichiers audio/vidéo entre téléphone et PC sans cloud, exportez le ZIP de transfert, déplacez-le par câble USB ou Bluetooth, puis choisissez « Importer et fusionner » sur l’autre appareil. Les ressources présentes sont conservées.',
          'Certains chants sont des adaptations originales MSP et non les paroles d’un enregistrement existant; vérifiez les variantes locales et les droits de partage.'
        ],
        sorties: 'Lecture vocale · audio et vidéo locaux · textes personnalisés',
        attention: 'Les ajouts et les transferts fonctionnent hors ligne, mais aucune synchronisation automatique n’est faite. Le ZIP oral inclut les textes et médias; la sauvegarde générale inclut les textes personnalisés mais pas les fichiers. Les codes d’abonnement et les codes équipe ne font pas partie du ZIP oral.'
      },
    ],
  },
  {
    id: 'ch17',
    titre: '17. Assistant IA conversationnel et préparation de fiches (v75)',
    resume: 'L’assistant conversationnel reste disponible pour les questions et explications. La préparation de fiches par IA est temporairement désactivée.',
    fiches: [
      {
        titre: 'Utiliser l’assistant IA pour des questions et explications',
        chemin: 'Accueil → Préparation de classe → Assistant IA conversationnel — local et en ligne',
        role: 'Poser des questions, demander des explications ou faire reformuler un texte, sans générer une fiche complète.',
        etapes: [
          'Pour utiliser l’IA sans cloud, choisissez « Qwen3 local » dans le panneau de l’assistant.',
          'Téléchargez le modèle léger (moins de 1 Go), puis attendez qu’il soit prêt. Après chargement, les prompts sont traités sur l’appareil.',
          'Vous pouvez aussi choisir un fournisseur en ligne; chaque envoi distant exige une confirmation distincte et transmet le message ainsi que le contexte affiché.',
          'Vérifiez les réponses : le petit modèle local est moins performant et moins fiable que les meilleurs modèles en ligne.',
        ],
        sorties: 'Réponses et explications conversationnelles · Qwen3 local ou fournisseur en ligne',
        attention: 'L’assistant conversationnel ne sert pas à rédiger une fiche pédagogique ou une séance complète. La préparation de fiches par IA est temporairement indisponible; le chat bloque ces demandes avant tout traitement. Ne transmettez pas de données personnelles d’élèves à un fournisseur distant.',
      },
      {
        titre: 'Préparation de fiches par IA — temporairement indisponible',
        chemin: 'Accueil → Préparation de classe → Préparation de fiches par IA',
        role: 'Les outils dédiés de génération par IA sont hors service pour les utilisateurs pendant leur développement.',
        etapes: [
          'L’agent guidé et le générateur avancé affichent un avis d’indisponibilité, y compris si vous ouvrez directement une ancienne adresse ou un favori.',
          'Pour le moment, créez et organisez vos fiches avec les outils manuels de « Fiches pédagogiques ».',
          'Le chat IA local reste disponible pour d’autres usages — questions, explications et reformulations — mais ne peut pas générer une fiche.',
        ],
        sorties: 'Création manuelle des fiches · assistant IA général pour les autres usages',
        attention: 'La génération de fiches par IA ne peut pas être utilisée depuis les écrans dédiés ni depuis le chat général. Aucun envoi cloud n’est fait pour une demande de génération bloquée.',
      },
    ],
  },
];

/** Nombre total de fiches du manuel intégré. */
export function totalFiches(): number {
  return MANUAL.reduce((t, c) => t + c.fiches.length, 0);
}

/**
 * Recherche plein texte dans tout le manuel.
 *
 * ⚠️ INSENSIBLE AUX ACCENTS (corrigé v58). Sur un téléphone, un enseignant
 * tape rarement les accents : chercher « remediation » ou « enrolement »
 * doit trouver « remédiation » et « enrôlement ». Une recherche littérale
 * ne renvoyait rien et laissait croire que la fonction n'existait pas.
 */
export function searchManual(query: string): { chapitre: string; fiche: ManualStep }[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const out: { chapitre: string; fiche: ManualStep }[] = [];
  for (const c of MANUAL) {
    for (const f of c.fiches) {
      const blob = `${f.titre} ${f.chemin} ${f.role} ${f.etapes.join(' ')} `
        + `${f.astuce || ''} ${f.attention || ''}`;
      if (normalizeSearch(blob).includes(q)) out.push({ chapitre: c.titre, fiche: f });
    }
  }
  return out;
}
