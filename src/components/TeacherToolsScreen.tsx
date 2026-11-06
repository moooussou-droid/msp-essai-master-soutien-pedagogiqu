/**
 * OUTILS DU QUOTIDIEN DE L'ENSEIGNANT (v38).
 * Emploi du temps · Cahier de textes · Mémos · Banque de sujets · Parents.
 */

import { useMemo, useState } from 'react';
import {
  BookMarked, CalendarDays, ChevronLeft, ClipboardList, MessageSquare,
  Plus, Send, Trash2, Users,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  DAY_NAMES, ExamItem, LogEntry, SCHOOL_DAYS, TaskItem, TimetableSlot,
  PARENT_TEMPLATES, addExamItem, addLogEntry, addSlot, addTask, fillTemplate,
  filterExamBank, hasConflict, loadExamBank, loadLogbook, loadTasks, loadTimetable,
  overdueTasks, parentWhatsappLink, removeExamItem, removeLogEntry, removeSlot,
  removeTask, slotsForDay, smsLink, sortedTasks, toggleTask,
} from '../utils/teacherTools';
import { getProfile } from '../utils/userProfile';

type Tab = 'edt' | 'cahier' | 'taches' | 'sujets' | 'parents';

const TABS: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'edt', label: 'Emploi du temps', icon: CalendarDays },
  { id: 'cahier', label: 'Cahier de textes', icon: BookMarked },
  { id: 'taches', label: 'Mémos', icon: ClipboardList },
  { id: 'sujets', label: 'Sujets', icon: Users },
  { id: 'parents', label: 'Parents', icon: MessageSquare },
];

const todayISO = () => new Date().toISOString().split('T')[0];

export default function TeacherToolsScreen() {
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('edt');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      <header className="bg-gradient-to-r from-blue-600 to-sky-600 text-white px-4 pt-5 pb-6 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <button onClick={goBack} className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3" aria-label="Retour">
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <h1 className="text-xl font-bold">Outils du quotidien</h1>
          <p className="text-white/85 text-sm">Tout ce qu’il faut pour organiser vos journées de classe</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 -mt-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Ic = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Ic className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 mt-4 space-y-4">
        {tab === 'edt' && <TimetableTab />}
        {tab === 'cahier' && <LogbookTab />}
        {tab === 'taches' && <TasksTab />}
        {tab === 'sujets' && <ExamBankTab />}
        {tab === 'parents' && <ParentsTab />}
      </main>
    </div>
  );
}

/* ---------------- Emploi du temps ---------------- */

