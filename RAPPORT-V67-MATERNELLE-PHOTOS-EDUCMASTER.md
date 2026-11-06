# Rapport v67 — Bulletin de Maternelle et photos d’identité EducMaster

## Demande traitée

La v67 apporte deux évolutions demandées :

1. présenter le bulletin de **Maternelle exactement comme le bulletin
   photographié** : grille trimestrielle d’observation en **TS / S / PS**,
   appréciation générale, visas et légendes ;
2. créer, pour **chaque école et chaque classe**, un système de préparation
   des photos d’élèves destinées à **EducMaster**, avec caméra intégrée,
   fond blanc et nom de fichier conforme à la règle EducMaster.

## 1. Bulletin officiel de Maternelle

Les classes préscolaires n’utilisent plus le bulletin numérique ordinaire.
Leur bouton Bulletins ouvre un écran dédié, sans moyenne, sans rang et sans
comparaison entre enfants.

### Page 1 — Grille d’évaluation trimestrielle

Le document reproduit :

- le titre **« GRILLE D’ÉVALUATION TRIMESTRIELLE »** et le trimestre ;
- les colonnes **N°**, **Domaine d’Évaluation**, **Échelle des valeurs**
  (**TS**, **S**, **PS**) et **Observation** ;
- les dix domaines, dans l’ordre du modèle :
  1. Fréquentations ;
  2. Propreté corporelle et vestimentaire ;
  3. Socialisation ;
  4. Langage ;
  5. Pré-écriture ;
  6. Éducation du mouvement ;
  7. Pré-lecture ;
  8. Pré-mathématique ;
  9. Poésie et Chant ;
  10. Autres ;
- la note précisant que l’évaluation repose sur l’observation permanente et
  que l’enfant est évalué par rapport à lui-même, non par rapport à ses
  camarades.

### Page 2 — Appréciation, visas et légendes

La deuxième page contient :

- **APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)** avec lignes d’écriture ;
- les cadres côte à côte **VISA DE L’ENSEIGNANT(E)** et **VISA DU
  DIRECTEUR(TRICE)** ;
- **VISA DES PARENTS OU TUTEURS DE L’ENFANT** ;
- **Signature et nom** ;
- les légendes **TS = Très Satisfaisant**, **S = Satisfaisant** et
  **PS = Peu Satisfaisant**.

### Saisie et conservation

- Une grille indépendante est conservée pour chaque enfant et chaque
  trimestre dans la clé `msp_prescolaire_evaluations_v1`.
- Pour chaque domaine, l’enseignant choisit TS, S ou PS et peut écrire une
  observation.
- L’appréciation générale est saisie dans le même écran.
- L’enregistrement automatique et l’enregistrement manuel sont disponibles.
- Lorsqu’une ancienne saisie numérique existe, un préremplissage facultatif
  peut proposer TS/S/PS, mais l’appréciation d’observation reste modifiable
  et aucune moyenne n’est imprimée.
- Le tableau de bord d’une classe de Maternelle affiche désormais le taux de
  **« Grille remplie »** calculé sur les dix domaines officiels.

### Documents produits

- aperçu officiel en deux pages ;
- impression A4 en deux pages ;
- PDF individuel officiel ;
- PDF officiel de toute la classe, deux pages par enfant ;
- Word officiel de la classe ;
- Excel de la grille TS/S/PS ;
- synthèse PDF de classe **sans classement** ;
- envoi WhatsApp du résumé prévu par l’application.

Les exports généraux sont protégés : pour une classe préscolaire, ils
redirigent vers les documents Maternelle dédiés au lieu de fabriquer un
bulletin avec moyennes et rangs.

## 2. Photos d’identité EducMaster

### Accès pour chaque école et chaque classe

Le nouveau studio **« Photos d’identité EducMaster »** est accessible :

- depuis le tableau de bord de chaque classe ;
- depuis le module **Enrôlement**, qui compte désormais trois sous-modules ;
- par la route `/class/:id/photos-educmaster`.

Dans le studio, un sélecteur permet de passer d’une classe à une autre. Il
est donc utilisable par toutes les classes d’une école, de la Maternelle au
secondaire selon les classes créées.

### Nom de fichier EducMaster

Le nom est construit sous la forme :

```text
matricule_VotreChoixDeNom
```

avec le matricule EducMaster de l’élève, puis le nom et les prénoms séparés
par des traits de soulignement. Exemple vérifié :

```text
104120183578_ASSOGBA_Jean_Paul.jpg
```

Le matricule est traité comme du texte : ses zéros initiaux sont conservés.
Les accents et signes incompatibles avec un nom de fichier sont normalisés.

### Caméra et cadrage d’identité

Le studio permet :

- d’ouvrir la **caméra intégrée** de Master Soutien Pédagogique et de
  capturer directement la photo ;
- d’utiliser, en secours, l’appareil photo natif ou un fichier existant ;
- de cadrer au format identité **4:5** ;
- de déplacer l’image, zoomer et pivoter par pas de 90° ;
- d’exporter une image finale nette de **800 × 1000 pixels** en JPEG.

La caméra du navigateur exige un contexte sécurisé (HTTPS ou localhost) et
l’autorisation de l’utilisateur. Si l’appareil refuse cet accès, le bouton
de prise de photo native/import reste disponible.

