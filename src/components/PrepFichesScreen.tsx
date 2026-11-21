import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSmartBack } from '../utils/useSmartBack';
import { Link } from 'react-router-dom';
import { hasAdminRole } from '../utils/adminSession';
import {
  ChevronLeft, ChevronRight, Download, FileText, Sparkles, Lock, CheckCircle2,
  Search, GraduationCap, BookOpen, X, Phone, MessageCircle, Upload, Loader2,
  Cloud, CloudDownload, RefreshCw,
} from 'lucide-react';
import {
  PrepFiche, getPublishedPrepFiches, groupByClasse, personalizationPrice,
  PREP_FICHE_PUBLISHER_ID, PRICE_PER_PAGE, DEFAULT_WATERMARK, downloadFichePdf, ficheContentId,
  getUserWatermark, setUserWatermark,
} from '../utils/prepFiches';
import {
  isUnlocked, recordPaymentRequest, redeemUnlockCode, getPaymentContact,
  whatsappLink, paymentMessage, getDeviceId, isContactConfigured,
} from '../utils/coursePayment';
import {
  formatPrepFicheTransferSize, importPrepFichesArchive,
} from '../utils/prepFicheTransfer';
import {
  downloadPublishedPrepFicheFromCloud, invalidatePrepFicheCloudCache,
  isCloudPublishedPrepFicheCurrent, loadCachedPublishedPrepFicheCatalog,
  syncPublishedPrepFicheCatalogFromCloud,
} from '../utils/prepFicheCloudSync';
import type { CloudFicheDescriptor, CloudManifest } from '../utils/prepFicheCloudSync';

interface PrepFicheListItem extends PrepFiche {
  cloudDescriptor?: CloudFicheDescriptor;
  cloudNeedsDownload?: boolean;
}

