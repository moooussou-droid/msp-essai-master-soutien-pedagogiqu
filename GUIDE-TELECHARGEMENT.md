# 📥 Guide de Téléchargement — NoteFacile Bénin

Votre application est maintenant **100 % téléchargeable et autonome** !

## 📦 Où se trouve votre application ?

Après la construction (`npm run build`), votre application se trouve dans le dossier **`dist/`** :

```
dist/
├── index.html      ← ⭐ VOTRE APPLICATION COMPLÈTE (un seul fichier !)
├── manifest.json   ← Configuration pour installation PWA
├── sw.js           ← Fonctionnement hors-ligne
├── icon.svg        ← Icône
├── icon-192.png    ← Icône (petite)
└── icon-512.png    ← Icône (grande)
```

👉 **Le fichier `dist/index.html` contient TOUTE l'application** (le code, le design, tout est à l'intérieur). Vous pouvez l'utiliser seul.

---

## 🚀 3 façons d'utiliser votre application

### Option 1 : Ouvrir directement (le plus simple) ✅

1. Téléchargez le fichier **`dist/index.html`**
2. Renommez-le en `NoteFacile.html` si vous voulez
3. Double-cliquez dessus (sur ordinateur) ou ouvrez-le avec votre navigateur (sur téléphone)
4. L'application démarre immédiatement, **sans internet** !

> ✅ Toutes vos données (classes, élèves, notes) sont sauvegardées dans le navigateur.
> ⚠️ Gardez le même navigateur pour retrouver vos données. Utilisez « Sauvegarder » (export JSON) pour changer d'appareil.

---

### Option 2 : Installer comme une vraie application (PWA) 📱 RECOMMANDÉ

Pour avoir une icône sur l'écran d'accueil et une expérience « application native » :

1. Hébergez le dossier `dist/` sur un service gratuit (voir ci-dessous)
2. Ouvrez le lien dans **Chrome** (Android) ou **Safari** (iPhone)
3. Menu → **« Ajouter à l'écran d'accueil »** / **« Installer l'application »**
4. L'icône NoteFacile apparaît sur votre téléphone 🎉

**Hébergements gratuits faciles :**
- **Netlify Drop** : https://app.netlify.com/drop → glissez-déposez le dossier `dist/`
- **Vercel** : https://vercel.com
- **GitHub Pages** : https://pages.github.com
- **Firebase Hosting** : https://firebase.google.com/products/hosting

Ces services vous donnent un lien du type `https://notefacile-benin.netlify.app` que vous pouvez partager avec tous les enseignants !

---

### Option 3 : Créer un fichier APK (application Android installable) 🤖

Si vous voulez un vrai fichier `.apk` à installer/partager :

1. Hébergez d'abord votre application (Option 2) pour obtenir un lien https
2. Allez sur **PWABuilder** : https://www.pwabuilder.com
3. Collez votre lien
4. Cliquez sur **« Build My PWA »** → **Android** → téléchargez l'APK
5. Partagez ce fichier `.apk` aux enseignants (ils l'installent directement)

> 💡 PWABuilder est un outil gratuit de Microsoft qui transforme une PWA en application Android/iOS/Windows.

---

## 📤 Comment partager avec d'autres enseignants ?

**Méthode simple (lien) :**
1. Hébergez sur Netlify Drop (gratuit, 2 minutes)
2. Partagez le lien par WhatsApp/SMS
3. Chaque enseignant l'ouvre et l'installe sur son téléphone

**Méthode fichier :**
- Envoyez directement le fichier `index.html` par WhatsApp/Bluetooth
- L'enseignant l'ouvre avec son navigateur

---

## 🔒 Rappel Confidentialité

- Chaque enseignant a **ses propres données sur son propre téléphone**
- Rien n'est partagé, rien n'est envoyé sur internet
- Même hébergée en ligne, l'application ne fait que se charger : **les données restent locales**

---

## 💾 Sauvegarder / Transférer ses données

Pour ne rien perdre en changeant de téléphone :

1. Dans l'app → **Réglages** → **« Sauvegarder (export JSON) »**
2. Conservez le fichier `.json` (WhatsApp, Google Drive, email…)
3. Sur le nouvel appareil → **Réglages** → **« Restaurer (import JSON) »**

---

## ❓ Problèmes fréquents

| Problème | Solution |
|----------|----------|
| L'app est vide après réouverture | Vous avez changé de navigateur. Restaurez votre sauvegarde JSON. |
| L'installation PWA n'apparaît pas | Utilisez Chrome/Safari, et hébergez en https (Option 2). |
| Le fichier ne s'ouvre pas | Ouvrez-le avec un navigateur (clic droit → Ouvrir avec → Chrome). |
| Je veux un APK | Suivez l'Option 3 (PWABuilder). |

---

**NoteFacile Bénin** — Votre application, dans votre poche, sans internet 🇧🇯
