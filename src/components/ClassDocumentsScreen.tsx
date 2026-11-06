import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, Download, Eye, FileText, Printer, Trash2, Upload, X } from 'lucide-react';
import { ClassData, getClass } from '../utils/database';
import {
  addClassDocument,
  ClassDocument,
  ClassDocumentType,
  deleteClassDocument,
  formatDocSize,
  getClassDocuments,
  isPreviewablePdf,
} from '../utils/classDocuments';
import { hasAdminRole } from '../utils/adminSession';

const LABELS: Record<ClassDocumentType, { title: string; help: string; accept: string }> = {
  programme: {
    title: "Programme d'études",
    help: "Ajoutez ici le programme officiel de la classe. Formats conseillés : PDF ou DOCX. Le document reste consultable dans l'application.",
    accept: '.pdf,.doc,.docx,application/pdf',
  },
  planification: {
    title: 'Planification annuelle',
    help: "Ajoutez ici la planification annuelle des apprentissages de cette classe, idéalement au format PDF.",
    accept: '.pdf,application/pdf,.doc,.docx',
  },
};

export default function ClassDocumentsScreen({ type }: { type: ClassDocumentType }) {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [docs, setDocs] = useState<ClassDocument[]>([]);
  const [viewer, setViewer] = useState<ClassDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const canManage = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const meta = LABELS[type];

  useEffect(() => {
    if (!id) return;
    getClass(id).then(data => setClassData(data || null));
    loadDocs();
  }, [id, type]);

  async function loadDocs() {
    if (!id) return;
    setDocs(await getClassDocuments(id, type));
  }

  async function handleUpload(file?: File) {
    if (!file || !id) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      alert('Format accepté : PDF, DOC ou DOCX.');
      return;
    }
    setUploading(true);
    try {
      await addClassDocument(id, type, file);
      await loadDocs();
      alert('Document ajouté avec succès.');
    } catch (error) {
      console.error(error);
      alert('Impossible d’ajouter ce document. Vérifiez sa taille ou le stockage disponible.');
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(docId: string) {
    if (!confirm('Supprimer ce document ?')) return;
    await deleteClassDocument(docId);
    await loadDocs();
  }

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{meta.title}</h1>
            <p className="text-emerald-100 text-sm">{classData.name} • {classData.school}</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-3 rounded-xl"><FileText className="w-7 h-7 text-emerald-600" /></div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-800">{meta.title} de la classe</h2>
              <p className="text-gray-500 text-sm mt-1">{meta.help}</p>
            </div>
          </div>
          <div className="mt-4">
            {canManage ? (
              <label className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                {uploading ? 'Ajout...' : 'Ajouter un fichier'}
                <input
                  type="file"
                  accept={meta.accept}
                  onChange={e => {
                    handleUpload(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Consultation des documents de la classe.</p>
            )}
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Aucun document ajouté pour cette classe.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                <FileText className="w-9 h-9 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{doc.fileName}</p>
                  <p className="text-gray-400 text-xs">{formatDocSize(doc.size)} • Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => setViewer(doc)} className="bg-blue-50 text-blue-700 p-2 rounded-lg" title="Voir"><Eye className="w-5 h-5" /></button>
                {canManage && (
                  <button onClick={() => removeDoc(doc.id)} className="bg-red-50 text-red-600 p-2 rounded-lg" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {viewer && <DocumentViewer doc={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function downloadBlob(doc: ClassDocument) {
  // URL créée sur demande puis libérée après 4 s (délai nécessaire sur Android)
  const objectUrl = URL.createObjectURL(doc.blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

function printDocument(doc: ClassDocument) {
  const win = window.open('', '_blank');
  if (!win) return;
  if (isPreviewablePdf(doc)) {
    const objectUrl = URL.createObjectURL(doc.blob);
    win.document.write(
      `<html><head><title>${doc.fileName}</title></head>` +
      `<body style="margin:0"><iframe src="${objectUrl}" style="border:none;width:100%;height:100vh"></iframe>` +
      `<scr` + `ipt>window.onload=()=>setTimeout(()=>window.print(),700);</scr` + `ipt></body></html>`
    );
    win.document.close();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } else if (doc.extractedText) {
    win.document.write(
      `<html><head><title>${doc.fileName}</title>` +
      `<style>body{font-family:sans-serif;padding:28px;line-height:1.7;white-space:pre-wrap;color:#111}</style>` +
      `<style>@media print{body{padding:0}}</style></head><body>${escapeHtml(doc.extractedText)}</body></html>`
    );
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  } else {
    win.close();
  }
}

function DocumentViewer({ doc, onClose }: { doc: ClassDocument; onClose: () => void }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isPreviewablePdf(doc)) {
      const objectUrl = URL.createObjectURL(doc.blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [doc]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-800 truncate">{doc.fileName}</p>
            <p className="text-xs text-gray-500">Lecture intégrée dans l’application</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => downloadBlob(doc)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Télécharger</span>
            </button>
            <button onClick={() => printDocument(doc)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-6 h-6" /></button>
          </div>
        </div>
        <div className="flex-1 bg-gray-50 overflow-auto">
          {isPreviewablePdf(doc) && url ? (
            <iframe src={url} title={doc.fileName} className="w-full h-full" />
          ) : doc.extractedText ? (
            <pre className="whitespace-pre-wrap p-5 text-sm text-gray-800 font-sans leading-relaxed">{doc.extractedText}</pre>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Aperçu indisponible. Convertissez ce document en PDF ou DOCX pour l’afficher directement dans l’application.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
