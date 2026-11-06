# VERSION 57 — SEUILS D'ALERTE DE L'ESSAI RESSERRÉS

Cache hors ligne : `master-soutien-v57` · 19 septembre 2026

---

## 1. Le changement

Le bandeau de l'essai gratuit change de couleur plus tard, pour coller à la durée de
10 heures :

| Temps restant | Avant (v56) | Maintenant |
|---|---|---|
| 10 h → 3 h | vert | **vert** |
| 3 h → 1 h | orange *(dès 6 h)* | **orange** |
| moins d'1 h | rouge *(dès 2 h)* | **rouge** |

Avec les anciens seuils, l'alerte orange se déclenchait **à mi-parcours** d'un essai de
10 h : trop tôt pour être prise au sérieux. Le prospect travaille désormais tranquillement
pendant 7 heures, est prévenu à 3 h, puis alerté franchement dans la dernière heure.

---

## 2. Un choix qui évite de refaire ce travail

Plutôt que d'écrire « 3 h » et « 1 h » en dur, j'ai exprimé les seuils en **fractions de
la durée totale** : rouge au dernier dixième, orange aux trois derniers dixièmes.

Concrètement, si vous décidez un jour de passer l'essai à 6 h ou à 24 h, **les couleurs
s'ajusteront toutes seules** — il n'y aura rien d'autre à modifier que la durée.

---

## 3. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**+3 contrôles**) | **1786 / 1786** |
| E2E v55 — parcours d'essai | **27 / 27** |
| E2E v54 · v53 · v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 21 · 15 · 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

J'ai vérifié les **trois couleurs à l'écran** en simulant sept états d'essai différents
(9 h, 4 h, 3 h 30, 2 h 30, 1 h 30, 50 min, 20 min) : chaque palier bascule au bon moment.

**Un détail corrigé au passage.** Le garde-fou ajouté en v56 — qui interdit d'écrire une
durée en dur — se déclenchait à tort sur mes propres **commentaires** explicatifs. Il
n'examine plus que le code réellement affiché. J'ai vérifié qu'il détecte toujours une
vraie faute : en introduisant volontairement « VERSION D'ESSAI de 10 heures » dans le
bandeau, l'audit a bien échoué, puis est repassé au vert une fois la faute retirée.

---

## 4. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V57-ESSAI.zip`** | 11,3 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v57.zip` | 10,2 Mo — sources |

👉 https://app.netlify.com/drop — de préférence sur une **adresse distincte** dédiée à la
prospection, en gardant votre adresse habituelle pour les abonnés.

---

## 5. Toujours en attente

1. **Vos abonnés Complet actuels** : paient-ils le complément de 1000 F pour le Pro, leur
   offrez-vous la transition, ou j'ouvre un module en avant-goût ?
2. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
3. **La déclaration APDP** pour l'espace parents (étape ② du suivi enfant).
