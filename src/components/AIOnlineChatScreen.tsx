import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronLeft, ExternalLink, MessageCircle, Plus, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import AIOnlineAccessPanel from './AIOnlineAccessPanel';
import { getAISettings, saveAISettings, type AISettings } from '../utils/aiLessonGenerator';
import { sendAIRequest, type AIGatewaySession, type AIProviderAvailability, type GatewayMessage, type OnlineAIProvider } from '../utils/aiGateway';
import { generateLocalLLM, getLocalLLMStatus, subscribeLocalLLMStatus } from '../utils/localLLM';
import { FICHE_GENERATION_UNAVAILABLE, isFicheGenerationRequest } from '../utils/aiGenerationPolicy';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

const LABELS: Record<string, string> = {
  local: 'Moteur pédagogique à canevas', local_llm: 'Qwen3 local',
  openai: 'OpenAI / ChatGPT', anthropic: 'Anthropic / Claude', mistral: 'Mistral AI',
  perplexity: 'Perplexity', gemini: 'Google Gemini', deepseek: 'DeepSeek', copilot: 'Azure OpenAI',
};

function safeCitation(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export default function AIOnlineChatScreen() {
  const goBack = useSmartBack();
  const [settings, setSettings] = useState<AISettings>(getAISettings());
  const [providers, setProviders] = useState<AIProviderAvailability[]>([]);
  const [session, setSession] = useState<AIGatewaySession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localModelReady, setLocalModelReady] = useState(getLocalLLMStatus().state === 'ready');
  const [draft, setDraft] = useState('');
  const [pendingMessages, setPendingMessages] = useState<GatewayMessage[] | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending, showConsent]);
  useEffect(() => subscribeLocalLLMStatus(value => setLocalModelReady(value.state === 'ready')), []);

  const currentProvider = providers.find(provider => provider.id === settings.provider);
  const isLocalLLM = settings.provider === 'local_llm';
  const onlineEnabled = settings.provider !== 'local' && !isLocalLLM && Boolean(currentProvider?.configured);

  function newChat() {
    if (messages.length && !window.confirm('Effacer la conversation de cet appareil et commencer une nouvelle discussion ?')) return;
    setMessages([]);
    setDraft('');
    setError('');
    setPendingMessages(null);
    setShowConsent(false);
  }

  async function sendLocalMessage(content: string) {
    if (!localModelReady) {
      setError('Téléchargez d’abord le modèle Qwen3 local dans le panneau ci-dessus. Aucun prompt n’a été envoyé.');
      return;
    }
    const conversation = [
      { role: 'system' as const, content: 'Tu es l’assistant pédagogique de Master Soutien Pédagogique, exécuté localement sur l’appareil. Réponds clairement en français, adapte tes explications au contexte scolaire, indique les incertitudes et n’invente pas de conformité officielle. La préparation de fiches par IA est temporairement désactivée : ne rédige pas et ne génère pas de fiche pédagogique ou de séance complète. Pour une demande de ce type, explique que la fonction est indisponible et que les fiches peuvent être créées manuellement. Tu peux répondre aux questions, expliquer des notions et aider à reformuler un texte.' },
      ...messages.map(({ role, content: text }) => ({ role, content: text })),
      { role: 'user' as const, content },
    ];
    setMessages(previous => [...previous, { role: 'user', content }, { role: 'assistant', content: '' }]);
    setDraft('');
    setSending(true);
    setError('');
    try {
      const text = await generateLocalLLM(conversation, chunk => {
        setMessages(previous => {
          const next = [...previous];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      });
      setMessages(previous => {
        const next = [...previous];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: text || last.content };
        return next;
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'La génération locale a échoué.';
      setError(message);
      setMessages(previous => {
        const next = [...previous];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content ? `${last.content}\n\n${message}` : `Je n’ai pas pu produire une réponse. ${message}` };
        return next;
      });
    } finally { setSending(false); }
  }

  function prepareSend(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    if (isFicheGenerationRequest(content)) {
      setError(`${FICHE_GENERATION_UNAVAILABLE} Votre demande n’a pas été envoyée ni transmise à un fournisseur.`);
      return;
    }
    setError('');
    if (settings.provider === 'local_llm') {
      void sendLocalMessage(content);
      return;
    }
    if (settings.provider === 'local') {
      setError('Le moteur pédagogique à canevas ne propose pas de chat libre. Choisissez Qwen3 local et chargez-le, ou connectez un fournisseur en ligne.');
      return;
    }
    if (!currentProvider?.configured) {
      setError('Ce fournisseur n’est pas encore configuré sur le serveur de l’application.');
      return;
    }
    if (!session) {
      setError('Connectez-vous avec votre code IA sécurisé dans le panneau ci-dessus.');
      return;
    }
    const next = [...messages, { role: 'user' as const, content }];
    const history: GatewayMessage[] = [
      { role: 'system', content: 'Tu es l’assistant conversationnel général de Master Soutien Pédagogique. Aide l’utilisateur avec des réponses claires, utiles et adaptées au contexte scolaire. Signale les incertitudes et ne prétends pas à une conformité officielle non vérifiée. La préparation de fiches par IA est temporairement désactivée : ne rédige pas et ne génère pas de fiche pédagogique ou de séance complète. Pour une demande de ce type, explique que la fonction est indisponible et que les fiches peuvent être créées manuellement. Tu peux répondre aux questions, expliquer des notions et aider à reformuler un texte.' },
      ...next.map(message => ({ role: message.role, content: message.content })),
    ];
    setPendingMessages(history);
    setDraft('');
    setShowConsent(true);
  }

  async function authorizeAndSend() {
    if (!showConsent || !pendingMessages || !currentProvider || !session || settings.provider === 'local' || settings.provider === 'local_llm') return;
    const provider = settings.provider as OnlineAIProvider;
    const savedModel = settings.models?.[provider] || '';
    const model = currentProvider.models.includes(savedModel) ? savedModel : currentProvider.models[0];
    if (!model) { setError('Aucun modèle n’est autorisé pour ce fournisseur sur le serveur.'); setShowConsent(false); return; }
    const sentMessages: ChatMessage[] = pendingMessages
      .filter((message): message is GatewayMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .map(({ role, content }) => ({ role, content }));
    setShowConsent(false);
    setSending(true);
    setError('');
    setMessages(previous => [...previous, sentMessages[sentMessages.length - 1]]);
    try {
      const reply = await sendAIRequest(provider, model, pendingMessages, { consent: true });
      setMessages(previous => [...previous, { role: 'assistant', content: reply.text, citations: reply.citations }]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'La demande IA a échoué.';
      setError(message);
      setMessages(previous => [...previous, { role: 'assistant', content: `Je n’ai pas pu traiter la demande. ${message}` }]);
    } finally {
      setPendingMessages(null);
      setSending(false);
    }
  }

  const userPending = pendingMessages?.filter(message => message.role === 'user') || [];
  const pendingUserMessage = userPending[userPending.length - 1]?.content || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-emerald-700 p-4 text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button onClick={goBack} className="rounded-lg bg-white/15 p-2" aria-label="Retour"><ChevronLeft className="h-6 w-6" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black">Assistant IA multi-modèles</h1>
            <p className="text-xs text-emerald-100">Questions et explications : Qwen3 sur cet appareil, ou API distante après confirmation séparée</p>
          </div>
          <button onClick={newChat} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold"><Plus className="h-4 w-4" />Nouveau</button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 pb-8">
        <AIOnlineAccessPanel
          settings={settings}
          onSettingsChange={patch => setSettings(previous => {
            const next = { ...previous, ...patch };
            saveAISettings(next);
            return next;
          })}
          onProvidersChange={setProviders}
          onSessionChange={setSession}
          title="Choisir Qwen local ou un fournisseur en ligne"
        />

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="note">
          <p className="font-bold">La préparation de fiches par IA est temporairement indisponible.</p>
          <p className="mt-1 text-xs leading-relaxed">Ce chat reste disponible pour les questions, les explications et les reformulations. L’IA locale est conservée, mais ce chat ne rédige pas de fiche complète; utilisez l’espace de fiches pour une préparation manuelle.</p>
        </div>

        {isLocalLLM ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
            <p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />Mode Qwen local : après téléchargement, le message et l’historique sont traités sur cet appareil, sans envoi à un service cloud.</p>
            <p className="mt-1 text-xs leading-relaxed">La conversation reste en mémoire dans cet écran et n’est pas sauvegardée automatiquement. Les réponses d’un modèle 0,6B sont moins fiables et moins riches que celles des meilleurs modèles en ligne; vérifiez les contenus pédagogiques.</p>
          </div>
        ) : settings.provider === 'local' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">Le moteur à canevas fonctionne hors ligne sans LLM. Pour un chat conversationnel local, choisissez Qwen3 dans le panneau ci-dessus et téléchargez le modèle.</div>
        ) : (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
            <p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />Avant chaque envoi en ligne, vous autorisez séparément la transmission de la demande et de l’historique affiché au fournisseur choisi.</p>
            <p className="mt-1 text-xs leading-relaxed">La conversation reste en mémoire dans cet écran et n’est pas sauvegardée automatiquement. Les citations et la recherche web sont affichées lorsqu’elles sont retournées par Perplexity; les autres modèles n’ont pas nécessairement accès au Web.</p>
          </div>
        )}

        <section className="flex min-h-[38vh] flex-1 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Conversation IA">
          {messages.length === 0 && (
            <div className="m-auto max-w-lg py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-7 w-7" /></div>
              <h2 className="mt-4 text-xl font-black text-slate-900">Comment puis-je vous aider ?</h2>
              <p className="mt-2 text-sm text-slate-600">Posez une question, demandez une explication ou faites reformuler un texte. La génération de fiches par IA est temporairement suspendue.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-emerald-900">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5">Poser une question de classe</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5">Expliquer une notion</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5">Améliorer un texte</span>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <article key={index} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"><Bot className="h-5 w-5" /></span>}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${message.role === 'user' ? 'rounded-br-sm bg-emerald-700 text-white' : 'rounded-bl-sm border border-slate-100 bg-slate-50 text-slate-800'}`}>
                {message.content}
                {message.citations?.length ? (
                  <div className="mt-3 border-t border-slate-200 pt-2">
                    <p className="mb-1 flex items-center gap-1 text-xs font-bold text-sky-800"><ExternalLink className="h-3.5 w-3.5" />Sources renvoyées par le fournisseur</p>
                    <ul className="space-y-1">
                      {message.citations.map((citation, citationIndex) => {
                        const href = safeCitation(citation);
                        return href ? <li key={`${citation}-${citationIndex}`}><a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-sky-700 underline">{href}</a></li> : null;
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
              {message.role === 'user' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"><Sparkles className="h-4 w-4" /></span>}
            </article>
          ))}

          {sending && <div className="flex items-center gap-2 text-sm text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{LABELS[settings.provider] || settings.provider} réfléchit…</div>}
          <div ref={bottomRef} />
        </section>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}

        <form onSubmit={prepareSend} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="sr-only" htmlFor="ai-chat-input">Votre message</label>
          <textarea
            id="ai-chat-input"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
            rows={3}
            maxLength={12000}
            placeholder={isLocalLLM ? (localModelReady ? 'Écrivez à Qwen3 sur cet appareil… (Entrée pour envoyer)' : 'Téléchargez d’abord le modèle local dans le panneau ci-dessus.') : settings.provider === 'local' ? 'Choisissez Qwen3 local pour un chat conversationnel, ou un fournisseur en ligne.' : onlineEnabled ? 'Écrivez votre demande… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)' : 'Connectez-vous à un fournisseur en ligne pour utiliser le chat libre.'}
            className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"
            disabled={sending}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{isLocalLLM ? 'Inférence sur cet appareil; aucun prompt ne part au cloud.' : settings.provider === 'local' ? 'Mode à canevas local; pas de chat libre.' : currentProvider?.webSearch ? 'Perplexity peut renvoyer des liens de sources.' : 'Chat texte via le modèle choisi.'} · {draft.length}/12 000</p>
            <button type="submit" disabled={sending || !draft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />Envoyer</button>
          </div>
        </form>
      </main>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="ai-chat-consent-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="ai-chat-consent-title" className="text-lg font-black text-slate-900">Autoriser cette demande en ligne ?</h2>
            <p className="mt-2 text-sm text-slate-700">Le fournisseur <strong>{LABELS[settings.provider] || settings.provider}</strong> recevra le nouveau message et le contexte des échanges précédents affichés dans cette conversation.</p>
            <div className="mt-3 max-h-52 overflow-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="mb-2 text-xs font-bold">Message et historique qui partiront :</p>
              {pendingMessages?.filter(message => message.role !== 'system').map((message, index) => (
                <p key={index} className="mb-2 whitespace-pre-wrap"><strong>{message.role === 'user' ? 'Vous' : 'Assistant'} :</strong> {message.content}</p>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-amber-800">Le serveur ajoute une instruction pédagogique standard; les données de conversation seront traitées selon la politique du fournisseur. N’envoyez pas de noms, matricules ou autres données personnelles d’élèves. Aucun envoi ne part si vous annulez.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setShowConsent(false); setPendingMessages(null); setDraft(pendingUserMessage); }} className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700">Annuler</button>
              <button type="button" onClick={() => void authorizeAndSend()} className="rounded-xl bg-emerald-700 px-3 py-3 text-sm font-bold text-white">J’autorise cet envoi</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
