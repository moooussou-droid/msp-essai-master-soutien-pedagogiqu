# Rapport v46 — Saisie par profil et PDF des tableaux

## 1. « La saisie des notes par profil n'est plus disponible »

**Diagnostic.** La fonctionnalité n'avait pas disparu : elle était devenue **introuvable**.

- L'écran **« Saisir les notes »** annonce, sur l'accueil comme sur le tableau de bord de la classe : *« Par matière **ou par profil** »*.
- Mais une fois dedans, il ne proposait **que** la liste des matières. Aucune trace du mode par profil.
- La saisie par profil existait toujours, rangée ailleurs, sous un autre nom : **« Fiches élèves »**, dans la rubrique *Gestion*.

Un enseignant qui suit la promesse affichée ne pouvait donc pas la trouver.

**Correction.** L'écran de saisie propose désormais les deux modes, côte à côte, à l'endroit annoncé :

| Par matière | Par profil |
|---|---|
| Toute la classe, une matière | Un élève, toutes ses matières |

L'entrée « Fiches élèves » reste en place : rien n'a été supprimé, les habitudes existantes sont préservées.

## 2. « Le tableau des notes n'est pas téléchargeable en PDF »

**Diagnostic confirmé.** L'écran **« Tableau des notes »** n'avait **aucun bouton** : ni PDF, ni impression, ni Excel. Impossible d'emporter ce PV en conseil de classe.

**Correction.** Deux boutons ajoutés : **« Télécharger le PDF »** et **« Imprimer »** (l'impression coexiste toujours avec le PDF, selon votre règle v41).

Le PV produit est en **paysage** et reprend exactement les colonnes de l'écran :
- une colonne par matière, note sur 20, **en rouge sous 10** ;
- `Abs.` pour un élève absent, `—` quand la note manque ;
- matières validées (primaire) ou moyenne générale (secondaire) ;
- colonne **Seuil atteint** ;
- statistiques de classe et rappel du seuil officiel du primaire (au moins 6 matières validées).

## 3. Autres erreurs détectées et corrigées

En vérifiant si le même oubli existait ailleurs, j'ai trouvé **deux écrans officiels** qui n'offraient que `Imprimer`, sans vrai PDF — exactement le manquement à votre règle v41 déjà corrigé pour les bulletins :

| Écran | Avant | Maintenant |
|---|---|---|
| **Statistiques par discipline** | Impression seule | **PDF** + impression |
| **Bilan annuel** | Impression seule | **PDF** + impression |

- **Statistiques par discipline** : ventilation filles/garçons, taux de réussite par matière, **disciplines sous 50 % signalées en rouge**, tableau des difficultés et remédiations, et avertissement si des élèves n'ont pas de sexe renseigné (la ventilation serait alors incomplète).
- **Bilan annuel** : moyennes par évaluation, moyenne annuelle, rang, présence (**sous 80 % signalée**), décision Admis/Reprise, et rappel de la règle des demi-journées (v36).

Pourquoi cela compte : sur Android, « Imprimer » oblige à trouver l'option « Enregistrer au format PDF », que beaucoup d'enseignants ne trouvent pas — et le fichier n'atterrit pas dans les téléchargements.

**Garde-fou ajouté** : un contrôle automatique vérifie désormais qu'**aucun écran de rapport n'offre l'impression sans proposer aussi un vrai PDF**. Si l'oubli se reproduit, les tests échoueront.

## 4. Vérifications

| Suite | Résultat |
|---|---|
| Audit métier (+19 contrôles v46) | **1383 / 1383** |
| E2E v46 (navigateur réel) | **28 / 28** |
| E2E v36 · v40 · v41 · v42 · v43 · v44 · cantine | **47 · 45 · 47 · 57 · 36 · 31 · 25**, 0 échec |
| `tsc --noEmit` | 0 erreur |

Les tests ouvrent réellement chaque PDF téléchargé, décompressent son contenu et vérifient les valeurs (18,00 · 9,00 · noms des élèves · colonnes de matières · signature).

## 5. Déploiement

**`DEPLOIEMENT-V46-SITE.zip`** (11,1 Mo) — `index.html` **à la racine**, vérifié.
À déposer sur https://app.netlify.com/drop **à la même adresse** que les versions précédentes.

Source : `master-soutien-pedagogique-v46.zip`. Cache hors ligne : `master-soutien-v46`.

### Fichiers modifiés

- `src/App.tsx` — sélecteur « Par matière / Par profil » ; boutons PDF et Imprimer du tableau des notes
- `src/utils/bulletinPdf.ts` — `exportNotesTablePdf()`
- `src/utils/reportPdf.ts` *(nouveau)* — `exportSubjectStatsPdf()`, `exportAnnualReportPdf()`
- `src/components/SubjectStatisticsScreen.tsx` — bouton PDF
- `src/components/AnnualReportScreen.tsx` — bouton PDF
- `tests/audit.ts` — section 55
- `tests/e2e-v45.mjs` *(nouveau)* — 28 contrôles
- `public/sw.js` — cache v46
