import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  AlertTriangle, ChevronLeft, ClipboardCheck, Copy, FileText,
  Printer, Save, School, Target, Trash2, FileDown, FileType2, Upload,
} from 'lucide-react';
import { makePdf } from '../utils/pdfMaker';
import RichTextEditor from './RichTextEditor';
import { downloadDocx, htmlToBlocks, plainTextToHtml } from '../utils/docxMaker';
import { getSignatureImage, getStampImage } from '../utils/scanner';
import { signatureFor } from '../utils/documentSignature';
import { getAllClasses } from '../utils/database';
import { computeBulletins, computeClassStats } from '../utils/bulletin';
import { getProfile } from '../utils/userProfile';
import { copyText } from '../utils/clipboard';
import { buildSchoolSummary, localDateKey, buildStudentsToSupport } from '../utils/schoolStats';
import { AdminTask, loadTasks, saveTasks, taskProgress, taskProgressByCategory } from '../utils/schoolChecklists';
import { printSchoolReport } from '../utils/schoolReport';
import { schoolYearLabel } from '../utils/orientation';

type AdminTab = 'pilotage' | 'documents' | 'checklists' | 'priorites';

type DocumentType =
  | 'rapport_mensuel'
  | 'pv_conseil'
  | 'pv_ape'
  | 'note_service'
  | 'demande_fournitures'
  | 'rapport_inspection'
  | 'plan_remediation'
  | 'liste_presence_conseil'
  | 'liste_presence_ape';

interface AdminDocument {
  id: string;
  type: DocumentType;
  title: string;
  school: string;
  circonscription: string;
  date: string;
  author: string;
  content: string;
  createdAt: number;
}

const DOC_KEY = 'msp_admin_documents';

const DOC_LABELS: Record<DocumentType, string> = {
  rapport_mensuel: 'Rapport mensuel à la circonscription',
  pv_conseil: 'PV du conseil des maîtres / conseil de classe',
  pv_ape: 'PV réunion APE',
  note_service: 'Note de service',
  demande_fournitures: 'Demande de fournitures / matériel',
  rapport_inspection: 'Rapport de préparation à l’inspection',
  plan_remediation: 'Plan de remédiation pédagogique',
  // v47 — formulaires officiels fournis par l'utilisateur
  liste_presence_conseil: 'Liste de présence au conseil des maîtres',
  liste_presence_ape: 'Liste de présence (réunion des parents)',
};

function loadDocs(): AdminDocument[] {
  try { return JSON.parse(localStorage.getItem(DOC_KEY) || '[]'); } catch { return []; }
}

function saveDocs(docs: AdminDocument[]) {
  localStorage.setItem(DOC_KEY, JSON.stringify(docs));
}

/**
 * MODELES DE DOCUMENTS ADMINISTRATIFS (refondus en v47).
 *
 * ── ORIGINE ──────────────────────────────────────────────────────────
 * Les modeles precedents etaient generiques. L'utilisateur a fourni les
 * formulaires REELLEMENT utilises dans les ecoles (EPP NIMBO, CS SINENDE,
 * DDEMP BORGOU) : compte rendu du conseil des maitres, proces-verbal de
 * reunion des parents d'eleves, et les deux listes de presence associees.
 *
 * On reproduit fidelement leur STRUCTURE officielle :
 *   - l'en-tete administratif sur trois lignes (DDEMP / CS / EPP) avec
 *     l'annee scolaire alignee a droite ;
 *   - la mention ORDINAIRE / EXTRAORDINAIRE a cocher ;
 *   - l'heure de demarrage ET l'heure de fin (jusque-la absentes) ;
 *   - la qualite du president de seance et celle de l'ambiance ;
 *   - les rubriques POINTS INSCRITS A L'ORDRE DU JOUR puis DEROULEMENT ;
 *   - la double signature « Le Secretaire de seance » / « Le Directeur ».
 *
 * Les pointilles des formulaires papier sont remplaces par des champs a
 * completer : le document reste imprimable, mais devient surtout
 * REMPLISSABLE a l'ecran, ce qui est l'interet de la version numerique.
 */
