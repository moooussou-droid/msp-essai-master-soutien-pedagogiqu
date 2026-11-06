import { ClassData, Student, EvaluationId, EVALUATIONS, evaluationLabel, findBestNote, findNoteInEvaluation } from './database';

export type OrientationDomain = 'litteraire' | 'scientifique' | 'economique' | 'technique' | 'social' | 'culturel' | 'general';
export type SchoolLevel = 'prescolaire' | 'primaire' | 'secondaire';

export const DOMAIN_LABELS: Record<string, string> = {
  litteraire: 'Littéraire',
  scientifique: 'Scientifique',
  economique: 'Économique',
  technique: 'Technique',
  social: 'Social',
  culturel: 'Culturel',
  general: 'Général',
};

export const LEVEL_LABELS: Record<SchoolLevel, string> = {
  prescolaire: 'Préscolaire',
  primaire: 'Primaire',
  secondaire: 'Secondaire',
};

export interface OrientationExtraInfo {
  id: string;
  title: string;
  series: string;
  domains: OrientationDomain[];
  subjects: string;
  studies: string;
  careers: string;
  advice: string;
  createdAt: number;
}

export interface SubjectPerformance {
  subjectName: string;
  score: number;
  domain: OrientationDomain;
}

export interface OrientationRecommendation {
  domain: OrientationDomain;
  title: string;
  series: string;
  studies: string[];
  careers: string[];
  subjectsToStrengthen: string[];
  reason: string;
  priority: 'forte' | 'moyenne' | 'exploratoire';
}

export interface EvaluationScorePoint {
  evaluation: EvaluationId;
  label: string;
  score: number | null;
}

export interface DomainTrend {
  domain: OrientationDomain;
  label: string;
  points: EvaluationScorePoint[];
  delta: number | null;
  direction: 'hausse' | 'baisse' | 'stable' | null;
}

export interface ClassOrientationRow {
  student: Student;
  dominantDomain: OrientationDomain | null;
  dominantScore: number | null;
  strongestSubject: string | null;
  strongestScore: number | null;
  noteCount: number;
  stage: 'forte' | 'moyenne' | 'exploratoire' | 'sans_note';
}

export interface ClassOrientationOverview {
  level: SchoolLevel;
  rows: ClassOrientationRow[];
  distribution: { domain: OrientationDomain; count: number }[];
  withoutNotes: number;
  withNotes: number;
}

export const ORIENTATION_EXTRA_KEY = 'msp_orientation_extra_info';

export function loadOrientationExtras(): OrientationExtraInfo[] {
  try {
    const raw = localStorage.getItem(ORIENTATION_EXTRA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore invalid local data
  }
  return [];
}

export function saveOrientationExtras(items: OrientationExtraInfo[]) {
  localStorage.setItem(ORIENTATION_EXTRA_KEY, JSON.stringify(items));
}

/** Niveau scolaire effectif d'une classe (repli « primaire » pour les anciennes classes). */
export function classSchoolLevel(classData: ClassData): SchoolLevel {
  return (classData.educationType ?? 'primaire') as SchoolLevel;
}

export function subjectDomain(subjectName: string): OrientationDomain {
  const s = subjectName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('math')) return 'scientifique';
  if (s.includes('pct') || s.includes('phys') || s.includes('chim') || s.includes('svt') || s.includes('science') || s.includes('est')) return 'scientifique';
  if (s.includes('franc') || s.includes('lecture') || s.includes('dictee') || s.includes('expression') || s.includes('communication') || s.includes('lang') || s.includes('anglais') || s.includes('allemand') || s.includes('espagnol') || s.includes('lv')) return 'litteraire';
  if (s.includes('histoire') || s.includes('geo') || s.includes('philo') || s.includes('socio') || s.includes('conduite')) return 'social';
  if (s.includes('economie') || s.includes('gestion') || s.includes('commerce')) return 'economique';
  if (s.includes('techno') || s.includes('informatique') || s.includes('mecanique') || s.includes('electric')) return 'technique';
  if (s.includes('art') || s.includes('dessin') || s.includes('musique') || s.includes('culture')) return 'culturel';
  return 'general';
}

/**
 * Performances d'un élève, éventuellement pour une évaluation précise
 * (règle de compatibilité : notes historiques → sommative 1). Sans
 * évaluation, la note « de référence » (dernière sommative disponible)
 * est utilisée, comme pour les bulletins.
 */
