/**
 * PANNEAU DE PAIEMENT (v38).
 *
 * Affiché lorsqu'un utilisateur demande le contenu complet d'un cours ou d'un
 * livre payant. Il explique la procédure, donne les coordonnées du Super
 * Administrateur, l'identifiant de l'appareil, et permet de saisir le code de
 * déverrouillage transmis après paiement.
 */

import { useState } from 'react';
import { Copy, Lock, MessageCircle, Phone, Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import {
  PaidContentKind, getDeviceId, getPaymentContact, isContactConfigured,
  paymentMessage, recordPaymentRequest, redeemUnlockCode, whatsappLink,
} from '../utils/coursePayment';
import { copyText } from '../utils/clipboard';

export default function PaywallPanel({
  contentId,
  kind,
  title,
  price,
  onUnlocked,
}: {
  contentId: string;
  kind: PaidContentKind;
  title: string;
  price: string;
  onUnlocked: () => void;
}) {
  const contact = getPaymentContact();
  const deviceId = getDeviceId();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [asked, setAsked] = useState(false);

  function askAccess() {
    recordPaymentRequest(contentId, kind, title, price);
    setAsked(true);
  }

  function submit() {
    if (redeemUnlockCode(contentId, kind, title, code)) {
      setError('');
      onUnlocked();
    } else {
      setError('Ce code de déverrouillage est incorrect. Vérifiez auprès du Super Administrateur.');
    }
  }

  function copyId() {
    void copyText(deviceId);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl ring-1 ring-amber-300 p-5">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 text-amber-700 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
          <Lock className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Contenu payant verrouillé</h3>
          <p className="text-amber-700 dark:text-amber-400 font-black text-lg">{price} FCFA</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {paymentMessage(title, price, kind)}
      </p>

      {/* Procédure */}
      <ol className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">1.</span> Contactez le Super Administrateur avec les coordonnées ci-dessous.</li>
        <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">2.</span> Réglez <strong>{price} FCFA</strong> et communiquez-lui votre identifiant.</li>
        <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">3.</span> Il vous transmet un <strong>code de déverrouillage</strong>.</li>
        <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">4.</span> Saisissez ce code ci-dessous : l’accès complet et le téléchargement du PDF s’ouvrent.</li>
      </ol>

      {/* Identifiant */}
      <div className="mt-4 bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-300">VOTRE IDENTIFIANT (à communiquer)</p>
        <div className="flex items-center gap-2 mt-1">
          <code className="font-mono font-bold text-gray-900 dark:text-gray-100 text-lg">{deviceId}</code>
          <button onClick={copyId} className="p-1.5 text-gray-500 hover:text-gray-800" aria-label="Copier l’identifiant">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coordonnées */}
      <div className="mt-3 border border-gray-200 dark:border-slate-600 rounded-xl p-3">
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{contact.name}</p>
        {!isContactConfigured(contact) && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Le Super Administrateur n’a pas encore enregistré ses coordonnées de paiement.
            Rapprochez-vous de l’établissement.
          </p>
        )}
        <div className="mt-2 space-y-1.5">
          {contact.phone && (
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" /> {contact.email}
            </a>
          )}
        </div>
        {contact.instructions && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{contact.instructions}</p>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a
            href={whatsappLink(contact, title, price, kind)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={askAccess}
            className="bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm text-center flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <button
            onClick={askAccess}
            className="bg-amber-500 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> J’ai payé
          </button>
        </div>
        {asked && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
            ✅ Votre demande est enregistrée. Le Super Administrateur la voit dans son tableau de bord.
          </p>
        )}
      </div>

      {/* Code */}
      <div className="mt-4">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
          Code de déverrouillage reçu après paiement
        </label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="XXXX-XXXX"
            className="flex-1 p-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-xl font-mono uppercase tracking-wider"
          />
          <button
            onClick={submit}
            className="px-4 bg-gray-900 text-white rounded-xl font-semibold flex items-center gap-1.5"
          >
            <KeyRound className="w-4 h-4" /> Valider
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}
