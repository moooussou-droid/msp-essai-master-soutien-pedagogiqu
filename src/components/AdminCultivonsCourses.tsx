import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  ADMIN_RUBRICS, AdminRubricId, CultivonsCourse, adminRubricLabel,
  getCultivonsStats, loadCultivonsCourses, saveCultivonsCourses,
} from '../utils/cultivonsCourses';

/**
 * Gestion administrateur des cours « Cultivons-nous » (v25) :
 *   - 4 rubriques : Pédagogie Générale, Législation de l'Administration
 *     Scolaire, Morale Professionnelle, Épreuves et Corrigés ;
 *   - chaque cours précise son AUTEUR et peut être GRATUIT ou PAYANT ;
 *   - le NOMBRE DE VISITEURS de chaque cours est affiché (statistiques).
 */
export default function AdminCultivonsCourses() {
  const [courses, setCourses] = useState<CultivonsCourse[]>([]);
  const [draft, setDraft] = useState<CultivonsCourse | null>(null);
  const [rubricFilter, setRubricFilter] = useState<AdminRubricId | 'all'>('all');

  useEffect(() => setCourses(loadCultivonsCourses()), []);

  const stats = useMemo(() => getCultivonsStats(courses), [courses]);
  const visible = rubricFilter === 'all' ? courses : courses.filter((c) => c.rubric === rubricFilter);

  function persist(next: CultivonsCourse[]) {
    setCourses(next);
    saveCultivonsCourses(next);
  }

  function newDraft() {
    setDraft({
      id: `cultivons-${Date.now()}`,
      rubric: 'pedagogie',
      title: '',
      author: '',
      content: '',
      free: true,
      price: 0,
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) return alert('Indiquez le titre du cours.');
    if (!draft.author.trim()) return alert('Indiquez le nom de l\'auteur du cours.');
    if (!draft.content.trim()) return alert('Rédigez le contenu du cours.');
    const existing = courses.some((c) => c.id === draft.id);
    const item = { ...draft, updatedAt: Date.now() };
    persist(existing ? courses.map((c) => (c.id === draft.id ? item : c)) : [item, ...courses]);
    setDraft(null);
    alert('Cours enregistré. Il est immédiatement visible dans « Cours → Cultivons-nous ».');
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-1">Cours des administrateurs (Cultivons-nous)</h2>
            <p className="text-gray-500 text-sm">
              Rubriques : Pédagogie Générale · Législation de l’Administration Scolaire · Morale Professionnelle · Épreuves et Corrigés.
              Le <strong>nombre de visiteurs</strong> de chaque cours est affiché ci-dessous.
            </p>
          </div>
          <button onClick={newDraft} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold inline-flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> Nouveau cours
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-xl font-extrabold text-gray-800">{courses.length}</p>
            <p className="text-[11px] text-gray-500">Cours publiés</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 text-center">
            <p className="text-xl font-extrabold text-indigo-700">{stats.totalViews}</p>
            <p className="text-[11px] text-gray-500">Visites totales</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-xl font-extrabold text-emerald-700">{courses.filter((c) => c.free).length}/{courses.length}</p>
            <p className="text-[11px] text-gray-500">Gratuits</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
          <button onClick={() => setRubricFilter('all')}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${rubricFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Toutes
          </button>
          {ADMIN_RUBRICS.map((r) => (
            <button key={r.id} onClick={() => setRubricFilter(r.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${rubricFilter === r.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">
          Aucun cours dans cette rubrique. Cliquez sur « Nouveau cours » pour en créer un.
        </div>
      )}

      {visible.map((course) => (
        <div key={course.id} className="bg-white rounded-xl shadow p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase text-indigo-600">{adminRubricLabel(course.rubric)}</p>
              <p className="font-bold text-gray-900">{course.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">✍️ Auteur : {course.author}</p>
              <span className={`inline-block mt-2 rounded-lg px-2 py-1 text-xs font-bold ${course.free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {course.free ? 'Gratuit' : `${(course.price ?? 0).toLocaleString('fr-FR')} FCFA`}
              </span>
            </div>
            <div className="text-center shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2">
              <div className="flex items-center gap-1 text-indigo-700 font-extrabold text-lg justify-center">
                <Eye className="w-4 h-4" /> {course.views ?? 0}
              </div>
              <p className="text-[10px] text-gray-500">visiteurs</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => setDraft({ ...course })}
              className="bg-indigo-50 text-indigo-700 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 text-sm">
              <Pencil className="w-4 h-4" /> Modifier
            </button>
            <button onClick={() => {
              if (window.confirm(`Supprimer « ${course.title} » ?`)) {
                persist(courses.filter((c) => c.id !== course.id));
              }
            }}
              className="bg-red-50 text-red-600 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 text-sm">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </div>
      ))}

      {draft && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white rounded-t-2xl flex items-center gap-2">
              <h3 className="font-bold text-gray-900 flex-1">
                {courses.some((c) => c.id === draft.id) ? 'Modifier le cours' : 'Nouveau cours'}
              </h3>
              <button onClick={() => setDraft(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubrique *</label>
                <select
                  value={draft.rubric}
                  onChange={(e) => setDraft({ ...draft, rubric: e.target.value as AdminRubricId })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  {ADMIN_RUBRICS.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du cours *</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ex : La discipline en classe"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'auteur du cours *</label>
                <input
                  value={draft.author}
                  onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                  placeholder="Ex : M. AGOSSOU Marcel, Administrateur scolaire"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">Le nom de l'auteur est affiché aux utilisateurs.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accès *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => setDraft({ ...draft, free: true, price: 0 })}
                    className={`rounded-xl border-2 p-3 font-semibold text-sm ${draft.free ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                    🆓 Gratuit
                  </button>
                  <button type="button"
                    onClick={() => setDraft({ ...draft, free: false })}
                    className={`rounded-xl border-2 p-3 font-semibold text-sm ${!draft.free ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>
                    💰 Payant
                  </button>
                </div>
                {!draft.free && (
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: parseInt(e.target.value) || 0 })}
                    placeholder="Prix en FCFA"
                    className="mt-2 w-full p-3 border border-gray-300 rounded-lg"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du cours *</label>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={8}
                  placeholder="Rédigez la leçon…"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-500">
                👁 Ce cours est déjà consulté <strong>{draft.views ?? 0} fois</strong> (compteur conservé à la modification).
              </div>
              <button onClick={saveDraft} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> Enregistrer et publier
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
