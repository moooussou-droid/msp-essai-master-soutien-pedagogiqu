import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Briefcase, ChevronLeft, ClipboardCopy, GraduationCap, Minus, Printer, Search, Target, TrendingUp, UserRound, Users } from 'lucide-react';
import { ClassData, EvaluationId, getAllClasses, sortStudents, evaluationLabel } from '../utils/database';
import { buildClassOrientationOverview, buildOrientationRecommendations, buildStudentAdvice, classSchoolLevel, getDomainTrends, loadOrientationExtras, LEVEL_LABELS, OrientationRecommendation, schoolYearLabel, studentEvaluationsWithNotes } from '../utils/orientation';
import { normalizeSearch } from '../utils/textSearch';
import { copyText } from '../utils/clipboard';
import { printOrientationReport, printClassOrientationReport, STAGE_LABELS } from '../utils/orientationReport';

export default function OrientationScolaireScreen() {
  const goBack = useSmartBack();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'eleve' | 'classe'>('eleve');
  const [evalId, setEvalId] = useState<string>('');

  useEffect(() => {
    getAllClasses().then(data => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setClasses(sorted);
      if (sorted[0]) setClassId(sorted[0].id);
    });
  }, []);

  const selectedClass = classes.find(c => c.id === classId);
  const students = useMemo(() => sortStudents(selectedClass?.students || []), [selectedClass]);

  useEffect(() => {
    if (students[0]) setStudentId(students[0].id);
    else setStudentId('');
    setEvalId('');
  }, [classId, students.length]);

  const nq = normalizeSearch(search);
  const filteredStudents = students.filter(student => normalizeSearch(`${student.nom} ${student.prenoms}`).includes(nq));
  const student = students.find(s => s.id === studentId);
  const level = selectedClass ? classSchoolLevel(selectedClass) : 'primaire';
  const evalOptions = selectedClass && student ? studentEvaluationsWithNotes(selectedClass, student) : [];
  const analysis = selectedClass && student ? buildOrientationRecommendations(selectedClass, student, evalId ? evalId as EvaluationId : undefined) : null;
  const trends = selectedClass && student ? getDomainTrends(selectedClass, student) : [];
  const overview = selectedClass ? buildClassOrientationOverview(selectedClass) : null;
  const extras = loadOrientationExtras();
  const relatedExtras = analysis
    ? extras.filter(extra => analysis.recommendations.some(rec => extra.domains.includes(rec.domain) || extra.series.toLowerCase().includes(rec.series.toLowerCase().split(',')[0] || '')))
    : [];
  const advice = analysis ? buildStudentAdvice(analysis.performances, analysis.recommendations, analysis.domainScores) : '';
  const noNotes = analysis ? analysis.performances.length === 0 : false;
  const domainBars = analysis
    ? Object.entries(analysis.domainScores)
        .filter(([, v]) => (v ?? 0) > 0)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    : [];

  const levelHint = level === 'prescolaire'
    ? 'conseil d’éveil, sans orientation formelle'
    : level === 'primaire'
      ? 'conseil adapté au passage au collège'
      : 'conseil adapté aux séries du BAC';

  async function copyReport() {
    if (!student || !analysis) return;
    const text = `Orientation scolaire - ${student.nom.toUpperCase()} ${student.prenoms}\n\nPerformances :\n${analysis.performances.map(p => `- ${p.subjectName}: ${p.score.toFixed(2)}/20`).join('\n')}\n\nRecommandations :\n${analysis.recommendations.map(r => `- ${r.title}\nSéries/Filières : ${r.series}\nMatières à renforcer : ${r.subjectsToStrengthen.join(', ')}\nDébouchés : ${r.careers.join(', ')}`).join('\n\n')}\n\nConseil : ${advice}`;
    const okCopy = await copyText(text);
    alert(okCopy ? 'Conseil d’orientation copié.' : 'Impossible de copier automatiquement : sélectionnez le texte manuellement.');
  }

  function printReport() {
    if (!student || !analysis || !selectedClass) return;
    const okPrint = printOrientationReport({
      studentName: `${student.nom.toUpperCase()} ${student.prenoms}`,
      className: selectedClass.name,
      school: selectedClass.school,
      schoolYear: schoolYearLabel(),
      performances: analysis.performances,
      recommendations: analysis.recommendations,
      domainScores: analysis.domainScores,
      advice,
    });
    if (!okPrint) alert('Votre navigateur a bloqué l’ouverture de la fenêtre d’impression.');
  }

  function printClassReport() {
    if (!selectedClass || !overview) return;
    const okPrint = printClassOrientationReport({
      className: selectedClass.name,
      school: selectedClass.school,
      schoolYear: schoolYearLabel(),
      level,
      rows: overview.rows,
      distribution: overview.distribution,
      withoutNotes: overview.withoutNotes,
    });
    if (!okPrint) alert('Votre navigateur a bloqué l’ouverture de la fenêtre d’impression.');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg">Orientation scolaire</h1>
            <p className="text-emerald-100 text-sm">Parcours futurs selon les performances de l’élève · {LEVEL_LABELS[level]}</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-6xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-900 mb-3">Choisir une classe et un élève</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full p-3 border rounded-lg">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.school}</option>)}
            </select>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un élève..." className="w-full pl-10 pr-4 py-3 border rounded-lg" />
            </div>
          </div>
          {view === 'eleve' && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filteredStudents.map(s => (
                <button key={s.id} onClick={() => setStudentId(s.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${studentId === s.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {s.nom.toUpperCase()} {s.prenoms}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setView('eleve')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm ${view === 'eleve' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <UserRound className="w-4 h-4" /> Analyse élève
            </button>
            <button onClick={() => setView('classe')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm ${view === 'classe' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <Users className="w-4 h-4" /> Synthèse classe
            </button>
          </div>
        </section>

        {view === 'classe' ? (
          <ClassOverview
            overview={overview}
            schoolYear={schoolYearLabel()}
            onPrint={printClassReport}
          />
        ) : !student || !analysis ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <UserRound className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Sélectionnez un élève ayant des notes.</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl shadow p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                {student.photoUrl ? <img src={student.photoUrl} className="w-14 h-14 rounded-full object-cover border" /> : <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">{student.nom[0]}{student.prenoms?.[0] || ''}</div>}
                <div>
                  <h2 className="font-black text-gray-900">{student.nom.toUpperCase()} {student.prenoms}</h2>
                  <p className="text-gray-500 text-sm">Analyse des forces disciplinaires et pistes d’orientation</p>
                </div>
              </div>
              {evalOptions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Évaluation analysée</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setEvalId('')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${evalId === '' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      Dernière évaluation disponible
                    </button>
                    {evalOptions.map(ev => (
                      <button key={ev} onClick={() => setEvalId(ev)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${evalId === ev ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {evaluationLabel(ev)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-800">
                ℹ️ Niveau : <strong>{LEVEL_LABELS[level]}</strong> — {levelHint}
                {evalId === '' && evalOptions.length > 0 ? ' Par défaut, l’analyse utilise la dernière évaluation sommative disponible.' : ''}
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.performances.map(p => ({ name: p.subjectName, score: Number(p.score.toFixed(2)) }))} margin={{ top: 10, right: 10, left: -16, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} fontSize={10} />
                    <YAxis domain={[0, 20]} />
                    <Tooltip formatter={(value) => [`${value}/20`, 'Score']} />
                    <Bar dataKey="score" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2 mt-3 md:grid-cols-2">
                <button onClick={copyReport} className="bg-emerald-600 text-white py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"><ClipboardCopy className="w-5 h-5" /> Copier le conseil</button>
                <button onClick={printReport} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"><Printer className="w-5 h-5" /> Imprimer le rapport</button>
              </div>
            </section>

            {noNotes && (
              <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4">
                <p className="font-bold text-amber-900">⚠️ Aucune note saisie pour cet élève</p>
                <p className="text-sm text-amber-800 mt-1">Les recommandations ci-dessous sont générales : saisissez des notes dans le module Notes pour obtenir une analyse fiable par domaine.</p>
              </section>
            )}

            {trends.length > 0 && (
              <section className="bg-white rounded-2xl shadow p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-gray-900">Évolution entre les évaluations sommatives</h2>
                </div>
                <p className="text-sm text-gray-500 mb-3">Progression du score par domaine de la sommative 1 à la sommative 3 (évaluations renseignées).</p>
                <div className="space-y-3">
                  {trends.map(t => (
                    <div key={t.domain} className="flex items-center gap-3">
                      <p className="w-28 text-sm font-semibold text-gray-700 shrink-0">{t.label}</p>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1">
                          {t.points.map(p => (
                            <span key={p.evaluation} className={`rounded px-2 py-1 text-xs font-semibold ${p.score !== null ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 text-gray-400'}`}>
                              {p.score !== null ? `${p.score.toFixed(1)}` : '—'}
                            </span>
                          ))}
                        </div>
                        <div className="h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={t.points.map(p => ({ name: p.label, score: p.score }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                              <XAxis dataKey="name" hide />
                              <YAxis hide domain={[0, 20]} />
                              <Tooltip formatter={(value) => [value === null ? '—' : `${value}/20`, 'Score']} />
                              <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <TrendBadge direction={t.direction} delta={t.delta} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {domainBars.length > 0 && (
              <section className="bg-white rounded-2xl shadow p-4 mb-4">
                <h2 className="font-bold text-gray-900 mb-3">Score par domaine d’orientation</h2>
                <div className="space-y-2">
                  {domainBars.map(([domain, score]) => (
                    <div key={domain} className="flex items-center gap-3">
                      <p className="w-28 text-sm font-semibold text-gray-700 shrink-0">{domain === 'general' ? 'Général' : domainLabels(domain)}</p>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, ((score ?? 0) / 20) * 100)}%` }} />
                      </div>
                      <p className="w-14 text-sm font-bold text-gray-800 text-right">{(score ?? 0).toFixed(1)}/20</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Conseil personnalisé</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{advice}</p>
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              {analysis.recommendations.map(rec => <RecommendationCard key={rec.title} rec={rec} />)}
            </section>

            {relatedExtras.length > 0 && (
              <section className="bg-white rounded-2xl shadow p-4 mt-4">
                <h2 className="font-bold text-gray-900 mb-3">Informations ajoutées par l’administration</h2>
                <div className="space-y-2">
                  {relatedExtras.map(extra => (
                    <div key={extra.id} className="border rounded-lg p-3">
                      <p className="font-bold text-gray-900">{extra.title}</p>
                      <p className="text-xs text-gray-500">Séries : {extra.series}</p>
                      <p className="text-sm text-gray-700 mt-1"><strong>Matières :</strong> {extra.subjects}</p>
                      <p className="text-sm text-gray-700"><strong>Études :</strong> {extra.studies}</p>
                      <p className="text-sm text-gray-700"><strong>Débouchés :</strong> {extra.careers}</p>
                      <p className="text-sm text-emerald-700 mt-1">{extra.advice}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function domainLabels(domain: string): string {
  const map: Record<string, string> = {
    litteraire: 'Littéraire',
    scientifique: 'Scientifique',
    economique: 'Économique',
    technique: 'Technique',
    social: 'Social',
    culturel: 'Culturel',
    general: 'Général',
  };
  return map[domain] || domain;
}

function TrendBadge({ direction, delta }: { direction: 'hausse' | 'baisse' | 'stable' | null; delta: number | null }) {
  if (!direction || delta === null) return null;
  if (direction === 'hausse') return <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-bold shrink-0"><ArrowUp className="w-3.5 h-3.5" /> +{delta.toFixed(1)}</span>;
  if (direction === 'baisse') return <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 text-red-700 px-2 py-1 text-xs font-bold shrink-0"><ArrowDown className="w-3.5 h-3.5" /> {delta.toFixed(1)}</span>;
  return <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 text-gray-600 px-2 py-1 text-xs font-bold shrink-0"><Minus className="w-3.5 h-3.5" /> stable</span>;
}

function ClassOverview({ overview, schoolYear, onPrint }: { overview: ReturnType<typeof buildClassOrientationOverview> | null; schoolYear: string; onPrint: () => void }) {
  if (!overview) {
    return <div className="bg-white rounded-xl shadow p-8 text-center"><Users className="w-14 h-14 text-gray-300 mx-auto mb-3" /><p className="font-semibold text-gray-700">Aucune classe sélectionnée.</p></div>;
  }
  const stageBadge: Record<string, string> = {
    forte: 'bg-emerald-100 text-emerald-700',
    moyenne: 'bg-amber-100 text-amber-700',
    exploratoire: 'bg-gray-100 text-gray-600',
    sans_note: 'bg-red-100 text-red-700',
  };
  return (
    <>
      <section className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-gray-900">Synthèse d’orientation de la classe</h2>
          <button onClick={onPrint} className="bg-emerald-600 text-white py-2 px-4 rounded-xl font-semibold inline-flex items-center gap-2 text-sm"><Printer className="w-4 h-4" /> Imprimer la synthèse</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-gray-900">{overview.rows.length}</p><p className="text-xs text-gray-500 font-semibold">Élèves</p></div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-emerald-700">{overview.withNotes}</p><p className="text-xs text-gray-500 font-semibold">Avec notes</p></div>
          <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-red-600">{overview.withoutNotes}</p><p className="text-xs text-gray-500 font-semibold">Sans notes</p></div>
          <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-blue-700">{overview.distribution.length}</p><p className="text-xs text-gray-500 font-semibold">Profils détectés</p></div>
        </div>
        {overview.distribution.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {overview.distribution.map(d => (
              <span key={d.domain} className="rounded-lg bg-emerald-100 text-emerald-800 px-3 py-1.5 text-sm font-semibold">
                {domainLabels(d.domain)} : {d.count}
              </span>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 border-b">
                <th className="py-2 pr-3">Élève</th>
                <th className="py-2 pr-3">Profil dominant</th>
                <th className="py-2 pr-3 text-right">Score</th>
                <th className="py-2 pr-3">Matière la plus forte</th>
                <th className="py-2">Stade</th>
              </tr>
            </thead>
            <tbody>
              {overview.rows.map(row => (
                <tr key={row.student.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-semibold text-gray-900">{row.student.nom.toUpperCase()} {row.student.prenoms}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.dominantDomain ? domainLabels(row.dominantDomain) : '—'}</td>
                  <td className="py-2 pr-3 text-right text-gray-700">{row.dominantScore !== null ? `${row.dominantScore.toFixed(1)}/20` : '—'}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.strongestSubject ? `${row.strongestSubject} (${row.strongestScore?.toFixed(2)}/20)` : '—'}</td>
                  <td className="py-2"><span className={`rounded px-2 py-1 text-xs font-bold ${stageBadge[row.stage]}`}>{STAGE_LABELS[row.stage] || row.stage}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">Année scolaire {schoolYear} — synthèse à discuter en conseil des professeurs.</p>
      </section>
    </>
  );
}

function RecommendationCard({ rec }: { rec: OrientationRecommendation }) {
  const badge = rec.priority === 'forte'
    ? 'bg-emerald-100 text-emerald-700'
    : rec.priority === 'moyenne'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-700';
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-black text-gray-900">{rec.title}</h2>
        <span className={`rounded px-2 py-1 text-xs font-bold ${badge}`}>{rec.priority}</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
      <InfoLine icon={GraduationCap} label="Séries / filières" value={rec.series} />
      <InfoLine icon={BookOpenIcon} label="Études" value={rec.studies.join(', ')} />
      <InfoLine icon={Target} label="Matières à renforcer" value={rec.subjectsToStrengthen.join(', ')} />
      <InfoLine icon={Briefcase} label="Débouchés" value={rec.careers.join(', ')} />
    </div>
  );
}

function BookOpenIcon(props: any) {
  return <GraduationCap {...props} />;
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="mb-2 flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
      <p><strong className="text-gray-800">{label} :</strong> <span className="text-gray-600">{value}</span></p>
    </div>
  );
}