function TimetableTab() {
  const [slots, setSlots] = useState<TimetableSlot[]>(() => loadTimetable());
  const [day, setDay] = useState(1);
  const [form, setForm] = useState({ start: '08:00', end: '09:00', subject: '', classe: '', room: '' });
  const [error, setError] = useState('');

  function add() {
    if (!form.subject.trim()) { setError('Indiquez la matière.'); return; }
    if (form.start >= form.end) { setError('L’heure de fin doit suivre l’heure de début.'); return; }
    const candidate = { day, ...form };
    if (hasConflict(candidate, slots)) { setError('Ce créneau chevauche un cours déjà enregistré.'); return; }
    addSlot(candidate);
    setSlots(loadTimetable());
    setForm({ ...form, subject: '', classe: '', room: '' });
    setError('');
  }

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Ajouter un cours</h2>
        <div className="flex gap-1 mb-3">
          {SCHOOL_DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${day === d ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
            >
              {DAY_NAMES[d].slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
        </div>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Matière" className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} placeholder="Classe" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Salle" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <button onClick={add} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Ajouter au {DAY_NAMES[day].toLowerCase()}
        </button>
      </section>

      {SCHOOL_DAYS.map((d) => {
        const list = slotsForDay(d, slots);
        return (
          <section key={d} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{DAY_NAMES[d]}</h3>
            {list.length === 0 && <p className="text-sm text-gray-400">Aucun cours.</p>}
            <div className="space-y-2">
              {list.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                  <span className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300 shrink-0">{s.start}<br />{s.end}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{s.subject}</p>
                    <p className="text-xs text-gray-500">{[s.classe, s.room].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <button onClick={() => { removeSlot(s.id); setSlots(loadTimetable()); }} className="p-2 text-red-500" aria-label="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

/* ---------------- Cahier de textes ---------------- */

function LogbookTab() {
  const [entries, setEntries] = useState<LogEntry[]>(() => loadLogbook());
  const [form, setForm] = useState({ date: todayISO(), classe: '', subject: '', content: '', homework: '', notes: '' });

  function add() {
    if (!form.content.trim()) return;
    addLogEntry(form);
    setEntries(loadLogbook());
    setForm({ ...form, content: '', homework: '', notes: '' });
  }

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Journal de classe</h2>
        <p className="text-xs text-gray-500 mb-3">Consignez ce qui a été réellement traité et les devoirs donnés. Document exigible par l’inspection.</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} placeholder="Classe" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
        </div>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Matière" className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Contenu traité en classe" rows={3} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <textarea value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} placeholder="Devoirs donnés à la maison" rows={2} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observations (incidents, matériel...)" rows={2} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <button onClick={add} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Enregistrer la séance
        </button>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Historique ({entries.length})</h3>
        {entries.length === 0 && <p className="text-sm text-gray-400">Aucune séance enregistrée.</p>}
        <div className="space-y-2">
          {entries.slice(0, 40).map((e) => (
            <div key={e.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {e.date} — {e.subject || 'Séance'} {e.classe && <span className="text-gray-500">({e.classe})</span>}
                </p>
                <button onClick={() => { removeLogEntry(e.id); setEntries(loadLogbook()); }} className="p-1 text-red-500 shrink-0" aria-label="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{e.content}</p>
              {e.homework && <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">📌 Devoirs : {e.homework}</p>}
              {e.notes && <p className="text-xs text-gray-500 mt-1">Obs. : {e.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------------- Mémos ---------------- */

function TasksTab() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [label, setLabel] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<TaskItem['priority']>('normale');

  const late = useMemo(() => overdueTasks(todayISO(), tasks), [tasks]);

  function add() {
    if (!label.trim()) return;
    addTask(label.trim(), due, priority);
    setTasks(loadTasks());
    setLabel(''); setDue('');
  }

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Nouveau mémo</h2>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Corriger les copies de CM2" className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskItem['priority'])} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg">
            <option value="haute">Priorité haute</option>
            <option value="normale">Priorité normale</option>
            <option value="basse">Priorité basse</option>
          </select>
        </div>
        <button onClick={add} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </section>

      {late.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-red-700 dark:text-red-300 text-sm font-semibold">⚠️ {late.length} tâche(s) en retard.</p>
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Mes tâches ({tasks.filter((t) => !t.done).length} à faire)</h3>
        {tasks.length === 0 && <p className="text-sm text-gray-400">Aucune tâche.</p>}
        <div className="space-y-2">
          {sortedTasks(tasks).map((t) => (
            <div key={t.id} className="flex items-center gap-3 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
              <button
                onClick={() => { toggleTask(t.id); setTasks(loadTasks()); }}
                className={`w-6 h-6 rounded-md border-2 shrink-0 ${t.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}
                aria-label="Marquer comme faite"
              >
                {t.done ? '✓' : ''}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${t.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100 font-medium'}`}>{t.label}</p>
                <p className="text-xs text-gray-500">
                  {t.priority === 'haute' ? '🔴 Haute' : t.priority === 'basse' ? '🔵 Basse' : '🟡 Normale'}
                  {t.due && ` · échéance ${t.due}`}
                </p>
              </div>
              <button onClick={() => { removeTask(t.id); setTasks(loadTasks()); }} className="p-2 text-red-500" aria-label="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------------- Banque de sujets ---------------- */

function ExamBankTab() {
  const [items, setItems] = useState<ExamItem[]>(() => loadExamBank());
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', level: '', subject: '', kind: 'Interrogation', statement: '', answer: '', points: 20 });

  const filtered = useMemo(() => filterExamBank(query, '', '', items), [query, items]);

  function add() {
    if (!form.title.trim() || !form.statement.trim()) return;
    addExamItem(form);
    setItems(loadExamBank());
    setForm({ ...form, title: '', statement: '', answer: '' });
  }

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Banque de sujets</h2>
        <p className="text-xs text-gray-500 mb-3">Conservez vos sujets et corrigés pour les réutiliser d’une année sur l’autre.</p>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre du sujet" className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Niveau" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Matière" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg text-sm">
            <option>Interrogation</option><option>Devoir</option><option>Composition</option><option>Examen blanc</option>
          </select>
        </div>
        <textarea value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} placeholder="Énoncé du sujet" rows={4} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Corrigé et barème" rows={3} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2" />
        <button onClick={add} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Enregistrer le sujet
        </button>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un sujet..." className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-3" />
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{filtered.length} sujet(s)</h3>
        <div className="space-y-2">
          {filtered.map((e) => (
            <details key={e.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-3">
              <summary className="font-semibold text-gray-800 dark:text-gray-100 text-sm cursor-pointer">
                {e.title} <span className="text-xs text-gray-500">— {[e.level, e.subject, e.kind].filter(Boolean).join(' · ')}</span>
              </summary>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{e.statement}</p>
              {e.answer && <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2 whitespace-pre-wrap">Corrigé : {e.answer}</p>}
              <button onClick={() => { removeExamItem(e.id); setItems(loadExamBank()); }} className="mt-2 text-red-500 text-xs flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------------- Parents ---------------- */

function ParentsTab() {
  const [tplId, setTplId] = useState(PARENT_TEMPLATES[0].id);
  const [eleve, setEleve] = useState('');
  const [classe, setClasse] = useState('');
  const [date, setDate] = useState(todayISO());
  const [phone, setPhone] = useState('');

  const tpl = PARENT_TEMPLATES.find((t) => t.id === tplId) || PARENT_TEMPLATES[0];
  const enseignant = (() => { try { return getProfile().teacherName || 'L’enseignant'; } catch { return 'L’enseignant'; } })();
  const message = fillTemplate(tpl, { eleve, classe, date, enseignant });

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Message aux parents</h2>
        <p className="text-xs text-gray-500 mb-3">Choisissez un modèle, complétez, puis envoyez par SMS ou WhatsApp.</p>
        <select value={tplId} onChange={(e) => setTplId(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg mb-2">
          {PARENT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={eleve} onChange={(e) => setEleve(e.target.value)} placeholder="Nom de l’élève" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="Classe" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone du parent" className="p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg" />
        </div>
        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{message}</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href={smsLink(phone, message)} className={`py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2 ${phone ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 pointer-events-none'}`}>
            <Send className="w-4 h-4" /> SMS
          </a>
          <a href={parentWhatsappLink(phone, message)} target="_blank" rel="noopener noreferrer" className={`py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2 ${phone ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400 pointer-events-none'}`}>
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
