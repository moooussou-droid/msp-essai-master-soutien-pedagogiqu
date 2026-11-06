import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import { ChevronLeft, FileDown, Printer, Target } from 'lucide-react';
import { ClassData, getClass } from '../utils/database';
import { SUBJECT_THRESHOLD, SubjectStatRow, computeSubjectStats, summarizeSubjectStats } from '../utils/subjectStats';
// v45 : vrai fichier PDF, en plus de l'impression deja presente (regle v41).
import { exportSubjectStatsPdf } from '../utils/reportPdf';

function Cell({ v, pct }: { v: number; pct?: number }) {
  return (
    <td className="p-2 text-center whitespace-nowrap">
      <span className="font-semibold">{v}</span>
      {pct !== undefined && <span className="text-xs text-gray-500 block">{pct.toFixed(1)} %</span>}
    </td>
  );
}

export default function SubjectStatisticsScreen() {
  const { id } = useParams();
  const goBack = useSmartBack();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [rows, setRows] = useState<SubjectStatRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        const data = await getClass(id);
        if (!alive) return;
        setClassData(data || null);
        if (data) setRows(computeSubjectStats(data));
      } catch (e) {
        console.error('Erreur chargement statistiques par discipline', e);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (!classData) return <div className="p-4 text-center">Chargement…</div>;

  const summary = summarizeSubjectStats(rows);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal-700 text-white p-4 sticky top-0 z-10 shadow print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg" aria-label="Retour">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Statistiques par discipline</h1>
            <p className="text-teal-100 text-sm">{classData.name} — seuil de réussite : {SUBJECT_THRESHOLD}/20</p>
          </div>
          <button
            data-testid="btn-pdf-disciplines"
            onClick={() => exportSubjectStatsPdf(classData, rows)}
            className="p-2 bg-white/20 rounded-lg mr-1"
            aria-label="Télécharger le PDF"
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button data-testid="btn-imprimer-disciplines" onClick={() => window.print()} className="p-2 bg-white/20 rounded-lg" aria-label="Imprimer">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-7xl mx-auto">
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-teal-700 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{summary.disciplines}</p><p className="text-xs text-teal-100">Disciplines</p>
          </div>
          <div className="bg-emerald-600 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{summary.evaluees}</p><p className="text-xs">Évaluées</p>
          </div>
          <div className="bg-blue-600 text-white rounded-xl shadow p-3 text-center">
            <p className="text-2xl font-black">{summary.moyenneReussite}%</p><p className="text-xs">Seuil atteint (moy.)</p>
          </div>
          <div className={`${summary.critiques.length ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'} rounded-xl shadow p-3 text-center`}>
            <p className="text-2xl font-black">{summary.critiques.length}</p><p className="text-xs">Matières critiques</p>
          </div>
        </section>

        {rows[0]?.sexeNonRenseigne > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
            <strong>{rows[0].sexeNonRenseigne} élève(s)</strong> n’ont pas de sexe renseigné : ils comptent dans le total
            mais pas dans la ventilation Filles/Garçons. Complétez-le dans <em>Élèves</em> pour une répartition exacte.
          </div>
        )}

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Target className="w-5 h-5 text-teal-700" /> Tableau statistique par matière évaluée</h2>
            <p className="text-gray-500 text-sm">Ventilation Fille (Féminin) / Garçon (Masculin) — seuil atteint à partir de {SUBJECT_THRESHOLD}/20.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-teal-700 text-white">
                  <th rowSpan={2} className="p-2 text-left align-bottom">Discipline / Matière</th>
                  <th rowSpan={2} className="p-2 align-bottom">Genre</th>
                  <th rowSpan={2} className="p-2 align-bottom">Nombre<br />d’inscrits</th>
                  <th rowSpan={2} className="p-2 align-bottom">Nombre ayant<br />composé</th>
                  <th colSpan={1} className="p-2 bg-red-600">N’ayant pas atteint le seuil</th>
                  <th colSpan={1} className="p-2 bg-emerald-600">Ayant atteint le seuil</th>
                  <th rowSpan={2} className="p-2 align-bottom">Moyenne<br />/20</th>
                </tr>
                <tr className="bg-teal-800 text-white text-xs">
                  <th className="p-2">Nombre et %</th>
                  <th className="p-2">Nombre et %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <Fragment key={row.subject.id}>
                    <tr className="border-t bg-pink-50/40">
                      <td rowSpan={3} className="p-2 font-semibold align-top border-r">{row.subject.name}</td>
                      <td className="p-2 text-center font-semibold text-pink-700">Filles (F)</td>
                      <Cell v={row.filles.inscrits} />
                      <Cell v={row.filles.composants} />
                      <Cell v={row.filles.sousSeuil} pct={row.filles.sousSeuilPct} />
                      <Cell v={row.filles.atteint} pct={row.filles.atteintPct} />
                      <td className="p-2 text-center">{row.filles.moyenne?.toFixed(2) ?? '—'}</td>
                    </tr>
                    <tr className="bg-blue-50/40">
                      <td className="p-2 text-center font-semibold text-blue-700">Garçons (M)</td>
                      <Cell v={row.garcons.inscrits} />
                      <Cell v={row.garcons.composants} />
                      <Cell v={row.garcons.sousSeuil} pct={row.garcons.sousSeuilPct} />
                      <Cell v={row.garcons.atteint} pct={row.garcons.atteintPct} />
                      <td className="p-2 text-center">{row.garcons.moyenne?.toFixed(2) ?? '—'}</td>
                    </tr>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="p-2 text-center">TOTAL</td>
                      <Cell v={row.total.inscrits} />
                      <Cell v={row.total.composants} />
                      <Cell v={row.total.sousSeuil} pct={row.total.sousSeuilPct} />
                      <Cell v={row.total.atteint} pct={row.total.atteintPct} />
                      <td className="p-2 text-center">{row.total.moyenne?.toFixed(2) ?? '—'}</td>
                    </tr>
                  </Fragment>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-gray-400">Aucune matière enregistrée pour cette classe.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow mt-4 overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-900">Difficultés observées et remédiations</h2>
            <p className="text-gray-500 text-sm">Diagnostic automatique à partir des résultats — à adapter selon votre observation de classe.</p>
          </div>
          <div className="divide-y">
            {rows.map(row => (
              <div key={row.subject.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-bold text-gray-800">{row.subject.name}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${row.total.atteintPct >= 60 ? 'bg-emerald-100 text-emerald-700' : row.total.atteintPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    Seuil atteint : {row.total.atteintPct.toFixed(1)} %
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-2"><strong>Difficultés observées :</strong> {row.difficultes}</p>
                <p className="text-sm text-emerald-800 mt-1"><strong>À remédier :</strong> {row.remediation}</p>
              </div>
            ))}
            {rows.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">Rien à analyser pour le moment.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
