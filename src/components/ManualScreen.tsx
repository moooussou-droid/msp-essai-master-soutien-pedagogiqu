/**
 * LE MANUEL DE L'ABONNÉ (v58).
 *
 * Le mode d'emploi complet, consultable DANS l'application et hors
 * connexion. Les chapitres se déplient un à un : sur un téléphone, tout
 * afficher d'un coup rendrait la lecture impossible.
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Search, ChevronDown, ChevronRight, BookOpen,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  MANUAL, MANUAL_INTRO, ManualStep, searchManual, totalFiches,
} from '../utils/manualContent';

function Fiche({ f }: { f: ManualStep }) {
  return (
    <div className="border-t border-gray-100 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
      <h4 className="font-bold text-gray-900 text-[15px]">{f.titre}</h4>
      <p className="text-[11px] text-gray-500 italic mt-0.5">Où le trouver : {f.chemin}</p>
      <p className="text-sm text-gray-700 mt-1.5">{f.role}</p>

      <p className="text-xs font-bold text-[#046a38] mt-2.5 mb-1">Comment faire :</p>
      <ol className="space-y-1.5">
        {f.etapes.map((e, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-800">
            <span className="shrink-0 w-5 h-5 rounded bg-[#f2a900] text-[#04351d] text-[11px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="leading-snug">{e}</span>
          </li>
        ))}
      </ol>

      {f.sorties && (
        <p className="text-xs text-gray-600 mt-2">
          <strong>Ce que vous obtenez :</strong> {f.sorties}
        </p>
      )}
      {f.astuce && (
        <p className="mt-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-900">
          <strong>CONSEIL —</strong> {f.astuce}
        </p>
      )}
      {f.attention && (
        <p className="mt-2 text-xs bg-red-50 border border-red-200 rounded-lg p-2 text-red-900">
          <strong>ATTENTION —</strong> {f.attention}
        </p>
      )}
    </div>
  );
}

export default function ManualScreen() {
  const goBack = useSmartBack();
  const [query, setQuery] = useState('');
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({ ch1: true });

  const resultats = useMemo(() => searchManual(query), [query]);

  function bascule(id: string) {
    setOuverts((p) => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Manuel de l’abonné</h1>
            <p className="text-white/80 text-sm">{totalFiches()} fonctions expliquées</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4">
          <div className="msp-flag-rule mb-3" />
          <p className="text-sm text-gray-700">
            Ce manuel explique chaque fonction de l’application : à quoi elle sert,
            où la trouver et comment l’utiliser. Il fonctionne <strong>sans connexion</strong>.
          </p>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search" data-testid="recherche-manuel" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fonction (ex. bulletin, absent…)"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-3 text-base"
          />
        </div>

        {query.trim() && (
          <div className="msp-card p-4" data-testid="resultats-manuel">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">
              {resultats.length} résultat(s)
            </p>
            {resultats.length === 0 && (
              <p className="text-sm text-gray-500">Aucune fonction ne correspond.</p>
            )}
            {resultats.map(({ chapitre, fiche }, i) => (
              <div key={i} className="mb-3">
                <p className="text-[11px] font-bold text-[#046a38] uppercase">{chapitre}</p>
                <Fiche f={fiche} />
              </div>
            ))}
          </div>
        )}

        {!query.trim() && (
          <>
            <div className="msp-card p-4">
              <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#046a38]" /> Avant de commencer
              </h2>
              {MANUAL_INTRO.map((b) => (
                <div key={b.titre} className="mb-3 last:mb-0">
                  <p className="font-bold text-sm text-[#b45309]">{b.titre}</p>
                  {b.texte.split('\n\n').map((t, i) => (
                    <p key={i} className="text-sm text-gray-700 mt-1">{t}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-2" data-testid="chapitres-manuel">
              {MANUAL.map((c) => (
                <div key={c.id} className="msp-card overflow-hidden">
                  <button
                    data-testid={`chapitre-${c.id}`}
                    onClick={() => bascule(c.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{c.titre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.resume}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{c.fiches.length} fonction(s)</p>
                    </div>
                    {ouverts[c.id]
                      ? <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                      : <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />}
                  </button>
                  {ouverts[c.id] && (
                    <div className="px-4 pb-4" data-testid={`contenu-${c.id}`}>
                      {c.fiches.map((f) => <Fiche key={f.titre} f={f} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/*
          v60 — LE MANUEL N'EST PAS TÉLÉCHARGEABLE.
          À la demande de l'éditeur, le manuel se consulte uniquement dans
          l'application : aucun export PDF n'est proposé, afin qu'il ne
          circule pas hors de l'abonnement. Il reste intégralement
          consultable hors connexion.
        */}
        <p
          data-testid="mention-consultation"
          className="text-[11px] text-gray-500 text-center px-4 py-3"
        >
          Ce manuel se consulte dans l’application. Il reste accessible
          <strong> sans connexion internet</strong>, à tout moment.
        </p>
      </main>
    </div>
  );
}
