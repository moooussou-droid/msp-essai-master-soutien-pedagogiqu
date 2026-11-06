/**
 * MON GESTIONNAIRE COMPTABLE MSP (v42).
 *
 * Retrace les recettes journalières (par classe et par autre volet) et les
 * dépenses du jour, avec l'objet de chaque mouvement.
 *
 * Toutes les formules vivent dans `accountingCalc.ts` : cet écran ne fait
 * qu'afficher et collecter la saisie (règle v40).
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Home, Plus, Trash2, TrendingUp, TrendingDown,
  FileDown, Printer, Wallet, X, AlertTriangle, Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  REVENUE_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  RevenueCategory, ExpenseCategory, PaymentMethod, RevenueSource,
  dailySummary, revenueByClass, revenueByCategory, expenseByCategory,
  formatFcfa, validateEntry,
} from '../utils/accountingCalc';
import {
  loadRevenues, loadExpenses, addRevenue, addExpense,
  deleteRevenue, deleteExpense, todayIso, knownClasses,
} from '../utils/accountingStore';
import { exportDayPdf, printAccountingDocument } from '../utils/accountingExport';
import { getProfile } from '../utils/userProfile';

type Tab = 'jour' | 'recettes' | 'depenses';

export default function AccountingScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [tab, setTab] = useState<Tab>('jour');
  const [date, setDate] = useState(todayIso());
  const [tick, setTick] = useState(0);
  const [showRev, setShowRev] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState('');

  const profile = getProfile();
  const school = profile.schoolName || 'Mon établissement';

  const revenues = useMemo(() => loadRevenues(), [tick]);
  const expenses = useMemo(() => loadExpenses(), [tick]);

  const summary = useMemo(
    () => dailySummary(date, revenues, expenses),
    [date, revenues, expenses],
  );
  const dayRevenues = useMemo(() => revenues.filter((e) => e.date === date), [revenues, date]);
  const dayExpenses = useMemo(() => expenses.filter((e) => e.date === date), [expenses, date]);
  const byClass = useMemo(() => revenueByClass(revenues, date), [revenues, date]);
  const byOther = useMemo(
    () => revenueByCategory(revenues, { date, onlyOther: true }),
    [revenues, date],
  );
  const byExpense = useMemo(() => expenseByCategory(expenses, date), [expenses, date]);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3000); }
  function refresh() { setTick((t) => t + 1); }

  /* ------------------------- Formulaire recette ------------------------- */
  const [rev, setRev] = useState({
    source: 'classe' as RevenueSource,
    className: '',
    category: 'scolarite' as RevenueCategory,
    object: '',
    amount: '',
    method: 'especes' as PaymentMethod,
    payer: '',
  });

  function submitRevenue() {
    const amount = parseInt(rev.amount, 10);
    const check = validateEntry({ date, amount, object: rev.object });
    if (rev.source === 'classe' && !rev.className.trim()) {
      check.errors.push('Veuillez indiquer la classe concernée.');
      check.valid = false;
    }
    if (!check.valid) { setErrors(check.errors); return; }
    addRevenue({
      date,
      source: rev.source,
      className: rev.source === 'classe' ? rev.className.trim() : undefined,
      category: rev.category,
      object: rev.object.trim(),
      amount,
      method: rev.method,
      payer: rev.payer.trim() || undefined,
    });
    setErrors([]);
    setRev({ ...rev, object: '', amount: '', payer: '' });
    setShowRev(false);
    refresh();
    notify('Recette enregistrée.');
  }

  /* ------------------------- Formulaire dépense ------------------------- */
  const [exp, setExp] = useState({
    category: 'fournitures' as ExpenseCategory,
    object: '',
    amount: '',
    method: 'especes' as PaymentMethod,
    payee: '',
    receipt: '',
  });

  function submitExpense() {
    const amount = parseInt(exp.amount, 10);
    const check = validateEntry({ date, amount, object: exp.object });
    if (!check.valid) { setErrors(check.errors); return; }
    addExpense({
      date,
      category: exp.category,
      object: exp.object.trim(),
      amount,
      method: exp.method,
      payee: exp.payee.trim() || undefined,
      receipt: exp.receipt.trim() || undefined,
    });
    setErrors([]);
    setExp({ ...exp, object: '', amount: '', payee: '', receipt: '' });
    setShowExp(false);
    refresh();
    notify('Dépense enregistrée.');
  }

  /* ------------------------------ Impression ---------------------------- */
  function printDay() {
    const rows = (title: string, list: { c: string[] }[]) =>
      `<h2>${title}</h2><table><tbody>${list.map((r) =>
        `<tr>${r.c.map((c, i) => `<td${i === r.c.length - 1 ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`,
      ).join('')}</tbody></table>`;

    const html = `
      <table><tbody>
        <tr><td>Total des recettes</td><td class="num">${formatFcfa(summary.totalRevenue)}</td></tr>
        <tr><td>Total des dépenses</td><td class="num">${formatFcfa(summary.totalExpense)}</td></tr>
        <tr><td><strong>Solde du jour</strong></td><td class="num${summary.balance < 0 ? ' neg' : ''}">
          <strong>${formatFcfa(summary.balance)}</strong></td></tr>
      </tbody></table>
      ${rows('Recettes', dayRevenues.map((e) => ({
        c: [
          e.source === 'classe' ? (e.className || 'Classe') : 'Autre volet',
          REVENUE_CATEGORIES[e.category].label, e.object, formatFcfa(e.amount),
        ],
      })))}
      ${rows('Dépenses', dayExpenses.map((e) => ({
        c: [EXPENSE_CATEGORIES[e.category].label, e.object, e.payee || '—', formatFcfa(e.amount)],
      })))}`;
    printAccountingDocument(`Journal de caisse du ${date}`, html, school);
  }

  const classes = knownClasses();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-teal-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={goBack} aria-label="Retour" className="p-2 -ml-2 active:scale-90 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold">Gestionnaire comptable</h1>
        <button onClick={() => navigate('/')} aria-label="Accueil" className="p-2 active:scale-90 transition">
          <Home className="w-6 h-6" />
        </button>
      </header>

      {/* Date de travail */}
      <div className="bg-white border-b border-gray-200 p-4">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Journée comptable
          </span>
          <input
            type="date"
            data-testid="champ-date-compta"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </label>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 bg-white">
        {([['jour', 'Le jour'], ['recettes', 'Recettes'], ['depenses', 'Dépenses']] as [Tab, string][])
          .map(([k, label]) => (
            <button
              key={k}
              data-testid={`onglet-${k}`}
              onClick={() => setTab(k)}
              className={`flex-1 py-3 text-sm font-semibold ${
                tab === k ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="p-4 space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3" data-testid="erreurs-compta">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{e}
              </p>
            ))}
          </div>
        )}

        {/* ------------------------- Onglet : le jour ------------------------ */}
        {tab === 'jour' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Recettes
                </p>
                <p data-testid="total-recettes" className="text-lg font-bold text-emerald-900 mt-1">
                  {formatFcfa(summary.totalRevenue)}
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs text-rose-800 font-semibold flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> Dépenses
                </p>
                <p data-testid="total-depenses" className="text-lg font-bold text-rose-900 mt-1">
                  {formatFcfa(summary.totalExpense)}
                </p>
              </div>
            </div>

            <div className={`rounded-xl p-4 border ${
              summary.balance < 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
            }`}>
              <p className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Solde de la journée
              </p>
              <p
                data-testid="solde-jour"
                className={`text-2xl font-bold mt-1 ${summary.balance < 0 ? 'text-red-700' : 'text-gray-900'}`}
              >
                {formatFcfa(summary.balance)}
              </p>
              {summary.balance < 0 && (
                <p data-testid="alerte-solde" className="text-xs text-red-800 mt-2 font-semibold">
                  Attention : vous avez dépensé plus que vous n’avez encaissé ce jour.
                </p>
              )}
            </div>

            {byClass.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Recettes par classe</h2>
                <div data-testid="recettes-par-classe" className="space-y-1">
                  {byClass.map((c) => (
                    <div key={c.className} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span className="text-gray-700">{c.className}</span>
                      <span className="font-semibold text-gray-900">{formatFcfa(c.total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {byOther.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Autres volets</h2>
                <div data-testid="recettes-autres-volets" className="space-y-1">
                  {byOther.map((c) => (
                    <div key={c.category} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span className="text-gray-700">{c.label}</span>
                      <span className="font-semibold text-gray-900">{formatFcfa(c.total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {byExpense.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Dépenses par poste</h2>
                <div data-testid="depenses-par-poste" className="space-y-1">
                  {byExpense.map((c) => (
                    <div key={c.category} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span className="text-gray-700">
                        {c.label}
                        {c.investment && (
                          <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            investissement
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-gray-900">{formatFcfa(c.total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="btn-pdf-jour"
                onClick={() => { exportDayPdf(school, date, summary, dayRevenues, dayExpenses); notify('PDF téléchargé.'); }}
                className="bg-teal-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <FileDown className="w-4 h-4" /> PDF du jour
              </button>
              <button
                data-testid="btn-imprimer-jour"
                onClick={printDay}
                className="bg-white border-2 border-teal-700 text-teal-700 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            </div>

            <button
              data-testid="btn-budget"
              onClick={() => navigate('/comptabilite/budget')}
              className="w-full bg-indigo-700 text-white font-bold py-4 rounded-xl text-base active:scale-95"
            >
              Le budget de mon école
            </button>
          </>
        )}

        {/* ------------------------ Onglet : recettes ------------------------ */}
        {tab === 'recettes' && (
          <>
            <button
              data-testid="btn-ajouter-recette"
              onClick={() => { setShowRev(true); setErrors([]); }}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" /> Enregistrer une recette
            </button>

            <div data-testid="liste-recettes" className="space-y-2">
              {dayRevenues.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-6">
                  Aucune recette pour cette journée.
                </p>
              )}
              {dayRevenues.map((e) => (
                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{e.object}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {e.source === 'classe' ? `Classe ${e.className}` : 'Autre volet'}
                      {' · '}{REVENUE_CATEGORIES[e.category].label}
                      {' · '}{PAYMENT_METHODS[e.method].label}
                    </p>
                    {e.payer && <p className="text-xs text-gray-500">Payé par {e.payer}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700">{formatFcfa(e.amount)}</p>
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer cette recette ?')) { deleteRevenue(e.id); refresh(); }
                      }}
                      className="text-gray-400 mt-1 active:scale-90"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ------------------------ Onglet : dépenses ------------------------ */}
        {tab === 'depenses' && (
          <>
            <button
              data-testid="btn-ajouter-depense"
              onClick={() => { setShowExp(true); setErrors([]); }}
              className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" /> Enregistrer une dépense
            </button>

            <div data-testid="liste-depenses" className="space-y-2">
              {dayExpenses.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-6">
                  Aucune dépense pour cette journée.
                </p>
              )}
              {dayExpenses.map((e) => (
                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{e.object}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {EXPENSE_CATEGORIES[e.category].label}
                      {' · '}{PAYMENT_METHODS[e.method].label}
                      {EXPENSE_CATEGORIES[e.category].investment && ' · investissement'}
                    </p>
                    {e.payee && <p className="text-xs text-gray-500">Versé à {e.payee}</p>}
                    {e.receipt && <p className="text-xs text-gray-500">Pièce n° {e.receipt}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-700">{formatFcfa(e.amount)}</p>
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer cette dépense ?')) { deleteExpense(e.id); refresh(); }
                      }}
                      className="text-gray-400 mt-1 active:scale-90"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------------------- Fenêtre : nouvelle recette ---------------------- */}
      {showRev && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowRev(false)}>
          <div
            className="bg-white w-full rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
            data-testid="form-recette"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">Nouvelle recette</h2>
              <button onClick={() => setShowRev(false)} aria-label="Fermer" className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="source-classe"
                  onClick={() => setRev({ ...rev, source: 'classe' })}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 ${
                    rev.source === 'classe'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Par classe
                </button>
                <button
                  data-testid="source-autre"
                  onClick={() => setRev({ ...rev, source: 'autre' })}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 ${
                    rev.source === 'autre'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Autre volet
                </button>
              </div>

              {rev.source === 'classe' && (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Classe</span>
                  <input
                    data-testid="champ-classe"
                    list="classes-connues"
                    value={rev.className}
                    onChange={(e) => setRev({ ...rev, className: e.target.value })}
                    placeholder="Ex. : CM2"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                  />
                  <datalist id="classes-connues">
                    {classes.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Volet</span>
                <select
                  data-testid="champ-volet-recette"
                  value={rev.category}
                  onChange={(e) => setRev({ ...rev, category: e.target.value as RevenueCategory })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {(Object.keys(REVENUE_CATEGORIES) as RevenueCategory[]).map((k) => (
                    <option key={k} value={k}>{REVENUE_CATEGORIES[k].label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Objet de la recette</span>
                <input
                  data-testid="champ-objet-recette"
                  value={rev.object}
                  onChange={(e) => setRev({ ...rev, object: e.target.value })}
                  placeholder="Ex. : Scolarité 1re tranche, 12 élèves"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Montant (FCFA)</span>
                <input
                  data-testid="champ-montant-recette"
                  type="number"
                  inputMode="numeric"
                  value={rev.amount}
                  onChange={(e) => setRev({ ...rev, amount: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Moyen de règlement</span>
                <select
                  data-testid="champ-reglement-recette"
                  value={rev.method}
                  onChange={(e) => setRev({ ...rev, method: e.target.value as PaymentMethod })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => (
                    <option key={k} value={k}>{PAYMENT_METHODS[k].label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Payé par (facultatif)</span>
                <input
                  data-testid="champ-payeur"
                  value={rev.payer}
                  onChange={(e) => setRev({ ...rev, payer: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <button
                data-testid="btn-valider-recette"
                onClick={submitRevenue}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-base active:scale-95"
              >
                Enregistrer la recette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- Fenêtre : nouvelle dépense ---------------------- */}
      {showExp && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowExp(false)}>
          <div
            className="bg-white w-full rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
            data-testid="form-depense"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">Nouvelle dépense</h2>
              <button onClick={() => setShowExp(false)} aria-label="Fermer" className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Poste de dépense</span>
                <select
                  data-testid="champ-poste-depense"
                  value={exp.category}
                  onChange={(e) => setExp({ ...exp, category: e.target.value as ExpenseCategory })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
                    <option key={k} value={k}>
                      {EXPENSE_CATEGORIES[k].label}
                      {EXPENSE_CATEGORIES[k].investment ? ' (investissement)' : ''}
                    </option>
                  ))}
                </select>
                {EXPENSE_CATEGORIES[exp.category].investment && (
                  <span className="text-xs text-indigo-800 mt-1 block" data-testid="note-investissement">
                    Ce bien durable entrera dans l’inventaire de fin d’exercice, et non
                    dans les charges de l’année.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Objet de la dépense</span>
                <input
                  data-testid="champ-objet-depense"
                  value={exp.object}
                  onChange={(e) => setExp({ ...exp, object: e.target.value })}
                  placeholder="Ex. : 20 tables-bancs"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Montant (FCFA)</span>
                <input
                  data-testid="champ-montant-depense"
                  type="number"
                  inputMode="numeric"
                  value={exp.amount}
                  onChange={(e) => setExp({ ...exp, amount: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Moyen de règlement</span>
                <select
                  data-testid="champ-reglement-depense"
                  value={exp.method}
                  onChange={(e) => setExp({ ...exp, method: e.target.value as PaymentMethod })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => (
                    <option key={k} value={k}>{PAYMENT_METHODS[k].label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Versé à</span>
                  <input
                    data-testid="champ-beneficiaire"
                    value={exp.payee}
                    onChange={(e) => setExp({ ...exp, payee: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">N° de pièce</span>
                  <input
                    data-testid="champ-piece"
                    value={exp.receipt}
                    onChange={(e) => setExp({ ...exp, receipt: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                  />
                </label>
              </div>

              <button
                data-testid="btn-valider-depense"
                onClick={submitExpense}
                className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl text-base active:scale-95"
              >
                Enregistrer la dépense
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm text-center z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
