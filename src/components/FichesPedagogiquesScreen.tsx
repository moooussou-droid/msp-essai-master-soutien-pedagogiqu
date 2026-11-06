import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  BookOpen, CalendarDays, ChevronLeft, Clock, FileText, Plus, Search,
  Trash2, Edit3, CheckCircle2, LayoutGrid,
} from 'lucide-react';
import ResourceFiles from './ResourceFiles';

type Tab = 'dashboard' | 'fiches' | 'nouvelle' | 'planning' | 'emploi' | 'recherche';

interface FichePedagogique {
  id: string;
  titre: string;
  classe: string;
  matiere: string;
  domaine: string;
  duree: string;
  date: string;
  competence: string;
  objectif: string;
  materiel: string;
  deroulement: string;
  evaluation: string;
  rubriques?: { titre: string; contenu: string }[];
  pointsAControler?: string[];
  statut: 'brouillon' | 'prete' | 'faite';
  createdAt: number;
}

interface SeancePlanifiee {
  id: string;
  titre: string;
  classe: string;
  matiere: string;
  date: string;
  heure: string;
  duree: string;
  note: string;
  done: boolean;
}

interface EmploiTempsItem {
  id: string;
  jour: string;
  heure: string;
  classe: string;
  matiere: string;
}

const FICHES_KEY = 'msp_fiches_pedagogiques';
const PLANNING_KEY = 'msp_fiches_planning';
const EMPLOI_KEY = 'msp_fiches_emploi_temps';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid data
  }
  return fallback;
}

function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function emptyFiche(): FichePedagogique {
  return {
    id: '',
    titre: '',
    classe: '',
    matiere: '',
    domaine: '',
    duree: '45 min',
    date: today(),
    competence: '',
    objectif: '',
    materiel: '',
    deroulement: '',
    evaluation: '',
    statut: 'brouillon',
    createdAt: Date.now(),
  };
}

