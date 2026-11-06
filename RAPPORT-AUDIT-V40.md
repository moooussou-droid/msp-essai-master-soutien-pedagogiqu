# RAPPORT D'AUDIT — Version 40
## Module « Mon gestionnaire de cantine scolaire »

Application **Master Soutien Pédagogique** — PWA hors ligne (React + TypeScript + Vite)

---

## 1. Ce qui a été livré

Un nouveau module complet, accessible depuis l'accueil, comptant **trois sous-modules** :

| Sous-module | Adresse | Rôle |
|---|---|---|
| **Super MSP Simulateur cantine** | `/cantine/simulateur` | Calcule les quantités de vivres à prélever chaque semaine et chaque jour |
| **Cahier MSP des menus hebdomadaires** | `/cantine/menus` | Reproduit le cahier officiel des menus, prêt à imprimer et à signer |
| **Cahier MSP de gestion des stocks** | `/cantine/stocks` | Un registre par denrée : dotations, sorties et stock restant |

Le total des sous-modules de l'application passe de **14 à 17**. **Aucune fonctionnalité existante n'a été retirée** : les suites de non-régression des versions 34 à 39 passent toutes intégralement.

---

## 2. Résultats des contrôles

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit statique (`tests/audit.ts`, 49 sections) | **1156 réussis / 0 échoué** |
| Tests unitaires de cohérence (`smoke`) | **63 / 0** |
| **E2E v40 — cantine (navigateur réel)** | **45 / 0** |
| E2E v39 — concours, bibliothèque, éducation à la vie | 41 / 0 |
| E2E v38 — cours payants, quiz | 45 / 0 |
| E2E v36 — présences, bulletins, codes | 47 / 0 |
| E2E v35 — gouvernance et rôles | 12 / 0 |
| E2E v34 — retour, cours en ligne | 5 / 0 |
| E2E général — import Excel, évaluations | 28 / 0 |
| Construction du site (`deploy/`) | **4 168 Ko** |

Les **8 cas de test imposés** pour le service de calcul sont couverts et vérifiés : arrondis au multiple supérieur, absence d'erreur de virgule flottante, prévision hebdomadaire complète, légumineuse non choisie à zéro, effectifs journaliers différents de l'effectif hebdomadaire, jour sans cuisson, synthèse équilibrée, et dépassement détecté.

---

## 3. Les erreurs du fichier Excel qui ont été corrigées

Conformément à votre consigne, la **logique métier** a été conservée mais les **formules fausses ont été corrigées**. Voici les écarts, tous documentés dans le code.

### 3.1 La formule `COUNTA(F10=1)`
Dans le fichier Excel, le choix de la légumineuse était testé par `COUNTA(F10=1)`. `COUNTA` compte les cellules non vides : cette expression renvoyait **toujours 1**, donc le test était **toujours vrai**. Le haricot était compté même lorsque le pois jaune était retenu.

**Correction** : un test explicite sur la valeur choisie. La légumineuse non retenue vaut désormais **0**, ce qui est vérifié par un test automatique.

### 3.2 L'arrondi inférieur du cahier manuscrit
Sur la photo du cahier des menus, pour 282 élèves :
- **Pois vert** : 0,03 × 282 = 8,46 → noté « 08,50 ». L'arrondi supérieur est bien appliqué. ✔
- **Maïs** : 0,15 × 282 = 42,30 → noté « **42,25** ». C'est un arrondi **inférieur**, qui crée un **manque de 0,05 kg** à chaque service, soit environ 0,25 kg par semaine.

**Correction** : la règle de votre cahier des charges est appliquée sans exception — la ration d'un service est arrondie **au multiple supérieur** (0,25 kg ; 0,1 kg pour le sel), puis multipliée par le nombre de services. On ne peut donc jamais se retrouver en manque de vivres. L'application explique ce calcul à l'écran.

### 3.3 La précision des nombres décimaux
Un ordinateur calcule 0,03 × 282 = 8,459999999999999. Un arrondi naïf aurait donné 8,75 au lieu de 8,50. Les calculs passent par des nombres entiers et une marge de sécurité : **l'erreur ne peut pas se produire**. Un test le vérifie explicitement.

### 3.4 Une anomalie corrigée en cours de développement
Le test en navigateur réel a révélé un défaut que l'audit statique n'avait pas vu : lorsque l'on saisissait l'effectif d'un jour **avant** de choisir la céréale, l'effectif était remis à zéro. Corrigé : l'effectif saisi est conservé, et le jour reste exclu du total des plats tant qu'aucune cuisson n'est déclarée.

---

## 4. Comment les calculs sont organisés

Toutes les formules vivent dans **un seul fichier** (`src/utils/canteenCalc.ts`) qui ne dépend ni de React, ni de l'écran, ni du stockage. Les écrans se contentent d'afficher les résultats. Un test vérifie automatiquement qu'**aucune ration n'est codée en dur dans l'interface**.

Les quatre fonctions demandées sont présentes : `roundUpToMultiple`, `calculateWeeklyPlan`, `calculateDailyWithdrawal`, `calculateWeeklySummary`.

