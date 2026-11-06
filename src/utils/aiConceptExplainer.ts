import type { AIProvider } from './aiLessonGenerator';
import { sendAIRequest, type OnlineAIProvider } from './aiGateway';
import { illustrate } from './svgIllustration';

export type ConceptAIProvider = Exclude<AIProvider, 'local_llm'>;

export interface ConceptExplanation {
  provider: ConceptAIProvider;
  title: string;
  text: string;
  simpleSummary: string;
  imageUrl: string;
  videoUrls: string[];
}

export interface ConceptInput {
  notion: string;
  discipline: string;
  level: string;
  currentContent: string;
}

const providerLabel: Record<ConceptAIProvider, string> = {
  local: 'Assistant intégré',
  openai: 'ChatGPT',
  copilot: 'Azure OpenAI',
  anthropic: 'Claude Anthropic',
  mistral: 'Mistral AI',
  perplexity: 'Perplexity',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
};

function imageQuery(input: ConceptInput) {
  const q = `${input.discipline} ${input.notion} school education africa`;
  return illustrate(q, input.notion);
}

function videoFor(input: ConceptInput) {
  const text = `${input.notion} ${input.discipline}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (text.includes('feux') || text.includes('rue') || text.includes('route') || text.includes('circulation')) return ['https://www.youtube.com/watch?v=PSsNGIY2zOo'];
  if (text.includes('math') || text.includes('addition') || text.includes('soustraction') || text.includes('fraction')) return ['https://www.youtube.com/watch?v=4O8X7xG6dpA'];
  if (text.includes('lecture') || text.includes('phrase') || text.includes('verbe') || text.includes('francais')) return ['https://www.youtube.com/watch?v=VeSUzYblKio'];
  if (text.includes('science') || text.includes('corps') || text.includes('plante') || text.includes('eau') || text.includes('svt')) return ['https://www.youtube.com/watch?v=tZ4lCI6Pyoo'];
  if (text.includes('sport') || text.includes('eps') || text.includes('course') || text.includes('saut')) return ['https://www.youtube.com/watch?v=rdLfnajz3wg'];
  return ['https://www.youtube.com/watch?v=KCGamQMZ7Nk'];
}

function buildPrompt(input: ConceptInput) {
  return `Tu es un professeur expert, pédagogue et clair pour les élèves africains francophones.

Explique la notion suivante directement à l'élève, sans expliquer comment l'enseignant doit enseigner.

Notion : ${input.notion}
Discipline : ${input.discipline}
Niveau : ${input.level}
Contenu déjà disponible : ${input.currentContent.slice(0, 5000)}

Produis une réponse en français simple avec :
1. Explication détaillée de la notion.
2. Fonction ou rôle de la notion.
3. Points importants à retenir.
4. Exemples proches du vécu de l'élève.
5. Résumé simple pour petit écolier.
6. Deux petits exercices de vérification.

Retourne uniquement un JSON valide :
{"title":"...","text":"...","simpleSummary":"..."}`;
}

function parseAIText(text: string, input: ConceptInput, provider: ConceptAIProvider): ConceptExplanation {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const data = JSON.parse(cleaned);
    return {
      provider,
      title: data.title || input.notion,
      text: data.text || cleaned,
      simpleSummary: data.simpleSummary || data.resume || '',
      imageUrl: imageQuery(input),
      videoUrls: videoFor(input),
    };
  } catch {
    return {
      provider,
      title: input.notion,
      text: cleaned || localExplanation(input).text,
      simpleSummary: localExplanation(input).simpleSummary,
      imageUrl: imageQuery(input),
      videoUrls: videoFor(input),
    };
  }
}

function levelBand(level: string): 'petit' | 'moyen' | 'grand' {
  const n = (level || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/maternelle|\bci\b|\bcp\b|ce1/.test(n)) return 'petit';
  if (/ce2|cm1|cm2|6e|6eme|5e|5eme/.test(n)) return 'moyen';
  return 'grand';
}

function disciplineAngle(discipline: string, notion: string): { angle: string; exemples: string; exercices: string } {
  const d = (discipline || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/math/.test(d)) return {
    angle: `En mathématiques, « ${notion} » est un outil : on l'utilise pour résoudre un problème réel (compter, partager, mesurer, comparer, vérifier un prix au marché).`,
    exemples: `• Au marché : ta maman achète plusieurs articles et tu dois vérifier la monnaie rendue.\n• À la maison : partager équitablement une quantité entre plusieurs enfants.\n• À l'école : comparer les résultats de deux groupes.`,
    exercices: `1. Invente un problème de la vie courante qui utilise « ${notion} », puis résous-le.\n2. Résous le même problème d'une seconde manière et vérifie que tu trouves le même résultat.`,
  };
  if (/franc|lecture|grammaire|conjug|orthograph|vocabulaire|expression/.test(d)) return {
    angle: `En français, « ${notion} » sert à mieux comprendre ce qu'on lit et à mieux se faire comprendre quand on parle ou quand on écrit.`,
    exemples: `• Dans une phrase que tu lis dans ton livre.\n• Dans une lettre ou un message que tu écris à un ami.\n• Dans une histoire racontée par quelqu'un de ta famille.`,
    exercices: `1. Écris deux phrases correctes qui utilisent « ${notion} », puis souligne ce qui le montre.\n2. Trouve dans ton livre de lecture un exemple de « ${notion} » et recopie-le.`,
  };
  if (/science|svt|physique|chimie|est\b|\bes\b|technolog|biolog/.test(d)) return {
    angle: `En sciences, « ${notion} » s'explique par l'observation : on se pose une question, on émet une hypothèse, on observe ou on expérimente, puis on conclut.`,
    exemples: `• Un phénomène que tu observes autour de toi (une plante, l'eau, le corps, un objet).\n• Une expérience simple réalisable avec du matériel de la maison.\n• Une situation d'hygiène ou de santé de tous les jours.`,
    exercices: `1. Cite une observation de ton milieu qui montre « ${notion} ».\n2. Fais un schéma légendé et explique-le en trois phrases.`,
  };
  if (/histoire|geo|geographie|ecm|citoyen/.test(d)) return {
    angle: `En histoire-géographie et éducation citoyenne, « ${notion} » permet de situer les faits, de comprendre pourquoi les choses se passent ainsi et d'adopter un bon comportement.`,
    exemples: `• Un fait de l'histoire de ton pays ou de ta région.\n• Un lieu que tu connais et que tu peux situer sur une carte.\n• Une règle de vie en société que tu observes chaque jour.`,
    exercices: `1. Explique avec tes mots pourquoi « ${notion} » est important.\n2. Donne un exemple de « ${notion} » que tu as déjà vu ou vécu.`,
  };
  return {
    angle: `« ${notion} » est une notion du programme : il faut d'abord la comprendre, ensuite la reconnaître dans une situation, enfin l'utiliser correctement.`,
    exemples: `• Une situation à l'école.\n• Une situation à la maison.\n• Une situation dans ton quartier.`,
    exercices: `1. Explique « ${notion} » avec tes propres mots, sans recopier.\n2. Donne un exemple de « ${notion} » dans ta vie de tous les jours.`,
  };
}

