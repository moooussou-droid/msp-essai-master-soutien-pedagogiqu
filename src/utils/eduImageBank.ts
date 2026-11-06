/**
 * BANQUE D'IMAGES ÉDUCATIVES (v41).
 *
 * 12 planches du contexte béninois puis africain, dessinées en vectoriel
 * (SVG) : elles restent NETTES à n'importe quelle taille d'impression et ne
 * pèsent que quelques kilo-octets chacune, ce qui garde l'application
 * légère et utilisable hors ligne.
 *
 * ÉCONOMIE (règle du Super Administrateur, §v41) :
 * chaque image vaut 100 FCFA, à régler auprès du Super Administrateur avant
 * tout téléchargement (PDF, PNG ou JPEG). Le mécanisme de paiement et de
 * déverrouillage est celui de la v38 (`coursePayment.ts`) : aucune
 * duplication, et le Super Administrateur garde la main.
 */
import { DrawOptions } from './eduImageEngine';
import { signatureFor } from './documentSignature';

export const IMAGE_PRICE_FCFA = 100;

export type BankCategory = 'Bénin' | 'Afrique';

export interface BankImage {
  id: string;
  title: string;
  /** Ce que la planche permet d'enseigner. */
  description: string;
  category: BankCategory;
  /** Matières concernées, pour la recherche. */
  subjects: string[];
  levels: string[];
  keywords: string[];
  /** Prix en francs CFA. */
  price: number;
  draw: (o: DrawOptions) => string;
}

/* ------------------------------------------------------------------ */
/* Palette et briques (planches soignées, propres à la banque)         */
/* ------------------------------------------------------------------ */

const C = {
  ink: '#16181d',
  sky: '#cfe6f4',
  skyWarm: '#fbe3c2',
  sun: '#f2b632',
  sand: '#e6d5a8',
  earth: '#c58b5c',
  laterite: '#b5643c',
  green: '#4e9c52',
  greenDark: '#2d6a35',
  greenLight: '#83c06a',
  water: '#4f9fc4',
  waterDark: '#2d7ba0',
  wall: '#e7cfa6',
  roofStraw: '#c9973f',
  roofTin: '#8c9aa5',
  skin: '#8a5330',
  skinDark: '#6d3f22',
  red: '#c8453c',
  blue: '#39699e',
  yellow: '#efc44b',
  purple: '#7a4f9c',
  white: '#ffffff',
  grey: '#8b8b8b',
};

function f(o: DrawOptions, c: string): string {
  return o.color ? c : 'none';
}

function sw(o: DrawOptions, extra = 0): string {
  return String(o.stroke + extra);
}

function skyBand(o: DrawOptions, h = 350, warm = false): string {
  return o.color ? `<rect x="0" y="0" width="800" height="${h}" fill="${warm ? C.skyWarm : C.sky}"/>` : '';
}

function groundBand(o: DrawOptions, y: number, color = C.sand): string {
  return `${o.color ? `<rect x="0" y="${y}" width="800" height="${540 - y}" fill="${color}"/>` : ''}
    <line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`;
}

