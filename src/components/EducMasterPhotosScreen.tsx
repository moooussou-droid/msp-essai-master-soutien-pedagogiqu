/**
 * PHOTOS D’IDENTITÉ EDUCMASTER (v67).
 *
 * Disponible pour chaque école et chaque classe. L’enseignant choisit un
 * élève, prend sa photo avec la caméra intégrée (ou importe une image),
 * la cadre au format d’identité 4:5, peut remplacer le fond par du blanc,
 * puis télécharge les fichiers nommés `matricule_NOM_Prenom_Prenom`.
 *
 * EducMaster exige ensuite que l’utilisateur, connecté à son compte,
 * sélectionne ces fichiers dans « Importer les photos » et touche
 * « Enregistrer ». Aucune photo ne quitte l’appareil avant cette action.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, Camera, CheckCircle2, ChevronLeft, Download,
  ExternalLink, FileImage, FlipHorizontal2, ImagePlus, Loader2, RotateCcw,
  RotateCw, Save, Search, Sparkles, Upload, UserRound, X,
} from 'lucide-react';
import {
  ClassData, Student, getAllClasses, getClass, saveClass, sortStudents,
} from '../utils/database';
import { useSmartBack } from '../utils/useSmartBack';
import { fileToDataUrl } from '../utils/scanner';
import {
  IdentityPhotoResult, captureVideoFrame, processIdentityPhoto,
} from '../utils/identityPhoto';
import {
  downloadEducMasterPhoto, duplicateMatriculesInClasses, educMasterPhotoFilename,
  exportEducMasterPhotosZip, matriculeFromPhotoFilename, photoReadiness,
} from '../utils/educMasterPhotos';

type Filter = 'all' | 'ready' | 'no-photo' | 'no-matricule';

interface BatchReport {
  imported: string[];
  unmatched: string[];
  errors: string[];
}

const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

export default function EducMasterPhotosScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [identity, setIdentity] = useState({ matricule: '', nom: '', prenoms: '' });
  const [sourceImage, setSourceImage] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [processed, setProcessed] = useState<IdentityPhotoResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.40);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [whiteBackground, setWhiteBackground] = useState(true);
  const [tolerance, setTolerance] = useState(40);

  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const singleFileRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement | null>(null);
  const batchFileRef = useRef<HTMLInputElement | null>(null);
  const [batchReport, setBatchReport] = useState<BatchReport | null>(null);

  const students = useMemo(
    () => (classData ? sortStudents(classData.students) : []),
    [classData],
  );
  const selected = students.find(s => s.id === selectedId) || null;
  const duplicates = useMemo(() => duplicateMatriculesInClasses(classes), [classes]);
  const readiness = useMemo(
    () => new Map(students.map(s => [s.id, photoReadiness(s, duplicates)])),
    [students, duplicates],
  );
  const stats = useMemo(() => {
    let ready = 0, photos = 0, noMatricule = 0;
    for (const s of students) {
      if (readiness.get(s.id)?.ready) ready++;
      if (s.photoUrl) photos++;
      if (!(s.matricule || '').trim()) noMatricule++;
    }
    return { ready, photos, noMatricule, total: students.length };
  }, [students, readiness]);

  useEffect(() => {
    let alive = true;
    Promise.all([getAllClasses(), id ? getClass(id) : Promise.resolve(undefined)])
      .then(([all, current]) => {
        if (!alive) return;
        const sorted = [...all].sort((a, b) =>
          `${a.school} ${a.name}`.localeCompare(`${b.school} ${b.name}`, 'fr', { sensitivity: 'base' }));
        setClasses(sorted);
        setClassData(current || null);
        setSelectedId(current?.students?.[0]?.id || null);
      })
      .catch(() => { if (alive) setStatus('Impossible de charger la classe.'); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!selected) return;
    setIdentity({
      matricule: selected.matricule || '',
      nom: selected.nom || '',
      prenoms: selected.prenoms || '',
    });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { /* lecture différée par le navigateur */ });
    }
  }, [cameraOn]);

  useEffect(() => {
    if (!sourceImage) {
      setProcessed(null);
      return;
    }
    let alive = true;
    setProcessing(true);
    setProcessError('');
    const timer = window.setTimeout(async () => {
      try {
        const result = await processIdentityPhoto(sourceImage, {
          centerX, centerY, zoom, rotation, whiteBackground, tolerance,
        });
        if (alive) setProcessed(result);
      } catch (e: any) {
        if (alive) setProcessError(e?.message || 'Traitement impossible.');
      } finally {
        if (alive) setProcessing(false);
      }
    }, 220);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [sourceImage, centerX, centerY, zoom, rotation, whiteBackground, tolerance]);

  function flash(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 4500);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera(nextFacing = facing) {
    setCameraError('');
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(nextFacing);
      setCameraOn(true);
    } catch {
      setCameraError(
        'Caméra intégrée indisponible ou accès refusé. Autorisez la caméra dans le navigateur, '
        + 'ou touchez « Caméra du téléphone » pour utiliser l’appareil photo du téléphone.',
      );
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    try {
      const frame = captureVideoFrame(videoRef.current);
      prepareSource(frame, 'Photo prise avec la caméra intégrée');
      stopCamera();
    } catch (e: any) {
      setCameraError(e?.message || 'Capture impossible.');
    }
  }

  function prepareSource(dataUrl: string, name: string) {
    setSourceImage(dataUrl);
    setSourceName(name);
    setCenterX(0.5);
    setCenterY(0.40);
    setZoom(1);
    setRotation(0);
    setWhiteBackground(true);
    setTolerance(40);
    setBatchReport(null);
  }

  async function onSingleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { prepareSource(await fileToDataUrl(file), file.name); }
    catch (err: any) { alert(err?.message || 'Image illisible.'); }
  }

  async function persistClass(updated: ClassData, message: string) {
    await saveClass(updated);
    setClassData(updated);
    setClasses(previous => previous.map(c => (c.id === updated.id ? updated : c)));
    flash(message);
  }

  function normalizedIdentity(): { matricule: string; nom: string; prenoms: string } | null {
    const value = {
      matricule: identity.matricule.trim().replace(/\s+/g, ''),
      nom: identity.nom.trim(),
      prenoms: identity.prenoms.trim(),
    };
    if (!value.nom || !value.prenoms) {
      alert('Le nom et les Prénoms sont indispensables pour former le nom du fichier EducMaster.');
      return null;
    }
    if (value.matricule) {
      const duplicate = classes.some(c => c.students.some(s =>
        s.id !== selected?.id && (s.matricule || '').trim() === value.matricule));
      if (duplicate) {
        alert(`Le matricule ${value.matricule} est déjà attribué à un autre élève. Corrigez-le avant l’export EducMaster.`);
        return null;
      }
    }
    return value;
  }

  async function saveIdentity() {
    if (!classData || !selected) return;
    const value = normalizedIdentity();
    if (!value) return;
    setBusy('identity');
    try {
      await persistClass({
        ...classData,
        students: classData.students.map(s => (s.id === selected.id ? { ...s, ...value } : s)),
      }, 'Identité et matricule enregistrés.');
    } finally { setBusy(null); }
  }

  async function saveProcessedPhoto() {
    if (!classData || !selected || !processed) return;
    const value = normalizedIdentity();
    if (!value) return;
    if (!value.matricule && !window.confirm('Le matricule EducMaster est encore vide. Enregistrer la photo maintenant et compléter le matricule ensuite ?')) return;
    if (whiteBackground && !processed.backgroundApplied && processed.backgroundWarning) {
      if (!window.confirm(`${processed.backgroundWarning}\n\nEnregistrer quand même la photo originale, sans fond blanc ?`)) return;
    }
    setBusy('photo');
    try {
      const updatedStudent: Student = {
        ...selected,
        ...value,
        photoUrl: processed.dataUrl,
        educMasterPhotoPreparedAt: Date.now(),
        educMasterPhotoWhiteBackground: processed.backgroundApplied,
      };
      await persistClass({
        ...classData,
        students: classData.students.map(s => (s.id === selected.id ? updatedStudent : s)),
      }, `Photo enregistrée : ${educMasterPhotoFilename(updatedStudent)}`);
    } finally { setBusy(null); }
  }

  function nextNeedingPhoto() {
    if (!selected) return;
    const idx = students.findIndex(s => s.id === selected.id);
    const ordered = [...students.slice(idx + 1), ...students.slice(0, idx + 1)];
    const next = ordered.find(s => !photoReadiness(s, duplicates).ready);
    if (next) {
      setSelectedId(next.id);
      setSourceImage('');
      setProcessed(null);
      stopCamera();
    } else {
      flash('Toutes les photos de la classe sont prêtes pour EducMaster.');
    }
  }

  async function onBatchFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!classData || files.length === 0) return;
    setBusy('batch');
    const report: BatchReport = { imported: [], unmatched: [], errors: [] };
    const byMatricule = new Map(classData.students
      .filter(s => (s.matricule || '').trim())
      .map(s => [(s.matricule || '').trim(), s]));
    let updatedStudents = [...classData.students];

    for (const file of files) {
      const matricule = matriculeFromPhotoFilename(file.name);
      const student = byMatricule.get(matricule);
      if (!student) {
        report.unmatched.push(file.name);
        continue;
      }
      try {
        const source = await fileToDataUrl(file);
        const result = await processIdentityPhoto(source, { whiteBackground: false });
        updatedStudents = updatedStudents.map(s => (s.id === student.id
          ? { ...s, photoUrl: result.dataUrl, educMasterPhotoPreparedAt: Date.now(), educMasterPhotoWhiteBackground: false }
          : s));
        report.imported.push(`${student.nom} ${student.prenoms}`);
      } catch (err: any) {
        report.errors.push(`${file.name} : ${err?.message || 'image illisible'}`);
      }
    }

    try {
      if (report.imported.length > 0) {
        await persistClass(
          { ...classData, students: updatedStudents },
          `${report.imported.length} photo(s) importée(s) et cadrée(s).`,
        );
      }
      setBatchReport(report);
    } finally { setBusy(null); }
  }

  async function exportZip() {
    if (!classData) return;
    if (stats.ready === 0) {
      alert('Aucune photo n’est encore prête : chaque élève exporté doit avoir un matricule EducMaster unique, un nom, des Prénoms et une photo.');
      return;
    }
    setBusy('zip');
    try {
      const result = await exportEducMasterPhotosZip(classData, classes);
      flash(result.skipped.length
        ? `${result.included} photo(s) exportée(s). ${result.skipped.length} élève(s) incomplet(s) sont détaillés dans le bordereau.`
        : `${result.included} photo(s) exportée(s), prêtes pour EducMaster.`);
    } catch (e: any) {
      alert(`Export ZIP impossible : ${e?.message || e}`);
    } finally { setBusy(null); }
  }

  const filteredStudents = students.filter(s => {
    const state = readiness.get(s.id);
    if (filter === 'ready' && !state?.ready) return false;
    if (filter === 'no-photo' && s.photoUrl) return false;
    if (filter === 'no-matricule' && (s.matricule || '').trim()) return false;
    return `${s.nom} ${s.prenoms} ${s.matricule}`.toLowerCase().includes(search.toLowerCase());
  });

  const projectedFilename = selected
    ? educMasterPhotoFilename({ ...selected, ...identity })
    : '';

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-center">
        <p className="font-bold text-gray-700">Chargement de la classe…</p>
        {status && <p className="mt-2 text-sm text-red-600">{status}</p>}
        <button onClick={() => goBack()} className="mt-5 rounded-xl bg-white px-4 py-2 font-bold shadow">Retour</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="educmaster-photos-screen">
      <header className="sticky top-0 z-30 bg-[#123f6e] p-4 text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button onClick={() => goBack()} className="rounded-lg bg-white/20 p-2" aria-label="Retour">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold">Photos d’identité EducMaster</h1>
            <p className="truncate text-sm text-blue-100">Caméra intégrée · fond blanc · matricule_NOM_Prenom_Prenom</p>
          </div>
          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#123f6e] sm:block">
            {stats.ready}/{stats.total} prêtes
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 pb-24">
        {status && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> {status}
          </div>
        )}

        <section className="rounded-2xl bg-white p-4 shadow">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="educmaster-class-select">
                École et classe
              </label>
              <select
                id="educmaster-class-select"
                data-testid="educmaster-class-select"
                value={classData.id}
                onChange={e => navigate(`/class/${e.target.value}/photos-educmaster`)}
                className={`${inputClass} mt-1 font-semibold`}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.school || 'École'} — {c.name} ({c.schoolYear})</option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                Nom imposé par EducMaster : <code className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-900">matricule_VotreChoixDeNom</code>.
                Exemple : <code className="break-all rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-900">104120183578_ASSOGBA_Jean_Paul</code>.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-2xl font-extrabold text-emerald-700">{stats.ready}</p>
                <p className="text-xs text-emerald-700">Prêtes</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-2xl font-extrabold text-blue-700">{stats.photos}</p>
                <p className="text-xs text-blue-700">Photos</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-2xl font-extrabold text-amber-700">{stats.noMatricule}</p>
                <p className="text-xs text-amber-700">Sans matricule</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <button
              data-testid="educmaster-export-zip"
              onClick={exportZip}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123f6e] py-3 font-bold text-white disabled:opacity-50"
            >
              {busy === 'zip' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
              Exporter le ZIP EducMaster
            </button>
            <button
              onClick={() => batchFileRef.current?.click()}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-3 font-bold text-blue-800 disabled:opacity-50"
            >
              {busy === 'batch' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              Importer des photos nommées
            </button>
            <a
              href="https://educmaster.bj"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3 font-bold text-[#123f6e]"
            >
              Ouvrir EducMaster <ExternalLink className="h-4 w-4" />
            </a>
            <input ref={batchFileRef} data-testid="batch-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={onBatchFiles} />
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-gray-500">
            <li>Préparez et exportez les photos ci-dessous, puis décompressez le ZIP.</li>
            <li>Dans EducMaster : sélectionnez les élèves → <strong>Actions → Importer les photos</strong>.</li>
            <li>Choisissez les images du dossier <strong>PHOTOS_EDUCMASTER</strong>, puis touchez <strong>Enregistrer</strong>.</li>
          </ol>

          {batchReport && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-bold">Résultat de l’importation groupée</p>
              <p>{batchReport.imported.length} photo(s) rattachée(s) automatiquement par matricule.</p>
              {batchReport.unmatched.length > 0 && <p className="mt-1"><strong>Sans correspondance :</strong> {batchReport.unmatched.join(' · ')}</p>}
              {batchReport.errors.length > 0 && <p className="mt-1 text-red-700">{batchReport.errors.join(' · ')}</p>}
            </div>
          )}
        </section>

        {students.length === 0 ? (
          <section className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
            <UserRound className="mx-auto h-16 w-16 text-gray-300" />
            <h2 className="mt-3 font-bold text-gray-800">Aucun élève dans cette classe</h2>
            <p className="mt-1 text-sm text-gray-500">Ajoutez les élèves et leurs matricules EducMaster avant de prendre les photos.</p>
            <Link to={`/class/${classData.id}/students`} className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">
              Ouvrir la liste des élèves
            </Link>
          </section>
        ) : (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[420px_1fr]">
            {/* Liste de contrôle */}
            <section className="rounded-2xl bg-white p-4 shadow">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, prénom ou matricule…" className={`${inputClass} pl-10`} />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {([
                  ['all', 'Tous'], ['ready', 'Prêts'], ['no-photo', 'Sans photo'], ['no-matricule', 'Sans matricule'],
                ] as [Filter, string][]).map(([value, label]) => (
                  <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${filter === value ? 'bg-[#123f6e] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {filteredStudents.map(student => {
                  const state = readiness.get(student.id)!;
                  const active = selected?.id === student.id;
                  return (
                    <article
                      key={student.id}
                      data-testid={`educmaster-student-${student.id}`}
                      className={`flex items-center gap-3 rounded-2xl border p-2.5 ${active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 bg-white'}`}
                    >
                      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setSelectedId(student.id); setSourceImage(''); stopCamera(); }}>
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="h-14 w-11 shrink-0 rounded-lg border bg-white object-cover" />
                        ) : (
                          <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500"><UserRound className="h-6 w-6" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-gray-900">{student.nom.toUpperCase()} {student.prenoms}</span>
                          <span className="block truncate font-mono text-[11px] text-gray-500">{state.filename}</span>
                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${state.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {state.ready ? '✓ Prêt EducMaster' : state.issues.join(' · ')}
                          </span>
                        </span>
                      </button>
                      {state.ready && (
                        <button
                          onClick={() => downloadEducMasterPhoto(student)}
                          className="rounded-lg bg-white p-2 text-blue-700 shadow-sm"
                          title="Télécharger cette photo"
                          aria-label={`Télécharger la photo de ${student.nom}`}
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Studio photo */}
            {selected && (
              <section className="rounded-2xl bg-white p-4 shadow" data-testid="educmaster-studio">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">{selected.nom.toUpperCase()} {selected.prenoms}</h2>
                    <p className="text-sm text-gray-500">Photo d’identité 800 × 1000 px, format portrait 4×5.</p>
                  </div>
                  <button onClick={nextNeedingPhoto} className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                    Élève suivant à compléter →
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Matricule EducMaster *</span>
                    <input
                      data-testid="educmaster-matricule"
                      value={identity.matricule}
                      onChange={e => setIdentity({ ...identity, matricule: e.target.value })}
                      inputMode="numeric"
                      placeholder="Ex. 104120183578"
                      className={`${inputClass} mt-1 font-mono`}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nom</span>
                    <input value={identity.nom} onChange={e => setIdentity({ ...identity, nom: e.target.value })} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Prénoms</span>
                    <input value={identity.prenoms} onChange={e => setIdentity({ ...identity, prenoms: e.target.value })} className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-2">
                  <p className="min-w-0 text-sm"><span className="text-blue-700">Fichier EducMaster :</span> <code data-testid="educmaster-filename" className="break-all font-extrabold text-blue-950">{projectedFilename}</code></p>
                  <button onClick={saveIdentity} disabled={busy !== null} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-blue-800 shadow-sm disabled:opacity-50">
                    {busy === 'identity' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer l’identité
                  </button>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div>
                    <h3 className="font-bold text-gray-800">1. Prendre ou importer la photo</h3>

                    {cameraOn ? (
                      <div className="mt-3 overflow-hidden rounded-2xl bg-black shadow-inner">
                        <div className="relative mx-auto aspect-[4/5] max-h-[560px] w-full max-w-[430px] overflow-hidden bg-black">
                          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-[72%] w-[62%] rounded-[50%] border-4 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
                          </div>
                          <p className="absolute bottom-3 left-1/2 w-[92%] -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-center text-xs font-bold text-white">
                            Visage de face, regard vers l’objectif, tête et épaules dans l’ovale
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3">
                          <button onClick={stopCamera} className="rounded-xl bg-white/15 py-2.5 text-sm font-bold text-white"><X className="mr-1 inline h-4 w-4" /> Fermer</button>
                          <button data-testid="educmaster-camera-capture" onClick={capturePhoto} className="rounded-xl bg-white py-2.5 text-sm font-extrabold text-slate-950"><Camera className="mr-1 inline h-4 w-4" /> Capturer</button>
                          <button onClick={() => startCamera(facing === 'environment' ? 'user' : 'environment')} className="rounded-xl bg-white/15 py-2.5 text-sm font-bold text-white"><FlipHorizontal2 className="mr-1 inline h-4 w-4" /> Caméra</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        <button data-testid="educmaster-camera-start" onClick={() => startCamera()} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-extrabold text-white">
                          <Camera className="h-6 w-6" /> Prendre avec la caméra intégrée
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => nativeCameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-bold text-emerald-800">
                            <Camera className="h-4 w-4" /> Caméra du téléphone
                          </button>
                          <button onClick={() => singleFileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-3 text-sm font-bold text-blue-800">
                            <ImagePlus className="h-4 w-4" /> Importer une image
                          </button>
                        </div>
                        {selected.photoUrl && (
                          <button onClick={() => prepareSource(selected.photoUrl!, 'Photo déjà enregistrée')} className="rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700">
                            Retoucher la photo déjà enregistrée
                          </button>
                        )}
                        <input ref={singleFileRef} data-testid="photo-file-input" type="file" accept="image/*" className="hidden" onChange={onSingleFile} />
                        <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSingleFile} />
                      </div>
                    )}

                    {cameraError && (
                      <p className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <AlertTriangle className="h-5 w-5 shrink-0" /> {cameraError}
                      </p>
                    )}

                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-bold">Pour un beau fond blanc</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        <li>Placez l’enfant devant un mur ou un drap uni, bien éclairé.</li>
                        <li>Évitez les personnes/objets derrière lui et les ombres fortes.</li>
                        <li>Laissez un peu de fond visible autour de la tête et des épaules.</li>
                      </ul>
                    </div>

                    {selected.photoUrl && (
                      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                        <img src={selected.photoUrl} alt="Photo actuellement enregistrée" className="h-20 w-16 rounded-lg border bg-white object-cover" />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-bold text-gray-800">Photo actuellement enregistrée</p>
                          <p className="truncate font-mono text-xs text-gray-500">{readiness.get(selected.id)?.filename}</p>
                          {selected.educMasterPhotoPreparedAt && (
                            <p className="text-xs text-gray-400">Préparée le {new Date(selected.educMasterPhotoPreparedAt).toLocaleDateString('fr-FR')}{selected.educMasterPhotoWhiteBackground ? ' · fond blanc' : ''}</p>
                          )}
                        </div>
                        {readiness.get(selected.id)?.ready && (
                          <button onClick={() => downloadEducMasterPhoto(selected)} className="rounded-lg bg-white p-2 text-blue-700 shadow" title="Télécharger">
                            <Download className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800">2. Cadrer et mettre le fond en blanc</h3>
                    {sourceImage ? (
                      <>
                        <div className="relative mx-auto mt-3 aspect-[4/5] w-full max-w-[390px] overflow-hidden rounded-2xl border bg-white shadow">
                          {processed ? (
                            <img data-testid="identity-processed-preview" src={processed.dataUrl} alt="Aperçu de la photo d’identité" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400"><Loader2 className="h-8 w-8 animate-spin" /></div>
                          )}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-[72%] w-[62%] rounded-[50%] border-2 border-dashed border-emerald-500/80" />
                          </div>
                          {processing && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">Traitement…</span>}
                        </div>
                        <p className="mt-2 text-center text-xs text-gray-500">{sourceName}</p>

                        {processed && (
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-800">800 × 1000</strong>Format final</div>
                            <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-800">{processed.qualityLabel}</strong>Qualité source</div>
                            <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-800">{!whiteBackground ? '—' : processed.backgroundApplied ? `${Math.round(processed.backgroundCoverage * 100)} %` : 'Protégé'}</strong>Fond blanc</div>
                          </div>
                        )}
                        {processError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{processError}</p>}
                        {processed && whiteBackground && processed.backgroundWarning && (
                          <p data-testid="identity-background-warning" role="status" className="mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                            <AlertTriangle className="h-5 w-5 shrink-0" /> {processed.backgroundWarning}
                          </p>
                        )}

                        <div className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4">
                          <label className="flex cursor-pointer items-center justify-between gap-3 font-bold text-gray-800">
                            <span><Sparkles className="mr-2 inline h-5 w-5 text-amber-500" /> Fond blanc automatique</span>
                            <input
                              data-testid="identity-white-background"
                              type="checkbox"
                              checked={whiteBackground}
                              onChange={e => setWhiteBackground(e.target.checked)}
                              className="h-6 w-6 accent-emerald-600"
                            />
                          </label>
                          <Range label="Tolérance du fond" value={tolerance} min={10} max={100} step={1} display={`${tolerance}`} onChange={setTolerance} testId="identity-tolerance" disabled={!whiteBackground} />
                          <Range label="Zoom" value={zoom} min={1} max={2.5} step={0.05} display={`${zoom.toFixed(2)}×`} onChange={setZoom} />
                          <Range label="Cadrage horizontal" value={centerX} min={0} max={1} step={0.01} display={`${Math.round(centerX * 100)} %`} onChange={setCenterX} />
                          <Range label="Cadrage vertical" value={centerY} min={0} max={1} step={0.01} display={`${Math.round(centerY * 100)} %`} onChange={setCenterY} />
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setRotation(r => (r + 270) % 360)} className="rounded-lg bg-white py-2 text-sm font-bold text-gray-700 shadow-sm"><RotateCcw className="mr-1 inline h-4 w-4" /> Gauche</button>
                            <button onClick={() => { setCenterX(0.5); setCenterY(0.40); setZoom(1); setRotation(0); }} className="rounded-lg bg-white py-2 text-sm font-bold text-gray-700 shadow-sm">Recentrer</button>
                            <button onClick={() => setRotation(r => (r + 90) % 360)} className="rounded-lg bg-white py-2 text-sm font-bold text-gray-700 shadow-sm"><RotateCw className="mr-1 inline h-4 w-4" /> Droite</button>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-500">
                            Le détourage part des bords. Si le masque touche la zone du visage ou du torse, le remplacement est annulé automatiquement : la photo originale reste intacte. Vérifiez toujours l’aperçu avant d’enregistrer.
                          </p>
                        </div>

                        <button
                          data-testid="identity-save-photo"
                          onClick={saveProcessedPhoto}
                          disabled={!processed || processing || busy !== null}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#123f6e] py-4 font-extrabold text-white disabled:opacity-50"
                        >
                          {busy === 'photo' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                          Enregistrer cette photo pour EducMaster
                        </button>
                        <button onClick={() => { setSourceImage(''); setProcessed(null); }} className="mt-2 w-full rounded-xl py-2 text-sm font-bold text-gray-500">
                          Annuler cette retouche
                        </button>
                      </>
                    ) : (
                      <div className="mt-3 flex aspect-[4/5] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-400">
                        <FileImage className="h-16 w-16" />
                        <p className="mt-3 font-bold text-gray-600">Aucune nouvelle photo</p>
                        <p className="text-sm">Prenez ou importez une image : le cadrage 4:5 et le fond blanc apparaîtront ici.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Range({ label, value, min, max, step, display, onChange, testId, disabled }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <span className="flex items-center justify-between text-sm font-bold text-gray-700">
        <span>{label}</span><span className="rounded bg-white px-2 py-0.5 text-xs shadow-sm">{display}</span>
      </span>
      <input
        data-testid={testId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-emerald-600"
      />
    </label>
  );
}
