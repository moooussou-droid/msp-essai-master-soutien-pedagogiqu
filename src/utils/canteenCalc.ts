/**
 * MOTEUR DE CALCUL DE LA CANTINE SCOLAIRE (v40, arrondi v65).
 *
 * ── RÔLE ─────────────────────────────────────────────────────────────
 * Ce fichier contient UNIQUEMENT la logique métier : aucune dépendance à
 * React, au DOM ou au stockage. Il est donc testable indépendamment de
 * l'interface (exigence §32 du cahier des charges).
 *
 * ── ORIGINE DES RÈGLES ───────────────────────────────────────────────
 * Les rations proviennent du fichier Excel de prélèvement utilisé par les
 * maîtres cantine, et sont confirmées par le « Cahier des menus
 * hebdomadaires » photographié (ration par élève : maïs 0,15 · riz 0,15 ·
 * légumineuse 0,03 · huile 0,01 · sel 0,003).
 *
 * ── CORRECTIONS APPORTÉES AUX FORMULES EXCEL ─────────────────────────
 * 1. `COUNTA(F10=1)` : expression utilisée dans l'Excel comme test du choix
 *    de la légumineuse. COUNTA compte les cellules non vides et renvoie
 *    toujours 1 ici : le test était donc TOUJOURS vrai. Remplacé par une
 *    comparaison explicite `legume === 'haricot'` (§34).
 * 2. Les légumineuses journalières de l'Excel calculaient une quantité sans
 *    vérifier la légumineuse retenue : les deux colonnes pouvaient être
 *    servies en même temps. Ici, la légumineuse non choisie vaut 0 (§11).
 * 3. Le cahier manuscrit applique parfois l'arrondi APRÈS multiplication
 *    (282 élèves × 0,03 = 8,46 noté « 08,50 »), et parfois pas du tout
 *    (282 × 0,15 = 42,30 noté « 42,25 »). La règle retenue est d'arrondir
 *    la ration PAR SERVICE, puis de multiplier par le nombre de services.
 *    Voir `explainRoundingDifference()` qui documente l'écart.
 *
 * ── CHANGEMENT DE RÈGLE D'ARRONDI (v44, remplacé en v65) ────────────
 * Jusqu'à la v43, les rations étaient arrondies au multiple SUPÉRIEUR
 * (`roundUpToMultiple`). En v44, le fichier « SIMULATEUR D'ARRONDI » a
 * imposé MROUND (`roundToMultiple`, multiple le plus proche).
 *
 * ── MÉTHODE OFFICIELLE DE SORTIE DES DENRÉES (v65) ───────────────────
 * La nouvelle consigne remplace MROUND par des intervalles explicites
 * appliqués à la PARTIE DÉCIMALE de la quantité calculée pour un service :
 *   huile, céréales, légumineuses : pas de 0,25, seuils 0,375/0,625/0,875
 *   sel                            : pas de 0,10, seuils 0,15/0,25/…/0,95
 * Voir `CANTEEN_ROUNDING_RULES` et `roundCanteenOutput`. Une quantité
 * nulle reste 0 et une quantité entière exacte reste entière (arbitrage
 * explicite de l'utilisateur). `roundToMultiple` et `roundUpToMultiple`
 * restent exportés uniquement pour compatibilité et traçabilité : ils ne
 * servent plus aux sorties de vivres.
 */

/* ------------------------------------------------------------------ */
/* 1. Configuration des denrées (§36 — paramètres centralisés)         */
/* ------------------------------------------------------------------ */

/**
 * v42 — Mode de gestion de la legumineuse sur la semaine.
 *
 * Origine : le cas NORMAL, et donc l'option par defaut, est qu'une seule
 * legumineuse serve toute la semaine ('unique'). Le changement en cours de
 * semaine ('changement') reste l'exception, reservee au cas ou un stock
 * s'epuise avant vendredi. On materialise ce choix explicitement pour que
 * l'ecran ne propose le reglage jour par jour que lorsqu'il est utile.
 */
export type LegumeMode = 'unique' | 'changement';

export type FoodKey = 'maize' | 'rice' | 'legume' | 'oil' | 'salt';

export interface FoodItem {
  key: FoodKey;
  /** Libellé affiché à l'utilisateur. */
  name: string;
  /** Unité de mesure — modifiable sans toucher au code de calcul. */
  unit: string;
  /** Ration par élève et par service. */
  ration: number;
  /**
   * Pas de sortie appliqué à la partie décimale (0,25 ou 0,10).
   * Le nom historique est conservé pour compatibilité, mais la v65
   * n'arrondit plus « au multiple le plus proche » : elle classe la
   * partie décimale dans les intervalles officiels de sortie.
   */
  roundingMultiple: number;
}

/**
 * Paramètres par défaut. Ils sont surchargeables (§37) : l'administrateur
 * peut les modifier sans réécrire la moindre formule.
 */
