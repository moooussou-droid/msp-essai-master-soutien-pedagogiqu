/**
 * Copie dans le presse-papiers avec repli fiable.
 * `navigator.clipboard` peut être absent (WebView, HTTP) : on utilise alors
 * un textarea + execCommand. Retourne true si la copie a réellement réussi.
 */

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  // 1) API moderne
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* on tente le repli */ }
  // 2) Repli textarea + execCommand (anciens navigateurs / WebView)
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
