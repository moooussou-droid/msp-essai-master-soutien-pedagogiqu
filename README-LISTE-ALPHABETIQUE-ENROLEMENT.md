# Liste alphabétique des élèves enrôlés

Le tri s’applique sans modifier l’ordre de saisie enregistré ni demander de ré-enrôler les élèves.

## Comportement

- Après l’enregistrement d’un élève, l’écran revient sur son niveau et affiche la liste de ce niveau par ordre alphabétique du nom, puis des prénoms.
- Le filtre « Toutes » conserve les niveaux groupés dans leur ordre habituel et trie les élèves alphabétiquement à l’intérieur de chaque niveau.
- L’export Excel conserve ses onglets par niveau et trie chaque onglet de la même façon.
- Le tri français ignore les différences de casse et d’accents; les prénoms départagent les élèves portant le même nom.

## Fichiers concernés

- `src/components/EnrollmentScreen.tsx`
- `src/utils/enrollment.ts`
- `src/utils/enrollmentSort.ts` (nouveau)
- `tests/enrollmentSort.test.mjs` (nouveau)

## Vérifications

- `npx tsc --noEmit` — réussi ;
- `node --test tests/*.test.mjs` — 48 tests réussis ;
- `npm run build:lowmem` — réussi ;
- `npm run deploy:check` — réussi.

Aucun commit Git ni déploiement Vercel n’a été lancé.
