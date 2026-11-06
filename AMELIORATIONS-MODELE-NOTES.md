# AMÉLIORATIONS — NOUVEAU MODÈLE OFFICIEL DE NOTES DU PRIMAIRE (v15)

## Objectif
Le ministère a publié un **nouveau modèle officiel de fichier Excel** pour les notes du
primaire : **un seul fichier avec UNE FEUILLE PAR ÉVALUATION**. L'application l'intègre
maintenant de bout en bout : **import, saisie, bulletins, statistiques et export**.

---

## 📄 Le nouveau modèle officiel (référence)

- **4 feuilles** dans le même fichier :
  - `Evaluation formative 1`
  - `Evaluation sommative 1`
  - `Evaluation sommative 2`
  - `Evaluation sommative 3`
- **Ligne 1** : `Matricule` · `Nom` · `Prénoms` puis les 9 matières du primaire
  (`Dictée`, `Math`, `Expression écrite`, `Compréhension de l'écrit`, `EST`, `ES`,
  `EA (Oral)`, `EA (Déssin/Couture)`, `EPS`), chaque matière fusionnée sur 2 colonnes.
- **Ligne 2** : sous-colonnes `Note obtenue` (CM /18) et `Note perf.` (CP /2).
- **Données dès la ligne 3** (une ligne par élève, matricule en texte).
- `ABS` = élève absent.

---

## ✅ Ce qui a changé dans l'application

### 1. Import Excel — toutes les feuilles sont lues
- L'import parcourt **toutes les feuilles** du fichier (avant : seule la première).
- L'**évaluation est déduite du nom de la feuille** (tolère les variantes :
  « Eval », « Sommatif », accents manquants…). Les feuilles non reconnues sont ignorées.
- Les élèves sont **dédupliqués entre les feuilles** (un élève n'est créé qu'une fois).
- L'en-tête `Note perf.` du modèle officiel est reconnu (comme `Note perfectionnement`).
- L'**aperçu d'import** indique désormais les feuilles d'évaluation détectées.
- Chaque note importée est stockée **avec son évaluation** → un élève peut avoir une
  note par matière dans chaque évaluation, sans écrasement.

### 2. Saisie des notes — choix de l'évaluation
- Sur les **deux écrans de saisie** (saisie par matière, saisie par élève) :
  sélecteur `Toutes` · `Formative 1` · `Sommative 1` · `Sommative 2` · `Sommative 3`.
- La progression de saisie (`% élèves notés`) est calculée **pour l'évaluation active**.
- En mode « Toutes », la note la plus récente (sommative 3 → 2 → 1 → formative) est
  affichée et modifiée ; un badge indique de quelle évaluation elle provient.

### 3. Bulletins, statistiques, orientation, remédiation
- Tous les calculs (bulletins, moyennes, rangs, stats de classe, orientation scolaire,
  soutien/remédiation, tableau de bord) utilisent la **note de référence** :
  dernière évaluation sommative disponible, sinon formative, sinon les notes
  historiques (compatibilité).
- Un bandeau d'information sur l'écran des bulletins précise la source des notes.

### 4. Export Excel — au format officiel
- L'export `EducMaster` produit désormais **4 feuilles** aux noms exacts du modèle
  officiel (`Evaluation formative 1`, `Evaluation sommative 1/2/3`, sans accents),
  en-tête bleu sur 2 lignes (`Note obtenue` / `Note perf.`), lignes d'en-tête figées,
  notes de chaque évaluation dans sa feuille.
- Le fichier exporté est **ré-importable** tel quel (aller-retour validé par test).

### 5. Modèle vierge téléchargeable
- Le bouton « Télécharger le modèle » génère directement le **fichier officiel pré-rempli**
  avec les matières de la classe (4 feuilles, en-tête sur 2 lignes).

### 6. Compatibilité
- Les notes saisies avant cette mise à jour (sans évaluation) restent affichées,
  calculées et modifiables : **aucune perte de données**.
- À l'export, ces notes historiques sont placées dans la feuille
  `Evaluation sommative 1` (évaluation par défaut) : le fichier officiel est complet.
- Préscolaire et secondaire : comportement inchangé (feuille unique).

---

## 🧪 Vérifications effectuées
- Compilation TypeScript : **0 erreur**.
- Test automatisé d'aller-retour : fichier conforme au modèle (4 feuilles, 31 élèves,
  `Note perf.`, `ABS`) → import → export → ré-import : **31 élèves, 371 notes,
  4 évaluations, 0 erreur** ; priorité des évaluations vérifiée.
- Build de production : **OK**.
