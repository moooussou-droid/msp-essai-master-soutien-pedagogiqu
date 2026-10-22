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
- **Bulletins** — génération de bulletins scolaires en PDF, avec **QR code de vérification**.
- **Statistiques de classe** — moyennes par matière, rangs, graphiques.
- **Présences & emploi du temps** — registre de présence et gestion des horaires.
- **Correspondance** — avis et messages aux parents.

### 🏫 Pour l'administration scolaire
- **Tableau de bord administrateur** — supervision multi-classes et multi-utilisateurs.
- **Gestion des cours** et modération de la plateforme MOOC.
- **Transfert d'établissement** et outils de gestion avancés.

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

**Le plus simple** — via Git :

1. Poussez ce dépôt sur GitHub.
2. Importez-le sur [vercel.com/new](https://vercel.com/new).
3. Cliquez **Deploy** — le fichier `vercel.json` configure tout automatiquement
   (build, dossier de sortie, *rewrites* SPA, en-têtes PWA).

L'app est aussi déployable sur **Netlify** (`netlify.toml` fourni) ou par simple
**glisser-déposer** du dossier `deploy/`.

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
