import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Bot, CheckCircle2, KeyRound, LogOut, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import type { AISettings } from '../utils/aiLessonGenerator';
import {
  closeAIGatewaySession,
  getAIGatewaySession,
  loadAIProviderAvailability,
  openAIGatewaySession,
  type AIGatewaySession,
  type AIProviderAvailability,
  type OnlineAIProvider,
} from '../utils/aiGateway';
import {
  getLocalLLMStatus,
  loadLocalLLM,
  LOCAL_LLM_DOWNLOAD_NOTE,
  LOCAL_LLM_MODEL_LABEL,
  subscribeLocalLLMStatus,
  unloadLocalLLM,
  type LocalLLMStatus,
} from '../utils/localLLM';

const LABELS: Record<string, string> = {
  local: 'Moteur pédagogique local à canevas',
  local_llm: 'LLM local sur l’appareil (Qwen3 0.6B)',
  openai: 'OpenAI / ChatGPT',
  anthropic: 'Anthropic / Claude',
  mistral: 'Mistral AI',
  perplexity: 'Perplexity',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  copilot: 'Azure OpenAI',
};

interface Props {
  settings: AISettings;
  onSettingsChange: (patch: Partial<AISettings>) => void;
  onProvidersChange?: (providers: AIProviderAvailability[]) => void;
  onSessionChange?: (session: AIGatewaySession | null) => void;
  title?: string;
  /** Cache certains fournisseurs dans les écrans de génération spécialisés, sans les retirer du chat général. */
  excludedProviders?: readonly OnlineAIProvider[];
}

