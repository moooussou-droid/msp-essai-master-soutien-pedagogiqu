/**
 * PLATEFORME MOOC — STUDIO CRÉATEUR (v62).
 *
 * Espace où un créateur de formation compose un cours : informations générales,
 * objectifs, puis modules et leçons (vidéo YouTube / texte / quiz). Le cours
 * peut être enregistré comme brouillon puis PUBLIÉ pour apparaître dans le
 * catalogue des enseignants.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Plus, Trash2, Save, Eye, EyeOff, GripVertical, PlayCircle,
  FileText, HelpCircle, Pencil, LayoutGrid,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { getProfile } from '../utils/userProfile';
import {
  MoocCourse, MoocModule, MoocLesson, QuizQuestion, LessonType, PricingModel,
  MOOC_CATEGORIES, MOOC_LEVELS,
  loadCourses, upsertCourse, deleteCourse, emptyCourse, moocId, totalLessons,
} from '../utils/mooc';
import { isValidYouTube } from '../utils/mediatheque';

const COLORS = ['emerald', 'blue', 'amber', 'purple', 'rose', 'indigo'];
const EMOJIS = ['🎓', '🧭', '🧑‍🏫', '💻', '📚', '🔬', '🧮', '🌍', '🎨', '✍️', '🗣️', '⭐'];

export default function MoocCreatorScreen() {
  const goBack = useSmartBack();
  const [courses, setCourses] = useState<MoocCourse[]>(() => loadCourses());
  const [editing, setEditing] = useState<MoocCourse | null>(null);

  function refresh() { setCourses(loadCourses()); }

  if (editing) {
    return <CourseEditor course={editing} onClose={() => { setEditing(null); refresh(); }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 sticky top-0 z-10 shadow flex items-center gap-3">
        <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-lg font-black flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Studio créateur</h1>
          <p className="text-white/80 text-xs">Créez et publiez vos formations pour les enseignants</p>
        </div>
        <Link to="/formations" className="bg-white/20 rounded-lg px-3 py-2 text-sm font-semibold">Catalogue</Link>
      </header>

      <div className="p-4 space-y-4">
        <button
          onClick={() => {
            const c = emptyCourse();
            const prof = getProfile();
            c.instructorName = prof.teacherName || '';
            setEditing(c);
          }}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Créer une nouvelle formation
        </button>

        {courses.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">Aucune formation. Créez la première !</p>
        )}

        {courses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="text-3xl">{c.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 truncate">{c.title || 'Sans titre'}</p>
              <p className="text-xs text-gray-500">{c.modules.length} module(s) · {totalLessons(c)} leçon(s)</p>
              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${c.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {c.published ? 'Publiée' : 'Brouillon'}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setEditing(c)} className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button
                onClick={() => { if (confirm('Supprimer définitivement cette formation ?')) { deleteCourse(c.id); refresh(); } }}
                className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Éditeur de cours                                                    */
