# Mise en ligne de l’assistant IA multi-modèles MSP

## Ce que cette version ajoute

- Un chat libre avec sélection d’un fournisseur : OpenAI/ChatGPT, Anthropic/Claude, Mistral, Perplexity, Gemini ou DeepSeek. Azure OpenAI reste optionnel.
- Un second mode, distinct de la passerelle distante : LLM Qwen3 0.6B exécuté dans un Web Worker du navigateur, avec WebGPU si disponible et repli WASM/CPU. Le modèle est téléchargé à la demande; après mise en cache, l’inférence n’envoie pas les prompts à un fournisseur cloud. Le moteur pédagogique hors ligne à canevas est conservé.
- Les écrans dédiés de génération guidée de fiches restent suspendus dans cette version; les demandes de fiche complète sont bloquées. Le chat IA général et le modèle local sur l’appareil restent disponibles pour les autres usages.
- Une confirmation distincte reste nécessaire avant chaque envoi externe. Le chat affiche le message et l’historique qui seront transmis.
- Les clés des fournisseurs ne sont jamais intégrées au JavaScript du navigateur. Le serveur accepte uniquement les modèles autorisés par les variables d’environnement.
- Les fichiers de référence sont extraits localement avant envoi. L’image n’est transmise qu’aux fournisseurs compatibles, après consentement.
- Les codes IA sont distincts des codes hors ligne de l’application. Ils sont longs, aléatoires, stockés sous forme de SHA-256, expirables et révocables.
- Le journal enregistre uniquement des métadonnées d’usage (fournisseur, modèle, compteurs de caractères, état et date), pas les questions ni les réponses.
- Une fonction dédiée publie les fiches pédagogiques de l’administration à partir d’une session IA de rôle `principal`; les utilisateurs lisent le manifeste public et gardent les pages téléchargées dans IndexedDB hors ligne.

Il s’agit d’une interface MSP commune aux API de ces fournisseurs, pas d’une copie de toutes leurs applications. Les fonctions spécifiques (recherche web, citations, images, outils ou fichiers) dépendent de ce que chaque API prend en charge. La recherche/citations n’est signalée que pour les réponses Perplexity lorsque l’API en renvoie.

## LLM local sur téléphone ou ordinateur

- Le modèle retenu pour cette intégration est `onnx-community/Qwen3-0.6B-ONNX`, révision épinglée dans le code. Les poids relevés sont d’environ 570 Mo en WebGPU ou 919 Mo en WASM/CPU, plus de petits fichiers auxiliaires; la variante CPU est visée sous 1 Go au total.
- Le premier chargement télécharge les poids depuis Hugging Face et affiche la progression. Ils sont mis en cache par le navigateur; une fois présents, le chat et les générations locales ne transmettent pas les prompts à `/api/ai/*` ni aux fournisseurs. Aucun repli cloud n’est automatique.
- WebGPU est essayé en premier; WASM/CPU sert de repli plus lent. Mémoire, vitesse, stockage et support WebGPU varient selon l’appareil. Un téléphone ancien peut ne pas pouvoir charger le modèle; dans ce cas le moteur à canevas hors ligne reste disponible. La qualité d’un modèle 0,6B est inférieure à celle des meilleurs modèles cloud et les résultats doivent être relus.
- Le téléchargement initial nécessite une connexion et les données du modèle ne sont pas incluses dans l’archive source. La persistance du cache dépend du navigateur, qui peut le purger.
- `@huggingface/transformers` installe aussi une dépendance Node dont le script Linux essaie par défaut de télécharger des composants CUDA inutilisés par le navigateur. Le fichier `.npmrc` du dépôt fixe `onnxruntime_node_install=skip`, donc `npm ci`/Vercel évitent automatiquement ce téléchargement. Si un autre gestionnaire de paquets ignore `.npmrc`, utilisez `ONNXRUNTIME_NODE_INSTALL=skip` pendant l’installation (paramètre non secret). Le runtime navigateur utilise les fichiers WASM/WebGPU empaquetés avec l’application.

L’intégration et le build vérifient l’assemblage, mais aucune performance réelle sur téléphone/ordinateur, téléchargement complet du modèle, connexion Supabase ou mise en production n’a été validé dans cet environnement.

## Préparation Supabase — une seule fois

1. Ouvrez le projet Supabase utilisé par MSP, puis **SQL Editor**.
2. Exécutez `supabase/migrations/20261104_ai_gateway.sql` pour la passerelle IA.
3. Exécutez aussi `supabase/migrations/20261106_prep_fiches_catalog.sql` pour le manifeste public et le bucket des fiches; la migration n’autorise aucune écriture publique.
4. Dans **Project Settings → API**, copiez le Project URL et la clé **service_role**. La clé service-role contourne RLS : elle ne doit aller que dans les secrets Vercel et dans le terminal sécurisé de l’administrateur, jamais dans `VITE_*`, le code source ou un message.

## Déploiement obligatoire avec fonctions serveur

Le glisser-déposer d’un dossier statique `deploy/` ou Netlify Drop ne fournit pas les fonctions `/api/ai/*` : il ne peut donc ni activer l’IA centrale ni publier les fiches. Les utilisateurs peuvent néanmoins télécharger le catalogue public des fiches si la migration Supabase est appliquée.

