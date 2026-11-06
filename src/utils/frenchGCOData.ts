/**
 * GRAMMAIRE, CONJUGAISON ET ORTHOGRAPHE FRANCOPHONES — v64.
 *
 * Référentiel de classe pour le primaire (CE → CM) et l'entrée au collège,
 * pensé pour les classes francophones du Bénin : exemples de la vie
 * quotidienne (marché, école, famille, quartiers), astuces de remplacement
 * pour les homophones, tableaux de conjugaison à faire recopier, et un
 * exercice corrigé à la fin de chaque leçon.
 *
 * Chaque leçon suit la même trame : objectif → règle → astuce → exemples
 * expliqués → pièges fréquents → « à retenir » → exercice + corrigé.
 * Le quiz final reprend les trois domaines.
 */

export type FrenchDomain = 'grammaire' | 'conjugaison' | 'orthographe';

export interface FrenchLesson {
  id: string;
  domain: FrenchDomain;
  /** Niveaux conseillés : « CE1 – CE2 », « CM1 – CM2 », « CM2 – 6ᵉ »… */
  level: string;
  title: string;
  objectif: string;
  regle: string;
  astuce?: string;
  /** Tableau (surtout en conjugaison) : en-têtes + lignes. */
  table?: { headers: string[]; rows: string[][] };
  /** « Phrase — explication ». */
  exemples: string[];
  pieges: string[];
  aRetenir: string[];
  exercice: {
    consigne: string;
    items: { question: string; reponse: string }[];
  };
}

export const FRENCH_DOMAIN_LABELS: Record<FrenchDomain, { label: string; emoji: string; description: string }> = {
  grammaire: {
    label: 'Grammaire',
    emoji: '🧩',
    description: 'La nature des mots et la construction de la phrase : sujet, verbe, compléments, accords de base.',
  },
  conjugaison: {
    label: 'Conjugaison',
    emoji: '⏳',
    description: 'Les temps utiles au primaire et au collège : présent, futur, imparfait, passé composé, passé simple, impératif et conditionnel.',
  },
  orthographe: {
    label: 'Orthographe',
    emoji: '✍️',
    description: 'Homophones, accords, pluriels, féminins et accents : les règles qui font gagner des points en dictée.',
  },
};

type L = Omit<FrenchLesson, 'domain'>;
const g = (l: L): FrenchLesson => ({ ...l, domain: 'grammaire' });
const c = (l: L): FrenchLesson => ({ ...l, domain: 'conjugaison' });
const o = (l: L): FrenchLesson => ({ ...l, domain: 'orthographe' });