/* ================================================================== */
function CourseEditor({ course, onClose }: { course: MoocCourse; onClose: () => void }) {
  const [c, setC] = useState<MoocCourse>(() => JSON.parse(JSON.stringify(course)));
  const [objText, setObjText] = useState(c.objectives.join('\n'));

  function set<K extends keyof MoocCourse>(k: K, v: MoocCourse[K]) { setC((p) => ({ ...p, [k]: v })); }

  function save(publish?: boolean) {
    const clean: MoocCourse = {
      ...c,
      objectives: objText.split('\n').map((s) => s.trim()).filter(Boolean),
      published: publish !== undefined ? publish : c.published,
    };
    if (!clean.title.trim()) { alert('Donnez un titre à la formation.'); return; }
    if (publish && totalLessons(clean) === 0) { alert('Ajoutez au moins une leçon avant de publier.'); return; }
    upsertCourse(clean);
    onClose();
  }

  /* ---- modules ---- */
  function addModule() {
    set('modules', [...c.modules, { id: moocId('mod'), title: `Module ${c.modules.length + 1}`, lessons: [] }]);
  }
  function updateModule(mid: string, patch: Partial<MoocModule>) {
    set('modules', c.modules.map((m) => (m.id === mid ? { ...m, ...patch } : m)));
  }
  function removeModule(mid: string) { set('modules', c.modules.filter((m) => m.id !== mid)); }

  /* ---- leçons ---- */
  function addLesson(mid: string, type: LessonType) {
    const lesson: MoocLesson = {
      id: moocId('les'), title: 'Nouvelle leçon', type, durationMin: type === 'video' ? 10 : 6,
      ...(type === 'video' ? { youtubeUrl: '' } : {}),
      ...(type === 'text' ? { content: '' } : {}),
      ...(type === 'quiz' ? { quiz: [] } : {}),
    };
    updateModule(mid, { lessons: [...(c.modules.find((m) => m.id === mid)?.lessons ?? []), lesson] });
  }
  function updateLesson(mid: string, lid: string, patch: Partial<MoocLesson>) {
    const m = c.modules.find((x) => x.id === mid); if (!m) return;
    updateModule(mid, { lessons: m.lessons.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });
  }
  function removeLesson(mid: string, lid: string) {
    const m = c.modules.find((x) => x.id === mid); if (!m) return;
    updateModule(mid, { lessons: m.lessons.filter((l) => l.id !== lid) });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-indigo-600 text-white p-3 sticky top-0 z-10 shadow flex items-center gap-2">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <p className="flex-1 font-bold truncate">{c.title || 'Nouvelle formation'}</p>
        <span className={`text-[11px] px-2 py-1 rounded-full ${c.published ? 'bg-emerald-500' : 'bg-white/20'}`}>
          {c.published ? 'Publiée' : 'Brouillon'}
        </span>
      </header>

      <div className="p-4 space-y-5">
        {/* Infos générales */}
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-800">Informations générales</h2>
          <Field label="Titre *"><input value={c.title} onChange={(e) => set('title', e.target.value)} className={inp} placeholder="Ex. Enseigner avec l'APC" /></Field>
          <Field label="Sous-titre"><input value={c.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={inp} placeholder="Une phrase d'accroche" /></Field>
          <Field label="Description"><textarea value={c.description} onChange={(e) => set('description', e.target.value)} rows={4} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <select value={c.category} onChange={(e) => set('category', e.target.value)} className={inp}>
                {MOOC_CATEGORIES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Niveau">
              <select value={c.level} onChange={(e) => set('level', e.target.value)} className={inp}>
                {MOOC_LEVELS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
          </div>
          {/* Tarification */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Tarification</p>
            <div className="grid grid-cols-3 gap-2">
              {([['free', 'Gratuit'], ['paid', 'Payant'], ['partial', 'Partiel']] as [PricingModel, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('pricing', val)}
                  className={`py-2 rounded-lg text-sm font-semibold border ${c.pricing === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            {c.pricing !== 'free' && (
              <div className="mt-2">
                <Field label="Prix (FCFA)">
                  <input type="number" min={0} value={c.price}
                    onChange={(e) => set('price', parseInt(e.target.value, 10) || 0)} className={inp} placeholder="Ex. 1000" />
                </Field>
                <p className="text-[11px] text-gray-500 mt-1">
                  {c.pricing === 'partial'
                    ? 'Mode partiel : cochez « Aperçu gratuit » sur les leçons librement accessibles. Les autres nécessitent le paiement.'
                    : 'Mode payant : tout le cours est verrouillé, sauf les leçons cochées « Aperçu gratuit ». Le paiement débloque tout.'}
                </p>
              </div>
            )}
          </div>

          <Field label="Objectifs (un par ligne)">
            <textarea value={objText} onChange={(e) => setObjText(e.target.value)} rows={4} className={inp}
              placeholder={"Comprendre…\nRédiger…\nÉvaluer…"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Formateur"><input value={c.instructorName} onChange={(e) => set('instructorName', e.target.value)} className={inp} /></Field>
            <Field label="Bio du formateur"><input value={c.instructorBio} onChange={(e) => set('instructorBio', e.target.value)} className={inp} /></Field>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Emoji de couverture</p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => set('emoji', e)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border ${c.emoji === e ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Couleur d'accent</p>
            <div className="flex gap-2">
              {COLORS.map((col) => (
                <button key={col} onClick={() => set('color', col)}
                  className={`w-8 h-8 rounded-full bg-${col}-500 border-2 ${c.color === col ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: swatch(col) }} aria-label={col} />
              ))}
            </div>
          </div>
        </section>

        {/* Programme */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Programme</h2>
            <button onClick={addModule} className="text-indigo-600 text-sm font-semibold inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Module</button>
          </div>

          {c.modules.map((m, mi) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-xs font-bold text-gray-500">M{mi + 1}</span>
                <input value={m.title} onChange={(e) => updateModule(m.id, { title: e.target.value })}
                  className="flex-1 bg-transparent font-semibold text-gray-800 text-sm focus:outline-none" />
                <button onClick={() => removeModule(m.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="p-3 space-y-3">
                {m.lessons.map((l) => (
                  <LessonEditor key={l.id} lesson={l} showFreeToggle={c.pricing !== 'free'}
                    onChange={(patch) => updateLesson(m.id, l.id, patch)}
                    onRemove={() => removeLesson(m.id, l.id)} />
                ))}

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => addLesson(m.id, 'video')} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><PlayCircle className="w-4 h-4" /> Vidéo</button>
                  <button onClick={() => addLesson(m.id, 'text')} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><FileText className="w-4 h-4" /> Texte</button>
                  <button onClick={() => addLesson(m.id, 'quiz')} className="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><HelpCircle className="w-4 h-4" /> Quiz</button>
                </div>
              </div>
            </div>
          ))}

          {c.modules.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6 bg-white rounded-xl">Ajoutez un premier module pour composer votre programme.</p>
          )}
        </section>
      </div>

      {/* Barre d'action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 print:hidden">
        <button onClick={() => save(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
          <Save className="w-5 h-5" /> Brouillon
        </button>
        {c.published ? (
          <button onClick={() => save(false)} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
            <EyeOff className="w-5 h-5" /> Dépublier
          </button>
        ) : (
          <button onClick={() => save(true)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
            <Eye className="w-5 h-5" /> Publier
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Éditeur de leçon ---------------- */
function LessonEditor({ lesson, onChange, onRemove, showFreeToggle }: {
  lesson: MoocLesson; onChange: (patch: Partial<MoocLesson>) => void; onRemove: () => void; showFreeToggle?: boolean;
}) {
  const badYoutube = lesson.type === 'video' && !!lesson.youtubeUrl && !isValidYouTube(lesson.youtubeUrl);
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {lesson.type === 'video' && <PlayCircle className="w-4 h-4 text-red-500" />}
        {lesson.type === 'text' && <FileText className="w-4 h-4 text-blue-500" />}
        {lesson.type === 'quiz' && <HelpCircle className="w-4 h-4 text-amber-500" />}
        <input value={lesson.title} onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 text-sm font-medium focus:outline-none" placeholder="Titre de la leçon" />
        <input type="number" min={1} value={lesson.durationMin}
          onChange={(e) => onChange({ durationMin: parseInt(e.target.value, 10) || 1 })}
          className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 text-center" />
        <span className="text-[11px] text-gray-400">min</span>
        <button onClick={onRemove} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>

      {showFreeToggle && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={!!lesson.free} onChange={(e) => onChange({ free: e.target.checked })} />
          Aperçu gratuit (leçon accessible sans paiement)
        </label>
      )}

      {lesson.type === 'video' && (
        <>
          <input value={lesson.youtubeUrl || ''} onChange={(e) => onChange({ youtubeUrl: e.target.value })}
            className={`${inp} text-sm`} placeholder="Lien YouTube (https://youtu.be/… )" />
          {badYoutube && <p className="text-[11px] text-red-500">Lien YouTube non reconnu.</p>}
        </>
      )}
      {lesson.type === 'text' && (
        <textarea value={lesson.content || ''} onChange={(e) => onChange({ content: e.target.value })} rows={4}
          className={`${inp} text-sm`} placeholder="Contenu de la leçon…" />
      )}
      {lesson.type === 'quiz' && (
        <QuizEditor quiz={lesson.quiz || []} onChange={(quiz) => onChange({ quiz })} />
      )}
    </div>
  );
}

/* ---------------- Éditeur de quiz ---------------- */
function QuizEditor({ quiz, onChange }: { quiz: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }) {
  function addQ() {
    onChange([...quiz, { id: moocId('q'), question: '', options: ['', ''], correctIndex: 0 }]);
  }
  function updateQ(id: string, patch: Partial<QuizQuestion>) {
    onChange(quiz.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function removeQ(id: string) { onChange(quiz.filter((q) => q.id !== id)); }

  return (
    <div className="space-y-3 bg-amber-50/50 rounded-lg p-2">
      {quiz.map((q, qi) => (
        <div key={q.id} className="bg-white rounded-lg p-2 border border-amber-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600">Q{qi + 1}</span>
            <input value={q.question} onChange={(e) => updateQ(q.id, { question: e.target.value })}
              className="flex-1 text-sm focus:outline-none" placeholder="Question…" />
            <button onClick={() => removeQ(q.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" checked={q.correctIndex === oi} onChange={() => updateQ(q.id, { correctIndex: oi })}
                  title="Bonne réponse" />
                <input value={opt}
                  onChange={(e) => updateQ(q.id, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1" placeholder={`Réponse ${String.fromCharCode(65 + oi)}`} />
                {q.options.length > 2 && (
                  <button onClick={() => updateQ(q.id, { options: q.options.filter((_, i) => i !== oi), correctIndex: Math.min(q.correctIndex, q.options.length - 2) })}
                    className="p-1 text-gray-400"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
            {q.options.length < 5 && (
              <button onClick={() => updateQ(q.id, { options: [...q.options, ''] })} className="text-xs text-amber-600 font-semibold">+ Ajouter une réponse</button>
            )}
          </div>
          <input value={q.explanation || ''} onChange={(e) => updateQ(q.id, { explanation: e.target.value })}
            className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1" placeholder="Explication (facultatif)" />
        </div>
      ))}
      <button onClick={addQ} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Question</button>
    </div>
  );
}

/* ---------------- petits utilitaires UI ---------------- */
const inp = 'w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="text-xs font-semibold text-gray-600">{label}</span><div className="mt-1">{children}</div></label>);
}
function swatch(c: string): string {
  const map: Record<string, string> = { emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', purple: '#a855f7', rose: '#f43f5e', indigo: '#6366f1' };
  return map[c] || '#10b981';
}
