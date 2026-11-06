/**
 * Sessions d'administration locales pour l'application hors ligne.
 *
 * Cette séparation améliore le parcours et limite les écrans visibles selon
 * le rôle. Elle reste une protection côté navigateur : sans vérification
 * serveur, elle ne constitue pas une frontière de sécurité inviolable.
 */
export const ADMIN_SESSION_KEY = 'msp_admin_dashboard_session';
export const ADMIN_SESSION_EXPIRES_KEY = 'msp_admin_session_expires_at';
export const ADMIN_TEAM_KEY = 'msp_admin_team';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface AdminTeamMemberSession {
  id: string;
  name?: string;
  role?: string;
  active?: boolean;
  accessCode?: string;
  accessCodeExpiresAt?: number;
  [key: string]: unknown;
}

/** Identifiant de session courant (« owner », « member:<id> ») ou null. */
export function getAdminSession(): string | null {
  try {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!session) return null;

    const expiresAt = Number(localStorage.getItem(ADMIN_SESSION_EXPIRES_KEY) || 0);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_EXPIRES_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Ouvre une session locale limitée à huit heures. */
export function saveAdminSession(session: string): void {
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, session);
    localStorage.setItem(ADMIN_SESSION_EXPIRES_KEY, String(Date.now() + ADMIN_SESSION_TTL_MS));
  } catch {
    // Si le stockage local est indisponible, la session ne persistera pas.
  }
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_EXPIRES_KEY);
  } catch {
    // ignore storage errors
  }
}

/** Le compte principal est distinct d'un membre de l'équipe. */
export function isPrincipalAdminSession(): boolean {
  return getAdminSession() === 'owner';
}

/** Renvoie le membre connecté seulement si son compte et son code restent actifs. */
export function getAdminMemberSession(): AdminTeamMemberSession | null {
  const session = getAdminSession();
  if (!session?.startsWith('member:')) return null;
  const id = session.slice('member:'.length);
  if (!id) return null;

  try {
    const raw = localStorage.getItem(ADMIN_TEAM_KEY);
    const team = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(team)) return null;
    const member = team.find((candidate: any) => candidate?.id === id);
    if (!member || member.active === false || !member.accessCode) return null;
    if (typeof member.accessCodeExpiresAt === 'number' && Date.now() > member.accessCodeExpiresAt) return null;
    return member as AdminTeamMemberSession;
  } catch {
    return null;
  }
}

export function isTeamAdminSession(): boolean {
  return getAdminMemberSession() !== null;
}

/** Le principal détient tous les rôles ; un membre ne peut hériter du rôle owner. */
export function hasAdminRole(...roles: string[]): boolean {
  if (isPrincipalAdminSession()) return true;
  const member = getAdminMemberSession();
  if (!member) return false;
  const role = member.role === 'Super Administrateur' ? 'Support' : member.role;
  return typeof role === 'string' && roles.includes(role);
}

/** Compatibilité de nom : « Super Administrateur » signifie désormais le principal. */
export function isSuperAdminSession(): boolean {
  return isPrincipalAdminSession();
}

export function isAnyAdminSession(): boolean {
  return isPrincipalAdminSession() || isTeamAdminSession();
}
