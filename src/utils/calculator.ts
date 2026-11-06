/**
 * MOTEUR DE CALCUL (v47) — logique pure, testable sans interface.
 *
 * Pourquoi un évaluateur écrit à la main plutôt que `eval()` ?
 * `eval` exécuterait n'importe quel code contenu dans la chaîne saisie :
 * c'est une faille, et le résultat dépendrait du moteur du navigateur.
 * On implémente donc un analyseur explicite, qui respecte les priorités
 * mathématiques enseignées à l'école :
 *
 *   1. parenthèses
 *   2. puissance (^), associative à droite : 2^3^2 = 2^9 = 512
 *   3. × ÷ % (modulo)
 *   4. + −
 *
 * Grammaire (descente récursive) :
 *   expression → terme      (('+'|'-') terme)*
 *   terme      → puissance  (('*'|'/'|'%') puissance)*
 *   puissance  → unaire     ('^' puissance)?          [droite]
 *   unaire     → ('-'|'+')? primaire ('!')?
 *   primaire   → nombre | '(' expression ')' | fonction '(' expression ')'
 */

export interface CalcResult {
  ok: boolean;
  value: number;
  error?: string;
}

/** Fonctions scientifiques disponibles. */
const FUNCTIONS: Record<string, (x: number) => number> = {
  racine: Math.sqrt,
  sqrt: Math.sqrt,
  sin: (x) => Math.sin((x * Math.PI) / 180), // degrés : usage scolaire
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
  arrondi: Math.round,
};

/**
 * Normalise la saisie :
 *  - la virgule décimale française devient un point ;
 *  - les symboles d'écran × ÷ − deviennent * / - ;
 *  - les espaces (y compris insécables des milliers) disparaissent.
 */
export function normalizeExpression(input: string): string {
  return (input || '')
    .replace(/[\u00a0\s]/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '.');
}

/** Factorielle : entier de 0 à 170 (au-delà, le résultat dépasse Number). */
function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('La factorielle exige un entier positif.');
  if (n > 170) throw new Error('Nombre trop grand pour la factorielle.');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluateExpression(raw: string): CalcResult {
  const s = normalizeExpression(raw);
  if (!s) return { ok: false, value: 0, error: '' };

  let pos = 0;
  const peek = () => s[pos];
  const eof = () => pos >= s.length;

  function parseExpression(): number {
    let left = parseTerm();
    while (!eof() && (peek() === '+' || peek() === '-')) {
      const op = s[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (!eof() && (peek() === '*' || peek() === '/' || peek() === '%')) {
      const op = s[pos++];
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('Division par zéro impossible.');
      }
      if (op === '*') left *= right;
      else if (op === '/') left /= right;
      else left %= right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (!eof() && peek() === '^') {
      pos++;
      // Associativité à droite : on rappelle parsePower, pas parseUnary.
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseUnary(): number {
    if (!eof() && (peek() === '-' || peek() === '+')) {
      const op = s[pos++];
      const v = parseUnary();
      return op === '-' ? -v : v;
    }
    let v = parsePrimary();
    while (!eof() && peek() === '!') { pos++; v = factorial(v); }
    return v;
  }

  function parsePrimary(): number {
    if (eof()) throw new Error('Expression incomplète.');

    if (peek() === '(') {
      pos++;
      const v = parseExpression();
      if (peek() !== ')') throw new Error('Parenthèse fermante manquante.');
      pos++;
      return v;
    }

    // Constante ou fonction
    const word = /^[a-zA-Zπ]+/.exec(s.slice(pos));
    if (word) {
      const name = word[0].toLowerCase();
      pos += word[0].length;
      if (name === 'π' || name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      const fn = FUNCTIONS[name];
      if (!fn) throw new Error(`Fonction inconnue : ${name}`);
      if (peek() !== '(') throw new Error(`Parenthèse attendue après ${name}.`);
      pos++;
      const arg = parseExpression();
      if (peek() !== ')') throw new Error('Parenthèse fermante manquante.');
      pos++;
      const out = fn(arg);
      if (Number.isNaN(out)) throw new Error('Calcul impossible sur cette valeur.');
      return out;
    }

    const num = /^\d*\.?\d+/.exec(s.slice(pos));
    if (!num) throw new Error(`Caractère inattendu : « ${peek()} »`);
    pos += num[0].length;
    return parseFloat(num[0]);
  }

  try {
    const value = parseExpression();
    if (!eof()) throw new Error(`Caractère inattendu : « ${peek()} »`);
    if (!Number.isFinite(value)) throw new Error('Résultat non calculable.');
    return { ok: true, value };
  } catch (e) {
    return { ok: false, value: 0, error: (e as Error).message };
  }
}

/** Affichage : virgule décimale française, jusqu'à 10 décimales utiles. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 1e10) / 1e10;
  return String(rounded).replace('.', ',');
}

/* ------------------------------------------------------------------ */
/* Outils du quotidien de l'enseignant                                 */
/* ------------------------------------------------------------------ */

/**
 * MOYENNE PONDÉRÉE — le calcul le plus fréquent d'un enseignant.
 *   moyenne = Σ(note × coefficient) ÷ Σ(coefficients)
 * Somme des coefficients nulle ⇒ 0 (et non NaN à l'écran).
 */
export function weightedAverage(items: { note: number; coef: number }[]): number {
  const totalCoef = items.reduce((t, i) => t + (i.coef || 0), 0);
  if (totalCoef <= 0) return 0;
  const total = items.reduce((t, i) => t + (i.note || 0) * (i.coef || 0), 0);
  return Math.round((total / totalCoef) * 100) / 100;
}

/**
 * CONVERSION D'UNE NOTE d'un barème à un autre.
 *   note ramenée = note × (barème visé ÷ barème d'origine)
 * Exemple : 15/30 ramené sur 20 → 15 × (20/30) = 10.
 */
export function convertMark(note: number, fromScale: number, toScale: number): number {
  if (!fromScale || fromScale <= 0) return 0;
  return Math.round((note * (toScale / fromScale)) * 100) / 100;
}

/**
 * POURCENTAGE DE RÉUSSITE = (réussites ÷ effectif) × 100.
 * Effectif nul ⇒ 0.
 */
export function successRate(passed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((passed / total) * 1000) / 10;
}

/** RÈGLE DE TROIS : si a → b, alors c → (b × c) ÷ a. */
export function ruleOfThree(a: number, b: number, c: number): number {
  if (!a) return 0;
  return Math.round(((b * c) / a) * 10000) / 10000;
}
