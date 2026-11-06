/**
 * BIBLIOTHÈQUE NUMÉRIQUE (v38) — livres gratuits et payants.
 * Même procédure de paiement que les cours.
 */

import { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, Download, Library, Lock, Plus, Printer, Search, Trash2, X, Film, PlayCircle } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { BOOK_CATEGORIES, BookItem, addBook, filterBooks, loadBooks, removeBook } from '../utils/library';
import {
  EduFilm, FILM_CATEGORIES, addFilm, filterFilms, loadFilms, removeFilm,
  isValidYouTube, youTubeEmbed, youTubeThumb,
} from '../utils/mediatheque';
import { isUnlocked } from '../utils/coursePayment';
import { exportBookPdf, printBook } from '../utils/libraryPdf';
import PaywallPanel from './PaywallPanel';
import { isSuperAdminSession } from '../utils/adminSession';

type LibView = 'livres' | 'films';

export default function LibraryScreen() {
  const goBack = useSmartBack();
  const [view, setView] = useState<LibView>('livres');
  const [books, setBooks] = useState<BookItem[]>(() => loadBooks());
  const [films, setFilms] = useState<EduFilm[]>(() => loadFilms());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [reader, setReader] = useState<BookItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [player, setPlayer] = useState<EduFilm | null>(null);
  const [showFilmForm, setShowFilmForm] = useState(false);
  const isAdmin = isSuperAdminSession();

  const filtered = useMemo(() => filterBooks(query, category, books), [query, category, books]);
  const filteredFilms = useMemo(() => filterFilms(query, category, films), [query, category, films]);

  function switchView(v: LibView) {
    setView(v);
    setCategory('Toutes');
    setQuery('');
  }

  const categories = view === 'livres' ? BOOK_CATEGORIES : FILM_CATEGORIES;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      <header className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Library className="w-6 h-6" /> Biblio - Médiathèque</h1>
          <p className="text-white/85 text-sm">Manuels et ouvrages, et films éducatifs</p>

          <div className="mt-4 grid grid-cols-2 gap-2 bg-white/15 rounded-xl p-1">
            <button
              onClick={() => switchView('livres')}
              className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition ${view === 'livres' ? 'bg-white text-purple-700' : 'text-white'}`}
            >
              <BookOpen className="w-4 h-4" /> Bibliothèque
            </button>
            <button
              onClick={() => switchView('films')}
              className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition ${view === 'films' ? 'bg-white text-purple-700' : 'text-white'}`}
            >
              <Film className="w-4 h-4" /> Médiathèque
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-3 space-y-4">
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={view === 'livres' ? 'Rechercher un livre...' : 'Rechercher un film éducatif...'}
              className="w-full pl-10 p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
            {['Toutes', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${category === c ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {isAdmin && view === 'livres' && (
            <button onClick={() => setShowForm(true)} className="w-full mt-3 bg-purple-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Publier un livre
            </button>
          )}
          {isAdmin && view === 'films' && (
            <button onClick={() => setShowFilmForm(true)} className="w-full mt-3 bg-purple-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Ajouter un film éducatif (YouTube)
            </button>
          )}
        </section>

        {view === 'livres' ? (
          filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-8 text-center text-gray-500">
              Aucun livre disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((b) => {
                const locked = b.type === 'payant' && !isUnlocked(b.id);
                return (
                  <article key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-9 h-9 text-purple-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 dark:text-gray-100">{b.title}</h3>
                        <p className="text-gray-500 text-sm">{b.author || 'Auteur non précisé'}{b.level && ` • ${b.level}`}</p>
                        <span className={`inline-block mt-2 rounded px-2 py-1 text-xs font-bold ${b.type === 'gratuit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {b.type === 'gratuit' ? 'Gratuit' : `${b.price} FCFA`}
                        </span>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 line-clamp-2">{b.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setReader(b)} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5">
                        {locked ? <><Lock className="w-4 h-4" /> Voir l’extrait</> : <><BookOpen className="w-4 h-4" /> Lire</>}
                      </button>
                      {isAdmin && (
                        <button onClick={() => { removeBook(b.id); setBooks(loadBooks()); }} className="px-3 text-red-500" aria-label="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          filteredFilms.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-8 text-center text-gray-500">
              Aucun film éducatif pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFilms.map((f) => (
                <article key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow overflow-hidden">
                  <button onClick={() => setPlayer(f)} className="relative block w-full aspect-video bg-gray-900">
                    {youTubeThumb(f.youtubeUrl) ? (
                      <img src={youTubeThumb(f.youtubeUrl)} alt={f.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60"><Film className="w-10 h-10" /></div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="w-14 h-14 text-white drop-shadow-lg" />
                    </span>
                  </button>
                  <div className="p-4">
                    <h3 className="font-black text-gray-900 dark:text-gray-100">{f.title}</h3>
                    <p className="text-gray-500 text-sm">{f.category}{f.level && ` • ${f.level}`}</p>
                    {f.description && <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 line-clamp-2">{f.description}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setPlayer(f)} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5">
                        <PlayCircle className="w-4 h-4" /> Regarder
                      </button>
                      {isAdmin && (
                        <button onClick={() => { removeFilm(f.id); setFilms(loadFilms()); }} className="px-3 text-red-500" aria-label="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </main>

      {reader && <BookReader book={reader} onClose={() => setReader(null)} />}
      {showForm && <BookForm onClose={() => { setShowForm(false); setBooks(loadBooks()); }} />}
      {player && <FilmPlayer film={player} onClose={() => setPlayer(null)} />}
      {showFilmForm && <FilmForm onClose={() => { setShowFilmForm(false); setFilms(loadFilms()); }} />}
    </div>
  );
}

function FilmPlayer({ film, onClose }: { film: EduFilm; onClose: () => void }) {
  const embed = youTubeEmbed(film.youtubeUrl);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-3 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b dark:border-slate-700 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-black text-gray-900 dark:text-gray-100 truncate">{film.title}</p>
            <p className="text-xs text-gray-500">{film.category}{film.level && ` • ${film.level}`}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="aspect-video bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={film.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              /* v61 — le film se regarde UNIQUEMENT dans l'application : le bac à
                 sable interdit l'ouverture d'onglets externes et la navigation de
                 la page parente (clic sur le logo/titre YouTube), tout en gardant
                 la lecture et le plein écran. */
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/70 text-sm p-4 text-center">
              Lien vidéo invalide.
            </div>
          )}
        </div>
        {film.description && (
          <div className="p-4 max-h-40 overflow-auto">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{film.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilmForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Omit<EduFilm, 'id' | 'createdAt'>>({
    title: '', description: '', level: '', category: FILM_CATEGORIES[0], youtubeUrl: '',
  });
  const [erreur, setErreur] = useState('');
  const valid = isValidYouTube(form.youtubeUrl);

  function submit() {
    if (!form.title.trim()) { setErreur('Indiquez le titre du film.'); return; }
    if (!valid) { setErreur('Collez un lien YouTube valide (youtube.com/watch?v=… ou youtu.be/…).'); return; }
    addFilm(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 dark:text-gray-100 flex items-center gap-2"><Film className="w-5 h-5 text-purple-600" /> Ajouter un film éducatif</h2>
          <button onClick={onClose} aria-label="Fermer"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="space-y-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre du film" className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="Lien YouTube (https://youtu.be/... ou https://www.youtube.com/watch?v=...)" className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          {form.youtubeUrl && (
            valid ? (
              <div className="rounded-lg overflow-hidden border dark:border-slate-600">
                <img src={youTubeThumb(form.youtubeUrl)} alt="Aperçu" className="w-full aspect-video object-cover" />
              </div>
            ) : (
              <p className="text-xs text-amber-600">Lien non reconnu. Vérifiez qu'il s'agit d'un lien YouTube.</p>
            )
          )}
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg">
              {FILM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Niveau (ex : CM2, 6ème…)" className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (facultatif)" rows={3} className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          {erreur && <p className="text-sm font-semibold text-red-600" role="alert">{erreur}</p>}
          <button onClick={submit} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Ajouter le film</button>
        </div>
      </div>
    </div>
  );
}

function BookReader({ book, onClose }: { book: BookItem; onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(() => book.type === 'gratuit' || isUnlocked(book.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl h-[92vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b dark:border-slate-700 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-black text-gray-900 dark:text-gray-100 truncate">{book.title}</p>
            <p className="text-xs text-gray-500">{book.author}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
            {unlocked ? (book.content || book.excerpt) : book.excerpt}
          </p>

          {!unlocked && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">
                Vous lisez un extrait. Le contenu intégral de ce livre est payant.
              </p>
              <PaywallPanel
                contentId={book.id}
                kind="livre"
                title={book.title}
                price={book.price}
                onUnlocked={() => setUnlocked(true)}
              />
            </div>
          )}

          {unlocked && (
            <div className="mt-6 space-y-2" data-testid="actions-livre">
              {book.pdfUrl ? (
                <a
                  href={book.pdfUrl}
                  download
                  data-testid="btn-dl-livre"
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white"
                >
                  <Download className="w-5 h-5" /> Télécharger le PDF
                </a>
              ) : (
                /*
                 * v44 — repli : certains livres ont ete saisis en texte, sans
                 * fichier PDF joint. Plutot que de ne rien proposer, on
                 * FABRIQUE le PDF a partir du contenu, hors ligne.
                 */
                <button
                  data-testid="btn-pdf-livre"
                  onClick={() => exportBookPdf(book)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-bold text-white"
                >
                  <Download className="w-5 h-5" /> Télécharger le PDF
                </button>
              )}

              {/* L'impression reste disponible a cote du PDF (regle v41). */}
              <button
                data-testid="btn-imprimer-livre"
                onClick={() => printBook(book)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-3 font-bold text-gray-700"
              >
                <Printer className="w-5 h-5" /> Imprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Omit<BookItem, 'id' | 'createdAt'>>({
    title: '', author: '', level: '', category: BOOK_CATEGORIES[0], description: '',
    excerpt: '', content: '', type: 'gratuit', price: '0', pdfUrl: '', coverUrl: '',
  });
  // v39 — le livre EST un fichier PDF : on affiche son nom et son poids,
  // et la publication est refusée tant qu'aucun PDF n'est joint.
  const [pdfName, setPdfName] = useState('');
  const [pdfSize, setPdfSize] = useState(0);
  const [erreur, setErreur] = useState('');

  async function pickPdf(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErreur('Le fichier doit être un PDF.');
      return;
    }
    // Le PDF est stocké en base64 dans le navigateur : au-delà de ~8 Mo le
    // quota du stockage local est menacé, on prévient franchement l'utilisateur.
    if (file.size > 8 * 1024 * 1024) {
      setErreur(`Ce PDF fait ${(file.size / 1048576).toFixed(1)} Mo. Utilisez un fichier de moins de 8 Mo (compressez-le) pour ne pas saturer le téléphone.`);
      return;
    }
    setErreur('');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, pdfUrl: String(reader.result || '') }));
      setPdfName(file.name);
      setPdfSize(file.size);
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!form.title.trim()) { setErreur('Indiquez le titre du livre.'); return; }
    if (!form.pdfUrl) { setErreur('Joignez le fichier PDF du manuel, de l’ouvrage ou des annales.'); return; }
    if (form.type === 'payant' && !(parseInt(form.price, 10) > 0)) {
      setErreur('Indiquez le prix à payer pour ce livre payant.'); return;
    }
    addBook(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl h-[92vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 dark:text-gray-100">Publier un livre</h2>
          <button onClick={onClose} aria-label="Fermer"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="space-y-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre du livre" className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Auteur" className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Niveau" className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          </div>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg">
            {BOOK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Extrait gratuit (visible par tous)" rows={3} className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Contenu intégral (réservé après paiement)" rows={5} className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BookItem['type'] })} className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg">
              <option value="gratuit">Gratuit</option>
              <option value="payant">Payant</option>
            </select>
            {form.type === 'payant' && (
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Prix FCFA" className="p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
            )}
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Fichier PDF du livre (obligatoire) — téléchargeable seulement après paiement s’il est payant
            </span>
            <input type="file" accept="application/pdf" onChange={(e) => pickPdf(e.target.files?.[0])} className="w-full text-sm" data-testid="book-pdf" />
            {pdfName && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                PDF joint : {pdfName} ({(pdfSize / 1048576).toFixed(2)} Mo)
              </p>
            )}
          </label>
          {erreur && <p className="text-sm font-semibold text-red-600" role="alert">{erreur}</p>}
          <button onClick={submit} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Publier</button>
        </div>
      </div>
    </div>
  );
}
