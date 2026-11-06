/**
 * MODÉRATION MOOC (Espace Administrateur, v62).
 *
 * Permet à l'équipe d'administration de superviser la plateforme de formation :
 * publier / dépublier / supprimer des cours, et modérer les avis et le forum.
 */
import { useState } from 'react';
import { GraduationCap, Trash2, Eye, EyeOff, Star, MessageSquare } from 'lucide-react';
import {
  MoocCourse, CourseReview, ForumPost,
  loadCourses, deleteCourse, setCoursePublished, totalLessons,
  loadReviews, deleteReview, loadForum, deleteForumPost,
} from '../utils/mooc';

export default function MoocModerationPanel() {
  const [courses, setCourses] = useState<MoocCourse[]>(() => loadCourses());
  const [reviews, setReviews] = useState<CourseReview[]>(() => loadReviews());
  const [posts, setPosts] = useState<ForumPost[]>(() => loadForum());
  const [sub, setSub] = useState<'cours' | 'avis' | 'forum'>('cours');

  function refresh() {
    setCourses(loadCourses());
    setReviews(loadReviews());
    setPosts(loadForum());
  }

  const titleOf = (id: string) => courses.find((c) => c.id === id)?.title || 'Cours supprimé';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-800">Plateforme MOOC — modération</h3>
      </div>

      <div className="flex gap-2 border-b">
        {([['cours', `Cours (${courses.length})`], ['avis', `Avis (${reviews.length})`], ['forum', `Forum (${posts.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${sub === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'cours' && (
        <div className="space-y-2">
          {courses.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Aucun cours.</p>}
          {courses.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border p-3 flex items-center gap-3">
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{c.title || 'Sans titre'}</p>
                <p className="text-[11px] text-gray-500">
                  {c.instructorName || '—'} · {totalLessons(c)} leçon(s) ·{' '}
                  {c.pricing === 'free' ? 'Gratuit' : c.pricing === 'partial' ? `Partiel (${c.price} F)` : `${c.price} F`}
                </p>
                <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${c.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.published ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              <button onClick={() => { setCoursePublished(c.id, !c.published); refresh(); }}
                className={`p-2 rounded-lg ${c.published ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}
                title={c.published ? 'Dépublier' : 'Publier'}>
                {c.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => { if (confirm('Supprimer ce cours ?')) { deleteCourse(c.id); refresh(); } }}
                className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {sub === 'avis' && (
        <div className="space-y-2">
          {reviews.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Aucun avis.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{r.author}</p>
                <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs">
                  {r.rating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
              </div>
              <p className="text-xs text-gray-500">Cours : {titleOf(r.courseId)}</p>
              <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
              <button onClick={() => { if (confirm('Supprimer cet avis ?')) { deleteReview(r.id); refresh(); } }}
                className="mt-2 text-xs text-red-600 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
            </div>
          ))}
        </div>
      )}

      {sub === 'forum' && (
        <div className="space-y-2">
          {posts.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Aucun message.</p>}
          {posts.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{p.author}</p>
                <span className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-xs text-gray-500">Cours : {titleOf(p.courseId)}</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{p.message}</p>
              <p className="text-[11px] text-gray-400 mt-1 inline-flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> {p.replies.length} réponse(s) · {p.likes} j'aime
              </p>
              <button onClick={() => { if (confirm('Supprimer ce fil de discussion ?')) { deleteForumPost(p.id); refresh(); } }}
                className="mt-2 block text-xs text-red-600 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
