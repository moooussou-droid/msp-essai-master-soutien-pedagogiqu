# RAPPORT D'AUDIT — Master Soutien Pédagogique · V31

**Date :** 07/09/2026 — **Version livrée :** v31
**Audit :** `tests/audit.ts` → **649 réussis / 0 échec** — TypeScript `tsc --noEmit` : **0 erreur** — Build Vite + postbuild : **OK** (`dist/` + `deploy/`, PWA `master-soutien-v31`).

---

## 1. Tarification à deux formules (demande principale)

| Formule | Prix | Contenu du code | Accès |
|---|---|---|---|
| **Essentiel** | **999 FCFA / an** | 6 chiffres commençant par **`9`** | **Uniquement** : ① Enrôlement des élèves, ② Importation des notes |
| **Complet** | **1500 FCFA / an** | 6 chiffres commençant par **`1`** | **Toutes les fonctionnalités** de l'application |

**Comment ça marche (100 % hors-ligne, aucun serveur)**
- La formule est **portée par le premier chiffre du code** : « 9… » = Essentiel, « 1… » = Complet (toujours 6 chiffres, validés par Luhn, sans connexion).
- À l'activation, l'application **lit la formule dans le code** et la mémorise avec l'abonnement (1 an). Elle vérifie ensuite, **à chaque navigation**, que la fonction demandée est incluse.
- Les codes distribués **avant la tarification** restent valables et sont traités en **Complet** (aucun client n'est bloqué rétroactivement).

**Côté administrateur (onglet Accès)**
- Sélecteur de formule **Essentiel (999 FCFA/an)** / **Complet (1500 FCFA/an)** avant de « **Générer 5 codes** » (l'administrateur tape le nom complet du client).
- Chaque code généré affiche : titulaire, code `9xx xxx` (ou `1xx xxx`), **badge de formule**, **expiration (1 an) + jours restants**, boutons **WhatsApp** (message avec formule et expiration), **Copier**, **Prolonger d'1 an**, Retirer.

**Côté utilisateur**
- Écran d'accès : les **deux formules** sont présentées avant l'activation ; la formule est **détectée pendant la saisie** du code (« ✓ Formule détectée : COMPLET — 1500 FCFA/an… »).
- **Mon espace** : carte « Abonnement » avec **formule**, **date d'expiration**, **jours restants** et, pour les Essentiel, bouton **« Passer à la formule COMPLET — 1500 FCFA/an (WhatsApp) »**.
- **Verrouillage** : un Essentiel qui ouvre une fonction non incluse voit un écran clair « **Cette fonction fait partie de la formule COMPLET** » avec demande de mise à niveau par WhatsApp. Les tuiles bloquées du tableau de bord portent un **cadenas** (« Formule COMPLET (1500 FCFA/an) »).
- **Autorisés pour Essentiel** : accueil, Mon espace, enrôlement des élèves, création/édition de classe, écran Élèves (importation Excel des élèves **et des notes**), tableau de bord de classe (hub).

---

## 2. Génération du code du personnel (membres de l'équipe) — bien visible

- Onglet **Équipe** (administrateur principal) : bandeau explicatif + pour **chaque membre**, bouton
  **« 🔑 Générer le code d'accès personnel »** → code 6 chiffres **valable 1 an** (date + jours restants), puis **Envoyer (WhatsApp — avec rôle, fonctions et expiration)**, **↻ Régénérer**, **Copier**.
- Le membre se connecte à l'Espace Administrateur **avec son code personnel** (sans le code général) et n'aperçoit que **ses fonctions** (onglets filtrés par rôle + garde d'accès + fermeture de session s'il est retiré/suspendu).
- L'administrateur principal, lui, garde le **code général** (mot de passe administrateur), **inchangé**.

---

## 3. Rappel des fonctionnalités conservées (ré-appliquées après restauration)

- **v26** : type d'évaluation = champ libre au clavier.
- **v27** : type d'évaluation affiché **en bas du bulletin** maternelle/primaire (panneau + export Word), avant les signatures.
- **v28** : codes clients **6 chiffres** validés **hors-ligne** (Luhn), **aucun appel serveur**, nom complet obligatoire.
- **v29** : **chrono d'expiration 1 an** (écran d'accès, Mon espace, codes admin et clients).
- **v30** : code général intact + codes personnels des administrateurs (cette livraison).
- **v25** : Encyclopédie, Cultivons-nous (4 rubriques admin, auteur, gratuit/payant, compteur de visites).

---

## 4. Résultats

| Vérification | Résultat |
|---|---|
| Suite complète §1 → §40 | **649 ✅ / 0 ❌** |
| §40 — tarifs 999/1500, plan dans le code, accès par formule | ✅ |
| §40 — verrouillage des routes, cadenas, écran de mise à niveau | ✅ |
| §40 — option de génération du code du personnel | ✅ |
| §39 — code général inchangé, login par code personnel, rôles | ✅ |
| §38 — chrono 1 an côté utilisateur et administrateur | ✅ |
| §37 — 6 chiffres Luhn, zéro serveur, nom complet obligatoire | ✅ |
| §36/§27 — type d'évaluation en bas du bulletin | ✅ |
| PWA − cache `master-soutien-v31` | ✅ |
| TypeScript `tsc --noEmit` / Build production | **0 erreur** / ✅ |

---

## 5. Guide rapide — administrateur

1. **Onglet Accès** : choisissez la formule (999 ou 1500) → nom complet du client → **Générer 5 codes** → **WhatsApp** (le message annonce la formule et l'expiration).
2. **Onglet Équipe** : **Générer le code d'accès personnel** de chaque membre → **Envoyer** par WhatsApp.
3. Le membre entre son code 6 chiffres sur « Espace Administrateur » → il voit ses fonctions.

**Déploiement :** contenu de `deploy/` sur Netlify Drop / Vercel ; `npm run deploy:verify <lien>` après publication.
