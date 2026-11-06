import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { Bell, CalendarDays, ChevronLeft, Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import ResourceFiles from './ResourceFiles';
import { addResource, generateResourceId } from '../utils/resourcesDB';
import { importCalendarFromCsv, importCalendarFromDocument, importCalendarFromExcel, isStructuredCalendarFile } from '../utils/calendarImporter';

type EventType = 'ferie' | 'examen' | 'conseil' | 'rentree' | 'conge' | 'pedagogique';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  note?: string;
}

const STORAGE_KEY = 'msp_school_calendar_events';
const NOTIFIED_KEY = 'msp_school_calendar_notified';
const NOTIF_DAYS_KEY = 'msp_school_calendar_notification_days';

const DEFAULT_EVENTS: CalendarEvent[] = [
  { id: 'rentree', title: 'Rentrée scolaire', date: '2025-09-16', type: 'rentree', note: 'Début des activités scolaires' },
  { id: 't1', title: 'Évaluations Trimestre 1', date: '2025-12-02', type: 'examen' },
  { id: 'c1', title: 'Conseil de classe Trimestre 1', date: '2025-12-18', type: 'conseil' },
  { id: 'noel', title: 'Noël', date: '2025-12-25', type: 'ferie' },
  { id: 'jour-an', title: 'Jour de l’an', date: '2026-01-01', type: 'ferie' },
  { id: 't2', title: 'Évaluations Trimestre 2', date: '2026-03-03', type: 'examen' },
  { id: 'c2', title: 'Conseil de classe Trimestre 2', date: '2026-03-20', type: 'conseil' },
  { id: 'travail', title: 'Fête du Travail', date: '2026-05-01', type: 'ferie' },
  { id: 't3', title: 'Évaluations Trimestre 3', date: '2026-05-26', type: 'examen' },
  { id: 'c3', title: 'Conseil de classe Trimestre 3', date: '2026-06-12', type: 'conseil' },
  // ---- Jours fériés officiels du Bénin (dates fixes) ----
  { id: 'fete-nationale', title: 'Fête Nationale — Jour de l\'Indépendance', date: '2026-08-01', type: 'ferie', note: 'Anniversaire de l\'indépendance du Bénin (1960)' },
  { id: 'assomption', title: 'Assomption', date: '2026-08-15', type: 'ferie' },
  { id: 'toussaint', title: 'Toussaint', date: '2026-11-01', type: 'ferie' },
  { id: 'noel-2026', title: 'Noël', date: '2026-12-25', type: 'ferie' },
  // ---- Fêtes mobiles 2026 (à confirmer selon calendrier officiel béninois) ----
  { id: 'paques-2026', title: 'Lundi de Pâques', date: '2026-04-06', type: 'ferie', note: 'Date à confirmer selon le calendrier officiel' },
  { id: 'ascension-2026', title: 'Ascension', date: '2026-05-14', type: 'ferie', note: 'Date à confirmer' },
  { id: 'pentecote-2026', title: 'Lundi de Pentecôte', date: '2026-05-25', type: 'ferie', note: 'Date à confirmer' },
  { id: 'korite-2026', title: 'Korité (Aïd el-Fitr)', date: '2026-03-20', type: 'ferie', note: 'Date fixée par la Commission nationale — à confirmer' },
  { id: 'tabaski-2026', title: 'Tabaski (Aïd el-Kébir)', date: '2026-05-27', type: 'ferie', note: 'Date fixée par la Commission nationale — à confirmer' },
  { id: 'maouloud-2026', title: 'Maouloud (Mawlid)', date: '2026-08-26', type: 'ferie', note: 'Date fixée par la Commission nationale — à confirmer' },
];

const TYPE_LABEL: Record<EventType, string> = {
  ferie: 'Jour férié',
  examen: 'Examen / Évaluation',
  conseil: 'Conseil de classe',
  rentree: 'Rentrée',
  conge: 'Congé',
  pedagogique: 'Activité pédagogique',
};

const TYPE_STYLE: Record<EventType, string> = {
  ferie: 'bg-red-100 text-red-700',
  examen: 'bg-amber-100 text-amber-700',
  conseil: 'bg-indigo-100 text-indigo-700',
  rentree: 'bg-emerald-100 text-emerald-700',
  conge: 'bg-blue-100 text-blue-700',
  pedagogique: 'bg-purple-100 text-purple-700',
};

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: CalendarEvent[] = JSON.parse(raw);
      // Fusion intelligente : les nouveaux JOURS FÉRIÉS par défaut (mises à jour)
      // sont ajoutés s'ils manquent, sans écraser les événements de l'utilisateur.
      const storedIds = new Set(stored.map((e) => e.id));
      const missing = DEFAULT_EVENTS.filter((e) => !storedIds.has(e.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return stored;
    }
  } catch { /* ignore */ }
  return DEFAULT_EVENTS;
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function today() { return new Date().toISOString().split('T')[0]; }

