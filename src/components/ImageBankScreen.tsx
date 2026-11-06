/**
 * BANQUE D'IMAGES ÉDUCATIVES (v41).
 *
 * 12 planches du contexte béninois puis africain. Chaque image vaut
 * 100 FCFA, à régler auprès du Super Administrateur avant tout
 * téléchargement (PDF, PNG ou JPEG).
 *
 * Le paiement réutilise INTÉGRALEMENT le dispositif de la v38
 * (`coursePayment.ts`) : l'utilisateur voit un aperçu filigrané, demande
 * l'accès, paie, puis saisit le code transmis par le Super Administrateur
 * — ou bien celui-ci déverrouille directement depuis son espace.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Home, Search, Lock, Unlock, FileDown, Download, Printer,
  ShieldCheck, Phone, MessageCircle, Copy, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  BankImage, BankCategory, searchBank, renderBankImage,
  renderBankPreview, IMAGE_PRICE_FCFA, totalBankImages,
} from '../utils/eduImageBank';
import { svgToDataUrl, svgToPngDataUrl } from '../utils/eduImageEngine';
import {
  isUnlocked, redeemUnlockCode, getPaymentContact, isContactConfigured,
  recordPaymentRequest, paymentMessage, whatsappLink, getDeviceId,
} from '../utils/coursePayment';
import { copyText } from '../utils/clipboard';
import { makePdf } from '../utils/pdfMaker';

type Cat = BankCategory | 'Toutes';

export default function ImageBankScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Cat>('Toutes');
  const [selected, setSelected] = useState<BankImage | null>(null);
  const [code, setCode] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  /** Incrémenté après un déverrouillage pour rafraîchir l'affichage. */
  const [tick, setTick] = useState(0);

  const contact = getPaymentContact();
  const configured = isContactConfigured();

  useEffect(() => { setCode(''); setShowPay(false); }, [selected]);

  const results = useMemo(() => searchBank(query, cat), [query, cat]);

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }

  const unlocked = (img: BankImage) => isUnlocked(img.id);

  function submitCode(img: BankImage) {
    const ok = redeemUnlockCode(img.id, 'image', img.title, code);
    if (ok) {
      setTick((t) => t + 1);
      setCode('');
      setShowPay(false);
      notify('Image déverrouillée. Vous pouvez la télécharger.');
    } else {
      notify('Code incorrect. Vérifiez auprès du Super Administrateur.');
    }
  }

  function askPayment(img: BankImage) {
    recordPaymentRequest(img.id, 'image', img.title, String(img.price));
    setShowPay(true);
  }

  async function download(img: BankImage, kind: 'pdf' | 'png' | 'jpeg') {
    if (!unlocked(img)) { notify('Réglez d’abord les 100 FCFA auprès du Super Administrateur.'); return; }
    setBusy(true);
    try {
      const svg = renderBankImage(img);
      if (kind === 'pdf') {
        const png = await svgToPngDataUrl(svg, 1600);
        const pdf = makePdf({
          title: img.title,
          subtitle: img.description,
          establishment: `${img.category} — Master Soutien Pedagogique`,
        });
        pdf.image(png, 168);
        pdf.save(`${img.id}.pdf`);
      } else {
        const dataUrl = await svgToPngDataUrl(svg, 1600);
        let out = dataUrl;
        if (kind === 'jpeg') {
          // Conversion en JPEG via un canvas intermédiaire (fond blanc).
          out = await new Promise<string>((resolve, reject) => {
            const im = new Image();
            im.onload = () => {
              const c = document.createElement('canvas');
              c.width = im.width; c.height = im.height;
              const ctx = c.getContext('2d');
              if (!ctx) { reject(new Error('canvas')); return; }
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.drawImage(im, 0, 0);
              resolve(c.toDataURL('image/jpeg', 0.92));
            };
            im.onerror = () => reject(new Error('img'));
            im.src = dataUrl;
          });
        }
        const a = document.createElement('a');
        a.href = out;
        a.download = `${img.id}.${kind === 'jpeg' ? 'jpg' : 'png'}`;
        a.click();
      }
      notify(`Téléchargement ${kind.toUpperCase()} effectué.`);
    } catch {
      notify('Téléchargement impossible sur cet appareil.');
    }
    setBusy(false);
  }

  function printImage(img: BankImage) {
    if (!unlocked(img)) { notify('Réglez d’abord les 100 FCFA auprès du Super Administrateur.'); return; }
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${img.title}</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center}svg{width:100%;height:auto}</style>
      </head><body>${renderBankImage(img)}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  const header = (titre: string, onBack: () => void) => (
    <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 sticky top-0 z-10 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/20" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{titre}</h1>
          <p className="text-xs text-white/80">{totalBankImages()} images · {IMAGE_PRICE_FCFA} FCFA l’unité</p>
        </div>
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/20" aria-label="Accueil">
          <Home className="w-5 h-5" />
        </button>
      </div>
    </header>
  );

  /* ------------------------------ Détail ------------------------------ */
  if (selected) {
    const open = unlocked(selected);
    const svg = open ? renderBankImage(selected) : renderBankPreview(selected);

    return (
      <div className="min-h-screen bg-gray-50 pb-10" key={tick}>
        {header(selected.title, () => setSelected(null))}

        {toast && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3" data-testid="bank-toast">
            {toast}
          </div>
        )}

        <div className="p-4 space-y-4">
          <img
            src={svgToDataUrl(svg)}
            alt={selected.title}
            className="w-full border border-gray-200 rounded-xl bg-white"
            data-testid={open ? 'image-complete' : 'image-apercu'}
          />

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-800">{selected.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.category} · {selected.levels.join(', ')}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 flex items-center gap-1 ${
                open ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {open ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {open ? 'Payée' : `${selected.price} FCFA`}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-2">{selected.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selected.subjects.map((m) => (
                <span key={m} className="text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full px-2.5 py-1">{m}</span>
              ))}
            </div>
          </div>

          {open ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  data-testid="btn-dl-pdf" disabled={busy} onClick={() => download(selected, 'pdf')}
                  className="bg-rose-600 text-white font-bold py-3.5 rounded-xl flex flex-col items-center gap-1 disabled:opacity-60"
                >
                  <FileDown className="w-5 h-5" /> <span className="text-xs">PDF</span>
                </button>
                <button
                  data-testid="btn-dl-png" disabled={busy} onClick={() => download(selected, 'png')}
                  className="bg-emerald-700 text-white font-bold py-3.5 rounded-xl flex flex-col items-center gap-1 disabled:opacity-60"
                >
                  <Download className="w-5 h-5" /> <span className="text-xs">PNG</span>
                </button>
                <button
                  data-testid="btn-dl-jpeg" disabled={busy} onClick={() => download(selected, 'jpeg')}
                  className="bg-blue-700 text-white font-bold py-3.5 rounded-xl flex flex-col items-center gap-1 disabled:opacity-60"
                >
                  <Download className="w-5 h-5" /> <span className="text-xs">JPEG</span>
                </button>
              </div>
              <button
                onClick={() => printImage(selected)}
                className="w-full bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Imprimer
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-amber-300 p-4 space-y-3" data-testid="bloc-paiement">
              <p className="font-bold text-gray-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" /> Image payante
              </p>
              <p className="text-sm text-gray-700">
                {paymentMessage(selected.title, String(selected.price), 'image')}
              </p>

              {!showPay ? (
                <button
                  data-testid="btn-demander-acces"
                  onClick={() => askPayment(selected)}
                  className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl"
                >
                  Je veux payer les {selected.price} FCFA
                </button>
              ) : (
                <div className="space-y-3" data-testid="coordonnees-paiement">
                  {configured ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                      <p className="text-sm font-semibold text-gray-800">{contact.name}</p>
                      {contact.phone && (
                        <p className="text-sm text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> {contact.phone}
                        </p>
                      )}
                      {contact.instructions && <p className="text-xs text-gray-600">{contact.instructions}</p>}
                      {contact.whatsapp && (
                        <a
                          href={whatsappLink(contact, selected.title, String(selected.price), 'image')}
                          target="_blank" rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
                        >
                          <MessageCircle className="w-4 h-4" /> Écrire sur WhatsApp
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Les coordonnées de paiement ne sont pas encore renseignées par le Super Administrateur.
                      Rapprochez-vous de lui directement.
                    </p>
                  )}

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <p className="text-xs text-indigo-900">Votre identifiant d’appareil (à communiquer) :</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm font-bold text-indigo-900 flex-1" data-testid="identifiant-appareil">{getDeviceId()}</code>
                      <button
                        onClick={async () => { await copyText(getDeviceId()); notify('Identifiant copié.'); }}
                        className="p-2 bg-white border border-indigo-200 rounded-lg" aria-label="Copier"
                      >
                        <Copy className="w-4 h-4 text-indigo-700" />
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Code de déverrouillage reçu</span>
                    <input
                      type="text" value={code} data-testid="champ-code"
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="AAAA-BBBB"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base tracking-wider"
                    />
                  </label>
                  <button
                    data-testid="btn-valider-code"
                    onClick={() => submitCode(selected)}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" /> Déverrouiller l’image
                  </button>
                  <button
                    onClick={() => setShowPay(false)}
                    className="w-full text-gray-600 text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" /> Fermer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------ Liste ------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 pb-10" key={tick}>
      {header('Banque d’images éducatives', goBack)}

      {toast && (
        <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">
          {toast}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-900">
            Chaque image coûte <strong>{IMAGE_PRICE_FCFA} FCFA</strong>, à régler auprès du Super
            Administrateur. Après paiement, vous pouvez la télécharger en PDF, PNG ou JPEG, et l’imprimer.
          </p>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={query} data-testid="recherche-banque"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : eau, marché, école, animaux…"
            className="w-full border border-gray-300 rounded-xl pl-11 pr-3 py-3.5 text-base"
          />
        </div>

        <div className="flex gap-2">
          {(['Toutes', 'Bénin', 'Afrique'] as Cat[]).map((c) => (
            <button
              key={c}
              data-testid={`filtre-${c}`}
              onClick={() => setCat(c)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border ${
                cat === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3" data-testid="grille-banque">
          {results.length === 0 && (
            <p className="col-span-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg p-4">
              Aucune image ne correspond à votre recherche.
            </p>
          )}
          {results.map((img) => {
            const open = unlocked(img);
            return (
              <button
                key={img.id}
                data-testid={`vignette-${img.id}`}
                onClick={() => setSelected(img)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden text-left active:scale-[0.98] transition"
              >
                <img src={svgToDataUrl(open ? renderBankImage(img) : renderBankPreview(img))} alt={img.title} className="w-full" />
                <div className="p-2.5">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{img.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                    {open
                      ? <><Unlock className="w-3 h-3 text-emerald-600" /> Payée</>
                      : <><Lock className="w-3 h-3 text-amber-600" /> {img.price} FCFA</>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
