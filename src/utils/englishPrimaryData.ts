/**
 * LES NOTIONS BASIQUES D'ANGLAIS POUR LE PRIMAIRE — v64.
 *
 * Douze unités bilingues pour initier les élèves du primaire (CI → CM2)
 * à l'anglais oral d'abord : salutations, alphabet, nombres, couleurs,
 * classe, corps, famille, animaux, marché, temps qu'il fait, routine et
 * politesse. Contextes béninois (marché, concession, animaux familiers).
 *
 * La « prononciation » est une AIDE écrite à la française (elle imite le
 * son pour un lecteur francophone) ; le bouton 🔊 de l'écran fait entendre
 * la vraie prononciation par la voix anglaise du téléphone.
 *
 * Chaque unité : objectif → vocabulaire → phrases clés → point de
 * grammaire simple → dialogue → activité de classe → exercice corrigé.
 */

export interface EnglishWord {
  en: string;
  fr: string;
  /** Prononciation guidée « à la française ». */
  pron: string;
  exempleEn?: string;
  exempleFr?: string;
}

export interface EnglishUnit {
  id: string;
  /** Titre anglais (affiché en grand) et titre français. */
  titleEn: string;
  titleFr: string;
  /** « CI – CP », « CE1 – CE2 », « CM1 – CM2 »… */
  level: string;
  emoji: string;
  objectifFr: string;
  vocabulaire: EnglishWord[];
  phrasesCles: { en: string; fr: string }[];
  grammaire?: { titreFr: string; regleFr: string; exemples: { en: string; fr: string }[] };
  dialogue?: { speaker: string; en: string; fr: string }[];
  activiteClasse: string;
  exercice: { consigneFr: string; items: { question: string; reponse: string }[] };
}

const w = (en: string, fr: string, pron: string, exempleEn?: string, exempleFr?: string): EnglishWord =>
  ({ en, fr, pron, exempleEn, exempleFr });

