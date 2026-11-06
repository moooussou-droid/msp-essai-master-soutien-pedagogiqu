# VERSION 49 — WORD, RENOMMAGES ET REGISTRES OFFICIELS

Cache hors ligne : `master-soutien-v49` · 17 septembre 2026

---

## 1. Les fonctionnalités Word dans l'Administration scolaire

L'onglet **Documents** disposait d'une simple zone de texte. Il offre désormais un
**véritable traitement de texte** :

| | |
|---|---|
| **Mise en forme** | gras, italique, souligné, couleurs, 4 tailles |
| **Structure** | titres 1/2/3, texte normal |
| **Alignements** | gauche, centré, droite, justifié |
| **Listes** | à puces et numérotées |
| **Tableaux** | insertion sur mesure (lignes × colonnes) |
| **Édition** | annuler, rétablir, effacer la mise en forme |

**Export Word (.docx)** : le document s'ouvre dans Word, LibreOffice ou Google Docs et
**reste modifiable** — ce que le PDF ne permet pas. **Import Word** également : un modèle
déjà rédigé par la circonscription peut être repris et modifié.

### Un choix technique que je dois vous expliquer
Un `.docx` est en réalité une **archive ZIP contenant du XML** (norme OOXML). L'application
embarquant déjà `jszip`, j'ai écrit le générateur moi-même : **aucune bibliothèque
supplémentaire, aucun téléchargement, et la règle du 100 % hors ligne est préservée.**
Les tests ouvrent le fichier produit et vérifient que les quatre pièces obligatoires y
sont, ce qui garantit que Word l'acceptera.

⚠️ **Effet de bord traité :** le contenu étant devenu du HTML, la copie, le PDF et
l'impression auraient affiché des balises `<div>` dans vos documents officiels. Une
conversion a été ajoutée pour les trois — **le PDF et l'impression restent disponibles**
comme vous l'exigez depuis la v41.

---

## 2. Renommages demandés

- **Encyclopédie → Encyclopédie MSP** (tuile d'accueil + en-tête de l'écran)
- **Dictionnaire → Dictionnaire MSP** (tuile d'accueil + carte du hub)

Deux contrôles automatiques plus anciens figeaient les noms précédents : ils ont été
mis à jour, sans quoi la livraison aurait échoué à tort.

---

## 3. Nouveaux sous-modules : « Mes registres officiels »

Je n'ai pas ajouté de fonctions au hasard. J'ai cherché ce que **l'application se
réclamait déjà à elle-même sans le fournir** — et j'ai trouvé une contradiction :
la liste de préparation à l'inspection exige « Cahier journal à jour », et le modèle de
rapport d'inspection réclame le cahier journal **et** le registre matricule.
**L'enseignant devait donc tenir sur papier des documents que l'application lui
demandait d'avoir.** C'est ce manque que comblent les deux nouveaux sous-modules.

### Cahier journal
Les séances réellement faites chaque jour : matière, titre, durée, déroulement, et un
motif de report si la séance n'a pas eu lieu. Le **taux de réalisation** (séances faites
÷ prévues) est calculé — c'est l'indicateur que regarde l'inspecteur. Export Word, PDF,
impression.

### Registre matricule
Le registre d'inscription : identité, naissance, parent, contact, admission, provenance
et sortie. Recherche instantanée, âge calculé, effectif présents / garçons / filles.
**Un élève sorti n'est jamais effacé** : il reste au registre avec sa date et son motif —
c'est la règle d'un registre officiel. Export Word (paysage), PDF, impression.

---

## 4. Un vrai bug trouvé en testant

En vérifiant le parcours réel, **le bouton Gras ne faisait rien**.

Cause : la fonction redonnait le focus à la zone d'édition alors qu'elle l'avait déjà,
ce qui **repliait la sélection en simple curseur** — la commande s'appliquait donc à du
vide. Le focus n'est désormais redonné que s'il est ailleurs, et la dernière sélection
est restaurée.

Ce défaut serait passé inaperçu à la livraison et se serait manifesté chez vous par
« les boutons de mise en forme ne marchent pas ». **Mon premier test le déclarait à tort
réussi** : il détectait le gras de l'en-tête au lieu de celui de l'utilisateur. Je l'ai
resserré pour qu'il vérifie le texte saisi.

**Également corrigé :** un test de confidentialité de l'espace parents était **instable
~1 % du temps** — il cherchait le matricule « 002 » dans tout le dossier, or l'horodatage
contient parfois ces chiffres. Il n'inspecte plus que les champs de données. Vérifié sur
trois exécutions consécutives.

---

## 5. Vérifications

| Suite | Résultat |
|---|---|
| Audit statique (**55 nouveaux contrôles v49**) | **1573 / 1573** |
| **E2E v49** (navigateur réel) | **36 / 36** |
| E2E v48 · v47 · v45 · v44 · v43 · v42 · v41 · v40 · v36 · cantine | 35 · 44 · 28 · 31 · 36 · 57 · 47 · 45 · 47 · 25 |
| Smoke | 63 / 63 |
| TypeScript | 0 erreur |
| **Total** | **0 échec** |

Le test bout-en-bout **ouvre réellement le fichier .docx produit**, vérifie qu'il s'agit
d'une archive ZIP valide, que les pièces OOXML sont présentes, que le texte saisi s'y
trouve, que le gras est transmis — et **qu'aucune balise HTML n'y fuit**.

---

## 6. Livraison

| Fichier | Taille |
|---|---|
| **`DEPLOIEMENT-V49-SITE.zip`** | 11,2 Mo — `index.html` à la racine |
| `master-soutien-pedagogique-v49.zip` | 9,3 Mo — sources |

👉 https://app.netlify.com/drop, **sur la même adresse** pour conserver les données.
Aucune fonctionnalité existante n'a été retirée.

*Note d'entretien : les zips v46 et v47 ont été supprimés de l'espace de travail, qui
atteignait sa limite de taille. Les versions v48 et v49 restent disponibles.*

---

## 7. Deux questions en attente

1. **« Fiches élèves » → « Saisie par profil » ?** (posée en v46, toujours sans réponse)
2. **La déclaration APDP** pour l'espace parents : elle conditionne l'étape ② (la
   synchronisation automatique des dossiers).
