# 🧭 Module « Orientation scolaire » — Améliorations livrées

> Livrable : **v16** — Master Soutien Pédagogique 🎓🇧🇯
> Le module d'orientation tient maintenant compte du **niveau scolaire réel** de la
> classe, du **nouveau modèle multi-évaluations** (formative + sommatives 1/2/3) et
> fournit une **synthèse d'orientation de la classe** imprimable, utile pour le
> conseil des professeurs et l'entretien avec les parents.

---

## 1. 🎯 Ce qui a changé

### 1.1 Orientation adaptée au niveau de la classe (nouveau)
Avant, tous les conseils parlaient de séries du **BAC** (C, D, E, A, B…), même pour
un élève de **CM2** ou de **maternelle**. Désormais :

| Niveau | Conseil d'orientation |
|---|---|
| **Préscolaire** | Conseil d'**éveil** (langage, motricité, autonomie, socialisation) — pas d'orientation formelle, avec explication pédagogique. |
| **Primaire** | Conseils formulés pour le **passage au collège** : collège général (séries à confirmer), **CET / formation professionnelle**, métiers à découvrir, matières à consolider avant la 6ème. |
| **Secondaire** | Séries du **BAC** et filières (comme avant, enrichies). |

Un bandeau sur l'écran indique le niveau utilisé : « ℹ️ Niveau : Primaire — conseil
adapté au passage au collège ».

### 1.2 Domaines « Social » et « Culturel » enfin recommandés (correction)
Les scores des domaines **social** (histoire-géographie, philosophie, conduite
citoyenne…) et **culturel** (arts, dessin, musique…) étaient calculés… mais aucune
recommandation n'était jamais générée pour eux. C'est corrigé : ces deux domaines
produisent désormais de vraies fiches d'orientation (études, débouchés, matières à
renforcer) aux deux niveaux (primaire et secondaire).

### 1.3 Analyse par évaluation (nouveau modèle de notes)
L'écran propose désormais le choix de l'**évaluation analysée** :
- **« Dernière évaluation disponible »** (par défaut) = dernière sommative présente,
  comme pour les bulletins — cohérence totale entre modules ;
- Chaque évaluation renseignée pour l'élève (formative 1, sommatives 1/2/3) peut être
  analysée séparément ;
- Les **notes historiques** (saisies avant le modèle multi-évaluations) sont
  rattachées à la **sommative 1**, conformément à l'export Excel (aucune perte).

### 1.4 Évolution entre évaluations sommatives (nouveau)
Nouvelle section **« Évolution entre les évaluations sommatives »** : pour chaque
domaine, le score aux sommatives 1 → 2 → 3, une mini-courbe et un badge de tendance
(**↑ +2,1** en hausse, **↓ −1,5** en baisse ou **→ stable**). Idéal pour montrer la
progression (ou l'essoufflement) d'un élève au fil de l'année.

### 1.5 Synthèse d'orientation de la classe (nouveau)
Nouvel onglet **« Synthèse classe »** :
- Tableau de tous les élèves : **profil dominant** (domaine), score, **matière la plus
  forte**, **stade** (Profil affirmé / à confirmer / à consolider / sans notes) ;
- Compteurs : élèves, avec/sans notes, profils détectés ;
- **Répartition des profils** par domaine (ex. « Scientifique : 8 ») ;
- Bouton **« Imprimer la synthèse »** : rapport de classe propre, prêt pour le conseil
  des professeurs (les élèves sans notes y sont signalés).

### 1.6 Fiches administrateur conservées
Les « Informations ajoutées par l'administration » (filières/écoles complémentaires)
restent affichées quand elles correspondent aux recommandations de l'élève.

---

## 2. 🏗️ Détails techniques

| Fichier | Rôle |
|---|---|
| `src/utils/database.ts` | Nouveau helper **`findNoteInEvaluation(notes, studentId, subjectId, evaluation)`** : note d'une évaluation précise, avec la règle de compatibilité (notes historiques → sommative 1). Source unique, réutilisée par l'export Excel **et** l'orientation. |
| `src/utils/excelGenerator.ts` | Utilise désormais `findNoteInEvaluation` (plus aucune duplication de la règle de compatibilité). |
| `src/utils/orientation.ts` | Moteur enrichi : `classSchoolLevel`, `LEVEL_LABELS`, `DOMAIN_LABELS`, `getStudentPerformances(classData, student, evaluation?)`, `buildOrientationRecommendations(..., evaluation?)`, `getDomainTrends`, `studentEvaluationsWithNotes`, `buildClassOrientationOverview`. Recommandations par niveau (préscolaire/primaire/secondaire) + domaines social & culturel. |
| `src/utils/orientationReport.ts` | Rapport élève existant conservé + **`buildClassOrientationReportHtml`** / **`printClassOrientationReport`** (synthèse de classe, `STAGE_LABELS`). |
| `src/components/OrientationScolaireScreen.tsx` | Écran enrichi : 2 onglets (Analyse élève / Synthèse classe), choix de l'évaluation, bandeau de niveau, section évolution, tableau de classe + impression. |
| `tests/audit.ts` | **27 nouveaux tests** (section 22) : niveau par défaut, conseil primaire « 6ème », domaines social/culturel, évaluation exacte + défaut + compatibilité, tendances, synthèse classe, rapport, écran. |

---

## 3. ✅ Vérifications effectuées

- Compilation TypeScript : **0 erreur**.
- **Audit complet : 378 réussis / 0 échoué** (dont 27 nouveaux tests d'orientation).
- Build de production : réussi (`dist/index.html`, ~3,81 Mo, fichier unique hors-ligne).
- Aucun changement de comportement pour les écrans existants (signatures étendues
  avec paramètres optionnels).

---

## 4. 📌 Prochain module (ordre convenu)
1. ~~Orientation scolaire~~ ✅ **fait (v16)**
2. Administration d'établissement — à venir
3. Cloud & Support — à venir
