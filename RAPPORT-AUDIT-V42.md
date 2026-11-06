# Master Soutien Pédagogique — Rapport d'audit v42

Date : 15 septembre 2026
Version : **v42** · Cache PWA : `master-soutien-v42`
Code d'accès : `MSP-Catalyste@@007-2026` (inchangé)

---

## 1. Ce qui a été demandé et ce qui a été fait

| # | Demande | État |
|---|---------|------|
| 1 | Cantine : garder en priorité « aucun changement de légumineuse », et ajouter une option « changement » | ✅ Fait |
| 2 | Signature « Master Soutien Pédagogique (Votre compagnon mobile) » sur les documents et images | ✅ Fait |
| 3 | Personnalisation de la signature à 500 F | ✅ Fait |
| 4 | Module « Mon gestionnaire comptable MSP » (recettes par classe et autres volets, dépenses, objets) | ✅ Fait |
| 5 | Sous-module « Le budget de mon école » : prévisions, bilan et inventaire OHADA en PDF et Excel | ✅ Fait |

Aucune fonctionnalité des versions v32 à v41 n'a été retirée.

---

## 2. Cantine — deux options claires pour la légumineuse

À la création d'une semaine, deux choix sont désormais proposés :

1. **« Aucun changement cette semaine »** — **coché par défaut**, comme demandé.
   La légumineuse choisie est servie tous les jours. Aucun réglage par jour
   n'apparaît : l'écran reste simple, et aucun écart involontaire n'est possible.
2. **« Changement de légumineuse en cours de semaine »** — à cocher seulement si
   un stock s'épuise. Le choix jour par jour apparaît alors, et les reliquats
   sont suivis séparément pour chaque légumineuse.

En mode normal, la légumineuse de la semaine s'impose à chaque journée, même si
une valeur différente traînait d'une saisie antérieure : l'utilisateur a déclaré
qu'il n'y avait pas de changement, l'application le respecte strictement.

Les semaines enregistrées avant cette mise à jour n'ont pas ce réglage : elles
sont traitées comme « aucun changement », ce qui correspond exactement à la
façon dont elles ont été saisies. **Aucune donnée existante n'est modifiée.**

---

## 3. Signature des documents

Tous les documents et images produits par l'application portent désormais la
mention :

> **Master Soutien Pédagogique (Votre compagnon mobile)**

Elle apparaît sur les bulletins, rapports, documents de cantine, états
comptables, classeurs Excel et sur les images de la banque d'images.

### L'exception demandée
Les images et fiches que l'utilisateur **crée lui-même** dans les sous-modules IA
ne portent **aucune signature** : il en est l'auteur, puisqu'il a rédigé la consigne.
Le test le vérifie sur de vrais fichiers : l'image de la banque contient la
signature, la création personnelle ne la contient pas.

### La personnalisation à 500 F
L'utilisateur qui ne veut pas de cette signature règle **500 FCFA** auprès du
Super Administrateur. Le parcours est celui, déjà connu, de la v38 : demande
d'accès → paiement → code lié à l'appareil → déverrouillage.

Points vérifiés un par un :
- avant paiement, **aucun champ de personnalisation n'est accessible** ;
- un code erroné est refusé ;
- après validation, la signature saisie remplace celle par défaut ;
- décocher l'option, ou vider le champ, rétablit la signature d'origine.

---

## 4. Mon gestionnaire comptable MSP

Nouveau module qui retrace, jour par jour :

- les **recettes par classe** (scolarité, inscription…) ;
- les **recettes des autres volets** (cantine, transport, fournitures,
  uniformes, subventions, dons) ;
- les **dépenses**, avec pour chaque mouvement son **objet**, le bénéficiaire,
  le moyen de règlement et la référence de la pièce justificative.

Le solde du jour est affiché en permanence. **Un solde négatif n'est jamais
masqué** : il s'affiche en rouge avec une alerte, selon la même règle que les
reliquats de cantine.

Comme pour la cantine, toutes les formules vivent dans un service de calcul
séparé et testable (`accountingCalc.ts`), jamais dans les écrans.

---

## 5. Le budget de mon école — bilan et inventaire OHADA

Le Directeur enregistre ses **prévisions budgétaires** par poste. L'application
affiche ensuite, pour chaque ligne : prévu, réalisé, écart et taux de réalisation.
Les **dépassements de dépense** sont signalés en rouge.

