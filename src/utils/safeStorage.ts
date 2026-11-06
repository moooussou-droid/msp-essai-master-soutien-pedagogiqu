/**
 * Accès sécurisé au stockage local.
 * En navigation privée ou sur certains WebView, localStorage peut lever
 * une exception : ces helpers ne laissent jamais planter l'application.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* quota ou stockage bloqué : silencieux */ }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* silencieux */ }
}

/** Lecture + JSON.parse protégés (retourne `fallback` si stockage bloqué ou JSON invalide). */
export function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch { /* stockage bloqué ou JSON invalide */ }
  return fallback;
}

/** Écriture JSON protégée. */
export function safeJsonSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota : silencieux */ }
}
