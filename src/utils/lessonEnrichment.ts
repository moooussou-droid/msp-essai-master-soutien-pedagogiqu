/**
 * Enrichissement de la fiche produite par le moteur local, à partir des
 * réponses données pendant l'entretien (v37).
 *
 * C'est cette couche qui fait la différence de qualité : la fiche ne se
 * contente plus du thème et de la matière, elle intègre le contexte réel
 * de la classe (effectif, matériel, obstacle, ancrage local, inclusion).
 */

import type { GeneratedLessonPlan } from './aiLessonGenerator';
import type { InterviewAnswers } from './aiInterview';
import { isEarlyLevel } from './aiInterview';

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Situation de départ ancrée dans la réalité choisie par l'enseignant. */
export function buildSituation(answers: InterviewAnswers): string {
  const theme = answers.theme || 'la notion du jour';
  const c = norm(answers.contexte || '');
  if (c.includes('marche')) return `Au marché du quartier, une vendeuse et un élève n’arrivent pas à se mettre d’accord. Pour trancher, il faut mobiliser « ${theme} ».`;
  if (c.includes('champ') || c.includes('recolte')) return `Après la récolte, la famille doit organiser le travail et compter ce qui a été ramassé. La notion « ${theme} » est indispensable pour y parvenir.`;
  if (c.includes('recreation') || c.includes('cour')) return `Pendant la récréation, un désaccord éclate entre deux groupes d’élèves. Pour le résoudre, la classe doit utiliser « ${theme} ».`;
  if (c.includes('maison') || c.includes('famille')) return `À la maison, un enfant doit aider ses parents dans une tâche quotidienne. Il a besoin de « ${theme} » pour réussir.`;
  if (c.includes('circulation') || c.includes('route')) return `Sur la route de l’école, une situation dangereuse se présente. Comprendre « ${theme} » permet d’adopter le bon comportement.`;
  if (c.includes('sante') || c.includes('hygiene')) return `Un camarade tombe malade dans la classe. Pour comprendre et réagir correctement, il faut mobiliser « ${theme} ».`;
  return `Une situation de la vie quotidienne pose un problème que les apprenants ne peuvent résoudre sans maîtriser « ${theme} ».`;
}

/** Consignes d'organisation adaptées à l'effectif. */
export function buildOrganisation(answers: InterviewAnswers): string {
  const e = norm(answers.effectif || '');
  if (e.includes('plus de 70')) return 'Effectif très chargé : travail par groupes de 6 à 8, un rapporteur par groupe, correction collective à l’ardoise pour contrôler toute la classe en une fois. Circuler dans les rangées pendant la recherche.';
  if (e.includes('50')) return 'Effectif chargé : constituer des groupes de 5 à 6 apprenants, désigner un rapporteur, utiliser les ardoises pour vérifier la compréhension de tous simultanément.';
  if (e.includes('30')) return 'Effectif moyen : alterner travail individuel et binômes, passer voir chaque binôme pendant la phase de recherche.';
  if (e.includes('moins de 30')) return 'Effectif réduit : privilégier le suivi individuel, faire passer plusieurs apprenants au tableau, interroger nommément les plus discrets.';
  return 'Alterner travail individuel, binômes et mise en commun collective.';
}

/** Rappel des prérequis en début de séance. */
export function buildPrerequis(answers: InterviewAnswers): string {
  const p = norm(answers.prerequis || '');
  const theme = answers.theme || 'la notion';
  if (p.includes('decouvrent')) return `Les apprenants découvrent « ${theme} ». Prévoir une phase de mise en train plus longue, partir de leur vécu et accepter toutes les propositions avant de structurer.`;
  if (p.includes('an dernier')) return `Notion déjà rencontrée l’an dernier : commencer par un rappel actif (3 questions orales rapides) pour réactiver les acquis avant d’aborder « ${theme} ».`;
  if (p.includes('bases')) return `Les bases sont acquises : passer rapidement le rappel et consacrer l’essentiel du temps aux cas difficiles de « ${theme} ».`;
  return `Vérifier en début de séance, par deux ou trois questions orales, ce que les apprenants savent déjà de « ${theme} ».`;
}

