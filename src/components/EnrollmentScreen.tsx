import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, Download, FileSpreadsheet, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import {
  ENROLLMENT_LEVELS,
  EnrollmentFieldConfig,
  EnrollmentRecord,
  generateEnrollmentExcel,
  loadEnrollmentExtraFields,
  loadEnrollmentRecords,
  saveEnrollmentExtraFields,
  saveEnrollmentRecords,
} from '../utils/enrollment';
import { downloadExcel } from '../utils/excelGenerator';
import { hasAdminRole } from '../utils/adminSession';

function emptyRecord(): EnrollmentRecord {
  return {
    id: '',
    classLevel: 'CM2',
    nom: '',
    prenoms: '',
    sexe: '',
    dateNaissance: '',
    lieuNaissance: '',
    telephoneParents: '',
    nationalite: 'Béninoise',
    npi: '',
    extraFields: {},
    createdAt: Date.now(),
  };
}

export default function EnrollmentScreen() {
  const goBack = useSmartBack();
  const [records, setRecords] = useState<EnrollmentRecord[]>([]);
  const [form, setForm] = useState<EnrollmentRecord>(emptyRecord());
  const [showForm, setShowForm] = useState(false);
  const [filterLevel, setFilterLevel] = useState('CM2');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const adminUnlocked = hasAdminRole('Super Administrateur', 'Responsable Ressources');
  const [extraFields, setExtraFields] = useState<EnrollmentFieldConfig[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<EnrollmentFieldConfig['type']>('text');

  useEffect(() => {
    setRecords(loadEnrollmentRecords());
    setExtraFields(loadEnrollmentExtraFields());
  }, []);

  const filtered = useMemo(() => records
    .filter(r => filterLevel === 'Toutes' || r.classLevel === filterLevel)
    .filter(r => `${r.nom} ${r.prenoms} ${r.npi}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nom.localeCompare(b.nom)), [records, filterLevel, search]);

  function persist(next: EnrollmentRecord[]) {
    setRecords(next);
    saveEnrollmentRecords(next);
  }

  function saveRecord() {
    if (!form.nom.trim() || !form.prenoms.trim()) {
      alert('Renseignez au moins le nom et les prénoms.');
      return;
    }
    const record = { ...form, id: form.id || `enr-${Date.now()}`, createdAt: form.createdAt || Date.now() };
    persist(form.id ? records.map(r => r.id === form.id ? record : r) : [record, ...records]);
    setForm(emptyRecord());
    setShowForm(false);
  }

  function editRecord(record: EnrollmentRecord) {
    setForm(record);
    setShowForm(true);
  }

  function deleteRecord(id: string) {
    if (!confirm('Supprimer cet enrôlement ?')) return;
    persist(records.filter(r => r.id !== id));
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const blob = await generateEnrollmentExcel(records, extraFields);
      await downloadExcel(blob, `enrolement-eleves-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la génération du fichier Excel.');
    } finally {
      setExporting(false);
    }
  }

  const countByLevel = ENROLLMENT_LEVELS.map(level => ({ level, count: records.filter(r => r.classLevel === level).length }));

  function persistExtraFields(fields: EnrollmentFieldConfig[]) {
    setExtraFields(fields);
    saveEnrollmentExtraFields(fields);
  }

  function addExtraField() {
    if (!newFieldLabel.trim()) return alert('Saisissez le libellé du champ.');
    const field: EnrollmentFieldConfig = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
    };
    persistExtraFields([...extraFields, field]);
    setNewFieldLabel('');
    setNewFieldType('text');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg">Enrôlement intelligent des élèves</h1>
            <p className="text-emerald-100 text-sm">Saisie simplifiée puis export Excel</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-5xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-3 rounded-xl"><UserPlus className="w-8 h-8 text-emerald-600" /></div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900">Renseignez les informations sans ouvrir Excel</h2>
              <p className="text-gray-500 text-sm mt-1">L’application génère ensuite un fichier Excel avec les onglets Maternelle 1, Maternelle 2, CI, CP, CE1, CE2, CM1 et CM2.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => { setForm(emptyRecord()); setShowForm(true); }} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Nouvel élève</button>
            <button onClick={exportExcel} disabled={exporting || records.length === 0} className="bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Download className="w-5 h-5" /> {exporting ? 'Export...' : 'Exporter Excel'}</button>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Formulaire d’enrôlement</h2>
              <p className="text-gray-500 text-sm">Champs du modèle : Nom, Prénoms, Date de naissance, Lieu de naissance, Téléphone de parents, Nationalité, NPI.</p>
              {adminUnlocked && <p className="mt-1 text-xs font-semibold text-emerald-700">Gestion des champs personnalisés autorisée pour votre rôle.</p>}
            </div>
          </div>
          {extraFields.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {extraFields.map(field => (
                <span key={field.id} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-semibold">
                  {field.label}
                  {adminUnlocked && <button onClick={() => persistExtraFields(extraFields.filter(f => f.id !== field.id))} className="ml-2 text-red-500">×</button>}
                </span>
              ))}
            </div>
          )}
          {adminUnlocked && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-2">
              <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="Ajouter un nouveau champ" className="p-3 border rounded-lg text-sm" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as EnrollmentFieldConfig['type'])} className="p-3 border rounded-lg text-sm">
                <option value="text">Texte</option>
                <option value="date">Date</option>
                <option value="tel">Téléphone</option>
                <option value="number">Nombre</option>
              </select>
              <button onClick={addExtraField} className="bg-emerald-600 text-white px-4 rounded-lg font-semibold">Ajouter</button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-emerald-600 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{records.length}</p>
            <p className="text-xs text-emerald-100">Enrôlés</p>
          </div>
          <div className="bg-amber-400 text-amber-950 rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{records.filter(r => (r.sexe || '').toUpperCase() === 'F').length}</p>
            <p className="text-xs">Filles</p>
          </div>
          <div className="bg-sky-500 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{records.filter(r => (r.sexe || '').toUpperCase() === 'M').length}</p>
            <p className="text-xs">Garçons</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {countByLevel.map(item => <div key={item.level} className="bg-white rounded-xl shadow p-3 text-center"><p className="font-bold text-emerald-700">{item.count}</p><p className="text-xs text-gray-500">{item.level}</p></div>)}
        </div>

        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="grid gap-2 md:grid-cols-[180px_1fr]">
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="p-3 border rounded-lg">
              <option>Toutes</option>
              {ENROLLMENT_LEVELS.map(level => <option key={level}>{level}</option>)}
            </select>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom, prénoms ou NPI..." className="w-full pl-10 pr-4 py-3 border rounded-lg" />
            </div>
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Aucun élève enrôlé.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(record => (
              <div key={record.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                <FileSpreadsheet className="w-9 h-9 text-emerald-600" />
                <button onClick={() => editRecord(record)} className="text-left flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{record.nom.toUpperCase()} {record.prenoms}</p>
                  <p className="text-xs text-gray-500">{record.classLevel} • Sexe : {record.sexe || '-'} • Né(e) le {record.dateNaissance || '-'} à {record.lieuNaissance || '-'} • NPI : {record.npi || '-'}</p>
                </button>
                <button onClick={() => deleteRecord(record.id)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto">
            <h2 className="font-bold text-lg text-gray-900 mb-3">{form.id ? 'Modifier enrôlement' : 'Nouvel enrôlement'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select value={form.classLevel} onChange={e => setForm({ ...form, classLevel: e.target.value })} className="w-full p-3 border rounded-lg">
                  {ENROLLMENT_LEVELS.map(level => <option key={level}>{level}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v.toUpperCase() })} />
                <Input label="Prénoms" value={form.prenoms} onChange={v => setForm({ ...form, prenoms: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                <select value={form.sexe || ''} onChange={e => setForm({ ...form, sexe: e.target.value })} className="w-full p-3 border rounded-lg text-sm">
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Date de naissance" type="date" value={form.dateNaissance} onChange={v => setForm({ ...form, dateNaissance: v })} />
                <Input label="Lieu de naissance" value={form.lieuNaissance} onChange={v => setForm({ ...form, lieuNaissance: v })} />
              </div>
              <Input label="Téléphone de parents" value={form.telephoneParents} onChange={v => setForm({ ...form, telephoneParents: v })} placeholder="Ex: +229..." />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Nationalité" value={form.nationalite} onChange={v => setForm({ ...form, nationalite: v })} />
                <Input label="NPI" value={form.npi} onChange={v => setForm({ ...form, npi: v })} />
              </div>
              {extraFields.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="font-semibold text-gray-800 text-sm">Informations supplémentaires</p>
                  {extraFields.map(field => (
                    <Input
                      key={field.id}
                      label={field.label}
                      type={field.type}
                      value={form.extraFields?.[field.id] || ''}
                      onChange={v => setForm({ ...form, extraFields: { ...(form.extraFields || {}), [field.id]: v } })}
                    />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold">Annuler</button>
                <button onClick={saveRecord} className="bg-emerald-600 text-white py-3 rounded-lg font-semibold">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border rounded-lg text-sm" />
    </div>
  );
}
