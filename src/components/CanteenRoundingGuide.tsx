/**
 * AIDE VISUELLE — MÉTHODE D'ARRONDI DE SORTIE DES DENRÉES (v65).
 *
 * Reproduit, en interface accessible, le graphique officiel fourni :
 * la partie décimale d'une quantité est classée par intervalles, au
 * quart pour l'huile/céréales/légumineuses et au dixième pour le sel.
 */
import { Info } from 'lucide-react';
import {
  CANTEEN_ROUNDING_RULES,
  CanteenRoundingKind,
  formatQty,
} from '../utils/canteenCalc';

const WIDTHS: Record<CanteenRoundingKind, number[]> = {
  'huile-cereales-legumineuses': [37.5, 25, 25, 12.5],
  sel: [15, 10, 10, 10, 10, 10, 10, 10, 10, 5],
};

const COLORS: Record<CanteenRoundingKind, string[]> = {
  'huile-cereales-legumineuses': ['bg-amber-300 text-amber-950', 'bg-orange-400 text-white', 'bg-sky-500 text-white', 'bg-emerald-500 text-white'],
  sel: [
    'bg-amber-300 text-amber-950', 'bg-red-500 text-white', 'bg-purple-500 text-white',
    'bg-purple-500 text-white', 'bg-purple-500 text-white', 'bg-purple-500 text-white',
    'bg-purple-500 text-white', 'bg-orange-400 text-white', 'bg-sky-500 text-white',
    'bg-emerald-500 text-white',
  ],
};

function RuleBar({ kind }: { kind: CanteenRoundingKind }) {
  const rule = CANTEEN_ROUNDING_RULES[kind];
  return (
    <div data-testid={kind === 'sel' ? 'arrondi-sel' : 'arrondi-quart'}>
      <p className="font-bold text-gray-800 text-sm mb-2">{rule.foodsLabel}</p>
      <div className="flex h-9 overflow-hidden rounded-lg border border-gray-200" aria-hidden="true">
        {rule.intervals.map((interval, i) => (
          <div
            key={interval.interval}
            style={{ width: `${WIDTHS[kind][i]}%` }}
            className={`${COLORS[kind][i]} flex items-center justify-center text-[11px] sm:text-xs font-extrabold border-r border-white/70 last:border-r-0`}
          >
            {formatQty(interval.output)}
          </div>
        ))}
      </div>
      <div className={`mt-2 grid gap-1.5 ${kind === 'sel' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {rule.intervals.map((interval) => (
          <p key={interval.interval} className="rounded-md bg-gray-50 border border-gray-100 px-2 py-1 text-[11px] text-gray-700 text-center">
            {interval.interval} <span aria-hidden="true">→</span> <strong>{formatQty(interval.output)}</strong>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CanteenRoundingGuide({ compact = false }: { compact?: boolean }) {
  return (
    <section className="bg-white rounded-xl border border-blue-200 p-4" data-testid="guide-arrondi-cantine">
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-blue-950">Méthode d’arrondi utilisée pour la sortie des denrées</h2>
          <p className="text-xs text-blue-900 leading-relaxed mt-1">
            On garde la partie entière, puis on classe <strong>la partie décimale</strong> dans l’un des intervalles
            ci-dessous. Une borne appartient à l’intervalle qui se termine sur elle : 0,375 donne 0,25 et 0,15 donne 0,10.
            Une quantité nulle reste 0 et une quantité entière exacte reste entière.
          </p>
        </div>
      </div>

      <div className={compact ? 'space-y-4' : 'space-y-5'}>
        <RuleBar kind="huile-cereales-legumineuses" />
        <RuleBar kind="sel" />
      </div>

      <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
        Exemple : 42,30 kg → partie décimale 0,30 dans [0 ; 0,375] → sortie 42,25 kg.
        Pour le sel : 0,84 kg → partie décimale 0,84 dans ]0,75 ; 0,85] → sortie 0,80 kg.
      </p>
    </section>
  );
}
