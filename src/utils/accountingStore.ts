/**
 * MON GESTIONNAIRE COMPTABLE MSP — persistance (v42).
 *
 * Même principe que la cantine (v40) : les données sont rattachées à
 * l'établissement de l'utilisateur connecté et conservées en local, donc
 * disponibles hors ligne.
 */
import { safeGetItem, safeSetItem } from './safeStorage';
import {
  RevenueEntry, ExpenseEntry, BudgetLine, FiscalYear,
} from './accountingCalc';

const REV_KEY = 'msp_acc_revenues';
const EXP_KEY = 'msp_acc_expenses';
const BUD_KEY = 'msp_acc_budget';
const YEAR_KEY = 'msp_acc_years';
const OPEN_KEY = 'msp_acc_opening';

function readList<T>(key: string): T[] {
  try {
    const raw = safeGetItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch { return []; }
}

function writeList<T>(key: string, list: T[]): void {
  try { safeSetItem(key, JSON.stringify(list)); } catch { /* quota */ }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Date du jour au format ISO AAAA-MM-JJ. */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/* ----------------------------- Recettes ----------------------------- */

export function loadRevenues(): RevenueEntry[] {
  return readList<RevenueEntry>(REV_KEY).sort((a, b) => b.date.localeCompare(a.date));
}

export function addRevenue(e: Omit<RevenueEntry, 'id' | 'createdAt'>): RevenueEntry {
  const entry: RevenueEntry = { ...e, id: newId('rec'), createdAt: Date.now() };
  writeList(REV_KEY, [entry, ...readList<RevenueEntry>(REV_KEY)]);
  return entry;
}

export function updateRevenue(entry: RevenueEntry): void {
  const all = readList<RevenueEntry>(REV_KEY);
  const i = all.findIndex((x) => x.id === entry.id);
  if (i >= 0) { all[i] = entry; writeList(REV_KEY, all); }
}

export function deleteRevenue(id: string): void {
  writeList(REV_KEY, readList<RevenueEntry>(REV_KEY).filter((x) => x.id !== id));
}

/* ----------------------------- Dépenses ----------------------------- */

export function loadExpenses(): ExpenseEntry[] {
  return readList<ExpenseEntry>(EXP_KEY).sort((a, b) => b.date.localeCompare(a.date));
}

export function addExpense(e: Omit<ExpenseEntry, 'id' | 'createdAt'>): ExpenseEntry {
  const entry: ExpenseEntry = { ...e, id: newId('dep'), createdAt: Date.now() };
  writeList(EXP_KEY, [entry, ...readList<ExpenseEntry>(EXP_KEY)]);
  return entry;
}

export function updateExpense(entry: ExpenseEntry): void {
  const all = readList<ExpenseEntry>(EXP_KEY);
  const i = all.findIndex((x) => x.id === entry.id);
  if (i >= 0) { all[i] = entry; writeList(EXP_KEY, all); }
}

export function deleteExpense(id: string): void {
  writeList(EXP_KEY, readList<ExpenseEntry>(EXP_KEY).filter((x) => x.id !== id));
}

/* ------------------------------ Budget ------------------------------ */

export function loadBudget(): BudgetLine[] {
  return readList<BudgetLine>(BUD_KEY);
}

export function saveBudgetLine(line: BudgetLine): void {
  const all = readList<BudgetLine>(BUD_KEY);
  const i = all.findIndex((x) => x.id === line.id);
  if (i >= 0) all[i] = line; else all.push(line);
  writeList(BUD_KEY, all);
}

export function addBudgetLine(l: Omit<BudgetLine, 'id'>): BudgetLine {
  const line: BudgetLine = { ...l, id: newId('bud') };
  writeList(BUD_KEY, [...readList<BudgetLine>(BUD_KEY), line]);
  return line;
}

export function deleteBudgetLine(id: string): void {
  writeList(BUD_KEY, readList<BudgetLine>(BUD_KEY).filter((x) => x.id !== id));
}

/* ---------------------------- Exercices ----------------------------- */

/**
 * Exercice par défaut : l'année scolaire béninoise commence en SEPTEMBRE
 * (rentrée) et se termine fin août. L'exercice court donc du 1er septembre
 * au 31 août suivant.
 *
 * Attention : une première version faisait démarrer l'exercice au 1er
 * octobre. Les recettes d'inscription encaissées en septembre — le plus
 * gros de la rentrée — tombaient alors HORS exercice, et le bilan
 * s'affichait à zéro. La borne de septembre est donc indispensable.
 */
export function defaultFiscalYear(): FiscalYear {
  const now = new Date();
  // Mois index 8 = septembre : à partir de septembre, on est dans l'exercice
  // qui porte l'année civile courante.
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    id: `ex-${y}`,
    label: `${y}-${y + 1}`,
    startDate: `${y}-09-01`,
    endDate: `${y + 1}-08-31`,
    closed: false,
  };
}

export function loadYears(): FiscalYear[] {
  const list = readList<FiscalYear>(YEAR_KEY);
  if (list.length === 0) {
    const d = defaultFiscalYear();
    writeList(YEAR_KEY, [d]);
    return [d];
  }
  return list;
}

export function saveYear(year: FiscalYear): void {
  const all = loadYears();
  const i = all.findIndex((x) => x.id === year.id);
  if (i >= 0) all[i] = year; else all.push(year);
  writeList(YEAR_KEY, all);
}

export function currentYear(): FiscalYear {
  const all = loadYears();
  return all.find((y) => !y.closed) || all[0];
}

/* -------------------------- Report initial -------------------------- */

/** Trésorerie existante au premier jour de l'exercice (report à nouveau). */
export function getOpeningBalance(yearId: string): number {
  try {
    const raw = safeGetItem(OPEN_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const v = Number(map[yearId]);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

export function setOpeningBalance(yearId: string, amount: number): void {
  try {
    const raw = safeGetItem(OPEN_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[yearId] = Number.isFinite(amount) ? Math.round(amount) : 0;
    safeSetItem(OPEN_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

/** Liste des classes déjà utilisées, pour proposer une saisie rapide. */
export function knownClasses(): string[] {
  const set = new Set<string>();
  for (const r of readList<RevenueEntry>(REV_KEY)) {
    const c = (r.className || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort();
}

/** Toutes les dates ayant au moins un mouvement, les plus récentes d'abord. */
export function activeDates(): string[] {
  const set = new Set<string>();
  for (const r of readList<RevenueEntry>(REV_KEY)) if (r.date) set.add(r.date);
  for (const e of readList<ExpenseEntry>(EXP_KEY)) if (e.date) set.add(e.date);
  return [...set].sort((a, b) => b.localeCompare(a));
}
