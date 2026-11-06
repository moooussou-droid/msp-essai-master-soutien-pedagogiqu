/** Format texte Excel : les logiciels d'import doivent recevoir littéralement JJ/MM/AAAA. */
export const EXCEL_TEXT_FORMAT = '@';

/**
 * Convertit les dates d'enrôlement en texte JJ/MM/AAAA, et non en numéro de
 * série Excel. Certains importateurs (dont EducMaster) lisent la valeur brute
 * de la cellule et ignorent son format d'affichage : le format doit donc déjà
 * être présent dans la chaîne stockée.
 *
 * Accepte les dates ISO des champs HTML type="date" et les dates françaises
 * déjà enregistrées. Une valeur historique invalide est conservée plutôt que
 * supprimée silencieusement.
 */
export function formatDateDMY(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return '';
    return datePartsToDMY(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) ?? '';
  }
  if (typeof value !== 'string') return String(value);

  const text = value.trim();
  if (!text) return '';

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/.exec(text);
  const french = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text);
  if (iso) {
    return datePartsToDMY(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? text;
  }
  if (french) {
    return datePartsToDMY(Number(french[3]), Number(french[2]), Number(french[1])) ?? text;
  }
  return text;
}

function datePartsToDMY(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)
    || year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  // setUTCFullYear évite l'interprétation spéciale de Date.UTC pour les années 0–99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}
