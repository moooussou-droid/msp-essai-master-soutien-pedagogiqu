import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Clock3, Crown, KeyRound, MessageCircle, School, ShieldCheck, UserRound } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { PLANS, type SubscriptionPlan } from '../utils/subscription';
import { cleanSimpleCode, formatSimpleCode, isAccessCode, planOfCode } from '../utils/simpleCode';
import { codeStatus } from '../utils/credentialsVault';
import { cleanCode, verifyAccessCode } from '../utils/license';
import { getActivationChrono, getProfile, saveActivation } from '../utils/userProfile';
import { openWhatsApp, WHATSAPP_DISPLAY } from '../utils/contact';

const PLAN_ORDER: SubscriptionPlan[] = [
  'essentiel', 'complet', 'pro', 'ecole-primaire', 'ecole-complete',
];

const PLAN_TONES: Record<SubscriptionPlan, {
  ring: string;
  chip: string;
  glow: string;
  description: string;
}> = {
  essentiel: {
    ring: 'border-amber-300 bg-amber-50', chip: 'bg-amber-400 text-slate-950', glow: 'ring-amber-400',
    description: 'Les outils essentiels pour démarrer.',
  },
  complet: {
    ring: 'border-emerald-300 bg-emerald-50', chip: 'bg-emerald-800 text-white', glow: 'ring-emerald-600',
    description: 'Tout le nécessaire pour gérer votre classe.',
  },
  pro: {
    ring: 'border-indigo-300 bg-indigo-50', chip: 'bg-indigo-700 text-white', glow: 'ring-indigo-600',
    description: 'Gestion pédagogique et administrative complète.',
  },
  'ecole-primaire': {
    ring: 'border-teal-300 bg-teal-50', chip: 'bg-teal-700 text-white', glow: 'ring-teal-600',
    description: 'Tout Pro et un espace pour l’école, de la Maternelle au CM2.',
  },
  'ecole-complete': {
    ring: 'border-emerald-400 bg-emerald-100/70', chip: 'bg-emerald-900 text-white', glow: 'ring-emerald-700',
    description: 'Tout Pro et un espace scolaire jusqu’à la Terminale.',
  },
};

