# ✨ Améliorations du module Bulletins & Excel — Septembre 2026

## 1. 📊 Export Excel « Récapitulatif des bulletins » (toute la classe)

Nouveau bouton **« Excel récapitulatif »** dans l'écran Bulletins :

- **Feuille « Bulletins »** : N°, Matricule (texte, zéros préservés), Nom, Prénoms, Sexe, Naissance, une colonne par matière (note /20), **Moyenne /20, Rang, Mention, Décision** (Admis/Ajourné)
- **Feuille « Synthèse »** : école, classe, année, effectif, moyenne de classe, taux de réussite, admis/ajournés, moyennes extrêmes, **répartition des mentions**
- Nom de fichier automatique et lisible : `bulletins_recap_<ecole>_<classe>_<trimestre>.xlsx`
- Tout est généré **localement** (aucune donnée ne quitte l'appareil)

## 2. 📄 Export Word « Tous les bulletins » (un document, un bulletin par page)

Nouveau bouton **« Tous les bulletins »** :

- Un bulletin **officiel par élève** (en-tête République du Bénin, classe, infos élève, tableau des matières, moyenne, rang, mention, appréciation, signatures)
- **Saut de page automatique** entre chaque élève → prêt à imprimer en série (40 élèves = 40 pages, un seul fichier)
- Matières, notes, coefficients (secondaire), ABS — tout est repris des calculs de bulletins
- Format A4, marges prêtes pour l'impression

## 3. 👤 Sexe & date de naissance sur la fiche élève → bulletin

- **Formulaire élève** : nouveaux champs facultatifs **Sexe (M/F)** et **Date de naissance** (à l'ajout et à la modification)
- **Bulletin** : au lieu de « Sexe : — » et « Naissance : — », affichage réel (ex. « Masculin (M) » / « 12/03/2015 »)
- Compatible avec les anciens élèves (champs optionnels, aucune perte de données)

## ✅ Tests : 93/93 réussis

- Export Excel récap : en-têtes, matricules texte, sexe/naissance formatés, feuille synthèse
- Export Word multi-bulletins : XML valide, sauts de page, échappement des caractères
- Champs sexe/naissance : stockage + compatibilité anciens élèves
- Tous les tests précédents (bulletins, Excel, IA, cloud, licences, chiffrement)

## 📂 Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/utils/bulletinExport.ts` | 🆕 Exports groupés Excel + Word |
| `src/components/BulletinsScreen.tsx` | Boutons d'export + sexe/naissance sur le bulletin |
| `src/utils/database.ts` | Interface Student : `sexe`, `dateNaissance` |
| `src/App.tsx` | Formulaire élève : champs sexe + date de naissance |
| `tests/audit.ts` | + 13 nouveaux tests |
| `public/sw.js` | Cache v7 |
