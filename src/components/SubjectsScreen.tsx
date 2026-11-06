import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { ArrowDown, ArrowUp, ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import { ClassData, Subject, getClass, saveClass, generateId, isSecondaire } from '../utils/database';

export default function SubjectsScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      if (data) {
        setClassData(data);
        setSubjects([...data.subjects].sort((a, b) => a.order - b.order));
      }
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  const secondaire = classData ? isSecondaire(classData) : false;

  function handleAddSubject() {
    const newSubject: Subject = secondaire
      ? {
          id: generateId(),
          name: 'Nouvelle matière',
          noteObtenueMax: 20,
          notePerfectionnementMax: 0,
          coefficient: 1,
          order: subjects.length,
        }
      : {
          id: generateId(),
          name: 'Nouvelle matière',
          noteObtenueMax: 18,
          notePerfectionnementMax: 2,
          order: subjects.length,
        };
    setSubjects([...subjects, newSubject]);
  }

  function handleUpdateSubject(id: string, field: keyof Subject, value: any) {
    setSubjects(subjects.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  }

  function handleDeleteSubject(id: string) {
    if (confirm('Supprimer cette matière ?')) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  }

  function moveSubject(index: number, direction: 'up' | 'down') {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= subjects.length) return;
    const next = [...subjects];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSubjects(next.map((s, i) => ({ ...s, order: i })));
  }

  async function handleSave() {
    if (!classData || !id) return;
    
    setSaving(true);
    try {
      const updatedSubjects = subjects.map((s, index) => ({ ...s, order: index }));
      const updatedClass: ClassData = {
        ...classData,
        subjects: updatedSubjects,
      };
      await saveClass(updatedClass);
      alert('Matières enregistrées avec succès !');
      goBack();
    } catch (error) {
      console.error('Error saving subjects:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Matières</h1>
              <p className="text-gray-500 text-sm">{classData.name}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Enregistrer
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        <div className="space-y-3">
          {subjects.map((subject, index) => (
            <div key={subject.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Matière {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSubject(index, 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    title="Monter"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => moveSubject(index, 'down')}
                    disabled={index === subjects.length - 1}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    title="Descendre"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la matière
                  </label>
                  <input
                    type="text"
                    value={subject.name}
                    onChange={(e) => handleUpdateSubject(subject.id, 'name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                {secondaire ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note obtenue (max)
                      </label>
                      <input
                        type="number"
                        value={subject.noteObtenueMax}
                        onChange={(e) => handleUpdateSubject(subject.id, 'noteObtenueMax', parseInt(e.target.value) || 20)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coefficient (×)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        value={subject.coefficient ?? 1}
                        onChange={(e) => handleUpdateSubject(subject.id, 'coefficient', parseFloat(e.target.value) || 1)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bilan du bulletin
                      </label>
                      <select
                        value={subject.groupe ?? ''}
                        onChange={(e) => handleUpdateSubject(subject.id, 'groupe', e.target.value || undefined)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Auto (selon le nom)</option>
                        <option value="litteraire">Bilan littéraire</option>
                        <option value="scientifique">Bilan scientifique</option>
                        <option value="autres">Autres matières</option>
                      </select>
                      <p className="text-gray-400 text-xs mt-1">
                        Détermine le bilan officiel (littéraire / scientifique / autres).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Critères minimaux (CM)
                      </label>
                      <input
                        type="number"
                        value={subject.noteObtenueMax}
                        onChange={(e) => handleUpdateSubject(subject.id, 'noteObtenueMax', parseInt(e.target.value) || 18)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note de perfectionnement (CP)
                      </label>
                      <input
                        type="number"
                        value={subject.notePerfectionnementMax}
                        onChange={(e) => handleUpdateSubject(subject.id, 'notePerfectionnementMax', parseInt(e.target.value) || 2)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddSubject}
          className="w-full mt-4 bg-gray-100 text-gray-700 py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6" />
          Ajouter une matière
        </button>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            💡 <strong>Conseil :</strong> Les matières seront affichées dans l'ordre ci-dessus lors de la saisie des notes.
            Assurez-vous que l'ordre correspond à votre grille d'évaluation.
          </p>
        </div>
      </main>
    </div>
  );
}
