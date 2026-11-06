/**
 * BILAN ANNUEL (v36) — synthèse des évaluations : MOYENNES et PRÉSENCES.
 *
 * À la Maternelle et au Primaire, chaque évaluation possède désormais son
 * propre bulletin (écran Bulletins). La SYNTHÈSE de toutes les évaluations
 * n'est donc plus mélangée aux bulletins : elle est regroupée ici.
 *
 * Le bilan présente, pour chaque élève :
 *  - sa moyenne à chaque évaluation,
 *  - sa moyenne annuelle (moyenne des évaluations renseignées),
 *  - son taux de présence calculé en DEMI-JOURNÉES,
 *  - son rang et sa décision de fin d'année.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, ChevronLeft, FileDown, Printer, Users } from 'lucide-react';
import {
  ClassData, getClass, sortStudents, evaluationsForClass, EvaluationId,
} from '../utils/database';
import { computeBulletins } from '../utils/bulletin';
import { computeStudentAttendance, loadAttendanceRecords, AttendanceDay } from '../utils/attendanceExport';
import { useSmartBack } from '../utils/useSmartBack';
// v45 : vrai fichier PDF, en plus de l'impression deja presente (regle v41).
import { exportAnnualReportPdf } from '../utils/reportPdf';

interface Line {
  id: string;
  name: string;
  /** Moyenne par évaluation (null = non renseignée). */
  perEval: (number | null)[];
  annual: number | null;
  presence: number;
  halfDays: number;
  absences: number;
}

export default function AnnualReportScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [records, setRecords] = useState<AttendanceDay[]>([]);

  useEffect(() => {
    if (id) getClass(id).then(c => setClassData(c || null));
    setRecords(loadAttendanceRecords());
  }, [id]);

  const evaluations = useMemo(
    () => (classData ? evaluationsForClass(classData) : []),
    [classData],
  );

  const lines: Line[] = useMemo(() => {
    if (!classData) return [];
    const students = sortStudents(classData.students);
    // Moyenne de chaque élève pour chaque évaluation.
    const byEval = new Map<EvaluationId, Map<string, number | null>>();
    for (const ev of evaluations) {
      const bulls = computeBulletins(classData, { evaluation: ev.id });
      const m = new Map<string, number | null>();
      for (const b of bulls) {
        m.set(b.student.id, typeof b.moyenne === 'number' ? b.moyenne : null);
      }
      byEval.set(ev.id, m);
    }
    const mine = records.filter(r => r.classId === classData.id);
    return students.map(st => {
      const perEval = evaluations.map(ev => byEval.get(ev.id)?.get(st.id) ?? null);
      const got = perEval.filter((v): v is number => typeof v === 'number');
      const annual = got.length ? Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 100) / 100 : null;
      const att = computeStudentAttendance(mine, st.id);
      return {
        id: st.id,
        name: `${(st.nom || '').toUpperCase()} ${st.prenoms || ''}`.trim(),
        perEval,
        annual,
        presence: att.taux,
        halfDays: att.total,
        absences: att.absJust + att.absInjust,
      };
    });
  }, [classData, evaluations, records]);

  // Classement sur la moyenne annuelle.
  const ranked = useMemo(() => {
    const sorted = [...lines].sort((a, b) => (b.annual ?? -1) - (a.annual ?? -1));
    const rank = new Map<string, number>();
    sorted.forEach((l, i) => { if (l.annual !== null) rank.set(l.id, i + 1); });
    return { sorted, rank };
  }, [lines]);

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  const withAnnual = lines.filter(l => l.annual !== null);
  const classAverage = withAnnual.length
    ? Math.round((withAnnual.reduce((a, l) => a + (l.annual || 0), 0) / withAnnual.length) * 100) / 100
    : 0;
  const admis = withAnnual.filter(l => (l.annual || 0) >= 10).length;
  const presenceMoy = lines.length
    ? Math.round(lines.reduce((a, l) => a + l.presence, 0) / lines.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white p-4 sticky top-0 z-10 shadow print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Bilan annuel</h1>
            <p className="text-indigo-100 text-sm">{classData.name} • Moyennes et présences</p>
          </div>
          <button
            data-testid="btn-pdf-bilan"
            onClick={() => exportAnnualReportPdf(
              classData,
              evaluations.map((e) => e.label),
              ranked.sorted.map((l) => ({
                name: l.name,
                perEval: l.perEval,
                annual: l.annual,
                presence: l.presence,
                absences: l.absences,
                rang: ranked.rank.get(l.id),
              })),
            )}
            className="p-2 bg-white/20 rounded-lg mr-1"
            aria-label="Télécharger le PDF"
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button data-testid="btn-imprimer-bilan" onClick={() => window.print()} className="p-2 bg-white/20 rounded-lg" aria-label="Imprimer">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 pb-16">
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 mb-4 text-xs text-indigo-800 print:hidden">
          📊 Ce bilan <strong>synthétise toutes les évaluations</strong> de l'année. Chaque évaluation
          garde par ailleurs <strong>son propre bulletin</strong> dans l'écran Bulletins.
          Les présences sont comptées <strong>en demi-journées</strong> (les jours fériés sont exclus).
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Stat label="Moyenne de classe" value={`${classAverage}/20`} tone="text-indigo-700" />
          <Stat label="Élèves ≥ 10" value={`${admis}/${lines.length}`} tone="text-emerald-700" />
          <Stat label="Présence moyenne" value={`${presenceMoy}%`} tone="text-blue-700" />
          <Stat label="Évaluations" value={`${evaluations.length}`} tone="text-amber-700" />
        </div>

        {/* Tableau de synthèse */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left sticky left-0 bg-gray-100">Élève</th>
                {evaluations.map(ev => <th key={ev.id} className="p-2 whitespace-nowrap">{ev.label}</th>)}
                <th className="p-2">Moy. annuelle</th>
                <th className="p-2">Rang</th>
                <th className="p-2">Présence</th>
                <th className="p-2">Absences</th>
                <th className="p-2">Décision</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => {
                const rank = ranked.rank.get(l.id);
                const pass = (l.annual ?? 0) >= 10;
                return (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 font-medium sticky left-0 bg-white">{l.name}</td>
                    {l.perEval.map((v, i) => (
                      <td key={i} className="p-2 text-center">
                        {v === null ? <span className="text-gray-300">—</span> : v.toFixed(2)}
                      </td>
                    ))}
                    <td className={`p-2 text-center font-bold ${l.annual === null ? 'text-gray-300' : pass ? 'text-emerald-700' : 'text-red-600'}`}>
                      {l.annual === null ? '—' : l.annual.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">{rank ?? '—'}</td>
                    <td className="p-2 text-center">{l.presence}%</td>
                    <td className="p-2 text-center">{l.absences}</td>
                    <td className="p-2 text-center font-semibold">
                      {l.annual === null
                        ? <span className="text-gray-400">En attente</span>
                        : pass
                          ? <span className="text-emerald-700">Admis(e)</span>
                          : <span className="text-red-600">À reprendre</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {lines.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Aucun élève dans cette classe.
          </div>
        )}

        {/* Classement */}
        {withAnnual.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mt-4">
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Classement annuel
            </h2>
            <ol className="space-y-1">
              {ranked.sorted.filter(l => l.annual !== null).map((l, i) => (
                <li key={l.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
                    {l.name}
                  </span>
                  <span className="font-bold text-indigo-700">{l.annual?.toFixed(2)}/20</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 text-center">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-gray-500 text-[11px]">{label}</p>
    </div>
  );
}
