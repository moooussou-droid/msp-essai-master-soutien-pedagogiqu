import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  BookOpen, Check, CloudDownload, CloudUpload, FileText, Headphones,
  KeyRound, Loader2, Music2, RefreshCw, Search, ShieldCheck, Trash2,
  Video, Wifi, WifiOff, X,
} from 'lucide-react';
import { hasAdminRole } from '../utils/adminSession';
import { getAIGatewaySession, openAIGatewaySession } from '../utils/aiGateway';
import type { AIGatewaySession } from '../utils/aiGateway';
import { formatFileSize } from '../utils/resourcesDB';
import {
  deleteCachedPublishedOralFile, downloadPublishedOralFile,
  getCachedPublishedOralFile, loadCachedPublishedOralCatalog,
  ORAL_CLOUD_LIMITS, publicOralResourceUrl, publishOralResourceToCloud,
  removeOralResourceFromCloud, syncPublishedOralCatalog,
} from '../utils/oralResourcesCloud';
import type { OralPublishDraft, PublishedOralCatalog, PublishedOralKind, PublishedOralResource } from '../utils/oralResourcesCloud';

const KIND_FILTERS: { id: PublishedOralKind | 'tout'; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'poesie', label: 'Poésies' },
  { id: 'chant', label: 'Chants' },
  { id: 'comptine', label: 'Comptines' },
  { id: 'conte', label: 'Contes' },
];
const KIND_LABELS: Record<PublishedOralKind, string> = {
  poesie: 'Poésie', chant: 'Chant', comptine: 'Comptine', conte: 'Conte',
};
const LEVELS = ['Maternelle', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'Tous niveaux'];
const INITIAL_DRAFT: OralPublishDraft = {
  title: '', kind: 'poesie', level: 'Tous niveaux', language: 'Français',
  theme: '', duration: '', objective: '', author: '',
};

type PreviewState = { loading: boolean; url?: string; text?: string; cached: boolean; error?: string };

function fileIcon(resource: PublishedOralResource) {
  const extension = resource.file.fileName.split('.').pop()?.toLowerCase();
  if (extension === 'mp3') return <Headphones className="h-5 w-5" />;
  if (extension === 'mp4') return <Video className="h-5 w-5" />;
  if (extension === 'pdf' || extension === 'txt' || extension === 'doc' || extension === 'docx') return <FileText className="h-5 w-5" />;
  return <BookOpen className="h-5 w-5" />;
}

