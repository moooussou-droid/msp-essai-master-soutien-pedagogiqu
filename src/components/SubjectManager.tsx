import { useState } from 'react';
import { Subject } from '../utils/database';
import { X, Plus, GripVertical } from 'lucide-react';

interface SubjectManagerProps {
  subjects: Subject[];
  onUpdate: (subjects: Subject[]) => void;
  onClose: () => void;
}

export default function SubjectManager({ subjects, onUpdate, onClose }: SubjectManagerProps) {
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(
    [...subjects].sort((a, b) => a.order - b.order)
  );

  function handleAddSubject() {
    const newSubject: Subject = {
      id: `subject-${Date.now()}`,
      name: 'Nouvelle matière',
      noteObtenueMax: 18,
      notePerfectionnementMax: 2,
      order: localSubjects.length,
    };
    setLocalSubjects([...localSubjects, newSubject]);
  }

  function handleUpdateSubject(id: string, updates: Partial<Subject>) {
    setLocalSubjects(
      localSubjects.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }

  function handleDeleteSubject(id: string) {
    if (confirm('Supprimer cette matière ?')) {
      setLocalSubjects(localSubjects.filter(s => s.id !== id));
    }
  }

  function handleSave() {
    // Update order based on current position
    const updated = localSubjects.map((s, index) => ({ ...s, order: index }));
    onUpdate(updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Gérer les matières</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {localSubjects.map((subject, index) => (
            <div key={subject.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Matière {index + 1}</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="text"
                  value={subject.name}
                  onChange={(e) => handleUpdateSubject(subject.id, { name: e.target.value })}
                  placeholder="Nom de la matière"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Critères minimaux (CM)</label>
                    <input
                      type="number"
                      value={subject.noteObtenueMax}
                      onChange={(e) => handleUpdateSubject(subject.id, { noteObtenueMax: parseInt(e.target.value) || 18 })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Note de perfectionnement (CP)</label>
                    <input
                      type="number"
                      value={subject.notePerfectionnementMax}
                      onChange={(e) => handleUpdateSubject(subject.id, { notePerfectionnementMax: parseInt(e.target.value) || 2 })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteSubject(subject.id)}
                className="mt-2 text-red-600 text-sm hover:underline"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAddSubject}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter une matière
          </button>

          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
          >
            Enregistrer les modifications
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-3">
          Les matières seront affichées dans l'ordre ci-dessus
        </p>
      </div>
    </div>
  );
}
