/**
 * Agent pédagogique Master Soutien Pédagogique (v69), hors ligne par défaut.
 *
 * L’entretien guidé et le moteur APC local n’appellent aucun service externe.
 * Un fournisseur en ligne configuré peut être sélectionné explicitement; le
 * mode local reste toujours disponible comme solution de repli.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { Bot, ChevronLeft, Printer, RefreshCw, Save, Send, SkipForward, User, Wand2, FileText, Pencil } from 'lucide-react';
import {
  acknowledge,
  answersToPromptInput,
  interviewProgress,
  interviewRecap,
  nextQuestion,
  type InterviewAnswers,
  type InterviewQuestion,
} from '../utils/aiInterview';
import { enrichLesson } from '../utils/lessonEnrichment';
import { generateLocalLesson } from '../utils/localPedagogicalEngine';
import { generateLessonPlan, getLessonAISettings, saveAISettings, type AIProvider, type AISettings, type GeneratedLessonPlan } from '../utils/aiLessonGenerator';
import { getLocalLLMStatus, subscribeLocalLLMStatus } from '../utils/localLLM';
import AIOnlineAccessPanel from './AIOnlineAccessPanel';
import type { AIGatewaySession, AIProviderAvailability, OnlineAIProvider } from '../utils/aiGateway';
import { downloadFicheDocx, printFiche } from '../utils/ficheExport';

const FICHES_KEY = 'msp_fiches_pedagogiques';
const LESSON_EXCLUDED_PROVIDERS: readonly OnlineAIProvider[] = ['mistral'];

interface Msg {
  role: 'bot' | 'user';
  text: string;
  hint?: string;
}

const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  local: 'moteur pédagogique local à canevas',
  local_llm: 'Qwen3 local sur l’appareil',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  copilot: 'Microsoft Copilot / Azure OpenAI',
  mistral: 'Mistral (non disponible pour les fiches)',
  deepseek: 'DeepSeek',
  perplexity: 'Perplexity',
};


function saveGeneratedAsFiche(plan: GeneratedLessonPlan) {
  let fiches: any[] = [];
  try {
    fiches = JSON.parse(localStorage.getItem(FICHES_KEY) || '[]');
  } catch {
    fiches = [];
  }
  const fiche = {
    id: `fiche-ia-chat-${Date.now()}`,
    titre: plan.titre,
    classe: plan.classe,
    matiere: plan.matiere,
    domaine: plan.domaine,
    duree: plan.duree,
    date: new Date().toISOString().split('T')[0],
    competence: plan.competence,
    objectif: plan.objectif,
    materiel: plan.materiel,
    deroulement: plan.deroulement,
    evaluation: plan.evaluation,
    rubriques: plan.rubriques,
    pointsAControler: plan.pointsAControler,
    statut: 'brouillon',
    createdAt: Date.now(),
  };
  localStorage.setItem(FICHES_KEY, JSON.stringify([fiche, ...fiches]));
}

export default function AIAssistantChatScreen() {
  const goBack = useSmartBack();
  const navigate = useNavigate();
  const [aiSettings, setAISettings] = useState<AISettings>(() => getLessonAISettings());
  const [gatewaySession, setGatewaySession] = useState<AIGatewaySession | null>(null);
  const [gatewayProviders, setGatewayProviders] = useState<AIProviderAvailability[]>([]);
  const [localModelReady, setLocalModelReady] = useState(getLocalLLMStatus().state === 'ready');
  const onlineProvider = aiSettings.provider !== 'local' && aiSettings.provider !== 'local_llm' && gatewayProviders.some(provider => provider.id === aiSettings.provider && provider.configured)
    ? aiSettings.provider : null;
  const [answers, setAnswers] = useState<InterviewAnswers>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [plan, setPlan] = useState<GeneratedLessonPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Première question au montage
  useEffect(() => {
    const q = nextQuestion({});
    if (q) {
      setCurrent(q);
      setMessages([{ role: 'bot', text: q.text, hint: q.hint }]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, plan]);
  useEffect(() => subscribeLocalLLMStatus(value => setLocalModelReady(value.state === 'ready')), []);

  const progress = interviewProgress(answers);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  function pushBot(text: string, hint?: string) {
    setMessages((m) => [...m, { role: 'bot', text, hint }]);
  }

  function submit(value: string) {
    if (!current) return;
    const clean = value.trim();
    if (!clean && !current.optional) return;

    const nextAnswers: InterviewAnswers = { ...answers, [current.id]: clean };
    setAnswers(nextAnswers);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: clean || '(passer)' }]);
    setCurrent(null);
    setThinking(true);

    // Petite latence pour l'effet conversationnel
    window.setTimeout(() => {
      setThinking(false);
      pushBot(acknowledge(current.id, clean, nextAnswers));
      const q = nextQuestion(nextAnswers);
      if (q) {
        setCurrent(q);
        window.setTimeout(() => pushBot(q.text, q.hint), 250);
      } else {
        window.setTimeout(() => {
          pushBot('J’ai tout ce qu’il me faut. Voici le récapitulatif de votre demande — vérifiez, puis lancez la rédaction.');
        }, 250);
      }
    }, 420);
  }

  async function generate(mode: 'local' | 'device' | 'online' = 'local') {
    const inputForLesson = answersToPromptInput(answers);
    if (mode === 'device' && aiSettings.provider !== 'local_llm') {
      pushBot('Choisissez « LLM local sur l’appareil (Qwen3 0.6B) » dans le panneau, puis chargez le modèle avant de rédiger.');
      return;
    }
    if (mode === 'device' && !localModelReady) {
      pushBot('Le modèle Qwen3 n’est pas chargé. Utilisez le bouton de téléchargement dans le panneau ci-dessus; cette demande n’a pas été envoyée.');
      return;
    }
    if (mode === 'online' && onlineProvider) {
      if (!gatewaySession) {
        pushBot('Connectez-vous avec votre code d’accès IA sécurisé dans le panneau de configuration avant d’utiliser un modèle en ligne.');
        return;
      }
      const details = [
        `Production : ${inputForLesson.generationKind || 'fiche'}`,
        `Classe : ${inputForLesson.niveau || 'non précisée'}`,
        `Matière : ${inputForLesson.matiere || 'non précisée'}`,
        `Thème : ${inputForLesson.theme || 'non précisé'}`,
        `Durée : ${inputForLesson.duree || 'non précisée'}`,
        `Objectif : ${inputForLesson.objectif || 'non précisé'}`,
        `Réponses et consignes : ${inputForLesson.consignes || 'aucune'}`,
      ].join('\n');
      const allowed = window.confirm(`Envoyer ces informations à ${AI_PROVIDER_LABELS[onlineProvider]} pour cette génération ?\n\n${details}\n\nLa passerelle MSP ajoute son canevas pédagogique. Aucun envoi ne part si vous refusez. N’incluez pas de données personnelles d’élèves.`);
      if (!allowed) return;
    }
    setThinking(true);
    try {
      let base: GeneratedLessonPlan;
      if (mode === 'online' && onlineProvider) {
        base = await generateLessonPlan(aiSettings, inputForLesson, { allowExternal: true });
      } else if (mode === 'device') {
        base = await generateLessonPlan(aiSettings, inputForLesson);
      } else {
        await new Promise<void>(resolve => window.setTimeout(resolve, 350));
        base = generateLocalLesson(inputForLesson);
      }
      setPlan(enrichLesson(base, answers));
      setEditing(false);
      setSaved(false);
      pushBot(mode === 'online' && onlineProvider
        ? `Un premier brouillon a été généré avec ${AI_PROVIDER_LABELS[onlineProvider]}. Vérifiez les faits, le programme et les exemples avant de l’utiliser.`
        : mode === 'device'
          ? 'Brouillon généré par Qwen3 sur cet appareil; aucune donnée n’a été envoyée au cloud. Vérifiez le contenu : ce petit modèle peut se tromper ou omettre des détails.'
          : 'Votre brouillon APC est prêt grâce au moteur pédagogique local à canevas. Vous pouvez le modifier, l’enregistrer dans « Mes fiches », l’imprimer ou le télécharger en Word.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'génération impossible';
      if (mode === 'device') {
        pushBot(`Le modèle local n’a pas pu produire le brouillon (${reason}). Aucun prompt n’a été envoyé. Vérifiez la mémoire disponible ou réessayez après avoir rechargé le modèle.`);
      } else {
        const base = generateLocalLesson(inputForLesson);
        setPlan(enrichLesson(base, answers));
        setEditing(false);
        setSaved(false);
        pushBot(`Le fournisseur en ligne n’a pas répondu (${reason}). J’ai préparé un brouillon local hors connexion; vérifiez-le et modifiez-le si nécessaire.`);
      }
    } finally {
      setThinking(false);
    }
  }

  function restart() {
    setAnswers({});
    setPlan(null);
    setEditing(false);
    setSaved(false);
    const q = nextQuestion({});
    setCurrent(q);
    setMessages(q ? [{ role: 'bot', text: q.text, hint: q.hint }] : []);
  }

  /** Revenir sur une réponse déjà donnée. */
  function reopen(id: string) {
    const copy = { ...answers };
    delete copy[id];
    setAnswers(copy);
    setPlan(null);
    const q = nextQuestion(copy);
    setCurrent(q);
    if (q) pushBot(q.text, q.hint);
  }

  const recap = interviewRecap(answers);
  const done = !current && !thinking;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Agent IA Master Soutien Pédagogique</h1>
            <p className="text-emerald-100 text-xs">Entretien guidé · canevas hors ligne, LLM sur appareil ou fournisseur distant</p>
          </div>
          <button onClick={restart} className="p-2 bg-white/20 rounded-lg" aria-label="Recommencer">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 h-2 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-emerald-100 text-[11px] mt-1">{progress.done} question(s) sur {progress.total} · {pct} %</p>
      </header>

      <main className="flex-1 p-4 space-y-3 pb-40">
        <AIOnlineAccessPanel
          settings={aiSettings}
          onSettingsChange={(patch) => setAISettings(previous => {
            const next = { ...previous, ...patch };
            saveAISettings(next);
            return next;
          })}
          onProvidersChange={setGatewayProviders}
          onSessionChange={setGatewaySession}
          title="Moteur IA — local ou en ligne"
          excludedProviders={LESSON_EXCLUDED_PROVIDERS}
        />
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950">
          Mistral n’est pas proposé pour générer des fiches dans cet agent. Il reste disponible dans le chat général de l’application.
        </p>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
              }`}
            >
              {m.text}
              {m.hint && <p className="mt-2 text-xs text-gray-500 italic">{m.hint}</p>}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Récapitulatif + bouton de génération */}
        {done && !plan && recap.length > 0 && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Récapitulatif de votre demande
            </h2>
            <div className="space-y-1.5">
              {recap.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 text-sm border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 shrink-0">{r.label}</span>
                  <span className="text-gray-800 font-medium text-right flex-1">{r.value}</span>
                  <button onClick={() => reopen(labelToId(r.label))} className="text-emerald-600 text-xs underline shrink-0">
                    modifier
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => void generate('local')}
                className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" /> Rédiger avec le canevas hors ligne (APC Bénin)
              </button>
              {aiSettings.provider === 'local_llm' && (
                <>
                  <button
                    onClick={() => void generate('device')}
                    disabled={!localModelReady || thinking}
                    className="w-full border border-violet-300 bg-violet-50 text-violet-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Bot className="w-5 h-5" /> Rédiger avec Qwen3 sur cet appareil
                  </button>
                  {!localModelReady && <p className="text-[11px] text-violet-900">Téléchargez le modèle dans le panneau avant de générer; vos prompts ne quitteront pas cet appareil.</p>}
                </>
              )}
              {onlineProvider && (
                <>
                  <button
                    onClick={() => void generate('online')}
                    className="w-full border border-sky-300 bg-sky-50 text-sky-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Bot className="w-5 h-5" /> Générer avec {AI_PROVIDER_LABELS[onlineProvider]} · Internet
                  </button>
                  <p className="text-[11px] leading-relaxed text-amber-800">Ce choix transmet les consignes de la fiche au fournisseur sélectionné. N’indiquez pas de noms ni de données personnelles d’élèves.</p>
                </>
              )}
              {aiSettings.provider !== 'local' && aiSettings.provider !== 'local_llm' && !onlineProvider && (
                <p className="text-xs text-amber-800">Le fournisseur sélectionné n’est pas configuré. Le mode local reste disponible.</p>
              )}
              <button onClick={() => navigate('/generateur-fiches-ia')} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700">
                Paramétrer un fournisseur ou ouvrir le générateur avancé
              </button>
            </div>
          </div>
        )}

        {/* Résultat */}
        {plan && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{plan.titre}</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="text-emerald-700 text-sm flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                <Pencil className="w-4 h-4" /> {editing ? 'Aperçu' : 'Modifier'}
              </button>
            </div>

            {(['classe', 'matiere', 'duree', 'competence', 'objectif', 'materiel', 'deroulement', 'evaluation'] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{FIELD_LABELS[k]}</label>
                {editing ? (
                  <textarea
                    value={plan[k]}
                    onChange={(e) => setPlan({ ...plan, [k]: e.target.value })}
                    rows={k === 'deroulement' || k === 'evaluation' ? 12 : 2}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{plan[k]}</p>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  saveGeneratedAsFiche(plan);
                  setSaved(true);
                }}
                className="bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> {saved ? 'Enregistrée ✓' : 'Mes fiches'}
              </button>
              <button onClick={() => printFiche(plan)} className="bg-[#006b4f] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> Imprimer
              </button>
            </div>
            <button
              onClick={() => downloadFicheDocx(plan)}
              className="w-full bg-white border border-emerald-300 text-emerald-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" /> Télécharger en Word
            </button>
            <button onClick={restart} className="w-full text-gray-500 text-sm underline pt-1">
              Préparer un autre document
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Zone de saisie */}
      {current && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 space-y-2">
          {current.chips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {current.chips.map((c) => (
                <button
                  key={c}
                  onClick={() => submit(c)}
                  className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-2 text-sm font-medium"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit(input);
              }}
              placeholder="Écrivez votre réponse..."
              className="flex-1 p-3 border border-gray-300 rounded-xl text-sm"
            />
            {current.optional && (
              <button onClick={() => submit('')} className="px-3 bg-gray-100 text-gray-600 rounded-xl" aria-label="Passer">
                <SkipForward className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => submit(input)}
              disabled={!input.trim() && !current.optional}
              className="px-4 bg-emerald-600 text-white rounded-xl disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  classe: 'Classe',
  matiere: 'Matière',
  duree: 'Durée',
  competence: 'Compétence visée',
  objectif: 'Objectif',
  materiel: 'Matériel',
  deroulement: 'Déroulement',
  evaluation: 'Évaluation et remédiation',
};

function labelToId(label: string): string {
  const map: Record<string, string> = {
    Production: 'kind',
    Classe: 'niveau',
    'Matière': 'matiere',
    'Thème': 'theme',
    'Durée': 'duree',
    Effectif: 'effectif',
    'Matériel': 'materiel',
    'Prérequis': 'prerequis',
    'Difficulté visée': 'obstacle',
    'Ancrage local': 'contexte',
    'Appui principal': 'oral',
    Manipulation: 'experience',
    'Support de langue': 'support_texte',
    'Volume d’exercices': 'volume_exercices',
    Diffusion: 'support_numerique',
    'Évaluation': 'evaluation',
    'Différenciation': 'differenciation',
    Norme: 'standard',
    'Exigence particulière': 'consignes',
  };
  return map[label] || label;
}
