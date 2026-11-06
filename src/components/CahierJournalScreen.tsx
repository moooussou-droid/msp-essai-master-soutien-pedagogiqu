/**
 * CAHIER JOURNAL (v49).
 *
 * Obligation quotidienne de l'enseignant : consigner, séance par séance,
 * ce qui a réellement été fait. L'application le réclamait déjà dans sa
 * liste de préparation à l'inspection sans le fournir.
 *
 * Le taux de réalisation (séances faites ÷ prévues) est CALCULÉ : c'est
 * l'indicateur que regarde l'inspecteur.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Save, FileDown, Printer, CheckCircle2, Circle, BookOpen,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  JournalDay, JournalSession, loadJournal, saveJournalDay, deleteJournalDay, journalStats,
} from '../utils/schoolRegisters';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

function todayIso() { return new Date().toISOString().slice(0, 10); }
function frDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function emptySession(): JournalSession {
  return {
    id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    subject: '', title: '', content: '', duration: 30, done: false,
  };
}

export default function CahierJournalScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [days, setDays] = useState<JournalDay[]>([]);
  const [date, setDate] = useState(todayIso());
  const [className, setClassName] = useState('');
  const [sessions, setSessions] = useState<JournalSession[]>([emptySession()]);
  const [status, setStatus] = useState('');

  useEffect(() => { setDays(loadJournal()); }, []);

  // Charge la journée correspondant à la date choisie, si elle existe.
  useEffect(() => {
    const found = loadJournal().find((d) => d.date === date);
    if (found) {
      setClassName(found.className);
      setSessions(found.sessions.length ? found.sessions : [emptySession()]);
    } else {
      setSessions([emptySession()]);
    }
  }, [date]);

  const stats = useMemo(() => journalStats(days), [days]);
  const dayStats = useMemo(
    () => journalStats([{ id: 'x', date, className, sessions, updatedAt: 0 }]),
    [date, className, sessions],
  );

  function update(id: string, patch: Partial<JournalSession>) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function save() {
    const filled = sessions.filter((s) => s.subject.trim() || s.title.trim());
    if (filled.length === 0) { setStatus('Renseignez au moins une séance.'); return; }
    setDays(saveJournalDay({ id: `j-${date}`, date, className, sessions: filled, updatedAt: Date.now() }));
    setStatus('Journée enregistrée.');
    window.setTimeout(() => setStatus(''), 2500);
  }

  function exportPdf() {
    const pdf = makePdf({
      title: 'Cahier journal',
      subtitle: `${frDate(date)}${className ? ` — ${className}` : ''}`,
      establishment: profile.schoolName || 'Mon établissement',
      signature: { preparedBy: profile.teacherName || undefined, role: 'L’enseignant(e)', date: frDate(date) },
    });
    pdf.table(
      [
        { header: 'Matière', width: 1.4 },
        { header: 'Séance', width: 2 },
        { header: 'Durée', width: 0.8, align: 'right' },
        { header: 'Fait', width: 0.7 },
      ],
      sessions.map((s) => [s.subject || '—', s.title || '—', `${s.duration} min`, s.done ? 'Oui' : 'Non']),
    );
    for (const s of sessions.filter((x) => x.content.trim())) {
      pdf.sectionTitle(`${s.subject} — ${s.title}`);
      pdf.paragraph(s.content);
      if (s.observation) pdf.paragraph(`Observation : ${s.observation}`);
    }
    pdf.keyValues([
      ['Séances prévues', String(dayStats.sessions)],
      ['Séances réalisées', String(dayStats.done)],
      ['Taux de réalisation', `${dayStats.completionRate} %`],
    ]);
    pdf.save(`cahier-journal-${date}.pdf`);
  }

  async function exportWord() {
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'CAHIER JOURNAL', bold: true, size: 16 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${profile.schoolName || ''} — ${frDate(date)} — ${className}`, size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table',
        headerRow: true,
        rows: [
          ['Matière', 'Séance', 'Durée', 'Fait', 'Observation'],
          ...sessions.map((s) => [s.subject, s.title, `${s.duration} min`, s.done ? 'Oui' : 'Non', s.observation || '']),
        ],
      },
      { type: 'paragraph', runs: [{ text: '' }] },
      ...sessions.filter((s) => s.content.trim()).flatMap((s) => ([
        { type: 'paragraph' as const, runs: [{ text: `${s.subject} — ${s.title}`, bold: true }], heading: 3 as const },
        { type: 'paragraph' as const, runs: [{ text: s.content }] },
      ])),
      { type: 'paragraph', runs: [{ text: `Taux de réalisation : ${dayStats.completionRate} %`, bold: true }] },
    ], `cahier-journal-${date}.docx`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Cahier journal</h1>
            <p className="text-white/80 text-sm">Ce qui a été fait, séance par séance</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-32">
        {status && (
          <p data-testid="statut-journal" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        <div className="msp-card p-4 grid grid-cols-2 gap-3">
          <div className="msp-flag-rule col-span-2" />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Date</span>
            <input
              type="date" data-testid="champ-date-journal" value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Classe</span>
            <input
              type="text" data-testid="champ-classe-journal" value={className}
              onChange={(e) => setClassName(e.target.value)} placeholder="Ex. CM2 A"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>
        </div>

        <div className="space-y-3" data-testid="liste-seances">
          {sessions.map((s, i) => (
            <div key={s.id} className="msp-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Séance {i + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`bascule-fait-${i}`}
                    onClick={() => update(s.id, { done: !s.done })}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
                      s.done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {s.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {s.done ? 'Faite' : 'À faire'}
                  </button>
                  <button
                    onClick={() => setSessions((p) => (p.length > 1 ? p.filter((x) => x.id !== s.id) : p))}
                    className="text-red-500 p-1" aria-label="Supprimer la séance"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" data-testid={`matiere-${i}`} value={s.subject}
                  onChange={(e) => update(s.id, { subject: e.target.value })}
                  placeholder="Matière" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number" min={5} step={5} data-testid={`duree-${i}`} value={s.duration}
                  onChange={(e) => update(s.id, { duration: Number(e.target.value) || 0 })}
                  placeholder="Durée (min)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text" data-testid={`titre-${i}`} value={s.title}
                onChange={(e) => update(s.id, { title: e.target.value })}
                placeholder="Titre de la séance / compétence visée"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                rows={2} data-testid={`contenu-${i}`} value={s.content}
                onChange={(e) => update(s.id, { content: e.target.value })}
                placeholder="Déroulement effectif, observations…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {!s.done && (
                <input
                  type="text" value={s.observation || ''}
                  onChange={(e) => update(s.id, { observation: e.target.value })}
                  placeholder="Motif du report (facultatif)"
                  className="w-full border border-amber-300 bg-amber-50 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <button
          data-testid="btn-ajouter-seance"
          onClick={() => setSessions((p) => [...p, emptySession()])}
          className="w-full bg-white border border-dashed border-gray-300 py-3 rounded-xl font-semibold text-gray-600 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Ajouter une séance
        </button>

        <div className="msp-card p-4" data-testid="stats-journal">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#046a38]" /> Réalisation
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Ce jour</p>
              <p className="text-xl font-bold text-gray-800" data-testid="taux-jour">{dayStats.completionRate} %</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Journées</p>
              <p className="text-xl font-bold text-gray-800">{stats.days}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-600">Global</p>
              <p className="text-xl font-bold text-[#046a38]" data-testid="taux-global">{stats.completionRate} %</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-journal" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-journal" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>

        {days.length > 0 && (
          <div className="msp-card p-4">
            <h3 className="font-bold text-gray-800 mb-2">Journées enregistrées</h3>
            {days.slice(0, 15).map((d) => (
              <div key={d.id} className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0">
                <button onClick={() => setDate(d.date)} className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">{frDate(d.date)}</p>
                  <p className="text-xs text-gray-500">{d.className} · {d.sessions.length} séance(s)</p>
                </button>
                <button
                  onClick={() => { if (window.confirm('Supprimer cette journée ?')) setDays(deleteJournalDay(d.id)); }}
                  className="text-red-500 p-2" aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 print:hidden">
        <button
          data-testid="btn-enregistrer-journal" onClick={save}
          className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" /> Enregistrer la journée
        </button>
      </div>
    </div>
  );
}
