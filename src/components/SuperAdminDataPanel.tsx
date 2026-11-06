/**
 * ADMINISTRATION UNIVERSELLE DES DONNÉES (v39) — Super Administrateur seul.
 *
 * Permet de consulter et de MODIFIER n'importe quelle information enregistrée
 * par l'application, depuis l'espace d'administration :
 *   - annonces défilantes (création/suppression/activation) ;
 *   - total officiel des participants au concours ;
 *   - édition directe de n'importe quelle donnée stockée (éditeur avancé).
 *
 * ⚠️ L'éditeur avancé est un outil puissant : une donnée mal modifiée peut
 * rendre une partie de l'application inutilisable. Chaque enregistrement est
 * donc précédé d'une validation du format et d'une SAUVEGARDE automatique
 * restaurable en un clic.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Megaphone, Plus, Trash2, Eye, EyeOff, Database, Save, RotateCcw,
  AlertTriangle, Trophy, Search,
} from 'lucide-react';
import {
  Announcement, AnnouncementLevel, LEVEL_LABELS, addAnnouncement,
  loadAnnouncements, removeAnnouncement, toggleAnnouncement,
} from '../utils/announcements';
import { nextWeekId, weekId, publishOfficialCount, officialCount, localCount } from '../utils/quizContest';

/** Clés qu'il serait dangereux d'éditer à l'aveugle : on prévient l'utilisateur. */
const CLES_SENSIBLES = [
  'msp_activation', 'msp_admin_team', 'msp_generated_admin_passwords',
  'msp_generated_codes', 'msp_vault_mirror', 'msp_admin_dashboard_session',
];

const BACKUP_PREFIX = 'msp_backup_before_edit::';

function libelleCle(k: string): string {
  const noms: Record<string, string> = {
    msp_profile: 'Profil de l’enseignant',
    msp_activation: 'Activation / abonnement',
    msp_announcements: 'Messages défilants',
    msp_library_books: 'Livres de la bibliothèque',
    msp_marketplace_courses: 'Cours de la plateforme',
    msp_content_unlocks: 'Accès payants débloqués',
    msp_payment_contact: 'Coordonnées de paiement',
    msp_payment_requests: 'Demandes de paiement',
    msp_timetable: 'Emploi du temps',
    msp_logbook: 'Cahier de textes',
    msp_tasks: 'Mémos et tâches',
    msp_exam_bank: 'Banque de sujets',
    msp_seating_plans: 'Plans de classe',
    msp_alarms: 'Alarmes',
    msp_app_preferences: 'Préférences d’affichage',
    msp_quiz_contest: 'Inscriptions au concours',
    msp_quiz_contest_official: 'Totaux officiels du concours',
    msp_admin_team: 'Équipe de gouvernance',
    msp_kids_quiz_progress: 'Progression du quiz',
  };
  return noms[k] || k;
}

