# RAPPORT V65 — Cantine : nouvel arrondi de sortie des denrées + guide complété

**Date :** 20 octobre 2026 · **Base :** v64 · **Cache PWA :** `master-soutien-v65`  
**Graphique source fourni :** `methode-arrondi-sortie-denrees-v65.jpg`

## 1. Nouvelle méthode d’arrondi du prélèvement des vivres

La quantité brute reste calculée comme auparavant — **ration par élève × effectif du service**. Ensuite, l’application conserve la partie entière et classe **la partie décimale** dans les intervalles du graphique.

### Huile, céréales et légumineuses

| Partie décimale | Fraction à sortir |
|---:|---:|
| `[0 ; 0,375]` | 0,25 |
| `]0,375 ; 0,625]` | 0,50 |
| `]0,625 ; 0,875]` | 0,75 |
| `]0,875 ; 1]` | 1 — unité entière suivante |

### Sel

| Partie décimale | Fraction à sortir |
|---:|---:|
| `[0 ; 0,15]` | 0,10 |
| `]0,15 ; 0,25]` | 0,20 |
| `]0,25 ; 0,35]` | 0,30 |
| `]0,35 ; 0,45]` | 0,40 |
| `]0,45 ; 0,55]` | 0,50 |
| `]0,55 ; 0,65]` | 0,60 |
| `]0,65 ; 0,75]` | 0,70 |
| `]0,75 ; 0,85]` | 0,80 |
| `]0,85 ; 0,95]` | 0,90 |
| `]0,95 ; 1]` | 1 — unité entière suivante |

### Arbitrages explicitement validés avant développement

- Une quantité nulle reste **0**.
- Une quantité entière exacte reste entière : **15,00 kg → 15 kg**, et non 15,25 kg.
- Une borne appartient à l’intervalle qui se termine sur elle : **0,375 → 0,25** et **0,15 → 0,10**.
- La règle s’applique à **toutes les sorties de denrées**, y compris les sorties saisies dans le cahier de stock.
- Les anciennes semaines non clôturées sont **recalculées dès leur ouverture**.

### Exemples contrôlés

| Denrée | Besoin calculé | Lecture | Sortie |
|---|---:|---|---:|
| Maïs | 42,30 kg | 0,30 ∈ `[0 ; 0,375]` | **42,25 kg** |
| Huile | 3,10 L | 0,10 ∈ `[0 ; 0,375]` | **3,25 L** |
| Pois vert | 8,46 kg | 0,46 ∈ `]0,375 ; 0,625]` | **8,50 kg** |
| Sel | 0,15 kg | borne de `[0 ; 0,15]` | **0,10 kg** |
| Sel | 0,84 kg | 0,84 ∈ `]0,75 ; 0,85]` | **0,80 kg** |
| Sel | 0,96 kg | 0,96 ∈ `]0,95 ; 1]` | **1 kg** |

## 2. Écrans et calculs mis à jour

### Moteur unique

`src/utils/canteenCalc.ts` centralise désormais :

- `CANTEEN_ROUNDING_RULES` — les intervalles officiels, réutilisés par les calculs, l’aide visuelle et les tests ;
- `roundCanteenOutput()` — classement exact de la partie décimale, en arithmétique entière pour éviter les erreurs de virgule flottante sur 0,375 ou 0,15 ;
- `roundCanteenFoodOutput()` et `roundCanteenNamedFoodOutput()` — choix automatique quart/dixième ;
- `canteenRoundingInterval()` — intervalle ayant produit un résultat, pour l’expliquer à l’écran.

Les anciens `roundUpToMultiple()` (plafond) et `roundToMultiple()` (MROUND v44) restent exportés pour compatibilité historique, mais **ne servent plus aux sorties de vivres**.

### Super MSP Simulateur cantine

- Prévision hebdomadaire et prélèvements journaliers recalculés par service avec les nouveaux intervalles.
- Exemple de calcul affiché avec l’intervalle réellement utilisé.
- Graphique complet des deux règles dans `src/components/CanteenRoundingGuide.tsx`.
- Note v65 dans la saisie journalière.
- Dans l’ancien jeu de référence de 310 élèves, le seul changement est l’huile : 3,10 L/service → **3,25 L**, soit une prévision de **16,25 L** sur 5 jours (au lieu de 15 L avec MROUND).

### Cahier MSP des menus hebdomadaires

- La colonne « À sortir » n’utilise plus l’arrondi au multiple supérieur.
- Elle utilise le même moteur : quart pour maïs/riz/légumineuses/huile, dixième pour le sel.
- Le graphique de la méthode est affiché dans le cahier.
- Exemple pour 282 élèves : maïs **42,25 kg**, pois vert **8,50 kg**, huile **2,75 L**, sel **0,80 kg**.

### Cahier MSP de gestion des stocks

