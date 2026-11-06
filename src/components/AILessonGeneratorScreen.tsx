import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { Bot, ChevronLeft, Clipboard, ImageUp, Pencil, Printer, Save, Wand2, FileText, Sparkles, Eye } from 'lucide-react';
import { downloadFicheDocx, downloadFichePdf, printFiche } from '../utils/ficheExport';
import { copyText } from '../utils/clipboard';
import {
  AIProvider,
  AISettings,
  buildLessonPrompt,
  extractModelText,
  fileToInlineImage,
  generateLessonPlan,
  getLessonAISettings,
  PROMPT_MAGIC_EXERCICES_ADAPTATIFS,
  saveAISettings,
  GeneratedLessonPlan,
  GenerationKind,
  PedagogicalStandard,
  isExternalAIProvider,
  REFERENCE_FILE_MAX_BYTES,
} from '../utils/aiLessonGenerator';
import AIOnlineAccessPanel from './AIOnlineAccessPanel';
import type { AIGatewaySession, AIProviderAvailability, OnlineAIProvider } from '../utils/aiGateway';

const LESSON_EXCLUDED_PROVIDERS: readonly OnlineAIProvider[] = ['mistral'];
const FICHES_KEY = 'msp_fiches_pedagogiques';

function today() {
  return new Date().toISOString().split('T')[0];
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  local: 'Moteur intégré à canevas', local_llm: 'Qwen3 local sur l’appareil', gemini: 'Google Gemini', openai: 'OpenAI / ChatGPT',
  anthropic: 'Anthropic Claude', copilot: 'Microsoft Copilot / Azure OpenAI',
  mistral: 'Mistral (non disponible pour les fiches)', deepseek: 'DeepSeek', perplexity: 'Perplexity',
};


