# VERSION 53 — FORMULE PRO (2500 F) ET IMPRESSION UNIVERSELLE

Cache hors ligne : `master-soutien-v53` · 19 septembre 2026

---

## 1. La nouvelle formule Pro — 2500 FCFA / an

Une **troisième formule** rejoint Essentiel et Complet :

| Formule | Prix | Périmètre | Code |
|---|---|---|---|
| Essentiel | 999 F/an | Enrôlement + importation des notes | commence par **9** |
| Complet | 1500 F/an | Toutes les fonctions pédagogiques | commence par **1** |
| **Pro** | **2500 F/an** | **Complet + les 4 modules de gestion** | commence par **2** |

Les 4 modules réservés, comme demandé :
**Mes registres officiels** · **Ma vie scolaire** · **Ma boîte à outils** · **Suivi de votre enfant**
(y compris tous leurs sous-modules : cahier journal, registre matricule, appel officiel,
paiements, livret, manuels, emploi du temps, remédiation, sauvegarde, conseil de classe,
chronomètre, calculatrice, numérisation).

Comme les autres formules, **le plan est porté par le code lui-même** : validation
100 % hors ligne, sans serveur. Vous générez les codes Pro depuis l'espace
d'administration — la formule apparaît automatiquement dans le sélecteur, et le message
WhatsApp envoyé au client annonce le bon tarif.

### Une précision qui me paraît importante
**Aucun abonné ne perd un droit acquis.** Un code Complet déjà remis conserve
*exactement* le périmètre qu'il avait : les 4 modules réservés sont des **ajouts** des
versions v48 à v52, jamais des fonctions retirées à quelqu'un qui en disposait. Un test
le vérifie sur 19 fonctions antérieures — aucune n'est perdue.

### Une exception que j'ai maintenue
**L'espace parent (`/suivi-enfant`) reste gratuit et public.** Un parent n'est pas
abonné : il n'a aucun code et ne doit rien payer pour consulter le dossier de son enfant.
Seul l'écran **enseignant** qui génère les dossiers relève du plan Pro. C'était la règle
posée en v49, je ne l'ai pas remise en cause.

---

## 2. Deux pièges évités pendant le développement

**① Un abonné Pro aurait été rétrogradé.** Le code qui relit l'abonnement ramenait tout
plan inconnu à « Complet ». Un client venant de payer 2500 F se serait donc vu refuser
les modules qu'il venait d'acheter. Corrigé, et verrouillé par trois contrôles.

**② `/outils-enseignant` a failli être verrouillé par erreur.** En filtrant les routes
par simple préfixe de texte, la règle « /outils » capturait aussi cet écran ancien,
inclus dans Complet. Le filtrage se fait désormais sur les **segments d'URL**.

---

## 3. L'impression : un vrai bug corrigé

Vous avez rappelé que **tout** doit être imprimable. En vérifiant, j'ai trouvé un défaut
sérieux, introduit sans que personne ne le voie :

> La feuille de style d'impression masquait la classe `.msp-kente`. Or depuis la v51,
> cette classe porte **l'en-tête des écrans** — donc le titre du document, le nom de la
> classe, la date. **Vos documents sortaient de l'imprimante sans titre.**
> Cela touchait **19 écrans**.

Corrigé : seul le motif décoratif disparaît, l'en-tête s'imprime en **noir sur blanc**
(économique en encre). J'en ai profité pour soigner le rendu papier :

- les **boutons** ne s'impriment plus (ils n'ont pas de sens sur une feuille) ;
- les **en-têtes de tableau se répètent** en haut de chaque page ;
- une **ligne n'est plus coupée** entre deux pages ;
- les cartes s'impriment à plat, sans ombre ni fond coloré.

**Trois écrans produisaient un PDF sans offrir l'impression** : le chronomètre, l'espace
parent et la numérisation. Ils ont désormais leur bouton Imprimer. Un contrôle automatique
parcourt maintenant **tous** les composants : si un écran produit un document sans
permettre de l'imprimer, la livraison échoue.

---

## 4. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**53 nouveaux contrôles v53**) | **1733 / 1733** |
| **E2E v53** — abonnement et impression | **15 / 15** |
| E2E v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout ouvre l'application avec **trois abonnements différents** et vérifie
que chacun voit exactement ce qu'il a payé : les 16 routes Pro bloquées en Complet,
ouvertes en Pro, les 19 fonctions antérieures toujours accessibles, et les **13 en-têtes
qui s'impriment avec leur titre en noir** (contrôlé en émulant le média « impression »).

*Note : cinq suites de tests plus anciennes s'activaient sans formule et butaient donc sur
le nouveau péage — preuve qu'il fonctionne. Elles utilisent maintenant un code Pro.*

---

## 5. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V53-SITE.zip`** | 11,2 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v53.zip` | 10,0 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** pour conserver les données.

---

## 6. Un point à trancher avant de vendre

Vos abonnés **Complet actuels** perdent-ils l'accès aux 4 modules ?

Techniquement, **oui** : leur code commence par « 1 » et ces modules exigent « 2 ». Ils
verront l'écran de mise à niveau. Trois options :

1. **Laisser ainsi** — ils paient le complément de 1000 F pour un nouveau code Pro ;
2. **Leur offrir la transition** — vous leur générez un code Pro gratuitement ;
3. **Ouvrir un module en avant-goût** (par exemple la sauvegarde, qui protège leurs
   données) et réserver les sept autres.

Dites-moi ce que vous préférez — l'option 3 demanderait une petite modification.

---

## 7. Toujours en attente

1. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
2. **La déclaration APDP** pour l'espace parents (étape ② du suivi enfant).
