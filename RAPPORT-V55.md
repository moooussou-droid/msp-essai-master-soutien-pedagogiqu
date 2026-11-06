# VERSION 55 — VERSION D'ESSAI GRATUITE DE 20 HEURES

Cache hors ligne : `master-soutien-v55` · 19 septembre 2026

---

## 1. Ce que vit le prospect

À l'ouverture, un bouton bien visible : **« 🚀 Commencer l'essai gratuit de 20 h »**,
placé **avant** le champ du code — un prospect qui n'a pas de code doit pouvoir entrer
immédiatement.

1. Il touche le bouton : l'application s'ouvre, **sans aucun code**.
2. Un **bandeau discret** affiche en permanence le temps restant. Il est vert, passe à
   l'**orange sous 6 h**, au **rouge sous 2 h** : la coupure ne doit jamais être une
   surprise.
3. À l'échéance, l'accès se ferme et l'écran d'abonnement reprend la main, avec un
   message clair : **ses données restent enregistrées** et il les retrouvera intactes en
   s'abonnant.

Le décompte court en **temps réel**, y compris application fermée : c'est bien une offre
de 20 heures, pas 20 heures d'utilisation cumulée.

---

## 2. Trois décisions que j'ai prises — dites-moi si elles vous conviennent

**① L'essai ouvre le périmètre du plan COMPLET, pas Pro.**
Les 4 modules de gestion restent fermés pendant l'essai. Le prospect découvre ainsi
l'existence de la formule Pro en tombant sur l'écran de mise à niveau. Une version
d'essai doit **donner envie**, pas tout offrir. Si vous préférez ouvrir Pro aussi pendant
l'essai, c'est une ligne à changer.

**② Le nom n'est pas obligatoire pour démarrer.**
Exiger une saisie avant même d'avoir vu l'application découragerait une partie des
prospects. S'il a renseigné son nom, il est conservé.

**③ L'essai n'est utilisable qu'une fois par appareil.**
Sinon l'offre serait infinie et les abonnements sans objet.

---

## 3. Ce que j'ai fait pour que l'offre ne soit pas contournable

L'application étant **100 % locale**, aucun serveur ne peut arbitrer : un utilisateur très
déterminé pourra toujours vider le stockage de son navigateur. Je préfère vous le dire
franchement plutôt que de promettre l'inviolable. Cela dit, trois garde-fous couvrent les
cas réalistes :

| Tentative | Ce qui se passe |
|---|---|
| Recharger la page, fermer l'application | Le décompte continue normalement |
| **Reculer la date du téléphone** | **L'essai se termine immédiatement** — reculer l'horloge ne prolonge rien |
| Utiliser « Réinitialiser les données locales » | Le marqueur d'essai est **protégé** : pas de second essai |
| Effacer la clé d'essai seule | Un marqueur distinct empêche la relance |

**Vous gardez la main** : depuis l'espace d'administration, un Super Administrateur peut
réinitialiser l'essai sur un appareil — utile pour une **démonstration commerciale**.

---

## 4. Un point auquel j'ai fait attention

Les données saisies pendant l'essai (classes, élèves, notes) sont **les mêmes** que celles
de la version abonnée : rien n'est cloisonné. Quand le prospect saisit son code, il
retrouve tout son travail. C'est l'argument commercial le plus fort — il aurait été perdu
si l'essai avait utilisé un stockage séparé.

J'ai aussi ajouté l'état de l'essai à la **sauvegarde** de l'application, et protégé son
marqueur contre le bouton « Réinitialiser les données locales ».

---

## 5. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**29 nouveaux contrôles v55**) | **1780 / 1780** |
| **E2E v55** — parcours d'essai en navigateur réel | **27 / 27** |
| E2E v54 · v53 · v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 21 · 15 · 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout démarre un vrai essai, vérifie que l'application s'ouvre **sans
code**, que le bandeau affiche le temps restant, que l'essai **survit au rechargement**,
que les fonctions pédagogiques sont ouvertes mais les modules Pro fermés, puis simule
**un essai expiré** (accès coupé, relance impossible) et **un recul d'horloge**
(essai terminé). Il vérifie enfin qu'un abonné n'est pas gêné par le bandeau.

**Un bug corrigé au passage :** `startTrial()` renvoyait un essai **expiré** comme s'il
était valide. Un prospect dont l'essai venait de se terminer aurait pu, dans certains
enchaînements, obtenir un accès qu'il n'avait plus.

---

## 6. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V55-ESSAI.zip`** | 11,3 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v55.zip` | 10,1 Mo — sources |

👉 https://app.netlify.com/drop.

**⚠️ Une recommandation sur l'adresse de déploiement.** Vous déployez d'habitude sur la
même adresse pour conserver les données. Pour cette version d'essai, réfléchissez à
l'usage :

- **Même adresse** → vos abonnés actuels verront aussi le bouton d'essai (sans gêne : ils
  sont déjà activés), et les prospects testent l'application réelle ;
- **Adresse distincte** (ex. `msp-essai.netlify.app`) → vous séparez nettement la vitrine
  commerciale de l'application de production, et vous pouvez la diffuser largement sans
  toucher à l'adresse de vos utilisateurs.

**Je recommande la seconde option** pour la prospection, en gardant votre adresse
habituelle pour les abonnés.

---

## 7. Toujours en attente

1. **Vos abonnés Complet actuels** : paient-ils le complément de 1000 F pour le Pro, leur
   offrez-vous la transition, ou j'ouvre un module en avant-goût ?
2. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
3. **La déclaration APDP** pour l'espace parents (étape ② du suivi enfant).
