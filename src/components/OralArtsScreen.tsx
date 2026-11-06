import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import {
  Baby, BookOpen, ChevronLeft, Headphones, Music2, Plus, Search, Trash2,
  Download, Upload, Video, Volume2, X,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  createOralResource, deleteOralMedia, deleteOralResource, filterOralResources, getOralMedia,
  getOralResources, ORAL_KIND_LABELS, ORAL_LEVELS, ORAL_MEDIA_MAX_BYTES, saveOralMedia,
  validateOralMediaFile, type NewOralResource, type OralMediaKind, type OralResource, type OralResourceKind,
} from '../utils/oralResources';
import { formatFileSize } from '../utils/resourcesDB';
import { exportOralResourcesArchive, formatOralTransferSize, importOralResourcesArchive } from '../utils/oralResourceTransfer';
import { getAdminMemberSession, isPrincipalAdminSession } from '../utils/adminSession';
import SchoolLockBanner from './SchoolLockBanner';

const KIND_FILTERS: { id: OralResourceKind | 'tout'; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'poesie', label: 'Poésies' },
  { id: 'chant', label: 'Chants' },
  { id: 'comptine', label: 'Comptines' },
  { id: 'conte', label: 'Contes' },
];

function kindIcon(kind: OralResourceKind) {
  if (kind === 'chant') return <Music2 className="w-5 h-5" />;
  if (kind === 'comptine') return <Baby className="w-5 h-5" />;
  if (kind === 'conte') return <BookOpen className="w-5 h-5" />;
  return <BookOpen className="w-5 h-5" />;
}

function defaultContributorName() {
  if (isPrincipalAdminSession()) return 'Administrateur principal';
  const member = getAdminMemberSession();
  return member?.name?.trim() || (member ? 'Membre de l’équipe' : 'Enseignant');
}

