/**
 * ③ LIVRET SCOLAIRE PLURIANNUEL (v52).
 *
 * Retrace la scolarité d'un élève d'une année sur l'autre (CI → CM2).
 * Sert à l'orientation et aux dossiers de transfert, que l'application
 * ne pouvait pas constituer jusqu'ici.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileDown, Printer, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { getAllClasses, generateId, ClassData } from '../utils/database';
import { computeBulletins } from '../utils/bulletin';
import {
  StudentBooklet, BookletYear, PassDecision, DECISION_LABELS,
  loadBooklets, saveBooklets, sortedYears, bookletStats, studentKey,
} from '../utils/schoolLife';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

const fmt = (n: number | null | undefined) =>
  (typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '—');

export default function SchoolBookletScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [booklets, setBooklets] = useState<StudentBooklet[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<BookletYear | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setBooklets(loadBooklets());
    getAllClasses().then(setClasses);
  }, []);

  const current = booklets.find((b) => b.id === selected) || null;

  function persist(next: StudentBooklet[]) {
    setBooklets(next);
    saveBooklets(next);
  }

  /**
   * Importe les élèves des classes existantes : évite de ressaisir des
   * identités déjà présentes dans l'application.
   */
  function importFromClasses() {
    const existing = new Map(booklets.map((b) => [b.studentKey, b]));
    const added: StudentBooklet[] = [];
    for (const c of classes) {
      for (const s of c.students) {
        const key = studentKey(s);
        if (existing.has(key)) continue;
        existing.set(key, null as any);
        added.push({
          id: generateId(), studentKey: key,
          nom: s.nom, prenoms: s.prenoms, matricule: s.matricule || '',
          dateNaissance: (s as any).dateNaissance || '',
          years: [], updatedAt: Date.now(),
        });
      }
    }
    if (added.length === 0) { setStatus('Tous les élèves ont déjà un livret.'); return; }
    persist([...booklets, ...added]);
    setStatus(`${added.length} livret(s) créé(s).`);
    window.setTimeout(() => setStatus(''), 3000);
  }

  /** Reprend la moyenne calculée par l'application pour l'année en cours. */
  function fillFromClass(booklet: StudentBooklet, classData: ClassData) {
    const bulletins = computeBulletins(classData);
    const student = classData.students.find((s) => studentKey(s) === booklet.studentKey);
    if (!student) { setStatus('Élève absent de cette classe.'); return; }
    const b = bulletins.find((x) => x.student.id === student.id);
    const year: BookletYear = {
      id: generateId(),
      schoolYear: new Date().getMonth() >= 8
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
      level: classData.level || '',
      schoolName: classData.school || profile.schoolName || '',
      average: b?.moyenne ?? null,
      rank: b?.rang ?? null,
      headcount: classData.students.length,
      decision: 'en_cours',
    };
    persist(booklets.map((x) =>
      x.id === booklet.id ? { ...x, years: [...x.years, year], updatedAt: Date.now() } : x));
    setStatus('Année ajoutée depuis la classe.');
    window.setTimeout(() => setStatus(''), 3000);
  }

  function saveYear() {
    if (!current || !editingYear) return;
    const years = current.years.some((y) => y.id === editingYear.id)
      ? current.years.map((y) => (y.id === editingYear.id ? editingYear : y))
      : [...current.years, editingYear];
    persist(booklets.map((b) => (b.id === current.id ? { ...b, years, updatedAt: Date.now() } : b)));
    setEditingYear(null);
  }

  const stats = useMemo(() => (current ? bookletStats(current) : null), [current]);

  function exportPdf() {
    if (!current || !stats) return;
    const pdf = makePdf({
      title: 'Livret scolaire',
      subtitle: `${current.nom} ${current.prenoms}`,
      establishment: profile.schoolName || 'Mon établissement',
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le Directeur / La Directrice' },
    });
    pdf.keyValues([
      ['Nom et prénoms', `${current.nom} ${current.prenoms}`],
      ['Matricule', current.matricule || '—'],
      ['Date de naissance', current.dateNaissance || '—'],
      ['Années suivies', String(stats.yearsCount)],
      ['Moyenne générale', fmt(stats.overallAverage)],
      ['Redoublements', String(stats.repeats)],
    ]);
    pdf.sectionTitle('Parcours scolaire');
    pdf.table(
      [
        { header: 'Année', width: 1.2 },
        { header: 'Classe', width: 0.9 },
        { header: 'École', width: 1.8 },
        { header: 'Moyenne', width: 0.9, align: 'right' },
        { header: 'Décision', width: 1.6 },
      ],
      sortedYears(current).map((y) => [
        y.schoolYear, y.level, y.schoolName, fmt(y.average), DECISION_LABELS[y.decision],
      ]),
    );
    pdf.save(`livret-${current.nom.toLowerCase()}.pdf`);
  }

  async function exportWord() {
    if (!current) return;
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'LIVRET SCOLAIRE', bold: true, size: 16 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: `${current.nom} ${current.prenoms}`, size: 12 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['Année', 'Classe', 'École', 'Moyenne', 'Rang', 'Décision'],
          ...sortedYears(current).map((y) => [
            y.schoolYear, y.level, y.schoolName, fmt(y.average),
            y.rank ? `${y.rank}${y.headcount ? `/${y.headcount}` : ''}` : '—',
            DECISION_LABELS[y.decision],
          ]),
        ],
      },
    ], `livret-${current.nom.toLowerCase()}.docx`);
  }

  const TrendIcon = stats?.trend === 'progression' ? TrendingUp
    : stats?.trend === 'baisse' ? TrendingDown : Minus;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => (current ? setSelected(null) : goBack())} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Livret scolaire</h1>
            <p className="text-white/80 text-sm">Le parcours, année après année</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        {status && (
          <p data-testid="statut-livret" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        {!current && (
          <>
            <button
              data-testid="btn-importer-eleves" onClick={importFromClasses}
              className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold"
            >
              Créer les livrets depuis mes classes
            </button>
            <div className="space-y-2" data-testid="liste-livrets">
              {booklets.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Aucun livret.</p>
              )}
              {booklets.map((b) => {
                const s = bookletStats(b);
                return (
                  <button
                    key={b.id} onClick={() => setSelected(b.id)}
                    className="w-full msp-card p-3 flex items-center gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{b.nom} {b.prenoms}</p>
                      <p className="text-xs text-gray-500">
                        {s.yearsCount} année(s) · moyenne {fmt(s.overallAverage)}
                        {s.repeats > 0 && ` · ${s.repeats} redoublement(s)`}
                      </p>
                    </div>
                    <span className="text-gray-300 text-xl">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {current && stats && (
          <>
            <div className="msp-card p-4" data-testid="synthese-livret">
              <div className="msp-flag-rule mb-3" />
              <h2 className="font-bold text-gray-800">{current.nom} {current.prenoms}</h2>
              <p className="text-xs text-gray-500 mb-3">Matricule {current.matricule || '—'}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Années</p>
                  <p className="text-xl font-bold text-gray-800">{stats.yearsCount}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Moyenne</p>
                  <p className="text-xl font-bold text-purple-700" data-testid="moyenne-livret">{fmt(stats.overallAverage)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">Tendance</p>
                  <p className="text-sm font-bold text-gray-800 flex items-center justify-center gap-1">
                    <TrendIcon className="w-4 h-4" />
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {classes.map((c) => (
                <button
                  key={c.id} onClick={() => fillFromClass(current, c)}
                  className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-3 py-2"
                >
                  + depuis {c.name}
                </button>
              ))}
              <button
                data-testid="btn-ajouter-annee"
                onClick={() => setEditingYear({
                  id: generateId(), schoolYear: '', level: '', schoolName: profile.schoolName || '',
                  average: null, decision: 'en_cours',
                })}
                className="text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 rounded-lg px-3 py-2 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Année manuelle
              </button>
            </div>

            <div className="space-y-2" data-testid="liste-annees">
              {sortedYears(current).map((y) => (
                <div key={y.id} className="msp-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{y.schoolYear} — {y.level}</p>
                      <p className="text-xs text-gray-500 truncate">{y.schoolName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Moyenne <strong>{fmt(y.average)}</strong>
                        {y.rank ? ` · rang ${y.rank}${y.headcount ? `/${y.headcount}` : ''}` : ''}
                        {' · '}{DECISION_LABELS[y.decision]}
                      </p>
                    </div>
                    <button onClick={() => setEditingYear(y)} className="text-sm font-semibold text-purple-700 px-2">Ouvrir</button>
                    <button
                      onClick={() => {
                        if (!window.confirm('Supprimer cette année ?')) return;
                        persist(booklets.map((b) => (b.id === current.id
                          ? { ...b, years: b.years.filter((x) => x.id !== y.id) } : b)));
                      }}
                      className="text-red-500 p-2" aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={exportWord} data-testid="btn-word-livret" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
              <button onClick={exportPdf} data-testid="btn-pdf-livret" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
              <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
            </div>
          </>
        )}
      </main>

      {editingYear && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Année scolaire</h2>
              <button onClick={() => setEditingYear(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                data-testid="champ-annee" value={editingYear.schoolYear} placeholder="2025-2026"
                onChange={(e) => setEditingYear({ ...editingYear, schoolYear: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
              <input
                data-testid="champ-niveau" value={editingYear.level} placeholder="CM2"
                onChange={(e) => setEditingYear({ ...editingYear, level: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
            </div>
            <input
              value={editingYear.schoolName} placeholder="École"
              onChange={(e) => setEditingYear({ ...editingYear, schoolName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" step="0.01" data-testid="champ-moyenne" placeholder="Moyenne /20"
                value={editingYear.average ?? ''}
                onChange={(e) => setEditingYear({ ...editingYear, average: e.target.value === '' ? null : Number(e.target.value) })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
              />
              <select
                data-testid="champ-decision" value={editingYear.decision}
                onChange={(e) => setEditingYear({ ...editingYear, decision: e.target.value as PassDecision })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
              >
                {Object.entries(DECISION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <textarea
              rows={2} placeholder="Appréciation de l’enseignant"
              value={editingYear.teacherComment || ''}
              onChange={(e) => setEditingYear({ ...editingYear, teacherComment: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              data-testid="btn-enregistrer-annee" onClick={saveYear}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold"
            >
              Enregistrer l’année
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