- La colonne **SORTIE** suit les intervalles v65, y compris lorsqu’elle est saisie à la main.
- Avant l’ajout d’une ligne, un aperçu indique la sortie qui sera réellement enregistrée et l’intervalle utilisé.
- Lorsqu’une sortie existante est corrigée, elle est normalisée lorsque le champ perd le focus, sans empêcher la frappe.
- Les **entrées dotation** et le stock initial ne sont pas arrondis : une dotation reçue de 49,80 kg reste 49,80 kg.
- Exemple testé : dotation maïs 49,80 kg − sortie brute 8,46 kg arrondie à 8,50 kg = **41,30 kg** restants.

### Exports

Les fiches et exports de cantine mentionnent la méthode v65 : texte partagé, impression du simulateur, PDF/Excel du simulateur, impression/PDF/Excel du cahier des menus et documents du cahier de stock. Les quantités exportées sont donc traçables.

## 3. Traitement des données déjà enregistrées

| Donnée | Comportement v65 |
|---|---|
| Semaine du simulateur en brouillon | Recalculée à l’ouverture ; marquée `v65-intervalles-sortie` |
| Cahier de menus existant | Recalculé à l’ouverture, en reconstituant le solde de départ pour éviter tout décalage de stock |
| Semaine clôturée | **Inchangée** : document historique. Si elle est rouverte, elle devient un brouillon et sera recalculée au chargement |
| Ancienne ligne de stock non modifiée | Inchangée : le registre reste fidèle au mouvement réellement passé |
| Nouvelle sortie de stock ou sortie corrigée | Arrondie par intervalles |

## 4. Guide de l’utilisateur mis à jour

### Manuel intégré (`src/utils/manualContent.ts`)

- Nouvel encadré d’introduction **« Nouveautés intégrées à ce guide »**.
- Chapitre 1 : fiche **« Choisir et activer une formule »** avec les 5 formules, dont École 6000/10000 F.
- Chapitre 6 entièrement actualisé :
  - nouvelle fiche détaillée **« Arrondi de sortie des denrées (méthode v65) »** avec les 4 intervalles au quart, les 10 intervalles du sel, les bornes, 4 exemples et les cas particuliers ;
  - fiche simulateur : recalcul par service, brouillons rouverts, semaines clôturées historiques ;
  - fiche cahiers : menu recalculé à l’ouverture, sortie de stock arrondie, dotation exacte.
- Chapitre 13 : recherche du manuel et rubriques de tutoriels mises à jour ; correction d’une ancienne contradiction — le manuel se consulte dans l’application et n’est pas téléchargeable depuis l’écran.
- Chapitre 14 : génération des codes des 5 formules, dont les codes École « 6… » et « 7… ».
- Chapitre 15 v64 conservé et enrichi pour l’usage quotidien de l’Espace École :
  - activation 6000/10000 F ;
  - création de l’espace et génération de toutes les classes ;
  - **Grammaire, Conjugaison et Orthographe francophones** ;
  - **Les notions basiques d’anglais pour le Primaire**.

### Aides contextuelles (`src/components/SectionGuide.tsx`)

Nouveaux guides rapides à la première ouverture de :

- `Mon école` / `Espace École` ;
- `Grammaire, Conjugaison et Orthographe francophones` ;
- `Les notions basiques d’anglais pour le Primaire` ;
- module `Français et Anglais` ;
- simulateur de cantine ;
- cahier des menus ;
- cahier de stock ;
- accueil du module Cantine.

### Tutoriels

`src/utils/userGuide.ts` ajoute les rubriques **« Espace École »** et **« Français et Anglais au primaire »**. Les tutoriels de la cantine v65 se classent dans la rubrique existante **« Cantine scolaire »**.

## 5. Vérifications

| Contrôle | Résultat |
|---|---|
| TypeScript strict (`tsc --noEmit`) | ✅ 0 erreur |
| Nouveau test `tests/e2e-v65-cantine.mjs` | ✅ **41/41** |
| Régressions navigateur v40 + v44 + v54 + v58 + v60 + v64 | ✅ **186/186** |
| Audit métier complet `tests/audit.ts` | 1876 contrôles réussis ; 24 contrôles anciens déjà en échec avant cette tâche (anciens totaux de modules/formules et hypothèses de versions antérieures), aucun échec Cantine v65 ni Guide v64/v65 |
| Captures | `apercu-v65-arrondi-cantine.png`, `apercu-v65-stock-arrondi.png`, `apercu-v65-guide-cantine.png`, `apercu-v65-guide-contextuel-cantine.png` |

Les tests v65 couvrent notamment les bornes 0,375 et 0,15 dans l’audit, les minimums 0,25/0,10 pour 1 élève, les entiers exacts pour 100 élèves, la migration des brouillons, la préservation d’une semaine clôturée, le cahier de menus, les sorties de stock maïs/sel iodé, la dotation exacte, la recherche dans le manuel et les aides contextuelles.

## 6. Mise en ligne

```bash
npm install
npm run build:lowmem
```

Publier le contenu de `deploy/` — ou `livrables-v65/msp-v65-deploy.zip` — sur Netlify Drop, Vercel ou GitHub Pages. Les utilisateurs installés recevront la version `master-soutien-v65` par le bouton « Mettre à jour » ; leurs abonnements, classes, élèves, notes, semaines de cantine et registres restent conservés.
