/**
 * Contenu quotidien : mot du jour / notion du jour.
 * Déterministe par date locale (le même jour → le même contenu, hors-ligne).
 */

/** Jour local (fuseau de l'appareil) au format YYYY-MM-DD. */
export function todayLocalKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Choisit un élément de façon stable pour une date donnée. */
export function pickDaily<T>(items: T[], dateKey: string): T | null {
  if (!items || items.length === 0) return null;
  let h = 0;
  for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

/** Mot/notion du jour pour aujourd'hui. */
export function pickDailyToday<T>(items: T[]): T | null {
  return pickDaily(items, todayLocalKey());
}
