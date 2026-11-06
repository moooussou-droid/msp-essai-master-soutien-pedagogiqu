/**
 * LES NOTIONS BASIQUES D'ANGLAIS POUR LE PRIMAIRE — écran (v64).
 *
 * 12 unités bilingues hors-ligne (vocabulaire avec prononciation guidée,
 * phrases clés, grammaire simple, dialogue, activité de classe, exercice
 * corrigé) + quiz. Le bouton 🔊 fait prononcer l'anglais par la voix du
 * téléphone ; la prononciation « à la française » reste affichée pour
 * les appareils sans voix anglaise.
 */

import { useMemo, useState } from 'react';
import {
  Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Globe,
  ListChecks, MessagesSquare, Search, Trophy, Volume2,
} from 'lucide-react';
import {
  ENGLISH_QUIZ, ENGLISH_UNITS, EnglishUnit,
  englishUnitToText, totalEnglishWords,
} from '../utils/englishPrimaryData';
import { normalizeSearch } from '../utils/textSearch';
import { copyText } from '../utils/clipboard';
import { isSpeechSupported, speakTextLang, stopSpeaking } from '../utils/speech';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { useSmartBack } from '../utils/useSmartBack';

const BEST_KEY = 'msp_english_primary_best';
type View = { kind: 'list' } | { kind: 'unit'; unit: EnglishUnit } | { kind: 'quiz' };

function speakEn(text: string) {
  speakTextLang(text, 'en-GB', 0.82);
}

