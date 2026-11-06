/**
 * GRAMMAIRE, CONJUGAISON ET ORTHOGRAPHE FRANCOPHONES — écran (v64).
 *
 * Référentiel hors-ligne : 32 leçons complètes (règle, astuce, exemples,
 * pièges, exercice corrigé), recherche insensible aux accents, lecture
 * vocale française, copie « pour le cahier » et quiz de 24 questions
 * avec meilleur score conservé sur l'appareil.
 */

import { useMemo, useState } from 'react';
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff,
  Lightbulb, ListChecks, Search, SpellCheck, Trophy, Volume2, XCircle,
} from 'lucide-react';
import {
  FRENCH_DOMAIN_LABELS, FRENCH_LESSONS, FRENCH_QUIZ, FrenchDomain,
  FrenchLesson, frenchLessonToText,
} from '../utils/frenchGCOData';
import { normalizeSearch } from '../utils/textSearch';
import { copyText } from '../utils/clipboard';
import { isSpeechSupported, speakTextLang, stopSpeaking } from '../utils/speech';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { useSmartBack } from '../utils/useSmartBack';

const BEST_KEY = 'msp_french_gco_best';
type View = { kind: 'list' } | { kind: 'lesson'; lesson: FrenchLesson } | { kind: 'quiz' };

const DOMAIN_TONES: Record<FrenchDomain, { chip: string; active: string; badge: string }> = {
  grammaire: { chip: 'bg-blue-50 text-blue-700 ring-blue-200', active: 'bg-blue-600 text-white', badge: 'bg-blue-100 text-blue-700' },
  conjugaison: { chip: 'bg-purple-50 text-purple-700 ring-purple-200', active: 'bg-purple-600 text-white', badge: 'bg-purple-100 text-purple-700' },
  orthographe: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', active: 'bg-rose-600 text-white', badge: 'bg-rose-100 text-rose-700' },
};

function lessonSpeech(l: FrenchLesson): string {
  return `${l.title}. La règle : ${l.regle} ${l.astuce ? `Astuce : ${l.astuce}` : ''} À retenir : ${l.aRetenir.join('. ')}`;
}

