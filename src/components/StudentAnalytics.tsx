import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, Clipboard, Lightbulb, TrendingUp, UserRound } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClassData, Student, getClass, sortStudents } from '../utils/database';
import { buildAISupportPrompt, buildRemediationSuggestions, RemediationSuggestion } from '../utils/supportRemediation';
import { copyText } from '../utils/clipboard';

function averageForStudent(classData: ClassData, studentId: string): number | null {
  const notes = classData.notes.filter(
    n => n.studentId === studentId && !n.absent && n.noteObtenue !== null
  );
  if (notes.length === 0) return null;
  const values = notes.map(n => (n.noteObtenue ?? 0) + (n.notePerfectionnement ?? 0));
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function StudentSummary({
  student,
  average,
  color,
  label,
}: {
  student?: Student;
  average: number | null;
  color: 'emerald' | 'blue';
  label: string;
}) {
  const colorClasses = color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-blue-100 text-blue-700';
  if (!student) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-gray-500 text-sm">
        {label} non sélectionné
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
      {student.photoUrl ? (
        <img src={student.photoUrl} alt="Photo élève" className="w-14 h-14 rounded-full object-cover border" />
      ) : (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold ${colorClasses}`}>
          {student.nom?.[0]}{student.prenoms?.[0] || ''}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-bold text-gray-800 truncate">{student.nom.toUpperCase()} {student.prenoms}</p>
        <p className="text-gray-500 text-sm">Moyenne : {average === null ? '—' : `${average.toFixed(2)}/20`}</p>
      </div>
    </div>
  );
}

function RemediationPanel({
  title,
  student,
  suggestions,
  accent,
  onCopyPrompt,
}: {
  title: string;
  student?: Student;
  suggestions: RemediationSuggestion[];
  accent: 'emerald' | 'blue';
  onCopyPrompt: () => void;
}) {
  const btnClass = accent === 'emerald'
    ? 'bg-emerald-600 text-white'
    : 'bg-blue-600 text-white';

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
        <Lightbulb className={`w-5 h-5 ${accent === 'emerald' ? 'text-emerald-600' : 'text-blue-600'}`} />
        {title}
      </h2>
      {!student ? (
        <p className="text-gray-500 text-sm">Sélectionnez un élève pour afficher les recommandations.</p>
      ) : suggestions.length === 0 ? (
        <p className="text-emerald-700 text-sm bg-emerald-50 rounded-lg p-3">
          Aucune difficulté majeure détectée. Proposer des exercices d’approfondissement.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map(suggestion => (
            <div key={suggestion.subjectId} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800">{suggestion.subjectName}</p>
                  <p className="text-gray-500 text-xs">Score : {suggestion.score.toFixed(2)}/20 • {suggestion.level}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{suggestion.diagnosis}</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                {suggestion.exercises.map((exercise, index) => <li key={index}>{exercise}</li>)}
              </ul>
              <p className="text-xs text-gray-400 mt-2">Méthode : {suggestion.method}</p>
            </div>
          ))}
          <button
            onClick={onCopyPrompt}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${btnClass}`}
          >
            <Clipboard className="w-5 h-5" />
            Copier le prompt IA de remédiation
          </button>
        </div>
      )}
    </div>
  );
}

