import { useMemo, useState } from 'react';

import { useSmartBack } from '../utils/useSmartBack';
import { Briefcase, ChevronLeft, ClipboardCopy, GraduationCap, Printer, Search, Target } from 'lucide-react';
import { normalizeSearch } from '../utils/textSearch';
import { copyText } from '../utils/clipboard';
import { schoolYearLabel } from '../utils/orientation';

interface OrientationItem {
  series: string;
  title: string;
  profile: string;
  studies: string[];
  subjects: string[];
  careers: string[];
  advice: string;
}

const ORIENTATION_DATA: OrientationItem[] = [
  {
    series: 'A1 / A2',
    title: 'Lettres, langues, sciences humaines, droit et communication',
    profile: 'Profil littéraire et linguistique, adapté aux sciences humaines, droit, administration, culture et communication.',
    studies: ['Lettres modernes', 'Langues étrangères', 'Sciences du langage', 'Sciences de l’éducation', 'Philosophie', 'Histoire', 'Géographie', 'Sociologie', 'Psychologie', 'Droit', 'Sciences politiques', 'Journalisme', 'Audiovisuel', 'Tourisme', 'Patrimoine culturel', 'Assistance sociale'],
    subjects: ['Français', 'Philosophie', 'Histoire-Géographie', 'Anglais ou autre langue vivante', 'Culture générale', 'SVT pour certaines formations sociales/santé'],
    careers: ['Enseignant', 'Professeur', 'Interprète', 'Traducteur', 'Journaliste', 'Chargé de communication', 'Community manager', 'Juriste', 'Administrateur', 'Agent social', 'Documentariste', 'Chercheur', 'Spécialiste développement local'],
    advice: 'Renforcer la qualité de l’expression écrite, la culture générale et les langues. Pour les filières sociales, consolider aussi l’Histoire-Géographie et la SVT.',
  },
  {
    series: 'B',
    title: 'Économie, gestion, commerce, droit et sciences sociales',
    profile: 'Profil économique et managérial, adapté à la gestion, finance, marketing, commerce, droit et administration.',
    studies: ['Économie', 'Gestion', 'Finance-Comptabilité', 'Banque', 'Assurance', 'Microfinance', 'Marketing', 'Management', 'Ressources humaines', 'Transport-logistique', 'Commerce international', 'Droit', 'Sociologie', 'Communication', 'Administration', 'Gestion de projets'],
    subjects: ['Économie', 'Mathématiques', 'Français', 'Anglais', 'Histoire-Géographie', 'Culture générale', 'Étude de cas'],
    careers: ['Comptable', 'Responsable financier', 'Auditeur', 'Banquier', 'Assureur', 'Commercial', 'Marketeur', 'Gestionnaire RH', 'Logisticien', 'Responsable e-commerce', 'Juriste', 'Consultant', 'Gestionnaire de projet'],
    advice: 'Travailler l’économie, les mathématiques appliquées, le français professionnel et l’anglais. Les études de cas sont importantes pour les formations de gestion.',
  },
  {
    series: 'C',
    title: 'Mathématiques, sciences, ingénierie, informatique, santé et agriculture',
    profile: 'Profil scientifique fort, particulièrement adapté aux formations sélectives en santé, ingénierie, informatique, eau, environnement et statistiques.',
    studies: ['Médecine', 'Pharmacie', 'Kinésithérapie', 'Génie civil', 'Génie électrique', 'Génie mécanique', 'Génie informatique', 'Télécommunications', 'Informatique', 'Génie logiciel', 'Intelligence artificielle', 'Cybersécurité', 'Agronomie', 'Hydrologie', 'Architecture', 'Statistique', 'Planification'],
    subjects: ['Mathématiques', 'PCT/SPCT', 'SVT', 'Français', 'Anglais'],
    careers: ['Médecin', 'Pharmacien', 'Ingénieur', 'Développeur', 'Data analyst', 'Expert cybersécurité', 'Technicien réseaux', 'Hydrologue', 'Géomaticien', 'Architecte', 'Agronome', 'Statisticien', 'Gestionnaire de projets'],
    advice: 'Priorité absolue aux mathématiques, PCT et SVT. Pour informatique et IA : renforcer mathématiques, logique, anglais et français technique.',
  },
  {
    series: 'D',
    title: 'Sciences de la vie, santé, agriculture, environnement et sciences appliquées',
    profile: 'Profil sciences de la vie et sciences appliquées, orienté santé, agronomie, environnement, eau et informatique.',
    studies: ['Médecine', 'Pharmacie', 'Nutrition', 'Analyse biomédicale', 'Sciences infirmières', 'Santé publique', 'Agronomie', 'Production végétale', 'Production animale', 'Aquaculture', 'Foresterie', 'Environnement', 'Hydrologie', 'Génie civil', 'Génie informatique', 'Psychologie', 'Géographie'],
    subjects: ['SVT', 'Mathématiques', 'PCT/SPCT', 'Français', 'Anglais'],
    careers: ['Médecin', 'Pharmacien', 'Infirmier', 'Sage-femme', 'Technicien laboratoire', 'Agronome', 'Aquaculteur', 'Environnementaliste', 'Hydrologue', 'Informaticien', 'Ingénieur', 'Chercheur'],
    advice: 'Renforcer surtout SVT, mathématiques et PCT. Pour santé et agronomie, les notes scientifiques sont déterminantes.',
  },
  {
    series: 'E',
    title: 'Mathématiques, sciences de l’ingénieur et technologies',
    profile: 'Profil technique et ingénierie, adapté aux génies, énergie, informatique, industrie et maintenance.',
    studies: ['Génie civil', 'Génie électrique', 'Génie mécanique', 'Génie énergétique', 'Génie informatique', 'Télécommunications', 'Génie chimique', 'Maintenance industrielle', 'Systèmes embarqués', 'Architecture', 'Géomatique'],
    subjects: ['Mathématiques', 'PCT', 'Français', 'Anglais', 'Sciences et technologies de l’ingénieur'],
    careers: ['Ingénieur', 'Technicien d’études', 'Conducteur de travaux', 'Technicien maintenance', 'Électricien', 'Mécanicien', 'Développeur', 'Technicien réseaux', 'Technicien industriel'],
    advice: 'Insister sur mathématiques, PCT et technologie. L’anglais technique est un avantage pour l’ingénierie et l’informatique.',
  },
  {
    series: 'F',
    title: 'Technologies, industrie et génie',
    profile: 'Profil technique spécialisé selon l’option : électricité, mécanique, BTP, informatique, énergie ou industrie.',
    studies: ['Génie civil', 'Génie électrique', 'Génie mécanique', 'Génie énergétique', 'Maintenance', 'Travaux publics', 'Architecture', 'Géomatique', 'Génie informatique', 'Technologies industrielles'],
    subjects: ['Mathématiques', 'PCT', 'Technologie', 'Sciences appliquées', 'Français', 'Anglais', 'RDM selon spécialité', 'Électricité ou mécanique selon spécialité'],
    careers: ['Technicien industriel', 'Assistant ingénieur', 'Technicien maintenance', 'Électricien', 'Mécanicien', 'Conducteur de travaux', 'Technicien BTP', 'Technicien informatique', 'Technicien énergie'],
    advice: 'Choisir la filière en cohérence avec la spécialité F. Les matières techniques doivent être consolidées avant l’entrée dans le supérieur.',
  },
  {
    series: 'G1',
    title: 'Administration, secrétariat, droit et sciences sociales',
    profile: 'Profil administration et gestion documentaire, adapté au secrétariat, droit, communication et services publics.',
    studies: ['Administration', 'Secrétariat de gestion', 'Information documentaire', 'Droit', 'Sciences politiques', 'Sociologie', 'Communication', 'Journalisme', 'Gestion des organisations', 'Développement local'],
    subjects: ['Français', 'Étude de cas', 'Histoire-Géographie', 'Économie', 'Anglais', 'Culture générale', 'Droit administratif et du travail'],
    careers: ['Assistant de gestion', 'Secrétaire', 'Agent administratif', 'Archiviste', 'Documentariste', 'Juriste', 'Assistant juridique', 'Chargé de communication', 'Médiateur'],
    advice: 'Renforcer la rédaction administrative, le français, la culture générale et les méthodes d’étude de cas.',
  },
  {
    series: 'G2 / G3',
    title: 'Comptabilité, finance, banque, marketing et management',
    profile: 'Profil gestion, finance et commerce, adapté aux métiers de comptabilité, banque, assurance, marketing et entrepreneuriat.',
    studies: ['Finance-Comptabilité', 'Gestion financière', 'Banque', 'Assurance', 'Microfinance', 'Marketing', 'Management', 'Ressources humaines', 'Commerce international', 'Logistique', 'Droit', 'Communication'],
    subjects: ['Étude de cas', 'Mathématiques', 'Économie', 'Français', 'Anglais', 'Culture générale'],
    careers: ['Comptable', 'Auditeur', 'Contrôleur de gestion', 'Conseiller bancaire', 'Assureur', 'Commercial', 'Responsable marketing', 'Gestionnaire RH', 'Logisticien', 'Entrepreneur', 'Consultant'],
    advice: 'Travailler la comptabilité, l’étude de cas, les mathématiques appliquées, le français professionnel et l’anglais.',
  },
  {
    series: 'DT',
    title: 'Orientation selon la spécialité technique',
    profile: 'Profil technique dépendant de la spécialité : informatique, multimédia, commerce, BTP, maintenance, électricité, mécanique, agriculture.',
    studies: ['Informatique', 'Développement web', 'Multimédia', 'Marketing', 'Commerce', 'BTP', 'Génie civil', 'Géomatique', 'Maintenance', 'Électricité', 'Mécanique'],
    subjects: ['Mathématiques appliquées', 'Technologie', 'Sciences appliquées', 'Français', 'Anglais', 'Matière technique de spécialité'],
    careers: ['Technicien spécialisé', 'Développeur web', 'Technicien maintenance', 'Technicien BTP', 'Commercial', 'Technicien réseaux', 'Assistant ingénieur', 'Technicien agricole'],
    advice: 'Choisir en fonction de la spécialité DT et consolider les matières techniques écrites.',
  },
  {
    series: 'DEAT',
    title: 'Agriculture, élevage, aquaculture, foresterie et environnement',
    profile: 'Profil agricole et technique, orienté production végétale, animale, aquaculture, foresterie, environnement et génie rural.',
    studies: ['Agronomie', 'Production végétale', 'Production animale', 'Aquaculture', 'Foresterie', 'Environnement', 'Génie rural', 'Eau', 'Agroalimentaire', 'Aménagement rural'],
    subjects: ['Matières écrites du DEAT', 'SVT', 'Mathématiques', 'PCT', 'Agriculture générale selon l’option'],
    careers: ['Entrepreneur agricole', 'Conseiller agricole', 'Technicien production végétale', 'Technicien élevage', 'Aquaculteur', 'Forestier', 'Environnementaliste', 'Technicien agroalimentaire'],
    advice: 'S’appuyer sur l’option DEAT suivie et renforcer les trois matières écrites du diplôme.',
  },
];

