# Master Soutien Pédagogique — Rapport d'audit v43

Date : 15 septembre 2026
Version : **v43** · Cache PWA : `master-soutien-v43`
Code d'accès : `MSP-Catalyste@@007-2026` (inchangé)

---

## 1. Ce qui a été demandé et ce qui a été fait

| # | Demande | État |
|---|---------|------|
| 1 | Cantine : « aucun changement de légumineuse » en priorité, option « changement » en plus | ✅ Livré en v42 |
| 2 | Signature « Master Soutien Pédagogique (Votre compagnon mobile) » sur documents et images | ✅ Livré en v42 |
| 3 | Personnalisation de la signature à 500 F | ✅ Livré en v42 |
| 4 | Module « Mon gestionnaire comptable MSP » + « Le budget de mon école » (OHADA, PDF et Excel) | ✅ Livré en v42 |
| 5 | **Limiter chaque utilisateur à son école d'enregistrement, avec transfert possible via l'administration** | ✅ **Nouveau en v43** |

Les quatre premiers points étaient déjà livrés dans la version 42 ; ils ont été
re-testés intégralement et fonctionnent toujours. La nouveauté de cette version
est le **rattachement à l'école**.

---

## 2. Le rattachement à l'école

### Le verrouillage
À votre premier enregistrement, le nom de l'école est **verrouillé**. Il devient
votre établissement de rattachement, et l'application le rappelle sous le champ.

Si vous tentez plus tard d'enregistrer une autre école, **l'enregistrement est
refusé** et un message explique la marche à suivre :

> « Votre compte est rattaché à *EPP Cotonou Centre*. Si vous n'êtes plus en
> service dans cet établissement, demandez une autorisation de transfert au
> Super Administrateur. »

Le profil n'est pas modifié tant que le transfert n'est pas autorisé.

### Une précaution importante contre les faux blocages
La comparaison des noms ignore les majuscules, les accents et les espaces en
trop : « EPP Cotonou Centre », « epp cotonou centre » et « EPP  COTONOU  CENTRE »
sont reconnus comme **la même école**. Bloquer un enseignant pour une majuscule
aurait été un défaut plus grave que le problème à résoudre.

### Le transfert en cas de mutation
L'enseignant muté n'est pas bloqué. Deux chemins, tous deux hors ligne :

1. **À distance.** L'enseignant communique l'identifiant affiché sur son
   appareil. Le Super Administrateur le saisit dans l'espace d'administration,
   obtient un code (format `XXXX-XXXX`) et le lui dicte par téléphone ou
   WhatsApp. L'enseignant saisit le code, puis enregistre sa nouvelle école.
2. **Sur place.** Si l'appareil est sous la main, l'administrateur autorise le
   transfert d'un seul bouton.

**L'autorisation est à usage unique** : une fois le transfert fait, elle est
consommée. Un changement ultérieur exigera une nouvelle autorisation. Un code
erroné n'accorde rien.

### Les paramètres de l'administration
Un onglet **« Établissement »**, réservé au Super Administrateur, permet de :

- consulter l'école de rattachement, la date et le nombre de transferts ;
- produire un code d'autorisation pour n'importe quel appareil ;
- accorder ou **retirer** une autorisation ;
- **réécrire directement l'établissement** (règle v39 : le Super Administrateur
  peut modifier n'importe quelle information) ;
- consulter l'**historique complet** des rattachements, avec les dates.

### Deux décisions que je signale explicitement

**Les données ne sont jamais effacées lors d'un transfert.** Notes, présences,
comptabilité et cantine restent en place. Supprimer le travail d'une année
scolaire sans demande explicite de votre part aurait été destructeur. Si vous
souhaitez au contraire une remise à zéro lors d'un transfert, dites-le moi et je
l'ajoute en option.

**Le verrou agit à l'enregistrement du profil, pas en coupant l'accès aux
écrans.** Si l'école du profil diverge du rattachement, un bandeau d'avertissement
apparaît en haut des modules et renvoie vers le réglage. Couper l'accès à des
données déjà saisies en pleine année scolaire aurait causé plus de tort que
l'irrégularité constatée.

---

## 3. Rappel des acquis de la v42 (re-testés, aucune régression)

- **Cantine** : « Aucun changement cette semaine » reste l'option cochée par
  défaut ; « Changement de légumineuse » n'apparaît que si vous le demandez.
- **Signature** : apposée sur les documents et images de l'application, absente
  des créations IA de l'utilisateur, personnalisable pour 500 F.
- **Comptabilité** : recettes par classe et par volet, dépenses avec objet,
  solde du jour ; budget prévisionnel, bilan et inventaire OHADA en PDF et Excel.

---

## 4. Résultats des contrôles

| Contrôle | Résultat |
|---|---|
| Compilation TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit statique (52 sections) | **1303 réussis / 0 échoué** |
| Tests de fumée | **63 / 0** |
| **Tests navigateur v43** | **36 / 0** |
| Tests navigateur v42 | 57 / 0 |
| Tests navigateur v41 | 47 / 0 |
| Tests navigateur v40 | 45 / 0 |
| Tests navigateur v39 | 41 / 0 |
| Tests navigateur v38 | 45 / 0 |
| Tests navigateur v36 | 47 / 0 |
| Tests navigateur v35 | 12 / 0 |
| Tests navigateur v34 | 5 / 0 |
| Tests navigateur de base | 28 / 0 |
| **Total** | **1729 contrôles, 0 échec** |

Le test v43 vérifie notamment, en vrai navigateur, que :
- le changement d'école est **réellement refusé** (le profil enregistré n'est
  pas modifié) et pas seulement signalé à l'écran ;
- le code produit par l'administration est **exactement** celui qu'attend
  l'appareil de l'enseignant ;
- l'autorisation est bien **consommée** après un transfert ;
- une recette saisie **survit** au transfert.

Deux ajustements ont porté sur mes propres tests, non sur l'application : les
guides de première utilisation s'affichent en plein écran et interceptaient les
clics, et la session d'administration s'ouvre par `localStorage` et non par un
formulaire.

---

## 5. Livraison

- `DEPLOIEMENT-V43-SITE.zip` — **à déposer tel quel**, `index.html` est à la racine.
- `master-soutien-pedagogique-v43.zip` — code source complet.

**Déploiement :** déposez le contenu du zip de déploiement sur
https://app.netlify.com/drop, **à la même adresse que la v42**, afin que les
données déjà enregistrées par les utilisateurs soient conservées.

Les codes d'accès des utilisateurs et des membres de l'équipe **ne sont pas
effacés** par cette mise à jour. Les utilisateurs déjà installés ne sont pas
bloqués : leur rattachement sera créé au prochain enregistrement de leur profil.
