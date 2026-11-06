/**
 * NUMÉRISEUR HD (v47) — caméra ou import de fichier.
 *
 * Deux sources, conformément à l'arbitrage :
 *  • CAMÉRA : flux vidéo via getUserMedia, caméra arrière privilégiée
 *    (`facingMode: environment`), résolution demandée en HD.
 *  • IMPORT : un fichier déjà présent sur l'appareil.
 *
 * Trois rendus (couleur / gris / noir et blanc « scanner »), rotation par
 * quarts de tour, export PDF multi-pages ou JPG. Tout est local.
 *
 * L'onglet « Signature et cachet » enregistre une signature et un cachet
 * détourés sur fond transparent, réutilisés par les documents officiels.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Camera, Upload, RotateCw, Trash2, FileDown, Check, X, PenTool, Printer,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ScanMode, processScan, extractSignature, fileToDataUrl, HD_MAX_SIZE,
  saveSignatureImage, getSignatureImage, saveStampImage, getStampImage,
  clearSignatureImage, clearStampImage,
} from '../utils/scanner';
import { makePdf } from '../utils/pdfMaker';
import { getProfile } from '../utils/userProfile';

type Tab = 'documents' | 'signature';

export default function ScannerScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [tab, setTab] = useState<Tab>('documents');
  const [mode, setMode] = useState<ScanMode>('nb');
  const [rotation, setRotation] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const signRef = useRef<HTMLInputElement | null>(null);
  const stampRef = useRef<HTMLInputElement | null>(null);

  const [signature, setSignature] = useState(getSignatureImage());
  const [stamp, setStamp] = useState(getStampImage());

  // La caméra est libérée dès qu'on quitte l'écran : sans cela, le voyant
  // reste allumé et la caméra est indisponible pour les autres applications.
  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Le <video> n'est monté qu'une fois cameraOn vrai.
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { /* autoplay refusé */ });
        }
      }, 50);
    } catch {
      setCameraError(
        'Caméra indisponible. Autorisez l’accès dans les réglages du navigateur, '
        + 'ou utilisez « Importer une image ».',
      );
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    await addPage(canvas.toDataURL('image/jpeg', 0.95));
  }

  async function addPage(source: string) {
    setBusy(true);
    setStatus('Traitement en cours…');
    try {
      const out = await processScan(source, { mode, rotation, maxSize: HD_MAX_SIZE });
      setPages((p) => [...p, out]);
      setStatus('Page ajoutée.');
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(''), 2500);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de réimporter le même fichier
    if (!file) return;
    await addPage(await fileToDataUrl(file));
  }

  async function onSignatureFile(e: React.ChangeEvent<HTMLInputElement>, kind: 'signature' | 'cachet') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const src = await fileToDataUrl(file);
      // Le cachet conserve sa couleur (bleu/rouge) ; la signature est noircie.
      const out = await extractSignature(src, { keepColor: kind === 'cachet' });
      if (kind === 'signature') { saveSignatureImage(out); setSignature(out); }
      else { saveStampImage(out); setStamp(out); }
      setStatus(`${kind === 'signature' ? 'Signature' : 'Cachet'} enregistré(e).`);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(''), 2500);
    }
  }

  function exportPdf() {
    if (pages.length === 0) return;
    const pdf = makePdf({
      title: 'Document numérisé',
      subtitle: `${pages.length} page(s) — ${new Date().toLocaleDateString('fr-FR')}`,
      establishment: profile.schoolName || 'Mon établissement',
    });
    // Une page numerisee par page du PDF : 640 pt de hauteur maximale
    // occupent la quasi-totalite d'une A4 portrait (842 pt) marges deduites.
    pages.forEach((p, i) => {
      if (i > 0) pdf.pageBreak();
      pdf.image(p, 640);
    });
    pdf.save(`document-numerise-${Date.now()}.pdf`);
  }

  function downloadPage(src: string, i: number) {
    const a = document.createElement('a');
    a.href = src;
    a.download = `page-${i + 1}.${src.startsWith('data:image/png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const modeBtn = (m: ScanMode, label: string) => (
    <button
      key={m}
      data-testid={`mode-${m}`}
      onClick={() => setMode(m)}
      className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === m ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => { stopCamera(); goBack(); }} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Numériser un document</h1>
            <p className="text-white/80 text-sm">Qualité HD, entièrement hors ligne</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10">
        <div className="flex gap-2">
          <button
            data-testid="onglet-documents" onClick={() => setTab('documents')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm ${tab === 'documents' ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
          >
            Documents
          </button>
          <button
            data-testid="onglet-signature" onClick={() => { stopCamera(); setTab('signature'); }}
            className={`flex-1 py-3 rounded-lg font-bold text-sm ${tab === 'signature' ? 'bg-[#046a38] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
          >
            Signature et cachet
          </button>
        </div>

        {status && (
          <p data-testid="statut-scan" className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            {status}
          </p>
        )}

        {tab === 'documents' && (
          <>
            <div className="msp-card p-4 space-y-3">
              <div className="msp-flag-rule" />
              <p className="text-xs font-semibold text-gray-600">Rendu de la numérisation</p>
              <div className="flex gap-2">
                {modeBtn('nb', 'Noir et blanc')}
                {modeBtn('gris', 'Gris')}
                {modeBtn('couleur', 'Couleur')}
              </div>
              <p className="text-xs text-gray-500">
                Le noir et blanc corrige les ombres et donne un rendu de vrai scanner.
              </p>
              <button
                data-testid="btn-rotation"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-full py-2 bg-gray-100 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" /> Rotation : {rotation}°
              </button>
            </div>

            {cameraOn && (
              <div className="msp-card overflow-hidden">
                <video
                  ref={videoRef} playsInline muted
                  className="w-full bg-black"
                  data-testid="apercu-camera"
                />
                <div className="grid grid-cols-2 gap-2 p-3">
                  <button
                    data-testid="btn-capturer" onClick={captureFromCamera} disabled={busy}
                    className="bg-[#046a38] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" /> Capturer
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" /> Fermer
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <p data-testid="erreur-camera" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {cameraError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="btn-camera" onClick={startCamera} disabled={busy || cameraOn}
                className="bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" /> Caméra
              </button>
              <button
                data-testid="btn-importer" onClick={() => fileRef.current?.click()} disabled={busy}
                className="bg-[#b34700] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" /> Importer
              </button>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" onChange={onImport}
              className="hidden" data-testid="input-import"
            />

            <div className="msp-card p-4">
              <h2 className="font-bold text-gray-800 mb-2">Pages numérisées ({pages.length})</h2>
              {pages.length === 0 && (
                <p className="text-sm text-gray-500">Aucune page pour l’instant.</p>
              )}
              <div className="grid grid-cols-3 gap-2" data-testid="liste-pages">
                {pages.map((p, i) => (
                  <div key={i} className="relative border border-gray-200 rounded-lg overflow-hidden">
                    <img src={p} alt={`Page ${i + 1}`} className="w-full h-28 object-cover" />
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => setPages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded"
                      aria-label="Supprimer la page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => downloadPage(p, i)}
                      className="absolute bottom-1 right-1 bg-white/90 text-gray-700 p-1 rounded"
                      aria-label="Télécharger l’image"
                    >
                      <FileDown className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {pages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="btn-pdf-scan" onClick={exportPdf}
                  className="bg-red-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <FileDown className="w-5 h-5" /> PDF ({pages.length})
                </button>
                {/* v53 : un document numerise doit pouvoir etre imprime. */}
                <button
                  data-testid="btn-imprimer-scan" onClick={() => window.print()}
                  className="bg-gray-100 text-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" /> Imprimer
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'signature' && (
          <>
            <p className="text-sm text-gray-600 msp-card p-3">
              Signez sur une feuille blanche, photographiez-la bien à plat, puis importez-la.
              Le fond est automatiquement rendu transparent afin que la signature puisse être
              apposée sur vos documents sans masquer le texte.
            </p>

            <div className="msp-card p-4 space-y-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#046a38]" /> Ma signature
              </h3>
              {signature ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-2 bg-white">
                  <img src={signature} alt="Signature" className="max-h-24 mx-auto" data-testid="apercu-signature" />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucune signature enregistrée.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="btn-charger-signature" onClick={() => signRef.current?.click()} disabled={busy}
                  className="bg-[#046a38] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {signature ? 'Remplacer' : 'Numériser'}
                </button>
                <button
                  onClick={() => { clearSignatureImage(); setSignature(''); }}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                >
                  Supprimer
                </button>
              </div>
              <input
                ref={signRef} type="file" accept="image/*" capture="environment"
                onChange={(e) => onSignatureFile(e, 'signature')} className="hidden"
                data-testid="input-signature"
              />
            </div>

            <div className="msp-card p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Cachet de l’école</h3>
              {stamp ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-2 bg-white">
                  <img src={stamp} alt="Cachet" className="max-h-24 mx-auto" data-testid="apercu-cachet" />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun cachet enregistré.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  data-testid="btn-charger-cachet" onClick={() => stampRef.current?.click()} disabled={busy}
                  className="bg-[#046a38] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {stamp ? 'Remplacer' : 'Numériser'}
                </button>
                <button
                  onClick={() => { clearStampImage(); setStamp(''); }}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                >
                  Supprimer
                </button>
              </div>
              <input
                ref={stampRef} type="file" accept="image/*" capture="environment"
                onChange={(e) => onSignatureFile(e, 'cachet')} className="hidden"
                data-testid="input-cachet"
              />
              <p className="text-xs text-gray-500">
                La couleur du cachet est préservée ; seule la feuille blanche devient transparente.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
