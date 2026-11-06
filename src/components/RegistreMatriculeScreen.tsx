/**
 * REGISTRE MATRICULE (v49).
 *
 * Registre d'inscription de l'école : la pièce que réclame l'inspection
 * et qui sert à établir un certificat de scolarité. L'application le
 * mentionnait déjà dans son modèle de rapport d'inspection sans l'offrir.
 *
 * Un élève SORTI n'est jamais effacé : il reste au registre avec sa date
 * et son motif de sortie. C'est la règle d'un registre officiel — on n'y
 * gomme pas une inscription.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Search, FileDown, Printer, UserPlus, X,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  MatriculeEntry, loadMatricules, saveMatricules, nextNumero,
  matriculeStats, searchMatricules, ageAt,
} from '../utils/schoolRegisters';
import { getProfile } from '../utils/userProfile';
import { makePdf } from '../utils/pdfMaker';
import { downloadDocx } from '../utils/docxMaker';

function frDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function blank(numero: number): MatriculeEntry {
  return {
    id: `mat-${Date.now()}`,
    numero,
    matricule: '', nom: '', prenoms: '', sexe: '',
    dateNaissance: '', lieuNaissance: '', parent: '', contact: '',
    dateAdmission: new Date().toISOString().slice(0, 10),
    classeAdmission: '',
  };
}

export default function RegistreMatriculeScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [list, setList] = useState<MatriculeEntry[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MatriculeEntry | null>(null);

  useEffect(() => { setList(loadMatricules()); }, []);

  const stats = useMemo(() => matriculeStats(list), [list]);
  const filtered = useMemo(() => searchMatricules(list, query), [list, query]);

  function persist(next: MatriculeEntry[]) {
    const sorted = [...next].sort((a, b) => a.numero - b.numero);
    setList(sorted);
    saveMatricules(sorted);
  }

  function save() {
    if (!editing) return;
    if (!editing.nom.trim()) { window.alert('Le nom est obligatoire.'); return; }
    const i = list.findIndex((e) => e.id === editing.id);
    const next = [...list];
    if (i >= 0) next[i] = editing; else next.push(editing);
    persist(next);
    setEditing(null);
  }

  function exportPdf() {
    const pdf = makePdf({
      title: 'Registre matricule',
      subtitle: `${stats.present} élève(s) inscrit(s)`,
      establishment: profile.schoolName || 'Mon établissement',
      orientation: 'landscape',
      signature: { preparedBy: profile.teacherName || undefined, role: 'Le Directeur / La Directrice', date: frDate(new Date().toISOString().slice(0, 10)) },
    });
    pdf.table(
      [
        { header: 'N°', width: 0.5, align: 'right' },
        { header: 'Matricule', width: 1.1 },
        { header: 'Nom et prénoms', width: 2.4 },
        { header: 'Sexe', width: 0.6 },
        { header: 'Naissance', width: 1.1 },
        { header: 'Admission', width: 1.1 },
        { header: 'Classe', width: 0.9 },
      ],
      filtered.map((e) => [
        String(e.numero), e.matricule || '—', `${e.nom} ${e.prenoms}`.trim(),
        e.sexe || '—', frDate(e.dateNaissance), frDate(e.dateAdmission), e.classeAdmission || '—',
      ]),
    );
    pdf.keyValues([
      ['Total inscrits', String(stats.total)],
      ['Présents', `${stats.present} (${stats.garcons} G / ${stats.filles} F)`],
      ['Sortis', String(stats.sortis)],
    ]);
    pdf.save('registre-matricule.pdf');
  }

  async function exportWord() {
    await downloadDocx([
      { type: 'paragraph', runs: [{ text: 'REGISTRE MATRICULE', bold: true, size: 16 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: profile.schoolName || '', size: 10 }], align: 'center' },
      { type: 'paragraph', runs: [{ text: '' }] },
      {
        type: 'table', headerRow: true,
        rows: [
          ['N°', 'Matricule', 'Nom et prénoms', 'Sexe', 'Naissance', 'Parent', 'Contact', 'Admission', 'Classe'],
          ...filtered.map((e) => [
            String(e.numero), e.matricule, `${e.nom} ${e.prenoms}`.trim(), e.sexe,
            frDate(e.dateNaissance), e.parent, e.contact, frDate(e.dateAdmission), e.classeAdmission,
          ]),
        ],
      },
    ], 'registre-matricule.docx', { landscape: true });
  }

  const field = (label: string, key: keyof MatriculeEntry, type = 'text') => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <input
        type={type}
        data-testid={`champ-${String(key)}`}
        value={String(editing?.[key] ?? '')}
        onChange={(e) => setEditing((p) => (p ? { ...p, [key]: e.target.value } : p))}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Registre matricule</h1>
            <p className="text-white/80 text-sm">Inscriptions officielles de l’école</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        <div className="msp-card p-4" data-testid="stats-matricule">
          <div className="msp-flag-rule mb-3" />
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-xs text-gray-600">Inscrits</p><p className="text-xl font-bold text-gray-800" data-testid="stat-total">{stats.total}</p></div>
            <div><p className="text-xs text-gray-600">Présents</p><p className="text-xl font-bold text-emerald-700" data-testid="stat-presents">{stats.present}</p></div>
            <div><p className="text-xs text-gray-600">Garçons</p><p className="text-xl font-bold text-blue-700">{stats.garcons}</p></div>
            <div><p className="text-xs text-gray-600">Filles</p><p className="text-xl font-bold text-pink-700">{stats.filles}</p></div>
          </div>
          {stats.sortis > 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">{stats.sortis} élève(s) sorti(s), conservé(s) au registre.</p>
          )}
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search" data-testid="champ-recherche" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un matricule"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-3 text-base"
          />
        </div>

        <button
          data-testid="btn-nouvel-eleve"
          onClick={() => setEditing(blank(nextNumero(list)))}
          className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" /> Inscrire un élève
        </button>

        <div className="space-y-2" data-testid="liste-matricules">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Aucune inscription.</p>
          )}
          {filtered.map((e) => {
            const age = ageAt(e.dateNaissance);
            return (
              <div key={e.id} className={`msp-card p-3 flex items-center gap-3 ${e.dateSortie ? 'opacity-60' : ''}`}>
                <span className="w-8 text-center font-bold text-[#f2a900]">{e.numero}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">
                    {e.nom} {e.prenoms} {e.sexe && `(${e.sexe})`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {e.matricule || 'sans matricule'} · {e.classeAdmission || '—'}
                    {age !== null && ` · ${age} ans`}
                    {e.dateSortie && ` · SORTI le ${frDate(e.dateSortie)}`}
                  </p>
                </div>
                <button onClick={() => setEditing(e)} className="text-sm font-semibold text-emerald-700 px-2 py-2">Ouvrir</button>
                <button
                  onClick={() => { if (window.confirm('Retirer définitivement cette ligne du registre ?')) persist(list.filter((x) => x.id !== e.id)); }}
                  className="text-red-500 p-2" aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={exportWord} data-testid="btn-word-matricule" className="bg-[#1b3a6b] text-white py-3 rounded-xl font-semibold text-sm">Word</button>
          <button onClick={exportPdf} data-testid="btn-pdf-matricule" className="bg-red-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </main>

      {/* Fiche d'inscription */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Fiche n° {editing.numero}</h2>
              <button onClick={() => setEditing(null)} className="p-2" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field('Matricule', 'matricule')}
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Sexe</span>
                  <select
                    data-testid="champ-sexe"
                    value={editing.sexe}
                    onChange={(e) => setEditing({ ...editing, sexe: e.target.value as 'M' | 'F' | '' })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-white"
                  >
                    <option value="">—</option>
                    <option value="M">Garçon</option>
                    <option value="F">Fille</option>
                  </select>
                </label>
              </div>
              {field('Nom', 'nom')}
              {field('Prénoms', 'prenoms')}
              <div className="grid grid-cols-2 gap-3">
                {field('Date de naissance', 'dateNaissance', 'date')}
                {field('Lieu de naissance', 'lieuNaissance')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('Père / Mère / Tuteur', 'parent')}
                {field('Contact', 'contact')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('Date d’admission', 'dateAdmission', 'date')}
                {field('Classe d’admission', 'classeAdmission')}
              </div>
              {field('École de provenance', 'provenance')}
              <div className="border-t pt-3">
                <p className="text-xs font-bold text-gray-500 mb-2">SORTIE (à ne remplir qu’au départ de l’élève)</p>
                <div className="grid grid-cols-2 gap-3">
                  {field('Date de sortie', 'dateSortie', 'date')}
                  {field('Motif', 'motifSortie')}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-3 grid grid-cols-2 gap-2">
              <button onClick={() => setEditing(null)} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Annuler</button>
              <button data-testid="btn-enregistrer-matricule" onClick={save} className="bg-[#046a38] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
