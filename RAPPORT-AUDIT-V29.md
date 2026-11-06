# RAPPORT D'AUDIT — Master Soutien Pédagogique · V29

**Date :** 07/09/2026 — **Version livrée :** v29 (après v26, v27, v28)
**Audit :** `tests/audit.ts` → **600 réussis / 0 échec** — TypeScript `tsc --noEmit` : **0 erreur** — Build Vite + postbuild : **OK** (`dist/` + `deploy/`).

---

## 1. Ce qui a été livré

### v27 — Type d'évaluation au bas du bulletin (maternelle / primaire)
- Le type d'évaluation saisi **librement** par l'enseignant (v26) apparaît désormais **en bas du bulletin**, sous les résultats du trimestre et **avant les signatures** :
  - **Panneau** (`BulletinsScreen.tsx`) : ligne « Type d'évaluation : … — … » dans le pied de page du bulletin (réservée au préscolaire / primaire, absente du bulletin secondaire).
  - **Export Word** (`bulletinExport.ts`) : ligne « Type d'évaluation : X (Trimestre Y) » insérée entre l'appréciation et le bloc SIGNATURES.

### v28 — Accès SIMPLE : code à 6 chiffres, 100 % hors-ligne
- **Fin du bug « code non reconnu par le serveur »** : l'activation ne fait plus **aucun appel serveur** (plus de `licenseServer` / `verifyLicenseOnline` dans l'écran d'accès).
- **Nouveau système de codes** (`simpleCode.ts`) :
  - Code utilisateur = **6 chiffres** (ex. `783 423`), validé **localement** par l'algorithme de **Luhn** ; nom **facultatif** ; fonctionne sur tous les appareils, même sans connexion.
  - **Code maître** administrateur (6 chiffres) enregistré localement, également validé par Luhn / accepté par l'écran d'accès pour l'équipe.
  - Bouton admin **« Générer 5 codes »** (codes simples distincts, affichés formatés `783 423`, copiables et **envoyables par WhatsApp**).
  - Saisie au clavier numérique : `inputMode="numeric"`, espace automatique (`783 423`), maximum 7 caractères.
  - Compatibilité : les anciens codes personnels (16 caractères hexa liés au nom) restent acceptés.

### v29 — Chrono d'expiration du code d'accès : 1 AN (admin + utilisateur)
- **Durée de validité : 1 an (365 jours)** — `CODE_VALIDITY_DAYS = 365`.
- **Côté utilisateur :**
  - Écran d'accès : mention « ⏳ Chrono d'expiration : ce code d'accès est valable 1 an (365 jours)… » avant activation.
  - **Mon espace** : carte « Abonnement — code d'accès (valable 1 an) » avec **date d'expiration (JJ/MM/AAAA)**, **jours restants**, barre de progression du temps écoulé, et alerte rouge si expiré.
  - À l'activation, l'expiration est calculée (**début + 1 an**) ; les utilisateurs activés avant le chrono reçoivent automatiquement leur date d'expiration (reprise).
- **Côté administrateur :**
  - **Code maître** : date de création, date d'expiration, jours restants ; le chrono **repart à 1 an** quand le code est réenregistré.
  - **Chaque code généré** : badge « ⏳ Validité 1 an — expire le JJ/MM/AAAA • X jours restants » + bouton **« Prolonger d'1 an »** (repousse l'expiration de 365 jours).
  - Le **message WhatsApp** envoyé au titulaire mentionne la date d'expiration et la procédure de renouvellement.

---

## 2. Résultats d'audit détaillés

| Vérification | Résultat |
|---|---|
| Suite complète `tests/audit.ts` (§1 → §38) | **600 ✅ / 0 ❌** |
| v27 — type d'évaluation dans l'export Word (avant SIGNATURES) | ✅ |
| v27 — type d'évaluation dans le panneau (pied de page, primaire seulement) | ✅ |
| v28 — AccessGate sans serveur, validation locale `isAccessCode` | ✅ |
| v28 — Luhn : `123456` rejeté, `783423` accepté, 5 codes distincts générés | ✅ |
| v28 — Admin : générateur complexe supprimé, « Générer 5 codes », WhatsApp | ✅ |
| v29 — `expiresAtFrom` = +365 j, `daysRemaining`, `formatDateFr` JJ/MM/AAAA | ✅ |
| v29 — reprise des anciennes activations + réinitialisation du chrono maître | ✅ |
| v29 — mention du chrono chez l'utilisateur (accès + Mon espace) | ✅ |
| v29 — mention du chrono chez l'admin (maître + codes générés + WhatsApp) | ✅ |
| PWA — nom de cache `master-soutien-v29` | ✅ |
| TypeScript `tsc --noEmit` | **0 erreur** |
| Build production (vite + postbuild → `dist/` + `deploy/`, `404.html`, `_redirects`, anti-cache sw) | ✅ |

---

## 3. Guide rapide (nouveau système d'accès)

**Pour l'administrateur** (onglet **Accès** du tableau de bord admin) :
1. **Code maître** : 6 chiffres de votre choix (ex. `123 456`) → « Enregistrer » (chrono 1 an).
2. **Générer 5 codes** : crée 5 codes simples « 6 chiffres » immédiatement utilisables.
3. Pour chaque code : date d'expiration + jours restants affichés, boutons **WhatsApp** (envoi du code et de la date), **Copier**, **Prolonger d'1 an**, **Retirer**.

**Pour l'utilisateur** :
- Tape les **6 chiffres** reçus (clavier numérique, espace automatique) → **Activer mon accès**. Nom facultatif.
- Validité **1 an** ; date d'expiration + jours restants visibles dans **Mon espace**.
- À l'échéance : contacter un administrateur pour un nouveau code (ou prolongement).

---

## 4. Déploiement

`npm run deploy:verify <lien>` après publication ; contenu de `deploy/` à déposer sur Netlify Drop / Vercel (`404.html` + `_redirects` + anti-cache du service worker inclus).
