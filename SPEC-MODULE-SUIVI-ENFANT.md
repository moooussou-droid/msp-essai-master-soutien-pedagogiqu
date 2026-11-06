# MODULE « SUIVI DE VOTRE ENFANT »
## Spécifications fonctionnelles et architecture — document de cadrage (v48)

**Application :** Master Soutien Pédagogique (Votre compagnon mobile)
**Cible :** parents et tuteurs d'élèves du préscolaire et du primaire, Bénin
**Statut :** proposition de conception — **aucun code n'a encore été écrit**

---

## 0. AVERTISSEMENT PRÉALABLE : UN CONFLIT D'ARCHITECTURE À TRANCHER

Votre demande comporte une contradiction technique qu'il faut régler **avant** de coder,
sans quoi le module serait impossible à tenir.

**Master Soutien Pédagogique est aujourd'hui une application 100 % hors ligne.** Les
données vivent dans la mémoire du téléphone de l'enseignant (IndexedDB). Il n'existe
aucun serveur qui détienne les notes ou les présences.

Or trois de vos demandes **exigent un serveur** :

| Demande | Pourquoi elle est impossible hors ligne |
|---|---|
| Notes « en temps réel » | Le parent et l'enseignant sont sur deux téléphones différents |
| Messagerie instantanée | Un message doit transiter par un intermédiaire |
| Notifications push | Le push part obligatoirement d'un serveur |

**Ce qui existe déjà et peut servir de socle :** l'application dispose d'une
**synchronisation chiffrée de bout en bout** (`src/utils/cloudSync.ts`, adossée à
Supabase). Le serveur n'y voit qu'un bloc illisible : le mot de passe secret ne le quitte
jamais. C'est exactement le bon modèle pour des données d'enfants.

**Trois scénarios possibles — à arbitrer par vous :**

| | A. Hors ligne strict | B. Mixte *(recommandé)* | C. Tout connecté |
|---|---|---|---|
| Notes, bulletins | Code de partage à saisir | **Synchronisé, chiffré** | Temps réel |
| Messagerie | ❌ impossible | **Messages différés** | Instantanée |
| Push | ❌ impossible | **À l'ouverture** | ✅ |
| Coût serveur | 0 | Faible | Élevé |
| Conformité APDP | Simple | Maîtrisée | Lourde |
| Fidèle à l'esprit de l'app | ✅ | ✅ | ❌ |

👉 **Je recommande le scénario B.** Il tient vos 4 piliers en restant fidèle à la promesse
d'une application qui fonctionne sans internet : le parent consulte **toujours** hors
ligne la dernière version reçue, et la synchronisation ne fait que rafraîchir. En zone
rurale béninoise, où la connexion est intermittente, c'est le seul modèle réaliste.
Le mot « temps réel » devient alors « à la dernière synchronisation », avec la date
affichée en clair.

**Le reste de ce document est rédigé dans l'hypothèse du scénario B.**

---

## 1. USER STORIES PRIORITAIRES

### Pilier 1 — Accès et outils de base

> **US-1.1** — En tant que **parent disposant d'un téléphone Android d'entrée de gamme**,
> je veux **accéder au suivi de mon enfant sans rien installer depuis une boutique**,
> afin de **ne pas saturer la mémoire de mon appareil ni consommer mes données**.
> *Critères d'acceptation :* l'application s'installe depuis le navigateur (PWA) ;
> elle reste utilisable sans connexion ; l'écran fonctionne dès 320 px de large.

> **US-1.2** — En tant que **parent de plusieurs enfants dans la même école**,
> je veux **basculer d'un enfant à l'autre en un geste**,
> afin de **ne pas gérer plusieurs comptes ni me tromper de bulletin**.
> *Critères :* sélecteur d'enfant permanent en haut de l'écran ; un seul code parent
> peut rattacher plusieurs élèves ; le nom de l'enfant actif est toujours visible.