export const ENGLISH_UNITS: EnglishUnit[] = [
  {
    id: 'greetings',
    titleEn: 'Hello! Greetings and introductions',
    titleFr: 'Bonjour ! Saluer et se présenter',
    level: 'CI – CP',
    emoji: '👋',
    objectifFr: 'Saluer selon le moment de la journée, dire son nom, son âge et demander « Comment vas-tu ? ».',
    vocabulaire: [
      w('hello / hi', 'bonjour (salut)', 'hé-lo / haï', 'Hello, Awa!', 'Bonjour, Awa !'),
      w('good morning', 'bonjour (le matin)', 'goud mor-ning'),
      w('good afternoon', 'bonjour (l’après-midi)', 'goud af-teur-noune'),
      w('good evening', 'bonsoir', 'goud iv-ning'),
      w('goodbye / bye', 'au revoir', 'goud-baï / baï'),
      w('please', 's’il te/vous plaît', 'pliz'),
      w('thank you', 'merci', 'sank you (langue entre les dents)'),
      w('yes / no', 'oui / non', 'yès / no'),
      w('teacher', 'maître / maîtresse', 'ti-tcheur'),
      w('friend', 'ami(e), camarade', 'frennd'),
      w('boy / girl', 'garçon / fille', 'boï / gueurl'),
      w('name', 'nom, prénom', 'néïm', 'My name is Kodjo.', 'Je m’appelle Kodjo.'),
    ],
    phrasesCles: [
      { en: "What's your name?", fr: 'Comment t’appelles-tu ?' },
      { en: 'My name is Sènami.', fr: 'Je m’appelle Sènami.' },
      { en: 'How are you?', fr: 'Comment vas-tu ?' },
      { en: "I'm fine, thank you. And you?", fr: 'Je vais bien, merci. Et toi ?' },
      { en: 'How old are you? — I am eight years old.', fr: 'Quel âge as-tu ? — J’ai huit ans.' },
      { en: 'Nice to meet you!', fr: 'Enchanté(e) de te rencontrer !' },
    ],
    grammaire: {
      titreFr: 'Le verbe « to be » (être) au présent',
      regleFr: 'Pour se présenter, on utilise « to be » : I am (je suis), you are (tu es / vous êtes), he is (il est), she is (elle est), we are (nous sommes), they are (ils/elles sont). Attention : pour l’âge, l’anglais dit « I am eight » (je SUIS huit ans), jamais « I have eight ».',
      exemples: [
        { en: 'I am a pupil.', fr: 'Je suis un(e) élève.' },
        { en: 'She is my sister.', fr: 'Elle est ma sœur.' },
        { en: 'They are friends.', fr: 'Ils sont amis.' },
      ],
    },
    dialogue: [
      { speaker: 'Teacher', en: 'Good morning, children!', fr: 'Bonjour, les enfants !' },
      { speaker: 'Children', en: 'Good morning, teacher!', fr: 'Bonjour, maître/maîtresse !' },
      { speaker: 'Teacher', en: "What's your name?", fr: 'Comment t’appelles-tu ?' },
      { speaker: 'Afi', en: 'My name is Afi. I am seven years old.', fr: 'Je m’appelle Afi. J’ai sept ans.' },
      { speaker: 'Teacher', en: 'Nice to meet you, Afi. Sit down, please.', fr: 'Enchanté, Afi. Assieds-toi, s’il te plaît.' },
    ],
    activiteClasse: 'Chaîne des prénoms : chaque élève salue son voisin (« Hello! My name is… »), le voisin répond et se présente au suivant. Terminer par la chanson « Hello, hello, what’s your name? » en tapant des mains.',
    exercice: {
      consigneFr: 'Réponds en anglais.',
      items: [
        { question: 'Comment dit-on « bonsoir » ?', reponse: 'Good evening.' },
        { question: 'Traduis : « Je m’appelle Didier et j’ai neuf ans. »', reponse: 'My name is Didier and I am nine years old.' },
        { question: 'Que réponds-tu à « How are you? »', reponse: 'I’m fine, thank you. And you?' },
        { question: 'Corrige : « I have ten years. » (pour l’âge)', reponse: 'I am ten years old. (l’âge se dit avec « to be »)' },
      ],
    },
  },
  {
    id: 'alphabet',
    titleEn: 'The alphabet — A, B, C…',
    titleFr: 'L’alphabet anglais et épeler son nom',
    level: 'CI – CP',
    emoji: '🔤',
    objectifFr: 'Réciter l’alphabet anglais, reconnaître le son des lettres et épeler son prénom.',
    vocabulaire: [
      w('letter', 'une lettre', 'lè-teur'),
      w('alphabet', 'l’alphabet', 'al-fa-bèt'),
      w('to spell', 'épeler', 'tou spèl', 'Can you spell your name?', 'Peux-tu épeler ton prénom ?'),
      w('A [ei] · B [bi] · C [si] · D [di] · E [i]', 'les voyelles se disent autrement qu’en français !', 'éï, bi, si, di, i'),
      w('F [ef] · G [dji] · H [eïtch] · I [aï] · J [djéï]', 'attention : G se dit « dji », J se dit « djéï »', 'èf, dji, éïtch, aï, djéï'),
      w('K [kei] · L [el] · M [em] · N [en] · O [o]', '', 'kéï, èl, èm, èn, o'),
      w('P [pi] · Q [kiou] · R [ar] · S [es] · T [ti]', '', 'pi, kiou, ar, ès, ti'),
      w('U [you] · V [vi] · W [double-you] · X [eks] · Y [ouaï] · Z [zed/zi]', 'W se dit « double-you » (double U)', 'you, vi, dobeul-you, èks, ouaï, zèd'),
      w('vowel', 'une voyelle (a, e, i, o, u)', 'va-ou-èl'),
      w('capital letter', 'une lettre majuscule', 'ka-pi-tal lè-teur'),
      w('word', 'un mot', 'ouord', '« Cat » is a word.', '« Cat » est un mot.'),
      w('again, please', 'encore une fois, s’il te plaît', 'a-guèn, pliz'),
    ],
    phrasesCles: [
      { en: 'How do you spell it?', fr: 'Comment ça s’épelle ?' },
      { en: 'A-D-J-O-U-A: Adjoua!', fr: 'On épelle lettre par lettre.' },
      { en: 'It begins with the letter B.', fr: 'Ça commence par la lettre B.' },
      { en: 'Sing the ABC song!', fr: 'Chantez la chanson de l’alphabet !' },
    ],
    grammaire: {
      titreFr: '« A » ou « an » devant un nom',
      regleFr: '« Un/une » se dit « a » devant un son de consonne (a cat, a book) et « an » devant un son de voyelle (an orange, an egg, an apple). C’est le SON qui compte, pas la lettre.',
      exemples: [
        { en: 'a mango — an orange', fr: 'une mangue — une orange' },
        { en: 'an elephant — a goat', fr: 'un éléphant — une chèvre' },
      ],
    },
    activiteClasse: 'Chanter l’ABC en chœur, puis « épelle et devine » : un élève épelle un mot simple au tableau (C-A-T), la classe devine le mot et le mime.',
    exercice: {
      consigneFr: 'Épelle et choisis « a » ou « an ».',
      items: [
        { question: 'Épelle « dog » (chien).', reponse: 'D-O-G [di-o-dji].' },
        { question: '… apple / … banana', reponse: 'an apple / a banana.' },
        { question: 'Comment se dit la lettre « J » en anglais ?', reponse: '[djéï] — comme dans « jacket ».' },
        { question: '… egg / … fish', reponse: 'an egg / a fish.' },
      ],
    },
  },
  {
    id: 'numbers',
    titleEn: 'Numbers from 0 to 100',
    titleFr: 'Les nombres de 0 à 100',
    level: 'CE1 – CE2',
    emoji: '🔢',
    objectifFr: 'Compter jusqu’à 100, dire son âge, compter les objets et les élèves.',
    vocabulaire: [
      w('zero · one · two · three · four', 'zéro, un, deux, trois, quatre', 'zi-ro, ouann, tou, sri, for'),
      w('five · six · seven · eight · nine · ten', 'cinq, six, sept, huit, neuf, dix', 'faïv, siks, sè-veun, éït, naïn, tèn'),
      w('eleven · twelve · thirteen · fourteen · fifteen', 'onze, douze, treize, quatorze, quinze', 'i-lè-veun, touèlv, seur-tine, for-tine, fif-tine'),
      w('sixteen · seventeen · eighteen · nineteen · twenty', 'seize, dix-sept, dix-huit, dix-neuf, vingt', 'siks-tine, sè-veun-tine, éï-tine, naïn-tine, touèn-ti'),
      w('thirty · forty · fifty · sixty', 'trente, quarante, cinquante, soixante', 'seur-ti, for-ti, fif-ti, siks-ti'),
      w('seventy · eighty · ninety · one hundred', 'soixante-dix, quatre-vingts, quatre-vingt-dix, cent', 'sè-veun-ti, éï-ti, naïn-ti, ouann heun-drèd'),
      w('twenty-one, thirty-five…', 'vingt et un, trente-cinq (dizaine + unité avec un trait d’union)', 'touèn-ti-ouann, seur-ti-faïv'),
      w('to count', 'compter', 'tou kaounnt', "Let's count!", 'Comptons !'),
      w('number', 'un nombre, un numéro', 'neum-beur'),
      w('more / less', 'plus / moins', 'mor / lès'),
      w('plus / minus / equals', 'plus / moins / égale', 'pleus, maï-neus, i-kouolz', 'Two plus three equals five.', 'Deux plus trois égale cinq.'),
      w('first · second · third', 'premier, deuxième, troisième', 'feurst, sè-keund, seurd'),
    ],
    phrasesCles: [
      { en: 'How many pupils are there?', fr: 'Combien y a-t-il d’élèves ?' },
      { en: 'There are thirty pupils.', fr: 'Il y a trente élèves.' },
      { en: 'Count from one to twenty.', fr: 'Comptez de un à vingt.' },
      { en: 'I am the first!', fr: 'Je suis le premier !' },
    ],
    grammaire: {
      titreFr: '« How many…? » + « There is / There are »',
      regleFr: 'Pour demander une quantité : « How many + nom au pluriel…? » Pour dire « il y a » : « there is » devant un singulier (there is a book), « there are » devant un pluriel (there are five books). Le nom pluriel prend presque toujours un « s », qui S’ENTEND en anglais.',
      exemples: [
        { en: 'How many books are there? — There are six books.', fr: 'Combien y a-t-il de livres ? — Il y a six livres.' },
        { en: 'There is one teacher.', fr: 'Il y a un maître.' },
      ],
    },
    activiteClasse: 'Compter la classe en anglais : les filles, les garçons, puis compter par deux (2, 4, 6…) en sautant à la corde ou en frappant des mains sur chaque nombre.',
    exercice: {
      consigneFr: 'Écris en lettres anglaises et complète.',
      items: [
        { question: '7, 12, 20', reponse: 'seven, twelve, twenty.' },
        { question: '45 et 98', reponse: 'forty-five ; ninety-eight.' },
        { question: '« Il y a trois mangues. »', reponse: 'There are three mangoes.' },
        { question: 'Four plus six equals… ?', reponse: '…ten.' },
      ],
    },
  },
  {
    id: 'colours-shapes',
    titleEn: 'Colours and shapes',
    titleFr: 'Les couleurs, les formes et les tailles',
    level: 'CI – CP',
    emoji: '🎨',
    objectifFr: 'Nommer les couleurs et les formes simples, décrire un objet (couleur + taille).',
    vocabulaire: [
      w('red', 'rouge', 'rèd', 'The flag is red, yellow and green.', 'Le drapeau est rouge, jaune et vert.'),
      w('yellow', 'jaune', 'yé-lo'),
      w('green', 'vert', 'grine'),
      w('blue', 'bleu', 'blou'),
      w('white / black', 'blanc / noir', 'ouhaït / blak'),
      w('orange / purple / pink / brown / grey', 'orange, violet, rose, marron, gris', 'o-randj, peur-peul, pink, bra-oun, gréï'),
      w('colour', 'une couleur', 'ko-leur'),
      w('circle', 'un cercle', 'seur-keul'),
      w('square / rectangle', 'un carré / un rectangle', 'skouèr, rèk-tan-gueul'),
      w('triangle', 'un triangle', 'traï-an-gueul'),
      w('big / small', 'grand / petit', 'big / smol', 'a big house, a small house', 'une grande maison, une petite maison'),
      w('long / short', 'long / court', 'long / short'),
    ],
    phrasesCles: [
      { en: 'What colour is it? — It’s blue.', fr: 'De quelle couleur est-ce ? — C’est bleu.' },
      { en: 'My favourite colour is green.', fr: 'Ma couleur préférée est le vert.' },
      { en: 'The ball is round and red.', fr: 'Le ballon est rond et rouge.' },
      { en: 'Show me something yellow!', fr: 'Montrez-moi quelque chose de jaune !' },
    ],
    grammaire: {
      titreFr: 'L’adjectif se place AVANT le nom et ne change jamais',
      regleFr: 'En anglais, l’adjectif est toujours devant le nom et il est invariable : pas de féminin, pas de pluriel. « A red dress » (une robe rouge), « two red dresses » (deux robes rouges — seul le nom prend s).',
      exemples: [
        { en: 'a small goat — three small goats', fr: 'une petite chèvre — trois petites chèvres' },
        { en: 'The green door is big.', fr: 'La porte verte est grande.' },
      ],
    },
    activiteClasse: '« Touch something red! » : le maître nomme une couleur, les élèves touchent un objet de cette couleur dans la classe. Puis coloriage commandé à l’oral en anglais uniquement.',
    exercice: {
      consigneFr: 'Traduis en anglais (attention à la place de l’adjectif).',
      items: [
        { question: 'une banane jaune', reponse: 'a yellow banana.' },
        { question: 'deux grands arbres', reponse: 'two big trees (big ne prend pas de s).' },
        { question: 'De quelle couleur est le drapeau du Bénin ? (3 couleurs)', reponse: 'Green, yellow and red.' },
        { question: '« Le ballon est rouge. »', reponse: 'The ball is red.' },
      ],
    },
  },
  {
    id: 'classroom',
    titleEn: 'In the classroom',
    titleFr: 'Dans la classe : objets et consignes',
    level: 'CE1 – CE2',
    emoji: '🎒',
    objectifFr: 'Nommer le matériel scolaire et comprendre les consignes du maître en anglais.',
    vocabulaire: [
      w('book / exercise book', 'livre / cahier', 'bouk, èk-seur-saïz bouk'),
      w('pen / pencil', 'stylo / crayon', 'pèn, pèn-seul'),
      w('ruler / rubber (eraser)', 'règle / gomme', 'rou-leur, reu-beur'),
      w('school bag', 'cartable, sac d’école', 'skoul bag'),
      w('blackboard / chalk', 'tableau noir / craie', 'blak-bord, tcholk'),
      w('desk / chair', 'table-bureau / chaise', 'dèsk, tchèr'),
      w('door / window', 'porte / fenêtre', 'dor, ouinn-do'),
      w('slate', 'ardoise', 'sléït'),
      w('school', 'école', 'skoul', 'I go to school.', 'Je vais à l’école.'),
      w('lesson', 'leçon, cours', 'lè-seun'),
      w('to read / to write', 'lire / écrire', 'tou ride / tou raït'),
      w('to listen / to speak', 'écouter / parler', 'tou li-seun / tou spik'),
    ],
    phrasesCles: [
      { en: 'Stand up! Sit down!', fr: 'Levez-vous ! Asseyez-vous !' },
      { en: 'Open your books. Close your books.', fr: 'Ouvrez vos livres. Fermez vos livres.' },
      { en: 'Listen and repeat.', fr: 'Écoutez et répétez.' },
      { en: 'Be quiet, please!', fr: 'Silence, s’il vous plaît !' },
      { en: 'May I go out, please?', fr: 'Puis-je sortir, s’il vous plaît ?' },
      { en: 'I don’t understand. Can you repeat?', fr: 'Je ne comprends pas. Pouvez-vous répéter ?' },
    ],
    grammaire: {
      titreFr: 'Donner un ordre : l’impératif',
      regleFr: 'Pour donner un ordre ou une consigne, on utilise le verbe seul, sans sujet : « Open the door ». À la forme négative : « Don’t + verbe » (« Don’t run » = ne cours pas). Ajouter « please » rend la consigne polie.',
      exemples: [
        { en: 'Write your name, please.', fr: 'Écrivez votre nom, s’il vous plaît.' },
        { en: 'Don’t talk during the test.', fr: 'Ne parlez pas pendant le devoir.' },
      ],
    },
    activiteClasse: '« Simon says » (Jacques a dit) : « Simon says: stand up! » — on obéit seulement si « Simon says » précède la consigne. Excellent pour ancrer les consignes en bougeant.',
    exercice: {
      consigneFr: 'Traduis les consignes.',
      items: [
        { question: '« Ouvrez la fenêtre ! »', reponse: 'Open the window!' },
        { question: '« Ne cours pas ! »', reponse: 'Don’t run!' },
        { question: 'Que dis-tu si tu n’as pas compris ?', reponse: 'I don’t understand. Can you repeat, please?' },
        { question: '« Je vais à l’école. »', reponse: 'I go to school.' },
      ],
    },
  },
  {
    id: 'body',
    titleEn: 'My body and health',
    titleFr: 'Mon corps et la santé',
    level: 'CE1 – CE2',
    emoji: '🧍',
    objectifFr: 'Nommer les parties du corps et dire ce qu’il faut faire pour rester propre et en bonne santé.',
    vocabulaire: [
      w('head', 'tête', 'hèd'),
      w('hair / face', 'cheveux / visage', 'hèr, féïs'),
      w('eye / ear / nose / mouth', 'œil, oreille, nez, bouche', 'aï, ir, noz, ma-ouss'),
      w('tooth — teeth', 'dent — dents (pluriel irrégulier)', 'touss — tiss'),
      w('arm / hand / finger', 'bras, main, doigt', 'arm, hannd, finn-gueur'),
      w('leg / foot — feet', 'jambe, pied — pieds', 'lèg, fout — fit'),
      w('body', 'corps', 'bo-di'),
      w('to wash', 'laver', 'tou ouosh', 'Wash your hands!', 'Lave-toi les mains !'),
      w('soap / water', 'savon / eau', 'sop, ouo-teur'),
      w('clean / dirty', 'propre / sale', 'kline, deur-ti'),
      w('sick / healthy', 'malade / en bonne santé', 'sik, hèl-si'),
      w('doctor / nurse', 'médecin / infirmier(ère)', 'dok-teur, neurs'),
    ],
    phrasesCles: [
      { en: 'Touch your head! Touch your nose!', fr: 'Touche ta tête ! Touche ton nez !' },
      { en: 'I wash my hands with soap.', fr: 'Je me lave les mains avec du savon.' },
      { en: 'Brush your teeth morning and evening.', fr: 'Brosse-toi les dents matin et soir.' },
      { en: 'I’m sick. I have a headache.', fr: 'Je suis malade. J’ai mal à la tête.' },
    ],
    grammaire: {
      titreFr: 'Les possessifs : my, your, his, her…',
      regleFr: '« Mon/ma/mes » = MY pour tout ; « ton/ta/tes, votre/vos » = YOUR ; « son/sa/ses (à lui) » = HIS ; « son/sa/ses (à elle) » = HER ; « notre/nos » = OUR ; « leur/leurs » = THEIR. Le possessif dépend du POSSESSEUR, jamais du nom qui suit : « Kodjo and HIS sister », « Awa and HER brother ».',
      exemples: [
        { en: 'This is my hand. That is your book.', fr: 'Voici ma main. Voilà ton livre.' },
        { en: 'She washes her face.', fr: 'Elle se lave le visage (son visage à elle : HER).' },
      ],
    },
    activiteClasse: 'Chanson mimée « Head, shoulders, knees and toes » (tête, épaules, genoux et orteils), de plus en plus vite. Puis rituel hygiène en anglais avant la cantine : « Wash your hands! ».',
    exercice: {
      consigneFr: 'Complète et traduis.',
      items: [
        { question: 'I brush … teeth. (mes)', reponse: 'my teeth.' },
        { question: 'Afi lave ses mains (à elle) : Afi washes … hands.', reponse: 'her hands.' },
        { question: 'Le pluriel de « tooth » et « foot » ?', reponse: 'teeth ; feet.' },
        { question: '« J’ai mal à la tête. »', reponse: 'I have a headache.' },
      ],
    },
  },
  {
    id: 'family',
    titleEn: 'My family and my home',
    titleFr: 'Ma famille et ma maison',
    level: 'CE1 – CE2',
    emoji: '🏠',
    objectifFr: 'Présenter les membres de sa famille et décrire simplement sa maison.',
    vocabulaire: [
      w('father / mother', 'père / mère', 'fa-zer, mo-zer'),
      w('parents', 'parents (père et mère)', 'pè-reunts'),
      w('brother / sister', 'frère / sœur', 'bro-zer, sis-teur'),
      w('grandfather / grandmother', 'grand-père / grand-mère', 'grann-fa-zer, grann-mo-zer'),
      w('baby', 'bébé', 'béï-bi'),
      w('uncle / aunt / cousin', 'oncle / tante / cousin(e)', 'eun-keul, annt, keu-zeun'),
      w('family', 'famille', 'fa-mi-li'),
      w('house / home', 'maison / chez-soi', 'ha-ouss, hom'),
      w('room / kitchen / yard', 'chambre-pièce, cuisine, cour', 'roum, ki-tcheun, yard'),
      w('to love', 'aimer (beaucoup)', 'tou lov', 'I love my mother.', 'J’aime ma maman.'),
      w('tall / short (person)', 'grand / petit (de taille)', 'tol, short'),
      w('young / old', 'jeune / vieux, âgé', 'yang, old'),
    ],
    phrasesCles: [
      { en: 'This is my family.', fr: 'Voici ma famille.' },
      { en: 'I have two brothers and one sister.', fr: 'J’ai deux frères et une sœur.' },
      { en: 'My father is a farmer. My mother is a trader.', fr: 'Mon père est cultivateur. Ma mère est commerçante.' },
      { en: 'We live in Abomey-Calavi.', fr: 'Nous habitons à Abomey-Calavi.' },
    ],
    grammaire: {
      titreFr: '« I have » (j’ai) et les métiers avec « a/an »',
      regleFr: '« Avoir » se dit « to have » : I have, you have, he/she HAS (troisième personne : has). Pour les métiers, l’anglais met toujours « a/an » : « My father is A teacher » (jamais sans article, contrairement au français).',
      exemples: [
        { en: 'She has three children.', fr: 'Elle a trois enfants.' },
        { en: 'My uncle is a doctor.', fr: 'Mon oncle est médecin.' },
      ],
    },
    activiteClasse: 'Dessiner sa famille et la présenter en trois phrases : « This is my father. His name is… He is a… ». Afficher les dessins avec les phrases (family wall).',
    exercice: {
      consigneFr: 'Traduis et complète.',
      items: [
        { question: '« J’ai une sœur et deux frères. »', reponse: 'I have one sister and two brothers.' },
        { question: 'My mother … a shop at the market. (have → 3ᵉ pers.)', reponse: 'has.' },
        { question: 'Corrige : « My father is farmer. »', reponse: 'My father is A farmer.' },
        { question: '« Nous habitons à Parakou. »', reponse: 'We live in Parakou.' },
      ],
    },
  },
  {
    id: 'animals',
    titleEn: 'Animals around us',
    titleFr: 'Les animaux autour de nous',
    level: 'CE2 – CM1',
    emoji: '🐐',
    objectifFr: 'Nommer les animaux familiers et sauvages du Bénin et dire ce qu’ils savent faire.',
    vocabulaire: [
      w('dog / cat', 'chien / chat', 'dog, kat'),
      w('goat / sheep', 'chèvre (bouc) / mouton', 'got, ship'),
      w('hen / cock (rooster) / chick', 'poule, coq, poussin', 'hèn, kok, tchik'),
      w('duck', 'canard', 'deuk'),
      w('cow / pig', 'vache / porc, cochon', 'ka-o, pig'),
      w('horse / donkey', 'cheval / âne', 'hors, donn-ki'),
      w('fish', 'poisson', 'fich', 'Fish live in water.', 'Les poissons vivent dans l’eau.'),
      w('bird', 'oiseau', 'beurd'),
      w('monkey', 'singe', 'meunn-ki'),
      w('elephant / lion', 'éléphant / lion', 'é-lé-fant, laï-eun'),
      w('snake / crocodile', 'serpent / crocodile', 'snéïk, kro-ko-daïl'),
      w('to swim / to fly / to run / to jump', 'nager, voler, courir, sauter', 'souim, flaï, reun, djeump'),
    ],
    phrasesCles: [
      { en: 'A bird can fly.', fr: 'Un oiseau peut voler.' },
      { en: 'A fish can swim, but it can’t walk.', fr: 'Un poisson peut nager, mais il ne peut pas marcher.' },
      { en: 'The goat eats grass.', fr: 'La chèvre mange de l’herbe.' },
      { en: 'What’s your favourite animal?', fr: 'Quel est ton animal préféré ?' },
    ],
    grammaire: {
      titreFr: '« Can » : savoir/pouvoir faire quelque chose',
      regleFr: '« Can + verbe » = peut/sait : « I can swim » (je sais nager). Négatif : « can’t » (cannot) : « A hen can’t swim ». Question : « Can you climb? — Yes, I can / No, I can’t ». Après « can », le verbe reste à l’infinitif sans « to » et sans « s » à la 3ᵉ personne (« he can run »).',
      exemples: [
        { en: 'Monkeys can climb trees.', fr: 'Les singes savent grimper aux arbres.' },
        { en: 'Can a duck fly? Yes, it can.', fr: 'Un canard peut-il voler ? Oui.' },
      ],
    },
    activiteClasse: 'Mime et devine : un élève mime un animal, la classe demande « Can it swim? Can it fly? » jusqu’à trouver. Chaque bonne réponse se dit en phrase complète.',
    exercice: {
      consigneFr: 'Fais des phrases avec « can » ou « can’t ».',
      items: [
        { question: 'Un éléphant / grimper aux arbres', reponse: 'An elephant can’t climb trees.' },
        { question: 'Les oiseaux / voler', reponse: 'Birds can fly.' },
        { question: 'Corrige : « He can to run fast. »', reponse: 'He can run fast. (pas de « to » après can)' },
        { question: '« La chèvre mange de l’herbe. »', reponse: 'The goat eats grass.' },
      ],
    },
  },
  {
    id: 'market-food',
    titleEn: 'At the market: food and fruits',
    titleFr: 'Au marché : nourriture et fruits',
    level: 'CE2 – CM1',
    emoji: '🥭',
    objectifFr: 'Nommer les aliments et les fruits, demander un prix et acheter poliment.',
    vocabulaire: [
      w('market', 'marché', 'mar-kèt', 'We go to the market on Saturday.', 'Nous allons au marché le samedi.'),
      w('mango / pineapple', 'mangue / ananas', 'man-go, paï-na-peul'),
      w('banana / orange / papaya (pawpaw)', 'banane, orange, papaye', 'ba-na-na, o-randj, pa-pa-ya'),
      w('rice / maize (corn)', 'riz / maïs', 'raïs, méïz'),
      w('yam / cassava', 'igname / manioc', 'yam, ka-sa-va'),
      w('tomato / onion / pepper', 'tomate, oignon, piment-poivron', 'to-méï-to, eun-yeun, pè-peur'),
      w('fish / meat / egg', 'poisson, viande, œuf', 'fich, mit, èg'),
      w('bread / milk / water', 'pain, lait, eau', 'brèd, milk, ouo-teur'),
      w('to buy / to sell', 'acheter / vendre', 'tou baï, tou sèl'),
      w('money', 'argent', 'meu-ni'),
      w('expensive / cheap', 'cher / bon marché', 'èks-pènn-siv, tchip'),
      w('hungry / thirsty', 'avoir faim / avoir soif', 'hean-gri, seurs-ti', 'I’m hungry.', 'J’ai faim.'),
    ],
    phrasesCles: [
      { en: 'How much is it? — It’s two hundred francs.', fr: 'Combien ça coûte ? — Deux cents francs.' },
      { en: 'I’d like some mangoes, please.', fr: 'Je voudrais des mangues, s’il vous plaît.' },
      { en: 'It’s too expensive!', fr: 'C’est trop cher !' },
      { en: 'Thank you very much. Goodbye!', fr: 'Merci beaucoup. Au revoir !' },
    ],
    grammaire: {
      titreFr: 'Demander poliment : « I’d like… » et « some »',
      regleFr: '« I’d like » (= I would like) est plus poli que « I want ». Pour une quantité non comptée, on dit « some » : « some rice » (du riz), « some eggs » (des œufs). « How much…? » demande un prix ou une quantité non comptable ; « How many…? » compte des objets (voir l’unité Numbers).',
      exemples: [
        { en: 'I’d like some fish and three eggs, please.', fr: 'Je voudrais du poisson et trois œufs, s’il vous plaît.' },
        { en: 'How much is the pineapple?', fr: 'Combien coûte l’ananas ?' },
      ],
    },
    dialogue: [
      { speaker: 'Seller', en: 'Good morning! What would you like?', fr: 'Bonjour ! Que désirez-vous ?' },
      { speaker: 'Kossi', en: 'Good morning. I’d like four mangoes, please. How much is it?', fr: 'Bonjour. Je voudrais quatre mangues, s’il vous plaît. Combien ça coûte ?' },
      { speaker: 'Seller', en: 'Two hundred francs.', fr: 'Deux cents francs.' },
      { speaker: 'Kossi', en: 'Here you are. Thank you!', fr: 'Voici. Merci !' },
      { speaker: 'Seller', en: 'You’re welcome. Goodbye!', fr: 'Je vous en prie. Au revoir !' },
    ],
    activiteClasse: 'Jeu du marché : un étal fictif (dessins d’aliments étiquetés en francs), les élèves achètent en anglais avec de la fausse monnaie. On n’accepte que les phrases complètes et polies !',
    exercice: {
      consigneFr: 'Traduis comme au marché.',
      items: [
        { question: '« Combien coûte le poisson ? »', reponse: 'How much is the fish?' },
        { question: '« Je voudrais du riz, s’il vous plaît. »', reponse: 'I’d like some rice, please.' },
        { question: '« J’ai soif. »', reponse: 'I’m thirsty.' },
        { question: 'Réponds à « Thank you! »', reponse: 'You’re welcome!' },
      ],
    },
  },
  {
    id: 'days-weather',
    titleEn: 'Days, months, weather and time',
    titleFr: 'Les jours, les mois, le temps qu’il fait et l’heure',
    level: 'CM1 – CM2',
    emoji: '☀️',
    objectifFr: 'Dire le jour et le mois, parler de la météo et demander l’heure.',
    vocabulaire: [
      w('Monday · Tuesday · Wednesday · Thursday', 'lundi, mardi, mercredi, jeudi', 'meun-déï, tiouz-déï, ouènnz-déï, seurz-déï'),
      w('Friday · Saturday · Sunday', 'vendredi, samedi, dimanche', 'fraï-déï, sa-teur-déï, seun-déï'),
      w('January · February · March · April', 'janvier, février, mars, avril', 'dja-niou-ri, fè-briou-ri, martch, éï-preul'),
      w('May · June · July · August', 'mai, juin, juillet, août', 'méï, djoun, djou-laï, o-geust'),
      w('September · October · November · December', 'septembre, octobre, novembre, décembre', 'sèp-tèm-beur, ok-to-beur, no-vèm-beur, di-sèm-beur'),
      w('today / yesterday / tomorrow', 'aujourd’hui, hier, demain', 'tou-déï, yès-teur-déï, tou-mo-ro'),
      w('sunny / rainy / cloudy / windy', 'ensoleillé, pluvieux, nuageux, venté', 'seu-ni, réï-ni, kla-ou-di, ouinn-di'),
      w('hot / cold', 'chaud / froid', 'hot, kold'),
      w('rainy season / dry season', 'saison des pluies / saison sèche', 'réï-ni si-zeun, draï si-zeun'),
      w('clock / watch', 'horloge / montre', 'klok, ouotch'),
      w("o'clock", 'heure pile (« It’s seven o’clock »)', 'o-klok'),
      w('morning / afternoon / evening / night', 'matin, après-midi, soir, nuit', 'mor-ning, af-teur-noun, iv-ning, naït'),
    ],
    phrasesCles: [
      { en: 'What day is it today? — It’s Monday.', fr: 'Quel jour sommes-nous ? — Lundi.' },
      { en: 'What’s the weather like? — It’s sunny and hot.', fr: 'Quel temps fait-il ? — Il fait soleil et chaud.' },
      { en: 'What time is it? — It’s eight o’clock.', fr: 'Quelle heure est-il ? — Il est huit heures.' },
      { en: 'School starts in September.', fr: 'L’école commence en septembre.' },
    ],
    grammaire: {
      titreFr: '« On » pour les jours, « in » pour les mois',
      regleFr: 'Devant un jour de semaine : ON (on Friday = le vendredi / vendredi). Devant un mois ou une année : IN (in June, in 2026). Pour l’heure : AT (at seven o’clock). En anglais américain, on précise « a.m. » (matin) et « p.m. » (après-midi/soir).',
      exemples: [
        { en: 'We have English on Wednesday.', fr: 'Nous avons anglais le mercredi.' },
        { en: 'The holidays start in July. We get up at six o’clock.', fr: 'Les vacances commencent en juillet. Nous nous levons à six heures.' },
      ],
    },
    activiteClasse: 'Rituel du matin en anglais : un élève « météo » annonce chaque jour « Today is Thursday. It’s sunny. » au tableau, avec le calendrier de classe en anglais.',
    exercice: {
      consigneFr: 'Complète avec on / in / at et traduis.',
      items: [
        { question: '… Monday / … October / … nine o’clock', reponse: 'on Monday ; in October ; at nine o’clock.' },
        { question: '« Il fait pluvieux aujourd’hui. »', reponse: 'It’s rainy today.' },
        { question: '« Quelle heure est-il ? — Sept heures. »', reponse: 'What time is it? — It’s seven o’clock.' },
        { question: 'Le premier jour de la semaine de classe ?', reponse: 'Monday.' },
      ],
    },
  },
  {
    id: 'daily-routine',
    titleEn: 'My day: action verbs and daily routine',
    titleFr: 'Ma journée : les verbes d’action et la routine',
    level: 'CM1 – CM2',
    emoji: '⏰',
    objectifFr: 'Raconter sa journée au présent simple et conjuguer les personnes il/elle.',
    vocabulaire: [
      w('to wake up / to get up', 'se réveiller / se lever', 'tou ouéïk eup, tou guèt eup'),
      w('to wash (oneself)', 'se laver', 'tou ouosh'),
      w('to eat breakfast', 'prendre le petit déjeuner', 'tou it brèk-feust'),
      w('to go to school', 'aller à l’école', 'tou go tou skoul'),
      w('to study / to learn', 'étudier / apprendre', 'tou steu-di, tou leurn'),
      w('to play', 'jouer', 'tou pléï', 'We play football.', 'Nous jouons au football.'),
      w('to help', 'aider', 'tou hèlp', 'I help my mother.', 'J’aide ma mère.'),
      w('to fetch water', 'aller chercher de l’eau', 'tou fètch ouo-teur'),
      w('to do homework', 'faire les devoirs', 'tou dou hom-ouork'),
      w('to watch / to listen to the radio', 'regarder / écouter la radio', 'tou ouotch, tou li-seun tou ze réï-di-o'),
      w('to sleep / to go to bed', 'dormir / aller au lit', 'tou slip, tou go tou bèd'),
      w('every day', 'chaque jour', 'èv-ri déï'),
    ],
    phrasesCles: [
      { en: 'I get up at six o’clock.', fr: 'Je me lève à six heures.' },
      { en: 'Then I wash and eat breakfast.', fr: 'Ensuite je me lave et je prends le petit déjeuner.' },
      { en: 'In the evening, I do my homework.', fr: 'Le soir, je fais mes devoirs.' },
      { en: 'I go to bed at nine o’clock.', fr: 'Je vais au lit à neuf heures.' },
    ],
    grammaire: {
      titreFr: 'Le présent simple et le « s » de la 3ᵉ personne',
      regleFr: 'Au présent simple (habitudes), le verbe reste nu SAUF à la 3ᵉ personne du singulier (he/she/it) où l’on ajoute « s » (ou « es » après s, ch, sh, x, o : he watches, she goes). « I play » mais « He plays ». Mots-signaux : every day, always, often, usually. Pour enchaîner : first (d’abord), then (ensuite), after that (après cela), finally (enfin).',
      exemples: [
        { en: 'My sister gets up at five and fetches water.', fr: 'Ma sœur se lève à cinq heures et va chercher de l’eau.' },
        { en: 'First I pray, then I wash, finally I eat.', fr: 'D’abord je prie, ensuite je me lave, enfin je mange.' },
      ],
    },
    activiteClasse: 'Horloge de ma journée : chaque élève dessine 4 horloges avec une action et écrit la phrase (« At seven o’clock, I go to school »). Présentation orale par binômes.',
    exercice: {
      consigneFr: 'Mets le verbe à la bonne forme (présent simple).',
      items: [
        { question: 'My brother (play) football every Saturday.', reponse: 'plays (3ᵉ personne : + s).' },
        { question: 'We (study) English on Thursday.', reponse: 'study.' },
        { question: 'She (watch) TV in the evening.', reponse: 'watches (+ es après -ch).' },
        { question: '« Je fais mes devoirs le soir. »', reponse: 'I do my homework in the evening.' },
      ],
    },
  },
  {
    id: 'questions-politeness',
    titleEn: 'Asking questions and being polite',
    titleFr: 'Poser des questions et être poli',
    level: 'CM1 – CM2',
    emoji: '❓',
    objectifFr: 'Poser les questions essentielles (who, what, where…) et demander poliment.',
    vocabulaire: [
      w('who?', 'qui ?', 'hou', 'Who is it?', 'Qui est-ce ?'),
      w('what?', 'quoi ? qu’est-ce que… ?', 'ouot'),
      w('where?', 'où ?', 'ouèr'),
      w('when?', 'quand ?', 'ouènn'),
      w('why? — because…', 'pourquoi ? — parce que…', 'ouaï — bi-koz'),
      w('how?', 'comment ?', 'ha-o'),
      w('how many? / how much?', 'combien (à compter) / combien (prix, quantité) ?', 'ha-o mè-ni, ha-o meutch'),
      w('excuse me', 'excusez-moi', 'èks-kiouz mi'),
      w('sorry', 'pardon, désolé', 'so-ri'),
      w('of course', 'bien sûr', 'ov kors'),
      w('welcome / you’re welcome', 'bienvenue / je vous en prie', 'ouèl-keum, your ouèl-keum'),
      w('well done!', 'bravo, félicitations !', 'ouèll deunn'),
    ],
    phrasesCles: [
      { en: 'Where do you live? — I live in Porto-Novo.', fr: 'Où habites-tu ? — J’habite à Porto-Novo.' },
      { en: 'Can I borrow your pen, please? — Yes, of course.', fr: 'Puis-je emprunter ton stylo ? — Oui, bien sûr.' },
      { en: 'Why are you late? — Because the car was late.', fr: 'Pourquoi es-tu en retard ? — Parce que le car était en retard.' },
      { en: 'Excuse me, where is the office?', fr: 'Excusez-moi, où est le bureau ?' },
    ],
    grammaire: {
      titreFr: 'Former une question : mot interrogatif + do/does',
      regleFr: 'Question fermée (réponse oui/non) : « Do you like English? » (DO devant le sujet ; DOES avec he/she : « Does he play? »). Question ouverte : mot interrogatif + do/does + sujet + verbe (« Where do you live? »). Avec « to be », pas de do : « Where is the school? », « Are you ready? ». Réponses courtes : « Yes, I do / No, I don’t », « Yes, I am ».',
      exemples: [
        { en: 'Do you speak English? — Yes, a little!', fr: 'Parles-tu anglais ? — Oui, un peu !' },
        { en: 'What does your father do? — He’s a teacher.', fr: 'Que fait ton père ? — Il est enseignant.' },
      ],
    },
    dialogue: [
      { speaker: 'Pupil', en: 'Excuse me, teacher. Can I ask a question?', fr: 'Excusez-moi, maîtresse. Puis-je poser une question ?' },
      { speaker: 'Teacher', en: 'Of course. What is it?', fr: 'Bien sûr. Laquelle ?' },
      { speaker: 'Pupil', en: 'How do you say « ardoise » in English?', fr: 'Comment dit-on « ardoise » en anglais ?' },
      { speaker: 'Teacher', en: '« Slate ». Well done!', fr: '« Slate ». Bravo !' },
    ],
    activiteClasse: 'Interview croisée : en binômes, poser 5 questions apprises (name, age, where, favourite colour/animal) et présenter son camarade : « His name is… He lives in… ».',
    exercice: {
      consigneFr: 'Forme les questions.',
      items: [
        { question: '« Où habite-t-elle ? »', reponse: 'Where does she live?' },
        { question: '« Aimes-tu les mangues ? »', reponse: 'Do you like mangoes?' },
        { question: '« Comment dit-on « merci » en anglais ? »', reponse: 'How do you say « merci » in English? — Thank you.' },
        { question: 'Réponds : « Are you ready? » (oui)', reponse: 'Yes, I am.' },
      ],
    },
  },
];

