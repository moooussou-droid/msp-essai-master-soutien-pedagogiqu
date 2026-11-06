/**
 * MODULES DE VIE SCOLAIRE (v52) — logique métier pure.
 *
 * Regroupe six besoins complémentaires, tous réclamés par le quotidien
 * d'une école béninoise et absents de l'application :
 *   ③ livret scolaire pluriannuel
 *   ④ manuels et matériel
 *   ⑤ emploi du temps de la classe
 *   ⑥ suivi de la remédiation
 *   ⑦ sauvegarde vers un second appareil
 *   ⑧ conseil de classe
 *
 * Chaque section est indépendante et testable : aucune formule ne vit
 * dans un composant visuel.
 */
import { ClassData, Student } from './database';

/* ================================================================== */
/* ③ LIVRET SCOLAIRE PLURIANNUEL                                       */
/* ================================================================== */
/**
 * L'application produit des bulletins par évaluation et un bilan annuel,
 * mais RIEN ne suit un élève d'une année sur l'autre. Le livret comble
 * ce manque : il retrace la scolarité (CI → CM2) pour l'orientation et
 * les dossiers de transfert.
 */

export const BOOKLET_KEY = 'msp_livret_scolaire';

export interface BookletYear {
  id: string;
  /** Année scolaire, ex. « 2025-2026 ». */
  schoolYear: string;
  level: string;
  schoolName: string;
  /** Moyenne annuelle sur 20. */
  average: number | null;
  /** Rang facultatif : certaines écoles ne le publient pas. */
  rank?: number | null;
  headcount?: number | null;
  attendanceRate?: number | null;
  decision: PassDecision;
  teacherComment?: string;
}

export interface StudentBooklet {
  id: string;
  studentKey: string;
  nom: string;
  prenoms: string;
  matricule: string;
  dateNaissance?: string;
  years: BookletYear[];
  updatedAt: number;
}

export type PassDecision = 'admis' | 'redouble' | 'transfert' | 'abandon' | 'en_cours';

export const DECISION_LABELS: Record<PassDecision, string> = {
  admis: 'Admis(e) en classe supérieure',
  redouble: 'Redouble',
  transfert: 'Transféré(e)',
  abandon: 'Abandon',
  en_cours: 'Année en cours',
};

/** Clé stable d'un élève : permet de le retrouver d'une année à l'autre. */
export function studentKey(s: { matricule?: string; nom: string; prenoms: string }): string {
  const m = (s.matricule || '').trim().toUpperCase();
  if (m) return `MAT:${m}`;
  return `NOM:${s.nom.trim().toUpperCase()}|${s.prenoms.trim().toUpperCase()}`;
}

