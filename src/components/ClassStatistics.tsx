import { useEffect, useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, ChevronLeft, PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';
import { ClassData, getAllClasses, findBestNote } from '../utils/database';
import { computeBulletins, computeClassStats } from '../utils/bulletin';

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : value.toFixed(2);
}

function distributionForClass(classData: ClassData) {
  const bulletins = computeBulletins(classData);
  const isSecondary = classData.educationType === 'secondaire';

  if (isSecondary) {
    return [
      { name: '0-7', label: 'Très insuffisant', value: bulletins.filter(b => (b.moyenne ?? -1) >= 0 && (b.moyenne ?? 0) <= 7).length },
      { name: '8-9', label: 'Insuffisant', value: bulletins.filter(b => (b.moyenne ?? -1) >= 8 && (b.moyenne ?? 0) <= 9).length },
      { name: '10-11', label: 'Passable', value: bulletins.filter(b => (b.moyenne ?? -1) >= 10 && (b.moyenne ?? 0) <= 11).length },
      { name: '12-13', label: 'Assez bien', value: bulletins.filter(b => (b.moyenne ?? -1) >= 12 && (b.moyenne ?? 0) <= 13).length },
      { name: '14-15', label: 'Bien', value: bulletins.filter(b => (b.moyenne ?? -1) >= 14 && (b.moyenne ?? 0) <= 15).length },
      { name: '16-20', label: 'Très bien', value: bulletins.filter(b => (b.moyenne ?? -1) >= 16).length },
    ];
  }

  const validatedCount = (studentId: string) => classData.subjects.filter(subject => {
    const note = findBestNote(classData.notes, studentId, subject.id);
    if (!note || note.absent) return false;
    return (note.noteObtenue ?? 0) + (note.notePerfectionnement ?? 0) >= 10;
  }).length;

  return [
    { name: '0-3', label: 'Très insuffisant', value: classData.students.filter(s => validatedCount(s.id) <= 3).length },
    { name: '4-5', label: 'Insuffisant', value: classData.students.filter(s => validatedCount(s.id) >= 4 && validatedCount(s.id) <= 5).length },
    { name: '6-7', label: 'Satisfaisant', value: classData.students.filter(s => validatedCount(s.id) >= 6 && validatedCount(s.id) <= 7).length },
    { name: '8+', label: 'Très satisfaisant', value: classData.students.filter(s => validatedCount(s.id) >= 8).length },
  ];
}

export default function ClassStatistics() {
  const goBack = useSmartBack();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    getAllClasses().then(data => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setClasses(sorted);
      if (sorted[0]) setSelectedClassId(sorted[0].id);
    });
  }, []);

  const classChartData = useMemo(() => classes.map(classData => {
    const bulletins = computeBulletins(classData);
    const stats = computeClassStats(bulletins);
    return {
      id: classData.id,
      classe: classData.name,
      effectif: classData.students.length,
      moyenne: Number((stats.moyenneClasse ?? 0).toFixed(2)),
      taux: Math.round(stats.tauxReussite),
      admis: stats.admis,
      notes: stats.count,
    };
  }), [classes]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const selectedStats = selectedClass ? computeClassStats(computeBulletins(selectedClass)) : null;
  const distribution = selectedClass ? distributionForClass(selectedClass) : [];
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">ClassStatistics</h1>
            <p className="text-emerald-100 text-sm">Répartition des moyennes et réussite par classe</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <Users className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Aucune classe créée</p>
            <p className="text-gray-500 text-sm">Créez une classe et saisissez les notes pour voir les statistiques.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{classes.length}</p>
                <p className="text-xs text-gray-500">Classes</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{fmt(selectedStats?.moyenneClasse)}</p>
                <p className="text-xs text-gray-500">Moy. sélection</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <BarChart3 className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{Math.round(selectedStats?.tauxReussite ?? 0)}%</p>
                <p className="text-xs text-gray-500">Réussite</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Classe à analyser</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                {classes.map(classData => (
                  <option key={classData.id} value={classData.id}>{classData.name} - {classData.school}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Taux de réussite par classe
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -16, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="classe" angle={-25} textAnchor="end" interval={0} fontSize={10} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <Tooltip formatter={(value, name) => [`${value}${name === 'taux' ? '%' : ''}`, name === 'taux' ? 'Taux de réussite' : 'Valeur']} />
                    <Bar
                      dataKey="taux"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                      name="taux"
                      isAnimationActive
                      animationBegin={150}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Courbes moyenne et réussite
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={classChartData} margin={{ top: 10, right: 12, left: -16, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="classe" angle={-25} textAnchor="end" interval={0} fontSize={10} />
                    <YAxis yAxisId="left" domain={[0, 20]} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={11} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'Réussite' ? `${value}%` : `${value}/20`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="moyenne"
                      name="Moyenne"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      isAnimationActive
                      animationBegin={250}
                      animationDuration={1300}
                      animationEasing="ease-out"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="taux"
                      name="Réussite"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      isAnimationActive
                      animationBegin={450}
                      animationDuration={1400}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-blue-600" />
                Répartition des moyennes - {selectedClass?.name}
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution.filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                      isAnimationActive
                      animationBegin={250}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    >
                      {distribution.map((_, index) => (
                        <Cell key={index} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {distribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                    <span>{item.label}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-800 mb-3">Résumé par classe</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="text-left p-2">Classe</th>
                      <th className="text-center p-2">Moy.</th>
                      <th className="text-center p-2">Réussite</th>
                      <th className="text-center p-2">Admis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classChartData.map(row => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2 font-medium text-gray-800">{row.classe}</td>
                        <td className="p-2 text-center">{row.moyenne}/20</td>
                        <td className="p-2 text-center font-semibold text-emerald-700">{row.taux}%</td>
                        <td className="p-2 text-center">{row.admis}/{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}