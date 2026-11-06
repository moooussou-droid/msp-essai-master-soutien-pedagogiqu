# RAPPORT D'AUDIT — Master Soutien Pédagogique · V30

**Date :** 07/09/2026 — **Version livrée :** v30
**Audit :** `tests/audit.ts` → **620 réussis / 0 échec** — TypeScript `tsc --noEmit` : **0 erreur** — Build Vite + postbuild : **OK** (`dist/` + `deploy/`).

---

## 1. Corrections demandées (v30)

### a) Le code GÉNÉRAL de l'application n'est PAS modifié
- Le « code maître » (6 chiffres) introduit par erreur en v28/v29 a été **entièrement retiré** (module `simpleCode.ts`, onglet Accès, écran d'accès).
- Le **code général reste le mot de passe administrateur d'origine** (`adminConfig.ts`, inchangé) : c'est la clé de l'**administrateur principal** pour l'Espace Administrateur.
- **Côté client, seul le code passe à 6 chiffres** — et l'utilisateur **envoie toujours son nom complet** : le champ « Nom complet » est de nouveau **obligatoire** à l'activation (refus si vide), et l'administrateur doit aussi renseigner le nom complet du client avant de générer ses 5 codes.

### b) Code personnel pour chaque administrateur (généré par l'administrateur principal)
- Dans l'onglet **Équipe** (réservé à l'administrateur principal), chaque membre de l'équipe dispose d'un bouton :
  - **« 🔑 Générer le code d'accès personnel »** → code à **6 chiffres** (validé Luhn), **valable 1 an** (date d'expiration + jours restants affichés) ;
  - puis **Envoyer (WhatsApp)** — le message contient le code, le **rôle**, les **fonctions** de l'administrateur et la date d'expiration —, **↻ Régénérer** et **Copier**.
- **Connexion** (Espace Administrateur) : un membre entre **son code personnel** (6 chiffres) et accède à ses fonctions d'administrateur **sans le code général**. L'administrateur principal, lui, garde le code général.
- La session retient **quel** administrateur est connecté (nom + rôle affichés en haut).

### c) Chaque administrateur ne voit que SES fonctions
- Nouvelle table `TAB_ACCESS` (rôle → onglets) : **Équipe, Accès (codes clients), Orientation, Gouvernance = administrateur principal uniquement** ; **Ressources = tous les administrateurs** ; **Cours = principal + Responsable Ressources**.
- Barre d'onglets filtrée + **garde d'accès sur chaque onglet** (défense en profondeur).
- **Sécurité** : si un membre est retiré ou suspendu, sa session est fermée automatiquement.

### d) Ce qui reste des versions précédentes
- **v27** : type d'évaluation en bas du bulletin maternelle/primaire (panneau + Word). ✅
- **v28** : codes clients **6 chiffres**, validation 100 % hors-ligne (Luhn), **aucun appel serveur**. ✅
- **v29** : **chrono d'expiration 1 an** — côté utilisateur (écran d'accès + carte « Abonnement » de Mon espace) et côté administrateur (chaque code client et chaque code administrateur : « expire le JJ/MM/AAAA — X jours restants », boutons **« Prolonger d'1 an »**). ✅

---

## 2. Parcours types

**Enseignant (client)**
1. Écran d'accès → saisit **son nom complet** (obligatoire) + **code à 6 chiffres** reçu de l'administrateur (ex. `783 423`, clavier numérique, espace automatique).
2. Entrée immédiate, sans serveur. « Mon espace » affiche : **« Abonnement actif jusqu'au JJ/MM/AAAA — X jours restants »**.

**Administrateur principal**
1. Espace Administrateur → **code général** (mot de passe administrateur, inchangé).
2. Onglet **Accès** : nom complet du client → **« Générer 5 codes »** (6 chiffres, valables 1 an) → envoi WhatsApp (code + expiration) / **« Prolonger d'1 an »**.
3. Onglet **Équipe** : **« Générer le code d'accès personnel »** de chaque administrateur → envoi WhatsApp.

**Autre administrateur**
- Espace Administrateur → **son code personnel 6 chiffres** (reçu par WhatsApp) → il entre **sans le code général** et ne voit que **ses onglets** (ex. Ressources, ou Ressources + Cours).

---

## 3. Résultats

| Vérification | Résultat |
|---|---|
| Suite complète `tests/audit.ts` (§1 → §39) | **620 ✅ / 0 ❌** |
| §39 — adminConfig (code général) inchangé, aucun « code maître » | ✅ |
| §39 — nom complet obligatoire (client) à l'activation | ✅ |
| §39 — code personnel 6 chiffres par administrateur + envoi WhatsApp | ✅ |
| §39 — login par code personnel (sans code général) + session identifiée | ✅ |
| §39 — filtrage des onglets par rôle + gardes + fermeture de session | ✅ |
| §37/§38 — 6 chiffres Luhn, zéro serveur, chronos 1 an client/admin | ✅ |
| PWA — cache `master-soutien-v30` | ✅ |
| TypeScript `tsc --noEmit` / Build production | **0 erreur** / ✅ |

---

## 4. Déploiement
Contenu de `deploy/` (avec `404.html`, `_redirects`, anti-cache du service worker) à déposer sur Netlify Drop / Vercel ; `npm run deploy:verify <lien>` après publication.
