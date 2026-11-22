# Correctif MSP — fiches de préparation

## Changements

- Catalogue cloud complet des fiches : plafond logiciel de **850 MiB** (client et serveur), avec acceptation à la limite et refus du byte suivant.
- Écran d’accès à l’administration principale : le bouton de retour mène à **l’écran d’activation** lorsque nécessaire.
- Personnalisation du filigrane : **3 F par page**. Le total, les messages de paiement et le texte WhatsApp utilisent ce tarif.
- Service worker passé à `v75-fiches-850-3f` pour signaler la nouvelle version aux applications installées.

Le plafond par page (45 Mo) et le transfert ZIP manuel (200 MiB) sont distincts et n’ont pas été modifiés. Le catalogue des ressources orales n’a pas été touché.

## Installation dans le projet Vercel

Décompressez l’archive à la racine du **projet source complet** en conservant les chemins, puis acceptez le remplacement des fichiers. Exécutez ensuite :

```bash
node --test tests/*.test.mjs
npx tsc --noEmit
npm run build:lowmem
```

Publiez le projet source complet pour conserver les routes serveur `/api/ai/*` et la publication cloud. **Ne remplacez pas le projet Vercel avec le seul dossier `deploy/`** : il s’agit de la sortie statique et elle ne contient pas ces fonctions API.

Après publication, rouvrez l’application. Sur une PWA déjà installée, utilisez le bandeau **« Mettre à jour »** s’il apparaît; sinon rechargez l’application lorsque vous êtes en ligne.

## Vérifications effectuées dans cette session

- `node --test tests/*.test.mjs` : **49 tests réussis**.
- `npx tsc --noEmit` : réussi.
- `npm run build:lowmem` : réussi; build présent dans `msp-v67-refonte/deploy/`.
- `npm run deploy:check` : réussi.
- La prévisualisation locale sur le port 5173 répond HTTP 200.

Aucun déploiement distant Vercel/Supabase n’a été effectué.
