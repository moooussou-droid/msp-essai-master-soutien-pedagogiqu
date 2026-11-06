/**
 * BULLETINS DE LA MATERNELLE (v67).
 *
 * Cet écran remplace, pour les classes préscolaires, le bulletin numérique
 * du primaire. Il saisit et imprime la grille officielle photographiée :
 * 10 domaines, échelle TS/S/PS, observation par domaine, appréciation
 * générale et visas de l’enseignant(e), du Directeur et des parents.
 * Aucune moyenne ni aucun rang n’est calculé.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, FileDown, FileSpreadsheet, FileText,
  Loader2, MessageCircle, Printer, Save, Search, Sparkles, Users,
} from 'lucide-react';
import { ClassData, Student, sortStudents } from '../utils/database';
import { computeBulletins } from '../utils/bulletin';
import {
  PRESCHOOL_DOMAINS,
  PRESCHOOL_TRIMESTERS,
  PreschoolEvaluationRecord,
  PreschoolRating,
  PreschoolTrimester,
  classPreschoolTrimester,
  getPreschoolEvaluation,
  loadPreschoolEvaluations,
  preschoolCounts,
  preschoolObservationSuggestions,
  preschoolRatingLabel,
  preschoolTrimesterLabel,
  savePreschoolEvaluation,
  suggestPreschoolRatingsFromBulletin,
  suggestedGeneralAppreciation,
} from '../utils/prescolaireBulletin';
import {
  exportPreschoolBulletinPdf,
  exportPreschoolBulletinsDocx,
  exportPreschoolBulletinsExcel,
  exportPreschoolClassBulletinsPdf,
  exportPreschoolSummaryPdf,
} from '../utils/prescolaireBulletinExport';
import { openWhatsApp } from '../utils/contact';
import { isUnlocked } from '../utils/coursePayment';
import { getSignatureImage, getStampImage } from '../utils/scanner';
import PaywallPanel from './PaywallPanel';

const PDF_PRICE = 15;

function initials(student: Student): string {
  return `${student.nom?.[0] || ''}${student.prenoms?.[0] || ''}`.toUpperCase() || '?';
}

function cloneRecord(record: PreschoolEvaluationRecord): PreschoolEvaluationRecord {
  return {
    ...record,
    results: Object.fromEntries(Object.entries(record.results).map(([k, v]) => [k, { ...v }])),
  };
}

function trimesterNumeral(trimester: PreschoolTrimester): string {
  return trimester === '2e trimestre' ? '2e' : trimester === '3e trimestre' ? '3e' : '1er';
}

export default function PreschoolBulletinsScreen({
  classData,
  onBack,
}: {
  classData: ClassData;
  onBack: () => void;
}) {
  const students = useMemo(() => sortStudents(classData.students), [classData.students]);
  const [trimester, setTrimester] = useState<PreschoolTrimester>(() => classPreschoolTrimester(classData));
  const [records, setRecords] = useState<PreschoolEvaluationRecord[]>(() => loadPreschoolEvaluations());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PreschoolEvaluationRecord | null>(null);
  const [tab, setTab] = useState<'saisie' | 'bulletin'>('saisie');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exporting, setExporting] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<'student' | 'class' | null>(null);

  const legacyBulletins = useMemo(() => computeBulletins(classData), [classData]);
  const selectedStudent = students.find(s => s.id === selectedId) || null;
  const selectedIndex = selectedStudent ? students.findIndex(s => s.id === selectedStudent.id) : -1;

  const recordFor = (studentId: string, tri = trimester): PreschoolEvaluationRecord =>
    getPreschoolEvaluation(classData.id, studentId, tri, records);

  const classCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let ts = 0, s = 0, ps = 0;
    for (const student of students) {
      const record = recordFor(student.id);
      const c = preschoolCounts(record);
      if (c.completed === c.total) completed++;
      else if (c.completed > 0) inProgress++;
      ts += c.TS; s += c.S; ps += c.PS;
    }
    return { completed, inProgress, ts, s, ps };
    // recordFor lit records+trimester, déjà dépendances effectives du calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, records, trimester, classData.id]);

  function openStudent(student: Student, tri = trimester) {
    setSelectedId(student.id);
    setDraft(cloneRecord(getPreschoolEvaluation(classData.id, student.id, tri, records)));
    setDirty(false);
    setSaveState('idle');
    setTab('saisie');
  }

  function changeTrimester(next: PreschoolTrimester) {
    setTrimester(next);
    if (selectedStudent) {
      setDraft(cloneRecord(getPreschoolEvaluation(classData.id, selectedStudent.id, next, records)));
      setDirty(false);
      setSaveState('idle');
    }
  }

  function persist(record: PreschoolEvaluationRecord): PreschoolEvaluationRecord {
    const saved = savePreschoolEvaluation(record);
    setRecords(previous => [
      ...previous.filter(r => !(r.classId === saved.classId && r.studentId === saved.studentId && r.trimester === saved.trimester)),
      saved,
    ]);
    setDraft(cloneRecord(saved));
    setDirty(false);
    setSaveState('saved');
    return saved;
  }

  // Sauvegarde automatique douce : sur téléphone, quitter l’écran ne doit
  // pas faire perdre dix observations déjà saisies.
  useEffect(() => {
    if (!draft || !dirty) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => persist(draft), 750);
    return () => window.clearTimeout(timer);
    // persist est volontairement recréée par rendu ; draft/dirty pilotent l’effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty]);

  function updateDomain(domainId: string, patch: Partial<{ rating: PreschoolRating; observation: string }>) {
    if (!draft) return;
    setDraft({
      ...draft,
      results: {
        ...draft.results,
        [domainId]: { ...(draft.results[domainId] || { rating: '', observation: '' }), ...patch },
      },
    });
    setDirty(true);
  }

  function prefillFromLegacyNotes() {
    if (!draft || !selectedStudent) return;
    const bulletin = legacyBulletins.find(b => b.student.id === selectedStudent.id);
    if (!bulletin) return;
    const counts = preschoolCounts(draft);
    if (counts.completed > 0 && !window.confirm('Compléter la grille à partir des anciennes notes numériques ? Les observations déjà écrites sont conservées.')) return;
    setDraft(suggestPreschoolRatingsFromBulletin(draft, bulletin));
    setDirty(true);
  }

  function proposeGeneralAppreciation() {
    if (!draft || !selectedStudent) return;
    const text = suggestedGeneralAppreciation(selectedStudent, draft);
    if (!text) {
      alert('Cochez d’abord au moins un domaine TS, S ou PS.');
      return;
    }
    if (draft.generalAppreciation && !window.confirm('Remplacer l’appréciation générale actuelle par la proposition automatique ?')) return;
    setDraft({ ...draft, generalAppreciation: text });
    setDirty(true);
  }

  function confirmIncomplete(action: string): boolean {
    const missing = students.filter(s => preschoolCounts(recordFor(s.id)).completed < PRESCHOOL_DOMAINS.length).length;
    if (missing === 0) return true;
    return window.confirm(`${missing} enfant(s) ont une grille incomplète. ${action} quand même ? Les cases non remplies resteront vides, comme sur le livret papier.`);
  }

  async function runExport(kind: string, fn: () => void | Promise<void>) {
    setExporting(kind);
    try { await fn(); }
    catch (e: any) { alert(`Export impossible : ${e?.message || e}`); }
    finally { setExporting(null); }
  }

  function doStudent() {
    if (!selectedStudent || !draft) return;
    const record = dirty ? persist(draft) : draft;
    exportPreschoolBulletinPdf(classData, selectedStudent, record);
  }

  function doClassPdf() {
    if (!confirmIncomplete('Exporter toute la classe')) return;
    exportPreschoolClassBulletinsPdf(classData, records, trimester);
  }

  function studentPdf() {
    if (!selectedStudent) return;
    const cid = `bulletin:${classData.id}:${selectedStudent.id}:${trimester}`;
    if (isUnlocked(cid)) runExport('student-pdf', doStudent);
    else setPayTarget('student');
  }

  function classPdf() {
    const cid = `bulletins:${classData.id}:${trimester}`;
    if (isUnlocked(cid)) runExport('class-pdf', doClassPdf);
    else setPayTarget('class');
  }

  function shareWhatsApp() {
    if (!selectedStudent || !draft) return;
    const c = preschoolCounts(draft);
    let text = `*GRILLE D’ÉVALUATION TRIMESTRIELLE — ${preschoolTrimesterLabel(trimester).toUpperCase()}*\n`;
    text += `${classData.school}\nClasse : ${classData.name} | ${classData.schoolYear}\n\n`;
    text += `*Enfant :* ${selectedStudent.nom.toUpperCase()} ${selectedStudent.prenoms}\n`;
    text += `*Matricule :* ${selectedStudent.matricule || '—'}\n\n`;
    for (const domain of PRESCHOOL_DOMAINS) {
      const r = draft.results[domain.id];
      text += `• ${domain.label} : ${r?.rating || 'Non renseigné'}${r?.observation ? ` — ${r.observation}` : ''}\n`;
    }
    text += `\n*Récapitulatif :* ${c.TS} TS · ${c.S} S · ${c.PS} PS\n`;
    if (draft.generalAppreciation) text += `\n*Appréciation générale :* ${draft.generalAppreciation}\n`;
    text += `\nNB : L’enfant est évalué par rapport à lui-même et non par rapport à ses camarades.\n_Master Soutien Pédagogique_`;
    openWhatsApp(text);
  }

  if (selectedStudent && draft) {
    const counts = preschoolCounts(draft);
    const legacy = legacyBulletins.find(b => b.student.id === selectedStudent.id);
    const legacyNoted = legacy?.results.some(r => r.total !== null);
    return (
      <div className="msp-preschool-root min-h-screen bg-amber-50/60">
        <header className="print:hidden sticky top-0 z-20 bg-emerald-700 p-4 text-white shadow">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button onClick={() => setSelectedId(null)} className="rounded-lg bg-white/20 p-2" aria-label="Retour à la liste">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{selectedStudent.nom.toUpperCase()} {selectedStudent.prenoms}</h1>
              <p className="text-sm text-emerald-100">Bulletin officiel de maternelle · {preschoolTrimesterLabel(trimester)} · {counts.completed}/{counts.total} domaines</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${saveState === 'saved' ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>
              {saveState === 'saving' ? 'Enregistrement…' : saveState === 'saved' ? '✓ Enregistré' : 'Grille TS/S/PS'}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 pb-56">
          <div className="print:hidden mb-4 rounded-2xl bg-white p-3 shadow">
            <div className="grid grid-cols-3 gap-2">
              {PRESCHOOL_TRIMESTERS.map(t => (
                <button
                  key={t.id}
                  onClick={() => changeTrimester(t.id)}
                  className={`rounded-xl px-2 py-2 text-sm font-bold ${trimester === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                data-testid="preschool-tab-entry"
                onClick={() => setTab('saisie')}
                className={`rounded-xl py-2.5 font-bold ${tab === 'saisie' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800'}`}
              >
                Remplir la grille
              </button>
              <button
                data-testid="preschool-tab-preview"
                onClick={() => setTab('bulletin')}
                className={`rounded-xl py-2.5 font-bold ${tab === 'bulletin' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Bulletin officiel (2 pages)
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">TS : {counts.TS}</span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">S : {counts.S}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">PS : {counts.PS}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Aucun rang · aucune moyenne</span>
            </div>
          </div>

          {tab === 'saisie' ? (
            <section className="print:hidden space-y-3" data-testid="preschool-editor">
              {legacyNoted && (
                <button onClick={prefillFromLegacyNotes} className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-800">
                  <Sparkles className="mr-2 inline h-4 w-4" />
                  Pré-remplir depuis d’anciennes notes numériques (≥ 75 % = TS · ≥ 50 % = S · sinon PS)
                </button>
              )}

              {PRESCHOOL_DOMAINS.map((domain, index) => {
                const result = draft.results[domain.id] || { rating: '' as PreschoolRating, observation: '' };
                return (
                  <article key={domain.id} className="rounded-2xl bg-white p-4 shadow" data-testid={`preschool-domain-${index + 1}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-bold text-gray-900">
                        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-800">{index + 1}</span>
                        {domain.label}
                      </h2>
                      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-300" role="group" aria-label={`Échelle ${domain.label}`}>
                        {(['TS', 'S', 'PS'] as const).map(rating => (
                          <button
                            key={rating}
                            data-testid={`rating-${domain.id}-${rating}`}
                            onClick={() => updateDomain(domain.id, { rating: result.rating === rating ? '' : rating })}
                            className={`px-4 py-2 text-sm font-extrabold ${result.rating === rating
                              ? rating === 'TS' ? 'bg-emerald-600 text-white' : rating === 'S' ? 'bg-sky-600 text-white' : 'bg-rose-600 text-white'
                              : 'bg-white text-gray-600'}`}
                            aria-pressed={result.rating === rating}
                          >
                            {result.rating === rating ? '✓ ' : ''}{rating}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{preschoolRatingLabel(result.rating)}</p>
                    <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`obs-${domain.id}`}>Observation</label>
                    <input
                      id={`obs-${domain.id}`}
                      data-testid={`observation-${domain.id}`}
                      value={result.observation}
                      onChange={e => updateDomain(domain.id, { observation: e.target.value })}
                      placeholder="Observation de l’enseignant(e)…"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    {!result.observation && result.rating && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {preschoolObservationSuggestions(result.rating).map(s => (
                          <button key={s} onClick={() => updateDomain(domain.id, { observation: s })} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}

              <article className="rounded-2xl bg-white p-4 shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-gray-900">APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)</h2>
                  <button onClick={proposeGeneralAppreciation} className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                    Proposer un texte
                  </button>
                </div>
                <textarea
                  data-testid="preschool-general-appreciation"
                  value={draft.generalAppreciation}
                  onChange={e => { setDraft({ ...draft, generalAppreciation: e.target.value }); setDirty(true); }}
                  rows={5}
                  placeholder="Écrivez l’appréciation générale qui paraîtra en page 2 du bulletin…"
                  className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  data-testid="preschool-save"
                  onClick={() => persist(draft)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white"
                >
                  <Save className="h-5 w-5" /> Enregistrer la grille
                </button>
                <p className="mt-2 text-center text-xs text-gray-400">La grille s’enregistre aussi automatiquement pendant la saisie.</p>
              </article>
            </section>
          ) : (
            <section data-testid="preschool-official-preview">
              <OfficialPreschoolPages classData={classData} student={selectedStudent} record={draft} />
            </section>
          )}

          <div className="print:hidden mt-4 grid grid-cols-2 gap-2">
            <button
              disabled={selectedIndex <= 0}
              onClick={() => openStudent(students[selectedIndex - 1])}
              className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-bold text-gray-700 shadow disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Enfant précédent
            </button>
            <button
              disabled={selectedIndex < 0 || selectedIndex >= students.length - 1}
              onClick={() => openStudent(students[selectedIndex + 1])}
              className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-bold text-gray-700 shadow disabled:opacity-40"
            >
              Enfant suivant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </main>

        <div className="print:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 p-3 shadow backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 md:grid-cols-4">
            <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white">
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </button>
            <button onClick={() => { setTab('bulletin'); window.setTimeout(() => window.print(), 60); }} className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-bold text-gray-800">
              <Printer className="h-5 w-5" /> Imprimer
            </button>
            <button data-testid="preschool-pdf" onClick={studentPdf} disabled={exporting !== null} className="flex items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-bold text-white disabled:opacity-50">
              {exporting === 'student-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />} PDF officiel (15 F)
            </button>
            <button onClick={() => setTab('bulletin')} className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-bold text-white">
              Voir les 2 pages
            </button>
          </div>
        </div>

        {payTarget === 'student' && (
          <PayModal
            contentId={`bulletin:${classData.id}:${selectedStudent.id}:${trimester}`}
            title={`Bulletin maternelle de ${selectedStudent.prenoms} ${selectedStudent.nom}`}
            price={PDF_PRICE}
            onClose={() => setPayTarget(null)}
            onUnlocked={() => { setPayTarget(null); runExport('student-pdf', doStudent); }}
          />
        )}
      </div>
    );
  }

  const filtered = students.filter(s => `${s.nom} ${s.prenoms} ${s.matricule}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-amber-50/60">
      <header className="sticky top-0 z-20 bg-emerald-700 p-4 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button onClick={onBack} className="rounded-lg bg-white/20 p-2" aria-label="Retour">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">Bulletins officiels de la Maternelle</h1>
            <p className="truncate text-sm text-emerald-100">{classData.name} · Grille d’observation TS / S / PS · {classData.schoolYear}</p>
          </div>
          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-700 sm:block">2 pages officielles</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 pb-24">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-extrabold">GRILLE D’ÉVALUATION TRIMESTRIELLE</p>
          <p className="mt-1">
            Bulletin fidèle au livret de la maternelle : dix domaines observés en <strong>TS</strong>, <strong>S</strong> ou <strong>PS</strong>,
            une observation par domaine, puis l’appréciation générale et les visas en page 2.
          </p>
          <p className="mt-2 italic">« Il est évalué par rapport à lui-même et non par rapport à ses camarades. » — aucun rang, aucune moyenne.</p>
        </div>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trimestre du bulletin</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRESCHOOL_TRIMESTERS.map(t => (
              <button
                key={t.id}
                data-testid={`preschool-trimester-${t.id}`}
                onClick={() => changeTrimester(t.id)}
                className={`rounded-xl px-2 py-2.5 text-sm font-bold ${trimester === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 p-3">
              <Check className="mx-auto h-5 w-5 text-emerald-600" />
              <p className="mt-1 text-xl font-extrabold text-emerald-800">{classCounts.completed}/{students.length}</p>
              <p className="text-xs text-emerald-700">Grilles complètes</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <Users className="mx-auto h-5 w-5 text-amber-600" />
              <p className="mt-1 text-xl font-extrabold text-amber-800">{classCounts.inProgress}</p>
              <p className="text-xs text-amber-700">En cours</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-extrabold text-gray-800">{classCounts.ts} TS · {classCounts.s} S · {classCounts.ps} PS</p>
              <p className="text-xs text-gray-500">Observations saisies</p>
            </div>
          </div>
        </section>

        {students.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white p-4 shadow">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">Exporter toute la classe — {preschoolTrimesterLabel(trimester)}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                data-testid="preschool-export-excel"
                disabled={exporting !== null}
                onClick={() => confirmIncomplete('Exporter le fichier Excel') && runExport('excel', () => exportPreschoolBulletinsExcel(classData, records, trimester))}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel TS/S/PS
              </button>
              <button
                data-testid="preschool-export-word"
                disabled={exporting !== null}
                onClick={() => confirmIncomplete('Exporter le fichier Word') && runExport('word', () => exportPreschoolBulletinsDocx(classData, records, trimester))}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#006b4f] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {exporting === 'word' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Word officiel
              </button>
              <button
                data-testid="preschool-export-pdf"
                disabled={exporting !== null}
                onClick={() => runExport('class-pdf-gate', async () => classPdf())}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {exporting === 'class-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF de la classe
              </button>
              <button
                data-testid="preschool-export-summary"
                disabled={exporting !== null}
                onClick={() => runExport('summary', () => exportPreschoolSummaryPdf(classData, records, trimester))}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {exporting === 'summary' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Synthèse sans classement
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Chaque bulletin PDF/Word comporte les deux pages du livret. La synthèse ne classe jamais les enfants.</p>
          </section>
        )}

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un enfant ou un matricule…"
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {students.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-16 w-16 text-gray-300" />
            <p className="mt-3 font-bold text-gray-700">Aucun enfant dans cette classe</p>
            <p className="text-sm text-gray-500">Ajoutez d’abord les enfants depuis l’écran Élèves.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {filtered.map(student => {
              const record = recordFor(student.id);
              const c = preschoolCounts(record);
              return (
                <button
                  key={student.id}
                  data-testid={`preschool-student-${student.id}`}
                  onClick={() => openStudent(student)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow transition hover:shadow-md"
                >
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-extrabold text-white">{initials(student)}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-gray-900">{student.nom.toUpperCase()} {student.prenoms}</span>
                    <span className="block text-xs text-gray-500">
                      {c.completed === c.total ? 'Grille complète' : c.completed > 0 ? `Grille commencée : ${c.completed}/${c.total}` : 'Grille non commencée'}
                      {record.generalAppreciation ? ' · appréciation écrite' : ''}
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-gray-100">
                      <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(c.completed / c.total) * 100}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs font-bold text-gray-600">
                    <span className="block text-emerald-700">{c.TS} TS</span>
                    <span className="block text-sky-700">{c.S} S</span>
                    <span className="block text-rose-700">{c.PS} PS</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {payTarget === 'class' && (
        <PayModal
          contentId={`bulletins:${classData.id}:${trimester}`}
          title={`Bulletins maternelle de ${classData.name} (${students.length} enfant(s))`}
          price={PDF_PRICE * Math.max(1, students.length)}
          onClose={() => setPayTarget(null)}
          onUnlocked={() => { setPayTarget(null); runExport('class-pdf', doClassPdf); }}
        />
      )}
    </div>
  );
}

function PayModal({ contentId, title, price, onClose, onUnlocked }: {
  contentId: string;
  title: string;
  price: number;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  return (
    <div className="print:hidden fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto bg-transparent sm:max-w-md" onClick={e => e.stopPropagation()}>
        <PaywallPanel contentId={contentId} kind="bulletin" title={title} price={String(price)} onUnlocked={onUnlocked} />
      </div>
    </div>
  );
}

function OfficialPreschoolPages({ classData, student, record }: {
  classData: ClassData;
  student: Student;
  record: PreschoolEvaluationRecord;
}) {
  const signature = getSignatureImage();
  const stamp = getStampImage();
  const appreciation = record.generalAppreciation.trim();
  return (
    <div className="msp-preschool-doc grid gap-6 xl:grid-cols-2" data-testid="preschool-two-pages">
      {/* PAGE 1 */}
      <article className="preschool-official-page mx-auto w-full max-w-[820px] bg-white p-5 font-serif text-black shadow-xl ring-1 ring-gray-300 sm:p-7" data-testid="preschool-page-grid">
        <div className="border-b border-black pb-2 font-sans text-[11px] leading-tight">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-extrabold uppercase">{classData.school || 'École maternelle'}</p>
              {classData.circonscription && <p>{classData.circonscription}</p>}
            </div>
            <div className="text-right">
              <p>Année scolaire : {classData.schoolYear || '—'}</p>
              <p>Classe : {classData.name || classData.level}</p>
            </div>
          </div>
          <div className="mt-1 flex items-start justify-between gap-4">
            <p className="font-bold">Nom et Prénoms de l’enfant : {(student.nom || '').toUpperCase()} {student.prenoms}</p>
            <p>Matricule : {student.matricule || '—'}</p>
          </div>
        </div>

        <h2 className="mt-7 text-center text-[clamp(19px,3.2vw,30px)] font-bold tracking-wide">GRILLE D’ÉVALUATION TRIMESTRIELLE</h2>
        <p className="mt-2 text-center text-lg font-bold">................ {trimesterNumeral(record.trimester)} Trimestre ................</p>

        <table className="mt-7 w-full border-collapse border border-black text-[clamp(11px,1.6vw,16px)]">
          <thead>
            <tr>
              <th rowSpan={2} className="w-[7%] border border-black px-1 py-3 text-center">N°</th>
              <th rowSpan={2} className="w-[38%] border border-black px-2 py-3 text-center">Domaine d’Évaluation</th>
              <th colSpan={3} className="w-[24%] border border-black px-1 py-1 text-center leading-tight">Echelle des<br />valeurs</th>
              <th rowSpan={2} className="w-[31%] border border-black px-2 py-3 text-center">Observation</th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-1.5 text-center">TS</th>
              <th className="border border-black px-1 py-1.5 text-center">S</th>
              <th className="border border-black px-1 py-1.5 text-center">PS</th>
            </tr>
          </thead>
          <tbody>
            {PRESCHOOL_DOMAINS.map((domain, index) => {
              const r = record.results[domain.id] || { rating: '' as PreschoolRating, observation: '' };
              return (
                <tr key={domain.id} className="min-h-12">
                  <td className="border border-black px-1 py-3 text-center">{index + 1}</td>
                  <td className="border border-black px-2 py-3">{domain.label}</td>
                  <td className="border border-black px-1 py-3 text-center text-xl font-bold">{r.rating === 'TS' ? '✓' : ''}</td>
                  <td className="border border-black px-1 py-3 text-center text-xl font-bold">{r.rating === 'S' ? '✓' : ''}</td>
                  <td className="border border-black px-1 py-3 text-center text-xl font-bold">{r.rating === 'PS' ? '✓' : ''}</td>
                  <td className="border border-black px-2 py-3">{r.observation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-7 text-[clamp(13px,1.8vw,18px)] leading-relaxed">
          <strong className="underline">NB :</strong> L’évaluation est faite sur la base de l’observation permanente de l’enfant.
          Il est évalué par rapport à lui-même et non par rapport à ses camarades.
        </p>
      </article>

      {/* PAGE 2 */}
      <article className="preschool-official-page mx-auto w-full max-w-[820px] bg-white p-5 font-serif text-black shadow-xl ring-1 ring-gray-300 sm:p-7" data-testid="preschool-page-visas">
        <p className="font-sans text-[10px] text-gray-500">{(student.nom || '').toUpperCase()} {student.prenoms} · {classData.name} · {preschoolTrimesterLabel(record.trimester)}</p>
        <h2 className="mt-6 text-[clamp(17px,2.6vw,24px)] font-bold underline underline-offset-4">APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)</h2>

        <div className="relative mt-6 min-h-[190px]">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="border-b border-dotted border-gray-500" />)}
          </div>
          <p className="relative whitespace-pre-wrap text-[16px] leading-[31px]">{appreciation}</p>
        </div>

        <div className="mt-9 grid grid-cols-2 border border-black">
          <section className="min-h-[165px] border-r border-black p-3">
            <h3 className="text-[clamp(11px,1.8vw,17px)] font-bold underline underline-offset-3">VISA DE L’ENSEIGNANT(E)</h3>
            {signature && <img src={signature} alt="Signature de l’enseignant(e)" className="mx-auto mt-5 max-h-24 object-contain" />}
          </section>
          <section className="min-h-[165px] p-3">
            <h3 className="text-[clamp(11px,1.8vw,17px)] font-bold underline underline-offset-3">VISA DU DIRECTEUR(TRICE)</h3>
            {stamp && <img src={stamp} alt="Cachet de la direction" className="mx-auto mt-4 max-h-28 object-contain" />}
          </section>
        </div>

        <h3 className="mt-10 text-center text-[clamp(15px,2.3vw,22px)] font-bold underline underline-offset-4">VISA DES PARENTS OU TUTEURS DE L’ENFANT</h3>
        <div className="mt-7 space-y-8" aria-hidden="true">
          <div className="border-b border-dotted border-gray-500" />
          <div className="border-b border-dotted border-gray-500" />
          <div className="border-b border-dotted border-gray-500" />
        </div>
        <p className="mt-12 text-right text-lg">Signature et nom</p>

        <section className="mt-12 text-[clamp(13px,1.8vw,18px)] leading-relaxed">
          <h3 className="font-bold underline underline-offset-3">LEGENDES</h3>
          <p className="mt-2"><span className="font-bold underline">TS</span> : Très Satisfaisant</p>
          <p><span className="font-bold underline">S</span> : Satisfaisant</p>
          <p><span className="font-bold underline">PS</span> : Peu Satisfaisant</p>
        </section>
      </article>
    </div>
  );
}
