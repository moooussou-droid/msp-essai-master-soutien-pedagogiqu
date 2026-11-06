import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { BookMarked, ChevronLeft, Plus, Printer, Search, Square, Trash2, Volume2, X } from 'lucide-react';
import QuizContestPanel from './QuizContestPanel';
import { hasAdminRole } from '../utils/adminSession';
import { getVideoEmbed } from '../utils/courseMarketplace';
import { illustrate } from '../utils/svgIllustration';
import { normalizeSearch } from '../utils/textSearch';
import { pickDailyToday } from '../utils/dailyContent';
import { isSpeechSupported, useTextToSpeech, warmVoices } from '../utils/speech';
import {
  generateQuiz, loadBestScore, saveBestScore, quizMessage,
  generateLevel, loadProgress, recordLevelResult, recordWeeklyScore,
  weeklyChampion, weeklyLeaderboard, totalPoints, levelTier, isLevelUnlocked,
  LEVELS_COUNT, QUESTIONS_PER_LEVEL, PASS_THRESHOLD, previousWeekId,
} from '../utils/kidsQuiz';
import { getProfile } from '../utils/userProfile';
import { printFlashcards } from '../utils/flashcards';
import { JUNIOR_WORDS } from '../utils/encartaJuniorData';
import { DICTIONARY_PACK } from '../utils/kidsDictionaryPack';

interface KidWord {
  word: string;
  definition: string;
  example: string;
  family: string;
  imageUrl?: string;
  videoUrl?: string;
}

const CUSTOM_KEY = 'msp_kids_dictionary_custom_words';

function loadCustomWords(): KidWord[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
}
function saveCustomWords(words: KidWord[]) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(words)); }

const WORDS: KidWord[] = [
  ['Addition', 'Une addition sert à mettre ensemble plusieurs nombres pour trouver un total.', '2 + 3 = 5.', 'Mathématiques'],
  ['Soustraction', 'Une soustraction sert à enlever une quantité d’une autre.', '8 - 3 = 5.', 'Mathématiques'],
  ['Multiplication', 'Une multiplication est une addition répétée.', '3 × 4 veut dire 4 + 4 + 4.', 'Mathématiques'],
  ['Division', 'Une division sert à partager en parts égales.', '12 bonbons partagés entre 3 enfants donnent 4 bonbons chacun.', 'Mathématiques'],
  ['Phrase', 'Une phrase est un groupe de mots qui a un sens.', 'Le chat dort.', 'Français'],
  ['Verbe', 'Le verbe indique souvent une action ou un état.', 'courir, manger, être.', 'Français'],
  ['Nom', 'Un nom désigne une personne, un animal, une chose ou un lieu.', 'élève, chien, cahier, école.', 'Français'],
  ['Adjectif', 'Un adjectif donne une information sur un nom.', 'un joli dessin.', 'Français'],
  ['Microbe', 'Un microbe est un être très petit qui peut parfois rendre malade.', 'Se laver les mains aide à éviter les microbes.', 'Santé'],
  ['Vaccin', 'Un vaccin aide le corps à se défendre contre une maladie.', 'Le vaccin protège l’enfant.', 'Santé'],
  ['Hygiène', 'L’hygiène est l’ensemble des gestes pour rester propre et en bonne santé.', 'Se laver les mains avant de manger.', 'Santé'],
  ['Citoyen', 'Un citoyen est une personne qui appartient à un pays et respecte ses règles.', 'Un citoyen respecte les lois.', 'Citoyenneté'],
  ['Respect', 'Le respect consiste à bien se comporter avec les autres.', 'On écoute quand quelqu’un parle.', 'Citoyenneté'],
  ['Drapeau', 'Un drapeau est un symbole qui représente un pays ou un groupe.', 'Le drapeau du Bénin est vert, jaune et rouge.', 'Bénin'],
  ['Carte', 'Une carte est un dessin qui représente un lieu.', 'Une carte montre les villes et les routes.', 'Géographie'],
  ['Fleuve', 'Un fleuve est un grand cours d’eau qui se jette dans la mer.', 'Le fleuve Niger traverse plusieurs pays.', 'Géographie'],
  ['Plante', 'Une plante est un être vivant qui pousse dans la terre ou dans l’eau.', 'Le maïs est une plante.', 'Sciences'],
  ['Animal', 'Un animal est un être vivant qui respire et se nourrit.', 'La chèvre est un animal.', 'Sciences'],
  ['Énergie', 'L’énergie permet de faire fonctionner des objets ou de produire un effort.', 'Le soleil donne de l’énergie.', 'Sciences'],
  ['Internet', 'Internet permet d’échanger des informations avec un téléphone ou un ordinateur.', 'On peut apprendre en ligne.', 'Hightech'],
  ['Ordinateur', 'Un ordinateur est une machine qui aide à écrire, calculer et apprendre.', 'Le maître prépare un document sur ordinateur.', 'Hightech'],
  ['Agriculture', 'L’agriculture consiste à cultiver la terre et élever des animaux.', 'Le cultivateur plante du maïs.', 'Agriculture'],
  ['Épargne', 'L’épargne est l’argent qu’on garde pour plus tard.', 'Je garde une partie de mon argent.', 'Finance'],
  ['Métier', 'Un métier est un travail qu’on apprend pour rendre service et gagner sa vie.', 'Médecin, enseignant, mécanicien.', 'Orientation'],
].map(([word, definition, example, family]) => ({ word, definition, example, family }));

