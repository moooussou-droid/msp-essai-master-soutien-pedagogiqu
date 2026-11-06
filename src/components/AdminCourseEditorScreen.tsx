import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ImageUp, Plus, Save, Trash2, X } from 'lucide-react';
import { CourseLesson, CourseOffer, applyCourseOverrides, getVideoEmbed, loadCourses, removeCourseOverride, saveCourseOverride, saveCourses } from '../utils/courseMarketplace';
import { getProgrammeCourses } from '../utils/programmeData';
import { hasAdminRole, isPrincipalAdminSession } from '../utils/adminSession';

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Image impossible à lire'));
    reader.readAsDataURL(file);
  });
}

export default function AdminCourseEditorScreen() {
  const navigate = useNavigate();
  const authorized = hasAdminRole('Super Administrateur', 'Responsable Ressources', 'Modérateur');
  const [customCourses, setCustomCourses] = useState<CourseOffer[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<CourseOffer | null>(null);

  useEffect(() => {
    const courses = loadCourses();
    setCustomCourses(courses);
  }, []);

  // Les cours intégrés s'affichent AVEC leurs modifications enregistrées (v34)
  const [overrideTick, setOverrideTick] = useState(0);
  const allCourses = useMemo(
    () => [...applyCourseOverrides(getProgrammeCourses() as CourseOffer[]), ...customCourses],
    [customCourses, overrideTick],
  );

  function selectCourse(id: string) {
    setSelectedId(id);
    const found = allCourses.find(c => c.id === id);
    setDraft(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function updateLesson(index: number, patch: Partial<CourseLesson>) {
    if (!draft) return;
    setDraft({ ...draft, lessons: draft.lessons.map((lesson, i) => i === index ? { ...lesson, ...patch } : lesson) });
  }

  async function setLessonImage(index: number, file?: File) {
    if (!file) return;
    try {
      const imageUrl = await readImage(file);
      updateLesson(index, { imageUrl });
    } catch {
      alert('Impossible de lire cette image.');
    }
  }

  function saveDraft() {
    if (!draft) return;
    const updated = { ...draft, status: 'approved' as const, updatedAt: Date.now() };
    const existing = customCourses.some(c => c.id === draft.id);

    if (existing) {
      // Cours personnalisé : mise à jour sur place (même identifiant)
      const next = customCourses.map(c => (c.id === draft.id ? updated : c));
      setCustomCourses(next);
      saveCourses(next);
    } else {
      // Cours du PROGRAMME INTÉGRÉ : on enregistre une surcharge portant le MÊME
      // identifiant, pour que la modification remplace réellement l'originale
      // (avant la v34, une copie était créée et l'ancienne version revenait).
      saveCourseOverride(updated);
      setOverrideTick(t => t + 1);
    }
    setDraft(updated);
    setSelectedId(updated.id);
    alert('Modification enregistrée : elle est immédiatement visible dans « Cours en ligne ».');
  }

  /** Rétablit la version d'origine d'un cours du programme intégré. */
  function resetDraft() {
    if (!draft) return;
    if (!confirm('Rétablir la version d’origine de ce cours ? Vos modifications seront perdues.')) return;
    removeCourseOverride(draft.id);
    setOverrideTick(t => t + 1);
    const original = (getProgrammeCourses() as CourseOffer[]).find(c => c.id === draft.id);
    setDraft(original ? JSON.parse(JSON.stringify(original)) : null);
  }

  if (!draft && allCourses.length > 0 && !selectedId) {
    // avoid setState in render loop by showing selection only
  }

  if (!authorized) return <Navigate to="/equipe" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(isPrincipalAdminSession() ? '/admin-dashboard' : '/equipe')} className="p-2 bg-white/10 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Éditeur de cours</h1><p className="text-slate-300 text-sm">Modifier les contenus, images et vidéos autorisés pour votre rôle</p></div>
        </div>
      </header>
      <main className="p-4 pb-24 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="bg-white rounded-2xl shadow p-4 h-fit">
          <h2 className="font-bold text-gray-900 mb-3">Cours disponibles</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {allCourses.map(course => <button key={course.id} onClick={() => selectCourse(course.id)} className={`w-full text-left p-3 rounded-lg text-sm ${selectedId === course.id ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-700'}`}><span className="font-bold block truncate">{course.title}</span><span className="text-xs opacity-80">{course.level}</span></button>)}
          </div>
        </aside>
        <section className="bg-white rounded-2xl shadow p-4">
          {!draft ? (
            <p className="text-gray-500 text-center py-20">Sélectionnez un cours à modifier.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Titre du cours" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} />
                <Input label="Niveau" value={draft.level} onChange={v => setDraft({ ...draft, level: v })} />
                <Input label="Auteur" value={draft.author} onChange={v => setDraft({ ...draft, author: v })} />
                <Input label="Prix" value={draft.price} onChange={v => setDraft({ ...draft, price: v })} />
              </div>
              <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={3} className="w-full p-3 border rounded-lg text-sm" placeholder="Description" />
              <h2 className="font-bold text-gray-900">Leçons</h2>
              {draft.lessons.map((lesson, index) => (
                <div key={index} className="border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between"><p className="font-bold text-gray-800">Leçon {index + 1}</p><button onClick={() => setDraft({ ...draft, lessons: draft.lessons.filter((_, i) => i !== index) })} className="text-red-500"><Trash2 className="w-5 h-5" /></button></div>
                  <Input label="Titre" value={lesson.title} onChange={v => updateLesson(index, { title: v })} />
                  <textarea value={lesson.content} onChange={e => updateLesson(index, { content: e.target.value })} rows={8} className="w-full p-3 border rounded-lg text-sm" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Lien image (URL)" value={lesson.imageUrl || ''} onChange={v => updateLesson(index, { imageUrl: v })} />
                    <Input label="Vidéo YouTube / Facebook / TikTok" value={lesson.videoUrl || ''} onChange={v => updateLesson(index, { videoUrl: v })} />
                  </div>
                  <label className="border border-dashed rounded-lg p-3 flex items-center gap-2 cursor-pointer text-sm text-gray-600"><ImageUp className="w-5 h-5" /> Ajouter une image depuis l’appareil<input type="file" accept="image/*" onChange={e => setLessonImage(index, e.target.files?.[0])} className="hidden" /></label>
                  {lesson.imageUrl && <img src={lesson.imageUrl} alt="Aperçu" className="w-full h-40 object-cover rounded-lg" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                  {lesson.videoUrl && getVideoEmbed(lesson.videoUrl) && <iframe src={getVideoEmbed(lesson.videoUrl)} title={lesson.title} className="w-full aspect-video rounded-lg" allowFullScreen />}
                </div>
              ))}
              <button onClick={() => setDraft({ ...draft, lessons: [...draft.lessons, { title: `Leçon ${draft.lessons.length + 1}`, content: '', imageUrl: '', videoUrl: '' }] })} className="w-full bg-gray-100 py-3 rounded-xl font-semibold"><Plus className="w-5 h-5 inline mr-1" /> Ajouter une leçon</button>
              <div className="grid grid-cols-2 gap-2"><button onClick={() => setDraft(null)} className="bg-gray-100 py-3 rounded-xl font-semibold"><X className="w-5 h-5 inline mr-1" /> Annuler</button><button onClick={saveDraft} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold"><Save className="w-5 h-5 inline mr-1" /> Enregistrer</button></div>
              <button onClick={resetDraft} className="mt-2 w-full bg-amber-50 text-amber-700 py-2.5 rounded-xl font-semibold text-sm">Rétablir la version d’origine</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 border rounded-lg text-sm" /></div>;
}
