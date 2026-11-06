import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  AlertTriangle, BadgeCheck, ChevronLeft, Download, Plus, Search, Trash2, Users,
} from 'lucide-react';
import {
  STAFF_COLUMNS,
  STAFF_ROLES,
  StaffFieldConfig,
  StaffRecord,
  emptyStaffRecord,
  generateStaffExcel,
  loadStaffExtraFields,
  loadStaffRecords,
  saveStaffExtraFields,
  saveStaffRecords,
  staffStats,
  validateStaffRecord,
} from '../utils/staffEnrollment';
import { downloadExcel } from '../utils/excelGenerator';
import { hasAdminRole } from '../utils/adminSession';

/** Champs du modèle officiel affichés dans le formulaire (ordre des captures). */
const FORM_FIELDS: { key: keyof StaffRecord; label: string; type: string; hint?: string; required?: boolean }[] = [
  { key: 'matricule', label: 'Matricule', type: 'text' },
  { key: 'idAnpe', label: 'Id ANPE (AME)', type: 'text', hint: 'Identifiant ANPE / AME' },
  { key: 'nom', label: 'Nom', type: 'text', hint: 'Complet, sans abréviation', required: true },
  { key: 'prenoms', label: 'Prénoms', type: 'text', hint: 'Complets, sans abréviation', required: true },
  { key: 'dateNaissance', label: 'Date de naissance', type: 'date' },
  { key: 'lieuNaissance', label: 'Lieu de naissance', type: 'text' },
  { key: 'nationalite', label: 'Nationalité (PAYS)', type: 'text' },
  { key: 'telephone', label: 'Numéro de téléphone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'ifu', label: 'IFU', type: 'text', hint: '8 à 13 chiffres' },
  { key: 'datePriseService', label: 'Date de première prise de service', type: 'date' },
];

export default function StaffEnrollmentScreen() {
  const goBack = useSmartBack();
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [form, setForm] = useState<StaffRecord>(emptyStaffRecord());
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const adminUnlocked = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const [extraFields, setExtraFields] = useState<StaffFieldConfig[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<StaffFieldConfig['type']>('text');

  useEffect(() => {
    setRecords(loadStaffRecords());
    setExtraFields(loadStaffExtraFields());
  }, []);

  const filtered = useMemo(() => records
    .filter(r => filterRole === 'Toutes' || (r.fonction || 'Autre') === filterRole)
    .filter(r => `${r.nom} ${r.prenoms} ${r.matricule} ${r.ifu}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nom.localeCompare(b.nom)), [records, filterRole, search]);

  const stats = useMemo(() => staffStats(records), [records]);
  const formErrors = useMemo(() => validateStaffRecord(form), [form]);

  function persist(next: StaffRecord[]) {
    setRecords(next);
    saveStaffRecords(next);
  }

  function saveRecord() {
    const errors = validateStaffRecord(form);
    if (errors.length) {
      alert('Merci de corriger :\n\n• ' + errors.join('\n• '));
      return;
    }
    const record: StaffRecord = {
      ...form,
      id: form.id || `stf-${Date.now()}`,
      createdAt: form.createdAt || Date.now(),
    };
    persist(form.id ? records.map(r => (r.id === form.id ? record : r)) : [record, ...records]);
    setForm(emptyStaffRecord());
    setShowForm(false);
  }

  function editRecord(record: StaffRecord) {
    setForm(record);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteRecord(id: string) {
    if (!confirm('Supprimer définitivement cet agent de la liste ?')) return;
    persist(records.filter(r => r.id !== id));
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const blob = await generateStaffExcel(records, extraFields);
      await downloadExcel(blob, `enrolement-personnel-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la génération du fichier Excel.');
    } finally {
      setExporting(false);
    }
  }

  function persistExtraFields(fields: StaffFieldConfig[]) {
    setExtraFields(fields);
    saveStaffExtraFields(fields);
  }

  function addExtraField() {
    if (!newFieldLabel.trim()) return alert('Saisissez le libellé du champ.');
    persistExtraFields([...extraFields, { id: `sfield_${Date.now()}`, label: newFieldLabel.trim(), type: newFieldType }]);
    setNewFieldLabel('');
    setNewFieldType('text');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Enrôlement du personnel</h1>
            <p className="text-indigo-100 text-sm">Modèle officiel : Matricule, Id ANPE, IFU, prise de service…</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-6xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl"><Users className="w-8 h-8 text-indigo-700" /></div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900">Saisissez le personnel sans ouvrir Excel</h2>
              <p className="text-gray-500 text-sm mt-1">
                L’application génère un fichier Excel <strong>identique au modèle</strong> :
                Matricule, Id ANPE (AME), Nom, Prénoms, Sexe (M/F), Date et Lieu de naissance,
                Nationalité (PAYS), Téléphone, Email, IFU, Date de première prise de service.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => { setForm(emptyStaffRecord()); setShowForm(true); }} className="bg-indigo-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Nouvel agent
            </button>
            <button onClick={exportExcel} disabled={exporting || records.length === 0} className="bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <Download className="w-5 h-5" /> {exporting ? 'Export…' : 'Exporter Excel'}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-indigo-700 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{stats.total}</p><p className="text-xs text-indigo-100">Agents</p>
          </div>
          <div className="bg-blue-500 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{stats.hommes}</p><p className="text-xs">Masculin</p>
          </div>
          <div className="bg-pink-500 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{stats.femmes}</p><p className="text-xs">Féminin</p>
          </div>
          <div className={`${stats.incomplets ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'} rounded-xl shadow p-3 text-center`}>
            <p className="text-2xl font-black">{stats.incomplets}</p><p className="text-xs">À compléter</p>
          </div>
        </div>

        {showForm && (
          <section className="bg-white rounded-2xl shadow p-4 mb-4 border-2 border-indigo-200">
            <h2 className="font-bold text-gray-900 mb-3">{form.id ? 'Modifier l’agent' : 'Nouvel agent'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="font-semibold text-gray-700">Fonction</span>
                <select value={form.fonction || 'Enseignant(e)'} onChange={e => setForm({ ...form, fonction: e.target.value })} className="mt-1 w-full p-3 border rounded-lg">
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-semibold text-gray-700">Sexe (M/F) <span className="text-red-500">*</span></span>
                <select value={form.sexe} onChange={e => setForm({ ...form, sexe: e.target.value as StaffRecord['sexe'] })} className="mt-1 w-full p-3 border rounded-lg">
                  <option value="">— Choisir —</option>
                  <option value="M">M (Masculin)</option>
                  <option value="F">F (Féminin)</option>
                </select>
              </label>
              {FORM_FIELDS.map(f => (
                <label key={String(f.key)} className="text-sm">
                  <span className="font-semibold text-gray-700">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
                  </span>
                  {f.hint && <span className="text-gray-400 text-xs block">{f.hint}</span>}
                  <input
                    type={f.type}
                    value={String(form[f.key] ?? '')}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="mt-1 w-full p-3 border rounded-lg"
                  />
                </label>
              ))}
              <label className="text-sm md:col-span-2">
                <span className="font-semibold text-gray-700">Établissement / École</span>
                <input value={form.etablissement || ''} onChange={e => setForm({ ...form, etablissement: e.target.value })} className="mt-1 w-full p-3 border rounded-lg" />
              </label>
              {extraFields.map(field => (
                <label key={field.id} className="text-sm">
                  <span className="font-semibold text-gray-700">{field.label}</span>
                  <input
                    type={field.type}
                    value={form.extraFields?.[field.id] || ''}
                    onChange={e => setForm({ ...form, extraFields: { ...(form.extraFields || {}), [field.id]: e.target.value } })}
                    className="mt-1 w-full p-3 border rounded-lg"
                  />
                </label>
              ))}
            </div>

            {formErrors.length > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> À compléter avant l’enregistrement :</p>
                <ul className="list-disc ml-5 mt-1">{formErrors.map(e => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={saveRecord} className="bg-indigo-700 text-white py-3 rounded-xl font-semibold">Enregistrer</button>
              <button onClick={() => { setShowForm(false); setForm(emptyStaffRecord()); }} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Champs supplémentaires</h2>
              <p className="text-gray-500 text-sm">Le modèle officiel reste intact. Des colonnes propres à l’établissement peuvent être gérées par l’équipe habilitée.</p>
              {adminUnlocked && <p className="mt-1 text-xs font-semibold text-indigo-700">Gestion des champs personnalisés autorisée pour votre rôle.</p>}
            </div>
          </div>
          {extraFields.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {extraFields.map(field => (
                <span key={field.id} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold">
                  {field.label}
                  {adminUnlocked && <button onClick={() => persistExtraFields(extraFields.filter(f => f.id !== field.id))} className="ml-2 text-red-500">×</button>}
                </span>
              ))}
            </div>
          )}
          {adminUnlocked && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-2">
              <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="Ajouter un nouveau champ" className="p-3 border rounded-lg text-sm" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as StaffFieldConfig['type'])} className="p-3 border rounded-lg text-sm">
                <option value="text">Texte</option>
                <option value="date">Date</option>
                <option value="tel">Téléphone</option>
                <option value="email">Email</option>
                <option value="number">Nombre</option>
              </select>
              <button onClick={addExtraField} className="bg-indigo-700 text-white px-4 rounded-lg font-semibold">Ajouter</button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un agent (nom, matricule, IFU)…" className="w-full pl-9 p-3 border rounded-lg text-sm" />
            </div>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="p-3 border rounded-lg text-sm">
              <option value="Toutes">Toutes les fonctions</option>
              {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucun agent enregistré pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-indigo-900">
                  <tr>
                    {STAFF_COLUMNS.slice(0, 6).map(c => <th key={String(c.key)} className="p-2 text-left whitespace-nowrap">{c.label.split(' (')[0]}</th>)}
                    <th className="p-2 text-left">Fonction</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const errs = validateStaffRecord(r);
                    return (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="p-2">{r.matricule || '—'}</td>
                        <td className="p-2">{r.idAnpe || '—'}</td>
                        <td className="p-2 font-semibold">{r.nom.toUpperCase()}</td>
                        <td className="p-2">{r.prenoms}</td>
                        <td className="p-2">{r.sexe || '—'}</td>
                        <td className="p-2">{r.dateNaissance || '—'}</td>
                        <td className="p-2 text-xs">{r.fonction || 'Autre'}</td>
                        <td className="p-2 whitespace-nowrap text-right">
                          {errs.length === 0
                            ? <BadgeCheck className="w-4 h-4 text-emerald-600 inline mr-2" />
                            : <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-2" />}
                          <button onClick={() => editRecord(r)} className="text-indigo-700 font-semibold mr-3">Modifier</button>
                          <button onClick={() => deleteRecord(r.id)} className="text-red-500"><Trash2 className="w-4 h-4 inline" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