**L'utilisateur ne saisit jamais une quantité calculée.** Il indique l'effectif, les jours, la céréale et la légumineuse ; tout le reste est déduit automatiquement.

**Les unités restent paramétrables** : chaque denrée est décrite par un nom, une unité, une ration et un multiple d'arrondi, réunis dans une configuration centrale. L'huile est déjà en litres, le sel s'arrondit au dixième. Modifier une ration ne demande aucune réécriture de formule.

---

## 5. Le simulateur en pratique

Le tableau de bord propose les **six cartes** demandées : Nouvelle semaine · Prélèvement du jour · Prévision hebdomadaire · Point hebdomadaire · Historique · Rapports.

**Exemple vérifié** (100 élèves, 5 jours, 3 jours de maïs, haricot) :

| Denrée | Calcul | Prévision |
|---|---|---|
| Maïs | 15 kg × 3 services | **45 kg** |
| Riz | 15 kg × 2 services | **30 kg** |
| Haricot | 3 kg × 5 jours | **15 kg** |
| Huile | 1 L × 5 jours | **5 L** |
| Sel | 0,3 kg × 5 jours | **1,5 kg** |

**Le reliquat négatif n'est jamais masqué.** Si les effectifs réels dépassent la prévision, l'application affiche le reliquat en rouge, une bannière d'alerte, et la phrase « **Dépassement de X kg** ». Vérifié en conditions réelles : avec 150 élèves par jour au lieu de 100, le maïs affiche bien −22,50 kg et l'alerte apparaît.

Les autres exigences sont en place : validations avec messages simples, enregistrement, **Nouvelle semaine avec confirmation et sans effacer l'historique**, modification tant que la semaine n'est pas clôturée (avec recalcul intégral), clôture verrouillant la saisie, réouverture possible, et exports **PDF, Excel, impression et partage**.

---

## 6. Le cahier des menus

Toutes les colonnes de votre cahier sont reproduites : *Jours de cantine · Menu · Ration par élève (Vivres, Qté en Kg) · Nombre d'élèves inscrits à la cantine (G, F, T) · Quantités de vivres à sortir pour la préparation · Solde*, avec la ligne de totaux et le pied de page **Établi par / Fonction (Maître cantine) / Date / Signature**.

Les cinq jours et les cinq vivres (Maïs, Riz, Pois vert, Huile, Sel) sont pré-remplis. La colonne « à sortir » est calculée, et le solde se reporte automatiquement d'un jour au suivant. Vérifié avec les chiffres réels de votre cahier : 147 garçons + 135 filles = 282 élèves → maïs 42,50 kg, pois vert 8,50 kg.

À l'impression, le document reprend la mise en page officielle en tableau, prêt à être signé.

---

## 7. Le cahier de stocks

**Chaque denrée a sa propre section**, comme demandé : Maïs, Riz, **Pois vert, Pois jaune, Haricot**, Huile et Sel iodé. Les colonnes sont celles du cahier : *DATE · STOCK INITIAL ancien stock · ENTRÉE DOTATION ANAN · STOCK DISPONIBLE · SORTIE · STOCK RESTANT · Ref · OBSERVATIONS*.

Trois colonnes sont calculées et ne peuvent pas être saisies de travers :
- stock disponible = stock initial + entrée
- stock restant = stock disponible − sortie
- le stock initial d'une ligne **reprend automatiquement le stock restant de la ligne précédente**

Modifier une ligne ancienne met donc à jour **toutes les suivantes** — ce qu'un cahier papier ne sait pas faire. Vérifié avec les chiffres réels de votre registre de sel : entrée de 50 kg, puis sortie de 1,80 kg → stock restant 48,20 kg, exactement comme sur la photo.

Une **alerte s'affiche** si le stock est épuisé ou si une sortie dépasse le stock disponible.

---

## 8. Intégration dans l'application existante

- Navigation, thème, authentification, bouton Retour et composants existants sont **réutilisés**, sans architecture parallèle.
- Les routes sont résolues par leur chemin (`findModule('/cantine')`), jamais par un index de tableau.
- Les données sont **rattachées à l'établissement du profil connecté**.
- Stockage local : fonctionnement **100 % hors ligne**, sans internet ni compte.
- Interface **mobile Android** : grands boutons, champs numériques adaptés, tableaux défilants horizontalement.
- Aucune dépendance nouvelle : les exports Excel réutilisent la bibliothèque déjà présente.
- Cache hors ligne mis à jour en `master-soutien-v40`.

---

## 9. Limite connue

L'export PDF s'appuie sur la fenêtre d'impression du navigateur, avec l'option « Enregistrer au format PDF ». C'est la seule méthode réellement hors ligne sur un téléphone Android, et elle produit un document identique à l'impression papier.

---

## 10. Livraison

| Fichier | Usage |
|---|---|
| **`DEPLOIEMENT-V40-SITE.zip`** | À déposer en ligne. `index.html` est **à la racine**. |
| `master-soutien-pedagogique-v40.zip` | Code source complet |
| `app/RAPPORT-AUDIT-V40.md` | Le présent rapport |

**Redéployez sur la même adresse que la version 39** afin que les utilisateurs conservent leurs données et leurs codes d'accès.
