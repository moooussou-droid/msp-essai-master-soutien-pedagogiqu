/**
 * MON GESTIONNAIRE COMPTABLE MSP — moteur de calcul (v42).
 *
 * Service de calcul INDÉPENDANT de toute interface (règle v40 §« les formules
 * ne vivent pas dans les composants visuels ») : tout ce qui suit est testable
 * sans navigateur.
 *
 * Ce module couvre :
 *  - les recettes journalières, par classe et par « autre volet » ;
 *  - les dépenses journalières, avec l'objet de chaque mouvement ;
 *  - le budget prévisionnel de l'école et son suivi (écarts) ;
 *  - le bilan et l'inventaire de fin d'exercice au format OHADA.
 *
 * RÉFÉRENTIEL COMPTABLE
 * ---------------------
 * Le Bénin applique le SYSCOHADA révisé (Acte uniforme relatif au droit
 * comptable et à l'information financière, applicable depuis le 1er janvier
 * 2018). Une école privée relève en pratique du « système minimal de
 * trésorerie » ou du système normal selon sa taille. On retient ici la
 * logique de trésorerie (recettes encaissées / dépenses décaissées), qui
 * correspond à ce que tient réellement un directeur d'école, tout en
 * présentant les résultats avec les regroupements et les numéros de comptes
 * OHADA afin que le document soit recevable par un comptable.
 *
 * HONNÊTETÉ DU DOCUMENT PRODUIT
 * -----------------------------
 * Le bilan produit est un état de synthèse « aux normes OHADA » dans sa
 * présentation et son plan de comptes. Il ne remplace pas la validation d'un
 * expert-comptable : `OHADA_DISCLAIMER` est apposé sur les exports, car
 * laisser croire à un document certifié serait trompeur.
 */

/** Mention portée sur les états OHADA produits par l'application. */
export const OHADA_DISCLAIMER =
  'État établi selon la présentation du SYSCOHADA révisé, à partir des '
  + 'écritures saisies dans l’application. À faire viser par un comptable '
  + 'avant tout dépôt officiel.';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Origine d'une recette : une classe, ou un autre volet d'activité. */
export type RevenueSource = 'classe' | 'autre';

/**
 * Volets de recette hors scolarité.
 * Chaque volet porte son compte OHADA de produit (classe 7).
 */
export const REVENUE_CATEGORIES = {
  scolarite:   { label: 'Frais de scolarité',        account: '7061' },
  inscription: { label: 'Frais d’inscription',        account: '7062' },
  cantine:     { label: 'Cantine scolaire',           account: '7063' },
  transport:   { label: 'Transport scolaire',         account: '7064' },
  fournitures: { label: 'Vente de fournitures',       account: '7071' },
  uniformes:   { label: 'Vente d’uniformes',          account: '7072' },
  subvention:  { label: 'Subventions reçues',         account: '7181' },
  don:         { label: 'Dons et contributions',      account: '7588' },
  autre:       { label: 'Autres recettes',            account: '7588' },
} as const;

export type RevenueCategory = keyof typeof REVENUE_CATEGORIES;

/**
 * Postes de dépense, avec leur compte OHADA de charge (classes 6 et 2).
 * `investment: true` = immobilisation (classe 2) : la dépense n'est pas une
 * charge de l'exercice mais entre à l'actif et alimente l'inventaire.
 */
