/**
 * LE BUDGET DE MON ÉCOLE (v42) — sous-module du gestionnaire comptable.
 *
 * Le Directeur y enregistre ses prévisions budgétaires pour l'exercice, puis
 * obtient en fin d'exercice :
 *   - le suivi prévu / réalisé / écart, poste par poste ;
 *   - le BILAN aux normes OHADA (SYSCOHADA révisé), en PDF et en Excel ;
 *   - l'INVENTAIRE des biens durables, en PDF et en Excel.
 *
 * Les calculs sont entièrement délégués à `accountingCalc.ts`.
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Home, Plus, Trash2, FileDown, FileSpreadsheet,
  Printer, AlertTriangle, Target, Scale, Package, X, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  REVENUE_CATEGORIES, EXPENSE_CATEGORIES,
  RevenueCategory, ExpenseCategory,
  trackBudget, budgetTotals, buildOhadaBalance, buildInventory,
  inventoryTotal, formatFcfa, OHADA_DISCLAIMER,
} from '../utils/accountingCalc';
import {
  loadBudget, addBudgetLine, deleteBudgetLine,
  loadRevenues, loadExpenses, currentYear, saveYear,
  getOpeningBalance, setOpeningBalance,
} from '../utils/accountingStore';
import {
  exportBudgetPdf, exportBalancePdf, exportInventoryPdf,
  exportOhadaExcel, printAccountingDocument,
} from '../utils/accountingExport';
import { getProfile } from '../utils/userProfile';

type Tab = 'previsions' | 'bilan' | 'inventaire';

export default function SchoolBudgetScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [tab, setTab] = useState<Tab>('previsions');
  const [tick, setTick] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const profile = getProfile();
  const school = profile.schoolName || 'Mon établissement';

  const year = useMemo(() => currentYear(), [tick]);
  const lines = useMemo(() => loadBudget(), [tick]);
  const revenues = useMemo(() => loadRevenues(), [tick]);
  const expenses = useMemo(() => loadExpenses(), [tick]);
  const opening = useMemo(() => getOpeningBalance(year.id), [year.id, tick]);

  const tracking = useMemo(
    () => trackBudget(lines, revenues, expenses),
    [lines, revenues, expenses],
  );
  const totals = useMemo(() => budgetTotals(tracking), [tracking]);
  const balance = useMemo(
    () => buildOhadaBalance(year, revenues, expenses, opening),
    [year, revenues, expenses, opening],
  );
  const inventory = useMemo(() => buildInventory(year, expenses), [year, expenses]);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }
  function refresh() { setTick((t) => t + 1); }

  /* --------------------------- Nouvelle ligne --------------------------- */
  const [form, setForm] = useState({
    kind: 'recette' as 'recette' | 'depense',
    category: 'scolarite' as string,
    planned: '',
  });

  function submitLine() {
    const planned = parseInt(form.planned, 10);
    if (!Number.isFinite(planned) || planned <= 0) {
      setErrors(['Le montant prévu doit être supérieur à zéro.']);
      return;
    }
    if (lines.some((l) => l.kind === form.kind && l.category === form.category)) {
      setErrors(['Ce poste figure déjà dans le budget. Supprimez-le d’abord pour le modifier.']);
      return;
    }
    const label = form.kind === 'recette'
      ? REVENUE_CATEGORIES[form.category as RevenueCategory].label
      : EXPENSE_CATEGORIES[form.category as ExpenseCategory].label;
    addBudgetLine({ kind: form.kind, category: form.category, label, planned });
    setErrors([]);
    setForm({ ...form, planned: '' });
    setShowForm(false);
    refresh();
    notify('Prévision enregistrée.');
  }

  async function downloadExcel() {
    setBusy(true);
    try {
      await exportOhadaExcel(school, balance, inventory, tracking, totals);
      notify('Classeur Excel téléchargé.');
    } catch (e) {
      console.error('Export Excel echoue :', e);
      notify('Le classeur Excel n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  }

  function printBalance() {
    const line = (a: string, b: string, c: number, neg = false) =>
      `<tr><td>${a}</td><td>${b}</td><td class="num${neg && c < 0 ? ' neg' : ''}">${formatFcfa(c)}</td></tr>`;
    const html = `
      <h2>Produits (classe 7)</h2><table>
        <tr><th>Compte</th><th>Libellé</th><th>Montant</th></tr>
        ${balance.products.map((p) => line(p.account, p.label, p.amount)).join('')}
        <tr><td></td><td><strong>TOTAL DES PRODUITS</strong></td>
            <td class="num"><strong>${formatFcfa(balance.totalProducts)}</strong></td></tr>
      </table>
      <h2>Charges (classe 6)</h2><table>
        <tr><th>Compte</th><th>Libellé</th><th>Montant</th></tr>
        ${balance.charges.map((c) => line(c.account, c.label, c.amount)).join('')}
        <tr><td></td><td><strong>TOTAL DES CHARGES</strong></td>
            <td class="num"><strong>${formatFcfa(balance.totalCharges)}</strong></td></tr>
      </table>
      <h2>Résultat</h2><table>
        <tr><td>Résultat net de l’exercice</td>
            <td class="num${balance.netResult < 0 ? ' neg' : ''}">
              <strong>${formatFcfa(balance.netResult)}</strong></td></tr>
      </table>
      <h2>Actif</h2><table>
        ${balance.assets.map((a) => line(a.account, a.label, a.amount)).join('')}
        ${line('5', 'Trésorerie disponible', balance.totalTreasury, true)}
        <tr><td></td><td><strong>TOTAL ACTIF</strong></td>
            <td class="num"><strong>${formatFcfa(balance.totalActif)}</strong></td></tr>
      </table>
      <h2>Passif</h2><table>
        ${line('11', 'Report à nouveau', balance.openingBalance)}
        ${line('13', 'Résultat net', balance.netResult, true)}
        <tr><td></td><td><strong>TOTAL PASSIF</strong></td>
            <td class="num"><strong>${formatFcfa(balance.totalPassif)}</strong></td></tr>
      </table>
      <p>${OHADA_DISCLAIMER}</p>`;
    printAccountingDocument(`Bilan OHADA — exercice ${year.label}`, html, school);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-indigo-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={goBack} aria-label="Retour" className="p-2 -ml-2 active:scale-90 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold">Le budget de mon école</h1>
        <button onClick={() => navigate('/')} aria-label="Accueil" className="p-2 active:scale-90 transition">
          <Home className="w-6 h-6" />
        </button>
      </header>

      <div className="bg-white border-b border-gray-200 p-4">
        <p className="text-sm text-gray-700">
          Exercice <strong data-testid="exercice-courant">{year.label}</strong>
          {' '}(du {year.startDate} au {year.endDate})
        </p>
        <label className="block mt-2">
          <span className="text-xs font-semibold text-gray-600">
            Trésorerie au début de l’exercice (report à nouveau)
          </span>
          <input
            data-testid="champ-report"
            type="number"
            inputMode="numeric"
            value={opening || ''}
            onChange={(e) => { setOpeningBalance(year.id, parseInt(e.target.value, 10) || 0); refresh(); }}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
          />
        </label>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {([['previsions', 'Prévisions'], ['bilan', 'Bilan'], ['inventaire', 'Inventaire']] as [Tab, string][])
          .map(([k, label]) => (
            <button
              key={k}
              data-testid={`onglet-${k}`}
              onClick={() => setTab(k)}
              className={`flex-1 py-3 text-sm font-semibold ${
                tab === k ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="p-4 space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3" data-testid="erreurs-budget">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{e}
              </p>
            ))}
          </div>
        )}

        {/* ------------------------- Onglet prévisions ------------------------ */}
        {tab === 'previsions' && (
          <>
            <button
              data-testid="btn-ajouter-prevision"
              onClick={() => { setShowForm(true); setErrors([]); }}
              className="w-full bg-indigo-700 text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-5 h-5" /> Ajouter une prévision
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" /> Vue d’ensemble
              </h2>
              <div className="space-y-1 text-sm" data-testid="synthese-budget">
                <div className="flex justify-between"><span>Recettes prévues</span>
                  <strong>{formatFcfa(totals.plannedRevenue)}</strong></div>
                <div className="flex justify-between"><span>Recettes réalisées</span>
                  <strong data-testid="recettes-realisees">{formatFcfa(totals.actualRevenue)}</strong></div>
                <div className="flex justify-between"><span>Dépenses prévues</span>
                  <strong>{formatFcfa(totals.plannedExpense)}</strong></div>
                <div className="flex justify-between"><span>Dépenses réalisées</span>
                  <strong data-testid="depenses-realisees">{formatFcfa(totals.actualExpense)}</strong></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span>Résultat prévisionnel</span>
                  <strong>{formatFcfa(totals.plannedResult)}</strong></div>
                <div className="flex justify-between">
                  <span>Résultat réalisé</span>
                  <strong
                    data-testid="resultat-realise"
                    className={totals.actualResult < 0 ? 'text-red-700' : 'text-emerald-700'}
                  >
                    {formatFcfa(totals.actualResult)}
                  </strong>
                </div>
              </div>
              {totals.overrunCount > 0 && (
                <p data-testid="alerte-depassement-budget" className="text-xs text-red-800 font-semibold mt-2">
                  {totals.overrunCount} poste(s) de dépense dépassent la prévision.
                </p>
              )}
            </div>

            <div data-testid="liste-previsions" className="space-y-2">
              {tracking.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-6">
                  Aucune prévision enregistrée pour cet exercice.
                </p>
              )}
              {tracking.map((t) => (
                <div
                  key={t.line.id}
                  data-testid={`prevision-${t.line.category}`}
                  className={`bg-white rounded-xl border p-3 ${
                    t.overrun ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {t.line.label}
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                          t.line.kind === 'recette'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.line.kind === 'recette' ? 'recette' : 'dépense'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Prévu {formatFcfa(t.line.planned)} · Réalisé {formatFcfa(t.actual)}
                      </p>
                      <p className={`text-xs mt-0.5 font-semibold ${
                        t.overrun ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        Écart {formatFcfa(t.variance)} · {t.rate} % de la prévision
                        {t.overrun && ' — dépassement'}
                      </p>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${t.overrun ? 'bg-red-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(100, t.rate)}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer cette prévision ?')) {
                          deleteBudgetLine(t.line.id); refresh();
                        }
                      }}
                      className="text-gray-400 active:scale-90"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {tracking.length > 0 && (
              <button
                data-testid="btn-pdf-budget"
                onClick={() => { exportBudgetPdf(school, year.label, tracking, totals); notify('PDF du budget téléchargé.'); }}
                className="w-full bg-indigo-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <FileDown className="w-4 h-4" /> PDF du budget
              </button>
            )}
          </>
        )}

        {/* ---------------------------- Onglet bilan --------------------------- */}
        {tab === 'bilan' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4" /> Bilan OHADA — exercice {year.label}
              </h2>

              <p className="text-xs font-bold text-gray-700 mt-3 mb-1">PRODUITS</p>
              <div data-testid="bilan-produits" className="space-y-1">
                {balance.products.map((p) => (
                  <div key={p.account + p.label} className="flex justify-between text-sm">
                    <span className="text-gray-700">{p.account} — {p.label}</span>
                    <span className="font-semibold">{formatFcfa(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-gray-200 pt-1 font-bold">
                  <span>Total des produits</span>
                  <span data-testid="total-produits">{formatFcfa(balance.totalProducts)}</span>
                </div>
              </div>

              <p className="text-xs font-bold text-gray-700 mt-4 mb-1">CHARGES</p>
              <div data-testid="bilan-charges" className="space-y-1">
                {balance.charges.map((c) => (
                  <div key={c.account + c.label} className="flex justify-between text-sm">
                    <span className="text-gray-700">{c.account} — {c.label}</span>
                    <span className="font-semibold">{formatFcfa(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-gray-200 pt-1 font-bold">
                  <span>Total des charges</span>
                  <span data-testid="total-charges">{formatFcfa(balance.totalCharges)}</span>
                </div>
              </div>

              <div className={`mt-4 rounded-lg p-3 ${
                balance.netResult < 0 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'
              }`}>
                <p className="text-sm font-semibold text-gray-800">Résultat net de l’exercice</p>
                <p
                  data-testid="resultat-net"
                  className={`text-xl font-bold ${balance.netResult < 0 ? 'text-red-700' : 'text-emerald-700'}`}
                >
                  {formatFcfa(balance.netResult)}
                </p>
                {balance.netResult < 0 && (
                  <p className="text-xs text-red-800 mt-1">
                    L’exercice se solde par une perte.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Total actif</p>
                  <p data-testid="total-actif" className="font-bold text-gray-900">
                    {formatFcfa(balance.totalActif)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Total passif</p>
                  <p data-testid="total-passif" className="font-bold text-gray-900">
                    {formatFcfa(balance.totalPassif)}
                  </p>
                </div>
              </div>

              <p
                data-testid="equilibre-bilan"
                className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                  balance.balanced ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {balance.balanced
                  ? <><Check className="w-4 h-4" /> Actif et passif sont équilibrés.</>
                  : <><AlertTriangle className="w-4 h-4" /> Déséquilibre de {formatFcfa(balance.totalActif - balance.totalPassif)}.</>}
              </p>

              <p className="text-[11px] text-gray-500 mt-3">{OHADA_DISCLAIMER}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="btn-pdf-bilan"
                onClick={() => { exportBalancePdf(school, balance); notify('Bilan PDF téléchargé.'); }}
                className="bg-indigo-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <FileDown className="w-4 h-4" /> Bilan PDF
              </button>
              <button
                data-testid="btn-excel-bilan"
                onClick={downloadExcel}
                disabled={busy}
                className="bg-emerald-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                <FileSpreadsheet className="w-4 h-4" /> {busy ? 'Création…' : 'Excel'}
              </button>
            </div>
            <button
              data-testid="btn-imprimer-bilan"
              onClick={printBalance}
              className="w-full bg-white border-2 border-indigo-700 text-indigo-700 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" /> Imprimer le bilan
            </button>
          </>
        )}

        {/* -------------------------- Onglet inventaire ------------------------ */}
        {tab === 'inventaire' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                <Package className="w-4 h-4" /> Inventaire — exercice {year.label}
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                Biens durables acquis pendant l’exercice, à pointer dans l’établissement.
              </p>

              {inventory.length === 0 ? (
                <p className="text-sm text-gray-600 py-4 text-center" data-testid="inventaire-vide">
                  Aucun bien durable acquis sur cet exercice. Les achats de mobilier,
                  d’équipement ou de bâtiment apparaîtront ici.
                </p>
              ) : (
                <div data-testid="liste-inventaire" className="space-y-3">
                  {inventory.map((it) => (
                    <div key={it.account} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-semibold text-sm text-gray-900">
                        {it.account} — {it.label}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {it.objects.map((o, i) => (
                          <li key={i} className="flex justify-between text-sm text-gray-700">
                            <span>{o.object}</span>
                            <span className="font-semibold">{formatFcfa(o.amount)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-bold text-gray-800 mt-1 text-right">
                        Sous-total {formatFcfa(it.total)}
                      </p>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-2">
                    <span>Total de l’inventaire</span>
                    <span data-testid="total-inventaire">{formatFcfa(inventoryTotal(inventory))}</span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-3">{OHADA_DISCLAIMER}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="btn-pdf-inventaire"
                onClick={() => { exportInventoryPdf(school, year.label, inventory); notify('Inventaire PDF téléchargé.'); }}
                className="bg-indigo-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <FileDown className="w-4 h-4" /> Inventaire PDF
              </button>
              <button
                data-testid="btn-excel-inventaire"
                onClick={downloadExcel}
                disabled={busy}
                className="bg-emerald-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                <FileSpreadsheet className="w-4 h-4" /> {busy ? 'Création…' : 'Excel'}
              </button>
            </div>

            {!year.closed && (
              <button
                data-testid="btn-cloturer"
                onClick={() => {
                  if (window.confirm(
                    `Clôturer l’exercice ${year.label} ?\n\n`
                    + 'Le bilan et l’inventaire resteront consultables.',
                  )) { saveYear({ ...year, closed: true }); refresh(); notify('Exercice clôturé.'); }
                }}
                className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl text-sm active:scale-95"
              >
                Clôturer l’exercice {year.label}
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------------------- Fenêtre : nouvelle prévision ---------------------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowForm(false)}>
          <div
            className="bg-white w-full rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="form-prevision"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">Nouvelle prévision</h2>
              <button onClick={() => setShowForm(false)} aria-label="Fermer" className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="prevision-recette"
                  onClick={() => setForm({ kind: 'recette', category: 'scolarite', planned: form.planned })}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 ${
                    form.kind === 'recette'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Recette
                </button>
                <button
                  data-testid="prevision-depense"
                  onClick={() => setForm({ kind: 'depense', category: 'salaires', planned: form.planned })}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 ${
                    form.kind === 'depense'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Dépense
                </button>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Poste</span>
                <select
                  data-testid="champ-poste-prevision"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {form.kind === 'recette'
                    ? (Object.keys(REVENUE_CATEGORIES) as RevenueCategory[]).map((k) => (
                        <option key={k} value={k}>{REVENUE_CATEGORIES[k].label}</option>
                      ))
                    : (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
                        <option key={k} value={k}>{EXPENSE_CATEGORIES[k].label}</option>
                      ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  Montant prévu pour l’exercice (FCFA)
                </span>
                <input
                  data-testid="champ-montant-prevision"
                  type="number"
                  inputMode="numeric"
                  value={form.planned}
                  onChange={(e) => setForm({ ...form, planned: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <button
                data-testid="btn-valider-prevision"
                onClick={submitLine}
                className="w-full bg-indigo-700 text-white font-bold py-4 rounded-xl text-base active:scale-95"
              >
                Enregistrer la prévision
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