### Fond blanc sans modifier le sujet isolé

Le remplacement du fond est effectué hors ligne, dans l’application :

- l’algorithme part uniquement des pixels reliés aux bords de l’image ;
- il suit le fond tout en s’arrêtant sur les contours nets du sujet ;
- seuls les pixels de fond connectés aux bords sont remplacés par du blanc ;
- le visage et les vêtements isolés du fond ne sont pas blanchis ;
- une sensibilité réglable et un aperçu avant/après permettent de contrôler
  le résultat avant l’enregistrement.

Pour un détourage propre, l’application conseille un fond uni et contrasté
derrière l’enfant. Le test automatisé vérifie au niveau pixel qu’un fond
bleu devient blanc pendant que le visage et le vêtement central restent
inchangés.

### Import et remise à EducMaster

Le studio comprend aussi :

- le contrôle des élèves prêts ou non (matricule et photo) ;
- la détection des matricules en double dans la classe ;
- l’import groupé de photos déjà nommées, rattachées automatiquement grâce
  au matricule présent au début du nom de fichier ;
- le signalement des fichiers sans correspondance ;
- le téléchargement individuel au nom EducMaster exact ;
- un ZIP de classe contenant :
  - le dossier `PHOTOS_EDUCMASTER/` avec les JPEG correctement nommés ;
  - `BORDEREAU_PHOTOS_EDUCMASTER.csv` ;
  - `LISEZ-MOI_IMPORT_EDUCMASTER.txt` avec les étapes à suivre dans
    EducMaster.

L’application ne possède pas de session ni d’API officielle EducMaster :
elle prépare donc les fichiers conformes, puis l’utilisateur les sélectionne
dans EducMaster par **Actions → Importer les photos**, avant d’enregistrer.
L’application fournit également le lien vers EducMaster et les consignes.

## Guide de l’utilisateur

La documentation a été mise à jour :

- aide contextuelle de l’écran Bulletins en Maternelle ;
- aide contextuelle dédiée au studio photo EducMaster ;
- fiche complète du manuel intégré sur le nom de fichier, la caméra, le
  fond blanc, l’import groupé et le ZIP ;
- fiche du manuel sur la grille Maternelle TS/S/PS et ses deux pages ;
- README du projet ;
- cache PWA porté à `master-soutien-v67`.

## Vérifications effectuées

- `./node_modules/.bin/tsc --noEmit` : **0 erreur**.
- Audit projet `npx --yes tsx tests/audit.ts` : **1954 réussis / 24 échecs
  anciens ou périmés**. La nouvelle section 69 consacrée à la v67 réussit
  entièrement ; les 24 échecs restants concernent des assertions historiques
  sur Vercel, les anciennes formules/durées d’essai et l’ancien total de 41
  sous-modules (48 aujourd’hui).
- Nouvel E2E navigateur
  `tests/e2e-v67-maternelle-photos-educmaster.mjs` : **75/75**.
  Il contrôle notamment la persistance des dix domaines, les deux pages
  officielles, l’absence de moyenne/rang, les PDF individuel et de classe,
  Word, Excel, la caméra intégrée avec flux de test, le format 800 × 1000,
  le fond blanc au niveau pixel, le nom EducMaster exact, l’import groupé,
  le ZIP et l’accès depuis Enrôlement.
- Le PDF individuel généré par l’application a été relu avec PyMuPDF :
  **2 pages**, texte et mise en page conformes.
- Le chemin **Imprimer** a aussi été converti en PDF par Chromium :
  **2 pages A4**, sans débordement des visas ni des légendes.
- Régressions navigateur ciblées : v64 **49/49**, v45 **28/28**, v60
  **17/17**, v66 **30/30**, soit **124/124**.
- `npm run build:lowmem` : réussi, `dist = 7,02 Mo`, bundle principal
  `./assets/main-67GBXFDA.js`.
- `npm run deploy:check` : contrôles de `dist/` et `deploy/` réussis.
- `npm run deploy:verify http://localhost:4173` sur la production locale :
  page, bundle, service worker, manifeste et fallback répondent en HTTP 200.
- Smoke test du bundle de production : application chargée, guide
  EducMaster trouvé, service worker activé et **0 erreur JavaScript**.

## Captures et exemples livrés

- `apercu-v67-saisie-maternelle.png`
- `apercu-v67-bulletin-maternelle-page1.png`
- `apercu-v67-bulletin-maternelle-page2.png`
- `apercu-v67-bulletin-maternelle.pdf`
- `apercu-v67-impression-page1.png`
- `apercu-v67-impression-page2.png`
- `apercu-v67-classe-maternelle.png`
- `apercu-v67-studio-photo-educmaster.png`
- `apercu-v67-photo-fond-blanc.png`
- `apercu-v67-module-enrolement-photos.png`
- `apercu-v67-guide-educmaster.png`

## Livrables

- `APPLICATION-PRETE-A-PUBLIER.zip` : application construite v67, à
  décompresser puis à publier depuis le dossier obtenu.
- `msp-v67-source.zip` : code source complet de la v67.
- `msp-v67-deploy.zip` : contenu de production sans dossier racine ajouté.
- Dossier décompressé `APPLICATION-PRETE-A-PUBLIER/` dans les livrables v67.