> **US-1.3** — En tant que **parent convoqué par l'administration**,
> je veux **retrouver et présenter le bulletin de mon enfant même sans réseau**,
> afin de **ne pas dépendre d'une connexion le jour du rendez-vous**.
> *Critères :* les bulletins reçus sont conservés sur l'appareil ; export PDF ;
> la date de la dernière mise à jour est affichée.

### Pilier 2 — Suivi de la scolarité

> **US-2.1** — En tant que **parent**, je veux **être averti dès qu'une absence est
> enregistrée pour mon enfant**, afin de **réagir le jour même plutôt que de le
> découvrir sur le bulletin trimestriel**.
> *Critères :* l'absence apparaît avec sa **demi-journée** (matin / après-midi, une seule
> le mercredi, rien le week-end — règle déjà en vigueur dans l'application) ; le parent
> peut la justifier depuis l'application ; un compteur de demi-journées manquées est tenu.

> **US-2.2** — En tant que **parent qui n'a pas été scolarisé longtemps**,
> je veux **comprendre si mon enfant progresse ou décroche sans avoir à interpréter des
> chiffres**, afin de **savoir quand m'inquiéter**.
> *Critères :* chaque moyenne est accompagnée d'une lecture en clair (« au-dessus de la
> moyenne de la classe », « en baisse depuis la dernière évaluation ») ; code couleur ;
> **jamais de classement public des élèves entre eux**.

> **US-2.3** — En tant que **parent**, je veux **voir les devoirs à faire pour les jours
> à venir**, afin de **faire réviser mon enfant le soir**.
> *Critères :* liste par date et par matière ; case « fait » côté parent ; les devoirs
> passés restent consultables une semaine.

### Pilier 3 — Communication école-famille

> **US-3.1** — En tant que **parent**, je veux **écrire directement à l'enseignant de mon
> enfant**, afin de **poser une question sans me déplacer ni attendre la réunion**.
> *Critères :* fil de discussion par enfant ; **l'enseignant n'expose jamais son numéro
> personnel** ; horaires de réception affichés ; accusé de lecture.

