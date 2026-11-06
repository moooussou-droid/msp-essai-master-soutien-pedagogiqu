import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, Search, Share2, Award, TrendingUp, Users, Printer, MessageCircle,
  FileSpreadsheet, FileText, Loader2, FileDown,
} from 'lucide-react';
import { ClassData, getClass, isSecondaire, evaluationsForClass, EvaluationId, evaluationLabel, classSequence } from '../utils/database';
import { computeBulletins, computeClassStats, computeGroupBilans, getMentionConseil, StudentBulletin } from '../utils/bulletin';
import { exportBulletinsExcel, exportBulletinsDocx } from '../utils/bulletinExport';
import { exportBulletinPdf, exportClassBulletinsPdf, exportClassSummaryPdf } from '../utils/bulletinPdf';
import { openWhatsApp } from '../utils/contact';
import { getProfile, getSchoolLogo } from '../utils/userProfile';
import { getSignatureImage, getStampImage } from '../utils/scanner';
import { isUnlocked } from '../utils/coursePayment';
import PaywallPanel from './PaywallPanel';
import PreschoolBulletinsScreen from './PreschoolBulletinsScreen';
import { isPrescolaireClass } from '../utils/prescolaireBulletin';

/** v61 — le téléchargement PDF d'un bulletin coûte 15 F. */
export const BULLETIN_PDF_PRICE = 15;
function bulletinContentId(classId: string, studentId: string, evaluation?: string): string {
  return `bulletin:${classId}:${studentId}:${evaluation || 'all'}`;
}
function classBulletinsContentId(classId: string, evaluation?: string): string {
  return `bulletins:${classId}:${evaluation || 'all'}`;
}

/** Modale de paiement réutilisable pour le téléchargement d'un (ou des) bulletin(s). */
function BulletinPaywallModal({ contentId, title, price, onClose, onUnlocked }: {
  contentId: string; title: string; price: number; onClose: () => void; onUnlocked: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden" onClick={onClose}>
      <div className="bg-transparent w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <PaywallPanel
          contentId={contentId}
          kind="bulletin"
          title={title}
          price={String(price)}
          onUnlocked={onUnlocked}
        />
      </div>
    </div>
  );
}
import { buildVerifiedPayload } from '../utils/bulletinVerify';

