# VERSION 48 — MODULE « SUIVI DE VOTRE ENFANT »
## Étape ① livrée : rattachement par code et dossier de l'enfant

**Scénario retenu :** mixte, **sans aucune prise de risque sur les données des élèves**
Cache hors ligne : `master-soutien-v48` · Date : 17 septembre 2026

---

## 1. La conséquence de votre consigne

Vous avez demandé le scénario mixte **et** l'absence totale de risque sur les données
personnelles des élèves. Ces deux exigences, combinées, imposent une conclusion nette
pour cette première étape :

> **Aucune donnée d'élève ne quitte l'appareil. Aucun serveur n'est appelé.**

La raison est juridique autant que technique : tant que la **formalité préalable auprès
de l'APDP** (loi n° 2017-20, Livre V) n'est pas accomplie, publier des données de mineurs
sur un serveur serait illégal. **Le seul risque nul est celui qu'on ne prend pas.**

La synchronisation chiffrée viendra à l'**étape ②**, une fois le dossier APDP instruit.
D'ici là, le module est **pleinement fonctionnel**.

---

## 2. Comment cela marche concrètement

```
   ENSEIGNANT                                         PARENT
   ──────────                                         ──────
1. Choisit l'élève                          
2. Génère un CODE  ──── remis en main propre ────►  4. Saisit le code
   (affiché une seule fois)                         
3. Crée le DOSSIER ──── clé USB, Bluetooth,  ────►  5. Ouvre le fichier
   chiffré (.msp)        message, carte SD           → dossier déchiffré
                                                        sur SON téléphone
```

**Le fichier et le code voyagent séparément.** Même intercepté, le fichier est illisible :
il est chiffré en **AES-GCM 256 bits**, le code servant de clé. Vérifié par test : le nom
de l'enfant n'apparaît **pas en clair** dans le fichier, et le code non plus.

---

## 3. Les garanties de confidentialité, vérifiées par des tests

| Garantie | Comment elle est tenue |
|---|---|
| **Le parent ne voit que son enfant** | Le dossier est construit à partir du seul élève ciblé. Test : aucune trace des 5 autres élèves (noms, prénoms, matricules) ni dans le fichier, ni à l'écran. |
| **Aucun classement** | Ni rang, ni palmarès. Un parent ne peut pas situer les autres enfants. |
| **Aucune donnée sensible** | Sexe, date de naissance et photo **ne sont pas transmis** : inutiles au suivi. |
| **Anti-réidentification** | La moyenne de la classe n'est donnée qu'à partir de **5 élèves notés**. En dessous, un agrégat permettrait de deviner la note d'un camarade — elle est donc masquée. |
| **Consentement préalable** | Rien n'est enregistré avant l'accord explicite du parent. Case non pré-cochée, texte en langage simple. |
| **Droit à l'effacement** | Un bouton retire l'accord et **efface tout**, immédiatement et sans frais. |
| **Code sécurisé** | 12 caractères tirés par `crypto.getRandomValues` (jamais `Math.random`), sans caractères ambigus (ni O/0, ni I/1/L). |
| **Révocation** | L'école peut révoquer un rattachement (conflit familial, décision de justice) et tient un **journal** des codes émis. |
| **Expiration** | Un code est valable 30 jours. |
| **Aucun réseau** | Test automatique : les trois fichiers du module ne contiennent ni `fetch`, ni `supabase`, ni `cloudSync`. |

---

## 4. Un défaut de conception trouvé et corrigé

En testant le parcours réel, le parent restait bloqué sur **l'écran de paiement**.

C'était une vraie faute de conception : **un parent n'est pas un abonné.** Il n'a pas à
payer les 999 ou 1500 FCFA de l'enseignant, ni à posséder un code enseignant, pour voir
le dossier de son propre enfant.

`/suivi-enfant` est donc devenu une **route publique**. Sa sécurité ne repose pas sur
l'abonnement mais sur le chiffrement et le code de rattachement.

⚠️ **L'ouverture est strictement délimitée**, et je l'ai vérifiée : `/suivi-enfant/codes`
(la génération des codes, réservée à l'enseignant) reste protégée, tout comme l'accueil,
les classes, la cantine, la calculatrice, le numériseur et l'administration.

---

## 5. Ce que voit le parent

- **Résultats** par matière et par évaluation, avec une **phrase en langage clair** —
  par exemple : *« Résultat fragile (9,00/20) : un accompagnement aiderait. Il est en
  dessous de la moyenne de sa classe (11,50/20). »* Beaucoup de parents n'ont pas été
  scolarisés longtemps : un chiffre seul ne leur dit pas si l'enfant va bien.
- **Progression** entre les deux dernières évaluations.
- **Absences** en demi-journées (règle de l'application : une seule le mercredi, rien le
  week-end), justifiées ou non, avec le motif.
- **Mot de l'enseignant**, facultatif.
- **Date d'établissement du dossier** affichée en clair — pas de faux « temps réel ».
- **Export PDF** et **sélecteur multi-enfants** (fréquent au Bénin).

---

## 6. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (dont **46 nouveaux contrôles v48**) | **1518 / 1518** |
| **E2E v48** — parcours enseignant → parent, **deux téléphones simulés** | **35 / 35** |
| Contrôle du portail (non-régression des accès) | **8 / 8** |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout utilise **deux contextes de navigateur séparés** — deux téléphones,
deux stockages cloisonnés. Le seul lien entre eux est le fichier chiffré et le code.
Il vérifie notamment qu'un **mauvais code n'affiche aucune donnée**, que le **bon code
fonctionne même saisi en minuscules avec des espaces**, et qu'aucun nom de camarade
n'apparaît jamais à l'écran du parent.

---

## 7. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V48-SITE.zip`** | 11,2 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v48.zip` | 9,3 Mo — sources |

👉 À déposer sur https://app.netlify.com/drop, **sur la même adresse** pour conserver les
données. Aucune fonctionnalité existante n'a été retirée.

---

## 8. La suite

**Ce que vous devez faire, et que je ne peux pas faire à votre place :**
engager la **formalité préalable auprès de l'APDP** (gratuite mais obligatoire,
sur apdp.bj). Elle conditionne l'étape ② et peut imposer des choix d'architecture.

**Étape ② (après feu vert APDP) :** synchronisation chiffrée de bout en bout, pour que le
dossier se mette à jour tout seul au lieu d'être remis en fichier.
**Étape ③ :** annonces de l'école, puis messagerie et rendez-vous.

Le spécification complète reste dans `SPEC-MODULE-SUIVI-ENFANT.md`.
