import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSmartBack } from '../utils/useSmartBack';
import { Link } from 'react-router-dom';
import { hasAdminRole } from '../utils/adminSession';
import {
  ChevronLeft, ChevronRight, Download, FileText, Sparkles, Lock, CheckCircle2,
  Search, GraduationCap, BookOpen, X, Phone, MessageCircle, Upload, Loader2, Cloud, RefreshCw,
} from 'lucide-react';
import {
  PrepFiche, getPublishedPrepFiches, groupByClasse, personalizationPrice,
  PRICE_PER_PAGE, DEFAULT_WATERMARK, downloadFichePdf, ficheContentId,
  getUserWatermark, setUserWatermark,
} from '../utils/prepFiches';
import {
  isUnlocked, recordPaymentRequest, redeemUnlockCode, getPaymentContact,
  whatsappLink, paymentMessage, getDeviceId, isContactConfigured,
} from '../utils/coursePayment';
import {
  formatPrepFicheTransferSize, importPrepFichesArchive,
} from '../utils/prepFicheTransfer';
import { invalidatePrepFicheCloudCache, syncPublishedPrepFichesFromCloud } from '../utils/prepFicheCloudSync';

export default function PrepFichesScreen() {
  const goBack = useSmartBack();
  const canManage = hasAdminRole('Super Administrateur', 'Responsable Ressources');

  const [fiches, setFiches] = useState<PrepFiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [customizeFor, setCustomizeFor] = useState<PrepFiche | null>(null);
  const [unlockTick, setUnlockTick] = useState(0);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferNotice, setTransferNotice] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNotice, setCloudNotice] = useState('Vérification des nouvelles fiches…');
  const transferInput = useRef<HTMLInputElement>(null);
  const cloudSyncInFlight = useRef(false);

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active && document.visibilityState !== 'hidden') void synchronizeCloud(() => active);
    };
    run();
    const interval = window.setInterval(run, 10 * 60 * 1000);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
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

  async function synchronizeCloud(isActive: () => boolean = () => true) {
    if (cloudSyncInFlight.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (isActive()) setCloudNotice('Hors connexion : les fiches déjà téléchargées restent disponibles sur cet appareil.');
      return;
    }
    cloudSyncInFlight.current = true;
    if (isActive()) setCloudBusy(true);
    try {
      const result = await syncPublishedPrepFichesFromCloud();
      if (!isActive()) return;
      if (result.updated) {
        await refresh();
        setCloudNotice(`${result.fiches} fiche(s) et ${result.pages} page(s) synchronisées. Elles sont maintenant conservées hors connexion sur cet appareil.`);
      } else if (result.version) {
        setCloudNotice(`Toutes les fiches sont à jour${result.fiches ? ` (${result.fiches})` : ''}. Le catalogue sera revérifié automatiquement.`);
      } else {
        setCloudNotice('Aucune publication cloud n’est encore disponible. Les fiches importées par ZIP restent consultables hors connexion.');
      }
    } catch (error) {
      if (isActive()) {
        setCloudNotice(`${error instanceof Error ? error.message : 'Synchronisation cloud impossible.'} Les fiches déjà enregistrées restent disponibles hors connexion.`);
      }
    } finally {
      cloudSyncInFlight.current = false;
      if (isActive()) setCloudBusy(false);
    }
  }

  async function importTransfer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
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
      setSelectedClasse(null);
      setQuery('');
      await refresh();
      setTransferNotice(`Transfert terminé : ${result.added} fiche(s) ajoutée(s), ${result.updated} actualisée(s), ${result.removed} retirée(s). Les fiches sont maintenant disponibles hors connexion sur cet appareil.`);
      void synchronizeCloud();
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : 'Impossible d’importer ce paquet de fiches.');
    } finally {
      setTransferBusy(false);
    }
  }

  const grouped = useMemo(() => groupByClasse(fiches), [fiches]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return null;
    return fiches.filter((f) => {
      const t = `${f.titre} ${f.classe} ${f.matiere} ${f.description || ''}`
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return t.includes(q);
    });
  }, [fiches, query]);

  const currentClasse = grouped.find((g) => g.classe === selectedClasse) || null;

  function freeDownload(f: PrepFiche) {
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
            <p className="text-emerald-100 text-sm">Synchronisées automatiquement en ligne • conservées hors connexion</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        {/* Bandeau d'explication */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Téléchargez gratuitement les fiches de préparation, marquées du filigrane
            <strong> « Master Soutien Pédagogique »</strong>. Vous pouvez aussi
            <strong> personnaliser le filigrane</strong> (y mettre votre nom ou votre école) pour
            <strong> {PRICE_PER_PAGE} F par page</strong>.
          </p>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
          <h2 className="font-bold text-emerald-950 inline-flex items-center gap-2"><Cloud className="w-5 h-5" /> Synchronisation automatique</h2>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900">
            Les fiches publiées par l’administration sont vérifiées à l’ouverture, au retour de la connexion et régulièrement
            tant que l’application est ouverte. Les nouvelles pages sont téléchargées une seule fois et gardées sur cet appareil
            pour la consultation hors connexion. Seules ces fiches pédagogiques publiées sont concernées.
          </p>
          <button
            type="button"
            onClick={() => void synchronizeCloud()}
            disabled={cloudBusy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {cloudBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {cloudBusy ? 'Vérification…' : 'Vérifier les nouveautés'}
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
            disabled={transferBusy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {transferBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {transferBusy ? 'Importation…' : 'Importer un ZIP de secours'}
          </button>
          <input ref={transferInput} type="file" accept=".zip,application/zip" onChange={importTransfer} className="hidden" />
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
        ) : fiches.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Aucune fiche de préparation n’est encore présente sur cet appareil.
              <br />L’application vérifie automatiquement les publications en ligne. Si cet appareil reste hors connexion, importez le ZIP de secours ci-dessus.
            </p>
          </div>
        ) : searchResults ? (
          <FicheList
            fiches={searchResults}
            onFree={freeDownload}
            onCustomize={setCustomizeFor}
            unlockTick={unlockTick}
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
                <FicheList fiches={m.fiches} onFree={freeDownload} onCustomize={setCustomizeFor} unlockTick={unlockTick} />
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

function FicheList({ fiches, onFree, onCustomize, unlockTick, showMeta }: {
  fiches: PrepFiche[];
  onFree: (f: PrepFiche) => void;
  onCustomize: (f: PrepFiche) => void;
  unlockTick: number;
  showMeta?: boolean;
}) {
  if (fiches.length === 0) {
    return <p className="text-gray-400 text-sm">Aucune fiche.</p>;
  }
  return (
    <div className="space-y-3">
      {fiches.map((f) => {
        const unlocked = isUnlocked(ficheContentId(f.id));
        void unlockTick; // re-render à chaque déverrouillage
        return (
          <div key={f.id} className="bg-white rounded-2xl shadow p-3 flex gap-3">
            <img src={f.pages[0]?.dataUrl} alt="" className="w-16 h-20 object-cover rounded-lg border shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{f.titre}</p>
              {showMeta && <p className="text-xs text-emerald-700">{f.classe} • {f.matiere}</p>}
              {f.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{f.description}</p>}
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <FileText className="w-3 h-3" /> {f.pageCount} page(s)
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => onFree(f)}
                  className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger (gratuit)
                </button>
                <button
                  onClick={() => onCustomize(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1 ${unlocked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                >
                  {unlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {unlocked ? 'Filigrane personnalisé' : `Personnaliser — ${personalizationPrice(f)} F`}
                </button>
              </div>
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