function sunDisc(o: DrawOptions, cx: number, cy: number, r = 34): string {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<line x1="${(cx + Math.cos(a) * (r + 8)).toFixed(1)}" y1="${(cy + Math.sin(a) * (r + 8)).toFixed(1)}" x2="${(cx + Math.cos(a) * (r + 26)).toFixed(1)}" y2="${(cy + Math.sin(a) * (r + 26)).toFixed(1)}" stroke="${C.ink}" stroke-width="${sw(o)}" stroke-linecap="round"/>`;
  }).join('');
  return `${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f(o, C.sun)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`;
}

function palm(o: DrawOptions, x: number, y: number, s = 1): string {
  const fronds = Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI + (i * Math.PI) / 7;
    const ex = x + Math.cos(a) * 88 * s;
    const ey = y - 152 * s + Math.sin(a) * 58 * s;
    return `<path d="M ${x} ${y - 152 * s} Q ${(x + ex) / 2} ${y - 196 * s} ${ex} ${ey}" fill="${f(o, C.greenDark)}" stroke="${C.ink}" stroke-width="${sw(o)}" stroke-linecap="round"/>`;
  }).join('');
  return `<path d="M ${x - 10 * s} ${y} Q ${x - 4 * s} ${y - 80 * s} ${x - 5 * s} ${y - 152 * s} L ${x + 5 * s} ${y - 152 * s} Q ${x + 4 * s} ${y - 80 * s} ${x + 10 * s} ${y} Z" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>${fronds}<circle cx="${x}" cy="${y - 152 * s}" r="${7 * s}" fill="${f(o, C.greenDark)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`;
}

function baobab(o: DrawOptions, x: number, y: number, s = 1): string {
  return `<path d="M ${x - 46 * s} ${y} Q ${x - 30 * s} ${y - 110 * s} ${x - 20 * s} ${y - 150 * s} L ${x + 20 * s} ${y - 150 * s} Q ${x + 30 * s} ${y - 110 * s} ${x + 46 * s} ${y} Z" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o, 0.4)}"/>
    ${Array.from({ length: 6 }, (_, i) => {
      const a = -Math.PI * 0.85 + (i * Math.PI * 0.7) / 5;
      const ex = x + Math.cos(a) * 92 * s;
      const ey = y - 150 * s + Math.sin(a) * 52 * s;
      return `<path d="M ${x} ${y - 150 * s} Q ${(x + ex) / 2} ${ey - 26 * s} ${ex} ${ey}" fill="none" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}" stroke-linecap="round"/>`;
    }).join('')}
    <ellipse cx="${x}" cy="${y - 186 * s}" rx="${104 * s}" ry="${34 * s}" fill="${f(o, C.greenDark)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`;
}

function personStanding(o: DrawOptions, x: number, y: number, s = 1, cloth = C.red, headWrap = false): string {
  return `<circle cx="${x}" cy="${y - 112 * s}" r="${19 * s}" fill="${f(o, C.skin)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
    ${headWrap ? `<path d="M ${x - 20 * s} ${y - 120 * s} Q ${x} ${y - 146 * s} ${x + 20 * s} ${y - 120 * s} Q ${x} ${y - 130 * s} ${x - 20 * s} ${y - 120 * s} Z" fill="${f(o, C.yellow)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>` : ''}
    <path d="M ${x - 23 * s} ${y - 32 * s} L ${x - 19 * s} ${y - 88 * s} Q ${x} ${y - 99 * s} ${x + 19 * s} ${y - 88 * s} L ${x + 23 * s} ${y - 32 * s} Z" fill="${f(o, cloth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
    <line x1="${x - 19 * s}" y1="${y - 80 * s}" x2="${x - 35 * s}" y2="${y - 42 * s}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>
    <line x1="${x + 19 * s}" y1="${y - 80 * s}" x2="${x + 35 * s}" y2="${y - 42 * s}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>
    <line x1="${x - 10 * s}" y1="${y - 32 * s}" x2="${x - 12 * s}" y2="${y}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>
    <line x1="${x + 10 * s}" y1="${y - 32 * s}" x2="${x + 12 * s}" y2="${y}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>`;
}

function lab(o: DrawOptions, px: number, py: number, text: string, tx: number, ty: number, anchor: 'start' | 'middle' | 'end' = 'start'): string {
  if (!o.labels) return '';
  return `<line x1="${px}" y1="${py}" x2="${tx}" y2="${ty}" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="4 3"/>
    <circle cx="${px}" cy="${py}" r="3.2" fill="${C.ink}"/>
    <text x="${tx}" y="${ty - 6}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="17" fill="${C.ink}">${text}</text>`;
}

/* ------------------------------------------------------------------ */
/* Les 12 planches                                                     */
/* ------------------------------------------------------------------ */