function searchableText(resource: PublishedOralResource): string {
  return [resource.title, resource.kind, resource.level, resource.language, resource.theme,
    resource.objective, resource.author, resource.file.fileName].join(' ').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function PublishedOralResourcesPanel() {
  const canPublish = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const [catalog, setCatalog] = useState<PublishedOralCatalog>(() => loadCachedPublishedOralCatalog());
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<PublishedOralKind | 'tout'>('tout');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState<AIGatewaySession | null>(null);
  const [adminCode, setAdminCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [draft, setDraft] = useState<OralPublishDraft>(INITIAL_DRAFT);
  const [file, setFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState('');
  const [selected, setSelected] = useState<PublishedOralResource | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ loading: false, cached: false });
  const [previewRevision, setPreviewRevision] = useState(0);
  const [downloadingId, setDownloadingId] = useState('');
  const [cachedIds, setCachedIds] = useState<Set<string>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const resources = catalog.resources;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return resources.filter((resource) => (kind === 'tout' || resource.kind === kind)
      && (!q || searchableText(resource).includes(q)));
  }, [resources, query, kind]);

  async function syncCatalog(showMessage = true) {
    if (!navigator.onLine) {
      setCatalog(loadCachedPublishedOralCatalog());
      if (showMessage) setNotice('Hors connexion : affichage du dernier catalogue synchronisé.');
      return;
    }
    setSyncing(true);
    try {
      const next = await syncPublishedOralCatalog();
      setCatalog(next);
      if (showMessage) setNotice(`Catalogue actualisé : ${next.resources.length} ressource${next.resources.length === 1 ? '' : 's'} publiée${next.resources.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setCatalog(loadCachedPublishedOralCatalog());
      if (showMessage) setNotice(error instanceof Error ? `${error.message} Affichage des ressources déjà synchronisées.` : 'Synchronisation impossible; affichage du dernier catalogue enregistré.');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void syncCatalog(false);
    if (canPublish) {
      getAIGatewaySession().then(setSession).catch(() => setSession(null));
    }
    const onOnline = () => { setOnline(true); void syncCatalog(true); };
    const onOffline = () => { setOnline(false); setCatalog(loadCachedPublishedOralCatalog()); setNotice('Hors connexion : les ressources déjà téléchargées restent accessibles.'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [canPublish]);

  useEffect(() => {
    let active = true;
    Promise.all(resources.map(async (resource) => ({ id: resource.id, cached: Boolean(await getCachedPublishedOralFile(resource)) })))
      .then((results) => { if (active) setCachedIds(new Set(results.filter((item) => item.cached).map((item) => item.id))); })
      .catch(() => { if (active) setCachedIds(new Set()); });
    return () => { active = false; };
  }, [catalog.version, previewRevision]);

  useEffect(() => {
    if (!selected) {
      setPreview({ loading: false, cached: false });
      return;
    }
    let active = true;
    let objectUrl = '';
    setPreview({ loading: true, cached: false });
    (async () => {
      const cached = await getCachedPublishedOralFile(selected);
      if (!active) return;
      let url: string;
      if (cached?.blob) {
        url = URL.createObjectURL(cached.blob);
        objectUrl = url;
      } else {
        if (!navigator.onLine) {
          setPreview({ loading: false, cached: false, error: 'Ce fichier n’a pas encore été téléchargé pour une consultation hors connexion.' });
          return;
        }
        url = publicOralResourceUrl(selected);
      }
      const extension = selected.file.fileName.split('.').pop()?.toLowerCase();
      if (extension === 'txt') {
        let text = '';
        try {
          text = cached?.blob ? await cached.blob.text() : await (await fetch(url, { credentials: 'omit' })).text();
        } catch { /* l’utilisateur peut télécharger pour hors connexion */ }
        if (!active) return;
        setPreview({ loading: false, url, text, cached: Boolean(cached) });
      } else {
        setPreview({ loading: false, url, cached: Boolean(cached) });
      }
    })().catch((error) => {
      if (active) setPreview({ loading: false, cached: false, error: error instanceof Error ? error.message : 'Impossible d’ouvrir le fichier.' });
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected?.id, selected?.file.path, online, previewRevision]);

  async function loginAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminCode.trim()) { setNotice('Saisissez le code IA administrateur.'); return; }
    setAuthBusy(true);
    setNotice('');
    try {
      const next = await openAIGatewaySession(adminCode.trim());
      setAdminCode('');
      setSession(next);
      if (next.role !== 'principal' && next.role !== 'team') {
        setNotice('Ce code n’a pas le rôle requis pour publier des ressources.');
      } else {
        setNotice(`Session de publication activée${next.displayName ? ` pour ${next.displayName}` : ''}.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Connexion administrateur impossible.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitPublication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setNotice('Choisissez un fichier avant de publier.'); return; }
    if (session?.role !== 'principal' && session?.role !== 'team') {
      setNotice('Connectez-vous avec un code IA administrateur principal ou équipe pour publier.');
      return;
    }
    setPublishing(true);
    setNotice('');
    try {
      const published = await publishOralResourceToCloud(draft, file, setProgress);
      setDraft(INITIAL_DRAFT);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await syncCatalog(false);
      setNotice(`« ${published.title} » est publié et visible dans la bibliothèque des utilisateurs.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Publication impossible.');
    } finally {
      setPublishing(false);
      setProgress('');
    }
  }

  async function downloadForOffline(resource: PublishedOralResource) {
    if (!navigator.onLine) { setNotice('Connectez-vous à Internet pour télécharger cette ressource.'); return; }
    setDownloadingId(resource.id);
    setNotice('');
    try {
      await downloadPublishedOralFile(resource);
      setCachedIds((current) => new Set(current).add(resource.id));
      setPreviewRevision((value) => value + 1);
      setNotice(`« ${resource.title} » est téléchargé sur cet appareil et pourra être consulté hors connexion.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Téléchargement hors connexion impossible.');
    } finally {
      setDownloadingId('');
    }
  }

  async function removeOffline(resource: PublishedOralResource) {
    if (!window.confirm(`Retirer la copie hors connexion de « ${resource.title} » sur cet appareil ?`)) return;
    try {
      await deleteCachedPublishedOralFile(resource);
      setCachedIds((current) => { const next = new Set(current); next.delete(resource.id); return next; });
      setPreviewRevision((value) => value + 1);
      setNotice('Copie hors connexion retirée de cet appareil. La publication reste disponible en ligne.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Suppression locale impossible.'); }
  }

  async function unpublish(resource: PublishedOralResource) {
    if (!window.confirm(`Retirer « ${resource.title} » du catalogue public ? Les utilisateurs ne la verront plus après leur prochaine synchronisation.`)) return;
    try {
      await removeOralResourceFromCloud(resource);
      await syncCatalog(false);
      setNotice(`« ${resource.title} » a été retiré du catalogue public.`);
      if (selected?.id === resource.id) setSelected(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Retrait de la publication impossible.'); }
  }

  function updateDraft<K extends keyof OralPublishDraft>(key: K, value: OralPublishDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><Music2 className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-slate-900">Bibliothèque publiée par MSP</h2>
          <p className="mt-1 text-sm text-slate-600">Poésies, chants, contes et comptines diffusés par l’administration aux utilisateurs.</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${online ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>

      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une publication" className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm" />
        </label>
        <button onClick={() => void syncCatalog(true)} disabled={syncing || !online} aria-label="Actualiser les publications" className="rounded-xl border border-slate-200 px-3 text-violet-700 disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {KIND_FILTERS.map((filter) => (
          <button key={filter.id} onClick={() => setKind(filter.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${kind === filter.id ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{filter.label}</button>
        ))}
      </div>

      {notice && <div role="status" className="flex items-start justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fermer le message"><X className="h-4 w-4" /></button></div>}

      {syncing && resources.length === 0 && <p className="text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Recherche des dernières publications…</p>}
      <p className="text-xs text-slate-500">{filtered.length} publication{filtered.length === 1 ? '' : 's'} · Catalogue vérifié à l’ouverture et au retour en ligne; aucune vérification périodique. Utilisez ↻ pour l’actualiser manuellement.</p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">{resources.length ? 'Aucun résultat pour cette recherche.' : 'Aucune ressource publiée pour le moment.'}</p>
          <p className="mt-1 text-xs text-slate-500">Les publications de l’administration apparaîtront ici après synchronisation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((resource) => (
            <article key={resource.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2.5 text-violet-700 shadow-sm">{fileIcon(resource)}</div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">{KIND_LABELS[resource.kind]} · {resource.file.fileName.split('.').pop()?.toUpperCase()}</span>
                  <h3 className="mt-0.5 font-bold leading-snug text-slate-900">{resource.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{resource.level} · {resource.language}{resource.theme ? ` · ${resource.theme}` : ''}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{resource.author} · {formatFileSize(resource.file.size)}</p>
                </div>
              </div>
              {resource.objective && <p className="mt-2 text-xs leading-relaxed text-slate-600">{resource.objective}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { setSelected(resource); setNotice(''); }} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white">Ouvrir / lire</button>
                <button onClick={() => void downloadForOffline(resource)} disabled={!online || downloadingId === resource.id || cachedIds.has(resource.id)} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 disabled:opacity-50">
                  {downloadingId === resource.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cachedIds.has(resource.id) ? <Check className="h-3.5 w-3.5" /> : <CloudDownload className="h-3.5 w-3.5" />}
                  {cachedIds.has(resource.id) ? 'Disponible hors ligne' : downloadingId === resource.id ? 'Téléchargement…' : 'Télécharger hors ligne'}
                </button>
                {cachedIds.has(resource.id) && <button onClick={() => void removeOffline(resource)} className="rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-white">Retirer la copie</button>}
                {canPublish && <button onClick={() => void unpublish(resource)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Retirer</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {canPublish && (
        <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-3" open={resources.length === 0}>
          <summary className="cursor-pointer list-none font-bold text-emerald-950 flex items-center gap-2"><CloudUpload className="h-5 w-5" /> Espace de publication administrateur</summary>
          <p className="mt-2 text-xs leading-relaxed text-emerald-900">Les fichiers sont publiés dans la seule bibliothèque des arts oraux; les autres ressources et les données des élèves ne sont pas synchronisées ici. Formats MP3, MP4, TXT, DOC/DOCX et PDF · 45 Mo maximum par fichier. La publication nécessite le déploiement avec l’API Vercel et la migration Supabase.</p>
          {session?.role === 'principal' || session?.role === 'team' ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-white/80 p-3 text-sm text-emerald-950"><ShieldCheck className="h-4 w-4 shrink-0" />Session administrateur active{session.displayName ? ` : ${session.displayName}` : ''}.</p>
          ) : (
            <form onSubmit={(event) => void loginAdmin(event)} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="oral-admin-code">Code IA administrateur</label>
              <input id="oral-admin-code" type="password" autoComplete="off" value={adminCode} onChange={(event) => setAdminCode(event.target.value)} placeholder="Code IA administrateur" className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2.5 text-sm" />
              <button disabled={authBusy || !adminCode.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{authBusy ? 'Vérification…' : 'Activer la publication'}</button>
            </form>
          )}
          <form onSubmit={(event) => void submitPublication(event)} className="mt-4 space-y-3 border-t border-emerald-200 pt-4">
            <h3 className="font-bold text-emerald-950">Nouvelle publication</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Titre *<input required maxLength={180} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" placeholder="Titre de la ressource" /></label>
              <label className="text-xs font-semibold text-slate-700">Type *<select value={draft.kind} onChange={(event) => updateDraft('kind', event.target.value as PublishedOralKind)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal">{KIND_FILTERS.filter((item) => item.id !== 'tout').map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-700">Classe / niveau<select value={draft.level} onChange={(event) => updateDraft('level', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal">{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-700">Langue<input required maxLength={50} value={draft.language} onChange={(event) => updateDraft('language', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-semibold text-slate-700">Thème<input maxLength={100} value={draft.theme} onChange={(event) => updateDraft('theme', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" placeholder="Nature, école…" /></label>
              <label className="text-xs font-semibold text-slate-700">Durée<input maxLength={30} value={draft.duration} onChange={(event) => updateDraft('duration', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" placeholder="2 min" /></label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Auteur ou contributeur *<input required maxLength={120} value={draft.author} onChange={(event) => updateDraft('author', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" placeholder="Nom de l’auteur ou source" /></label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Objectif / description<input maxLength={300} value={draft.objective} onChange={(event) => updateDraft('objective', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" placeholder="Quelques mots pour présenter la ressource" /></label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Fichier à publier *
                <input ref={fileInput} required type="file" accept=".mp3,.mp4,.txt,.doc,.docx,.pdf,audio/mpeg,video/mp4,text/plain,application/msword,application/pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] || null); setNotice(''); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-normal" />
                <span className="mt-1 block text-[10px] font-normal text-slate-500">{file ? `${file.name} · ${formatFileSize(file.size)}` : `MP3, MP4, TXT, DOC/DOCX ou PDF · ${formatFileSize(ORAL_CLOUD_LIMITS.fileBytes)} maximum`}</span>
              </label>
            </div>
            {progress && <p role="status" className="text-xs font-semibold text-emerald-800">{progress}</p>}
            <button type="submit" disabled={publishing || !file || !(session?.role === 'principal' || session?.role === 'team')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}{publishing ? 'Publication en cours…' : 'Publier pour les utilisateurs'}
            </button>
          </form>
        </details>
      )}

      <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">Les publications restent publiques et accessibles à tous les utilisateurs de l’application. Pour les utiliser sans réseau, téléchargez chaque fichier sur l’appareil. Les copies hors ligne utilisent l’espace de stockage du navigateur.</p>

      {selected && (
        <OralPublicationPreview
          resource={selected}
          preview={preview}
          onClose={() => setSelected(null)}
          onDownload={() => void downloadForOffline(selected)}
          downloading={downloadingId === selected.id}
          cached={cachedIds.has(selected.id) || preview.cached}
        />
      )}
    </section>
  );
}

function OralPublicationPreview({
  resource, preview, onClose, onDownload, downloading, cached,
}: {
  resource: PublishedOralResource;
  preview: PreviewState;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
  cached: boolean;
}) {
  const extension = resource.file.fileName.split('.').pop()?.toLowerCase();
  const downloadUrl = preview.url || publicOralResourceUrl(resource);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={resource.title}>
      <section className="max-h-[95vh] w-full max-w-3xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-slate-200 p-3 sm:p-4">
          <div className="text-violet-700">{fileIcon(resource)}</div>
          <div className="min-w-0 flex-1"><h2 className="truncate font-bold text-slate-900">{resource.title}</h2><p className="text-xs text-slate-500">{KIND_LABELS[resource.kind]} · {resource.file.fileName} · {resource.level}</p></div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[70vh] overflow-auto bg-slate-100 p-3 sm:p-5">
          {preview.loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Ouverture du fichier…</div>
            : preview.error ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{preview.error}</p>
              : extension === 'mp3' && preview.url ? <div className="rounded-xl bg-white p-5 text-center"><Headphones className="mx-auto mb-3 h-10 w-10 text-violet-700" /><p className="mb-4 font-semibold text-slate-800">{resource.title}</p><audio controls preload="metadata" src={preview.url} className="w-full" /></div>
                : extension === 'mp4' && preview.url ? <video controls playsInline preload="metadata" src={preview.url} className="mx-auto max-h-[65vh] w-full rounded-xl bg-black" />
                  : extension === 'txt' ? <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-800">{preview.text || 'Aucun texte à afficher. Téléchargez le fichier pour le consulter.'}</pre>
                    : extension === 'pdf' && preview.url ? <iframe title={resource.title} src={preview.url} className="h-[65vh] w-full rounded-xl bg-white" />
                      : <div className="rounded-xl bg-white p-6 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-violet-700" /><p className="font-bold text-slate-900">Document Word</p><p className="mt-1 text-sm text-slate-600">Téléchargez le fichier DOC/DOCX pour l’ouvrir dans une application compatible.</p>{preview.url && <a href={downloadUrl} download={resource.file.fileName} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white">Télécharger le document</a>}</div>}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3">
          <p className="text-xs text-slate-500">{cached ? 'Copie conservée hors connexion sur cet appareil.' : `${formatFileSize(resource.file.size)} · nécessite une connexion pour la première lecture.`}</p>
          <div className="flex gap-2">
            {!cached && <button onClick={onDownload} disabled={downloading || !navigator.onLine} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}{downloading ? 'Téléchargement…' : 'Garder hors ligne'}</button>}
            {cached && preview.url && extension !== 'mp3' && extension !== 'mp4' && <a href={preview.url} download={resource.file.fileName} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Enregistrer le fichier</a>}
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Fermer</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
