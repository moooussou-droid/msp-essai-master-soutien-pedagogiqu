# Rapport d'audit — Version 37
## Assistant pédagogique IA conversationnel (hors-ligne)

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit fonctionnel | **907 réussis / 0 échoué** (+43) |
| Test de fumée | **63 / 0** |
| E2E général | **28 / 0** |
| E2E v34 | **5 / 0** |
| E2E v35 | **12 / 0** |
| E2E v36 | **47 / 0** |
| **E2E v37 (nouveau)** | **41 / 0** |
| Build de production | OK — `deploy/` 3 981 Ko |
| Cache PWA | `master-soutien-v37` |

---

## 1. Demande de l'utilisateur

> « Mon générateur de fiches IA et autres volets IA de l'application doivent agir comme si
> l'utilisateur était exactement sur les applications Claude Anthropic, Copilot, ChatGPT ou
> Gemini, de telle sorte que l'IA soit interactive et pose des questions pour mieux répondre
> aux attentes de l'utilisateur. Je veux surtout que l'utilisateur puisse obtenir de meilleures
> fiches pédagogiques à partir de cette application. »

**Cadrage retenu** (choix de l'utilisateur) : fonctionnement **100 % local, hors-ligne, sans
aucune clé API**. L'expérience conversationnelle doit donc être produite par l'application
elle-même, et non déléguée à un service distant.

---

## 2. Ce qui a été construit

### 2.1 Moteur d'entretien — `src/utils/aiInterview.ts` (nouveau)

Reproduit le comportement d'un assistant conversationnel :

- **16 questions** posées **une par une**, jamais toutes en même temps ;
- **réaction systématique** à chaque réponse (`acknowledge`) : l'assistant reformule,
  commente et annonce ce qu'il va en faire ;
- **questions adaptatives** : la formulation reprend les réponses précédentes
  (« Quelle matière enseignez-vous en **CE1** ? », « … la leçon en **Mathématiques** ? ») ;
- **questions conditionnelles** déclenchées par le contexte :

| Condition | Question supplémentaire |
|---|---|
| Maternelle / CI / CP | Appui principal : jeu, comptine, images ou langage oral |
| Matière scientifique | Une manipulation ou une expérience est-elle possible ? |
| Matière de langue | Quel support : manuel, texte rédigé, image, conte ? |
| Production = exercices | Combien d'exercices et pour quel usage ? |
| Production = cours en ligne | Comment les apprenants y accéderont-ils ? |

- **réponses rapides** proposées sous forme de puces, **saisie libre toujours possible** ;
- **questions facultatives** avec bouton « Passer » ;
- **barre de progression** calculée dynamiquement (le total varie selon le profil).

### 2.2 Enrichissement de la fiche — `src/utils/lessonEnrichment.ts` (nouveau)

C'est la couche qui répond à l'exigence centrale : **de meilleures fiches**. Chaque réponse
modifie réellement le document produit.

| Réponse de l'enseignant | Effet concret sur la fiche |
|---|---|
| Ancrage local | **Situation de départ** entièrement réécrite (marché, champ, récréation, maison, route, santé) |
| Prérequis | **Rappel de début de séance** calibré (découverte / réactivation / cas difficiles) |
| Effectif | **Organisation de la classe** : taille des groupes, rapporteur, usage des ardoises |
| Difficulté principale | **Remédiation ciblée** sur cet obstacle précis (8 scénarios distincts) |
| Différenciation | Soutien, approfondissement, accessibilité explicités |
| Matériel disponible | La fiche n'exige **que** le matériel réellement possédé |
| Modalité d'évaluation | Barème et dispositif conformes au choix |
| Exigence particulière | Reportée telle quelle dans le déroulement |

Mesure vérifiée par l'audit : la fiche enrichie est **plus de 1,5 fois plus développée** que
la fiche brute, et dépasse 2 500 caractères en E2E.

### 2.3 Écran de conversation — `src/components/AIAssistantChatScreen.tsx` (nouveau)

Interface de discussion : bulles enseignant / assistant, indicateur de saisie animé,
défilement automatique, barre de progression, **récapitulatif final avec bouton « modifier »
sur chaque réponse**, puis rédaction. Le document produit est **modifiable rubrique par
rubrique**, enregistrable dans « Mes fiches », imprimable et exportable en Word.

Le bouton Retour utilise le **retour intelligent** (`useSmartBack`), conformément à
l'exigence permanente : jamais de renvoi forcé à l'accueil.

### 2.4 Autres volets IA — `src/utils/aiConceptExplainer.ts` (amélioré)

L'explication de notion des cours en ligne était générique. Elle est désormais construite
selon **le niveau** (maternelle-CE1 / CE2-5ᵉ / au-delà — ton et exigences différents) et
**la discipline** (mathématiques, français, sciences, histoire-géo/ECM), avec : à quoi ça
sert, ce qu'il faut retenir, exemples proches du vécu, **l'erreur fréquente à éviter**, et
deux exercices de vérification.

### 2.5 Câblage

- Route `/assistant-ia` enregistrée dans `App.tsx`.
- Nouveau sous-module **« Assistant pédagogique IA (conversation) »** dans
  *Préparation de classe* (qui passe de 4 à 5 sous-modules, total 11).
- Bandeau vert **« Mode conversation (recommandé) »** en tête du générateur classique.

---

## 3. Vérifications spécifiques

- **Aucun appel réseau** dans l'assistant : vérifié par l'audit (`fetch` absent du composant).
- **Fonctionne sans clé API** : le moteur local est seul sollicité.
- **Deux contextes différents produisent deux fiches différentes** : vérifié pour l'ancrage
  local, l'obstacle et l'effectif.
- **Non-régression** : les 92 tests E2E des versions 34 à 36 repassent intégralement.

---

## 4. Livrables

| Fichier | Taille | Contenu |
|---|---|---|
| `DEPLOIEMENT-V37-SITE.zip` | 10 469 059 o | 14 fichiers, `index.html` à la racine |
| `master-soutien-pedagogique-v37.zip` | 8 857 994 o | 176 entrées — **0 fichier perdu** vs v36 |
| `app/RAPPORT-AUDIT-V37.md` | — | Le présent rapport |

Déploiement : déposer le contenu sur <https://app.netlify.com/drop>, **même projet** que la
version précédente pour conserver les données.
