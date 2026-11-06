# Mise à jour v14 — 🚀 Encyclopédie : 500+ articles, Quiz par thématique, Article du jour

**Version livrée : v14 — Master Soutien Pédagogique** · Suite de tests : **349/349** (21 nouveaux tests) · Build de production : ✅ · Service worker : **v17**

Vous avez répondu **OUI** aux 3 extensions proposées après la v13. Les voici, toutes livrées et testées :

---

## 1️⃣ Encyclopédie : plus de 500 articles ✅

L'encyclopédie passe de 264 notions à **504 articles** — le cap des 500 est dépassé :

| Source | Articles |
|---|---|
| Thématiques de base (24 × 5) | 120 |
| Vague 1 (v13, `encyclopediaData.ts`) | 144 |
| **Vague 2 (`encyclopediaData2.ts`)** | **120** |
| **Vague 3 (`encyclopediaData3.ts`)** | **120** |
| **TOTAL** | **504** |

- Chaque vague couvre **les 24 thématiques** (5 nouveaux articles par thème).
- Chaque article suit le même format : **définition simple + explication détaillée + exemples + mots-clés**.
- **Zéro doublon** : la fusion dans l'écran déduplique par terme, et l'audit vérifie qu'il n'y a aucun doublon entre les 3 vagues ni au sein d'une thématique.
- Le compteur sur l'écran d'accueil de l'encyclopédie affiche désormais le **vrai total** (« Plus de 504 articles… »).

Exemples de la vague 2 : **aéronautique** (Technologie), **riziculture** (Agriculture), **déforestation** (Environnement), **électricité statique** (Sciences)…
Exemples de la vague 3 : **calligraphie** (Arts), **narration** (Littérature), **mousson** (Géographie), **hygiène alimentaire** (Médecine)…

## 2️⃣ Quiz par thématique ✅

Chaque thématique a maintenant son **bouton « 🎓 Quiz »** (à côté du bouton Imprimer) :

- **5 questions** générées **depuis les articles du thème actif** : la définition d'un article → choisir le bon terme parmi **4 options** (dont les termes d'autres articles du même thème).
- Génération **déterministe et 100 % hors-ligne** (graine par thème + nouveau tirage à chaque tentative) — même moteur que le quiz « Devine le mot » du dictionnaire, éprouvé.
- **Score /5**, **meilleur score mémorisé par thématique** (affiché en fin de quiz), **message de félicitations adapté**, bouton **Rejouer**.
- **Lecture vocale** de la définition et de l'exemple sur chaque question (pour les petits lecteurs).
- Le quiz utilise **toutes les entrées du thème** : articles de base + 3 vagues + notions personnalisées ajoutées par l'enseignant.

## 3️⃣ Article du jour ✅

- **Bannière « ⭐ Article du jour »** en haut de l'encyclopédie : un article **vedette de toute l'encyclopédie** (504 articles), choisi de façon **stable par date locale** — chaque jour un article différent, identique pour toute la classe ce jour-là, et **hors-ligne**.
- Boutons **« Lire l'article »** (ouvre la fiche complète) et **🔊 Écouter** (lecture vocale).
- La **notion du jour par thématique** (déjà en place en v13) est conservée sous chaque thème.

---

## Tests (section 27 de `tests/audit.ts`)

- ✅ Vagues 2 et 3 : 24 thèmes couverts chacune, ≥ 100 articles chacune, tous les champs complets
- ✅ **504 articles au total** (≥ 500 attendus), 0 doublon inter-vagues
- ✅ Vagues importées et fusionnées dans l'écran + compteur affiché
- ✅ Quiz : 5 questions, 4 options distinctes dont la bonne (= terme de l'entrée), feedback par score
- ✅ Quiz branché (bouton + modale) + meilleur score par thématique
- ✅ Article du jour : sélection quotidienne stable, change au fil des jours, bannière branchée
- ➕ Les **328 tests précédents passent toujours** → **349/349**

## Fichiers créés / modifiés (v14)

| Fichier | Rôle |
|---|---|
| `src/utils/encyclopediaData2.ts` | **+ 120 articles originaux (24 thèmes)** |
| `src/utils/encyclopediaData3.ts` | **+ 120 articles originaux (24 thèmes)** |
| `src/components/KnowledgeHubScreen.tsx` | fusion des 3 vagues, **bouton Quiz**, **modale de quiz**, **article du jour global**, compteur 504 |
| `src/utils/kidsQuiz.ts` | meilleur score **par clé/thématique** (rétro-compatible) |
| `tests/audit.ts` | **+ section 27** (21 nouveaux tests) |
| `public/sw.js` | cache → **v17** |

---

*Contenus originaux rédigés pour l'application sur la structure des 9 domaines d'Encarta — les textes d'Encarta (protégés) ne sont pas reproduits. Dictionnaire Junior inchangé : 78 mots (24 + 54), 8 familles.*