export const BANK_IMAGES: BankImage[] = [
  {
    id: 'bnk-01-village-lacustre',
    title: 'Ganvié, le village lacustre',
    description: "Le village sur pilotis du lac Nokoué : habitat, pirogues et vie sur l'eau. Support idéal pour l'étude du milieu et de l'habitat béninois.",
    category: 'Bénin',
    subjects: ['Étude du milieu', 'Géographie', 'Histoire'],
    levels: ['Primaire', 'Secondaire'],
    keywords: ['ganvie', 'lac', 'pilotis', 'pirogue', 'nokoue', 'village', 'eau', 'habitat'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 300)}${sunDisc(o, 690, 74, 30)}
      ${o.color ? `<rect x="0" y="300" width="800" height="240" fill="${C.water}"/>` : ''}
      <line x1="0" y1="300" x2="800" y2="300" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${Array.from({ length: 7 }, (_, i) => `<path d="M ${20 + i * 120} ${360 + (i % 2) * 40} q 26 -12 52 0 q 26 12 52 0" fill="none" stroke="${o.color ? C.waterDark : C.ink}" stroke-width="${sw(o)}" stroke-linecap="round"/>`).join('')}
      <g>
        <line x1="180" y1="300" x2="180" y2="392" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
        <line x1="300" y1="300" x2="300" y2="392" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
        <rect x="150" y="196" width="180" height="104" fill="${f(o, C.wall)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
        <path d="M 130 196 L 240 132 L 350 196 Z" fill="${f(o, C.roofStraw)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
        <rect x="215" y="240" width="46" height="60" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
        <rect x="166" y="220" width="34" height="30" fill="${f(o, C.sky)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      </g>
      <g>
        <line x1="520" y1="300" x2="520" y2="378" stroke="${C.ink}" stroke-width="${sw(o, 1)}"/>
        <line x1="620" y1="300" x2="620" y2="378" stroke="${C.ink}" stroke-width="${sw(o, 1)}"/>
        <rect x="498" y="226" width="144" height="74" fill="${f(o, C.wall)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
        <path d="M 482 226 L 570 176 L 658 226 Z" fill="${f(o, C.roofStraw)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
        <rect x="552" y="258" width="36" height="42" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      </g>
      <path d="M 300 452 Q 400 428 512 452 L 492 480 Q 400 496 320 480 Z" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o, 0.4)}"/>
      ${personStanding(o, 400, 452, 0.62, C.blue)}
      <line x1="424" y1="352" x2="452" y2="454" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>
      ${lab(o, 240, 160, 'Le toit de paille', 60, 130)}
      ${lab(o, 180, 350, 'Les pilotis', 40, 250)}
      ${lab(o, 400, 466, 'La pirogue', 600, 452)}`,
  },
  {
    id: 'bnk-02-marche-dantokpa',
    title: 'Le grand marché',
    description: "Étals, vendeuses et marchandises : idéal pour l'éducation financière (prix, monnaie, achat et vente) et le vocabulaire du commerce.",
    category: 'Bénin',
    subjects: ['Éducation financière', 'Vocabulaire', 'Calcul'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['marche', 'dantokpa', 'vendeuse', 'commerce', 'argent', 'prix', 'fruits', 'panier'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 366, true)}${sunDisc(o, 110, 70, 28)}${groundBand(o, 366, C.sand)}
      <path d="M 120 296 L 400 210 L 680 296 Z" fill="${f(o, C.red)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="150" y="296" width="500" height="18" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <line x1="190" y1="314" x2="190" y2="400" stroke="${C.ink}" stroke-width="${sw(o, 1)}"/>
      <line x1="610" y1="314" x2="610" y2="400" stroke="${C.ink}" stroke-width="${sw(o, 1)}"/>
      <ellipse cx="400" cy="430" rx="250" ry="16" fill="${f(o, '#d9c79a')}" stroke="none"/>
      ${[0, 1, 2].map((i) => `<circle cx="${240 + i * 42}" cy="282" r="16" fill="${f(o, '#e2703a')}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`).join('')}
      ${[0, 1, 2].map((i) => `<circle cx="${420 + i * 42}" cy="282" r="16" fill="${f(o, C.greenLight)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`).join('')}
      <path d="M 560 282 q 18 -22 36 0 q -18 10 -36 0 Z" fill="${f(o, C.yellow)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${personStanding(o, 300, 400, 0.95, C.purple, true)}
      ${personStanding(o, 520, 400, 0.9, C.blue)}
      <ellipse cx="520" cy="268" rx="34" ry="14" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${personStanding(o, 700, 400, 0.8, C.green)}
      ${lab(o, 400, 240, 'L auvent', 120, 170)}
      ${lab(o, 282, 282, 'Les fruits', 80, 470)}
      ${lab(o, 300, 320, 'La vendeuse', 560, 180)}`,
  },
  {
    id: 'bnk-03-ecole-primaire',
    title: 'La classe à l’école primaire',
    description: "Tableau, maître et élèves attentifs : utile pour la rentrée, les règles de vie de la classe et le vocabulaire scolaire.",
    category: 'Bénin',
    subjects: ['Vocabulaire', 'Éducation civique'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['ecole', 'classe', 'eleve', 'maitre', 'tableau', 'banc', 'cartable', 'apprendre'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#f6f1e4"/>` : ''}
      <rect x="0" y="470" width="800" height="70" fill="${f(o, C.earth)}" stroke="none"/>
      <line x1="0" y1="470" x2="800" y2="470" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="60" y="60" width="330" height="190" rx="6" fill="${f(o, '#2f4a3c')}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <text x="225" y="150" text-anchor="middle" font-family="Arial" font-size="46" fill="${o.color ? '#ffffff' : C.ink}">A B C</text>
      <text x="225" y="205" text-anchor="middle" font-family="Arial" font-size="34" fill="${o.color ? '#ffffff' : C.ink}">1 2 3</text>
      ${personStanding(o, 520, 330, 1.15, C.blue)}
      <line x1="556" y1="290" x2="590" y2="230" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>
      <rect x="90" y="420" width="470" height="16" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="120" y="436" width="16" height="34" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="514" y="436" width="16" height="34" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${personStanding(o, 180, 420, 0.72, C.red)}
      ${personStanding(o, 320, 420, 0.72, C.yellow, true)}
      ${personStanding(o, 460, 420, 0.72, C.purple)}
      ${lab(o, 225, 150, 'Le tableau', 430, 70)}
      ${lab(o, 520, 250, 'Le maitre', 660, 200)}
      ${lab(o, 320, 380, 'Les eleves', 640, 400)}`,
  },
  {
    id: 'bnk-04-cycle-eau',
    title: 'Le cycle de l’eau',
    description: "Évaporation, nuages, pluie et rivière : le schéma complet du cycle de l'eau, avec légendes, pour les sciences d'observation.",
    category: 'Afrique',
    subjects: ['Sciences', 'Éducation environnementale'],
    levels: ['Primaire', 'Secondaire'],
    keywords: ['eau', 'cycle', 'pluie', 'nuage', 'evaporation', 'riviere', 'science'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 380)}${sunDisc(o, 700, 70, 30)}
      <ellipse cx="250" cy="110" rx="108" ry="48" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <ellipse cx="330" cy="132" rx="76" ry="38" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${Array.from({ length: 8 }, (_, i) => `<line x1="${196 + i * 30}" y1="172" x2="${186 + i * 30}" y2="238" stroke="${o.color ? C.waterDark : C.ink}" stroke-width="${sw(o, 0.8)}" stroke-linecap="round"/>`).join('')}
      ${o.color ? `<rect x="0" y="380" width="800" height="160" fill="${C.water}"/>` : ''}
      <path d="M 0 380 Q 200 362 400 380 T 800 380" fill="none" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${Array.from({ length: 4 }, (_, i) => `<path d="M ${600 + i * 16} 372 Q ${608 + i * 16} 326 ${600 + i * 16} 282" fill="none" stroke="${C.ink}" stroke-width="${sw(o)}" stroke-dasharray="7 5"/>`).join('')}
      ${palm(o, 76, 376, 0.62)}
      <path d="M 0 470 Q 180 452 360 470 T 800 470" fill="none" stroke="${o.color ? C.waterDark : C.ink}" stroke-width="${sw(o)}"/>
      ${lab(o, 300, 120, 'Le nuage', 470, 86)}
      ${lab(o, 240, 205, 'La pluie', 92, 250)}
      ${lab(o, 400, 440, 'La riviere', 330, 512)}
      ${lab(o, 632, 322, 'L evaporation', 592, 240)}`,
  },
  {
    id: 'bnk-05-champ-mais',
    title: 'Le champ de maïs',
    description: "Le cultivateur, sa houe et les plants de maïs à différents stades : agriculture, saisons et travail de la terre.",
    category: 'Bénin',
    subjects: ['Sciences', 'Étude du milieu'],
    levels: ['Primaire'],
    keywords: ['champ', 'mais', 'agriculture', 'cultivateur', 'houe', 'recolte', 'semer', 'plante'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 320)}${sunDisc(o, 690, 70, 30)}${groundBand(o, 320, C.earth)}
      ${Array.from({ length: 6 }, (_, i) => {
        const x = 96 + i * 122;
        return `<line x1="${x}" y1="486" x2="${x}" y2="344" stroke="${o.color ? C.greenDark : C.ink}" stroke-width="${sw(o, 1.4)}"/>
          <path d="M ${x} 372 Q ${x - 48} 350 ${x - 56} 390" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
          <path d="M ${x} 396 Q ${x + 48} 374 ${x + 56} 414" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
          <path d="M ${x} 424 Q ${x - 42} 406 ${x - 50} 442" fill="${f(o, C.greenLight)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
          <ellipse cx="${x}" cy="338" rx="11" ry="26" fill="${f(o, C.yellow)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>`;
      }).join('')}
      ${personStanding(o, 700, 330, 0.72, C.blue)}
      <line x1="724" y1="292" x2="756" y2="336" stroke="${C.ink}" stroke-width="${sw(o, 1)}" stroke-linecap="round"/>
      <path d="M 750 330 L 772 344 L 760 352 Z" fill="${f(o, C.grey)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${lab(o, 96, 338, 'L epi de mais', 96, 180)}
      ${lab(o, 218, 400, 'La feuille', 330, 200)}
      ${lab(o, 700, 300, 'Le cultivateur', 540, 150)}`,
  },
  {
    id: 'bnk-06-hygiene-mains',
    title: 'Se laver les mains',
    description: "Les gestes d'hygiène : eau propre, savon, bassine. Support de campagne de santé scolaire et d'éducation à la propreté.",
    category: 'Afrique',
    subjects: ['Santé', 'Éducation civique'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['hygiene', 'sante', 'laver', 'main', 'savon', 'eau', 'propre', 'microbe', 'maladie'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#eaf5f1"/>` : ''}
      <rect x="180" y="96" width="140" height="170" rx="12" fill="${f(o, '#9ed4e6')}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <rect x="226" y="54" width="48" height="46" rx="6" fill="${f(o, C.grey)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <path d="M 250 266 Q 244 320 254 372" fill="none" stroke="${o.color ? C.water : C.ink}" stroke-width="${sw(o, 2)}" stroke-linecap="round"/>
      <ellipse cx="262" cy="424" rx="140" ry="46" fill="${f(o, '#c3e3ee')}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <path d="M 132 424 Q 262 482 392 424" fill="${f(o, C.water)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="556" y="228" width="88" height="52" rx="10" fill="${f(o, '#f0dd93')}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <text x="600" y="262" text-anchor="middle" font-family="Arial" font-size="21" fill="${C.ink}">SAVON</text>
      ${personStanding(o, 520, 500, 1.05, C.green)}
      ${[0, 1, 2].map((i) => `<circle cx="${430 + i * 26}" cy="${392 - i * 12}" r="7" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="1.4"/>`).join('')}
      ${lab(o, 600, 254, 'Le savon', 668, 186)}
      ${lab(o, 252, 322, 'L eau propre', 74, 300)}
      ${lab(o, 200, 432, 'La bassine', 70, 492)}
      ${lab(o, 520, 400, 'Les mains', 660, 400)}`,
  },
  {
    id: 'bnk-07-animaux-ferme',
    title: 'Les animaux de la basse-cour',
    description: "Poule, chèvre et mouton : reconnaître les animaux domestiques, leurs noms et leurs petits. Vocabulaire et sciences.",
    category: 'Bénin',
    subjects: ['Sciences', 'Vocabulaire'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['animal', 'animaux', 'poule', 'chevre', 'mouton', 'elevage', 'ferme', 'basse-cour'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 340)}${sunDisc(o, 690, 66, 28)}${groundBand(o, 340, C.sand)}
      <ellipse cx="200" cy="410" rx="66" ry="44" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <circle cx="262" cy="370" r="27" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <path d="M 286 362 L 308 370 L 286 378 Z" fill="${f(o, C.yellow)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <path d="M 252 346 Q 262 326 272 346" fill="${f(o, C.red)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <circle cx="268" cy="366" r="3.4" fill="${C.ink}"/>
      <line x1="184" y1="452" x2="184" y2="482" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      <line x1="218" y1="452" x2="218" y2="482" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      <ellipse cx="520" cy="402" rx="78" ry="50" fill="${f(o, '#cbb99e')}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <circle cx="594" cy="360" r="29" fill="${f(o, '#cbb99e')}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <path d="M 584 336 Q 576 314 592 324" fill="none" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <path d="M 608 336 Q 616 314 600 324" fill="none" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <circle cx="602" cy="356" r="3.4" fill="${C.ink}"/>
      <path d="M 614 372 q 12 6 0 12" fill="none" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <line x1="488" y1="450" x2="488" y2="484" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      <line x1="552" y1="450" x2="552" y2="484" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      ${palm(o, 72, 340, 0.56)}
      ${lab(o, 262, 370, 'La poule', 110, 200)}
      ${lab(o, 594, 358, 'La chevre', 636, 210)}`,
  },
  {
    id: 'bnk-08-formes-geometriques',
    title: 'Les formes géométriques',
    description: "Carré, cercle, triangle, rectangle et losange, nommés et colorés : la planche de référence pour la géométrie au primaire.",
    category: 'Afrique',
    subjects: ['Mathématiques', 'Géométrie'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['geometrie', 'forme', 'carre', 'cercle', 'triangle', 'rectangle', 'losange', 'mathematique'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#fbfaf3"/>` : ''}
      <rect x="86" y="96" width="150" height="150" fill="${f(o, '#efb0b0')}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <circle cx="430" cy="171" r="78" fill="${f(o, '#a9cff0')}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <path d="M 652 96 L 738 246 L 566 246 Z" fill="${f(o, '#b7e0a4')}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <rect x="86" y="340" width="216" height="120" fill="${f(o, '#f2dfa4')}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <path d="M 486 340 L 566 400 L 486 460 L 406 400 Z" fill="${f(o, '#d2b8ec')}" stroke="${C.ink}" stroke-width="${sw(o, 0.8)}"/>
      <text x="161" y="286" text-anchor="middle" font-family="Arial" font-size="23" fill="${C.ink}">Le carre</text>
      <text x="430" y="286" text-anchor="middle" font-family="Arial" font-size="23" fill="${C.ink}">Le cercle</text>
      <text x="652" y="286" text-anchor="middle" font-family="Arial" font-size="23" fill="${C.ink}">Le triangle</text>
      <text x="194" y="496" text-anchor="middle" font-family="Arial" font-size="23" fill="${C.ink}">Le rectangle</text>
      <text x="486" y="496" text-anchor="middle" font-family="Arial" font-size="23" fill="${C.ink}">Le losange</text>
      <text x="690" y="420" text-anchor="middle" font-family="Arial" font-size="19" fill="${C.ink}">4 cotes</text>
      <text x="690" y="446" text-anchor="middle" font-family="Arial" font-size="19" fill="${C.ink}">egaux</text>`,
  },
  {
    id: 'bnk-09-proteger-environnement',
    title: 'Protéger notre environnement',
    description: "Jeter les déchets à la poubelle et planter un arbre : les deux gestes citoyens, en une image directement exploitable en classe.",
    category: 'Afrique',
    subjects: ['Éducation environnementale', 'Éducation civique'],
    levels: ['Primaire'],
    keywords: ['environnement', 'dechet', 'poubelle', 'arbre', 'planter', 'proprete', 'pollution', 'nature'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 350)}${sunDisc(o, 700, 70, 30)}${groundBand(o, 350, C.sand)}
      <path d="M 236 480 L 252 352 L 352 352 L 368 480 Z" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <rect x="242" y="330" width="120" height="24" rx="7" fill="${f(o, C.greenDark)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="288" y="306" width="28" height="26" fill="${f(o, C.greenDark)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <path d="M 302 392 L 314 414 L 290 414 Z" fill="${o.color ? C.white : 'none'}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <path d="M 302 440 L 314 418 L 290 418 Z" fill="${o.color ? C.white : 'none'}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <path d="M 566 350 L 572 286 L 584 286 L 590 350 Z" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <circle cx="578" cy="246" r="54" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <circle cx="534" cy="272" r="34" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <circle cx="622" cy="272" r="34" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="${sw(o, 0.5)}"/>
      <ellipse cx="578" cy="352" rx="56" ry="12" fill="${f(o, C.earth)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${personStanding(o, 130, 470, 0.82, C.blue)}
      ${personStanding(o, 700, 470, 0.8, C.yellow, true)}
      ${lab(o, 302, 340, 'La poubelle', 96, 200)}
      ${lab(o, 578, 200, 'L arbre plante', 614, 148)}`,
  },
  {
    id: 'bnk-10-savane-baobab',
    title: 'La savane africaine',
    description: "Baobab, herbes hautes et horizon : le paysage de savane pour la géographie, les milieux naturels et l'expression écrite.",
    category: 'Afrique',
    subjects: ['Géographie', 'Expression écrite'],
    levels: ['Primaire', 'Secondaire'],
    keywords: ['savane', 'baobab', 'paysage', 'afrique', 'arbre', 'herbe', 'nature', 'geographie'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 370, true)}${sunDisc(o, 640, 92, 42)}${groundBand(o, 370, C.sand)}
      ${baobab(o, 250, 370, 1)}
      ${baobab(o, 620, 370, 0.56)}
      ${Array.from({ length: 22 }, (_, i) => {
        const x = 20 + i * 36;
        const h = 24 + ((i * 13) % 20);
        return `<path d="M ${x} 470 q 5 -${h} 10 0" fill="none" stroke="${o.color ? C.greenDark : C.ink}" stroke-width="${sw(o)}" stroke-linecap="round"/>`;
      }).join('')}
      ${Array.from({ length: 3 }, (_, i) => `<path d="M ${96 + i * 30} ${128 + i * 14} q 12 -12 24 0 q 12 12 24 0" fill="none" stroke="${C.ink}" stroke-width="${sw(o)}" stroke-linecap="round"/>`).join('')}
      ${lab(o, 250, 184, 'Le baobab', 458, 150)}
      ${lab(o, 400, 466, 'Les herbes hautes', 380, 512)}`,
  },
  {
    id: 'bnk-11-famille-repas',
    title: 'La famille au repas',
    description: "Parents et enfants partageant le repas : la famille, les liens de parenté, le respect et le vocabulaire de la maison.",
    category: 'Bénin',
    subjects: ['Éducation civique', 'Vocabulaire'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['famille', 'repas', 'parent', 'pere', 'mere', 'enfant', 'maison', 'manger', 'partage'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#fbf1e2"/>` : ''}
      <rect x="0" y="470" width="800" height="70" fill="${f(o, C.earth)}"/>
      <line x1="0" y1="470" x2="800" y2="470" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <ellipse cx="400" cy="360" rx="196" ry="62" fill="${f(o, C.roofStraw)}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <ellipse cx="400" cy="348" rx="76" ry="26" fill="${f(o, C.white)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <ellipse cx="400" cy="344" rx="52" ry="16" fill="${f(o, C.yellow)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <line x1="300" y1="422" x2="300" y2="470" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      <line x1="500" y1="422" x2="500" y2="470" stroke="${C.ink}" stroke-width="${sw(o, 1.2)}"/>
      ${personStanding(o, 172, 400, 0.92, C.blue)}
      ${personStanding(o, 628, 400, 0.9, C.red, true)}
      ${personStanding(o, 300, 306, 0.6, C.purple)}
      ${personStanding(o, 500, 306, 0.58, C.green)}
      ${lab(o, 172, 300, 'Le pere', 60, 180)}
      ${lab(o, 628, 300, 'La mere', 692, 180)}
      ${lab(o, 400, 344, 'Le plat', 396, 246)}`,
  },
  {
    id: 'bnk-12-securite-route',
    title: 'La sécurité sur la route',
    description: "Passage piéton, véhicule et piéton attentif : l'éducation à la sécurité routière, essentielle sur le trajet de l'école.",
    category: 'Bénin',
    subjects: ['Éducation civique', 'Santé'],
    levels: ['Maternelle', 'Primaire'],
    keywords: ['route', 'securite', 'pieton', 'voiture', 'moto', 'zemidjan', 'circulation', 'traverser'],
    price: IMAGE_PRICE_FCFA,
    draw: (o) => `${skyBand(o, 320)}${sunDisc(o, 120, 68, 28)}${groundBand(o, 320, C.sand)}
      <rect x="0" y="372" width="800" height="106" fill="${f(o, '#9a9a9a')}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${430 + i * 34}" y="372" width="20" height="106" fill="${o.color ? C.white : 'none'}" stroke="${C.ink}" stroke-width="1.4"/>`).join('')}
      <rect x="86" y="292" width="200" height="66" rx="14" fill="${f(o, C.blue)}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <rect x="132" y="250" width="108" height="46" rx="10" fill="${f(o, '#bcdcef')}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <circle cx="132" cy="362" r="26" fill="${f(o, '#3a3a3a')}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <circle cx="240" cy="362" r="26" fill="${f(o, '#3a3a3a')}" stroke="${C.ink}" stroke-width="${sw(o, 0.6)}"/>
      <circle cx="132" cy="362" r="9" fill="${f(o, C.grey)}" stroke="${C.ink}" stroke-width="1.2"/>
      <circle cx="240" cy="362" r="9" fill="${f(o, C.grey)}" stroke="${C.ink}" stroke-width="1.2"/>
      ${personStanding(o, 640, 372, 0.84, C.yellow)}
      <rect x="694" y="196" width="14" height="176" fill="${f(o, C.grey)}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <rect x="672" y="140" width="58" height="60" rx="8" fill="${f(o, '#3a3a3a')}" stroke="${C.ink}" stroke-width="${sw(o)}"/>
      <circle cx="701" cy="158" r="12" fill="${f(o, C.red)}" stroke="${C.ink}" stroke-width="1.4"/>
      <circle cx="701" cy="184" r="12" fill="${f(o, C.green)}" stroke="${C.ink}" stroke-width="1.4"/>
      ${lab(o, 186, 274, 'Le vehicule', 240, 180)}
      ${lab(o, 498, 420, 'Le passage pieton', 300, 508)}
      ${lab(o, 701, 170, 'Le feu tricolore', 470, 120)}`,
  },
];

/* ------------------------------------------------------------------ */
/* Rendu et recherche                                                  */
/* ------------------------------------------------------------------ */

/** Compose le SVG complet d'une planche de la banque. */
/*
 * v42 — la signature du pied de planche n'est plus figee : elle suit la regle
 * metier commune (signature imposee, ou signature personnalisee payee 500 F).
 */
export function renderBankImage(img: BankImage, opts?: Partial<DrawOptions>): string {
  const o: DrawOptions = {
    color: opts?.color !== false,
    stroke: opts?.stroke ?? 2.6,
    labels: opts?.labels !== false,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" width="800" height="620">
  <rect x="0" y="0" width="800" height="620" fill="#ffffff"/>
  <g>${img.draw(o)}</g>
  <rect x="6" y="6" width="788" height="608" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
  <line x1="6" y1="548" x2="794" y2="548" stroke="${C.ink}" stroke-width="2"/>
  <text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${C.ink}">${esc(img.title)}</text>
  <text x="400" y="604" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666666">${esc(img.category)} — ${esc(signatureFor('application') || '')}</text>
</svg>`;
}

/**
 * Aperçu volontairement dégradé pour les images NON PAYÉES :
 * l'enseignant voit le sujet mais ne peut pas s'en servir sans régler les
 * 100 FCFA (filigrane en travers + légendes retirées).
 */
export function renderBankPreview(img: BankImage): string {
  const o: DrawOptions = { color: true, stroke: 2.6, labels: false };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" width="800" height="620">
  <rect x="0" y="0" width="800" height="620" fill="#ffffff"/>
  <g opacity="0.55">${img.draw(o)}</g>
  <rect x="6" y="6" width="788" height="608" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
  <line x1="6" y1="548" x2="794" y2="548" stroke="${C.ink}" stroke-width="2"/>
  <text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${C.ink}">${esc(img.title)}</text>
  <text x="400" y="604" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666666">Apercu — ${img.price} FCFA pour telecharger</text>
  <g transform="rotate(-24 400 300)">
    <text x="400" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="66" font-weight="bold" fill="#c62828" opacity="0.30">APERCU</text>
    <text x="400" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#c62828" opacity="0.30">${img.price} FCFA</text>
  </g>
</svg>`;
}

function esc(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

export function findBankImage(id: string): BankImage | undefined {
  return BANK_IMAGES.find((i) => i.id === id);
}

export function searchBank(query: string, category?: BankCategory | 'Toutes'): BankImage[] {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return BANK_IMAGES.filter((i) => {
    if (category && category !== 'Toutes' && i.category !== category) return false;
    if (!q) return true;
    const hay = [i.title, i.description, ...i.subjects, ...i.keywords]
      .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return hay.includes(q);
  });
}

export function totalBankImages(): number {
  return BANK_IMAGES.length;
}
