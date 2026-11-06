/**
 * HORLOGE, ALARMES ET MINUTEUR DE SÉANCE (v38).
 */

import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Bell, ChevronLeft, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  Alarm, DAY_LABELS, addAlarm, describeDays, dueAlarms, formatClockSeconds,
  formatLongDate, loadAlarms, markAlarmRang, playAlarmSound, removeAlarm, toggleAlarm,
} from '../utils/appPreferences';
import { currentSlot, nextSlot } from '../utils/teacherTools';

export default function ClockAlarmScreen() {
  const goBack = useSmartBack();
  const [now, setNow] = useState(new Date());
  const [alarms, setAlarms] = useState<Alarm[]>(() => loadAlarms());
  const [ringing, setRinging] = useState<Alarm | null>(null);

  const [label, setLabel] = useState('Début des cours');
  const [time, setTime] = useState('07:30');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Minuteur de séance
  const [duration, setDuration] = useState(45);
  const [remaining, setRemaining] = useState(45 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d);
      const due = dueAlarms(d, loadAlarms());
      if (due.length) {
        markAlarmRang(due[0].id, d);
        setAlarms(loadAlarms());
        setRinging(due[0]);
        playAlarmSound();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setRunning(false);
          playAlarmSound();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const slotNow = useMemo(() => currentSlot(now), [now]);
  const slotNext = useMemo(() => nextSlot(now), [now]);

  function add() {
    if (!time) return;
    addAlarm(label.trim() || 'Alarme', time, days);
    setAlarms(loadAlarms());
    setLabel('');
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = duration > 0 ? ((duration * 60 - remaining) / (duration * 60)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h1 className="text-xl font-bold">Horloge et alarmes</h1>
          <p className="text-white/85 text-sm">Heure, sonneries de classe et minuteur de séance</p>

          <div className="mt-4 text-center">
            <p className="text-5xl font-black tabular-nums tracking-tight">{formatClockSeconds(now)}</p>
            <p className="text-white/85 text-sm mt-1 capitalize">{formatLongDate(now)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-3 space-y-4">
        {/* Cours en cours */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Ma journée</h2>
          {slotNow ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
              En cours : {slotNow.subject} — {slotNow.classe} ({slotNow.start} à {slotNow.end})
            </p>
          ) : (
            <p className="text-sm text-gray-500">Aucun cours en ce moment.</p>
          )}
          {slotNext && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Prochain : {slotNext.subject} — {slotNext.classe} à {slotNext.start}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">Renseignez votre emploi du temps pour voir cette information.</p>
        </section>

        {/* Minuteur */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-indigo-600" /> Minuteur de séance
          </h2>
          <p className="text-center text-4xl font-black tabular-nums text-gray-800 dark:text-gray-100">{mm}:{ss}</p>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-2 mt-3">
            {[15, 30, 45, 55].map((d) => (
              <button
                key={d}
                onClick={() => { setDuration(d); setRemaining(d * 60); setRunning(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold ${duration === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200'}`}
              >
                {d} min
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {running ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Démarrer</>}
            </button>
            <button
              onClick={() => { setRemaining(duration * 60); setRunning(false); }}
              className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Réinitialiser
            </button>
          </div>
        </section>

        {/* Nouvelle alarme */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-3">
            <AlarmClock className="w-5 h-5 text-indigo-600" /> Nouvelle alarme
          </h2>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Intitulé (ex. Début des cours, Récréation)"
            className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2"
          />
          <div className="flex gap-1 mb-3">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${days.includes(i) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button onClick={add} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Ajouter l’alarme
          </button>
        </section>

        {/* Liste */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Mes alarmes ({alarms.length})</h2>
          {alarms.length === 0 && <p className="text-sm text-gray-500">Aucune alarme enregistrée.</p>}
          <div className="space-y-2">
            {alarms.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                <Bell className={`w-5 h-5 shrink-0 ${a.enabled ? 'text-indigo-600' : 'text-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold tabular-nums ${a.enabled ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
                    {a.time} <span className="font-medium text-sm">— {a.label}</span>
                  </p>
                  <p className="text-xs text-gray-500">{describeDays(a.days)}</p>
                </div>
                <button
                  onClick={() => { toggleAlarm(a.id); setAlarms(loadAlarms()); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${a.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {a.enabled ? 'Activée' : 'Désactivée'}
                </button>
                <button
                  onClick={() => { removeAlarm(a.id); setAlarms(loadAlarms()); }}
                  className="p-2 text-red-500"
                  aria-label="Supprimer l’alarme"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sonnerie */}
      {ringing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <Bell className="w-12 h-12 text-indigo-600 mx-auto animate-bounce" />
            <p className="text-3xl font-black mt-3 text-gray-800 dark:text-gray-100">{ringing.time}</p>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{ringing.label}</p>
            <button
              onClick={() => setRinging(null)}
              className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold"
            >
              Arrêter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