export function loadBooklets(): StudentBooklet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKLET_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveBooklets(list: StudentBooklet[]): void {
  try { localStorage.setItem(BOOKLET_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/** Années triées chronologiquement (la plus ancienne d'abord). */
export function sortedYears(b: StudentBooklet): BookletYear[] {
  return [...(b.years || [])].sort((a, c) => a.schoolYear.localeCompare(c.schoolYear));
}

export interface BookletStats {
  yearsCount: number;
  /** Moyenne des moyennes annuelles renseignées. */
  overallAverage: number | null;
  repeats: number;
  /** Tendance entre les deux dernières années notées. */
  trend: 'progression' | 'baisse' | 'stable' | 'indeterminee';
}

/**
 * Synthèse d'un livret.
 *
 * TENDANCE : comparaison des deux dernières moyennes annuelles connues.
 * Le seuil de 0,25 point évite de qualifier de « progression » une
 * variation qui relève du bruit de notation.
 */
export function bookletStats(b: StudentBooklet): BookletStats {
  const years = sortedYears(b);
  const noted = years.filter((y) => typeof y.average === 'number' && y.average !== null);
  const overall = noted.length > 0
    ? Math.round((noted.reduce((t, y) => t + (y.average || 0), 0) / noted.length) * 100) / 100
    : null;

  let trend: BookletStats['trend'] = 'indeterminee';
  if (noted.length >= 2) {
    const last = noted[noted.length - 1].average || 0;
    const prev = noted[noted.length - 2].average || 0;
    const diff = last - prev;
    trend = Math.abs(diff) < 0.25 ? 'stable' : (diff > 0 ? 'progression' : 'baisse');
  }

  return {
    yearsCount: years.length,
    overallAverage: overall,
    repeats: years.filter((y) => y.decision === 'redouble').length,
    trend,
  };
}

/* ================================================================== */
/* ④ MANUELS ET MATÉRIEL                                               */
/* ================================================================== */
/**
 * Qui détient quel manuel, ce qui est prêté, perdu, à racheter.
 * Le stock disponible se DÉDUIT des prêts : l'utilisateur ne saisit
 * jamais une quantité calculée (règle constante du projet).
 */

export const INVENTORY_KEY = 'msp_manuels_materiel';

export type LoanState = 'pret' | 'rendu' | 'perdu' | 'abime';

export const LOAN_STATE_LABELS: Record<LoanState, string> = {
  pret: 'En prêt', rendu: 'Rendu', perdu: 'Perdu', abime: 'Abîmé',
};

export interface Loan {
  id: string;
  studentId: string;
  studentLabel: string;
  date: string;
  state: LoanState;
  returnedAt?: string;
  note?: string;
}

export interface InventoryItem {
  id: string;
  label: string;
  category: string;
  /** Quantité totale possédée par l'école. */
  quantity: number;
  /** Valeur unitaire en FCFA, pour chiffrer les pertes. */
  unitValue: number;
  loans: Loan[];
  updatedAt: number;
}

export function loadInventory(): InventoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveInventory(list: InventoryItem[]): void {
  try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

export interface ItemStatus {
  outOnLoan: number;
  lost: number;
  damaged: number;
  /** Disponible = total − en prêt − perdus − abîmés. */
  available: number;
  /** Valeur des exemplaires perdus ou abîmés, en FCFA. */
  lossValue: number;
  /** Vrai si le disponible est négatif : incohérence à signaler. */
  inconsistent: boolean;
}

/**
 * État d'un article. Un disponible NÉGATIF signifie que l'on a prêté
 * plus d'exemplaires qu'on n'en possède : l'anomalie est signalée, jamais
 * masquée, pour que l'inventaire puisse être corrigé.
 */
export function itemStatus(item: InventoryItem): ItemStatus {
  const loans = item.loans || [];
  const outOnLoan = loans.filter((l) => l.state === 'pret').length;
  const lost = loans.filter((l) => l.state === 'perdu').length;
  const damaged = loans.filter((l) => l.state === 'abime').length;
  const available = (Number(item.quantity) || 0) - outOnLoan - lost - damaged;
  return {
    outOnLoan, lost, damaged, available,
    lossValue: (lost + damaged) * (Number(item.unitValue) || 0),
    inconsistent: available < 0,
  };
}

export interface InventorySummary {
  items: number;
  totalQuantity: number;
  totalOnLoan: number;
  totalLost: number;
  totalLossValue: number;
  inconsistencies: number;
}

export function inventorySummary(items: InventoryItem[]): InventorySummary {
  return items.reduce<InventorySummary>((acc, it) => {
    const s = itemStatus(it);
    acc.items += 1;
    acc.totalQuantity += Number(it.quantity) || 0;
    acc.totalOnLoan += s.outOnLoan;
    acc.totalLost += s.lost + s.damaged;
    acc.totalLossValue += s.lossValue;
    if (s.inconsistent) acc.inconsistencies += 1;
    return acc;
  }, { items: 0, totalQuantity: 0, totalOnLoan: 0, totalLost: 0, totalLossValue: 0, inconsistencies: 0 });
}

/* ================================================================== */
/* ⑤ EMPLOI DU TEMPS DE LA CLASSE                                      */
/* ================================================================== */
/**
 * Grille hebdomadaire imprimable, affichable en classe.
 * Les jours suivent la règle de l'application : pas de samedi ni de
 * dimanche, et le mercredi ne comporte qu'une matinée.
 */

export const TIMETABLE_KEY = 'msp_emploi_du_temps';

export const SCHOOL_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;
export type SchoolDay = typeof SCHOOL_DAYS[number];

export interface TimetableSlot {
  id: string;
  day: SchoolDay;
  /** Heures « HH:MM ». */
  start: string;
  end: string;
  subject: string;
  room?: string;
  teacher?: string;
}

export interface Timetable {
  id: string;
  classId: string;
  className: string;
  slots: TimetableSlot[];
  updatedAt: number;
}

export function loadTimetables(): Timetable[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TIMETABLE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveTimetable(tt: Timetable): Timetable[] {
  const all = loadTimetables();
  const clean = { ...tt, updatedAt: Date.now() };
  const i = all.findIndex((t) => t.classId === clean.classId);
  if (i >= 0) all[i] = clean; else all.push(clean);
  try { localStorage.setItem(TIMETABLE_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}

/** Minutes écoulées depuis minuit ; -1 si l'heure est invalide. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return -1;
  const h = Number(m[1]); const mn = Number(m[2]);
  if (h > 23 || mn > 59) return -1;
  return h * 60 + mn;
}

/** Durée d'un créneau en minutes (0 si incohérent). */
export function slotDuration(slot: TimetableSlot): number {
  const a = toMinutes(slot.start); const b = toMinutes(slot.end);
  return (a < 0 || b < 0 || b <= a) ? 0 : b - a;
}

/**
 * Détection des CHEVAUCHEMENTS.
 * Deux créneaux du même jour se chevauchent si l'un commence avant que
 * l'autre ne finisse. Sans ce contrôle, un emploi du temps pourrait
 * placer deux matières à la même heure sans que personne ne le voie.
 */
export function findOverlaps(slots: TimetableSlot[]): [TimetableSlot, TimetableSlot][] {
  const out: [TimetableSlot, TimetableSlot][] = [];
  for (const day of SCHOOL_DAYS) {
    const daySlots = slots
      .filter((s) => s.day === day && slotDuration(s) > 0)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (let i = 1; i < daySlots.length; i++) {
      if (toMinutes(daySlots[i].start) < toMinutes(daySlots[i - 1].end)) {
        out.push([daySlots[i - 1], daySlots[i]]);
      }
    }
  }
  return out;
}

/** Volume horaire hebdomadaire par matière, en minutes. */
export function weeklyLoad(slots: TimetableSlot[]): { subject: string; minutes: number }[] {
  const map = new Map<string, number>();
  for (const s of slots) {
    const name = (s.subject || '').trim();
    if (!name) continue;
    map.set(name, (map.get(name) || 0) + slotDuration(s));
  }
  return [...map.entries()]
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** « 4 h 30 » à partir de minutes. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/* ================================================================== */
/* ⑥ SUIVI DE LA REMÉDIATION                                           */
/* ================================================================== */
/**
 * L'application repère déjà les élèves sous 10/20, mais n'enregistre pas
 * ce qui a été ENTREPRIS. L'inspection demande précisément la trace des
 * actions : quelle difficulté, quelle action, quel résultat.
 */

export const REMEDIATION_KEY = 'msp_remediation';

export type RemediationStatus = 'ouverte' | 'en_cours' | 'resolue' | 'sans_effet';

export const REMEDIATION_LABELS: Record<RemediationStatus, string> = {
  ouverte: 'À engager', en_cours: 'En cours',
  resolue: 'Difficulté résolue', sans_effet: 'Sans effet',
};

export interface RemediationAction {
  id: string;
  date: string;
  description: string;
  result?: string;
}

export interface RemediationCase {
  id: string;
  studentId: string;
  studentLabel: string;
  classId: string;
  className: string;
  subject: string;
  difficulty: string;
  /** Note de départ sur 20, qui a motivé l'ouverture. */
  startingScore: number | null;
  /** Note constatée après remédiation. */
  currentScore: number | null;
  status: RemediationStatus;
  openedAt: string;
  actions: RemediationAction[];
  updatedAt: number;
}

export function loadRemediation(): RemediationCase[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REMEDIATION_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveRemediation(list: RemediationCase[]): void {
  try { localStorage.setItem(REMEDIATION_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

/** Progression en points entre la note de départ et la note actuelle. */
export function remediationGain(c: RemediationCase): number | null {
  if (typeof c.startingScore !== 'number' || typeof c.currentScore !== 'number') return null;
  return Math.round((c.currentScore - c.startingScore) * 100) / 100;
}

export interface RemediationSummary {
  total: number;
  open: number;
  resolved: number;
  /** Taux de résolution en %. */
  successRate: number;
  /** Gain moyen en points, sur les cas mesurables. */
  averageGain: number | null;
  actions: number;
}

export function remediationSummary(list: RemediationCase[]): RemediationSummary {
  const resolved = list.filter((c) => c.status === 'resolue').length;
  const gains = list.map(remediationGain).filter((g): g is number => g !== null);
  return {
    total: list.length,
    open: list.filter((c) => c.status === 'ouverte' || c.status === 'en_cours').length,
    resolved,
    successRate: list.length > 0 ? Math.round((resolved / list.length) * 1000) / 10 : 0,
    averageGain: gains.length > 0
      ? Math.round((gains.reduce((t, g) => t + g, 0) / gains.length) * 100) / 100
      : null,
    actions: list.reduce((t, c) => t + (c.actions || []).length, 0),
  };
}

/**
 * Élèves à accompagner : moyenne < 10/20 et aucun dossier ouvert.
 * Évite au maître de recopier la liste déjà calculée par l'application.
 */
export function suggestCases(
  bulletins: { student: Student; moyenne: number | null }[],
  existing: RemediationCase[],
  threshold = 10,
): { student: Student; moyenne: number | null }[] {
  const suivis = new Set(
    existing.filter((c) => c.status !== 'resolue').map((c) => c.studentId),
  );
  return bulletins.filter((b) =>
    typeof b.moyenne === 'number' && b.moyenne < threshold && !suivis.has(b.student.id));
}

/* ================================================================== */
/* ⑦ SAUVEGARDE VERS UN SECOND APPAREIL                                */
/* ================================================================== */
/**
 * Risque majeur d'une application 100 % locale : la perte du téléphone
 * efface toute l'année. Ce module produit un fichier de sauvegarde
 * complet, et enregistre la date du dernier export pour alerter quand
 * la sauvegarde devient trop ancienne.
 */

export const BACKUP_LOG_KEY = 'msp_backup_log';

/** Seuil d'alerte : au-delà, la sauvegarde est jugée trop ancienne. */
export const BACKUP_STALE_DAYS = 7;

export interface BackupLogEntry {
  at: number;
  /** Taille du fichier produit, en octets. */
  size: number;
  /** Nombre de classes incluses. */
  classes: number;
}

export function loadBackupLog(): BackupLogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BACKUP_LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function recordBackup(entry: BackupLogEntry): BackupLogEntry[] {
  // On ne conserve que les 20 dernieres : l'historique n'a pas à grossir.
  const all = [entry, ...loadBackupLog()].slice(0, 20);
  try { localStorage.setItem(BACKUP_LOG_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}

/** Jours écoulés depuis la dernière sauvegarde ; null si aucune. */
export function daysSinceLastBackup(log: BackupLogEntry[], now = Date.now()): number | null {
  if (!log.length) return null;
  return Math.floor((now - log[0].at) / 86_400_000);
}

/** Vrai si aucune sauvegarde, ou si la dernière est trop ancienne. */
export function backupIsStale(log: BackupLogEntry[], now = Date.now()): boolean {
  const d = daysSinceLastBackup(log, now);
  return d === null || d >= BACKUP_STALE_DAYS;
}

/* ================================================================== */
/* ⑧ CONSEIL DE CLASSE                                                 */
/* ================================================================== */
/**
 * Grille de délibération : pour chaque élève, la moyenne, la décision de
 * passage et l'appréciation du conseil. Le procès-verbal est le document
 * qui clôt l'année.
 */

export const COUNCIL_KEY = 'msp_conseil_classe';

export interface CouncilEntry {
  studentId: string;
  studentLabel: string;
  average: number | null;
  decision: PassDecision;
  mention?: string;
  comment?: string;
}

export interface CouncilSession {
  id: string;
  classId: string;
  className: string;
  date: string;
  /** Président de séance (directeur, censeur…). */
  chair: string;
  participants: string;
  entries: CouncilEntry[];
  updatedAt: number;
}

export function loadCouncils(): CouncilSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COUNCIL_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveCouncil(session: CouncilSession): CouncilSession[] {
  const all = loadCouncils();
  const clean = { ...session, updatedAt: Date.now() };
  const i = all.findIndex((s) => s.id === clean.id);
  if (i >= 0) all[i] = clean; else all.unshift(clean);
  try { localStorage.setItem(COUNCIL_KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}

/**
 * MENTION selon la moyenne sur 20 — barème scolaire béninois usuel.
 * Utilisée comme proposition : le conseil reste souverain et peut la
 * modifier.
 */
export function mentionFor(average: number | null): string {
  if (average === null || Number.isNaN(average)) return '—';
  if (average >= 18) return 'Excellent';
  if (average >= 16) return 'Très bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez bien';
  if (average >= 10) return 'Passable';
  if (average >= 8) return 'Insuffisant';
  return 'Très insuffisant';
}

/**
 * DÉCISION PROPOSÉE : admis à partir de 10/20.
 * C'est une PROPOSITION, jamais une décision automatique — le conseil
 * de classe est seul compétent, et peut tenir compte d'éléments que
 * l'application ignore (maladie, situation familiale).
 */
export function suggestDecision(average: number | null): PassDecision {
  if (average === null || Number.isNaN(average)) return 'en_cours';
  return average >= 10 ? 'admis' : 'redouble';
}

export interface CouncilSummary {
  total: number;
  admitted: number;
  repeating: number;
  /** Taux de passage en %. */
  passRate: number;
  classAverage: number | null;
}

export function councilSummary(session: CouncilSession): CouncilSummary {
  const entries = session.entries || [];
  const admitted = entries.filter((e) => e.decision === 'admis').length;
  const noted = entries.filter((e) => typeof e.average === 'number');
  return {
    total: entries.length,
    admitted,
    repeating: entries.filter((e) => e.decision === 'redouble').length,
    passRate: entries.length > 0 ? Math.round((admitted / entries.length) * 1000) / 10 : 0,
    classAverage: noted.length > 0
      ? Math.round((noted.reduce((t, e) => t + (e.average || 0), 0) / noted.length) * 100) / 100
      : null,
  };
}

/** Pré-remplit une délibération à partir des bulletins calculés. */
export function buildCouncilEntries(
  _classData: ClassData,
  bulletins: { student: Student; moyenne: number | null }[],
): CouncilEntry[] {
  return bulletins.map((b) => ({
    studentId: b.student.id,
    studentLabel: `${b.student.nom} ${b.student.prenoms}`.trim(),
    average: b.moyenne,
    decision: suggestDecision(b.moyenne),
    mention: mentionFor(b.moyenne),
    comment: '',
  }));
}
