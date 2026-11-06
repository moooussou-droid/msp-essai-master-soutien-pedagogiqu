import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, FileUp, Download, Trash2, Eye, EyeOff, Plus, Loader2, FileText, Layers,
  CloudUpload, ShieldCheck, KeyRound, RefreshCw,
} from 'lucide-react';
import {
  PrepFiche, PrepFichePage, generateFicheId, extractPages, savePrepFiche,
  getAllPrepFiches, deletePrepFiche, setFichePublished, groupByClasse,
  personalizationPrice, PRICE_PER_PAGE, PREP_FICHE_PUBLISHER_ID,
} from '../utils/prepFiches';
import { hasAdminRole } from '../utils/adminSession';
import { exportPublishedPrepFichesArchive, formatPrepFicheTransferSize } from '../utils/prepFicheTransfer';
import { getAIGatewaySession, openAIGatewaySession, type AIGatewaySession } from '../utils/aiGateway';
import { publishPublishedPrepFichesToCloud } from '../utils/prepFicheCloudSync';

const CLASSES_SUGGESTIONS = [
  'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle',
];

export default function AdminPrepFichesScreen() {
  const goBack = useSmartBack('/equipe');

  // Accès par rôle : aucun mot de passe général sur cet écran.
  const authorized = hasAdminRole('Super Administrateur', 'Responsable Ressources');

  const [fiches, setFiches] = useState<PrepFiche[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout
  const [classe, setClasse] = useState('');
  const [matiere, setMatiere] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState<PrepFichePage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferNotice, setTransferNotice] = useState('');
  const [publisherSession, setPublisherSession] = useState<AIGatewaySession | null>(null);
  const [publisherCode, setPublisherCode] = useState('');
  const [publisherBusy, setPublisherBusy] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudProgress, setCloudProgress] = useState('');
  const [cloudNotice, setCloudNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authorized) refresh();
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    getAIGatewaySession()
      .then((session) => { if (active) setPublisherSession(session); })
      .catch(() => { if (active) setPublisherSession(null); });
    return () => { active = false; };
  }, [authorized]);

  async function refresh() {
    setLoading(true);
    try {
      setFiches(await getAllPrepFiches());
    } finally {
      setLoading(false);
    }
  }

  async function loginPublisher() {
    if (!publisherCode.trim()) {
      setCloudNotice('Saisissez le code IA principal délivré par l’administration.');
      return;
    }
    setPublisherBusy(true);
    setCloudNotice('');
    try {
      const session = await openAIGatewaySession(publisherCode.trim());
      setPublisherSession(session);
      setPublisherCode('');
      if (session.role !== 'principal') {
        setCloudNotice('Code accepté, mais la publication exige un rôle IA « principal ».');
        return;
      }
      setCloudNotice(`Session principale active${session.displayName ? ` : ${session.displayName}` : ''}.`);
    } catch (error) {
      setCloudNotice(error instanceof Error ? error.message : 'Impossible d’ouvrir la session IA principale.');
    } finally {
      setPublisherBusy(false);
    }
  }

  async function syncCloudCatalog() {
    let currentSession = publisherSession;
    if (currentSession?.role !== 'principal') {
      try {
        currentSession = await getAIGatewaySession();
        setPublisherSession(currentSession);
      } catch { currentSession = null; }
    }
    if (currentSession?.role !== 'principal') {
      setCloudNotice('Connectez-vous avec un code IA de rôle « principal » pour publier le catalogue.');
      return false;
    }
    setCloudBusy(true);
    setCloudNotice('');
    setCloudProgress('Préparation du catalogue…');
    try {
      const result = await publishPublishedPrepFichesToCloud(setCloudProgress, (removedFicheCount, cloudFicheCount) => window.confirm(
        `Cette publication retirera ${removedFicheCount} fiche(s) sur les ${cloudFicheCount} actuellement au catalogue cloud.\n\n`
        + 'Les utilisateurs recevront ce retrait lors de leur prochaine synchronisation. Confirmez-vous ?',
      ));
      if (result.cancelled) {
        setCloudNotice('Mise à jour annulée; le catalogue cloud précédent reste inchangé.');
        return false;
      }
      await refresh();
      setCloudNotice(`Synchronisation réussie : ${result.fiches} fiche(s), ${result.pages} page(s), ${formatPrepFicheTransferSize(result.totalBytes)}.`);
      return true;
    } catch (error) {
      if ([401, 403].includes(Number((error as any)?.status))) setPublisherSession(null);
      setCloudNotice(error instanceof Error ? error.message : 'Impossible de synchroniser les fiches publiées.');
      return false;
    } finally {
      setCloudBusy(false);
      setCloudProgress('');
    }
  }

  async function syncAfterChange(): Promise<boolean> {
    return syncCloudCatalog();
  }

  async function exportTransfer() {
    setTransferBusy(true);
    setTransferNotice('');
    try {
      const result = await exportPublishedPrepFichesArchive();
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `msp-fiches-pedagogiques-${stamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setTransferNotice(`ZIP de secours créé : ${result.fiches} fiche(s), ${result.pages} page(s), ${formatPrepFicheTransferSize(result.blob.size)}. À utiliser pour les appareils sans accès au catalogue cloud; l’import manuel remplace le précédent paquet MSP.`);
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : 'Impossible de créer le paquet de fiches.');
    } finally {
      setTransferBusy(false);
    }
  }

  const grouped = useMemo(() => groupByClasse(fiches), [fiches]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setProgress('Préparation…');
    try {
      const extracted = await extractPages(Array.from(files), (label) => setProgress(label));
      setPages((prev) => [...prev, ...extracted]);
      setProgress('');
    } catch (e: any) {
      alert(e?.message || "Impossible de lire ces fichiers.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removePage(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setClasse('');
    setMatiere('');
    setTitre('');
    setDescription('');
    setPages([]);
    setProgress('');
  }

  async function submit(publish: boolean) {
    if (!classe.trim()) return alert('Indiquez la classe (ex : CE1, 6ème…).');
    if (!matiere.trim()) return alert('Indiquez la matière ou la discipline.');
    if (!titre.trim()) return alert('Donnez un titre à la fiche.');
    if (pages.length === 0) return alert('Ajoutez au moins une page (image ou PDF).');

    setSaving(true);
    try {
      const fiche: PrepFiche = {
        id: generateFicheId(),
        classe: classe.trim(),
        matiere: matiere.trim(),
        titre: titre.trim(),
        description: description.trim(),
        pages,
        pageCount: pages.length,
        published: publish,
        createdAt: Date.now(),
      };
      await savePrepFiche(fiche);
      await refresh();
      resetForm();
      const synced = publish ? await syncAfterChange() : false;
      alert(
        publish
          ? `Fiche publiée${synced ? ' et synchronisée sur le cloud' : ' localement'} ✔\nLa fiche porte le filigrane « Master Soutien Pédagogique ».\nPersonnalisation pour l'utilisateur : ${personalizationPrice(fiche)} F (${pages.length} page(s) × ${PRICE_PER_PAGE} F).${synced ? '' : '\nConnectez-vous avec le code IA principal et synchronisez le catalogue.'}`
          : 'Fiche enregistrée en brouillon (non visible par les utilisateurs).',
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(f: PrepFiche) {
    await setFichePublished(f.id, !f.published);
    await refresh();
    await syncAfterChange();
  }

  async function remove(f: PrepFiche) {
    if (!confirm(`Supprimer définitivement la fiche « ${f.titre} » (${f.classe} — ${f.matiere}) ?`)) return;
    await deletePrepFiche(f.id);
    await refresh();
    if (f.published) await syncAfterChange();
  }

  if (!authorized) return <Navigate to="/equipe" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/10 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Fiches de préparation par classe</h1>
            <p className="text-slate-300 text-sm">Publication cloud automatique • fiches conservées hors ligne</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto space-y-5">
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <h2 className="font-bold text-emerald-950 flex items-center gap-2"><CloudUpload className="w-5 h-5" /> Synchronisation automatique des fiches publiées</h2>
          <p className="text-emerald-900 text-sm mt-1 leading-relaxed">
            Seules les fiches marquées « publiées » sont envoyées. Après une publication, un retrait ou une suppression,
            le catalogue cloud est mis à jour automatiquement si la session IA principale est active. Les appareils des
            utilisateurs récupèrent les nouveautés lorsqu’ils sont en ligne et gardent les pages en cache hors connexion.
            Les brouillons, les listes d’élèves et les autres données ne sont pas synchronisés par ce mécanisme.
          </p>
          {publisherSession?.role === 'principal' ? (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 inline-flex items-center gap-2 rounded-lg bg-white/80 p-3 text-sm text-emerald-950">
                <ShieldCheck className="w-5 h-5 shrink-0" /> Session principale active{publisherSession.displayName ? ` : ${publisherSession.displayName}` : ''}.
              </p>
              <button
                type="button"
                onClick={syncCloudCatalog}
                disabled={cloudBusy || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {cloudBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {cloudBusy ? (cloudProgress || 'Synchronisation…') : 'Synchroniser le catalogue'}
              </button>
            </div>
          ) : (
            <form
              className="mt-3 flex flex-col sm:flex-row gap-2"
              onSubmit={(event) => { event.preventDefault(); void loginPublisher(); }}
            >
              <label className="sr-only" htmlFor="prep-fiche-principal-code">Code IA principal</label>
              <input
                id="prep-fiche-principal-code"
                type="password"
                autoComplete="off"
                value={publisherCode}
                onChange={(event) => setPublisherCode(event.target.value)}
                placeholder="Code IA principal"
                className="flex-1 min-w-0 rounded-xl border border-emerald-300 bg-white px-3 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={publisherBusy || !publisherCode.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {publisherBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {publisherBusy ? 'Vérification…' : 'Activer la publication'}
              </button>
            </form>
          )}
          <p className="mt-2 text-xs text-emerald-900">
            Connexion requise au déploiement Vercel avec API. Chaque page doit faire moins de 45 Mo; le catalogue complet est limité à 200 Mo.
            Les pages de plus de 6 MiB utilisent un envoi reprenable. Le ZIP statique peut télécharger les fiches et servir de secours, mais ne peut pas publier.
          </p>
          {cloudProgress && cloudBusy && <p role="status" className="mt-2 text-sm font-medium text-emerald-900">{cloudProgress}</p>}
          {cloudNotice && <p role="status" className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-emerald-950">{cloudNotice}</p>}
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h2 className="font-bold text-blue-950 flex items-center gap-2"><Download className="w-5 h-5" /> ZIP manuel de secours (hors ligne)</h2>
          <p className="text-blue-900 text-sm mt-1">
            Si un appareil ne peut pas accéder au cloud, exportez les fiches publiées et copiez le ZIP par câble USB,
            Bluetooth ou autre transfert manuel. L’utilisateur devra l’importer dans son module. Ce transfert est une
            solution de secours; la synchronisation cloud reste prioritaire.
          </p>
          <button
            type="button"
            onClick={exportTransfer}
            disabled={transferBusy || !fiches.some(fiche => fiche.published)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {transferBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {transferBusy ? 'Création du paquet…' : 'Exporter le ZIP de secours'}
          </button>
          {transferNotice && <p role="status" className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-blue-950">{transferNotice}</p>}
        </section>

        {/* Ajout */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Nouvelle fiche de préparation
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Classez la fiche par <strong>classe</strong> et par <strong>matière / discipline</strong>, puis ajoutez ses
            pages (images ou PDF). La publication l’enregistre sur cet appareil et ajoute le filigrane
            <strong> « Master Soutien Pédagogique »</strong>. Les fiches publiées sont synchronisées sur le catalogue cloud
            lorsque la session principale est active; le ZIP ci-dessous reste disponible en secours hors ligne.
            La personnalisation du filigrane coûtera à l'utilisateur <strong> {PRICE_PER_PAGE} F par page</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
              <input
                list="classes-list"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                placeholder="Ex : CE1, CM2, 6ème…"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <datalist id="classes-list">
                {CLASSES_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matière / Discipline</label>
              <input
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                placeholder="Ex : Mathématiques, Français, SVT…"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la fiche</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Addition avec retenue — Séquence 3"
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (facultatif)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              placeholder="Compétence visée, période, remarques…"
            />
          </div>

          {/* Pages */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Pages de la fiche</label>
              <span className="text-xs text-gray-500">{pages.length} page(s)</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="w-full border-2 border-dashed border-emerald-300 rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-emerald-700 disabled:opacity-60"
            >
              {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
              <span className="text-sm font-semibold">
                {processing ? (progress || 'Traitement…') : 'Ajouter des pages (images ou PDF)'}
              </span>
              <span className="text-xs text-gray-500">PDF découpé automatiquement • formats cloud : JPG, PNG, WebP, GIF, BMP ou AVIF</span>
            </button>

            {pages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {pages.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p.dataUrl} alt={`Page ${i + 1}`} className="w-full h-28 object-cover rounded-lg border" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Page {i + 1}
                    </span>
                    <button
                      onClick={() => removePage(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                      title="Retirer cette page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pages.length > 0 && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 mt-3">
                Personnalisation du filigrane pour l'utilisateur :
                <strong> {pages.length * PRICE_PER_PAGE} F</strong> ({pages.length} × {PRICE_PER_PAGE} F).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => submit(false)}
              disabled={saving || processing}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold disabled:opacity-60"
            >
              Enregistrer (brouillon)
            </button>
            <button
              onClick={() => submit(true)}
              disabled={saving || processing}
              className="bg-emerald-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Publier
            </button>
          </div>
        </section>

        {/* Liste */}
        <section>
          <h2 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-700" /> Fiches enregistrées
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
          ) : fiches.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">
              Aucune fiche pour l'instant.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.classe} className="bg-white rounded-2xl shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-emerald-700">{g.classe}</h3>
                    <span className="text-xs text-gray-500">{g.total} fiche(s)</span>
                  </div>
                  {g.matieres.map((m) => (
                    <div key={m.matiere} className="mb-3 last:mb-0">
                      <p className="text-sm font-semibold text-gray-600 mb-2">{m.matiere}</p>
                      <div className="space-y-2">
                        {m.fiches.map((f) => (
                          <div key={f.id} className="border rounded-xl p-3 flex items-center gap-3">
                            <img src={f.pages[0]?.dataUrl} alt="" className="w-12 h-16 object-cover rounded border shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{f.titre}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {f.pageCount} page(s) • perso. {personalizationPrice(f)} F
                              </p>
                              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded ${f.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {f.published ? (f.distribution?.publisherId === PREP_FICHE_PUBLISHER_ID ? 'Publiée et synchronisée' : 'Publiée localement — à synchroniser') : 'Brouillon'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => togglePublish(f)}
                                className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${f.published ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                              >
                                {f.published ? <><EyeOff className="w-3 h-3" /> Retirer</> : <><Eye className="w-3 h-3" /> Publier</>}
                              </button>
                              <button onClick={() => remove(f)} className="text-xs px-2 py-1 rounded font-medium bg-red-50 text-red-600 inline-flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Suppr.
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
