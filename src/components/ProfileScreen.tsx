import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useSmartBack } from '../utils/useSmartBack';
import { ArrowRight, ChevronLeft, ImageUp, Trash2, Save, School, User, Phone, Check, MapPin, Clock, Lock } from 'lucide-react';
import { getProfile, saveProfile, readAndResizeImage, getActivationChrono, UserProfile } from '../utils/userProfile';
import {
  checkSchoolChange, applySchoolChange, bindSchool, boundSchool,
  bindingStatusMessage, redeemTransferCode,
} from '../utils/schoolBinding';
import { getDeviceId } from '../utils/coursePayment';
import { formatDateFr } from '../utils/simpleCode';
import { PLANS } from '../utils/subscription';
import { openWhatsApp } from '../utils/contact';

/**
 * Carte « Abonnement » : formule active + chrono d'expiration 1 an.
 * Pour une formule Essentiel, un bouton propose de passer à la formule Complet.
 * v64 : le Libellé est LU dans le catalogue (PLANS[plan]) — auparavant tout
 * plan non-Essentiel s'affichait « Complet », y compris le Pro (2500 F).
 */
function SubscriptionCard() {
  const chrono = getActivationChrono();
  if (!chrono.active || !chrono.expiresAt) return null;
  const planInfo = PLANS[chrono.plan];
  const isEssentiel = chrono.plan === 'essentiel';
  const isSchool = planInfo.school === true;
  const totalDays = 365;
  const elapsed = Math.min(totalDays, Math.max(0, totalDays - Math.max(0, chrono.daysLeft)));
  const pct = Math.round((elapsed / totalDays) * 100);
  return (
    <div className={`rounded-xl shadow p-4 mb-4 border ${chrono.expired ? 'bg-rose-50 border-rose-200' : 'bg-indigo-50 border-indigo-200'}`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-5 h-5 shrink-0 ${chrono.expired ? 'text-rose-600' : 'text-indigo-600'}`} />
        <h2 className={`font-bold text-sm ${chrono.expired ? 'text-rose-800' : 'text-indigo-900'}`}>
          Abonnement — code d'accès (valable 1 an)
        </h2>
      </div>
      <div className="mt-2 rounded-lg bg-white/80 border border-indigo-100 px-3 py-2">
        <p className="text-sm font-black text-slate-900">
          <span className={isEssentiel ? 'text-amber-700' : 'text-emerald-700'}>
            {isSchool ? '🏫' : isEssentiel ? '📋' : '⭐'} Formule {planInfo.label}
          </span>
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {isEssentiel
            ? 'Accès : enrôlement des élèves + importation des notes.'
            : isSchool
              ? 'Accès : toutes les fonctions Pro + l’Espace École de votre établissement (toutes ses classes).'
              : 'Accès : toutes les fonctionnalités de l’application.'}
        </p>
      </div>
      {chrono.expired ? (
        <p className="text-xs text-rose-700 mt-2 font-semibold">
          ⏰ Votre code d'accès a expiré le {formatDateFr(chrono.expiresAt)}. Contactez un administrateur pour obtenir un nouveau code.
        </p>
      ) : (
        <>
          <p className="text-xs text-indigo-800 mt-2">
            Code actif jusqu'au <strong>{formatDateFr(chrono.expiresAt)}</strong> —{' '}
            <strong>{chrono.daysLeft} jour{chrono.daysLeft > 1 ? 's' : ''} restant{chrono.daysLeft > 1 ? 's' : ''}</strong>.
          </p>
          <div className="mt-2 bg-white rounded-full h-2 overflow-hidden border border-indigo-100">
            <div className={`h-full ${chrono.daysLeft <= 30 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
          <p className="text-[10px] text-indigo-400 mt-1">Temps écoulé depuis l'activation : {pct}%</p>
        </>
      )}
      {isEssentiel && !chrono.expired && (
        <button
          onClick={() => openWhatsApp(`Bonjour, je souhaite passer à la formule COMPLET (1500 FCFA/an) de Master Soutien Pédagogique pour accéder à toutes les fonctionnalités.\n\nNom : ${chrono.name}\nMa formule actuelle : Essentiel (999 FCFA/an).`)}
          className="mt-3 w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold"
        >
          ⭐ Passer à la formule COMPLET — 1500 FCFA/an (WhatsApp)
        </button>
      )}
      <Link
        to="/activation"
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-900"
      >
        <span>{chrono.expired ? 'Renouveler mon abonnement' : 'Gérer ma formule / renouveler'}</span><ArrowRight className="h-4 w-4" />
      </Link>
      {!chrono.expired && (
        <Link
          to="/espace-ecole/abonnement"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-bold text-white"
        >
          <School className="h-4 w-4" />
          {isSchool ? 'Ouvrir l’Espace de mon école' : 'Découvrir l’abonnement École (6000 / 10000 F par an)'}
        </Link>
      )}
    </div>
  );
}

