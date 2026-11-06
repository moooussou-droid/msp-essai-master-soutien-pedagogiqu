/**
 * Normalisation de texte pour la recherche : insensible à la casse ET aux accents.
 * « Énergie », « energie » et « énergie » deviennent tous « energie ».
 */

export function normalizeSearch(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .trim();
}