/** Remédiation ciblée sur l'obstacle déclaré. */
export function buildRemediation(answers: InterviewAnswers): string {
  const o = norm(answers.obstacle || '');
  const theme = answers.theme || 'la notion';
  if (o.includes('confondent')) return `Obstacle ciblé — confusion entre notions proches.\nRemédiation : construire avec la classe un tableau à deux colonnes opposant les deux notions, puis faire trier une série d’exemples. Terminer par une phrase-repère à retenir.`;
  if (o.includes('sans comprendre')) return `Obstacle ciblé — application mécanique sans compréhension.\nRemédiation : faire verbaliser « pourquoi » à chaque étape, proposer un exemple volontairement faux à détecter et à corriger.`;
  if (o.includes('redig') || o.includes('demarche')) return `Obstacle ciblé — rédaction de la démarche.\nRemédiation : fournir une démarche à trous, puis faire rédiger la même démarche seul sur un exercice jumeau.`;
  if (o.includes('decouragent')) return `Obstacle ciblé — découragement.\nRemédiation : découper la tâche en trois étapes courtes validées une à une, valoriser chaque réussite intermédiaire.`;
  if (o.includes('consigne')) return `Obstacle ciblé — compréhension de la consigne.\nRemédiation : faire reformuler la consigne par un apprenant, souligner les mots-clés, montrer un exemple traité avant de lancer le travail.`;
  if (o.includes('vocabulaire')) return `Obstacle ciblé — vocabulaire pauvre.\nRemédiation : afficher au tableau une banque de 8 à 10 mots utiles à « ${theme} », les faire employer oralement avant l’écrit.`;
  if (o.includes('fautes')) return `Obstacle ciblé — fautes nombreuses.\nRemédiation : relecture guidée par critères (majuscules, accords, ponctuation), correction entre pairs puis réécriture d’une seule phrase améliorée.`;
  if (o.includes('oral')) return `Obstacle ciblé — participation orale faible.\nRemédiation : temps de réflexion silencieux avant de répondre, réponse d’abord dite au voisin, puis à la classe.`;
  return `Remédiation : reprendre en petit groupe les apprenants en difficulté avec un exemple guidé pas à pas, puis un exercice analogue simplifié sur « ${theme} ».`;
}

/** Adaptations inclusives. */
export function buildDifferenciation(answers: InterviewAnswers): string {
  const d = norm(answers.differenciation || '');
  const lines: string[] = [];
  if (d.includes('grande difficulte')) lines.push('• Soutien : consigne simplifiée, exercice réduit de moitié, tutorat par un camarade, passage prioritaire de l’enseignant.');
  if (d.includes('rapides')) lines.push('• Approfondissement : une tâche supplémentaire plus complexe est prévue pour les apprenants rapides (créer eux-mêmes un exercice pour leurs camarades).');
  if (d.includes('handicap')) lines.push('• Accessibilité : placement au premier rang, consignes données à l’oral ET à l’écrit, temps supplémentaire accordé, support agrandi si nécessaire.');
  if (lines.length === 0) lines.push('• Soutien : exercice simplifié et accompagnement rapproché.\n• Approfondissement : tâche supplémentaire plus exigeante pour les plus rapides.');
  return lines.join('\n');
}

/** Modalité d'évaluation demandée. */
export function buildEvaluationMode(answers: InterviewAnswers): string {
  const e = norm(answers.evaluation || '');
  if (e.includes('ardoise')) return 'Modalité retenue : évaluation formative rapide à l’ardoise — 5 questions courtes, réponse levée simultanément, repérage immédiat des apprenants à reprendre.';
  if (e.includes('sur 10')) return 'Modalité retenue : exercice écrit noté sur 10, corrigé en classe immédiatement après le ramassage.';
  if (e.includes('sur 20')) return 'Modalité retenue : devoir noté sur 20 avec barème détaillé communiqué aux apprenants avant de commencer.';
  if (e.includes('grille') || e.includes('observation')) return 'Modalité retenue : observation à l’aide d’une grille de critères (participe / applique la démarche / justifie / présente correctement).';
  if (e.includes('auto')) return 'Modalité retenue : auto-évaluation — chaque apprenant coche les critères qu’il estime avoir réussis, l’enseignant valide ensuite.';
  return 'Modalité retenue : évaluation formative en fin de séance.';
}

/**
 * Applique toutes les précisions de l'entretien à la fiche générée.
 * La structure d'origine est conservée, chaque rubrique est enrichie.
 */
