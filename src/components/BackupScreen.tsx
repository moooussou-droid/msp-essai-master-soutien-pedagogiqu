/**
 * ⑦ SAUVEGARDE VERS UN SECOND APPAREIL (v52).
 *
 * ── LE RISQUE ────────────────────────────────────────────────────────
 * L'application est 100 % locale : toutes les données vivent dans le
 * téléphone. Sa perte, son vol ou une panne effacent l'année entière.
 * C'est le risque le plus grave de l'architecture choisie.
 *
 * Cet écran produit un fichier de sauvegarde COMPLET (classes, notes,
 * présences, registres, paiements…), à copier sur un second appareil,
 * une clé USB ou une carte mémoire. Il enregistre la date de chaque
 * sauvegarde et ALERTE quand la dernière devient trop ancienne : une
 * sauvegarde qu'on oublie de faire ne protège de rien.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Upload, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useSmartBack } from '../utils/useSmartBack';
import { exportAllData, importAllData, getAllClasses } from '../utils/database';
import {
  BackupLogEntry, loadBackupLog, recordBackup,
  daysSinceLastBackup, backupIsStale, BACKUP_STALE_DAYS,
} from '../utils/schoolLife';

function human(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

function frDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}h${p(d.getMinutes())}`;
}

export default function BackupScreen() {
  const goBack = useSmartBack();
  const [log, setLog] = useState<BackupLogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [classCount, setClassCount] = useState(0);

  useEffect(() => {
    setLog(loadBackupLog());
    getAllClasses().then((c) => setClassCount(c.length));
  }, []);

  const days = useMemo(() => daysSinceLastBackup(log), [log]);
  const stale = useMemo(() => backupIsStale(log), [log]);

  async function doExport() {
    setBusy(true);
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sauvegarde-msp-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setLog(recordBackup({ at: Date.now(), size: blob.size, classes: classCount }));
      setStatus(`Sauvegarde créée (${human(blob.size)}). Copiez-la sur un autre appareil.`);
    } catch {
      setStatus('La sauvegarde a échoué.');
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(''), 6000);
    }
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    /*
     * La restauration ECRASE les données présentes : on exige une
     * confirmation explicite. Sans cet avertissement, un utilisateur
     * pourrait détruire son travail en croyant « fusionner ».
     */
    if (!window.confirm(
      'ATTENTION : la restauration remplace les données de cet appareil par celles du fichier.\n\n'
      + 'Faites d’abord une sauvegarde si vous avez un doute.\n\nContinuer ?',
    )) return;

    setBusy(true);
    try {
      const text = await file.text();
      await importAllData(text);
      setStatus('Restauration terminée. Rouvrez l’application pour voir les données.');
      getAllClasses().then((c) => setClassCount(c.length));
    } catch {
      setStatus('Fichier illisible ou format invalide.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="msp-kente bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Sauvegarde et restauration</h1>
            <p className="text-white/80 text-sm">Protégez l’année scolaire</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-28">
        {status && (
          <p data-testid="statut-sauvegarde" className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {status}
          </p>
        )}

        <div
          data-testid="etat-sauvegarde"
          className={`rounded-xl p-4 border ${stale
            ? 'bg-red-50 border-red-300'
            : 'bg-emerald-50 border-emerald-300'}`}
        >
          <p className={`font-bold flex items-center gap-2 ${stale ? 'text-red-800' : 'text-emerald-800'}`}>
            {stale ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            {days === null
              ? 'Aucune sauvegarde effectuée'
              : stale
                ? `Dernière sauvegarde il y a ${days} jour(s)`
                : `Sauvegarde à jour (il y a ${days} jour(s))`}
          </p>
          <p className={`text-xs mt-1 ${stale ? 'text-red-700' : 'text-emerald-700'}`}>
            {days === null
              ? 'Si vous perdez ce téléphone, toutes vos données seront perdues. Faites une sauvegarde maintenant.'
              : stale
                ? `Une sauvegarde est recommandée au moins tous les ${BACKUP_STALE_DAYS} jours.`
                : 'Pensez à conserver le fichier sur un autre appareil.'}
          </p>
        </div>

        <div className="msp-card p-4 space-y-3">
          <div className="msp-flag-rule" />
          <h2 className="font-bold text-gray-800">Créer une sauvegarde</h2>
          <p className="text-sm text-gray-600">
            Un seul fichier contenant vos données de classe, élèves, notes, présences, registres,
            paiements, emplois du temps, réglages et textes personnalisés d’arts oraux. Les fichiers
            audio et vidéo importés ne sont pas inclus dans cette sauvegarde générale. Pour les copier avec leurs ressources orales sur un autre appareil, utilisez l’export ZIP du module « Poésies, chants, comptines et contes ».
          </p>
          <button
            data-testid="btn-sauvegarder" onClick={doExport} disabled={busy}
            className="w-full bg-[#046a38] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" /> {busy ? 'Préparation…' : 'Télécharger la sauvegarde'}
          </button>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-semibold">Où conserver le fichier ?</p>
            <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
              <li>• Sur un <strong>second téléphone</strong> (le plus sûr)</li>
              <li>• Sur une clé USB ou une carte mémoire</li>
              <li>• Envoyé à votre propre adresse e-mail ou WhatsApp</li>
            </ul>
          </div>
        </div>

        <div className="msp-card p-4 space-y-3">
          <h2 className="font-bold text-gray-800">Restaurer depuis un fichier</h2>
          <p className="text-sm text-gray-600">
            Sur un nouvel appareil, importez le fichier pour retrouver toutes vos données.
          </p>
          <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            ⚠️ La restauration <strong>remplace</strong> les données présentes sur cet appareil.
          </p>
          <label className="w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" /> Choisir un fichier de sauvegarde
            <input
              type="file" accept=".json,application/json" onChange={doImport}
              className="hidden" data-testid="input-restaurer"
            />
          </label>
        </div>

        {log.length > 0 && (
          <div className="msp-card p-4" data-testid="historique-sauvegardes">
            <h3 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Dernières sauvegardes
            </h3>
            {log.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 py-2 last:border-0">
                <span className="text-gray-700">{frDateTime(e.at)}</span>
                <span className="text-gray-500">{human(e.size)} · {e.classes} classe(s)</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