export default function AIOnlineAccessPanel({ settings, onSettingsChange, onProvidersChange, onSessionChange, title = 'Moteur IA — local ou en ligne', excludedProviders = [] }: Props) {
  const [providers, setProviders] = useState<AIProviderAvailability[]>([]);
  const [localStatus, setLocalStatus] = useState<LocalLLMStatus>(getLocalLLMStatus());
  const [localError, setLocalError] = useState('');
  const [session, setSession] = useState<AIGatewaySession | null>(null);
  const [serverState, setServerState] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [serverMessage, setServerMessage] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visibleProviders = providers.filter(provider => !excludedProviders.includes(provider.id));

  async function refresh() {
    setServerState('checking');
    setServerMessage('');
    try {
      const available = await loadAIProviderAvailability();
      setProviders(available);
      onProvidersChange?.(available.filter(provider => !excludedProviders.includes(provider.id)));
      setServerState('ready');
      try {
        const active = await getAIGatewaySession();
        setSession(active);
        onSessionChange?.(active);
      } catch (sessionError) {
        setSession(null);
        onSessionChange?.(null);
        setServerMessage(sessionError instanceof Error ? sessionError.message : 'Configuration de la session IA incomplète.');
      }
    } catch (loadError) {
      setProviders([]);
      onProvidersChange?.([]);
      setSession(null);
      onSessionChange?.(null);
      setServerState('unavailable');
      setServerMessage(loadError instanceof Error ? loadError.message : 'Passerelle IA indisponible.');
    }
  }

  const localSelected = settings.provider === 'local' || settings.provider === 'local_llm';

  useEffect(() => { if (!localSelected) void refresh(); }, [localSelected]);
  useEffect(() => subscribeLocalLLMStatus(setLocalStatus), []);

  const selectedProvider = useMemo(
    () => visibleProviders.find((provider) => provider.id === settings.provider),
    [visibleProviders, settings.provider],
  );
  const savedModel = settings.models?.[settings.provider as keyof NonNullable<AISettings['models']>] || '';
  const selectedModel = selectedProvider?.models.includes(savedModel) ? savedModel : selectedProvider?.models[0] || '';

  useEffect(() => {
    if (!selectedProvider?.configured || !selectedProvider.models.length || !savedModel || selectedProvider.models.includes(savedModel)) return;
    onSettingsChange({ models: { ...(settings.models || {}), [settings.provider]: selectedProvider.models[0] } });
  }, [selectedProvider, savedModel, settings.models, settings.provider, onSettingsChange]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) { setError('Saisissez votre code IA.'); return; }
    setBusy(true);
    setError('');
    try {
      const next = await openAIGatewaySession(code.trim());
      setSession(next);
      onSessionChange?.(next);
      setCode('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Code IA refusé.');
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await closeAIGatewaySession();
      setSession(null);
      onSessionChange?.(null);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Fermeture de session impossible.');
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Bot className="h-5 w-5 text-emerald-700" />{title}</h2>
        {!localSelected && <button type="button" onClick={() => void refresh()} disabled={serverState === 'checking'} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-50" aria-label="Actualiser la passerelle IA">
          <RefreshCw className={`h-4 w-4 ${serverState === 'checking' ? 'animate-spin' : ''}`} />
        </button>}
      </div>

      <label className="block text-sm font-semibold text-gray-700" htmlFor="msp-ai-provider">Modèle à utiliser</label>
      <select
        id="msp-ai-provider"
        value={settings.provider}
        onChange={(event) => onSettingsChange({ provider: event.target.value as AISettings['provider'] })}
        className="w-full rounded-lg border border-gray-300 p-3 text-sm"
      >
        <option value="local_llm">{LABELS.local_llm} — privé, utilisable hors ligne après téléchargement</option>
        <option value="local">{LABELS.local} — hors ligne, sans LLM</option>
        {visibleProviders.length > 0 ? visibleProviders.map((provider) => (
          <option key={provider.id} value={provider.id}>{provider.label}{provider.configured ? '' : ' — non configuré'}</option>
        )) : <>
          {!excludedProviders.includes('openai') && <option value="openai">{LABELS.openai}</option>}
          {!excludedProviders.includes('anthropic') && <option value="anthropic">{LABELS.anthropic}</option>}
          {!excludedProviders.includes('mistral') && <option value="mistral">{LABELS.mistral}</option>}
          {!excludedProviders.includes('perplexity') && <option value="perplexity">{LABELS.perplexity}</option>}
          {!excludedProviders.includes('gemini') && <option value="gemini">{LABELS.gemini}</option>}
          {!excludedProviders.includes('deepseek') && <option value="deepseek">{LABELS.deepseek}</option>}
          {!excludedProviders.includes('copilot') && <option value="copilot">{LABELS.copilot}</option>}
        </>}
      </select>

      {settings.provider === 'local_llm' ? (
        <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
          <p className="font-bold">{LOCAL_LLM_MODEL_LABEL} · exécution sur l’appareil</p>
          <p>Après le téléchargement, les prompts restent sur ce téléphone ou cet ordinateur : ils ne sont pas envoyés à la passerelle ni à un fournisseur cloud. Le modèle est conservé dans le cache du navigateur quand celui-ci le permet.</p>
          <p className="text-xs">{LOCAL_LLM_DOWNLOAD_NOTE} WebGPU est utilisé s’il fonctionne; sans adaptateur, le mode WASM/CPU est essayé (nettement plus lent). Si l’initialisation GPU échoue après le début du téléchargement, le second modèle CPU n’est pas téléchargé automatiquement : vous pourrez le lancer explicitement. Un appareil ancien peut manquer de mémoire ou d’espace.</p>
          {localStatus.state !== 'idle' && (
            <div role="status" aria-live="polite" className="rounded-lg border border-violet-200 bg-white/80 p-3">
              <p className="font-semibold">{localStatus.detail}</p>
              {localStatus.state === 'loading' && <progress className="mt-2 h-2 w-full accent-violet-700" max={100} value={localStatus.progress} aria-label="Progression du téléchargement du modèle" />}
              {localStatus.state === 'ready' && <p className="mt-1 text-xs">Moteur actif : {localStatus.device === 'webgpu' ? 'WebGPU' : 'WASM / processeur'}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setLocalError(''); void loadLocalLLM().catch((loadError) => setLocalError(loadError instanceof Error ? loadError.message : 'Échec du chargement du modèle local.')); }}
              disabled={localStatus.state === 'loading' || localStatus.state === 'ready'}
              className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {localStatus.state === 'loading' ? 'Chargement…' : localStatus.state === 'ready' ? 'Modèle prêt' : 'Télécharger et charger le modèle'}
            </button>
            {localStatus.state === 'error' && localStatus.fallbackAvailable && (
              <button
                type="button"
                onClick={() => { setLocalError(''); void loadLocalLLM('wasm').catch((loadError) => setLocalError(loadError instanceof Error ? loadError.message : 'Échec du chargement WASM/CPU.')); }}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950"
              >
                Essayer WASM/CPU (variante jusqu’à 919 Mo)
              </button>
            )}
            {localStatus.state === 'error' && localStatus.fallbackAvailable && <p className="basis-full text-xs text-amber-900">Cette variante séparée peut entraîner un téléchargement supplémentaire; sélectionnez-la seulement si votre connexion et votre stockage le permettent.</p>}
            {localStatus.state === 'ready' && <button type="button" onClick={() => { unloadLocalLLM(); setLocalError(''); }} className="rounded-lg border border-violet-300 px-4 py-2.5 text-sm font-bold text-violet-900">Libérer la mémoire</button>}
          </div>
          {(localError || localStatus.error) && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{localError || localStatus.error}</p>}
        </div>
      ) : settings.provider === 'local' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Ce moteur pédagogique hors ligne à canevas reste disponible sans téléchargement; il ne remplace pas un grand modèle conversationnel. Pour le vrai LLM local, choisissez l’option Qwen3 ci-dessus et téléchargez-le une fois.
        </div>
      ) : (
        <>
          <div className={`rounded-lg border p-3 text-sm ${serverState === 'ready' && selectedProvider?.configured ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <p className="flex items-center gap-2 font-bold">
              {serverState === 'ready' && selectedProvider?.configured ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {serverState === 'checking' ? 'Vérification de la passerelle…'
                : serverState === 'unavailable' ? 'Passerelle serveur non disponible'
                  : selectedProvider?.configured ? `${selectedProvider.label} prêt${selectedProvider.models.length > 1 ? 's' : ''}`
                    : 'Fournisseur non configuré sur le serveur'}
            </p>
            {serverMessage && <p className="mt-1 text-xs leading-relaxed">{serverMessage}</p>}
            {serverState === 'ready' && selectedProvider?.configured && (
              <p className="mt-1 text-xs">Modèle autorisé : {selectedModel || selectedProvider.models[0]}{selectedProvider.webSearch ? ' · recherche web/citations selon le fournisseur' : ''}</p>
            )}
          </div>
          {selectedProvider?.configured && selectedProvider.models.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="msp-ai-model">Modèle</label>
              <select
                id="msp-ai-model"
                value={selectedModel}
                onChange={(event) => onSettingsChange({ models: { ...(settings.models || {}), [settings.provider]: event.target.value } })}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm"
              >
                {selectedProvider.models.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </div>
          )}

          {session ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-2 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4" />Accès IA ouvert pour <strong>{session.displayName}</strong> · {session.role === 'principal' ? 'principal' : 'équipe'}</p>
              <button type="button" onClick={() => void logout()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"><LogOut className="h-4 w-4" />Déconnexion</button>
            </div>
          ) : (
            <form onSubmit={login} className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="msp-ai-access-code">Code d’accès IA sécurisé</label>
              <div className="flex gap-2">
                <input
                  id="msp-ai-access-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  spellCheck={false}
                  maxLength={60}
                  placeholder="Code IA remis par l’administrateur"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 font-mono text-sm"
                  aria-label="Code d’accès IA sécurisé"
                />
                <button type="submit" disabled={busy || serverState !== 'ready' || !selectedProvider?.configured} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><KeyRound className="h-4 w-4" />{busy ? 'Vérification…' : 'Se connecter'}</button>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">Le code est validé par le serveur puis remplacé par un cookie de session HttpOnly; il n’est pas enregistré dans le navigateur. Vous devez être connecté pour utiliser un modèle en ligne.</p>
              {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
            </form>
          )}
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />Les clés des fournisseurs restent côté serveur. Chaque envoi de contenu nécessite toujours votre confirmation séparée.</p>
        </>
      )}
    </section>
  );
}
