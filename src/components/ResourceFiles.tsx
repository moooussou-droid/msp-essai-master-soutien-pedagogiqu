import { useState, useEffect } from 'react';
import { Plus, X, Trash2, FileUp, Link2, Download, Play } from 'lucide-react';
import {
  ResourceCategory, ResourceItem, generateResourceId,
  getResourcesByCategory, addResource, deleteResource,
  getFileIcon, formatFileSize, getYouTubeId, openResourceFile,
} from '../utils/resourcesDB';
import { hasAdminRole } from '../utils/adminSession';

type AccentName = 'emerald' | 'red' | 'amber' | 'blue';

interface Props {
  category: ResourceCategory;
  accent: AccentName;
  refreshKey?: number;
}

// Mapping explicite pour que Tailwind inclue bien ces classes dans le build
const ACCENTS: Record<AccentName, { bg: string; light: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500' },
  red: { bg: 'bg-red-600', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500' },
  blue: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500' },
};

const ADMIN_ONLY_CATEGORIES: ResourceCategory[] = ['programmes', 'videos', 'annonces', 'publicites'];
const CATEGORY_ADMIN_ROLES: Partial<Record<ResourceCategory, string[]>> = {
  programmes: ['Super Administrateur', 'Responsable Ressources'],
  videos: ['Super Administrateur', 'Responsable Ressources'],
  annonces: ['Super Administrateur', 'Responsable Annonces'],
  publicites: ['Super Administrateur', 'Responsable Annonces'],
};

export default function ResourceFiles({ category, accent, refreshKey = 0 }: Props) {
  const theme = ACCENTS[accent];
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ResourceItem | null>(null);
  const [youtubePlayer, setYoutubePlayer] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    load();
  }, [category, refreshKey]);

  async function load() {
    const data = await getResourcesByCategory(category);
    setItems(data);
  }

  const adminOnly = ADMIN_ONLY_CATEGORIES.includes(category);
  const allowedRoles = CATEGORY_ADMIN_ROLES[category] || [];
  const canManage = allowedRoles.some((role) => hasAdminRole(role));
  const canAdd = !adminOnly || canManage;

  function resetForm() {
    setTitle('');
    setDescription('');
    setUrl('');
    setFile(null);
    setMode('file');
    setShowAdd(false);
  }

  async function handleSave() {
    if (mode === 'file' && !file) {
      alert('Veuillez sélectionner un fichier.');
      return;
    }
    if (mode === 'link' && !url.trim()) {
      alert('Veuillez saisir un lien (URL).');
      return;
    }

    setSaving(true);
    try {
      const base: ResourceItem = {
        id: generateResourceId(),
        category,
        kind: mode,
        title: title.trim() || (mode === 'file' ? file!.name : 'Lien'),
        description: description.trim() || undefined,
        createdAt: Date.now(),
      };

      if (mode === 'file' && file) {
        base.fileName = file.name;
        base.mimeType = file.type || 'application/octet-stream';
        base.size = file.size;
        base.blob = file;
      } else if (mode === 'link') {
        base.url = url.trim();
      }

      await addResource(base);
      await load();
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout. Le fichier est peut-être trop volumineux.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette ressource ?')) return;
    await deleteResource(id);
    await load();
  }

  function playYouTubeInApp(id: string, title: string) {
    if (!navigator.onLine) {
      alert('Connexion internet requise pour lire cette vidéo YouTube dans l’application.');
      return;
    }
    setYoutubePlayer({ id, title });
  }

  const accentBg = theme.bg;
  const accentLight = theme.light;
  const accentText = theme.text;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Ressources ajoutées</h3>
        <div className="flex items-center gap-2">
          {canAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className={`${accentBg} text-white text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 font-medium`}
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>
      </div>

      {adminOnly && !canManage && (
        <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Ressources consultables. Les mises à jour sont gérées par l’équipe habilitée.
        </p>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <FileUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune ressource pour le moment</p>
          <p className="text-gray-400 text-xs mt-1">
            Ajoutez des fichiers (PDF, Word, Excel, images, audio, vidéo…) ou des liens (YouTube…)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const ytId = item.kind === 'link' && item.url ? getYouTubeId(item.url) : null;
            return (
              <div key={item.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
                <div className="text-3xl shrink-0">
                  {getFileIcon(item.mimeType, item.fileName, item.kind)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-gray-500 text-xs truncate">{item.description}</p>
                  )}
                  <p className="text-gray-400 text-xs">
                    {item.kind === 'file'
                      ? `${item.fileName?.split('.').pop()?.toUpperCase() || 'FICHIER'} • ${formatFileSize(item.size)}`
                      : ytId ? 'Vidéo YouTube' : 'Lien externe'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.kind === 'file' ? (
                    <button
                      onClick={() => {
                        if ((item.mimeType || '').startsWith('image/')) setPreview(item);
                        else openResourceFile(item);
                      }}
                      className={`${accentLight} ${accentText} p-2 rounded-lg`}
                      title="Ouvrir"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  ) : ytId ? (
                    <button
                      onClick={() => playYouTubeInApp(ytId, item.title)}
                      className={`${accentLight} ${accentText} p-2 rounded-lg`}
                      title="Lire dans l'application"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${accentLight} ${accentText} p-2 rounded-lg`}
                      title="Ouvrir le lien"
                    >
                      <Play className="w-5 h-5" />
                    </a>
                  )}
                  {canAdd && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aperçu image */}
      {preview && preview.blob && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-full max-h-full">
            <img
              src={URL.createObjectURL(preview.blob)}
              alt={preview.title}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setPreview(null)}
              className="mt-3 mx-auto block bg-white text-gray-800 px-4 py-2 rounded-lg font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Lecteur YouTube intégré */}
      {youtubePlayer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl">
            <div className="p-3 flex items-center justify-between border-b">
              <div>
                <p className="font-bold text-gray-800 text-sm">{youtubePlayer.title}</p>
                <p className="text-gray-500 text-xs">Lecture YouTube intégrée - connexion internet requise</p>
              </div>
              <button onClick={() => setYoutubePlayer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubePlayer.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={youtubePlayer.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter une ressource</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Choix du type */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setMode('file')}
                className={`py-3 rounded-lg font-semibold border-2 flex items-center justify-center gap-2 ${
                  mode === 'file' ? `${theme.border} ${accentLight} ${accentText}` : 'border-gray-200 text-gray-600'
                }`}
              >
                <FileUp className="w-5 h-5" />
                Fichier
              </button>
              <button
                onClick={() => setMode('link')}
                className={`py-3 rounded-lg font-semibold border-2 flex items-center justify-center gap-2 ${
                  mode === 'link' ? `${theme.border} ${accentLight} ${accentText}` : 'border-gray-200 text-gray-600'
                }`}
              >
                <Link2 className="w-5 h-5" />
                Lien / YouTube
              </button>
            </div>

            {mode === 'file' ? (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier *</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Tous formats : PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, MP4, MP3, AVI, TXT…
                </p>
                {file && (
                  <p className="text-gray-600 text-xs mt-1">
                    {getFileIcon(file.type, file.name)} {file.name} • {formatFileSize(file.size)}
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien (URL) *</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/... ou https://..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Programme de mathématiques CE1"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (facultatif)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Quelques détails…"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`${accentBg} text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50`}
            >
              {saving ? 'Enregistrement…' : 'Ajouter la ressource'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
