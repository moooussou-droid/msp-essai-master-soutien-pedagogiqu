# 📋 Rapport — v26 (Type d'évaluation : saisie libre au clavier)

**Date :** 5 septembre 2026
**Audit automatique :** ✅ **559 tests réussis / 0 échec** (TypeScript : 0 erreur, build + postbuild : OK)

## Ce qui a changé

Le champ **« Type d'évaluation »** du formulaire **Nouvelle classe** n'est plus
une sélection de cartes prédéfinies (Évaluation / Devoir surveillé /
Interrogation écrite) : c'est désormais **un champ de saisie libre**, où
l'utilisateur **écrit lui-même** le type d'évaluation depuis son clavier
(portable, ordinateur, téléphone).

- Consigne affichée : « Écrivez librement le type d'évaluation de la classe,
  tel que vous le pratiquez (affiché sur les bulletins et documents). »
- Exemple en gris (non imposé) : « Ex : Devoir surveillé, Interrogation écrite,
  Évaluation, Composition… »
- Le champ **ne force aucun choix** : l'utilisateur peut écrire exactement ce
  qu'il veut (« Devoir surveillé du 1er trimestre », « Composition », etc.).
- Le texte tapé est enregistré avec la classe, puis affiché sur la carte de
  classe (accueil), le tableau de bord de classe, l'écran Bulletins et le
  récapitulatif Excel.
- Classes déjà créées : inchangées (champ optionnel, vide si jamais rempli).

## Vérifications

- 🆕 Tests : « aucune sélection imposée », « champ de saisie libre »,
  « champ texte avec consigne écrivez librement », « plus de cartes »,
  « texte tapé enregistré », « rechargé en modification (vide si absent) » ✅
- TypeScript 0 erreur · Audit **559/0** · Build + postbuild OK
- Cache PWA passé à `master-soutien-v26` (les utilisateurs installeront la
  nouvelle version automatiquement)
