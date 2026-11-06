/**
 * PANNEAU « CONCOURS DU QUIZ » (v39).
 *
 * L'élève clique « Je participe » pour s'inscrire au concours de la semaine
 * suivante. L'inscription n'est possible que du SAMEDI 18h00 au DIMANCHE 21h00.
 *
 * HONNÊTETÉ DU COMPTEUR : l'application étant hors ligne, cet écran distingue
 * toujours le nombre d'inscrits connus de cet appareil et le TOTAL OFFICIEL
 * publié par le Super Administrateur. Aucun chiffre n'est inventé.
 */
import { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, CalendarClock, CheckCircle2, Send } from 'lucide-react';
import {
  isRegistrationOpen, registrationStatusMessage, nextWeekId, register,
  isRegistered, localCount, officialCount, participantsLabel, entriesForWeek,
} from '../utils/quizContest';
import { getDeviceId, getPaymentContact } from '../utils/coursePayment';
import { getProfile } from '../utils/userProfile';

export default function QuizContestPanel() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [now, setNow] = useState(() => new Date());
  const [nom, setNom] = useState(() => getProfile().teacherName || '');
  const [classe, setClasse] = useState('');
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  // L'ouverture dépend de l'heure : on réévalue chaque minute.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const semaine = nextWeekId(now);
  const ouvert = isRegistrationOpen(now);
  const inscrit = useMemo(() => isRegistered(deviceId, semaine), [deviceId, semaine, tick]);
  const locaux = useMemo(() => localCount(semaine), [semaine, tick]);
  const officiel = useMemo(() => officialCount(semaine), [semaine, tick]);

  function participer() {
    const r = register(nom, deviceId, classe, new Date());
    setMessage(r.message);
    setTick((t) => t + 1);
  }

  /** Message prêt à envoyer à l'administrateur pour centraliser les inscriptions. */
  function envoyerAdmin() {
    const contact = getPaymentContact();
    const liste = entriesForWeek(semaine);
    const texte = encodeURIComponent(
      `Concours quiz ${semaine} — ${liste.length} inscription(s) depuis cet appareil :\n` +
      liste.map((e, i) => `${i + 1}. ${e.name}${e.classe ? ' (' + e.classe + ')' : ''}`).join('\n'),
    );
    const num = (contact.whatsapp || contact.phone || '').replace(/[^0-9]/g, '');
    if (!num) { setMessage("Aucun contact administrateur n'est encore configuré."); return; }
    window.open(`https://wa.me/${num}?text=${texte}`, '_blank');
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4 mb-4" data-testid="contest-panel">
      <h2 className="font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" /> Concours de la semaine
      </h2>

      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Le quiz est un <strong>concours hebdomadaire</strong>. Pour y prendre part, signale ta
        participation, puis concours pendant la semaine <strong>{semaine}</strong>.
      </p>

      <div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${ouvert ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
        <CalendarClock className="w-4 h-4 inline mr-1" />
        {registrationStatusMessage(now)}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Fenêtre d’inscription : du <strong>samedi 18h00</strong> au <strong>dimanche 21h00</strong>.
      </p>

      {/* ---- Compteur de participants, sans jamais inventer de chiffre ---- */}
      <div className="mt-3 rounded-xl bg-gray-50 dark:bg-slate-700 p-3">
        <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4" /> Participants
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1" data-testid="contest-count">
          {participantsLabel(semaine)}
        </p>
        {!officiel && (
          <p className="text-xs text-gray-500 mt-1">
            L’application fonctionne hors ligne : elle ne peut pas compter seule les inscrits des
            autres téléphones. Le total officiel est publié par l’administrateur.
          </p>
        )}
        {officiel?.note && <p className="text-xs text-gray-600 mt-1">Note : {officiel.note}</p>}
      </div>

      {/* ---- Inscription ---- */}
      {inscrit ? (
        <p className="mt-3 rounded-xl bg-emerald-600 text-white p-3 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Tu es inscrit pour la semaine {semaine}. Bonne chance !
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ton nom et prénom"
            className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg"
          />
          <input
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            placeholder="Ta classe (facultatif)"
            className="w-full p-3 border dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg"
          />
          <button
            onClick={participer}
            disabled={!ouvert}
            data-testid="btn-participer"
            className={`w-full py-3 rounded-xl font-black ${ouvert ? 'bg-amber-500 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Je participe
          </button>
          {!ouvert && (
            <p className="text-xs text-center text-gray-500">
              Le bouton s’activera samedi à 18h00.
            </p>
          )}
        </div>
      )}

      {locaux > 0 && (
        <button onClick={envoyerAdmin} className="mt-2 w-full py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Transmettre les inscriptions à l’administrateur
        </button>
      )}

      {message && <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200" role="status">{message}</p>}
    </section>
  );
}