function avatarColor(name: string): string {
  const palette = [
    'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500',
    'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function initials(nom: string, prenoms: string): string {
  return ((nom?.[0] ?? '') + (prenoms?.[0] ?? '')).toUpperCase() || '?';
}
/** Formate une date AAAA-MM-JJ en JJ/MM/AAAA (affichage français). */
function formatDateFr(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmt(n: number | null): string {
  return n === null ? '—' : n.toFixed(2);
}

export default function BulletinsScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // v36 — Maternelle & Primaire : CHAQUE ÉVALUATION A SON BULLETIN.
  // Le mode « synthèse » a été retiré d'ici : la synthèse des évaluations
  // (moyennes et présences) est désormais le module BILAN ANNUEL.
  const [evaluation, setEvaluation] = useState<EvaluationId | 'all'>('all');

  // Au primaire/maternelle, on sélectionne d'office la 1re évaluation.
  useEffect(() => {
    if (!classData || isSecondaire(classData)) return;
    if (evaluation !== 'all') return;
    const list = evaluationsForClass(classData);
    if (list.length > 0) setEvaluation(list[0].id);
  }, [classData, evaluation]);
  const [exporting, setExporting] = useState<'excel' | 'word' | 'pdf' | 'recap' | null>(null);
  const [showClassPay, setShowClassPay] = useState(false);

  useEffect(() => {
    if (id) getClass(id).then((d) => setClassData(d || null));
  }, [id]);

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  // v67 — la maternelle n’a PAS de bulletin de notes : elle bascule vers la
  // grille officielle d’observation TS/S/PS (deux pages, sans classement).
  if (isPrescolaireClass(classData)) {
    return <PreschoolBulletinsScreen classData={classData} onBack={() => goBack()} />;
  }

  const secondaire = isSecondaire(classData);
  const bulletins = computeBulletins(classData, evaluation === 'all' ? undefined : { evaluation });
  const stats = computeClassStats(bulletins);

  async function handleExportExcel() {
    if (!classData) return;
    setExporting('excel');
    try {
      await exportBulletinsExcel(classData, bulletins, evaluation === 'all' ? undefined : { evaluation });
    } catch (e: any) {
      alert('Erreur lors de l\'export Excel : ' + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  async function handleExportDocx() {
    if (!classData) return;
    setExporting('word');
    try {
      await exportBulletinsDocx(classData, bulletins, evaluation === 'all' ? undefined : { evaluation });
    } catch (e: any) {
      alert('Erreur lors de l\'export Word : ' + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  /*
   * v44 — vrais fichiers PDF fabriques par l'application.
   * L'impression reste disponible partout (regle v41).
   */
  function doExportClassPdf() {
    if (!classData) return;
    setExporting('pdf');
    try {
      exportClassBulletinsPdf(classData, bulletins, evaluation === 'all' ? undefined : evaluation);
    } catch (e: any) {
      alert('Erreur lors de la creation du PDF : ' + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  function handleExportPdf() {
    if (!classData) return;
    // v61 — 15 F par bulletin : le lot de la classe coûte 15 F × effectif.
    const cid = classBulletinsContentId(classData.id, evaluation);
    if (isUnlocked(cid)) {
      doExportClassPdf();
    } else {
      setShowClassPay(true);
    }
  }

  function handleExportRecapPdf() {
    if (!classData) return;
    setExporting('recap');
    try {
      exportClassSummaryPdf(classData, bulletins, evaluation === 'all' ? undefined : evaluation);
    } catch (e: any) {
      alert('Erreur lors de la creation du PDF : ' + (e?.message || e));
    } finally {
      setExporting(null);
    }
  }

  if (selectedId) {
    const bulletin = bulletins.find((b) => b.student.id === selectedId);
    if (bulletin) {
      return (
        <BulletinDetail
          classData={classData}
          bulletin={bulletin}
          evaluation={evaluation === 'all' ? undefined : evaluation}
          onBack={() => setSelectedId(null)}
        />
      );
    }
  }

  const filtered = bulletins.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.student.nom.toLowerCase().includes(q) ||
      b.student.prenoms.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Bulletins scolaires</h1>
            <p className="text-emerald-100 text-sm">
              {classData.name} • {classData.sequence}
              {classData.evaluationType ? ` • Type : ${classData.evaluationType}` : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {secondaire ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-800">
            🎓 Bulletin officiel du secondaire : MEPE (interrogations écrites) + NPS1 &amp; NPS2 (devoirs surveillés) → MS (moyenne semestrielle).
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-3 mb-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Bulletin de l'évaluation</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {evaluationsForClass(classData).map((ev) => {
                const count = classData.notes.filter(n => n.evaluation === ev.id).length;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setEvaluation(ev.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold border ${
                      evaluation === ev.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {ev.label}{count > 0 ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              💡 Maternelle &amp; primaire : <strong>chaque évaluation a son propre bulletin</strong>.
              Choisissez l'évaluation ci-dessus ; l'export Word/Excel reprend exactement ce bulletin.
            </p>
            <Link
              to={`/class/${classData.id}/bilan-annuel`}
              className="mt-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
            >
              📊 Synthèse de toutes les évaluations → Bilan annuel (moyennes et présences)
              <span>›</span>
            </Link>
          </div>
        )}
        {/* Statistiques classe */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl shadow p-3 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{fmt(stats.moyenneClasse)}</p>
            <p className="text-gray-500 text-xs">Moy. classe</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 text-center">
            <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{Math.round(stats.tauxReussite)}%</p>
            <p className="text-gray-500 text-xs">Réussite</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 text-center">
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{stats.admis}/{stats.count}</p>
            <p className="text-gray-500 text-xs">Admis</p>
          </div>
        </div>

        {/* Export de la classe entière */}
        {classData.students.length > 0 && (
          <div className="bg-white rounded-xl shadow p-3 mb-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Exporter toute la classe</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Excel récapitulatif
              </button>
              <button
                onClick={handleExportDocx}
                disabled={exporting !== null}
                className="bg-[#006b4f] text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Tous les bulletins
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                data-testid="btn-pdf-bulletins"
                onClick={handleExportPdf}
                disabled={exporting !== null}
                className="bg-red-700 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                PDF des bulletins
              </button>
              <button
                data-testid="btn-pdf-recap"
                onClick={handleExportRecapPdf}
                disabled={exporting !== null}
                className="bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {exporting === 'recap' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                PDF récapitulatif
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">💡 Excel = tableau récapitulatif • Word = un bulletin par élève • PDF = fichier prêt à envoyer, fabriqué par l’application.</p>
          </div>
        )}

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {classData.students.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun élève</p>
            <p className="text-gray-500 text-sm">Ajoutez des élèves et saisissez leurs notes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <button
                key={b.student.id}
                onClick={() => setSelectedId(b.student.id)}
                className="w-full bg-white rounded-xl shadow p-3 flex items-center gap-3 text-left"
              >
                <div className={`${avatarColor(b.student.nom)} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
                  {initials(b.student.nom, b.student.prenoms)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">
                    {b.student.nom.toUpperCase()} {b.student.prenoms}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {b.moyenne !== null ? `Rang ${b.rang}/${b.effectif} • ${b.mention}` : 'Pas encore noté'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${
                    b.moyenne === null ? 'text-gray-400'
                      : b.moyenne >= 10 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {fmt(b.moyenne)}
                  </p>
                  <p className="text-gray-400 text-xs">/20</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showClassPay && classData && (
        <BulletinPaywallModal
          contentId={classBulletinsContentId(classData.id, evaluation)}
          title={`Bulletins de ${classData.name} (${bulletins.length} élève(s))`}
          price={BULLETIN_PDF_PRICE * Math.max(1, bulletins.length)}
          onClose={() => setShowClassPay(false)}
          onUnlocked={() => { setShowClassPay(false); doExportClassPdf(); }}
        />
      )}
    </div>
  );
}

/* ===== Détail d'un bulletin ===== */
function BulletinDetail({
  classData,
  bulletin,
  evaluation,
  onBack,
}: {
  classData: ClassData;
  bulletin: StudentBulletin;
  evaluation?: EvaluationId;
  onBack: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const pdfContentId = bulletinContentId(classData.id, bulletin.student.id, evaluation);
  function handleDownloadPdf() {
    if (isUnlocked(pdfContentId)) {
      exportBulletinPdf(classData, bulletin, evaluation);
    } else {
      setShowPay(true);
    }
  }
  const b = bulletin;
  const secondaire = classData.educationType === 'secondaire';
  const schoolLogo = getSchoolLogo();
  const profile = getProfile();
  const schoolName = classData.school || profile.schoolName || 'École';
  const circonscription = classData.circonscription || profile.circonscription || 'Circonscription pédagogique';
  const ministry = classData.educationType === 'secondaire'
    ? 'Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle'
    : 'Ministère des Enseignements Maternel et Primaire';
  const teacherName = profile.teacherName || '________________';
  const signatureImg = getSignatureImage();
  const stampImg = getStampImage();
  const levelText = classData.serie ? `${classData.level} ${classData.serie}` : classData.level;
  const verificationCode = `EM-${new Date().getFullYear()}-${classSequence(classData).replace(/\s+/g, '').toUpperCase()}-${b.student.id.slice(-6).toUpperCase()}`;
  const validated = b.results.filter(r => (r.total ?? 0) >= 10).length;
  const strongest = b.results.length ? Math.max(...b.results.map(r => r.total ?? 0)) : 0;
  const weakest = b.results.length ? Math.min(...b.results.map(r => r.total ?? 0)) : 0;
  const disciplineAppreciation = (score: number | null) => {
    if (score === null) return 'Non évalué';
    if (!secondaire) {
      if (score <= 7) return 'Très insuffisant';
      if (score <= 9) return 'Insuffisant';
      if (score <= 15) return 'Satisfaisant';
      return 'Très satisfaisant';
    }
    if (score >= 16) return 'Très Bien';
    if (score >= 14) return 'Bien';
    if (score >= 12) return 'Assez Bien';
    if (score >= 10) return 'Passable';
    if (score >= 8) return 'Insuffisant';
    return 'Très Insuffisant';
  };
  const decision = secondaire
    ? ((b.moyenne ?? 0) >= 10 ? 'Admis / Résultat satisfaisant' : 'À accompagner')
    : (validated >= 6 ? 'Réussite : seuil de 6 matières validées atteint' : 'À accompagner : seuil non atteint');
  const verifyPayload = buildVerifiedPayload({
    code: verificationCode,
    matricule: b.student.matricule,
    nom: `${b.student.nom.toUpperCase()} ${b.student.prenoms}`,
    classe: classData.name,
    moyenne: fmt(b.moyenne),
    rang: `${b.rang}/${b.effectif}`,
    validated: `${validated}/${b.results.length}`,
    decision,
  });
  const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify?data=${verifyPayload}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;

  function buildTextBulletin(): string {
    let msg = `*BULLETIN SCOLAIRE*\n`;
    msg += `${classData.school}\n`;
    msg += `Classe: ${classData.name} | ${classData.sequence} | ${classData.schoolYear}\n`;
    msg += `\n*Élève:* ${b.student.nom.toUpperCase()} ${b.student.prenoms}\n`;
    msg += `*Matricule:* ${b.student.matricule}\n`;
    if (secondaire) {
      msg += `\n--- NOTES /20 ---\n`;
      b.results.forEach((r) => {
        if (r.msAbsent) {
          msg += `${r.subject.name}: ABS (coef ${r.coefficient})\n`;
        } else {
          msg += `${r.subject.name} (coef ${r.coefficient}): MEPE ${fmt(r.mepe)} | NPS1 ${fmt(r.nps1)} | NPS2 ${fmt(r.nps2)} | MS ${fmt(r.ms)}\n`;
        }
      });
      msg += `\n*Moyenne semestrielle:* ${fmt(b.moyenne)}/20\n`;
    } else {
      msg += `\n--- NOTES (sur 20) ---\n`;
      b.results.forEach((r) => {
        const val = r.absent ? 'ABS' : r.total !== null ? r.total.toFixed(2) : '—';
        msg += `${r.subject.name}: ${val}\n`;
      });
      msg += `\n*Moyenne:* ${fmt(b.moyenne)}/20\n`;
    }
    msg += `*Rang:* ${b.rang}/${b.effectif}\n`;
    msg += `*Mention:* ${b.mention}\n`;
    msg += `*Appréciation:* ${b.appreciation}\n`;
    msg += `\n_Master Soutien Pédagogique_`;
    return msg;
  }

  function handleShareWhatsApp() {
    openWhatsApp(buildTextBulletin());
  }

  async function handleShareNative() {
    const text = buildTextBulletin();
    const nav = navigator as Navigator & { share?: (d: { text: string; title: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Bulletin scolaire', text });
      } catch { /* annulé */ }
    } else {
      handleShareWhatsApp();
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Bulletin de l'élève</h1>
        </div>
      </header>

      <main className="p-4 pb-64">
        {/* Bulletin imprimable */}
        <div ref={printRef} className={`msp-bulletin ${secondaire ? '' : 'msp-bulletin-compact'} relative mx-auto max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none`}>
          <img
            src="./benin-flag.svg"
            alt="Filigrane drapeau du Bénin"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-72 -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
          />
          {/* En-tête officiel */}
          <div className="relative z-30 p-6 border-b-4 border-emerald-700 bg-white">
            <div className="grid grid-cols-3 gap-4 items-start">
              <div>
                {schoolLogo && (
                  <img
                    src={schoolLogo}
                    alt="Logo école"
                    className="w-16 h-16 object-contain rounded-lg border bg-white p-1 mb-2"
                  />
                )}
                <p className="text-sm font-extrabold uppercase text-gray-900">République du Bénin</p>
                <p className="text-xs text-gray-500">{ministry}</p>
                <p className="text-sm font-bold text-emerald-700 mt-1">{circonscription}</p>
                <p className="text-lg font-extrabold text-gray-900 mt-1">{schoolName}</p>
              </div>
              <div className="text-center">
                <div className="inline-block rounded-lg border-2 border-emerald-700 px-6 py-3">
                  <p className="text-xl font-extrabold tracking-wide text-emerald-800">BULLETIN DE NOTES</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {secondaire
                      ? `DU ${classSequence(classData).toUpperCase()}`
                      : evaluation
                        ? `${evaluationLabel(evaluation, classData.customEvaluations).toUpperCase()}`
                        : classSequence(classData).toUpperCase()}
                    {' • ANNÉE '}{classData.schoolYear}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p><span className="font-bold text-gray-800">Classe :</span> <span className="text-emerald-700 font-extrabold">{classData.name}</span></p>
                <p className="text-gray-600">Niveau : {levelText}</p>
                <p className="text-gray-600">Effectif : {b.effectif} élèves</p>
              </div>
            </div>
          </div>

          {/* Infos élève */}
          <div className="relative z-30 p-6 border-b bg-white">
            <div className="rounded-xl border bg-gray-50 p-4 flex gap-4 items-center">
              {b.student.photoUrl ? (
                <img src={b.student.photoUrl} alt="Photo élève" className="w-24 h-24 rounded-lg object-cover border bg-white" />
              ) : (
                <div className="w-24 h-24 rounded-lg border bg-slate-200 text-slate-500 flex flex-col items-center justify-center text-xs font-bold">PHOTO</div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-sm flex-1">
                <div><p className="text-xs font-bold uppercase text-gray-500">Nom & Prénoms</p><p className="font-extrabold text-gray-900">{b.student.nom.toUpperCase()} {b.student.prenoms}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-500">Matricule EducMaster</p><p className="font-semibold text-gray-800">{b.student.matricule}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-500">Sexe</p><p className="font-semibold text-gray-800">{b.student.sexe === 'M' ? 'Masculin (M)' : b.student.sexe === 'F' ? 'Féminin (F)' : '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-500">Naissance</p><p className="font-semibold text-gray-800">{b.student.dateNaissance ? formatDateFr(b.student.dateNaissance) : '—'}</p></div>
              </div>
            </div>
          </div>

          {/* Tableau des notes */}
          <div className="relative z-30 p-6 overflow-x-auto bg-white">
            {secondaire ? (
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="text-left p-2.5">Matière / Discipline</th>
                    <th className="text-center p-2.5">Coef.</th>
                    <th className="text-center p-2.5">MEPE</th>
                    <th className="text-center p-2.5">NPS1</th>
                    <th className="text-center p-2.5">NPS2</th>
                    <th className="text-center p-2.5">MS</th>
                    <th className="text-center p-2.5">MSC</th>
                    <th className="text-center p-2.5">Rang</th>
                    <th className="text-center p-2.5">Plus faible</th>
                    <th className="text-center p-2.5">Plus forte</th>
                    <th className="text-left p-2.5">Appréciation et Signature du Professeur</th>
                  </tr>
                </thead>
                <tbody>
                  {b.results.map((r) => (
                    <tr key={r.subject.id} className="border-b border-gray-100">
                      <td className="p-2.5 text-gray-800 font-semibold">{r.subject.name}</td>
                      <td className="text-center text-gray-500">{r.coefficient}</td>
                      <td className={`text-center ${r.msAbsent ? 'text-gray-400' : r.mepe === null ? 'text-gray-300' : 'font-medium text-gray-700'}`}>
                        {r.msAbsent ? 'ABS' : r.mepe !== null ? r.mepe.toFixed(2) : '—'}
                      </td>
                      <td className={`text-center ${r.msAbsent ? 'text-gray-400' : r.nps1 === null ? 'text-gray-300' : 'font-medium text-gray-700'}`}>
                        {r.msAbsent ? 'ABS' : r.nps1 !== null ? r.nps1.toFixed(2) : '—'}
                      </td>
                      <td className={`text-center ${r.msAbsent ? 'text-gray-400' : r.nps2 === null ? 'text-gray-300' : 'font-medium text-gray-700'}`}>
                        {r.msAbsent ? 'ABS' : r.nps2 !== null ? r.nps2.toFixed(2) : '—'}
                      </td>
                      <td className={`text-center font-bold ${r.ms === null ? 'text-gray-300' : r.ms >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.ms !== null ? r.ms.toFixed(2) : '—'}
                      </td>
                      <td className="text-center text-gray-500">{r.msc !== null ? r.msc.toFixed(2) : '—'}</td>
                      <td className="text-center text-gray-600">{r.ms !== null && r.subjectRang > 0 ? `${r.subjectRang}ᵉ` : '—'}</td>
                      <td className="text-center text-gray-400">{r.minClasse !== null ? r.minClasse.toFixed(2) : '—'}</td>
                      <td className="text-center text-gray-400">{r.maxClasse !== null ? r.maxClasse.toFixed(2) : '—'}</td>
                      <td className="p-2.5 text-gray-600">{disciplineAppreciation(r.ms)}</td>
                    </tr>
                  ))}
                  {computeGroupBilans(b).map((g) => (
                    <tr key={g.groupe} className="border-b border-gray-100 bg-gray-50 font-bold">
                      <td className="p-2.5 text-emerald-800">{g.label}</td>
                      <td className="text-center text-gray-500">{g.count || ''}</td>
                      <td className="text-center text-gray-300">—</td>
                      <td className="text-center text-gray-300">—</td>
                      <td className="text-center text-gray-300">—</td>
                      <td className="text-center text-emerald-700">{g.moyenne !== null ? g.moyenne.toFixed(2) : '—'}</td>
                      <td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-extrabold bg-emerald-50">
                    <td className="py-2 text-emerald-800">TOTAL</td>
                    <td className="text-center text-gray-600">{b.totalCoef}</td>
                    <td></td><td></td><td></td>
                    <td className="text-center text-emerald-700">{b.moyenne !== null ? b.moyenne.toFixed(2) : '—'}</td>
                    <td></td>
                    <td className="text-center text-gray-600">{b.rang > 0 ? `${b.rang}ᵉ` : '—'}</td>
                    <td></td><td></td>
                    <td className="p-2.5 text-emerald-700">Moyenne semestrielle : {fmt(b.moyenne)} /20</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="text-left p-3">Matière / Discipline (APC)</th>
                    <th className="text-center p-3 w-16">CM</th>
                    <th className="text-center p-3 w-16">CP</th>
                    <th className="text-center p-3 w-20">Note /20</th>
                    <th className="text-left p-3">Appréciation par Discipline</th>
                  </tr>
                </thead>
                <tbody>
                  {b.results.map((r) => (
                    <tr key={r.subject.id} className="border-b border-gray-100">
                      <td className="p-3 text-gray-800 font-semibold">{r.subject.name}</td>
                      <td className="text-center text-gray-500">{r.absent ? 'ABS' : r.cm ?? '—'}</td>
                      <td className="text-center text-gray-500">{r.absent ? 'ABS' : r.cp ?? '—'}</td>
                      <td className={`text-center font-semibold ${
                        r.total === null ? 'text-gray-400' : r.total >= 10 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {r.absent ? 'ABS' : r.total !== null ? r.total.toFixed(2) : '—'}
                      </td>
                      <td className="p-3 text-gray-600">{disciplineAppreciation(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Synthèse et appréciation */}
          <div className="relative z-30 p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 border-t">
            <div className="rounded-xl border bg-gray-50 p-4">
              <h3 className="font-extrabold text-emerald-800 uppercase text-sm border-b border-emerald-700 pb-2 mb-3">Synthèse des résultats ({secondaire ? 'Secondaire' : 'Primaire APC'})</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Moyenne Générale :</p><p className="text-3xl font-extrabold text-emerald-700">{fmt(b.moyenne)} /20</p></div>
                <div><p className="text-gray-500">Rang de l'élève :</p><p className="text-3xl font-extrabold text-gray-900">{b.rang > 0 ? b.rang : '—'}<span className="text-lg text-gray-500"> / {b.effectif}</span></p></div>
                {secondaire ? (
                  <div><p className="text-gray-500">Mention du Conseil :</p><p className={`inline-block rounded px-2 py-1 text-sm font-bold ${(b.moyenne ?? 0) >= 14 ? 'bg-emerald-100 text-emerald-700' : (b.moyenne ?? 0) >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{getMentionConseil(b.moyenne)}</p></div>
                ) : (
                  <div><p className="text-gray-500">Matières Validées (≥10/20) :</p><p className="text-xl font-extrabold text-emerald-700">{validated} / {b.results.length} discipline(s)</p></div>
                )}
                {!secondaire && (
                <div><p className="text-gray-500">Seuil de Réussite (≥ 6 mat.) :</p><p className={`inline-block rounded px-2 py-1 text-sm font-bold ${validated >= 6 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{validated >= 6 ? 'Seuil Atteint' : 'Seuil Non Atteint'}</p></div>
                )}
                <div><p className="text-gray-500">Plus Forte Moyenne :</p><p className="font-bold text-gray-800">{strongest.toFixed(2)} /20</p></div>
                <div><p className="text-gray-500">Plus Faible Moyenne :</p><p className="font-bold text-gray-800">{weakest.toFixed(2)} /20</p></div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-extrabold text-emerald-800 uppercase text-sm border-b border-emerald-700 pb-2 mb-3">Appréciation globale de l'enseignant</h3>
              <p className="text-gray-700 text-sm italic min-h-20">« {b.appreciation} »</p>
              <div className="mt-6 border-t pt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-800">Décision du Conseil :</span>
                <span className={`rounded px-3 py-1 text-sm font-bold ${decision.includes('Réussite') || decision.includes('Admis') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{decision}</span>
              </div>
            </div>
          </div>

          {/* Signatures et sceau numérique.
              Ordre demandé : Enseignant(e) et Directeur d'abord, puis le Visa des
              Parents en dernier. Au secondaire, l'enseignant(e) ne co-signe pas :
              seul le Directeur signe. */}
          <div className="relative z-30 p-6 border-t bg-white">
            <div className={`grid grid-cols-1 gap-6 items-start text-center ${secondaire ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                {!qrFailed ? (
                  <img src={qrUrl} alt="QR authentification" className="w-24 h-24 bg-white border rounded mx-auto" onError={() => setQrFailed(true)} />
                ) : (
                  <div className="w-24 h-24 bg-white border rounded mx-auto flex items-center justify-center text-4xl">✅</div>
                )}
                <p className="font-mono text-emerald-700 font-bold text-xs mt-2">{verificationCode}</p>
                <p className="text-gray-500 text-[11px] mt-1">
                  {qrFailed ? 'QR indisponible hors connexion : utilisez le bouton de vérification ci-dessous.' : 'Scannez pour vérifier l’authenticité sur EducMaster MEMP Bénin'}
                </p>
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg print:hidden">
                  Vérifier Authenticité
                </a>
              </div>
              {!secondaire && (
                <div>
                  <p className="font-extrabold text-gray-800 text-sm uppercase">L'Enseignant(e)</p>
                  {signatureImg ? (
                    <img src={signatureImg} alt="Signature" className="h-14 mx-auto object-contain mt-1" />
                  ) : (
                    <div className="h-14" />
                  )}
                  <p className="text-gray-500 text-xs mt-1">{teacherName}</p>
                </div>
              )}
              <div>
                <p className="font-extrabold text-gray-800 text-sm uppercase">Le Directeur d'École</p>
                {stampImg ? (
                  <img src={stampImg} alt="Cachet et signature" className="h-16 mx-auto object-contain mt-1" />
                ) : (
                  <div className="h-16" />
                )}
                <p className="text-gray-500 text-xs mt-1">Cachet &amp; Signature</p>
              </div>
              <div>
                <p className="font-extrabold text-gray-800 text-sm uppercase mb-3">Visa des Parents</p>
                <div className="h-20 rounded-lg border border-dashed bg-white" />
              </div>
            </div>
          </div>

          <div className="p-3 text-center text-xs text-emerald-700 border-t bg-emerald-950/5">
            {!secondaire && classData.evaluationType && (
              <p className="font-bold mb-1 text-sm">Type d'évaluation : {classData.evaluationType} — {classData.sequence}</p>
            )}
            © {classData.schoolYear} Master Soutien Pédagogique — République du Bénin (MEMP) • Conforme à l'Approche Par Compétences (APC) & EducMaster
          </div>
        </div>
      </main>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t p-3 space-y-2 print:hidden">
        <button
          onClick={handleShareWhatsApp}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Partager sur WhatsApp
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShareNative}
            className="bg-blue-50 text-blue-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
          <button
            data-testid="btn-imprimer-bulletin"
            onClick={handlePrint}
            className="bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
        {/* v44 : vrai fichier PDF, en plus de l'impression conservee ci-dessus */}
        <button
          data-testid="btn-pdf-bulletin"
          onClick={handleDownloadPdf}
          className="w-full bg-red-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5"
        >
          <FileDown className="w-4 h-4" />
          Télécharger le PDF (15 F)
        </button>
      </div>

      {showPay && (
        <BulletinPaywallModal
          contentId={pdfContentId}
          title={`Bulletin de ${b.student.prenoms} ${b.student.nom}`}
          price={BULLETIN_PDF_PRICE}
          onClose={() => setShowPay(false)}
          onUnlocked={() => { setShowPay(false); exportBulletinPdf(classData, b, evaluation); }}
        />
      )}
    </div>
  );
}
