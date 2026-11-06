import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, Search, Check, Save, UserCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { ClassData, Student, Subject, Note, getClass, saveClass, generateId, sortStudents, isSecondaire, findNoteInEvaluation, evaluationsForClass, evaluationLabel, EvaluationId } from '../utils/database';
import { bmiLabel, calculateBMI } from '../utils/health';
import { normalizeSearch } from '../utils/textSearch';

// Couleur avatar déterministe à partir du nom
function avatarColor(name: string): string {
  const palette = [
    'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500',
    'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(nom: string, prenoms: string): string {
  const a = (nom || '').trim().charAt(0);
  const b = (prenoms || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
}

export default function StudentProfileEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /*
   * v50 — EVALUATION COURANTE.
   * La fiche eleve enregistrait ses notes SANS evaluation : saisir la
   * sommative 2 ECRASAIT la sommative 1 (meme eleve, meme matiere). Chaque
   * evaluation a desormais sa propre fiche, comme le bulletin.
   */
  const [evaluation, setEvaluation] = useState<EvaluationId | null>(null);

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  const evaluations = evaluationsForClass(classData);
  // Par defaut : la premiere evaluation proposee pour cette classe.
  const currentEvaluation: EvaluationId = evaluation ?? evaluations[0]?.id ?? ('sommative1' as EvaluationId);

  const students = sortStudents(classData.students);

  // Vue profil détaillé d'un élève
  if (selectedStudentId) {
    const student = classData.students.find(s => s.id === selectedStudentId);
    if (!student) {
      setSelectedStudentId(null);
      return null;
    }
    return (
      <StudentNoteForm
        classData={classData}
        student={student}
        evaluation={currentEvaluation}
        allStudents={students}
        onBack={() => setSelectedStudentId(null)}
        onNavigate={(sid) => setSelectedStudentId(sid)}
        onUpdate={setClassData}
      />
    );
  }

  // Calcul de complétion par élève
  function studentProgress(studentId: string): number {
    const total = classData!.subjects.length;
    if (total === 0) return 0;
    // La progression ne concerne QUE l'evaluation affichee : sinon un eleve
    // note en sommative 1 paraitrait deja saisi en sommative 2.
    const done = classData!.subjects.filter(subject => {
      const n = findNoteInEvaluation(classData!.notes, studentId, subject.id, currentEvaluation);
      return !!n && (n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent);
    }).length;
    return Math.round((done / total) * 100);
  }

  const nq = normalizeSearch(search);
  const filtered = students.filter(s => (
    normalizeSearch(s.nom).includes(nq) ||
    normalizeSearch(s.prenoms).includes(nq) ||
    normalizeSearch(s.matricule).includes(nq)
  ));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Profils des élèves</h1>
            <p className="text-gray-500 text-sm">{classData.name}</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun élève</p>
            <p className="text-gray-500 text-sm mb-4">Ajoutez d'abord des élèves à cette classe</p>
            <button
              onClick={() => navigate(`/class/${id}/students`)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg"
            >
              Gérer les élèves
            </button>
          </div>
        ) : (
          <>
            {/*
              v50 — SELECTEUR D'EVALUATION.
              Chaque evaluation a sa propre fiche eleve : la saisie de l'une
              n'ecrase plus celle des autres.
            */}
            <div className="bg-white rounded-xl shadow p-3 mb-4">
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">Fiche de l’évaluation</p>
              <div className="flex gap-2 overflow-x-auto pb-1" data-testid="selecteur-evaluation-fiches">
                {evaluations.map((ev) => {
                  const count = classData.notes.filter(n =>
                    n.evaluation === ev.id
                    || (n.evaluation === undefined && ev.id === 'sommative1')).length;
                  return (
                    <button
                      key={ev.id}
                      data-testid={`eval-fiche-${ev.id}`}
                      onClick={() => setEvaluation(ev.id)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold border ${
                        currentEvaluation === ev.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {ev.label}{count > 0 ? ` (${count})` : ''}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                💡 <strong>Chaque évaluation a sa propre fiche.</strong> Les notes saisies
                ici ne concernent que « {evaluationLabel(currentEvaluation, classData.customEvaluations)} ».
              </p>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Touchez un élève pour saisir toutes ses notes (toutes les matières).
            </p>
            {/* Recherche */}
            <div className="relative mb-4">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              {filtered.map((student) => {
                const progress = studentProgress(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className="w-full bg-white rounded-xl shadow p-3 flex items-center gap-3 text-left"
                  >
                    <div className={`${avatarColor(student.nom)} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
                      {initials(student.nom, student.prenoms)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {student.nom.toUpperCase()} {student.prenoms}
                      </p>
                      <p className="text-gray-500 text-xs">Mat: {student.matricule}</p>
                      {/* Barre de progression */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full h-1.5`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-9 text-right">{progress}%</span>
                      </div>
                    </div>
                    {progress === 100 && (
                      <div className="bg-emerald-100 text-emerald-600 rounded-full p-1 shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Formulaire de saisie des notes d'UN élève (toutes matières)
function StudentNoteForm({
  classData,
  student,
  evaluation,
  allStudents,
  onBack,
  onNavigate,
  onUpdate,
}: {
  classData: ClassData;
  student: Student;
  /** v50 : evaluation en cours de saisie. */
  evaluation: EvaluationId;
  allStudents: Student[];
  onBack: () => void;
  onNavigate: (studentId: string) => void;
  onUpdate: (data: ClassData) => void;
}) {
  const subjects: Subject[] = [...classData.subjects].sort((a, b) => a.order - b.order);
  const secondaire = isSecondaire(classData);

  // État local des notes de cet élève : subjectId -> {cm, cp, absent}
  const [entries, setEntries] = useState<Record<string, { cm: string; cp: string; absent: boolean }>>({});
  // Coefficients (secondaire) : subjectId -> string (modifiable)
  const [coefs, setCoefs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const init: Record<string, { cm: string; cp: string; absent: boolean }> = {};
    const initCoefs: Record<string, string> = {};
    for (const subject of subjects) {
      // v50 : on lit la note DE CETTE EVALUATION (et non la « meilleure »),
      // sinon la fiche afficherait la note d'une autre evaluation.
      const note = findNoteInEvaluation(classData.notes, student.id, subject.id, evaluation);
      init[subject.id] = {
        cm: note?.noteObtenue?.toString() ?? '',
        cp: note?.notePerfectionnement?.toString() ?? '',
        absent: note?.absent ?? false,
      };
      initCoefs[subject.id] = (subject.coefficient ?? 1).toString();
    }
    setEntries(init);
    setCoefs(initCoefs);
    // v50 : « evaluation » en dependance, sinon changer d'evaluation
    // laisserait a l'ecran les notes de la precedente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, evaluation]);

  function updateCoef(subjectId: string, value: string) {
    if (value === '') {
      setCoefs(prev => ({ ...prev, [subjectId]: '' }));
      return;
    }
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num) || num < 0 || num > 100) return;
    setCoefs(prev => ({ ...prev, [subjectId]: value }));
  }

  const currentIndex = allStudents.findIndex(s => s.id === student.id);

  function updateEntry(subjectId: string, field: 'cm' | 'cp', value: string, max: number) {
    // Autoriser vide, sinon valider <= max et >= 0
    if (value === '') {
      setEntries(prev => ({ ...prev, [subjectId]: { ...prev[subjectId], [field]: '' } }));
      return;
    }
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num) || num < 0 || num > max) return;
    setEntries(prev => ({ ...prev, [subjectId]: { ...prev[subjectId], [field]: value } }));
  }

  function toggleAbsent(subjectId: string) {
    setEntries(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], absent: !prev[subjectId].absent },
    }));
  }

  async function handleSave(thenGoTo?: string) {
    setSaving(true);
    try {
      let notes: Note[] = [...classData.notes];

      for (const subject of subjects) {
        const entry = entries[subject.id];
        if (!entry) continue;

        /*
         * v50 — LA CLE INCLUT L'EVALUATION.
         * Sans elle, saisir la sommative 2 remplacait la note de la
         * sommative 1 : le travail de l'enseignant etait detruit.
         * Les notes anciennes (sans evaluation) sont rattachees a la
         * sommative 1, conformement a `findNoteInEvaluation`.
         */
        const existingIndex = notes.findIndex(
          n => n.studentId === student.id && n.subjectId === subject.id
            && (n.evaluation === evaluation
              || (n.evaluation === undefined && evaluation === 'sommative1'))
        );

        const newNote: Note = {
          id: existingIndex >= 0 ? notes[existingIndex].id : generateId(),
          studentId: student.id,
          subjectId: subject.id,
          evaluation,
          noteObtenue: entry.absent ? null : (entry.cm !== '' ? parseFloat(entry.cm.replace(',', '.')) : null),
          notePerfectionnement: entry.absent ? null : (entry.cp !== '' ? parseFloat(entry.cp.replace(',', '.')) : null),
          absent: entry.absent,
          updatedAt: Date.now(),
        };

        if (existingIndex >= 0) {
          notes[existingIndex] = newNote;
        } else {
          notes.push(newNote);
        }
      }

      // Sauvegarder aussi les coefficients modifiés (secondaire)
      let updatedSubjects = classData.subjects;
      if (secondaire) {
        updatedSubjects = classData.subjects.map(subj => {
          const c = coefs[subj.id];
          if (c === undefined || c === '') return subj;
          const num = parseFloat(c.replace(',', '.'));
          return isNaN(num) ? subj : { ...subj, coefficient: num };
        });
      }

      const updated: ClassData = { ...classData, notes, subjects: updatedSubjects };
      await saveClass(updated);
      onUpdate(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);

      if (thenGoTo) onNavigate(thenGoTo);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  const prevStudent = currentIndex > 0 ? allStudents[currentIndex - 1] : null;
  const nextStudent = currentIndex < allStudents.length - 1 ? allStudents[currentIndex + 1] : null;
  const bmi = calculateBMI(student.weightKg, student.heightCm);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header profil */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className={`${avatarColor(student.nom)} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white/40`}>
            {initials(student.nom, student.prenoms)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{student.nom.toUpperCase()} {student.prenoms}</h1>
            <p className="text-emerald-100 text-sm">
              Mat: {student.matricule} • Élève {currentIndex + 1}/{allStudents.length}
            </p>
            {(student.weightKg || student.heightCm) && (
              <p className="text-emerald-100 text-xs">
                Santé : {student.weightKg || '-'} kg • {student.heightCm || '-'} cm • IMC {bmi ? bmi.toFixed(1) : '-'} ({bmiLabel(bmi)})
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 pb-40">
        <p className="text-gray-600 text-sm mb-3">
          {secondaire
            ? 'Saisissez la note /20 et le coefficient de chaque matière. Le total est calculé automatiquement.'
            : 'Remplissez les notes de chaque matière/domaine.'}
        </p>

        <div className="space-y-3">
          {subjects.map((subject) => {
            const entry = entries[subject.id] || { cm: '', cp: '', absent: false };
            const coefStr = coefs[subject.id] ?? '1';
            const coefNum = parseFloat((coefStr || '0').replace(',', '.')) || 0;
            const noteNum = entry.cm !== '' ? parseFloat(entry.cm.replace(',', '.')) : null;
            const totalObtenu = noteNum !== null ? noteNum * coefNum : null;
            const totalPossible = 20 * coefNum;
            return (
              <div key={subject.id} className={`bg-white rounded-xl shadow p-4 border-2 ${entry.absent ? 'border-red-200' : 'border-transparent'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">{subject.name}</h3>
                  <button
                    onClick={() => toggleAbsent(subject.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      entry.absent
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {entry.absent ? '✓ Absent' : 'Absent'}
                  </button>
                </div>

                {/* SECONDAIRE : Note /20 × Coefficient = Total obtenu / Total possible */}
                {secondaire && !entry.absent && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Note obtenue /20</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={20}
                          value={entry.cm}
                          onChange={(e) => updateEntry(subject.id, 'cm', e.target.value, 20)}
                          placeholder="0"
                          className="w-full p-3 text-lg font-semibold text-center border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Coefficient (×)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={coefStr}
                          onChange={(e) => updateCoef(subject.id, e.target.value)}
                          placeholder="1"
                          className="w-full p-3 text-lg font-semibold text-center border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Total obtenu</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {totalObtenu !== null ? totalObtenu.toFixed(2) : '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Total possible</p>
                        <p className="text-lg font-bold text-gray-700">{totalPossible.toFixed(0)}</p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-2">
                      {entry.cm || '0'} × {coefStr || '0'} = {totalObtenu !== null ? totalObtenu.toFixed(2) : '0'} / {totalPossible.toFixed(0)}
                    </p>
                  </>
                )}

                {/* PRIMAIRE (CM + CP) ou PRÉSCOLAIRE (note simple si pas de CP) */}
                {!secondaire && !entry.absent && (
                  <div className={`grid ${subject.notePerfectionnementMax > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {subject.notePerfectionnementMax > 0
                          ? `Critères minimaux (CM) /${subject.noteObtenueMax}`
                          : `Note /${subject.noteObtenueMax}`}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={subject.noteObtenueMax}
                        value={entry.cm}
                        onChange={(e) => updateEntry(subject.id, 'cm', e.target.value, subject.noteObtenueMax)}
                        placeholder="0"
                        className="w-full p-3 text-lg font-semibold text-center border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    {subject.notePerfectionnementMax > 0 && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Note de perfectionnement (CP) /{subject.notePerfectionnementMax}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={subject.notePerfectionnementMax}
                          value={entry.cp}
                          onChange={(e) => updateEntry(subject.id, 'cp', e.target.value, subject.notePerfectionnementMax)}
                          placeholder="0"
                          className="w-full p-3 text-lg font-semibold text-center border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {entry.absent && (
                  <p className="text-red-500 text-sm text-center py-2 bg-red-50 rounded-lg">
                    Élève absent pour cette matière
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Barre d'action fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 space-y-2">
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            savedFlash ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white'
          } disabled:opacity-50`}
        >
          {savedFlash ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {savedFlash ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Enregistrer les notes'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => prevStudent && handleSave(prevStudent.id)}
            disabled={!prevStudent || saving}
            className="bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </button>
          <button
            onClick={() => nextStudent && handleSave(nextStudent.id)}
            disabled={!nextStudent || saving}
            className="bg-emerald-50 text-emerald-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-1 disabled:opacity-40"
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
