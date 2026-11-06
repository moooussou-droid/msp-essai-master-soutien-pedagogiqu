import { useEffect, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import {
  ChevronDown, ChevronLeft, MessageCircle, HelpCircle, Send, Lightbulb, Bug, Phone, ClipboardList,
} from 'lucide-react';
import { openWhatsApp, WHATSAPP_DISPLAY } from '../utils/contact';
import { isCloudConfigured } from '../utils/cloudConfig';
import { getLastSyncInfo } from '../utils/cloudSync';
import { getAllClasses } from '../utils/database';
import { localDateKey } from '../utils/schoolStats';

interface SupportAction {
  icon: typeof HelpCircle;
  color: string;
  title: string;
  desc: string;
  message: string;
  withDiagnostic?: boolean;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment sauvegarder mes données ?',
    a: 'Dans Réglages, utilisez « Sauvegarde JSON » ou « Sauvegarde ZIP » : le fichier est enregistré sur votre appareil ou partagé. Pour une sauvegarde en ligne, utilisez l’écran Cloud avec un code de synchronisation et un mot de passe secret.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. La sauvegarde cloud est chiffrée sur votre téléphone avant l’envoi (AES-256) : personne d’autre que vous ne peut lire les notes de vos élèves. La sauvegarde locale reste sur votre appareil.',
  },
  {
    q: 'J’ai oublié mon mot de passe secret (cloud). Que faire ?',
    a: 'Par sécurité, il ne peut pas être réinitialisé : les données chiffrées deviennent irrécupérables. Utilisez plutôt une sauvegarde locale (JSON/ZIP) en complément, et notez votre mot de passe en lieu sûr.',
  },
  {
    q: 'Comment récupérer mes données sur un autre téléphone ?',
    a: 'Installé l’application, ouvrez l’écran Cloud, entrez le même code de synchronisation et le même mot de passe secret, puis appuyez sur « Récupérer depuis le cloud ».',
  },
  {
    q: 'Les bulletins sont-ils au format officiel ?',
    a: 'Les bulletins suivent la structure officielle (en-tête ministériel, moyennes /20, mentions, décision, visa des parents) et sont exportables en Word ou Excel. Le lien « Vérifier l’authenticité » permet de contrôler qu’un bulletin n’a pas été modifié.',
  },
  {
    q: 'Comment importer mes élèves depuis Excel ?',
    a: 'Dans la classe, ouvrez « Élèves » puis « Importer depuis Excel ». L’application détecte automatiquement les colonnes (Matricule, Nom, Prénoms) et reconnaît le modèle officiel du primaire : les 4 feuilles (Évaluation formative 1 et sommatives 1/2/3) sont toutes lues, avec aperçu avant import et déduplication des élèves.',
  },
  {
    q: 'Que faire si un élève est absent le jour de l’évaluation ?',
    a: 'Dans l’écran de saisie, appuyez sur « Absent » : l’élève est marqué comme absent et le fichier Excel affichera « ABS » à sa place, comme l’attend le modèle EducMaster.',
  },
  {
    q: 'Puis-je utiliser l’application sur plusieurs téléphones ?',
    a: 'Oui. Sur chaque appareil, ouvrez l’écran Cloud, entrez le même code de synchronisation et le même mot de passe secret, puis « Récupérer depuis le cloud ». Les données sont déchiffrées uniquement sur l’appareil.',
  },
  {
    q: 'Comment sont calculées les moyennes ?',
    a: 'Chaque matière est ramenée sur 20 : au primaire, note obtenue + note de perfectionnement ; au secondaire, note sur 20 multipliée par le coefficient. La moyenne générale, le rang, la mention et la décision suivent le barème béninois usuel (≥ 10 = passable).',
  },
  {
    q: 'Que se passe-t-il si je désinstalle l’application ?',
    a: 'Les données sont stockées sur votre téléphone : une désinstallation les efface. Faites toujours une sauvegarde JSON ou ZIP (Réglages) ou une sauvegarde cloud avant de désinstaller ou de changer d’appareil.',
  },
];

