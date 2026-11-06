/**
 * Calcul de moyenne pondérée (barèmes variés + coefficients).
 *
 * Chaque ligne : note / barème → note sur 20, multipliée par son coefficient.
 * Les lignes invalides (note vide, barème ≤ 0, coefficient ≤ 0) sont ignorées.
 */

export interface AverageLine {
  matiere: string;
  note: string;
  bareme: string;
  coef: string;
}

export interface WeightedAverageResult {
  moyenne: number | null;
  count: number;
}

export function computeWeightedAverage(lines: AverageLine[]): WeightedAverageResult {
  let totalPoints = 0;
  let totalCoef = 0;
  let count = 0;
  for (const line of lines) {
    const note = parseFloat((line.note || '').replace(',', '.'));
    const bareme = line.bareme ? parseFloat(line.bareme.replace(',', '.')) : 20;
    const coef = line.coef ? parseFloat(line.coef.replace(',', '.')) : 1;
    if (Number.isNaN(note) || Number.isNaN(bareme) || bareme <= 0 || Number.isNaN(coef) || coef <= 0) continue;
    const sur20 = (note / bareme) * 20;
    totalPoints += sur20 * coef;
    totalCoef += coef;
    count++;
  }
  if (totalCoef <= 0) return { moyenne: null, count: 0 };
  return { moyenne: totalPoints / totalCoef, count };
}

/** Nouvelle ligne vide pour l'interface (barème /20, coefficient 1). */
export function emptyAverageLine(matiere = ''): AverageLine {
  return { matiere, note: '', bareme: '20', coef: '1' };
}
