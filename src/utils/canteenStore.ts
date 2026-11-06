/**
 * STOCKAGE DE « MON GESTIONNAIRE DE CANTINE SCOLAIRE » (v40).
 *
 * Réutilise le mécanisme de stockage local déjà employé par toute
 * l'application (localStorage + clés `msp_*`), conformément à la consigne
 * §29/§30 : pas d'architecture parallèle, fonctionnement 100 % hors ligne.
 *
 * Trois jeux de données, un par sous-module :
 *   1. `msp_canteen_weeks`      — Super MSP Simulateur cantine
 *   2. `msp_canteen_menus`      — Cahier MSP des menus hebdomadaires
 *   3. `msp_canteen_stock`      — Cahier MSP de gestion des stocks
 *
 * CLOISONNEMENT (§38) : chaque enregistrement porte l'`establishmentId` de
 * l'établissement courant, et les lectures filtrent dessus.
 */
import {
  WeeklyWithdrawal, WeeklyPlan, DailyWithdrawal, WeeklySummary,
  LegumeKey, CerealKey, calculateWeeklyPlan, calculateDailyWithdrawal,
  calculateWeeklySummary, round2, planLegumesFromDays,
  LegumeMode,
  legumeModeOf,
  CANTEEN_ROUNDING_METHOD_VERSION,
  roundCanteenNamedFoodOutput,
} from './canteenCalc';
import { getProfile } from './userProfile';

export const WEEKS_KEY = 'msp_canteen_weeks';
export const MENUS_KEY = 'msp_canteen_menus';
export const STOCK_KEY = 'msp_canteen_stock';

/* ------------------------------------------------------------------ */
/* Établissement courant                                               */
/* ------------------------------------------------------------------ */

/**
 * Identifiant de l'établissement : dérivé du profil enseignant déjà saisi
 * dans l'application. Évite de redemander une information connue.
 */
