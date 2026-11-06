/**
 * TUTORIELS MASTER SOUTIEN PÉDAGOGIQUE (v58).
 *
 * L'abonné consulte les tutoriels vidéo publiés par l'équipe
 * d'administration. La vidéo est lue DANS l'application : aucun bouton
 * ne renvoie vers YouTube.
 *
 * L'espace de publication (ajout des liens) n'est visible que pour un
 * administrateur connecté — un enseignant ne doit pas pouvoir modifier
 * le catalogue.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Search, PlayCircle, X, Plus, Trash2, Eye, EyeOff, Wifi, ShieldCheck,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { isPrincipalAdminSession } from '../utils/adminSession';
import {
  Tutorial, TUTORIAL_CATEGORIES, extractVideoId, embedUrl, thumbnailUrl,
  loadTutorials, publishedTutorials, saveTutorial, deleteTutorial,
  groupByCategory, searchTutorials, newTutorial,
} from '../utils/userGuide';

/** L'administrateur principal est-il connecté sur cet appareil ? */
function isAdmin(): boolean {
  return isPrincipalAdminSession();
}

export default function TutorialsScreen() {
  const goBack = useSmartBack();
  const admin = isAdmin();

  const [tous, setTous] = useState<Tutorial[]>([]);
  const [query, setQuery] = useState('');
  const [lecture, setLecture] = useState<Tutorial | null>(null);
  const [edition, setEdition] = useState<Tutorial | null>(null);
  const [lien, setLien] = useState('');
  const [erreur, setErreur] = useState('');
  const [enLigne, setEnLigne] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    setTous(admin ? loadTutorials() : publishedTutorials());
    const on = () => setEnLigne(true);
    const off = () => setEnLigne(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [admin]);

  const visibles = useMemo(() => searchTutorials(tous, query), [tous, query]);
  const groupes = useMemo(() => groupByCategory(visibles), [visibles]);

  function rafraichir() {
    setTous(admin ? loadTutorials() : publishedTutorials());
  }

  function enregistrer() {
    if (!edition) return;
    const id = extractVideoId(lien || edition.videoId);
    if (!id) {
      setErreur('Lien YouTube non reconnu. Collez l’adresse complète de la vidéo.');
      return;
    }
    if (!edition.title.trim()) {
      setErreur('Le titre est obligatoire.');
      return;
    }
    saveTutorial({ ...edition, videoId: id });
    setEdition(null);
    setLien('');
    setErreur('');
    rafraichir();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Tutoriels MSP</h1>
            <p className="text-white/80 text-sm">Vidéos d’utilisation de l’application</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        {/*
          Les tutoriels sont des vidéos en ligne : on le dit clairement
          plutôt que d'afficher un lecteur vide quand le réseau manque.
        */}
        {!enLigne && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3" data-testid="alerte-hors-ligne">
            <p className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" /> Connexion internet requise
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Les tutoriels sont des vidéos en ligne. Le reste de l’application,
              y compris le <strong>Manuel de l’abonné</strong>, fonctionne sans connexion.
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search" data-testid="recherche-tutoriels" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un tutoriel"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-3 text-base"
          />
        </div>

        {admin && (
          <div className="msp-card p-4 border-2 border-dashed border-[#046a38]" data-testid="espace-admin-tutoriels">
            <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#046a38]" /> Espace d’administration
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Publiez ici les tutoriels. Réglez vos vidéos en <strong>« Non répertoriée »</strong> sur
              YouTube : elles resteront introuvables par une recherche publique.
            </p>
            <button
              data-testid="btn-ajouter-tutoriel"
              onClick={() => { setEdition(newTutorial()); setLien(''); setErreur(''); }}
              className="mt-3 w-full bg-[#046a38] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Ajouter un tutoriel
            </button>
          </div>
        )}

        {visibles.length === 0 && (
          <div className="msp-card p-6 text-center" data-testid="aucun-tutoriel">
            <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Aucun tutoriel disponible</p>
            <p className="text-sm text-gray-500 mt-1">
              L’équipe d’administration publiera prochainement les vidéos d’utilisation.
              En attendant, consultez le <strong>Manuel de l’abonné</strong>.
            </p>
          </div>
        )}

        {groupes.map((g) => (
          <div key={g.category} data-testid={`rubrique-${g.category}`}>
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-2 mt-2">
              {g.category}
            </h2>
            <div className="space-y-2">
              {g.items.map((t) => (
                <div key={t.id} className="msp-card overflow-hidden">
                  <button
                    data-testid={`tutoriel-${t.id}`}
                    onClick={() => setLecture(t)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                      <img
                        src={thumbnailUrl(t.videoId)} alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-white drop-shadow" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 leading-snug">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {t.duration || 'Vidéo'}
                        {admin && !t.published && ' · NON PUBLIÉ'}
                      </p>
                    </div>
                  </button>
                  {admin && (
                    <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                      <button
                        onClick={() => { setEdition(t); setLien(''); setErreur(''); }}
                        className="bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-semibold"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => { saveTutorial({ ...t, published: !t.published }); rafraichir(); }}
                        className="bg-blue-50 text-blue-700 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                      >
                        {t.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {t.published ? 'Masquer' : 'Publier'}
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm('Supprimer ce tutoriel ?')) return;
                          deleteTutorial(t.id);
                          rafraichir();
                        }}
                        className="bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Suppr.
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* ---------- Lecteur intégré ---------- */}
      {lecture && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" data-testid="lecteur-video">
          <div className="flex items-center gap-3 p-3 text-white">
            <button onClick={() => setLecture(null)} className="p-2 bg-white/15 rounded-lg" aria-label="Fermer">
              <X className="w-6 h-6" />
            </button>
            <p className="font-bold text-sm flex-1 min-w-0 truncate">{lecture.title}</p>
          </div>
          <div className="flex-1 flex items-center justify-center px-2">
            <div className="w-full" style={{ maxWidth: 900 }}>
              {/* Rapport 16/9 conservé quelle que soit la largeur de l'écran. */}
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  data-testid="iframe-tutoriel"
                  src={embedUrl(lecture.videoId)}
                  title={lecture.title}
                  className="absolute inset-0 w-full h-full rounded-xl"
                  style={{ border: 0 }}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
          {lecture.description && (
            <p className="text-white/80 text-xs p-4 text-center">{lecture.description}</p>
          )}
        </div>
      )}

      {/* ---------- Publication (administration) ---------- */}
      {edition && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Tutoriel</h2>
              <button onClick={() => setEdition(null)} className="p-2" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {erreur && (
                <p className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {erreur}
                </p>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Lien YouTube *</span>
                <input
                  data-testid="champ-lien-youtube"
                  value={lien || (edition.videoId ? `https://youtu.be/${edition.videoId}` : '')}
                  onChange={(e) => setLien(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
                <span className="text-[11px] text-gray-500">
                  Tous les formats sont acceptés : lien classique, lien court, Short.
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Titre *</span>
                <input
                  data-testid="champ-titre-tutoriel" value={edition.title}
                  onChange={(e) => setEdition({ ...edition, title: e.target.value })}
                  placeholder="Ex. Saisir les notes d’une évaluation"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Rubrique</span>
                <select
                  data-testid="champ-rubrique" value={edition.category}
                  onChange={(e) => setEdition({ ...edition, category: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
                >
                  {TUTORIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Durée</span>
                  <input
                    value={edition.duration || ''} placeholder="4 min"
                    onChange={(e) => setEdition({ ...edition, duration: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox" data-testid="champ-publie" checked={edition.published}
                    onChange={(e) => setEdition({ ...edition, published: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold text-gray-700">Publié</span>
                </label>
              </div>
              <textarea
                rows={2} value={edition.description || ''}
                onChange={(e) => setEdition({ ...edition, description: e.target.value })}
                placeholder="Description (facultatif)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t p-3">
              <button
                data-testid="btn-enregistrer-tutoriel" onClick={enregistrer}
                className="w-full bg-[#046a38] text-white py-3 rounded-xl font-bold"
              >
                Enregistrer le tutoriel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