export const FRENCH_LESSONS: FrenchLesson[] = [
  /* ================= GRAMMAIRE ================= */
  g({
    id: 'g-phrase',
    level: 'CE1 – CE2',
    title: 'La phrase : un groupe de mots qui a un sens',
    objectif: 'Reconnaître une phrase, la commencer par une majuscule et la terminer par un point.',
    regle: "Une phrase est un ensemble de mots assemblés dans un ordre qui a un sens complet. Elle commence par une MAJUSCULE et se termine par un signe de ponctuation : point (.), point d'interrogation (?) ou point d'exclamation (!). Toute phrase contient au moins un verbe conjugué (sauf quelques phrases courtes comme les titres ou les réponses).",
    astuce: "Lis les mots dans l'ordre : si tu comprends l'idée jusqu'au bout et que tu peux dire « qui fait quoi », c'est une phrase. « Le marché de Dantokpa les vendeuses » n'a pas de sens complet : ce n'est pas une phrase.",
    exemples: [
      'Afi range ses cahiers dans son sac. — Sens complet, majuscule, point : c’est une phrase.',
      'Où habite ton cousin ? — Phrase terminée par un point d’interrogation.',
      'les mangues du verger de grand-père — Pas de verbe, pas de sens complet : ce n’est pas une phrase.',
    ],
    pieges: [
      'Oublier la majuscule après un point : « Kossi joue. il rit. » → « Il rit. »',
      'Enchaîner plusieurs phrases sans point : la dictée devient illisible.',
    ],
    aRetenir: ['Majuscule au début, point à la fin.', 'Un sens complet.', 'Presque toujours un verbe conjugué.'],
    exercice: {
      consigne: 'Dis si c’est une phrase (P) ou non (N), puis corrige la ponctuation quand il le faut.',
      items: [
        { question: '« les élèves de la classe de CM1 »', reponse: 'N — pas de verbe, pas de sens complet.' },
        { question: '« maman prépare la pâte de maïs »', reponse: 'P — il manque la majuscule et le point : « Maman prépare la pâte de maïs. »' },
        { question: '« Le directeur salue les parents. »', reponse: 'P — phrase correcte.' },
        { question: '« Viens vite »', reponse: 'P — phrase courte mais complète ; on ajoute : « Viens vite ! » ou « Viens vite. »' },
      ],
    },
  }),
  g({
    id: 'g-types-phrases',
    level: 'CE2 – CM1',
    title: 'Les types de phrases et la forme négative',
    objectif: 'Distinguer les phrases déclarative, interrogative, exclamative et impérative ; passer à la forme négative.',
    regle: "Il existe quatre types de phrases. La phrase DÉCLARATIVE raconte ou informe (.). La phrase INTERROGATIVE pose une question (?). La phrase EXCLAMATIVE exprime un sentiment fort (!). La phrase IMPÉRATIVE donne un ordre ou un conseil (verbe à l'impératif, sans sujet exprimé). Indépendamment du type, une phrase est à la forme AFFIRMATIVE ou NÉGATIVE (ne… pas, ne… jamais, ne… plus, ne… rien autour du verbe).",
    table: {
      headers: ['Type', 'Rôle', 'Exemple'],
      rows: [
        ['Déclarative', 'Raconter, informer', 'Le car part à six heures.'],
        ['Interrogative', 'Poser une question', 'À quelle heure part le car ?'],
        ['Exclamative', 'Exprimer un sentiment', 'Comme ce car est plein !'],
        ['Impérative', 'Donner un ordre, un conseil', 'Dépêche-toi, le car va partir !'],
      ],
    },
    exemples: [
      'Senami ne mange pas de piment. — Déclarative, forme négative (ne… pas encadre « mange »).',
      'Ne jette jamais les ordures dans le caniveau ! — Impérative, forme négative.',
      'Est-ce que tu as fini ton exercice ? — Interrogative construite avec « est-ce que ».',
    ],
    pieges: [
      'À l’écrit, « ne » ne peut pas disparaître : « Il vient pas » est réservé à l’oral familier.',
      'Devant une voyelle, « ne » devient « n’ » : « Elle n’a pas faim. »',
    ],
    aRetenir: ['4 types : déclarative, interrogative, exclamative, impérative.', 'La négation encadre le verbe : ne + verbe + pas/jamais/plus/rien.', 'L’impérative n’a pas de sujet exprimé.'],
    exercice: {
      consigne: 'Indique le type de chaque phrase, puis mets la première à la forme négative.',
      items: [
        { question: '« Les pêcheurs rentrent au port. »', reponse: 'Déclarative. Forme négative : « Les pêcheurs ne rentrent pas au port. »' },
        { question: '« Range ton ardoise ! »', reponse: 'Impérative (ordre, pas de sujet).' },
        { question: '« Quelle belle récolte de maïs ! »', reponse: 'Exclamative.' },
        { question: '« Avez-vous visité le musée de Ouidah ? »', reponse: 'Interrogative.' },
      ],
    },
  }),
  g({
    id: 'g-nom',
    level: 'CE1 – CE2',
    title: 'Le nom : commun ou propre, masculin ou féminin',
    objectif: 'Identifier un nom, distinguer nom commun et nom propre, donner son genre et son nombre.',
    regle: "Le nom désigne une personne, un animal, une chose ou une idée. Le nom COMMUN désigne tous les êtres d'une même espèce (une école, un élève, la joie) et il est accompagné d'un déterminant. Le nom PROPRE désigne un être unique (Cotonou, Adjoua, le Bénin) et prend une MAJUSCULE. Chaque nom a un genre (masculin ou féminin) et un nombre (singulier ou pluriel), que l'on repère grâce au déterminant : le/un, la/une, les/des.",
    astuce: 'Pour repérer un nom, essaie de mettre « le », « la » ou « les » devant le mot : « le marché », « la pirogue », « les bananes ». Si ça marche, c’est un nom.',
    exemples: [
      'Porto-Novo est la capitale du Bénin. — « Porto-Novo » et « Bénin » : noms propres (majuscule) ; « capitale » : nom commun féminin singulier.',
      'Le cultivateur sème le mil. — « cultivateur » masculin singulier, « mil » masculin singulier.',
      'Les vendeuses étalent les tomates. — Deux noms communs féminins pluriels.',
    ],
    pieges: [
      'Les noms de jours et de mois ne prennent pas de majuscule en français : « lundi », « janvier ».',
      '« Orange » le fruit est féminin : « une orange mûre ».',
    ],
    aRetenir: ['Nom propre = majuscule (Adjoua, Parakou).', 'Nom commun = déterminant devant (le, la, les…).', 'Le déterminant indique le genre et le nombre.'],
    exercice: {
      consigne: 'Relève les noms et précise : commun ou propre, masculin ou féminin, singulier ou pluriel.',
      items: [
        { question: '« La maîtresse écrit au tableau. »', reponse: 'maîtresse (commun, fém. sing.), tableau (commun, masc. sing.).' },
        { question: '« Didier traverse le fleuve Ouémé en pirogue. »', reponse: 'Didier (propre), fleuve (commun, masc. sing.), Ouémé (propre), pirogue (commun, fém. sing.).' },
        { question: '« Les enfants chantent. »', reponse: 'enfants (commun, masc. pluriel).' },
      ],
    },
  }),
  g({
    id: 'g-determinants',
    level: 'CE2 – CM1',
    title: 'Les déterminants : articles, possessifs, démonstratifs',
    objectif: 'Choisir le bon déterminant devant un nom et le nommer correctement.',
    regle: "Le déterminant se place devant le nom et s'accorde avec lui en genre et en nombre. Articles DÉFINIS : le, la, l', les (chose précise, connue). Articles INDÉFINIS : un, une, des (chose non précisée). Déterminants POSSESSIFS : mon, ton, son, ma, ta, sa, mes, tes, ses, notre, votre, leur, nos, vos, leurs (ils indiquent à qui appartient la chose). Déterminants DÉMONSTRATIFS : ce, cet, cette, ces (ils montrent). Article PARTITIF : du, de la, de l', des (une quantité : du riz, de l'eau).",
    table: {
      headers: ['', 'Masculin', 'Féminin', 'Pluriel'],
      rows: [
        ['Défini', 'le (l’)', 'la (l’)', 'les'],
        ['Indéfini', 'un', 'une', 'des'],
        ['Possessif (à moi)', 'mon', 'ma', 'mes'],
        ['Démonstratif', 'ce / cet', 'cette', 'ces'],
      ],
    },
    exemples: [
      'Cet élève a oublié son ardoise. — « cet » démonstratif (masculin devant voyelle), « son » possessif.',
      'Maman achète du poisson et des ignames. — « du » partitif, « des » indéfini pluriel.',
      'Ma sœur garde ses cahiers dans notre chambre. — Trois possessifs : ma, ses, notre.',
    ],
    pieges: [
      'Devant un nom féminin commençant par une voyelle, on emploie « mon/ton/son » : « mon école », « son ardoise » (jamais « ma école »).',
      '« Leur » devant un nom singulier, « leurs » devant un pluriel : « leur maison », « leurs maisons ».',
    ],
    aRetenir: ['Le déterminant s’accorde toujours avec son nom.', 'Ce → cet devant voyelle ou h muet : « cet arbre ».', 'Mon/ton/son devant un nom féminin commençant par une voyelle.'],
    exercice: {
      consigne: 'Complète avec le déterminant qui convient et nomme-le.',
      items: [
        { question: '« … école est près de la mairie. » (elle montre)', reponse: 'Cette école — démonstratif féminin.' },
        { question: '« Aïcha a perdu … écharpe. »', reponse: 'son écharpe — possessif (écharpe est féminin mais commence par une voyelle).' },
        { question: '« Mets … huile rouge dans la sauce. »', reponse: 'de l’huile — partitif devant voyelle.' },
        { question: '« Les jumeaux rangent … affaire. / … affaires. »', reponse: 'leur affaire (singulier) / leurs affaires (pluriel).' },
      ],
    },
  }),
  g({
    id: 'g-adjectif',
    level: 'CE2 – CM1',
    title: 'L’adjectif qualificatif : place et fonction',
    objectif: 'Identifier l’adjectif qualificatif et sa fonction (épithète ou attribut du sujet).',
    regle: "L'adjectif qualificatif précise le nom : il dit comment est la personne, l'animal ou la chose (grand, rouge, courageux, fatigué…). Il s'accorde en genre et en nombre avec le nom qu'il qualifie. Placé juste à côté du nom, il est ÉPITHÈTE : « une robe rouge ». Séparé du nom par un verbe d'état (être, sembler, paraître, devenir, rester), il est ATTRIBUT DU SUJET : « La robe est rouge ». La plupart des adjectifs se placent après le nom ; quelques adjectifs courts et fréquents se placent avant : petit, grand, beau, joli, bon, mauvais, jeune, vieux, nouveau…",
    exemples: [
      'Un vent frais souffle sur la lagune. — « frais » épithète de « vent ».',
      'Le ciel devient noir avant la pluie. — « noir » attribut du sujet « ciel » (verbe d’état « devient »).',
      'Cette vieille pirogue est encore solide. — « vieille » épithète placée avant le nom ; « solide » attribut.',
    ],
    pieges: [
      'L’adjectif attribut s’accorde aussi : « Les mangues sont mûres » (et non « mûr »).',
      'Ne confonds pas adjectif et nom : « le rouge » (nom, la couleur) / « un pagne rouge » (adjectif).',
    ],
    aRetenir: ['Épithète = collé au nom.', 'Attribut = après être/sembler/devenir…', 'Toujours accordé avec le nom qualifié.'],
    exercice: {
      consigne: 'Souligne les adjectifs et dis s’ils sont épithètes ou attributs.',
      items: [
        { question: '« Le petit marché du village est propre. »', reponse: 'petit : épithète de « marché » ; propre : attribut du sujet « marché ».' },
        { question: '« Les élèves attentifs écoutent la leçon. »', reponse: 'attentifs : épithète de « élèves ».' },
        { question: '« Cette soupe semble délicieuse. »', reponse: 'délicieuse : attribut du sujet « soupe » (verbe « semble »).' },
      ],
    },
  }),
  g({
    id: 'g-pronoms',
    level: 'CM1 – CM2',
    title: 'Les pronoms personnels',
    objectif: 'Employer les pronoms personnels sujets et compléments pour éviter les répétitions.',
    regle: "Le pronom remplace un nom ou un groupe nominal pour éviter de le répéter. Pronoms personnels SUJETS : je, tu, il/elle, nous, vous, ils/elles. Pronoms COMPLÉMENTS placés avant le verbe : me, te, le/la/l', nous, vous, les (complément d'objet direct) et me, te, lui, nous, vous, leur (complément d'objet indirect). Pronoms TONIQUES (après une préposition ou seuls) : moi, toi, lui, elle, nous, vous, eux, elles.",
    table: {
      headers: ['Personne', 'Sujet', 'Complément (le/la/les…) ', 'Tonique'],
      rows: [
        ['1ʳᵉ sing.', 'je', 'me', 'moi'],
        ['2ᵉ sing.', 'tu', 'te', 'toi'],
        ['3ᵉ sing.', 'il / elle', 'le / la / lui', 'lui / elle'],
        ['1ʳᵉ plur.', 'nous', 'nous', 'nous'],
        ['2ᵉ plur.', 'vous', 'vous', 'vous'],
        ['3ᵉ plur.', 'ils / elles', 'les / leur', 'eux / elles'],
      ],
    },
    exemples: [
      'Le maître explique la leçon aux élèves ; il la leur explique calmement. — « la » remplace « la leçon », « leur » remplace « aux élèves ».',
      'Entre toi et moi, ce problème est difficile. — Pronoms toniques après prépositions.',
      'Ces oranges, je les ai cueillies ce matin. — « les » remplace « ces oranges ».',
    ],
    pieges: [
      'Après une préposition, jamais « je » : « avec moi », « chez eux », « pour elle ».',
      '« Lui » et « leur » (pronoms compléments) ne prennent jamais de « s » : « je leur parle ».',
    ],
    aRetenir: ['Le pronom évite les répétitions maladroites.', 'Compléments avant le verbe : le, la, les, lui, leur.', 'Toniques après préposition : moi, toi, lui, eux…'],
    exercice: {
      consigne: 'Remplace les groupes soulignés par un pronom.',
      items: [
        { question: '« Nadia prête son livre à sa voisine. » → le livre, à sa voisine', reponse: 'Nadia le lui prête.' },
        { question: '« Nous avons salué les invités. » → les invités', reponse: 'Nous les avons salués.' },
        { question: '« Le directeur parle aux parents. » → aux parents', reponse: 'Le directeur leur parle.' },
        { question: '« Viens avec ton frère et toi… » corrige « avec je »', reponse: 'On dit « avec moi », jamais « avec je ».' },
      ],
    },
  }),
  g({
    id: 'g-verbe-infinitif',
    level: 'CE2 – CM1',
    title: 'Le verbe : infinitif, radical et terminaison',
    objectif: 'Trouver l’infinitif d’un verbe conjugué et séparer radical et terminaison.',
    regle: "Le verbe exprime une action (courir, écrire) ou un état (être, sembler). Son INFINITIF est sa forme du dictionnaire, non conjuguée : chanter, finir, prendre. Dans une forme conjuguée, on distingue le RADICAL (la partie qui porte le sens) et la TERMINAISON (la partie qui change selon la personne et le temps) : « nous chant-ons », « tu fini-s ». On classe les verbes en trois groupes : 1ᵉʳ groupe (infinitif en -er, sauf « aller »), 2ᵉ groupe (infinitif en -ir, participe présent en -issant : finir → finissant), 3ᵉ groupe (tous les autres : partir, prendre, voir…).",
    astuce: 'Pour trouver l’infinitif, place « il faut » ou « je vais » devant la forme : « elle court » → « il faut courir » : l’infinitif est COURIR.',
    exemples: [
      'Les enfants plantent des arbres. — Verbe « plantent » : infinitif PLANTER (1ᵉʳ groupe), radical « plant- », terminaison « -ent ».',
      'Tu choisis une belle histoire. — CHOISIR (2ᵉ groupe, participe présent « choisissant »).',
      'Nous partons demain pour Abomey. — PARTIR (3ᵉ groupe : « partant », pas « partissant »).',
    ],
    pieges: [
      '« Aller » se termine par -er mais appartient au 3ᵉ groupe (je vais, nous allons).',
      'Radical parfois variable : « je viens / nous venons » (venir, 3ᵉ groupe).',
    ],
    aRetenir: ['Infinitif = forme du dictionnaire.', 'Forme conjuguée = radical + terminaison.', '2ᵉ groupe seulement si le participe présent est en -issant.'],
    exercice: {
      consigne: 'Donne l’infinitif et le groupe de chaque verbe.',
      items: [
        { question: '« Elle applaudit les danseurs. »', reponse: 'APPLAUDIR — 2ᵉ groupe (applaudissant).' },
        { question: '« Vous prenez le car de Bohicon. »', reponse: 'PRENDRE — 3ᵉ groupe.' },
        { question: '« Nous balayons la cour. »', reponse: 'BALAYER — 1ᵉʳ groupe.' },
        { question: '« Il va au champ. »', reponse: 'ALLER — 3ᵉ groupe (exception !).' },
      ],
    },
  }),
  g({
    id: 'g-sujet',
    level: 'CE2 – CM1',
    title: 'Le sujet du verbe',
    objectif: 'Trouver le sujet d’un verbe, même quand il est éloigné ou placé après le verbe.',
    regle: "Le sujet est le mot ou le groupe de mots qui commande l'accord du verbe : il répond aux questions « Qui est-ce qui… ? » (personne, animal) ou « Qu'est-ce qui… ? » (chose, idée) posées avant le verbe. Le sujet peut être un nom, un groupe nominal ou un pronom. Il est le plus souvent devant le verbe, mais il peut être INVERSÉ (après le verbe, dans les questions : « Viens-tu ? ») ou séparé du verbe par des mots intercalés.",
    astuce: 'Encadre le verbe, puis demande : « Qui est-ce qui + verbe ? » Dans « Les élèves de la classe de CM2 préparent la fête », qui prépare ? « Les élèves de la classe de CM2 » : tout le groupe est sujet — d’où le pluriel « préparent ».',
    exemples: [
      'Sur la place du village dansent les jeunes filles. — Sujet inversé : « les jeunes filles » (après le verbe « dansent »).',
      'Mon petit frère et moi gardons les chèvres. — Sujet double → verbe à la 1ʳᵉ personne du pluriel (« nous »).',
      'C’est toi qui as fermé la porte. — Le sujet de « as fermé » est « qui » (= toi, 2ᵉ personne).',
    ],
    pieges: [
      '« Toi et moi » = nous ; « toi et lui » = vous ; « lui et elle » = ils.',
      'Le sujet n’est pas toujours le premier groupe de la phrase : « Dans la cour, les enfants jouent » (le premier groupe indique le lieu).',
    ],
    aRetenir: ['« Qui est-ce qui / Qu’est-ce qui + verbe ? »', 'Le verbe s’accorde toujours avec son sujet.', 'Sujet parfois inversé ou éloigné : il faut le chercher.'],
    exercice: {
      consigne: 'Trouve le sujet de chaque verbe.',
      items: [
        { question: '« Derrière la concession poussent de grands manguiers. »', reponse: '« de grands manguiers » — sujet inversé (pluriel → « poussent »).' },
        { question: '« Le riz, le maïs et le sorgho nourrissent la famille. »', reponse: 'Sujet triple : « le riz, le maïs et le sorgho » (ils).' },
        { question: '« Manges-tu des arachides grillées ? »', reponse: '« tu » — sujet inversé dans la question.' },
      ],
    },
  }),
  g({
    id: 'g-complements',
    level: 'CM1 – CM2',
    title: 'Les compléments du verbe : COD, COI et compléments circonstanciels',
    objectif: 'Distinguer COD, COI et compléments circonstanciels (temps, lieu, manière).',
    regle: "Après le verbe, certains groupes le complètent directement. Le COD (complément d'objet direct) répond à « qui ? / quoi ? » après le verbe, sans préposition : « Awa lit un conte » (lit quoi ? → un conte). Le COI (complément d'objet indirect) répond à « à qui ? / à quoi ? / de qui ? / de quoi ? », avec une préposition : « Elle téléphone à sa tante ». Les compléments CIRCONSTANCIELS (CC) précisent les circonstances : temps (quand ?), lieu (où ?), manière (comment ?), cause (pourquoi ?), but (pour quoi ?). Ils sont déplaçables et supprimables, contrairement au COD et au COI.",
    table: {
      headers: ['Complément', 'Question', 'Exemple'],
      rows: [
        ['COD', 'qui ? quoi ?', 'Le pêcheur répare son filet.'],
        ['COI', 'à qui ? à quoi ? de quoi ?', 'Il parle à son fils.'],
        ['CC de temps', 'quand ?', 'Il part à l’aube.'],
        ['CC de lieu', 'où ?', 'Il pêche sur le lac Nokoué.'],
        ['CC de manière', 'comment ?', 'Il rame lentement.'],
      ],
    },
    exemples: [
      'Le soir, grand-mère raconte une histoire aux enfants sous le manguier. — CC temps « le soir », COD « une histoire », COI « aux enfants », CC lieu « sous le manguier ».',
      'Kodjo obéit à ses parents. — COI « à ses parents » (obéir à qui ?).',
      'Les élèves travaillent sérieusement. — CC de manière formé d’un adverbe.',
    ],
    pieges: [
      '« Penser à », « obéir à », « téléphoner à » demandent un COI, même pour une personne.',
      'Un groupe avec préposition n’est pas toujours un COI : « Il va à l’école » = CC de lieu (où ?).',
    ],
    aRetenir: ['COD sans préposition : qui ? quoi ?', 'COI avec à/de : à qui ? de quoi ?', 'CC = quand, où, comment… : déplaçable et supprimable.'],
    exercice: {
      consigne: 'Nomme chaque complément souligné.',
      items: [
        { question: '« La vendeuse pèse les oranges. » (les oranges)', reponse: 'COD — pèse quoi ?' },
        { question: '« Tu écris à ton correspondant. » (à ton correspondant)', reponse: 'COI — écris à qui ?' },
        { question: '« Chaque matin, nous faisons l’appel dans la cour. » (chaque matin / dans la cour)', reponse: 'CC de temps / CC de lieu.' },
        { question: '« Elle chante doucement. » (doucement)', reponse: 'CC de manière.' },
      ],
    },
  }),
  g({
    id: 'g-groupe-nominal',
    level: 'CM1 – CM2',
    title: 'Le groupe nominal et ses expansions',
    objectif: 'Repérer le nom noyau d’un groupe nominal et ses expansions (adjectif, complément du nom, proposition relative).',
    regle: "Le groupe nominal (GN) s'organise autour d'un nom NOYAU, précédé d'un déterminant. Il peut être enrichi par des EXPANSIONS : un adjectif épithète (« un pagne coloré »), un complément du nom introduit par une préposition (« un pagne de fête », « la cour de l'école »), ou une proposition subordonnée relative introduite par « qui, que, dont, où… » (« le pagne que maman a cousu »). Le genre et le nombre de tout le groupe sont ceux du nom noyau.",
    astuce: 'Supprime les expansions : le groupe minimal qui reste (déterminant + nom noyau) doit garder un sens. « Les grandes cases rondes du village » → « les cases ». Le noyau est « cases » (féminin pluriel) : d’où « grandes » et « rondes ».',
    exemples: [
      'Le vieux baobab de la place ombrage les passants. — Noyau « baobab », expansion adjectif « vieux », complément du nom « de la place ».',
      'L’élève qui lève la main connaît la réponse. — Relative « qui lève la main », expansion de « élève ».',
      'Une assiette de riz parfumé réjouit les invités. — « de riz » complète « assiette » ; « parfumé » qualifie « riz ».',
    ],
    pieges: [
      'L’adjectif s’accorde avec LE NOM QU’IL QUALIFIE, pas avec le plus proche : « une sauce de tomates fraîches » (fraîches = tomates).',
      'Le complément du nom ne commande jamais l’accord du verbe : « La directrice des écoles arrive » (sujet singulier).',
    ],
    aRetenir: ['GN = déterminant + nom noyau ± expansions.', '3 expansions : adjectif, complément du nom, relative.', 'Les accords dépendent du nom noyau.'],
    exercice: {
      consigne: 'Trouve le nom noyau et les expansions de chaque groupe nominal.',
      items: [
        { question: '« les beaux tissus du marché »', reponse: 'Noyau : tissus ; adjectif : beaux ; complément du nom : du marché.' },
        { question: '« la chanson que chantent les enfants »', reponse: 'Noyau : chanson ; relative : « que chantent les enfants ».' },
        { question: '« un panier de mangues jaunes » — avec quel nom s’accorde « jaunes » ?', reponse: 'Avec « mangues » (féminin pluriel), pas avec « panier ».' },
      ],
    },
  }),
  g({
    id: 'g-phrase-complexe',
    level: 'CM2 – 6ᵉ',
    title: 'Phrase simple, phrase complexe : juxtaposition, coordination, subordination',
    objectif: 'Compter les propositions d’une phrase et dire comment elles sont reliées.',
    regle: "Une PROPOSITION est un ensemble organisé autour d'un verbe conjugué. La phrase SIMPLE ne contient qu'une proposition (un seul verbe conjugué). La phrase COMPLEXE en contient plusieurs, reliées de trois façons : par JUXTAPOSITION (virgule, point-virgule, deux-points), par COORDINATION (mais, ou, et, donc, or, ni, car), ou par SUBORDINATION (une proposition dépend d'une autre : « qui, que, quand, parce que, si, pour que… »). Compter les verbes conjugués donne le nombre de propositions.",
    exemples: [
      'Le coq chante, le village se réveille. — Deux propositions juxtaposées (virgule).',
      'Il pleut, donc nous restons sous le hangar. — Deux propositions coordonnées par « donc ».',
      'Quand la cloche sonne, les élèves se rangent. — Subordonnée de temps « quand la cloche sonne » + principale.',
      'Aminata révise sa leçon parce qu’elle veut réussir. — Subordonnée de cause (« parce que »).',
    ],
    pieges: [
      'Un infinitif ou un participe ne crée pas une proposition : « Partir tôt évite la chaleur » = phrase simple.',
      '« Car » coordonne ; « parce que » subordonne : les deux expriment la cause, mais pas avec la même construction.',
    ],
    aRetenir: ['1 verbe conjugué = 1 proposition.', 'Juxtaposée ( , ; : ), coordonnée (mais ou et donc or ni car), subordonnée (qui, que, quand, si…).', 'La subordonnée dépend de la principale et ne peut pas vivre seule.'],
    exercice: {
      consigne: 'Phrase simple ou complexe ? Précise le lien entre les propositions.',
      items: [
        { question: '« Les vendeuses installent leurs étals dès l’aube. »', reponse: 'Simple : un seul verbe conjugué (« installent »).' },
        { question: '« Le fleuve déborde et les champs sont inondés. »', reponse: 'Complexe : deux propositions coordonnées par « et ».' },
        { question: '« Je crois que tu as raison. »', reponse: 'Complexe : principale « je crois » + subordonnée « que tu as raison ».' },
        { question: '« Le soir tombe ; les lampes s’allument. »', reponse: 'Complexe : deux propositions juxtaposées (point-virgule).' },
      ],
    },
  }),
  g({
    id: 'g-adverbe-preposition',
    level: 'CM1 – CM2',
    title: 'Mots invariables : adverbe, préposition, conjonction',
    objectif: 'Reconnaître les principales classes de mots invariables et leur rôle.',
    regle: "Certains mots ne changent jamais de forme : ce sont les mots INVARIABLES. L'ADVERBE précise un verbe, un adjectif ou un autre adverbe (vite, doucement, hier, très, beaucoup…) ; beaucoup d'adverbes de manière se forment en -ment à partir de l'adjectif au féminin (lent → lente → lentement). La PRÉPOSITION relie un complément au reste de la phrase (à, de, pour, chez, sans, sous, pendant…). La CONJONCTION relie des mots ou des propositions : de coordination (mais, ou, et, donc, or, ni, car) ou de subordination (que, quand, si, comme, parce que…).",
    exemples: [
      'Hier, le maçon a travaillé courageusement sous le soleil. — Adverbes « hier » (temps) et « courageusement » (manière) ; préposition « sous ».',
      'Tu iras chez le cordonnier et tu rapporteras mes sandales. — Préposition « chez » ; conjonction « et ».',
      'Il est très fatigué parce qu’il a veillé tard. — « très » renforce l’adjectif ; « parce que » introduit la cause.',
    ],
    pieges: [
      'Formation en -ment : si l’adjectif se termine par -ant/-ent, l’adverbe est en -amment/-emment : « prudemment », « patiemment » (mais « lentement »).',
      'Ne confonds pas « très » (adverbe) et « trois » (nombre) à l’oral.',
    ],
    aRetenir: ['Adverbe : précise (comment ? quand ? combien ?).', 'Préposition : relie un complément (à, de, chez…).', 'Conjonction : relie des mots ou des propositions.'],
    exercice: {
      consigne: 'Classe les mots soulignés : adverbe, préposition ou conjonction.',
      items: [
        { question: '« Nous partirons demain matin. » (demain)', reponse: 'Adverbe de temps.' },
        { question: '« Le chat dort sous la table. » (sous)', reponse: 'Préposition.' },
        { question: '« Tu veux du thé ou du café ? » (ou)', reponse: 'Conjonction de coordination.' },
        { question: 'Forme l’adverbe de « poli » et de « prudent ».', reponse: 'Poliment ; prudemment (-ent → -emment).' },
      ],
    },
  }),

  /* ================= CONJUGAISON ================= */
  c({
    id: 'c-present-1er-groupe',
    level: 'CE1 – CE2',
    title: 'Le présent des verbes du 1ᵉʳ groupe (-er)',
    objectif: 'Conjuguer au présent un verbe en -er et appliquer les particularités d’orthographe.',
    regle: "Au présent, on garde le radical de l'infinitif (l'infinitif sans -er) et on ajoute les terminaisons : -e, -es, -e, -ons, -ez, -ent. Particularités : les verbes en -ger gardent le « e » devant -ons pour conserver le son [ʒ] (nous mangeons) ; les verbes en -cer prennent une cédille (nous commençons) ; certains verbes modifient leur radical aux trois personnes du singulier et à la 3ᵉ du pluriel : je jette / nous jetons, j'appelle / nous appelons, j'achète / nous achetons, je préfère / nous préférons.",
    table: {
      headers: ['', 'CHANTER', 'MANGER', 'COMMENCER', 'APPELER'],
      rows: [
        ['je', 'chante', 'mange', 'commence', 'appelle'],
        ['tu', 'chantes', 'manges', 'commences', 'appelles'],
        ['il / elle', 'chante', 'mange', 'commence', 'appelle'],
        ['nous', 'chantons', 'mangeons', 'commençons', 'appelons'],
        ['vous', 'chantez', 'mangez', 'commencez', 'appelez'],
        ['ils / elles', 'chantent', 'mangent', 'commencent', 'appellent'],
      ],
    },
    exemples: [
      'Les choristes répètent un chant nouveau. — 3ᵉ personne du pluriel : terminaison -ent.',
      'Nous partageons les arachides grillées. — « partageons » garde le e après le g.',
      'Tu lèves la main pour répondre. — LEVER : è au singulier (je lève, tu lèves).',
    ],
    pieges: [
      'La terminaison -ent de « ils chantent » ne s’entend pas, mais elle s’écrit toujours.',
      'Ne confonds pas « tu chantes » (présent) et « chanter » (infinitif) : voir la leçon -er / -é.',
    ],
    aRetenir: ['Terminaisons : e, es, e, ons, ez, ent.', '-ger → « nous mangeons » ; -cer → « nous commençons ».', 'Appeler/jeter : double consonne au singulier.'],
    exercice: {
      consigne: 'Conjugue au présent.',
      items: [
        { question: 'Les filles (danser) autour du baobab.', reponse: 'dansent.' },
        { question: 'Nous (nager) dans la lagune.', reponse: 'nageons (on garde le e après le g).' },
        { question: 'Tu (jeter) les épluchures à la poubelle.', reponse: 'jettes (double t).' },
        { question: 'Vous (commencer) la dictée.', reponse: 'commencez.' },
      ],
    },
  }),
  c({
    id: 'c-etre-avoir-aller',
    level: 'CE1 – CE2',
    title: 'Le présent de ÊTRE, AVOIR et ALLER',
    objectif: 'Conjuguer sans faute les trois verbes les plus fréquents — qui servent aussi d’auxiliaires.',
    regle: "ÊTRE et AVOIR sont des verbes irréguliers du 3ᵉ groupe ; ils servent aussi d'AUXILIAIRES pour former les temps composés (passé composé…). ALLER est également du 3ᵉ groupe malgré sa terminaison en -er. Ces trois conjugaisons s'apprennent par cœur : elles reviennent dans presque toutes les phrases.",
    table: {
      headers: ['', 'ÊTRE', 'AVOIR', 'ALLER'],
      rows: [
        ['je', 'suis', 'ai', 'vais'],
        ['tu', 'es', 'as', 'vas'],
        ['il / elle', 'est', 'a', 'va'],
        ['nous', 'sommes', 'avons', 'allons'],
        ['vous', 'êtes', 'avez', 'allez'],
        ['ils / elles', 'sont', 'ont', 'vont'],
      ],
    },
    exemples: [
      'Vous êtes en avance, les enfants. — ÊTRE, 2ᵉ personne du pluriel (avec accent circonflexe).',
      'Elles ont soif après le match. — AVOIR, 3ᵉ personne du pluriel (à ne pas confondre avec « ont » / « on »).',
      'Nous allons au marché de Godomey. — ALLER, 1ʳᵉ personne du pluriel.',
    ],
    pieges: [
      '« Tu es » / « et » (conjonction) ; « il a » / « à » (préposition) ; « ils sont » / « son » (possessif) : voir les leçons d’homophones.',
      '« Je suis » ne prend jamais de « t ».',
    ],
    aRetenir: ['ÊTRE : suis, es, est, sommes, êtes, sont.', 'AVOIR : ai, as, a, avons, avez, ont.', 'ALLER : vais, vas, va, allons, allez, vont.'],
    exercice: {
      consigne: 'Complète avec la forme correcte.',
      items: [
        { question: 'Les élèves … prêts pour la sortie. (être)', reponse: 'sont.' },
        { question: 'Tu … une belle écriture. (avoir)', reponse: 'as.' },
        { question: 'Nous … visiter le palais royal d’Abomey. (aller)', reponse: 'allons (futur proche : allons + infinitif).' },
        { question: 'Vous … raison, madame. (avoir)', reponse: 'avez.' },
      ],
    },
  }),
  c({
    id: 'c-present-2e-3e-groupe',
    level: 'CE2 – CM1',
    title: 'Le présent des verbes des 2ᵉ et 3ᵉ groupes',
    objectif: 'Conjuguer les verbes en -ir du 2ᵉ groupe et les verbes fréquents du 3ᵉ groupe.',
    regle: "2ᵉ GROUPE (-ir, participe présent en -issant) : terminaisons -is, -is, -it, -issons, -issez, -issent (finir, choisir, réussir, grandir…). 3ᵉ GROUPE : terminaisons variées, souvent -s, -s, -t au singulier (je pars, tu pars, il part) ; -x pour pouvoir, vouloir (je peux, je veux) ; formes à apprendre pour les verbes courants : faire (vous faites), dire (vous dites), venir/tenir (je viens, nous venons), prendre (je prends, ils prennent), voir (je vois, nous voyons), devoir, recevoir.",
    table: {
      headers: ['', 'FINIR (2ᵉ gr.)', 'FAIRE', 'VENIR', 'PRENDRE', 'POUVOIR'],
      rows: [
        ['je', 'finis', 'fais', 'viens', 'prends', 'peux'],
        ['tu', 'finis', 'fais', 'viens', 'prends', 'peux'],
        ['il / elle', 'finit', 'fait', 'vient', 'prend', 'peut'],
        ['nous', 'finissons', 'faisons', 'venons', 'prenons', 'pouvons'],
        ['vous', 'finissez', 'faites', 'venez', 'prenez', 'pouvez'],
        ['ils / elles', 'finissent', 'font', 'viennent', 'prennent', 'peuvent'],
      ],
    },
    exemples: [
      'Vous faites de beaux dessins. — FAIRE : « faites » (jamais « faisez »).',
      'Les jumeaux viennent à pied. — VENIR : radical « vienn- » à la 3ᵉ personne du pluriel.',
      'Elle réussit son examen. — 2ᵉ groupe : -it à la 3ᵉ personne du singulier.',
    ],
    pieges: [
      '« Vous dites » et « vous faites » sont les seuls à ne pas suivre le modèle en -ez régulier attendu (« disez/faisez » n’existent pas).',
      'PARTIR, SORTIR, DORMIR sont du 3ᵉ groupe : « je pars », « nous dormons » (pas de -iss-).',
    ],
    aRetenir: ['2ᵉ groupe : is, is, it, issons, issez, issent.', '3ᵉ groupe : souvent s, s, t au singulier.', 'FAIRE → vous faites ; DIRE → vous dites.'],
    exercice: {
      consigne: 'Conjugue au présent.',
      items: [
        { question: 'Les bananiers (grandir) vite après les pluies.', reponse: 'grandissent.' },
        { question: 'Tu (dormir) sous la moustiquaire.', reponse: 'dors (3ᵉ groupe).' },
        { question: 'Nous (voir) les pirogues au loin.', reponse: 'voyons.' },
        { question: 'Elles (prendre) leurs paniers.', reponse: 'prennent.' },
      ],
    },
  }),
  c({
    id: 'c-futur',
    level: 'CE2 – CM1',
    title: 'Le futur simple et le futur proche',
    objectif: 'Former le futur simple (y compris les radicaux irréguliers) et le futur proche.',
    regle: "Le FUTUR PROCHE se forme avec ALLER au présent + infinitif : « je vais partir ». Le FUTUR SIMPLE se forme avec l'INFINITIF (pour les verbes en -re, on enlève le e final : prendre → je prendrai) + les terminaisons d'AVOIR au présent : -ai, -as, -a, -ons, -ez, -ont. Il y a toujours la lettre « r » juste avant la terminaison. Radicaux irréguliers à retenir : être → ser-, avoir → aur-, aller → ir-, faire → fer-, venir → viendr-, pouvoir → pourr-, vouloir → voudr-, voir → verr-, devoir → devr-, envoyer → enverr-.",
    table: {
      headers: ['', 'CHANTER', 'FINIR', 'ÊTRE', 'ALLER', 'FAIRE'],
      rows: [
        ['je', 'chanterai', 'finirai', 'serai', 'irai', 'ferai'],
        ['tu', 'chanteras', 'finiras', 'seras', 'iras', 'feras'],
        ['il / elle', 'chantera', 'finira', 'sera', 'ira', 'fera'],
        ['nous', 'chanterons', 'finirons', 'serons', 'irons', 'ferons'],
        ['vous', 'chanterez', 'finirez', 'serez', 'irez', 'ferez'],
        ['ils / elles', 'chanteront', 'finiront', 'seront', 'iront', 'feront'],
      ],
    },
    exemples: [
      'Demain, nous irons à la plage de Fidjrossè. — ALLER au futur simple : radical « ir- ».',
      'Regarde les nuages : il va pleuvoir. — Futur proche (action toute proche, presque certaine).',
      'Quand tu seras grand, tu seras enseignant. — Après « quand » + futur, le verbe principal reste au futur.',
    ],
    pieges: [
      'Après « quand », jamais de conditionnel : « Quand je viendrai… » (et non « je viendrais »).',
      'Attention aux paires : « je chanterai » (futur) / « je chantais » (imparfait).',
    ],
    aRetenir: ['Futur simple = infinitif + ai, as, a, ons, ez, ont (avec un r).', 'Radicaux spéciaux : ser-, aur-, ir-, fer-, viendr-…', 'Futur proche = aller (présent) + infinitif.'],
    exercice: {
      consigne: 'Mets au futur simple.',
      items: [
        { question: 'Elle (pouvoir) bientôt lire couramment.', reponse: 'pourra (radical « pourr- »).' },
        { question: 'Vous (venir) nous aider samedi.', reponse: 'viendrez.' },
        { question: 'Les marchandes (vendre) du poisson frais.', reponse: 'vendront (vendre → vendr- + ont).' },
        { question: 'Je (être) sage pendant la visite.', reponse: 'serai.' },
      ],
    },
  }),
  c({
    id: 'c-imparfait',
    level: 'CM1 – CM2',
    title: 'L’imparfait : le temps du passé qui décrit et qui dure',
    objectif: 'Former l’imparfait de tous les verbes et l’employer pour décrire, raconter des habitudes.',
    regle: "L'IMPARFAIT se forme à partir de la 1ʳᵉ personne du pluriel du présent (« nous ») sans -ons, + les terminaisons -ais, -ais, -ait, -ions, -iez, -aient. Exemple : nous chantons → je chantais ; nous finissons → je finissais. UNE SEULE exception : ÊTRE → j'étais (radical « ét- »). L'imparfait sert à décrire le décor, les habitudes et les actions qui durent dans le passé (« Autrefois, on… », « Chaque matin, il… »).",
    table: {
      headers: ['', 'PARLER', 'FINIR', 'PRENDRE', 'ÊTRE'],
      rows: [
        ['je', 'parlais', 'finissais', 'prenais', 'étais'],
        ['tu', 'parlais', 'finissais', 'prenais', 'étais'],
        ['il / elle', 'parlait', 'finissait', 'prenait', 'était'],
        ['nous', 'parlions', 'finissions', 'prenions', 'étions'],
        ['vous', 'parliez', 'finissiez', 'preniez', 'étiez'],
        ['ils / elles', 'parlaient', 'finissaient', 'prenaient', 'étaient'],
      ],
    },
    exemples: [
      'Autrefois, les anciens racontaient des contes le soir. — Habitude dans le passé.',
      'Le ciel était gris et le vent soufflait fort. — Description du décor d’un récit.',
      'Nous mangions quand le voisin est entré. — Action en cours (imparfait) interrompue par une action brève (passé composé).',
    ],
    pieges: [
      'Verbes en -ger/-cer : « je mangeais », « il commençait », mais « nous mangions », « vous commenciez » (un seul i audible mais deux lettres : -iions est faux, on écrit -ions).',
      'Verbes en -ier : « nous étudiions », « vous criez » → à l’imparfait « vous criiez » (double i).',
    ],
    aRetenir: ['Base : « nous » du présent sans -ons.', 'Terminaisons : ais, ais, ait, ions, iez, aient.', 'Seule exception : être → j’étais.'],
    exercice: {
      consigne: 'Mets à l’imparfait.',
      items: [
        { question: 'Les enfants (jouer) sous le fromager.', reponse: 'jouaient.' },
        { question: 'Nous (étudier) nos leçons chaque soir.', reponse: 'étudiions.' },
        { question: 'Tu (avoir) cinq ans à l’époque.', reponse: 'avais.' },
        { question: 'Le maçon (commencer) le mur de clôture.', reponse: 'commençait (ç devant a).' },
      ],
    },
  }),
  c({
    id: 'c-passe-compose',
    level: 'CM1 – CM2',
    title: 'Le passé composé : auxiliaire + participe passé',
    objectif: 'Former le passé composé avec être ou avoir et choisir le bon participe passé.',
    regle: "Le passé composé = AUXILIAIRE (être ou avoir au présent) + PARTICIPE PASSÉ. Participe passé régulier : -er → é (chanter → chanté), -ir → i (finir → fini), -re → u (vendre → vendu). Participes irréguliers fréquents : être → été, avoir → eu, faire → fait, dire → dit, écrire → écrit, ouvrir → ouvert, prendre → pris, venir → venu, voir → vu, pouvoir → pu, pleuvoir → plu. La plupart des verbes se conjuguent avec AVOIR. Avec ÊTRE : les verbes de déplacement ou de changement d'état (aller, arriver, partir, entrer, sortir, monter, descendre, rester, retourner, rentrer, venir, devenir, revenir, tomber, naître, mourir) et tous les verbes pronominaux (se lever, se laver…). Avec ÊTRE, le participe passé s'accorde avec le sujet : « Elles sont parties ». La négation encadre l'auxiliaire : « Il n'a pas fini ».",
    table: {
      headers: ['', 'CHANTER (avoir)', 'FINIR (avoir)', 'ARRIVER (être)'],
      rows: [
        ['je', 'ai chanté', 'ai fini', 'suis arrivé(e)'],
        ['tu', 'as chanté', 'as fini', 'es arrivé(e)'],
        ['il / elle', 'a chanté', 'a fini', 'est arrivé / arrivée'],
        ['nous', 'avons chanté', 'avons fini', 'sommes arrivé(e)s'],
        ['vous', 'avez chanté', 'avez fini', 'êtes arrivé(e)s'],
        ['ils / elles', 'ont chanté', 'ont fini', 'sont arrivés / arrivées'],
      ],
    },
    exemples: [
      'Les filles sont rentrées avant la nuit. — Auxiliaire être → accord « rentrées ».',
      'Kodjo a pris son petit déjeuner puis il s’est lavé. — « pris » (participe irrégulier de prendre) ; pronominal avec être.',
      'Nous avons visité la Porte du Non-Retour à Ouidah. — Auxiliaire avoir, participe passé invariable ici.',
    ],
    pieges: [
      '« Monter, descendre, sortir, rentrer » prennent AVOIR quand ils ont un COD : « Elle a descendu la valise » / « Elle est descendue de la pirogue ».',
      'Participe passé de « rire » = ri ; de « courir » = couru ; de « boire » = bu.',
    ],
    aRetenir: ['Avoir/être au présent + participe passé.', '-er → é, -ir → i, -re → u (pour les réguliers).', 'Avec être : accord du participe avec le sujet.'],
    exercice: {
      consigne: 'Mets au passé composé.',
      items: [
        { question: 'La marchande (vendre) toutes ses mangues.', reponse: 'a vendu.' },
        { question: 'Les élèves (arriver) en retard, ce matin. (filles et garçons)', reponse: 'sont arrivés (accord masculin pluriel).' },
        { question: 'Tu (écrire) une lettre à ta marraine.', reponse: 'as écrit.' },
        { question: 'Ma sœur (naître) en 2019.', reponse: 'est née (auxiliaire être, accord féminin).' },
      ],
    },
  }),
  c({
    id: 'c-passe-simple',
    level: 'CM2 – 6ᵉ',
    title: 'Le passé simple : le temps des récits et des contes',
    objectif: 'Former le passé simple des verbes réguliers et reconnaître les formes irrégulières courantes.',
    regle: "Le passé simple exprime une action passée, brève et terminée ; on l'emploie surtout à l'écrit, dans les contes et les récits (« Il ouvrit la porte, regarda… »). Verbes du 1ᵉʳ groupe : -ai, -as, -a, -âmes, -âtes, -èrent (il chanta, ils chantèrent). Verbes en -ir/-re réguliers : -is, -is, -it, -îmes, -îtes, -irent (il finit, il vendit). Dans les textes, on utilise surtout la 3ᵉ personne. Irréguliers fréquents (3ᵉ pers.) : être → il fut, avoir → il eut, faire → il fit, venir → il vint, voir → il vit, prendre → il prit, dire → il dit. Le passé simple avance dans l'histoire ; l'imparfait décrit le décor.",
    table: {
      headers: ['', 'PARLER (1ᵉʳ gr.)', 'FINIR / VENDRE', 'ÊTRE', 'VENIR'],
      rows: [
        ['il / elle', 'parla', 'finit / vendit', 'fut', 'vint'],
        ['ils / elles', 'parlèrent', 'finirent / vendirent', 'furent', 'vinrent'],
      ],
    },
    exemples: [
      'Le lièvre aperçut la tortue, éclata de rire et accepta le défi. — Trois actions brèves qui font avancer le conte.',
      'La nuit était noire quand le chasseur entra dans la forêt. — Imparfait (décor) + passé simple (action).',
      'Le roi convoqua ses ministres et leur parla longuement. — 1ᵉʳ groupe : -a.',
    ],
    pieges: [
      'Ne confonds pas « il finit » (passé simple ou présent selon le contexte) et « il finissait » (imparfait).',
      '« Ils chantèrent » prend -èrent (avec accent grave), jamais « chantérent ».',
    ],
    aRetenir: ['1ᵉʳ groupe : a / èrent à la 3ᵉ personne.', '-ir/-re : it / irent.', 'Passé simple = action brève ; imparfait = décor et durée.'],
    exercice: {
      consigne: 'Mets au passé simple (3ᵉ personne).',
      items: [
        { question: 'Le vent (souffler) fort, puis la pluie (tomber).', reponse: 'souffla ; tomba.' },
        { question: 'Les pêcheurs (rentrer) au crépuscule.', reponse: 'rentrèrent.' },
        { question: 'Elle (prendre) la calebasse et (partir).', reponse: 'prit ; partit.' },
        { question: 'Ce (être) une belle fête.', reponse: 'fut (« Ce fut une belle fête »).' },
      ],
    },
  }),
  c({
    id: 'c-imperatif-conditionnel',
    level: 'CM2 – 6ᵉ',
    title: 'L’impératif et le conditionnel présent',
    objectif: 'Donner un ordre ou un conseil (impératif) et exprimer la politesse ou l’hypothèse (conditionnel).',
    regle: "L'IMPÉRATIF n'existe qu'à trois personnes (tu, nous, vous) et sans pronom sujet : « Écoute, écoutons, écoutez ». Pour les verbes du 1ᵉʳ groupe, la forme « tu » perd son s final (chante ! mange !) sauf devant « en » ou « y » (manges-en ! vas-y !). Irréguliers : être → sois, soyons, soyez ; avoir → aie, ayons, ayez. Le CONDITIONNEL PRÉSENT = radical du futur + terminaisons de l'imparfait (je chanterais, tu serais, nous voudrions). Il sert à être poli (« Je voudrais… ») et à imaginer (« Si j'avais des ailes, je volerais » : si + imparfait → conditionnel).",
    exemples: [
      'Rangez vos ardoises et sortez en silence. — Deux impératifs (vous).',
      'Sois sage et aie confiance. — Impératifs irréguliers de être et avoir.',
      'Pourriez-vous m’aider, s’il vous plaît ? — Conditionnel de politesse.',
      'Si le car était à l’heure, nous arriverions avant midi. — Hypothèse : si + imparfait, conditionnel.',
    ],
    pieges: [
      '« Si j’aurais » est une faute classique : après « si » d’hypothèse, on met l’imparfait (« si j’avais »).',
      '« Va » à l’impératif, mais « Vas-y » avec un s de liaison devant y/en.',
    ],
    aRetenir: ['Impératif : 3 formes, pas de sujet exprimé.', 'Conditionnel = radical du futur + ais, ait, ions…', 'Si + imparfait → conditionnel (jamais « si j’aurais »).'],
    exercice: {
      consigne: 'Transforme selon l’indication.',
      items: [
        { question: '« Tu écoutes le maître. » → impératif (tu)', reponse: 'Écoute le maître ! (on enlève le s).' },
        { question: '« Vous êtes attentifs. » → impératif (vous)', reponse: 'Soyez attentifs !' },
        { question: 'Politesse : « Je veux un cahier. » → conditionnel', reponse: 'Je voudrais un cahier, s’il vous plaît.' },
        { question: '« Si je (pouvoir), je t’accompagnerais. »', reponse: 'Si je pouvais (imparfait après si).' },
      ],
    },
  }),
  c({
    id: 'c-choisir-temps',
    level: 'CM2 – 6ᵉ',
    title: 'Bien choisir le temps dans un récit',
    objectif: 'Associer chaque temps à son rôle pour raconter sans mélanger les époques.',
    regle: "Chaque temps a un rôle. Le PRÉSENT : ce qui se passe maintenant, les vérités générales (« La terre tourne »), ou un récit rendu vivant. L'IMPARFAIT : le passé qui dure — descriptions, habitudes, actions en arrière-plan. Le PASSÉ COMPOSÉ (oral et écrit courant) et le PASSÉ SIMPLE (récits écrits) : les actions passées terminées, qui font avancer l'histoire. Le FUTUR : ce qui arrivera. Dans un même récit, on garde la même « époque » : on ne passe pas sans raison du passé au futur. Marqueurs utiles : hier, autrefois, chaque jour (passé) ; maintenant, aujourd'hui (présent) ; demain, bientôt, l'année prochaine (futur).",
    table: {
      headers: ['Temps', 'Rôle principal', 'Exemple'],
      rows: [
        ['Imparfait', 'Décor, habitude, action en cours', 'Le soleil brillait.'],
        ['Passé composé / simple', 'Action terminée qui fait avancer le récit', 'Soudain, la pluie tomba.'],
        ['Présent', 'Maintenant, vérité générale', 'L’eau bout à 100 degrés.'],
        ['Futur', 'Action à venir, promesse', 'Demain, nous planterons des arbres.'],
      ],
    },
    exemples: [
      'Les enfants jouaient dans la cour quand, tout à coup, la cloche a sonné. — Fond à l’imparfait, événement au passé composé.',
      'Chaque samedi, nous allions au marché ; ce samedi-là, nous y avons rencontré le chef du village. — Habitude puis événement unique.',
    ],
    pieges: [
      'Évite « Hier, il va au champ et il récoltera le mil » : hier impose le passé du début à la fin (sauf présent de narration assumé partout).',
      'Après « si » (hypothèse), pas de futur ni de conditionnel : « Si tu viens demain… » (présent) / « Si tu venais… » (imparfait).',
    ],
    aRetenir: ['Décor et habitudes → imparfait.', 'Événements terminés → passé composé ou passé simple.', 'Un récit = une époque, gardée jusqu’au bout.'],
    exercice: {
      consigne: 'Choisis et conjugue le verbe au temps qui convient.',
      items: [
        { question: '« Autrefois, les femmes (porter) l’eau dans des jarres. »', reponse: 'portaient (habitude → imparfait).' },
        { question: '« Soudain, le vent (arracher) une tôle du toit. »', reponse: 'a arraché / arracha (action brève).' },
        { question: '« Demain, nous (semer) le maïs. »', reponse: 'sèmerons (futur).' },
        { question: '« Le soleil (se lever) à l’est. »', reponse: 'se lève (présent de vérité générale).' },
      ],
    },
  }),

  /* ================= ORTHOGRAPHE ================= */
  o({
    id: 'o-a-a',
    level: 'CE2 – CM1',
    title: 'Homophones : a / à',
    objectif: 'Ne plus confondre « a » (verbe avoir) et « à » (préposition).',
    regle: "« A » sans accent est le verbe AVOIR conjugué (il a, elle a, on a) ou son auxiliaire au passé composé. « À » avec accent grave est une PRÉPOSITION : elle introduit un lieu, un moment, un but, une manière (à l'école, à midi, à pied).",
    astuce: 'Remplace par « AVAIT » : si la phrase reste correcte, c’est « a » sans accent (« Il a faim → Il avait faim »). Sinon, c’est « à » (« Il va à l’école » : « il va avait l’école » est impossible).',
    exemples: [
      'Sènami a une nouvelle robe. — On peut dire « avait » : donc « a ».',
      'Nous rentrons à la maison à dix-sept heures. — Lieu et heure : préposition « à ».',
      'Le maçon a construit un puits à côté de la cour. — « a construit » (passé composé) puis « à côté » (lieu).',
    ],
    pieges: ['Dans « il y a », c’est toujours « a » sans accent (verbe avoir).', '« À » devant un infinitif : « apprendre à lire », « prêt à partir ».'],
    aRetenir: ['a = avoir → test « avait ».', 'à = préposition (lieu, heure, but…).', '« il y a » : jamais d’accent.'],
    exercice: {
      consigne: 'Complète par a ou à.',
      items: [
        { question: 'Kodjo … perdu son stylo … l’école.', reponse: 'a (avait perdu) ; à (lieu).' },
        { question: 'La cloche sonne … huit heures.', reponse: 'à (heure).' },
        { question: 'Elle … trois frères et elle va … Cotonou.', reponse: 'a ; à.' },
        { question: 'Il y … beaucoup de monde au marché.', reponse: 'a.' },
      ],
    },
  }),
  o({
    id: 'o-et-est-son-sont',
    level: 'CE2 – CM1',
    title: 'Homophones : et / est et son / sont',
    objectif: 'Distinguer la conjonction « et » du verbe « est », et le possessif « son » du verbe « sont ».',
    regle: "« ET » est une conjonction qui additionne (remplaçable par « et puis »). « EST » est le verbe ÊTRE (remplaçable par « était »). « SON » est un déterminant possessif : il se place devant un nom masculin (ou féminin commençant par une voyelle) et peut être remplacé par « mon » ou « ton ». « SONT » est le verbe ÊTRE au pluriel, remplaçable par « étaient ».",
    astuce: 'Deux tests rapides : « et » → « et puis » ; « est/sont » → « était/étaient ». « Son » est toujours collé à un nom : « son cahier ».',
    exemples: [
      'Le riz et la sauce sont prêts. — « et » additionne ; « sont » = étaient.',
      'Son frère est malade. — « son » devant « frère » ; « est » = était.',
      'Les mangues sont sucrées et leur jus est frais. — Pluriel « sont », singulier « est ».',
    ],
    pieges: ['« C’est » et « s’est » sont d’autres formes à surveiller (voir la leçon ce/se).', '« Son » devant un nom féminin à voyelle : « son école », « son histoire » — ce n’est pas le verbe.'],
    aRetenir: ['et = et puis.', 'est / sont = était / étaient.', 'son = devant un nom (mon/ton).'],
    exercice: {
      consigne: 'Complète par et, est, son ou sont.',
      items: [
        { question: 'Le ciel … dégagé … les étoiles brillent.', reponse: 'est ; et.' },
        { question: '… pagne … neuf.', reponse: 'Son ; est.' },
        { question: 'Les élèves … rangés deux par deux.', reponse: 'sont.' },
        { question: 'Aïcha … sa cousine … revenues du marché.', reponse: 'et ; sont.' },
      ],
    },
  }),
  o({
    id: 'o-on-ont-ou-ou',
    level: 'CE2 – CM1',
    title: 'Homophones : on / ont et ou / où',
    objectif: 'Distinguer le pronom « on » du verbe « ont », et la conjonction « ou » de l’adverbe « où ».',
    regle: "« ON » est un pronom sujet (il, nous, les gens) : il est suivi d'un verbe au singulier et peut être remplacé par « il ». « ONT » est le verbe AVOIR au pluriel, remplaçable par « avaient ». « OU » est une conjonction qui marque un choix, remplaçable par « ou bien ». « OÙ » (avec accent) indique le lieu (parfois le moment) : il répond à la question « à quel endroit ? ».",
    astuce: '« ont » → « avaient » ; « on » → « il ». « ou » → « ou bien » ; « où » → « à quel endroit ».',
    exemples: [
      'On entend les tam-tams au loin. — « On » = les gens (remplaçable par « il » pour le test grammatical).',
      'Les invités ont apporté des cadeaux. — « ont » = avaient (auxiliaire du passé composé).',
      'Tu préfères le fonio ou le riz ? — Choix : « ou ».',
      'Le village où je suis né est près du fleuve. — Lieu : « où ».',
    ],
    pieges: ['Dans « qu’on », « l’on », c’est toujours le pronom « on ».', '« Où » garde son accent même sans question : « la maison où j’habite ».'],
    aRetenir: ['on = il (pronom sujet).', 'ont = avaient (avoir).', 'ou = ou bien (choix) ; où = lieu.'],
    exercice: {
      consigne: 'Complète par on, ont, ou ou où.',
      items: [
        { question: '… va à la pêche demain.', reponse: 'On.' },
        { question: 'Mes cousins … visité Ganvié.', reponse: 'ont.' },
        { question: 'Tu viens samedi … dimanche ?', reponse: 'ou.' },
        { question: 'Je ne sais pas … se trouve la mairie.', reponse: 'où.' },
      ],
    },
  }),
  o({
    id: 'o-ce-se-ces-ses',
    level: 'CM1 – CM2',
    title: 'Homophones : ce / se, ces / ses, c’est / s’est',
    objectif: 'Choisir entre les démonstratifs, les possessifs et le pronom « se ».',
    regle: "« CE » est un déterminant démonstratif devant un nom masculin (ce garçon) ou un pronom démonstratif (ce qui, ce que). « SE » est un pronom qui accompagne un verbe pronominal, toujours placé avant le verbe (il se lève) ; on peut le remplacer par « me » ou « te » en changeant de personne (« je me lève »). « CES » montre (ces enfants = ceux-ci) ; « SES » possède (ses enfants = les siens). « C'EST » = cela est (remplaçable par « c'était ») ; « S'EST » = se + être, dans un verbe pronominal au passé composé (il s'est trompé).",
    astuce: 'Devant un verbe, essaie « je me… » : « il se couche → je me couche » : c’est « se ». « Ses » → « les siens » ; « ces » → « ceux-ci / celles-ci ».',
    exemples: [
      'Ce matin, Adjoua se prépare pour l’école. — « ce » démonstratif ; « se » devant le verbe pronominal.',
      'Ces élèves ont rangé ses affaires… non : LEURS affaires. — « ses » = les siennes (d’une seule personne) ; pour plusieurs possesseurs, « leurs ».',
      'C’est la saison des pluies ; tout le monde s’est abrité. — « c’est » = cela est ; « s’est » = verbe pronominal au passé composé.',
    ],
    pieges: ['« Ce sont » au pluriel : « Ce sont mes amis » (jamais « se sont mes amis »).', '« S’est » exige un participe passé après : « elle s’est levée ».'],
    aRetenir: ['ce/ces : on montre.', 'ses : on possède (les siens).', 'se/s’est : toujours liés à un verbe pronominal.'],
    exercice: {
      consigne: 'Complète correctement.',
      items: [
        { question: '… enfant … cache derrière le manguier. (ce/se)', reponse: 'Cet enfant se cache… (« cet » devant voyelle ; « se » pronominal).' },
        { question: 'Regarde … belles calebasses : ce sont … œuvres. (ces/ses)', reponse: 'ces (on montre) ; ses (les siennes).' },
        { question: '… mon meilleur ami ; il … blessé au foot. (c’est/s’est)', reponse: 'C’est ; s’est.' },
      ],
    },
  }),
  o({
    id: 'o-la-la',
    level: 'CM1 – CM2',
    title: 'Homophones : la / là / l’a — et peu / peut / peux',
    objectif: 'Distinguer l’article, l’adverbe de lieu et la forme verbale ; même démarche pour peu/peut/peux.',
    regle: "« LA » est l'article défini féminin ou le pronom COD (« Je la vois »). « LÀ » (accent grave) est un adverbe de lieu, contraire de « ici » (« Pose-le là »). « L'A » = le/la + le verbe AVOIR (« Elle l'a vu » = elle l'avait vu). Même famille : « PEU » indique une petite quantité (un peu de riz) ; « PEUT » est le verbe POUVOIR conjugué avec il/elle ; « PEUX » avec je/tu.",
    astuce: '« là » → remplace par « ici » en inversant le sens, ou ajoute « -bas » (là-bas). « l’a » → test « l’avait ». « peu » → contraire de « beaucoup ».',
    exemples: [
      'La pirogue est là, près du ponton ; le pêcheur l’a attachée. — Article, lieu, puis « l’a » (il l’avait attachée).',
      'Il reste peu de mil dans le grenier. — Quantité (contraire de beaucoup).',
      'Tu peux venir ; elle peut aussi nous rejoindre. — POUVOIR : « peux » (tu), « peut » (elle).',
    ],
    pieges: ['« Là » dans « ce jour-là », « cet enfant-là » : toujours avec accent et trait d’union.', '« Peux » avec x, comme « je veux » : première et deuxième personnes.'],
    aRetenir: ['la = article ou pronom.', 'là = lieu (là-bas).', 'l’a = l’avait (verbe avoir).', 'peu = quantité ; peut/peux = pouvoir.'],
    exercice: {
      consigne: 'Complète.',
      items: [
        { question: '… cour de l’école est … , derrière le drapeau. (la/là)', reponse: 'La ; là.' },
        { question: 'Son cahier, elle … oublié à la maison. (la/l’a)', reponse: 'l’a (elle l’avait oublié).' },
        { question: 'Il ne … pas courir : il a mal au pied. (peu/peut)', reponse: 'peut.' },
        { question: 'Donne-moi un … de sel. (peu/peut)', reponse: 'peu.' },
      ],
    },
  }),
  o({
    id: 'o-er-e',
    level: 'CM1 – CM2',
    title: 'Infinitif en -er ou participe passé en -é ?',
    objectif: 'Choisir entre -er et -é grâce au test de remplacement par un verbe du 3ᵉ groupe.',
    regle: "Après une préposition (à, de, pour, sans…) et après un verbe conjugué « relais » (vouloir, pouvoir, aller, devoir, venir de, être en train de…), le verbe se met à l'INFINITIF : « apprendre à lire », « je vais manger ». Avec l'auxiliaire être ou avoir (passé composé) et comme adjectif, on emploie le PARTICIPE PASSÉ : « j'ai mangé », « une porte fermée ». Les deux prononciations sont identiques pour les verbes en -er : il faut un test.",
    astuce: 'Remplace le verbe par « VENDRE » (infinitif) ou « VENDU » (participe) : le son change et te donne la réponse. « Je vais mang… » → « je vais vendre » : donc « manger ». « J’ai mang… » → « j’ai vendu » : donc « mangé ».',
    exemples: [
      'Nous devons travailler pour réussir. — Après « devons » et après « pour » : deux infinitifs.',
      'Le directeur a félicité les élèves rangés dans la cour. — « a félicité » passé composé ; « rangés » participe adjectif (accordé avec « élèves »).',
      'Elle vient de terminer son exercice commencé hier. — « terminer » après « vient de » ; « commencé » qualifie « exercice ».',
    ],
    pieges: ['Après « être en train de », « avant de », « au lieu de » : toujours l’infinitif.', 'Un participe passé employé comme adjectif s’accorde : « des mangues cueillies ».'],
    aRetenir: ['Après préposition ou verbe relais → -er.', 'Après être/avoir (auxiliaire) → -é.', 'Test infaillible : vendre / vendu.'],
    exercice: {
      consigne: 'Écris la bonne terminaison -er ou -é(e)(s).',
      items: [
        { question: 'Les enfants vont jou… dans la cour.', reponse: 'jouer (je vais vendre → infinitif).' },
        { question: 'Maman a prépar… une sauce délicieuse.', reponse: 'préparé (j’ai vendu → participe).' },
        { question: 'Il faut écout… avant de répond…', reponse: 'écouter ; répondre (infinitifs).' },
        { question: 'Les bananes achet… au marché sont mûres.', reponse: 'achetées (participe adjectif, accord avec « bananes »).' },
      ],
    },
  }),
  o({
    id: 'o-accord-sujet-verbe',
    level: 'CM1 – CM2',
    title: 'L’accord du verbe avec son sujet',
    objectif: 'Accorder le verbe même quand le sujet est loin, inversé ou collectif.',
    regle: "Le verbe s'accorde en personne et en nombre avec son SUJET, jamais avec le mot qui le touche. Quand un complément du nom pluriel sépare un sujet singulier du verbe, le verbe reste au singulier : « Le directeur des écoles arrive ». Deux sujets unis par « et » font un pluriel ; « toi et moi » = nous, « toi et lui/vous » = vous. Avec un nom collectif (la foule, la famille, une équipe) suivi d'un complément au pluriel, l'accord se fait le plus souvent avec le collectif au primaire : « La foule des supporters chante ». Quand le sujet est « qui », le verbe s'accorde avec l'antécédent de « qui » : « C'est moi qui ai raison », « ce sont eux qui ont gagné ».",
    astuce: 'Mets le sujet au pluriel mentalement : si la phrase exige de changer le verbe, tu as trouvé le vrai sujet. « Le panier de mangues (pèse) lourd » → « Les paniers de mangues pèsent » : le sujet est « panier(s) », donc « pèse » au singulier.',
    exemples: [
      'Le chef du quartier et son adjoint président la réunion. — Deux sujets → pluriel.',
      'Une rangée de bananiers borde le chemin. — Sujet « rangée » (singulier) malgré « bananiers ».',
      'C’est vous qui avez planté ces arbres. — « qui » = vous → « avez ».',
    ],
    pieges: ['Sujet inversé : « Sur la place se dressent deux statues » (pluriel après le verbe).', '« Plus d’un » commande le singulier : « Plus d’un élève a réussi ».'],
    aRetenir: ['Cherche le sujet par « qui est-ce qui ? ».', 'Le complément du nom ne commande pas l’accord.', '« qui » transmet l’accord de son antécédent.'],
    exercice: {
      consigne: 'Accorde le verbe.',
      items: [
        { question: 'Le sac de haricots (peser, présent) dix kilos.', reponse: 'pèse (sujet : le sac).' },
        { question: 'Toi et ton frère (venir, présent) à la fête.', reponse: 'venez (toi + lui = vous).' },
        { question: 'C’est moi qui (garder, présent) la boutique.', reponse: 'garde (qui = je).' },
        { question: 'Dans le ciel (briller, présent) les étoiles.', reponse: 'brillent (sujet inversé pluriel).' },
      ],
    },
  }),
  o({
    id: 'o-accord-participe-etre',
    level: 'CM2 – 6ᵉ',
    title: 'L’accord du participe passé avec l’auxiliaire ÊTRE',
    objectif: 'Accorder le participe passé avec le sujet quand l’auxiliaire est « être ».',
    regle: "Avec l'auxiliaire ÊTRE, le participe passé s'accorde en genre et en nombre avec le SUJET : il est venu, elle est venue, ils sont venus, elles sont venues. Cela vaut pour les verbes de déplacement/changement d'état (aller, arriver, partir, naître, mourir, devenir…) et pour les verbes pronominaux dans les cas simples du primaire (elle s'est levée, ils se sont assis). Rappel : avec AVOIR, le participe reste invariable au niveau primaire, sauf si le COD est placé avant (règle du collège : « les fleurs que j'ai cueillies »).",
    table: {
      headers: ['Sujet', 'ARRIVER', 'PARTIR', 'SE LEVER'],
      rows: [
        ['il', 'est arrivé', 'est parti', 's’est levé'],
        ['elle', 'est arrivée', 'est partie', 's’est levée'],
        ['ils', 'sont arrivés', 'sont partis', 'se sont levés'],
        ['elles', 'sont arrivées', 'sont parties', 'se sont levées'],
      ],
    },
    exemples: [
      'Ma grand-mère est née à Savalou. — Sujet féminin singulier : « née ».',
      'Les deux équipes sont entrées sur le terrain. — Féminin pluriel : « entrées ».',
      'Les garçons ont joué puis ils se sont reposés. — Avec avoir : « joué » invariable ; pronominal : « reposés ».',
    ],
    pieges: ['Groupe mixte (filles + garçons) : accord au masculin pluriel : « Aïcha et Kodjo sont partis ».', '« Vous êtes » peut être singulier de politesse : « Madame, vous êtes arrivée » (une seule personne).'],
    aRetenir: ['Être → accord avec le sujet : -e, -s, -es.', 'Avoir → invariable (au primaire).', 'Pronominaux simples : accord avec le sujet.'],
    exercice: {
      consigne: 'Accorde les participes passés.',
      items: [
        { question: 'Les marchandes sont (revenir) du marché.', reponse: 'revenues.' },
        { question: 'Ma petite sœur est (tomber) mais elle ne s’est pas fait mal.', reponse: 'tombée.' },
        { question: 'Les jumeaux se sont (habiller) tout seuls.', reponse: 'habillés.' },
        { question: 'La pluie a (cesser) ; les élèves sont (sortir).', reponse: 'cessé (avoir, invariable) ; sortis.' },
      ],
    },
  }),
  o({
    id: 'o-pluriel',
    level: 'CE2 – CM1',
    title: 'Le pluriel des noms et des adjectifs',
    objectif: 'Appliquer les règles du pluriel et leurs exceptions les plus fréquentes.',
    regle: "En général, on ajoute un « s » : un élève → des élèves. Les mots déjà terminés par s, x, z ne changent pas (un fils → des fils, un nez → des nez). Les noms en -au, -eau, -eu prennent un « x » (un bateau → des bateaux, un jeu → des jeux) — exceptions avec s : bleus, pneus, landaus. Les noms en -ou prennent un « s » (des clous), SAUF sept mots en -oux : bijou, caillou, chou, genou, hibou, joujou, pou. Les noms en -al font -aux (un cheval → des chevaux) — exceptions avec s : bals, carnavals, festivals, récitals. Quelques noms en -ail font -aux : travail → travaux, bail → baux, corail → coraux, émail → émaux, vitrail → vitraux. Les adjectifs suivent les mêmes règles ; les adjectifs de couleur composés sont invariables (des tissus bleu clair, des robes vert pomme), ainsi que les couleurs issues de noms de fruits/fleurs : orange, marron, citron (invariables), mais rose, mauve, pourpre s'accordent.",
    astuce: 'Pour les -ou, retiens la phrase : « Viens mon chou, mon bijou, sur mes genoux, jette des cailloux à ces hiboux pleins de poux » (il ne manque que joujou !).',
    exemples: [
      'Les chevaux galopent et les enfants gardent leurs joujoux. — -al → -aux ; joujou dans les 7 exceptions en -oux.',
      'Des bateaux neufs et de beaux tissus orange. — -eau → -x ; « orange » couleur invariable.',
      'Les festivals de danses traditionnelles attirent les visiteurs. — « festivals » avec s (exception des -al).',
    ],
    pieges: ['« Des travaux » mais « des détails », « des portails » : tous les -ail ne font pas -aux.', 'Adjectifs de couleur simples accordés : « des robes rouges », « des fleurs blanches ».'],
    aRetenir: ['Règle générale : + s.', '-au/-eau/-eu → x ; -al → aux (avec exceptions).', '7 noms en -oux : bijou, caillou, chou, genou, hibou, joujou, pou.'],
    exercice: {
      consigne: 'Mets au pluriel.',
      items: [
        { question: 'un caillou pointu', reponse: 'des cailloux pointus.' },
        { question: 'un beau château / un pneu neuf', reponse: 'de beaux châteaux / des pneus neufs (pneu prend un s).' },
        { question: 'un travail difficile', reponse: 'des travaux difficiles.' },
        { question: 'une robe bleu marine', reponse: 'des robes bleu marine (couleur composée invariable ; « robes » prend s).' },
      ],
    },
  }),
  o({
    id: 'o-feminin',
    level: 'CE2 – CM1',
    title: 'Le féminin des noms et des adjectifs',
    objectif: 'Former le féminin des noms de métiers/personnes et des adjectifs courants.',
    regle: "En général, on ajoute un « e » : un ami → une amie, grand → grande. Cas fréquents : -eur → -euse (un chanteur → une chanteuse, vendeur → vendeuse) ; -teur → -trice (acteur → actrice, instituteur → institutrice) ; -ien → -ienne, -on → -onne, -an → -anne (musicien → musicienne) avec doublement de la consonne ; -f → -ve (actif → active, veuf → veuve) ; -x → -se (heureux → heureuse) mais doux → douce, roux → rousse, faux → fausse ; -er → -ère (boulanger → boulangère, fier → fière) ; -et → -ette (muet → muette) mais complet → complète, secret → secrète. Formes entièrement différentes : homme/femme, garçon/fille, roi/reine, héros/héroïne, oncle/tante.",
    exemples: [
      'La boulangère vend du pain frais et la couturière coud une robe. — -er → -ère ; le nom de métier féminin en -ière/-ère.',
      'Une élève attentive et courageuse. — « attentive » (-f → -ve), « courageuse » (-eux → -euse).',
      'La directrice félicite la championne de course. — -teur → -trice ; -on → -onne.',
    ],
    pieges: ['« blanc → blanche », « sec → sèche », « frais → fraîche », « long → longue », « public → publique » : féminins irréguliers à mémoriser.', '« beau → belle », « nouveau → nouvelle », « vieux → vieille », « fou → folle ».'],
    aRetenir: ['Règle de base : + e.', '-eur → -euse ; -teur → -trice ; -ien → -ienne.', 'Quelques féminins spéciaux : blanche, sèche, belle, vieille.'],
    exercice: {
      consigne: 'Mets au féminin.',
      items: [
        { question: 'un vendeur / un acteur', reponse: 'une vendeuse / une actrice.' },
        { question: 'un garçon doux et heureux', reponse: 'une fille douce et heureuse.' },
        { question: 'un mur blanc et sec', reponse: 'une clôture blanche et sèche.' },
        { question: 'le nouveau directeur', reponse: 'la nouvelle directrice.' },
      ],
    },
  }),
  o({
    id: 'o-accents-ponctuation',
    level: 'CE2 – CM2',
    title: 'Accents, cédille, apostrophe et ponctuation',
    objectif: 'Employer les accents (é, è, ê), la cédille, l’apostrophe et les signes de ponctuation.',
    regle: "L'accent aigu (é) donne un son fermé : « été, école » — on le met souvent sur un « e » final ou suivi d'une seule consonne prononcée. L'accent grave (è) donne un son ouvert : « père, fièvre » — fréquent devant une syllabe contenant un e muet. L'accent circonflexe (ê, î, û…) marque souvent une ancienne lettre « s » disparue (forêt = forest, hôpital, île). La CÉDILLE sous le ç conserve le son [s] devant a, o, u (garçon, commençons). L'APOSTROPHE marque l'élision devant une voyelle ou un h muet : « l'école, l'herbe, j'aime, qu'il ». Ponctuation : point, virgule (énumération, pause), deux-points (explication, parole rapportée), guillemets « … » et tiret — pour les dialogues, majuscule aux noms propres et en début de phrase.",
    exemples: [
      'L’élève lève la main : « Maîtresse, j’ai trouvé ! » — Apostrophes, deux-points, guillemets, virgule d’apostrophe (on interpelle).',
      'Le garçon traverse la forêt fraîche. — Cédille ; « forêt » (ancien « forest ») ; « fraîche ».',
      'Après la pluie, les escargots sortent. — Virgule après le complément placé en tête.',
    ],
    pieges: [
      'Jamais d’accent grave sur « a » sauf : à, là, déjà, voilà, çà… Retiens surtout « à » (préposition) et « là » (lieu).',
      'Pas de cédille devant e/i : « ceci, merci » (le c y fait déjà [s]).',
      'Devant un h aspiré, pas d’élision : « le haricot », « la honte » (on ne dit pas « l’haricot »).',
    ],
    aRetenir: ['é = fermé ; è = ouvert ; ê = souvent un ancien s.', 'ç devant a, o, u pour garder le son [s].', 'Apostrophe devant voyelle ou h muet.'],
    exercice: {
      consigne: 'Réécris correctement.',
      items: [
        { question: '« le garcon mange a lecole »', reponse: 'Le garçon mange à l’école.' },
        { question: '« pere et mere sont a lhopital »', reponse: 'Père et mère sont à l’hôpital.' },
        { question: '« merci maitresse dit ama » (dialogue)', reponse: '« Merci, maîtresse ! » dit Ama. (majuscules, virgule, guillemets)' },
      ],
    },
  }),
];

