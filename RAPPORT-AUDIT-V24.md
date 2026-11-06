# 📋 Rapport de correctifs — v24 (« L'application ne marche pas toujours sur Vercel et Netlify »)

**Date :** 4 septembre 2026
**Audit automatique :** ✅ **524 tests réussis / 0 échec** (TypeScript : 0 erreur, build + postbuild : OK)

## Ce qui se passait vraiment

| Symptôme | Cause racine | Correctif |
|---|---|---|
| **Vercel « 404: NOT_FOUND »** | Le ZIP ou le dossier **source** était déposé (pas d'`index.html` à la racine de ce qui est déposé) | `dist/404.html` créé au build : **toute route inconnue affiche l'application**, même si les rewrites ne sont pas appliqués |
| **Netlify : page vide** | Le `index.html` **source** (qui référence `/src/main.tsx`) était déposé → script introuvable, page blanche | **Garde-fou** dans ce fichier : si l'application n'a pas démarré en 3 s, un message clair s'affiche avec la solution (déposer le contenu de `deploy/`) |
| **Ancienne version qui traîne** | `sw.js` mis en cache par le CDN de Vercel/Netlify | En-têtes **`Cache-Control: no-cache`** pour `sw.js`, `manifest.json`, `index.html` (vercel.json + `_headers` Netlify + netlify.toml) |
| **« Ça a marché une fois, plus la fois d'après »** | Le lien changeait à chaque dépôt (Netlify Drop sans compte) | Guide : mise à jour **sans changer de lien** (Netlify « Deploys » / Vercel « Upload ») |

## Ce qui est nouveau

1. **📦 Dossier `deploy/` dans le ZIP — publication zéro commande.**
   L'application y est **déjà construite** (+ `COMMENT-DEPLOYER.txt`) : dézipper →
   ouvrir `deploy/` → glisser son **contenu** sur app.netlify.com/drop ou
   vercel.com/new. Plus besoin de `npm`.
2. **🛟 `dist/404.html`** : le filet de sécurité Vercel (routes inconnues →
   application), généré automatiquement après chaque build.
3. **🚦 `npm run deploy:verify <votre-lien>`** : vérifie le site publié
   (accueil, sw.js, manifest, 404.html) et dit **exactement** quoi corriger
   (ex. « vous avez déposé le dossier source »).
4. **🧯 Garde-fou anti-page-blanche** : déposer le dossier source n'affiche
   plus une page vide, mais un message d'aide.
5. **🚫 Anti-cache** du service worker et du manifest sur les deux plateformes :
   les mises à jour arrivent désormais aux utilisateurs installés.
6. **Guide réécrit** : méthode 0 (deploy/), méthode 1 (deploy:check), tableau
   de dépannage enrichi (404 Vercel, Page not found Netlify, page vide,
   ancienne version, lien qui change), mise à jour sans changer de lien.

## Vérifications

- Vérificateur de lien **testé en conditions réelles** (serveur statique
  servant `dist/`) : **4/4 ✅** (accueil, sw.js, manifest, 404.html)
- `npm run build` → `dist/404.html` + `deploy/` générés et vérifiés ✅
- Audit : **524/0** (21 nouveaux tests §34) · TypeScript 0 erreur
