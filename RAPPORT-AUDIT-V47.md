# RAPPORT DE LIVRAISON — VERSION 47

**Master Soutien Pédagogique (Votre compagnon mobile)**
Date : 17 septembre 2026 · Cache hors ligne : `master-soutien-v47`

---

## 1. Les 10 chantiers demandés

| # | Demande | État | Où le trouver |
|---|---------|------|---------------|
| 1 | Relevé d'effectifs cantine (G/F, Maternelle 1 → CM2) | ✅ | Cantine → **Relevé des effectifs par classe** |
| 2 | Administration scolaire enrichie d'après vos 6 documents | ✅ | Administration scolaire → onglet **Documents** |
| 3 | Design international « frappé de teintures africaines » | ✅ | Tous les modules |
| 4 | Bandeau licence en haut de chaque page | ✅ | Toutes les pages |
| 5 | Chronomètre de performances (vitesse et endurance) | ✅ | **Ma boîte à outils** → Chronomètre |
| 6 | Calculatrice complète + outils de l'enseignant | ✅ | **Ma boîte à outils** → Calculatrice |
| 7 | Conditions d'utilisation modifiables par le SA | ✅ | **Ma boîte à outils** → Conditions |
| 8 | Verrou « un code = un utilisateur = une seule école » | ✅ | Automatique à l'enregistrement |
| 9 | Numérisation HD de documents | ✅ | **Ma boîte à outils** → Numériser |
| 10 | Numérisation signature + cachet · icônes conformes | ✅ | Numériser → onglet **Signature et cachet** |

---

## 2. Détail des travaux

### Chantier 1 — Relevé des effectifs de la cantine
Les **huit classes** demandées sont affichées dans l'ordre officiel : Maternelle 1,
Maternelle 2, CI, CP, CE1, CE2, CM1, CM2. Pour chacune, vous saisissez seulement
**les garçons et les filles**.

Tout le reste est **calculé, jamais saisi** : total par classe, total de l'école,
répartition Maternelle / Primaire, et **part des filles** (indicateur suivi par les
circonscriptions). Une saisie aberrante est neutralisée : `-4` devient 0, `2,7` devient 2.

Conformément à votre arbitrage, ce relevé est **indépendant du simulateur** : il a son
propre historique et ses propres exports (PDF, Excel, impression). Le bouton
**« Vers simulateur »** y dépose l'effectif ; le simulateur affiche alors la mention
« Effectif repris du relevé par classe (40 élèves). Vous pouvez le corriger. »
**Il n'écrase jamais une saisie déjà faite.**

### Chantier 2 — Documents administratifs officiels
Les modèles génériques ont été remplacés par la structure **réelle** de vos documents
(DDEMP BORGOU / CS SINENDE / EPP NIMBO) :

- **Compte rendu du conseil des maîtres** : en-tête DDEMP / CS / EPP + année scolaire,
  n°, cases **ORDINAIRE / EXTRAORDINAIRE**, **heure de démarrage**, présidé par + qualité,
  *Points inscrits à l'ordre du jour*, *Déroulement*, **heure de la fin**,
  **qualité de l'ambiance**, double signature *Le Secrétaire de séance / Le Directeur*.
- **PV de réunion des parents d'élèves** : formule officielle « L'an deux mil… »,
  Président du Bureau de l'APE, supervision du Directeur, renvoi à la liste en annexe.
- **Liste de présence au conseil des maîtres** : N° · Matricule · Nom et prénoms · Sexe ·
  Qualité · Cours tenu · Statut · Grade · Contact · Émargement.
- **Liste de présence** (réunion des parents), plus simple.

⚠️ **Défaut corrigé au passage** : cet écran ne proposait que `window.print()`, sans
jamais produire de PDF — ce qui violait votre règle posée en v41. Il génère désormais
un **vrai fichier PDF**, l'impression restant disponible à côté.

### Chantier 4 — Bandeau de licence
Affiché en haut de **chaque page** : `LICENCE : MOISE OUSSOU`. Comme convenu, le nom est
celui du **titulaire du code connecté**, lu automatiquement — pas une mention figée.
C'est un **marquage anti-partage** : le nom apparaît sur toutes les captures d'écran.

### Chantier 8 — Verrou renforcé
Le verrou de la v43 était porté par l'**appareil**. Deux failles en découlaient :
un collègue utilisant un second code sur le même téléphone était bloqué à tort, et le
même code réinstallé ailleurs repartait libre. Le rattachement est désormais porté par
le **code d'accès** :

| Situation | Résultat |
|---|---|
| Le titulaire ré-enregistre son école | ✅ autorisé |
| Le même code tente une **2ᵉ école** | ❌ refusé |
| Un **autre code** reprend l'appareil | ❌ refusé, même avec une autorisation de transfert |
| Compte créé **avant la v47** | ✅ adopté automatiquement, aucune perte |

