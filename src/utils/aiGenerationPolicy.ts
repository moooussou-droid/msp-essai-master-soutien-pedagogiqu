/** Message affiché lorsque la préparation de fiches par IA est suspendue. */
export const FICHE_GENERATION_UNAVAILABLE = 'La préparation de fiches par IA est temporairement indisponible. Vous pouvez créer vos fiches manuellement dans « Fiches pédagogiques ». L’IA locale reste disponible pour les questions, les explications et les reformulations, mais ne génère pas de fiche complète.';

/**
 * Repère les demandes explicites de création d'une fiche ou d'une séance dans
 * le chat général, pour les bloquer avant tout traitement local ou distant.
 * Les questions, explications, exercices et reformulations restent autorisés.
 */
export function isFicheGenerationRequest(value: string): boolean {
  const text = value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mentionsLesson = /\b(?:fiches?|seances?|lecons?|cours?|lesson(?:\s+(?:plans?|sheets?))?)\b/.test(text);
  const asksForGeneration = /\b(?:gener\w*|cre\w*|redig\w*|prepar\w*|concoi\w*|concev\w*|elabor\w*|produi\w*|compos\w*|ecri\w*|fai\w*|constru\w*|fabriqu\w*|don\w*|creat\w*|writ\w*|draft\w*|mak\w*|build\w*)\b/.test(text)
    || /\b(?:veux|voudrais|souhaite|aimerais|ai\s+besoin|me\s+faut)\b/.test(text);
  return mentionsLesson && asksForGeneration;
}