function adminHeader(context: { school: string; circonscription: string; date: string }) {
  const year = schoolYearLabel();
  return ''
    + `DDEMP : ${context.circonscription || '...........................'}`
    + `${' '.repeat(6)}ANNÉE SCOLAIRE : ${year}\n`
    + `CS : ...........................\n`
    + `EPP : ${context.school || '...........................'}\n\n`;
}

/** Lignes a completer, comme les pointilles du formulaire papier. */
function blankLines(n: number): string {
  return Array.from({ length: n }, () => '.'.repeat(70)).join('\n') + '\n';
}

function buildTemplate(type: DocumentType, context: { school: string; circonscription: string; author: string; date: string }) {
  const header = adminHeader(context);
  const legacyHeader = `RÉPUBLIQUE DU BÉNIN\n${context.circonscription || 'Circonscription scolaire : __________'}\n${context.school || 'École : __________'}\nDate : ${context.date}\nRédigé par : ${context.author || '__________'}\n\n`;

  switch (type) {
    /* ---- Formulaires officiels fournis par l'utilisateur (v47) ---- */
    case 'pv_conseil':
      return header
        + `\t\tCOMPTE RENDU DU CONSEIL DES MAÎTRES\tN° ......\n\n`
        + `\t[ ] ORDINAIRE\t\t[ ] EXTRAORDINAIRE\n\n`
        + `Date : ${context.date || '...........................'}\n`
        + `Heure de démarrage : ..... h ..... min\n`
        + `Présidé par : ${context.author || '...........................'}\t`
        + `Qualité : ...........................\n\n`
        + `POINTS INSCRITS À L'ORDRE DU JOUR :\n`
        + blankLines(5)
        + `\nDÉROULEMENT\n`
        + blankLines(18)
        + `\nHeure de la fin : ..... h ..... min\t`
        + `Qualité de l'ambiance : ...........................\n\n`
        + `Le Secrétaire de séance\t\t\tLe Directeur\n`;

    case 'pv_ape':
      return header
        + `\t\tPROCÈS-VERBAL DE RÉUNION DES PARENTS D'ÉLÈVES\tN° ......\n\n`
        + `L'an deux mil ............ et le ...........................\n`
        + `a eu lieu à l'École Primaire Publique de ${context.school || '..................'} `
        + `à partir de ..... h ..... minutes, l'assemblée générale des parents d'élèves `
        + `présidée par le Président du Bureau de l'Association des Parents d'Élèves, `
        + `Monsieur ........................................... sous la supervision du `
        + `Directeur de ladite école, Monsieur ...........................................\n\n`
        + `Étaient présents à cette séance (voir la liste en annexe).\n\n`
        + `Étaient inscrits à l'ordre du jour les points ci-après :\n`
        + blankLines(7)
        + `\nDÉROULEMENT\n`
        + blankLines(20)
        + `\nLe Secrétaire de séance\t\t\tLe Directeur\n`;

    case 'liste_presence_conseil':
      return header
        + `\t\tLISTE DE PRÉSENCE AU CONSEIL DES MAÎTRES\n\n`
        + `N° | Matricule | NOM ET PRÉNOMS | SEXE | Qualité | Cours tenu | Statut | Grade | Contact | Émargement\n`
        + Array.from({ length: 12 }, (_, i) =>
            `${i + 1} | .......... | ............................ | .... | .......... | .......... | .......... | .......... | .......... | ..........`)
          .join('\n')
        + `\n\nLe Secrétaire de séance\t\t\tLe Directeur\n`;

    case 'liste_presence_ape':
      return header
        + `\t\tLISTE DE PRÉSENCE\n\n`
        + `N° | NOM ET PRÉNOMS | Qualité / Classe de l'enfant | Contact | Émargement\n`
        + Array.from({ length: 20 }, (_, i) =>
            `${i + 1} | ............................ | .................... | .......... | ..........`)
          .join('\n')
        + `\n\nLe Secrétaire de séance\t\t\tLe Directeur\n`;

    /* ---- Modeles generiques conserves (v33) ---- */
    case 'rapport_mensuel':
      return `${legacyHeader}RAPPORT MENSUEL\n\n1. Effectifs et fréquentation scolaire :\n- Effectif total :\n- Taux de présence :\n- Absences répétées signalées :\n\n2. Activités pédagogiques réalisées :\n\n3. Difficultés rencontrées :\n\n4. Actions de remédiation engagées :\n\n5. Besoins et recommandations :\n`;
    case 'note_service':
      return `${legacyHeader}NOTE DE SERVICE\n\nObjet :\n\nIl est porté à la connaissance des enseignants et acteurs concernés que :\n\nConsignes :\n\nFait pour servir et valoir ce que de droit.\n`;
    case 'demande_fournitures':
      return `${legacyHeader}DEMANDE DE FOURNITURES / MATÉRIEL\n\nObjet : Demande d\u2019appui en matériel pédagogique\n\nBesoins identifiés :\n- Cahiers :\n- Craies / marqueurs :\n- Manuels :\n- Matériel sportif :\n- Autres :\n\nJustification pédagogique :\n`;
    case 'rapport_inspection':
      return `${legacyHeader}RAPPORT DE PRÉPARATION À L\u2019INSPECTION\n\nDocuments disponibles :\n- Cahier journal :\n- Progressions :\n- Fiches pédagogiques :\n- Registre d\u2019appel :\n- Évaluations :\n\nPoints forts :\n\nPoints à améliorer :\n\nActions engagées :\n`;
    case 'plan_remediation':
      return `${legacyHeader}PLAN DE REMÉDIATION PÉDAGOGIQUE\n\nÉlèves concernés :\n\nDifficultés observées :\n\nObjectifs de remédiation :\n\nActivités prévues :\n\nCalendrier :\n\nIndicateurs de réussite :\n`;
  }
}


