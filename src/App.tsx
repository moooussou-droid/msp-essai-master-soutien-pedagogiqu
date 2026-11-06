import { useState, useEffect, Fragment } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useSmartBack, pushNavEntry } from './utils/useSmartBack';
import {
  AlarmClock,
  AlertTriangle,
  BookMarked,
  Lock,
  Wrench,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Library,
  MoonStar,
  Calculator,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Cloud,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  GraduationCap,
  Headset,
  LayoutGrid,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  PlayCircle,
  Plus,
  School,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  Upload,
  UserCircle,
  Users,
  X,
  FileDown,
  Printer,
} from 'lucide-react';
import { 
  ClassData, Student, Subject, Note, EducationType, SecondaryLevel, SecondarySerie,
  getAllClasses, getClass, saveClass,
  exportAllData, importAllData, clearAllData, generateId,
  getDefaultSubjectsForLevel, getDefaultSubjectsForSecondary, getDefaultSubjectsForPrescolaire, sortStudents,
  EvaluationId, evaluationsForClass, evaluationLabel, findBestNote, findNoteInEvaluation,
  makeCustomEvaluation, isCustomEvaluation, CustomEvaluation
} from './utils/database';
import { generateEducMasterExcel, downloadExcel } from './utils/excelGenerator';
import { importStudentsFromExcel, ImportResult, generateStudentTemplate } from './utils/excelImporter';
import { computeBulletins, subjectTotal } from './utils/bulletin';
// v45 : PV de classe en vrai PDF (l'ecran « Tableau des notes » n'avait aucun export).
import { exportNotesTablePdf } from './utils/bulletinPdf';
import LicenceBanner from './components/LicenceBanner';
import CanteenEnrollmentScreen from './components/CanteenEnrollmentScreen';
import ChronoScreen from './components/ChronoScreen';
import CalculatorScreen from './components/CalculatorScreen';
import ScannerScreen from './components/ScannerScreen';
import TermsScreen from './components/TermsScreen';
import ParentSpaceScreen from './components/ParentSpaceScreen';
import ParentCodeScreen from './components/ParentCodeScreen';
import CahierJournalScreen from './components/CahierJournalScreen';
import ManualScreen from './components/ManualScreen';
import TutorialsScreen from './components/TutorialsScreen';
import AttendanceRegisterScreen from './components/AttendanceRegisterScreen';
import SchoolFeesScreen from './components/SchoolFeesScreen';
import SchoolBookletScreen from './components/SchoolBookletScreen';
import SchoolInventoryScreen from './components/SchoolInventoryScreen';
import TimetableScreen from './components/TimetableScreen';
import RemediationScreen from './components/RemediationScreen';
import BackupScreen from './components/BackupScreen';
import ClassCouncilScreen from './components/ClassCouncilScreen';
import RegistreMatriculeScreen from './components/RegistreMatriculeScreen';
import SubjectsScreen from './components/SubjectsScreen';
import StudentProfileEntry from './components/StudentProfileEntry';
import BulletinsScreen from './components/BulletinsScreen';
import EducMasterPhotosScreen from './components/EducMasterPhotosScreen';
import ClassDashboardScreen from './components/ClassDashboardScreen';
import SupportScreen from './components/SupportScreen';
import CloudScreen from './components/CloudScreen';
import ProfileScreen from './components/ProfileScreen';
import AttendanceScreen from './components/AttendanceScreen';
import CorrespondenceScreen from './components/CorrespondenceScreen';
import SchoolCalendarScreen from './components/SchoolCalendarScreen';
import VerifyBulletinScreen from './components/VerifyBulletinScreen';
import StudentAnalytics from './components/StudentAnalytics';
import ClassStatistics from './components/ClassStatistics';
import ActivityEventsScreen from './components/ActivityEventsScreen';
import SchoolAdminToolkitScreen from './components/SchoolAdminToolkitScreen';
import AdminDashboardScreen from './components/AdminDashboardScreen';
import AccessGate from './components/AccessGate';
import SubscriptionActivationScreen from './components/SubscriptionActivationScreen';
import { isAnyAdminSession } from './utils/adminSession';
import ClassDocumentsScreen from './components/ClassDocumentsScreen';
import TeacherToolkitScreen from './components/TeacherToolkitScreen';
import FichesPedagogiquesScreen from './components/FichesPedagogiquesScreen';
import PrepFichesScreen from './components/PrepFichesScreen';
import AdminPrepFichesScreen from './components/AdminPrepFichesScreen';
import ComingSoonScreen from './components/ComingSoonScreen';
import AIOnlineChatScreen from './components/AIOnlineChatScreen';
import ClockAlarmScreen from './components/ClockAlarmScreen';
import DisplaySettingsScreen from './components/SettingsScreen';
import TeacherToolsScreen from './components/TeacherToolsScreen';
import LibraryScreen from './components/LibraryScreen';
import OralArtsScreen from './components/OralArtsScreen';
import HomeClock from './components/HomeClock';
import OrientationPostBacScreen from './components/OrientationPostBacScreen';
import OrientationScolaireScreen from './components/OrientationScolaireScreen';
import EnrollmentScreen from './components/EnrollmentScreen';
import StudentListPdfScreen from './components/StudentListPdfScreen';
import StaffEnrollmentScreen from './components/StaffEnrollmentScreen';
import SubjectStatisticsScreen from './components/SubjectStatisticsScreen';
import KnowledgeHubScreen from './components/KnowledgeHubScreen';
import KidsDictionaryScreen from './components/KidsDictionaryScreen';
import CourseMarketplaceScreen from './components/CourseMarketplaceScreen';
import CoursesScreen from './components/CoursesScreen';
import MoocScreen from './components/MoocScreen';
import MoocCreatorScreen from './components/MoocCreatorScreen';
import AdminCourseEditorScreen from './components/AdminCourseEditorScreen';
import SectionGuide from './components/SectionGuide';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import { ProgrammesScreen, VideosScreen, AnnoncesScreen, PublicitesScreen } from './components/Resources';
import ModuleScreen from './components/ModuleScreen';
import AnnualReportScreen from './components/AnnualReportScreen';
import { APP_MODULES, MODULE_TONES, findModule } from './utils/appModules';
import LifeEducationScreen from './components/LifeEducationScreen';
import CanteenSimulatorScreen from './components/CanteenSimulatorScreen';
import CanteenPayerEatersScreen from './components/CanteenPayerEatersScreen';
import CanteenMenuScreen from './components/CanteenMenuScreen';
import CanteenStockScreen from './components/CanteenStockScreen';
import ImageGeneratorScreen from './components/ImageGeneratorScreen';
import ImageBankScreen from './components/ImageBankScreen';
import SignatureSettingsScreen from './components/SignatureSettingsScreen';
import AccountingScreen from './components/AccountingScreen';
import SchoolBudgetScreen from './components/SchoolBudgetScreen';
// v64 — Espace École multi-classes + référentiels de langues au primaire.
import SchoolSpaceScreen from './components/SchoolSpaceScreen';
import FrenchGCOScreen from './components/FrenchGCOScreen';
import EnglishPrimaryScreen from './components/EnglishPrimaryScreen';
import AnnouncementTicker from './components/AnnouncementTicker';
import { openWhatsApp } from './utils/contact';
import { calculateBMI, bmiLabel } from './utils/health';
import { checkCloudBackupAvailability } from './utils/storageStatus';
import { getLastSync, getLastSyncInfo } from './utils/cloudSync';
import { syncPublishedPrepFichesFromCloud } from './utils/prepFicheCloudSync';
import { isActivated, getActivationChrono, readAndResizeImage, getProfile, schoolPlan } from './utils/userProfile';
import { loadWorkspaces } from './utils/schoolSpace';

import { trialStatus } from './utils/trial';
import { boundSchool, isBound, bindSchool, normalizeSchoolName } from './utils/schoolBinding';
import TrialBanner from './components/TrialBanner';
import UpdateBanner from './components/UpdateBanner';
import { hasProPerimetre, isAllowedForEssentiel, isProPath, isSchoolDiscoveryPath } from './utils/subscription';
import UpgradeScreen from './components/UpgradeScreen';
import { schoolYearLabel } from './utils/orientation';
import { AppTheme, getSavedTheme, saveTheme } from './utils/theme';
import { applyTheme as applyDisplayTheme, savePreferences } from './utils/appPreferences';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import JSZip from 'jszip';

// Color palette - Benin flag inspired
const colors = {
  green: 'bg-emerald-600 hover:bg-emerald-700',
  greenLight: 'bg-emerald-50',
  yellow: 'bg-amber-400 hover:bg-amber-500',
  yellowLight: 'bg-amber-50',
  red: 'bg-red-600 hover:bg-red-700',
  redLight: 'bg-red-50',
};

// Level options
const PRESCOLAIRE_LEVELS = ['Maternelle 1', 'Maternelle 2'] as const;
const LEVELS = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] as const;

const SECONDARY_LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'] as const;
const SECONDARY_SERIES = ['A1', 'A2', 'B', 'C', 'D'] as const;
const isSecondCycleLevel = (lvl: string) => lvl === '2nde' || lvl === '1ère' || lvl === 'Tle';

