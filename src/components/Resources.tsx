import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronLeft, BookOpen, PlayCircle, Megaphone, Store,
  Search, MapPin, Calendar, Briefcase, Phone, Tag, MessageCircle
} from 'lucide-react';
import { openWhatsApp, WHATSAPP_DISPLAY } from '../utils/contact';
import ResourceFiles from './ResourceFiles';
import { ClassData, getAllClasses } from '../utils/database';
import { PRIMARY_PROGRAMMES } from '../utils/programmeData';

// En-tête réutilisable
function PageHeader({ title, subtitle, color }: { title: string; subtitle: string; color: string }) {
  const goBack = useSmartBack();
  return (
    <header className={`${color} text-white p-4 sticky top-0 z-10 shadow`}>
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-white/80 text-sm">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

/* ============ PROGRAMMES D'ÉTUDES PAR CLASSE ============ */

export function ProgrammesScreen() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [level, setLevel] = useState('CI');
  const [openDiscipline, setOpenDiscipline] = useState('');

  useEffect(() => {
    getAllClasses().then(data => setClasses([...data].sort((a, b) => a.name.localeCompare(b.name))));
  }, []);

  const programme = PRIMARY_PROGRAMMES.find(p => p.level === level) || PRIMARY_PROGRAMMES[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Programmes d'études" subtitle="Documents officiels par classe" color="bg-emerald-600" />
      <main className="p-4 pb-24">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-blue-800 text-sm">
            Consultez les notions ou objets d’apprentissage par classe et discipline. Les administrateurs peuvent aussi ajouter le PDF/DOC officiel de chaque classe.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {PRIMARY_PROGRAMMES.map(item => (
            <button key={item.level} onClick={() => { setLevel(item.level); setOpenDiscipline(''); }} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${level === item.level ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>{item.level}</button>
          ))}
        </div>

        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="font-black text-gray-900">{programme.label}</h2>
          <p className="text-gray-500 text-sm mt-1">{programme.note}</p>
          <div className="space-y-2 mt-4">
            {programme.disciplines.map(discipline => (
              <div key={discipline.name} className="border rounded-xl overflow-hidden">
                <button onClick={() => setOpenDiscipline(openDiscipline === discipline.name ? '' : discipline.name)} className="w-full p-3 bg-emerald-50 text-left font-bold text-emerald-800 flex justify-between">
                  <span>{discipline.name}</span>
                  <span>{discipline.notions.length}</span>
                </button>
                {openDiscipline === discipline.name && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {discipline.notions.map((notion, index) => <div key={`${notion}-${index}`} className="bg-gray-50 rounded-lg p-2 text-sm text-gray-700">{index + 1}. {notion}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
            Créez d'abord une classe pour ajouter son programme d'études.
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map(classData => (
              <Link key={classData.id} to={`/class/${classData.id}/programme`} className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-800">{classData.name}</h3>
                  <p className="text-gray-500 text-sm">{classData.school} • {classData.level}{classData.serie ? ` ${classData.serie}` : ''}</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold">Programme</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ============ VIDÉOS D'ACCOMPAGNEMENT ============ */

interface VideoItem {
  title: string;
  category: string;
  duration: string;
  query: string; // recherche YouTube
  youtubeId: string;
}

const VIDEOS: VideoItem[] = [
  { title: 'Apprendre à lire (méthode syllabique)', category: 'Lecture', duration: '12 min', query: 'apprendre à lire méthode syllabique CP', youtubeId: 'VeSUzYblKio' },
  { title: 'Les tables de multiplication en chansons', category: 'Maths', duration: '8 min', query: 'tables de multiplication chanson enfants', youtubeId: '4O8X7xG6dpA' },
  { title: 'La dictée sans fautes : astuces', category: 'Dictée', duration: '10 min', query: 'astuces dictée sans fautes primaire', youtubeId: 'OZVmsKY9sGM' },
  { title: 'Enseigner l\'addition et la soustraction', category: 'Maths', duration: '15 min', query: 'enseigner addition soustraction CE1', youtubeId: 'wyVLadMVq6M' },
  { title: 'Production d\'écrits au primaire', category: 'Expression écrite', duration: '14 min', query: 'production écrit primaire méthode', youtubeId: 'bG-W6EXgx6E' },
  { title: 'Gestion de classe : techniques efficaces', category: 'Pédagogie', duration: '18 min', query: 'gestion de classe primaire techniques', youtubeId: 'omvKzAAssTk' },
  { title: 'Approche Par Compétences (APC) expliquée', category: 'Pédagogie', duration: '20 min', query: 'approche par compétences APC Bénin école', youtubeId: 'KCGamQMZ7Nk' },
  { title: 'Éveil scientifique : expériences simples', category: 'Sciences', duration: '11 min', query: 'expériences scientifiques simples école primaire', youtubeId: 'tZ4lCI6Pyoo' },
];

const VIDEO_CATEGORIES = ['Toutes', 'Lecture', 'Maths', 'Dictée', 'Expression écrite', 'Sciences', 'Pédagogie'];

export function VideosScreen() {
  const [category, setCategory] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);

  function openVideoInApp(video: VideoItem) {
    if (!navigator.onLine) {
      alert('Connexion internet requise pour lire les vidéos de cours.');
      return;
    }
    setPlayingVideo(video);
  }

  const filtered = VIDEOS.filter(v => {
    const matchCat = category === 'Toutes' || v.category === category;
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catColors: Record<string, string> = {
    Lecture: 'bg-blue-100 text-blue-700',
    Maths: 'bg-emerald-100 text-emerald-700',
    Dictée: 'bg-amber-100 text-amber-700',
    'Expression écrite': 'bg-purple-100 text-purple-700',
    Sciences: 'bg-teal-100 text-teal-700',
    Pédagogie: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Vidéos des cours" subtitle="Accompagnement pédagogique" color="bg-red-600" />
      <main className="p-4 pb-24">
        {/* Recherche */}
        <div className="relative mb-3">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vidéo..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Catégories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                category === cat ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((video, i) => (
            <button
              key={i}
              onClick={() => openVideoInApp(video)}
              className="bg-white rounded-xl shadow p-3 flex items-center gap-3"
            >
              <div className="bg-red-100 w-16 h-16 rounded-lg flex items-center justify-center shrink-0">
                <PlayCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{video.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${catColors[video.category] || 'bg-gray-100 text-gray-600'}`}>
                    {video.category}
                  </span>
                  <span className="text-gray-400 text-xs">{video.duration}</span>
                </div>
              </div>
              <PlayCircle className="w-5 h-5 text-red-500 shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucune vidéo trouvée</p>
          )}
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm">
            📺 Les vidéos se lisent dans l'application via YouTube intégré. Une connexion internet est nécessaire.
          </p>
        </div>

        {playingVideo && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl">
              <div className="p-3 flex items-center justify-between border-b">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{playingVideo.title}</p>
                  <p className="text-gray-500 text-xs">Lecture YouTube intégrée - connexion internet requise</p>
                </div>
                <button onClick={() => setPlayingVideo(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5 rotate-90" />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${playingVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={playingVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="p-3 bg-amber-50 text-amber-800 text-xs">
                Si la vidéo ne s'affiche pas, vérifiez votre connexion internet ou ajoutez un lien YouTube précis dans « Ressources ajoutées ».
              </div>
            </div>
          </div>
        )}

        <ResourceFiles category="videos" accent="red" />
      </main>
    </div>
  );
}

/* ============ ANNONCES / RECRUTEMENT ============ */

interface Annonce {
  title: string;
  type: 'Recrutement' | 'Formation' | 'Concours' | 'Information';
  org: string;
  location: string;
  date: string;
  description: string;
}

const ANNONCES: Annonce[] = [
  {
    title: 'Recrutement d\'enseignants contractuels',
    type: 'Recrutement',
    org: 'Ministère des Enseignements Maternel et Primaire',
    location: 'National',
    date: 'Ouvert',
    description: 'Appel à candidatures pour les aspirants au métier d\'enseignant (AME). Consultez le portail officiel pour les conditions et le dépôt de dossier.',
  },
  {
    title: 'Formation continue APC',
    type: 'Formation',
    org: 'Direction de la Formation',
    location: 'Chefs-lieux de département',
    date: 'Session en cours',
    description: 'Renforcement des capacités sur l\'approche par compétences et l\'évaluation. Inscrivez-vous auprès de votre circonscription scolaire.',
  },
  {
    title: 'Concours d\'entrée aux Écoles Normales (ENI)',
    type: 'Concours',
    org: 'Fonction Publique',
    location: 'National',
    date: 'À venir',
    description: 'Concours de recrutement pour la formation d\'instituteurs. Préparez-vous dès maintenant. Détails sur les plateformes officielles.',
  },
  {
    title: 'Aide pédagogique numérique',
    type: 'Information',
    org: 'Partenaires éducatifs',
    location: 'En ligne',
    date: 'Permanent',
    description: 'Ressources gratuites, manuels numériques et outils pour la classe. Rejoignez les groupes d\'échange entre enseignants.',
  },
];

export function AnnoncesScreen() {
  const typeColors: Record<string, string> = {
    Recrutement: 'bg-emerald-100 text-emerald-700',
    Formation: 'bg-blue-100 text-blue-700',
    Concours: 'bg-amber-100 text-amber-700',
    Information: 'bg-purple-100 text-purple-700',
  };
  const typeIcons: Record<string, typeof Briefcase> = {
    Recrutement: Briefcase,
    Formation: BookOpen,
    Concours: Megaphone,
    Information: Tag,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Annonces & Recrutement" subtitle="Offres et opportunités" color="bg-amber-500" />
      <main className="p-4 pb-24">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-amber-800 text-sm">
            📢 Opportunités pour les enseignants du Bénin. Vérifiez toujours les informations
            auprès des sources officielles avant toute démarche.
          </p>
        </div>

        <div className="space-y-3">
          {ANNONCES.map((annonce, i) => {
            const Icon = typeIcons[annonce.type] || Megaphone;
            return (
              <div key={i} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                    <Icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[annonce.type]}`}>
                        {annonce.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800">{annonce.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{annonce.org}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {annonce.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {annonce.date}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">{annonce.description}</p>
                    <button
                      onClick={() => openWhatsApp(`Bonjour, je suis intéressé(e) par l'annonce : "${annonce.title}". Pouvez-vous m'en dire plus ?`)}
                      className="mt-3 bg-green-600 text-white text-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      En savoir plus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800 text-sm font-medium mb-2">
            Vous avez une annonce ou un recrutement à publier ?
          </p>
          <button
            onClick={() => openWhatsApp('Bonjour, je souhaite publier une annonce/recrutement.')}
            className="bg-green-600 text-white text-sm px-5 py-2.5 rounded-lg inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Publier via WhatsApp ({WHATSAPP_DISPLAY})
          </button>
        </div>

        <ResourceFiles category="annonces" accent="amber" />
      </main>
    </div>
  );
}

/* ============ PUBLICITÉS / ESPACE PARTENAIRES ============ */

interface Pub {
  title: string;
  category: string;
  emoji: string;
  offer: string;
  contact: string;
  gradient: string;
}

const PUBS: Pub[] = [
  {
    title: 'Librairie Scolaire du Bénin',
    category: 'Fournitures',
    emoji: '📚',
    offer: 'Manuels, cahiers et matériel didactique à prix réduits pour les enseignants.',
    contact: 'Contactez votre libraire local',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    title: 'Impression & Reprographie',
    category: 'Services',
    emoji: '🖨️',
    offer: 'Photocopies, plastification et reliure de vos supports pédagogiques.',
    contact: 'Services de proximité',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    title: 'Matériel Pédagogique',
    category: 'Éducation',
    emoji: '🧮',
    offer: 'Ardoises, abaques, cartes murales et jeux éducatifs pour votre classe.',
    contact: 'Distributeurs agréés',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Formation Informatique',
    category: 'Formation',
    emoji: '💻',
    offer: 'Apprenez Excel, Word et les outils numériques. Cours adaptés aux enseignants.',
    contact: 'Centres de formation',
    gradient: 'from-purple-500 to-fuchsia-600',
  },
];

export function PublicitesScreen() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Publicités" subtitle="Espace partenaires" color="bg-blue-600" />
      <main className="p-4 pb-24">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <p className="text-blue-800 text-sm">
            🤝 Des partenaires au service des enseignants. Ces espaces sont informatifs.
          </p>
        </div>

        <div className="space-y-4">
          {PUBS.map((pub, i) => (
            <div key={i} className="bg-white rounded-xl shadow overflow-hidden">
              <div className={`bg-gradient-to-r ${pub.gradient} p-5 text-white`}>
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{pub.emoji}</span>
                  <span className="bg-white/20 text-xs px-2 py-1 rounded font-medium">
                    {pub.category}
                  </span>
                </div>
                <h3 className="font-bold text-lg mt-2">{pub.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-3">{pub.offer}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Phone className="w-4 h-4" />
                    {pub.contact}
                  </div>
                  <button
                    onClick={() => openWhatsApp(`Bonjour, je suis intéressé(e) par : "${pub.title}".`)}
                    className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Contacter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-gray-100 rounded-xl p-4 text-center">
          <Store className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm font-medium">Vous êtes un partenaire ?</p>
          <p className="text-gray-500 text-xs mb-3">
            Contactez-nous pour présenter vos produits et services aux enseignants du Bénin.
          </p>
          <button
            onClick={() => openWhatsApp('Bonjour, je souhaite présenter mes produits/services dans l\'espace partenaires.')}
            className="bg-green-600 text-white text-sm px-5 py-2.5 rounded-lg inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Devenir partenaire ({WHATSAPP_DISPLAY})
          </button>
        </div>

        <ResourceFiles category="publicites" accent="blue" />
      </main>
    </div>
  );
}
