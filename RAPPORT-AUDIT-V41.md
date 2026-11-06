# Master Soutien Pédagogique — Rapport d'audit v41

Date : 15 septembre 2026
Version : **v41** · Cache PWA : `master-soutien-v41`
Code d'accès : `MSP-Catalyste@@007-2026` (inchangé)

---

## 1. Ce qui a été demandé et ce qui a été fait

| # | Demande | État |
|---|---------|------|
| 1 | Vraie génération PDF, **impression conservée** | ✅ Fait |
| 2 | Cantine : changer de légumineuse en cours de semaine | ✅ Fait |
| 3 | IA MSP de génération de gravures et d'images éducatives | ✅ Fait |
| 4 | Banque de 12 images à 100 F, payables avant téléchargement | ✅ Fait |

Aucune fonctionnalité des versions v32 à v40 n'a été retirée.

---

## 2. Chantier 1 — De vrais fichiers PDF

Jusqu'à la v40, « exporter en PDF » ouvrait la boîte d'impression du navigateur.
L'application fabrique désormais elle-même le fichier, **hors ligne**, grâce au
nouveau module `src/utils/pdfMaker.ts` (jsPDF 3.0.3, aucune connexion requise).

Ce module sait composer : titres de section, paragraphes, couples clé/valeur,
tableaux, encadrés d'alerte, images, bloc de signature et pieds de page numérotés.

**L'impression n'a pas disparu.** Partout où un export PDF existe, le bouton
« Imprimer » reste présent : les deux fonctionnent côte à côte.

### Contrôle qualité effectué
Le test automatisé télécharge réellement le fichier et l'ouvre pour l'examiner :

