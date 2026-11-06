/**
 * CAHIER MSP DES MENUS HEBDOMADAIRES (v40).
 *
 * Reprend fidèlement le cahier officiel photographié :
 *   Jours de cantine | Menu | Ration par élève (Vivres, Qté en Kg)
 *   | Nombre d'élèves inscrits (G, F, T)
 *   | Quantités de vivres à sortir pour la préparation | Solde
 * avec le pied de page « Établi par / Fonction / Date / Signature ».
 *
 * Les quantités à sortir sont CALCULÉES (ration × effectif du jour, puis
 * arrondi officiel de sortie v65) : l'utilisateur ne saisit que le menu,
 * les rations et l'effectif.
 */
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Trash2, Printer, FileDown, Save, Home, CalendarPlus, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  MenuWeek, MenuDay, MenuLine, loadMenuWeeks, createMenuWeek, saveMenuWeek,
  deleteMenuWeek, menuWeekHeadcount, menuWeekTotals, menuDayTotal, currentEstablishment,
} from '../utils/canteenStore';
import {
  round2, formatQty, roundCanteenNamedFoodOutput,
  CANTEEN_ROUNDING_METHOD_VERSION,
} from '../utils/canteenCalc';
import { printMenuWeek, exportMenuWeekExcel, exportMenuWeekPdf } from '../utils/canteenExport';
import {
  canteenSystemInfo, computePayerEaterTotals, payerEaterSurveyForDate,
} from '../utils/canteenPayerEaters';
import CanteenRoundingGuide from './CanteenRoundingGuide';