> **US-3.2** — En tant que **directeur d'école**, je veux **diffuser une information
> urgente à toutes les familles** (fermeture, intempérie, rappel de réunion),
> afin de **joindre tout le monde sans convoquer l'assemblée**.
> *Critères :* diffusion par classe ou école entière ; marquage « urgent » distinct ;
> taux de lecture visible par l'administration ; **le parent ne peut pas répondre** à une
> diffusion générale (évite l'engorgement).

> **US-3.3** — En tant que **parent qui travaille**, je veux **réserver un créneau de
> rendez-vous parmi ceux ouverts par l'enseignant**, afin de **rencontrer le maître sans
> négociation par messages successifs**.
> *Critères :* l'enseignant publie ses créneaux ; un créneau réservé disparaît pour les
> autres ; rappel la veille ; annulation possible jusqu'à 24 h avant.

### Pilier 4 — Accompagnement et ressources

> **US-4.1** — En tant que **parent ne maîtrisant pas le programme scolaire**,
> je veux **des fiches d'aide expliquant comment accompagner mon enfant sur une notion**,
> afin de **l'aider sans lui enseigner une méthode contraire à celle du maître**.
> *Critères :* fiches rattachées aux matières du programme béninois ; langage simple ;
> consultables hors ligne ; format court (une page).

> **US-4.2** — En tant que **parent**, je veux **recevoir des conseils sur le temps
> d'écran et l'usage du téléphone par mon enfant**, afin de **poser des règles à la maison**.
> *Critères :* fiches de parentalité numérique par tranche d'âge ; ton non culpabilisant ;
> adapté au contexte béninois (téléphone partagé en famille, pas un par enfant).

> **US-4.3** — En tant qu'**enseignant**, je veux **envoyer aux familles une ressource
> de révision ciblée**, afin de **prolonger la remédiation à la maison**.
> *Critères :* envoi à une classe ou à un élève précis ; PDF ou image ; **poids limité**
> et avertissement de taille avant téléchargement (le parent paie ses données mobiles).

---

## 2. ARBORESCENCE (SITEMAP)

Principe : **profondeur maximale de 2 niveaux**, gros boutons, vocabulaire du parent et
non du pédagogue (« Mon enfant est-il en classe ? » plutôt que « Module de présence »).

```
🏠 SUIVI DE VOTRE ENFANT
│
├── [Sélecteur d'enfant]  ← permanent, en haut de chaque écran
│
├── 1. ACCUEIL
│     ├── Alertes du jour (absence, message urgent, devoir pour demain)
│     ├── Résumé : dernière note · présences de la semaine · prochain rendez-vous
│     └── Bandeau « Mis à jour le 17/09 à 14 h 20 » + bouton Actualiser
│
├── 2. SCOLARITÉ
│     ├── Notes et moyennes        (par évaluation, avec lecture en clair)
│     ├── Bulletins                (PDF, conservés hors ligne)
│     ├── Présences et absences    (demi-journées + justification)
│     ├── Devoirs à faire          (par date, case « fait »)
│     └── Emploi du temps
│
├── 3. COMMUNICATION
│     ├── Messages                 (fil par enseignant)
│     ├── Annonces de l'école      (lecture seule)
│     └── Rendez-vous              (créneaux, réservation, rappels)
│
├── 4. ACCOMPAGNEMENT
│     ├── Aide aux devoirs         (fiches par matière et par notion)
│     ├── Ressources de la classe  (envoyées par l'enseignant)
│     └── Parentalité numérique    (conseils par tranche d'âge)
│
└── 5. MON COMPTE
      ├── Mes enfants              (rattachement par code, retrait)
      ├── Notifications            (choix des alertes)
      ├── Confidentialité          (consentement, export, suppression)
      └── Conditions d'utilisation
```

**Côté enseignant / école** — trois ajouts seulement, dans les écrans existants :
`Devoirs à publier` · `Créneaux de rendez-vous` · `Boîte de messages parents`,
plus un bouton **« Générer le code parent »** sur la fiche de chaque élève.

---

## 3. FONCTIONNALITÉS DU MVP

Critère de tri : **ce qui, retiré, rendrait le module inutile**.

### ✅ DANS le MVP

| # | Fonctionnalité | Justification |
|---|---|---|
| 1 | **Rattachement par code parent** (code à usage unique généré par l'enseignant) | Sans lien fiable parent↔élève, rien d'autre n'est possible — et c'est le verrou de sécurité central |
| 2 | **Sélecteur multi-enfants** | Très fréquent au Bénin ; ajouté après coup, il casserait toute la navigation |
| 3 | **Consultation des notes + bulletin PDF** | Le premier besoin exprimé par les parents |
| 4 | **Présences / absences avec justification** | Seule fonction à valeur *immédiate* (le reste est consultatif) |
| 5 | **Devoirs à faire** | Le service le plus utilisé au quotidien |
| 6 | **Annonces de l'école** (descendant, lecture seule) | Couvre 80 % du besoin de communication pour 20 % de l'effort |
| 7 | **Consultation hors ligne + date de synchronisation** | Non négociable : c'est la promesse de l'application |
| 8 | **Consentement et registre APDP** | Obligation légale, impossible à rétrofitter (voir §4) |

### ⏸️ APRÈS le MVP

| Fonctionnalité | Pourquoi différer |
|---|---|
| **Messagerie bidirectionnelle** | Coûteuse (modération, charge enseignante, horaires) ; les annonces descendantes suffisent d'abord |
| **Prise de rendez-vous** | Dépend de la messagerie ; peu utile tant que peu de familles sont équipées |
| **Notifications push** | Exige un service worker distant + consentement ; l'alerte à l'ouverture suffit au départ |
| **Fiches d'aide aux devoirs** | Gros travail éditorial ; à constituer progressivement |
| **Parentalité numérique** | Contenu, non technique : peut arriver par simple mise à jour |
| **Emploi du temps** | Aucune source de données n'existe encore dans l'application |

**⚠️ Point d'honnêteté : le MVP n'est pas un petit chantier.** Il suppose un modèle de
comptes parents, un serveur de synchronisation et une conformité APDP. C'est
**plus lourd que la v47 entière**. Je recommande de le livrer en **trois étapes** :
① rattachement + notes/bulletins · ② présences + devoirs · ③ annonces + notifications.

---

## 4. SÉCURITÉ ET PROTECTION DES DONNÉES DE MINEURS

### ⚖️ Le bon texte de référence n'est pas le RGPD

Vous parlez de RGPD, mais l'application est utilisée **au Bénin**. Le texte applicable est
la **loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin**
(Livre V), sous le contrôle de l'**APDP** (Autorité de Protection des Données à caractère
Personnel, apdp.bj). [1](https://dataprotection.africa/wp-content/uploads/2022/09/Benin_DPA.pdf) Le Code du numérique définit le **mineur comme toute
personne de moins de 18 ans**. [2](https://www.afapdp.org/wp-content/uploads/2018/06/Benin-Loi-2017-20-Portant-code-du-numerique-en-Republique-du-Benin.pdf)

Le RGPD reste une bonne boussole (les principes se recoupent), mais **c'est l'APDP qui
peut sanctionner**, et ses obligations propres priment.

### 🔴 Obligation n° 1 — Formalité préalable auprès de l'APDP

Aucun traitement de données personnelles ne peut être mis en œuvre sans avoir accompli
les formalités préalables prévues par la loi. [5](https://archive.apdp.bj/wp-content/uploads/2022/01/Decouverte_APDP_Pt_YD_re.pdf) Selon la nature du traitement, il s'agit
d'une **déclaration** ou d'une **demande d'autorisation** ; la démarche est **gratuite mais
obligatoire**. [4](https://archive.apdp.bj/wp-content/uploads/2021/11/Fiche.Pratique.Mise-en-conformite_Pt_OK_Validee.pdf)

👉 **Traiter des données scolaires de mineurs à grande échelle relève du régime le plus
exigeant.** Cette démarche doit être engagée **avant la première ligne de code serveur**,
car elle peut imposer des choix d'architecture (localisation des données, durées de
conservation). C'est un préalable administratif, pas une formalité de fin de projet.

### 🔴 Obligation n° 2 — Consentement du représentant légal

Le consentement doit être **libre, spécifique, informé**, résulter d'une **démarche active
et explicite**, et pouvoir être **retiré à tout moment sans frais**. [2](https://archive.apdp.bj/wp-content/uploads/2021/11/PRESENTATION_REGIMES_TRAITEMENT_AmbroiseZINSOU_2.pdf) L'élève étant mineur,
c'est **le parent ou tuteur légal** qui consent pour lui.

À intégrer dès l'écran de rattachement :
- case **non pré-cochée**, texte en français simple ;
- explication de **ce qui est collecté, pourquoi, et pour combien de temps** ;
- **retrait du consentement en un geste**, avec suppression effective.

### 🔴 Obligation n° 3 — Vérifier le lien de filiation

C'est le risque le plus grave du module : **qu'un tiers accède aux données d'un enfant**
(conflit familial, voisin curieux, personne malveillante).

Règles à appliquer :
- le **code de rattachement est généré par l'école**, à usage unique, avec expiration ;
- il est **remis en main propre** ou par un canal maîtrisé, **jamais publié** ;
- l'école peut **révoquer** un rattachement à tout moment ;
- **journal des rattachements** consultable par la direction ;
- en cas de **droits parentaux restreints** par décision de justice, la direction doit
  pouvoir bloquer un accès.

### 🔴 Obligation n° 4 — Minimisation et interdits

| Règle | Application concrète |
|---|---|
| **Minimisation** | Un parent ne voit **que son enfant**. Jamais les notes, absences ou noms des camarades. |
| **Pas de classement** | Aucun rang public. Un parent ne doit pas pouvoir situer les autres enfants. |
| **Données sensibles** | Santé, religion, origine : **exclues**. Le Code du numérique les soumet à un régime renforcé. [2](https://archive.apdp.bj/wp-content/uploads/2021/11/PRESENTATION_REGIMES_TRAITEMENT_AmbroiseZINSOU_2.pdf) |
| **Aucune publicité** | Pas de ciblage publicitaire sur des données d'enfants. Le module « Publicités » existant doit **rester hors** de l'espace parent. |
| **Pas de traceur tiers** | Aucun outil d'analyse externe dans l'espace parent. |
| **Conservation limitée** | Données purgées un délai fixé après le départ de l'élève ; durée annoncée. |

### 🔴 Obligation n° 5 — Sécurité technique

- **Chiffrement de bout en bout**, en réutilisant le modèle déjà en place dans
  `cloudSync.ts` : le serveur ne stocke qu'un bloc illisible.
- **Cloisonnement par rôle** : un compte parent ne doit jamais atteindre les écrans
  enseignant ou administration, ni par l'URL.
- **Chiffrement des données au repos** sur l'appareil du parent.
- **Journalisation des accès** aux dossiers d'élèves.
- **Droits garantis** : information préalable, accès, rectification, suppression [4](https://archive.apdp.bj/wp-content/uploads/2021/11/Fiche.Pratique.Mise-en-conformite_Pt_OK_Validee.pdf) —
  donc un bouton **« Exporter mes données »** et un bouton **« Supprimer mon compte »**.

### 🔴 Obligation n° 6 — Modération de la messagerie

Quand la messagerie arrivera (post-MVP) :
- **horaires de réception affichés** : protéger les enseignants du harcèlement nocturne ;
- **signalement d'un message** vers la direction ;
- **conservation des échanges** en cas de litige, avec durée annoncée ;
- **jamais de coordonnées personnelles** d'enseignant exposées.

### 📋 Conditions d'utilisation

L'application dispose depuis la **v47** de Conditions d'utilisation **modifiables par le
Super Administrateur**. Il faudra y **ajouter un volet « Espace parents »** :
finalité du traitement, données collectées, durée, droits, et **contact du responsable
de traitement**. Le mécanisme existe déjà — seul le texte reste à écrire.

---

## 5. CE QUE JE RECOMMANDE COMME PROCHAINE ÉTAPE

1. **Vous tranchez le scénario A / B / C** (§0). Rien ne peut être codé avant.
2. **Vous engagez la formalité APDP** en parallèle — c'est le chemin critique, et il ne
   dépend pas du développement.
3. Je livre alors **l'étape ① : rattachement par code parent + consultation des notes et
   du bulletin**, entièrement hors ligne, sans serveur, la synchronisation venant ensuite.

L'étape ① a un mérite : elle est **utile immédiatement** et **ne traite aucune donnée sur
un serveur** — donc elle peut démarrer pendant l'instruction du dossier APDP.

---

### Sources

- Loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin, Livre V — [texte intégral](https://dataprotection.africa/wp-content/uploads/2022/09/Benin_DPA.pdf) · [version AFAPDP](https://www.afapdp.org/wp-content/uploads/2018/06/Benin-Loi-2017-20-Portant-code-du-numerique-en-Republique-du-Benin.pdf)
- APDP — [Fiche pratique de mise en conformité](https://archive.apdp.bj/wp-content/uploads/2021/11/Fiche.Pratique.Mise-en-conformite_Pt_OK_Validee.pdf) · [Régimes de traitement](https://archive.apdp.bj/wp-content/uploads/2021/11/PRESENTATION_REGIMES_TRAITEMENT_AmbroiseZINSOU_2.pdf) · [Présentation de l'Autorité](https://archive.apdp.bj/wp-content/uploads/2022/01/Decouverte_APDP_Pt_YD_re.pdf)
