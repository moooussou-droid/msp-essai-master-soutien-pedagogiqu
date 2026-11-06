import { useEffect, useMemo, useState } from 'react';
import { trialStatus, resetTrial, TRIAL_HOURS } from '../utils/trial';
import { Link, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, KeyRound, LogOut, MessageCircle, Plus, ShieldCheck,
  Trash2, Users, Settings, FileText, Activity, Copy, RefreshCw, Wrench, Lock, Wallet, Database, Building2,
} from 'lucide-react';
import { ADMIN_PASSWORD } from '../utils/adminConfig';
import { backupCredentials, deleteCode, isRevoked, purgeTechnical, restoreCode, revokeCode } from '../utils/credentialsVault';
import { generateSimpleCodes, formatSimpleCode, cleanSimpleCode, isAccessCode, codePrefixOfPlan, type SubscriptionPlan, daysRemaining, formatDateFr, expiresAtFrom } from '../utils/simpleCode';
import { PLANS } from '../utils/subscription';
import { openWhatsApp } from '../utils/contact';
import { copyText } from '../utils/clipboard';
import ResourceFiles from './ResourceFiles';
import { ResourceCategory } from '../utils/resourcesDB';
import { loadOrientationExtras, saveOrientationExtras, OrientationDomain, OrientationExtraInfo } from '../utils/orientation';
import { CourseOffer, loadCourses, saveCourses } from '../utils/courseMarketplace';
import AdminCultivonsCourses from './AdminCultivonsCourses';
import MoocModerationPanel from './MoocModerationPanel';
import { clearAdminSession, getAdminSession, isPrincipalAdminSession, isTeamAdminSession, saveAdminSession } from '../utils/adminSession';
import PaymentsAdminPanel from './PaymentsAdminPanel';
import SuperAdminDataPanel from './SuperAdminDataPanel';
import SchoolTransferPanel from './SchoolTransferPanel';

type AdminTab = 'resources' | 'team' | 'access' | 'paiements' | 'donnees' | 'etablissement' | 'orientation' | 'courses' | 'technique' | 'governance' | 'support';
type AdminRole =
  | 'Super Administrateur'
  | 'Gestionnaire Technique'
  | 'Responsable Ressources'
  | 'Responsable Annonces'
  | 'Modérateur'
  | 'Support';

/**
 * GOUVERNANCE (v35) — Fonctions RÉSERVÉES aux Super Administrateurs :
 *  - nomination / suspension / retrait des membres de l'équipe ;
 *  - génération et envoi des codes d'accès (clients et administrateurs).
 * Tout autre membre n'accède QU'AUX onglets liés à sa responsabilité.
 */
export const SUPER_ADMIN_ONLY: AdminTab[] = ['team', 'access', 'paiements', 'donnees'];

export function isSuperAdmin(role: AdminRole): boolean {
  return role === 'Super Administrateur';
}

interface AdminMember {
  id: string;
  name: string;
  role: AdminRole;
  phone: string;
  email: string;
  permissions: string[];
  active: boolean;
  createdAt: number;
  /** Code personnel (6 chiffres) donné par l'administrateur principal : permet
   *  d'entrer dans l'espace administrateur SANS le code général. */
  accessCode?: string;
  accessCodeCreatedAt?: number;
  accessCodeExpiresAt?: number;
}

interface GeneratedCredential {
  id: string;
  owner: string;
  type: 'admin' | 'user';
  value: string;
  createdAt: number;
  /** Date d'expiration du code : création + 1 an (chrono). */
  expiresAt?: number;
  /** Formule d'abonnement du code client : essentiel (999) ou complet (1500). */
  plan?: SubscriptionPlan;
}

const TEAM_KEY = 'msp_admin_team';
const ADMIN_PASSWORDS_KEY = 'msp_generated_admin_passwords';

const RESOURCE_CATEGORIES: { key: ResourceCategory; label: string; accent: 'emerald' | 'red' | 'amber' | 'blue' }[] = [
  { key: 'programmes', label: 'Programmes d’études', accent: 'emerald' },
  { key: 'videos', label: 'Vidéos des cours', accent: 'red' },
  { key: 'annonces', label: 'Annonces & Recrutement', accent: 'amber' },
  { key: 'publicites', label: 'Publicités', accent: 'blue' },
];

/** Onglets accessibles selon le rôle (un administrateur ne voit que SES fonctions). */
const TAB_ACCESS: Record<AdminTab, AdminRole[]> = {
  // Chaque membre n'accède QU'AUX fonctions de sa responsabilité (v35).
  resources: ['Super Administrateur', 'Responsable Ressources', 'Responsable Annonces'],
  team: ['Super Administrateur'],                 // RÉSERVÉ : nomination des membres
  access: ['Super Administrateur'],               // RÉSERVÉ : génération des codes d'accès
  paiements: ['Super Administrateur'],            // RÉSERVÉ v38 : paiements et déverrouillages
  donnees: ['Super Administrateur'],              // RÉSERVÉ v39 : modification de toute information
  etablissement: ['Super Administrateur'],        // RÉSERVÉ v43 : transfert d'établissement
  orientation: ['Super Administrateur', 'Responsable Ressources'],
  courses: ['Super Administrateur', 'Responsable Ressources', 'Modérateur'],
  technique: ['Super Administrateur', 'Gestionnaire Technique'],
  governance: ['Super Administrateur'],
  support: ['Support'],
};

const TEAM_ROLES: AdminRole[] = [
  'Gestionnaire Technique', 'Responsable Ressources', 'Responsable Annonces', 'Modérateur', 'Support',
];

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  'Super Administrateur': [
    'Nomination des membres de l’équipe', 'Génération des codes d’accès',
    'Ressources', 'Annonces', 'Publicités', 'Cours', 'Orientation', 'Maintenance technique',
  ],
  'Gestionnaire Technique': [
    'Maintenance technique', 'Sauvegardes et restauration', 'Diagnostic de l’application',
    'Suivi du stockage', 'Purge du cache / mises à jour', 'Assistance technique',
  ],
  'Responsable Ressources': ['Programmes d’études', 'Vidéos', 'Fiches pédagogiques', 'Cours en ligne', 'Orientation'],
  'Responsable Annonces': ['Annonces', 'Recrutement', 'Validation des opportunités', 'Publicités'],
  'Modérateur': ['Vérification contenus', 'Signalements', 'Qualité pédagogique', 'Modération des cours'],
  'Support': ['Assistance utilisateurs', 'WhatsApp', 'Formation'],
};

