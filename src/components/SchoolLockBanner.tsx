/**
 * BANDEAU DE RATTACHEMENT À L'ÉCOLE (v43).
 *
 * L'application n'est utilisable que pour l'école du premier enregistrement.
 * Si le profil affiche une autre école que celle du rattachement, ce bandeau
 * prévient l'utilisateur et le renvoie vers la marche à suivre.
 *
 * Choix assumé : on AVERTIT sans bloquer l'accès aux écrans. Couper l'accès
 * à des données déjà saisies (notes, présences, comptabilité) en pleine année
 * scolaire causerait plus de tort que l'irrégularité constatée. Le verrou
 * réel se situe à l'enregistrement du profil, là où le changement d'école
 * se décide.
 */
import { AlertTriangle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadBinding, isSameSchool } from '../utils/schoolBinding';
import { getProfile } from '../utils/userProfile';

export default function SchoolLockBanner() {
  const navigate = useNavigate();
  const binding = loadBinding();
  const profile = getProfile();

  // Pas encore de rattachement, ou école conforme : aucun bandeau.
  if (!binding) return null;
  const current = (profile.schoolName || '').trim();
  if (!current || isSameSchool(binding.schoolName, current)) return null;

  return (
    <div
      data-testid="bandeau-ecole"
      className="bg-amber-50 border border-amber-300 rounded-xl p-3 m-3"
    >
      <p className="text-sm text-amber-900 font-semibold flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        Établissement différent de votre rattachement
      </p>
      <p className="text-xs text-amber-900 mt-1">
        Votre compte est rattaché à <strong>{binding.schoolName}</strong>, mais votre
        profil indique <strong>{current}</strong>.
        {binding.transferAllowed
          ? ' Un transfert a été autorisé : enregistrez votre profil pour le valider.'
          : ' Demandez une autorisation de transfert au Super Administrateur.'}
      </p>
      <button
        data-testid="btn-regler-ecole"
        onClick={() => navigate('/profile')}
        className="mt-2 bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-xs active:scale-95 flex items-center gap-1"
      >
        <Lock className="w-3 h-3" /> Régler mon établissement
      </button>
    </div>
  );
}
