# VERSION 54 — LES TROIS FORFAITS AU CHOIX SUR L'ACCUEIL

Cache hors ligne : `master-soutien-v54` · 19 septembre 2026

---

## 1. Ce qui change à l'ouverture de l'application

L'écran d'accueil présentait deux formules, en simple lecture. Il propose désormais
**les trois forfaits, sous forme de cartes que l'utilisateur touche pour choisir** :

| | Formule | Tarif | Mention |
|---|---|---|---|
| 1 | **Essentiel** | 999 F / an | *Pour démarrer* |
| 2 | **Complet** | 1500 F / an | *Le plus choisi* — sélectionné par défaut |
| 3 | **Pro** | 2500 F / an | *Gestion complète* |

Chaque carte affiche **le détail de ce qui est inclus**. Le forfait retenu est marqué
d'une pastille « ✓ CHOISI », un récapitulatif le confirme sous les cartes, et **un seul
forfait peut être actif à la fois**.

Les forfaits sont présentés **du moins cher au plus complet**, en une seule colonne sur
téléphone, avec de gros boutons tactiles.

---

## 2. Le choix sert vraiment à quelque chose

C'est le point important : le forfait sélectionné est **repris automatiquement dans la
demande WhatsApp** envoyée à l'administrateur. Celui-ci reçoit par exemple :

> *Formule souhaitée : Pro — 2500 FCFA / an*
> *• Tout le plan Complet*
> *• Mes registres officiels (cahier journal, registre matricule)*
> *• Ma vie scolaire (appel officiel, paiements, livret, conseil de classe…)*
> *…*

Auparavant, le message listait **toutes** les formules en vrac : l'administrateur devait
redemander laquelle le client voulait. Il sait maintenant immédiatement quel code générer.

---

## 3. La cause du problème, corrigée à la racine

En intervenant, j'ai trouvé pourquoi la formule Pro n'apparaissait pas sur l'accueil après
la v53 : **l'écran d'accueil contenait sa propre liste de forfaits, recopiée en dur**,
indépendante du catalogue officiel de l'application. Il existait donc deux vérités, et
ajouter un forfait demandait de penser à modifier deux endroits — ce qui avait été oublié.

L'accueil lit désormais **le catalogue unique** (`subscription.ts`). Conséquences
concrètes pour vous :

- la **formule détectée** à la saisie du code reconnaît maintenant « Pro » (elle affichait
  auparavant « Complet » pour un code Pro, ce qui était trompeur) ;
- le bandeau de prix affiche **999 / 1500 / 2500** au lieu de « 999 ou 1500 » ;
- si vous modifiez un jour un tarif ou une formule, **une seule modification suffira** et
  l'accueil suivra automatiquement.

Deux contrôles automatiques interdisent désormais de recopier à nouveau des tarifs en dur
dans l'accueil.

---

## 4. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**18 nouveaux contrôles v54**) | **1751 / 1751** |
| **E2E v54** — choix des forfaits en navigateur réel | **21 / 21** |
| E2E v53 · v52 · v51 · v50 · v49 · v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 15 · 37 · 13 · 19 · 36 · 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |

Le test bout-en-bout sélectionne successivement les trois forfaits, vérifie qu'**un seul
reste actif**, **intercepte le message WhatsApp** pour confirmer qu'il annonce bien
« Pro — 2500 FCFA », puis saisit les trois types de codes (`931568`, `132852`, `285791`)
et contrôle que la formule détectée est la bonne à chaque fois.

---

## 5. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V54-SITE.zip`** | 11,3 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v54.zip` | 10,0 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** pour conserver les données.
Aucune fonctionnalité existante n'a été retirée.

---

## 6. Rappel : une décision vous attend toujours

Vos abonnés **Complet actuels** (code commençant par « 1 ») voient l'écran de mise à
niveau sur les 4 modules réservés. Trois options :

1. **Laisser ainsi** — ils paient le complément de 1000 F pour un code Pro ;
2. **Offrir la transition** — vous leur générez un code Pro gratuitement ;
3. **Ouvrir un module en avant-goût** (la sauvegarde, par exemple).

Dites-moi ce que vous préférez ; l'option 3 demanderait une petite modification.

---

## 7. Toujours en attente

1. **« Fiches élèves » → « Saisie par profil » ?** (question posée en v46)
2. **La déclaration APDP** pour l'espace parents (étape ② du suivi enfant).
