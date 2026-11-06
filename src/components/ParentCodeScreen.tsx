/**
 * CÔTÉ ÉCOLE — REMISE DU DOSSIER AUX PARENTS (v48, étape ①).
 *
 * L'enseignant choisit un élève, génère un code de rattachement et
 * produit un fichier chiffré destiné au parent de CET élève.
 *
 * Deux principes de sécurité visibles à l'écran :
 *  1. Le code s'affiche UNE SEULE FOIS, au moment de la génération. Il
 *     n'est pas conservé en clair : le journal ne garde que sa trace.
 *     S'il est perdu, on en génère un nouveau — on ne le « retrouve » pas.
 *  2. Le fichier et le code doivent voyager SÉPARÉMENT. Le code se remet
 *     en main propre ; le fichier peut passer par n'importe quel canal,
 *     puisqu'il est illisible sans le code.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, KeyRound, Send, Copy, ShieldAlert, Ban, Check, Users,
} from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { copyText } from '../utils/clipboard';
import { getAllClasses } from '../utils/database';
import type { ClassData } from '../utils/database';
import { getProfile } from '../utils/userProfile';
import { evaluationsForClass } from '../utils/database';
import {
  issueLinkCode, loadLinkCodes, revokeLinkCode, codeState, buildChildDossier, sealDossier,
  ParentLinkCode, CODE_VALIDITY_DAYS,
} from '../utils/parentLink';

function frDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR');
}

export default function ParentCodeScreen() {
  const goBack = useSmartBack();
  const profile = getProfile();

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState('');
  const [freshCode, setFreshCode] = useState<ParentLinkCode | null>(null);
  const [codes, setCodes] = useState<ParentLinkCode[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAllClasses().then((cs) => {
      setClasses(cs);
      if (cs.length > 0) setClassId(cs[0].id);
    });
    setCodes(loadLinkCodes());
  }, []);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === classId) || null,
    [classes, classId],
  );

  const students = useMemo(
    () => [...(currentClass?.students || [])].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [currentClass],
  );

  function handleGenerate() {
    const student = students.find((s) => s.id === studentId);
    if (!currentClass || !student) {
      setStatus('Choisissez une classe puis un élève.');
      return;
    }
    const entry = issueLinkCode(student, currentClass.id, currentClass.name);
    setFreshCode(entry);
    setCodes(loadLinkCodes());
    setStatus('');
  }

  async function handleSendFile() {
    const student = students.find((s) => s.id === studentId);
    if (!currentClass || !student || !freshCode) {
      setStatus('Générez d’abord un code de rattachement.');
      return;
    }
    setBusy(true);
    try {
      // Les évaluations réellement définies pour cette classe :
      // evaluationsForClass renvoie deja { id, label }.
      const evals = evaluationsForClass(currentClass).map((e) => ({
        id: String(e.id),
        label: e.label,
      }));

      let attendance: unknown[] = [];
      try {
        attendance = JSON.parse(localStorage.getItem('msp_attendance_records') || '[]');
      } catch { /* registre illisible : dossier sans absences */ }

      const dossier = buildChildDossier(currentClass, student.id, {
        schoolName: profile.schoolName || 'Mon établissement',
        teacherName: profile.teacherName || '',
        attendance: attendance as never,
        message: message.trim() || undefined,
        evaluations: evals,
      });
      if (!dossier) { setStatus('Élève introuvable.'); return; }

      const envelope = await sealDossier(dossier, freshCode.code);
      const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = `${student.nom}-${student.prenoms}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.href = url;
      a.download = `dossier-${safe}.msp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Dossier chiffré créé. Remettez le code au parent séparément.');
    } catch {
      setStatus('La création du dossier a échoué.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!freshCode) return;
    // Helper du projet : gere les navigateurs sans presse-papier.
    const done = await copyText(freshCode.code);
    setStatus(done ? 'Code copié.' : 'Copie impossible : recopiez le code à la main.');
  }

  function handleRevoke(code: string) {
    if (!window.confirm('Révoquer ce rattachement ? Le parent ne pourra plus ouvrir de nouveau dossier avec ce code.')) return;
    revokeLinkCode(code);
    setCodes(loadLinkCodes());
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-module-header msp-kente p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Dossier pour les parents</h1>
            <p className="text-white/80 text-sm">Code de rattachement et envoi sécurisé</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10">
        <div className="msp-card p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900 flex gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              Le dossier ne contient <strong>que l’élève choisi</strong> : aucune note,
              aucune absence et aucun nom d’un autre enfant. Remettez le code
              <strong> en main propre</strong> au parent, jamais dans un groupe.
            </span>
          </p>
        </div>

        {status && (
          <p data-testid="statut-parent-code" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule" />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Classe</span>
            <select
              data-testid="select-classe-parent"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setStudentId(''); setFreshCode(null); }}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              {classes.length === 0 && <option value="">Aucune classe</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Élève</span>
            <select
              data-testid="select-eleve-parent"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setFreshCode(null); }}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              <option value="">— Choisir un élève —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.nom} {s.prenoms}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Mot au parent (facultatif)</span>
            <textarea
              rows={2}
              data-testid="champ-message-parent"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex. Votre enfant progresse en calcul, merci de faire réviser les tables."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
            />
          </label>

          <button
            data-testid="btn-generer-code"
            onClick={handleGenerate}
            disabled={!studentId}
            className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-5 h-5" /> Générer le code de rattachement
          </button>
        </div>

        {freshCode && (
          <div className="msp-card p-4 space-y-3 border-2 border-[#046a38]" data-testid="bloc-code-genere">
            <p className="text-xs font-semibold text-gray-600">
              Code à remettre au parent — <strong>affiché une seule fois</strong>
            </p>
            <p
              data-testid="code-rattachement"
              className="text-center text-2xl font-mono font-extrabold tracking-widest text-[#046a38] bg-emerald-50 rounded-lg py-3 select-all"
            >
              {freshCode.code}
            </p>
            <p className="text-xs text-gray-500 text-center">
              Valable {CODE_VALIDITY_DAYS} jours (jusqu’au {frDate(freshCode.expiresAt)}).
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyCode}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copier
              </button>
              <button
                data-testid="btn-creer-dossier"
                onClick={handleSendFile}
                disabled={busy}
                className="bg-[#b34700] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Créer le dossier
              </button>
            </div>
          </div>
        )}

        <div className="msp-card p-4">
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#046a38]" /> Journal des rattachements ({codes.length})
          </h2>
          {codes.length === 0 && (
            <p className="text-sm text-gray-500">Aucun code émis pour l’instant.</p>
          )}
          <div className="space-y-2" data-testid="journal-rattachements">
            {codes.map((c) => {
              const st = codeState(c);
              return (
                <div key={c.code + c.createdAt} className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{c.studentLabel}</p>
                    <p className="text-xs text-gray-500">
                      {c.className} · émis le {frDate(c.createdAt)}
                      {c.usedAt && ` · utilisé le ${frDate(c.usedAt)}`}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                    st === 'valide' ? 'bg-emerald-100 text-emerald-700'
                    : st === 'revoque' ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'}`}
                  >
                    {st === 'valide' ? 'Actif' : st === 'revoque' ? 'Révoqué' : 'Expiré'}
                  </span>
                  {st === 'valide' && (
                    <button
                      onClick={() => handleRevoke(c.code)}
                      className="text-red-600 p-2"
                      aria-label="Révoquer"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {st !== 'valide' && <Check className="w-4 h-4 text-gray-300" />}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
