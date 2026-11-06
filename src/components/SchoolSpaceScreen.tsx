/**
 * ESPACE ÉCOLE — écran (v64).
 *
 * Chaque école a son propre espace, avec TOUTES ses classes.
 *
 * Abonnements annuels d'établissement :
 *  - Maternelle → CM2 ........ 6000 FCFA/an (code commençant par « 6 »)
 *  - Maternelle → Terminale .. 10000 FCFA/an (code commençant par « 7 »)
 *
 * Sans formule École, l'écran présente les offres et permet de SAISIR le
 * code École reçu après paiement (aucun utilisateur existant ne perd ses
 * données : seule la formule d'abonnement change). Avec une formule
 * École : création de l'espace, génération des classes du périmètre en
 * un clic, rattachement des classes existantes, titulaires, effectifs
 * F/G et progression consolidés par cycle.
 */

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BadgeCheck, Building2, Check, ChevronLeft, ChevronRight, Crown,
  GraduationCap, KeyRound, LayoutDashboard, Link2, MessageCircle, Pencil,
  Plus, School, Share2, Trash2, Unlink, Users, Wand2, Wallet,
} from 'lucide-react';
import { ClassData, SecondarySerie, getAllClasses, saveClass } from '../utils/database';
import { PLANS, SubscriptionPlan } from '../utils/subscription';
import {
  cleanSimpleCode, formatDateFr, formatSimpleCode, isAccessCode, planOfCode,
} from '../utils/simpleCode';
import { codeStatus } from '../utils/credentialsVault';
import {
  getActivationChrono, getProfile, saveActivation, schoolPlan,
} from '../utils/userProfile';
import { bindSchool, boundSchool, isBound } from '../utils/schoolBinding';
import { openWhatsApp } from '../utils/contact';
import { copyText } from '../utils/clipboard';
import { useSmartBack } from '../utils/useSmartBack';
import {
  PRIMARY_LEVELS, SECONDARY_LEVELS_TPL, SERIES, SchoolKind, SchoolWorkspace,
  activeWorkspace, adoptableClasses, buildMissingClasses, classesOfSchool,
  computeSchoolStats, createWorkspace, cycleOfClass, deleteWorkspace,
  kindForPlan, levelsForKind, loadWorkspaces, looseClasses,
  schoolSummaryText, setActiveSchoolId, updateWorkspace,
} from '../utils/schoolSpace';

type Tab = 'bord' | 'classes' | 'creer' | 'abonnement';
type SchoolPlanId = Extract<SubscriptionPlan, 'ecole-primaire' | 'ecole-complete'>;

const SCHOOL_OFFERS: SchoolPlanId[] = ['ecole-primaire', 'ecole-complete'];
const CYCLE_ORDER = ['Préscolaire', 'Primaire', 'Collège', 'Lycée'] as const;

function defaultSchoolYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start} - ${start + 1}`;
}

interface SchoolForm {
  name: string;
  kind: SchoolKind;
  directorName: string;
  phone: string;
  commune: string;
  circonscription: string;
  schoolYear: string;
  motto: string;
}

export default function SchoolSpaceScreen() {
  const goBack = useSmartBack('/mon-ecole');
  const location = useLocation();

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const chrono = useMemo(() => getActivationChrono(), [tick]);
  const currentSchoolPlan = useMemo(() => schoolPlan(), [tick]);

  const [tab, setTab] = useState<Tab>(() => {
    if (location.pathname.endsWith('/abonnement')) return 'abonnement';
    if (location.pathname.endsWith('/classes')) return 'classes';
    return 'bord';
  });

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [workspaces, setWorkspaces] = useState<SchoolWorkspace[]>([]);
  const [message, setMessage] = useState('');

  const ws = useMemo(() => activeWorkspace(workspaces), [workspaces]);
  const myClasses = useMemo(() => (ws ? classesOfSchool(classes, ws.id) : []), [classes, ws]);
  const stats = useMemo(() => computeSchoolStats(myClasses), [myClasses]);
  const adoptable = useMemo(() => (ws ? adoptableClasses(classes, ws) : []), [classes, ws]);
  const loose = useMemo(() => (ws ? looseClasses(classes, ws) : []), [classes, ws]);

  /* --- activation d'un code École --- */
  const [actName, setActName] = useState(() => getProfile().teacherName || getActivationChrono().name || '');
  const [actCode, setActCode] = useState('');
  const [actError, setActError] = useState('');

  /* --- formulaire école --- */
  const maxKind: SchoolKind = currentSchoolPlan ? kindForPlan(currentSchoolPlan) : 'primaire';
  const [form, setForm] = useState<SchoolForm>({
    name: boundSchool() || getProfile().schoolName || '',
    kind: 'primaire',
    directorName: getProfile().teacherName || '',
    phone: getProfile().phone || '',
    commune: getProfile().commune || '',
    circonscription: getProfile().circonscription || '',
    schoolYear: defaultSchoolYear(),
    motto: '',
  });
  const [editingId, setEditingId] = useState<string>('');

  /* --- générateur --- */
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [groups, setGroups] = useState(1);
  const [selectedSeries, setSelectedSeries] = useState<SecondarySerie[]>([]);
  const [generating, setGenerating] = useState(false);

  /* --- titulaire en cours d'édition --- */
  const [teacherEditId, setTeacherEditId] = useState('');
  const [teacherValue, setTeacherValue] = useState('');

  async function loadData() {
    try {
      const [all] = await Promise.all([getAllClasses()]);
      setClasses(all);
    } catch { /* base vide */ }
    setWorkspaces(loadWorkspaces());
  }

  useEffect(() => { void loadData(); }, [tick]);

  /* Quand l'école active change, le générateur propose tout son périmètre. */
  useEffect(() => {
    if (ws) setSelectedLevels(levelsForKind(ws.kind).map(t => t.level));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.id, ws?.kind]);

  const genPreview = useMemo(() => {
    if (!ws) return 0;
    return buildMissingClasses(ws, classes, {
      levels: selectedLevels, groups, series: selectedSeries,
      schoolYear: ws.schoolYear, trimester: '1er trimestre', semester: 'Premier semestre',
    }).length;
  }, [ws, classes, selectedLevels, groups, selectedSeries]);

  /* ---------------- activation ---------------- */

  const detected = useMemo(() => {
    const c = cleanSimpleCode(actCode);
    return c.length === 6 && isAccessCode(c) ? planOfCode(c) : null;
  }, [actCode]);

  function activateSchoolCode(e: FormEvent) {
    e.preventDefault();
    setActError('');
    if (!actName.trim()) {
      setActError('Indiquez le nom du directeur / de la directrice (ou du responsable) : il est enregistré avec le code École.');
      return;
    }
    const raw = cleanSimpleCode(actCode);
    if (!isAccessCode(raw)) {
      setActError('Code incorrect : vérifiez les 6 chiffres reçus de l’administrateur.');
      return;
    }
    const plan = planOfCode(raw);
    if (plan !== 'ecole-primaire' && plan !== 'ecole-complete') {
      setActError(
        `Ce code correspond à la formule « ${PLANS[plan].name} » (${PLANS[plan].price} FCFA/an), pas à un abonnement École. ` +
        'Les codes École commencent par « 6 » (6000 F, Maternelle → CM2) ou « 7 » (10000 F, Maternelle → Terminale).',
      );
      return;
    }
    const formatted = formatSimpleCode(raw);
    const status = codeStatus(formatted);
    if (!status.valid) {
      setActError('Ce code a été retiré ou supprimé par le Super Administrateur. Contactez un administrateur.');
      return;
    }
    // Remplace la formule courante par la formule École (les classes,
    // élèves et notes déjà saisis sur l'appareil sont conservés).
    saveActivation(actName.trim(), formatted);
    setActCode('');
    setMessage(`✅ Abonnement « ${PLANS[plan].name} » activé pour 1 an. Créez maintenant l’espace de votre école.`);
    setTab('creer');
    refresh();
  }

  function requestSchoolPlan(planId: SchoolPlanId) {
    const p = PLANS[planId];
    const school = form.name.trim() || boundSchool() || getProfile().schoolName || '...';
    openWhatsApp(
      `Bonjour, je souhaite l'abonnement ÉCOLE de Master Soutien Pédagogique.\n\n` +
      `Formule souhaitée : ${p.label}\n` +
      p.includes.map(f => `• ${f}`).join('\n') +
      `\n\nÉcole : ${school}\nDirecteur/Directrice : ${actName || form.directorName || '...'}\n` +
      `Commune / Circonscription : ${form.commune || '...'} / ${form.circonscription || '...'}\n\n` +
      `Formule actuelle : ${PLANS[chrono.plan].name} (${PLANS[chrono.plan].price} FCFA/an)\n\n` +
      `Merci de me communiquer la procédure de paiement (${p.price} FCFA/an) et le code École à 6 chiffres.`,
    );
  }

  /* ---------------- espace (création / édition) ---------------- */

  function submitSchool(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!currentSchoolPlan) return;
    const name = form.name.trim();
    if (name.length < 3) { setMessage('⚠️ Donnez le nom complet de l’établissement.'); return; }
    if (!form.schoolYear.trim()) { setMessage('⚠️ Indiquez l’année scolaire (ex. 2026 - 2027).'); return; }
    const kind: SchoolKind = maxKind === 'primaire' ? 'primaire' : form.kind;

    if (editingId) {
      const before = workspaces.find(w => w.id === editingId);
      updateWorkspace(editingId, {
        name, kind,
        directorName: form.directorName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        commune: form.commune.trim() || undefined,
        circonscription: form.circonscription.trim() || undefined,
        schoolYear: form.schoolYear.trim(),
        motto: form.motto.trim() || undefined,
      });
      // Renommage : les bulletins impriment ClassData.school — on aligne
      // les classes de cet espace pour qu'aucun document ne garde l'ancien nom.
      if (before && before.name !== name) {
        void (async () => {
          for (const cl of classesOfSchool(classes, editingId)) {
            await saveClass({ ...cl, school: name });
          }
          refresh();
        })();
      }
      setMessage('✅ Les informations de l’école ont été mises à jour.');
      setEditingId('');
      refresh();
      return;
    }

    // Premier espace : il fixe l'établissement de rattachement (même
    // règle que la première classe créée, cf. schoolBinding).
    if (!isBound()) bindSchool(name);
    const created = createWorkspace({
      name, kind, plan: currentSchoolPlan,
      directorName: form.directorName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      commune: form.commune.trim() || undefined,
      circonscription: form.circonscription.trim() || undefined,
      schoolYear: form.schoolYear.trim(),
      motto: form.motto.trim() || undefined,
    });
    setActiveSchoolId(created.id);
    setMessage(`✅ Espace créé pour « ${name} ». Générez maintenant ses classes ci-dessous.`);
    refresh();
  }

  function beginEdit(w: SchoolWorkspace) {
    setEditingId(w.id);
    setForm({
      name: w.name, kind: w.kind,
      directorName: w.directorName || '', phone: w.phone || '',
      commune: w.commune || '', circonscription: w.circonscription || '',
      schoolYear: w.schoolYear, motto: w.motto || '',
    });
    setTab('creer');
    window.scrollTo({ top: 0 });
  }

  async function removeWorkspace(w: SchoolWorkspace) {
    if (!confirm(`Supprimer l'espace « ${w.name} » ?\n\nLes classes, les élèves et les notes NE seront PAS effacés : ils resteront dans l'application, simplement détachés de cet espace.`)) return;
    for (const cl of classesOfSchool(classes, w.id)) {
      await saveClass({ ...cl, schoolId: undefined });
    }
    deleteWorkspace(w.id);
    setMessage('Espace supprimé. Les classes sont conservées (onglet Accueil).');
    refresh();
  }

  /* ---------------- génération des classes ---------------- */

  async function generateClasses() {
    if (!ws || generating) return;
    setGenerating(true);
    setMessage('');
    try {
      const toCreate = buildMissingClasses(ws, classes, {
        levels: selectedLevels, groups, series: selectedSeries,
        schoolYear: ws.schoolYear, trimester: '1er trimestre', semester: 'Premier semestre',
      });
      for (const cl of toCreate) await saveClass(cl);
      setMessage(toCreate.length === 0
        ? 'Toutes les classes choisies existent déjà : aucun doublon créé.'
        : `✅ ${toCreate.length} classe(s) créée(s) pour « ${ws.name} » (${ws.schoolYear}). Retrouvez-les dans « Mes classes ».`);
      setTab('classes');
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  /* ---------------- rattachements & titulaires ---------------- */

  async function attach(cl: ClassData) {
    if (!ws) return;
    await saveClass({ ...cl, schoolId: ws.id, school: ws.name, circonscription: cl.circonscription ?? ws.circonscription });
    refresh();
  }

  async function attachAll(list: ClassData[]) {
    for (const cl of list) await attach(cl);
    setMessage(`✅ ${list.length} classe(s) rattachée(s) à « ${ws?.name} ».`);
  }

  async function detach(cl: ClassData) {
    await saveClass({ ...cl, schoolId: undefined });
    refresh();
  }

  async function saveTeacher(cl: ClassData) {
    await saveClass({ ...cl, teacherName: teacherValue.trim() || undefined });
    setTeacherEditId('');
    refresh();
  }

  async function shareSummary() {
    if (!ws) return;
    const text = schoolSummaryText(ws, stats);
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try { await nav.share({ title: ws.name, text }); return; } catch { /* repli copie */ }
    }
    const ok = await copyText(text);
    setMessage(ok ? '📋 Résumé copié : collez-le dans WhatsApp ou un document.' : 'Copie impossible sur cet appareil.');
  }

  /* ================= RENDU ================= */

  const header = (
    <header className="msp-kente bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-4 shadow-lg sticky top-0 z-10">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <button onClick={goBack} className="p-2 bg-white/15 rounded-lg shrink-0" aria-label="Retour">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <School className="w-8 h-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight">Espace École</h1>
          <p className="text-emerald-100 text-xs">
            {ws ? `${ws.name} · ${stats.classes} classe(s) · ${stats.students} élève(s)` : 'Votre établissement, toutes ses classes, un seul espace'}
          </p>
        </div>
        {currentSchoolPlan && (
          <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-black">
            {PLANS[currentSchoolPlan].price} F/an
          </span>
        )}
      </div>
    </header>
  );

  /** Carte d'une offre École (6000 / 10000 F). */
  const offerCard = (planId: SchoolPlanId) => {
    const p = PLANS[planId];
    const isCurrent = currentSchoolPlan === planId;
    const levels = planId === 'ecole-primaire' ? PRIMARY_LEVELS : [...PRIMARY_LEVELS, ...SECONDARY_LEVELS_TPL];
    return (
      <div key={planId} className={`rounded-2xl border-2 p-4 ${isCurrent ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white'}`} data-testid={`offre-${planId}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Abonnement annuel d’établissement</p>
            <h3 className="font-black text-gray-900 leading-tight">{p.name}</h3>
          </div>
          <span className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-white font-black">{p.price} F<span className="text-[10px] font-bold">/an</span></span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {p.includes.map(f => (
            <li key={f} className="flex gap-1.5 text-sm text-gray-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{f}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-bold text-gray-500">Classes du périmètre ({levels.length}) :</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{levels.map(l => l.level).join(' · ')}</p>
        {isCurrent ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white">
            <BadgeCheck className="w-4 h-4" /> Formule active
            {chrono.expiresAt ? ` — jusqu’au ${formatDateFr(chrono.expiresAt)}` : ''}
          </p>
        ) : (
          <button
            onClick={() => requestSchoolPlan(planId)}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white"
            data-testid={`btn-demander-${planId}`}
          >
            <MessageCircle className="w-5 h-5" /> Demander cette formule ({p.price} F/an) — WhatsApp
          </button>
        )}
      </div>
    );
  };

  /** Formulaire de saisie d'un code École (activation / changement de formule). */
  const activationForm = (
    <form onSubmit={activateSchoolCode} className="bg-white rounded-2xl shadow-sm ring-1 ring-emerald-200 p-5" data-testid="form-code-ecole">
      <h3 className="flex items-center gap-2 font-black text-gray-900"><KeyRound className="w-5 h-5 text-emerald-700" /> J’ai reçu mon code École</h3>
      <p className="mt-1 text-sm text-gray-600">
        Saisissez le code à 6 chiffres transmis après paiement : « 6… » = 6000 F (Maternelle → CM2),
        « 7… » = 10000 F (Maternelle → Terminale). Valable 1 an, sans connexion.
        Vos classes, élèves et notes déjà saisis sont conservés.
      </p>
      <label className="mt-4 block text-sm font-medium text-gray-700">Nom du directeur / de la directrice (ou responsable) *</label>
      <input
        value={actName}
        onChange={e => setActName(e.target.value)}
        placeholder="Ex : HOUNSOU Marie"
        className="mt-1 w-full rounded-xl border border-gray-300 p-3"
        data-testid="champ-nom-code-ecole"
      />
      <label className="mt-3 block text-sm font-medium text-gray-700">Code École (6 chiffres) *</label>
      <input
        value={actCode ? formatSimpleCode(actCode) : ''}
        onChange={e => { setActCode(cleanSimpleCode(e.target.value).slice(0, 6)); setActError(''); }}
        placeholder="Ex : 612 345"
        inputMode="numeric"
        maxLength={7}
        className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-center font-mono text-lg tracking-widest"
        data-testid="champ-code-ecole"
      />
      {detected && (
        <p className={`mt-2 rounded-lg px-2 py-1 text-xs font-bold ${detected === 'ecole-primaire' || detected === 'ecole-complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`} data-testid="formule-ecole-detectee">
          ✓ Formule détectée : {PLANS[detected].label}
        </p>
      )}
      {actError && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{actError}</p>}
      <button type="submit" className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white" data-testid="btn-activer-code-ecole">
        Activer mon abonnement École
      </button>
      <p className="mt-2 text-[11px] text-gray-500">
        Formule actuelle sur cet appareil : <strong>{chrono.active ? PLANS[chrono.plan].label : 'essai gratuit / aucune'}</strong>.
        L’activation d’un code École la remplace pour 1 an, sans effacer aucune donnée.
      </p>
    </form>
  );

  /* -------- Sans formule École : présentation + offres -------- */
  if (!currentSchoolPlan) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {header}
        <main className="max-w-3xl mx-auto p-4 space-y-4">
          {message && <p className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm text-emerald-900">{message}</p>}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl p-5" data-testid="paywall-ecole">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/15 p-3"><Building2 className="h-8 w-8" /></span>
              <div>
                <h2 className="text-xl font-black leading-tight">Un espace pour toute votre école</h2>
                <p className="text-emerald-100 text-sm">Directeurs et directrices : pilotez toutes vos classes depuis un seul endroit.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                'Toutes les classes de l’école, créées en un clic (niveaux, groupes A/B, séries du lycée)',
                'Effectifs filles/garçons et progression des notes consolidés, par cycle',
                'Titulaire par classe, rattachement des classes déjà créées par vos enseignants',
                'Toutes les fonctions de la formule Pro incluses (registres, vie scolaire, bulletins…)',
              ].map(f => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{f}</li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {SCHOOL_OFFERS.map(offerCard)}
          </div>

          {activationForm}

          <p className="text-xs leading-relaxed text-gray-500">
            💡 Un code École s’utilise comme les autres codes Master Soutien Pédagogique :
            remis par l’administrateur après paiement, valable 1 an et vérifié hors-ligne.
            Les enseignants qui disposent déjà d’un code personnel (999 / 1500 / 2500 F) le conservent :
            l’abonnement École concerne l’espace de l’établissement tenu par la direction.
          </p>
        </main>
      </div>
    );
  }

  /* -------- Avec formule École : l'espace complet -------- */
  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'bord', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'classes', label: 'Mes classes', icon: Users },
    { id: 'creer', label: ws ? 'École & génération' : 'Créer mon école', icon: Wand2 },
    { id: 'abonnement', label: 'Abonnement', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {header}
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {message && <p className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm text-emerald-900" data-testid="ecole-message">{message}</p>}

        {/* Choix de l'école active (plusieurs espaces : école + annexe, années…) */}
        {workspaces.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {workspaces.map(w => (
              <button
                key={w.id}
                onClick={() => { setActiveSchoolId(w.id); refresh(); }}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold ring-1 ${ws?.id === w.id ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-gray-700 ring-gray-200'}`}
                data-testid={`espace-${w.id}`}
              >
                🏫 {w.name}
              </button>
            ))}
            <button
              onClick={() => { setEditingId(''); setForm(f => ({ ...f, name: boundSchool() || f.name })); setTab('creer'); }}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Autre espace
            </button>
          </div>
        )}

        {/* Onglets */}
        <nav className="grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-gray-200" aria-label="Espace École">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-1 py-2.5 text-[11px] font-bold leading-tight ${tab === t.id ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
              data-testid={`onglet-ecole-${t.id}`}
            >
              <t.icon className="mx-auto mb-0.5 h-5 w-5" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* ============ TABLEAU DE BORD ============ */}
        {tab === 'bord' && (
          !ws ? (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 text-center">
              <GraduationCap className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="mt-3 text-lg font-black text-gray-900">Bienvenue dans l’Espace École !</h2>
              <p className="mt-1 text-sm text-gray-600">
                Votre formule « {PLANS[currentSchoolPlan].name} » est active.
                Créez l’espace de votre établissement, puis générez toutes ses classes en un clic.
              </p>
              <button onClick={() => setTab('creer')} className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white" data-testid="btn-creer-mon-ecole">
                🏫 Créer l’espace de mon école
              </button>
              {stats.classes > 0 && <p className="mt-2 text-xs text-gray-500">Vous avez déjà des classes sur cet appareil : vous pourrez les rattacher à l’espace.</p>}
            </section>
          ) : (
            <div className="space-y-4" data-testid="ecole-tableau-bord">
              <section className="bg-white rounded-2xl shadow-sm ring-1 ring-emerald-200 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-900 leading-tight">{ws.name}</h2>
                    <p className="text-xs text-gray-500">
                      {[ws.commune, ws.circonscription, `Année ${ws.schoolYear}`].filter(Boolean).join(' · ')}
                    </p>
                    {ws.motto && <p className="mt-1 text-sm italic text-emerald-800">« {ws.motto} »</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      Périmètre : <strong>{ws.kind === 'complete' ? 'Maternelle → Terminale' : 'Maternelle → CM2'}</strong>
                      {ws.directorName ? ` · Direction : ${ws.directorName}` : ''}
                    </p>
                  </div>
                  <button onClick={() => beginEdit(ws)} className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    { v: stats.classes, l: 'Classes' },
                    { v: stats.students, l: 'Élèves' },
                    { v: `${stats.filles}F/${stats.garcons}G`, l: 'Filles/Garçons' },
                    { v: `${stats.notesPct}%`, l: 'Notes saisies' },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-lg font-black text-emerald-900">{s.v}</p>
                      <p className="text-[10px] font-semibold text-emerald-700">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.max(2, stats.notesPct)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Saisie des notes de l’école : {stats.notesDone}/{stats.notesExpected} attendues ({stats.notesPct} %)</p>
                {stats.emptyClasses > 0 && (
                  <p className="mt-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-900">
                    ℹ️ {stats.emptyClasses} classe(s) sans élèves pour l’instant : ouvrez-les depuis « Mes classes » pour y inscrire les élèves (ou via l’Enrôlement intelligent).
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={shareSummary} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
                    <Share2 className="w-4 h-4" /> Partager le résumé
                  </button>
                  <button onClick={() => setTab('creer')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">
                    <Wand2 className="w-4 h-4" /> Générer les classes
                  </button>
                </div>
              </section>

              {stats.byCycle.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
                  <h3 className="font-black text-gray-900">📊 Effectifs par cycle</h3>
                  <div className="mt-3 space-y-3">
                    {stats.byCycle.map(r => (
                      <div key={r.cycle}>
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-800">{r.cycle}</span>
                          <span className="text-gray-500">{r.classes} classe(s) · {r.students} élève(s) · {r.filles} F / {r.garcons} G</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full bg-teal-500" style={{ width: `${stats.students > 0 ? Math.round((r.students / stats.students) * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {adoptable.length > 0 && (
                <section className="bg-amber-50 rounded-2xl ring-1 ring-amber-200 p-4">
                  <p className="text-sm text-amber-950">
                    <strong>{adoptable.length} classe(s)</strong> de « {ws.name} » existent déjà hors de cet espace.
                  </p>
                  <button onClick={() => void attachAll(adoptable)} className="mt-2 w-full rounded-xl bg-amber-500 py-3 font-bold text-white" data-testid="btn-rattacher-tout">
                    Les rattacher à cet espace
                  </button>
                </section>
              )}
            </div>
          )
        )}

        {/* ============ MES CLASSES ============ */}
        {tab === 'classes' && (
          !ws ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600 ring-1 ring-gray-200">
              Créez d’abord l’espace de votre école (onglet « Créer mon école »).
            </p>
          ) : (
            <div className="space-y-4" data-testid="ecole-classes">
              {CYCLE_ORDER.map(cycle => {
                const list = myClasses.filter(cl => cycleOfClass(cl) === cycle);
                if (list.length === 0) return null;
                return (
                  <section key={cycle}>
                    <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-500">{cycle} ({list.length})</h3>
                    <div className="space-y-2">
                      {list.map(cl => {
                        const f = cl.students.filter(s => s.sexe === 'F').length;
                        const gCount = cl.students.filter(s => s.sexe === 'M').length;
                        return (
                          <div key={cl.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200" data-testid={`ecole-classe-${cl.id}`}>
                            <div className="flex items-center gap-3">
                              <Link to={`/class/${cl.id}`} className="flex-1 min-w-0">
                                <p className="font-black text-gray-900 leading-tight">{cl.name}</p>
                                <p className="text-xs text-gray-500">
                                  {cl.level}{cl.serie ? ` ${cl.serie}` : ''} · {cl.schoolYear} · {cl.students.length} élève(s) ({f} F / {gCount} G) · {cl.subjects.length} matière(s)
                                </p>
                              </Link>
                              <button
                                onClick={() => void detach(cl)}
                                className="p-2 text-gray-300 hover:text-rose-500"
                                title="Retirer de cet espace (la classe est conservée)"
                                aria-label="Retirer de l’espace"
                              >
                                <Unlink className="w-4 h-4" />
                              </button>
                              <Link to={`/class/${cl.id}`} className="p-1 text-gray-300" aria-label="Ouvrir la classe">
                                <ChevronRight className="w-5 h-5" />
                              </Link>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
                              {teacherEditId === cl.id ? (
                                <>
                                  <input
                                    value={teacherValue}
                                    onChange={e => setTeacherValue(e.target.value)}
                                    placeholder="Nom du/de la titulaire"
                                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    data-testid="champ-titulaire"
                                  />
                                  <button onClick={() => void saveTeacher(cl)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">OK</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setTeacherEditId(cl.id); setTeacherValue(cl.teacherName || ''); }}
                                  className="text-sm text-gray-600 text-left"
                                >
                                  Titulaire : <strong>{cl.teacherName || 'à renseigner'}</strong> <Pencil className="inline w-3.5 h-3.5 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {myClasses.length === 0 && (
                <section className="bg-white rounded-2xl p-6 text-center ring-1 ring-gray-200">
                  <p className="text-sm text-gray-600">Aucune classe dans cet espace pour le moment.</p>
                  <button onClick={() => setTab('creer')} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-black text-white">
                    ✨ Générer toutes les classes de l’école
                  </button>
                  <Link to="/class/new" className="mt-2 inline-block text-sm font-semibold text-emerald-700">… ou créer une classe à la main</Link>
                </section>
              )}

              {adoptable.length > 0 && (
                <section className="bg-amber-50 rounded-2xl ring-1 ring-amber-200 p-4">
                  <h3 className="font-black text-amber-950">Classes de « {ws.name} » hors espace</h3>
                  <div className="mt-2 space-y-2">
                    {adoptable.map(cl => (
                      <div key={cl.id} className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-100">
                        <span className="flex-1 text-sm"><strong>{cl.name}</strong> <span className="text-gray-500">({cl.level} · {cl.students.length} élève(s))</span></span>
                        <button onClick={() => void attach(cl)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white">
                          <Link2 className="w-3.5 h-3.5" /> Rattacher
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {loose.length > 0 && (
                <details className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                  <summary className="text-sm font-bold text-gray-700 cursor-pointer">Autres classes sur cet appareil, sans espace ({loose.length})</summary>
                  <p className="mt-2 text-xs text-gray-500">Leur école diffère de « {ws.name} » : les rattacher remplacera le nom d’école imprimé sur leurs bulletins.</p>
                  <div className="mt-2 space-y-2">
                    {loose.map(cl => (
                      <div key={cl.id} className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                        <span className="flex-1 text-sm"><strong>{cl.name}</strong> <span className="text-gray-500">({cl.school || 'sans école'} · {cl.level})</span></span>
                        <button onClick={() => { if (confirm(`Rattacher « ${cl.name} » à « ${ws.name} » ?\nLe nom d’école sur ses bulletins deviendra « ${ws.name} ».`)) void attach(cl); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                          Rattacher quand même
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <Link to="/class/new" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700">
                <Plus className="w-4 h-4" /> Créer une classe à la main
              </Link>
            </div>
          )
        )}

        {/* ============ CRÉER / GÉNÉRER ============ */}
        {tab === 'creer' && (
          <div className="space-y-4">
            <form onSubmit={submitSchool} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="form-ecole">
              <h3 className="flex items-center gap-2 font-black text-gray-900">
                <Building2 className="w-5 h-5 text-emerald-700" />
                {editingId ? 'Informations de l’école' : 'Créer l’espace de mon école'}
              </h3>
              <label className="mt-4 block text-sm font-medium text-gray-700">Nom de l’établissement *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex : École Primaire Publique Cotonou Centre"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3"
                required
                data-testid="champ-nom-ecole"
              />
              {isBound() && !editingId && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Établissement de rattachement de ce compte : <strong>{boundSchool()}</strong>.
                  Pour un transfert d’école, passez par « Mon profil » (autorisation de l’administration).
                </p>
              )}

              <p className="mt-4 text-sm font-medium text-gray-700">Périmètre de l’école *</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, kind: 'primaire' })}
                  className={`rounded-xl border-2 p-3 text-left ${form.kind === 'primaire' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'}`}
                  data-testid="kind-primaire"
                >
                  <span className="block font-black text-gray-900 text-sm">Maternelle → CM2</span>
                  <span className="block text-[11px] text-gray-500">Maternelle 1/2, CI…CM2 · 6000 F/an</span>
                </button>
                <button
                  type="button"
                  disabled={maxKind === 'primaire'}
                  onClick={() => setForm({ ...form, kind: 'complete' })}
                  className={`rounded-xl border-2 p-3 text-left ${form.kind === 'complete' && maxKind === 'complete' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'} ${maxKind === 'primaire' ? 'opacity-50' : ''}`}
                  data-testid="kind-complete"
                >
                  <span className="block font-black text-gray-900 text-sm">Maternelle → Terminale</span>
                  <span className="block text-[11px] text-gray-500">
                    {maxKind === 'primaire' ? 'Réservé à la formule 10000 F/an' : '…jusqu’à la Tle A1/A2/B/C/D · 10000 F/an'}
                  </span>
                </button>
              </div>
              {maxKind === 'primaire' && (
                <button type="button" onClick={() => setTab('abonnement')} className="mt-2 text-xs font-bold text-emerald-700 underline">
                  Passer à la formule Maternelle → Terminale (10000 F/an)
                </button>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Directeur / Directrice</label>
                  <input value={form.directorName} onChange={e => setForm({ ...form, directorName: e.target.value })} placeholder="Nom complet" className="mt-1 w-full rounded-xl border border-gray-300 p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone de l’école</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+229 …" className="mt-1 w-full rounded-xl border border-gray-300 p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commune</label>
                  <input value={form.commune} onChange={e => setForm({ ...form, commune: e.target.value })} placeholder="Ex : Cotonou" className="mt-1 w-full rounded-xl border border-gray-300 p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Circonscription scolaire</label>
                  <input value={form.circonscription} onChange={e => setForm({ ...form, circonscription: e.target.value })} placeholder="Ex : Cotonou Centre" className="mt-1 w-full rounded-xl border border-gray-300 p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Année scolaire *</label>
                  <input value={form.schoolYear} onChange={e => setForm({ ...form, schoolYear: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 p-3" required data-testid="champ-annee-ecole" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise de l’école (facultatif)</label>
                  <input value={form.motto} onChange={e => setForm({ ...form, motto: e.target.value })} placeholder="Ex : Travail – Discipline – Réussite" className="mt-1 w-full rounded-xl border border-gray-300 p-3" />
                </div>
              </div>

              <button type="submit" className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white" data-testid="btn-enregistrer-ecole">
                {editingId ? '💾 Enregistrer les informations' : '🏫 Créer l’espace de mon école'}
              </button>
              {editingId && ws && (
                <button
                  type="button"
                  onClick={() => void removeWorkspace(ws)}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-200"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer cet espace (les classes sont conservées)
                </button>
              )}
            </form>

            {ws && !editingId && (
              <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="generateur-classes">
                <h3 className="flex items-center gap-2 font-black text-gray-900"><Wand2 className="w-5 h-5 text-emerald-700" /> Générer les classes de « {ws.name} »</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Cochez les niveaux ouverts dans votre école. Les matières officielles de chaque ordre
                  d’enseignement sont créées automatiquement. Les classes déjà présentes ne sont jamais doublées.
                </p>

                {CYCLE_ORDER.map(cycle => {
                  const tpls = levelsForKind(ws.kind).filter(t => t.cycle === cycle);
                  if (tpls.length === 0) return null;
                  return (
                    <div key={cycle} className="mt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">{cycle}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {tpls.map(t => {
                          const on = selectedLevels.includes(t.level);
                          return (
                            <button
                              key={t.level}
                              type="button"
                              onClick={() => setSelectedLevels(on ? selectedLevels.filter(l => l !== t.level) : [...selectedLevels, t.level])}
                              className={`rounded-full px-3 py-2 text-sm font-bold ring-1 ${on ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-gray-50 text-gray-600 ring-gray-200'}`}
                              data-testid={`niveau-${t.level}`}
                            >
                              {on ? '✓ ' : ''}{t.level}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Groupes parallèles par niveau</label>
                    <select value={groups} onChange={e => setGroups(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-gray-300 p-3 bg-white" data-testid="select-groupes">
                      <option value={1}>1 classe par niveau</option>
                      <option value={2}>2 classes (A et B)</option>
                      <option value={3}>3 classes (A, B, C)</option>
                      <option value={4}>4 classes (A, B, C, D)</option>
                    </select>
                  </div>
                  {ws.kind === 'complete' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Séries du lycée (2nde, 1ʳᵉ, Tle)</label>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {SERIES.map(s => {
                          const on = selectedSeries.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSelectedSeries(on ? selectedSeries.filter(x => x !== s) : [...selectedSeries, s])}
                              className={`rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}
                              data-testid={`serie-${s}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">Aucune série cochée = une classe par niveau de lycée, à spécialiser ensuite.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm text-emerald-900" data-testid="apercu-generation">
                  <strong>{genPreview} classe(s)</strong> à créer pour l’année {ws.schoolYear} (période initiale : 1ᵉʳ trimestre / 1ᵉʳ semestre).
                  {stats.classes > 0 ? ' Les classes existantes de cet espace sont conservées.' : ''}
                </div>
                <button
                  onClick={() => void generateClasses()}
                  disabled={generating || selectedLevels.length === 0}
                  className="mt-3 w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white disabled:opacity-50"
                  data-testid="btn-generer-classes"
                >
                  {generating ? 'Création en cours…' : `✨ Créer les ${genPreview} classe(s) de mon école`}
                </button>
              </section>
            )}
          </div>
        )}

        {/* ============ ABONNEMENT ============ */}
        {tab === 'abonnement' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="ecole-abonnement-actuel">
              <h3 className="flex items-center gap-2 font-black text-gray-900"><Crown className="w-5 h-5 text-amber-500" /> Mon abonnement École</h3>
              <p className="mt-2 text-sm text-gray-700">
                Formule active : <strong>{PLANS[currentSchoolPlan].label}</strong>
              </p>
              {chrono.expiresAt && (
                <p className="mt-1 text-sm text-gray-600">
                  Actif jusqu’au <strong>{formatDateFr(chrono.expiresAt)}</strong> — encore <strong>{Math.max(0, chrono.daysLeft)} jour(s)</strong>.
                  Renouvelez avant l’échéance auprès d’un administrateur : vos espaces, classes et notes restent en place.
                </p>
              )}
              <ul className="mt-3 space-y-1">
                {PLANS[currentSchoolPlan].includes.map(f => <li key={f} className="text-sm text-gray-700">✔️ {f}</li>)}
              </ul>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">{SCHOOL_OFFERS.map(offerCard)}</div>

            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5 overflow-x-auto">
              <h3 className="font-black text-gray-900">Comparer les deux formules École</h3>
              <table className="mt-3 min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-3 py-2 text-left">Niveaux</th>
                    <th className="px-3 py-2 text-center">6000 F/an</th>
                    <th className="px-3 py-2 text-center">10000 F/an</th>
                  </tr>
                </thead>
                <tbody>
                  {[...PRIMARY_LEVELS, ...SECONDARY_LEVELS_TPL].map((t, i) => (
                    <tr key={t.level} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-1.5 font-semibold text-gray-800">{t.level} <span className="text-gray-400 font-normal">({t.cycle})</span></td>
                      <td className="px-3 py-1.5 text-center">{i < PRIMARY_LEVELS.length ? '✅' : '—'}</td>
                      <td className="px-3 py-1.5 text-center">✅</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">Les deux formules incluent toutes les fonctions « Pro » (2500 F) et durent 1 an à partir de l’activation du code.</p>
            </section>

            {currentSchoolPlan === 'ecole-primaire' && activationForm}
            {currentSchoolPlan === 'ecole-complete' && (
              <p className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm text-emerald-900">
                🏆 Vous disposez de la formule la plus complète : Maternelle → Terminale. Pour renouveler, demandez un nouveau code « 7… » à un administrateur avant l’échéance.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
