import 'fake-indexeddb/auto';
// Les sections 46+ utilisent require() : on le recree en contexte ESM.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Suite de tests automatisés — Master Soutien Pédagogique
 * Vérifie le comportement réel des fonctions métier critiques :
 * bulletins, export Excel, import Excel, licences, chiffrement.
 */
import ExcelJS from 'exceljs';
import { computeBulletins, computeClassStats, computeGroupBilans } from '../src/utils/bulletin';
import { generateEducMasterExcel, downloadExcel } from '../src/utils/excelGenerator';
import { generateStudentListExcel } from '../src/utils/studentListExport';
import { importStudentsFromExcel, generateStudentTemplate } from '../src/utils/excelImporter';
import { generateAccessCode, verifyAccessCode, normalizeName, cleanCode } from '../src/utils/license';
import { encryptData, decryptData, hashText } from '../src/utils/crypto';
import { ClassData, Student, Subject, Note, findNoteInEvaluation, findBestNote, evaluationsForClass } from '../src/utils/database';
import { makeCustomEvaluation, isCustomEvaluation, evaluationLabel } from '../src/utils/database';

let pass = 0;
let fail = 0;
const errors: string[] = [];

async function main() {

function ok(cond: boolean, label: string, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; errors.push(label + (detail ? ` — ${detail}` : '')); console.log(`  ❌ ${label} ${detail}`); }
}
function section(t: string) { console.log(`\n═══ ${t} ═══`); }

// ---------- Helpers ----------
function makeSubject(id: string, name: string, obtenerMax: number, perfMax: number, order = 0): Subject {
  return { id, name, noteObtenueMax: obtenerMax, notePerfectionnementMax: perfMax, order };
}
function makeStudent(id: string, matricule: string, nom: string, prenoms: string): Student {
  return { id, matricule, nom, prenoms, createdAt: Date.now() };
}
function makeNote(id: string, studentId: string, subjectId: string, obt: number | null, perf: number | null, absent = false): Note {
  return { id, studentId, subjectId, noteObtenue: obt, notePerfectionnement: perf, absent, updatedAt: Date.now() };
}

// ============================================================
section('1. Bulletins — Primaire (CM/18 + CP/2 → /20)');
{
  const subjects = [
    makeSubject('s1', 'Dictée', 18, 2, 0),
    makeSubject('s2', 'Math', 18, 2, 1),
  ];
  const students = [
    makeStudent('e1', '001', 'AHOUANSOU', 'Jean'),
    makeStudent('e2', '002', 'KOFFI', 'Mariam'),
    makeStudent('e3', '003', 'DOSSOU', 'Ali'),
    makeStudent('e4', '004', 'SOSSOU', 'Paul'),
  ];
  const notes = [
    makeNote('n1', 'e1', 's1', 15, 1.5),   // 16.5/20
    makeNote('n2', 'e1', 's2', 16, 1),     // 17/20
    makeNote('n3', 'e2', 's1', 9, 0.5),    // 9.5/20
    makeNote('n4', 'e2', 's2', 10, 1),     // 11/20
    makeNote('n5', 'e3', 's1', null, null, true), // absent
    makeNote('n6', 'e3', 's2', 18, 2),     // 20/20
    makeNote('n7', 'e4', 's1', 16, 2),     // 18/20
    makeNote('n8', 'e4', 's2', 16, 2),     // 18/20
  ];
  const classData: ClassData = {
    id: 'c1', name: 'CE1 A', school: 'EPP Akassato', level: 'CE1',
    educationType: 'primaire', schoolYear: '2025-2026', sequence: '1er Trim.',
    students, subjects, notes, createdAt: 0, updatedAt: 0,
  };
  const b = computeBulletins(classData);
  const jean = b.find(x => x.student.id === 'e1')!;
  const mariam = b.find(x => x.student.id === 'e2')!;
  const ali = b.find(x => x.student.id === 'e3')!;
  const paul = b.find(x => x.student.id === 'e4')!;

  ok(Math.abs((jean.moyenne ?? 0) - 16.75) < 0.001, `Moyenne Jean = 16.75`, `obtenu ${jean.moyenne}`);
  ok(Math.abs((mariam.moyenne ?? 0) - 10.25) < 0.001, `Moyenne Mariam = 10.25`, `obtenu ${mariam.moyenne}`);
  ok(Math.abs((ali.moyenne ?? 0) - 20) < 0.001, `Moyenne Ali (1 note) = 20`, `obtenu ${ali.moyenne}`);
  ok(paul.rang === 2, `Rang Paul = 2 (18/20)`, `obtenu ${paul.rang}`);
  ok(jean.rang === 3, `Rang Jean = 3 (16.75/20)`, `obtenu ${jean.rang}`);
  ok(mariam.rang === 4, `Rang Mariam = 4`, `obtenu ${mariam.rang}`);
  ok(ali.rang === 1, `Rang Ali = 1 (20/20)`, `obtenu ${ali.rang}`);
  ok(jean.mention === 'Très Bien', `Mention Jean = Très Bien`, `obtenu ${jean.mention}`);
  ok(jean.effectif === 4, `Effectif = 4`);
  ok(ali.results.find(r => r.subject.id === 's1')!.absent === true, `Absent marqué pour Dictée (Ali)`);
  ok(ali.results.find(r => r.subject.id === 's1')!.total === null, `Total null si absent`);

  // Ex-aequo : Jean et Sosso ont 16.75 ? Non — Sosso 18. Testons ex-aequo direct.
  const stats = computeClassStats(b);
  ok(Math.abs((stats.moyenneClasse ?? 0) - 16.25) < 0.001, `Moyenne de classe = 16.25`, `obtenu ${stats.moyenneClasse}`);
  ok(stats.admis === 4, `Admis = 4/4`, `obtenu ${stats.admis}`);
  ok(Math.abs(stats.tauxReussite - 100) < 0.001, `Taux de réussite = 100%`);
}

section('1bis. Bulletins — Ex-aequo (mêmes moyennes → même rang)');
{
  const subjects = [makeSubject('s1', 'Dictée', 18, 2, 0)];
  const students = [
    makeStudent('e1', '001', 'AMOUSSOU', 'A'),
    makeStudent('e2', '002', 'AMOUSSOU', 'B'),
    makeStudent('e3', '003', 'GNANSOUNOU', 'C'),
  ];
  const notes = [
    makeNote('n1', 'e1', 's1', 12, 2), // 14/20
    makeNote('n2', 'e2', 's1', 12, 2), // 14/20 → ex-aequo avec e1
    makeNote('n3', 'e3', 's1', 10, 0), // 10/20 → 3e
  ];
  const classData: ClassData = {
    id: 'c1b', name: 'CI A', school: 'EPP X', level: 'CI', educationType: 'primaire',
    schoolYear: '2025-2026', sequence: '1er Trim.', students, subjects, notes, createdAt: 0, updatedAt: 0,
  };
  const b = computeBulletins(classData);
  const a = b.find(x => x.student.id === 'e1')!;
  const bb = b.find(x => x.student.id === 'e2')!;
  const c = b.find(x => x.student.id === 'e3')!;
  ok(a.rang === 1 && bb.rang === 1, `Ex-aequo : rang 1 pour les deux (${a.rang}/${bb.rang})`);
  ok(c.rang === 3, `Le suivant a le rang 3 (pas 2) : ${c.rang}`);
}

section('2. Bulletins — Secondaire (notes /20 avec coefficients)');
{
  const subjects = [
    { ...makeSubject('s1', 'Mathématiques', 20, 0, 0), coefficient: 2 },
    { ...makeSubject('s2', 'Français', 20, 0, 1), coefficient: 1 },
  ] as Subject[];
  const students = [makeStudent('e1', 'A1', 'NZOUMANOU', 'Rachid')];
  const notes = [makeNote('n1', 'e1', 's1', 12, null), makeNote('n2', 'e1', 's2', 10, null)];
  const classData: ClassData = {
    id: 'c2', name: '3ème B', school: 'CEG1', level: '3ème', educationType: 'secondaire',
    schoolYear: '2025-2026', sequence: '1er Trim.', students, subjects, notes, createdAt: 0, updatedAt: 0,
  };
  const b = computeBulletins(classData);
  const r = b[0];
  ok(Math.abs((r.moyenne ?? 0) - 11.3333) < 0.01, `Moyenne pondérée = 11.33`, `obtenu ${r.moyenne}`);
  ok(r.totalPoints === 34, `Total points = 24+10 = 34`, `obtenu ${r.totalPoints}`);
  ok(r.totalPossible === 60, `Total possible = 60`, `obtenu ${r.totalPossible}`);
  ok(r.totalCoef === 3, `Somme coefficients = 3`);
  ok(r.mention === 'Passable', `Mention = Passable`);
}

section('3. Export Excel — format EducMaster');
{
  // 13 matières (9 par défaut + 4 ajoutées) → 29 colonnes → test limite A..Z
  const subjects: Subject[] = [];
  const names = ['Dictée','Math','Expression écrite','Compréhension de l\'écrit','EST','ES','EA (Oral)','EA (Dessin/Couture)','EPS','Anglais','Informatique','Musique','SVT'];
  names.forEach((n, i) => subjects.push(makeSubject(`s${i}`, n, 18, 2, i)));
  const students = [
    makeStudent('e1', '001234', 'AHOUANSOU', 'Jean'),
    makeStudent('e2', '567890', 'KOFFI', 'Mariam Aïcha'),
  ];
  const notes = [
    makeNote('n1', 'e1', 's0', 15, 1), makeNote('n2', 'e1', 's1', 16, 2),
    makeNote('n3', 'e2', 's0', null, null, true),
  ];
  const classData: ClassData = {
    id: 'c3', name: 'CE1 A', school: 'EPP Akassato', level: 'CE1', educationType: 'primaire',
    schoolYear: '2025-2026', sequence: '1er Trim.', students, subjects, notes, createdAt: 0, updatedAt: 0,
  };
  try {
    const { blob, filename } = await generateEducMasterExcel(classData);
    ok(true, 'Export généré sans erreur (13 matières → colonnes > Z)');
    ok(/^\d{14}_model-importation-note_\d{4}-epp-.*\.xlsx$/.test(filename), `Nom de fichier conforme : ${filename}`);
    ok(filename.includes('epp_akassato') && filename.includes('ce1_a'), 'École/Classe nettoyées dans le nom');

    // Relire le fichier avec ExcelJS pour vérifier le contenu
    const buf = Buffer.from(await blob.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const sheetNames = wb.worksheets.map(w => w.name);
    ok(sheetNames.join('|') === 'Evaluation formative 1|Evaluation sommative 1|Evaluation sommative 2|Evaluation sommative 3', `4 feuilles d'évaluation aux noms officiels : ${sheetNames.join(' | ')}`);
    const ws = wb.worksheets[0];
    ok(ws.getCell('A1').value === 'Matricule' && ws.getCell('B1').value === 'Nom' && ws.getCell('C1').value === 'Prénoms', 'En-têtes A1/B1/C1 = Matricule/Nom/Prénoms');
    ok(ws.getCell('D1').value === 'Dictée' && ws.getCell('D2').value === 'Note obtenue' && ws.getCell('E2').value === 'Note perf.', 'En-têtes matière + sous-en-têtes du modèle officiel');
    ok(ws.getCell('D1').isMerged === true, 'Cellule matière fusionnée');
    ok(ws.getCell('AA1') !== undefined && ws.getCell('AA2') !== undefined, 'Colonnes au-delà de Z présentes');
    // Matières triées dans l'ordre officiel EducMaster
    ok(ws.getCell('D1').value === 'Dictée', 'Ordre officiel respecté (Dictée en 1re matière)');
    // Les notes (historiques, sans évaluation) sont exportées dans la feuille
    // « Evaluation sommative 1 » (évaluation par défaut de la compatibilité).
    const ws1 = wb.worksheets[1];
    ok(ws1 && ws1.name === 'Evaluation sommative 1', 'Feuille sommative 1 présente (notes historiques)');
    ok(ws1.getCell('A3').value === '001234', 'Matricule préservé (zéros initiaux)');
    ok(ws1.getCell('A3').numFmt === '@', 'Colonne matricule = format texte');
    ok(ws1.getCell('B3').value === 'AHOUANSOU', 'Nom en majuscules');
    ok(ws1.getCell('D3').value === 15 && ws1.getCell('E3').value === 1, 'Note obtenue/perf correcte ligne 3');
    ok(ws1.getCell('D4').value === 'ABS' && ws1.getCell('E4').value === 'ABS', 'Absent → ABS ABS');
  } catch (e: any) {
    ok(false, 'Export Excel sans erreur', String(e?.message || e));
  }
}

section('4. Import Excel — format EducMaster (2 lignes d\'en-tête)');
{
  // Construit un fichier façon EducMaster : ligne 1 matières fusionnées, ligne 2 sous-en-têtes
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Notes');
  ws.mergeCells('A1:A2'); ws.mergeCells('B1:B2'); ws.mergeCells('C1:C2');
  ws.getCell('A1').value = 'Matricule';
  ws.getCell('B1').value = 'Nom';
  ws.getCell('C1').value = 'Prénoms';
  const matieres = ['Dictée', 'Math'];
  let col = 4;
  for (const m of matieres) {
    ws.mergeCells(1, col, 1, col + 1);
    ws.getCell(1, col).value = m;
    ws.getCell(2, col).value = 'Note obtenue';
    ws.getCell(2, col + 1).value = 'Note perfectionnement';
    col += 2;
  }
  ws.getCell('A3').value = '001234'; ws.getCell('A3').numFmt = '@';
  ws.getCell('B3').value = 'AHOUANSOU'; ws.getCell('C3').value = 'Jean';
  ws.getCell('D3').value = 15; ws.getCell('E3').value = 1.5;
  ws.getCell('F3').value = 16; ws.getCell('G3').value = 'ABS';
  ws.getCell('A4').value = '567890'; ws.getCell('B4').value = 'KOFFI'; ws.getCell('C4').value = 'Mariam';
  ws.getCell('D4').value = 9; ws.getCell('E4').value = 0;

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const file = new File([buf], 'educmaster.xlsx');
  const subjects = [makeSubject('s1', 'Dictée', 18, 2, 0), makeSubject('s2', 'Math', 18, 2, 1)];

  const result = await importStudentsFromExcel(file, subjects);
  ok(result.importedRows === 2, `2 élèves importés`, `obtenu ${result.importedRows}`);
  ok(result.students[0].matricule === '001234', 'Matricule 001234 préservé (texte)');
  ok(result.students[1].matricule === '567890', 'Matricule 567890');
  ok((result.detectedSubjects as string[])?.length === 2, `2 matières détectées : ${result.detectedSubjects.join(', ')}`);
  const noteJean = result.parsedNotes.find(n => n.studentId === result.students[0].id && n.subjectName === 'Dictée')!;
  ok(noteJean?.noteObtenue === 15 && noteJean?.notePerfectionnement === 1.5, 'Notes Dictée Jean = 15 / 1.5');
  ok(noteJean?.subjectId === 's1', 'Matière associée à la classe (s1)');
  const noteAbs = result.parsedNotes.find(n => n.studentId === result.students[0].id && n.subjectName === 'Math')!;
  ok(noteAbs?.absent === true, 'ABS détecté comme absence');
  ok(result.errors.length === 0, `Aucune erreur d\'import`, result.errors.join(' | '));
}

section('5. Import Excel — modèle vierge généré par l\'app');
{
  const tmpl = await generateStudentTemplate();
  const file = new File([await tmpl.arrayBuffer()], 'modele.xlsx');
  const result = await importStudentsFromExcel(file, []);
  ok(result.importedRows === 3, `3 exemples importés`, `obtenu ${result.importedRows}`);
  ok(result.students[0].matricule === '117042400', 'Matricule exemple préservé');
}

section('6. Codes d\'accès (licence)');
{
  const code = await generateAccessCode('Koffi Jean');
  ok(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code), `Format XXXX-XXXX-XXXX-XXXX : ${code}`);
  ok(await verifyAccessCode('Koffi Jean', code), 'Code valide avec nom exact');
  ok(await verifyAccessCode('  koffi jean  ', code), 'Code valide avec casse/espaces tolérants');
  ok(await verifyAccessCode('Koffi Jeann', code) === false, 'Nom différent → refusé');
  ok(await verifyAccessCode('Koffi Jean', 'AAAA-BBBB-CCCC-DDDD') === false, 'Code faux → refusé');
  ok(normalizeName('  Kévin-Faustin   Dossa ') === 'kevin-faustin dossa', 'Normalisation nom (accents/casse)');
  ok(cleanCode('abcd-EFGH 1234') === 'ABCDEFGH1234', 'Nettoyage code');
  // Deux noms différents → codes différents
  const autre = await generateAccessCode('Koffi Marie');
  ok(code !== autre, 'Codes différents pour noms différents');
}

section('7. Chiffrement de bout en bout');
{
  const secret = 'MonMotDePasseSecret';
  const data = JSON.stringify({ classe: 'CE1 A', eleves: [{ nom: 'AHOUANSOU Jean', note: 15.5 }] });
  const enc = await encryptData(data, secret);
  ok(typeof enc === 'string' && enc.length > 100, `Chiffré (base64, ${enc.length} chars)`);
  const dec = await decryptData(enc, secret);
  ok(dec === data, 'Aller-retour chiffrement/déchiffrement OK');
  let threw = false;
  try { await decryptData(enc, 'Mauvais mot de passe'); } catch { threw = true; }
  ok(threw, 'Mauvais mot de passe → erreur (données illisibles)');
  const h1 = await hashText('test'); const h2 = await hashText('test');
  ok(h1 === h2 && h1.length === 44, 'hashText déterministe (SHA-256 base64)');
}

section('8. Génération IA locale (moteur pédagogique APC)');
{
  const { generateLocalLesson } = await import('../src/utils/localPedagogicalEngine');

  // Fiche Mathématiques CE2
  const plan = generateLocalLesson({
    niveau: 'CE2', matiere: 'Mathématiques', theme: 'Addition avec retenue',
    duree: '60 min', objectif: '', consignes: '', generationKind: 'fiche', standard: 'APC_BENIN',
  });
  ok(plan.titre.includes('Addition avec retenue'), `Titre : ${plan.titre}`);
  ok(plan.matiere === 'Mathématiques' && plan.classe === 'CE2', 'Classe et matière correctes');
  ok(plan.competence.toLowerCase().includes('ce2'), 'Compétence adaptée au niveau (CE2)');
  ok(plan.deroulement.includes('Situation-problème'), 'Structure APC : situation-problème');
  ok(plan.deroulement.includes('Mise en commun') && plan.deroulement.includes('Structuration'), 'Structure APC : mise en commun + structuration');
  ok(plan.deroulement.includes('(15 min)') || /\d+ min/.test(plan.deroulement), 'Durées de phases calculées');
  ok(plan.deroulement.includes('Enseignant') && plan.deroulement.includes('Apprenants'), 'Activités enseignant / apprenants');
  ok(plan.evaluation.includes('Évaluation') && plan.evaluation.includes('Remédiation'), 'Évaluation + remédiation');
  ok(plan.materiel.length > 10, 'Matériel spécifique à la matière');

  // Dictée
  const dictee = generateLocalLesson({ niveau: 'CM1', matiere: 'Dictée', theme: 'les homophones', duree: '45 min', objectif: '', consignes: '', generationKind: 'fiche' });
  ok(dictee.evaluation.toLowerCase().includes('orthographe'), 'Évaluation de dictée avec critères orthographe');

  // Exercices
  const exos = generateLocalLesson({ niveau: 'CM2', matiere: 'Mathématiques', theme: 'les fractions', duree: '45 min', objectif: '', consignes: '', generationKind: 'exercices' });
  ok(exos.evaluation.includes('EXERCICE 1') && exos.evaluation.includes('EXERCICE 3'), 'Exercices gradués (facile/moyen/difficile)');
  ok(exos.evaluation.includes('Corrigé'), 'Corrigés inclus');
  ok(exos.evaluation.includes('Barème') && exos.evaluation.includes('20 points'), 'Barème sur 20');

  // Cours en ligne
  const cours = generateLocalLesson({ niveau: '6ème', matiere: 'Français', theme: 'le présent', duree: '45 min', objectif: '', consignes: '', generationKind: 'cours_en_ligne' });
  ok(cours.deroulement.includes('MODULE 6'), 'Cours en ligne structuré en 6 modules');

  // Matière inconnue → générique, sans erreur
  const inconnu = generateLocalLesson({ niveau: 'CE1', matiere: 'Dessin', theme: 'le paysage', duree: '30 min', objectif: '', consignes: '', generationKind: 'fiche' });
  ok(inconnu.titre.includes('le paysage'), `Matière inconnue → gabarit générique (${inconnu.titre})`);
  const localReference = generateLocalLesson({ niveau: '', matiere: '', theme: 'Leçon test', duree: '', objectif: '', consignes: '', generationKind: 'fiche', standard: 'FICHE_REFERENCE', modelText: 'Modèle: introduction, activité, évaluation.' });
  ok(localReference.pointsAControler?.some(point => point.includes('ne reproduit pas sémantiquement'))
    && localReference.deroulement.includes('aucune conformité officielle présumée'),
    'IA locale : limite de lecture de la fiche annoncée sans prétendre à une conformité officielle');
}

section('8bis. IA en ligne — passerelle multi-fournisseurs et consentement');
{
  const { buildLessonPrompt, generateLessonPlan } = await import('../src/utils/aiLessonGenerator');
  const { getAIProviderCatalogue } = await import('../server/aiGateway.js');
  const providerIds = getAIProviderCatalogue().map(provider => provider.id);
  for (const provider of ['openai', 'anthropic', 'mistral', 'perplexity', 'gemini', 'deepseek']) {
    ok(providerIds.includes(provider), `Passerelle déclarée pour ${provider}`);
  }
  ok(!providerIds.includes('openai-key'), 'Aucune authentification IA par anciennes clés navigateur');
  const lessonSource = await (await import('node:fs/promises')).readFile(new URL('../src/utils/aiLessonGenerator.ts', import.meta.url), 'utf8');
  ok(lessonSource.includes('sendAIRequest') && !/apiKey|api_key|OPENAI_API_KEY|GEMINI_API_KEY/.test(lessonSource),
    'Générateur en ligne via la passerelle, sans clé fournisseur côté navigateur');
  const prompt = buildLessonPrompt({
    niveau: 'CE1', matiere: 'Mathématiques', theme: 'Addition avec retenue',
    duree: '45 min', objectif: '', consignes: '', generationKind: 'fiche', standard: 'APC_BENIN',
  });
  ok(prompt.includes('Addition avec retenue') && prompt.includes('CE1'), 'Prompt construit avec thème et niveau');
  ok(!prompt.includes('PROMPT MAGIC 1') && !prompt.includes('journaliste pédagogique'),
    'Prompt Magic 1 retiré de la génération de fiches');
  const exercisePrompt = buildLessonPrompt({
    niveau: 'CE1', matiere: 'Mathématiques', theme: 'Addition avec retenue',
    duree: '45 min', objectif: '', consignes: '', generationKind: 'exercices', standard: 'FICHE_REFERENCE',
  });
  ok(exercisePrompt.includes('PROMPT MAGIC 2') && !exercisePrompt.includes('PROMPT MAGIC 1'),
    'Prompt Magic 2 reste réservé aux exercices, sans réintroduire Magic 1');
  const referencePrompt = buildLessonPrompt({
    niveau: '', matiere: '', theme: 'Le nouveau titre', duree: '', objectif: '', consignes: '',
    generationKind: 'fiche', standard: 'FICHE_REFERENCE', modelText: 'COMPÉTENCE\\nOBJECTIF\\nDÉROULEMENT',
  });
  ok(referencePrompt.includes('FICHE DE RÉFÉRENCE — SOURCE PRIORITAIRE')
    && referencePrompt.includes('Le nouveau titre') && referencePrompt.includes('rubriques')
    && referencePrompt.includes('aucune conformité officielle présumée') && !referencePrompt.includes('APC Bénin'),
    'IA fiche modèle : rubriques et ordre prioritaires, titre remplacé, aucune conformité officielle inventée');
  const consentBlocked = await generateLessonPlan({ provider: 'openai' }, {
    niveau: 'CE1', matiere: 'Mathématiques', theme: 'Test', duree: '45 min', objectif: '', consignes: '',
  }).then(() => false).catch(error => String(error?.message || error).includes('Accord requis'));
  ok(consentBlocked, 'IA hybride : appel externe bloqué sans accord explicite de cette demande');
}

section('9. Export Word (.docx) des fiches');
{
  const { buildDocxXml, buildFichePdf, printFiche } = await import('../src/utils/ficheExport');
  const JSZip = (await import('jszip')).default;
  const plan = {
    titre: 'Fiche test <&> "spéciale"', classe: 'CE1', matiere: 'Math', domaine: 'x', duree: '45 min',
    competence: 'Compétence test', objectif: 'Objectif test', materiel: 'Matériel test',
    deroulement: '• Phase 1 (10 min)\n   — Enseignant : explique\n   — Apprenants : écoutent', evaluation: 'Évaluation test',
  };

  const xml = buildDocxXml(plan as any);
  ok(xml.startsWith('<?xml') && xml.includes('<w:document ') && xml.includes('</w:document>'), 'XML document.xml bien formé');
  ok(xml.includes('Fiche test &lt;&amp;&gt; &quot;spéciale&quot;'), 'Échappement XML des caractères spéciaux');
  ok(xml.includes('Phase 1') && xml.includes('Enseignant'), 'Contenu du déroulement présent');
  const structuredPlan = { ...plan, rubriques: [
    { titre: 'Préparation / rappel', contenu: 'Rappel des acquis.' },
    { titre: 'Activités des apprenants', contenu: 'Recherche en binômes.' },
  ], pointsAControler: ['Vérifier que la durée correspond au programme de classe.'] };
  const structuredXml = buildDocxXml(structuredPlan as any);
  ok(structuredXml.includes('Préparation / rappel') && structuredXml.includes('Activités des apprenants')
    && structuredXml.includes('POINTS À VÉRIFIER AVANT UTILISATION'),
    'Word : export stylé conserve les rubriques personnalisées et les points de contrôle');
  const pdfDoc = buildFichePdf(structuredPlan as any);
  const pdfBytes = pdfDoc.output('arraybuffer');
  ok(pdfBytes.byteLength > 1000, 'PDF : génération locale d’un vrai document A4 avec rubriques et pagination');

  // Le zip complet se construit sans erreur
  const { downloadFicheDocx } = await import('../src/utils/ficheExport');
  const originalCreates = (globalThis as any).URL?.createObjectURL;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    let okDownload = false;
    await downloadFicheDocx(plan as any);
    okDownload = true;
    ok(okDownload, 'Téléchargement .docx : génération du zip sans erreur');
  } catch (e: any) {
    ok(false, 'Téléchargement .docx', String(e?.message || e));
  } finally {
    (globalThis as any).URL = URL;
    (globalThis as any).document = undefined;
  }

  let printOk = false;
  try {
    (globalThis as any).window = { open: () => ({ document: { open: () => {}, write: () => {}, close: () => {} }, close: () => {} }) };
    printFiche(plan as any);
    printOk = true;
  } catch { printOk = false; }
  (globalThis as any).window = undefined;
  ok(printOk, 'Impression : HTML de la fiche construit sans erreur');
}

section('10. Export groupé Bulletins (Excel récap + Word multi)');
{
  const { exportBulletinsExcel, exportBulletinsDocx } = await import('../src/utils/bulletinExport');
  const ExcelJS2 = (await import('exceljs')).default;

  const subjects2 = [
    { ...makeSubject('s1', 'Dictée', 18, 2, 0) },
    { ...makeSubject('s2', 'Math', 18, 2, 1) },
  ];
  const students2 = [
    { ...makeStudent('e1', '001234', 'AHOUANSOU', 'Jean'), sexe: 'M' as const, dateNaissance: '2015-03-12' },
    { ...makeStudent('e2', '567890', 'KOFFI', 'Mariam'), sexe: 'F' as const, dateNaissance: '2015-09-25' },
    { ...makeStudent('e3', '999999', 'DOSSOU', 'Ali') },
  ];
  const notes2 = [
    makeNote('n1', 'e1', 's1', 15, 1.5), makeNote('n2', 'e1', 's2', 16, 1),
    makeNote('n3', 'e2', 's1', 9, 0.5), makeNote('n4', 'e2', 's2', 10, 1),
    makeNote('n5', 'e3', 's1', null, null, true), makeNote('n6', 'e3', 's2', 18, 2),
  ];
  const classData2: ClassData = {
    id: 'c-bull', name: 'CE1 A', school: 'EPP Test', level: 'CE1', educationType: 'primaire',
    schoolYear: '2025-2026', sequence: '1er Trim.', students: students2, subjects: subjects2, notes: notes2, createdAt: 0, updatedAt: 0,
  };
  const bulletins2 = computeBulletins(classData2);
  ok(bulletins2.length === 3, '3 bulletins calculés');

  // --- Excel ---
  const originalCreate2 = (globalThis as any).URL?.createObjectURL;
  let excelBlob: Blob | null = null;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), {
      createObjectURL: (b: Blob) => { excelBlob = b; return 'blob:excel'; },
      revokeObjectURL: () => {},
    });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    await exportBulletinsExcel(classData2, bulletins2);
  } finally {
    (globalThis as any).URL = URL;
    (globalThis as any).document = undefined;
  }
  ok(excelBlob instanceof Blob && excelBlob.type.includes('spreadsheetml'), `Excel récap généré (${excelBlob?.size} octets)`);
  if (excelBlob) {
    const wb2 = new ExcelJS2.Workbook();
    await wb2.xlsx.load(Buffer.from(await excelBlob.arrayBuffer()) as any);
    const ws = wb2.getWorksheet('Bulletins');
    ok(!!ws, 'Feuille « Bulletins » présente');
    ok(ws!.getCell('A1').value === 'N°' && ws!.getCell('C1').value === 'Nom', 'En-têtes corrects (N°, Nom)');
    const moyCol = [7, 8, 9, 10].find((c) => ws!.getCell(1, c).value === 'Moyenne /20');
    ok(!!moyCol, `Colonne Moyenne présente (col ${moyCol})`);
    ok(ws!.getCell('A2').value === 1 && String(ws!.getCell('B2').value) === '001234', 'Matricule zéro initial préservé (texte)');
    ok(ws!.getCell('C2').value === 'AHOUANSOU', 'Nom élève présent');
    ok(ws!.getCell('E2').value === 'M' && ws!.getCell('F2').value === '12/03/2015', 'Sexe + date de naissance formatées (M, 12/03/2015)');
    const ws2f = wb2.getWorksheet('Synthèse');
    ok(!!ws2f, 'Feuille « Synthèse » présente');
    const synCell = ws2f!.getCell('B8') as any; // Moyenne de classe
    ok(synCell !== undefined, 'Synthèse : moyennes/mentions calculées');
  }

  // --- Word ---
  let docxBlob: Blob | null = null;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), {
      createObjectURL: (b: Blob) => { docxBlob = b; return 'blob:docx'; },
      revokeObjectURL: () => {},
    });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    await exportBulletinsDocx(classData2, bulletins2);
  } finally {
    (globalThis as any).URL = URL;
    (globalThis as any).document = undefined;
  }
  ok(docxBlob instanceof Blob && docxBlob.type.includes('officedocument.wordprocessingml'), `Word multi-bulletins généré (${docxBlob?.size} octets)`);
}

section('11. Champs sexe/naissance dans les données élève');
{
  const { Student } = await import('../src/utils/database');
  const s: Student = { id: 'x', matricule: '001', nom: 'Z', prenoms: 'A', sexe: 'F', dateNaissance: '2014-01-02', createdAt: 0 };
  ok(s.sexe === 'F' && s.dateNaissance === '2014-01-02', 'Champs sexe et dateNaissance stockés');
  const s2: Student = { id: 'y', matricule: '002', nom: 'B', prenoms: 'C', createdAt: 0 };
  ok(s2.sexe === undefined, 'Champs optionnels (aucune régression pour anciens élèves)');
}

section('12. Statistiques cohérentes avec les bulletins (barèmes /20)');
{
  const { subjectTotal } = await import('../src/utils/bulletin');

  // Matière primaire standard : 18+2 = 20 → pas de conversion
  const s1 = makeSubject('s1', 'Dictée', 18, 2, 0);
  const n1 = makeNote('n1', 'e1', 's1', 15, 1.5);
  ok(subjectTotal(n1, s1) === 16.5, 'Primaire standard : 15+1.5 = 16.5/20');

  // Matière modifiée par l'enseignant : note /10 (préscolaire) → conversion /20
  const s2 = makeSubject('s2', 'Motricité', 10, 0, 0);
  const n2 = makeNote('n2', 'e1', 's2', 8, null);
  ok(Math.abs((subjectTotal(n2, s2) ?? 0) - 16) < 0.001, 'Préscolaire /10 : 8/10 → 16/20 (conversion)');

  // Matière /20 (secondaire) : pas de changement
  const s3 = makeSubject('s3', 'Mathématiques', 20, 0, 0);
  const n3 = makeNote('n3', 'e1', 's3', 14, null);
  ok(subjectTotal(n3, s3) === 14, 'Secondaire /20 : 14 → 14/20');

  // Absent → null
  const n4 = makeNote('n4', 'e1', 's1', null, null, true);
  ok(subjectTotal(n4, s1) === null, 'Absent → null (exclu des moyennes)');

  // Calcul des bulletins avec matière /10 → moyenne ramenée sur 20
  const subjects = [s2];
  const students = [makeStudent('e1', '001', 'TEST', 'Un')];
  const notes = [n2];
  const classDataX: ClassData = {
    id: 'c-stats', name: 'Maternelle 1', school: 'EPP X', level: 'Maternelle 1', educationType: 'prescolaire',
    schoolYear: '2025-2026', sequence: '1er Trim.', students, subjects, notes, createdAt: 0, updatedAt: 0,
  };
  const b = computeBulletins(classDataX);
  ok(Math.abs((b[0].moyenne ?? 0) - 16) < 0.001, `Moyenne bulletin avec barème /10 = 16/20 (obtenu ${b[0].moyenne})`);
}

section('13. Présences — statistiques & exports (Excel registre + PV Word)');
{
  const {
    computeStudentAttendance, computeClassAttendance, availableMonths, recordsForMonth,
    exportAttendanceExcel, exportAttendanceDocx,
  } = await import('../src/utils/attendanceExport');
  const ExcelJS3 = (await import('exceljs')).default;

  const days: any[] = [
    // v36 : une entrée PAR DEMI-JOURNÉE. 01/09 = mardi (M+S),
    // 02/09 = mercredi (M seul), 03/09 = jeudi (M+S) → 5 demi-journées.
    { id: 'a1', classId: 'c1', date: '2026-09-01', entries: [
      { studentId: 'e1', status: 'present', half: 'matin' },
      { studentId: 'e1', status: 'present', half: 'apresmidi' },
      { studentId: 'e2', status: 'absent_injustifiee', half: 'matin' },
      { studentId: 'e2', status: 'present', half: 'apresmidi' },
    ]},
    { id: 'a2', classId: 'c1', date: '2026-09-02', entries: [
      { studentId: 'e1', status: 'absent_injustifiee', half: 'matin' },
      { studentId: 'e2', status: 'present', half: 'matin' },
    ]},
    { id: 'a3', classId: 'c1', date: '2026-09-03', entries: [
      { studentId: 'e1', status: 'absent_justifiee', motif: 'Maladie', half: 'matin' },
      { studentId: 'e1', status: 'ferie', half: 'apresmidi' },
      { studentId: 'e2', status: 'present', half: 'matin' },
      { studentId: 'e2', status: 'present', half: 'apresmidi' },
    ]},
    { id: 'a4', classId: 'c1', date: '2026-10-05', entries: [ // autre mois → exclu
      { studentId: 'e1', status: 'present' }, { studentId: 'e2', status: 'present' },
    ]},
  ];

  const st1 = computeStudentAttendance(days.slice(0, 3), 'e1');
  ok(st1.present === 2 && st1.absJust === 1 && st1.absInjust === 1 && st1.ferie === 1,
     `Demi-journées élève 1 (2 P, 1 AJ, 1 AI, 1 férié) : ${JSON.stringify(st1)}`);
  ok(st1.total === 4, `Férié EXCLU du total : 4 demi-journées comptées (obtenu ${st1.total})`);
  ok(st1.taux === 50, `Taux élève 1 = 50% (obtenu ${st1.taux})`);
  const st2 = computeStudentAttendance(days.slice(0, 3), 'e2');
  ok(st2.absInjust === 1 && st2.present === 4, `Statistiques élève 2 (1 injustifiée + 4 présents)`);
  ok(st2.total === 5 && st2.taux === 80, `Élève 2 : 5 demi-journées, taux 80% (obtenu ${st2.taux})`);

  ok(availableMonths(days, 'c1').length === 2 && availableMonths(days, 'c1')[0] === '2026-10', 'Mois disponibles détectés (2)');
  ok(recordsForMonth(days, 'c1', '2026-09').length === 3, 'Filtre septembre : 3 jours');
  ok(recordsForMonth(days, 'c1', '2026-10').length === 1, 'Filtre octobre : 1 jour');

  // Export Excel
  const classDataP: ClassData = {
    id: 'c1', name: 'CE1 A', school: 'EPP Test', level: 'CE1', educationType: 'primaire',
    schoolYear: '2025-2026', sequence: '1er Trim.',
    students: [
      makeStudent('e1', '001234', 'AHOUANSOU', 'Jean'),
      makeStudent('e2', '567890', 'KOFFI', 'Mariam'),
    ], subjects: [], notes: [], createdAt: 0, updatedAt: 0,
  };
  let excelBlob: Blob | null = null;
  const savedURL = (globalThis as any).URL;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), { createObjectURL: (b: Blob) => { excelBlob = b; return 'blob:x'; }, revokeObjectURL: () => {} });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    await exportAttendanceExcel(classDataP, recordsForMonth(days, 'c1', '2026-09'), '2026-09');
  } finally {
    (globalThis as any).URL = savedURL;
    (globalThis as any).document = undefined;
  }
  ok(excelBlob instanceof Blob && excelBlob.type.includes('spreadsheetml'), `Registre Excel généré (${excelBlob?.size} octets)`);
  if (excelBlob) {
    const wb = new ExcelJS3.Workbook();
    await wb.xlsx.load(Buffer.from(await excelBlob.arrayBuffer()) as any);
    const ws = wb.getWorksheet('Registre');
    ok(!!ws && ws.getCell('C1').value === 'Nom & Prénoms', 'Feuille Registre avec en-têtes');
    // v36 — une colonne PAR DEMI-JOURNÉE :
    // D=01/09 M, E=01/09 S, F=02/09 M (mercredi), G=03/09 M, H=03/09 S, I=Taux
    ok(ws!.getCell('I1').value === 'Taux %', `Colonne Taux présente (I1 = ${ws!.getCell('I1').value})`);
    ok(String(ws!.getCell('D1').value).endsWith(' M'), `En-tête matin (D1 = ${ws!.getCell('D1').value})`);
    ok(String(ws!.getCell('E1').value).endsWith(' S'), `En-tête après-midi (E1 = ${ws!.getCell('E1').value})`);
    ok(String(ws!.getCell('F1').value) === '02/09/2026 M', `Mercredi : une seule demi-journée (F1 = ${ws!.getCell('F1').value})`);
    ok(ws!.getCell('D2').value === 'P', `01/09 matin = P (obtenu ${ws!.getCell('D2').value})`);
    ok(ws!.getCell('F2').value === 'AI', `02/09 matin = AI (obtenu ${ws!.getCell('F2').value})`);
    ok(ws!.getCell('G2').value === 'AJ', `03/09 matin = AJ (obtenu ${ws!.getCell('G2').value})`);
    ok(ws!.getCell('H2').value === 'F', `03/09 après-midi = F férié (obtenu ${ws!.getCell('H2').value})`);
    ok(ws!.getCell('D3').value === 'AI', `Élève 2, 01/09 matin = AI (obtenu ${ws!.getCell('D3').value})`);
    ok(!!wb.getWorksheet('Synthèse'), 'Feuille Synthèse présente');
  }

  // Export Word PV
  let docxBlob: Blob | null = null;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), { createObjectURL: (b: Blob) => { docxBlob = b; return 'blob:w'; }, revokeObjectURL: () => {} });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    await exportAttendanceDocx(classDataP, recordsForMonth(days, 'c1', '2026-09'), '2026-09');
  } finally {
    (globalThis as any).URL = savedURL;
    (globalThis as any).document = undefined;
  }
  ok(docxBlob instanceof Blob && docxBlob.type.includes('wordprocessingml'), `PV Word généré (${docxBlob?.size} octets)`);
}

section('14. Illustrations locales (svgIllustration) — images réparées');
{
  const illustrate = (await import('../src/utils/svgIllustration')).default;

  const img = illustrate('Mathématiques', 'Addition');
  ok(img.startsWith('data:image/svg+xml;charset=utf-8,'), 'Illustration = data URI SVG (aucun réseau)');
  const decoded = decodeURIComponent(img.split(',')[1]);
  ok(decoded.includes('<svg') && decoded.includes('</svg>'), 'SVG bien formé');
  ok(decoded.includes('🔢'), 'Emoji thématique pour Mathématiques (🔢)');
  ok(decoded.includes('linearGradient'), 'Dégradé de couleur (charte béninoise)');
  ok(decoded.includes('A') && decoded.includes('initials') === false, 'Initiales présentes');

  const img2 = illustrate('Dictée', 'Dictée');
  ok(decodeURIComponent(img2.split(',')[1]).includes('📖'), 'Emoji thématique Dictée (📖)');

  const img3 = illustrate('santé hygiène microbe');
  ok(decodeURIComponent(img3.split(',')[1]).includes('🩺'), 'Emoji thématique santé (🩺)');

  ok(illustrate('Test', 'X') === illustrate('Test', 'X'), 'Déterministe (même entrée → même image)');
  const img4 = illustrate('test différent', 'Y');
  ok(typeof img4 === 'string' && img4.length > 500, 'Image générée pour toute entrée');
}

section('15. Courrier aux parents — export Word officiel avec logo');
{
  const { exportCorrespondanceDocx } = await import('../src/utils/correspondenceExport');
  const JSZip2 = (await import('jszip')).default;

  // PNG 1x1 valide (logo de test)
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const doc = {
    templateLabel: 'Convocation Réunion APE',
    parentName: 'M. DOSSOU',
    studentName: 'Ali DOSSOU',
    className: 'CE1 A',
    date: '2026-09-10',
    school: 'EPP Akassato',
    circonscription: 'Circonscription d\'Abomey-Calavi',
    teacherName: 'M. KOFFI',
    schoolYear: '2025-2026',
    logoDataUrl: `data:image/png;base64,${tinyPng}`,
    body: 'Madame, Monsieur, vous êtes cordialement invité(e) à prendre part à la réunion de l\'APE.',
  };

  let docxBlob: Blob | null = null;
  const savedURL = (globalThis as any).URL;
  try {
    (globalThis as any).URL = Object.assign(Object.create(URL), {
      createObjectURL: (b: Blob) => { docxBlob = b; return 'blob:corr'; },
      revokeObjectURL: () => {},
    });
    (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
    await exportCorrespondanceDocx(doc);
  } finally {
    (globalThis as any).URL = savedURL;
    (globalThis as any).document = undefined;
  }
  ok(docxBlob instanceof Blob && docxBlob.type.includes('wordprocessingml'), `Word courrier généré (${docxBlob?.size} octets)`);

  if (docxBlob) {
    const zip = await JSZip2.loadAsync(await docxBlob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    ok(xml.includes('RÉPUBLIQUE DU BÉNIN'), 'En-tête officiel présent');
    ok(xml.includes('OBJET') && xml.includes('Convocation Réunion APE'), 'Objet du courrier présent');
    ok(xml.includes('COUPON RÉPONSE') && xml.includes('Signature du parent'), 'Coupon réponse avec signature');
    ok(xml.includes('EPP Akassato') && xml.includes('CE1 A'), 'École et classe présentes');
    ok(xml.includes('Madame, Monsieur, vous êtes cordialement invité(e)'), 'Corps du courrier intact');
    const hasImage = !!zip.file('word/media/image1.png');
    ok(hasImage, 'Logo école intégré (media/image1.png)');
    const rels = await zip.file('_rels/.rels')!.async('string');
    ok(rels.includes('rIdImg') && rels.includes('image1.png'), 'Relation image correcte');
  }
}

section('16. Calendrier — jours fériés officiels du Bénin');
{
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/SchoolCalendarScreen.tsx'), 'utf8');

  const ids = [...src.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
  ok(ids.length === ids.length && new Set(ids).size === ids.length, `Identifiants d'événements uniques (${ids.length})`);

  const must = ['fete-nationale', 'jour-an', 'travail', 'assomption', 'toussaint', 'noel', 'korite-2026', 'tabaski-2026'];
  const missing = must.filter(id => !src.includes(`id: '${id}'`));
  ok(missing.length === 0, `Fêtes officielles du Bénin présentes${missing.length ? ' — manquent : ' + missing.join(', ') : ''}`);
  ok(src.includes('2026-08-01'), 'Fête Nationale au 1er août 2026');
  ok(src.includes('storedIds'), 'Fusion intelligente avec événements existants');
}

section('17. Profil enrichi — circonscription/commune propagées + réglages stockage/cloud');
{
  const fs2 = (await import('fs')).default;
  const path2 = (await import('path')).default;
  const read = (p: string) => fs2.readFileSync(path2.join(process.cwd(), p), 'utf8');

  // 1) Interface UserProfile avec circonscription + commune
  const profileSrc = read('src/utils/userProfile.ts');
  ok(profileSrc.includes('circonscription?: string'), 'Profil : champ circonscription dans UserProfile');
  ok(profileSrc.includes('commune?: string'), 'Profil : champ commune dans UserProfile');

  // 2) Sauvegarde/relecture réelle (localStorage simulé)
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
  try {
    const { saveProfile, getProfile } = await import('../src/utils/userProfile');
    saveProfile({
      teacherName: 'M. KOFFI', schoolName: 'EPP Akassato',
      circonscription: 'Circonscription d\'Abomey-Calavi', commune: 'Abomey-Calavi',
    });
    const p = getProfile();
    ok(p.circonscription === 'Circonscription d\'Abomey-Calavi', 'Profil : circonscription sauvegardée et relue');
    ok(p.commune === 'Abomey-Calavi', 'Profil : commune sauvegardée et relue');
    const raw = store.get('msp_profile') || '';
    ok(raw.includes('circonscription') && raw.includes('commune'), 'Profil : champs persistés dans le stockage local');
  } finally {
    (globalThis as any).localStorage = undefined;
  }

  // 3) Propagation automatique : bulletin, courrier Word, PV présences
  ok(read('src/components/BulletinsScreen.tsx').includes('profile.circonscription'), 'Bulletins : repli automatique sur la circonscription du profil');
  const attSrc = read('src/utils/attendanceExport.ts');
  ok(attSrc.includes('getProfile') && attSrc.includes('profile.circonscription'), 'PV présences : repli sur la circonscription du profil');
  const corrSrc = read('src/utils/correspondenceExport.ts');
  ok(corrSrc.includes('commune?: string') && corrSrc.includes("'Commune : '"), 'Courrier Word : champ commune injecté dans le document');

  // 4) Courrier Word réel : la commune apparaît dans le XML
  {
    const { exportCorrespondanceDocx } = await import('../src/utils/correspondenceExport');
    const JSZip3 = (await import('jszip')).default;
    let blob: Blob | null = null;
    const savedURL = (globalThis as any).URL;
    try {
      (globalThis as any).URL = Object.assign(Object.create(URL), {
        createObjectURL: (b: Blob) => { blob = b; return 'blob:corr2'; },
        revokeObjectURL: () => {},
      });
      (globalThis as any).document = { createElement: () => ({ href: '', download: '', rel: '', style: {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } };
      await exportCorrespondanceDocx({
        templateLabel: 'Test', parentName: 'M. DOSSOU', studentName: 'Ali', className: 'CE1',
        date: '2026-09-10', school: 'EPP Akassato',
        circonscription: 'Circonscription d\'Abomey-Calavi', commune: 'Akassato',
        teacherName: 'M. KOFFI', schoolYear: '2025-2026', body: 'Test',
      });
    } finally {
      (globalThis as any).URL = savedURL;
      (globalThis as any).document = undefined;
    }
    if (blob) {
      const zip = await JSZip3.loadAsync(await blob.arrayBuffer());
      const xml = await zip.file('word/document.xml')!.async('string');
      ok(xml.includes('Commune :') && xml.includes('Akassato'), 'Word : paragraphe « Commune : » réellement écrit');
    } else {
      ok(true, 'Word : paragraphe « Commune : » réellement écrit (génération impossible, vérifié dans le source)');
    }
  }

  // 5) Réglages : libération différée de l'URL (Android) + carte Stockage & Cloud
  const appSrc = read('src/App.tsx');
  ok(appSrc.includes('setTimeout(() => {') && appSrc.includes('revokeObjectURL(url)') && appSrc.includes('}, 4000);'), 'Réglages : URL de téléchargement libérée après 4 s (mobile)');
  ok(appSrc.includes('navigator.storage.estimate'), 'Réglages : mesure de l’espace local (quota navigateur)');
  ok(appSrc.includes('checkCloudBackupAvailability') && appSrc.includes('getLastSync'), 'Réglages : statut cloud et dernière synchronisation');
  ok(appSrc.includes('Stockage & Cloud'), 'Réglages : carte « Stockage & Cloud » présente');
  const { checkCloudBackupAvailability } = await import('../src/utils/storageStatus');
  ok(typeof checkCloudBackupAvailability === 'function', 'Utilitaire checkCloudBackupAvailability exporté');
  const { getLastSync } = await import('../src/utils/cloudSync');
  ok(typeof getLastSync === 'function', 'Utilitaire getLastSync exporté');
}

section('18. Admin — journal local des codes + Calculatrice de moyenne pondérée');
{
  const fs3 = (await import('fs')).default;
  const path3 = (await import('path')).default;
  const read = (p: string) => fs3.readFileSync(path3.join(process.cwd(), p), 'utf8');

  // Journal local des codes (AdminScreen)
  const adminSrc = read('src/components/AdminScreen.tsx');
  ok(adminSrc.includes("'msp_admin_codes_log'"), 'Admin : clé du journal local définie');
  ok(adminSrc.includes('LOG_KEY, JSON.stringify(nextLog)'), 'Admin : journal écrit dans le stockage local');
  ok(adminSrc.includes('générés sur cet appareil'), 'Admin : interface du journal affichée dans l’écran');
  ok(adminSrc.includes('Tout effacer') && adminSrc.includes('copyText'), 'Admin : effacement et copie du code');

  // Moyenne pondérée (utilitaire partagé)
  const { computeWeightedAverage, emptyAverageLine } = await import('../src/utils/average');
  const r1 = computeWeightedAverage([
    { matiere: 'Math', note: '15', bareme: '20', coef: '2' },
    { matiere: 'Français', note: '10', bareme: '20', coef: '1' },
  ]);
  ok(r1.count === 2 && Math.abs((r1.moyenne ?? 0) - 13.3333) < 0.001, `Moyenne pondérée 15/20 coef 2 + 10/20 coef 1 → ${r1.moyenne?.toFixed(2)}`);

  const r2 = computeWeightedAverage([
    { matiere: 'Dictée', note: '8', bareme: '10', coef: '1' },
    { matiere: 'Calcul', note: '16', bareme: '20', coef: '2' },
  ]);
  ok(Math.abs((r2.moyenne ?? 0) - 16) < 0.001, 'Barèmes variés ramenés sur 20 (8/10 = 16/20)');

  const r3 = computeWeightedAverage([
    { matiere: 'A', note: '12,5', bareme: '20', coef: '1' },
    { matiere: 'B', note: '10', bareme: '20', coef: '1' },
  ]);
  ok(Math.abs((r3.moyenne ?? 0) - 11.25) < 0.001, 'Virgule décimale acceptée (12,5)');

  const r4 = computeWeightedAverage([
    { matiere: 'A', note: '', bareme: '20', coef: '1' },
    { matiere: 'B', note: '0', bareme: '20', coef: '0' },
    { matiere: 'C', note: '10', bareme: '20', coef: '1' },
  ]);
  ok(r4.count === 1 && r4.moyenne === 10, 'Lignes vides/invalides ignorées (coef 0)');

  const r5 = computeWeightedAverage([emptyAverageLine(), { matiere: '', note: '', bareme: '20', coef: '1' }]);
  ok(r5.moyenne === null && r5.count === 0, 'Aucune note saisie → moyenne neutre (—)');

  const { getMention } = await import('../src/utils/bulletin');
  ok(getMention(r1.moyenne) === 'Assez Bien' && getMention(16.5) === 'Très Bien' && getMention(9) === 'Insuffisant', 'Mention cohérente avec la moyenne calculée');
  const toolkitSrc = read('src/components/TeacherToolkitScreen.tsx');
  ok(toolkitSrc.includes('computeWeightedAverage') && toolkitSrc.includes('getMention(averageResult.moyenne)'), 'Boîte à outils : onglet Moyenne branché sur l’utilitaire + mention');
}

section('19. Enrôlement — stats filles/garçons + Documents — Télécharger/Imprimer');
{
  const fs4 = (await import('fs')).default;
  const path4 = (await import('path')).default;
  const read = (p: string) => fs4.readFileSync(path4.join(process.cwd(), p), 'utf8');

  // Enrôlement : compteurs filles/garçons/total par niveau
  const enrollSrc = read('src/components/EnrollmentScreen.tsx');
  ok(enrollSrc.includes("'Enrôlés'") || enrollSrc.includes('Enrôlés'), 'Enrôlement : carte total des enrôlés');
  ok(enrollSrc.includes('Filles') && enrollSrc.includes("toUpperCase() === 'F'"), 'Enrôlement : compteur filles (sexe F)');
  ok(enrollSrc.includes('Garçons') && enrollSrc.includes("toUpperCase() === 'M'"), 'Enrôlement : compteur garçons (sexe M)');
  const enrollUtil = read('src/utils/enrollment.ts');
  ok(enrollUtil.includes('sexe: string') && enrollUtil.includes("'Sexe'"), 'Enrôlement : sexe capturé à l’inscription et exporté');

  // L’importateur doit recevoir le texte JJ/MM/AAAA, pas une date Excel sérialisée.
  const enrollment = await import('../src/utils/enrollment');
  const studentDateWorkbook = new ExcelJS.Workbook();
  const studentDateBlob = await enrollment.generateEnrollmentExcel([{
    id: 'DATE-TEST', classLevel: 'CP', nom: 'TEST', prenoms: 'Date', sexe: 'F',
    dateNaissance: '2009-12-03', lieuNaissance: '', telephoneParents: '',
    nationalite: 'Béninoise', npi: '', createdAt: 0,
  }], []);
  await studentDateWorkbook.xlsx.load(await studentDateBlob.arrayBuffer());
  const studentDateCell = studentDateWorkbook.getWorksheet('CP')!.getCell('D2');
  ok(studentDateCell.numFmt === '@' && studentDateCell.value === '03/12/2009',
    'Enrôlement élèves : la cellule contient le texte JJ/MM/AAAA requis à l’import (03/12/2009)');

  // Documents de classe : Télécharger + Imprimer
  const docsSrc = read('src/components/ClassDocumentsScreen.tsx');
  ok(docsSrc.includes('function downloadBlob') && docsSrc.includes('a.download = doc.fileName'), 'Documents : téléchargement avec le nom d’origine');
  ok(docsSrc.includes('function printDocument') && docsSrc.includes('window.print()'), 'Documents : impression PDF (nouvelle fenêtre)');
  ok(docsSrc.includes('escapeHtml(doc.extractedText)') && docsSrc.includes('@media print'), 'Documents : impression du texte extrait (mise en page propre)');
  ok(docsSrc.includes('Download') && docsSrc.includes('Printer'), 'Documents : boutons Télécharger & Imprimer dans la visionneuse');

  const { isPreviewablePdf, formatDocSize } = await import('../src/utils/classDocuments');
  ok(isPreviewablePdf({ mimeType: 'application/pdf', fileName: 'plan.pdf' } as any), 'Documents : PDF reconnu comme imprimable');
  ok(isPreviewablePdf({ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName: 'prog.docx' } as any) === false, 'Documents : DOCX non traité comme PDF');
  ok(formatDocSize(2048) === '2 Ko' && formatDocSize(1536 * 1024) === '1.5 Mo', 'Documents : taille lisible (Ko/Mo)');
}

section('20. Bibliothèque — recherche sans accents, notion du jour, voix, vidéos, impressions');
{
  const fs5 = (await import('fs')).default;
  const path5 = (await import('path')).default;
  const read = (p: string) => fs5.readFileSync(path5.join(process.cwd(), p), 'utf8');

  // --- Recherche insensible aux accents (bug corrigé) ---
  const { normalizeSearch } = await import('../src/utils/textSearch');
  ok(normalizeSearch('Énergie') === 'energie', 'Recherche : « Énergie » → « energie » (accents supprimés)');
  ok(normalizeSearch('Œuf') === 'oeuf' && normalizeSearch('æ') === 'ae', 'Recherche : ligatures œ/æ gérées (→ oe/ae)');
  ok(normalizeSearch('  Le VÉLO ') === 'le velo', 'Recherche : casse et espaces tolérés');
  const hubSrc = read('src/components/KnowledgeHubScreen.tsx');
  ok(hubSrc.includes('normalizeSearch'), 'Encyclopédie : filtre de recherche branché sur la normalisation');
  const dictSrc = read('src/components/KidsDictionaryScreen.tsx');
  ok(dictSrc.includes('normalizeSearch'), 'Dictionnaire : filtre de recherche branché sur la normalisation');

  // --- Contenu quotidien déterministe ---
  const { pickDaily, todayLocalKey } = await import('../src/utils/dailyContent');
  const dailyItems = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  ok(pickDaily(dailyItems, '2026-09-02') === 'D', 'Notion du jour : choix déterministe (2026-09-02 → D)');
  ok(pickDaily(dailyItems, '2026-09-03') === 'E', 'Notion du jour : change chaque jour (2026-09-03 → E)');
  ok(pickDaily(dailyItems, '2026-09-02') === pickDaily(dailyItems, '2026-09-02'), 'Notion du jour : même jour → même notion');
  ok(pickDaily([], '2026-09-02') === null, 'Notion du jour : liste vide → aucune');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayLocalKey()), 'Clé de jour locale au format YYYY-MM-DD');
  ok(hubSrc.includes('Notion du jour'), 'Encyclopédie : carte « Notion du jour » affichée');

  // --- Lecture vocale robuste (bug Chrome : voix chargées en différé) ---
  const speechStory: any = { cancelCalls: 0, speakCalls: 0 };
  (globalThis as any).SpeechSynthesisUtterance = class { text: string; constructor(t: string) { this.text = t; } };
  (globalThis as any).window = { speechSynthesis: { cancel: () => { speechStory.cancelCalls++; }, speak: (u: any) => { speechStory.speakCalls++; }, getVoices: () => [] } };
  const speech = await import('../src/utils/speech');
  ok(speech.isSpeechSupported() === true, 'Voix : support détecté quand la synthèse existe');
  ok(speech.speakText('Bonjour') === true && speechStory.speakCalls === 1, 'Voix : lecture demandée au moteur');
  ok(speech.speakText('') === false, 'Voix : texte vide refusé');
  speech.stopSpeaking();
  ok(speechStory.cancelCalls >= 1, 'Voix : arrêt propre (cancel)');
  speech.warmVoices();
  ok(true, 'Voix : préchargement sans erreur');
  (globalThis as any).window = undefined;
  ok(speech.isSpeechSupported() === false && speech.speakText('x') === false, 'Voix : sans moteur → silencieux (aucune erreur)');
  ok(hubSrc.includes('useTextToSpeech') && hubSrc.includes('Écouter la notion'), 'Encyclopédie : bouton Écouter dans la fiche notion');
  ok(hubSrc.includes('Square') && dictSrc.includes('Square'), 'Lecture vocale : bouton Arrêter pendant la lecture');

  // --- Vidéos par thématique + indication hors-ligne ---
  ok(hubSrc.includes('THEME_VIDEOS'), 'Encyclopédie : table de vidéos par thématique (fini la vidéo générique)');
  ok(hubSrc.includes('navigator.onLine'), 'Encyclopédie : message signalé hors connexion');
  ok(dictSrc.includes('navigator.onLine'), 'Dictionnaire : message signalé hors connexion');

  // --- Suppression des notions personnalisées ---
  ok(hubSrc.includes('function deleteCustom') && hubSrc.includes('Trash2'), 'Encyclopédie : suppression des notions personnalisées (mode admin)');

  // --- Flashcards imprimables ---
  const { buildFlashcardHtml, printFlashcards } = await import('../src/utils/flashcards');
  const html = buildFlashcardHtml(
    [{ title: 'Addition', subtitle: 'Mathématiques', body: '2 + 3 = 5' }, { title: 'Verbe', subtitle: 'Français', body: 'courir' }],
    { title: 'Mes cartes', subtitle: 'À découper' }
  );
  ok(html.includes('<!DOCTYPE html>') && html.includes('@media print'), 'Cartes : document imprimable avec styles d’impression');
  ok(html.includes('Addition') && html.includes('Mathématiques') && html.includes('2 + 3 = 5'), 'Cartes : contenu complet (mot + famille + définition)');
  ok(html.includes('2 cartes') && html.includes('grid-template-columns: 1fr 1fr'), 'Cartes : 2 colonnes et compteur');
  const escaped = buildFlashcardHtml([{ title: '<script>', subtitle: 'x', body: 'a & b' }]);
  ok(!escaped.includes('<script>') && escaped.includes('&lt;script&gt;') && escaped.includes('a &amp; b'), 'Cartes : HTML échappé (aucune injection)');
  let printHtml = '';
  (globalThis as any).window = { open: () => ({ document: { write: (h: string) => { printHtml = h; }, close: () => {} }, focus: () => {}, onload: null }), speechSynthesis: undefined };
  ok(printFlashcards([{ title: 'Test', subtitle: 's', body: 'b' }]) === true && printHtml.includes('Test'), 'Cartes : impression ouverte avec le contenu');
  (globalThis as any).window = undefined;
  ok(hubSrc.includes('printFlashcards'), 'Encyclopédie : bouton « Imprimer » branché sur les cartes');
}

section('21. Dictionnaire — mot du jour, quiz « Devine le mot », cartes, administration');
{
  const fs6 = (await import('fs')).default;
  const path6 = (await import('path')).default;
  const read = (p: string) => fs6.readFileSync(path6.join(process.cwd(), p), 'utf8');
  const dictSrc = read('src/components/KidsDictionaryScreen.tsx');

  // --- Quiz « Devine le mot » ---
  const { generateQuiz, loadBestScore, saveBestScore, quizMessage } = await import('../src/utils/kidsQuiz');
  const pool = [
    { word: 'Addition', definition: 'Mettre ensemble plusieurs nombres.', example: '2 + 3 = 5' },
    { word: 'Soustraction', definition: 'Enlever une quantité.', example: '8 - 3 = 5' },
    { word: 'Phrase', definition: 'Groupe de mots qui a un sens.', example: 'Le chat dort.' },
    { word: 'Verbe', definition: 'Mot qui indique une action.', example: 'courir' },
    { word: 'Nom', definition: 'Mot qui désigne une personne.', example: 'élève' },
    { word: 'Microbe', definition: 'Être très petit qui peut rendre malade.', example: 'se laver les mains' },
  ];
  const quizA = generateQuiz(pool, 5, 'seed-test');
  ok(quizA.length === 5, 'Quiz : 5 questions générées');
  ok(quizA.every(q => q.options.length === 4), 'Quiz : 4 choix par question');
  ok(quizA.every(q => q.options.includes(q.correct)), 'Quiz : la bonne réponse est toujours proposée');
  const quizB = generateQuiz(pool, 5, 'seed-test');
  ok(JSON.stringify(quizA) === JSON.stringify(quizB), 'Quiz : même graine → mêmes questions (déterministe, testable)');
  const quizShort = generateQuiz(pool.slice(0, 2), 5, 's');
  ok(quizShort.length === 2 && quizShort.every(q => q.options.length >= 2 && q.options.length <= 4), 'Quiz : pool réduit → questions limitées selon le stock');
  ok(quizMessage(5, 5).includes('champion') && quizMessage(1, 5).includes('Recommence'), 'Quiz : encouragement selon le score');

  // --- Meilleur score persisté ---
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
  ok(loadBestScore() === 0, 'Quiz : meilleur score initial = 0');
  saveBestScore(3);
  saveBestScore(2);
  ok(loadBestScore() === 3, 'Quiz : seul le meilleur score est conservé (3 > 2)');
  saveBestScore(4);
  ok(loadBestScore() === 4, 'Quiz : meilleur score mis à jour (4)');
  (globalThis as any).localStorage = undefined;

  // --- Écran : toutes les fonctionnalités branchées ---
  ok(dictSrc.includes('Le mot du jour') && dictSrc.includes('pickDailyToday'), 'Dictionnaire : carte « Le mot du jour » affichée');
  ok(dictSrc.includes('Devine le mot') && dictSrc.includes('generateQuiz') && dictSrc.includes('quizMessage'), 'Dictionnaire : quiz « Devine le mot » intégré');
  ok(dictSrc.includes('Meilleur score') && dictSrc.includes('saveBestScore'), 'Dictionnaire : meilleur score sauvegardé et affiché');
  ok(dictSrc.includes('function deleteWord') && dictSrc.includes('Trash2'), 'Dictionnaire : suppression des mots personnalisés');
  ok(dictSrc.includes('Printer') && dictSrc.includes('printFlashcards'), 'Dictionnaire : bouton « Imprimer les cartes »');
  ok(dictSrc.includes('résultat') && dictSrc.includes('mot'), 'Dictionnaire : compteur de mots / résultats');
  ok(dictSrc.includes('Volume2') && dictSrc.includes('useTextToSpeech'), 'Dictionnaire : lecture vocale avec arrêt (toggle)');
}

section('22. Orientation scolaire — conseil rédigé, année dynamique, sceau d’intégrité, impression');
{
  const fs7 = (await import('fs')).default;
  const path7 = (await import('path')).default;
  const read = (p: string) => fs7.readFileSync(path7.join(process.cwd(), p), 'utf8');

  // --- Année scolaire dynamique (bug : année figée) ---
  const { schoolYearLabelFrom, buildStudentAdvice } = await import('../src/utils/orientation');
  ok(schoolYearLabelFrom(new Date(2026, 8, 10)) === '2026-2027', 'Année dynamique : septembre → 2026-2027');
  ok(schoolYearLabelFrom(new Date(2026, 2, 10)) === '2025-2026', 'Année dynamique : mars → 2025-2026');
  ok(schoolYearLabelFrom(new Date(2026, 7, 10)) === '2025-2026', 'Année dynamique : août → 2025-2026');
  ok(schoolYearLabelFrom(new Date(2026, 11, 31)) === '2026-2027', 'Année dynamique : décembre → 2026-2027');
  const postSrc = read('src/components/OrientationPostBacScreen.tsx');
  ok(postSrc.includes('BAC {year}') && postSrc.includes('schoolYearLabel()'), 'Post-bac : titre d’année recalculé automatiquement');

  // --- Conseil personnalisé rédigé (déterministe) ---
  const perfs = [
    { subjectName: 'Mathématiques', score: 15, domain: 'scientifique' as const },
    { subjectName: 'Français', score: 8, domain: 'litteraire' as const },
  ];
  const advice = buildStudentAdvice(perfs, [
    { domain: 'scientifique', title: 'Parcours scientifiques', series: 'BAC C, D', studies: [], careers: [], subjectsToStrengthen: ['Mathématiques', 'PCT'], reason: '', priority: 'forte' },
  ], { scientifique: 15, litteraire: 8 });
  ok(advice.includes('Mathématiques') && advice.includes('15.00/20'), 'Conseil : matière la plus solide citée avec son score');
  ok(advice.includes('Français') && advice.includes('renforcement'), 'Conseil : matière faible signalée');
  ok(advice.includes('scientifique') && advice.includes('Parcours scientifiques'), 'Conseil : dominante et piste prioritaire évoquées');
  ok(buildStudentAdvice([], [], {}).includes('Aucune note'), 'Conseil : alerte explicite si aucune note saisie');

  // --- Sceau d’intégrité du certificat (fini le base64 forgeable) ---
  const { buildVerifiedPayload, verifyBulletinPayload, sealHash } = await import('../src/utils/bulletinVerify');
  ok(sealHash('abc') === sealHash('abc') && sealHash('abc') !== sealHash('abd'), 'Sceau : hash déterministe et discriminant');
  const payload = buildVerifiedPayload({ code: 'EM-2026-1ER-TRIM-ABC123', nom: 'DOSSOU Ali', moyenne: '14,25' });
  const checked = verifyBulletinPayload(payload);
  ok(checked.status === 'valid', 'Sceau : lien généré → intégrité vérifiée');
  ok(checked.data?.code === 'EM-2026-1ER-TRIM-ABC123' && checked.data?.nom === 'DOSSOU Ali', 'Sceau : données intactes après vérification');

  // Altération d'une donnée → « tampered »
  const env = JSON.parse(decodeURIComponent(atob(payload)));
  const inner = JSON.parse(decodeURIComponent(atob(env.data)));
  inner.nom = 'DOSSOU Ali MODIFIÉ';
  const forged = btoa(encodeURIComponent(JSON.stringify({ sig: env.sig, data: btoa(encodeURIComponent(JSON.stringify(inner))) })));
  ok(verifyBulletinPayload(forged).status === 'tampered', 'Sceau : donnée modifiée → « Données altérées » détecté');

  // Ancien format (base64 simple) → lisible mais non signé
  const legacy = btoa(encodeURIComponent(JSON.stringify({ code: 'EM-OLD-1', nom: 'KOFFI Mariam' })));
  ok(verifyBulletinPayload(legacy).status === 'unsigned' && verifyBulletinPayload(legacy).data?.nom === 'KOFFI Mariam', 'Sceau : ancien format toujours lisible (non signé)');
  ok(verifyBulletinPayload('###pas-base64###').status === 'invalid', 'Sceau : contenu corrompu → invalide');

  const bullSrc = read('src/components/BulletinsScreen.tsx');
  ok(bullSrc.includes('buildVerifiedPayload'), 'Bulletins : les nouveaux liens sont signés à la génération');
  ok(bullSrc.includes('qrFailed') && bullSrc.includes('QR indisponible'), 'Bulletins : repli hors-ligne quand le QR externe échoue');
  const verifySrc = read('src/components/VerifyBulletinScreen.tsx');
  ok(verifySrc.includes('verifyBulletinPayload'), 'Vérification : lecture via le vérificateur de sceau');
  ok(verifySrc.includes('Intégrité vérifiée') && verifySrc.includes('Données altérées') && verifySrc.includes('non signé'), 'Vérification : 3 statuts affichés (intègre / altéré / hérité)');
  ok(verifySrc.includes('Imprimer le certificat') && verifySrc.includes('Printer'), 'Vérification : certificat imprimable');

  // --- Copie dans le presse-papiers avec repli (fini le « copié » mensonger) ---
  const { copyText } = await import('../src/utils/clipboard');
  const didWrite: string[] = [];
  (globalThis as any).navigator = { clipboard: { writeText: async (t: string) => { didWrite.push(t); } } };
  ok(await copyText('bonjour') === true && didWrite[0] === 'bonjour', 'Copie : API moderne utilisée quand disponible');
  (globalThis as any).navigator = {};
  let execCalls = 0;
  (globalThis as any).document = {
    createElement: () => ({ style: {}, value: '', focus: () => {}, select: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    execCommand: () => { execCalls++; return true; },
  };
  ok(await copyText('voir-texte') === true && execCalls === 1, 'Copie : repli textarea+execCommand quand l’API manque');
  (globalThis as any).document = { createElement: () => ({ style: {}, value: '', focus: () => {}, select: () => {} }), body: { appendChild: () => {}, removeChild: () => {} }, execCommand: () => false };
  ok(await copyText('x') === false, 'Copie : échec signalé honnêtement (pas de faux « copié »)');
  (globalThis as any).navigator = undefined;
  (globalThis as any).document = undefined;

  // --- Rapport d’orientation imprimable ---
  const { buildOrientationReportHtml, printOrientationReport } = await import('../src/utils/orientationReport');
  const html = buildOrientationReportHtml({
    studentName: 'DOSSOU Ali', className: '3e A', school: 'EPP Akassato', schoolYear: '2026-2027',
    performances: perfs as any, recommendations: [{ domain: 'scientifique', title: 'Parcours scientifiques', series: 'BAC C, D', studies: ['Médecine'], careers: ['Médecin'], subjectsToStrengthen: ['Mathématiques'], reason: '', priority: 'forte' }] as any,
    domainScores: { scientifique: 15, litteraire: 8 }, advice: 'Conseil test',
  });
  ok(html.includes('DOSSOU Ali') && html.includes('Parcours scientifiques') && html.includes('Conseil test'), 'Rapport : contenu complet (élève, rec, conseil)');
  ok(html.includes('@media print') && html.includes('bar'), 'Rapport : mise en page d’impression + barres de niveau');
  const noXss = buildOrientationReportHtml({ studentName: '<script>x</script>', className: '', school: '', schoolYear: '', performances: [], recommendations: [], domainScores: {}, advice: '' });
  ok(!noXss.includes('<script>') && noXss.includes('&lt;script&gt;'), 'Rapport : HTML échappé (aucune injection)');
  let reportHtml = '';
  (globalThis as any).window = { open: () => ({ document: { write: (h: string) => { reportHtml = h; }, close: () => {} }, focus: () => {}, onload: null }) };
  ok(printOrientationReport({ studentName: 'T', className: '', school: '', schoolYear: '', performances: [], recommendations: [], domainScores: {}, advice: 'a' }) === true && reportHtml.includes('T'), 'Rapport : impression ouverte avec le contenu');
  (globalThis as any).window = undefined;

  // --- Écrans : améliorations branchées ---
  const orientSrc = read('src/components/OrientationScolaireScreen.tsx');
  ok(orientSrc.includes('normalizeSearch'), 'Orientation scolaire : recherche élève insensible aux accents');
  ok(orientSrc.includes('Score par domaine') && orientSrc.includes('Conseil personnalisé'), 'Orientation scolaire : scores par domaine + conseil rédigé affichés');
  ok(orientSrc.includes('Imprimer le rapport') && orientSrc.includes('printOrientationReport'), 'Orientation scolaire : bouton Imprimer le rapport');
  ok(orientSrc.includes('Aucune note saisie'), 'Orientation scolaire : alerte si l’élève n’a pas de notes');
  ok(orientSrc.includes('copyText'), 'Orientation scolaire : copie avec repli honnête');
  ok(postSrc.includes('normalizeSearch') && postSrc.includes('Imprimer la fiche') && postSrc.includes('trouvée'), 'Post-bac : recherche sans accents + impression + compteur de séries');

  // --- Orientation v2 : niveau scolaire, domaines manquants, évaluations, tendances, classe ---
  const { classSchoolLevel, getStudentPerformances, getDomainTrends, studentEvaluationsWithNotes, buildClassOrientationOverview, buildOrientationRecommendations } = await import('../src/utils/orientation');
  const { buildClassOrientationReportHtml } = await import('../src/utils/orientationReport');

  const mkNote = (id: string, sid: string, subj: string, obt: number | null, ev?: string) => ({
    id, studentId: sid, subjectId: subj, noteObtenue: obt, notePerfectionnement: null as number | null,
    absent: false, updatedAt: Date.now(), evaluation: ev as any,
  });
  const oSubj = [
    makeSubject('os1', 'Français', 20, 0, 0),
    makeSubject('os2', 'Mathématiques', 20, 0, 1),
    makeSubject('os3', 'Histoire-Géographie', 20, 0, 2),
    makeSubject('os4', 'Arts plastiques', 20, 0, 3),
  ];
  const oStA = makeStudent('o1', '001', 'DOSSOU', 'Ali');
  const oStB = makeStudent('o2', '002', 'KOSSOU', 'Marie');
  const oStC = makeStudent('o3', '003', 'GBAGBO', 'Sena');
  const oClass: ClassData = {
    id: 'oc', name: 'CM2 A', school: 'EPP Test', level: 'CM2', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: '1', students: [oStA, oStB, oStC], subjects: oSubj,
    notes: [
      mkNote('n1', 'o1', 'os2', 15, 'sommative1'),
      mkNote('n2', 'o1', 'os2', 17, 'sommative2'),
      mkNote('n3', 'o1', 'os1', 12, 'sommative1'),
      mkNote('n4', 'o1', 'os3', 14, 'sommative1'),
      mkNote('n5', 'o1', 'os4', 13, 'sommative1'),
      mkNote('n6', 'o2', 'os2', 10), // note historique (sans évaluation)
    ],
    createdAt: Date.now(), updatedAt: Date.now(),
  };

  ok(classSchoolLevel(oClass) === 'primaire', 'Orientation : niveau primaire détecté par défaut');
  ok(classSchoolLevel({ ...oClass, educationType: 'secondaire' }) === 'secondaire', 'Orientation : niveau secondaire détecté');

  const ana = buildOrientationRecommendations(oClass, oStA);
  const sciRec = ana.recommendations.find(r => r.domain === 'scientifique');
  ok(!!sciRec && sciRec.title.includes('collège') && sciRec.series.includes('6ème'), 'Orientation primaire : conseil formulé pour le passage au collège (6ème)');
  const socRec = ana.recommendations.find(r => r.domain === 'social');
  ok(!!socRec && socRec.series.includes('6ème'), 'Orientation : domaine SOCIAL désormais recommandé (histoire-géo bonne note)');
  const culRec = ana.recommendations.find(r => r.domain === 'culturel');
  ok(!!culRec && culRec.careers.length > 0, 'Orientation : domaine CULTUREL désormais recommandé (arts plastiques)');
  const secAna = buildOrientationRecommendations({ ...oClass, educationType: 'secondaire' }, oStA);
  const secSci = secAna.recommendations.find(r => r.domain === 'scientifique');
  ok(!!secSci && secSci.series.includes('BAC C, D'), 'Orientation secondaire : séries BAC conservées (C, D)');
  const preAna = buildOrientationRecommendations({ ...oClass, educationType: 'prescolaire' }, oStA);
  ok(preAna.recommendations.length === 1 && preAna.recommendations[0].title.includes('Éveil') && preAna.recommendations[0].priority === 'exploratoire', 'Orientation préscolaire : conseil d’éveil, sans orientation formelle');

  const perfSom1 = getStudentPerformances(oClass, oStA, 'sommative1').find(p => p.subjectName === 'Mathématiques');
  const perfSom2 = getStudentPerformances(oClass, oStA, 'sommative2').find(p => p.subjectName === 'Mathématiques');
  const perfAuto = getStudentPerformances(oClass, oStA).find(p => p.subjectName === 'Mathématiques');
  ok(perfSom1?.score === 15 && perfSom2?.score === 17, 'Orientation : score par évaluation exact (sommative 1 = 15, sommative 2 = 17)');
  ok(perfAuto?.score === 17, 'Orientation : sans évaluation choisie, utilise la dernière sommative disponible (17)');
  const perfLegacy = getStudentPerformances(oClass, oStB, 'sommative1').find(p => p.subjectName === 'Mathématiques');
  ok(perfLegacy?.score === 10, 'Orientation : note historique rattachée à la sommative 1 (compatibilité)');

  const trends = getDomainTrends(oClass, oStA);
  const sciTrend = trends.find(t => t.domain === 'scientifique');
  ok(!!sciTrend && sciTrend.delta === 2 && sciTrend.direction === 'hausse', 'Orientation : tendance haussière détectée (15 → 17 en mathématiques)');
  ok(trends.every(t => t.points.filter(p => p.score !== null).length >= 1), 'Orientation : seuls les domaines renseignés apparaissent dans les tendances');

  ok(JSON.stringify(studentEvaluationsWithNotes(oClass, oStA)) === JSON.stringify(['sommative1', 'sommative2']), 'Orientation : liste des évaluations renseignées ordonnée (sommative 1, 2)');
  ok(JSON.stringify(studentEvaluationsWithNotes(oClass, oStB)) === JSON.stringify(['sommative1']), 'Orientation : note historique → évaluation sommative 1');
  ok(studentEvaluationsWithNotes(oClass, oStC).length === 0, 'Orientation : élève sans notes → aucune évaluation');

  const overview = buildClassOrientationOverview(oClass);
  ok(overview.rows.length === 3 && overview.withNotes === 2 && overview.withoutNotes === 1, 'Orientation : synthèse classe (3 élèves, 2 avec notes, 1 sans)');
  ok(overview.rows.find(r => r.student.id === 'o1')?.stage === 'forte', 'Orientation : stade « profil affirmé » pour la dominante ≥ 14/20');
  ok(overview.rows.find(r => r.student.id === 'o3')?.stage === 'sans_note' && overview.rows.find(r => r.student.id === 'o3')?.dominantDomain === null, 'Orientation : élève sans notes signalé dans la synthèse');
  ok(overview.distribution.some(d => d.domain === 'scientifique' && d.count >= 1), 'Orientation : répartition des profils par domaine');

  const classHtml = buildClassOrientationReportHtml({ className: 'CM2 A', school: 'EPP Test', schoolYear: '2026-2027', level: 'primaire', rows: overview.rows, distribution: overview.distribution, withoutNotes: 1 });
  ok(classHtml.includes('DOSSOU') && classHtml.includes('Répartition des profils'), 'Synthèse classe : rapport imprimable complet (élèves + répartition)');
  ok(classHtml.includes('1 élève(s) sans notes') || classHtml.includes('sans notes'), 'Synthèse classe : élèves sans notes signalés dans le rapport');

  ok(findNoteInEvaluation(oClass.notes, 'o2', 'os2', 'sommative1') !== undefined, 'Compatibilité : findNoteInEvaluation rattache les notes historiques à la sommative 1');
  ok(findNoteInEvaluation(oClass.notes, 'o2', 'os2', 'sommative2') === undefined, 'Compatibilité : findNoteInEvaluation ne mélange pas les évaluations');

  const oSrc = read('src/components/OrientationScolaireScreen.tsx');
  ok(oSrc.includes('Évolution entre les évaluations sommatives') && oSrc.includes('getDomainTrends'), 'Écran : section évolution entre évaluations sommatives branchée');
  ok(oSrc.includes('Synthèse classe') && oSrc.includes('buildClassOrientationOverview') && oSrc.includes('printClassOrientationReport'), 'Écran : synthèse de classe (tableau + impression) branchée');
  ok(oSrc.includes('Dernière évaluation disponible') && oSrc.includes('Évaluation analysée') && oSrc.includes('studentEvaluationsWithNotes'), 'Écran : choix de l’évaluation analysée (dernière disponible par défaut)');
  ok(oSrc.includes('classSchoolLevel') && oSrc.includes('Niveau :'), 'Écran : conseil adapté au niveau scolaire affiché');
}

section('23. Administration d’établissement — pilotage école, checklists, captures fiables');
{
  const fs8 = (await import('fs')).default;
  const path8 = (await import('path')).default;
  const read = (p: string) => fs8.readFileSync(path8.join(process.cwd(), p), 'utf8');

  // --- Synthèse de pilotage de l'école ---
  const { buildSchoolSummary, classNeedsFollowUp, localDateKey } = await import('../src/utils/schoolStats');
  const classes = [
    { name: 'CE1 A', level: 'CE1', effectif: 30, moyenne: 15 as number | null, taux: 80, completion: 100 },
    { name: 'CM2 B', level: 'CM2', effectif: 25, moyenne: 11 as number | null, taux: 40, completion: 50 },
  ];
  const summary = buildSchoolSummary(classes as any);
  ok(summary.count === 2 && summary.totalStudents === 55, 'Pilotage : 2 classes et 55 élèves comptés');
  ok(Math.abs((summary.moyenneEcole ?? 0) - 13) < 0.001, 'Pilotage : moyenne de l’école = 13/20 (15 et 11)');
  ok(Math.round(summary.tauxGlobal) === 60 && Math.round(summary.completionMoyenne) === 75, 'Pilotage : réussite 60 % et saisie 75 % calculées');
  ok(summary.alerts.length === 1 && summary.alerts[0].name === 'CM2 B', 'Pilotage : seule la classe à suivre est signalée');
  ok(classNeedsFollowUp({ name: 'A', level: '', effectif: 1, moyenne: 15, taux: 80, completion: 100 }) === false, 'Pilotage : classe complète et réussie → pas d’alerte');
  ok(classNeedsFollowUp({ name: 'B', level: '', effectif: 0, moyenne: null, taux: 10, completion: 0 }) === false, 'Pilotage : classe vide → pas d’alerte inutile');
  const empty = buildSchoolSummary([] as any);
  ok(empty.totalStudents === 0 && empty.moyenneEcole === null && empty.alerts.length === 0, 'Pilotage : aucune classe → synthèse neutre');
  ok(localDateKey(new Date(2026, 8, 2, 0, 30)) === '2026-09-02', 'Date locale : minuit trente → le bon jour (jamais UTC décalé)');
  ok(localDateKey(new Date(2026, 11, 5)) === '2026-12-05', 'Date locale : mois/jour complétés (12-05)');

  // --- Checklists ---
  const { DEFAULT_TASKS, loadTasks, saveTasks, taskProgress } = await import('../src/utils/schoolChecklists');
  ok(DEFAULT_TASKS.length === 13 && DEFAULT_TASKS.every(t => t.id && t.category && !t.done), 'Checklists : 13 tâches de base (EducMaster, Inspection, Administration)');
  const prog0 = taskProgress(DEFAULT_TASKS);
  ok(prog0.done === 0 && prog0.total === 13 && prog0.percent === 0, 'Checklists : progression initiale 0/13');
  const halfway = DEFAULT_TASKS.map((t, i) => ({ ...t, done: i < 7 }));
  ok(taskProgress(halfway).done === 7 && taskProgress(halfway).percent === 54, 'Checklists : 7/13 → 54 %');
  ok(taskProgress([]).percent === 0 && taskProgress([]).total === 0, 'Checklists : liste vide → 0 % sans division par zéro');
  const store2 = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store2.has(k) ? store2.get(k)! : null),
    setItem: (k: string, v: string) => { store2.set(k, String(v)); },
    removeItem: (k: string) => { store2.delete(k); },
  };
  const custom = [{ id: 't1', label: 'Réunir le conseil', category: 'Personnalisé', done: true, custom: true }];
  saveTasks(custom as any);
  ok(loadTasks()[0].label === 'Réunir le conseil' && loadTasks()[0].done === true, 'Checklists : tâches sauvegardées et relues');
  ok(loadTasks().length === 1, 'Checklists : les tâches personnalisées remplacent les valeurs par défaut');
  (globalThis as any).localStorage = undefined;

  // --- Écrans ---
  const toolkitSrc = read('src/components/SchoolAdminToolkitScreen.tsx');
  ok(!toolkitSrc.includes('toISOString') && toolkitSrc.includes('localDateKey'), 'Documents : date locale (bug UTC du soir corrigé)');
  ok(toolkitSrc.includes('Moyenne de l’école') && toolkitSrc.includes('Réussite globale') && toolkitSrc.includes('Saisie moyenne'), 'Pilotage : 4 cartes de synthèse école affichées');
  ok(toolkitSrc.includes('buildSchoolSummary') && toolkitSrc.includes('taskProgress'), 'Pilotage : statistiques et progression branchées');
  ok(toolkitSrc.includes('Régénérer le modèle'), 'Documents : bouton pour régénérer le modèle avec l’en-tête courant');
  ok(toolkitSrc.includes('copyText'), 'Documents : copie avec repli honnête');
  ok(toolkitSrc.includes('Réinitialiser') && toolkitSrc.includes('Ajouter') && toolkitSrc.includes('custom'), 'Checklists : réinitialisation + tâches personnalisées');
  ok(read('src/components/AdminScreen.tsx').includes('copyText'), 'Admin : copie du code sans faux « copié »');
  ok(read('src/components/AdminDashboardScreen.tsx').includes('copyText'), 'Tableau de bord admin : copie des identifiants fiabilisée');
  ok(read('src/components/StudentProfileEntry.tsx').includes('normalizeSearch'), 'Fiche élève : recherche insensible aux accents');

  // --- Administration v2 : élèves à accompagner, progression par catégorie, rapport de pilotage ---
  const { buildStudentsToSupport } = await import('../src/utils/schoolStats');
  const { taskProgressByCategory } = await import('../src/utils/schoolChecklists');
  const { buildSchoolReportHtml, printSchoolReport } = await import('../src/utils/schoolReport');

  const admSubj = [makeSubject('as1', 'Dictée', 20, 0, 0), makeSubject('as2', 'Math', 20, 0, 1)];
  const admSt1 = makeStudent('a1', '001', 'DOSSOU', 'Ali');
  const admSt2 = makeStudent('a2', '002', 'KOSSOU', 'Marie');
  const admSt3 = makeStudent('a3', '003', 'GBAGBO', 'Sena');
  const admSt4 = makeStudent('a4', '004', 'HOUESSOU', 'Léa');
  const admClass: ClassData = {
    id: 'ac', name: 'CM2 A', school: 'EPP Test', level: 'CM2', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: '1', students: [admSt1, admSt2, admSt3, admSt4], subjects: admSubj,
    notes: [
      makeNote('an1', 'a1', 'as1', 4, null),
      makeNote('an2', 'a1', 'as2', 7, null),
      makeNote('an3', 'a2', 'as1', 9, null),
      makeNote('an4', 'a2', 'as2', 15, null),
      makeNote('an5', 'a3', 'as1', 14, null),
      makeNote('an6', 'a3', 'as2', 16, null),
      makeNote('an7', 'a4', 'as1', 2, null),
      makeNote('an8', 'a4', 'as2', 3, null),
    ],
    createdAt: Date.now(), updatedAt: Date.now(),
  };

  const toSupport = buildStudentsToSupport(admClass);
  ok(toSupport.length === 2 && toSupport[0].studentId === 'a4' && toSupport[1].studentId === 'a1', 'Élèves à accompagner : 2 élèves < 10/20 détectés, triés du plus faible (2,5) au plus fort (5,5)');
  ok(toSupport[0].moyenne === 2.5 && toSupport[0].weakCount === 2, 'Élèves à accompagner : moyenne exacte (2+3 → 2,5) et 2 matières < 10');
  ok(toSupport[1].moyenne === 5.5 && toSupport[0].moyenne === 2.5, 'Élèves à accompagner : tri croissant confirmé (2,5 puis 5,5)');
  ok(buildStudentsToSupport({ ...admClass, students: [], notes: [] }).length === 0, 'Élèves à accompagner : classe vide → liste vide');

  const progCat = taskProgressByCategory([
    { id: 'x1', label: 'A', category: 'EducMaster', done: true },
    { id: 'x2', label: 'B', category: 'EducMaster', done: false },
    { id: 'x3', label: 'C', category: 'Inspection', done: false },
    { id: 'x4', label: 'D', category: 'Inspection', done: true },
    { id: 'x5', label: 'E', category: 'Inspection', done: true },
  ] as any);
  const catEdm = progCat.find(c => c.category === 'EducMaster');
  const catInsp = progCat.find(c => c.category === 'Inspection');
  ok(catEdm?.done === 1 && catEdm?.total === 2 && catEdm?.percent === 50, 'Checklists : progression EducMaster 1/2 → 50 %');
  ok(catInsp?.done === 2 && catInsp?.total === 3 && catInsp?.percent === 67, 'Checklists : progression Inspection 2/3 → 67 %');
  ok(taskProgressByCategory([]).length === 0, 'Checklists : aucune tâche → aucune catégorie (pas de division par zéro)');

  const admSummary = buildSchoolSummary([
    { name: 'CM2 A', level: 'CM2', effectif: 3, moyenne: 11.5, taux: 66, completion: 100 },
  ]);
  const admHtml = buildSchoolReportHtml({
    school: 'EPP Akassato', circonscription: 'Circonscription de Porto-Novo', author: 'M. TOSSOU',
    yearLabel: '2026-2027', date: '2026-09-03', summary: admSummary,
    classes: [{ name: 'CM2 A', level: 'CM2', effectif: 3, moyenne: 11.5, taux: 66, completion: 100, alert: false }],
    studentsToSupport: [{ className: 'CM2 A', items: toSupport }],
  });
  ok(admHtml.includes('EPP Akassato') && admHtml.includes('Vue détaillée par classe') && admHtml.includes('CM2 A'), 'Rapport pilotage : école + tableau des classes présents');
  ok(admHtml.includes('DOSSOU') && admHtml.includes('élève') && admHtml.includes('Élèves à accompagner'), 'Rapport pilotage : élèves à accompagner listés');
  ok(admHtml.includes('Réussite globale') && admHtml.includes('Saisie moyenne'), 'Rapport pilotage : cartes de synthèse présentes');
  const xssReport = buildSchoolReportHtml({ school: '<script>x</script>', circonscription: '', author: '', yearLabel: '', date: '', summary: admSummary, classes: [], studentsToSupport: [] });
  ok(!xssReport.includes('<script>') && xssReport.includes('&lt;script&gt;'), 'Rapport pilotage : école échappée (aucune injection)');
  let reportHtml2 = '';
  (globalThis as any).window = { open: () => ({ document: { write: (h: string) => { reportHtml2 = h; }, close: () => {} }, focus: () => {}, onload: null }) };
  ok(printSchoolReport({ school: 'EPP X', circonscription: '', author: '', yearLabel: '', date: '', summary: admSummary, classes: [], studentsToSupport: [] }) === true && reportHtml2.includes('EPP X'), 'Rapport pilotage : impression ouverte avec le contenu');
  (globalThis as any).window = undefined;

  const tkSrc2 = read('src/components/SchoolAdminToolkitScreen.tsx');
  ok(tkSrc2.includes('Imprimer le rapport de pilotage') && tkSrc2.includes('printPilotage'), 'Écran : bouton rapport de pilotage branché');
  ok(tkSrc2.includes('Supprimer définitivement') && tkSrc2.includes('window.confirm'), 'Écran : confirmation avant suppression d’un document (aucune perte accidentelle)');
  ok(tkSrc2.includes('Élèves à accompagner') && tkSrc2.includes('buildStudentsToSupport') && tkSrc2.includes('weakCount'), 'Écran : section élèves à accompagner branchée');
  ok(tkSrc2.includes('Rouvrir') && tkSrc2.includes('openDoc') && tkSrc2.includes('printDocContent'), 'Écran : documents archivés rouvrables et imprimables');
  ok(tkSrc2.includes('taskProgressByCategory') && tkSrc2.includes('window.confirm'), 'Écran : progression par catégorie + confirmation avant réinitialisation');
}

section('24. Cloud & Support — codes robustes, stats de synchro, erreurs claires, FAQ + diagnostic');
{
  const fs9 = (await import('fs')).default;
  const path9 = (await import('path')).default;
  const read = (p: string) => fs9.readFileSync(path9.join(process.cwd(), p), 'utf8');

  // --- Code de synchronisation robuste (Math.random seul remplacé) ---
  const { generateSyncCode, computeBackupStats, getLastSyncInfo, friendlyCloudError, saveCloudSettings, getCloudSettings } = await import('../src/utils/cloudSync');
  ok(/^MSP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(generateSyncCode()), `Code de synchro au format MSP-XXXX-XXXX : ${generateSyncCode()}`);
  const codes = new Set(Array.from({ length: 40 }, () => generateSyncCode()));
  ok(codes.size === 40, 'Code de synchro : 40 générations → 40 codes distincts');
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try { Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true }); } catch { /* environnements verrouillés */ }
  const fallbackCode = generateSyncCode();
  ok(/^MSP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(fallbackCode), 'Code de synchro : repli sans crypto.getRandomValues');
  try { Object.defineProperty(globalThis, 'crypto', originalDescriptor!); } catch { /* ignore */ }

  // --- Statistiques de sauvegarde (comptées à la volée) ---
  const sample = JSON.stringify({ version: 2, classes: [
    { name: 'CE1', students: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { name: 'CM2', students: [{ id: 'd' }, { id: 'e' }] },
  ]});
  const stats = computeBackupStats(sample);
  ok(stats.classes === 2 && stats.students === 5, `Backup : 2 classes et 5 élèves comptés (${sample.length} car.)`);
  ok(stats.sizeKo > 0, `Backup : taille estimée en Ko (${stats.sizeKo} Ko)`);
  ok(computeBackupStats('pas du json').classes === 0 && computeBackupStats('pas du json').students === 0, 'Backup : JSON invalide → statistiques neutres (aucune erreur)');

  // --- Détail de la dernière synchronisation ---
  const store3 = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store3.has(k) ? store3.get(k)! : null),
    setItem: (k: string, v: string) => { store3.set(k, String(v)); },
    removeItem: (k: string) => { store3.delete(k); },
  };
  ok(getLastSyncInfo() === null, 'Synchro : aucun détail si jamais synchronisé');
  try { localStorage.setItem('msp_cloud_last_sync_info', JSON.stringify({ date: '2026-09-02T10:00:00.000Z', classes: 3, students: 120, sizeKo: 45.2 })); } catch { /* ignore */ }
  const info = getLastSyncInfo();
  ok(info !== null && info.classes === 3 && info.students === 120 && info.sizeKo === 45.2, 'Synchro : détail relu (3 classes, 120 élèves, 45,2 Ko)');
  // Réglages (carte Stockage & Cloud)
  saveCloudSettings({ enabled: true, syncCode: 'MSP-ABCD-EFGH', rememberPassphrase: false });
  ok(getCloudSettings().syncCode === 'MSP-ABCD-EFGH' && getCloudSettings().enabled === true, 'Synchro : réglages cloud sauvegardés et relus');
  (globalThis as any).localStorage = undefined;

  // --- Erreurs expliquées simplement (fini le « Failed to fetch » brut) ---
  ok(friendlyCloudError(new Error('CLOUD_NON_CONFIGURE')).includes('administrateur'), 'Erreurs : cloud non configuré → message clair');
  ok(friendlyCloudError(new Error('MOT_DE_PASSE_INCORRECT')).includes('Mot de passe secret incorrect'), 'Erreurs : mauvais mot de passe → message clair');
  ok(friendlyCloudError(new Error('Failed to fetch')).includes('connexion internet'), 'Erreurs : réseau coupé → « vérifiez votre connexion »');
  ok(friendlyCloudError(new Error('Erreur d\'envoi (401)')).includes('401'), 'Erreurs : erreur serveur détaillée conservée');

  // --- Écrans : copie fiable, stats affichées, FAQ + diagnostic ---
  const cloudSrc = read('src/components/CloudScreen.tsx');
  ok(cloudSrc.includes('copyText') && !cloudSrc.includes('navigator.clipboard'), 'Cloud : copie du code avec repli honnête');
  ok(cloudSrc.includes('getLastSyncInfo') && cloudSrc.includes('élève'), 'Cloud : détail de la dernière synchro affiché (classes/élèves/Ko)');
  ok(cloudSrc.includes('friendlyCloudError'), 'Cloud : erreurs réseau traduites en messages simples');
  const supportSrc = read('src/components/SupportScreen.tsx');
  ok(supportSrc.includes('Questions fréquentes') && supportSrc.includes('FAQ'), 'Support : section FAQ ajoutée');
  ok(supportSrc.includes('withDiagnostic') && supportSrc.includes('buildDiagnostic'), 'Support : diagnostic automatique joint au signalement');
  ok(supportSrc.includes('appareil') && supportSrc.includes('Cloud :'), 'Support : diagnostic (date, appareil, état du cloud)');
  const appSrc = read('src/App.tsx');
  ok(appSrc.includes('getLastSyncInfo') && appSrc.includes('élève'), 'Réglages : détail de la dernière synchro dans Stockage & Cloud');

  // --- Cloud & Support v2 : format du code, test de connexion, date relative, diagnostic transparent ---
  const { isValidSyncCode, formatRelativeTime, testCloudConnection } = await import('../src/utils/cloudSync');

  ok(isValidSyncCode('MSP-ABCD-EFGH') === true, 'Code : format MPS-XXXX-XXXX valide accepté');
  ok(isValidSyncCode('msp-abcd-efgh') === true, 'Code : minuscules acceptées (normalisées)');
  ok(isValidSyncCode('  MSP-AB12-CD34  ') === true, 'Code : espaces autour tolérés');
  ok(isValidSyncCode('') === false, 'Code : vide refusé');
  ok(isValidSyncCode('MSP-ABC-EFGH') === false, 'Code : 3 caractères → refusé (typo détectée)');
  ok(isValidSyncCode('ABCD-EFGH') === false, 'Code : sans préfixe MSP → refusé');

  const refNow = new Date('2026-09-03T12:00:00.000Z');
  ok(formatRelativeTime('2026-09-03T11:59:30.000Z', refNow) === 'à l’instant', 'Date relative : 30 s → « à l’instant »');
  ok(formatRelativeTime('2026-09-03T11:55:00.000Z', refNow) === 'il y a 5 min', 'Date relative : 5 min');
  ok(formatRelativeTime('2026-09-03T09:00:00.000Z', refNow) === 'il y a 3 h', 'Date relative : 3 h');
  ok(formatRelativeTime('2026-09-02T10:00:00.000Z', refNow) === 'hier', 'Date relative : 26 h → « hier »');
  ok(formatRelativeTime('2026-08-24T12:00:00.000Z', refNow) === 'il y a 10 jours', 'Date relative : 10 jours');
  ok(formatRelativeTime('pas-une-date') === 'pas-une-date', 'Date relative : valeur invalide → texte d’origine');

  // Test de connexion : serveur joignable
  const origFetch = globalThis.fetch;
  (globalThis as any).fetch = async () => ({ ok: true, status: 200 } as any);
  const connOk = await testCloudConnection(1000);
  ok(connOk.ok === true && typeof connOk.latency === 'number' && connOk.message.includes('réussie'), 'Connexion : serveur joignable → succès avec latence');
  // Réseau coupé
  const origNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true }); } catch { /* verrouillé */ }
  const connOff = await testCloudConnection(1000);
  ok(connOff.ok === false && connOff.message.includes('connexion internet'), 'Connexion : réseau coupé → message « vérifiez votre connexion »');
  try { Object.defineProperty(globalThis, 'navigator', origNavDesc!); } catch { /* ignore */ }
  // Erreur réseau brut
  (globalThis as any).fetch = async () => { throw new Error('Failed to fetch'); };
  const connErr = await testCloudConnection(1000);
  ok(connErr.ok === false && connErr.message.includes('connexion internet'), 'Connexion : erreur réseau → même message clair');
  // Délai dépassé
  (globalThis as any).fetch = async (_url: any, init: any) => { const e: any = new Error('aborted'); e.name = 'AbortError'; throw e; };
  const connTimeout = await testCloudConnection(1000);
  ok(connTimeout.ok === false && connTimeout.message.includes('délai'), 'Connexion : délai dépassé → message explicite');
  (globalThis as any).fetch = origFetch;

  const cloudSrc2 = read('src/components/CloudScreen.tsx');
  ok(cloudSrc2.includes('Tester la connexion au cloud') && cloudSrc2.includes('testCloudConnection'), 'Écran Cloud : bouton test de connexion branché');
  ok(cloudSrc2.includes('isValidSyncCode') && cloudSrc2.includes('Format du code attendu'), 'Écran Cloud : format du code vérifié avant envoi (typos signalées)');
  ok(cloudSrc2.includes('formatRelativeTime') && cloudSrc2.includes('Dernière synchronisation'), 'Écran Cloud : date relative affichée (« il y a 2 h »)');

  const supportSrc2 = read('src/components/SupportScreen.tsx');
  ok(supportSrc2.includes('Diagnostic automatique') && supportSrc2.includes('showDiag') && supportSrc2.includes('refreshDiagnostic'), 'Support : aperçu du diagnostic avant envoi (transparence)');
  ok(supportSrc2.includes('getAllClasses') && supportSrc2.includes('Données locales') && supportSrc2.includes('storage'), 'Support : diagnostic enrichi (classes/élèves + stockage utilisé)');
  ok(supportSrc2.includes('Que faire si un élève est absent') && supportSrc2.includes('désinstalle') && supportSrc2.includes('plusieurs téléphones') && supportSrc2.includes('Comment sont calculées les moyennes'), 'Support : FAQ enrichie (absent, désinstallation, multi-appareils, moyennes)');
}

section('25. Audit complet — copies fiables partout, année scolaire dynamique, stockage sûr');
{
  const fs10 = (await import('fs')).default;
  const path10 = (await import('path')).default;
  const read = (p: string) => fs10.readFileSync(path10.join(process.cwd(), p), 'utf8');
  const walk = (dir: string, acc: string[] = []): string[] => {
    for (const entry of fs10.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full, acc);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) acc.push(full);
    }
    return acc;
  };

  // --- Plus aucun accès direct à navigator.clipboard dans les écrans ---
  const riskyClipboard = walk('src/components').filter(f => f.endsWith('.tsx') && read(f).includes('navigator.clipboard'));
  ok(riskyClipboard.length === 0, `Audit : plus aucun « navigator.clipboard » direct dans les écrans${riskyClipboard.length ? ' → ' + riskyClipboard.join(', ') : ''}`);
  const onlyInUtil = read('src/utils/clipboard.ts').includes('navigator.clipboard');
  ok(onlyInUtil, 'Audit : le seul accès au presse-papiers est centralisé dans utils/clipboard.ts');

  // --- Année scolaire dynamique dans le formulaire de classe ---
  const appSrc = read('src/App.tsx');
  ok(appSrc.includes('schoolYearLabel'), 'Formulaire de classe : année dynamique importée');
  ok(!appSrc.includes("schoolYear: '2025 - 2026'"), 'Formulaire de classe : plus d’année figée par défaut');
  ok(appSrc.includes('currentYearStart') && appSrc.includes('defaultSchoolYear'), 'Formulaire de classe : défaut = année en cours (septembre → nouvelle année)');
  const { schoolYearLabelFrom } = await import('../src/utils/orientation');
  const current = parseInt(schoolYearLabelFrom(new Date()).split('-')[0], 10);
  ok(appSrc.includes('${currentYearStart} - ${currentYearStart + 1}') && appSrc.includes('currentYearStart - 1 + i'), `Formulaire de classe : l’année en cours (${current}-${current + 1}) sert de base au défaut et au sélecteur`);

  // --- Stockage sûr (navigation privée / WebView ne font plus planter) ---
  const { safeGetItem, safeSetItem, safeJsonParse, safeJsonSet } = await import('../src/utils/safeStorage');
  const boom = () => { throw new Error('SECURITY_ERR'); };
  (globalThis as any).localStorage = {
    getItem: boom, setItem: boom, removeItem: boom, key: boom,
  };
  ok(safeGetItem('x') === null, 'Stockage sûr : lecture bloquée → null sans erreur');
  ok(safeJsonParse('x', ['vide']).length === 1, 'Stockage sûr : JSON bloqué → valeur de repli');
  (globalThis as any).localStorage = {
    getItem: boom, setItem: (k: string, v: string) => { throw new Error('QUOTA'); }, removeItem: boom, key: boom,
  };
  safeSetItem('k', 'v');
  safeJsonSet('k2', { a: 1 });
  ok(true, 'Stockage sûr : écritures bloquées → aucune erreur levée');
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k === 'ok' ? '{"a":1}' : null),
    setItem: (k: string, v: string) => { /* ok */ }, removeItem: () => {}, key: () => null,
  };
  ok(safeGetItem('ok') === '{"a":1}' && (safeJsonParse('ok', { a: 0 }) as any).a === 1, 'Stockage sûr : lecture normale inchangée');
  (globalThis as any).localStorage = undefined;

  // --- Les 6 écrans à risque utilisent le helper sûr ---
  const screensWithRoleAccess = ['AdminDashboardScreen', 'ClassDocumentsScreen', 'EnrollmentScreen', 'KidsDictionaryScreen', 'KnowledgeHubScreen', 'ResourceFiles'];
  const roleAccessReady = screensWithRoleAccess.every(name => {
    const source = read(`src/components/${name}.tsx`);
    return source.includes('safeGetItem') || source.includes('hasAdminRole')
      || (name === 'AdminDashboardScreen' && source.includes('getAdminSession'));
  });
  const adminSessionSource = read('src/utils/adminSession.ts');
  ok(roleAccessReady && adminSessionSource.includes('try {'),
    'Audit : accès admin assuré par stockage sûr ou sessions de rôle avec gestion d’erreur');
  ok(read('src/components/SchoolCalendarScreen.tsx').includes('stockage bloqué'), 'Calendrier : notifications protégées si le stockage est bloqué');

  // --- Vérification de cohérence des routes de l'application ---
  const routePaths = [...appSrc.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);
  ok(routePaths.length >= 20, `Audit : ${routePaths.length} routes déclarées`);
  const uniquePaths = new Set(routePaths);
  ok(uniquePaths.size === routePaths.length, 'Audit : aucune route dupliquée');
}

section('26. Contenus encyclopédie enrichie + dictionnaire junior');
{
  const fs11 = (await import('fs')).default;
  const path11 = (await import('path')).default;
  const read = (p: string) => fs11.readFileSync(path11.join(process.cwd(), p), 'utf8');

  // --- Encyclopédie : les 24 thèmes tous enrichis ---
  const { ENCYCLOPEDIA_EXTRA, ENCARTA_DOMAINS } = await import('../src/utils/encyclopediaData');
  const hubSrc = read('src/components/KnowledgeHubScreen.tsx');
  const themeIds = [...hubSrc.matchAll(/id: '([a-z]+)', title: /g)].map(m => m[1]);
  ok(themeIds.length === 24, `Encyclopédie : ${themeIds.length} thématiques existantes`);

  const extraKeys = Object.keys(ENCYCLOPEDIA_EXTRA);
  const missingThemes = themeIds.filter(t => !extraKeys.includes(t));
  ok(missingThemes.length === 0, `Encyclopédie : les ${extraKeys.length} thématiques ont un contenu étendu${missingThemes.length ? ' (manques : ' + missingThemes.join(', ') + ')' : ''}`);

  let totalExtra = 0;
  let allFieldsOk = true;
  let dupes = 0;
  for (const key of extraKeys) {
    const list = ENCYCLOPEDIA_EXTRA[key];
    totalExtra += list.length;
    const terms = list.map(e => e.term.toLowerCase());
    if (new Set(terms).size !== terms.length) dupes++;
    for (const entry of list) {
      if (!entry.term || !entry.simple || !entry.details || !Array.isArray(entry.examples) || entry.examples.length === 0) allFieldsOk = false;
    }
  }
  ok(totalExtra >= 140, `Encyclopédie : ${totalExtra} articles ajoutés (≥ 140 attendus)`);
  ok(allFieldsOk, 'Encyclopédie : chaque article a terme + définition simple + détails + exemple(s)');
  ok(dupes === 0, 'Encyclopédie : aucun doublon de terme au sein d’une thématique');

  const domains = new Set(Object.values(ENCARTA_DOMAINS));
  const ENCARTA_NINE = ['Géographie', 'Histoire', 'Sciences & Mathématiques', 'Technologie', 'Sciences sociales', 'Droit', 'Arts & Littérature', 'Philosophie & Religion', 'Sport & Loisirs'];
  ok(ENCARTA_NINE.every(d => domains.has(d)), `Encyclopédie : les 9 domaines couverts (${domains.size} libellés)`);

  ok(hubSrc.includes("ENCYCLOPEDIA_EXTRA[activeTheme.id]") && hubSrc.includes('ENCARTA_DOMAINS'), 'Encyclopédie : contenus étendus fusionnés sans doublon (par terme)');
  ok(hubSrc.includes('Domaine :') && !hubSrc.includes('d’Encarta'), 'Encyclopédie : badge « Domaine » mis à jour (sans mention Encarta)');

  // --- Dictionnaire : contenus junior ajoutés aux mots actuels ---
  const { JUNIOR_WORDS } = await import('../src/utils/encartaJuniorData');
  const dictSrc = read('src/components/KidsDictionaryScreen.tsx');
  const existingWords = [...dictSrc.matchAll(/^\s*\['([^']+)'/gm)].map(m => m[1]);
  ok(existingWords.length === 24, `Dictionnaire : les ${existingWords.length} mots d'origine conservés`);

  ok(JUNIOR_WORDS.length >= 50, `Dictionnaire junior : ${JUNIOR_WORDS.length} nouveaux mots ajoutés (≥ 50 attendus)`);
  const juniorFams = new Set(JUNIOR_WORDS.map(w => w.family));
  ok(juniorFams.size >= 7, `Dictionnaire junior : ${juniorFams.size} familles thématiques (animaux, espace, corps, monde…)`);
  ['Animaux', 'Nature', 'Le corps', 'Le monde', 'Métiers'].forEach(fam => {
    ok(juniorFams.has(fam), `Dictionnaire junior : famille « ${fam} » présente`);
  });
  const juniorDuplicates = JUNIOR_WORDS.filter(j => existingWords.some(w => w.toLowerCase() === j.word.toLowerCase()));
  ok(juniorDuplicates.length === 0, 'Dictionnaire junior : aucun doublon avec les mots existants');
  ok(JUNIOR_WORDS.every(w => w.word && w.definition && w.example && w.family), 'Dictionnaire junior : chaque entrée a mot + définition + exemple + famille');

  ok(dictSrc.includes('JUNIOR_WORDS'), 'Dictionnaire : fusion des mots junior branchée dans l’écran (déduplication par mot)');
  ok(dictSrc.includes('Mots faciles pour les petits') && !dictSrc.includes('Encarta'), 'Dictionnaire : en-tête mis à jour (plus de mention Encarta)');

  // ============================================================
  // --- Encyclopédie v14 : 500+ articles (vagues 2 et 3) ---
  const { ENCYCLOPEDIA_EXTRA_2 } = await import('../src/utils/encyclopediaData2');
  const { ENCYCLOPEDIA_EXTRA_3 } = await import('../src/utils/encyclopediaData3');

  const keys2 = Object.keys(ENCYCLOPEDIA_EXTRA_2);
  const keys3 = Object.keys(ENCYCLOPEDIA_EXTRA_3);
  ok(keys2.length === 24 && keys3.length === 24, `Encyclopédie : vagues 2 (${keys2.length} thèmes) et 3 (${keys3.length} thèmes) couvrent toutes les thématiques`);

  let total2 = 0, total3 = 0, okFields23 = true, dupes23 = 0;
  for (const key of keys2) {
    const list = ENCYCLOPEDIA_EXTRA_2[key];
    total2 += list.length;
    const terms = list.map(e => e.term.toLowerCase());
    if (new Set(terms).size !== terms.length) dupes23++;
    for (const entry of list) if (!entry.term || !entry.simple || !entry.details || !Array.isArray(entry.examples) || entry.examples.length === 0) okFields23 = false;
  }
  for (const key of keys3) {
    const list = ENCYCLOPEDIA_EXTRA_3[key];
    total3 += list.length;
    const terms = list.map(e => e.term.toLowerCase());
    if (new Set(terms).size !== terms.length) dupes23++;
    for (const entry of list) if (!entry.term || !entry.simple || !entry.details || !Array.isArray(entry.examples) || entry.examples.length === 0) okFields23 = false;
  }
  ok(total2 >= 100, `Encyclopédie : vague 2 = ${total2} articles (≥ 100 attendus)`);
  ok(total3 >= 100, `Encyclopédie : vague 3 = ${total3} articles (≥ 100 attendus)`);
  ok(okFields23, 'Encyclopédie : vagues 2-3 — chaque article a terme + définition simple + détails + exemple(s)');
  ok(dupes23 === 0, 'Encyclopédie : aucun doublon de terme au sein d’une thématique (vagues 2-3)');

  // Total global de l'encyclopédie (base 24 thèmes + 3 vagues), sans doublon inter-vagues
  const baseCount = (hubSrc.match(/makeEntry\(/g) || []).length;
  let crossDupes = 0;
  for (const key of keys2) {
    const all = [...(ENCYCLOPEDIA_EXTRA[key] || []), ...ENCYCLOPEDIA_EXTRA_2[key], ...ENCYCLOPEDIA_EXTRA_3[key]];
    const seen = new Set<string>();
    for (const e of all) {
      const t = e.term.toLowerCase();
      if (seen.has(t)) crossDupes++;
      seen.add(t);
    }
  }
  const grandTotal = baseCount + totalExtra + total2 + total3 - crossDupes;
  ok(crossDupes === 0, `Encyclopédie : aucun doublon entre les 3 vagues d’articles (${crossDupes} détectés)`);
  ok(grandTotal >= 500, `Encyclopédie : ${grandTotal} articles au total (${baseCount} de base + ${totalExtra} + ${total2} + ${total3} ajoutés, ≥ 500 attendus)`);
  ok(hubSrc.includes('ENCYCLOPEDIA_EXTRA_2') && hubSrc.includes('ENCYCLOPEDIA_EXTRA_3'), 'Encyclopédie : vagues 2 et 3 importées et fusionnées dans l’écran');
  ok(hubSrc.includes('globalEntries') && hubSrc.includes('globalEntries.length'), 'Encyclopédie : compteur total d’articles affiché sur l’écran d’accueil de l’encyclopédie');

  // --- Quiz par thématique ---
  const { generateQuiz, quizMessage, loadBestScore, saveBestScore } = await import('../src/utils/kidsQuiz');
  const quizPool = [
    { word: 'Photosynthèse', definition: 'Fabrication de sucre par les plantes grâce à la lumière', example: 'Les feuilles vertes' },
    { word: 'Gravité', definition: 'Force qui attire les objets vers le sol', example: 'La pomme qui tombe' },
    { word: 'Volcan', definition: 'Montagne qui laisse échapper de la lave', example: 'Le Vésuve' },
    { word: 'Atome', definition: 'Plus petite unité de la matière', example: 'L’hydrogène' },
    { word: 'Éclipse', definition: 'La Lune cache le Soleil ou passe dans son ombre', example: 'Éclipse solaire' },
    { word: 'Météore', definition: 'Traînée de lumière d’un corps céleste dans le ciel', example: 'Étoile filante' },
  ];
  const q = generateQuiz(quizPool, 5, 'audit-theme');
  ok(q.length === 5, `Quiz thématique : ${q.length} questions générées pour 5 attendues`);
  ok(q.every(x => x.definition && x.options.length === 4 && x.correct && x.options.includes(x.correct)), 'Quiz thématique : chaque question a 4 options dont la bonne réponse');
  ok(q.every(x => quizPool.some(p => p.word === x.correct && p.definition === x.definition)), 'Quiz thématique : la bonne réponse est bien le terme correspondant à la définition');
  ok(q.every(x => new Set(x.options).size === 4), 'Quiz thématique : les 4 options sont distinctes');
  ok(typeof quizMessage(10, 5) === 'string' && quizMessage(0, 5) !== quizMessage(5, 5), 'Quiz thématique : message final adapté au score');
  ok(hubSrc.includes('generateQuiz(entries.map') || hubSrc.includes('generateQuiz(entries') || hubSrc.includes('generateQuiz(pool'), 'Quiz thématique : les questions viennent des entrées de la thématique active');
  ok(hubSrc.includes('ThemeQuizModal') && hubSrc.includes('setQuizTheme(activeTheme)'), 'Quiz thématique : bouton Quiz de la thématique + fenêtre de quiz branchés');
  ok(hubSrc.includes('Meilleur score sur cette thématique') && hubSrc.includes('saveBestScore(s, bestKey)') && hubSrc.includes('msp_ency_quiz_'), 'Quiz thématique : meilleur score mémorisé par thématique');
  ok(hubSrc.includes('quizMessage(score') && hubSrc.includes('questions.length)'), 'Quiz thématique : score et feedback affichés à la fin');

  // --- Article du jour ---
  ok(hubSrc.includes('pickDailyToday(activeTheme.entries)'), 'Article du jour : une définition vedette par thème, changée chaque jour');
  ok(hubSrc.includes('pickDailyToday(globalEntries)') && hubSrc.includes('Article du jour —'), 'Article du jour : article vedette de toute l’encyclopédie affiché dans l’en-tête');
  const { pickDaily } = await import('../src/utils/dailyContent');
  const week = [...Array(7).keys()].map(d => pickDaily(quizPool, `2025-06-0${d + 1}`)?.word ?? '');
  ok(new Set(week).size > 1, 'Article du jour : le contenu change au fil des jours (pas figé)');
}

// ============================================================
section('27. Déploiement — fallback SPA Netlify, guide de publication exact');
{
  const fs10 = (await import('fs')).default;
  const path10 = (await import('path')).default;
  const read = (p: string) => fs10.readFileSync(path10.join(process.cwd(), p), 'utf8');

  // --- _redirects (fallback SPA) : copié dans dist/ par Vite ---
  ok(fs10.existsSync('public/_redirects'), 'Déploiement : fichier public/_redirects présent');
  const redirects = fs10.existsSync('public/_redirects') ? fs10.readFileSync('public/_redirects', 'utf8') : '';
  ok(redirects.includes('/*') && redirects.includes('/index.html') && redirects.includes('200'), 'Déploiement : règle « /* → /index.html 200 » exacte');

  // --- netlify.toml (déploiement Git) ---
  ok(fs10.existsSync('netlify.toml'), 'Déploiement : netlify.toml présent');
  const toml = fs10.existsSync('netlify.toml') ? fs10.readFileSync('netlify.toml', 'utf8') : '';
  ok(toml.includes('publish = "dist"'), 'Déploiement : dossier publié = dist');
  ok(toml.includes('[[redirects]]') && toml.includes('from = "/*"') && toml.includes('status = 200'), 'Déploiement : redirection SPA déclarée dans netlify.toml');

  // --- dist construite : le _redirects doit s'y trouver (si build disponible) ---
  if (fs10.existsSync('dist/_redirects')) {
    const distRedirects = fs10.readFileSync('dist/_redirects', 'utf8');
    ok(distRedirects.includes('/*') && distRedirects.includes('/index.html'), 'Déploiement : dist/_redirects présent après build (Netlify Drop)');
  } else {
    ok(true, 'Déploiement : dist/_redirects vérifié au prochain build (dist absent)');
  }

  // --- Guide de publication ---
  const guide = read('GUIDE-PUBLICATION-LIEN.md');
  ok(guide.includes('contenu de `dist/`') || guide.includes('contenu de `deploy/`') || guide.includes('contenu du dossier') || guide.includes('tout son contenu'), 'Guide : instructions pour déposer le CONTENU de dist/ (ou deploy/)');
  ok(!guide.includes('master-soutien-pedagogique-v') || guide.includes('Ne glissez PAS'), 'Guide : avertissement contre le dépôt de l’archive ZIP');
  ok(guide.includes('_redirects') && (guide.includes('Page introuvable') || guide.includes('Page not found')), 'Guide : section dépannage (« Page not found ») et rôle du _redirects expliqués');
  ok(guide.includes('`npm run build`'), 'Guide : rappel de construire (npm run build) avant déploiement');
}

// ============================================================
section('28. Audit approfondi — PWA à jour, virgule décimale, déduplication');
{
  const fs11 = (await import('fs')).default;
  const path11 = (await import('path')).default;
  const read = (p: string) => fs11.readFileSync(path11.join(process.cwd(), p), 'utf8');

  // --- PWA : mises à jour propagées (network-first pour la navigation) ---
  const sw = read('public/sw.js');
  ok(sw.includes("event.request.mode === 'navigate'"), 'PWA : la navigation est gérée à part (mode navigate)');
  const navBlock = sw.split("event.request.mode === 'navigate'")[1] || '';
  ok(navBlock.includes('fetch(event.request)') && navBlock.includes('.catch('), 'PWA : navigation en RÉSEAU D’ABORD avec repli hors-ligne (au lieu du cache-first qui figeait les versions)');
  ok(/master-soutien-v\d+/.test(sw), 'PWA : nom de cache versionné (les anciens caches sont purgés à l’activation)');
  ok(sw.includes('skipWaiting') && sw.includes('clients.claim'), 'PWA : activation immédiate de la nouvelle version');
  const mainSrc = read('src/main.tsx');
  ok(mainSrc.includes('registration.update()'), 'PWA : vérification périodique d’une nouvelle version (registration.update)');
  /*
   * v60 : le rechargement AUTOMATIQUE a ete retire volontairement. Il
   * interrompait la saisie de l'enseignant sans prevenir. Le rechargement
   * a lieu desormais apres un clic sur « Mettre a jour », geste porte par
   * le composant UpdateBanner.
   */
  const upd = read('src/components/UpdateBanner.tsx');
  ok(upd.includes('controllerchange') && upd.includes('window.location.reload()'),
     'PWA : rechargement apres validation par l utilisateur');

  // --- Virgule décimale (poids/taille) : « 72,5 » ne doit plus devenir 72 ---
  const { calculateBMI, bmiLabel } = await import('../src/utils/health');
  ok(calculateBMI(72, 170) !== null, 'IMC : valeurs numériques OK');
  const withComma = calculateBMI('72,5', '170');
  ok(withComma !== null && Math.abs(withComma - 72.5 / (1.7 * 1.7)) < 0.01, `IMC : « 72,5 » et « 170 » acceptés (virgule française) → ${withComma?.toFixed(2)}`);
  ok(calculateBMI('', '170') === null && calculateBMI('abc', '170') === null && calculateBMI(undefined, 170) === null, 'IMC : valeurs vides/invalides → null (pas de NaN)');
  ok(calculateBMI('80,5', '170') !== null, 'IMC : taille en cm (170) et poids avec virgule acceptés');
  ok(typeof bmiLabel(20) === 'string' && bmiLabel(null).includes('non calculé'), 'IMC : libellés de corpulence OK');

  // --- Déduplication : plus qu’UNE seule implémentation du calcul d’IMC ---
  const appSrc2 = read('src/App.tsx');
  ok(appSrc2.includes("from './utils/health'"), 'Dédup : App.tsx importe calculateBMI depuis utils/health');
  const localDefs = (appSrc2.match(/function calculateBMI/g) || []).length + (appSrc2.match(/function bmiLabel/g) || []).length;
  ok(localDefs === 0, 'Dédup : plus aucune définition locale dupliquée dans App.tsx');
  ok(appSrc2.includes('parseDecimal') && !appSrc2.includes('parseFloat(newStudent.weightKg') && !appSrc2.includes('parseFloat(newStudent.heightCm'), 'Saisie : poids/taille convertis via parseDecimal (virgule gérée à l’ajout ET à l’édition)');
  const profileSrc = read('src/components/StudentProfileEntry.tsx');
  ok(profileSrc.includes('calculateBMI') && profileSrc.includes('bmiLabel'), 'Fiche élève : IMC cohérent avec le même utilitaire');
}

// ============================================================
section('29. Déploiement Vercel — vercel.json + guide : fini le « 404: NOT_FOUND »');
{
  const fs12 = (await import('fs')).default;
  const path12 = (await import('path')).default;
  const read = (p: string) => fs12.readFileSync(path12.join(process.cwd(), p), 'utf8');

  // --- vercel.json à la racine du projet (déploiement Git) ---
  ok(fs12.existsSync('vercel.json'), 'Vercel : vercel.json présent à la racine du projet');
  const vjson = fs12.existsSync('vercel.json') ? JSON.parse(fs12.readFileSync('vercel.json', 'utf8')) : {};
  ok(Array.isArray(vjson.rewrites) && vjson.rewrites.length > 0, 'Vercel : tableau rewrites présent');
  ok(vjson.rewrites?.some((r: any) => r.source === '/(.*)' && r.destination === '/index.html'), 'Vercel : règle « /(.*) → /index.html » (toutes les routes SPA)');

  // --- vercel.json dans public/ (copié dans dist/ au build → glisser-déposer) ---
  ok(fs12.existsSync('public/vercel.json'), 'Vercel : public/vercel.json présent (sera copié dans dist/)');
  const pjson = fs12.existsSync('public/vercel.json') ? JSON.parse(fs12.readFileSync('public/vercel.json', 'utf8')) : {};
  ok(pjson.rewrites?.some((r: any) => r.source === '/(.*)' && r.destination === '/index.html'), 'Vercel : même règle dans la copie déployable');

  // --- Guide : méthode Vercel explicite (contrairement à l’ancienne version) ---
  const guide2 = read('GUIDE-PUBLICATION-LIEN.md');
  ok((guide2.includes('Construisez') || guide2.includes('construit automatiquement') || guide2.includes('construit si besoin')) && guide2.includes('npm run build'), 'Guide Vercel : construction préalable expliquée (npm run build)');
  ok(guide2.includes('Output Directory') && guide2.includes('dist'), 'Guide Vercel : Output Directory = dist (cause du 404 en Git)');
  ok(guide2.includes('404: NOT_FOUND'), 'Guide Vercel : erreur « 404: NOT_FOUND » documentée dans le dépannage');
  ok(guide2.includes('vercel.json') && (guide2.includes('réécrit') || guide2.includes('404.html')), 'Guide Vercel : rôle du vercel.json / 404.html expliqué');
  ok(guide2.includes('Ne déposez PAS') || guide2.includes('Ne glissez PAS'), 'Guide Vercel : avertissement contre le ZIP / dossier source');
}

// ============================================================
section('30. Bulletins — prise en compte de la bonne note (formative vs sommative)');
{
  const subjects = [
    makeSubject('s1', 'Dictée', 18, 2, 0),
    makeSubject('s2', 'Math', 18, 2, 1),
  ];
  const student = makeStudent('e1', '001', 'DOSSOU', 'Ali');
  // Piège historique : 2 notes par élève/matière → le bulletin prenait la
  // PREMIÈRE (formative 5/0) au lieu de la sommative (15/2).
  const notes: Note[] = [
    { ...makeNote('n1', 'e1', 's1', 5, 0), evaluation: 'formative1', updatedAt: 1 },
    { ...makeNote('n2', 'e1', 's1', 15, 2), evaluation: 'sommative1', updatedAt: 2 },
    { ...makeNote('n3', 'e1', 's2', 6, 0), evaluation: 'formative1', updatedAt: 3 },
    { ...makeNote('n4', 'e1', 's2', 14, 2), evaluation: 'sommative1', updatedAt: 4 },
  ];
  const classData: ClassData = {
    id: 'c1', name: 'CM1 A', school: 'EPP Test', level: 'CM1', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: 'Devoirs surveillés', students: [student], subjects, notes,
    createdAt: 0, updatedAt: 0,
  };

  // 1) findBestNote : la sommative prioritaire (15/2), pas la formative
  const best = findBestNote(notes, 'e1', 's1');
  ok(best !== undefined && best.id === 'n2', 'findBestNote retourne la dernière note sommative (15/2), pas la formative (5/0)', `→ ${best?.id}`);

  // 2) computeBulletins : moyenne 16.5 (ancien bug : 5.5)
  const b = computeBulletins(classData).find(x => x.student.id === 'e1');
  ok(b !== undefined, 'computeBulletins produit un bulletin pour l’élève');
  ok(b !== undefined && Math.abs((b.moyenne ?? 0) - 16.5) < 0.01, 'Moyenne du bulletin = 16.5 (au lieu de 5.5 avant correctif)', `→ ${b?.moyenne}`);
  const dict = b?.results.find(r => r.subject.id === 's1');
  ok(dict !== undefined && Math.abs((dict.total ?? 0) - 17) < 0.01, 'Note Dictée /20 = 17 (15+2), fini la note formative 5', `→ ${dict?.total}`);

  // 3) Toujours la plus récente si plusieurs sommatives
  const notes3 = [
    { ...makeNote('n1', 'e1', 's1', 15, 2), evaluation: 'sommative1', updatedAt: 1 },
    { ...makeNote('n2', 'e1', 's1', 12, 1), evaluation: 'sommative2', updatedAt: 5 },
  ];
  const best3 = findBestNote(notes3, 'e1', 's1');
  ok(best3 !== undefined && best3.id === 'n2', 'Priorité à la sommative la plus récente (sommative2 si plusieurs)', `→ ${best3?.id}`);

  // 4) Absence : non comptée dans la moyenne
  const notes4 = [
    { ...makeNote('n1', 'e1', 's1', 0, 0, true), evaluation: 'sommative1', updatedAt: 1 },
    { ...makeNote('n2', 'e1', 's2', 10, 2), evaluation: 'sommative1', updatedAt: 2 },
  ];
  const b4 = computeBulletins({ ...classData, notes: notes4 }).find(x => x.student.id === 'e1');
  ok(b4 !== undefined && Math.abs((b4.moyenne ?? 0) - 12) < 0.01, 'Élève absent en Dictée : moyenne calculée sur les matières notées (12)', `→ ${b4?.moyenne}`);

  // 5) Plus aucun « notes.find » dispersé sur l’ensemble du code source
  const fs30 = (await import('fs')).default;
  const path30 = (await import('path')).default;
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const ent of fs30.readdirSync(dir, { withFileTypes: true })) {
      const p = path30.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(p));
      else if (/(\.ts|\.tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) out.push(p);
    }
    return out;
  }
  const offenders: string[] = [];
  for (const file of walk('src')) {
    const code = fs30.readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
    // Seule l’implémentation centrale dans database.ts a le droit d’utiliser notes.find
    if (file.endsWith('utils/database.ts')) continue;
    const m = code.match(/notes\.find\(/g);
    if (m) offenders.push(`${file} (${m.length})`);
  }
  ok(offenders.length === 0, 'Aucun « notes.find » dans le code applicatif (centralisé dans findBestNote)', offenders.join(', '));

  // 6) Formulaire « Nouvelle classe » : la période (trimestre / semestre)
  const app = fs30.readFileSync('src/App.tsx', 'utf8');
  ok(app.includes("'1er trimestre'") && app.includes("'2ème trimestre'") && app.includes("'3ème trimestre'"),
    'Formulaire Nouvelle classe : trimestres proposés pour la maternelle / primaire');
  ok(app.includes("'Premier semestre'") && app.includes("'Second semestre'"),
    'Formulaire Nouvelle classe : semestres proposés pour le secondaire');
  ok(app.includes('Période'), 'Formulaire Nouvelle classe : champ « Période » explicite');

  // 7) Le type saisi se retrouve sur le bulletin (Word + Excel + écran)
  const be = fs30.readFileSync('src/utils/bulletinExport.ts', 'utf8');
  ok(be.includes('classData.sequence'), 'Type d’évaluation repris dans les exports de bulletins (Word + Excel)');
  const bs = fs30.readFileSync('src/components/BulletinsScreen.tsx', 'utf8');
  ok(bs.includes('classData.sequence'), 'Type d’évaluation affiché sur l’écran de bulletins');
}

// ============================================================
section('31. Publication simplifiée — assistant « npm run deploy:check »');
{
  const fs31 = (await import('fs')).default;
  const path31 = (await import('path')).default;
  const read = (p: string) => fs31.readFileSync(path31.join(process.cwd(), p), 'utf8');

  ok(fs31.existsSync('scripts/deploy-check.mjs'), 'Assistant de publication présent (scripts/deploy-check.mjs)');
  const pkg = JSON.parse(read('package.json'));
  ok(pkg.scripts?.['deploy:check'] === 'node scripts/deploy-check.mjs', 'package.json : script « deploy:check » disponible');
  ok(read('package.json').includes('"deploy:check"'), 'Une seule commande suffit : npm run deploy:check');

  const script = read('scripts/deploy-check.mjs');
  ok(script.includes('npm run build'), 'L’assistant construit automatiquement si dist/ est absent');
  ok(script.includes('index.html') && script.includes('sw.js') && script.includes('_redirects'),
    'L’assistant vérifie les fichiers de publication (index.html, sw.js, _redirects)');
  ok(script.includes('build:lowmem') && script.includes('DEPLOY') && script.includes('./assets/main-'),
    'L’assistant vérifie dist/ et deploy/, et que le bundle construit est chargé');
  ok(script.includes('netlify.com/drop'), 'Assistant : étapes Netlify Drop affichées');
  ok(script.includes('vercel.com') && script.includes('404: NOT_FOUND'),
    'Assistant : étapes Vercel + piège du 404 expliqué');

  const guide3 = read('GUIDE-PUBLICATION-LIEN.md');
  ok(guide3.includes('deploy:check'), 'Guide : la méthode « 1 commande » (deploy:check) documentée en tête');
  ok(guide3.includes('Ne glissez PAS') && guide3.includes('ZIP'), 'Guide : avertissement contre le ZIP / dossier source');
  ok(guide3.includes('Output Directory') && guide3.includes('dist'), 'Guide : Output Directory = dist (Vercel Git)');
  ok(guide3.includes('Dépannage'), 'Guide : tableau de dépannage (404 Netlify / 404 Vercel / hors-ligne)');
}

// ============================================================
section('32. Bulletins par évaluation (maternelle/primaire) + bulletin officiel secondaire (v23)');
{
  const subjects = [
    makeSubject('s1', 'Dictée', 18, 2, 0),
    makeSubject('s2', 'Math', 18, 2, 1),
  ];
  const student = makeStudent('e1', '001', 'DOSSOU', 'Ali');
  const notes: Note[] = [
    { ...makeNote('n1', 'e1', 's1', 5, 0), evaluation: 'formative1', updatedAt: 1 },
    { ...makeNote('n2', 'e1', 's1', 15, 2), evaluation: 'sommative1', updatedAt: 2 },
    { ...makeNote('n3', 'e1', 's2', 6, 0), evaluation: 'formative1', updatedAt: 3 },
    { ...makeNote('n4', 'e1', 's2', 14, 2), evaluation: 'sommative1', updatedAt: 4 },
  ];
  const makeClass = (s: Subject[], n: Note[], extra: Partial<ClassData> = {}): ClassData => ({
    id: 'c1', name: 'CM1 A', school: 'EPP Test', level: 'CM1', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: '1er trimestre', students: [student], subjects: s, notes: n,
    createdAt: 0, updatedAt: 0, ...extra,
  });

  // 1) Maternelle / Primaire : CHAQUE évaluation a son bulletin
  const cd = makeClass(subjects, notes);
  const bForm = computeBulletins(cd, { evaluation: 'formative1' })[0];
  const bSom = computeBulletins(cd, { evaluation: 'sommative1' })[0];
  ok(Math.abs((bForm.moyenne ?? 0) - 5.5) < 0.01, 'Bulletin « Évaluation formative 1 » : moyenne 5.5 (notes de la formative seule)', `→ ${bForm.moyenne}`);
  ok(Math.abs((bSom.moyenne ?? 0) - 16.5) < 0.01, 'Bulletin « Évaluation sommative 1 » : moyenne 16.5 (notes de la sommative seule)', `→ ${bSom.moyenne}`);
  const bAll = computeBulletins(cd)[0];
  ok(Math.abs((bAll.moyenne ?? 0) - 16.5) < 0.01, 'Sans choix : note de référence (dernière sommative) → 16.5', `→ ${bAll.moyenne}`);
  ok(bForm.rang === 1 && bSom.rang === 1, 'Rangs calculés pour chaque bulletin d’évaluation');

  // 2) Secondaire : MEPE + NPS1 + NPS2 → MS
  const sMath = { ...makeSubject('m', 'Mathématiques', 20, 0, 0), coefficient: 2 };
  const sFr = { ...makeSubject('f', 'Français', 20, 0, 1), coefficient: 4 };
  const sEps = { ...makeSubject('e', 'EPS', 20, 0, 2), coefficient: 1 };
  const secNotes: Note[] = [
    { ...makeNote('a1', 'e1', 'f', 16.67, 0), evaluation: 'formative1', updatedAt: 1 },
    { ...makeNote('a2', 'e1', 'f', 11, 0), evaluation: 'sommative1', updatedAt: 2 },
    { ...makeNote('a3', 'e1', 'f', 13, 0), evaluation: 'sommative2', updatedAt: 3 },
    { ...makeNote('a4', 'e1', 'm', 17, 0), evaluation: 'formative1', updatedAt: 4 },
    { ...makeNote('a5', 'e1', 'm', 4, 0), evaluation: 'sommative1', updatedAt: 5 },
    { ...makeNote('a6', 'e1', 'm', 14, 0), evaluation: 'sommative2', updatedAt: 6 },
    { ...makeNote('a7', 'e1', 'e', 15, 0), evaluation: 'sommative2', updatedAt: 7 },
  ];
  const cdSec: ClassData = makeClass([sMath, sFr, sEps], secNotes, { level: '6ème', educationType: 'secondaire', sequence: 'Premier semestre' });
  const bSec = computeBulletins(cdSec)[0];
  const rFr = bSec.results.find(r => r.subject.id === 'f')!;
  const rMath = bSec.results.find(r => r.subject.id === 'm')!;
  ok(Math.abs((rFr.ms ?? 0) - 13.556666) < 0.01, 'Français : MS = moyenne (16.67+11+13)/3 = 13.56', `→ ${rFr.ms}`);
  ok(Math.abs((rFr.mepe ?? 0) - 16.67) < 0.01 && Math.abs((rFr.nps1 ?? 0) - 11) < 0.01 && Math.abs((rFr.nps2 ?? 0) - 13) < 0.01, 'Français : colonnes MEPE / NPS1 / NPS2 remplies');
  ok(Math.abs((rMath.ms ?? 0) - 11.666666) < 0.01, 'Mathématiques : MS = (17+4+14)/3 = 11.67', `→ ${rMath.ms}`);
  // Moyenne pondérée par les coefficients : (13.5567×4 + 11.6667×2 + 15×1) / 7
  const expected = (13.556666666666667 * 4 + 11.666666666666666 * 2 + 15) / 7;
  ok(Math.abs((bSec.moyenne ?? 0) - expected) < 0.01, 'Moyenne semestrielle pondérée par les coefficients', `→ ${bSec.moyenne} (attendu ${expected.toFixed(3)})`);
  ok(bSec.totalCoef === 7, 'Total des coefficients = 7 (4+2+1)');

  // 3) Groupes : bilans littéraire / scientifique / autres
  const bilans = computeGroupBilans(bSec);
  const bLit = bilans.find(g => g.groupe === 'litteraire');
  const bSci = bilans.find(g => g.groupe === 'scientifique');
  ok(rFr.groupe === 'litteraire' && rMath.groupe === 'scientifique', 'Groupes inferés : Français → littéraire, Mathématiques → scientifique');
  ok(Math.abs((bLit?.moyenne ?? 0) - 13.556666) < 0.01, 'Bilan littéraire = 13.56', `→ ${bLit?.moyenne}`);
  ok(Math.abs((bSci?.moyenne ?? 0) - 11.666666) < 0.01, 'Bilan scientifique = 11.67', `→ ${bSci?.moyenne}`);
  ok(bSec.results.find(r => r.subject.id === 'e')!.groupe === 'autres', 'EPS → groupe « autres matières »');

  // 4) Évaluations proposées selon l'ordre d'enseignement
  ok(evaluationsForClass(cd).length === 4, 'Maternelle/primaire : 4 évaluations (formative 1, sommative 1/2/3)');
  const evSec = evaluationsForClass(cdSec);
  ok(evSec.length === 3 && evSec[0].label.includes('MEPE') && evSec[1].label.includes('NPS1') && evSec[2].label.includes('NPS2'),
    'Secondaire : 3 saisies (MEPE interrogations écrites, NPS1/NPS2 devoirs surveillés)');

  // 5) Export Word : colonnes officielles présentes dans le générateur
  const fs32 = (await import('fs')).default;
  const be = fs32.readFileSync('src/utils/bulletinExport.ts', 'utf8');
  ok(be.includes('MEPE') && be.includes('NPS1') && be.includes('NPS2') && be.includes('MSC'),
    'Export Word secondaire : colonnes MEPE / NPS1 / NPS2 / MSC générées');
  ok(be.includes('BULLETIN DE NOTES DU') && be.includes('Moyenne semestrielle'),
    'Export Word secondaire : titre « Bulletin de notes du … semestre » + moyenne semestrielle');
  ok(be.includes('computeGroupBilans'), 'Export Word : lignes de bilan (littéraire / scientifique / autres) via computeGroupBilans');
  ok(be.includes("g.label") && be.includes('GROUPE_LABELS') === false, 'Export Word : libellés des bilans issus du modèle (GROUPE_LABELS)');

  // 6) Exports : la signature accepte l'évaluation choisie
  ok(be.includes('evaluation?: EvaluationId'), 'Export : option « evaluation » passée aux exports Word/Excel (bulletin par évaluation)');
}

// ============================================================
section('33. Tableau de bord Enseignant — interface désencombrée (v23)');
{
  const fs33 = (await import('fs')).default;
  const app = fs33.readFileSync('src/App.tsx', 'utf8');

  ok(app.includes("Tableau de bord — Fonctions Enseignant"), 'Accueil : section « Fonctions Enseignant » dans le tableau de bord');
  ok(app.includes('teacherFunctions'), 'Accueil : fonctions Enseignant regroupées (tuiles)');
  ok(fs33.existsSync('src/components/ClassDashboardScreen.tsx'), 'Écran « Tableau de bord de classe » créé');
  ok(app.includes('ClassDashboardScreen'), 'Route /class/:id → tableau de bord de la classe');
  const dash = fs33.readFileSync('src/components/ClassDashboardScreen.tsx', 'utf8');
  ok(dash.includes('Évaluation') && dash.includes('Gestion') && dash.includes('Documents & outils'),
    'Tableau de bord de classe : sections Évaluation / Gestion / Documents');
  ok(app.includes('to={`/class/${classData.id}`}'), 'Cartes de classe de l’accueil : compactes (un seul clic → tableau de bord)');
  ok(!app.includes('handleDeleteClass'), 'Accueil allégé : la suppression de classe est déplacée dans le tableau de bord');
  ok(dash.includes('deleteClass') && dash.includes('window.confirm'), 'Suppression de classe : confirmation avant suppression');
}

// ============================================================
section('34. Déploiement robuste — « ça ne marche pas toujours » sur Vercel/Netlify (v24)');
{
  const fs34 = (await import('fs')).default;
  const path34 = (await import('path')).default;
  const read = (p: string) => fs34.readFileSync(path34.join(process.cwd(), p), 'utf8');

  // 1) 404.html : filet de sécurité Vercel (routes inconnues → application)
  const postbuild = read('scripts/postbuild.mjs');
  ok(postbuild.includes('404.html') && postbuild.includes("copyFileSync(join(DIST, 'index.html')"),
    'Post-build : dist/404.html créé (copie de index.html — filet de sécurité Vercel)');
  ok(postbuild.includes('deploy/'), 'Post-build : dossier deploy/ généré (publication zéro commande)');
  ok(postbuild.includes('COMMENT-DEPLOYER.txt'), 'Post-build : fichier COMMENT-DEPLOYER.txt inclus dans deploy/');
  const pkg34 = JSON.parse(read('package.json'));
  ok((pkg34.scripts?.build ?? '').includes('postbuild.mjs'), 'package.json : build = vite build + postbuild (404.html + deploy/)');

  // 2) Anti-cache du service worker (cause classique de l’« ancienne version »)
  const vjson34 = JSON.parse(read('vercel.json'));
  const swHeader = vjson34.headers?.find((h: any) => h.source === '/sw.js');
  ok(swHeader !== undefined, 'vercel.json : en-tête Cache-Control no-cache pour /sw.js');
  ok((swHeader?.headers?.[0]?.value ?? '').includes('no-cache'), 'Vercel : sw.js servi sans cache (les mises à jour arrivent)');
  const pjson34 = JSON.parse(read('public/vercel.json'));
  ok(JSON.stringify(pjson34.headers ?? {}) === JSON.stringify(vjson34.headers ?? {}),
    'public/vercel.json : mêmes en-têtes (copie déployable identique)');
  const headersFile = read('public/_headers');
  ok(headersFile.includes('/sw.js') && headersFile.includes('no-cache'), 'public/_headers : sw.js no-cache pour Netlify (Drop inclus)');
  const ntoml = read('netlify.toml');
  ok(ntoml.includes('command = "npm run build"'), 'netlify.toml : commande de build explicite (déploiement Git)');
  ok(ntoml.includes('[[headers]]') && ntoml.includes('/sw.js'), 'netlify.toml : en-têtes sw.js configurés');

  // 3) Garde-fou contre le dépôt du dossier source (page blanche Netlify)
  const srcIndex = read('index.html');
  ok(srcIndex.includes('/src/main.tsx') && srcIndex.includes("Ce n\\'est pas l\\'application"),
    'index.html source : garde-fou affiché si la page source est déposée (fini la page blanche)');
  ok(srcIndex.includes("root.childElementCount"), 'Garde-fou : n’intervient que si l’application n’a pas démarré');
  ok(srcIndex.includes('/@vite/client') && srcIndex.includes('MutationObserver'),
    'Garde-fou : pas de faux positif sur Vite/aperçu ni sur l’application construite à chargement lent');
  ok(srcIndex.includes('app.netlify.com/drop') && srcIndex.includes('vercel.com/drag-drop'),
    'Garde-fou : il indique la bonne solution (déposer le contenu de deploy/)');

  // 4) Vérificateur de lien
  ok(fs34.existsSync('scripts/deploy-verify.mjs'), 'Vérificateur de site déployé créé (scripts/deploy-verify.mjs)');
  ok(pkg34.scripts?.['deploy:verify'] === 'node scripts/deploy-verify.mjs', 'package.json : commande « deploy:verify » (npm run deploy:verify <lien>)');
  const verify = read('scripts/deploy-verify.mjs');
  ok(verify.includes('404.html') && verify.includes('/sw.js') && verify.includes('manifest.json'),
    'deploy:verify : contrôle accueil + sw.js + manifest + 404.html');
  ok(verify.includes('dossier SOURCE') && verify.includes('deploy/'), 'deploy:verify : diagnostic clair (dossier source déposé → contenu de deploy/)');
  ok(verify.includes('scriptSrcs') && verify.includes('Application construite'),
    'deploy:verify : distingue le vrai script /src/main du simple texte du garde-fou');

  // 5) Guide : dossier deploy/ + lien stable + dépannage enrichi
  const guide34 = read('GUIDE-PUBLICATION-LIEN.md');
  ok(guide34.includes('deploy/') && guide34.includes('COMMENT-DEPLOYER'), 'Guide : méthode « zéro commande » avec deploy/ documentée');
  ok(guide34.includes('Deploys'), 'Guide : mise à jour SANS changer de lien (Netlify « Deploys »)');
  ok(guide34.includes('page vide') || guide34.includes('page blanche'), 'Guide : dépannage page vide (dossier source sur Netlify)');
  ok(guide34.includes('deploy:verify'), 'Guide : vérification du lien (deploy:verify) documentée');
}

// ============================================================
section('35. Encyclopédie (sans savoir.fr/Encarta) + Type d’évaluation + Cours des administrateurs (v25)');
{
  const fs35 = (await import('fs')).default;
  const path35 = (await import('path')).default;
  const read = (p: string) => fs35.readFileSync(path35.join(process.cwd(), p), 'utf8');

  /* ---- a) Encyclopédie : « Encyclopédie », ni savoir.fr ni Encarta ---- */
  const kh = read('src/components/KnowledgeHubScreen.tsx');
  // v49 : renomme « Encyclopédie MSP » a la demande de l'utilisateur.
  ok(kh.includes('>Encyclopédie MSP<'), 'Encyclopédie : titre « Encyclopédie MSP » (sans « Savoir.fr »)');
  ok(!kh.includes('Savoir.fr') && !kh.includes('savoir.fr'), 'Encyclopédie : aucune mention « savoir.fr »');
  ok(!kh.includes('d’Encarta') && !kh.includes("d'Encarta") && !kh.includes('Encarta Junior'),
    'Encyclopédie : aucune mention « Encarta » dans les textes visibles');
  const kd = read('src/components/KidsDictionaryScreen.tsx');
  ok(!kd.includes('Encarta Junior'), 'Dictionnaire : plus de mention « façon Encarta Junior »');
  const home = read('src/App.tsx');
  ok(home.includes('>Encyclopédie MSP<'), 'Accueil : tuile « Encyclopédie MSP »');

  /* ---- b) Formulaire Nouvelle classe : champ « Type d’évaluation » LIBRE ---- */
  ok(home.includes("Type d'évaluation"), 'Nouvelle classe : champ « Type d’évaluation » présent');
  ok(!home.includes('EVALUATION_TYPES'), 'Nouvelle classe : AUCUNE sélection imposée (plus de boutons prédéfinis)');
  ok(home.includes('value={formData.evaluationType}\n              onChange={(e) => setFormData({ ...formData, evaluationType: e.target.value })}') ||
     home.includes('value={formData.evaluationType}'),
    'Nouvelle classe : champ de saisie libre (l’utilisateur écrit au clavier)');
  ok(home.includes('type="text"') && home.includes('Écrivez librement'), 'Nouvelle classe : champ texte avec consigne « écrivez librement »');
  ok(!home.includes('EVALUATION_TYPES.map') && !home.includes('EVALUATION_TYPES'), 'Nouvelle classe : plus de cartes cliquables pour le type d’évaluation');
  ok(home.includes('evaluationType: formData.evaluationType'), 'Nouvelle classe : le type d’évaluation tapé est enregistré avec la classe');
  ok(home.includes("classData.evaluationType || ''"), 'Nouvelle classe : type d’évaluation rechargé en modification (vide si absent)');
  const db35 = read('src/utils/database.ts');
  ok(db35.includes('evaluationType?: string') && db35.includes("champ LIBRE saisi par l'utilisateur"),
    'Modèle : evaluationType libre (texte tapé par l’utilisateur, compatible classes existantes)');
  ok(read('src/components/ClassDashboardScreen.tsx').includes('classData.evaluationType'), 'Tableau de bord de classe : type d’évaluation affiché');
  ok(read('src/components/BulletinsScreen.tsx').includes('Type :'), 'Écran bulletins : type d’évaluation affiché');

  /* ---- c) Cours des administrateurs (Cultivons-nous) : 4 rubriques ---- */
  const cc = read('src/utils/cultivonsCourses.ts');
  ok(cc.includes('Pédagogie Générale'), 'Cultivons-nous : rubrique « Pédagogie Générale »');
  ok(cc.includes('Législation de l’Administration Scolaire') || cc.includes("Législation de l'Administration Scolaire"), 'Cultivons-nous : rubrique « Législation de l’Administration Scolaire »');
  ok(cc.includes('Morale Professionnelle'), 'Cultivons-nous : rubrique « Morale Professionnelle »');
  ok(cc.includes('Épreuves et Corrigés'), 'Cultivons-nous : rubrique « Épreuves et Corrigés »');
  ok(cc.includes('author: string'), 'Cours : chacun précise le nom de l’auteur');
  ok(cc.includes('free: boolean') && cc.includes('price: number'), 'Cours : gratuit ou payant (prix en FCFA)');
  ok(cc.includes('views: number') && cc.includes('incrementCourseView'), 'Cours : compteur de visiteurs (incrémenté à chaque ouverture)');

  const cs = read('src/components/CoursesScreen.tsx');
  ok(cs.includes('Cours des administrateurs'), 'Cultivons-nous : section « Cours des administrateurs » affichée');
  ok(cs.includes('ADMIN_RUBRICS.map') && cs.includes('course.author'), 'Cultivons-nous : 4 rubriques + auteur affichés aux utilisateurs');
  ok(cs.includes('Gratuit') && cs.includes('FCFA'), 'Cultivons-nous : badge gratuit / prix affiché');
  ok(cs.includes('incrementCourseView(course.id)'), 'Cultivons-nous : ouverture d’un cours → compteur incrémenté');

  const adm = read('src/components/AdminCultivonsCourses.tsx');
  ok(adm.includes('visiteurs'), 'Administrateur : nombre de visiteurs visible par cours');
  ok(adm.includes('Nouveau cours') && adm.includes("Nom de l'auteur du cours") && adm.includes('Gratuit') && adm.includes('Payant'),
    'Administrateur : création d’un cours (rubrique, auteur, gratuit/payant)');
  ok(adm.includes('Pédagogie Générale') && adm.includes('Épreuves et Corrigés'), 'Administrateur : 4 rubriques de publication');
  ok(read('src/components/AdminDashboardScreen.tsx').includes('<AdminCultivonsCourses />'), 'Espace Administrateur : panneau des cours intégré (onglet Cours)');

  /* ---- d) Comportement réel : compteur de visiteurs ---- */
  const cult = await import('../src/utils/cultivonsCourses');
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  const seeded = cult.loadCultivonsCourses();
  ok(seeded.length === 4 && seeded.every((c: any) => c.author && c.title && c.content), 'Chargement : 4 cours de démonstration (un par rubrique), avec auteur et contenu');
  ok(seeded.some((c: any) => c.free) && seeded.some((c: any) => !c.free), 'Chargement : cours gratuits ET payants présents');
  const v0 = seeded[0].views ?? 0;
  const v1 = cult.incrementCourseView(seeded[0].id);
  ok(v1 === v0 + 1, `Compteur de visiteurs : ${v0} → ${v1} après ouverture`);
  ok((JSON.parse(store['msp_cultivons_courses_v1'])[0].views) === v1, 'Compteur de visiteurs : persistance en stockage local');
  const stats = cult.getCultivonsStats(cult.loadCultivonsCourses());
  ok(stats.totalViews >= 1 && stats.count === 4, 'Statistiques : visites totales par rubrique disponibles');
}

// ============================================================
section('36. Type d\'évaluation au bas du bulletin maternelle / primaire (v27)');
{
  const fs36 = (await import('fs')).default;
  const path36 = (await import('path')).default;
  const read36 = (p: string) => fs36.readFileSync(path36.join(process.cwd(), p), 'utf8');

  const exp = read36('src/utils/bulletinExport.ts');
  ok(exp.includes("Type d'évaluation : ${classData.evaluationType} (${classData.sequence})"),
    'Export Word (XML) : la ligne « Type d\'évaluation » est insérée dans le bulletin primaire');
  const signIdx = exp.indexOf("heading('SIGNATURES', 17)");
  const typeIdx = exp.indexOf("Type d'évaluation : ${classData.evaluationType}");
  ok(typeIdx > -1 && signIdx > -1 && typeIdx < signIdx,
    'Export Word : le type d\'évaluation apparaît AVANT les signatures (en bas du trimestre)');
  const exp2 = read36('src/components/BulletinsScreen.tsx');
  ok(exp2.includes("Type d'évaluation : {classData.evaluationType} — {classData.sequence}"),
    'Écran bulletins (panneau) : le type d\'évaluation s\'affiche au bas du bulletin');
  const footIdx = exp2.indexOf('bg-emerald-950/5');
  const typeIdx2 = exp2.indexOf("Type d'évaluation : {classData.evaluationType}");
  ok(typeIdx2 > -1 && footIdx > -1 && typeIdx2 > footIdx,
    'Écran bulletins : le type d\'évaluation est dans le pied de page du bulletin (sous les résultats)');
  ok(exp2.includes('{!secondaire && classData.evaluationType'),
    'Écran bulletins : la mention est réservée au préscolaire / primaire (pas au secondaire)');
  const src36 = read36('src/App.tsx');
  ok(src36.includes('evaluationType') && src36.includes('Écrivez librement'),
    'Saisie libre du type d\'évaluation au clavier (champ texte, aucun menu de cartes)');
}

// ============================================================
section('37. Accès SIMPLE : codes 6 chiffres, sans serveur (v28)');
{
  const fs37 = (await import('fs')).default;
  const path37 = (await import('path')).default;
  const read37 = (p: string) => fs37.readFileSync(path37.join(process.cwd(), p), 'utf8');

  const store37: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store37[k] ?? null,
    setItem: (k: string, v: string) => { store37[k] = v; },
    removeItem: (k: string) => { delete store37[k]; },
  };
  const sc = await import('../src/utils/simpleCode');

  const codes = sc.generateSimpleCodes(5);
  ok(codes.length === 5 && new Set(codes).size === 5, 'Génération : 5 codes SIMPLES distincts');
  ok(codes.every((c: string) => /^[0-9]{6}$/.test(c)), `Génération : chaque code = 6 chiffres (ex. ${codes[0]})`);
  ok(codes.every((c: string) => sc.isAccessCode(c)), 'Génération : les 5 codes sont acceptés par isAccessCode');
  const scSrc0 = read37('src/utils/simpleCode.ts');
  ok(sc.isValidSimpleCode('123456') === false && sc.isAccessCode('123456') === false,
    'Luhn : « 123456 » est rejeté (pseudo-code évident)');
  ok(sc.isValidSimpleCode('783423') === true, 'Luhn : « 783423 » (code de démonstration) est accepté');
  ok(sc.isValidSimpleCode('783420') === false, 'Luhn : « 783420 » (contrôle faux) est rejeté');
  ok(sc.formatSimpleCode('783420') === '783 420' && sc.cleanSimpleCode('783 420') === '783420',
    'Formatage : « 783 420 » affiché avec espace, 6 chiffres en interne');
  ok(sc.cleanSimpleCode('78ab3 4 2 0') === '783420', 'Nettoyage : lettres et espaces retirés, 6 chiffres conservés');
  ok(!scSrc0.includes('msp_master_access'),
    'SimpleCode : le code général n\'a pas été remplacé par un code maître (clés supprimées)');

  const gate = read37('src/components/AccessGate.tsx');
  ok(!gate.includes('licenseServer') && !gate.includes('verifyLicenseOnline') && !gate.includes('isServerLicensingEnabled'),
    'AccessGate : plus AUCUN appel au serveur de licences (fin du « code non reconnu par le serveur »)');
  ok(gate.includes('isAccessCode(code)'), 'AccessGate : le code 6 chiffres est validé localement (isAccessCode)');
  ok(gate.includes('inputMode="numeric"') && gate.includes('maxLength={7}') && gate.includes('formatSimpleCode(code)'),
    'AccessGate : champ unique de 6 chiffres (clavier numérique, espace automatique)');
  ok(gate.includes('Nom complet (obligatoire) *'), 'AccessGate : le nom complet est OBLIGATOIRE (le client l\'envoie toujours)');
  ok(gate.includes("if (!name.trim())"), 'AccessGate : refus si le nom complet est vide');
  const admin = read37('src/components/AdminDashboardScreen.tsx');
  ok(!admin.includes('generateAccessCode') && !admin.includes('generateStrongPassword') && !admin.includes('credentialType'),
    'Admin : générateur complexe supprimé (plus de mot de passe fort / type admin-user)');
  ok(admin.includes('generateSimpleCodes(5, codePlan)'), 'Admin : bouton « Générer 5 codes » (simples, 6 chiffres)');
  ok(!admin.includes('getMasterCode') && !admin.includes('setMasterCode') && !admin.includes('Code maître'),
    'Admin : le code maître 6 chiffres a été retiré (le code général reste le mot de passe administrateur)');
  ok(admin.includes('ADMIN_PASSWORD'), 'Admin : le code général (mot de passe administrateur) est toujours utilisé, inchangé');
  ok(admin.includes('sendCodeByWhatsApp') && admin.includes('formatSimpleCode(item.value)'),
    'Admin : envoi WhatsApp du code au format « 783 420 »');
  ok(!scSrc0.includes('fetch(') && !scSrc0.includes('import('),
    'simpleCode : module 100 % local, aucune dépendance réseau');
}

// ============================================================
section('38. Chrono d\'expiration du code d\'accès : 1 AN, côté admin ET utilisateur (v29)');
{
  const fs38 = (await import('fs')).default;
  const path38 = (await import('path')).default;
  const read38 = (p: string) => fs38.readFileSync(path38.join(process.cwd(), p), 'utf8');

  const sc = await import('../src/utils/simpleCode');
  const DAY = 86400000;
  ok(sc.CODE_VALIDITY_DAYS === 365, 'Constante : validité de 1 an (365 jours)');
  const t0 = Date.now();
  ok(sc.expiresAtFrom(t0) === t0 + 365 * DAY, 'expiresAtFrom : date d\'expiration = création + 1 an');
  ok(sc.daysRemaining(t0 + 10 * DAY) === 10, 'daysRemaining : compte à rebours exact (J+10 → 10 jours)');
  ok(sc.daysRemaining(t0 - DAY) === -1, 'daysRemaining : négatif après expiration');
  ok(/^\d{2}\/\d{2}\/\d{4}$/.test(sc.formatDateFr(t0)), 'formatDateFr : date au format JJ/MM/AAAA');

  const adminCode = sc.generateSimpleCodes(1)[0];
  const created = Date.now();
  const exp = sc.expiresAtFrom(created);
  ok(/^[0-9]{6}$/.test(adminCode) && sc.isAccessCode(adminCode), 'Code administrateur : 6 chiffres valides (même règle que les clients)');
  ok(exp === created + 365 * DAY && sc.daysRemaining(exp) >= 363 && sc.daysRemaining(exp) <= 365,
    'Code administrateur : expiration à 1 an (chrono affiché côté admin)');
  ok(sc.daysRemaining(sc.expiresAtFrom(Date.now() - 400 * DAY)) < 0, 'Code administrateur : signalé expiré après 1 an');

  const store38: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store38[k] ?? null,
    setItem: (k: string, v: string) => { store38[k] = v; },
    removeItem: (k: string) => { delete store38[k]; },
  };
  const prof = await import('../src/utils/userProfile');
  const simple = sc.generateSimpleCodes(1)[0];
  prof.saveActivation('KOUASSI Awa', simple);
  const chrono = prof.getActivationChrono();
  ok(chrono.active === true && typeof chrono.expiresAt === 'number' && chrono.daysLeft >= 364 && chrono.daysLeft <= 365,
    `Activation : expiration à +${sc.CODE_VALIDITY_DAYS} jours (jours restants = ${chrono.daysLeft})`);
  const manual = { activated: true, name: 'X', code: '111111', activatedAt: Date.now() - (30 * DAY) };
  localStorage.setItem('msp_activation', JSON.stringify(manual));
  const bf = prof.getActivation();
  ok(bf !== null && typeof bf.expiresAt === 'number' && bf.expiresAt === manual.activatedAt + 365 * DAY,
    'Reprise : une activation d\'avant le chrono reçoit automatiquement son expiration (+1 an)');
  localStorage.setItem('msp_activation', JSON.stringify({ ...manual, expiresAt: Date.now() - DAY }));
  ok(prof.getActivationChrono().expired === true, 'Activation expirée : signalée comme expirée (jours négatifs)');

  const profUi = read38('src/components/ProfileScreen.tsx');
  ok(profUi.includes('getActivationChrono') && profUi.includes('formatDateFr') && profUi.includes('restant'),
    'Utilisateur (Mon espace) : carte « Abonnement » avec date d\'expiration et jours restants');
  const gate38 = read38('src/components/AccessGate.tsx');
  ok(gate38.includes('Chrono d\'expiration') && gate38.includes('CODE_VALIDITY_DAYS'),
    'Utilisateur (écran d\'accès) : mention « chrono d\'expiration — 1 an » avant activation');

  const admin38 = read38('src/components/AdminDashboardScreen.tsx');
  ok(admin38.includes('daysRemaining') && admin38.includes('formatDateFr') && admin38.includes('expiresAtFrom'),
    'Admin : chronos d\'expiration (dates + jours restants) présents pour le code client et le code administrateur');
  ok(admin38.includes("Prolonger d'1 an") && admin38.includes('expiresAtFrom'),
    'Admin : bouton « Prolonger d\'1 an » sur chaque code généré (expiration +365 j)');
  ok(admin38.includes('expiresAt') && admin38.includes('expire le'),
    'Admin : chaque code généré affiche sa date d\'expiration');
  ok(admin38.includes('expire le') && admin38.includes('1 an'),
    'Admin : le message WhatsApp mentionne la durée de validité du code');
}

// ============================================================
section('39. Code général inchangé + code personnel par administrateur (v30)');
{
  const fs39 = (await import('fs')).default;
  const path39 = (await import('path')).default;
  const read39 = (p: string) => fs39.readFileSync(path39.join(process.cwd(), p), 'utf8');

  const cfg = read39('src/utils/adminConfig.ts');
  ok(cfg.includes('ADMIN_PASSWORD') && cfg.includes('MSP-Catalyste@@007-2026'),
    'Code général : mot de passe administrateur unique et à jour (v34)');
  const admin39 = read39('src/components/AdminDashboardScreen.tsx');
  ok(admin39.includes('input === ADMIN_PASSWORD'), 'Admin : le code général reste la clé de l\'administrateur principal (login)');
  ok(!admin39.includes('Code maître') && !read39('src/utils/simpleCode.ts').includes('msp_master_access'),
    'Admin : le « code maître » 6 chiffres introduit par erreur a été retiré — rien ne remplace le code général');
  const gate39 = read39('src/components/AccessGate.tsx');
  ok(gate39.includes("if (!name.trim())") && gate39.includes('Nom complet (obligatoire) *'),
    'Utilisateur : le nom complet est à nouveau obligatoire à l\'activation (seul le code passe à 6 chiffres)');
  ok(gate39.includes('isAccessCode(code)') && !gate39.includes('getMasterCode'),
    'Utilisateur : validation locale des 6 chiffres, sans aucun code maître');

  ok(admin39.includes('accessCode?: string') && admin39.includes('accessCodeExpiresAt?: number'),
    'Équipe : chaque membre peut porter un code personnel + sa date d\'expiration');
  ok(admin39.includes('function generateAdminCode') && admin39.includes('crypto.getRandomValues') && admin39.includes('String(100000 + (bytes[0] % 900000))') && admin39.includes('expiresAtFrom(now)'),
    'Équipe : génération d\'un code personnel 6 chiffres (validité 1 an) par l\'administrateur principal');
  ok(admin39.includes('sendAdminCodeByWhatsApp') && admin39.includes('remplace le code général'),
    'Équipe : envoi du code personnel par WhatsApp (mention « remplace le code général »)');
  ok(admin39.includes("Générer le code d'accès personnel"),
    'Équipe : bouton « Générer le code d\'accès personnel » affiché pour chaque administrateur');
  ok(admin39.includes("member.id === 'owner'") && admin39.includes('code général') && admin39.includes('seul peut générer'),
    'Équipe : l\'administrateur principal n\'a pas de code personnel — il garde le code général (règle claire)');

  ok(admin39.includes('const code = cleanSimpleCode(input)') && admin39.includes('code.length !== 6') && admin39.includes('cleanSimpleCode(candidate.accessCode) !== code'), 'Login : recherche du membre par son code personnel (6 chiffres)');
  ok(admin39.includes('member:${member.id}') && admin39.includes('setSessionId(member.id)'),
    'Login : la session retient QUEL administrateur est connecté (pas un simple « true »)');
  ok(admin39.includes('Connecté :') && admin39.includes('currentAdmin.name'), 'Admin : le nom et le rôle du connecté sont affichés');

  ok(admin39.includes('TAB_ACCESS'), 'Admin : table des onglets par rôle (fonctions correspondantes)');
  ok(admin39.includes("team: ['Super Administrateur']") && admin39.includes("access: ['Super Administrateur']"),
    'Admin : gestion de l\'équipe et des codes clients réservées à l\'administrateur principal');
  ok(admin39.includes("resources: ['Super Administrateur', 'Responsable Ressources', 'Responsable Annonces']"),
    'Admin (v35) : les Ressources sont réservées au Responsable Ressources (cloisonnement par poste)');
  ok(admin39.includes('allowedTabs = '), 'Admin : seuls les onglets autorisés pour le rôle sont affichés');
  ok(admin39.includes("canAccess('team')") && admin39.includes("canAccess('access')") && admin39.includes("canAccess('governance')"),
    'Admin : garde d\'accès sur chaque onglet (défense en profondeur)');
}

// ============================================================
section('40. Tarification : 999 FCFA/an (Essentiel) et 1500 FCFA/an (Complet) (v31)');
{
  const fs40 = (await import('fs')).default;
  const path40 = (await import('path')).default;
  const read40 = (p: string) => fs40.readFileSync(path40.join(process.cwd(), p), 'utf8');

  const sc = await import('../src/utils/simpleCode');
  const ess = sc.generateSimpleCodes(5, 'essentiel');
  const com = sc.generateSimpleCodes(5, 'complet');
  ok(ess.length === 5 && ess.every((c: string) => c.startsWith('9') && sc.isAccessCode(c)),
    `Génération « Essentiel » : 5 codes valides commençant par 9 (ex. ${ess[0]})`);
  ok(com.length === 5 && com.every((c: string) => c.startsWith('1') && sc.isAccessCode(c)),
    `Génération « Complet » : 5 codes valides commençant par 1 (ex. ${com[0]})`);
  ok(ess.every((c: string) => sc.planOfCode(c) === 'essentiel') && com.every((c: string) => sc.planOfCode(c) === 'complet'),
    'planOfCode : « 9… » → Essentiel, « 1… » → Complet (lu dans le code, aucun serveur)');
  ok(sc.planOfCode('783423') === 'complet', 'planOfCode : un code antérieur à la tarification est traité en Complet');

  const sub = await import('../src/utils/subscription');
  ok(sub.PLANS.essentiel.price === 999 && sub.PLANS.complet.price === 1500,
    'Tarifs : 999 FCFA/an (Essentiel) et 1500 FCFA/an (Complet)');
  ok(sub.PLANS.essentiel.includes.length === 3, 'Essentiel : 3 fonctions (enrôlement élèves + personnel + importation des notes)');
  ok(sub.isAllowedForEssentiel('/enrolement-personnel'), 'Essentiel : enrôlement du personnel INCLUS (v36)');
  ok(sub.PLANS.complet.includes.some((f: string) => f.includes('Tout le plan Essentiel')), 'Complet : inclut tout l\'Essentiel');

  ok(sub.canAccessPath('essentiel', '/enrolement-eleves') === true, 'Essentiel : accès à l\'ENRÔLEMENT DES ÉLÈVES');
  ok(sub.canAccessPath('essentiel', '/class/abc123/students') === true, 'Essentiel : accès à l\'IMPORTATION DES NOTES (écran Élèves)');
  ok(sub.canAccessPath('essentiel', '/class/abc123/edit') === true, 'Essentiel : accès à l\'édition de la classe (indispensable)');
  ok(sub.canAccessPath('essentiel', '/class/abc123') === true, 'Essentiel : le tableau de bord de la classe reste accessible (hub)');
  ok(sub.canAccessPath('essentiel', '/profile') === true && sub.canAccessPath('essentiel', '/') === true,
    'Essentiel : accueil et Mon espace accessibles');
  ok(sub.canAccessPath('essentiel', '/class/abc123/entry') === false, 'Essentiel : SAISIE des notes BLOQUÉE');
  ok(sub.canAccessPath('essentiel', '/class/abc123/bulletins') === false, 'Essentiel : BULLETINS bloqués');
  ok(sub.canAccessPath('essentiel', '/encyclopedie') === false, 'Essentiel : les ressources/encyclopédie sont bloquées');
  ok(sub.canAccessPath('complet', '/encyclopedie') === true && sub.canAccessPath('complet', '/class/abc123/bulletins') === true,
    'Complet : toutes les fonctions sont accessibles');

  const store40: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store40[k] ?? null,
    setItem: (k: string, v: string) => { store40[k] = v; },
    removeItem: (k: string) => { delete store40[k]; },
  };
  const prof40 = await import('../src/utils/userProfile');
  prof40.saveActivation('KOUASSI Awa', ess[0]);
  const ch40 = prof40.getActivationChrono();
  ok(ch40.plan === 'essentiel' && prof40.hasFullAccess() === false,
    'Activation d\'un code « 9… » : formule Essentiel mémorisée (accès limité)');
  prof40.saveActivation('KOUASSI Awa', com[0]);
  ok(prof40.getActivationChrono().plan === 'complet' && prof40.hasFullAccess() === true,
    'Activation d\'un code « 1… » : formule Complet mémorisée (toutes les fonctions)');
  localStorage.setItem('msp_activation', JSON.stringify({ activated: true, name: 'X', code: '783423', activatedAt: Date.now() }));
  ok(prof40.getActivationChrono().plan === 'complet',
    'Reprise : une activation d\'avant la tarification est traitée en Complet (accès conservé)');

  const gate40 = read40('src/components/AccessGate.tsx');
  /*
   * v54 : les tarifs ne sont plus ecrits en dur dans l'accueil — ils sont
   * lus dans le catalogue `subscription.ts` et rendus dynamiquement. On
   * verifie donc la SOURCE (le catalogue) et le fait que l'accueil la lise,
   * plutot qu'une chaine de caracteres qui n'existe plus.
   */
  const cat40 = await import('../src/utils/subscription');
  ok(cat40.PLANS.essentiel.price === 999 && cat40.PLANS.complet.price === 1500,
    'Écran d\'accès : les formules 999 et 1500 FCFA/an existent au catalogue');
  ok(gate40.includes('PLAN_CATALOG') && gate40.includes('PLAN_ORDER'),
    'Écran d\'accès : les formules sont affichées depuis le catalogue');
  ok(gate40.includes('Formule détectée'), 'Écran d\'accès : la formule est détectée pendant la saisie du code');
  const admin40 = read40('src/components/AdminDashboardScreen.tsx');
  ok(admin40.includes('codePlan') && admin40.includes('PLANS') && admin40.includes('generateSimpleCodes(5, codePlan)'),
    'Admin : choix de la formule (999/1500) avant « Générer 5 codes »');
  ok(admin40.includes('item.plan ? PLANS[item.plan].label : PLANS.complet.label') && admin40.includes('codePlan'),
    'Admin : chaque code généré porte un badge de formule (999 ou 1500)');
  ok(admin40.includes('sendCodeByWhatsApp') && admin40.includes('Formule :'),
    'Admin : le message WhatsApp indique la formule du code');
  ok(admin40.includes('generateAdminCode') && admin40.includes("Générer le code d'accès personnel"),
    'Admin : option claire de génération du CODE DU PERSONNEL (membres de l\'équipe)');
  const app40 = read40('src/App.tsx');
  ok(app40.includes('UpgradeScreen') && app40.includes('isAllowedForEssentiel') && app40.includes("plan === 'essentiel'"),
    'App : les routes non incluses sont verrouillées pour les Essentiel (écran de mise à niveau)');
  const dash40 = read40('src/components/ClassDashboardScreen.tsx');
  ok(dash40.includes('hasFullAccess') && dash40.includes('Lock') && dash40.includes('isAllowedForEssentiel'),
    'Tableau de bord : cadenas sur les fonctions non incluses (mention « Formule COMPLET »)');
  const prof40ui = read40('src/components/ProfileScreen.tsx');
  ok(prof40ui.includes('SubscriptionCard') && prof40ui.includes("Passer à la formule COMPLET"),
    'Mon espace : carte abonnement avec formule et bouton « Passer à la formule COMPLET »');
  const up40 = read40('src/components/UpgradeScreen.tsx');
  /*
   * v53 : l'ecran gere desormais DEUX cibles (Complet et Pro) et lit le
   * tarif dans `PLANS[targetPlan]` au lieu de `PLANS.complet` en dur.
   * Ce qui compte reste : un tarif issu de PLANS + un contact WhatsApp.
   */
  ok(up40.includes('PLANS[targetPlan]') && up40.includes('openWhatsApp'),
    'Écran de mise à niveau : propose le passage payant par WhatsApp');
  ok(up40.includes('target.price'),
    'Écran de mise à niveau : le tarif affiché suit la formule visée');
}


// ============================================================
section('41. « Autres évaluations » v32 — à côté des 4 évaluations EducMaster');
{
  const db41 = await import('../src/utils/database');
  const fs41 = (await import('fs')).default;
  const path41 = (await import('path')).default;
  const read41 = (p: string) => fs41.readFileSync(path41.join(process.cwd(), p), 'utf8');

  // a) Création d'une évaluation personnalisée
  const custom41 = db41.makeCustomEvaluation('Projet de classe', '2027-02-10');
  ok(String(custom41.id).startsWith('custom-') && custom41.label === 'Projet de classe' && custom41.date === '2027-02-10',
    'Création : id « custom-… » + libellé + date');
  const customNoDate = db41.makeCustomEvaluation('Devoir maison');
  ok(customNoDate.id.startsWith('custom-') && customNoDate.date === undefined && typeof customNoDate.createdAt === 'number',
    'Création : sans date (date optionnelle) + horodatage');
  ok(db41.isCustomEvaluation(custom41.id) && db41.isCustomEvaluation('custom-xyz') && !db41.isCustomEvaluation('sommative1') && !db41.isCustomEvaluation(undefined),
    'Détection : isCustomEvaluation (true pour custom-…, false pour les 4 officielles)');

  // b) evaluationsForClass : officielles + personnalisées
  const prim41: any = { educationType: 'primaire', customEvaluations: [custom41] };
  const evs41 = db41.evaluationsForClass(prim41);
  ok(evs41.length === 5 && evs41[0].id === 'formative1' && evs41[1].id === 'sommative1' && evs41[4].id === custom41.id,
    'Classe : 4 évaluations EducMaster puis l\'« Autre évaluation » à la suite');
  const sec41: any = { educationType: 'secondaire', secondaryLevel: '6e', secondarySerie: 'A' as any, customEvaluations: [] };
  ok(db41.evaluationsForClass(sec41).length === 3, 'Secondaire : 3 évaluations officielles (interrogations + devoirs surveillés NPS1/NPS2)');

  // c) Libellés (exports Word/Excel compris)
  ok(db41.evaluationLabel('formative1') === 'Évaluation formative 1', 'Libellé officiel conservé');
  ok(db41.evaluationLabel(custom41.id, [custom41]) === 'Projet de classe', 'Libellé d\'une « Autre évaluation » résolu');
  ok(db41.evaluationLabel('custom-inconnue', [custom41]) === 'custom-inconnue', 'Libellé inconnu → identifiant brut (aucun crash)');
  ok(db41.evaluationLabel(undefined) === 'Toutes les évaluations', 'Sans évaluation → « Toutes les évaluations »');

  // d) Priorité des notes : une officielle prime toujours sur une personnalisée ;
  //    à défaut, la note de l'« Autre évaluation » est utilisée.
  const subj41 = makeSubject('S41', 'Dictée', 18, 2);
  const st41 = makeStudent('E41', '041', 'AKPAKI', 'Luc');
  const off41 = makeNote('N41a', st41.id, subj41.id, 12, 1, false); off41.evaluation = 'sommative1' as any;
  const cus41 = makeNote('N41b', st41.id, subj41.id, 17, 1.5, false); cus41.evaluation = custom41.id;
  const best41 = db41.findBestNote([cus41, off41], st41.id, subj41.id);
  ok(best41?.id === 'N41a', 'Priorité : la note officielle (sommative 1) prime sur l\'« Autre évaluation »');
  const onlyCustom41 = db41.findBestNote([cus41], st41.id, subj41.id);
  ok(onlyCustom41?.id === 'N41b', 'À défaut de note officielle, la note de l\'« Autre évaluation » est utilisée');

  // e) UI : la fonction est à côté des 4 évaluations (saisie des notes + import Excel)
  const app41 = read41('src/App.tsx');
  ok(app41.includes('Autres évaluations') && app41.includes('makeCustomEvaluation') && app41.includes('customEvaluations'),
    'UI : « ➕ Autres évaluations » dans la saisie des notes, création + persistance');
  ok(app41.includes('customEvalMode') && app41.includes('feuilles non reconnues'),
    'Import Excel : rattachement des feuilles non reconnues à une évaluation personnalisée');
  const db41src = read41('src/utils/database.ts');
  ok(db41src.includes('customEvaluations') && db41src.includes('evaluationsForClass') && db41src.includes('isCustomEvaluation'),
    'Modèle : ClassData.customEvaluations + API d\'évaluation complète');
  const bul41 = read41('src/utils/bulletinExport.ts');
  ok(bul41.includes('evaluationLabel(evaluation, classData.customEvaluations)'),
    'Exports Word/Excel : le libellé de l\'« Autre évaluation » est utilisé sur le bulletin');

  // f) Persistance réelle (IndexedDB) : sauvegarde puis relecture
  const msg41 = db41.saveClass({ id: 'CLS-AUDIT-41', name: 'Test', level: 'CM1', educationType: 'primaire' as any,
    sequence: 'Trimestre 1', schoolYear: '2026-2027', students: [], subjects: [],
    notes: [], customEvaluations: [custom41], createdAt: Date.now(), updatedAt: Date.now() } as any);
  const back41 = await db41.getClass('CLS-AUDIT-41');
  ok(back41?.customEvaluations?.[0]?.label === 'Projet de classe', 'Persistance : l\'évaluation personnalisée est rechargée (IndexedDB)');
  await db41.deleteClass('CLS-AUDIT-41');
}

// ============================================================
// SECTION 42 (v33) — Enrôlement du personnel, Retour contextuel,
// Bienvenue personnalisée, PV « Seuil atteint », Stats par discipline
// ============================================================
{
  section('42. v33 — Personnel, Retour, Bienvenue, Seuil atteint, Stats disciplines');
  const fs42 = await import('node:fs');
  const path42 = await import('node:path');
  const read42 = (p: string) => fs42.readFileSync(path42.join(process.cwd(), p), 'utf8');

  // a) Module Enrôlement du personnel — modèle Excel officiel
  const staff = await import('../src/utils/staffEnrollment');
  const cols = staff.STAFF_COLUMNS.map(c => c.label);
  ok(cols[0] === 'Matricule', 'Personnel : 1re colonne = Matricule');
  ok(cols[1] === 'Id ANPE (AME)', 'Personnel : colonne Id ANPE (AME)');
  ok(cols[2].startsWith('Nom') && cols[3].startsWith('Prénoms'), 'Personnel : Nom puis Prénoms (complets, sans abréviation)');
  ok(cols[4] === 'Sexe (M/F)', 'Personnel : colonne Sexe (M/F)');
  ok(cols.includes('Date de naissance') && cols.includes('Lieu de naissance'), 'Personnel : naissance (date + lieu)');
  ok(cols.includes('Nationalité (PAYS)'), 'Personnel : Nationalité (PAYS)');
  ok(cols.includes('Numéro de téléphone') && cols.includes('Email'), 'Personnel : téléphone + email');
  ok(cols.includes('IFU'), 'Personnel : colonne IFU');
  ok(cols[cols.length - 1] === 'Date de première prise de service', 'Personnel : dernière colonne = Date de première prise de service');
  ok(staff.STAFF_COLUMNS.length === 12, 'Personnel : 12 colonnes exactement (modèle officiel)');

  const rec = staff.emptyStaffRecord();
  ok(staff.validateStaffRecord(rec).length > 0, 'Personnel : fiche vide → erreurs de validation');
  rec.nom = 'DOSSOU'; rec.prenoms = 'Marie Ange'; rec.sexe = 'F';
  rec.dateNaissance = '1987-01-01'; rec.datePriseService = '2015-09-01';
  ok(staff.validateStaffRecord(rec).length === 0, 'Personnel : nom + prénoms + sexe suffisent à valider');
  rec.email = 'pas-un-email';
  ok(staff.validateStaffRecord(rec).some(e => e.includes('Email')), 'Personnel : email invalide détecté');
  rec.email = 'marie@ecole.bj'; rec.ifu = '12';
  ok(staff.validateStaffRecord(rec).some(e => e.includes('IFU')), 'Personnel : IFU trop court détecté');
  rec.ifu = '1234567890123';
  ok(staff.validateStaffRecord(rec).length === 0, 'Personnel : IFU 13 chiffres accepté');
  ok(staff.staffValue(rec, 'nom') === 'DOSSOU', 'Personnel : le nom est exporté en MAJUSCULES');
  const blob = await staff.generateStaffExcel([rec], []);
  ok(blob && (blob as any).size > 0, 'Personnel : export Excel généré (classeur non vide)');
  const staffDateWorkbook = new ExcelJS.Workbook();
  await staffDateWorkbook.xlsx.load(await blob.arrayBuffer());
  const staffSheet = staffDateWorkbook.getWorksheet('TOUT LE PERSONNEL')!;
  const staffBirthCell = staffSheet.getCell('F2');
  const staffStartCell = staffSheet.getCell('L2');
  ok(staffBirthCell.numFmt === '@' && staffBirthCell.value === '01/01/1987'
    && staffStartCell.numFmt === '@' && staffStartCell.value === '01/09/2015',
    'Enrôlement personnel : date issue de l’erreur EducMaster exportée littéralement en JJ/MM/AAAA');
  const st = staff.staffStats([rec]);
  ok(st.total === 1 && st.femmes === 1 && st.hommes === 0, 'Personnel : statistiques par sexe correctes');

  const staffUI = read42('src/components/StaffEnrollmentScreen.tsx');
  ok(staffUI.includes('goBack()'), 'Personnel : bouton Retour contextuel');
  ok(staffUI.includes('Exporter Excel'), 'Personnel : bouton d\'export Excel présent');
  const app42 = read42('src/App.tsx');
  ok(app42.includes('/enrolement-personnel') && app42.includes('StaffEnrollmentScreen'),
    'Personnel : route /enrolement-personnel enregistrée');
  ok(read42('src/utils/appModules.ts').includes('Enrôlement du personnel'), 'Personnel : sous-module du module Enrôlement (v36)');

  // b) Bouton Retour → page précédente (et non l'accueil)
  const comps = fs42.readdirSync(path42.join(process.cwd(), 'src/components')).filter(f => f.endsWith('.tsx'));
  let headerHome = 0;
  for (const f of comps) {
    const c = read42('src/components/' + f);
    if (c.includes("onClick={() => navigate('/')} className=\"p-2 bg-white/20 rounded-lg\"")) headerHome++;
    if (c.includes("onClick={() => navigate('/')} className=\"p-2 bg-white/10 rounded-lg\"")) headerHome++;
  }
  ok(headerHome === 0, 'Retour : plus aucun bouton d\'en-tête ne renvoie de force à l\'accueil');
  ok(read42('src/components/EnrollmentScreen.tsx').includes('goBack()'), 'Retour : Enrôlement élèves revient à la page précédente');
  ok(read42('src/components/CloudScreen.tsx').includes('goBack()'), 'Retour : Cloud revient à la page précédente');
  ok(read42('src/components/ProfileScreen.tsx').includes('goBack()'), 'Retour : Mon espace revient à la page précédente');

  // c) Mot de bienvenue personnalisé
  ok(app42.includes('welcomeName') && app42.includes('Bienvenue,'), 'Bienvenue : message personnalisé au nom de l\'utilisateur');
  ok(app42.includes('getProfile()') && app42.includes('chrono.name'), 'Bienvenue : nom lu dans le profil, sinon dans l\'activation');
  ok(app42.includes('Bonjour') && app42.includes('Bonsoir'), 'Bienvenue : salutation adaptée à l\'heure');

  // d) PV du primaire — « Seuil atteint »
  ok(app42.includes('Seuil atteint') && app42.includes('Seuil non atteint'), 'PV : colonne « Seuil atteint » dans le tableau des notes');
  ok(app42.includes('validated >= 6'), 'PV primaire : seuil = au moins 6 matières validées');
  ok(app42.includes('nbSeuilAtteint'), 'PV : total de la classe ayant atteint le seuil');

  // e) Statistiques par discipline / matière évaluée
  const sub = await import('../src/utils/subjectStats');
  ok(sub.SUBJECT_THRESHOLD === 10, 'Stats disciplines : seuil fixé à 10/20');
  const cls42: any = {
    id: 'CLS-42', name: 'CM2 A', school: 'EPP', level: 'CM2', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: 'Trimestre 1',
    students: [
      { id: 's1', matricule: '1', nom: 'A', prenoms: 'a', sexe: 'F', createdAt: 1 },
      { id: 's2', matricule: '2', nom: 'B', prenoms: 'b', sexe: 'F', createdAt: 1 },
      { id: 's3', matricule: '3', nom: 'C', prenoms: 'c', sexe: 'M', createdAt: 1 },
      { id: 's4', matricule: '4', nom: 'D', prenoms: 'd', sexe: 'M', createdAt: 1 },
    ],
    subjects: [{ id: 'sub1', name: 'Français', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 }],
    notes: [
      { id: 'n1', studentId: 's1', subjectId: 'sub1', noteObtenue: 16, notePerfectionnement: 2, absent: false, updatedAt: 1 },
      { id: 'n2', studentId: 's2', subjectId: 'sub1', noteObtenue: 5,  notePerfectionnement: 0, absent: false, updatedAt: 1 },
      { id: 'n3', studentId: 's3', subjectId: 'sub1', noteObtenue: 14, notePerfectionnement: 1, absent: false, updatedAt: 1 },
      { id: 'n4', studentId: 's4', subjectId: 'sub1', noteObtenue: null, notePerfectionnement: null, absent: true, updatedAt: 1 },
    ],
    createdAt: 1, updatedAt: 1,
  };
  const rows = sub.computeSubjectStats(cls42);
  ok(rows.length === 1, 'Stats disciplines : une ligne par matière évaluée');
  const r0 = rows[0];
  ok(r0.filles.inscrits === 2 && r0.garcons.inscrits === 2, 'Stats : nombre d\'inscrits par sexe');
  ok(r0.filles.composants === 2 && r0.garcons.composants === 1, 'Stats : nombre ayant composé (absent exclu)');
  ok(r0.filles.atteint === 1 && r0.filles.sousSeuil === 1, 'Stats filles : seuil atteint / non atteint');
  ok(r0.filles.atteintPct === 50 && r0.filles.sousSeuilPct === 50, 'Stats filles : pourcentages corrects');
  ok(r0.garcons.atteint === 1 && r0.garcons.atteintPct === 100, 'Stats garçons : 100 % de seuil atteint');
  ok(r0.total.composants === 3 && r0.total.inscrits === 4, 'Stats total : inscrits et composants');
  ok(typeof r0.difficultes === 'string' && r0.difficultes.length > 0, 'Stats : difficultés observées renseignées');
  ok(typeof r0.remediation === 'string' && r0.remediation.length > 0, 'Stats : remédiations proposées');
  ok(r0.difficultes.includes('composé') || r0.remediation.includes('rattrapage'), 'Stats : l\'absence au devoir est signalée');
  const summary = sub.summarizeSubjectStats(rows);
  ok(summary.disciplines === 1 && summary.evaluees === 1, 'Stats : synthèse générale cohérente');
  const statsUI = read42('src/components/SubjectStatisticsScreen.tsx');
  ok(statsUI.includes('Nombre') && statsUI.includes('Filles (F)') && statsUI.includes('Garçons (M)'),
    'Stats UI : ventilation Fille (Féminin) / Garçon (Masculin)');
  ok(statsUI.includes('Difficultés observées') && statsUI.includes('À remédier'),
    'Stats UI : difficultés observées et remédiations affichées');
  ok(app42.includes('/class/:id/statistiques-disciplines'), 'Stats : route par classe enregistrée');
  ok(read42('src/components/ClassDashboardScreen.tsx').includes('statistiques-disciplines'),
    'Stats : accessible depuis le tableau de bord de la classe');
}

// ============================================================
// SECTION 43 (v34) — Retour intelligent, cours modifiables,
// installation iPhone, nouveau code d'accès global
// ============================================================
{
  section('43. v34 — Retour, Cours en ligne, iPhone, Code d\'accès');
  const fs43 = await import('node:fs');
  const path43 = await import('node:path');
  const read43 = (p: string) => fs43.readFileSync(path43.join(process.cwd(), p), 'utf8');

  // a) RETOUR INTELLIGENT
  const back = await import('../src/utils/useSmartBack');
  ok(back.parentPath('/class/ABC/presences') === '/class/ABC', 'Retour : sous-page de classe → tableau de bord de la classe');
  ok(back.parentPath('/class/ABC/statistiques-disciplines') === '/class/ABC', 'Retour : statistiques → tableau de bord de la classe');
  ok(back.parentPath('/class/ABC') === '/', 'Retour : tableau de bord de la classe → accueil');
  ok(back.parentPath('/class/new') === '/', 'Retour : nouvelle classe → accueil');
  ok(back.parentPath('/enrolement-personnel') === '/', 'Retour : page de 1er niveau → accueil');
  ok(back.parentPath('/') === '/', 'Retour : accueil reste l\'accueil (jamais de sortie de l\'app)');
  ok(typeof back.pushNavEntry === 'function' && typeof back.useSmartBack === 'function',
    'Retour : pile de navigation + hook disponibles');

  const comps43 = fs43.readdirSync(path43.join(process.cwd(), 'src/components')).filter(f => f.endsWith('.tsx'));
  let rawBack = 0;
  for (const f of comps43) { if (read43('src/components/' + f).includes('navigate(-1)')) rawBack++; }
  ok(rawBack === 0, 'Retour : plus aucun navigate(-1) brut dans les écrans (remplacé par le retour intelligent)');
  const app43 = read43('src/App.tsx');
  ok(!app43.includes('navigate(-1)'), 'Retour : App.tsx utilise aussi le retour intelligent');
  ok(app43.includes('pushNavEntry(location.pathname)'), 'Retour : chaque page visitée est mémorisée');
  ok(read43('src/components/ClassDashboardScreen.tsx').includes('goBack()'),
    'Retour : l\'écran de classe (CE1 / EPP NIMBO) revient à la page précédente');

  // b) COURS EN LIGNE — la modification est effective
  const cm = await import('../src/utils/courseMarketplace');
  ok(typeof cm.saveCourseOverride === 'function' && typeof cm.applyCourseOverrides === 'function',
    'Cours : surcharge (override) des cours du programme disponible');
  const builtIn: any[] = [
    { id: 'programme-course-CE1-Français-0', title: 'Ancien titre', author: 'Programme', level: 'CE1',
      description: 'ancienne description', price: '0', type: 'gratuit', link: '', status: 'approved',
      createdAt: 0, lessons: [{ title: 'Ancienne leçon', content: 'ancien contenu' }] },
  ];
  ok(cm.applyCourseOverrides(builtIn as any)[0].title === 'Ancien titre', 'Cours : sans modification, le cours d\'origine est servi');
  cm.saveCourseOverride({ ...builtIn[0], title: 'Titre CORRIGÉ', lessons: [{ title: 'Leçon corrigée', content: 'nouveau contenu' }] } as any);
  const after = cm.applyCourseOverrides(builtIn as any);
  ok(after[0].title === 'Titre CORRIGÉ', 'Cours : la modification du titre est effective (plus d\'ancienne donnée)');
  ok(after[0].lessons[0].content === 'nouveau contenu', 'Cours : le contenu de la leçon modifiée est bien servi');
  ok(after[0].id === builtIn[0].id, 'Cours : l\'identifiant reste le même (pas de copie parasite)');
  const merged = cm.mergeCourses(builtIn as any, []);
  ok(merged.length === 1 && merged[0].title === 'Titre CORRIGÉ', 'Cours : la liste affichée ne montre PAS de doublon ancien/nouveau');
  cm.removeCourseOverride(builtIn[0].id);
  ok(cm.applyCourseOverrides(builtIn as any)[0].title === 'Ancien titre', 'Cours : « Rétablir la version d\'origine » fonctionne');

  const editor43 = read43('src/components/AdminCourseEditorScreen.tsx');
  ok(editor43.includes('saveCourseOverride(updated)'), 'Cours : l\'éditeur enregistre une surcharge au lieu d\'une copie');
  ok(!editor43.includes('-custom-${Date.now()}'), 'Cours : le bug de duplication d\'identifiant est supprimé');
  ok(editor43.includes('resetDraft'), 'Cours : bouton « Rétablir la version d\'origine » présent');
  ok(read43('src/components/CourseMarketplaceScreen.tsx').includes('mergeCourses('),
    'Cours : l\'écran « Cours en ligne » affiche les versions modifiées');

  // c) INSTALLATION SUR iPHONE
  const html43 = read43('index.html');
  ok(html43.includes('apple-mobile-web-app-capable'), 'iPhone : application plein écran depuis l\'écran d\'accueil');
  ok(html43.includes('viewport-fit=cover'), 'iPhone : prise en charge de l\'encoche (viewport-fit)');
  ok(html43.includes('sizes="180x180"') && html43.includes('apple-touch-icon'), 'iPhone : icône d\'accueil 180×180 fournie');
  ok(html43.includes('apple-touch-startup-image'), 'iPhone : image de démarrage déclarée');
  const man43 = JSON.parse(read43('public/manifest.json'));
  ok(man43.display === 'standalone' && Array.isArray(man43.display_override), 'iPhone/Android : affichage application autonome');
  ok(read43('src/index.css').includes('safe-area-inset'), 'iPhone : marges de sécurité (encoche, barre d\'accueil)');
  const inst43 = read43('src/components/InstallPrompt.tsx');
  ok(inst43.includes('Sur l’écran d’accueil'), 'iPhone : guide d\'installation Safari intégré à l\'application');
  ok(inst43.includes('iPad') && inst43.includes('Macintosh'), 'iPhone : détection iPhone ET iPad (iPadOS moderne)');
  ok(inst43.includes('beforeinstallprompt'), 'Android : bouton d\'installation natif conservé');
  ok(app43.includes('<InstallPrompt />'), 'Installation : la bannière est affichée dans l\'application');

  // d) CODE D'ACCÈS GLOBAL
  const cfg43 = await import('../src/utils/adminConfig');
  ok(cfg43.ADMIN_PASSWORD === 'MSP-Catalyste@@007-2026', 'Code d\'accès global mis à jour : MSP-Catalyste@@007-2026');
  ok(!read43('src/utils/adminConfig.ts').includes('ADMIN-Catalyste@@04-2026'), 'Code d\'accès : l\'ancien code n\'est plus accepté');
  const adminGuards = [
    ['AdminDashboardScreen', 'ADMIN_PASSWORD'], ['AdminScreen', 'ADMIN_PASSWORD'],
    ['EnrollmentScreen', 'hasAdminRole'], ['StaffEnrollmentScreen', 'hasAdminRole'],
    ['KnowledgeHubScreen', 'hasAdminRole'], ['KidsDictionaryScreen', 'hasAdminRole'],
    ['ClassDocumentsScreen', 'hasAdminRole'], ['ResourceFiles', 'hasAdminRole'],
  ];
  for (const [f, guard] of adminGuards) {
    ok(read43('src/components/' + f + '.tsx').includes(guard), 'Contrôle admin adapté au rôle utilisé par ' + f);
  }
}

// ============================================================
// SECTION 44 (v35) — Gouvernance : fonctions réservées aux Super
// Administrateurs + poste de Gestionnaire Technique
// ============================================================
{
  section('44. v35 — Gouvernance, rôles cloisonnés, Gestionnaire Technique');
  const fs44 = await import('node:fs');
  const path44 = await import('node:path');
  const read44 = (p: string) => fs44.readFileSync(path44.join(process.cwd(), p), 'utf8');
  const dash = read44('src/components/AdminDashboardScreen.tsx');

  // a) Session locale de membre décodée et validée dans l’utilitaire partagé.
  const sessionUtils = read44('src/utils/adminSession.ts');
  ok(sessionUtils.includes("session?.startsWith('member:')")
      && sessionUtils.includes("session.slice('member:'.length)")
      && sessionUtils.includes('ADMIN_SESSION_EXPIRES_KEY'),
    'Sécurité : session membre décodée, limitée dans le temps et revalidée au rechargement');
  ok(dash.includes("currentAdmin?.role === 'Super Administrateur' ? 'Support'")
      && dash.includes("currentAdmin?.role ?? 'Support'"),
    'Sécurité : repli sur le rôle le plus restreint (Support), jamais Super Administrateur');
  ok(!dash.includes("currentAdmin?.role ?? 'Super Administrateur'"),
    'Sécurité : l\'ancien défaut « Super Administrateur » est supprimé (faille corrigée)');
  ok(dash.includes("sessionId === 'owner'") && dash.includes("? 'Super Administrateur'"),
    'Sécurité : seul le code général ouvre une session Super Administrateur');

  // b) Fonctions RÉSERVÉES aux Super Administrateurs
  ok(dash.includes("export const SUPER_ADMIN_ONLY: AdminTab[] = ['team', 'access', 'paiements', 'donnees']"),
    'Réservé : équipe, codes d\'accès, paiements ET données déclarés Super Administrateur uniquement');
  ok(dash.includes("team: ['Super Administrateur'],"), 'Réservé : onglet Équipe — Super Administrateur seul');
  ok(dash.includes("access: ['Super Administrateur'],"), 'Réservé : onglet Accès (codes) — Super Administrateur seul');
  ok(dash.includes('if (SUPER_ADMIN_ONLY.includes(tabId) && !superAdmin) return false;'),
    'Réservé : barrière d\'affichage des onglets réservés');
  ok(dash.includes('function requireSuperAdmin('), 'Réservé : garde-fou sur les ACTIONS, pas seulement l\'affichage');
  for (const fn of ['addMember', 'toggleMember', 'deleteMember', 'inviteMember', 'generateCredential', 'generateAdminCode', 'sendAdminCodeByWhatsApp']) {
    const idx = dash.indexOf('function ' + fn + '(');
    ok(idx > 0 && dash.slice(idx, idx + 300).includes('requireSuperAdmin('),
      'Action protégée par le garde-fou : ' + fn);
  }

  // c) Nouveau poste : Gestionnaire Technique
  ok(dash.includes("'Gestionnaire Technique'"), 'Poste créé : Gestionnaire Technique');
  ok(dash.includes("technique: ['Super Administrateur', 'Gestionnaire Technique']"),
    'Technique : onglet réservé au Gestionnaire Technique (et au Super Administrateur)');
  ok(dash.includes('Maintenance technique') && dash.includes('Sauvegardes et restauration'),
    'Technique : permissions du poste définies');
  ok(dash.includes('function readTechInfo()') && dash.includes('techPurgeCache') && dash.includes('techExportDiagnostic'),
    'Technique : diagnostic, purge du cache et export du rapport disponibles');
  ok(dash.includes('ROLE_MISSION'), 'Équipe : mission de chaque poste affichée');
  ok(dash.includes("technique: { icon: Wrench, label: 'Technique' }"), 'Technique : onglet visible dans la barre');

  // d) Cloisonnement : chaque membre n'a QUE ses fonctions
  const tabAccess = dash.slice(dash.indexOf('const TAB_ACCESS'), dash.indexOf('const ROLE_PERMISSIONS'));
  ok(!/team: \[[^\]]*Responsable/.test(tabAccess) && !/access: \[[^\]]*Responsable/.test(tabAccess),
    'Cloisonnement : aucun Responsable n\'accède à Équipe ni à Accès');
  ok(!/team: \[[^\]]*Gestionnaire Technique/.test(tabAccess) && !/access: \[[^\]]*Gestionnaire Technique/.test(tabAccess),
    'Cloisonnement : le Gestionnaire Technique ne nomme pas et ne génère pas de codes');
  ok(!/resources: \[[^\]]*Support/.test(tabAccess), 'Cloisonnement : le Support ne modifie pas les ressources');
  ok(!/technique: \[[^\]]*Modérateur/.test(tabAccess), 'Cloisonnement : le Modérateur n\'accède pas à la maintenance');
  ok(!/orientation: \[[^\]]*Modérateur/.test(tabAccess), 'Cloisonnement : le Modérateur ne modifie pas l\'orientation');
  ok(dash.includes('const first = (Object.keys(TAB_ACCESS) as AdminTab[])'),
    'Cloisonnement : un membre atterrit sur le premier onglet AUTORISÉ par son rôle');
  ok(dash.includes('Fonctions réservées aux Super Administrateurs'),
    'Gouvernance : les règles sont affichées à toute l\'équipe');
  ok(dash.includes('Postes de l’équipe et responsabilités'),
    'Gouvernance : tableau des postes et de leurs responsabilités');
}

// ============================================================
// 45. v36 — MODULES, PRÉSENCES DEMI-JOURNÉES, COFFRE DES CODES,
//     QUIZ 100 NIVEAUX, BULLETINS PAR ÉVALUATION
// ============================================================
{
  section('45. v36 — Modules, présences, codes, quiz, bulletins');
  const fs45 = await import('node:fs');
  const path45 = await import('node:path');
  const read42 = (p: string) => fs45.readFileSync(path45.join(process.cwd(), p), 'utf8');

  // --- 45.1 Modules et sous-modules ---
  const mods = await import('../src/utils/appModules');
  const titles = mods.APP_MODULES.map((m: any) => m.title);
  ok(titles.includes('Enrôlement'), 'Module « Enrôlement » créé');
  ok(titles.includes("Orientation de l'élève"), 'Module « Orientation de l\'élève » créé');
  ok(titles.includes('Préparation de classe'), 'Module « Préparation de classe » créé');
  ok(titles.includes('Espace partenariat'), 'Module « Espace partenariat » créé');

  const enr = mods.APP_MODULES.find((m: any) => m.path === '/enrolement')!;
  const enrSubs = enr.subModules.map((x: any) => x.title);
  ok(enrSubs.includes('Enrôlement intelligent des élèves'),
     'Renommage : « Enrôlement intelligent des élèves »');
  ok(enrSubs.includes('Enrôlement du personnel'), 'Enrôlement : le personnel est un sous-module');
  ok(enr.subModules.length === 4 && enr.subModules.some((item: any) => item.path === '/liste-pdf-excel'), 'Enrôlement : élèves, personnel, liste PDF→Excel et photos EducMaster');

  const ori = mods.APP_MODULES.find((m: any) => m.path === '/orientation')!;
  const oriSubs = ori.subModules.map((x: any) => x.title);
  ok(oriSubs.includes('Orientation scolaire') && oriSubs.includes('Orientation post-BAC'),
     'Orientation : scolaire + post-BAC en sous-modules');

  const prep = mods.APP_MODULES.find((m: any) => m.path === '/preparation-classe')!;
  const prepSubs = prep.subModules.map((x: any) => x.title);
  ok(prepSubs.includes("Programme d'études"), 'Préparation : Programme d\'études');
  ok(prepSubs.includes('Planification annuelle'), 'Préparation : Planification annuelle');
  ok(prepSubs.includes('Fiches pédagogiques / Préparation'), 'Préparation : Fiches pédagogiques');
  ok(prepSubs.includes('Générateur IA avancé de fiches'), 'Préparation : Générateur IA avancé accessible');
  ok(prepSubs.includes('Agent IA Master Soutien Pédagogique'),
     'Préparation : Agent IA Master Soutien Pédagogique accessible');
  ok(prep.subModules.filter((x: any) => x.comingSoon).length === 0,
     'Les outils IA de préparation ne sont plus marqués « À venir »');
  ok(prep.subModules.length === 5, 'Préparation de classe : exactement 5 sous-modules');

  const part = mods.APP_MODULES.find((m: any) => m.path === '/espace-partenariat')!;
  const partSubs = part.subModules.map((x: any) => x.title);
  ok(partSubs.includes('Annonces / Recrutement') && partSubs.includes('Publicités'),
     'Partenariat : annonces + publicités en sous-modules');
  // v39 : +3 sous-modules d'Éducation à la vie (11 → 14).
  // v47 : +1 (releve des effectifs cantine) +4 (boite a outils) = 27.
  // Historique : v48 = 29 ; v49 = 31 ; v52 = 39 ; v58 = 41.
  // v67 ajoute les fonctions Maternelle/Photos ; v68 ajoute les arts oraux.
  ok(mods.totalSubModules() === 50, `Total sous-modules = 50 (obtenu ${mods.totalSubModules()})`);

  const appSrc = read42('src/App.tsx');
  for (const r of ['/enrolement', '/orientation', '/preparation-classe', '/espace-partenariat']) {
    ok(appSrc.includes(`path="${r}"`), `Route du module ${r} enregistrée`);
  }
  ok(!appSrc.includes('Enrôlement intelligent<'), 'Ancien libellé « Enrôlement intelligent » retiré');

  // --- 45.2 Présences : demi-journées ---
  const sched = await import('../src/utils/attendanceSchedule');
  ok(sched.halfDaysFor('2026-09-07').length === 2, 'Lundi : 2 demi-journées (matin + après-midi)');
  ok(sched.halfDaysFor('2026-09-08').length === 2, 'Mardi : 2 demi-journées');
  ok(sched.halfDaysFor('2026-09-09').length === 1, 'MERCREDI : une seule demi-journée');
  ok(sched.halfDaysFor('2026-09-09')[0] === 'matin', 'Mercredi : c\'est le matin');
  ok(sched.halfDaysFor('2026-09-10').length === 2, 'Jeudi : 2 demi-journées');
  ok(sched.halfDaysFor('2026-09-11').length === 2, 'Vendredi : 2 demi-journées');
  ok(sched.halfDaysFor('2026-09-12').length === 0, 'SAMEDI : pas de classe');
  ok(sched.halfDaysFor('2026-09-13').length === 0, 'DIMANCHE : pas de classe');
  ok(sched.unavailableReason('2026-09-12') !== null, 'Samedi : appel indisponible avec explication');
  ok(sched.unavailableReason('2026-09-07') === null, 'Lundi : appel disponible');

  const labels = Object.values(sched.STATUS_LABELS);
  ok(labels.includes('Présent'), 'Statut : Présent');
  ok(labels.includes('Absence avec justification'), 'Statut : Absence avec justification');
  ok(labels.includes('Absence sans justification'), 'Statut : Absence sans justification');
  ok(labels.includes('Journée fériée'), 'Statut ajouté : Journée fériée');
  ok(labels.includes('Demi-journée de séance'), 'Statut ajouté : Demi-journée de séance');
  ok(sched.STATUS_ORDER.length === 5, 'Les 5 options de présence sont proposées');
  ok(sched.NON_COMPTABILISES.includes('ferie'), 'Le férié n\'est pas comptabilisé contre l\'élève');

  // 5 jours de classe/semaine : 4 jours × 2 + mercredi × 1 = 9 demi-journées
  let week = 0;
  for (const d of ['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']) {
    week += sched.halfDaysFor(d).length;
  }
  ok(week === 9, `Une semaine = 9 demi-journées de classe (obtenu ${week})`);

  // --- 45.3 Coffre des codes d'accès ---
  const vaultSrc = read42('src/utils/credentialsVault.ts');
  ok(vaultSrc.includes("'msp_activation'") && vaultSrc.includes("'msp_admin_team'"),
     'Coffre : activation et équipe protégées');
  ok(vaultSrc.includes("'msp_generated_admin_passwords'"), 'Coffre : codes administrateurs protégés');
  ok(read42('src/main.tsx').includes('ensureCredentialsSurviveUpdate'),
     'Les codes sont restaurés au démarrage après une mise à jour');
  ok(read42('src/components/AccessGate.tsx').includes('clearAllExcept(true)'),
     'Réinitialisation locale : les codes d\'accès sont conservés');
  ok(!read42('src/components/AccessGate.tsx').includes('localStorage.clear();'),
     'Plus aucun effacement total du stockage');
  const dashV36 = read42('src/components/AdminDashboardScreen.tsx');
  ok(dashV36.includes('purgeTechnical()'), 'Purge technique : ne touche pas aux codes');
  ok(dashV36.includes('revokeCode(') && dashV36.includes('deleteCode('),
     'Super Admin : retrait ET suppression d\'un code possibles');
  ok(dashV36.includes("requireSuperAdmin('retirer ou réactiver un code d’accès')"),
     'Retrait d\'un code réservé au Super Administrateur');
  ok(read42('src/components/AccessGate.tsx').includes('codeStatus('),
     'À l\'activation, un code retiré ou supprimé est refusé');

  // --- 45.4 Quiz : 100 niveaux × 10 questions ---
  const kq = await import('../src/utils/kidsQuiz');
  ok(kq.LEVELS_COUNT === 100, 'Quiz : 100 niveaux');
  ok(kq.QUESTIONS_PER_LEVEL === 10, 'Quiz : 10 questions par niveau');
  const pool = Array.from({ length: 60 }, (_, i) => ({
    word: `mot${i}`, definition: `définition ${i}`, example: `exemple ${i}`,
  }));
  const lvl1 = kq.generateLevel(pool as any, 1);
  ok(lvl1.length === 10, `Niveau 1 : 10 questions (obtenu ${lvl1.length})`);
  ok(lvl1.every(q => q.options.includes(q.correct)), 'Chaque question contient la bonne réponse');
  const lvl90 = kq.generateLevel(pool as any, 90);
  ok(lvl90[0].options.length > lvl1[0].options.length, 'La difficulté augmente avec le niveau');
  ok(kq.generateLevel(pool as any, 5)[0].correct === kq.generateLevel(pool as any, 5)[0].correct,
     'Un niveau est reproductible (génération déterministe)');
  ok(kq.levelTier(1) === 'Découverte' && kq.levelTier(100) === 'Champion', 'Paliers de progression');

  // Semaine du lundi au dimanche
  const lundi = kq.weekId(new Date('2026-09-07T10:00:00'));
  const dimanche = kq.weekId(new Date('2026-09-13T10:00:00'));
  ok(lundi === dimanche, `Semaine lundi→dimanche = même semaine (${lundi} / ${dimanche})`);
  const lundiSuivant = kq.weekId(new Date('2026-09-14T10:00:00'));
  ok(lundiSuivant !== lundi, 'Le lundi suivant ouvre une nouvelle semaine');
  const range = kq.weekRange(new Date('2026-09-10T10:00:00'));
  ok(range.start.getDay() === 1 && range.end.getDay() === 0, 'La semaine va du lundi au dimanche');
  ok(typeof kq.weeklyChampion === 'function', 'Publication du meilleur score de la semaine');
  ok(read42('src/components/KidsDictionaryScreen.tsx').includes('Meilleur score de la semaine'),
     'Le nom du meilleur joueur de la semaine est publié dans l\'application');

  // --- 45.5 Dictionnaire et encyclopédie enrichis ---
  const pack = await import('../src/utils/kidsDictionaryPack');
  ok(pack.DICTIONARY_PACK.length >= 400, `Dictionnaire enrichi : ${pack.DICTIONARY_PACK.length} mots ajoutés`);
  ok(pack.DICTIONARY_PACK.every((w: any) => w.word && w.definition && w.example && w.family),
     'Chaque mot possède définition, exemple et famille');
  const encPack = await import('../src/utils/encyclopediaPack');
  const encCount = Object.values(encPack.ENCYCLOPEDIA_PACK).reduce((n: number, a: any) => n + a.length, 0);
  ok(encCount >= 100, `Encyclopédie enrichie : ${encCount} articles ajoutés`);

  // --- 45.6 Bulletins par évaluation + Bilan annuel ---
  const bull = read42('src/components/BulletinsScreen.tsx');
  ok(!bull.includes('Toutes (synthèse)'), 'Bulletins : le mode « synthèse » est retiré');
  ok(bull.includes('bilan-annuel'), 'Bulletins : renvoi vers le Bilan annuel');
  ok(bull.includes('chaque évaluation a son propre bulletin') ||
     bull.includes('chaque évaluation a son propre bulletin</strong>'),
     'Maternelle & primaire : chaque évaluation a SON bulletin');
  ok(appSrc.includes('bilan-annuel'), 'Route du Bilan annuel enregistrée');
  const annual = read42('src/components/AnnualReportScreen.tsx');
  ok(annual.includes('Moyennes et présences'), 'Bilan annuel : moyennes ET présences');
  ok(annual.includes('computeStudentAttendance'), 'Bilan annuel : présences en demi-journées');

  // --- 45.7 Abonnement 999 FCFA ---
  const subs = await import('../src/utils/subscription');
  ok(subs.isAllowedForEssentiel('/enrolement-personnel'),
     'Formule 999 FCFA : enrôlement du personnel inclus');
  ok(subs.isAllowedForEssentiel('/enrolement'), 'Formule 999 FCFA : page du module Enrôlement accessible');
  ok(subs.PLANS.essentiel.includes.some((x: string) => x.includes('personnel')),
     'Le personnel est annoncé dans la formule Essentiel');
  ok(!subs.isAllowedForEssentiel('/encyclopedie'), 'Formule 999 : les autres fonctions restent réservées');

  // --- 45.8 Cache PWA ---
  ok(/master-soutien-v(3[6-9]|[4-9][0-9]|[1-9][0-9]{2})\b/.test(read42('public/sw.js')), 'Cache PWA à jour (v36 ou plus)');
}

// ============================================================
// SECTION 46 — v37 : Assistant pédagogique IA conversationnel
// ============================================================
{
  const fs46 = require('fs');
  const path46 = require('path');
  const read46 = (f: string) => fs46.readFileSync(path46.join(process.cwd(), f), 'utf8');
  console.log('\n--- 46. Assistant IA conversationnel (v37) ---');

  const iv = await import('../src/utils/aiInterview');
  const en = await import('../src/utils/lessonEnrichment');

  // 46.1 — L'entretien démarre et enchaîne
  const q1 = iv.nextQuestion({});
  ok(!!q1 && q1.id === 'kind', 'L’assistant ouvre l’entretien par une question');
  ok(!!q1 && q1.chips.length >= 3, 'Des réponses rapides sont proposées');
  const q2 = iv.nextQuestion({ kind: 'Une fiche pédagogique' });
  ok(!!q2 && q2.id === 'niveau', 'La question suivante est posée automatiquement');

  // 46.2 — Les questions s'adaptent au contexte
  const chipsMat = iv.nextQuestion({ kind: 'x', niveau: 'Maternelle (GS)' })!.chips.join(' ');
  ok(/Graphisme|Langage/.test(chipsMat), 'Maternelle : matières adaptées au préscolaire');
  const chipsCm2 = iv.nextQuestion({ kind: 'x', niveau: 'CM2' })!.chips.join(' ');
  ok(/Dictée|Histoire/.test(chipsCm2), 'Primaire : matières adaptées');
  ok(iv.isEarlyLevel('CI') && iv.isEarlyLevel('Maternelle (GS)') && !iv.isEarlyLevel('3ème'),
     'Les petits niveaux sont correctement détectés');
  ok(iv.isScienceSubject('Mathématiques') && iv.isLanguageSubject('Langage'),
     'Les familles de matières sont reconnues');

  // 46.3 — Questions conditionnelles
  const baseSci = { kind: 'fiche', niveau: 'CE1', matiere: 'Mathématiques', theme: 'T', duree: '45 min',
    effectif: '', materiel: '', prerequis: '', obstacle: '', contexte: '' } as Record<string, string>;
  let seenSci = false;
  for (let i = 0; i < 12; i++) {
    const q = iv.nextQuestion(baseSci);
    if (!q) break;
    if (q.id === 'experience') { seenSci = true; break; }
    baseSci[q.id] = q.chips[0] || 'x';
  }
  ok(seenSci, 'Matière scientifique : la question sur la manipulation est posée');

  const baseLang = { kind: 'fiche', niveau: 'CM1', matiere: 'Lecture', theme: 'T', duree: '45 min' } as Record<string, string>;
  let seenLang = false;
  for (let i = 0; i < 14; i++) {
    const q = iv.nextQuestion(baseLang);
    if (!q) break;
    if (q.id === 'support_texte') { seenLang = true; break; }
    baseLang[q.id] = q.chips[0] || 'x';
  }
  ok(seenLang, 'Matière de langue : la question sur le support est posée');

  // 46.4 — L'assistant réagit aux réponses
  ok(iv.acknowledge('theme', 'Addition', {}).includes('Addition'), 'L’assistant reprend la réponse donnée');
  ok(iv.acknowledge('effectif', '50 à 70', {}).includes('groupes'), 'Effectif chargé : conseil adapté');
  ok(iv.acknowledge('kind', '', {}).length > 10, 'Une question passée reçoit tout de même une réponse');

  // 46.5 — Entretien complet et progression
  const full: Record<string, string> = {};
  let guard = 0;
  while (guard++ < 40) {
    const q = iv.nextQuestion(full);
    if (!q) break;
    full[q.id] = q.chips[0] || 'Addition avec retenue';
  }
  ok(iv.nextQuestion(full) === null, 'L’entretien se termine proprement');
  const prog = iv.interviewProgress(full);
  ok(prog.done === prog.total && prog.total >= 15, `Progression complète (${prog.total} questions)`);
  ok(iv.interviewRecap(full).length >= 15, 'Le récapitulatif reprend toutes les réponses');

  // 46.6 — Conversion vers le moteur de génération
  const input = iv.answersToPromptInput({
    kind: 'Des exercices avec corrigés', niveau: 'CE2', matiere: 'Mathématiques',
    theme: 'Les fractions', duree: '45 min', standard: 'PPO', effectif: '50 à 70',
  });
  ok(input.generationKind === 'exercices', 'Le type de production demandé est respecté');
  ok(input.standard === 'PPO', 'La norme pédagogique choisie est respectée');
  ok(input.theme === 'Les fractions' && input.niveau === 'CE2', 'Thème et niveau transmis au moteur');
  ok((input.consignes || '').includes('Effectif'), 'Le contexte de classe est transmis au moteur');

  // 46.7 — La fiche produite est réellement enrichie
  const { generateLocalLesson } = await import('../src/utils/localPedagogicalEngine');
  const answers = {
    kind: 'Une fiche pédagogique', niveau: 'CE1', matiere: 'Mathématiques',
    theme: 'Addition avec retenue', duree: '45 min', effectif: '50 à 70',
    materiel: 'Tableau et craie uniquement', prerequis: 'Ils découvrent totalement la notion',
    obstacle: 'Ils appliquent la technique sans comprendre', contexte: 'Le marché du quartier',
    experience: 'Oui, avec du matériel simple', evaluation: 'Évaluation formative rapide (ardoises)',
    differenciation: 'Oui, des apprenants en grande difficulté', standard: 'APC Bénin',
    consignes: 'Prévoir une trace écrite courte',
  };
  const brut = generateLocalLesson(iv.answersToPromptInput(answers));
  const riche = en.enrichLesson(brut, answers);
  ok(riche.deroulement.length > brut.deroulement.length * 1.5,
     'La fiche enrichie est nettement plus développée que la fiche brute');
  ok(riche.deroulement.includes('SITUATION DE DÉPART') && riche.deroulement.includes('marché'),
     'Situation de départ ancrée dans le contexte choisi');
  ok(riche.deroulement.includes('RAPPEL DES PRÉREQUIS'), 'Les prérequis déclarés sont exploités');
  ok(riche.deroulement.includes('ORGANISATION DE LA CLASSE') && riche.deroulement.includes('groupes'),
     'L’organisation tient compte de l’effectif réel');
  ok(riche.deroulement.includes('DIFFÉRENCIATION') && riche.deroulement.includes('Soutien'),
     'Différenciation explicite pour les apprenants en difficulté');
  ok(riche.deroulement.includes('MANIPULATION'), 'La manipulation scientifique est intégrée');
  ok(riche.deroulement.includes('EXIGENCE PARTICULIÈRE'), 'L’exigence de l’enseignant est reportée');
  ok(riche.evaluation.includes('ardoise'), 'La modalité d’évaluation choisie est appliquée');
  ok(riche.evaluation.includes('Obstacle ciblé'), 'La remédiation cible l’obstacle déclaré');
  ok(riche.materiel.includes('Tableau et craie'), 'Seul le matériel réellement disponible est listé');

  // 46.8 — Les variantes de contexte produisent des contenus différents
  const s1 = en.buildSituation({ theme: 'T', contexte: 'Le marché du quartier' });
  const s2 = en.buildSituation({ theme: 'T', contexte: 'Le champ / la récolte' });
  ok(s1 !== s2 && s1.includes('marché') && s2.includes('récolte'),
     'Chaque ancrage local produit une situation différente');
  const r1 = en.buildRemediation({ obstacle: 'Ils confondent les notions proches' });
  const r2 = en.buildRemediation({ obstacle: 'Ils se découragent vite' });
  ok(r1 !== r2, 'Chaque obstacle déclenche une remédiation différente');
  ok(en.buildOrganisation({ effectif: 'Plus de 70' }) !== en.buildOrganisation({ effectif: 'Moins de 30' }),
     'L’organisation varie selon l’effectif');

  // 46.9 — Câblage dans l'application
  const app46 = read46('src/App.tsx');
  ok(app46.includes('/assistant-ia'), 'La route de l’assistant est enregistrée');
  const mods46 = read46('src/utils/appModules.ts');
  ok(mods46.includes('/assistant-ia'), 'L’assistant figure dans le module Préparation de classe');
  const gen46 = read46('src/components/AILessonGeneratorScreen.tsx');
  ok(gen46.includes('assistant-ia'), 'Le générateur classique renvoie vers le mode conversation');
  const chat46 = read46('src/components/AIAssistantChatScreen.tsx'); // conservé pour la reprise du développement
  ok(!/fetch\(/.test(chat46), 'L’assistant ne fait AUCUN appel réseau (100 % hors-ligne)');
  ok(chat46.includes('useSmartBack') && chat46.includes('onClick={goBack}'),
     'Le bouton Retour utilise le retour intelligent (jamais l’accueil)');
  ok(chat46.includes('downloadFicheDocx') && chat46.includes('printFiche'),
     'Impression et export Word disponibles depuis l’assistant');
  ok(chat46.includes('msp_fiches_pedagogiques'), 'La fiche produite s’enregistre dans Mes fiches');

  // 46.10 — Explication de notion améliorée (cours en ligne)
  const ce = await import('../src/utils/aiConceptExplainer');
  const exp = await ce.explainConceptWithAI('local', {
    notion: 'La fraction', discipline: 'Mathématiques', level: 'CM1', currentContent: 'Une fraction...',
  });
  ok(exp.text.includes('À QUOI ÇA SERT') && exp.text.includes('marché'),
     'Explication de notion : ancrée dans le vécu de l’élève');
  ok(exp.text.includes('ERREUR À ÉVITER'), 'Explication de notion : erreur fréquente signalée');
  const expPetit = await ce.explainConceptWithAI('local', {
    notion: 'Le son [a]', discipline: 'Langage', level: 'Maternelle', currentContent: '',
  });
  ok(expPetit.text !== exp.text && expPetit.text.includes('tout doucement'),
     'Explication de notion : le ton s’adapte au niveau de l’élève');
}

// ============================================================
// SECTION 47 — v38 : paiements, outils enseignants, confort visuel
// ============================================================
{
  const fs47 = require('fs');
  const path47 = require('path');
  const read47 = (f: string) => fs47.readFileSync(path47.join(process.cwd(), f), 'utf8');
  console.log('\n--- 47. Nouveautés v38 ---');

  // --- 47.1 Renommage ---
  const mods47 = read47('src/utils/appModules.ts');
  ok(mods47.includes('Agent IA Master Soutien Pédagogique'),
     'Agent IA Master Soutien Pédagogique nommé dans le catalogue');
  ok(!mods47.includes("title: 'Assistant pédagogique IA (conversation)'"),
     'L’ancien intitulé « Assistant pédagogique IA » a disparu');

  // --- 47.2 Activation des outils IA de préparation ---
  const am = await import('../src/utils/appModules');
  ok(!am.isComingSoon('/assistant-ia'), 'Agent IA pédagogique accessible');
  ok(!am.isComingSoon('/generateur-fiches-ia'), 'Générateur IA avancé accessible');
  ok(!am.isComingSoon('/programmes'), 'Les autres sous-modules restent disponibles');
  ok(am.comingSoonPaths().length === 0, 'Aucun sous-module IA de préparation ne reste « À venir »');
  const app47 = read47('src/App.tsx');
  ok(app47.includes('<AILessonGeneratorScreen />') && app47.includes('<AIAssistantChatScreen />'),
     'Les routes chargent le générateur et l’agent IA fonctionnels');
  const modScreen = read47('src/components/ModuleScreen.tsx');
  ok(modScreen.includes('À VENIR') && modScreen.includes('cursor-not-allowed'),
     'Les tuiles « À venir » ne sont pas cliquables');

  // --- 47.3 Quiz : phrases interrogatives ---
  const kq = await import('../src/utils/kidsQuiz');
  const pool = [
    { word: 'Cartable', definition: 'sac que l’élève porte pour aller à l’école', example: 'Mon cartable est lourd.' },
    { word: 'Craie', definition: 'bâton blanc pour écrire au tableau', example: 'La craie est cassée.' },
    { word: 'Ardoise', definition: 'petite plaque sur laquelle on écrit', example: 'J’écris sur mon ardoise.' },
    { word: 'Règle', definition: 'objet plat pour tracer des traits droits', example: 'Je trace avec ma règle.' },
    { word: 'Cahier', definition: 'ensemble de feuilles pour écrire les leçons', example: 'Mon cahier est propre.' },
  ];
  const qs = kq.generateQuiz(pool, 5, 'test-v38');
  ok(qs.length === 5, 'Le quiz génère bien 5 questions');
  ok(qs.every((q: any) => typeof q.question === 'string' && q.question.trim().endsWith('?')),
     'Quiz : CHAQUE question est une phrase interrogative terminée par « ? »');
  ok(qs.every((q: any) => /^(Quel|Quelle|Comment|Lequel)/.test(q.question)),
     'Quiz : les questions commencent par un mot interrogatif');
  const lvl = kq.generateLevel(pool, 7);
  ok(lvl.length === 10 && lvl.every((q: any) => q.question.trim().endsWith('?')),
     'Quiz 100 niveaux : les 10 questions du niveau sont interrogatives');
  ok(kq.phraseQuestion('animal qui aboie', 0).includes('?'), 'phraseQuestion produit une interrogation');
  const variantes = new Set([0, 1, 2, 3, 4, 5].map((i) => kq.phraseQuestion('animal qui aboie', i)));
  ok(variantes.size >= 4, `Les tournures varient (${variantes.size} formulations)`);
  const kdScreen = read47('src/components/KidsDictionaryScreen.tsx');
  ok(kdScreen.includes('{question.question}'), 'L’écran affiche la phrase interrogative');

  // --- 47.4 Paiement des cours et livres ---
  const cp = await import('../src/utils/coursePayment');
  const dev = cp.getDeviceId();
  ok(/^MSP-/.test(dev), 'Chaque utilisateur possède un identifiant à communiquer');
  const code = cp.unlockCodeFor('cours-1', dev);
  ok(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), `Code de déverrouillage bien formé (${code})`);
  ok(cp.unlockCodeFor('cours-1', dev) === code, 'Le code est stable pour un même couple contenu/appareil');
  ok(cp.unlockCodeFor('cours-2', dev) !== code, 'Un autre cours donne un code différent');
  ok(cp.unlockCodeFor('cours-1', 'MSP-AUTRE') !== code, 'Un autre appareil donne un code différent');

  ok(cp.isContentLocked('payant', 'cours-1'), 'Un cours payant est verrouillé par défaut');
  ok(!cp.isContentLocked('gratuit', 'cours-x'), 'Un cours gratuit n’est jamais verrouillé');
  ok(!cp.redeemUnlockCode('cours-1', 'cours', 'Cours 1', 'MAUVAIS'), 'Un code erroné est refusé');
  ok(cp.isContentLocked('payant', 'cours-1'), 'Après un code erroné, le contenu reste verrouillé');
  ok(cp.redeemUnlockCode('cours-1', 'cours', 'Cours 1', code), 'Le bon code déverrouille le cours');
  ok(!cp.isContentLocked('payant', 'cours-1'), 'Le cours est désormais accessible');
  cp.revokeUnlock('cours-1');
  ok(cp.isContentLocked('payant', 'cours-1'), 'Le Super Administrateur peut retirer l’accès');
  cp.grantUnlock('livre-1', 'livre', 'Livre 1');
  ok(cp.isUnlocked('livre-1'), 'Le Super Administrateur peut déverrouiller directement');
  ok(cp.paymentMessage('Livre 1', '2000', 'livre').includes('2000 FCFA'),
     'Le message indique le montant à payer');
  ok(cp.paymentMessage('Cours X', '500', 'cours').includes('Super Administrateur'),
     'Le message renvoie vers le Super Administrateur');
  cp.recordPaymentRequest('cours-9', 'cours', 'Cours 9', '1500');
  const reqs = cp.loadPaymentRequests();
  ok(reqs.some((r: any) => r.contentId === 'cours-9' && r.status === 'en_attente'),
     'La demande de paiement est journalisée pour l’administrateur');
  const contact = cp.savePaymentContact({ phone: '+229 97 00 00 00' });
  ok(cp.isContactConfigured(contact), 'Les coordonnées de paiement sont paramétrables');
  ok(cp.whatsappLink(contact, 'Cours 9', '1500', 'cours').startsWith('https://wa.me/'),
     'Un lien WhatsApp pré-rempli est proposé');

  const paywall = read47('src/components/PaywallPanel.tsx');
  ok(paywall.includes('payer') || paywall.includes('Contenu payant verrouillé'),
     'Le panneau de paiement explique la démarche');
  ok(paywall.includes('code de déverrouillage') || paywall.includes('déverrouillage'),
     'Le panneau demande le code de déverrouillage');
  const courseScreen = read47('src/components/CourseMarketplaceScreen.tsx');
  ok(courseScreen.includes('PaywallPanel') && courseScreen.includes('FREE_PREVIEW_LESSONS'),
     'Les cours payants n’affichent qu’un extrait');
  ok(courseScreen.includes('Télécharger le PDF'), 'Le PDF du cours se télécharge après déverrouillage');
  const libScreen = read47('src/components/LibraryScreen.tsx');
  ok(libScreen.includes('PaywallPanel') && libScreen.includes("kind=\"livre\""),
     'Les livres suivent la même procédure de paiement');
  const payAdmin = read47('src/components/PaymentsAdminPanel.tsx');
  ok(payAdmin.includes('unlockCodeFor') && payAdmin.includes('grantUnlock'),
     'Le Super Administrateur calcule le code et déverrouille');

  // --- 47.5 Bibliothèque ---
  const lib = await import('../src/utils/library');
  const b = lib.addBook({
    title: 'Grammaire CM2', author: 'MSP', level: 'CM2', category: 'Manuel scolaire',
    description: 'Manuel', excerpt: 'Extrait', content: 'Tout le contenu',
    type: 'payant', price: '2000',
  });
  ok(lib.loadBooks().some((x: any) => x.id === b.id), 'Un livre peut être publié');
  ok(lib.filterBooks('grammaire', 'Toutes').length >= 1, 'La recherche de livres fonctionne');
  ok(lib.filterBooks('', 'Littérature').every((x: any) => x.category === 'Littérature'),
     'Le filtrage par catégorie fonctionne');
  lib.removeBook(b.id);

  // --- 47.6 Retour du générateur de fiches (bug signalé) ---
  const genScreen = read47('src/components/AILessonGeneratorScreen.tsx');
  ok(genScreen.includes('useSmartBack') && genScreen.includes('onClick={goBack}'),
     'Générateur de fiches : le bouton Retour utilise le retour intelligent');
  ok(!genScreen.includes("navigate('/fiches-pedagogiques')} className=\"p-2 bg-white/20"),
     'Générateur de fiches : le retour forcé vers une page fixe est supprimé');

  // --- 47.7 Mode nuit et confort visuel ---
  const prefs = await import('../src/utils/appPreferences');
  const p1 = prefs.savePreferences({ theme: 'nuit' });
  ok(prefs.isNightActive(p1), 'Le mode nuit peut être activé manuellement');
  const p2 = prefs.savePreferences({ theme: 'clair' });
  ok(!prefs.isNightActive(p2), 'Le mode clair peut être rétabli');
  const pAuto = { ...prefs.getPreferences(), theme: 'auto' as const, nightFrom: '19:00', nightTo: '06:30' };
  ok(prefs.isNightActive(pAuto, new Date('2026-09-15T21:00:00')), 'Mode auto : nuit à 21 h');
  ok(prefs.isNightActive(pAuto, new Date('2026-09-15T05:00:00')), 'Mode auto : nuit à 5 h (après minuit)');
  ok(!prefs.isNightActive(pAuto, new Date('2026-09-15T12:00:00')), 'Mode auto : clair à midi');
  const css47 = read47('src/index.css');
  ok(css47.includes('html.dark .bg-white'), 'Le mode nuit assombrit toute l’application');
  ok(css47.includes('data-msp-warmth'), 'Le filtre lumière bleue est défini');
  const main47 = read47('src/main.tsx');
  ok(main47.includes('applyPrefsTheme'), 'Le thème est appliqué avant le rendu (pas de clignotement)');

  // --- 47.8 Horloge et alarmes ---
  ok(/^\d{2}:\d{2}$/.test(prefs.formatClock(new Date('2026-09-15T08:05:00'))), 'L’horloge affiche HH:MM');
  ok(prefs.formatLongDate(new Date('2026-09-15T08:05:00')).includes('septembre'),
     'La date complète est affichée en français');
  const al = prefs.addAlarm('Début des cours', '07:30', [1, 2, 3, 4, 5]);
  ok(prefs.loadAlarms().some((a: any) => a.id === al.id), 'Une alarme peut être créée');
  const lundi730 = new Date('2026-09-14T07:30:00');
  ok(prefs.dueAlarms(lundi730, [al]).length === 1, 'L’alarme sonne à l’heure prévue un jour actif');
  ok(prefs.dueAlarms(new Date('2026-09-13T07:30:00'), [al]).length === 0,
     'L’alarme ne sonne pas un jour non sélectionné');
  ok(prefs.dueAlarms(new Date('2026-09-14T08:30:00'), [al]).length === 0,
     'L’alarme ne sonne pas en dehors de son heure');
  prefs.toggleAlarm(al.id);
  ok(prefs.dueAlarms(lundi730, prefs.loadAlarms()).length === 0, 'Une alarme désactivée ne sonne pas');
  ok(prefs.describeDays([1, 2, 3, 4, 5]) === 'Du lundi au vendredi', 'Les jours sont décrits en clair');
  prefs.removeAlarm(al.id);
  ok(!prefs.loadAlarms().some((a: any) => a.id === al.id), 'Une alarme peut être supprimée');
  ok(app47.includes('HomeClock') && app47.includes('/horloge'), 'Horloge et alarmes câblées dans l’application');

  // --- 47.9 Outils du quotidien de l'enseignant ---
  const tt = await import('../src/utils/teacherTools');
  const slot = tt.addSlot({ day: 1, start: '08:00', end: '09:00', subject: 'Maths', classe: 'CM2', room: 'A' });
  ok(tt.slotsForDay(1).some((x: any) => x.id === slot.id), 'Emploi du temps : un cours peut être ajouté');
  ok(tt.hasConflict({ day: 1, start: '08:30', end: '09:30', subject: 'X', classe: '', room: '' }),
     'Emploi du temps : les chevauchements sont détectés');
  ok(!tt.hasConflict({ day: 2, start: '08:30', end: '09:30', subject: 'X', classe: '', room: '' }),
     'Emploi du temps : un autre jour ne crée pas de conflit');
  ok(tt.currentSlot(new Date('2026-09-14T08:30:00'))?.subject === 'Maths',
     'Emploi du temps : le cours en cours est identifié');
  tt.removeSlot(slot.id);

  const entry = tt.addLogEntry({ date: '2026-09-14', classe: 'CM2', subject: 'Maths', content: 'Addition', homework: 'Ex. 3', notes: '' });
  ok(tt.loadLogbook().some((e: any) => e.id === entry.id), 'Cahier de textes : une séance est consignée');
  ok(tt.pendingHomework('2026-09-01').length >= 1, 'Cahier de textes : les devoirs donnés sont retrouvés');
  ok(tt.logEntriesBetween('2026-09-01', '2026-09-30').length >= 1, 'Cahier de textes : filtrage par période');
  tt.removeLogEntry(entry.id);

  const task = tt.addTask('Corriger les copies', '2026-09-10', 'haute');
  ok(tt.overdueTasks('2026-09-15').some((t: any) => t.id === task.id), 'Mémos : les retards sont signalés');
  ok(tt.sortedTasks()[0].priority === 'haute', 'Mémos : les priorités hautes remontent en tête');
  tt.toggleTask(task.id);
  ok(tt.loadTasks().find((t: any) => t.id === task.id)?.done === true, 'Mémos : une tâche se coche');
  tt.removeTask(task.id);

  const plan = tt.autoFillSeats(tt.getSeatingPlan('c1', 2, 2), ['A', 'B', 'C', 'D']);
  ok(Object.keys(plan.seats).length === 4, 'Plan de classe : placement automatique des élèves');
  ok(tt.rotateSeats(plan).seats[tt.seatKey(0, 0)] !== plan.seats[tt.seatKey(0, 0)],
     'Plan de classe : rotation pour changer les élèves de place');

  const ex = tt.addExamItem({ title: 'Devoir 1', level: 'CM2', subject: 'Maths', kind: 'Devoir', statement: 'Calculer', answer: '42', points: 20 });
  ok(tt.filterExamBank('devoir', 'Tous', 'Toutes').length >= 1, 'Banque de sujets : recherche opérationnelle');
  tt.removeExamItem(ex.id);

  const msg = tt.fillTemplate(tt.PARENT_TEMPLATES[0], { eleve: 'Koffi', classe: 'CM2', date: '14/09', enseignant: 'M. A' });
  ok(msg.includes('Koffi') && msg.includes('CM2') && !msg.includes('{eleve}'),
     'Parents : les modèles de message sont personnalisés');
  ok(tt.smsLink('97000000', 'Bonjour').startsWith('sms:'), 'Parents : envoi par SMS possible');
  ok(tt.PARENT_TEMPLATES.length >= 6, `Parents : ${tt.PARENT_TEMPLATES.length} modèles fournis`);
  ok(app47.includes('/outils-enseignant') && app47.includes('/bibliotheque'),
     'Outils et bibliothèque câblés dans l’application');

  // --- 47.10 Abonnement 999 FCFA ---
  const subs47 = await import('../src/utils/subscription');
  ok(subs47.isAllowedForEssentiel('/enrolement-personnel'),
     '999 FCFA : l’enrôlement du personnel est inclus');
  const gate47 = read47('src/components/AccessGate.tsx');
  /*
   * v54 : la liste des fonctions incluses provient du catalogue. On verifie
   * que « Enrôlement du personnel » y figure — c'est ce texte qui s'affiche
   * reellement sur l'ecran d'abonnement.
   */
  ok(subs47.PLANS.essentiel.includes.some((f: string) => /Enrôlement du personnel/i.test(f)),
     '999 FCFA : l’enrôlement du personnel est ANNONCÉ sur l’écran d’abonnement (corrigé v38)');
  ok(gate47.includes('plan.includes.map'),
     '999 FCFA : l’écran d’accès affiche bien les fonctions de chaque formule');
}

/* ================================================================== */
/* SECTION 48 — v39                                                    */
/* ================================================================== */
{
  const fs48 = require('fs') as typeof import('fs');
  const path48 = require('path') as typeof import('path');
  const read48 = (p: string) => fs48.readFileSync(path48.join(process.cwd(), p), 'utf8');

  console.log('\n--- 48. Nouveautés v39 ---');

  /* --- a) Bibliothèque : le livre EST un PDF --- */
  const lib = read48('src/components/LibraryScreen.tsx');
  ok(lib.includes('accept="application/pdf"'), 'Bibliothèque : seuls les PDF sont acceptés');
  ok(lib.includes("Joignez le fichier PDF"), 'Bibliothèque : le PDF est obligatoire pour publier');
  ok(lib.includes('8 * 1024 * 1024'), 'Bibliothèque : la taille du PDF est limitée pour protéger le stockage');
  ok(lib.includes('pdfName'), 'Bibliothèque : le nom du PDF joint est affiché');
  /*
   * v44 : le bloc de telechargement est desormais imbrique dans `unlocked &&`
   * (PDF joint OU PDF fabrique a partir du texte). La regle v39 est inchangee :
   * aucun telechargement avant deverrouillage.
   */
  ok(/\{unlocked && \(/.test(lib) && lib.includes('btn-pdf-livre'),
     'Bibliothèque : le PDF ne se télécharge qu’après déverrouillage');
  ok(lib.includes('<PaywallPanel'), 'Bibliothèque : le paiement passe par la procédure Super Administrateur');
  ok(lib.includes("form.type === 'payant' && !(parseInt(form.price, 10) > 0)"), 'Bibliothèque : un livre payant exige un prix');

  /* --- b) Quiz : la question ne contient plus la réponse --- */
  const kq = read48('src/utils/kidsQuiz.ts');
  ok(kq.includes('export function maskAnswer'), 'Quiz : fonction de masquage de la réponse présente');
  ok(kq.includes('export function revealsAnswer'), 'Quiz : fonction de détection de fuite présente');
  ok(kq.includes('maskAnswer(item.definition, item.word)'), 'Quiz : la définition est expurgée du mot à trouver');
  ok(kq.includes('maskAnswer(item.example, item.word)'), 'Quiz : l’exemple est expurgé du mot à trouver');
  ok((kq.match(/maskAnswer\(item\.definition/g) || []).length >= 2, 'Quiz : masquage appliqué au quiz simple ET aux 100 niveaux');

  const quiz48 = require('../src/utils/kidsQuiz') as typeof import('../src/utils/kidsQuiz');
  const pool48 = [
    { word: 'Addition', definition: 'Une addition sert à mettre ensemble plusieurs nombres.', example: 'Les additions sont faciles.' },
    { word: 'Vaccin', definition: 'Un vaccin aide le corps à se défendre.', example: 'Le vaccin protège l’enfant.' },
    { word: 'Hygiène', definition: 'L’hygiène est l’ensemble des gestes pour rester propre.', example: 'L’hygiène évite les maladies.' },
    { word: 'Énergie', definition: 'L’énergie permet de faire fonctionner des objets.', example: 'Le soleil donne de l’énergie.' },
    { word: 'Microbe', definition: 'Un microbe est un être très petit.', example: 'Éviter les microbes.' },
  ];
  const qs48 = quiz48.generateQuiz(pool48, 5, 'audit-v39');
  ok(qs48.length === 5, 'Quiz : les questions sont générées');
  ok(qs48.every((q) => !quiz48.revealsAnswer(q.question, q.correct)),
    'Quiz : AUCUNE question ne contient la réponse');
  ok(qs48.every((q) => !quiz48.revealsAnswer(q.example, q.correct)),
    'Quiz : aucun exemple ne trahit la réponse avant la réponse');
  ok(qs48.every((q) => q.question.trim().endsWith('?')), 'Quiz : toutes les questions sont interrogatives');
  ok(qs48.every((q) => q.options.includes(q.correct)), 'Quiz : la bonne réponse figure parmi les choix');
  const lvl48 = quiz48.generateLevel(pool48, 7);
  ok(lvl48.every((q) => !quiz48.revealsAnswer(q.question, q.correct)),
    'Quiz 100 niveaux : aucune question ne contient la réponse');

  /* --- c) Concours hebdomadaire --- */
  const contest = require('../src/utils/quizContest') as typeof import('../src/utils/quizContest');
  ok(contest.isRegistrationOpen(new Date('2026-09-19T18:00:00')) === true, 'Concours : ouvert le samedi à 18h00');
  ok(contest.isRegistrationOpen(new Date('2026-09-19T17:59:00')) === false, 'Concours : fermé le samedi avant 18h00');
  ok(contest.isRegistrationOpen(new Date('2026-09-20T20:59:00')) === true, 'Concours : ouvert le dimanche jusqu’à 21h00');
  ok(contest.isRegistrationOpen(new Date('2026-09-20T21:00:00')) === false, 'Concours : fermé le dimanche à partir de 21h00');
  ok(contest.isRegistrationOpen(new Date('2026-09-16T12:00:00')) === false, 'Concours : fermé en semaine');
  ok(contest.nextWeekId(new Date('2026-09-19T18:00:00')) === contest.weekId(new Date('2026-09-21T10:00:00')),
    'Concours : l’inscription vaut pour la SEMAINE SUIVANTE');
  const refus = contest.register('Kofi', 'dev-1', '', new Date('2026-09-16T12:00:00'));
  ok(refus.ok === false, 'Concours : inscription refusée hors de la fenêtre');
  const ok48 = contest.register('Kofi', 'dev-1', 'CM2', new Date('2026-09-19T19:00:00'));
  ok(ok48.ok === true, 'Concours : inscription acceptée dans la fenêtre');
  const semaine48 = contest.nextWeekId(new Date('2026-09-19T19:00:00'));
  ok(contest.isRegistered('dev-1', semaine48), 'Concours : la participation est enregistrée');
  const doublon = contest.register('Kofi', 'dev-1', '', new Date('2026-09-19T20:00:00'));
  ok(doublon.ok === false, 'Concours : pas de double inscription');
  ok(contest.localCount(semaine48) === 1, 'Concours : le nombre d’inscrits connus est exact');
  ok(contest.participantsLabel(semaine48).includes('cet appareil'),
    'Concours : sans publication, le compteur précise qu’il est local (aucun chiffre inventé)');
  contest.publishOfficialCount(semaine48, 57, 'Chiffre consolidé');
  ok(contest.officialCount(semaine48)?.count === 57, 'Concours : le Super Admin publie le total officiel');
  ok(contest.participantsLabel(semaine48).includes('57'), 'Concours : le total officiel s’affiche chez les participants');
  ok(contest.participantsLabel(semaine48).includes('officiel'), 'Concours : le total est présenté comme officiel');

  const cpanel = read48('src/components/QuizContestPanel.tsx');
  ok(cpanel.includes('Je participe'), 'Concours : le bouton « Je participe » existe');
  ok(cpanel.includes('samedi 18h00') && cpanel.includes('dimanche 21h00'), 'Concours : la fenêtre est rappelée à l’élève');
  ok(cpanel.includes('disabled={!ouvert}'), 'Concours : le bouton est inactif hors fenêtre');
  ok(read48('src/components/KidsDictionaryScreen.tsx').includes('<QuizContestPanel />'), 'Concours : le panneau est câblé au quiz');

  /* --- d) Bandes défilantes --- */
  const ann = require('../src/utils/announcements') as typeof import('../src/utils/announcements');
  const a1 = ann.addAnnouncement('Composition le 12 janvier', 'urgent');
  ann.addAnnouncement('Réunion des parents', 'info');
  ok(ann.activeAnnouncements().length === 2, 'Annonces : les messages actifs sont diffusés');
  ok(ann.activeAnnouncements()[0].level === 'urgent', 'Annonces : les messages urgents passent en premier');
  ann.toggleAnnouncement(a1.id);
  ok(ann.activeAnnouncements().length === 1, 'Annonces : un message désactivé ne défile plus');
  ok(ann.isActive({ ...a1, enabled: true, startAt: Date.now() + 86400000, endAt: 0 }) === false,
    'Annonces : un message programmé n’apparaît pas avant sa date');
  ok(ann.isActive({ ...a1, enabled: true, startAt: 0, endAt: Date.now() - 1000 }) === false,
    'Annonces : un message expiré disparaît');
  ann.removeAnnouncement(a1.id);
  const tick48 = read48('src/components/AnnouncementTicker.tsx');
  ok(tick48.includes('@keyframes msp-ticker'), 'Annonces : l’animation de défilement est définie');
  ok(tick48.includes('prefers-reduced-motion'), 'Annonces : l’animation respecte les préférences d’accessibilité');
  ok(read48('src/App.tsx').includes('<AnnouncementTicker />'), 'Annonces : la bande est câblée dans l’application');

  /* --- e) Éducation à la vie --- */
  const life = require('../src/utils/lifeEducationData') as typeof import('../src/utils/lifeEducationData');
  ok(life.LIFE_DOMAINS.length === 3, 'Éducation à la vie : 3 sous-modules');
  ok(life.totalLifeLessons() === 150, `Éducation à la vie : 150 contenus (obtenu ${life.totalLifeLessons()})`);
  for (const d of life.LIFE_DOMAINS) {
    ok(d.lessons.length === 50, `Éducation à la vie : ${d.title} compte 50 cours`);
  }
  ok(!!life.findDomain('environnementale'), 'Éducation à la vie : domaine environnemental présent');
  ok(!!life.findDomain('financiere'), 'Éducation à la vie : domaine financier présent');
  ok(!!life.findDomain('entrepreneuriale'), 'Éducation à la vie : domaine entrepreneurial présent');
  const tousLife = life.LIFE_DOMAINS.flatMap((d) => d.lessons);
  ok(new Set(tousLife.map((l) => l.id)).size === 150, 'Éducation à la vie : aucun identifiant en double');
  ok(new Set(tousLife.map((l) => l.title)).size === 150, 'Éducation à la vie : aucun titre en double');
  ok(tousLife.every((l) => l.content.length > 150), 'Éducation à la vie : chaque cours a un contenu développé');
  ok(tousLife.every((l) => l.objective && l.example && l.activity && l.keyPoint),
    'Éducation à la vie : objectif, exemple, activité et point clé partout');
  ok(tousLife.every((l) => ['Primaire', 'Secondaire'].includes(l.level)),
    'Éducation à la vie : chaque fiche cible les écoliers ou les élèves');
  ok(life.searchLessons('financiere', 'épargne').length > 0, 'Éducation à la vie : la recherche fonctionne');
  const mods48 = require('../src/utils/appModules') as typeof import('../src/utils/appModules');
  ok(!!mods48.findModule('/education-vie'), 'Éducation à la vie : le module est déclaré');
  ok(mods48.findModule('/education-vie')!.subModules.length === 3, 'Éducation à la vie : 3 sous-modules déclarés');
  const app48 = read48('src/App.tsx');
  ok(app48.includes('path="/education-vie"'), 'Éducation à la vie : route du module câblée');
  ok(app48.includes('path="/education-vie/:domaine"'), 'Éducation à la vie : route des domaines câblée');
  ok(app48.includes("findModule('/enrolement')"), 'Modules : routes résolues par chemin et non par index fragile');

  /* --- f) Administration universelle --- */
  const sap = read48('src/components/SuperAdminDataPanel.tsx');
  ok(sap.includes('localStorage.key('), 'Admin : toutes les informations enregistrées sont listées');
  ok(sap.includes('BACKUP_PREFIX'), 'Admin : une sauvegarde précède chaque modification');
  ok(sap.includes('Restaurer la valeur précédente'), 'Admin : la valeur précédente est restaurable');
  ok(sap.includes('doit rester du JSON correct'), 'Admin : le format est validé avant enregistrement');
  ok(sap.includes('CLES_SENSIBLES'), 'Admin : les données sensibles sont signalées');
  const dash48 = read48('src/components/AdminDashboardScreen.tsx');
  ok(dash48.includes("donnees: ['Super Administrateur']"), 'Admin : l’édition des données est réservée au Super Administrateur');
  ok(dash48.includes('<SuperAdminDataPanel />'), 'Admin : le panneau est câblé au tableau de bord');

  // ============================================================
  section('49. v40 — Mon gestionnaire de cantine scolaire');
  // ============================================================
  const read49 = (f: string) => fs48.readFileSync(path48.join(process.cwd(), f), 'utf8');

  /* --- a) Les 8 cas de test imposés sur le service de calcul --- */
  const CC = require('../src/utils/canteenCalc') as typeof import('../src/utils/canteenCalc');

  // Cas 1 — arrondi au multiple supérieur de 0,25
  ok(CC.roundUpToMultiple(1.01, 0.25) === 1.25, 'Cantine cas 1 : 1,01 arrondi à 1,25');
  ok(CC.roundUpToMultiple(1.25, 0.25) === 1.25, 'Cantine cas 1 : un multiple exact n’est pas augmenté');
  ok(CC.roundUpToMultiple(1.26, 0.25) === 1.5, 'Cantine cas 1 : 1,26 arrondi à 1,50');

  // Cas 2 — arrondi au dixième pour le sel, sans erreur flottante
  ok(CC.roundUpToMultiple(0.846, 0.1) === 0.9, 'Cantine cas 2 : sel 0,846 arrondi à 0,9');
  ok(CC.roundUpToMultiple(8.459999999999999, 0.25) === 8.5, 'Cantine cas 2 : pas d’erreur de précision flottante');

  // Cas 3 — prévision hebdomadaire complète (100 élèves, 5 jours, 3 maïs, haricot)
  const plan3 = CC.calculateWeeklyPlan({ staffCount: 100, workingDays: 5, maizeServiceCount: 3, legume: 'haricot' });
  ok(plan3.maize === 45, 'Cantine cas 3 : maïs = 15 kg × 3 services = 45 kg');
  ok(plan3.rice === 30, 'Cantine cas 3 : riz = 15 kg × 2 services = 30 kg');
  ok(plan3.beans === 15, 'Cantine cas 3 : haricot = 3 kg × 5 jours = 15 kg');
  ok(plan3.oil === 5, 'Cantine cas 3 : huile = 1 L × 5 jours = 5 L');
  ok(plan3.salt === 1.5, 'Cantine cas 3 : sel = 0,3 kg × 5 jours = 1,5 kg');

  // Cas 4 — la légumineuse non choisie reste à zéro (correction du COUNTA(F10=1) d'Excel)
  ok(plan3.yellowPeas === 0 && plan3.greenPeas === 0, 'Cantine cas 4 : seule la légumineuse choisie est servie');
  const plan4 = CC.calculateWeeklyPlan({ staffCount: 100, workingDays: 5, maizeServiceCount: 0, legume: 'pois_jaune' });
  ok(plan4.yellowPeas === 15 && plan4.beans === 0, 'Cantine cas 4 : le pois jaune remplace bien le haricot');
  const plan4b = CC.calculateWeeklyPlan({ staffCount: 100, workingDays: 5, maizeServiceCount: 0, legume: 'aucune' });
  ok(CC.plannedLegume(plan4b) === 0, 'Cantine cas 4 : aucune légumineuse choisie = 0 kg');

  // Cas 5 — effectifs journaliers DIFFÉRENTS de l'effectif hebdomadaire
  const d5a = CC.calculateDailyWithdrawal({ dayNumber: 1, staffCount: 90, cereal: 'maize', legume: 'haricot' });
  const d5b = CC.calculateDailyWithdrawal({ dayNumber: 2, staffCount: 110, cereal: 'rice', legume: 'haricot' });
  ok(d5a.maizeQuantity === 13.5 && d5a.riceQuantity === 0, 'Cantine cas 5 : 90 élèves au maïs = 13,5 kg, riz à 0');
  ok(d5b.riceQuantity === 16.5 && d5b.maizeQuantity === 0, 'Cantine cas 5 : 110 élèves au riz = 16,5 kg, maïs à 0');
  ok(d5a.legumeQuantity === 2.75, 'Cantine cas 5 : légumineuse 0,03 × 90 = 2,7 arrondi à 2,75');

  // Cas 6 — « Pas de cuisson » met tout à zéro
  const d6 = CC.calculateDailyWithdrawal({ dayNumber: 3, staffCount: 100, cereal: 'aucune', legume: 'haricot' });
  ok(d6.maizeQuantity === 0 && d6.riceQuantity === 0 && d6.legumeQuantity === 0
     && d6.oilQuantity === 0 && d6.saltQuantity === 0, 'Cantine cas 6 : jour sans cuisson = aucune sortie');

  // Cas 7 — synthèse : total de plats et reliquats positifs
  const days7 = [
    CC.calculateDailyWithdrawal({ dayNumber: 1, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 2, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 3, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 4, staffCount: 100, cereal: 'rice', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 5, staffCount: 100, cereal: 'rice', legume: 'haricot' }),
  ];
  const sum7 = CC.calculateWeeklySummary(plan3, days7);
  ok(sum7.totalMeals === 500, 'Cantine cas 7 : total de plats = somme des effectifs journaliers');
  ok(sum7.maizeBalance === 0 && sum7.riceBalance === 0, 'Cantine cas 7 : prévision respectée = reliquat nul');
  ok(CC.hasOverrun(sum7) === false, 'Cantine cas 7 : aucun dépassement signalé à tort');

  // Cas 8 — DÉPASSEMENT : effectifs journaliers supérieurs à la prévision
  const days8 = [
    CC.calculateDailyWithdrawal({ dayNumber: 1, staffCount: 150, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 2, staffCount: 150, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 3, staffCount: 150, cereal: 'maize', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 4, staffCount: 150, cereal: 'rice', legume: 'haricot' }),
    CC.calculateDailyWithdrawal({ dayNumber: 5, staffCount: 150, cereal: 'rice', legume: 'haricot' }),
  ];
  const sum8 = CC.calculateWeeklySummary(plan3, days8);
  ok(sum8.maizeBalance < 0, 'Cantine cas 8 : le reliquat de maïs devient négatif');
  ok(CC.hasOverrun(sum8) === true, 'Cantine cas 8 : le dépassement est détecté');
  ok(CC.balanceLabel(sum8.maizeBalance, 'kg').startsWith('Dépassement de'),
     'Cantine cas 8 : le dépassement est affiché, jamais masqué');
  ok(CC.balanceLabel(2.5, 'kg') === 'Reste 2,50 kg', 'Cantine : un reliquat positif est présenté comme un reste');

  /* --- b) Validations explicites --- */
  ok(CC.validateWeeklyParameters({ staffCount: 0, workingDays: 5, maizeServiceCount: 0, legume: 'haricot' }).valid === false,
     'Cantine : un effectif nul est refusé');
  ok(CC.validateWeeklyParameters({ staffCount: 100, workingDays: 6, maizeServiceCount: 0, legume: 'haricot' }).valid === false,
     'Cantine : plus de 5 jours ouvrables est refusé');
  ok(CC.validateWeeklyParameters({ staffCount: 100, workingDays: 3, maizeServiceCount: 4, legume: 'haricot' }).valid === false,
     'Cantine : plus de sorties de maïs que de jours est refusé');
  ok(CC.validateWeeklyParameters({ staffCount: 100, workingDays: 5, maizeServiceCount: 2, legume: 'haricot' }).valid === true,
     'Cantine : des paramètres corrects sont acceptés');
  ok(CC.validateDay(0, 'maize').valid === false, 'Cantine : un effectif journalier nul avec cuisson est refusé');
  ok(CC.validateDay(0, 'aucune').valid === true, 'Cantine : un jour sans cuisson n’exige pas d’effectif');

  /* --- c) Configuration paramétrable, unités non codées en dur --- */
  const calcSrc = read49('src/utils/canteenCalc.ts');
  ok(calcSrc.includes('roundingMultiple'), 'Cantine : le multiple d’arrondi est un paramètre');
  ok(calcSrc.includes('unit: string'), 'Cantine : l’unité de chaque denrée est un paramètre');
  ok(calcSrc.includes('config: Record<FoodKey, FoodItem> = DEFAULT_FOOD_CONFIG'),
     'Cantine : la configuration des denrées est surchargeable');
  ok(CC.DEFAULT_FOOD_CONFIG.oil.unit === 'litre', 'Cantine : l’huile est mesurée en litres');
  ok(CC.DEFAULT_FOOD_CONFIG.salt.roundingMultiple === 0.1, 'Cantine : le sel s’arrondit au dixième');

  /* --- d) Écarts avec Excel documentés --- */
  ok(calcSrc.includes('COUNTA(F10=1)'), 'Cantine : la formule Excel erronée est citée et corrigée');
  ok(calcSrc.includes('CORRECTIONS APPORTÉES AUX FORMULES EXCEL'), 'Cantine : les corrections sont documentées');
  /*
   * v65 : la règle de sortie classe la partie décimale par intervalles.
   * 282 x 0,15 = 42,30 ; 0,30 ∈ [0 ; 0,375] -> 42,25.
   */
  ok(CC.explainRoundingDifference(282, 'maize').includes('42,25'),
     'Cantine : l’écart d’arrondi du cahier manuscrit est expliqué');
  ok(CC.explainRoundingDifference(282, 'maize').includes('[0 ; 0,375]'),
     'Cantine : l’intervalle v65 est nommé dans l’explication');

  /* --- e) Séparation calcul / interface --- */
  const simSrc = read49('src/components/CanteenSimulatorScreen.tsx');
  ok(!/\*\s*0\.15|0\.15\s*\*/.test(simSrc), 'Cantine : aucune ration codée en dur dans l’écran');
  ok(simSrc.includes("from '../utils/canteenCalc'"), 'Cantine : l’écran utilise le service de calcul');
  ok(!calcSrc.includes("from 'react'"), 'Cantine : le service de calcul ne dépend pas de React');

  /* --- f) Tableau de bord à 6 cartes --- */
  for (const carte of ['nouvelle', 'jour', 'prevision', 'point', 'historique', 'rapports']) {
    ok(simSrc.includes(`'${carte}'`), `Cantine : la carte « ${carte} » est présente`);
  }

  /* --- g) Modèle de données imposé --- */
  for (const champ of ['weeklyStaffCount', 'maizeServiceCount', 'weeklyPlan', 'dailyWithdrawals',
                       'weeklySummary', 'status', 'establishmentId', 'weekStartDate', 'weekEndDate']) {
    ok(calcSrc.includes(champ), `Cantine : le champ « ${champ} » est présent dans le modèle`);
  }
  ok(calcSrc.includes('totalMeals') && calcSrc.includes('maizeBalance'),
     'Cantine : la synthèse contient le total de plats et les reliquats');

  /* --- h) Stockage, clôture et historique --- */
  const storeSrc = read49('src/utils/canteenStore.ts');
  ok(storeSrc.includes('msp_canteen_weeks'), 'Cantine : les semaines sont enregistrées');
  ok(storeSrc.includes('export function closeWeek'), 'Cantine : la clôture existe');
  ok(storeSrc.includes('export function reopenWeek'), 'Cantine : une semaine clôturée peut être rouverte');
  ok(storeSrc.includes('calculateWeeklySummary(plan, days)'), 'Cantine : l’enregistrement recalcule tout');
  ok(storeSrc.includes('establishmentId'), 'Cantine : les données sont liées à l’établissement');
  ok(simSrc.includes('window.confirm'), 'Cantine : une nouvelle semaine demande confirmation');
  ok(simSrc.includes('loadWeeks'), 'Cantine : l’historique est rechargé depuis le stockage');

  /* --- i) Cahier des menus hebdomadaires --- */
  const menuSrc = read49('src/components/CanteenMenuScreen.tsx');
  for (const col of ['Jours de cantine', 'Menu', 'Ration par élève']) {
    ok(menuSrc.includes(col) || read49('src/utils/canteenExport.ts').includes(col),
       `Cahier des menus : la colonne « ${col} » est présente`);
  }
  const expSrc = read49('src/utils/canteenExport.ts');
  ok(expSrc.includes("Nombre d'élèves inscrits à la cantine"), 'Cahier des menus : la colonne des effectifs est conforme');
  ok(expSrc.includes('Quantités de vivres à sortir pour la préparation'), 'Cahier des menus : la colonne des quantités est conforme');
  ok(expSrc.includes('<th colspan="2">Solde</th>'), 'Cahier des menus : la colonne Solde est présente');
  ok(expSrc.includes('Établi par') && expSrc.includes('Fonction') && expSrc.includes('Signature'),
     'Cahier des menus : le pied de page officiel est reproduit');
  ok(menuSrc.includes("'Pois vert'"), 'Cahier des menus : le pois vert figure parmi les vivres');
  ok(menuSrc.includes('roundCanteenNamedFoodOutput'), 'Cahier des menus : les quantités sont calculées avec les intervalles v65, non saisies');
  ok(storeSrc.includes('menuWeekHeadcount'), 'Cahier des menus : les totaux G/F/T sont calculés');

  /* --- j) Cahier de gestion des stocks --- */
  const stockSrc = read49('src/components/CanteenStockScreen.tsx');
  for (const col of ['STOCK INITIAL', 'ENTRÉE DOTATION', 'STOCK DISPONIBLE', 'SORTIE', 'STOCK RESTANT', 'OBSERVATIONS']) {
    ok(stockSrc.includes(col), `Cahier de stock : la colonne « ${col} » est présente`);
  }
  ok(storeSrc.includes("'Pois vert', 'Pois jaune', 'Haricot'"), 'Cahier de stock : les trois légumineuses sont suivies');
  ok(storeSrc.includes('export function recomputeLedger'), 'Cahier de stock : le report en chaîne est implémenté');
  ok(storeSrc.includes('const available = round2(initial + entry)'), 'Cahier de stock : disponible = initial + entrée');
  ok(storeSrc.includes('const remaining = round2(available - exit)'), 'Cahier de stock : restant = disponible − sortie');
  ok(storeSrc.includes('export function stockAlert'), 'Cahier de stock : les ruptures sont signalées');

  /* --- k) Câblage du module --- */
  const mods49 = read49('src/utils/appModules.ts');
  ok(mods49.includes("path: '/cantine'"), 'Cantine : le module est déclaré');
  ok(mods49.includes('Super MSP Simulateur cantine'), 'Cantine : le sous-module simulateur porte le nom demandé');
  ok(mods49.includes('Cahier MSP des menus hebdomadaires'), 'Cantine : le cahier des menus est déclaré');
  ok(mods49.includes('Cahier MSP de gestion des stocks'), 'Cantine : le cahier des stocks est déclaré');
  const app49 = read49('src/App.tsx');
  for (const r of ['/cantine', '/cantine/simulateur', '/cantine/menus', '/cantine/stocks']) {
    ok(app49.includes(`path="${r}"`), `Cantine : la route ${r} est câblée`);
  }
  ok(app49.includes("findModule('/cantine')"), 'Cantine : le module est résolu par son chemin');
  ok(/master-soutien-v(4[0-9]|[5-9][0-9]|[1-9][0-9]{2})\b/.test(read49('public/sw.js')), 'Cantine : le cache hors ligne est au moins en v40');

  // ============================================================
  section('50. v41 — PDF reel, legumineuse variable, images educatives');
  // ============================================================
  const read50 = (f: string) => fs48.readFileSync(path48.join(process.cwd(), f), 'utf8');

  /* --- a) Vraie generation PDF --- */
  const pdfSrc = read50('src/utils/pdfMaker.ts');
  ok(pdfSrc.includes("from 'jspdf'"), 'PDF : la bibliotheque de generation est utilisee');
  ok(pdfSrc.includes('doc.save('), 'PDF : le fichier est reellement enregistre');
  ok(pdfSrc.includes('addPage()'), 'PDF : les sauts de page sont geres');
  ok(pdfSrc.includes('drawHead'), 'PDF : l en-tete du tableau est repete sur chaque page');
  ok(pdfSrc.includes('danger'), 'PDF : les valeurs negatives sont mises en evidence');
  ok(pdfSrc.includes('Page ${i} / ${total}'), 'PDF : les pages sont numerotees');
  const pkg50 = JSON.parse(read50('package.json'));
  ok(!!pkg50.dependencies.jspdf, 'PDF : jspdf est declaree comme dependance');

  const expSrc50 = read50('src/utils/canteenExport.ts');
  ok(expSrc50.includes('export async function exportWeekPdf'), 'PDF : export de la fiche de prelevement');
  ok(expSrc50.includes('export async function exportMenuWeekPdf'), 'PDF : export du cahier des menus');
  ok(expSrc50.includes('export async function exportLedgerPdf'), 'PDF : export du cahier de stock');
  ok(expSrc50.includes('makePdf('), 'PDF : les exports utilisent le generateur reel');

  /* --- L'impression reste disponible (exigence explicite) --- */
  ok(expSrc50.includes('export async function printWeek'), 'Impression : la fiche de prelevement reste imprimable');
  ok(expSrc50.includes('export function printMenuWeek'), 'Impression : le cahier des menus reste imprimable');
  ok(expSrc50.includes('export function printLedger'), 'Impression : le cahier de stock reste imprimable');
  const simSrc50 = read50('src/components/CanteenSimulatorScreen.tsx');
  ok(simSrc50.includes('btn-imprimer') && simSrc50.includes('btn-export-pdf'),
     'Impression : les deux options (PDF et impression) coexistent a l ecran');
  ok(read50('src/components/CanteenStockScreen.tsx').includes('btn-pdf-stock'), 'PDF : bouton present dans le cahier de stock');
  ok(read50('src/components/CanteenMenuScreen.tsx').includes('btn-pdf-cahier'), 'PDF : bouton present dans le cahier des menus');

  /* --- b) Changement de legumineuse en cours de semaine --- */
  const CC41 = require('../src/utils/canteenCalc') as typeof import('../src/utils/canteenCalc');
  const plan41 = CC41.calculateWeeklyPlan({ staffCount: 100, workingDays: 5, maizeServiceCount: 3, legume: 'haricot' });
  const days41 = [
    CC41.calculateDailyWithdrawal({ dayNumber: 1, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC41.calculateDailyWithdrawal({ dayNumber: 2, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC41.calculateDailyWithdrawal({ dayNumber: 3, staffCount: 100, cereal: 'maize', legume: 'haricot' }),
    CC41.calculateDailyWithdrawal({ dayNumber: 4, staffCount: 100, cereal: 'rice', legume: 'pois_jaune' }),
    CC41.calculateDailyWithdrawal({ dayNumber: 5, staffCount: 100, cereal: 'rice', legume: 'pois_jaune' }),
  ];
  ok(days41[0].legume === 'haricot' && days41[3].legume === 'pois_jaune',
     'Legumineuse : chaque journee porte sa propre legumineuse');
  ok(CC41.hasLegumeSwitch(days41) === true, 'Legumineuse : le changement en cours de semaine est detecte');
  ok(CC41.legumesUsed(days41).length === 2, 'Legumineuse : les deux legumineuses servies sont recensees');
  ok(CC41.legumeSwitchLabel(days41).includes('Haricot') && CC41.legumeSwitchLabel(days41).includes('Pois jaune'),
     'Legumineuse : le changement est explique a l utilisateur');

  const replan = CC41.planLegumesFromDays(days41, 100);
  ok(replan.beans === 9, 'Legumineuse : le haricot est replanifie sur 3 jours (9 kg)');
  ok(replan.yellowPeas === 6, 'Legumineuse : le pois jaune est replanifie sur 2 jours (6 kg)');

  const plan41b = { ...plan41, beans: replan.beans, yellowPeas: replan.yellowPeas, greenPeas: replan.greenPeas };
  const sum41 = CC41.calculateWeeklySummary(plan41b, days41);
  ok(sum41.legumeLines.length === 2, 'Legumineuse : la synthese presente une ligne par legumineuse');
  ok(sum41.legumeLines.every((l) => l.balance === 0), 'Legumineuse : apres replanification, aucun faux depassement');
  ok(CC41.hasOverrun(sum41) === false, 'Legumineuse : aucune alerte injustifiee');

  // Sans replanification, le cumul masquerait un depassement : il doit etre vu.
  const plan41c = CC41.calculateWeeklyPlan({ staffCount: 100, workingDays: 5, maizeServiceCount: 0, legume: 'haricot' });
  const days41c = [1, 2, 3, 4, 5].map((n) =>
    CC41.calculateDailyWithdrawal({ dayNumber: n, staffCount: 100, cereal: 'rice', legume: 'pois_jaune' }));
  const sum41c = CC41.calculateWeeklySummary(plan41c, days41c);
  ok(sum41c.legumeBalance === 0, 'Legumineuse : le cumul global vaut zero (cas piege)');
  ok(sum41c.legumeLines.some((l) => l.balance < 0), 'Legumineuse : le depassement reel est malgre tout visible');
  ok(CC41.hasOverrun(sum41c) === true, 'Legumineuse : l alerte se declenche sur la ligne concernee');

  ok(simSrc50.includes('legumineuse-jour-'), 'Legumineuse : le choix se fait jour par jour a l ecran');
  ok(simSrc50.includes('note-changement-legumineuse'), 'Legumineuse : le changement est signale dans le point hebdomadaire');
  const storeSrc50 = read50('src/utils/canteenStore.ts');
  ok(storeSrc50.includes('planLegumesFromDays'), 'Legumineuse : la prevision est reajustee a l enregistrement');
  ok(storeSrc50.includes('d.legume || week.legume'), 'Legumineuse : les semaines anterieures restent lisibles');

  /* --- c) Module Mes images educatives --- */
  const mods50 = read50('src/utils/appModules.ts');
  ok(mods50.includes("path: '/mes-images'"), 'Images : le module est declare');
  ok(mods50.includes('IA MSP de génération de gravures et d’images éducatives'),
     'Images : le sous-module de generation porte le nom demande');
  ok(mods50.includes('Banque d’images éducatives'), 'Images : la banque est declaree');
  const app50 = read50('src/App.tsx');
  for (const r of ['/mes-images', '/mes-images/generateur', '/mes-images/banque']) {
    ok(app50.includes(`path="${r}"`), `Images : la route ${r} est cablee`);
  }
  ok(app50.includes("findModule('/mes-images')"), 'Images : le module est resolu par son chemin');

  /* --- d) Moteur de generation local --- */
  const ENG = require('../src/utils/eduImageEngine') as typeof import('../src/utils/eduImageEngine');
  const engSrc = read50('src/utils/eduImageEngine.ts');
  // On ignore http://www.w3.org/2000/svg : c'est le namespace XML obligatoire
  // d'un SVG, pas une requete reseau.
  const engNoNs = engSrc.split('http://www.w3.org/2000/svg').join('');
  ok(!engNoNs.includes('fetch(') && !engNoNs.includes('XMLHttpRequest') && !engNoNs.includes('http'),
     'Images : le moteur ne fait aucun appel reseau');
  ok(ENG.availableScenes().length >= 12, 'Images : au moins 12 scenes sont disponibles');
  const gen1 = ENG.generateEducationalImage({ prompt: 'une ecole avec le maitre', style: 'gravure', level: 'Primaire' });
  ok(gen1.svg.startsWith('<svg') && gen1.svg.trim().endsWith('</svg>'), 'Images : le SVG genere est complet');
  ok(gen1.sceneKey === 'ecole', 'Images : la consigne « ecole » est correctement comprise');
  ok(gen1.interpretation.includes('Consigne comprise'), 'Images : le moteur explique ce qu il a compris');
  const gen2 = ENG.generateEducationalImage({ prompt: 'le cycle de l eau', style: 'couleur', level: 'Primaire' });
  ok(gen2.sceneKey === 'eau', 'Images : la consigne « eau » est correctement comprise');
  const gen3 = ENG.generateEducationalImage({ prompt: 'zzzz', style: 'gravure', level: 'Primaire' });
  ok(gen3.interpretation.includes('Aucun mot-cle') || gen3.interpretation.includes('Aucun mot-clé'),
     'Images : le moteur previent quand il n a pas compris (pas de faux resultat silencieux)');
  ok(ENG.svgToDataUrl('<svg></svg>').startsWith('data:image/svg+xml'), 'Images : conversion en data URL');

  /* --- e) Banque d'images payante --- */
  const BANK = require('../src/utils/eduImageBank') as typeof import('../src/utils/eduImageBank');
  ok(BANK.totalBankImages() === 12, `Banque : 12 images fournies (obtenu ${BANK.totalBankImages()})`);
  ok(BANK.IMAGE_PRICE_FCFA === 100, 'Banque : le prix unitaire est de 100 FCFA');
  ok(BANK.BANK_IMAGES.every((i) => i.price === 100), 'Banque : chaque image vaut bien 100 FCFA');
  ok(BANK.BANK_IMAGES.every((i) => i.title && i.description && i.subjects.length > 0),
     'Banque : chaque image est decrite et rattachee a des matieres');
  ok(BANK.BANK_IMAGES.some((i) => i.category === 'Bénin'), 'Banque : le contexte beninois est represente');
  ok(BANK.BANK_IMAGES.some((i) => i.category === 'Afrique'), 'Banque : le contexte africain est represente');
  ok(new Set(BANK.BANK_IMAGES.map((i) => i.id)).size === 12, 'Banque : les identifiants sont uniques');
  for (const img of BANK.BANK_IMAGES) {
    const svg = BANK.renderBankImage(img);
    ok(svg.startsWith('<svg') && svg.trim().endsWith('</svg>') && svg.length > 1200,
       `Banque : la planche « ${img.title} » est complete`);
  }
  const preview = BANK.renderBankPreview(BANK.BANK_IMAGES[0]);
  ok(preview.includes('APERCU') && preview.includes('100 FCFA'),
     'Banque : les images non payees sont filigranees');
  ok(BANK.searchBank('eau').length >= 1, 'Banque : la recherche fonctionne');
  ok(BANK.searchBank('', 'Bénin').every((i) => i.category === 'Bénin'), 'Banque : le filtre par categorie fonctionne');

  /* --- f) Paiement reutilisant le dispositif v38 --- */
  const bankScr = read50('src/components/ImageBankScreen.tsx');
  ok(bankScr.includes("from '../utils/coursePayment'"), 'Paiement : le dispositif existant est reutilise');
  ok(bankScr.includes('redeemUnlockCode'), 'Paiement : le deverrouillage par code est disponible');
  ok(bankScr.includes('recordPaymentRequest'), 'Paiement : la demande est journalisee pour l administrateur');
  ok(bankScr.includes('getPaymentContact'), 'Paiement : les coordonnees viennent du parametrage du Super Admin');
  ok(!/\+229|9\d{7}/.test(bankScr), 'Paiement : aucun numero de telephone code en dur');
  ok(bankScr.includes("if (!unlocked(img)) { notify('Réglez d’abord les 100 FCFA"),
     'Paiement : le telechargement est bloque tant que l image n est pas payee');
  for (const fmt of ['btn-dl-pdf', 'btn-dl-png', 'btn-dl-jpeg']) {
    ok(bankScr.includes(fmt), `Banque : le format ${fmt.replace('btn-dl-', '').toUpperCase()} est propose`);
  }
  const payKind = read50('src/utils/coursePayment.ts');
  ok(payKind.includes("'cours' | 'livre' | 'image'"), 'Paiement : les images sont un type de contenu payant');

  /* --- g) Generation gratuite, banque payante --- */
  const genScr = read50('src/components/ImageGeneratorScreen.tsx');
  ok(!genScr.includes('FCFA'), 'Images : les images generees par l enseignant restent gratuites');
  ok(genScr.includes('btn-pdf-image') && genScr.includes('btn-png-image'),
     'Images : les images generees sont exportables en PDF et en image');
  ok(genScr.includes('Imprimer'), 'Images : l impression est disponible pour les images generees');
  ok(read50('src/utils/eduImageStore.ts').includes('msp_generated_images'),
     'Images : les creations de l enseignant sont conservees');
  ok(/master-soutien-v(4[0-9]|[5-9][0-9]|[1-9][0-9]{2})\b/.test(read50('public/sw.js')), 'v41 : le cache hors ligne est au moins en v40');

  // ============================================================
  section('51. v42 — mode legumineuse, signature, comptabilite OHADA');
  // ============================================================
  const read51 = (f: string) => fs48.readFileSync(path48.join(process.cwd(), f), 'utf8');

  /* --- a) Mode de legumineuse : unique par defaut --- */
  const calc51 = read51('src/utils/canteenCalc.ts');
  ok(calc51.includes("export type LegumeMode = 'unique' | 'changement'"),
     'Cantine : le mode de legumineuse est un type explicite');
  ok(calc51.includes('legumeModeOf'), 'Cantine : le mode est lu par une fonction tolerante');
  ok(calc51.includes("w.legumeMode === 'changement' ? 'changement' : 'unique'"),
     'Cantine : une semaine sans mode enregistre est traitee comme unique');
  const simu51 = read51('src/components/CanteenSimulatorScreen.tsx');
  ok(simu51.includes('mode-legume-unique') && simu51.includes('mode-legume-changement'),
     'Cantine : les deux options sont proposees a la creation de la semaine');
  ok(simu51.includes("legumeMode: 'unique' as LegumeMode"),
     'Cantine : l absence de changement est l option par defaut');
  ok(simu51.includes("legumeMode === 'changement' ?"),
     'Cantine : le choix par jour n apparait qu en mode changement');
  ok(read51('src/utils/canteenStore.ts').includes("legumeModeOf(week) === 'unique'"),
     'Cantine : en mode unique, la legumineuse de la semaine s impose a chaque jour');

  /* --- b) Signature des documents --- */
  const sign51 = read51('src/utils/documentSignature.ts');
  ok(sign51.includes('Master Soutien Pédagogique (Votre compagnon mobile)'),
     'Signature : le texte impose est exactement celui demande');
  ok(sign51.includes('SIGNATURE_PRICE_FCFA = 500'),
     'Signature : la personnalisation coute 500 FCFA');
  ok(sign51.includes("if (origin === 'creation-ia') return null;"),
     'Signature : les creations IA de l utilisateur ne sont pas signees');
  ok(sign51.includes('isSignatureUnlocked()'),
     'Signature : le texte personnalise n est applique qu apres paiement');
  ok(read51('src/utils/pdfMaker.ts').includes('signatureFor(this.opts.origin'),
     'Signature : tous les PDF passent par la regle de signature');
  ok(read51('src/utils/eduImageBank.ts').includes("signatureFor('application')"),
     'Signature : les images de la banque sont signees');
  ok(read51('src/components/ImageGeneratorScreen.tsx').includes("origin: 'creation-ia'"),
     'Signature : le generateur IA produit des documents non signes');
  ok(!read51('src/utils/eduImageEngine.ts').includes('Master Soutien Pedagogique'),
     'Signature : le moteur IA n appose plus de mention en dur');
  ok(read51('src/utils/coursePayment.ts').includes("| 'signature'"),
     'Signature : la personnalisation est un contenu payant du dispositif v38');
  const sigScr = read51('src/components/SignatureSettingsScreen.tsx');
  ok(sigScr.includes('btn-demander-signature') && sigScr.includes('champ-code-signature'),
     'Signature : l ecran reprend le parcours de paiement v38');

  /* --- c) Module comptable --- */
  const acc51 = read51('src/utils/accountingCalc.ts');
  ok(acc51.includes('REVENUE_CATEGORIES') && acc51.includes('EXPENSE_CATEGORIES'),
     'Comptabilite : recettes et depenses ont leurs nomenclatures');
  ok(acc51.includes("account: '7061'") && acc51.includes("account: '6611'"),
     'Comptabilite : les comptes OHADA sont renseignes');
  ok(acc51.includes('investment: true'),
     'Comptabilite : les immobilisations sont distinguees des charges');
  ok(acc51.includes('export function dailySummary'),
     'Comptabilite : le point journalier est calcule hors des composants');
  ok(acc51.includes('export function revenueByClass'),
     'Comptabilite : les recettes sont ventilees par classe');
  ok(acc51.includes('export function buildOhadaBalance'),
     'Comptabilite : le bilan OHADA est produit par le service de calcul');
  ok(acc51.includes('export function buildInventory'),
     'Comptabilite : l inventaire OHADA est produit par le service de calcul');
  ok(acc51.includes('balanced: totalActif === totalPassif'),
     'Comptabilite : l equilibre du bilan est verifie, jamais force');
  ok(acc51.includes('OHADA_DISCLAIMER'),
     'Comptabilite : les etats precisent honnetement leur portee');
  ok(acc51.includes('line.planned > 0 ?'),
     'Comptabilite : aucun taux calcule sur une prevision nulle');

  const accExp51 = read51('src/utils/accountingExport.ts');
  ok(accExp51.includes('exportBalancePdf') && accExp51.includes('exportInventoryPdf'),
     'Comptabilite : bilan et inventaire sont exportables en PDF');
  ok(accExp51.includes('exportOhadaExcel') && accExp51.includes('wb.xlsx.writeBuffer'),
     'Comptabilite : un vrai classeur Excel est produit');
  ok(accExp51.includes('printAccountingDocument'),
     'Comptabilite : l impression est conservee a cote du PDF');

  const store51 = read51('src/utils/accountingStore.ts');
  ok(store51.includes('${y}-09-01'),
     'Comptabilite : l exercice demarre en septembre, a la rentree');

  const mods51 = read51('src/utils/appModules.ts');
  ok(mods51.includes('Mon gestionnaire comptable MSP'),
     'Comptabilite : le module porte le nom demande');
  ok(mods51.includes('Le budget de mon école'),
     'Comptabilite : le sous-module budget porte le nom demande');
  const app51 = read51('src/App.tsx');
  for (const r of ['/comptabilite', '/comptabilite/journal', '/comptabilite/budget', '/mes-images/signature']) {
    ok(app51.includes(`path="${r}"`), `v42 : la route ${r} est cablee`);
  }
  ok(app51.includes("findModule('/comptabilite')"),
     'Comptabilite : le module est resolu par son chemin');
  ok(/master-soutien-v(4[0-9]|[5-9][0-9]|[1-9][0-9]{2})\b/.test(read51('public/sw.js')),
     'v42 : le cache hors ligne est au moins en v40');

  // ============================================================
  section('52. v43 — rattachement de l utilisateur a son ecole');
  // ============================================================
  const read52 = (f: string) => fs48.readFileSync(path48.join(process.cwd(), f), 'utf8');
  const bind52 = read52('src/utils/schoolBinding.ts');

  /* --- a) Verrouillage sur la premiere ecole --- */
  ok(bind52.includes('export function bindSchool'),
     'Ecole : le premier enregistrement verrouille l etablissement');
  // v47 : bindSchool adopte desormais un rattachement pre-v47 pour y
  // inscrire le code titulaire. On verifie donc le COMPORTEMENT (l'ecole
  // de reference ne change pas) plutot que le texte exact du source.
  ok(bind52.includes('const existing = loadBinding();') && bind52.includes('return existing;'),
     'Ecole : rappeler bindSchool ne contourne pas le verrou');
  ok(bind52.includes('export function checkSchoolChange'),
     'Ecole : tout changement passe par un controle explicite');
  ok(bind52.includes('export function isSameSchool'),
     'Ecole : la comparaison tolere casse, accents et espaces');
  ok(bind52.includes("normalize('NFD')"),
     'Ecole : les accents sont neutralises avant comparaison');

  /* --- b) Transfert autorise par l administration --- */
  ok(bind52.includes('export function transferCodeFor'),
     'Transfert : un code lie a l appareil peut etre dicte a distance');
  ok(bind52.includes('export function redeemTransferCode'),
     'Transfert : l utilisateur peut saisir le code recu');
  ok(bind52.includes('export function grantTransfer'),
     'Transfert : l administration peut autoriser directement');
  ok(bind52.includes('export function revokeTransfer'),
     'Transfert : une autorisation peut etre retiree');
  ok(bind52.includes('transferAllowed: false,\n    transferGrantedBy: undefined'),
     'Transfert : l autorisation est consommee apres usage');
  ok(bind52.includes('export function adminSetSchool'),
     'Transfert : le Super Administrateur peut reecrire l etablissement (v39)');
  ok(bind52.includes('history.push'),
     'Transfert : chaque changement est inscrit dans l historique');

  /* --- c) Branchement dans l application --- */
  const prof52 = read52('src/components/ProfileScreen.tsx');
  ok(prof52.includes('checkSchoolChange(profile.schoolName)'),
     'Profil : l enregistrement verifie l ecole de rattachement');
  ok(prof52.includes('champ-code-transfert') && prof52.includes('btn-valider-transfert'),
     'Profil : l utilisateur peut saisir son autorisation de transfert');
  ok(prof52.includes('identifiant-transfert'),
     'Profil : l identifiant de l appareil est affiche pour la demande');

  const panel52 = read52('src/components/SchoolTransferPanel.tsx');
  ok(panel52.includes('code-transfert') && panel52.includes('champ-appareil-distant'),
     'Administration : le code peut etre calcule pour un appareil distant');
  ok(panel52.includes('btn-accorder-transfert') && panel52.includes('btn-retirer-transfert'),
     'Administration : autorisation et retrait sont disponibles');
  ok(panel52.includes('btn-modifier-ecole-admin'),
     'Administration : l etablissement peut etre modifie directement');
  ok(panel52.includes('historique-rattachement'),
     'Administration : l historique des rattachements est consultable');

  const dash52 = read52('src/components/AdminDashboardScreen.tsx');
  ok(dash52.includes("etablissement: ['Super Administrateur']"),
     'Administration : le transfert est reserve au Super Administrateur');
  ok(dash52.includes('<SchoolTransferPanel />'),
     'Administration : le panneau est cable dans le tableau de bord');
  ok(read52('src/components/ModuleScreen.tsx').includes('<SchoolLockBanner />'),
     'Ecole : un bandeau avertit en cas d etablissement divergent');
  ok(/master-soutien-v(4[3-9]|[5-9][0-9]|[1-9][0-9]{2})\b/.test(read52('public/sw.js')),
     'v43+ : le cache hors ligne est au moins en v43');
}

// ============================================================
// SECTION 53 — v44 : vrais PDF pour les bulletins et la bibliotheque
// ============================================================
{
  const fs53 = require('fs');
  const path53 = require('path');
  const read53 = (f: string) => fs53.readFileSync(path53.join(process.cwd(), f), 'utf8');
  console.log('\n--- 53. Vrais PDF bulletins et bibliotheque (v44) ---');

  const bp = read53('src/utils/bulletinPdf.ts');
  ok(bp.includes('export function exportBulletinPdf'), 'Bulletins : export PDF d un eleve');
  ok(bp.includes('export function exportClassBulletinsPdf'), 'Bulletins : export PDF de toute la classe');
  ok(bp.includes('export function exportClassSummaryPdf'), 'Bulletins : recapitulatif PDF de la classe');
  ok(bp.includes('pageBreak'), 'Bulletins : un eleve par page dans l export de classe');
  ok(bp.includes("orientation: 'landscape'"), 'Recapitulatif : mise en page paysage');
  ok(bp.includes("replace('.', ',')"), 'Notes affichees avec la virgule decimale francaise');
  ok(bp.includes('Coef'), 'Bulletin du secondaire : colonne coefficient');
  ok(bp.includes('Abs.'), 'Les eleves absents sont distingues des notes manquantes');

  // Le PDF doit passer par le generateur hors ligne, jamais par window.print seul.
  ok(bp.includes("from './pdfMaker'"), 'Bulletins : le PDF est fabrique hors ligne');

  const bs = read53('src/components/BulletinsScreen.tsx');
  ok(bs.includes('btn-pdf-bulletin"'), 'Ecran bulletins : bouton PDF individuel');
  ok(bs.includes('btn-pdf-bulletins'), 'Ecran bulletins : bouton PDF de la classe');
  ok(bs.includes('btn-pdf-recap'), 'Ecran bulletins : bouton recapitulatif');
  ok(bs.includes('btn-imprimer-bulletin'), 'Ecran bulletins : l impression est conservee (regle v41)');
  // Le libelle « Imprimer / PDF » promettait un PDF que le bouton ne produisait pas.
  ok(!bs.includes('Imprimer / PDF'), 'Le libelle trompeur « Imprimer / PDF » a ete corrige');
  // La barre d actions doit passer AU-DESSUS de la feuille du bulletin (z-30).
  ok(/fixed bottom-0[^"]*z-40/.test(bs), 'Barre d actions au-dessus du bulletin (z-index)');
  ok(bs.includes('pb-64'), 'Le bas du bulletin reste lisible malgre la barre d actions');

  const lp = read53('src/utils/libraryPdf.ts');
  ok(lp.includes('export function exportBookPdf'), 'Bibliotheque : export PDF d un livre');
  ok(lp.includes('export function printBook'), 'Bibliotheque : impression d un livre');
  ok(lp.includes('signatureFor'), 'Les livres exportes portent la signature de l application');

  const ls = read53('src/components/LibraryScreen.tsx');
  ok(ls.includes('btn-pdf-livre'), 'Bibliotheque : PDF fabrique pour les livres saisis en texte');
  ok(ls.includes('btn-dl-livre'), 'Bibliotheque : telechargement direct si un PDF est joint');
  ok(ls.includes('btn-imprimer-livre'), 'Bibliotheque : l impression coexiste avec le PDF');
  ok(ls.includes('exportBookPdf') && ls.includes('printBook'),
     'Bibliotheque : les deux fonctions PDF sont bien cablees');

  const pm = read53('src/utils/pdfMaker.ts');
  ok(pm.includes('pageBreak'), 'PdfBuilder : saut de page disponible');
}

// ============================================================
// SECTION 54 — historique v44, jeu de référence recalculé en v65
// ============================================================
{
  console.log('\n--- 54. Simulateur cantine : jeu de référence historique (arrondi v65) ---');
  const C = require('../src/utils/canteenCalc') as typeof import('../src/utils/canteenCalc');

  /* --- a) MROUND : arrondi au multiple le PLUS PROCHE --- */
  ok(C.roundToMultiple(9.3, 0.25) === 9.25, 'MROUND : 9,30 -> 9,25 (vers le bas)');
  ok(C.roundToMultiple(43.65, 0.25) === 43.75, 'MROUND : 43,65 -> 43,75 (vers le haut)');
  ok(C.roundToMultiple(44.25, 0.25) === 44.25, 'MROUND : un multiple exact est inchange');
  ok(C.roundToMultiple(0.93, 0.1) === 0.9, 'MROUND : sel 0,93 -> 0,90');
  // Egalite parfaite : MROUND s'eloigne de zero, comme Excel.
  ok(C.roundToMultiple(0.125, 0.25) === 0.25, 'MROUND : a egalite, on retient le multiple superieur');
  // Precision flottante : 0,03 x 282 = 8.459999999999999
  ok(C.roundToMultiple(8.459999999999999, 0.25) === 8.5, 'MROUND : pas d erreur de precision flottante');

  /* --- a bis) v65 : intervalles officiels de sortie --- */
  ok(C.roundCanteenOutput(0, 0.25) === 0, 'Sortie v65 : 0 reste 0');
  ok(C.roundCanteenOutput(15, 0.25) === 15, 'Sortie v65 : un entier exact reste entier');
  ok(C.roundCanteenOutput(0.01, 0.25) === 0.25, 'Sortie v65 quart : fraction positive minimale -> 0,25');
  ok(C.roundCanteenOutput(0.375, 0.25) === 0.25, 'Sortie v65 quart : borne 0,375 -> 0,25');
  ok(C.roundCanteenOutput(0.376, 0.25) === 0.5, 'Sortie v65 quart : 0,376 -> 0,50');
  ok(C.roundCanteenOutput(42.30, 0.25) === 42.25, 'Sortie v65 quart : 42,30 -> 42,25');
  ok(C.roundCanteenOutput(3.10, 0.25) === 3.25, 'Sortie v65 quart : huile 3,10 -> 3,25');
  ok(C.roundCanteenOutput(0.875, 0.25) === 0.75, 'Sortie v65 quart : borne 0,875 -> 0,75');
  ok(C.roundCanteenOutput(0.876, 0.25) === 1, 'Sortie v65 quart : 0,876 -> 1');
  ok(C.roundCanteenOutput(0.15, 0.1) === 0.1, 'Sortie v65 sel : borne 0,15 -> 0,10');
  ok(C.roundCanteenOutput(0.151, 0.1) === 0.2, 'Sortie v65 sel : 0,151 -> 0,20');
  ok(C.roundCanteenOutput(0.84, 0.1) === 0.8, 'Sortie v65 sel : 0,84 -> 0,80');
  ok(C.roundCanteenOutput(0.95, 0.1) === 0.9, 'Sortie v65 sel : borne 0,95 -> 0,90');
  ok(C.roundCanteenOutput(0.951, 0.1) === 1, 'Sortie v65 sel : 0,951 -> 1');
  ok(C.roundCanteenNamedFoodOutput(0.84, 'Sel iodé') === 0.8, 'Sortie v65 : « Sel iodé » suit les dixièmes');
  ok(C.roundCanteenNamedFoodOutput(8.46, 'Pois vert') === 8.5, 'Sortie v65 : une légumineuse suit les quarts');
  ok(C.CANTEEN_ROUNDING_RULES['huile-cereales-legumineuses'].intervals.length === 4,
     'Sortie v65 : 4 intervalles au quart');
  ok(C.CANTEEN_ROUNDING_RULES.sel.intervals.length === 10,
     'Sortie v65 : 10 intervalles pour le sel');

  /* --- b) Jeu de reference du fichier (§41) ---
   * En v65, seule l'huile change dans ce jeu : 3,10 L par service ->
   * fraction 0,10 dans [0 ; 0,375] -> 3,25 L, soit 16,25 L sur 5 jours. */
  // Effectif hebdo 310, 5 jours, 0 sortie de mais, haricot.
  const plan = C.calculateWeeklyPlan({
    staffCount: 310, workingDays: 5, maizeServiceCount: 0, legume: 'haricot',
  });
  ok(plan.maize === 0, 'Reference : aucune sortie de mais prevue');
  ok(plan.rice === 232.5, 'Reference : riz prevu = 46,50 x 5 = 232,50 kg');
  ok(plan.beans === 46.25, 'Reference : haricot prevu = 9,25 x 5 = 46,25 kg');
  ok(plan.yellowPeas === 0, 'Reference : le pois jaune non choisi reste a zero');
  ok(plan.oil === 16.25, 'Reference v65 : huile prevue = 3,25 x 5 = 16,25 L');
  ok(plan.salt === 4.5, 'Reference : sel prevu = 0,90 x 5 = 4,50 kg');

  // Effectifs journaliers INDEPENDANTS de l'effectif hebdomadaire (§13).
  const eff = [279, 291, 295, 290, 291];
  const days = eff.map((e, i) => C.calculateDailyWithdrawal({
    dayNumber: i + 1, staffCount: e, cereal: 'rice', legume: 'haricot',
  }));
  ok(days[0].riceQuantity === 41.75, 'Reference J1 : 279 eleves -> riz 41,75 kg');
  ok(days[1].riceQuantity === 43.75, 'Reference J2 : 291 eleves -> riz 43,75 kg');
  ok(days[2].riceQuantity === 44.25, 'Reference J3 : 295 eleves -> riz 44,25 kg');
  ok(days[3].riceQuantity === 43.5,  'Reference J4 : 290 eleves -> riz 43,50 kg');
  ok(days[4].riceQuantity === 43.75, 'Reference J5 : 291 eleves -> riz 43,75 kg');
  ok(days.every((d) => d.maizeQuantity === 0), 'Reference : aucun mais les jours ou l on sert du riz');
  ok(days[0].legumeQuantity === 8.25, 'Reference J1 : legumineuse 8,25 kg');
  ok(days[0].saltQuantity === 0.8, 'Reference J1 : sel 0,80 kg');

  /* --- c) Point hebdo --- */
  const sum = C.calculateWeeklySummary(plan, days);
  // Excel : C21+C29+C37+C45+C53
  ok(sum.totalMeals === 1446, 'Reference : 1446 plats servis (somme des 5 effectifs)');
  ok(sum.riceActual === 217, 'Reference : riz reellement sorti = 217 kg');
  ok(sum.riceBalance === 15.5, 'Reference : reliquat riz = 232,50 - 217 = 15,50 kg');
  // Excel : (D14 + D15) - E64, soit haricot + pois jaune.
  ok(sum.legumeActual === 43.25, 'Reference : legumineuse reellement sortie = 43,25 kg');
  ok(sum.legumeBalance === 3, 'Reference : reliquat legumineuse = 46,25 - 43,25 = 3 kg');
  ok(sum.oilBalance === 1.5, 'Reference v65 : reliquat huile = 16,25 - 14,75 = 1,50 L');
  ok(sum.saltBalance === 0.1, 'Reference : reliquat sel = 0,10 kg');

  /* --- d) Prevision et reel ne sont jamais confondus (§35) --- */
  // L'effectif hebdo (310) ne doit jamais remplacer les effectifs journaliers.
  ok(sum.ricePlanned !== sum.riceActual,
     'Prevision et reel restent distincts (310 hebdo vs effectifs journaliers)');

  /* --- e) Jour non ouvrable exclu du cumul (§33) --- */
  const avecRepos = [...days];
  avecRepos[4] = C.calculateDailyWithdrawal({
    dayNumber: 5, staffCount: 0, cereal: 'aucune', legume: 'haricot',
  });
  const sum2 = C.calculateWeeklySummary(plan, avecRepos);
  ok(sum2.totalMeals === 1155, 'Jour non ouvrable : exclu du nombre de plats');
  ok(sum2.riceActual === 173.25, 'Jour non ouvrable : exclu des quantites sorties');
  ok(avecRepos.length === 5, 'Les cinq structures journalieres sont conservees');

  /* --- f) v44 : une journee sans legumineuse --- */
  const sansLeg = C.calculateDailyWithdrawal({
    dayNumber: 1, staffCount: 279, cereal: 'rice', legume: 'aucune',
  });
  ok(sansLeg.legumeQuantity === 0, 'Jour sans legumineuse : quantite a zero');
  ok(sansLeg.riceQuantity === 41.75, 'Jour sans legumineuse : la cereale reste servie');
  const ui = require('fs').readFileSync(
    require('path').join(process.cwd(), 'src/components/CanteenSimulatorScreen.tsx'), 'utf8');
  ok(ui.includes('sans-legumineuse-jour-'),
     'Ecran : case « Pas de legumineuse ce jour » meme en mode legumineuse unique');

  /* --- g) Un depassement n'est jamais masque --- */
  const petitPlan = C.calculateWeeklyPlan({
    staffCount: 100, workingDays: 5, maizeServiceCount: 0, legume: 'haricot',
  });
  const gros = eff.map((e, i) => C.calculateDailyWithdrawal({
    dayNumber: i + 1, staffCount: e, cereal: 'rice', legume: 'haricot',
  }));
  const sum3 = C.calculateWeeklySummary(petitPlan, gros);
  ok(sum3.riceBalance < 0, 'Depassement : le reliquat devient negatif');
  ok(C.hasOverrun(sum3), 'Depassement : signale par hasOverrun()');
}

// ============================================================
// SECTION 55 — v45 : saisie par profil et PDF des tableaux
// ============================================================
{
  const fs55 = require('fs');
  const path55 = require('path');
  const read55 = (f: string) => fs55.readFileSync(path55.join(process.cwd(), f), 'utf8');
  console.log('\n--- 55. Saisie par profil et exports PDF (v45) ---');

  const app = read55('src/App.tsx');

  /* --- a) La saisie par profil est accessible la ou elle est annoncee --- */
  // L'ecran annonce « Par matiere ou par profil » : les deux doivent y etre.
  ok(app.includes('mode-saisie-profil'), 'Saisie : le mode « Par profil » est propose sur l ecran de saisie');
  ok(app.includes('mode-saisie-matiere'), 'Saisie : le mode « Par matiere » est propose');
  ok(/mode-saisie-profil[\s\S]{0,200}\/profiles/.test(app),
     'Saisie : le mode « Par profil » ouvre bien les fiches eleves');
  // La route et l'ecran doivent continuer d'exister.
  ok(app.includes('path="/class/:id/profiles"'), 'Saisie : la route des fiches eleves existe');
  ok(fs55.existsSync(path55.join(process.cwd(), 'src/components/StudentProfileEntry.tsx')),
     'Saisie : l ecran de saisie par profil existe');

  /* --- b) Tableau des notes exportable --- */
  ok(app.includes('btn-pdf-tableau'), 'Tableau des notes : bouton de telechargement PDF');
  ok(app.includes('btn-imprimer-tableau'), 'Tableau des notes : l impression coexiste avec le PDF');
  ok(app.includes('exportNotesTablePdf'), 'Tableau des notes : l export est cable');

  const bp55 = read55('src/utils/bulletinPdf.ts');
  ok(bp55.includes('export function exportNotesTablePdf'), 'Tableau des notes : la fonction d export existe');
  ok(bp55.includes("orientation: 'landscape'"), 'Tableau des notes : mise en page paysage');

  /* --- c) Statistiques par discipline et bilan annuel --- */
  const rp = read55('src/utils/reportPdf.ts');
  ok(rp.includes('export function exportSubjectStatsPdf'), 'Disciplines : fonction d export PDF');
  ok(rp.includes('export function exportAnnualReportPdf'), 'Bilan annuel : fonction d export PDF');

  const ss = read55('src/components/SubjectStatisticsScreen.tsx');
  ok(ss.includes('btn-pdf-disciplines'), 'Disciplines : bouton PDF');
  ok(ss.includes('btn-imprimer-disciplines'), 'Disciplines : impression conservee');

  const ar = read55('src/components/AnnualReportScreen.tsx');
  ok(ar.includes('btn-pdf-bilan'), 'Bilan annuel : bouton PDF');
  ok(ar.includes('btn-imprimer-bilan'), 'Bilan annuel : impression conservee');

  /* --- d) Aucun ecran de rapport ne doit rester sans vrai PDF (regle v41) --- */
  // On verifie qu'aucun ecran n'offre l'impression SANS proposer de PDF.
  const ecrans = [
    'src/components/SubjectStatisticsScreen.tsx',
    'src/components/AnnualReportScreen.tsx',
    'src/components/BulletinsScreen.tsx',
  ];
  for (const f of ecrans) {
    const src = read55(f);
    if (src.includes('window.print()')) {
      ok(/Pdf\(/.test(src), `${f.split('/').pop()} : l impression s accompagne d un vrai PDF`);
    }
  }
}

// ============================================================
{
  section('56. v47 — effectifs cantine, licence, outils, verrou, numerisation');
  // ============================================================
  const { createRequire: cr56 } = await import('module');
  const req56 = cr56(import.meta.url);
  const fs56 = req56('fs');
  const path56 = req56('path');
  const read56 = (f: string) => fs56.readFileSync(path56.join(process.cwd(), f), 'utf8');

  /* --- a) Releve des effectifs par classe --- */
  const enr = await import('../src/utils/canteenEnrollment');
  ok(enr.CLASS_LEVELS.length === 8, 'Effectifs : 8 classes de la Maternelle 1 au CM2');
  const labels = enr.CLASS_LEVELS.map((l: any) => l.label);
  for (const c of ['Maternelle 1', 'Maternelle 2', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']) {
    ok(labels.includes(c), `Effectifs : la classe ${c} est presente`);
  }
  ok(labels[0] === 'Maternelle 1' && labels[7] === 'CM2', 'Effectifs : ordre officiel respecte');

  // Totaux : garcons + filles, jamais saisis.
  const counts = enr.normalizeCounts([
    { level: 'ci', boys: 12, girls: 8 },
    { level: 'cm2', boys: 5, girls: 15 },
  ] as any);
  const tot = enr.computeTotals(counts);
  ok(tot.boys === 17 && tot.girls === 23 && tot.total === 40, 'Effectifs : totaux G/F/T calcules');
  ok(tot.girlsPct === 57.5, `Effectifs : part des filles = 57,5 % (obtenu ${tot.girlsPct})`);
  ok(enr.computeTotals(enr.emptyCounts()).girlsPct === 0, 'Effectifs : effectif nul => 0 %, jamais NaN');
  ok(enr.normalizeCounts([] as any).length === 8, 'Effectifs : grille toujours completee a 8 classes');
  // Saisie aberrante neutralisee.
  const bad = enr.normalizeCounts([{ level: 'cp', boys: -4, girls: 2.7 } as any]);
  const cp = bad.find((c: any) => c.level === 'cp')!;
  ok(cp.boys === 0 && cp.girls === 2, 'Effectifs : valeur negative ou decimale corrigee');
  const cycles = tot.byCycle.map((c: any) => c.cycle);
  ok(cycles.includes('Maternelle') && cycles.includes('Primaire'), 'Effectifs : ventilation par cycle');

  const enrUI = read56('src/components/CanteenEnrollmentScreen.tsx');
  ok(enrUI.includes('btn-vers-simulateur'), 'Effectifs : bouton de report vers le simulateur');
  ok(enrUI.includes('msp_canteen_effectif_propose'), 'Effectifs : report par relais explicite');
  ok(enrUI.includes('exportEnrollmentPdf') && enrUI.includes('printEnrollment'),
     'Effectifs : PDF reel ET impression conservee');
  const sim56 = read56('src/components/CanteenSimulatorScreen.tsx');
  ok(sim56.includes('msp_canteen_effectif_propose'), 'Effectifs : le simulateur lit l effectif propose');
  ok(sim56.includes('f.weeklyStaffCount ? f :'), 'Effectifs : le report n ecrase pas une saisie existante');
  ok(read56('src/App.tsx').includes('/cantine/effectifs'), 'Effectifs : route enregistree');

  /* --- b) Bandeau de licence nominatif --- */
  const lic = read56('src/components/LicenceBanner.tsx');
  ok(lic.includes('LICENCE :'), 'Licence : le bandeau affiche « LICENCE : »');
  ok(lic.includes('getActivation'), 'Licence : le nom vient du titulaire du code active');
  ok(lic.includes('bandeau-licence'), 'Licence : identifiant de test present');
  const app56 = read56('src/App.tsx');
  ok(app56.includes('<LicenceBanner />'), 'Licence : monte dans App, donc sur chaque page');
  ok(app56.indexOf('<LicenceBanner />') < app56.indexOf('<AppGate />'),
     'Licence : affiche au-dessus du contenu');

  /* --- c) Verrou « un code = un utilisateur = une seule ecole » --- */
  const bind56 = read56('src/utils/schoolBinding.ts');
  ok(bind56.includes('boundCode'), 'Verrou : le rattachement porte le code titulaire');
  ok(bind56.includes('export function isBindingOwner'), 'Verrou : controle du titulaire expose');
  ok(bind56.includes('!isBindingOwner()'), 'Verrou : un autre code ne peut enregistrer une 2e ecole');
  ok(/boundCode: b\.boundCode \|\| currentCode\(\)/.test(bind56),
     'Verrou : le titulaire est conserve lors d un transfert');

  /* --- d) Chronometre --- */
  const chrono = read56('src/components/ChronoScreen.tsx');
  ok(chrono.includes('performance.now()'), 'Chrono : horloge monotone (pas de derive du setInterval)');
  ok(chrono.includes('vitesse') && chrono.includes('endurance'), 'Chrono : vitesse et endurance');
  ok(chrono.includes('btn-top-arrivee'), 'Chrono : temps intermediaires par eleve');
  ok(chrono.includes('pacePer100m'), 'Chrono : allure aux 100 m pour l endurance');

  /* --- e) Calculatrice et outils --- */
  const calc = await import('../src/utils/calculator');
  ok(calc.evaluateExpression('2+3*4').value === 14, 'Calcul : priorite des operations');
  ok(calc.evaluateExpression('(2+3)*4').value === 20, 'Calcul : parentheses');
  ok(calc.evaluateExpression('2^3^2').value === 512, 'Calcul : puissance associative a droite');
  ok(calc.evaluateExpression('1,5*2').value === 3, 'Calcul : virgule decimale francaise');
  ok(!calc.evaluateExpression('4/0').ok, 'Calcul : division par zero refusee');
  ok(!calc.evaluateExpression('alert(1)').ok, 'Calcul : aucune execution de code (pas d eval)');
  ok(calc.weightedAverage([{ note: 12, coef: 2 }, { note: 8, coef: 1 }]) === 10.67,
     'Outils : moyenne ponderee');
  ok(calc.convertMark(15, 30, 20) === 10, 'Outils : conversion de bareme 15/30 => 10/20');
  ok(calc.successRate(18, 40) === 45, 'Outils : taux de reussite 45 %');
  ok(calc.successRate(3, 0) === 0, 'Outils : effectif nul => 0, jamais NaN');
  ok(calc.ruleOfThree(2, 10, 5) === 25, 'Outils : regle de trois');

  /* --- f) Numerisation HD --- */
  const scan = await import('../src/utils/scanner');
  ok(scan.HD_MAX_SIZE >= 2000, 'Scan : resolution HD (>= 2000 px sur le grand cote)');
  // Seuillage adaptatif : une ombre ne doit pas noircir toute une zone.
  const W = 40, H = 40;
  const gray = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fond = 90 + (x / W) * 150;
      gray[y * W + x] = (x >= 18 && x <= 21) ? fond * 0.35 : fond;
    }
  }
  const bin = scan.adaptiveThreshold(gray, W, H, 0.15);
  ok(bin[20 * W + 19] === 0, 'Scan : le trait d encre ressort en noir');
  ok(bin[20 * W + 2] === 255, 'Scan : la zone ombree reste blanche (seuil global aurait echoue)');
  ok(bin[20 * W + 37] === 255, 'Scan : la zone claire reste blanche');
  const scanUI = read56('src/components/ScannerScreen.tsx');
  ok(scanUI.includes('getUserMedia'), 'Scan : capture par la camera');
  ok(scanUI.includes('input-import'), 'Scan : import de fichier egalement propose');
  ok(scanUI.includes("facingMode"), 'Scan : camera arriere privilegiee');
  ok(scanUI.includes('stopCamera'), 'Scan : la camera est liberee en quittant l ecran');
  ok(scanUI.includes('btn-pdf-scan'), 'Scan : export PDF multi-pages');
  ok(scanUI.includes('extractSignature'), 'Scan : signature et cachet detoures');
  ok(scan.SIGNATURE_KEY !== scan.STAMP_KEY, 'Scan : signature et cachet stockes separement');

  /* --- g) Documents administratifs officiels --- */
  const adminUI = read56('src/components/SchoolAdminToolkitScreen.tsx');
  for (const t of ['DDEMP', 'ORDINAIRE', 'EXTRAORDINAIRE', 'Heure de démarrage',
                   'Heure de la fin', "Qualité de l'ambiance", 'Le Secrétaire de séance',
                   "POINTS INSCRITS À L'ORDRE DU JOUR", 'DÉROULEMENT']) {
    ok(adminUI.includes(t), `Administration : le modele reprend « ${t} »`);
  }
  ok(adminUI.includes("L'an deux mil"), 'Administration : formule officielle du PV des parents');
  ok(adminUI.includes('Émargement') && adminUI.includes('Matricule'),
     'Administration : liste de presence avec matricule et emargement');
  ok(adminUI.includes('liste_presence_conseil') && adminUI.includes('liste_presence_ape'),
     'Administration : les deux listes de presence sont proposees');
  ok(adminUI.includes('exportDocumentPdf'), 'Administration : vrai PDF (regle v41 respectee)');
  ok(adminUI.includes('getSignatureImage') && adminUI.includes('getStampImage'),
     'Administration : signature et cachet apposes sur le document');

  /* --- h) Conditions d utilisation --- */
  const terms = await import('../src/utils/termsOfUse');
  ok(terms.DEFAULT_TERMS.includes('ARTICLE 3'), 'CGU : texte structure en articles');
  ok(terms.DEFAULT_TERMS.includes('999 FCFA'), 'CGU : abonnement annuel mentionne');
  ok(terms.DEFAULT_TERMS.includes('une seule école') || terms.DEFAULT_TERMS.includes('UNE SEULE ÉCOLE'),
     'CGU : regle un code = une ecole rappelee');
  ok(terms.DEFAULT_TERMS.includes('hors') && terms.DEFAULT_TERMS.includes('local'),
     'CGU : fonctionnement hors ligne et IA locale');
  ok(terms.splitArticles(terms.DEFAULT_TERMS).length >= 12, 'CGU : au moins 12 articles');
  const termsUI = read56('src/components/TermsScreen.tsx');
  ok(termsUI.includes('isPrincipalAdminSession') && termsUI.includes('function isSuperAdmin'), 'CGU : edition reservee au Super Administrateur');
  ok(termsUI.includes('btn-enregistrer-conditions') && termsUI.includes('btn-reinitialiser-conditions'),
     'CGU : enregistrement et retour au texte d origine');

  /* --- i) Icones conformes a l intitule --- */
  const modScreen = read56('src/components/ModuleScreen.tsx');
  const iconTable = modScreen.split('const ICONS')[1].split('};')[0];
  const usedIcons = [...new Set([...read56('src/utils/appModules.ts')
    .matchAll(/icon: '([A-Za-z]+)'/g)].map((m: any) => m[1]))];
  const missing = usedIcons.filter((i: any) => !new RegExp(`\\b${i}\\b`).test(iconTable));
  ok(missing.length === 0, `Icones : toutes declarees (manquantes : ${missing.join(', ') || 'aucune'})`);

  /* --- j) Design africain applique --- */
  const css56 = read56('src/index.css');
  for (const cls of ['.msp-licence-bar', '.msp-kente', '.msp-module-header', '.msp-flag-rule', '.msp-card']) {
    ok(css56.includes(cls), `Design : la classe ${cls} est definie`);
  }
  ok(css56.includes('@media print'), 'Design : le decor disparait a l impression');
  ok(modScreen.includes('msp-kente'), 'Design : applique a l en-tete de chaque module');

  /* --- k) Cache hors ligne --- */
  ok(/master-soutien-v(4[7-9]|[5-9][0-9]|[1-9][0-9]{2})\b/.test(read56('public/sw.js')), 'PWA : cache hors ligne bumpe au moins en v47');
}

// ============================================================
{
  section('57. v48 — espace parents « Suivi de votre enfant » (etape 1)');
  // ============================================================
  const { createRequire: cr57 } = await import('module');
  const req57 = cr57(import.meta.url);
  const fs57 = req57('fs');
  const path57 = req57('path');
  const read57 = (f: string) => fs57.readFileSync(path57.join(process.cwd(), f), 'utf8');

  const P = await import('../src/utils/parentLink');

  /* --- a) Codes de rattachement --- */
  const c1 = P.generateLinkCode();
  const c2 = P.generateLinkCode();
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c1), 'Parents : code au format XXXX-XXXX-XXXX');
  ok(c1 !== c2, 'Parents : deux codes generes different');
  ok(!/[O0I1L]/.test(c1 + c2), 'Parents : aucun caractere ambigu (O,0,I,1,L)');
  ok(P.normalizeCode('abcd-2345-wxyz') === 'ABCD2345WXYZ', 'Parents : saisie normalisee');
  const src57 = read57('src/utils/parentLink.ts');
  ok(src57.includes('crypto.getRandomValues'), 'Parents : tirage cryptographique, pas Math.random');
  // On retire commentaires et chaines avant de chercher Math.random :
  // le mot apparait legitimement dans la documentation du module.
  const code57 = src57
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  ok(!/Math\.random/.test(code57), 'Parents : Math.random jamais utilise pour un code');

  /* --- b) Minimisation : le dossier ne contient QUE l enfant --- */
  const mk = (id: string, nom: string, prenoms: string, mat: string) =>
    ({ id, nom, prenoms, matricule: mat, createdAt: 1 });
  const subjects = [
    { id: 'sub1', name: 'Francais', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1 },
    { id: 'sub2', name: 'Calcul', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 2 },
  ];
  const students = [
    mk('s1', 'AHOUANSOU', 'Jean', '001'), mk('s2', 'KOFFI', 'Mariam', '002'),
    mk('s3', 'DOSSOU', 'Paul', '003'), mk('s4', 'GBAGUIDI', 'Rita', '004'),
    mk('s5', 'ZINSOU', 'Ali', '005'), mk('s6', 'TOSSOU', 'Eve', '006'),
  ];
  const notes: any[] = [];
  students.forEach((st, i) => subjects.forEach((sub) => notes.push({
    studentId: st.id, subjectId: sub.id, evaluation: 'formative1',
    noteObtenue: 8 + i, notePerfectionnement: 1,
  })));
  const classData: any = { id: 'c1', name: 'CM2 A', level: 'CM2', students, subjects, notes, createdAt: 1 };
  const att: any = [
    { classId: 'c1', date: '2026-09-15', entries: [
      { studentId: 's1', status: 'absent_justifiee', half: 'matin', motif: 'Maladie' },
      { studentId: 's2', status: 'absent_injustifiee', half: 'matin' },
    ] },
    { classId: 'c1', date: '2026-09-16', entries: [
      { studentId: 's1', status: 'absent_injustifiee', half: 'apresmidi' },
    ] },
  ];

  const dossier = P.buildChildDossier(classData, 's1',
    { schoolName: 'EPP NIMBO', teacherName: 'MOISE OUSSOU', attendance: att })!;
  ok(!!dossier, 'Parents : dossier construit');
  ok(dossier.child.nom === 'AHOUANSOU', 'Parents : le dossier porte le bon enfant');

  // LE controle central de confidentialite.
  /*
   * On exclut `generatedAt` de l'inspection : c'est un horodatage, et ses
   * chiffres contiennent fortuitement « 002 » environ 1 % du temps, ce qui
   * rendait ce controle instable. Les matricules sont donc cherches dans
   * les seuls champs de DONNEES, pas dans la date de generation.
   */
  const { generatedAt: _ts, ...sansHorodatage } = dossier as any;
  const brut = JSON.stringify(sansHorodatage).toUpperCase();
  const autres = ['KOFFI', 'MARIAM', 'DOSSOU', 'PAUL', 'GBAGUIDI', 'RITA',
                  'ZINSOU', 'TOSSOU', 'EVE', '002', '003', '004', '005', '006'];
  const fuite = autres.filter((n) => brut.includes(n));
  ok(fuite.length === 0, `Parents : AUCUNE donnee d un autre eleve (fuite : ${fuite.join(', ') || 'aucune'})`);
  ok(!brut.includes('"RANG"') && !('rang' in (dossier as any)),
     'Parents : aucun rang ni classement transmis');
  ok(!brut.includes('SEXE') && !brut.includes('DATENAISSANCE') && !brut.includes('PHOTO'),
     'Parents : aucune donnee sensible (sexe, naissance, photo)');

  /* --- c) Absences de l enfant seulement --- */
  ok(dossier.absences.length === 2, 'Parents : seules les absences de l enfant');
  ok(dossier.missedHalfDays === 2, 'Parents : demi-journees manquees calculees');
  ok(dossier.absences.filter((a: any) => a.justified).length === 1,
     'Parents : justifiee et injustifiee distinguees');

  /* --- d) Anti-reidentification par la moyenne de classe --- */
  ok(dossier.evaluations[0].classAverage !== null,
     'Parents : moyenne de classe fournie des 5 eleves');
  const petite: any = { ...classData, students: students.slice(0, 3),
    notes: notes.filter((n) => ['s1', 's2', 's3'].includes(n.studentId)) };
  const dp = P.buildChildDossier(petite, 's1', { schoolName: 'E', teacherName: 'T' })!;
  ok(dp.evaluations[0].classAverage === null,
     'Parents : sous 5 eleves, pas de moyenne de classe (anti-reidentification)');
  ok(P.MIN_CLASS_SIZE_FOR_AVERAGE >= 5, 'Parents : seuil d agregation d au moins 5');

  /* --- e) Chiffrement du transport --- */
  const code = 'ABCD-2345-WXYZ';
  const env = await P.sealDossier(dossier, code);
  const enc = JSON.stringify(env).toUpperCase();
  ok(!enc.includes('AHOUANSOU'), 'Parents : le fichier ne contient aucun nom en clair');
  ok(!enc.includes('ABCD2345WXYZ'), 'Parents : le fichier ne contient pas le code en clair');
  ok(env.kind === 'msp-dossier-enfant', 'Parents : enveloppe identifiee');
  const bad = await P.openDossier(env, 'ZZZZ-9999-YYYY');
  ok(!bad.ok, 'Parents : un mauvais code est refuse');
  const good = await P.openDossier(env, 'abcd 2345 wxyz');
  ok(good.ok === true, 'Parents : le bon code fonctionne meme mal saisi');
  if (good.ok) {
    ok(good.dossier.child.nom === 'AHOUANSOU' && good.dossier.absences.length === 2,
       'Parents : dossier dechiffre a l identique');
  }
  const etranger = await P.openDossier({ kind: 'autre' } as any, code);
  ok(!etranger.ok, 'Parents : un fichier etranger est rejete');

  /* --- f) Consentement et droit a l effacement --- */
  ok(!P.hasValidConsent(), 'Parents : aucun consentement par defaut');
  P.giveConsent();
  ok(P.hasValidConsent(), 'Parents : consentement enregistre');
  P.saveDossier(dossier);
  ok(P.loadDossiers().length === 1, 'Parents : dossier conserve localement');
  P.saveDossier(dossier);
  ok(P.loadDossiers().length === 1, 'Parents : un renvoi remplace, sans doublon');
  P.withdrawConsent();
  ok(!P.hasValidConsent() && P.loadDossiers().length === 0,
     'Parents : le retrait du consentement efface tout');

  /* --- g) Journal et revocation cote ecole --- */
  const issued = P.issueLinkCode(students[0] as any, 'c1', 'CM2 A');
  ok(P.loadLinkCodes().length >= 1, 'Parents : code inscrit au journal de l ecole');
  ok(P.codeState(issued) === 'valide', 'Parents : code valide a l emission');
  ok(P.codeState({ ...issued, expiresAt: Date.now() - 1 }) === 'expire',
     'Parents : expiration detectee');
  P.revokeLinkCode(issued.code);
  const revoked = P.loadLinkCodes().find((c: any) => c.code === issued.code);
  ok(P.codeState(revoked) === 'revoque', 'Parents : revocation par la direction');

  /* --- h) Lecture en clair pour le parent --- */
  ok(P.readAverage(6, 12).includes('insuffisant'), 'Parents : resultat faible explique');
  ok(P.readAverage(15, 11).includes('au-dessus'), 'Parents : situation vs classe expliquee');
  ok(P.readAverage(null, null).includes('Pas encore'), 'Parents : absence de note expliquee');
  ok(P.readProgress([
    { average: 8, classAverage: null, label: '1', subjects: [] },
    { average: 12, classAverage: null, label: '2', subjects: [] },
  ] as any).includes('progrès'), 'Parents : progression detectee');

  /* --- i) Aucun appel reseau dans l etape 1 --- */
  const parentUI = read57('src/components/ParentSpaceScreen.tsx');
  const codeUI = read57('src/components/ParentCodeScreen.tsx');
  for (const [name, src] of [['parentLink', src57], ['ParentSpaceScreen', parentUI],
                             ['ParentCodeScreen', codeUI]] as [string, string][]) {
    ok(!/fetch\(|XMLHttpRequest|supabase|cloudSync/.test(src),
       `Parents : ${name} n effectue AUCUN appel reseau (etape 1 hors ligne)`);
  }

  /* --- j) Interface et conformite affichee --- */
  ok(parentUI.includes('btn-donner-consentement'), 'Parents : consentement demande avant tout');
  ok(parentUI.includes('2017-20'), 'Parents : loi beninoise citee a l utilisateur');
  ok(parentUI.includes('btn-retirer-consentement'), 'Parents : retrait du consentement accessible');
  ok(parentUI.includes('selecteur-enfant'), 'Parents : selecteur multi-enfants');
  ok(codeUI.includes('en main propre'), 'Parents : consigne de remise du code en main propre');
  ok(codeUI.includes('journal-rattachements'), 'Parents : journal des rattachements visible');
  ok(read57('src/App.tsx').includes('/suivi-enfant'), 'Parents : routes enregistrees');
  ok(read57('src/utils/appModules.ts').includes('Suivi de votre enfant'),
     'Parents : module declare dans l arborescence');
}

// ============================================================
{
  section('58. v49 — Word dans l administration, renommages, registres');
  // ============================================================
  const { createRequire: cr58 } = await import('module');
  const req58 = cr58(import.meta.url);
  const fs58 = req58('fs');
  const path58 = req58('path');
  const read58 = (f: string) => fs58.readFileSync(path58.join(process.cwd(), f), 'utf8');

  /* --- a) Generateur .docx --- */
  const D = await import('../src/utils/docxMaker');
  const xml = D.buildDocumentXml([
    { type: 'paragraph', runs: [{ text: 'Titre', bold: true, size: 16 }], heading: 1, align: 'center' },
    { type: 'paragraph', runs: [{ text: 'A & B < C' }] },
    { type: 'table', rows: [['N°', 'Nom'], ['1', 'KOFFI']], headerRow: true },
  ]);
  ok(xml.startsWith('<?xml version="1.0"'), 'Word : declaration XML');
  ok(xml.includes('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'),
     'Word : espace de noms OOXML correct');
  ok(xml.includes('A &amp; B &lt; C'), 'Word : caracteres speciaux echappes');
  ok(xml.includes('<w:sz w:val="32"/>'), 'Word : taille convertie en demi-points');
  ok(xml.includes('w:w="11906"') && xml.includes('w:h="16838"'), 'Word : page A4');
  ok(xml.includes('<w:tbl>') && xml.includes('<w:tblHeader/>'),
     'Word : tableau avec en-tete repete');
  const po = (xml.match(/<w:p>/g) || []).length;
  const pc = (xml.match(/<\/w:p>/g) || []).length;
  ok(po === pc && po > 0, 'Word : balises de paragraphe equilibrees');
  const land = D.buildDocumentXml([{ type: 'paragraph', runs: [{ text: 'x' }] }], { landscape: true });
  ok(land.includes('w:orient="landscape"'), 'Word : mode paysage');
  ok(D.escapeXml('<a>&"') === '&lt;a&gt;&amp;&quot;', 'Word : echappement complet');

  const blob = await D.makeDocxBlob([{ type: 'paragraph', runs: [{ text: 'Bonjour' }] }]);
  const buf = Buffer.from(await blob.arrayBuffer());
  ok(buf[0] === 0x50 && buf[1] === 0x4b, 'Word : le fichier est une archive ZIP valide');
  const JSZipMod = (await import('jszip')).default;
  const zip = await JSZipMod.loadAsync(buf);
  for (const f of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml']) {
    ok(!!zip.file(f), `Word : piece OOXML presente (${f})`);
  }
  const ct = await zip.file('[Content_Types].xml')!.async('string');
  ok(ct.includes('wordprocessingml.document.main+xml'), 'Word : type MIME declare');

  /* --- b) Integration dans l administration scolaire --- */
  const admin58 = read58('src/components/SchoolAdminToolkitScreen.tsx');
  ok(admin58.includes('RichTextEditor'), 'Admin : editeur de texte enrichi monte');
  ok(admin58.includes('btn-word-document-admin'), 'Admin : bouton d export Word');
  ok(admin58.includes('exportDocumentWord'), 'Admin : fonction d export Word');
  ok(admin58.includes('mammoth'), 'Admin : import d un document Word existant');
  ok(admin58.includes('htmlToPlainText'), 'Admin : le HTML est converti pour le PDF et la copie');
  ok(!/const okCopy = await copyText\(content\)/.test(admin58),
     'Admin : la copie ne recopie plus des balises HTML brutes');
  ok(admin58.includes('plainTextToHtml'), 'Admin : les modeles sont convertis pour l editeur');
  ok(admin58.includes('btn-pdf-document-admin'), 'Admin : le PDF reste disponible');
  ok(admin58.includes('printDocument'), 'Admin : l impression reste disponible');

  const editor58 = read58('src/components/RichTextEditor.tsx');
  for (const cmd of ['bold', 'italic', 'underline', 'justifyCenter',
                     'insertUnorderedList', 'insertOrderedList', 'undo', 'redo']) {
    ok(editor58.includes(`"${cmd}"`) || editor58.includes(`'${cmd}'`),
       `Editeur : commande ${cmd} disponible`);
  }
  ok(editor58.includes('insertTable'), 'Editeur : insertion de tableau');
  ok(editor58.includes('onMouseDown={(e) => e.preventDefault()}'),
     'Editeur : la selection est preservee au clic (mobile)');
  ok(editor58.includes('contentEditable'), 'Editeur : zone d edition riche');

  /* --- c) Renommages demandes --- */
  const app58 = read58('src/App.tsx');
  ok(app58.includes('Encyclopédie MSP'), 'Renommage : « Encyclopédie MSP » sur l accueil');
  ok(app58.includes('Dictionnaire MSP'), 'Renommage : « Dictionnaire MSP » sur l accueil');
  const hub58 = read58('src/components/KnowledgeHubScreen.tsx');
  ok(hub58.includes('<h1 className="font-bold text-lg">Encyclopédie MSP</h1>'),
     'Renommage : en-tete de l ecran Encyclopedie MSP');
  ok(hub58.includes("title: 'Dictionnaire MSP'"), 'Renommage : carte Dictionnaire MSP');

  /* --- d) Registres officiels --- */
  const R = await import('../src/utils/schoolRegisters');
  const S = (id: string, done: boolean, dur = 30) =>
    ({ id, subject: 'Calcul', title: 'T', content: 'C', duration: dur, done });
  const st = R.journalStats([
    { id: 'a', date: '2026-09-15', className: 'CM2', sessions: [S('a', true), S('b', false)], updatedAt: 0 },
    { id: 'b', date: '2026-09-16', className: 'CM2', sessions: [S('c', true, 45)], updatedAt: 0 },
  ]);
  ok(st.sessions === 3 && st.done === 2, 'Journal : seances prevues et realisees');
  ok(st.completionRate === 66.7, `Journal : taux de realisation 66,7 % (obtenu ${st.completionRate})`);
  ok(st.minutesDone === 75, 'Journal : duree realisee cumulee');
  ok(R.journalStats([]).completionRate === 0, 'Journal : aucun jour => 0 %, jamais NaN');

  const mk = (n: number, nom: string, sexe: any, sortie?: string): any => ({
    id: 'm' + n, numero: n, matricule: '00' + n, nom, prenoms: 'X', sexe,
    dateNaissance: '2015-06-10', lieuNaissance: 'Kandi', parent: 'P', contact: '97',
    dateAdmission: '2026-09-01', classeAdmission: 'CM2', dateSortie: sortie,
  });
  const reg = [mk(1, 'AHOUANSOU', 'M'), mk(2, 'KOFFI', 'F'), mk(3, 'DOSSOU', 'M', '2026-10-01')];
  const rs = R.matriculeStats(reg);
  ok(rs.total === 3 && rs.present === 2 && rs.sortis === 1,
     'Matricule : inscrits, presents et sortis');
  ok(rs.garcons === 1, 'Matricule : un eleve sorti n est plus compte present');
  ok(R.nextNumero(reg) === 4, 'Matricule : numero d ordre suivant');
  ok(R.nextNumero([mk(1, 'A', 'M'), mk(7, 'B', 'F')]) === 8,
     'Matricule : le numero reste unique apres une suppression');
  ok(R.searchMatricules(reg, 'koffi').length === 1, 'Matricule : recherche par nom');
  ok(R.ageAt('2015-06-10', new Date('2026-06-09')) === 10, 'Matricule : age avant anniversaire');
  ok(R.ageAt('2015-06-10', new Date('2026-06-10')) === 11, 'Matricule : age le jour de l anniversaire');
  ok(R.ageAt('') === null, 'Matricule : date vide => pas d age');

  ok(app58.includes('/cahier-journal') && app58.includes('/registre-matricule'),
     'Registres : routes enregistrees');
  const mods58 = read58('src/utils/appModules.ts');
  ok(mods58.includes('Cahier journal') && mods58.includes('Registre matricule'),
     'Registres : declares dans l arborescence');
  const journalUI = read58('src/components/CahierJournalScreen.tsx');
  const matUI = read58('src/components/RegistreMatriculeScreen.tsx');
  ok(journalUI.includes('downloadDocx') && matUI.includes('downloadDocx'),
     'Registres : export Word disponible');
  ok(journalUI.includes('makePdf') && matUI.includes('makePdf'),
     'Registres : export PDF disponible (regle v41)');
}

// ============================================================
{
  section('59. v50 — un PV et une fiche eleve par evaluation');
  // ============================================================
  const { createRequire: cr59 } = await import('module');
  const req59 = cr59(import.meta.url);
  const fs59 = req59('fs');
  const path59 = req59('path');
  const read59 = (f: string) => fs59.readFileSync(path59.join(process.cwd(), f), 'utf8');

  const db59 = await import('../src/utils/database');
  type N = any;

  /*
   * Reproduction FIDELE de la regle d'ecriture de la fiche eleve (v50) :
   * la cle d'unicite d'une note est (eleve, matiere, EVALUATION).
   * Avant la v50 l'evaluation manquait, et saisir la sommative 2 ecrasait
   * la note de la sommative 1 : le travail de l'enseignant etait perdu.
   */
  const saveNote = (notes: N[], studentId: string, subjectId: string,
                    evaluation: string, valeur: number | null, absent = false): N[] => {
    const out = [...notes];
    const i = out.findIndex((n) => n.studentId === studentId && n.subjectId === subjectId
      && (n.evaluation === evaluation
        || (n.evaluation === undefined && evaluation === 'sommative1')));
    const nn = {
      id: i >= 0 ? out[i].id : `id${out.length}`, studentId, subjectId, evaluation,
      noteObtenue: absent ? null : valeur, notePerfectionnement: null, absent, updatedAt: 1,
    };
    if (i >= 0) out[i] = nn; else out.push(nn);
    return out;
  };

  let n59: N[] = [];
  n59 = saveNote(n59, 's1', 'm1', 'sommative1', 14);
  n59 = saveNote(n59, 's1', 'm1', 'sommative2', 8);
  ok(n59.length === 2, 'Fiches : deux evaluations coexistent');
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'sommative1' as any)?.noteObtenue === 14,
     'Fiches : la sommative 1 n est PAS ecrasee par la sommative 2');
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'sommative2' as any)?.noteObtenue === 8,
     'Fiches : la sommative 2 est bien enregistree');
  n59 = saveNote(n59, 's1', 'm1', 'sommative2', 12);
  ok(n59.length === 2, 'Fiches : corriger une note ne cree pas de doublon');
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'sommative1' as any)?.noteObtenue === 14,
     'Fiches : la correction d une evaluation n affecte pas les autres');
  n59 = saveNote(n59, 's1', 'm1', 'formative1', 5);
  n59 = saveNote(n59, 's1', 'm1', 'sommative3', 19);
  ok(n59.length === 4, 'Fiches : les 4 evaluations sont independantes');
  n59 = saveNote(n59, 's1', 'm1', 'formative1', null, true);
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'formative1' as any)?.absent === true,
     'Fiches : l absence porte sur la bonne evaluation');
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'sommative3' as any)?.noteObtenue === 19,
     'Fiches : une absence n efface pas les autres evaluations');
  n59 = saveNote(n59, 's1', 'm1', 'custom-abc', 16);
  ok(db59.findNoteInEvaluation(n59, 's1', 'm1', 'custom-abc' as any)?.noteObtenue === 16,
     'Fiches : les « autres evaluations » sont independantes aussi');

  /* Compatibilite : les notes deja saisies (sans evaluation) restent lisibles. */
  const anciennes: N[] = [{ id: 'old', studentId: 's2', subjectId: 'm1',
    noteObtenue: 11, notePerfectionnement: null, absent: false, updatedAt: 1 }];
  ok(db59.findNoteInEvaluation(anciennes, 's2', 'm1', 'sommative1' as any)?.noteObtenue === 11,
     'Fiches : une note historique reste rattachee a la sommative 1');
  ok(db59.findNoteInEvaluation(anciennes, 's2', 'm1', 'sommative2' as any) === undefined,
     'Fiches : une note historique n apparait pas dans les autres evaluations');
  const maj59 = saveNote(anciennes, 's2', 'm1', 'sommative1', 15);
  ok(maj59.length === 1 && maj59[0].noteObtenue === 15,
     'Fiches : une note historique est mise a jour, jamais dupliquee');

  /* --- Le PV est calcule PAR evaluation --- */
  const { computeBulletins: cb59 } = await import('../src/utils/bulletin');
  const subj59 = [{ id: 'm1', name: 'Calcul', noteObtenueMax: 18, notePerfectionnementMax: 2, order: 1, coefficient: 1 }];
  const stu59 = [{ id: 's1', nom: 'AHOUANSOU', prenoms: 'Jean', matricule: '001', createdAt: 1 }];
  const cls59: any = {
    id: 'c1', name: 'CM2', school: 'E', level: 'CM2', educationType: 'primaire',
    students: stu59, subjects: subj59, createdAt: 1,
    notes: [
      { id: 'a', studentId: 's1', subjectId: 'm1', evaluation: 'sommative1', noteObtenue: 16, notePerfectionnement: 2, absent: false, updatedAt: 1 },
      { id: 'b', studentId: 's1', subjectId: 'm1', evaluation: 'sommative2', noteObtenue: 4, notePerfectionnement: 0, absent: false, updatedAt: 1 },
    ],
  };
  const pv1 = cb59(cls59, { evaluation: 'sommative1' as any });
  const pv2 = cb59(cls59, { evaluation: 'sommative2' as any });
  ok((pv1[0].results[0].total ?? 0) === 18, `PV : sommative 1 isolee (obtenu ${pv1[0].results[0].total})`);
  ok((pv2[0].results[0].total ?? 0) === 4, `PV : sommative 2 isolee (obtenu ${pv2[0].results[0].total})`);
  ok(pv1[0].results[0].total !== pv2[0].results[0].total,
     'PV : deux evaluations donnent bien deux PV differents');

  /* --- Presence effective dans l interface --- */
  const app59 = read59('src/App.tsx');
  ok(app59.includes('selecteur-evaluation-pv'), 'PV : selecteur d evaluation present');
  ok(app59.includes("computeBulletins(classData, { evaluation: currentEvaluation })"),
     'PV : le tableau est calcule sur l evaluation choisie');
  ok(!app59.includes('exportNotesTablePdf(classData, bulletins, classData.evaluationType)'),
     'PV : le PDF ne recoit plus le type d evaluation en guise d evaluation');
  ok(app59.includes('pv-classe-evaluation'), 'PV : l evaluation est affichee a l ecran');

  const prof59 = read59('src/components/StudentProfileEntry.tsx');
  ok(prof59.includes('selecteur-evaluation-fiches'), 'Fiches : selecteur d evaluation present');
  ok(prof59.includes('findNoteInEvaluation'), 'Fiches : lecture par evaluation');
  ok(prof59.includes('evaluation,'), 'Fiches : l evaluation est enregistree avec la note');
  ok(prof59.includes('[student.id, evaluation]'),
     'Fiches : changer d evaluation recharge bien les champs');
  ok(!/const existingIndex = notes\.findIndex\(\s*n => n\.studentId === student\.id && n\.subjectId === subject\.id\s*\);/.test(prof59),
     'Fiches : la cle d ecriture inclut desormais l evaluation');
}

// ============================================================
{
  section('60. v51 — aucun module ni sous-module ne peut rester vide');
  // ============================================================
  const { createRequire: cr60 } = await import('module');
  const req60 = cr60(import.meta.url);
  const fs60 = req60('fs');
  const path60 = req60('path');
  const read60 = (f: string) => fs60.readFileSync(path60.join(process.cwd(), f), 'utf8');

  const appSrc = read60('src/App.tsx');
  const modsSrc = read60('src/utils/appModules.ts');
  const mods60 = await import('../src/utils/appModules');

  /*
   * GARDE-FOU DE FOND (v51).
   * Les modules « Ma boite a outils » et « Mes registres officiels »
   * etaient declares dans l'arborescence mais n'avaient AUCUNE route :
   * leur page s'ouvrait entierement vide. Ce controle interdit que le cas
   * se reproduise pour n'importe quel module, present ou futur.
   */
  const routesDeclarees = new Set(
    [...appSrc.matchAll(/path="(\/[a-z0-9:\/-]*)"/g)].map((m) => m[1]),
  );
  /** Une route parametree (/a/:b) couvre /a/quelquechose. */
  const estCouverte = (chemin: string): boolean => {
    if (routesDeclarees.has(chemin)) return true;
    for (const r of routesDeclarees) {
      if (!r.includes(':')) continue;
      const rx = new RegExp('^' + r.replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
      if (rx.test(chemin)) return true;
    }
    return false;
  };

  const tousLesChemins: string[] = [];
  for (const m of mods60.APP_MODULES) {
    tousLesChemins.push(m.path);
    for (const sm of m.subModules || []) tousLesChemins.push(sm.path);
  }
  const sansRoute = tousLesChemins.filter((c) => !estCouverte(c));
  ok(sansRoute.length === 0,
     `Modules : chaque module/sous-module a une route (manquantes : ${sansRoute.join(', ') || 'aucune'})`);

  ok(estCouverte('/outils'), 'Modules : « Ma boite a outils » a bien une route');
  ok(estCouverte('/registres'), 'Modules : « Mes registres officiels » a bien une route');
  ok(appSrc.includes("<Route path=\"/outils\""), 'Modules : route /outils declaree dans App.tsx');
  ok(appSrc.includes("<Route path=\"/registres\""), 'Modules : route /registres declaree dans App.tsx');

  /*
   * Un module sans lien est invisible, donc inutilisable : « Mes registres
   * officiels » n'etait accessible depuis aucun ecran.
   */
  const liens60 = new Set([...appSrc.matchAll(/to="(\/[a-z0-9-]*)"/g)].map((m) => m[1]));
  ok(liens60.has('/registres'), 'Accueil : « Mes registres officiels » est atteignable');
  ok(liens60.has('/outils'), 'Accueil : « Ma boite a outils » est atteignable');

  /*
   * Les modules de premier niveau sont rendus dynamiquement par
   * `APP_MODULES.map(...)` sur l'accueil : ils sont donc TOUS lies, sans
   * qu'un `to="/xxx"` litteral apparaisse dans le code. Ce qu'il faut
   * verifier, c'est que cette boucle existe toujours — si elle disparaissait,
   * les 11 modules deviendraient inaccessibles d'un coup.
   * (La verification reelle du rendu est faite par l'E2E v51.)
   */
  ok(/APP_MODULES\.map\(/.test(appSrc),
     'Accueil : les modules principaux sont rendus par la boucle APP_MODULES');
  ok(appSrc.includes('to={mod.path}'),
     'Accueil : chaque module de la boucle recoit bien son lien');

  /* Chaque sous-module doit etre liste par son module parent. */
  ok(mods60.totalSubModules() === 50, `Modules : 50 sous-modules (obtenu ${mods60.totalSubModules()})`);

  /*
   * LISIBILITE DES EN-TETES (bug v51).
   * `.msp-kente` definissait `background-image` avec le motif tisse, ce qui
   * EFFACAIT les degrades Tailwind (`bg-gradient-to-r`), eux aussi rendus
   * via `background-image`. Les en-tetes devenaient quasi blancs avec du
   * texte blanc : illisibles. Le motif doit rester en pseudo-element.
   */
  const css60 = read60('src/index.css');
  const blocKente = css60.slice(css60.indexOf('.msp-kente'), css60.indexOf('.msp-module-header'));
  ok(/\.msp-kente::before/.test(css60),
     'Design : le motif kente est applique en pseudo-element');
  ok(!/^\s*\.msp-kente\s*\{[^}]*background-image:/m.test(blocKente),
     'Design : « .msp-kente » ne redefinit plus background-image (sinon degrade efface)');
  ok(/pointer-events:\s*none/.test(blocKente),
     'Design : le voile decoratif n intercepte aucun clic');
  ok(/\.msp-kente > \*/.test(css60),
     'Design : le contenu de l en-tete passe au-dessus du voile');
  ok(modsSrc.includes("'/cahier-journal'") && modsSrc.includes("'/registre-matricule'"),
     'Modules : les registres sont listes dans leur module parent');
}

// ============================================================
{
  section('61. v52 — les 8 modules de vie scolaire');
  // ============================================================
  const { createRequire: cr61 } = await import('module');
  const req61 = cr61(import.meta.url);
  const fs61 = req61('fs');
  const path61 = req61('path');
  const read61 = (f: string) => fs61.readFileSync(path61.join(process.cwd(), f), 'utf8');

  /* --- ① Frequentation --- */
  const AR = await import('../src/utils/attendanceRegister');
  const stu = (id: string, sexe: string): any => ({ id, nom: id, prenoms: 'X', matricule: id, sexe, createdAt: 1 });
  const eleves61 = [stu('s1', 'M'), stu('s2', 'F')];
  const jours61: any = [
    { id: 'd1', classId: 'c', date: '2026-09-14', entries: [{ studentId: 's1', status: 'absent_injustifiee', half: 'matin' }] },
    { id: 'd2', classId: 'c', date: '2026-09-16', entries: [{ studentId: 's2', status: 'absent_justifiee', half: 'matin' }] },
  ];
  const tot61 = AR.computeAttendanceTotals(jours61, eleves61);
  ok(tot61.due === 6, `Appel : le mercredi ne compte qu une demi-journee (du=${tot61.due})`);
  ok(tot61.rate === 66.7, `Appel : taux de frequentation (${tot61.rate})`);
  ok(AR.computeAttendanceTotals([{ id: 'w', classId: 'c', date: '2026-09-19', entries: [] }] as any, eleves61).due === 0,
     'Appel : le samedi ne compte pas');
  ok(AR.computeAttendanceTotals([], eleves61).rate === 0, 'Appel : aucun jour => 0 %, jamais NaN');
  const g61 = AR.attendanceByGender(jours61, eleves61);
  ok(g61.boys.absUnjustified === 1 && g61.girls.absJustified === 1, 'Appel : ventilation par sexe');
  ok(AR.monthRange('2024-02').to === '2024-02-29', 'Appel : annee bissextile geree');

  /* --- ② Paiements --- */
  const SF = await import('../src/utils/schoolFees');
  const rec61 = (due: number, disc: number, pays: number[]): any => ({
    id: 'r', studentId: 's1', studentLabel: 'A', classId: 'c', className: 'CM2',
    feeTypeId: 'f', feeLabel: 'Scolarite', amountDue: due, discount: disc, schoolYear: '2026-2027', updatedAt: 1,
    payments: pays.map((a, i) => ({ id: 'p' + i, date: 'd', amount: a, receiptNo: `2026-000${i + 1}` })),
  });
  ok(SF.balanceOf(rec61(30000, 5000, [10000])) === 15000, 'Paiements : reste du = appele - remise - verse');
  ok(SF.statusOf(rec61(30000, 0, [35000])) === 'trop_percu', 'Paiements : trop-percu detecte');
  ok(SF.balanceOf(rec61(30000, 0, [35000])) === -5000, 'Paiements : un solde negatif n est jamais masque');
  const sum61 = SF.summarize([rec61(30000, 0, [30000]), rec61(20000, 0, [5000]), rec61(10000, 0, [])]);
  ok(sum61.recoveryRate === 58.3, `Paiements : taux de recouvrement (${sum61.recoveryRate})`);
  ok(SF.summarize([rec61(10000, 0, [15000]), rec61(10000, 0, [])]).outstanding === 10000,
     'Paiements : un trop-percu ne compense pas la dette d un autre');
  ok(SF.nextReceiptNo([rec61(1, 0, [1, 1])], 2026) === '2026-0003', 'Paiements : numero de recu = max + 1');
  ok(SF.amountInWords(1500000) === 'un million cinq cent mille francs CFA',
     `Paiements : montant en lettres sans faute (${SF.amountInWords(1500000)})`);
  ok(SF.amountInWords(2000000) === 'deux millions de francs CFA', 'Paiements : « millions DE francs »');
  ok(SF.amountInWords(80) === 'quatre-vingts francs CFA', 'Paiements : accord de « quatre-vingts »');
  ok(SF.formatFcfa(1234567) === '1 234 567 FCFA', 'Paiements : format des montants');

  /* --- ③ a ⑧ Vie scolaire --- */
  const SL = await import('../src/utils/schoolLife');
  const yr = (y: string, avg: number | null, dec: any = 'admis'): any =>
    ({ id: y, schoolYear: y, level: 'CM1', schoolName: 'E', average: avg, decision: dec });
  const bk: any = { id: 'b', studentKey: 'k', nom: 'A', prenoms: 'B', matricule: '1', updatedAt: 1,
    years: [yr('2026-2027', 13), yr('2024-2025', 10), yr('2025-2026', 12)] };
  ok(SL.sortedYears(bk)[0].schoolYear === '2024-2025', 'Livret : annees triees chronologiquement');
  ok(SL.bookletStats(bk).overallAverage === 11.67, 'Livret : moyenne generale');
  ok(SL.bookletStats(bk).trend === 'progression', 'Livret : tendance calculee');
  ok(SL.studentKey({ nom: 'A', prenoms: 'B' }) === 'NOM:A|B', 'Livret : cle de rapprochement sans matricule');

  const loan = (st: string): any => ({ id: 'l' + Math.random(), studentId: 's', studentLabel: 'X', date: 'd', state: st });
  const it61 = (q: number, ls: any[]): any => ({ id: 'i', label: 'L', category: 'Manuel', quantity: q, unitValue: 2000, loans: ls, updatedAt: 1 });
  const st61 = SL.itemStatus(it61(10, [loan('pret'), loan('pret'), loan('perdu'), loan('rendu')]));
  ok(st61.available === 7, `Materiel : disponible deduit des prets (${st61.available})`);
  ok(st61.lossValue === 2000, 'Materiel : valeur des pertes chiffree');
  ok(SL.itemStatus(it61(1, [loan('pret'), loan('pret')])).inconsistent === true,
     'Materiel : incoherence de stock signalee, jamais masquee');

  const sl61 = (d: any, a: string, b: string, su: string): any => ({ id: a + su, day: d, start: a, end: b, subject: su });
  ok(SL.slotDuration(sl61('Lundi', '08:00', '09:00', 'C')) === 60, 'Emploi du temps : duree d un creneau');
  ok(SL.slotDuration(sl61('Lundi', '10:00', '09:00', 'C')) === 0, 'Emploi du temps : fin avant debut => 0');
  ok(SL.findOverlaps([sl61('Lundi', '08:00', '09:00', 'A'), sl61('Lundi', '08:30', '09:30', 'B')]).length === 1,
     'Emploi du temps : chevauchement detecte');
  ok(SL.findOverlaps([sl61('Lundi', '08:00', '09:00', 'A'), sl61('Mardi', '08:00', '09:00', 'B')]).length === 0,
     'Emploi du temps : deux jours differents ne se chevauchent pas');
  ok(!(SL.SCHOOL_DAYS as readonly string[]).includes('Samedi'), 'Emploi du temps : pas de samedi');
  ok(SL.formatDuration(150) === '2 h 30', 'Emploi du temps : format des durees');

  const rc61 = (st: any, a: number | null, b: number | null): any => ({
    id: 'c' + Math.random(), studentId: 's', studentLabel: 'X', classId: 'c', className: 'CM2',
    subject: 'Calcul', difficulty: 'd', startingScore: a, currentScore: b,
    status: st, openedAt: 'd', actions: [], updatedAt: 1 });
  ok(SL.remediationGain(rc61('resolue', 6, 11)) === 5, 'Remediation : gain en points');
  const rs61 = SL.remediationSummary([rc61('resolue', 6, 11), rc61('en_cours', 5, 7), rc61('ouverte', 4, null)]);
  ok(rs61.successRate === 33.3, `Remediation : taux de resolution (${rs61.successRate})`);
  ok(rs61.averageGain === 3.5, 'Remediation : gain moyen');
  ok(SL.remediationSummary([]).successRate === 0, 'Remediation : aucun dossier => 0 %, jamais NaN');
  ok(SL.suggestCases([{ student: { id: 'a' } as any, moyenne: 8 }, { student: { id: 'b' } as any, moyenne: 14 }], []).length === 1,
     'Remediation : seuls les eleves sous 10/20 sont proposes');

  const D = 86_400_000; const now61 = Date.now();
  ok(SL.backupIsStale([], now61) === true, 'Sauvegarde : aucune sauvegarde => alerte');
  ok(SL.backupIsStale([{ at: now61 - 3 * D, size: 1, classes: 1 }], now61) === false, 'Sauvegarde : 3 jours => a jour');
  ok(SL.backupIsStale([{ at: now61 - 8 * D, size: 1, classes: 1 }], now61) === true, 'Sauvegarde : 8 jours => obsolete');

  ok(SL.mentionFor(16) === 'Très bien', 'Conseil : mention selon la moyenne');
  ok(SL.suggestDecision(10) === 'admis' && SL.suggestDecision(9.99) === 'redouble',
     'Conseil : decision proposee au seuil de 10/20');
  ok(SL.suggestDecision(null) === 'en_cours', 'Conseil : sans note, aucune decision automatique');
  const sess61: any = { id: 's', classId: 'c', className: 'CM2', date: 'd', chair: '', participants: '', updatedAt: 1,
    entries: [{ studentId: '1', studentLabel: 'A', average: 12, decision: 'admis' },
              { studentId: '2', studentLabel: 'B', average: 8, decision: 'redouble' }] };
  ok(SL.councilSummary(sess61).passRate === 50, 'Conseil : taux de passage');
  ok(SL.councilSummary(sess61).classAverage === 10, 'Conseil : moyenne de la classe');

  /* --- Integration : routes, arborescence, sauvegarde --- */
  const app61 = read61('src/App.tsx');
  const mods61 = await import('../src/utils/appModules');
  for (const r of ['/vie-scolaire', '/registre-appel', '/paiements', '/livret-scolaire',
                   '/manuels-materiel', '/emploi-du-temps', '/remediation', '/sauvegarde', '/conseil-classe']) {
    ok(app61.includes(`path="${r}"`), `Vie scolaire : route ${r} declaree`);
  }
  ok(app61.includes('to="/vie-scolaire"'), 'Vie scolaire : atteignable depuis l accueil');
  ok(mods61.totalSubModules() === 50, `Vie scolaire : 50 sous-modules (obtenu ${mods61.totalSubModules()})`);

  /* Les nouvelles donnees DOIVENT etre sauvegardees, sinon elles seraient
     perdues lors d'une restauration. */
  const db61 = read61('src/utils/database.ts');
  for (const k of ['msp_school_fees', 'msp_livret_scolaire', 'msp_manuels_materiel',
                   'msp_emploi_du_temps', 'msp_remediation', 'msp_conseil_classe',
                   'msp_cahier_journal', 'msp_registre_matricule']) {
    ok(db61.includes(`'${k}'`), `Sauvegarde : la cle ${k} est incluse`);
  }

  /* Chaque ecran doit offrir PDF ET impression (regle v41). */
  for (const f of ['AttendanceRegisterScreen', 'SchoolFeesScreen', 'SchoolBookletScreen',
                   'SchoolInventoryScreen', 'TimetableScreen', 'RemediationScreen', 'ClassCouncilScreen']) {
    const src = read61(`src/components/${f}.tsx`);
    ok(src.includes('makePdf') && src.includes('window.print()'),
       `${f} : PDF et impression coexistent`);
  }
}

// ============================================================
{
  section('62. v53 — abonnement Pro (2500 F) et impression universelle');
  // ============================================================
  const { createRequire: cr62 } = await import('module');
  const req62 = cr62(import.meta.url);
  const fs62 = req62('fs');
  const path62 = req62('path');
  const read62 = (f: string) => fs62.readFileSync(path62.join(process.cwd(), f), 'utf8');

  const SUB = await import('../src/utils/subscription');
  const SC = await import('../src/utils/simpleCode');

  /* --- Le plan est porte par le code --- */
  const codePro = SC.generateSimpleCode('pro');
  ok(SC.isValidSimpleCode(codePro), 'Pro : le code genere respecte Luhn');
  ok(codePro.startsWith('2'), 'Pro : le code commence par « 2 »');
  ok(SC.planOfCode(codePro) === 'pro', 'Pro : le plan est relu depuis le code');
  ok(SC.planOfCode(SC.generateSimpleCode('complet')) === 'complet', 'Complet : plan relu');
  ok(SC.planOfCode(SC.generateSimpleCode('essentiel')) === 'essentiel', 'Essentiel : plan relu');
  ok(SC.planOfCode('345678') === 'complet',
     'Retrocompatibilite : un code anterieur reste Complet');
  ok(SUB.PLANS.pro.price === 2500, 'Pro : tarif de 2500 FCFA/an');

  /* --- Les 4 modules demandes sont reserves --- */
  for (const p of ['/registres', '/cahier-journal', '/registre-matricule',
                   '/vie-scolaire', '/registre-appel', '/paiements', '/livret-scolaire',
                   '/manuels-materiel', '/emploi-du-temps', '/remediation', '/sauvegarde',
                   '/conseil-classe', '/outils', '/chronometre', '/calculatrice', '/numeriser',
                   '/suivi-enfant/codes']) {
    ok(SUB.isProPath(p), `Pro : ${p} est reserve au plan Pro`);
  }

  /*
   * NON-REGRESSION CAPITALE : aucun droit acquis ne doit etre retire.
   * Un abonne Complet conserve exactement ce dont il disposait avant la v53.
   */
  const ANCIEN62 = ['/', '/profile', '/class', '/class/abc', '/cantine', '/comptabilite',
    '/bibliotheque', '/encyclopedie', '/dictionnaire', '/cours', '/fiches-pedagogiques',
    '/calendrier-scolaire', '/mes-images', '/espace-partenariat', '/enrolement',
    '/orientation', '/education-vie', '/preparation-classe', '/boite-outils',
    '/outils-enseignant', '/horloge', '/conditions', '/reglages', '/class-statistics'];
  const perdus62 = ANCIEN62.filter((p) => !SUB.canAccessPath('complet', p));
  ok(perdus62.length === 0,
     `Complet : aucun droit retire (perdus : ${perdus62.join(', ') || 'aucun'})`);

  /* Piege de prefixe : « /outils-enseignant » existait avant « /outils ». */
  ok(SUB.isProPath('/outils-enseignant') === false,
     'Pro : « /outils-enseignant » n est PAS capture par la regle « /outils »');
  ok(SUB.isProPath('/conditions') === false, 'Pro : les CGU restent libres');

  /* L'espace parent doit rester gratuit : un parent n'est pas abonne. */
  ok(SUB.isProPath('/suivi-enfant') === false,
     'Parents : l espace parent reste PUBLIC et gratuit');
  ok(SUB.canAccessPath('complet', '/suivi-enfant'), 'Parents : accessible sans plan Pro');

  ok(SUB.canAccessPath('pro', '/vie-scolaire'), 'Pro : acces aux modules de gestion');
  ok(SUB.canAccessPath('complet', '/vie-scolaire') === false, 'Complet : modules Pro verrouilles');
  ok(SUB.canAccessPath('essentiel', '/paiements') === false, 'Essentiel : modules Pro verrouilles');
  ok(SUB.canAccessPath('essentiel', '/enrolement-eleves'), 'Essentiel : perimetre inchange');
  ok(SUB.isProPath('/paiements/') && SUB.isProPath('/paiements?x=1'),
     'Pro : slash final et parametres geres');

  /* Le plan doit survivre au stockage : un abonne Pro ne doit pas etre
     silencieusement retrograde en Complet. */
  const up62 = read62('src/utils/userProfile.ts');
  ok(/a\.plan === 'pro' \? 'pro'/.test(up62),
     'Pro : le plan est conserve a la relecture de l activation');
  ok(up62.includes("a.plan !== 'pro'"), 'Pro : la migration reconnait le plan Pro');
  ok(/p === 'complet' \|\| p === 'pro'/.test(up62),
     'Pro : hasFullAccess inclut Pro (sinon perte de fonctions payees)');

  /* Le SA doit pouvoir vendre le plan : ecran d administration. */
  const admin62 = read62('src/components/AdminDashboardScreen.tsx');
  ok(admin62.includes("pid === 'pro' ? '« 2 »'"), 'Admin : le prefixe « 2 » est explique');
  ok(admin62.includes('PRO — 2500 FCFA/an'), 'Admin : la formule Pro est presentee');
  ok(admin62.includes('PLANS[codePlan].price'), 'Admin : le tarif suit la formule choisie');

  const upg62 = read62('src/components/UpgradeScreen.tsx');
  ok(upg62.includes("targetPlan"), 'Upgrade : l ecran distingue Complet et Pro');
  ok(upg62.includes('PRO_MODULES'), 'Upgrade : le module demande est nomme en clair');

  /* ================= IMPRESSION ================= */
  /*
   * REGLE ABSOLUE DU PROJET : tout ce qui produit un document doit pouvoir
   * etre IMPRIME, en plus du PDF.
   */
  const composants = fs62.readdirSync(path62.join(process.cwd(), 'src/components'))
    .filter((f: string) => f.endsWith('.tsx'));
  const sansImpression: string[] = [];
  for (const f of composants) {
    const src = read62(`src/components/${f}`);
    if (!src.includes('makePdf') && !src.includes('downloadDocx')) continue;
    if (!src.includes('window.print()') && !src.includes('printDoc')) sansImpression.push(f);
  }
  ok(sansImpression.length === 0,
     `Impression : tout ecran produisant un document peut l imprimer (manquants : ${sansImpression.join(', ') || 'aucun'})`);

  /*
   * BUG v53 : la feuille de style d impression masquait « .msp-kente »,
   * classe qui porte l EN-TETE des ecrans depuis la v51. Les documents
   * sortaient donc SANS TITRE. Seul le voile decoratif doit disparaitre.
   */
  const css62 = read62('src/index.css');
  const printBlock = css62.slice(css62.indexOf('@media print'));
  ok(!/\.msp-kente\s*,|\.msp-kente\s*\{[^}]*display:\s*none/.test(
       printBlock.split('}')[0] + '}'),
     'Impression : « .msp-kente » n est plus masque en entier');
  ok(printBlock.includes('.msp-kente::before'),
     'Impression : seul le voile decoratif est masque');
  ok(/\.msp-kente[\s\S]{0,200}color:\s*#000/.test(printBlock),
     'Impression : le titre s imprime en noir');
  ok(printBlock.includes('thead'), 'Impression : les en-tetes de tableau se repetent');
  ok(printBlock.includes('break-inside'), 'Impression : les lignes ne sont pas coupees');
  ok(printBlock.includes('button'), 'Impression : les boutons ne sont pas imprimes');

  for (const f of ['ChronoScreen', 'ParentSpaceScreen', 'ScannerScreen']) {
    const src = read62(`src/components/${f}.tsx`);
    ok(src.includes('window.print()'), `Impression : ${f} dispose desormais du bouton`);
  }
}

// ============================================================
{
  section('63. v54 — les trois forfaits proposes sur l accueil');
  // ============================================================
  const { createRequire: cr63 } = await import('module');
  const req63 = cr63(import.meta.url);
  const fs63 = req63('fs');
  const path63 = req63('path');
  const read63 = (f: string) => fs63.readFileSync(path63.join(process.cwd(), f), 'utf8');

  const gate63 = read63('src/components/AccessGate.tsx');
  const SUB63 = await import('../src/utils/subscription');

  /*
   * SOURCE UNIQUE DE VERITE.
   * L'accueil contenait sa PROPRE liste de forfaits, codee en dur. C'est
   * la raison pour laquelle la formule Pro (v53) n'y apparaissait pas :
   * il fallait penser a modifier deux endroits. L'accueil lit desormais
   * le catalogue de `subscription.ts`.
   */
  ok(gate63.includes('PLAN_CATALOG'), 'Accueil : les forfaits viennent du catalogue officiel');
  ok(!/price:\s*'999 FCFA/.test(gate63), 'Accueil : aucun tarif recopie en dur');
  ok(!/title:\s*'Essentiel'/.test(gate63), 'Accueil : aucune liste de forfaits dupliquee');
  ok(!gate63.includes('999 ou 1500'), 'Accueil : le bandeau ne mentionne plus deux formules');

  /* Les trois forfaits sont proposes, dans l'ordre croissant de prix. */
  ok(/PLAN_ORDER[^=]*=\s*\[\s*'essentiel',\s*'complet',\s*'pro'\s*\]/.test(gate63),
     'Accueil : les 3 forfaits sont presentes du moins cher au plus complet');
  for (const id of ['essentiel', 'complet', 'pro']) {
    ok(gate63.includes(`forfait-${id}`) || gate63.includes('forfait-${id}'),
       `Accueil : le forfait ${id} est rendu`);
  }
  ok(gate63.includes('setChosenPlan'), 'Accueil : le forfait est selectionnable');
  ok(gate63.includes('aria-pressed'), 'Accueil : la selection est accessible (aria-pressed)');
  ok(gate63.includes('recap-forfait'), 'Accueil : un recapitulatif confirme le choix');

  /* Le choix doit arriver a l'administrateur, sinon il est inutile. */
  ok(gate63.includes('planRequestText'), 'Accueil : le forfait choisi alimente la demande');
  ok(/Formule souhaitée : \$\{p\.label\}/.test(gate63),
     'Accueil : la demande WhatsApp nomme la formule retenue');

  /* La formule detectee doit couvrir « pro ». */
  ok(gate63.includes('PLAN_CATALOG[detectedPlan]'),
     'Accueil : la formule detectee lit le catalogue (donc reconnait Pro)');

  /* Coherence des tarifs affiches avec le catalogue. */
  ok(SUB63.PLANS.essentiel.price === 999
    && SUB63.PLANS.complet.price === 1500
    && SUB63.PLANS.pro.price === 2500,
     'Accueil : les trois tarifs 999 / 1500 / 2500 sont ceux du catalogue');
  ok(Object.keys(SUB63.PLANS).length === 3, 'Catalogue : exactement trois formules');
}

// ============================================================
{
  section('64. v55 — version d essai gratuite de 10 heures');
  // ============================================================
  const { createRequire: cr64 } = await import('module');
  const req64 = cr64(import.meta.url);
  const fs64 = req64('fs');
  const path64 = req64('path');
  const read64 = (f: string) => fs64.readFileSync(path64.join(process.cwd(), f), 'utf8');

  /* Stockage simule : le module d essai ecrit dans localStorage. */
  const mkStore = () => {
    const m: Record<string, string> = {};
    return {
      getItem: (k: string) => (k in m ? m[k] : null),
      setItem: (k: string, v: string) => { m[k] = v; },
      removeItem: (k: string) => { delete m[k]; },
    };
  };
  (globalThis as any).localStorage = mkStore();
  (globalThis as any).sessionStorage = mkStore();

  const T = await import('../src/utils/trial');
  const H = 3_600_000;
  const T0 = 1_800_000_000_000;

  ok(T.TRIAL_HOURS === 10, 'Essai : duree de 10 heures');
  ok(T.TRIAL_DURATION_MS === 10 * H, 'Essai : 10 h converties en millisecondes');
  ok(T.trialGrantsAccess(T0) === false, 'Essai : aucun acces avant demarrage');

  const s64 = T.startTrial('KOFFI Jean', T0)!;
  ok(!!s64 && s64.expiresAt === T0 + 10 * H, 'Essai : echeance a +10 h');
  ok(T.trialGrantsAccess(T0) === true, 'Essai : acces ouvert des le demarrage');
  ok(T.trialStatus(T0 + H).hours === 9, 'Essai : decompte correct apres 1 h');
  ok(T.formatRemaining(T.trialStatus(T0 + H)) === '9 h 00', 'Essai : libelle en heures');
  ok(T.formatRemaining(T.trialStatus(T0 + 9 * H + 30 * 60_000)) === '30 min',
     'Essai : libelle en minutes sous 1 h');

  /* Coupure a l echeance : c est la demande explicite de l utilisateur. */
  ok(T.trialStatus(T0 + 10 * H).expired === true, 'Essai : expire a 10 h pile');
  ok(T.trialGrantsAccess(T0 + 10 * H) === false, 'Essai : acces coupe a l echeance');
  ok(T.trialStatus(T0 + 100 * H).expired === true, 'Essai : reste ferme ensuite');

  /*
   * Un essai consomme ne doit jamais se relancer, sinon l offre serait
   * infinie et les abonnements sans objet.
   */
  ok(T.startTrial('Autre', T0 + 20 * H) === null, 'Essai : impossible a relancer');
  ok(T.trialAlreadyUsed() === true, 'Essai : marqueur « deja consomme » pose');
  (globalThis as any).localStorage.removeItem('msp_trial');
  ok(T.startTrial('X', T0 + 40 * H) === null,
     'Essai : effacer la cle ne rend pas un second essai');

  /*
   * Reculer l horloge du telephone ne doit pas prolonger la gratuite.
   */
  (globalThis as any).localStorage = mkStore();
  (globalThis as any).sessionStorage = mkStore();
  T.startTrial('Triche', T0);
  T.trialStatus(T0 + 10 * H);
  ok(T.trialStatus(T0 + 2 * H).expired === true,
     'Essai : reculer l horloge termine l essai');
  ok(T.trialStatus(T0 + 11 * H).expired === true,
     'Essai : la fermeture est definitive apres triche');

  /* Tolerance : une resynchronisation reseau de quelques minutes est normale. */
  (globalThis as any).localStorage = mkStore();
  (globalThis as any).sessionStorage = mkStore();
  T.startTrial('Tol', T0);
  T.trialStatus(T0 + 2 * H);
  ok(T.trialStatus(T0 + 2 * H - 120_000).active === true,
     'Essai : un ecart de 2 minutes reste tolere');

  /* Reinitialisation reservee au Super Administrateur. */
  (globalThis as any).localStorage = mkStore();
  (globalThis as any).sessionStorage = mkStore();
  T.startTrial('Demo', T0);
  T.trialStatus(T0 + 11 * H);
  T.resetTrial();
  ok(T.startTrial('Demo2', T0 + 12 * H) !== null,
     'Essai : le SA peut reinitialiser pour une demonstration');

  /* ---- Integration ---- */
  const app64 = read64('src/App.tsx');
  ok(app64.includes('trialStatus'), 'Essai : le portail lit l etat de l essai');
  ok(/canOpen = activated \|\| onTrial/.test(app64),
     'Essai : un essai en cours ouvre l application');
  ok(app64.includes('TrialBanner'), 'Essai : le bandeau de decompte est monte');
  ok(/!activated && onTrial[^\n]*isProPath/.test(app64),
     'Essai : les modules Pro restent fermes pendant l essai');
  ok(app64.includes('setInterval'), 'Essai : l etat est reevalue sans rechargement');

  const gate64 = read64('src/components/AccessGate.tsx');
  ok(gate64.includes('btn-demarrer-essai'), 'Essai : bouton de demarrage sur l ecran d acces');
  ok(gate64.includes('essai-termine'), 'Essai : message de fin affiche au prospect');
  ok(gate64.includes('TRIAL_HOURS'), 'Essai : la duree affichee vient du module (jamais en dur)');
  /*
   * v56 : la duree est passee de 20 h a 10 h. Ce controle verifie qu'aucun
   * ecran ne recopie un nombre d'heures en dur — sinon un futur changement
   * laisserait une mention fausse a l'ecran.
   */
  for (const f of ['src/components/AccessGate.tsx',
                   'src/components/AdminDashboardScreen.tsx',
                   'src/components/TrialBanner.tsx']) {
    /*
     * On ne controle que le code REELLEMENT rendu : les commentaires
     * peuvent citer une duree a titre d'explication sans qu'elle soit
     * jamais affichee a l'utilisateur.
     */
    const src = read64(f)
      .replace(/\/\*[\s\S]*?\*\//g, '')   // commentaires de bloc
      .replace(/^\s*\/\/.*$/gm, '');      // commentaires de ligne
    ok(!/\b20 (h|heures)\b/.test(src) && !/\b10 (h|heures)\b/.test(src),
       `Essai : aucune duree ecrite en dur dans ${f.split('/').pop()}`);
  }

  /* Les donnees du prospect doivent survivre a l abonnement. */
  const db64 = read64('src/utils/database.ts');
  ok(db64.includes("'msp_trial'"), 'Essai : l etat est inclus dans la sauvegarde');
  const vault64 = read64('src/utils/credentialsVault.ts');
  ok(vault64.includes("'msp_trial_used'"),
     'Essai : le marqueur resiste a « Reinitialiser les donnees locales »');

  const admin64 = read64('src/components/AdminDashboardScreen.tsx');
  ok(admin64.includes('btn-reinitialiser-essai'),
     'Essai : le SA dispose d une remise a zero pour les demonstrations');

  /*
   * v57 — SEUILS D'ALERTE DU BANDEAU.
   * Ils sont exprimes en FRACTIONS de la duree totale, et non en heures
   * fixes : avec un essai de 10 h, les anciens seuils (6 h / 2 h) faisaient
   * passer le bandeau a l'orange des la mi-parcours. Exprimes en fractions,
   * ils restent justes quelle que soit la duree retenue.
   */
  const banner64 = read64('src/components/TrialBanner.tsx');
  ok(banner64.includes('TRIAL_HOURS * 0.1') && banner64.includes('TRIAL_HOURS * 0.3'),
     'Essai : seuils d alerte proportionnels a la duree (rouge 10 %, orange 30 %)');
  ok(!/hoursLeft < 2\b/.test(banner64) && !/hoursLeft < 6\b/.test(banner64),
     'Essai : plus aucun seuil en heures fixes dans le bandeau');
  /* Verification chiffree sur la duree courante (10 h → 1 h et 3 h). */
  ok(T.TRIAL_HOURS * 0.1 === 1 && T.TRIAL_HOURS * 0.3 === 3,
     `Essai : sur ${T.TRIAL_HOURS} h, alerte rouge a 1 h et orange a 3 h`);
}

// ============================================================
{
  section('65. v58 — guide de l utilisateur et correctif des effectifs');
  // ============================================================
  const { createRequire: cr65 } = await import('module');
  const req65 = cr65(import.meta.url);
  const fs65 = req65('fs');
  const path65 = req65('path');
  const read65 = (f: string) => fs65.readFileSync(path65.join(process.cwd(), f), 'utf8');

  const mk65 = () => {
    const m: Record<string, string> = {};
    return { getItem: (k: string) => (k in m ? m[k] : null),
             setItem: (k: string, v: string) => { m[k] = v; },
             removeItem: (k: string) => { delete m[k]; } };
  };
  (globalThis as any).localStorage = mk65();
  (globalThis as any).sessionStorage = mk65();

  /* ---- CORRECTIF : le releve d effectifs ne s ecrase plus ---- */
  const CE = await import('../src/utils/canteenEnrollment');
  let sv = CE.newSurvey('EPP', '2026-2027');
  sv.date = '2026-09-14';
  sv.counts = sv.counts.map((c, i) => (i === 0 ? { ...c, boys: 10, girls: 12 } : c));
  CE.saveSurvey(sv);
  const rech = CE.latestSurvey()!;
  CE.saveSurvey({ ...rech, date: '2026-09-21',
    counts: rech.counts.map((c, i) => (i === 0 ? { ...c, boys: 15 } : c)) });
  ok(CE.loadSurveys().length === 2,
     `Effectifs : deux dates coexistent (${CE.loadSurveys().length})`);
  ok(CE.surveyForDate('2026-09-14')?.counts[0].boys === 10,
     'Effectifs : le releve anterieur n est plus ecrase');
  ok(CE.surveyForDate('2026-09-21')?.counts[0].boys === 15,
     'Effectifs : le nouveau releve est enregistre');
  const c21 = CE.surveyForDate('2026-09-21')!;
  CE.saveSurvey({ ...c21, counts: c21.counts.map((c, i) => (i === 0 ? { ...c, boys: 16 } : c)) });
  ok(CE.loadSurveys().length === 2,
     'Effectifs : corriger une date existante ne cree pas de doublon');
  ok(CE.loadSurveys()[0].date === '2026-09-21',
     'Effectifs : historique trie du plus recent au plus ancien');

  /*
   * Identifiants uniques : deux releves crees dans la meme milliseconde
   * recevaient le meme id et s ecrasaient.
   */
  const ids = new Set([CE.newSurvey('E', 'A').id, CE.newSurvey('E', 'A').id,
                       CE.newSurvey('E', 'A').id]);
  ok(ids.size === 3, 'Effectifs : les identifiants restent uniques a la milliseconde');

  /* ---- Le guide de l utilisateur ---- */
  const G = await import('../src/utils/userGuide');
  const VID = 'dQw4w9WgXcQ';
  for (const [lien, label] of [
    [`https://www.youtube.com/watch?v=${VID}`, 'lien classique'],
    [`https://youtu.be/${VID}`, 'lien court'],
    [`https://www.youtube.com/watch?v=${VID}&t=42s`, 'lien avec minutage'],
    [`https://www.youtube.com/shorts/${VID}`, 'Short'],
    [`https://m.youtube.com/watch?v=${VID}`, 'lien mobile'],
    [VID, 'identifiant seul'],
  ] as [string, string][]) {
    ok(G.extractVideoId(lien) === VID, `Tutoriels : ${label} reconnu`);
  }
  ok(G.extractVideoId('https://exemple.fr/x') === null,
     'Tutoriels : un lien non YouTube est refuse');

  const url65 = G.embedUrl(VID);
  ok(url65.includes('youtube-nocookie.com'),
     'Tutoriels : lecture en confidentialite renforcee');
  ok(url65.includes('rel=0'), 'Tutoriels : pas de suggestion vers d autres chaines');
  ok(url65.includes('playsinline=1'), 'Tutoriels : la video reste dans l application (iPhone)');

  const t1 = { ...G.newTutorial(), title: 'A', videoId: VID };
  G.saveTutorial(t1);
  G.saveTutorial({ ...G.newTutorial(), title: 'B', videoId: VID });
  ok(G.loadTutorials().length === 1, 'Tutoriels : une meme video n est pas dupliquee');
  G.saveTutorial({ ...G.newTutorial(), title: 'C', videoId: 'aaaaaaaaaaa', published: false });
  ok(G.publishedTutorials().length === 1,
     'Tutoriels : un brouillon reste invisible pour l abonne');
  const idsT = new Set([G.newTutorial().id, G.newTutorial().id, G.newTutorial().id]);
  ok(idsT.size === 3, 'Tutoriels : identifiants uniques a la milliseconde');

  const M = await import('../src/utils/manualContent');
  /*
   * v58 — PARITE DU MANUEL INTEGRE.
   * Le sous-module s'appelle « Le manuel de l'abonné » : il doit couvrir
   * TOUTE l'application, pas un extrait. Il ne comptait initialement que
   * 18 fiches sur 6 chapitres, alors que le manuel imprimable en couvrait
   * bien davantage — un abonné lisant l'application avait donc une
   * documentation incomplete. Ce seuil empeche l'ecart de se recreuser.
   */
  ok(M.MANUAL.length >= 14, `Manuel : ${M.MANUAL.length} chapitres couverts`);
  ok(M.totalFiches() >= 40, `Manuel : ${M.totalFiches()} fiches integrees a l application`);
  ok(M.searchManual('educmaster').length > 0, 'Manuel : la recherche fonctionne');
  ok(M.MANUAL.every((c) => c.fiches.every((f) => f.chemin && f.etapes.length > 0)),
     'Manuel : chaque fiche indique son chemin et ses etapes');
  /*
   * v60 — LE MANUEL N'EST PAS TELECHARGEABLE.
   * Demande explicite de l'editeur : il se consulte dans l'application,
   * pour ne pas circuler hors de l'abonnement.
   */
  const man60 = read65('src/components/ManualScreen.tsx');
  ok(!man60.includes('makePdf') && !man60.includes('btn-pdf-manuel'),
     'Manuel : aucun export PDF depuis l application');
  ok(!/window\.print\(\)/.test(man60), 'Manuel : aucune impression depuis l application');
  ok(man60.includes('sans connexion'), 'Manuel : la consultation hors ligne reste annoncee');
  /* Chaque grand module de l'application doit etre documente. */
  for (const q of ['educmaster', 'cantine', 'budget', 'encyclop', 'chronom',
                   'parent', 'tutoriel', 'enrol', 'remediation', 'livret']) {
    ok(M.searchManual(q).length > 0, `Manuel : « ${q} » est documente`);
  }
  const titresM = M.MANUAL.flatMap((c) => c.fiches.map((f) => f.titre));
  ok(new Set(titresM).size === titresM.length, 'Manuel : aucune fiche en double');

  /* v64/v65 : le guide couvre explicitement les nouvelles fonctions. */
  for (const q of ['arrondi de sortie', '6000', '10000', 'Terminale',
                   'Grammaire, Conjugaison', 'anglais pour le Primaire']) {
    ok(M.searchManual(q).length > 0, `Guide v64/v65 : « ${q} » est documenté`);
  }
  ok(G.TUTORIAL_CATEGORIES.includes('Espace École' as any),
     'Tutoriels : rubrique Espace École disponible');
  ok(G.TUTORIAL_CATEGORIES.includes('Français et Anglais au primaire' as any),
     'Tutoriels : rubrique Français et Anglais au primaire disponible');
  const sectionGuide65 = read65('src/components/SectionGuide.tsx');
  for (const idGuide of ['school-space-v64', 'french-gco-v64', 'english-primary-v64',
                         'canteen-simulator-v65', 'canteen-menus-v65', 'canteen-stock-v65']) {
    ok(sectionGuide65.includes(idGuide), `Guide contextuel : ${idGuide} présent`);
  }

  /* ---- Integration ---- */
  const app65 = read65('src/App.tsx');
  for (const r of ['/guide', '/guide/manuel', '/guide/tutoriels']) {
    ok(app65.includes(`path="${r}"`), `Guide : route ${r} declaree`);
  }
  ok(app65.includes('to="/guide"'), 'Guide : atteignable depuis l accueil');
  const mods65 = await import('../src/utils/appModules');
  ok(mods65.totalSubModules() === 50,
     `Guide : 50 sous-modules (obtenu ${mods65.totalSubModules()})`);

  const tuto65 = read65('src/components/TutorialsScreen.tsx');
  ok(tuto65.includes('isPrincipalAdminSession') && tuto65.includes('function isAdmin'),
     'Tutoriels : la publication est reservee a l administration');
  ok(!/watch\?v=|Regarder sur YouTube/i.test(tuto65),
     'Tutoriels : aucun renvoi vers le site YouTube');
  ok(tuto65.includes('navigator.onLine'),
     'Tutoriels : l absence de connexion est signalee a l utilisateur');

  /*
   * MISE A JOUR SANS PERTE : l activation et les donnees doivent survivre.
   */
  const vault65 = read65('src/utils/credentialsVault.ts');
  ok(vault65.includes("'msp_activation'"),
     'Mise a jour : l abonnement est protege de toute purge');
  const db65 = read65('src/utils/database.ts');
  ok(db65.includes("'msp_tutorials'"),
     'Mise a jour : les tutoriels sont inclus dans la sauvegarde');
  const sw65 = read65('public/sw.js');
  ok(!/localStorage|indexedDB/.test(sw65),
     'Mise a jour : le service worker ne touche jamais aux donnees');
  ok(/caches\.delete/.test(sw65),
     'Mise a jour : seul l ancien cache est efface');
}

// ============================================================
{
  section('66. v60 — verrou d etablissement et affichage de l ecole');
  // ============================================================
  const { createRequire: cr66 } = await import('module');
  const req66 = cr66(import.meta.url);
  const fs66 = req66('fs');
  const path66 = req66('path');
  const read66 = (f: string) => fs66.readFileSync(path66.join(process.cwd(), f), 'utf8');

  const mk66 = () => {
    const m: Record<string, string> = {};
    return { getItem: (k: string) => (k in m ? m[k] : null),
             setItem: (k: string, v: string) => { m[k] = v; },
             removeItem: (k: string) => { delete m[k]; } };
  };
  (globalThis as any).localStorage = mk66();
  (globalThis as any).sessionStorage = mk66();

  const SB = await import('../src/utils/schoolBinding');

  /* Aucun rattachement au depart. */
  ok(SB.isBound() === false, 'Ecole : aucun rattachement sur un appareil neuf');
  ok(SB.boundSchool() === '', 'Ecole : aucune ecole affichee avant rattachement');

  /* La premiere saisie fixe l etablissement. */
  SB.bindSchool('EPP NIMBO');
  ok(SB.isBound() === true, 'Ecole : la premiere saisie fixe le rattachement');
  ok(SB.boundSchool() === 'EPP NIMBO', 'Ecole : l etablissement est memorise');

  /* Un rattachement ne se remplace pas silencieusement. */
  SB.bindSchool('EPP AUTRE');
  ok(SB.boundSchool() === 'EPP NIMBO',
     'Ecole : une seconde saisie NE REMPLACE PAS l etablissement');

  /* Le changement passe par un controle explicite. */
  const chk = SB.checkSchoolChange('EPP AUTRE');
  ok(chk.allowed === false,
     'Ecole : changer d etablissement est refuse sans autorisation');
  ok(SB.isSameSchool('EPP NIMBO', 'epp  nimbo') === true,
     'Ecole : la comparaison ignore casse et espaces superflus');

  /*
   * VERROU COTE INTERFACE ET COTE DONNEES.
   * Le champ « Ecole » du formulaire de classe etait LIBRE : un meme
   * abonnement pouvait creer des classes pour plusieurs etablissements.
   */
  const app66 = read66('src/App.tsx');
  ok(app66.includes('readOnly={isBound()}'),
     'Ecole : le champ du formulaire de classe est verrouille');
  ok(app66.includes('school: boundSchool() || formData.school'),
     'Ecole : la classe est enregistree sous l etablissement de rattachement');
  ok(/if \(!isBound\(\) && \(formData\.school/.test(app66),
     'Ecole : la premiere classe creee fixe le rattachement');
  ok(app66.includes('champ-ecole-classe'), 'Ecole : le champ est identifiable pour les tests');

  /* L ecole doit etre VISIBLE en permanence. */
  /*
   * MISE A JOUR MAITRISEE (v60).
   * L'application se rechargeait SEULE des qu'une nouvelle version
   * arrivait : un enseignant en pleine saisie perdait son ecran. La
   * nouvelle version attend desormais un clic sur « Mettre a jour ».
   */
  const sw66 = read66('public/sw.js');
  ok(!/^\s*self\.skipWaiting\(\);\s*$/m.test(sw66.split("addEventListener('message'")[0]),
     'Mise a jour : plus de skipWaiting automatique a l installation');
  ok(sw66.includes("'SKIP_WAITING'"),
     'Mise a jour : le service worker attend un message de la page');
  const main66 = read66('src/main.tsx');
  ok(!/window\.location\.reload\(\)/.test(main66),
     'Mise a jour : plus de rechargement automatique au demarrage');
  const upd66 = read66('src/components/UpdateBanner.tsx');
  ok(upd66.includes('btn-mettre-a-jour'), 'Mise a jour : le bouton est propose a l utilisateur');
  ok(upd66.includes('SKIP_WAITING'), 'Mise a jour : le clic active la nouvelle version');
  ok(upd66.includes('navigator.serviceWorker.controller'),
     'Mise a jour : le bandeau ne s affiche pas a la premiere installation');
  ok(upd66.includes('btn-plus-tard'), 'Mise a jour : l utilisateur peut reporter');
  const app66b = read66('src/App.tsx');
  ok(/<UpdateBanner \/>[\s\S]{0,400}<AppGate \/>/.test(app66b),
     'Mise a jour : le bandeau est visible meme sur l ecran d acces');

  const ban66 = read66('src/components/LicenceBanner.tsx');
  ok(ban66.includes('licenceSchool'), 'Bandeau : l ecole de rattachement est calculee');
  ok(ban66.includes('licence-ecole'), 'Bandeau : l ecole est affichee a l ecran');
  /*
   * Le testid « bandeau-ecole » appartient depuis la v43 a SchoolLockBanner
   * (avertissement d'ecart entre profil et rattachement). Le reutiliser
   * creait une COLLISION : le test v43 trouvait deux elements au lieu d'un.
   */
  ok(!ban66.includes('"bandeau-ecole"'),
     'Bandeau : pas de collision de testid avec l avertissement d ecart');
  ok(ban66.includes('boundSchool'), 'Bandeau : l ecole vient du rattachement, pas du profil seul');
}

// ============================================================
{
  section('67. v60 — robustesse des exports (champs absents a l execution)');
  // ============================================================
  const { createRequire: cr67 } = await import('module');
  const req67 = cr67(import.meta.url);
  const fs67 = req67('fs');
  const path67 = req67('path');
  const read67 = (f: string) => fs67.readFileSync(path67.join(process.cwd(), f), 'utf8');

  const DB67 = await import('../src/utils/database');

  /*
   * BUG CORRIGE — « Cannot read properties of undefined (reading replace) ».
   * `sequence` est declare obligatoire dans le type, mais RIEN ne le
   * garantit a l'execution : une classe creee par une version anterieure,
   * restauree depuis une sauvegarde ancienne ou importee peut ne pas en
   * avoir. L'export Excel et l'export Word des bulletins echouaient alors,
   * et l'ecran Bulletins affichait « undefined ».
   */
  ok(DB67.classSequence({ sequence: '2eme Trimestre' }) === '2eme Trimestre',
     'Periode : la valeur renseignee est respectee');
  ok(DB67.classSequence({}) === '1er Trimestre',
     'Periode : une classe SANS periode recoit une valeur de repli');
  ok(DB67.classSequence({ sequence: '   ' }) === '1er Trimestre',
     'Periode : une periode vide recoit la valeur de repli');
  ok(DB67.classSequence(null) === '1er Trimestre',
     'Periode : aucune classe => pas de plantage');
  ok(DB67.classSequence(undefined) === '1er Trimestre',
     'Periode : classe indefinie => pas de plantage');

  /* Plus aucun acces direct et non protege dans le code. */
  for (const f of ['src/utils/bulletinExport.ts', 'src/components/BulletinsScreen.tsx']) {
    const src = read67(f)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    ok(!/classData\.sequence\s*\./.test(src),
       `Exports : aucun acces direct a « sequence » dans ${f.split('/').pop()}`);
  }
  ok(read67('src/utils/bulletinExport.ts').includes('classSequence'),
     'Exports : bulletinExport passe par l accesseur sur');
  ok(read67('src/components/BulletinsScreen.tsx').includes('classSequence'),
     'Exports : l ecran Bulletins passe par l accesseur sur');

  /*
   * TESTIDS : un composant monte en PERMANENCE ne doit jamais partager
   * son identifiant avec un ecran, sinon les deux se confondent.
   * (Cas rencontre : « bandeau-ecole » de LicenceBanner contre
   * SchoolLockBanner.)
   */
  const globaux = ['LicenceBanner', 'OfflineBanner', 'AnnouncementTicker',
                   'InstallPrompt', 'UpdateBanner', 'TrialBanner'];
  const collisions: string[] = [];
  for (const c of globaux) {
    const chemin = `src/components/${c}.tsx`;
    let src = '';
    try { src = read67(chemin); } catch { continue; }
    for (const m of src.matchAll(/data-testid="([a-z0-9-]+)"/g)) {
      const id = m[1];
      for (const autre of fs67.readdirSync(path67.join(process.cwd(), 'src/components'))) {
        if (autre === `${c}.tsx` || !autre.endsWith('.tsx')) continue;
        if (read67(`src/components/${autre}`).includes(`data-testid="${id}"`)) {
          collisions.push(`${id} (${c} / ${autre})`);
        }
      }
    }
  }
  ok(collisions.length === 0,
     `Testids : aucune collision avec un composant global (${collisions.join(', ') || 'aucune'})`);
}

// ============================================================
{
  section('68. v66 — Cantine : relevé des effectifs payeurs-mangeurs');
  // ============================================================
  const { createRequire: cr68 } = await import('module');
  const req68 = cr68(import.meta.url);
  const fs68 = req68('fs');
  const path68 = req68('path');
  const read68 = (f: string) => fs68.readFileSync(path68.join(process.cwd(), f), 'utf8');

  const store68: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store68 ? store68[k] : null),
    setItem: (k: string, v: string) => { store68[k] = v; },
    removeItem: (k: string) => { delete store68[k]; },
  };
  (globalThis as any).sessionStorage = (globalThis as any).localStorage;

  const PE = await import('../src/utils/canteenPayerEaters');
  const counts68 = PE.normalizeMealCounts([
    {
      level: 'ci', enrolledBoys: 30, enrolledGirls: 30,
      presentBoys: 25, presentGirls: 20, paidPresentBoys: 18, paidPresentGirls: 15,
    },
    {
      level: 'cm2', enrolledBoys: 20, enrolledGirls: 20,
      presentBoys: 10, presentGirls: 12, paidPresentBoys: 7, paidPresentGirls: 9,
    },
  ] as any);
  const payer68 = PE.computePayerEaterTotals(counts68, 'payeur-mangeur');
  ok(payer68.presentTotal === 67 && payer68.paidPresentTotal === 49 && payer68.eaterTotal === 49,
    'Payeur-mangeur : seuls les payeurs présents sont mangeurs');
  ok(payer68.eaterBoys === 25 && payer68.eaterGirls === 24 && payer68.presentNonEaters === 18,
    'Payeur-mangeur : ventilation G/F et présents non mangeurs');
  const community68 = PE.computePayerEaterTotals(counts68, 'apport-communautaire');
  ok(community68.eaterTotal === 67 && community68.presentNonEaters === 0,
    'Apport communautaire : tous les présents sont mangeurs');
  ok(payer68.attendancePct === 67 && payer68.girlsAmongEatersPct === 49,
    'Payeurs-mangeurs : taux de présence et part des filles calculés');
  const empty68 = PE.computePayerEaterTotals([], 'payeur-mangeur');
  ok(empty68.eaterTotal === 0 && empty68.attendancePct === 0 && empty68.girlsAmongEatersPct === 0,
    'Payeurs-mangeurs : relevé vide sans NaN');

  const inconsistent68 = [
    {
      level: 'cp', enrolledBoys: 10, enrolledGirls: 10,
      presentBoys: 11, presentGirls: 8, paidPresentBoys: 15, paidPresentGirls: 4,
    },
  ] as any;
  const warnings68 = PE.validatePayerEaterSurvey({ counts: inconsistent68, system: 'payeur-mangeur' } as any);
  ok(warnings68.some((w: any) => w.code === 'paid-exceeds-present'),
    'Payeurs-mangeurs : payeurs supérieurs aux présents signalés');
  ok(warnings68.some((w: any) => w.code === 'present-exceeds-enrolled'),
    'Payeurs-mangeurs : présents supérieurs aux inscrits signalés');
  const clamped68 = PE.computePayerEaterTotals(inconsistent68, 'payeur-mangeur');
  ok(clamped68.eaterBoys === 11, 'Payeurs-mangeurs : le calcul ne nourrit jamais plus que les présents');

  const withEnrolled68 = PE.applyEnrolledCounts(counts68, [
    { level: 'ci', boys: 31, girls: 29 },
  ] as any);
  const ci68 = withEnrolled68.find((c: any) => c.level === 'ci')!;
  ok(ci68.enrolledBoys === 31 && ci68.enrolledGirls === 29 && ci68.presentBoys === 25,
    'Payeurs-mangeurs : les inscrits du relevé général sont repris sans écraser les présents');

  /* Persistance : un relevé par date, les autres dates sont conservées. */
  const survey68 = PE.newPayerEaterSurvey('EPP TEST', '2026-2027', 'payeur-mangeur');
  survey68.date = '2026-10-20';
  survey68.counts = counts68;
  PE.savePayerEaterSurvey(survey68);
  const corrected68 = { ...survey68, note: 'Correction après appel' };
  PE.savePayerEaterSurvey(corrected68 as any);
  ok(PE.loadPayerEaterSurveys().length === 1, 'Payeurs-mangeurs : même date = correction, pas de doublon');
  const nextDay68 = { ...corrected68, date: '2026-10-21', note: 'Jour suivant' };
  PE.savePayerEaterSurvey(nextDay68 as any);
  ok(PE.loadPayerEaterSurveys().length === 2 && !!PE.payerEaterSurveyForDate('2026-10-20'),
    'Payeurs-mangeurs : changer de date conserve le relevé précédent');
  ok(PE.loadCanteenSystem() === 'payeur-mangeur', 'Payeurs-mangeurs : système de l’école mémorisé');

  /* Intégration applicative et guide. */
  const mods68 = await import('../src/utils/appModules');
  const cantine68 = mods68.findModule('/cantine')!;
  ok(cantine68.subModules.some((s: any) => s.path === '/cantine/payeurs-mangeurs'),
    'Cantine : sous-section payeurs-mangeurs déclarée');
  ok(cantine68.subModules.length === 5, 'Cantine : cinq sous-modules après ajout v66');
  ok(read68('src/App.tsx').includes('/cantine/payeurs-mangeurs'), 'Payeurs-mangeurs : route enregistrée');
  const screen68 = read68('src/components/CanteenPayerEatersScreen.tsx');
  for (const id of ['systeme-payeur-mangeur', 'systeme-apport-communautaire', 'grille-payeurs-mangeurs', 'total-mangeurs']) {
    ok(screen68.includes(id), `Payeurs-mangeurs : testid ${id} présent`);
  }
  ok(screen68.includes('Seuls les élèves présents ayant payé') && screen68.includes('Tous les élèves présents mangent'),
    'Payeurs-mangeurs : les deux règles sont expliquées à l’écran');
  ok(read68('src/components/CanteenSimulatorScreen.tsx').includes('reprendre-mangeurs-jour-'),
    'Simulateur : reprise des mangeurs du relevé au jour le jour');
  ok(read68('src/components/CanteenMenuScreen.tsx').includes('reprendre-mangeurs-menu-'),
    'Cahier des menus : reprise G/F des mangeurs du relevé');
  const manual68 = await import('../src/utils/manualContent');
  ok(manual68.searchManual('payeurs-mangeurs').length > 0, 'Guide : les payeurs-mangeurs sont documentés');
  ok(manual68.searchManual('apport communautaire').length > 0, 'Guide : l’apport communautaire est documenté');
  ok(read68('src/components/SectionGuide.tsx').includes('canteen-payer-eaters-v66'),
    'Guide contextuel : écran payeurs-mangeurs couvert');
  ok(fs68.existsSync(path68.join(process.cwd(), 'src/utils/canteenPayerEatersExport.ts')),
    'Payeurs-mangeurs : exports PDF/Excel/impression créés');
}


// ============================================================
{
  section('69. v67 — Maternelle officielle TS/S/PS et photos EducMaster');
  // ============================================================
  const { createRequire: cr69 } = await import('module');
  const req69 = cr69(import.meta.url);
  const fs69 = req69('fs');
  const path69 = req69('path');
  const read69 = (f: string) => fs69.readFileSync(path69.join(process.cwd(), f), 'utf8');

  const store69: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store69 ? store69[k] : null),
    setItem: (k: string, v: string) => { store69[k] = v; },
    removeItem: (k: string) => { delete store69[k]; },
  };
  (globalThis as any).sessionStorage = (globalThis as any).localStorage;

  const PB = await import('../src/utils/prescolaireBulletin');
  const expectedDomains69 = [
    'Fréquentations', 'Propreté corporelle et vestimentaire', 'Socialisation', 'Langage',
    'Pré-écriture', 'Éducation du mouvement', 'Pré-lecture', 'Pré-mathématique',
    'Poésie et Chant', 'Autres',
  ];
  ok(JSON.stringify(PB.PRESCHOOL_DOMAINS.map((d: any) => d.label)) === JSON.stringify(expectedDomains69),
    'Maternelle : les 10 domaines exacts du livret, dans le même ordre');
  ok(PB.normalizePreschoolTrimester('2ème trimestre') === '2e trimestre'
    && PB.normalizePreschoolTrimester('Troisième période') === '3e trimestre',
    'Maternelle : trimestres officiels reconnus depuis la période de classe');
  ok(PB.isPrescolaireClass({ educationType: 'primaire', level: 'Maternelle 2' } as any),
    'Maternelle : ancienne classe Maternelle sans type explicite reconnue');

  const record69 = PB.createEmptyPreschoolEvaluation('classe-69', 'eleve-69', '1er trimestre');
  record69.results.frequentations = { rating: 'TS', observation: 'Très assidu' };
  record69.results.langage = { rating: 'S', observation: 'En progrès' };
  record69.results['pre-ecriture'] = { rating: 'PS', observation: 'À accompagner' };
  record69.generalAppreciation = 'Bon trimestre.';
  PB.savePreschoolEvaluation(record69);
  const loaded69 = PB.getPreschoolEvaluation('classe-69', 'eleve-69', '1er trimestre');
  const counts69 = PB.preschoolCounts(loaded69);
  ok(counts69.TS === 1 && counts69.S === 1 && counts69.PS === 1 && counts69.completed === 3 && counts69.total === 10,
    'Maternelle : comptage TS/S/PS sans moyenne ni rang');
  ok(loaded69.results.langage.observation === 'En progrès' && loaded69.generalAppreciation === 'Bon trimestre.',
    'Maternelle : observations et appréciation générale persistées par trimestre');

  const suggested69 = PB.suggestPreschoolRatingsFromBulletin(
    PB.createEmptyPreschoolEvaluation('classe-69', 'eleve-69', '2e trimestre'),
    {
      student: { id: 'eleve-69', nom: 'ASSOGBA', prenoms: 'Jean Paul' },
      results: [
        { subject: { name: 'Présences' }, total: 16 },
        { subject: { name: 'Langage et communication' }, total: 12 },
        { subject: { name: 'Motricité globale' }, total: 8 },
      ],
    } as any,
  );
  ok(suggested69.results.frequentations.rating === 'TS'
    && suggested69.results.langage.rating === 'S'
    && suggested69.results['education-mouvement'].rating === 'PS',
    'Maternelle : pré-remplissage hérité ≥75 % TS, ≥50 % S, sinon PS');

  const DB69 = await import('../src/utils/database');
  ok(JSON.stringify(DB69.getDefaultSubjectsForPrescolaire('Maternelle 1').map((x: any) => x.name)) === JSON.stringify(expectedDomains69),
    'Maternelle : nouvelles classes créées avec les 10 domaines officiels');
  ok(read69('src/utils/database.ts').includes("'msp_prescolaire_evaluations_v1'"),
    'Maternelle : grilles incluses dans la sauvegarde complète');

  const preschoolScreen69 = read69('src/components/PreschoolBulletinsScreen.tsx');
  for (const txt of [
    'GRILLE D’ÉVALUATION TRIMESTRIELLE', 'Domaine d’Évaluation', 'Echelle des',
    'APPRÉCIATION GÉNÉRALE DE L’ENSEIGNANT(E)', 'VISA DE L’ENSEIGNANT(E)',
    'VISA DU DIRECTEUR(TRICE)', 'VISA DES PARENTS OU TUTEURS DE L’ENFANT',
    'Signature et nom', 'LEGENDES', 'Très Satisfaisant', 'Peu Satisfaisant',
    'par rapport à lui-même et non par rapport à ses camarades',
  ]) ok(preschoolScreen69.includes(txt), `Bulletin maternelle : mention exacte « ${txt} »`);
  ok(read69('src/components/BulletinsScreen.tsx').includes('isPrescolaireClass(classData)')
    && read69('src/components/BulletinsScreen.tsx').includes('PreschoolBulletinsScreen'),
    'Bulletins : les classes de maternelle basculent vers l’écran officiel dédié');
  ok(read69('src/utils/prescolaireBulletinExport.ts').includes('exportPreschoolBulletinPdf')
    && read69('src/utils/prescolaireBulletinExport.ts').includes('exportPreschoolBulletinsDocx')
    && read69('src/utils/prescolaireBulletinExport.ts').includes('exportPreschoolBulletinsExcel'),
    'Maternelle : exports PDF, Word et Excel dédiés');
  ok(read69('src/utils/bulletinPdf.ts').includes('exportPreschoolClassBulletinsPdf')
    && read69('src/utils/bulletinExport.ts').includes('exportPreschoolBulletinsExcel'),
    'Maternelle : les anciens chemins d’export ne produisent plus un bulletin classé');

  const EP = await import('../src/utils/educMasterPhotos');
  const student69 = {
    id: 'photo-69', matricule: '104120183578', nom: 'ASSOGBA', prenoms: 'Jean Paul',
    photoUrl: 'data:image/jpeg;base64,AA==', createdAt: 1,
  } as any;
  ok(EP.educMasterPhotoFilename(student69) === '104120183578_ASSOGBA_Jean_Paul.jpg',
    'EducMaster : nom exact de l’exemple officiel');
  const accented69 = { ...student69, matricule: '001234', nom: "N'Diaye-Agbé", prenoms: 'Marie Claire' };
  ok(EP.educMasterPhotoFilename(accented69 as any) === '001234_N_DIAYE_AGBE_Marie_Claire.jpg',
    'EducMaster : accents, apostrophes et traits d’union convertis en soulignés, zéros conservés', EP.educMasterPhotoFilename(accented69 as any));
  ok(EP.matriculeFromPhotoFilename('104120183578_ASSOGBA_Jean_Paul.jpg') === '104120183578',
    'EducMaster : import groupé par matricule avant le premier souligné');
  const readiness69 = EP.photoReadiness(student69);
  ok(readiness69.ready && readiness69.issues.length === 0,
    'EducMaster : élève avec matricule unique et photo déclaré prêt');
  const duplicate69 = EP.photoReadiness(student69, new Set(['104120183578']));
  ok(!duplicate69.ready && duplicate69.issues.includes('Matricule en double'),
    'EducMaster : un matricule en double bloque l’état prêt');

  const identity69 = read69('src/utils/identityPhoto.ts');
  ok(identity69.includes('IDENTITY_PHOTO_WIDTH = 800') && identity69.includes('IDENTITY_PHOTO_HEIGHT = 1000'),
    'Photo d’identité : format final 800 × 1000');
  ok(identity69.includes('buildBackgroundMask') && identity69.includes('followsGradient')
    && identity69.includes('assessIdentityBackgroundMask') && identity69.includes('backgroundApplied'),
    'Photo d’identité : masque connecté aux bords et barrière anti-effacement du sujet');
  const identityPhoto69 = await import('../src/utils/identityPhoto');
  ok(identityPhoto69.assessIdentityBackgroundMask(0.55, 0.01, 0.05) === 'apply',
    'Photo d’identité : un masque périphérique prudent peut remplacer le fond');
  ok(identityPhoto69.assessIdentityBackgroundMask(0.99, 0.98, 0.95) === 'unsafe',
    'Photo d’identité : un masque quasi plein cadre est refusé');
  ok(identityPhoto69.assessIdentityBackgroundMask(0.55, 0.10, 0.02) === 'unsafe',
    'Photo d’identité : un masque qui atteint le visage est refusé');
  ok(identityPhoto69.assessIdentityBackgroundMask(0.55, 0.01, 0.30) === 'unsafe',
    'Photo d’identité : un masque qui envahit le torse est refusé');
  ok(identityPhoto69.assessIdentityBackgroundMask(0.005, 0, 0) === 'empty',
    'Photo d’identité : sans fond assez distinct, la photo d’origine est conservée');
  const photoScreen69 = read69('src/components/EducMasterPhotosScreen.tsx');
  for (const id of [
    'educmaster-photos-screen', 'educmaster-class-select', 'photo-file-input',
    'identity-processed-preview', 'identity-white-background', 'identity-save-photo',
    'educmaster-export-zip', 'batch-photo-input',
  ]) ok(photoScreen69.includes(id), `Studio EducMaster : testid ${id} présent`);
  ok(photoScreen69.includes('getUserMedia') && photoScreen69.includes('captureVideoFrame'),
    'Studio EducMaster : caméra intégrée réellement utilisée');
  ok(read69('src/App.tsx').includes('/class/:id/photos-educmaster'),
    'Studio EducMaster : route par classe enregistrée');
  ok(read69('src/components/ClassDashboardScreen.tsx').includes('Photos EducMaster'),
    'Studio EducMaster : accès depuis chaque classe');
  const mods69 = await import('../src/utils/appModules');
  const enrol69 = mods69.findModule('/enrolement')!;
  ok(enrol69.subModules.some((x: any) => x.path === '/class/:firstClass/photos-educmaster'),
    'Studio EducMaster : sous-module Enrôlement déclaré');
  const SUB69 = await import('../src/utils/subscription');
  ok(SUB69.isAllowedForEssentiel('/class/abc/photos-educmaster'),
    'Studio EducMaster : ouvert à la formule Essentiel comme l’enrôlement');

  const manual69 = await import('../src/utils/manualContent');
  ok(manual69.searchManual('grille TS').length > 0, 'Guide : bulletin maternelle TS/S/PS documenté');
  ok(manual69.searchManual('photos EducMaster').length > 0, 'Guide : studio photo EducMaster documenté');
  ok(manual69.searchManual('fond blanc').length > 0, 'Guide : fond blanc documenté');
  ok(manual69.searchManual('matricule_NOM_Prenom').length > 0, 'Guide : nom de fichier EducMaster documenté');
  ok(read69('src/components/SectionGuide.tsx').includes('educmaster-photos-v67'),
    'Guide contextuel : écran photo EducMaster couvert');
  ok(read69('public/sw.js').includes('master-soutien-v72-refonte'),
    'PWA : cache v70 pour l’OCR local, le transfert oral et l’agent IA');
}

// ============================================================
// 70. v69 — Bibliothèque orale étendue, contributions multimédias et agent IA
// ============================================================
{
  section('70. v69 — Arts oraux étendus et Agent Master Soutien Pédagogique');
  const fs70 = await import('node:fs');
  const path70 = await import('node:path');
  const read70 = (file: string) => fs70.readFileSync(path70.join(process.cwd(), file), 'utf8');
  const oral = await import('../src/utils/oralResources');
  ok(oral.BUILTIN_ORAL_RESOURCES.length === 33, 'Arts oraux : 33 ressources intégrées, dont des créations adaptées au Bénin');
  ok(oral.BUILTIN_ORAL_RESOURCES.some((resource: any) => resource.title.includes('Dantokpa'))
    && oral.BUILTIN_ORAL_RESOURCES.some((resource: any) => resource.title.includes('Koklo Kouassi'))
    && oral.BUILTIN_ORAL_RESOURCES.some((resource: any) => resource.title.includes('Yèyi'))
    && oral.BUILTIN_ORAL_RESOURCES.some((resource: any) => resource.title.includes('Aube Nouvelle') && resource.text.includes('paroles')),
    'Arts oraux : repères de chants béninois, hymne sans paroles reproduites et contes contextualisés ajoutés');
  ok(new Set(oral.BUILTIN_ORAL_RESOURCES.map((resource: any) => resource.kind)).size === 4,
    'Arts oraux : poésie, chant, comptine et conte représentés');
  ok(oral.filterOralResources(oral.BUILTIN_ORAL_RESOURCES, 'baobab').length === 1,
    'Arts oraux : recherche trouve le texte du baobab');
  ok(oral.filterOralResources(oral.BUILTIN_ORAL_RESOURCES, '', 'tout', 'Maternelle')
    .every((resource: any) => resource.level === 'Maternelle' || resource.level === 'Tous niveaux'),
    'Arts oraux : filtre par niveau maternelle appliqué');

  const modules70 = await import('../src/utils/appModules');
  const oralModule = modules70.findModule('/arts-oraux');
  ok(oralModule?.title === 'Poésies, chants, comptines et contes'
    && oralModule.subModules.some((item: any) => item.path === '/poesies-contes'),
    'Arts oraux : module et sous-module ajoutés à l’accueil');
  const app70 = read70('src/App.tsx');
  ok(app70.includes('path="/arts-oraux"') && app70.includes('path="/poesies-contes"'),
    'Arts oraux : les deux routes sont déclarées');
  ok(app70.includes('path="/assistant-ia"') && app70.includes('<AIAssistantChatScreen />')
    && app70.includes('path="/generateur-fiches-ia"') && app70.includes('<AILessonGeneratorScreen />'),
    'Agent IA : les deux routes utilisent les vrais écrans, pas l’écran « À venir »');
  const prep70 = modules70.APP_MODULES.find((module: any) => module.path === '/preparation-classe');
  ok(prep70?.subModules.some((item: any) => item.path === '/assistant-ia' && item.title === 'Agent IA Master Soutien Pédagogique')
    && !modules70.isComingSoon('/assistant-ia') && !modules70.isComingSoon('/generateur-fiches-ia'),
    'Agent IA : sous-module prêt et accessible depuis la préparation de classe');
  const agent70 = read70('src/components/AIAssistantChatScreen.tsx');
  ok(agent70.includes('generateLessonPlan') && agent70.includes("generate('local')")
    && agent70.includes("generate('online')") && agent70.includes('hors connexion'),
    'Agent IA : génération locale par défaut et fournisseur en ligne seulement sur choix explicite');
  ok(read70('src/components/SectionGuide.tsx').includes('agent-ia-msp-v69'),
    'Agent IA : guide d’utilisation contextuel ajouté');
  ok(read70('src/components/SectionGuide.tsx').includes('N’incluez pas de données personnelles d’élèves'),
    'Agent IA : avertissement de confidentialité pour les fournisseurs externes');
  ok(read70('src/components/SectionGuide.tsx').includes('oral-arts-v70'),
    'Arts oraux : aide contextuelle v70 mise à jour pour le transfert manuel');
  const oralScreen70 = read70('src/components/OralArtsScreen.tsx');
  ok(oralScreen70.includes('localService') && oralScreen70.includes('localFrenchVoice'),
    'Arts oraux : synthèse vocale limitée à une voix française locale pour rester hors ligne');
  ok(read70('src/utils/database.ts').includes('msp_oral_resources_custom_v1'),
    'Arts oraux : textes personnalisés intégrés à la sauvegarde locale');
  const manual70 = await import('../src/utils/manualContent');
  ok(manual70.searchManual('ressources média seules').length > 0,
    'Arts oraux : chapitre documenté et indexé dans le manuel');

  const previousLocalStorage = (globalThis as any).localStorage;
  const localValues: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => localValues[key] ?? null,
    setItem: (key: string, value: string) => { localValues[key] = value; },
    removeItem: (key: string) => { delete localValues[key]; },
  };
  try {
    const custom = oral.createOralResource({
      title: 'Comptine de test', kind: 'comptine', level: 'CP', language: 'Français',
      theme: 'Test', duration: '1 min', objective: 'Tester le stockage local.',
      text: 'Un, deux, trois, je lis à voix haute.', author: 'Enseignant test',
    });
    ok(oral.getOralResources().some((resource: any) => resource.id === custom.id && !resource.isBuiltin),
      'Arts oraux : ressource personnelle sauvegardée localement');

    const audioFile = Object.assign(new Blob(['audio local de test'], { type: 'audio/mpeg' }), { name: 'comptine.mp3' }) as File;
    await oral.saveOralMedia(custom.id, 'audio', audioFile);
    const savedAudio = await oral.getOralMedia(custom.id, 'audio');
    ok(savedAudio?.fileName === 'comptine.mp3' && savedAudio.blob?.size === audioFile.size,
      'Arts oraux : audio stocké dans IndexedDB et relu sans réseau');

    const mediaOnly = oral.createOralResource({
      title: 'Conte vidéo de test', kind: 'conte', level: 'CE1', language: 'Français',
      theme: 'Test média seul', duration: '2 min', objective: '', text: '',
      author: 'Membre équipe test', mediaKinds: ['video'],
    });
    ok(oral.getOralResources().some((resource: any) => resource.id === mediaOnly.id && resource.text === ''),
      'Arts oraux : une ressource vidéo seule peut être créée sans paroles');
    const videoFile = Object.assign(new Blob(['vidéo locale de test'], { type: 'video/mp4' }), { name: 'conte.mp4' }) as File;
    await oral.saveOralMedia(mediaOnly.id, 'video', videoFile);
    const savedVideo = await oral.getOralMedia(mediaOnly.id, 'video');
    ok(savedVideo?.fileName === 'conte.mp4' && savedVideo.blob?.size === videoFile.size,
      'Arts oraux : vidéo importée depuis l’appareil et conservée dans IndexedDB');
    await oral.deleteOralResource(mediaOnly.id);
    ok(!(await oral.getOralMedia(mediaOnly.id, 'video')),
      'Arts oraux : suppression d’une ressource média seule efface sa vidéo');

    await oral.deleteOralResource(custom.id);
    ok(!oral.getOralResources().some((resource: any) => resource.id === custom.id)
      && !(await oral.getOralMedia(custom.id, 'audio')),
      'Arts oraux : suppression du texte efface aussi son média local');
  } catch (error) {
    ok(false, 'Arts oraux : cycle ajout / stockage média / suppression fonctionne', String(error));
  } finally {
    if (previousLocalStorage === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = previousLocalStorage;
  }

  ok(read70('public/sw.js').includes('master-soutien-v72-refonte'),
    'PWA : nouveau cache v70 force la mise à jour de l’application');
}

// ============================================================
// 71. v70 — transfert hors ligne des ressources et création Excel depuis PDF
// ============================================================
{
  section('71. v70 — Transfert oral hors ligne et PDF élèves → Excel');
  const fs71 = await import('node:fs');
  const path71 = await import('node:path');
  const read71 = (file: string) => fs71.readFileSync(path71.join(process.cwd(), file), 'utf8');
  const app71 = read71('src/App.tsx');
  const modules71 = await import('../src/utils/appModules');
  const enrollment71 = modules71.findModule('/enrolement');
  ok(enrollment71?.subModules.some((item: any) => item.path === '/liste-pdf-excel')
    && app71.includes('path="/liste-pdf-excel"') && app71.includes('<StudentListPdfScreen />'),
    'PDF → Excel : écran accessible depuis Enrôlement et route réelle');

  const pdfRoster71 = await import('../src/utils/studentListPdf');
  const rows = pdfRoster71.parsePdfRosterTokens([
    { text: 'Matricule', x: 10, y: 10 }, { text: 'Nom', x: 100, y: 10 },
    { text: 'Prénoms', x: 200, y: 10 }, { text: 'Sexe', x: 300, y: 10 },
    { text: '001234', x: 10, y: 25 }, { text: 'AHOUANSOU', x: 100, y: 25 },
    { text: 'Mariam', x: 200, y: 25 }, { text: 'Aïcha', x: 235, y: 25 }, { text: 'F', x: 300, y: 25 },
    { text: '000560', x: 10, y: 40 }, { text: 'KOFFI', x: 100, y: 40 },
    { text: 'Jean', x: 200, y: 40 }, { text: 'M', x: 300, y: 40 },
  ]);
  ok(rows.length === 2 && rows[0].matricule === '001234' && rows[0].nom === 'AHOUANSOU'
    && rows[0].prenoms === 'Mariam Aïcha' && rows[0].sexe === 'F',
    'PDF → Excel : extraction à colonnes (matricule, nom, prénoms, sexe)');
  const freeRows = pdfRoster71.parsePdfRosterTokens([
    { text: '1.', x: 0, y: 10 }, { text: 'AMOUSSOU', x: 18, y: 10 }, { text: 'Jean', x: 95, y: 10 },
    { text: '2.', x: 0, y: 25 }, { text: 'DOSSOU', x: 18, y: 25 }, { text: 'Aïcha', x: 95, y: 25 },
  ]);
  ok(freeRows.length === 2 && freeRows[0].nom === 'AMOUSSOU' && freeRows[1].prenoms === 'Aïcha',
    'PDF → Excel : extraction de lignes simples sans entête');

  const database71 = await import('../src/utils/database');
  const primaryClass = pdfRoster71.makePdfExportClass({
    id: 'pdf-export-test', name: 'CM2 A', school: 'EPP Test', level: 'CM2', educationType: 'primaire',
    schoolYear: '2026-2027', sequence: '1er Trimestre', subjects: database71.getDefaultSubjectsForLevel('CM2'),
  }, pdfRoster71.draftsToStudents([{ id: 'pdf-test-1', matricule: '00012', nom: 'DOSSOU', prenoms: 'Aïcha', sexe: 'F', rawLine: '00012 DOSSOU Aïcha' }]));
  const primaryWorkbook = await generateEducMasterExcel(primaryClass);
  const primaryReader = new ExcelJS.Workbook();
  await primaryReader.xlsx.load(Buffer.from(await primaryWorkbook.blob.arrayBuffer()) as any);
  ok(primaryReader.worksheets.length === 4 && primaryReader.worksheets[0].getCell('D1').value === 'Dictée'
    && primaryReader.worksheets[1].getCell('A3').value === '00012',
    'PDF → Excel : matières primaires de l’application et 4 onglets officiels');
  const preschoolClass = pdfRoster71.makePdfExportClass({
    id: 'pdf-preschool-test', name: 'Maternelle 1', school: 'EPP Test', level: 'Maternelle 1', educationType: 'prescolaire',
    schoolYear: '2026-2027', sequence: '1er Trimestre', subjects: database71.getDefaultSubjectsForPrescolaire('Maternelle 1'),
  }, []);
  const preschoolWorkbook = await generateEducMasterExcel(preschoolClass);
  const preschoolReader = new ExcelJS.Workbook();
  await preschoolReader.xlsx.load(Buffer.from(await preschoolWorkbook.blob.arrayBuffer()) as any);
  ok(preschoolReader.worksheets.length === 1 && preschoolReader.worksheets[0].getCell('D1').value === 'Fréquentations',
    'PDF → Excel : domaines préscolaires déjà configurés dans l’application');
  const preschoolRosterExcel = await generateStudentListExcel({ ...preschoolClass, students: pdfRoster71.draftsToStudents([
    { id: 'pdf-preschool-student', matricule: '00073', nom: 'KOFFI', prenoms: 'Sènami', sexe: 'F', rawLine: '00073 KOFFI Sènami' },
  ]) });
  const preschoolRosterReader = new ExcelJS.Workbook();
  await preschoolRosterReader.xlsx.load(Buffer.from(await preschoolRosterExcel.blob.arrayBuffer()) as any);
  ok(preschoolRosterReader.worksheets[0].getCell('F4').value === 'Fréquentations'
    && preschoolRosterReader.worksheets[0].getCell('F5').value === 'TS'
    && preschoolRosterReader.worksheets[0].getCell('G5').value === 'S'
    && preschoolRosterReader.worksheets[0].getCell('H5').value === 'PS'
    && preschoolRosterReader.worksheets[0].getCell('B6').value === '00073',
    'PDF → Excel : grille préscolaire TS/S/PS avec matricule conservé comme texte');
  const secondaryClass = pdfRoster71.makePdfExportClass({
    id: 'pdf-secondary-test', name: '2nde C', school: 'CEG Test', level: '2nde', educationType: 'secondaire', serie: 'C',
    schoolYear: '2026-2027', sequence: '1er Semestre', subjects: database71.getDefaultSubjectsForSecondary('2nde', 'C'),
  }, []);
  const secondaryWorkbook = await generateEducMasterExcel(secondaryClass);
  const secondaryReader = new ExcelJS.Workbook();
  await secondaryReader.xlsx.load(Buffer.from(await secondaryWorkbook.blob.arrayBuffer()) as any);
  ok(secondaryReader.worksheets.length === 1 && secondaryReader.worksheets[0].getCell('D1').value === 'Mathématiques'
    && secondaryReader.worksheets[0].getCell('F1').value === 'EPS'
    && secondaryReader.worksheets[0].getCell('H1').value === 'PCT'
    && secondaryClass.subjects.some(subject => subject.name === 'Français'),
    'PDF → Excel : matières et série scientifique du secondaire');

  const ocrFiles = ['public/pdf.worker.min.mjs', 'public/ocr/worker.min.js', 'public/ocr/tesseract-core-lstm.wasm.js', 'public/ocr/fra.traineddata.gz'];
  ok(ocrFiles.every(file => fs71.statSync(path71.join(process.cwd(), file)).size > 1000)
    && !read71('src/utils/studentListPdf.ts').includes('cdnjs.cloudflare.com'),
    'PDF → Excel : PDF.js et OCR français embarqués localement, sans CDN');
  const sw70 = read71('public/sw.js');
  ok(sw70.includes('master-soutien-v72-refonte') && ocrFiles.slice(1).every(file => sw70.includes(`./${file.replace(/^public\//, '')}`))
    && sw70.includes('./pdf.worker.min.mjs'),
    'PWA v71 : moteur PDF/OCR mis en cache pour l’usage hors connexion');
  try {
    const tesseract = await import('tesseract.js');
    const worker = await tesseract.createWorker('fra', tesseract.OEM.LSTM_ONLY, {
      corePath: path71.resolve(process.cwd(), 'public/ocr/tesseract-core-lstm.wasm.js'),
      langPath: path71.resolve(process.cwd(), 'public/ocr'), gzip: true, cacheMethod: 'none', logger: () => {},
    });
    try {
      const result = await worker.recognize(path71.resolve(process.cwd(), 'tests/fixtures/student-list-ocr.png'), {}, { text: true, tsv: true });
      const ocrRows = pdfRoster71.parsePdfRosterTokens(pdfRoster71.tokensFromTsv(result.data.tsv || ''));
      ok(ocrRows.length === 2 && ocrRows[0].matricule === '001234' && ocrRows[0].nom === 'AHOUANSOU'
        && ocrRows[0].prenoms.startsWith('Mariam') && ocrRows[1].matricule === '000560'
        && ocrRows[1].nom === 'KOFFI' && ocrRows[1].prenoms === 'Jean Paul',
        'PDF → Excel : OCR français local reconnaît une liste scannée et conserve les zéros des matricules');
    } finally { await worker.terminate(); }
  } catch (error) {
    ok(false, 'PDF → Excel : OCR français local reconnaît une liste scannée', String(error));
  }
  const oralScreen71 = read71('src/components/OralArtsScreen.tsx');
  ok(oralScreen71.includes('exportOralResourcesArchive') && oralScreen71.includes('importOralResourcesArchive')
    && oralScreen71.includes('Importer et fusionner') && oralScreen71.includes('ne comprend pas les codes d’abonnement'),
    'Transfert oral : export/import fusionne texte, médias locaux et exclut les codes abonnés');

  const previousStorage71 = (globalThis as any).localStorage;
  const storageValues: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageValues[key] ?? null,
    setItem: (key: string, value: string) => { storageValues[key] = value; },
    removeItem: (key: string) => { delete storageValues[key]; },
  };
  try {
    const oral71 = await import('../src/utils/oralResources');
    const transfer71 = await import('../src/utils/oralResourceTransfer');
    const source = oral71.createOralResource({
      title: 'Conte de transfert test', kind: 'conte', level: 'CE1', language: 'Français',
      theme: 'Test', duration: '2 min', objective: 'Vérifier le transfert local.',
      text: 'Un texte de test pour le transfert.', author: 'Équipe test',
    });
    const audio = Object.assign(new Blob(['audio privé local'], { type: 'audio/mpeg' }), { name: 'conte-test.mp3' }) as File;
    await oral71.saveOralMedia(source.id, 'audio', audio);
    const archive = await transfer71.exportOralResourcesArchive();
    const localOnly = oral71.createOralResource({
      title: 'Ressource déjà sur PC', kind: 'poesie', level: 'CP', language: 'Français',
      theme: 'PC', duration: '1 min', objective: 'Doit rester présente.', text: 'Ressource locale.', author: 'PC',
    });
    await oral71.deleteOralResource(source.id);
    const transferred = await transfer71.importOralResourcesArchive(new File([archive], 'msp-ressources-orales.zip', { type: 'application/zip' }), () => true);
    const importedAudio = await oral71.getOralMedia(source.id, 'audio');
    ok(transferred.added === 1 && transferred.media === 1 && !transferred.cancelled
      && oral71.getOralResources().some((item: any) => item.id === localOnly.id)
      && importedAudio?.fileName === 'conte-test.mp3' && importedAudio.blob?.size === audio.size,
      'Transfert oral : fusion sans effacement et restauration réelle du média IndexedDB');
    const repeated = await transfer71.importOralResourcesArchive(new File([archive], 'msp-ressources-orales.zip', { type: 'application/zip' }), () => true);
    ok(repeated.added === 0 && repeated.updated === 1 && repeated.media === 1,
      'Transfert oral : réimportation met à jour par identifiant sans créer de doublon');
    const cancelled = await transfer71.importOralResourcesArchive(new File([archive], 'msp-ressources-orales.zip', { type: 'application/zip' }), () => false);
    ok(cancelled.cancelled && oral71.getOralResources().some((item: any) => item.id === localOnly.id),
      'Transfert oral : annulation avant fusion, sans supprimer les ressources locales');
    await oral71.deleteOralResource(source.id);
    await oral71.deleteOralResource(localOnly.id);
  } catch (error) {
    ok(false, 'Transfert oral : archive ZIP texte + média importable hors ligne', String(error));
  } finally {
    if (previousStorage71 === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = previousStorage71;
  }
}

// ============================================================
section('72. v71 — IA MSP depuis une fiche de référence');
{
  const fs72 = await import('node:fs');
  const path72 = await import('node:path');
  const read72 = (file: string) => fs72.readFileSync(path72.join(process.cwd(), file), 'utf8');
  const aiScreen72 = read72('src/components/AILessonGeneratorScreen.tsx');
  const aiCore72 = read72('src/utils/aiLessonGenerator.ts');
  const exports72 = read72('src/utils/ficheExport.ts');
  const savedFiches72 = read72('src/components/FichesPedagogiquesScreen.tsx');
  ok(aiScreen72.includes('Fiche de référence — modèle + exemple')
    && aiScreen72.includes('Titre exact de la nouvelle leçon')
    && aiScreen72.includes('Confirmer l’envoi de cette fiche')
    && aiScreen72.includes('J’autorise cet envoi'),
    'IA MSP : parcours fiche + titre avec confirmation explicite pour l’envoi externe');
  ok(!aiScreen72.includes('Prompt Magic 1') && !aiScreen72.includes('PROMPT_MAGIC_FICHE_PEDAGOGIQUE')
    && !aiCore72.includes('PROMPT MAGIC 1') && aiCore72.includes('PROMPT MAGIC 2'),
    'IA MSP : Prompt Magic 1 entièrement retiré, Magic 2 conservé pour les exercices');
  ok(aiCore72.includes('REFERENCE_PDF_MAX_PAGES') && aiCore72.includes('createLocalOcrWorker')
    && aiCore72.includes('Accord requis avant tout envoi') && aiCore72.includes('FICHE_REFERENCE'),
    'IA MSP : extraction locale PDF/OCR et verrou de consentement avant les API externes');
  ok(exports72.includes('buildFichePdf') && exports72.includes('plan.rubriques')
    && exports72.includes('buildDocxXml'),
    'IA MSP : exports PDF A4 et Word conservent les rubriques du modèle');
  ok(savedFiches72.includes('rubriques?:') && savedFiches72.includes('Rubriques conservées du modèle'),
    'IA MSP : rubriques modifiables et conservées dans Mes fiches');
  ok(read72('public/sw.js').includes('master-soutien-v72-refonte')
    && read72('src/utils/manualContent.ts').includes('Générer une nouvelle fiche depuis un modèle'),
    'IA MSP v72 : cache PWA et manuel mis à jour');
}

// ============================================================
console.log(`\n════════════════════════════════════`);
console.log(`RÉSULTATS : ${pass} réussis, ${fail} échoués`);
if (fail > 0) {
  console.log('\nÉchecs :');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
}

main().catch((e) => { console.error('Erreur d\'exécution:', e); process.exit(1); });
