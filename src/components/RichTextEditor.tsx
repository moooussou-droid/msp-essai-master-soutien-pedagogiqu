/**
 * ÉDITEUR DE TEXTE ENRICHI « FAÇON WORD » (v49).
 *
 * Barre d'outils de traitement de texte pour la rédaction des documents
 * administratifs : gras, italique, souligné, titres, alignements, listes,
 * tableaux, couleur, taille, annuler/rétablir.
 *
 * ── POURQUOI `contentEditable` ET `document.execCommand` ? ───────────
 * `execCommand` est marquée « dépréciée », mais reste la SEULE API de
 * mise en forme fonctionnant dans TOUS les navigateurs sans dépendance
 * externe. Les alternatives (ProseMirror, Slate, TipTap) pèsent plusieurs
 * centaines de kilooctets et devraient être téléchargées : incompatible
 * avec une application 100 % hors ligne destinée à des téléphones
 * d'entrée de gamme. Tous les navigateurs actuels l'implémentent encore,
 * et le résultat est du HTML standard que nous convertissons nous-mêmes.
 *
 * ── PRÉSERVATION DE LA SÉLECTION ─────────────────────────────────────
 * Sur mobile, appuyer sur un bouton fait perdre le focus de la zone
 * d'édition, donc la sélection : la commande s'appliquerait alors au
 * vide. D'où `onMouseDown={preventDefault}` sur chaque bouton, qui
 * empêche le transfert de focus.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Table2, Eraser, Type,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  /** Hauteur minimale de la zone d'édition. */
  minHeight?: number;
  testId?: string;
}

const FONT_SIZES = [
  { label: 'Petit', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Grand', value: '5' },
  { label: 'Très grand', value: '6' },
];

const COLORS = ['#17202a', '#046a38', '#b34700', '#1b3a6b', '#c00000'];

export default function RichTextEditor({ value, onChange, minHeight = 260, testId }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  /*
   * Le HTML n'est réinjecté QUE s'il diffère du contenu courant.
   * Sans cette garde, chaque frappe réécrirait le noeud et replacerait le
   * curseur au début : la saisie deviendrait impossible.
   */
  useEffect(() => {
    const el = ref.current;
    if (el && value !== el.innerHTML) el.innerHTML = value || '';
  }, [value]);

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  /**
   * Applique une commande de mise en forme.
   *
   * ⚠️ PIEGE CORRIGE : appeler `focus()` sur la zone d'edition alors
   * qu'elle a DEJA le focus replie la selection en simple curseur. La
   * commande s'appliquait alors a une selection vide et le gras semblait
   * « ne rien faire ». On ne redonne donc le focus QUE s'il est ailleurs,
   * et on restaure dans ce cas la derniere selection connue.
   */
  function exec(command: string, arg?: string) {
    const el = ref.current;
    if (el && !el.contains(document.getSelection()?.anchorNode ?? null)) {
      el.focus();
      const saved = savedRange.current;
      if (saved) {
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(saved); }
      }
    }
    try {
      document.execCommand(command, false, arg);
    } catch { /* commande non supportée : sans effet */ }
    emit();
    refreshActive();
  }

  /** Mémorise la sélection courante, pour la restaurer si le focus est perdu. */
  function rememberSelection() {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }

  /** Met en évidence les boutons correspondant au texte sélectionné. */
  function refreshActive() {
    const state: Record<string, boolean> = {};
    for (const c of ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList',
                     'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']) {
      try { state[c] = document.queryCommandState(c); } catch { state[c] = false; }
    }
    setActive(state);
  }

  /** Insère un tableau : structure la plus attendue dans ces documents. */
  function insertTable() {
    const rows = Number(window.prompt('Nombre de lignes (en-tête comprise) ?', '3')) || 0;
    const cols = Number(window.prompt('Nombre de colonnes ?', '3')) || 0;
    if (rows < 1 || cols < 1 || rows > 50 || cols > 12) return;

    let html = '<table style="width:100%;border-collapse:collapse" border="1"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += r === 0
          ? '<th style="border:1px solid #999;padding:6px;background:#eee">Titre</th>'
          : '<td style="border:1px solid #999;padding:6px">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><div><br></div>';
    exec('insertHTML', html);
  }

  const Btn = ({
    cmd, arg, icon: Icon, label, onClick,
  }: {
    cmd?: string; arg?: string; icon: typeof Bold; label: string; onClick?: () => void;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-testid={cmd ? `fmt-${cmd}` : undefined}
      // Empêche la perte de sélection au clic (essentiel sur mobile).
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => (onClick ? onClick() : exec(cmd!, arg))}
      className={`p-2 rounded-lg border ${
        cmd && active[cmd]
          ? 'bg-[#046a38] text-white border-[#046a38]'
          : 'bg-white text-gray-700 border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white">
      {/* Barre d'outils */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <Btn cmd="bold" icon={Bold} label="Gras" />
        <Btn cmd="italic" icon={Italic} label="Italique" />
        <Btn cmd="underline" icon={Underline} label="Souligné" />
        <span className="w-px bg-gray-300 mx-1" />
        <Btn cmd="justifyLeft" icon={AlignLeft} label="Aligner à gauche" />
        <Btn cmd="justifyCenter" icon={AlignCenter} label="Centrer" />
        <Btn cmd="justifyRight" icon={AlignRight} label="Aligner à droite" />
        <Btn cmd="justifyFull" icon={AlignJustify} label="Justifier" />
        <span className="w-px bg-gray-300 mx-1" />
        <Btn cmd="insertUnorderedList" icon={List} label="Liste à puces" />
        <Btn cmd="insertOrderedList" icon={ListOrdered} label="Liste numérotée" />
        <Btn icon={Table2} label="Insérer un tableau" onClick={insertTable} />
        <span className="w-px bg-gray-300 mx-1" />
        <Btn cmd="undo" icon={Undo2} label="Annuler" />
        <Btn cmd="redo" icon={Redo2} label="Rétablir" />
        <Btn cmd="removeFormat" icon={Eraser} label="Effacer la mise en forme" />

        {/* Titres */}
        <select
          data-testid="fmt-titre"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = ''; }}
          defaultValue=""
          className="text-xs border border-gray-300 rounded-lg px-2 bg-white"
        >
          <option value="" disabled>Style</option>
          <option value="<h1>">Titre 1</option>
          <option value="<h2>">Titre 2</option>
          <option value="<h3>">Titre 3</option>
          <option value="<p>">Texte normal</option>
        </select>

        {/* Taille */}
        <select
          data-testid="fmt-taille"
          onChange={(e) => { exec('fontSize', e.target.value); e.target.value = ''; }}
          defaultValue=""
          className="text-xs border border-gray-300 rounded-lg px-2 bg-white"
        >
          <option value="" disabled>Taille</option>
          {FONT_SIZES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Couleurs */}
        <span className="flex items-center gap-1 ml-1">
          <Type className="w-4 h-4 text-gray-500" />
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Couleur ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec('foreColor', c)}
              className="w-5 h-5 rounded-full border border-gray-300"
              style={{ background: c }}
            />
          ))}
        </span>
      </div>

      {/* Zone d'édition */}
      <div
        ref={ref}
        data-testid={testId || 'editeur-word'}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onKeyUp={() => { rememberSelection(); refreshActive(); }}
        onMouseUp={() => { rememberSelection(); refreshActive(); }}
        className="p-4 text-sm leading-relaxed focus:outline-none overflow-auto"
        style={{ minHeight }}
      />
    </div>
  );
}
