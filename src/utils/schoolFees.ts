/**
 * ② SUIVI DES PAIEMENTS PAR ÉLÈVE (v52).
 *
 * ── POURQUOI ────────────────────────────────────────────────────────
 * La comptabilité existante (`accountingStore`) enregistre des recettes
 * GLOBALES par classe. Elle ne répond pas à la question quotidienne du
 * directeur : « cet élève a-t-il payé, et combien reste-t-il ? »
 * L'absence de réponse écrite est la première cause de litige avec les
 * familles. Ce module raisonne donc **par élève**, et délivre un reçu.
 *
 * ── PRINCIPE COMPTABLE ──────────────────────────────────────────────
 *   reste dû = montant appelé − remises − somme des versements
 *
 * Les versements partiels sont la norme au Bénin (paiement échelonné sur
 * l'année). Le module accepte donc autant de versements que nécessaire,
 * chacun daté, numéroté et justifié par un reçu.
 *
 * ⚠️ Un reste dû NÉGATIF (trop-perçu) n'est jamais masqué : il est
 * affiché tel quel et signalé, conformément à la règle établie pour la
 * cantine. Masquer une anomalie comptable empêche de la corriger.
 *
 * ── ARRONDI ─────────────────────────────────────────────────────────
 * Le franc CFA n'a pas de subdivision en usage : tous les montants sont
 * arrondis à l'unité. On évite ainsi les centimes fantômes issus des
 * calculs en virgule flottante.
 */

export const FEES_KEY = 'msp_school_fees';

/** Nature de la somme appelée. Paramétrable : rien n'est figé en dur. */
export interface FeeType {
  id: string;
  label: string;
  /** Montant par défaut, en francs CFA. */
  defaultAmount: number;
}

export const DEFAULT_FEE_TYPES: FeeType[] = [
  { id: 'scolarite', label: 'Frais de scolarité', defaultAmount: 0 },
  { id: 'cantine', label: 'Cantine', defaultAmount: 0 },
  { id: 'fournitures', label: 'Fournitures', defaultAmount: 0 },
  { id: 'inscription', label: 'Inscription', defaultAmount: 0 },
  { id: 'tenue', label: 'Tenue scolaire', defaultAmount: 0 },
];

export interface Payment {
  id: string;
  /** Date ISO du versement. */
  date: string;
  amount: number;
  /** Numéro de reçu, unique dans l'établissement. */
  receiptNo: string;
  /** Espèces, Mobile Money, virement… */
  method?: string;
  note?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentLabel: string;
  classId: string;
  className: string;
  feeTypeId: string;
  feeLabel: string;
  /** Somme appelée. */
  amountDue: number;
  /** Remise accordée (bourse, fratrie, cas social). */
  discount: number;
  payments: Payment[];
  /** Année scolaire, ex. « 2026-2027 ». */
  schoolYear: string;
  updatedAt: number;
}

const round = (n: number) => Math.round(Number(n) || 0);

