# 📋 Rapport de correctifs — v23 (Bulletins par évaluation + bulletin officiel du secondaire + tableau de bord)

**Date :** 4 septembre 2026
**Audit automatique :** ✅ **503 tests réussis / 0 échec** (types TypeScript : 0 erreur, build Vite : OK)

---

## 1. 🎓 Bulletin officiel du secondaire — conforme au modèle CEG (votre image)

L'application génère désormais le **vrai bulletin du secondaire**, identique au
modèle du CEG Djégan-Kpévi :

| Colonne | Signification |
|---|---|
| **Coef.** | Coefficient de la matière |
| **MEPE** | Moyenne des interrogations écrites |
| **NPS1 / NPS2** | Notes des devoirs surveillés 1 et 2 |
| **MS** | Moyenne semestrielle de la matière (moyenne des notes saisies) |
| **MSC** | Moyenne de la classe dans la matière |
| **Rang** | Rang de l'élève dans la matière |
| **Plus faible / Plus forte** | Moyennes de classe extrêmes |
| **Appréciation** | Appréciation et signature du professeur |

- **Bilans officiels** automatiques : *Bilan littéraire* (Français, Anglais,
  Histoire-Géo, Philosophie…), *Bilan scientifique* (Maths, SVT, PC…),
  *Bilan des autres matières* (EPS, Conduite…). Le groupe de chaque matière
  est déduit automatiquement de son nom **ou** choisi dans **Matières → Bilan**.
- **Ligne Total** : points obtenus, coefficients, **moyenne semestrielle /20** et rang.
- **Mentions du Conseil** (case cochée ☒) + appréciation du Chef d'établissement
  + signatures + « Fait à …, le … » + n° de bulletin.
- Saisie des notes au secondaire : **Interrogations écrites (MEPE)**,
  **Devoir surveillé 1 (NPS1)**, **Devoir surveillé 2 (NPS2)**.
- Exports **Word** (un bulletin officiel par élève) et **Excel** (colonnes
  MEPE/NPS1/NPS2/MS par matière) conformes.

**Vérifié avec les notes de votre capture** : Français (MEPE 16,67 · NPS1 11 ·
NPS2 13) → MS 13,56 ✔, moyenne semestrielle pondérée par les coefficients ✔,
MSC / min / max / rangs par matière ✔.

## 2. 📄 Maternelle & Primaire : UN bulletin PAR évaluation

Chaque évaluation a désormais **son propre bulletin** :
- **Évaluation formative 1**, **Évaluation sommative 1/2/3** sélectionnables
  à l'écran des bulletins (puce « Bulletin de l'évaluation ») ;
- l'export **Word/Excel** génère le classeur pour l'évaluation choisie
  (nom de fichier : `…_sommative1.docx`) ;
- le bulletin historique (« Toutes — synthèse ») reste disponible : il prend
  la note la plus prioritaire (dernière sommative saisie).

**Vérifié** : formative seule → moyenne 5,5 ; sommative seule → moyenne 16,5 ✔

## 3. 🗂️ Interface désencombrée : TABLEAU DE BORD

- **Accueil** : les fonctions Enseignant sont regroupées dans **8 grandes tuiles**
  claires (Saisie des notes, Bulletins, Présences, Statistiques, Élèves,
  Matières, Tableau, Export) + cartes de classes **compactes**.
- **Nouvel écran « Tableau de bord de classe »** (un clic sur une classe) :
  sections **Évaluation / Gestion / Documents** avec toutes les fonctions.
- La suppression d'une classe (avec confirmation) et la modification sont
  dans le tableau de bord de la classe.
- **Nouvelle classe** : la « Période » s'adapte à l'ordre d'enseignement —
  *1er/2ème/3ème trimestre* (maternelle & primaire) ou
  *Premier/Second semestre* (secondaire), repris en titre de bulletin
  (« BULLETIN DE NOTES DU PREMIER SEMESTRE »).

---

## 4. ✅ Récapitulatif des vérifications

| Vérification | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | 0 erreur |
| Audit automatisé (503 tests) | 503 ✅ / 0 ❌ |
| Bulletin secondaire : MS = (MEPE+NPS1+NPS2)/3 | ✔ (13,56 sur l'exemple) |
| Moyenne semestrielle pondérée par les coefficients | ✔ |
| Bilans littéraire / scientifique / autres | ✔ |
| Bulletin primaire par évaluation (formative → 5,5 / sommative → 16,5) | ✔ |
| Export Word secondaire (MEPE/NPS1/NPS2/MS/MSC, bilans, mentions) | ✔ sans erreur |
| Export Excel secondaire (colonnes MEPE/NPS1/NPS2/MS) | ✔ sans erreur |
| Tableau de bord (accueil + classe) | ✔ |
| `npm run deploy:check` + build Vite | ✔ OK |