export default function OrientationPostBacScreen() {
  const goBack = useSmartBack();
  const [selected, setSelected] = useState(ORIENTATION_DATA[0].series);
  const [search, setSearch] = useState('');

  const year = schoolYearLabel();
  const nq = normalizeSearch(search);
  const filtered = useMemo(() => ORIENTATION_DATA.filter(item => {
    const text = `${item.series} ${item.title} ${item.profile} ${item.studies.join(' ')} ${item.subjects.join(' ')} ${item.careers.join(' ')}`;
    return normalizeSearch(text).includes(nq);
  }), [nq]);
  const current = filtered.find(item => item.series === selected) || filtered[0] || ORIENTATION_DATA[0];

  async function copySummary() {
    const text = `Orientation après le BAC (${year}) - ${current.series}\n${current.title}\n\nÉtudes : ${current.studies.join(', ')}\n\nMatières à renforcer : ${current.subjects.join(', ')}\n\nDébouchés : ${current.careers.join(', ')}\n\nConseil : ${current.advice}`;
    const okCopy = await copyText(text);
    alert(okCopy ? 'Orientation copiée.' : 'Impossible de copier automatiquement : sélectionnez le texte manuellement.');
  }

  function printSummary() {
    const win = window.open('', '_blank');
    if (!win) { alert('Votre navigateur a bloqué l’ouverture de la fenêtre d’impression.'); return; }
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(current.series)} — Orientation post-BAC</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#111}h1{font-size:18px}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #059669;padding-bottom:3px}li{font-size:12.5px;margin:2px 0}.adv{background:#fef3c7;border:1px solid #f59e0b;padding:10px;font-size:12.5px;margin-top:14px}.foot{margin-top:18px;font-size:11px;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:8px}@media print{body{padding:0}}</style></head><body>` +
      `<h1>Orientation après le BAC (${esc(year)}) — Série ${esc(current.series)}</h1><p style="font-size:12px;color:#444">${esc(current.title)}</p>` +
      `<h2>Études possibles</h2><ul>${current.studies.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` +
      `<h2>Matières à renforcer</h2><ul>${current.subjects.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` +
      `<h2>Débouchés professionnels</h2><ul>${current.careers.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` +
      `<div class="adv"><strong>Conseil d'orientation :</strong> ${esc(current.advice)}</div>` +
      `<p class="foot">Document généré par Master Soutien Pédagogique — ${esc(year)}.</p></body></html>`);
    win.document.close();
    win.focus();
    win.onload = () => { win.focus(); win.print(); };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack()} className="p-2 bg-white/20 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="font-bold text-lg">Orientation universitaire après le BAC</h1>
            <p className="text-emerald-100 text-sm">Séries, études, matières à renforcer et débouchés</p>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-5xl mx-auto">
        <section className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="text-xl font-black text-gray-900 mb-1">BAC {year} : aider l’élève à choisir sa voie</h2>
          <p className="text-gray-500 text-sm">Logique de choix : Série du BAC → Matières fortes → Filière universitaire → Compétences → Métier.</p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une série, une filière ou un métier..." className="w-full pl-10 pr-4 py-3 border rounded-lg" />
          </div>
        </section>

        {search && <p className="text-sm text-gray-500 mb-2">🔎 {filtered.length} série{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''} pour « {search} »</p>}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {filtered.map(item => (
            <button key={item.series} onClick={() => setSelected(item.series)} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm ${current.series === item.series ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>{item.series}</button>
          ))}
        </div>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-5">
            <p className="text-sm text-emerald-100">Série {current.series}</p>
            <h2 className="text-2xl font-black">{current.title}</h2>
            <p className="mt-2 text-emerald-50">{current.profile}</p>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoBlock icon={GraduationCap} title="Études possibles" items={current.studies} color="emerald" />
            <InfoBlock icon={Target} title="Matières à renforcer" items={current.subjects} color="amber" />
            <InfoBlock icon={Briefcase} title="Débouchés professionnels" items={current.careers} color="blue" />
          </div>
          <div className="p-4 border-t bg-amber-50">
            <p className="font-bold text-amber-900 mb-1">Conseil d’orientation</p>
            <p className="text-amber-800 text-sm">{current.advice}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={copySummary} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><ClipboardCopy className="w-4 h-4" /> Copier la synthèse</button>
              <button onClick={printSummary} className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimer la fiche</button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 mt-4">
          <h2 className="font-bold text-gray-900 mb-2">Règle essentielle</h2>
          <p className="text-gray-700 text-sm">Le choix d’études doit suivre la chaîne : <strong>Série du BAC → Matières fortes → Filière universitaire → Compétences acquises → Métier/Débouché</strong>.</p>
        </section>
      </main>
    </div>
  );
}

function InfoBlock({ icon: Icon, title, items, color }: { icon: typeof GraduationCap; title: string; items: string[]; color: 'emerald' | 'amber' | 'blue' }) {
  const style = color === 'emerald'
    ? 'bg-emerald-50 text-emerald-700'
    : color === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-blue-50 text-blue-700';
  return (
    <div className="rounded-xl border p-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${style}`}><Icon className="w-5 h-5" /></div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside max-h-72 overflow-y-auto">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
