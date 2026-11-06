/**
 * ⑧ CONSEIL DE CLASSE (v52).
 *
 * Grille de délibération et procès-verbal de fin d'année.
 *
 * ⚠️ PRINCIPE : l'application PROPOSE, le conseil DÉCIDE.
 * La décision et la mention sont pré-remplies à partir de la moyenne,
 * mais restent modifiables : le conseil tient compte d'éléments que
 * l'application ignore (maladie, situation familiale, progression).
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, Printer, Save, Users, Trash2 } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses, generateId } from '../utils/database';
import { computeBulletins } from '../utils/bulletin';
import {
  CouncilSession, CouncilEntry, PassDecision, DECISION_LABELS,
  loadCouncils, saveCouncil, councilSummary, buildCouncilEntries, mentionFor,
} from '../utils/schoolLife';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) =>
  (typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '—');
const frDate = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function ClassCouncilScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [sessions, setSessions] = useState<CouncilSession[]>([]);
  const [session, setSession] = useState<CouncilSession | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAllClasses().then((list) => {
      setClasses(list);
      if (list.length && !classId) setClassId(list[0].id);
    });
    setSessions(loadCouncils());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classData = classes.find((c) => c.id === classId) || null;
  const summary = useMemo(() => (session ? councilSummary(session) : null), [session]);

  /** Prépare la délibération à partir des bulletins déjà calculés. */
  function prepare() {
    if (!classData) return;
    const existing = sessions.find((s) => s.classId === classData.id);
    if (existing) { setSession(existing); return; }
    const bulletins = computeBulletins(classData);
    setSession({
      id: generateId(), classId: classData.id, className: classData.name,
      date: today(), chair: profile.teacherName || '', participants: '',
      entries: buildCouncilEntries(classData, bulletins),
      updatedAt: Date.now(),
    });
  }

  function updateEntry(studentId: string, patch: Partial<CouncilEntry>) {
    if (!session) return;
    setSession({
      ...session,
      entries: session.entries.map((e) => (e.studentId === studentId ? { ...e, ...patch } : e)),
    });
  }

  function save() {
    if (!session) return;
    setSessions(saveCouncil(session));
    setStatus('Délibération enregistrée.');
    window.setTimeout(() => setStatus(''), 2500);
  }

  function exportPdf() {
    if (!session || !summary) return;
    const pdf = makePdf({
      title: 'Procès-verbal du conseil de classe',
      subtitle: `${session.className} — ${frDate(session.date)}`,
      establishment: profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: session.chair || profile.teacherName || undefined, role: 'Le Président de séance', date: frDate(session.date), stampSignature: true },
    });
    pdf.keyValues([
      ['Classe', session.className],
      ['Date', frDate(session.date)],
      ['Président de séance', session.chair || '—'],
      ['Participants', session.participants || '—'],
      ['Effectif délibéré', String(summary.total)],
      ['Admis', String(summary.admitted)],
      ['Redoublants', String(summary.repeating)],
      ['Taux de passage', `${summary.passRate.toString().replace('.', ',')} %`],
      ['Moyenne de la classe', fmt(summary.classAverage)],
    ]);
    pdf.sectionTitle('Délibération');
    pdf.table(
      [
        { header: 'Élève', width: 2.2 },
        { header: 'Moyenne', width: 0.9, align: 'right' },
        { header: 'Mention', width: 1.2 },
        { header: 'Décision', width: 1.8 },
        { header: 'Observation', width: 2 },
      ],
      session.entries.map((e) => [
        e.studentLabel, fmt(e.average), e.mention || '—',
        DECISION_LABELS[e.decision], e.comment || '',
      ]),
    );
    pdf.save(`pv-conseil-${session.className.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  }

  async function exportWord() {
    if (!session) return;
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'PROCÈS-VERBAL DU CONSEIL DE CLASSE', bold: true, size: 14 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${profile.schoolName || ''} — ${session.className} — ${frDate(session.date)}`, size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      { type: 'paragraph', runs: [{ text: `Président de séance : ${session.chair || '—'}` }] },
      { type: 'paragraph', runs: [{ text: `Participants : ${session.participants || '—'}` }] },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Élève', 'Moyenne', 'Mention', 'Décision', 'Observation'],
          ...session.entries.map((e) => [
            e.studentLabel, fmt(e.average), e.mention || '',
            DECISION_LABELS[e.decision], e.comment || '',
          ]),
        ],
      },
    ], `pv-conseil-${session.className.toLowerCase().replace(/\s+/g, '-')}.docx`, { landscape: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => (session ? setSession(null) : goBack())} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Conseil de classe</h1>
            <p className="text-white/80 text-sm">Délibération et procès-verbal</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        {status && (
          <p data-testid="statut-conseil" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        {!session && (
          <>
            <div className="msp-card p-4 space-y-3">
              <div className="msp-flag-rule" />
              <select
                data-testid="select-classe-conseil" value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
              >
                {classes.length === 0 && <option value="">Aucune classe</option>}
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                data-testid="btn-preparer-conseil" onClick={prepare} disabled={!classData}
                className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold disabled:opacity-50"
              >
                Préparer la délibération
              </button>
              <p className="text-[11px] text-gray-400">
                Les moyennes, mentions et décisions sont pré-remplies à partir des bulletins.
                Le conseil reste libre de les modifier.
              </p>
            </div>

            {sessions.length > 0 && (
              <div className="msp-card p-3" data-testid="liste-conseils">
                <h3 className="font-bold text-gray-800 mb-2 text-sm">Délibérations enregistrées</h3>
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0">
                    <button onClick={() => setSession(s)} className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-800">{s.className}</p>
                      <p className="text-xs text-gray-500">{frDate(s.date)} · {s.entries.length} élève(s)</p>
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm('Supprimer cette délibération ?')) return;
                        const next = sessions.filter((x) => x.id !== s.id);
                        setSessions(next);
                        try { localStorage.setItem('msp_conseil_classe', JSON.stringify(next)); } catch { /* quota */ }
                      }}
                      className="text-red-500 p-2" aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {session && summary && (
          <>
            <div className="msp-card p-4 space-y-2">
              <div className="msp-flag-rule mb-1" />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Date</span>
                  <input
                    type="date" value={session.date}
                    onChange={(e) => setSession({ ...session, date: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Président</span>
                  <input
                    data-testid="champ-president" value={session.chair}
                    onChange={(e) => setSession({ ...session, chair: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </label>
              </div>
              <input
                value={session.participants} placeholder="Participants (enseignants, parents…)"
                onChange={(e) => setSession({ ...session, participants: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="msp-card p-4" data-testid="synthese-conseil">
              <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Résultat de la délibération
              </h2>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div><p className="text-gray-600">Effectif</p><p className="text-lg font-bold">{summary.total}</p></div>
                <div><p className="text-gray-600">Admis</p><p className="text-lg font-bold text-emerald-700" data-testid="nb-admis">{summary.admitted}</p></div>
                <div><p className="text-gray-600">Redoublent</p><p className="text-lg font-bold text-red-700">{summary.repeating}</p></div>
                <div>
                  <p className="text-gray-600">Passage</p>
                  <p className="text-lg font-bold text-indigo-700" data-testid="taux-passage">
                    {summary.passRate.toString().replace('.', ',')} %
                  </p>
                </div>
              </div>
              <p className="text-xs text-center text-gray-600 mt-2">
                Moyenne de la classe : <strong>{fmt(summary.classAverage)}</strong>
              </p>
            </div>

            <div className="space-y-2" data-testid="liste-deliberation">
              {session.entries.map((e) => (
                <div key={e.studentId} className="msp-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{e.studentLabel}</p>
                      <p className="text-xs text-gray-500">
                        Moyenne <strong>{fmt(e.average)}</strong> · {e.mention || mentionFor(e.average)}
                      </p>
                    </div>
                  </div>
                  <select
                    data-testid={`decision-${e.studentId}`} value={e.decision}
                    onChange={(ev) => updateEntry(e.studentId, { decision: ev.target.value as PassDecision })}
                    className="mt-2 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                  >
                    {Object.entries(DECISION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input
                    value={e.comment || ''} placeholder="Observation du conseil"
                    onChange={(ev) => updateEntry(e.studentId, { comment: ev.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={exportWord} data-testid="btn-word-conseil" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
              <button onClick={exportPdf} data-testid="btn-pdf-conseil" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
              <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
            </div>
          </>
        )}
      </main>

      {session && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 print:hidden">
          <button
            data-testid="btn-enregistrer-conseil" onClick={save}
            className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" /> Enregistrer la délibération
          </button>
        </div>
      )}
    </div>
  );
}
