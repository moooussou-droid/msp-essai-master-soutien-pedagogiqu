/**
 * ÉCRAN « FONCTIONNALITÉ À VENIR » (v38).
 *
 * Sert de garde-fou : même si l'utilisateur atteint l'adresse directement
 * (favori, lien, ancien raccourci), il voit une page claire au lieu d'un
 * module encore en développement.
 */

import { Clock, Hammer, ChevronLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';

export default function ComingSoonScreen({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Hammer className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{title}</h1>
              <p className="text-white/85 text-sm">Fonction temporairement indisponible</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-3">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-amber-200 p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
            <Clock className="w-3.5 h-3.5" /> TEMPORAIREMENT INDISPONIBLE
          </span>
          <p className="mt-3 text-gray-700 leading-relaxed">
            {description
              || `« ${title} » est en cours de développement et de perfectionnement. Cette fonctionnalité sera activée dans une prochaine mise à jour de l’application.`}
          </p>
          <p className="mt-3 text-gray-500 text-sm leading-relaxed">
            Toutes les autres fonctionnalités de Master Soutien Pédagogique restent pleinement
            disponibles : notes, bulletins, présences, enrôlement, cours, préparation de classe
            manuelle et outils du quotidien.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={goBack}
              className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600"
            >
              Retour
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Accueil
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
