/**
 * GESTION DES PAIEMENTS ET DÉVERROUILLAGES (v38).
 * Onglet réservé au Super Administrateur.
 */

import { useState } from 'react';
import { CheckCircle2, Copy, Lock, Unlock, Wallet } from 'lucide-react';
import {
  PaymentContact, getPaymentContact, loadPaymentRequests, loadUnlocks,
  markRequestPaid, grantUnlock, revokeUnlock, savePaymentContact, unlockCodeFor,
} from '../utils/coursePayment';
import { copyText } from '../utils/clipboard';

export default function PaymentsAdminPanel() {
  const [contact, setContact] = useState<PaymentContact>(() => getPaymentContact());
  const [requests, setRequests] = useState(() => loadPaymentRequests());
  const [unlocks, setUnlocks] = useState(() => loadUnlocks());
  const [saved, setSaved] = useState(false);

  // Calcul manuel d'un code
  const [manualContent, setManualContent] = useState('');
  const [manualDevice, setManualDevice] = useState('');

  function update(patch: Partial<PaymentContact>) {
    setContact(savePaymentContact(patch));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function copy(text: string) {
    void copyText(text);
  }

  return (
    <div className="space-y-4">
      {/* Coordonnées */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-amber-600" /> Coordonnées de paiement
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Ces informations s’affichent à l’utilisateur lorsqu’il demande l’accès à un cours ou
          à un livre payant. Renseignez-les avec soin.
        </p>
        <div className="space-y-2">
          <input value={contact.name} onChange={(e) => update({ name: e.target.value })} placeholder="Nom affiché" className="w-full p-3 border rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input value={contact.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="Téléphone / Mobile Money" className="p-3 border rounded-lg" />
            <input value={contact.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })} placeholder="WhatsApp" className="p-3 border rounded-lg" />
          </div>
          <input value={contact.email} onChange={(e) => update({ email: e.target.value })} placeholder="E-mail (facultatif)" className="w-full p-3 border rounded-lg" />
          <textarea value={contact.instructions} onChange={(e) => update({ instructions: e.target.value })} placeholder="Consignes de paiement" rows={3} className="w-full p-3 border rounded-lg" />
        </div>
        {saved && <p className="text-emerald-700 text-sm mt-2">✅ Enregistré.</p>}
      </section>

      {/* Demandes */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 mb-1">Demandes d’accès ({requests.length})</h3>
        <p className="text-xs text-gray-500 mb-3">
          Après encaissement, communiquez le code à l’utilisateur ou déverrouillez directement.
        </p>
        {requests.length === 0 && <p className="text-sm text-gray-400">Aucune demande pour le moment.</p>}
        <div className="space-y-2">
          {requests.map((r) => {
            const code = unlockCodeFor(r.contentId, r.deviceId);
            const done = !!unlocks[r.contentId];
            return (
              <div key={r.contentId + r.requestedAt} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      {r.kind === 'livre' ? 'Livre' : r.kind === 'image' ? 'Image' : r.kind === 'signature' ? 'Signature' : r.kind === 'fiche' ? 'Fiche (filigrane)' : r.kind === 'bulletin' ? 'Bulletin (PDF)' : r.kind === 'formation' ? 'Formation MOOC' : 'Cours'} · {r.price} FCFA · identifiant <code className="font-mono">{r.deviceId}</code>
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : r.status === 'paye' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {done ? 'DÉVERROUILLÉ' : r.status === 'paye' ? 'PAYÉ' : 'EN ATTENTE'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">Code :</span>
                  <code className="font-mono font-bold text-gray-900">{code}</code>
                  <button onClick={() => copy(code)} className="p-1 text-gray-500" aria-label="Copier le code"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => { markRequestPaid(r.contentId); grantUnlock(r.contentId, r.kind, r.title, 'admin'); setUnlocks(loadUnlocks()); setRequests(loadPaymentRequests()); }}
                    className="bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" /> Déverrouiller
                  </button>
                  <button
                    onClick={() => { revokeUnlock(r.contentId); setUnlocks(loadUnlocks()); }}
                    className="bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" /> Retirer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Code manuel */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 mb-1">Calculer un code manuellement</h3>
        <p className="text-xs text-gray-500 mb-3">
          Si l’utilisateur vous appelle sans avoir envoyé de demande, saisissez l’identifiant du
          contenu et celui de son appareil.
        </p>
        <input value={manualContent} onChange={(e) => setManualContent(e.target.value)} placeholder="Identifiant du cours / livre" className="w-full p-3 border rounded-lg mb-2" />
        <input value={manualDevice} onChange={(e) => setManualDevice(e.target.value.toUpperCase())} placeholder="Identifiant de l’utilisateur (MSP-XXXXX-XXXXX)" className="w-full p-3 border rounded-lg mb-2 font-mono" />
        {manualContent && manualDevice && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <code className="font-mono font-bold text-emerald-900 text-lg">{unlockCodeFor(manualContent.trim(), manualDevice.trim())}</code>
            <button onClick={() => copy(unlockCodeFor(manualContent.trim(), manualDevice.trim()))} className="p-1 text-emerald-700" aria-label="Copier"><Copy className="w-4 h-4" /></button>
          </div>
        )}
      </section>

      {/* Accès accordés */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 mb-2">Accès accordés ({Object.keys(unlocks).length})</h3>
        {Object.keys(unlocks).length === 0 && <p className="text-sm text-gray-400">Aucun contenu déverrouillé.</p>}
        <div className="space-y-2">
          {Object.values(unlocks).map((u) => (
            <div key={u.contentId} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
              <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{u.title}</p>
                <p className="text-xs text-gray-500">
                  {u.kind === 'livre' ? 'Livre' : 'Cours'} · {new Date(u.unlockedAt).toLocaleDateString('fr-FR')} · {u.via === 'code' ? 'par code' : 'par l’administrateur'}
                </p>
              </div>
              <button onClick={() => { revokeUnlock(u.contentId); setUnlocks(loadUnlocks()); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                Retirer
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
