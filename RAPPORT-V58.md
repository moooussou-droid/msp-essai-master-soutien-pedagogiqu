# VERSION 58 — GUIDE DE L'UTILISATEUR ET CORRECTIFS

Cache hors ligne : `master-soutien-v58` · 23 septembre 2026

---

## 1. Le bug que vous avez signalé — confirmé et corrigé

Vous aviez raison, et c'était **grave** : le relevé d'effectifs perdait les données.

**Ce qui se passait.** L'écran rechargeait à l'ouverture le **dernier relevé enregistré**.
L'utilisateur changeait simplement la date et les effectifs, puis enregistrait. Comme
l'identifiant interne restait le même, la ligne était **remplacée** : le relevé de la
semaine précédente disparaissait sans aucun avertissement.

J'ai reproduit le défaut avant de corriger :

```
Relevé du 14 septembre enregistré  →  1 relevé
Relevé du 21 septembre enregistré  →  1 relevé   ← le 14 avait disparu
```

**Ce qui a changé.** La **date fait désormais partie de l'identité** d'un relevé :

- changer la date crée un **nouveau relevé** — les précédents sont conservés ;
- revenir sur une date déjà saisie **ouvre ce relevé** pour le corriger, sans créer de
  doublon qui fausserait les totaux ;
- l'écran s'ouvre sur le relevé **du jour**, et un message vous dit clairement ce qui se
  passe quand vous changez la date ;
- l'historique est trié du plus récent au plus ancien.

---

## 2. Un second bug trouvé pendant le travail

En testant, j'ai découvert que **deux enregistrements créés dans la même milliseconde
recevaient le même identifiant** — le second écrasait donc le premier. Le défaut touchait
les relevés d'effectifs et, potentiellement, tout ajout rapide en série.

Corrigé par un compteur d'unicité. Vérifié par un test qui **ajoute 50 entrées en rafale**
et contrôle qu'aucune n'est perdue.

*J'ai aussi vérifié la comptabilité et les autres modules datés : ils étaient sains, le
problème était bien circonscrit.*

---

## 3. Le nouveau module « Le guide de l'utilisateur »

Accessible depuis l'accueil dès l'abonnement activé, avec ses deux sous-modules.

### ① Le manuel de l'abonné Master Soutien Pédagogique
Le mode d'emploi complet **intégré à l'application** : 18 fonctions expliquées en
6 chapitres. Chaque fiche indique **où trouver** la fonction, **à quoi elle sert** et
**comment l'utiliser**, avec les encadrés CONSEIL et ATTENTION.

Les chapitres se déplient un à un — sur un téléphone, tout afficher d'un coup rendrait la
lecture impossible. Une **recherche** permet de retrouver une fonction instantanément
(« educmaster », « absent », « bulletin »…). Le manuel **fonctionne sans connexion** et
s'exporte en PDF ou s'imprime.

### ② Tutoriels Master Soutien Pédagogique
Le catalogue des vidéos publiées par votre équipe. Vous collez un **lien YouTube** dans
l'espace d'administration ; l'application en extrait la vidéo et l'affiche dans une
rubrique (les rubriques suivent les chapitres du manuel).

**La vidéo se regarde dans l'application** : lecteur intégré en mode confidentialité
renforcée, **aucun bouton ne renvoie vers YouTube**, et les suggestions de fin restent sur
votre chaîne. Tous les formats de liens sont acceptés — lien classique, lien court, Short,
lien mobile, avec ou sans minutage.

**Seule l'administration peut publier.** Un enseignant voit uniquement les tutoriels
publiés ; vos brouillons restent invisibles.

> ⚠️ **Une limite que je dois vous dire franchement.** Une vidéo YouTube reste hébergée
> par YouTube. L'application empêche d'en sortir, mais elle ne peut pas rendre la vidéo
> secrète : un spectateur déterminé pourra toujours retrouver l'adresse d'origine.
> **Réglez donc vos vidéos en « Non répertoriée »** sur YouTube — elles seront alors
> introuvables par une recherche publique. Ce rappel est affiché dans l'écran
> d'administration.

Quand aucun tutoriel n'est encore publié, l'écran l'annonce et renvoie vers le manuel
plutôt que d'afficher une page vide. Sans connexion, il prévient que les vidéos sont en
ligne — en rappelant que le manuel, lui, fonctionne hors connexion.

---

## 4. Mise à jour sans perte d'abonnement

C'était votre exigence principale, et elle est **vérifiée par cinq contrôles** :

| Vérification | Résultat |
|---|---|
| L'abonnement Pro survit à la mise à jour | ✅ |
| Le titulaire du code est conservé | ✅ |
| Les présences, le cahier journal et les autres données sont conservés | ✅ |
| Les modules payants restent accessibles | ✅ |
| Le service worker ne touche jamais aux données (seul l'ancien cache est effacé) | ✅ |

**Pour vos utilisateurs, la marche à suivre est simplement :** déployer le nouveau ZIP
**sur la même adresse**. À la prochaine ouverture, l'application se met à jour toute
seule ; le code d'accès, l'abonnement et toutes les saisies restent en place.

*Les tutoriels ont également été ajoutés à la sauvegarde de l'application.*

---

## 5. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**37 nouveaux contrôles v58**) | **1820 / 1820** |
| **E2E v58** (navigateur réel) | **28 / 28** |
| E2E v55 · v54 · v53 · v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 27 · 21 · 15 · 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout **reproduit votre scénario** : il saisit un relevé au 14, puis un au
21, et **relit la base de données** pour confirmer que les deux coexistent avec leurs
effectifs respectifs.

---

## 6. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V58-SITE.zip`** | 11 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v58.zip` | 9,8 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** — c'est ce qui garantit la mise à
jour sans perte.

---

## 7. Ce qu'il vous reste à faire

**Publier vos premiers tutoriels.** Le module est prêt mais le catalogue est vide : vos
abonnés verront le message d'attente tant que vous n'aurez rien publié. Pour ajouter une
vidéo : espace d'administration → Guide → Tutoriels → « Ajouter un tutoriel ».

*Trois questions restent par ailleurs en attente : le sort de vos abonnés Complet face au
forfait Pro, le renommage « Fiches élèves », et la déclaration APDP pour l'espace parents.*
