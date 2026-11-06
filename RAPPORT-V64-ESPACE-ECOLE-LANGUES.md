# RAPPORT V64 — Espace École multi-classes + Français GCO + Anglais au Primaire

**Date :** 20 octobre 2026 · **Base :** code source v60 (`msp-app-source.zip`) · **Cache PWA :** `master-soutien-v64`

Trois demandes réalisées :

1. **Chaque école a son propre espace avec toutes ses classes**, avec deux abonnements annuels d'établissement :
   - **6 000 FCFA/an** — écoles de la **Maternelle au CM2** ;
   - **10 000 FCFA/an** — écoles de la **Maternelle en Terminale**.
2. **« Grammaire, Conjugaison et Orthographe francophones »** — contenu enrichi (32 leçons + quiz).
3. **« Les notions basiques d'anglais pour le Primaire »** — contenu enrichi (12 unités + quiz).

---

## 1. L'Espace École

### Ce que voit l'utilisateur

Accueil → **Mon école** → *Espace de mon école* (`#/espace-ecole`), *Toutes les classes de mon école* (`#/espace-ecole/classes`),
*Abonnement École* (`#/espace-ecole/abonnement`).

- **Sans formule École** : présentation, les 2 offres (contenu + classes du périmètre), bouton WhatsApp de demande,
  et le champ de saisie du **code École** reçu après paiement. Un code d'une autre formule est refusé avec une explication.
- **Avec formule École** : 4 onglets —
  - **Tableau de bord** : identité de l'école, classes, élèves, filles/garçons, % de notes saisies, effectifs par cycle, classes vides signalées, **résumé copiable/partageable** ;
  - **Mes classes** : toutes les classes regroupées par cycle, lien direct vers chaque classe, **titulaire** éditable, **rattachement** des classes créées avant l'espace, détachement sans suppression ;
  - **École & génération** : informations de l'établissement (direction, téléphone, commune, circonscription, année, devise) et **génération en un clic** des classes : niveaux cochables, **1 à 4 groupes parallèles** (A, B, C, D), **séries du lycée A1/A2/B/C/D**, aperçu du nombre de classes, **aucun doublon** à la régénération ;
  - **Abonnement** : formule active et échéance, offres, **tableau comparatif niveau par niveau**, passage 6000 → 10000 F par saisie du nouveau code.

### Les deux périmètres (vérifiés par test automatisé)

| Formule | Classes générées (1 groupe/niveau) |
|---|---|
| **6 000 F/an** | Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1, CM2 — **8 classes** |
| **10 000 F/an** | les 8 précédentes + 6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ + 2nde/1ʳᵉ/Tle déclinées par série(s) choisie(s) — ex. séries A2+D : **18 classes** |

Chaque classe créée reçoit les **matières officielles** existantes de son ordre d'enseignement
(préscolaire/primaire EducMaster/secondaire), la bonne période (trimestre/semestre), le nom de l'école
(imprimé sur les bulletins) et le rattachement à l'espace (`ClassData.schoolId`, champ additif).

### Tarification et codes (compatible avec l'existant)

Le plan reste porté par le **premier chiffre** du code à 6 chiffres (Luhn, hors-ligne) :

| Préfixe | Formule | Prix/an |
|---|---|---|
| `9…` | Essentiel | 999 F *(inchangé)* |
| `1…` | Complet | 1 500 F *(inchangé)* |
| `2…` | Pro | 2 500 F *(inchangé)* |
| **`6…`** | **École — Maternelle au CM2** | **6 000 F** |
| **`7…`** | **École — Maternelle en Terminale** | **10 000 F** |

- Les formules École **incluent tout le Pro** (registres, vie scolaire, bulletins, dossiers parents…).
- **Aucun droit retiré** : les codes déjà distribués conservent exactement leur périmètre ; un éventuel ancien
  code en « 6/7 » ne peut que gagner des droits. L'Espace École est un ajout, pas un retrait.