export const EXPENSE_CATEGORIES = {
  salaires:    { label: 'Salaires et charges',        account: '6611', investment: false },
  fournitures: { label: 'Fournitures scolaires',      account: '6047', investment: false },
  cantine:     { label: 'Achats cantine',             account: '6011', investment: false },
  entretien:   { label: 'Entretien et réparations',   account: '6241', investment: false },
  electricite: { label: 'Électricité et eau',         account: '6051', investment: false },
  loyer:       { label: 'Loyers',                     account: '6221', investment: false },
  transport:   { label: 'Transport et déplacements',  account: '6281', investment: false },
  communication: { label: 'Téléphone et internet',    account: '6285', investment: false },
  impots:      { label: 'Impôts et taxes',            account: '6411', investment: false },
  mobilier:    { label: 'Mobilier et matériel',       account: '2441', investment: true },
  equipement:  { label: 'Équipement informatique',    account: '2442', investment: true },
  batiment:    { label: 'Construction et bâtiment',   account: '2313', investment: true },
  autre:       { label: 'Autres dépenses',            account: '6588', investment: false },
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

/** Moyens de règlement (comptes de trésorerie OHADA). */
export const PAYMENT_METHODS = {
  especes:      { label: 'Espèces',       account: '571' },
  mobile_money: { label: 'Mobile money',  account: '5521' },
  banque:       { label: 'Banque',        account: '521' },
  cheque:       { label: 'Chèque',        account: '5121' },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/** Une recette encaissée un jour donné. */
export interface RevenueEntry {
  id: string;
  /** Date au format ISO AAAA-MM-JJ. */
  date: string;
  source: RevenueSource;
  /** Classe concernée si `source === 'classe'` (ex. « CM2 »). */
  className?: string;
  category: RevenueCategory;
  /** Objet précis : ce à quoi correspond l'encaissement. */
  object: string;
  amount: number;
  method: PaymentMethod;
  /** Personne ou entité qui a payé. */
  payer?: string;
  note?: string;
  createdAt: number;
}

/** Une dépense décaissée un jour donné. */
export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  /** Objet précis de la dépense. */
  object: string;
  amount: number;
  method: PaymentMethod;
  /** Bénéficiaire du paiement. */
  payee?: string;
  /** Référence de la pièce justificative (facture, reçu). */
  receipt?: string;
  note?: string;
  createdAt: number;
}

/** Ligne de prévision budgétaire, saisie par le Directeur. */
export interface BudgetLine {
  id: string;
  kind: 'recette' | 'depense';
  /** Clé de catégorie correspondante (RevenueCategory ou ExpenseCategory). */
  category: string;
  label: string;
  /** Montant prévu pour tout l'exercice. */
  planned: number;
  note?: string;
}

/** Exercice budgétaire (année scolaire). */
export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  closed: boolean;
}

/* ------------------------------------------------------------------ */
/* Utilitaires numériques                                              */
/* ------------------------------------------------------------------ */

/**
 * Arrondi au franc CFA. Le FCFA n'a pas de subdivision en usage : tout
 * montant doit être un entier, sinon les totaux affichés ne correspondent
 * plus à la caisse réelle.
 */