const imageUrl = (item: KidWord) => item.imageUrl || illustrate(`${item.word} école enfant`, item.word);
const videoId = (word: string) => {
  const w = word.toLowerCase();
  if (w.includes('addition') || w.includes('multiplication') || w.includes('division')) return '4O8X7xG6dpA';
  if (w.includes('phrase') || w.includes('verbe') || w.includes('nom')) return 'VeSUzYblKio';
  if (w.includes('microbe') || w.includes('vaccin') || w.includes('hygiène')) return 'tZ4lCI6Pyoo';
  return 'KCGamQMZ7Nk';
};

type QuizMode = 'off' | 'playing' | 'done';

export default function KidsDictionaryScreen() {
  const goBack = useSmartBack();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('Toutes');
  const [selected, setSelected] = useState<KidWord | null>(null);
  const [customWords, setCustomWords] = useState<KidWord[]>(loadCustomWords());
  const adminUnlocked = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const [newWord, setNewWord] = useState<KidWord>({ word: '', definition: '', example: '', family: 'Général', imageUrl: '', videoUrl: '' });

  // Quiz « Devine le mot »
  const [quizMode, setQuizMode] = useState<QuizMode>('off');
  const [quizQuestions, setQuizQuestions] = useState<ReturnType<typeof generateQuiz>>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState(loadBestScore());
  // v36 — quiz en 100 niveaux de 10 questions
  const [level, setLevel] = useState<number>(() => loadProgress().unlocked);
  const [progress, setProgress] = useState(() => loadProgress());
  const [showLevels, setShowLevels] = useState(false);
  const [champion, setChampion] = useState(() => weeklyChampion(previousWeekId()) || weeklyChampion());
  const [board, setBoard] = useState(() => weeklyLeaderboard());

  const allWords = useMemo(() => {
    const base = [...WORDS];
    // Contenu supplémentaire pour les petits (animaux, espace, corps, monde…)
    for (const extra of JUNIOR_WORDS) {
      if (!base.some(b => b.word.toLowerCase() === extra.word.toLowerCase())) base.push(extra);
    }
    // v36 : corpus étendu (animaux, corps, école, nature, métiers, Bénin…)
    for (const extra of DICTIONARY_PACK) {
      if (!base.some(b => b.word.toLowerCase() === extra.word.toLowerCase())) base.push(extra);
    }
    for (const custom of customWords) {
      const idx = base.findIndex(w => w.word.toLowerCase() === custom.word.toLowerCase());
      if (idx >= 0) base[idx] = custom;
      else base.push(custom);
    }
    return base;
  }, [customWords]);
  const families = ['Toutes', ...Array.from(new Set(allWords.map(w => w.family)))];
  const nq = normalizeSearch(query);
  const filtered = useMemo(() => allWords.filter(w => (family === 'Toutes' || w.family === family) && normalizeSearch(`${w.word} ${w.definition} ${w.example} ${w.family}`).includes(nq)), [query, family, allWords, nq]);
  const dailyWord = useMemo(() => pickDailyToday(allWords), [allWords]);
  const question = quizQuestions[quizIndex];

  useEffect(() => { warmVoices(); }, []);

  function saveWord() {
    if (!newWord.word.trim()) return alert('Ajoutez un mot.');
    const next = [...customWords.filter(w => w.word.toLowerCase() !== newWord.word.toLowerCase()), newWord];
    setCustomWords(next); saveCustomWords(next);
    setNewWord({ word: '', definition: '', example: '', family: 'Général', imageUrl: '', videoUrl: '' });
  }

  function deleteWord(word: string) {
    if (!confirm(`Supprimer le mot « ${word} » ?`)) return;
    const next = customWords.filter(w => w.word.toLowerCase() !== word.toLowerCase());
    setCustomWords(next); saveCustomWords(next);
  }

  /** Lance un NIVEAU du quiz (10 questions). */
  function startLevel(lvl: number) {
    if (!isLevelUnlocked(lvl, progress)) {
      alert(`Le niveau ${lvl} n'est pas encore ouvert.\n\nRéussis le niveau ${progress.unlocked} (au moins ${PASS_THRESHOLD} bonnes réponses sur ${QUESTIONS_PER_LEVEL}) pour le débloquer.`);
      return;
    }
    const questions = generateLevel(allWords, lvl);
    setLevel(lvl);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizPicked(null);
    setShowLevels(false);
    setQuizMode('playing');
  }

  function startQuiz() {
    startLevel(progress.unlocked);
  }

  function pickOption(opt: string) {
    if (!question || quizPicked) return;
    setQuizPicked(opt);
    if (opt === question.correct) {
      const newScore = quizScore + 1;
      setQuizScore(newScore);
      const newBest = Math.max(bestScore, newScore);
      setBestScore(newBest);
      saveBestScore(newScore);
    }
  }

  function nextQuestion() {
    if (quizIndex + 1 >= quizQuestions.length) {
      // Fin du niveau : progression + classement de la semaine.
      const p = recordLevelResult(level, quizScore);
      setProgress(p);
      const player = (getProfile().teacherName || '').trim() || 'Élève';
      setBoard(recordWeeklyScore(player, totalPoints(p), p.unlocked));
      setChampion(weeklyChampion(previousWeekId()) || weeklyChampion());
      setQuizMode('done');
    } else {
      setQuizIndex(quizIndex + 1);
      setQuizPicked(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow"><div className="flex items-center gap-3"><button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button><div><h1 className="font-bold text-lg">Dictionnaire des petits écoliers</h1><p className="text-emerald-100 text-sm">Mots faciles pour les petits : animaux, espace, corps, monde…</p></div></div></header>
      <main className="p-4 pb-24 max-w-5xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4"><h2 className="font-black text-gray-900">Comprendre les mots simplement</h2><p className="text-gray-500 text-sm">Définition facile, exemple, image, voix et vidéo pour chaque mot — du vocabulaire scolaire aux animaux, à l'espace et au monde, comme dans une encyclopédie junior.</p><div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher un mot... (sans tenir compte des accents)" className="w-full pl-10 pr-4 py-3 border rounded-lg" /></div></section>

        {/* ⭐ Le mot du jour */}
        {dailyWord && (
          <section className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl shadow p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-900/70 uppercase">Le mot du jour</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-amber-950">{dailyWord.word}</h2>
                  {isSpeechSupported() && <DailySpeakButton word={dailyWord} />}
                </div>
                <p className="text-sm text-amber-950/80 line-clamp-2">{dailyWord.definition}</p>
              </div>
            </div>
          </section>
        )}

        {/* 🎓 Devine le mot */}
        {/* v39 — le quiz est un CONCOURS hebdomadaire : inscription « Je participe ». */}
        {quizMode === 'off' && <QuizContestPanel />}

        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          {quizMode === 'off' && (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎓</span>
                <div className="flex-1">
                  <h2 className="font-black text-gray-900">Devine le mot — {LEVELS_COUNT} niveaux</h2>
                  <p className="text-gray-500 text-sm">
                    {QUESTIONS_PER_LEVEL} questions par niveau. Réussis {PASS_THRESHOLD}/{QUESTIONS_PER_LEVEL} pour ouvrir le niveau suivant.
                  </p>
                </div>
              </div>

              {/* Progression */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 p-2">
                  <p className="text-lg font-black text-emerald-700">{progress.unlocked}</p>
                  <p className="text-[10px] text-gray-500">Niveau actuel</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2">
                  <p className="text-lg font-black text-amber-700">{totalPoints(progress)}</p>
                  <p className="text-[10px] text-gray-500">Points cumulés</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2">
                  <p className="text-sm font-black text-blue-700 leading-tight pt-1">{levelTier(progress.unlocked)}</p>
                  <p className="text-[10px] text-gray-500">Palier</p>
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(progress.unlocked / LEVELS_COUNT) * 100}%` }} />
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={startQuiz} className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold">
                  Jouer le niveau {progress.unlocked}
                </button>
                <button onClick={() => setShowLevels(v => !v)} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold">
                  {showLevels ? 'Masquer' : 'Tous les niveaux'}
                </button>
              </div>

              {/* Grille des 100 niveaux */}
              {showLevels && (
                <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                  {Array.from({ length: LEVELS_COUNT }, (_, i) => i + 1).map(n => {
                    const open = isLevelUnlocked(n, progress);
                    const score = progress.best[n];
                    return (
                      <button
                        key={n}
                        onClick={() => startLevel(n)}
                        disabled={!open}
                        title={open ? `Niveau ${n} — ${levelTier(n)}${score !== undefined ? ` (meilleur : ${score}/10)` : ''}` : 'Niveau verrouillé'}
                        className={`aspect-square rounded-lg text-[11px] font-bold ${
                          !open ? 'bg-gray-100 text-gray-300'
                          : score >= PASS_THRESHOLD ? 'bg-emerald-600 text-white'
                          : score !== undefined ? 'bg-amber-100 text-amber-800'
                          : 'bg-white border-2 border-emerald-300 text-emerald-700'
                        }`}
                      >
                        {open ? n : '🔒'}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 🏆 Champion de la semaine (lundi → dimanche) */}
              {champion && (
                <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 p-3 text-amber-950">
                  <p className="text-[11px] font-bold uppercase tracking-wide">🏆 Meilleur score de la semaine</p>
                  <p className="text-lg font-black">{champion.name}</p>
                  <p className="text-xs font-semibold">
                    {champion.points} points • niveau {champion.level} • semaine {champion.week}
                  </p>
                </div>
              )}
              {board.length > 1 && (
                <div className="mt-2 rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Classement de la semaine en cours</p>
                  {board.slice(0, 5).map((r, i) => (
                    <div key={r.name} className="flex justify-between text-xs py-0.5">
                      <span>{i + 1}. {r.name}</span>
                      <span className="font-bold text-emerald-700">{r.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {quizMode === 'playing' && question && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-emerald-700 uppercase">
                  Niveau {level} ({levelTier(level)}) • Question {quizIndex + 1} / {quizQuestions.length}
                </p>
                <button onClick={() => setQuizMode('off')} className="text-gray-400 text-sm">Quitter</button>
              </div>
              <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-4">
                <button
                  onClick={() => speakTextSafe(`${question.question}${question.example ? ' Exemple : ' + question.example : ''}`)}
                  className="bg-amber-100 text-amber-800 p-2.5 rounded-full shrink-0"
                  title="Écouter la définition"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{question.question}</p>
                  {/* v39 — l'exemple est expurgé du mot à trouver (maskAnswer) ;
                      l'exemple complet n'est révélé qu'APRÈS la réponse. */}
                  {question.example && (
                    <p className="text-sm text-gray-500 mt-1">
                      Exemple : {quizPicked ? question.example.replace(/…/g, question.correct.toLowerCase()) : question.example}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {question.options.map(opt => {
                  const isCorrect = opt === question.correct;
                  const revealed = quizPicked !== null;
                  const good = revealed && isCorrect;
                  const bad = revealed && quizPicked === opt && !isCorrect;
                  return (
                    <button
                      key={opt}
                      onClick={() => pickOption(opt)}
                      disabled={revealed}
                      className={`p-3 rounded-xl border-2 font-bold text-left transition-colors ${good ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : bad ? 'bg-red-50 border-red-400 text-red-700' : revealed ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400'}`}
                    >
                      {opt} {good && '✅'} {bad && '❌'}
                    </button>
                  );
                })}
              </div>
              {quizPicked && (
                <button onClick={nextQuestion} className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">
                  {quizIndex + 1 >= quizQuestions.length ? 'Voir mon résultat' : 'Question suivante'}
                </button>
              )}
            </div>
          )}
          {quizMode === 'done' && (
            <div className="text-center py-2">
              <p className="text-xs font-bold uppercase text-gray-400">Niveau {level} — {levelTier(level)}</p>
              <p className="text-5xl font-black text-emerald-700">{quizScore} / {quizQuestions.length}</p>
              <p className="font-bold text-gray-800 mt-2 text-lg">{quizMessage(quizScore, quizQuestions.length)}</p>
              {quizScore >= PASS_THRESHOLD ? (
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  ✅ Niveau réussi ! {level < LEVELS_COUNT ? `Le niveau ${level + 1} est débloqué.` : 'Tu as terminé les 100 niveaux, champion !'}
                </p>
              ) : (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                  Il faut {PASS_THRESHOLD}/{QUESTIONS_PER_LEVEL} pour ouvrir le niveau suivant. Réessaie !
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">Points cumulés : {totalPoints(progress)}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => startLevel(level)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Recommencer</button>
                {quizScore >= PASS_THRESHOLD && level < LEVELS_COUNT && (
                  <button onClick={() => startLevel(level + 1)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">
                    Niveau {level + 1}
                  </button>
                )}
                <button onClick={() => setQuizMode('off')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">Fermer</button>
              </div>
            </div>
          )}
        </section>

        {adminUnlocked && <section className="bg-white rounded-2xl shadow p-4 mb-4"><h2 className="font-bold text-gray-900">Gestion du dictionnaire</h2><div className="mt-3 grid gap-2"><input value={newWord.word} onChange={e => setNewWord({ ...newWord, word: e.target.value })} placeholder="Mot" className="p-3 border rounded-lg" /><input value={newWord.family} onChange={e => setNewWord({ ...newWord, family: e.target.value })} placeholder="Famille" className="p-3 border rounded-lg" /><input value={newWord.definition} onChange={e => setNewWord({ ...newWord, definition: e.target.value })} placeholder="Définition facile" className="p-3 border rounded-lg" /><input value={newWord.example} onChange={e => setNewWord({ ...newWord, example: e.target.value })} placeholder="Exemple" className="p-3 border rounded-lg" /><input value={newWord.imageUrl} onChange={e => setNewWord({ ...newWord, imageUrl: e.target.value })} placeholder="Lien image" className="p-3 border rounded-lg" /><input value={newWord.videoUrl} onChange={e => setNewWord({ ...newWord, videoUrl: e.target.value })} placeholder="Lien vidéo YouTube/Facebook/TikTok" className="p-3 border rounded-lg" /><button onClick={saveWord} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold"><Plus className="w-4 h-4 inline mr-1" /> Ajouter / modifier</button>
          {customWords.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Mots personnalisés ({customWords.length})</p>
              {customWords.map(c => (
                <div key={c.word} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{c.word} <span className="text-xs text-gray-400">({c.family})</span></p>
                  <button onClick={() => deleteWord(c.word)} className="text-red-500 p-1.5" title="Supprimer ce mot"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div></section>}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">{families.map(f => <button key={f} onClick={() => setFamily(f)} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm ${family === f ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>{f}</button>)}</div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{query ? `🔎 ${filtered.length} résultat${filtered.length > 1 ? 's' : ''} — ` : ''}{filtered.length} mot{filtered.length > 1 ? 's' : ''} {family === 'Toutes' ? '' : `· ${family}`}</p>
          <button
            onClick={() => printFlashcards(filtered.map(w => ({ title: w.word, subtitle: w.family, body: `${w.definition}${w.example ? ' Exemple : ' + w.example : ''}` })), { title: `Le dictionnaire — ${family === 'Toutes' ? 'tous les mots' : family}`, subtitle: 'Cartes à découper : l’élève lit le mot, donne la définition, puis vérifie au verso.' })}
            className="shrink-0 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            title="Imprimer les cartes des mots affichés"
          >
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimer les cartes</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{filtered.map(item => <button key={item.word} onClick={() => setSelected(item)} className="bg-white rounded-2xl shadow text-left overflow-hidden"><img src={imageUrl(item)} alt={item.word} className="w-full h-28 object-cover bg-gray-100" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /><div className="p-4"><div className="flex items-center gap-2"><BookMarked className="w-5 h-5 text-emerald-600" /><h2 className="font-black text-gray-900">{item.word}</h2></div><p className="text-xs text-emerald-700 mt-1">{item.family}</p><p className="text-gray-700 text-sm mt-2 line-clamp-3">{item.definition}</p></div></button>)}</div>
      </main>
      {selected && <KidWordModal word={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DailySpeakButton({ word }: { word: KidWord }) {
  const { speaking, speak, stop } = useTextToSpeech();
  return (
    <button
      onClick={() => (speaking ? stop() : speak(`${word.word}. ${word.definition} Exemple : ${word.example}`))}
      className={`p-2 rounded-full ${speaking ? 'bg-amber-950 text-amber-100' : 'bg-white/70 text-amber-900'}`}
      title={speaking ? 'Arrêter' : 'Écouter le mot'}
    >
      {speaking ? <Square className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}

function speakTextSafe(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* silencieux */ }
}

function KidWordModal({ word, onClose }: { word: KidWord; onClose: () => void }) {
  const { speaking, speak, stop } = useTextToSpeech();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const embed = word.videoUrl ? getVideoEmbed(word.videoUrl) : `https://www.youtube-nocookie.com/embed/${videoId(word.word)}?rel=0&modestbranding=1&playsinline=1`;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden">
        <div className="relative">
          <img src={imageUrl(word)} alt={word.word} className="w-full h-48 object-cover bg-gray-100" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/90 p-2 rounded-lg"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-5">
          <p className="text-emerald-700 font-bold text-sm">{word.family}</p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-gray-900">{word.word}</h2>
            {isSpeechSupported() && (
              <button onClick={() => (speaking ? stop() : speak(`${word.word}. ${word.definition} Exemple : ${word.example}`))} className={`p-2.5 rounded-full ${speaking ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`} title={speaking ? 'Arrêter la lecture' : 'Écouter'}>
                {speaking ? <Square className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            )}
          </div>
          <p className="text-lg text-gray-700 mt-3">{word.definition}</p>
          <p className="text-emerald-700 font-semibold mt-3">Exemple : {word.example}</p>
          {embed && online ? (
            <div className="mt-5 aspect-video bg-black rounded-xl overflow-hidden"><iframe src={embed} title={word.word} className="w-full h-full" allowFullScreen /></div>
          ) : embed ? (
            <div className="mt-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center text-gray-500 text-sm">📡 Vidéo en ligne mais vous êtes hors connexion pour le moment.</div>
          ) : null}
          <button onClick={onClose} className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">J’ai compris</button>
        </div>
      </div>
    </div>
  );
}
