import { useState, useEffect } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, Cloud, CloudOff, Lock, ShieldCheck, UploadCloud, DownloadCloud,
  Copy, Eye, EyeOff, RefreshCw, KeyRound, AlertTriangle, Check,
} from 'lucide-react';
import {
  getCloudSettings, saveCloudSettings, getStoredPassphrase, setStoredPassphrase,
  getLastSync, getLastSyncInfo, pushToCloud, pullFromCloud, generateSyncCode,
  friendlyCloudError, isValidSyncCode, testCloudConnection, formatRelativeTime, CloudSettings,
} from '../utils/cloudSync';
import { isCloudConfigured } from '../utils/cloudConfig';
import { copyText } from '../utils/clipboard';

export default function CloudScreen() {
  const goBack = useSmartBack();
  const configured = isCloudConfigured();

  const [settings, setSettings] = useState<CloudSettings>(getCloudSettings());
  const [passphrase, setPassphrase] = useState(getStoredPassphrase());
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState<'push' | 'pull' | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [lastSync, setLastSyncState] = useState(getLastSync());
  const [lastSyncInfo, setLastSyncInfoState] = useState(getLastSyncInfo());
  const [connection, setConnection] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!settings.syncCode) {
      setSettings((s) => ({ ...s, syncCode: generateSyncCode() }));
    }
  }, []);

  function persist(next: CloudSettings) {
    setSettings(next);
    saveCloudSettings(next);
  }

  async function copyCode() {
    const okCopy = await copyText(settings.syncCode);
    if (okCopy) {
      setMessage({ type: 'info', text: 'Code copié !' });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: 'err', text: 'Impossible de copier automatiquement : notez le code manuellement.' });
    }
  }

  function validate(): string | null {
    if (!settings.syncCode.trim()) return 'Veuillez renseigner un code de synchronisation.';
    if (!isValidSyncCode(settings.syncCode)) return 'Format du code attendu : MSP-XXXX-XXXX (ex. MSP-A3B2-C9D7). Utilisez le bouton de régénération si besoin.';
    if (passphrase.length < 4) return 'Le mot de passe secret doit contenir au moins 4 caractères.';
    return null;
  }

  async function handleTestConnection() {
    setTesting(true);
    setConnection(null);
    const result = await testCloudConnection();
    setConnection({ ok: result.ok, message: result.message });
    setTesting(false);
  }

  async function handlePush() {
    const err = validate();
    if (err) { setMessage({ type: 'err', text: err }); return; }
    setBusy('push');
    setMessage(null);
    try {
      setStoredPassphrase(passphrase, settings.rememberPassphrase);
      await pushToCloud(settings.syncCode.trim(), passphrase);
      persist({ ...settings, enabled: true });
      setLastSyncState(getLastSync());
      setLastSyncInfoState(getLastSyncInfo());
      setMessage({ type: 'ok', text: 'Sauvegarde envoyée dans le cloud (chiffrée) avec succès !' });
    } catch (e: any) {
      setMessage({ type: 'err', text: friendlyCloudError(e) });
    } finally {
      setBusy(null);
    }
  }

  async function handlePull() {
    const err = validate();
    if (err) { setMessage({ type: 'err', text: err }); return; }
    if (!confirm('Récupérer les données du cloud remplacera/complétera les données de cet appareil. Continuer ?')) {
      return;
    }
    setBusy('pull');
    setMessage(null);
    try {
      setStoredPassphrase(passphrase, settings.rememberPassphrase);
      const found = await pullFromCloud(settings.syncCode.trim(), passphrase);
      if (!found) {
        setMessage({ type: 'err', text: 'Aucune sauvegarde trouvée pour ce code de synchronisation.' });
      } else {
        persist({ ...settings, enabled: true });
        setLastSyncState(getLastSync());
        setLastSyncInfoState(getLastSyncInfo());
        setMessage({ type: 'ok', text: 'Données récupérées et déchiffrées avec succès ! Rechargez l\'accueil.' });
      }
    } catch (e: any) {
      setMessage({ type: 'err', text: friendlyCloudError(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Synchronisation Cloud</h1>
            <p className="text-emerald-100 text-sm">Sauvegarde chiffrée sur internet</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {/* Bannière de confidentialité */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8" />
            <h2 className="font-bold text-lg">Vos données sont protégées</h2>
          </div>
          <p className="text-white/90 text-sm">
            Chiffrement de bout en bout : vos données sont <strong>verrouillées sur votre téléphone</strong>{' '}
            avec votre mot de passe secret <strong>avant</strong> d'être envoyées.
            Le serveur ne stocke qu'un contenu illisible. <strong>Personne d'autre que vous</strong>{' '}
            ne peut lire vos élèves et leurs notes.
          </p>
        </div>

        {/* Points de réassurance */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Lock, label: 'Chiffré AES-256' },
            { icon: KeyRound, label: 'Vous seul avez la clé' },
            { icon: CloudOff, label: 'Marche hors-ligne' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-xl shadow p-3 text-center">
                <Icon className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">{item.label}</p>
              </div>
            );
          })}
        </div>

        {!configured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-800 text-sm font-medium">Cloud pas encore activé</p>
                <p className="text-amber-700 text-xs mt-1">
                  La synchronisation cloud doit d'abord être configurée par l'administrateur de l'application
                  (fichier <code>cloudConfig.ts</code>). En attendant, utilisez la sauvegarde locale (fichier .json)
                  dans les Réglages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Code de synchronisation */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code de synchronisation
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.syncCode}
              onChange={(e) => persist({ ...settings, syncCode: e.target.value.toUpperCase() })}
              className="flex-1 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-emerald-500"
              placeholder="MSP-XXXX-XXXX"
            />
            <button onClick={copyCode} className="bg-gray-100 px-3 rounded-lg" title="Copier">
              <Copy className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => persist({ ...settings, syncCode: generateSyncCode() })}
              className="bg-gray-100 px-3 rounded-lg"
              title="Générer un nouveau code"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Notez ce code. Il identifie votre sauvegarde. Utilisez le même code sur vos autres appareils.
          </p>
        </div>

        {/* Mot de passe secret */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe secret 🔑
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full p-3 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="Votre mot de passe secret"
            />
            <button
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={settings.rememberPassphrase}
              onChange={(e) => {
                persist({ ...settings, rememberPassphrase: e.target.checked });
                setStoredPassphrase(passphrase, e.target.checked);
              }}
              className="w-4 h-4"
            />
            Se souvenir du mot de passe sur cet appareil
          </label>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-3">
            <p className="text-red-700 text-xs">
              ⚠️ <strong>Très important :</strong> si vous oubliez ce mot de passe, vos données chiffrées
              seront <strong>définitivement irrécupérables</strong>. Notez-le en lieu sûr. Nous ne pouvons
              pas le réinitialiser (c'est ce qui garantit votre confidentialité).
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${
            message.type === 'ok' ? 'bg-emerald-50 border border-emerald-200'
              : message.type === 'err' ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            {message.type === 'ok' ? <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              : message.type === 'err' ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              : <Cloud className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />}
            <p className={`text-sm ${
              message.type === 'ok' ? 'text-emerald-800'
                : message.type === 'err' ? 'text-red-800' : 'text-blue-800'
            }`}>{message.text}</p>
          </div>
        )}

        {/* Test de connexion */}
        <button
          onClick={handleTestConnection}
          disabled={testing || !configured}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
        >
          <RefreshCw className={`w-5 h-5 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Test en cours...' : 'Tester la connexion au cloud'}
        </button>
        {connection && (
          <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${connection.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {connection.ok ? <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />}
            <p className={`text-sm ${connection.ok ? 'text-emerald-800' : 'text-red-800'}`}>
              <strong>{connection.ok ? 'Connexion OK' : 'Connexion impossible'} :</strong> {connection.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handlePush}
            disabled={busy !== null || !configured}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UploadCloud className="w-5 h-5" />
            {busy === 'push' ? 'Envoi chiffré...' : 'Sauvegarder dans le cloud'}
          </button>
          <button
            onClick={handlePull}
            disabled={busy !== null || !configured}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <DownloadCloud className="w-5 h-5" />
            {busy === 'pull' ? 'Récupération...' : 'Récupérer depuis le cloud'}
          </button>
        </div>

        {(lastSync || lastSyncInfo) && (
          <p className="text-center text-gray-400 text-xs mt-4">
            Dernière synchronisation : <strong className="text-gray-500">{formatRelativeTime(lastSync)}</strong> ({new Date(lastSync).toLocaleString('fr-FR')})
            {lastSyncInfo && (
              <> · {lastSyncInfo.classes} classe{lastSyncInfo.classes > 1 ? 's' : ''} · {lastSyncInfo.students} élève{lastSyncInfo.students > 1 ? 's' : ''} · {lastSyncInfo.sizeKo} Ko</>
            )}
          </p>
        )}

        {/* Comment ça marche */}
        <div className="bg-white rounded-xl shadow p-4 mt-6">
          <h3 className="font-bold text-gray-800 mb-2">Comment ça marche ?</h3>
          <ol className="text-gray-600 text-sm space-y-2 list-decimal list-inside">
            <li>Choisissez un <strong>code de synchronisation</strong> et un <strong>mot de passe secret</strong>.</li>
            <li>Appuyez sur <strong>« Sauvegarder dans le cloud »</strong> : vos données sont chiffrées puis envoyées.</li>
            <li>Sur un autre téléphone, entrez le <strong>même code + même mot de passe</strong>, puis <strong>« Récupérer »</strong>.</li>
            <li>Vos données réapparaissent, déchiffrées uniquement sur votre appareil.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
