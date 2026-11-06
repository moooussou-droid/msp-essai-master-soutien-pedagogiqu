# AMÉLIORATIONS — MODULE COURS (v15)

## Objectif
L'espace « Cours en ligne » devient **« Cours »** et s'organise en **deux sous-modules**
complémentaires, accessibles depuis le menu principal :

1. 🧑‍🏫 **Les astuces de l'enseignant** — 100 % gratuit (contenu existant, enrichi)
2. 🌍 **Cultivons-nous** — nouveauté (culture générale pour la classe)

---

## 1. Les astuces de l'enseignant (gratuit)

Le moteur de fiches pédagogiques est désormais **100 % local** (aucune connexion requise)
et couvre **443 notions** du programme primaire béninois :

| Niveau | Notions |
|--------|--------:|
| CI | 43 |
| CP | 59 |
| CE1 | 82 |
| CE2 | 80 |
| CM1 | 87 |
| CM2 | 92 |
| **Total** | **443** |

Chaque fiche contient **exactement 7 sections** (conforme à la demande) :

1. **La notion**
2. **Explication de la notion**
3. **Ce que l'élève doit comprendre**
4. **Ce que l'élève doit retenir**
5. **Ce que l'élève doit savoir faire**
6. **Exemple concret**
7. **Critère de réussite**

### Fonctionnalités
- **Recherche instantanée** par notion / niveau / discipline.
- **Familles pédagogiques** : chaque notion est rattachée à une famille (calcul, lecture,
  corps & mouvement, hygiène, etc.) avec des variantes adaptées au niveau.
- **Fiches rédigées sur mesure** pour les notions qui l'exigent (aucune fiche générique vide).
- **Impression / partage** : fiche imprimable (format PDF via l'impression du navigateur) et partage texte.
- **Synthèse vocale** (si supportée par l'appareil) pour lire la fiche à voix haute.

---

## 2. Cultivons-nous (nouveau)

Un espace de culture générale pour la classe :

- **39 articles** répartis en **8 rubriques** (histoire, géographie, sciences, arts,
  société, nature, inventions, traditions du Bénin et d'Afrique).
- **15 questions** de quiz culturel (sélection quotidienne tournante).
- **16 proverbes** et **10 devinettes** pour animer la classe.
- **Article du jour** : choix déterministe par date (même article pour toute la classe
  le même jour, sans connexion).
- **Quiz quotidien** : nouveau tirage chaque jour, **meilleur score mémorisé** sur l'appareil.

---

## Navigation
- `/cours` — nouvel écran principal à 2 onglets (astuces / culture).
- `/cours-en-ligne` — ancienne adresse redirigée automatiquement vers `/cours` (favoris conservés).
- `/plateforme-cours` et `/admin-cours` — inchangés (boutique et administration des cours en ligne).

---

## Qualité
- Compilation TypeScript : **0 erreur**.
- Vérification automatique de couverture : **443/443 notions complètes**, 0 fiche incomplète.
- Build de production : **OK**.