export default function SchoolCalendarScreen() {
  const goBack = useSmartBack();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [type, setType] = useState<EventType>('pedagogique');
  const [note, setNote] = useState('');
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [notificationDays, setNotificationDays] = useState(
    Number(localStorage.getItem(NOTIF_DAYS_KEY) || 7)
  );
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  useEffect(() => setEvents(loadEvents()), []);

  const imminentEvents = useMemo(() => {
    const start = new Date(today());
    start.setHours(0, 0, 0, 0);
    const limit = new Date(start);
    limit.setDate(limit.getDate() + notificationDays);
    return events
      .filter(e => e.type === 'examen' || e.type === 'conseil')
      .filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= limit;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, notificationDays]);

  useEffect(() => {
    if (!events.length) return;
    notifyImminentEvents();
    const interval = window.setInterval(notifyImminentEvents, 1000 * 60 * 60 * 6);
    return () => window.clearInterval(interval);
  }, [events, notificationDays, notificationPermission]);

  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events]);

  function persist(next: CalendarEvent[]) {
    setEvents(next);
    saveEvents(next);
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') {
      alert('Les notifications ne sont pas prises en charge par ce navigateur.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      alert('Notifications activées. Vous serez averti des examens et conseils imminents.');
      notifyImminentEvents(true);
    }
  }

  async function showNotification(event: CalendarEvent) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const title = event.type === 'conseil' ? 'Conseil de classe imminent' : 'Examen imminent';
    const body = `${event.title} prévu le ${event.date}${event.note ? ` — ${event.note}` : ''}`;
    try {
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: `calendar-${event.id}`,
        });
      } else {
        new Notification(title, { body, icon: './icon-192.png', tag: `calendar-${event.id}` });
      }
    } catch {
      try { new Notification(title, { body, icon: './icon-192.png' }); } catch { /* ignore */ }
    }
  }

  function notifyImminentEvents(force = false) {
    let notified: Record<string, boolean> = {};
    try {
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
    } catch { /* stockage bloqué : on notifie sans mémoriser */ }
    for (const event of imminentEvents) {
      const key = `${event.id}-${event.date}`;
      if (!force && notified[key]) continue;
      showNotification(event);
      notified[key] = true;
    }
    try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified)); } catch { /* silencieux */ }
  }

  function updateNotificationDays(value: number) {
    setNotificationDays(value);
    localStorage.setItem(NOTIF_DAYS_KEY, String(value));
  }

  function addEvent() {
    if (!title.trim()) return alert('Ajoutez un titre.');
    persist([...events, { id: `cal-${Date.now()}`, title, date, type, note }]);
    setTitle('');
    setNote('');
  }

  async function importCalendarFile(file?: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let importedCount = 0;
    let analysisMessage = '';

    // 1) Toujours tenter l'analyse, mais sans bloquer le téléversement du fichier.
    try {
      if (isStructuredCalendarFile(file)) {
        const imported = ext === 'csv'
          ? await importCalendarFromCsv(file)
          : await importCalendarFromExcel(file);
        if (imported.length === 0) {
          analysisMessage = 'Aucune date structurée détectée. Format conseillé : Date, Titre, Type, Note.';
        } else {
          const mapped: CalendarEvent[] = imported.map((e, i) => ({
            id: `imp-cal-${Date.now()}-${i}`,
            title: e.title,
            date: e.date,
            type: e.type,
            note: e.note,
          }));
          persist([...events, ...mapped]);
          importedCount = mapped.length;
        }
      } else {
        const imported = await importCalendarFromDocument(file);
        if (imported.length > 0) {
          const mapped: CalendarEvent[] = imported.map((e, i) => ({
            id: `imp-doc-cal-${Date.now()}-${i}`,
            title: e.title,
            date: e.date,
            type: e.type,
            note: e.note,
          }));
          persist([...events, ...mapped]);
          importedCount = mapped.length;
        } else {
          analysisMessage = 'Aucune date exploitable détectée automatiquement dans le contenu du document.';
        }
      }
    } catch (error) {
      console.error(error);
      analysisMessage = 'Analyse automatique impossible, mais le fichier sera ajouté comme document joint.';
    }

    // 2) Dans tous les cas, conserver le fichier original comme référence.
    try {
      await addResource({
        id: generateResourceId(),
        category: 'calendrier',
        kind: 'file',
        title: file.name.replace(/\.[^.]+$/, ''),
        description: `Calendrier académique importé (${ext.toUpperCase() || 'fichier'})`,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        blob: file,
        createdAt: Date.now(),
      });
      setResourceRefreshKey(key => key + 1);
      alert(
        importedCount > 0
          ? `${importedCount} événement(s) détecté(s) et fichier "${file.name}" ajouté aux ressources du calendrier.`
          : `Fichier "${file.name}" ajouté aux ressources du calendrier. ${analysisMessage}`
      );
    } catch (error) {
      console.error(error);
      alert('Le fichier est trop volumineux ou le stockage local est plein. Téléversement impossible.');
    }
  }

  function exportCSV() {
    const rows = [['Date', 'Type', 'Titre', 'Note'], ...sorted.map(e => [e.date, TYPE_LABEL[e.type], e.title, e.note || ''])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendrier-academique.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function exportPDF() {
    const html = `<!doctype html><html><head><title>Calendrier académique</title><style>body{font-family:Arial;padding:24px}h1{color:#047857}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#d1fae5}</style></head><body><h1>Calendrier académique béninois</h1><table><thead><tr><th>Date</th><th>Type</th><th>Titre</th><th>Note</th></tr></thead><tbody>${sorted.map(e => `<tr><td>${e.date}</td><td>${TYPE_LABEL[e.type]}</td><td>${e.title}</td><td>${e.note || ''}</td></tr>`).join('')}</tbody></table><script>window.print()</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Calendrier scolaire</h1><p className="text-emerald-100 text-sm">Dates clés, examens et jours fériés</p></div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={exportCSV} className="bg-blue-50 text-blue-700 py-3 rounded-xl font-semibold"><Download className="w-5 h-5 inline mr-1" /> CSV</button>
          <button onClick={exportPDF} className="bg-red-50 text-red-700 py-3 rounded-xl font-semibold"><FileText className="w-5 h-5 inline mr-1" /> PDF</button>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 p-2 rounded-full">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-800">Notifications locales</h2>
              <p className="text-gray-500 text-sm mt-1">
                Recevez un rappel pour les examens et conseils de classe imminents.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <select
                  value={notificationDays}
                  onChange={(e) => updateNotificationDays(Number(e.target.value))}
                  className="p-3 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={1}>1 jour avant</option>
                  <option value={3}>3 jours avant</option>
                  <option value={7}>7 jours avant</option>
                  <option value={14}>14 jours avant</option>
                </select>
                <button
                  onClick={requestNotifications}
                  className="bg-amber-500 text-white py-3 rounded-lg font-semibold text-sm"
                >
                  {notificationPermission === 'granted' ? 'Notifications actives' : 'Activer'}
                </button>
              </div>
              {imminentEvents.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-sm font-medium mb-1">Rappels imminents :</p>
                  <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
                    {imminentEvents.map(event => (
                      <li key={`${event.id}-${event.date}`}>{event.date} — {event.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-3 cursor-pointer">
          <Upload className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Importer un calendrier académique existant</p>
            <p className="text-xs text-emerald-700/80">DOC, DOCX, PDF, JNP, JPEG, XLS, XLSX, CSV, PNG...</p>
          </div>
          <input
            type="file"
            accept=".doc,.docx,.pdf,.jnp,.jpg,.jpeg,.png,.xls,.xlsx,.csv,image/*,application/pdf"
            onChange={e => {
              importCalendarFile(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
            className="hidden"
          />
        </label>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> Ajouter une date</h2>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" className="w-full p-3 border rounded-lg mb-2 text-sm" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 border rounded-lg text-sm" />
            <select value={type} onChange={e => setType(e.target.value as EventType)} className="p-3 border rounded-lg text-sm">
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (facultatif)" rows={2} className="w-full p-3 border rounded-lg text-sm resize-none" />
          <button onClick={addEvent} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold">Ajouter</button>
        </div>

        <div className="space-y-2">
          {sorted.map(e => (
            <div key={e.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-3">
              <div className="bg-emerald-50 p-3 rounded-xl"><CalendarDays className="w-6 h-6 text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{e.title}</p>
                <p className="text-gray-500 text-sm">{e.date}</p>
                <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${TYPE_STYLE[e.type]}`}>{TYPE_LABEL[e.type]}</span>
                {e.note && <p className="text-gray-600 text-sm mt-2">{e.note}</p>}
              </div>
              <button onClick={() => persist(events.filter(x => x.id !== e.id))} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
        </div>

        <ResourceFiles category="calendrier" accent="blue" refreshKey={resourceRefreshKey} />
      </main>
    </div>
  );
}