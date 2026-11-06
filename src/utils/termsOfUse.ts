/**
 * CONDITIONS D'UTILISATION (v47).
 *
 * Demande : « rédige les conditions d'utilisation en tenant compte des
 * spécificités de l'application » et « permets au Super Administrateur de
 * les modifier ».
 *
 * Le texte par défaut ci-dessous n'est pas un modèle générique recopié :
 * chaque article découle d'une règle RÉELLE de l'application, décidée au
 * fil des versions (verrou d'établissement v43/v47, contenus payants
 * débloqués manuellement, fonctionnement hors ligne, signature des
 * documents, sous-modules IA locaux…).
 *
 * Le Super Administrateur peut réécrire intégralement ce texte : sa
 * version est alors conservée et prime sur le texte d'origine. Un bouton
 * « Rétablir le texte d'origine » reste disponible.
 */

export const TERMS_KEY = 'msp_terms_of_use';
export const TERMS_META_KEY = 'msp_terms_meta';

export interface TermsMeta {
  /** Version éditoriale, incrémentée à chaque enregistrement. */
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export const DEFAULT_TERMS = `CONDITIONS GÉNÉRALES D'UTILISATION
Master Soutien Pédagogique (Votre compagnon mobile)

ARTICLE 1 — OBJET
Master Soutien Pédagogique est une application d'appui au travail de
l'enseignant et de l'administration scolaire : gestion des notes et des
bulletins, présences, préparation de classe, cantine scolaire,
comptabilité, documents administratifs et outils pédagogiques.
L'utilisation de l'application vaut acceptation des présentes conditions.

ARTICLE 2 — CODE D'ACCÈS PERSONNEL
L'accès est subordonné à un code délivré par l'administration de
l'application. Le code est strictement personnel et nominatif : le nom de
son titulaire est affiché en permanence en haut de chaque page.
Le partage, la revente ou la cession d'un code sont interdits et
entraînent son retrait sans remboursement.

ARTICLE 3 — UN CODE, UN UTILISATEUR, UNE SEULE ÉCOLE
Chaque code d'accès est rattaché à l'établissement déclaré lors du premier
enregistrement. Un même code ne peut enregistrer une seconde école.
En cas de mutation, l'utilisateur sollicite une autorisation de transfert
auprès du Super Administrateur ; cette autorisation est à usage unique et
l'historique des rattachements est conservé.

ARTICLE 4 — FONCTIONNEMENT HORS LIGNE ET DONNÉES
L'application fonctionne intégralement hors connexion. Les données
(élèves, notes, présences, stocks, comptabilité, documents, signature et
cachet numérisés) sont enregistrées dans la mémoire de l'appareil de
l'utilisateur et ne sont transmises à aucun serveur.
Il en résulte que la conservation des données dépend de l'appareil :
l'utilisateur est seul responsable de ses sauvegardes et exports réguliers.
La désinstallation de l'application ou l'effacement des données du
navigateur entraîne une perte définitive.

ARTICLE 5 — PROTECTION DES DONNÉES DES ÉLÈVES
L'utilisateur s'engage à n'enregistrer que les informations nécessaires au
suivi scolaire et à ne pas diffuser à des tiers non autorisés les données
nominatives des élèves et du personnel. Les documents exportés (bulletins,
listes, procès-verbaux) relèvent de sa seule responsabilité.

ARTICLE 6 — ABONNEMENT ET CONTENUS PAYANTS
L'abonnement annuel, qui inclut l'enrôlement du personnel, est fixé à
999 FCFA par an. Certains contenus sont payants à l'unité : ouvrages et
cours de la bibliothèque, images éducatives (100 FCFA l'image),
personnalisation de la signature des documents (500 FCFA).
Le paiement s'effectue préalablement auprès du Super Administrateur, selon
les coordonnées affichées dans l'application ; le déverrouillage est
ensuite effectué manuellement. Les sommes versées ne sont pas remboursables.

ARTICLE 7 — ADMINISTRATION DE L'APPLICATION
Seuls les Super Administrateurs nomment les membres de l'équipe, génèrent
les codes d'accès et fixent les coordonnées de paiement. Chaque membre
n'accède qu'aux fonctions relevant de sa responsabilité.
Les codes d'accès délivrés ne sont jamais effacés par une mise à jour ;
ils demeurent valables jusqu'à leur expiration, leur retrait ou leur
suppression par un Super Administrateur.

ARTICLE 8 — OUTILS D'INTELLIGENCE ARTIFICIELLE
Les sous-modules d'intelligence artificielle fonctionnent exclusivement en
local, sans clé d'accès ni connexion internet. Ils constituent une aide à
la préparation : l'enseignant demeure responsable du contenu pédagogique
qu'il produit et diffuse.

ARTICLE 9 — DOCUMENTS PRODUITS
Les documents et images générés par l'application portent la signature
« Master Soutien Pédagogique (Votre compagnon mobile) », hormis ceux issus
des sous-modules d'intelligence artificielle. Cette signature peut être
personnalisée après paiement des frais prévus à l'article 6.
Les calculs proposés (moyennes, rations de cantine, bilans comptables)
sont des aides à la décision ; il appartient à l'utilisateur de les
vérifier avant tout usage officiel.

ARTICLE 10 — DISPONIBILITÉ ET MISES À JOUR
L'application est fournie en l'état. L'éditeur s'efforce d'en assurer le
bon fonctionnement et publie des mises à jour successives, sans garantie
d'absence totale d'erreurs ni d'adéquation à un usage particulier.
Les mises à jour ne suppriment ni les données de l'utilisateur ni les
codes d'accès existants.

ARTICLE 11 — USAGES INTERDITS
Sont notamment interdits : le partage de code, la falsification de
documents officiels au moyen de la signature ou du cachet numérisés,
l'enregistrement de données manifestement erronées dans un but frauduleux,
ainsi que toute tentative de contournement des verrous de l'application.

ARTICLE 12 — MODIFICATION DES PRÉSENTES CONDITIONS
Les présentes conditions peuvent être modifiées à tout moment par un
Super Administrateur depuis l'espace d'administration. La version affichée
dans l'application fait foi, sous le numéro et la date indiqués en bas de
page.`;

export function getTerms(): string {
  try {
    const custom = localStorage.getItem(TERMS_KEY);
    // Une chaîne vide enregistrée est traitée comme « pas de version
    // personnalisée » : le texte d'origine réapparaît plutôt qu'une page vide.
    return custom && custom.trim() ? custom : DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

export function isCustomTerms(): boolean {
  try {
    const c = localStorage.getItem(TERMS_KEY);
    return !!(c && c.trim() && c !== DEFAULT_TERMS);
  } catch {
    return false;
  }
}

export function getTermsMeta(): TermsMeta {
  try {
    const raw = localStorage.getItem(TERMS_META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as TermsMeta;
      if (m && typeof m.version === 'number') return m;
    }
  } catch { /* valeur par défaut ci-dessous */ }
  return { version: 1, updatedAt: 0, updatedBy: 'Édition d’origine' };
}

/** Enregistrement par le Super Administrateur : incrémente la version. */
export function saveTerms(text: string, updatedBy = 'Super Administrateur'): TermsMeta {
  const meta: TermsMeta = {
    version: getTermsMeta().version + 1,
    updatedAt: Date.now(),
    updatedBy,
  };
  try {
    localStorage.setItem(TERMS_KEY, text);
    localStorage.setItem(TERMS_META_KEY, JSON.stringify(meta));
  } catch { /* quota */ }
  return meta;
}

/** Rétablit le texte d'origine livré avec l'application. */
export function resetTerms(): void {
  try {
    localStorage.removeItem(TERMS_KEY);
    localStorage.removeItem(TERMS_META_KEY);
  } catch { /* ignore */ }
}

/** Découpe le texte en articles, pour un affichage lisible à l'écran. */
export function splitArticles(text: string): { heading: string; body: string }[] {
  const lines = (text || '').split('\n');
  const blocks: { heading: string; body: string }[] = [];
  let heading = '';
  let body: string[] = [];
  const isHeading = (l: string) => /^ARTICLE\s+\d+/i.test(l.trim());

  for (const line of lines) {
    if (isHeading(line)) {
      if (heading || body.length) blocks.push({ heading, body: body.join('\n').trim() });
      heading = line.trim();
      body = [];
    } else {
      body.push(line);
    }
  }
  if (heading || body.length) blocks.push({ heading, body: body.join('\n').trim() });
  return blocks.filter((b) => b.heading || b.body);
}
