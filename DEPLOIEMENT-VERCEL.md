# Déployer « Master Soutien Pédagogique » sur Vercel

## Deux modes différents

- **Publication du dossier `deploy/`** : site statique, moteur IA local, téléchargement du catalogue public des fiches et exports hors ligne. Elle n’inclut pas les fonctions `/api/ai/*` et ne peut donc pas publier les fiches ni activer l’IA centralisée.
- **Publication du projet source** : Vercel peut construire le site et découvrir les fonctions Node.js dans `api/`. C’est le mode requis pour la publication des fiches par l’administration et l’IA en ligne.

La navigation de l’application utilise `HashRouter`; il n’est donc pas nécessaire d’ajouter une réécriture SPA pour les routes internes. La configuration racine `vercel.json` fixe `npm run build:lowmem` et `dist`. Les fonctions sont dans `api/ai/` et s’adaptent aux mêmes origines `/api/ai/*`.

## Publier le projet source (IA en ligne)

1. Importez le dépôt source privé dans [Vercel](https://vercel.com/new) ou déployez depuis la racine du projet avec la CLI Vercel. Ne choisissez pas le dossier généré `deploy/` comme projet.
2. Vérifiez les paramètres : **Build Command** `npm run build:lowmem`, **Output Directory** `dist`, **Framework** `Other`.
3. Appliquez dans le SQL Editor Supabase `supabase/migrations/20261104_ai_gateway.sql` et `supabase/migrations/20261106_prep_fiches_catalog.sql` (cette dernière crée le manifeste public en lecture seule et le bucket des pages).
4. Dans **Vercel → Settings → Environment Variables**, définissez les variables serveur décrites dans `.env.example` et `AI_GATEWAY_SETUP.md`. Configurez uniquement les fournisseurs et modèles autorisés. Les clés ne doivent jamais porter un préfixe `VITE_` ou `NEXT_PUBLIC_`.
5. Créez `MSP_AI_SESSION_SECRET` avec au moins 32 octets aléatoires. Gardez `SUPABASE_SERVICE_ROLE_KEY` et toutes les clés fournisseur dans les secrets du serveur seulement.
6. Redéployez, puis créez les codes IA distincts avec `npm run ai:access`. Les anciens codes à 6 chiffres servent toujours hors ligne, pas à l’authentification IA.
7. Émettez un code IA de rôle `principal` (par exemple `npm run ai:access -- issue 'Nom du principal' principal 365 30`) et transmettez-le uniquement à l’administrateur.
8. Dans l’écran d’administration des fiches, ouvrez la session principale puis synchronisez le catalogue. Les ajouts, retraits et suppressions de fiches publiées déclenchent ensuite la mise à jour cloud; les brouillons sont exclus. Les pages dépassant 6 MiB utilisent TUS reprenable, avec un maximum de 45 MB par page et 200 MB par publication.
9. Testez d’abord les API et la publication avec des documents sans données personnelles d’élèves. Confirmez qu’une révocation bloque l’accès et configurez les plafonds/alertes de dépenses chez le fournisseur.

Consultez **`AI_GATEWAY_SETUP.md`** pour les noms d’environnement, les commandes, le rôle Supabase et les vérifications. Aucun secret, code IA ni fournisseur réel n’est fourni dans le dépôt; l’application en ligne n’est pas activée tant que le propriétaire n’a pas terminé cette configuration.

## Publier une version statique hors ligne

Pour Netlify Drop ou une publication statique Vercel :

```sh
npm install
npm run build:lowmem
```

Publiez le contenu du dossier `deploy/`. Le moteur local et les exports restent disponibles, mais les routes serveur IA ne sont pas présentes dans le site statique.

## Vérifications

- `npm run deploy:check` vérifie les artefacts statiques et la présence des sources de fonctions IA.
- `npm run test:ai-gateway` vérifie le catalogue, le consentement, les origines et les chemins de session sans appeler de fournisseur payant.
- `npm run test:prep-fiche-cloud` vérifie la session `principal`, les URL d’envoi signées et la préservation des fiches/brouillons locaux.
- Après la configuration, testez les API sur le déploiement Vercel. La prévisualisation statique locale ne simule pas les fonctions Vercel.
- Si le site conserve une ancienne version, désinscrivez le service worker dans les outils développeur puis rechargez la page.
