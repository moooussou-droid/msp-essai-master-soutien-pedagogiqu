# Rapport de refonte — Master Soutien Pédagogique v67

**État :** refonte réalisée sur une copie de travail de la source v67. Aucun déploiement externe n’a été effectué.

## Base utilisée

- Source fournie par l’utilisateur : `https://github.com/moooussou-droid/MSP-67` (branche `main`, archive `msp-v67-source.zip`).
- Copie de travail : `msp-v67-refonte/`.
- Le bundle compilé du site en ligne et la copie v65 n’ont pas servi de base finale.

## Changements apportés

- **Identité visuelle :** palette premium vert profond, or et terre cuite inspirée du Bénin; accueil, écran d’activation et accès d’administration harmonisés; contraste, focus visible et mise en page mobile soignés.
- **Activation / renouvellement :** parcours dédié avec les cinq formules de la v67, rappel du forfait et des coordonnées dans une demande WhatsApp, saisie du code et état de réussite. L’accès à ce parcours est disponible depuis l’accueil, le profil et l’écran d’accès.
- **Accès distincts :** liens discrets « Accès équipe » et « Accès principal »; routes et écrans de connexion séparés.
- **Équipe et rôles :** codes personnels à six chiffres avec durée d’un an; sessions locales limitées à huit heures; affichage et actions administratives filtrés selon le rôle. Les fonctions réservées au compte principal restent distinctes des permissions des membres.
- **PWA :** couleur du manifeste alignée sur la nouvelle palette; nom de cache réglé sur `master-soutien-v69-refonte` afin de renouveler les ressources après l’extension du module oral et l’activation de l’agent pédagogique.
- **Correctif du fond blanc EducMaster :** seuils de détection rendus plus prudents; mesure du masque dans les zones centrales du visage et du torse; si le détourage est ambigu, trop étendu ou touche le sujet, le traitement blanc est annulé et la photo recadrée d’origine reste intacte. L’aperçu affiche un avertissement; les métadonnées ne déclarent un fond blanc que s’il a réellement été appliqué. Le test navigateur v67 inclut aussi un cas de détourage ambigu.
- **Dates des exports d’enrôlement :** la date de naissance des élèves et du personnel est écrite littéralement comme texte `JJ/MM/AAAA` (et non comme date sérialisée qu’un importateur pourrait relire en `AAAA-MM-JJ`). Les autres champs de date personnalisés sont aussi normalisés en texte afin de satisfaire les imports comme EducMaster.
- **Module v69 — Poésies, chants, comptines et contes :** bibliothèque hors connexion étendue à 33 ressources (12 initiales + 21 ajouts) pour la Maternelle et le Primaire, filtres par type/niveau, ajouts en texte, audio, vidéo ou formats combinés depuis le formulaire. Les contributions sont utilisables par le principal et les membres d’équipe; les médias restent propres à l’appareil, sans synchronisation réseau. Textes personnels sauvegardés, fichiers média à transférer séparément. Comprend des classiques francophones et des adaptations/créations contextualisées au Bénin; aucun média tiers préinstallé et aucune parole contemporaine reproduite.
- **Agent IA Master Soutien Pédagogique :** route auparavant marquée « À venir » désormais active. Entretien guidé, génération structurée APC Bénin, différenciation, situation locale, sauvegarde dans « Mes fiches », édition, impression et export Word. Le moteur local est le choix par défaut et fonctionne hors ligne; un fournisseur externe préconfiguré est une option explicite nécessitant Internet et l’envoi du prompt au service choisi. Le mode local est un moteur pédagogique à règles/modèles, pas un grand modèle génératif.
- Les assertions statiques de l’audit historique qui supposaient l’ancien mécanisme d’accès ont été adaptées au système actuel de sessions par rôle.

### Repères documentaires du répertoire oral

- La ressource éducative Beneylu classe des chansons traditionnelles telles que « Frère Jacques », « Une souris verte » et « Savez-vous planter les choux ? » en Cycle 1/Cycle 2 : `https://fr.school.beneylu.com/ressources/chant`.
- Dokowè identifie « Tchou-ou tchou-ou gbovi » et « Koklo Kouassi » comme des chants du Bénin : `https://dokowe.fr/activites-enfants/comptines-africaines/`.
- Une notice culturelle sur « L’Aube Nouvelle » décrit son association aux cérémonies scolaires et à la levée des couleurs : `https://parlons-fongbe.com/hymne-benin-ecoles-transmission/`. L’application n’en reproduit pas les paroles ni l’enregistrement.
- Deutsche Welle rapporte la transmission de contes au Bénin et l’usage pédagogique du conte à l’école primaire : `https://www.dw.com/fr/au-b%C3%A9nin-le-conte-se-raconte-encore/a-47679722`.