/** Description du poste, affichée dans l'équipe de gouvernance. */
const ROLE_MISSION: Record<AdminRole, string> = {
  'Super Administrateur': 'Pilote l’application : nomme les membres de l’équipe et génère les codes d’accès.',
  'Gestionnaire Technique': 'Veille au bon fonctionnement technique : sauvegardes, diagnostic, stockage, mises à jour et cache.',
  'Responsable Ressources': 'Publie et met à jour les programmes, vidéos, fiches et cours en ligne.',
  'Responsable Annonces': 'Gère les annonces, le recrutement et les publicités partenaires.',
  'Modérateur': 'Contrôle la qualité et la conformité des contenus publiés.',
  'Support': 'Accompagne les enseignants utilisateurs au quotidien.',
};

function defaultOwnerMember(): AdminMember {
  return {
    id: 'owner',
    name: 'Administrateur principal',
    role: 'Super Administrateur',
    phone: '+22963261382',
    email: '',
    permissions: ROLE_PERMISSIONS['Super Administrateur'],
    active: true,
    createdAt: Date.now(),
  };
}

function loadTeam(): AdminMember[] {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const members: AdminMember[] = parsed
          .filter((candidate: any) => candidate && typeof candidate === 'object')
          .map((candidate: any, index: number) => {
            const id = typeof candidate.id === 'string' ? candidate.id : `admin-legacy-${index}`;
            let role: AdminRole = Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, candidate.role)
              ? candidate.role as AdminRole
              : 'Support';
            // Le rôle propriétaire n'est jamais attribuable à un code de membre.
            if (id !== 'owner' && role === 'Super Administrateur') role = 'Support';
            if (id === 'owner') role = 'Super Administrateur';
            return {
              ...candidate,
              id,
              name: typeof candidate.name === 'string' ? candidate.name : 'Membre de l’équipe',
              role,
              phone: typeof candidate.phone === 'string' ? candidate.phone : '',
              email: typeof candidate.email === 'string' ? candidate.email : '',
              permissions: ROLE_PERMISSIONS[role],
              active: candidate.active !== false,
              createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
            } as AdminMember;
          });
        const owner = members.find((member) => member.id === 'owner') || defaultOwnerMember();
        return [owner, ...members.filter((member) => member.id !== 'owner')];
      }
    }
  } catch {
    // Données locales invalides : repartir avec le compte principal par défaut.
  }
  return [defaultOwnerMember()];
}

function saveTeam(team: AdminMember[]) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  // v36 : copie de sécurité immédiate — l'équipe et ses codes survivent aux
  // mises à jour de l'application.
  backupCredentials();
}

function loadCredentials(): GeneratedCredential[] {
  try {
    const raw = localStorage.getItem(ADMIN_PASSWORDS_KEY);
    if (raw) {
      const items = JSON.parse(raw) as GeneratedCredential[];
      // Reprise : les codes créés avant le chrono / la tarification reçoivent
      // une expiration (+1 an) et la formule Complet (accès conservé).
      return items.map((it) => ({
        ...it,
        expiresAt: typeof it.expiresAt === 'number' ? it.expiresAt : expiresAtFrom(it.createdAt || Date.now()),
        plan: it.plan || 'complet',
      }));
    }
  } catch {
    // ignore invalid data
  }
  return [];
}

function saveCredentials(items: GeneratedCredential[]) {
  localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(items));
}


/** Informations techniques de l'application (poste Gestionnaire Technique, v35). */
function readTechInfo() {
  let storage = 'indisponible';
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      total += k.length + (localStorage.getItem(k) || '').length;
    }
    storage = total > 1048576 ? `${(total / 1048576).toFixed(2)} Mo` : `${Math.round(total / 1024)} Ko`;
  } catch { /* stockage inaccessible */ }
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    cache: 'master-soutien-v36',
    sw: 'serviceWorker' in navigator ? 'actif (mode hors-ligne disponible)' : 'non pris en charge',
    display: standalone ? 'Application installée (plein écran)' : 'Navigateur',
    online: navigator.onLine,
    storage,
  };
}