export function enrichLesson(plan: GeneratedLessonPlan, answers: InterviewAnswers): GeneratedLessonPlan {
  const theme = answers.theme || plan.domaine;
  const early = isEarlyLevel(answers.niveau || plan.classe);

  const appuiEarly = (() => {
    const o = norm(answers.oral || '');
    if (!early) return '';
    if (o.includes('jeu')) return '\n\nAPPUI PRINCIPAL — Jeu et manipulation : la notion est abordée par un jeu collectif ; chaque apprenant manipule réellement le matériel avant toute trace écrite.';
    if (o.includes('chanson') || o.includes('comptine')) return '\n\nAPPUI PRINCIPAL — Chanson et comptine : la notion est mémorisée par une comptine reprise en chœur, avec gestes associés.';
    if (o.includes('image')) return '\n\nAPPUI PRINCIPAL — Observation d’images : les apprenants décrivent, comparent et classent les images avant de conclure.';
    if (o.includes('langage')) return '\n\nAPPUI PRINCIPAL — Langage oral guidé : l’enseignant questionne, reformule et enrichit systématiquement les phrases produites par les enfants.';
    return '\n\nAPPUI PRINCIPAL — Séance courte, concrète et ludique : pas plus de 3 consignes différentes, manipulation avant abstraction.';
  })();

  const manipulation = (() => {
    const e = norm(answers.experience || '');
    if (!e) return '';
    if (e.includes('materiel simple')) return '\n\nMANIPULATION : les apprenants réalisent eux-mêmes l’expérience par groupes, notent leurs observations puis confrontent les résultats.';
    if (e.includes('demonstration')) return '\n\nMANIPULATION : démonstration au bureau par l’enseignant ; les apprenants observent, décrivent et notent la conclusion.';
    if (e.includes('schema')) return '\n\nMANIPULATION : à défaut d’expérience, travail sur schéma légendé à compléter puis à expliquer oralement.';
    if (e.includes('calcul')) return '\n\nMANIPULATION : travail exclusivement calculatoire, avec vérification systématique du résultat par une seconde méthode.';
    return '';
  })();

  const support = (() => {
    const s = norm(answers.support_texte || '');
    if (!s) return '';
    if (s.includes('manuel')) return '\n\nSUPPORT DE LANGUE : texte du manuel, lu d’abord silencieusement puis à voix haute par plusieurs apprenants.';
    if (s.includes('redige')) return '\n\nSUPPORT DE LANGUE : texte rédigé par l’enseignant, calibré au niveau de la classe (phrases courtes, vocabulaire accessible).';
    if (s.includes('image') || s.includes('affiche')) return '\n\nSUPPORT DE LANGUE : image ou affiche décrite collectivement avant toute production écrite.';
    if (s.includes('conte') || s.includes('recit')) return '\n\nSUPPORT DE LANGUE : récit oral / conte raconté par l’enseignant, puis restitué par les apprenants.';
    return '';
  })();

  const diffusion = (() => {
    const d = norm(answers.support_numerique || '');
    if (!d) return '';
    if (d.includes('hors connexion')) return '\n\nDIFFUSION : contenu téléchargeable, consultable sans connexion, pages légères et texte lisible sur petit écran.';
    if (d.includes('avec connexion')) return '\n\nDIFFUSION : contenu enrichi d’une courte vidéo et d’un quiz interactif en ligne.';
    if (d.includes('informatique')) return '\n\nDIFFUSION : séance en salle informatique, deux apprenants par poste, progression guidée par l’enseignant.';
    if (d.includes('imprime')) return '\n\nDIFFUSION : document imprimé remis à la maison, avec consignes autoportantes compréhensibles sans l’enseignant.';
    return '';
  })();

  const volume = (() => {
    const v = norm(answers.volume_exercices || '');
    if (!v) return '';
    if (v.includes('3 exercices')) return '\n\nVOLUME DEMANDÉ : 3 exercices gradués (facile, moyen, difficile).';
    if (v.includes('5 exercices')) return '\n\nVOLUME DEMANDÉ : 5 exercices gradués, du plus simple au plus complexe.';
    if (v.includes('surveille') || v.includes('sur 20')) return '\n\nVOLUME DEMANDÉ : devoir surveillé noté sur 20, barème explicite par exercice.';
    if (v.includes('remediation')) return '\n\nVOLUME DEMANDÉ : exercices de remédiation uniquement, centrés sur l’erreur la plus fréquente.';
    return '';
  })();

  const materielLine = answers.materiel
    ? `${answers.materiel}.\n(Fiche construite uniquement avec le matériel réellement disponible.)`
    : plan.materiel;

  const exigence = answers.consignes && !norm(answers.consignes).startsWith('non')
    ? `\n\nEXIGENCE PARTICULIÈRE DE L’ENSEIGNANT : ${answers.consignes}`
    : '';

  const deroulement = [
    `SITUATION DE DÉPART\n${buildSituation(answers)}`,
    `RAPPEL DES PRÉREQUIS\n${buildPrerequis(answers)}`,
    `ORGANISATION DE LA CLASSE\n${buildOrganisation(answers)}`,
    plan.deroulement + appuiEarly + manipulation + support + diffusion + volume,
    `DIFFÉRENCIATION\n${buildDifferenciation(answers)}`,
  ].join('\n\n──────────\n\n') + exigence;

  const evaluation = [
    buildEvaluationMode(answers),
    plan.evaluation,
    buildRemediation(answers),
  ].join('\n\n──────────\n\n');

  return {
    ...plan,
    materiel: materielLine,
    deroulement,
    evaluation,
    competence: plan.competence,
    objectif: plan.objectif || `À la fin de la séance, l’apprenant doit être capable de mobiliser « ${theme} » dans une situation de la vie courante.`,
  };
}