Ces pages servent de repères de répertoire et ne constituent pas une liste officielle exhaustive du programme béninois. Les adaptations MSP portent des paroles originales; les enregistrements d’autrui ne sont ni intégrés ni redistribués.

## Éléments v64–v67 conservés

La refonte a été fusionnée sur la source v67; les composants et utilitaires propres à la v67 n’ont pas été remplacés. Sont notamment conservés :

- Espace École et langues au primaire (v64);
- fonctions de cantine, dont les payeurs-mangeurs (v65–v66);
- bulletin officiel de maternelle TS/S/PS et ses styles d’impression;
- studio photo d’identité EducMaster et sa route `/class/:id/photos-educmaster`;
- guides, exports, base de données et autres routes de la v67.

## Fonctionnement hors ligne et limites

Après un premier chargement complet, l’application et ses ressources mises en cache restent utilisables hors connexion. Les demandes WhatsApp, la lecture de vidéos en ligne et les fonctions cloud nécessitent une connexion; les médias importés dans la bibliothèque orale restent locaux. Les données restent locales lorsque l’utilisateur n’active pas une fonction cloud.

**Important — sécurité :** les sessions et permissions sont appliquées côté navigateur, dans le stockage local. Elles structurent l’accès et le parcours hors ligne, mais ne constituent pas une authentification serveur ni une frontière de sécurité inviolable. Aucun serveur d’authentification n’a été créé.

## Vérifications

- `npm ci --ignore-scripts --no-audit --no-fund` : réussi.
- `npx tsc -b` : réussi, aucune erreur TypeScript.
- `npm run build:lowmem` : réussi; production générée, environ **7,21 Mo**.
- `npm run deploy:check` : réussi; `dist/` et `deploy/` vérifiés.
- Aperçu local Vite : l’application et les composants React de l’agent IA et des arts oraux sont servis sans erreur de transformation; les routes HashRouter sont déclarées et contrôlées par l’audit.
- Assertions ciblées : **14 réussies** — accès principal/équipe, sessions et rôles, catalogue v67, photos EducMaster et garde-fous contre le blanchiment du visage/torse ou d’une image entière.
- Tests d’export de dates : **2 réussis** — les deux classeurs stockent la date comme texte exact `JJ/MM/AAAA` (dont l’exemple EducMaster `1987-01-01` → `01/01/1987`), et non comme date sérialisée.
- Tests arts oraux + agent : **23 réussis** — répertoire 33 éléments, adaptations béninoises, création de média seul, audio/vidéo IndexedDB, routes IA réelles, génération locale par défaut, fournisseur externe explicite, confidentialité, aide et sauvegarde.
- `npx --yes tsx tests/audit.ts` : **1 988 réussites / 19 échecs historiques**. Les 19 assertions restantes concernent d’anciennes attentes Vercel, d’anciens plans/codes et anciennes durées/formulations d’essai; les anciens décomptes de sous-modules ont été actualisés à 49. Aucun échec ne concerne les changements v69.
- Le test navigateur `tests/e2e-v67-maternelle-photos-educmaster.mjs` n’a pas pu démarrer dans cet environnement : Chromium ne trouve pas la bibliothèque système `libnspr4.so`. Les 75 vérifications rapportées dans le rapport d’origine de la v67 ne sont donc **pas** revendiquées comme exécutées sur cette refonte.

## Livraison

- `MSP-V67-REFONTE-SOURCE.zip` : projet source, sans dépendances installées ni artefacts de build.
- `MSP-V67-REFONTE-DEPLOY.zip` : fichiers compilés prêts à être déposés sur un hébergeur statique, sans publication faite par l’assistant.

Pour reconstruire la version publiable depuis les sources : `npm ci`, puis `npm run build:lowmem`. Pour une publication manuelle, extraire le ZIP de déploiement et déposer son contenu, conformément aux guides du projet.
