/**
 * BANDEAU DE LICENCE (v47).
 *
 * ── DEMANDE ──────────────────────────────────────────────────────────
 * « Ajoute en haut de chaque page de l'application : LICENCE : MOISE OUSSOU ».
 *
 * ── DÉCISION RETENUE (arbitrage utilisateur) ─────────────────────────
 * Le nom affiché est celui du TITULAIRE DU CODE D'ACCÈS connecté, et non
 * une mention figée. « MOISE OUSSOU » n'est que le cas du compte de
 * l'utilisateur qui a formulé la demande.
 *
 * Intérêt métier : le bandeau devient un marquage nominatif visible sur
 * chaque écran (et sur les captures d'écran). Il dissuade le partage d'un
 * même code entre plusieurs enseignants, ce qui prolonge la règle
 * « un code = un utilisateur = une école » posée en v43 et renforcée ici.
 *
 * Tant qu'aucun compte n'est activé, on affiche la mention générique de
 * l'éditeur plutôt qu'un bandeau vide.
 */
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getActivation, getProfile } from '../utils/userProfile';
import { boundSchool } from '../utils/schoolBinding';

/** Nom à afficher : titulaire du code, sinon nom du profil, sinon éditeur. */
export function licenceHolder(): string {
  try {
    const act = getActivation();
    if (act?.activated && (act.name || '').trim()) return act.name.trim().toUpperCase();
    const prof = getProfile();
    if ((prof.teacherName || '').trim()) return prof.teacherName.trim().toUpperCase();
  } catch {
    /* stockage illisible : on retombe sur la mention générique */
  }
  return 'MASTER SOUTIEN PÉDAGOGIQUE';
}

/**
 * Établissement de rattachement de l'abonnement (v60).
 * Affiché à côté du titulaire : l'utilisateur voit en permanence sous
 * quelle école son abonnement est enregistré, et comprend immédiatement
 * pourquoi le champ « École » est verrouillé ailleurs dans l'application.
 */
export function licenceSchool(): string {
  try {
    const lie = (boundSchool() || '').trim();
    if (lie) return lie.toUpperCase();
    // Pas encore de rattachement : on montre l'école du profil, si elle existe.
    const prof = getProfile();
    if ((prof.schoolName || '').trim()) return prof.schoolName.trim().toUpperCase();
  } catch { /* stockage illisible */ }
  return '';
}

export default function LicenceBanner() {
  const [holder, setHolder] = useState(licenceHolder);
  const [school, setSchool] = useState(licenceSchool);

  useEffect(() => {
    // Le nom change après activation ou modification du profil : on
    // réévalue sur les évènements de stockage et au retour sur l'onglet.
    const refresh = () => { setHolder(licenceHolder()); setSchool(licenceSchool()); };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    const id = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      data-testid="bandeau-licence"
      className="msp-licence-bar print:hidden"
      role="note"
      aria-label={`Licence attribuée à ${holder}${school ? `, école ${school}` : ''}`}
    >
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        LICENCE : <strong className="font-extrabold tracking-wide">{holder}</strong>
        {school && (
          <>
            {' · '}
            <strong data-testid="licence-ecole" className="font-extrabold tracking-wide">
              {school}
            </strong>
          </>
        )}
      </span>
    </div>
  );
}
