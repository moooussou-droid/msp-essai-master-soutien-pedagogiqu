/**
 * BANDEAU DE MISE À JOUR (v60).
 *
 * ── LE PROBLÈME RÉSOLU ───────────────────────────────────────────────
 * Jusqu'ici, une nouvelle version s'installait et la page se rechargeait
 * SEULE. Un enseignant en pleine saisie voyait son écran se réinitialiser
 * sans comprendre pourquoi.
 *
 * Désormais, la nouvelle version attend sagement. L'application affiche
 * un bandeau avec un bouton « Mettre à jour » : c'est l'utilisateur qui
 * choisit le moment, par exemple après avoir enregistré sa saisie.
 *
 * ── AUCUNE PERTE DE DONNÉES ──────────────────────────────────────────
 * La mise à jour ne remplace que les fichiers de l'application. Les
 * classes, les notes, l'abonnement et les registres vivent dans le
 * stockage du navigateur, auquel le service worker ne touche jamais.
 */
import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [masque, setMasque] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let annule = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || annule) return;

      // Une version est déjà prête et attend (l'utilisateur a rouvert l'app).
      if (reg.waiting) setWaiting(reg.waiting);

      // Une version arrive pendant que l'application est ouverte.
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          /*
           * `controller` non nul signifie qu'un service worker gérait DÉJÀ
           * la page : il s'agit d'une vraie mise à jour, pas de la première
           * installation. Sans ce test, le bandeau s'afficherait au tout
           * premier lancement, ce qui n'aurait aucun sens.
           */
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(sw);
          }
        });
      });
    }).catch(() => { /* service worker indisponible : rien à signaler */ });

    return () => { annule = true; };
  }, []);

  function mettreAJour() {
    if (!waiting) return;
    setEnCours(true);
    // La page se rechargera dès que le nouveau service worker prendra la main.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });

    /*
     * Filet de sécurité : si l'évènement n'arrive pas (navigateur ancien),
     * on recharge quand même au bout de 3 secondes plutôt que de laisser
     * le bouton tourner indéfiniment.
     */
    window.setTimeout(() => window.location.reload(), 3000);
  }

  if (!waiting || masque) return null;

  return (
    <div
      data-testid="bandeau-maj"
      className="bg-[#1b3a6b] text-white px-3 py-2 flex items-center gap-2 print:hidden"
    >
      <RefreshCw className={`w-4 h-4 shrink-0 ${enCours ? 'animate-spin' : ''}`} />
      <span className="text-xs font-semibold flex-1 min-w-0">
        Une nouvelle version est disponible.
        <span className="hidden sm:inline"> Vos données sont conservées.</span>
      </span>
      <button
        data-testid="btn-mettre-a-jour"
        onClick={mettreAJour}
        disabled={enCours}
        className="bg-[#f2a900] text-[#04351d] text-xs font-black px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
      >
        {enCours ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
      <button
        data-testid="btn-plus-tard"
        onClick={() => setMasque(true)}
        aria-label="Plus tard"
        className="p-1 shrink-0 text-white/70"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