- Le **générateur de codes du Super Administrateur** propose les 5 formules (cartes lues dans le catalogue),
  avec le bon préfixe affiché et le Libellé complet dans le message WhatsApp d'envoi du code.
- L'**écran d'accès** présente les 5 formules, détecte « 6… »/« 7… » à la saisie et nomme proprement chaque formule.
- La **limite v61 « une seule classe par niveau au primaire »** ne s'applique plus aux abonnements École
  (la direction gère plusieurs classes d'un même niveau). Les classes créées à la main pour l'école de
  rattachement entrent **automatiquement** dans son espace.
- **Plusieurs espaces** possibles sur un appareil (école + annexe, changement d'année) ; suppression d'un
  espace **sans jamais effacer** classes/élèves/notes. Les espaces et les scores des quiz sont inclus
  dans la **sauvegarde** de l'application.

> **Limite assumée (même architecture que le reste de l'application)** : tout reste **local et hors-ligne**.
> L'espace d'une école vit sur l'appareil de la direction ; il n'y a pas de synchronisation automatique
> entre les téléphones des enseignants et celui du directeur. Les mécanismes existants (sauvegarde/restauration,
> cloud optionnel) restent le moyen d'échanger les données.

### Fichiers

- `src/utils/schoolSpace.ts` (nouveau) — espaces, périmètres, génération sans doublon, statistiques, résumé.
- `src/components/SchoolSpaceScreen.tsx` (nouveau) — offres, activation, tableau de bord, classes, génération.
- `src/utils/simpleCode.ts`, `src/utils/subscription.ts`, `src/utils/userProfile.ts` — plans `ecole-primaire`/`ecole-complete`, préfixes 6/7, migrations sûres.
- `src/utils/database.ts` — `ClassData.schoolId` + `teacherName` (optionnels), clés de sauvegarde v64.
- `src/App.tsx` — routes, portail d'accès (découverte École ouverte, périmètre Pro ouvert aux École), rattachement automatique des classes manuelles.
- `AccessGate`, `ProfileScreen`, `UpgradeScreen`, `AdminDashboardScreen` — 5 formules et Libellés lus dans le catalogue
  (corrige au passage l'affichage « Complet » pour les abonnés Pro dans le profil).

## 2. Grammaire, Conjugaison et Orthographe francophones

Accueil → **Français et Anglais** → *Grammaire, Conjugaison et Orthographe francophones* (`#/francais-gco`).
**32 leçons** (CE1 → 6ᵉ), chacune avec : objectif, règle complète, **astuce** (tests de remplacement), tableau si besoin,
exemples du contexte béninois, pièges fréquents, « à retenir », **exercice corrigé masquable**, lecture vocale 🇫🇷,
bouton **« Copier pour le cahier »** (texte prêt pour les fiches/Word) + **quiz de 24 questions** corrigées et expliquées,
meilleur score conservé. Recherche insensible aux accents, filtres par domaine.

- **Grammaire (11)** : phrase ; types de phrases/négation ; nom ; déterminants ; adjectif ; pronoms personnels ;
  verbe/infinitif/groupes ; sujet ; COD/COI/CC ; groupe nominal ; phrase complexe ; mots invariables.
- **Conjugaison (8)** : présent -er (+ particularités) ; être/avoir/aller ; présents 2ᵉ/3ᵉ groupes ;
  futur simple et proche (radicaux irréguliers) ; imparfait ; passé composé (auxiliaires, participes, accords) ;
  passé simple des contes ; impératif et conditionnel ; bien choisir le temps d'un récit.
- **Orthographe (11)** : a/à ; et/est + son/sont ; on/ont + ou/où ; ce/se/ces/ses/c'est/s'est ; la/là/l'a + peu/peut ;
  -er ou -é ; accord sujet-verbe ; accord du participe passé avec être ; pluriels et exceptions ;
  féminins ; accents/cédille/apostrophe/ponctuation.

Données : `src/utils/frenchGCOData.ts` · Écran : `src/components/FrenchGCOScreen.tsx`.
Accès : formules **Complet et supérieures** (Pro, École) et essai gratuit — verrouillé en Essentiel (écran de mise à niveau).

## 3. Les notions basiques d'anglais pour le Primaire

Accueil → **Français et Anglais** → *Les notions basiques d'anglais pour le Primaire* (`#/anglais-primaire`).
**12 unités** CI → CM2, chacune avec : objectif, **12 mots de vocabulaire** (anglais/français/**prononciation guidée
« à la française »** + 🔊 voix anglaise du téléphone), phrases clés bilingues, **point de grammaire simple**,
dialogue quand il y a lieu, **activité de classe** prête à mener, exercice corrigé + **quiz de 24 questions**.

Unités : 1 *Hello!* se présenter · 2 Alphabet & épeler · 3 Nombres 0–100 · 4 Couleurs & formes ·
5 Dans la classe (consignes) · 6 Corps & santé · 7 Famille & maison · 8 Animaux ·
9 Au marché (prix, politesse — dialogue en francs CFA) · 10 Jours, mois, météo, heure ·
11 Ma journée (présent simple) · 12 Questions & politesse.

Données : `src/utils/englishPrimaryData.ts` (144 mots) · Écran : `src/components/EnglishPrimaryScreen.tsx` ·
Audio : `speakTextLang()` ajouté à `src/utils/speech.ts` (la lecture française existante est inchangée).
Accès : mêmes formules que le français (Complet+ / essai).

## Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| TypeScript (`npx tsc --noEmit`, strict) | ✅ 0 erreur |
| Build de production (`npm run build:lowmem`) | ✅ OK (≈ +200 Ko de contenus) |
| Poids du paquet à déployer | ✅ 13,5 Mo → **6,9 Mo** : `icon-192.png`/`icon-512.png` faisaient 1254×1254 px (≈2,7 Mo pièce) pour des tailles déclarées de 192/512 px — redimensionnées à leur vraie taille, `cover.png` ramenée à 1200 px de large (même rendu visuel) |
| **Nouveau test `tests/e2e-v64.mjs`** | ✅ **49/49** (accès 5 formules + détection 6/7, refus d'un mauvais code, activation, 8 classes primaire sans doublon, 18 classes jusqu'en Tle D, accès Pro, 32 leçons FR + filtres + corrigé + quiz, 12 unités EN + recherche + quiz, verrouillages Essentiel) |
| Régressions `e2e-v53`, `e2e-v54`, `e2e-v60` | ✅ 15/15, 21/21, 17/17 |
| Captures (`tests/captures-v64.mjs`) | `apercu-v64-forfaits-ecole.png`, `apercu-v64-generateur.png`, `apercu-v64-espace-ecole.png`, `apercu-v64-francais.png`, `apercu-v64-anglais.png` |

## Codes de démonstration (à usage de test uniquement)

> Générés par l'algorithme public de l'application (Luhn) : **`612 341`** (École 6000 F) et **`712 349`** (École 10000 F).
> Pour la vente, le Super Administrateur génère ses propres codes dans l'Espace administrateur et ne diffuse que ceux-là.

## Mise en ligne

```bash
npm install
npm run build:lowmem   # produit dist/ + deploy/ prêts à publier
```

- **Vercel (depuis les sources)** : pousser ce dossier sur GitHub puis importer sur vercel.com — le `vercel.json`
  du projet lance déjà `npm run build:lowmem` avec le dossier de sortie `dist`.
- **Glisser-déposer (Netlify Drop, Vercel, GitHub Pages…)** : publier le **contenu** du dossier `deploy/`
  (ou le zip `msp-v64-deploy.zip` fourni) : `index.html`, `assets/`, `sw.js`, `manifest.json`, icônes.
  Ne pas republier les anciens fichiers ZIP dans le dépôt : seul le contenu de `deploy/` (ou les sources) doit y figurer.
- Les utilisateurs installés recevront la mise à jour via le bandeau « Mettre à jour » (cache `master-soutien-v64`) ;
  leurs codes, classes et notes sont conservés.
