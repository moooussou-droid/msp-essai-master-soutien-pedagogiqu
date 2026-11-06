/**
 * BANDE DÉFILANTE (v39).
 *
 * Affiche en haut de l'application les messages importants publiés par le
 * Super Administrateur, qui défilent de droite à gauche. L'utilisateur peut
 * masquer le bandeau pour la session en cours.
 *
 * Accessibilité : l'animation est désactivée si le système demande
 * « réduire les animations » (le texte reste alors lisible et fixe).
 */
import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { Announcement, activeAnnouncements, scrollDuration, LEVEL_STYLES } from '../utils/announcements';

export default function AnnouncementTicker() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(activeAnnouncements());
    refresh();
    // Réévalue régulièrement : un message peut devenir actif (date de début).
    const id = window.setInterval(refresh, 30000);
    window.addEventListener('msp-announcements-changed', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('msp-announcements-changed', refresh);
    };
  }, []);

  if (hidden || items.length === 0) return null;

  // Le message le plus prioritaire donne la couleur du bandeau.
  const style = LEVEL_STYLES[items[0].level];
  const texte = items.map((a) => a.text).join('     •     ');
  const duree = scrollDuration(texte);

  return (
    <div className={`${style} relative overflow-hidden`} role="status" aria-live="polite" data-msp-ticker>
      <style>{`
        @keyframes msp-ticker { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        .msp-ticker-track { display: inline-block; white-space: nowrap; will-change: transform;
          animation: msp-ticker ${duree}s linear infinite; }
        .msp-ticker-zone:hover .msp-ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .msp-ticker-track { animation: none; white-space: normal; }
        }
      `}</style>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Megaphone className="w-4 h-4 shrink-0" aria-hidden />
        <div className="msp-ticker-zone flex-1 overflow-hidden">
          <span className="msp-ticker-track text-sm font-semibold">{texte}</span>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="shrink-0 p-1 rounded hover:bg-black/20"
          aria-label="Masquer les annonces"
          title="Masquer les annonces"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
