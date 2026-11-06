# Rapport v66 — Cantine : relevé des effectifs payeurs-mangeurs

## Demande traitée

Ajouter, dans la section **Cantine**, une sous-section permettant de relever
les effectifs d’élèves **payeurs-mangeurs**, en tenant compte des deux modes
de fonctionnement des écoles :

- **système payeur-mangeur** : seuls les enfants qui ont payé les frais de
  cantine mangent ;
- **système apport communautaire** : tous les enfants présents mangent.

## Nouvelle sous-section

La section Cantine compte désormais cinq sous-modules. Le nouveau, en
deuxième position, est :

> **Relevé des effectifs payeurs-mangeurs**  
> Route : `/cantine/payeurs-mangeurs`

Il complète le relevé général des effectifs par classe, qui continue de
compter les **inscrits**. Le nouveau relevé est journalier et détermine les
élèves **réellement à nourrir**.

## Règle de calcul

Pour chaque classe (Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1, CM2),
l’écran relève séparément les garçons et les filles :

- inscrits, repris du relevé général comme repère ;
- présents le jour de cantine ;
- payeurs présents, uniquement en système payeur-mangeur.

Les mangeurs sont calculés automatiquement :

- **Payeur-mangeur** : `mangeurs = payeurs présents`. Un payeur absent ne
  prend pas le repas du jour et n’augmente donc pas la quantité à préparer.
- **Apport communautaire** : `mangeurs = présents`.

L’écran affiche également :

- présents ne mangeant pas (non-payeurs présents en payeur-mangeur) ;
- absents par rapport aux inscrits ;
- taux de présence ;
- part des filles parmi les mangeurs ;
- totaux par cycle (Maternelle / Primaire).

Des contrôles signalent notamment des payeurs supérieurs aux présents ou des
présents supérieurs aux inscrits. Le calcul ne peut jamais retenir davantage
de mangeurs que d’élèves présents.

## Historique et exports

- Un relevé par date ; changer de date ne remplace pas les jours précédents.
- Historique des relevés avec date, système utilisé, présents et mangeurs.
- Exports **PDF**, **Excel** et **impression** du relevé journalier.
- Le système choisi par l’école est mémorisé, tout en restant modifiable.
- Les inscrits peuvent être repris depuis le dernier relevé général.

## Liens avec les autres écrans de cantine

- Le bouton **« Vers simulateur »** transmet le total des mangeurs, avec la
  date et le système, pour préremplir la nouvelle semaine.
- Dans **Prélèvement du jour**, le champ parle désormais des **élèves
  mangeurs** et un bouton reprend automatiquement le relevé de la même date.
- Dans le **Cahier MSP des menus hebdomadaires**, chaque jour peut reprendre
  les garçons/filles mangeurs du relevé correspondant ; les quantités à
  sortir sont alors calculées sur les mangeurs.
- La méthode d’arrondi de sortie v65 reste inchangée.

## Guide de l’utilisateur

La documentation a été complétée :

- nouvelle fiche du manuel intégré : **« Relevé des effectifs
  payeurs-mangeurs »** ;
- aide contextuelle dédiée sur le nouvel écran ;
- étapes du simulateur, du cahier des menus et de l’accueil Cantine mises à
  jour ;
- README mis à jour ;
- cache PWA porté à `master-soutien-v66`.

## Vérifications

- `./node_modules/.bin/tsc --noEmit` : **0 erreur**.
- Audit projet : **1905 réussis / 24 échecs historiques inchangés**. Les 26
  nouveaux contrôles de la section 68 réussissent.
- Nouvel E2E navigateur `tests/e2e-v66-payeurs-mangeurs.mjs` : **30/30**.
- Régressions navigateur ciblées : v47 **44/44**, v58 **29/29**, v65
  **41/41**, v44 Cantine **25/25** — soit **139/139**.
- `npm run build:lowmem` : réussi, `dist = 6,93 Mo`.
- `npm run deploy:check` : tous les contrôles de `dist/` et `deploy/`
  réussissent ; `deploy/index.html` charge `./assets/main-ANZRGPEC.js`.

## Captures livrées

- `apercu-v66-section-cantine.png`
- `apercu-v66-payeur-mangeur.png`
- `apercu-v66-totaux-mangeurs.png`
- `apercu-v66-apport-communautaire.png`
- `apercu-v66-guide-payeurs.png`

## Livrables

- `APPLICATION-PRETE-A-PUBLIER.zip` : application construite v66, à
  décompresser puis à publier depuis le dossier obtenu.
- `msp-v66-source.zip` : code source complet de la v66.
- Dossier décompressé `APPLICATION-PRETE-A-PUBLIER/` dans les livrables v66.