export function roundFcfa(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Somme robuste : ignore les valeurs non numériques plutôt que produire NaN. */
export function sumAmounts(values: number[]): number {
  let t = 0;
  for (const v of values) if (Number.isFinite(v)) t += v;
  return roundFcfa(t);
}

/** Formatage monétaire béninois : séparateur d'espace, suffixe FCFA. */
export function formatFcfa(n: number): string {
  const v = roundFcfa(n);
  const sign = v < 0 ? '-' : '';
  const digits = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${digits} FCFA`;
}

/** Vrai si `date` (ISO) tombe dans l'exercice, bornes incluses. */
export function isWithinYear(date: string, year: FiscalYear): boolean {
  if (!date) return false;
  return date >= year.startDate && date <= year.endDate;
}

/* ------------------------------------------------------------------ */
/* Agrégations journalières                                            */
/* ------------------------------------------------------------------ */

export interface DailySummary {
  date: string;
  totalRevenue: number;
  totalExpense: number;
  /** Solde du jour : recettes − dépenses. Peut être négatif. */
  balance: number;
  revenueCount: number;
  expenseCount: number;
}

/**
 * Point d'une journée. Le solde peut être NÉGATIF : on ne le masque jamais
 * (même règle que les reliquats de cantine en v40), car un directeur doit
 * voir immédiatement qu'il a décaissé plus qu'il n'a encaissé.
 */
export function dailySummary(
  date: string,
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
): DailySummary {
  const r = revenues.filter((e) => e.date === date);
  const d = expenses.filter((e) => e.date === date);
  const totalRevenue = sumAmounts(r.map((e) => e.amount));
  const totalExpense = sumAmounts(d.map((e) => e.amount));
  return {
    date,
    totalRevenue,
    totalExpense,
    balance: roundFcfa(totalRevenue - totalExpense),
    revenueCount: r.length,
    expenseCount: d.length,
  };
}

/** Recettes d'une journée ventilées par classe (volet « par classe »). */
export function revenueByClass(
  revenues: RevenueEntry[],
  date?: string,
): { className: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of revenues) {
    if (date && e.date !== date) continue;
    if (e.source !== 'classe') continue;
    const key = (e.className || '').trim() || 'Classe non précisée';
    const cur = map.get(key) || { total: 0, count: 0 };
    cur.total += Number.isFinite(e.amount) ? e.amount : 0;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([className, v]) => ({ className, total: roundFcfa(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

/** Recettes ventilées par volet (hors classes, ou toutes si `all`). */
export function revenueByCategory(
  revenues: RevenueEntry[],
  opts?: { date?: string; onlyOther?: boolean },
): { category: RevenueCategory; label: string; account: string; total: number; count: number }[] {
  const map = new Map<RevenueCategory, { total: number; count: number }>();
  for (const e of revenues) {
    if (opts?.date && e.date !== opts.date) continue;
    if (opts?.onlyOther && e.source !== 'autre') continue;
    const cur = map.get(e.category) || { total: 0, count: 0 };
    cur.total += Number.isFinite(e.amount) ? e.amount : 0;
    cur.count += 1;
    map.set(e.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      label: REVENUE_CATEGORIES[category]?.label || String(category),
      account: REVENUE_CATEGORIES[category]?.account || '7588',
      total: roundFcfa(v.total),
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Dépenses ventilées par poste. */
export function expenseByCategory(
  expenses: ExpenseEntry[],
  date?: string,
): { category: ExpenseCategory; label: string; account: string; investment: boolean; total: number; count: number }[] {
  const map = new Map<ExpenseCategory, { total: number; count: number }>();
  for (const e of expenses) {
    if (date && e.date !== date) continue;
    const cur = map.get(e.category) || { total: 0, count: 0 };
    cur.total += Number.isFinite(e.amount) ? e.amount : 0;
    cur.count += 1;
    map.set(e.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      label: EXPENSE_CATEGORIES[category]?.label || String(category),
      account: EXPENSE_CATEGORIES[category]?.account || '6588',
      investment: EXPENSE_CATEGORIES[category]?.investment === true,
      total: roundFcfa(v.total),
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Ventilation par moyen de paiement : sert à contrôler caisse et banque. */
export function treasuryByMethod(
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
): { method: PaymentMethod; label: string; account: string; inflow: number; outflow: number; net: number }[] {
  const keys = Object.keys(PAYMENT_METHODS) as PaymentMethod[];
  return keys.map((m) => {
    const inflow = sumAmounts(revenues.filter((e) => e.method === m).map((e) => e.amount));
    const outflow = sumAmounts(expenses.filter((e) => e.method === m).map((e) => e.amount));
    return {
      method: m,
      label: PAYMENT_METHODS[m].label,
      account: PAYMENT_METHODS[m].account,
      inflow,
      outflow,
      net: roundFcfa(inflow - outflow),
    };
  }).filter((r) => r.inflow !== 0 || r.outflow !== 0);
}

/* ------------------------------------------------------------------ */
/* Suivi budgétaire                                                    */
/* ------------------------------------------------------------------ */

export interface BudgetTracking {
  line: BudgetLine;
  /** Montant réellement réalisé sur l'exercice. */
  actual: number;
  /** Écart = réalisé − prévu. */
  variance: number;
  /** Taux de réalisation en % (0 si la prévision est nulle). */
  rate: number;
  /**
   * Alerte de dépassement : une DÉPENSE qui dépasse sa prévision.
   * Une recette supérieure à la prévision est une bonne nouvelle, pas une
   * alerte : on ne les confond donc pas.
   */
  overrun: boolean;
}

/**
 * Compare prévisions et réalisations, ligne par ligne.
 *
 * Le taux de réalisation vaut 0 quand la prévision est nulle : diviser par
 * zéro donnerait Infinity et afficherait un pourcentage absurde.
 */
export function trackBudget(
  lines: BudgetLine[],
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
): BudgetTracking[] {
  return lines.map((line) => {
    const actual = line.kind === 'recette'
      ? sumAmounts(revenues.filter((e) => e.category === line.category).map((e) => e.amount))
      : sumAmounts(expenses.filter((e) => e.category === line.category).map((e) => e.amount));
    const variance = roundFcfa(actual - line.planned);
    const rate = line.planned > 0 ? Math.round((actual / line.planned) * 100) : 0;
    return {
      line,
      actual,
      variance,
      rate,
      overrun: line.kind === 'depense' && variance > 0,
    };
  });
}

export interface BudgetTotals {
  plannedRevenue: number;
  plannedExpense: number;
  /** Résultat prévisionnel : recettes prévues − dépenses prévues. */
  plannedResult: number;
  actualRevenue: number;
  actualExpense: number;
  actualResult: number;
  /** Nombre de lignes de dépense en dépassement. */
  overrunCount: number;
}

export function budgetTotals(tracking: BudgetTracking[]): BudgetTotals {
  const rev = tracking.filter((t) => t.line.kind === 'recette');
  const exp = tracking.filter((t) => t.line.kind === 'depense');
  const plannedRevenue = sumAmounts(rev.map((t) => t.line.planned));
  const plannedExpense = sumAmounts(exp.map((t) => t.line.planned));
  const actualRevenue = sumAmounts(rev.map((t) => t.actual));
  const actualExpense = sumAmounts(exp.map((t) => t.actual));
  return {
    plannedRevenue,
    plannedExpense,
    plannedResult: roundFcfa(plannedRevenue - plannedExpense),
    actualRevenue,
    actualExpense,
    actualResult: roundFcfa(actualRevenue - actualExpense),
    overrunCount: exp.filter((t) => t.overrun).length,
  };
}

/* ------------------------------------------------------------------ */
/* Bilan et inventaire OHADA                                           */
/* ------------------------------------------------------------------ */

export interface OhadaLine {
  account: string;
  label: string;
  amount: number;
}

export interface OhadaBalance {
  year: FiscalYear;
  /** Produits de l'exercice (classe 7). */
  products: OhadaLine[];
  totalProducts: number;
  /** Charges de l'exercice (classe 6), hors immobilisations. */
  charges: OhadaLine[];
  totalCharges: number;
  /** Résultat net = produits − charges. Négatif = perte. */
  netResult: number;
  /** Immobilisations acquises (classe 2) : actif immobilisé. */
  assets: OhadaLine[];
  totalAssets: number;
  /** Trésorerie par compte (classe 5). */
  treasury: OhadaLine[];
  totalTreasury: number;
  /** Total de l'actif = immobilisations + trésorerie. */
  totalActif: number;
  /**
   * Total du passif = résultat net + ressources antérieures.
   * En trésorerie pure, l'équilibre s'écrit :
   *   actif (immobilisations + trésorerie) = report initial + résultat.
   */
  openingBalance: number;
  totalPassif: number;
  /** L'actif et le passif s'équilibrent-ils ? */
  balanced: boolean;
  disclaimer: string;
}

/**
 * Construit le bilan de l'exercice selon la présentation OHADA.
 *
 * MÉTHODE
 * -------
 * 1. On ne retient que les écritures datées DANS l'exercice.
 * 2. Les dépenses d'immobilisation (classe 2) sont sorties des charges : une
 *    table achetée n'est pas consommée dans l'année, elle entre à l'actif.
 *    C'est la correction comptable la plus fréquente dans les cahiers tenus
 *    à la main, où tout est mélangé.
 * 3. Résultat net = produits − charges (hors immobilisations).
 * 4. Trésorerie finale = report initial + encaissements − décaissements
 *    (immobilisations comprises : elles sortent bien de la caisse).
 * 5. Contrôle d'équilibre : actif = passif. S'il est faux, `balanced` est
 *    à false et l'écart est visible : on ne force jamais l'équilibre.
 */
export function buildOhadaBalance(
  year: FiscalYear,
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
  openingBalance = 0,
): OhadaBalance {
  const rev = revenues.filter((e) => isWithinYear(e.date, year));
  const exp = expenses.filter((e) => isWithinYear(e.date, year));

  const products: OhadaLine[] = revenueByCategory(rev).map((r) => ({
    account: r.account, label: r.label, amount: r.total,
  }));
  const totalProducts = sumAmounts(products.map((p) => p.amount));

  const byCat = expenseByCategory(exp);
  const charges: OhadaLine[] = byCat
    .filter((c) => !c.investment)
    .map((c) => ({ account: c.account, label: c.label, amount: c.total }));
  const totalCharges = sumAmounts(charges.map((c) => c.amount));

  const assets: OhadaLine[] = byCat
    .filter((c) => c.investment)
    .map((c) => ({ account: c.account, label: c.label, amount: c.total }));
  const totalAssets = sumAmounts(assets.map((a) => a.amount));

  const netResult = roundFcfa(totalProducts - totalCharges);

  // Trésorerie : tous les décaissements sortent de la caisse, y compris les
  // immobilisations. D'où `totalCharges + totalAssets`.
  const totalDecaissements = roundFcfa(totalCharges + totalAssets);
  const treasuryNet = roundFcfa(openingBalance + totalProducts - totalDecaissements);

  const treasury: OhadaLine[] = treasuryByMethod(rev, exp).map((t) => ({
    account: t.account, label: t.label, amount: t.net,
  }));
  // Le report initial est ajouté sur la caisse (compte 571) s'il existe.
  const totalTreasury = treasuryNet;

  const totalActif = roundFcfa(totalAssets + totalTreasury);
  const totalPassif = roundFcfa(openingBalance + netResult);

  return {
    year,
    products,
    totalProducts,
    charges,
    totalCharges,
    netResult,
    assets,
    totalAssets,
    treasury,
    totalTreasury,
    totalActif,
    openingBalance,
    totalPassif,
    balanced: totalActif === totalPassif,
    disclaimer: OHADA_DISCLAIMER,
  };
}

export interface InventoryItem {
  account: string;
  label: string;
  /** Objets acquis, tels que saisis dans le champ « objet ». */
  objects: { date: string; object: string; amount: number; receipt?: string }[];
  total: number;
}

/**
 * Inventaire OHADA des biens acquis pendant l'exercice.
 *
 * L'inventaire liste les OBJETS eux-mêmes (« 20 tables-bancs », « 1
 * ordinateur »), et pas seulement des totaux : c'est précisément ce qu'un
 * inventaire doit permettre de pointer physiquement dans l'école.
 */
export function buildInventory(year: FiscalYear, expenses: ExpenseEntry[]): InventoryItem[] {
  const exp = expenses.filter(
    (e) => isWithinYear(e.date, year) && EXPENSE_CATEGORIES[e.category]?.investment,
  );
  const map = new Map<ExpenseCategory, InventoryItem>();
  for (const e of exp) {
    const meta = EXPENSE_CATEGORIES[e.category];
    const cur = map.get(e.category) || {
      account: meta.account, label: meta.label, objects: [], total: 0,
    };
    cur.objects.push({
      date: e.date,
      object: (e.object || '').trim() || 'Objet non précisé',
      amount: roundFcfa(e.amount),
      receipt: e.receipt,
    });
    cur.total = roundFcfa(cur.total + e.amount);
    map.set(e.category, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Total général de l'inventaire. */
export function inventoryTotal(items: InventoryItem[]): number {
  return sumAmounts(items.map((i) => i.total));
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Contrôle de saisie d'un mouvement. On refuse un montant nul ou négatif :
 * une recette négative doit être saisie comme une dépense, sinon les totaux
 * et le bilan deviennent inexploitables.
 */
export function validateEntry(input: {
  date: string; amount: number; object: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.date) errors.push('La date est obligatoire.');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('La date est invalide.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push('Le montant doit être supérieur à zéro.');
  }
  if (!(input.object || '').trim()) errors.push('L’objet est obligatoire.');
  return { valid: errors.length === 0, errors };
}
