/**
 * Cartes de vocabulaire imprimables (flashcards) pour la classe.
 * Génère un document HTML propre : 2 colonnes, découpables, 100 % hors-ligne.
 */

export interface FlashcardItem {
  title: string;
  subtitle: string;
  body: string;
}

export interface FlashcardOptions {
  title?: string;
  subtitle?: string;
}

function esc(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildFlashcardHtml(items: FlashcardItem[], opts: FlashcardOptions = {}): string {
  const cards = items
    .map(
      item => `
  <div class="card">
    <div class="sub">${esc(item.subtitle)}</div>
    <div class="title">${esc(item.title)}</div>
    <div class="body">${esc(item.body)}</div>
    <div class="cut"><span></span></div>
  </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(opts.title || 'Cartes de vocabulaire')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 18px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .note { font-size: 11px; color: #666; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 2px solid #059669; border-radius: 10px; padding: 10px 12px; break-inside: avoid; page-break-inside: avoid; position: relative; }
  .card .sub { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #047857; font-weight: bold; }
  .card .title { font-size: 17px; font-weight: 900; margin: 2px 0 4px; }
  .card .body { font-size: 11px; line-height: 1.45; color: #333; }
  .card .cut { position: absolute; top: 50%; right: -6px; width: 12px; height: 12px; background: #fff; border: 2px solid #059669; border-radius: 50%; }
  @media print { body { padding: 0; } .card { border-color: #000; } .card .sub { color: #000; } .note { color: #000; } }
</style>
</head>
<body>
<h1>${esc(opts.title || 'Cartes de vocabulaire')}</h1>
<p class="note">${esc(opts.subtitle || 'Découpez les cartes et faites-les réciter aux élèves.')} — ${items.length} carte${items.length > 1 ? 's' : ''}</p>
<div class="grid">${cards}
</div>
</body>
</html>`;
}

/** Ouvre une fenêtre d'impression avec les cartes. Retourne false si bloqué. */
export function printFlashcards(items: FlashcardItem[], opts: FlashcardOptions = {}): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(buildFlashcardHtml(items, opts));
  win.document.close();
  win.focus();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}
