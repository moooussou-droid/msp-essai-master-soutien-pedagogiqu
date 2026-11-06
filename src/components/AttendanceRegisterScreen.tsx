/**
 * ① REGISTRE D'APPEL OFFICIEL ET TAUX DE FRÉQUENTATION (v52).
 *
 * Produit le document réglementaire que réclame la circonscription :
 * taux de fréquentation du mois, ventilation par sexe, et liste des
 * élèves en risque de décrochage. Tous les calculs viennent de
 * `attendanceRegister.ts` : aucune formule ici.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, Printer, AlertTriangle, Users } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses } from '../utils/database';
import { AttendanceDay } from '../utils/attendanceExport';
import {
  attendanceByGender, attendanceByStudent, computeAttendanceTotals,
  monthsCovered, monthRange, monthLabel, UNJUSTIFIED_ALERT_THRESHOLD,
} from '../utils/attendanceRegister';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

const STORAGE_KEY = 'msp_attendance_records';

function loadDays(): AttendanceDay[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

const pct = (n: number) => `${n.toString().replace('.', ',')} %`;

export default function AttendanceRegisterScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState('');
  const [days, setDays] = useState<AttendanceDay[]>([]);

  useEffect(() => {
    getAllClasses().then((list) => {
      setClasses(list);
      if (list.length && !classId) setClassId(list[0].id);
    });
    setDays(loadDays());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classData = classes.find((c) => c.id === classId) || null;
  const classDays = useMemo(
    () => days.filter((d) => d.classId === classId),
    [days, classId],
  );
  const months = useMemo(() => monthsCovered(classDays), [classDays]);
  const currentMonth = month || months[0] || new Date().toISOString().slice(0, 7);
  const range = monthRange(currentMonth);

  const students = classData?.students || [];
  const totals = useMemo(
    () => computeAttendanceTotals(classDays, students, range),
    [classDays, students, range.from, range.to],
  );
  const gender = useMemo(
    () => attendanceByGender(classDays, students, range),
    [classDays, students, range.from, range.to],
  );
  const rows = useMemo(
    () => attendanceByStudent(classDays, students, range),
    [classDays, students, range.from, range.to],
  );
  const atRisk = rows.filter((r) => r.atRisk);

  function exportPdf() {
    if (!classData) return;
    const pdf = makePdf({
      title: 'Registre d’appel — taux de fréquentation',
      subtitle: `${classData.name} — ${monthLabel(currentMonth)}`,
      establishment: classData.school || profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le Directeur / La Directrice' },
    });
    pdf.keyValues([
      ['Demi-journées dues', String(totals.due)],
      ['Demi-journées suivies', String(totals.attended)],
      ['Absences justifiées', String(totals.absJustified)],
      ['Absences injustifiées', String(totals.absUnjustified)],
      ['Taux de fréquentation', pct(totals.rate)],
      ['Taux — garçons', pct(gender.boys.rate)],
      ['Taux — filles', pct(gender.girls.rate)],
    ]);
    pdf.sectionTitle('Détail par élève');
    pdf.table(
      [
        { header: 'Élève', width: 2.4 },
        { header: 'Dues', width: 0.7, align: 'right' },
        { header: 'Suivies', width: 0.8, align: 'right' },
        { header: 'Abs. just.', width: 0.9, align: 'right' },
        { header: 'Abs. injust.', width: 1, align: 'right' },
        { header: 'Taux', width: 0.9, align: 'right' },
      ],
      rows.map((r) => [
        `${r.student.nom} ${r.student.prenoms}`.trim(),
        String(r.totals.due), String(r.totals.attended),
        String(r.totals.absJustified), String(r.totals.absUnjustified),
        pct(r.totals.rate),
      ]),
    );
    if (atRisk.length > 0) {
      pdf.alert(`${atRisk.length} élève(s) au-delà de ${UNJUSTIFIED_ALERT_THRESHOLD} demi-journées injustifiées : signalement aux familles recommandé.`);
    }
    pdf.save(`registre-appel-${currentMonth}.pdf`);
  }

  async function exportWord() {
    if (!classData) return;
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'REGISTRE D’APPEL — TAUX DE FRÉQUENTATION', bold: true, size: 14 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${classData.school || profile.schoolName || ''} — ${classData.name} — ${monthLabel(currentMonth)}`, size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Indicateur', 'Valeur'],
          ['Demi-journées dues', String(totals.due)],
          ['Demi-journées suivies', String(totals.attended)],
          ['Absences justifiées', String(totals.absJustified)],
          ['Absences injustifiées', String(totals.absUnjustified)],
          ['Taux de fréquentation', pct(totals.rate)],
          ['Taux — garçons', pct(gender.boys.rate)],
          ['Taux — filles', pct(gender.girls.rate)],
        ],
      },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Élève', 'Dues', 'Suivies', 'Abs. just.', 'Abs. injust.', 'Taux'],
          ...rows.map((r) => [
            `${r.student.nom} ${r.student.prenoms}`.trim(),
            String(r.totals.due), String(r.totals.attended),
            String(r.totals.absJustified), String(r.totals.absUnjustified), pct(r.totals.rate),
          ]),
        ],
      },
    ], `registre-appel-${currentMonth}.docx`, { landscape: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-blue-600 to-sky-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Registre d’appel officiel</h1>
            <p className="text-white/80 text-sm">Taux de fréquentation réglementaire</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule" />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Classe</span>
            <select
              data-testid="select-classe-registre" value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              {classes.length === 0 && <option value="">Aucune classe</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Mois</span>
            <select
              data-testid="select-mois-registre" value={currentMonth}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              {months.length === 0 && <option value={currentMonth}>{monthLabel(currentMonth)}</option>}
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
        </div>

        <div className="msp-card p-4" data-testid="bloc-taux">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Fréquentation du mois
          </h2>
          <div className="text-center bg-blue-50 rounded-xl p-4 mb-3">
            <p className="text-xs text-gray-600">Taux de fréquentation</p>
            <p className="text-4xl font-bold text-blue-700" data-testid="taux-global">{pct(totals.rate)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {totals.attended} demi-journées suivies sur {totals.due} dues
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Garçons</p>
              <p className="text-lg font-bold text-blue-700" data-testid="taux-garcons">{pct(gender.boys.rate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Filles</p>
              <p className="text-lg font-bold text-pink-700" data-testid="taux-filles">{pct(gender.girls.rate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Abs. justifiées</p>
              <p className="text-lg font-bold text-gray-700">{totals.absJustified}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Abs. injustifiées</p>
              <p className="text-lg font-bold text-red-700">{totals.absUnjustified}</p>
            </div>
          </div>
        </div>

        {atRisk.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3" data-testid="alerte-decrochage">
            <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {atRisk.length} élève(s) à signaler
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Au moins {UNJUSTIFIED_ALERT_THRESHOLD} demi-journées d’absence injustifiée ce mois.
            </p>
            <ul className="mt-2 space-y-1">
              {atRisk.map((r) => (
                <li key={r.student.id} className="text-sm text-amber-900">
                  • {r.student.nom} {r.student.prenoms} — {r.totals.absUnjustified} demi-journées
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="msp-card p-3" data-testid="tableau-eleves">
          <h3 className="font-bold text-gray-800 mb-2 text-sm">Détail par élève</h3>
          {rows.length === 0 && <p className="text-sm text-gray-500">Aucun élève.</p>}
          {rows.map((r) => (
            <div key={r.student.id} className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {r.student.nom} {r.student.prenoms}
                </p>
                <p className="text-xs text-gray-500">
                  {r.totals.absJustified} just. · {r.totals.absUnjustified} injust.
                </p>
              </div>
              <span className={`text-sm font-bold ${r.totals.rate < 80 ? 'text-red-600' : 'text-emerald-700'}`}>
                {pct(r.totals.rate)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-registre" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-registre" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>
    </div>
  );
}