/**
 * v49 — Le contenu est desormais du HTML (editeur enrichi).
 * Cette fonction en extrait un texte lisible pour les usages qui ne
 * savent pas afficher du HTML : copie dans le presse-papier et PDF.
 * Sans elle, l'utilisateur verrait des balises « <div> » dans ses
 * documents officiels.
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html; // deja du texte brut
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Les sauts de bloc doivent survivre a la conversion.
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  doc.querySelectorAll('div,p,tr,h1,h2,h3,li').forEach((el) => {
    el.append('\n');
  });
  doc.querySelectorAll('td,th').forEach((el) => el.append('\t'));
  return (doc.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function SchoolAdminToolkitScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();
  const [tab, setTab] = useState<AdminTab>('pilotage');
  const [classes, setClasses] = useState<any[]>([]);
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);

  const [docType, setDocType] = useState<DocumentType>('rapport_mensuel');
  const [school, setSchool] = useState(profile.schoolName || '');
  const [circonscription, setCirconscription] = useState('');
  const [author, setAuthor] = useState(profile.teacherName || '');
  const [date, setDate] = useState(localDateKey());
  const [newTask, setNewTask] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Personnalisé');
  const [content, setContent] = useState('');

  useEffect(() => {
    getAllClasses().then(setClasses);
    setDocs(loadDocs());
    setTasks(loadTasks());
  }, []);

  useEffect(() => {
    // v49 : modele converti en HTML pour l'editeur enrichi.
    setContent(plainTextToHtml(buildTemplate(docType, { school, circonscription, author, date }) || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType]);

  const classSummaries = useMemo(() => classes.map(classData => {
    const bulletins = computeBulletins(classData);
    const stats = computeClassStats(bulletins);
    const completion = classData.students.length * classData.subjects.length
      ? Math.round((classData.notes.filter((n: any) => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent).length / (classData.students.length * classData.subjects.length)) * 100)
      : 0;
    return {
      name: classData.name,
      level: classData.level,
      effectif: classData.students.length,
      moyenne: stats.moyenneClasse,
      taux: stats.tauxReussite,
      completion,
      alert: completion < 100 || (stats.tauxReussite < 50 && stats.count > 0),
    };
  }), [classes]);

  function persistDocs(next: AdminDocument[]) {
    setDocs(next);
    saveDocs(next);
  }

  function persistTasks(next: AdminTask[]) {
    setTasks(next);
    saveTasks(next);
  }

  const summary = useMemo(() => buildSchoolSummary(classSummaries as any), [classSummaries]);
  const progress = taskProgress(tasks);
  const progressByCategory = taskProgressByCategory(tasks);
  const studentsToSupport = useMemo(() => classes.map(cd => ({ className: cd.name, items: buildStudentsToSupport(cd) })), [classes]);
  const supportTotal = studentsToSupport.reduce((a, g) => a + g.items.length, 0);

  function addTask() {
    if (!newTask.trim()) return;
    const item: AdminTask = { id: `task-${Date.now()}`, label: newTask.trim(), category: newTaskCategory.trim() || 'Personnalisé', done: false, custom: true };
    persistTasks([...tasks, item]);
    setNewTask('');
  }

  function regenerateTemplate() {
    // Les modeles sont ecrits en texte brut : on les convertit en HTML
    // pour qu'ils soient modifiables dans l'editeur enrichi.
    setContent(plainTextToHtml(buildTemplate(docType, { school, circonscription, author, date }) || ''));
  }

  function saveDocument() {
    const doc: AdminDocument = {
      id: `adm-doc-${Date.now()}`,
      type: docType,
      title: DOC_LABELS[docType],
      school,
      circonscription,
      date,
      author,
      content,
      createdAt: Date.now(),
    };
    persistDocs([doc, ...docs]);
    alert('Document administratif enregistré.');
  }

  async function copyDocument() {
    const okCopy = await copyText(htmlToPlainText(content));
    alert(okCopy ? 'Document copié.' : 'Impossible de copier automatiquement : sélectionnez le texte manuellement.');
  }

  function printDocument() {
    printDocContent(DOC_LABELS[docType], content);
  }

  /**
   * v47 — VRAI FICHIER PDF du document administratif.
   *
   * Corrige une violation de la regle posee en v41 : cet ecran ne
   * proposait que window.print(), sans generer de PDF. L'impression est
   * conservee a cote, conformement a la consigne.
   *
   * La signature et le cachet numerises (s'ils existent) sont apposes en
   * bas du document : c'est l'usage attendu pour un compte rendu ou un
   * proces-verbal officiel.
   */
  function exportDocumentPdf() {
    const pdf = makePdf({
      title: DOC_LABELS[docType],
      subtitle: `${school || 'École'}${circonscription ? ` — ${circonscription}` : ''}`,
      establishment: school || 'Mon établissement',
      signature: {
        preparedBy: author || undefined,
        role: 'Le Directeur / La Directrice',
        date,
      },
    });

    // Le texte du formulaire est restitue tel quel : les tabulations
    // servent d'alignement dans les formulaires officiels.
    for (const block of htmlToPlainText(content).split('\n\n')) {
      const clean = block.replace(/\t/g, '    ').trim();
      if (clean) pdf.paragraph(clean);
    }

    const sig = getSignatureImage();
    const stamp = getStampImage();
    if (sig || stamp) {
      pdf.sectionTitle('Signature et cachet');
      if (sig) pdf.image(sig, 70);
      if (stamp) pdf.image(stamp, 90);
    }

    pdf.save(`${docType}-${date || 'document'}.pdf`);
  }

  /**
   * v49 — EXPORT WORD (.docx) REEL.
   *
   * Le document redige dans l'editeur est converti en OOXML : il s'ouvre
   * dans Word, LibreOffice ou Google Docs et reste MODIFIABLE, ce que ne
   * permet pas le PDF. La demande etait « utiliser les fonctionnalites de
   * MS Word pour generer les differents documents ».
   */
  async function exportDocumentWord() {
    const blocks = htmlToBlocks(content);
    if (blocks.length === 0) {
      alert('Le document est vide.');
      return;
    }
    // En-tete officiel repris en tete de fichier.
    const head = [
      { type: 'paragraph' as const, runs: [{ text: DOC_LABELS[docType], bold: true, size: 14 }], align: 'center' as const },
      { type: 'paragraph' as const, runs: [{ text: `${school || ''}${circonscription ? ` — ${circonscription}` : ''}`, size: 10 }], align: 'center' as const },
      { type: 'paragraph' as const, runs: [{ text: '' }] },
    ];
    const foot = [
      { type: 'paragraph' as const, runs: [{ text: '' }] },
      { type: 'paragraph' as const, runs: [{ text: signatureFor('application') || '', italic: true, size: 8 }], align: 'center' as const },
    ];
    await downloadDocx([...head, ...blocks, ...foot], `${docType}-${date || 'document'}.docx`);
  }

  /**
   * v49 — IMPORT D'UN DOCUMENT WORD EXISTANT.
   * Permet de reprendre un modele deja redige par la circonscription.
   * `mammoth` (deja present dans l'application) convertit le .docx en
   * HTML, que l'editeur peut alors modifier.
   */
  async function importWord(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
      setContent(res.value || '');
      alert('Document Word importé. Vous pouvez le modifier.');
    } catch {
      alert('Ce fichier Word n’a pas pu être lu.');
    }
  }

  function printDocContent(title: string, text: string) {
    const win = window.open('', '_blank');
    if (!win) return;
    // v49 : le contenu est du HTML mis en forme. On l'imprime tel quel
    // (gras, titres, tableaux) au lieu de l'echapper ; un contenu ancien
    // en texte brut reste correctement rendu grace a « pre-wrap ».
    const isHtml = /<[a-z][\s\S]*>/i.test(text);
    const body = isHtml ? text : text.replace(/</g, '&lt;');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      body{font-family:Arial,sans-serif;padding:30px;line-height:1.5;${isHtml ? '' : 'white-space:pre-wrap;'}}
      h1{color:#046a38;font-size:18px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      td,th{border:1px solid #999;padding:6px;font-size:13px}
      th{background:#eee}
    </style></head><body><h1>${title}</h1>${body}<script>window.onload=function(){window.print()}<\/script></body></html>`);
    win.document.close();
  }

  /** Rouvre un document archivé dans l'éditeur pour le modifier. */
  function openDoc(doc: AdminDocument) {
    setDocType(doc.type);
    setSchool(doc.school);
    setCirconscription(doc.circonscription);
    setAuthor(doc.author);
    setDate(doc.date);
    setContent(doc.content);
    setTab('documents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function printPilotage() {
    const okPrint = printSchoolReport({
      school,
      circonscription,
      author,
      yearLabel: schoolYearLabel(),
      date: localDateKey(),
      summary,
      classes: classSummaries,
      studentsToSupport,
    });
    if (!okPrint) alert('Votre navigateur a bloqué l’ouverture de la fenêtre d’impression.');
  }

  const tabs: { id: AdminTab; label: string; icon: typeof School }[] = [
    { id: 'pilotage', label: 'Pilotage', icon: Target },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    { id: 'priorites', label: 'Priorités', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg">Administration scolaire</h1>
            <p className="text-emerald-100 text-sm">Pilotage, documents, inspection et EducMaster</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {tabs.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} data-testid={`onglet-${item.id}`} onClick={() => setTab(item.id)} className={`rounded-xl p-3 text-xs font-semibold flex flex-col items-center gap-1 ${tab === item.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'pilotage' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-emerald-600 text-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-black">{summary.totalStudents}</p>
                <p className="text-xs text-emerald-100">Élèves ({summary.count} classe{summary.count > 1 ? 's' : ''})</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-black text-gray-900">{summary.moyenneEcole === null ? '-' : summary.moyenneEcole.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Moyenne de l’école /20</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-black text-gray-900">{Math.round(summary.tauxGlobal)}%</p>
                <p className="text-xs text-gray-500">Réussite globale</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-black text-gray-900">{Math.round(summary.completionMoyenne)}%</p>
                <p className="text-xs text-gray-500">Saisie moyenne</p>
              </div>
            </div>
            <button onClick={printPilotage} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
              <Printer className="w-5 h-5" /> Imprimer le rapport de pilotage
            </button>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-bold text-gray-800">Élèves à accompagner (moyenne &lt; 10/20)</h2>
                <span className={`rounded px-2 py-1 text-xs font-bold ${supportTotal > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{supportTotal}</span>
              </div>
              {supportTotal === 0 ? (
                <p className="text-emerald-700 bg-emerald-50 rounded-lg p-3 text-sm">Aucun élève sous la moyenne. Continuez le suivi régulier.</p>
              ) : (
                <div className="space-y-2">
                  {studentsToSupport.filter(g => g.items.length > 0).map(group => (
                    <div key={group.className} className="rounded-lg border p-3">
                      <p className="font-bold text-gray-800 text-sm mb-1">{group.className}</p>
                      {group.items.map(item => (
                        <div key={item.studentId} className="flex items-center justify-between gap-2 py-1 border-t border-gray-50 text-sm">
                          <p className="text-gray-700">{item.name}</p>
                          <p className="text-gray-500 text-xs shrink-0">{item.moyenne?.toFixed(2)}/20 · {item.weakCount} matière{item.weakCount > 1 ? 's' : ''} &lt; 10</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3">Vue de pilotage des classes</h2>
              <div className="space-y-2">
                {classSummaries.length === 0 ? <p className="text-gray-500 text-sm">Aucune classe créée.</p> : classSummaries.map(item => (
                  <div key={item.name} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-800">{item.name} <span className="text-xs text-gray-400">{item.level}</span></p>
                        <p className="text-xs text-gray-500">Effectif : {item.effectif} • Saisie : {item.completion}%</p>
                      </div>
                      {item.alert ? <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">À suivre</span> : <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded">OK</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <p>Moyenne : <strong>{item.moyenne === null ? '-' : item.moyenne.toFixed(2)}/20</strong></p>
                      <p>Réussite : <strong>{Math.round(item.taux)}%</strong></p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.completion >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${item.completion}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 w-24 text-right shrink-0">Saisie {item.completion}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-bold text-gray-800">Générateur de documents administratifs</h2>
              <select value={docType} onChange={e => setDocType(e.target.value as DocumentType)} className="w-full p-3 border rounded-lg">
                {Object.entries(DOC_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="École" className="p-3 border rounded-lg text-sm" />
                <input value={circonscription} onChange={e => setCirconscription(e.target.value)} placeholder="Circonscription" className="p-3 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Rédacteur" className="p-3 border rounded-lg text-sm" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 border rounded-lg text-sm" />
              </div>
              {/* v49 : traitement de texte complet (gras, titres, tableaux…). */}
              <RichTextEditor value={content} onChange={setContent} testId="editeur-word" />
              <button onClick={regenerateTemplate} className="w-full bg-gray-50 border border-dashed border-gray-300 py-2 rounded-lg text-sm text-gray-600 font-medium">↻ Régénérer le modèle (en-tête actuel)</button>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={copyDocument} className="bg-blue-50 text-blue-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-1"><Copy className="w-4 h-4" /> Copier</button>
                <button onClick={exportDocumentWord} data-testid="btn-word-document-admin" className="bg-[#1b3a6b] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-1"><FileType2 className="w-4 h-4" /> Word</button>
                <button onClick={exportDocumentPdf} data-testid="btn-pdf-document-admin" className="bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
                <button onClick={printDocument} className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
                <button onClick={saveDocument} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-1"><Save className="w-4 h-4" /> Sauver</button>
              </div>
              <label className="w-full bg-gray-50 border border-dashed border-gray-300 py-2 rounded-lg text-sm text-gray-600 font-medium flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" /> Importer un document Word existant
                <input type="file" accept=".docx" onChange={importWord} className="hidden" data-testid="input-import-word" />
              </label>
            </div>
            <div className="space-y-2">
              {docs.length === 0 && <p className="text-gray-500 text-sm">Aucun document enregistré.</p>}
              {docs.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl shadow p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{doc.title}</p>
                      <p className="text-gray-500 text-xs">{doc.date} • {doc.school}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer définitivement « ${doc.title} » ?`)) {
                          persistDocs(docs.filter(d => d.id !== doc.id));
                        }
                      }}
                      className="text-red-500 p-2 shrink-0"
                      title="Supprimer"
                    ><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={() => openDoc(doc)} className="bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><FileText className="w-4 h-4" /> Rouvrir</button>
                    <button onClick={() => printDocContent(doc.title, doc.content)} className="bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'checklists' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="font-bold text-gray-800">Checklists EducMaster & Inspection</h2>
                <button
                  onClick={() => {
                    if (window.confirm('Réinitialiser toutes les tâches (les personnalisées sont conservées) ?')) {
                      persistTasks(tasks.map(t => ({ ...t, done: false })));
                    }
                  }}
                  className="text-gray-400 text-xs font-semibold"
                >Réinitialiser</button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progress.percent >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`} style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="text-sm font-bold text-gray-700 shrink-0">{progress.done}/{progress.total}</p>
              </div>
              {progressByCategory.length > 1 && (
                <div className="mt-3 space-y-2">
                  {progressByCategory.map(cat => (
                    <div key={cat.category} className="flex items-center gap-2 text-xs">
                      <p className="w-28 text-gray-600 font-semibold shrink-0">{cat.category}</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${cat.percent >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`} style={{ width: `${cat.percent}%` }} />
                      </div>
                      <p className="text-gray-500 w-16 text-right shrink-0">{cat.done}/{cat.total}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2">
                <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Ajouter une tâche personnalisée…" className="p-3 border rounded-lg text-sm" />
                <input value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)} placeholder="Catégorie" className="p-3 border rounded-lg text-sm" />
                <button onClick={addTask} className="bg-emerald-600 text-white px-4 rounded-lg font-semibold text-sm">Ajouter</button>
              </div>
              <div className="space-y-2 mt-2">
                {tasks.map(task => (
                  <label key={task.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <input type="checkbox" checked={task.done} onChange={() => persistTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))} className="mt-1 w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.label}</p>
                      <p className="text-xs text-gray-500">{task.category}</p>
                    </div>
                    {task.custom && (
                      <button onClick={() => persistTasks(tasks.filter(t => t.id !== task.id))} className="text-red-400 p-1.5 shrink-0" title="Supprimer la tâche">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'priorites' && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-3">Priorités pédagogiques</h2>
            <div className="space-y-2">
              {classSummaries.filter(c => c.alert).length === 0 ? (
                <p className="text-emerald-700 bg-emerald-50 rounded-lg p-3 text-sm">Aucune alerte majeure. Continuez le suivi régulier.</p>
              ) : classSummaries.filter(c => c.alert).map(item => (
                <div key={item.name} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-bold text-amber-800">{item.name}</p>
                  <p className="text-amber-700 text-sm">Saisie : {item.completion}%. Réussite : {Math.round(item.taux)}%. Prévoir remédiation et vérification des notes.</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}