export default function ProfileScreen() {
  const goBack = useSmartBack();
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [saved, setSaved] = useState(false);
  /** v43 — message de blocage lorsque l'ecole ne correspond pas. */
  const [schoolError, setSchoolError] = useState('');
  /** Force le rafraichissement de l'encart de rattachement. */
  const [bindingTick, setBindingTick] = useState(0);
  const [transferCode, setTransferCode] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez choisir une image (JPG, PNG…).');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readAndResizeImage(file, 400);
      setProfile((p) => ({ ...p, schoolLogo: dataUrl }));
    } catch {
      alert("Impossible de lire cette image.");
    } finally {
      setUploading(false);
    }
  }

  function removeLogo() {
    setProfile((p) => ({ ...p, schoolLogo: undefined }));
  }

  /*
   * v43 — l'utilisateur ne travaille que pour l'ecole de son premier
   * enregistrement. Un changement de nom d'ecole n'est accepte que si
   * l'administration a accorde une autorisation de transfert.
   */
  function handleSave() {
    const check = checkSchoolChange(profile.schoolName);
    if (!check.allowed) {
      setSchoolError(check.message);
      return;
    }
    if (check.isChange) {
      const ok = window.confirm(
        `Confirmer le changement d'etablissement ?\n\n`
        + `Ancien : ${boundSchool()}\nNouveau : ${profile.schoolName.trim()}\n\n`
        + 'Vos donnees deja enregistrees seront conservees.',
      );
      if (!ok) return;
      applySchoolChange(profile.schoolName, 'Changement declare par l utilisateur');
    } else {
      // Premier enregistrement : on verrouille l'ecole de rattachement.
      bindSchool(profile.schoolName);
    }
    setSchoolError('');
    saveProfile(profile);
    setBindingTick((t) => t + 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Mon espace</h1>
            <p className="text-emerald-100 text-sm">Profil & logo de l'école</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-md mx-auto">
        <SubscriptionCard />
        {!getActivationChrono().active && (
          <Link to="/activation" className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
            <span><strong className="block">Choisir ou renouveler une formule</strong><span className="mt-1 block text-xs text-emerald-800">Individuelle ou établissement · activation par WhatsApp</span></span>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        )}
        {/* Logo de l'école */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            <School className="w-5 h-5 text-emerald-600" />
            Logo de l'école
          </h2>
          <p className="text-gray-500 text-sm mb-3">
            Ce logo apparaîtra en haut des bulletins scolaires de vos élèves.
          </p>

          <div className="flex flex-col items-center">
            {profile.schoolLogo ? (
              <div className="text-center">
                <img
                  src={profile.schoolLogo}
                  alt="Logo école"
                  className="w-32 h-32 object-contain border rounded-xl bg-gray-50 mx-auto"
                />
                <button
                  onClick={removeLogo}
                  className="text-red-600 text-sm mt-2 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Retirer le logo
                </button>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50">
                <ImageUp className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm font-medium">
                  {uploading ? 'Chargement...' : 'Télécharger le logo'}
                </p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG (recommandé : carré)</p>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
            {profile.schoolLogo && (
              <label className="w-full mt-3 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-center cursor-pointer text-sm font-medium">
                Changer le logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Informations */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'enseignant</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={profile.teacherName}
                onChange={(e) => setProfile({ ...profile, teacherName: e.target.value })}
                placeholder="Votre nom"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'école</label>
            <div className="relative">
              <School className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={profile.schoolName}
                onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                placeholder="Ex: EPP Cotonou Centre"
                data-testid="champ-ecole"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* v43 — etablissement de rattachement et transfert */}
            <div className="mt-2" key={bindingTick}>
              <p className="text-xs text-gray-600" data-testid="statut-rattachement">
                {bindingStatusMessage()}
              </p>

              {schoolError && (
                <div
                  data-testid="erreur-ecole"
                  className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3"
                >
                  <p className="text-sm text-amber-900 flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{schoolError}</span>
                  </p>

                  <p className="text-xs text-gray-700 mt-2">
                    Identifiant de cet appareil :{' '}
                    <code data-testid="identifiant-transfert" className="font-bold">
                      {getDeviceId()}
                    </code>
                  </p>

                  <label className="block mt-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Code d’autorisation de transfert
                    </span>
                    <input
                      data-testid="champ-code-transfert"
                      value={transferCode}
                      onChange={(e) => setTransferCode(e.target.value)}
                      placeholder="XXXX-XXXX"
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base uppercase"
                    />
                  </label>
                  <button
                    data-testid="btn-valider-transfert"
                    onClick={() => {
                      if (redeemTransferCode(transferCode)) {
                        setTransferCode('');
                        setSchoolError('');
                        setBindingTick((t) => t + 1);
                        alert('Transfert autorisé. Enregistrez maintenant votre nouvelle école.');
                      } else {
                        alert('Code incorrect. Vérifiez auprès du Super Administrateur.');
                      }
                    }}
                    className="mt-2 w-full bg-amber-600 text-white font-bold py-3 rounded-lg text-sm active:scale-95"
                  >
                    Valider l’autorisation
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (facultatif)</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Ex: +229 ..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Circonscription</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profile.circonscription || ''}
                  onChange={(e) => setProfile({ ...profile, circonscription: e.target.value })}
                  placeholder="Ex: Cotonou 1"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commune</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profile.commune || ''}
                  onChange={(e) => setProfile({ ...profile, commune: e.target.value })}
                  placeholder="Ex: Akassato"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            saved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Enregistré !' : 'Enregistrer mon profil'}
        </button>

      </main>
    </div>
  );
}
