import { useEffect, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { BookOpen, CalendarDays, CheckSquare, ChevronLeft, ClipboardList, FileText, Plus, Trash2 } from 'lucide-react';

type ToolTab = 'journal' | 'presences' | 'devoirs' | 'appreciations';

interface ToolEntry {
  id: string;
  tab: ToolTab;
  title: string;
  date: string;
  className: string;
  content: string;
  done?: boolean;
}

const STORAGE_KEY = 'msp_pedagogical_tools';

const TABS: { id: ToolTab; label: string; icon: typeof BookOpen; color: string }[] = [
  { id: 'journal', label: 'Cahier journal', icon: BookOpen, color: 'emerald' },
  { id: 'presences', label: 'Présences', icon: CheckSquare, color: 'blue' },
  { id: 'devoirs', label: 'Devoirs', icon: ClipboardList, color: 'amber' },
  { id: 'appreciations', label: 'Appréciations', icon: FileText, color: 'rose' },
];

function loadEntries(): ToolEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid local data
  }
  return [];
}

function saveEntries(entries: ToolEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function PedagogicalToolsScreen() {
  const goBack = useSmartBack();
  const [tab, setTab] = useState<ToolTab>('journal');
  const [entries, setEntries] = useState<ToolEntry[]>([]);
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(today());
  const [content, setContent] = useState('');

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const activeTab = TABS.find(t => t.id === tab)!;
  const filtered = entries.filter(e => e.tab === tab).sort((a, b) => b.date.localeCompare(a.date));

  function addEntry() {
    if (!title.trim() && !content.trim()) {
      alert('Ajoutez au moins un titre ou un contenu.');
      return;
    }

    const next: ToolEntry[] = [
      {
        id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tab,
        title: title.trim() || activeTab.label,
        date,
        className: className.trim(),
        content: content.trim(),
        done: tab === 'devoirs' ? false : undefined,
      },
      ...entries,
    ];
    setEntries(next);
    saveEntries(next);
    setTitle('');
    setContent('');
  }

  function deleteEntry(id: string) {
    if (!confirm('Supprimer cet élément ?')) return;
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
  }

  function toggleDone(id: string) {
    const next = entries.map(e => e.id === id ? { ...e, done: !e.done } : e);
    setEntries(next);
    saveEntries(next);
  }

  function placeholderFor(tab: ToolTab) {
    switch (tab) {
      case 'journal': return 'Ex: Objectif, compétence, déroulement, matériel utilisé...';
      case 'presences': return 'Ex: Absents, retards, observations de la journée...';
      case 'devoirs': return 'Ex: Exercices à faire, consignes, date de remise...';
      case 'appreciations': return 'Ex: Très bon travail, élève attentif, doit renforcer la lecture...';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Outils pédagogiques</h1>
            <p className="text-emerald-100 text-sm">Journal, présences, devoirs et appréciations</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TABS.map(item => {
            const Icon = item.icon;
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`p-3 rounded-xl border-2 text-left flex items-center gap-2 ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Ajouter : {activeTab.label}
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Classe</label>
              <input
                type="text"
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="Ex: CE1 A"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre"
            className="w-full p-3 border border-gray-300 rounded-lg mb-2 text-sm"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={placeholderFor(tab)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm"
          />
          <button
            onClick={addEntry}
            className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Enregistrer
          </button>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun élément enregistré</p>
            </div>
          ) : filtered.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-800">{entry.title}</p>
                  <p className="text-gray-400 text-xs">{entry.date}{entry.className ? ` • ${entry.className}` : ''}</p>
                  {entry.content && <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{entry.content}</p>}
                </div>
                <button onClick={() => deleteEntry(entry.id)} className="text-red-500 p-2 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              {entry.tab === 'devoirs' && (
                <button
                  onClick={() => toggleDone(entry.id)}
                  className={`mt-3 text-sm px-3 py-2 rounded-lg font-medium ${entry.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {entry.done ? '✓ Devoir corrigé' : 'Marquer comme corrigé'}
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}