/** Parse un nombre avec virgule décimale (« 72,5 » → 72.5). Retourne undefined si vide/invalide. */
function parseDecimal(value?: string | number | null): number | undefined {
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  const v = (value || '').trim().replace(/,/g, '.').replace(/\s+/g, '');
  if (!v) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

// Home Screen - Class List
function HomeScreen() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  // Mot de bienvenue personnalisé (nom & prénom de l'utilisateur)
  const [welcomeName, setWelcomeName] = useState('');
  const welcomeGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();
  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState('1er Trim.');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadClasses();
    // Nom & prénom : d'abord le profil enseignant, sinon le nom d'activation
    try {
      const p = getProfile();
      const chrono = getActivationChrono();
      const raw = (p.teacherName || chrono.name || '').trim();
      setWelcomeName(raw.replace(/\s+/g, ' '));
    } catch { /* profil illisible : bienvenue générique */ }
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  async function loadClasses() {
    try {
      const data = await getAllClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBackup() {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notefacile-sauvegarde-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 4000);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Erreur lors de la sauvegarde.');
    }
  }

  async function handleBackupZip() {
    try {
      const data = await exportAllData();
      const zip = new JSZip();
      zip.file('sauvegarde-master-soutien.json', data);
      zip.file('LISEZ-MOI.txt', 'Sauvegarde Master Soutien Pédagogique. Pour restaurer : Paramètres > Restaurer (import JSON), puis sélectionnez le fichier JSON contenu dans cette archive.');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `master-soutien-sauvegarde-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 4000);
    } catch (error) {
      console.error('Error exporting zip:', error);
      alert('Erreur lors de la création du fichier ZIP.');
    }
  }

  function handleRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as string;
          await importAllData(data);
          alert('Restauration réussie ! Vos données ont été récupérées.');
          loadClasses();
        } catch (error) {
          console.error('Error importing:', error);
          alert('Fichier invalide. Sélectionnez un fichier de sauvegarde .json de Master Soutien Pédagogique.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
  const totalSubjects = classes.reduce((sum, c) => sum + c.subjects.length, 0);
  const totalNotesDone = classes.reduce(
    (sum, c) => sum + c.notes.filter(n => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent).length,
    0
  );
  const totalNotesExpected = classes.reduce((sum, c) => sum + c.students.length * c.subjects.length, 0);
  const globalProgress = totalNotesExpected > 0 ? Math.round((totalNotesDone / totalNotesExpected) * 100) : 0;

  // Fonctions Enseignant : les 8 actions principales, sur la classe
  // sélectionnée (ou la première si une seule existe).
  const firstClassId = classes[0]?.id;
  const teacherFunctions = [
    { label: 'Saisie des notes', desc: 'Par matière ou par profil', to: classTarget(`/class/${firstClassId}/entry`), icon: Calculator, color: 'bg-amber-100 text-amber-700' },
    { label: 'Bulletins', desc: 'Par évaluation / officiel', to: classTarget(`/class/${firstClassId}/bulletins`), icon: Award, color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Présences', desc: 'Appel & absences', to: classTarget(`/class/${firstClassId}/presences`), icon: Users, color: 'bg-teal-100 text-teal-700' },
    { label: 'Statistiques', desc: 'Moyennes de classe', to: '/class-statistics', icon: BarChart3, color: 'bg-blue-100 text-blue-700' },
    { label: 'Élèves', desc: 'Ajouter & organiser', to: classTarget(`/class/${firstClassId}/students`), icon: UserCircle, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Matières', desc: 'Coefficients & bilans', to: classTarget(`/class/${firstClassId}/subjects`), icon: Edit3, color: 'bg-purple-100 text-purple-700' },
    { label: 'Tableau des notes', desc: 'Vue d’ensemble', to: classTarget(`/class/${firstClassId}/table`), icon: FileSpreadsheet, color: 'bg-rose-100 text-rose-700' },
    { label: 'Export Excel', desc: 'Fichier EducMaster', to: classTarget(`/class/${firstClassId}/export`), icon: Download, color: 'bg-cyan-100 text-cyan-700' },
  ];
  function classTarget(to: string) {
    return classes.length === 0 ? '/class/new' : to;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="msp-home-header text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Master Soutien Pédagogique</h1>
              <p className="text-emerald-100 text-sm">Notes, bulletins & accompagnement - Bénin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="p-2 bg-white/20 rounded-lg">
              <UserCircle className="w-6 h-6" />
            </Link>
            <Link to="/settings" className="p-2 bg-white/20 rounded-lg">
              <Settings className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </header>

      <div className="msp-home-main px-4 pt-4">
        <Link to="/guide/manuel" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <BookMarked className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-emerald-950">Guide de l’utilisateur</p>
            <p className="text-xs text-emerald-800">Le manuel pas à pas de l’application, disponible hors connexion.</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-800">Ouvrir <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </div>

      {/* Photo de couverture */}
      <div className="w-full">
        <img
          src="./cover.png"
          alt="Master Soutien Pédagogique"
          className="w-full h-44 sm:h-56 object-cover"
        />
      </div>

      {/* Main Content */}
      <main className="msp-home-main p-4 pb-24">
        {/* Tableau de bord enseignant */}
        <section className="msp-home-hero msp-kente mb-5 overflow-hidden rounded-2xl text-white shadow-xl">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/15 p-3">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-100">{welcomeGreeting}</p>
                  <h2 className="text-xl font-bold leading-tight">{welcomeName ? `Bienvenue, ${welcomeName} !` : 'Mes Classes & Effectifs'}</h2>
                  <p className="mt-1 text-sm text-emerald-100">
                    Gérez vos élèves, notes APC, bulletins, présences et préparations.
                  </p>
                </div>
              </div>
              <Link
                to="/class/new"
                className="shrink-0 rounded-xl bg-emerald-300 px-3 py-2 text-sm font-bold text-emerald-950 shadow"
              >
                + Classe
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-2xl font-bold">{classes.length}</p>
                <p className="text-[11px] text-emerald-100">Classes</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-[11px] text-emerald-100">Élèves</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-2xl font-bold">{totalSubjects}</p>
                <p className="text-[11px] text-emerald-100">Matières</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-2xl font-bold">{globalProgress}%</p>
                <p className="text-[11px] text-emerald-100">Notes</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleBackupZip}
                className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-amber-950 shadow inline-flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Télécharger .ZIP
              </button>
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${online ? 'bg-emerald-500/25 text-emerald-50' : 'bg-red-500/25 text-red-50'}`}>
                  {online ? 'En ligne' : 'Hors-ligne'}
                </span>
                <span className="whitespace-nowrap text-sm text-emerald-100">Trimestre en cours :</span>
                {['1er Trim.', '2ème Trim.', '3ème Trim.'].map(term => (
                  <button
                    key={term}
                    onClick={() => setCurrentTerm(term)}
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${currentTerm === term ? 'bg-emerald-200 text-emerald-950' : 'bg-white/10 text-emerald-50'}`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-emerald-950/30 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-emerald-100 mb-3">Tableau de bord — Fonctions Enseignant</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teacherFunctions.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-xl bg-white/10 p-3 text-emerald-50 hover:bg-white/20 transition"
                  >
                    <div className={`inline-flex rounded-lg p-2 mb-2 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold leading-tight">{item.label}</p>
                    <p className="text-[11px] text-emerald-100/80">{item.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <Link to="/activation" className="msp-home-activation mb-4 flex items-center gap-3 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><ShieldCheck className="h-6 w-6 text-amber-300" /></div>
          <div className="min-w-0 flex-1">
            <span className="block text-base font-black">Activer ou renouveler mon abonnement</span>
            <span className="mt-0.5 block text-xs text-white/80">5 formules, dont École Maternelle–CM2 et Maternelle–Terminale</span>
          </div>
          <span className="hidden items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold sm:inline-flex">Voir les formules <ArrowRight className="h-4 w-4" /></span>
          <ArrowRight className="h-5 w-5 shrink-0 sm:hidden" />
        </Link>

        {/* Privacy Banner */}
        <div className={`${colors.yellowLight} border border-amber-200 rounded-lg p-3 mb-4`}>
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-amber-800 text-sm font-medium">Vos données restent privées</p>
              <p className="text-amber-700 text-xs">
                Stockées sur votre téléphone. La sauvegarde cloud est chiffrée de bout en bout (optionnelle).
              </p>
            </div>
          </div>
        </div>

        {/* Accès Synchronisation Cloud */}
        <Link
          to="/cloud"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow p-4 flex items-center gap-3 mb-4"
        >
          <div className="bg-white/20 p-2 rounded-full">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="font-semibold block">Synchronisation Cloud</span>
            <span className="text-white/80 text-xs">Sauvegarde chiffrée & accès multi-appareils</span>
          </div>
          <ShieldCheck className="w-6 h-6" />
        </Link>

        {/* Rappel de sauvegarde (visible s'il y a des classes) */}
        {!loading && classes.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-emerald-800 text-sm font-medium">Protégez votre travail</p>
                <p className="text-emerald-700 text-xs mb-2">
                  Faites une sauvegarde après avoir saisi vos notes pour ne jamais les perdre.
                </p>
                <button
                  onClick={handleBackup}
                  className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Sauvegarder maintenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Class Button */}
        <Link
          to="/class/new"
          className={`${colors.green} text-white p-4 rounded-xl shadow-lg flex items-center justify-center gap-3 mb-6`}
        >
          <Plus className="w-6 h-6" />
          <span className="font-semibold">Nouvelle Classe</span>
        </Link>

        {/* Classes List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : classes.length === 0 ? (
          <div className="py-8">
            <div className="text-center mb-6">
              <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune classe créée</p>
              <p className="text-gray-400 text-sm">Créez votre première classe pour commencer</p>
            </div>

            {/* Aide à la récupération des données */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 text-sm mb-2">
                Vous aviez déjà saisi des notes ?
              </h3>
              <p className="text-blue-700 text-sm mb-3">
                Vos données sont conservées dans le <strong>même navigateur</strong> et à la
                <strong> même adresse</strong> qu'à l'origine. Si elles n'apparaissent pas ici,
                rouvrez l'application au même endroit, ou restaurez une sauvegarde&nbsp;:
              </p>
              <button
                onClick={handleRestore}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Restaurer une sauvegarde (.json)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((classData) => (
              <Link
                key={classData.id}
                to={`/class/${classData.id}`}
                className="bg-white rounded-xl shadow p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <School className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{classData.name}</p>
                  <p className="text-gray-500 text-xs truncate">
                    {classData.level}{classData.serie ? ` ${classData.serie}` : ''} • {classData.sequence} • {classData.schoolYear}
                  </p>
                  {classData.evaluationType && (
                    <p className="text-emerald-600 text-[10px] font-semibold mt-0.5">📝 Type d'évaluation : {classData.evaluationType}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    {classData.students.length} élèves • {classData.subjects.length} matières
                  </p>
                  {classData.students.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="bg-gray-100 rounded-full h-1.5 flex-1">
                        <div
                          className="bg-emerald-500 rounded-full h-1.5"
                          style={{
                            width: `${Math.min(100, Math.round(
                              (classData.notes.filter(n => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent).length /
                              (classData.students.length * classData.subjects.length)) * 100
                            ))}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">notes</span>
                    </div>
                  )}
                </div>
                <span className="text-gray-300 text-xl shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}

        {/* Horloge et alarmes (v38) */}
        <HomeClock />

        {/* Espace enseignant — présentation par MODULES (v36) */}
        <div className="mt-8">
          <h2 className="text-gray-800 font-bold text-lg mb-1">Espace enseignant</h2>
          <p className="text-gray-500 text-sm mb-4">
            Les fonctions sont regroupées par module. Ouvrez un module pour voir ce qu'il contient.
          </p>

          {/* Les modules regroupeurs (v39 : 5 avec « Éducation à la vie ») */}
          <div className="space-y-3">
            {APP_MODULES.map(mod => {
              const tone = MODULE_TONES[mod.tone];
              return (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className={`bg-white rounded-2xl shadow-sm ring-1 ${tone.ring} p-4 flex items-center gap-3`}
                >
                  <div className={`${tone.bg} ${tone.text} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 block leading-tight">{mod.title}</span>
                    <span className="text-gray-500 text-xs">{mod.tagline}</span>
                    <span className="text-gray-400 text-[11px] block mt-0.5">
                      {mod.subModules.map(sm => sm.title).join(' · ')}
                    </span>
                  </div>
                  <span className="text-gray-300 text-xl shrink-0">›</span>
                </Link>
              );
            })}
          </div>

          {/* Suivi de la classe */}
          <h3 className="text-gray-700 font-bold text-sm mt-6 mb-2 uppercase tracking-wide">Suivi &amp; analyse</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/class-statistics" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-blue-100 p-3 rounded-full"><BarChart3 className="w-7 h-7 text-blue-600" /></div>
              <span className="font-semibold text-gray-800 text-sm">Statistiques de classe</span>
              <span className="text-gray-500 text-xs">Moyennes et réussite</span>
            </Link>
            <Link to="/boite-outils" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-emerald-100 p-3 rounded-full"><ClipboardList className="w-7 h-7 text-emerald-600" /></div>
              <span className="font-semibold text-gray-800 text-sm">Boîte à outils</span>
              <span className="text-gray-500 text-xs">Groupes, appréciations</span>
            </Link>
          </div>

          {/* Outils du quotidien (v38) */}
          <h3 className="text-gray-700 font-bold text-sm mt-6 mb-2 uppercase tracking-wide">Mon quotidien</h3>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/outils-enseignant" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <ClipboardList className="w-7 h-7 text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">Outils</span>
              <span className="text-gray-400 text-[10px] leading-tight">Emploi du temps, cahier de textes</span>
            </Link>
            {/*
              v51 — CORRECTIF D'ACCESSIBILITE.
              « Mes registres officiels » n'etait lie depuis AUCUN ecran :
              le module etait invisible pour l'utilisateur. « Ma boite a
              outils » (chronometre, calculatrice, numerisation) n'avait pas
              non plus de point d'entree. Les deux sont desormais sur
              l'accueil.
            */}
            {/* v58 : le guide de l'utilisateur, accessible apres activation. */}
            <Link to="/guide" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <GraduationCap className="w-7 h-7 text-emerald-700" />
              <span className="font-semibold text-gray-800 text-sm">Guide</span>
              <span className="text-gray-400 text-[10px] leading-tight">Manuel et tutoriels</span>
            </Link>
            {/* v52 : « Ma vie scolaire » — les 8 nouveaux modules. */}
            <Link to="/vie-scolaire" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <School className="w-7 h-7 text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">Vie scolaire</span>
              <span className="text-gray-400 text-[10px] leading-tight">Appel, paiements, conseil</span>
            </Link>
            <Link to="/registres" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <BookMarked className="w-7 h-7 text-emerald-700" />
              <span className="font-semibold text-gray-800 text-sm">Registres</span>
              <span className="text-gray-400 text-[10px] leading-tight">Cahier journal, matricule</span>
            </Link>
            <Link to="/outils" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <Wrench className="w-7 h-7 text-amber-600" />
              <span className="font-semibold text-gray-800 text-sm">Mes outils</span>
              <span className="text-gray-400 text-[10px] leading-tight">Chrono, calculatrice, scan</span>
            </Link>
            <Link to="/horloge" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <AlarmClock className="w-7 h-7 text-indigo-600" />
              <span className="font-semibold text-gray-800 text-sm">Horloge</span>
              <span className="text-gray-400 text-[10px] leading-tight">Alarmes et minuteur</span>
            </Link>
            <Link to="/reglages" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <MoonStar className="w-7 h-7 text-slate-700" />
              <span className="font-semibold text-gray-800 text-sm">Mode nuit</span>
              <span className="text-gray-400 text-[10px] leading-tight">Confort visuel</span>
            </Link>
          </div>

          {/* Savoirs */}
          <h3 className="text-gray-700 font-bold text-sm mt-6 mb-2 uppercase tracking-wide">Savoirs &amp; cours</h3>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/encyclopedie" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-600" />
              <span className="font-semibold text-gray-800 text-sm">Encyclopédie MSP</span>
            </Link>
            <Link to="/dictionnaire" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <BookOpen className="w-7 h-7 text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">Dictionnaire MSP</span>
            </Link>
            <Link to="/cours" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <Store className="w-7 h-7 text-amber-600" />
              <span className="font-semibold text-gray-800 text-sm">Cours</span>
            </Link>
          </div>
          <Link to="/formations" className="mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full"><GraduationCap className="w-7 h-7" /></div>
            <span className="flex-1 min-w-0">
              <span className="font-semibold block">Formations (MOOC)</span>
              <span className="text-white/80 text-xs">Se former, passer des quiz, obtenir des certificats · Studio créateur</span>
            </span>
            <span className="text-white/60 text-xl">›</span>
          </Link>
          <Link to="/bibliotheque" className="mt-3 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <Library className="w-7 h-7 text-purple-600 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-gray-800 block">Biblio - Médiathèque</span>
              <span className="text-gray-500 text-xs">Manuels et ouvrages, et films éducatifs (YouTube)</span>
            </span>
            <span className="text-gray-300 text-xl">›</span>
          </Link>
          <Link to="/videos" className="mt-3 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-full"><PlayCircle className="w-7 h-7 text-red-600" /></div>
            <div className="flex-1">
              <span className="font-semibold text-gray-800 block">Vidéos des cours</span>
              <span className="text-gray-500 text-xs">Accompagnement pédagogique</span>
            </div>
          </Link>

          {/* Vie de l'établissement */}
          <h3 className="text-gray-700 font-bold text-sm mt-6 mb-2 uppercase tracking-wide">Vie de l'établissement</h3>
          <Link to="/administration-scolaire" className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-full"><School className="w-7 h-7 text-amber-600" /></div>
            <div className="flex-1">
              <span className="font-semibold text-gray-800 block">Administration scolaire</span>
              <span className="text-gray-500 text-xs">Rapports, PV, checklists EducMaster et inspection</span>
            </div>
          </Link>
          <Link to="/grands-rendez-vous" className="mt-3 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-full"><CalendarDays className="w-7 h-7 text-amber-600" /></div>
            <div className="flex-1">
              <span className="font-semibold text-gray-800 block">Grands rendez-vous</span>
              <span className="text-gray-500 text-xs">Activités publiques, privées et sur invitation</span>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Link to="/calendrier-scolaire" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-blue-100 p-3 rounded-full"><CalendarDays className="w-7 h-7 text-blue-600" /></div>
              <span className="font-semibold text-gray-800 text-sm">Calendrier scolaire</span>
              <span className="text-gray-500 text-xs">Examens, fériés, export</span>
            </Link>
            <Link to="/correspondance" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
              <div className="bg-rose-100 p-3 rounded-full"><Mail className="w-7 h-7 text-rose-600" /></div>
              <span className="font-semibold text-gray-800 text-sm">Correspondance</span>
              <span className="text-gray-500 text-xs">Avis aux parents</span>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 px-1">
            <Link to="/equipe" className="text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">Accès équipe</Link>
            <Link to="/admin-dashboard" className="text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">Accès principal</Link>
          </div>

          {/* Support / Contact */}
          <Link
            to="/support"
            className="mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow p-4 flex items-center gap-3"
          >
            <div className="bg-white/20 p-3 rounded-full">
              <Headset className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="font-semibold block">Support & Contact</span>
              <span className="text-white/80 text-xs">Aide, formation, suggestions via WhatsApp</span>
            </div>
            <MessageCircle className="w-6 h-6" />
          </Link>
        </div>
      </main>

      {/* Bouton flottant WhatsApp */}
      <button
        onClick={() => openWhatsApp('Bonjour Master Soutien Pédagogique !')}
        className="fixed bottom-5 right-5 bg-green-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-20 hover:bg-green-700"
        aria-label="Contacter sur WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    </div>
  );
}

// Class Creation/Edit Screen
function ClassFormScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const isEdit = !!id;
  // Année scolaire dynamique : en septembre, on bascule sur la nouvelle année
  const currentYearStart = parseInt(schoolYearLabel().split('-')[0], 10) || 2026;
  const defaultSchoolYear = `${currentYearStart} - ${currentYearStart + 1}`;

  const [formData, setFormData] = useState({
    name: '',
    school: '',
    circonscription: '',
    educationType: 'primaire' as EducationType,
    level: 'CI' as string,
    serie: 'A1' as SecondarySerie,
    schoolYear: defaultSchoolYear,
    sequence: '1er trimestre',
    evaluationType: '',
  });
  const [loading, setLoading] = useState(false);

  // Période proposée selon l'ordre d'enseignement (trimestres en maternelle/
  // primaire, semestres au secondaire). La valeur existante reste proposée
  // même si elle est ancienne (compatibilité des classes déjà créées).
  const periodOptions = (() => {
    const base = formData.educationType === 'secondaire'
      ? ['Premier semestre', 'Second semestre']
      : ['1er trimestre', '2ème trimestre', '3ème trimestre'];
    if (formData.sequence && !base.includes(formData.sequence)) return [...base, formData.sequence];
    return base;
  })();

  useEffect(() => {
    if (isEdit && id) {
      loadClass();
    }
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const classData = await getClass(id);
      if (classData) {
        setFormData({
          name: classData.name,
          school: classData.school,
          circonscription: classData.circonscription ?? '',
          educationType: classData.educationType ?? 'primaire',
          level: classData.level,
          serie: classData.serie ?? 'A1',
          schoolYear: classData.schoolYear,
          sequence: classData.sequence || 'Evaluation',
          evaluationType: classData.evaluationType || '',
        });
      }
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const isSecondaire = formData.educationType === 'secondaire';
      const isPrescolaire = formData.educationType === 'prescolaire';
      const serie = isSecondaire && isSecondCycleLevel(formData.level) ? formData.serie : undefined;

      /*
       * v61 — Limite d'inscription par utilisateur :
       *   • Primaire   : une SEULE classe par niveau (CI, CP, CE1, CE2, CM1, CM2).
       *   • Maternelle : uniquement Maternelle 1 et Maternelle 2 (une chacune).
       * Le secondaire (6ème → Terminale) n'est pas limité à une classe par niveau.
       * On ne contrôle qu'à la CRÉATION ; l'édition d'une classe existante reste libre.
       *
       * v64 — EXCEPTION ESPACE ÉCOLE : avec un abonnement École
       * (6000/10000 F), la direction gère PLUSIEURS classes du même niveau
       * (CE1 A, CE1 B…) pour ses enseignants. La limite « une par niveau »
       * visait le compte individuel d'un enseignant ; elle ne s'applique
       * donc pas à l'espace d'un établissement.
       */
      if (!isEdit && !isSecondaire && !schoolPlan()) {
        const all = await getAllClasses();
        const dup = all.find(
          (c) => c.educationType === formData.educationType && c.level === formData.level,
        );
        if (dup) {
          setLoading(false);
          alert(
            `Vous avez déjà une classe de ${formData.level}. ` +
            `Chaque utilisateur ne peut créer qu'une seule classe par niveau ` +
            `(${isPrescolaire ? 'Maternelle 1 et Maternelle 2' : 'CI, CP, CE1, CE2, CM1, CM2'}).`,
          );
          return;
        }
      }

      // Générer les matières par défaut selon le type d'enseignement.
      // En édition, on conserve les matières existantes (déjà personnalisées).
      let subjects: Subject[];
      if (isEdit && id) {
        const existing = await getClass(id);
        subjects = existing?.subjects ?? [];
      } else if (isSecondaire) {
        subjects = getDefaultSubjectsForSecondary(formData.level as SecondaryLevel, serie);
      } else if (isPrescolaire) {
        subjects = getDefaultSubjectsForPrescolaire(formData.level);
      } else {
        subjects = getDefaultSubjectsForLevel(formData.level);
      }

      const existing = isEdit && id ? await getClass(id) : undefined;

      /*
       * v60 : la PREMIERE classe creee fixe l'etablissement de l'abonnement.
       * Sans cela, un utilisateur qui n'a jamais rempli son profil resterait
       * sans rattachement, et le verrou ne s'appliquerait jamais.
       */
      if (!isBound() && (formData.school || '').trim()) {
        bindSchool(formData.school.trim());
      }

      const classData: ClassData = {
        id: isEdit && id ? id : generateId(),
        name: formData.name,
        /*
         * v60 : l'ecole enregistree est TOUJOURS celle du rattachement.
         * Le champ est verrouille a l'ecran ; on re-applique ici la regle
         * cote donnees, pour qu'un contournement de l'interface ne puisse
         * pas creer une classe rattachee a un autre etablissement.
         */
        school: boundSchool() || formData.school,
        /*
         * v64 — RATTACHEMENT AUTOMATIQUE À L'ESPACE ÉCOLE.
         * Si un espace porte le nom de cette école, la classe créée (ou
         * éditée) y entre directement : la direction la voit dans son
         * tableau de bord sans manipulation supplémentaire. En édition,
         * un rattachement déjà en place est conservé tel quel.
         */
        schoolId: existing?.schoolId
          ?? loadWorkspaces().find(
            w => normalizeSchoolName(w.name) === normalizeSchoolName(boundSchool() || formData.school),
          )?.id,
        teacherName: existing?.teacherName,
        circonscription: isSecondaire ? undefined : formData.circonscription,
        educationType: formData.educationType,
        level: formData.level,
        serie,
        schoolYear: formData.schoolYear,
        sequence: formData.sequence,
        evaluationType: formData.evaluationType,
        students: existing?.students ?? [],
        subjects,
        notes: existing?.notes ?? [],
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };

      await saveClass(classData);
      navigate('/');
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">{isEdit ? 'Modifier la classe' : 'Nouvelle classe'}</h1>
        </div>
      </header>

      {/* Form */}
      <main className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la classe *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: CE1 A"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          {/*
            v60 — VERROU D'ÉTABLISSEMENT.
            Le champ « École » était libre : un même abonnement pouvait donc
            servir à créer des classes pour plusieurs écoles, ce qui vidait de
            son sens la règle « un abonnement = une école ». Dès qu'un
            établissement de rattachement existe, le champ est imposé et
            verrouillé. Il reste saisissable la toute première fois, puisque
            c'est cette saisie qui fixe le rattachement.
          */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              École *
            </label>
            <input
              type="text"
              data-testid="champ-ecole-classe"
              value={boundSchool() || formData.school}
              onChange={(e) => {
                if (isBound()) return; // verrouillé : la valeur ne change plus
                setFormData({ ...formData, school: e.target.value });
              }}
              readOnly={isBound()}
              placeholder="Ex: EPP Cotonou Centre"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                isBound()
                  ? 'border-gray-200 bg-gray-100 text-gray-700 cursor-not-allowed'
                  : 'border-gray-300'
              }`}
              required
            />
            {isBound() ? (
              <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-500">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Votre abonnement est rattaché à <strong>{boundSchool()}</strong>. Pour changer
                  d’établissement, contactez un administrateur.
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-amber-700">
                ⚠️ Cette première saisie fixera l’établissement de votre abonnement.
              </p>
            )}
          </div>

          {formData.educationType !== 'secondaire' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Circonscription scolaire
              </label>
              <input
                type="text"
                value={formData.circonscription}
                onChange={(e) => setFormData({ ...formData, circonscription: e.target.value })}
                placeholder="Ex: Circonscription Pédagogique 1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Ordre d'enseignement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordre d'enseignement *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, educationType: 'prescolaire', level: 'Maternelle 1', sequence: '1er trimestre' })}
                className={`py-3 rounded-lg font-semibold border-2 text-sm ${
                  formData.educationType === 'prescolaire'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Préscolaire
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, educationType: 'primaire', level: 'CI', sequence: '1er trimestre' })}
                className={`py-3 rounded-lg font-semibold border-2 text-sm ${
                  formData.educationType === 'primaire'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Primaire
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, educationType: 'secondaire', level: '6ème', circonscription: '', sequence: 'Premier semestre' })}
                className={`py-3 rounded-lg font-semibold border-2 text-sm ${
                  formData.educationType === 'secondaire'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Secondaire
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niveau *
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {(formData.educationType === 'prescolaire'
                ? PRESCOLAIRE_LEVELS
                : formData.educationType === 'primaire'
                ? LEVELS
                : SECONDARY_LEVELS
              ).map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Série (secondaire, second cycle uniquement) */}
          {formData.educationType === 'secondaire' && isSecondCycleLevel(formData.level) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Série *
              </label>
              <select
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: e.target.value as SecondarySerie })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {SECONDARY_SERIES.map((s) => (
                  <option key={s} value={s}>Série {s}</option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-1">
                Les matières s'ajustent automatiquement selon la série.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année scolaire *
            </label>
            <select
              value={formData.schoolYear}
              onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {Array.from({ length: 10 }, (_, i) => {
                // L'année en cours et les 9 suivantes (plus l'année passée, toujours utile)
                const start = currentYearStart - 1 + i;
                return `${start} - ${start + 1}`;
              }).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période *
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {formData.educationType === 'secondaire'
                ? 'Apparaît sur le bulletin officiel : « Bulletin de notes du Premier semestre ».'
                : 'Apparaît sur les bulletins : chaque évaluation (formative, sommative…) a son propre bulletin.'}
            </p>
            <div className={`grid gap-2 ${periodOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {periodOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormData({ ...formData, sequence: opt })}
                  className={`rounded-xl border-2 p-3 text-center transition ${
                    formData.sequence === opt
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <p className={`text-sm font-semibold capitalize ${formData.sequence === opt ? 'text-emerald-700' : 'text-gray-700'}`}>{opt}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'évaluation
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Écrivez librement le type d'évaluation de la classe, tel que vous le pratiquez (affiché sur les bulletins et documents).
            </p>
            <input
              type="text"
              value={formData.evaluationType}
              onChange={(e) => setFormData({ ...formData, evaluationType: e.target.value })}
              placeholder="Ex : Devoir surveillé, Interrogation écrite, Évaluation, Composition…"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${colors.green} text-white w-full py-4 rounded-xl font-semibold shadow-lg disabled:opacity-50`}
          >
            {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer la classe'}
          </button>
        </form>
      </main>
    </div>
  );
}

// Student Management Screen
function StudentsScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ matricule: '', nom: '', prenoms: '', sexe: '' as '' | 'M' | 'F', dateNaissance: '', photoUrl: '', weightKg: '', heightCm: '' });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'add'>('add');
  const [showImportPreview, setShowImportPreview] = useState(false);
  // « AUTRES ÉVALUATIONS » (v32) : feuilles du fichier non reconnues par EducMaster.
  const [customEvalMode, setCustomEvalMode] = useState<'none' | 'existing' | 'new'>('none');
  const [customEvalChoice, setCustomEvalChoice] = useState<{ id: string; label: string } | null>(null);
  const [newCustomEvalLabel, setNewCustomEvalLabel] = useState('');

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!classData || !id) return;

    setLoading(true);
    try {
      let updatedStudents: Student[];

      if (editingStudentId) {
        updatedStudents = classData.students.map(student =>
          student.id === editingStudentId
            ? {
                ...student,
                matricule: newStudent.matricule,
                nom: newStudent.nom,
                prenoms: newStudent.prenoms,
                sexe: newStudent.sexe || undefined,
                dateNaissance: newStudent.dateNaissance || undefined,
                photoUrl: newStudent.photoUrl || undefined,
                weightKg: parseDecimal(newStudent.weightKg),
                heightCm: parseDecimal(newStudent.heightCm),
              }
            : student
        );
      } else {
        const student: Student = {
          id: generateId(),
          matricule: newStudent.matricule,
          nom: newStudent.nom,
          prenoms: newStudent.prenoms,
          sexe: newStudent.sexe || undefined,
          dateNaissance: newStudent.dateNaissance || undefined,
          photoUrl: newStudent.photoUrl || undefined,
          weightKg: parseDecimal(newStudent.weightKg),
          heightCm: parseDecimal(newStudent.heightCm),
          createdAt: Date.now(),
        };
        updatedStudents = [...classData.students, student];
      }

      const updatedClass: ClassData = {
        ...classData,
        students: updatedStudents,
      };

      await saveClass(updatedClass);
      setClassData(updatedClass);
      setNewStudent({ matricule: '', nom: '', prenoms: '', sexe: '', dateNaissance: '', photoUrl: '', weightKg: '', heightCm: '' });
      setEditingStudentId(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding student:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStudent(studentId: string) {
    if (!classData || !id) return;
    if (!confirm('Supprimer cet élève ?')) return;

    try {
      const updatedClass: ClassData = {
        ...classData,
        students: classData.students.filter(s => s.id !== studentId),
        notes: classData.notes.filter(n => n.studentId !== studentId),
      };
      await saveClass(updatedClass);
      setClassData(updatedClass);
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  }

  function openAddStudent() {
    setEditingStudentId(null);
    setNewStudent({ matricule: '', nom: '', prenoms: '', sexe: '', dateNaissance: '', photoUrl: '', weightKg: '', heightCm: '' });
    setShowAddForm(true);
  }

  function openEditStudent(student: Student) {
    setEditingStudentId(student.id);
    setNewStudent({
      matricule: student.matricule || '',
      nom: student.nom || '',
      prenoms: student.prenoms || '',
      sexe: student.sexe || '',
      dateNaissance: student.dateNaissance || '',
      photoUrl: student.photoUrl || '',
      weightKg: student.weightKg?.toString() || '',
      heightCm: student.heightCm?.toString() || '',
    });
    setShowAddForm(true);
  }

  function closeStudentForm() {
    setShowAddForm(false);
    setEditingStudentId(null);
    setNewStudent({ matricule: '', nom: '', prenoms: '', sexe: '', dateNaissance: '', photoUrl: '', weightKg: '', heightCm: '' });
  }

  function handleImportExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !classData || !id) return;

      setImporting(true);
      setImportResult(null);
      try {
        const result = await importStudentsFromExcel(file, classData.subjects);
        setImportResult(result);
        setCustomEvalMode('none');
        setCustomEvalChoice(null);
        setNewCustomEvalLabel('');
        setShowImportPreview(true);
      } catch (error) {
        console.error('Error importing Excel:', error);
        alert('Erreur lors de la lecture du fichier Excel. Vérifiez que le fichier est valide (.xlsx).');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  async function handleConfirmImport() {
    if (!classData || !id || !importResult) return;

    setLoading(true);
    try {
      const normalizePerson = (s: Student) =>
        `${s.nom || ''}|${s.prenoms || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      const existingByMatricule = new Map(
        classData.students
          .filter(s => s.matricule)
          .map(s => [s.matricule, s])
      );
      const existingByName = new Map(classData.students.map(s => [normalizePerson(s), s]));

      const studentIdMap = new Map<string, string>(); // id importé -> id final dans la classe
      let newStudents = importResult.students;

      if (importMode === 'replace') {
        for (const s of importResult.students) studentIdMap.set(s.id, s.id);
      } else {
        newStudents = [];
        for (const imported of importResult.students) {
          const existing =
            (imported.matricule ? existingByMatricule.get(imported.matricule) : undefined) ||
            existingByName.get(normalizePerson(imported));

          if (existing) {
            // Cas important : le fichier exporté contient des élèves déjà présents.
            // On réutilise leur id pour mettre à jour leurs notes, y compris le CP.
            studentIdMap.set(imported.id, existing.id);
          } else {
            newStudents.push(imported);
            studentIdMap.set(imported.id, imported.id);
          }
        }
      }

      const updatedStudents = importMode === 'replace'
        ? importResult.students
        : [...classData.students, ...newStudents];

      // « AUTRES ÉVALUATIONS » (v32) : si l'enseignant a choisi (ou créé) une
      // évaluation personnalisée, les notes des feuilles non reconnues par
      // EducMaster lui sont rattachées.
      let customEvaluations: CustomEvaluation[] = classData.customEvaluations || [];
      let customEvalId: string | null = null;
      if (customEvalMode === 'existing' && customEvalChoice) {
        customEvalId = customEvalChoice.id;
      } else if (customEvalMode === 'new' && newCustomEvalLabel.trim()) {
        const created = makeCustomEvaluation(newCustomEvalLabel);
        customEvaluations = [...customEvaluations, created];
        customEvalId = created.id;
      }

      // Construire les notes importées. En mode ajout, les notes des élèves déjà
      // existants sont aussi mises à jour si le fichier les contient.
      // Chaque feuille du fichier (évaluation formative/sommative 1-3) produit
      // des notes distinctes, portant leur évaluation.
      const importedNotes: Note[] = [];
      for (const pn of importResult.parsedNotes) {
        if (!pn.subjectId) continue; // matière non reconnue dans la classe
        const finalStudentId = studentIdMap.get(pn.studentId);
        if (!finalStudentId) continue;
        importedNotes.push({
          id: generateId(),
          studentId: finalStudentId,
          subjectId: pn.subjectId,
          noteObtenue: pn.noteObtenue,
          notePerfectionnement: pn.notePerfectionnement,
          absent: pn.absent,
          // Évaluation official reconnue, sinon l'« Autre évaluation » choisie.
          evaluation: pn.evaluation ?? customEvalId ?? undefined,
          updatedAt: Date.now(),
        });
      }

      // Clé de déduplication : élève + matière + évaluation (le même élève peut
      // avoir une note dans plusieurs évaluations du fichier).
      const noteKey = (n: { studentId: string; subjectId: string; evaluation?: EvaluationId }) =>
        `${n.studentId}|${n.subjectId}|${n.evaluation ?? ''}`;
      const importedKeys = new Set(importedNotes.map(noteKey));
      const baseNotes = importMode === 'replace'
        ? []
        : classData.notes.filter(n => !importedKeys.has(noteKey(n)));

      const updatedClass: ClassData = {
        ...classData,
        students: updatedStudents,
        notes: [...baseNotes, ...importedNotes],
        customEvaluations,
      };

      await saveClass(updatedClass);
      setClassData(updatedClass);
      setShowImportPreview(false);
      setImportResult(null);
      setCustomEvalMode('none');
      setCustomEvalChoice(null);
      setNewCustomEvalLabel('');
      const notesMsg = importedNotes.length > 0
        ? ` et ${importedNotes.length} note(s) importée(s)`
        : '';
      alert(`${newStudents.length} nouvel/nouveaux élève(s)${notesMsg} avec succès !`);
    } catch (error) {
      console.error('Error confirming import:', error);
      alert('Erreur lors de l\'enregistrement des élèves.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      // Pour le primaire, le modèle reproduit le fichier officiel : une feuille
      // par évaluation (formative + sommatives 1-3) avec les matières de la classe.
      const blob = await generateStudentTemplate(classData ?? undefined);
      await downloadExcel(blob, 'modele-notes-eleves.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Erreur lors de la génération du modèle.');
    }
  }

  async function handleStudentPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez choisir une image JPG ou PNG.');
      return;
    }
    try {
      const photoUrl = await readAndResizeImage(file, 300);
      setNewStudent({ ...newStudent, photoUrl });
    } catch {
      alert('Impossible de lire cette image.');
    }
  }

  async function handleUpdateStudentPhoto(studentId: string, file?: File) {
    if (!file || !classData) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez choisir une image JPG ou PNG.');
      return;
    }
    try {
      const photoUrl = await readAndResizeImage(file, 300);
      const updatedClass: ClassData = {
        ...classData,
        students: classData.students.map(student =>
          student.id === studentId ? { ...student, photoUrl } : student
        ),
      };
      await saveClass(updatedClass);
      setClassData(updatedClass);
    } catch {
      alert('Impossible de lire cette image.');
    }
  }

  async function handleRemoveStudentPhoto(studentId: string) {
    if (!classData) return;
    const updatedClass: ClassData = {
      ...classData,
      students: classData.students.map(student =>
        student.id === studentId ? { ...student, photoUrl: undefined } : student
      ),
    };
    await saveClass(updatedClass);
    setClassData(updatedClass);
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
              <h1 className="text-lg font-bold">Élèves</h1>
              <p className="text-gray-500 text-sm">{classData.name}</p>
            </div>
          </div>
          <button
            onClick={openAddStudent}
            className={`${colors.green} text-white p-2 rounded-lg`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {/* Import Button */}
        <button
          onClick={handleImportExcel}
          disabled={importing}
          className="w-full bg-blue-50 text-blue-700 py-3 rounded-lg mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          {importing ? 'Lecture du fichier...' : 'Importer les élèves depuis Excel'}
        </button>
        <p className="text-gray-500 text-xs text-center mb-2">
          Importez un fichier .xlsx (Matricule, Nom, Prénoms).
          Les notes déjà remplies sont aussi reconnues automatiquement.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="w-full bg-gray-50 text-gray-600 py-2 rounded-lg mb-4 flex items-center justify-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Télécharger un modèle Excel vierge
        </button>

        {/* Students List */}
        {classData.students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun élève</p>
            <p className="text-gray-400 text-sm">Ajoutez votre premier élève</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortStudents(classData.students).map((student) => (
              <div key={student.id} className="bg-white rounded-lg shadow p-3 flex items-center justify-between gap-3">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt="Photo élève" className="w-11 h-11 rounded-full object-cover border" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    {student.nom?.[0]}{student.prenoms?.[0] || ''}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{student.nom.toUpperCase()} {student.prenoms}</p>
                  <p className="text-gray-500 text-sm">Mat: {student.matricule}</p>
                  {(student.weightKg || student.heightCm) && (() => {
                    const bmi = calculateBMI(student.weightKg, student.heightCm);
                    return (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Santé : {student.weightKg || '-'} kg • {student.heightCm || '-'} cm • IMC {bmi ? bmi.toFixed(1) : '-'}
                      </p>
                    );
                  })()}
                  <div className="flex items-center gap-3 mt-1">
                    <label className="text-blue-600 text-xs font-medium cursor-pointer">
                      {student.photoUrl ? 'Changer photo' : 'Ajouter photo'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => handleUpdateStudentPhoto(student.id, e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                    {student.photoUrl && (
                      <button
                        onClick={() => handleRemoveStudentPhoto(student.id)}
                        className="text-red-500 text-xs font-medium"
                      >
                        Retirer photo
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEditStudent(student)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Modifier l'élève"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteStudent(student.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Student Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingStudentId ? 'Modifier l’élève' : 'Nouvel élève'}</h2>
              <button onClick={closeStudentForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matricule *</label>
                <input
                  type="text"
                  value={newStudent.matricule}
                  onChange={(e) => setNewStudent({ ...newStudent, matricule: e.target.value })}
                  placeholder="Ex: 001234"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={newStudent.nom}
                  onChange={(e) => setNewStudent({ ...newStudent, nom: e.target.value.toUpperCase() })}
                  placeholder="Ex: KOFFI"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénoms *</label>
                <input
                  type="text"
                  value={newStudent.prenoms}
                  onChange={(e) => setNewStudent({ ...newStudent, prenoms: e.target.value })}
                  placeholder="Ex: Jean Michel"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe (facultatif)</label>
                  <select
                    value={newStudent.sexe}
                    onChange={(e) => setNewStudent({ ...newStudent, sexe: e.target.value as '' | 'M' | 'F' })}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">—</option>
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance (facultatif)</label>
                  <input
                    type="date"
                    value={newStudent.dateNaissance}
                    onChange={(e) => setNewStudent({ ...newStudent, dateNaissance: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo d'identité (facultatif)</label>
                <div className="flex items-center gap-3">
                  {newStudent.photoUrl ? (
                    <img src={newStudent.photoUrl} alt="Aperçu" className="w-16 h-16 rounded-full object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">Photo</div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleStudentPhoto(e.target.files?.[0])}
                      className="w-full text-sm"
                    />
                    {newStudent.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewStudent({ ...newStudent, photoUrl: '' })}
                        className="text-red-600 text-xs"
                      >
                        Retirer la photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <h3 className="font-semibold text-emerald-800 text-sm mb-2">Suivi de la santé scolaire</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Poids (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={newStudent.weightKg}
                      onChange={(e) => setNewStudent({ ...newStudent, weightKg: e.target.value })}
                      placeholder="Ex: 24.5"
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Taille (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={newStudent.heightCm}
                      onChange={(e) => setNewStudent({ ...newStudent, heightCm: e.target.value })}
                      placeholder="Ex: 125"
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {(() => {
                  const bmi = calculateBMI(newStudent.weightKg, newStudent.heightCm);
                  return (
                    <div className="mt-2 bg-white rounded-lg p-2 text-sm">
                      <span className="text-gray-500">IMC : </span>
                      <strong className="text-emerald-700">{bmi ? bmi.toFixed(1) : '-'}</strong>
                      <span className="text-gray-500"> • {bmiLabel(bmi)}</span>
                    </div>
                  );
                })()}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`${colors.green} text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50`}
              >
                {loading ? 'Enregistrement...' : editingStudentId ? 'Enregistrer les modifications' : 'Ajouter l\'élève'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportPreview && importResult && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[28rem] rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Aperçu de l'import</h2>
              <button 
                onClick={() => { setShowImportPreview(false); setImportResult(null); }} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
              <p className="text-emerald-800 font-medium">
                {importResult.students.length} élève(s) détecté(s)
              </p>
              {importResult.notesCount > 0 && (
                <p className="text-emerald-700 text-sm mt-1">
                  ✓ {importResult.notesCount} note(s) détectée(s) dans le fichier
                  {(() => {
                    const matched = new Set(
                      importResult.parsedNotes.filter(n => n.subjectId).map(n => n.subjectName)
                    ).size;
                    const total = importResult.detectedSubjects.length;
                    return total > 0 ? ` — ${matched}/${total} matière(s) reconnue(s)` : '';
                  })()}
                </p>
              )}
              {importResult.detectedEvaluations.length > 0 && (
                <p className="text-emerald-700 text-xs mt-1">
                  📋 {importResult.detectedEvaluations.length} feuille(s) d'évaluation :{' '}
                  {importResult.detectedEvaluations.join(' • ')}
                </p>
              )}
              {importResult.notesCount > 0 &&
                importResult.parsedNotes.filter(n => !n.subjectId).length > 0 && (
                  <p className="text-amber-700 text-xs mt-1">
                    ⚠️ Certaines matières du fichier ne correspondent pas à celles de la classe
                    et seront ignorées. Vérifiez les noms des matières.
                  </p>
                )}
              {importResult.errors.length > 0 && (
                <p className="text-amber-700 text-sm mt-1">
                  {importResult.errors.length} avertissement(s)
                </p>
              )}
            </div>

            {/* Warnings */}
            {importResult.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                <p className="text-amber-800 text-sm font-medium mb-1">Avertissements :</p>
                <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AUTRES ÉVALUATIONS (v32) : feuilles non reconnues par EducMaster */}
            {importResult.notesCount > 0 && importResult.parsedNotes.some(n => !n.evaluation && n.subjectId) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                <p className="text-indigo-900 text-sm font-bold">➕ Autres évaluations (feuilles non reconnues)</p>
                <p className="text-indigo-700 text-xs mt-1">
                  Certaines feuilles du fichier ne correspondent pas aux 4 évaluations EducMaster
                  (formative + sommatives 1/2/3). Rattachez leurs notes à une évaluation de votre choix :
                </p>
                <select
                  value={customEvalMode === 'existing' && customEvalChoice ? `ex:${customEvalChoice.id}` : customEvalMode}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'new') { setCustomEvalMode('new'); setCustomEvalChoice(null); }
                    else if (v.startsWith('ex:')) {
                      const found = (classData?.customEvaluations || []).find(c => c.id === v.slice(3));
                      setCustomEvalMode('existing');
                      setCustomEvalChoice(found ? { id: found.id, label: found.label } : null);
                    } else { setCustomEvalMode('none'); setCustomEvalChoice(null); }
                  }}
                  className="w-full mt-2 p-2.5 border border-indigo-300 rounded-lg text-sm bg-white"
                >
                  <option value="none">— Aucune (ne pas importer ces notes) —</option>
                  {(classData?.customEvaluations || []).map(c => (
                    <option key={c.id} value={`ex:${c.id}`}>✨ {c.label}</option>
                  ))}
                  <option value="new">➕ Créer une nouvelle évaluation…</option>
                </select>
                {customEvalMode === 'new' && (
                  <div className="mt-2">
                    <input
                      value={newCustomEvalLabel}
                      onChange={e => setNewCustomEvalLabel(e.target.value)}
                      placeholder="Nom de l'évaluation (ex. Projet de classe)"
                      className="w-full p-2.5 border border-indigo-300 rounded-lg text-sm bg-white"
                    />
                    <p className="text-[11px] text-indigo-500 mt-1">
                      Les notes des feuilles non reconnues seront rattachées à cette nouvelle évaluation (valable 1 an, indépendante du bulletin EducMaster).
                    </p>
                  </div>
                )}
                {customEvalMode === 'existing' && customEvalChoice && (
                  <p className="text-[11px] text-indigo-500 mt-1">
                    Les notes des feuilles non reconnues seront rattachées à « {customEvalChoice.label} ».
                  </p>
                )}
              </div>
            )}

            {/* Import mode selection (only if there are existing students) */}
            {classData.students.length > 0 && importResult.students.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Cette classe contient déjà {classData.students.length} élève(s). Que faire ?
                </p>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${importMode === 'add' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'add'}
                      onChange={() => setImportMode('add')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-medium text-gray-800">Ajouter</p>
                      <p className="text-xs text-gray-500">Conserver les élèves existants (les doublons de matricule seront ignorés)</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${importMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-medium text-gray-800">Remplacer tout</p>
                      <p className="text-xs text-gray-500">Supprimer les élèves et notes existants</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Preview list */}
            {importResult.students.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Aperçu (5 premiers) :</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left text-xs">Matricule</th>
                        <th className="p-2 text-left text-xs">Nom</th>
                        <th className="p-2 text-left text-xs">Prénoms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.students.slice(0, 5).map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-2 text-xs">{s.matricule}</td>
                          <td className="p-2 text-xs font-medium">{s.nom}</td>
                          <td className="p-2 text-xs">{s.prenoms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importResult.students.length > 5 && (
                  <p className="text-gray-400 text-xs mt-1 text-center">
                    ... et {importResult.students.length - 5} autre(s)
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowImportPreview(false); setImportResult(null); }}
                className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading || importResult.students.length === 0}
                className={`${colors.green} text-white py-3 rounded-lg font-semibold disabled:opacity-50`}
              >
                {loading ? 'Import...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Note Entry Screen - Main entry point for selecting subject
function NoteEntryScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  // Évaluation active pour la saisie : « Toutes » (comportement historique, la note
  // la plus récente prime dans les calculs) ou une évaluation précise du nouveau
  // modèle officiel (formative 1 / sommative 1-3).
  const [evaluation, setEvaluation] = useState<EvaluationId | 'all'>('all');
  // « AUTRES ÉVALUATIONS » (v32) : en dehors des 4 évaluations EducMaster.
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customEvalLabel, setCustomEvalLabel] = useState('');
  const [customEvalDate, setCustomEvalDate] = useState('');

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  /** Crée une « Autre évaluation » à l'initiative de l'enseignant. */
  async function createCustomEvaluation() {
    if (!classData) return;
    if (!customEvalLabel.trim()) {
      alert("Donnez un nom à l'évaluation (ex. Projet de classe, Devoir maison, Interrogation orale).");
      return;
    }
    const custom = makeCustomEvaluation(customEvalLabel, customEvalDate || undefined);
    const updated: ClassData = {
      ...classData,
      customEvaluations: [...(classData.customEvaluations || []), custom],
    };
    setClassData(updated);
    await saveClass(updated);
    setEvaluation(custom.id);
    setCustomEvalLabel('');
    setCustomEvalDate('');
    setShowCustomForm(false);
  }

  /** Retire une évaluation personnalisée (les notes restent conservées). */
  async function removeCustomEvaluation(evalId: string) {
    if (!classData) return;
    if (!confirm('Retirer cette évaluation de la liste ? (Les notes saisies sont conservées.)')) return;
    const updated: ClassData = {
      ...classData,
      customEvaluations: (classData.customEvaluations || []).filter(c => c.id !== evalId),
    };
    setClassData(updated);
    await saveClass(updated);
    if (evaluation === evalId) setEvaluation('all');
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  if (selectedSubject) {
    return (
      <NoteEntryBySubject
        classData={classData}
        subject={selectedSubject}
        evaluation={evaluation}
        onBack={() => setSelectedSubject(null)}
        onUpdate={setClassData}
      />
    );
  }

  const sortedSubjects = [...classData.subjects].sort((a, b) => a.order - b.order);

  // Filtre les notes selon l'évaluation active (pour la progression affichée)
  const matchesEvaluation = (n: Note) =>
    evaluation === 'all' ? true : n.evaluation === evaluation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Saisie des notes</h1>
            <p className="text-gray-500 text-sm">{classData.name}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Sélecteur d'évaluation : maternelle/primaire = formative + sommatives ;
            secondaire = interrogations écrites (MEPE) + devoirs surveillés (NPS1/NPS2) */}
        <div className="mb-4">
          <div className="flex gap-1.5 overflow-x-auto bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setEvaluation('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                evaluation === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-600'
              }`}
            >
              Toutes
            </button>
            {evaluationsForClass(classData).map(ev => (
              <button
                key={ev.id}
                onClick={() => setEvaluation(ev.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  evaluation === ev.id ? 'bg-white shadow text-gray-800' : 'text-gray-600'
                } ${isCustomEvaluation(ev.id) ? 'border border-dashed border-amber-400' : ''}`}
              >
                {isCustomEvaluation(ev.id) ? '✨ ' : ''}{ev.label}
                {isCustomEvaluation(ev.id) && (
                  <span
                    role="button"
                    title="Retirer cette évaluation"
                    onClick={(e) => { e.stopPropagation(); removeCustomEvaluation(ev.id); }}
                    className="ml-1.5 text-red-500 font-bold"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {/* AUTRES ÉVALUATIONS : à côté des 4 évaluations EducMaster */}
            <button
              onClick={() => setShowCustomForm(v => !v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                showCustomForm ? 'bg-amber-400 text-slate-900 shadow' : 'bg-white/60 border border-amber-300 text-amber-700'
              }`}
            >
              ➕ Autres évaluations
            </button>
          </div>
          {showCustomForm && (
            <div className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-900">✨ Créer une « Autre évaluation » (à votre initiative)</p>
              <p className="text-xs text-amber-800 mt-0.5">
                En dehors des 4 évaluations EducMaster (formative + sommatives 1/2/3), vous pouvez créer vos propres
                évaluations : projet de classe, devoir maison, interrogation orale…
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <input
                  value={customEvalLabel}
                  onChange={e => setCustomEvalLabel(e.target.value)}
                  placeholder="Nom de l'évaluation (ex. Projet de classe)"
                  className="w-full p-2.5 border border-amber-300 rounded-lg text-sm bg-white"
                />
                <input
                  type="date"
                  value={customEvalDate}
                  onChange={e => setCustomEvalDate(e.target.value)}
                  className="w-full p-2.5 border border-amber-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={createCustomEvaluation} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
                  ✓ Créer l'évaluation
                </button>
                <button onClick={() => setShowCustomForm(false)} className="bg-white text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold border">
                  Annuler
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {evaluation === 'all'
              ? 'Toutes les évaluations — la note la plus prioritaire (dernière sommative) prime dans les calculs.'
              : `Saisie pour : ${evaluationsForClass(classData).find(e => e.id === evaluation)?.label}.`}
          </p>
        </div>

        {classData.students.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun élève dans cette classe</p>
            <p className="text-gray-500 text-sm mb-4">Ajoutez d'abord des élèves</p>
            <button
              onClick={() => navigate(`/class/${id}/students`)}
              className={`${colors.green} text-white px-6 py-3 rounded-lg`}
            >
              Gérer les élèves
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/*
              v45 — CHOIX DU MODE DE SAISIE.

              L'accueil et le tableau de bord annoncent « Saisir les notes :
              par matiere OU PAR PROFIL ». La saisie par profil existait bien
              (ecran « Fiches eleves ») mais n'etait accessible que depuis un
              autre menu, portant un autre nom : l'enseignant qui suivait la
              promesse « par profil » ne la trouvait nulle part ici.
              On expose donc les deux modes a l'endroit annonce.
            */}
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div
                data-testid="mode-saisie-matiere"
                className="rounded-xl border-2 border-[#006b4f] bg-[#006b4f] text-white px-3 py-3 text-center"
              >
                <p className="font-bold text-sm">Par matière</p>
                <p className="text-[11px] opacity-90">Toute la classe, une matière</p>
              </div>
              <button
                data-testid="mode-saisie-profil"
                onClick={() => navigate(`/class/${id}/profiles`)}
                className="rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-center active:bg-gray-50"
              >
                <p className="font-bold text-sm text-gray-800">Par profil</p>
                <p className="text-[11px] text-gray-500">Un élève, toutes ses matières</p>
              </button>
            </div>
            <p className="text-gray-600 mb-2">Sélectionnez une matière pour commencer la saisie :</p>
            {sortedSubjects.map((subject) => {
              const notesCount = classData.notes.filter(
                n => n.subjectId === subject.id && (n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent) && matchesEvaluation(n)
              ).length;
              const progress = classData.students.length > 0 
                ? Math.round((notesCount / classData.students.length) * 100) 
                : 0;

              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className="w-full bg-white rounded-xl shadow p-4 text-left flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-gray-800">{subject.name}</h3>
                    <p className="text-gray-500 text-sm">
                      CM /{subject.noteObtenueMax} • CP /{subject.notePerfectionnementMax}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">{progress}%</div>
                    <p className="text-gray-500 text-xs">{notesCount}/{classData.students.length} élèves</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// Note Entry by Subject - The main note entry screen with numeric keypad
function NoteEntryBySubject({ 
  classData, 
  subject, 
  evaluation = 'all' as EvaluationId | 'all',
  onBack,
  onUpdate 
}: { 
  classData: ClassData; 
  subject: Subject;
  evaluation?: EvaluationId | 'all';
  onBack: () => void;
  onUpdate: (data: ClassData) => void;
}) {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [noteObtenue, setNoteObtenue] = useState<string>('');
  const [notePerfectionnement, setNotePerfectionnement] = useState<string>('');
  const [isAbsent, setIsAbsent] = useState(false);
  const [saving, setSaving] = useState(false);
  // Champ actuellement sélectionné pour le pavé numérique
  const [focusedField, setFocusedField] = useState<'obtenue' | 'perfectionnement'>('obtenue');
  const [quickEntryMode, setQuickEntryMode] = useState(false);

  const secondaire = classData.educationType === 'secondaire';
  const coefficient = subject.coefficient ?? 1;
  const hasPerfectionnement = subject.notePerfectionnementMax > 0 && !secondaire;
  const sortedStudents = sortStudents(classData.students);
  const currentStudent = sortedStudents[currentIndex];

  // Load existing note when student changes
  // (évaluation active : note de CETTE évaluation ; sans filtre : note de référence)
  useEffect(() => {
    if (!currentStudent) return;

    const existingNote = evaluation === 'all'
      ? findBestNote(classData.notes, currentStudent.id, subject.id)
      : findNoteInEvaluation(classData.notes, currentStudent.id, subject.id, evaluation);

    if (existingNote) {
      setNoteObtenue(existingNote.noteObtenue?.toString() ?? '');
      setNotePerfectionnement(existingNote.notePerfectionnement?.toString() ?? '');
      setIsAbsent(existingNote.absent);
    } else {
      setNoteObtenue('');
      setNotePerfectionnement('');
      setIsAbsent(false);
    }
    setFocusedField('obtenue'); // toujours commencer par la note obtenue
  }, [currentIndex, currentStudent, classData.notes, subject.id, evaluation]);

  async function saveCurrentNote() {
    if (!currentStudent || !id) return;

    setSaving(true);
    try {
      // Note ciblée : celle de l'évaluation active (sans filtre : note de référence,
      // en conservant l'évaluation de la note existante).
      let existingNoteIndex = -1;
      let evaluationToSave: EvaluationId | undefined;
      if (evaluation === 'all') {
        const best = findBestNote(classData.notes, currentStudent.id, subject.id);
        if (best) existingNoteIndex = classData.notes.indexOf(best);
        evaluationToSave = best?.evaluation;
      } else {
        existingNoteIndex = classData.notes.findIndex(
          n => n.studentId === currentStudent.id && n.subjectId === subject.id && n.evaluation === evaluation
        );
        evaluationToSave = evaluation;
      }

      let newNotes: Note[];
      
      if (isAbsent) {
        const newNote: Note = {
          id: existingNoteIndex >= 0 ? classData.notes[existingNoteIndex].id : generateId(),
          studentId: currentStudent.id,
          subjectId: subject.id,
          noteObtenue: null,
          notePerfectionnement: null,
          absent: true,
          evaluation: evaluationToSave,
          updatedAt: Date.now(),
        };

        if (existingNoteIndex >= 0) {
          newNotes = [...classData.notes];
          newNotes[existingNoteIndex] = newNote;
        } else {
          newNotes = [...classData.notes, newNote];
        }
      } else {
        const newNote: Note = {
          id: existingNoteIndex >= 0 ? classData.notes[existingNoteIndex].id : generateId(),
          studentId: currentStudent.id,
          subjectId: subject.id,
          noteObtenue: noteObtenue ? parseFloat(noteObtenue) : null,
          notePerfectionnement: notePerfectionnement ? parseFloat(notePerfectionnement) : null,
          absent: false,
          evaluation: evaluationToSave,
          updatedAt: Date.now(),
        };

        if (existingNoteIndex >= 0) {
          newNotes = [...classData.notes];
          newNotes[existingNoteIndex] = newNote;
        } else {
          newNotes = [...classData.notes, newNote];
        }
      }

      const updatedClass: ClassData = {
        ...classData,
        notes: newNotes,
      };

      await saveClass(updatedClass);
      onUpdate(updatedClass);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    saveCurrentNote();
    if (currentIndex < sortedStudents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrev() {
    saveCurrentNote();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleKeypadInput(value: string, field: 'obtenue' | 'perfectionnement') {
    if (isAbsent) return;
    
    if (value === 'CLEAR') {
      if (field === 'obtenue') setNoteObtenue('');
      else setNotePerfectionnement('');
    } else if (value === 'BACKSPACE') {
      if (field === 'obtenue') {
        setNoteObtenue(noteObtenue.slice(0, -1));
      } else {
        setNotePerfectionnement(notePerfectionnement.slice(0, -1));
      }
    } else {
      const max = field === 'obtenue' ? subject.noteObtenueMax : subject.notePerfectionnementMax;
      const current = field === 'obtenue' ? noteObtenue : notePerfectionnement;
      const normalizedValue = value === ',' ? '.' : value;
      if (normalizedValue === '.' && current.includes('.')) return;
      const newValue = current === '' && normalizedValue === '.' ? '0.' : current + normalizedValue;
      const numValue = parseFloat(newValue);
      
      if (!Number.isNaN(numValue) && numValue <= max) {
        if (field === 'obtenue') setNoteObtenue(newValue);
        else setNotePerfectionnement(newValue);
      }
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingInForm = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      // Raccourci global : Ctrl+K ou F2 active/désactive le mode saisie rapide.
      if ((event.ctrlKey && event.key.toLowerCase() === 'k') || event.key === 'F2') {
        event.preventDefault();
        setQuickEntryMode(prev => !prev);
        return;
      }

      if (!quickEntryMode || isTypingInForm) return;

      const targetField: 'obtenue' | 'perfectionnement' = hasPerfectionnement ? focusedField : 'obtenue';

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        handleKeypadInput(event.key, targetField);
        return;
      }

      if (event.key === '.' || event.key === ',') {
        event.preventDefault();
        const current = targetField === 'obtenue' ? noteObtenue : notePerfectionnement;
        if (!current.includes('.')) handleKeypadInput('.', targetField);
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleKeypadInput('BACKSPACE', targetField);
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        handleKeypadInput('CLEAR', targetField);
        return;
      }

      if (event.key === 'Tab' && hasPerfectionnement) {
        event.preventDefault();
        setFocusedField(prev => prev === 'obtenue' ? 'perfectionnement' : 'obtenue');
        return;
      }

      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setIsAbsent(prev => !prev);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) handlePrev();
        else if (hasPerfectionnement && focusedField === 'obtenue') setFocusedField('perfectionnement');
        else handleNext();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setQuickEntryMode(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickEntryMode, focusedField, hasPerfectionnement, noteObtenue, notePerfectionnement, isAbsent, currentIndex, classData.notes, subject.id]);

  const progress = currentIndex + 1;
  const total = sortedStudents.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className={`${colors.green} text-white p-4 sticky top-0 z-10`}>
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="font-bold">{subject.name}</h1>
            <p className="text-emerald-100 text-sm">{progress}/{total} - {currentStudent?.nom}</p>
          </div>
          <button
            onClick={() => setQuickEntryMode(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold ${quickEntryMode ? 'bg-amber-400 text-emerald-950' : 'bg-white/20 text-white'}`}
            title="Ctrl+K ou F2"
          >
            F2
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-3 bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </header>

      {/* Student Info */}
      {currentStudent && (
        <div className="bg-white p-4 border-b">
          <p className="font-bold text-lg">{currentStudent.nom.toUpperCase()} {currentStudent.prenoms}</p>
          <p className="text-gray-500 text-sm">Matricule: {currentStudent.matricule}</p>
        </div>
      )}

      {/* Note Entry */}
      <main className="flex-1 p-4 flex flex-col">
        {quickEntryMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-amber-800 text-sm font-semibold">Mode saisie rapide au clavier activé</p>
            <p className="text-amber-700 text-xs mt-1">
              Chiffres = saisir • Tab = changer CM/CP • Entrée = CP puis élève suivant • Shift+Entrée = précédent • A = absent • Suppr = effacer • Échap/F2/Ctrl+K = quitter.
            </p>
          </div>
        )}
        {/* Note Fields */}
        {secondaire ? (
          <div className="mb-4">
            <div className={`bg-white rounded-xl p-4 border-2 ${isAbsent ? 'border-gray-200' : 'border-emerald-500'}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note obtenue /20
              </label>
              <div className={`text-4xl font-bold text-center py-4 rounded-lg ${isAbsent ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700'}`}>
                {isAbsent ? 'ABS' : noteObtenue || '-'}
              </div>
            </div>
            {/* Calcul avec coefficient */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Coefficient</p>
                <p className="text-lg font-bold text-blue-700">× {coefficient}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Total obtenu</p>
                <p className="text-lg font-bold text-emerald-700">
                  {isAbsent || !noteObtenue ? '—' : (parseFloat(noteObtenue) * coefficient).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Total possible</p>
                <p className="text-lg font-bold text-gray-700">{(20 * coefficient).toFixed(0)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid ${hasPerfectionnement ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
            <button
              type="button"
              onClick={() => setFocusedField('obtenue')}
              className={`bg-white rounded-xl p-4 border-2 text-left transition-all ${
                isAbsent
                  ? 'border-gray-200'
                  : focusedField === 'obtenue'
                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                  : 'border-gray-200'
              }`}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {hasPerfectionnement
                  ? `Critères minimaux (CM) /${subject.noteObtenueMax}`
                  : `Note /${subject.noteObtenueMax}`}
              </label>
              <div className={`text-4xl font-bold text-center py-4 rounded-lg ${isAbsent ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700'}`}>
                {isAbsent ? 'ABS' : noteObtenue || '-'}
              </div>
            </button>
            {hasPerfectionnement && (
              <button
                type="button"
                onClick={() => setFocusedField('perfectionnement')}
                className={`bg-white rounded-xl p-4 border-2 text-left transition-all ${
                  isAbsent
                    ? 'border-gray-200'
                    : focusedField === 'perfectionnement'
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-gray-200'
                }`}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note de perfectionnement (CP) /{subject.notePerfectionnementMax}
                </label>
                <div className={`text-4xl font-bold text-center py-4 rounded-lg ${isAbsent ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-700'}`}>
                  {isAbsent ? 'ABS' : notePerfectionnement || '-'}
                </div>
              </button>
            )}
          </div>
        )}

        {/* Absent Button */}
        <button
          onClick={() => setIsAbsent(!isAbsent)}
          className={`w-full py-4 rounded-xl font-semibold mb-4 ${
            isAbsent 
              ? 'bg-red-600 text-white' 
              : 'bg-white text-red-600 border-2 border-red-600'
          }`}
        >
          {isAbsent ? '✓ Élève Absent' : 'Marquer comme Absent'}
        </button>

        {/* Numeric Keypad */}
        {!isAbsent && (() => {
          // Le champ ciblé : secondaire/préscolaire = toujours "obtenue", sinon le champ sélectionné
          const target: 'obtenue' | 'perfectionnement' =
            hasPerfectionnement ? focusedField : 'obtenue';
          const targetLabel = target === 'obtenue'
            ? (hasPerfectionnement ? 'Critères minimaux (CM)' : 'Note obtenue')
            : 'Note de perfectionnement (CP)';
          return (
            <div className="bg-white rounded-xl p-4 mb-4">
              <p className="text-sm text-center mb-3">
                {hasPerfectionnement ? (
                  <>Saisie en cours : <span className={`font-bold ${target === 'obtenue' ? 'text-emerald-600' : 'text-amber-600'}`}>{targetLabel}</span>
                  <br /><span className="text-gray-400 text-xs">Touchez l'autre case pour changer de note</span></>
                ) : (
                  <span className="text-gray-500">Tapez la note</span>
                )}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeypadInput(num.toString(), target)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-2xl font-bold py-4 rounded-lg"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadInput('CLEAR', target)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold py-4 rounded-lg"
                >
                  C
                </button>
                <button
                  onClick={() => handleKeypadInput('0', target)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-2xl font-bold py-4 rounded-lg"
                >
                  0
                </button>
                <button
                  onClick={() => handleKeypadInput('.', target)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-2xl font-bold py-4 rounded-lg"
                >
                  ,
                </button>
                <button
                  onClick={() => handleKeypadInput('BACKSPACE', target)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-4 rounded-lg"
                >
                  ⌫
                </button>
              </div>
              {hasPerfectionnement && target === 'obtenue' && noteObtenue !== '' && (
                <button
                  onClick={() => setFocusedField('perfectionnement')}
                  className="w-full mt-3 bg-amber-500 text-white py-3 rounded-lg font-semibold"
                >
                  Passer à la note de perfectionnement (CP) →
                </button>
              )}
            </div>
          );
        })()}

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 || saving}
            className="bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Précédent
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === total - 1 || saving}
            className={`${colors.green} text-white py-4 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            Suivant
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}

// Export Screen
function ExportScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [lastFilename, setLastFilename] = useState('');

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  async function handleExport() {
    if (!classData) return;

    setGenerating(true);
    try {
      const { blob, filename } = await generateEducMasterExcel(classData);
      const result = await downloadExcel(blob, filename);
      if (result === 'downloaded') {
        setLastFilename(filename);
        setExportDone(true);
      } else if (result === 'shared') {
        setLastFilename(filename);
      }
      // 'cancelled' : l'utilisateur a fermé le partage, on ne fait rien
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Erreur lors de la génération du fichier Excel. Réessayez ou utilisez un autre navigateur (Chrome).');
    } finally {
      setGenerating(false);
    }
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  const notesCount = classData.notes.filter(
    n => n.noteObtenue !== null || n.notePerfectionnement !== null || n.absent
  ).length;
  const totalNotes = classData.students.length * classData.subjects.length;
  const completionRate = totalNotes > 0 ? Math.round((notesCount / totalNotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Export Excel</h1>
            <p className="text-gray-500 text-sm">{classData.name}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Progress Card */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-3">Progression de la saisie</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">{completionRate}% complété</span>
            <span className="text-gray-500 text-sm">{notesCount}/{totalNotes} notes</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div 
              className={`${completionRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full h-3 transition-all`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Format EducMaster</h3>
              <p className="text-blue-700 text-sm mt-1">
                Le fichier généré respecte exactement le format demandé par educmaster.bj :
                en-têtes fusionnés, matricules conservés avec zéros initiaux.
              </p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={generating || classData.students.length === 0}
          className={`${colors.green} text-white w-full py-4 rounded-xl font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-3`}
        >
          <Download className="w-6 h-6" />
          {generating ? 'Génération...' : 'Télécharger le fichier Excel'}
        </button>

        {classData.students.length === 0 && (
          <p className="text-red-500 text-center mt-2 text-sm">
            Ajoutez des élèves avant d'exporter
          </p>
        )}

        {/* Confirmation après téléchargement classique */}
        {exportDone && lastFilename && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500 text-white rounded-full p-1 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-800">Fichier généré ✓</h3>
                <p className="text-emerald-700 text-sm mt-1 break-all">
                  <strong>{lastFilename}</strong>
                </p>
                <p className="text-emerald-700 text-sm mt-2">
                  Retrouvez-le dans le dossier <strong>Téléchargements</strong> de votre téléphone
                  (ou dans l'application <strong>Fichiers</strong>). Vous pouvez ensuite l'importer sur educmaster.bj.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aide en cas de problème */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-1">Le téléchargement ne démarre pas ?</h3>
          <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
            <li>Autorisez les téléchargements si votre navigateur le demande.</li>
            <li>Sur téléphone, une fenêtre de partage peut s'ouvrir : choisissez « Enregistrer dans Fichiers » ou une application (WhatsApp, Drive…).</li>
            <li>Si rien ne se passe, ouvrez l'application dans <strong>Chrome</strong>.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// Statistics Screen
function StatisticsScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState('Trimestre 1');

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  // ---- Statistiques basées sur le MÊME moteur que les bulletins (barèmes /20, coefficients) ----
  const bulletins = computeBulletins(classData);
  const isSecondary = classData.educationType === 'secondaire';

  // Statistiques par matière (conversion correcte en /20, coefficient pris en compte au secondaire)
  const subjectStats = classData.subjects.map(subject => {
    const results = bulletins
      .map(b => b.results.find(r => r.subject.id === subject.id))
      .filter(r => r && r.total !== null && !r.absent);

    if (results.length === 0) {
      return { subject, average: null, max: null, min: null, count: 0 };
    }
    const values = results.map(r => (r!.total ?? 0));
    return {
      subject,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
      count: results.length,
    };
  });

  // Moyennes réelles des élèves (déjà /20, coefficients gérés par computeBulletins)
  const studentAverages = bulletins
    .filter(b => b.moyenne !== null)
    .map(b => ({ student: b.student, average: b.moyenne ?? 0, count: b.results.filter(r => r.total !== null).length }));

  const topStudents = [...studentAverages]
    .sort((a, b) => b.average - a.average)
    .slice(0, 3);

  const strugglingStudents = [...studentAverages]
    .sort((a, b) => a.average - b.average)
    .slice(0, 3);

  const subjectChartData = subjectStats.map(s => ({ name: s.subject.name, moyenne: Number((s.average ?? 0).toFixed(2)) }));
  const classAverage = studentAverages.length
    ? studentAverages.reduce((sum, s) => sum + s.average, 0) / studentAverages.length
    : 0;

  // Répartition RÉELLE filles / garçons (champ sexe) pour le trimestre en cours
  const filles = bulletins.filter(b => b.student.sexe === 'F' && b.moyenne !== null);
  const garcons = bulletins.filter(b => b.student.sexe === 'M' && b.moyenne !== null);
  const moyenneFilles = filles.length ? filles.reduce((s, b) => s + (b.moyenne ?? 0), 0) / filles.length : null;
  const moyenneGarcons = garcons.length ? garcons.reduce((s, b) => s + (b.moyenne ?? 0), 0) / garcons.length : null;
  const progressData = [
    { trim: classData.sequence, classe: Number(classAverage.toFixed(2)), filles: moyenneFilles !== null ? Number(moyenneFilles.toFixed(2)) : 0, garcons: moyenneGarcons !== null ? Number(moyenneGarcons.toFixed(2)) : 0 },
  ];

  const validatedCount = (studentId: string) => classData.subjects.filter(subject => {
    const note = findBestNote(classData.notes, studentId, subject.id);
    if (!note || note.absent) return false;
    const total = subjectTotal(note, subject);
    return total !== null && total >= 10;
  }).length;

  const distribution = isSecondary
    ? [
        { name: 'Très insuffisant', value: studentAverages.filter(s => s.average <= 7).length },
        { name: 'Insuffisant', value: studentAverages.filter(s => s.average >= 8 && s.average <= 9).length },
        { name: 'Passable', value: studentAverages.filter(s => s.average >= 10 && s.average <= 11).length },
        { name: 'Assez bien', value: studentAverages.filter(s => s.average >= 12 && s.average <= 13).length },
        { name: 'Bien', value: studentAverages.filter(s => s.average >= 14 && s.average <= 15).length },
        { name: 'Très Bien', value: studentAverages.filter(s => s.average >= 16).length },
      ]
    : [
        { name: 'Très insuffisant', value: classData.students.filter(s => validatedCount(s.id) <= 3).length },
        { name: 'Insuffisant', value: classData.students.filter(s => validatedCount(s.id) >= 4 && validatedCount(s.id) <= 5).length },
        { name: 'Satisfaisant', value: classData.students.filter(s => validatedCount(s.id) >= 6 && validatedCount(s.id) <= 7).length },
        { name: 'Très satisfaisant', value: classData.students.filter(s => validatedCount(s.id) >= 8).length },
      ];
  const pieColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];
  const honorStudents = isSecondary
    ? studentAverages.filter(s => s.average >= 12).sort((a, b) => b.average - a.average)
    : classData.students
        .map(student => ({ student, average: studentAverages.find(s => s.student.id === student.id)?.average ?? 0, count: validatedCount(student.id) }))
        .filter(s => s.count >= 8)
        .sort((a, b) => b.count - a.count || b.average - a.average);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Statistiques</h1>
            <p className="text-gray-500 text-sm">{classData.name}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Trimestre</label>
          <select
            value={selectedTrimester}
            onChange={(e) => setSelectedTrimester(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            <option>Trimestre 1</option>
            <option>Trimestre 2</option>
            <option>Trimestre 3</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Progression des moyennes</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trim" fontSize={11} />
                <YAxis domain={[0, 20]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="classe" stroke="#059669" strokeWidth={3} name="Classe" />
                <Line type="monotone" dataKey="filles" stroke="#ec4899" strokeWidth={2} name="Filles" />
                <Line type="monotone" dataKey="garcons" stroke="#3b82f6" strokeWidth={2} name="Garçons" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Performance par matière</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={9} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 20]} fontSize={11} />
                <Tooltip />
                <Bar dataKey="moyenne" fill="#059669" name="Moyenne" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Répartition des tranches</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution.filter(d => d.value > 0)} dataKey="value" nameKey="name" outerRadius={80} label>
                  {distribution.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Tableau d'honneur</h2>
          {honorStudents.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun élève éligible pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {honorStudents.map((s, index) => (
                <div key={s.student.id} className="flex items-center justify-between border-b last:border-0 py-2">
                  <span className="font-medium">{index + 1}. {s.student.nom} {s.student.prenoms}</span>
                  <span className="text-emerald-700 font-bold">{isSecondary ? `${s.average.toFixed(2)}/20` : `${'count' in s ? s.count : 0} matières`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Students */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">🏆</div>
            Meilleurs élèves
          </h2>
          {topStudents.length === 0 ? (
            <p className="text-gray-500 text-sm">Pas assez de notes</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map((s, index) => (
                <div key={s.student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium">{s.student.nom} {s.student.prenoms}</span>
                  </div>
                  <span className="text-emerald-600 font-bold">{s.average.toFixed(2)}/20</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students Needing Support */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-red-400 rounded-full flex items-center justify-center text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            À accompagner
          </h2>
          {strugglingStudents.length === 0 ? (
            <p className="text-gray-500 text-sm">Pas assez de notes</p>
          ) : (
            <div className="space-y-2">
              {strugglingStudents.map((s) => (
                <div key={s.student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{s.student.nom} {s.student.prenoms}</span>
                  <span className="text-red-600 font-bold">{s.average.toFixed(2)}/20</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject Averages */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3">Moyennes par matière</h2>
          <div className="space-y-2">
            {subjectStats.map(stat => (
              <div key={stat.subject.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-gray-700">{stat.subject.name}</span>
                {stat.average !== null ? (
                  <span className={`font-bold ${
                    stat.average >= 10 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {stat.average.toFixed(2)}/20
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Settings Screen
function SettingsScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(getSavedTheme());
  const [storageInfo, setStorageInfo] = useState<{ classes: number; localStorageKB: number; quotaKB: number | null; usedKB: number | null }>({ classes: 0, localStorageKB: 0, quotaKB: null, usedKB: null });
  const [cloudStatus, setCloudStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const classes = await getAllClasses();
        let localStorageBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) localStorageBytes += (localStorage.getItem(k) || '').length * 2;
        }
        let quotaKB: number | null = null;
        let usedKB: number | null = null;
        try {
          if (navigator.storage?.estimate) {
            const est = await navigator.storage.estimate();
            quotaKB = est.quota ? Math.round(est.quota / 1024) : null;
            usedKB = est.usage ? Math.round(est.usage / 1024) : null;
          }
        } catch { /* estimate indisponible */ }
        setStorageInfo({ classes: classes.length, localStorageKB: Math.round(localStorageBytes / 1024), quotaKB, usedKB });
        const st = await checkCloudBackupAvailability();
        setCloudStatus(st.message);
      } catch { /* silencieux */ }
    })();
  }, []);

  function handleThemeChange(nextTheme: AppTheme) {
    setTheme(nextTheme);
    saveTheme(nextTheme);
    // v38 — les deux réglages de thème restent synchronisés : ce sélecteur
    // historique écrit aussi dans les préférences d'affichage (mode nuit).
    savePreferences({ theme: nextTheme === 'dark' ? 'nuit' : nextTheme === 'system' ? 'auto' : 'clair' });
  }

  async function handleExport() {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notefacile-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      // Important mobile : libérer l'URL APRÈS un délai, sinon certains
      // navigateurs (surtout Android) annulent le téléchargement.
      setTimeout(() => {
        try { document.body.removeChild(link); } catch { /* déjà retiré */ }
        URL.revokeObjectURL(url);
      }, 4000);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as string;
          await importAllData(data);
          alert('Restauration réussie !');
          navigate('/');
        } catch (error) {
          console.error('Error importing:', error);
          alert('Fichier invalide');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function handleClearAll() {
    if (!confirm('Êtes-vous CERTAIN de vouloir tout effacer ? Cette action est IR RÉVERSIBLE.')) {
      return;
    }
    
    try {
      await clearAllData();
      alert('Toutes les données ont été effacées.');
      navigate('/');
    } catch (error) {
      console.error('Error clearing:', error);
      alert('Erreur lors de l\'effacement');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Paramètres</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Privacy Info */}
        <div className={`${colors.greenLight} border border-emerald-200 rounded-xl p-4`}>
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-800">Confidentialité</h3>
              <p className="text-emerald-700 text-sm mt-1">
                Vos données (élèves, notes, classes) sont stockées sur votre téléphone.
                Si vous activez la synchronisation cloud, elles sont chiffrées de bout en bout
                sur votre appareil avant l'envoi : le serveur ne peut jamais les lire, seul votre
                mot de passe secret permet de les déchiffrer.
              </p>
            </div>
          </div>
        </div>

        {/* Theme selector */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'system' ? <Monitor className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Apparence
          </h2>
          <p className="text-gray-500 text-sm mb-3">
            Choisissez le thème de l'application sur cet appareil.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              className={`py-3 rounded-lg border-2 font-semibold text-sm flex flex-col items-center gap-1 ${theme === 'light' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}
            >
              <Sun className="w-5 h-5" />
              Clair
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`py-3 rounded-lg border-2 font-semibold text-sm flex flex-col items-center gap-1 ${theme === 'dark' ? 'border-slate-700 bg-slate-100 text-slate-800' : 'border-gray-200 text-gray-600'}`}
            >
              <Moon className="w-5 h-5" />
              Sombre
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`py-3 rounded-lg border-2 font-semibold text-sm flex flex-col items-center gap-1 ${theme === 'system' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
            >
              <Monitor className="w-5 h-5" />
              Système
            </button>
          </div>
        </div>

        {/* Stockage & Cloud */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Stockage & Cloud
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{storageInfo.classes}</p>
              <p className="text-gray-500 text-xs">Classes</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{storageInfo.localStorageKB} <span className="text-sm">Ko</span></p>
              <p className="text-gray-500 text-xs">Stockage local</p>
            </div>
          </div>
          {storageInfo.quotaKB !== null && (
            <p className="text-xs text-gray-500 mb-2">
              Espace navigateur utilisé : {storageInfo.usedKB !== null ? `${Math.round((storageInfo.usedKB / storageInfo.quotaKB) * 100)} %` : '—'}
              {storageInfo.usedKB !== null && storageInfo.quotaKB ? ` (${Math.round(storageInfo.usedKB / 1024)} Mo / ${Math.round(storageInfo.quotaKB / 1024 / 1024)} Mo)` : ''}
            </p>
          )}
          <div className={`rounded-xl p-3 text-sm ${cloudStatus.startsWith('CloudBackup disponible') ? 'bg-emerald-50 text-emerald-700' : cloudStatus.includes('hors-ligne') ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
            <p className="font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4" /> {cloudStatus || 'Vérification de la synchronisation cloud...'}
            </p>
            {getLastSync() && (
              <p className="text-xs mt-1">
                Dernière synchronisation : {new Date(getLastSync()).toLocaleString('fr-FR')}
                {getLastSyncInfo() && (
                  <> · {getLastSyncInfo()!.classes} classe{getLastSyncInfo()!.classes > 1 ? 's' : ''} · {getLastSyncInfo()!.students} élève{getLastSyncInfo()!.students > 1 ? 's' : ''} · {getLastSyncInfo()!.sizeKo} Ko</>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sauvegarde & Restauration
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleExport}
              className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Sauvegarder (export JSON)
            </button>
            <button
              onClick={handleImport}
              className="w-full bg-blue-50 text-blue-700 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Restaurer (import JSON)
            </button>
            <Link
              to="/cloud"
              className="w-full bg-teal-50 text-teal-700 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Cloud className="w-5 h-5" />
              Synchronisation Cloud (chiffrée)
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Zone de danger
          </h2>
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full bg-red-50 text-red-700 border-2 border-red-200 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Effacer toutes les données
          </button>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <GraduationCap className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
          <h3 className="font-bold text-gray-800">Master Soutien Pédagogique</h3>
          <p className="text-gray-500 text-sm">Version 2.0.0</p>
          <p className="text-gray-400 text-xs mt-2">
            Application conçue pour les enseignants du primaire au Bénin
          </p>
        </div>
      </main>

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Effacer toutes les données ?</h2>
              <p className="text-gray-600 mb-6">
                Cette action est IR RÉVERSIBLE. Toutes vos classes, élèves et notes seront perdus.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClearAll}
                  className="bg-red-600 text-white py-3 rounded-lg font-semibold"
                >
                  Tout effacer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Screen
function TableViewScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  /*
   * v50 — LE PV EXISTE POUR CHAQUE EVALUATION.
   * Le tableau appelait `computeBulletins(classData)` sans evaluation : il
   * melangeait donc toutes les evaluations en un seul PV. Il en produit
   * desormais un par evaluation, comme le bulletin.
   */
  const [evaluation, setEvaluation] = useState<EvaluationId | null>(null);

  useEffect(() => {
    if (id) loadClass();
  }, [id]);

  async function loadClass() {
    if (!id) return;
    try {
      const data = await getClass(id);
      setClassData(data || null);
    } catch (error) {
      console.error('Error loading class:', error);
    }
  }

  if (!classData) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  const sortedStudents = sortStudents(classData.students);
  const sortedSubjects = [...classData.subjects].sort((a, b) => a.order - b.order);
  const evaluations = evaluationsForClass(classData);
  const currentEvaluation: EvaluationId = evaluation ?? evaluations[0]?.id ?? ('sommative1' as EvaluationId);
  // PV : moteur officiel (barèmes /20, coefficients) partagé avec les bulletins,
  // restreint à l'évaluation choisie (v50).
  const bulletins = computeBulletins(classData, { evaluation: currentEvaluation });
  const isPrimaire = classData.educationType !== 'secondaire';
  const nbSeuilAtteint = bulletins.filter(b => {
    const validated = b.results.filter(r => (r.total ?? 0) >= 10).length;
    return isPrimaire ? validated >= 6 : (b.moyenne ?? 0) >= 10;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Vue tableau</h1>
            <p className="text-gray-500 text-sm" data-testid="pv-classe-evaluation">
              {classData.name} — {evaluationLabel(currentEvaluation, classData.customEvaluations)}
            </p>
          </div>
        </div>
      </header>

      {/*
        v45 — EXPORT DU PV DE CLASSE.
        Cet ecran n'offrait aucun moyen d'emporter le tableau : ni PDF, ni
        impression. L'option d'impression coexiste avec le PDF (regle v41).
      */}
      {/* v50 : un PV par evaluation. */}
      <div className="p-4 pb-0 print:hidden">
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">PV de l’évaluation</p>
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="selecteur-evaluation-pv">
            {evaluations.map((ev) => {
              const count = classData.notes.filter(n =>
                n.evaluation === ev.id
                || (n.evaluation === undefined && ev.id === 'sommative1')).length;
              return (
                <button
                  key={ev.id}
                  data-testid={`eval-pv-${ev.id}`}
                  onClick={() => setEvaluation(ev.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold border ${
                    currentEvaluation === ev.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {ev.label}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 pb-0 grid grid-cols-2 gap-2 print:hidden">
        <button
          data-testid="btn-pdf-tableau"
          onClick={() => exportNotesTablePdf(
            classData,
            bulletins,
            evaluationLabel(currentEvaluation, classData.customEvaluations),
          )}
          className="bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" />
          Télécharger le PDF
        </button>
        <button
          data-testid="btn-imprimer-tableau"
          onClick={() => window.print()}
          className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Imprimer
        </button>
      </div>

      {/* Main Content */}
      <main className="p-4 overflow-x-auto">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-emerald-600 text-white">
              <tr>
                <th className="p-3 text-left">Élève</th>
                {sortedSubjects.map(subject => (
                  <th key={subject.id} className="p-3 text-center" colSpan={2}>
                    {subject.name}
                  </th>
                ))}
                <th className="p-3 text-center bg-emerald-800" rowSpan={2}>Moyenne</th>
                <th className="p-3 text-center bg-emerald-800" rowSpan={2}>
                  {isPrimaire ? 'Matières validées' : 'Matières ≥ 10'}
                </th>
                <th className="p-3 text-center bg-emerald-900" rowSpan={2}>Seuil atteint</th>
              </tr>
              <tr className="bg-emerald-700">
                <th className="p-2"></th>
                {sortedSubjects.map(subject => (
                  <Fragment key={subject.id}>
                    <th className="p-2 text-xs">Obt.</th>
                    <th className="p-2 text-xs">Perf.</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map(student => {
                const bulletin = bulletins.find(b => b.student.id === student.id);
                const validated = bulletin ? bulletin.results.filter(r => (r.total ?? 0) >= 10).length : 0;
                // Primaire : seuil officiel atteint à partir de 6 matières validées.
                // Secondaire : moyenne générale ≥ 10.
                const seuilAtteint = isPrimaire
                  ? validated >= 6
                  : (bulletin?.moyenne ?? 0) >= 10;
                return (
                  <tr key={student.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{student.nom}</p>
                      <p className="text-xs text-gray-500">{student.prenoms}</p>
                    </td>
                    {sortedSubjects.map(subject => {
                      const note = findBestNote(
                        classData.notes, student.id, subject.id
                      );
                      return (
                        <Fragment key={subject.id}>
                          <td className="p-2 text-center">
                            {note?.absent ? (
                              <span className="text-red-500 font-medium">ABS</span>
                            ) : (
                              note?.noteObtenue ?? '-'
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {note?.absent ? (
                              <span className="text-red-500 font-medium">ABS</span>
                            ) : (
                              note?.notePerfectionnement ?? '-'
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td className="p-2 text-center font-semibold">
                      {bulletin?.moyenne !== null && bulletin?.moyenne !== undefined ? bulletin.moyenne.toFixed(2) : '-'}
                    </td>
                    <td className="p-2 text-center">{validated}/{sortedSubjects.length}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${seuilAtteint ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {seuilAtteint ? 'Seuil atteint' : 'Seuil non atteint'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-gray-50 font-semibold">
                <td className="p-3" colSpan={sortedSubjects.length * 2 + 2}>
                  Seuil atteint (classe) — {isPrimaire ? 'au moins 6 matières validées' : 'moyenne ≥ 10/20'}
                </td>
                <td className="p-3 text-center text-emerald-700" colSpan={1}>
                  {nbSeuilAtteint}/{sortedStudents.length}
                  <span className="block text-xs text-gray-500">
                    {sortedStudents.length ? Math.round((nbSeuilAtteint / sortedStudents.length) * 1000) / 10 : 0} %
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>
    </div>
  );
}

// Main App Component
function AppContent({ onActivated }: { onActivated?: () => void }) {
  // RETOUR INTELLIGENT : on mémorise chaque page visitée pour que le bouton
  // « Retour » revienne à la page précédente et jamais de force à l'accueil.
  const location = useLocation();
  useEffect(() => { pushNavEntry(location.pathname); }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/activation" element={<SubscriptionActivationScreen onActivated={onActivated} />} />
      <Route path="/equipe" element={<AdminDashboardScreen loginMode="team" />} />
      <Route path="/admin-dashboard" element={<AdminDashboardScreen loginMode="owner" />} />
      <Route path="/class/new" element={<ClassFormScreen />} />
      <Route path="/class/:id" element={<ClassDashboardScreen />} />
      <Route path="/class/:id/edit" element={<ClassFormScreen />} />
      <Route path="/class/:id/students" element={<StudentsScreen />} />
      <Route path="/class/:id/subjects" element={<SubjectsScreen />} />
      <Route path="/class/:id/profiles" element={<StudentProfileEntry />} />
      <Route path="/class/:id/bulletins" element={<BulletinsScreen />} />
      {/* v67 — studio photo d’identité EducMaster, par école et par classe. */}
      <Route path="/class/:id/photos-educmaster" element={<EducMasterPhotosScreen />} />
      <Route path="/class/:id/presences" element={<AttendanceScreen />} />
      <Route path="/class/:id/bilan-annuel" element={<AnnualReportScreen />} />
      <Route path="/class/:id/entry" element={<NoteEntryScreen />} />
      <Route path="/class/:id/export" element={<ExportScreen />} />
      <Route path="/class/:id/statistics" element={<StatisticsScreen />} />
      <Route path="/class/:id/student-analytics" element={<StudentAnalytics />} />
      <Route path="/class/:id/table" element={<TableViewScreen />} />
      <Route path="/class/:id/programme" element={<ClassDocumentsScreen type="programme" />} />
      <Route path="/class/:id/planification-annuelle" element={<ClassDocumentsScreen type="planification" />} />
      <Route path="/programmes" element={<ProgrammesScreen />} />
      <Route path="/videos" element={<VideosScreen />} />
      <Route path="/annonces" element={<AnnoncesScreen />} />
      <Route path="/publicites" element={<PublicitesScreen />} />
      <Route path="/boite-outils" element={<TeacherToolkitScreen />} />
      <Route path="/fiches-pedagogiques" element={<FichesPedagogiquesScreen />} />
      <Route path="/fiches-preparation" element={<PrepFichesScreen />} />
      <Route path="/admin-fiches-preparation" element={<AdminPrepFichesScreen />} />
      <Route path="/correspondance" element={<CorrespondenceScreen />} />
      <Route path="/calendrier-scolaire" element={<SchoolCalendarScreen />} />
      <Route path="/verify" element={<VerifyBulletinScreen />} />
      <Route path="/class-statistics" element={<ClassStatistics />} />
      <Route path="/grands-rendez-vous" element={<ActivityEventsScreen />} />
      <Route path="/generateur-fiches-ia" element={<ComingSoonScreen title="Générateur IA de fiches" description="La préparation de fiches par IA est temporairement indisponible pendant son développement. Vous pouvez créer vos fiches manuellement dans « Fiches pédagogiques ». L’IA locale reste disponible dans l’Assistant IA conversationnel pour les questions et les explications, mais ne rédige pas de fiche complète." />} />
      <Route path="/horloge" element={<ClockAlarmScreen />} />
      <Route path="/reglages" element={<DisplaySettingsScreen />} />
      <Route path="/outils-enseignant" element={<TeacherToolsScreen />} />
      <Route path="/bibliotheque" element={<LibraryScreen />} />
      <Route path="/assistant-ia" element={<ComingSoonScreen title="Préparation de fiches par IA" description="Cette fonction est temporairement hors service pendant son développement. Pour le moment, préparez vos fiches manuellement. L’IA locale reste accessible dans l’Assistant IA conversationnel pour les questions, explications et reformulations, pas pour générer une fiche." />} />
      <Route path="/assistant-ia-en-ligne" element={<AIOnlineChatScreen />} />
      <Route path="/administration-scolaire" element={<SchoolAdminToolkitScreen />} />
      <Route path="/orientation-post-bac" element={<OrientationPostBacScreen />} />
      <Route path="/orientation-scolaire" element={<OrientationScolaireScreen />} />
      {/* v39 — routes résolues par CHEMIN et non par index : l'ajout du module
          « Éducation à la vie » décalait les index et cassait les modules. */}
      <Route path="/enrolement" element={<ModuleScreen module={findModule('/enrolement')!} />} />
      {/* v64 — ESPACE ÉCOLE (multi-classes) et LANGUES AU PRIMAIRE. */}
      <Route path="/mon-ecole" element={<ModuleScreen module={findModule('/mon-ecole')!} />} />
      <Route path="/espace-ecole" element={<SchoolSpaceScreen />} />
      <Route path="/espace-ecole/classes" element={<SchoolSpaceScreen />} />
      <Route path="/espace-ecole/abonnement" element={<SchoolSpaceScreen />} />
      <Route path="/langues" element={<ModuleScreen module={findModule('/langues')!} />} />
      <Route path="/francais-gco" element={<FrenchGCOScreen />} />
      <Route path="/anglais-primaire" element={<EnglishPrimaryScreen />} />
      <Route path="/orientation" element={<ModuleScreen module={findModule('/orientation')!} />} />
      <Route path="/preparation-classe" element={<ModuleScreen module={findModule('/preparation-classe')!} />} />
      {/* v68 — ressources de poésie, chant, comptine et conte hors-ligne. */}
      <Route path="/arts-oraux" element={<ModuleScreen module={findModule('/arts-oraux')!} />} />
      <Route path="/poesies-contes" element={<OralArtsScreen />} />
      <Route path="/education-vie" element={<ModuleScreen module={findModule('/education-vie')!} />} />
      <Route path="/education-vie/:domaine" element={<LifeEducationScreen />} />
      <Route path="/cantine" element={<ModuleScreen module={findModule('/cantine')!} />} />
      <Route path="/cantine/effectifs" element={<CanteenEnrollmentScreen />} />
      <Route path="/cantine/payeurs-mangeurs" element={<CanteenPayerEatersScreen />} />
      <Route path="/chronometre" element={<ChronoScreen />} />
      <Route path="/calculatrice" element={<CalculatorScreen />} />
      <Route path="/numeriser" element={<ScannerScreen />} />
      <Route path="/conditions" element={<TermsScreen />} />
      <Route path="/suivi-enfant" element={<ParentSpaceScreen />} />
      <Route path="/suivi-enfant/codes" element={<ParentCodeScreen />} />
      {/*
        v51 — CORRECTIF : ces deux modules etaient declares dans
        l'arborescence mais n'avaient AUCUNE route. Leur page d'accueil
        s'affichait donc entierement vide. Les sous-modules, eux,
        fonctionnaient : seule la page de presentation manquait.
      */}
      <Route path="/outils" element={<ModuleScreen module={findModule('/outils')!} />} />
      <Route path="/registres" element={<ModuleScreen module={findModule('/registres')!} />} />
      <Route path="/cahier-journal" element={<CahierJournalScreen />} />
      <Route path="/registre-matricule" element={<RegistreMatriculeScreen />} />
      {/* v52 — les 8 nouveaux modules de vie scolaire. */}
      {/* v58 — Le guide de l'utilisateur (manuel + tutoriels video). */}
      <Route path="/guide" element={<ModuleScreen module={findModule('/guide')!} />} />
      <Route path="/guide/manuel" element={<ManualScreen />} />
      <Route path="/guide/tutoriels" element={<TutorialsScreen />} />
      <Route path="/vie-scolaire" element={<ModuleScreen module={findModule('/vie-scolaire')!} />} />
      <Route path="/registre-appel" element={<AttendanceRegisterScreen />} />
      <Route path="/paiements" element={<SchoolFeesScreen />} />
      <Route path="/livret-scolaire" element={<SchoolBookletScreen />} />
      <Route path="/manuels-materiel" element={<SchoolInventoryScreen />} />
      <Route path="/emploi-du-temps" element={<TimetableScreen />} />
      <Route path="/remediation" element={<RemediationScreen />} />
      <Route path="/sauvegarde" element={<BackupScreen />} />
      <Route path="/conseil-classe" element={<ClassCouncilScreen />} />
      <Route path="/cantine/simulateur" element={<CanteenSimulatorScreen />} />
      <Route path="/cantine/menus" element={<CanteenMenuScreen />} />
      <Route path="/cantine/stocks" element={<CanteenStockScreen />} />
      <Route path="/mes-images" element={<ModuleScreen module={findModule('/mes-images')!} />} />
      <Route path="/mes-images/generateur" element={<ImageGeneratorScreen />} />
      <Route path="/mes-images/banque" element={<ImageBankScreen />} />
      <Route path="/mes-images/signature" element={<SignatureSettingsScreen />} />
      <Route path="/comptabilite" element={<ModuleScreen module={findModule('/comptabilite')!} />} />
      <Route path="/comptabilite/journal" element={<AccountingScreen />} />
      <Route path="/comptabilite/budget" element={<SchoolBudgetScreen />} />
      <Route path="/espace-partenariat" element={<ModuleScreen module={findModule('/espace-partenariat')!} />} />
      <Route path="/enrolement-eleves" element={<EnrollmentScreen />} />
      <Route path="/liste-pdf-excel" element={<StudentListPdfScreen />} />
      <Route path="/enrolement-personnel" element={<StaffEnrollmentScreen />} />
      <Route path="/class/:id/statistiques-disciplines" element={<SubjectStatisticsScreen />} />
      <Route path="/encyclopedie" element={<KnowledgeHubScreen />} />
      <Route path="/dictionnaire" element={<KidsDictionaryScreen />} />
      <Route path="/formations" element={<MoocScreen />} />
      <Route path="/formations/studio" element={<MoocCreatorScreen />} />
      <Route path="/cours" element={<CoursesScreen />} />
      <Route path="/cours-en-ligne" element={<Navigate to="/cours" replace />} />
      <Route path="/plateforme-cours" element={<CourseMarketplaceScreen />} />
      <Route path="/admin-cours" element={<AdminCourseEditorScreen />} />

      <Route path="/support" element={<SupportScreen />} />
      <Route path="/cloud" element={<CloudScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  );
}

function AppGate() {
  const [activated, setActivated] = useState(isActivated());
  const [hash, setHash] = useState(window.location.hash || '#/');
  /*
   * v55 — ESSAI GRATUIT DE 6 HEURES.
   * Un prospect sans code peut utiliser l'application pendant 6 h. On
   * reevalue l'etat chaque minute : l'essai doit se fermer de lui-meme,
   * sans attendre que l'utilisateur recharge la page.
   */
  const [trial, setTrial] = useState(() => trialStatus());
  // Réévalue les sessions locales aussi quand une session expire dans un autre onglet.
  const [, setSessionTick] = useState(0);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTrial(trialStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setSessionTick((tick) => tick + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const route = hash.replace(/^#/, '').split('?')[0] || '/';
  /*
   * v48 — L'ESPACE PARENTS EST PUBLIC.
   *
   * Un parent d'eleve n'est PAS un abonne : il ne doit ni payer les
   * 999/1500 FCFA de l'enseignant, ni disposer d'un code d'acces
   * enseignant pour consulter le dossier de son propre enfant. Sa
   * securite ne repose pas sur l'abonnement mais sur le chiffrement du
   * dossier et le code de rattachement remis par l'ecole.
   *
   * Attention : seule '/suivi-enfant' est publique. La generation des
   * codes ('/suivi-enfant/codes') releve de l'enseignant et reste donc
   * derriere l'abonnement — elle est exclue plus bas.
   */
  const publicRoutes = ['/activation', '/verify', '/admin-dashboard', '/equipe', '/suivi-enfant'];
  // Les outils de codes parents restent réservés aux enseignants abonnés.
  const isTeacherParentTool = route === '/suivi-enfant/codes' || route.startsWith('/suivi-enfant/codes/');
  const adminRoutes = ['/admin-dashboard', '/equipe', '/admin-cours', '/admin-fiches-preparation'];
  const isAdminRoute = adminRoutes.some((path) => route === path || route.startsWith(`${path}/`));
  const adminWorkspaceAllowed = isAdminRoute && isAnyAdminSession();
  const isPublicRoute = (publicRoutes.some((path) => route === path || route.startsWith(`${path}/`)) && !isTeacherParentTool)
    || adminWorkspaceAllowed;
  // L'essai en cours ouvre l'application au même titre qu'un abonnement.
  const onTrial = trial.active;
  const canOpen = activated || onTrial || isPublicRoute;
  const openHashRoute = (path: string) => {
    window.location.hash = `#${path}`;
    setHash(`#${path}`);
  };

  if (!canOpen) {
    return (
      <AccessGate
        onActivated={() => setActivated(true)}
        onTrialStarted={() => setTrial(trialStatus())}
        onOpenTeam={() => openHashRoute('/equipe')}
        onOpenPrincipal={() => openHashRoute('/admin-dashboard')}
      />
    );
  }

  // TARIFICATION (v31) : la formule ESSENTIEL (999 FCFA/an) ne donne accès
  // qu'à l'enrôlement des élèves et à l'importation des notes. Toute autre
  // fonction affiche l'écran de mise à niveau vers COMPLET (1500 FCFA/an).
  // v64 : exception pour la page de DÉCOUVERTE de l'Espace École — c'est
  // là que s'affichent les offres 6000/10000 F et le champ de saisie du
  // code École ; la bloquer empêcherait justement de s'abonner.
  const plan = getActivationChrono().plan;
  const onSchoolPage = isSchoolDiscoveryPath(route);
  if (activated && plan === 'essentiel' && !isPublicRoute && !onSchoolPage && !isAllowedForEssentiel(route)) {
    return <UpgradeScreen blockedPath={route} />;
  }

  /*
   * v55 — PERIMETRE DE L'ESSAI : equivalent du plan COMPLET.
   * Les 4 modules de gestion (plan PRO) restent fermes pendant l'essai :
   * la version d'essai doit donner envie, pas tout offrir. Le prospect
   * decouvre ainsi l'existence de la formule Pro.
   */
  if (!activated && onTrial && !isPublicRoute && isProPath(route)) {
    return <UpgradeScreen blockedPath={route} targetPlan="pro" />;
  }

  /*
   * TARIFICATION v53 — LES 4 MODULES DE GESTION (2500 FCFA/an).
   * Registres officiels, vie scolaire, boîte à outils et génération des
   * dossiers parents relèvent du plan PRO. Un plan COMPLET conserve
   * INTÉGRALEMENT le périmètre qu'il avait auparavant : ces modules sont
   * des ajouts des versions v48 à v52, jamais des fonctions retirées.
   *
   * v64 : les formules ÉCOLE (6000/10000 F) incluent tout le Pro —
   * hasProPerimetre() les laisse donc passer au même titre.
   */
  if (activated && !hasProPerimetre(plan) && !isPublicRoute && isProPath(route)) {
    return <UpgradeScreen blockedPath={route} targetPlan="pro" />;
  }

  return (
    <>
      {onTrial && <TrialBanner status={trial} />}
      <SectionGuide />
      <AppContent onActivated={() => setActivated(true)} />
    </>
  );
}

function PrepFicheCloudSyncBootstrap() {
  useEffect(() => {
    let active = true;
    const run = () => {
      if (!active || (typeof navigator !== 'undefined' && navigator.onLine === false)
        || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      void syncPublishedPrepFichesFromCloud().catch(() => { /* l’écran des fiches affichera une erreur utile si nécessaire */ });
    };
    const startTimer = window.setTimeout(run, 1200);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      active = false;
      window.clearTimeout(startTimer);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);
  return null;
}

export default function App() {
  /**
   * v38 — MODE NUIT UNIFIÉ.
   * Auparavant, cet effet réappliquait l'ancien thème (`utils/theme`) au montage
   * et ÉCRASAIT le mode nuit choisi dans les Réglages : l'utilisateur perdait son
   * réglage à chaque rechargement. Les préférences d'affichage sont désormais la
   * seule source de vérité, et la bascule automatique est réévaluée chaque minute.
   */
  useEffect(() => {
    applyDisplayTheme();
    const id = window.setInterval(() => applyDisplayTheme(), 60000);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyDisplayTheme();
    media?.addEventListener?.('change', onChange);
    return () => {
      window.clearInterval(id);
      media?.removeEventListener?.('change', onChange);
    };
  }, []);

  return (
    <HashRouter>
      <PrepFicheCloudSyncBootstrap />
      {/* v47 : bandeau nominatif « LICENCE : <titulaire> » sur chaque page. */}
      <LicenceBanner />
      {/*
        v60 : le bandeau de mise a jour est monte au niveau GLOBAL, pour
        etre visible y compris sur l'ecran d'acces. Un utilisateur dont
        l'abonnement a expire doit lui aussi pouvoir recevoir la nouvelle
        version.
      */}
      <UpdateBanner />
      <OfflineBanner />
      <AnnouncementTicker />
      <InstallPrompt />
      <AppGate />
    </HashRouter>
  );
}
