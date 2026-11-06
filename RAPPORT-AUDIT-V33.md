# RAPPORT D'AUDIT — Master Soutien Pédagogique v33

**Date :** 12 septembre 2026 · **Cache PWA :** `master-soutien-v33`

## Résultats de validation

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit fonctionnel (`tests/audit.ts`) | **713 réussis / 0 échoué** (+48 tests v33) |
| Test de fumée (`tests/smoke.ts`) | **59 réussis / 0 échoué** (+1 écran) |
| Parcours réels E2E (`tests/e2e.mjs`) | **24 réussis / 0 échoué** |
| Build de production | **OK** — `dist/` 3 823 Ko, `deploy/` prêt |

---

## 1. NOUVEAU — Module « Enrôlement du personnel »

Écran : **Accueil → Enrôlement du personnel** (route `#/enrolement-personnel`).

Reproduit **fidèlement le modèle Excel officiel** des captures, dans l'ordre exact,
soit **12 colonnes** :

1. Matricule
2. Id ANPE (AME)
3. **Nom** *(complet sans abréviation — surligné jaune à l'export)*
4. **Prénoms** *(complet sans abréviation — surligné jaune)*
5. Sexe (M/F)
6. Date de naissance
7. Lieu de naissance
8. Nationalité (PAYS)
9. Numéro de téléphone
10. Email
11. IFU
12. Date de première prise de service

**Fonctions :**
- Saisie guidée agent par agent (aucun besoin d'ouvrir Excel), avec **fonction** (Directeur, Enseignant, Enseignant communautaire, Personnel administratif, Personnel d'appui, Autre) et établissement.
- **Contrôles de cohérence** : nom/prénoms obligatoires, sexe M ou F, format email, IFU 8–13 chiffres, longueur du téléphone. Les fiches incomplètes sont signalées (⚠️) et comptées dans la tuile « À compléter ».
- **Export Excel conforme** : en-tête stylée (Nom/Prénoms surlignés jaune, bordures, figée, filtre auto), colonnes Téléphone / IFU / Id ANPE **en format Texte** (les zéros initiaux sont conservés), un onglet **TOUT LE PERSONNEL** + un onglet par fonction.
- **Champs supplémentaires** ajoutables par l'administrateur (modèle officiel verrouillé).
- Recherche (nom, matricule, IFU), filtre par fonction, compteurs Agents / Masculin / Féminin.
- Données stockées **localement** (`msp_staff_records`), incluses dans les sauvegardes.

## 2. CORRIGÉ — Bouton Retour

Tous les boutons **Retour** des en-têtes renvoient désormais à la **page précédente**
(`navigate(-1)`) et non plus de force à l'accueil : **23 écrans corrigés**
(Enrôlement, Cloud, Mon espace, Encyclopédie, Dictionnaire, Cours, Support,
Administration scolaire, Orientation, Calendrier, Correspondance, Fiches, Boîte à
outils, Statistiques, Vérification de bulletin, etc.).
Les boutons libellés explicitement « Retour à l'accueil » conservent leur
comportement — c'est leur rôle.

## 3. NOUVEAU — Mot de bienvenue personnalisé

L'accueil affiche une salutation adaptée à l'heure (**Bonjour / Bon après-midi /
Bonsoir**) suivie de **« Bienvenue, <Nom Prénom> ! »**.
Le nom provient du **profil enseignant** (Mon espace) ; à défaut, du nom saisi lors
de l'activation. Sans nom renseigné, l'ancien titre s'affiche (aucune régression).

## 4. COMPLÉTÉ — Tableau PV du primaire : « Seuil atteint »

Le **Tableau des notes** (`Classe → Tableau des notes`) comporte trois nouvelles
colonnes de PV :

- **Moyenne** (/20, moteur officiel partagé avec les bulletins),
- **Matières validées** (nombre de matières ≥ 10 sur le total),
- **Seuil atteint** — badge vert **« Seuil atteint »** / orange **« Seuil non atteint »**.

Règle appliquée : **primaire = au moins 6 matières validées** (règle officielle
béninoise, cohérente avec les bulletins) ; **secondaire = moyenne générale ≥ 10/20**.
Une **ligne de synthèse** en bas indique le nombre et le pourcentage d'élèves de la
classe ayant atteint le seuil.

## 5. NOUVEAU — Sous-module « Statistiques par discipline / matière évaluée »

Écran : **Classe → Statistiques par discipline** (`#/class/:id/statistiques-disciplines`),
imprimable.

Pour **chaque matière évaluée**, trois lignes — **Filles (F)**, **Garçons (M)**, **TOTAL** :

| Colonne | Contenu |
|---|---|
| Nombre d'inscrits | effectif de la classe par sexe |
| Nombre ayant composé | notes saisies, **absents exclus** |
| N'ayant pas atteint le seuil | **nombre + pourcentage** |
| Ayant atteint le seuil | **nombre + pourcentage** |
| Moyenne /20 | moyenne de la matière par sexe |

Seuil = **10/20**. Une section **« Difficultés observées et remédiations »** génère
automatiquement, par matière, un diagnostic (difficultés massives / importantes /
modérées, moyenne faible, **écart de réussite garçons-filles ≥ 20 points**, apprenants
n'ayant pas composé) et des **remédiations concrètes** (remédiation collective, groupes
de besoin, tutorat par les pairs, rattrapage, sensibilisation des parents) — modifiables
selon l'observation de l'enseignant.
Les élèves sans sexe renseigné sont signalés par un avertissement pour fiabiliser la
ventilation.

---

## Compatibilité et données

- Aucune modification destructive : toutes les données v32 (classes, notes, présences,
  enrôlement des élèves, abonnement) sont **conservées**.
- Le cache PWA passe en `master-soutien-v33` : à la première ouverture, l'ancien cache
  est purgé et la nouvelle version se charge automatiquement.
- Redéployer sur **la même adresse** conserve les données de l'utilisateur.
