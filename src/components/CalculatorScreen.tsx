/**
 * CALCULATRICE ET OUTILS DE L'ENSEIGNANT (v47).
 *
 * Trois onglets :
 *  • Calculatrice  : clavier complet + fonctions scientifiques.
 *  • Notes         : moyenne pondérée, conversion de barème, taux de réussite.
 *  • Conversions   : règle de trois et unités usuelles de la classe.
 *
 * Tout le calcul vit dans `utils/calculator.ts` (règle : les formules ne
 * sont pas dans les composants visuels). Cet écran ne fait qu'afficher.
 */
import { useState } from 'react';
import { ArrowLeft, Delete, Plus, Trash2 } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  evaluateExpression, formatNumber, weightedAverage, convertMark, successRate, ruleOfThree,
} from '../utils/calculator';

type Tab = 'calc' | 'notes' | 'conv';

const KEYS: string[][] = [
  ['(', ')', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', ',', '^', '='],
];

const SCI_KEYS = ['racine(', 'sin(', 'cos(', 'tan(', 'ln(', 'log(', 'π', '!'];

export default function CalculatorScreen() {
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('calc');

  /* --- Calculatrice --- */
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);

  function press(k: string) {
    setError('');
    if (k === '=') {
      const out = evaluateExpression(expr);
      if (out.ok) {
        const r = formatNumber(out.value);
        setResult(r);
        setHistory((h) => [{ e: expr, r }, ...h].slice(0, 20));
      } else {
        setError(out.error || 'Expression invalide.');
        setResult('');
      }
      return;
    }
    setExpr((e) => e + k);
  }

  function backspace() { setExpr((e) => e.slice(0, -1)); setError(''); }
  function clearAll() { setExpr(''); setResult(''); setError(''); }

  /* --- Moyenne pondérée --- */
  const [rows, setRows] = useState([{ note: '', coef: '1' }]);
  const avg = weightedAverage(rows.map((r) => ({ note: Number(r.note) || 0, coef: Number(r.coef) || 0 })));

  /* --- Conversion de barème --- */
  const [mark, setMark] = useState(''); const [fromS, setFromS] = useState('30'); const [toS, setToS] = useState('20');
  /* --- Taux de réussite --- */
  const [passed, setPassed] = useState(''); const [total, setTotal] = useState('');
  /* --- Règle de trois --- */
  const [ra, setRa] = useState(''); const [rb, setRb] = useState(''); const [rc, setRc] = useState('');

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      data-testid={`onglet-${id}`}
      onClick={() => setTab(id)}
      className={`flex-1 py-3 text-sm font-bold rounded-lg ${tab === id ? 'bg-[#046a38] text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
    >
      {label}
    </button>
  );

  const field = (label: string, value: string, set: (v: string) => void, testid: string) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <input
        type="number" inputMode="decimal" data-testid={testid}
        value={value} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Calculatrice et outils</h1>
            <p className="text-white/80 text-sm">Calculs et aides au quotidien</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10">
        <div className="flex gap-2">
          {tabBtn('calc', 'Calculatrice')}
          {tabBtn('notes', 'Notes')}
          {tabBtn('conv', 'Conversions')}
        </div>

        {tab === 'calc' && (
          <>
            <div className="msp-card p-4">
              <div className="msp-flag-rule mb-3" />
              <input
                type="text" data-testid="champ-expression" value={expr}
                onChange={(e) => { setExpr(e.target.value); setError(''); }}
                placeholder="Tapez ou utilisez le clavier"
                className="w-full text-right text-2xl font-mono border-0 focus:ring-0 p-0 bg-transparent"
              />
              <p data-testid="resultat-calc" className="text-right text-4xl font-bold text-[#046a38] mt-2 break-all">
                {result || '0'}
              </p>
              {error && (
                <p data-testid="erreur-calc" className="text-right text-sm text-red-600 mt-1 font-semibold">{error}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {SCI_KEYS.map((k) => (
                <button
                  key={k} onClick={() => press(k)}
                  className="px-3 py-2 bg-[#f2a900]/20 text-[#7a5200] rounded-lg text-sm font-bold"
                >
                  {k.replace('(', '')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button onClick={clearAll} data-testid="btn-clear" className="col-span-2 py-4 bg-red-100 text-red-700 rounded-xl font-bold">
                Effacer
              </button>
              <button onClick={backspace} className="col-span-2 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2">
                <Delete className="w-5 h-5" /> Corriger
              </button>
              {KEYS.flat().map((k) => (
                <button
                  key={k} data-testid={`touche-${k}`} onClick={() => press(k)}
                  className={`py-5 rounded-xl text-xl font-bold ${
                    k === '=' ? 'bg-[#046a38] text-white'
                    : '+−×÷^%()'.includes(k) ? 'bg-orange-100 text-orange-800'
                    : 'bg-white border border-gray-200 text-gray-800'}`}
                >
                  {k}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <div className="msp-card p-4">
                <h3 className="font-bold text-sm text-gray-700 mb-2">Historique</h3>
                {history.map((h, i) => (
                  <p key={i} className="text-sm text-gray-600 font-mono border-b border-gray-100 py-1">
                    {h.e} = <strong className="text-gray-900">{h.r}</strong>
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'notes' && (
          <>
            <div className="msp-card p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Moyenne pondérée</h3>
              <p className="text-xs text-gray-500">
                Moyenne = somme des (note × coefficient) ÷ somme des coefficients.
              </p>
              {rows.map((r, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <label className="flex-1">
                    <span className="text-[11px] text-gray-500">Note</span>
                    <input
                      type="number" inputMode="decimal" data-testid={`note-${i}`} value={r.note}
                      onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2"
                    />
                  </label>
                  <label className="w-24">
                    <span className="text-[11px] text-gray-500">Coef.</span>
                    <input
                      type="number" inputMode="decimal" data-testid={`coef-${i}`} value={r.coef}
                      onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, coef: e.target.value } : x))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2"
                    />
                  </label>
                  <button
                    onClick={() => setRows((p) => p.filter((_, j) => j !== i))}
                    className="text-red-500 p-2 mb-1" aria-label="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                data-testid="btn-ajouter-note"
                onClick={() => setRows((p) => [...p, { note: '', coef: '1' }])}
                className="w-full py-2 bg-gray-100 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter une note
              </button>
              <p className="text-center text-2xl font-bold text-[#046a38]" data-testid="resultat-moyenne">
                {formatNumber(avg)}
              </p>
            </div>

            <div className="msp-card p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Convertir une note</h3>
              <p className="text-xs text-gray-500">Note ramenée = note × (barème visé ÷ barème d’origine).</p>
              <div className="grid grid-cols-3 gap-2">
                {field('Note', mark, setMark, 'conv-note')}
                {field('Sur', fromS, setFromS, 'conv-de')}
                {field('Vers', toS, setToS, 'conv-vers')}
              </div>
              <p className="text-center text-2xl font-bold text-[#046a38]" data-testid="resultat-conversion">
                {formatNumber(convertMark(Number(mark) || 0, Number(fromS) || 0, Number(toS) || 0))}
              </p>
            </div>

            <div className="msp-card p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Taux de réussite</h3>
              <div className="grid grid-cols-2 gap-2">
                {field('Élèves ayant réussi', passed, setPassed, 'reussite-nb')}
                {field('Effectif total', total, setTotal, 'reussite-total')}
              </div>
              <p className="text-center text-2xl font-bold text-[#046a38]" data-testid="resultat-reussite">
                {formatNumber(successRate(Number(passed) || 0, Number(total) || 0))} %
              </p>
            </div>
          </>
        )}

        {tab === 'conv' && (
          <div className="msp-card p-4 space-y-3">
            <h3 className="font-bold text-gray-800">Règle de trois</h3>
            <p className="text-xs text-gray-500">
              Si <strong>A</strong> correspond à <strong>B</strong>, alors <strong>C</strong> correspond à (B × C) ÷ A.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {field('A', ra, setRa, 'regle-a')}
              {field('donne B', rb, setRb, 'regle-b')}
              {field('alors C', rc, setRc, 'regle-c')}
            </div>
            <p className="text-center text-2xl font-bold text-[#046a38]" data-testid="resultat-regle-trois">
              {formatNumber(ruleOfThree(Number(ra) || 0, Number(rb) || 0, Number(rc) || 0))}
            </p>
            <p className="text-xs text-gray-500">
              Exemple : 2 cahiers coûtent 500 F, combien coûtent 5 cahiers ? A = 2, B = 500, C = 5 → 1250 F.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
