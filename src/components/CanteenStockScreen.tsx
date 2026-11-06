/**
 * CAHIER MSP DE GESTION DES STOCKS (v40).
 *
 * Une SECTION PAR DENRÉE, comme le cahier photographié (celui de la photo
 * est le registre « SEL IODÉ »). Les légumineuses suivies sont le pois
 * vert, le pois jaune et le haricot.
 *
 * Colonnes officielles :
 *   DATE | STOCK INITIAL ancien stock | ENTRÉE DOTATION ANAN
 *   | STOCK DISPONIBLE | SORTIE | STOCK RESTANT | Ref | OBSERVATIONS
 *
 * Deux colonnes ne sont JAMAIS saisies :
 *   STOCK DISPONIBLE = stock initial + entrée
 *   STOCK RESTANT    = stock disponible − sortie
 * et le stock initial d'une ligne reprend automatiquement le stock restant
 * de la ligne précédente (report en chaîne).
 */
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Printer, FileDown, Home, AlertTriangle, ChevronRight, Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  STOCK_UNITS, StockLedger, getLedger, addStockRow,
  updateStockRow, removeStockRow, stockOverview, stockAlert, currentEstablishment,
  normalizeStockExit,
} from '../utils/canteenStore';
import {
  formatQty, canteenRoundingInterval, canteenRoundingKindForName,
} from '../utils/canteenCalc';
import { printLedger, exportLedgerExcel, exportLedgerPdf } from '../utils/canteenExport';
import CanteenRoundingGuide from './CanteenRoundingGuide';

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function CanteenStockScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const etab = currentEstablishment();

  const [food, setFood] = useState<string>('');
  const [ledger, setLedger] = useState<StockLedger | null>(null);
  const [overview, setOverview] = useState(stockOverview());
  const [toast, setToast] = useState('');

  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), entry: '', exit: '', ref: '', observations: '' });

  useEffect(() => { setOverview(stockOverview()); }, []);
  useEffect(() => { if (food) setLedger(getLedger(food)); }, [food]);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3000); }

  function addRow() {
    if (!food) return;
    const entry = parseFloat(draft.entry) || 0;
    const rawExit = parseFloat(draft.exit) || 0;
    const exit = normalizeStockExit(food, rawExit);
    if (entry === 0 && exit === 0) { notify('Indiquez une entrée ou une sortie.'); return; }
    if (entry < 0 || rawExit < 0) { notify('Les quantités ne peuvent pas être négatives.'); return; }

    // Le stock initial est repris automatiquement : jamais saisi.
    // v65 : seule la SORTIE est arrondie par intervalles ; l'entrée
    // dotation reste exactement la quantité reçue.
    const next = addStockRow(food, {
      date: draft.date, initialStock: 0, entry, exit,
      ref: draft.ref, observations: draft.observations,
    });
    setLedger(next);
    setOverview(stockOverview());
    setDraft({ date: draft.date, entry: '', exit: '', ref: '', observations: '' });
    notify(exit !== rawExit
      ? `Ligne ajoutée. Sortie arrondie selon la méthode v65 : ${formatQty(exit)}.`
      : 'Ligne ajoutée.');
  }

  const header = (title: string, onBack: () => void) => (
    <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 sticky top-0 z-10 print:hidden">
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

  /* ----------------------- Choix de la denrée ----------------------- */
  if (!food || !ledger) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {header('Cahier MSP de gestion des stocks', goBack)}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Chaque denrée possède son propre cahier de stock. Choisissez la denrée à consulter.
          </p>
          <div className="space-y-2" data-testid="liste-denrees">
            {overview.map((o) => (
              <button
                key={o.food}
                data-testid={`denree-${o.food.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setFood(o.food)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 text-left active:scale-[0.99] transition"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-indigo-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{o.food}</p>
                  <p className="text-xs text-gray-500">
                    Stock actuel : <strong>{formatQty(o.stock)} {o.unit}</strong> · {o.rows} ligne(s)
                  </p>
                  {o.alert && (
                    <p className="text-xs text-red-600 font-semibold mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {o.alert}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------- Registre d'une denrée ----------------------- */
  const alert = stockAlert(food);
  const unit = STOCK_UNITS[food] || 'Kg';
  const last = ledger.rows[ledger.rows.length - 1];
  const draftExitRaw = parseFloat(draft.exit) || 0;
  const draftExitRounded = normalizeStockExit(food, draftExitRaw);
  const draftExitInterval = draftExitRaw > 0
    ? canteenRoundingInterval(draftExitRaw, canteenRoundingKindForName(food))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {header(`Stock — ${food}`, () => { setFood(''); setLedger(null); setOverview(stockOverview()); })}

      {toast && (
        <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3" data-testid="stock-toast">
          {toast}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Stock restant actuel</p>
          <p className={`text-3xl font-bold ${(last?.remaining ?? 0) < 0 ? 'text-red-600' : 'text-indigo-700'}`} data-testid="stock-actuel">
            {formatQty(last?.remaining ?? 0)} <span className="text-lg">{unit}</span>
          </p>
          {alert && (
            <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2" data-testid="stock-alerte">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {alert}
            </p>
          )}
        </div>

        <CanteenRoundingGuide compact />

        {/* Nouvelle ligne */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="font-bold text-gray-800">Nouvelle écriture</p>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Date</span>
            <input type="date" value={draft.date} data-testid="stock-date"
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Entrée dotation ({unit})</span>
              <input type="number" step="0.01" min={0} inputMode="decimal" value={draft.entry}
                data-testid="stock-entree" placeholder="0"
                onChange={(e) => setDraft({ ...draft, entry: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Sortie ({unit})</span>
              <input type="number" step="0.01" min={0} inputMode="decimal" value={draft.exit}
                data-testid="stock-sortie" placeholder="0"
                onChange={(e) => setDraft({ ...draft, exit: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3" />
            </label>
          </div>
          {draftExitRaw > 0 && (
            <p className="text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2" data-testid="stock-sortie-arrondie">
              Sortie qui sera enregistrée : <strong>{formatQty(draftExitRounded)} {unit}</strong>
              {draftExitInterval
                ? <> — partie décimale dans {draftExitInterval.interval} → {formatQty(draftExitInterval.output)}.</>
                : <> — quantité entière exacte, inchangée.</>}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Réf.</span>
              <input type="text" value={draft.ref} data-testid="stock-ref"
                onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Observations</span>
              <input type="text" value={draft.observations} data-testid="stock-obs"
                placeholder="Ex. : Dotation T3"
                onChange={(e) => setDraft({ ...draft, observations: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3" />
            </label>
          </div>
          <p className="text-[11px] text-gray-500">
            Le stock initial, le stock disponible et le stock restant sont calculés automatiquement. La sortie est arrondie selon la méthode v65 ; l’entrée dotation ne l’est pas.
          </p>
          <button onClick={addRow} data-testid="btn-ajouter-ligne"
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Ajouter la ligne
          </button>
        </div>

        {/* Registre */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap" data-testid="table-stock">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-2 text-left">DATE</th>
                  <th className="p-2 text-right">STOCK INITIAL</th>
                  <th className="p-2 text-right">ENTRÉE DOTATION</th>
                  <th className="p-2 text-right">STOCK DISPONIBLE</th>
                  <th className="p-2 text-right">SORTIE</th>
                  <th className="p-2 text-right">STOCK RESTANT</th>
                  <th className="p-2 text-left">Ref</th>
                  <th className="p-2 text-left">OBSERVATIONS</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.length === 0 && (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">Aucune écriture pour le moment.</td></tr>
                )}
                {ledger.rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0" data-testid={`ligne-stock-${r.id}`}>
                    <td className="p-2">{frDate(r.date)}</td>
                    <td className="p-2 text-right text-gray-600">{formatQty(r.initialStock)}</td>
                    <td className="p-2 text-right">
                      <input type="number" step="0.01" value={r.entry}
                        onChange={(e) => { setLedger(updateStockRow(food, r.id, { entry: parseFloat(e.target.value) || 0 })); setOverview(stockOverview()); }}
                        className="w-20 border border-gray-200 rounded px-1 py-1.5 text-right" />
                    </td>
                    <td className="p-2 text-right font-semibold text-gray-700">{formatQty(r.available)}</td>
                    <td className="p-2 text-right">
                      <input type="number" step="0.01" value={r.exit}
                        data-testid={`edit-sortie-${r.id}`}
                        title="La sortie est arrondie selon les intervalles v65 lorsque le champ perd le focus."
                        onChange={(e) => { setLedger(updateStockRow(food, r.id, { exit: parseFloat(e.target.value) || 0 })); setOverview(stockOverview()); }}
                        onBlur={(e) => { setLedger(updateStockRow(food, r.id, { exit: parseFloat(e.target.value) || 0 }, { roundExit: true })); setOverview(stockOverview()); }}
                        className="w-20 border border-gray-200 rounded px-1 py-1.5 text-right" />
                    </td>
                    <td className={`p-2 text-right font-bold ${r.remaining < 0 ? 'text-red-600' : 'text-indigo-700'}`}>
                      {formatQty(r.remaining)}
                    </td>
                    <td className="p-2">{r.ref}</td>
                    <td className="p-2 max-w-[160px] truncate">{r.observations}</td>
                    <td className="p-2">
                      <button
                        onClick={() => { if (window.confirm('Supprimer cette ligne ?')) { setLedger(removeStockRow(food, r.id)); setOverview(stockOverview()); } }}
                        className="text-red-600" aria-label="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={async () => { await exportLedgerPdf(ledger, etab.name); notify('Fichier PDF téléchargé.'); }}
          data-testid="btn-pdf-stock"
          className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Télécharger le PDF
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => printLedger(ledger, etab.name)} data-testid="btn-imprimer-stock"
            className="bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" /> Imprimer
          </button>
          <button onClick={async () => { await exportLedgerExcel(ledger, etab.name); notify('Fichier Excel généré.'); }}
            data-testid="btn-excel-stock"
            className="bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <FileDown className="w-5 h-5" /> Excel
          </button>
        </div>
      </div>
    </div>
  );
}