export function currentEstablishment(): { id: string; name: string } {
  try {
    const p: any = getProfile() || {};
    const name = (p.schoolName || p.ecole || p.establishment || '').trim() || 'Mon établissement';
    const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    return { id: id || 'etablissement', name };
  } catch {
    return { id: 'etablissement', name: 'Mon établissement' };
  }
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;   // quota dépassé
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ================================================================== */
/* SOUS-MODULE 1 — Simulateur de prélèvement                           */
/* ================================================================== */

/**
 * v65 — recalcul des brouillons créés avec une ancienne méthode.
 *
 * Choix validé par l'utilisateur : dès l'ouverture du simulateur, une
 * semaine non clôturée dont les quantités ont été produites avant la
 * méthode par intervalles est recalculée et marquée. Une semaine
 * clôturée est un document historique : elle n'est jamais réécrite en
 * silence. Si elle est rouverte, le prochain chargement la traitera
 * comme un brouillon et appliquera donc la méthode courante.
 */
export function migrateDraftWeeksToCurrentRounding(): number {
  const { id } = currentEstablishment();
  const candidates = readList<WeeklyWithdrawal>(WEEKS_KEY).filter((w) =>
    w.status !== 'cloturee'
    && w.roundingMethodVersion !== CANTEEN_ROUNDING_METHOD_VERSION
    && (!w.establishmentId || w.establishmentId === id),
  );

  let migrated = 0;
  for (const week of candidates) {
    saveWeek(week);
    migrated++;
  }
  return migrated;
}

export function loadWeeks(): WeeklyWithdrawal[] {
  migrateDraftWeeksToCurrentRounding();
  const { id } = currentEstablishment();
  return readList<WeeklyWithdrawal>(WEEKS_KEY)
    .filter((w) => !w.establishmentId || w.establishmentId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getWeek(id: string): WeeklyWithdrawal | undefined {
  return readList<WeeklyWithdrawal>(WEEKS_KEY).find((w) => w.id === id);
}

export interface NewWeekInput {
  weekStartDate: string;
  weekEndDate: string;
  weeklyStaffCount: number;
  workingDays: number;
  maizeServiceCount: number;
  legume: LegumeKey;
  /** v42 : 'unique' (defaut) ou 'changement'. Voir LegumeMode. */
  legumeMode?: LegumeMode;
}

/**
 * Crée une semaine et calcule immédiatement sa prévision.
 * Les journées sont pré-créées (une par jour ouvrable) en « non saisies ».
 */
export function createWeek(input: NewWeekInput): WeeklyWithdrawal {
  const etab = currentEstablishment();
  const plan = calculateWeeklyPlan({
    staffCount: input.weeklyStaffCount,
    workingDays: input.workingDays,
    maizeServiceCount: input.maizeServiceCount,
    legume: input.legume,
  });

  const days: DailyWithdrawal[] = [];
  for (let i = 1; i <= input.workingDays; i++) {
    days.push({
      dayNumber: i, date: '', staffCount: 0, cereal: 'aucune',
      // v41 : la légumineuse de la semaine sert de valeur de départ ;
      // l'utilisateur peut la changer jour par jour si un stock s'épuise.
      legume: input.legume,
      maizeQuantity: 0, riceQuantity: 0, legumeQuantity: 0,
      oilQuantity: 0, saltQuantity: 0,
    });
  }

  const week: WeeklyWithdrawal = {
    id: newId('sem'),
    roundingMethodVersion: CANTEEN_ROUNDING_METHOD_VERSION,
    legumeMode: input.legumeMode === 'changement' ? 'changement' : 'unique',
    establishmentId: etab.id,
    establishmentName: etab.name,
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    weeklyStaffCount: input.weeklyStaffCount,
    workingDays: input.workingDays,
    maizeServiceCount: input.maizeServiceCount,
    legume: input.legume,
    weeklyPlan: plan,
    dailyWithdrawals: days,
    weeklySummary: calculateWeeklySummary(plan, days),
    status: 'brouillon',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const all = readList<WeeklyWithdrawal>(WEEKS_KEY);
  writeList(WEEKS_KEY, [week, ...all]);
  return week;
}

/**
 * Enregistre une semaine en RECALCULANT tout (§24) : aucune donnée
 * calculée ne peut rester obsolète après une modification.
 */
export function saveWeek(week: WeeklyWithdrawal): WeeklyWithdrawal {
  const plan = calculateWeeklyPlan({
    staffCount: week.weeklyStaffCount,
    workingDays: week.workingDays,
    maizeServiceCount: week.maizeServiceCount,
    legume: week.legume,
  });

  // Les quantités de chaque jour sont TOUJOURS recalculées à partir de
  // l'effectif et de la céréale : jamais saisies à la main (§42).
  const days = week.dailyWithdrawals.slice(0, week.workingDays).map((d) =>
    calculateDailyWithdrawal({
      dayNumber: d.dayNumber,
      date: d.date,
      staffCount: d.staffCount,
      cereal: d.cereal,
      // v41 : on respecte la légumineuse propre à la journée. Les semaines
      // enregistrées avant la v41 n'en ont pas : on retombe alors sur celle
      // de la semaine, ce qui reproduit exactement l'ancien comportement.
      /*
       * v42 — en mode 'unique' (cas normal), la legumineuse de la semaine
       * s'impose a toutes les journees : l'utilisateur a declare qu'il n'y
       * avait pas de changement, on ne laisse donc subsister aucune valeur
       * divergente. En mode 'changement', on respecte le choix du jour.
       */
      /*
       * v44 — « Aucune » n'est PAS une legumineuse divergente : c'est
       * l'absence de legumineuse ce jour-la (rupture, menu different). Elle
       * doit donc survivre meme en mode 'unique', sans quoi la case
       * « Pas de legumineuse ce jour » se decocherait toute seule.
       */
      legume: legumeModeOf(week) === 'unique'
        ? (d.legume === 'aucune' ? 'aucune' : week.legume)
        : (d.legume || week.legume),
    }),
  );
  while (days.length < week.workingDays) {
    days.push({
      dayNumber: days.length + 1, date: '', staffCount: 0, cereal: 'aucune',
      legume: week.legume,
      maizeQuantity: 0, riceQuantity: 0, legumeQuantity: 0, oilQuantity: 0, saltQuantity: 0,
    });
  }

  /*
   * v41 — si la semaine a changé de légumineuse en cours de route, la
   * prévision initiale (une seule légumineuse sur tous les jours) ne
   * correspond plus. On la reconstruit à partir des journées réelles pour
   * que les reliquats restent justes, denrée par denrée.
   */
  // v44 : la prevision se calcule sur l'effectif HEBDOMADAIRE et les jours
  // ouvrables (§7/§8), jamais sur les effectifs journaliers.
  const legumePlan = planLegumesFromDays(days, week.weeklyStaffCount, undefined, {
    plannedLegume: week.legume,
    workingDays: week.workingDays,
  });
  plan.beans = legumePlan.beans;
  plan.yellowPeas = legumePlan.yellowPeas;
  plan.greenPeas = legumePlan.greenPeas;

  const updated: WeeklyWithdrawal = {
    ...week,
    roundingMethodVersion: CANTEEN_ROUNDING_METHOD_VERSION,
    weeklyPlan: plan,
    dailyWithdrawals: days,
    weeklySummary: calculateWeeklySummary(plan, days),
    updatedAt: Date.now(),
  };

  const all = readList<WeeklyWithdrawal>(WEEKS_KEY);
  const i = all.findIndex((w) => w.id === week.id);
  if (i >= 0) all[i] = updated; else all.unshift(updated);
  writeList(WEEKS_KEY, all);
  return updated;
}

/** Clôture (§25) : la semaine devient non modifiable. */
export function closeWeek(id: string): void {
  const all = readList<WeeklyWithdrawal>(WEEKS_KEY);
  const i = all.findIndex((w) => w.id === id);
  if (i >= 0) {
    all[i] = { ...all[i], status: 'cloturee', updatedAt: Date.now() };
    writeList(WEEKS_KEY, all);
  }
}

export function reopenWeek(id: string): void {
  const all = readList<WeeklyWithdrawal>(WEEKS_KEY);
  const i = all.findIndex((w) => w.id === id);
  if (i >= 0) {
    all[i] = { ...all[i], status: 'brouillon', updatedAt: Date.now() };
    writeList(WEEKS_KEY, all);
  }
}

export function deleteWeek(id: string): void {
  writeList(WEEKS_KEY, readList<WeeklyWithdrawal>(WEEKS_KEY).filter((w) => w.id !== id));
}

/** Total de denrées d'une semaine, pour l'affichage de l'historique (§23). */
export function weekTotalFood(w: WeeklyWithdrawal): number {
  const s = w.weeklySummary;
  return round2(s.maizeActual + s.riceActual + s.legumeActual + s.oilActual + s.saltActual);
}

/* ================================================================== */
/* SOUS-MODULE 2 — Cahier des menus hebdomadaires                      */
/* ================================================================== */
/**
 * Reproduit le cahier officiel photographié : pour chaque jour, le menu,
 * la ration par élève, l'effectif (Garçons / Filles / Total), les quantités
 * à sortir et le solde restant.
 */

export interface MenuLine {
  /** Denrée : Maïs, Riz, Pois vert… */
  food: string;
  /** Ration par élève, en kg. */
  ration: number;
  /** Quantité à sortir pour la préparation. */
  quantity: number;
  /** Solde restant après la sortie. */
  balance: number;
}

export interface MenuDay {
  dayLabel: string;   // « Lundi »
  date: string;       // « 08 juin »
  menu: string;       // « Maïs + Pois vert + Huile (Gbêmou Watchê) »
  boys: number;
  girls: number;
  lines: MenuLine[];
}

export interface MenuWeek {
  id: string;
  establishmentId: string;
  establishmentName: string;
  /** v65 : méthode ayant produit les quantités « à sortir » enregistrées. */
  roundingMethodVersion?: string;
  startDate: string;
  endDate: string;
  days: MenuDay[];
  /** Établi par / Fonction / Date — bas du cahier officiel. */
  preparedBy: string;
  role: string;
  signedDate: string;
  createdAt: number;
  updatedAt: number;
}

export function menuDayTotal(d: MenuDay): number {
  return d.boys + d.girls;
}

export function loadMenuWeeks(): MenuWeek[] {
  const { id } = currentEstablishment();
  return readList<MenuWeek>(MENUS_KEY)
    .filter((m) => !m.establishmentId || m.establishmentId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getMenuWeek(id: string): MenuWeek | undefined {
  return readList<MenuWeek>(MENUS_KEY).find((m) => m.id === id);
}

export function saveMenuWeek(week: MenuWeek): MenuWeek {
  const all = readList<MenuWeek>(MENUS_KEY);
  const updated = { ...week, roundingMethodVersion: CANTEEN_ROUNDING_METHOD_VERSION, updatedAt: Date.now() };
  const i = all.findIndex((m) => m.id === week.id);
  if (i >= 0) all[i] = updated; else all.unshift(updated);
  writeList(MENUS_KEY, all);
  return updated;
}

export function createMenuWeek(startDate: string, endDate: string): MenuWeek {
  const etab = currentEstablishment();
  const p: any = getProfile() || {};
  return {
    id: newId('menu'),
    establishmentId: etab.id,
    establishmentName: etab.name,
    roundingMethodVersion: CANTEEN_ROUNDING_METHOD_VERSION,
    startDate,
    endDate,
    days: [],
    preparedBy: p.teacherName || '',
    role: 'Maître cantine',
    signedDate: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function deleteMenuWeek(id: string): void {
  writeList(MENUS_KEY, readList<MenuWeek>(MENUS_KEY).filter((m) => m.id !== id));
}

/** Totaux de la semaine par denrée (ligne de bas de page du cahier). */
export function menuWeekTotals(week: MenuWeek): { food: string; quantity: number; balance: number }[] {
  const map = new Map<string, { quantity: number; balance: number }>();
  for (const d of week.days) {
    for (const l of d.lines) {
      const cur = map.get(l.food) || { quantity: 0, balance: 0 };
      // Le solde retenu est celui du DERNIER jour saisi pour la denrée.
      map.set(l.food, { quantity: round2(cur.quantity + l.quantity), balance: l.balance });
    }
  }
  return [...map.entries()].map(([food, v]) => ({ food, ...v }));
}

/** Effectifs cumulés de la semaine (G / F / T). */
export function menuWeekHeadcount(week: MenuWeek): { boys: number; girls: number; total: number } {
  const boys = week.days.reduce((t, d) => t + d.boys, 0);
  const girls = week.days.reduce((t, d) => t + d.girls, 0);
  return { boys, girls, total: boys + girls };
}

/* ================================================================== */
/* SOUS-MODULE 3 — Cahier de gestion des stocks                        */
/* ================================================================== */
/**
 * Reproduit le cahier de stock photographié (« SEL IODÉ »), avec une
 * SECTION PAR DENRÉE comme demandé. Colonnes officielles :
 *   Date · Stock initial (ancien stock) · Entrée dotation · Stock disponible
 *   · Sortie · Stock restant · Réf · Observations
 *
 * RÈGLES DE CONTRÔLE (déduites du cahier) :
 *   stock_disponible = stock_initial + entrée
 *   stock_restant    = stock_disponible − sortie
 * Ces deux colonnes sont CALCULÉES, jamais saisies : c'est ce qui évite les
 * erreurs d'addition constatées dans le cahier manuscrit.
 */

/** Denrées suivies. Les trois légumineuses demandées y figurent. */
export const STOCK_FOODS = [
  'Maïs', 'Riz', 'Pois vert', 'Pois jaune', 'Haricot', 'Huile', 'Sel iodé',
] as const;

export type StockFood = typeof STOCK_FOODS[number];

/** Unité par denrée (l'huile se compte en litres). */
export const STOCK_UNITS: Record<string, string> = {
  'Maïs': 'Kg', 'Riz': 'Kg', 'Pois vert': 'Kg', 'Pois jaune': 'Kg',
  'Haricot': 'Kg', 'Huile': 'L', 'Sel iodé': 'Kg',
};

export interface StockRow {
  id: string;
  date: string;
  /** Stock initial : repris automatiquement du stock restant précédent. */
  initialStock: number;
  /** Entrée dotation. */
  entry: number;
  /** Calculé : initialStock + entry. */
  available: number;
  /** Sortie du jour. */
  exit: number;
  /** Calculé : available − exit. */
  remaining: number;
  ref: string;
  observations: string;
}

export interface StockLedger {
  establishmentId: string;
  food: string;
  unit: string;
  rows: StockRow[];
}

function allLedgers(): StockLedger[] {
  return readList<StockLedger>(STOCK_KEY);
}

/** Registre d'une denrée (créé vide si absent). */
export function getLedger(food: string): StockLedger {
  const { id } = currentEstablishment();
  const found = allLedgers().find((l) => l.food === food && (!l.establishmentId || l.establishmentId === id));
  return found || { establishmentId: id, food, unit: STOCK_UNITS[food] || 'Kg', rows: [] };
}

export function saveLedger(ledger: StockLedger): void {
  const { id } = currentEstablishment();
  const all = allLedgers();
  const i = all.findIndex((l) => l.food === ledger.food && (!l.establishmentId || l.establishmentId === id));
  const normalised = { ...ledger, establishmentId: id, rows: recomputeLedger(ledger.rows) };
  if (i >= 0) all[i] = normalised; else all.push(normalised);
  writeList(STOCK_KEY, all);
}

/**
 * RECALCUL EN CHAÎNE du registre.
 *
 * Le stock initial d'une ligne est TOUJOURS le stock restant de la ligne
 * précédente : c'est la règle du cahier (« Stock initial ancien stock »).
 * Modifier une ligne ancienne met donc automatiquement à jour toutes les
 * suivantes — ce qu'un cahier papier ne sait pas faire.
 */
export function recomputeLedger(rows: StockRow[]): StockRow[] {
  const sorted = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let previousRemaining: number | null = null;
  return sorted.map((r) => {
    const initial = previousRemaining === null ? round2(r.initialStock || 0) : previousRemaining;
    const entry = round2(r.entry || 0);
    const available = round2(initial + entry);
    const exit = round2(r.exit || 0);
    const remaining = round2(available - exit);
    previousRemaining = remaining;
    return { ...r, initialStock: initial, entry, available, exit, remaining };
  });
}

/**
 * v65 — une SORTIE de stock suit la même méthode par intervalles que le
 * simulateur et le cahier des menus. Les entrées/dotation et le stock
 * initial ne sont jamais arrondis par cette règle : ce ne sont pas des
 * prélèvements pour la préparation.
 */
export function normalizeStockExit(food: string, exit: number): number {
  return roundCanteenNamedFoodOutput(Math.max(0, Number(exit) || 0), food);
}

export function addStockRow(food: string, row: Omit<StockRow, 'id' | 'available' | 'remaining'>): StockLedger {
  const ledger = getLedger(food);
  const withId: StockRow = {
    ...row,
    exit: normalizeStockExit(food, row.exit),
    id: newId('stk'), available: 0, remaining: 0,
  };
  const next = { ...ledger, rows: recomputeLedger([...ledger.rows, withId]) };
  saveLedger(next);
  return getLedger(food);
}

export function updateStockRow(
  food: string,
  rowId: string,
  patch: Partial<StockRow>,
  options?: { roundExit?: boolean },
): StockLedger {
  const ledger = getLedger(food);
  const effectivePatch: Partial<StockRow> = { ...patch };
  if (options?.roundExit && effectivePatch.exit !== undefined) {
    effectivePatch.exit = normalizeStockExit(food, effectivePatch.exit);
  }
  const rows = ledger.rows.map((r) => (r.id === rowId ? { ...r, ...effectivePatch, id: r.id } : r));
  saveLedger({ ...ledger, rows });
  return getLedger(food);
}

export function removeStockRow(food: string, rowId: string): StockLedger {
  const ledger = getLedger(food);
  saveLedger({ ...ledger, rows: ledger.rows.filter((r) => r.id !== rowId) });
  return getLedger(food);
}

/** Stock actuellement disponible pour une denrée. */
export function currentStock(food: string): number {
  const rows = getLedger(food).rows;
  return rows.length ? rows[rows.length - 1].remaining : 0;
}

/** Alerte de rupture ou de stock négatif (impossible sur un cahier papier). */
export function stockAlert(food: string): string | null {
  const stock = currentStock(food);
  const unit = STOCK_UNITS[food] || 'Kg';
  if (stock < 0) return `Stock négatif (${stock} ${unit}) : une sortie dépasse le stock disponible.`;
  if (stock === 0) return 'Stock épuisé.';
  return null;
}

/** Vue d'ensemble de toutes les denrées. */
export function stockOverview(): { food: string; unit: string; stock: number; alert: string | null; rows: number }[] {
  return STOCK_FOODS.map((food) => ({
    food,
    unit: STOCK_UNITS[food] || 'Kg',
    stock: currentStock(food),
    alert: stockAlert(food),
    rows: getLedger(food).rows.length,
  }));
}

export type { WeeklyWithdrawal, WeeklyPlan, DailyWithdrawal, WeeklySummary, LegumeKey, CerealKey };