Un dépassement de recette n'est pas traité comme une alerte : encaisser plus que
prévu est une bonne nouvelle, pas une anomalie.

### Le bilan et l'inventaire
En fin d'exercice, l'application produit le **bilan** et l'**inventaire** selon la
présentation du **SYSCOHADA révisé**, avec les numéros de comptes (7061 scolarité,
6611 salaires, 2441 mobilier…), en **PDF et en Excel**.

### La correction comptable la plus importante
Dans un cahier tenu à la main, tout est mélangé. L'application distingue :

| Nature | Traitement | Pourquoi |
|---|---|---|
| Salaires, électricité, achats cantine | **Charge** de l'exercice | consommé dans l'année |
| Tables-bancs, ordinateur, bâtiment | **Immobilisation** portée à l'actif | dure plusieurs années |

Exemple vérifié : 500 000 F de recettes, 300 000 F de salaires et 140 000 F de
tables-bancs. Les tables-bancs **ne sont pas** une charge : le résultat net est
de **200 000 F**, et non de 60 000 F. Les 140 000 F apparaissent à l'actif et
dans l'inventaire. L'écran prévient au moment de la saisie qu'un bien durable
ira à l'inventaire.

L'inventaire liste **les objets eux-mêmes** (« 20 tables-bancs »), et pas
seulement des montants : c'est ce qui permet de pointer physiquement les biens.

### Contrôle d'équilibre et honnêteté
L'équilibre actif = passif est vérifié et affiché. **S'il est faux, l'application
le dit et montre l'écart** : elle ne force jamais l'équilibre.

Chaque état porte la mention :
> « État établi selon la présentation du SYSCOHADA révisé, à partir des écritures
> saisies dans l'application. À faire viser par un comptable avant tout dépôt officiel. »

Il aurait été trompeur de laisser croire à un document certifié.

---

## 6. Trois défauts trouvés et corrigés pendant les tests

**1. Bilan vide à la rentrée (le plus grave).** L'exercice budgétaire démarrait
au 1er octobre. Or la rentrée béninoise a lieu en **septembre** : toutes les
recettes d'inscription de septembre — le plus gros de l'année — tombaient hors
exercice, et le bilan s'affichait à **zéro**. L'exercice court désormais du
**1er septembre au 31 août**.

**2. Export Excel impossible.** Le classeur échouait silencieusement sur
« Cannot merge already merged cells » : les lignes de titre fusionnaient la
colonne entière au lieu d'une seule ligne. Corrigé, puis le classeur a été
rouvert et relu pour vérifier ses trois feuilles.

**3. Un test faux de mon côté.** Ma vérification de la signature dans le PDF
cherchait le texte en clair, alors que les flux PDF sont compressés depuis la
v41. Le test décompresse maintenant les flux avant de chercher : la signature
est bien présente.

---

## 7. Résultats des contrôles

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit statique (51 sections) | **1280 réussis / 0 échoué** |
| Tests de fumée | **63 / 0** |
| **Tests navigateur v42** | **57 / 0** |
| Tests navigateur v41 | 47 / 0 |
| Tests navigateur v40 | 45 / 0 |
| Tests navigateur v39 | 41 / 0 |
| Tests navigateur v38 | 45 / 0 |
| Tests navigateur v36 | 47 / 0 |
| Tests navigateur v35 | 12 / 0 |
| Tests navigateur v34 | 5 / 0 |
| Tests navigateur de base | 28 / 0 |
| **Total** | **1670 contrôles, 0 échec** |

Le classeur Excel produit a été **rouvert et relu** après génération : les trois
feuilles (Bilan OHADA, Inventaire, Budget) contiennent les bons comptes, les bons
montants et la signature.

**Remarque de méthode :** la suite v38 a d'abord affiché 6 échecs lorsque toutes
les suites s'enchaînaient (délais dépassés sous charge). Rejouée isolément, elle
passe intégralement (**45/0**). Lenteur de la machine de test, pas une régression.

---

## 8. Livraison

- `DEPLOIEMENT-V42-SITE.zip` — **à déposer tel quel**, `index.html` est à la racine.
- `master-soutien-pedagogique-v42.zip` — code source complet.

**Déploiement :** déposez le contenu du zip de déploiement sur
https://app.netlify.com/drop, **à la même adresse que la v41**, afin que les
données déjà enregistrées par les utilisateurs soient conservées.

Les codes d'accès des utilisateurs et des membres de l'équipe **ne sont pas
effacés** par cette mise à jour.
