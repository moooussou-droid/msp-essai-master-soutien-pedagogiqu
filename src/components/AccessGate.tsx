import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Clock, KeyRound, MessageCircle, Sparkles, Trash2, User } from 'lucide-react';
import { verifyAccessCode, cleanCode } from '../utils/license';
import { isAccessCode, formatSimpleCode, cleanSimpleCode, planOfCode, CODE_VALIDITY_DAYS } from '../utils/simpleCode';
import { PLANS as PLAN_CATALOG, SubscriptionPlan } from '../utils/subscription';
import { saveActivation } from '../utils/userProfile';
import { openWhatsApp, WHATSAPP_DISPLAY } from '../utils/contact';
import { clearAllExcept, codeStatus } from '../utils/credentialsVault';
import { startTrial, trialStatus, TRIAL_HOURS } from '../utils/trial';

interface AdminContact {
  name: string;
  role: string;
  phone: string;
}

interface Props {
  onActivated: () => void;
  onOpenTeam: () => void;
  onOpenPrincipal: () => void;
  /** v55 : prévient le portail que l'essai gratuit vient de démarrer. */
  onTrialStarted?: () => void;
}

/*
 * LES CINQ FORMULES PRESENTEES SUR L'ACCUEIL (v54, etendu en v64).
 *
 * ⚠️ La liste n'est plus recopiee ici : elle est LUE dans
 * `subscription.ts`, source unique de verite. Auparavant, l'accueil
 * contenait sa propre copie codee en dur, et c'est precisement pour cela
 * que la formule Pro (2500 F) n'y apparaissait pas apres la v53. Ajouter
 * ou modifier un forfait ne demande desormais qu'une seule modification.
 * En v64 s'ajoutent les abonnements annuels d'ETABLISSEMENT :
 * Ecole Maternelle→CM2 (6000 F) et Maternelle→Terminale (10000 F).
 */
const PLAN_ORDER: SubscriptionPlan[] = ['essentiel', 'complet', 'pro', 'ecole-primaire', 'ecole-complete'];

const PLAN_STYLES: Record<SubscriptionPlan, {
  accent: string; badge: string; ring: string; short: string;
}> = {
  essentiel: {
    accent: 'border-amber-300 bg-[#fff8e1]',
    badge: 'bg-amber-400 text-slate-900',
    ring: 'ring-amber-500 border-amber-500',
    short: 'Pour démarrer',
  },
  complet: {
    accent: 'border-emerald-300 bg-emerald-50',
    badge: 'bg-[#006b4f] text-white',
    ring: 'ring-emerald-600 border-emerald-600',
    short: 'Le plus choisi',
  },
  pro: {
    accent: 'border-indigo-300 bg-indigo-50',
    badge: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-600 border-indigo-600',
    short: 'Gestion complète',
  },
  'ecole-primaire': {
    accent: 'border-teal-300 bg-teal-50',
    badge: 'bg-teal-700 text-white',
    ring: 'ring-teal-600 border-teal-600',
    short: 'Pour les écoles primaires',
  },
  'ecole-complete': {
    accent: 'border-emerald-400 bg-emerald-100/70',
    badge: 'bg-emerald-800 text-white',
    ring: 'ring-emerald-800 border-emerald-800',
    short: 'Groupes scolaires complets',
  },
};