export default function EnglishPrimaryScreen() {
  const goBack = useSmartBack('/langues');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<string>('tout');
  const [copied, setCopied] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [best, setBest] = useState<number>(() => Number(safeGetItem(BEST_KEY) || 0) || 0);
  const speech = isSpeechSupported();

  /* Quiz */
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const quizDone = view.kind === 'quiz' && qIndex >= ENGLISH_QUIZ.length;
  const score = ENGLISH_QUIZ.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);

  const levelOptions = useMemo(() => ['tout', ...Array.from(new Set(ENGLISH_UNITS.map(u => u.level)))], []);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return ENGLISH_UNITS.filter(u => {
      if (level !== 'tout' && u.level !== level) return false;
      if (!q) return true;
      const hay = normalizeSearch([
        u.titleEn, u.titleFr,
        ...u.vocabulaire.map(v => `${v.en} ${v.fr}`),
        ...u.phrasesCles.map(p => `${p.en} ${p.fr}`),
      ].join(' '));
      return hay.includes(q);
    });
  }, [query, level]);

  function openUnit(u: EnglishUnit) {
    stopSpeaking();
    setShowCorrection(false);
    setCopied(false);
    setView({ kind: 'unit', unit: u });
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
    if (qIndex + 1 >= ENGLISH_QUIZ.length) {
      const total = ENGLISH_QUIZ.reduce((n, q, i) => n + (next[i] === q.answer ? 1 : 0), 0);
      if (total > best) {
        setBest(total);
        safeSetItem(BEST_KEY, String(total));
      }
    }
    setQIndex(qIndex + 1);
  }

  const header = (
    <header className="msp-kente bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 text-white p-4 shadow-lg sticky top-0 z-10">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <button
          onClick={() => { stopSpeaking(); if (view.kind !== 'list') setView({ kind: 'list' }); else goBack(); }}
          className="p-2 bg-white/15 rounded-lg shrink-0"
          aria-label="Retour"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <Globe className="w-8 h-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight">Les notions basiques d’anglais pour le Primaire</h1>
          <p className="text-white/85 text-xs">{ENGLISH_UNITS.length} unités · {totalEnglishWords()} mots · prononciation audio · hors-ligne</p>
        </div>
      </div>
    </header>
  );

  /* ---------------- VUE UNITÉ ---------------- */
  if (view.kind === 'unit') {
    const u = view.unit;
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {header}
        <main className="max-w-3xl mx-auto p-4 space-y-4" data-testid="anglais-unite">
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <div className="flex items-start gap-3">
              <span className="text-4xl shrink-0">{u.emoji}</span>
              <div className="min-w-0">
                <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">{u.level}</span>
                <h2 className="mt-2 text-xl font-black text-gray-900 leading-tight">{u.titleEn}</h2>
                <p className="text-sm font-semibold text-gray-500">{u.titleFr}</p>
              </div>
              {speech && (
                <button onClick={() => speakEn(u.titleEn)} className="p-2.5 bg-sky-100 text-sky-800 rounded-full shrink-0" aria-label="Écouter le titre en anglais">
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600">🎯 <strong>Objectif :</strong> {u.objectifFr}</p>
            <button
              onClick={async () => { const ok = await copyText(englishUnitToText(u)); setCopied(ok); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white"
              data-testid="btn-copier-unite"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier toute l’unité'}
            </button>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="font-black text-gray-900">📚 Vocabulary — Vocabulaire</h3>
            <p className="mt-1 text-xs text-gray-500">Touche 🔊 pour entendre la vraie prononciation ; entre crochets, une aide écrite « à la française ».</p>
            <div className="mt-3 divide-y divide-gray-100">
              {u.vocabulaire.map(v => (
                <div key={v.en} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">
                      {v.en} <span className="font-mono text-xs font-semibold text-sky-700">[{v.pron}]</span>
                    </p>
                    <p className="text-sm text-gray-500">{v.fr}</p>
                    {v.exempleEn && <p className="mt-0.5 text-sm text-gray-700 italic">“{v.exempleEn}”{v.exempleFr ? ` — ${v.exempleFr}` : ''}</p>}
                  </div>
                  {speech && (
                    <button
                      onClick={() => speakEn(v.exempleEn || v.en)}
                      className="p-2 bg-sky-50 text-sky-700 rounded-full shrink-0 ring-1 ring-sky-100"
                      aria-label={`Écouter : ${v.en}`}
                      data-testid="btn-ecouter-mot"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
            <h3 className="font-black text-gray-900">💬 Key sentences — Phrases clés</h3>
            <div className="mt-3 space-y-2">
              {u.phrasesCles.map(p => (
                <div key={p.en} className="flex items-center gap-3 rounded-xl bg-sky-50 ring-1 ring-sky-100 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sky-950">{p.en}</p>
                    <p className="text-sm text-gray-600">{p.fr}</p>
                  </div>
                  {speech && (
                    <button onClick={() => speakEn(p.en)} className="p-2 bg-white text-sky-700 rounded-full shrink-0 ring-1 ring-sky-200" aria-label="Écouter la phrase">
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {u.grammaire && (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
              <h3 className="font-black text-gray-900">📖 {u.grammaire.titreFr}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-800">{u.grammaire.regleFr}</p>
              <ul className="mt-3 space-y-2">
                {u.grammaire.exemples.map(e => (
                  <li key={e.en} className="border-l-4 border-indigo-200 pl-3 text-[15px] text-gray-800">
                    <strong>{e.en}</strong> <span className="text-gray-500">— {e.fr}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {u.dialogue && (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5">
              <h3 className="flex items-center gap-2 font-black text-gray-900"><MessagesSquare className="w-5 h-5" /> Dialogue</h3>
              <div className="mt-3 space-y-3">
                {u.dialogue.map((d, i) => (
                  <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 ${i % 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-wide ${i % 2 ? 'text-indigo-200' : 'text-gray-400'}`}>{d.speaker}</p>
                      <p className="font-semibold">{d.en}</p>
                      <p className={`text-xs ${i % 2 ? 'text-indigo-100' : 'text-gray-500'}`}>{d.fr}</p>
                    </div>
                    {speech && (
                      <button onClick={() => speakEn(d.en)} className="self-center ml-1 p-1.5 text-sky-700 shrink-0" aria-label="Écouter la réplique">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {speech && (
                <button
                  onClick={() => speakEn(u.dialogue!.map(d => d.en).join(' '))}
                  className="mt-4 w-full rounded-xl bg-sky-600 py-3 font-bold text-white inline-flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" /> Écouter tout le dialogue
                </button>
              )}
            </section>
          )}

          <section className="bg-amber-50 rounded-2xl shadow-sm ring-1 ring-amber-200 p-5">
            <h3 className="font-black text-amber-900">🎲 Activité de classe</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-amber-950">{u.activiteClasse}</p>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="anglais-exercice">
            <h3 className="font-black text-gray-900">📝 Exercise — Exercice</h3>
            <p className="mt-1 text-sm font-semibold text-gray-600">{u.exercice.consigneFr}</p>
            <ol className="mt-3 space-y-3">
              {u.exercice.items.map((it, i) => (
                <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <p className="text-[15px] text-gray-900"><strong>{i + 1}.</strong> {it.question}</p>
                  {showCorrection && <p className="mt-1 text-sm text-emerald-800">✔️ {it.reponse}</p>}
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowCorrection(v => !v)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white"
              data-testid="btn-corrige-anglais"
            >
              {showCorrection ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {showCorrection ? 'Masquer le corrigé' : 'Voir le corrigé'}
            </button>
          </section>

          <button onClick={() => setView({ kind: 'list' })} className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600">
            ← Toutes les unités
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
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5" data-testid="anglais-quiz">
              <p className="text-xs font-bold text-gray-400">QUESTION {qIndex + 1} / {ENGLISH_QUIZ.length}</p>
              <h2 className="mt-2 text-lg font-black text-gray-900">{ENGLISH_QUIZ[qIndex].questionFr}</h2>
              <div className="mt-4 space-y-2">
                {ENGLISH_QUIZ[qIndex].choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => { if (speech) speakEn(choice); answerQuiz(i); }}
                    className="w-full text-left rounded-xl ring-1 ring-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-800 active:bg-sky-50"
                    data-testid={`en-quiz-choix-${i}`}
                  >
                    {String.fromCharCode(65 + i)}. {choice}
                  </button>
                ))}
              </div>
              {qIndex > 0 && <p className="mt-4 text-xs text-gray-500">💡 Question précédente : {ENGLISH_QUIZ[qIndex - 1].explicationFr}</p>}
            </section>
          ) : (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 text-center" data-testid="anglais-quiz-resultat">
              <Trophy className="mx-auto w-14 h-14 text-amber-500" />
              <h2 className="mt-3 text-2xl font-black text-gray-900">{score} / {ENGLISH_QUIZ.length} — {score >= ENGLISH_QUIZ.length * 0.75 ? 'Well done! 🎉' : score >= ENGLISH_QUIZ.length / 2 ? 'Good job!' : 'Keep practising!'}</h2>
              <p className="mt-2 text-xs font-bold text-amber-700">🏆 Meilleur score sur cet appareil : {best} / {ENGLISH_QUIZ.length}</p>
              <div className="mt-5 text-left space-y-2">
                {ENGLISH_QUIZ.map((q, i) => (
                  <div key={i} className={`rounded-xl p-3 ring-1 ${answers[i] === q.answer ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
                    <p className="text-sm font-semibold text-gray-900">{answers[i] === q.answer ? '✅' : '❌'} {q.questionFr}</p>
                    <p className="mt-0.5 text-xs text-gray-600">Bonne réponse : <strong>{q.choices[q.answer]}</strong> — {q.explicationFr}</p>
                  </div>
                ))}
              </div>
              <button onClick={startQuiz} className="mt-5 w-full rounded-xl bg-sky-600 py-3.5 font-bold text-white">🔁 Try again — Recommencer</button>
              <button onClick={() => setView({ kind: 'list' })} className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-700">Retour aux unités</button>
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
            <strong>{ENGLISH_UNITS.length} unités</strong> pour faire parler anglais dès le primaire :
            se présenter, compter, les couleurs, la classe, le corps, la famille, les animaux,
            le marché, la météo, la journée et la politesse — <strong>{totalEnglishWords()} mots</strong> avec
            prononciation guidée et audio 🔊.
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher un mot : « goat », « mangue », « merci »…"
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-[15px]"
              data-testid="anglais-recherche"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {levelOptions.map(lv => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`px-3 py-2 rounded-full text-sm font-bold ring-1 ${level === lv ? 'bg-sky-700 text-white ring-sky-700' : 'bg-sky-50 text-sky-800 ring-sky-200'}`}
              >
                {lv === 'tout' ? 'Tous niveaux' : lv}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={startQuiz}
          className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-left text-white shadow"
          data-testid="btn-anglais-quiz"
        >
          <ListChecks className="w-8 h-8 shrink-0" />
          <span className="flex-1">
            <span className="block font-black">English Quiz — Teste ton anglais !</span>
            <span className="block text-white/90 text-xs">{ENGLISH_QUIZ.length} questions, corrigé expliqué{best > 0 ? ` · meilleur score : ${best}/${ENGLISH_QUIZ.length}` : ''}</span>
          </span>
          <ChevronRight className="w-6 h-6 shrink-0" />
        </button>

        <div className="space-y-3" data-testid="anglais-liste">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => openUnit(u)}
              className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 active:scale-[0.99]"
              data-testid={`en-unite-${u.id}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-2xl shrink-0">{u.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold text-gray-400">UNIT {ENGLISH_UNITS.indexOf(u) + 1} · {u.level}</span>
                <span className="block font-bold text-gray-900 leading-tight">{u.titleEn}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{u.titleFr} — {u.vocabulaire.length} mots</span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">
              No result for « {query} ». Essaie « cat », « famille », « marché »…
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500">
          🔊 L’audio utilise la voix anglaise du téléphone (si elle est installée). Sinon, suis la prononciation écrite entre crochets, « à la française », et fais répéter la classe en chœur.
        </p>
      </main>
    </div>
  );
}
