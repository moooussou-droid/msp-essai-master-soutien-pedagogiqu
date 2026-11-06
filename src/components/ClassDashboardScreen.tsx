import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, Calculator, Award, Users, BarChart3, UserCircle, Edit3, Target,
  FileSpreadsheet, BookOpen, CalendarDays, TrendingUp, Download, Pencil, Trash2, Lock, Camera,
} from 'lucide-react';
import { ClassData, getClass, deleteClass } from '../utils/database';
import { hasFullAccess } from '../utils/userProfile';
import { isAllowedForEssentiel } from '../utils/subscription';
import {
  classPreschoolTrimester, getPreschoolEvaluation, isPrescolaireClass,
  loadPreschoolEvaluations, preschoolCounts,
} from '../utils/prescolaireBulletin';

/**
 * Tableau de bord d'une classe (v23) : les fonctions Enseignant regroupées
 * en tuiles claires (Évaluation / Gestion / Documents), au lieu des longues
 * listes de boutons sur l'accueil.
 */
export default function ClassDashboardScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) getClass(id).then((d) => setClassData(d || null));
  }, [id]);

  if (!classData) return <div className="p-4 text-center">Chargement...</div>;

  const base = `/class/${classData.id}`;
  const prescolaire = isPrescolaireClass(classData);
  const totalSlots = classData.students.length * classData.subjects.length;
  const preschoolProgress = (() => {
    if (!prescolaire || classData.students.length === 0) return 0;
    const records = loadPreschoolEvaluations();
    const trimester = classPreschoolTrimester(classData);
    const filled = classData.students.reduce(
      (sum, student) => sum + preschoolCounts(getPreschoolEvaluation(classData.id, student.id, trimester, records)).completed,
      0,
    );
    return Math.min(100, Math.round((filled / (classData.students.length * 10)) * 100));
  })();
  const progress = prescolaire
    ? preschoolProgress
    : totalSlots > 0
      ? Math.min(100, Math.round((classData.notes.filter(n => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent).length / totalSlots) * 100))
      : 0;

  const sections: { title: string; items: { label: string; desc: string; to: string; icon: any; color: string }[] }[] = [
    {
      title: 'Évaluation',
      items: [
        prescolaire
          ? { label: 'Grille TS / S / PS', desc: '10 domaines d’observation', to: `${base}/bulletins`, icon: Calculator, color: 'bg-amber-100 text-amber-700' }
          : { label: 'Saisir les notes', desc: 'Par matière ou par profil', to: `${base}/entry`, icon: Calculator, color: 'bg-amber-100 text-amber-700' },
        prescolaire
          ? { label: 'Bulletin Maternelle officiel', desc: '2 pages, sans classement', to: `${base}/bulletins`, icon: Award, color: 'bg-indigo-100 text-indigo-700' }
          : { label: 'Bulletins & classement', desc: 'Par évaluation / officiel', to: `${base}/bulletins`, icon: Award, color: 'bg-indigo-100 text-indigo-700' },
        { label: 'Présences des élèves', desc: 'Appel matin et après-midi', to: `${base}/presences`, icon: Users, color: 'bg-teal-100 text-teal-700' },
        { label: 'Bilan annuel', desc: 'Moyennes et présences', to: `${base}/bilan-annuel`, icon: BarChart3, color: 'bg-indigo-100 text-indigo-700' },
        { label: 'Statistiques', desc: 'Moyennes & réussite', to: `${base}/statistics`, icon: BarChart3, color: 'bg-blue-100 text-blue-700' },
        { label: 'Évolution d’un élève', desc: 'Progression par matière', to: `${base}/student-analytics`, icon: TrendingUp, color: 'bg-rose-100 text-rose-700' },
        { label: 'Tableau des notes', desc: 'Vue d’ensemble PV + seuil atteint', to: `${base}/table`, icon: FileSpreadsheet, color: 'bg-cyan-100 text-cyan-700' },
        { label: 'Statistiques par discipline', desc: 'Filles/Garçons, seuil, remédiation', to: `${base}/statistiques-disciplines`, icon: Target, color: 'bg-teal-100 text-teal-700' },
      ],
    },
    {
      title: 'Gestion',
      items: [
        { label: 'Élèves', desc: 'Inscrire, modifier, trier', to: `${base}/students`, icon: UserCircle, color: 'bg-emerald-100 text-emerald-700' },
        prescolaire
          ? { label: 'Domaines', desc: '10 domaines officiels', to: `${base}/subjects`, icon: Edit3, color: 'bg-purple-100 text-purple-700' }
          : { label: 'Matières', desc: 'Coefficients & bilans', to: `${base}/subjects`, icon: Edit3, color: 'bg-purple-100 text-purple-700' },
        { label: 'Fiches élèves', desc: 'Saisie par profil', to: `${base}/profiles`, icon: UserCircle, color: 'bg-lime-100 text-lime-700' },
        { label: 'Photos EducMaster', desc: 'Caméra, fond blanc, ZIP', to: `${base}/photos-educmaster`, icon: Camera, color: 'bg-blue-100 text-blue-700' },
        { label: 'Export EducMaster', desc: 'Fichier Excel officiel', to: `${base}/export`, icon: Download, color: 'bg-sky-100 text-sky-700' },
      ],
    },
    {
      title: 'Documents & outils',
      items: [
        { label: 'Programme d’études', desc: 'Documents officiels', to: `${base}/programme`, icon: BookOpen, color: 'bg-green-100 text-green-700' },
        { label: 'Planification annuelle', desc: 'Apprentissages', to: `${base}/planification-annuelle`, icon: CalendarDays, color: 'bg-orange-100 text-orange-700' },
      ],
    },
  ];

  async function handleDelete() {
    if (!classData) return;
    if (!window.confirm(`Supprimer la classe « ${classData.name} » et toutes ses données ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await deleteClass(classData.id);
      navigate('/');
    } catch (e) {
      alert('Erreur lors de la suppression.');
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{classData.name}</h1>
            <p className="text-emerald-100 text-sm truncate">
              {classData.school} • {classData.schoolYear}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`${base}/edit`} className="p-2 bg-white/20 rounded-lg" title="Modifier la classe">
              <Pencil className="w-5 h-5" />
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="p-2 bg-red-500/80 rounded-lg" title="Supprimer la classe">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {/* Bandeau résumé */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-lg font-semibold">{classData.level}{classData.serie ? ` ${classData.serie}` : ''}</span>
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-lg capitalize">{classData.educationType ?? 'primaire'}</span>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-lg">{classData.sequence}</span>
            {classData.evaluationType && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-lg">📝 {classData.evaluationType}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-xl font-extrabold text-gray-800">{classData.students.length}</p>
              <p className="text-[11px] text-gray-500">Élèves</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-xl font-extrabold text-gray-800">{prescolaire ? 10 : classData.subjects.length}</p>
              <p className="text-[11px] text-gray-500">{prescolaire ? 'Domaines' : 'Matières'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-xl font-extrabold text-emerald-600">{progress}%</p>
              <p className="text-[11px] text-gray-500">{prescolaire ? 'Grille remplie' : 'Notes saisies'}</p>
            </div>
          </div>
        </div>

        {/* Fonctions Enseignant par groupe */}
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">{section.title}</h2>
            <div className="grid grid-cols-2 gap-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                // Tarification (v31) : la formule Essentiel (999 FCFA/an) ne
                // donne accès qu'à l'enrôlement et à l'importation des notes.
                const locked = !hasFullAccess() && !isAllowedForEssentiel(item.to);
                if (locked) {
                  return (
                    <div key={item.label} className="bg-white rounded-xl shadow p-3 flex items-center gap-3 opacity-80">
                      <div className={`rounded-lg p-2.5 shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 text-sm leading-tight flex items-center gap-1">
                          {item.label} <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </p>
                        <p className="text-gray-400 text-[11px] truncate">Formule COMPLET (1500 FCFA/an)</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="bg-white rounded-xl shadow p-3 flex items-center gap-3 hover:shadow-md transition"
                  >
                    <div className={`rounded-lg p-2.5 shrink-0 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm leading-tight">{item.label}</p>
                      <p className="text-gray-400 text-[11px] truncate">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Accès rapide à la saisie */}
        {hasFullAccess() ? (
          <Link
            to={prescolaire ? `${base}/bulletins` : `${base}/entry`}
            className="block bg-emerald-600 text-white rounded-xl shadow p-4 text-center font-bold"
          >
            {prescolaire ? '+ Remplir la grille d’évaluation trimestrielle' : '+ Saisir les notes maintenant'}
          </Link>
        ) : (
          <div className="block bg-amber-50 border border-amber-200 text-amber-800 rounded-xl shadow p-4 text-center font-bold">
            <Lock className="w-4 h-4 inline mr-1" /> Saisie des notes — formule COMPLET (1500 FCFA/an) — passez à la formule Complet pour saisir/évaluer
          </div>
        )}
      </main>
    </div>
  );
}
