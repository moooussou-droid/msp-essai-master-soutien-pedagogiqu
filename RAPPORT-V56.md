# VERSION 56 — DURÉE D'ESSAI RAMENÉE À 10 HEURES

Cache hors ligne : `master-soutien-v56` · 19 septembre 2026

---

## 1. Le changement

La période d'essai gratuite passe de **20 heures à 10 heures**.

Tout ce qui s'affiche au prospect suit automatiquement :

| Endroit | Avant | Maintenant |
|---|---|---|
| Titre de l'offre | *Essayer gratuitement pendant 20 heures* | *…pendant **10 heures*** |
| Bouton de démarrage | *Commencer l'essai gratuit de 20 h* | *…de **10 h*** |
| Bandeau de décompte | « il reste 20 h 00 » | « il reste **10 h 00** » |
| Message de fin | *Les 20 heures sont écoulées* | *Les **10 heures** sont écoulées* |
| Espace d'administration | *Version d'essai (20 h)* | *Version d'essai (**10 h**)* |

Le reste du comportement est **inchangé** : décompte en temps réel, bandeau qui passe à
l'orange puis au rouge à l'approche de l'échéance, coupure automatique, un seul essai par
appareil, données conservées pour l'abonnement.

⚠️ **Un point pratique :** le bandeau devient orange sous 6 h et rouge sous 2 h. Sur un
essai de 10 h, l'alerte orange apparaît donc à mi-parcours. Cela reste cohérent, mais
dites-moi si vous préférez que je resserre ces seuils (par exemple orange à 3 h, rouge à
1 h) pour mieux coller à la durée réduite.

---

## 2. Comment le changement a été fait

La durée n'existe qu'à **un seul endroit** dans le code : la constante `TRIAL_HOURS`.
Tous les textes affichés la lisent, aucun n'écrit « 20 » ou « 10 » en dur. Le changement
s'est donc résumé à une ligne.

J'en ai profité pour ajouter **un garde-fou permanent** : un contrôle automatique refuse
désormais toute durée recopiée en dur dans les trois écrans concernés (offre d'essai,
bandeau, administration). Si l'on écrivait un jour « 10 h » directement dans un texte, la
livraison échouerait — un futur changement de durée ne peut plus laisser une mention
fausse à l'écran.

*Détail corrigé : le libellé « Version d'essai (20 h) » de l'espace d'administration était
justement écrit en dur. Il lit maintenant la constante.*

---

## 3. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**+3 contrôles**, dont le garde-fou anti-durée en dur) | **1783 / 1783** |
| **E2E v55** — parcours d'essai en navigateur réel | **27 / 27** |
| E2E v54 · v53 · v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 21 · 15 · 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout démarre un essai réel et lit le bandeau : **« 10 h 00 »**. Il vérifie
aussi qu'aucune mention de « 20 » ne subsiste dans l'offre présentée au prospect, qu'un
essai expiré coupe bien l'accès et que reculer l'horloge termine l'essai.

---

## 4. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V56-ESSAI.zip`** | 11,3 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v56.zip` | 10,2 Mo — sources |

👉 https://app.netlify.com/drop.

Ma recommandation de la v55 reste valable : publiez cette version d'essai sur une
**adresse distincte** (ex. `msp-essai.netlify.app`) pour la prospection, et gardez votre
adresse habituelle pour vos abonnés.

---

## 5. Toujours en attente

1. **Vos abonnés Complet actuels** : paient-ils le complément de 1000 F pour le Pro, leur
   offrez-vous la transition, ou j'ouvre un module en avant-goût ?
2. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
3. **La déclaration APDP** pour l'espace parents (étape ② du suivi enfant).