export interface EnglishQuizQuestion {
  questionFr: string;
  choices: string[];
  answer: number;
  explicationFr: string;
}

export const ENGLISH_QUIZ: EnglishQuizQuestion[] = [
  { questionFr: 'Comment dit-on « bonsoir » ?', choices: ['Good night (déjà au lit)', 'Good evening', 'Good afternoon', 'Hello night'], answer: 1, explicationFr: 'En arrivant le soir : « Good evening ». « Good night » se dit en partant se coucher.' },
  { questionFr: '« Je m’appelle Awa » se dit…', choices: ['I appelle Awa', 'My name is Awa', 'I has name Awa', 'Me Awa'], answer: 1, explicationFr: '« My name is… » + prénom.' },
  { questionFr: 'Quel âge as-tu ? → « I … ten years old »', choices: ['have', 'am', 'has', 'do'], answer: 1, explicationFr: 'L’âge se dit avec « to be » : I am ten years old.' },
  { questionFr: 'La lettre « J » se prononce…', choices: ['[ji]', '[djéï]', '[yé]', '[je]'], answer: 1, explicationFr: 'J = [djéï] ; G = [dji].' },
  { questionFr: '« … egg » : a ou an ?', choices: ['a egg', 'an egg', 'the egg only', 'one egg à éviter'], answer: 1, explicationFr: 'Son de voyelle au début → « an ».' },
  { questionFr: '« Vingt-cinq » en anglais :', choices: ['twenty-fifth', 'five-twenty', 'twenty-five', 'two-five'], answer: 2, explicationFr: 'Dizaine + trait d’union + unité : twenty-five.' },
  { questionFr: '« Il y a six livres » :', choices: ['There is six books', 'There are six books', 'It has six books', 'There am six books'], answer: 1, explicationFr: 'Pluriel → « there are ».' },
  { questionFr: 'Traduis « une robe rouge » :', choices: ['a dress red', 'a red dress', 'red a dress', 'a reds dress'], answer: 1, explicationFr: 'L’adjectif est toujours AVANT le nom.' },
  { questionFr: '« Deux robes rouges » : que prend un « s » ?', choices: ['red → reds', 'dress → dresses', 'les deux', 'aucun'], answer: 1, explicationFr: 'Seul le nom prend le s : « two red dresses ».' },
  { questionFr: 'Commande du maître : « Asseyez-vous ! »', choices: ['Sit down!', 'Stand up!', 'Be quiet!', 'Come here!'], answer: 0, explicationFr: '« Sit down » = assois-toi/asseyez-vous.' },
  { questionFr: '« Je ne comprends pas » :', choices: ['I don’t understand', 'I no understand', 'I not comprend', 'No understand me'], answer: 0, explicationFr: 'Négation avec « don’t » au présent.' },
  { questionFr: 'Le pluriel de « tooth » est…', choices: ['tooths', 'teeth', 'toothes', 'teeths'], answer: 1, explicationFr: 'Pluriel irrégulier, comme foot → feet.' },
  { questionFr: '« Lave-toi les mains ! »', choices: ['Wash your hands!', 'Wash you hands!', 'Wash his hands!', 'Wash your hand!'], answer: 0, explicationFr: 'Consigne + possessif « your ».' },
  { questionFr: '« Ma sœur (à elle) » : « … sister » (en parlant d’Afi)', choices: ['his', 'her', 'your', 'its'], answer: 1, explicationFr: 'Possesseur féminin → HER.' },
  { questionFr: '« Mon père est médecin » : phrase correcte…', choices: ['My father is doctor', 'My father is a doctor', 'My father doctor is', 'My father has doctor'], answer: 1, explicationFr: 'Les métiers prennent toujours « a/an ».' },
  { questionFr: 'Un poisson peut nager : « A fish … swim »', choices: ['can', 'cans', 'to can', 'is can'], answer: 0, explicationFr: 'Après « can », verbe nu, jamais de s ni de « to ».' },
  { questionFr: '« Combien coûte l’ananas ? »', choices: ['How many is the pineapple?', 'How much is the pineapple?', 'What price pineapple?', 'How is the pineapple?'], answer: 1, explicationFr: 'Pour un prix : « How much ».' },
  { questionFr: 'La demande la plus polie au marché :', choices: ['I want rice!', 'Give me rice!', 'I’d like some rice, please.', 'Rice, now!'], answer: 2, explicationFr: '« I’d like… please » : poli et correct.' },
  { questionFr: '« Le mercredi » se dit « … Wednesday »', choices: ['in', 'at', 'on', 'to'], answer: 2, explicationFr: 'ON + jour ; IN + mois ; AT + heure.' },
  { questionFr: '« Quelle heure est-il ? — Huit heures »', choices: ['It’s eight hours', 'It’s eight o’clock', 'It has eight', 'Time is eight'], answer: 1, explicationFr: '« It’s … o’clock » pour les heures piles.' },
  { questionFr: '« Ma sœur se lève à 5 h » : « She … at five »', choices: ['get up', 'gets up', 'getting up', 'get ups'], answer: 1, explicationFr: '3ᵉ personne du présent simple : le verbe prend « s ».' },
  { questionFr: '« Où habites-tu ? »', choices: ['Where you live?', 'Where do you live?', 'Where does you live?', 'Live where you?'], answer: 1, explicationFr: 'Mot interrogatif + DO + sujet + verbe.' },
  { questionFr: 'Réponse courte à « Do you like English? » (oui)', choices: ['Yes, I like', 'Yes, I do', 'Yes, I am do', 'Yes, do I'], answer: 1, explicationFr: 'La réponse courte reprend l’auxiliaire : « Yes, I do ».' },
  { questionFr: 'On te dit « Thank you! », tu réponds…', choices: ['Please', 'Sorry', 'You’re welcome', 'Goodbye'], answer: 2, explicationFr: '« You’re welcome » = je t’en prie / de rien.' },
];