export default function SupportScreen() {
  const goBack = useSmartBack();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [diag, setDiag] = useState('');
  const [showDiag, setShowDiag] = useState(false);

  async function buildDiagnostic(): Promise<string> {
    const info = getLastSyncInfo();
    const lines = [
      `Date : ${localDateKey()} ${new Date().toLocaleTimeString('fr-FR')}`,
      `Appareil : ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 90) : 'inconnu'}`,
      `Cloud : ${isCloudConfigured() ? 'configuré' : 'non configuré'}`,
    ];
    if (info) lines.push(`Dernière synchro cloud : ${new Date(info.date).toLocaleString('fr-FR')} — ${info.classes} classe(s), ${info.students} élève(s), ${info.sizeKo} Ko`);
    // Données locales (aide au diagnostic, sans aucune information nominative)
    try {
      const classes = await getAllClasses();
      const students = classes.reduce((a, c) => a + (c.students?.length || 0), 0);
      lines.push(`Données locales : ${classes.length} classe(s), ${students} élève(s)`);
    } catch { /* base non accessible : ignoré */ }
    // Espace de stockage utilisé par l'application (si le navigateur le permet)
    try {
      const nav = navigator as Navigator & { storage?: { estimate?: () => Promise<{ usage?: number; quota?: number }> } };
      if (nav.storage?.estimate) {
        const est = await nav.storage.estimate();
        if (typeof est.usage === 'number') {
          lines.push(`Stockage utilisé : ${(est.usage / 1024 / 1024).toFixed(1)} Mo`);
        }
      }
    } catch { /* API absente : ignoré */ }
    return lines.join('\n');
  }

  useEffect(() => {
    let cancelled = false;
    buildDiagnostic().then(d => { if (!cancelled) setDiag(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function openWithMessage(message: string, withDiagnostic: boolean) {
    let text = message;
    if (withDiagnostic) {
      const d = diag || await buildDiagnostic();
      text = `${message}\n\n--- Diagnostic ---\n${d}`;
    }
    openWhatsApp(text);
  }

  async function refreshDiagnostic() {
    setDiag(await buildDiagnostic());
    setShowDiag(true);
  }

  const actions: SupportAction[] = [
    {
      icon: HelpCircle,
      color: 'bg-blue-100 text-blue-600',
      title: 'Aide & Questions',
      desc: 'Besoin d\'aide pour utiliser l\'application ?',
      message: 'Bonjour, j\'ai besoin d\'aide avec Master Soutien Pédagogique.',
    },
    {
      icon: Lightbulb,
      color: 'bg-amber-100 text-amber-600',
      title: 'Suggérer une amélioration',
      desc: 'Proposez une nouvelle fonctionnalité',
      message: 'Bonjour, j\'aimerais suggérer une amélioration pour l\'application : ',
    },
    {
      icon: Bug,
      color: 'bg-red-100 text-red-600',
      title: 'Signaler un problème',
      desc: 'Un bug ou une erreur à corriger ?',
      message: 'Bonjour, je rencontre un problème avec l\'application : ',
      withDiagnostic: true,
    },
    {
      icon: Send,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Formation & Accompagnement',
      desc: 'Demandez une formation personnalisée',
      message: 'Bonjour, je souhaite une formation/accompagnement pédagogique.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Support & Contact</h1>
            <p className="text-emerald-100 text-sm">Nous sommes là pour vous aider</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-3xl mx-auto">
        {/* Carte contact principale */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white text-center mb-6">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-9 h-9" />
          </div>
          <h2 className="font-bold text-lg">Contactez-nous sur WhatsApp</h2>
          <p className="text-white/90 text-sm mt-1 mb-4 flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            {WHATSAPP_DISPLAY}
          </p>
          <button
            onClick={() => openWhatsApp('Bonjour Master Soutien Pédagogique !')}
            className="bg-white text-green-600 font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Démarrer une conversation
          </button>
        </div>

        {/* Actions rapides */}
        <h3 className="font-bold text-gray-800 mb-3">Comment pouvons-nous aider ?</h3>
        <div className="space-y-3">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                onClick={() => openWithMessage(a.message, !!a.withDiagnostic)}
                className="w-full bg-white rounded-xl shadow p-4 flex items-center gap-3 text-left"
              >
                <div className={`${a.color} p-3 rounded-full shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{a.title}</h4>
                  <p className="text-gray-500 text-sm">{a.desc}</p>
                </div>
                <MessageCircle className="w-5 h-5 text-green-500 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Diagnostic automatique — transparence avant envoi */}
        <div className="bg-white rounded-xl shadow p-4 mt-6">
          <button onClick={() => setShowDiag(!showDiag)} className="w-full flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">Diagnostic automatique</p>
                <p className="text-gray-500 text-xs">Joint uniquement au signalement d’un problème</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${showDiag ? 'rotate-180' : ''}`} />
          </button>
          {showDiag && (
            <div className="mt-3">
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap font-mono">{diag || 'Chargement du diagnostic…'}</pre>
              <button onClick={refreshDiagnostic} className="mt-2 text-xs text-blue-600 font-semibold">↻ Actualiser le diagnostic</button>
            </div>
          )}
        </div>

        {/* FAQ */}
        <h3 className="font-bold text-gray-800 mb-3 mt-6">Questions fréquentes</h3>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-2 p-4 text-left"
              >
                <p className="font-semibold text-gray-800 text-sm">{item.q}</p>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            💬 Toutes vos demandes sont traitées via WhatsApp au <strong>{WHATSAPP_DISPLAY}</strong>.
            N'hésitez pas à nous écrire pour toute question sur l'application, les notes,
            les bulletins ou l'accompagnement pédagogique.
            Pour les problèmes techniques, le diagnostic (date, appareil, état du cloud)
            est ajouté automatiquement à votre message.
          </p>
        </div>
      </main>
    </div>
  );
}
