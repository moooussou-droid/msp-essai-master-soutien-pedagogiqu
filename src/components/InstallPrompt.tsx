/**
 * INSTALLATION DE L'APPLICATION (v34) — Android et **iPhone / iPad**.
 *
 * - Android / Chrome : bouton « Installer » natif (événement beforeinstallprompt).
 * - iPhone / iPad (Safari) : iOS n'autorise pas l'installation automatique ;
 *   on affiche donc la marche à suivre officielle (Partager → Sur l'écran d'accueil).
 * La bannière ne s'affiche pas si l'application est déjà installée, et peut
 * être masquée définitivement par l'utilisateur.
 */
import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'msp_install_dismissed';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  const iOSClassic = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se présente comme un Mac tactile
  const iPadOS = /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
  return iOSClassic || iPadOS;
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true || nav.standalone === true;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === 'true'; } catch { /* ignore */ }
    if (dismissed || isStandalone()) return;

    if (isIOS()) {
      setVisible(true); // iOS : pas d'événement natif, on guide l'utilisateur
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
  }

  async function install() {
    if (isIOS()) { setShowIOSHelp(true); return; }
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl bg-emerald-800 text-white shadow-2xl p-3 flex items-center gap-3 print:hidden">
        <div className="bg-white/15 p-2 rounded-xl shrink-0">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Installer Master Soutien Pédagogique</p>
          <p className="text-emerald-100 text-xs">
            {isIOS() ? 'Sur iPhone / iPad : ajoutez-la à votre écran d’accueil.' : 'Accès rapide, hors-ligne, comme une vraie application.'}
          </p>
        </div>
        <button onClick={install} className="bg-amber-400 text-amber-950 font-bold text-sm px-3 py-2 rounded-xl shrink-0">
          {isIOS() ? 'Comment ?' : 'Installer'}
        </button>
        <button onClick={dismiss} className="p-1 text-emerald-200 shrink-0" aria-label="Masquer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {showIOSHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 print:hidden" onClick={() => setShowIOSHelp(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-6 h-6 text-emerald-600" />
              <h2 className="font-bold text-lg text-gray-900">Installer sur iPhone / iPad</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Ouvrez cette page dans <strong>Safari</strong> (obligatoire sur iOS), puis :
            </p>
            <ol className="space-y-3 text-sm text-gray-800">
              <li className="flex gap-3">
                <span className="bg-emerald-100 text-emerald-700 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>Touchez le bouton <strong>Partager</strong> <Share className="w-4 h-4 inline text-blue-600" /> en bas de l’écran.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-emerald-100 text-emerald-700 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>Faites défiler puis choisissez <strong>« Sur l’écran d’accueil »</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-emerald-100 text-emerald-700 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>Touchez <strong>« Ajouter »</strong> en haut à droite.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-emerald-100 text-emerald-700 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">4</span>
                <span>L’icône <strong>Master Soutien</strong> apparaît sur l’écran d’accueil : elle s’ouvre en plein écran et fonctionne <strong>hors connexion</strong>.</span>
              </li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              Astuce : depuis Chrome ou Facebook sur iPhone, touchez d’abord « Ouvrir dans Safari ».
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => { setShowIOSHelp(false); dismiss(); }} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Ne plus afficher</button>
              <button onClick={() => setShowIOSHelp(false)} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold">J’ai compris</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
