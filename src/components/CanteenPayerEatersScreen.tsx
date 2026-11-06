/**
 * RELEVÉ DES EFFECTIFS PAYEURS-MANGEURS — CANTINE (v66).
 *
 * Le nombre d'élèves à nourrir dépend du système de l'école :
 *  - payeur-mangeur : présente + frais de cantine payés ;
 *  - apport communautaire : tous les présents.
 *
 * Les mangeurs sont calculés, jamais saisis. Le total peut être transmis
 * explicitement au simulateur ; le relevé enregistré sert aussi au
 * prélèvement du jour et au cahier des menus.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, Users, FileDown, Printer, Calculator, History,
  Wallet, HeartHandshake, UtensilsCrossed, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { CLASS_LEVELS, latestSurvey, EnrollmentSurvey } from '../utils/canteenEnrollment';
import {
  CanteenSystem, MealClassCounts, PayerEaterSurvey,
  applyEnrolledCounts, canteenSystemInfo, computePayerEaterTotals,
  deletePayerEaterSurvey, deriveMealRows, emptyMealCounts,
  latestPayerEaterSurvey, loadCanteenSystem, loadPayerEaterSurveys,
  newPayerEaterSurvey, payerEaterSurveyForDate, saveCanteenSystem,
  savePayerEaterSurvey, validatePayerEaterSurvey,
} from '../utils/canteenPayerEaters';
import { currentEstablishment } from '../utils/canteenStore';
import { getProfile } from '../utils/userProfile';
import {
  exportPayerEatersExcel, exportPayerEatersPdf, printPayerEaters,
} from '../utils/canteenPayerEatersExport';

type CountField = 'presentBoys' | 'presentGirls' | 'paidPresentBoys' | 'paidPresentGirls';

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pct(v: number): string {
  return `${String(v).replace('.', ',')} %`;
}

export default function CanteenPayerEatersScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const etab = currentEstablishment().name;
  const profile = getProfile();

  const [survey, setSurvey] = useState<PayerEaterSurvey | null>(null);
  const [history, setHistory] = useState<PayerEaterSurvey[]>([]);
  const [generalSurvey, setGeneralSurvey] = useState<EnrollmentSurvey | null>(null);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const all = loadPayerEaterSurveys();
    const general = latestSurvey();
    setHistory(all);
    setGeneralSurvey(general);

    const existingToday = payerEaterSurveyForDate(today());
    if (existingToday) {
      setSurvey(existingToday);
    } else {
      const last = latestPayerEaterSurvey();
      setSurvey(newPayerEaterSurvey(
        etab || profile.schoolName || '',
        general?.schoolYear || last?.schoolYear || '',
        loadCanteenSystem(),
        general?.counts,
      ));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => computePayerEaterTotals(survey?.counts || [], survey?.system || 'payeur-mangeur'),
    [survey],
  );
  const derivedRows = useMemo(
    () => deriveMealRows(survey?.counts || [], survey?.system || 'payeur-mangeur'),
    [survey],
  );
  const warnings = useMemo(
    () => (survey ? validatePayerEaterSurvey(survey) : []),
    [survey],
  );

  if (!survey) return <div className="p-4 text-center">Chargement…</div>;

  const isPayerSystem = survey.system === 'payeur-mangeur';
  const systemInfo = canteenSystemInfo(survey.system);

  function notify(text: string, ms = 3000) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), ms);
  }

  function blankForDate(
    date: string,
    system: CanteenSystem = survey?.system || loadCanteenSystem(),
  ): PayerEaterSurvey {
    const general = latestSurvey();
    setGeneralSurvey(general);
    const blank = newPayerEaterSurvey(
      etab || profile.schoolName || '',
      survey?.schoolYear || general?.schoolYear || '',
      system,
      general?.counts,
    );
    return { ...blank, date };
  }

  function handleDateChange(date: string) {
    if (!date) return;
    const existing = payerEaterSurveyForDate(date);
    if (existing) {
      setSurvey(existing);
      notify(`Relevé du ${frDate(date)} ouvert : vous pouvez le corriger.`);
    } else {
      setSurvey(blankForDate(date));
      notify(`Nouveau relevé vierge au ${frDate(date)} ; les anciens sont conservés.`);
    }
  }

  function handleNew() {
    const existing = payerEaterSurveyForDate(today());
    if (existing) {
      setSurvey(existing);
      notify('Le relevé du jour déjà enregistré est ouvert.');
    } else {
      setSurvey(blankForDate(today()));
      notify('Nouveau relevé du jour.');
    }
  }

  function setSystem(system: CanteenSystem) {
    if (!survey) return;
    saveCanteenSystem(system);
    setMessage('');
    setSurvey({ ...survey, system });
  }

  function setCount(level: string, field: CountField, raw: string) {
    if (!survey) return;
    const value = Math.max(0, Math.trunc(Number(raw) || 0));
    const counts: MealClassCounts[] = survey.counts.map((c) =>
      c.level === level ? { ...c, [field]: value } : c);
    setSurvey({ ...survey, counts });
  }

  function importEnrolled() {
    if (!survey) return;
    const general = latestSurvey();
    setGeneralSurvey(general);
    if (!general) {
      notify('Aucun relevé général des effectifs : créez-le d’abord dans « Relevé des effectifs par classe ».', 4500);
      return;
    }
    setSurvey({
      ...survey,
      schoolYear: survey.schoolYear || general.schoolYear,
      counts: applyEnrolledCounts(survey.counts, general.counts),
    });
    notify(`Inscrits repris du relevé général du ${frDate(general.date)}.`);
  }

  function handleSave(): PayerEaterSurvey | null {
    if (!survey) return null;
    const saved = savePayerEaterSurvey(survey);
    setSurvey(saved);
    setHistory(loadPayerEaterSurveys());
    notify(`Relevé enregistré : ${totals.eaterTotal} mangeurs (${systemInfo.shortLabel}).`);
    return saved;
  }

  function handleSendToSimulator() {
    if (!survey) return;
    if (totals.eaterTotal <= 0) {
      notify('Relevez d’abord au moins un élève mangeur.', 3500);
      return;
    }
    // Enregistrer d'abord : le même relevé pourra alimenter le jour du
    // simulateur et le cahier des menus à la même date.
    const saved = savePayerEaterSurvey(survey);
    setSurvey(saved);
    setHistory(loadPayerEaterSurveys());
    localStorage.setItem('msp_canteen_effectif_propose', String(totals.eaterTotal));
    localStorage.setItem('msp_canteen_effectif_propose_meta', JSON.stringify({
      source: 'payeurs-mangeurs',
      date: saved.date,
      system: saved.system,
    }));
    navigate('/cantine/simulateur');
  }

  function deleteFromHistory(item: PayerEaterSurvey) {
    if (!survey) return;
    if (!window.confirm('Supprimer ce relevé payeurs-mangeurs ?')) return;
    deletePayerEaterSurvey(item.id);
    const nextHistory = loadPayerEaterSurveys();
    setHistory(nextHistory);
    if (item.id === survey.id) {
      const existingToday = payerEaterSurveyForDate(today());
      setSurvey(existingToday || blankForDate(today(), survey.system));
    }
    notify('Relevé supprimé.');
  }

  const systemChoices: {
    key: CanteenSystem;
    icon: typeof Wallet;
    title: string;
    text: string;
    testId: string;
  }[] = [
    {
      key: 'payeur-mangeur',
      icon: Wallet,
      title: 'Payeur-mangeur',
      text: 'Seuls les élèves présents ayant payé les frais de cantine mangent.',
      testId: 'systeme-payeur-mangeur',
    },
    {
      key: 'apport-communautaire',
      icon: HeartHandshake,
      title: 'Apport communautaire',
      text: 'Tous les élèves présents mangent.',
      testId: 'systeme-apport-communautaire',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-orange-700 to-amber-600 text-white p-4 sticky top-0 z-10 shadow print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">Relevé des effectifs payeurs-mangeurs</h1>
            <p className="text-white/80 text-sm truncate">{etab || 'Mon établissement'}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-36">
        {message && (
          <div data-testid="message-payeurs-mangeurs" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm font-semibold">
            {message}
          </div>
        )}

        {/* Système de fonctionnement de l'école */}
        <section className="msp-card p-4" data-testid="choix-systeme-cantine">
          <h2 className="font-bold text-gray-800 mb-1">Système de fonctionnement de la cantine</h2>
          <p className="text-sm text-gray-600 mb-3">
            Choisissez le système de votre école. Il détermine automatiquement qui est compté comme mangeur.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemChoices.map((choice) => {
              const selected = survey.system === choice.key;
              const Icon = choice.icon;
              return (
                <button
                  key={choice.key}
                  type="button"
                  aria-pressed={selected}
                  data-testid={choice.testId}
                  onClick={() => setSystem(choice.key)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    selected
                      ? 'border-orange-600 bg-orange-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold text-gray-800">
                    <span className={`p-2 rounded-lg ${selected ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    {choice.title}
                    {selected && <span className="ml-auto text-xs bg-orange-600 text-white px-2 py-1 rounded-full">Choisi</span>}
                  </span>
                  <span className="block text-sm text-gray-600 mt-2">{choice.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-950" data-testid="regle-systeme-cantine">
            <strong>Règle appliquée :</strong> {systemInfo.rule}
            {isPayerSystem
              ? ' Saisissez donc les présents, puis les payeurs parmi ces présents.'
              : ' Il suffit de saisir les présents : ils deviennent les mangeurs.'}
          </div>
        </section>

        {/* En-tête du relevé */}
        <section className="msp-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Date du jour de cantine</span>
              <input
                type="date"
                data-testid="champ-date-payeurs"
                value={survey.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Année scolaire</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="2025 - 2026"
                data-testid="champ-annee-payeurs"
                value={survey.schoolYear}
                onChange={(e) => setSurvey({ ...survey, schoolYear: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>
          </div>

          <button
            type="button"
            data-testid="btn-reprendre-inscrits"
            onClick={importEnrolled}
            className="w-full bg-white border border-emerald-300 text-emerald-800 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reprendre les inscrits du relevé général
          </button>
          <p className="text-xs text-gray-500">
            {generalSurvey
              ? `Dernier relevé général disponible : ${frDate(generalSurvey.date)}. Les inscrits servent de repère pour le taux de présence.`
              : 'Aucun relevé général trouvé. Le relevé du jour peut quand même être saisi avec les présents.'}
          </p>
        </section>

        {warnings.length > 0 && (
          <section className="bg-amber-50 border border-amber-300 rounded-xl p-4" data-testid="alertes-payeurs-mangeurs">
            <h2 className="font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Points à vérifier
            </h2>
            <ul className="list-disc pl-5 mt-2 text-sm text-amber-900 space-y-1">
              {warnings.map((w) => <li key={`${w.level}-${w.code}`}>{w.message}</li>)}
            </ul>
            <p className="text-xs text-amber-800 mt-2">
              Pour le calcul, un payeur présent ne peut jamais dépasser l’effectif présent de sa classe.
            </p>
          </section>
        )}

        {/* Grille par classe */}
        <section className="space-y-3" data-testid="grille-payeurs-mangeurs">
          {CLASS_LEVELS.map((lvl) => {
            const raw = survey.counts.find((c) => c.level === lvl.key)
              || emptyMealCounts().find((c) => c.level === lvl.key)!;
            const row = derivedRows.find((c) => c.level === lvl.key)!;
            const rowWarnings = warnings.filter((w) => w.level === lvl.key);
            return (
              <article key={lvl.key} data-testid={`ligne-payeurs-${lvl.key}`} className="msp-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{lvl.label}</h3>
                    <p className="text-xs text-gray-500">
                      Inscrits : {row.enrolledBoys} G / {row.enrolledGirls} F · Total {row.enrolledTotal}
                    </p>
                  </div>
                  <div className="bg-orange-100 text-orange-900 rounded-xl px-3 py-2 text-center min-w-24">
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Mangeurs</p>
                    <p data-testid={`mangeurs-${lvl.key}`} className="text-xl font-black leading-none">{row.eaterTotal}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <fieldset>
                    <legend className="text-xs font-bold text-gray-700 mb-1">Présents</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[11px] text-gray-500">Garçons</span>
                        <input
                          type="number" min={0} inputMode="numeric" placeholder="0"
                          data-testid={`presents-garcons-${lvl.key}`}
                          value={raw.presentBoys || ''}
                          onChange={(e) => setCount(lvl.key, 'presentBoys', e.target.value)}
                          className="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-2.5 text-center text-base"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-gray-500">Filles</span>
                        <input
                          type="number" min={0} inputMode="numeric" placeholder="0"
                          data-testid={`presents-filles-${lvl.key}`}
                          value={raw.presentGirls || ''}
                          onChange={(e) => setCount(lvl.key, 'presentGirls', e.target.value)}
                          className="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-2.5 text-center text-base"
                        />
                      </label>
                    </div>
                  </fieldset>

                  {isPayerSystem ? (
                    <fieldset>
                      <legend className="text-xs font-bold text-gray-700 mb-1">Payeurs présents</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[11px] text-gray-500">Garçons</span>
                          <input
                            type="number" min={0} inputMode="numeric" placeholder="0"
                            data-testid={`payeurs-garcons-${lvl.key}`}
                            value={raw.paidPresentBoys || ''}
                            onChange={(e) => setCount(lvl.key, 'paidPresentBoys', e.target.value)}
                            className="mt-0.5 w-full border border-orange-300 bg-orange-50 rounded-lg px-2 py-2.5 text-center text-base"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-gray-500">Filles</span>
                          <input
                            type="number" min={0} inputMode="numeric" placeholder="0"
                            data-testid={`payeurs-filles-${lvl.key}`}
                            value={raw.paidPresentGirls || ''}
                            onChange={(e) => setCount(lvl.key, 'paidPresentGirls', e.target.value)}
                            className="mt-0.5 w-full border border-orange-300 bg-orange-50 rounded-lg px-2 py-2.5 text-center text-base"
                          />
                        </label>
                      </div>
                    </fieldset>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
                      <p className="text-xs font-bold mb-1">Payeurs présents</p>
                      <p>Non applicable : tous les présents mangent.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
                  <span>Présents : <strong>{row.presentTotal}</strong> ({row.presentBoys} G / {row.presentGirls} F)</span>
                  <span>Mangeurs : <strong>{row.eaterBoys} G / {row.eaterGirls} F</strong></span>
                  {isPayerSystem && <span>Présents non mangeurs : <strong>{row.presentNonEaters}</strong></span>}
                  {row.enrolledTotal > 0 && <span>Absents : <strong>{row.absent}</strong></span>}
                </div>

                {rowWarnings.length > 0 && (
                  <div className="mt-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    {rowWarnings.map((w) => <p key={w.code}>{w.message}</p>)}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* Totaux du jour */}
        <section className="msp-card p-4" data-testid="totaux-payeurs-mangeurs">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-700" /> Totaux du jour — {systemInfo.shortLabel}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
            <div className="bg-sky-50 rounded-xl p-3">
              <p className="text-xs text-gray-600">Présents</p>
              <p data-testid="total-presents-payeurs" className="text-2xl font-black text-sky-700">{totals.presentTotal}</p>
              <p className="text-[11px] text-gray-500">{totals.presentBoys} G / {totals.presentGirls} F</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-gray-600">{isPayerSystem ? 'Payeurs présents' : 'Base de calcul'}</p>
              <p data-testid="total-payeurs-presents" className="text-2xl font-black text-amber-700">
                {isPayerSystem ? totals.paidPresentTotal : totals.presentTotal}
              </p>
              <p className="text-[11px] text-gray-500">
                {isPayerSystem
                  ? `${totals.paidPresentBoys} G / ${totals.paidPresentGirls} F`
                  : 'Tous les présents'}
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3 ring-1 ring-orange-300">
              <p className="text-xs text-orange-900 font-semibold">Mangeurs à nourrir</p>
              <p data-testid="total-mangeurs" className="text-3xl font-black text-orange-800">{totals.eaterTotal}</p>
              <p className="text-[11px] text-orange-900">{totals.eaterBoys} G / {totals.eaterGirls} F</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-600">Présents non mangeurs</p>
              <p data-testid="total-presents-non-mangeurs" className="text-2xl font-black text-gray-700">{totals.presentNonEaters}</p>
              <p className="text-[11px] text-gray-500">{isPayerSystem ? 'Non payeurs présents' : 'Aucun dans ce système'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
            <p className="bg-white border border-gray-200 rounded-lg p-3">
              Taux de présence<br />
              <strong data-testid="taux-presence">{totals.enrolledTotal ? pct(totals.attendancePct) : '—'}</strong>
              {totals.enrolledTotal === 0 && <span className="block text-xs text-gray-500">Reprenez les inscrits pour le calculer.</span>}
            </p>
            <p className="bg-white border border-gray-200 rounded-lg p-3">
              Mangeurs parmi les présents<br /><strong>{pct(totals.eaterShareOfPresentPct)}</strong>
            </p>
            <p className="bg-white border border-gray-200 rounded-lg p-3">
              Filles parmi les mangeurs<br />
              <strong data-testid="part-filles-mangeuses">{pct(totals.girlsAmongEatersPct)}</strong>
            </p>
          </div>

          <div className="mt-3 space-y-1">
            {totals.byCycle.map((c) => (
              <p key={c.cycle} className="text-xs text-gray-600">
                {c.cycle} : <strong>{c.eaters}</strong> mangeurs sur {c.present} présents
                {isPayerSystem ? ` · ${c.paidPresent} payeurs présents` : ''}
              </p>
            ))}
          </div>

          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-950">
            <strong>Effectif à utiliser pour les vivres : {totals.eaterTotal} mangeurs.</strong>{' '}
            {isPayerSystem
              ? 'Ce sont uniquement les payeurs présents.'
              : 'Ce sont tous les élèves présents, conformément à l’apport communautaire.'}
          </div>
        </section>

        <label className="block msp-card p-4">
          <span className="text-xs font-semibold text-gray-600">Observation (facultatif)</span>
          <textarea
            rows={2}
            data-testid="champ-note-payeurs"
            value={survey.note || ''}
            onChange={(e) => setSurvey({ ...survey, note: e.target.value })}
            placeholder="Ex. paiement complété pour trois élèves après l’appel."
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="btn-pdf-payeurs"
            onClick={() => exportPayerEatersPdf(survey, totals)}
            className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <FileDown className="w-5 h-5" /> PDF
          </button>
          <button
            data-testid="btn-excel-payeurs"
            onClick={() => exportPayerEatersExcel(survey, totals)}
            className="bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <FileDown className="w-5 h-5" /> Excel
          </button>
          <button
            data-testid="btn-imprimer-payeurs"
            onClick={() => printPayerEaters(survey, totals)}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" /> Imprimer
          </button>
          <button
            data-testid="btn-mangeurs-simulateur"
            onClick={handleSendToSimulator}
            className="bg-orange-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" /> Vers simulateur
          </button>
        </div>

        <button
          onClick={() => setShowHistory((v) => !v)}
          data-testid="btn-historique-payeurs"
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <History className="w-5 h-5" />
          {showHistory ? 'Masquer l’historique' : `Historique (${history.length})`}
        </button>

        {showHistory && (
          <div className="space-y-2" data-testid="liste-historique-payeurs">
            {history.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-3">Aucun relevé payeurs-mangeurs enregistré.</p>
            )}
            {history.map((s) => {
              const t = computePayerEaterTotals(s.counts, s.system);
              return (
                <div key={s.id} className="msp-card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{frDate(s.date)} — {canteenSystemInfo(s.system).shortLabel}</p>
                    <p className="text-xs text-gray-500">
                      {t.eaterTotal} mangeurs · {t.presentTotal} présents · {t.eaterBoys} G / {t.eaterGirls} F
                    </p>
                  </div>
                  <button
                    onClick={() => { setSurvey(s); setShowHistory(false); }}
                    className="text-sm font-semibold text-emerald-700 px-3 py-2"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => deleteFromHistory(s)}
                    className="text-red-500 p-2"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-950">
          <h2 className="font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Comment utiliser ce relevé ?</h2>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Choisissez le système de l’école : <strong>payeur-mangeur</strong> ou <strong>apport communautaire</strong>.</li>
            <li>Après l’appel, saisissez les présents par classe et par sexe.</li>
            <li>En payeur-mangeur, saisissez aussi les présents ayant payé les frais de cantine.</li>
            <li>Enregistrez, puis utilisez l’effectif des <strong>mangeurs</strong> dans le simulateur et le cahier des menus.</li>
          </ol>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t p-3 grid grid-cols-2 gap-2 print:hidden">
        <button
          data-testid="btn-nouveau-payeurs"
          onClick={handleNew}
          className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
        >
          Nouveau
        </button>
        <button
          data-testid="btn-enregistrer-payeurs"
          onClick={handleSave}
          className="bg-orange-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" /> Enregistrer
        </button>
      </div>
    </div>
  );
}
