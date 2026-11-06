import { ChevronLeft, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { PLANS, PRO_MODULES, SubscriptionPlan } from '../utils/subscription';
import { getActivationChrono } from '../utils/userProfile';
import { openWhatsApp } from '../utils/contact';

/**
 * Écran affiché quand l'utilisateur ouvre une fonction non incluse dans sa
 * formule.
 *
 * Deux cas :
 *  - `targetPlan="complet"` (défaut) : abonné ESSENTIEL (999 F) qui tente
 *    une fonction pédagogique ;
 *  - `targetPlan="pro"` (v53) : abonné ESSENTIEL ou COMPLET qui ouvre l'un
 *    des 4 modules de gestion réservés au plan PRO (2500 F).
 */
export default function UpgradeScreen({
  blockedPath,
  targetPlan = 'complet',
}: {
  blockedPath: string;
  targetPlan?: Extract<SubscriptionPlan, 'complet' | 'pro'>;
}) {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const chrono = getActivationChrono();
  const target = PLANS[targetPlan];

  /** Nom lisible du module demandé, plutôt qu'une URL technique. */
  const moduleLabel = PRO_MODULES.find(
    (m) => blockedPath === m.path || blockedPath.startsWith(`${m.path}/`),
  )?.label;

  // v64 : Libellé lu dans le catalogue — les formules École (6000/10000 F)
  // ne doivent pas s'afficher « Complet ».
  const currentInfo = PLANS[chrono.plan];
  const currentLabel = `${currentInfo.name} (${currentInfo.price} FCFA/an)`;

  function askUpgrade() {
    openWhatsApp(
      `Bonjour, je souhaite passer au plan ${target.id.toUpperCase()} de Master Soutien Pédagogique.\n\n`
      + `Formule actuelle : ${currentLabel}\n`
      + `Nom : ${chrono.name || '...'}\n`
      + `Fonction souhaitée : ${moduleLabel || blockedPath}\n\n`
      + `Merci de me communiquer la procédure (${target.price} FCFA/an).`,
    );
  }

  const isPro = targetPlan === 'pro';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/10 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Fonction non incluse</h1>
            <p className="text-slate-300 text-sm">Votre abonnement — Master Soutien Pédagogique</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow p-6 text-center" data-testid="ecran-upgrade">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
            isPro ? 'bg-indigo-100' : 'bg-amber-100'}`}
          >
            <Crown className={`h-8 w-8 ${isPro ? 'text-indigo-600' : 'text-amber-600'}`} />
          </div>

          {moduleLabel && (
            <p className="text-sm font-semibold text-gray-500" data-testid="module-bloque">
              « {moduleLabel} »
            </p>
          )}

          <h2 className="text-xl font-black text-gray-900 mt-1">
            Cette fonction fait partie de la formule{' '}
            <span className={isPro ? 'text-indigo-700' : 'text-emerald-700'}>
              {target.id.toUpperCase()}
            </span>
          </h2>

          <p className="text-gray-500 text-sm mt-2">
            Votre abonnement actuel : <strong>{currentLabel}</strong>
          </p>

          <div className={`mt-4 rounded-xl border-2 p-4 text-left ${
            isPro ? 'border-indigo-200 bg-indigo-50' : 'border-emerald-200 bg-emerald-50'}`}
          >
            <p className={`font-black ${isPro ? 'text-indigo-800' : 'text-emerald-800'}`}>
              ⭐ Formule {target.id.toUpperCase()} — {target.price} FCFA / an
            </p>
            <ul className={`mt-2 space-y-1 text-xs ${isPro ? 'text-indigo-800' : 'text-emerald-700'}`}>
              {target.includes.map((line) => (
                <li key={line}>✔️ {line}</li>
              ))}
            </ul>
          </div>

          {isPro && (
            <p className="mt-3 text-[11px] text-gray-500">
              Les fonctions dont vous disposiez jusqu’ici restent accessibles :
              cette formule <strong>ajoute</strong> les modules de gestion, elle ne retire rien.
            </p>
          )}

          <button
            onClick={askUpgrade}
            data-testid="btn-demander-upgrade"
            className={`mt-4 w-full text-white py-3.5 rounded-xl font-bold ${
              isPro ? 'bg-indigo-600' : 'bg-emerald-600'}`}
          >
            📲 Demander le passage à {target.id.toUpperCase()} ({target.price} FCFA/an) — WhatsApp
          </button>
          <button
            onClick={() => navigate('/activation')}
            className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 py-3 font-bold text-emerald-900"
          >
            Voir toutes les formules / renouveler
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-2 w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
          >
            Retour à l'accueil
          </button>
        </div>
      </main>
    </div>
  );
}
