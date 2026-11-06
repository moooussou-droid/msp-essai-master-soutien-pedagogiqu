import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, HelpCircle, X } from 'lucide-react';

interface GuideContent {
  id: string;
  title: string;
  intro: string;
  steps: string[];
  tip?: string;
}

const GUIDES: { match: (path: string) => boolean; content: GuideContent }[] = [
  {
    match: path => path === '/fiches-preparation',
    content: {
      id: 'official-prep-fiches-cloud-v76',
      title: 'Fiches officielles — synchronisation et hors-ligne',
      intro: 'Les fiches publiées par l’administration se mettent à jour automatiquement sans synchroniser les listes d’élèves ni les autres ressources.',
      steps: [
        'Ouvrez ce module avec Internet pour récupérer le catalogue publié; les mises à jour sont aussi vérifiées au retour de la connexion et périodiquement.',
        'Les nouvelles pages sont enregistrées dans le stockage local de l’appareil. Les fiches déjà récupérées restent accessibles sans réseau.',
        'Pour un appareil qui ne peut pas se connecter, l’administration peut fournir un ZIP de secours à importer dans ce module.',
      ],
      tip: 'Sur un appareil neuf, une première connexion Internet ou l’import du ZIP est nécessaire avant la consultation hors ligne.',
    },
  },
  {
    match: path => path === '/',

    content: {
      id: 'home-dashboard',
      title: 'Guide du tableau de bord enseignant',
      intro: 'Cet écran centralise vos classes, raccourcis et outils importants.',
      steps: [
        'Commencez par créer une classe ou ouvrir une classe existante.',
        'Utilisez les raccourcis du tableau de bord pour aller vite : Notes, Bulletins, Présences, Calendrier, etc.',
        'Sur chaque classe, vérifiez la progression de saisie avant d’exporter vers EducMaster.',
        'Faites régulièrement une sauvegarde ZIP ou JSON pour protéger vos données.',
      ],
      tip: 'Conseil : commencez toujours par importer ou ajouter les élèves avant la saisie des notes.',
    },
  },
  {
    match: path => path === '/mon-ecole' || path.startsWith('/espace-ecole'),
    content: {
      id: 'school-space-v64',
      title: 'Espace École — toutes les classes de l’établissement',
      intro: 'Cet espace est réservé aux formules École : 6000 F/an de la Maternelle au CM2, ou 10000 F/an de la Maternelle en Terminale.',
      steps: [
        'Activez d’abord le code École dans l’onglet « Abonnement » si l’offre s’affiche encore.',
        'Créez l’école, puis choisissez les niveaux ouverts, les groupes parallèles et les séries du lycée.',
        'Touchez « Créer les classes » : aucune classe déjà présente n’est doublée.',
        'Dans « Mes classes », renseignez les titulaires, rattachez les anciennes classes et ouvrez chaque classe pour inscrire les élèves.',
        'Le tableau de bord consolide les effectifs et la progression des notes de toute l’école.',
      ],
      tip: 'Le code École équipe l’espace de la direction ; les enseignants peuvent continuer avec leur code personnel.',
    },
  },
  {
    match: path => path === '/assistant-ia',
    content: {
      id: 'agent-ia-msp-v75',
      title: 'Préparation de fiches par IA — temporairement indisponible',
      intro: 'L’agent guidé de préparation de fiches est suspendu pour les utilisateurs pendant son développement.',
      steps: [
        'Aucune génération n’est possible depuis cet écran; un message d’indisponibilité s’affiche aussi si vous ouvrez directement une ancienne adresse.',
        'Créez et organisez vos préparations avec les outils manuels de « Fiches pédagogiques ».',
        'L’assistant IA conversationnel, dont Qwen3 local, reste disponible pour les questions et explications; il ne génère pas de fiche complète.',
      ],
      tip: 'Les outils manuels de préparation restent disponibles. Les demandes de génération de fiche sont bloquées avant tout traitement ou envoi à un fournisseur.',
    },
  },
  {
    match: path => path === '/generateur-fiches-ia',
    content: {
      id: 'agent-ia-modele-v75',
      title: 'Générateur IA de fiches — temporairement indisponible',
      intro: 'Le générateur basé sur une fiche modèle est désactivé pour les utilisateurs pendant son développement.',
      steps: [
        'L’import du modèle et la génération sont hors service; le lien direct ou un ancien favori mène à un avis d’indisponibilité.',
        'Utilisez les fonctions manuelles de « Fiches pédagogiques » ou les fiches officielles disponibles dans l’application.',
        'Le chat IA local reste ouvert aux autres usages pédagogiques et refuse les demandes de rédaction de fiche complète.',
      ],
      tip: 'Aucun document n’est transmis ni traité par le générateur pendant cette période.',
    },
  },
  {
    match: path => path === '/arts-oraux' || path === '/poesies-contes',
    content: {
      id: 'oral-arts-v70',
      title: 'Poésies, chants, comptines et contes',
      intro: 'Une médiathèque pédagogique hors connexion, enrichie de répertoires francophones et de créations contextualisées au Bénin.',
      steps: [
        'Filtrez les ressources par type (poésie, chant, comptine, conte) et par niveau; la bibliothèque comprend maintenant 33 éléments.',
        'Ouvrez un texte pour consulter son objectif, le lire ou lancer une voix française locale si elle est installée sur l’appareil.',
        'Le principal et les membres de l’équipe peuvent créer une ressource avec du texte, un audio, une vidéo, ou plusieurs formats ensemble.',
        'Pour transférer vos ressources et leurs médias sans cloud : exportez le ZIP, copiez-le par câble USB ou Bluetooth, puis sélectionnez « Importer et fusionner » sur l’autre appareil. Les ressources existantes sont conservées.',
        'Le transfert oral est manuel : il ne comprend pas les codes abonnés, les codes équipe ni les listes d’élèves.',
        'Utilisez les titres traditionnels comme repères; certaines versions sont des adaptations originales MSP. Vérifiez les variantes locales et les droits de partage.'
      ],
      tip: 'La voix française locale lit le texte sans le chanter. Pour écouter un chant ou une interprétation, importez un enregistrement audio.',
    },
  },
  {
    match: path => path === '/francais-gco',
    content: {
      id: 'french-gco-v64',
      title: 'Grammaire, Conjugaison et Orthographe francophones',
      intro: '32 leçons de français, du CE à la 6ᵉ, avec exercices corrigés et quiz.',
      steps: [
        'Filtrez par Grammaire, Conjugaison ou Orthographe, ou cherchez une notion.',
        'Ouvrez une leçon : règle, astuce, exemples, pièges et « à retenir ».',
        'Faites l’exercice avant d’afficher le corrigé.',
        'Utilisez « Copier pour le cahier » pour préparer une fiche ou un texte à imprimer.',
        'Terminez par le quiz de 24 questions.',
      ],
      tip: 'Le bouton 🔊 lit la leçon : utile pour une révision orale collective.',
    },
  },
  {
    match: path => path === '/anglais-primaire',
    content: {
      id: 'english-primary-v64',
      title: 'Les notions basiques d’anglais pour le Primaire',
      intro: '12 unités bilingues du CI au CM2, avec prononciation audio, dialogues et activités de classe.',
      steps: [
        'Choisissez l’unité selon le niveau et le thème de la semaine.',
        'Touchez 🔊 pour entendre chaque mot ou phrase en anglais.',
        'Lisez la prononciation « à la française » entre crochets si l’audio n’est pas disponible.',
        'Faites jouer le dialogue, puis conduisez l’activité de classe proposée.',
        'Contrôlez les acquis avec l’exercice corrigé et le quiz de 24 questions.',
      ],
      tip: 'Deux minutes d’anglais oral chaque matin valent mieux qu’une longue leçon occasionnelle.',
    },
  },
  {
    match: path => path === '/langues',
    content: {
      id: 'languages-v64',
      title: 'Français et Anglais au primaire',
      intro: 'Deux référentiels hors-ligne pour préparer et conduire les leçons de langues.',
      steps: [
        'Choisissez le français pour la grammaire, la conjugaison et l’orthographe.',
        'Choisissez l’anglais pour les notions de base, le vocabulaire et les dialogues.',
        'Chaque référentiel contient des exercices corrigés et un quiz final.',
      ],
    },
  },
  {
    match: path => path === '/cantine/payeurs-mangeurs',
    content: {
      id: 'canteen-payer-eaters-v66',
      title: 'Relevé payeurs-mangeurs — qui mange aujourd’hui ?',
      intro: 'Ce relevé journalier transforme les présents en effectif réel à nourrir selon le système de votre école.',
      steps: [
        'Choisissez « Payeur-mangeur » si seuls les enfants ayant payé les frais de cantine mangent.',
        'Choisissez « Apport communautaire » si tous les enfants présents mangent.',
        'Après l’appel, saisissez les garçons et les filles présents dans chaque classe.',
        'En payeur-mangeur, saisissez aussi les payeurs parmi les présents : ce sont eux les mangeurs.',
        'Enregistrez, puis reprenez les mangeurs dans le simulateur ou le cahier des menus à la même date.',
      ],
      tip: 'Les inscrits du relevé général peuvent être repris comme repère pour contrôler le taux de présence.',
    },
  },
  {
    match: path => path === '/cantine/simulateur',
    content: {
      id: 'canteen-simulator-v65',
      title: 'Simulateur de prélèvement — nouvel arrondi de sortie',
      intro: 'Les quantités sont calculées par service avec les intervalles officiels : quart pour l’huile, les céréales et les légumineuses ; dixième pour le sel.',
      steps: [
        'Créez la semaine avec l’effectif, les jours, les sorties de maïs et la légumineuse.',
        'Consultez la prévision : l’exemple et le graphique montrent l’intervalle appliqué.',
        'Saisissez chaque jour l’effectif de mangeurs et la céréale servie, ou reprenez le relevé payeurs-mangeurs de la date ; les sorties se recalculent aussitôt.',
        'Exemple : 42,30 kg → partie décimale 0,30 dans [0 ; 0,375] → 42,25 kg.',
        'Une quantité entière exacte reste entière, et un jour sans cuisson reste à 0.',
      ],
      tip: 'Les brouillons créés avant la v65 sont recalculés à l’ouverture ; les semaines clôturées ne changent pas.',
    },
  },
  {
    match: path => path === '/cantine/menus',
    content: {
      id: 'canteen-menus-v65',
      title: 'Cahier des menus — quantités à sortir',
      intro: 'La colonne « À sortir » utilise la même méthode par intervalles que le simulateur.',
      steps: [
        'Renseignez le menu et la ration, puis reprenez les garçons/filles mangeurs du relevé payeurs-mangeurs de la date (ou saisissez-les).',
        'La quantité brute est ration × effectif, puis sa partie décimale est classée par intervalle.',
        'Huile, céréales et légumineuses : seuils 0,375, 0,625 et 0,875.',
        'Sel : seuils 0,15, 0,25, …, 0,95.',
        'Un ancien cahier est recalculé dès son ouverture dans la v65.',
      ],
    },
  },
  {
    match: path => path === '/cantine/stocks',
    content: {
      id: 'canteen-stock-v65',
      title: 'Cahier de stock — sorties arrondies, dotations exactes',
      intro: 'La méthode par intervalles s’applique à la colonne SORTIE uniquement.',
      steps: [
        'Choisissez la denrée pour ouvrir son registre.',
        'Saisissez une dotation exactement comme reçue : elle n’est jamais arrondie.',
        'Saisissez la sortie brute : l’aperçu bleu indique la quantité qui sera enregistrée après arrondi v65.',
        'Le stock disponible et le stock restant se recalculent en chaîne.',
        'Une ancienne sortie déjà réellement effectuée ne doit pas être réécrite seulement pour changer son arrondi.',
      ],
      tip: 'Pour le sel iodé, les sorties vont au dixième ; toutes les autres denrées suivies vont au quart.',
    },
  },
  {
    match: path => path === '/cantine',
    content: {
      id: 'canteen-home-v65',
      title: 'Cantine scolaire',
      intro: 'Effectifs, payeurs-mangeurs, prélèvements, menus et stocks utilisent la même base : les élèves réellement à nourrir.',
      steps: [
        'Commencez par le relevé général des effectifs par classe.',
        'Chaque jour, faites le relevé payeurs-mangeurs selon le système de l’école.',
        'Utilisez le simulateur pour prévoir et suivre les prélèvements.',
        'Tenez le cahier des menus jour par jour.',
        'Suivez chaque denrée dans le cahier de stock.',
      ],
    },
  },
  {
    match: path => path === '/class/new' || path.includes('/edit'),
    content: {
      id: 'class-form',
      title: 'Créer ou modifier une classe',
      intro: 'Cette section permet de préparer l’environnement de travail de la classe.',
      steps: [
        'Renseignez le nom de la classe et le nom de l’école.',
        'Choisissez Préscolaire, Primaire ou Secondaire.',
        'Au préscolaire et au primaire, renseignez la circonscription si elle existe.',
        'Au secondaire, choisissez le niveau et la série si nécessaire.',
        'Sélectionnez le type d’évaluation : Evaluation, Devoirs surveillés ou Interrogation écrite.',
      ],
      tip: 'Les matières sont générées automatiquement, mais vous pouvez ensuite les réorganiser dans la section Matières.',
    },
  },
  {
    match: path => path.includes('/photos-educmaster'),
    content: {
      id: 'educmaster-photos-v67',
      title: 'Photos d’identité EducMaster — caméra et fond blanc',
      intro: 'Préparez une photo 800×1000 par élève, nommée matricule_NOM_Prenom_Prenom, sans quitter l’application.',
      steps: [
        'Choisissez l’école et la classe, puis sélectionnez l’élève dans la liste de contrôle.',
        'Vérifiez son matricule EducMaster : le nom du fichier se forme automatiquement (ex. 104120183578_ASSOGBA_Jean_Paul.jpg).',
        'Touchez « Prendre avec la caméra intégrée », placez la tête et les épaules dans l’ovale, devant un mur ou un drap uni bien éclairé.',
        'Cadrez avec zoom et déplacements, activez « Fond blanc automatique », puis réglez la tolérance seulement si l’aperçu le demande.',
        'Contrôlez que seuls les bords sont devenus blancs, enregistrez, puis exportez le ZIP de la classe.',
        'Sur EducMaster : sélectionnez les élèves, Actions → Importer les photos, choisissez les images décompressées et touchez Enregistrer.',
      ],
      tip: 'Un fond uni et homogène donne le meilleur détourage. Si le blanc semble toucher le visage, diminuez la tolérance et recentrez l’enfant.',
    },
  },
  {
    match: path => path.includes('/students'),
    content: {
      id: 'students',
      title: 'Gestion des élèves',
      intro: 'Ajoutez, modifiez ou importez les élèves de la classe.',
      steps: [
        'Cliquez sur + pour ajouter un élève manuellement.',
        'Pour une photo d’identité EducMaster (caméra, cadrage et fond blanc), utilisez Classe → Gestion → Photos EducMaster ; la photo simple, le poids et la taille restent ici.',
        'Utilisez Importer depuis Excel pour récupérer une liste existante.',
        'Si un fichier Excel contient déjà des notes, elles seront aussi détectées.',
        'Vérifiez les matricules avant de commencer les notes.',
      ],
      tip: 'Les matricules sont conservés en texte pour éviter la perte des zéros initiaux.',
    },
  },
  {
    match: path => path.includes('/subjects'),
    content: {
      id: 'subjects',
      title: 'Organisation des matières',
      intro: 'Cette section vous permet d’adapter l’ordre de saisie des matières.',
      steps: [
        'Modifiez le nom ou le barème si nécessaire.',
        'Utilisez les flèches pour placer les matières dans l’ordre qui vous arrange.',
        'Au primaire, gardez CM /18 et CP /2.',
        'Au secondaire, renseignez le coefficient de chaque matière.',
        'Cliquez sur Enregistrer avant de quitter.',
      ],
      tip: 'Même si vous changez l’ordre de saisie, l’export Excel respecte l’ordre normal EducMaster.',
    },
  },
  {
    match: path => path.includes('/profiles'),
    content: {
      id: 'profiles-entry',
      title: 'Saisie par profil d’élève',
      intro: 'Idéal pour saisir toutes les matières d’un élève sur une même fiche.',
      steps: [
        'Sélectionnez un élève dans la liste.',
        'Renseignez les notes matière par matière.',
        'Utilisez Absent si l’élève n’a pas composé dans une matière.',
        'Cliquez sur Enregistrer les notes.',
        'Passez à l’élève suivant avec le bouton Suivant.',
      ],
      tip: 'Cette méthode est conseillée quand vous travaillez élève par élève.',
    },
  },
  {
    match: path => path.includes('/entry'),
    content: {
      id: 'grade-entry',
      title: 'Saisie des notes par matière',
      intro: 'Cette section sert à saisir les notes d’une matière pour tous les élèves.',
      steps: [
        'Choisissez une matière.',
        'Touchez le champ CM ou CP à remplir.',
        'Utilisez le pavé numérique, y compris la virgule pour les notes décimales.',
        'Marquez Absent si nécessaire.',
        'Utilisez Suivant pour passer à l’élève suivant.',
      ],
      tip: 'Activez F2 ou Ctrl+K pour saisir rapidement au clavier.',
    },
  },
  {
    match: path => path.includes('/export'),
    content: {
      id: 'export-excel',
      title: 'Exporter vers Excel EducMaster',
      intro: 'Générez le fichier Excel final à importer sur educmaster.bj.',
      steps: [
        'Vérifiez le taux de complétion des notes.',
        'Assurez-vous que les élèves et les matières sont corrects.',
        'Cliquez sur Télécharger le fichier Excel.',
        'Sur téléphone, choisissez Enregistrer dans Fichiers si une fenêtre de partage apparaît.',
        'Importez ensuite le fichier sur educmaster.bj.',
      ],
      tip: 'L’application garde les matricules en texte et respecte les colonnes EducMaster.',
    },
  },
  {
    match: path => path.includes('/bulletins'),
    content: {
      id: 'bulletins',
      title: 'Bulletins scolaires — dont la grille officielle de Maternelle',
      intro: 'L’écran s’adapte au niveau : bulletin de notes au primaire/secondaire, grille d’observation TS/S/PS à la maternelle.',
      steps: [
        'MATERNELLE : choisissez le trimestre puis l’enfant. Pour chacun des 10 domaines, touchez TS, S ou PS et écrivez l’observation.',
        'MATERNELLE : complétez l’appréciation générale, puis ouvrez « Bulletin officiel (2 pages) » pour vérifier la grille, les visas et les légendes.',
        'MATERNELLE : aucun rang ni moyenne — l’enfant est évalué par rapport à lui-même et non par rapport à ses camarades.',
        'PRIMAIRE / SECONDAIRE : sélectionnez l’élève et vérifiez notes, moyenne, rang et seuil comme auparavant.',
        'Exportez ou imprimez : PDF et Word reprennent exactement le modèle du niveau ; Excel donne le récapitulatif adapté.',
      ],
      tip: 'À la maternelle, TS = Très Satisfaisant, S = Satisfaisant, PS = Peu Satisfaisant. Au primaire, le seuil reste 6 matières validées.',
    },
  },
  {
    match: path => path.includes('/presences'),
    content: {
      id: 'attendance',
      title: 'Registre de présence',
      intro: 'Faites l’appel quotidien et suivez les absences.',
      steps: [
        'Choisissez la date de l’appel.',
        'Cliquez sur Tout le monde présent si toute la classe est là.',
        'Changez le statut d’un élève si nécessaire : absent, justifié, retard.',
        'Ajoutez un motif en cas d’absence ou retard.',
        'Consultez le PV mensuel pour l’inspection ou la circonscription.',
      ],
      tip: 'Utilisez ce module régulièrement pour obtenir un taux de fréquentation fiable.',
    },
  },
  {
    match: path => path.includes('/programme'),
    content: {
      id: 'class-programme',
      title: 'Programme d’études de la classe',
      intro: 'Ajoutez et consultez le programme officiel correspondant à cette classe.',
      steps: [
        'Les utilisateurs peuvent lire les documents déjà ajoutés.',
        'L’ajout et la suppression sont réservés aux administrateurs.',
        'Les formats acceptés sont PDF, DOC et DOCX.',
        'Cliquez sur Voir pour lire le document dans l’application.',
      ],
      tip: 'Le format PDF offre le meilleur affichage dans l’application.',
    },
  },
  {
    match: path => path.includes('/planification-annuelle'),
    content: {
      id: 'annual-planning',
      title: 'Planification annuelle des apprentissages',
      intro: 'Conservez la planification annuelle de chaque classe dans l’application.',
      steps: [
        'Choisissez la classe concernée.',
        'Ajoutez la planification annuelle en PDF, DOC ou DOCX si vous êtes administrateur.',
        'Les enseignants peuvent consulter le document intégré.',
        'Le document peut servir à préparer les séquences et évaluations.',
      ],
      tip: 'Ajoutez une planification claire et validée par l’équipe pédagogique.',
    },
  },
  {
    match: path => path === '/enrolement-eleves',
    content: {
      id: 'enrollment',
      title: 'Enrôlement intelligent des élèves',
      intro: 'Saisissez les informations administratives sans ouvrir Excel.',
      steps: [
        'Cliquez sur Nouvel élève.',
        'Renseignez nom, prénoms, classe, date et lieu de naissance.',
        'Ajoutez téléphone des parents, nationalité et NPI.',
        'Filtrez par classe pour vérifier les données.',
        'Cliquez sur Exporter Excel pour générer le fichier final.',
      ],
      tip: 'Le fichier exporté contient les onglets Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1 et CM2.',
    },
  },
  {
    match: path => path === '/calendrier-scolaire',
    content: {
      id: 'calendar',
      title: 'Calendrier scolaire',
      intro: 'Centralisez les dates importantes de l’année scolaire.',
      steps: [
        'Ajoutez les dates d’examens, congés, conseils et activités.',
        'Importez un calendrier existant en PDF, DOCX, XLSX, CSV ou TXT.',
        'Activez les notifications pour les rappels.',
        'Exportez en CSV ou imprimez en PDF si besoin.',
      ],
      tip: 'Les fichiers importés sont aussi conservés comme ressources du calendrier.',
    },
  },
  {
    match: path => path === '/grands-rendez-vous',
    content: {
      id: 'events',
      title: 'Grands rendez-vous et activités',
      intro: 'Planifiez concours, réunions APE, formations et événements scolaires.',
      steps: [
        'Cliquez sur Programmer un Rendez-vous.',
        'Renseignez date, heure, lieu, organisateur et description.',
        'Choisissez Public, Privé ou Sur invitation.',
        'Partagez l’invitation par WhatsApp.',
        'Suivez le décompte J- avant l’événement.',
      ],
      tip: 'Vous pouvez importer un programme d’activités et laisser l’application détecter les dates.',
    },
  },
  {
    match: path => path === '/correspondance',
    content: {
      id: 'correspondence',
      title: 'Carnet de correspondance',
      intro: 'Générez rapidement des avis aux parents.',
      steps: [
        'Choisissez un modèle de message.',
        'Renseignez le parent, l’élève, la classe et la date.',
        'Vérifiez l’aperçu et le coupon réponse.',
        'Copiez, imprimez ou sauvegardez le message.',
      ],
      tip: 'Les modèles respectent les usages scolaires courants.',
    },
  },
  {
    match: path => path === '/boite-outils',
    content: {
      id: 'toolkit',
      title: 'Boîte à outils enseignant',
      intro: 'Des outils simples pour gagner du temps en classe.',
      steps: [
        'Utilisez Groupes pour former des équipes de travail.',
        'Utilisez Notes pour convertir un barème vers /20.',
        'Utilisez Appréciations pour copier rapidement des commentaires.',
        'Utilisez Matériel pour suivre les fournitures.',
        'Utilisez Âge pour calculer l’âge scolaire d’un élève.',
      ],
      tip: 'Cette section aide à résoudre des problèmes pratiques du quotidien.',
    },
  },
  {
    match: path => path === '/orientation-scolaire' || path === '/orientation-post-bac',
    content: {
      id: 'orientation',
      title: 'Orientation scolaire et universitaire',
      intro: 'Aidez les élèves à choisir un parcours selon leurs performances et leurs aspirations.',
      steps: [
        'Sélectionnez l’élève ou la série du BAC concernée.',
        'Analysez les matières fortes et les domaines dominants.',
        'Consultez les filières possibles et métiers associés.',
        'Copiez la synthèse pour la partager avec l’élève ou ses parents.',
      ],
      tip: 'L’orientation doit combiner résultats, motivation, contexte familial et possibilités réelles de formation.',
    },
  },
  {
    match: path => path === '/settings' || path === '/cloud' || path === '/profile',
    content: {
      id: 'settings-profile-cloud',
      title: 'Paramètres, profil et sauvegardes',
      intro: 'Configurez l’application et protégez vos données.',
      steps: [
        'Dans Profil, ajoutez votre nom, école et logo.',
        'Dans Paramètres, sauvegardez régulièrement vos données.',
        'Activez le cloud chiffré si vous voulez transférer vers un autre appareil.',
        'Gardez une copie JSON ou ZIP en lieu sûr.',
      ],
      tip: 'La sauvegarde est indispensable avant tout changement de téléphone.',
    },
  },
];