export const DEFAULT_FOOD_CONFIG: Record<FoodKey, FoodItem> = {
  maize:  { key: 'maize',  name: 'Maïs',        unit: 'kg',     ration: 0.15,  roundingMultiple: 0.25 },
  rice:   { key: 'rice',   name: 'Riz',         unit: 'kg',     ration: 0.15,  roundingMultiple: 0.25 },
  legume: { key: 'legume', name: 'Légumineuse', unit: 'kg',     ration: 0.03,  roundingMultiple: 0.25 },
  oil:    { key: 'oil',    name: 'Huile',       unit: 'litre',  ration: 0.01,  roundingMultiple: 0.25 },
  salt:   { key: 'salt',   name: 'Sel',         unit: 'kg',     ration: 0.003, roundingMultiple: 0.1  },
};

export const MAX_WORKING_DAYS = 5;

/** Version de la méthode d'arrondi actuellement appliquée aux sorties. */
export const CANTEEN_ROUNDING_METHOD_VERSION = 'v65-intervalles-sortie';

/** Familles de denrées distinguées par la consigne d'arrondi v65. */
export type CanteenRoundingKind = 'huile-cereales-legumineuses' | 'sel';

export interface CanteenRoundingInterval {
  /** Intervalle de la partie décimale, exactement comme sur le graphique. */
  interval: string;
  /** Fraction à retenir pour la sortie. */
  output: number;
}

export interface CanteenRoundingRule {
  kind: CanteenRoundingKind;
  /** Denrées auxquelles la règle s'applique. */
  foodsLabel: string;
  /** Pas de fraction retenu : 0,25 ou 0,10. */
  step: number;
  intervals: CanteenRoundingInterval[];
}

/**
 * Intervalles officiels de la v65.
 *
 * Le graphique classe la partie décimale entre 0 et 1. Le premier
 * intervalle est donc volontairement plus large : dès qu'une fraction
 * positive existe, la sortie retient au moins le premier pas (0,25 ou
 * 0,10). Cas particuliers validés par l'utilisateur : 0 reste 0, et une
 * quantité entière exacte (15,00 kg) reste entière (15 kg, pas 15,25).
 */
export const CANTEEN_ROUNDING_RULES: Record<CanteenRoundingKind, CanteenRoundingRule> = {
  'huile-cereales-legumineuses': {
    kind: 'huile-cereales-legumineuses',
    foodsLabel: 'Huile, céréales, légumineuses',
    step: 0.25,
    intervals: [
      { interval: '[0 ; 0,375]', output: 0.25 },
      { interval: ']0,375 ; 0,625]', output: 0.5 },
      { interval: ']0,625 ; 0,875]', output: 0.75 },
      { interval: ']0,875 ; 1]', output: 1 },
    ],
  },
  sel: {
    kind: 'sel',
    foodsLabel: 'Sel',
    step: 0.1,
    intervals: [
      { interval: '[0 ; 0,15]', output: 0.1 },
      { interval: ']0,15 ; 0,25]', output: 0.2 },
      { interval: ']0,25 ; 0,35]', output: 0.3 },
      { interval: ']0,35 ; 0,45]', output: 0.4 },
      { interval: ']0,45 ; 0,55]', output: 0.5 },
      { interval: ']0,55 ; 0,65]', output: 0.6 },
      { interval: ']0,65 ; 0,75]', output: 0.7 },
      { interval: ']0,75 ; 0,85]', output: 0.8 },
      { interval: ']0,85 ; 0,95]', output: 0.9 },
      { interval: ']0,95 ; 1]', output: 1 },
    ],
  },
};

/** Famille d'arrondi d'une denrée du moteur de ration. */
export function canteenRoundingKind(food: FoodKey): CanteenRoundingKind {
  return food === 'salt' ? 'sel' : 'huile-cereales-legumineuses';
}

/**
 * Famille d'arrondi d'après un Libellé libre (« Sel iodé », « Pois vert »…).
 * Seul le sel utilise les dixièmes ; toutes les autres denrées suivent la
 * règle huile/céréales/légumineuses au quart.
 */
