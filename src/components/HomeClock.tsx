/**
 * HORLOGE D'ACCUEIL (v38) — heure, date et alerte d'alarme.
 * S'affiche en tête de l'écran d'accueil si l'option est activée.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Moon, Sun } from 'lucide-react';
import {
  dueAlarms, formatClock, formatLongDate, getPreferences, isNightActive,
  loadAlarms, markAlarmRang, playAlarmSound, savePreferences,
} from '../utils/appPreferences';
import { currentSlot, nextSlot } from '../utils/teacherTools';

export default function HomeClock() {
  const [now, setNow] = useState(new Date());
  const [prefs, setPrefs] = useState(() => getPreferences());
  const [ringing, setRinging] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d);
      const due = dueAlarms(d, loadAlarms());
      if (due.length) {
        markAlarmRang(due[0].id, d);
        setRinging(due[0].label);
        playAlarmSound();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!prefs.showClock) return null;

  const night = isNightActive(prefs, now);
  const slotNow = currentSlot(now);
  const slotNext = nextSlot(now);

  function toggleNight() {
    setPrefs(savePreferences({ theme: night ? 'clair' : 'nuit' }));
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-black tabular-nums text-gray-900 leading-none">{formatClock(now)}</p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{formatLongDate(now)}</p>
          {slotNow ? (
            <p className="text-xs text-emerald-700 font-semibold mt-1 truncate">
              En cours : {slotNow.subject} ({slotNow.classe})
            </p>
          ) : slotNext ? (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Prochain cours : {slotNext.subject} à {slotNext.start}
            </p>
          ) : null}
        </div>
        <button
          onClick={toggleNight}
          className={`p-2.5 rounded-xl shrink-0 ${night ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}
          aria-label={night ? 'Désactiver le mode nuit' : 'Activer le mode nuit'}
          title={night ? 'Mode nuit activé' : 'Activer le mode nuit'}
        >
          {night ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <Link
          to="/horloge"
          className="p-2.5 rounded-xl bg-gray-100 text-gray-600 shrink-0"
          aria-label="Horloge et alarmes"
          title="Horloge et alarmes"
        >
          <AlarmClock className="w-5 h-5" />
        </Link>
      </div>

      {ringing && (
        <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <AlarmClock className="w-5 h-5 text-indigo-600 animate-bounce shrink-0" />
          <p className="text-sm font-semibold text-indigo-800 flex-1">{ringing}</p>
          <button onClick={() => setRinging(null)} className="text-xs font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-lg">
            OK
          </button>
        </div>
      )}
    </div>
  );
}