function getGuide(path: string): GuideContent | null {
  return GUIDES.find(item => item.match(path))?.content ?? null;
}

export default function SectionGuide() {
  const location = useLocation();
  const guide = useMemo(() => getGuide(location.pathname), [location.pathname]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!guide) return;
    const hidden = localStorage.getItem(`msp_guide_hidden_${guide.id}`) === 'true';
    setOpen(!hidden);
  }, [guide?.id, location.pathname]);

  if (!guide || !open) return null;

  function hideForever() {
    if (!guide) return;
    localStorage.setItem(`msp_guide_hidden_${guide.id}`, 'true');
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="bg-emerald-600 p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/20 p-2">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-100">Guide rapide</p>
                <h2 className="text-lg font-bold">{guide.title}</h2>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg bg-white/20 p-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600">{guide.intro}</p>
          <div className="space-y-2">
            {guide.steps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-gray-700"><strong>{index + 1}.</strong> {step}</p>
              </div>
            ))}
          </div>
          {guide.tip && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800"><strong>Astuce :</strong> {guide.tip}</p>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={hideForever} className="rounded-xl bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700">Ne plus afficher</button>
            <button onClick={() => setOpen(false)} className="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white">J’ai compris</button>
          </div>
        </div>
      </div>
    </div>
  );
}
