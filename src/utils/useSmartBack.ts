/**
 * RETOUR INTELLIGENT (v34).
 *
 * Problème corrigé : `navigate(-1)` renvoyait parfois à l'écran d'accueil (ou
 * sortait de l'application) lorsque l'historique interne était vide — cas
 * fréquent quand l'utilisateur ouvre l'app installée (PWA/iPhone), recharge la
 * page, arrive par un lien, ou après une redirection (activation, mise à niveau).
 *
 * Solution : on suit l'historique RÉEL des routes visitées dans l'application.
 *  1. S'il existe une page précédente visitée dans l'app → on y retourne.
 *  2. Sinon → on remonte d'UN niveau logique dans l'URL
 *     (ex. /class/ID/presences → /class/ID ; /class/ID → /).
 * L'utilisateur n'est donc jamais renvoyé de force à l'accueil depuis une
 * sous-page, et ne sort jamais de l'application.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const STACK_KEY = 'msp_nav_stack';
const MAX_STACK = 50;

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK)));
  } catch { /* stockage indisponible : le repli sur l'URL suffit */ }
}

/** Enregistre la route courante dans la pile de navigation de l'application. */
export function pushNavEntry(path: string) {
  const stack = readStack();
  if (stack[stack.length - 1] === path) return; // même page : pas de doublon
  stack.push(path);
  writeStack(stack);
}

/** Remonte d'un niveau logique dans l'URL (repli quand l'historique est vide). */
export function parentPath(pathname: string): string {
  const clean = pathname.split('?')[0].replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  // /class/:id/presences → /class/:id
  parts.pop();
  const parent = '/' + parts.join('/');
  // /class/new → / (pas de page /class)
  if (parent === '/class') return '/';
  return parent || '/';
}

/**
 * Renvoie une fonction `goBack()` à utiliser sur tous les boutons « Retour ».
 * @param fallback route de repli explicite (facultatif).
 */
export function useSmartBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const current = location.pathname;
    const stack = readStack();

    // Retirer les entrées correspondant à la page courante
    while (stack.length && stack[stack.length - 1] === current) stack.pop();

    const previous = stack[stack.length - 1];
    if (previous && previous !== current) {
      stack.pop();
      writeStack(stack);
      navigate(previous);
      return;
    }

    // Aucune page précédente dans l'application : on remonte d'un niveau
    writeStack(stack);
    navigate(fallback || parentPath(current));
  }, [navigate, location.pathname, fallback]);
}

/** Enregistre automatiquement chaque changement de route (monté une seule fois). */
export function useNavTracker(pathname: string) {
  pushNavEntry(pathname);
}
