# VERSION 52 — LES 8 MODULES DE VIE SCOLAIRE

Cache hors ligne : `master-soutien-v52` · 19 septembre 2026

---

## 1. Les 8 propositions sont développées

Elles sont regroupées dans un nouveau module **« Ma vie scolaire »**, accessible depuis
l'accueil. L'application passe de 31 à **39 sous-modules**.

| | Sous-module | Ce qu'il apporte |
|---|---|---|
| ① | **Registre d'appel officiel** | Taux de fréquentation réglementaire, ventilation garçons/filles, alerte de décrochage |
| ② | **Paiements des élèves** | Qui a payé, ce qui reste dû, **reçu numéroté** avec montant en lettres |
| ③ | **Livret scolaire** | Le parcours de l'élève d'une année sur l'autre, avec tendance |
| ④ | **Manuels et matériel** | Prêts, retours, pertes chiffrées, stock disponible déduit |
| ⑤ | **Emploi du temps** | Grille hebdomadaire, volume horaire, **détection des chevauchements** |
| ⑥ | **Élèves en difficulté** | Actions de remédiation et résultats, avec taux de réussite |
| ⑦ | **Sauvegarde** | Fichier complet + **alerte si la dernière date de plus de 7 jours** |
| ⑧ | **Conseil de classe** | Délibération pré-remplie et procès-verbal |

Chacun exporte en **Word, PDF et impression** — les trois coexistent, comme vous l'exigez
depuis la v41.

---

## 2. Les règles de calcul que j'ai appliquées

Je les explicite car elles engagent vos documents officiels.

**Taux de fréquentation** = demi-journées suivies ÷ demi-journées dues. L'unité est la
**demi-journée** : le mercredi n'en compte qu'une, le week-end aucune. Les **jours fériés
sont exclus** des deux termes — les compter ferait chuter le taux d'une école qui a
simplement suivi le calendrier officiel.

**Taux de recouvrement** = encaissé ÷ attendu, l'attendu étant **net des remises** :
réclamer un taux sur des sommes volontairement remises donnerait une fausse image de
votre gestion. Un **trop-perçu n'est jamais masqué** et ne compense jamais la dette d'un
autre élève.

**Conseil de classe : l'application propose, le conseil décide.** La décision et la
mention sont pré-remplies à partir de la moyenne, mais restent modifiables — le conseil
tient compte d'éléments que l'application ignore. Le test vérifie d'ailleurs que vous
pouvez passer outre la proposition.

**Stock disponible** = total − prêtés − perdus − abîmés. Vous ne saisissez jamais une
quantité calculée, et une incohérence (plus de prêts que d'exemplaires) est **signalée,
jamais masquée**.

---

## 3. Un détail qui aurait gâché vos reçus

Le montant en toutes lettres, obligatoire sur un reçu officiel, affichait
« un million cinq **cents** mille francs ». En français, *cent* ne prend jamais de s
devant *mille*. Le module écrivait aussi « deux millions francs » au lieu de
« deux millions **de** francs ».

Corrigé et vérifié sur 15 cas : 80 → « quatre-vingt**s** », 203 → « deux cent trois »,
1 500 000 → « un million cinq cent mille francs CFA ».

**Également traité :** les 8 nouveaux jeux de données sont déclarés dans la sauvegarde.
Sans cela, une restauration aurait silencieusement effacé vos paiements et vos registres —
le test le vérifie en relisant le contenu du fichier produit.

---

## 4. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**80 nouveaux contrôles v52**) | **1680 / 1680** |
| **E2E v52** — les 8 modules en navigateur réel | **37 / 37** |
| E2E v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout suit de vrais parcours : il encaisse un versement et vérifie le
**reçu `recu-2026-0001.pdf`** puis le reste dû (15 000 − 2 000 = 13 000 FCFA) ; il prête
un manuel et vérifie que le stock passe de 10 à 9 ; il crée un chevauchement d'horaires
et vérifie l'alerte ; il ouvre un dossier pour l'élève à 5/20 **détecté automatiquement** ;
et il relit le fichier de sauvegarde pour confirmer que les nouvelles données y sont.

---

## 5. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V52-SITE.zip`** | 11,2 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v52.zip` | 9,7 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** pour conserver les données.
Aucune fonctionnalité existante n'a été retirée.

---

## 6. Ce que je vous recommande de faire en premier

Ouvrez **Vie scolaire → Sauvegarde** et créez une sauvegarde dès le déploiement. C'est le
module ⑦, et c'est celui qui protège tous les autres : l'application étant 100 % locale,
la perte du téléphone reste le seul risque contre lequel elle ne peut rien toute seule.

---

## 7. Toujours en attente

1. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
2. **La déclaration APDP** pour l'espace parents — elle conditionne l'étape ②
   (synchronisation automatique des dossiers).
