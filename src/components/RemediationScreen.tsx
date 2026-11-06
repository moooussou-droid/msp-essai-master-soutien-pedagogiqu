/**
 * ⑥ SUIVI DE LA REMÉDIATION (v52).
 *
 * L'application repérait déjà les élèves sous 10/20, sans garder trace
 * de ce qui avait été ENTREPRIS. L'inspection demande précisément cela :
 * quelle difficulté, quelle action, quel résultat.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileDown, Printer, X, LifeBuoy } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { ClassData, getAllClasses, generateId } from '../utils/database';
import { computeBulletins } from '../utils/bulletin';
import {
  RemediationCase, RemediationStatus, REMEDIATION_LABELS,
  loadRemediation, saveRemediation, remediationSummary, remediationGain, suggestCases,
} from '../utils/schoolLife';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) =>
  (typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '—');

const STATUS_STYLES: Record<RemediationStatus, string> = {
  ouverte: 'bg-red-100 text-red-700',
  en_cours: 'bg-amber-100 text-amber-700',
  resolue: 'bg-emerald-100 text-emerald-700',
  sans_effet: 'bg-gray-200 text-gray-700',
};

export default function RemediationScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [cases, setCases] = useState<RemediationCase[]>([]);
  const [editing, setEditing] = useState<RemediationCase | null>(null);

  useEffect(() => {
    getAllClasses().then((list) => {
      setClasses(list);
      if (list.length && !classId) setClassId(list[0].id);
    });
    setCases(loadRemediation());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classData = classes.find((c) => c.id === classId) || null;
  const visible = useMemo(
    () => cases.filter((c) => !classId || c.classId === classId),
    [cases, classId],
  );
  const summary = useMemo(() => remediationSummary(visible), [visible]);

  /** Élèves sous 10/20 sans dossier ouvert : proposés automatiquement. */
  const suggestions = useMemo(() => {
    if (!classData) return [];
    const bulletins = computeBulletins(classData);
    return suggestCases(bulletins, visible);
  }, [classData, visible]);

  function persist(next: RemediationCase[]) {
    setCases(next);
    saveRemediation(next);
  }

  function openCaseFor(studentId: string, label: string, moyenne: number | null) {
    if (!classData) return;
    const c: RemediationCase = {
      id: generateId(), studentId, studentLabel: label,
      classId: classData.id, className: classData.name,
      subject: '', difficulty: '', startingScore: moyenne, currentScore: null,
      status: 'ouverte', openedAt: today(), actions: [], updatedAt: Date.now(),
    };
    persist([c, ...cases]);
    setEditing(c);
  }

  function exportPdf() {
    const pdf = makePdf({
      title: 'Suivi de la remédiation',
      subtitle: classData ? classData.name : 'Toutes les classes',
      establishment: profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'L’enseignant(e)' },
    });
    pdf.keyValues([
      ['Dossiers', String(summary.total)],
      ['En cours', String(summary.open)],
      ['Résolus', String(summary.resolved)],
      ['Taux de résolution', `${summary.successRate.toString().replace('.', ',')} %`],
      ['Gain moyen', summary.averageGain === null ? '—' : `${fmt(summary.averageGain)} point(s)`],
      ['Actions engagées', String(summary.actions)],
    ]);
    pdf.table(
      [
        { header: 'Élève', width: 1.8 },
        { header: 'Matière', width: 1.2 },
        { header: 'Difficulté', width: 2 },
        { header: 'Départ', width: 0.8, align: 'right' },
        { header: 'Actuel', width: 0.8, align: 'right' },
        { header: 'État', width: 1.2 },
      ],
      visible.map((c) => [
        c.studentLabel, c.subject || '—', c.difficulty || '—',
        fmt(c.startingScore), fmt(c.currentScore), REMEDIATION_LABELS[c.status],
      ]),
    );
    for (const c of visible.filter((x) => (x.actions || []).length > 0)) {
      pdf.sectionTitle(`${c.studentLabel} — ${c.subject || 'difficulté'}`);
      for (const a of c.actions) {
        pdf.paragraph(`${a.date} : ${a.description}${a.result ? ` → ${a.result}` : ''}`);
      }
    }
    pdf.save('suivi-remediation.pdf');
  }

  async function exportWord() {
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'SUIVI DE LA REMÉDIATION', bold: true, size: 14 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${profile.schoolName || ''}${classData ? ` — ${classData.name}` : ''}`, size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Élève', 'Matière', 'Difficulté', 'Départ', 'Actuel', 'Gain', 'État'],
          ...visible.map((c) => [
            c.studentLabel, c.subject, c.difficulty,
            fmt(c.startingScore), fmt(c.currentScore),
            remediationGain(c) === null ? '—' : fmt(remediationGain(c)),
            REMEDIATION_LABELS[c.status],
          ]),
        ],
      },
    ], 'suivi-remediation.docx', { landscape: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Élèves en difficulté</h1>
            <p className="text-white/80 text-sm">Actions de remédiation et résultats</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4">
          <div className="msp-flag-rule mb-3" />
          <select
            data-testid="select-classe-remediation" value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
          >
            {classes.length === 0 && <option value="">Aucune classe</option>}
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="msp-card p-4" data-testid="synthese-remediation">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-rose-600" /> Efficacité du suivi
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div><p className="text-gray-600">Dossiers</p><p className="text-lg font-bold" data-testid="nb-dossiers">{summary.total}</p></div>
            <div><p className="text-gray-600">En cours</p><p className="text-lg font-bold text-amber-700">{summary.open}</p></div>
            <div><p className="text-gray-600">Résolus</p><p className="text-lg font-bold text-emerald-700">{summary.resolved}</p></div>
            <div>
              <p className="text-gray-600">Réussite</p>
              <p className="text-lg font-bold text-rose-700" data-testid="taux-resolution">
                {summary.successRate.toString().replace('.', ',')} %
              </p>
            </div>
          </div>
          {summary.averageGain !== null && (
            <p className="text-xs text-center text-gray-600 mt-2">
              Gain moyen : <strong className={summary.averageGain >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {summary.averageGain > 0 ? '+' : ''}{fmt(summary.averageGain)} point(s)
              </strong>
            </p>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3" data-testid="suggestions">
            <p className="font-bold text-amber-800 text-sm">
              {suggestions.length} élève(s) sous 10/20 sans dossier
            </p>
            <div className="mt-2 space-y-1">
              {suggestions.map((s) => (
                <button
                  key={s.student.id}
                  data-testid={`btn-ouvrir-dossier-${s.student.id}`}
                  onClick={() => openCaseFor(s.student.id, `${s.student.nom} ${s.student.prenoms}`.trim(), s.moyenne)}
                  className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">{s.student.nom} {s.student.prenoms}</span>
                  <span className="text-red-600 font-semibold">{fmt(s.moyenne)} → ouvrir</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2" data-testid="liste-dossiers">
          {visible.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Aucun dossier.</p>}
          {visible.map((c) => {
            const gain = remediationGain(c);
            return (
              <div key={c.id} className="msp-card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{c.studentLabel}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.subject || 'Matière non précisée'} · {c.difficulty || 'difficulté à préciser'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {fmt(c.startingScore)} → {fmt(c.currentScore)}
                      {gain !== null && (
                        <span className={gain >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {' '}({gain > 0 ? '+' : ''}{fmt(gain)})
                        </span>
                      )}
                      {' · '}{(c.actions || []).length} action(s)
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded shrink-0 ${STATUS_STYLES[c.status]}`}>
                    {REMEDIATION_LABELS[c.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setEditing(c)} className="bg-rose-50 text-rose-700 py-2 rounded-lg text-xs font-semibold">Ouvrir le dossier</button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer ce dossier ?')) persist(cases.filter((x) => x.id !== c.id)); }}
                    className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-remediation" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-remediation" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 truncate">{editing.studentLabel}</h2>
              <button onClick={() => setEditing(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  data-testid="champ-matiere-remediation" value={editing.subject} placeholder="Matière"
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                />
                <select
                  data-testid="champ-statut-remediation" value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as RemediationStatus })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
                >
                  {Object.entries(REMEDIATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <textarea
                rows={2} data-testid="champ-difficulte" value={editing.difficulty}
                placeholder="Difficulté constatée (ex. confond les unités et les dizaines)"
                onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Note de départ /20</span>
                  <input
                    type="number" step="0.01" value={editing.startingScore ?? ''}
                    onChange={(e) => setEditing({ ...editing, startingScore: e.target.value === '' ? null : Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Note actuelle /20</span>
                  <input
                    type="number" step="0.01" data-testid="champ-note-actuelle" value={editing.currentScore ?? ''}
                    onChange={(e) => setEditing({ ...editing, currentScore: e.target.value === '' ? null : Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </label>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-bold text-gray-500 mb-2">ACTIONS ENGAGÉES</p>
                {(editing.actions || []).map((a, i) => (
                  <div key={a.id} className="mb-2 bg-gray-50 rounded-lg p-2">
                    <div className="flex gap-1">
                      <input
                        type="date" value={a.date}
                        onChange={(e) => setEditing({
                          ...editing,
                          actions: editing.actions.map((x) => (x.id === a.id ? { ...x, date: e.target.value } : x)),
                        })}
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => setEditing({ ...editing, actions: editing.actions.filter((x) => x.id !== a.id) })}
                        className="text-red-500 p-1 ml-auto" aria-label="Supprimer l’action"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      data-testid={`action-desc-${i}`} value={a.description} placeholder="Action menée"
                      onChange={(e) => setEditing({
                        ...editing,
                        actions: editing.actions.map((x) => (x.id === a.id ? { ...x, description: e.target.value } : x)),
                      })}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      value={a.result || ''} placeholder="Résultat observé"
                      onChange={(e) => setEditing({
                        ...editing,
                        actions: editing.actions.map((x) => (x.id === a.id ? { ...x, result: e.target.value } : x)),
                      })}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                ))}
                <button
                  data-testid="btn-ajouter-action"
                  onClick={() => setEditing({
                    ...editing,
                    actions: [...(editing.actions || []), { id: generateId(), date: today(), description: '' }],
                  })}
                  className="w-full border border-dashed border-gray-300 py-2 rounded-lg text-xs font-semibold text-gray-600 inline-flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter une action
                </button>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-3">
              <button
                data-testid="btn-enregistrer-remediation"
                onClick={() => {
                  persist(cases.map((c) => (c.id === editing.id ? { ...editing, updatedAt: Date.now() } : c)));
                  setEditing(null);
                }}
                className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold"
              >
                Enregistrer le dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
