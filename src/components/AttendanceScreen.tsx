/**
 * REGISTRE DE PRÉSENCE (v36).
 *
 * Chaque jour de classe du LUNDI au VENDREDI est divisé en DEUX demi-journées
 * (matin et après-midi) : l'appel se fait séparément pour chacune.
 * Le MERCREDI ne comporte qu'UNE demi-journée. Pas de classe le samedi ni le
 * dimanche (l'appel est alors indisponible).
 *
 * Statuts : Présent · Absence avec justification · Absence sans justification ·
 * Journée fériée · Demi-journée de séance.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarOff, ChevronLeft, FileText, FileSpreadsheet, Loader2, Sun, Sunset, UserCheck } from 'lucide-react';
import { ClassData, getClass, sortStudents } from '../utils/database';
import {
  exportAttendanceExcel, exportAttendanceDocx,
  availableMonths, recordsForMonth,
  AttendanceDay, AttendanceEntry,
  computeStudentAttendance, findEntry,
} from '../utils/attendanceExport';
import {
  AttendanceStatus, HalfDay, HALF_LABELS, STATUS_LABELS, STATUS_ORDER, STATUS_SHORT,
  halfDaysFor, isSingleHalfDay, unavailableReason, weekdayName,
} from '../utils/attendanceSchedule';
import { useSmartBack } from '../utils/useSmartBack';

const STORAGE_KEY = 'msp_attendance_records';

function loadRecords(): AttendanceDay[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecords(records: AttendanceDay[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

/** Couleur du bouton de statut sélectionné. */
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-600 text-white',
  absent_justifiee: 'bg-amber-500 text-white',
  absent_injustifiee: 'bg-red-600 text-white',
  ferie: 'bg-slate-600 text-white',
  demi_journee_seance: 'bg-blue-600 text-white',
};