export default function FichesPedagogiquesScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [fiches, setFiches] = useState<FichePedagogique[]>([]);
  const [planning, setPlanning] = useState<SeancePlanifiee[]>([]);
  const [emploi, setEmploi] = useState<EmploiTempsItem[]>([]);
  const [fiche, setFiche] = useState<FichePedagogique>(emptyFiche());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [newSeance, setNewSeance] = useState<SeancePlanifiee>({
    id: '', titre: '', classe: '', matiere: '', date: today(), heure: '08:00', duree: '45 min', note: '', done: false,
  });
  const [newEmploi, setNewEmploi] = useState<EmploiTempsItem>({
    id: '', jour: 'Lundi', heure: '08:00', classe: '', matiere: '',
  });

  useEffect(() => {
    setFiches(loadJson<FichePedagogique[]>(FICHES_KEY, []));
    setPlanning(loadJson<SeancePlanifiee[]>(PLANNING_KEY, []));
    setEmploi(loadJson<EmploiTempsItem[]>(EMPLOI_KEY, []));
  }, []);

  const filteredFiches = useMemo(() => {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return fiches.filter(f => {
      const text = `${f.titre} ${f.classe} ${f.matiere} ${f.domaine} ${f.objectif} ${f.competence} ${(f.rubriques || []).map(r => `${r.titre} ${r.contenu}`).join(' ')}`
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return text.includes(q);
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [fiches, query]);

  function persistFiches(next: FichePedagogique[]) {
    setFiches(next);
    saveJson(FICHES_KEY, next);
  }

  function persistPlanning(next: SeancePlanifiee[]) {
    setPlanning(next);
    saveJson(PLANNING_KEY, next);
  }

  function persistEmploi(next: EmploiTempsItem[]) {
    setEmploi(next);
    saveJson(EMPLOI_KEY, next);
  }

  function saveFiche() {
    if (!fiche.titre.trim() && !fiche.matiere.trim()) {
      alert('Ajoutez au moins un titre ou une matière.');
      return;
    }

    if (editingId) {
      const next = fiches.map(f => f.id === editingId ? { ...fiche, id: editingId } : f);
      persistFiches(next);
    } else {
      persistFiches([{ ...fiche, id: `fiche-${Date.now()}`, createdAt: Date.now() }, ...fiches]);
    }
    setFiche(emptyFiche());
    setEditingId(null);
    setTab('fiches');
  }

  function editFiche(item: FichePedagogique) {
    setFiche(item);
    setEditingId(item.id);
    setTab('nouvelle');
  }

  function deleteFiche(id: string) {
    if (!confirm('Supprimer cette fiche pédagogique ?')) return;
    persistFiches(fiches.filter(f => f.id !== id));
  }

  function addSeance() {
    if (!newSeance.titre.trim() && !newSeance.matiere.trim()) {
      alert('Ajoutez un titre ou une matière.');
      return;
    }
    persistPlanning([{ ...newSeance, id: `seance-${Date.now()}` }, ...planning]);
    setNewSeance({ id: '', titre: '', classe: '', matiere: '', date: today(), heure: '08:00', duree: '45 min', note: '', done: false });
  }

  function addEmploi() {
    if (!newEmploi.classe.trim() || !newEmploi.matiere.trim()) {
      alert('Renseignez au moins la classe et la matière.');
      return;
    }
    persistEmploi([...emploi, { ...newEmploi, id: `emploi-${Date.now()}` }]);
    setNewEmploi({ id: '', jour: 'Lundi', heure: '08:00', classe: '', matiere: '' });
  }

  const navItems: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutGrid },
    { id: 'fiches', label: 'Fiches', icon: FileText },
    { id: 'planning', label: 'Planning', icon: CalendarDays },
    { id: 'recherche', label: 'Recherche', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Espace fiches pédagogiques et autres</h1>
            <p className="text-emerald-100 text-sm">Fiches, séances, emploi du temps et documents</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-28">
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Disponibilité de la préparation de fiches par IA">
          <h2 className="font-bold">Préparation de fiches par IA : temporairement indisponible</h2>
          <p className="mt-1 text-sm leading-relaxed">Créez et organisez vos fiches manuellement dans cet espace. L’IA locale reste disponible dans l’assistant conversationnel pour les questions et les explications, mais pas pour rédiger une fiche complète.</p>
          <button type="button" onClick={() => navigate('/guide/manuel')} className="mt-2 text-sm font-bold underline underline-offset-2">Consulter le Guide de l’utilisateur</button>
        </section>

        <button
          onClick={() => navigate('/fiches-preparation')}
          className="w-full mb-4 text-left rounded-2xl p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold leading-tight">Les Fiches de préparation Master Soutien Pédagogique</p>
            <p className="text-emerald-50 text-xs mt-0.5">
              Organisées par classe et par matière • téléchargement gratuit (filigrane inclus) • filigrane personnalisable
            </p>
          </div>
          <span className="text-2xl">→</span>
        </button>

        {tab === 'dashboard' && (
          <Dashboard
            fiches={fiches}
            planning={planning}
            emploi={emploi}
            setTab={setTab}
          />
        )}
        {tab === 'fiches' && (
          <FichesList fiches={fiches} onNew={() => { setFiche(emptyFiche()); setEditingId(null); setTab('nouvelle'); }} onEdit={editFiche} onDelete={deleteFiche} />
        )}
        {tab === 'nouvelle' && (
          <FicheForm fiche={fiche} setFiche={setFiche} editing={!!editingId} onSave={saveFiche} onCancel={() => { setFiche(emptyFiche()); setEditingId(null); setTab('fiches'); }} />
        )}
        {tab === 'planning' && (
          <PlanningView
            planning={planning}
            setPlanning={persistPlanning}
            newSeance={newSeance}
            setNewSeance={setNewSeance}
            addSeance={addSeance}
            emploi={emploi}
            setEmploi={persistEmploi}
            newEmploi={newEmploi}
            setNewEmploi={setNewEmploi}
            addEmploi={addEmploi}
            openEmploi={() => setTab('emploi')}
          />
        )}
        {tab === 'emploi' && (
          <EmploiView emploi={emploi} setEmploi={persistEmploi} newEmploi={newEmploi} setNewEmploi={setNewEmploi} addEmploi={addEmploi} />
        )}
        {tab === 'recherche' && (
          <RechercheView query={query} setQuery={setQuery} fiches={filteredFiches} onEdit={editFiche} />
        )}

        <ResourceFiles category="fiches" accent="emerald" />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t grid grid-cols-4 h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 ${tab === item.id ? 'text-emerald-600' : 'text-gray-500'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Dashboard({ fiches, planning, emploi, setTab }: {
  fiches: FichePedagogique[];
  planning: SeancePlanifiee[];
  emploi: EmploiTempsItem[];
  setTab: (tab: Tab) => void;
}) {
  const recentes = fiches.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Bonjour</h2>
        <p className="text-gray-500 text-sm">Tableau de bord pédagogique</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat value={fiches.length} label="Fiches" />
          <Stat value={planning.length} label="Séances" />
          <Stat value={emploi.length} label="Créneaux" />
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-3">Accès rapide</h3>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <Quick label="Mes fiches" icon={FileText} onClick={() => setTab('fiches')} />
        <Quick label="Nouvelle fiche" icon={Plus} onClick={() => setTab('nouvelle')} />
        <Quick label="Mes planifications" icon={CalendarDays} onClick={() => setTab('planning')} />
        <Quick label="Mon emploi du temps" icon={Clock} onClick={() => setTab('emploi')} />
      </div>

      <h3 className="font-bold text-gray-800 mb-3">Fiches récentes</h3>
      {recentes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune fiche pour le moment.</p>
          <button onClick={() => setTab('nouvelle')} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Créer ma première fiche
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recentes.map(f => <FicheCard key={f.id} fiche={f} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-emerald-50 rounded-xl p-3 text-center">
      <p className="text-2xl font-bold text-emerald-700">{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

function Quick({ label, icon: Icon, onClick }: { label: string; icon: typeof BookOpen; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl shadow p-4 flex items-center gap-3 text-left">
      <div className="bg-emerald-100 p-2 rounded-lg"><Icon className="w-5 h-5 text-emerald-600" /></div>
      <span className="font-semibold text-gray-800 text-sm">{label}</span>
    </button>
  );
}

function FichesList({ fiches, onNew, onEdit, onDelete }: {
  fiches: FichePedagogique[];
  onNew: () => void;
  onEdit: (f: FichePedagogique) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">Mes fiches</h2>
        <button onClick={onNew} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nouvelle
        </button>
      </div>
      {fiches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">Aucune fiche enregistrée.</div>
      ) : (
        <div className="space-y-2">
          {fiches.map(f => (
            <div key={f.id} className="bg-white rounded-xl shadow p-4">
              <FicheCard fiche={f} />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => onEdit(f)} className="bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
                <button onClick={() => onDelete(f.id)} className="bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FicheCard({ fiche }: { fiche: FichePedagogique }) {
  const statutStyle = fiche.statut === 'faite'
    ? 'bg-emerald-100 text-emerald-700'
    : fiche.statut === 'prete'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 truncate">{fiche.titre || fiche.matiere || 'Fiche pédagogique'}</p>
          <p className="text-gray-500 text-xs">{fiche.date} • {fiche.classe || 'Classe non précisée'} • {fiche.matiere || 'Matière non précisée'}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statutStyle}`}>{fiche.statut}</span>
      </div>
      {fiche.objectif && <p className="text-gray-600 text-sm mt-2 line-clamp-2">Objectif : {fiche.objectif}</p>}
      {fiche.rubriques?.length ? <p className="mt-2 text-xs text-emerald-700 line-clamp-2">Rubriques du modèle : {fiche.rubriques.map(item => item.titre).join(' · ')}</p> : null}
      {fiche.pointsAControler?.length ? <p className="mt-1 text-xs font-semibold text-amber-800">À vérifier : {fiche.pointsAControler.length} point(s)</p> : null}
    </div>
  );
}

function FicheForm({ fiche, setFiche, editing, onSave, onCancel }: {
  fiche: FichePedagogique;
  setFiche: (f: FichePedagogique) => void;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (patch: Partial<FichePedagogique>) => setFiche({ ...fiche, ...patch });
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="font-bold text-gray-800 mb-3">{editing ? 'Modifier la fiche' : 'Nouvelle fiche pédagogique'}</h2>
      <div className="space-y-3">
        <Input label="Titre" value={fiche.titre} onChange={v => update({ titre: v })} placeholder="Ex: Addition avec retenue" />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Classe" value={fiche.classe} onChange={v => update({ classe: v })} placeholder="CE1 A" />
          <Input label="Matière" value={fiche.matiere} onChange={v => update({ matiere: v })} placeholder="Mathématiques" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Date" value={fiche.date} onChange={v => update({ date: v })} type="date" />
          <Input label="Durée" value={fiche.duree} onChange={v => update({ duree: v })} placeholder="45 min" />
        </div>
        <Input label="Domaine / Thème" value={fiche.domaine} onChange={v => update({ domaine: v })} placeholder="Numération, lecture..." />
        <Area label="Compétence" value={fiche.competence} onChange={v => update({ competence: v })} />
        <Area label="Objectif spécifique" value={fiche.objectif} onChange={v => update({ objectif: v })} />
        <Area label="Matériel didactique" value={fiche.materiel} onChange={v => update({ materiel: v })} />
        <Area label="Déroulement de la séance" value={fiche.deroulement} onChange={v => update({ deroulement: v })} rows={5} />
        <Area label="Évaluation" value={fiche.evaluation} onChange={v => update({ evaluation: v })} />
        {fiche.rubriques?.length ? <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <summary className="cursor-pointer text-sm font-bold text-emerald-900">Rubriques conservées du modèle ({fiche.rubriques.length})</summary>
          <div className="mt-3 space-y-3">
            {fiche.rubriques.map((section, index) => <div key={index} className="rounded-lg bg-white p-3 space-y-2">
              <Input label={`Rubrique ${index + 1}`} value={section.titre} onChange={v => update({ rubriques: fiche.rubriques!.map((item, i) => i === index ? { ...item, titre: v } : item) })} />
              <Area label="Contenu" value={section.contenu} onChange={v => update({ rubriques: fiche.rubriques!.map((item, i) => i === index ? { ...item, contenu: v } : item) })} rows={4} />
              <button type="button" onClick={() => update({ rubriques: fiche.rubriques!.filter((_, i) => i !== index) })} className="text-xs font-semibold text-red-700 underline">Retirer cette rubrique</button>
            </div>)}
            <button type="button" onClick={() => update({ rubriques: [...(fiche.rubriques || []), { titre: 'Nouvelle rubrique', contenu: '' }] })} className="text-sm font-semibold text-emerald-800 underline">+ Ajouter une rubrique</button>
          </div>
        </details> : null}
        {fiche.pointsAControler?.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">Points à vérifier avant validation</p><ul className="mt-1 list-disc pl-5">{fiche.pointsAControler.map((point, index) => <li key={index}>{point}</li>)}</ul></div> : null}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={fiche.statut} onChange={e => update({ statut: e.target.value as FichePedagogique['statut'] })} className="w-full p-3 border border-gray-300 rounded-lg">
            <option value="brouillon">Brouillon</option>
            <option value="prete">Prête</option>
            <option value="faite">Faite</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold">Annuler</button>
          <button onClick={onSave} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold">Enregistrer</button>
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

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none" />
    </div>
  );
}

function PlanningView({ planning, setPlanning, newSeance, setNewSeance, addSeance, openEmploi }: {
  planning: SeancePlanifiee[];
  setPlanning: (p: SeancePlanifiee[]) => void;
  newSeance: SeancePlanifiee;
  setNewSeance: (s: SeancePlanifiee) => void;
  addSeance: () => void;
  emploi: EmploiTempsItem[];
  setEmploi: (e: EmploiTempsItem[]) => void;
  newEmploi: EmploiTempsItem;
  setNewEmploi: (e: EmploiTempsItem) => void;
  addEmploi: () => void;
  openEmploi: () => void;
}) {
  return (
    <div>
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Nouvelle séance</h2>
          <button onClick={openEmploi} className="text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium">Emploi du temps</button>
        </div>
        <Input label="Titre" value={newSeance.titre} onChange={v => setNewSeance({ ...newSeance, titre: v })} placeholder="Ex: Lecture suivie" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Input label="Classe" value={newSeance.classe} onChange={v => setNewSeance({ ...newSeance, classe: v })} />
          <Input label="Matière" value={newSeance.matiere} onChange={v => setNewSeance({ ...newSeance, matiere: v })} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Input label="Date" type="date" value={newSeance.date} onChange={v => setNewSeance({ ...newSeance, date: v })} />
          <Input label="Heure" type="time" value={newSeance.heure} onChange={v => setNewSeance({ ...newSeance, heure: v })} />
          <Input label="Durée" value={newSeance.duree} onChange={v => setNewSeance({ ...newSeance, duree: v })} />
        </div>
        <Area label="Note" value={newSeance.note} onChange={v => setNewSeance({ ...newSeance, note: v })} rows={2} />
        <button onClick={addSeance} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold">Planifier</button>
      </div>

      <div className="space-y-2">
        {planning.length === 0 ? <Empty text="Aucune séance planifiée" /> : planning.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-800">{s.titre || s.matiere}</p>
                <p className="text-gray-500 text-xs">{s.date} à {s.heure} • {s.classe} • {s.duree}</p>
                {s.note && <p className="text-gray-600 text-sm mt-2">{s.note}</p>}
              </div>
              <button onClick={() => setPlanning(planning.filter(x => x.id !== s.id))} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
            </div>
            <button onClick={() => setPlanning(planning.map(x => x.id === s.id ? { ...x, done: !x.done } : x))} className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${s.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {s.done ? <><CheckCircle2 className="w-4 h-4 inline mr-1" /> Séance faite</> : 'Marquer comme faite'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmploiView({ emploi, setEmploi, newEmploi, setNewEmploi, addEmploi }: {
  emploi: EmploiTempsItem[];
  setEmploi: (e: EmploiTempsItem[]) => void;
  newEmploi: EmploiTempsItem;
  setNewEmploi: (e: EmploiTempsItem) => void;
  addEmploi: () => void;
}) {
  return (
    <div>
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-bold text-gray-800 mb-3">Ajouter un créneau</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
            <select value={newEmploi.jour} onChange={e => setNewEmploi({ ...newEmploi, jour: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg">
              {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <Input label="Heure" type="time" value={newEmploi.heure} onChange={v => setNewEmploi({ ...newEmploi, heure: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Input label="Classe" value={newEmploi.classe} onChange={v => setNewEmploi({ ...newEmploi, classe: v })} />
          <Input label="Matière" value={newEmploi.matiere} onChange={v => setNewEmploi({ ...newEmploi, matiere: v })} />
        </div>
        <button onClick={addEmploi} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold">Ajouter</button>
      </div>
      {JOURS.map(jour => {
        const items = emploi.filter(e => e.jour === jour).sort((a, b) => a.heure.localeCompare(b.heure));
        return (
          <div key={jour} className="mb-3">
            <h3 className="font-bold text-gray-800 mb-2">{jour}</h3>
            {items.length === 0 ? <p className="text-gray-400 text-sm mb-2">Aucun cours</p> : items.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow p-3 mb-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{item.heure} • {item.matiere}</p>
                  <p className="text-gray-500 text-xs">{item.classe}</p>
                </div>
                <button onClick={() => setEmploi(emploi.filter(e => e.id !== item.id))} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RechercheView({ query, setQuery, fiches, onEdit }: {
  query: string;
  setQuery: (q: string) => void;
  fiches: FichePedagogique[];
  onEdit: (f: FichePedagogique) => void;
}) {
  return (
    <div>
      <div className="relative mb-4">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une fiche..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg" />
      </div>
      <div className="space-y-2">
        {fiches.length === 0 ? <Empty text="Aucune fiche trouvée" /> : fiches.map(f => (
          <button key={f.id} onClick={() => onEdit(f)} className="w-full bg-white rounded-xl shadow p-4 text-left">
            <FicheCard fiche={f} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}