function localExplanation(input: ConceptInput): ConceptExplanation {
  const notion = input.notion || 'cette notion';
  const band = levelBand(input.level);
  const { angle, exemples, exercices } = disciplineAngle(input.discipline, notion);
  const base = (input.currentContent || '').trim();

  const tonIntro = band === 'petit'
    ? `Regarde bien : « ${notion} », c'est quelque chose que tu rencontres déjà sans le savoir. On va l'expliquer tout doucement, avec des exemples.`
    : band === 'moyen'
      ? `« ${notion} » fait partie du programme de ${input.level}. Nous allons l'expliquer étape par étape, puis tu vérifieras que tu as compris.`
      : `« ${notion} » est une notion que tu dois maîtriser en ${input.level}. Il faut en comprendre le sens exact, le rôle, et savoir l'utiliser dans une situation nouvelle.`;

  const retenir = band === 'petit'
    ? `• Je sais dire ce que c'est avec mes mots.\n• Je sais montrer un exemple.\n• Je sais l'utiliser dans un petit exercice.`
    : `• Le sens précis de « ${notion} » (définition exacte).\n• Le rôle de la notion : à quoi elle sert concrètement.\n• La méthode ou la démarche pour l'appliquer.\n• Au moins un exemple personnel que tu peux citer de mémoire.\n• L'erreur la plus fréquente à éviter.`;

  const text = [
    `EXPLICATION DE LA NOTION`,
    tonIntro,
    base ? `\nCe que dit ton cours :\n${base.slice(0, 2500)}` : '',
    `\nÀ QUOI ÇA SERT`,
    angle,
    `\nCE QU'IL FAUT RETENIR`,
    retenir,
    `\nEXEMPLES PROCHES DE TOI`,
    exemples,
    `\nATTENTION — L'ERREUR À ÉVITER`,
    `Beaucoup d'élèves apprennent « ${notion} » par cœur sans comprendre. Vérifie toujours que tu peux l'expliquer à un camarade sans regarder ton cahier : c'est la preuve que tu as compris.`,
    `\nPETITS EXERCICES POUR VÉRIFIER`,
    exercices,
  ].filter(Boolean).join('\n');

  const simpleSummary = band === 'petit'
    ? `« ${notion} » : je sais ce que c'est, je peux montrer un exemple et l'utiliser dans un exercice.`
    : `« ${notion} » (${input.discipline}, ${input.level}) : en comprendre le sens, savoir la reconnaître dans une situation, l'appliquer avec la bonne démarche et pouvoir l'expliquer soi-même.`;

  return {
    provider: 'local',
    title: notion,
    text,
    simpleSummary,
    imageUrl: imageQuery(input),
    videoUrls: videoFor(input),
  };
}

export async function explainConceptWithAI(
  provider: ConceptAIProvider,
  input: ConceptInput,
  options: { allowExternal?: boolean; model?: string } = {},
): Promise<ConceptExplanation> {
  if (provider === 'local') return localExplanation(input);
  if (!options.allowExternal) throw new Error('Accord requis avant tout envoi à un fournisseur d’IA externe.');
  const response = await sendAIRequest(
    provider as OnlineAIProvider,
    options.model || '',
    [{ role: 'user', content: buildPrompt(input) }],
    { consent: true },
  );
  return parseAIText(response.text, input, provider);
}

export function getProviderLabel(provider: ConceptAIProvider) {
  return providerLabel[provider];
}