1. Poussez le **projet source complet** dans un dépôt privé GitHub.
2. Importez ce dépôt dans Vercel; gardez le build `npm run build:lowmem` et le dossier de sortie `dist`. Le `.npmrc` du dépôt évite automatiquement le téléchargement CUDA Linux inutile pendant l’installation. Le `vercel.json` racine référence les quatre fonctions `/api/ai/*`, dont `/api/ai/prep-fiches`; Vercel les découvre depuis `api/`.
3. Dans **Vercel → Settings → Environment Variables**, ajoutez les autres variables listées dans `.env.example`. Les clés exactes de modèles sont à choisir depuis les consoles/API de chaque fournisseur; le serveur ne devine pas un modèle potentiellement retiré.
4. Créez `MSP_AI_SESSION_SECRET` avec au moins 32 octets aléatoires. Exemple local : `openssl rand -base64 48`.
5. N’activez que les fournisseurs que vous avez choisis et dont vous acceptez les coûts. Configurez également des plafonds/alertes de dépense dans chaque compte fournisseur. Le quota MSP limite les requêtes, mais ne remplace pas les limites financières du fournisseur.
6. Redéployez Vercel après l’ajout des variables.

Les valeurs doivent être définies **côté serveur**, sans préfixe `VITE_` ou `NEXT_PUBLIC_` :

- Supabase : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MSP_AI_SESSION_SECRET`.
- Fournisseurs : `OPENAI_API_KEY` + `OPENAI_MODEL` (ou `OPENAI_MODELS`), idem avec `ANTHROPIC`, `MISTRAL`, `PERPLEXITY`, `GEMINI`, `DEEPSEEK`.
- Les identifiants modèle dans `*_MODELS` sont séparés par des virgules; seuls ces modèles seront proposés/acceptés. Si plusieurs modèles sont définis, l’utilisateur peut choisir dans l’interface.
- Limites : `MSP_AI_PER_MINUTE_LIMIT`, `MSP_AI_GLOBAL_DAILY_LIMIT`, `MSP_AI_MAX_OUTPUT_TOKENS`.
- Optionnel : `MSP_AI_ALLOWED_ORIGINS` pour une ou plusieurs origines exactes séparées par des virgules.

## Créer et révoquer les codes IA

Le propriétaire exécute le script depuis un terminal de confiance, avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` définis dans l’environnement :

```sh
npm run ai:access -- issue "Nom du principal" principal 365 30
npm run ai:access -- issue "Nom du membre" team 365 15
npm run ai:access -- list
npm run ai:access -- revoke CODE_IA_COMPLET
```

`issue` affiche un code IA long **une seule fois**. Transmettez-le à la personne en privé. Ne réutilisez pas son code d’activation hors ligne. Le dernier nombre est le quota journalier de ce code; la passerelle applique aussi une limite par minute et un plafond global de requêtes.

## Publication et synchronisation des fiches officielles

- La publication cloud doit être faite depuis le déploiement Vercel qui héberge `/api/ai/prep-fiches`. Un ZIP statique peut lire le catalogue Supabase public et synchroniser les appareils, mais ne peut pas publier.
- Dans l’écran d’administration des fiches, ouvrez une session avec un code IA `principal`, puis publiez/synchronisez. L’API revérifie le rôle sur le serveur; le rôle administrateur local du navigateur ne suffit pas.
- La fonction envoie uniquement les fiches dont `published` vaut `true`. Les brouillons, les listes d’élèves, notes et autres ressources sont exclus.
- Le manifeste se trouve dans `msp_prep_fiches_catalog` (lecture publique seule); les pages se trouvent dans le bucket public `msp-prep-fiches`. Les navigateurs n’obtiennent jamais la clé service-role : l’API émet des URL de dépôt temporaires, puis met à jour le manifeste.
- Les utilisateurs vérifient les mises à jour à l’ouverture, au retour en ligne et toutes les dix minutes pendant que le module est ouvert. Les pages sont gardées dans IndexedDB pour une consultation hors connexion; le ZIP reste un transfert de secours.
- Limites de sécurité : 45 MB par page et 200 MB par publication. Les pages de plus de 6 MiB utilisent le protocole reprenable TUS; en cas d’échec, le manifeste précédent reste publié.

## Vérification avant ouverture au public

- `npm run test:prep-fiche-cloud` vérifie l’origine, l’exigence de rôle `principal`, la création des URL signées, la validation du manifeste et la préservation atomique des fiches locales/brouillons.
- Créer les codes de test, vérifier que le cookie de session est `HttpOnly`, puis tester connexion/déconnexion, refus d’un code révoqué et quotas.
- Configurer d’abord un seul fournisseur, vérifier son modèle exact, ses coûts et ses erreurs; ajouter les autres ensuite.
- `npm audit --omit=dev` signale actuellement **16 vulnérabilités de dépendances de production**, dont **2 critiques** (notamment jsPDF/DOMPurify) et des alertes élevées autour de PDF.js, React Router et SheetJS. Aucun `audit fix --force` n’a été appliqué; examiner et traiter ces mises à jour avant une ouverture publique.
- Vérifier les confirmations d’envoi séparées du clic « Générer » et ne pas tester avec des données d’élèves.
- La prévisualisation statique locale ne simule pas Vercel Functions : les API en ligne seront disponibles après le déploiement Vercel du dépôt source.

**Aucun fournisseur n’est activé dans ce dépôt : aucune clé API, clé service-role, code IA ni déploiement externe n’a été fourni ou configuré.**
