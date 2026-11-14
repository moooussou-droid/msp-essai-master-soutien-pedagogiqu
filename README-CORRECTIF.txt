CORRECTIF — RÉPONSE JSON VIDE LORS DE LA PUBLICATION DES FICHES

Symptôme
L’application peut afficher « Unexpected end of JSON input » après le dépôt des pages, même si Supabase a bien enregistré le catalogue. La route serveur interprétait comme du JSON une réponse réussie mais vide (HTTP 201, Prefer: return=minimal).

Correctif
Le serveur traite maintenant une réponse 2xx sans corps comme une réussite sans résultat (null). Une réponse non vide mais invalide produit un message d’erreur générique, sans exposer le contenu de la réponse.

Fichiers à remplacer à la racine du dépôt Vercel
- server/aiGateway.js
- tests/prepFicheCloudSync.test.mjs

Installation avec GitHub Desktop
1. Ouvrez le clone du dépôt moooussou-droid/msp-essai-master-soutien-pedagogiqu (branche main), utilisé par le projet Vercel.
2. Extrayez cette archive à la racine du clone en conservant les dossiers server/ et tests/, puis autorisez le remplacement des deux fichiers.
3. Dans GitHub Desktop, vérifiez que seuls ces deux fichiers source/tests sont modifiés.
4. Créez un commit, par exemple « Corrige réponse JSON vide publication fiches », puis cliquez sur Push origin.
5. Attendez que le nouveau déploiement Production Vercel soit READY et PROMOTED avant de retester.

Aucune migration, permission Supabase ou clé/secret n’est modifié par ce correctif.
Le correctif conserve la protection par session principale et les URL de dépôt signées.
Le test de publication simule désormais la réponse PostgREST HTTP 201 vide, et les tests locaux passent.