export default function FrenchGCOScreen() {
  const goBack = useSmartBack('/langues');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [domain, setDomain] = useState<FrenchDomain | 'tout'>('tout');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [best, setBest] = useState<number>(() => Number(safeGetItem(BEST_KEY) || 0) || 0);

  /* Quiz */
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const quizDone = view.kind === 'quiz' && qIndex >= FRENCH_QUIZ.length;
  const score = FRENCH_QUIZ.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return FRENCH_LESSONS.filter(l =>
      (domain === 'tout' || l.domain === domain) &&
      (!q || normalizeSearch(`${l.title} ${l.regle} ${l.level}`).includes(q)),
    );
  }, [domain, query]);

  const levels = useMemo(() => {
    const counts = { grammaire: 0, conjugaison: 0, orthographe: 0 } as Record<FrenchDomain, number>;
    FRENCH_LESSONS.forEach(l => { counts[l.domain]++; });
    return counts;
  }, []);

  function openLesson(l: FrenchLesson) {
    stopSpeaking();
    setShowCorrection(false);
    setCopied(false);
    setView({ kind: 'lesson', lesson: l });
    window.scrollTo({ top: 0 });
  }

  function startQuiz() {
    setQIndex(0);
    setAnswers([]);
    setView({ kind: 'quiz' });
    window.scrollTo({ top: 0 });
  }

  function answerQuiz(choice: number) {
    const next = [...answers, choice];
    setAnswers(next);
    if (qIndex + 1 >= FRENCH_QUIZ.length) {
      const total = FRENCH_QUIZ.reduce((n, q, i) => n + (next[i] === q.answer ? 1 : 0), 0);
      if (total > best) {
        setBest(total);
        safeSetItem(BEST_KEY, String(total));
      }
    }
    setQIndex(qIndex + 1);
  }

  const header = (
    <header className="msp-kente bg-gradient-to-r from-blue-700 via-indigo-600 to-rose-600 text-white p-4 shadow-lg sticky top-0 z-10">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <button
          onClick={() => { stopSpeaking(); if (view.kind !== 'list') setView({ kind: 'list' }); else goBack(); }}
          className="p-2 bg-white/15 rounded-lg shrink-0"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <SpellCheck className="w-8 h-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight">Grammaire, Conjugaison et Orthographe francophones</h1>
          <p className="text-white/85 text-xs">{FRENCH_LESSONS.length} leçons · quiz de {FRENCH_QUIZ.length} questions · 100 % hors-ligne</p>
        </div>
      </div>
    </header>
  );

  /* ---------------- VUE LEÇON ---------------- */
  if (view.kind === 'lesson') {
    const l = view.lesson;
    const tone = DOMAIN_TONES[l.domain];
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {header}
        <main className="max-w-3xl mx-auto p-4 space-y-4" data-testid="francais-lecon">
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tone.badge}`}>
                {FRENCH_DOMAIN_LABELS[l.domain].emoji} {FRENCH_DOMAIN_LABELS[l.domain].label}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">{l.level}</span>
            </div>
            <h2 className="mt-3 text-xl font-black text-gray-900 leading-tight">{l.title}</h2>
            <p className="mt-2 text-sm text-gray-600">🎯 <strong>Objectif :</strong> {l.objectif}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {isSpeechSupported() && (
                <button
                  onClick={() => speakTextLang(lessonSpeech(l), 'fr-FR', 0.92)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                  data-testid="btn-ecouter-lecon"
                >
                  <Volume2 className="w-4 h-4" /> Écouter la leçon
                </button>
              )}
              <button
                onClick={async () => { const ok = await copyText(frenchLessonToText(l)); setCopied(ok); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
                data-testid="btn-copier-lecon"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier pour le cahier'}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="font-black text-gray-900">📖 La règle</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-800">{l.regle}</p>
            {l.astuce && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-900"><strong>Astuce :</strong> {l.astuce}</p>
              </div>
            )}
            {l.table && (
              <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      {l.table.headers.map(h => <th key={h} className="px-3 py-2 text-left font-bold whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {l.table.rows.map((row, i) => (
                      <tr key={i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                        {row.map((cell, j) => (
                          <td key={j} className={`px-3 py-2 whitespace-nowrap ${j === 0 ? 'font-bold text-gray-500' : 'text-gray-800'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="font-black text-gray-900">✏️ Exemples expliqués</h3>
            <ul className="mt-2 space-y-2">
              {l.exemples.map((e, i) => <li key={i} className="text-[15px] leading-relaxed text-gray-800 border-l-4 border-emerald-200 pl-3">{e}</li>)}
            </ul>
            <h3 className="mt-5 font-black text-gray-900">⚠️ Pièges à éviter</h3>
            <ul className="mt-2 space-y-2">
              {l.pieges.map((p, i) => <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700"><XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />{p}</li>)}
            </ul>
            <div className="mt-5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3">
              <p className="font-black text-emerald-900">✅ À retenir</p>
              <ul className="mt-1 space-y-1">
                {l.aRetenir.map((r, i) => <li key={i} className="text-sm text-emerald-900">• {r}</li>)}
              </ul>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="francais-exercice">
            <h3 className="font-black text-gray-900">📝 Exercice d’application</h3>
            <p className="mt-1 text-sm font-semibold text-gray-600">{l.exercice.consigne}</p>
            <ol className="mt-3 space-y-3">
              {l.exercice.items.map((it, i) => (
                <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <p className="text-[15px] text-gray-900"><strong>{i + 1}.</strong> {it.question}</p>
                  {showCorrection && <p className="mt-1 text-sm text-emerald-800">✔️ {it.reponse}</p>}
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowCorrection(v => !v)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white"
              data-testid="btn-corrige"
            >
              {showCorrection ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {showCorrection ? 'Masquer le corrigé' : 'Voir le corrigé'}
            </button>
          </section>

          <button onClick={() => setView({ kind: 'list' })} className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600">
            ← Toutes les leçons
          </button>
        </main>
      </div>
    );
  }

  /* ---------------- VUE QUIZ ---------------- */
  if (view.kind === 'quiz') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {header}
        <main className="max-w-3xl mx-auto p-4">
          {!quizDone ? (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="francais-quiz">
              <p className="text-xs font-bold text-gray-400">QUESTION {qIndex + 1} / {FRENCH_QUIZ.length} · {FRENCH_DOMAIN_LABELS[FRENCH_QUIZ[qIndex].domain].label}</p>
              <h2 className="mt-2 text-lg font-black text-gray-900">{FRENCH_QUIZ[qIndex].question}</h2>
              <div className="mt-4 space-y-2">
                {FRENCH_QUIZ[qIndex].choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => answerQuiz(i)}
                    className="w-full text-left rounded-xl ring-1 ring-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-800 active:bg-blue-50"
                    data-testid={`fr-quiz-choix-${i}`}
                  >
                    {String.fromCharCode(65 + i)}. {choice}
                  </button>
                ))}
              </div>
              {answers.length > 0 && qIndex > 0 && (
                <p className="mt-4 text-xs text-gray-500">💡 Question précédente : {FRENCH_QUIZ[qIndex - 1].explication}</p>
              )}
            </section>
          ) : (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 text-center" data-testid="francais-quiz-resultat">
              <Trophy className="mx-auto w-14 h-14 text-amber-500" />
              <h2 className="mt-3 text-2xl font-black text-gray-900">{score} / {FRENCH_QUIZ.length}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {score === FRENCH_QUIZ.length ? 'Sans faute, félicitations ! 🎉'
                  : score >= FRENCH_QUIZ.length * 0.75 ? 'Très bon travail ! Encore un petit effort.'
                    : score >= FRENCH_QUIZ.length / 2 ? 'Bon début : relis les leçons des questions manquées.'
                      : 'Reprends les leçons une à une, tu vas progresser vite.'}
              </p>
              <p className="mt-2 text-xs font-bold text-amber-700">🏆 Meilleur score sur cet appareil : {best} / {FRENCH_QUIZ.length}</p>
              <div className="mt-5 text-left space-y-2">
                {FRENCH_QUIZ.map((q, i) => (
                  <div key={i} className={`rounded-xl p-3 ring-1 ${answers[i] === q.answer ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
                    <p className="text-sm font-semibold text-gray-900">{answers[i] === q.answer ? '✅' : '❌'} {q.question}</p>
                    <p className="mt-0.5 text-xs text-gray-600">Bonne réponse : <strong>{q.choices[q.answer]}</strong> — {q.explication}</p>
                  </div>
                ))}
              </div>
              <button onClick={startQuiz} className="mt-5 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white">🔁 Recommencer le quiz</button>
              <button onClick={() => setView({ kind: 'list' })} className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-700">Retour aux leçons</button>
            </section>
          )}
        </main>
      </div>
    );
  }

  /* ---------------- VUE LISTE ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {header}
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
          <p className="text-sm leading-relaxed text-gray-700">
            Le référentiel complet de français pour le primaire et l’entrée au collège :
            <strong> {levels.grammaire} leçons de grammaire</strong>,
            <strong> {levels.conjugaison} de conjugaison</strong> et
            <strong> {levels.orthographe} d’orthographe</strong>, avec des exemples de chez nous,
            des astuces qui marchent en dictée et un exercice corrigé à chaque leçon.
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher : « passé composé », « homophones », « pluriel »…"
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-[15px]"
              data-testid="francais-recherche"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setDomain('tout')}
              className={`px-3 py-2 rounded-full text-sm font-bold ring-1 ring-gray-200 ${domain === 'tout' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-700'}`}
            >
              Tout ({FRENCH_LESSONS.length})
            </button>
            {(Object.keys(FRENCH_DOMAIN_LABELS) as FrenchDomain[]).map(d => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`px-3 py-2 rounded-full text-sm font-bold ring-1 ${domain === d ? DOMAIN_TONES[d].active : DOMAIN_TONES[d].chip}`}
                data-testid={`fr-filtre-${d}`}
              >
                {FRENCH_DOMAIN_LABELS[d].emoji} {FRENCH_DOMAIN_LABELS[d].label} ({levels[d]})
              </button>
            ))}
          </div>
          {(Object.keys(FRENCH_DOMAIN_LABELS) as FrenchDomain[])
            .filter(d => domain === 'tout' || domain === d)
            .map(d => (
              <p key={d} className="mt-3 text-xs text-gray-500">
                {FRENCH_DOMAIN_LABELS[d].emoji} <strong>{FRENCH_DOMAIN_LABELS[d].label}</strong> — {FRENCH_DOMAIN_LABELS[d].description}
              </p>
            ))}
        </section>

        <button
          onClick={startQuiz}
          className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-left text-white shadow"
          data-testid="btn-francais-quiz"
        >
          <ListChecks className="w-8 h-8 shrink-0" />
          <span className="flex-1">
            <span className="block font-black">Quiz — Grammaire · Conjugaison · Orthographe</span>
            <span className="block text-white/90 text-xs">{FRENCH_QUIZ.length} questions corrigées et expliquées{best > 0 ? ` · meilleur score : ${best}/${FRENCH_QUIZ.length}` : ''}</span>
          </span>
          <ChevronRight className="w-6 h-6 shrink-0" />
        </button>

        <div className="space-y-3" data-testid="francais-liste">
          {filtered.map(l => (
            <button
              key={l.id}
              onClick={() => openLesson(l)}
              className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 active:scale-[0.99]"
              data-testid={`fr-lecon-${l.id}`}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl shrink-0 ${DOMAIN_TONES[l.domain].badge}`}>
                {FRENCH_DOMAIN_LABELS[l.domain].emoji}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-gray-900 leading-tight">{l.title}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{FRENCH_DOMAIN_LABELS[l.domain].label} · {l.level}</span>
                <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">{l.objectif}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">
              Aucune leçon ne correspond à « {query} ». Essaie « futur », « accord », « ou/où »…
            </p>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-gray-500">
          <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
          Astuce d’enseignant : ouvre une leçon, touche « Copier pour le cahier » et colle le texte dans tes fiches de préparation ou dans un document à imprimer.
        </p>
      </main>
    </div>
  );
}
