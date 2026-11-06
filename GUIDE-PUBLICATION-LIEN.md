# 🔗 Master Soutien Pédagogique — Publier l'application (v24)

Deux façons, **les deux fonctionnent** :
- **Sans aucune commande** → le dossier **`deploy/`** inclus dans le ZIP
  (l'application y est déjà construite, prête à déposer) ;
- **Avec commande** → `npm run deploy:check` qui prépare `dist/` tout seul.

> ✅ **La règle d'or, dans les deux cas : déposez le CONTENU de `deploy/`
> (ou `dist/`) — les fichiers qui sont DEDANS. Ne glissez PAS le .zip,
> ne déposez PAS le dossier projet `app/`.**
> ⚠️ Sinon : **Vercel** affiche « 404: NOT_FOUND » et **Netlify** une page
> vide/broken (depuis la v24, l'application affiche elle-même un message
> d'avertissement dans ce cas).

---

## ⚡ Méthode 0 — Le dossier `deploy/` (LA PLUS SIMPLE, zéro commande)

1. Dézippez le livrable : le dossier **`deploy/`** contient **l'application
   complète, déjà construite** (+ `COMMENT-DEPLOYER.txt`).
2. **Netlify** : ouvrez **https://app.netlify.com/drop** → glissez le
   **contenu** de `deploy/` (les fichiers DEDANS le dossier).
   **Vercel** : ouvrez **https://vercel.com/new → Deploy** (ou
   vercel.com/drag-drop) → glissez le même contenu.
3. C'est en ligne en 30 secondes. Notez l'adresse : c'est votre lien.

## ⚡ Méthode 1 — La commande unique

```
npm install          (la première fois seulement)
npm run deploy:check
```

L'assistant : construit si besoin (équivalent manuel : `npm run build:lowmem`) →
vérifie `dist/` **et** `deploy/`, y compris que `index.html` charge bien
`./assets/main-…` et non `/src/main.tsx` → affiche les étapes.
Il crée aussi `dist/404.html` et le dossier `deploy/` (méthode 0).

## ✅ Vérifier que votre lien est sain (nouveau)

```
npm run deploy:verify https://mon-site.netlify.app
```

L'outil vérifie la page d'accueil, `sw.js`, `manifest.json` et le fallback
`404.html`, puis vous dit exactement quoi corriger si quelque chose cloche.

---

## ✅ Mettre à jour SANS changer de lien

| Plateforme | Comment re-publier au même endroit |
|---|---|
| **Netlify** | Sur votre site : onglet **Deploys** → glissez à nouveau le contenu de `deploy/` (re-construit). Le lien ne change pas. |
| **Vercel** | Sur votre projet : **Deployments → Upload** → même chose. Le lien ne change pas. |
| **Git (Vercel/Netlify)** | `git push` → reconstruction automatique. Vercel : Output Directory **`dist`**. Netlify : `npm run build` + publish `dist` (déjà configurés dans `netlify.toml`). |

> 💡 Sur Netlify Drop **sans compte**, chaque dépôt crée un **nouveau** lien
> aléatoire (les élèves perdent l'ancien). Créez un compte gratuit et
> **réclamez le site** (Site configuration → nom personnalisé) pour garder
> un lien stable.

---

## 🔧 Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| **Vercel « 404: NOT_FOUND »** | ZIP ou dossier source déposé (pas d'`index.html` à la racine) | Déposez le **contenu de `deploy/`** ; le `404.html` + `vercel.json` inclus garantissent l'affichage |
| **Netlify « Page not found »** | ZIP ou dossier source déposé | Déposez le **contenu de `deploy/`** (le `_redirects` inclus fait le reste) |
| **Netlify : page vide** | Dossier source déposé (le script `/src/main.tsx` n'existe pas) | Depuis la v24 un message d'avertissement s'affiche → déposez le contenu de `deploy/` |
| **Ancienne version affichée** | Service worker ou cache du CDN | Re-publiez ; les utilisateurs ont la nouvelle version au rechargement suivant (redémarrez l'app si besoin). `sw.js` est maintenant déclaré `no-cache` sur les deux plateformes |
| **Le lien change à chaque mise à jour** | Netlify Drop sans compte | Réclamez le site avec un compte gratuit, puis mettez à jour via **Deploys** |
| **Impossible de s'installer / pas de hors-ligne** | `sw.js` ou `manifest.json` absents | Vous avez déposé le dossier source ; déposez `deploy/`. Vérifiez avec `npm run deploy:verify` |
| **Les notes ne se déplacent pas d'un appareil à l'autre** | Stockage local par appareil (normal) | Module **Sauvegarde Cloud** (écran « Cloud ») pour transférer d'un appareil à l'autre |

---

### 📦 Contenu de `deploy/` (fichiers de publication)

`index.html` + `assets/` (JavaScript et CSS construits) · `404.html` (filet de
sécurité Vercel, routes inconnues → application) · `sw.js` (hors-ligne +
mises à jour) · `manifest.json` + icônes (installation téléphone) ·
`vercel.json` (routes & anti-cache Vercel) · `_redirects` + `_headers`
(routes & anti-cache Netlify) · `benin-flag.svg`, `cover.png` ·
`COMMENT-DEPLOYER.txt`.
