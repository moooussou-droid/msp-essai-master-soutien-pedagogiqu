<div align="center">

# 📚 Master Soutien Pédagogique

**Application web progressive (PWA) pour les enseignants du primaire et du secondaire au Bénin.**

Notes · bulletins · statistiques · suivi des présences · espace parents · plateforme de formation (MOOC) — le tout **hors-ligne** et **installable** sur téléphone comme sur ordinateur.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## ✨ Fonctionnalités principales

### 👩‍🏫 Pour les enseignants
- **Notes & moyennes** — saisie des notes, calcul automatique des moyennes pondérées.
- **Bulletins** — bulletins de notes du primaire/secondaire avec QR code, et **bulletin officiel de Maternelle en deux pages** : grille trimestrielle des 10 domaines en **TS/S/PS**, observations, appréciation générale et visas, sans moyenne ni classement.
- **Statistiques de classe** — moyennes par matière, rangs, graphiques.
- **Présences & emploi du temps** — registre de présence et gestion des horaires.
- **Correspondance** — avis et messages aux parents.

### 🏫 Pour l'administration scolaire
- **Espace École (v64)** — chaque établissement dispose de son propre espace avec **toutes ses classes** : génération en un clic (groupes A/B, séries du lycée), titulaires, effectifs F/G et progression consolidés par cycle.
  Abonnements annuels d'établissement : **6000 FCFA/an** (Maternelle → CM2, codes « 6… ») et **10000 FCFA/an** (Maternelle → Terminale, codes « 7… »), toutes les fonctions Pro incluses.
- **Tableau de bord administrateur** — supervision multi-classes et multi-utilisateurs.
- **Gestion des cours** et modération de la plateforme MOOC.
- **Transfert d'établissement** et outils de gestion avancés.

### 🗣️ Langues au primaire (v64)
- **Grammaire, Conjugaison et Orthographe francophones** — 32 leçons (CE → 6ᵉ) : règles, astuces anti-dictée, tableaux de conjugaison, exemples béninois, exercices corrigés et quiz de 24 questions.
- **Les notions basiques d'anglais pour le Primaire** — 12 unités bilingues (CI → CM2), 144 mots avec prononciation audio et guidée, dialogues, activités de classe et quiz.

### 🍲 Cantine scolaire (arrondi v65, payeurs-mangeurs v66)
- **Simulateur de prélèvement, cahier des menus et cahier de stock** partagent la nouvelle **méthode d’arrondi de sortie des denrées par intervalles** : partie décimale au quart pour l’huile, les céréales et les légumineuses (seuils 0,375 / 0,625 / 0,875), au dixième pour le sel (seuils 0,15 / 0,25 / … / 0,95).
- **Relevé des effectifs payeurs-mangeurs** : en système **payeur-mangeur**, seuls les présents ayant payé les frais de cantine sont comptés comme mangeurs ; en **apport communautaire**, tous les présents le sont. Le relevé journalier alimente le simulateur et le cahier des menus.
- Les graphiques de la méthode sont affichés dans les écrans de cantine ; les brouillons de semaines et les cahiers de menus sont recalculés à l’ouverture, tandis que les semaines clôturées restent historiques.
- Le **guide de l’utilisateur intégré** documente les nouveautés v64 (Espace École, Français GCO, Anglais au Primaire), v65 (arrondi de cantine), v66 (payeurs-mangeurs) et v67 (Maternelle TS/S/PS, photos EducMaster), avec aides contextuelles sur les écrans concernés.

### 🍼 Maternelle et photos EducMaster (v67)
- **GRILLE D’ÉVALUATION TRIMESTRIELLE** fidèle au livret officiel : Fréquentations, Propreté corporelle et vestimentaire, Socialisation, Langage, Pré-écriture, Éducation du mouvement, Pré-lecture, Pré-mathématique, Poésie et Chant, Autres. Chaque domaine reçoit **TS**, **S** ou **PS** et une observation ; la page 2 contient l’appréciation générale, les visas enseignant/Directeur/parents et les légendes.
- **Studio Photos d’identité EducMaster** pour chaque école et chaque classe : caméra intégrée ou import, cadrage portrait **800 × 1000 px**, fond blanc connecté aux bords sans blanchir le sujet central, contrôles matricule/photo/doublons, import groupé par matricule et ZIP nommé **`matricule_NOM_Prenom_Prenom`** (ex. `104120183578_ASSOGBA_Jean_Paul.jpg`).
- Le ZIP contient aussi un bordereau CSV et les consignes à suivre dans EducMaster (*Actions → Importer les photos → Enregistrer*).

