CORRECTIF — CATALOGUE CLOUD DE FICHES JUSQU’À 500 MiB

Ce correctif répond au choix confirmé : conserver Supabase et relever le plafond logiciel du catalogue cloud de 200 MiB à 500 MiB.

Modifications incluses
- Le navigateur et l’API Vercel utilisent le même plafond total de 500 MiB.
- L’interface affiche la nouvelle limite.
- Le serveur accepte une réponse PostgREST HTTP 201 réussie sans corps (Prefer: return=minimal), au lieu d’afficher « Unexpected end of JSON input ».
- Le test vérifie qu’un manifeste de 500 MiB est accepté et qu’un manifeste de 500 MiB + 1 octet est refusé.

Garde-fous inchangés
- Maximum par page : 45 Mo; envoi signé et réservé à la session principale.
- Maximum : 10 000 pages et 5 000 fiches.
- Les limites de 200 Mo du ZIP de transfert et des ressources orales ne sont pas modifiées.
- Aucune migration SQL, permission publique, clé, facturation ou donnée Supabase n’est modifiée/supprimée.

Important : 500 MiB est un plafond logiciel, pas un espace garanti ni illimité. Le bucket des fiches contenait environ 322 MiB d’objets au dernier contrôle; un nouveau snapshot peut coexister temporairement avec l’ancien jusqu’au nettoyage. Le quota réel dépend du plan Supabase et de l’usage des autres buckets. Vérifiez l’écran Storage/Billing de Supabase avant une publication très volumineuse. Le connecteur ne donne pas accès au plan ni au quota restant.

Fichiers à remplacer à la racine du dépôt GitHub relié à Vercel
- server/aiGateway.js
- src/utils/prepFicheCloudSync.ts
- src/components/AdminPrepFichesScreen.tsx
- tests/prepFicheCloudSync.test.mjs

Installation avec GitHub Desktop
1. Ouvrez le clone moooussou-droid/msp-essai-master-soutien-pedagogiqu sur la branche main.
2. Extrayez l’archive à la racine du clone, en conservant les chemins server/, src/ et tests/, puis autorisez le remplacement des fichiers.
3. Dans GitHub Desktop, vérifiez que les quatre fichiers ci-dessus sont modifiés; aucun fichier .env ne doit apparaître.
4. Créez un commit, par exemple « Augmente la limite du catalogue cloud à 500 MiB », puis cliquez sur Push origin.
5. Attendez que le nouveau déploiement Production Vercel soit READY et PROMOTED. Ne redéployez pas un ancien commit.
6. Ensuite, relancez la synchronisation seulement si l’application indique encore que la version actuelle n’a pas été publiée.

Tests locaux effectués : test:prep-fiche-cloud 4/4, test:ai-gateway 7/7, tests complets 27/27, build:lowmem et deploy:check réussis.
