import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { Bot, BookOpen, ChevronLeft, Clock, Download, ImageIcon, Lock, MessageCircle, Plus, PlayCircle, Sparkles, X } from 'lucide-react';
import { openWhatsApp } from '../utils/contact';
import { CourseLesson, CourseOffer, getYouTubeEmbed, loadCourses, mergeCourses, saveCourses } from '../utils/courseMarketplace';
import { getProgrammeCourses } from '../utils/programmeData';
import { ConceptAIProvider, ConceptExplanation, explainConceptWithAI, getProviderLabel } from '../utils/aiConceptExplainer';
import { getAIGatewaySession } from '../utils/aiGateway';
import PaywallPanel from './PaywallPanel';
import { FREE_PREVIEW_LESSONS, isUnlocked } from '../utils/coursePayment';

function emptyCourse(): CourseOffer {
  return {
    id: '', title: '', author: '', level: '', description: '', price: '0', type: 'gratuit', link: '',
    lessons: [{ title: 'Leçon 1', content: '', videoUrl: '' }], status: 'pending', createdAt: Date.now(),
  };
}

export default function CourseMarketplaceScreen() {
  const goBack = useSmartBack();
  const [courses, setCourses] = useState<CourseOffer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CourseOffer>(emptyCourse());
  const [viewer, setViewer] = useState<CourseOffer | null>(null);

  useEffect(() => setCourses(loadCourses()), []);

  // v34 : mergeCourses applique les MODIFICATIONS enregistrées aux cours du programme
  const visibleCourses = useMemo(
    () => mergeCourses(getProgrammeCourses() as CourseOffer[], courses.filter(c => c.status === 'approved')),
    [courses],
  );
  const pendingCount = courses.filter(c => c.status === 'pending').length;

  function persist(next: CourseOffer[]) { setCourses(next); saveCourses(next); }

  function saveCourse() {
    if (!form.title.trim()) return alert('Ajoutez un titre.');
    const item = { ...form, id: `course-${Date.now()}`, status: 'pending' as const, createdAt: Date.now() };
    persist([item, ...courses]);
    setForm(emptyCourse());
    setShowForm(false);
    alert('Cours proposé. Il sera visible après approbation par un administrateur.');
  }

  function updateLesson(index: number, patch: Partial<CourseLesson>) {
    setForm({ ...form, lessons: form.lessons.map((lesson, i) => i === index ? { ...lesson, ...patch } : lesson) });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Plateforme de cours</h1><p className="text-emerald-100 text-sm">Module Cours — cours gratuits ou payants proposés par la communauté</p></div>
        </div>
      </header>
      <main className="p-4 pb-24 max-w-5xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="font-black text-gray-900">Proposer ou suivre un cours</h2>
          <p className="text-gray-500 text-sm mt-1">Les cours sont suivis directement dans l’application. Toute proposition d’utilisateur doit être approuvée par l’administration avant publication.</p>
          {pendingCount > 0 && <p className="mt-2 bg-amber-50 text-amber-700 text-sm rounded-lg p-2"><Clock className="w-4 h-4 inline mr-1" /> {pendingCount} cours en attente d’approbation.</p>}
          <button onClick={() => setShowForm(true)} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold"><Plus className="w-5 h-5 inline mr-1" /> Proposer un cours</button>
        </section>

        {visibleCourses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Aucun cours approuvé pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCourses.map(course => (
              <article key={course.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-9 h-9 text-emerald-600" />
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900">{course.title}</h3>
                    <p className="text-gray-500 text-sm">{course.author || 'Auteur non précisé'} • {course.level}</p>
                    <span className={`inline-block mt-2 rounded px-2 py-1 text-xs font-bold ${course.type === 'gratuit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{course.type === 'gratuit' ? 'Gratuit' : `${course.price} FCFA`}</span>
                    <p className="text-gray-600 text-sm mt-2">{course.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => setViewer(course)} className="bg-emerald-600 text-white py-2 rounded-lg font-semibold">{course.type === 'payant' && !isUnlocked(course.id) ? <><Lock className="w-4 h-4 inline mr-1" /> Voir l’extrait</> : <><PlayCircle className="w-4 h-4 inline mr-1" /> Suivre</>}</button>
                  <button onClick={() => openWhatsApp(`Bonjour, je suis intéressé par le cours : ${course.title}`)} className="bg-green-50 text-green-700 py-2 rounded-lg font-semibold"><MessageCircle className="w-4 h-4 inline mr-1" /> Contact</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {viewer && <CourseViewer course={viewer} onClose={() => setViewer(null)} />}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg">Proposer un cours</h2><button onClick={() => setShowForm(false)}><X className="w-6 h-6" /></button></div>
            <div className="space-y-2">
              <Input label="Titre" value={form.title} onChange={v => setForm({ ...form, title: v })} />
              <div className="grid grid-cols-2 gap-2"><Input label="Auteur / Organisateur" value={form.author} onChange={v => setForm({ ...form, author: v })} /><Input label="Niveau" value={form.level} onChange={v => setForm({ ...form, level: v })} /></div>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description du cours" rows={3} className="w-full p-3 border rounded-lg text-sm" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CourseOffer['type'] })} className="w-full p-3 border rounded-lg"><option value="gratuit">Gratuit</option><option value="payant">Payant</option></select>
              {form.type === 'payant' && <Input label="Prix FCFA" value={form.price} onChange={v => setForm({ ...form, price: v })} />}
              <Input label="Lien/contact (facultatif)" value={form.link} onChange={v => setForm({ ...form, link: v })} />
              <h3 className="font-bold text-gray-800 pt-2">Leçons du cours</h3>
              {form.lessons.map((lesson, index) => (
                <div key={index} className="border rounded-xl p-3 space-y-2">
                  <Input label={`Titre leçon ${index + 1}`} value={lesson.title} onChange={v => updateLesson(index, { title: v })} />
                  <textarea value={lesson.content} onChange={e => updateLesson(index, { content: e.target.value })} placeholder="Contenu de la leçon" rows={4} className="w-full p-3 border rounded-lg text-sm" />
                  <Input label="Lien vidéo YouTube (facultatif)" value={lesson.videoUrl || ''} onChange={v => updateLesson(index, { videoUrl: v })} />
                </div>
              ))}
              <button onClick={() => setForm({ ...form, lessons: [...form.lessons, { title: `Leçon ${form.lessons.length + 1}`, content: '', videoUrl: '' }] })} className="w-full bg-gray-100 py-2 rounded-lg font-semibold"><Plus className="w-4 h-4 inline mr-1" /> Ajouter une leçon</button>
              <div className="grid grid-cols-2 gap-2"><button onClick={() => setShowForm(false)} className="bg-gray-100 py-3 rounded-lg font-semibold">Annuler</button><button onClick={saveCourse} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold">Soumettre</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseViewer({ course, onClose }: { course: CourseOffer; onClose: () => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  // v38 — accès payant : seul un extrait est lisible tant que le cours n'est
  // pas déverrouillé par le Super Administrateur après paiement.
  const [unlocked, setUnlocked] = useState(() => course.type === 'gratuit' || isUnlocked(course.id));
  const lessonLocked = !unlocked && lessonIndex >= FREE_PREVIEW_LESSONS;
  const [provider, setProvider] = useState<ConceptAIProvider>('local');
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const lesson = course.lessons[lessonIndex] || course.lessons[0];
  const embed = lesson?.videoUrl ? getYouTubeEmbed(lesson.videoUrl) : '';

  useEffect(() => {
    setExplanation(null);
  }, [lessonIndex]);

  async function askAI() {
    if (!lesson) return;
    const input = {
      notion: lesson.title.replace(/^À retenir\s*:\s*/i, ''),
      discipline: course.description,
      level: course.level,
      currentContent: lesson.content,
    };
    if (provider !== 'local') {
      try {
        const session = await getAIGatewaySession();
        if (!session) {
          alert('Connectez-vous avec votre code IA sécurisé dans « Assistant IA multi-modèles », puis revenez à cette explication.');
          return;
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'La passerelle IA en ligne est indisponible.');
        return;
      }
      const allowed = window.confirm(`Envoyer ces données à ${getProviderLabel(provider)} pour cette explication ?\n\nNotion : ${input.notion}\nDiscipline/contexte : ${input.discipline || 'non précisé'}\nNiveau : ${input.level || 'non précisé'}\nContenu transmis (jusqu’à 5 000 caractères) :\n${input.currentContent.slice(0, 5000) || 'aucun contenu'}\n\nLa passerelle MSP ajoute son instruction pédagogique. Annuler n’envoie rien. Ne transmettez pas de données personnelles d’élèves.`);
      if (!allowed) return;
    }
    setExplaining(true);
    try {
      const result = await explainConceptWithAI(provider, input, { allowExternal: provider !== 'local' });
      setExplanation(result);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Impossible de générer une explication pour le moment.');
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between"><div><p className="font-black text-gray-900">{course.title}</p><p className="text-xs text-gray-500">Cours dispensé dans l’application</p></div><button onClick={onClose}><X className="w-6 h-6" /></button></div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] overflow-hidden">
          <aside className="border-r bg-gray-50 p-3 overflow-auto">
            {!unlocked && (
              <p className="mb-2 rounded-lg bg-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-800">
                Extrait gratuit — {course.price} FCFA pour tout le cours
              </p>
            )}
            {course.lessons.map((l, i) => {
              const locked = !unlocked && i >= FREE_PREVIEW_LESSONS;
              return (
                <button key={i} onClick={() => setLessonIndex(i)} className={`w-full text-left p-3 rounded-lg mb-2 text-sm font-semibold flex items-center gap-2 ${lessonIndex === i ? 'bg-emerald-600 text-white' : locked ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700'}`}>
                  <span className="flex-1 min-w-0">{i + 1}. {l.title}</span>
                  {locked && <Lock className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </aside>
          <main className="p-4 overflow-auto">
            {lessonLocked ? (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-3">{lesson?.title}</h2>
                <p className="text-gray-500 mb-4 text-sm">
                  Cette leçon fait partie du contenu complet du cours.
                </p>
                <PaywallPanel
                  contentId={course.id}
                  kind="cours"
                  title={course.title}
                  price={course.price}
                  onUnlocked={() => setUnlocked(true)}
                />
              </>
            ) : (
            <>
            {lesson?.imageUrl && <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-56 object-cover rounded-xl mb-4 bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
            {embed && <iframe src={embed} title={lesson.title} className="w-full aspect-video rounded-xl mb-4" allowFullScreen />}
            <h2 className="text-2xl font-black text-gray-900 mb-3">{lesson?.title}</h2>
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{lesson?.content}</p>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <Bot className="mt-1 h-7 w-7 text-emerald-700" />
                <div className="flex-1">
                  <h3 className="font-black text-emerald-900">Demander une explication IA sur cette notion</h3>
                  <p className="text-sm text-emerald-800 mt-1">Choisissez un modèle IA configuré sur le serveur. Pour un fournisseur en ligne, la demande n’est envoyée qu’après confirmation; les images et vidéos illustratives restent séparées de la réponse du modèle.</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <select value={provider} onChange={e => setProvider(e.target.value as ConceptAIProvider)} className="rounded-lg border border-emerald-200 bg-white p-3 text-sm">
                      <option value="local">Assistant intégré hors ligne</option>
                      <option value="openai">OpenAI / ChatGPT</option>
                      <option value="anthropic">Anthropic / Claude</option>
                      <option value="mistral">Mistral AI</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="copilot">Azure OpenAI</option>
                    </select>
                    <button onClick={askAI} disabled={explaining} className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" /> {explaining ? 'Analyse...' : 'Expliquer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {explanation && (
              <div className="mt-4 rounded-2xl bg-white border shadow p-4">
                <p className="text-xs font-bold uppercase text-emerald-700">Réponse : {getProviderLabel(explanation.provider)}</p>
                <h3 className="text-xl font-black text-gray-900 mt-1">{explanation.title}</h3>
                <img src={explanation.imageUrl} alt={explanation.title} className="mt-3 h-56 w-full rounded-xl object-cover bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                <p className="mt-3 whitespace-pre-wrap text-gray-700 leading-relaxed">{explanation.text}</p>
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="font-bold text-amber-900">Résumé simple</p>
                  <p className="text-sm text-amber-800 mt-1">{explanation.simpleSummary}</p>
                </div>
                <div className="mt-4 grid gap-3">
                  {explanation.videoUrls.map((url, index) => {
                    const videoEmbed = getYouTubeEmbed(url);
                    return videoEmbed ? <iframe key={index} src={videoEmbed} title={`Vidéo ${index + 1}`} className="w-full aspect-video rounded-xl bg-black" allowFullScreen /> : null;
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-400 flex items-center gap-1"><ImageIcon className="h-4 w-4" /> Les images et vidéos nécessitent une connexion internet.</p>
              </div>
            )}
            {unlocked && (course as any).pdfUrl && (
              <a href={(course as any).pdfUrl} download className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white">
                <Download className="w-5 h-5" /> Télécharger le PDF du cours
              </a>
            )}
            </>
            )}
            <div className="mt-6 flex justify-between"><button disabled={lessonIndex === 0} onClick={() => setLessonIndex(i => i - 1)} className="bg-gray-100 px-4 py-2 rounded-lg disabled:opacity-40">Précédent</button><button disabled={lessonIndex === course.lessons.length - 1} onClick={() => setLessonIndex(i => i + 1)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-40">Suivant</button></div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border rounded-lg text-sm" /></div>;
}
