import { ClassData, Student, findBestNote } from './database';

export interface RemediationSuggestion {
  subjectId: string;
  subjectName: string;
  score: number;
  level: 'urgent' | 'renforcement' | 'consolidation';
  diagnosis: string;
  exercises: string[];
  method: string;
}

function subjectAdvice(subjectName: string): string[] {
  const n = subjectName.toLowerCase();
  if (n.includes('math')) {
    return [
      '5 opérations courtes avec correction immédiate.',
      '2 problèmes de la vie courante à résoudre étape par étape.',
      'Un exercice de calcul mental chronométré de 5 minutes.',
    ];
  }
  if (n.includes('lecture') || n.includes('compréhension') || n.includes('français')) {
    return [
      'Lecture expressive d’un court texte puis reformulation orale.',
      'Questions de repérage : personnages, lieu, action, idée principale.',
      'Exercice de vocabulaire : expliquer 5 mots difficiles du texte.',
    ];
  }
  if (n.includes('dict') || n.includes('communication') || n.includes('expression')) {
    return [
      'Dictée flash de 5 phrases ciblant les erreurs observées.',
      'Réécriture de phrases avec correction des accords.',
      'Production de 5 lignes avec grille de relecture simple.',
    ];
  }
  if (n.includes('svt') || n.includes('pct') || n.includes('est') || n.includes('science')) {
    return [
      'Compléter un schéma simple avec les mots clés de la leçon.',
      'Relier notions et définitions dans un tableau à deux colonnes.',
      'Expliquer oralement une expérience ou une situation-problème.',
    ];
  }
  if (n.includes('anglais') || n.includes('allemand') || n.includes('espagnol') || n.includes('lv')) {
    return [
      'Associer 10 mots de vocabulaire à leurs images ou traductions.',
      'Répéter puis écrire 5 phrases modèles.',
      'Mini-dialogue guidé avec un camarade.',
    ];
  }
  if (n.includes('histoire') || n.includes('géographie') || n.includes('geographie')) {
    return [
      'Construire une frise ou une carte simple avec 5 repères.',
      'Répondre à 5 questions courtes de compréhension.',
      'Faire un résumé oral en trois phrases.',
    ];
  }
  return [
    'Reprendre les notions clés de la leçon avec exemples simples.',
    'Faire 3 exercices d’application guidée puis 2 exercices autonomes.',
    'Terminer par une courte auto-évaluation corrigée.',
  ];
}

export function buildRemediationSuggestions(
  classData: ClassData,
  student: Student | undefined
): RemediationSuggestion[] {
  if (!student) return [];
  return classData.subjects
    .map(subject => {
      const note = findBestNote(classData.notes, student.id, subject.id);
      if (!note || note.absent || note.noteObtenue === null) return null;
      const max = subject.noteObtenueMax + subject.notePerfectionnementMax || 20;
      const raw = (note.noteObtenue ?? 0) + (note.notePerfectionnement ?? 0);
      const score = max === 20 ? raw : (raw / max) * 20;
      if (score >= 12) return null;
      const level: RemediationSuggestion['level'] = score < 8 ? 'urgent' : score < 10 ? 'renforcement' : 'consolidation';
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        score,
        level,
        diagnosis: score < 8
          ? 'Difficultés importantes : reprendre les prérequis avant de refaire les exercices.'
          : score < 10
            ? 'Notions partiellement acquises : renforcer par des exercices guidés.'
            : 'Acquis fragile : consolider avec des exercices d’application autonome.',
        exercises: subjectAdvice(subject.name),
        method: 'Séance courte de 20 à 30 min : rappel de la règle, exemple guidé, exercices progressifs, correction immédiate.',
      };
    })
    .filter(Boolean) as RemediationSuggestion[];
}

export function buildAISupportPrompt(
  student: Student,
  suggestions: RemediationSuggestion[]
): string {
  return `Tu es un spécialiste du soutien pédagogique et de la remédiation APC.

Élève : ${student.nom.toUpperCase()} ${student.prenoms}

À partir des difficultés suivantes, conçois un plan de remédiation individualisé avec exercices corrigés, durée, matériel, méthode et critères de réussite :

${suggestions.map(s => `- ${s.subjectName} : ${s.score.toFixed(2)}/20 (${s.level}) — ${s.diagnosis}\nExercices proposés : ${s.exercises.join('; ')}`).join('\n\n')}

Retourne un plan clair directement exploitable par l’enseignant.`;
}
