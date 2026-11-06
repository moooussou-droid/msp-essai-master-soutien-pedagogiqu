/**
 * IA MSP DE GÉNÉRATION DE GRAVURES ET D'IMAGES ÉDUCATIVES (v41).
 *
 * L'enseignant instruit le moteur en français : il décrit la scène,
 * choisit le style et le niveau, et obtient une planche imprimable.
 * Entièrement hors ligne (voir `eduImageEngine.ts` pour le choix technique).
 *
 * Les images générées par l'enseignant sont GRATUITES : seules les planches
 * de la Banque d'images (préparées par l'application) sont payantes.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Home, Sparkles, Printer, FileDown, Image as ImageIcon,
  Trash2, Lightbulb, RefreshCw, Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  generateEducationalImage, availableScenes, svgToDataUrl, svgToPngDataUrl,
  GeneratedImage, ImageStyle, ImageLevel,
} from '../utils/eduImageEngine';
import { loadGenerated, saveGenerated, deleteGenerated } from '../utils/eduImageStore';
import { makePdf } from '../utils/pdfMaker';

const EXAMPLES = [
  'Une école avec le maître et les élèves',
  'Le cycle de l’eau avec la pluie et la rivière',
  'Un marché africain avec une vendeuse de fruits',
  'Un champ de maïs avec le cultivateur',
  'Se laver les mains avec du savon',
  'Les animaux de la ferme : poule et chèvre',
  'Les formes géométriques',
  'Protéger l’environnement : poubelle et arbre',
];

export default function ImageGeneratorScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<ImageStyle>('gravure');
  const [level, setLevel] = useState<ImageLevel>('Primaire');
  const [labels, setLabels] = useState(true);
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setHistory(loadGenerated()); }, []);

  const scenes = useMemo(() => availableScenes(), []);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }

  function generate() {
    if (!prompt.trim()) { notify('Décrivez d’abord l’image souhaitée.'); return; }
    const img = generateEducationalImage({ prompt, style, level, labels, title });
    setResult(img);
    saveGenerated(img);
    setHistory(loadGenerated());
  }

  async function downloadPng(img: GeneratedImage) {
    setBusy(true);
    try {
      const png = await svgToPngDataUrl(img.svg, 1600);
      const a = document.createElement('a');
      a.href = png;
      a.download = `${img.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
      a.click();
      notify('Image PNG téléchargée.');
    } catch { notify('Téléchargement impossible sur cet appareil.'); }
    setBusy(false);
  }

  async function downloadPdf(img: GeneratedImage) {
    setBusy(true);
    try {
      const png = await svgToPngDataUrl(img.svg, 1600);
      const pdf = makePdf({
        // v42 — creation personnelle de l'utilisateur : par exception a la
        // regle generale, ce document ne porte PAS la signature de
        // l'application (l'utilisateur en est l'auteur).
        origin: 'creation-ia',
        title: img.title,
        subtitle: `${img.sceneName} — ${img.level}`,
        establishment: 'Master Soutien Pedagogique',
      });
      pdf.image(png, 170);
      pdf.save(`${img.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
      notify('Fichier PDF téléchargé.');
    } catch { notify('Export PDF impossible sur cet appareil.'); }
    setBusy(false);
  }

  function printImage(img: GeneratedImage) {
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${img.title}</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center}svg{width:100%;height:auto}</style>
      </head><body>${img.svg}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  const header = (
    <header className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white p-4 sticky top-0 z-10 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={goBack} className="p-2 rounded-lg hover:bg-white/20" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">IA MSP de génération d’images</h1>
          <p className="text-xs text-white/80">Gravures et illustrations éducatives</p>
        </div>
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/20" aria-label="Accueil">
          <Home className="w-5 h-5" />
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {header}

      {toast && (
        <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3" data-testid="gen-toast">
          {toast}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Consigne */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Décrivez l’image que vous voulez</span>
            <textarea
              data-testid="champ-consigne"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Exemple : une école avec le maître et les élèves devant le tableau"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.slice(0, 4).map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="text-xs bg-purple-50 text-purple-800 border border-purple-200 rounded-full px-3 py-1.5"
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Style</span>
              <select
                data-testid="champ-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as ImageStyle)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 bg-white"
              >
                <option value="gravure">Gravure (trait noir)</option>
                <option value="couleur">En couleurs</option>
                <option value="coloriage">À colorier</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Niveau</span>
              <select
                data-testid="champ-niveau"
                value={level}
                onChange={(e) => setLevel(e.target.value as ImageLevel)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 bg-white"
              >
                <option>Maternelle</option>
                <option>Primaire</option>
                <option>Secondaire</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Titre affiché (facultatif)</span>
            <input
              type="text" value={title} data-testid="champ-titre"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Laissez vide pour reprendre votre consigne"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3"
            />
          </label>

          <label className="flex items-center gap-3 py-1">
            <input
              type="checkbox" checked={labels} data-testid="champ-legendes"
              onChange={(e) => setLabels(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm text-gray-700">Ajouter les légendes (schéma annoté)</span>
          </label>

          <button
            data-testid="btn-generer"
            onClick={generate}
            className="w-full bg-fuchsia-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Sparkles className="w-5 h-5" /> Générer l’image
          </button>
        </div>

        {/* Résultat */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3" data-testid="resultat-image">
            <img
              src={svgToDataUrl(result.svg)}
              alt={result.title}
              className="w-full border border-gray-200 rounded-lg"
              data-testid="apercu-image"
            />
            <p className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2" data-testid="interpretation">
              {result.interpretation}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="btn-pdf-image" disabled={busy}
                onClick={() => downloadPdf(result)}
                className="bg-rose-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <FileDown className="w-5 h-5" /> PDF
              </button>
              <button
                data-testid="btn-png-image" disabled={busy}
                onClick={() => downloadPng(result)}
                className="bg-emerald-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Download className="w-5 h-5" /> Image
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => printImage(result)}
                className="bg-slate-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Imprimer
              </button>
              <button
                onClick={generate}
                className="bg-purple-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" /> Regénérer
              </button>
            </div>
          </div>
        )}

        {/* Aide : ce que le moteur sait dessiner */}
        <details className="bg-white rounded-xl border border-gray-200 p-4">
          <summary className="font-semibold text-gray-800 cursor-pointer flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" /> Ce que l’IA sait dessiner ({scenes.length} scènes)
          </summary>
          <p className="text-xs text-gray-600 mt-3">
            Cette IA fonctionne <strong>sans internet</strong>. Elle compose vos images à partir d’un
            répertoire de scènes dessinées pour le contexte béninois. Employez ces mots dans votre
            consigne pour obtenir la scène voulue :
          </p>
          <div className="mt-3 space-y-2">
            {scenes.map((s) => (
              <div key={s.key} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                <p className="font-semibold text-gray-800">{s.name}</p>
                <p className="text-gray-500">{s.keywords.join(', ')}…</p>
              </div>
            ))}
          </div>
        </details>

        {/* Historique */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Mes images ({history.length})
            </p>
            <div className="grid grid-cols-2 gap-3" data-testid="historique-images">
              {history.map((h) => (
                <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setResult(h)} className="block w-full">
                    <img src={svgToDataUrl(h.svg)} alt={h.title} className="w-full" />
                  </button>
                  <div className="p-2 flex items-center gap-2">
                    <p className="text-[11px] text-gray-700 flex-1 truncate">{h.title}</p>
                    <button
                      onClick={() => { deleteGenerated(h.id); setHistory(loadGenerated()); }}
                      className="text-red-600" aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
