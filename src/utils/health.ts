/** Parse un nombre avec virgule décimale (« 72,5 » → 72.5). Retourne undefined si vide/invalide. */
function parseDecimal(value?: string | number | null): number | undefined {
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  const v = (value || '').trim().replace(/,/g, '.').replace(/\s+/g, '');
  if (!v) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

export function calculateBMI(weightKg?: number | string, heightCm?: number | string): number | null {
  const weight = parseDecimal(weightKg);
  const height = parseDecimal(heightCm);
  if (weight === undefined || height === undefined || !weight || !height || height <= 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
}

export function bmiLabel(bmi: number | null): string {
  if (bmi === null) return 'IMC non calculé';
  if (bmi < 18.5) return 'Surveillance : maigreur possible';
  if (bmi < 25) return 'Corpulence normale';
  if (bmi < 30) return 'Surveillance : surpoids possible';
  return 'Surveillance : obésité possible';
}

export { parseDecimal };