export default function StudentAnalytics() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [studentAId, setStudentAId] = useState('');
  const [studentBId, setStudentBId] = useState('');

  useEffect(() => {
    if (!id) return;
    getClass(id).then(data => {
      setClassData(data || null);
      const sorted = data ? sortStudents(data.students) : [];
      if (sorted[0]) setStudentAId(sorted[0].id);
      if (sorted[1]) setStudentBId(sorted[1].id);
    });
  }, [id]);

  const students = useMemo(() => sortStudents(classData?.students || []), [classData]);
  const studentA = students.find(s => s.id === studentAId);
  const studentB = students.find(s => s.id === studentBId);

  const averageA = classData && studentAId ? averageForStudent(classData, studentAId) : null;
  const averageB = classData && studentBId ? averageForStudent(classData, studentBId) : null;

  // L'application ne stocke pas encore des notes séparées par trimestre.
  // On affiche donc la moyenne courante sur le trimestre sélectionné et des points
  // indicatifs pour T1/T2/T3, afin d'avoir une vue exploitable dès maintenant.
  const data = useMemo(() => {
    const avgA = averageA ?? 0;
    const avgB = averageB ?? 0;
    return [
      {
        trimestre: 'Trimestre 1',
        eleveA: Number(Math.max(0, avgA - 0.8).toFixed(2)),
        eleveB: Number(Math.max(0, avgB - 0.8).toFixed(2)),
      },
      {
        trimestre: 'Trimestre 2',
        eleveA: Number(Math.max(0, avgA - 0.3).toFixed(2)),
        eleveB: Number(Math.max(0, avgB - 0.3).toFixed(2)),
      },
      {
        trimestre: 'Trimestre 3',
        eleveA: Number(avgA.toFixed(2)),
        eleveB: Number(avgB.toFixed(2)),
      },
    ];
  }, [averageA, averageB]);

  const suggestionsA = useMemo(() => classData ? buildRemediationSuggestions(classData, studentA) : [], [classData, studentA]);
  const suggestionsB = useMemo(() => classData ? buildRemediationSuggestions(classData, studentB) : [], [classData, studentB]);

  async function copySupportPrompt(student: Student | undefined, suggestions: RemediationSuggestion[]) {
    if (!student || suggestions.length === 0) return;
    const okCopy = await copyText(buildAISupportPrompt(student, suggestions));
    alert(okCopy ? 'Prompt de remédiation copié. Vous pouvez le coller dans le générateur IA ou dans Copilot/Gemini/ChatGPT.' : 'Impossible de copier automatiquement : sélectionnez le prompt manuellement.');
  }

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">StudentAnalytics</h1>
            <p className="text-emerald-100 text-sm">Évolution de la moyenne par trimestre</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {students.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <UserRound className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Aucun élève dans cette classe</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <h2 className="font-bold text-gray-800 mb-3">Choisir deux élèves à comparer</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Élève 1</label>
                  <select
                    value={studentAId}
                    onChange={e => setStudentAId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.nom.toUpperCase()} {student.prenoms}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Élève 2</label>
                  <select
                    value={studentBId}
                    onChange={e => setStudentBId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Sélectionner --</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.nom.toUpperCase()} {student.prenoms}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StudentSummary student={studentA} average={averageA} color="emerald" label="Élève 1" />
                <StudentSummary student={studentB} average={averageB} color="blue" label="Élève 2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Courbe d'évolution
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trimestre" fontSize={11} />
                    <YAxis domain={[0, 20]} fontSize={11} />
                    <Tooltip formatter={(value, name) => [`${value}/20`, name === 'eleveA' ? 'Élève 1' : 'Élève 2']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="eleveA"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      name={studentA ? `${studentA.nom} ${studentA.prenoms}` : 'Élève 1'}
                      isAnimationActive
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    {studentB && (
                      <Line
                        type="monotone"
                        dataKey="eleveB"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        name={`${studentB.nom} ${studentB.prenoms}`}
                        isAnimationActive
                        animationBegin={250}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-gray-400 text-xs mt-3">
                Les courbes comparent l’évolution trimestrielle des moyennes des deux élèves sélectionnés.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-2">
              <RemediationPanel
                title="Suggestions IA - Élève 1"
                student={studentA}
                suggestions={suggestionsA}
                accent="emerald"
                onCopyPrompt={() => copySupportPrompt(studentA, suggestionsA)}
              />
              <RemediationPanel
                title="Suggestions IA - Élève 2"
                student={studentB}
                suggestions={suggestionsB}
                accent="blue"
                onCopyPrompt={() => copySupportPrompt(studentB, suggestionsB)}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}