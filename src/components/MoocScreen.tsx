/**
 * PLATEFORME MOOC — ESPACE APPRENANT (v62).
 *
 * Catalogue de formations, page de cours (objectifs + programme), lecteur de
 * leçon (vidéo YouTube intégrée / texte / quiz interactif), suivi de
 * progression, certificat vérifiable à la complétion, avis & note, et forum
 * d'entraide entre enseignants.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Search, Star, Clock, BookOpen, PlayCircle, FileText, HelpCircle,
  CheckCircle2, Circle, Award, MessageSquare, ThumbsUp, ChevronLeft, Users, Plus, X,
  Lock, Download,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { getProfile } from '../utils/userProfile';
import { youTubeEmbed } from '../utils/mediatheque';
import PaywallPanel from './PaywallPanel';
import { exportCertificatePdf } from '../utils/certificatePdf';
import {
  MoocCourse, MoocLesson, CourseProgress, MOOC_CATEGORIES,
  loadCourses, getProgress, enroll, isEnrolled, setLessonDone, recordQuizScore, setLearnerName,
  progressPercent, totalLessons, totalDuration, flatLessons,
  reviewsForCourse, addReview, averageRating,
  forumForCourse, addForumPost, likeForumPost, replyForumPost,
  isCourseUnlocked, isLessonAccessible, hasLockedContent, courseContentId,
} from '../utils/mooc';

/** Badge de prix affiché sur les cartes et la page cours. */
function PriceBadge({ course, light }: { course: MoocCourse; light?: boolean }) {
  const base = light ? 'bg-white/20 text-white' : '';
  if (course.pricing === 'free') {
    return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${light ? base : 'bg-emerald-100 text-emerald-700'}`}>Gratuit</span>;
  }
  if (course.pricing === 'partial') {
    return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${light ? base : 'bg-amber-100 text-amber-700'}`}>Aperçu gratuit · {course.price} F</span>;
  }
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${light ? base : 'bg-indigo-100 text-indigo-700'}`}>{course.price} FCFA</span>;
}

/** Modale de paiement pour débloquer une formation payante. */
function CoursePaywallModal({ course, onClose, onUnlocked }: {
  course: MoocCourse; onClose: () => void; onUnlocked: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <PaywallPanel
          contentId={courseContentId(course.id)}
          kind="formation"
          title={course.title}
          price={String(course.price)}
          onUnlocked={onUnlocked}
        />
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: 'from-emerald-600 to-teal-600', blue: 'from-blue-600 to-sky-600',
  amber: 'from-amber-500 to-orange-500', purple: 'from-purple-600 to-fuchsia-600',
  rose: 'from-rose-600 to-pink-600', indigo: 'from-indigo-600 to-violet-600',
};
function tone(c: string) { return TONE[c] || TONE.emerald; }

function Stars({ value, size = 'text-sm' }: { value: number; size?: string }) {
  return (
    <span className={`inline-flex items-center ${size}`} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

export default function MoocScreen() {
  const goBack = useSmartBack();
  const [courses, setCourses] = useState<MoocCourse[]>(() => loadCourses().filter((c) => c.published));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Toutes');

  const selected = courses.find((c) => c.id === selectedId) || null;

  function refresh() { setCourses(loadCourses().filter((c) => c.published)); }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (cat !== 'Toutes' && c.category !== cat) return false;
      if (!q) return true;
      return (c.title + ' ' + c.subtitle + ' ' + c.instructorName + ' ' + c.description).toLowerCase().includes(q);
    });
  }, [courses, query, cat]);

  /* ---------------- Lecteur de leçon ---------------- */
  if (selected && lessonId) {
    return (
      <LessonPlayer
        course={selected}
        lessonId={lessonId}
        onExit={() => { setLessonId(null); refresh(); }}
        onGoLesson={(id) => setLessonId(id)}
      />
    );
  }

  /* ---------------- Détail d'un cours ---------------- */
  if (selected) {
    return (
      <CourseDetail
        course={selected}
        onBack={() => { setSelectedId(null); refresh(); }}
        onOpenLesson={(id) => setLessonId(id)}
        onChanged={refresh}
      />
    );
  }

  /* ---------------- Catalogue ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Formations (MOOC)</h1>
            <p className="text-white/80 text-xs">Se former, monter en compétences, obtenir des certificats</p>
          </div>
          <Link to="/formations/studio" className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-1">
            <Plus className="w-4 h-4" /> Studio
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une formation, un formateur…"
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {/* Filtres catégorie */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {['Toutes', ...MOOC_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border ${cat === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            Aucune formation ne correspond à votre recherche.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const p = getProgress(c.id);
            const pct = progressPercent(c, p);
            const { avg, count } = averageRating(c.id);
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className="text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className={`bg-gradient-to-r ${tone(c.color)} p-5 text-white`}>
                  <div className="text-4xl mb-1">{c.emoji}</div>
                  <p className="font-black leading-snug">{c.title}</p>
                  <p className="text-white/85 text-xs mt-1">{c.subtitle}</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <PriceBadge course={c} />
                    <span className="bg-gray-100 rounded px-2 py-0.5">{c.level}</span>
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{totalLessons(c)} leçons</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{totalDuration(c)} min</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {count > 0 ? (<><Stars value={avg} /><span className="text-xs text-gray-500">{avg} ({count})</span></>)
                      : <span className="text-xs text-gray-400">Pas encore d'avis</span>}
                  </div>
                  {p && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{pct}% — {pct === 100 ? 'Terminé ✅' : 'En cours'}</p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Détail d'un cours                                                   */
/* ================================================================== */
function CourseDetail({ course, onBack, onOpenLesson, onChanged }: {
  course: MoocCourse; onBack: () => void; onOpenLesson: (id: string) => void; onChanged: () => void;
}) {
  const [, force] = useState(0);
  const [tab, setTab] = useState<'programme' | 'avis' | 'forum'>('programme');
  const [payOpen, setPayOpen] = useState(false);
  const p = getProgress(course.id);
  const pct = progressPercent(course, p);
  const enrolled = isEnrolled(course.id);
  const unlocked = isCourseUnlocked(course);
  const locked = hasLockedContent(course);
  const { avg, count } = averageRating(course.id);

  function doEnroll() { enroll(course.id); force((n) => n + 1); onChanged(); }

  function openLesson(l: MoocLesson) {
    if (!enrolled) { doEnroll(); }
    if (!isLessonAccessible(course, l)) { setPayOpen(true); return; }
    onOpenLesson(l.id);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className={`bg-gradient-to-r ${tone(course.color)} text-white p-4`}>
        <button onClick={onBack} className="p-2 bg-white/20 rounded-lg mb-3"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-5xl mb-2">{course.emoji}</div>
        <h1 className="text-xl font-black leading-tight">{course.title}</h1>
        <p className="text-white/85 mt-1">{course.subtitle}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-white/90 flex-wrap">
          <PriceBadge course={course} light />
          <span className="bg-white/20 rounded px-2 py-0.5">{course.category}</span>
          <span className="bg-white/20 rounded px-2 py-0.5">{course.level}</span>
          <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{totalLessons(course)} leçons</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{totalDuration(course)} min</span>
          {count > 0 && <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />{avg} ({count})</span>}
        </div>
      </div>

      {/* Progression */}
      {enrolled && (
        <div className="bg-white p-4 border-b">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-semibold text-gray-700">Votre progression</span>
            <span className="text-emerald-700 font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && p?.certificateCode && (
            <CertificateCard course={course} progress={p} />
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        <p className="text-gray-700 text-sm whitespace-pre-wrap">{course.description}</p>

        {course.objectives.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-2">🎯 Ce que vous saurez faire</p>
            <ul className="space-y-1.5">
              {course.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
            {course.instructorName.slice(0, 1).toUpperCase() || 'F'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm">{course.instructorName || 'Formateur'}</p>
            <p className="text-gray-500 text-xs">{course.instructorBio}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b">
          {([['programme', 'Programme'], ['avis', 'Avis'], ['forum', 'Forum']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'programme' && (
          <div className="space-y-4">
            {course.modules.map((m, mi) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-bold text-gray-800 text-sm">
                  {mi + 1}. {m.title}
                </div>
                <ul>
                  {m.lessons.map((l) => {
                    const done = p?.completedLessonIds.includes(l.id);
                    const accessible = isLessonAccessible(course, l);
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => openLesson(l)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0">
                          {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                          <LessonIcon type={l.type} />
                          <span className="flex-1 min-w-0 text-sm text-gray-800 flex items-center gap-2">
                            {l.title}
                            {!accessible && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                            {accessible && !unlocked && l.free && course.pricing !== 'free' && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Aperçu</span>
                            )}
                          </span>
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{l.durationMin}′</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === 'avis' && <ReviewsTab course={course} />}
        {tab === 'forum' && <ForumTab course={course} />}
      </div>

      {/* Barre d'action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 print:hidden flex gap-2">
        {locked && (
          <button onClick={() => setPayOpen(true)} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" /> Débloquer ({course.price} FCFA)
          </button>
        )}
        {!enrolled ? (
          <button onClick={doEnroll} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <GraduationCap className="w-5 h-5" /> {course.pricing === 'free' ? "S'inscrire gratuitement" : "S'inscrire"}
          </button>
        ) : (
          <button
            onClick={() => {
              const accessible = flatLessons(course).filter(({ lesson }) => isLessonAccessible(course, lesson));
              const next = accessible.find(({ lesson }) => !p?.completedLessonIds.includes(lesson.id)) ?? accessible[0];
              if (next) onOpenLesson(next.lesson.id);
              else setPayOpen(true);
            }}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <PlayCircle className="w-5 h-5" /> {pct === 0 ? 'Commencer' : pct === 100 ? 'Revoir' : 'Continuer'}
          </button>
        )}
      </div>

      {payOpen && (
        <CoursePaywallModal
          course={course}
          onClose={() => setPayOpen(false)}
          onUnlocked={() => { setPayOpen(false); force((n) => n + 1); onChanged(); }}
        />
      )}
    </div>
  );
}

function LessonIcon({ type }: { type: MoocLesson['type'] }) {
  if (type === 'video') return <PlayCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (type === 'quiz') return <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
}

/* ================================================================== */
/* Certificat                                                          */
/* ================================================================== */
function CertificateCard({ course, progress }: { course: MoocCourse; progress: CourseProgress }) {
  const profile = getProfile();
  // Le nom transcrit sur le certificat : d'abord le nom saisi par le participant,
  // sinon le nom du profil enseignant comme valeur par défaut modifiable.
  const [name, setName] = useState(progress.learnerName || profile.teacherName || '');
  const date = progress.completedAt ? new Date(progress.completedAt).toLocaleDateString('fr-FR') : '';
  const trimmed = name.trim();

  function download() {
    if (!trimmed) return;
    setLearnerName(course.id, trimmed); // mémorise pour les prochaines fois
    exportCertificatePdf({
      learnerName: trimmed,
      courseTitle: course.title,
      instructorName: course.instructorName,
      code: progress.certificateCode || '',
      date: progress.completedAt || Date.now(),
    });
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4">
      <div className="flex items-center gap-2 text-amber-700 font-black"><Award className="w-6 h-6" /> Certificat de réussite</div>
      <p className="text-sm text-gray-700 mt-2">Décerné à <b>{trimmed || '…'}</b> pour avoir terminé la formation :</p>
      <p className="font-bold text-gray-900">« {course.title} »</p>

      <label className="block mt-3 print:hidden">
        <span className="text-xs font-semibold text-gray-600">Nom et prénoms du participant (tels qu'ils apparaîtront sur le certificat)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. AKPOVI Marie-Louise"
          className="mt-1 w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </label>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-gray-500">Délivré le {date}</span>
        <span className="font-mono bg-white border border-amber-300 rounded px-2 py-1 text-amber-800">{progress.certificateCode}</span>
      </div>
      <button
        onClick={download}
        disabled={!trimmed}
        className="mt-3 w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold print:hidden inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        <Download className="w-4 h-4" /> Télécharger le certificat (PDF)
      </button>
      {!trimmed && <p className="text-[11px] text-amber-700 mt-1 print:hidden">Saisissez le nom et les prénoms pour activer le téléchargement.</p>}
    </div>
  );
}

/* ================================================================== */
/* Lecteur de leçon                                                    */
/* ================================================================== */
function LessonPlayer({ course, lessonId, onExit, onGoLesson }: {
  course: MoocCourse; lessonId: string; onExit: () => void; onGoLesson: (id: string) => void;
}) {
  const flat = flatLessons(course);
  const idx = flat.findIndex(({ lesson }) => lesson.id === lessonId);
  const current = flat[idx];
  const [, force] = useState(0);
  const p = getProgress(course.id);
  const done = p?.completedLessonIds.includes(lessonId);

  if (!current) { onExit(); return null; }
  const { lesson } = current;
  const next = flat[idx + 1];

  // Leçon verrouillée (contenu payant non débloqué) : on invite à revenir à la
  // page du cours pour la débloquer, plutôt que d'afficher le contenu.
  if (!isLessonAccessible(course, lesson)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-emerald-600 text-white p-3 sticky top-0 z-10 shadow flex items-center gap-2">
          <button onClick={onExit} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
          <p className="flex-1 font-bold truncate">{lesson.title}</p>
        </header>
        <div className="p-8 text-center">
          <Lock className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="font-bold text-gray-800">Leçon réservée</p>
          <p className="text-sm text-gray-500 mt-1">Cette leçon fait partie du contenu payant de la formation.</p>
          <button onClick={onExit} className="mt-5 bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold">
            Débloquer la formation
          </button>
        </div>
      </div>
    );
  }

  function markDone(v: boolean) { setLessonDone(course, lessonId, v); force((n) => n + 1); }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-emerald-600 text-white p-3 sticky top-0 z-10 shadow flex items-center gap-2">
        <button onClick={onExit} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80">Leçon {idx + 1}/{flat.length}</p>
          <p className="font-bold truncate">{lesson.title}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {lesson.type === 'video' && (
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            {youTubeEmbed(lesson.youtubeUrl || '') ? (
              <iframe
                src={youTubeEmbed(lesson.youtubeUrl || '')}
                title={lesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">Vidéo indisponible.</div>
            )}
          </div>
        )}

        {lesson.type === 'text' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
          </div>
        )}

        {lesson.type === 'quiz' && lesson.quiz && (
          <Quiz course={course} lesson={lesson} onDone={() => force((n) => n + 1)} />
        )}

        {lesson.type !== 'quiz' && (
          <button
            onClick={() => markDone(!done)}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'}`}>
            {done ? <><CheckCircle2 className="w-5 h-5" /> Leçon terminée</> : <>Marquer comme terminée</>}
          </button>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 print:hidden">
        {idx > 0 && (
          <button onClick={() => onGoLesson(flat[idx - 1].lesson.id)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">
            Précédente
          </button>
        )}
        {next ? (
          <button onClick={() => onGoLesson(next.lesson.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold">
            Leçon suivante
          </button>
        ) : (
          <button onClick={onExit} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold">
            Terminer le cours
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Quiz interactif                                                     */
/* ================================================================== */
function Quiz({ course, lesson, onDone }: { course: MoocCourse; lesson: MoocLesson; onDone: () => void }) {
  const questions = lesson.quiz || [];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const total = questions.length;

  function submit() {
    setSubmitted(true);
    recordQuizScore(course, lesson.id, correct, total);
    onDone();
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm space-y-5">
      <p className="font-bold text-gray-800 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-amber-500" /> Quiz — {total} question(s)</p>
      {questions.map((q, qi) => (
        <div key={q.id}>
          <p className="font-semibold text-gray-800 text-sm mb-2">{qi + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const chosen = answers[q.id] === oi;
              const isRight = oi === q.correctIndex;
              let cls = 'border-gray-200';
              if (submitted) {
                if (isRight) cls = 'border-emerald-500 bg-emerald-50';
                else if (chosen) cls = 'border-red-400 bg-red-50';
              } else if (chosen) cls = 'border-emerald-500 bg-emerald-50';
              return (
                <button key={oi} disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${cls}`}>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 ${chosen ? 'border-emerald-500' : 'border-gray-300'}`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {submitted && isRight && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">💡 {q.explanation}</p>
          )}
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < total}
          className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
          Valider mes réponses
        </button>
      ) : (
        <div className={`rounded-xl p-4 text-center ${correct / total >= 0.5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <p className="text-2xl font-black">{correct}/{total}</p>
          <p className="text-sm font-semibold">
            {correct / total >= 0.5 ? 'Réussi ! Leçon validée ✅' : 'Réessayez pour valider la leçon (≥ 50 %).'}
          </p>
          {correct / total < 0.5 && (
            <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="mt-2 text-sm underline">Recommencer</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Avis & notes                                                        */
/* ================================================================== */
function ReviewsTab({ course }: { course: MoocCourse }) {
  const [, force] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const reviews = reviewsForCourse(course.id);
  const { avg, count } = averageRating(course.id);
  const profile = getProfile();

  function submit() {
    if (!comment.trim()) return;
    addReview({ courseId: course.id, rating, comment: comment.trim(), author: profile.teacherName || 'Enseignant(e)' });
    setComment(''); setRating(5); force((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-black text-gray-900">{count > 0 ? avg : '—'}</p>
          <Stars value={avg} />
          <p className="text-xs text-gray-500 mt-1">{count} avis</p>
        </div>
        <div className="flex-1 text-sm text-gray-500">
          Partagez votre expérience pour aider les autres enseignants à choisir cette formation.
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="font-semibold text-gray-800 text-sm mb-2">Votre avis</p>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)}>
              <Star className={`w-7 h-7 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
          placeholder="Qu'avez-vous pensé de cette formation ?"
          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500" />
        <button onClick={submit} disabled={!comment.trim()}
          className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          Publier mon avis
        </button>
      </div>

      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">{r.author}</p>
            <Stars value={r.rating} />
          </div>
          <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
          <p className="text-[11px] text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Forum d'entraide                                                    */
/* ================================================================== */
function ForumTab({ course }: { course: MoocCourse }) {
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const posts = forumForCourse(course.id);
  const profile = getProfile();
  const author = profile.teacherName || 'Enseignant(e)';

  function post() {
    if (!msg.trim()) return;
    addForumPost(course.id, author, msg.trim());
    setMsg(''); force((n) => n + 1);
  }
  function sendReply(id: string) {
    if (!replyMsg.trim()) return;
    replyForumPost(id, author, replyMsg.trim());
    setReplyMsg(''); setReplyTo(null); force((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Poser une question à la communauté</p>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3}
          placeholder="Votre question ou votre partage d'expérience…"
          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500" />
        <button onClick={post} disabled={!msg.trim()}
          className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Publier</button>
      </div>

      {posts.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Soyez le premier à lancer la discussion.</p>}

      {posts.map((p) => (
        <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">{p.author}</p>
            <p className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{p.message}</p>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <button onClick={() => { likeForumPost(p.id); force((n) => n + 1); }} className="inline-flex items-center gap-1 text-gray-500 hover:text-emerald-600">
              <ThumbsUp className="w-4 h-4" /> {p.likes}
            </button>
            <button onClick={() => setReplyTo(replyTo === p.id ? null : p.id)} className="inline-flex items-center gap-1 text-gray-500 hover:text-emerald-600">
              <MessageSquare className="w-4 h-4" /> Répondre ({p.replies.length})
            </button>
          </div>

          {p.replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-100">
              {p.replies.map((r) => (
                <div key={r.id}>
                  <p className="text-xs font-semibold text-gray-700">{r.author}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.message}</p>
                </div>
              ))}
            </div>
          )}

          {replyTo === p.id && (
            <div className="mt-3 flex gap-2">
              <input value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)}
                placeholder="Votre réponse…"
                className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => sendReply(p.id)} className="bg-emerald-600 text-white px-3 rounded-lg text-sm">Envoyer</button>
              <button onClick={() => setReplyTo(null)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