/** Nombre total de mots de vocabulaire du référentiel. */
export function totalEnglishWords(): number {
  return ENGLISH_UNITS.reduce((n, u) => n + u.vocabulaire.length, 0);
}

/** Texte complet d'une unité, prêt à copier/partager. */
export function englishUnitToText(unit: EnglishUnit): string {
  const lines: string[] = [
    `${unit.emoji} ${unit.titleEn}`,
    `${unit.titleFr} — Niveau : ${unit.level}`,
    '',
    `🎯 Objectif : ${unit.objectifFr}`,
    '',
    '📚 Vocabulaire (anglais — français — prononciation) :',
  ];
  unit.vocabulaire.forEach(v => lines.push(`• ${v.en} = ${v.fr} [${v.pron}]`));
  lines.push('', '💬 Phrases clés :');
  unit.phrasesCles.forEach(p => lines.push(`• ${p.en} → ${p.fr}`));
  if (unit.grammaire) {
    lines.push('', `📖 ${unit.grammaire.titreFr} : ${unit.grammaire.regleFr}`);
    unit.grammaire.exemples.forEach(e => lines.push(`  - ${e.en} (${e.fr})`));
  }
  if (unit.dialogue) {
    lines.push('', '🎭 Dialogue :');
    unit.dialogue.forEach(d => lines.push(`${d.speaker}: ${d.en} (${d.fr})`));
  }
  lines.push('', `🎲 Activité de classe : ${unit.activiteClasse}`);
  lines.push('', `📝 Exercice : ${unit.exercice.consigneFr}`);
  unit.exercice.items.forEach((it, i) => lines.push(`${i + 1}. ${it.question}`));
  lines.push('', 'Corrigé :');
  unit.exercice.items.forEach((it, i) => lines.push(`${i + 1}. ${it.reponse}`));
  lines.push('', '— Master Soutien Pédagogique · Les notions basiques d’anglais pour le Primaire');
  return lines.join('\n');
}
