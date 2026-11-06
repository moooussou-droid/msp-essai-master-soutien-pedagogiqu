# VERSION 50 — UN PV ET UNE FICHE ÉLÈVE PAR ÉVALUATION

Cache hors ligne : `master-soutien-v50` · 18 septembre 2026

---

## 1. Ce que vous avez demandé, et ce que j'ai trouvé

Vous vouliez que le **tableau PV** et la **fiche élèves** existent pour chaque évaluation.
En examinant le code, j'ai découvert que le problème était plus grave qu'un simple
manque d'affichage : **la fiche élève détruisait les notes déjà saisies.**

Voici ce qui se passait réellement :

| Geste de l'enseignant | Résultat AVANT la v50 |
|---|---|
| Saisir 14/20 en sommative 1 | note enregistrée ✔ |
| Saisir 8/20 en sommative 2 | **le 14 est écrasé — il ne reste qu'une note** |

La cause : la fiche enregistrait la note sous la clé « élève + matière », **sans
l'évaluation**. Une seconde saisie retrouvait donc la première ligne et la remplaçait.
Le tableau PV, lui, appelait le calcul **sans préciser d'évaluation** : il mélangeait
tout en un seul tableau, et son export PDF recevait le *type* d'évaluation (un simple
libellé) au lieu de l'évaluation réelle.

Autrement dit, un trimestre de travail pouvait disparaître sans aucun avertissement.

---

## 2. Ce qui a été corrigé

**Fiche élèves** — un **sélecteur d'évaluation** en tête d'écran, comme pour les
bulletins. La clé d'enregistrement devient « élève + matière + **évaluation** ». Chaque
évaluation a donc sa propre fiche, qui s'ouvre vide et se remplit indépendamment.
Le pourcentage de saisie ne compte plus que l'évaluation affichée.

**Tableau PV** — même sélecteur. Le tableau est calculé **sur l'évaluation choisie**,
l'en-tête indique laquelle, et le PDF reçoit la bonne évaluation.

**Détail qui comptait :** le PDF s'appelait toujours `tableau-notes-cm2-a.pdf`.
Télécharger le PV de la sommative 1 puis celui de la sommative 2 aurait donné deux
fichiers de même nom, **le second écrasant le premier sur le téléphone**. Le nom porte
désormais l'évaluation.

### Vos notes déjà saisies sont préservées
Les notes enregistrées avant cette version n'ont pas d'évaluation. Elles sont
automatiquement rattachées à la **sommative 1** — la règle qui existait déjà dans
l'application pour les exports. Elles restent lisibles, modifiables, et ne sont
ni dupliquées ni perdues. C'est vérifié par trois contrôles dédiés.

---

## 3. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**26 nouveaux contrôles v50**) | **1597 / 1597** |
| **E2E v50** (navigateur réel) | **19 / 19** |
| E2E v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout reproduit **exactement votre geste** : saisir 16 en sommative 1,
puis 4 en sommative 2, et **relire la base de données**. Résultat lu en base :

```
[{"ev":"sommative1","note":16},{"ev":"sommative2","note":4}]
```

Les deux notes coexistent. Le test vérifie aussi que la fiche de la sommative 2 s'ouvre
**vide**, que revenir sur la sommative 1 réaffiche bien 16, et que **changer d'évaluation
change réellement le contenu du PV**.

*Note d'entretien : quatre contrôles vérifiaient la version du cache avec un motif limité
aux « v4x » et cassaient à chaque changement de version. Ils acceptent désormais les
versions futures — ils ne casseront plus inutilement.*

---

## 4. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V50-SITE.zip`** | 11,2 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v50.zip` | 9,5 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** pour conserver les données.
Aucune fonctionnalité existante n'a été retirée.

*Les zips v48 ont été supprimés de l'espace de travail (limite de taille) ; v49 et v50
restent disponibles.*
