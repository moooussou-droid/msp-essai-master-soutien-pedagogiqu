# RAPPORT D'AUDIT — Master Soutien Pédagogique · V32

**Date :** 07/09/2026 — **Version livrée :** v32
**Validations :** `tests/audit.ts` → **665 réussis / 0 échec** · `tests/smoke.ts` → **58 réussis / 0 échec** · `tests/e2e.mjs` (vrai navigateur Chromium headless) → **24 réussis / 0 échec** · TypeScript `tsc --noEmit` : **0 erreur** · Build Vite + postbuild : **OK** (`dist/` + `deploy/`, PWA `master-soutien-v32`).

---

## 1. Présences / absences : la fonction ne répondait plus — CORRIGÉE

**Cause racine trouvée et réparée (2 bugs réels) :**

| Bug | Symptôme | Correction |
|---|---|---|
| **Crash à l'ouverture** (`Cannot read properties of null (reading 'present')`) | L'écran Présences « ne répondait pas » dès la première ouverture | `MonthlyReport` et le taux de classe renvoyaient `details: null` quand **aucun jour n'était enregistré** ; le rendu lisait `details!.present` → erreur React → écran mort. Rendu désormais **null-safe** : sans appel, le rapport affiche des zéros (jamais de null). |
| **« Tout le monde présent » n'enregistrait qu'UN élève** | Seule la **dernière** ligne de l'appel était sauvegardée | L'ancienne boucle réutilisait l'état fermé (closure obsolète : chaque `updateEntry` repartait des données d'origine). Remplacée par une **écriture atomique** : le jour d'appel est construit pour **tous les élèves** puis enregistré **en une seule opération**. |

**Vérifications (reproduit puis validé) :**
- Ouverture de l'écran **sans aucune donnée** : plus d'erreur JavaScript (testé dans le harnais jsdom ET en navigateur réel).
- Parcours complet en vrai navigateur : appel du jour → **« Tout le monde présent » marque les 2 élèves** → statuts individuels (Retard, Abs. injustifiée + champ motif) → **rechargement de la page : l'appel est conservé** (IndexedDB réelle) → **PV mensuel** affiché avec les élèves.
- Export Excel / Word du PV : fonctions existantes intactes (toujours protégées contre l'absence de données — l'alerte « Aucun jour enregistré » s'affiche au lieu d'un crash).

---

## 2. Détection des fonctions qui « ne répondent pas » — méthodologie

Un **harnais de fumée** (`tests/smoke.ts`) monte **réellement chaque écran** de l'application dans un DOM simulé (jsdom + IndexedDB en mémoire), avec un **root React neuf par route** et la capture de **toutes les erreurs** (window.onerror + unhandledRejection). Il visite **39 routes/fonctions** : chaque écran doit afficher son contenu **sans une seule erreur JavaScript**.

Résultat v32 : **58 ✅ / 0 ❌** (aucun écran mort, aucune promesse rejetée).

**Cas particulier — « Tableau des notes » (`#/class/:id/table`) :** signalé comme écran vide par le premier passage, il a été **examiné puis vérifié fonctionnel** : le composant (`TableViewScreen` → « Vue tableau ») charge la classe et affiche élèves × matières avec les notes (`Obt.` / `Perf.`). Le faux positif venait du harnais (il cherchait le mot « Tableau » alors que l'écran s'intitule « Vue tableau »). **Confirmé en vrai navigateur** : élèves, matières (Dictée, Mathématiques) et notes s'affichent.

---

## 3. « AUTRES ÉVALUATIONS » — à côté des 4 évaluations EducMaster

Les 4 évaluations reconnues restent : **Évaluation formative 1, sommative 1, sommative 2, sommative 3** (au secondaire : interrogations écrites MEPE + devoirs surveillés NPS1/NPS2). À leur côté, l'enseignant peut désormais **créer ses propres évaluations** à son initiative.

### 3.1 Saisie des notes
- Bouton **« ➕ Autres évaluations »** à côté des 4 chips d'évaluation.
- Formulaire : **nom** de l'évaluation (ex. *Projet de classe*, *Devoir maison*, *Interrogation orale*) + **date** facultative → la nouvelle évaluation apparaît comme chip **« ✨ … »** juste après les 4 officielles.
- On saisit les notes de la classe **dans cette évaluation** comme dans les autres (clavier tactile, notes CM/CP, absences) ; un **×** sur le chip retire l'évaluation de la liste (les notes restent conservées).

### 3.2 Import Excel — feuilles non reconnues
- L'import officiel reconnaît les feuilles des 4 évaluations. Si le fichier contient **d'autres feuilles de notes** (ex. « Devoir maison »), l'aperçu affiche le bloc **« ➕ Autres évaluations (feuilles non reconnues) »** :
  - soit rattacher ces notes à une **évaluation déjà créée** (menu déroulant des évaluations ✨),
  - soit **créer une nouvelle évaluation** sur-le-champ.
- Testé en vrai navigateur : fichier Excel avec la feuille « Devoir maison » → notes **13/11 importées et rattachées** à l'évaluation « Projet de classe » (même identifiant `custom-…` en base).

### 3.3 Bulletins, tableaux et exports
- L'évaluation personnalisée est **proposée dans les bulletins** et son libellé exact figure sur le **bulletin Word et la synthèse Excel** (`evaluationLabel(evaluation, customEvaluations)`).
- **Priorité des notes** : dans les calculs (moyennes), une note d'une des 4 évaluations EducMaster **prime toujours** sur une note d'une « Autre évaluation » ; à défaut de note officielle, la note personnalisée est utilisée (la moyenne de classe reste donc fidèle au modèle EducMaster).
- Tout est **persistant** (IndexedDB) et inclus dans les **sauvegardes/restaurations** (structure `ClassData.customEvaluations`).

---

## 4. Résultats

| Vérification | Résultat |
|---|---|
| Audit complet §1 → §41 (`tests/audit.ts`) | **665 ✅ / 0 ❌** (v31 : 649) |
| §41 — « Autres évaluations » : modèle, détection, libellés, priorité, persistance, import | ✅ |
| Smoke 39 routes/fonctions (`tests/smoke.ts`) | **58 ✅ / 0 ❌** — aucune fonction « ne répond plus » |
| E2E navigateur réel (`tests/e2e.mjs`) — présences, tableau, création, saisie, import, bulletins | **24 ✅ / 0 ❌** |
| Présences sans données (ouverture + PV) — crash corrigé | ✅ |
| « Tout le monde présent » — 2 élèves enregistrés (bug corrigé) | ✅ |
| Tableau des notes — affichage réel vérifié | ✅ |
| TypeScript `tsc --noEmit` | **0 erreur** |
| Build production (`vite build` + postbuild) + PWA `master-soutien-v32` | ✅ |

---

## 5. Guide rapide — « Autres évaluations »

1. **Créer** : *Saisie des notes* → **➕ Autres évaluations** → nom → **✓ Créer l'évaluation** → le chip ✨ apparaît à côté des 4.
2. **Saisir** : sélectionner le chip ✨ → cliquer une matière → entrer les notes (clavier tactile).
3. **Importer** : *Élèves* → *Importer les élèves depuis Excel* → dans l'aperçu, rattacher les feuilles non reconnues à l'évaluation ✨ (ou en créer une) → **Importer**.
4. **Bulletin** : *Bulletins* → choisir l'évaluation ✨ → le bulletin porte son libellé.

**Déploiement :** contenu de `deploy/` sur Netlify Drop / Vercel ; `npm run deploy:verify <lien>` après publication.
