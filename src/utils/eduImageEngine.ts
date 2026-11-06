/**
 * IA MSP DE GÉNÉRATION DE GRAVURES ET D'IMAGES ÉDUCATIVES (v41).
 *
 * ── POURQUOI CE CHOIX TECHNIQUE ──────────────────────────────────────
 * Votre règle depuis la v37 est formelle : l'IA de l'application fonctionne
 * UNIQUEMENT en local, sans clé API et sans internet. Un modèle de
 * génération d'images (type diffusion) pèse plusieurs gigaoctets et ne peut
 * pas tenir dans une application web installée sur un téléphone.
 *
 * Cette « IA » est donc un moteur de composition dirigé par l'instruction
 * de l'utilisateur : il analyse la consigne en français (sujet, style,
 * niveau, éléments demandés) et compose une gravure vectorielle (SVG) à
 * partir d'une bibliothèque de formes dessinées pour le contexte béninois.
 *
 * Avantages réels pour l'enseignant :
 *  - fonctionne en brousse, sans réseau ni abonnement ;
 *  - résultat NET à l'impression (vectoriel : aucun flou, quelle que soit
 *    la taille) — ce qu'un modèle de diffusion ne garantit pas ;
 *  - reproductible : la même instruction redonne la même image.
 *
 * Limite assumée et affichée à l'utilisateur : le moteur compose à partir
 * d'un répertoire de scènes et d'objets. Il ne « invente » pas une image
 * arbitraire comme le ferait un très grand modèle en ligne.
 */

export type ImageStyle = 'gravure' | 'couleur' | 'coloriage';
export type ImageLevel = 'Maternelle' | 'Primaire' | 'Secondaire';

export interface ImageRequest {
  /** Consigne libre saisie par l'enseignant. */
  prompt: string;
  style: ImageStyle;
  level: ImageLevel;
  /** Titre affiché sous la gravure (déduit si vide). */
  title?: string;
  /** Ajoute des étiquettes nommant les éléments (schéma légendé). */
  labels?: boolean;
}

export interface GeneratedImage {
  id: string;
  title: string;
  /** Image SVG complète, autonome. */
  svg: string;
  /** Scène reconnue dans la consigne. */
  sceneKey: string;
  sceneName: string;
  style: ImageStyle;
  level: ImageLevel;
  prompt: string;
  /** Explication de ce que le moteur a compris — transparence. */
  interpretation: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Analyse de la consigne                                             */
/* ------------------------------------------------------------------ */

function normalise(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

interface SceneDef {
  key: string;
  name: string;
  /** Mots-clés déclencheurs (sans accents). */
  keywords: string[];
  /** Légendes proposées pour le mode « schéma légendé ». */
  labels: string[];
  draw: (o: DrawOptions) => string;
}

export interface DrawOptions {
  color: boolean;
  /** Épaisseur du trait : plus épais pour les petits. */
  stroke: number;
  labels: boolean;
}

/* ------------------------------------------------------------------ */
/* Palette                                                            */
/* ------------------------------------------------------------------ */

const P = {
  ink: '#1a1a1a',
  sky: '#cfe8f5',
  sun: '#f6c343',
  ground: '#e8d9a8',
  green: '#4c9a52',
  greenDark: '#2f6b36',
  trunk: '#8a5a33',
  water: '#63b3d6',
  wall: '#e3c9a0',
  roof: '#b5533c',
  skin: '#8d5524',
  cloth: '#d94f4f',
  cloth2: '#3f7cac',
  white: '#ffffff',
};

function fill(color: boolean, c: string): string {
  return color ? c : 'none';
}

/* ------------------------------------------------------------------ */
/* Briques de dessin réutilisables                                    */
/* ------------------------------------------------------------------ */

function sky(o: DrawOptions): string {
  return o.color
    ? `<rect x="0" y="0" width="800" height="360" fill="${P.sky}"/>`
    : '';
}

function ground(o: DrawOptions, y = 360): string {
  return `${o.color ? `<rect x="0" y="${y}" width="800" height="${540 - y}" fill="${P.ground}"/>` : ''}
    <line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
}

function sun(o: DrawOptions, cx = 700, cy = 80): string {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<line x1="${(cx + Math.cos(a) * 42).toFixed(1)}" y1="${(cy + Math.sin(a) * 42).toFixed(1)}"
      x2="${(cx + Math.cos(a) * 60).toFixed(1)}" y2="${(cy + Math.sin(a) * 60).toFixed(1)}"
      stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>`;
  }).join('');
  return `${rays}<circle cx="${cx}" cy="${cy}" r="34" fill="${fill(o.color, P.sun)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
}

function palmTree(o: DrawOptions, x: number, y: number, scale = 1): string {
  const s = scale;
  const fronds = Array.from({ length: 7 }, (_, i) => {
    const a = -Math.PI + (i * Math.PI) / 6;
    const ex = x + Math.cos(a) * 85 * s;
    const ey = y - 150 * s + Math.sin(a) * 55 * s;
    return `<path d="M ${x} ${y - 150 * s} Q ${(x + ex) / 2} ${y - 190 * s} ${ex} ${ey}"
      fill="none" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>`;
  }).join('');
  return `<path d="M ${x - 9 * s} ${y} Q ${x - 4 * s} ${y - 80 * s} ${x - 5 * s} ${y - 150 * s}
      L ${x + 5 * s} ${y - 150 * s} Q ${x + 4 * s} ${y - 80 * s} ${x + 9 * s} ${y} Z"
      fill="${fill(o.color, P.trunk)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    ${fronds}
    <circle cx="${x}" cy="${y - 150 * s}" r="${7 * s}" fill="${fill(o.color, P.greenDark)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
}

