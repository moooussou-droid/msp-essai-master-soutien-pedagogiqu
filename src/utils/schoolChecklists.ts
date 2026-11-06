/**
 * Checklists d'administration (EducMaster & Inspection).
 * Stockage local + helper de progression, testable.
 */

export interface AdminTask {
  id: string;
  label: string;
  category: string;
  done: boolean;
  custom?: boolean;
}

export const TASK_KEY = 'msp_admin_tasks';

export const DEFAULT_TASKS: AdminTask[] = [
  { id: 'edm-1', category: 'EducMaster', label: 'Vérifier la liste des élèves et les matricules', done: false },
  { id: 'edm-2', category: 'EducMaster', label: 'Saisir toutes les notes CM et CP', done: false },
  { id: 'edm-3', category: 'EducMaster', label: 'Contrôler les absences et les notes manquantes', done: false },
  { id: 'edm-4', category: 'EducMaster', label: 'Exporter le fichier XLSX au format EducMaster', done: false },
  { id: 'edm-5', category: 'EducMaster', label: 'Faire une sauvegarde JSON/Cloud après l’export', done: false },
  { id: 'insp-1', category: 'Inspection', label: 'Cahier journal à jour', done: false },
  { id: 'insp-2', category: 'Inspection', label: 'Progression / programmation disponible', done: false },
  { id: 'insp-3', category: 'Inspection', label: 'Registre d’appel et PV mensuel prêts', done: false },
  { id: 'insp-4', category: 'Inspection', label: 'Fiches pédagogiques et évaluations archivées', done: false },
  { id: 'insp-5', category: 'Inspection', label: 'Plan de remédiation des élèves en difficulté', done: false },
  { id: 'adm-1', category: 'Administration', label: 'PV APE / conseil des maîtres classés', done: false },
  { id: 'adm-2', category: 'Administration', label: 'Inventaire du matériel et besoins actualisés', done: false },
  { id: 'adm-3', category: 'Administration', label: 'Calendrier des examens et conseils affiché', done: false },
];

export function loadTasks(): AdminTask[] {
  try {
    const raw = localStorage.getItem(TASK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminTask[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_TASKS;
}

export function saveTasks(tasks: AdminTask[]): void {
  try { localStorage.setItem(TASK_KEY, JSON.stringify(tasks)); } catch { /* quota */ }
}

export function taskProgress(tasks: AdminTask[]): { done: number; total: number; percent: number } {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Progression par catégorie (EducMaster, Inspection, Administration, Personnalisé…). */
export function taskProgressByCategory(tasks: AdminTask[]): { category: string; done: number; total: number; percent: number }[] {
  const byCategory = new Map<string, AdminTask[]>();
  for (const task of tasks) {
    const cat = (task.category || 'Autre').trim() || 'Autre';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(task);
  }
  return [...byCategory.entries()]
    .map(([category, list]) => {
      const done = list.filter(t => t.done).length;
      return { category, done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}
