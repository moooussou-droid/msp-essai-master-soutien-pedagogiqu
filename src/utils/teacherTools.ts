/**
 * OUTILS QUOTIDIENS DE L'ENSEIGNANT (v38).
 *
 * Regroupe les données des fonctionnalités indispensables ajoutées en v38 :
 *  - Emploi du temps hebdomadaire
 *  - Cahier de textes / journal de classe
 *  - Mémos et tâches
 *  - Plan de classe (placement des élèves)
 *  - Banque de sujets d'évaluation
 *  - Communication aux parents (modèles de messages)
 *
 * Tout est local (localStorage), conforme au fonctionnement hors-ligne.
 */

/* ------------------------------------------------------------------ */
/* 1. Emploi du temps                                                  */
/* ------------------------------------------------------------------ */

export interface TimetableSlot {
  id: string;
  /** 1 = lundi … 5 = vendredi (pas de cours le week-end). */
  day: number;
  start: string;
  end: string;
  subject: string;
  classe: string;
  room: string;
}

export const TIMETABLE_KEY = 'msp_timetable';
export const SCHOOL_DAYS = [1, 2, 3, 4, 5];
export const DAY_NAMES: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi',
};

export function loadTimetable(): TimetableSlot[] {
  try {
    const raw = localStorage.getItem(TIMETABLE_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveTimetable(slots: TimetableSlot[]): void {
  try { localStorage.setItem(TIMETABLE_KEY, JSON.stringify(slots)); } catch { /* quota */ }
}

export function addSlot(slot: Omit<TimetableSlot, 'id'>): TimetableSlot {
  const s: TimetableSlot = { ...slot, id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  saveTimetable([...loadTimetable(), s]);
  return s;
}

export function removeSlot(id: string): void {
  saveTimetable(loadTimetable().filter((s) => s.id !== id));
}

/** Créneaux d'un jour, triés par heure de début. */
export function slotsForDay(day: number, slots = loadTimetable()): TimetableSlot[] {
  return slots.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
}

/** Deux créneaux du même jour se chevauchent-ils ? */
export function hasConflict(slot: Omit<TimetableSlot, 'id'>, slots = loadTimetable()): boolean {
  return slots.some(
    (s) => s.day === slot.day && slot.start < s.end && s.start < slot.end,
  );
}

/** Cours en train de se dérouler, sinon null. */
export function currentSlot(now = new Date(), slots = loadTimetable()): TimetableSlot | null {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return slotsForDay(now.getDay(), slots).find((s) => s.start <= hhmm && hhmm < s.end) || null;
}

/** Prochain cours de la journée, sinon null. */
export function nextSlot(now = new Date(), slots = loadTimetable()): TimetableSlot | null {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return slotsForDay(now.getDay(), slots).find((s) => s.start > hhmm) || null;
}

/* ------------------------------------------------------------------ */
/* 2. Cahier de textes / journal de classe                             */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  id: string;
  /** Date au format AAAA-MM-JJ. */
  date: string;
  classe: string;
  subject: string;
  /** Contenu effectivement traité en classe. */
  content: string;
  /** Devoirs donnés à la maison. */
  homework: string;
  /** Observations (incidents, absences notables, matériel manquant). */
  notes: string;
  createdAt: number;
}

export const LOGBOOK_KEY = 'msp_logbook';

export function loadLogbook(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOGBOOK_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveLogbook(entries: LogEntry[]): void {
  try { localStorage.setItem(LOGBOOK_KEY, JSON.stringify(entries)); } catch { /* quota */ }
}

export function addLogEntry(entry: Omit<LogEntry, 'id' | 'createdAt'>): LogEntry {
  const e: LogEntry = { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
  saveLogbook([e, ...loadLogbook()]);
  return e;
}

export function removeLogEntry(id: string): void {
  saveLogbook(loadLogbook().filter((e) => e.id !== id));
}

/** Entrées d'une période, de la plus récente à la plus ancienne. */
export function logEntriesBetween(from: string, to: string, entries = loadLogbook()): LogEntry[] {
  return entries
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Devoirs encore à rendre à partir d'une date donnée. */
export function pendingHomework(fromDate: string, entries = loadLogbook()): LogEntry[] {
  return entries.filter((e) => e.date >= fromDate && (e.homework || '').trim().length > 0);
}

/* ------------------------------------------------------------------ */
/* 3. Mémos et tâches                                                  */
/* ------------------------------------------------------------------ */

export interface TaskItem {
  id: string;
  label: string;
  /** Échéance AAAA-MM-JJ (facultative). */
  due: string;
  priority: 'haute' | 'normale' | 'basse';
  done: boolean;
  createdAt: number;
}

export const TASKS_KEY = 'msp_tasks';

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: TaskItem[]): void {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch { /* quota */ }
}

export function addTask(label: string, due = '', priority: TaskItem['priority'] = 'normale'): TaskItem {
  const t: TaskItem = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label, due, priority, done: false, createdAt: Date.now(),
  };
  saveTasks([t, ...loadTasks()]);
  return t;
}

export function toggleTask(id: string): void {
  saveTasks(loadTasks().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}

export function removeTask(id: string): void {
  saveTasks(loadTasks().filter((t) => t.id !== id));
}

const PRIORITY_RANK: Record<TaskItem['priority'], number> = { haute: 0, normale: 1, basse: 2 };

/** Tâches triées : non faites d'abord, puis priorité, puis échéance. */
export function sortedTasks(tasks = loadTasks()): TaskItem[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.createdAt - a.createdAt;
  });
}

/** Tâches en retard à la date donnée. */
export function overdueTasks(today: string, tasks = loadTasks()): TaskItem[] {
  return tasks.filter((t) => !t.done && t.due && t.due < today);
}

/* ------------------------------------------------------------------ */
/* 4. Plan de classe                                                   */
/* ------------------------------------------------------------------ */

export interface SeatingPlan {
  classId: string;
  rows: number;
  cols: number;
  /** Clé « ligne-colonne » → nom de l'élève. */
  seats: Record<string, string>;
  updatedAt: number;
}

export const SEATING_KEY = 'msp_seating_plans';

export function loadSeatingPlans(): Record<string, SeatingPlan> {
  try {
    const raw = localStorage.getItem(SEATING_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function getSeatingPlan(classId: string, rows = 5, cols = 6): SeatingPlan {
  const all = loadSeatingPlans();
  return all[classId] || { classId, rows, cols, seats: {}, updatedAt: 0 };
}

export function saveSeatingPlan(plan: SeatingPlan): void {
  const all = loadSeatingPlans();
  all[plan.classId] = { ...plan, updatedAt: Date.now() };
  try { localStorage.setItem(SEATING_KEY, JSON.stringify(all)); } catch { /* quota */ }
}

export function seatKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Répartit automatiquement les élèves sur les places disponibles. */
export function autoFillSeats(plan: SeatingPlan, students: string[]): SeatingPlan {
  const seats: Record<string, string> = {};
  let i = 0;
  for (let r = 0; r < plan.rows; r++) {
    for (let c = 0; c < plan.cols; c++) {
      if (i < students.length) seats[seatKey(r, c)] = students[i++];
    }
  }
  return { ...plan, seats };
}

/** Alterne les élèves pour éviter que les mêmes soient toujours au fond. */
export function rotateSeats(plan: SeatingPlan): SeatingPlan {
  const keys = Object.keys(plan.seats).sort();
  const names = keys.map((k) => plan.seats[k]);
  if (names.length < 2) return plan;
  const rotated = [...names.slice(Math.ceil(names.length / 2)), ...names.slice(0, Math.ceil(names.length / 2))];
  const seats: Record<string, string> = {};
  keys.forEach((k, i) => { seats[k] = rotated[i]; });
  return { ...plan, seats };
}

/* ------------------------------------------------------------------ */
/* 5. Banque de sujets d'évaluation                                    */
/* ------------------------------------------------------------------ */

export interface ExamItem {
  id: string;
  title: string;
  level: string;
  subject: string;
  /** Type : interrogation, devoir, composition, examen blanc. */
  kind: string;
  /** Énoncé complet. */
  statement: string;
  /** Corrigé et barème. */
  answer: string;
  points: number;
  createdAt: number;
}

export const EXAMBANK_KEY = 'msp_exam_bank';

export function loadExamBank(): ExamItem[] {
  try {
    const raw = localStorage.getItem(EXAMBANK_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveExamBank(items: ExamItem[]): void {
  try { localStorage.setItem(EXAMBANK_KEY, JSON.stringify(items)); } catch { /* quota */ }
}

export function addExamItem(item: Omit<ExamItem, 'id' | 'createdAt'>): ExamItem {
  const e: ExamItem = { ...item, id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
  saveExamBank([e, ...loadExamBank()]);
  return e;
}

export function removeExamItem(id: string): void {
  saveExamBank(loadExamBank().filter((e) => e.id !== id));
}

export function filterExamBank(query: string, level: string, subject: string, items = loadExamBank()): ExamItem[] {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return items.filter((e) => {
    if (level && level !== 'Tous' && e.level !== level) return false;
    if (subject && subject !== 'Toutes' && e.subject !== subject) return false;
    if (!q) return true;
    const hay = `${e.title} ${e.statement} ${e.subject} ${e.level} ${e.kind}`
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return hay.includes(q);
  });
}

/* ------------------------------------------------------------------ */
/* 6. Communication aux parents                                        */
/* ------------------------------------------------------------------ */

export interface MessageTemplate {
  id: string;
  label: string;
  body: string;
}

/** Modèles prêts à l'emploi ; {eleve}, {classe}, {date} sont remplacés. */
export const PARENT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'absence',
    label: 'Signaler une absence',
    body: 'Bonjour, votre enfant {eleve} ({classe}) a été absent(e) le {date}. '
      + 'Merci de bien vouloir justifier cette absence auprès de l’école. Cordialement, {enseignant}.',
  },
  {
    id: 'felicitations',
    label: 'Féliciter un élève',
    body: 'Bonjour, je tenais à vous informer que {eleve} ({classe}) fournit d’excellents efforts '
      + 'et obtient de très bons résultats. Félicitations et encouragements. {enseignant}.',
  },
  {
    id: 'difficulte',
    label: 'Signaler une difficulté',
    body: 'Bonjour, {eleve} ({classe}) rencontre actuellement des difficultés en classe. '
      + 'Je souhaiterais en discuter avec vous afin de l’aider au mieux. Merci de me contacter. {enseignant}.',
  },
  {
    id: 'convocation',
    label: 'Convoquer un parent',
    body: 'Bonjour, je vous invite à passer à l’école le {date} afin d’échanger au sujet de {eleve} ({classe}). '
      + 'Merci de me confirmer votre disponibilité. {enseignant}.',
  },
  {
    id: 'materiel',
    label: 'Demander du matériel',
    body: 'Bonjour, {eleve} ({classe}) ne dispose pas du matériel nécessaire pour suivre correctement les cours. '
      + 'Merci de bien vouloir y remédier dans les meilleurs délais. {enseignant}.',
  },
  {
    id: 'reunion',
    label: 'Annoncer une réunion',
    body: 'Bonjour, une réunion de parents d’élèves de la classe de {classe} se tiendra le {date}. '
      + 'Votre présence est vivement souhaitée. {enseignant}.',
  },
];

/** Remplit un modèle avec les informations de l'élève. */
export function fillTemplate(
  template: MessageTemplate,
  data: { eleve?: string; classe?: string; date?: string; enseignant?: string },
): string {
  return template.body
    .replace(/\{eleve\}/g, data.eleve || 'votre enfant')
    .replace(/\{classe\}/g, data.classe || 'sa classe')
    .replace(/\{date\}/g, data.date || 'prochainement')
    .replace(/\{enseignant\}/g, data.enseignant || 'L’enseignant');
}

/** Lien SMS pré-rempli (ouvre l'application de messagerie du téléphone). */
export function smsLink(phone: string, message: string): string {
  return `sms:${(phone || '').replace(/\s/g, '')}?body=${encodeURIComponent(message)}`;
}

/** Lien WhatsApp pré-rempli. */
export function parentWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${(phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
}