export default function AttendanceScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [date, setDate] = useState(today());
  const [half, setHalf] = useState<HalfDay>('matin');
  const [records, setRecords] = useState<AttendanceDay[]>(loadRecords());
  const [reportMonth, setReportMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState<'excel' | 'word' | null>(null);

  useEffect(() => {
    if (id) getClass(id).then(c => setClassData(c || null));
  }, [id]);

  const halves = halfDaysFor(date);
  const closed = unavailableReason(date);

  // Si la demi-journée sélectionnée n'existe pas ce jour-là (mercredi
  // après-midi, ou bascule sur un week-end), on revient au matin.
  useEffect(() => {
    if (halves.length > 0 && !halves.includes(half)) setHalf(halves[0]);
  }, [date, halves, half]);

  const students = useMemo(() => sortStudents(classData?.students || []), [classData]);
  const current = records.find(r => r.classId === id && r.date === date);

  function getEntry(studentId: string): AttendanceEntry | undefined {
    return current ? findEntry(current, studentId, half) : undefined;
  }

  function getStatus(studentId: string): AttendanceStatus {
    const st = getEntry(studentId)?.status;
    // 'retard' n'existe plus depuis la v36 : les anciens registres sont lus comme présents.
    if (!st || st === 'retard') return 'present';
    return st as AttendanceStatus;
  }

  function getMotif(studentId: string): string {
    return getEntry(studentId)?.motif || '';
  }

  function updateEntry(studentId: string, status: AttendanceStatus, motif = getMotif(studentId)) {
    if (!id || closed) return;
    const next = [...records];
    let record = next.find(r => r.classId === id && r.date === date);
    if (!record) {
      record = { id: `att-${Date.now()}`, classId: id, date, entries: [] };
      next.unshift(record);
    }
    const idx = record.entries.findIndex(
      e => e.studentId === studentId && (e.half || 'matin') === half,
    );
    const entry: AttendanceEntry = { studentId, status, motif, half };
    if (idx >= 0) record.entries[idx] = entry;
    else record.entries.push(entry);
    setRecords(next);
    saveRecords(next);
  }

  /** Applique un statut à TOUTE la classe pour la demi-journée courante. */
  function markAll(status: AttendanceStatus) {
    if (!id || closed) return;
    const existing = records.find(r => r.classId === id && r.date === date);
    const others = (existing?.entries || []).filter(e => (e.half || 'matin') !== half);
    const entries: AttendanceEntry[] = [
      ...others,
      ...students.map(s => ({
        studentId: s.id,
        status,
        motif: status === 'present' ? '' : (existing ? findEntry(existing, s.id, half)?.motif || '' : ''),
        half,
      })),
    ];
    const record: AttendanceDay = existing
      ? { ...existing, entries }
      : { id: `att-${Date.now()}`, classId: id, date, entries };
    const next = [record, ...records.filter(r => !(r.classId === id && r.date === date))];
    setRecords(next);
    saveRecords(next);
  }

  async function handleExportExcel() {
    if (!classData || !id) return;
    const days = recordsForMonth(records, id, reportMonth);
    if (days.length === 0) { alert("Aucun jour enregistré pour ce mois. Faites d'abord l'appel."); return; }
    setExporting('excel');
    try {
      await exportAttendanceExcel(classData, days, reportMonth);
    } catch (e: any) {
      alert("Erreur lors de l'export Excel : " + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  async function handleExportDocx() {
    if (!classData || !id) return;
    const days = recordsForMonth(records, id, reportMonth);
    if (days.length === 0) { alert("Aucun jour enregistré pour ce mois. Faites d'abord l'appel."); return; }
    setExporting('word');
    try {
      await exportAttendanceDocx(classData, days, reportMonth);
    } catch (e: any) {
      alert("Erreur lors de l'export Word : " + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  // Synthèse du mois affiché, comptée en DEMI-JOURNÉES.
  const monthRecords = records.filter(r => r.classId === id && r.date.startsWith(date.slice(0, 7)));
  const monthHalfCount = monthRecords.reduce((n, r) => n + halfDaysFor(r.date).length, 0);
  const globalRate = useMemo(() => {
    if (students.length === 0 || monthRecords.length === 0) return 0;
    const rates = students.map(s => computeStudentAttendance(monthRecords, s.id).taux);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [monthRecords, students]);

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Registre de Présence</h1>
            <p className="text-emerald-100 text-sm">{classData.name} • Appel par demi-journée</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {/* Date + demi-journée */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'appel</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">{weekdayName(date)}</p>

          {closed ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3">
              <CalendarOff className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">{closed}</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 mt-3 mb-1">Demi-journée</p>
              <div className="grid grid-cols-2 gap-2">
                {(['matin', 'apresmidi'] as HalfDay[]).map(h => {
                  const available = halves.includes(h);
                  const active = half === h && available;
                  return (
                    <button
                      key={h}
                      disabled={!available}
                      onClick={() => setHalf(h)}
                      className={`py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                        active ? 'bg-emerald-600 text-white'
                        : available ? 'bg-gray-100 text-gray-700'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {h === 'matin' ? <Sun className="w-4 h-4" /> : <Sunset className="w-4 h-4" />}
                      {HALF_LABELS[h]}
                    </button>
                  );
                })}
              </div>
              {isSingleHalfDay(date) && (
                <p className="text-[11px] text-amber-600 mt-2">
                  ℹ️ Le mercredi ne comporte qu'une seule demi-journée de classe (le matin).
                </p>
              )}

              <button
                onClick={() => markAll('present')}
                className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <UserCheck className="w-5 h-5" /> Tout le monde présent ({HALF_LABELS[half].toLowerCase()})
              </button>
              <button
                onClick={() => markAll('ferie')}
                className="w-full mt-2 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm"
              >
                Marquer cette demi-journée comme fériée
              </button>
            </>
          )}
        </div>

        {/* Synthèse */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{globalRate}%</p>
            <p className="text-gray-500 text-xs">Taux mensuel global</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{monthHalfCount}</p>
            <p className="text-gray-500 text-xs">Demi-journées enregistrées</p>
          </div>
        </div>

        {/* Appel */}
        {!closed && (
          <div className="space-y-2">
            {students.map(student => {
              const status = getStatus(student.id);
              const photo = student.photoUrl;
              return (
                <div key={student.id} className="bg-white rounded-xl shadow p-3">
                  <div className="flex items-center gap-3 mb-3">
                    {photo
                      ? <img src={photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                      : <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {student.nom[0]}{student.prenoms?.[0] || ''}
                        </div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {student.nom.toUpperCase()} {student.prenoms}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {HALF_LABELS[half]} — {STATUS_LABELS[status]}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mb-2 sm:grid-cols-3">
                    {STATUS_ORDER.map(s => (
                      <button
                        key={s}
                        onClick={() => updateEntry(student.id, s)}
                        className={`text-[11px] leading-tight py-2 px-1 rounded-lg font-medium ${
                          status === s ? STATUS_COLOR[s] : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {(status === 'absent_justifiee' || status === 'absent_injustifiee') && (
                    <input
                      value={getMotif(student.id)}
                      onChange={e => updateEntry(student.id, status, e.target.value)}
                      placeholder="Motif (facultatif)"
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <MonthlyReport
          classData={classData}
          records={records}
          month={reportMonth}
          onMonthChange={setReportMonth}
          exporting={exporting}
          onExportExcel={handleExportExcel}
          onExportWord={handleExportDocx}
        />
      </main>
    </div>
  );
}

function MonthlyReport({
  classData, records, month, onMonthChange, exporting, onExportExcel, onExportWord,
}: {
  classData: ClassData;
  records: AttendanceDay[];
  month: string;
  onMonthChange: (m: string) => void;
  exporting: 'excel' | 'word' | null;
  onExportExcel: () => void;
  onExportWord: () => void;
}) {
  const students = sortStudents(classData.students);
  const months = availableMonths(records, classData.id);
  const monthDays = recordsForMonth(records, classData.id, month);
  const halfCount = monthDays.reduce((n, d) => n + halfDaysFor(d.date).length, 0);

  const stats = students.map(s => ({ s, st: computeStudentAttendance(monthDays, s.id) }));
  const classRate = stats.length
    ? Math.round(stats.reduce((a, x) => a + x.st.taux, 0) / stats.length)
    : 0;
  const totalAbs = stats.reduce((a, x) => a + x.st.absJust + x.st.absInjust, 0);

  return (
    <div className="bg-white rounded-xl shadow p-4 mt-6">
      <div className="flex items-center justify-between mb-3 print:hidden">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5" /> PV mensuel
        </h2>
        <button onClick={() => window.print()} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
          Imprimer
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        Document prêt pour circonscription scolaire, EducMaster et inspection. Les présences sont
        comptées par demi-journée ; les demi-journées fériées ne pénalisent pas l'élève.
      </p>

      <div className="space-y-2 mb-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mois du rapport</label>
          <select
            value={month}
            onChange={e => onMonthChange(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {months.length === 0 && <option value={month}>{month}</option>}
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {months.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              ℹ️ Aucun appel enregistré : le rapport sera vide tant que vous n'aurez pas fait l'appel.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportExcel}
            disabled={exporting !== null || monthDays.length === 0}
            className="bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Registre Excel
          </button>
          <button
            onClick={onExportWord}
            disabled={exporting !== null || monthDays.length === 0}
            className="bg-[#006b4f] text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {exporting === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PV Word
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          💡 Une colonne par demi-journée : M = matin, S = après-midi.
          Légende : {STATUS_ORDER.map(s => `${STATUS_SHORT[s]} = ${STATUS_LABELS[s]}`).join(' • ')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-emerald-50 rounded-xl p-3 text-center print:bg-transparent">
          <p className="text-xl font-bold text-emerald-700">{classRate}%</p>
          <p className="text-gray-500 text-[11px]">Taux moyen classe</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center print:bg-transparent">
          <p className="text-xl font-bold text-blue-700">{halfCount}</p>
          <p className="text-gray-500 text-[11px]">Demi-journées suivies</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center print:bg-transparent">
          <p className="text-xl font-bold text-amber-700">{totalAbs}</p>
          <p className="text-gray-500 text-[11px]">Absences</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Élève</th>
              <th className="p-2">Présent</th>
              <th className="p-2">Abs. just.</th>
              <th className="p-2">Abs. injust.</th>
              <th className="p-2">Fériées</th>
              <th className="p-2">Taux</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ s, st }) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.nom} {s.prenoms}</td>
                <td className="p-2 text-center">{st.present}</td>
                <td className="p-2 text-center">{st.absJust}</td>
                <td className="p-2 text-center">{st.absInjust}</td>
                <td className="p-2 text-center">{st.ferie}</td>
                <td className="p-2 text-center font-semibold">{st.taux}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        Mois : {month} • Demi-journées : {halfCount} • Total absences : {totalAbs}
      </p>
    </div>
  );
}