### 👪 Pour les parents
- **Espace parents** sécurisé par code et **consentement RGPD**.
- Suivi des moyennes et de la progression de l'enfant.
- Visibilité sur la **formation continue de l'enseignant(e)**.

### 🎓 Plateforme de formation (MOOC)
- **Catalogue de formations** avec catégories, niveaux, notes et avis.
- **Leçons** vidéo (YouTube), textes et **quiz** auto-évalués.
- **Tarification flexible** : gratuit · payant · partiellement payant (leçons d'aperçu).
- **Studio créateur** pour concevoir ses propres formations.
- **Certificat de réussite en PDF** — avec **nom et prénoms du participant**, code vérifiable, cadre aux couleurs du Bénin.
- **Forum** de discussion et **panneau de modération** administrateur.

> 🔒 **Confidentialité d'abord** : toutes les données sont stockées **localement** dans le navigateur (aucun serveur requis). L'application fonctionne entièrement **hors-ligne** une fois installée.

---

## 🚀 Démarrage rapide

Prérequis : **Node.js 18+** (recommandé : 20+).

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev
# → http://localhost:5173
```

### Compiler pour la production

```bash
npm run build:lowmem
```

Le dossier **`dist/`** (et sa copie **`deploy/`**) contient l'application prête à
publier : `index.html`, `assets/`, et les fichiers PWA (`manifest.json`, `sw.js`, icônes).

> ℹ️ Le build utilise **esbuild** (`build:lowmem`) : très rapide et économe en
> mémoire. Il produit exactement le même résultat déployable qu'un build Vite.

---

## 🌐 Déploiement

L'application est configurée pour **Vercel** (voir [`DEPLOIEMENT-VERCEL.md`](./DEPLOIEMENT-VERCEL.md)).

**Site statique hors ligne** — le dossier `deploy/` peut être publié sur Netlify ou Vercel Drop.

**IA centralisée en ligne** — importez le **projet source complet** sur Vercel pour déployer les fonctions serveur `/api/ai/*`. Configurez Supabase, les secrets fournisseur et les codes IA dédiés en suivant [`AI_GATEWAY_SETUP.md`](./AI_GATEWAY_SETUP.md). Le glisser-déposer de `deploy/` n’active pas ces fonctions.

Voir aussi [`DEPLOIEMENT-VERCEL.md`](./DEPLOIEMENT-VERCEL.md) pour les étapes de publication.

---

## 🧱 Stack technique

| Domaine | Technologie |
|---|---|
| UI | React 19 + TypeScript 5.9 |
| Build / Dev | Vite 7 · esbuild |
| Styles | Tailwind CSS 4 |
| Routage | React Router 7 |
| PDF | jsPDF |
| Graphiques | Recharts |
| Icônes | lucide-react |
| Tableurs | ExcelJS · xlsx |
| Stockage | LocalStorage / IndexedDB (idb) |

---

## 📁 Structure du projet

```
msp-app/
├── public/            # Fichiers statiques + PWA (manifest.json, sw.js, icônes)
├── src/
│   ├── components/     # ~95 écrans et composants React
│   ├── utils/          # ~105 modules (logique métier, stockage, calculs)
│   └── App.tsx         # Routage et écran d'accueil
├── scripts/            # Scripts de build (esbuild-prod.mjs, etc.)
├── vercel.json         # Configuration de déploiement Vercel
├── netlify.toml        # Configuration de déploiement Netlify
└── DEPLOIEMENT-VERCEL.md
```

---

## 📜 Scripts npm

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement (hot reload) |
| `npm run build:lowmem` | Build de production (esbuild, recommandé) |
| `npm run build` | Build de production via Vite |
| `npm run preview` | Prévisualiser le build localement |

---

## 🤝 Contribution

Ce projet accompagne les enseignants béninois au quotidien. Les suggestions et
contributions sont les bienvenues via *issues* et *pull requests*.

---

<div align="center">
Fait avec ❤️ pour les enseignant(e)s du Bénin 🇧🇯
</div>