export default function OralArtsScreen() {
  const goBack = useSmartBack();
  const [resources, setResources] = useState<OralResource[]>(() => getOralResources());
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<OralResourceKind | 'tout'>('tout');
  const [level, setLevel] = useState('Tous niveaux');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mediaRevision, setMediaRevision] = useState(0);
  const [media, setMedia] = useState<{
    loading: boolean; audioUrl?: string; audioName?: string; audioSize?: number;
    videoUrl?: string; videoName?: string; videoSize?: number;
  }>({ loading: false });
  const [notice, setNotice] = useState('');
  const audioInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const transferInput = useRef<HTMLInputElement>(null);
  const [transferBusy, setTransferBusy] = useState(false);

  const selected = resources.find(resource => resource.id === selectedId) || null;
  const filtered = useMemo(
    () => filterOralResources(resources, query, kind, level),
    [resources, query, kind, level],
  );
  const speechApiAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance !== 'undefined';
  const [localFrenchVoice, setLocalFrenchVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!speechApiAvailable) return;
    const refreshLocalVoice = () => {
      const voice = window.speechSynthesis.getVoices()
        .find(item => item.localService && item.lang.toLowerCase().startsWith('fr')) || null;
      setLocalFrenchVoice(voice);
    };
    refreshLocalVoice();
    window.speechSynthesis.addEventListener('voiceschanged', refreshLocalVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshLocalVoice);
  }, [speechApiAvailable]);
  const selectedSpeechAvailable = Boolean(selected?.text.trim() && localFrenchVoice && selected?.language.toLowerCase().startsWith('fr'));

  useEffect(() => {
    if (!selected) {
      setMedia({ loading: false });
      return;
    }
    let alive = true;
    const urls: string[] = [];
    setMedia({ loading: true });
    Promise.all([getOralMedia(selected.id, 'audio'), getOralMedia(selected.id, 'video')])
      .then(([audio, video]) => {
        if (!alive) return;
        const next: typeof media = { loading: false };
        if (audio?.blob) {
          next.audioUrl = URL.createObjectURL(audio.blob);
          urls.push(next.audioUrl);
          next.audioName = audio.fileName;
          next.audioSize = audio.size;
        }
        if (video?.blob) {
          next.videoUrl = URL.createObjectURL(video.blob);
          urls.push(next.videoUrl);
          next.videoName = video.fileName;
          next.videoSize = video.size;
        }
        setMedia(next);
      })
      .catch(() => { if (alive) setMedia({ loading: false }); });
    return () => {
      alive = false;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selected?.id, mediaRevision]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [selected?.id]);

  function refreshResources() {
    setResources(getOralResources());
  }

  async function exportTransfer() {
    setTransferBusy(true);
    try {
      const blob = await exportOralResourcesArchive();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `msp-ressources-orales-${stamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice(`Archive de transfert créée (${formatOralTransferSize(blob.size)}). Copiez-la sur l’autre appareil puis importez-la.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de créer l’archive de transfert.');
    } finally {
      setTransferBusy(false);
    }
  }

  async function importTransfer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setTransferBusy(true);
    try {
      const result = await importOralResourcesArchive(file, plan => window.confirm(
        `Fusionner cette archive avec les ressources de cet appareil ?\\n\\n`
        + `• ${plan.added} nouvelle(s) ressource(s)\\n`
        + `• ${plan.updated} ressource(s) existante(s) actualisée(s)\\n`
        + `• ${plan.media} fichier(s) audio/vidéo (${formatOralTransferSize(plan.totalBytes)})\\n\\n`
        + 'Les autres ressources de cet appareil seront conservées.',
      ));
      if (result.cancelled) {
        setNotice('Import annulé; aucune ressource n’a été modifiée.');
        return;
      }
      refreshResources();
      setMediaRevision(value => value + 1);
      setNotice(`Transfert terminé : ${result.added} ajoutée(s), ${result.updated} actualisée(s), ${result.media} média(s) importé(s).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Archive illisible ou incompatible.');
    } finally {
      setTransferBusy(false);
    }
  }

  function readText(resource: OralResource) {
    if (!resource.language.toLowerCase().startsWith('fr')) {
      setNotice('La lecture vocale intégrée est disponible en français seulement. Importez un enregistrement dans la langue de cette ressource.');
      return;
    }
    if (!speechApiAvailable || !localFrenchVoice) {
      setNotice('Aucune voix française locale n’est installée sur cet appareil. Importez un fichier audio pour écouter cette ressource hors connexion.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(resource.text);
    utterance.voice = localFrenchVoice;
    utterance.lang = localFrenchVoice.lang || 'fr-FR';
    utterance.rate = resource.kind === 'conte' ? 0.88 : 0.92;
    utterance.onstart = () => setNotice('Lecture vocale en cours (voix de synthèse, non chantée).');
    utterance.onend = () => setNotice('');
    utterance.onerror = () => setNotice('La voix de synthèse n’est pas disponible. Importez un audio local pour cette ressource.');
    window.speechSynthesis.speak(utterance);
  }

  function stopReading() {
    if (speechApiAvailable) window.speechSynthesis.cancel();
    setNotice('Lecture arrêtée.');
  }

  async function handleMediaUpload(mediaKind: OralMediaKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected) return;
    try {
      await saveOralMedia(selected.id, mediaKind, file);
      refreshResources();
      setMediaRevision(value => value + 1);
      setNotice(`${mediaKind === 'audio' ? 'Audio' : 'Vidéo'} enregistré sur cet appareil (${formatFileSize(file.size)}).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’enregistrer ce fichier. Vérifiez l’espace disponible.');
    }
  }

  async function handleDeleteMedia(mediaKind: OralMediaKind) {
    if (!selected || !window.confirm(`Supprimer le fichier ${mediaKind === 'audio' ? 'audio' : 'vidéo'} de cette ressource ?`)) return;
    try {
      await deleteOralMedia(selected.id, mediaKind);
      refreshResources();
      setMediaRevision(value => value + 1);
      if (!selected.text.trim() && (selected.mediaKinds || []).length <= 1) {
        setSelectedId(null);
        setNotice('Le dernier média a été supprimé; la ressource vide a été retirée.');
      } else {
        setNotice('Fichier média supprimé de cet appareil.');
      }
    } catch {
      setNotice('Impossible de supprimer ce fichier média.');
    }
  }

  async function handleDeleteResource(resource: OralResource) {
    if (resource.isBuiltin) return;
    if (!window.confirm(`Supprimer « ${resource.title} » et ses médias locaux ?`)) return;
    try {
      await deleteOralResource(resource.id);
      refreshResources();
      setSelectedId(null);
      setNotice('Ressource supprimée.');
    } catch {
      setNotice('La ressource a été supprimée, mais un média local n’a pas pu être effacé.');
    }
  }

  async function handleSaveResource(input: NewOralResource, files: { audio?: File; video?: File }) {
    let created: OralResource | null = null;
    try {
      const mediaKinds: OralMediaKind[] = [
        ...(files.audio ? ['audio' as const] : []),
        ...(files.video ? ['video' as const] : []),
      ];
      created = createOralResource({ ...input, mediaKinds });
      if (files.audio) await saveOralMedia(created.id, 'audio', files.audio);
      if (files.video) await saveOralMedia(created.id, 'video', files.video);
      refreshResources();
      setShowForm(false);
      setSelectedId(created.id);
      setMediaRevision(value => value + 1);
      setNotice(`Ressource ajoutée sur cet appareil${mediaKinds.length ? ` avec ${mediaKinds.length} média${mediaKinds.length > 1 ? 's' : ''}` : ''}.`);
    } catch (error) {
      if (created) {
        try { await deleteOralResource(created.id); } catch { /* on conserve l’erreur d’origine */ }
      }
      throw error instanceof Error ? error : new Error('Impossible d’enregistrer la ressource.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <SchoolLockBanner />
      <header className="msp-kente bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white px-4 pt-5 pb-7 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-2xl p-3"><Music2 className="w-8 h-8" /></div>
            <div>
              <h1 className="text-xl font-black leading-tight">Poésies, chants, comptines et contes</h1>
              <p className="text-white/85 text-sm">Ressources pour la Maternelle et le Primaire</p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90">
            Lisez, écoutez et préparez vos activités orales. Le principal et les membres de l’équipe peuvent ajouter des ressources texte, audio ou vidéo. Aucun média tiers n’est préinstallé; les fichiers importés restent sur cet appareil et ne se synchronisent pas automatiquement.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-4 space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Rechercher une ressource</span>
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Rechercher un titre, un thème, un mot…"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800"
            >
              <Plus className="h-4 w-4" /> Ajouter une ressource
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {KIND_FILTERS.map(item => (
              <button
                key={item.id}
                onClick={() => setKind(item.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${kind === item.id ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {ORAL_LEVELS.map(item => (
              <button
                key={item}
                onClick={() => setLevel(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${level === item ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-500'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {filtered.length} ressource{filtered.length === 1 ? '' : 's'} · {resources.filter(resource => resource.isBuiltin).length} ressources intégrées
          </p>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <h2 className="font-bold text-blue-950">Transfert manuel téléphone ↔ PC</h2>
          <p className="mt-1 text-sm text-blue-900">Exportez vos ressources personnelles dans un ZIP, copiez-le par câble USB, Bluetooth ou un autre moyen, puis importez-le sur le second appareil. Les textes et leurs fichiers audio/vidéo sont inclus; l’import fusionne les ressources sans effacer celles déjà présentes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={exportTransfer} disabled={transferBusy || resources.filter(resource => !resource.isBuiltin).length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              <Download className="h-4 w-4" /> {transferBusy ? 'Préparation…' : 'Exporter mes ressources'}
            </button>
            <button type="button" onClick={() => transferInput.current?.click()} disabled={transferBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-800 disabled:opacity-50">
              <Upload className="h-4 w-4" /> Importer et fusionner
            </button>
            <input ref={transferInput} type="file" accept=".zip,application/zip" onChange={importTransfer} className="hidden" />
          </div>
          <p className="mt-2 text-xs text-blue-800">Aucune synchronisation automatique. Ce transfert ne comprend pas les codes d’abonnement, les codes équipe ni les données des élèves.</p>
        </section>

        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Fermer le message"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map(resource => (
            <article key={resource.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  {kindIcon(resource.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">{ORAL_KIND_LABELS[resource.kind]}</span>
                  <h2 className="mt-0.5 font-bold leading-snug text-slate-900">{resource.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{resource.level} · {resource.theme} · {resource.duration}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{resource.text || 'Ressource audio/vidéo — ouvrez-la pour lire le média local.'}</p>
              {resource.mediaKinds && resource.mediaKinds.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {resource.mediaKinds.map(mediaKind => <span key={mediaKind} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{mediaKind === 'audio' ? 'Audio' : 'Vidéo'}</span>)}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">{resource.isBuiltin ? 'Ressource incluse hors connexion' : `Ajouté sur cet appareil · ${resource.author}`}</span>
                <button onClick={() => { setSelectedId(resource.id); setNotice(''); }} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white">
                  Ouvrir
                </button>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 font-semibold text-slate-700">Aucune ressource trouvée</p>
            <p className="mt-1 text-sm text-slate-500">Modifiez la recherche ou ajoutez votre propre texte.</p>
          </div>
        )}
      </main>

      {showForm && <OralResourceForm onClose={() => setShowForm(false)} onSave={handleSaveResource} />}
      {selected && (
        <ResourceDetail
          resource={selected}
          media={media}
          speechAvailable={selectedSpeechAvailable}
          audioInput={audioInput}
          videoInput={videoInput}
          onRead={() => readText(selected)}
          onStop={stopReading}
          onUpload={(mediaKind, event) => handleMediaUpload(mediaKind, event)}
          onDeleteMedia={mediaKind => handleDeleteMedia(mediaKind)}
          onDelete={() => handleDeleteResource(selected)}
          onClose={() => { stopReading(); setSelectedId(null); setNotice(''); }}
        />
      )}
    </div>
  );
}

function ResourceDetail({
  resource, media, speechAvailable, audioInput, videoInput, onRead, onStop, onUpload, onDeleteMedia, onDelete, onClose,
}: {
  resource: OralResource;
  media: { loading: boolean; audioUrl?: string; audioName?: string; audioSize?: number; videoUrl?: string; videoName?: string; videoSize?: number };
  speechAvailable: boolean;
  audioInput: RefObject<HTMLInputElement | null>;
  videoInput: RefObject<HTMLInputElement | null>;
  onRead: () => void;
  onStop: () => void;
  onUpload: (kind: OralMediaKind, event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteMedia: (kind: OralMediaKind) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="oral-resource-title" className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        <header className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">{kindIcon(resource.kind)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{ORAL_KIND_LABELS[resource.kind]} · {resource.level}</p>
            <h2 id="oral-resource-title" className="mt-1 text-lg font-black text-slate-900">{resource.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{resource.theme} · {resource.language} · {resource.duration} · {resource.author}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6">
          {resource.objective && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Objectif :</strong> {resource.objective}</p>
          )}
          {resource.text.trim() ? (
            <div className="rounded-2xl bg-slate-50 px-5 py-6 sm:px-8">
              <p className="whitespace-pre-wrap font-serif text-lg leading-9 text-slate-800 sm:text-xl">{resource.text}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Cette ressource est ajoutée en média seul. Importez le fichier sur cet appareil pour le lire hors connexion.</p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-800"><Headphones className="h-5 w-5 text-violet-700" /> Audio</h3>
              {media.loading ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : media.audioUrl ? (
                <div className="mt-3 space-y-2">
                  <audio className="w-full" controls preload="metadata" src={media.audioUrl}>Votre navigateur ne peut pas lire cet audio.</audio>
                  <p className="break-all text-xs text-slate-500">{media.audioName} {media.audioSize ? `· ${formatFileSize(media.audioSize)}` : ''}</p>
                  <div className="flex gap-4">
                    <button onClick={() => audioInput.current?.click()} className="text-xs font-semibold text-violet-700">Remplacer l’audio</button>
                    <button onClick={() => onDeleteMedia('audio')} className="text-xs font-semibold text-red-600">Supprimer</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs leading-relaxed text-slate-500">{resource.text.trim() ? 'Aucun fichier audio ajouté. Importez un enregistrement local ou utilisez la lecture vocale française hors ligne si une voix locale est installée.' : 'Aucun audio n’est encore associé à cette ressource.'}</p>
                  {resource.text.trim() && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={onRead} disabled={!speechAvailable} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Volume2 className="h-4 w-4" /> Lire le texte</button>
                      {speechAvailable && <button onClick={onStop} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Arrêter</button>}
                    </div>
                  )}
                  {resource.text.trim() && !speechAvailable && <p className="text-[11px] text-amber-700">Aucune voix française hors ligne n’est installée ou disponible sur cet appareil.</p>}
                  <button onClick={() => audioInput.current?.click()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700"><Upload className="h-4 w-4" /> Importer un audio</button>
                  <p className="text-[11px] text-slate-400">MP3, WAV, OGG, M4A, AAC, OPUS, FLAC · 50 Mo maximum</p>
                </div>
              )}
              <input ref={audioInput} className="hidden" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.opus,.flac" onChange={event => onUpload('audio', event)} />
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-800"><Video className="h-5 w-5 text-fuchsia-700" /> Vidéo</h3>
              {media.loading ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : media.videoUrl ? (
                <div className="mt-3 space-y-2">
                  <video className="max-h-64 w-full rounded-xl bg-black" controls playsInline preload="metadata" src={media.videoUrl}>Votre navigateur ne peut pas lire cette vidéo.</video>
                  <p className="break-all text-xs text-slate-500">{media.videoName} {media.videoSize ? `· ${formatFileSize(media.videoSize)}` : ''}</p>
                  <div className="flex gap-4">
                    <button onClick={() => videoInput.current?.click()} className="text-xs font-semibold text-violet-700">Remplacer la vidéo</button>
                    <button onClick={() => onDeleteMedia('video')} className="text-xs font-semibold text-red-600">Supprimer</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs leading-relaxed text-slate-500">Importez une vidéo depuis votre appareil pour la conserver et la lire hors connexion.</p>
                  <button onClick={() => videoInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800"><Upload className="h-4 w-4" /> Importer une vidéo</button>
                  <p className="text-[11px] text-slate-400">MP4, WebM, MOV, M4V, OGV, 3GP · 50 Mo maximum · aucun lien externe requis</p>
                </div>
              )}
              <input ref={videoInput} className="hidden" type="file" accept="video/*,.mp4,.webm,.mov,.m4v,.ogv,.3gp" onChange={event => onUpload('video', event)} />
            </section>
          </div>

          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800">
            <strong>Hors connexion :</strong> les textes sont intégrés à l’application. Les fichiers audio/vidéo importés sont stockés localement dans ce navigateur; ils ne sont pas envoyés sur un serveur. Conservez aussi une copie originale de vos médias.
          </p>
          {resource.isBuiltin && <p className="mt-2 text-[11px] text-slate-400">Ressource intégrée hors connexion; vérifiez les variantes locales et les droits avant tout partage d’un média ajouté.</p>}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 p-3 sm:p-4">
          {!resource.isBuiltin ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Supprimer</button>
          ) : <span className="text-xs text-slate-400">Ressource intégrée</span>}
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white">Fermer</button>
        </footer>
      </section>
    </div>
  );
}

function OralResourceForm({ onClose, onSave }: {
  onClose: () => void;
  onSave: (resource: NewOralResource, files: { audio?: File; video?: File }) => Promise<void>;
}) {
  const [draft, setDraft] = useState<NewOralResource>({
    title: '', kind: 'poesie', level: 'Maternelle', language: 'Français', theme: '', duration: '',
    objective: '', text: '', author: defaultContributorName(),
  });
  const [audioFile, setAudioFile] = useState<File | undefined>();
  const [videoFile, setVideoFile] = useState<File | undefined>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function update<K extends keyof NewOralResource>(key: K, value: NewOralResource[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  function selectMedia(kind: OralMediaKind, file?: File) {
    if (!file) return;
    const validation = validateOralMediaFile(file, kind);
    if (validation) {
      if (kind === 'audio') setAudioFile(undefined);
      else setVideoFile(undefined);
      setError(validation);
      return;
    }
    setError('');
    if (kind === 'audio') setAudioFile(file);
    else setVideoFile(file);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (!draft.text.trim() && !audioFile && !videoFile) {
      setError('Ajoutez un texte, un audio ou une vidéo (au moins un contenu).');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...draft, mediaKinds: [
        ...(audioFile ? ['audio' as const] : []),
        ...(videoFile ? ['video' as const] : []),
      ] }, { audio: audioFile, video: videoFile });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la ressource.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Bibliothèque locale — principal et équipe</p><h2 className="text-lg font-black text-slate-900">Ajouter une ressource</h2></div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 rounded-lg bg-violet-50 p-3 text-xs leading-relaxed text-violet-900">Ajoutez un texte, un audio, une vidéo ou plusieurs formats ensemble. Pour copier vos ressources et leurs médias vers un autre appareil, utilisez l’export ZIP puis « Importer et fusionner ».</p>
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Titre *<input value={draft.title} onChange={event => update('title', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" required maxLength={120} /></label>
          <label className="text-sm font-semibold text-slate-700">Type<select value={draft.kind} onChange={event => update('kind', event.target.value as OralResourceKind)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal">{Object.entries(ORAL_KIND_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Niveau<select value={draft.level} onChange={event => update('level', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal">{ORAL_LEVELS.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Langue<input value={draft.language} onChange={event => update('language', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Français, Fon…" maxLength={40} /></label>
          <label className="text-sm font-semibold text-slate-700">Thème<input value={draft.theme} onChange={event => update('theme', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Nature, famille…" maxLength={60} /></label>
          <label className="text-sm font-semibold text-slate-700">Durée estimée<input value={draft.duration} onChange={event => update('duration', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="2 min" maxLength={20} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Objectif pédagogique<input value={draft.objective} onChange={event => update('objective', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" maxLength={200} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Auteur ou contributeur<input value={draft.author} onChange={event => update('author', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Nom de l’auteur ou membre équipe" maxLength={100} /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Texte / paroles (facultatif si un média est joint)<textarea value={draft.text} onChange={event => update('text', event.target.value)} className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 p-3 font-normal leading-relaxed" maxLength={12000} placeholder="Saisissez ou collez le texte…" /></label>
          <label className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">Audio (facultatif)
            <input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.opus,.flac" onChange={event => { selectMedia('audio', event.target.files?.[0]); event.currentTarget.value = ''; }} className="mt-2 block w-full text-xs font-normal" />
            {audioFile && <span className="mt-1 block truncate text-xs font-normal text-violet-700">{audioFile.name} · {formatFileSize(audioFile.size)}</span>}
          </label>
          <label className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">Vidéo (facultatif)
            <input type="file" accept="video/*,.mp4,.webm,.mov,.m4v,.ogv,.3gp" onChange={event => { selectMedia('video', event.target.files?.[0]); event.currentTarget.value = ''; }} className="mt-2 block w-full text-xs font-normal" />
            {videoFile && <span className="mt-1 block truncate text-xs font-normal text-violet-700">{videoFile.name} · {formatFileSize(videoFile.size)}</span>}
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Formats courants · {formatFileSize(ORAL_MEDIA_MAX_BYTES)} maximum par fichier · utilisez seulement les médias que vous avez le droit de partager.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-violet-700 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer la ressource'}</button>
        </div>
      </form>
    </div>
  );
}
