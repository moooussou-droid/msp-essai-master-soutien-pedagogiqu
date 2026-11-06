import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { BookOpen, ChevronLeft, GraduationCap, Printer, Search, Sparkles, Store, Volume2, X } from 'lucide-react';
import { PRIMARY_PROGRAMMES } from '../utils/programmeData';
import { TeacherTip, buildTeacherTip, TIP_SECTIONS } from '../utils/teacherTips';
import { CULTURE_ARTICLES, CULTURE_RUBRICS, CultureArticle, PROVERBS, RIDDLES, pickCultureQuiz } from '../utils/cultivonsNousData';
import { ADMIN_RUBRICS, AdminRubricId, CultivonsCourse, adminRubricLabel, incrementCourseView, loadCultivonsCourses } from '../utils/cultivonsCourses';
import { pickDaily } from '../utils/dailyContent';
import { isSpeechSupported, speakText } from '../utils/speech';
import { printFlashcards } from '../utils/flashcards';

type Tab = 'astuces' | 'culture';

const LEVELS = PRIMARY_PROGRAMMES.map(p => p.level);
const LEVEL_LABELS: Record<string, string> = Object.fromEntries(PRIMARY_PROGRAMMES.map(p => [p.level, p.label]));

export default function CoursesScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('astuces');
  const [level, setLevel] = useState(LEVELS[0]);
  const [query, setQuery] = useState('');
  const [tip, setTip] = useState<TeacherTip | null>(null);

  const programme = PRIMARY_PROGRAMMES.find(p => p.level === level)!;
  const normQuery = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const notions = useMemo(() => {
    const list: { notion: string; discipline: string }[] = [];
    for (const d of programme.disciplines) for (const n of d.notions) list.push({ notion: n, discipline: d.name });
    return list.filter(({ notion, discipline }) =>
      !normQuery || notion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normQuery) || discipline.toLowerCase().includes(normQuery)
    );
  }, [programme, normQuery]);

  const disciplines = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const { notion, discipline } of notions) {
      if (!map.has(discipline)) map.set(discipline, []);
      map.get(discipline)!.push(notion);
    }
    return [...map.entries()];
  }, [notions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Cours</h1>
            <p className="text-emerald-100 text-sm">Deux espaces : les astuces de l’enseignant et la culture générale</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setTab('astuces')} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${tab === 'astuces' ? 'bg-white text-emerald-700' : 'bg-white/15 text-white'}`}>
            🧑‍🏫 Les astuces de l’enseignant <span className="opacity-70 font-semibold">· 100 % gratuit</span>
          </button>
          <button onClick={() => setTab('culture')} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${tab === 'culture' ? 'bg-white text-emerald-700' : 'bg-white/15 text-white'}`}>
            🌍 Cultivons-nous
          </button>
        </div>
      </header>
      <main className="p-4 pb-24 max-w-5xl mx-auto">
        {tab === 'astuces' ? (
          <>
            <section className="bg-white rounded-2xl shadow p-4 mb-4">
              <h2 className="font-black text-gray-900">🧑‍🏫 Les astuces de l’enseignant</h2>
              <p className="text-gray-500 text-sm mt-1">Chaque notion du programme (CI → CM2) est déroulée en 7 points : la notion, son explication, ce que l’élève doit comprendre, retenir, savoir faire, un exemple concret et le critère de réussite. <span className="font-bold text-emerald-700">Entièrement gratuit.</span></p>
              <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm ${level === l ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{l}</button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{LEVEL_LABELS[level]} — {notions.length} notion{notions.length > 1 ? 's' : ''}</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une notion… (ex. soustraction, drapeau, salutation)" className="w-full pl-10 pr-4 py-3 border rounded-lg" />
              </div>
            </section>

            {disciplines.length === 0 && <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Aucune notion ne correspond à la recherche.</div>}

            {disciplines.map(([discipline, list]) => (
              <section key={discipline} className="bg-white rounded-2xl shadow p-4 mb-4">
                <h3 className="font-bold text-gray-900">{discipline} <span className="text-sm font-normal text-gray-400">({list.length})</span></h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {list.map(n => (
                    <button key={n} onClick={() => setTip(buildTeacherTip(n, discipline, level))} className="text-left bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 transition-colors">
                      {n}
                    </button>
                  ))}
                </div>
              </section>
            ))}

            <section className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow p-4 flex items-center gap-3">
              <Store className="w-8 h-8 shrink-0" />
              <div className="flex-1">
                <h3 className="font-black">Plateforme de cours</h3>
                <p className="text-sm text-emerald-50">Proposer un cours, suivre les cours approuvés, proposer des leçons vidéo.</p>
              </div>
              <button onClick={() => navigate('/plateforme-cours')} className="bg-white text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap">Ouvrir</button>
            </section>
          </>
        ) : (
          <CultureTab />
        )}
      </main>

      {tip && <TipModal tip={tip} onClose={() => setTip(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche pédagogique en 7 points                                       */
/* ------------------------------------------------------------------ */

function TipModal({ tip, onClose }: { tip: TeacherTip; onClose: () => void }) {
  const contents: (string | string[])[] = [tip.notion, tip.explanation, tip.understands, tip.retains, tip.canDo, tip.example, tip.success];
  const sections: { title: string; content: string | string[] }[] = TIP_SECTIONS.map((title, i) => ({ title: `${i + 1}. ${title}`, content: contents[i] }));

  function printTip() {
    printFlashcards(
      [{ title: `${tip.notion} — ${tip.level}`, subtitle: `${tip.discipline} · Les astuces de l’enseignant · 100 % gratuit`, body: sections.map(s => `${s.title}\n${Array.isArray(s.content) ? s.content.map(c => '• ' + c).join('\n') : s.content}`).join('\n\n') }],
      { title: `Fiche pédagogique — ${tip.notion}`, subtitle: `Classe : ${tip.level} · Discipline : ${tip.discipline}` }
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b sticky top-0 bg-white rounded-t-2xl flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase text-emerald-700">{tip.level} · {tip.discipline}</p>
            <h2 className="font-black text-gray-900 text-lg truncate">{tip.notion}</h2>
          </div>
          {isSpeechSupported() && (
            <button onClick={() => speakText(sections.map(s => `${s.title}. ${Array.isArray(s.content) ? s.content.map(c => ' • ' + c).join('. ') : s.content}`).join('\n'))} className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0" title="Écouter la fiche">
              <Volume2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={printTip} className="p-2.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0" title="Imprimer la fiche">
            <Printer className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {sections.map(s => (
            <section key={s.title} className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-black text-emerald-800 text-sm uppercase">{s.title}</h3>
              {Array.isArray(s.content) ? (
                <ul className="mt-2 space-y-1.5">
                  {s.content.map((item, i) => <li key={i} className="text-gray-700 text-sm leading-relaxed flex gap-2"><span className="text-emerald-600 mt-0.5">▸</span><span>{item}</span></li>)}
                </ul>
              ) : (
                <p className="mt-2 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{s.content}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cultivons-nous                                                      */
/* ------------------------------------------------------------------ */

function CultureTab() {
  const [article, setArticle] = useState<CultureArticle | null>(null);
  const [rubric, setRubric] = useState<string | null>(null);
  const [quiz, setQuiz] = useState(() => pickCultureQuiz(5, new Date().toISOString().slice(0, 10)));
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [bestQuiz, setBestQuiz] = useState(() => { try { return parseInt(localStorage.getItem('msp_culture_quiz_best') || '0', 10) || 0; } catch { return 0; } });
  // Cours des administrateurs (v25) : rubrique active + cours ouvert
  const [adminRubric, setAdminRubric] = useState<AdminRubricId | 'all'>('all');
  const [adminCourses, setAdminCourses] = useState<CultivonsCourse[]>(() => loadCultivonsCourses());
  const [adminViewer, setAdminViewer] = useState<CultivonsCourse | null>(null);

  function openAdminCourse(course: CultivonsCourse) {
    incrementCourseView(course.id); // nombre de visiteurs (visible par les administrateurs)
    setAdminCourses(loadCultivonsCourses());
    setAdminViewer(course);
  }

  const daily = pickDaily(CULTURE_ARTICLES, 'culture-jour');
  const proverb = pickDaily(PROVERBS, 'proverbe-jour');
  const riddle = pickDaily(RIDDLES, 'devinette-jour');
  const question = quiz[quizIndex];

  function pickQuestion(i: number) {
    if (quizPicked !== null) return;
    setQuizPicked(i);
    if (i === question.correct) {
      const s = quizScore + 1;
      setQuizScore(s);
      if (s > bestQuiz) { setBestQuiz(s); try { localStorage.setItem('msp_culture_quiz_best', String(s)); } catch { /* quota */ } }
    }
  }

  function nextQuestion() {
    if (quizIndex + 1 >= quiz.length) setQuizDone(true);
    else { setQuizIndex(quizIndex + 1); setQuizPicked(null); }
  }

  function replayQuiz() {
    setQuiz(pickCultureQuiz(5, new Date().toISOString().slice(0, 10) + '-1'));
    setQuizIndex(0); setQuizPicked(null); setQuizScore(0); setQuizDone(false);
  }

  const rubrics = CULTURE_RUBRICS.map(r => ({ ...r, count: CULTURE_ARTICLES.filter(a => a.rubric === r.id).length }));
  const articles = rubric ? CULTURE_ARTICLES.filter(a => a.rubric === rubric) : null;

  return (
    <>
      <section className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📖</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase text-emerald-100">À découvrir aujourd’hui</p>
            {daily ? <h2 className="text-xl font-black">{daily.title}</h2> : null}
            {daily && <p className="text-sm text-emerald-50 line-clamp-2">{daily.teaser}</p>}
          </div>
          {daily && (
            <div className="flex gap-2 shrink-0">
              {isSpeechSupported() && <button onClick={() => speakText(`${daily.title}. ${daily.body}`)} className="bg-white/20 p-2.5 rounded-full" title="Écouter"><Volume2 className="w-5 h-5" /></button>}
              <button onClick={() => setArticle(daily)} className="bg-white text-emerald-700 px-3 py-2 rounded-lg text-sm font-bold">Lire</button>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {proverb && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-black text-amber-900 text-sm">🦉 Le proverbe du jour</h3>
            <p className="text-amber-900 font-semibold mt-2 italic">« {proverb.text} »</p>
            <p className="text-amber-800 text-sm mt-1">{proverb.meaning}</p>
          </section>
        )}
        {riddle && (
          <section className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <h3 className="font-black text-sky-900 text-sm">🤔 La devinette du jour</h3>
            <p className="text-sky-900 font-semibold mt-2">{riddle.question}</p>
            <button onClick={() => alert(riddle.answer)} className="mt-2 bg-sky-600 text-white text-sm px-3 py-1.5 rounded-lg font-bold">Voir la réponse</button>
          </section>
        )}
      </div>

      <section className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-gray-900">🎨 Les rubriques</h2>
          <Sparkles className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {rubrics.map(r => (
            <button key={r.id} onClick={() => setRubric(rubric === r.id ? null : r.id)} className={`rounded-xl p-3 text-left border-2 transition-colors ${rubric === r.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}>
              <span className="text-2xl">{r.emoji}</span>
              <p className="font-bold text-gray-800 text-sm mt-1">{r.label}</p>
              <p className="text-xs text-gray-400">{r.count} article{r.count > 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
        {articles && (
          <div className="mt-4">
            <h3 className="font-bold text-gray-800 mb-2">{rubrics.find(r => r.id === rubric)?.label}</h3>
            {articles.map(a => (
              <button key={a.id} onClick={() => setArticle(a)} className="w-full text-left border-b border-gray-100 py-2.5 flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="flex-1">
                  <span className="font-semibold text-gray-800 text-sm block">{a.title}</span>
                  <span className="text-gray-500 text-xs">{a.teaser}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Cours des administrateurs (v25) : 4 rubriques officielles */}
      <section className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-black text-gray-900">🎓 Cours des administrateurs</h2>
          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">Pour les utilisateurs</span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Formation continue des enseignants et administrateurs : chaque cours précise son <strong>auteur</strong> et peut être <strong>gratuit ou payant</strong>.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
          <button
            onClick={() => setAdminRubric('all')}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors ${adminRubric === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Toutes ({adminCourses.length})
          </button>
          {ADMIN_RUBRICS.map(r => {
            const count = adminCourses.filter(c => c.rubric === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => setAdminRubric(adminRubric === r.id ? 'all' : r.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors ${adminRubric === r.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {r.emoji} {r.label} ({count})
              </button>
            );
          })}
        </div>
        {adminRubric !== 'all' && (
          <p className="text-xs text-gray-400 mt-2">{ADMIN_RUBRICS.find(r => r.id === adminRubric)?.desc}</p>
        )}
        <div className="mt-3 space-y-2">
          {(adminRubric === 'all' ? adminCourses : adminCourses.filter(c => c.rubric === adminRubric)).map(course => (
            <button
              key={course.id}
              onClick={() => openAdminCourse(course)}
              className="w-full text-left rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 p-3 flex items-start gap-3 transition-colors"
            >
              <div className="rounded-lg bg-indigo-100 text-indigo-700 p-2 shrink-0"><BookOpen className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm leading-tight">{course.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">✍️ {course.author}</p>
                <p className="text-xs text-gray-400 mt-0.5">{adminRubricLabel(course.rubric)}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${course.free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {course.free ? 'Gratuit' : `${(course.price ?? 0).toLocaleString('fr-FR')} FCFA`}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-black text-gray-900">🧠 Quiz culturel</h2>
        <p className="text-gray-500 text-sm mt-1">5 questions pour se cultiver en s’amusant. Meilleur score : {bestQuiz}/5</p>
        {!quizDone && question ? (
          <>
            <p className="text-xs font-bold text-emerald-700 uppercase mt-3">Question {quizIndex + 1} / {quiz.length}</p>
            <p className="font-semibold text-gray-800 text-lg mt-1">{question.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {question.options.map((opt, i) => {
                const revealed = quizPicked !== null;
                const good = revealed && i === question.correct;
                const bad = revealed && quizPicked === i && i !== question.correct;
                return (
                  <button key={i} onClick={() => pickQuestion(i)} disabled={revealed}
                    className={`p-3 rounded-xl border-2 font-bold text-left transition-colors ${good ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : bad ? 'bg-red-50 border-red-400 text-red-700' : revealed ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400'}`}>
                    {opt} {good && '✅'} {bad && '❌'}
                  </button>
                );
              })}
            </div>
            {quizPicked !== null && (
              <>
                <p className="mt-3 text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-xl p-3">💡 {question.info}</p>
                <button onClick={nextQuestion} className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">
                  {quizIndex + 1 >= quiz.length ? 'Voir mon résultat' : 'Question suivante'}
                </button>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-5xl font-black text-emerald-700">{quizScore} / {quiz.length}</p>
            <p className="font-bold text-gray-800 mt-2 text-lg">{quizScore === quiz.length ? '🎉 Excellent ! Tu es incollable !' : quizScore >= 3 ? '👍 Bien joué, continue à te cultiver !' : '💪 Continue : relis les articles et retente ta chance !'}</p>
            <p className="text-gray-500 text-sm mt-1">Meilleur score : {bestQuiz}/5</p>
            <div className="flex gap-2 mt-4">
              <button onClick={replayQuiz} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Rejouer</button>
            </div>
          </div>
        )}
      </section>

      {adminViewer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white rounded-t-2xl flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase text-indigo-700">{adminRubricLabel(adminViewer.rubric)} • Cours des administrateurs</p>
                <h2 className="font-black text-gray-900 text-lg leading-tight">{adminViewer.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">✍️ Auteur : {adminViewer.author}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${adminViewer.free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {adminViewer.free ? 'Gratuit' : `${(adminViewer.price ?? 0).toLocaleString('fr-FR')} FCFA`}
              </span>
              <button onClick={() => setAdminViewer(null)} className="p-2.5 hover:bg-gray-100 rounded-full shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{adminViewer.content}</p>
              <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
                📖 Cours rédigé par <strong>{adminViewer.author}</strong> — « {adminRubricLabel(adminViewer.rubric)} » (Cultivons-nous · Master Soutien Pédagogique).
              </div>
            </div>
          </div>
        </div>
      )}

      {article && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white rounded-t-2xl flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase text-emerald-700">{CULTURE_RUBRICS.find(r => r.id === article.rubric)?.label}</p>
                <h2 className="font-black text-gray-900 text-lg">{article.title}</h2>
              </div>
              {isSpeechSupported() && <button onClick={() => speakText(`${article.title}. ${article.body}`)} className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0" title="Écouter"><Volume2 className="w-5 h-5" /></button>}
              <button onClick={() => setArticle(null)} className="p-2.5 hover:bg-gray-100 rounded-full shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{article.body}</p>
              <button onClick={() => printFlashcards([{ title: article.title, subtitle: article.teaser, body: article.body }], { title: article.title, subtitle: 'Cultivons-nous · Master Soutien Pédagogique' })} className="mt-4 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5"><Printer className="w-4 h-4" /> Imprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
