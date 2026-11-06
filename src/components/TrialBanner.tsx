/**
 * BANDEAU DE LA VERSION D'ESSAI (v55).
 *
 * Rappelle en permanence que l'application est en essai gratuit et
 * combien de temps il reste. Il est délibérément discret (une seule
 * ligne) pour ne pas gêner le travail, mais devient orange puis rouge à
 * mesure que l'échéance approche : le prospect ne doit pas être surpris
 * par la coupure.
 */
import { Clock } from 'lucide-react';
import { TrialStatus, formatRemaining, TRIAL_HOURS } from '../utils/trial';

export default function TrialBanner({ status }: { status: TrialStatus }) {
  if (!status.active) return null;

  /*
   * SEUILS D'ALERTE — resserres en v57 pour coller a l'essai de 6 h.
   * Avec les anciens seuils (6 h / 2 h), l'alerte orange se declenchait
   * a mi-parcours : trop tot pour etre prise au serieux.
   * Ils sont exprimes en FRACTIONS de la duree totale, afin de rester
   * justes si la duree de l'essai change a nouveau :
   *   - rouge  : dernier dixieme    (0,6 h sur 6 h)
   *   - orange : dernier trois-dixiemes (1,8 h sur 6 h)
   */
  const hoursLeft = status.remainingMs / 3_600_000;
  const redAt = TRIAL_HOURS * 0.1;
  const orangeAt = TRIAL_HOURS * 0.3;
  const tone = hoursLeft < redAt
    ? 'bg-red-700'
    : hoursLeft < orangeAt ? 'bg-orange-600' : 'bg-[#046a38]';

  return (
    <div
      data-testid="bandeau-essai"
      className={`${tone} text-white text-center text-[11px] font-bold py-1 px-2 print:hidden`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        VERSION D’ESSAI — il reste{' '}
        <span data-testid="temps-restant-essai">{formatRemaining(status)}</span>
      </span>
    </div>
  );
}
