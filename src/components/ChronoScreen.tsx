/**
 * CHRONOMÈTRE DE PERFORMANCES — EPS (v47).
 *
 * Demande : « un chronomètre qui permet de chronométrer les performances
 * des élèves, notamment en course de vitesse et en course d'endurance ».
 *
 * ── DEUX ÉPREUVES, DEUX LOGIQUES ─────────────────────────────────────
 *  • VITESSE (ex. 60 m, 100 m) : plusieurs coureurs partent ENSEMBLE ; on
 *    appuie sur « Top » au passage de chaque élève sur la ligne d'arrivée.
 *    Le chronomètre continue de tourner. C'est le principe du temps « au
 *    tour » (lap) : un seul départ, plusieurs arrivées.
 *  • ENDURANCE (ex. 600 m, 12 min) : même principe d'arrivées successives,
 *    mais on affiche en plus l'ALLURE (temps par 100 m), indicateur
 *    pédagogique de la gestion d'effort.
 *
 * ── PRÉCISION ────────────────────────────────────────────────────────
 * Le temps est calculé à partir de `performance.now()` (horloge monotone)
 * et NON d'un compteur incrémenté par setInterval : un intervalle dérive
 * de plusieurs secondes sur une course longue, et se fige quand l'écran
 * du téléphone se met en veille. Ici, le rafraîchissement n'est qu'un
 * affichage ; le temps réel est toujours recalculé par différence.
 *
 * ── CLASSEMENT ───────────────────────────────────────────────────────
 * Le classement est calculé sur le temps, jamais saisi. Les temps sont
 * affichés au centième, précision usuelle en athlétisme scolaire.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Pause, RotateCcw, Flag, Trash2, FileDown, Timer, Printer,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';

type RaceKind = 'vitesse' | 'endurance';

interface LapEntry {
  id: string;
  /** Temps écoulé depuis le départ, en millisecondes. */
  ms: number;
  athlete: string;
}

const CHRONO_KEY = 'msp_chrono_sessions';

