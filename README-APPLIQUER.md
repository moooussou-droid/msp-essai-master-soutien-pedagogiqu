PATCH MSP-67 — RÉDUCTION DES TRANSFERTS SUPABASE

CONTENU
Ce ZIP contient uniquement les fichiers source modifiés, avec leur chemin relatif
à la racine du projet. Il n’inclut ni dépendances, ni secrets, ni dossier de build.

APPLICATION
1. Décompressez ce ZIP à la racine du clone GitHub lié au projet Vercel
   msp-essai-master-soutien-pedagogique, en autorisant le remplacement des fichiers.
2. À la racine, vérifiez puis construisez :
       npx tsc --noEmit
       npm run build:lowmem
       npm run deploy:check
3. Enregistrez et poussez les changements sur la branche main :
       git add src/App.tsx src/components/AdminPrepFichesScreen.tsx \
         src/components/PrepFichesScreen.tsx \
         src/components/PublishedOralResourcesPanel.tsx \
         src/components/SectionGuide.tsx src/utils/manualContent.ts \
         src/utils/prepFicheCloudSync.ts src/utils/prepFicheTransfer.ts \
         src/utils/prepFiches.ts tests/prepFicheCloudSync.test.mjs \
         scripts/postbuild.mjs
       git commit -m "Réduire les transferts Supabase des catalogues"
       git push origin main
4. Vercel est configuré pour construire le projet depuis la source; après le push,
   vérifiez que le déploiement de production passe à Ready.

IMPORTANT
- Ce patch est destiné au dépôt SOURCE complet, pas au seul dossier deploy/.
- Ne déposez pas le contenu statique deploy/ si vous voulez conserver les fonctions
  Vercel /api/ai/* (IA distante et publication administrateur).
- Aucune variable Vercel, clé, migration ou configuration Supabase n’est modifiée.
- Le déploiement n’est pas déclenché par l’application de ce patch.

VALIDATION DANS LE WORKSPACE
TypeScript : OK; tests ciblés : 24/24; audit : 2047/2047; build et deploy:check : OK.