export default function SuperAdminDataPanel() {
  const [onglet, setOnglet] = useState<'annonces' | 'concours' | 'donnees'>('annonces');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {([['annonces', 'Messages défilants'], ['concours', 'Concours du quiz'], ['donnees', 'Toutes les données']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setOnglet(k)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${onglet === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {onglet === 'annonces' && <AnnoncesTab />}
      {onglet === 'concours' && <ConcoursTab />}
      {onglet === 'donnees' && <DonneesTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet 1 — Messages défilants                                       */
/* ------------------------------------------------------------------ */
function AnnoncesTab() {
  const [list, setList] = useState<Announcement[]>([]);
  const [texte, setTexte] = useState('');
  const [niveau, setNiveau] = useState<AnnouncementLevel>('info');
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');

  const refresh = () => setList(loadAnnouncements());
  useEffect(refresh, []);

  function notifier() {
    window.dispatchEvent(new Event('msp-announcements-changed'));
  }

  function ajouter() {
    if (!texte.trim()) return;
    addAnnouncement(
      texte.trim(),
      niveau,
      debut ? new Date(debut).getTime() : 0,
      fin ? new Date(fin).getTime() : 0,
    );
    setTexte(''); setDebut(''); setFin('');
    refresh(); notifier();
  }

  return (
    <section className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-black text-gray-900 flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-emerald-600" /> Messages défilants
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Ces messages défilent en haut de l’application chez tous les utilisateurs de cet appareil.
      </p>

      <div className="mt-3 space-y-2">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={2}
          placeholder="Ex. : Les compositions du 1er trimestre débutent le lundi 12 janvier."
          className="w-full p-3 border rounded-lg"
          data-testid="annonce-texte"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={niveau} onChange={(e) => setNiveau(e.target.value as AnnouncementLevel)} className="p-3 border rounded-lg">
            {(Object.keys(LEVEL_LABELS) as AnnouncementLevel[]).map((l) => (
              <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
            ))}
          </select>
          <label className="text-xs text-gray-600">
            Début (facultatif)
            <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} className="w-full p-2 border rounded-lg" />
          </label>
          <label className="text-xs text-gray-600">
            Fin (facultatif)
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className="w-full p-2 border rounded-lg" />
          </label>
        </div>
        <button onClick={ajouter} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold" data-testid="annonce-ajouter">
          <Plus className="w-4 h-4 inline mr-1" /> Diffuser ce message
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {list.length === 0 && <p className="text-sm text-gray-500">Aucun message enregistré.</p>}
        {list.map((a) => (
          <div key={a.id} className="border rounded-xl p-3 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${a.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{a.text}</p>
              <p className="text-xs text-gray-500 mt-1">{LEVEL_LABELS[a.level]}</p>
            </div>
            <button onClick={() => { toggleAnnouncement(a.id); refresh(); notifier(); }} className="p-2 text-gray-600" title={a.enabled ? 'Désactiver' : 'Activer'}>
              {a.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={() => { removeAnnouncement(a.id); refresh(); notifier(); }} className="p-2 text-red-600" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet 2 — Total officiel des participants                          */
/* ------------------------------------------------------------------ */
function ConcoursTab() {
  const semaines = useMemo(() => [weekId(new Date()), nextWeekId(new Date())], []);
  const [semaine, setSemaine] = useState(semaines[1]);
  const [nombre, setNombre] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);

  const actuel = useMemo(() => officialCount(semaine), [semaine, tick]);
  const local = useMemo(() => localCount(semaine), [semaine, tick]);

  function publier() {
    const n = parseInt(nombre, 10);
    if (!(n >= 0)) { setMsg('Indiquez un nombre valide.'); return; }
    publishOfficialCount(semaine, n, note.trim());
    setMsg(`Total officiel publié : ${n} participant(s) pour ${semaine}.`);
    setTick((t) => t + 1);
  }

  return (
    <section className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-black text-gray-900 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" /> Participants au concours
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        L’application fonctionne hors ligne : elle ne peut pas additionner seule les inscrits de
        tous les téléphones. Centralisez les inscriptions reçues, puis publiez ici le
        <strong> total officiel</strong> qui s’affichera chez les participants.
      </p>

      <div className="mt-3 grid gap-2">
        <select value={semaine} onChange={(e) => setSemaine(e.target.value)} className="p-3 border rounded-lg">
          {semaines.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <p className="text-sm text-gray-600">
          Inscriptions connues sur cet appareil : <strong>{local}</strong>
          {actuel && <> — total officiel actuel : <strong>{actuel.count}</strong></>}
        </p>
        <input
          type="number"
          min={0}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre officiel de participants"
          className="p-3 border rounded-lg"
          data-testid="officiel-nombre"
        />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note affichée (facultatif)" className="p-3 border rounded-lg" />
        <button onClick={publier} className="bg-amber-500 text-white py-3 rounded-xl font-bold" data-testid="officiel-publier">
          Publier le total officiel
        </button>
        {msg && <p className="text-sm font-semibold text-emerald-700" role="status">{msg}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet 3 — Éditeur universel des données                            */
/* ------------------------------------------------------------------ */
function DonneesTab() {
  const [cles, setCles] = useState<string[]>([]);
  const [filtre, setFiltre] = useState('');
  const [cle, setCle] = useState('');
  const [valeur, setValeur] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function lister() {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !k.startsWith(BACKUP_PREFIX)) out.push(k);
    }
    setCles(out.sort());
  }
  useEffect(lister, []);

  function ouvrir(k: string) {
    setCle(k); setMsg(''); setErr('');
    const brut = localStorage.getItem(k) || '';
    // On présente le JSON indenté quand c'en est, sinon le texte brut.
    try { setValeur(JSON.stringify(JSON.parse(brut), null, 2)); }
    catch { setValeur(brut); }
  }

  function enregistrer() {
    if (!cle) return;
    const ancien = localStorage.getItem(cle);
    let aEcrire = valeur;
    // Si l'ancienne valeur était du JSON, la nouvelle doit l'être aussi.
    let ancienEstJson = false;
    try { JSON.parse(ancien || ''); ancienEstJson = true; } catch { ancienEstJson = false; }
    if (ancienEstJson) {
      try { aEcrire = JSON.stringify(JSON.parse(valeur)); }
      catch {
        setErr('Le format est invalide : cette donnée doit rester du JSON correct. Vérifiez les virgules, guillemets et accolades.');
        return;
      }
    }
    try {
      // Sauvegarde automatique avant toute écriture.
      if (ancien !== null) localStorage.setItem(BACKUP_PREFIX + cle, ancien);
      localStorage.setItem(cle, aEcrire);
      setErr(''); setMsg('Modification enregistrée. Une sauvegarde de l’ancienne valeur a été conservée.');
      lister();
      window.dispatchEvent(new Event('msp-announcements-changed'));
    } catch {
      setErr('Enregistrement impossible : la mémoire du navigateur est saturée.');
    }
  }

  function restaurer() {
    const sauv = localStorage.getItem(BACKUP_PREFIX + cle);
    if (sauv === null) { setErr('Aucune sauvegarde disponible pour cette donnée.'); return; }
    localStorage.setItem(cle, sauv);
    ouvrir(cle);
    setMsg('Valeur précédente restaurée.');
  }

  function supprimer() {
    if (!cle) return;
    const ancien = localStorage.getItem(cle);
    if (ancien !== null) localStorage.setItem(BACKUP_PREFIX + cle, ancien);
    localStorage.removeItem(cle);
    setCle(''); setValeur(''); setMsg('Donnée supprimée (une sauvegarde a été conservée).');
    lister();
  }

  const visibles = cles.filter((k) => k.toLowerCase().includes(filtre.toLowerCase()) || libelleCle(k).toLowerCase().includes(filtre.toLowerCase()));

  return (
    <section className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-black text-gray-900 flex items-center gap-2">
        <Database className="w-5 h-5 text-slate-700" /> Modifier n’importe quelle information
      </h3>

      <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          Outil réservé au Super Administrateur. Une donnée mal modifiée peut perturber
          l’application. Chaque enregistrement crée une sauvegarde restaurable par le bouton
          « Restaurer la valeur précédente ».
        </span>
      </div>

      <div className="relative mt-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher une information…" className="w-full pl-9 pr-3 py-2.5 border rounded-lg" />
      </div>

      <div className="mt-3 grid md:grid-cols-3 gap-3">
        <div className="md:col-span-1 max-h-72 overflow-auto border rounded-xl divide-y">
          {visibles.map((k) => (
            <button
              key={k}
              onClick={() => ouvrir(k)}
              className={`w-full text-left p-2.5 text-sm ${cle === k ? 'bg-emerald-50 font-bold' : 'hover:bg-gray-50'}`}
            >
              <span className="block truncate">{libelleCle(k)}</span>
              <span className="block text-[11px] text-gray-400 truncate">{k}</span>
            </button>
          ))}
          {visibles.length === 0 && <p className="p-3 text-sm text-gray-500">Aucune donnée.</p>}
        </div>

        <div className="md:col-span-2">
          {cle ? (
            <>
              <p className="text-sm font-bold text-gray-800">{libelleCle(cle)}</p>
              {CLES_SENSIBLES.includes(cle) && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  Donnée sensible (accès, abonnement, gouvernance) : modifiez avec précaution.
                </p>
              )}
              <textarea
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                rows={12}
                spellCheck={false}
                className="mt-2 w-full p-3 border rounded-lg font-mono text-xs"
                data-testid="editeur-valeur"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={enregistrer} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold" data-testid="editeur-enregistrer">
                  <Save className="w-4 h-4 inline mr-1" /> Enregistrer
                </button>
                <button onClick={restaurer} className="bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg font-semibold">
                  <RotateCcw className="w-4 h-4 inline mr-1" /> Restaurer la valeur précédente
                </button>
                <button onClick={supprimer} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold">
                  <Trash2 className="w-4 h-4 inline mr-1" /> Supprimer
                </button>
              </div>
              {err && <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{err}</p>}
              {msg && <p className="mt-2 text-sm font-semibold text-emerald-700" role="status">{msg}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-500">Choisissez une information à gauche pour la modifier.</p>
          )}
        </div>
      </div>
    </section>
  );
}
