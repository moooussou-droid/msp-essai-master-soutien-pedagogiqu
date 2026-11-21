# Correctif — retour depuis la connexion d’administration

Ce paquet corrige les boutons de retour liés à l’accès : depuis les écrans de connexion admin, le bouton mène toujours à l’écran d’activation. Depuis l’écran de mise à niveau, il mène à l’activation sans abonnement valide et à l’accueil avec une activation valide.

## Fichiers à copier à la racine du projet

Remplacez ou ajoutez les fichiers en conservant ces chemins :

- `src/App.tsx` — branche le portail global sur la décision d’accès par route ;
- `src/components/AdminDashboardScreen.tsx` — depuis les connexions principale et équipe, le bouton mène toujours à l’écran d’activation, sans dépendre du stockage local du navigateur ;
- `src/components/UpgradeScreen.tsx` — le bouton de retour mène à l’activation sans abonnement valide et à l’accueil avec une activation valide ;
- `src/utils/routeAccess.ts` — règle de décision d’accès et destination de retour partagée ;
- `tests/trial.test.mjs` — contrôle l’intégration au garde global ;
- `tests/appAccess.test.mjs` — tests du parcours et des exceptions d’accès.

## Comportement conservé

- L’essai gratuit intentionnel de 2 heures reste disponible et reste une autorisation distincte du bouton de retour.
- Depuis les connexions principale et équipe, le bouton mène toujours à l’activation, sans renvoyer au menu.
- Depuis l’écran de mise à niveau, aucun abonnement valide signifie retour à l’activation ; une activation valide conserve le retour à l’accueil.
- Les connexions principale et équipe restent accessibles pour permettre la saisie de leurs identifiants.
- Les routes publiques prévues (activation, vérification et suivi d’enfant) restent publiques.
- Sans abonnement valide, essai actif, route publique ou session d’administration valide, le garde global affiche l’écran d’accès au lieu de l’application.

La protection est côté client, comme le reste de l’application hors ligne ; ce correctif ne constitue pas une authentification serveur inviolable.

## Vérifications effectuées

- `npx tsc --noEmit` — réussi ;
- `node --test tests/*.test.mjs` — 44 tests réussis ;
- `npm run build:lowmem` — réussi ;
- `npm run deploy:check` — réussi.

Aucun déploiement Vercel ni changement distant n’a été lancé. Pour publier après application, reconstruisez le projet et déployez selon votre procédure habituelle.