- le nom se termine bien par `.pdf` ;
- le fichier commence par la signature `%PDF` (c'est donc un vrai PDF, pas une page web) ;
- il contient au moins une page structurée.

### Un défaut trouvé et corrigé
Le premier PDF contenant une gravure pesait **5 867 000 octets (5,9 Mo)** — beaucoup
trop lourd à partager depuis un téléphone. La compression des flux n'était pas activée.
Après correction (`compress: true` et compression des images) :

| | Avant | Après |
|---|---|---|
| PDF d'une planche éducative | 5 867 Ko | **82 Ko** |

Soit un fichier **72 fois plus léger**, pour une qualité d'impression identique.

---

## 3. Chantier 2 — Changement de légumineuse en cours de semaine

Situation réelle visée : le stock de haricot s'épuise le mercredi soir, la semaine
se termine au pois jaune.

Désormais **chaque journée porte sa propre légumineuse**. Le point hebdomadaire
affiche **une ligne de reliquat par type** de légumineuse, et non plus un cumul global.

### Pourquoi ce détail est important
C'était le cœur de la demande. Avec un cumul global, une semaine « haricot puis
pois jaune » affiche un reliquat total de 0 et semble équilibrée, alors qu'en
réalité il manque 15 kg de pois jaune pendant que 15 kg de haricot dorment en magasin.

| Suivi | Reliquat affiché | Dépassement détecté |
|---|---|---|
| Cumul global (ancien) | 0 | ❌ non — l'erreur est masquée |
| Par légumineuse (v41) | Haricot +15 / Pois jaune −15 | ✅ oui, signalé |

Sur une semaine correctement planifiée (100 élèves, haricot lundi→mercredi,
pois jaune jeudi→vendredi), le calcul donne 9 kg de haricot et 6 kg de pois jaune,
reliquats nuls des deux côtés, aucune fausse alerte.

L'application signale la bascule en toutes lettres :
> « Changement de légumineuse en cours de semaine : Haricot (J1, J2, J3) puis Pois jaune (J4, J5). »

Le choix de chaque journée est conservé après fermeture de l'application.

---

## 4. Chantier 3 — IA MSP de génération d'images éducatives

Nouveau module **« Mes images éducatives »**, premier sous-module :
**« IA MSP de génération de gravures et d'images éducatives »**.

Conformément à votre règle, cette IA fonctionne **entièrement en local, sans clé
API et sans internet**. Elle n'est pas « à venir » : elle produit réellement une image.

Vous écrivez une consigne en français (« une école avec le maître et les élèves »),
choisissez le style (gravure au trait noir, couleur, ou coloriage à remplir), le
niveau et les légendes. L'application dessine alors une planche vectorielle
imprimable en 800 × 620.

**Ce sous-module est entièrement gratuit** : aucun paiement n'y est demandé.

### Honnêteté du moteur
L'IA affiche toujours ce qu'elle a compris de votre consigne
(« Consigne comprise : scène "École et élèves" — mots reconnus : ecole… »).
Si la consigne ne correspond à rien de connu, elle le dit franchement au lieu de
produire une image au hasard. Les créations sont conservées dans un historique.

---

## 5. Chantier 4 — Banque d'images éducatives (100 FCFA l'image)

12 planches de grande qualité, dessinées pour ce projet, **contexte béninois
d'abord, africain ensuite** : 7 images « Bénin », 5 images « Afrique ».

| # | Image | Contexte |
|---|---|---|
| 1 | Village lacustre de Ganvié | Bénin |
| 2 | Marché de Dantokpa | Bénin |
| 3 | École primaire | Bénin |
| 4 | Cycle de l'eau | Afrique |
| 5 | Champ de maïs | Bénin |
| 6 | Hygiène des mains | Bénin |
| 7 | Animaux de la ferme | Afrique |
| 8 | Formes géométriques | Afrique |
| 9 | Protéger l'environnement | Afrique |
| 10 | Savane et baobab | Afrique |
| 11 | Repas en famille | Bénin |
| 12 | Sécurité routière | Bénin |

### Vérification visuelle réelle
Les 12 planches ont été **affichées et inspectées une à une** dans un vrai
navigateur. Trois défauts de placement ont été relevés puis corrigés :

1. une bande blanche disgracieuse entre le ciel et le sol sur la scène du marché ;
2. l'enfant qui se superposait à la bassine sur la scène d'hygiène (image confuse,
   et contraire au message d'hygiène enseigné) ;
3. l'étiquette « Le baobab » qui traversait le tronc de l'arbre.

Après correction, les 12 planches sont nettes, sans chevauchement, légendes lisibles.

### Le péage (mécanisme v38)
- Tant que l'image n'est pas payée, seul un **aperçu filigrané** « APERÇU / 100 FCFA » s'affiche.
- **Aucun bouton de téléchargement n'existe** avant paiement.
- Le bouton « Demander l'accès » affiche les coordonnées de paiement du Super
  Administrateur (paramétrables, jamais codées en dur) et l'identifiant de l'appareil.
- Le Super Administrateur communique un code de déverrouillage ; un code erroné est refusé.
- Une fois validé : téléchargement en **PDF, JPG/JPEG ou PNG**, plus l'impression.
- **Payer une image ne déverrouille pas les autres** : chaque planche coûte 100 F.
- Le déverrouillage survit au rechargement de l'application.

Ces huit points ont été vérifiés un par un par le test automatisé.

---

## 6. Résultats des contrôles

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit statique (50 sections) | **1241 réussis / 0 échoué** |
| Tests de fumée | **63 / 0** |
| **Tests navigateur v41** | **47 / 0** |
| Tests navigateur v40 (cantine) | 45 / 0 |
| Tests navigateur v39 | 41 / 0 |
| Tests navigateur v38 | 45 / 0 |
| Tests navigateur v36 | 47 / 0 |
| Tests navigateur v35 | 12 / 0 |
| Tests navigateur v34 | 5 / 0 |
| Tests navigateur de base | 28 / 0 |
| **Total** | **1374 contrôles, 0 échec** |

### Trois corrections apportées à l'audit lui-même
En fin de parcours, trois contrôles échouaient. Aucun ne venait de l'application :

1. le total attendu de sous-modules valait encore 17, alors que la v41 en ajoute deux (19) ;
2. la liste des versions de cache acceptées ne connaissait pas encore la v41 ;
3. le test « le moteur d'images ne fait aucun appel réseau » rejetait le texte `http`
   — or celui-ci apparaît légitimement dans `xmlns="http://www.w3.org/2000/svg"`,
   l'adresse technique obligatoire de tout dessin SVG, qui n'est pas une requête
   internet. Le contrôle vérifie maintenant l'absence de `fetch(`, `XMLHttpRequest`
   et `https://` en ignorant cette mention.

Le fonctionnement 100 % hors ligne reste donc bien vérifié.

### Remarque de méthode
Les tests v38 et v39 ont d'abord semblé échouer lorsque toutes les suites étaient
enchaînées (délais dépassés sous forte charge). Rejoués isolément, ils passent
intégralement : **45/0** et **41/0**. Il s'agissait d'une lenteur de la machine
de test, pas d'une régression de l'application.

---

## 7. Livraison

- `DEPLOIEMENT-V41-SITE.zip` — **à déposer tel quel**, `index.html` est à la racine.
- `master-soutien-pedagogique-v41.zip` — code source complet.

**Déploiement :** déposez le contenu du zip de déploiement sur
https://app.netlify.com/drop, **à la même adresse que la v40**, afin que les
données déjà enregistrées par les utilisateurs soient conservées.

Après mise en ligne, l'application se met à jour toute seule sur les téléphones
(le cache passe à `master-soutien-v41`). Les codes d'accès des utilisateurs et des
membres de l'équipe **ne sont pas effacés** par cette mise à jour.
