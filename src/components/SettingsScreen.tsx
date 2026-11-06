/**
 * RÉGLAGES DE L'APPLICATION (v38) — mode nuit et confort visuel.
 */

import { useState } from 'react';
import { ChevronLeft, Eye, Moon, Sun, SunMoon, Clock } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { AppPreferences, ThemeMode, getPreferences, isNightActive, savePreferences } from '../utils/appPreferences';

const THEMES: { id: ThemeMode; label: string; desc: string; icon: typeof Sun }[] = [
  { id: 'clair', label: 'Clair', desc: 'Affichage normal, de jour.', icon: Sun },
  { id: 'nuit', label: 'Mode nuit', desc: 'Fond sombre : protège les yeux le soir.', icon: Moon },
  { id: 'auto', label: 'Automatique', desc: 'Bascule seul selon l’heure.', icon: SunMoon },
];

const WARMTH = [
  { v: 0, label: 'Aucun' },
  { v: 1, label: 'Léger' },
  { v: 2, label: 'Moyen' },
  { v: 3, label: 'Fort' },
];

export default function SettingsScreen() {
  const goBack = useSmartBack();
  const [prefs, setPrefs] = useState<AppPreferences>(() => getPreferences());

  function update(patch: Partial<AppPreferences>) {
    setPrefs(savePreferences(patch));
  }

  const nightNow = isNightActive(prefs);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h1 className="text-xl font-bold">Réglages et confort visuel</h1>
          <p className="text-white/85 text-sm">Mode nuit, filtre lumière bleue et horloge</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-3 space-y-4">
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-1">
            <Moon className="w-5 h-5 text-indigo-600" /> Apparence
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Le mode nuit assombrit l’application pour protéger vos yeux de la lumière des écrans
            lorsque vous préparez vos cours le soir.
          </p>
          <div className="space-y-2">
            {THEMES.map((t) => {
              const Ic = t.icon;
              const active = prefs.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id })}
                  className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 dark:border-slate-700'}`}
                >
                  <Ic className={`w-6 h-6 shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="flex-1 min-w-0">
                    <span className={`block font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'}`}>{t.label}</span>
                    <span className="block text-xs text-gray-500">{t.desc}</span>
                  </span>
                  {active && <span className="text-indigo-600 font-bold text-sm">✓</span>}
                </button>
              );
            })}
          </div>

          {prefs.theme === 'auto' && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nuit à partir de</span>
                <input
                  type="time"
                  value={prefs.nightFrom}
                  onChange={(e) => update({ nightFrom: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Jusqu’à</span>
                <input
                  type="time"
                  value={prefs.nightTo}
                  onChange={(e) => update({ nightTo: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg"
                />
              </label>
            </div>
          )}

          <p className={`mt-3 text-sm font-semibold ${nightNow ? 'text-indigo-600 dark:text-indigo-300' : 'text-amber-600'}`}>
            État actuel : {nightNow ? 'mode nuit actif 🌙' : 'mode clair ☀️'}
          </p>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-amber-600" /> Filtre lumière bleue
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Applique une teinte chaude sur tout l’écran. Recommandé en soirée pour réduire la
            fatigue oculaire.
          </p>
          <div className="flex gap-2">
            {WARMTH.map((w) => (
              <button
                key={w.v}
                onClick={() => update({ warmth: w.v })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${prefs.warmth === w.v ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200'}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-emerald-600" /> Horloge
          </h2>
          <label className="flex items-center justify-between gap-3 mt-2">
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Afficher l’heure sur l’écran d’accueil
            </span>
            <button
              onClick={() => update({ showClock: !prefs.showClock })}
              className={`w-14 h-8 rounded-full transition relative shrink-0 ${prefs.showClock ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              aria-label="Afficher l’horloge"
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${prefs.showClock ? 'left-7' : 'left-1'}`} />
            </button>
          </label>
        </section>
      </main>
    </div>
  );
}
