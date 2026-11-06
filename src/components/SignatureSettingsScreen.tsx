/**
 * SIGNATURE DES DOCUMENTS (v42).
 *
 * Tout document ou image produit par l'application porte la signature
 * « Master Soutien Pédagogique (Votre compagnon mobile) ».
 *
 * L'utilisateur qui souhaite y mettre son propre texte (nom de son école,
 * par exemple) règle 500 FCFA auprès du Super Administrateur, exactement
 * selon le mécanisme de la v38 : demande d'accès → paiement → code lié à
 * l'appareil → déverrouillage.
 *
 * Exception affichée clairement : les images et fiches que l'utilisateur
 * crée lui-même dans les sous-modules IA ne portent aucune signature.
 */
import { useState } from 'react';
import {
  ArrowLeft, Home, PenLine, Lock, Unlock, ShieldCheck,
  Phone, MessageCircle, Copy, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  DEFAULT_SIGNATURE, SIGNATURE_PRICE_FCFA, SIGNATURE_UNLOCK_ID,
  SIGNATURE_UNLOCK_TITLE, loadSignatureSettings, saveSignatureSettings,
  isSignatureUnlocked, effectiveSignature, signatureStatusMessage,
} from '../utils/documentSignature';
import {
  redeemUnlockCode, getPaymentContact, isContactConfigured,
  recordPaymentRequest, paymentMessage, whatsappLink, getDeviceId,
} from '../utils/coursePayment';
import { copyText } from '../utils/clipboard';