/* ================= QUIZ ================= */

export interface FrenchQuizQuestion {
  domain: FrenchDomain;
  question: string;
  choices: string[];
  answer: number;
  explication: string;
}

export const FRENCH_QUIZ: FrenchQuizQuestion[] = [
  { domain: 'grammaire', question: 'Dans « Les élèves de CM2 préparent la fête », le sujet est…', choices: ['la fête', 'Les élèves de CM2', 'préparent', 'CM2'], answer: 1, explication: 'Qui est-ce qui prépare ? « Les élèves de CM2 » — tout le groupe est sujet.' },
  { domain: 'grammaire', question: 'Quel mot est un nom propre ?', choices: ['la capitale', 'Porto-Novo', 'une ville', 'le fleuve'], answer: 1, explication: 'Porto-Novo désigne un lieu unique : majuscule.' },
  { domain: 'grammaire', question: 'Dans « Elle téléphone à sa tante », « à sa tante » est…', choices: ['un COD', 'un COI', 'un CC de lieu', 'un attribut'], answer: 1, explication: 'Téléphoner à qui ? → complément d’objet indirect.' },
  { domain: 'grammaire', question: '« Range ton ardoise ! » est une phrase…', choices: ['déclarative', 'interrogative', 'impérative', 'exclamative'], answer: 2, explication: 'Elle donne un ordre, sans sujet exprimé : impérative.' },
  { domain: 'grammaire', question: 'Le déterminant dans « cet arbre » est…', choices: ['possessif', 'démonstratif', 'indéfini', 'partitif'], answer: 1, explication: '« cet » montre : démonstratif (forme devant voyelle).' },
  { domain: 'grammaire', question: 'Combien de propositions dans « Quand la cloche sonne, les élèves se rangent » ?', choices: ['1', '2', '3', '0'], answer: 1, explication: 'Deux verbes conjugués (« sonne », « se rangent ») : deux propositions.' },
  { domain: 'grammaire', question: 'Dans « une robe de fête », « de fête » est…', choices: ['un adjectif', 'un complément du nom', 'un COI', 'un CC'], answer: 1, explication: 'Il enrichit le nom « robe » : complément du nom.' },
  { domain: 'grammaire', question: '« Vous faites » : la forme correcte de FAIRE au présent est…', choices: ['vous faisez', 'vous faites', 'vous faîtes', 'vous faisons'], answer: 1, explication: 'FAIRE et DIRE sont irréguliers à cette personne : faites / dites.' },
  { domain: 'conjugaison', question: '« Nous (manger) » au présent :', choices: ['nous mangons', 'nous mangeons', 'nous mangeont', 'nous mangez'], answer: 1, explication: 'Verbe en -ger : on garde le e après le g devant -ons.' },
  { domain: 'conjugaison', question: 'Le futur simple de « aller » à « nous » est…', choices: ['nous allerons', 'nous irons', 'nous allions', 'nous vasez'], answer: 1, explication: 'Radical irrégulier du futur d’ALLER : « ir- ».' },
  { domain: 'conjugaison', question: '« Autrefois, les anciens (raconter) des contes » : le temps attendu est…', choices: ['le futur', 'le présent', 'l’imparfait', 'le conditionnel'], answer: 2, explication: 'Habitude dans le passé → imparfait : « racontaient ».' },
  { domain: 'conjugaison', question: 'Le participe passé de « ouvrir » est…', choices: ['ouvri', 'ouvert', 'ouvru', 'ouvré'], answer: 1, explication: 'Participe irrégulier : OUVERT (comme offert, souffert).' },
  { domain: 'conjugaison', question: 'Avec quel auxiliaire conjugue-t-on « naître » au passé composé ?', choices: ['avoir', 'être', 'aller', 'faire'], answer: 1, explication: '« Elle est née » : auxiliaire être, accord avec le sujet.' },
  { domain: 'conjugaison', question: 'Au passé simple, « ils chantèrent » appartient…', choices: ['au 3ᵉ groupe', 'au 1ᵉʳ groupe', 'au 2ᵉ groupe', 'à aucun groupe'], answer: 1, explication: 'Terminaison -èrent typique du 1ᵉʳ groupe au passé simple.' },
  { domain: 'conjugaison', question: 'Phrase correcte :', choices: ['Si j’aurais le temps, je viendrais.', 'Si j’avais le temps, je viendrais.', 'Si j’aurai le temps, je viendrais.', 'Si j’ai le temps, je viendrais hier.'], answer: 1, explication: 'Si + imparfait → conditionnel. Jamais « si j’aurais ».' },
  { domain: 'conjugaison', question: 'L’impératif de « être » (vous) est…', choices: ['êtez', 'soyez', 'essez', 'serez'], answer: 1, explication: 'Impératif irrégulier : sois, soyons, soyez.' },
  { domain: 'orthographe', question: '« Il va … l’école » : on écrit…', choices: ['a', 'à', 'as', 'ah'], answer: 1, explication: 'Lieu → préposition « à ». Le test « avait » est impossible ici.' },
  { domain: 'orthographe', question: '« Les enfants … contents » :', choices: ['son', 'sont', 'sons', 'çon'], answer: 1, explication: 'Verbe être pluriel : remplaçable par « étaient ».' },
  { domain: 'orthographe', question: '« Je vais mang… » se termine par…', choices: ['-é', '-er', '-ez', '-ais'], answer: 1, explication: 'Après « aller », l’infinitif : test « je vais vendre » → manger.' },
  { domain: 'orthographe', question: 'Le pluriel de « un bijou » est…', choices: ['des bijous', 'des bijoux', 'des bijousx', 'des bijou'], answer: 1, explication: 'Bijou fait partie des 7 noms en -oux.' },
  { domain: 'orthographe', question: 'Le féminin de « blanc » est…', choices: ['blance', 'blanque', 'blanche', 'blancie'], answer: 2, explication: 'Féminin irrégulier à mémoriser : blanc → blanche.' },
  { domain: 'orthographe', question: '« Elles sont (partir) au marché » au passé composé :', choices: ['parti', 'partie', 'parties', 'partis'], answer: 2, explication: 'Auxiliaire être, sujet féminin pluriel : « parties ».' },
  { domain: 'orthographe', question: '« Tu préfères le riz … le maïs ? » :', choices: ['où', 'ou', 'hou', 'oo'], answer: 1, explication: 'Un choix : « ou » (ou bien). « Où » marque le lieu.' },
  { domain: 'orthographe', question: 'Dans « nous commençons », la cédille sert à…', choices: ['faire joli', 'garder le son [s] devant o', 'marquer le pluriel', 'remplacer un accent'], answer: 1, explication: 'Sans ç, « commencons » se lirait [k]. Le ç garde le son [s] devant a, o, u.' },
];