export function getStudentPerformances(classData: ClassData, student: Student, evaluation?: EvaluationId): SubjectPerformance[] {
  return classData.subjects
    .map(subject => {
      const note = evaluation
        ? findNoteInEvaluation(classData.notes, student.id, subject.id, evaluation)
        : findBestNote(classData.notes, student.id, subject.id);
      if (!note || note.absent || note.noteObtenue === null) return null;
      const max = subject.noteObtenueMax + subject.notePerfectionnementMax || 20;
      const raw = (note.noteObtenue ?? 0) + (note.notePerfectionnement ?? 0);
      const score = max === 20 ? raw : (raw / max) * 20;
      return { subjectName: subject.name, score, domain: subjectDomain(subject.name) };
    })
    .filter(Boolean) as SubjectPerformance[];
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Libellé d'année scolaire à partir d'une date (septembre → nouvelle année). */
export function schoolYearLabelFrom(date: Date): string {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function schoolYearLabel(): string {
  return schoolYearLabelFrom(new Date());
}

/**
 * Évaluations réellement renseignées pour un élève (pour le sélecteur
 * d'évaluation de l'écran d'orientation). Les notes historiques sans
 * évaluation sont rattachées à la sommative 1 (compatibilité).
 */
export function studentEvaluationsWithNotes(classData: ClassData, student: Student): EvaluationId[] {
  const present = new Set<string>();
  for (const n of classData.notes) {
    if (n.studentId === student.id && n.evaluation) present.add(n.evaluation);
  }
  if (classData.notes.some(n => n.studentId === student.id && n.evaluation === undefined)) present.add('sommative1');
  return EVALUATIONS.filter(e => present.has(e.id)).map(e => e.id);
}

/**
 * Évolution du score d'un domaine entre les évaluations sommatives
 * (1 → 2 → 3), calculée sur les seules évaluations renseignées.
 */
export function getDomainTrends(classData: ClassData, student: Student): DomainTrend[] {
  const order: EvaluationId[] = ['sommative1', 'sommative2', 'sommative3'];
  const domains: OrientationDomain[] = ['scientifique', 'litteraire', 'economique', 'technique', 'social', 'culturel'];
  return domains.map(domain => {
    const points: EvaluationScorePoint[] = order.map(ev => {
      const perfs = getStudentPerformances(classData, student, ev);
      const scores = perfs.filter(p => p.domain === domain).map(p => p.score);
      return { evaluation: ev, label: evaluationLabel(ev), score: scores.length ? average(scores) : null };
    });
    const values = points.filter(p => p.score !== null).map(p => p.score as number);
    let delta: number | null = null;
    let direction: DomainTrend['direction'] = null;
    if (values.length >= 2) {
      delta = Number((values[values.length - 1] - values[0]).toFixed(2));
      direction = delta > 0.5 ? 'hausse' : delta < -0.5 ? 'baisse' : 'stable';
    }
    return { domain, label: DOMAIN_LABELS[domain] ?? domain, points, delta, direction };
  }).filter(t => t.points.some(p => p.score !== null));
}

/**
 * Conseil personnalisé rédigé pour l'élève : points forts, dominante,
 * matières à consolider. Déterministe et testable.
 */
export function buildStudentAdvice(
  performances: SubjectPerformance[],
  recommendations: OrientationRecommendation[],
  domainScores: Record<string, number>
): string {
  if (performances.length === 0) {
    return 'Aucune note n’est encore saisie : l’orientation ne peut pas être fiable. Renseignez au moins les matières principales, puis relancez l’analyse.';
  }
  const sorted = [...performances].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const top = recommendations.find(r => r.priority === 'forte') || recommendations[0];
  const domains = Object.entries(domainScores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const topDomain = domains[0];
  const lit = (Object.values(domainScores).filter(v => (v ?? 0) >= 10).length);

  let text = `${strongest.subjectName} (${strongest.score.toFixed(2)}/20) est actuellement sa matière la plus solide.`;
  if (weakest.subjectName !== strongest.subjectName) {
    text += ` En revanche, ${weakest.subjectName} (${weakest.score.toFixed(2)}/20) mérite un renforcement.`;
  }
  if (topDomain) {
    text += ` Le profil penche vers le domaine ${topDomain[0]} (${(topDomain[1] ?? 0).toFixed(1)}/20).`;
  }
  if (lit >= 2) text += ' Plusieurs domaines sont au-dessus de 10/20 : les choix restent ouverts, ce qui est une bonne nouvelle.';
  if (top) {
    text += ` La piste prioritaire : ${top.title}.`;
    if (top.subjectsToStrengthen.length) text += ` Travaillez en priorité ${top.subjectsToStrengthen.slice(0, 3).join(', ')}.`;
  }
  return text;
}

export function buildOrientationRecommendations(
  classData: ClassData,
  student: Student,
  evaluation?: EvaluationId
): { performances: SubjectPerformance[]; recommendations: OrientationRecommendation[]; domainScores: Record<string, number> } {
  const level = classSchoolLevel(classData);
  const performances = getStudentPerformances(classData, student, evaluation);
  const domainScores: Record<string, number> = {};
  const domains: OrientationDomain[] = ['litteraire', 'scientifique', 'economique', 'technique', 'social', 'culturel', 'general'];
  for (const domain of domains) {
    domainScores[domain] = average(performances.filter(p => p.domain === domain).map(p => p.score));
  }

  const recs: OrientationRecommendation[] = [];
  const push = (rec: Omit<OrientationRecommendation, 'priority'>, score: number) => {
    recs.push({
      ...rec,
      priority: score >= 14 ? 'forte' : score >= 10 ? 'moyenne' : 'exploratoire',
    });
  };

  // --- Préscolaire : l'orientation formelle commence au primaire ---
  if (level === 'prescolaire') {
    return {
      performances,
      domainScores,
      recommendations: [{
        domain: 'general',
        title: 'Éveil et consolidation des fondamentaux',
        series: 'Observation pédagogique — préparation à l’entrée au primaire',
        studies: [
          'Première année du primaire (CI/CP)',
          'Acquisitions de base : langage, motricité, autonomie',
          'Socialisation et vie de classe',
          'Découverte du monde et culture',
        ],
        careers: ['À confirmer au primaire, quand les apprentissages se précisent'],
        subjectsToStrengthen: ['Langage et expression orale', 'Motricité fine et globale', 'Autonomie', 'Socialisation', 'Découverte du monde'],
        reason: 'Aux niveaux préscolaires, on n’oriente pas encore : on observe l’éveil, les habiletés et le comportement de l’enfant pour préparer son entrée au primaire.',
        priority: 'exploratoire',
      }],
    };
  }

  const secondaire = level === 'secondaire';
  const sci = Math.max(domainScores.scientifique || 0, average(performances.filter(p => ['Mathématiques', 'Math', 'PCT', 'SVT'].some(k => p.subjectName.includes(k))).map(p => p.score)));
  if (sci >= 10) push({
    domain: 'scientifique',
    title: secondaire ? 'Parcours scientifiques, santé, ingénierie et informatique' : 'Poursuite au collège général — profil scientifique',
    series: secondaire ? 'BAC C, D, E ou filières scientifiques/techniques' : '6ème → collège général, options scientifiques (à confirmer au collège)',
    studies: secondaire
      ? ['Médecine', 'Pharmacie', 'Génie civil', 'Génie informatique', 'Intelligence artificielle', 'Agronomie', 'Environnement', 'Statistique']
      : ['Collège général (6ème → 3ème)', 'Lycée (séries C/D)', 'Formations scientifiques : santé, génie, informatique', 'Études supérieures scientifiques'],
    careers: secondaire
      ? ['Médecin', 'Ingénieur', 'Développeur', 'Data analyst', 'Agronome', 'Technicien supérieur', 'Chercheur']
      : ['Médecin', 'Infirmier', 'Ingénieur', 'Développeur', 'Agronome', 'Technicien de laboratoire'],
    subjectsToStrengthen: ['Mathématiques', 'PCT/SPCT', 'SVT', 'Français', 'Anglais'],
    reason: 'L’élève montre un potentiel dans les matières scientifiques ou logico-mathématiques : le collège général avec dominante scientifique est à privilégier.',
  }, sci);

  const lit = Math.max(domainScores.litteraire || 0, domainScores.social || 0);
  if (lit >= 10) push({
    domain: 'litteraire',
    title: secondaire ? 'Parcours lettres, langues, droit, communication et sciences humaines' : 'Poursuite au collège général — profil lettres et langues',
    series: secondaire ? 'BAC A1/A2 ou filières littéraires et sociales' : '6ème → collège général, dominante français et langues',
    studies: secondaire
      ? ['Lettres modernes', 'Langues', 'Droit', 'Communication', 'Journalisme', 'Sciences de l’éducation', 'Sociologie', 'Psychologie', 'Administration']
      : ['Collège général (6ème → 3ème)', 'Lycée (séries A/B)', 'Études : lettres, langues, droit, communication', 'Formations : éducation, journalisme'],
    careers: secondaire
      ? ['Enseignant', 'Juriste', 'Journaliste', 'Traducteur', 'Chargé de communication', 'Administrateur', 'Agent social']
      : ['Enseignant', 'Juriste', 'Journaliste', 'Traducteur', 'Administrateur', 'Agent social'],
    subjectsToStrengthen: ['Français', 'Philosophie', 'Histoire-Géographie', 'Langues', 'Culture générale'],
    reason: 'Les résultats en langues, lecture, français ou sciences humaines indiquent des aptitudes littéraires/sociales.',
  }, lit);

  const eco = domainScores.economique || 0;
  if (eco >= 8 || performances.some(p => p.subjectName.toLowerCase().includes('economie'))) push({
    domain: 'economique',
    title: secondaire ? 'Parcours économie, gestion, finance et commerce' : 'Poursuite au collège — profil logique, gestion et commerce',
    series: secondaire ? 'BAC B, G2, G3 ou filières gestion/commerce' : '6ème → collège, dominante calcul et gestion',
    studies: secondaire
      ? ['Économie', 'Finance-Comptabilité', 'Banque', 'Assurance', 'Marketing', 'Management', 'Ressources humaines', 'Commerce international']
      : ['Collège général (6ème → 3ème)', 'Lycée (séries B/G)', 'Formations : comptabilité-gestion', 'Commerce et management'],
    careers: secondaire
      ? ['Comptable', 'Auditeur', 'Banquier', 'Commercial', 'Responsable marketing', 'Gestionnaire RH', 'Entrepreneur']
      : ['Comptable', 'Commercial', 'Gestionnaire', 'Entrepreneur', 'Banquier'],
    subjectsToStrengthen: ['Économie', 'Mathématiques', 'Étude de cas', 'Français', 'Anglais'],
    reason: 'Le profil peut être orienté vers la gestion et les métiers économiques si les bases sont consolidées.',
  }, Math.max(eco, 10));

  const tech = domainScores.technique || 0;
  if (tech >= 8) push({
    domain: 'technique',
    title: secondaire ? 'Parcours techniques, industriels et professionnels' : 'Collège d’enseignement technique (CET) ou filière professionnelle',
    series: secondaire ? 'BAC E, F, DT ou filières techniques' : 'CET / formation professionnelle après le CM2 (ou au collège)',
    studies: secondaire
      ? ['Maintenance', 'Électricité', 'Mécanique', 'BTP', 'Informatique', 'Télécommunications', 'Génie industriel']
      : ['Collège d’enseignement technique', 'Apprentissage : bâtiment, mécanique, électrotechnique', 'Formation professionnelle qualifiante', 'Informatique appliquée'],
    careers: secondaire
      ? ['Technicien', 'Assistant ingénieur', 'Conducteur de travaux', 'Technicien maintenance', 'Développeur web', 'Technicien réseaux']
      : ['Technicien', 'Électricien', 'Mécanicien', 'Maçon', 'Couturier', 'Développeur web'],
    subjectsToStrengthen: ['Mathématiques appliquées', 'Technologie', 'PCT', 'Français', 'Anglais'],
    reason: 'Les aptitudes pratiques et techniques peuvent être valorisées dans un parcours professionnel ou technologique.',
  }, Math.max(tech, 10));

  const social = domainScores.social || 0;
  if (social >= 10) push({
    domain: 'social',
    title: secondaire ? 'Parcours sciences humaines, droit, éducation et social' : 'Poursuite au collège — profil sciences humaines et sociales',
    series: secondaire ? 'BAC A2/B ou filières sociales' : '6ème → collège, dominante sciences humaines',
    studies: secondaire
      ? ['Droit', 'Sociologie', 'Psychologie', 'Sciences de l’éducation', 'Journalisme', 'Travail social']
      : ['Collège général (6ème → 3ème)', 'Lycée (séries A/B)', 'Études : droit, sociologie, psychologie', 'Formations : éducation, action sociale'],
    careers: secondaire
      ? ['Enseignant', 'Juriste', 'Psychologue', 'Journaliste', 'Assistant social', 'Administrateur']
      : ['Enseignant', 'Assistant social', 'Animateur', 'Administrateur', 'Juriste'],
    subjectsToStrengthen: ['Français', 'Histoire-Géographie', 'Philosophie', 'Expression orale', 'Langues'],
    reason: 'Les résultats en histoire-géographie, philosophie, conduite citoyenne ou sciences humaines suggèrent un profil social.',
  }, social);

  const cult = domainScores.culturel || 0;
  if (cult >= 8) push({
    domain: 'culturel',
    title: secondaire ? 'Parcours artistiques, culturels et médias' : 'Poursuite au collège — profil artistique et créatif',
    series: secondaire ? 'BAC A1/A2, options arts ou filières culturelles' : '6ème → collège, activités artistiques et culturelles',
    studies: secondaire
      ? ['Arts plastiques', 'Musique', 'Théâtre', 'Communication', 'Médias', 'Design']
      : ['Collège général (6ème → 3ème)', 'Options artistiques : musique, arts plastiques', 'Écoles d’art et métiers créatifs', 'Métiers des médias et de la culture'],
    careers: secondaire
      ? ['Artiste', 'Musicien', 'Designer', 'Journaliste culturel', 'Animateur', 'Webdesigner']
      : ['Artiste', 'Musicien', 'Designer', 'Animateur culturel', 'Métier des médias'],
    subjectsToStrengthen: ['Français', 'Expression artistique', 'Culture générale', 'Anglais', 'Histoire des arts'],
    reason: 'Les résultats dans les activités artistiques, le dessin ou les matières culturelles révèlent une fibre créative.',
  }, cult);

  if (recs.length === 0) {
    recs.push({
      domain: 'general',
      title: secondaire ? 'Orientation à consolider' : 'Orientation à consolider — renforcer les bases',
      series: secondaire ? 'À déterminer après renforcement des bases' : 'À préciser après renforcement des acquis',
      studies: secondaire
        ? ['Parcours général à préciser', 'Formation professionnelle', 'Soutien/remédiation avant choix définitif']
        : ['Poursuite normale au collège général', 'Soutien/remédiation ciblée', 'Choix de filière à confirmer au collège'],
      careers: ['À explorer avec l’élève et les parents'],
      subjectsToStrengthen: ['Français', 'Mathématiques', 'Méthodologie', 'Assiduité', 'Lecture'],
      reason: 'Les résultats actuels ne permettent pas encore de dégager une dominante fiable.',
      priority: 'exploratoire',
    });
  }

  const priorityWeight = { forte: 0, moyenne: 1, exploratoire: 2 } as const;
  return { performances, recommendations: recs.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]), domainScores };
}

/**
 * Synthèse d'orientation de toute la classe : profil dominant de chaque
 * élève, répartition par domaine, élèves sans notes. Utile pour le conseil
 * des professeurs et l'entretien avec les parents.
 */
export function buildClassOrientationOverview(classData: ClassData): ClassOrientationOverview {
  const domains: OrientationDomain[] = ['litteraire', 'scientifique', 'economique', 'technique', 'social', 'culturel'];
  let withNotes = 0;
  const rows: ClassOrientationRow[] = classData.students.map(student => {
    const { performances, domainScores } = buildOrientationRecommendations(classData, student);
    if (performances.length > 0) withNotes++;
    const ranked = domains
      .map(d => [d, domainScores[d] as number] as const)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    const strongest = [...performances].sort((a, b) => b.score - a.score)[0] ?? null;
    const stage: ClassOrientationRow['stage'] = !top && performances.length === 0
      ? 'sans_note'
      : (top?.[1] ?? 0) >= 14 ? 'forte' : (top?.[1] ?? 0) >= 10 ? 'moyenne' : 'exploratoire';
    return {
      student,
      dominantDomain: top ? top[0] : null,
      dominantScore: top ? top[1] : null,
      strongestSubject: strongest?.subjectName ?? null,
      strongestScore: strongest ? strongest.score : null,
      noteCount: performances.length,
      stage,
    };
  });

  const distribution = domains
    .map(d => ({ domain: d, count: rows.filter(r => r.dominantDomain === d).length }))
    .filter(x => x.count > 0);

  return {
    level: classSchoolLevel(classData),
    rows,
    distribution,
    withoutNotes: rows.length - withNotes,
    withNotes,
  };
}