export default function PrepFichesScreen({ trialMode = false }: { trialMode?: boolean }) {
  const goBack = useSmartBack();
  const canManage = hasAdminRole('Super Administrateur', 'Responsable Ressources');

  const [fiches, setFiches] = useState<PrepFiche[]>([]);
  const [cloudCatalog, setCloudCatalog] = useState<CloudManifest | null>(() => loadCachedPublishedPrepFicheCatalog());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [customizeFor, setCustomizeFor] = useState<PrepFiche | null>(null);
  const [unlockTick, setUnlockTick] = useState(0);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferNotice, setTransferNotice] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [cloudNotice, setCloudNotice] = useState(() => {
    const cached = loadCachedPublishedPrepFicheCatalog();
    return cached
      ? `Catalogue conservé sur cet appareil (${cached.fiches.length} fiche(s)). Les pages se téléchargent uniquement à la demande.`
      : 'Catalogue non chargé. Connectez-vous puis appuyez sur « Charger le catalogue »; les pages ne seront pas téléchargées automatiquement.';
  });
  const transferInput = useRef<HTMLInputElement>(null);
  const cloudSyncInFlight = useRef(false);
  const cloudDownloadsInFlight = useRef(new Set<string>());

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(typeof navigator === 'undefined' || navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setFiches(await getPublishedPrepFiches());
    } finally {
      setLoading(false);
    }
  }

  async function synchronizeCloud() {
    if (cloudSyncInFlight.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCloudNotice('Hors connexion : le catalogue déjà enregistré et les fiches téléchargées restent disponibles sur cet appareil.');
      return;
    }
    cloudSyncInFlight.current = true;
    setCloudBusy(true);
    try {
      const result = await syncPublishedPrepFicheCatalogFromCloud();
      setCloudCatalog(result.catalog);
      if (result.updated) {
        setCloudNotice(result.fiches
          ? `Catalogue mis à jour : ${result.fiches} fiche(s) listée(s). Aucune page n’a été téléchargée; choisissez les fiches à enregistrer hors connexion.`
          : 'Le catalogue cloud ne contient actuellement aucune fiche publiée.');
      } else if (result.version) {
        setCloudNotice(`Catalogue vérifié : ${result.fiches} fiche(s) listée(s), déjà à jour. Aucune page n’a été téléchargée.`);
      } else {
        setCloudNotice('Aucune publication cloud n’est disponible. Les fiches déjà enregistrées sur cet appareil restent consultables.');
      }
    } catch (error) {
      setCloudNotice(`${error instanceof Error ? error.message : 'Impossible de charger le catalogue cloud.'} Les fiches déjà enregistrées restent disponibles hors connexion.`);
    } finally {
      cloudSyncInFlight.current = false;
      setCloudBusy(false);
    }
  }

  async function downloadCloudFiche(fiche: PrepFicheListItem) {
    if (!fiche.cloudDescriptor || cloudDownloadsInFlight.current.has(fiche.id)) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCloudNotice('Connectez-vous à Internet pour enregistrer cette fiche sur cet appareil.');
      return;
    }
    cloudDownloadsInFlight.current.add(fiche.id);
    setDownloadingId(fiche.id);
    try {
      await downloadPublishedPrepFicheFromCloud(fiche.cloudDescriptor);
      await refresh();
      setCloudNotice(`« ${fiche.titre} » est enregistrée sur cet appareil et pourra être consultée hors connexion.`);
    } catch (error) {
      setCloudNotice(error instanceof Error ? error.message : 'Impossible de télécharger cette fiche.');
    } finally {
      cloudDownloadsInFlight.current.delete(fiche.id);
      setDownloadingId('');
    }
  }

  async function importTransfer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (trialMode) {
      setTransferNotice('L’importation ZIP gratuite des fiches est réservée aux abonnés. Pendant l’essai, la consultation des fiches reste disponible.');
      return;
    }
    setTransferBusy(true);
    setTransferNotice('');
    try {
      const result = await importPrepFichesArchive(file, plan => window.confirm(
        `Importer le paquet de fiches reçu ?\n\n`
        + `• ${plan.added} nouvelle(s) fiche(s)\n`
        + `• ${plan.updated} fiche(s) actualisée(s)\n`
        + `• ${plan.removed} ancienne(s) fiche(s) retirée(s) du paquet\n`
        + `• ${plan.pages} page(s), ${formatPrepFicheTransferSize(plan.totalBytes)}\n\n`
        + 'Cela remplacera le précédent paquet de fiches MSP importé; les autres fiches locales seront conservées.',
      ));
      if (result.cancelled) {
        setTransferNotice('Import annulé; aucune fiche n’a été modifiée.');
        return;
      }
      invalidatePrepFicheCloudCache();
      setCloudCatalog(null);
      setSelectedClasse(null);
      setQuery('');
      await refresh();
      setCloudNotice('Le ZIP a été importé sans requête au cloud. Pour afficher ensuite les fiches en ligne, chargez le catalogue manuellement.');
      setTransferNotice(`Transfert terminé : ${result.added} fiche(s) ajoutée(s), ${result.updated} actualisée(s), ${result.removed} retirée(s). Les fiches sont maintenant disponibles hors connexion sur cet appareil.`);
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : 'Impossible d’importer ce paquet de fiches.');
    } finally {
      setTransferBusy(false);
    }
  }

  const listedFiches = useMemo<PrepFicheListItem[]>(() => {
    if (!cloudCatalog) return fiches;
    const localById = new Map(fiches.map((fiche) => [fiche.id, fiche]));
    const cloudIds = new Set(cloudCatalog.fiches.map((fiche) => fiche.id));
    const cloudItems = cloudCatalog.fiches.map((descriptor): PrepFicheListItem => {
      const local = localById.get(descriptor.id);
      if (!local) {
        return {
          id: descriptor.id,
          classe: descriptor.classe,
          matiere: descriptor.matiere,
          titre: descriptor.titre,
          description: descriptor.description,
          pages: [],
          pageCount: descriptor.pageCount,
          published: true,
          createdAt: descriptor.createdAt,
          updatedAt: descriptor.updatedAt,
          cloudDescriptor: descriptor,
          cloudNeedsDownload: true,
        };
      }
      const officialLocalCopy = local.distribution?.publisherId === PREP_FICHE_PUBLISHER_ID;
      const current = isCloudPublishedPrepFicheCurrent(local, descriptor);
      return {
        ...local,
        classe: descriptor.classe,
        matiere: descriptor.matiere,
        titre: descriptor.titre,
        description: descriptor.description,
        pageCount: descriptor.pageCount,
        createdAt: descriptor.createdAt,
        updatedAt: descriptor.updatedAt,
        cloudDescriptor: descriptor,
        cloudNeedsDownload: officialLocalCopy ? !current : false,
      };
    });
    const localOnly = fiches.filter((fiche) => !cloudIds.has(fiche.id)
      && fiche.distribution?.publisherId !== PREP_FICHE_PUBLISHER_ID);
    return [...cloudItems, ...localOnly].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [fiches, cloudCatalog]);

  const grouped = useMemo(() => groupByClasse(listedFiches), [listedFiches]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return null;
    return listedFiches.filter((f) => {
      const t = `${f.titre} ${f.classe} ${f.matiere} ${f.description || ''}`
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return t.includes(q);
    });
  }, [listedFiches, query]);

  const currentClasse = grouped.find((g) => g.classe === selectedClasse) || null;

  function freeDownload(f: PrepFiche) {
    if (trialMode) return;
    downloadFichePdf(f, DEFAULT_WATERMARK);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => (selectedClasse ? setSelectedClasse(null) : goBack())} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Fiches de préparation Master Soutien Pédagogique</h1>
            <p className="text-emerald-100 text-sm">Catalogue à la demande • fiches enregistrées sur cet appareil pour le hors-ligne</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        {/* Bandeau d'explication */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {trialMode ? (
              <>Pendant l’essai gratuit de 2 h, consultez les fiches; le téléchargement PDF gratuit et l’import ZIP sont réservés aux abonnés. La personnalisation reste proposée à <strong>{PRICE_PER_PAGE} F par page</strong>.</>
            ) : (
              <>Téléchargez gratuitement les fiches de préparation, marquées du filigrane <strong>« Master Soutien Pédagogique »</strong>. Vous pouvez aussi <strong>personnaliser le filigrane</strong> (y mettre votre nom ou votre école) pour <strong>{PRICE_PER_PAGE} F par page</strong>.</>
            )}
          </p>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
          <h2 className="font-bold text-emerald-950 inline-flex items-center gap-2"><Cloud className="w-5 h-5" /> Catalogue cloud à la demande</h2>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900">
            Le catalogue est chargé uniquement lorsque vous appuyez sur le bouton. Ses fiches restent de simples descriptions :
            aucune page n’est transférée avant votre choix. Appuyez ensuite sur « Enregistrer sur cet appareil » pour télécharger
            une fiche; elle restera disponible hors connexion. Le retour en ligne et l’ouverture de l’application ne lancent pas de synchronisation automatique.
          </p>
          <button
            type="button"
            onClick={() => void synchronizeCloud()}
            disabled={cloudBusy || !online}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {cloudBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {cloudBusy ? 'Chargement du catalogue…' : cloudCatalog ? 'Actualiser le catalogue' : 'Charger le catalogue'}
          </button>
          {cloudNotice && <p role="status" className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-emerald-950">{cloudNotice}</p>}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 mb-4">
          <h2 className="font-bold text-blue-950">Transfert ZIP manuel — solution de secours</h2>
          <p className="mt-1 text-sm leading-relaxed text-blue-900">
            Si l’appareil ne peut pas accéder au catalogue cloud, recevez le ZIP de l’administration (par câble USB,
            Bluetooth ou autre transfert manuel), puis importez-le ici. Le paquet reste conservé sur cet appareil
            et consultable hors connexion.
          </p>
          <button
            type="button"
            onClick={() => transferInput.current?.click()}
            disabled={transferBusy || trialMode}
            title={trialMode ? 'Import ZIP réservé aux abonnés.' : undefined}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {transferBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {transferBusy ? 'Importation…' : trialMode ? 'Import ZIP réservé aux abonnés' : 'Importer un ZIP de secours'}
          </button>
          <input ref={transferInput} type="file" accept=".zip,application/zip" onChange={importTransfer} className="hidden" disabled={trialMode || transferBusy} />
          {transferNotice && <p role="status" className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-blue-950">{transferNotice}</p>}
        </section>

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche (titre, classe, matière)…"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Chargement…</div>
        ) : listedFiches.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {cloudCatalog
                ? 'Aucune fiche publiée n’est présente dans ce catalogue.'
                : 'Aucune fiche n’est encore enregistrée sur cet appareil. Chargez le catalogue manuellement ou importez un ZIP de secours.'}
            </p>
          </div>
        ) : searchResults ? (
          <FicheList
            fiches={searchResults}
            onFree={freeDownload}
            onCustomize={setCustomizeFor}
            onCloudDownload={downloadCloudFiche}
            downloadingId={downloadingId}
            online={online}
            unlockTick={unlockTick}
            trialMode={trialMode}
            showMeta
          />
        ) : selectedClasse && currentClasse ? (
          <div>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> {currentClasse.classe}
            </h2>
            {currentClasse.matieres.map((m) => (
              <div key={m.matiere} className="mb-5">
                <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">{m.matiere}</p>
                <FicheList fiches={m.fiches} onFree={freeDownload} onCustomize={setCustomizeFor} onCloudDownload={downloadCloudFiche} downloadingId={downloadingId} online={online} unlockTick={unlockTick} trialMode={trialMode} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {grouped.map((g) => (
              <button
                key={g.classe}
                onClick={() => setSelectedClasse(g.classe)}
                className="bg-white rounded-2xl shadow p-4 text-left hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="font-bold text-gray-800">{g.classe}</p>
                <p className="text-xs text-gray-500">{g.total} fiche(s) • {g.matieres.length} matière(s)</p>
                <span className="text-emerald-600 text-xs font-medium inline-flex items-center gap-1 mt-2">
                  Ouvrir <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {customizeFor && (
        <CustomizeModal
          fiche={customizeFor}
          onClose={() => setCustomizeFor(null)}
          onUnlockChange={() => setUnlockTick((t) => t + 1)}
        />
      )}

      {canManage && <Link to="/admin-fiches-preparation" className="fixed bottom-4 right-4 rounded-full border border-amber-300 bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg">Gestion des fiches</Link>}
    </div>
  );
}

function FicheList({ fiches, onFree, onCustomize, onCloudDownload, downloadingId, online, unlockTick, showMeta, trialMode }: {
  fiches: PrepFicheListItem[];
  onFree: (f: PrepFiche) => void;
  onCustomize: (f: PrepFiche) => void;
  onCloudDownload: (f: PrepFicheListItem) => void;
  downloadingId: string;
  online: boolean;
  unlockTick: number;
  showMeta?: boolean;
  trialMode: boolean;
}) {
  if (fiches.length === 0) {
    return <p className="text-gray-400 text-sm">Aucune fiche.</p>;
  }
  return (
    <div className="space-y-3">
      {fiches.map((f) => {
        const unlocked = isUnlocked(ficheContentId(f.id));
        const hasPages = f.pages.length === f.pageCount && f.pageCount > 0
          && f.pages.every((page) => typeof page.dataUrl === 'string' && page.dataUrl.startsWith('data:image/'));
        const cloudNeedsDownload = Boolean(f.cloudDescriptor && (!hasPages || f.cloudNeedsDownload));
        const staleOnline = Boolean(cloudNeedsDownload && hasPages && online);
        const canUsePages = hasPages && !staleOnline;
        const isDownloading = downloadingId === f.id;
        const cloudBytes = f.cloudDescriptor?.pages.reduce((sum, page) => sum + page.size, 0) || 0;
        void unlockTick; // re-render à chaque déverrouillage
        return (
          <div key={f.id} className="bg-white rounded-2xl shadow p-3 flex gap-3">
            {f.pages[0]?.dataUrl
              ? <img src={f.pages[0].dataUrl} alt="" className="w-16 h-20 object-cover rounded-lg border shrink-0" />
              : <div className="w-16 h-20 rounded-lg border bg-slate-50 text-slate-300 shrink-0 flex items-center justify-center"><BookOpen className="w-7 h-7" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{f.titre}</p>
              {showMeta && <p className="text-xs text-emerald-700">{f.classe} • {f.matiere}</p>}
              {f.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{f.description}</p>}
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <FileText className="w-3 h-3" /> {f.pageCount} page(s){cloudBytes ? ` · ${formatPrepFicheTransferSize(cloudBytes)}` : ''}
              </p>
              {f.cloudDescriptor && (cloudNeedsDownload ? (
                <div className="mt-2">
                  {staleOnline && <p className="text-xs text-amber-800">Une version plus récente est en ligne; la copie précédente reste conservée hors connexion.</p>}
                  {!hasPages && <p className="text-xs text-slate-600">Les pages ne sont pas encore enregistrées sur cet appareil.</p>}
                  <button
                    type="button"
                    onClick={() => onCloudDownload(f)}
                    disabled={!online || isDownloading}
                    title={!online ? 'Connexion Internet requise pour télécharger cette fiche.' : undefined}
                    className="mt-1 inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                    {isDownloading ? 'Téléchargement…' : hasPages ? 'Mettre à jour les pages' : `Enregistrer ${f.pageCount} page(s) sur cet appareil`}
                  </button>
                </div>
              ) : hasPages ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Disponible hors connexion</p>
              ) : null)}
              {staleOnline && <p className="mt-2 text-xs text-slate-500">Mettez à jour la fiche avant de télécharger sa version la plus récente.</p>}
              {canUsePages ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => onFree(f)}
                    disabled={trialMode}
                    title={trialMode ? 'Le téléchargement gratuit est réservé aux abonnés.' : undefined}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1 ${trialMode ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                  >
                    {trialMode ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    {trialMode ? 'Réservé aux abonnés' : 'Télécharger (gratuit)'}
                  </button>
                  <button
                    onClick={() => onCustomize(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1 ${unlocked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {unlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {unlocked ? 'Filigrane personnalisé' : `Personnaliser — ${personalizationPrice(f)} F`}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustomizeModal({ fiche, onClose, onUnlockChange }: {
  fiche: PrepFiche;
  onClose: () => void;
  onUnlockChange: () => void;
}) {
  const contentId = ficheContentId(fiche.id);
  const price = String(personalizationPrice(fiche));
  const [unlocked, setUnlocked] = useState(isUnlocked(contentId));
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [watermark, setWatermark] = useState(getUserWatermark());
  const contact = getPaymentContact();
  const configured = isContactConfigured(contact);

  function requestPayment() {
    recordPaymentRequest(contentId, 'fiche', fiche.titre, price);
    const url = whatsappLink(contact, fiche.titre, price, 'fiche');
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function tryCode() {
    const ok = redeemUnlockCode(contentId, 'fiche', fiche.titre, code);
    if (ok) {
      setUnlocked(true);
      setCodeError('');
      onUnlockChange();
    } else {
      setCodeError('Code de déverrouillage incorrect.');
    }
  }

  function downloadPersonalized() {
    const text = watermark.trim();
    if (!text) {
      alert('Saisissez le texte du filigrane (votre nom ou votre école).');
      return;
    }
    setUserWatermark(text);
    downloadFichePdf(fiche, text);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Personnaliser le filigrane
          </h3>
          <button onClick={onClose} className="p-1 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          <p className="font-semibold text-gray-800">{fiche.titre}</p>
          <p className="text-xs text-gray-500 mb-3">{fiche.classe} • {fiche.matiere} • {fiche.pageCount} page(s)</p>

          {!unlocked ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                <p className="text-sm text-amber-800">{paymentMessage(fiche.titre, price, 'fiche')}</p>
                <p className="text-lg font-bold text-amber-900 mt-2">
                  {price} F <span className="text-xs font-normal">({fiche.pageCount} × {PRICE_PER_PAGE} F)</span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm text-gray-600">
                <p>Votre identifiant à communiquer :</p>
                <p className="font-mono font-bold text-gray-900 text-base">{getDeviceId()}</p>
                {configured ? (
                  <div className="mt-2 space-y-1">
                    <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500" /> {contact.phone}</p>
                    {contact.name && <p className="text-xs text-gray-500">{contact.name}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mt-2">
                    Coordonnées de paiement non encore configurées par l'administrateur.
                  </p>
                )}
              </div>

              {configured && (
                <button
                  onClick={requestPayment}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-3 inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" /> Payer / contacter par WhatsApp
                </button>
              )}

              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Lock className="w-4 h-4" /> J'ai reçu mon code de déverrouillage
                </label>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXX-XXXX"
                    className="flex-1 p-3 border border-gray-300 rounded-lg font-mono uppercase"
                  />
                  <button onClick={tryCode} className="bg-emerald-600 text-white px-4 rounded-lg font-semibold">Valider</button>
                </div>
                {codeError && <p className="text-red-600 text-sm mt-1">{codeError}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm">Personnalisation débloquée pour cette fiche.</p>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texte de votre filigrane</label>
              <input
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder="Votre nom ou votre école"
                className="w-full p-3 border border-gray-300 rounded-lg mb-2"
              />
              <p className="text-xs text-gray-500 mb-3">
                Ce texte remplacera « Master Soutien Pédagogique » sur chaque page.
              </p>
              <button
                onClick={downloadPersonalized}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Télécharger avec mon filigrane
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
