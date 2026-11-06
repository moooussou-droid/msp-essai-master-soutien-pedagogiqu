# RAPPORT D'AUDIT — Master Soutien Pédagogique v36

**Date :** 13 septembre 2026 · **Cache PWA :** `master-soutien-v36`

## Résultats de validation

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit fonctionnel | **864 / 0** (+73 tests v36) |
| Test de fumée | **63 / 0** |
| E2E général | **28 / 0** |
| E2E v34 (retour, cours) | **5 / 0** |
| E2E v35 (rôles) | **12 / 0** |
| **E2E v36 (nouveautés)** | **47 / 0** |
| Build de production | **OK** — `deploy/` 3 946 Ko |

---

## 1. Nouveaux modules et présentation simplifiée

L'accueil présentait une longue liste plate d'une vingtaine de raccourcis. Les
fonctions sont désormais **regroupées par module**, chaque module disposant de sa
propre page (en-tête coloré, phrase de présentation, sous-modules numérotés).

| Module créé | Sous-modules |
|---|---|
| **Enrôlement** | Enrôlement **intelligent des élèves** *(renommé)* · Enrôlement du personnel |
| **Orientation de l'élève** | Orientation scolaire · Orientation post-BAC |
| **Préparation de classe** | Programme d'études · Planification annuelle · Fiches pédagogiques / Préparation · Générateur de fiches APC avec IA |
| **Espace partenariat** | Annonces / Recrutement · Publicités |

Le reste de l'accueil est réorganisé en trois rubriques claires : **Suivi & analyse**,
**Savoirs & cours**, **Vie de l'établissement**.

## 2. Présences : deux demi-journées par jour

- Du **lundi au vendredi**, chaque jour est divisé en **matin** et **après-midi** ;
  l'appel est fait séparément pour chaque demi-journée.
- Le **mercredi** ne comporte qu'**une seule demi-journée** (le matin) : l'après-midi
  est désactivé et signalé.
- **Samedi et dimanche** : pas de classe, l'appel est indisponible avec un message
  explicatif.

**Cinq options** de présence, au lieu de quatre :
Présent · Absence avec justification · Absence sans justification ·
**Journée fériée** *(nouveau)* · **Demi-journée de séance** *(nouveau)*.

Les statistiques, le PV mensuel et les exports Excel/Word sont recalculés
**par demi-journée** (une colonne « M » et une colonne « S » par jour). Les
demi-journées fériées sont **exclues du total** : elles ne pénalisent pas l'élève.

## 3. Les codes d'accès ne sont plus effacés par les mises à jour

C'était le point le plus sensible. Trois protections ont été mises en place :

1. **Clés protégées** — activation de l'utilisateur, équipe d'administration et codes
   générés sont déclarés protégés ; aucune purge de cache ni réinitialisation ne peut
   les supprimer.
2. **Copie de sécurité automatique** — à chaque démarrage, les codes sont recopiés dans
   une seconde zone de stockage, et **restaurés** si la zone principale a été vidée par
   une mise à jour.
3. **Retrait volontaire uniquement** — un code ne cesse d'être accepté que dans
   **trois cas** : son **expiration**, son **retrait** ou sa **suppression** par le
   **Super Administrateur** (boutons cadenas et corbeille, réservés à ce rôle).

> **Vérifié en conditions réelles** : le test E2E vide volontairement le stockage
> comme le ferait une mise à jour, recharge l'application, et confirme que l'équipe,
> les codes générés et l'activation de l'utilisateur sont **intégralement restaurés**.

## 4. Quiz structuré en 100 niveaux

- **100 niveaux de 10 questions** (1 000 questions), de difficulté croissante :
  3 choix de réponse au début, jusqu'à 6 au niveau 100.
- Cinq paliers : Découverte, Apprenti, Explorateur, Expert, **Champion**.
- Un niveau est **réussi à 7/10** et débloque le suivant ; la grille des 100 niveaux
  montre les niveaux verrouillés, en cours et réussis.
- **Classement hebdomadaire du lundi au dimanche** : le **nom du meilleur joueur de la
  semaine** est publié dans l'application, avec le top 5 de la semaine en cours.

## 5. Dictionnaire et encyclopédie enrichis

Conformément à votre choix de **privilégier la qualité**, les contenus ont été rédigés
à la main plutôt que produits mécaniquement :

- **Dictionnaire des petits écoliers : +417 mots** en 18 familles (animaux, corps
  humain, école, maison et famille, nature, aliments, métiers, objets, Bénin et société,
  nombres et mesures, santé, temps, verbes, sentiments, vêtements, sports, musique,
  transport, sciences, géographie, grammaire). Chaque mot a une définition simple et un
  exemple ancré dans le quotidien béninois.
- **Encyclopédie : +100 articles** de fond (Bénin, Danxomè, Béhanzin, Ouidah,
  photosynthèse, cycle de l'eau, paludisme, Constitution, droits de l'enfant, etc.),
  chacun avec explication simple, développement, exemples et mots-clés.

## 6. Abonnement Essentiel (999 FCFA/an)

La formule à **999 FCFA/an** inclut désormais **trois** fonctions :
enrôlement intelligent des élèves · **enrôlement du personnel** *(ajouté)* ·
importation des notes. Les autres fonctions restent réservées à la formule Complet.

## 7. Un bulletin par évaluation + Bilan annuel

- À la **Maternelle et au Primaire**, **chaque évaluation a désormais son propre
  bulletin** : le mode « Toutes (synthèse) » a été retiré de l'écran Bulletins, qui
  sélectionne d'office la première évaluation.
- La **synthèse de toutes les évaluations** devient le module **Bilan annuel
  (moyennes et présences)** : moyenne par évaluation, moyenne annuelle, rang, taux de
  présence en demi-journées, absences, décision de fin d'année et classement.
  Accessible depuis le tableau de bord de la classe et depuis les bulletins.

## 8. Corrections et fiabilisation

- Tests d'audit alignés sur les nouvelles règles (demi-journées, formule Essentiel,
  colonnes d'export).
- Correction du calcul du taux de présence, qui comptait les jours et non les
  demi-journées, et n'excluait pas les jours fériés.
- Suppression du dernier `localStorage.clear()` de l'application, qui effaçait le code
  d'accès lors d'une réinitialisation locale.
- Exports Excel et Word mis à jour (colonnes M/S, nouvelle légende, motifs d'absence
  précisant la demi-journée).

---

## Compatibilité

- Les registres de présence antérieurs restent lisibles : les anciennes entrées sont
  rattachées au **matin**, et l'ancien statut « Retard » est lu comme « Présent ».
- Codes d'accès, équipe d'administration et données des classes sont conservés.
- Code d'accès global inchangé : `MSP-Catalyste@@007-2026`.
- Cache `master-soutien-v36` : mise à jour automatique chez tous les utilisateurs.
