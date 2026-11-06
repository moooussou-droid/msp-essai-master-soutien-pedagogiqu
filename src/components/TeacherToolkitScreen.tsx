import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  Calculator, CalendarDays, ChevronLeft, ClipboardCopy, Package, Plus,
  Shuffle, Trash2, Users, Sigma,
} from 'lucide-react';
import { ClassData, getAllClasses, sortStudents } from '../utils/database';
import { getMention } from '../utils/bulletin';
import { AverageLine, computeWeightedAverage, emptyAverageLine } from '../utils/average';
import { copyText } from '../utils/clipboard';

type ToolTab = 'groupes' | 'notes' | 'appreciations' | 'materiel' | 'age' | 'moyenne';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  status: 'ok' | 'faible' | 'manquant';
  note?: string;
}

const INVENTORY_KEY = 'msp_teacher_toolkit_inventory';

const APPRECIATIONS = {
  excellent: [
    'Excellent travail. Élève sérieux(se), régulier(ère) et très impliqué(e).',
    'Très bons résultats. Continue dans cette dynamique.',
    'Félicitations pour la qualité du travail et la participation active.',
  ],
  satisfaisant: [
    'Travail satisfaisant. Les acquis sont globalement maîtrisés.',
    'Bon comportement face aux apprentissages. Peut encore progresser avec plus de régularité.',
    'Résultats encourageants. Poursuis tes efforts.',
  ],
  fragile: [
    'Les acquis restent fragiles. Un accompagnement régulier est recommandé.',
    'Doit renforcer les bases et participer davantage aux activités.',
    'Des efforts sont nécessaires pour consolider les apprentissages.',
  ],
  comportement: [
    'Élève discipliné(e), respectueux(se) et attentif(ve).',
    'Doit améliorer l’attention et la participation en classe.',
    'Comportement à suivre. Un dialogue avec les parents est souhaitable.',
  ],
};

function loadInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid data
  }
  return [];
}

function saveInventory(items: InventoryItem[]) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

