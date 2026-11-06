# RAPPORT D'AUDIT — Master Soutien Pédagogique v34

**Date :** 12 septembre 2026 · **Cache PWA :** `master-soutien-v34`

## Résultats de validation

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit fonctionnel (`tests/audit.ts`) | **755 réussis / 0 échoué** (+42 tests v34) |
| Test de fumée (`tests/smoke.ts`) | **59 / 0** |
| Parcours E2E (`tests/e2e.mjs`) | **24 / 0** |
| Parcours E2E v34 (`tests/e2e-v34.mjs`) | **5 / 0** — Retour réel + cours modifiés |
| Build de production | **OK** — `deploy/` 3 830 Ko |

---

## 1. CORRIGÉ — Bouton Retour (cas de la capture « CE1 · EPP NIMBO »)

**Cause réelle du défaut :** les écrans utilisaient `navigate(-1)`, qui dépend de
l'historique du **navigateur**. Quand cet historique est vide ou extérieur à
l'application — page rechargée, application installée sur le téléphone (PWA),
arrivée par un lien, retour après activation/mise à niveau — `-1` faisait sortir
de la page courante et l'utilisateur retombait sur **l'écran d'accueil**.

**Correction (`src/utils/useSmartBack.ts`) :** l'application tient désormais sa
**propre pile de navigation** (pages réellement visitées) :

1. s'il existe une page précédente **dans l'application** → on y retourne ;
2. sinon → on remonte d'**un niveau logique** :
   `/class/ID/presences` → `/class/ID` → `/` (jamais de saut direct à l'accueil,
   jamais de sortie de l'application).

**33 fichiers** migrés (`navigate(-1)` → `goBack()`), plus aucun appel brut.

Vérifié en conditions réelles :
- Présences → Retour → **tableau de bord de la classe** ✅
- Classe → Retour → accueil ✅
- **Ouverture directe d'une sous-page sans aucun historique** → Retour → **la classe**, pas l'accueil ✅

## 2. CORRIGÉ — Modification des cours en ligne (les anciennes données revenaient)

**Cause réelle :** les cours du **programme intégré** sont générés par le code.
En enregistrant une modification, l'éditeur créait une **copie avec un nouvel
identifiant** (`…-custom-<horodatage>`) au lieu de remplacer l'original :
l'écran « Cours en ligne » continuait donc d'afficher **l'ancienne version**.

**Correction :** système de **surcharge (override)** conservant **l'identifiant
d'origine** —
`saveCourseOverride()` / `applyCourseOverrides()` / `mergeCourses()`.
- Chaque modification de leçon (titre, contenu, image, vidéo) est **immédiatement
  effective** et **durable** après rechargement.
- Plus de doublon ancien/nouveau dans la liste.
- Nouveau bouton **« Rétablir la version d'origine »** dans l'éditeur.
- Les cours personnalisés sont mis à jour sur place (même identifiant).

## 3. NOUVEAU — Installation sur iPhone / iPad

L'application est désormais **installable sur iPhone** et s'ouvre en plein écran,
comme une application native, avec fonctionnement **hors connexion** :

- `apple-mobile-web-app-capable`, `mobile-web-app-capable`, titre d'application ;
- **`viewport-fit=cover`** + marges de sécurité CSS (`safe-area-inset`) : l'encoche
  et la barre d'accueil de l'iPhone ne masquent plus l'interface ;
- icônes Apple **180×180, 167×167, 152×152** + image de démarrage ;
- manifest : `display: standalone` + `display_override`, rotation autorisée (iPad) ;
- **guide d'installation intégré** (`InstallPrompt`) : sur iPhone/iPad, l'application
  détecte iOS (y compris iPadOS moderne) et affiche la marche à suivre —
  **Partager → « Sur l'écran d'accueil » → « Ajouter »**.
  Sur Android, le bouton d'installation natif est conservé.

**Pour l'utilisateur iPhone :** ouvrir le lien du site **dans Safari**, toucher
**Partager**, puis **« Sur l'écran d'accueil »**. (iOS n'autorise pas l'installation
automatique : c'est la procédure officielle Apple pour toute application web.)

## 4. MODIFIÉ — Code d'accès global de l'application

Nouveau code administrateur unique :

```
MSP-Catalyste@@007-2026
```

Appliqué partout (`src/utils/adminConfig.ts`) : Espace Administrateur, générateur de
codes, enrôlement élèves **et personnel**, encyclopédie, dictionnaire, documents de
classe, fichiers de ressources. **L'ancien code n'est plus accepté.**

---

## Compatibilité

- Aucune donnée utilisateur perdue : classes, notes, présences, enrôlements et
  abonnements sont conservés.
- Cache PWA `master-soutien-v34` : l'ancienne version est purgée et remplacée
  automatiquement à la première ouverture.
- Redéployer sur **la même adresse** conserve les données des utilisateurs.
