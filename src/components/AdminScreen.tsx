import { useState, useEffect } from 'react';
import { ChevronLeft, KeyRound, Copy, Check, Lock, MessageCircle, ShieldAlert, Cloud, CloudOff, Ban, RotateCcw, RefreshCw } from 'lucide-react';
import { generateAccessCode } from '../utils/license';
import { ADMIN_PASSWORD } from '../utils/adminConfig';
import { openWhatsApp } from '../utils/contact';
import { copyText } from '../utils/clipboard';
import {
  isServerLicensingEnabled, registerLicense, listLicenses,
  setLicenseStatus, LicenseRow,
} from '../utils/licenseServer';

interface Props {
  onBack: () => void;
}

const LOG_KEY = 'msp_admin_codes_log';

interface LogEntry {
  name: string;
  code: string;
  date: number;
}

function loadLog(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

export default function AdminScreen({ onBack }: Props) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');

  const [userName, setUserName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regStatus, setRegStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [log, setLog] = useState<LogEntry[]>(loadLog());

  const serverEnabled = isServerLicensingEnabled();

  // Gestion des licences (liste + révocation)
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (authed && serverEnabled) refreshList();
  }, [authed]);

  async function refreshList() {
    if (!serverEnabled) return;
    setLoadingList(true);
    try {
      setLicenses(await listLicenses());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError('');
    } else {
      setPwError('Mot de passe administrateur incorrect.');
    }
  }

  async function handleGenerate() {
    if (!userName.trim()) return;
    const code = await generateAccessCode(userName);
    setGeneratedCode(code);
    setCopied(false);
    setRegStatus('idle');

    // Journal local : fonctionne même sans serveur (traçabilité des codes distribués)
    const entry: LogEntry = { name: userName.trim(), code, date: Date.now() };
    const nextLog = [entry, ...log].slice(0, 100);
    setLog(nextLog);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(nextLog)); } catch { /* quota */ }

    // Enregistrement serveur (sécurité maximale) si disponible
    if (serverEnabled) {
      setRegistering(true);
      try {
        await registerLicense(userName, code);
        setRegStatus('ok');
        refreshList();
      } catch (e) {
        console.error(e);
        setRegStatus('error');
      } finally {
        setRegistering(false);
      }
    }
  }

  async function toggleRevoke(row: LicenseRow) {
    const next = row.status === 'revoked' ? 'active' : 'revoked';
    const label = next === 'revoked' ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${label} le code de "${row.name}" ?`)) return;
    try {
      await setLicenseStatus(row.code, next);
      refreshList();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour du statut.');
    }
  }

  async function copyCode() {
    const okCopy = await copyText(generatedCode);
    if (okCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Impossible de copier automatiquement : sélectionnez le code manuellement.');
    }
  }

  function sendViaWhatsApp() {
    const msg = `Bonjour ${userName},\nVoici votre code d'accès personnel pour Master Soutien Pédagogique :\n\nNom : ${userName}\nCode : ${generatedCode}\n\nSaisissez votre nom (exactement comme ci-dessus) et ce code dans l'application pour débloquer votre espace. Merci !`;
    openWhatsApp(msg);
  }

  /* Écran de connexion admin */
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
          <div className="text-center mb-4">
            <div className="bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Espace administrateur</h1>
            <p className="text-gray-500 text-sm">Accès réservé au propriétaire de l'application</p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe administrateur</label>
          <div className="relative mb-2">
            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800"
            />
          </div>
          {pwError && <p className="text-red-600 text-sm mb-2">{pwError}</p>}

          <button
            onClick={handleLogin}
            className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold"
          >
            Se connecter
          </button>
          <button
            onClick={onBack}
            className="w-full text-gray-500 text-sm mt-3"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  /* Générateur de codes */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Administration</h1>
            <p className="text-gray-300 text-sm">Générateur de codes d'accès</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-md mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-amber-800 text-sm">
            🔐 Générez un code personnel pour chaque utilisateur, après réception de son paiement.
            Le code est lié à son <strong>nom exact</strong>.
          </p>
        </div>

        {/* Statut de la validation serveur */}
        <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${
          serverEnabled ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-100 border border-gray-200'
        }`}>
          {serverEnabled ? <Cloud className="w-5 h-5 text-emerald-600 shrink-0" /> : <CloudOff className="w-5 h-5 text-gray-500 shrink-0" />}
          <p className={`text-sm ${serverEnabled ? 'text-emerald-800' : 'text-gray-600'}`}>
            {serverEnabled
              ? 'Validation serveur ACTIVE : sécurité maximale + révocation à distance possible.'
              : 'Validation serveur inactive (mode hors-ligne). Configurez le cloud pour la sécurité maximale.'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet de l'utilisateur
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => { setUserName(e.target.value); setGeneratedCode(''); }}
            placeholder="Ex: KOFFI Jean"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-3"
          />
          <button
            onClick={handleGenerate}
            disabled={!userName.trim() || registering}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-5 h-5" />
            {registering ? 'Enregistrement serveur...' : 'Générer le code d\'accès'}
          </button>

          {generatedCode && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Code personnel de <strong>{userName}</strong> :</p>
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold font-mono tracking-wider text-emerald-800 break-all">
                  {generatedCode}
                </p>
              </div>

              {serverEnabled && regStatus === 'ok' && (
                <p className="text-emerald-700 text-xs mt-2 text-center flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> Code enregistré sur le serveur
                </p>
              )}
              {serverEnabled && regStatus === 'error' && (
                <p className="text-red-600 text-xs mt-2 text-center">
                  ⚠️ Code généré mais NON enregistré sur le serveur (erreur réseau). Régénérez quand vous avez du réseau.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={copyCode}
                  className="bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button
                  onClick={sendViaWhatsApp}
                  className="bg-green-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  Envoyer
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2 text-center">
                ⚠️ L'utilisateur doit saisir son nom EXACTEMENT comme ci-dessus.
              </p>
            </div>
          )}
        </div>

        {/* Journal local des codes générés (fonctionne même sans serveur) */}
        {log.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Codes générés sur cet appareil ({log.length})</h3>
              <button
                onClick={() => { if (confirm('Effacer le journal local des codes ?')) { setLog([]); localStorage.removeItem(LOG_KEY); } }}
                className="text-red-500 text-sm"
              >
                Tout effacer
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={`${entry.date}-${i}`} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-800 text-sm truncate">{entry.name}</p>
                    <span className="text-[11px] text-gray-400 shrink-0">{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-gray-600 break-all flex-1">{entry.code}</p>
                    <button onClick={() => copyText(entry.code)} className="text-gray-500 p-1.5" title="Copier le code">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const msg = `Bonjour ${entry.name},\nVoici votre code d'accès personnel pour Master Soutien Pédagogique :\n\nNom : ${entry.name}\nCode : ${entry.code}\n\nSaisissez votre nom et ce code dans l'application pour débloquer votre espace. Merci !`;
                        openWhatsApp(msg);
                      }}
                      className="text-green-600 p-1.5"
                      title="Envoyer par WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              📱 Journal local : conserve la trace des codes générés, même sans internet. La révocation à distance n'est possible que si la validation serveur est active.
            </p>
          </div>
        )}

        {/* Gestion des licences (serveur uniquement) */}
        {serverEnabled && (
          <div className="bg-white rounded-xl shadow p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Codes enregistrés ({licenses.length})</h3>
              <button
                onClick={refreshList}
                className="text-emerald-600 text-sm flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            {licenses.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                {loadingList ? 'Chargement...' : 'Aucun code enregistré pour le moment.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {licenses.map((row) => (
                  <div key={row.code} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate capitalize">{row.name}</p>
                      <p className="font-mono text-xs text-gray-500 break-all">{row.code}</p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                        row.status === 'revoked'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.status === 'revoked' ? 'Désactivé' : 'Actif'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleRevoke(row)}
                      className={`shrink-0 p-2 rounded-lg ${
                        row.status === 'revoked'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                      title={row.status === 'revoked' ? 'Réactiver' : 'Désactiver'}
                    >
                      {row.status === 'revoked' ? <RotateCcw className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-4 mt-4">
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Rappel de fonctionnement</h3>
          <ol className="text-gray-600 text-sm space-y-1 list-decimal list-inside">
            <li>L'utilisateur demande son code (WhatsApp) et paie.</li>
            <li>Vous saisissez son nom ici et générez le code.</li>
            <li>Vous lui envoyez le code.</li>
            <li>Il saisit son nom + code pour débloquer son espace.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