export default function SignatureSettingsScreen() {
  const navigate = useNavigate();
  const goBack = useSmartBack();

  const [settings, setSettings] = useState(loadSignatureSettings());
  const [code, setCode] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [toast, setToast] = useState('');
  const [tick, setTick] = useState(0);

  const unlocked = isSignatureUnlocked();
  const contact = getPaymentContact();
  const configured = isContactConfigured();
  const deviceId = getDeviceId();

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }

  function persist(next: typeof settings) {
    setSettings(next);
    saveSignatureSettings(next);
    setTick((t) => t + 1);
  }

  function submitCode() {
    const ok = redeemUnlockCode(SIGNATURE_UNLOCK_ID, 'signature', SIGNATURE_UNLOCK_TITLE, code);
    if (ok) {
      setCode('');
      setShowPay(false);
      setTick((t) => t + 1);
      notify('Personnalisation activée. Saisissez votre signature.');
    } else {
      notify('Code incorrect. Vérifiez auprès du Super Administrateur.');
    }
  }

  function askAccess() {
    recordPaymentRequest(
      SIGNATURE_UNLOCK_ID, 'signature', SIGNATURE_UNLOCK_TITLE,
      String(SIGNATURE_PRICE_FCFA),
    );
    setShowPay(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-indigo-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={goBack} aria-label="Retour" className="p-2 -ml-2 active:scale-90 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold">Signature de mes documents</h1>
        <button onClick={() => navigate('/')} aria-label="Accueil" className="p-2 active:scale-90 transition">
          <Home className="w-6 h-6" />
        </button>
      </header>

      <div className="p-4 space-y-4" key={tick}>
        {/* --- Aperçu de la signature réellement appliquée --- */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <PenLine className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-gray-900">Signature appliquée aujourd’hui</h2>
          </div>
          <p
            data-testid="apercu-signature"
            className="text-base font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
          >
            {effectiveSignature()}
          </p>
          <p className="text-xs text-gray-600 mt-2" data-testid="statut-signature">
            {signatureStatusMessage()}
          </p>
        </section>

        {/* --- Où cette signature apparaît, et où elle n'apparaît pas --- */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-900 text-sm mb-2">Où apparaît cette signature ?</h3>
          <ul className="text-sm text-blue-900 space-y-1 list-disc pl-5">
            <li>Sur les bulletins, rapports, documents de cantine et de comptabilité.</li>
            <li>Sur les images de la banque d’images éducatives.</li>
          </ul>
          <p className="text-sm text-blue-900 mt-3" data-testid="exception-ia">
            <strong>Exception :</strong> les images et fiches que vous créez vous-même dans les
            sous-modules IA ne portent aucune signature : vous en êtes l’auteur.
          </p>
        </section>

        {/* --- Personnalisation --- */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            {unlocked
              ? <Unlock className="w-5 h-5 text-emerald-600" />
              : <Lock className="w-5 h-5 text-amber-600" />}
            <h2 className="font-bold text-gray-900">Personnaliser ma signature</h2>
          </div>

          {!unlocked ? (
            <div data-testid="bloc-paiement-signature">
              <p className="text-sm text-gray-700">
                La personnalisation de la signature coûte{' '}
                <strong>{SIGNATURE_PRICE_FCFA} FCFA</strong>, à régler une seule fois
                auprès du Super Administrateur.
              </p>

              {!showPay ? (
                <button
                  data-testid="btn-demander-signature"
                  onClick={askAccess}
                  className="mt-3 w-full bg-indigo-700 text-white font-bold py-4 rounded-xl text-base active:scale-95 transition"
                >
                  Demander la personnalisation ({SIGNATURE_PRICE_FCFA} F)
                </button>
              ) : (
                <div className="mt-3 space-y-3" data-testid="coordonnees-signature">
                  <p className="text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {paymentMessage(SIGNATURE_UNLOCK_TITLE, String(SIGNATURE_PRICE_FCFA), 'signature')}
                  </p>

                  {configured ? (
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-gray-800">
                        <ShieldCheck className="w-4 h-4 text-indigo-700" />
                        <span>{contact.name}</span>
                      </p>
                      <p className="flex items-center gap-2 text-gray-800">
                        <Phone className="w-4 h-4 text-indigo-700" />
                        <span>{contact.phone}</span>
                      </p>
                      <a
                        href={whatsappLink(contact, SIGNATURE_UNLOCK_TITLE, String(SIGNATURE_PRICE_FCFA), 'signature')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold"
                      >
                        <MessageCircle className="w-4 h-4" /> Écrire sur WhatsApp
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800">
                      Les coordonnées de paiement ne sont pas encore renseignées par
                      le Super Administrateur.
                    </p>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Identifiant de cet appareil</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code data-testid="identifiant-signature" className="text-sm font-bold text-gray-900">
                        {deviceId}
                      </code>
                      <button
                        onClick={() => { copyText(deviceId); notify('Identifiant copié.'); }}
                        className="p-2 text-gray-600 active:scale-90"
                        aria-label="Copier l'identifiant"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">
                      Code reçu du Super Administrateur
                    </span>
                    <input
                      data-testid="champ-code-signature"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="XXXX-XXXX"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base uppercase"
                    />
                  </label>
                  <button
                    data-testid="btn-valider-signature"
                    onClick={submitCode}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-base active:scale-95 transition"
                  >
                    Valider le code
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3" data-testid="bloc-personnalisation">
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                Personnalisation activée sur cet appareil.
              </p>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Ma signature</span>
                <input
                  data-testid="champ-signature"
                  value={settings.customText}
                  maxLength={120}
                  onChange={(e) => persist({ ...settings, customText: e.target.value })}
                  placeholder="Ex. : École Primaire Publique de Cotonou Centre"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="case-utiliser-signature"
                  checked={settings.useCustom}
                  onChange={(e) => persist({ ...settings, useCustom: e.target.checked })}
                  className="mt-1 w-5 h-5 accent-indigo-700"
                />
                <span className="text-sm text-gray-800">
                  Utiliser ma signature à la place de « {DEFAULT_SIGNATURE} »
                </span>
              </label>

              <p className="text-xs text-gray-600">
                Si vous décochez cette case, ou si le champ est vide, la signature
                par défaut de l’application est rétablie.
              </p>
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm text-center z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