function tree(o: DrawOptions, x: number, y: number, scale = 1): string {
  const s = scale;
  return `<path d="M ${x - 10 * s} ${y} L ${x - 6 * s} ${y - 90 * s} L ${x + 6 * s} ${y - 90 * s} L ${x + 10 * s} ${y} Z"
      fill="${fill(o.color, P.trunk)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <circle cx="${x}" cy="${y - 125 * s}" r="${52 * s}" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <circle cx="${x - 38 * s}" cy="${y - 100 * s}" r="${34 * s}" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <circle cx="${x + 38 * s}" cy="${y - 100 * s}" r="${34 * s}" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
}

function person(o: DrawOptions, x: number, y: number, scale = 1, cloth = P.cloth): string {
  const s = scale;
  return `<circle cx="${x}" cy="${y - 108 * s}" r="${18 * s}" fill="${fill(o.color, P.skin)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <path d="M ${x - 22 * s} ${y - 30 * s} L ${x - 18 * s} ${y - 85 * s} Q ${x} ${y - 96 * s} ${x + 18 * s} ${y - 85 * s}
      L ${x + 22 * s} ${y - 30 * s} Z" fill="${fill(o.color, cloth)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <line x1="${x - 18 * s}" y1="${y - 78 * s}" x2="${x - 34 * s}" y2="${y - 40 * s}" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>
    <line x1="${x + 18 * s}" y1="${y - 78 * s}" x2="${x + 34 * s}" y2="${y - 40 * s}" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>
    <line x1="${x - 10 * s}" y1="${y - 30 * s}" x2="${x - 12 * s}" y2="${y}" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>
    <line x1="${x + 10 * s}" y1="${y - 30 * s}" x2="${x + 12 * s}" y2="${y}" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-linecap="round"/>`;
}

function hut(o: DrawOptions, x: number, y: number, scale = 1): string {
  const s = scale;
  return `<rect x="${x - 60 * s}" y="${y - 80 * s}" width="${120 * s}" height="${80 * s}"
      fill="${fill(o.color, P.wall)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <path d="M ${x - 78 * s} ${y - 80 * s} L ${x} ${y - 140 * s} L ${x + 78 * s} ${y - 80 * s} Z"
      fill="${fill(o.color, P.roof)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
    <rect x="${x - 16 * s}" y="${y - 46 * s}" width="${32 * s}" height="${46 * s}"
      fill="${fill(o.color, P.trunk)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
}

function label(o: DrawOptions, x: number, y: number, text: string, tx: number, ty: number): string {
  if (!o.labels) return '';
  return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${P.ink}" stroke-width="1.2" stroke-dasharray="4 3"/>
    <circle cx="${x}" cy="${y}" r="3" fill="${P.ink}"/>
    <text x="${tx}" y="${ty - 5}" font-family="Arial, sans-serif" font-size="17" fill="${P.ink}">${text}</text>`;
}

/* ------------------------------------------------------------------ */
/* Répertoire de scènes                                               */
/* ------------------------------------------------------------------ */

const SCENES: SceneDef[] = [
  {
    key: 'village',
    name: 'Village béninois',
    keywords: ['village', 'maison', 'case', 'habitat', 'concession', 'hameau', 'campagne'],
    labels: ['Le toit', 'Le mur', 'La porte', 'L’arbre'],
    draw: (o) => `${sky(o)}${sun(o)}${ground(o)}
      ${hut(o, 250, 360, 1.05)}${hut(o, 520, 360, 0.8)}
      ${palmTree(o, 90, 360, 0.9)}${tree(o, 680, 360, 0.75)}
      ${person(o, 390, 360, 0.85)}
      ${label(o, 250, 292, 'Le toit', 372, 150)}
      ${label(o, 196, 330, 'Le mur', 60, 470)}
      ${label(o, 90, 218, 'Le palmier', 96, 130)}`,
  },
  {
    key: 'ecole',
    name: 'École et élèves',
    keywords: ['ecole', 'eleve', 'classe', 'maitre', 'enseignant', 'cartable', 'tableau', 'apprendre', 'etudier'],
    labels: ['Le tableau', 'Le maître', 'Les élèves', 'Le banc'],
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#f7f3e8"/>` : ''}
      <rect x="70" y="70" width="300" height="180" rx="6" fill="${fill(o.color, '#2f4f3f')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <text x="220" y="170" text-anchor="middle" font-family="Arial" font-size="44" fill="${o.color ? '#ffffff' : P.ink}">A B C</text>
      ${person(o, 470, 300, 1.1, P.cloth2)}
      ${person(o, 180, 470, 0.8)}${person(o, 320, 470, 0.8, P.cloth2)}${person(o, 460, 470, 0.8, '#7a4fa3')}
      <rect x="120" y="470" width="420" height="14" fill="${fill(o.color, P.trunk)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${ground(o, 500)}
      ${label(o, 220, 160, 'Le tableau', 430, 60)}
      ${label(o, 470, 230, 'Le maitre', 620, 200)}
      ${label(o, 320, 420, 'Les eleves', 620, 400)}`,
  },
  {
    key: 'marche',
    name: 'Marché africain',
    keywords: ['marche', 'vendeuse', 'commerce', 'acheter', 'vendre', 'etal', 'panier', 'argent', 'monnaie', 'prix'],
    labels: ['L’étal', 'La vendeuse', 'Les fruits', 'Le panier'],
    draw: (o) => `${sky(o)}${sun(o, 120, 70)}${ground(o, 400)}
      <rect x="180" y="300" width="440" height="20" fill="${fill(o.color, P.trunk)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <line x1="220" y1="320" x2="220" y2="400" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <line x1="580" y1="320" x2="580" y2="400" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 160 300 L 400 230 L 640 300 Z" fill="${fill(o.color, P.cloth)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="260" cy="285" r="15" fill="${fill(o.color, '#e2703a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="300" cy="285" r="15" fill="${fill(o.color, '#e2703a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="340" cy="285" r="15" fill="${fill(o.color, '#f6c343')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="470" cy="285" r="15" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="510" cy="285" r="15" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${person(o, 400, 400, 1.0)}
      ${person(o, 680, 400, 0.85, P.cloth2)}
      ${label(o, 400, 260, 'L etal', 120, 180)}
      ${label(o, 300, 285, 'Les fruits', 120, 470)}`,
  },
  {
    key: 'eau',
    name: 'Le cycle de l’eau',
    keywords: ['eau', 'pluie', 'cycle', 'nuage', 'riviere', 'fleuve', 'evaporation', 'puits', 'lac', 'mer'],
    labels: ['Le nuage', 'La pluie', 'La rivière', 'L’évaporation'],
    draw: (o) => `${sky(o)}${sun(o, 720, 70)}
      <ellipse cx="260" cy="110" rx="105" ry="48" fill="${fill(o.color, P.white)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <ellipse cx="330" cy="130" rx="75" ry="38" fill="${fill(o.color, P.white)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${Array.from({ length: 7 }, (_, i) => `<line x1="${200 + i * 32}" y1="170" x2="${192 + i * 32}" y2="225" stroke="${o.color ? P.water : P.ink}" stroke-width="${o.stroke + 0.6}" stroke-linecap="round"/>`).join('')}
      ${o.color ? `<rect x="0" y="380" width="800" height="160" fill="${P.water}"/>` : ''}
      <path d="M 0 380 Q 200 360 400 380 T 800 380 L 800 540 L 0 540 Z" fill="${fill(o.color, P.water)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${Array.from({ length: 4 }, (_, i) => `<path d="M ${610 + i * 14} 372 Q ${616 + i * 14} 332 ${610 + i * 14} 292" fill="none" stroke="${P.ink}" stroke-width="${o.stroke}" stroke-dasharray="6 5"/>`).join('')}
      ${palmTree(o, 78, 372, 0.66)}
      ${label(o, 300, 120, 'Le nuage', 470, 90)}
      ${label(o, 255, 200, 'La pluie', 95, 255)}
      ${label(o, 400, 450, 'La riviere', 330, 512)}
      ${label(o, 638, 320, 'L evaporation', 600, 245)}`,
  },
  {
    key: 'agriculture',
    name: 'Champ et culture',
    keywords: ['champ', 'agriculture', 'mais', 'culture', 'planter', 'semer', 'recolte', 'houe', 'paysan', 'cultivateur', 'ferme', 'jardin'],
    labels: ['Le plant de maïs', 'Le sillon', 'Le cultivateur', 'La houe'],
    draw: (o) => `${sky(o)}${sun(o)}${ground(o, 330)}
      ${Array.from({ length: 6 }, (_, i) => {
        const x = 110 + i * 120;
        return `<line x1="${x}" y1="470" x2="${x}" y2="350" stroke="${o.color ? P.greenDark : P.ink}" stroke-width="${o.stroke + 1}"/>
          <path d="M ${x} 380 Q ${x - 45} 360 ${x - 52} 395" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
          <path d="M ${x} 400 Q ${x + 45} 380 ${x + 52} 415" fill="${fill(o.color, P.green)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
          <ellipse cx="${x}" cy="345" rx="10" ry="24" fill="${fill(o.color, P.sun)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>`;
      }).join('')}
      ${person(o, 680, 330, 0.8)}
      ${label(o, 110, 345, 'Le plant de mais', 120, 200)}
      ${label(o, 470, 470, 'Le sillon', 430, 520)}`,
  },
  {
    key: 'hygiene',
    name: 'Hygiène et santé',
    keywords: ['hygiene', 'sante', 'laver', 'main', 'savon', 'propre', 'microbe', 'maladie', 'dent', 'brosse', 'toilette'],
    labels: ['Le savon', 'L’eau propre', 'Les mains', 'La bassine'],
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#eef7f4"/>` : ''}
      <rect x="250" y="120" width="120" height="150" rx="10" fill="${fill(o.color, '#9fd8e8')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <rect x="290" y="80" width="40" height="45" fill="${fill(o.color, '#7a7a7a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 310 270 Q 305 320 312 360" fill="none" stroke="${o.color ? P.water : P.ink}" stroke-width="${o.stroke + 1.5}" stroke-linecap="round"/>
      <ellipse cx="400" cy="420" rx="150" ry="45" fill="${fill(o.color, '#c9e4ee')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <rect x="520" y="230" width="70" height="45" rx="8" fill="${fill(o.color, '#f2e29a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <text x="555" y="260" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">SAVON</text>
      ${person(o, 400, 380, 0.85)}
      ${label(o, 555, 250, 'Le savon', 620, 180)}
      ${label(o, 312, 330, 'L eau propre', 100, 300)}
      ${label(o, 400, 420, 'La bassine', 600, 470)}`,
  },
  {
    key: 'corps',
    name: 'Le corps humain',
    keywords: ['corps', 'humain', 'tete', 'bras', 'jambe', 'anatomie', 'squelette', 'organe', 'membre'],
    labels: ['La tête', 'Le bras', 'Le tronc', 'La jambe'],
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#fdf6ec"/>` : ''}
      <circle cx="400" cy="110" r="52" fill="${fill(o.color, P.skin)}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <circle cx="382" cy="100" r="6" fill="${P.ink}"/><circle cx="418" cy="100" r="6" fill="${P.ink}"/>
      <path d="M 383 130 Q 400 144 417 130" fill="none" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 355 175 L 445 175 L 460 340 L 340 340 Z" fill="${fill(o.color, P.cloth2)}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <line x1="358" y1="190" x2="270" y2="300" stroke="${P.ink}" stroke-width="${o.stroke + 1.5}" stroke-linecap="round"/>
      <line x1="442" y1="190" x2="530" y2="300" stroke="${P.ink}" stroke-width="${o.stroke + 1.5}" stroke-linecap="round"/>
      <line x1="372" y1="340" x2="360" y2="480" stroke="${P.ink}" stroke-width="${o.stroke + 1.5}" stroke-linecap="round"/>
      <line x1="428" y1="340" x2="440" y2="480" stroke="${P.ink}" stroke-width="${o.stroke + 1.5}" stroke-linecap="round"/>
      ${label(o, 400, 110, 'La tete', 600, 90)}
      ${label(o, 270, 300, 'Le bras', 110, 280)}
      ${label(o, 400, 260, 'Le tronc', 620, 260)}
      ${label(o, 440, 460, 'La jambe', 600, 470)}`,
  },
  {
    key: 'animaux',
    name: 'Animaux de la ferme',
    keywords: ['animal', 'animaux', 'poule', 'chevre', 'mouton', 'vache', 'boeuf', 'elevage', 'basse-cour', 'poisson', 'oiseau'],
    labels: ['La poule', 'La chèvre', 'L’enclos'],
    draw: (o) => `${sky(o)}${sun(o)}${ground(o, 380)}
      <ellipse cx="260" cy="420" rx="62" ry="42" fill="${fill(o.color, P.white)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="318" cy="382" r="26" fill="${fill(o.color, P.white)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 340 374 L 360 382 L 340 390 Z" fill="${fill(o.color, P.sun)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 310 358 Q 318 342 326 358" fill="${fill(o.color, P.cloth)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <line x1="245" y1="460" x2="245" y2="486" stroke="${P.ink}" stroke-width="${o.stroke + 1}"/>
      <line x1="278" y1="460" x2="278" y2="486" stroke="${P.ink}" stroke-width="${o.stroke + 1}"/>
      <ellipse cx="570" cy="410" rx="72" ry="48" fill="${fill(o.color, '#c9b79c')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="640" cy="372" r="28" fill="${fill(o.color, '#c9b79c')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 630 348 Q 624 328 638 336" fill="none" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 652 348 Q 658 328 644 336" fill="none" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <line x1="540" y1="456" x2="540" y2="488" stroke="${P.ink}" stroke-width="${o.stroke + 1}"/>
      <line x1="600" y1="456" x2="600" y2="488" stroke="${P.ink}" stroke-width="${o.stroke + 1}"/>
      ${label(o, 300, 382, 'La poule', 120, 200)}
      ${label(o, 600, 380, 'La chevre', 640, 220)}`,
  },
  {
    key: 'transport',
    name: 'Transports et route',
    keywords: ['transport', 'route', 'voiture', 'moto', 'zemidjan', 'velo', 'circulation', 'securite', 'pirogue', 'barque', 'camion'],
    labels: ['La route', 'Le véhicule', 'Le passage piéton'],
    draw: (o) => `${sky(o)}${sun(o, 110, 70)}${ground(o, 330)}
      <rect x="0" y="380" width="800" height="90" fill="${fill(o.color, '#9a9a9a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${20 + i * 100}" y="420" width="46" height="8" fill="${o.color ? P.white : 'none'}" stroke="${P.ink}" stroke-width="1"/>`).join('')}
      <rect x="250" y="290" width="180" height="62" rx="12" fill="${fill(o.color, P.cloth2)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <rect x="292" y="252" width="98" height="44" rx="10" fill="${fill(o.color, '#bcdcef')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="292" cy="358" r="24" fill="${fill(o.color, '#3a3a3a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <circle cx="392" cy="358" r="24" fill="${fill(o.color, '#3a3a3a')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${person(o, 640, 380, 0.75)}
      ${palmTree(o, 90, 330, 0.65)}
      ${label(o, 340, 300, 'Le vehicule', 520, 200)}
      ${label(o, 400, 425, 'La route', 560, 500)}`,
  },
  {
    key: 'geometrie',
    name: 'Formes géométriques',
    keywords: ['geometrie', 'forme', 'carre', 'cercle', 'triangle', 'rectangle', 'losange', 'figure', 'mathematique', 'calcul'],
    labels: ['Le carré', 'Le cercle', 'Le triangle', 'Le rectangle'],
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#fbfbf5"/>` : ''}
      <rect x="90" y="120" width="140" height="140" fill="${fill(o.color, '#f3b8b8')}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <circle cx="430" cy="190" r="72" fill="${fill(o.color, '#b8d8f3')}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <path d="M 640 120 L 720 260 L 560 260 Z" fill="${fill(o.color, '#c7e8b8')}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <rect x="90" y="350" width="200" height="110" fill="${fill(o.color, '#f3e2b8')}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <path d="M 470 350 L 545 405 L 470 460 L 395 405 Z" fill="${fill(o.color, '#d9c2ef')}" stroke="${P.ink}" stroke-width="${o.stroke + 0.5}"/>
      <text x="160" y="295" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">Carre</text>
      <text x="430" y="295" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">Cercle</text>
      <text x="640" y="295" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">Triangle</text>
      <text x="190" y="490" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">Rectangle</text>
      <text x="470" y="490" text-anchor="middle" font-family="Arial" font-size="20" fill="${P.ink}">Losange</text>`,
  },
  {
    key: 'environnement',
    name: 'Protéger l’environnement',
    keywords: ['environnement', 'dechet', 'poubelle', 'proprete', 'arbre', 'reboiser', 'pollution', 'plastique', 'nature', 'foret'],
    labels: ['La poubelle', 'L’arbre planté', 'Les déchets'],
    draw: (o) => `${sky(o)}${sun(o)}${ground(o, 370)}
      <path d="M 250 470 L 265 350 L 355 350 L 370 470 Z" fill="${fill(o.color, '#4c9a52')}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <rect x="255" y="330" width="110" height="22" rx="6" fill="${fill(o.color, P.greenDark)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 292 300 L 310 300 L 310 330 L 292 330 Z" fill="${fill(o.color, P.greenDark)}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 300 395 L 310 415 L 290 415 Z" fill="${o.color ? P.white : 'none'}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      <path d="M 300 438 L 310 418 L 290 418 Z" fill="${o.color ? P.white : 'none'}" stroke="${P.ink}" stroke-width="${o.stroke}"/>
      ${tree(o, 570, 370, 0.9)}
      ${person(o, 130, 470, 0.8)}
      ${label(o, 310, 340, 'La poubelle', 120, 200)}
      ${label(o, 570, 260, 'L arbre plante', 620, 170)}`,
  },
  {
    key: 'famille',
    name: 'La famille',
    keywords: ['famille', 'parent', 'pere', 'mere', 'enfant', 'frere', 'soeur', 'maison', 'bebe'],
    labels: ['Le père', 'La mère', 'L’enfant'],
    draw: (o) => `${o.color ? `<rect x="0" y="0" width="800" height="540" fill="#fdf3e7"/>` : ''}
      ${ground(o, 470)}
      ${person(o, 250, 470, 1.25, P.cloth2)}
      ${person(o, 430, 470, 1.2, P.cloth)}
      ${person(o, 570, 470, 0.8, '#7a4fa3')}
      ${person(o, 670, 470, 0.7, '#3f9a7c')}
      ${label(o, 250, 340, 'Le pere', 90, 200)}
      ${label(o, 430, 345, 'La mere', 400, 180)}
      ${label(o, 570, 390, 'Les enfants', 640, 250)}`,
  },
];

/** Scène par défaut si rien n'est reconnu. */
const FALLBACK = SCENES[0];

/** Trouve la scène la plus proche de la consigne. */
export function matchScene(prompt: string): { scene: SceneDef; score: number; matched: string[] } {
  const n = ' ' + normalise(prompt) + ' ';
  let best = { scene: FALLBACK, score: 0, matched: [] as string[] };
  for (const scene of SCENES) {
    const matched: string[] = [];
    let score = 0;
    for (const k of scene.keywords) {
      if (n.includes(k)) { score += k.length; matched.push(k); }
    }
    if (score > best.score) best = { scene, score, matched };
  }
  return best;
}

export function availableScenes(): { key: string; name: string; keywords: string[] }[] {
  return SCENES.map((s) => ({ key: s.key, name: s.name, keywords: s.keywords.slice(0, 5) }));
}

/** Titre déduit de la consigne si l'utilisateur n'en fournit pas. */
function deriveTitle(prompt: string, sceneName: string): string {
  const clean = prompt.trim().replace(/\s+/g, ' ');
  if (!clean) return sceneName;
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return first.length > 70 ? first.slice(0, 67) + '…' : first;
}

/* ------------------------------------------------------------------ */
/* Génération                                                         */
/* ------------------------------------------------------------------ */

/**
 * Compose l'image à partir de l'instruction de l'enseignant.
 * Entièrement local : aucun appel réseau.
 */
export function generateEducationalImage(req: ImageRequest): GeneratedImage {
  const { scene, matched } = matchScene(req.prompt);

  // Trait plus épais pour les petits : meilleure lisibilité au tableau.
  const stroke = req.level === 'Maternelle' ? 3.6 : req.level === 'Primaire' ? 2.8 : 2.2;
  const color = req.style === 'couleur';
  const labels = req.labels !== false && req.style !== 'coloriage';

  const o: DrawOptions = { color, stroke, labels };
  const title = (req.title || '').trim() || deriveTitle(req.prompt, scene.name);

  const body = scene.draw(o);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" width="800" height="620">
  <rect x="0" y="0" width="800" height="620" fill="#ffffff"/>
  <g>${body}</g>
  <rect x="6" y="6" width="788" height="608" fill="none" stroke="${P.ink}" stroke-width="2.5"/>
  <line x1="6" y1="548" x2="794" y2="548" stroke="${P.ink}" stroke-width="2"/>
  <text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${P.ink}">${escapeXml(title)}</text>
  <text x="400" y="604" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666666">${escapeXml(req.level)}</text>
</svg>`;

  const styleLabel = req.style === 'gravure' ? 'gravure au trait noir'
    : req.style === 'couleur' ? 'illustration en couleurs' : 'dessin à colorier';

  const interpretation = matched.length > 0
    ? `Consigne comprise : scène « ${scene.name} » (mots reconnus : ${matched.join(', ')}), en ${styleLabel}, niveau ${req.level}.`
    : `Aucun mot-clé reconnu dans votre consigne : la scène « ${scene.name} » a été utilisée par défaut, en ${styleLabel}. `
      + `Essayez des mots comme : école, marché, eau, champ, hygiène, corps, animaux, transport, géométrie, environnement, famille, village.`;

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    svg,
    sceneKey: scene.key,
    sceneName: scene.name,
    style: req.style,
    level: req.level,
    prompt: req.prompt,
    interpretation,
    createdAt: Date.now(),
  };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string
  ));
}

/** SVG encodé en data URL, utilisable dans <img> et pour l'export. */
export function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Convertit le SVG en PNG (canvas), pour le téléchargement en image et
 * l'insertion dans un PDF. Fonctionne hors ligne.
 */
export function svgToPngDataUrl(svg: string, width = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const ratio = 620 / 800;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.round(width * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas indisponible')); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e as Error); }
    };
    img.onerror = () => reject(new Error('conversion impossible'));
    img.src = svgToDataUrl(svg);
  });
}
