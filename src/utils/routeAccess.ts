/**
 * Règles d'ouverture des routes de l'application.
 *
 * Les écrans de connexion administrateur sont accessibles sans abonnement
 * pour permettre une authentification légitime, mais ils ne sont PAS des
 * routes publiques de l'application. Une fois qu'on les quitte, chaque autre
 * route doit satisfaire sa propre condition d'accès (abonnement, essai,
 * route publique ou session d'administration valide).
 */
const PUBLIC_ROUTES = ['/activation', '/verify', '/suivi-enfant'];
const ADMIN_LOGIN_ROUTES = ['/admin-dashboard', '/equipe'];
const ADMIN_ROUTES = [
  '/admin-dashboard',
  '/equipe',
  '/admin-cours',
  '/admin-fiches-preparation',
];

function matchesRoute(route: string, base: string): boolean {
  return route === base || route.startsWith(`${base}/`);
}

export interface RouteAccessOptions {
  subscriptionActive: boolean;
  trialActive: boolean;
  hasAdminSession: boolean;
}

export interface RouteAccessDecision {
  route: string;
  isAdminLoginRoute: boolean;
  isAdminRoute: boolean;
  adminWorkspaceAllowed: boolean;
  /** Routes publiques + espace admin couvert par une session valide. */
  isPublicRoute: boolean;
  /** Autorise l'affichage du contenu de la route courante, pas de toutes les routes. */
  canOpen: boolean;
}

/**
 * Destination des boutons « Retour à l'accueil » liés à l'accès : si aucun
 * abonnement activé n'est valable, envoyer vers l'activation plutôt que le
 * menu (un essai peut rester actif sans être une activation payante).
 */
export function getHomeReturnPath(hasActiveActivation: boolean): '/' | '/activation' {
  return hasActiveActivation ? '/' : '/activation';
}

/**
 * Évalue la route courante sans donner aux écrans de connexion admin un accès
 * public global à l'application.
 */
export function resolveRouteAccess(
  pathname: string,
  options: RouteAccessOptions,
): RouteAccessDecision {
  const route = pathname.replace(/\/+$/, '') || '/';
  const isAdminLoginRoute = ADMIN_LOGIN_ROUTES.includes(route);
  const isTeacherParentTool = matchesRoute(route, '/suivi-enfant/codes');
  const isAdminRoute = ADMIN_ROUTES.some((base) => matchesRoute(route, base));
  const adminWorkspaceAllowed = isAdminRoute && options.hasAdminSession;
  const isPublicContentRoute = PUBLIC_ROUTES.some((base) => matchesRoute(route, base))
    && !isTeacherParentTool;
  const isPublicRoute = isPublicContentRoute || adminWorkspaceAllowed;

  return {
    route,
    isAdminLoginRoute,
    isAdminRoute,
    adminWorkspaceAllowed,
    isPublicRoute,
    canOpen: options.subscriptionActive
      || options.trialActive
      || isPublicRoute
      || isAdminLoginRoute,
  };
}
