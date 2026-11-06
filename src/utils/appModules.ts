/**
 * MODULES DE L'APPLICATION (v36).
 *
 * L'accueil présentait une longue liste de raccourcis hétéroclites. Cette
 * version regroupe les fonctions par MODULE : chaque module possède sa page
 * dédiée qui présente ses SOUS-MODULES de façon simple et lisible.
 *
 * Les modules sont classés par usage; le Guide utilisateur vient en premier.
 * La Préparation de classe rassemble le programme, la planification,
 * les fiches manuelles et l'assistant IA conversationnel général.
 * La préparation de fiches par IA est temporairement désactivée.
 */

export interface SubModule {
  /** Chemin de destination ; `:firstClass` est remplacé par la 1re classe. */
  path: string;
  title: string;
  description: string;
  /** Nom d'icône lucide-react (résolu par le composant). */
  icon: string;
  /** Teinte de la pastille : clé de MODULE_TONES. */
  tone: ModuleTone;
  /**
   * Fonctionnalité EN COURS DE DÉVELOPPEMENT (v38).
   * Le sous-module reste visible mais n'est pas cliquable : il porte la
   * mention « À venir ». Passer à `false` le rendra immédiatement accessible.
   */
  comingSoon?: boolean;
}

export type ModuleTone =
  | 'emerald' | 'amber' | 'blue' | 'purple' | 'teal'
  | 'rose' | 'indigo' | 'slate' | 'red' | 'orange';

export interface AppModule {
  /** Chemin de la page du module (ex. /enrolement). */
  path: string;
  title: string;
  /** Phrase de présentation affichée en tête du module. */
  tagline: string;
  description: string;
  icon: string;
  tone: ModuleTone;
  subModules: SubModule[];
}

/** Classes Tailwind par teinte (écrites en toutes lettres pour le JIT). */
export const MODULE_TONES: Record<ModuleTone, { bg: string; text: string; ring: string; header: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', header: 'from-emerald-600 to-teal-600' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   header: 'from-amber-500 to-orange-500' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    header: 'from-blue-600 to-sky-600' },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-700',  ring: 'ring-purple-200',  header: 'from-purple-600 to-fuchsia-600' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-200',    header: 'from-teal-600 to-cyan-600' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    header: 'from-rose-600 to-pink-600' },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  ring: 'ring-indigo-200',  header: 'from-indigo-600 to-violet-600' },
  slate:   { bg: 'bg-slate-200',   text: 'text-slate-700',   ring: 'ring-slate-300',   header: 'from-slate-800 to-slate-700' },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-200',  header: 'from-orange-600 to-amber-600' },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-200',     header: 'from-red-600 to-rose-600' },
};

