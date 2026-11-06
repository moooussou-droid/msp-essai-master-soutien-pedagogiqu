/**
 * ÉCRAN DE MODULE (v36).
 *
 * Page unique et réutilisable qui présente un module et ses sous-modules
 * avec une structure simple et esthétique :
 *   en-tête coloré (titre + phrase de présentation)
 *   → texte d'explication
 *   → liste numérotée des sous-modules, chacun avec son icône, son titre
 *     et une phrase décrivant ce qu'il permet de faire.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight,
  BookOpen, Briefcase, CalendarDays, ClipboardList, Compass, GraduationCap,
  Handshake, Megaphone, Store, Target, UserPlus, Wand2, LayoutGrid, Bot, Lock, Clock,
  Sprout, Leaf, Coins, Rocket,
  UtensilsCrossed, Calculator, Boxes, Images, ImagePlus, Wallet, Scale, PenLine,
  Timer, ScanLine, FileText, Wrench, Users, Sparkles,
  HeartHandshake, Baby, KeyRound, BookMarked, NotebookPen,
  School, CalendarCheck, Package, CalendarClock, LifeBuoy, ShieldCheck, Gavel, PlayCircle,
  // v64 : Espace École + Langues (français GCO, anglais primaire).
  Languages, SpellCheck, Globe, Music2,
} from 'lucide-react';
import { AppModule, MODULE_TONES, resolveSubPath } from '../utils/appModules';
import { getAllClasses } from '../utils/database';
import { useSmartBack } from '../utils/useSmartBack';
import SchoolLockBanner from './SchoolLockBanner';

const ICONS: Record<string, typeof BookOpen> = {
  BookOpen, Briefcase, CalendarDays, ClipboardList, Compass, GraduationCap,
  Handshake, Megaphone, Store, Target, UserPlus, Wand2, LayoutGrid, Bot,
  Sprout, Leaf, Coins, Rocket,
  UtensilsCrossed, Calculator, Boxes, Images, ImagePlus, Wallet, Scale, PenLine,
  // v47 : chaque icone doit correspondre a la substance de l'intitule.
  // Toute icone absente de cette table retombe silencieusement sur
  // LayoutGrid — c'etait deja le cas de « Sparkles » avant la v47.
  Timer, ScanLine, FileText, Wrench, Users, Sparkles,
  HeartHandshake, Baby, KeyRound, BookMarked, NotebookPen,
  School, CalendarCheck, Package, CalendarClock, LifeBuoy, ShieldCheck, Gavel, PlayCircle,
  Languages, SpellCheck, Globe, Music2,
};

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] || LayoutGrid;
  return <C className={className} />;
}

export default function ModuleScreen({ module }: { module: AppModule }) {
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const [firstClassId, setFirstClassId] = useState<string | undefined>();
  const tone = MODULE_TONES[module.tone];

  useEffect(() => {
    let alive = true;
    getAllClasses()
      .then(list => { if (alive && list && list.length) setFirstClassId(list[0].id); })
      .catch(() => { /* aucune classe : le lien bascule sur la création */ });
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/*
        v43 — avertit l'utilisateur lorsque l'ecole de son profil differe de
        son etablissement de rattachement.
      */}
      <SchoolLockBanner />
      {/* En-tête du module */}
      {/* v47 : « msp-kente » superpose un tissage discret au degrade propre
          au module ; la couleur d'origine de chaque module est conservee. */}
      <header className={`msp-kente bg-gradient-to-r ${tone.header} text-white px-4 pt-5 pb-6 shadow-lg`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1 text-white/90 text-sm font-medium mb-3"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Icon name={module.icon} className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{module.title}</h1>
              <p className="text-white/85 text-sm">{module.tagline}</p>
            </div>
          </div>
          <div className="msp-flag-rule mt-3 max-w-[140px]" />
          <p className="mt-3 text-white/90 text-sm leading-relaxed">{module.description}</p>
          <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            {module.subModules.length} sous-modules
          </p>
        </div>
      </header>

      {/* Sous-modules */}
      <main className="max-w-3xl mx-auto px-4 -mt-3">
        <div className="space-y-3">
          {module.subModules.map((sub, i) => {
            const subTone = MODULE_TONES[sub.tone];
            const to = resolveSubPath(sub.path, firstClassId);

            const inner = (
              <>
                <div
                  className={`${sub.comingSoon ? 'bg-gray-100 text-gray-400' : `${subTone.bg} ${subTone.text}`} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}
                >
                  <Icon name={sub.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`font-semibold text-[15px] leading-tight ${sub.comingSoon ? 'text-gray-500' : 'text-gray-800'}`}
                    >
                      {sub.title}
                    </span>
                    {sub.comingSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                        <Clock className="w-3 h-3" /> TEMPORAIREMENT INDISPONIBLE
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                    {sub.description}
                  </p>
                </div>
                {sub.comingSoon
                  ? <Lock className="w-5 h-5 text-gray-300 shrink-0" />
                  : <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />}
              </>
            );

            if (sub.comingSoon) {
              return (
                <div
                  key={sub.path}
                  aria-disabled="true"
                  title="Fonction temporairement indisponible"
                  className="bg-gray-50 rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 flex items-center gap-3 opacity-90 cursor-not-allowed"
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={sub.path}
                to={to}
                className={`bg-white rounded-2xl shadow-sm ring-1 ${subTone.ring} p-4 flex items-center gap-3 active:scale-[0.99] transition`}
              >
                {inner}
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600"
        >
          Revenir à l'accueil
        </button>
      </main>
    </div>
  );
}
