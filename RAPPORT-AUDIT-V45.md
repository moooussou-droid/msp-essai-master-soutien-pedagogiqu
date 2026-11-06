# Rapport v45 — Simulateur de prélèvement / cantine

Correction du sous-module **Super MSP Simulateur cantine** d'après votre cahier des charges tiré du fichier « SIMULATEUR D'ARRONDI ».

## 1. Ce qui existait déjà (conservé, non refait)

Votre cahier des charges décrit une architecture que le module possédait déjà depuis la v40 :

| Demandé | État |
|---|---|
| Moteur de calcul séparé de l'interface | Déjà en place (`canteenCalc.ts`) |
| Cinq blocs journaliers conservés dans le modèle | Déjà en place |
| Effectif hebdomadaire ≠ effectifs journaliers | Déjà en place |
| Jour non ouvrable exclu des cumuls | Déjà en place |
| Six écrans, historique, stockage, PDF, Excel | Déjà en place |
| Reliquat négatif jamais masqué | Déjà en place |

Je n'ai donc rien reconstruit : j'ai corrigé ce qui divergeait réellement.

## 2. Changement de règle d'arrondi (votre arbitrage)

Le module arrondissait au multiple **supérieur**. Votre fichier utilise **MROUND** (multiple le **plus proche**). Vous avez tranché : le fichier fait foi.

Nouvelle fonction `roundToMultiple()`. Écart sur 310 élèves :

| Denrée | Avant (plafond) | Maintenant (MROUND) |
|---|---:|---:|
| Haricot | 47,50 kg | **46,25 kg** |
| Huile | 16,25 L | **15,00 L** |
| Sel | 5,00 kg | **4,50 kg** |

**À savoir** : MROUND peut arrondir vers le bas (9,30 → 9,25). La ration peut donc être très légèrement inférieure au besoin théorique — c'est le comportement de votre fichier, reproduit tel quel et documenté dans le code.

## 3. Journée sans légumineuse (votre demande)

L'option « Aucune » n'existait qu'en mode « changement de légumineuse ». En mode normal, impossible de déclarer un jour sans légumineuse. Ajout d'une case **« Pas de légumineuse ce jour »** sur chaque journée, sans avoir à modifier le paramétrage de la semaine.

## 4. Deux bugs réels trouvés en testant

### a) Le reliquat de légumineuse était toujours nul

La **prévision** de légumineuse était recalculée à partir des effectifs **réellement servis** chaque jour. Le prévu devenait donc toujours égal au réel : **le reliquat affichait invariablement 0**, impossible de savoir ce qu'il restait en magasin.

Or vos §7, §8 et §29 sont clairs : la prévision se calcule sur l'**effectif hebdomadaire** et les **jours ouvrables**. Corrigé. Sur le jeu de référence, le reliquat affiche désormais **3 kg** (et 11,25 kg si une journée se passe de légumineuse). La ventilation par légumineuse en cas de changement en cours de semaine (règle v41) est conservée, au prorata des jours.

### b) La case « Pas de légumineuse » se décochait toute seule

Une règle v42 réimposait la légumineuse de la semaine à toutes les journées. Elle confondait « légumineuse différente » et « pas de légumineuse ». Corrigé : l'absence est désormais respectée.

## 5. Conformité au jeu de référence (§41)

Effectif 310 · 5 jours · 0 sortie de maïs · haricot · effectifs 279/291/295/290/291 · riz tous les jours.

| Contrôle | Attendu | Obtenu |
|---|---:|---:|
| Riz prévu | 232,50 kg | **232,50** |
| Haricot prévu | 46,25 kg | **46,25** |
| Huile / Sel prévus | 15 L / 4,50 kg | **15 / 4,50** |
| Jour 1 (279) | 41,75 kg | **41,75** |
| Jour 3 (295) | 44,25 kg | **44,25** |
| Plats servis | 1446 | **1446** |
| Riz sorti / reliquat | 217 / 15,50 | **217 / 15,50** |
| Légumineuse sortie / reliquat | 43,25 / 3 | **43,25 / 3** |

## 6. Vérifications

| Suite | Résultat |
|---|---|
| Audit métier (+36 contrôles cantine v45) | **1364 / 1364** |
| E2E cantine v45 (interface réelle) | **25 / 25** |
| E2E v36 · v40 · v41 · v42 · v43 · v44 | **47 · 45 · 47 · 57 · 36 · 31**, 0 échec |
| `tsc --noEmit` | 0 erreur |

Les tests pilotent l'écran réel : saisie des paramètres, des cinq journées, lecture du point hebdo, **puis ouverture du PDF et du classeur Excel produits** pour vérifier que les chiffres corrigés y figurent bien.

## 7. Points non appliqués volontairement

- **Renommage en « SIMULATEUR DE PRÉLÈVEMENT / CANTINE »** : vous avez demandé de conserver « Super MSP Simulateur cantine » (nom fixé en v40).
- **§17 (légumineuse journalière générique)** : vous avez demandé de garder le comportement v41 (la quantité suit la légumineuse réellement servie), enrichi de l'option « Aucune ».
- **`COUNTA(F10=1)`** : cette formule Excel renvoie toujours vrai ; la correction en comparaison explicite, faite en v40, est maintenue et documentée.

## 8. Déploiement

**`DEPLOIEMENT-V45-SITE.zip`** (11,1 Mo) — `index.html` **à la racine**, vérifié.
À déposer sur https://app.netlify.com/drop **à la même adresse** que les versions précédentes.

Source : `master-soutien-pedagogique-v45.zip`. Cache hors ligne : `master-soutien-v45`.

### Fichiers modifiés

- `src/utils/canteenCalc.ts` — `roundToMultiple()` (MROUND), `rationForService()`, `planLegumesFromDays()`, `explainRoundingDifference()`
- `src/utils/canteenStore.ts` — respect de « Aucune », prévision sur l'effectif hebdomadaire
- `src/components/CanteenSimulatorScreen.tsx` — case « Pas de légumineuse ce jour »
- `tests/audit.ts` — section 54 (36 contrôles)
- `tests/e2e-v44-cantine.mjs` — nouvelle suite (25 contrôles)
- `public/sw.js` — cache v45
