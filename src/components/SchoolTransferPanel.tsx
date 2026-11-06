/**
 * PARAMÈTRES DE TRANSFERT D'ÉTABLISSEMENT (v43) — espace d'administration.
 *
 * Chaque utilisateur est rattaché à l'école de son premier enregistrement.
 * Ce panneau donne au Super Administrateur les moyens de traiter le cas de
 * l'enseignant muté :
 *
 *  1. produire un CODE D'AUTORISATION à dicter à distance (téléphone,
 *     WhatsApp), calculé à partir de l'identifiant de l'appareil ;
 *  2. autoriser directement le transfert quand l'appareil est sous la main ;
 *  3. retirer une autorisation accordée par erreur ;
 *  4. réécrire l'établissement, conformément à la règle v39 qui veut que le
 *     Super Administrateur puisse modifier n'importe quelle information.
 *
 * L'historique des rattachements reste visible : rien n'est effacé en
 * silence.
 */
import { useState } from 'react';
import {
  Building2, KeyRound, ShieldCheck, ShieldOff, Copy, History, Save, AlertTriangle,
} from 'lucide-react';
import {
  loadBinding, grantTransfer, revokeTransfer, adminSetSchool,
  transferCodeFor, expectedTransferCode, bindingStatusMessage,
} from '../utils/schoolBinding';
import { getDeviceId } from '../utils/coursePayment';
import { copyText } from '../utils/clipboard';

function frDate(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function SchoolTransferPanel() {
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const [otherDevice, setOtherDevice] = useState('');
  const [newSchool, setNewSchool] = useState('');

  const binding = loadBinding();
  const deviceId = getDeviceId();

  function notify(t: string) { setToast(t); setTimeout(() => setToast(''), 3500); }
  function refresh() { setTick((t) => t + 1); }

  return (
    <section className="space-y-4" data-testid="panneau-transfert" key={tick}>
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Établissement de rattachement
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Chaque utilisateur n’emploie l’application que pour l’école de son
          premier enregistrement. En cas de mutation, autorisez ici le transfert.
        </p>

        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1 text-sm">
          <p data-testid="admin-statut-rattachement" className="text-gray-800">
            {bindingStatusMessage()}
          </p>
          {binding && (
            <>
              <p className="text-gray-600">
                École actuelle : <strong data-testid="admin-ecole">{binding.schoolName}</strong>
              </p>
              <p className="text-gray-600">
                Rattaché depuis le {frDate(binding.boundAt)} · {binding.transferCount} transfert(s)
              </p>
              <p className={binding.transferAllowed ? 'text-amber-700 font-semibold' : 'text-gray-600'}>
                Autorisation de transfert :{' '}
                <span data-testid="admin-autorisation">
                  {binding.transferAllowed ? 'ACCORDÉE (non encore utilisée)' : 'aucune'}
                </span>
              </p>
            </>
          )}
        </div>

        {!binding && (
          <p className="text-sm text-amber-800 mt-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Cet appareil n’a pas encore d’établissement de rattachement : il sera
            créé au premier enregistrement du profil.
          </p>
        )}
      </div>

      {/* ---------------- Code pour un appareil distant ---------------- */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          Code d’autorisation à distance
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          L’enseignant vous communique l’identifiant affiché sur son appareil.
          Saisissez-le ici pour obtenir le code à lui dicter.
        </p>

        <label className="block mt-3">
          <span className="text-sm font-semibold text-gray-700">Identifiant de l’appareil</span>
          <input
            data-testid="champ-appareil-distant"
            value={otherDevice}
            onChange={(e) => setOtherDevice(e.target.value)}
            placeholder={deviceId}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </label>

        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-xs text-indigo-800">Code à communiquer</p>
          <div className="flex items-center gap-2 mt-1">
            <code data-testid="code-transfert" className="text-lg font-bold text-indigo-900">
              {transferCodeFor((otherDevice || '').trim() || deviceId)}
            </code>
            <button
              onClick={() => {
                copyText(transferCodeFor((otherDevice || '').trim() || deviceId));
                notify('Code copié.');
              }}
              className="p-2 text-indigo-700 active:scale-90"
              aria-label="Copier le code"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-indigo-800 mt-1">
            Ce code n’ouvre qu’un seul transfert : il devra être redemandé pour un
            changement ultérieur.
          </p>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          Appareil courant : <code data-testid="admin-identifiant">{deviceId}</code>
          {' '}(code local : <strong>{expectedTransferCode()}</strong>)
        </p>
      </div>

      {/* ---------------- Autorisation directe ---------------- */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Autorisation sur cet appareil
        </h3>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            data-testid="btn-accorder-transfert"
            disabled={!binding}
            onClick={() => { grantTransfer(); refresh(); notify('Transfert autorisé.'); }}
            className="bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm active:scale-95 disabled:opacity-50"
          >
            Autoriser le transfert
          </button>
          <button
            data-testid="btn-retirer-transfert"
            disabled={!binding || !binding.transferAllowed}
            onClick={() => { revokeTransfer(); refresh(); notify('Autorisation retirée.'); }}
            className="bg-white border-2 border-rose-600 text-rose-700 font-bold py-3 rounded-xl text-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <ShieldOff className="w-4 h-4" /> Retirer
          </button>
        </div>
      </div>

      {/* ---------------- Réécriture directe ---------------- */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Save className="w-5 h-5 text-gray-700" />
          Modifier directement l’établissement
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Réservé au Super Administrateur. Le changement est inscrit dans
          l’historique ; les données déjà saisies sont conservées.
        </p>
        <label className="block mt-3">
          <span className="text-sm font-semibold text-gray-700">Nouvel établissement</span>
          <input
            data-testid="champ-nouvelle-ecole-admin"
            value={newSchool}
            onChange={(e) => setNewSchool(e.target.value)}
            placeholder="Ex. : EPP Porto-Novo"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
        </label>
        <button
          data-testid="btn-modifier-ecole-admin"
          onClick={() => {
            const n = newSchool.trim();
            if (!n) { notify('Saisissez le nom du nouvel établissement.'); return; }
            if (adminSetSchool(n)) {
              setNewSchool('');
              refresh();
              notify('Établissement modifié.');
            }
          }}
          className="mt-3 w-full bg-gray-800 text-white font-bold py-3 rounded-xl text-sm active:scale-95"
        >
          Enregistrer le nouvel établissement
        </button>
      </div>

      {/* ---------------- Historique ---------------- */}
      {binding && binding.history.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-700" />
            Historique des rattachements
          </h3>
          <ul className="mt-2 space-y-2" data-testid="historique-rattachement">
            {binding.history.map((h, i) => (
              <li key={i} className="text-sm border-l-2 border-emerald-500 pl-3">
                <p className="font-semibold text-gray-900">{h.schoolName}</p>
                <p className="text-xs text-gray-600">
                  Du {frDate(h.since)} au {h.until ? frDate(h.until) : 'aujourd’hui'}
                  {h.reason ? ` · ${h.reason}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm text-center z-50">
          {toast}
        </div>
      )}
    </section>
  );
}
