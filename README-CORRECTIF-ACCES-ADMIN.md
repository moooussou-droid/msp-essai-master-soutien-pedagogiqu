# Correctif — retour depuis la connexion d’administration

Ce paquet corrige les boutons de retour liés à l’accès : lorsqu’aucune activation valide n’est enregistrée, ils ouvrent l’écran d’activation au lieu du menu de l’application. Avec une activation valide, le retour à l’accueil habituel reste disponible.

## Fichiers à copier à la racine du projet

Remplacez ou ajoutez les fichiers en conservant ces chemins :

- `src/App.tsx` — branche le portail global sur la décision d’accès par route ;
- `src/components/AdminDashboardScreen.tsx` — le bouton du formulaire admin choisit l’activation ou l’accueil selon l’existence d’une activation valide ;
- `src/components/UpgradeScreen.tsx` — même règle pour le bouton de retour depuis l’écran de mise à niveau ;
- `src/utils/routeAccess.ts` — règle de décision d’accès et destination de retour partagée ;
- `tests/trial.test.mjs` — contrôle l’intégration au garde global ;
- `tests/appAccess.test.mjs` — tests du parcours et des exceptions d’accès.

## Comportement conservé

- L’essai gratuit intentionnel de 2 heures reste disponible ; cette exception est distincte des boutons de retour, qui dirigent vers l’activation tant qu’aucun abonnement valide n’est enregistré.
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