export const APP_MODULES: AppModule[] = [
  {
    /*
     * v58 — LE GUIDE DE L'UTILISATEUR.
     * Accessible une fois l'abonnement active : le mode d'emploi complet
     * hors connexion, et les tutoriels video publies par l'equipe
     * d'administration, regardes dans l'application.
     */
    path: '/guide',
    title: 'Le guide de l’utilisateur',
    tagline: 'Le premier repère pour découvrir et utiliser l’application',
    description:
      "Accédez en premier au manuel pas à pas, utilisable hors connexion, puis aux tutoriels vidéo de l'équipe d'administration.",
    icon: 'GraduationCap',
    tone: 'emerald',
    subModules: [
      {
        path: '/guide/manuel',
        title: 'Le manuel de l’abonné Master Soutien Pédagogique',
        description: 'Chaque fonction expliquée : où la trouver et comment l’utiliser. Fonctionne sans connexion.',
        icon: 'BookMarked',
        tone: 'emerald',
      },
      {
        path: '/guide/tutoriels',
        title: 'Tutoriels Master Soutien Pédagogique',
        description: 'Les vidéos d’utilisation publiées par l’équipe, à regarder dans l’application.',
        icon: 'PlayCircle',
        tone: 'red',
      },
    ],
  },
  {
    path: '/enrolement',
    title: 'Enrôlement',
    tagline: 'Inscrire les élèves et le personnel',
    description:
      "Constituez les dossiers officiels de vos élèves et des agents de l'établissement, puis exportez les listes au format attendu par l'administration.",
    icon: 'UserPlus',
    tone: 'emerald',
    subModules: [
      {
        path: '/enrolement-eleves',
        title: 'Enrôlement intelligent des élèves',
        description: 'Date et lieu de naissance, parents, nationalité, NPI — fiche complète et liste Excel.',
        icon: 'UserPlus',
        tone: 'emerald',
      },
      {
        path: '/enrolement-personnel',
        title: 'Enrôlement du personnel',
        description: "Matricule, Id ANPE (AME), IFU, prise de service — export Excel officiel du personnel.",
        icon: 'Briefcase',
        tone: 'indigo',
      },
      {
        path: '/liste-pdf-excel',
        title: 'Créer une liste Excel depuis un PDF',
        description: 'Importez une liste d’élèves PDF (texte ou scan), vérifiez les noms puis créez un classeur avec les matières du préscolaire, du primaire ou du secondaire.',
        icon: 'FileText',
        tone: 'blue',
      },
      {
        /* v67 — accessible pour chaque classe : capture intégrée, cadrage
           d’identité, fond blanc et fichiers matricule_NOM_Prenom. */
        path: '/class/:firstClass/photos-educmaster',
        title: 'Photos d’identité EducMaster',
        description: 'Caméra intégrée, photo 800×1000, fond blanc et export ZIP nommé matricule_NOM_Prenom_Prenom pour chaque classe.',
        icon: 'ImagePlus',
        tone: 'blue',
      },
    ],
  },
  {
    /*
     * v64 — L'ESPACE ÉCOLE (abonnements d'établissement).
     * Chaque école a son propre espace avec toutes ses classes :
     *  - 6000 FCFA/an : Maternelle au CM2 (codes en « 6 ») ;
     *  - 10000 FCFA/an : Maternelle en Terminale (codes en « 7 »).
     * La page de découverte (offres + saisie du code École) est visible
     * par tous les abonnés ; l'espace lui-même exige la formule École.
     */
    path: '/mon-ecole',
    title: 'Mon école',
    tagline: 'L’espace de votre établissement, avec toutes ses classes',
    description:
      "Directeurs et directrices : créez l'espace de votre école, générez toutes ses classes en un clic (Maternelle → CM2 pour 6000 F/an, Maternelle → Terminale pour 10000 F/an), rattachez les classes existantes et suivez les effectifs et la progression de tout l'établissement.",
    icon: 'School',
    tone: 'emerald',
    subModules: [
      {
        path: '/espace-ecole',
        title: 'Espace de mon école — tableau de bord',
        description: 'Effectifs filles/garçons, progression des notes et cycles de tout l’établissement.',
        icon: 'School',
        tone: 'emerald',
      },
      {
        path: '/espace-ecole/classes',
        title: 'Toutes les classes de mon école',
        description: 'Chaque classe de l’espace, son titulaire et ses effectifs ; rattachement des classes existantes.',
        icon: 'Users',
        tone: 'teal',
      },
      {
        path: '/espace-ecole/abonnement',
        title: 'Abonnement École — 6000 / 10000 F par an',
        description: 'Maternelle → CM2 (6000 F) ou Maternelle → Terminale (10000 F) : offres, comparatif et activation du code École.',
        icon: 'Wallet',
        tone: 'amber',
      },
    ],
  },
  {
    /*
     * v64 — LES LANGUES AU PRIMAIRE.
     * Deux référentiels complets et hors-ligne : le français (grammaire,
     * conjugaison, orthographe) et l'initiation à l'anglais.
     */
    path: '/langues',
    title: 'Français et Anglais',
    tagline: 'Grammaire/conjugaison/orthographe et anglais au Primaire',
    description:
      "Deux référentiels de classe, entièrement hors-ligne : 32 leçons de grammaire, conjugaison et orthographe francophones avec exercices corrigés et quiz, et 12 unités d'anglais pour le Primaire avec vocabulaire audio, dialogues et activités de classe.",
    icon: 'Languages',
    tone: 'blue',
    subModules: [
      {
        path: '/francais-gco',
        title: 'Grammaire, Conjugaison et Orthographe francophones',
        description: 'Règles, astuces anti-dictée, tableaux de conjugaison, exemples béninois, exercices corrigés et quiz.',
        icon: 'SpellCheck',
        tone: 'rose',
      },
      {
        path: '/anglais-primaire',
        title: 'Les notions basiques d’anglais pour le Primaire',
        description: '12 unités bilingues : salutations, alphabet, nombres, couleurs, classe, famille, marché… avec prononciation audio.',
        icon: 'Globe',
        tone: 'blue',
      },
    ],
  },
  {
    path: '/orientation',
    title: "Orientation de l'élève",
    tagline: 'Guider chaque élève vers le bon parcours',
    description:
      "Analysez les performances de l'élève pour lui proposer la série, la filière et les débouchés qui lui correspondent réellement.",
    icon: 'Compass',
    tone: 'purple',
    subModules: [
      {
        path: '/orientation-scolaire',
        title: 'Orientation scolaire',
        description: "Parcours possibles selon les performances de l'élève, du primaire au secondaire.",
        icon: 'Target',
        tone: 'teal',
      },
      {
        path: '/orientation-post-bac',
        title: 'Orientation post-BAC',
        description: 'Séries, filières universitaires, matières fortes et débouchés professionnels.',
        icon: 'GraduationCap',
        tone: 'purple',
      },
    ],
  },
  {
    path: '/preparation-classe',
    title: 'Préparation de classe',
    tagline: 'Planifier et préparer vos séances',
    description:
      'Du programme officiel à vos préparations manuelles : planifiez votre année et organisez vos fiches. La préparation de fiches par IA est temporairement indisponible pendant son développement.',
    icon: 'BookOpen',
    tone: 'amber',
    subModules: [
      {
        path: '/programmes',
        title: "Programme d'études",
        description: 'Documents officiels et contenus notionnels par classe et par matière.',
        icon: 'BookOpen',
        tone: 'emerald',
      },
      {
        path: '/class/:firstClass/planification-annuelle',
        title: 'Planification annuelle',
        description: 'Répartition des apprentissages sur l’année scolaire, classe par classe.',
        icon: 'CalendarDays',
        tone: 'amber',
      },
      {
        path: '/fiches-pedagogiques',
        title: 'Fiches pédagogiques / Préparation',
        description: 'Créez, organisez et imprimez vos fiches de séance et votre planning.',
        icon: 'ClipboardList',
        tone: 'blue',
      },
      {
        path: '/assistant-ia-en-ligne',
        title: 'Assistant IA conversationnel — local et en ligne',
        description: 'Questions et explications avec Qwen3 local après téléchargement, ou un fournisseur en ligne après confirmation. La génération de fiches par IA est désactivée dans ce chat.',
        icon: 'Bot',
        tone: 'blue',
      },
      {
        path: '/assistant-ia',
        title: 'Préparation de fiches par IA — temporairement indisponible',
        description: 'Fonction réservée à la préparation de fiches, actuellement désactivée pour les utilisateurs pendant son développement. Les fiches manuelles et le chat IA général restent disponibles.',
        icon: 'Bot',
        tone: 'amber',
        comingSoon: true,
      },
    ],
  },
  {
    path: '/arts-oraux',
    title: 'Poésies, chants, comptines et contes',
    tagline: 'Des textes et médias pour faire vivre l’oral en classe',
    description:
      'Une médiathèque hors connexion pour la Maternelle et le Primaire : textes originaux, lecture vocale, ajout d’audios/vidéos et transfert manuel des ressources entre appareils par ZIP.',
    icon: 'Music2',
    tone: 'purple',
    subModules: [
      {
        path: '/poesies-contes',
        title: 'Bibliothèque de poésie et de tradition orale',
        description: 'Rechercher par type et par niveau, lire les textes, écouter une lecture vocale ou importer audio et vidéo pour les retrouver hors connexion.',
        icon: 'PlayCircle',
        tone: 'purple',
      },
    ],
  },
  {
    path: '/education-vie',
    title: 'Éducation à la vie',
    tagline: 'Environnement, argent et esprit d’entreprise',
    description:
      "150 cours et articles pour préparer les écoliers et les élèves à la vie : protéger leur environnement, gérer leur argent et oser créer leur activité.",
    icon: 'Sprout',
    tone: 'teal',
    subModules: [
      {
        path: '/education-vie/environnementale',
        title: 'Éducation environnementale',
        description: '50 cours : eau, déchets, sols, forêts, climat, énergies et gestes citoyens.',
        icon: 'Leaf',
        tone: 'emerald',
      },
      {
        path: '/education-vie/financiere',
        title: 'Éducation financière',
        description: '50 cours : besoins et envies, épargne, budget, tontines, crédit et arnaques.',
        icon: 'Coins',
        tone: 'amber',
      },
      {
        path: '/education-vie/entrepreneuriale',
        title: 'Éducation entrepreneuriale',
        description: '50 cours : trouver une idée, calculer un prix, servir le client, tenir ses comptes.',
        icon: 'Rocket',
        tone: 'purple',
      },
    ],
  },
  {
    path: '/cantine',
    title: 'Mon gestionnaire de cantine scolaire',
    tagline: 'Prélèvements, menus et stocks des vivres',
    description:
      "Calcule automatiquement les quantités de vivres à sortir chaque semaine, tient le cahier des menus et suit le stock de chaque denrée. Tout fonctionne hors ligne.",
    icon: 'UtensilsCrossed',
    tone: 'orange',
    subModules: [
      {
        path: '/cantine/effectifs',
        title: 'Relevé des effectifs par classe',
        description: 'Garçons et filles de la Maternelle 1 au CM2 : totaux, parité et report vers le simulateur.',
        icon: 'Users',
        tone: 'emerald',
      },
      {
        path: '/cantine/payeurs-mangeurs',
        title: 'Relevé des effectifs payeurs-mangeurs',
        description: 'Payeur-mangeur ou apport communautaire : présents, payeurs présents et mangeurs à nourrir.',
        icon: 'Wallet',
        tone: 'amber',
      },
      {
        path: '/cantine/simulateur',
        title: 'Super MSP Simulateur cantine',
        description: 'Prévision hebdomadaire, prélèvement du jour, point de la semaine et reliquats.',
        icon: 'Calculator',
        tone: 'orange',
      },
      {
        path: '/cantine/menus',
        title: 'Cahier MSP des menus hebdomadaires',
        description: 'Le cahier officiel des menus : rations, effectifs G/F/T, quantités à sortir et soldes.',
        icon: 'ClipboardList',
        tone: 'teal',
      },
      {
        path: '/cantine/stocks',
        title: 'Cahier MSP de gestion des stocks',
        description: 'Une section par denrée : dotations, sorties et stock restant reportés automatiquement.',
        icon: 'Boxes',
        tone: 'indigo',
      },
    ],
  },
  {
    path: '/mes-images',
    title: 'Mes images éducatives',
    tagline: 'Créer et obtenir des illustrations pour la classe',
    description:
      "Générez vos propres gravures éducatives à partir d'une simple consigne, et puisez dans une banque d'images du contexte béninois et africain, prêtes à imprimer.",
    icon: 'Images',
    tone: 'purple',
    subModules: [
      {
        path: '/mes-images/generateur',
        title: 'IA MSP de génération de gravures et d’images éducatives',
        description: 'Décrivez l’image voulue : l’IA la compose, hors ligne, prête à imprimer.',
        icon: 'Sparkles',
        tone: 'purple',
      },
      {
        path: '/mes-images/banque',
        title: 'Banque d’images éducatives',
        description: 'Des planches du Bénin et d’Afrique, en PDF, PNG ou JPEG. 100 FCFA l’image.',
        icon: 'ImagePlus',
        tone: 'indigo',
      },
      {
        path: '/mes-images/signature',
        title: 'Signature de mes documents',
        description: 'Signature officielle sur vos documents ; personnalisation possible pour 500 FCFA.',
        icon: 'PenLine',
        tone: 'indigo',
      },
    ],
  },
  {
    path: '/comptabilite',
    title: 'Mon gestionnaire comptable MSP',
    tagline: 'Recettes, dépenses et budget de l’école',
    description:
      "Retracez chaque jour les recettes de l'école (par classe et par volet) et les dépenses avec leur objet, puis pilotez le budget prévisionnel jusqu'au bilan et à l'inventaire aux normes OHADA.",
    icon: 'Wallet',
    tone: 'teal',
    subModules: [
      {
        path: '/comptabilite/journal',
        title: 'Recettes et dépenses du jour',
        description: 'Encaissements par classe et par volet, dépenses et objet de chaque mouvement.',
        icon: 'Wallet',
        tone: 'teal',
      },
      {
        path: '/comptabilite/budget',
        title: 'Le budget de mon école',
        description: 'Prévisions budgétaires, puis bilan et inventaire OHADA en PDF et Excel.',
        icon: 'Scale',
        tone: 'indigo',
      },
    ],
  },
  {
    path: '/espace-partenariat',
    title: 'Espace partenariat',
    tagline: 'Opportunités, recrutement et partenaires',
    description:
      'Retrouvez les offres d’emploi et de formation du secteur éducatif, et découvrez les partenaires qui accompagnent les enseignants.',
    icon: 'Handshake',
    tone: 'rose',
    subModules: [
      {
        path: '/annonces',
        title: 'Annonces / Recrutement',
        description: 'Offres d’emploi, concours, formations et opportunités du secteur éducatif.',
        icon: 'Megaphone',
        tone: 'amber',
      },
      {
        path: '/publicites',
        title: 'Publicités',
        description: 'Espace réservé aux partenaires : librairies, écoles, services aux enseignants.',
        icon: 'Store',
        tone: 'blue',
      },
    ],
  },
  {
    /*
     * v47 — LA BOÎTE À OUTILS DE L'ENSEIGNANT.
     * Regroupe les outils transversaux demandés : chronomètre d'EPS,
     * calculatrice, numériseur HD, et les conditions d'utilisation.
     * Chaque icône reprend la substance de l'intitulé : un chronomètre
     * pour le chronomètre, une calculatrice pour les calculs, un scanner
     * pour la numérisation, un document pour les conditions.
     */
    path: '/outils',
    title: 'Ma boîte à outils',
    tagline: 'Les outils du quotidien, toujours à portée de main',
    description:
      "Chronométrez les performances sportives, calculez moyennes et barèmes, numérisez vos documents en haute définition et enregistrez votre signature et votre cachet.",
    icon: 'Wrench',
    tone: 'indigo',
    subModules: [
      {
        path: '/chronometre',
        title: 'Chronomètre de performances',
        description: 'Course de vitesse et d’endurance : temps au centième, classement et allure.',
        icon: 'Timer',
        tone: 'orange',
      },
      {
        path: '/calculatrice',
        title: 'Calculatrice et outils de calcul',
        description: 'Clavier scientifique, moyenne pondérée, conversion de barème et règle de trois.',
        icon: 'Calculator',
        tone: 'teal',
      },
      {
        path: '/numeriser',
        title: 'Numériser un document',
        description: 'Caméra ou import : rendu scanner en haute définition, export PDF ou image.',
        icon: 'ScanLine',
        tone: 'indigo',
      },
      {
        path: '/conditions',
        title: 'Conditions d’utilisation',
        description: 'Les règles d’usage de l’application, modifiables par le Super Administrateur.',
        icon: 'FileText',
        tone: 'blue',
      },
    ],
  },
  {
    /*
     * v48 — ESPACE PARENTS, etape ①.
     * Entierement hors ligne : le dossier de l'enfant est chiffre et
     * transmis en fichier, aucune donnee d'eleve n'atteint un serveur
     * tant que la formalite prealable APDP n'est pas accomplie.
     */
    path: '/suivi-enfant',
    title: 'Suivi de votre enfant',
    tagline: 'L’espace des parents d’élèves',
    description:
      "Consultez les résultats et les absences de votre enfant, avec une explication en langage simple. Le dossier vous est remis chiffré par l’école et reste dans votre téléphone.",
    icon: 'HeartHandshake',
    tone: 'teal',
    subModules: [
      {
        path: '/suivi-enfant',
        title: 'Mon espace parent',
        description: 'Ouvrir le dossier reçu de l’école, voir les notes, les absences et le mot de l’enseignant.',
        icon: 'Baby',
        tone: 'teal',
      },
      {
        path: '/suivi-enfant/codes',
        title: 'Dossier pour les parents (enseignant)',
        description: 'Générer le code de rattachement d’un élève et créer son dossier chiffré.',
        icon: 'KeyRound',
        tone: 'indigo',
      },
    ],
  },
  {
    /*
     * v49 — REGISTRES REGLEMENTAIRES.
     * L'application exigeait deja ces deux documents (liste de preparation
     * a l'inspection, modele de rapport d'inspection) sans les fournir :
     * l'enseignant devait les tenir sur papier. On comble ce manque.
     */
    path: '/registres',
    title: 'Mes registres officiels',
    tagline: 'Les documents que réclame l’inspection',
    description:
      "Le cahier journal et le registre matricule, tenus au jour le jour et exportables en Word, PDF ou à l'impression.",
    icon: 'BookMarked',
    tone: 'indigo',
    subModules: [
      {
        path: '/cahier-journal',
        title: 'Cahier journal',
        description: 'Les séances réellement faites chaque jour, avec le taux de réalisation.',
        icon: 'NotebookPen',
        tone: 'emerald',
      },
      {
        path: '/registre-matricule',
        title: 'Registre matricule',
        description: 'Le registre d’inscription : identité, admission, provenance et sortie des élèves.',
        icon: 'ClipboardList',
        tone: 'indigo',
      },
    ],
  },
  {
    /*
     * v52 — VIE SCOLAIRE.
     * Huit besoins quotidiens d'une ecole beninoise, proposes en v51 et
     * concretises ici : le registre officiel, l'argent, le parcours de
     * l'eleve, le materiel, l'organisation, l'accompagnement, la
     * protection des donnees et la deliberation de fin d'annee.
     */
    path: '/vie-scolaire',
    title: 'Ma vie scolaire',
    tagline: 'Le quotidien de l’école, de la rentrée au conseil de classe',
    description:
      "Fréquentation officielle, paiements et reçus, livret de l'élève, manuels, emploi du temps, remédiation, sauvegarde et conseil de classe.",
    icon: 'School',
    tone: 'blue',
    subModules: [
      {
        path: '/registre-appel',
        title: 'Registre d’appel officiel',
        description: 'Taux de fréquentation du mois, ventilation par sexe et alertes de décrochage.',
        icon: 'CalendarCheck',
        tone: 'blue',
      },
      {
        path: '/paiements',
        title: 'Paiements des élèves',
        description: 'Scolarité, cantine et fournitures : qui a payé, ce qui reste dû, avec reçu.',
        icon: 'Wallet',
        tone: 'emerald',
      },
      {
        path: '/livret-scolaire',
        title: 'Livret scolaire',
        description: 'Le parcours de l’élève d’une année sur l’autre, pour l’orientation et les transferts.',
        icon: 'GraduationCap',
        tone: 'purple',
      },
      {
        path: '/manuels-materiel',
        title: 'Manuels et matériel',
        description: 'Prêts, retours, pertes et valeur du stock scolaire.',
        icon: 'Package',
        tone: 'orange',
      },
      {
        path: '/emploi-du-temps',
        title: 'Emploi du temps',
        description: 'Grille hebdomadaire imprimable, avec détection des chevauchements.',
        icon: 'CalendarClock',
        tone: 'teal',
      },
      {
        path: '/remediation',
        title: 'Élèves en difficulté',
        description: 'Actions de remédiation engagées et résultats obtenus.',
        icon: 'LifeBuoy',
        tone: 'rose',
      },
      {
        path: '/sauvegarde',
        title: 'Sauvegarde et restauration',
        description: 'Protégez l’année : un fichier complet à conserver sur un second appareil.',
        icon: 'ShieldCheck',
        tone: 'slate',
      },
      {
        path: '/conseil-classe',
        title: 'Conseil de classe',
        description: 'Délibération, décisions de passage et procès-verbal de fin d’année.',
        icon: 'Gavel',
        tone: 'indigo',
      },
    ],
  },

];