export default function AdminDashboardScreen({ loginMode = 'team' }: { loginMode?: 'owner' | 'team' }) {
  const navigate = useNavigate();
  const goBack = useSmartBack('/');
  const getSessionForMode = () => {
    const raw = getAdminSession();
    if (loginMode === 'owner') return raw === 'owner' ? 'owner' : '';
    if (raw?.startsWith('member:') && isTeamAdminSession()) return raw.slice('member:'.length);
    return '';
  };
  const [sessionId, setSessionId] = useState<string>(getSessionForMode);
  const [unlocked, setUnlocked] = useState<boolean>(() => getSessionForMode() !== '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AdminTab>('resources');
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory>('programmes');
  const [team, setTeam] = useState<AdminMember[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<AdminRole>('Responsable Ressources');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [credentials, setCredentials] = useState<GeneratedCredential[]>([]);
  const [revokedTick, setRevokedTick] = useState(0);
  const [credentialOwner, setCredentialOwner] = useState('');
  const [codePlan, setCodePlan] = useState<SubscriptionPlan>('complet');
  /* v55 : etat de l'essai gratuit, rafraichi apres reinitialisation. */
  const [essaiTick, setEssaiTick] = useState(0);
  const essaiInfo = useMemo(() => {
    const st = trialStatus();
    if (!st.exists) return 'Aucun essai lancé sur cet appareil.';
    if (st.active) return `Essai en cours — il reste ${st.hours} h ${String(st.minutes).padStart(2, '0')}.`;
    return 'Essai terminé sur cet appareil.';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essaiTick]);
  const [orientationExtras, setOrientationExtras] = useState<OrientationExtraInfo[]>([]);
  const [orientationTitle, setOrientationTitle] = useState('');
  const [orientationSeries, setOrientationSeries] = useState('');
  const [orientationDomain, setOrientationDomain] = useState<OrientationDomain>('scientifique');
  const [orientationSubjects, setOrientationSubjects] = useState('');
  const [orientationStudies, setOrientationStudies] = useState('');
  const [orientationCareers, setOrientationCareers] = useState('');
  const [orientationAdvice, setOrientationAdvice] = useState('');
  const [courses, setCourses] = useState<CourseOffer[]>([]);

  const [teamLoaded, setTeamLoaded] = useState(false);

  useEffect(() => {
    setTeam(loadTeam());
    setTeamLoaded(true);
    setCredentials(loadCredentials());
    setOrientationExtras(loadOrientationExtras());
    setCourses(loadCourses());
  }, []);

  function login() {
    const input = password.trim();
    if (loginMode === 'owner') {
      if (input === ADMIN_PASSWORD) {
        setSessionId('owner');
        saveAdminSession('owner');
        setUnlocked(true);
        setError('');
        setTab('resources');
      } else {
        setError('Mot de passe principal incorrect.');
      }
      return;
    }

    if (!teamLoaded) return;
    const code = cleanSimpleCode(input);
    if (code.length !== 6) {
      setError('Saisissez votre code personnel à 6 chiffres.');
      return;
    }
    const member = team.find((candidate) => {
      if (candidate.id === 'owner' || !candidate.active || !candidate.accessCode) return false;
      if (cleanSimpleCode(candidate.accessCode) !== code) return false;
      return !candidate.accessCodeExpiresAt || Date.now() <= candidate.accessCodeExpiresAt;
    });
    if (!member) {
      setError("Code d'équipe invalide ou expiré. Vérifiez les 6 chiffres reçus de l'administrateur principal.");
      return;
    }

    setSessionId(member.id);
    saveAdminSession(`member:${member.id}`);
    setUnlocked(true);
    setError('');
    const memberRole: AdminRole = member.role === 'Super Administrateur' ? 'Support' : member.role;
    const first = (Object.keys(TAB_ACCESS) as AdminTab[])
      .filter((tabId) => !SUPER_ADMIN_ONLY.includes(tabId))
      .find((tabId) => (TAB_ACCESS[tabId] || []).includes(memberRole));
    setTab(first ?? 'support');
  }

  /** Administrateur actuellement connecté (principal ou membre de l'équipe). */
  const currentAdmin = sessionId === 'owner'
    ? team.find((member) => member.id === 'owner')
    : team.find((member) => member.id === sessionId);
  const currentRole: AdminRole = sessionId === 'owner' && isPrincipalAdminSession()
    ? 'Super Administrateur'
    : (currentAdmin?.role === 'Super Administrateur' ? 'Support' : currentAdmin?.role ?? 'Support');
  const superAdmin = loginMode === 'owner' && sessionId === 'owner' && isPrincipalAdminSession();

  function canAccess(tabId: AdminTab): boolean {
    if (SUPER_ADMIN_ONLY.includes(tabId) && !superAdmin) return false;
    return (TAB_ACCESS[tabId] || []).includes(currentRole);
  }
  const allowedTabs = useMemo(
    () => (Object.keys(TAB_ACCESS) as AdminTab[]).filter((tabId) => canAccess(tabId)),
    [currentRole, superAdmin],
  );
  const visibleResourceCategories = useMemo(
    () => RESOURCE_CATEGORIES.filter((category) => {
      if (superAdmin) return true;
      if (category.key === 'annonces' || category.key === 'publicites') return currentRole === 'Responsable Annonces';
      return currentRole === 'Responsable Ressources';
    }),
    [currentRole, superAdmin],
  );

  useEffect(() => {
    if (teamLoaded && unlocked && allowedTabs.length > 0 && !allowedTabs.includes(tab)) {
      setTab(allowedTabs[0]);
    }
  }, [teamLoaded, unlocked, allowedTabs, tab]);

  useEffect(() => {
    if (!teamLoaded) return;
    const nextSession = getSessionForMode();
    setSessionId(nextSession);
    setUnlocked(nextSession !== '');
  }, [loginMode, teamLoaded]);

  /* ---- Poste Gestionnaire Technique (v35) : diagnostic et maintenance ---- */
  const [techInfo, setTechInfo] = useState(() => readTechInfo());

  function techRefreshDiagnostic() { setTechInfo(readTechInfo()); }

  async function techPurgeCache() {
    if (!confirm('Purger le cache et recharger la dernière version ?\n\nAucune donnée des enseignants ne sera supprimée, et TOUS LES CODES D\'ACCÈS (utilisateurs et équipe) SONT CONSERVÉS. Le modèle IA local téléchargé sera aussi effacé et devra être retéléchargé pour un usage hors ligne.')) return;
    try {
      // v36 : on sauvegarde les codes, puis on ne purge que le temporaire.
      backupCredentials();
      purgeTechnical();
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs || []).map((r) => r.update()));
    } catch { /* cache indisponible : le rechargement suffit */ }
    window.location.reload();
  }

  function techExportDiagnostic() {
    const info = readTechInfo();
    const lines = [
      'RAPPORT DE DIAGNOSTIC — Master Soutien Pédagogique',
      `Date : ${new Date().toLocaleString('fr-FR')}`,
      `Version du cache : ${info.cache}`,
      `Service Worker : ${info.sw}`,
      `Mode d'affichage : ${info.display}`,
      `Connexion : ${info.online ? 'en ligne' : 'hors-ligne'}`,
      `Stockage local utilisé : ${info.storage}`,
      `Navigateur : ${navigator.userAgent}`,
      `Membres actifs de l'équipe : ${team.filter((m) => m.active).length}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-msp-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
  }

  /**
   * Garde-fou (v35) : toute action réservée est bloquée côté LOGIQUE, même si
   * l'interface était contournée. Nomination des membres et génération des
   * codes d'accès = Super Administrateurs uniquement.
   */
  function requireSuperAdmin(action: string): boolean {
    if (superAdmin) return true;
    alert(`Action réservée aux Super Administrateurs : ${action}.\n\nVotre rôle (${currentRole}) ne permet pas cette opération.`);
    return false;
  }

  /** Génère un code personnel d'équipe (6 chiffres, valable 1 an). */
  function generateAdminCode(id: string) {
    if (!requireSuperAdmin('générer le code d’accès d’un administrateur')) return;
    const used = new Set([
      ...team.map((member) => cleanSimpleCode(member.accessCode || '')),
      ...credentials.map((credential) => cleanSimpleCode(credential.value)),
    ]);
    let code = '';
    for (let attempt = 0; attempt < 500; attempt++) {
      const bytes = new Uint32Array(1);
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
      } else {
        bytes[0] = Math.floor(Math.random() * 0xffffffff);
      }
      const candidate = String(100000 + (bytes[0] % 900000));
      if (!used.has(candidate) && !isAccessCode(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      alert('Impossible de générer un code unique. Réessayez.');
      return;
    }
    const now = Date.now();
    persistTeam(team.map((member) =>
      member.id === id
        ? { ...member, accessCode: code, accessCodeCreatedAt: now, accessCodeExpiresAt: expiresAtFrom(now) }
        : member
    ));
  }

  /** Envoie à un administrateur son code personnel (avec son rôle et l'expiration). */
  function sendAdminCodeByWhatsApp(member: AdminMember) {
    if (!requireSuperAdmin('envoyer un code d’accès administrateur')) return;
    if (!member.accessCode) return;
    const expiry = member.accessCodeExpiresAt ? formatDateFr(member.accessCodeExpiresAt) : '1 an';
    const msg = `Bonjour ${member.name},\nVoici votre code personnel à 6 chiffres pour l'accès équipe de Master Soutien Pédagogique :\n\n${formatSimpleCode(member.accessCode)}\n\nSaisissez-le dans « Accès équipe » (/equipe). Il ouvre uniquement les fonctions associées à votre rôle (${member.permissions.join(', ')}).\n\n⏳ Validité : 1 an — expire le ${expiry}. Demandez au principal un renouvellement à l'échéance.`;
    openWhatsApp(msg);
  }

  function logout() {
    clearAdminSession();
    setUnlocked(false);
    setPassword('');
    setSessionId('');
  }

  // Une session est fermée si le membre est retiré, suspendu, expiré ou si le mode d'accès ne correspond plus.
  useEffect(() => {
    if (!teamLoaded || !unlocked || !sessionId) return;
    if (loginMode === 'owner') {
      if (sessionId !== 'owner' || !isPrincipalAdminSession()) logout();
      return;
    }
    const member = team.find((candidate) => candidate.id === sessionId);
    if (!member || member.id === 'owner' || !member.active || !member.accessCode
      || (member.accessCodeExpiresAt && Date.now() > member.accessCodeExpiresAt)) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, sessionId, unlocked, teamLoaded, loginMode]);

  useEffect(() => {
    if (!unlocked) return;
    const checkSession = () => {
      const current = getAdminSession();
      const valid = loginMode === 'owner'
        ? current === 'owner' && isPrincipalAdminSession()
        : !!current?.startsWith('member:') && isTeamAdminSession();
      if (!valid) logout();
    };
    const timer = window.setInterval(checkSession, 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, loginMode]);

  function persistTeam(next: AdminMember[]) {
    setTeam(next);
    saveTeam(next);
  }

  function addMember() {
    if (!requireSuperAdmin('nommer un membre de l’équipe')) return;
    if (!memberName.trim()) {
      alert('Saisissez le nom du membre.');
      return;
    }
    const member: AdminMember = {
      id: `admin-${Date.now()}`,
      name: memberName.trim(),
      role: memberRole,
      phone: memberPhone.trim(),
      email: memberEmail.trim(),
      permissions: ROLE_PERMISSIONS[memberRole],
      active: true,
      createdAt: Date.now(),
    };
    persistTeam([member, ...team]);
    setMemberName('');
    setMemberPhone('');
    setMemberEmail('');
  }

  function toggleMember(id: string) {
    if (!requireSuperAdmin('activer ou suspendre un membre')) return;
    persistTeam(team.map(m => m.id === id ? { ...m, active: !m.active } : m));
  }

  function deleteMember(id: string) {
    if (!requireSuperAdmin('retirer un membre de l’équipe')) return;
    if (id === 'owner') return alert('Le compte administrateur principal ne peut pas être supprimé.');
    if (!confirm('Retirer ce membre de l’équipe d’administration ?')) return;
    persistTeam(team.filter(m => m.id !== id));
  }

  function inviteMember(member: AdminMember) {
    if (!requireSuperAdmin('inviter un membre de l’équipe')) return;
    const msg = `Bonjour ${member.name},\nVous êtes ajouté(e) à l'équipe d'administration de Master Soutien Pédagogique.\nRôle : ${member.role}\nPermissions : ${member.permissions.join(', ')}\nMerci de contacter l'administrateur principal pour les consignes d'accès.`;
    openWhatsApp(msg);
  }

  function persistCredentials(next: GeneratedCredential[]) {
    setCredentials(next);
    saveCredentials(next);
    backupCredentials(); // v36 : les codes survivent aux mises à jour
  }

  /**
   * v36 — RETRAIT d'un code par le Super Administrateur.
   * Le code cesse d'être utilisable, mais reste listé (il peut être réactivé).
   */
  function toggleRevokeCredential(item: GeneratedCredential) {
    if (!requireSuperAdmin('retirer ou réactiver un code d’accès')) return;
    if (isRevoked(item.value)) {
      restoreCode(item.value);
    } else {
      if (!confirm(`Retirer le code de ${item.owner} ?\n\nIl ne pourra plus être utilisé tant qu'il n'est pas réactivé.`)) return;
      revokeCode(item.value, currentAdmin?.name || 'Super Administrateur');
    }
    setRevokedTick((n) => n + 1);
  }

  /** v36 — SUPPRESSION définitive d'un code par le Super Administrateur. */
  function removeCredential(item: GeneratedCredential) {
    if (!requireSuperAdmin('supprimer un code d’accès')) return;
    if (!confirm(`Supprimer définitivement le code de ${item.owner} ?\n\nCette action est irréversible : le code ne sera plus jamais accepté.`)) return;
    deleteCode(item.value, currentAdmin?.name || 'Super Administrateur');
    persistCredentials(credentials.filter((c) => c.id !== item.id));
    setRevokedTick((n) => n + 1);
  }

  function generateCredential() {
    if (!requireSuperAdmin('générer des codes d’accès clients')) return;
    if (!credentialOwner.trim()) {
      alert("Indiquez le nom complet du client (il le saisira à l'écran d'accès).");
      return;
    }
    // 5 codes SIMPLES à 6 chiffres pour la formule choisie (999 à 10000 FCFA/an selon la formule).
    // Le 1er chiffre porte la formule : « 9 » = Essentiel, « 1 » = Complet.
    const codes = generateSimpleCodes(5, codePlan);
    const owner = credentialOwner.trim();
    const now = Date.now();
    const items: GeneratedCredential[] = codes.map((c) => ({
      id: `cred-${now}-${c}`,
      owner,
      type: 'user' as const,
      value: c,
      createdAt: now,
      expiresAt: expiresAtFrom(now),
      plan: codePlan,
    }));
    persistCredentials([...items, ...credentials]);
  }

  /** Prolonge la validité d'un code de 1 an (chrono). */
  function extendCredential(id: string) {
    persistCredentials(credentials.map((c) =>
      c.id === id
        ? { ...c, expiresAt: expiresAtFrom(Math.max(Date.now(), c.expiresAt ?? Date.now())) }
        : c
    ));
  }

  /** Envoie un code client par WhatsApp, avec sa formule et son expiration. */
  function sendCodeByWhatsApp(item: GeneratedCredential) {
    const expiry = item.expiresAt ? formatDateFr(item.expiresAt) : '1 an';
    // v64 : Libellé lu dans le catalogue unique (les formules École
    // 6000/10000 F y ont leur description complète).
    const info = item.plan ? PLANS[item.plan] : PLANS.complet;
    const planLabel = `${info.label} — ${info.includes.join(' · ')}`;
    const msg = `Bonjour ${item.owner},\nVoici votre code d'accès Master Soutien Pédagogique :\n\n${formatSimpleCode(item.value)}\n\nTapez ces 6 chiffres à l'écran d'accès de l'application avec votre nom complet (obligatoire). Code valable sur tous les appareils.\n\n📋 Formule : ${planLabel}\n\n⏳ Validité : 1 an — expire le ${expiry}. À l'échéance, contactez un administrateur pour le renouveler.`;
    openWhatsApp(msg);
  }

  async function copyCredential(value: string) {
    const okCopy = await copyText(value);
    alert(okCopy ? 'Identifiant copié.' : 'Impossible de copier automatiquement : sélectionnez-le manuellement.');
  }

  function persistOrientation(items: OrientationExtraInfo[]) {
    setOrientationExtras(items);
    saveOrientationExtras(items);
  }

  function addOrientationInfo() {
    if (!orientationTitle.trim()) return alert('Ajoutez un titre.');
    const item: OrientationExtraInfo = {
      id: `ori-extra-${Date.now()}`,
      title: orientationTitle.trim(),
      series: orientationSeries.trim(),
      domains: [orientationDomain],
      subjects: orientationSubjects.trim(),
      studies: orientationStudies.trim(),
      careers: orientationCareers.trim(),
      advice: orientationAdvice.trim(),
      createdAt: Date.now(),
    };
    persistOrientation([item, ...orientationExtras]);
    setOrientationTitle('');
    setOrientationSeries('');
    setOrientationSubjects('');
    setOrientationStudies('');
    setOrientationCareers('');
    setOrientationAdvice('');
  }

  function persistCourses(next: CourseOffer[]) {
    setCourses(next);
    saveCourses(next);
  }

  function setCourseStatus(id: string, status: CourseOffer['status']) {
    persistCourses(courses.map(course => course.id === id ? { ...course, status } : course));
  }

  if (!unlocked) {
    const ownerMode = loginMode === 'owner';
    return (
      <div className="msp-admin-login flex min-h-screen items-center justify-center p-4">
        <div className="msp-admin-login-card w-full max-w-sm rounded-3xl p-6">
          <div className="text-center mb-5">
            <div className="msp-admin-login-icon mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-white">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="msp-eyebrow">MASTER SOUTIEN PÉDAGOGIQUE</p>
            <h1 className="mt-2 text-xl font-black text-slate-900">{ownerMode ? 'Administration principale' : 'Accès équipe'}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {ownerMode ? 'Entrée réservée au principal.' : 'Saisissez votre code personnel à 6 chiffres.'}
            </p>
          </div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            {ownerMode ? 'Mot de passe principal' : 'Code personnel de l’équipe'}
          </label>
          <div className="relative mb-3">
            <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={ownerMode ? 'password' : 'tel'}
              inputMode={ownerMode ? 'text' : 'numeric'}
              autoComplete={ownerMode ? 'current-password' : 'one-time-code'}
              value={password}
              onChange={(event) => setPassword(ownerMode ? event.target.value : cleanSimpleCode(event.target.value).slice(0, 6))}
              onKeyDown={(event) => event.key === 'Enter' && login()}
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-center font-mono text-lg tracking-widest"
              placeholder={ownerMode ? 'Mot de passe' : '000000'}
            />
          </div>
          {!ownerMode && <p className="mb-3 text-xs leading-relaxed text-slate-500">Chaque code est individuel et n’ouvre que les fonctions de votre rôle. Si votre code a expiré, contactez le principal.</p>}
          {ownerMode && <p className="mb-3 text-xs leading-relaxed text-slate-500">L’administration principale est séparée de l’accès équipe. Cette vérification est locale à l’appareil.</p>}
          {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button onClick={login} disabled={!ownerMode && !teamLoaded} className="w-full rounded-xl bg-emerald-800 py-3 font-bold text-white disabled:opacity-50">
            {ownerMode ? 'Ouvrir l’administration principale' : 'Ouvrir mon espace équipe'}
          </button>
          <button onClick={() => navigate('/')} className="mt-3 w-full py-2 text-sm font-semibold text-slate-500">Retour à l’accueil</button>
          <div className="mt-3 flex justify-center gap-4 text-xs">
            <button onClick={() => navigate(ownerMode ? '/equipe' : '/admin-dashboard')} className="text-emerald-800 underline underline-offset-4">
              {ownerMode ? 'Accès équipe' : 'Accès principal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeMembers = team.filter(m => m.active).length;
  const selectedCategory = visibleResourceCategories.find((category) => category.key === resourceCategory)
    || visibleResourceCategories[0] || RESOURCE_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => goBack()} className="p-2 bg-white/10 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
            <div>
              <h1 className="font-bold text-lg">{superAdmin ? 'Administration principale' : 'Espace équipe'}</h1>
              <p className="text-slate-300 text-sm">
                {currentAdmin && currentAdmin.id !== 'owner'
                  ? <>Connecté : <strong className="text-white">{currentAdmin.name}</strong> — rôle : {currentRole}</>
                  : <>Gestion locale de l’application</>}
              </p>
            </div>
          </div>
          <button onClick={logout} className="bg-red-500/20 text-red-100 px-3 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Quitter
          </button>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
          {superAdmin ? (
            <>
              <Stat icon={FileText} value={RESOURCE_CATEGORIES.length} label="Sections ressources" />
              <Stat icon={Users} value={team.length} label="Membres équipe" />
              <Stat icon={Activity} value={activeMembers} label="Actifs" />
            </>
          ) : (
            <div className="col-span-2 rounded-xl border border-emerald-100 bg-white p-3 text-center sm:col-span-3">
              <p className="text-xs text-slate-500">Votre espace attribué</p>
              <p className="font-bold text-emerald-900">{currentRole}</p>
            </div>
          )}
        </div>

        <div className={`grid gap-2 mb-4 ${superAdmin ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {allowedTabs.map((t) => {
            const cfg: Record<AdminTab, { icon: typeof FileText; label: string }> = {
              resources: { icon: FileText, label: 'Ressources' },
              team: { icon: Users, label: 'Équipe' },
              access: { icon: KeyRound, label: 'Accès' },
              paiements: { icon: Wallet, label: 'Paiements' },
              donnees: { icon: Database, label: 'Données & annonces' },
              etablissement: { icon: Building2, label: 'Établissement' },
              orientation: { icon: ShieldCheck, label: 'Orientation' },
              courses: { icon: Activity, label: 'Cours' },
              technique: { icon: Wrench, label: 'Technique' },
              governance: { icon: Settings, label: 'Gouvernance' },
              support: { icon: MessageCircle, label: 'Assistance' },
            };
            return <TabButton key={t} active={tab === t} onClick={() => setTab(t)} icon={cfg[t].icon} label={cfg[t].label} />;
          })}
        </div>

        {tab === 'resources' && canAccess('resources') && (
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-900 text-lg mb-1">{superAdmin ? 'Gestion des ressources de l’application' : 'Mes contenus attribués'}</h2>
            <p className="text-gray-500 text-sm mb-4">{superAdmin ? 'Gérez les contenus visibles par les enseignants.' : `Votre espace est limité à : ${ROLE_MISSION[currentRole]}`}</p>
            {(superAdmin || currentRole === 'Responsable Ressources') && (
              <button
                onClick={() => navigate('/admin-fiches-preparation')}
                className="w-full mb-4 text-left rounded-xl p-4 bg-gradient-to-r from-emerald-800 to-emerald-600 text-white shadow flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                <div className="flex-1"><p className="font-bold leading-tight">Fiches de préparation par classe</p><p className="text-emerald-50 text-xs mt-0.5">Gérer les fiches pédagogiques officielles</p></div>
                <span className="text-xl">→</span>
              </button>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {visibleResourceCategories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setResourceCategory(cat.key)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold ${resourceCategory === cat.key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <ResourceFiles category={selectedCategory.key} accent={selectedCategory.accent} />
          </section>
        )}

        {tab === 'team' && canAccess('team') && (
          <section className="space-y-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-800">
              👥 <strong>Code d'accès du personnel :</strong> pour chaque membre de l'équipe ci-dessous, cliquez sur
              <strong> « Générer le code d'accès personnel »</strong> (6 chiffres, valable 1 an). Ce code lui permet
              d'entrer dans l'espace administrateur <strong>sans le code général</strong>, avec accès à
              <strong> ses fonctions</strong> (celles de son rôle). Envoyez-lui le code par WhatsApp.
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-900 text-lg mb-3">Ajouter un membre de l’équipe</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Nom" value={memberName} onChange={setMemberName} placeholder="Nom du membre" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                  <select value={memberRole} onChange={e => setMemberRole(e.target.value as AdminRole)} className="w-full p-3 border rounded-lg">
                    {TEAM_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{ROLE_MISSION[memberRole]}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ROLE_PERMISSIONS[memberRole].map(pm => (
                      <span key={pm} className="bg-emerald-50 text-emerald-700 text-[11px] px-2 py-0.5 rounded">{pm}</span>
                    ))}
                  </div>
                  {memberRole === 'Super Administrateur' && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Attention : ce rôle donne accès à la <strong>nomination des membres</strong> et à la
                      <strong> génération des codes d’accès</strong>. À réserver aux personnes de confiance.
                    </p>
                  )}
                </div>
                <Input label="WhatsApp / Téléphone" value={memberPhone} onChange={setMemberPhone} placeholder="+229..." />
                <Input label="Email" value={memberEmail} onChange={setMemberEmail} placeholder="email@exemple.com" />
              </div>
              <button onClick={addMember} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Ajouter à l’équipe
              </button>
            </div>

            <div className="space-y-2">
              {team.map(member => (
                <div key={member.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{member.name}</p>
                      <p className="text-sm text-emerald-700 font-semibold">
                        {member.role}
                        {isSuperAdmin(member.role) && (
                          <span className="ml-2 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            <Lock className="w-3 h-3 inline" /> Équipe + Codes
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 italic">{ROLE_MISSION[member.role] || ''}</p>
                      <p className="text-xs text-gray-500">{member.phone || 'Téléphone non renseigné'} {member.email ? `• ${member.email}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{member.active ? 'Actif' : 'Suspendu'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {member.permissions.map(permission => <span key={permission} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{permission}</span>)}
                  </div>

                  {member.id === 'owner' ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      🔑 <strong>Administrateur principal</strong> : il entre avec le <strong>code général</strong> de
                      l'application (mot de passe administrateur), inchangé. Lui seul peut générer les codes ci-dessous.
                    </div>
                  ) : member.accessCode ? (
                    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                      <p className="text-xs text-indigo-800">
                        ⏳ Code personnel — expire le <strong>{member.accessCodeExpiresAt ? formatDateFr(member.accessCodeExpiresAt) : '—'}</strong>
                        {' '}({member.accessCodeExpiresAt ? daysRemaining(member.accessCodeExpiresAt) : 365} jour{member.accessCodeExpiresAt && daysRemaining(member.accessCodeExpiresAt) > 1 ? 's' : ''} restant{member.accessCodeExpiresAt && daysRemaining(member.accessCodeExpiresAt) > 1 ? 's' : ''})
                      </p>
                      <p className="font-mono text-xl font-extrabold text-indigo-900 tracking-[0.25em] mt-1">{formatSimpleCode(member.accessCode)}</p>
                      <p className="text-[11px] text-indigo-500 mt-1">Ce code remplace le code général pour {member.name} (accès à ses fonctions : {member.permissions.join(', ')}).</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button onClick={() => sendAdminCodeByWhatsApp(member)} className="bg-green-600 text-white py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><MessageCircle className="w-4 h-4" /> Envoyer</button>
                        <button onClick={() => generateAdminCode(member.id)} className="bg-amber-50 text-amber-700 py-2 rounded-lg text-sm font-semibold">↻ Régénérer</button>
                        <button onClick={() => copyText(member.accessCode || '')} className="bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><Copy className="w-4 h-4" /> Copier</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => generateAdminCode(member.id)} className="mt-3 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold">
                      🔑 Générer le code d'accès personnel de {member.name} (6 chiffres, sans le code général)
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button onClick={() => inviteMember(member)} className="bg-green-50 text-green-700 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><MessageCircle className="w-4 h-4" /> Inviter</button>
                    <button onClick={() => toggleMember(member.id)} className="bg-amber-50 text-amber-700 py-2 rounded-lg text-sm font-semibold">{member.active ? 'Suspendre' : 'Activer'}</button>
                    <button onClick={() => deleteMember(member.id)} className="bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1"><Trash2 className="w-4 h-4" /> Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'access' && canAccess('access') && (
          <section className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              ✅ <strong>Les codes restent valables après chaque mise à jour de l'application.</strong> Ils ne
              cessent d'être acceptés que dans trois cas : leur <strong>expiration</strong>, leur <strong>retrait</strong>
              (cadenas) ou leur <strong>suppression</strong> par le Super Administrateur.
              <br /><br />
              🔑 <strong>Code général de l'application : inchangé.</strong> L'administrateur principal entre avec le
              code général (mot de passe administrateur). Chaque autre administrateur possède son <strong>code
              personnel à 6 chiffres</strong> (onglet <strong>Équipe</strong>) : il accède à ses fonctions
              d'administrateur sans le code général.
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Codes d'accès clients — 6 chiffres, tarification (999 à 10000 FCFA par an)</h2>
              <p className="text-gray-500 text-sm mb-4">
                Un code à 6 chiffres, validé hors-ligne ; l'utilisateur le tape à l'écran d'accès
                <strong> avec son nom complet</strong>, et entre immédiatement, sans serveur ni connexion.
                Le <strong>premier chiffre du code porte la formule</strong> : « 9… » = Essentiel (999 FCFA/an),
                « 1… » = Complet (1500 FCFA/an), « 2… » = Pro (2500 FCFA/an),
                « 6… » = École Maternelle→CM2 (6000 FCFA/an), « 7… » = École Maternelle→Terminale (10000 FCFA/an).
                Valable <strong>1 an</strong> (chrono affiché sur chaque code).
              </p>
              {/* Choix de la formule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {(Object.keys(PLANS) as SubscriptionPlan[]).map((pid) => (
                  <button
                    key={pid}
                    onClick={() => setCodePlan(pid)}
                    className={`rounded-xl border-2 p-3 text-left ${codePlan === pid ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-gray-900">{PLANS[pid].label}</span>
                      {codePlan === pid && <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">SÉLECTIONNÉ</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{PLANS[pid].includes.slice(0, 2).join(' • ')}</p>
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">Code commençant par « {codePrefixOfPlan(pid)} »</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <Input label="Nom complet du client *" value={credentialOwner} onChange={setCredentialOwner} placeholder="Ex : KOFFI Jean" />
                <button onClick={generateCredential} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5" /> Générer 5 codes (formule {PLANS[codePlan].price} FCFA/an)
                </button>
              </div>

              {/*
                v55 — ESSAI GRATUIT : remise a zero reservee au SA.
                Utile pour une demonstration commerciale ou un appareil de
                presentation. Le prospect, lui, ne peut pas relancer l'essai.
              */}
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-800">Version d’essai ({TRIAL_HOURS} h)</p>
                <p className="mt-0.5 text-xs text-slate-600" data-testid="etat-essai-admin">
                  {essaiInfo}
                </p>
                <button
                  data-testid="btn-reinitialiser-essai"
                  onClick={() => {
                    if (!window.confirm('Réinitialiser la période d’essai sur CET appareil ?\n\nÀ n’utiliser que pour une démonstration.')) return;
                    resetTrial();
                    setEssaiTick((n) => n + 1);
                  }}
                  className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                >
                  Réinitialiser l’essai sur cet appareil
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {credentials.filter((c) => c.type === 'user').length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">Aucun code client généré pour l'instant.</div>
              ) : credentials.filter((c) => c.type === 'user').map((item) => {
                const left = item.expiresAt ? daysRemaining(item.expiresAt) : 365;
                const expired = left < 0;
                const revoked = revokedTick >= 0 && isRevoked(item.value);
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{item.owner}</p>
                        <p className="font-mono text-xl text-emerald-700 font-extrabold tracking-[0.25em] mt-1">{formatSimpleCode(item.value)}</p>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-black ${item.plan === 'essentiel' ? 'bg-amber-100 text-amber-800' : item.plan === 'pro' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {(item.plan ? PLANS[item.plan].label : PLANS.complet.label).toUpperCase()}
                        </span>
                        <p className={`text-xs mt-1 font-semibold ${expired ? 'text-rose-600' : 'text-indigo-600'}`}>
                          ⏳ Validité 1 an — expire le {item.expiresAt ? formatDateFr(item.expiresAt) : '—'}{' '}
                          {expired
                            ? '• expiré'
                            : `• ${left} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => copyCredential(item.value)} className="p-2 bg-blue-50 text-blue-700 rounded-lg" title="Copier"><Copy className="w-5 h-5" /></button>
                        <button onClick={() => sendCodeByWhatsApp(item)} className="p-2 bg-green-50 text-green-700 rounded-lg" title="Envoyer par WhatsApp"><MessageCircle className="w-5 h-5" /></button>
                        <button onClick={() => toggleRevokeCredential(item)} className={`p-2 rounded-lg ${revoked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`} title={revoked ? 'Réactiver ce code' : 'Retirer ce code'}>
                          <Lock className="w-5 h-5" />
                        </button>
                        <button onClick={() => removeCredential(item)} className="p-2 bg-red-50 text-red-600 rounded-lg" title="Supprimer définitivement"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                    {revoked && (
                      <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800">
                        🔒 Code RETIRÉ par le Super Administrateur : il n'est plus accepté. Cliquez sur le cadenas pour le réactiver.
                      </p>
                    )}
                    <div className="mt-2">
                      <button onClick={() => extendCredential(item.id)} className="text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5">
                        ⏳ Prolonger d'1 an
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

{tab === 'orientation' && canAccess('orientation') && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Ajouter une information d’orientation</h2>
              <p className="text-gray-500 text-sm mb-4">Ces informations enrichissent la fonction Orientation scolaire visible par les enseignants.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Titre" value={orientationTitle} onChange={setOrientationTitle} placeholder="Ex: Nouveaux débouchés IA et cybersécurité" />
                <Input label="Séries concernées" value={orientationSeries} onChange={setOrientationSeries} placeholder="Ex: C, D, E, DT/IMI" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domaine</label>
                  <select value={orientationDomain} onChange={e => setOrientationDomain(e.target.value as OrientationDomain)} className="w-full p-3 border rounded-lg text-sm">
                    <option value="scientifique">Scientifique</option>
                    <option value="litteraire">Littéraire</option>
                    <option value="economique">Économique</option>
                    <option value="technique">Technique</option>
                    <option value="social">Social</option>
                    <option value="culturel">Culturel</option>
                    <option value="general">Général</option>
                  </select>
                </div>
                <Input label="Matières à renforcer" value={orientationSubjects} onChange={setOrientationSubjects} placeholder="Mathématiques, PCT, Anglais..." />
                <Input label="Études possibles" value={orientationStudies} onChange={setOrientationStudies} placeholder="Génie logiciel, Data, IA..." />
                <Input label="Débouchés" value={orientationCareers} onChange={setOrientationCareers} placeholder="Développeur, analyste, ingénieur..." />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Conseil / commentaire</label>
                <textarea value={orientationAdvice} onChange={e => setOrientationAdvice(e.target.value)} rows={3} className="w-full p-3 border rounded-lg text-sm resize-none" />
              </div>
              <button onClick={addOrientationInfo} className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-xl font-semibold">Ajouter l’information</button>
            </div>
            <div className="space-y-2">
              {orientationExtras.length === 0 ? <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">Aucune information ajoutée.</div> : orientationExtras.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">Séries : {item.series} • Domaine : {item.domains.join(', ')}</p>
                    <p className="text-sm text-gray-700 mt-1">{item.advice}</p>
                  </div>
                  <button onClick={() => persistOrientation(orientationExtras.filter(x => x.id !== item.id))} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'courses' && canAccess('courses') && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Approbation des cours en ligne</h2>
              <p className="text-gray-500 text-sm">Seuls les cours approuvés par l’administration sont visibles par les utilisateurs.</p>
              <Link to="/admin-cours" className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 font-semibold text-white">
                Modifier les contenus, images et vidéos des cours
              </Link>
            </div>
            {courses.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">Aucun cours proposé.</div>
            ) : courses.map(course => (
              <div key={course.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.author || 'Auteur non précisé'} • {course.level} • {course.type === 'gratuit' ? 'Gratuit' : `${course.price} FCFA`}</p>
                    <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${course.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : course.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{course.status === 'approved' ? 'Approuvé' : course.status === 'rejected' ? 'Rejeté' : 'En attente'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => setCourseStatus(course.id, 'approved')} className="bg-emerald-600 text-white py-2 rounded-lg font-semibold">Approuver</button>
                  <button onClick={() => setCourseStatus(course.id, 'rejected')} className="bg-red-50 text-red-600 py-2 rounded-lg font-semibold">Rejeter</button>
                  <button onClick={() => persistCourses(courses.filter(c => c.id !== course.id))} className="bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold">Supprimer</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'paiements' && canAccess('paiements') && <PaymentsAdminPanel />}
        {tab === 'donnees' && canAccess('donnees') && <SuperAdminDataPanel />}
        {tab === 'etablissement' && canAccess('etablissement') && <SchoolTransferPanel />}

        {tab === 'courses' && canAccess('courses') && (
          <div className="space-y-6">
            <AdminCultivonsCourses />
            <div className="border-t pt-6"><MoocModerationPanel /></div>
          </div>
        )}

        {tab === 'technique' && canAccess('technique') && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" /> Poste : Gestionnaire Technique
              </h2>
              <p className="text-gray-500 text-sm">
                Maintenance de l’application : diagnostic, stockage, sauvegardes, cache et mises à jour.
                Ce poste n’a accès ni à la nomination des membres, ni à la génération des codes d’accès.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3">Diagnostic de l’application</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Version du cache</p>
                  <p className="font-bold text-gray-900">{techInfo.cache}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Mode d’affichage</p>
                  <p className="font-bold text-gray-900">{techInfo.display}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Connexion</p>
                  <p className="font-bold text-gray-900">{techInfo.online ? 'En ligne' : 'Hors-ligne'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-gray-500 text-xs">Stockage local utilisé</p>
                  <p className="font-bold text-gray-900">{techInfo.storage}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 col-span-2">
                  <p className="text-gray-500 text-xs">Service Worker (mode hors-ligne)</p>
                  <p className="font-bold text-gray-900">{techInfo.sw}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3">Opérations de maintenance</h3>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={techRefreshDiagnostic} className="bg-indigo-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5" /> Actualiser le diagnostic
                </button>
                <button onClick={techPurgeCache} className="bg-amber-500 text-white py-3 rounded-xl font-semibold">
                  Purger le cache et recharger la dernière version
                </button>
                <button onClick={techExportDiagnostic} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">
                  Exporter le rapport de diagnostic (.txt)
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                La purge du cache ne supprime AUCUNE donnée des enseignants : elle force seulement
                le rechargement de la dernière version publiée de l’application.
              </p>
            </div>
          </section>
        )}

        {tab === 'support' && canAccess('support') && (
          <section className="msp-admin-support rounded-2xl p-5 sm:p-6">
            <p className="msp-eyebrow">ESPACE PERSONNEL</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Assistance utilisateurs</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Votre code ouvre uniquement le poste Support. Accompagnez les enseignants et orientez-les vers les ressources de formation.</p>
            <button onClick={() => openWhatsApp(`Bonjour, je suis ${currentAdmin?.name || 'membre de l’équipe Support'} et je souhaite contacter l’équipe Master Soutien Pédagogique au sujet d’une demande d’assistance.`)} className="msp-primary-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white"><MessageCircle className="h-5 w-5" /> Contacter le support MSP</button>
          </section>
        )}

        {tab === 'governance' && canAccess('governance') && (
          <section className="bg-white rounded-2xl shadow p-4 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Règles de gouvernance</h2>

            <div className="bg-slate-900 text-white rounded-xl p-4">
              <p className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Fonctions réservées aux Super Administrateurs</p>
              <ul className="text-slate-200 text-sm mt-2 list-disc list-inside space-y-1">
                <li><strong>Nomination des membres</strong> de l’équipe (ajout, suspension, retrait).</li>
                <li><strong>Génération et envoi des codes d’accès</strong> (clients et administrateurs).</li>
              </ul>
              <p className="text-slate-300 text-xs mt-2">
                Les autres membres n’accèdent qu’aux fonctions de leur poste : ces onglets ne
                leur sont ni affichés ni exécutables.
              </p>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="font-semibold text-gray-900 mb-2">Postes de l’équipe et responsabilités</p>
              <div className="space-y-2">
                {(Object.keys(ROLE_PERMISSIONS) as AdminRole[]).map(role => (
                  <div key={role} className={`rounded-lg p-3 ${role === currentRole ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                    <p className="font-semibold text-gray-900 text-sm">
                      {role}
                      {role === currentRole && <span className="ml-2 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">VOTRE POSTE</span>}
                      {isSuperAdmin(role) && <Lock className="w-3 h-3 inline ml-1 text-amber-600" />}
                    </p>
                    <p className="text-xs text-gray-600">{ROLE_MISSION[role]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="font-semibold text-emerald-800">Ce que l’équipe d’administration dirige</p>
              <ul className="text-emerald-700 text-sm mt-2 list-disc list-inside space-y-1">
                <li>Validation et ajout des programmes d’études.</li>
                <li>Publication des vidéos pédagogiques utiles.</li>
                <li>Contrôle des annonces et opportunités de recrutement.</li>
                <li>Gestion des publicités et partenaires.</li>
                <li>Assistance aux utilisateurs et formation via WhatsApp.</li>
                <li>Maintenance technique : diagnostic, stockage, cache et mises à jour (Gestionnaire Technique).</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800">Recommandation</p>
              <p className="text-amber-700 text-sm mt-1">Nommez au moins un responsable ressources, un responsable annonces/recrutement, un support utilisateur et un gestionnaire technique. Limitez le nombre de Super Administrateurs : eux seuls peuvent nommer des membres et générer des codes d’accès.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 text-center">
      <Icon className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Users; label: string }) {
  return (
    <button onClick={onClick} className={`rounded-xl p-3 text-sm font-semibold flex flex-col items-center gap-1 ${active ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border rounded-lg text-sm" />
    </div>
  );
}