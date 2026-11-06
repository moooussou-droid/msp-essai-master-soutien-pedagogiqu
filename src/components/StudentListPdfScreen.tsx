import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, FileText, FileSpreadsheet, Plus, Trash2, Upload, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  generateId, getAllClasses, getDefaultSubjectsForLevel, getDefaultSubjectsForPrescolaire,
  getDefaultSubjectsForSecondary, type ClassData, type EducationType, type SecondaryLevel,
  type SecondarySerie,
} from '../utils/database';
import { downloadExcel } from '../utils/excelGenerator';
import { generateStudentListExcel } from '../utils/studentListExport';
import { draftsToStudents, extractStudentListFromPdf, type StudentListDraft, type StudentPdfExtraction } from '../utils/studentListPdf';
import SchoolLockBanner from './SchoolLockBanner';

const LEVELS = ['Maternelle 1', 'Maternelle 2', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'];
const SERIES: SecondarySerie[] = ['A1', 'A2', 'B', 'C', 'D'];

function typeForLevel(level: string): EducationType {
  if (/^maternelle/i.test(level)) return 'prescolaire';
  if (/^(6|5|4|3|2|1|t)/i.test(level)) return 'secondaire';
  return 'primaire';
}

function defaultSchoolYear(): string {
  const now = new Date();
  const firstYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${firstYear}-${firstYear + 1}`;
}

function newDraft(): StudentListDraft {
  return { id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matricule: '', nom: '', prenoms: '', sexe: '', rawLine: 'Ajout manuel' };
}

export default function StudentListPdfScreen() {
  const goBack = useSmartBack();
  const inputRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [classId, setClassId] = useState('');
  const [level, setLevel] = useState('CM2');
  const [serie, setSerie] = useState<SecondarySerie>('A2');
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('CM2');
  const [schoolYear, setSchoolYear] = useState(defaultSchoolYear);
  const [pdfName, setPdfName] = useState('');
  const [students, setStudents] = useState<StudentListDraft[]>([]);
  const [extraction, setExtraction] = useState<StudentPdfExtraction | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    getAllClasses().then(list => {
      if (!alive) return;
      setClasses(list);
      if (list.length) {
        setClassId(list[0].id);
        setSchool(list[0].school || '');
      } else setMode('new');
    }).catch(() => setMode('new'));
    return () => { alive = false; };
  }, []);

  const selectedClass = classes.find(item => item.id === classId) || null;
  const activeLevel = mode === 'existing' && selectedClass ? selectedClass.level : level;
  const activeType = mode === 'existing' && selectedClass
    ? (selectedClass.educationType || typeForLevel(selectedClass.level)) : typeForLevel(level);
  const activeSerie = mode === 'existing' && selectedClass ? selectedClass.serie : serie;
  const subjects = useMemo(() => {
    if (mode === 'existing' && selectedClass?.subjects?.length) return [...selectedClass.subjects].sort((a, b) => a.order - b.order);
    const targetLevel = mode === 'existing' && selectedClass ? selectedClass.level : level;
    const targetType = mode === 'existing' && selectedClass
      ? (selectedClass.educationType || typeForLevel(selectedClass.level)) : typeForLevel(targetLevel);
    const targetSerie = mode === 'existing' && selectedClass ? selectedClass.serie || serie : serie;
    if (targetType === 'prescolaire') return getDefaultSubjectsForPrescolaire(targetLevel);
    if (targetType === 'secondaire') return getDefaultSubjectsForSecondary(targetLevel as SecondaryLevel, targetSerie);
    return getDefaultSubjectsForLevel(targetLevel);
  }, [mode, selectedClass, level, serie]);

  const exportClass = useMemo<ClassData>(() => {
    const base = mode === 'existing' && selectedClass
      ? selectedClass
      : {
          id: `pdf-export-${generateId()}`,
          name: className.trim() || level,
          school: school.trim() || 'École',
          level,
          educationType: typeForLevel(level),
          serie: typeForLevel(level) === 'secondaire' && ['2nde', '1ère', 'Tle'].includes(level) ? serie : undefined,
          schoolYear: schoolYear.trim() || defaultSchoolYear(),
          sequence: typeForLevel(level) === 'secondaire' ? '1er Semestre' : '1er Trimestre',
          subjects,
          students: [],
          notes: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
    const selectedSubjects = base.subjects?.length ? base.subjects : subjects;
    return {
      ...base,
      id: base.id || `pdf-export-${generateId()}`,
      school: base.school || 'École',
      name: base.name || activeLevel,
      level: base.level || activeLevel,
      educationType: base.educationType || activeType,
      serie: base.serie || activeSerie,
      schoolYear: base.schoolYear || schoolYear || defaultSchoolYear(),
      sequence: base.sequence || (activeType === 'secondaire' ? '1er Semestre' : '1er Trimestre'),
      subjects: selectedSubjects,
      students: draftsToStudents(students),
      notes: [],
      createdAt: base.createdAt || Date.now(),
      updatedAt: Date.now(),
    } as ClassData;
  }, [mode, selectedClass, className, level, school, schoolYear, serie, subjects, students, activeLevel, activeType, activeSerie]);

  async function handlePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setStudents([]);
    setExtraction(null);
    setNotice('');
    setPdfName(file.name);
    setBusy(true);
    setProgress('Préparation…');
    try {
      const result = await extractStudentListFromPdf(file, setProgress);
      setExtraction(result);
      setStudents(result.students);
      setNotice(result.students.length
        ? `${result.students.length} élève(s) détecté(s). Vérifiez les noms et matricules avant l’export.`
        : 'Aucun nom extrait automatiquement. Ajoutez ou saisissez les lignes dans le tableau ci-dessous.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de lire ce PDF.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function updateStudent(id: string, field: keyof Pick<StudentListDraft, 'matricule' | 'nom' | 'prenoms'>, value: string) {
    setStudents(current => current.map(student => student.id === id ? { ...student, [field]: value } : student));
  }

  async function exportExcel() {
    const cleanStudents = students.filter(student => student.nom.trim() || student.prenoms.trim());
    if (!cleanStudents.length) {
      setNotice('Importez un PDF avec des élèves reconnus ou ajoutez au moins une ligne.');
      return;
    }
    if (mode === 'new' && !school.trim()) {
      setNotice('Renseignez le nom de l’école pour nommer le fichier Excel.');
      return;
    }
    if (mode === 'new' && activeType === 'secondaire' && ['2nde', '1ère', 'Tle'].includes(level) && !serie) {
      setNotice('Choisissez la série du second cycle pour afficher les matières correspondantes.');
      return;
    }
    setBusy(true);
    setNotice('Génération du classeur avec les matières de l’application…');
    try {
      const data = { ...exportClass, students: draftsToStudents(cleanStudents) };
      const { blob, filename } = await generateStudentListExcel(data);
      const result = await downloadExcel(blob, filename);
      if (result === 'cancelled') setNotice('Téléchargement/partage annulé. Le tableau reste disponible pour correction.');
      else setNotice(`Classeur Excel créé (${cleanStudents.length} élèves, ${data.subjects.length} matières/domaines).`);
    } catch (error) {
      console.error(error);
      setNotice(error instanceof Error ? error.message : 'Erreur lors de la génération du fichier Excel.');
    } finally {
      setBusy(false);
    }
  }

  const secondCycle = activeType === 'secondaire' && ['2nde', '1ère', 'Tle'].includes(activeLevel);
  const primary = activeType === 'primaire';

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <SchoolLockBanner />
      <header className="msp-kente bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour"><ArrowLeft className="w-5 h-5" /> Retour</button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-2xl p-3"><FileText className="w-8 h-8" /></div>
            <div><h1 className="text-xl font-black leading-tight">Créer une liste Excel depuis un PDF</h1><p className="text-white/85 text-sm">Élèves et matières, sans attendre EducMaster</p></div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90">Sélectionnez un PDF texte ou scanné. La lecture et l’OCR français sont exécutés localement sur cet appareil; les noms d’élèves ne sont pas envoyés dans le cloud.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-3">
          <h2 className="font-bold text-slate-900">1. Choisir la classe et ses matières</h2>
          {classes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('existing')} className={`rounded-full px-3 py-2 text-sm font-semibold ${mode === 'existing' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Utiliser une classe de l’application</button>
              <button type="button" onClick={() => setMode('new')} className={`rounded-full px-3 py-2 text-sm font-semibold ${mode === 'new' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Créer un fichier pour un niveau</button>
            </div>
          )}
          {mode === 'existing' && classes.length > 0 ? (
            <label className="block text-sm font-medium text-slate-700">Classe
              <select value={classId} onChange={event => setClassId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm">
                {classes.map(item => <option key={item.id} value={item.id}>{item.school} — {item.name} ({item.level}{item.serie ? ` ${item.serie}` : ''})</option>)}
              </select>
              <span className="mt-1 block text-xs text-slate-500">Les matières personnalisées de cette classe seront reprises.</span>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Ordre d’enseignement et classe
                <select value={level} onChange={event => { setLevel(event.target.value); setClassName(event.target.value); }} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm">
                  <optgroup label="Préscolaire">{LEVELS.slice(0, 2).map(item => <option key={item}>{item}</option>)}</optgroup>
                  <optgroup label="Primaire">{LEVELS.slice(2, 8).map(item => <option key={item}>{item}</option>)}</optgroup>
                  <optgroup label="Secondaire">{LEVELS.slice(8).map(item => <option key={item}>{item}</option>)}</optgroup>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Nom de la classe / groupe
                <input value={className} onChange={event => setClassName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Ex. : CM2 A, 3ème C" />
              </label>
              <label className="text-sm font-medium text-slate-700">École
                <input value={school} onChange={event => setSchool(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Nom de l’établissement" />
              </label>
              <label className="text-sm font-medium text-slate-700">Année scolaire
                <input value={schoolYear} onChange={event => setSchoolYear(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="2026-2027" />
              </label>
              {secondCycle && <label className="text-sm font-medium text-slate-700">Série
                <select value={serie} onChange={event => setSerie(event.target.value as SecondarySerie)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm">
                  {SERIES.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>}
            </div>
          )}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-sm font-bold text-indigo-900">Matières / domaines inclus ({subjects.length})</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{subjects.map(subject => <span key={subject.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-800 ring-1 ring-indigo-100">{subject.name}</span>)}</div>
            <p className="mt-2 text-xs text-indigo-800">{primary ? 'Le classeur primaire contient les 4 onglets d’évaluation officiels reconnus par l’application.' : activeType === 'prescolaire' ? 'Le classeur maternelle propose les domaines de l’application avec les colonnes TS / S / PS.' : 'Le classeur reprend la liste des élèves et les matières du secondaire configurées pour ce niveau.'}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-3">
          <h2 className="font-bold text-slate-900">2. Importer la liste PDF</h2>
          <p className="text-sm text-slate-600">Importez de préférence un PDF par classe. Les PDF avec texte sélectionnable sont lus directement; les scans et photos de pages passent par l’OCR français local. Taille maximale : 30 Mo et 60 pages.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" />{pdfName ? 'Choisir un autre PDF' : 'Choisir un PDF'}</button>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handlePdf} />
            {pdfName && <span className="self-center text-xs text-slate-500">{pdfName}</span>}
          </div>
          {busy && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{progress || 'Traitement local en cours…'}</p>}
          {extraction && <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{extraction.pages} page(s) — méthode : {extraction.source} — {extraction.students.length} élève(s) détecté(s)</div>}
          {extraction?.warnings.map((warning, index) => <p key={index} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mr-1 inline h-4 w-4" />{warning}</p>)}
        </section>

        {notice && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{notice}</div>}

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-bold text-slate-900">3. Vérifier les élèves détectés</h2><p className="text-xs text-slate-500">Corrigez l’ordre Nom / Prénoms et les matricules avant export.</p></div>
            <button type="button" onClick={() => setStudents(current => [...current, newDraft()])} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><Plus className="h-4 w-4" />Ajouter une ligne</button>
          </div>
          {students.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Aucun élève dans l’aperçu. Importez un PDF ou ajoutez une ligne.</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-2">Matricule</th><th className="p-2">Nom</th><th className="p-2">Prénoms</th><th className="p-2">Ligne extraite</th><th className="p-2">Action</th></tr></thead>
                <tbody>{students.map((student, index) => <tr key={student.id} className="border-t border-slate-100">
                  <td className="p-2"><input aria-label={`Matricule élève ${index + 1}`} value={student.matricule} onChange={event => updateStudent(student.id, 'matricule', event.target.value)} className="w-28 rounded-lg border border-slate-200 p-2 text-xs" /></td>
                  <td className="p-2"><input aria-label={`Nom élève ${index + 1}`} value={student.nom} onChange={event => updateStudent(student.id, 'nom', event.target.value)} className="w-40 rounded-lg border border-slate-200 p-2 text-xs" /></td>
                  <td className="p-2"><input aria-label={`Prénoms élève ${index + 1}`} value={student.prenoms} onChange={event => updateStudent(student.id, 'prenoms', event.target.value)} className="w-44 rounded-lg border border-slate-200 p-2 text-xs" /></td>
                  <td className="max-w-[220px] truncate p-2 text-xs text-slate-500" title={student.rawLine}>{student.rawLine}</td>
                  <td className="p-2"><button type="button" onClick={() => setStudents(current => current.filter(item => item.id !== student.id))} aria-label={`Supprimer ligne ${index + 1}`} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">L’import PDF ne modifie pas automatiquement les classes ni les dossiers élèves enregistrés dans l’application.</p>
          <button type="button" onClick={exportExcel} disabled={busy || students.filter(student => student.nom.trim() || student.prenoms.trim()).length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-4 text-sm font-bold text-white disabled:opacity-50"><FileSpreadsheet className="h-5 w-5" />{busy ? 'Traitement…' : 'Créer / télécharger le classeur Excel' }<Download className="h-4 w-4" /></button>
        </section>
      </main>
    </div>
  );
}