### Chantiers 5, 6, 9, 10 — La boîte à outils
- **Chronomètre** : le temps vient de l'horloge monotone du téléphone, **pas d'un
  compteur** — un compteur dérive de plusieurs secondes sur une course longue et se fige
  en veille. Départ unique, bouton **« Top »** à chaque arrivée, classement automatique,
  et **allure aux 100 m** en endurance. Export PDF.
- **Calculatrice** : priorités, parenthèses, puissances, racine, sin/cos/tan (en degrés),
  factorielle, π. La **virgule française** est acceptée. Le calcul n'utilise **pas `eval`**
  (qui exécuterait n'importe quel code saisi) : `alert(1)` est rejeté, `4/0` est signalé
  au lieu de renvoyer un faux résultat. Onglet **Notes** : moyenne pondérée, conversion
  de barème (15/30 → 10/20), taux de réussite, règle de trois.
- **Numérisation HD** : **caméra** (arrière, 2560×1440) **et import**, jusqu'à 2480 px.
  Le mode noir et blanc utilise un **seuillage adaptatif** : un seuil global noircirait
  toute la zone d'ombre d'une photo prise à la main — ici chaque pixel est comparé à son
  voisinage. Export **PDF multi-pages** ou image. La caméra est libérée en quittant l'écran.
- **Signature et cachet** : le fond blanc devient **transparent** (sinon la signature
  masquerait le texte) et l'image est rognée. La **couleur du cachet est préservée**
  (un cachet bleu ou rouge noirci paraîtrait douteux). Ils sont apposés automatiquement
  au bas des documents administratifs.

### Chantier 7 — Conditions d'utilisation
**12 articles** rédigés à partir du fonctionnement réel de l'application : code personnel
nominatif, règle « un code = une école », données stockées sur l'appareil et responsabilité
des sauvegardes, abonnement 999 FCFA incluant l'enrôlement, contenus payants débloqués
manuellement, prérogatives des Super Administrateurs, IA strictement locale, signature des
documents, usages interdits.
Le **Super Administrateur seul** peut les modifier (bouton absent pour les autres) ;
la version est numérotée et datée, et un bouton rétablit le texte d'origine.

### Chantiers 3 et 10 — Design et icônes
Palette africaine (vert `#046a38`, or `#f2a900`, terracotta, indigo, sable), motif de
tissage **kente** en surimpression discrète sur les en-têtes, filet aux couleurs du
drapeau. **Le décor disparaît à l'impression**, pour économiser l'encre des écoles.

⚠️ **Défaut trouvé** : les icônes sont désignées par leur nom, et toute icône non
déclarée retombait **silencieusement** sur une grille générique. C'était déjà le cas de
`Sparkles` **avant la v47**. Les **30 icônes** sont désormais déclarées et vérifiées
automatiquement par un test.

---

## 3. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (dont **87 nouveaux contrôles v47**) | **1470 / 1470** |
| **E2E v47** (navigateur réel) | **44 / 44** |
| Smoke | 63 / 63 |
| e2e v36 · v40 · v41 · v42 · v43 · v44 · v45 · cantine | 47 · 45 · 47 · 57 · 36 · 31 · 28 · 25 |
| TypeScript `tsc --noEmit` | 0 erreur |
| **Total** | **0 échec** |

Contrôles réels effectués dans le navigateur : bandeau affichant « LICENCE : MOISE OUSSOU »,
saisie 12/8 en CI et 5/15 en CM2 → totaux 17 G / 23 F / 40 et **57,5 %**, PDF téléchargé,
report du 40 dans le simulateur, chronomètre mesurant 00:01,91, `2+3*4 = 14`, division par
zéro refusée, moyenne pondérée 10,67, refus d'une 2ᵉ école, et modification des CGU
réservée au Super Administrateur.

**Régression détectée et corrigée** : le test v44 cherchait l'élève « KOFFI » par son texte ;
le nouveau bandeau affichant « KOFFI Jean » (le titulaire du code) captait le clic.
Le test a été précisé — l'application n'était pas en cause.

---

## 4. Déploiement

| Fichier | Taille | Usage |
|---|---|---|
| **`DEPLOIEMENT-V47-SITE.zip`** | 11,2 Mo | À déposer sur https://app.netlify.com/drop |
| `master-soutien-pedagogique-v47.zip` | 9,3 Mo | Code source complet |

`index.html` est bien **à la racine** du zip de déploiement.
👉 **Redéployez sur la même adresse** afin de conserver les données déjà saisies.

Aucune fonctionnalité existante n'a été retirée. Les codes d'accès en place restent valables.

---

## 5. Un point en attente

La question posée en v46 n'est toujours pas tranchée : faut-il renommer **« Fiches élèves »**
en **« Saisie par profil »** ? Rien n'a été modifié sans votre accord.
