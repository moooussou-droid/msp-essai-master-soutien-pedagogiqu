/**
 * SUPER MSP SIMULATEUR CANTINE (v40).
 *
 * Tableau de bord à 6 entrées (§39) : Nouvelle semaine · Prélèvement du jour
 * · Prévision hebdomadaire · Point hebdomadaire · Historique · Rapports.
 *
 * AUCUNE FORMULE ICI (§32) : tous les nombres viennent de `canteenCalc.ts`.
 * L'utilisateur ne saisit jamais une quantité calculée (§42).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarPlus, ClipboardCheck, BarChart3, ListChecks,
  History, FileDown, AlertTriangle, Lock, Unlock, Trash2, Printer, Share2, Save, Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  WeeklyWithdrawal, LegumeKey, CerealKey, LEGUME_LABELS, CEREAL_LABELS,
  DEFAULT_FOOD_CONFIG, calculateDailyWithdrawal, validateWeeklyParameters,
  balanceLabel, hasOverrun, formatQty, plannedLegume, explainRoundingDifference,
  legumeSwitchLabel,
  LegumeMode,
  legumeModeOf,
} from '../utils/canteenCalc';
import {
  loadWeeks, createWeek, saveWeek, closeWeek, reopenWeek, deleteWeek, currentEstablishment,
} from '../utils/canteenStore';
import { exportWeekExcel, exportWeekPdf, printWeek, shareWeek } from '../utils/canteenExport';
import {
  canteenSystemInfo, computePayerEaterTotals, payerEaterSurveyForDate,
} from '../utils/canteenPayerEaters';
import CanteenRoundingGuide from './CanteenRoundingGuide';

type View = 'accueil' | 'nouvelle' | 'jour' | 'prevision' | 'point' | 'historique' | 'rapports';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

/** Lundi de la semaine en cours, pour pré-remplir le formulaire. */
function mondayOf(d = new Date()): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function CanteenSimulatorScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const etab = currentEstablishment();

  const [view, setView] = useState<View>('accueil');
  const [weeks, setWeeks] = useState<WeeklyWithdrawal[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const list = loadWeeks();
    setWeeks(list);
    const open = list.find((w) => w.status === 'brouillon');
    if (open) setCurrentId(open.id);
  }, []);

  const current = useMemo(
    () => weeks.find((w) => w.id === currentId) || null,
    [weeks, currentId],
  );

  function refresh(selectId?: string) {
    const list = loadWeeks();
    setWeeks(list);
    if (selectId) setCurrentId(selectId);
  }

  function notify(type: 'ok' | 'err', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  /* --------------------- Formulaire nouvelle semaine --------------------- */
  const [form, setForm] = useState({
    weekStartDate: mondayOf(),
    weeklyStaffCount: '',
    workingDays: '5',
    maizeServiceCount: '',
    legume: 'haricot' as LegumeKey,
    // v42 : par defaut, aucune variation de legumineuse dans la semaine.
    legumeMode: 'unique' as LegumeMode,
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  /*
   * v47 — REPORT DEPUIS LE RELEVE D'EFFECTIFS.
   * L'ecran « Releve des effectifs par classe » peut proposer son total
   * (Garcons + Filles des 8 classes). On PRE-REMPLIT le champ sans jamais
   * ecraser une semaine deja creee : l'enseignant garde la main sur le
   * chiffre qui sert aux prelevements.
   */
  const [proposedStaff, setProposedStaff] = useState<number | null>(null);
  const [proposedStaffText, setProposedStaffText] = useState('');
  useEffect(() => {
    const raw = localStorage.getItem('msp_canteen_effectif_propose');
    if (!raw) return;
    const n = Math.trunc(Number(raw));
    let meta: { source?: string; date?: string; system?: 'payeur-mangeur' | 'apport-communautaire' } = {};
    try {
      meta = JSON.parse(localStorage.getItem('msp_canteen_effectif_propose_meta') || '{}');
    } catch {
      meta = {};
    }
    localStorage.removeItem('msp_canteen_effectif_propose');
    localStorage.removeItem('msp_canteen_effectif_propose_meta');
    if (Number.isFinite(n) && n > 0) {
      setProposedStaff(n);
      setProposedStaffText(
        meta.source === 'payeurs-mangeurs'
          ? `Effectif de mangeurs repris du relevé payeurs-mangeurs${meta.date ? ` du ${frDate(meta.date)}` : ''}${meta.system ? ` (${canteenSystemInfo(meta.system).shortLabel})` : ''} : ${n} élèves à nourrir. Vous pouvez l’ajuster pour la prévision hebdomadaire.`
          : `Effectif repris du relevé par classe (${n} élèves). Vous pouvez le corriger.`,
      );
      setForm((f) => (f.weeklyStaffCount ? f : { ...f, weeklyStaffCount: String(n) }));
      setView('nouvelle');
    }
  }, []);

  function submitNewWeek() {
    const params = {
      staffCount: parseInt(form.weeklyStaffCount, 10),
      workingDays: parseInt(form.workingDays, 10),
      maizeServiceCount: parseInt(form.maizeServiceCount, 10),
      legume: form.legume,
    };
    if (Number.isNaN(params.staffCount)) { setFormErrors(["Veuillez saisir l'effectif de la semaine."]); return; }
    if (Number.isNaN(params.maizeServiceCount)) { setFormErrors(['Veuillez indiquer le nombre de sorties de maïs.']); return; }

    const check = validateWeeklyParameters(params);
    if (!check.valid) { setFormErrors(check.errors); return; }

    setFormErrors([]);
    const week = createWeek({
      weekStartDate: form.weekStartDate,
      weekEndDate: addDays(form.weekStartDate, params.workingDays - 1),
      weeklyStaffCount: params.staffCount,
      workingDays: params.workingDays,
      maizeServiceCount: params.maizeServiceCount,
      legume: params.legume,
      legumeMode: form.legumeMode,
    });
    refresh(week.id);
    notify('ok', 'Semaine créée. La prévision est calculée.');
    setView('prevision');
  }

  /** Nouvelle semaine avec confirmation, sans effacer l'historique (§22). */
  function askNewWeek() {
    if (current && current.status === 'brouillon') {
      const ok = window.confirm(
        `La semaine du ${frDate(current.weekStartDate)} n'est pas clôturée.\n\n`
        + 'Elle sera conservée dans l\'historique. Voulez-vous tout de même commencer une nouvelle semaine ?',
      );
      if (!ok) return;
    }
    setForm({
      weekStartDate: mondayOf(),
      weeklyStaffCount: '',
      workingDays: '5',
      maizeServiceCount: '',
      legume: 'haricot',
      legumeMode: 'unique',
    });
    setFormErrors([]);
    setView('nouvelle');
  }

  /* ----------------------- Saisie d'une journée ----------------------- */
  function updateDay(dayNumber: number, patch: { staffCount?: number; cereal?: CerealKey; date?: string; legume?: LegumeKey }) {
    if (!current || current.status === 'cloturee') return;
    const days = current.dailyWithdrawals.map((d) => {
      if (d.dayNumber !== dayNumber) return d;
      const merged = { ...d, ...patch };
      // Recalcul immédiat : les quantités ne sont jamais saisies.
      return calculateDailyWithdrawal({
        dayNumber: merged.dayNumber,
        date: merged.date,
        staffCount: merged.staffCount,
        cereal: merged.cereal,
        // v41 : légumineuse propre à la journée (elle peut différer de celle
        // prévue si un stock s'est épuisé en cours de semaine).
        legume: merged.legume || current.legume,
      });
    });
    const updated = saveWeek({ ...current, dailyWithdrawals: days });
    setWeeks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }

  /**
   * v66 — l'effectif du jour est celui des MANGEURS du relevé
   * payeurs-mangeurs de la même date : payeurs présents en système
   * payeur-mangeur, ou tous les présents en apport communautaire.
   */
  function importMealBeneficiaries(dayNumber: number, dateIso: string) {
    const survey = payerEaterSurveyForDate(dateIso);
    if (!survey) {
      notify('err', `Aucun relevé payeurs-mangeurs enregistré au ${frDate(dateIso)}.`);
      return;
    }
    const totals = computePayerEaterTotals(survey.counts, survey.system);
    if (totals.eaterTotal <= 0) {
      notify('err', `Le relevé du ${frDate(dateIso)} ne contient aucun mangeur.`);
      return;
    }
    updateDay(dayNumber, { staffCount: totals.eaterTotal, date: dateIso });
    notify(
      'ok',
      `${totals.eaterTotal} mangeurs repris du relevé du ${frDate(dateIso)} (${canteenSystemInfo(survey.system).shortLabel}).`,
    );
  }

  /* ------------------------------ Rendu ------------------------------ */

  const tone = 'from-orange-600 to-amber-600';

  function Header({ title, onBack }: { title: string; onBack: () => void }) {
    return (
      <header className={`bg-gradient-to-r ${tone} text-white p-4 sticky top-0 z-10 print:hidden`}>
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
  }

  function Banner() {
    if (!message) return null;
    return (
      <div
        data-testid="canteen-message"
        className={`mx-4 mt-3 rounded-lg px-4 py-3 text-sm font-medium ${
          message.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-800 border border-red-200'}`}
      >
        {message.text}
      </div>
    );
  }

  /* ----------------------------- Accueil ----------------------------- */
  if (view === 'accueil') {
    const cards: { key: View; title: string; desc: string; icon: any; color: string; action?: () => void }[] = [
      { key: 'nouvelle',   title: 'Nouvelle semaine',      desc: 'Saisir l’effectif et les jours de cantine', icon: CalendarPlus,    color: 'bg-orange-500',  action: askNewWeek },
      { key: 'jour',       title: 'Prélèvement du jour',   desc: 'Ce qu’il faut sortir aujourd’hui',          icon: ClipboardCheck,  color: 'bg-emerald-600' },
      { key: 'prevision',  title: 'Prévision hebdomadaire',desc: 'Les quantités prévues pour la semaine',     icon: BarChart3,       color: 'bg-blue-600' },
      { key: 'point',      title: 'Point hebdomadaire',    desc: 'Prévu, réel et reliquat',                   icon: ListChecks,      color: 'bg-purple-600' },
      { key: 'historique', title: 'Historique',            desc: 'Toutes les semaines enregistrées',          icon: History,         color: 'bg-slate-600' },
      { key: 'rapports',   title: 'Rapports',              desc: 'PDF, Excel, impression et partage',         icon: FileDown,        color: 'bg-rose-600' },
    ];

    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Super MSP Simulateur cantine" onBack={goBack} />
        <Banner />

        <div className="p-4">
          {current ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4" data-testid="semaine-courante">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500">Semaine en cours</p>
                  <p className="font-bold text-gray-800">
                    Du {frDate(current.weekStartDate)} au {frDate(current.weekEndDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {current.weeklyStaffCount} élèves · {current.workingDays} jour(s) · {LEGUME_LABELS[current.legume]}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  current.status === 'cloturee' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'}`}>
                  {current.status === 'cloturee' ? 'Clôturée' : 'En cours'}
                </span>
              </div>
              {hasOverrun(current.weeklySummary) && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="alerte-depassement">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-800 font-medium">
                    Attention : les sorties dépassent la prévision. Voir « Point hebdomadaire ».
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-900">
                Aucune semaine enregistrée. Commencez par « Nouvelle semaine ».
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => (
              <button
                key={c.key}
                data-testid={`carte-${c.key}`}
                onClick={() => (c.action ? c.action() : setView(c.key))}
                className="bg-white rounded-xl border border-gray-200 p-4 text-left active:scale-95 transition min-h-[128px] flex flex-col"
              >
                <div className={`${c.color} w-11 h-11 rounded-xl flex items-center justify-center mb-2`}>
                  <c.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{c.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- Nouvelle semaine ------------------------- */
  if (view === 'nouvelle') {
    const days = parseInt(form.workingDays, 10) || 0;
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Nouvelle semaine" onBack={() => setView('accueil')} />
        <div className="p-4 space-y-4">
          {formErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="erreurs-formulaire">
              <ul className="text-sm text-red-800 space-y-1 list-disc pl-5">
                {formErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Premier jour de la semaine</span>
              <input
                type="date" data-testid="champ-debut"
                value={form.weekStartDate}
                onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Nombre d’élèves inscrits à la cantine</span>
              <input
                type="number" inputMode="numeric" min={1} data-testid="champ-effectif"
                value={form.weeklyStaffCount}
                onChange={(e) => setForm({ ...form, weeklyStaffCount: e.target.value })}
                placeholder="Exemple : 282"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
              />
            
              {proposedStaff !== null && (
                <span data-testid="effectif-propose" className="mt-1 block text-[11px] text-emerald-700 font-semibold">
                  {proposedStaffText || `Effectif repris du relevé par classe (${proposedStaff} élèves). Vous pouvez le corriger.`}
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Jours de cantine dans la semaine</span>
              <select
                data-testid="champ-jours"
                value={form.workingDays}
                onChange={(e) => setForm({ ...form, workingDays: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} jour{n > 1 ? 's' : ''}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Nombre de jours où l’on sert du maïs</span>
              <select
                data-testid="champ-mais"
                value={form.maizeServiceCount}
                onChange={(e) => setForm({ ...form, maizeServiceCount: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
              >
                <option value="">Choisir…</option>
                {Array.from({ length: days + 1 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n} jour{n > 1 ? 's' : ''} de maïs</option>
                ))}
              </select>
              <span className="text-xs text-gray-500 mt-1 block">
                Les autres jours seront servis au riz{days ? ` (${Math.max(0, days - (parseInt(form.maizeServiceCount, 10) || 0))} jour(s))` : ''}.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Légumineuse de la semaine</span>
              <select
                data-testid="champ-legumineuse"
                value={form.legume}
                onChange={(e) => setForm({ ...form, legume: e.target.value as LegumeKey })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
              >
                {(['haricot', 'pois_jaune', 'pois_vert', 'aucune'] as LegumeKey[]).map((k) => (
                  <option key={k} value={k}>{LEGUME_LABELS[k]}</option>
                ))}
              </select>
            </label>

            {/*
              v42 — Mode de gestion de la légumineuse.
              Le cas NORMAL, coché par défaut, est « aucun changement » :
              la légumineuse choisie ci-dessus sert toute la semaine.
              L'option « changement » n'est là que pour le cas exceptionnel
              d'un stock qui s'épuise avant la fin de la semaine.
            */}
            <fieldset className="block border border-gray-200 rounded-xl p-3">
              <legend className="text-sm font-semibold text-gray-700 px-1">
                Gestion de la légumineuse
              </legend>

              <label className="flex items-start gap-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="legume-mode"
                  data-testid="mode-legume-unique"
                  checked={form.legumeMode !== 'changement'}
                  onChange={() => setForm({ ...form, legumeMode: 'unique' })}
                  className="mt-1 w-5 h-5 accent-orange-600"
                />
                <span className="text-sm text-gray-800">
                  <strong>Aucun changement cette semaine</strong>
                  <span className="block text-xs text-gray-600">
                    {LEGUME_LABELS[form.legume]} est servi(e) tous les jours. C'est le cas habituel.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="legume-mode"
                  data-testid="mode-legume-changement"
                  checked={form.legumeMode === 'changement'}
                  onChange={() => setForm({ ...form, legumeMode: 'changement' })}
                  className="mt-1 w-5 h-5 accent-orange-600"
                />
                <span className="text-sm text-gray-800">
                  <strong>Changement de légumineuse en cours de semaine</strong>
                  <span className="block text-xs text-gray-600">
                    À utiliser si le stock s'épuise : vous choisirez alors la
                    légumineuse jour par jour, et les reliquats seront suivis
                    séparément pour chacune.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          <button
            data-testid="btn-creer-semaine"
            onClick={submitNewWeek}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl text-base active:scale-95 transition"
          >
            Calculer la prévision de la semaine
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Simulateur cantine" onBack={() => setView('accueil')} />
        <div className="p-6">
          <p className="text-gray-700">Aucune semaine enregistrée pour le moment.</p>
          <button onClick={askNewWeek} className="mt-4 bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold">
            Créer une semaine
          </button>
        </div>
      </div>
    );
  }

  const cfg = DEFAULT_FOOD_CONFIG;
  const plan = current.weeklyPlan;
  const sum = current.weeklySummary;
  const legumeLabel = LEGUME_LABELS[current.legume];
  // v42 : mode de legumineuse de la semaine affichee ('unique' par defaut).
  const legumeMode = legumeModeOf(current);

  /* ------------------------ Prévision hebdomadaire ------------------------ */
  if (view === 'prevision') {
    const rows = [
      { label: 'Maïs',        qty: plan.maize, unit: cfg.maize.unit, services: current.maizeServiceCount, food: 'maize' as const },
      { label: 'Riz',         qty: plan.rice,  unit: cfg.rice.unit,  services: current.workingDays - current.maizeServiceCount, food: 'rice' as const },
      { label: legumeLabel,   qty: plannedLegume(plan), unit: cfg.legume.unit, services: current.legume === 'aucune' ? 0 : current.workingDays, food: 'legume' as const },
      { label: 'Huile',       qty: plan.oil,   unit: cfg.oil.unit,   services: current.workingDays, food: 'oil' as const },
      { label: 'Sel',         qty: plan.salt,  unit: cfg.salt.unit,  services: current.workingDays, food: 'salt' as const },
    ];

    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Prévision hebdomadaire" onBack={() => setView('accueil')} />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              Semaine du <strong>{frDate(current.weekStartDate)}</strong> au <strong>{frDate(current.weekEndDate)}</strong>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {current.weeklyStaffCount} élèves · {current.maizeServiceCount} jour(s) de maïs ·{' '}
              {current.workingDays - current.maizeServiceCount} jour(s) de riz
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="table-prevision">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-semibold text-gray-800">{r.label}</p>
                  <p className="text-xs text-gray-500">
                    {r.services} service(s) × {formatQty(r.services ? r.qty / r.services : 0)} {r.unit}
                  </p>
                </div>
                <p className="text-lg font-bold text-orange-700" data-testid={`prevu-${r.food}`}>
                  {formatQty(r.qty)} {r.unit}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-900 mb-1">Comment ces quantités sont obtenues</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              {explainRoundingDifference(current.weeklyStaffCount, 'maize')} La règle par intervalles est
              appliquée à la quantité d’un service, puis le résultat est multiplié par le nombre de services
              prévu pour chaque denrée.
            </p>
          </div>

          <CanteenRoundingGuide compact />

          <button onClick={() => setView('jour')} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl">
            Saisir les prélèvements du jour
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- Prélèvement du jour --------------------------- */
  if (view === 'jour') {
    const locked = current.status === 'cloturee';
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Prélèvement du jour" onBack={() => setView('accueil')} />
        <Banner />
        <div className="p-4 space-y-3">
          {locked && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Semaine clôturée : la saisie est verrouillée.
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed" data-testid="note-arrondi-jour">
            <strong>Arrondi de sortie v65 :</strong> huile, céréales et légumineuses au quart
            (seuils 0,375 · 0,625 · 0,875) ; sel au dixième (seuils 0,15 · 0,25 · … · 0,95).
            La partie décimale est classée par intervalle, par service. Un entier exact reste entier.
          </div>

          {current.dailyWithdrawals.map((d) => {
            const dateIso = d.date || addDays(current.weekStartDate, d.dayNumber - 1);
            return (
              <div key={d.dayNumber} className="bg-white rounded-xl border border-gray-200 p-4" data-testid={`jour-${d.dayNumber}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-800">
                    {DAY_NAMES[d.dayNumber - 1] || `Jour ${d.dayNumber}`}
                  </p>
                  <p className="text-xs text-gray-500">{frDate(dateIso)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Élèves mangeurs</span>
                    <input
                      type="number" inputMode="numeric" min={0} disabled={locked}
                      data-testid={`effectif-jour-${d.dayNumber}`}
                      value={d.staffCount || ''}
                      onChange={(e) => updateDay(d.dayNumber, { staffCount: parseInt(e.target.value, 10) || 0, date: dateIso })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base disabled:bg-gray-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Céréale servie</span>
                    <select
                      disabled={locked}
                      data-testid={`cereale-jour-${d.dayNumber}`}
                      value={d.cereal}
                      onChange={(e) => updateDay(d.dayNumber, { cereal: e.target.value as CerealKey, date: dateIso })}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white disabled:bg-gray-100"
                    >
                      {(['aucune', 'maize', 'rice'] as CerealKey[]).map((k) => (
                        <option key={k} value={k}>{CEREAL_LABELS[k]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={locked}
                  data-testid={`reprendre-mangeurs-jour-${d.dayNumber}`}
                  onClick={() => importMealBeneficiaries(d.dayNumber, dateIso)}
                  className="mt-3 w-full bg-orange-50 border border-orange-300 text-orange-900 rounded-lg px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  Reprendre les mangeurs du relevé payeurs-mangeurs
                </button>
                <p className="mt-1 text-[11px] text-gray-500">
                  Selon le système enregistré à cette date : payeurs présents ou tous les présents en apport communautaire.
                </p>

                {/*
                  v41 — légumineuse du jour.
                  Si le stock d'une légumineuse s'épuise, on termine la
                  semaine avec une autre : le choix se fait donc jour par jour.
                */}
                {/*
                  v42 — ce réglage n'apparaît qu'en mode « changement ».
                  En mode normal, la légumineuse de la semaine s'applique
                  partout : afficher un menu par jour n'aurait aucun sens et
                  risquerait de créer un écart involontaire.
                */}
                {legumeMode === 'changement' ? (
                <label className="block mt-3">
                  <span className="text-xs font-semibold text-gray-600">Légumineuse servie ce jour</span>
                  <select
                    disabled={locked}
                    data-testid={`legumineuse-jour-${d.dayNumber}`}
                    value={d.legume || current.legume}
                    onChange={(e) => updateDay(d.dayNumber, { legume: e.target.value as LegumeKey, date: dateIso })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white disabled:bg-gray-100"
                  >
                    {(['haricot', 'pois_jaune', 'pois_vert', 'aucune'] as LegumeKey[]).map((k) => (
                      <option key={k} value={k}>{LEGUME_LABELS[k]}</option>
                    ))}
                  </select>
                  {(d.legume || current.legume) !== current.legume && (
                    <span className="text-[11px] text-amber-700 font-semibold mt-1 block" data-testid={`changement-jour-${d.dayNumber}`}>
                      Remplace la légumineuse prévue ({LEGUME_LABELS[current.legume]}).
                    </span>
                  )}
                </label>
                ) : (
                  <div className="mt-3" data-testid={`legumineuse-fixe-${d.dayNumber}`}>
                    <p className="text-xs text-gray-600">
                      Légumineuse servie ce jour :{' '}
                      <strong>
                        {(d.legume || current.legume) === 'aucune'
                          ? 'Aucune'
                          : LEGUME_LABELS[current.legume]}
                      </strong>
                      {(d.legume || current.legume) !== 'aucune' && ' (identique toute la semaine).'}
                    </p>
                    {/*
                      v44 — meme en mode « legumineuse unique », il arrive qu'une
                      journee se passe de legumineuse (rupture, menu different).
                      Cette case permet de le declarer sans devoir basculer tout
                      le parametrage de la semaine en mode « changement ».
                    */}
                    <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        disabled={locked}
                        data-testid={`sans-legumineuse-jour-${d.dayNumber}`}
                        checked={(d.legume || current.legume) === 'aucune'}
                        onChange={(e) =>
                          updateDay(d.dayNumber, {
                            legume: e.target.checked ? 'aucune' : current.legume,
                            date: dateIso,
                          })
                        }
                        className="w-4 h-4"
                      />
                      Pas de légumineuse ce jour
                    </label>
                  </div>
                )}

                {d.cereal !== 'aucune' && d.staffCount > 0 ? (
                  <div className="mt-3 bg-emerald-50 rounded-lg p-3" data-testid={`quantites-jour-${d.dayNumber}`}>
                    <p className="text-xs font-semibold text-emerald-900 mb-2">
                      À sortir du magasin (calcul automatique)
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-emerald-900">
                      {d.maizeQuantity > 0 && <span>Maïs : <strong>{formatQty(d.maizeQuantity)} kg</strong></span>}
                      {d.riceQuantity > 0 && <span>Riz : <strong>{formatQty(d.riceQuantity)} kg</strong></span>}
                      {d.legumeQuantity > 0 && <span>{LEGUME_LABELS[d.legume || current.legume]} : <strong>{formatQty(d.legumeQuantity)} kg</strong></span>}
                      <span>Huile : <strong>{formatQty(d.oilQuantity)} {cfg.oil.unit}</strong></span>
                      <span>Sel : <strong>{formatQty(d.saltQuantity)} kg</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">
                    {d.cereal === 'aucune' ? 'Pas de cuisson ce jour : aucune sortie.' : 'Indiquez l’effectif du jour.'}
                  </p>
                )}
              </div>
            );
          })}

          <button onClick={() => setView('point')} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl">
            Voir le point de la semaine
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- Point hebdomadaire --------------------------- */
  if (view === 'point') {
    /*
     * v41 — une ligne par légumineuse réellement concernée. Si la semaine a
     * changé de légumineuse, deux lignes apparaissent (par exemple Haricot
     * puis Pois jaune) : un cumul unique masquerait un dépassement sur l'une
     * pendant que l'autre reste en stock.
     */
    const legumeRows = (sum.legumeLines && sum.legumeLines.length > 0)
      ? sum.legumeLines.map((l) => ({
          label: l.label, p: l.planned, a: l.actual, b: l.balance,
          unit: cfg.legume.unit, key: `legume-${l.key}`,
        }))
      : [{ label: legumeLabel, p: sum.legumePlanned, a: sum.legumeActual, b: sum.legumeBalance,
           unit: cfg.legume.unit, key: 'legume' }];

    const rows = [
      { label: 'Maïs',      p: sum.maizePlanned,  a: sum.maizeActual,  b: sum.maizeBalance,  unit: cfg.maize.unit,  key: 'maize' },
      { label: 'Riz',       p: sum.ricePlanned,   a: sum.riceActual,   b: sum.riceBalance,   unit: cfg.rice.unit,   key: 'rice' },
      ...legumeRows,
      { label: 'Huile',     p: sum.oilPlanned,    a: sum.oilActual,    b: sum.oilBalance,    unit: cfg.oil.unit,    key: 'oil' },
      { label: 'Sel',       p: sum.saltPlanned,   a: sum.saltActual,   b: sum.saltBalance,   unit: cfg.salt.unit,   key: 'salt' },
    ];

    const switchNote = legumeSwitchLabel(current.dailyWithdrawals);

    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Point hebdomadaire" onBack={() => setView('accueil')} />
        <Banner />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Nombre total de plats servis</p>
              <p className="text-2xl font-bold text-gray-800" data-testid="total-plats">{sum.totalMeals}</p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              current.status === 'cloturee' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'}`}>
              {current.status === 'cloturee' ? 'Clôturée' : 'En cours'}
            </span>
          </div>

          {switchNote && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4" data-testid="note-changement-legumineuse">
              <p className="text-sm text-amber-900 font-semibold">{switchNote}</p>
              <p className="text-xs text-amber-800 mt-1">
                La prévision a été réajustée automatiquement pour chaque légumineuse.
              </p>
            </div>
          )}

          {hasOverrun(sum) && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3" data-testid="alerte-depassement">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-red-900">Dépassement détecté</p>
                <p className="text-sm text-red-800">
                  Les sorties réelles dépassent la prévision pour au moins une denrée. Vérifiez les effectifs saisis.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="table-point">
            <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-gray-100 text-xs font-bold text-gray-600">
              <span>Denrée</span><span className="text-right">Prévu</span>
              <span className="text-right">Sorti</span><span className="text-right">Reliquat</span>
            </div>
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-4 gap-1 px-3 py-3 border-b border-gray-100 last:border-0 items-center">
                <span className="text-sm font-semibold text-gray-800">{r.label}</span>
                <span className="text-sm text-right text-gray-600">{formatQty(r.p)}</span>
                <span className="text-sm text-right text-gray-600">{formatQty(r.a)}</span>
                <span
                  data-testid={`reliquat-${r.key}`}
                  className={`text-sm text-right font-bold ${r.b < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                >
                  {formatQty(r.b)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {rows.filter((r) => r.b !== 0).map((r) => (
              <p key={r.key} className={`text-sm px-3 py-2 rounded-lg ${
                r.b < 0 ? 'bg-red-50 text-red-800 font-semibold' : 'bg-emerald-50 text-emerald-800'}`}>
                {r.label} — {balanceLabel(r.b, r.unit)}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="btn-enregistrer"
              onClick={() => { const u = saveWeek(current); setWeeks((p) => p.map((w) => (w.id === u.id ? u : w))); notify('ok', 'Semaine enregistrée.'); }}
              className="bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> Enregistrer
            </button>
            {current.status === 'brouillon' ? (
              <button
                data-testid="btn-cloturer"
                onClick={() => {
                  if (!window.confirm('Clôturer cette semaine ? Elle ne pourra plus être modifiée sans être rouverte.')) return;
                  closeWeek(current.id); refresh(current.id); notify('ok', 'Semaine clôturée.');
                }}
                className="bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" /> Clôturer
              </button>
            ) : (
              <button
                data-testid="btn-rouvrir"
                onClick={() => { reopenWeek(current.id); refresh(current.id); notify('ok', 'Semaine rouverte : vous pouvez modifier.'); }}
                className="bg-amber-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                <Unlock className="w-5 h-5" /> Rouvrir
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Historique ------------------------------ */
  if (view === 'historique') {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <Header title="Historique des semaines" onBack={() => setView('accueil')} />
        <Banner />
        <div className="p-4 space-y-3" data-testid="liste-historique">
          {weeks.length === 0 && <p className="text-gray-600 text-sm">Aucune semaine enregistrée.</p>}
          {weeks.map((w) => (
            <div key={w.id} className={`bg-white rounded-xl border p-4 ${w.id === currentId ? 'border-orange-400' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800">Du {frDate(w.weekStartDate)} au {frDate(w.weekEndDate)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {w.weeklyStaffCount} élèves · {w.weeklySummary.totalMeals} plats · {LEGUME_LABELS[w.legume]}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${
                  w.status === 'cloturee' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'}`}>
                  {w.status === 'cloturee' ? 'Clôturée' : 'En cours'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setCurrentId(w.id); setView('point'); }}
                  className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm('Supprimer définitivement cette semaine ?')) return;
                    deleteWeek(w.id); refresh(); notify('ok', 'Semaine supprimée.');
                  }}
                  className="px-4 bg-red-50 text-red-700 rounded-lg border border-red-200"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------- Rapports ------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Header title="Rapports et exports" onBack={() => setView('accueil')} />
      <Banner />
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Semaine du <strong>{frDate(current.weekStartDate)}</strong> au <strong>{frDate(current.weekEndDate)}</strong>
          </p>
        </div>

        <button
          data-testid="btn-export-pdf"
          onClick={async () => {
            try { await exportWeekPdf(current); notify('ok', 'Fichier PDF téléchargé.'); }
            catch { notify('err', 'Export impossible sur cet appareil.'); }
          }}
          className="w-full bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Télécharger le PDF
        </button>

        <button
          data-testid="btn-export-excel"
          onClick={async () => {
            try { await exportWeekExcel(current); notify('ok', 'Fichier Excel généré.'); }
            catch { notify('err', 'Export impossible sur cet appareil.'); }
          }}
          className="w-full bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Exporter en Excel
        </button>

        <button
          data-testid="btn-imprimer"
          onClick={() => printWeek(current)}
          className="w-full bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" /> Imprimer
        </button>

        <button
          data-testid="btn-partager"
          onClick={async () => {
            const ok = await shareWeek(current);
            notify(ok ? 'ok' : 'err', ok ? 'Résumé prêt à être partagé.' : 'Partage indisponible : le résumé a été copié.');
          }}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" /> Partager le résumé
        </button>
      </div>
    </div>
  );
}
