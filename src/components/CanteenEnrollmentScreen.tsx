/**
 * RELEVÉ DES EFFECTIFS PAR CLASSE — CANTINE (v47).
 *
 * Formulaire demandé : garçons et filles pour Maternelle 1, Maternelle 2,
 * CI, CP, CE1, CE2, CM1 et CM2.
 *
 * Choix d'interface :
 *  - AUCUN total n'est saisi : les totaux par ligne, par cycle et le
 *    pourcentage de filles sont calculés (règle v40 : « l'utilisateur ne
 *    saisit jamais une quantité calculée »).
 *  - Les huit classes sont toujours affichées ; une école sans maternelle
 *    laisse simplement ces lignes à zéro.
 *  - Le report vers le simulateur est EXPLICITE (bouton), jamais automatique.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, Users, FileDown, Printer, Calculator, History,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  CLASS_LEVELS, ClassHeadcount, EnrollmentSurvey,
  computeTotals, deleteSurvey, latestSurvey, loadSurveys, newSurvey, saveSurvey, surveyForDate,
} from '../utils/canteenEnrollment';
import { currentEstablishment } from '../utils/canteenStore';
import { getProfile } from '../utils/userProfile';
import { exportEnrollmentPdf, exportEnrollmentExcel, printEnrollment } from '../utils/canteenEnrollmentExport';

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function CanteenEnrollmentScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const etab = currentEstablishment().name;
  const profile = getProfile();

  const [survey, setSurvey] = useState<EnrollmentSurvey | null>(null);
  const [history, setHistory] = useState<EnrollmentSurvey[]>([]);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const all = loadSurveys();
    setHistory(all);
    /*
     * v58 — On ouvre sur le relevé DU JOUR s'il existe, sinon sur un relevé
     * VIERGE daté d'aujourd'hui. Auparavant on rechargeait le dernier relevé
     * enregistré : l'utilisateur changeait la date et écrasait sans le
     * vouloir le relevé de la semaine précédente.
     */
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const duJour = surveyForDate(aujourdhui);
    if (duJour) {
      setSurvey(duJour);
    } else {
      const last = latestSurvey();
      const vierge = newSurvey(etab || profile.schoolName || '', last?.schoolYear || '');
      setSurvey(vierge);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => computeTotals(survey?.counts || []),
    [survey],
  );

  if (!survey) return <div className="p-4 text-center">Chargement…</div>;

  function setCount(level: string, field: 'boys' | 'girls', raw: string) {
    if (!survey) return;
    // Saisie libre convertie en entier positif ; « 12a » ou « -3 » donnent 0.
    const value = Math.max(0, Math.trunc(Number(raw) || 0));
    const counts: ClassHeadcount[] = survey.counts.map((c) =>
      c.level === level ? { ...c, [field]: value } : c);
    setSurvey({ ...survey, counts });
  }

  function handleSave() {
    if (!survey) return;
    const saved = saveSurvey(survey);
    setSurvey(saved);
    setHistory(loadSurveys());
    setMessage('Relevé enregistré.');
    window.setTimeout(() => setMessage(''), 2500);
  }

  function handleNew() {
    setSurvey(newSurvey(etab || profile.schoolName || '', survey?.schoolYear || ''));
    setMessage('Nouveau relevé vierge.');
    window.setTimeout(() => setMessage(''), 2500);
  }

  /**
   * Report vers le simulateur : on ne modifie pas la semaine en cours sans
   * le dire. L'effectif est déposé dans un relais que le simulateur lira
   * pour pré-remplir son champ, l'utilisateur gardant la main.
   */
  function handleSendToSimulator() {
    if (!survey) return;
    if (totals.total <= 0) {
      setMessage('Saisissez d’abord au moins un effectif.');
      window.setTimeout(() => setMessage(''), 2500);
      return;
    }
    localStorage.setItem('msp_canteen_effectif_propose', String(totals.total));
    localStorage.setItem('msp_canteen_effectif_propose_meta', JSON.stringify({
      source: 'effectifs-classe',
      date: survey.date,
    }));
    navigate('/cantine/simulateur');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Effectifs par classe</h1>
            <p className="text-white/80 text-sm truncate">{etab || 'Mon établissement'}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        {message && (
          <div data-testid="message-effectifs" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm font-semibold">
            {message}
          </div>
        )}

        {/* En-tête du relevé */}
        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule mb-1" />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Date du relevé</span>
            <input
              type="date"
              data-testid="champ-date-effectif"
              value={survey.date}
              onChange={(e) => {
                /*
                 * Changer la date ouvre le relevé de cette date s'il existe
                 * déjà (on le corrige), sinon un NOUVEAU relevé : les
                 * effectifs saisis ne remplacent jamais ceux d'une autre date.
                 */
                const d = e.target.value;
                const existant = surveyForDate(d);
                if (existant) {
                  setSurvey(existant);
                  setMessage(`Relevé du ${frDate(d)} ouvert : vous le modifiez.`);
                } else {
                  setSurvey({ ...survey, id: `eff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: d });
                  setMessage(`Nouveau relevé au ${frDate(d)} : les relevés précédents sont conservés.`);
                }
                window.setTimeout(() => setMessage(''), 3500);
              }}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Année scolaire</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="2025 - 2026"
              data-testid="champ-annee-effectif"
              value={survey.schoolYear}
              onChange={(e) => setSurvey({ ...survey, schoolYear: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
        </div>

        {/* Grille de saisie : une ligne par classe */}
        <div className="msp-card overflow-hidden" data-testid="grille-effectifs">
          <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-[#046a38] text-white text-xs font-bold">
            <span>Classe</span>
            <span className="text-center">Garçons</span>
            <span className="text-center">Filles</span>
            <span className="text-right">Total</span>
          </div>

          {CLASS_LEVELS.map((lvl) => {
            const row = survey.counts.find((c) => c.level === lvl.key)
              || { level: lvl.key, boys: 0, girls: 0 };
            const t = row.boys + row.girls;
            return (
              <div
                key={lvl.key}
                data-testid={`ligne-${lvl.key}`}
                className="grid grid-cols-4 gap-1 px-3 py-2 border-b border-gray-100 last:border-0 items-center"
              >
                <span className="text-sm font-semibold text-gray-800">{lvl.label}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  data-testid={`garcons-${lvl.key}`}
                  value={row.boys || ''}
                  placeholder="0"
                  onChange={(e) => setCount(lvl.key, 'boys', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-base text-center"
                />
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  data-testid={`filles-${lvl.key}`}
                  value={row.girls || ''}
                  placeholder="0"
                  onChange={(e) => setCount(lvl.key, 'girls', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-base text-center"
                />
                {/* Jamais saisi : calculé. */}
                <span data-testid={`total-${lvl.key}`} className="text-sm font-bold text-right text-gray-800">
                  {t}
                </span>
              </div>
            );
          })}
        </div>

        {/* Totaux calculés */}
        <div className="msp-card p-4" data-testid="totaux-effectifs">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#046a38]" /> Totaux de l’école
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Garçons</p>
              <p data-testid="total-garcons" className="text-2xl font-bold text-blue-700">{totals.boys}</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Filles</p>
              <p data-testid="total-filles" className="text-2xl font-bold text-pink-700">{totals.girls}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Total</p>
              <p data-testid="total-general" className="text-2xl font-bold text-emerald-700">{totals.total}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Part des filles : <strong data-testid="part-filles">{totals.girlsPct} %</strong>
          </p>
          <div className="mt-2 space-y-1">
            {totals.byCycle.map((c) => (
              <p key={c.cycle} data-testid={`cycle-${c.cycle}`} className="text-xs text-gray-600">
                {c.cycle} : <strong>{c.total}</strong> élèves ({c.boys} G / {c.girls} F)
              </p>
            ))}
          </div>
        </div>

        <label className="block msp-card p-4">
          <span className="text-xs font-semibold text-gray-600">Observation (facultatif)</span>
          <textarea
            rows={2}
            data-testid="champ-note-effectif"
            value={survey.note || ''}
            onChange={(e) => setSurvey({ ...survey, note: e.target.value })}
            placeholder="Ex. effectif relevé après les inscriptions tardives."
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
          />
        </label>

        {/* Exports — le PDF et l'impression coexistent (règle v41) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="btn-pdf-effectifs"
            onClick={() => exportEnrollmentPdf(survey, totals)}
            className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <FileDown className="w-5 h-5" /> PDF
          </button>
          <button
            data-testid="btn-excel-effectifs"
            onClick={() => exportEnrollmentExcel(survey, totals)}
            className="bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <FileDown className="w-5 h-5" /> Excel
          </button>
          <button
            data-testid="btn-imprimer-effectifs"
            onClick={() => printEnrollment(survey, totals)}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" /> Imprimer
          </button>
          <button
            data-testid="btn-vers-simulateur"
            onClick={handleSendToSimulator}
            className="bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" /> Vers simulateur
          </button>
        </div>

        <button
          onClick={() => setShowHistory((v) => !v)}
          data-testid="btn-historique-effectifs"
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <History className="w-5 h-5" />
          {showHistory ? 'Masquer l’historique' : `Historique (${history.length})`}
        </button>

        {showHistory && (
          <div className="space-y-2" data-testid="liste-historique-effectifs">
            {history.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-3">Aucun relevé enregistré.</p>
            )}
            {history.map((s) => {
              const t = computeTotals(s.counts);
              return (
                <div key={s.id} className="msp-card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{frDate(s.date)}</p>
                    <p className="text-xs text-gray-500">
                      {t.total} élèves · {t.boys} G / {t.girls} F
                    </p>
                  </div>
                  <button
                    onClick={() => { setSurvey(s); setShowHistory(false); }}
                    className="text-sm font-semibold text-emerald-700 px-3 py-2"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm('Supprimer ce relevé ?')) return;
                      deleteSurvey(s.id);
                      setHistory(loadSurveys());
                    }}
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
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t p-3 grid grid-cols-2 gap-2 print:hidden">
        <button
          data-testid="btn-nouveau-effectif"
          onClick={handleNew}
          className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
        >
          Nouveau
        </button>
        <button
          data-testid="btn-enregistrer-effectif"
          onClick={handleSave}
          className="bg-[#046a38] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" /> Enregistrer
        </button>
      </div>
    </div>
  );
}
