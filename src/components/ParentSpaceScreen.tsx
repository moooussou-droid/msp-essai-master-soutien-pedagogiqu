/**
 * ESPACE PARENTS — « SUIVI DE VOTRE ENFANT » (v48, étape ①).
 *
 * Écran destiné aux PARENTS, pensé pour des personnes qui n'ont pas
 * forcément été scolarisées longtemps :
 *  - vocabulaire du quotidien, pas de jargon pédagogique ;
 *  - chaque note accompagnée d'une phrase en clair ;
 *  - gros boutons, une action principale par écran.
 *
 * Confidentialité : le parent ne voit QUE son enfant. Le dossier lui
 * parvient chiffré et se déchiffre sur son téléphone ; aucune donnée
 * n'est envoyée nulle part.
 *
 * Le consentement est demandé AVANT toute conservation de données, comme
 * l'exige le Code du numérique béninois (loi n° 2017-20).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, FolderOpen, ShieldCheck, Trash2, CalendarX2, BookOpen,
  MessageSquare, ChevronRight, Download, Printer, Award, GraduationCap,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  openDossier, saveDossier, loadDossiers, deleteDossier, markCodeUsed,
  hasValidConsent, giveConsent, withdrawConsent, readAverage, readProgress,
  StoredDossier, ChildDossier,
} from '../utils/parentLink';
import { makePdf } from '../utils/pdfMaker';
import { getProfile } from '../utils/userProfile';
import { loadCourses, getProgress } from '../utils/mooc';

/**
 * Formation continue de l'enseignant(e) — visible par les parents pour
 * renforcer la confiance : quels MOOC l'enseignant a suivis/certifiés.
 */
