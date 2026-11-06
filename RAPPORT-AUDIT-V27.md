# 📋 Rapport — v27 (Type d'évaluation affiché en bas du bulletin — maternelle & primaire)

**Date :** 5 septembre 2026
**Audit automatique :** ✅ **565 tests réussis / 0 échec** (TypeScript : 0 erreur, build : OK)

## Ce qui a changé

Le **type d'évaluation** que l'enseignant a écrit lui-même dans
**Nouvelle classe** (ex. « Devoir surveillé », « Interrogation écrite »,
« Évaluation par projets »…) apparaît maintenant **en bas du bulletin**
maternelle / primaire :

- **Bulletin Word exporté** (`Tous les bulletins`) : ligne centrée
  **« Type d'évaluation : … (1er trimestre) »** placée juste après
  l'appréciation et **avant les signatures** — donc en bas du bulletin,
  sous les résultats du trimestre.
- **Bulletin imprimable à l'écran** (Imprimer / PDF) : même mention dans le
  **pied du bulletin**, au-dessus de la ligne de copyright.
- N'affiché que pour **maternelle et primaire** (le bulletin officiel du
  secondaire garde son format propre : MEPE / NPS1 / NPS2).
- Classes **sans** type d'évaluation (créées avant) : aucun impact, la ligne
  n'apparaît pas.

## Vérifications

- 🆕 Tests §36 : la ligne existe dans le générateur Word primaire, placée
  **juste avant les signatures** ; visible dans le pied de la vue imprimable ;
  **maternelle/primaire uniquement**. ✅
- Exports exécutés sans erreur dans les 3 cas : avec type, sans type
  (classe ancienne), maternelle. ✅
- Audit **565/0** · TypeScript 0 erreur · Build + postbuild OK ·
  Cache PWA → `master-soutien-v27`
