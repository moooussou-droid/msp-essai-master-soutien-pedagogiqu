# 📱 Master Soutien Pédagogique — Générer le fichier APK (Android)

> ⚠️ Un fichier `.apk` ne peut pas être créé « dans » le code : il faut le **générer** à partir
> de l'application publiée. Bonne nouvelle : c'est **gratuit et rapide** (10 minutes).
> Votre application est **déjà prête** pour cette conversion.

---

## 🧭 Vue d'ensemble (2 étapes)

1. **Publier** l'application en ligne (obtenir un lien `https://...`)
2. **Convertir** ce lien en APK avec **PWABuilder** (outil gratuit de Microsoft)

---

## ÉTAPE 1 — Publier l'application (obtenir un lien HTTPS)

### Option rapide : Netlify Drop (sans compte, 2 min)
1. Sur un ordinateur, ouvrez **https://app.netlify.com/drop**
2. **Glissez-déposez le dossier `dist/`** dans la page
3. Vous obtenez un lien, ex. `https://master-soutien.netlify.app`

> 💡 Créez un compte gratuit pour renommer le lien et le garder de façon permanente.

*(Alternatives : Vercel, GitHub Pages, Firebase Hosting — voir GUIDE-PUBLICATION-LIEN.md)*

---

## ÉTAPE 2 — Générer l'APK avec PWABuilder

1. Ouvrez **https://www.pwabuilder.com**
2. Collez votre lien (ex. `https://master-soutien.netlify.app`) puis **Start**
3. PWABuilder analyse l'app (le score PWA doit être bon ✅)
4. Cliquez sur **Package For Stores** → onglet **Android**
5. Choisissez **« Google Play »** ou **« Signed APK »** :
   - Pour **installer/partager directement** → choisissez le format **APK**
   - Pour **publier sur le Play Store** → choisissez **AAB (Android App Bundle)**
6. Cliquez sur **Download** → vous obtenez un fichier `.zip`
7. Décompressez : vous y trouverez votre **`app-release-signed.apk`** 🎉

### Paramètres recommandés dans PWABuilder
| Champ | Valeur conseillée |
|-------|-------------------|
| Package ID | `bj.mastersoutien.app` |
| App name | Master Soutien Pédagogique |
| Launcher name | Master Soutien |
| Theme color | `#059669` |
| Background color | `#059669` |
| Display mode | `standalone` |

---

## ÉTAPE 3 — Installer / Partager l'APK

1. Envoyez le fichier `.apk` par **WhatsApp**, Bluetooth ou USB
2. Sur le téléphone Android : ouvrez le fichier
3. Autorisez **« Installer depuis des sources inconnues »** si demandé
4. L'application s'installe comme une vraie app native 📲

---

## 🏪 Publier sur le Google Play Store (optionnel)

1. Créez un compte développeur : **https://play.google.com/console** (frais unique ~25 $)
2. Téléversez le fichier **`.aab`** généré par PWABuilder
3. Remplissez la fiche (description, captures, icône 512×512 déjà fournie)
4. Soumettez pour validation

---

## 🔧 Alternative avancée : Bubblewrap (ligne de commande)

Pour les développeurs qui veulent générer l'APK localement :

```bash
# Prérequis : Node.js + JDK 17 + Android SDK
npm install -g @bubblewrap/cli

# Initialiser depuis votre manifest en ligne
bubblewrap init --manifest https://VOTRE-LIEN/manifest.json

# Construire l'APK
bubblewrap build
# → génère app-release-signed.apk
```

---

## ✅ Votre application est déjà prête pour l'APK

- ✔️ `manifest.json` complet (nom, icônes any + maskable, thème, standalone)
- ✔️ Icônes 192×192 et 512×512 fournies
- ✔️ Service worker (`sw.js`) pour le fonctionnement hors-ligne
- ✔️ Application en fichier unique optimisé
- ✔️ Fonctionne hors-ligne (données locales + cloud chiffré optionnel)

---

## ❓ Questions fréquentes

**Puis-je générer l'APK sans ordinateur ?**
Oui : hébergez `dist/` (ex. via un ami), puis utilisez PWABuilder depuis un navigateur mobile.

**L'APK fonctionne-t-il hors-ligne ?**
Oui, grâce au service worker et au stockage local (IndexedDB).

**Les données sont-elles conservées après mise à jour de l'APK ?**
Oui, elles restent dans le stockage de l'app. Pensez tout de même à la **sauvegarde cloud chiffrée** ou au **backup JSON** pour changer d'appareil.

**Besoin d'aide ?** Contact WhatsApp : **+229 63 26 13 82**

---

**Master Soutien Pédagogique** — Notes, bulletins & accompagnement 🇧🇯
