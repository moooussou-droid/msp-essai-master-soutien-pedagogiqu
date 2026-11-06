import { useMemo } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { Award, CheckCircle2, ChevronLeft, Printer, ShieldAlert, ShieldCheck } from 'lucide-react';
import { verifyBulletinPayload, BulletVerifyResult } from '../utils/bulletinVerify';

function decodePayload(): BulletVerifyResult {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
  const raw = params.get('data');
  if (!raw) return { status: 'invalid', data: null };
  return verifyBulletinPayload(raw);
}

export default function VerifyBulletinScreen() {
  const goBack = useSmartBack();
  const result = useMemo(decodePayload, []);
  const data = result.data;

  function printCertificate() {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) { alert('Votre navigateur a bloqué l’ouverture de la fenêtre d’impression.'); return; }
    const esc = (t: string) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows: [string, string][] = [
      ['Code', data.code], ['Matricule', data.matricule], ['Élève', data.nom],
      ['Classe', data.classe], ['Moyenne', `${data.moyenne}/20`], ['Rang', data.rang],
      ['Matières validées', data.validated], ['Décision', data.decision],
    ];
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Certificat — ${esc(data.nom)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}.sc{background:#059669;color:#fff;padding:14px;text-align:center;border-radius:8px}h1{margin:10px 0 2px;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td{border-bottom:1px solid #ddd;padding:7px 4px;font-size:12.5px}td:first-child{color:#555}td:last-child{font-weight:bold;text-align:right}.ok{margin-top:12px;background:#ecfdf5;border:1px solid #a7f3d0;padding:10px;font-size:12px;color:#065f46}.foot{margin-top:16px;font-size:11px;color:#555;text-align:center}@media print{body{padding:0}}</style></head><body>` +
      `<div class="sc"><p style="margin:0;font-size:11px">CERTIFICAT D'AUTHENTICITÉ</p><h1>Bulletin scolaire officiel</h1><p style="margin:0;font-size:11px">EducMaster MEMP Bénin — Master Soutien Pédagogique</p></div>` +
      `<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` +
      `<div class="ok">${result.status === 'valid' ? '✅ Intégrité vérifiée : les informations n’ont pas été modifiées.' : result.status === 'tampered' ? '⚠️ Données altérées : le contenu ne correspond plus au sceau d’origine.' : 'ℹ️ Certificat non signé (ancien format).'}</div>` +
      `<p class="foot">Imprimé le ${new Date().toLocaleDateString('fr-FR')} — Master Soutien Pédagogique</p></body></html>`);
    win.document.close();
    win.focus();
    win.onload = () => { win.focus(); win.print(); };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-lg">Vérification d'authenticité</h1><p className="text-emerald-100 text-sm">Certificat officiel du bulletin</p></div>
        </div>
      </header>
      <main className="p-4 max-w-md mx-auto">
        {!data ? (
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <Award className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-800">Code invalide</p>
            <p className="text-gray-500 text-sm">Impossible de lire les informations du bulletin. Vérifiez que le lien n’a pas été coupé.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-emerald-600 text-white p-5 text-center">
              {result.status === 'valid' && <ShieldCheck className="w-16 h-16 mx-auto mb-2" />}
              {result.status === 'tampered' && <ShieldAlert className="w-16 h-16 mx-auto mb-2" />}
              {result.status === 'unsigned' && <Award className="w-16 h-16 mx-auto mb-2" />}
              <h2 className="font-bold text-xl">
                {result.status === 'valid' ? 'Bulletin authentifié' : result.status === 'tampered' ? 'Données altérées' : 'Bulletin non signé'}
              </h2>
              <p className="text-emerald-100 text-sm">Certification EducMaster MEMP</p>
            </div>
            <div className="p-5 space-y-3">
              <Row label="Code" value={data.code} />
              <Row label="Matricule" value={data.matricule} />
              <Row label="Élève" value={data.nom} />
              <Row label="Classe" value={data.classe} />
              <Row label="Moyenne" value={`${data.moyenne}/20`} />
              <Row label="Rang" value={data.rang} />
              <Row label="Matières validées" value={data.validated} />
              <Row label="Décision" value={data.decision} />
              {result.status === 'valid' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-emerald-800 text-sm">Intégrité vérifiée : ces informations n’ont pas été modifiées depuis la génération du bulletin.</p>
                </div>
              )}
              {result.status === 'tampered' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-red-800 text-sm">Le contenu ne correspond plus au sceau d’origine : le bulletin a été modifié après génération.</p>
                </div>
              )}
              {result.status === 'unsigned' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                  <Award className="w-5 h-5 text-gray-500 shrink-0" />
                  <p className="text-gray-600 text-sm">Certificat au format historique (sans signature) : régénérez le bulletin pour obtenir le sceau intégré.</p>
                </div>
              )}
              <button onClick={printCertificate} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer className="w-5 h-5" /> Imprimer le certificat</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b pb-2 text-sm"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-800 text-right">{value}</span></div>;
}