export function canteenRoundingKindForName(foodName: string): CanteenRoundingKind {
  const clean = (foodName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /(^|[^a-z])sel([^a-z]|$)/.test(clean)
    ? 'sel'
    : 'huile-cereales-legumineuses';
}

/** Légumineuses retenues (le cahier de stock mentionne aussi le pois vert). */
export type LegumeKey = 'haricot' | 'pois_jaune' | 'pois_vert' | 'aucune';

export const LEGUME_LABELS: Record<LegumeKey, string> = {
  haricot: 'Haricot',
  pois_jaune: 'Pois jaune',
  pois_vert: 'Pois vert',
  aucune: 'Aucune',
};

/** Céréale servie un jour donné. */
export type CerealKey = 'maize' | 'rice' | 'aucune';

export const CEREAL_LABELS: Record<CerealKey, string> = {
  maize: 'Maïs',
  rice: 'Riz',
  aucune: 'Pas de cuisson',
};

/* ------------------------------------------------------------------ */
/* 2. Arrondi fiable (§5)                                              */
/* ------------------------------------------------------------------ */

/**
 * HISTORIQUE — ne plus utiliser pour les sorties de denrées (voir v65).
 * Arrondit `value` AU MULTIPLE SUPÉRIEUR OU ÉGAL de `multiple`.
 *
 *   arrondi = plafond(value / multiple) × multiple
 *
 * PRÉCISION DÉCIMALE : en virgule flottante, 0.03 × 282 = 8.459999999999999
 * et 8.46 / 0.25 = 33.839999999999996 ; un `Math.ceil` direct est donc
 * exposé à des erreurs d'un cran. On travaille en ENTIERS (millièmes) et on
 * neutralise l'erreur résiduelle par un epsilon avant le plafond.
 */
export function roundUpToMultiple(value: number, multiple: number): number {
  if (!isFinite(value) || !isFinite(multiple) || multiple <= 0) return 0;
  if (value <= 0) return 0;

  // Passage en entiers : évite 0.1 + 0.2 !== 0.3.
  const SCALE = 1e6;
  const v = Math.round(value * SCALE);
  const m = Math.round(multiple * SCALE);

  // Epsilon : une valeur à 1 millionième près d'un multiple exact est
  // considérée comme ce multiple (cas de 8.459999999999999 vs 8.46).
  const quotient = v / m;
  const EPS = 1e-9;
  const steps = Math.ceil(quotient - EPS);

  return round2((steps * m) / SCALE);
}

/**
 * HISTORIQUE v44 — remplacé pour les sorties par les intervalles v65.
 * ARRONDI AU MULTIPLE LE PLUS PROCHE — équivalent de MROUND (Excel).
 *
 * ── ORIGINE ──────────────────────────────────────────────────────────
 * Le fichier « SIMULATEUR D'ARRONDI » utilise MROUND pour TOUTES les
 * rations (maïs, riz, légumineuse, huile, sel). MROUND arrondit au
 * multiple le PLUS PROCHE, et non au multiple supérieur.
 *
 * ── POURQUOI CETTE FONCTION REMPLACE L'ARRONDI SUPÉRIEUR (v44) ───────
 * La v40 arrondissait systématiquement AU-DESSUS pour n'être jamais à
 * court. C'était un choix de sécurité assumé, mais il s'écartait du
 * fichier de référence. Sur un effectif de 310 élèves l'écart est net :
 *   haricot 47,50 kg (plafond) contre 46,25 kg (MROUND)
 *   huile   16,25 L  (plafond) contre 15,00 L  (MROUND)
 *   sel      5,00 kg (plafond) contre  4,50 kg (MROUND)
 * Arbitrage confirmé par l'utilisateur : le fichier Excel fait foi.
 *
 * ── CONSÉQUENCE MÉTIER SIGNALÉE ──────────────────────────────────────
 * MROUND peut arrondir vers le BAS (9,30 → 9,25). La ration servie peut
 * donc être très légèrement inférieure au besoin théorique. C'est le
 * comportement du fichier de référence, et il est ici reproduit tel quel.
 *
 * ── PRÉCISION DÉCIMALE ───────────────────────────────────────────────
 * 0.03 × 282 = 8.459999999999999 en virgule flottante. On travaille en
 * entiers mis à l'échelle et on neutralise l'erreur résiduelle par un
 * epsilon, sinon l'arrondi peut sauter d'un cran.
 *
 * ── DÉPARTAGE DES DEMI-MULTIPLES ─────────────────────────────────────
 * À égalité exacte (ex. 0,125 pour un multiple de 0,25), MROUND s'éloigne
 * de zéro : on retient donc le multiple SUPÉRIEUR, comme Excel.
 */
export function roundToMultiple(value: number, multiple: number): number {
  if (!isFinite(value) || !isFinite(multiple) || multiple <= 0) return 0;
  if (value <= 0) return 0;

  const SCALE = 1e6;
  const v = Math.round(value * SCALE);
  const m = Math.round(multiple * SCALE);

  const quotient = v / m;
  const EPS = 1e-9;
  // Math.floor(q + 0.5) = arrondi « à égalité, vers le haut » (comme MROUND).
  const steps = Math.floor(quotient + 0.5 + EPS);

  return round2((steps * m) / SCALE);
}

/**
 * ARRONDI OFFICIEL DE SORTIE DES DENRÉES (v65).
 *
 * On conserve la partie entière, puis on classe UNIQUEMENT la partie
 * décimale dans les intervalles du graphique :
 *
 *   pas 0,25 : ]0 ; 0,375] → 0,25 · ]0,375 ; 0,625] → 0,50 ·
 *              ]0,625 ; 0,875] → 0,75 · ]0,875 ; 1[ → entier suivant
 *   pas 0,10 : ]0 ; 0,15] → 0,10 · ]0,15 ; 0,25] → 0,20 · … ·
 *              ]0,95 ; 1[ → entier suivant
 *
 * Les bornes appartiennent à l'intervalle qui se termine sur elles :
 * 0,375 donne donc 0,25 (et non 0,50), 0,15 donne 0,10 (et non 0,20).
 * Le graphique note le premier intervalle « [0 ; …] » parce qu'il
 * couvre tout l'axe 0→1 ; l'arbitrage utilisateur est néanmoins sans
 * ambiguïté : aucune sortie (0) reste 0, et un entier exact ne reçoit
 * pas de fraction artificielle.
 *
 * Le calcul se fait en millionièmes entiers pour que 0,375 ou 0,15 ne
 * changent pas de camp à cause de la virgule flottante.
 */
export function roundCanteenOutput(value: number, step: number): number {
  if (!isFinite(value) || !isFinite(step) || step <= 0 || value <= 0) return 0;

  const SCALE = 1e6;
  const scaledValue = Math.round(value * SCALE);
  const scaledStep = Math.round(step * SCALE);
  if (scaledStep <= 0) return 0;

  const wholeScaled = Math.floor(scaledValue / SCALE) * SCALE;
  const fractionScaled = scaledValue - wholeScaled;

  // Entier exact : 15,00 kg reste 15 kg.
  if (fractionScaled === 0) return round2(scaledValue / SCALE);

  const halfStep = scaledStep / 2;
  const maxSteps = Math.max(1, Math.ceil(SCALE / scaledStep));
  /*
   * Formule équivalente aux intervalles :
   *   nombre de pas = plafond((fraction − demi-pas) / pas),
   * avec un minimum d'un pas dès qu'une fraction positive existe.
   * Ex. pas 0,25, fraction 0,375 : (0,375−0,125)/0,25 = 1 → 0,25.
   *     pas 0,10, fraction 0,15  : (0,15−0,05)/0,10  = 1 → 0,10.
   */
  const rawSteps = Math.ceil((fractionScaled - halfStep) / scaledStep);
  const steps = Math.min(maxSteps, Math.max(1, rawSteps));

  return round2((wholeScaled + steps * scaledStep) / SCALE);
}

/** Arrondi de sortie d'une denrée connue du moteur (maïs, riz, sel…). */
export function roundCanteenFoodOutput(
  value: number,
  food: FoodKey,
  config: Record<FoodKey, FoodItem> = DEFAULT_FOOD_CONFIG,
): number {
  const item = config[food];
  const fallback = CANTEEN_ROUNDING_RULES[canteenRoundingKind(food)].step;
  return roundCanteenOutput(value, item?.roundingMultiple || fallback);
}

/** Arrondi de sortie d'après le nom affiché de la denrée (« Sel iodé »…). */
export function roundCanteenNamedFoodOutput(value: number, foodName: string): number {
  const rule = CANTEEN_ROUNDING_RULES[canteenRoundingKindForName(foodName)];
  return roundCanteenOutput(value, rule.step);
}

/**
 * Intervalle dans lequel tombe la partie décimale d'une quantité.
 * Sert aux explications affichées à l'écran et dans le guide : on ne se
 * contente pas du résultat, on montre la règle qui l'a produit.
 */
export function canteenRoundingInterval(
  value: number,
  kind: CanteenRoundingKind,
): CanteenRoundingInterval | null {
  if (!isFinite(value) || value <= 0) return null;
  const SCALE = 1e6;
  const scaled = Math.round(value * SCALE);
  const fraction = (scaled - Math.floor(scaled / SCALE) * SCALE) / SCALE;
  if (fraction === 0) return null;

  const rule = CANTEEN_ROUNDING_RULES[kind];
  const output = round2(roundCanteenOutput(fraction, rule.step));
  return rule.intervals.find((i) => round2(i.output) === output) || null;
}

/** Arrondi d'affichage à 2 décimales, sans artefact flottant. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Somme fiable d'une liste de décimaux. */
export function sumSafe(values: number[]): number {
  return round2(values.reduce((t, v) => t + (Number(v) || 0), 0));
}

/* ------------------------------------------------------------------ */
/* 3. Modèle de données (§31)                                          */
/* ------------------------------------------------------------------ */

export interface WeeklyPlan {
  maize: number;
  rice: number;
  beans: number;       // Haricot
  yellowPeas: number;  // Pois jaune
  greenPeas: number;   // Pois vert
  oil: number;
  salt: number;
}

export interface DailyWithdrawal {
  dayNumber: number;
  date: string;
  staffCount: number;
  cereal: CerealKey;
  /**
   * v41 — légumineuse RÉELLEMENT servie ce jour-là.
   *
   * Le stock d'une légumineuse peut s'épuiser en milieu de semaine : on
   * termine alors la semaine avec une autre (par exemple haricot du lundi
   * au mercredi, puis pois jaune jeudi et vendredi). Chaque journée porte
   * donc sa propre légumineuse, indépendante de celle prévue au départ.
   */
  legume: LegumeKey;
  maizeQuantity: number;
  riceQuantity: number;
  legumeQuantity: number;
  oilQuantity: number;
  saltQuantity: number;
}

/** Détail prévu / réel / reliquat pour UNE légumineuse donnée (v41). */
export interface LegumeLine {
  key: LegumeKey;
  label: string;
  planned: number;
  actual: number;
  balance: number;
}

export interface WeeklySummary {
  totalMeals: number;
  maizePlanned: number;  maizeActual: number;  maizeBalance: number;
  ricePlanned: number;   riceActual: number;   riceBalance: number;
  /** Cumul, toutes légumineuses confondues. */
  legumePlanned: number; legumeActual: number; legumeBalance: number;
  /**
   * v41 — une ligne par légumineuse effectivement prévue ou servie.
   * Indispensable quand la semaine a changé de légumineuse en cours de route :
   * un cumul global masquerait le fait qu'une denrée est en dépassement
   * pendant qu'une autre reste en stock.
   */
  legumeLines: LegumeLine[];
  oilPlanned: number;    oilActual: number;    oilBalance: number;
  saltPlanned: number;   saltActual: number;   saltBalance: number;
}

export type WeekStatus = 'brouillon' | 'cloturee';

export interface WeeklyWithdrawal {
  /**
   * v42 : 'unique' (defaut) = une seule legumineuse toute la semaine ;
   * 'changement' = on autorise une legumineuse differente selon les jours.
   * Absent sur les semaines creees avant la v42 : traite comme 'unique'.
   */
  legumeMode?: LegumeMode;
  /**
   * v65 — version de la méthode d'arrondi ayant produit les quantités
   * enregistrées. Absent sur les semaines antérieures : leurs brouillons
   * sont recalculés à l'ouverture, leurs semaines clôturées restent des
   * documents historiques et ne sont pas réécrites.
   */
  roundingMethodVersion?: string;
  id: string;
  establishmentId: string;
  establishmentName: string;
  weekStartDate: string;
  weekEndDate: string;
  weeklyStaffCount: number;
  workingDays: number;
  maizeServiceCount: number;
  legume: LegumeKey;
  weeklyPlan: WeeklyPlan;
  dailyWithdrawals: DailyWithdrawal[];
  weeklySummary: WeeklySummary;
  status: WeekStatus;
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyParameters {
  staffCount: number;
  workingDays: number;
  maizeServiceCount: number;
  legume: LegumeKey;
  config?: Record<FoodKey, FoodItem>;
}

/* ------------------------------------------------------------------ */
/* 4. Validation (§15)                                                 */
/* ------------------------------------------------------------------ */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWeeklyParameters(p: WeeklyParameters): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(p.staffCount) || p.staffCount <= 0) {
    errors.push("L'effectif de la semaine doit être un nombre supérieur à 0.");
  } else if (!Number.isInteger(p.staffCount)) {
    errors.push("L'effectif doit être un nombre entier d'élèves.");
  }

  if (!Number.isInteger(p.workingDays) || p.workingDays < 1 || p.workingDays > MAX_WORKING_DAYS) {
    errors.push(`Le nombre de jours ouvrables doit être compris entre 1 et ${MAX_WORKING_DAYS}.`);
  }

  if (!Number.isInteger(p.maizeServiceCount) || p.maizeServiceCount < 0) {
    errors.push('Le nombre de sorties de maïs ne peut pas être négatif.');
  } else if (p.maizeServiceCount > p.workingDays) {
    errors.push('Le nombre de sorties de maïs ne peut pas être supérieur au nombre de jours ouvrables.');
  }

  if (!p.legume || !(p.legume in LEGUME_LABELS)) {
    errors.push('Veuillez choisir la légumineuse utilisée cette semaine.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDay(staffCount: number, cereal: CerealKey): ValidationResult {
  const errors: string[] = [];
  if (cereal === 'aucune') return { valid: true, errors };   // jour sans cuisson : effectif ignoré
  if (!Number.isFinite(staffCount) || staffCount <= 0) {
    errors.push("L'effectif du jour doit être supérieur à 0.");
  } else if (!Number.isInteger(staffCount)) {
    errors.push("L'effectif du jour doit être un nombre entier.");
  }
  if (!cereal || !(cereal in CEREAL_LABELS)) {
    errors.push('Veuillez indiquer la céréale servie ce jour.');
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ */
/* 5. Calcul hebdomadaire (§4)                                         */
/* ------------------------------------------------------------------ */

/**
 * Quantité arrondie d'une denrée POUR UN SERVICE, pour un effectif donné.
 * C'est la brique commune au calcul hebdomadaire et au calcul journalier :
 * elle garantit que les deux ne peuvent jamais diverger.
 */
export function rationForService(
  food: FoodKey,
  staffCount: number,
  config: Record<FoodKey, FoodItem> = DEFAULT_FOOD_CONFIG,
): number {
  const item = config[food];
  if (!item || staffCount <= 0) return 0;
  // v65 : intervalles officiels de sortie (0,375/0,625/0,875 au quart ;
  // 0,15/0,25/…/0,95 au dixième pour le sel), appliqués par service.
  return roundCanteenFoodOutput(item.ration * staffCount, food, config);
}

/**
 * PRÉVISION HEBDOMADAIRE.
 *
 * Maïs        : ration arrondie × nombre de sorties de maïs
 * Riz         : ration arrondie × (jours ouvrables − sorties de maïs)
 * Légumineuse : ration arrondie × jours ouvrables, affectée à la SEULE
 *               légumineuse choisie (les autres valent 0 — correction §34)
 * Huile / Sel : ration arrondie × jours ouvrables
 */
export function calculateWeeklyPlan(p: WeeklyParameters): WeeklyPlan {
  const config = p.config || DEFAULT_FOOD_CONFIG;
  const v = validateWeeklyParameters(p);
  if (!v.valid) {
    return { maize: 0, rice: 0, beans: 0, yellowPeas: 0, greenPeas: 0, oil: 0, salt: 0 };
  }

  const riceServiceCount = p.workingDays - p.maizeServiceCount;

  const maize = round2(rationForService('maize', p.staffCount, config) * p.maizeServiceCount);
  const rice  = round2(rationForService('rice',  p.staffCount, config) * riceServiceCount);
  const legumeTotal = round2(rationForService('legume', p.staffCount, config) * p.workingDays);
  const oil   = round2(rationForService('oil',   p.staffCount, config) * p.workingDays);
  const salt  = round2(rationForService('salt',  p.staffCount, config) * p.workingDays);

  return {
    maize,
    rice,
    // Une seule légumineuse est servie : les deux autres restent à zéro.
    beans:      p.legume === 'haricot'    ? legumeTotal : 0,
    yellowPeas: p.legume === 'pois_jaune' ? legumeTotal : 0,
    greenPeas:  p.legume === 'pois_vert'  ? legumeTotal : 0,
    oil,
    salt,
  };
}

/** Total de la légumineuse prévue, quelle qu'elle soit. */
export function plannedLegume(plan: WeeklyPlan): number {
  return round2(plan.beans + plan.yellowPeas + plan.greenPeas);
}

/* ------------------------------------------------------------------ */
/* 6. Calcul journalier (§9 à §13)                                     */
/* ------------------------------------------------------------------ */

export interface DailyParameters {
  dayNumber: number;
  date?: string;
  staffCount: number;
  cereal: CerealKey;
  legume: LegumeKey;
  config?: Record<FoodKey, FoodItem>;
}

/**
 * PRÉLÈVEMENT D'UNE JOURNÉE.
 *
 * « Pas de cuisson » (§35) met TOUTES les quantités à zéro : le jour
 * n'engendre aucun prélèvement et n'entre pas dans le total des plats.
 */
export function calculateDailyWithdrawal(p: DailyParameters): DailyWithdrawal {
  const config = p.config || DEFAULT_FOOD_CONFIG;
  const base: DailyWithdrawal = {
    dayNumber: p.dayNumber,
    date: p.date || '',
    staffCount: Math.max(0, Math.trunc(p.staffCount || 0)),
    cereal: p.cereal,
    legume: p.legume,
    maizeQuantity: 0,
    riceQuantity: 0,
    legumeQuantity: 0,
    oilQuantity: 0,
    saltQuantity: 0,
  };

  // Jour sans cuisson : toutes les quantités restent à zéro, mais l'effectif
  // saisi est CONSERVÉ (l'utilisateur peut renseigner l'effectif avant de
  // choisir la céréale, et ne doit pas voir sa saisie effacée).
  // Ce jour est exclu du total des plats par `calculateWeeklySummary`.
  if (p.cereal === 'aucune' || base.staffCount <= 0) {
    return base;
  }

  base.maizeQuantity = p.cereal === 'maize' ? rationForService('maize', base.staffCount, config) : 0;
  base.riceQuantity  = p.cereal === 'rice'  ? rationForService('rice',  base.staffCount, config) : 0;
  base.legumeQuantity = p.legume === 'aucune' ? 0 : rationForService('legume', base.staffCount, config);
  base.oilQuantity  = rationForService('oil',  base.staffCount, config);
  base.saltQuantity = rationForService('salt', base.staffCount, config);

  return base;
}

/* ------------------------------------------------------------------ */
/* 7. Synthèse hebdomadaire (§16 à §20)                                */
/* ------------------------------------------------------------------ */

/**
 * Compare le prévu au réel et calcule les reliquats.
 * Un reliquat NÉGATIF signale un dépassement : il n'est jamais masqué (§20).
 */
export function calculateWeeklySummary(
  plan: WeeklyPlan,
  days: DailyWithdrawal[],
): WeeklySummary {
  const actifs = days.filter((d) => d.cereal !== 'aucune' && d.staffCount > 0);

  const totalMeals = actifs.reduce((t, d) => t + d.staffCount, 0);

  const maizeActual  = sumSafe(actifs.map((d) => d.maizeQuantity));
  const riceActual   = sumSafe(actifs.map((d) => d.riceQuantity));
  const legumeActual = sumSafe(actifs.map((d) => d.legumeQuantity));
  const oilActual    = sumSafe(actifs.map((d) => d.oilQuantity));
  const saltActual   = sumSafe(actifs.map((d) => d.saltQuantity));

  const legumePlanned = plannedLegume(plan);

  /*
   * v41 — ventilation par légumineuse.
   *
   * Le prévu vient du plan (une seule légumineuse est prévue en début de
   * semaine) ; le réel vient des journées, qui peuvent en avoir servi
   * plusieurs si un stock s'est épuisé. On additionne les deux ensembles de
   * clés pour n'oublier ni une légumineuse prévue mais non servie, ni une
   * légumineuse servie en remplacement sans avoir été prévue.
   */
  const plannedByLegume: Partial<Record<LegumeKey, number>> = {
    haricot: plan.beans,
    pois_jaune: plan.yellowPeas,
    pois_vert: plan.greenPeas,
  };
  const actualByLegume: Partial<Record<LegumeKey, number>> = {};
  for (const d of actifs) {
    if (d.legume && d.legume !== 'aucune' && d.legumeQuantity > 0) {
      actualByLegume[d.legume] = round2((actualByLegume[d.legume] || 0) + d.legumeQuantity);
    }
  }

  const keys = new Set<LegumeKey>();
  (Object.keys(plannedByLegume) as LegumeKey[]).forEach((k) => {
    if ((plannedByLegume[k] || 0) > 0) keys.add(k);
  });
  (Object.keys(actualByLegume) as LegumeKey[]).forEach((k) => keys.add(k));

  const legumeLines: LegumeLine[] = [...keys].map((key) => {
    const planned = round2(plannedByLegume[key] || 0);
    const actual = round2(actualByLegume[key] || 0);
    return { key, label: LEGUME_LABELS[key], planned, actual, balance: round2(planned - actual) };
  });

  return {
    totalMeals,
    maizePlanned: plan.maize,   maizeActual,  maizeBalance:  round2(plan.maize - maizeActual),
    ricePlanned: plan.rice,     riceActual,   riceBalance:   round2(plan.rice - riceActual),
    legumePlanned,              legumeActual, legumeBalance: round2(legumePlanned - legumeActual),
    legumeLines,
    oilPlanned: plan.oil,       oilActual,    oilBalance:    round2(plan.oil - oilActual),
    saltPlanned: plan.salt,     saltActual,   saltBalance:   round2(plan.salt - saltActual),
  };
}

/** Libellé d'un reliquat : positif = reste, négatif = dépassement (§20). */
export function balanceLabel(balance: number, unit = 'kg'): string {
  if (balance < 0) return `Dépassement de ${formatQty(Math.abs(balance))} ${unit}`;
  if (balance === 0) return 'Aucun reliquat';
  return `Reste ${formatQty(balance)} ${unit}`;
}

export function hasOverrun(s: WeeklySummary): boolean {
  // v41 : une légumineuse peut être en dépassement alors que le cumul de
  // toutes les légumineuses reste positif (cas du changement en cours de
  // semaine). On teste donc aussi chaque ligne individuellement.
  const legumeOverrun = (s.legumeLines || []).some((l) => l.balance < 0);
  return s.maizeBalance < 0 || s.riceBalance < 0 || s.legumeBalance < 0
      || legumeOverrun || s.oilBalance < 0 || s.saltBalance < 0;
}

/* ------------------------------------------------------------------ */
/* 8. Affichage                                                        */
/* ------------------------------------------------------------------ */

/** Formatage à la française : 42,25 — sans zéros inutiles. */
export function formatQty(value: number): string {
  const v = round2(value);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('.', ',');
}

/**
 * EXPLICATION DE L'ARRONDI DE SORTIE (v65).
 *
 * Exemple : maïs pour 282 élèves = 0,15 × 282 = 42,30 kg. La partie
 * décimale 0,30 appartient à [0 ; 0,375], donc la fraction retenue est
 * 0,25 et la sortie vaut 42,25 kg. Ce résultat correspond d'ailleurs à
 * la valeur relevée dans l'ancien cahier manuscrit.
 */
export function explainRoundingDifference(staffCount: number, food: FoodKey = 'maize'): string {
  const item = DEFAULT_FOOD_CONFIG[food];
  const raw = item.ration * staffCount;
  const exact = Math.round(raw * 1000) / 1000;
  const arrondi = rationForService(food, staffCount);
  const formatExact = (v: number) => {
    const scaled = Math.round(v * 1000) / 1000;
    return Number.isInteger(scaled * 100)
      ? formatQty(scaled)
      : scaled.toFixed(3).replace('.', ',');
  };

  if (exact <= 0) return `${item.name} : aucune sortie pour cet effectif.`;

  const fraction = Math.round((exact - Math.floor(exact)) * 1000) / 1000;
  if (fraction === 0) {
    return `${item.name} : besoin calculé ${formatExact(exact)} ${item.unit} ; quantité entière exacte, `
         + `elle reste ${formatQty(arrondi)} ${item.unit} (méthode de sortie v65).`;
  }

  const interval = canteenRoundingInterval(exact, canteenRoundingKind(food));
  if (!interval) return `${item.name} : sortie ${formatQty(arrondi)} ${item.unit} (méthode de sortie v65).`;

  const retained = interval.output === 1
    ? `on passe à l'unité entière suivante`
    : `fraction retenue ${formatQty(interval.output)}`;
  return `${item.name} : besoin calculé ${formatExact(exact)} ${item.unit} ; partie décimale `
       + `${formatExact(fraction)} dans ${interval.interval} → ${retained} ; `
       + `sortie ${formatQty(arrondi)} ${item.unit} (méthode de sortie v65).`;
}

/* ------------------------------------------------------------------ */
/* 9. Changement de légumineuse en cours de semaine (v41)              */
/* ------------------------------------------------------------------ */

/**
 * Recalcule la PRÉVISION des légumineuses à partir des légumineuses
 * réellement retenues jour par jour.
 *
 * Situation visée : le stock de haricot s'épuise le mercredi et l'on
 * termine la semaine au pois jaune. La prévision initiale (5 jours de
 * haricot) devient fausse ; elle doit devenir « 3 jours de haricot +
 * 2 jours de pois jaune », sans quoi le point hebdomadaire afficherait un
 * faux dépassement sur le haricot et un faux reliquat sur le pois jaune.
 *
 * Chaque jour est valorisé à la ration arrondie de SON effectif : c'est
 * l'effectif réel qui a été servi.
 */
export function planLegumesFromDays(
  days: DailyWithdrawal[],
  fallbackStaffCount: number,
  config: Record<FoodKey, FoodItem> = DEFAULT_FOOD_CONFIG,
  options?: { plannedLegume?: LegumeKey; workingDays?: number },
): Pick<WeeklyPlan, 'beans' | 'yellowPeas' | 'greenPeas'> {
  /*
   * ── CORRECTION v44 ─────────────────────────────────────────────────
   * Cette fonction reconstruisait la PRÉVISION à partir des effectifs
   * RÉELLEMENT servis chaque jour. Conséquence : le prévu devenait
   * toujours égal au réel, et le reliquat de légumineuse valait
   * invariablement 0 — impossible de voir ce qu'il restait en magasin.
   *
   * Le cahier des charges (§7, §8 et §29) est explicite : la prévision se
   * calcule sur l'EFFECTIF HEBDOMADAIRE et le nombre de JOURS OUVRABLES,
   * jamais sur les effectifs journaliers. On rétablit cette règle.
   *
   * La ventilation par type de légumineuse reste utile (v41) quand un
   * stock s'épuise en cours de semaine : le total prévu est alors réparti
   * au prorata des jours où chaque légumineuse a effectivement servi.
   */
  const workingDays = Math.max(0, options?.workingDays ?? days.length);
  const rationPerDay = rationForService('legume', fallbackStaffCount, config);
  const totalPlanned = round2(rationPerDay * workingDays);

  const empty = { beans: 0, yellowPeas: 0, greenPeas: 0 };
  if (totalPlanned <= 0) return empty;

  // Jours où chaque légumineuse a réellement été servie.
  const dayCount: Record<string, number> = { haricot: 0, pois_jaune: 0, pois_vert: 0 };
  let served = 0;
  for (const d of days) {
    if (!d.legume || d.legume === 'aucune') continue;
    if (d.staffCount <= 0 || d.cereal === 'aucune') continue;
    dayCount[d.legume] = (dayCount[d.legume] || 0) + 1;
    served++;
  }

  // Aucun changement constaté : tout le prévu va à la légumineuse retenue.
  const used = (Object.keys(dayCount) as LegumeKey[]).filter((k) => dayCount[k] > 0);
  if (served === 0 || used.length <= 1) {
    const key = used[0] || options?.plannedLegume;
    return {
      beans:      key === 'haricot'    ? totalPlanned : 0,
      yellowPeas: key === 'pois_jaune' ? totalPlanned : 0,
      greenPeas:  key === 'pois_vert'  ? totalPlanned : 0,
    };
  }

  // Changement en cours de semaine : répartition au prorata des jours.
  const share = (k: LegumeKey) => round2(rationPerDay * (dayCount[k] || 0));
  return {
    beans: share('haricot'),
    yellowPeas: share('pois_jaune'),
    greenPeas: share('pois_vert'),
  };
}

/** Liste des légumineuses réellement servies dans la semaine. */
export function legumesUsed(days: DailyWithdrawal[]): LegumeKey[] {
  const set = new Set<LegumeKey>();
  for (const d of days) {
    if (d.legume && d.legume !== 'aucune' && d.cereal !== 'aucune' && d.staffCount > 0) set.add(d.legume);
  }
  return [...set];
}

/** Vrai si la semaine a utilisé plus d'une légumineuse (§v41). */
export function hasLegumeSwitch(days: DailyWithdrawal[]): boolean {
  return legumesUsed(days).length > 1;
}

/**
 * Phrase explicative du changement, affichée à l'utilisateur et reprise
 * dans les documents PDF.
 */
export function legumeSwitchLabel(days: DailyWithdrawal[]): string {
  const used = legumesUsed(days);
  if (used.length <= 1) return '';
  const parts = used.map((k) => {
    const jours = days
      .filter((d) => d.legume === k && d.cereal !== 'aucune' && d.staffCount > 0)
      .map((d) => `J${d.dayNumber}`)
      .join(', ');
    return `${LEGUME_LABELS[k]} (${jours})`;
  });
  return `Changement de légumineuse en cours de semaine : ${parts.join(' puis ')}.`;
}

/**
 * v42 — Mode de legumineuse d'une semaine, avec repli sur 'unique'.
 *
 * Les semaines enregistrees avant la v42 n'ont pas ce champ : elles ont ete
 * saisies avec une seule legumineuse, donc 'unique' est la lecture fidele.
 */
export function legumeModeOf(w: { legumeMode?: LegumeMode }): LegumeMode {
  return w.legumeMode === 'changement' ? 'changement' : 'unique';
}
