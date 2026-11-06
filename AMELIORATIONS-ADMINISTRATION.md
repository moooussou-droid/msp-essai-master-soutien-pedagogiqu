# 🏫 Module « Administration d'établissement » — Améliorations livrées

> Livrable : **v17** — Master Soutien Pédagogique 🎓🇧🇯
> Le module d'administration devient **un vrai outil de direction** : rapport de
> pilotage imprimable pour la circonscription, liste des élèves à accompagner pour
> le conseil des maîtres, documents archivés réutilisables et suivi des checklists
> par catégorie.

---

## 1. 🎯 Ce qui a changé

### 1.1 Rapport de pilotage imprimable (nouveau)
Le directeur peut désormais **imprimer un rapport de pilotage complet** (onglet
Pilotage → bouton vert « Imprimer le rapport de pilotage ») :
- En-tête officiel : école, circonscription, année scolaire, date, auteur ;
- **4 cartes de synthèse** : élèves, moyenne de l'école, réussite globale, saisie ;
- **Tableau détaillé par classe** : effectif, moyenne, réussite, saisie, statut ;
- **Priorités** : classes à suivre (moyenne < 50 % ou saisie incomplète) ;
- **Élèves à accompagner** : tous les élèves sous 10/20, par classe ;
- Document HTML propre, 100 % hors-ligne, texte échappé (aucune injection),
  prêt à joindre au dossier de l'école.

### 1.2 Élèves à accompagner (nouveau)
Nouvelle section dans l'onglet Pilotage : **tous les élèves dont la moyenne est
inférieure à 10/20**, regroupés par classe, triés du plus faible au plus fort, avec
moyenne exacte et nombre de matières sous 10. Utilisable directement pour :
- le **conseil des maîtres** (liste prête à discuter) ;
- le **plan de remédiation** (qui cibler ?) ;
- les **bulletins de fin de trimestre** (appréciations).

Calcul centralisé et testable (`buildStudentsToSupport`), basé sur les bulletins
réels (mêmes moyennes que l'écran Bulletins).

### 1.3 Documents archivés : cycle de vie complet (amélioration)
Les documents administratifs sauvegardés (PV, notes de service, rapports…) ne
pouvaient qu'être **supprimés**. Désormais chaque document archivé propose :
- **Rouvrir** : recharge le document dans l'éditeur (type, école, date, contenu)
  pour le modifier puis le resauvegarder ;
- **Imprimer** : impression immédiate depuis la liste.

### 1.4 Checklists : progression par catégorie (amélioration)
En plus de la barre globale, chaque catégorie (**EducMaster, Inspection,
Administration, Personnalisé**) affiche sa propre barre et son compteur — on sait
immédiatement ce qui reste à faire pour EducMaster vs Inspection.

### 1.5 Sécurité : confirmation avant réinitialisation
Le bouton « Réinitialiser » des checklists demandait auparavant une confirmation
(perte possible des cases cochées sans préavis). Il demande désormais confirmation
; les tâches personnalisées sont conservées.

---

## 2. 🏗️ Détails techniques

| Fichier | Rôle |
|---|---|
| `src/utils/schoolStats.ts` | + `buildStudentsToSupport(classData)` : élèves < 10/20 triés (moyenne, mention, nb de matières faibles) — réutilise `computeBulletins`/`getMention`. |
| `src/utils/schoolChecklists.ts` | + `taskProgressByCategory(tasks)` : progression par catégorie, sans division par zéro. |
| `src/utils/schoolReport.ts` | **Nouveau** : `buildSchoolReportHtml(data)` (rapport + échappement) et `printSchoolReport(data)`. |
| `src/components/SchoolAdminToolkitScreen.tsx` | Bouton rapport de pilotage, section élèves à accompagner, Rouvrir/Imprimer sur les documents, barres par catégorie, `window.confirm` avant réinitialisation. |
| `tests/audit.ts` | **16 nouveaux tests** (section 23) : seuil/tri des élèves, calculs de catégories, contenu + XSS + impression du rapport, branchements écran. |

---

## 3. ✅ Vérifications effectuées

- Compilation TypeScript : **0 erreur**.
- **Audit complet : 394 réussis / 0 échoué** (dont 16 nouveaux tests d'administration).
- Build de production : réussi (`dist/index.html`, ~3,81 Mo, fichier unique hors-ligne).
- Compatibilité : toutes les fonctions ajoutées sont optionnelles — aucun écran
  existant n'est modifié dans son comportement par défaut.

---

## 4. 📌 Prochain module (ordre convenu)
1. ~~Orientation scolaire~~ ✅ **fait (v16)**
2. ~~Administration d'établissement~~ ✅ **fait (v17)**
3. Cloud & Support — à venir
