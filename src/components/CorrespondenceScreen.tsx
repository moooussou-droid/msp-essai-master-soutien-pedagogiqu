import { useEffect, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, Copy, FileText, Printer, Save, Trash2, FileDown } from 'lucide-react';
import { exportCorrespondanceDocx } from '../utils/correspondenceExport';
import { getProfile, getSchoolLogo } from '../utils/userProfile';
import { copyText } from '../utils/clipboard';

type TemplateKey = 'reunion_ape' | 'entretien' | 'absences' | 'fournitures' | 'felicitations';

interface CorrespondenceNote {
  id: string;
  template: TemplateKey;
  parentName: string;
  studentName: string;
  className: string;
  date: string;
  message: string;
  createdAt: number;
}

const STORAGE_KEY = 'msp_correspondence_notes';

const TEMPLATES: Record<TemplateKey, { label: string; text: string }> = {
  reunion_ape: {
    label: 'Convocation Réunion APE',
    text: 'Madame, Monsieur, vous êtes cordialement invité(e) à prendre part à la réunion de l’APE qui se tiendra à l’école. Votre présence est vivement souhaitée pour le suivi des activités scolaires.',
  },
  entretien: {
    label: 'Entretien pédagogique',
    text: 'Madame, Monsieur, je souhaite vous rencontrer afin d’échanger sur le travail, le comportement et les progrès de votre enfant. Merci de vous présenter à l’école à la date indiquée.',
  },
  absences: {
    label: 'Absences répétées',
    text: 'Madame, Monsieur, votre enfant enregistre des absences répétées. Nous vous invitons à veiller à sa présence régulière en classe afin de favoriser ses apprentissages.',
  },
  fournitures: {
    label: 'Fournitures manquantes',
    text: 'Madame, Monsieur, certaines fournitures indispensables aux activités de classe manquent encore à votre enfant. Merci de bien vouloir les compléter dans les meilleurs délais.',
  },
  felicitations: {
    label: 'Félicitations pour progrès APC',
    text: 'Madame, Monsieur, votre enfant a réalisé des progrès appréciables dans les apprentissages selon l’approche par compétences. Nous l’encourageons à poursuivre ses efforts.',
  },
};

function loadNotes(): CorrespondenceNote[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveNotes(notes: CorrespondenceNote[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function CorrespondenceScreen() {
  const goBack = useSmartBack();
  const [notes, setNotes] = useState<CorrespondenceNote[]>([]);
  const [template, setTemplate] = useState<TemplateKey>('reunion_ape');
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(today());

  useEffect(() => setNotes(loadNotes()), []);

  const generated = buildMessage();

  function buildMessage() {
    const t = TEMPLATES[template];
    return `École : ____________________\nClasse : ${className || '________'}\nDate : ${date}\n\nÀ l’attention de ${parentName || 'Madame/Monsieur le parent'},\nParent de l’élève ${studentName || '________________'}\n\nObjet : ${t.label}\n\n${t.text}\n\nLe maître / La maîtresse\n\n---------------- COUPON RÉPONSE ----------------\nJe soussigné(e), parent de l’élève ${studentName || '________________'}, accuse réception du présent avis.\n\nSignature du parent : ____________________`;
  }

  function persist(next: CorrespondenceNote[]) {
    setNotes(next);
    saveNotes(next);
  }

  function saveCurrent() {
    const next = [{ id: `cor-${Date.now()}`, template, parentName, studentName, className, date, message: generated, createdAt: Date.now() }, ...notes];
    persist(next);
  }

  async function copyMessage() {
    const okCopy = await copyText(generated);
    alert(okCopy ? 'Mot copié pour envoi par message.' : 'Impossible de copier automatiquement : sélectionnez le texte manuellement.');
  }

  async function handleWord() {
    const profile = getProfile();
    try {
      await exportCorrespondanceDocx({
        templateLabel: TEMPLATES[template].label,
        parentName,
        studentName,
        className,
        date,
        school: profile.schoolName || '',
        circonscription: profile.circonscription || '',
        commune: profile.commune || '',
        teacherName: profile.teacherName || '',
        logoDataUrl: getSchoolLogo(),
        body: TEMPLATES[template].text,
      });
    } catch (e: any) {
      alert('Erreur lors de l\'export Word : ' + (e?.message || e));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Carnet de Correspondance</h1><p className="text-emerald-100 text-sm">Avis aux parents avec coupon réponse</p></div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
          <select value={template} onChange={e => setTemplate(e.target.value as TemplateKey)} className="w-full p-3 border border-gray-300 rounded-lg mb-3">
            {Object.entries(TEMPLATES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Nom du parent" className="p-3 border rounded-lg text-sm" />
            <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Nom de l'élève" className="p-3 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="Classe" className="p-3 border rounded-lg text-sm" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 border rounded-lg text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><FileText className="w-5 h-5" /> Aperçu</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto">{generated}</pre>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <button onClick={copyMessage} className="bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium"><Copy className="w-4 h-4 inline mr-1" /> Copier</button>
            <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium"><Printer className="w-4 h-4 inline mr-1" /> Imprimer</button>
            <button onClick={handleWord} className="bg-[#006b4f] text-white py-2 rounded-lg text-sm font-medium"><FileDown className="w-4 h-4 inline mr-1" /> Word officiel</button>
            <button onClick={saveCurrent} className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium"><Save className="w-4 h-4 inline mr-1" /> Sauver</button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">💡 « Word officiel » génère un courrier avec en-tête (République du Bénin, logo de l'école du profil, coupon réponse) — prêt à imprimer.</p>
        </div>

        <h2 className="font-bold text-gray-800 mb-2">Avis sauvegardés</h2>
        <div className="space-y-2">
          {notes.length === 0 ? <p className="text-gray-500 text-sm bg-white rounded-xl p-4 text-center">Aucun avis enregistré.</p> : notes.map(note => (
            <div key={note.id} className="bg-white rounded-xl shadow p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{TEMPLATES[note.template].label}</p>
                <p className="text-gray-500 text-xs">{note.date} • {note.studentName || 'Élève non précisé'}</p>
              </div>
              <button onClick={() => persist(notes.filter(n => n.id !== note.id))} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}