export function loadFees(): FeeRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FEES_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveFees(list: FeeRecord[]): void {
  try { localStorage.setItem(FEES_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/** Total effectivement versé pour une ligne. */
export function totalPaid(record: FeeRecord): number {
  return round((record.payments || []).reduce((t, p) => t + (Number(p.amount) || 0), 0));
}

/**
 * Reste dû. Peut être négatif en cas de trop-perçu : c'est voulu, la
 * situation doit être visible pour être régularisée.
 */
export function balanceOf(record: FeeRecord): number {
  return round(record.amountDue) - round(record.discount) - totalPaid(record);
}

export type FeeStatus = 'solde' | 'partiel' | 'impaye' | 'trop_percu';

export function statusOf(record: FeeRecord): FeeStatus {
  const balance = balanceOf(record);
  if (balance < 0) return 'trop_percu';
  if (balance === 0) return 'solde';
  return totalPaid(record) > 0 ? 'partiel' : 'impaye';
}

export const STATUS_LABELS: Record<FeeStatus, string> = {
  solde: 'Soldé',
  partiel: 'Partiel',
  impaye: 'Impayé',
  trop_percu: 'Trop-perçu',
};

export interface FeeSummary {
  expected: number;
  collected: number;
  outstanding: number;
  /** Taux de recouvrement en %, arrondi au dixième. */
  recoveryRate: number;
  countSolde: number;
  countPartiel: number;
  countImpaye: number;
  countTropPercu: number;
}

/**
 * Synthèse d'un ensemble de lignes.
 *
 * TAUX DE RECOUVREMENT = encaissé ÷ attendu × 100, où « attendu » est net
 * des remises : réclamer un taux sur des sommes volontairement remises
 * donnerait une image faussement mauvaise de la gestion.
 *
 * Les trop-perçus sont exclus du reste dû (on ne compense pas la dette
 * d'un élève par le trop-versé d'un autre).
 */
export function summarize(records: FeeRecord[]): FeeSummary {
  let expected = 0;
  let collected = 0;
  let outstanding = 0;
  let countSolde = 0; let countPartiel = 0; let countImpaye = 0; let countTropPercu = 0;

  for (const r of records) {
    expected += round(r.amountDue) - round(r.discount);
    collected += totalPaid(r);
    const b = balanceOf(r);
    if (b > 0) outstanding += b;
    switch (statusOf(r)) {
      case 'solde': countSolde++; break;
      case 'partiel': countPartiel++; break;
      case 'impaye': countImpaye++; break;
      default: countTropPercu++; break;
    }
  }

  return {
    expected, collected, outstanding,
    recoveryRate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
    countSolde, countPartiel, countImpaye, countTropPercu,
  };
}

/**
 * Numéro de reçu : AAAA-NNNN, la séquence repartant à chaque année.
 * On se fonde sur le maximum existant et non sur le nombre de reçus,
 * afin qu'une suppression ne puisse jamais réattribuer un numéro déjà
 * remis à une famille.
 */
export function nextReceiptNo(records: FeeRecord[], year = new Date().getFullYear()): string {
  const prefix = `${year}-`;
  let max = 0;
  for (const r of records) {
    for (const p of r.payments || []) {
      if (typeof p.receiptNo === 'string' && p.receiptNo.startsWith(prefix)) {
        const n = parseInt(p.receiptNo.slice(prefix.length), 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/** Montant en toutes lettres — obligatoire sur un reçu officiel. */
export function amountInWords(amount: number): string {
  const n = Math.abs(round(amount));
  if (n === 0) return 'zéro franc CFA';

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante',
    'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const sousCent = (x: number): string => {
    if (x < 20) return unites[x];
    const d = Math.floor(x / 10);
    const u = x % 10;
    if (d === 7 || d === 9) {
      const base = dizaines[d];
      const reste = unites[10 + u];
      return u === 1 && d === 7 ? `${base} et onze` : `${base}-${reste}`;
    }
    if (u === 0) return dizaines[d] + (d === 8 ? 's' : '');
    if (u === 1 && d !== 8) return `${dizaines[d]} et un`;
    return `${dizaines[d]}-${unites[u]}`;
  };

  /*
   * ORTHOGRAPHE DE « CENT » :
   *  - « cent » prend un s quand il est multiplie ET termine le nombre
   *    → « deux cents », mais « deux cent trois » ;
   *  - il ne prend JAMAIS de s devant « mille » (mille est invariable et
   *    n'est pas un nom) → « cinq cent mille », et non « cinq cents mille ».
   * D'ou le parametre `suiviDeMille`, sans lequel un recu officiel
   * afficherait une faute d'orthographe sur le montant en lettres.
   */
  const sousMille = (x: number, suiviDeMille = false): string => {
    const c = Math.floor(x / 100);
    const r = x % 100;
    if (c === 0) return sousCent(r);
    const tete = c === 1 ? 'cent' : `${unites[c]} cent`;
    if (r === 0) return (c === 1 || suiviDeMille) ? tete : `${tete}s`;
    return `${tete} ${sousCent(r)}`;
  };

  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parts: string[] = [];

  if (millions > 0) parts.push(millions === 1 ? 'un million' : `${sousMille(millions)} millions`);
  // `true` : le groupe des milliers est suivi du mot « mille » → pas de s a « cent ».
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${sousMille(milliers, true)} mille`);
  if (reste > 0) parts.push(sousMille(reste));

  const texte = parts.join(' ').replace(/\s+/g, ' ').trim();
  /*
   * « million » est un NOM : un montant rond en millions se dit
   * « deux millions DE francs CFA ». Sans cette regle, le recu afficherait
   * « deux millions francs CFA ».
   */
  const rondEnMillions = millions > 0 && milliers === 0 && reste === 0;
  const liaison = rondEnMillions ? ' de' : '';
  return `${amount < 0 ? 'moins ' : ''}${texte}${liaison} franc${n > 1 ? 's' : ''} CFA`;
}

/** Montant formaté à la béninoise : séparateur d'espace, suffixe FCFA. */
export function formatFcfa(amount: number): string {
  return `${round(amount).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}