/** Vivres du cahier officiel, avec leur ration habituelle. */
const DEFAULT_FOODS: { food: string; ration: number }[] = [
  { food: 'Maïs', ration: 0.15 },
  { food: 'Riz', ration: 0.15 },
  { food: 'Pois vert', ration: 0.03 },
  { food: 'Huile', ration: 0.01 },
  { food: 'Sel', ration: 0.003 },
];

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function mondayOf(d = new Date()): string {
  const c = new Date(d);
  const day = c.getDay();
  c.setDate(c.getDate() + (day === 0 ? -6 : 1 - day));
  return c.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function isoFromFrDate(fr: string, fallback: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : fallback;
}

/**
 * Recalcule les lignes d'un jour.
 * Quantité brute = ration × effectif total, puis MÉTHODE DE SORTIE v65 :
 * partie décimale au quart (huile/céréales/légumineuses) ou au dixième
 * (sel), selon les intervalles officiels.
 * Solde = solde de la veille pour ce vivre − quantité sortie (report en
 * chaîne, comme dans le cahier papier mais sans risque d'erreur).
 */
function recomputeDay(day: MenuDay, previousBalances: Record<string, number>): MenuDay {
  const total = menuDayTotal(day);
  const lines = day.lines.map((l) => {
    const quantity = total > 0 ? roundCanteenNamedFoodOutput(l.ration * total, l.food) : 0;
    const prev = previousBalances[l.food];
    const base = prev === undefined ? l.balance + l.quantity : prev;
    return { ...l, quantity, balance: round2(base - quantity) };
  });
  return { ...day, lines };
}

export default function CanteenMenuScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const etab = currentEstablishment();

  const [weeks, setWeeks] = useState<MenuWeek[]>([]);
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { setWeeks(loadMenuWeeks()); }, []);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }

  function startWeek() {
    const start = mondayOf();
    const w = createMenuWeek(start, addDays(start, 4));
    // Pré-remplissage des 5 jours avec les vivres habituels.
    w.days = DAY_LABELS.map((label, i) => ({
      dayLabel: label,
      date: frDate(addDays(start, i)),
      menu: '',
      boys: 0,
      girls: 0,
      lines: DEFAULT_FOODS.map<MenuLine>((f) => ({ food: f.food, ration: f.ration, quantity: 0, balance: 0 })),
    }));
    const saved = saveMenuWeek(w);
    setWeeks(loadMenuWeeks());
    setWeek(saved);
  }

  /** Recalcule toute la semaine en chaînant les soldes d'un jour à l'autre. */
  function recomputeWeek(w: MenuWeek, stockStart: Record<string, number>): MenuWeek {
    const balances: Record<string, number> = { ...stockStart };
    const days = w.days.map((d) => {
      const recomputed = recomputeDay(d, balances);
      recomputed.lines.forEach((l) => { balances[l.food] = l.balance; });
      return recomputed;
    });
    return { ...w, days };
  }

  /**
   * v65 — à l'ouverture, un ancien cahier est recalculé avec les
   * intervalles de sortie courants puis enregistré comme tel. Le solde
   * de départ est reconstitué avant recalcul afin de ne pas décaler les
   * stocks : seule la quantité « à sortir » change de méthode.
   */
  function openWeek(w: MenuWeek) {
    if (w.roundingMethodVersion === CANTEEN_ROUNDING_METHOD_VERSION) {
      setWeek(w);
      return;
    }
    const stockStart: Record<string, number> = {};
    w.days[0]?.lines.forEach((l) => { stockStart[l.food] = round2(l.balance + l.quantity); });
    const saved = saveMenuWeek(recomputeWeek(w, stockStart));
    setWeeks(loadMenuWeeks());
    setWeek(saved);
    notify('Cahier recalculé avec la méthode d’arrondi de sortie v65.');
  }

  function update(mutator: (w: MenuWeek) => MenuWeek) {
    if (!week) return;
    const stockStart: Record<string, number> = {};
    week.days[0]?.lines.forEach((l) => { stockStart[l.food] = round2(l.balance + l.quantity); });
    const next = recomputeWeek(mutator(week), stockStart);
    setWeek(next);
  }

  function persist() {
    if (!week) return;
    saveMenuWeek(week);
    setWeeks(loadMenuWeeks());
    notify('Cahier enregistré.');
  }

  /**
   * v66 — les garçons/filles du cahier sont les mangeurs du jour. Ils
   * peuvent venir du relevé payeurs-mangeurs de la même date, selon le
   * système choisi par l'école.
   */
  function importMealBeneficiaries(dayIndex: number) {
    if (!week) return;
    const day = week.days[dayIndex];
    const iso = isoFromFrDate(day.date, addDays(week.startDate, dayIndex));
    const survey = payerEaterSurveyForDate(iso);
    if (!survey) {
      notify(`Aucun relevé payeurs-mangeurs enregistré au ${frDate(iso)}.`);
      return;
    }
    const totals = computePayerEaterTotals(survey.counts, survey.system);
    if (totals.eaterTotal <= 0) {
      notify(`Le relevé du ${frDate(iso)} ne contient aucun mangeur.`);
      return;
    }
    update((w) => {
      const days = [...w.days];
      days[dayIndex] = { ...days[dayIndex], boys: totals.eaterBoys, girls: totals.eaterGirls };
      return { ...w, days };
    });
    notify(`${totals.eaterTotal} mangeurs repris (${canteenSystemInfo(survey.system).shortLabel}).`);
  }

  const header = (title: string, onBack: () => void) => (
    <header className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4 sticky top-0 z-10 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/20" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{title}</h1>
          <p className="text-xs text-white/80 truncate">{etab.name}</p>
        </div>
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/20" aria-label="Accueil">
          <Home className="w-5 h-5" />
        </button>
      </div>
    </header>
  );

  /* ------------------------------ Liste ------------------------------ */
  if (!week) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {header('Cahier MSP des menus hebdomadaires', goBack)}
        <div className="p-4 space-y-4">
          <button
            data-testid="btn-nouveau-cahier"
            onClick={startWeek}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <CalendarPlus className="w-5 h-5" /> Ouvrir une nouvelle semaine
          </button>

          <div className="space-y-2" data-testid="liste-cahiers">
            {weeks.length === 0 && (
              <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-4">
                Aucun cahier enregistré. Ouvrez une semaine pour commencer.
              </p>
            )}
            {weeks.map((w) => (
              <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <button onClick={() => openWeek(w)} className="flex-1 text-left">
                  <p className="font-bold text-gray-800">Semaine du {frDate(w.startDate)}</p>
                  <p className="text-xs text-gray-500">
                    {menuWeekHeadcount(w).total} élèves cumulés · {w.days.length} jour(s)
                  </p>
                </button>
                <button
                  onClick={() => { if (window.confirm('Supprimer ce cahier ?')) { deleteMenuWeek(w.id); setWeeks(loadMenuWeeks()); } }}
                  className="p-2 text-red-600 bg-red-50 rounded-lg border border-red-200" aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Édition ------------------------------ */
  const head = menuWeekHeadcount(week);
  const totals = menuWeekTotals(week);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {header(`Semaine du ${frDate(week.startDate)}`, () => { persist(); setWeek(null); })}

      {toast && (
        <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3" data-testid="menu-toast">
          {toast}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Semaine du</span>
            <input
              type="date" value={week.startDate} data-testid="cahier-debut"
              onChange={(e) => update((w) => ({ ...w, startDate: e.target.value, endDate: addDays(e.target.value, 4) }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">au</span>
            <input
              type="date" value={week.endDate}
              onChange={(e) => update((w) => ({ ...w, endDate: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </label>
        </div>

        <CanteenRoundingGuide compact />

        {week.days.map((d, di) => (
          <div key={di} className="bg-white rounded-xl border border-gray-200 p-4" data-testid={`menu-jour-${di}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800">{d.dayLabel}</p>
              <p className="text-xs text-gray-500">{d.date}</p>
            </div>

            <label className="block mb-3">
              <span className="text-xs font-semibold text-gray-600">Menu du jour</span>
              <input
                type="text" value={d.menu} placeholder="Ex. : Maïs + Pois vert + Huile (Gbêmou Watchê)"
                data-testid={`menu-texte-${di}`}
                onChange={(e) => update((w) => {
                  const days = [...w.days]; days[di] = { ...days[di], menu: e.target.value }; return { ...w, days };
                })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </label>

            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-gray-700">Effectif mangeur du jour</p>
              <button
                type="button"
                data-testid={`reprendre-mangeurs-menu-${di}`}
                onClick={() => importMealBeneficiaries(di)}
                className="bg-orange-50 border border-orange-300 text-orange-900 rounded-lg px-2.5 py-2 text-xs font-bold"
              >
                Reprendre le relevé payeurs-mangeurs
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Garçons</span>
                <input
                  type="number" min={0} inputMode="numeric" value={d.boys || ''}
                  data-testid={`menu-g-${di}`}
                  onChange={(e) => update((w) => {
                    const days = [...w.days]; days[di] = { ...days[di], boys: parseInt(e.target.value, 10) || 0 }; return { ...w, days };
                  })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2.5 text-center"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Filles</span>
                <input
                  type="number" min={0} inputMode="numeric" value={d.girls || ''}
                  data-testid={`menu-f-${di}`}
                  onChange={(e) => update((w) => {
                    const days = [...w.days]; days[di] = { ...days[di], girls: parseInt(e.target.value, 10) || 0 }; return { ...w, days };
                  })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2.5 text-center"
                />
              </label>
              <div>
                <span className="text-xs font-semibold text-gray-600">Total</span>
                <p className="mt-1 w-full bg-gray-100 rounded-lg px-2 py-2.5 text-center font-bold" data-testid={`menu-t-${di}`}>
                  {menuDayTotal(d)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="p-2 text-left">Vivres</th>
                    <th className="p-2 text-right">Ration/élève</th>
                    <th className="p-2 text-right">À sortir</th>
                    <th className="p-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l, li) => (
                    <tr key={li} className="border-b border-gray-100 last:border-0">
                      <td className="p-2 font-medium text-gray-800">{l.food}</td>
                      <td className="p-1">
                        <input
                          type="number" step="0.001" min={0} value={l.ration}
                          data-testid={`ration-${di}-${li}`}
                          onChange={(e) => update((w) => {
                            const days = [...w.days];
                            const lines = [...days[di].lines];
                            lines[li] = { ...lines[li], ration: parseFloat(e.target.value) || 0 };
                            days[di] = { ...days[di], lines };
                            return { ...w, days };
                          })}
                          className="w-full border border-gray-300 rounded px-1.5 py-2 text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-teal-700" data-testid={`qte-${di}-${li}`}>
                        {formatQty(l.quantity)}
                      </td>
                      <td className={`p-1 ${l.balance < 0 ? 'text-red-600' : ''}`}>
                        <input
                          type="number" step="0.01" value={l.balance}
                          data-testid={`solde-${di}-${li}`}
                          onChange={(e) => update((w) => {
                            const days = [...w.days];
                            const lines = [...days[di].lines];
                            lines[li] = { ...lines[li], balance: parseFloat(e.target.value) || 0 };
                            days[di] = { ...days[di], lines };
                            return { ...w, days };
                          })}
                          className="w-full border border-gray-300 rounded px-1.5 py-2 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              La colonne « À sortir » est calculée automatiquement : ration × effectif, puis partie décimale classée selon les intervalles v65 (quart, ou dixième pour le sel).
            </p>
          </div>
        ))}

        {/* Totaux de la semaine */}
        <div className="bg-white rounded-xl border border-gray-200 p-4" data-testid="menu-totaux">
          <p className="font-bold text-gray-800 mb-2">Totaux de la semaine</p>
          <div className="flex gap-4 text-sm mb-3">
            <span>G : <strong>{head.boys}</strong></span>
            <span>F : <strong>{head.girls}</strong></span>
            <span>T : <strong data-testid="menu-total-eleves">{head.total}</strong></span>
          </div>
          <div className="space-y-1">
            {totals.map((t) => (
              <div key={t.food} className="flex justify-between text-sm border-b border-gray-100 py-1.5 last:border-0">
                <span className="text-gray-700">{t.food}</span>
                <span className="font-semibold">{formatQty(t.quantity)} sortis · solde {formatQty(t.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pied de page officiel */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="font-bold text-gray-800">Pied de page du cahier</p>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Établi par (M./Mme)</span>
            <input
              type="text" value={week.preparedBy} data-testid="cahier-etabli-par"
              onChange={(e) => update((w) => ({ ...w, preparedBy: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Fonction</span>
            <input
              type="text" value={week.role}
              onChange={(e) => update((w) => ({ ...w, role: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Date</span>
            <input
              type="date" value={week.signedDate}
              onChange={(e) => update((w) => ({ ...w, signedDate: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5"
            />
          </label>
          <p className="text-xs text-gray-500">La signature se fait à la main sur le document imprimé.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={persist} data-testid="btn-enregistrer-cahier"
            className="bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Save className="w-5 h-5" /> Enregistrer
          </button>
          <button onClick={() => printMenuWeek(week)} data-testid="btn-imprimer-cahier"
            className="bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" /> Imprimer
          </button>
        </div>
        <button
          onClick={async () => { await exportMenuWeekPdf(week); notify('Fichier PDF téléchargé.'); }}
          data-testid="btn-pdf-cahier"
          className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Télécharger le PDF
        </button>
        <button
          onClick={async () => { await exportMenuWeekExcel(week); notify('Fichier Excel généré.'); }}
          data-testid="btn-excel-cahier"
          className="w-full bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Exporter en Excel
        </button>
      </div>
    </div>
  );
}
