import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  Building2, CalendarDays, ChevronLeft, Clock3, Copy, Eye, EyeOff, Filter,
  Globe2, Lock, MapPin, Plus, Radio, Search, Share2, Shield,
  Trash2, Trophy, Upload, Users,
} from 'lucide-react';
import { openWhatsApp } from '../utils/contact';
import { copyText } from '../utils/clipboard';
import ResourceFiles from './ResourceFiles';
import { addResource, generateResourceId } from '../utils/resourcesDB';
import { importCalendarFromCsv, importCalendarFromDocument, importCalendarFromExcel, isStructuredCalendarFile, ImportedCalendarEvent } from '../utils/calendarImporter';

type ActivityCategory = 'pedagogique' | 'sportive' | 'culturelle' | 'formation' | 'reunion' | 'autre';
type Visibility = 'public' | 'private' | 'invite';

interface ActivityEvent {
  id: string;
  title: string;
  category: ActivityCategory;
  date: string;
  time: string;
  location: string;
  organizer: string;
  description: string;
  visibility: Visibility;
  invited: string[];
  inviteCode: string;
  goingCount?: number;
  maybeCount?: number;
  userStatus?: 'going' | 'maybe' | 'none';
  createdAt: number;
}

const STORAGE_KEY = 'msp_activity_events';

const CATEGORIES: Record<ActivityCategory, { label: string; color: string; emoji: string }> = {
  pedagogique: { label: 'Pédagogique', color: 'bg-emerald-100 text-emerald-700', emoji: '📚' },
  sportive: { label: 'Sportive', color: 'bg-blue-100 text-blue-700', emoji: '⚽' },
  culturelle: { label: 'Culturelle', color: 'bg-purple-100 text-purple-700', emoji: '🎭' },
  formation: { label: 'Formation', color: 'bg-amber-100 text-amber-700', emoji: '🎓' },
  reunion: { label: 'Réunion', color: 'bg-rose-100 text-rose-700', emoji: '🤝' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-700', emoji: '📌' },
};

const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: 'Public - visible par tous',
  private: 'Privé - visible uniquement par vous',
  invite: 'Sur invitation - visible aux invités',
};

const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    id: 'demo-ape',
    title: 'Conseil Extraordinaire du Bureau APE & Bilan Financier',
    category: 'reunion',
    date: '2026-08-29',
    time: '15:00',
    location: 'Salle des Maîtres - Établissement',
    organizer: 'Association des Parents d’Élèves (APE)',
    description: 'Ordre du jour : validation des travaux de réfection des salles de classe, organisation de la kermesse de fin d’année.',
    visibility: 'private',
    invited: ['Bureau APE', 'Directeurs d’écoles'],
    inviteCode: 'ACT-APE-2026',
    goingCount: 8,
    maybeCount: 1,
    userStatus: 'none',
    createdAt: Date.now() - 5,
  },
  {
    id: 'demo-culture',
    title: 'Journée Culturelle, Concours de Poésie & Théâtre en Langue Nationale',
    category: 'culturelle',
    date: '2026-09-03',
    time: '10:00',
    location: 'Maison du Peuple & Espaces Culturels',
    organizer: 'Comité Culturel Inter-Écoles',
    description: 'Exposition d’arts plastiques d’élèves, récitations poétiques, danses traditionnelles et valorisation du patrimoine éducatif.',
    visibility: 'invite',
    invited: ['Enseignants Titulaires CM1-CM2', 'Directeurs d’Écoles', 'Bureau APE'],
    inviteCode: 'ACT-CULT-2026',
    goingCount: 19,
    maybeCount: 3,
    userStatus: 'none',
    createdAt: Date.now() - 4,
  },
  {
    id: 'demo-maths',
    title: 'Olympiades Nationales de Calcul Rapide & Mathématiques (CI-CM2)',
    category: 'pedagogique',
    date: '2026-09-06',
    time: '08:30',
    location: 'Grand Amphithéâtre École Centre, Cotonou & Circonscriptions',
    organizer: 'Association Béninoise des Enseignants de Mathématiques',
    description: 'Grand concours de calcul mental, résolution de problèmes APC et défi inter-écoles. Remise de trophées et fournitures scolaires aux lauréats.',
    visibility: 'public',
    invited: [],
    inviteCode: 'ACT-MATH-2026',
    goingCount: 42,
    maybeCount: 6,
    userStatus: 'none',
    createdAt: Date.now() - 3,
  },
  {
    id: 'demo-sport',
    title: 'Championnat Sportif Inter-Écoles & Athlétisme Scolaire',
    category: 'sportive',
    date: '2026-09-13',
    time: '09:00',
    location: 'Stade Municipal & Terrain Omnisports',
    organizer: 'Ligue du Sport Scolaire de Circonscription',
    description: 'Tournoi de football des élèves du primaire, épreuves de course 60m, saut en longueur et relais mixte inter-classes.',
    visibility: 'public',
    invited: [],
    inviteCode: 'ACT-SPORT-2026',
    goingCount: 28,
    maybeCount: 5,
    userStatus: 'none',
    createdAt: Date.now() - 2,
  },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

function loadEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid local data
  }
  return DEFAULT_EVENTS;
}

function saveEvents(events: ActivityEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function generateInviteCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ACT-${part()}-${part()}`;
}

function daysUntil(date: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(days: number) {
  if (days < 0) return `Terminé depuis ${Math.abs(days)} jour(s)`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `J-${days}`;
}

function emptyEvent(): ActivityEvent {
  return {
    id: '',
    title: '',
    category: 'pedagogique',
    date: today(),
    time: '08:00',
    location: '',
    organizer: '',
    description: '',
    visibility: 'public',
    invited: [],
    inviteCode: generateInviteCode(),
    goingCount: 0,
    maybeCount: 0,
    userStatus: 'none',
    createdAt: Date.now(),
  };
}

export default function ActivityEventsScreen() {
  const goBack = useSmartBack();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [form, setForm] = useState<ActivityEvent>(emptyEvent());
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | Visibility>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ActivityCategory>('all');
  const [search, setSearch] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return events
      .filter(event => filter === 'all' || event.visibility === filter)
      .filter(event => categoryFilter === 'all' || event.category === categoryFilter)
      .filter(event => {
        const text = `${event.title} ${event.location} ${event.organizer} ${event.description}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return text.includes(q);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [events, filter, categoryFilter, search]);

  function persist(next: ActivityEvent[]) {
    setEvents(next);
    saveEvents(next);
  }

  function categoryFromImported(event: ImportedCalendarEvent): ActivityCategory {
    if (event.type === 'examen') return 'pedagogique';
    if (event.type === 'conseil') return 'reunion';
    if (event.type === 'conge' || event.type === 'ferie') return 'autre';
    return 'pedagogique';
  }

  async function importActivityProgram(file?: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let importedCount = 0;
    try {
      const imported = isStructuredCalendarFile(file)
        ? ext === 'csv'
          ? await importCalendarFromCsv(file)
          : await importCalendarFromExcel(file)
        : await importCalendarFromDocument(file);

      if (imported.length > 0) {
        const mapped: ActivityEvent[] = imported.map((event, i) => ({
          id: `act-import-${Date.now()}-${i}`,
          title: event.title,
          category: categoryFromImported(event),
          date: event.date,
          time: '08:00',
          location: '',
          organizer: '',
          description: event.note || `Importé depuis ${file.name}`,
          visibility: 'public',
          invited: [],
          inviteCode: generateInviteCode(),
          createdAt: Date.now(),
        }));
        persist([...events, ...mapped]);
        importedCount = mapped.length;
      }

      await addResource({
        id: generateResourceId(),
        category: 'activites',
        kind: 'file',
        title: file.name.replace(/\.[^.]+$/, ''),
        description: `Programme d’activités importé (${ext.toUpperCase() || 'fichier'})`,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        blob: file,
        createdAt: Date.now(),
      });
      setResourceRefreshKey(k => k + 1);
      alert(importedCount > 0
        ? `${importedCount} activité(s) détectée(s) et fichier ajouté aux ressources.`
        : `Fichier ajouté aux ressources. Aucune date exploitable détectée automatiquement.`);
    } catch (error) {
      console.error(error);
      alert('Impossible d’analyser le fichier. Il sera conservé comme ressource jointe.');
      await addResource({
        id: generateResourceId(),
        category: 'activites',
        kind: 'file',
        title: file.name.replace(/\.[^.]+$/, ''),
        description: 'Programme d’activités importé comme document joint',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        blob: file,
        createdAt: Date.now(),
      });
      setResourceRefreshKey(k => k + 1);
    }
  }

  function saveEvent() {
    if (!form.title.trim()) {
      alert("Donnez un titre à l'activité.");
      return;
    }
    const event: ActivityEvent = {
      ...form,
      id: form.id || `act-${Date.now()}`,
      inviteCode: form.inviteCode || generateInviteCode(),
      createdAt: form.createdAt || Date.now(),
    };
    const next = form.id ? events.map(e => e.id === form.id ? event : e) : [event, ...events];
    persist(next);
    setForm(emptyEvent());
    setInviteText('');
    setShowForm(false);
  }

  function editEvent(event: ActivityEvent) {
    setForm(event);
    setInviteText(event.invited.join(', '));
    setShowForm(true);
  }

  function deleteEvent(id: string) {
    if (!confirm('Supprimer ce programme d’activité ?')) return;
    persist(events.filter(e => e.id !== id));
  }

  function updateInvited(value: string) {
    setInviteText(value);
    setForm({
      ...form,
      invited: value.split(',').map(v => v.trim()).filter(Boolean),
    });
  }

  function shareEvent(event: ActivityEvent) {
    const days = daysUntil(event.date);
    const msg = `Programme d'activité\n\n${event.title}\nCatégorie : ${CATEGORIES[event.category].label}\nDate : ${event.date} à ${event.time}\nLieu : ${event.location || 'À préciser'}\nOrganisateur : ${event.organizer || 'À préciser'}\nDécompte : ${countdownLabel(days)}\n\n${event.description || ''}\n\nMode : ${VISIBILITY_LABEL[event.visibility]}\nCode invitation : ${event.inviteCode}\n\nMaster Soutien Pédagogique`;
    openWhatsApp(msg);
  }

  async function copyInvite(event: ActivityEvent) {
    const text = `${event.title} - ${event.date} ${event.time}\nCode invitation : ${event.inviteCode}`;
    const okCopy = await copyText(text);
    alert(okCopy ? 'Invitation copiée.' : 'Impossible de copier automatiquement : notez l’invitation manuellement.');
  }

  function setParticipation(event: ActivityEvent, status: 'going' | 'maybe') {
    const previous = event.userStatus || 'none';
    let going = event.goingCount ?? 0;
    let maybe = event.maybeCount ?? 0;

    if (previous === status) {
      if (status === 'going') going = Math.max(0, going - 1);
      if (status === 'maybe') maybe = Math.max(0, maybe - 1);
      persist(events.map(e => e.id === event.id ? { ...e, goingCount: going, maybeCount: maybe, userStatus: 'none' } : e));
      return;
    }

    if (previous === 'going') going = Math.max(0, going - 1);
    if (previous === 'maybe') maybe = Math.max(0, maybe - 1);
    if (status === 'going') going += 1;
    if (status === 'maybe') maybe += 1;

    persist(events.map(e => e.id === event.id ? { ...e, goingCount: going, maybeCount: maybe, userStatus: status } : e));
  }

  const publicCount = events.filter(e => e.visibility === 'public').length;
  const privateCount = events.filter(e => e.visibility === 'private').length;
  const inviteCount = events.filter(e => e.visibility === 'invite').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Grands rendez-vous</h1>
            <p className="text-emerald-100 text-sm">Activités pédagogiques, sportives et associatives</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <section className="mx-auto mb-5 max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-950">Réseau & Programmes éducatifs</span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-100">Bénin • Associations & Enseignants</span>
              </div>
              <div className="flex items-start gap-4">
                <Trophy className="mt-1 h-10 w-10 text-amber-400" />
                <div>
                  <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">Grands Rendez-vous & Programmes d'Activités</h2>
                  <p className="mt-4 max-w-2xl text-emerald-100">
                    Programmez vos concours pédagogiques, tournois sportifs, réunions d’APE et activités associatives avec un décompte en temps réel. Publiez en mode <strong className="text-amber-300">Public</strong>, <strong className="text-amber-300">Privé</strong> ou <strong className="text-amber-300">Sur Invitation</strong>.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setForm(emptyEvent()); setInviteText(''); setShowForm(true); }}
              className="rounded-2xl bg-amber-400 px-6 py-4 text-base font-extrabold text-amber-950 shadow-lg inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-6 w-6" />
              Programmer un Rendez-vous
            </button>
          </div>
        </section>

        <label className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3 cursor-pointer">
          <Upload className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Importer un programme d’activités</p>
            <p className="text-xs text-amber-700">PDF, DOCX, DOC, XLS, XLSX, CSV, TXT. Les dates et événements seront détectés automatiquement.</p>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            onChange={e => {
              importActivityProgram(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
            className="hidden"
          />
        </label>

        <section className="mx-auto mb-5 max-w-6xl rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une activité, concours, tournoi, lieu ou organisateur..."
                className="w-full rounded-xl border border-gray-300 py-4 pl-12 pr-4 text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto rounded-xl bg-gray-50 p-1">
              {[
                ['all', <><Radio className="h-4 w-4" /> Tous ({events.length})</>],
                ['public', <><Globe2 className="h-4 w-4" /> Publics ({publicCount})</>],
                ['private', <><Lock className="h-4 w-4" /> Privés ({privateCount})</>],
                ['invite', <><Users className="h-4 w-4" /> Invitations ({inviteCount})</>],
              ].map(([key, label]) => (
                <button
                  key={key as string}
                  onClick={() => setFilter(key as 'all' | Visibility)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold inline-flex items-center gap-1.5 ${filter === key ? 'bg-emerald-700 text-white' : 'text-gray-600'}`}
                >
                  {label as React.ReactNode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto">
            <span className="whitespace-nowrap text-xs font-bold uppercase text-gray-400 inline-flex items-center gap-1"><Filter className="h-4 w-4" /> Catégorie :</span>
            {[
              ['all', 'Toutes'],
              ['pedagogique', 'Pédagogique'],
              ['sportive', 'Sportif'],
              ['culturelle', 'Culturel'],
              ['reunion', 'Associatif / APE'],
              ['autre', 'Autre'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key as 'all' | ActivityCategory)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${categoryFilter === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Aucun programme d’activité</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-2">
            {filteredEvents.map(event => <ActivityCard key={event.id} event={event} onEdit={editEvent} onDelete={deleteEvent} onShare={shareEvent} onCopy={copyInvite} onParticipate={setParticipation} />)}
          </div>
        )}

        <ResourceFiles category="activites" accent="amber" refreshKey={resourceRefreshKey} />
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[30rem] rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{form.id ? 'Modifier l’activité' : 'Nouvelle activité'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">×</button>
            </div>

            <div className="space-y-3">
              <Input label="Titre" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="Ex: Journée pédagogique départementale" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ActivityCategory })} className="w-full p-3 border border-gray-300 rounded-lg">
                  {Object.entries(CATEGORIES).map(([key, value]) => <option key={key} value={key}>{value.emoji} {value.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
                <Input label="Heure" type="time" value={form.time} onChange={v => setForm({ ...form, time: v })} />
              </div>
              <Input label="Lieu" value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="Ex: École, terrain, salle de réunion..." />
              <Input label="Organisateur / Association" value={form.organizer} onChange={v => setForm({ ...form, organizer: v })} placeholder="Ex: APE, CAP, association éducative..." />
              <Area label="Description / Programme" value={form.description} onChange={v => setForm({ ...form, description: v })} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibilité</label>
                <div className="grid grid-cols-3 gap-2">
                  <VisButton current={form.visibility} value="public" icon={<Eye className="w-4 h-4" />} label="Public" onClick={() => setForm({ ...form, visibility: 'public' })} />
                  <VisButton current={form.visibility} value="private" icon={<EyeOff className="w-4 h-4" />} label="Privé" onClick={() => setForm({ ...form, visibility: 'private' })} />
                  <VisButton current={form.visibility} value="invite" icon={<Users className="w-4 h-4" />} label="Invités" onClick={() => setForm({ ...form, visibility: 'invite' })} />
                </div>
              </div>

              {form.visibility === 'invite' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <label className="block text-sm font-medium text-blue-800 mb-1">Invités</label>
                  <textarea
                    value={inviteText}
                    onChange={e => updateInvited(e.target.value)}
                    placeholder="Noms, téléphones ou emails séparés par virgule"
                    rows={3}
                    className="w-full p-3 border border-blue-200 rounded-lg text-sm resize-none"
                  />
                  <p className="text-blue-700 text-xs mt-1">Code d’invitation : <strong>{form.inviteCode}</strong></p>
                </div>
              )}

              <button onClick={saveEvent} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold">
                Enregistrer le programme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ event, onEdit, onDelete, onShare, onCopy, onParticipate }: {
  event: ActivityEvent;
  onEdit: (e: ActivityEvent) => void;
  onDelete: (id: string) => void;
  onShare: (e: ActivityEvent) => void;
  onCopy: (e: ActivityEvent) => void;
  onParticipate: (event: ActivityEvent, status: 'going' | 'maybe') => void;
}) {
  const days = daysUntil(event.date);
  const category = CATEGORIES[event.category];
  const countdownColor = days <= 7 ? 'bg-emerald-600' : 'bg-blue-600';
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${category.color}`}>{category.emoji} {category.label}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1 ${event.visibility === 'public' ? 'bg-blue-100 text-blue-700' : event.visibility === 'private' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
              {event.visibility === 'public' ? <Globe2 className="h-3.5 w-3.5" /> : event.visibility === 'private' ? <Lock className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {event.visibility === 'public' ? 'Mode Public' : event.visibility === 'private' ? 'Mode Privé' : 'Sur Invitation'}
            </span>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold text-white inline-flex items-center gap-1 ${countdownColor}`}>
            <Clock3 className="h-4 w-4" /> {countdownLabel(days)} {days > 0 ? `(${days}j restants)` : ''}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold leading-snug text-gray-900">{event.title}</h3>
          <p className="mt-2 text-sm font-semibold text-emerald-700 inline-flex items-center gap-1"><Building2 className="h-4 w-4" />{event.organizer || 'Organisateur à préciser'}</p>
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-bold text-gray-800 inline-flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" />{new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<span className="ml-auto rounded bg-white px-2 py-1 font-mono text-xs">{event.time}</span></p>
            <p className="mt-2 text-sm font-semibold text-gray-600 inline-flex items-center gap-2"><MapPin className="h-5 w-5 text-rose-500" />{event.location || 'Lieu à préciser'}</p>
          </div>
          {event.description && <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{event.description}</p>}
          {event.invited.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-gray-400">Groupes & collègues invités :</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {event.invited.map((item, index) => <span key={index} className="rounded bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">{item}</span>)}
              </div>
            </div>
          )}
          {event.visibility === 'invite' && (
            <p className="text-blue-700 text-xs mt-2"><Shield className="w-3.5 h-3.5 inline mr-1" />Code invitation : <strong>{event.inviteCode}</strong></p>
          )}
        </div>
      </div>
      <div className="border-t bg-gray-50 p-4 flex flex-wrap items-center gap-2">
        <button onClick={() => onParticipate(event, 'going')} className={`rounded-xl px-4 py-2 text-sm font-extrabold ${event.userStatus === 'going' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700 border'}`}>✓ Je participe ({event.goingCount ?? 0})</button>
        <button onClick={() => onParticipate(event, 'maybe')} className={`rounded-xl px-4 py-2 text-sm font-bold ${event.userStatus === 'maybe' ? 'bg-amber-400 text-amber-950' : 'bg-white text-gray-700 border'}`}>Peut-être</button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => onShare(event)} className="text-emerald-700 px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1"><Share2 className="w-4 h-4" />Inviter</button>
          <button onClick={() => onCopy(event)} className="text-blue-700 p-2 rounded-lg" title="Copier"><Copy className="w-5 h-5" /></button>
          <button onClick={() => onEdit(event)} className="text-amber-700 p-2 rounded-lg" title="Modifier"><Share2 className="w-5 h-5" /></button>
          <button onClick={() => onDelete(event.id)} className="text-red-500 p-2 rounded-lg" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border border-gray-300 rounded-lg text-sm" />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none" />
    </div>
  );
}

function VisButton({ current, value, icon, label, onClick }: { current: Visibility; value: Visibility; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`py-3 rounded-lg border-2 text-xs font-semibold flex flex-col items-center gap-1 ${current === value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
      {icon}
      {label}
    </button>
  );
}