function TeacherTrainingCard() {
  const profile = getProfile();
  const completed = loadCourses()
    .map((c) => ({ c, p: getProgress(c.id) }))
    .filter(({ p }) => p && p.completedAt)
    .sort((a, b) => (b.p!.completedAt || 0) - (a.p!.completedAt || 0));
  if (completed.length === 0) return null;
  return (
    <div className="msp-card p-4">
      <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-[#046a38]" /> Formation continue de l'enseignant(e)
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        {profile.teacherName ? `${profile.teacherName} se forme continuellement.` : "L'enseignant(e) se forme continuellement."}
        {' '}Formations certifiées sur la plateforme MOOC :
      </p>
      <ul className="space-y-2">
        {completed.map(({ c, p }) => (
          <li key={c.id} className="flex items-start gap-2 bg-emerald-50/60 rounded-lg p-2.5">
            <Award className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">{c.title}</p>
              <p className="text-[11px] text-gray-500">
                Certifié le {new Date(p!.completedAt!).toLocaleDateString('fr-FR')}
                {p!.certificateCode ? ` · ${p!.certificateCode}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function frDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ParentSpaceScreen() {
  const goBack = useSmartBack();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [consent, setConsent] = useState(hasValidConsent());
  const [dossiers, setDossiers] = useState<StoredDossier[]>([]);
  const [activeId, setActiveId] = useState('');
  const [pendingFile, setPendingFile] = useState<unknown>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!consent) return;
    const all = loadDossiers();
    setDossiers(all);
    if (all.length > 0 && !activeId) setActiveId(all[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent]);

  const active: ChildDossier | null = useMemo(
    () => dossiers.find((d) => d.id === activeId)?.dossier || null,
    [dossiers, activeId],
  );

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    try {
      setPendingFile(JSON.parse(await f.text()));
      setStatus('Fichier reconnu. Saisissez le code remis par l’école.');
    } catch {
      setError('Ce fichier n’est pas lisible.');
    }
  }

  async function onOpen() {
    if (!pendingFile) { setError('Choisissez d’abord le fichier reçu de l’école.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await openDossier(pendingFile as never, code);
      if (!res.ok) { setError(res.error); return; }
      saveDossier(res.dossier);
      markCodeUsed(code);
      const all = loadDossiers();
      setDossiers(all);
      setActiveId(all.find((d) => d.dossier.child.matricule === res.dossier.child.matricule)?.id || all[0].id);
      setPendingFile(null);
      setCode('');
      setStatus(`Dossier de ${res.dossier.child.prenoms} ouvert.`);
    } finally {
      setBusy(false);
    }
  }

  function exportPdf() {
    if (!active) return;
    const pdf = makePdf({
      title: 'Suivi de votre enfant',
      subtitle: `${active.child.nom} ${active.child.prenoms} — ${active.className}`,
      establishment: active.schoolName,
    });
    for (const ev of active.evaluations) {
      pdf.sectionTitle(ev.label);
      pdf.table(
        [
          { header: 'Matière', width: 3 },
          { header: 'Note', width: 1.2, align: 'right' },
        ],
        ev.subjects.map((s) => [
          s.subject,
          s.note === null ? '—' : `${s.note.toFixed(2).replace('.', ',')}/20`,
        ]),
      );
      pdf.paragraph(readAverage(ev.average, ev.classAverage));
    }
    pdf.sectionTitle('Absences');
    pdf.paragraph(
      active.absences.length === 0
        ? 'Aucune absence enregistrée.'
        : `${active.missedHalfDays} demi-journée(s) manquée(s).`,
    );
    if (active.message) {
      pdf.sectionTitle('Mot de l’enseignant');
      pdf.paragraph(active.message);
    }
    pdf.save(`suivi-${active.child.nom.toLowerCase()}.pdf`);
  }

  /* ---------------- Consentement ---------------- */
  if (!consent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="msp-module-header msp-kente p-4 shadow">
          <div className="flex items-center gap-3">
            <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg">Suivi de votre enfant</h1>
          </div>
        </header>
        <main className="p-4 space-y-4">
          <div className="msp-card p-4 space-y-3" data-testid="ecran-consentement">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#046a38]" /> Avant de commencer
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Cet espace vous permet de suivre la scolarité de votre enfant.
              Voici ce que vous devez savoir :
            </p>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>Les informations restent <strong>dans votre téléphone</strong>. Elles ne sont envoyées sur aucun serveur.</li>
              <li>Vous ne voyez <strong>que votre enfant</strong> : jamais les notes ni les noms des autres élèves.</li>
              <li>Le dossier vous est remis <strong>chiffré</strong> : sans le code de l’école, personne ne peut le lire.</li>
              <li>Vous pouvez <strong>tout supprimer à tout moment</strong>, gratuitement et sans justification.</li>
              <li>Aucune publicité, aucun partage avec des tiers.</li>
            </ul>
            <p className="text-xs text-gray-500">
              Traitement soumis à la loi n° 2017-20 portant Code du numérique
              en République du Bénin. Responsable : la direction de l’école.
            </p>
            <button
              data-testid="btn-donner-consentement"
              onClick={() => { giveConsent(); setConsent(true); }}
              className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold"
            >
              J’ai compris et j’accepte
            </button>
            <p className="text-xs text-gray-500 text-center">
              Sans cet accord, aucune donnée ne sera enregistrée.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------- Espace parent ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Suivi de votre enfant</h1>
            <p className="text-white/80 text-sm truncate">
              {active ? `${active.child.prenoms} — ${active.className}` : 'Aucun dossier'}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10">
        {status && (
          <p data-testid="statut-parent" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}
        {error && (
          <p data-testid="erreur-parent" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Sélecteur d'enfant : permanent dès qu'il y a plusieurs dossiers */}
        {dossiers.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="selecteur-enfant">
            {dossiers.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveId(d.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                  d.id === activeId ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              >
                {d.dossier.child.prenoms}
              </button>
            ))}
          </div>
        )}

        {/* Ouvrir un dossier */}
        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule" />
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#046a38]" /> Ouvrir un dossier reçu
          </h2>
          <button
            data-testid="btn-choisir-fichier"
            onClick={() => fileRef.current?.click()}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
          >
            {pendingFile ? '✓ Fichier choisi' : 'Choisir le fichier de l’école'}
          </button>
          <input
            ref={fileRef} type="file" accept=".msp,application/json,.json"
            onChange={onPickFile} className="hidden" data-testid="input-dossier"
          />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Code remis par l’école</span>
            <input
              type="text"
              data-testid="champ-code-parent"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base font-mono tracking-widest text-center"
            />
          </label>
          <button
            data-testid="btn-ouvrir-dossier"
            onClick={onOpen}
            disabled={busy}
            className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold disabled:opacity-50"
          >
            Ouvrir le dossier
          </button>
        </div>

        {active && (
          <>
            {/* Notes */}
            <div className="msp-card p-4 space-y-3" data-testid="bloc-notes">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#046a38]" /> Résultats
              </h2>
              {active.evaluations.map((ev, i) => (
                <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="font-semibold text-sm text-gray-800 mb-1">{ev.label}</p>
                  {ev.subjects.map((s, j) => (
                    <div key={j} className="flex justify-between text-sm py-1">
                      <span className="text-gray-700">{s.subject}</span>
                      <span className={`font-bold ${
                        s.note === null ? 'text-gray-400'
                        : s.note < 10 ? 'text-red-600' : 'text-emerald-700'}`}
                      >
                        {s.note === null ? '—' : `${s.note.toFixed(2).replace('.', ',')}/20`}
                      </span>
                    </div>
                  ))}
                  <p
                    data-testid={`lecture-claire-${i}`}
                    className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2"
                  >
                    {readAverage(ev.average, ev.classAverage)}
                  </p>
                </div>
              ))}
              {readProgress(active.evaluations) && (
                <p data-testid="progression" className="text-sm font-semibold text-[#046a38]">
                  {readProgress(active.evaluations)}
                </p>
              )}
            </div>

            {/* Absences */}
            <div className="msp-card p-4" data-testid="bloc-absences">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                <CalendarX2 className="w-5 h-5 text-[#b34700]" /> Absences
              </h2>
              <p className="text-sm text-gray-700 mb-2">
                <strong data-testid="total-absences">{active.missedHalfDays}</strong> demi-journée(s) manquée(s).
              </p>
              {active.absences.length === 0 && (
                <p className="text-sm text-emerald-700">Aucune absence. Félicitations !</p>
              )}
              {active.absences.slice(0, 10).map((a, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">
                    {frDate(a.date)} · {a.half === 'matin' ? 'matin' : 'après-midi'}
                  </span>
                  <span className={a.justified ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {a.justified ? 'Justifiée' : 'Non justifiée'}
                  </span>
                </div>
              ))}
            </div>

            {/* Mot de l'enseignant */}
            {active.message && (
              <div className="msp-card p-4" data-testid="bloc-message">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-[#046a38]" /> Mot de l’enseignant
                </h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{active.message}</p>
                <p className="text-xs text-gray-500 mt-2">— {active.teacherName || 'L’enseignant(e)'}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center" data-testid="date-dossier">
              Dossier établi le {new Date(active.generatedAt).toLocaleDateString('fr-FR')} à{' '}
              {new Date(active.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.
              Demandez un nouveau dossier à l’école pour l’actualiser.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-pdf-parent"
                onClick={exportPdf}
                className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> PDF
              </button>
              {/* v53 : les parents doivent pouvoir imprimer le dossier. */}
              <button
                data-testid="btn-imprimer-parent"
                onClick={() => window.print()}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Imprimer
              </button>
            </div>

            <button
              data-testid="btn-supprimer-dossier"
              onClick={() => {
                if (!window.confirm('Supprimer le dossier de cet enfant de votre téléphone ?')) return;
                deleteDossier(activeId);
                const all = loadDossiers();
                setDossiers(all);
                setActiveId(all[0]?.id || '');
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> Supprimer ce dossier
            </button>
          </>
        )}

        {/* Formation continue de l'enseignant(e) — passerelle MOOC → parents */}
        <TeacherTrainingCard />

        {/* Confidentialité */}
        <div className="msp-card p-4">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#046a38]" /> Confidentialité
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Vos données restent sur ce téléphone. Vous pouvez retirer votre accord
            à tout moment : tous les dossiers seront alors effacés.
          </p>
          <button
            data-testid="btn-retirer-consentement"
            onClick={() => {
              if (!window.confirm('Retirer votre accord et effacer tous les dossiers de ce téléphone ?')) return;
              withdrawConsent();
              setDossiers([]);
              setActiveId('');
              setConsent(false);
            }}
            className="w-full bg-red-50 text-red-700 border border-red-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            Retirer mon accord et tout effacer <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
