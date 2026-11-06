# ✨ Améliorations du module Ressources & Modules éducatifs — Septembre 2026

## 1. 🖼️ Images réparées partout (bug critique)

**Problème :** toutes les illustrations des cartes utilisaient `source.unsplash.com`,
un service **définitivement hors service (HTTP 503)** → **images blanches/cassées**
dans l'Encyclopédie, le Dictionnaire, les cours du Programme et l'explorateur de
concepts (marketplace).

**Correctif :** nouveau générateur d'illustrations **local** (`svgIllustration.ts`) :
- Images SVG en data URI : **aucune requête réseau**, fonctionnent **100 % hors-ligne**
- **Emoji thématique** intelligent selon la matière/le mot (🔢 math, 📖 lecture, 🔬 sciences, 🩺 santé, 🚦 sécurité, 🇧🇯 Bénin, 💻 informatique, 🎨 art…)
- **Dégradé aux couleurs du drapeau béninois** (vert/émeraude + accents) + initiales du thème
- Déterministe : chaque thème a toujours la même illustration (repère visuel stable)
- Léger et instantané

## 2. 🔊 Lecture vocale du Dictionnaire des petits écoliers

- Nouveau bouton **haut-parleur** 🔉 sur chaque mot affiché : le mot, sa définition et l'exemple sont **lus à voix haute** (voix du téléphone, Web Speech API)
- **Français (fr-FR)** sélectionné automatiquement si disponible
- **Aucune connexion** requise — idéal pour les enfants qui ne lisent pas encore bien

## 3. 📄 Courriers aux parents en Word officiel

Nouveau bouton **« Word officiel »** dans le Carnet de Correspondance :
- En-tête officiel : **République du Bénin**, ministère, circonscription, **logo de l'école** (profil), nom de l'école
- Classe, année scolaire, date du jour
- **OBJET** du courrier + corps du message + signature enseignant
- **Coupon réponse détachable** avec ligne de signature du parent
- Fichier `.docx` prêt à imprimer — tout généré localement

## 4. 📅 Calendrier scolaire : jours fériés officiels du Bénin

Ajoutés automatiquement à la liste par défaut :
| Date | Fête |
|---|---|
| 01/01 | Jour de l'an |
| 25/12 | Noël |
| 01/05 | Fête du Travail |
| **01/08** | **Fête Nationale — Indépendance (1960)** |
| 15/08 | Assomption |
| 01/11 | Toussaint |
| 2026 (mobile) | Lundi de Pâques, Ascension, Pentecôte, Korité, Tabaski, Maouloud *(dates officielles à confirmer — marquées « à confirmer »)* |

- **Fusion intelligente** : les nouveaux jours fériés sont ajoutés aux calendriers existants sans écraser les événements de l'enseignant
- Chaque fête porte la mention « à confirmer » quand la date dépend de la commission nationale

## ✅ Tests : 135/135 réussis (+21 nouveaux)

- Illustrations : 9 tests (SVG valide, emojis thématiques, déterminisme, hors-ligne)
- Courrier Word : 8 tests (en-tête, objet, coupon, logo intégré, relation image)
- Calendrier : 4 tests (IDs uniques, fêtes officielles présentes, fusion)

## 📂 Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/utils/svgIllustration.ts` | 🆕 Générateur d'illustrations SVG locales |
| `src/utils/correspondenceExport.ts` | 🆕 Export Word officiel avec logo |
| `src/components/KnowledgeHubScreen.tsx` | Images réparées (illustrations locales) |
| `src/components/KidsDictionaryScreen.tsx` | Images réparées + lecture vocale 🔊 |
| `src/utils/aiConceptExplainer.ts` | Images réparées |
| `src/utils/programmeData.ts` | Images des cours du programme réparées |
| `src/components/CorrespondenceScreen.tsx` | Bouton « Word officiel » |
| `src/components/SchoolCalendarScreen.tsx` | Jours fériés du Bénin + fusion intelligente |
| `tests/audit.ts` | +21 tests |
| `public/sw.js` | Cache v9 |