/** mm:ss,cc — le centième est la précision usuelle en athlétisme scolaire. */
export function formatChrono(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const cents = Math.floor((safe % 1000) / 10);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(minutes)}:${two(seconds)},${two(cents)}`;
}

/**
 * ALLURE : temps ramené à 100 m.
 *   allure = temps total ÷ (distance ÷ 100)
 * Sur 600 m courus en 2 min 30 (150 s) → 150 ÷ 6 = 25 s aux 100 m.
 * Distance nulle ou absente ⇒ pas d'allure (on n'affiche pas « Infinity »).
 */
export function pacePer100m(ms: number, distanceM: number): string {
  if (!distanceM || distanceM <= 0) return '—';
  return `${formatChrono(ms / (distanceM / 100))} /100 m`;
}

export default function ChronoScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [kind, setKind] = useState<RaceKind>('vitesse');
  const [distance, setDistance] = useState('100');
  const [className, setClassName] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<LapEntry[]>([]);

  // Références d'horloge : origine du départ et cumul des pauses.
  const startedAt = useRef<number>(0);
  const accumulated = useRef<number>(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setElapsed(accumulated.current + (performance.now() - startedAt.current));
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.current);
  }, [running]);

  function handleStart() {
    startedAt.current = performance.now();
    setRunning(true);
  }

  function handlePause() {
    accumulated.current += performance.now() - startedAt.current;
    setElapsed(accumulated.current);
    setRunning(false);
  }

  function handleReset() {
    if (laps.length > 0 && !window.confirm('Effacer le chronomètre et les temps relevés ?')) return;
    setRunning(false);
    accumulated.current = 0;
    setElapsed(0);
    setLaps([]);
  }

  /** « Top arrivée » : fige le temps de l'élève sans arrêter la course. */
  function handleLap() {
    if (!running && elapsed === 0) return;
    const ms = running
      ? accumulated.current + (performance.now() - startedAt.current)
      : elapsed;
    setLaps((prev) => [
      ...prev,
      { id: `lap-${Date.now()}-${prev.length}`, ms, athlete: '' },
    ]);
  }

  function setAthlete(id: string, name: string) {
    setLaps((prev) => prev.map((l) => (l.id === id ? { ...l, athlete: name } : l)));
  }

  function removeLap(id: string) {
    setLaps((prev) => prev.filter((l) => l.id !== id));
  }

  // Classement : calculé, jamais saisi.
  const ranked = [...laps].sort((a, b) => a.ms - b.ms);
  const rankOf = (id: string) => ranked.findIndex((l) => l.id === id) + 1;
  const distanceM = Number(distance) || 0;

  function saveSession() {
    try {
      const all = JSON.parse(localStorage.getItem(CHRONO_KEY) || '[]');
      all.unshift({
        id: `chrono-${Date.now()}`,
        kind, distance: distanceM, className,
        date: new Date().toISOString().slice(0, 10),
        laps: laps.map((l) => ({ athlete: l.athlete, ms: l.ms })),
      });
      localStorage.setItem(CHRONO_KEY, JSON.stringify(all.slice(0, 50)));
      window.alert('Séance de chronométrage enregistrée.');
    } catch {
      window.alert('Enregistrement impossible (mémoire saturée).');
    }
  }

  function exportPdf() {
    const pdf = makePdf({
      title: kind === 'vitesse' ? 'Course de vitesse — performances' : 'Course d’endurance — performances',
      subtitle: `${distanceM ? `${distanceM} m` : 'Distance non précisée'}${className ? ` — ${className}` : ''}`,
      establishment: profile.schoolName || 'Mon établissement',
      signature: {
        preparedBy: profile.teacherName || undefined,
        role: 'L’enseignant(e) d’EPS',
        date: new Date().toLocaleDateString('fr-FR'),
      },
    });

    pdf.table(
      [
        { header: 'Rang', width: 0.8, align: 'right' },
        { header: 'Élève', width: 2.6 },
        { header: 'Temps', width: 1.4, align: 'right' },
        { header: 'Allure', width: 1.6, align: 'right' },
      ],
      ranked.map((l, i) => [
        String(i + 1),
        l.athlete || '—',
        formatChrono(l.ms),
        pacePer100m(l.ms, distanceM),
      ]),
    );

    if (ranked.length > 0) {
      const best = ranked[0];
      const avg = ranked.reduce((t, l) => t + l.ms, 0) / ranked.length;
      pdf.sectionTitle('Synthèse');
      pdf.keyValues([
        ['Nombre de performances', String(ranked.length)],
        ['Meilleur temps', `${formatChrono(best.ms)}${best.athlete ? ` (${best.athlete})` : ''}`],
        ['Temps moyen de la classe', formatChrono(avg)],
      ]);
    }

    pdf.save(`performances-${kind}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Chronomètre de performances</h1>
            <p className="text-white/80 text-sm">Course de vitesse et d’endurance</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-8">
        {/* Choix de l'épreuve */}
        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="epreuve-vitesse"
            onClick={() => { setKind('vitesse'); setDistance('100'); }}
            className={`py-3 rounded-xl font-bold ${kind === 'vitesse' ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
          >
            Vitesse
          </button>
          <button
            data-testid="epreuve-endurance"
            onClick={() => { setKind('endurance'); setDistance('600'); }}
            className={`py-3 rounded-xl font-bold ${kind === 'endurance' ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
          >
            Endurance
          </button>
        </div>

        <div className="msp-card p-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Distance (m)</span>
            <input
              type="number" min={0} inputMode="numeric" data-testid="champ-distance"
              value={distance} onChange={(e) => setDistance(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Classe</span>
            <input
              type="text" data-testid="champ-classe-chrono" placeholder="Ex. CM2"
              value={className} onChange={(e) => setClassName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
        </div>

        {/* Affichage du chronomètre */}
        <div className="msp-card p-6 text-center">
          <div className="msp-flag-rule mb-3" />
          <p
            data-testid="affichage-chrono"
            className="text-5xl font-mono font-bold text-[#046a38] tabular-nums tracking-tight"
          >
            {formatChrono(elapsed)}
          </p>
          <p className="text-xs text-gray-500 mt-1">minutes : secondes , centièmes</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {!running ? (
            <button
              data-testid="btn-demarrer-chrono" onClick={handleStart}
              className="bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> {elapsed > 0 ? 'Reprendre' : 'Départ'}
            </button>
          ) : (
            <button
              data-testid="btn-pause-chrono" onClick={handlePause}
              className="bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Pause className="w-5 h-5" /> Pause
            </button>
          )}
          <button
            data-testid="btn-top-arrivee" onClick={handleLap}
            className="bg-[#b34700] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Flag className="w-5 h-5" /> Top
          </button>
          <button
            data-testid="btn-reset-chrono" onClick={handleReset}
            className="bg-gray-200 text-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Zéro
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Appuyez sur « Top » au passage de chaque élève : le chronomètre continue de tourner.
        </p>

        {/* Temps relevés */}
        <div className="msp-card p-4">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#046a38]" /> Performances ({laps.length})
          </h2>
          {laps.length === 0 && (
            <p className="text-sm text-gray-500 py-2">Aucune arrivée enregistrée pour l’instant.</p>
          )}
          <div className="space-y-2" data-testid="liste-performances">
            {laps.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="w-8 text-center font-bold text-[#f2a900]">{rankOf(l.id)}</span>
                <input
                  type="text" placeholder="Nom de l’élève" value={l.athlete}
                  onChange={(e) => setAthlete(l.id, e.target.value)}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                />
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-gray-800">{formatChrono(l.ms)}</p>
                  {kind === 'endurance' && (
                    <p className="text-[10px] text-gray-500">{pacePer100m(l.ms, distanceM)}</p>
                  )}
                </div>
                <button onClick={() => removeLap(l.id)} className="text-red-500 p-2" aria-label="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {laps.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <button
              data-testid="btn-pdf-chrono" onClick={exportPdf}
              className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <FileDown className="w-5 h-5" /> PDF
            </button>
            {/* v53 : l'impression accompagne TOUJOURS le PDF. */}
            <button
              data-testid="btn-imprimer-chrono" onClick={() => window.print()}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" /> Imprimer
            </button>
            <button
              data-testid="btn-enregistrer-chrono" onClick={saveSession}
              className="bg-[#046a38] text-white py-3 rounded-xl font-semibold"
            >
              Enregistrer
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
