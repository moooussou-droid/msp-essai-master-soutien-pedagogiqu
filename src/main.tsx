import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { applyTheme as applyPrefsTheme } from "./utils/appPreferences";
import { ensureCredentialsSurviveUpdate } from "./utils/credentialsVault";

// v38 — MODE NUIT : appliqué AVANT le rendu React pour éviter tout
// clignotement clair/sombre au démarrage, et pour que la bascule
// automatique (selon l'heure) soit effective dès l'ouverture.
try { applyPrefsTheme(); } catch { /* stockage indisponible */ }

// v36 — LES CODES D'ACCÈS SURVIVENT AUX MISES À JOUR.
// Avant tout rendu, on restaure les codes (utilisateur + équipe d'administration)
// depuis la copie de sécurité si la zone principale a été vidée par une mise à
// jour, puis on rafraîchit cette copie. Un code ne peut désormais être invalidé
// que par son expiration, ou par son retrait / sa suppression par le Super
// Administrateur.
try {
  const restored = ensureCredentialsSurviveUpdate();
  if (restored.length > 0) console.log("Codes d'accès restaurés après mise à jour :", restored);
} catch { /* stockage indisponible : l'application démarre normalement */ }

// Register service worker for PWA (uniquement en http/https, pas en file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        // Vérifie régulièrement l'existence d'une nouvelle version de l'app.
        // (sans ceci, le navigateur ne re-télécharge sw.js qu'une fois par 24 h)
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000); // toutes les heures
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });

    /*
     * v60 : plus de rechargement AUTOMATIQUE.
     * La nouvelle version attend ; le composant UpdateBanner affiche un
     * bouton « Mettre à jour » et c'est l'utilisateur qui déclenche la
     * bascule, pour ne pas interrompre une saisie en cours.
     */
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
