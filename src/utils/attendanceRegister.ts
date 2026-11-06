/**
 * ① REGISTRE D'APPEL OFFICIEL ET STATISTIQUES DE FRÉQUENTATION (v52).
 *
 * ── POURQUOI ────────────────────────────────────────────────────────
 * L'application enregistrait déjà les présences, mais ne produisait pas
 * le **taux de fréquentation** que réclame la circonscription, ni sa
 * ventilation par sexe. Le directeur devait le calculer à la main.
 *
 * ── RÈGLE DE COMPTAGE (source : règles de l'application, v36) ───────
 * L'unité de compte est la **demi-journée**, pas la journée :
 *   - lundi, mardi, jeudi, vendredi → 2 demi-journées (matin + après-midi)
 *   - mercredi                      → 1 seule demi-journée
 *   - samedi, dimanche              → aucune
 * `halfDaysFor()` porte déjà cette règle : on la réutilise au lieu de la
 * redéfinir, pour qu'il n'existe qu'une seule vérité dans le code.
 *
 * ── FORMULE DU TAUX DE FRÉQUENTATION ────────────────────────────────
 *      taux = demi-journées suivies ÷ demi-journées dues × 100
 *
 *   • « dues »    = nombre de demi-journées ouvrées sur la période,
 *                   multiplié par le nombre d'élèves inscrits ;
 *   • « suivies » = dues − absences (justifiées ET injustifiées).
 *
 * Les jours fériés sont exclus des deux termes : les compter ferait
 * chuter artificiellement le taux d'une école qui a simplement respecté
 * le calendrier officiel.
 *
 * Une absence justifiée reste une absence pour le taux de fréquentation
 * (l'élève n'était pas là), mais elle est comptée séparément car
 * l'inspection distingue les deux.
 */
import { AttendanceDay, AttendanceStatus } from './attendanceExport';
import { halfDaysFor } from './attendanceSchedule';
import { Student } from './database';

export interface AttendanceTotals {
  /** Demi-journées ouvrées × élèves, hors jours fériés. */
  due: number;
  /** Demi-journées effectivement suivies. */
  attended: number;
  absJustified: number;
  absUnjustified: number;
  /** Taux de fréquentation en %, arrondi au dixième. */
  rate: number;
}

const ABSENT: AttendanceStatus[] = ['absent_justifiee', 'absent_injustifiee'];

/** Vrai si toutes les entrées de cette demi-journée sont « férié ». */
function isHoliday(day: AttendanceDay, half: string): boolean {
  const entries = day.entries.filter((e) => (e.half ?? 'matin') === half);
  return entries.length > 0 && entries.every((e) => e.status === 'ferie');
}

/**
 * Totaux de fréquentation sur une période.
 * `days` doit déjà être filtré sur la classe concernée.
 */
export function computeAttendanceTotals(
  days: AttendanceDay[],
  students: Student[],
  options: { from?: string; to?: string; studentId?: string } = {},
): AttendanceTotals {
  const { from, to, studentId } = options;
  const roster = studentId ? students.filter((s) => s.id === studentId) : students;
  const headcount = roster.length;
  const ids = new Set(roster.map((s) => s.id));

  let due = 0;
  let absJustified = 0;
  let absUnjustified = 0;

  for (const day of days) {
    if (from && day.date < from) continue;
    if (to && day.date > to) continue;

    for (const half of halfDaysFor(day.date)) {
      if (isHoliday(day, half)) continue;
      due += headcount;

      for (const entry of day.entries) {
        if (!ids.has(entry.studentId)) continue;
        if ((entry.half ?? 'matin') !== half) continue;
        if (!ABSENT.includes(entry.status)) continue;
        if (entry.status === 'absent_justifiee') absJustified++;
        else absUnjustified++;
      }
    }
  }

  const attended = Math.max(0, due - absJustified - absUnjustified);
  return {
    due,
    attended,
    absJustified,
    absUnjustified,
    rate: due > 0 ? Math.round((attended / due) * 1000) / 10 : 0,
  };
}

export interface GenderBreakdown {
  boys: AttendanceTotals;
  girls: AttendanceTotals;
  all: AttendanceTotals;
}

/**
 * Ventilation par sexe : demandée par la circonscription pour le suivi
 * de la scolarisation des filles.
 */
export function attendanceByGender(
  days: AttendanceDay[],
  students: Student[],
  options: { from?: string; to?: string } = {},
): GenderBreakdown {
  const boys = students.filter((s) => (s as any).sexe === 'M');
  const girls = students.filter((s) => (s as any).sexe === 'F');
  return {
    boys: computeAttendanceTotals(days, boys, options),
    girls: computeAttendanceTotals(days, girls, options),
    all: computeAttendanceTotals(days, students, options),
  };
}

export interface StudentAttendanceRow {
  student: Student;
  totals: AttendanceTotals;
  /** Vrai si l'élève dépasse le seuil d'alerte d'absences injustifiées. */
  atRisk: boolean;
}

/**
 * SEUIL D'ALERTE : 4 demi-journées injustifiées sur la période.
 * Repère usuel de « décrochage » signalé aux parents ; il est exposé en
 * constante pour rester ajustable sans toucher au calcul.
 */
export const UNJUSTIFIED_ALERT_THRESHOLD = 4;

/** Une ligne par élève, triée du taux le plus faible au plus élevé. */
export function attendanceByStudent(
  days: AttendanceDay[],
  students: Student[],
  options: { from?: string; to?: string } = {},
): StudentAttendanceRow[] {
  return students
    .map((student) => {
      const totals = computeAttendanceTotals(days, students, { ...options, studentId: student.id });
      return {
        student,
        totals,
        atRisk: totals.absUnjustified >= UNJUSTIFIED_ALERT_THRESHOLD,
      };
    })
    .sort((a, b) => a.totals.rate - b.totals.rate);
}

/** Mois « AAAA-MM » présents dans le registre, du plus récent au plus ancien. */
export function monthsCovered(days: AttendanceDay[]): string[] {
  return [...new Set(days.map((d) => d.date.slice(0, 7)))].sort().reverse();
}

/** Bornes d'un mois « AAAA-MM » → { from, to }. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/** Libellé lisible d'un mois « AAAA-MM ». */
export function monthLabel(month: string): string {
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const [y, m] = month.split('-').map(Number);
  return `${noms[m - 1] ?? month} ${y}`;
}