function calculateAge(date: string) {
  if (!date) return null;
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

export default function TeacherToolkitScreen() {
  const goBack = useSmartBack();
  const [tab, setTab] = useState<ToolTab>('groupes');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [groupSize, setGroupSize] = useState(5);
  const [groups, setGroups] = useState<string[][]>([]);

  const [rawNote, setRawNote] = useState('');
  const [rawMax, setRawMax] = useState('');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemStatus, setItemStatus] = useState<InventoryItem['status']>('ok');

  const [birthDate, setBirthDate] = useState('');

  // Calculatrice de moyenne pondérée
  const [avgLines, setAvgLines] = useState<AverageLine[]>([
    emptyAverageLine(),
    emptyAverageLine(),
  ]);

  useEffect(() => {
    getAllClasses().then(data => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setClasses(sorted);
      if (sorted[0]) setClassId(sorted[0].id);
    });
    setInventory(loadInventory());
  }, []);

  const selectedClass = classes.find(c => c.id === classId);
  const convertedNote = useMemo(() => {
    const note = parseFloat(rawNote.replace(',', '.'));
    const max = parseFloat(rawMax.replace(',', '.'));
    if (Number.isNaN(note) || Number.isNaN(max) || max <= 0) return null;
    return (note / max) * 20;
  }, [rawNote, rawMax]);

  const age = calculateAge(birthDate);

  // Moyenne pondérée : chaque ligne = note / barème (/20) × coef
  const averageResult = useMemo(() => computeWeightedAverage(avgLines), [avgLines]);

  function generateGroups() {
    if (!selectedClass) return;
    const names = sortStudents(selectedClass.students).map(s => `${s.nom.toUpperCase()} ${s.prenoms}`);
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const out: string[][] = [];
    for (let i = 0; i < shuffled.length; i += groupSize) out.push(shuffled.slice(i, i + groupSize));
    setGroups(out);
  }

  async function copyTextToClipboard(text: string) {
    const okCopy = await copyText(text);
    alert(okCopy ? 'Texte copié.' : 'Impossible de copier automatiquement : sélectionnez le texte manuellement.');
  }

  function persistInventory(next: InventoryItem[]) {
    setInventory(next);
    saveInventory(next);
  }

  function addInventoryItem() {
    if (!itemName.trim()) return alert('Saisissez le nom du matériel.');
    persistInventory([
      { id: `inv-${Date.now()}`, name: itemName.trim(), quantity: Number(itemQty) || 1, status: itemStatus },
      ...inventory,
    ]);
    setItemName('');
    setItemQty('1');
    setItemStatus('ok');
  }

  const tabs: { id: ToolTab; label: string; icon: typeof Users }[] = [
    { id: 'groupes', label: 'Groupes', icon: Shuffle },
    { id: 'notes', label: 'Notes', icon: Calculator },
    { id: 'moyenne', label: 'Moyenne', icon: Sigma },
    { id: 'appreciations', label: 'Appréciations', icon: ClipboardCopy },
    { id: 'materiel', label: 'Matériel', icon: Package },
    { id: 'age', label: 'Âge', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg">Boîte à outils enseignant</h1>
            <p className="text-emerald-100 text-sm">Solutions rapides pour la classe</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {tabs.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-xl p-2 text-[11px] font-semibold flex flex-col items-center gap-1 ${tab === item.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'groupes' && (
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-2">Générateur de groupes</h2>
            <p className="text-gray-500 text-sm mb-3">Formez rapidement des groupes de travail équilibrés pour les activités de classe.</p>
            <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full p-3 border rounded-lg mb-2">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d’élèves par groupe</label>
            <input type="number" value={groupSize} min={2} onChange={e => setGroupSize(Number(e.target.value) || 2)} className="w-full p-3 border rounded-lg mb-3" />
            <button onClick={generateGroups} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Shuffle className="w-5 h-5" /> Générer les groupes</button>
            <div className="space-y-2 mt-4">
              {groups.map((group, index) => <div key={index} className="bg-emerald-50 rounded-lg p-3"><p className="font-bold text-emerald-800">Groupe {index + 1}</p><p className="text-sm text-gray-700">{group.join(', ')}</p></div>)}
            </div>
          </section>
        )}

        {tab === 'notes' && (
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-2">Convertisseur de notes</h2>
            <p className="text-gray-500 text-sm mb-3">Convertissez rapidement une note de n’importe quel barème vers /20.</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={rawNote} onChange={e => setRawNote(e.target.value)} placeholder="Note obtenue" className="p-3 border rounded-lg" />
              <input value={rawMax} onChange={e => setRawMax(e.target.value)} placeholder="Barème total" className="p-3 border rounded-lg" />
            </div>
            <div className="mt-4 bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm">Note convertie</p>
              <p className="text-3xl font-black text-blue-700">{convertedNote === null ? '-' : convertedNote.toFixed(2)} /20</p>
            </div>
          </section>
        )}

        {tab === 'moyenne' && (
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><Sigma className="w-5 h-5 text-emerald-600" /> Calculatrice de moyenne</h2>
            <p className="text-gray-500 text-sm mb-3">Saisissez vos notes (n'importe quel barème) et leurs coefficients : la moyenne /20 et la mention sont calculées automatiquement.</p>
            <div className="space-y-2">
              {avgLines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_64px_56px_36px] gap-1.5 items-center">
                  <input
                    value={line.matiere}
                    onChange={e => setAvgLines(avgLines.map((l, j) => j === i ? { ...l, matiere: e.target.value } : l))}
                    placeholder={`Matière ${i + 1}`}
                    className="p-2.5 border rounded-lg text-sm min-w-0"
                  />
                  <input
                    value={line.note}
                    onChange={e => setAvgLines(avgLines.map((l, j) => j === i ? { ...l, note: e.target.value } : l))}
                    placeholder="Note"
                    inputMode="decimal"
                    className="p-2.5 border rounded-lg text-sm text-center"
                  />
                  <input
                    value={line.bareme}
                    onChange={e => setAvgLines(avgLines.map((l, j) => j === i ? { ...l, bareme: e.target.value } : l))}
                    placeholder="Barème"
                    inputMode="decimal"
                    className="p-2.5 border rounded-lg text-sm text-center"
                  />
                  <input
                    value={line.coef}
                    onChange={e => setAvgLines(avgLines.map((l, j) => j === i ? { ...l, coef: e.target.value } : l))}
                    placeholder="Coef"
                    inputMode="decimal"
                    className="p-2.5 border rounded-lg text-sm text-center"
                  />
                  <button
                    onClick={() => setAvgLines(avgLines.filter((_, j) => j !== i))}
                    disabled={avgLines.length <= 1}
                    className="text-red-500 p-2 disabled:opacity-30"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_64px_64px_56px_36px] gap-1.5">
                <button
                  onClick={() => setAvgLines([...avgLines, emptyAverageLine()])}
                  className="col-span-4 bg-gray-50 border border-dashed border-gray-300 py-2 rounded-lg text-sm text-gray-500 font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" /> Ajouter une matière
                </button>
              </div>
            </div>
            <div className="mt-4 bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
              <p className="text-gray-500 text-xs">Moyenne pondérée ({averageResult.count} matière{averageResult.count > 1 ? 's' : ''})</p>
              <p className="text-3xl font-black text-emerald-700">
                {averageResult.moyenne !== null ? averageResult.moyenne.toFixed(2) : '-'} <span className="text-base">/20</span>
              </p>
              {averageResult.moyenne !== null && (
                <p className="text-sm font-semibold text-emerald-800 mt-1">Mention : {getMention(averageResult.moyenne)}</p>
              )}
            </div>
          </section>
        )}

        {tab === 'appreciations' && (
          <section className="space-y-3">
            {Object.entries(APPRECIATIONS).map(([category, texts]) => (
              <div key={category} className="bg-white rounded-2xl shadow p-4">
                <h2 className="font-bold text-gray-800 capitalize mb-2">{category}</h2>
                <div className="space-y-2">
                  {texts.map(text => <button key={text} onClick={() => copyTextToClipboard(text)} className="w-full text-left bg-gray-50 rounded-lg p-3 text-sm text-gray-700"><ClipboardCopy className="w-4 h-4 inline mr-2 text-emerald-600" />{text}</button>)}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'materiel' && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-2">Suivi du matériel et fournitures</h2>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Matériel" className="p-3 border rounded-lg" />
                <input type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} placeholder="Qté" className="p-3 border rounded-lg" />
              </div>
              <select value={itemStatus} onChange={e => setItemStatus(e.target.value as InventoryItem['status'])} className="w-full p-3 border rounded-lg mb-3">
                <option value="ok">Disponible</option>
                <option value="faible">Stock faible</option>
                <option value="manquant">Manquant</option>
              </select>
              <button onClick={addInventoryItem} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold"><Plus className="w-5 h-5 inline mr-1" /> Ajouter</button>
            </div>
            {inventory.map(item => <div key={item.id} className="bg-white rounded-xl shadow p-3 flex items-center justify-between"><div><p className="font-semibold text-gray-800">{item.name}</p><p className="text-xs text-gray-500">Qté : {item.quantity} • {item.status}</p></div><button onClick={() => persistInventory(inventory.filter(i => i.id !== item.id))} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button></div>)}
          </section>
        )}

        {tab === 'age' && (
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-2">Calculateur d’âge scolaire</h2>
            <p className="text-gray-500 text-sm mb-3">Calculez l’âge exact d’un élève à partir de sa date de naissance.</p>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-3 border rounded-lg" />
            <div className="mt-4 bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm">Âge</p>
              <p className="text-3xl font-black text-emerald-700">{age ? `${age.years} ans ${age.months} mois` : '-'}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
