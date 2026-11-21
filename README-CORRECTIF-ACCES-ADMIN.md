# Correctif — retour depuis la connexion d’administration

Ce paquet corrige le retour à l’accueil depuis l’écran de connexion principale montré dans `RETOUR.png`.

## Fichiers à copier à la racine du projet

Remplacez ou ajoutez les fichiers en conservant ces chemins :

- `src/App.tsx` — branche le portail global sur la décision d’accès par route ;
- `src/components/AdminDashboardScreen.tsx` — le bouton du formulaire admin mène à l’écran d’activation, pas à l’accueil de l’application ;
- `src/utils/routeAccess.ts` — nouvelle règle de décision d’accès ;
- `tests/trial.test.mjs` — contrôle l’intégration au garde global ;
- `tests/appAccess.test.mjs` — tests du parcours et des exceptions d’accès.

## Comportement conservé

- L’essai gratuit intentionnel de 2 heures reste disponible.
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