/** Retrouve un module par son chemin (ex. '/enrolement'). */
export function findModule(path: string): AppModule | undefined {
  return APP_MODULES.find(m => m.path === path);
}

/** Renvoie le module qui contient le sous-module donné (pour le bouton Retour). */
export function moduleOfSubPath(subPath: string): AppModule | undefined {
  const clean = (subPath || '').split('?')[0];
  return APP_MODULES.find(m =>
    m.subModules.some(s => {
      const base = s.path.replace('/:firstClass', '');
      return clean === s.path || (base !== '/class' && clean.startsWith(base));
    }),
  );
}

/** Remplace le jeton `:firstClass` par l'identifiant de la première classe. */
export function resolveSubPath(path: string, firstClassId?: string): string {
  if (!path.includes(':firstClass')) return path;
  return firstClassId ? path.replace(':firstClass', firstClassId) : '/class/new';
}

/** Nombre total de sous-modules (utilisé par les tests et l'accueil). */
export function totalSubModules(): number {
  return APP_MODULES.reduce((n, m) => n + m.subModules.length, 0);
}

/** Le chemin correspond-il à une fonctionnalité encore en développement ? */
export function isComingSoon(path: string): boolean {
  return APP_MODULES.some((m) => m.subModules.some((s) => s.path === path && s.comingSoon === true));
}

/** Liste des chemins marqués « À venir ». */
export function comingSoonPaths(): string[] {
  return APP_MODULES.flatMap((m) => m.subModules.filter((s) => s.comingSoon).map((s) => s.path));
}
