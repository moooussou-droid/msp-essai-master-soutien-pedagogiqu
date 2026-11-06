/**
 * Illustrations SVG générées LOCALEMENT (data URI) — remplace source.unsplash.com
 * qui n'existe plus (HTTP 503) : toutes les images des cartes étaient cassées.
 *
 * Avantages :
 * - Fonctionne 100 % hors-ligne (aucune requête réseau)
 * - Cohérent avec la charte visuelle (vert/jaune/rouge du drapeau béninois)
 * - Léger (quelques Ko) et instantané
 */

const PALETTES = [
  ['#047857', '#065f46', '#a7f3d0'], // vert émeraude
  ['#0d9488', '#0f766e', '#99f6e4'], // teal
  ['#d97706', '#b45309', '#fde68a'], // ambre
  ['#1d4ed8', '#1e40af', '#bfdbfe'], // bleu
  ['#7c3aed', '#5b21b6', '#ddd6fe'], // violet
  ['#be123c', '#881337', '#fecdd3'], // rouge
  ['#0e7490', '#155e75', '#a5f3fc'], // cyan
  ['#15803d', '#166534', '#bbf7d0'], // vert foncé
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Emojis par thème (matière / discipline / mot-clé) pour des illustrations parlantes. */
const THEME_EMOJIS: { keys: string[]; emoji: string }[] = [
  { keys: ['math', 'nombre', 'addition', 'multiplication', 'division', 'soustraction', 'compte', 'calcul', 'fraction'], emoji: '🔢' },
  { keys: ['lecture', 'lire', 'alphabet', 'syllabe', 'son', 'dictée', 'ote'], emoji: '📖' },
  { keys: ['écrit', 'ecrit', 'redaction', 'phrase', 'production', 'expression'], emoji: '✍️' },
  { keys: ['grammaire', 'verbe', 'nom', 'adjectif', 'conjugaison', 'français'], emoji: '📚' },
  { keys: ['science', 'plante', 'animal', 'eau', 'corps', 'experiment', 'sciences'], emoji: '🔬' },
  { keys: ['sante', 'hygiene', 'microbe', 'vaccin', 'dents', 'aliment', 'paludisme'], emoji: '🩺' },
  { keys: ['sport', 'eps', 'course', 'jeu', 'ballon'], emoji: '⚽' },
  { keys: ['musique', 'chant', 'chanson', 'artistique', 'dessin', 'peinture', 'coloriage'], emoji: '🎨' },
  { keys: ['drapeau', 'benin', 'nation', 'citoyen', 'hymne', 'republique'], emoji: '🇧🇯' },
  { keys: ['route', 'feu', 'travers', 'circulation', 'conduite', 'panneau', 'securite'], emoji: '🚦' },
  { keys: ['carte', 'fleuve', 'montagne', 'geographie', 'ville', 'pays', 'region'], emoji: '🗺️' },
  { keys: ['histoire', 'ancien', 'roi', 'royaume', 'esclave'], emoji: '🏛️' },
  { keys: ['animal', 'chat', 'chien', 'oiseau', 'chevre', 'ferme', 'mouton'], emoji: '🐄' },
  { keys: ['ecole', 'eleve', 'classe', 'maitre', 'enseignant', 'apprendre'], emoji: '🏫' },
  { keys: ['internet', 'ordinateur', 'ecran', 'tablette', 'telephone', 'digital', 'hightech'], emoji: '💻' },
  { keys: ['argent', 'epargne', 'banque', 'finance', 'economie', 'prix', 'marche'], emoji: '💵' },
  { keys: ['métier', 'metier', 'travail', 'orientation', 'profession'], emoji: '💼' },
];

function emojiFor(text: string): string {
  const lower = text.toLowerCase();
  for (const t of THEME_EMOJIS) {
    if (t.keys.some((k) => lower.includes(k))) return t.emoji;
  }
  return '🎓';
}

/**
 * Génère une illustration SVG (data URI) pour un texte donné (titre/thème).
 * L'emoji + les initiales + un dégradé stable rendent chaque carte unique.
 */
export function illustrate(subject: string, label?: string, width = 900, height = 520): string {
  const seed = hashCode(subject);
  const palette = PALETTES[seed % PALETTES.length];
  const emoji = emojiFor(subject);

  const initials = (label || subject)
    .replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const deco1 = (seed % 3) + 1;
  const circles = Array.from({ length: 5 })
    .map((_, i) => {
      const cx = ((seed * (i + 3)) % 900);
      const cy = ((seed * (i + 7)) % 400) + 40;
      const r = 22 + ((seed + i * 37) % 60);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.07"/>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${palette[0]}"/>
    <stop offset="100%" stop-color="${palette[1]}"/>
  </linearGradient>
  <radialGradient id="h" cx="0.2" cy="0.15" r="1.2">
    <stop offset="0%" stop-color="${palette[2]}" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="${palette[2]}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${width}" height="${height}" fill="url(#g)"/>
<rect width="${width}" height="${height}" fill="url(#h)"/>
${circles}
<text x="${width / 2}" y="${height / 2 - 40}" text-anchor="middle" font-size="190"${deco1 === 1 ? '' : deco1 === 2 ? ' transform="rotate(-6 ' + width / 2 + ' ' + height / 2 + ')"' : ' transform="rotate(6 ' + width / 2 + ' ' + height / 2 + ')"'}>${emoji}</text>
${
  initials
    ? `<text x="${width / 2}" y="${height - 60}" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#ffffff" opacity="0.9">${initials}</text>`
    : ''
}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default illustrate;