function loadFiches(): any[] {
  try {
    return JSON.parse(localStorage.getItem(FICHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveGeneratedAsFiche(plan: GeneratedLessonPlan) {
  const fiches = loadFiches();
  const fiche = {
    id: `fiche-ai-${Date.now()}`,
    titre: plan.titre,
    classe: plan.classe,
    matiere: plan.matiere,
    domaine: plan.domaine,
    duree: plan.duree,
    date: today(),
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

export default function AILessonGeneratorScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [settings, setSettings] = useState<AISettings>(() => getLessonAISettings());
  const [niveau, setNiveau] = useState('');
  const [matiere, setMatiere] = useState('');
  const [theme, setTheme] = useState('');
  const [duree, setDuree] = useState('');
  const [objectif, setObjectif] = useState('');
  const [consignes, setConsignes] = useState('');
  const [generationKind, setGenerationKind] = useState<GenerationKind>('fiche');
  const [standard, setStandard] = useState<PedagogicalStandard>('FICHE_REFERENCE');
  const [image, setImage] = useState<{ mimeType: string; base64: string } | undefined>();
  const [modelFileName, setModelFileName] = useState('');
  const [modelText, setModelText] = useState('');
  const [referenceStatus, setReferenceStatus] = useState('');
  const [readingReference, setReadingReference] = useState(false);
  const [showRemoteConsent, setShowRemoteConsent] = useState(false);
  const [gatewaySession, setGatewaySession] = useState<AIGatewaySession | null>(null);
  const [gatewayProviders, setGatewayProviders] = useState<AIProviderAvailability[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedLessonPlan | null>(null);
  const [draft, setDraft] = useState<GeneratedLessonPlan | null>(null); // version modifiable
  const [editing, setEditing] = useState(false);

  function updateSettings(patch: Partial<AISettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAISettings(next);
  }

  async function runGeneration(allowExternal = false) {
    setGenerating(true);
    setShowRemoteConsent(false);
    try {
      const plan = await generateLessonPlan(settings, {
        niveau, matiere, theme: theme.trim(), duree, objectif, consignes, generationKind, standard, modelText, image,
      }, { allowExternal });
      setResult(plan);
      setDraft(plan);
      setEditing(false);
      setTimeout(() => document.getElementById('resultat-fiche')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e: any) {
      alert(e.message || 'Génération impossible. Vérifiez le fournisseur ou utilisez le brouillon local.');
    } finally {
      setGenerating(false);
    }
  }

  function handleGenerate() {
    if (readingReference) { alert('Attendez la fin de la lecture locale de la fiche de référence.'); return; }
    if (!theme.trim()) { alert('Saisissez le titre de la nouvelle leçon.'); return; }
    if (isExternalAIProvider(settings.provider)) {
      const provider = gatewayProviders.find(item => item.id === settings.provider);
      if (!provider?.configured) {
        alert(`Le fournisseur ${PROVIDER_LABELS[settings.provider]} n’est pas encore activé côté serveur.`);
        return;
      }
      if (!gatewaySession) {
        alert('Connectez-vous avec votre code d’accès IA sécurisé dans le panneau « IA en ligne » avant de générer.');
        return;
      }
      setShowRemoteConsent(true);
      return;
    }
    void runGeneration(false);
  }

  function confirmRemoteGeneration() {
    if (!showRemoteConsent || !isExternalAIProvider(settings.provider)) return;
    void runGeneration(true);
  }

  function updateDraft(patch: Partial<GeneratedLessonPlan>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateRubrique(index: number, patch: Partial<NonNullable<GeneratedLessonPlan['rubriques']>[number]>) {
    setDraft(previous => {
      if (!previous?.rubriques) return previous;
      const rubriques = previous.rubriques.map((section, i) => i === index ? { ...section, ...patch } : section);
      const key = (label: string) => label.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const find = (pattern: RegExp) => rubriques.find(section => pattern.test(key(section.titre)))?.contenu;
      const evaluation = find(/evaluation|epreuve|controle/);
      const deroulement = rubriques.filter(section => !/evaluation|epreuve|controle/.test(key(section.titre)))
        .map(section => `${section.titre.toUpperCase()}\n${section.contenu}`).join('\n\n');
      return {
        ...previous, rubriques, deroulement: deroulement || previous.deroulement,
        competence: find(/competence|capacite/) || previous.competence,
        objectif: find(/objectif|intention/) || previous.objectif,
        materiel: find(/materiel|support|ressource/) || previous.materiel,
        evaluation: evaluation || previous.evaluation,
      };
    });
  }

  function addRubrique() {
    setDraft(previous => previous ? { ...previous, rubriques: [...(previous.rubriques || []), { titre: 'Nouvelle rubrique', contenu: '' }] } : previous);
  }

  function removeRubrique(index: number) {
    setDraft(previous => previous ? { ...previous, rubriques: (previous.rubriques || []).filter((_, i) => i !== index) } : previous);
  }

  async function copyPrompt() {
    const prompt = buildLessonPrompt({ niveau, matiere, theme, duree, objectif, consignes, generationKind, standard, modelText, image });
    const okCopy = await copyText(prompt);
    alert(okCopy ? 'Prompt copié. Vous pouvez le coller dans Gemini, Claude, ChatGPT, Copilot, DeepSeek ou Perplexity.' : 'Impossible de copier automatiquement : sélectionnez le prompt manuellement.');
  }

  async function copyExercisesPrompt() {
    const okCopy = await copyText(PROMPT_MAGIC_EXERCICES_ADAPTATIFS);
    alert(okCopy ? 'Prompt Magic 2 copié.' : 'Impossible de copier automatiquement : sélectionnez le prompt manuellement.');
  }

  function saveFiche() {
    if (!draft) return;
    saveGeneratedAsFiche(draft);
    alert('Brouillon enregistré dans Mes fiches. Validez-le après relecture.');
  }

  async function handleModelFile(file?: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      alert('Formats acceptés : DOCX, PDF, JPG, JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > REFERENCE_FILE_MAX_BYTES) {
      alert('La fiche ne doit pas dépasser 15 Mo.');
      return;
    }
    setModelFileName(file.name);
    setModelText('');
    setImage(undefined);
    setResult(null);
    setDraft(null);
    setReadingReference(true);
    setReferenceStatus('Lecture locale de la fiche…');
    try {
      const imageFile = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
      const [text, inlineImage] = await Promise.all([
        extractModelText(file, setReferenceStatus),
        imageFile ? fileToInlineImage(file) : Promise.resolve(undefined),
      ]);
      setModelText(text);
      setImage(inlineImage);
      setReferenceStatus(`Fiche lue localement · ${text.length.toLocaleString('fr-FR')} caractères${ext === 'pdf' && text ? ' (texte/OCR)' : imageFile ? ' (OCR français)' : ' (DOCX)'}.`);
      setReadingReference(false);
    } catch (e) {
      console.error(e);
      setModelFileName('');
      setModelText('');
      setImage(undefined);
      setReferenceStatus('');
      setReadingReference(false);
      alert(e instanceof Error ? e.message : 'Impossible de lire cette fiche. Essayez un PDF net ou un DOCX.');
    }
  }

  function clearReference() {
    setModelFileName('');
    setModelText('');
    setImage(undefined);
    setReferenceStatus('');
  }

  const THEME_SUGGESTIONS: Record<string, string[]> = {
    'Mathématiques': ['Addition avec retenue', 'Soustraction sans retenue', 'Multiplication par un chiffre', 'Division simple', 'Fractions simples', 'Les nombres jusqu\'à 10 000', 'Problèmes de partage', 'Les mesures de longueur'],
    'Math': ['Addition avec retenue', 'Soustraction sans retenue', 'Multiplication par un chiffre', 'Division simple', 'Fractions simples', 'Les nombres jusqu\'à 10 000', 'Problèmes de partage', 'Les mesures de longueur'],
    'Dictée': ['Dictée : les mots de la semaine', 'Dictée : le son « on »', 'Dictée : accords sujet-verbe', 'Dictée préparée : le marché', 'Dictée : les homophones'],
    'Lecture': ['Lecture : conte africain', 'Lecture : texte documentaire', 'Lecture : le renard et la hyène', 'Lecture : la vie au village', 'Lecture : poème de la rentrée'],
    'Expression écrite': ['Rédaction : je me présente', 'Rédaction : une journée à l\'école', 'Rédaction : la fête de la naissance', 'Rédaction : mon animal préféré', 'Rédaction : un souvenir de vacances'],
    'Compréhension de l\'écrit': ['Texte : la saison des pluies', 'Texte : le marché de Cotonou', 'Texte : l\'hygiène à l\'école', 'Texte : le baobab'],
    'EST': ['La germination du haricot', 'L\'eau et ses états', 'Le tri des déchets', 'Les plantes de notre environnement', 'Les animaux de la ferme'],
    'ES': ['L\'hygiène corporelle', 'L\'alimentation équilibrée', 'Le paludisme : prévention', 'Les dents et leur entretien', 'Le sommeil et le repos'],
    'EPS': ['Course de vitesse', 'Lancer de balle', 'Sauts et parcours', 'Jeux collectifs : béret', 'Relais et coopération'],
    'Français': ['La phrase : sujet et verbe', 'Le présent de l\'indicatif', 'Les types de phrases', 'Les déterminants', 'Le futur simple'],
    'Anglais': ['Greetings and introductions', 'Numbers 1-20', 'Colours', 'My family', 'At the market'],
    'Histoire-Géographie': ['Les grands fleuves du Bénin', 'Les ethnies et langues du Bénin', 'La vie au temps des anciens', 'Les villes du Bénin', 'La carte du Bénin'],
    'PCT': ['Les états de la matière', 'Les leviers simples', 'Les circuits électriques simples', 'Les mélanges et solutions', 'Les machines simples'],
    'SVT': ['La respiration', 'La nutrition des plantes', 'La reproduction des plantes', 'Le cycle de l\'eau', 'Les écosystèmes'],
    'Philosophie': ['Peut-on se passer de la philosophie ?', 'La liberté et la responsabilité', 'La conscience et la connaissance', 'Le bonheur : qu\'est-ce que c\'est ?'],
    'Conduite': ['La signalisation routière', 'Traverser la route en sécurité', 'Les panneaux de signalisation', 'Comportement du piéton'],
  };

  const suggestions = THEME_SUGGESTIONS[matiere] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">IA Master Soutien Pédagogique</h1>
            <p className="text-emerald-100 text-sm">Envoyez une fiche modèle, saisissez le nouveau titre, puis relisez le résultat</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <button
          onClick={() => navigate('/assistant-ia')}
          className="w-full text-left bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-4 shadow flex items-center gap-3"
        >
          <Bot className="w-8 h-8 shrink-0" />
          <span>
            <span className="block font-bold">Mode conversation (recommandé)</span>
            <span className="block text-emerald-50 text-xs mt-0.5">
              L’agent Master Soutien vous pose des questions une par une, puis prépare une fiche
              APC adaptée à votre classe. Le mode local fonctionne sans internet.
            </span>
          </span>
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <p className="text-amber-900 text-sm font-semibold">Trois modes distincts : canevas hors ligne, LLM sur appareil, ou fournisseur en ligne</p>
          <p className="text-amber-800 text-xs leading-relaxed">Le PDF, le DOCX ou l’image et l’OCR sont traités localement. Le moteur à canevas reste disponible sans téléchargement; Qwen3 peut aussi analyser le texte sur cet appareil après un téléchargement initial prévu sous 1 Go selon les variantes quantifiées relevées. En mode Qwen, la fiche et les prompts ne sont pas envoyés au cloud; la génération fonctionne hors ligne une fois le modèle en cache. Le petit modèle peut être plus lent ou moins fiable que les meilleurs modèles en ligne. Mistral n’est pas proposé pour générer des fiches dans ce module. Un fournisseur distant est séparé : aucun envoi n’a lieu avant une confirmation dédiée à cette fiche. N’incluez pas de données personnelles d’élève. Les clés des fournisseurs restent côté serveur.</p>
        </div>

        <AIOnlineAccessPanel
          settings={settings}
          onSettingsChange={updateSettings}
          onProvidersChange={setGatewayProviders}
          onSessionChange={setGatewaySession}
          excludedProviders={LESSON_EXCLUDED_PROVIDERS}
        />

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-600" /> IA MSP — créer une fiche depuis votre modèle</h2>
          <p className="text-xs text-gray-600">Parcours rapide : joignez une fiche de référence et saisissez le nouveau titre. Classe, matière et durée peuvent être déduites de la fiche; les précisions ci-dessous sont facultatives.</p>
          <label className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-4 flex items-center gap-3 cursor-pointer">
            <ImageUp className="w-6 h-6 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-emerald-900 text-sm">Fiche de référence — modèle + exemple</p>
              <p className="text-emerald-700 text-xs">PDF (texte ou scan), DOCX, JPG, PNG ou WEBP · 15 Mo maximum</p>
              {modelFileName && <p className="mt-1 truncate text-xs font-semibold text-emerald-800">{modelFileName}</p>}
              {referenceStatus && <p className="mt-1 text-xs text-emerald-700" role="status">{referenceStatus}</p>}
            </div>
            <input type="file" accept=".docx,.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e => { void handleModelFile(e.target.files?.[0]); e.target.value = ''; }} className="hidden" />
          </label>
          {modelFileName && <button type="button" onClick={clearReference} disabled={readingReference} className="text-xs font-semibold text-red-700 underline disabled:opacity-50">Retirer la fiche de référence</button>}
          <Input label="Titre exact de la nouvelle leçon *" value={theme} onChange={value => { setTheme(value); setResult(null); setDraft(null); }} placeholder="Saisissez le titre à traiter" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Production</label>
              <select value={generationKind} onChange={e => setGenerationKind(e.target.value as GenerationKind)} className="w-full p-3 border border-gray-300 rounded-lg text-sm">
                <option value="fiche">Fiche de préparation</option>
                <option value="exercices">Exercices + corrigés</option>
                <option value="cours_en_ligne">Cours à mettre en ligne</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Norme pédagogique</label>
              <select value={standard} onChange={e => setStandard(e.target.value as PedagogicalStandard)} className="w-full p-3 border border-gray-300 rounded-lg text-sm">
                <option value="FICHE_REFERENCE">Fiche fournie uniquement (aucun référentiel présumé)</option>
                <option value="APC_BENIN">APC Bénin</option>
                <option value="PPO">PPO</option>
                <option value="COMPETENCE">Approche compétences</option>
                <option value="DIFFERENCIATION">Différenciation</option>
                <option value="BLOOM">Taxonomie de Bloom</option>
                <option value="UNIVERSAL_DESIGN">Inclusion / CUA</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Niveau (facultatif si présent dans la fiche)" value={niveau} onChange={setNiveau} placeholder="Ex. CE1" />
            <Input label="Matière (facultatif si présente dans la fiche)" value={matiere} onChange={setMatiere} placeholder="Ex. Mathématiques" />
          </div>
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Suggestions pour « {matiere} » :
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTheme(s)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input label="Durée (facultatif si présente dans la fiche)" value={duree} onChange={setDuree} placeholder="Ex. 45 min" />
            <Input label="Objectif souhaité (facultatif)" value={objectif} onChange={setObjectif} />
          </div>
          <Area label="Consignes complémentaires (facultatif)" value={consignes} onChange={setConsignes} />
          <div className={`grid gap-2 ${generationKind === 'exercices' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {generationKind === 'exercices' && <button onClick={copyExercisesPrompt} className="bg-amber-50 text-amber-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm"><Clipboard className="w-5 h-5" /> Prompt Magic 2</button>}
            <button onClick={copyPrompt} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Clipboard className="w-5 h-5" /> Copier prompt</button>
            <button onClick={handleGenerate} disabled={generating || readingReference} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Wand2 className="w-5 h-5" /> {readingReference ? 'Lecture de la fiche…' : generating ? 'Génération…' : 'Générer'}</button>
          </div>
        </div>

        {result && draft && (
          <div id="resultat-fiche" className="bg-white rounded-xl shadow p-4 scroll-mt-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Fiche générée</h2>
              <div className="flex items-center gap-2">
                {editing
                  ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">✏️ Édition</span>
                  : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">À relire</span>}
                <button
                  onClick={() => setEditing(!editing)}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-600 flex items-center gap-1"
                >
                  {editing ? <><Eye className="w-3.5 h-3.5" /> Aperçu</> : <><Pencil className="w-3.5 h-3.5" /> Modifier</>}
                </button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <EditInput label="Titre" value={draft.titre} onChange={v => updateDraft({ titre: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <EditInput label="Classe" value={draft.classe} onChange={v => updateDraft({ classe: v })} />
                  <EditInput label="Matière" value={draft.matiere} onChange={v => updateDraft({ matiere: v })} />
                </div>
                <EditInput label="Domaine" value={draft.domaine} onChange={v => updateDraft({ domaine: v })} />
                <EditInput label="Durée" value={draft.duree} onChange={v => updateDraft({ duree: v })} />
                {draft.rubriques?.length ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-emerald-800">Rubriques reprises de la fiche de référence — modifiez les titres et contenus avant export.</p>
                    {draft.rubriques.map((section, index) => (
                      <div key={index} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                        <EditInput label={`Rubrique ${index + 1}`} value={section.titre} onChange={value => updateRubrique(index, { titre: value })} />
                        <EditArea label="Contenu" value={section.contenu} onChange={value => updateRubrique(index, { contenu: value })} rows={5} big />
                        <button type="button" onClick={() => removeRubrique(index)} className="text-xs font-semibold text-red-700 underline">Supprimer cette rubrique</button>
                      </div>
                    ))}
                    <button type="button" onClick={addRubrique} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">+ Ajouter une rubrique</button>
                  </div>
                ) : (
                  <>
                    <EditArea label="Compétence" value={draft.competence} onChange={v => updateDraft({ competence: v })} rows={3} />
                    <EditArea label="Objectif" value={draft.objectif} onChange={v => updateDraft({ objectif: v })} rows={2} />
                    <EditArea label="Matériel" value={draft.materiel} onChange={v => updateDraft({ materiel: v })} rows={2} />
                    <EditArea label="Déroulement" value={draft.deroulement} onChange={v => updateDraft({ deroulement: v })} rows={10} big />
                    <EditArea label="Évaluation" value={draft.evaluation} onChange={v => updateDraft({ evaluation: v })} rows={6} />
                  </>
                )}
                <p className="text-xs text-gray-500">Le texte généré peut contenir des erreurs. Vérifiez les contenus, les objectifs, les durées et les consignes; vos corrections sont reprises dans les exports.</p>
              </div>
            ) : (
              <>
                <Preview label="Titre" value={draft.titre} />
                {draft.rubriques?.length ? draft.rubriques.map((section, index) => (
                  <Preview key={index} label={section.titre} value={section.contenu} big />
                )) : (
                  <>
                    <Preview label="Compétence" value={draft.competence} />
                    <Preview label="Objectif" value={draft.objectif} />
                    <Preview label="Matériel" value={draft.materiel} />
                    <Preview label="Déroulement" value={draft.deroulement} big />
                    <Preview label="Évaluation" value={draft.evaluation} />
                  </>
                )}
              </>
            )}
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">Brouillon IA — validation de l’enseignant requise</p>
              <p className="mt-1">Contrôlez notamment l’exactitude des contenus, l’adaptation à la classe, la cohérence objectif–activités–évaluation et les durées. L’IA ne garantit pas l’absence d’erreurs.</p>
              {draft.pointsAControler?.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{draft.pointsAControler.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={saveFiche} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Enregistrer le brouillon</button>
              <button onClick={() => downloadFichePdf(draft)} className="bg-[#006b4f] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Printer className="w-5 h-5" /> Télécharger PDF</button>
            </div>
            <button onClick={() => downloadFicheDocx(draft)} className="w-full mt-2 bg-white border border-emerald-300 text-emerald-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" /> Télécharger Word (.docx)</button>
            <button onClick={() => printFiche(draft)} className="w-full mt-2 text-sm font-semibold text-slate-600 underline">Ouvrir l’aperçu d’impression</button>
          </div>
        )}
      </main>
      {showRemoteConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="ia-consent-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="ia-consent-title" className="text-lg font-black text-slate-900">Confirmer l’envoi de cette fiche</h2>
            <p className="mt-2 text-sm text-slate-700">Après votre accord, la passerelle sécurisée MSP transmettra la demande à <strong>{PROVIDER_LABELS[settings.provider]}</strong>. Le texte extrait et les données indiquées ci-dessous transitent par le serveur MSP; la clé fournisseur reste côté serveur.</p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-bold">Données transmises pour cette génération :</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>le titre « {theme.trim()} » et les précisions saisies (niveau, matière, durée, objectif);</li>
                <li>le texte extrait de la fiche de référence{modelText ? ` (jusqu’à ${Math.min(modelText.length, 18000).toLocaleString('fr-FR')} caractères du texte extrait)` : ' (aucun texte extrait)'};</li>
                {image && ['gemini', 'openai', 'anthropic'].includes(settings.provider) && <li>une image de référence redimensionnée, en plus du texte OCR.</li>}
              </ul>
              {modelText && <div className="mt-3">
                <p className="text-xs font-bold">Texte OCR exact transmis (jusqu’à 18 000 caractères) :</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2 text-xs">{modelText.slice(0, 18000)}</pre>
              </div>}
              {image && ['gemini', 'openai', 'anthropic'].includes(settings.provider) && (
                <div className="mt-3"><p className="mb-1 text-xs font-bold">Aperçu de l’image redimensionnée transmise :</p>
                  <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Aperçu de la fiche de référence envoyée" className="max-h-40 max-w-full rounded-lg border border-slate-200 object-contain" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-amber-800">Le fournisseur applique sa propre politique de conservation et de traitement; le propriétaire de MSP règle les appels API. N’envoyez pas de noms ou données personnelles d’élèves. « Annuler » n’envoie aucune donnée.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowRemoteConsent(false)} className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700">Annuler</button>
              <button type="button" onClick={confirmRemoteGeneration} className="rounded-xl bg-emerald-700 px-3 py-3 text-sm font-bold text-white">J’autorise cet envoi</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border border-gray-300 rounded-lg text-sm" />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none" />
    </div>
  );
}

function EditInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full p-2.5 border-2 border-amber-200 bg-amber-50/50 rounded-lg text-sm focus:border-amber-400 focus:outline-none" />
    </div>
  );
}

function EditArea({ label, value, onChange, rows = 4, big }: { label: string; value: string; onChange: (v: string) => void; rows?: number; big?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className={`w-full p-2.5 border-2 border-amber-200 bg-amber-50/50 rounded-lg focus:border-amber-400 focus:outline-none ${big ? 'font-mono text-xs leading-relaxed' : 'text-sm'}`} />
    </div>
  );
}

function Preview({ label, value, big }: { label: string; value: string; big?: boolean }) {
  // Met en évidence les lignes de phase (commençant par • ou MODULE/EXERCICE)
  const lines = (value || '-').split('\n');
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <div className={`${big ? 'text-sm' : 'text-sm'} text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3`}>
        {lines.map((line, i) => {
          const isPhase = /^•/.test(line) || /^(MODULE|EXERCICE)\b/i.test(line) || /^(— )/.test(line);
          const isSub = /^   —/.test(line) || /^(Remédiation|Corrigé|Barème|Critères|Évaluation|Quiz|Devoir)/i.test(line);
          return (
            <p key={i} className={isPhase ? 'font-bold text-gray-900 mt-1' : isSub ? 'text-gray-500' : ''}>
              {line || '\u00A0'}
            </p>
          );
        })}
      </div>
    </div>
  );
}
