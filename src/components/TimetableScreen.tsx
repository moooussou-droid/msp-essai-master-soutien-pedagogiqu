/**
 * ⑤ EMPLOI DU TEMPS DE LA CLASSE (v52).
 *
 * Grille hebdomadaire imprimable, affichable en classe.
 * Les chevauchements d'horaires sont détectés et signalés : sans cela,
 * deux matières pourraient occuper le même créneau sans que personne ne
 * s'en aperçoive avant la rentrée.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileDown, Printer, AlertTriangle, Clock } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses, generateId } from '../utils/database';
import {
  Timetable, TimetableSlot, SCHOOL_DAYS, SchoolDay,
  loadTimetables, saveTimetable, findOverlaps, weeklyLoad, formatDuration, slotDuration,
} from '../utils/schoolLife';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

export default function TimetableScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAllClasses().then((list) => {
      setClasses(list);
      if (list.length && !classId) setClassId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!classId) return;
    const found = loadTimetables().find((t) => t.classId === classId);
    setSlots(found ? found.slots : []);
  }, [classId]);

  const classData = classes.find((c) => c.id === classId) || null;
  const overlaps = useMemo(() => findOverlaps(slots), [slots]);
  const load = useMemo(() => weeklyLoad(slots), [slots]);
  const totalMinutes = load.reduce((t, l) => t + l.minutes, 0);

  function addSlot(day: SchoolDay) {
    setSlots((prev) => [...prev, {
      id: generateId(), day, start: '08:00', end: '09:00', subject: '',
    }]);
  }

  function update(id: string, patch: Partial<TimetableSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function save() {
    if (!classData) return;
    const tt: Timetable = {
      id: `tt-${classData.id}`, classId: classData.id, className: classData.name,
      slots, updatedAt: Date.now(),
    };
    saveTimetable(tt);
    setStatus('Emploi du temps enregistré.');
    window.setTimeout(() => setStatus(''), 2500);
  }

  /** Grille jour × créneaux, pour l'export. */
  function gridRows(): string[][] {
    const rows: string[][] = [];
    for (const day of SCHOOL_DAYS) {
      const daySlots = slots
        .filter((s) => s.day === day)
        .sort((a, b) => a.start.localeCompare(b.start));
      if (daySlots.length === 0) { rows.push([day, '—', '—', '—']); continue; }
      daySlots.forEach((s, i) => {
        rows.push([i === 0 ? day : '', `${s.start} – ${s.end}`, s.subject || '—', s.room || '—']);
      });
    }
    return rows;
  }

  function exportPdf() {
    if (!classData) return;
    const pdf = makePdf({
      title: 'Emploi du temps',
      subtitle: classData.name,
      establishment: classData.school || profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'L’enseignant(e)' },
    });
    pdf.table(
      [
        { header: 'Jour', width: 1 },
        { header: 'Horaire', width: 1.2 },
        { header: 'Matière', width: 2 },
        { header: 'Salle', width: 1 },
      ],
      gridRows(),
    );
    pdf.sectionTitle('Volume horaire hebdomadaire');
    pdf.table(
      [{ header: 'Matière', width: 2 }, { header: 'Durée', width: 1, align: 'right' }],
      load.map((l) => [l.subject, formatDuration(l.minutes)]),
    );
    if (overlaps.length > 0) {
      pdf.alert(`${overlaps.length} chevauchement(s) d’horaires à corriger.`);
    }
    pdf.save(`emploi-du-temps-${classData.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  }

  async function exportWord() {
    if (!classData) return;
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'EMPLOI DU TEMPS', bold: true, size: 16 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${classData.name} — ${classData.school || profile.schoolName || ''}`, size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      { type: 'table', headerRow: true, rows: [['Jour', 'Horaire', 'Matière', 'Salle'], ...gridRows()] },
      { type: 'paragraph', runs: [{ text: '' }] },
      { type: 'table', headerRow: true, rows: [['Matière', 'Volume hebdomadaire'], ...load.map((l) => [l.subject, formatDuration(l.minutes)])] },
    ], `emploi-du-temps-${classData.name.toLowerCase().replace(/\s+/g, '-')}.docx`, { landscape: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Emploi du temps</h1>
            <p className="text-white/80 text-sm">Grille hebdomadaire de la classe</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        {status && (
          <p data-testid="statut-edt" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        <div className="msp-card p-4">
          <div className="msp-flag-rule mb-3" />
          <select
            data-testid="select-classe-edt" value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
          >
            {classes.length === 0 && <option value="">Aucune classe</option>}
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {overlaps.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-3" data-testid="alerte-chevauchement">
            <p className="font-bold text-red-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {overlaps.length} chevauchement(s)
            </p>
            {overlaps.map(([a, b], i) => (
              <p key={i} className="text-xs text-red-700 mt-1">
                {a.day} : « {a.subject || '?'} » ({a.start}–{a.end}) et « {b.subject || '?'} » ({b.start}–{b.end})
              </p>
            ))}
          </div>
        )}

        {SCHOOL_DAYS.map((day) => {
          const daySlots = slots.filter((s) => s.day === day)
            .sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div key={day} className="msp-card p-3" data-testid={`jour-${day}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">
                  {day}
                  {day === 'Mercredi' && <span className="text-[10px] text-gray-400 ml-2">(matinée seule)</span>}
                </h3>
                <button
                  data-testid={`btn-ajouter-${day}`}
                  onClick={() => addSlot(day)}
                  className="text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg px-2 py-1 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Créneau
                </button>
              </div>
              {daySlots.length === 0 && <p className="text-xs text-gray-400">Aucun créneau.</p>}
              {daySlots.map((s) => (
                <div key={s.id} className="flex items-center gap-1 mb-2">
                  <input
                    type="time" value={s.start}
                    onChange={(e) => update(s.id, { start: e.target.value })}
                    className="border border-gray-300 rounded px-1 py-2 text-xs w-[72px]"
                  />
                  <input
                    type="time" value={s.end}
                    onChange={(e) => update(s.id, { end: e.target.value })}
                    className="border border-gray-300 rounded px-1 py-2 text-xs w-[72px]"
                  />
                  <input
                    type="text" value={s.subject} placeholder="Matière"
                    data-testid={`matiere-${s.id}`}
                    onChange={(e) => update(s.id, { subject: e.target.value })}
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-2 text-xs"
                  />
                  <span className="text-[10px] text-gray-400 w-12 text-right shrink-0">
                    {formatDuration(slotDuration(s))}
                  </span>
                  <button
                    onClick={() => setSlots((p) => p.filter((x) => x.id !== s.id))}
                    className="text-red-500 p-1 shrink-0" aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {load.length > 0 && (
          <div className="msp-card p-4" data-testid="volume-horaire">
            <h3 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" /> Volume hebdomadaire — total {formatDuration(totalMinutes)}
            </h3>
            {load.map((l) => (
              <div key={l.subject} className="flex items-center justify-between text-sm border-b border-gray-100 py-1 last:border-0">
                <span className="text-gray-700">{l.subject}</span>
                <span className="font-semibold text-gray-800">{formatDuration(l.minutes)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-edt" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-edt" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 print:hidden">
        <button
          data-testid="btn-enregistrer-edt" onClick={save}
          className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold"
        >
          Enregistrer l’emploi du temps
        </button>
      </div>
    </div>
  );
}