export function frenchLessonsByDomain(domain: FrenchDomain): FrenchLesson[] {
  return FRENCH_LESSONS.filter(l => l.domain === domain);
}

/** Texte complet d'une leçon, prêt à copier dans un cahier ou à partager. */
export function frenchLessonToText(lesson: FrenchLesson): string {
  const lines: string[] = [
    `${FRENCH_DOMAIN_LABELS[lesson.domain].label.toUpperCase()} — ${lesson.title}`,
    `Niveau : ${lesson.level}`,
    '',
    `🎯 Objectif : ${lesson.objectif}`,
    '',
    `📖 La règle : ${lesson.regle}`,
  ];
  if (lesson.astuce) lines.push('', `💡 Astuce : ${lesson.astuce}`);
  if (lesson.table) {
    lines.push('', '📋 Tableau :');
    lines.push(lesson.table.headers.join(' | '));
    lesson.table.rows.forEach(r => lines.push(r.join(' | ')));
  }
  lines.push('', '✏️ Exemples :');
  lesson.exemples.forEach(e => lines.push(`• ${e}`));
  lines.push('', '⚠️ Pièges à éviter :');
  lesson.pieges.forEach(p => lines.push(`• ${p}`));
  lines.push('', '✅ À retenir :');
  lesson.aRetenir.forEach(r => lines.push(`• ${r}`));
  lines.push('', `📝 Exercice : ${lesson.exercice.consigne}`);
  lesson.exercice.items.forEach((it, i) => lines.push(`${i + 1}. ${it.question}`));
  lines.push('', 'Corrigé :');
  lesson.exercice.items.forEach((it, i) => lines.push(`${i + 1}. ${it.reponse}`));
  lines.push('', '— Master Soutien Pédagogique · Grammaire, Conjugaison et Orthographe francophones');
  return lines.join('\n');
}