export default function SubscriptionActivationScreen({ onActivated }: { onActivated?: () => void }) {
  const navigate = useNavigate();
  const goBack = useSmartBack('/');
  const chrono = getActivationChrono();
  const profile = getProfile();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(chrono.active ? chrono.plan : 'complet');
  const [name, setName] = useState(profile.teacherName || chrono.name || '');
  const [school, setSchool] = useState(profile.schoolName || '');
  const [commune, setCommune] = useState(profile.commune || profile.circonscription || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [activated, setActivated] = useState(false);

  const detectedPlan = isAccessCode(code) ? planOfCode(code) : null;

  function requestActivation() {
    const plan = PLANS[selectedPlan];
    const current = chrono.active
      ? `\nFormule actuelle : ${PLANS[chrono.plan].label}${chrono.expiresAt ? ` (échéance : ${new Date(chrono.expiresAt).toLocaleDateString('fr-FR')})` : ''}`
      : '';
    const message = `Bonjour, je souhaite ${chrono.active ? 'renouveler ou mettre à jour' : 'activer'} mon abonnement Master Soutien Pédagogique.\n\n`
      + `Formule souhaitée : ${plan.label}\nPrix : ${plan.price.toLocaleString('fr-FR')} FCFA / an${current}\n\n`
      + `Nom complet : ${name.trim() || '...'}\nÉtablissement : ${school.trim() || '...'}\nCommune / circonscription : ${commune.trim() || '...'}\n\n`
      + `Merci de m’indiquer la procédure et de me transmettre mon code d’activation à 6 chiffres.`;
    openWhatsApp(message);
  }

  function updateCode(raw: string) {
    if (/^[0-9\s-]*$/.test(raw)) {
      setCode(cleanSimpleCode(raw).slice(0, 6));
    } else {
      // Compatibilité avec les anciens codes alphanumériques.
      setCode(raw.trim().slice(0, 24));
    }
    setError('');
  }

  async function activateWithCode() {
    setError('');
    if (!name.trim()) {
      setError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!code.trim()) {
      setError('Saisissez le code d’activation reçu.');
      return;
    }

    setChecking(true);
    try {
      const simple = isAccessCode(code);
      const legacy = !simple ? await verifyAccessCode(name.trim(), code) : false;
      if (!simple && !legacy) {
        setError('Code invalide. Vérifiez les chiffres reçus, puis réessayez.');
        return;
      }

      const finalCode = simple ? formatSimpleCode(code) : cleanCode(code);
      const status = codeStatus(finalCode);
      if (!status.valid) {
        setError(status.reason === 'supprime'
          ? 'Ce code n’est plus valide. Contactez l’équipe d’activation pour en recevoir un nouveau.'
          : 'Ce code a été retiré. Contactez l’équipe d’activation pour obtenir de l’aide.');
        return;
      }

      saveActivation(name.trim(), finalCode);
      setActivated(true);
      onActivated?.();
    } catch {
      setError('Impossible de vérifier ce code pour le moment. Réessayez.');
    } finally {
      setChecking(false);
    }
  }

  if (activated) {
    return (
      <div className="msp-activation-page min-h-screen px-4 py-10">
        <div className="msp-activation-shell mx-auto max-w-xl rounded-[2rem] p-7 text-center sm:p-10">
          <div className="msp-activation-success mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-white"><Check className="h-10 w-10" /></div>
          <p className="msp-eyebrow">ACTIVATION RÉUSSIE</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Bienvenue, {name.trim()} !</h1>
          <p className="mt-3 text-slate-600">Votre abonnement est activé sur cet appareil. Vos données locales sont conservées.</p>
          <button onClick={() => navigate('/')} className="msp-primary-button mt-7 w-full rounded-2xl py-4 font-black text-white">Continuer vers l’application</button>
        </div>
      </div>
    );
  }

  return (
    <div className="msp-activation-page min-h-screen pb-12">
      <header className="msp-activation-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={goBack} className="msp-activation-back flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" aria-label="Retour"><ChevronLeft className="h-6 w-6" /></button>
          <div className="min-w-0 flex-1">
            <p className="msp-eyebrow">MASTER SOUTIEN PÉDAGOGIQUE</p>
            <h1 className="truncate text-lg font-black sm:text-xl">Activation & renouvellement</h1>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white sm:inline-flex"><ShieldCheck className="h-4 w-4" /> Fonctionne hors ligne</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 pt-6 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:pt-9">
        <section className="space-y-5">
          <div className="msp-activation-hero rounded-[2rem] p-6 text-white sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Crown className="h-7 w-7 text-amber-300" /></div>
              <div>
                <p className="msp-eyebrow">VOTRE PROCHAINE ÉTAPE</p>
                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Choisissez une formule, puis demandez votre code.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">Le message WhatsApp reprend la formule et vos coordonnées. L’activation est enregistrée sur cet appareil ; l’application reste utilisable hors ligne.</p>
              </div>
            </div>
            {chrono.active && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/10 p-3 text-sm">
                <Clock3 className="h-4 w-4 text-amber-300" />
                <span>Abonnement actuel : <strong>{PLANS[chrono.plan].label}</strong></span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
                  {chrono.expired ? 'À renouveler' : `${chrono.daysLeft} jour${chrono.daysLeft === 1 ? '' : 's'} restant${chrono.daysLeft === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
          </div>

          <div className="msp-activation-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="msp-eyebrow">ÉTAPE 1</p><h3 className="mt-1 text-xl font-black text-slate-950">Choisir votre formule</h3></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">1 an d’accès</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const tone = PLAN_TONES[id];
                const selected = selectedPlan === id;
                return (
                  <button key={id} type="button" aria-pressed={selected} onClick={() => setSelectedPlan(id)} className={`msp-plan-card rounded-2xl border-2 p-4 text-left transition ${tone.ring} ${selected ? `ring-2 ${tone.glow} shadow-lg` : 'opacity-85 hover:opacity-100'}`}>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tone.chip}`}>{selected ? '✓ Choisie' : 'Formule'}</span>
                    <span className="mt-3 block text-base font-black leading-tight text-slate-950">{plan.name}</span>
                    <span className="mt-1 block text-2xl font-black text-slate-950">{plan.price.toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA / an</span></span>
                    <span className="mt-2 block min-h-10 text-xs leading-relaxed text-slate-600">{tone.description}</span>
                    <ul className="mt-3 space-y-1.5">
                      {plan.includes.slice(0, 3).map((item) => <li key={item} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-700"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{item}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="msp-activation-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-4"><p className="msp-eyebrow">ÉTAPE 2</p><h3 className="mt-1 text-xl font-black text-slate-950">Préparer votre demande</h3><p className="mt-1 text-sm text-slate-600">Ces renseignements seront inclus dans le message WhatsApp.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold text-slate-700">Nom complet</span><span className="relative block"><UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. : KOFFI Jean" className="msp-activation-input w-full rounded-xl py-3 pl-11 pr-3" /></span></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Établissement</span><span className="relative block"><School className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="Nom de l’école" className="msp-activation-input w-full rounded-xl py-3 pl-11 pr-3" /></span></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Commune / circonscription</span><input value={commune} onChange={(event) => setCommune(event.target.value)} placeholder="Ex. : Kandi" className="msp-activation-input w-full rounded-xl px-3 py-3" /></label>
            </div>
            <button onClick={requestActivation} className="msp-activation-whatsapp mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-black text-white shadow-lg">
              <MessageCircle className="h-5 w-5" /> Demander mon code WhatsApp
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">WhatsApp : {WHATSAPP_DISPLAY} · Votre demande précisera « {PLANS[selectedPlan].label} ».</p>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="msp-activation-panel rounded-[2rem] p-5 sm:p-6 lg:sticky lg:top-24">
            <div className="mb-4"><p className="msp-eyebrow">ÉTAPE 3</p><h3 className="mt-1 text-xl font-black text-slate-950">Vous avez déjà un code ?</h3><p className="mt-1 text-sm text-slate-600">Saisissez-le ici pour activer ou renouveler votre accès.</p></div>
            <label className="block text-sm font-bold text-slate-700">Code d’activation</label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="text" inputMode="text" autoComplete="one-time-code" value={isAccessCode(code) ? formatSimpleCode(code) : code} onChange={(event) => updateCode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && activateWithCode()} placeholder="000 000" maxLength={24} className="msp-activation-input w-full rounded-xl py-4 pl-11 pr-4 text-center font-mono text-xl font-black tracking-[.24em]" />
            </div>
            {detectedPlan && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">✓ Code détecté : {PLANS[detectedPlan].label}</p>}
            {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button onClick={activateWithCode} disabled={checking} className="msp-primary-button mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black text-white disabled:opacity-60"><Check className="h-5 w-5" />{checking ? 'Vérification…' : 'Activer mon abonnement'}</button>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Les codes sont vérifiés sans connexion. L’activation et vos données restent sur cet appareil.</p>
          </div>

          <div className="msp-activation-note rounded-2xl p-4">
            <p className="font-black text-emerald-950">Un parcours simple en 3 étapes</p>
            <ol className="mt-2 space-y-2 text-sm text-emerald-950/80">
              <li><strong>1.</strong> Choisissez Essentiel, Complet, Pro ou une formule École.</li>
              <li><strong>2.</strong> Envoyez votre demande à l’équipe d’activation par WhatsApp.</li>
              <li><strong>3.</strong> Saisissez le code reçu pour activer ou renouveler l’accès.</li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}