export default function AccessGate({ onActivated, onOpenTeam, onOpenPrincipal, onTrialStarted }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  /* v54 : le forfait retenu par l'utilisateur, envoye a l'administrateur. */
  const [chosenPlan, setChosenPlan] = useState<SubscriptionPlan>('complet');
  /* v55 : etat de l'essai gratuit (duree = TRIAL_HOURS). */
  const [trial, setTrial] = useState(() => trialStatus());

  /**
   * Demarre l'essai gratuit. Le nom n'est pas obligatoire : exiger une
   * saisie avant meme d'avoir vu l'application decouragerait le prospect.
   */
  function beginTrial() {
    const started = startTrial(name);
    if (!started) {
      setError('La période d’essai a déjà été utilisée sur cet appareil. Demandez votre code d’abonnement.');
      setTrial(trialStatus());
      return;
    }
    setTrial(trialStatus());
    onTrialStarted?.();
  }
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  function getAdminContacts(): AdminContact[] {
    try {
      const raw = localStorage.getItem('msp_admin_team');
      const team = raw ? JSON.parse(raw) : [];
      const principal = Array.isArray(team)
        ? team.find((member: any) => member?.id === 'owner' && member?.active !== false && member?.phone)
        : null;
      if (principal) {
        return [{ name: 'Équipe d’activation MSP', role: 'ACTIVATION WHATSAPP', phone: principal.phone }];
      }
    } catch {
      // ignore invalid local admin list
    }
    return [{ name: 'Équipe d’activation MSP', role: 'ACTIVATION WHATSAPP', phone: WHATSAPP_DISPLAY }];
  }

  async function handleActivate() {
    setError('');
    if (!name.trim()) {
      setError('Veuillez saisir votre nom complet (il est enregistré avec votre code d\'accès).');
      return;
    }
    if (!code.trim()) { setError('Veuillez saisir votre code d\'accès (6 chiffres).'); return; }

    setChecking(true);
    try {
      // 1) Nouveau système simple : 6 chiffres, validé 100 % hors-ligne (aucun serveur).
      const okSimple = isAccessCode(code);

      // 2) Compatibilité : anciens codes personnels (16 caractères hexa) liés au nom.
      const okLegacy = !okSimple ? await verifyAccessCode(name.trim(), code) : false;

      if (!okSimple && !okLegacy) {
        setError('Code incorrect. Vérifiez les 6 chiffres reçus, puis contactez l’équipe d’activation si besoin.');
        return;
      }

      // v36 : un code reste valable après chaque mise à jour. Il n'est refusé
      // que s'il a été RETIRÉ ou SUPPRIMÉ par le Super Administrateur.
      const finalCode = okSimple ? formatSimpleCode(code) : cleanCode(code);
      const status = codeStatus(finalCode);
      if (!status.valid) {
        setError(status.reason === 'supprime'
          ? "Ce code d’accès n’est plus valide. Contactez l’équipe d’activation pour en recevoir un nouveau."
          : "Ce code d’accès a été retiré. Contactez l’équipe d’activation pour obtenir de l’aide.");
        return;
      }

      saveActivation(name.trim(), finalCode);
      onActivated();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setChecking(false);
    }
  }

  /*
   * Le message reprend le forfait REELLEMENT choisi a l'ecran, au lieu de
   * lister toutes les formules : l'administrateur sait immediatement quel
   * code generer, et l'utilisateur n'a rien a reformuler.
   */
  function planRequestText(): string {
    const p = PLAN_CATALOG[chosenPlan];
    return `Formule souhaitée : ${p.label}\n`
      + p.includes.map((f) => `• ${f}`).join('\n');
  }

  function requestCodeFromAdmin(admin: { name: string; phone: string }) {
    const digits = admin.phone.replace(/\D/g, '');
    const msg = `Bonjour ${admin.name}, je souhaite obtenir mon code d'accès pour Master Soutien Pédagogique.\n\n${planRequestText()}\n\nNom complet : ${name || '...'}\nÉcole : ...\nCommune / Circonscription : ...\n\nMerci de m’indiquer la procédure d’activation.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  function requestCode() {
    const msg = `Bonjour, je souhaite obtenir mon code d'accès pour Master Soutien Pédagogique.\n\n${planRequestText()}\n\nNom complet : ${name || '...'}\nÉcole : ...\nCommune / Circonscription : ...\n\nMerci.`;
    openWhatsApp(msg);
  }

  function resetLocalApp() {
    if (!confirm("Réinitialiser les données locales de l'application sur cet appareil ?\n\nVotre code d'accès et ceux de l'équipe seront CONSERVÉS.")) return;
    // v36 : on ne vide plus tout le stockage — les codes d'accès sont préservés.
    clearAllExcept(true);
    indexedDB.deleteDatabase('NoteFacileBenin');
    indexedDB.deleteDatabase('MasterSoutienResources');
    window.location.reload();
  }

  const admins = getAdminContacts();
  // Détection de la formule pendant la saisie du code (v31)
  const codeValid = code.length === 6 && isAccessCode(code);
  const detectedPlan = codeValid ? planOfCode(code) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f3e8] text-slate-950">
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(135deg,#047857_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-200 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-200 blur-3xl" />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center px-5 py-10">
        <section className="w-full text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#006b4f] text-white shadow-xl">
            <BookOpen className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            <span className="text-[#006b4f]">Master</span>{' '}
            <span className="text-[#d4a017]">Soutien</span>{' '}
            <span className="text-[#b63333]">Pédagogique</span>
          </h1>
          <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-white/80 px-5 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#006b4f]" />
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">Accompagnement & Gestion de Classe - Bénin</span>
            <span className="h-2 w-2 rounded-full bg-[#d4a017]" />
          </div>
          <h2 className="mx-auto mt-10 max-w-3xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            La plateforme qui simplifie la <span className="text-[#006b4f]">gestion pédagogique</span>,
            les <span className="text-[#d4a017]">notes</span> et les <span className="text-[#b63333]">bulletins</span>
          </h2>
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-[#006b4f]/20 bg-white/90 p-5 shadow-sm">
            <p className="text-lg font-extrabold text-slate-800">Notes, présences, fiches APC, calendrier scolaire, bulletins et ressources dans un même espace sécurisé.</p>
          </div>
        </section>

        <section className="mt-10 w-full max-w-2xl rounded-3xl border-2 border-[#006b4f]/20 bg-white p-5 shadow-xl">
          {/* Tarification (v31) : deux formules annuelles */}
          <div className="mb-4 rounded-2xl border border-amber-200 bg-[#fff8e1] p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-[#d4a017]" />
              <div>
                <p className="font-black uppercase text-slate-900">Accès Master Soutien Pédagogique</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  Choisissez votre formule annuelle. Vos saisies et données restent conservées sur cet appareil.
                </p>
              </div>
            </div>

            {/*
              v54 — LES TROIS FORFAITS SONT SELECTIONNABLES.
              L'utilisateur touche la carte qui lui convient ; son choix est
              repris dans la demande WhatsApp envoyee a l'administrateur.
              Gros boutons, une colonne sur mobile : l'application est
              utilisee sur des telephones Android d'entree de gamme.
            */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-3" data-testid="forfaits-accueil">
              {PLAN_ORDER.map((id) => {
                const plan = PLAN_CATALOG[id];
                const style = PLAN_STYLES[id];
                const selected = chosenPlan === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`forfait-${id}`}
                    aria-pressed={selected}
                    onClick={() => setChosenPlan(id)}
                    className={`relative rounded-xl border-2 p-3 text-left transition ${style.accent} ${
                      selected ? `${style.ring} ring-2 shadow-lg` : 'opacity-90'
                    }`}
                  >
                    {selected && (
                      <span
                        data-testid={`forfait-choisi-${id}`}
                        className={`absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-black ${style.badge}`}
                      >
                        ✓ CHOISI
                      </span>
                    )}
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {style.short}
                    </span>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900">{plan.name}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${style.badge}`}>
                        {plan.price} F
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-600">par an</p>
                    <ul className="mt-2 space-y-1">
                      {plan.includes.map((f) => (
                        <li key={f} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700" data-testid="recap-forfait">
              Formule retenue : <strong className="text-slate-900">{PLAN_CATALOG[chosenPlan].label}</strong>.
              Demandez votre code ci-dessous — il vous sera remis pour cette formule.
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-black uppercase text-emerald-950">Contactez l’équipe d’activation MSP</p>
                <p className="mt-1 text-sm text-slate-700">Pour obtenir votre code d’activation à 6 chiffres, envoyez une demande WhatsApp à l’équipe MSP.</p>
              </div>
              <span className="rounded-lg bg-[#006b4f] px-3 py-1 text-xs font-black text-white" data-testid="bandeau-tarifs">
                {PLAN_ORDER.map((id) => PLAN_CATALOG[id].price).join(' / ')} FCFA / an
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {admins.map((admin, index) => (
                <button
                  key={`${admin.phone}-${index}`}
                  onClick={() => requestCodeFromAdmin(admin)}
                  className="rounded-xl bg-[#006b4f] p-3 text-left text-white shadow inline-flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="block text-[11px] font-bold uppercase text-emerald-100">{admin.role}</span>
                    <span className="font-black">{admin.name}</span>
                  </span>
                  <MessageCircle className="h-6 w-6 rounded-full bg-white/20 p-1" />
                </button>
              ))}
            </div>
          </div>

          {/*
            v55 — ESSAI GRATUIT DE 6 HEURES.
            Place AVANT le champ du code : un prospect qui n'a pas encore
            de code doit pouvoir entrer immediatement dans l'application.
          */}
          {!trial.expired && (
            <div className="mb-4 rounded-2xl border-2 border-dashed border-[#006b4f] bg-white p-4" data-testid="bloc-essai">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#006b4f]" />
                <div className="min-w-0">
                  <p className="font-black uppercase text-slate-900">
                    Essayer gratuitement pendant {TRIAL_HOURS} heures
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Sans code et sans engagement. Découvrez les notes, les bulletins,
                    les présences et les ressources avant de vous abonner.
                  </p>
                </div>
              </div>
              {trial.active ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800" data-testid="essai-en-cours">
                  ✓ Essai en cours — il reste {trial.hours} h {String(trial.minutes).padStart(2, '0')}.
                </p>
              ) : (
                <button
                  type="button"
                  data-testid="btn-demarrer-essai"
                  onClick={beginTrial}
                  className="mt-3 w-full rounded-xl bg-[#006b4f] py-4 text-base font-black text-white shadow"
                >
                  🚀 Commencer l’essai gratuit de {TRIAL_HOURS} h
                </button>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                L’essai donne accès aux fonctions de la formule Complet. Vos saisies sont
                conservées : en vous abonnant ensuite, vous les retrouverez.
              </p>
            </div>
          )}

          {trial.expired && (
            <div className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4" data-testid="essai-termine">
              <p className="font-black uppercase text-red-800">Votre essai gratuit est terminé</p>
              <p className="mt-1 text-sm text-red-700">
                Les {TRIAL_HOURS} heures d’essai sont écoulées. Vos données restent
                enregistrées sur cet appareil : choisissez une formule ci-dessus et
                saisissez votre code pour les retrouver intactes.
              </p>
            </div>
          )}

          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="mb-3 font-black uppercase text-slate-800">Entrez votre code d'abonnement</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code d'accès (6 chiffres) *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code ? formatSimpleCode(code) : ''}
                    onChange={e => setCode(cleanSimpleCode(e.target.value))}
                    placeholder="Ex : 783 423"
                    maxLength={7}
                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-center font-mono text-lg tracking-widest"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Votre code compte 6 chiffres. Il est valable sur tous les appareils, sans connexion.</p>
                {/* Le libelle vient du catalogue : « pro » s'affiche donc aussi. */}
                {detectedPlan && (
                  <p
                    data-testid="formule-detectee"
                    className={`mt-1 rounded-lg px-2 py-1 text-xs font-bold ${
                      detectedPlan === 'complet' || detectedPlan === 'ecole-primaire' || detectedPlan === 'ecole-complete'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detectedPlan === 'pro' ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'}`}
                  >
                    ✓ Formule détectée : {PLAN_CATALOG[detectedPlan].label.toUpperCase()}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet (obligatoire) *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: KOFFI Jean" className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4" />
                </div>
                <p className="mt-1 text-xs text-slate-500">Votre <strong>nom complet</strong> est joint à votre code : il identifie votre abonnement sur cet appareil.</p>
              </div>
              {/* Chrono d'expiration : le code est valable 1 AN */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
                ⏳ <strong>Chrono d'expiration :</strong> ce code d'accès est valable
                <strong> 1 an ({CODE_VALIDITY_DAYS} jours)</strong> à partir de l'activation.
                Le compte à rebours démarre dès que vous activez ; à l'échéance,
                contactez l’équipe d’activation pour le renouveler.
              </div>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</p>}
              <button onClick={handleActivate} disabled={checking} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006b4f] py-4 font-black text-white disabled:opacity-50">
                <Check className="h-5 w-5" /> {checking ? 'Vérification...' : 'Activer mon accès'}
              </button>
              <button onClick={requestCode} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4a017] py-3 font-bold text-slate-950">
                <MessageCircle className="h-5 w-5" /> Demander un code via WhatsApp ({WHATSAPP_DISPLAY})
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Besoin de renouveler, changer de formule ou renseigner votre école ?{' '}
                <Link to="/activation" className="font-bold text-emerald-800 underline underline-offset-2">Ouvrir le parcours guidé</Link>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button onClick={resetLocalApp} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-500 inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Réinitialiser mes données sur cet appareil
            </button>
            <button onClick={onOpenTeam} className="px-2 py-2 text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">
              Accès équipe
            </button>
            <button onClick={onOpenPrincipal} className="px-2 py-2 text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">
              Accès principal
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
