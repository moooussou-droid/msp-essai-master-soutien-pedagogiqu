/**
 * ÉDUCATION À LA VIE (v39).
 *
 * Deux vues dans un seul écran :
 *  - la liste des 50 fiches d'un domaine (avec recherche et filtre de niveau) ;
 *  - la fiche détaillée, lisible et imprimable.
 *
 * Le paramètre d'URL `:domaine` vaut environnementale | financiere | entrepreneuriale.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Target, Lightbulb, ClipboardCheck, Star, Printer, Home } from 'lucide-react';
import { findDomain, searchLessons, LifeLesson } from '../utils/lifeEducationData';
import { useSmartBack } from '../utils/useSmartBack';

export default function LifeEducationScreen() {
  const { domaine = '' } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const domain = findDomain(domaine);

  const [query, setQuery] = useState('');
  const [niveau, setNiveau] = useState('Tous');
  const [selected, setSelected] = useState<LifeLesson | null>(null);

  /**
   * v39 — en passant d'un domaine à l'autre, le composant n'est pas remonté :
   * sans cette remise à zéro, la fiche du domaine précédent restait affichée
   * et la recherche devenait inaccessible.
   */
  useEffect(() => {
    setSelected(null);
    setQuery('');
    setNiveau('Tous');
  }, [domaine]);

  const lessons = useMemo(() => {
    if (!domain) return [];
    return searchLessons(domain.slug, query).filter((l) => niveau === 'Tous' || l.level === niveau);
  }, [domain, query, niveau]);

  if (!domain) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-700">Domaine introuvable.</p>
        <button onClick={() => navigate('/education-vie')} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg">
          Revenir au module
        </button>
      </div>
    );
  }

  /* ----------------------- Fiche détaillée ----------------------- */
  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-white/20" aria-label="Retour à la liste">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-90">{domain.title}</p>
              <h1 className="font-bold truncate">{selected.title}</h1>
            </div>
            <button onClick={() => window.print()} className="p-2 rounded-lg hover:bg-white/20" aria-label="Imprimer la fiche">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </header>

        <article className="p-4 max-w-3xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <span className="inline-block text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              {selected.level}
            </span>
            <h2 className="text-2xl font-black text-gray-900 mt-2">{selected.title}</h2>
            <p className="flex items-start gap-2 mt-3 text-gray-700">
              <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Objectif :</strong> {selected.objective}</span>
            </p>
          </div>

          <section className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-emerald-600" /> La leçon
            </h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{selected.content}</p>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5" /> Exemple concret
            </h3>
            <p className="text-amber-900/90">{selected.example}</p>
          </section>

          <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
              <ClipboardCheck className="w-5 h-5" /> Activité pratique
            </h3>
            <p className="text-blue-900/90">{selected.activity}</p>
          </section>

          <section className="bg-emerald-600 text-white rounded-2xl p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <Star className="w-5 h-5" /> À retenir
            </h3>
            <p className="font-semibold">{selected.keyPoint}</p>
          </section>

          <div className="flex flex-wrap gap-2">
            {selected.keywords.map((k) => (
              <span key={k} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">#{k}</span>
            ))}
          </div>
        </article>
      </div>
    );
  }

  /* ------------------------- Liste des fiches ------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-white/20" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{domain.title}</h1>
            <p className="text-xs opacity-90">{domain.lessons.length} cours et articles</p>
          </div>
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/20" aria-label="Accueil">
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-gray-600 mb-3">{domain.description}</p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un cours, un mot-clé…"
              className="w-full pl-9 pr-3 py-3 border rounded-xl"
            />
          </div>
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className="px-3 py-3 border rounded-xl bg-white">
            <option>Tous</option>
            <option>Primaire</option>
            <option>Secondaire</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-2">{lessons.length} résultat(s)</p>

        <div className="grid gap-3 md:grid-cols-2">
          {lessons.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className="bg-white rounded-2xl shadow p-4 text-left hover:ring-2 hover:ring-emerald-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-700">#{i + 1}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{l.level}</span>
              </div>
              <h2 className="font-bold text-gray-900 mt-1">{l.title}</h2>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{l.objective}</p>
            </button>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            Aucun cours ne correspond à cette recherche.
          </div>
        )}
      </div>
    </div>
  );
}
