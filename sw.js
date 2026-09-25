// Service Worker for Master Soutien Pédagogique (PWA / APK)
// Stratégie :
// - Navigation (index.html) : RÉSEAU D'ABORD, cache en secours hors-ligne.
//   → À chaque redéploiement, les utilisateurs reçoivent la NOUVELLE version
//     (et non plus l'ancienne indéfiniment, comme avec un cache-first).
// - Ressources statiques (icônes, manifest) : cache d'abord, réseau en secours.
const CACHE_NAME = 'master-soutien-v60';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './cover.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  /*
   * v60 — PAS de skipWaiting() automatique.
   *
   * Auparavant la nouvelle version s'activait seule et la page se
   * rechargeait sans prevenir : un enseignant en pleine saisie voyait
   * l'ecran se reinitialiser. Desormais la nouvelle version ATTEND, et
   * l'application affiche un bouton « Mettre a jour ». C'est l'utilisateur
   * qui choisit le moment.
   */
});

/*
 * La page demande l'activation immediate quand l'utilisateur touche
 * « Mettre a jour ». Seul ce message declenche la bascule.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Navigation : réseau d'abord (version à jour), cache en secours (hors-ligne).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Repli hors-ligne : chemin RELATIF au service worker (fonctionne
          // même hébergé dans un sous-dossier, ex. GitHub Pages).
          return caches
            .match(new URL('./index.html', self.location.href).href)
            .then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // Autres ressources (icônes, manifest) : cache d'abord, puis réseau.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response for caching
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
