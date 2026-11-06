# Correctif de publication — message « Ce n’est pas l’application »

## Ce que signifie le message

Le message affiché est un **garde-fou de publication**, pas une erreur dans les
données de l’application. Il apparaît lorsque la page publiée charge le code
source (`/src/main.tsx`) au lieu de l’application construite
(`./assets/main-….js`).

Deux cas étaient possibles :

1. le dossier **source** (celui qui contient `src/`, `package.json`,
   `vite.config.ts`, etc.) avait été déposé sur Netlify/Vercel ;
2. l’ancien garde-fou pouvait aussi, sur une connexion ou un appareil lent,
   s’afficher après 3 secondes alors que l’application construite n’avait pas
   encore fini de démarrer, puis rester visible.

## Correctifs appliqués

- Le garde-fou ne se déclenche plus que lorsqu’un vrai script
  `/src/main…` est chargé **sans** le client de développement Vite
  (`/@vite/client`). Il ne peut donc plus apparaître :
  - dans l’aperçu de développement Vite ;
  - sur l’application construite, même si son démarrage prend plus de
    3 secondes.
- Si l’application démarre après l’affichage du garde-fou, celui-ci se retire
  automatiquement (`MutationObserver`).
- `npm run deploy:check` vérifie maintenant `dist/` **et** `deploy/`, la
  présence de `404.html`, et le chargement du bundle construit
  (`./assets/main-…`) au lieu de `/src/main.tsx`.
- `npm run deploy:verify <lien>` distingue désormais le vrai script source du
  simple texte du garde-fou et contrôle explicitement le bundle `assets/`.
- Le dossier publié contient `COMMENT-DEPLOYER.txt`.

## Vérifications effectuées (21/10/2026)

- `npm run build:lowmem` : **réussi** (`dist = 6.89 Mo`).
- `npm run deploy:check` : **tous les contrôles réussis** pour `dist/` et
  `deploy/`.
- `deploy/index.html` charge `./assets/main-DPD3ILDI.js`.
- Test navigateur du contenu de `deploy/` servi statiquement :
  l’application démarre (`#root` contient 2 enfants), **aucun avertissement**
  après 5,5 secondes, aucune erreur de chargement.
- `npm run deploy:verify` sur ce même contenu : **site en parfait état**.
- `./node_modules/.bin/tsc --noEmit` : **0 erreur**.
- Audit du projet : **1879 réussis / 24 échecs historiques inchangés** (tests
  anciens antérieurs aux versions récentes ; les 3 nouveaux contrôles de
  publication réussissent).

## Quoi publier, concrètement

Utilisez le dossier livré **`APPLICATION-PRETE-A-PUBLIER/`**. À sa racine, on
doit voir directement :

```text
index.html
assets/
sw.js
manifest.json
404.html
vercel.json
_redirects
COMMENT-DEPLOYER.txt
```

### Nouveau site Netlify

1. Ouvrez https://app.netlify.com/drop
2. Glissez-y le dossier **`APPLICATION-PRETE-A-PUBLIER/`** entier
   (ou ouvrez-le, sélectionnez tout son contenu, puis glissez la sélection).
3. Attendez la fin du dépôt, puis ouvrez le lien fourni.

### Mettre à jour le site Netlify déjà créé (même lien)

1. Ouvrez votre site dans Netlify → onglet **Deploys**.
2. Dans la zone « Need to update your production site? », glissez le dossier
   **`APPLICATION-PRETE-A-PUBLIER/`**.
3. Le lien public reste le même.

### Vercel

Ouvrez https://vercel.com/drag-drop et glissez le dossier
**`APPLICATION-PRETE-A-PUBLIER/`**.

### À ne jamais déposer

- `msp-v65-source.zip` ni le dossier source décompressé ;
- tout dossier contenant `src/`, `package.json` ou `vite.config.ts` ;
- un fichier `.zip` sans l’avoir d’abord décompressé.

## Si le message réapparaît après le nouveau dépôt

1. Ouvrez le lien dans une **fenêtre privée** (pour écarter un ancien cache ou
   un ancien service worker).
2. Vérifiez que vous êtes bien sur le site qui vient d’être mis à jour.
3. Depuis le dossier source, lancez :

   ```bash
   npm run deploy:verify https://votre-lien-public
   ```

4. Si le contrôle « Application construite (bundle assets/) » échoue, c’est
   encore la source qui est en ligne : refaites le dépôt avec
   `APPLICATION-PRETE-A-PUBLIER/`.
