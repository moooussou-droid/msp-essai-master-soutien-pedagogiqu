# ☁️ Module « Cloud & Support » — Améliorations livrées

> Livrable : **v18** — Master Soutien Pédagogique 🎓🇧🇯
> Le cloud devient plus sûr (erreurs de saisie détectées) et plus parlant (test de
> connexion, date relative), et le support gagne en transparence : le diagnostic
> envoyé est **visible avant l'envoi** et la FAQ couvre les vraies questions du terrain.

---

## 1. 🎯 Ce qui a changé

### 1.1 Format du code de synchronisation vérifié (cloud)
Un code mal recopié (lettre manquante, préfixe oublié…) faisait échouer la
synchronisation **au moment de l'envoi**, sans explication. Désormais :
- le format **MSP-XXXX-XXXX** est vérifié **avant** toute action (tolérance
  minuscules et espaces) ;
- un message clair guide l'utilisateur : « Format du code attendu : MSP-XXXX-XXXX ».

### 1.2 Test de connexion au cloud (nouveau)
Bouton **« Tester la connexion au cloud »** :
- vérifie d'abord le **réseau** (hors-ligne → message immédiat) ;
- puis **joint le serveur** (requête légère avec délai maximal de 8 s) ;
- affiche le verdict : « Connexion réussie (230 ms) » ou une erreur expliquée
  (réseau coupé, serveur injoignable, délai dépassé).
- Aucune donnée n'est envoyée : test 100 % sans risque.

### 1.3 Date relative de dernière synchronisation (lisibilité)
La dernière synchro s'affiche désormais en français naturel : **« il y a 2 h »,
« hier », « il y a 10 jours »** (la date exacte reste affichée entre parenthèses).
On voit d'un coup d'œil si la sauvegarde est récente.

### 1.4 Diagnostic de support : transparence totale (support)
Le diagnostic était joint **automatiquement** au signalement de problème — sans que
l'utilisateur sache ce qui partait. Désormais :
- section **« Diagnostic automatique »** dépliable : le contenu exact est **affiché
  avant l'envoi** (et actualisable) ;
- diagnostic **enrichi** : date, appareil, état du cloud, dernière synchro,
  **nombre de classes/élèves** (aucune donnée nominative), **stockage utilisé** ;
- toujours joint uniquement au signalement de problème, jamais aux autres demandes.

### 1.5 FAQ enrichie (support)
6 nouvelles questions couvrant le quotidien des enseignants : import Excel,
élève absent → « ABS », plusieurs téléphones, calcul des moyennes (barème /20),
désinstallation et sauvegarde. Total : **11 questions**.

---

## 2. 🏗️ Détails techniques

| Fichier | Rôle |
|---|---|
| `src/utils/cloudSync.ts` | + `isValidSyncCode(code)` (normalise minuscules/espaces, regex MSP-XXXX-XXXX) ; + `formatRelativeTime(iso, now?)` (déterministe, testable) ; + `testCloudConnection(timeoutMs?)` (AbortController, navigator.onLine, latence, messages clairs). |
| `src/components/CloudScreen.tsx` | Validation du code dans `validate()` ; bouton « Tester la connexion » + verdict ; date relative de dernière synchro. |
| `src/components/SupportScreen.tsx` | Diagnostic asynchrone enrichi (getAllClasses, storage.estimate) ; aperçu dépliable « Diagnostic automatique » + actualisation ; FAQ 6 questions ajoutées ; envoi géré par `openWithMessage`. |
| `tests/audit.ts` | **22 nouveaux tests** (section 24) : format du code, date relative (6 cas), test de connexion (4 scénarios avec fetch simulé), branchements écrans (Cloud + Support). |

---

## 3. ✅ Vérifications effectuées

- Compilation TypeScript : **0 erreur**.
- **Audit complet : 416 réussis / 0 échoué** (dont 22 nouveaux tests Cloud & Support).
- Build de production : réussi (`dist/index.html`, ~3,82 Mo, fichier unique hors-ligne).
- Le test de connexion n'envoie **aucune donnée** (requête HEAD sur l'API).

---

## 4. 📌 Plan tri-modules — terminé ✅
1. ~~Orientation scolaire~~ ✅ **fait (v16)**
2. ~~Administration d'établissement~~ ✅ **fait (v17)**
3. ~~Cloud & Support~~ ✅ **fait (v18)**
